const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'allumni.db');
const schemaPath = path.join(__dirname, 'schema.sql');

// Criar diretório se não existir
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Conectar ao banco de dados
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err.message);
        process.exit(1);
    }
    console.log('Conectado ao banco de dados SQLite.');
});

// Ler e executar schema
const schema = fs.readFileSync(schemaPath, 'utf8');

db.exec(schema, (err) => {
    if (err) {
        console.error('Erro ao executar schema:', err.message);
        db.close();
        process.exit(1);
    }
    console.log('Schema criado com sucesso!');
    
    // Inserir dados de exemplo
    insertSampleData();
});

function insertSampleData() {
    const bcrypt = require('bcrypt');
    
    // Hash para senha padrão "123456"
    const defaultPassword = bcrypt.hashSync('123456', 10);
    
    // Criar conta admin padrão
    db.run(
        `INSERT OR IGNORE INTO usuarios (nome, email, senha, tipo, is_admin, status_conta) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        ['Administrador', 'admin', defaultPassword, 'admin', 1, 'ativa'],
        function(err) {
            if (err) {
                console.error('Erro ao criar admin:', err.message);
            } else {
                console.log('Conta admin criada:');
                console.log('Email: admin');
                console.log('Senha: 123456');
            }
        }
    );
    
    // Inserir usuário de exemplo
    db.run(
        `INSERT OR IGNORE INTO usuarios (nome, email, senha, curso, ano_formatura) 
         VALUES (?, ?, ?, ?, ?)`,
        ['Mario Eduardo', 'testede.exemplo@blablabla.com', defaultPassword, 'Ciências da Computação', 2020],
        function(err) {
            if (err) {
                console.error('Erro ao inserir usuário:', err.message);
            } else {
                const userId = this.lastID;
                console.log('Usuário de exemplo criado com ID:', userId);
                
                // Criar perfil
                db.run(
                    `INSERT OR IGNORE INTO perfis (usuario_id) VALUES (?)`,
                    [userId],
                    (err) => {
                        if (err) console.error('Erro ao criar perfil:', err.message);
                    }
                );
                
                // Criar grupos de exemplo
                const grupos = [
                    ['Alumni Network', 'Rede geral de ex-alunos', userId],
                    ['CS Alumni', 'Ex-alunos de Ciências da Computação', userId],
                    ['Job Opportunities', 'Oportunidades de emprego', userId]
                ];
                
                grupos.forEach((grupo, index) => {
                    db.run(
                        `INSERT OR IGNORE INTO grupos (nome, descricao, criado_por) VALUES (?, ?, ?)`,
                        grupo,
                        function(err) {
                            if (!err && this.lastID) {
                                // Adicionar usuário como membro do grupo
                                db.run(
                                    `INSERT OR IGNORE INTO grupo_membros (grupo_id, usuario_id, role) VALUES (?, ?, ?)`,
                                    [this.lastID, userId, 'admin']
                                );
                            }
                        }
                    );
                });
                
                // Criar vagas de exemplo
                const vagas = [
                    ['Desenvolvedor Front-End', 'Desenvolvimento de interfaces web modernas', 'Tech Corp', 'Remoto', 'remoto', 5000, 8000, 'React, JavaScript, CSS'],
                    ['Analista de dados', 'Análise de dados e criação de relatórios', 'Data Solutions', 'São Paulo', 'hibrido', 4000, 7000, 'Python, SQL, Excel']
                ];
                
                vagas.forEach(vaga => {
                    db.run(
                        `INSERT OR IGNORE INTO vagas (titulo, descricao, empresa, localizacao, tipo_emprego, salario_min, salario_max, requisitos, criado_por) 
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [...vaga, userId]
                    );
                });
                
                console.log('Dados de exemplo inseridos com sucesso!');
                console.log('\nCredenciais de teste:');
                console.log('Email: testede.exemplo@blablabla.com');
                console.log('Senha: 123456');
            }
            
            db.close((err) => {
                if (err) {
                    console.error('Erro ao fechar banco de dados:', err.message);
                } else {
                    console.log('Banco de dados fechado.');
                }
            });
        }
    );
}

