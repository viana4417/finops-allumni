function cloneCollection(collection, multiplier, mapper) {
    const output = [];

    for (let index = 0; index < multiplier; index += 1) {
        for (const item of collection) {
            output.push(mapper(item, index));
        }
    }

    return output;
}

async function fetchAllumniSnapshot(sourceDbAll) {
    const [users, jobs, groups, applications, messages] = await Promise.all([
        sourceDbAll('SELECT id, nome, email, tipo, curso, ano_formatura FROM usuarios'),
        sourceDbAll('SELECT id, titulo, empresa, criado_por, status FROM vagas'),
        sourceDbAll('SELECT id, nome, criado_por, tipo FROM grupos'),
        sourceDbAll('SELECT id, vaga_id, usuario_id, status FROM candidaturas'),
        sourceDbAll('SELECT id, remetente_id, destinatario_id, grupo_id, tipo FROM mensagens')
    ]);

    return {
        users,
        jobs,
        groups,
        applications,
        messages
    };
}

function createAllumniWorkload(snapshot, multiplier = 160) {
    const users = cloneCollection(snapshot.users, multiplier, (user, index) => ({
        ...user,
        syntheticKey: `${user.id}-${index}`
    }));

    const jobs = cloneCollection(snapshot.jobs, multiplier, (job, index) => ({
        ...job,
        syntheticKey: `${job.id}-${index}`
    }));

    const groups = cloneCollection(snapshot.groups, multiplier, (group, index) => ({
        ...group,
        syntheticKey: `${group.id}-${index}`
    }));

    const applications = cloneCollection(snapshot.applications, multiplier, (application, index) => ({
        ...application,
        syntheticKey: `${application.id}-${index}`
    }));

    const messages = cloneCollection(snapshot.messages, multiplier, (message, index) => ({
        ...message,
        syntheticKey: `${message.id}-${index}`
    }));

    return {
        users,
        jobs,
        groups,
        applications,
        messages,
        totalRecords: users.length + jobs.length + groups.length + applications.length + messages.length
    };
}

function createTabularSummary(departments) {
    return departments.map((item) => ({
        entidade: item.entity,
        total_registros: item.totalRecords,
        media_por_usuario: item.averagePerUser,
        indice_eficiencia: item.efficiencyIndex
    }));
}

function runOptimizedAnalysis(workload) {
    const messagesBySender = new Map();
    const jobsByOwner = new Map();
    const groupsByOwner = new Map();
    const applicationsByUser = new Map();

    for (const message of workload.messages) {
        messagesBySender.set(message.remetente_id, (messagesBySender.get(message.remetente_id) || 0) + 1);
    }

    for (const job of workload.jobs) {
        jobsByOwner.set(job.criado_por, (jobsByOwner.get(job.criado_por) || 0) + 1);
    }

    for (const group of workload.groups) {
        groupsByOwner.set(group.criado_por, (groupsByOwner.get(group.criado_por) || 0) + 1);
    }

    for (const application of workload.applications) {
        applicationsByUser.set(application.usuario_id, (applicationsByUser.get(application.usuario_id) || 0) + 1);
    }

    const totalUsers = Math.max(workload.users.length, 1);
    const departments = [
        {
            entity: 'usuarios',
            totalRecords: workload.users.length,
            averagePerUser: 1,
            efficiencyIndex: Number((workload.users.length / totalUsers).toFixed(2))
        },
        {
            entity: 'vagas',
            totalRecords: workload.jobs.length,
            averagePerUser: Number((workload.jobs.length / totalUsers).toFixed(2)),
            efficiencyIndex: Number((workload.jobs.length / Math.max(jobsByOwner.size, 1)).toFixed(2))
        },
        {
            entity: 'grupos',
            totalRecords: workload.groups.length,
            averagePerUser: Number((workload.groups.length / totalUsers).toFixed(2)),
            efficiencyIndex: Number((workload.groups.length / Math.max(groupsByOwner.size, 1)).toFixed(2))
        },
        {
            entity: 'mensagens',
            totalRecords: workload.messages.length,
            averagePerUser: Number((workload.messages.length / totalUsers).toFixed(2)),
            efficiencyIndex: Number((workload.messages.length / Math.max(messagesBySender.size, 1)).toFixed(2))
        },
        {
            entity: 'candidaturas',
            totalRecords: workload.applications.length,
            averagePerUser: Number((workload.applications.length / totalUsers).toFixed(2)),
            efficiencyIndex: Number((workload.applications.length / Math.max(applicationsByUser.size, 1)).toFixed(2))
        }
    ];

    return {
        analysisType: 'otimizada',
        sourceSystem: 'allumni-main',
        processedRecords: workload.totalRecords,
        entities: departments,
        tabularData: createTabularSummary(departments)
    };
}

function runNonOptimizedAnalysis(workload) {
    const summaryRows = [];
    const memoryPressure = [];
    const entityGroups = [
        ['usuarios', workload.users],
        ['vagas', workload.jobs],
        ['grupos', workload.groups],
        ['mensagens', workload.messages],
        ['candidaturas', workload.applications]
    ];

    for (const [entity, records] of entityGroups) {
        let totalRecords = 0;
        let runningBytes = 0;

        for (const outer of records) {
            for (const inner of records) {
                if (!inner) {
                    continue;
                }

                totalRecords += 1;
                runningBytes += JSON.stringify(inner).length;

                memoryPressure.push({
                    entity,
                    narrative: `${entity}-${outer.syntheticKey || outer.id}`.repeat(10),
                    bytes: runningBytes
                });
            }
        }

        summaryRows.push({
            entity,
            totalRecords,
            averagePerUser: Number((totalRecords / Math.max(workload.users.length, 1)).toFixed(2)),
            efficiencyIndex: Number((runningBytes / Math.max(totalRecords, 1)).toFixed(2))
        });
    }

    return {
        analysisType: 'nao_otimizada',
        sourceSystem: 'allumni-main',
        processedRecords: workload.totalRecords,
        transientObjects: memoryPressure.length,
        entities: summaryRows,
        tabularData: createTabularSummary(summaryRows)
    };
}

module.exports = {
    fetchAllumniSnapshot,
    createAllumniWorkload,
    runOptimizedAnalysis,
    runNonOptimizedAnalysis
};
