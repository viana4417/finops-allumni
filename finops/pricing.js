const SIMULATED_PRICING = {
    currency: 'BRL',
    cloudProfile: {
        provider: 'Nuvem Simulada',
        serviceModel: 'Servidor web/API do Allumni em modelo pay-as-you-go',
        serverProfile: 'Instancia de aplicacao com 2 vCPU e 4 GB RAM'
    },
    rates: {
        cpuPerVcpuSecond: 0.000047,
        ramPerGbSecond: 0.0000064
    },
    billing: {
        minimumOperationCost: 0.000001,
        rule: 'Operacoes com custo calculado abaixo do minimo recebem uma cobranca simbolica minima.'
    },
    assumptions: [
        'O Allumni esta publicado em um servidor de aplicacao na nuvem.',
        'Cada operacao consome uma fração do tempo de CPU e da memoria RAM desse servidor.',
        'O custo da operacao e proporcional ao uso efetivo de CPU e RAM durante a execucao.',
        'Operacoes muito rapidas recebem custo minimo para evitar arredondamento para zero.'
    ]
};

function toCurrency(value) {
    return Number(value.toFixed(6));
}

function calculateFinOpsCost(metrics) {
    const elapsedSeconds = metrics.elapsedMs / 1000;
    const cpuSeconds = metrics.cpuTotalMs / 1000;
    const averageRamGb = metrics.averageMemoryMb / 1024;
    const ramGbSeconds = averageRamGb * elapsedSeconds;

    const cpuCost = cpuSeconds * SIMULATED_PRICING.rates.cpuPerVcpuSecond;
    const ramCost = ramGbSeconds * SIMULATED_PRICING.rates.ramPerGbSecond;
    const subtotalCost = cpuCost + ramCost;
    const minimumOperationCost = SIMULATED_PRICING.billing.minimumOperationCost;
    const minimumCostApplied = subtotalCost > 0 && subtotalCost < minimumOperationCost;
    const totalCost = minimumCostApplied ? minimumOperationCost : subtotalCost;

    return {
        elapsedSeconds: Number(elapsedSeconds.toFixed(4)),
        cpuSeconds: Number(cpuSeconds.toFixed(4)),
        averageRamGb: Number(averageRamGb.toFixed(4)),
        ramGbSeconds: Number(ramGbSeconds.toFixed(6)),
        cpuCost: toCurrency(cpuCost),
        ramCost: toCurrency(ramCost),
        subtotalCost: toCurrency(subtotalCost),
        minimumAdjustment: toCurrency(totalCost - subtotalCost),
        minimumCostApplied,
        totalCost: toCurrency(totalCost)
    };
}

module.exports = {
    SIMULATED_PRICING,
    calculateFinOpsCost
};
