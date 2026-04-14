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
    assumptions: [
        'O Allumni esta publicado em um servidor de aplicacao na nuvem.',
        'Cada operacao consome uma fração do tempo de CPU e da memoria RAM desse servidor.',
        'O custo da operacao e proporcional ao uso efetivo de CPU e RAM durante a execucao.'
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

    return {
        elapsedSeconds: Number(elapsedSeconds.toFixed(4)),
        cpuSeconds: Number(cpuSeconds.toFixed(4)),
        averageRamGb: Number(averageRamGb.toFixed(4)),
        ramGbSeconds: Number(ramGbSeconds.toFixed(6)),
        cpuCost: toCurrency(cpuCost),
        ramCost: toCurrency(ramCost),
        totalCost: toCurrency(cpuCost + ramCost)
    };
}

module.exports = {
    SIMULATED_PRICING,
    calculateFinOpsCost
};
