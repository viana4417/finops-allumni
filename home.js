// Script para carregar dados da página Home

async function initHome() {
    // Aguardar inicialização do banco
    if (typeof initDB === 'function') {
        await initDB();
        await initDefaultData();
    }
    
    // Verificar login
    const usuario = verificarLogin();
    if (!usuario) return;
    
    try {
        // Carregar perfil do usuário
        await carregarPerfil(usuario.id);
        
        // Carregar vagas
        await carregarVagas();
        
        // Carregar grupos do usuário
        await carregarGrupos(usuario.id);
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
    }
}

document.addEventListener('DOMContentLoaded', initHome);

async function carregarPerfil(userId) {
    try {
        const dados = await buscarPerfil(userId);
        const user = dados.user;
        const perfil = dados.perfil || {};
        
        // Atualizar foto de perfil se existir
        const profileIcon = document.querySelector('.profile-icon');
        if (profileIcon && perfil.foto_perfil) {
            const img = document.createElement('img');
            img.src = perfil.foto_perfil;
            img.style.cssText = 'width: 60px; height: 60px; border-radius: 50%; object-fit: cover;';
            profileIcon.innerHTML = '';
            profileIcon.appendChild(img);
        }
        
        // Atualizar nome
        const profileName = document.getElementById('profileName');
        if (profileName) {
            profileName.textContent = user.nome || 'Usuário';
        }
        
        // Atualizar role
        const profileRole = document.getElementById('profileRole');
        if (profileRole) {
            profileRole.textContent = user.tipo === 'ex_estudante' ? 'Ex estudante' : user.tipo || 'Usuário';
        }
        
        // Atualizar detalhes
        const profileDetails = document.getElementById('profileDetails');
        if (profileDetails) {
            profileDetails.innerHTML = '';
            
            if (user.email) {
                const emailP = document.createElement('p');
                emailP.textContent = user.email;
                profileDetails.appendChild(emailP);
            }
            
            if (user.curso) {
                const cursoP = document.createElement('p');
                cursoP.textContent = user.curso;
                profileDetails.appendChild(cursoP);
            }
            
            if (user.ano_formatura) {
                const anoP = document.createElement('p');
                anoP.textContent = `Formado em ${user.ano_formatura}`;
                profileDetails.appendChild(anoP);
            }
            
            if (profileDetails.children.length === 0) {
                const emptyP = document.createElement('p');
                emptyP.className = 'empty-state';
                emptyP.textContent = 'Complete seu perfil';
                profileDetails.appendChild(emptyP);
            }
        }
    } catch (error) {
        console.error('Erro ao carregar perfil:', error);
    }
}

async function carregarVagas() {
    try {
        const vagas = await listarVagas();
        const jobList = document.getElementById('jobList');
        
        if (!jobList) return;
        
        if (vagas.length === 0) {
            jobList.innerHTML = '<p class="empty-state">Nenhuma vaga disponível no momento.</p>';
            return;
        }
        
        // Mostrar apenas as 2 primeiras vagas
        const vagasLimitadas = vagas.slice(0, 2);
        
        jobList.innerHTML = '';
        vagasLimitadas.forEach(vaga => {
            const jobItem = document.createElement('div');
            jobItem.className = 'job-item';
            
            const title = document.createElement('h3');
            title.className = 'job-title';
            title.textContent = vaga.titulo || 'Vaga sem título';
            
            const btnView = document.createElement('button');
            btnView.className = 'btn-view';
            btnView.textContent = 'Visualizar';
            btnView.onclick = () => window.location.href = 'vagas.html';
            
            jobItem.appendChild(title);
            jobItem.appendChild(btnView);
            jobList.appendChild(jobItem);
        });
        
        // Se houver mais vagas, adicionar link para ver todas
        if (vagas.length > 2) {
            const verTodas = document.createElement('a');
            verTodas.href = 'vagas.html';
            verTodas.textContent = `Ver todas as ${vagas.length} vagas`;
            verTodas.className = 'subtle-link';
            jobList.appendChild(verTodas);
        }
    } catch (error) {
        console.error('Erro ao carregar vagas:', error);
        const jobList = document.getElementById('jobList');
        if (jobList) {
            jobList.innerHTML = '<p class="error-state">Erro ao carregar vagas.</p>';
        }
    }
}

async function carregarGrupos(userId) {
    try {
        const grupos = await buscarGruposUsuario(userId);
        const groupList = document.getElementById('groupList');
        
        if (!groupList) return;
        
        if (grupos.length === 0) {
            groupList.innerHTML = '<p class="empty-state">Você ainda não participa de nenhum grupo.</p>';
            return;
        }
        
        // Mostrar apenas os 3 primeiros grupos
        const gruposLimitados = grupos.slice(0, 3);
        
        groupList.innerHTML = '';
        gruposLimitados.forEach(grupo => {
            const groupItem = document.createElement('div');
            groupItem.className = 'group-item';
            groupItem.textContent = grupo.nome || 'Grupo sem nome';
            groupItem.style.cursor = 'pointer';
            groupItem.onclick = () => window.location.href = `grupos.html?id=${grupo.id}`;
            groupList.appendChild(groupItem);
        });
        
        // Se houver mais grupos, adicionar link para ver todos
        if (grupos.length > 3) {
            const verTodos = document.createElement('a');
            verTodos.href = 'grupos.html';
            verTodos.textContent = `Ver todos os ${grupos.length} grupos`;
            verTodos.className = 'subtle-link';
            groupList.appendChild(verTodos);
        }
    } catch (error) {
        console.error('Erro ao carregar grupos:', error);
        const groupList = document.getElementById('groupList');
        if (groupList) {
            groupList.innerHTML = '<p class="error-state">Erro ao carregar grupos.</p>';
        }
    }
}
