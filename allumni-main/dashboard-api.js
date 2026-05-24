// API Client usando IndexedDB (funciona sem servidor)

function obterUsuarioLogado() {
    const usuario = localStorage.getItem('usuarioLogado');
    return usuario ? JSON.parse(usuario) : null;
}

function verificarLogin() {
    const usuario = obterUsuarioLogado();
    if (!usuario) {
        window.location.href = 'index.html';
        return null;
    }
    return usuario;
}

function formatDate(value) {
    if (!value) {
        return '';
    }

    return new Date(value).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// ==================== PERFIS ====================

async function buscarPerfil(userId) {
    const user = await dbGet('usuarios', userId);
    if (!user) {
        throw new Error('Usuário não encontrado');
    }

    const perfil = await dbGetByIndex('perfis', 'usuario_id', userId);
    const { senha, ...userSafe } = user;
    return { user: userSafe, perfil: perfil || {} };
}

async function atualizarPerfil(userId, dados) {
    const {
        nome,
        curso,
        ano_formatura,
        bio,
        linkedin_url,
        github_url,
        telefone,
        empresa_atual,
        cargo_atual,
        foto_perfil
    } = dados;

    if (nome || curso || ano_formatura) {
        const updates = { updated_at: new Date().toISOString() };
        if (nome) updates.nome = nome;
        if (curso) updates.curso = curso;
        if (ano_formatura) updates.ano_formatura = ano_formatura;
        await dbUpdate('usuarios', userId, updates);
    }

    const perfil = await dbGetByIndex('perfis', 'usuario_id', userId);
    const updates = {};

    if (bio !== undefined) updates.bio = bio;
    if (linkedin_url !== undefined) updates.linkedin_url = linkedin_url;
    if (github_url !== undefined) updates.github_url = github_url;
    if (telefone !== undefined) updates.telefone = telefone;
    if (empresa_atual !== undefined) updates.empresa_atual = empresa_atual;
    if (cargo_atual !== undefined) updates.cargo_atual = cargo_atual;
    if (foto_perfil !== undefined) updates.foto_perfil = foto_perfil;

    if (perfil) {
        await dbPut('perfis', {
            ...perfil,
            ...updates,
            updated_at: new Date().toISOString()
        });
    } else {
        await dbAdd('perfis', {
            usuario_id: userId,
            ...updates,
            created_at: new Date().toISOString()
        });
    }

    return { success: true, message: 'Perfil atualizado com sucesso' };
}

// ==================== VAGAS ====================

async function listarVagas() {
    const vagas = await dbGetAll('vagas');
    const vagasAtivas = vagas.filter(vaga => vaga.status === 'ativa' || !vaga.status);

    for (const vaga of vagasAtivas) {
        if (vaga.criado_por) {
            const criador = await dbGet('usuarios', vaga.criado_por);
            vaga.criador_nome = criador ? criador.nome : 'Desconhecido';
        }
    }

    return vagasAtivas.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
}

async function buscarVaga(id) {
    const vaga = await dbGet('vagas', id);
    if (!vaga) {
        throw new Error('Vaga não encontrada');
    }

    if (vaga.criado_por) {
        const criador = await dbGet('usuarios', vaga.criado_por);
        vaga.criador_nome = criador ? criador.nome : 'Desconhecido';
    }

    return vaga;
}

async function criarVaga(dados) {
    const {
        titulo,
        descricao,
        empresa,
        localizacao,
        tipo_emprego,
        salario_min,
        salario_max,
        requisitos,
        criado_por
    } = dados;

    if (!titulo || !empresa || !criado_por) {
        throw new Error('Título, empresa e criador são obrigatórios');
    }

    const vaga = {
        titulo,
        descricao: descricao || null,
        empresa,
        localizacao: localizacao || null,
        tipo_emprego: tipo_emprego || null,
        salario_min: salario_min || null,
        salario_max: salario_max || null,
        requisitos: requisitos || null,
        criado_por,
        status: 'ativa',
        created_at: new Date().toISOString()
    };

    const result = await dbAdd('vagas', vaga);
    return { success: true, vagaId: result.id };
}

async function candidatarVaga(vagaId, usuarioId, mensagem = null) {
    const candidaturas = await dbGetAll('candidaturas', 'vaga_id', vagaId);
    const jaCandidatou = candidaturas.some(candidatura => candidatura.usuario_id === usuarioId);

    if (jaCandidatou) {
        throw new Error('Você já se candidatou a esta vaga');
    }

    await dbAdd('candidaturas', {
        vaga_id: vagaId,
        usuario_id: usuarioId,
        mensagem: mensagem || null,
        created_at: new Date().toISOString()
    });

    return { success: true };
}

// ==================== EVENTOS ====================

async function listarEventos() {
    const eventos = await dbGetAll('eventos');
    const eventosOrdenados = eventos.sort((a, b) => new Date(a.data_evento || 0) - new Date(b.data_evento || 0));

    for (const evento of eventosOrdenados) {
        if (evento.criado_por) {
            const criador = await dbGet('usuarios', evento.criado_por);
            evento.criador_nome = criador ? criador.nome : 'Desconhecido';
        }

        const inscritos = await dbGetAll('inscricoes_eventos', 'evento_id', evento.id);
        evento.total_inscritos = inscritos.length;
        evento.data_formatada = formatDate(evento.data_evento);
    }

    return eventosOrdenados;
}

async function buscarEvento(id) {
    const evento = await dbGet('eventos', id);
    if (!evento) {
        throw new Error('Evento não encontrado');
    }

    if (evento.criado_por) {
        const criador = await dbGet('usuarios', evento.criado_por);
        evento.criador_nome = criador ? criador.nome : 'Desconhecido';
    }

    const inscritos = await dbGetAll('inscricoes_eventos', 'evento_id', evento.id);
    evento.total_inscritos = inscritos.length;
    evento.data_formatada = formatDate(evento.data_evento);

    return evento;
}

async function listarEventosPorCategoria(categoria) {
    const eventos = await listarEventos();
    return eventos.filter(evento => evento.categoria === categoria);
}

async function criarEvento(dados) {
    const {
        titulo,
        descricao,
        resumo,
        categoria,
        data_evento,
        localizacao,
        link_url,
        imagem_url,
        destaque,
        criado_por
    } = dados;

    if (!titulo || !categoria || !criado_por) {
        throw new Error('Título, categoria e criador são obrigatórios');
    }

    const evento = {
        titulo,
        descricao: descricao || null,
        resumo: resumo || null,
        categoria,
        data_evento: data_evento || null,
        localizacao: localizacao || null,
        link_url: link_url || null,
        imagem_url: imagem_url || null,
        destaque: destaque ? 1 : 0,
        criado_por,
        created_at: new Date().toISOString()
    };

    if (evento.destaque === 1) {
        const eventos = await listarEventosPorCategoria(categoria);
        for (const item of eventos.filter(item => item.destaque === 1)) {
            await dbUpdate('eventos', item.id, { destaque: 0, updated_at: new Date().toISOString() });
        }
    }

    const result = await dbAdd('eventos', evento);
    return { success: true, eventoId: result.id };
}

async function buscarInscricaoEvento(eventoId, usuarioId) {
    const inscricoes = await dbGetAll('inscricoes_eventos', 'evento_id', eventoId);
    return inscricoes.find(inscricao => inscricao.usuario_id === usuarioId) || null;
}

async function inscreverEmEvento(eventoId, usuarioId) {
    const jaInscrito = await buscarInscricaoEvento(eventoId, usuarioId);
    if (jaInscrito) {
        throw new Error('Você já está inscrito neste evento');
    }

    await dbAdd('inscricoes_eventos', {
        evento_id: eventoId,
        usuario_id: usuarioId,
        created_at: new Date().toISOString()
    });

    return { success: true };
}

async function cancelarInscricaoEvento(eventoId, usuarioId) {
    const inscricao = await buscarInscricaoEvento(eventoId, usuarioId);
    if (!inscricao) {
        throw new Error('Inscrição não encontrada');
    }

    await dbDelete('inscricoes_eventos', inscricao.id);
    return { success: true };
}

// ==================== GRUPOS ====================

async function listarGrupos() {
    const grupos = await dbGetAll('grupos');

    for (const grupo of grupos) {
        if (grupo.criado_por) {
            const criador = await dbGet('usuarios', grupo.criado_por);
            grupo.criador_nome = criador ? criador.nome : 'Desconhecido';
        }

        const membros = await dbGetAll('grupo_membros', 'grupo_id', grupo.id);
        grupo.total_membros = membros.length;
    }

    return grupos.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
}

async function buscarGruposUsuario(userId) {
    const membros = await dbGetAll('grupo_membros', 'usuario_id', userId);
    const grupos = [];

    for (const membro of membros) {
        const grupo = await dbGet('grupos', membro.grupo_id);
        if (!grupo) {
            continue;
        }

        grupo.role = membro.role || 'membro';

        if (grupo.criado_por) {
            const criador = await dbGet('usuarios', grupo.criado_por);
            grupo.criador_nome = criador ? criador.nome : 'Desconhecido';
        }

        const todosMembros = await dbGetAll('grupo_membros', 'grupo_id', grupo.id);
        grupo.total_membros = todosMembros.length;
        grupos.push(grupo);
    }

    return grupos.sort((a, b) => a.nome.localeCompare(b.nome));
}

async function criarGrupo(dados) {
    const { nome, descricao, criado_por } = dados;

    if (!nome || !criado_por) {
        throw new Error('Nome e criador são obrigatórios');
    }

    const grupo = {
        nome,
        descricao: descricao || null,
        criado_por,
        created_at: new Date().toISOString()
    };

    const result = await dbAdd('grupos', grupo);

    await dbAdd('grupo_membros', {
        grupo_id: result.id,
        usuario_id: criado_por,
        role: 'admin',
        joined_at: new Date().toISOString()
    });

    return { success: true, grupoId: result.id };
}

async function entrarGrupo(grupoId, usuarioId) {
    const membros = await dbGetAll('grupo_membros', 'grupo_id', grupoId);
    const jaMembro = membros.some(membro => membro.usuario_id === usuarioId);

    if (jaMembro) {
        throw new Error('Você já é membro deste grupo');
    }

    await dbAdd('grupo_membros', {
        grupo_id: grupoId,
        usuario_id: usuarioId,
        role: 'membro',
        joined_at: new Date().toISOString()
    });

    return { success: true };
}

async function listarMembrosGrupo(grupoId) {
    const membros = await dbGetAll('grupo_membros', 'grupo_id', grupoId);
    const membrosCompleto = [];

    for (const membro of membros) {
        const usuario = await dbGet('usuarios', membro.usuario_id);
        if (!usuario) {
            continue;
        }

        membrosCompleto.push({
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email,
            curso: usuario.curso,
            role: membro.role || 'membro',
            joined_at: membro.joined_at
        });
    }

    return membrosCompleto.sort((a, b) => new Date(a.joined_at || 0) - new Date(b.joined_at || 0));
}

// ==================== CHAT ====================

async function buscarMensagensGrupo(grupoId) {
    const todasMensagens = await dbGetAll('mensagens');
    const mensagens = todasMensagens.filter(mensagem => mensagem.grupo_id == grupoId);

    for (const mensagem of mensagens) {
        if (mensagem.remetente_id) {
            const remetente = await dbGet('usuarios', mensagem.remetente_id);
            mensagem.remetente_nome = remetente ? remetente.nome : 'Desconhecido';
        }
    }

    return mensagens.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
}

async function enviarMensagemAPI(dados) {
    const { remetente_id, destinatario_id, grupo_id, conteudo, tipo, arquivo_url } = dados;

    if (!remetente_id) {
        throw new Error('Remetente é obrigatório');
    }

    if (!destinatario_id && !grupo_id) {
        throw new Error('Destinatário ou grupo é obrigatório');
    }

    const conteudoFinal = conteudo || (arquivo_url && tipo === 'imagem' ? 'Imagem' : arquivo_url && tipo === 'audio' ? 'Áudio' : '');

    let tipoFinal = tipo || 'texto';
    if (!tipo && arquivo_url) {
        if (arquivo_url.startsWith('data:image/')) {
            tipoFinal = 'imagem';
        } else if (arquivo_url.startsWith('data:audio/')) {
            tipoFinal = 'audio';
        }
    }

    const mensagem = {
        remetente_id,
        destinatario_id: destinatario_id || null,
        grupo_id: grupo_id || null,
        conteudo: conteudoFinal,
        tipo: tipoFinal,
        arquivo_url: arquivo_url || null,
        created_at: new Date().toISOString()
    };

    const result = await dbAdd('mensagens', mensagem);
    return { success: true, mensagemId: result.id };
}

// ==================== ADMINISTRAÇÃO ====================

async function verificarAdmin(userId) {
    const user = await dbGet('usuarios', userId);
    return user && user.is_admin === 1;
}

async function listarUsuariosAdmin(adminId) {
    const isAdmin = await verificarAdmin(adminId);
    if (!isAdmin) {
        throw new Error('Acesso negado. Apenas administradores.');
    }

    const usuarios = await dbGetAll('usuarios');
    return usuarios
        .filter(usuario => usuario.status_conta !== 'fechada' || !usuario.status_conta)
        .map(usuario => {
            const { senha, ...usuarioSafe } = usuario;
            return usuarioSafe;
        })
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
}

async function fecharContaUsuario(userId, adminId) {
    const isAdmin = await verificarAdmin(adminId);
    if (!isAdmin) {
        throw new Error('Acesso negado. Apenas administradores.');
    }

    const usuario = await dbGet('usuarios', userId);
    if (!usuario) {
        throw new Error('Usuário não encontrado');
    }

    if (parseInt(userId, 10) === parseInt(adminId, 10)) {
        throw new Error('Você não pode fechar sua própria conta');
    }

    const perfil = await dbGetByIndex('perfis', 'usuario_id', userId);
    if (perfil) {
        await dbDelete('perfis', perfil.id);
    }

    const todasMensagens = await dbGetAll('mensagens');
    for (const mensagem of todasMensagens.filter(item => item.remetente_id == userId || item.destinatario_id == userId)) {
        await dbDelete('mensagens', mensagem.id);
    }

    const todosMembros = await dbGetAll('grupo_membros');
    for (const membro of todosMembros.filter(item => item.usuario_id == userId)) {
        await dbDelete('grupo_membros', membro.id);
    }

    const candidaturas = await dbGetAll('candidaturas');
    for (const candidatura of candidaturas.filter(item => item.usuario_id == userId)) {
        await dbDelete('candidaturas', candidatura.id);
    }

    const inscricoes = await dbGetAll('inscricoes_eventos');
    for (const inscricao of inscricoes.filter(item => item.usuario_id == userId)) {
        await dbDelete('inscricoes_eventos', inscricao.id);
    }

    await dbDelete('usuarios', userId);
    return { success: true, message: 'Conta removida permanentemente' };
}

async function promoverAdmin(userId, adminId) {
    const isAdmin = await verificarAdmin(adminId);
    if (!isAdmin) {
        throw new Error('Acesso negado. Apenas administradores.');
    }

    await dbUpdate('usuarios', userId, {
        is_admin: 1,
        updated_at: new Date().toISOString()
    });

    return { success: true, message: 'Usuário promovido a administrador' };
}

async function removerAdminUsuario(userId, adminId) {
    const isAdmin = await verificarAdmin(adminId);
    if (!isAdmin) {
        throw new Error('Acesso negado. Apenas administradores.');
    }

    if (parseInt(userId, 10) === parseInt(adminId, 10)) {
        throw new Error('Você não pode remover seus próprios privilégios de admin');
    }

    await dbUpdate('usuarios', userId, {
        is_admin: 0,
        updated_at: new Date().toISOString()
    });

    return { success: true, message: 'Privilégios de administrador removidos' };
}

async function removerVaga(vagaId, adminId) {
    const isAdmin = await verificarAdmin(adminId);
    if (!isAdmin) {
        throw new Error('Acesso negado. Apenas administradores.');
    }

    const vaga = await dbGet('vagas', vagaId);
    if (!vaga) {
        throw new Error('Vaga não encontrada');
    }

    const candidaturas = await dbGetAll('candidaturas');
    for (const candidatura of candidaturas.filter(item => item.vaga_id == vagaId)) {
        await dbDelete('candidaturas', candidatura.id);
    }

    await dbDelete('vagas', vagaId);
    return { success: true, message: 'Vaga removida com sucesso' };
}

async function removerEvento(eventoId, adminId) {
    const isAdmin = await verificarAdmin(adminId);
    if (!isAdmin) {
        throw new Error('Acesso negado. Apenas administradores.');
    }

    const evento = await dbGet('eventos', eventoId);
    if (!evento) {
        throw new Error('Evento não encontrado');
    }

    const inscricoes = await dbGetAll('inscricoes_eventos');
    for (const inscricao of inscricoes.filter(item => item.evento_id == eventoId)) {
        await dbDelete('inscricoes_eventos', inscricao.id);
    }

    await dbDelete('eventos', eventoId);
    return { success: true, message: 'Evento removido com sucesso' };
}

async function removerGrupo(grupoId, adminId) {
    const isAdmin = await verificarAdmin(adminId);
    if (!isAdmin) {
        throw new Error('Acesso negado. Apenas administradores.');
    }

    const grupo = await dbGet('grupos', grupoId);
    if (!grupo) {
        throw new Error('Grupo não encontrado');
    }

    const mensagens = await dbGetAll('mensagens');
    for (const mensagem of mensagens.filter(item => item.grupo_id == grupoId)) {
        await dbDelete('mensagens', mensagem.id);
    }

    const membros = await dbGetAll('grupo_membros', 'grupo_id', grupoId);
    for (const membro of membros) {
        await dbDelete('grupo_membros', membro.id);
    }

    await dbDelete('grupos', grupoId);
    return { success: true, message: 'Grupo removido com sucesso' };
}

window.buscarPerfil = buscarPerfil;
window.atualizarPerfil = atualizarPerfil;
window.listarVagas = listarVagas;
window.buscarVaga = buscarVaga;
window.criarVaga = criarVaga;
window.candidatarVaga = candidatarVaga;
window.listarEventos = listarEventos;
window.buscarEvento = buscarEvento;
window.listarEventosPorCategoria = listarEventosPorCategoria;
window.criarEvento = criarEvento;
window.buscarInscricaoEvento = buscarInscricaoEvento;
window.inscreverEmEvento = inscreverEmEvento;
window.cancelarInscricaoEvento = cancelarInscricaoEvento;
window.listarGrupos = listarGrupos;
window.buscarGruposUsuario = buscarGruposUsuario;
window.criarGrupo = criarGrupo;
window.entrarGrupo = entrarGrupo;
window.listarMembrosGrupo = listarMembrosGrupo;
window.buscarMensagensGrupo = buscarMensagensGrupo;
window.enviarMensagemAPI = enviarMensagemAPI;
window.listarUsuariosAdmin = listarUsuariosAdmin;
window.fecharContaUsuario = fecharContaUsuario;
window.promoverAdmin = promoverAdmin;
window.removerAdminUsuario = removerAdminUsuario;
window.removerVaga = removerVaga;
window.removerEvento = removerEvento;
window.removerGrupo = removerGrupo;
window.obterUsuarioLogado = obterUsuarioLogado;
window.verificarLogin = verificarLogin;
