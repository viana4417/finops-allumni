const { execFile, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

const ROOT_DIR = path.resolve(__dirname, '..');
const EXPORTS_DIR = path.join(ROOT_DIR, 'exports');
const ALLUMNI_PORT = Number(process.env.ALLUMNI_STRESS_PORT || 3100);
const FINOPS_PORT = Number(process.env.FINOPS_STRESS_PORT || 3101);
const ALLUMNI_BASE_URL = `http://localhost:${ALLUMNI_PORT}`;
const FINOPS_BASE_URL = `http://localhost:${FINOPS_PORT}`;

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function execFileAsync(command, args) {
    return new Promise((resolve, reject) => {
        execFile(command, args, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(stderr || stdout || error.message));
                return;
            }

            resolve(stdout);
        });
    });
}

function startServer({ name, cwd, port }) {
    const child = spawn('node', ['server.js'], {
        cwd,
        env: {
            ...process.env,
            PORT: String(port)
        },
        stdio: ['ignore', 'pipe', 'pipe']
    });

    child.stdout.on('data', () => {});
    child.stderr.on('data', () => {});

    child.on('exit', (code) => {
        if (code !== 0 && code !== null) {
            console.error(`${name} finalizou com codigo ${code}`);
        }
    });

    return child;
}

async function waitForServer(url, timeoutMs = 15000) {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
        try {
            const response = await fetch(url);
            if (response.status < 500) {
                return;
            }
        } catch (_error) {
            // Try again until timeout.
        }

        await sleep(250);
    }

    throw new Error(`Servidor nao respondeu em ${url}`);
}

function startProcessMonitor(pid) {
    const samples = [];

    async function sample() {
        try {
            const output = await execFileAsync('ps', ['-p', String(pid), '-o', '%cpu=,rss=']);
            const [cpuRaw, rssRaw] = output.trim().split(/\s+/);

            if (cpuRaw && rssRaw) {
                samples.push({
                    cpuPercent: Number(cpuRaw),
                    rssMb: Number(rssRaw) / 1024
                });
            }
        } catch (_error) {
            // Process may have exited.
        }
    }

    const interval = setInterval(sample, 250);
    interval.unref();
    sample();

    return {
        async stop() {
            clearInterval(interval);
            await sample();

            if (!samples.length) {
                return {
                    sampleCount: 0,
                    avgCpuPercent: 0,
                    maxCpuPercent: 0,
                    avgRssMb: 0,
                    maxRssMb: 0
                };
            }

            const sumCpu = samples.reduce((sum, item) => sum + item.cpuPercent, 0);
            const sumRss = samples.reduce((sum, item) => sum + item.rssMb, 0);

            return {
                sampleCount: samples.length,
                avgCpuPercent: Number((sumCpu / samples.length).toFixed(2)),
                maxCpuPercent: Number(Math.max(...samples.map((item) => item.cpuPercent)).toFixed(2)),
                avgRssMb: Number((sumRss / samples.length).toFixed(2)),
                maxRssMb: Number(Math.max(...samples.map((item) => item.rssMb)).toFixed(2))
            };
        }
    };
}

function percentile(values, percentileValue) {
    if (!values.length) {
        return 0;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentileValue / 100) * sorted.length) - 1;

    return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

function summarizeLatencies(latencies) {
    if (!latencies.length) {
        return {
            minMs: 0,
            avgMs: 0,
            p50Ms: 0,
            p95Ms: 0,
            p99Ms: 0,
            maxMs: 0
        };
    }

    const sum = latencies.reduce((total, value) => total + value, 0);

    return {
        minMs: Number(Math.min(...latencies).toFixed(2)),
        avgMs: Number((sum / latencies.length).toFixed(2)),
        p50Ms: Number(percentile(latencies, 50).toFixed(2)),
        p95Ms: Number(percentile(latencies, 95).toFixed(2)),
        p99Ms: Number(percentile(latencies, 99).toFixed(2)),
        maxMs: Number(Math.max(...latencies).toFixed(2))
    };
}

