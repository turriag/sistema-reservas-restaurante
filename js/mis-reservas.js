/**
 * Sistema de Reservas de Restaurante
 * Módulo Unificado - Dashboard y Mis Reservas
 * @version 3.1.0
 */

class MisReservas {
    constructor() {
        this.reservas = [];
        this.reservasFiltradas = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.usuarioActual = null;
        this.filtroEstadoActual = 'todos';
        
        this.init();
    }
    
    async init() {
        let esperas = 0;
        while (typeof supabaseClient === 'undefined' || !supabaseClient) {
            await new Promise(resolve => setTimeout(resolve, 200));
            esperas++;
            if (esperas > 30) {
                const tbody = document.getElementById('reservasTableBody');
                if (tbody) {
                    tbody.innerHTML = `
                        <tr><td colspan="6" style="text-align: center; padding: 40px;">
                            <i class="fas fa-exclamation-triangle" style="font-size: 2rem; color: red;"></i>
                            <p>Error de conexión. Recarga la página.</p>
                            <button onclick="location.reload()" class="btn-primary">Recargar</button>
                         </div>
                         </div>
                    `;
                }
                return;
            }
        }
        
        if (!authService.isAuthenticated()) {
            window.location.href = 'login.html';
            return;
        }
        
        this.usuarioActual = authService.getCurrentUser();
        this.actualizarInfoUsuario();
        await this.cargarReservas();
    }
    
    actualizarInfoUsuario() {
        const nameSpan = document.getElementById('userName');
        const emailSpan = document.getElementById('userEmail');
        if (nameSpan) nameSpan.textContent = this.usuarioActual.nombre || 'Cliente';
        if (emailSpan) emailSpan.textContent = this.usuarioActual.email;
    }
    
