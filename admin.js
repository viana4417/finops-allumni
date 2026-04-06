// Script para página de Administração

document.addEventListener('DOMContentLoaded', async () => {
    if (typeof initDB === 'function') {
        await initDB();
        await initDefaultData();
    }

    const usuario = verificarLogin();
    if (!usuario) return;

    if (!usuario.is_admin) {
        alert('Acesso negado. Apenas administradores podem acessar esta página.');
        window.location.href = 'home.html';
        return;
    }

    await Promise.all([
        carregarUsuarios(usuario.id),
        carregarVagasAdmin(),
        carregarEventosAdmin(),
        carregarGruposAdmin()
    ]);
});

async function carregarUsuarios(adminId) {
    const adminContent = document.getElementById('adminContent');

    try {
        const usuarios = await listarUsuariosAdmin(adminId);

        if (!usuarios.length) {
            adminContent.innerHTML = '<p class="empty-state">Nenhum usuário encontrado.</p>';
            return;
        }

        adminContent.innerHTML = '';

        usuarios.forEach(usuario => {
            const userItem = document.createElement('div');
            userItem.className = 'user-item';

            const badges = [
                usuario.is_admin ? '<span class="badge badge-admin">Admin</span>' : '',
                '<span class="badge badge-ativa">Ativa</span>'
            ].join('');

            userItem.innerHTML = `
                <div class="user-info">
                    <div style="font-weight: 700; font-size: 16px;">${usuario.nome || 'Sem nome'}</div>
                    <div style="margin-top: 4px; color: #5d6475;">${usuario.email}</div>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px;">${badges}</div>
                </div>
                <div class="user-actions">
                    <button class="btn-action btn-fechar" type="button" onclick="fecharConta(${usuario.id})">Remover conta</button>
                    ${usuario.is_admin
                        ? `<button class="btn-action btn-remove-admin" type="button" onclick="removerAdmin(${usuario.id})" ${usuario.id === obterUsuarioLogado().id ? 'disabled' : ''}>Remover admin</button>`
                        : `<button class="btn-action btn-admin" type="button" onclick="tornarAdmin(${usuario.id})">Tornar admin</button>`
                    }
                </div>
            `;

            adminContent.appendChild(userItem);
        });
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        adminContent.innerHTML = '<p class="empty-state">Erro ao carregar usuários.</p>';
    }
}

async function fecharConta(userId) {
    if (!confirm('Tem certeza que deseja remover permanentemente esta conta?')) return;

    try {
        await fecharContaUsuario(userId, obterUsuarioLogado().id);
        alert('Conta removida com sucesso.');
        await carregarUsuarios(obterUsuarioLogado().id);
    } catch (error) {
        alert('Erro ao remover conta: ' + error.message);
    }
}

async function tornarAdmin(userId) {
    if (!confirm('Deseja promover este usuário a administrador?')) return;

    try {
        await promoverAdmin(userId, obterUsuarioLogado().id);
        alert('Usuário promovido a administrador.');
        await carregarUsuarios(obterUsuarioLogado().id);
    } catch (error) {
        alert('Erro ao promover usuário: ' + error.message);
    }
}

async function removerAdmin(userId) {
    if (!confirm('Deseja remover os privilégios de administrador deste usuário?')) return;

    try {
        await removerAdminUsuario(userId, obterUsuarioLogado().id);
        alert('Privilégios removidos.');
        await carregarUsuarios(obterUsuarioLogado().id);
    } catch (error) {
        alert('Erro ao remover admin: ' + error.message);
    }
}

function mostrarAba(aba) {
    const mapping = {
        usuarios: 'abaUsuarios',
        vagas: 'abaVagas',
        eventos: 'abaEventos',
        grupos: 'abaGrupos'
    };

    Object.values(mapping).forEach(id => {
        document.getElementById(id).style.display = 'none';
    });

    document.querySelectorAll('.tab-btn').forEach(button => {
        button.classList.toggle('active', button.dataset.tab === aba);
    });

    document.getElementById(mapping[aba]).style.display = 'block';
}

