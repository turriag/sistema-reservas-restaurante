/**
 * Sistema de Reservas de Restaurante
 * Módulo de Gestión de Clientes (Admin) - Con Supabase
 * @version 2.1.0
 */

class GestionClientes {
    constructor() {
        this.clientes = [];
        this.clientesFiltrados = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.searchTerm = '';
        this.filtroEstado = 'todos';
        
        this.init();
    }
    
    async init() {
        // Verificar autenticación y rol de admin
        if (!authService.isAuthenticated()) {
            window.location.href = 'login.html';
            return;
        }
        
        if (!authService.isAdmin()) {
            this.mostrarNotificacion('Acceso no autorizado', 'error');
            window.location.href = 'dashboard-cliente.html';
            return;
        }
        
        // Esperar a que Supabase esté disponible
        let esperas = 0;
        while (typeof supabaseClient === 'undefined' || !supabaseClient) {
            console.log('Esperando Supabase...');
            await new Promise(resolve => setTimeout(resolve, 100));
            esperas++;
            if (esperas > 50) {
                console.error('Timeout esperando Supabase');
                this.mostrarNotificacion('Error de conexión. Recarga la página.', 'error');
                return;
            }
        }
        
        console.log('✅ Supabase listo');
        
        await this.cargarClientes();
        this.setupEventListeners();
        this.renderizarTabla();
        this.actualizarEstadisticas();
    }
    
    async cargarClientes() {
        this.mostrarLoader();
        
        try {
            if (typeof supabaseClient === 'undefined' || !supabaseClient) {
                throw new Error('Supabase no disponible');
            }
            
            console.log('Cargando clientes desde Supabase...');
            
            const { data, error } = await supabaseClient
                .from('clientes')
                .select('*')
                .order('id_cliente', { ascending: true });
            
            if (error) throw error;
            
            console.log('Clientes cargados:', data);
            
            this.clientes = (data || []).map(c => ({
                id: c.id_cliente,
                nombre: c.nombre_cliente,
                email: c.correo,
                telefono: c.telefono || '',
                fechaRegistro: c.fecha_registro,
                estado: c.estado || 'activo'
            }));
            
            this.aplicarFiltros();
            
        } catch (error) {
            console.error('Error al cargar clientes:', error);
            this.mostrarNotificacion('Error al cargar clientes: ' + error.message, 'error');
            this.clientes = [];
        } finally {
            this.ocultarLoader();
        }
    }
    
