// Script para página de detalhes do grupo com chat

let grupoId = null;
let usuarioAtual = null;
let intervaloCarregamento = null;

document.addEventListener('DOMContentLoaded', async function() {
    // Aguardar inicialização do banco
    if (typeof initDB === 'function') {
        await initDB();
        await initDefaultData();
    }
    
    usuarioAtual = verificarLogin();
    if (!usuarioAtual) return;
    
    // Obter ID do grupo da URL
    const urlParams = new URLSearchParams(window.location.search);
    grupoId = urlParams.get('id');
    
    if (!grupoId) {
        alert('Grupo não encontrado.');
        window.location.href = 'grupos.html';
        return;
    }
    
    await carregarGrupo();
    await carregarMembros();
    await carregarMensagens();
    
    // Configurar upload de imagem
    document.getElementById('imageInput').addEventListener('change', handleImageUpload);
    
    // Enviar mensagem ao pressionar Enter
    document.getElementById('messageInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            enviarMensagem();
        }
    });
    
    // Carregar mensagens a cada 3 segundos
    intervaloCarregamento = setInterval(carregarMensagens, 3000);
});

async function carregarGrupo() {
    try {
        const grupos = await buscarGruposUsuario(usuarioAtual.id);
        const grupo = grupos.find(g => g.id == parseInt(grupoId));
        
        if (grupo) {
            document.getElementById('grupoNome').textContent = grupo.nome || 'Grupo';
        }
    } catch (error) {
        console.error('Erro ao carregar grupo:', error);
    }
}

async function carregarMembros() {
    try {
        const membros = await listarMembrosGrupo(parseInt(grupoId));
        
        const membersList = document.getElementById('membersList');
        
        if (membersList) {
            membersList.innerHTML = '<strong style="color: white;">Membros:</strong> ';
            if (membros && membros.length > 0) {
                membros.forEach(membro => {
                    const span = document.createElement('span');
                    span.className = 'member-item';
                    span.textContent = membro.nome || membro.email;
                    membersList.appendChild(span);
                });
            } else {
                membersList.innerHTML += '<span class="member-item">Nenhum membro encontrado</span>';
            }
        }
    } catch (error) {
        console.error('Erro ao carregar membros:', error);
        const membersList = document.getElementById('membersList');
        if (membersList) {
            membersList.innerHTML = '<strong style="color: white;">Membros:</strong> <span style="color: #ff4444;">Erro ao carregar</span>';
        }
    }
}

async function carregarMensagens() {
    try {
        const mensagens = await buscarMensagensGrupo(parseInt(grupoId));
        
        const chatMessages = document.getElementById('chatMessages');
        
        if (!chatMessages) return;
        
        chatMessages.innerHTML = '';
        
        if (!mensagens || mensagens.length === 0) {
            chatMessages.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">Nenhuma mensagem ainda. Seja o primeiro a escrever!</p>';
            return;
        }
        
        mensagens.forEach(msg => {
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${msg.remetente_id === usuarioAtual.id ? 'own' : ''}`;
            
            const time = new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            
            let contentHTML = `<div class="message-header">${msg.remetente_nome || 'Usuário'}</div>`;
            
            // Verificar se é imagem
            if (msg.tipo === 'imagem' && msg.arquivo_url) {
                contentHTML += `<img src="${msg.arquivo_url}" class="message-image" alt="Imagem" style="max-width: 100%; border-radius: 8px; margin-top: 8px;">`;
                // Se houver texto além da imagem, mostrar também
                if (msg.conteudo && msg.conteudo !== '📷 Imagem') {
                    contentHTML += `<div class="message-content" style="margin-top: 8px;">${msg.conteudo}</div>`;
                }
            } 
            // Mensagem de texto normal
            else {
                contentHTML += `<div class="message-content">${msg.conteudo}</div>`;
            }
            
            contentHTML += `<div class="message-time">${time}</div>`;
            
            messageDiv.innerHTML = contentHTML;
            chatMessages.appendChild(messageDiv);
        });
        
        // Scroll para o final
        chatMessages.scrollTop = chatMessages.scrollHeight;
    } catch (error) {
        console.error('Erro ao carregar mensagens:', error);
    }
}

async function enviarMensagem() {
    const input = document.getElementById('messageInput');
    const texto = input.value.trim();
    
    if (!texto && !fotoPendente) return;
    
    try {
        // Determinar tipo e conteúdo
        let tipoFinal = 'texto';
        let conteudoFinal = texto;
        let arquivoFinal = null;
        
        if (fotoPendente) {
            tipoFinal = 'imagem';
            arquivoFinal = fotoPendente;
            conteudoFinal = texto || '📷 Imagem';
        }
        
        const dados = {
            remetente_id: usuarioAtual.id,
            grupo_id: parseInt(grupoId),
            conteudo: conteudoFinal,
            tipo: tipoFinal,
            arquivo_url: arquivoFinal
        };
        
        await enviarMensagemAPI(dados);
        
        input.value = '';
        fotoPendente = null;
        
        // Recarregar mensagens após pequeno delay para garantir que foi salvo
        setTimeout(async () => {
            await carregarMensagens();
        }, 300);
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        alert('Erro ao enviar mensagem: ' + error.message);
    }
}

let fotoPendente = null;

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        alert('Por favor, selecione uma imagem.');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        fotoPendente = e.target.result;
        document.getElementById('messageInput').value = '📷 Imagem anexada';
        enviarMensagem();
    };
    reader.readAsDataURL(file);
}

// Limpar intervalo ao sair da página
window.addEventListener('beforeunload', function() {
    if (intervaloCarregamento) {
        clearInterval(intervaloCarregamento);
    }
});

