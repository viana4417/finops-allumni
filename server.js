const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// Conectar ao banco de dados
const dbPath = path.join(__dirname, 'database', 'allumni.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err.message);
        process.exit(1);
    }
    console.log('Conectado ao banco de dados SQLite.');
});

// Helper para promises do SQLite
const dbRun = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve({ id: this.lastID, changes: this.changes });
        });
    });
};

const dbGet = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

const dbAll = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

// ==================== AUTENTICAÇÃO ====================

// Cadastro
app.post('/api/auth/cadastro', async (req, res) => {
    try {
        const { nome, email, senha, curso, ano_formatura } = req.body;
        
        if (!nome || !email || !senha) {
            return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
        }
        
        // Verificar se email já existe
        const existingUser = await dbGet('SELECT id FROM usuarios WHERE email = ?', [email]);
        if (existingUser) {
            return res.status(400).json({ error: 'Email já cadastrado' });
        }
        
        // Hash da senha
        const hashedPassword = await bcrypt.hash(senha, 10);
        
        // Criar usuário
        const result = await dbRun(
            'INSERT INTO usuarios (nome, email, senha, curso, ano_formatura) VALUES (?, ?, ?, ?, ?)',
            [nome, email, hashedPassword, curso || null, ano_formatura || null]
        );
        
        // Criar perfil vazio
        await dbRun('INSERT INTO perfis (usuario_id) VALUES (?)', [result.id]);
        
        res.json({ 
            success: true, 
            message: 'Usuário cadastrado com sucesso',
            userId: result.id 
        });
    } catch (error) {
        console.error('Erro no cadastro:', error);
        res.status(500).json({ error: 'Erro ao cadastrar usuário' });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, senha } = req.body;
        
        if (!email || !senha) {
            return res.status(400).json({ error: 'Email e senha são obrigatórios' });
        }
        
        // Buscar usuário
        const user = await dbGet(
            'SELECT id, nome, email, senha, curso, ano_formatura, tipo, is_admin, status_conta FROM usuarios WHERE email = ?',
            [email]
        );
        
        if (!user) {
            return res.status(401).json({ error: 'Email ou senha incorretos' });
        }
        
        // Verificar se conta está fechada
        if (user.status_conta === 'fechada') {
            return res.status(403).json({ error: 'Esta conta foi fechada. Entre em contato com o administrador.' });
        }
        
        // Verificar senha
        const validPassword = await bcrypt.compare(senha, user.senha);
        if (!validPassword) {
            return res.status(401).json({ error: 'Email ou senha incorretos' });
        }
        
        // Buscar perfil
        const perfil = await dbGet('SELECT * FROM perfis WHERE usuario_id = ?', [user.id]);
        
        // Remover senha da resposta
        delete user.senha;
        
        // Converter is_admin para boolean
        user.is_admin = user.is_admin === 1;
        
        res.json({ 
            success: true, 
            user: { ...user, perfil } 
        });
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ error: 'Erro ao fazer login' });
    }
});

// ==================== PERFIS ====================

// Buscar perfil do usuário
app.get('/api/perfil/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await dbGet(
            'SELECT id, nome, email, curso, ano_formatura, tipo FROM usuarios WHERE id = ?',
            [userId]
        );
        
        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        
        const perfil = await dbGet('SELECT * FROM perfis WHERE usuario_id = ?', [userId]);
        
        res.json({ user, perfil: perfil || {} });
    } catch (error) {
        console.error('Erro ao buscar perfil:', error);
        res.status(500).json({ error: 'Erro ao buscar perfil' });
    }
});

