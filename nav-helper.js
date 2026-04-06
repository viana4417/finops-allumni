// Navegação compartilhada no estilo do dashboard

document.addEventListener('DOMContentLoaded', () => {
    const usuario = typeof obterUsuarioLogado === 'function' ? obterUsuarioLogado() : null;
    const currentPage = window.location.pathname.split('/').pop() || 'home.html';
    const navs = document.querySelectorAll('.sidebar-nav');

    navs.forEach(nav => {
        nav.innerHTML = buildNavItems(currentPage, usuario && usuario.is_admin);
    });

    document.querySelectorAll('.sidebar').forEach(sidebar => {
        ensureSidebarFooter(sidebar);
    });
});

function buildNavItems(currentPage, includeAdmin) {
    const items = [
        { href: 'home.html', label: 'Home', icon: iconHome() },
        { href: 'perfil.html', label: 'Perfil', icon: iconProfile() },
        { href: 'vagas.html', label: 'Vagas e Eventos', icon: iconStack() },
        { href: 'grupos.html', label: 'Grupos', icon: iconGroups() },
        { href: 'beneficios.html', label: 'Benefícios', icon: iconCheck() },
        { href: 'unisantos.html', label: 'UNISANTOS', icon: iconPlusCircle() }
    ];

    if (includeAdmin) {
        items.push({ href: 'admin.html', label: 'Administração', icon: iconAdmin() });
    }

    return items.map(item => {
        const active = isPageActive(item.href, currentPage) ? ' active' : '';
        return `
            <a href="${item.href}" class="nav-item${active}">
                ${item.icon}
                <span>${item.label}</span>
            </a>
        `;
    }).join('');
}

function isPageActive(href, currentPage) {
    if (href === currentPage) {
        return true;
    }

    if (href === 'perfil.html' && currentPage === 'editar-perfil.html') {
        return true;
    }

    if (href === 'grupos.html' && currentPage === 'grupo-detalhes.html') {
        return true;
    }

    return false;
}

function ensureSidebarFooter(sidebar) {
    let footer = sidebar.querySelector('.sidebar-footer');
    const existingLogout = sidebar.querySelector('.sidebar-logout-btn');

    if (!footer) {
        footer = document.createElement('div');
        footer.className = 'sidebar-footer';
        sidebar.appendChild(footer);
    }

    let backButton = footer.querySelector('.sidebar-back-btn');
    if (!backButton) {
        backButton = document.createElement('button');
        backButton.type = 'button';
        backButton.className = 'sidebar-back-btn';
        backButton.setAttribute('aria-label', 'Voltar');
        backButton.innerHTML = `
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;
        backButton.addEventListener('click', () => {
            if (window.history.length > 1) {
                window.history.back();
            } else {
                window.location.href = 'home.html';
            }
        });
        footer.appendChild(backButton);
    }

    if (existingLogout) {
        existingLogout.classList.remove('sidebar-logout-link');
    }
}

function iconHome() {
    return `
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 10L12 3L20 10V20H4V10Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M9 20V13H15V20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
    `;
}

function iconProfile() {
    return `
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="8" r="3.5" stroke="currentColor" stroke-width="2"/>
            <path d="M5 20C5.8 16.9 8.36 15 12 15C15.64 15 18.2 16.9 19 20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
    `;
}

function iconStack() {
    return `
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 4L3 8.5L12 13L21 8.5L12 4Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
            <path d="M5 12.5L12 16L19 12.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M5 16.5L12 20L19 16.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
    `;
}

function iconGroups() {
    return `
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="8" cy="9" r="3" stroke="currentColor" stroke-width="2"/>
            <circle cx="17" cy="11" r="2.5" stroke="currentColor" stroke-width="2"/>
            <path d="M3.5 20C4.2 17.1 6.5 15.5 9.3 15.5C12.1 15.5 14.4 17.1 15.1 20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M14.5 19C15 17.2 16.3 16.1 18.1 15.9C19.5 15.7 20.8 16.4 21.5 17.6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
    `;
}

function iconCheck() {
    return `
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 12L10 16L18 7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
    `;
}

function iconPlusCircle() {
    return `
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/>
            <path d="M12 8V16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M8 12H16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
    `;
}

function iconAdmin() {
    return `
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 3L4 7L12 11L20 7L12 3Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
            <path d="M4 12L12 16L20 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M4 17L12 21L20 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
    `;
}
