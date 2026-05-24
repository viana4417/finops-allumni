const SIMULATED_PRICING = {
    currency: 'BRL',
    cloudProfile: {
        provider: 'Nuvem Simulada',
        serviceModel: 'Monitor de Custos Simulado baseado em CPU, memoria RAM e armazenamento',
        serverProfile: 'Aplicacao web ALUMNI analisada pelo modulo FinOps'
    },
    rates: {
        ramPerGbSecond: 0.10,
        cpuPerHour: 1.00,
        storagePerGbHour: 0.05
    },
    billing: {
        minimumOperationCost: 0.000001,
        rule: 'Operacoes com custo calculado abaixo do minimo recebem uma cobranca simbolica minima para nao aparecerem como zero.'
    },
    example: {
        ramGb: 2,
        ramSeconds: 10,
        cpuHours: 2,
        ramCost: 2,
        cpuCost: 2,
        totalCost: 4
    },
    assumptions: [
        'A tabela de precos e ficticia e segue o modelo solicitado no projeto.',
        '1 GB de RAM custa R$ 0,10 por segundo.',
        '1 hora de CPU custa R$ 1,00.',
        '1 GB de armazenamento custa R$ 0,05 por hora.',
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
    const cpuHours = cpuSeconds / 3600;
    const averageRamGb = metrics.averageMemoryMb / 1024;
    const ramGbSeconds = averageRamGb * elapsedSeconds;

    const cpuCost = cpuHours * SIMULATED_PRICING.rates.cpuPerHour;
    const ramCost = ramGbSeconds * SIMULATED_PRICING.rates.ramPerGbSecond;
    const subtotalCost = cpuCost + ramCost;
    const minimumOperationCost = SIMULATED_PRICING.billing.minimumOperationCost;
    const minimumCostApplied = subtotalCost > 0 && subtotalCost < minimumOperationCost;
    const totalCost = minimumCostApplied ? minimumOperationCost : subtotalCost;

    return {
        elapsedSeconds: Number(elapsedSeconds.toFixed(4)),
        cpuSeconds: Number(cpuSeconds.toFixed(4)),
        cpuHours: Number(cpuHours.toFixed(8)),
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
