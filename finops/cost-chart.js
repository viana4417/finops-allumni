const { execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

function versionLabel(version) {
    return version === 'nao_otimizada' ? 'Nao otimizada' : 'Otimizada';
}

function buildChartPayload(executions) {
    return {
        generatedAt: new Date().toLocaleString('pt-BR'),
        rows: executions.map((execution) => ({
            label: versionLabel(execution.version),
            cost: Number(execution.costs.totalCost || 0),
            cpuMs: Number(execution.metrics.cpuTotalMs || 0),
            peakMemoryMb: Number(execution.metrics.peakMemoryMb || 0),
            elapsedMs: Number(execution.metrics.elapsedMs || 0),
            minimumCostApplied: Boolean(execution.costs.minimumCostApplied)
        }))
    };
}

function runPythonChart(inputPath, outputPath) {
    const scriptPath = path.join(__dirname, 'generate-cost-chart.py');

    return new Promise((resolve, reject) => {
        execFile('python3', [scriptPath, inputPath, outputPath], (error, stdout, stderr) => {
            if (error) {
                reject(new Error(stderr || stdout || error.message));
                return;
            }

            resolve(outputPath);
        });
    });
}

async function saveCostChartPng({ executions, outputPath }) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    const inputPath = path.join(os.tmpdir(), `finops-chart-${process.pid}-${Date.now()}.json`);

    try {
        fs.writeFileSync(inputPath, JSON.stringify(buildChartPayload(executions)), 'utf8');
        await runPythonChart(inputPath, outputPath);
        return outputPath;
    } finally {
        fs.rmSync(inputPath, { force: true });
    }
}

module.exports = {
    saveCostChartPng
};
