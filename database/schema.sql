-- Schema do banco de dados Allumni

-- Tabela de Usuários
CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    senha TEXT NOT NULL,
    curso TEXT,
    ano_formatura INTEGER,
    tipo TEXT DEFAULT 'ex_estudante', -- 'ex_estudante', 'empregador', 'admin'
    is_admin INTEGER DEFAULT 0, -- 0 = não admin, 1 = admin
    status_conta TEXT DEFAULT 'ativa', -- 'ativa', 'fechada'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Perfis (informações adicionais do usuário)
CREATE TABLE IF NOT EXISTS perfis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER UNIQUE NOT NULL,
    bio TEXT,
    linkedin_url TEXT,
    github_url TEXT,
    telefone TEXT,
    foto_url TEXT,
    foto_perfil TEXT, -- Base64 ou caminho da foto
    empresa_atual TEXT,
    cargo_atual TEXT,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Tabela de Vagas
CREATE TABLE IF NOT EXISTS vagas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT NOT NULL,
    descricao TEXT,
    empresa TEXT NOT NULL,
    localizacao TEXT,
    tipo_emprego TEXT, -- 'presencial', 'remoto', 'hibrido'
    salario_min REAL,
    salario_max REAL,
    requisitos TEXT,
    criado_por INTEGER, -- ID do usuário que criou a vaga
    status TEXT DEFAULT 'ativa', -- 'ativa', 'encerrada', 'preenchida'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (criado_por) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- Tabela de Candidaturas
CREATE TABLE IF NOT EXISTS candidaturas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vaga_id INTEGER NOT NULL,
    usuario_id INTEGER NOT NULL,
    status TEXT DEFAULT 'pendente', -- 'pendente', 'aceita', 'rejeitada'
    mensagem TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vaga_id) REFERENCES vagas(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    UNIQUE(vaga_id, usuario_id)
);

-- Tabela de Grupos
CREATE TABLE IF NOT EXISTS grupos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    descricao TEXT,
    criado_por INTEGER NOT NULL,
    tipo TEXT DEFAULT 'publico', -- 'publico', 'privado'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (criado_por) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Tabela de Membros de Grupos
CREATE TABLE IF NOT EXISTS grupo_membros (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    grupo_id INTEGER NOT NULL,
    usuario_id INTEGER NOT NULL,
    role TEXT DEFAULT 'membro', -- 'admin', 'moderador', 'membro'
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    UNIQUE(grupo_id, usuario_id)
);

-- Tabela de Mensagens de Chat (sistema de chat geral)
CREATE TABLE IF NOT EXISTS mensagens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    remetente_id INTEGER NOT NULL,
    destinatario_id INTEGER, -- NULL se for mensagem de grupo
    grupo_id INTEGER, -- NULL se for mensagem privada
    conteudo TEXT NOT NULL,
    tipo TEXT DEFAULT 'texto', -- 'texto', 'imagem', 'audio', 'arquivo'
    arquivo_url TEXT, -- URL ou base64 do arquivo (imagem/audio)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (remetente_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (destinatario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE,
    CHECK((destinatario_id IS NOT NULL AND grupo_id IS NULL) OR (destinatario_id IS NULL AND grupo_id IS NOT NULL))
);

-- Tabela de Conexões/Amizades
CREATE TABLE IF NOT EXISTS conexoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario1_id INTEGER NOT NULL,
    usuario2_id INTEGER NOT NULL,
    status TEXT DEFAULT 'pendente', -- 'pendente', 'aceita', 'bloqueada'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario1_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario2_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    UNIQUE(usuario1_id, usuario2_id),
    CHECK(usuario1_id != usuario2_id)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_perfis_usuario_id ON perfis(usuario_id);
CREATE INDEX IF NOT EXISTS idx_vagas_criado_por ON vagas(criado_por);
CREATE INDEX IF NOT EXISTS idx_candidaturas_vaga_id ON candidaturas(vaga_id);
CREATE INDEX IF NOT EXISTS idx_candidaturas_usuario_id ON candidaturas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_grupo_membros_grupo_id ON grupo_membros(grupo_id);
CREATE INDEX IF NOT EXISTS idx_grupo_membros_usuario_id ON grupo_membros(usuario_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_remetente ON mensagens(remetente_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_destinatario ON mensagens(destinatario_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_grupo ON mensagens(grupo_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_created_at ON mensagens(created_at);

