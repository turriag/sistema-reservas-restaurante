/**
 * Sistema de Reservas de Restaurante
 * Dashboard del Cliente - Con Supabase
 * @version 2.2.0
 */

class ClienteDashboard {
    constructor() {
        this.currentPage = 'dashboard';
        this.user = null;
        this.reservas = [];
        this.notificaciones = [];
        // NO llamar a init aquí - se llamará después
    }
    
    async init() {
        // ESPERAR A QUE SUPABASE ESTÉ DISPONIBLE
        let esperas = 0;
        while (typeof supabaseClient === 'undefined' || !supabaseClient) {
            console.log('⏳ Esperando Supabase...');
            await new Promise(resolve => setTimeout(resolve, 200));
            esperas++;
            if (esperas > 30) {
                console.error('❌ Timeout: Supabase no disponible');
                const contentDiv = document.getElementById('dynamicContent');
                if (contentDiv) {
                    contentDiv.innerHTML = `
                        <div style="text-align: center; padding: 50px;">
                            <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: red;"></i>
                            <h3>Error de conexión</h3>
                            <p>No se pudo conectar con la base de datos. Recarga la página.</p>
                            <button onclick="location.reload()" class="btn-primary">Recargar</button>
                        </div>
                    `;
                }
                return;
            }
        }
        
        console.log('✅ Supabase listo');
        
        // Verificar autenticación
        if (!authService.isAuthenticated()) {
            window.location.href = 'login.html';
            return;
        }
        
        this.user = authService.getCurrentUser();
        this.updateUserInfo();
        
        // Cargar datos
        await this.cargarDatos();
        
        // Configurar event listeners
        this.setupEventListeners();
        
        // Cargar página inicial
        this.loadPage('dashboard');
    }
    
