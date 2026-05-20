/**
 * Sistema de Reservas de Restaurante
 * Módulo de Gestión de Mesas (Admin) - Con Supabase
 * @version 2.1.0
 */

class GestionMesas {
    constructor() {
        this.mesas = [];
        this.mesasFiltradas = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.searchTerm = '';
        this.filtroEstado = 'todos';
        
        this.init();
    }
    
    async init() {
        if (!authService.isAuthenticated()) {
            window.location.href = 'login.html';
            return;
        }
        
        if (!authService.isAdmin()) {
            this.mostrarNotificacion('Acceso no autorizado', 'error');
            window.location.href = 'dashboard-cliente.html';
            return;
        }
        
        while (typeof supabaseClient === 'undefined' || !supabaseClient) {
            console.log('Esperando Supabase...');
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log('✅ Supabase listo');
        
        await this.cargarMesas();
        this.setupEventListeners();
        this.renderizarTabla();
        this.renderizarMapa();
        this.actualizarEstadisticas();
    }
    
    async cargarMesas() {
        this.mostrarLoader();
        
        try {
            if (typeof supabaseClient === 'undefined' || !supabaseClient) {
                throw new Error('Supabase no disponible');
            }
            
            console.log('Cargando mesas desde Supabase...');
            
            const { data, error } = await supabaseClient
                .from('mesas')
                .select('*')
                .order('id_mesa', { ascending: true });
            
            if (error) throw error;
            
            console.log('Mesas cargadas:', data);
            
            this.mesas = (data || []).map(m => ({
                id: m.id_mesa,
                capacidad: m.capacidad,
                ubicacion: m.ubicacion,
                estado: m.estado
            }));
            
            this.aplicarFiltros();
            
        } catch (error) {
            console.error('Error al cargar mesas:', error);
            this.mostrarNotificacion('Error al cargar mesas: ' + error.message, 'error');
            this.mesas = [];
        } finally {
            this.ocultarLoader();
        }
    }
    
    setupEventListeners() {
        const nuevaBtn = document.getElementById('nuevaMesaBtn');
        if (nuevaBtn) {
            nuevaBtn.addEventListener('click', () => this.abrirModal());
        }
        
        const buscarInput = document.getElementById('buscarMesa');
        if (buscarInput) {
            buscarInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.toLowerCase();
                this.currentPage = 1;
                this.aplicarFiltros();
                this.renderizarTabla();
                this.renderizarMapa();
            });
        }
        
        const filtroEstado = document.getElementById('filtroMesaEstado');
        if (filtroEstado) {
            filtroEstado.addEventListener('change', (e) => {
                this.filtroEstado = e.target.value;
                this.currentPage = 1;
                this.aplicarFiltros();
                this.renderizarTabla();
                this.renderizarMapa();
            });
        }
        
        const modalClose = document.querySelector('#mesaModal .modal-close');
        if (modalClose) {
            modalClose.addEventListener('click', () => this.cerrarModal());
        }
        
