// Script para página de Grupos

document.addEventListener('DOMContentLoaded', async function() {
    // Aguardar inicialização do banco
    if (typeof initDB === 'function') {
        await initDB();
        await initDefaultData();
    }
    
    const usuario = verificarLogin();
    if (!usuario) return;
    
    await carregarGrupos(usuario.id);
});

async function carregarGrupos(userId) {
    try {
        const grupos = await buscarGruposUsuario(userId);
        const gruposContent = document.getElementById('gruposContent');
        
        if (!gruposContent) return;
        
        if (grupos.length === 0) {
            gruposContent.innerHTML = `
                <div class="card" style="max-width: 800px;">
                    <p class="empty-state">Você ainda não participa de nenhum grupo.</p>
                    <button class="btn-outline" onclick="listarTodosGrupos()" style="margin: 0 auto; display: block; max-width: 200px;">Ver Todos os Grupos</button>
                </div>
            `;
            return;
        }
        
        gruposContent.innerHTML = '';
        
        grupos.forEach(grupo => {
            const grupoCard = document.createElement('div');
            grupoCard.className = 'card';
            grupoCard.style.cssText = 'max-width: 800px; margin-bottom: 20px; cursor: pointer;';
            grupoCard.onclick = () => visualizarGrupo(grupo.id);
            
            grupoCard.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div style="flex: 1;">
                        <h2 style="font-size: 24px; font-weight: 700; margin-bottom: 8px; color: #000;">${grupo.nome || 'Grupo sem nome'}</h2>
                        ${grupo.descricao ? `<p style="color: #666; font-size: 14px; margin-bottom: 8px;">${grupo.descricao}</p>` : ''}
                        <p style="color: #0066FF; font-size: 14px; font-weight: 500;">
                            <span style="cursor: pointer; text-decoration: underline;" onclick="event.stopPropagation(); mostrarMembros(${grupo.id})">
                                ${grupo.total_membros || 0} ${grupo.total_membros === 1 ? 'membro' : 'membros'}
                            </span>
                            ${grupo.role ? ` • Você é ${grupo.role === 'admin' ? 'administrador' : grupo.role}` : ''}
                        </p>
                    </div>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="color: #0066FF;">
                        <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
            `;
            
            gruposContent.appendChild(grupoCard);
        });
        
        // Adicionar botão para ver todos os grupos disponíveis
        const verTodosBtn = document.createElement('div');
        verTodosBtn.className = 'card';
        verTodosBtn.style.cssText = 'max-width: 800px; text-align: center;';
        verTodosBtn.innerHTML = `
            <button class="btn-outline" onclick="listarTodosGrupos()" style="width: 100%;">Ver Todos os Grupos Disponíveis</button>
        `;
        gruposContent.appendChild(verTodosBtn);
        
    } catch (error) {
        console.error('Erro ao carregar grupos:', error);
        const gruposContent = document.getElementById('gruposContent');
        if (gruposContent) {
            gruposContent.innerHTML = `
                <div class="card" style="max-width: 800px;">
                    <p class="error-state">Erro ao carregar grupos.</p>
                </div>
            `;
        }
    }
}

async function listarTodosGrupos() {
    try {
        const todosGrupos = await listarGrupos();
        const gruposContent = document.getElementById('gruposContent');
        
        if (!gruposContent) return;
        
        gruposContent.innerHTML = '<h2 style="color: white; margin-bottom: 20px;">Todos os Grupos Disponíveis</h2>';
        
        todosGrupos.forEach(grupo => {
            const grupoCard = document.createElement('div');
            grupoCard.className = 'card';
            grupoCard.style.cssText = 'max-width: 800px; margin-bottom: 20px;';
            
            grupoCard.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div style="flex: 1;">
                        <h2 style="font-size: 24px; font-weight: 700; margin-bottom: 8px; color: #000;">${grupo.nome || 'Grupo sem nome'}</h2>
                        ${grupo.descricao ? `<p style="color: #666; font-size: 14px; margin-bottom: 8px;">${grupo.descricao}</p>` : ''}
                        <p style="color: #0066FF; font-size: 14px; font-weight: 500;">
                            <span style="cursor: pointer; text-decoration: underline;" onclick="event.stopPropagation(); mostrarMembros(${grupo.id})">
                                ${grupo.total_membros || 0} ${grupo.total_membros === 1 ? 'membro' : 'membros'}
                            </span>
                        </p>
                    </div>
                    <button class="btn-view" onclick="entrarNoGrupo(${grupo.id})">Entrar</button>
                </div>
            `;
            
            gruposContent.appendChild(grupoCard);
        });
    } catch (error) {
        console.error('Erro ao listar todos os grupos:', error);
        alert('Erro ao carregar grupos disponíveis.');
    }
}

async function entrarNoGrupo(grupoId) {
    const usuario = obterUsuarioLogado();
    if (!usuario) return;
    
    try {
        await entrarGrupo(grupoId, usuario.id);
        alert('Você entrou no grupo com sucesso!');
        location.reload();
    } catch (error) {
        alert('Erro ao entrar no grupo: ' + error.message);
    }
}

function visualizarGrupo(id) {
    window.location.href = `grupo-detalhes.html?id=${id}`;
}

async function mostrarMembros(grupoId) {
    try {
        let membros;
        if (typeof listarMembrosGrupo === 'function') {
            membros = await listarMembrosGrupo(grupoId);
        } else {
            // Fallback: fazer requisição direta
            const API_BASE_URL = 'http://localhost:3000/api';
            const response = await fetch(`${API_BASE_URL}/grupos/${grupoId}/membros`);
            if (!response.ok) throw new Error('Erro ao buscar membros');
            membros = await response.json();
        }
        
        if (membros && membros.length > 0) {
            const nomes = membros.map(m => m.nome || m.email).join('\n');
            alert(`Membros do grupo:\n\n${nomes}`);
        } else {
            alert('Nenhum membro encontrado neste grupo.');
        }
    } catch (error) {
        console.error('Erro ao listar membros:', error);
        alert('Erro ao carregar membros do grupo: ' + error.message);
    }
}

