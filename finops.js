const FINOPS_API_BASE = '/api/finops';

function formatMoney(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 4,
        maximumFractionDigits: 6
    }).format(Number(value || 0));
}

function formatNumber(value, fractionDigits = 3) {
    return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits
    }).format(Number(value || 0));
}

function formatDateTime(value) {
    return new Date(value).toLocaleString('pt-BR');
}

async function requestFinOps(endpoint, options = {}) {
    const response = await fetch(`${FINOPS_API_BASE}${endpoint}`, {
        headers: {
            'Content-Type': 'application/json'
        },
        ...options
    });

    const payload = await response.json();

    if (!response.ok) {
        throw new Error(payload.error || 'Erro ao acessar o módulo FinOps');
    }

    return payload;
}

function setLoadingState(isLoading) {
    document.getElementById('runOptimizedBtn').disabled = isLoading;
    document.getElementById('runNonOptimizedBtn').disabled = isLoading;
    document.getElementById('runCompareBtn').disabled = isLoading;
    document.getElementById('comparisonStatus').textContent = isLoading
        ? 'Executando análise e coletando métricas reais do processo Node.js...'
        : 'Pronto para uma nova execução.';
}

function renderPricing(config) {
    const pricingBox = document.getElementById('pricingBox');
    pricingBox.innerHTML = `
        <p><strong>Cenário simulado:</strong> ${config.pricing.cloudProfile.serviceModel}</p>
        <p><strong>Perfil do servidor:</strong> ${config.pricing.cloudProfile.serverProfile}</p>
        <p><strong>Fórmula:</strong> <code>Custo = (CPU em segundos x Preço_vCPU) + (RAM média em GB x Tempo x Preço_RAM)</code></p>
        <p><strong>Preço vCPU:</strong> ${formatMoney(config.pricing.rates.cpuPerVcpuSecond)} por vCPU-segundo.</p>
        <p><strong>Preço RAM:</strong> ${formatMoney(config.pricing.rates.ramPerGbSecond)} por GB-segundo.</p>
        <p><strong>Operação monitorada:</strong> ${config.operation.description}</p>
        <p><strong>Sistema fonte:</strong> ${config.source.system}</p>
        <p><strong>Premissa:</strong> ${config.pricing.assumptions[0]}</p>
    `;
}

function renderSummary(summary, config) {
    const summaryBox = document.getElementById('summaryBox');

    if (!summary.length) {
        summaryBox.innerHTML = `
            <article class="finops-summary-item">
                <h3>Fonte dos dados</h3>
                <p><strong>Sistema:</strong> ${config.source.system}</p>
                <p><strong>Banco:</strong> ${config.source.databasePath}</p>
            </article>
            <p class="empty-state">Ainda não há execuções registradas.</p>
        `;
        return;
    }

    summaryBox.innerHTML = `
        <article class="finops-summary-item">
            <h3>Fonte dos dados</h3>
            <p><strong>Sistema:</strong> ${config.source.system}</p>
            <p><strong>Banco:</strong> ${config.source.databasePath}</p>
        </article>
        ${summary.map((item) => `
        <article class="finops-summary-item">
            <h3>${item.versao === 'otimizada' ? 'Versão otimizada' : 'Versão não otimizada'}</h3>
            <p><strong>Execuções:</strong> ${item.execucoes}</p>
            <p><strong>Tempo médio:</strong> ${formatNumber(item.tempo_medio_ms)} ms</p>
            <p><strong>RAM média:</strong> ${formatNumber(item.memoria_media_mb)} MB</p>
            <p><strong>Custo médio:</strong> ${formatMoney(item.custo_medio)}</p>
        </article>
    `).join('')}
    `;
}

function renderMetricCard(containerId, execution) {
    const container = document.getElementById(containerId);

    if (!execution) {
        container.innerHTML = '<p class="empty-state">Nenhuma execução ainda.</p>';
        return;
    }

    container.innerHTML = `
        <div class="finops-metric-item"><span>Tempo total</span><strong>${formatNumber(execution.metrics.elapsedMs)} ms</strong></div>
        <div class="finops-metric-item"><span>CPU total</span><strong>${formatNumber(execution.metrics.cpuTotalMs)} ms</strong></div>
        <div class="finops-metric-item"><span>CPU faturada</span><strong>${formatNumber(execution.costs.cpuSeconds, 4)} s</strong></div>
        <div class="finops-metric-item"><span>RAM média</span><strong>${formatNumber(execution.metrics.averageMemoryMb)} MB</strong></div>
        <div class="finops-metric-item"><span>RAM faturada</span><strong>${formatNumber(execution.costs.ramGbSeconds, 6)} GB.s</strong></div>
        <div class="finops-metric-item"><span>RAM pico</span><strong>${formatNumber(execution.metrics.peakMemoryMb)} MB</strong></div>
        <div class="finops-metric-item"><span>Registros analisados</span><strong>${execution.totalRecords}</strong></div>
        <div class="finops-metric-item"><span>Custo CPU</span><strong>${formatMoney(execution.costs.cpuCost)}</strong></div>
        <div class="finops-metric-item"><span>Custo RAM</span><strong>${formatMoney(execution.costs.ramCost)}</strong></div>
        <div class="finops-metric-item"><span>Custo total</span><strong>${formatMoney(execution.costs.totalCost)}</strong></div>
    `;
}

