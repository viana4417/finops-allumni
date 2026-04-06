// Sistema de banco de dados usando IndexedDB para funcionar sem servidor

const DB_NAME = 'allumni_db';
const DB_VERSION = 2;

let db = null;

// Inicializar banco de dados
async function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const database = event.target.result;

            if (!database.objectStoreNames.contains('usuarios')) {
                const usuariosStore = database.createObjectStore('usuarios', { keyPath: 'id', autoIncrement: true });
                usuariosStore.createIndex('email', 'email', { unique: true });
            }

            if (!database.objectStoreNames.contains('perfis')) {
                const perfisStore = database.createObjectStore('perfis', { keyPath: 'id', autoIncrement: true });
                perfisStore.createIndex('usuario_id', 'usuario_id', { unique: true });
            }

            if (!database.objectStoreNames.contains('vagas')) {
                const vagasStore = database.createObjectStore('vagas', { keyPath: 'id', autoIncrement: true });
                vagasStore.createIndex('criado_por', 'criado_por');
            }

            if (!database.objectStoreNames.contains('grupos')) {
                const gruposStore = database.createObjectStore('grupos', { keyPath: 'id', autoIncrement: true });
                gruposStore.createIndex('criado_por', 'criado_por');
            }

            if (!database.objectStoreNames.contains('grupo_membros')) {
                const grupoMembrosStore = database.createObjectStore('grupo_membros', { keyPath: 'id', autoIncrement: true });
                grupoMembrosStore.createIndex('grupo_id', 'grupo_id');
                grupoMembrosStore.createIndex('usuario_id', 'usuario_id');
                grupoMembrosStore.createIndex('grupo_usuario', ['grupo_id', 'usuario_id'], { unique: true });
            }

            if (!database.objectStoreNames.contains('mensagens')) {
                const mensagensStore = database.createObjectStore('mensagens', { keyPath: 'id', autoIncrement: true });
                mensagensStore.createIndex('grupo_id', 'grupo_id');
                mensagensStore.createIndex('remetente_id', 'remetente_id');
                mensagensStore.createIndex('destinatario_id', 'destinatario_id');
            }

            if (!database.objectStoreNames.contains('candidaturas')) {
                const candidaturasStore = database.createObjectStore('candidaturas', { keyPath: 'id', autoIncrement: true });
                candidaturasStore.createIndex('vaga_id', 'vaga_id');
                candidaturasStore.createIndex('usuario_id', 'usuario_id');
            }

            if (!database.objectStoreNames.contains('eventos')) {
                const eventosStore = database.createObjectStore('eventos', { keyPath: 'id', autoIncrement: true });
                eventosStore.createIndex('categoria', 'categoria');
                eventosStore.createIndex('destaque', 'destaque');
                eventosStore.createIndex('criado_por', 'criado_por');
            }

            if (!database.objectStoreNames.contains('inscricoes_eventos')) {
                const inscricoesStore = database.createObjectStore('inscricoes_eventos', { keyPath: 'id', autoIncrement: true });
                inscricoesStore.createIndex('evento_id', 'evento_id');
                inscricoesStore.createIndex('usuario_id', 'usuario_id');
                inscricoesStore.createIndex('evento_usuario', ['evento_id', 'usuario_id'], { unique: true });
            }
        };
    });
}

// Função auxiliar para hash de senha (simples para uso local)
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
}

// Função auxiliar para comparar senha
async function comparePassword(password, hash) {
    const passwordHash = await hashPassword(password);
    return passwordHash === hash;
}

// Operações CRUD genéricas
function dbGet(storeName, key) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function dbGetByIndex(storeName, indexName, value) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const index = store.index(indexName);
        const request = index.get(value);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function dbGetAll(storeName, indexName = null, value = null) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        let request;

        if (indexName && value !== null) {
            const index = store.index(indexName);
            request = index.getAll(value);
        } else {
            request = store.getAll();
        }

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function dbAdd(storeName, data) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.add(data);
        request.onsuccess = () => resolve({ id: request.result, changes: 1 });
        request.onerror = () => reject(request.error);
    });
}

function dbPut(storeName, data) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(data);
        request.onsuccess = () => resolve({ id: request.result, changes: 1 });
        request.onerror = () => reject(request.error);
    });
}

function dbUpdate(storeName, key, updates) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const getRequest = store.get(key);

        getRequest.onsuccess = () => {
            const data = getRequest.result;
            if (!data) {
                reject(new Error('Registro não encontrado'));
                return;
            }

            Object.assign(data, updates);
            const putRequest = store.put(data);
            putRequest.onsuccess = () => resolve({ id: key, changes: 1 });
            putRequest.onerror = () => reject(putRequest.error);
        };

        getRequest.onerror = () => reject(getRequest.error);
    });
}

function dbDelete(storeName, key) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(key);
        request.onsuccess = () => resolve({ id: key, changes: 1 });
        request.onerror = () => reject(request.error);
    });
}

async function ensureAdminUser() {
    const adminEmail = 'admin@unisantos.br';
    let adminUser = await dbGetByIndex('usuarios', 'email', adminEmail);

    if (!adminUser) {
        const adminPassword = await hashPassword('123456');
        const result = await dbAdd('usuarios', {
            nome: 'Administrador',
            email: adminEmail,
            senha: adminPassword,
            tipo: 'admin',
            is_admin: 1,
            status_conta: 'ativa',
            created_at: new Date().toISOString()
        });

        await dbAdd('perfis', {
            usuario_id: result.id,
            created_at: new Date().toISOString()
        });

        adminUser = await dbGet('usuarios', result.id);
    }

    return adminUser;
}

