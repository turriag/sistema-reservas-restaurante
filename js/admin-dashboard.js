/**
 * Sistema de Reservas de Restaurante
 * Dashboard del Administrador - Versión Mejorada
 */

class AdminDashboard {
    constructor() {
        this.currentPage = 'dashboard';
        this.user = null;
        this.clientes = [];
        this.mesas = [];
        this.reservas = [];
        this.administradores = [];
        this.notificaciones = [];
        
        this.init();
    }
    
    async init() {
        console.log('Iniciando AdminDashboard...');
        
        // Esperar a que Supabase esté disponible
        let esperas = 0;
        while (typeof supabaseClient === 'undefined' || !supabaseClient) {
            console.log('Esperando Supabase... intento', esperas + 1);
            await new Promise(resolve => setTimeout(resolve, 200));
            esperas++;
            if (esperas > 30) {
                console.error('Timeout: Supabase no disponible');
                const contentDiv = document.getElementById('adminDynamicContent');
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
        
        if (!authService.isAuthenticated()) {
            window.location.href = 'login.html';
            return;
        }
        
        if (!authService.isAdmin()) {
            window.location.href = 'dashboard-cliente.html';
            return;
        }
        
        this.user = authService.getCurrentUser();
        this.updateUserInfo();
        
        await this.cargarTodosLosDatos();
        this.setupEventListeners();
        this.loadPage('dashboard');
    }
    
    setupEventListeners() {
        document.querySelectorAll('.admin-nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const page = item.dataset.page;
                this.loadPage(page);
                document.querySelectorAll('.admin-nav-item').forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
            });
        });
        
