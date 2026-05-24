// Aguardar DOM estar pronto
document.addEventListener('DOMContentLoaded', function() {
    initApp();
});

// Importar funções da API
let cadastrarUsuario, fazerLogin, salvarUsuarioLogado;

// Tentar importar módulo, com fallback
async function loadAPI() {
    try {
        const apiModule = await import('./api.js');
        cadastrarUsuario = apiModule.cadastrarUsuario;
        fazerLogin = apiModule.fazerLogin;
        salvarUsuarioLogado = apiModule.salvarUsuarioLogado;
    } catch (error) {
        console.error('Erro ao carregar módulo API:', error);
        // Fallback - funções vazias que mostrarão erro
        cadastrarUsuario = async () => { throw new Error('API não carregada. Execute: npm start'); };
        fazerLogin = async () => { throw new Error('API não carregada. Execute: npm start'); };
        salvarUsuarioLogado = () => {};
    }
}

// Estado do formulário: 'cadastro' ou 'login'
let currentMode = 'cadastro';

// Variáveis globais para elementos
let formTitle, submitButton, toggleButton, authForm, nomeGroup, nomeInput, emailInput, senhaInput;

function initApp() {
    // Carregar API
    loadAPI();
    
    // Elementos do DOM
    formTitle = document.getElementById('formTitle');
    submitButton = document.getElementById('submitButton');
    toggleButton = document.getElementById('toggleButton');
    authForm = document.getElementById('authForm');
    nomeGroup = document.getElementById('nomeGroup');
    nomeInput = document.getElementById('nome');
    emailInput = document.getElementById('email');
    senhaInput = document.getElementById('senha');
    
    // Verificar se todos os elementos foram encontrados
    if (!formTitle || !submitButton || !toggleButton || !authForm || !nomeGroup || !nomeInput || !emailInput || !senhaInput) {
        console.error('Erro: Alguns elementos do formulário não foram encontrados.');
        console.log('Elementos encontrados:', {
            formTitle: !!formTitle,
            submitButton: !!submitButton,
            toggleButton: !!toggleButton,
            authForm: !!authForm,
            nomeGroup: !!nomeGroup,
            nomeInput: !!nomeInput,
            emailInput: !!emailInput,
            senhaInput: !!senhaInput
        });
        return;
    }
    
    // Adicionar event listeners
    setupEventListeners();
}

// Função para alternar entre Cadastro e Login
function toggleMode() {
    if (currentMode === 'cadastro') {
        // Mudar para modo Login
        currentMode = 'login';
        formTitle.textContent = 'Login';
        submitButton.textContent = 'Entrar';
        toggleButton.textContent = 'Não tenho uma conta. Criar cadastro';
        
        // Ocultar campo Nome e remover validação
        nomeGroup.classList.add('hidden');
        nomeInput.removeAttribute('required');
        nomeInput.value = ''; // Limpar valor
    } else {
        // Mudar para modo Cadastro
        currentMode = 'cadastro';
        formTitle.textContent = 'Cadastro';
        submitButton.textContent = 'Criar conta';
        toggleButton.textContent = 'Já tenho uma conta. Fazer login';
        
        // Mostrar campo Nome e adicionar validação
        nomeGroup.classList.remove('hidden');
        nomeInput.setAttribute('required', 'required');
    }
    
    // Limpar mensagens de erro
    const erroAnterior = document.querySelector('.erro-mensagem');
    if (erroAnterior) {
        erroAnterior.remove();
    }
}

// Função para mostrar mensagem de erro
function mostrarErro(mensagem) {
    // Remover mensagem anterior se existir
    const erroAnterior = document.querySelector('.erro-mensagem');
    if (erroAnterior) {
        erroAnterior.remove();
    }
    
    // Criar nova mensagem de erro
    const erroDiv = document.createElement('div');
    erroDiv.className = 'erro-mensagem';
    erroDiv.style.cssText = 'color: #ff4444; background: #ffe0e0; padding: 12px; border-radius: 8px; margin-top: 16px; text-align: center;';
    erroDiv.textContent = mensagem;
    
    authForm.appendChild(erroDiv);
    
    // Remover após 5 segundos
    setTimeout(() => {
        erroDiv.remove();
    }, 5000);
}

function setupEventListeners() {
    // Event listener para toggle
    if (toggleButton) {
        toggleButton.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Toggle clicado. Modo atual:', currentMode);
            toggleMode();
            console.log('Novo modo:', currentMode);
        });
        
        // Teste adicional - garantir que o botão está clicável
        toggleButton.style.cursor = 'pointer';
        console.log('Event listener adicionado ao toggleButton');
    } else {
        console.error('toggleButton não encontrado!');
    }
    
    // Event listener para submit
    if (submitButton) {
        submitButton.addEventListener('click', handleSubmit);
    }
}

async function handleSubmit(e) {
    e.preventDefault();
    e.stopPropagation();
    
    // Validação básica - apenas email e senha são obrigatórios
    const email = emailInput.value.trim();
    const senha = senhaInput.value;
    
    if (!email || !senha) {
        mostrarErro('Por favor, preencha email e senha.');
        return;
    }
    
    // Se for cadastro, validar nome também
    if (currentMode === 'cadastro') {
        const nome = nomeInput.value.trim();
        if (!nome) {
            mostrarErro('Por favor, preencha todos os campos.');
            nomeInput.focus();
            return;
        }
    }
    
    // Desabilitar botão durante processamento
    submitButton.disabled = true;
    const textoOriginal = submitButton.textContent;
    submitButton.textContent = currentMode === 'cadastro' ? 'Criando conta...' : 'Entrando...';
    
    try {
        if (currentMode === 'cadastro') {
            // Cadastro
            const dados = {
                nome: nomeInput.value.trim(),
                email: email,
                senha: senha
            };
            
            const resultado = await cadastrarUsuario(dados);
            
            if (resultado.success) {
                // Fazer login automaticamente após cadastro
                const loginResult = await fazerLogin(dados.email, dados.senha);
                if (loginResult.success) {
                    salvarUsuarioLogado(loginResult.user);
                    window.location.href = 'home.html';
                }
            }
        } else {
            // Login
            const resultado = await fazerLogin(email, senha);
            
            if (resultado.success) {
                salvarUsuarioLogado(resultado.user);
                window.location.href = 'home.html';
            }
        }
    } catch (error) {
        console.error('Erro:', error);
        mostrarErro(error.message || 'Erro ao processar requisição. Verifique se o servidor está rodando na porta 3000.');
        submitButton.disabled = false;
        submitButton.textContent = textoOriginal;
    }
}

