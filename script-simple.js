// Versão simplificada usando IndexedDB (funciona sem servidor)

// Estado do formulário
let currentMode = 'login';

// Função para alternar entre Cadastro e Login
function toggleMode() {
    const formTitle = document.getElementById('formTitle');
    const submitButton = document.getElementById('submitButton');
    const toggleButton = document.getElementById('toggleButton');
    const nomeGroup = document.getElementById('nomeGroup');
    const nomeInput = document.getElementById('nome');
    
    if (!formTitle || !submitButton || !toggleButton || !nomeGroup) {
        console.error('Elementos não encontrados!');
        return;
    }
    
    if (currentMode === 'cadastro') {
        // Mudar para modo Login
        currentMode = 'login';
        formTitle.textContent = 'Login';
        submitButton.textContent = 'Entrar';
        toggleButton.textContent = 'Não tenho uma conta. Criar cadastro';
        
        // Ocultar campo Nome
        nomeGroup.classList.add('hidden');
        if (nomeInput) {
            nomeInput.removeAttribute('required');
            nomeInput.value = '';
        }
    } else {
        // Mudar para modo Cadastro
        currentMode = 'cadastro';
        formTitle.textContent = 'Cadastro';
        submitButton.textContent = 'Criar conta';
        toggleButton.textContent = 'Já tenho uma conta. Fazer login';
        
        // Mostrar campo Nome
        nomeGroup.classList.remove('hidden');
        if (nomeInput) {
            nomeInput.setAttribute('required', 'required');
        }
    }
    
    console.log('Modo alterado para:', currentMode);
}