        const logoutBtn = document.getElementById('adminLogoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => authService.logout());
        }
    }
    
    updateUserInfo() {
        const nameSpan = document.getElementById('adminName');
        const emailSpan = document.getElementById('adminEmail');
        if (nameSpan) nameSpan.textContent = this.user.nombre || 'Administrador';
        if (emailSpan) emailSpan.textContent = this.user.email;
    }
    
    async cargarTodosLosDatos() {
        await Promise.all([
            this.cargarClientes(),
            this.cargarMesas(),
            this.cargarReservas(),
            this.cargarAdministradores(),
            this.cargarNotificaciones()
        ]);
        console.log('Todos los datos cargados');
    }
    
    async cargarClientes() {
        try {
            const { data, error } = await supabaseClient
                .from('clientes')
                .select('*')
                .order('id_cliente', { ascending: true });
            
            if (error) throw error;
            
            this.clientes = (data || []).map(c => ({
                id: c.id_cliente,
                nombre: c.nombre_cliente,
                email: c.correo,
                telefono: c.telefono || '',
                fechaRegistro: c.fecha_registro,
                estado: c.estado || 'activo'
            }));
            console.log('Clientes cargados:', this.clientes.length);
        } catch (error) {
            console.error('Error clientes:', error);
            this.clientes = [];
        }
    }
    
    async cargarMesas() {
        try {
            const { data, error } = await supabaseClient
                .from('mesas')
                .select('*')
                .order('id_mesa', { ascending: true });
            
            if (error) throw error;
            
            this.mesas = (data || []).map(m => ({
                id: m.id_mesa,
                capacidad: m.capacidad,
                ubicacion: m.ubicacion,
                estado: m.estado
            }));
            console.log('Mesas cargadas:', this.mesas.length);
        } catch (error) {
            console.error('Error mesas:', error);
            this.mesas = [];
        }
    }
    
    async cargarReservas() {
        try {
            const { data, error } = await supabaseClient
                .from('reservas')
                .select(`
                    id_reservas,
                    id_cliente,
                    id_mesa,
                    fecha,
                    hora,
                    numero_personas,
                    estado_reserva,
                    clientes (nombre_cliente, correo)
                `)
                .order('fecha', { ascending: false });
            
            if (error) throw error;
            
            this.reservas = (data || []).map(r => ({
                id: r.id_reservas,
                clienteId: r.id_cliente,
                clienteNombre: r.clientes?.nombre_cliente || 'Desconocido',
                clienteEmail: r.clientes?.correo || '',
                mesaId: r.id_mesa,
                fecha: r.fecha,
                hora: r.hora,
                personas: r.numero_personas,
                estado: r.estado_reserva
            }));
            console.log('Reservas cargadas:', this.reservas.length);
        } catch (error) {
            console.error('Error reservas:', error);
            this.reservas = [];
        }
    }
    
    async cargarAdministradores() {
        try {
            const { data, error } = await supabaseClient
                .from('administradores')
                .select('*')
                .order('id_admin', { ascending: true });
            
            if (error) throw error;
            
            this.administradores = (data || []).map(a => ({
                id: a.id_admin,
                nombre: a.nombre_admin,
                email: a.correo,
                telefono: a.telefono || '',
                rol: a.rol
            }));
            console.log('Administradores cargados:', this.administradores.length);
        } catch (error) {
            console.error('Error admins:', error);
            this.administradores = [];
        }
    }
    
    async cargarNotificaciones() {
        try {
            const { data, error } = await supabaseClient
                .from('notificaciones')
                .select('*')
                .order('fecha_envio', { ascending: false })
                .limit(50);
            
            if (error) throw error;
            
            this.notificaciones = (data || []).map(n => ({
                id: n.id_notificacion,
                reservaId: n.id_reserva,
                correo: n.correo_cliente,
                mensaje: n.mensaje,
                fecha: n.fecha_envio,
                leida: n.leida || false
            }));
            console.log('Notificaciones cargadas:', this.notificaciones.length);
        } catch (error) {
            console.error('Error notificaciones:', error);
            this.notificaciones = [];
        }
    }
    
    loadPage(page) {
        this.currentPage = page;
        const contentDiv = document.getElementById('adminDynamicContent');
        const pageTitle = document.getElementById('adminPageTitle');
        const pageDescription = document.getElementById('adminPageDescription');
        
        if (!contentDiv) return;
        
        switch(page) {
            case 'dashboard':
                if (pageTitle) pageTitle.textContent = 'Dashboard';
                if (pageDescription) pageDescription.textContent = 'Panel de control principal';
                contentDiv.innerHTML = this.renderDashboard();
                setTimeout(() => this.inicializarGraficos(), 150);
                break;
            case 'clientes':
                window.location.href = 'gestion-clientes.html';
                break;
            case 'mesas':
                window.location.href = 'gestion-mesas.html';
                break;
            case 'reservas':
                if (pageTitle) pageTitle.textContent = 'Gestión de Reservas';
                if (pageDescription) pageDescription.textContent = 'Administra todas las reservas';
                contentDiv.innerHTML = this.renderReservas();
                setTimeout(() => this.initReservas(), 100);
                break;
            case 'administradores':
                if (pageTitle) pageTitle.textContent = 'Administradores';
                if (pageDescription) pageDescription.textContent = 'Gestiona los administradores del sistema';
                contentDiv.innerHTML = this.renderAdministradores();
                break;
            case 'historial':
                if (pageTitle) pageTitle.textContent = 'Historial';
                if (pageDescription) pageDescription.textContent = 'Historial completo del sistema';
                contentDiv.innerHTML = this.renderHistorial();
                break;
            case 'notificaciones':
                if (pageTitle) pageTitle.textContent = 'Notificaciones';
                if (pageDescription) pageDescription.textContent = 'Todas las notificaciones del sistema';
                contentDiv.innerHTML = this.renderNotificacionesAdmin();
                break;
            case 'reportes':
                if (pageTitle) pageTitle.textContent = 'Reportes';
                if (pageDescription) pageDescription.textContent = 'Estadísticas del sistema';
                contentDiv.innerHTML = this.renderReportes();
                break;
            case 'configuracion':
                if (pageTitle) pageTitle.textContent = 'Configuración';
                if (pageDescription) pageDescription.textContent = 'Configuración del sistema';
                contentDiv.innerHTML = this.renderConfiguracion();
                break;
            case 'backup':
                if (pageTitle) pageTitle.textContent = 'Backup';
                if (pageDescription) pageDescription.textContent = 'Respaldo de la base de datos';
                contentDiv.innerHTML = this.renderBackup();
                break;
            default:
                contentDiv.innerHTML = '<div style="padding: 40px; text-align: center;">Página en construcción</div>';
        }
    }
    
    renderDashboard() {
        const hoy = new Date().toISOString().split('T')[0];
        const reservasHoy = this.reservas.filter(r => r.fecha === hoy && r.estado === 'confirmada').length;
        const mesasDisponibles = this.mesas.filter(m => m.estado === 'disponible').length;
        const clientesActivos = this.clientes.filter(c => c.estado === 'activo').length;
        const reservasConfirmadas = this.reservas.filter(r => r.estado === 'confirmada').length;
        const reservasCanceladas = this.reservas.filter(r => r.estado === 'cancelada').length;
    
        return `
            <div class="admin-stats-grid">
                <div class="admin-stat-card" onclick="adminDashboard.loadPage('clientes')">
                    <div class="admin-stat-info">
                        <h4>Clientes</h4>
                        <div class="admin-stat-number">${clientesActivos}</div>
                        <small>Activos</small>
                    </div>
                    <div class="admin-stat-icon"><i class="fas fa-users"></i></div>
                </div>
                <div class="admin-stat-card" onclick="adminDashboard.loadPage('mesas')">
                    <div class="admin-stat-info">
                        <h4>Mesas Disponibles</h4>
                        <div class="admin-stat-number">${mesasDisponibles}</div>
                        <small>de ${this.mesas.length} totales</small>
                    </div>
                    <div class="admin-stat-icon"><i class="fas fa-chair"></i></div>
                </div>
                <div class="admin-stat-card" onclick="adminDashboard.loadPage('reservas')">
                    <div class="admin-stat-info">
                        <h4>Reservas Hoy</h4>
                        <div class="admin-stat-number">${reservasHoy}</div>
                        <small>Total: ${this.reservas.length}</small>
                    </div>
                    <div class="admin-stat-icon"><i class="fas fa-calendar-check"></i></div>
                </div>
                <div class="admin-stat-card" onclick="adminDashboard.loadPage('reportes')">
                    <div class="admin-stat-info">
                        <h4>Reservas Totales</h4>
                        <div class="admin-stat-number">${this.reservas.length}</div>
                        <small>Confirmadas: ${reservasConfirmadas}</small>
                    </div>
                    <div class="admin-stat-icon"><i class="fas fa-chart-line"></i></div>
                </div>
            </div>

            <!-- Sección del Menú de Comida -->
            <div class="chart-card" style="margin-bottom: 20px;">
                <div class="chart-title">
                    <i class="fas fa-utensils"></i> Menú Destacado del Día
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
                    <div style="text-align: center; padding: 15px; background: #fef3e8; border-radius: 12px;">
                        <i class="fas fa-fish" style="font-size: 2rem; color: #8B5A2B;"></i>
                        <h4 style="margin: 10px 0 5px;">Ceviche de Pescado</h4>
                        <p style="font-size: 0.8rem; color: #666;">Pescado fresco marinado en limón</p>
                        <span style="color: #8B5A2B; font-weight: bold;">$45.000</span>
                    </div>
                    <div style="text-align: center; padding: 15px; background: #fef3e8; border-radius: 12px;">
                        <i class="fas fa-utensil-spoon" style="font-size: 2rem; color: #8B5A2B;"></i>
                        <h4 style="margin: 10px 0 5px;">Arroz con Mariscos</h4>
                        <p style="font-size: 0.8rem; color: #666;">Con camarones, calamares y mejillones</p>
                        <span style="color: #8B5A2B; font-weight: bold;">$38.000</span>
                    </div>
                    <div style="text-align: center; padding: 15px; background: #fef3e8; border-radius: 12px;">
                        <i class="fas fa-cocktail" style="font-size: 2rem; color: #8B5A2B;"></i>
                        <h4 style="margin: 10px 0 5px;">Cóctel de Camarones</h4>
                        <p style="font-size: 0.8rem; color: #666;">Salsa rosada y aguacate</p>
                        <span style="color: #8B5A2B; font-weight: bold;">$32.000</span>
                    </div>
                </div>
            </div>

            <!-- GRÁFICOS -->
            <div class="charts-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 30px;">
                <!-- Gráfico de Estados -->
                <div class="chart-card" style="background: white; border-radius: 16px; padding: 20px;">
                    <div class="chart-title">
                        <i class="fas fa-chart-pie"></i> Reservas por Estado
                    </div>
                    <canvas id="estadosChart" style="max-height: 250px; width: 100%;"></canvas>
                    <div style="display: flex; justify-content: center; gap: 30px; margin-top: 15px;">
                        <div><span style="background: #10b981; display: inline-block; width: 12px; height: 12px; border-radius: 50%;"></span> Confirmadas: ${reservasConfirmadas}</div>
                        <div><span style="background: #ef4444; display: inline-block; width: 12px; height: 12px; border-radius: 50%;"></span> Canceladas: ${reservasCanceladas}</div>
                    </div>
                </div>

                <!-- Gráfico de Reservas por Día -->
                <div class="chart-card" style="background: white; border-radius: 16px; padding: 20px;">
                    <div class="chart-title">
                        <i class="fas fa-chart-line"></i> Reservas (Últimos 7 días)
                    </div>
                    <canvas id="reservasDiaChart" style="max-height: 250px; width: 100%;"></canvas>
                </div>
            </div>

            <!-- Gráfico de Reservas por Mes -->
            <div class="chart-card" style="background: white; border-radius: 16px; padding: 20px; margin-bottom: 30px;">
                <div class="chart-title">
                    <i class="fas fa-chart-bar"></i> Reservas por Mes
                </div>
                <canvas id="reservasMesChart" style="max-height: 250px; width: 100%;"></canvas>
            </div>

            <!-- Actividad Reciente -->
            <div class="activity-list">
                <div class="activity-header">
                    <h3><i class="fas fa-clock"></i> Actividad Reciente</h3>
                    <button class="btn-sm btn-outline-primary" onclick="adminDashboard.loadPage('historial')">Ver todas</button>
                </div>
                ${this.reservas.slice(0, 5).map(r => `
                    <div class="activity-item">
                        <div class="activity-icon"><i class="fas fa-calendar-plus"></i></div>
                        <div class="activity-details">
                            <div>Reserva de ${r.clienteNombre} - Mesa #${r.mesaId}</div>
                            <small>${this.formatearFecha(r.fecha)} a las ${r.hora}</small>
                        </div>
                    </div>
                `).join('') || '<div style="padding: 20px; text-align: center;">No hay actividad reciente</div>'}
            </div>
        `;
    }
    
    // ============================================
    // FUNCIONES PARA GRÁFICOS
    // ============================================
    
    obtenerReservasPorDia() {
        const labels = [];
        const datos = [];
        
        for (let i = 6; i >= 0; i--) {
            const fecha = new Date();
            fecha.setDate(fecha.getDate() - i);
            const fechaStr = fecha.toISOString().split('T')[0];
            const dia = fecha.toLocaleDateString('es-CO', { weekday: 'short' });
            
            labels.push(dia);
            const count = this.reservas.filter(r => r.fecha === fechaStr).length;
            datos.push(count);
        }
        
        return { labels, datos };
    }
    
    obtenerReservasPorMes() {
        const labels = [];
        const datos = [];
        const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        
        for (let i = 5; i >= 0; i--) {
            const fecha = new Date();
            fecha.setMonth(fecha.getMonth() - i);
            const mes = fecha.getMonth();
            const anio = fecha.getFullYear();
            
            labels.push(`${meses[mes]} ${anio}`);
            
            const count = this.reservas.filter(r => {
                const fechaReserva = new Date(r.fecha);
                return fechaReserva.getMonth() === mes && fechaReserva.getFullYear() === anio;
            }).length;
            
            datos.push(count);
        }
        
        return { labels, datos };
    }
    
    inicializarGraficos() {
        setTimeout(() => {
            // Gráfico de Estados (Pie)
            const estadosCanvas = document.getElementById('estadosChart');
            if (estadosCanvas && typeof Chart !== 'undefined') {
                const confirmadas = this.reservas.filter(r => r.estado === 'confirmada').length;
                const canceladas = this.reservas.filter(r => r.estado === 'cancelada').length;
                
                new Chart(estadosCanvas, {
                    type: 'pie',
                    data: {
                        labels: ['Confirmadas', 'Canceladas'],
                        datasets: [{
                            data: [confirmadas, canceladas],
                            backgroundColor: ['#10b981', '#ef4444'],
                            borderWidth: 0
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: true,
                        plugins: {
                            legend: { position: 'bottom' }
                        }
                    }
                });
            }
            
            // Gráfico de Reservas por Día (Línea)
            const diaCanvas = document.getElementById('reservasDiaChart');
            if (diaCanvas && typeof Chart !== 'undefined') {
                const reservasPorDia = this.obtenerReservasPorDia();
                
                new Chart(diaCanvas, {
                    type: 'line',
                    data: {
                        labels: reservasPorDia.labels,
                        datasets: [{
                            label: 'Reservas',
                            data: reservasPorDia.datos,
                            borderColor: '#8B5A2B',
                            backgroundColor: 'rgba(139, 90, 43, 0.1)',
                            fill: true,
                            tension: 0.3,
                            pointBackgroundColor: '#8B5A2B',
                            pointBorderColor: '#fff',
                            pointRadius: 4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: true,
                        plugins: {
                            legend: { position: 'top' }
                        }
                    }
                });
            }
            
            // Gráfico de Reservas por Mes (Barra)
            const mesCanvas = document.getElementById('reservasMesChart');
            if (mesCanvas && typeof Chart !== 'undefined') {
                const reservasPorMes = this.obtenerReservasPorMes();
                
                new Chart(mesCanvas, {
                    type: 'bar',
                    data: {
                        labels: reservasPorMes.labels,
                        datasets: [{
                            label: 'Reservas',
                            data: reservasPorMes.datos,
                            backgroundColor: '#DAA520',
                            borderRadius: 8
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: true,
                        plugins: {
                            legend: { position: 'top' }
                        }
                    }
                });
            }
        }, 200);
    }
    
    renderReservas() {
        return `
            <div class="section-card">
                <div class="section-header">
                    <h3><i class="fas fa-calendar-alt"></i> Gestión de Reservas</h3>
                </div>
                <div class="filters">
                    <input type="text" id="buscarReserva" placeholder="Buscar por cliente..." class="filter-select" style="flex:1;">
                    <select id="filtroReservaEstado" class="filter-select">
                        <option value="todos">Todos</option>
                        <option value="confirmada">Confirmadas</option>
                        <option value="cancelada">Canceladas</option>
                    </select>
                    <button id="aplicarFiltrosReservas" class="btn-primary btn-sm">Filtrar</button>
                </div>
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr><th>ID</th><th>Cliente</th><th>Fecha</th><th>Hora</th><th>Mesa</th><th>Personas</th><th>Estado</th><th>Acciones</th></tr>
                        </thead>
                        <tbody id="reservasTableBody"></tbody>
                    </table>
                </div>
            </div>
        `;
    }
    
    initReservas() {
        const tbody = document.getElementById('reservasTableBody');
        if (!tbody) return;
        
        const render = () => {
            const busqueda = document.getElementById('buscarReserva')?.value.toLowerCase() || '';
            const estado = document.getElementById('filtroReservaEstado')?.value || 'todos';
            
            let filtradas = [...this.reservas];
            if (estado !== 'todos') filtradas = filtradas.filter(r => r.estado === estado);
            if (busqueda) filtradas = filtradas.filter(r => r.clienteNombre.toLowerCase().includes(busqueda));
            
            if (filtradas.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px;">No hay reservas para mostrar</div></div></tr>';
                return;
            }
            
            tbody.innerHTML = filtradas.map(r => `
                <tr>
                    <td>#${r.id}</td>
                    <td>${r.clienteNombre}</td>
                    <td>${this.formatearFecha(r.fecha)}</td>
                    <td>${r.hora}</td>
                    <td>Mesa #${r.mesaId}</td>
                    <td>${r.personas}</td>
                    <td><span class="badge ${r.estado === 'confirmada' ? 'badge-success' : 'badge-error'}">${r.estado === 'confirmada' ? 'Confirmada' : 'Cancelada'}</span></td>
                    <td>${r.estado === 'confirmada' ? `<button class="btn-sm btn-danger" onclick="adminDashboard.cancelarReservaAdmin(${r.id})">Cancelar</button>` : '-'}</td>
                </td>
            `).join('');
        };
        
        const aplicarBtn = document.getElementById('aplicarFiltrosReservas');
        const buscarInput = document.getElementById('buscarReserva');
        const estadoSelect = document.getElementById('filtroReservaEstado');
        
        if (aplicarBtn) aplicarBtn.addEventListener('click', render);
        if (buscarInput) buscarInput.addEventListener('input', render);
        if (estadoSelect) estadoSelect.addEventListener('change', render);
        
        render();
    }
    
    async cancelarReservaAdmin(id) {
        // Reemplazar confirm por modal o toast
        this.mostrarConfirmacion('¿Cancelar esta reserva?', async () => {
            this.mostrarLoader();
            try {
                await supabaseClient
                    .from('reservas')
                    .update({ estado_reserva: 'cancelada' })
                    .eq('id_reservas', id);
                this.mostrarNotificacion('Reserva cancelada', 'success');
                await this.cargarReservas();
                this.loadPage('reservas');
            } catch (error) {
                this.mostrarNotificacion('Error: ' + error.message, 'error');
            } finally {
                this.ocultarLoader();
            }
        });
    }
    
    renderAdministradores() {
        return `
            <div class="section-card">
                <div class="section-header">
                    <h3><i class="fas fa-user-shield"></i> Administradores del Sistema</h3>
                    <button id="nuevoAdminBtn" class="btn-primary" onclick="adminDashboard.abrirModalAdmin()">
                        <i class="fas fa-plus"></i> Nuevo Administrador
                    </button>
                </div>
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr><th>ID</th><th>Nombre</th><th>Email</th><th>Teléfono</th><th>Rol</th><th>Acciones</th></tr>
                        </thead>
                        <tbody>
                            ${this.administradores.map(admin => `
                                <tr>
                                    <td>#${admin.id}</td>
                                    <td>${admin.nombre}</td>
                                    <td>${admin.email}</td>
                                    <td>${admin.telefono || '-'}</td>
                                    <td><span class="badge badge-info">${admin.rol}</span></td>
                                    <td>
                                        <button class="btn-sm btn-outline-primary" onclick="adminDashboard.editarAdmin(${admin.id})">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        ${admin.id !== 1 ? `<button class="btn-sm btn-danger" onclick="adminDashboard.eliminarAdmin(${admin.id})">
                                            <i class="fas fa-trash"></i>
                                        </button>` : '<span class="badge badge-success">Principal</span>'}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }
    
    abrirModalAdmin(admin = null) {
        const modal = document.getElementById('adminModal');
        const title = document.getElementById('modalAdminTitle');
        const idField = document.getElementById('adminId');
        const nombreField = document.getElementById('adminNombre');
        const emailField = document.getElementById('adminEmail');
        const telefonoField = document.getElementById('adminTelefono');
        const passwordField = document.getElementById('adminPassword');
        const rolField = document.getElementById('adminRol');
        
        if (admin) {
            title.textContent = '✏️ Editar Administrador';
            idField.value = admin.id;
            nombreField.value = admin.nombre;
            emailField.value = admin.email;
            telefonoField.value = admin.telefono || '';
            passwordField.placeholder = 'Dejar en blanco para no cambiar';
            passwordField.required = false;
            rolField.value = admin.rol;
        } else {
            title.textContent = '➕ Nuevo Administrador';
            idField.value = '';
            nombreField.value = '';
            emailField.value = '';
            telefonoField.value = '';
            passwordField.value = '';
            passwordField.placeholder = 'Mínimo 6 caracteres';
            passwordField.required = true;
            rolField.value = 'administrador';
        }
        
        modal.classList.add('show');
    }
    
    cerrarModalAdmin() {
        const modal = document.getElementById('adminModal');
        modal.classList.remove('show');
        const form = document.getElementById('adminForm');
        if (form) form.reset();
    }
    
    async guardarAdmin() {
        const id = document.getElementById('adminId')?.value;
        const nombre = document.getElementById('adminNombre')?.value.trim();
        const email = document.getElementById('adminEmail')?.value.trim();
        const telefono = document.getElementById('adminTelefono')?.value.trim();
        const password = document.getElementById('adminPassword')?.value;
        const rol = document.getElementById('adminRol')?.value;
        
        if (!nombre || !email) {
            this.mostrarNotificacion('Nombre y email son requeridos', 'warning');
            return;
        }
        
        if (!id && (!password || password.length < 6)) {
            this.mostrarNotificacion('La contraseña debe tener al menos 6 caracteres', 'warning');
            return;
        }
        
        this.mostrarLoader();
        
        try {
            if (id) {
                const updateData = {
                    nombre_admin: nombre,
                    correo: email,
                    telefono: telefono || null,
                    rol: rol
                };
                if (password) {
                    updateData.contrasena = password;
                }
                const { error } = await supabaseClient
                    .from('administradores')
                    .update(updateData)
                    .eq('id_admin', parseInt(id));
                if (error) throw error;
                this.mostrarNotificacion('Administrador actualizado', 'success');
            } else {
                const { error } = await supabaseClient
                    .from('administradores')
                    .insert([{
                        nombre_admin: nombre,
                        correo: email,
                        telefono: telefono || null,
                        contrasena: password,
                        rol: rol
                    }]);
                if (error) throw error;
                this.mostrarNotificacion('Administrador creado', 'success');
            }
            
            this.cerrarModalAdmin();
            await this.cargarAdministradores();
            this.loadPage('administradores');
            
        } catch (error) {
            console.error('Error:', error);
            this.mostrarNotificacion('Error: ' + error.message, 'error');
        } finally {
            this.ocultarLoader();
        }
    }
    
    async editarAdmin(id) {
        const admin = this.administradores.find(a => a.id === id);
        if (admin) {
            this.abrirModalAdmin(admin);
        }
    }
    
    async eliminarAdmin(id) {
        const admin = this.administradores.find(a => a.id === id);
        if (!admin) return;
        
        if (admin.id === 1) {
            this.mostrarNotificacion('No se puede eliminar al administrador principal', 'warning');
            return;
        }
        
        this.mostrarConfirmacion(`¿Eliminar al administrador "${admin.nombre}"?`, async () => {
            this.mostrarLoader();
            try {
                const { error } = await supabaseClient
                    .from('administradores')
                    .delete()
                    .eq('id_admin', id);
                
                if (error) throw error;
                
                this.mostrarNotificacion('Administrador eliminado', 'success');
                await this.cargarAdministradores();
                this.loadPage('administradores');
                
            } catch (error) {
                console.error('Error:', error);
                this.mostrarNotificacion('Error: ' + error.message, 'error');
            } finally {
                this.ocultarLoader();
            }
        });
    }
    
    renderHistorial() {
        const actividades = [];
        
        this.reservas.forEach(r => {
            actividades.push({
                fecha: r.fecha,
                hora: r.hora,
                tipo: 'reserva',
                descripcion: `${r.estado === 'confirmada' ? '✅ Reserva creada' : '❌ Reserva cancelada'} por ${r.clienteNombre}`,
                usuario: r.clienteNombre
            });
        });
        
        this.clientes.forEach(c => {
            if (c.fechaRegistro) {
                actividades.push({
                    fecha: c.fechaRegistro.split('T')[0],
                    hora: '00:00',
                    tipo: 'cliente',
                    descripcion: `➕ Nuevo cliente registrado: ${c.nombre}`,
                    usuario: c.nombre
                });
            }
        });
        
        actividades.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        const historialReciente = actividades.slice(0, 20);
        
        if (historialReciente.length === 0) {
            return `
                <div class="section-card">
                    <div class="section-header">
                        <h3><i class="fas fa-history"></i> Historial del Sistema</h3>
                    </div>
                    <div style="text-align: center; padding: 60px;">
                        <i class="fas fa-clock" style="font-size: 3rem; color: #ccc;"></i>
                        <p>No hay actividad registrada</p>
                    </div>
                </div>
            `;
        }
        
        return `
            <div class="section-card">
                <div class="section-header">
                    <h3><i class="fas fa-history"></i> Historial del Sistema</h3>
                    <button class="btn-sm btn-outline-primary" onclick="adminDashboard.refrescarHistorial()">
                        <i class="fas fa-sync-alt"></i> Refrescar
                    </button>
                </div>
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr><th>Fecha/Hora</th><th>Tipo</th><th>Descripción</th><th>Usuario</th></tr>
                        </thead>
                        <tbody>
                            ${historialReciente.map(act => `
                                <tr>
                                    <td>${this.formatearFecha(act.fecha)} ${act.hora}</td>
                                    <td><span class="badge ${act.tipo === 'reserva' ? 'badge-info' : 'badge-success'}">${act.tipo === 'reserva' ? 'Reserva' : 'Cliente'}</span></td>
                                    <td>${act.descripcion}</td>
                                    <td><i class="fas fa-user"></i> ${act.usuario}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }
    
    refrescarHistorial() {
        this.cargarReservas();
        this.cargarClientes();
        this.loadPage('historial');
    }
    
    renderNotificacionesAdmin() {
        if (this.notificaciones.length === 0) {
            return `
                <div class="section-card">
                    <div class="section-header">
                        <h3><i class="fas fa-bell"></i> Notificaciones del Sistema</h3>
                    </div>
                    <div style="text-align: center; padding: 60px;">
                        <i class="fas fa-bell-slash" style="font-size: 3rem; color: #ccc;"></i>
                        <p>No hay notificaciones</p>
                    </div>
                </div>
            `;
        }
        
        return `
            <div class="section-card">
                <div class="section-header">
                    <h3><i class="fas fa-bell"></i> Notificaciones del Sistema</h3>
                    <button class="btn-sm btn-outline-primary" onclick="adminDashboard.refrescarNotificaciones()">
                        <i class="fas fa-sync-alt"></i> Refrescar
                    </button>
                </div>
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr><th>ID</th><th>Reserva</th><th>Correo</th><th>Mensaje</th><th>Fecha</th></tr>
                        </thead>
                        <tbody>
                            ${this.notificaciones.map(n => `
                                <tr>
                                    <td>#${n.id}</td>
                                    <td>#${n.reservaId}</td>
                                    <td>${n.correo}</td>
                                    <td>${n.mensaje}</td>
                                    <td>${this.formatearFechaHora(n.fecha)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }
    
    refrescarNotificaciones() {
        this.cargarNotificaciones();
        this.loadPage('notificaciones');
    }
    
    renderReportes() {
        const confirmadas = this.reservas.filter(r => r.estado === 'confirmada').length;
        const canceladas = this.reservas.filter(r => r.estado === 'cancelada').length;
        const mesasOcupadas = this.mesas.filter(m => m.estado === 'ocupada').length;
        
        return `
            <div class="charts-grid">
                <div class="chart-card">
                    <div class="chart-title">Estadísticas de Reservas</div>
                    <div style="text-align: center; padding: 30px;">
                        <div style="font-size: 3rem; font-weight: bold; color: #10b981;">${confirmadas}</div>
                        <div>Reservas Confirmadas</div>
                        <div style="font-size: 3rem; font-weight: bold; color: #ef4444; margin-top: 30px;">${canceladas}</div>
                        <div>Reservas Canceladas</div>
                    </div>
                </div>
                <div class="chart-card">
                    <div class="chart-title">Ocupación de Mesas</div>
                    <div style="text-align: center; padding: 30px;">
                        <div style="font-size: 3rem; font-weight: bold; color: #f59e0b;">${mesasOcupadas}</div>
                        <div>Mesas Ocupadas</div>
                        <div style="font-size: 3rem; font-weight: bold; color: #10b981; margin-top: 30px;">${this.mesas.length - mesasOcupadas}</div>
                        <div>Mesas Disponibles</div>
                    </div>
                </div>
            </div>
            <div class="activity-list" style="margin-top: 20px;">
                <div class="activity-header">
                    <h3><i class="fas fa-chart-simple"></i> Resumen General</h3>
                </div>
                <div class="stats-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;">
                    <div class="stat-card"><div><h4>Total Clientes</h4><div class="stat-number">${this.clientes.length}</div></div></div>
                    <div class="stat-card"><div><h4>Total Mesas</h4><div class="stat-number">${this.mesas.length}</div></div></div>
                    <div class="stat-card"><div><h4>Total Reservas</h4><div class="stat-number">${this.reservas.length}</div></div></div>
                </div>
            </div>
        `;
    }
    
    renderConfiguracion() {
        return `
            <div class="section-card">
                <div class="section-header">
                    <h3><i class="fas fa-cog"></i> Configuración del Sistema</h3>
                </div>
                <div style="padding: 20px;">
                    <p>Opciones de configuración próximamente...</p>
                </div>
            </div>
        `;
    }
    
    renderBackup() {
        return `
            <div class="section-card">
                <div class="section-header">
                    <h3><i class="fas fa-database"></i> Respaldo de Datos</h3>
                </div>
                <div style="text-align: center; padding: 60px;">
                    <i class="fas fa-database" style="font-size: 3rem; color: #8B5A2B;"></i>
                    <p>Funcionalidad de respaldo próximamente...</p>
                </div>
            </div>
        `;
    }
    
    // ============================================
    // UTILIDADES (Toast en lugar de alerts)
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
    
    mostrarConfirmacion(mensaje, onConfirm) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay show';
        modal.innerHTML = `
            <div class="modal" style="max-width: 400px;">
                <div class="modal-header">
                    <h3><i class="fas fa-question-circle"></i> Confirmar acción</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <p>${mensaje}</p>
                </div>
                <div class="modal-footer">
                    <button class="btn-outline-primary" id="confirmNo">Cancelar</button>
                    <button class="btn-primary" id="confirmYes">Aceptar</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const closeModal = () => modal.remove();
        modal.querySelector('.modal-close').onclick = closeModal;
        modal.querySelector('#confirmNo').onclick = closeModal;
        modal.querySelector('#confirmYes').onclick = () => {
            closeModal();
            if (onConfirm) onConfirm();
        };
        modal.onclick = (e) => { if (e.target === modal) closeModal(); };
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
let adminDashboard;
document.addEventListener('DOMContentLoaded', () => {
    adminDashboard = new AdminDashboard();
    window.adminDashboard = adminDashboard;
});