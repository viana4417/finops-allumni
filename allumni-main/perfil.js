// Script para página de Perfil

document.addEventListener('DOMContentLoaded', async function() {
    // Aguardar inicialização do banco
    if (typeof initDB === 'function') {
        await initDB();
        await initDefaultData();
    }
    
    const usuario = verificarLogin();
    if (!usuario) return;
    
    await carregarPerfil(usuario.id);
});

async function carregarPerfil(userId) {
    try {
        const dados = await buscarPerfil(userId);
        const user = dados.user;
        const perfil = dados.perfil || {};
        
        const perfilContent = document.getElementById('perfilContent');
        if (!perfilContent) return;
        
        const fotoPerfil = perfil.foto_perfil || '';
        const fotoHTML = fotoPerfil 
            ? `<img src="${fotoPerfil}" style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 3px solid #0066FF; margin-bottom: 16px;">`
            : `<div class="profile-icon" style="margin-bottom: 16px;">
                <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="profileGradientPerfil" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" style="stop-color:#7B2CBF;stop-opacity:1" />
                            <stop offset="100%" style="stop-color:#0066FF;stop-opacity:1" />
                        </linearGradient>
                    </defs>
                    <circle cx="40" cy="25" r="12" fill="url(#profileGradientPerfil)"/>
                    <path d="M20 65 Q20 50 40 50 Q60 50 60 65" stroke="url(#profileGradientPerfil)" stroke-width="8" fill="none" stroke-linecap="round"/>
                </svg>
            </div>`;
        
        perfilContent.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 24px;">
                <div style="text-align: center;">
                    ${fotoHTML}
                    <h2 style="font-size: 28px; font-weight: 700; margin-bottom: 8px;">${user.nome || 'Usuário'}</h2>
                    <p style="color: #666; font-size: 16px;">${user.tipo === 'ex_estudante' ? 'Ex estudante' : user.tipo || 'Usuário'}</p>
                </div>
                
                <div style="border-top: 1px solid #e0e0e0; padding-top: 24px;">
                    <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 16px;">Informações Pessoais</h3>
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <div>
                            <strong>Email:</strong> ${user.email || 'Não informado'}
                        </div>
                        <div>
                            <strong>Curso:</strong> ${user.curso || 'Não informado'}
                        </div>
                        <div>
                            <strong>Ano de Formatura:</strong> ${user.ano_formatura || 'Não informado'}
                        </div>
                        ${perfil.empresa_atual ? `<div><strong>Empresa Atual:</strong> ${perfil.empresa_atual}</div>` : ''}
                        ${perfil.cargo_atual ? `<div><strong>Cargo Atual:</strong> ${perfil.cargo_atual}</div>` : ''}
                        ${perfil.telefone ? `<div><strong>Telefone:</strong> ${perfil.telefone}</div>` : ''}
                        ${perfil.bio ? `<div style="margin-top: 12px;"><strong>Bio:</strong><br>${perfil.bio}</div>` : ''}
                        ${perfil.linkedin_url ? `<div><strong>LinkedIn:</strong> <a href="${perfil.linkedin_url}" target="_blank">${perfil.linkedin_url}</a></div>` : ''}
                        ${perfil.github_url ? `<div><strong>GitHub:</strong> <a href="${perfil.github_url}" target="_blank">${perfil.github_url}</a></div>` : ''}
                    </div>
                </div>
                
                <div style="display: flex; gap: 12px; margin-top: 24px;">
                    <button class="btn-outline" onclick="editarPerfil()" style="flex: 1;">Editar Perfil</button>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Erro ao carregar perfil:', error);
        const perfilContent = document.getElementById('perfilContent');
        if (perfilContent) {
            perfilContent.innerHTML = '<p style="text-align: center; color: #ff4444; padding: 40px;">Erro ao carregar perfil.</p>';
        }
    }
}

function editarPerfil() {
    window.location.href = 'editar-perfil.html';
}