    setupEventListeners() {
        // Navegación del sidebar
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const page = item.dataset.page;
                this.loadPage(page);
                
                // Actualizar active class
                document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
            });
        });
        
        // Cerrar sesión
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                authService.logout();
            });
        }
        
        // Botón de notificaciones
        const notifBtn = document.getElementById('notificationBtn');
        if (notifBtn) {
            notifBtn.addEventListener('click', () => {
                this.loadPage('notificaciones');
                document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
                document.querySelector('[data-page="notificaciones"]').classList.add('active');
            });
        }
    }
    
    updateUserInfo() {
        const userNameSpan = document.getElementById('userName');
        const userEmailSpan = document.getElementById('userEmail');
        
        if (userNameSpan) userNameSpan.textContent = this.user.nombre || 'Cliente';
        if (userEmailSpan) userEmailSpan.textContent = this.user.email;
    }
    
    async cargarDatos() {
        await this.cargarReservas();
        await this.cargarNotificaciones();
        this.updateNotificationBadge();
    }
    
    async cargarReservas() {
        try {
            if (typeof supabaseClient === 'undefined' || !supabaseClient) {
                console.error('supabaseClient no disponible');
                this.reservas = [];
                return;
            }
            
            const { data, error } = await supabaseClient
                .from('reservas')
                .select(`
                    id_reservas,
                    fecha,
                    hora,
                    numero_personas,
                    id_mesa,
                    estado_reserva,
                    observaciones,
                    mesas (ubicacion, capacidad)
                `)
                .eq('id_cliente', this.user.id)
                .order('fecha', { ascending: false });
            
            if (error) throw error;
            
            this.reservas = (data || []).map(r => ({
                id: r.id_reservas,
                fecha: r.fecha,
                hora: r.hora,
                personas: r.numero_personas,
                mesa: r.id_mesa,
                ubicacion: r.mesas?.ubicacion || 'No especificada',
                capacidad_mesa: r.mesas?.capacidad || 0,
                estado: r.estado_reserva,
                observaciones: r.observaciones || ''
            }));
            
            this.actualizarEstadisticas();
            
        } catch (error) {
            console.error('Error al cargar reservas:', error);
            this.reservas = [];
        }
    }
    
    async cargarNotificaciones() {
        try {
            if (typeof supabaseClient === 'undefined' || !supabaseClient) {
                this.notificaciones = [];
                return;
            }
            
            const { data, error } = await supabaseClient
                .from('notificaciones')
                .select('*')
                .eq('correo_cliente', this.user.email)
                .order('fecha_envio', { ascending: false })
                .limit(20);
            
            if (error) throw error;
            
            this.notificaciones = (data || []).map(n => ({
                id: n.id_notificacion,
                mensaje: n.mensaje,
                fecha: n.fecha_envio,
                leida: n.leida || false
            }));
            
            this.updateNotificationBadge();
            
        } catch (error) {
            console.error('Error al cargar notificaciones:', error);
            this.notificaciones = [];
        }
    }
    
    actualizarEstadisticas() {
        const total = this.reservas.length;
        const activas = this.reservas.filter(r => r.estado === 'confirmada').length;
        const hoy = new Date().toISOString().split('T')[0];
        const reservasHoy = this.reservas.filter(r => r.fecha === hoy && r.estado === 'confirmada').length;
        
        this.totalReservas = total;
        this.reservasActivas = activas;
        this.reservasHoy = reservasHoy;
    }
    
    updateNotificationBadge() {
        const badge = document.getElementById('notificationCount');
        const noLeidas = this.notificaciones.filter(n => !n.leida).length;
        if (badge) {
            badge.textContent = noLeidas;
            badge.style.display = noLeidas > 0 ? 'inline-block' : 'none';
        }
    }
    
    loadPage(page) {
        this.currentPage = page;
        const contentDiv = document.getElementById('dynamicContent');
        const pageTitle = document.getElementById('pageTitle');
        const pageDescription = document.getElementById('pageDescription');
        
        if (!contentDiv) return;
        
        switch(page) {
            case 'dashboard':
                if (pageTitle) pageTitle.textContent = 'Dashboard';
                if (pageDescription) pageDescription.textContent = 'Bienvenido a tu panel de control';
                contentDiv.innerHTML = this.renderDashboard();
                break;
            case 'reservar':
                window.location.href = 'crear-reserva.html';
                break;
            case 'disponibilidad':
                window.location.href = 'disponibilidad.html';
                break;
            case 'mis-reservas':
                window.location.href = 'mis-reservas.html';
                break;
            case 'perfil':
                if (pageTitle) pageTitle.textContent = 'Mi Perfil';
                if (pageDescription) pageDescription.textContent = 'Administra tu información personal';
                contentDiv.innerHTML = this.renderPerfil();
                this.initPerfil();
                break;
            case 'notificaciones':
                if (pageTitle) pageTitle.textContent = 'Notificaciones';
                if (pageDescription) pageDescription.textContent = 'Todas tus notificaciones';
                contentDiv.innerHTML = this.renderNotificaciones();
                break;
        }
    }
    
    renderDashboard() {
        const reservasRecientes = this.reservas.slice(0, 5);
        const total = this.reservas.length;
        const activas = this.reservas.filter(r => r.estado === 'confirmada').length;
        const hoy = new Date().toISOString().split('T')[0];
        const proximas = this.reservas.filter(r => r.fecha >= hoy && r.estado === 'confirmada').length;
        const noLeidas = this.notificaciones.filter(n => !n.leida).length;
        
        return `
            <div class="welcome-card">
                <h3>¡Bienvenido, ${this.user.nombre || 'Cliente'}! 👋</h3>
                <p>¿Listo para disfrutar de una experiencia gastronómica única?</p>
                <div class="welcome-tip">
                    <i class="fas fa-clock"></i> Recuerda llegar 10 minutos antes de tu reserva
                </div>
            </div>

            <!-- SECCIÓN DEL MENÚ DE COMIDA -->
            <div class="section-card">
                <div class="section-header">
                    <h3><i class="fas fa-utensils"></i> Menú Destacado del Día</h3>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px;">
                    <div style="text-align: center; padding: 20px; background: #fef3e8; border-radius: 12px;">
                        <i class="fas fa-fish" style="font-size: 2rem; color: #8B5A2B;"></i>
                        <h4 style="margin: 10px 0 5px;">Ceviche de Pescado</h4>
                        <p style="font-size: 0.8rem; color: #666;">Pescado fresco marinado en limón</p>
                        <span style="color: #8B5A2B; font-weight: bold;">$45.000</span>
                    </div>
                    <div style="text-align: center; padding: 20px; background: #fef3e8; border-radius: 12px;">
                        <i class="fas fa-utensil-spoon" style="font-size: 2rem; color: #8B5A2B;"></i>
                        <h4 style="margin: 10px 0 5px;">Arroz con Mariscos</h4>
                        <p style="font-size: 0.8rem; color: #666;">Con camarones, calamares y mejillones</p>
                        <span style="color: #8B5A2B; font-weight: bold;">$38.000</span>
                    </div>
                    <div style="text-align: center; padding: 20px; background: #fef3e8; border-radius: 12px;">
                        <i class="fas fa-cocktail" style="font-size: 2rem; color: #8B5A2B;"></i>
                        <h4 style="margin: 10px 0 5px;">Cóctel de Camarones</h4>
                        <p style="font-size: 0.8rem; color: #666;">Salsa rosada y aguacate</p>
                        <span style="color: #8B5A2B; font-weight: bold;">$32.000</span>
                    </div>
                </div>
            </div>

            <div class="stats-grid">
                <div class="stat-card" onclick="misReservas.verTodas()">
                    <div class="stat-info">
                        <h4>Total Reservas</h4>
                        <div class="stat-number" id="totalReservas">${total}</div>
                    </div>
                    <div class="stat-icon"><i class="fas fa-calendar-alt"></i></div>
                </div>
                <div class="stat-card" onclick="misReservas.filtrarConfirmadas()">
                    <div class="stat-info">
                        <h4>Reservas Activas</h4>
                        <div class="stat-number" id="reservasActivas">${activas}</div>
                    </div>
                    <div class="stat-icon"><i class="fas fa-check-circle"></i></div>
                </div>
                <div class="stat-card" onclick="misReservas.verProximas()">
                    <div class="stat-info">
                        <h4>Próximas Reservas</h4>
                        <div class="stat-number" id="proximasReservas">${proximas}</div>
                    </div>
                    <div class="stat-icon"><i class="fas fa-clock"></i></div>
                </div>
                <div class="stat-card" onclick="misReservas.verNotificaciones()">
                    <div class="stat-info">
                        <h4>Notificaciones</h4>
                        <div class="stat-number" id="notificacionesCount">${noLeidas}</div>
                    </div>
                    <div class="stat-icon"><i class="fas fa-bell"></i></div>
                </div>
            </div>

            <div class="quick-actions">
                <div class="action-card" onclick="window.location.href='crear-reserva.html'">
                    <div class="action-icon"><i class="fas fa-calendar-plus"></i></div>
                    <h4>Hacer Reserva</h4>
                    <p>Reserva tu mesa en segundos</p>
                </div>
                <div class="action-card" onclick="window.location.href='disponibilidad.html'">
                    <div class="action-icon"><i class="fas fa-search"></i></div>
                    <h4>Consultar Disponibilidad</h4>
                    <p>Verifica mesas disponibles</p>
                </div>
                <div class="action-card" onclick="window.location.href='mis-reservas.html'">
                    <div class="action-icon"><i class="fas fa-list-alt"></i></div>
                    <h4>Mis Reservas</h4>
                    <p>Gestiona tus reservas</p>
                </div>
                <div class="action-card" onclick="clienteDashboard.loadPage('perfil')">
                    <div class="action-icon"><i class="fas fa-user-edit"></i></div>
                    <h4>Mi Perfil</h4>
                    <p>Actualiza tus datos</p>
                </div>
            </div>

            <div class="section-card">
                <div class="section-header">
                    <h3><i class="fas fa-history"></i> Reservas Recientes</h3>
                    <span class="view-all" onclick="window.location.href='mis-reservas.html'">Ver todas →</span>
                </div>
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr><th>Fecha</th><th>Hora</th><th>Personas</th><th>Mesa</th><th>Estado</th><th>Acciones</th></tr>
                        </thead>
                        <tbody>
                            ${reservasRecientes.length > 0 ? reservasRecientes.map(reserva => `
                                <tr>
                                    <td>${this.formatearFecha(reserva.fecha)}</div></div>
                                    <td>${reserva.hora}</div></div>
                                    <td>${reserva.personas}</div></div>
                                    <td>#${reserva.mesa}</div></div>
                                    <td><span class="badge ${reserva.estado === 'confirmada' ? 'badge-success' : 'badge-error'}">${reserva.estado === 'confirmada' ? 'Confirmada' : 'Cancelada'}</span></div></div>
                                    <td>${reserva.estado === 'confirmada' ? `<button class="btn-sm btn-danger" onclick="clienteDashboard.mostrarConfirmacionCancelar(${reserva.id})">Cancelar</button>` : '-'}</div></div>
                                </tr>
                            `).join('') : '<tr><td colspan="6" style="text-align: center;">No tienes reservas recientes</div></div></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }
    
    renderPerfil() {
        return `
            <div class="section-card">
                <div class="section-header">
                    <h3><i class="fas fa-user"></i> Información Personal</h3>
                </div>
                <form id="perfilForm">
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Nombre completo</label>
                            <input type="text" id="perfilNombre" class="form-control" value="${this.user.nombre || ''}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Correo electrónico</label>
                            <input type="email" id="perfilEmail" class="form-control" value="${this.user.email || ''}" readonly>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Teléfono</label>
                            <input type="tel" id="perfilTelefono" class="form-control" value="${this.user.telefono || ''}">
                        </div>
                    </div>
                    <div style="display: flex; gap: 15px; justify-content: flex-end; margin-top: 30px;">
                        <button type="button" class="btn-outline-primary" onclick="clienteDashboard.loadPage('dashboard')">Cancelar</button>
                        <button type="submit" class="btn-primary">Guardar Cambios</button>
                    </div>
                </form>
            </div>
        `;
    }
    
    initPerfil() {
        const form = document.getElementById('perfilForm');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.guardarPerfil();
            });
        }
    }
    
    async guardarPerfil() {
        const nombre = document.getElementById('perfilNombre')?.value;
        const telefono = document.getElementById('perfilTelefono')?.value;
        
        this.mostrarLoader();
        
        try {
            const { error } = await supabaseClient
                .from('clientes')
                .update({
                    nombre_cliente: nombre,
                    telefono: telefono
                })
                .eq('id_cliente', this.user.id);
            
            if (error) throw error;
            
            this.user.nombre = nombre;
            this.user.telefono = telefono;
            localStorage.setItem('usuario', JSON.stringify(this.user));
            this.updateUserInfo();
            
            this.mostrarNotificacion('Perfil actualizado correctamente', 'success');
            
        } catch (error) {
            console.error('Error:', error);
            this.mostrarNotificacion('Error: ' + error.message, 'error');
        } finally {
            this.ocultarLoader();
        }
    }
    
    renderNotificaciones() {
        return `
            <div class="section-card">
                <div class="section-header">
                    <h3><i class="fas fa-bell"></i> Notificaciones</h3>
                </div>
                <div id="notificacionesList">
                    ${this.notificaciones.map(notif => `
                        <div class="notification-item ${notif.leida ? '' : 'unread'}" style="padding: 15px; border-bottom: 1px solid #f0f0f0; ${!notif.leida ? 'background: rgba(218,165,32,0.05);' : ''}">
                            <div><div>${notif.mensaje}</div><small style="color: #999;">${this.formatearFechaHora(notif.fecha)}</small></div>
                            ${!notif.leida ? `<button class="btn-sm" onclick="clienteDashboard.marcarLeida(${notif.id})">Marcar como leída</button>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    async marcarLeida(id) {
        try {
            await supabaseClient.from('notificaciones').update({ leida: true }).eq('id_notificacion', id);
            await this.cargarNotificaciones();
            this.loadPage('notificaciones');
        } catch (error) {
            console.error('Error:', error);
        }
    }
    
    // ============================================
    // FUNCIONES CON MODAL EN LUGAR DE confirm()
    // ============================================
    
    mostrarConfirmacionCancelar(id) {
        const reserva = this.reservas.find(r => r.id === id);
        if (!reserva) return;
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay show';
        modal.innerHTML = `
            <div class="modal" style="max-width: 400px;">
                <div class="modal-header">
                    <h3><i class="fas fa-question-circle"></i> Cancelar Reserva</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body" style="text-align: center;">
                    <i class="fas fa-calendar-times" style="font-size: 3rem; color: #f59e0b; margin-bottom: 15px;"></i>
                    <p>¿Estás seguro de cancelar la reserva del <strong>${this.formatearFecha(reserva.fecha)}</strong> a las <strong>${reserva.hora}</strong>?</p>
                    <p style="font-size: 0.8rem; color: #666;">Esta acción no se puede deshacer.</p>
                </div>
                <div class="modal-footer">
                    <button class="btn-outline-primary" id="cancelarNo">No, mantener</button>
                    <button class="btn-danger" id="cancelarSi">Sí, cancelar</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const closeModal = () => modal.remove();
        modal.querySelector('.modal-close').onclick = closeModal;
        modal.querySelector('#cancelarNo').onclick = closeModal;
        modal.querySelector('#cancelarSi').onclick = () => {
            closeModal();
            this.cancelarReserva(id);
        };
        modal.onclick = (e) => { if (e.target === modal) closeModal(); };
    }
    
    async cancelarReserva(id) {
        const reserva = this.reservas.find(r => r.id === id);
        if (!reserva) return;
        
        this.mostrarLoader();
        
        try {
            await supabaseClient.from('reservas').update({ estado_reserva: 'cancelada' }).eq('id_reservas', id);
            this.mostrarNotificacion('Reserva cancelada exitosamente', 'success');
            await this.cargarReservas();
            this.loadPage('mis-reservas');
        } catch (error) {
            this.mostrarNotificacion('Error: ' + error.message, 'error');
        } finally {
            this.ocultarLoader();
        }
    }
    
    // ============================================
    // NOTIFICACIONES TIPO TOAST
    // ============================================
    
    mostrarNotificacion(mensaje, tipo = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${tipo}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas ${tipo === 'success' ? 'fa-check-circle' : tipo === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
                <span>${mensaje}</span>
            </div>
            <button class="toast-close">&times;</button>
        `;
        
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 100);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
        
        toast.querySelector('.toast-close').onclick = () => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        };
    }
    
    mostrarLoader() {
        const loader = document.getElementById('loader');
        if (loader) loader.style.display = 'flex';
    }
    
    ocultarLoader() {
        const loader = document.getElementById('loader');
        if (loader) loader.style.display = 'none';
    }
    
    formatearFecha(fecha) {
        if (!fecha) return '';
        return new Date(fecha).toLocaleDateString('es-CO');
    }
    
    formatearFechaHora(fecha) {
        if (!fecha) return '';
        return new Date(fecha).toLocaleString('es-CO');
    }
}

// Inicializar
let clienteDashboard;
document.addEventListener('DOMContentLoaded', () => {
    clienteDashboard = new ClienteDashboard();
    clienteDashboard.init();
    window.clienteDashboard = clienteDashboard;
});