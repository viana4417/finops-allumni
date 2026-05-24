const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const { monitorExecution } = require('./finops/monitor');
const { SIMULATED_PRICING } = require('./finops/pricing');
const { saveCostChartPng } = require('./finops/cost-chart');
const {
    fetchAllumniSnapshot,
    createAllumniWorkload,
    runOptimizedAnalysis,
    runNonOptimizedAnalysis
} = require('./finops/allumni-report-service');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

const dbPath = path.join(__dirname, 'database', 'allumni.db');
const allumniSourceDbPath = path.join(__dirname, 'allumni-main', 'database', 'allumni.db');
const costChartPath = path.join(__dirname, 'exports', 'grafico_custos.png');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err.message);
        process.exit(1);
    }
    console.log('Conectado ao banco de dados SQLite.');
});

const sourceDb = new sqlite3.Database(allumniSourceDbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco fonte do allumni-main:', err.message);
        process.exit(1);
    }
    console.log('Conectado ao banco fonte do allumni-main.');
});

const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function runStatement(err) {
        if (err) {
            reject(err);
            return;
        }

        resolve({ id: this.lastID, changes: this.changes });
    });
});

const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
        if (err) {
            reject(err);
            return;
        }

        resolve(rows);
    });
});

const sourceDbAll = (sql, params = []) => new Promise((resolve, reject) => {
    sourceDb.all(sql, params, (err, rows) => {
        if (err) {
            reject(err);
            return;
        }

        resolve(rows);
    });
});

const ensureFinOpsSchema = async () => {
    await dbRun(`
        CREATE TABLE IF NOT EXISTS registro_operacoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            operacao TEXT NOT NULL,
            versao TEXT NOT NULL,
            total_registros INTEGER NOT NULL,
            tempo_execucao_ms REAL NOT NULL,
            cpu_usuario_ms REAL NOT NULL,
            cpu_sistema_ms REAL NOT NULL,
            cpu_total_ms REAL NOT NULL,
            memoria_inicial_mb REAL NOT NULL,
            memoria_final_mb REAL NOT NULL,
            memoria_media_mb REAL NOT NULL,
            memoria_pico_mb REAL NOT NULL,
            custo_cpu REAL NOT NULL,
            custo_ram REAL NOT NULL,
            custo_total REAL NOT NULL,
            resumo_json TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
};

const finopsSchemaReady = ensureFinOpsSchema();

async function saveFinOpsExecution(execution) {
    await dbRun(
        `INSERT INTO registro_operacoes (
            operacao,
            versao,
            total_registros,
            tempo_execucao_ms,
            cpu_usuario_ms,
            cpu_sistema_ms,
            cpu_total_ms,
            memoria_inicial_mb,
            memoria_final_mb,
            memoria_media_mb,
            memoria_pico_mb,
            custo_cpu,
            custo_ram,
            custo_total,
            resumo_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            execution.operationName,
            execution.version,
            execution.totalRecords,
            execution.metrics.elapsedMs,
            execution.metrics.cpuUserMs,
            execution.metrics.cpuSystemMs,
            execution.metrics.cpuTotalMs,
            execution.metrics.initialMemoryMb,
            execution.metrics.finalMemoryMb,
            execution.metrics.averageMemoryMb,
            execution.metrics.peakMemoryMb,
            execution.costs.cpuCost,
            execution.costs.ramCost,
            execution.costs.totalCost,
            JSON.stringify(execution.summary)
        ]
    );
}

async function executeFinOpsAnalysis(version) {
    await finopsSchemaReady;

    const sourceSnapshot = await fetchAllumniSnapshot(sourceDbAll);
    const workload = createAllumniWorkload(sourceSnapshot);
    const analyzer = version === 'otimizada' ? runOptimizedAnalysis : runNonOptimizedAnalysis;

    const monitoredExecution = await monitorExecution({
            operationName: 'dashboard_financeiro',
            version,
            execute: async () => analyzer(workload)
    });

    const execution = {
        operationName: monitoredExecution.metrics.operationName,
        version,
        metrics: monitoredExecution.metrics,
        costs: monitoredExecution.costs,
        summary: monitoredExecution.result,
        totalRecords: workload.totalRecords
    };

    await saveFinOpsExecution(execution);
    return execution;
}

function buildComparisonResponse(optimizedExecution, nonOptimizedExecution) {
    const savings = Number((nonOptimizedExecution.costs.totalCost - optimizedExecution.costs.totalCost).toFixed(6));
    const savingsPercent = nonOptimizedExecution.costs.totalCost > 0
        ? Number(((savings / nonOptimizedExecution.costs.totalCost) * 100).toFixed(2))
        : 0;

    return {
        operacao: 'dashboard_financeiro',
        tabelaPrecos: SIMULATED_PRICING,
        versaoOtimizada: optimizedExecution,
        versaoNaoOtimizada: nonOptimizedExecution,
        comparativo: {
            economiaAbsoluta: savings,
            economiaPercentual: savingsPercent,
            diferencaTempoMs: Number((nonOptimizedExecution.metrics.elapsedMs - optimizedExecution.metrics.elapsedMs).toFixed(3)),
            diferencaMemoriaMb: Number((nonOptimizedExecution.metrics.averageMemoryMb - optimizedExecution.metrics.averageMemoryMb).toFixed(3))
        }
    };
}

function getCostChartInfo() {
    if (!fs.existsSync(costChartPath)) {
        return null;
    }

    const stats = fs.statSync(costChartPath);

    return {
        fileName: 'grafico_custos.png',
        savedPath: costChartPath,
        url: `/api/finops/grafico-custos?t=${Math.round(stats.mtimeMs)}`
    };
}

