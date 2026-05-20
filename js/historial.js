/**
 * Sistema de Reservas de Restaurante
 * Módulo de Historial del Sistema (Admin)
 * @version 1.0.0
 */

class Historial {
    constructor() {
        this.historial = [];
        this.historialFiltrado = [];
        this.currentPage = 1;
        this.itemsPerPage = 15;
        this.filtros = {
            fechaInicio: '',
            fechaFin: '',
            tipo: 'todos',
            usuario: ''
        };
        
        this.init();
    }
    
    async init() {
        // Verificar autenticación y rol de admin
        if (!authService.isAuthenticated()) {
            window.location.href = 'login.html';
            return;
        }
        
        if (!authService.isAdmin()) {
            utils.mostrarNotificacion('Acceso no autorizado', 'error');
            window.location.href = 'dashboard-cliente.html';
            return;
        }
        
        await this.cargarHistorial();
        this.setupEventListeners();
        this.configurarFechas();
    }
    
    async cargarHistorial() {
        utils.mostrarLoader();
        
        try {
            // Simular carga de historial desde múltiples fuentes
            const [clientesRes, mesasRes, reservasRes] = await Promise.all([
                api.getClientes(),
                api.getMesas(),
                api.getReservas()
            ]);
            
            if (clientesRes.success && mesasRes.success && reservasRes.success) {
                this.generarHistorial(clientesRes.data, mesasRes.data, reservasRes.data);
                this.aplicarFiltros();
                this.renderizarTabla();
                this.actualizarEstadisticas();
            } else {
                utils.mostrarNotificacion('Error al cargar el historial', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            utils.mostrarNotificacion('Error al conectar con el servidor', 'error');
        } finally {
            utils.ocultarLoader();
        }
    }
    
    generarHistorial(clientes, mesas, reservas) {
        this.historial = [];
        
        // Registrar creación de clientes
        clientes.forEach(cliente => {
            this.historial.push({
                id: `c-${cliente.id}`,
                fecha: cliente.fechaRegistro || new Date().toISOString().split('T')[0],
                hora: '00:00',
                tipo: 'cliente',
                tipoIcono: 'fa-user-plus',
                tipoColor: 'success',
                descripcion: `Cliente registrado: ${cliente.nombre}`,
                detalles: {
                    id: cliente.id,
                    nombre: cliente.nombre,
                    email: cliente.email,
                    telefono: cliente.telefono
                },
                usuario: 'Sistema'
            });
        });
        
        // Registrar creación de mesas
        mesas.forEach(mesa => {
            this.historial.push({
                id: `m-${mesa.id}`,
                fecha: new Date().toISOString().split('T')[0],
                hora: '00:00',
                tipo: 'mesa',
                tipoIcono: 'fa-chair',
                tipoColor: 'info',
                descripcion: `Mesa creada: #${mesa.id} (${mesa.capacidad} personas, ${mesa.ubicacion})`,
                detalles: mesa,
                usuario: 'Sistema'
            });
        });
        
        // Registrar reservas
        reservas.forEach(reserva => {
            // Asumir que las reservas tienen fecha de creación o usar la fecha de la reserva
            this.historial.push({
                id: `r-${reserva.id}`,
                fecha: reserva.fechaCreacion || reserva.fecha,
                hora: reserva.hora || '12:00',
                tipo: 'reserva',
                tipoIcono: 'fa-calendar-plus',
                tipoColor: reserva.estado === 'confirmada' ? 'success' : 'error',
                descripcion: `Reserva ${reserva.estado === 'confirmada' ? 'creada' : 'cancelada'}: ${reserva.clienteNombre} - Mesa #${reserva.mesaId}`,
                detalles: reserva,
                usuario: reserva.clienteNombre || 'Cliente'
            });
        });
        
        // Ordenar por fecha descendente
        this.historial.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    }
    
    setupEventListeners() {
        // Filtro fecha inicio
        const fechaInicio = document.getElementById('historialFechaInicio');
        if (fechaInicio) {
            fechaInicio.addEventListener('change', (e) => {
                this.filtros.fechaInicio = e.target.value;
                this.aplicarFiltros();
                this.renderizarTabla();
            });
        }
        
        // Filtro fecha fin
        const fechaFin = document.getElementById('historialFechaFin');
        if (fechaFin) {
            fechaFin.addEventListener('change', (e) => {
                this.filtros.fechaFin = e.target.value;
                this.aplicarFiltros();
                this.renderizarTabla();
            });
        }
        
        // Filtro tipo
        const tipoSelect = document.getElementById('historialTipo');
        if (tipoSelect) {
            tipoSelect.addEventListener('change', (e) => {
                this.filtros.tipo = e.target.value;
                this.aplicarFiltros();
                this.renderizarTabla();
            });
        }
        
        // Botón aplicar filtros
        const aplicarBtn = document.getElementById('aplicarFiltrosHistorial');
        if (aplicarBtn) {
            aplicarBtn.addEventListener('click', () => {
                this.aplicarFiltros();
                this.renderizarTabla();
            });
        }
        
        // Botón limpiar filtros
        const limpiarBtn = document.getElementById('limpiarFiltrosHistorial');
        if (limpiarBtn) {
            limpiarBtn.addEventListener('click', () => {
                this.limpiarFiltros();
                this.aplicarFiltros();
                this.renderizarTabla();
            });
        }
        
        // Botón exportar historial
        const exportarBtn = document.getElementById('exportarHistorial');
        if (exportarBtn) {
            exportarBtn.addEventListener('click', () => this.exportarHistorial());
        }
        
        // Botón refrescar
        const refrescarBtn = document.getElementById('refrescarHistorial');
        if (refrescarBtn) {
            refrescarBtn.addEventListener('click', () => this.cargarHistorial());
        }
    }
    
    configurarFechas() {
        // Establecer fechas por defecto (últimos 30 días)
        const fechaFin = new Date();
        const fechaInicio = new Date();
        fechaInicio.setDate(fechaInicio.getDate() - 30);
        
        const fechaInicioInput = document.getElementById('historialFechaInicio');
        const fechaFinInput = document.getElementById('historialFechaFin');
        
        if (fechaInicioInput) {
            fechaInicioInput.value = fechaInicio.toISOString().split('T')[0];
            this.filtros.fechaInicio = fechaInicioInput.value;
        }
        
        if (fechaFinInput) {
            fechaFinInput.value = fechaFin.toISOString().split('T')[0];
            this.filtros.fechaFin = fechaFinInput.value;
        }
    }
    
    aplicarFiltros() {
        this.historialFiltrado = this.historial.filter(item => {
            // Filtro por fecha
            if (this.filtros.fechaInicio && item.fecha < this.filtros.fechaInicio) return false;
            if (this.filtros.fechaFin && item.fecha > this.filtros.fechaFin) return false;
            
            // Filtro por tipo
            if (this.filtros.tipo !== 'todos' && item.tipo !== this.filtros.tipo) return false;
            
            // Filtro por usuario (búsqueda)
            if (this.filtros.usuario && !item.usuario.toLowerCase().includes(this.filtros.usuario.toLowerCase())) return false;
            
            return true;
        });
    }
    
    limpiarFiltros() {
        this.filtros = {
            fechaInicio: '',
            fechaFin: '',
            tipo: 'todos',
            usuario: ''
        };
        
        // Limpiar inputs
        const fechaInicioInput = document.getElementById('historialFechaInicio');
        const fechaFinInput = document.getElementById('historialFechaFin');
        const tipoSelect = document.getElementById('historialTipo');
        const usuarioInput = document.getElementById('buscarUsuario');
        
        if (fechaInicioInput) fechaInicioInput.value = '';
        if (fechaFinInput) fechaFinInput.value = '';
        if (tipoSelect) tipoSelect.value = 'todos';
        if (usuarioInput) usuarioInput.value = '';
        
        // Configurar fechas por defecto
        this.configurarFechas();
    }
    
    renderizarTabla() {
        const tbody = document.getElementById('historialTableBody');
        if (!tbody) return;
        
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        const historialPagina = this.historialFiltrado.slice(start, end);
        
        if (historialPagina.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 60px;">
                        <i class="fas fa-history" style="font-size: 3rem; color: var(--color-gray-300); margin-bottom: 15px; display: block;"></i>
                        <p>No hay registros en el historial para los filtros seleccionados</p>
                        <button class="btn-primary btn-sm" onclick="historial.limpiarFiltros()">
                            <i class="fas fa-eraser"></i> Limpiar Filtros
                        </button>
                    </td>
                </tr>
            `;
            this.renderizarPaginacion();
            return;
        }
        
        tbody.innerHTML = historialPagina.map(item => `
            <tr class="historial-item" data-id="${item.id}">
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 32px; height: 32px; background: rgba(var(--color-${item.tipoColor}), 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                            <i class="fas ${item.tipoIcono}" style="color: var(--color-${item.tipoColor}); font-size: 0.9rem;"></i>
                        </div>
                        <div>
                            <div style="font-weight: 500;">${item.descripcion}</div>
                            <div style="font-size: 0.7rem; color: var(--color-gray-400);">ID: ${item.id}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <div style="display: flex; flex-direction: column;">
                        <span>${this.formatearFecha(item.fecha)}</span>
                        <small style="color: var(--color-gray-400);">${item.hora}</small>
                    </div>
                </td>
                <td>
                    <span class="badge badge-${item.tipoColor}">
                        <i class="fas ${item.tipoIcono}"></i>
                        ${this.getTipoTexto(item.tipo)}
                    </span>
                </td>
                <td>
                    <i class="fas fa-user" style="color: var(--color-gray-400); margin-right: 5px;"></i>
                    ${item.usuario}
                </td>
                <td>
                    <button class="btn-sm btn-outline-primary" onclick="historial.verDetalle('${item.id}')" title="Ver detalles">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `).join('');
        
        this.renderizarPaginacion();
    }
    
    renderizarPaginacion() {
        const paginationDiv = document.getElementById('historialPagination');
        if (!paginationDiv) return;
        
        const totalPages = Math.ceil(this.historialFiltrado.length / this.itemsPerPage);
        
        if (totalPages <= 1) {
            paginationDiv.innerHTML = '';
            return;
        }
        
        let html = '<div class="pagination">';
        
        html += `<button onclick="historial.cambiarPagina(${this.currentPage - 1})" ${this.currentPage === 1 ? 'disabled' : ''}>
            <i class="fas fa-chevron-left"></i> Anterior
        </button>`;
        
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
                html += `<button onclick="historial.cambiarPagina(${i})" class="${i === this.currentPage ? 'active' : ''}">
                    ${i}
                </button>`;
            } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
                html += '<span style="padding: 8px;">...</span>';
            }
        }
        
        html += `<button onclick="historial.cambiarPagina(${this.currentPage + 1})" ${this.currentPage === totalPages ? 'disabled' : ''}>
            Siguiente <i class="fas fa-chevron-right"></i>
        </button>`;
        
        html += '</div>';
        paginationDiv.innerHTML = html;
    }
    
    cambiarPagina(page) {
        const totalPages = Math.ceil(this.historialFiltrado.length / this.itemsPerPage);
        if (page < 1 || page > totalPages) return;
        this.currentPage = page;
        this.renderizarTabla();
    }
    
    actualizarEstadisticas() {
        const totalRegistros = this.historial.length;
        const registrosFiltrados = this.historialFiltrado.length;
        const reservasCount = this.historial.filter(h => h.tipo === 'reserva').length;
        const clientesCount = this.historial.filter(h => h.tipo === 'cliente').length;
        const mesasCount = this.historial.filter(h => h.tipo === 'mesa').length;
        
        const statsDiv = document.getElementById('historialStats');
        if (statsDiv) {
            statsDiv.innerHTML = `
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-info">
                            <h4>Total Registros</h4>
                            <div class="stat-number">${totalRegistros}</div>
                        </div>
                        <div class="stat-icon">
                            <i class="fas fa-database"></i>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-info">
                            <h4>Reservas</h4>
                            <div class="stat-number">${reservasCount}</div>
                        </div>
                        <div class="stat-icon">
                            <i class="fas fa-calendar-check"></i>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-info">
                            <h4>Clientes</h4>
                            <div class="stat-number">${clientesCount}</div>
                        </div>
                        <div class="stat-icon">
                            <i class="fas fa-users"></i>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-info">
                            <h4>Mesas</h4>
                            <div class="stat-number">${mesasCount}</div>
                        </div>
                        <div class="stat-icon">
                            <i class="fas fa-chair"></i>
                        </div>
                    </div>
                </div>
                ${registrosFiltrados !== totalRegistros ? 
                    `<div style="text-align: center; margin-top: 15px; padding: 10px; background: var(--color-info-light); border-radius: 8px;">
                        <small>Mostrando ${registrosFiltrados} de ${totalRegistros} registros</small>
                    </div>` : ''
                }
            `;
        }
    }
    
    getTipoTexto(tipo) {
        const tipos = {
            'cliente': 'Cliente',
            'mesa': 'Mesa',
            'reserva': 'Reserva'
        };
        return tipos[tipo] || tipo;
    }
    
    verDetalle(id) {
        const item = this.historial.find(h => h.id === id);
        if (!item) return;
        
        // Crear modal de detalles
        const modalHtml = `
            <div id="detalleModal" class="modal-overlay show">
                <div class="modal" style="max-width: 600px;">
                    <div class="modal-header">
                        <h3>
                            <i class="fas ${item.tipoIcono}" style="color: var(--color-${item.tipoColor});"></i>
                            Detalles del Registro
                        </h3>
                        <button class="modal-close" onclick="historial.cerrarDetalleModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div style="margin-bottom: 20px;">
                            <strong>Descripción:</strong>
                            <p>${item.descripcion}</p>
                        </div>
                        <div style="display: grid; gap: 15px;">
                            <div><strong>📅 Fecha:</strong> ${this.formatearFecha(item.fecha)} ${item.hora}</div>
                            <div><strong>👤 Usuario:</strong> ${item.usuario}</div>
                            <div><strong>🏷️ Tipo:</strong> ${this.getTipoTexto(item.tipo)}</div>
                            <hr>
                            <div><strong>📋 Detalles completos:</strong></div>
                            <pre style="background: var(--color-gray-50); padding: 15px; border-radius: 8px; overflow-x: auto; font-size: 0.75rem;">${JSON.stringify(item.detalles, null, 2)}</pre>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-primary" onclick="historial.cerrarDetalleModal()">Cerrar</button>
                    </div>
                </div>
            </div>
        `;
        
        // Remover modal existente
        const modalExistente = document.getElementById('detalleModal');
        if (modalExistente) modalExistente.remove();
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
    
    cerrarDetalleModal() {
        const modal = document.getElementById('detalleModal');
        if (modal) modal.remove();
    }
    
    exportarHistorial() {
        if (this.historialFiltrado.length === 0) {
            utils.mostrarNotificacion('No hay registros para exportar', 'warning');
            return;
        }
        
        const datosExportar = this.historialFiltrado.map(item => ({
            'Fecha': item.fecha,
            'Hora': item.hora,
            'Tipo': this.getTipoTexto(item.tipo),
            'Descripción': item.descripcion,
            'Usuario': item.usuario,
            'Detalles': JSON.stringify(item.detalles)
        }));
        
        const headers = Object.keys(datosExportar[0]);
        const csvRows = [];
        
        csvRows.push(headers.join(','));
        
        for (const row of datosExportar) {
            const values = headers.map(header => {
                const value = row[header] || '';
                return `"${value.toString().replace(/"/g, '""')}"`;
            });
            csvRows.push(values.join(','));
        }
        
        const csv = csvRows.join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `historial_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        utils.mostrarNotificacion('Historial exportado exitosamente', 'success');
    }
    
    formatearFecha(fecha) {
        return utils.formatearFecha(fecha);
    }
}

// Inicializar cuando el DOM esté listo
let historial;
document.addEventListener('DOMContentLoaded', () => {
    historial = new Historial();
    window.historial = historial;
});