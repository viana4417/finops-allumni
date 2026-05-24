// Script para página de Vagas e Eventos

let usuarioAtual = null;
let detalheAtual = null;

document.addEventListener('DOMContentLoaded', async () => {
    if (typeof initDB === 'function') {
        await initDB();
        await initDefaultData();
    }

    usuarioAtual = verificarLogin();
    if (!usuarioAtual) return;

    configurarModal();
    await carregarConteudo();
});

async function carregarConteudo() {
    await Promise.all([
        carregarVagas(),
        carregarEventos()
    ]);
}

async function carregarVagas() {
    const vagasContent = document.getElementById('vagasContent');

    try {
        const vagas = await listarVagas();

        if (!vagas.length) {
            vagasContent.innerHTML = '<p class="empty-state">Nenhuma vaga disponível no momento.</p>';
            return;
        }

        vagasContent.innerHTML = '';

        vagas.forEach(vaga => {
            const item = document.createElement('div');
            item.className = 'list-item';

            item.innerHTML = `
                <div>
                    <div class="list-item-title">${vaga.titulo || 'Vaga sem título'}</div>
                    <div style="margin-top: 6px; color: #5d6475; font-size: 14px;">
                        ${vaga.empresa || 'Empresa não informada'}${vaga.localizacao ? ` • ${vaga.localizacao}` : ''}
                    </div>
                </div>
                <button class="btn-view" type="button" data-vaga-id="${vaga.id}">Visualizar</button>
            `;

            item.querySelector('button').addEventListener('click', () => abrirDetalhesVaga(vaga.id));
            vagasContent.appendChild(item);
        });
    } catch (error) {
        console.error('Erro ao carregar vagas:', error);
        vagasContent.innerHTML = '<p class="empty-state">Erro ao carregar vagas.</p>';
    }
}

async function carregarEventos() {
    const eventosContent = document.getElementById('eventosContent');
    const palestrasContent = document.getElementById('palestrasContent');

    try {
        const eventos = await listarEventos();
        const principais = eventos.filter(evento => evento.categoria === 'evento');
        const palestras = eventos.filter(evento => evento.categoria === 'palestra');
        const eventoDestaque = principais.find(evento => evento.destaque === 1) || principais[0];

        if (eventoDestaque) {
            eventosContent.innerHTML = criarPosterEvento(eventoDestaque, true);
            eventosContent.querySelector('.poster-plus').addEventListener('click', () => abrirDetalhesEvento(eventoDestaque.id));
        } else {
            eventosContent.innerHTML = '<p class="empty-state">Nenhum evento em destaque no momento.</p>';
        }

        if (!palestras.length) {
            palestrasContent.innerHTML = '<p class="empty-state">Nenhuma palestra cadastrada.</p>';
            return;
        }

        palestrasContent.innerHTML = palestras.map(evento => criarPosterEvento(evento, false)).join('');
        palestrasContent.querySelectorAll('[data-evento-id]').forEach(button => {
            button.addEventListener('click', () => abrirDetalhesEvento(parseInt(button.dataset.eventoId, 10)));
        });
    } catch (error) {
        console.error('Erro ao carregar eventos:', error);
        eventosContent.innerHTML = '<p class="empty-state">Erro ao carregar eventos.</p>';
        palestrasContent.innerHTML = '<p class="empty-state">Erro ao carregar palestras.</p>';
    }
}

function criarPosterEvento(evento, destaque) {
    const classe = destaque ? 'event-poster' : 'palestra-poster';
    const meta = [evento.data_formatada, evento.localizacao].filter(Boolean).join(' • ');

    return `
        <article class="${classe}">
            <span class="poster-category">${evento.categoria === 'evento' ? 'Evento' : 'Palestra'}</span>
            <div class="poster-title">${evento.titulo}</div>
            <div class="poster-text">${evento.resumo || evento.descricao || 'Sem descrição disponível.'}</div>
            ${meta ? `<div class="poster-meta">${meta}</div>` : ''}
            <button class="poster-plus" type="button" data-evento-id="${evento.id}">+</button>
        </article>
    `;
}

function configurarModal() {
    const modal = document.getElementById('detailModal');
    const closeButton = document.getElementById('closeModalButton');

    closeButton.addEventListener('click', fecharModal);
    modal.addEventListener('click', event => {
        if (event.target === modal) {
            fecharModal();
        }
    });
}