    setupEventListeners() {
        const nuevoBtn = document.getElementById('nuevoClienteBtn');
        if (nuevoBtn) {
            nuevoBtn.addEventListener('click', () => this.abrirModal());
        }
        
        const buscarInput = document.getElementById('buscarCliente');
        if (buscarInput) {
            buscarInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.toLowerCase();
                this.currentPage = 1;
                this.aplicarFiltros();
                this.renderizarTabla();
            });
        }
        
        const filtroEstado = document.getElementById('filtroClienteEstado');
        if (filtroEstado) {
            filtroEstado.addEventListener('change', (e) => {
                this.filtroEstado = e.target.value;
                this.currentPage = 1;
                this.aplicarFiltros();
                this.renderizarTabla();
            });
        }
        
        const modalClose = document.querySelector('#clienteModal .modal-close');
        if (modalClose) {
            modalClose.addEventListener('click', () => this.cerrarModal());
        }
        
        const modal = document.getElementById('clienteModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.cerrarModal();
            });
        }
        
        const clienteForm = document.getElementById('clienteForm');
        if (clienteForm) {
            clienteForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.guardarCliente();
            });
        }
    }
    
    aplicarFiltros() {
        this.clientesFiltrados = this.clientes.filter(cliente => {
            const matchesSearch = this.searchTerm === '' || 
                cliente.nombre.toLowerCase().includes(this.searchTerm) ||
                cliente.email.toLowerCase().includes(this.searchTerm) ||
                (cliente.telefono && cliente.telefono.includes(this.searchTerm));
            
            const matchesEstado = this.filtroEstado === 'todos' || 
                cliente.estado === this.filtroEstado;
            
            return matchesSearch && matchesEstado;
        });
    }
    
    renderizarTabla() {
        const tbody = document.getElementById('clientesTableBody');
        if (!tbody) return;
        
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        const clientesPagina = this.clientesFiltrados.slice(start, end);
        
        if (clientesPagina.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 60px;">
                        <i class="fas fa-users" style="font-size: 3rem; color: #ccc; margin-bottom: 15px; display: block;"></i>
                        <p>No se encontraron clientes</p>
                        <button class="btn-primary btn-sm" onclick="gestionClientes.abrirModal()">
                            <i class="fas fa-plus"></i> Agregar Cliente
                        </button>
                    </div>
                </div>
            `;
            this.renderizarPaginacion();
            return;
        }
        
        tbody.innerHTML = clientesPagina.map(cliente => `
            <tr>
                <td><strong>#${cliente.id}</strong></div>
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 35px; height: 35px; background: linear-gradient(135deg, #f5e6d3, #f0d5b5); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                            <i class="fas fa-user" style="color: #8b5a2b;"></i>
                        </div>
                        <div>
                            <strong>${cliente.nombre}</strong>
                            <div style="font-size: 0.7rem; color: #666;">ID: ${cliente.id}</div>
                        </div>
                    </div>
                 </div>
                <td><i class="fas fa-envelope"></i> ${cliente.email}</div>
                <td><i class="fas fa-phone"></i> ${cliente.telefono || 'No registrado'}</div>
                <td>${this.formatearFecha(cliente.fechaRegistro)}</div>
                <td>
                    <span class="badge ${cliente.estado === 'activo' ? 'badge-success' : 'badge-error'}">
                        <i class="fas ${cliente.estado === 'activo' ? 'fa-check-circle' : 'fa-times-circle'}"></i>
                        ${cliente.estado === 'activo' ? 'Activo' : 'Inactivo'}
                    </span>
                 </div>
                <td>
                    <button class="btn-sm btn-outline-primary" onclick="gestionClientes.editarCliente(${cliente.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-sm btn-danger" onclick="gestionClientes.mostrarConfirmacionEliminar(${cliente.id})" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                 </div>
             </div>
        `).join('');
        
        this.renderizarPaginacion();
    }
    
    renderizarPaginacion() {
        const paginationDiv = document.getElementById('clientesPagination');
        if (!paginationDiv) return;
        
        const totalPages = Math.ceil(this.clientesFiltrados.length / this.itemsPerPage);
        
        if (totalPages <= 1) {
            paginationDiv.innerHTML = '';
            return;
        }
        
        let html = '<div class="pagination">';
        html += `<button onclick="gestionClientes.cambiarPagina(${this.currentPage - 1})" ${this.currentPage === 1 ? 'disabled' : ''}>Anterior</button>`;
        
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
                html += `<button onclick="gestionClientes.cambiarPagina(${i})" class="${i === this.currentPage ? 'active' : ''}">${i}</button>`;
            } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
                html += '<span>...</span>';
            }
        }
        
        html += `<button onclick="gestionClientes.cambiarPagina(${this.currentPage + 1})" ${this.currentPage === totalPages ? 'disabled' : ''}>Siguiente</button>`;
        html += '</div>';
        paginationDiv.innerHTML = html;
    }
    
    cambiarPagina(page) {
        const totalPages = Math.ceil(this.clientesFiltrados.length / this.itemsPerPage);
        if (page < 1 || page > totalPages) return;
        this.currentPage = page;
        this.renderizarTabla();
    }
    
    abrirModal(cliente = null) {
        const modal = document.getElementById('clienteModal');
        const title = document.getElementById('modalClienteTitle');
        const idField = document.getElementById('clienteId');
        const nombreField = document.getElementById('clienteNombre');
        const emailField = document.getElementById('clienteEmail');
        const telefonoField = document.getElementById('clienteTelefono');
        const estadoField = document.getElementById('clienteEstado');
        
        if (cliente) {
            title.textContent = '✏️ Editar Cliente';
            idField.value = cliente.id;
            nombreField.value = cliente.nombre;
            emailField.value = cliente.email;
            telefonoField.value = cliente.telefono || '';
            estadoField.value = cliente.estado;
        } else {
            title.textContent = '➕ Nuevo Cliente';
            idField.value = '';
            nombreField.value = '';
            emailField.value = '';
            telefonoField.value = '';
            estadoField.value = 'activo';
        }
        
        modal.classList.add('show');
    }
    
    cerrarModal() {
        const modal = document.getElementById('clienteModal');
        modal.classList.remove('show');
        const form = document.getElementById('clienteForm');
        if (form) form.reset();
    }
    
    async guardarCliente() {
        const id = document.getElementById('clienteId')?.value;
        const nombre = document.getElementById('clienteNombre')?.value.trim();
        const email = document.getElementById('clienteEmail')?.value.trim();
        const telefono = document.getElementById('clienteTelefono')?.value.trim();
        const estado = document.getElementById('clienteEstado')?.value;
        
        if (!nombre) {
            this.mostrarNotificacion('El nombre es requerido', 'warning');
            return;
        }
        
        if (!email) {
            this.mostrarNotificacion('El email es requerido', 'warning');
            return;
        }
        
        if (!email.includes('@') || !email.includes('.')) {
            this.mostrarNotificacion('Email inválido', 'warning');
            return;
        }
        
        if (telefono && (telefono.length < 10 || telefono.length > 10)) {
            this.mostrarNotificacion('Teléfono inválido (debe ser 10 dígitos)', 'warning');
            return;
        }
        
        this.mostrarLoader();
        
        try {
            if (id) {
                await supabaseClient
                    .from('clientes')
                    .update({
                        nombre_cliente: nombre,
                        correo: email,
                        telefono: telefono || null,
                        estado: estado
                    })
                    .eq('id_cliente', parseInt(id));
                this.mostrarNotificacion('Cliente actualizado', 'success');
            } else {
                await supabaseClient
                    .from('clientes')
                    .insert([{
                        nombre_cliente: nombre,
                        correo: email,
                        telefono: telefono || null,
                        estado: estado,
                        fecha_registro: new Date().toISOString()
                    }]);
                this.mostrarNotificacion('Cliente creado', 'success');
            }
            
            this.cerrarModal();
            await this.cargarClientes();
            this.renderizarTabla();
            this.actualizarEstadisticas();
            
        } catch (error) {
            console.error('Error:', error);
            this.mostrarNotificacion('Error: ' + error.message, 'error');
        } finally {
            this.ocultarLoader();
        }
    }
    
    async editarCliente(id) {
        const cliente = this.clientes.find(c => c.id === id);
        if (cliente) this.abrirModal(cliente);
    }
    
    mostrarConfirmacionEliminar(id) {
        const cliente = this.clientes.find(c => c.id === id);
        if (!cliente) return;
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay show';
        modal.innerHTML = `
            <div class="modal" style="max-width: 400px;">
                <div class="modal-header">
                    <h3><i class="fas fa-question-circle"></i> Confirmar eliminación</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body" style="text-align: center;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #f59e0b; margin-bottom: 15px;"></i>
                    <p>¿Estás seguro de eliminar a <strong>${cliente.nombre}</strong>?</p>
                    <p style="font-size: 0.8rem; color: #666;">Se eliminarán también todas sus reservas asociadas.</p>
                    <p style="font-size: 0.8rem; color: #ef4444;">Esta acción no se puede deshacer.</p>
                </div>
                <div class="modal-footer">
                    <button class="btn-outline-primary" id="cancelarEliminar">Cancelar</button>
                    <button class="btn-danger" id="confirmarEliminar">Eliminar</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const closeModal = () => modal.remove();
        modal.querySelector('.modal-close').onclick = closeModal;
        modal.querySelector('#cancelarEliminar').onclick = closeModal;
        modal.querySelector('#confirmarEliminar').onclick = () => {
            closeModal();
            this.eliminarCliente(id);
        };
        modal.onclick = (e) => { if (e.target === modal) closeModal(); };
    }
    
    async eliminarCliente(id) {
        this.mostrarLoader();
        
        try {
            await supabaseClient
                .from('clientes')
                .delete()
                .eq('id_cliente', id);
            
            this.mostrarNotificacion('Cliente eliminado exitosamente', 'success');
            await this.cargarClientes();
            this.renderizarTabla();
            this.actualizarEstadisticas();
            
        } catch (error) {
            console.error('Error:', error);
            this.mostrarNotificacion('Error: ' + error.message, 'error');
        } finally {
            this.ocultarLoader();
        }
    }
    
    actualizarEstadisticas() {
        const totalClientes = this.clientes.length;
        const clientesActivos = this.clientes.filter(c => c.estado === 'activo').length;
        const clientesInactivos = this.clientes.filter(c => c.estado === 'inactivo').length;
        
        const statsDiv = document.getElementById('clientesStats');
        if (statsDiv) {
            statsDiv.innerHTML = `
                <div class="stats-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px;">
                    <div class="stat-card" style="text-align: center; padding: 20px; background: #f8f9fa; border-radius: 12px;">
                        <div style="font-size: 1.8rem; font-weight: bold; color: #8B5A2B;">${totalClientes}</div>
                        <div style="font-size: 0.8rem; color: #666;">Total Clientes</div>
                    </div>
                    <div class="stat-card" style="text-align: center; padding: 20px; background: #f8f9fa; border-radius: 12px;">
                        <div style="font-size: 1.8rem; font-weight: bold; color: #10b981;">${clientesActivos}</div>
                        <div style="font-size: 0.8rem; color: #666;">Activos</div>
                    </div>
                    <div class="stat-card" style="text-align: center; padding: 20px; background: #f8f9fa; border-radius: 12px;">
                        <div style="font-size: 1.8rem; font-weight: bold; color: #ef4444;">${clientesInactivos}</div>
                        <div style="font-size: 0.8rem; color: #666;">Inactivos</div>
                    </div>
                </div>
            `;
        }
    }
    
    // ============================================
    // UTILIDADES
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
        if (!fecha) return 'N/A';
        return new Date(fecha).toLocaleDateString('es-CO');
    }
}

// Inicializar
let gestionClientes;
document.addEventListener('DOMContentLoaded', () => {
    gestionClientes = new GestionClientes();
    window.gestionClientes = gestionClientes;
});