function renderBars(comparison) {
    const barsBox = document.getElementById('barsBox');

    if (!comparison) {
        barsBox.innerHTML = '<p class="empty-state">Os gráficos simples aparecerão aqui após uma comparação.</p>';
        return;
    }

    const metrics = [
        {
            label: 'Custo financeiro',
            optimized: comparison.versaoOtimizada.costs.totalCost,
            nonOptimized: comparison.versaoNaoOtimizada.costs.totalCost,
            formatter: formatMoney
        },
        {
            label: 'Tempo de execução',
            optimized: comparison.versaoOtimizada.metrics.elapsedMs,
            nonOptimized: comparison.versaoNaoOtimizada.metrics.elapsedMs,
            formatter: (value) => `${formatNumber(value)} ms`
        },
        {
            label: 'RAM média',
            optimized: comparison.versaoOtimizada.metrics.averageMemoryMb,
            nonOptimized: comparison.versaoNaoOtimizada.metrics.averageMemoryMb,
            formatter: (value) => `${formatNumber(value)} MB`
        }
    ];

    barsBox.innerHTML = metrics.map((metric) => {
        const max = Math.max(metric.optimized, metric.nonOptimized, 1);
        const optimizedWidth = (metric.optimized / max) * 100;
        const nonOptimizedWidth = (metric.nonOptimized / max) * 100;

        return `
            <div class="finops-bar-group">
                <div class="finops-bar-label">
                    <span>${metric.label}</span>
                    <span>Otimizada: ${metric.formatter(metric.optimized)} | Não otimizada: ${metric.formatter(metric.nonOptimized)}</span>
                </div>
                <div class="finops-bar-track">
                    <div class="finops-bar optimized" style="width: ${optimizedWidth}%"></div>
                </div>
                <div class="finops-bar-track">
                    <div class="finops-bar non-optimized" style="width: ${nonOptimizedWidth}%"></div>
                </div>
            </div>
        `;
    }).join('');
}

function renderHistory(history) {
    const body = document.getElementById('historyTableBody');

    if (!history.length) {
        body.innerHTML = '<tr><td colspan="7" class="empty-state">Ainda não há histórico gravado.</td></tr>';
        return;
    }

    body.innerHTML = history.map((item) => `
        <tr>
            <td>${formatDateTime(item.created_at)}</td>
            <td>${item.versao === 'otimizada' ? 'Otimizada' : 'Não otimizada'}</td>
            <td>${item.total_registros}</td>
            <td>${formatNumber(item.tempo_execucao_ms)} ms</td>
            <td>${formatNumber(item.cpu_total_ms)} ms</td>
            <td>${formatNumber(item.memoria_media_mb)} MB</td>
            <td>${formatMoney(item.custo_total)}</td>
        </tr>
    `).join('');
}

function renderComparison(comparison) {
    renderMetricCard('optimizedMetrics', comparison?.versaoOtimizada);
    renderMetricCard('nonOptimizedMetrics', comparison?.versaoNaoOtimizada);
    renderBars(comparison);

    const status = document.getElementById('comparisonStatus');
    if (comparison) {
        status.textContent =
            `Economia estimada da versão otimizada: ${formatMoney(comparison.comparativo.economiaAbsoluta)} ` +
            `(${formatNumber(comparison.comparativo.economiaPercentual, 2)}%).`;
    }
}

async function refreshDashboard() {
    const [config, summary, history] = await Promise.all([
        requestFinOps('/configuracao'),
        requestFinOps('/resumo'),
        requestFinOps('/historico?limit=12')
    ]);

    renderPricing(config);
    renderSummary(summary, config);
    renderHistory(history);
}

async function runSingleVersion(version) {
    setLoadingState(true);

    try {
        const execution = await requestFinOps('/executar', {
            method: 'POST',
            body: JSON.stringify({ versao: version })
        });

        if (version === 'otimizada') {
            renderMetricCard('optimizedMetrics', execution);
        } else {
            renderMetricCard('nonOptimizedMetrics', execution);
        }

        await refreshDashboard();
        document.getElementById('comparisonStatus').textContent =
            `Execução ${version === 'otimizada' ? 'otimizada' : 'não otimizada'} concluída com sucesso.`;
    } catch (error) {
        alert(error.message);
    } finally {
        setLoadingState(false);
    }
}

async function runComparison() {
    setLoadingState(true);

    try {
        const comparison = await requestFinOps('/comparar', {
            method: 'POST'
        });

        renderComparison(comparison);
        await refreshDashboard();
    } catch (error) {
        alert(error.message);
    } finally {
        setLoadingState(false);
    }
}

async function initFinOps() {
    document.getElementById('runOptimizedBtn').addEventListener('click', () => runSingleVersion('otimizada'));
    document.getElementById('runNonOptimizedBtn').addEventListener('click', () => runSingleVersion('nao_otimizada'));
    document.getElementById('runCompareBtn').addEventListener('click', runComparison);

    try {
        await refreshDashboard();
    } catch (error) {
        alert(error.message);
    }
}

document.addEventListener('DOMContentLoaded', initFinOps);
