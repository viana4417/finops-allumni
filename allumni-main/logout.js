// Função para fazer logout
function fazerLogout() {
    // Limpar dados do usuário do localStorage
    localStorage.removeItem('usuarioLogado');
    
    // Redirecionar para a página de login
    window.location.href = 'index.html';
}

// Expor globalmente
window.fazerLogout = fazerLogout;