async function runScenario({ name, totalRequests, concurrency, target, requestFactory, monitorPid }) {
    const latencies = [];
    const statusCodes = {};
    const errors = [];
    const monitor = startProcessMonitor(monitorPid);
    let nextRequest = 0;
    const startedAt = performance.now();

    async function worker() {
        while (nextRequest < totalRequests) {
            const requestIndex = nextRequest;
            nextRequest += 1;
            const request = requestFactory(requestIndex);
            const requestStartedAt = performance.now();

            try {
                const response = await fetch(request.url, request.options);
                await response.arrayBuffer();
                statusCodes[response.status] = (statusCodes[response.status] || 0) + 1;

                if (!response.ok) {
                    errors.push(`HTTP ${response.status} em ${request.url}`);
                }
            } catch (error) {
                errors.push(error.message);
            } finally {
                latencies.push(performance.now() - requestStartedAt);
            }
        }
    }

    await Promise.all(
        Array.from({ length: concurrency }, () => worker())
    );

    const durationMs = performance.now() - startedAt;
    const resources = await monitor.stop();
    const successCount = Object.entries(statusCodes)
        .filter(([status]) => Number(status) >= 200 && Number(status) < 400)
        .reduce((sum, [, count]) => sum + count, 0);

    return {
        name,
        target,
        totalRequests,
        concurrency,
        durationMs: Number(durationMs.toFixed(2)),
        requestsPerSecond: Number((totalRequests / (durationMs / 1000)).toFixed(2)),
        successCount,
        errorCount: totalRequests - successCount,
        statusCodes,
        latency: summarizeLatencies(latencies),
        resources,
        sampleErrors: errors.slice(0, 5)
    };
}

async function ensureStressUser() {
    const email = `stress.${Date.now()}@allumni.local`;
    const senha = 'Stress123!';

    const response = await fetch(`${ALLUMNI_BASE_URL}/api/auth/cadastro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            nome: 'Usuario Stress',
            email,
            senha,
            curso: 'Sistemas de Informacao',
            ano_formatura: 2026
        })
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Nao foi possivel criar usuario de stress: ${response.status} ${body}`);
    }

    return { email, senha };
}

function toMarkdown(report) {
    const lines = [
        '# Relatorio de Stress - ALUMNI e FinOps',
        '',
        `Gerado em: ${report.generatedAt}`,
        '',
        '| Cenario | Requisicoes | Concorrencia | RPS | Erros | Media ms | P95 ms | P99 ms | CPU pico % | RAM pico MB |',
        '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |'
    ];

    for (const scenario of report.scenarios) {
        lines.push([
            scenario.name,
            scenario.totalRequests,
            scenario.concurrency,
            scenario.requestsPerSecond,
            scenario.errorCount,
            scenario.latency.avgMs,
            scenario.latency.p95Ms,
            scenario.latency.p99Ms,
            scenario.resources.maxCpuPercent,
            scenario.resources.maxRssMb
        ].join(' | ').replace(/^/, '| ').replace(/$/, ' |'));
    }

    lines.push('');
    lines.push('## Observacao FinOps');
    lines.push('');
    lines.push('Os cenarios de maior concorrencia elevam tempo de resposta, CPU e memoria. Esse aumento de consumo se conecta ao modulo FinOps porque a formula de custo usa CPU faturada e RAM faturada durante a execucao.');
    lines.push('');
    lines.push('## Status HTTP');
    lines.push('');

    for (const scenario of report.scenarios) {
        lines.push(`- ${scenario.name}: ${JSON.stringify(scenario.statusCodes)}`);
    }

    return `${lines.join('\n')}\n`;
}

