// API Client para comunicação com o backend

const API_BASE_URL = 'http://localhost:3000/api';

// Helper para fazer requisições
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        ...options
    };
    
    if (options.body && typeof options.body === 'object') {
        config.body = JSON.stringify(options.body);
    }
    
    try {
        const response = await fetch(url, config);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Erro na requisição');
        }
        
        return data;
    } catch (error) {
        console.error('Erro na API:', error);
        throw error;
    }
}

// ==================== AUTENTICAÇÃO ====================

export async function cadastrarUsuario(dados) {
    return apiRequest('/auth/cadastro', {
        method: 'POST',
        body: dados
    });
}

export async function fazerLogin(email, senha) {
    return apiRequest('/auth/login', {
        method: 'POST',
        body: { email, senha }
    });
}

// ==================== PERFIS ====================

export async function buscarPerfil(userId) {
    return apiRequest(`/perfil/${userId}`);
}

export async function atualizarPerfil(userId, dados) {
    return apiRequest(`/perfil/${userId}`, {
        method: 'PUT',
        body: dados
    });
}

// ==================== VAGAS ====================

export async function listarVagas() {
    return apiRequest('/vagas');
}

export async function buscarVaga(id) {
    return apiRequest(`/vagas/${id}`);
}

export async function criarVaga(dados) {
    return apiRequest('/vagas', {
        method: 'POST',
        body: dados
    });
}

export async function candidatarVaga(vagaId, usuarioId, mensagem = null) {
    return apiRequest(`/vagas/${vagaId}/candidatar`, {
        method: 'POST',
        body: { usuario_id: usuarioId, mensagem }
    });
}

// ==================== GRUPOS ====================

export async function listarGrupos() {
    return apiRequest('/grupos');
}

export async function buscarGruposUsuario(userId) {
    return apiRequest(`/grupos/usuario/${userId}`);
}

export async function criarGrupo(dados) {
    return apiRequest('/grupos', {
        method: 'POST',
        body: dados
    });
}

export async function entrarGrupo(grupoId, usuarioId) {
    return apiRequest(`/grupos/${grupoId}/entrar`, {
        method: 'POST',
        body: { usuario_id: usuarioId }
    });
}

// ==================== CHAT ====================

export async function buscarMensagensPrivadas(userId1, userId2) {
    return apiRequest(`/chat/privado/${userId1}/${userId2}`);
}

export async function buscarMensagensGrupo(grupoId) {
    return apiRequest(`/chat/grupo/${grupoId}`);
}

export async function enviarMensagem(dados) {
    return apiRequest('/chat/enviar', {
        method: 'POST',
        body: dados
    });
}

// Armazenar usuário logado no localStorage
export function salvarUsuarioLogado(usuario) {
    localStorage.setItem('usuarioLogado', JSON.stringify(usuario));
}

export function obterUsuarioLogado() {
    const usuario = localStorage.getItem('usuarioLogado');
    return usuario ? JSON.parse(usuario) : null;
}

export function removerUsuarioLogado() {
    localStorage.removeItem('usuarioLogado');
}

