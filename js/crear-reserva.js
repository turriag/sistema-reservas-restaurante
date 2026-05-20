/**
 * Sistema de Reservas de Restaurante
 * Módulo de Creación de Reservas - Con Supabase
 * @version 2.4.0
 */

class CrearReserva {
    constructor() {
        this.form = null;
        this.fechaInput = null;
        this.horaSeleccionada = null;
        this.personasSelect = null;
        this.mesaSelect = null;
        this.mesasContainer = null;
        this.observacionesTextarea = null;
        this.mesasDisponibles = [];
        this.usuarioActual = null;
        
        this.init();
    }
    
    async init() {
        // Esperar Supabase
        let esperas = 0;
        while (typeof supabaseClient === 'undefined' || !supabaseClient) {
            await new Promise(resolve => setTimeout(resolve, 200));
            esperas++;
            if (esperas > 30) {
                this.mostrarNotificacion('Error de conexión. Recarga la página.', 'error');
                return;
            }
        }
        
        if (!authService.isAuthenticated()) {
            window.location.href = 'login.html';
            return;
        }
        
        this.usuarioActual = authService.getCurrentUser();
        this.actualizarInfoCliente();
        
        await this.cargarMesas();
        this.setupEventListeners();
        this.configurarFechas();
        this.configurarCalendario();
    }
    
    actualizarInfoCliente() {
        const nombreSpan = document.getElementById('clienteNombre');
        const emailSpan = document.getElementById('clienteEmail');
        if (nombreSpan) nombreSpan.textContent = this.usuarioActual.nombre || 'Cliente';
        if (emailSpan) emailSpan.textContent = this.usuarioActual.email;
    }
    
    async cargarMesas() {
        try {
            const { data, error } = await supabaseClient
                .from('mesas')
                .select('*')
                .order('capacidad', { ascending: true });
            
            if (error) throw error;
            
            this.mesas = (data || []).map(m => ({
                id: m.id_mesa,
                capacidad: m.capacidad,
                ubicacion: m.ubicacion,
                estado: m.estado
            }));
            
            console.log('Mesas cargadas:', this.mesas);
        } catch (error) {
            console.error('Error al cargar mesas:', error);
            this.mesas = [];
        }
    }
    