        const modal = document.getElementById('mesaModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.cerrarModal();
            });
        }
        
        const mesaForm = document.getElementById('mesaForm');
        if (mesaForm) {
            mesaForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.guardarMesa();
            });
        }
        
        const liberarTodasBtn = document.getElementById('liberarTodasBtn');
        if (liberarTodasBtn) {
            liberarTodasBtn.addEventListener('click', () => this.liberarTodasMesas());
        }
    }
    
    aplicarFiltros() {
        this.mesasFiltradas = this.mesas.filter(mesa => {
            const matchesSearch = this.searchTerm === '' || 
                mesa.id.toString().includes(this.searchTerm) ||
                mesa.ubicacion.toLowerCase().includes(this.searchTerm) ||
                mesa.capacidad.toString().includes(this.searchTerm);
            
            const matchesEstado = this.filtroEstado === 'todos' || 
                mesa.estado === this.filtroEstado;
            
            return matchesSearch && matchesEstado;
        });
    }
    
    renderizarMapa() {
        const mapaDiv = document.getElementById('mapaMesas');
        if (!mapaDiv) return;
        
        const mesasMostrar = this.mesasFiltradas.slice(0, 12);
        
        if (mesasMostrar.length === 0) {
            mapaDiv.innerHTML = '<div style="text-align: center; padding: 40px;">No hay mesas para mostrar</div>';
            return;
        }
        
        mapaDiv.innerHTML = mesasMostrar.map(mesa => `
            <div class="mapa-mesa ${mesa.estado}" onclick="gestionMesas.editarMesa(${mesa.id})">
                <div class="mapa-mesa-numero">#${mesa.id}</div>
                <div class="mapa-mesa-capacidad"><i class="fas fa-users"></i> ${mesa.capacidad} personas</div>
                <div class="mapa-mesa-ubicacion"><i class="fas fa-map-marker-alt"></i> ${mesa.ubicacion}</div>
                <div class="mapa-mesa-estado">
                    <span class="status-badge status-${mesa.estado}">${mesa.estado === 'disponible' ? 'Disponible' : 'Ocupada'}</span>
                </div>
            </div>
        `).join('');
    }
    
    renderizarTabla() {
        const tbody = document.getElementById('mesasTableBody');
        if (!tbody) return;
        
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        const mesasPagina = this.mesasFiltradas.slice(start, end);
        
        if (mesasPagina.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 60px;">
                        <i class="fas fa-chair" style="font-size: 3rem; color: #ccc; margin-bottom: 15px; display: block;"></i>
                        <p>No se encontraron mesas</p>
                        <button class="btn-primary btn-sm" onclick="gestionMesas.abrirModal()">
                            <i class="fas fa-plus"></i> Agregar Mesa
                        </button>
                    </div>
                </div>
            `;
            this.renderizarPaginacion();
            return;
        }
        
        tbody.innerHTML = mesasPagina.map(mesa => {
            const estadoInfo = this.getEstadoInfo(mesa.estado);
            return `
                <tr>
                    <td><strong>#${mesa.id}</strong></div>
                    <td>${mesa.capacidad} personas</div>
                    <td><i class="fas fa-map-marker-alt"></i> ${mesa.ubicacion}</div>
                    <td>
                        <span class="badge ${estadoInfo.class}">
                            <i class="fas ${estadoInfo.icon}"></i> ${estadoInfo.texto}
                        </span>
                    </div>
                    <td>
                        <button class="btn-sm btn-outline-primary" onclick="gestionMesas.editarMesa(${mesa.id})" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-sm btn-danger" onclick="gestionMesas.mostrarConfirmacionEliminar(${mesa.id})" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                        ${mesa.estado === 'disponible' ? 
                            `<button class="btn-sm btn-warning" onclick="gestionMesas.cambiarEstadoMesa(${mesa.id}, 'ocupada')" title="Ocupar">
                                <i class="fas fa-user-clock"></i>
                            </button>` :
                            `<button class="btn-sm btn-success" onclick="gestionMesas.cambiarEstadoMesa(${mesa.id}, 'disponible')" title="Liberar">
                                <i class="fas fa-check-circle"></i>
                            </button>`
                        }
                    </div>
                 </div>
            `;
        }).join('');
        
        this.renderizarPaginacion();
    }
    
    getEstadoInfo(estado) {
        const estados = {
            'disponible': { class: 'badge-success', icon: 'fa-check-circle', texto: 'Disponible' },
            'ocupada': { class: 'badge-warning', icon: 'fa-clock', texto: 'Ocupada' }
        };
        return estados[estado] || estados['disponible'];
    }
    
    renderizarPaginacion() {
        const paginationDiv = document.getElementById('mesasPagination');
        if (!paginationDiv) return;
        
        const totalPages = Math.ceil(this.mesasFiltradas.length / this.itemsPerPage);
        
        if (totalPages <= 1) {
            paginationDiv.innerHTML = '';
            return;
        }
        
        let html = '<div class="pagination">';
        html += `<button onclick="gestionMesas.cambiarPagina(${this.currentPage - 1})" ${this.currentPage === 1 ? 'disabled' : ''}>Anterior</button>`;
        
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
                html += `<button onclick="gestionMesas.cambiarPagina(${i})" class="${i === this.currentPage ? 'active' : ''}">${i}</button>`;
            } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
                html += '<span>...</span>';
            }
        }
        
        html += `<button onclick="gestionMesas.cambiarPagina(${this.currentPage + 1})" ${this.currentPage === totalPages ? 'disabled' : ''}>Siguiente</button>`;
        html += '</div>';
        paginationDiv.innerHTML = html;
    }
    
    cambiarPagina(page) {
        const totalPages = Math.ceil(this.mesasFiltradas.length / this.itemsPerPage);
        if (page < 1 || page > totalPages) return;
        this.currentPage = page;
        this.renderizarTabla();
        this.renderizarMapa();
    }
    
    abrirModal(mesa = null) {
        const modal = document.getElementById('mesaModal');
        const title = document.getElementById('modalMesaTitle');
        const idField = document.getElementById('mesaId');
        const capacidadField = document.getElementById('mesaCapacidad');
        const ubicacionField = document.getElementById('mesaUbicacion');
        const estadoField = document.getElementById('mesaEstado');
        
        if (mesa) {
            title.textContent = '✏️ Editar Mesa';
            idField.value = mesa.id;
            capacidadField.value = mesa.capacidad;
            ubicacionField.value = mesa.ubicacion;
            estadoField.value = mesa.estado;
        } else {
            title.textContent = '➕ Nueva Mesa';
            idField.value = '';
            capacidadField.value = '';
            ubicacionField.value = 'Salón principal';
            estadoField.value = 'disponible';
        }
        
        modal.classList.add('show');
    }
    
    cerrarModal() {
        const modal = document.getElementById('mesaModal');
        modal.classList.remove('show');
        const form = document.getElementById('mesaForm');
        if (form) form.reset();
    }
    
    async guardarMesa() {
        const id = document.getElementById('mesaId')?.value;
        const capacidad = document.getElementById('mesaCapacidad')?.value;
        const ubicacion = document.getElementById('mesaUbicacion')?.value;
        const estado = document.getElementById('mesaEstado')?.value;
        
        if (!capacidad) {
            this.mostrarNotificacion('La capacidad es requerida', 'warning');
            return;
        }
        
        if (capacidad < 1 || capacidad > 20) {
            this.mostrarNotificacion('La capacidad debe ser entre 1 y 20 personas', 'warning');
            return;
        }
        
        if (!ubicacion) {
            this.mostrarNotificacion('La ubicación es requerida', 'warning');
            return;
        }
        
        this.mostrarLoader();
        
        try {
            if (id) {
                await supabaseClient
                    .from('mesas')
                    .update({
                        capacidad: parseInt(capacidad),
                        ubicacion: ubicacion,
                        estado: estado
                    })
                    .eq('id_mesa', parseInt(id));
                this.mostrarNotificacion('Mesa actualizada', 'success');
            } else {
                await supabaseClient
                    .from('mesas')
                    .insert([{
                        capacidad: parseInt(capacidad),
                        ubicacion: ubicacion,
                        estado: estado
                    }]);
                this.mostrarNotificacion('Mesa creada', 'success');
            }
            
            this.cerrarModal();
            await this.cargarMesas();
            this.renderizarTabla();
            this.renderizarMapa();
            this.actualizarEstadisticas();
            
        } catch (error) {
            console.error('Error:', error);
            this.mostrarNotificacion('Error: ' + error.message, 'error');
        } finally {
            this.ocultarLoader();
        }
    }
    
    async editarMesa(id) {
        const mesa = this.mesas.find(m => m.id === id);
        if (mesa) this.abrirModal(mesa);
    }
    
    mostrarConfirmacionEliminar(id) {
        const mesa = this.mesas.find(m => m.id === id);
        if (!mesa) return;
        
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
                    <p>¿Estás seguro de eliminar la <strong>Mesa #${mesa.id}</strong>?</p>
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
            this.eliminarMesa(id);
        };
        modal.onclick = (e) => { if (e.target === modal) closeModal(); };
    }
    
    async eliminarMesa(id) {
        this.mostrarLoader();
        
        try {
            await supabaseClient
                .from('mesas')
                .delete()
                .eq('id_mesa', id);
            
            this.mostrarNotificacion('Mesa eliminada exitosamente', 'success');
            await this.cargarMesas();
            this.renderizarTabla();
            this.renderizarMapa();
            this.actualizarEstadisticas();
            
        } catch (error) {
            console.error('Error:', error);
            this.mostrarNotificacion('Error: ' + error.message, 'error');
        } finally {
            this.ocultarLoader();
        }
    }
    
    async cambiarEstadoMesa(id, nuevoEstado) {
        const mesa = this.mesas.find(m => m.id === id);
        if (!mesa) return;
        
        const accion = nuevoEstado === 'disponible' ? 'liberar' : 'ocupar';
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay show';
        modal.innerHTML = `
            <div class="modal" style="max-width: 400px;">
                <div class="modal-header">
                    <h3><i class="fas fa-question-circle"></i> Confirmar acción</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body" style="text-align: center;">
                    <i class="fas fa-chair" style="font-size: 3rem; color: #f59e0b; margin-bottom: 15px;"></i>
                    <p>¿Estás seguro de ${accion} la <strong>Mesa #${mesa.id}</strong>?</p>
                </div>
                <div class="modal-footer">
                    <button class="btn-outline-primary" id="cancelarAccion">Cancelar</button>
                    <button class="btn-primary" id="confirmarAccion">Confirmar</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const closeModal = () => modal.remove();
        modal.querySelector('.modal-close').onclick = closeModal;
        modal.querySelector('#cancelarAccion').onclick = closeModal;
        modal.querySelector('#confirmarAccion').onclick = () => {
            closeModal();
            this.ejecutarCambioEstado(id, nuevoEstado, accion);
        };
        modal.onclick = (e) => { if (e.target === modal) closeModal(); };
    }
    
    async ejecutarCambioEstado(id, nuevoEstado, accion) {
        this.mostrarLoader();
        
        try {
            await supabaseClient
                .from('mesas')
                .update({ estado: nuevoEstado })
                .eq('id_mesa', id);
            
            this.mostrarNotificacion(`Mesa ${accion}da exitosamente`, 'success');
            await this.cargarMesas();
            this.renderizarTabla();
            this.renderizarMapa();
            this.actualizarEstadisticas();
            
        } catch (error) {
            console.error('Error:', error);
            this.mostrarNotificacion('Error: ' + error.message, 'error');
        } finally {
            this.ocultarLoader();
        }
    }
    
    async liberarTodasMesas() {
        const mesasOcupadas = this.mesas.filter(m => m.estado === 'ocupada');
        
        if (mesasOcupadas.length === 0) {
            this.mostrarNotificacion('No hay mesas ocupadas para liberar', 'info');
            return;
        }
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay show';
        modal.innerHTML = `
            <div class="modal" style="max-width: 400px;">
                <div class="modal-header">
                    <h3><i class="fas fa-question-circle"></i> Confirmar acción</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body" style="text-align: center;">
                    <i class="fas fa-door-open" style="font-size: 3rem; color: #f59e0b; margin-bottom: 15px;"></i>
                    <p>¿Estás seguro de liberar todas las <strong>${mesasOcupadas.length}</strong> mesas ocupadas?</p>
                </div>
                <div class="modal-footer">
                    <button class="btn-outline-primary" id="cancelarAccion">Cancelar</button>
                    <button class="btn-primary" id="confirmarAccion">Confirmar</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const closeModal = () => modal.remove();
        modal.querySelector('.modal-close').onclick = closeModal;
        modal.querySelector('#cancelarAccion').onclick = closeModal;
        modal.querySelector('#confirmarAccion').onclick = () => {
            closeModal();
            this.ejecutarLiberarTodas(mesasOcupadas);
        };
        modal.onclick = (e) => { if (e.target === modal) closeModal(); };
    }
    
    async ejecutarLiberarTodas(mesasOcupadas) {
        this.mostrarLoader();
        
        try {
            for (const mesa of mesasOcupadas) {
                await supabaseClient
                    .from('mesas')
                    .update({ estado: 'disponible' })
                    .eq('id_mesa', mesa.id);
            }
            
            this.mostrarNotificacion('Todas las mesas fueron liberadas', 'success');
            await this.cargarMesas();
            this.renderizarTabla();
            this.renderizarMapa();
            this.actualizarEstadisticas();
            
        } catch (error) {
            console.error('Error:', error);
            this.mostrarNotificacion('Error al liberar mesas', 'error');
        } finally {
            this.ocultarLoader();
        }
    }
    
    actualizarEstadisticas() {
        const totalMesas = this.mesas.length;
        const mesasDisponibles = this.mesas.filter(m => m.estado === 'disponible').length;
        const mesasOcupadas = this.mesas.filter(m => m.estado === 'ocupada').length;
        const capacidadTotal = this.mesas.reduce((sum, m) => sum + m.capacidad, 0);
        const porcentajeOcupacion = totalMesas > 0 ? Math.round((mesasOcupadas / totalMesas) * 100) : 0;
        
        const statsDiv = document.getElementById('mesasStats');
        if (statsDiv) {
            statsDiv.innerHTML = `
                <div class="stats-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px;">
                    <div class="stat-card" style="text-align: center; padding: 20px; background: #f8f9fa; border-radius: 12px;">
                        <div style="font-size: 1.8rem; font-weight: bold; color: #8B5A2B;">${totalMesas}</div>
                        <div style="font-size: 0.8rem; color: #666;">Total Mesas</div>
                    </div>
                    <div class="stat-card" style="text-align: center; padding: 20px; background: #f8f9fa; border-radius: 12px;">
                        <div style="font-size: 1.8rem; font-weight: bold; color: #10b981;">${mesasDisponibles}</div>
                        <div style="font-size: 0.8rem; color: #666;">Disponibles</div>
                    </div>
                    <div class="stat-card" style="text-align: center; padding: 20px; background: #f8f9fa; border-radius: 12px;">
                        <div style="font-size: 1.8rem; font-weight: bold; color: #f59e0b;">${mesasOcupadas}</div>
                        <div style="font-size: 0.8rem; color: #666;">Ocupadas</div>
                    </div>
                    <div class="stat-card" style="text-align: center; padding: 20px; background: #f8f9fa; border-radius: 12px;">
                        <div style="font-size: 1.8rem; font-weight: bold; color: #8B5A2B;">${capacidadTotal}</div>
                        <div style="font-size: 0.8rem; color: #666;">Capacidad Total</div>
                    </div>
                </div>
                <div style="margin-top: 10px; background: #e5e7eb; border-radius: 10px; overflow: hidden;">
                    <div style="width: ${porcentajeOcupacion}%; height: 8px; background: linear-gradient(90deg, #8B5A2B, #DAA520);"></div>
                    <p style="text-align: center; margin-top: 10px; font-size: 0.85rem;">Ocupación actual: ${porcentajeOcupacion}%</p>
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
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    window.gestionMesas = new GestionMesas();
});