async function carregarVagasAdmin() {
    const vagasList = document.getElementById('vagasList');

    try {
        const vagas = await listarVagas();

        if (!vagas.length) {
            vagasList.innerHTML = '<p class="empty-state">Nenhuma vaga cadastrada.</p>';
            return;
        }

        vagasList.innerHTML = '';

        vagas.forEach(vaga => {
            const item = document.createElement('div');
            item.className = 'vaga-item';
            item.innerHTML = `
                <div>
                    <div style="font-weight: 700;">${vaga.titulo}</div>
                    <div style="margin-top: 6px; color: #5d6475;">
                        ${vaga.empresa || 'Empresa não informada'}${vaga.localizacao ? ` • ${vaga.localizacao}` : ''}
                    </div>
                </div>
                <div class="user-actions">
                    <button class="btn-action btn-fechar" type="button" onclick="deletarVaga(${vaga.id})">Remover</button>
                </div>
            `;
            vagasList.appendChild(item);
        });
    } catch (error) {
        console.error('Erro ao carregar vagas:', error);
        vagasList.innerHTML = '<p class="empty-state">Erro ao carregar vagas.</p>';
    }
}

async function criarNovaVaga(event) {
    event.preventDefault();

    const usuario = obterUsuarioLogado();
    const dados = {
        titulo: document.getElementById('vagaTitulo').value.trim(),
        empresa: document.getElementById('vagaEmpresa').value.trim(),
        localizacao: document.getElementById('vagaLocalizacao').value.trim() || null,
        tipo_emprego: document.getElementById('vagaTipo').value.trim() || null,
        salario_min: document.getElementById('vagaSalarioMin').value ? parseFloat(document.getElementById('vagaSalarioMin').value) : null,
        salario_max: document.getElementById('vagaSalarioMax').value ? parseFloat(document.getElementById('vagaSalarioMax').value) : null,
        descricao: document.getElementById('vagaDescricao').value.trim() || null,
        requisitos: document.getElementById('vagaRequisitos').value.trim() || null,
        criado_por: usuario.id
    };

    try {
        await criarVaga(dados);
        document.getElementById('formCriarVaga').reset();
        await carregarVagasAdmin();
        alert('Vaga criada com sucesso.');
    } catch (error) {
        alert('Erro ao criar vaga: ' + error.message);
    }
}

async function deletarVaga(vagaId) {
    if (!confirm('Tem certeza que deseja remover esta vaga?')) return;

    try {
        await removerVaga(vagaId, obterUsuarioLogado().id);
        await carregarVagasAdmin();
        alert('Vaga removida com sucesso.');
    } catch (error) {
        alert('Erro ao remover vaga: ' + error.message);
    }
}

async function carregarEventosAdmin() {
    const eventosList = document.getElementById('eventosList');

    try {
        const eventos = await listarEventos();

        if (!eventos.length) {
            eventosList.innerHTML = '<p class="empty-state">Nenhum evento cadastrado.</p>';
            return;
        }

        eventosList.innerHTML = '';

        eventos.forEach(evento => {
            const item = document.createElement('div');
            item.className = 'admin-item';
            item.innerHTML = `
                <div>
                    <div style="font-weight: 700;">${evento.titulo}</div>
                    <div style="margin-top: 6px; color: #5d6475;">
                        ${evento.categoria === 'evento' ? 'Evento' : 'Palestra'}
                        ${evento.data_formatada ? ` • ${evento.data_formatada}` : ''}
                        ${evento.localizacao ? ` • ${evento.localizacao}` : ''}
                    </div>
                    <div style="margin-top: 10px; color: #1f2c49;">${evento.resumo || evento.descricao || ''}</div>
                </div>
                <div class="user-actions">
                    <button class="btn-action btn-fechar" type="button" onclick="deletarEvento(${evento.id})">Remover</button>
                </div>
            `;
            eventosList.appendChild(item);
        });
    } catch (error) {
        console.error('Erro ao carregar eventos:', error);
        eventosList.innerHTML = '<p class="empty-state">Erro ao carregar eventos.</p>';
    }
}