    setupEventListeners() {
        this.form = document.getElementById('reservaForm');
        this.fechaInput = document.getElementById('fecha');
        this.personasSelect = document.getElementById('personas');
        this.mesasContainer = document.getElementById('mesasContainer');
        this.observacionesTextarea = document.getElementById('observaciones');
        
        // Selector de hora visual
        document.querySelectorAll('.hora-option').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.hora-option').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                this.horaSeleccionada = btn.dataset.hora;
                this.buscarMesasDisponibles();
            });
        });
        
        if (this.fechaInput) {
            this.fechaInput.addEventListener('change', () => this.buscarMesasDisponibles());
        }
        
        if (this.personasSelect) {
            this.personasSelect.addEventListener('change', () => this.buscarMesasDisponibles());
        }
        
        if (this.form) {
            this.form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.crearReserva();
            });
        }
        
        const cancelarBtn = document.getElementById('cancelarBtn');
        if (cancelarBtn) {
            cancelarBtn.addEventListener('click', () => {
                window.location.href = 'dashboard-cliente.html';
            });
        }
    }
    
    configurarFechas() {
        if (this.fechaInput) {
            const hoy = new Date();
            this.fechaInput.min = hoy.toISOString().split('T')[0];
            const max = new Date();
            max.setDate(max.getDate() + 30);
            this.fechaInput.max = max.toISOString().split('T')[0];
        }
    }
    
    configurarCalendario() {
        const fechaInput = document.getElementById('fecha');
        if (fechaInput) {
            const hoy = new Date();
            const año = hoy.getFullYear();
            const mes = String(hoy.getMonth() + 1).padStart(2, '0');
            const dia = String(hoy.getDate()).padStart(2, '0');
            
            fechaInput.min = `${año}-${mes}-${dia}`;
            fechaInput.value = `${año}-${mes}-${dia}`;
            
            fechaInput.addEventListener('change', (e) => {
                const fechaSeleccionada = new Date(e.target.value);
                const fechaActual = new Date();
                fechaActual.setHours(0, 0, 0, 0);
                
                if (fechaSeleccionada < fechaActual) {
                    this.mostrarNotificacion('📅 No puedes seleccionar fechas anteriores al día de hoy', 'warning');
                    fechaInput.value = `${año}-${mes}-${dia}`;
                    if (this.horaSeleccionada && this.personasSelect?.value) {
                        this.buscarMesasDisponibles();
                    }
                }
            });
        }
    }
    
    async buscarMesasDisponibles() {
        const fecha = this.fechaInput?.value;
        const hora = this.horaSeleccionada;
        const personas = parseInt(this.personasSelect?.value);
        
        if (!fecha || !hora || !personas) {
            if (this.mesasContainer) {
                this.mesasContainer.innerHTML = `
                    <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #999;">
                        <i class="fas fa-calendar-alt" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                        Selecciona fecha, hora y personas para ver las mesas disponibles
                    </div>
                `;
            }
            return;
        }
        
        this.mostrarLoader();
        
        try {
            // Obtener reservas confirmadas para ese horario
            const { data: reservasEnHorario } = await supabaseClient
                .from('reservas')
                .select('id_mesa')
                .eq('fecha', fecha)
                .eq('hora', hora)
                .eq('estado_reserva', 'confirmada');
            
            const mesasOcupadasIds = (reservasEnHorario || []).map(r => r.id_mesa);
            
            // Filtrar mesas disponibles (no ocupadas en ese horario)
            let mesasDisponibles = this.mesas.filter(m => 
                m.estado === 'disponible' && !mesasOcupadasIds.includes(m.id)
            );
            
            // Clasificar mesas según capacidad
            const mesasExactas = mesasDisponibles.filter(m => m.capacidad === personas);
            const mesasSuficientes = mesasDisponibles.filter(m => m.capacidad > personas && m.capacidad <= personas + 2);
            const mesasGrandes = mesasDisponibles.filter(m => m.capacidad > personas + 2);
            
            this.mostrarMesasConCategorias(mesasExactas, mesasSuficientes, mesasGrandes, personas);
            this.actualizarResumen();
            
        } catch (error) {
            console.error('Error:', error);
            this.mostrarErrorMesas();
        } finally {
            this.ocultarLoader();
        }
    }
    
    mostrarMesasConCategorias(mesasExactas, mesasSuficientes, mesasGrandes, personas) {
        if (!this.mesasContainer) return;
        
        let html = '';
        
        // Sugerencia de capacidad
        html += `
            <div style="grid-column: 1/-1; margin-bottom: 15px; padding: 12px; background: #fef3e8; border-radius: 12px;">
                <i class="fas fa-lightbulb" style="color: #f59e0b; margin-right: 8px;"></i>
                <strong>Para ${personas} ${personas === 1 ? 'persona' : 'personas'}</strong> necesitas una mesa con capacidad de al menos ${personas} personas.
            </div>
        `;
        
        // Mesas exactas
        if (mesasExactas.length > 0) {
            html += `
                <div style="grid-column: 1/-1; margin: 10px 0 5px;">
                    <h4 style="color: #10b981; font-size: 0.9rem;">
                        <i class="fas fa-check-circle"></i> Capacidad exacta (recomendada)
                    </h4>
                </div>
                ${this.renderizarTarjetasMesas(mesasExactas, true)}
            `;
        }
        
        // Mesas suficientes (capacidad ligeramente mayor)
        if (mesasSuficientes.length > 0) {
            html += `
                <div style="grid-column: 1/-1; margin: 10px 0 5px;">
                    <h4 style="color: #f59e0b; font-size: 0.9rem;">
                        <i class="fas fa-arrow-right"></i> Capacidad amplia (${personas}-${personas + 2} personas)
                    </h4>
                </div>
                ${this.renderizarTarjetasMesas(mesasSuficientes, false)}
            `;
        }
        
        // Mesas grandes
        if (mesasGrandes.length > 0) {
            html += `
                <div style="grid-column: 1/-1; margin: 10px 0 5px;">
                    <h4 style="color: #8B5A2B; font-size: 0.9rem;">
                        <i class="fas fa-chair"></i> Capacidad superior (${personas + 3}+ personas)
                    </h4>
                </div>
                ${this.renderizarTarjetasMesas(mesasGrandes, false)}
            `;
        }
        
        if (mesasExactas.length === 0 && mesasSuficientes.length === 0 && mesasGrandes.length === 0) {
            html = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #999;">
                    <i class="fas fa-chair" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                    No hay mesas disponibles para este horario.
                    <br>
                    <small>Prueba con otro horario o fecha.</small>
                </div>
            `;
        }
        
        this.mesasContainer.innerHTML = html;
        
        // Agregar event listeners a las tarjetas
        document.querySelectorAll('.mesa-card').forEach(card => {
            card.addEventListener('click', () => {
                document.querySelectorAll('.mesa-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                this.mesaSeleccionada = {
                    id: parseInt(card.dataset.mesaId),
                    capacidad: parseInt(card.dataset.mesaCapacidad),
                    ubicacion: card.dataset.mesaUbicacion
                };
                this.actualizarResumen();
            });
        });
    }
    
    renderizarTarjetasMesas(mesas, esRecomendada) {
        return `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 15px; margin-bottom: 20px;">
                ${mesas.map(mesa => `
                    <div class="mesa-card ${esRecomendada ? 'recomendada' : ''}" 
                         data-mesa-id="${mesa.id}" 
                         data-mesa-capacidad="${mesa.capacidad}" 
                         data-mesa-ubicacion="${mesa.ubicacion}"
                         style="background: ${esRecomendada ? 'linear-gradient(135deg, #f0fdf4, #dcfce7)' : 'white'}; 
                                border: 2px solid ${esRecomendada ? '#10b981' : '#e5e7eb'};
                                border-radius: 16px; 
                                padding: 15px; 
                                text-align: center; 
                                cursor: pointer; 
                                transition: all 0.3s ease;
                                position: relative;">
                        ${esRecomendada ? '<div style="position: absolute; top: -10px; right: 10px; background: #10b981; color: white; padding: 2px 8px; border-radius: 20px; font-size: 0.6rem;">✓ Recomendada</div>' : ''}
                        <div style="font-size: 1.8rem; margin-bottom: 5px;"><i class="fas fa-chair"></i></div>
                        <div style="font-size: 1.2rem; font-weight: bold; color: #8B5A2B;">Mesa #${mesa.id}</div>
                        <div style="font-size: 0.8rem; color: #666; margin: 5px 0;">
                            <i class="fas fa-users"></i> ${mesa.capacidad} personas
                        </div>
                        <div style="font-size: 0.75rem; color: #999; margin-bottom: 10px;">
                            <i class="fas fa-map-marker-alt"></i> ${mesa.ubicacion}
                        </div>
                        <div style="font-size: 0.7rem; color: ${mesa.capacidad === parseInt(this.personasSelect?.value) ? '#10b981' : '#f59e0b'};">
                            ${mesa.capacidad === parseInt(this.personasSelect?.value) ? '✓ Capacidad ideal' : `Apta para ${mesa.capacidad} personas`}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    mostrarErrorMesas() {
        if (this.mesasContainer) {
            this.mesasContainer.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: red;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                    Error al cargar las mesas. Intenta de nuevo.
                    <button onclick="crearReserva.buscarMesasDisponibles()" class="btn-primary btn-sm" style="margin-top: 10px;">Reintentar</button>
                </div>
            `;
        }
    }
    
    actualizarResumen() {
        const fecha = this.fechaInput?.value;
        const hora = this.horaSeleccionada;
        const personas = this.personasSelect?.value;
        const mesa = this.mesaSeleccionada;
        
        const resumenDiv = document.getElementById('resumenReserva');
        const resumenFecha = document.getElementById('resumenFecha');
        const resumenHora = document.getElementById('resumenHora');
        const resumenPersonas = document.getElementById('resumenPersonas');
        const resumenMesa = document.getElementById('resumenMesa');
        
        if (fecha && hora && personas) {
            if (resumenDiv) resumenDiv.classList.add('show');
            if (resumenFecha) resumenFecha.textContent = this.formatearFecha(fecha);
            if (resumenHora) resumenHora.textContent = this.formatearHora(hora);
            if (resumenPersonas) resumenPersonas.textContent = personas + (personas == 1 ? ' persona' : ' personas');
            if (resumenMesa) resumenMesa.textContent = mesa ? `Mesa #${mesa.id} - ${mesa.ubicacion} (${mesa.capacidad} personas)` : 'No seleccionada';
        } else {
            if (resumenDiv) resumenDiv.classList.remove('show');
        }
    }
    
    formatearHora(hora) {
        if (!hora) return '';
        const [h, m] = hora.split(':');
        let hora12 = parseInt(h);
        const ampm = hora12 >= 12 ? 'PM' : 'AM';
        hora12 = hora12 % 12 || 12;
        return `${hora12}:${m} ${ampm}`;
    }
    
    async crearReserva() {
        const fecha = this.fechaInput?.value;
        const hora = this.horaSeleccionada;
        const personas = this.personasSelect?.value;
        const observaciones = this.observacionesTextarea?.value || '';
        
        if (!fecha || !hora || !personas) {
            this.mostrarNotificacion('Por favor completa todos los campos', 'warning');
            return;
        }
        
        if (!this.mesaSeleccionada) {
            this.mostrarNotificacion('Por favor selecciona una mesa', 'warning');
            return;
        }
        
        this.mostrarLoader();
        
        try {
            const { error } = await supabaseClient
                .from('reservas')
                .insert([{
                    id_cliente: this.usuarioActual.id,
                    id_mesa: this.mesaSeleccionada.id,
                    fecha: fecha,
                    hora: hora,
                    numero_personas: parseInt(personas),
                    estado_reserva: 'confirmada',
                    observaciones: observaciones
                }]);
            
            if (error) throw error;
            
            this.mostrarNotificacion('✅ ¡Reserva creada exitosamente!', 'success');
            
            setTimeout(() => {
                window.location.href = 'mis-reservas.html';
            }, 1500);
            
        } catch (error) {
            console.error('Error:', error);
            this.mostrarNotificacion('Error: ' + error.message, 'error');
        } finally {
            this.ocultarLoader();
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
        if (loader) loader.classList.add('active');
    }
    
    ocultarLoader() {
        const loader = document.getElementById('loader');
        if (loader) loader.classList.remove('active');
    }
    
    formatearFecha(fecha) {
        if (!fecha) return '';
        return new Date(fecha).toLocaleDateString('es-CO');
    }
}

// Inicializar
let crearReserva;
document.addEventListener('DOMContentLoaded', () => {
    crearReserva = new CrearReserva();
    window.crearReserva = crearReserva;
});