async function abrirDetalhesVaga(vagaId) {
    try {
        const vaga = await buscarVaga(vagaId);
        detalheAtual = { tipo: 'vaga', id: vagaId };

        document.getElementById('detailTitle').textContent = vaga.titulo || 'Vaga';
        document.getElementById('detailSubtitle').textContent = `${vaga.empresa || 'Empresa não informada'}${vaga.localizacao ? ` • ${vaga.localizacao}` : ''}`;
        document.getElementById('detailMeta').innerHTML = `
            <div class="mini-badge">${vaga.tipo_emprego || 'Formato a combinar'}</div>
            ${vaga.salario_min || vaga.salario_max ? `<div class="mini-badge">Faixa salarial: ${formatarSalario(vaga)}</div>` : ''}
        `;
        document.getElementById('detailDescription').innerHTML = `
            <strong>Descrição</strong>
            <p style="margin-top: 8px;">${vaga.descricao || 'Sem descrição detalhada.'}</p>
            <strong style="display: block; margin-top: 14px;">Requisitos</strong>
            <p style="margin-top: 8px;">${vaga.requisitos || 'Não informados.'}</p>
        `;

        const primaryButton = document.getElementById('detailPrimaryAction');
        const secondaryButton = document.getElementById('detailSecondaryAction');

        primaryButton.textContent = 'Candidatar-se';
        primaryButton.onclick = async () => {
            try {
                await candidatarVaga(vagaId, usuarioAtual.id);
                alert('Candidatura enviada com sucesso!');
                fecharModal();
            } catch (error) {
                alert(error.message);
            }
        };

        secondaryButton.style.display = 'none';
        abrirModal();
    } catch (error) {
        console.error('Erro ao abrir detalhes da vaga:', error);
        alert('Não foi possível carregar os detalhes da vaga.');
    }
}

async function abrirDetalhesEvento(eventoId) {
    try {
        const evento = await buscarEvento(eventoId);
        const inscricao = await buscarInscricaoEvento(eventoId, usuarioAtual.id);
        detalheAtual = { tipo: 'evento', id: eventoId };

        document.getElementById('detailTitle').textContent = evento.titulo || 'Evento';
        document.getElementById('detailSubtitle').textContent = evento.resumo || evento.descricao || 'Detalhes do evento';
        document.getElementById('detailMeta').innerHTML = `
            ${evento.data_formatada ? `<div class="mini-badge">${evento.data_formatada}</div>` : ''}
            ${evento.localizacao ? `<div class="mini-badge">${evento.localizacao}</div>` : ''}
            <div class="mini-badge">${evento.total_inscritos || 0} inscrito(s)</div>
        `;
        document.getElementById('detailDescription').innerHTML = `
            <strong>${evento.categoria === 'evento' ? 'Programação' : 'Conteúdo'}</strong>
            <p style="margin-top: 8px;">${evento.descricao || 'Sem descrição detalhada.'}</p>
        `;

        const primaryButton = document.getElementById('detailPrimaryAction');
        const secondaryButton = document.getElementById('detailSecondaryAction');

        primaryButton.textContent = inscricao ? 'Cancelar inscrição' : 'Inscrever-se';
        primaryButton.onclick = async () => {
            try {
                if (inscricao) {
                    await cancelarInscricaoEvento(eventoId, usuarioAtual.id);
                    alert('Inscrição cancelada.');
                } else {
                    await inscreverEmEvento(eventoId, usuarioAtual.id);
                    alert('Inscrição confirmada!');
                }

                fecharModal();
                await carregarEventos();
            } catch (error) {
                alert(error.message);
            }
        };

        if (evento.link_url) {
            secondaryButton.style.display = 'inline-flex';
            secondaryButton.textContent = 'Abrir link';
            secondaryButton.onclick = () => window.open(evento.link_url, '_blank', 'noopener,noreferrer');
        } else {
            secondaryButton.style.display = 'none';
        }

        abrirModal();
    } catch (error) {
        console.error('Erro ao abrir detalhes do evento:', error);
        alert('Não foi possível carregar os detalhes do evento.');
    }
}

function abrirModal() {
    document.getElementById('detailModal').classList.add('open');
}

function fecharModal() {
    document.getElementById('detailModal').classList.remove('open');
    detalheAtual = null;
}

function formatarSalario(vaga) {
    if (vaga.salario_min && vaga.salario_max) {
        return `R$ ${vaga.salario_min.toLocaleString('pt-BR')} - R$ ${vaga.salario_max.toLocaleString('pt-BR')}`;
    }

    if (vaga.salario_min) {
        return `A partir de R$ ${vaga.salario_min.toLocaleString('pt-BR')}`;
    }

    return 'A combinar';
}
