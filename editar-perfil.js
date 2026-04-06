// Script para edição de perfil

let fotoPerfilBase64 = null;

document.addEventListener('DOMContentLoaded', async function() {
    // Aguardar inicialização do banco
    if (typeof initDB === 'function') {
        await initDB();
        await initDefaultData();
    }
    
    const usuario = verificarLogin();
    if (!usuario) return;
    
    await carregarDadosPerfil(usuario.id);
    
    document.getElementById('editForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        await salvarPerfil(usuario.id);
    });
});

async function carregarDadosPerfil(userId) {
    try {
        const dados = await buscarPerfil(userId);
        const user = dados.user;
        const perfil = dados.perfil || {};
        
        // Preencher campos
        document.getElementById('nome').value = user.nome || '';
        document.getElementById('curso').value = user.curso || '';
        document.getElementById('ano_formatura').value = user.ano_formatura || '';
        document.getElementById('bio').value = perfil.bio || '';
        document.getElementById('empresa_atual').value = perfil.empresa_atual || '';
        document.getElementById('cargo_atual').value = perfil.cargo_atual || '';
        document.getElementById('telefone').value = perfil.telefone || '';
        document.getElementById('linkedin_url').value = perfil.linkedin_url || '';
        document.getElementById('github_url').value = perfil.github_url || '';
        
        // Carregar foto se existir
        if (perfil.foto_perfil) {
            document.getElementById('photoPreview').src = perfil.foto_perfil;
            fotoPerfilBase64 = perfil.foto_perfil;
        } else {
            // Foto padrão
            document.getElementById('photoPreview').src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iNDAiIGN5PSIyNSIgcj0iMTIiIGZpbGw9InVybCgjZ3JhZGllbnQpIi8+CjxwYXRoIGQ9Ik0yMCA2NSBRMjAgNTAgNDAgNTAgUTYwIDUwIDYwIDY1IiBzdHJva2U9InVybCgjZ3JhZGllbnQpIiBzdHJva2Utd2lkdGg9IjgiIGZpbGw9Im5vbmUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8ZGVmcz4KPGxpbmVhckdyYWRpZW50IGlkPSJncmFkaWVudCIgeDE9IjAlIiB5MT0iMCUiIHgyPSIwJSIgeTI9IjEwMCUiPgo8c3RvcCBvZmZzZXQ9IjAlIiBzdHlsZT0ic3RvcC1jb2xvcjojN0IyQ0JGO3N0b3Atb3BhY2l0eToxIiAvPgo8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiMwMDY2RkY7c3RvcC1vcGFjaXR5OjEiIC8+CjwvbGluZWFyR3JhZGllbnQ+CjwvZGVmcz4KPC9zdmc+';
        }
    } catch (error) {
        console.error('Erro ao carregar perfil:', error);
        alert('Erro ao carregar dados do perfil.');
    }
}

function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        alert('Por favor, selecione uma imagem.');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        fotoPerfilBase64 = e.target.result;
        document.getElementById('photoPreview').src = fotoPerfilBase64;
    };
    reader.readAsDataURL(file);
}

async function salvarPerfil(userId) {
    const saveBtn = document.getElementById('saveBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Salvando...';
    
    try {
        const dados = {
            nome: document.getElementById('nome').value.trim(),
            curso: document.getElementById('curso').value.trim() || null,
            ano_formatura: document.getElementById('ano_formatura').value ? parseInt(document.getElementById('ano_formatura').value) : null,
            bio: document.getElementById('bio').value.trim() || null,
            empresa_atual: document.getElementById('empresa_atual').value.trim() || null,
            cargo_atual: document.getElementById('cargo_atual').value.trim() || null,
            telefone: document.getElementById('telefone').value.trim() || null,
            linkedin_url: document.getElementById('linkedin_url').value.trim() || null,
            github_url: document.getElementById('github_url').value.trim() || null,
            foto_perfil: fotoPerfilBase64 || null
        };
        
        await atualizarPerfil(userId, dados);
        
        alert('Perfil atualizado com sucesso!');
        window.location.href = 'perfil.html';
    } catch (error) {
        console.error('Erro ao salvar perfil:', error);
        alert('Erro ao salvar perfil: ' + error.message);
        saveBtn.disabled = false;
        saveBtn.textContent = 'Salvar Alterações';
    }
}