async function stopServer(child) {
    if (!child || child.killed) {
        return;
    }

    child.kill('SIGINT');
    await sleep(500);

    if (!child.killed) {
        child.kill('SIGTERM');
    }
}

async function main() {
    fs.mkdirSync(EXPORTS_DIR, { recursive: true });

    const allumniServer = startServer({
        name: 'ALUMNI',
        cwd: path.join(ROOT_DIR, 'allumni-main'),
        port: ALLUMNI_PORT
    });
    const finopsServer = startServer({
        name: 'FinOps',
        cwd: ROOT_DIR,
        port: FINOPS_PORT
    });

    try {
        await Promise.all([
            waitForServer(`${ALLUMNI_BASE_URL}/api/vagas`),
            waitForServer(`${FINOPS_BASE_URL}/api/finops/configuracao`)
        ]);

        const stressUser = await ensureStressUser();
        const scenarios = [];

        scenarios.push(await runScenario({
            name: 'Login',
            target: `${ALLUMNI_BASE_URL}/api/auth/login`,
            totalRequests: 80,
            concurrency: 15,
            monitorPid: allumniServer.pid,
            requestFactory: () => ({
                url: `${ALLUMNI_BASE_URL}/api/auth/login`,
                options: {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(stressUser)
                }
            })
        }));

        scenarios.push(await runScenario({
            name: 'Vagas',
            target: `${ALLUMNI_BASE_URL}/api/vagas`,
            totalRequests: 150,
            concurrency: 30,
            monitorPid: allumniServer.pid,
            requestFactory: () => ({
                url: `${ALLUMNI_BASE_URL}/api/vagas`
            })
        }));

        scenarios.push(await runScenario({
            name: 'Grupos',
            target: `${ALLUMNI_BASE_URL}/api/grupos`,
            totalRequests: 150,
            concurrency: 30,
            monitorPid: allumniServer.pid,
            requestFactory: () => ({
                url: `${ALLUMNI_BASE_URL}/api/grupos`
            })
        }));

        scenarios.push(await runScenario({
            name: 'Mensagens de grupo',
            target: `${ALLUMNI_BASE_URL}/api/chat/grupo/1`,
            totalRequests: 100,
            concurrency: 20,
            monitorPid: allumniServer.pid,
            requestFactory: () => ({
                url: `${ALLUMNI_BASE_URL}/api/chat/grupo/1`
            })
        }));

        scenarios.push(await runScenario({
            name: 'FinOps comparacao',
            target: `${FINOPS_BASE_URL}/api/finops/comparar`,
            totalRequests: 4,
            concurrency: 2,
            monitorPid: finopsServer.pid,
            requestFactory: () => ({
                url: `${FINOPS_BASE_URL}/api/finops/comparar`,
                options: {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                }
            })
        }));

        const report = {
            generatedAt: new Date().toISOString(),
            ports: {
                allumni: ALLUMNI_PORT,
                finops: FINOPS_PORT
            },
            scenarios
        };
        const jsonPath = path.join(EXPORTS_DIR, 'stress-test-report.json');
        const markdownPath = path.join(EXPORTS_DIR, 'stress-test-report.md');

        fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf8');
        fs.writeFileSync(markdownPath, toMarkdown(report), 'utf8');

        console.table(scenarios.map((scenario) => ({
            cenario: scenario.name,
            reqs: scenario.totalRequests,
            conc: scenario.concurrency,
            rps: scenario.requestsPerSecond,
            erros: scenario.errorCount,
            mediaMs: scenario.latency.avgMs,
            p95Ms: scenario.latency.p95Ms,
            cpuPico: scenario.resources.maxCpuPercent,
            ramPicoMb: scenario.resources.maxRssMb
        })));
        console.log(`Relatorio JSON: ${jsonPath}`);
        console.log(`Relatorio Markdown: ${markdownPath}`);
    } finally {
        await Promise.all([
            stopServer(allumniServer),
            stopServer(finopsServer)
        ]);
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