// Atualizar perfil
app.put('/api/perfil/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { nome, curso, ano_formatura, bio, linkedin_url, github_url, telefone, empresa_atual, cargo_atual } = req.body;
        
        // Atualizar usuário
        if (nome || curso || ano_formatura) {
            const updates = [];
            const values = [];
            
            if (nome) { updates.push('nome = ?'); values.push(nome); }
            if (curso) { updates.push('curso = ?'); values.push(curso); }
            if (ano_formatura) { updates.push('ano_formatura = ?'); values.push(ano_formatura); }
            updates.push('updated_at = CURRENT_TIMESTAMP');
            values.push(userId);
            
            await dbRun(
                `UPDATE usuarios SET ${updates.join(', ')} WHERE id = ?`,
                values
            );
        }
        
        // Atualizar perfil
        const perfilExists = await dbGet('SELECT id FROM perfis WHERE usuario_id = ?', [userId]);
        
        if (perfilExists) {
            const updates = [];
            const values = [];
            
            if (bio !== undefined) { updates.push('bio = ?'); values.push(bio); }
            if (linkedin_url !== undefined) { updates.push('linkedin_url = ?'); values.push(linkedin_url); }
            if (github_url !== undefined) { updates.push('github_url = ?'); values.push(github_url); }
            if (telefone !== undefined) { updates.push('telefone = ?'); values.push(telefone); }
            if (empresa_atual !== undefined) { updates.push('empresa_atual = ?'); values.push(empresa_atual); }
            if (cargo_atual !== undefined) { updates.push('cargo_atual = ?'); values.push(cargo_atual); }
            
            if (updates.length > 0) {
                values.push(userId);
                await dbRun(
                    `UPDATE perfis SET ${updates.join(', ')} WHERE usuario_id = ?`,
                    values
                );
            }
        } else {
            await dbRun(
                'INSERT INTO perfis (usuario_id, bio, linkedin_url, github_url, telefone, empresa_atual, cargo_atual) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [userId, bio || null, linkedin_url || null, github_url || null, telefone || null, empresa_atual || null, cargo_atual || null]
            );
        }
        
        res.json({ success: true, message: 'Perfil atualizado com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
        res.status(500).json({ error: 'Erro ao atualizar perfil' });
    }
});

// ==================== VAGAS ====================

// Listar todas as vagas
app.get('/api/vagas', async (req, res) => {
    try {
        const vagas = await dbAll(
            `SELECT v.*, u.nome as criador_nome 
             FROM vagas v 
             LEFT JOIN usuarios u ON v.criado_por = u.id 
             WHERE v.status = 'ativa' 
             ORDER BY v.created_at DESC`
        );
        res.json(vagas);
    } catch (error) {
        console.error('Erro ao listar vagas:', error);
        res.status(500).json({ error: 'Erro ao listar vagas' });
    }
});

// Buscar vaga específica
app.get('/api/vagas/:id', async (req, res) => {
    try {
        const vaga = await dbGet(
            `SELECT v.*, u.nome as criador_nome 
             FROM vagas v 
             LEFT JOIN usuarios u ON v.criado_por = u.id 
             WHERE v.id = ?`,
            [req.params.id]
        );
        
        if (!vaga) {
            return res.status(404).json({ error: 'Vaga não encontrada' });
        }
        
        res.json(vaga);
    } catch (error) {
        console.error('Erro ao buscar vaga:', error);
        res.status(500).json({ error: 'Erro ao buscar vaga' });
    }
});

