const { calculateFinOpsCost } = require('./pricing');

function toMb(bytes) {
    return bytes / (1024 * 1024);
}

async function monitorExecution({ operationName, version, execute }) {
    const startedAt = new Date().toISOString();
    const startCpu = process.cpuUsage();
    const startHrTime = process.hrtime.bigint();
    const initialMemoryMb = toMb(process.memoryUsage().heapUsed);
    const memorySamples = [initialMemoryMb];

    let peakMemoryMb = initialMemoryMb;

    const sampler = setInterval(() => {
        const currentMemoryMb = toMb(process.memoryUsage().heapUsed);
        memorySamples.push(currentMemoryMb);
        peakMemoryMb = Math.max(peakMemoryMb, currentMemoryMb);
    }, 20);

    if (typeof sampler.unref === 'function') {
        sampler.unref();
    }

    try {
        const result = await execute();
        const cpuUsage = process.cpuUsage(startCpu);
        const elapsedMs = Number(process.hrtime.bigint() - startHrTime) / 1e6;
        const finalMemoryMb = toMb(process.memoryUsage().heapUsed);
        const averageMemoryMb = memorySamples.reduce((acc, sample) => acc + sample, 0) / memorySamples.length;

        const metrics = {
            operationName,
            version,
            startedAt,
            elapsedMs: Number(elapsedMs.toFixed(3)),
            cpuUserMs: Number((cpuUsage.user / 1000).toFixed(3)),
            cpuSystemMs: Number((cpuUsage.system / 1000).toFixed(3)),
            cpuTotalMs: Number(((cpuUsage.user + cpuUsage.system) / 1000).toFixed(3)),
            initialMemoryMb: Number(initialMemoryMb.toFixed(3)),
            finalMemoryMb: Number(finalMemoryMb.toFixed(3)),
            peakMemoryMb: Number(Math.max(peakMemoryMb, finalMemoryMb).toFixed(3)),
            averageMemoryMb: Number(averageMemoryMb.toFixed(3))
        };

        return {
            metrics,
            costs: calculateFinOpsCost(metrics),
            result
        };
    } finally {
        clearInterval(sampler);
    }
}

module.exports = {
    monitorExecution
};