async function criarNovoEvento(event) {
    event.preventDefault();

    const usuario = obterUsuarioLogado();
    const dados = {
        titulo: document.getElementById('eventoTitulo').value.trim(),
        categoria: document.getElementById('eventoCategoria').value,
        data_evento: document.getElementById('eventoData').value || null,
        localizacao: document.getElementById('eventoLocalizacao').value.trim() || null,
        link_url: document.getElementById('eventoLink').value.trim() || null,
        destaque: document.getElementById('eventoDestaque').value === '1',
        resumo: document.getElementById('eventoResumo').value.trim() || null,
        descricao: document.getElementById('eventoDescricao').value.trim() || null,
        criado_por: usuario.id
    };

    try {
        await criarEvento(dados);
        document.getElementById('formCriarEvento').reset();
        await carregarEventosAdmin();
        alert('Evento criado com sucesso.');
    } catch (error) {
        alert('Erro ao criar evento: ' + error.message);
    }
}

async function deletarEvento(eventoId) {
    if (!confirm('Tem certeza que deseja remover este evento?')) return;

    try {
        await removerEvento(eventoId, obterUsuarioLogado().id);
        await carregarEventosAdmin();
        alert('Evento removido com sucesso.');
    } catch (error) {
        alert('Erro ao remover evento: ' + error.message);
    }
}

async function carregarGruposAdmin() {
    const gruposList = document.getElementById('gruposList');

    try {
        const grupos = await listarGrupos();

        if (!grupos.length) {
            gruposList.innerHTML = '<p class="empty-state">Nenhum grupo cadastrado.</p>';
            return;
        }

        gruposList.innerHTML = '';

        grupos.forEach(grupo => {
            const item = document.createElement('div');
            item.className = 'grupo-item';
            item.innerHTML = `
                <div>
                    <div style="font-weight: 700;">${grupo.nome}</div>
                    <div style="margin-top: 6px; color: #5d6475;">
                        ${grupo.descricao || 'Sem descrição'} • ${grupo.total_membros || 0} membro(s)
                    </div>
                </div>
                <div class="user-actions">
                    <button class="btn-action btn-fechar" type="button" onclick="deletarGrupo(${grupo.id})">Remover</button>
                </div>
            `;
            gruposList.appendChild(item);
        });
    } catch (error) {
        console.error('Erro ao carregar grupos:', error);
        gruposList.innerHTML = '<p class="empty-state">Erro ao carregar grupos.</p>';
    }
}

async function criarNovoGrupo(event) {
    event.preventDefault();

    try {
        await criarGrupo({
            nome: document.getElementById('grupoNome').value.trim(),
            descricao: document.getElementById('grupoDescricao').value.trim() || null,
            criado_por: obterUsuarioLogado().id
        });

        document.getElementById('formCriarGrupo').reset();
        await carregarGruposAdmin();
        alert('Grupo criado com sucesso.');
    } catch (error) {
        alert('Erro ao criar grupo: ' + error.message);
    }
}

async function deletarGrupo(grupoId) {
    if (!confirm('Tem certeza que deseja remover este grupo?')) return;

    try {
        await removerGrupo(grupoId, obterUsuarioLogado().id);
        await carregarGruposAdmin();
        alert('Grupo removido com sucesso.');
    } catch (error) {
        alert('Erro ao remover grupo: ' + error.message);
    }
}

window.mostrarAba = mostrarAba;
window.fecharConta = fecharConta;
window.tornarAdmin = tornarAdmin;
window.removerAdmin = removerAdmin;
window.criarNovaVaga = criarNovaVaga;
window.deletarVaga = deletarVaga;
window.criarNovoEvento = criarNovoEvento;
window.deletarEvento = deletarEvento;
window.criarNovoGrupo = criarNovoGrupo;
window.deletarGrupo = deletarGrupo;