// Criar vaga
app.post('/api/vagas', async (req, res) => {
    try {
        const { titulo, descricao, empresa, localizacao, tipo_emprego, salario_min, salario_max, requisitos, criado_por } = req.body;
        
        if (!titulo || !empresa || !criado_por) {
            return res.status(400).json({ error: 'Título, empresa e criador são obrigatórios' });
        }
        
        const result = await dbRun(
            `INSERT INTO vagas (titulo, descricao, empresa, localizacao, tipo_emprego, salario_min, salario_max, requisitos, criado_por) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [titulo, descricao || null, empresa, localizacao || null, tipo_emprego || null, salario_min || null, salario_max || null, requisitos || null, criado_por]
        );
        
        res.json({ success: true, vagaId: result.id });
    } catch (error) {
        console.error('Erro ao criar vaga:', error);
        res.status(500).json({ error: 'Erro ao criar vaga' });
    }
});

// Candidatar-se a vaga
app.post('/api/vagas/:id/candidatar', async (req, res) => {
    try {
        const { id } = req.params;
        const { usuario_id, mensagem } = req.body;
        
        if (!usuario_id) {
            return res.status(400).json({ error: 'ID do usuário é obrigatório' });
        }
        
        const result = await dbRun(
            'INSERT INTO candidaturas (vaga_id, usuario_id, mensagem) VALUES (?, ?, ?)',
            [id, usuario_id, mensagem || null]
        );
        
        res.json({ success: true, candidaturaId: result.id });
    } catch (error) {
        if (error.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Você já se candidatou a esta vaga' });
        }
        console.error('Erro ao candidatar-se:', error);
        res.status(500).json({ error: 'Erro ao candidatar-se' });
    }
});

// ==================== GRUPOS ====================

// Listar todos os grupos
app.get('/api/grupos', async (req, res) => {
    try {
        const grupos = await dbAll(
            `SELECT g.*, u.nome as criador_nome,
             (SELECT COUNT(*) FROM grupo_membros WHERE grupo_id = g.id) as total_membros
             FROM grupos g 
             LEFT JOIN usuarios u ON g.criado_por = u.id 
             ORDER BY g.created_at DESC`
        );
        res.json(grupos);
    } catch (error) {
        console.error('Erro ao listar grupos:', error);
        res.status(500).json({ error: 'Erro ao listar grupos' });
    }
});

// Buscar grupos do usuário
app.get('/api/grupos/usuario/:userId', async (req, res) => {
    try {
        const grupos = await dbAll(
            `SELECT g.*, gm.role, u.nome as criador_nome,
             (SELECT COUNT(*) FROM grupo_membros WHERE grupo_id = g.id) as total_membros
             FROM grupos g
             INNER JOIN grupo_membros gm ON g.id = gm.grupo_id
             LEFT JOIN usuarios u ON g.criado_por = u.id
             WHERE gm.usuario_id = ?
             ORDER BY g.nome`,
            [req.params.userId]
        );
        res.json(grupos);
    } catch (error) {
        console.error('Erro ao buscar grupos do usuário:', error);
        res.status(500).json({ error: 'Erro ao buscar grupos' });
    }
});

// Criar grupo
app.post('/api/grupos', async (req, res) => {
    try {
        const { nome, descricao, criado_por, tipo } = req.body;
        
        if (!nome || !criado_por) {
            return res.status(400).json({ error: 'Nome e criador são obrigatórios' });
        }
        
        const result = await dbRun(
            'INSERT INTO grupos (nome, descricao, criado_por, tipo) VALUES (?, ?, ?, ?)',
            [nome, descricao || null, criado_por, tipo || 'publico']
        );
        
        // Adicionar criador como admin
        await dbRun(
            'INSERT INTO grupo_membros (grupo_id, usuario_id, role) VALUES (?, ?, ?)',
            [result.id, criado_por, 'admin']
        );
        
        res.json({ success: true, grupoId: result.id });
    } catch (error) {
        console.error('Erro ao criar grupo:', error);
        res.status(500).json({ error: 'Erro ao criar grupo' });
    }
});

// Entrar em grupo
app.post('/api/grupos/:id/entrar', async (req, res) => {
    try {
        const { id } = req.params;
        const { usuario_id } = req.body;
        
        if (!usuario_id) {
            return res.status(400).json({ error: 'ID do usuário é obrigatório' });
        }
        
        const result = await dbRun(
            'INSERT INTO grupo_membros (grupo_id, usuario_id) VALUES (?, ?)',
            [id, usuario_id]
        );
        
        res.json({ success: true, membroId: result.id });
    } catch (error) {
        if (error.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Você já é membro deste grupo' });
        }
        console.error('Erro ao entrar no grupo:', error);
        res.status(500).json({ error: 'Erro ao entrar no grupo' });
    }
});

// ==================== CHAT ====================

// Buscar mensagens de um chat privado
app.get('/api/chat/privado/:userId1/:userId2', async (req, res) => {
    try {
        const { userId1, userId2 } = req.params;
        const mensagens = await dbAll(
            `SELECT m.*, u.nome as remetente_nome 
             FROM mensagens m
             INNER JOIN usuarios u ON m.remetente_id = u.id
             WHERE (m.remetente_id = ? AND m.destinatario_id = ?) 
             OR (m.remetente_id = ? AND m.destinatario_id = ?)
             ORDER BY m.created_at ASC`,
            [userId1, userId2, userId2, userId1]
        );
        res.json(mensagens);
    } catch (error) {
        console.error('Erro ao buscar mensagens:', error);
        res.status(500).json({ error: 'Erro ao buscar mensagens' });
    }
});

// Buscar mensagens de um grupo
app.get('/api/chat/grupo/:grupoId', async (req, res) => {
    try {
        const mensagens = await dbAll(
            `SELECT m.id, m.remetente_id, m.destinatario_id, m.grupo_id, m.conteudo, m.tipo, m.arquivo_url, m.created_at, u.nome as remetente_nome 
             FROM mensagens m
             INNER JOIN usuarios u ON m.remetente_id = u.id
             WHERE m.grupo_id = ?
             ORDER BY m.created_at ASC`,
            [req.params.grupoId]
        );
        
        // Log para debug
        console.log(`Carregadas ${mensagens.length} mensagens do grupo ${req.params.grupoId}`);
        mensagens.forEach(msg => {
            if (msg.tipo === 'audio') {
                console.log('Mensagem de áudio encontrada:', { id: msg.id, tipo: msg.tipo, tem_arquivo: !!msg.arquivo_url });
            }
        });
        
        res.json(mensagens);
    } catch (error) {
        console.error('Erro ao buscar mensagens do grupo:', error);
        res.status(500).json({ error: 'Erro ao buscar mensagens' });
    }
});

// Enviar mensagem
app.post('/api/chat/enviar', async (req, res) => {
    try {
        const { remetente_id, destinatario_id, grupo_id, conteudo, tipo, arquivo_url } = req.body;
        
        if (!remetente_id) {
            return res.status(400).json({ error: 'Remetente é obrigatório' });
        }
        
        if (!destinatario_id && !grupo_id) {
            return res.status(400).json({ error: 'Destinatário ou grupo é obrigatório' });
        }
        
        // Se não tem conteúdo mas tem arquivo, usar conteúdo padrão
        const conteudoFinal = conteudo || (arquivo_url && tipo === 'imagem' ? '📷 Imagem' : arquivo_url && tipo === 'audio' ? '🎤 Áudio' : '');
        
        // Determinar tipo se não foi fornecido mas tem arquivo
        let tipoFinal = tipo || 'texto';
        if (!tipo && arquivo_url) {
            if (arquivo_url.startsWith('data:image/')) {
                tipoFinal = 'imagem';
            } else if (arquivo_url.startsWith('data:audio/')) {
                tipoFinal = 'audio';
            }
        }
        
        console.log('Salvando mensagem:', { tipo: tipoFinal, tem_arquivo: !!arquivo_url, conteudo: conteudoFinal });
        
        const result = await dbRun(
            'INSERT INTO mensagens (remetente_id, destinatario_id, grupo_id, conteudo, tipo, arquivo_url) VALUES (?, ?, ?, ?, ?, ?)',
            [remetente_id, destinatario_id || null, grupo_id || null, conteudoFinal, tipoFinal, arquivo_url || null]
        );
        
        res.json({ success: true, mensagemId: result.id });
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        res.status(500).json({ error: 'Erro ao enviar mensagem' });
    }
});

// ==================== MEMBROS DE GRUPO ====================

// Listar membros de um grupo
app.get('/api/grupos/:id/membros', async (req, res) => {
    try {
        const membros = await dbAll(
            `SELECT u.id, u.nome, u.email, u.curso, gm.role, gm.joined_at
             FROM grupo_membros gm
             INNER JOIN usuarios u ON gm.usuario_id = u.id
             WHERE gm.grupo_id = ?
             ORDER BY gm.joined_at ASC`,
            [req.params.id]
        );
        res.json(membros);
    } catch (error) {
        console.error('Erro ao listar membros:', error);
        res.status(500).json({ error: 'Erro ao listar membros' });
    }
});

// ==================== ADMINISTRAÇÃO ====================

// Verificar se usuário é admin
const verificarAdmin = async (userId) => {
    const user = await dbGet('SELECT is_admin FROM usuarios WHERE id = ?', [userId]);
    return user && user.is_admin === 1;
};

// Listar todos os usuários (apenas admin)
app.get('/api/admin/usuarios', async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) {
            return res.status(400).json({ error: 'ID do usuário é obrigatório' });
        }
        
        const isAdmin = await verificarAdmin(userId);
        if (!isAdmin) {
            return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
        }
        
        const usuarios = await dbAll(
            `SELECT id, nome, email, tipo, is_admin, status_conta, created_at 
             FROM usuarios 
             ORDER BY created_at DESC`
        );
        
        res.json(usuarios);
    } catch (error) {
        console.error('Erro ao listar usuários:', error);
        res.status(500).json({ error: 'Erro ao listar usuários' });
    }
});

// Fechar conta (apenas admin)
app.put('/api/admin/usuarios/:id/fechar', async (req, res) => {
    try {
        const { adminId } = req.body;
        if (!adminId) {
            return res.status(400).json({ error: 'ID do administrador é obrigatório' });
        }
        
        const isAdmin = await verificarAdmin(adminId);
        if (!isAdmin) {
            return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
        }
        
        await dbRun(
            'UPDATE usuarios SET status_conta = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            ['fechada', req.params.id]
        );
        
        res.json({ success: true, message: 'Conta fechada com sucesso' });
    } catch (error) {
        console.error('Erro ao fechar conta:', error);
        res.status(500).json({ error: 'Erro ao fechar conta' });
    }
});

// Reabrir conta (apenas admin)
app.put('/api/admin/usuarios/:id/reabrir', async (req, res) => {
    try {
        const { adminId } = req.body;
        if (!adminId) {
            return res.status(400).json({ error: 'ID do administrador é obrigatório' });
        }
        
        const isAdmin = await verificarAdmin(adminId);
        if (!isAdmin) {
            return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
        }
        
        await dbRun(
            'UPDATE usuarios SET status_conta = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            ['ativa', req.params.id]
        );
        
        res.json({ success: true, message: 'Conta reaberta com sucesso' });
    } catch (error) {
        console.error('Erro ao reabrir conta:', error);
        res.status(500).json({ error: 'Erro ao reabrir conta' });
    }
});

// Tornar usuário admin (apenas admin)
app.put('/api/admin/usuarios/:id/tornar-admin', async (req, res) => {
    try {
        const { adminId } = req.body;
        if (!adminId) {
            return res.status(400).json({ error: 'ID do administrador é obrigatório' });
        }
        
        const isAdmin = await verificarAdmin(adminId);
        if (!isAdmin) {
            return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
        }
        
        await dbRun(
            'UPDATE usuarios SET is_admin = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [req.params.id]
        );
        
        res.json({ success: true, message: 'Usuário promovido a administrador' });
    } catch (error) {
        console.error('Erro ao promover usuário:', error);
        res.status(500).json({ error: 'Erro ao promover usuário' });
    }
});

// Remover admin (apenas admin)
app.put('/api/admin/usuarios/:id/remover-admin', async (req, res) => {
    try {
        const { adminId } = req.body;
        if (!adminId) {
            return res.status(400).json({ error: 'ID do administrador é obrigatório' });
        }
        
        const isAdmin = await verificarAdmin(adminId);
        if (!isAdmin) {
            return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
        }
        
        // Não permitir remover admin de si mesmo
        if (parseInt(req.params.id) === parseInt(adminId)) {
            return res.status(400).json({ error: 'Você não pode remover seus próprios privilégios de admin' });
        }
        
        await dbRun(
            'UPDATE usuarios SET is_admin = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [req.params.id]
        );
        
        res.json({ success: true, message: 'Privilégios de administrador removidos' });
    } catch (error) {
        console.error('Erro ao remover admin:', error);
        res.status(500).json({ error: 'Erro ao remover admin' });
    }
});

// ==================== ATUALIZAR PERFIL COM FOTO ====================

// Atualizar perfil (incluindo foto)
app.put('/api/perfil/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { nome, curso, ano_formatura, bio, linkedin_url, github_url, telefone, empresa_atual, cargo_atual, foto_perfil } = req.body;
        
        // Atualizar usuário
        if (nome || curso || ano_formatura) {
            const updates = [];
            const values = [];
            
            if (nome) { updates.push('nome = ?'); values.push(nome); }
            if (curso) { updates.push('curso = ?'); values.push(curso); }
            if (ano_formatura) { updates.push('ano_formatura = ?'); values.push(ano_formatura); }
            updates.push('updated_at = CURRENT_TIMESTAMP');
            values.push(userId);
            
            await dbRun(
                `UPDATE usuarios SET ${updates.join(', ')} WHERE id = ?`,
                values
            );
        }
        
        // Atualizar perfil
        const perfilExists = await dbGet('SELECT id FROM perfis WHERE usuario_id = ?', [userId]);
        
        if (perfilExists) {
            const updates = [];
            const values = [];
            
            if (bio !== undefined) { updates.push('bio = ?'); values.push(bio); }
            if (linkedin_url !== undefined) { updates.push('linkedin_url = ?'); values.push(linkedin_url); }
            if (github_url !== undefined) { updates.push('github_url = ?'); values.push(github_url); }
            if (telefone !== undefined) { updates.push('telefone = ?'); values.push(telefone); }
            if (empresa_atual !== undefined) { updates.push('empresa_atual = ?'); values.push(empresa_atual); }
            if (cargo_atual !== undefined) { updates.push('cargo_atual = ?'); values.push(cargo_atual); }
            if (foto_perfil !== undefined) { updates.push('foto_perfil = ?'); values.push(foto_perfil); }
            
            if (updates.length > 0) {
                values.push(userId);
                await dbRun(
                    `UPDATE perfis SET ${updates.join(', ')} WHERE usuario_id = ?`,
                    values
                );
            }
        } else {
            await dbRun(
                'INSERT INTO perfis (usuario_id, bio, linkedin_url, github_url, telefone, empresa_atual, cargo_atual, foto_perfil) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [userId, bio || null, linkedin_url || null, github_url || null, telefone || null, empresa_atual || null, cargo_atual || null, foto_perfil || null]
            );
        }
        
        res.json({ success: true, message: 'Perfil atualizado com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
        res.status(500).json({ error: 'Erro ao atualizar perfil' });
    }
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Acesse: http://localhost:${PORT}`);
});

// Fechar banco ao encerrar
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('Erro ao fechar banco de dados:', err.message);
        } else {
            console.log('Banco de dados fechado.');
        }
        process.exit(0);
    });
});