    async cargarReservas() {
        this.mostrarLoader();
        
        try {
            const hoy = new Date().toISOString().split('T')[0];
            
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
                    observaciones,
                    mesas (id_mesa, ubicacion, capacidad)
                `)
                .eq('id_cliente', this.usuarioActual.id)
                .gte('fecha', hoy)
                .order('fecha', { ascending: true });
            
            if (error) throw error;
            
            this.reservas = (data || []).map(r => ({
                id: r.id_reservas,
                mesaId: r.id_mesa,
                fecha: r.fecha,
                hora: r.hora,
                personas: r.numero_personas,
                estado: r.estado_reserva,
                observaciones: r.observaciones || '',
                mesaInfo: r.mesas || { ubicacion: 'No especificada', capacidad: 0 }
            }));
            
            this.aplicarFiltro();
            this.actualizarEstadisticas();
            
        } catch (error) {
            console.error('Error:', error);
            this.reservas = [];
            this.renderizarTabla();
        } finally {
            this.ocultarLoader();
        }
    }
    
    aplicarFiltro() {
        if (this.filtroEstadoActual === 'confirmadas') {
            this.reservasFiltradas = this.reservas.filter(r => r.estado === 'confirmada');
        } else {
            this.reservasFiltradas = [...this.reservas];
        }
        this.renderizarTabla();
    }
    
    actualizarEstadisticas() {
        const total = this.reservas.length;
        const activas = this.reservas.filter(r => r.estado === 'confirmada').length;
        const hoy = new Date().toISOString().split('T')[0];
        const proximas = this.reservas.filter(r => r.estado === 'confirmada' && r.fecha >= hoy).length;
        
        const statsDiv = document.getElementById('reservasStats');
        if (statsDiv) {
            statsDiv.innerHTML = `
                <div class="stats-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 20px;">
                    <div class="stat-card" style="text-align: center; padding: 15px; background: #f8f9fa; border-radius: 12px;">
                        <div style="font-size: 1.8rem; font-weight: bold; color: #8B5A2B;">${total}</div>
                        <div style="font-size: 0.8rem; color: #666;">Total Reservas</div>
                    </div>
                    <div class="stat-card" style="text-align: center; padding: 15px; background: #f8f9fa; border-radius: 12px;">
                        <div style="font-size: 1.8rem; font-weight: bold; color: #10b981;">${activas}</div>
                        <div style="font-size: 0.8rem; color: #666;">Confirmadas</div>
                    </div>
                    <div class="stat-card" style="text-align: center; padding: 15px; background: #f8f9fa; border-radius: 12px;">
                        <div style="font-size: 1.8rem; font-weight: bold; color: #f59e0b;">${proximas}</div>
                        <div style="font-size: 0.8rem; color: #666;">Próximas</div>
                    </div>
                    <div class="stat-card" style="text-align: center; padding: 15px; background: #f8f9fa; border-radius: 12px;">
                        <div style="font-size: 1.8rem; font-weight: bold; color: #ef4444;">${this.reservas.filter(r => r.estado === 'cancelada').length}</div>
                        <div style="font-size: 0.8rem; color: #666;">Canceladas</div>
                    </div>
                </div>
            `;
        }
    }
    
    renderizarTabla() {
        const tbody = document.getElementById('reservasTableBody');
        if (!tbody) return;
        
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        const reservasPagina = this.reservasFiltradas.slice(start, end);
        
        if (reservasPagina.length === 0) {
            tbody.innerHTML = `
                <tr><td colspan="6" style="text-align: center; padding: 40px;">
                    <i class="fas fa-calendar-times" style="font-size: 2rem; color: #ccc; margin-bottom: 10px; display: block;"></i>
                    <p>No tienes reservas</p>
                    <a href="crear-reserva.html" class="btn-primary btn-sm" style="margin-top: 10px; display: inline-block;">Hacer una reserva</a>
                 </div>
                 </div>
            `;
            this.renderizarPaginacion();
            return;
        }
        
        tbody.innerHTML = reservasPagina.map(reserva => {
            const puedeCancelar = this.puedeCancelarReserva(reserva);
            const fechaObj = new Date(reserva.fecha);
            const fechaFormateada = fechaObj.toLocaleDateString('es-CO');
            const estadoClass = reserva.estado === 'confirmada' ? 'badge-success' : 'badge-error';
            const estadoIcon = reserva.estado === 'confirmada' ? 'fa-check-circle' : 'fa-times-circle';
            const estadoTexto = reserva.estado === 'confirmada' ? 'Confirmada' : 'Cancelada';
            
            return `
                <tr>
                    <td><strong>#${reserva.id}</strong></div>
                    <td>${fechaFormateada}<br><small>${reserva.hora}</small></div>
                    <td>Mesa #${reserva.mesaId}<br><small>${reserva.mesaInfo?.ubicacion || 'N/A'}</small></div>
                    <td>${reserva.personas} ${reserva.personas === 1 ? 'persona' : 'personas'}</div>
                    <td><span class="badge ${estadoClass}"><i class="fas ${estadoIcon}"></i> ${estadoTexto}</span></div>
                    <td>
                        <div style="display: flex; gap: 8px;">
                            <button class="btn-sm btn-outline-primary" onclick="misReservas.verDetalle(${reserva.id})">
                                <i class="fas fa-eye"></i> Ver
                            </button>
                            ${puedeCancelar ? `<button class="btn-sm btn-danger" onclick="misReservas.mostrarConfirmacionCancelar(${reserva.id})">
                                <i class="fas fa-times"></i> Cancelar
                            </button>` : ''}
                        </div>
                    </div>
                 </div>
            `;
        }).join('');
        
        this.renderizarPaginacion();
    }
    
    renderizarPaginacion() {
        const paginationDiv = document.getElementById('reservasPagination');
        if (!paginationDiv) return;
        
        const totalPages = Math.ceil(this.reservasFiltradas.length / this.itemsPerPage);
        if (totalPages <= 1) {
            paginationDiv.innerHTML = '';
            return;
        }
        
        let html = '<div class="pagination">';
        html += `<button onclick="misReservas.cambiarPagina(${this.currentPage - 1})" ${this.currentPage === 1 ? 'disabled' : ''}>Anterior</button>`;
        
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
                html += `<button onclick="misReservas.cambiarPagina(${i})" class="${i === this.currentPage ? 'active' : ''}">${i}</button>`;
            } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
                html += '<span>...</span>';
            }
        }
        
        html += `<button onclick="misReservas.cambiarPagina(${this.currentPage + 1})" ${this.currentPage === totalPages ? 'disabled' : ''}>Siguiente</button>`;
        html += '</div>';
        paginationDiv.innerHTML = html;
    }
    
    cambiarPagina(page) {
        const totalPages = Math.ceil(this.reservasFiltradas.length / this.itemsPerPage);
        if (page < 1 || page > totalPages) return;
        this.currentPage = page;
        this.renderizarTabla();
    }
    
    verTodas() {
        this.filtroEstadoActual = 'todos';
        this.currentPage = 1;
        this.aplicarFiltro();
    }
    
    filtrarConfirmadas() {
        this.filtroEstadoActual = 'confirmadas';
        this.currentPage = 1;
        this.aplicarFiltro();
    }
    
    verProximas() {
        this.filtrarConfirmadas();
    }
    
    verNotificaciones() {
        this.mostrarNotificacion('📬 Centro de notificaciones próximamente', 'info');
    }
    
    puedeCancelarReserva(reserva) {
        if (reserva.estado !== 'confirmada') return false;
        const fechaReserva = new Date(`${reserva.fecha}T${reserva.hora}`);
        const ahora = new Date();
        const horasDiferencia = (fechaReserva - ahora) / (1000 * 60 * 60);
        return horasDiferencia > 1;
    }
    
    mostrarConfirmacionCancelar(id) {
        const reserva = this.reservas.find(r => r.id === id);
        if (!reserva || !this.puedeCancelarReserva(reserva)) {
            this.mostrarNotificacion('❌ No se puede cancelar esta reserva. Debe hacerse con al menos 1 hora de anticipación.', 'error');
            return;
        }
        
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
                    <p>¿Estás seguro de cancelar la reserva del <strong>${new Date(reserva.fecha).toLocaleDateString('es-CO')}</strong> a las <strong>${reserva.hora}</strong>?</p>
                    <p style="font-size: 0.8rem; color: #666;">Esta acción no se puede deshacer.</p>
                </div>
                <div class="modal-footer">
                    <button class="btn-outline-primary" id="cancelarCancelacion">No, mantener</button>
                    <button class="btn-danger" id="confirmarCancelacion">Sí, cancelar</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const closeModal = () => modal.remove();
        modal.querySelector('.modal-close').onclick = closeModal;
        modal.querySelector('#cancelarCancelacion').onclick = closeModal;
        modal.querySelector('#confirmarCancelacion').onclick = () => {
            closeModal();
            this.ejecutarCancelarReserva(id);
        };
        modal.onclick = (e) => { if (e.target === modal) closeModal(); };
    }
    
    async ejecutarCancelarReserva(id) {
        this.mostrarLoader();
        
        try {
            await supabaseClient
                .from('reservas')
                .update({ estado_reserva: 'cancelada' })
                .eq('id_reservas', id);
            
            this.mostrarNotificacion('✅ Reserva cancelada exitosamente', 'success');
            await this.cargarReservas();
            
        } catch (error) {
            this.mostrarNotificacion('Error: ' + error.message, 'error');
        } finally {
            this.ocultarLoader();
        }
    }
    
    verDetalle(id) {
        const reserva = this.reservas.find(r => r.id === id);
        if (!reserva) return;
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay show';
        modal.innerHTML = `
            <div class="modal" style="max-width: 450px;">
                <div class="modal-header">
                    <h3><i class="fas fa-calendar-check"></i> Detalle de Reserva #${reserva.id}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="display: grid; gap: 12px;">
                        <div style="display: flex; justify-content: space-between; padding: 8px; background: #f8f9fa; border-radius: 8px;">
                            <span><strong>📅 Fecha:</strong></span>
                            <span>${new Date(reserva.fecha).toLocaleDateString('es-CO')}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 8px; background: #f8f9fa; border-radius: 8px;">
                            <span><strong>⏰ Hora:</strong></span>
                            <span>${reserva.hora}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 8px; background: #f8f9fa; border-radius: 8px;">
                            <span><strong>🪑 Mesa:</strong></span>
                            <span>#${reserva.mesaId} - ${reserva.mesaInfo?.ubicacion || 'N/A'}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 8px; background: #f8f9fa; border-radius: 8px;">
                            <span><strong>👥 Personas:</strong></span>
                            <span>${reserva.personas}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 8px; background: #f8f9fa; border-radius: 8px;">
                            <span><strong>📝 Estado:</strong></span>
                            <span class="badge ${reserva.estado === 'confirmada' ? 'badge-success' : 'badge-error'}">${reserva.estado === 'confirmada' ? 'Confirmada' : 'Cancelada'}</span>
                        </div>
                        ${reserva.observaciones ? `
                            <div style="padding: 8px; background: #f8f9fa; border-radius: 8px;">
                                <strong>💬 Observaciones:</strong>
                                <p style="margin-top: 5px; font-size: 0.85rem;">${reserva.observaciones}</p>
                            </div>
                        ` : ''}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-primary" onclick="this.closest('.modal-overlay').remove()">Cerrar</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.querySelector('.modal-close').onclick = () => modal.remove();
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
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
let misReservas;
document.addEventListener('DOMContentLoaded', () => {
    misReservas = new MisReservas();
    window.misReservas = misReservas;
});