async function withGeneratedCostChart(payload, executions) {
    await saveCostChartPng({
        executions,
        outputPath: costChartPath
    });

    return {
        ...payload,
        grafico: getCostChartInfo()
    };
}

app.get('/api/finops/configuracao', async (req, res) => {
    try {
        await finopsSchemaReady;
        res.json({
            pricing: SIMULATED_PRICING,
            operation: {
                name: 'dashboard_financeiro',
                description: 'Monitoramento financeiro de uma rotina analítica baseada nas tabelas usuarios, vagas, grupos, candidaturas e mensagens do sistema allumni-main.'
            },
            source: {
                system: 'allumni-main',
                databasePath: allumniSourceDbPath
            },
            grafico: getCostChartInfo()
        });
    } catch (error) {
        console.error('Erro ao carregar configuração FinOps:', error);
        res.status(500).json({ error: 'Erro ao carregar configuração FinOps' });
    }
});

app.get('/api/finops/dados-csv', async (req, res) => {
    try {
        await finopsSchemaReady;
        const rows = await dbAll(
            `SELECT created_at, versao, tempo_execucao_ms, memoria_media_mb, memoria_pico_mb,
                    cpu_total_ms, custo_cpu, custo_ram, custo_total
             FROM registro_operacoes
             ORDER BY datetime(created_at) ASC, id ASC`
        );

        const header = [
            'data_hora',
            'versao',
            'tempo_execucao_ms',
            'cpu_total_ms',
            'memoria_media_mb',
            'memoria_pico_mb',
            'cpu_segundos_faturados',
            'ram_gb_segundos_faturados',
            'custo_cpu',
            'custo_ram',
            'custo_total'
        ];

        const csv = [
            header.join(','),
            ...rows.map((row) => [
                row.created_at,
                row.versao,
                row.tempo_execucao_ms,
                row.cpu_total_ms,
                row.memoria_media_mb,
                row.memoria_pico_mb,
                row.cpu_total_ms / 1000,
                (row.memoria_media_mb / 1024) * (row.tempo_execucao_ms / 1000),
                row.custo_cpu,
                row.custo_ram,
                row.custo_total
            ].join(','))
        ].join('\n');

        const exportDir = path.join(__dirname, 'exports');
        fs.mkdirSync(exportDir, { recursive: true });
        const exportPath = path.join(exportDir, 'dados_finops.csv');
        fs.writeFileSync(exportPath, csv, 'utf8');

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename=\"dados_finops.csv\"');
        res.send(csv);
    } catch (error) {
        console.error('Erro ao exportar CSV FinOps:', error);
        res.status(500).json({ error: 'Erro ao exportar CSV FinOps' });
    }
});

app.get('/api/finops/grafico-custos', (req, res) => {
    if (!fs.existsSync(costChartPath)) {
        res.status(404).json({ error: 'O gráfico ainda não foi gerado' });
        return;
    }

    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(costChartPath);
});

app.get('/api/finops/historico', async (req, res) => {
    try {
        await finopsSchemaReady;
        const limite = Number(req.query.limit || 10);
        const historico = await dbAll(
            `SELECT id, operacao, versao, total_registros, tempo_execucao_ms, cpu_total_ms,
                    memoria_media_mb, memoria_pico_mb, custo_cpu, custo_ram, custo_total, created_at
             FROM registro_operacoes
             ORDER BY datetime(created_at) DESC, id DESC
             LIMIT ?`,
            [limite]
        );

        res.json(historico);
    } catch (error) {
        console.error('Erro ao listar histórico FinOps:', error);
        res.status(500).json({ error: 'Erro ao listar histórico FinOps' });
    }
});

app.get('/api/finops/resumo', async (req, res) => {
    try {
        await finopsSchemaReady;
        const resumo = await dbAll(
            `SELECT versao,
                    COUNT(*) AS execucoes,
                    ROUND(AVG(tempo_execucao_ms), 3) AS tempo_medio_ms,
                    ROUND(AVG(memoria_media_mb), 3) AS memoria_media_mb,
                    ROUND(AVG(custo_total), 6) AS custo_medio
             FROM registro_operacoes
             GROUP BY versao`
        );

        res.json(resumo);
    } catch (error) {
        console.error('Erro ao carregar resumo FinOps:', error);
        res.status(500).json({ error: 'Erro ao carregar resumo FinOps' });
    }
});

app.post('/api/finops/executar', async (req, res) => {
    try {
        const version = req.body?.versao;

        if (!['otimizada', 'nao_otimizada'].includes(version)) {
            return res.status(400).json({ error: 'A versão deve ser "otimizada" ou "nao_otimizada"' });
        }

        const execution = await executeFinOpsAnalysis(version);
        res.json(await withGeneratedCostChart(execution, [execution]));
    } catch (error) {
        console.error('Erro ao executar análise FinOps:', error);
        res.status(500).json({ error: 'Erro ao executar análise FinOps' });
    }
});

app.post('/api/finops/comparar', async (req, res) => {
    try {
        const nonOptimizedExecution = await executeFinOpsAnalysis('nao_otimizada');
        const optimizedExecution = await executeFinOpsAnalysis('otimizada');

        const comparison = buildComparisonResponse(optimizedExecution, nonOptimizedExecution);
        res.json(await withGeneratedCostChart(comparison, [optimizedExecution, nonOptimizedExecution]));
    } catch (error) {
        console.error('Erro ao comparar execuções FinOps:', error);
        res.status(500).json({ error: 'Erro ao comparar execuções FinOps' });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Acesse: http://localhost:${PORT}`);
});

process.on('SIGINT', () => {
    db.close((err) => {
        sourceDb.close(() => {
            if (err) {
                console.error('Erro ao fechar banco de dados:', err.message);
            } else {
                console.log('Banco de dados fechado.');
            }
            process.exit(0);
        });
    });
});
