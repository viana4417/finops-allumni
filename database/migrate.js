// Script de migração para adicionar campos faltantes

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'allumni.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err.message);
        process.exit(1);
    }
    console.log('Conectado ao banco de dados para migração.');
});

// Verificar e adicionar colunas se não existirem
db.serialize(() => {
    console.log('Iniciando migração do banco de dados...\n');
    
    // Função auxiliar para adicionar coluna
    function addColumn(table, column, definition, callback) {
        db.all(`PRAGMA table_info(${table})`, (err, columns) => {
            if (err) {
                console.error(`Erro ao verificar ${table}:`, err.message);
                callback(err);
                return;
            }
            
            const columnExists = columns.some(col => col.name === column);
            if (columnExists) {
                console.log(`✓ Coluna ${column} já existe em ${table}`);
                callback(null);
            } else {
                db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`, (err) => {
                    if (err) {
                        console.error(`Erro ao adicionar ${column} em ${table}:`, err.message);
                        callback(err);
                    } else {
                        console.log(`✓ Coluna ${column} adicionada à tabela ${table}`);
                        callback(null);
                    }
                });
            }
        });
    }
    
    // Adicionar colunas uma por uma
    addColumn('mensagens', 'arquivo_url', 'TEXT', () => {
        addColumn('usuarios', 'is_admin', 'INTEGER DEFAULT 0', () => {
            addColumn('usuarios', 'status_conta', "TEXT DEFAULT 'ativa'", () => {
                addColumn('perfis', 'foto_perfil', 'TEXT', () => {
                    // Criar conta admin se não existir
                    const bcrypt = require('bcrypt');
                    const adminPassword = bcrypt.hashSync('123456', 10);
                    
                    db.run(
                        `INSERT OR IGNORE INTO usuarios (nome, email, senha, tipo, is_admin, status_conta) 
                         VALUES (?, ?, ?, ?, ?, ?)`,
                        ['Administrador', 'admin', adminPassword, 'admin', 1, 'ativa'],
                        function(err) {
                            if (err) {
                                console.error('Erro ao criar admin:', err.message);
                            } else if (this.changes > 0) {
                                console.log('✓ Conta admin criada (email: admin, senha: 123456)');
                            } else {
                                console.log('✓ Conta admin já existe');
                            }
                            
                            db.close((err) => {
                                if (err) {
                                    console.error('Erro ao fechar banco:', err.message);
                                } else {
                                    console.log('\n✅ Migração concluída com sucesso!');
                                    console.log('Reinicie o servidor para aplicar as mudanças.');
                                }
                            });
                        }
                    );
                });
            });
        });
    });
});
