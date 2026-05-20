/**
 * Sistema de Reservas de Restaurante
 * Navegación compartida entre todas las páginas
 */

class MenuNavegacion {
    constructor() {
        this.inicializar();
    }
    
    inicializar() {
        // Marcar la página actual en el menú
        this.marcarPaginaActiva();
        
        // Configurar eventos de navegación
        this.configurarNavegacion();
        
        // Cargar información del usuario
        this.cargarInfoUsuario();
    }
    
    marcarPaginaActiva() {
        const paginaActual = window.location.pathname.split('/').pop();
        const menuItems = document.querySelectorAll('.nav-item');
        
        menuItems.forEach(item => {
            const onclickAttr = item.getAttribute('onclick');
            if (onclickAttr) {
                // Si el onclick contiene la página actual, marcarlo como activo
                if (paginaActual === 'dashboard-cliente.html' && onclickAttr.includes('dashboard-cliente.html')) {
                    item.classList.add('active');
                } else if (paginaActual === 'crear-reserva.html' && onclickAttr.includes('crear-reserva.html')) {
                    item.classList.add('active');
                } else if (paginaActual === 'disponibilidad.html' && onclickAttr.includes('disponibilidad.html')) {
                    item.classList.add('active');
                } else if (paginaActual === 'mis-reservas.html' && onclickAttr.includes('mis-reservas.html')) {
                    item.classList.add('active');
                } else if (paginaActual === 'perfil.html' && onclickAttr.includes('perfil.html')) {
                    item.classList.add('active');
                }
            }
        });
    }
    
    configurarNavegacion() {
        // Los onclick ya están en el HTML, no necesitamos más
    }
    
    async cargarInfoUsuario() {
        if (!authService.isAuthenticated()) {
            return;
        }
        
        const user = authService.getCurrentUser();
        const userNameSpan = document.getElementById('userName');
        const userEmailSpan = document.getElementById('userEmail');
        
        if (userNameSpan) userNameSpan.textContent = user.nombre || 'Cliente';
        if (userEmailSpan) userEmailSpan.textContent = user.email;
    }
}

// Inicializar cuando el DOM esté listo
let menuNavegacion;
document.addEventListener('DOMContentLoaded', () => {
    menuNavegacion = new MenuNavegacion();
    window.menuNavegacion = menuNavegacion;
});