async function seedJobs(adminId) {
    const vagas = await dbGetAll('vagas');
    if (vagas.length > 0) {
        return;
    }

    const now = new Date().toISOString();
    const sampleJobs = [
        {
            titulo: 'Desenvolvedor Front-End',
            descricao: 'Atue no desenvolvimento de interfaces web modernas, colaborando com produto e design em uma squad remota.',
            empresa: 'Tech Corp',
            localizacao: 'Remoto',
            tipo_emprego: 'CLT',
            salario_min: 5000,
            salario_max: 8000,
            requisitos: 'React, JavaScript, CSS, consumo de APIs REST e boa comunicação.',
            criado_por: adminId,
            status: 'ativa',
            created_at: now
        },
        {
            titulo: 'Analista de dados',
            descricao: 'Responsável por transformar dados acadêmicos e institucionais em relatórios estratégicos para tomada de decisão.',
            empresa: 'Data Solutions',
            localizacao: 'São Paulo',
            tipo_emprego: 'Híbrido',
            salario_min: 4000,
            salario_max: 7000,
            requisitos: 'Python, SQL, Excel, dashboards e storytelling com dados.',
            criado_por: adminId,
            status: 'ativa',
            created_at: now
        }
    ];

    for (const vaga of sampleJobs) {
        await dbAdd('vagas', vaga);
    }
}

async function seedGroups(adminId) {
    const grupos = await dbGetAll('grupos');
    if (grupos.length > 0) {
        return;
    }

    const sampleGroups = [
        {
            nome: 'Alumni Network',
            descricao: 'Rede geral de networking para ex-alunos da universidade.',
            criado_por: adminId,
            created_at: new Date().toISOString()
        },
        {
            nome: 'CS Alumni',
            descricao: 'Comunidade dos ex-alunos de Ciências da Computação.',
            criado_por: adminId,
            created_at: new Date().toISOString()
        },
        {
            nome: 'Job Opportunities',
            descricao: 'Troca de oportunidades, indicações e mentorias de carreira.',
            criado_por: adminId,
            created_at: new Date().toISOString()
        }
    ];

    for (const grupo of sampleGroups) {
        const result = await dbAdd('grupos', grupo);
        await dbAdd('grupo_membros', {
            grupo_id: result.id,
            usuario_id: adminId,
            role: 'admin',
            joined_at: new Date().toISOString()
        });
    }
}

async function seedEvents(adminId) {
    const eventos = await dbGetAll('eventos');
    if (eventos.length > 0) {
        return;
    }

    const now = new Date().toISOString();
    const sampleEvents = [
        {
            titulo: 'Fórum Universitário de Liderança',
            descricao: 'Transforme seu diploma em uma carreira de impacto com uma tarde de conteúdo, conexões e acesso a mentores do mercado.',
            resumo: 'Evento especial com painéis, networking e convidados do ecossistema de inovação.',
            categoria: 'evento',
            data_evento: '2026-10-22T17:00:00',
            localizacao: 'Universidade Católica de Santos - Auditório Principal',
            link_url: 'https://www.unisantos.br',
            imagem_url: '',
            destaque: 1,
            criado_por: adminId,
            created_at: now
        },
        {
            titulo: 'Quero transformar meu diploma em carreira',
            descricao: 'Palestra prática com orientações para posicionamento profissional, currículo e networking para ex-alunos.',
            resumo: 'Mentoria coletiva com foco em currículo, LinkedIn e oportunidades.',
            categoria: 'palestra',
            data_evento: '2026-08-18T19:30:00',
            localizacao: 'Auditório Virtual Allumni',
            link_url: '',
            imagem_url: '',
            destaque: 0,
            criado_por: adminId,
            created_at: now
        },
        {
            titulo: 'Como se destacar em processos seletivos',
            descricao: 'Sessão de palestra e perguntas ao vivo sobre entrevistas, portfólio e construção de repertório profissional.',
            resumo: 'Estratégias para vagas de entrada, transição de carreira e networking.',
            categoria: 'palestra',
            data_evento: '2026-09-05T19:00:00',
            localizacao: 'Campus Dom Idílio',
            link_url: '',
            imagem_url: '',
            destaque: 0,
            criado_por: adminId,
            created_at: now
        }
    ];

    for (const evento of sampleEvents) {
        await dbAdd('eventos', evento);
    }
}

// Inicializar dados padrão
async function initDefaultData() {
    const adminUser = await ensureAdminUser();
    await seedJobs(adminUser.id);
    await seedGroups(adminUser.id);
    await seedEvents(adminUser.id);
}

// Exportar funções
window.initDB = initDB;
window.initDefaultData = initDefaultData;
window.dbGet = dbGet;
window.dbGetByIndex = dbGetByIndex;
window.dbGetAll = dbGetAll;
window.dbAdd = dbAdd;
window.dbPut = dbPut;
window.dbUpdate = dbUpdate;
window.dbDelete = dbDelete;
window.hashPassword = hashPassword;
window.comparePassword = comparePassword;