// Função para validar formato de email
function validarEmail(email) {
    // Regex para validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Função para mostrar erro
function mostrarErro(mensagem) {
    const authForm = document.getElementById('authForm');
    if (!authForm) return;
    
    const erroAnterior = document.querySelector('.erro-mensagem');
    if (erroAnterior) {
        erroAnterior.remove();
    }
    
    const erroDiv = document.createElement('div');
    erroDiv.className = 'erro-mensagem';
    erroDiv.style.cssText = 'color: #ff4444; background: #ffe0e0; padding: 12px; border-radius: 8px; margin-top: 16px; text-align: center; white-space: pre-line; font-size: 14px;';
    
    // Converter quebras de linha em <br>
    const linhas = mensagem.split('\n');
    linhas.forEach((linha, index) => {
        erroDiv.appendChild(document.createTextNode(linha));
        if (index < linhas.length - 1) {
            erroDiv.appendChild(document.createElement('br'));
        }
    });
    
    authForm.appendChild(erroDiv);
    
    setTimeout(() => {
        erroDiv.remove();
    }, 10000);
}

// Função para cadastrar usando IndexedDB
async function cadastrarUsuario(dados) {
    const { nome, email, senha, curso, ano_formatura } = dados;
    
    if (!nome || !email || !senha) {
        throw new Error('Nome, email e senha são obrigatórios');
    }
    
    // Validar formato de email
    if (!validarEmail(email)) {
        throw new Error('Email inválido. Por favor, insira um email válido.');
    }
    
    // Verificar se email já existe
    const existingUser = await dbGetByIndex('usuarios', 'email', email);
    if (existingUser) {
        throw new Error('Email já cadastrado');
    }
    
    // Hash da senha
    const hashedPassword = await hashPassword(senha);
    
    // Criar usuário
    const user = {
        nome,
        email,
        senha: hashedPassword,
        curso: curso || null,
        ano_formatura: ano_formatura || null,
        tipo: 'aluno',
        is_admin: 0,
        status_conta: 'ativa',
        created_at: new Date().toISOString()
    };
    
    const result = await dbAdd('usuarios', user);
    
    // Criar perfil vazio
    await dbAdd('perfis', {
        usuario_id: result.id,
        created_at: new Date().toISOString()
    });
    
    return { 
        success: true, 
        message: 'Usuário cadastrado com sucesso',
        userId: result.id 
    };
}

// Função para fazer login usando IndexedDB
async function fazerLogin(email, senha) {
    if (!email || !senha) {
        throw new Error('Email e senha são obrigatórios');
    }
    
    // Buscar usuário
    const user = await dbGetByIndex('usuarios', 'email', email);
    
    if (!user) {
        throw new Error('Email ou senha incorretos');
    }
    
    // Verificar senha
    const validPassword = await comparePassword(senha, user.senha);
    if (!validPassword) {
        throw new Error('Email ou senha incorretos');
    }
    
    // Buscar perfil
    const perfil = await dbGetByIndex('perfis', 'usuario_id', user.id);
    
    // Remover senha da resposta
    const { senha: _, ...userSafe } = user;
    
    // Converter is_admin para boolean
    userSafe.is_admin = userSafe.is_admin === 1;
    
    return { 
        success: true, 
        user: { ...userSafe, perfil: perfil || {} } 
    };
}

// Função para salvar usuário logado
function salvarUsuarioLogado(usuario) {
    localStorage.setItem('usuarioLogado', JSON.stringify(usuario));
}

// Função para lidar com submit
async function handleSubmit(e) {
    e.preventDefault();
    
    const emailInput = document.getElementById('email');
    const senhaInput = document.getElementById('senha');
    const nomeInput = document.getElementById('nome');
    const submitButton = document.getElementById('submitButton');
    
    if (!emailInput || !senhaInput || !submitButton) {
        mostrarErro('Erro: elementos do formulário não encontrados.');
        return;
    }
    
    const email = emailInput.value.trim();
    const senha = senhaInput.value;
    
    if (!email || !senha) {
        mostrarErro('Por favor, preencha email e senha.');
        return;
    }
    
    // Validar formato de email
    if (!validarEmail(email)) {
        mostrarErro('Por favor, insira um email válido.\nExemplo: usuario@exemplo.com');
        return;
    }
    
    if (currentMode === 'cadastro') {
        const nome = nomeInput ? nomeInput.value.trim() : '';
        if (!nome) {
            mostrarErro('Por favor, preencha todos os campos.');
            return;
        }
    }
    
    // Desabilitar botão
    submitButton.disabled = true;
    const textoOriginal = submitButton.textContent;
    submitButton.textContent = currentMode === 'cadastro' ? 'Criando conta...' : 'Entrando...';
    
    try {
        if (currentMode === 'cadastro') {
            const dados = {
                nome: nomeInput.value.trim(),
                email: email,
                senha: senha
            };
            
            const resultado = await cadastrarUsuario(dados);
            
            if (resultado.success) {
                const loginResult = await fazerLogin(dados.email, dados.senha);
                if (loginResult.success) {
                    salvarUsuarioLogado(loginResult.user);
                    // Redirecionar para editar perfil após cadastro
                    window.location.href = 'editar-perfil.html';
                }
            }
        } else {
            const resultado = await fazerLogin(email, senha);
            
            if (resultado.success) {
                salvarUsuarioLogado(resultado.user);
                window.location.href = 'home.html';
            }
        }
    } catch (error) {
        console.error('Erro:', error);
        mostrarErro(error.message || 'Erro ao processar requisição.');
        submitButton.disabled = false;
        submitButton.textContent = textoOriginal;
    }
}

// Inicializar banco de dados e depois inicializar página
async function init() {
    try {
        // Inicializar banco de dados
        await initDB();
        await initDefaultData();
        console.log('Banco de dados inicializado');
        
        // Inicializar página
        const toggleButton = document.getElementById('toggleButton');
        const submitButton = document.getElementById('submitButton');
        
        if (toggleButton) {
            toggleButton.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                toggleMode();
            });
        }
        
        if (submitButton) {
            submitButton.addEventListener('click', handleSubmit);
        }
        
        console.log('Página inicializada');
    } catch (error) {
        console.error('Erro ao inicializar:', error);
        mostrarErro('Erro ao inicializar aplicação: ' + error.message);
    }
}

// Inicializar quando DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
