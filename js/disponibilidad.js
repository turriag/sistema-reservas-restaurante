/**
 * Sistema de Reservas de Restaurante
 * Módulo de Consulta de Disponibilidad - Con Supabase
 * @version 2.2.0
 */

class Disponibilidad {
    constructor() {
        this.mesas = [];
        this.init();
    }
    
    async init() {
        // Esperar a que Supabase esté disponible
        let esperas = 0;
        while (typeof supabaseClient === 'undefined' || !supabaseClient) {
            console.log('Esperando Supabase...');
            await new Promise(resolve => setTimeout(resolve, 200));
            esperas++;
            if (esperas > 30) {
                const resultadosDiv = document.getElementById('resultadosDisponibilidad');
                if (resultadosDiv) {
                    resultadosDiv.innerHTML = `
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
        
        // Mostrar nombre del usuario si está autenticado
        if (authService.isAuthenticated()) {
            const user = authService.getCurrentUser();
            const userNameSpan = document.getElementById('userName');
            const userEmailSpan = document.getElementById('userEmail');
            if (userNameSpan) userNameSpan.textContent = user.nombre || 'Cliente';
            if (userEmailSpan) userEmailSpan.textContent = user.email;
        }
        
        await this.cargarMesas();
        this.setupEventListeners();
        this.configurarFecha();
        
        // Buscar automáticamente si hay fecha seleccionada
        const fechaInput = document.getElementById('dispoFecha');
        if (fechaInput && fechaInput.value) {
            this.buscarDisponibilidad();
        }
    }
    
    async cargarMesas() {
        try {
            const { data, error } = await supabaseClient
                .from('mesas')
                .select('*')
                .order('id_mesa');
            
            if (error) throw error;
            
            this.mesas = (data || []).map(m => ({
                id: m.id_mesa,
                capacidad: m.capacidad,
                ubicacion: m.ubicacion,
                estado: m.estado
            }));
            
            console.log('Mesas cargadas:', this.mesas.length);
        } catch (error) {
            console.error('Error al cargar mesas:', error);
            this.mesas = [];
        }
    }
    
    setupEventListeners() {
        const buscarBtn = document.getElementById('buscarDisponibilidad');
        if (buscarBtn) {
            buscarBtn.addEventListener('click', () => this.buscarDisponibilidad());
        }
        
        const fechaInput = document.getElementById('dispoFecha');
        if (fechaInput) {
            fechaInput.addEventListener('change', () => this.buscarDisponibilidad());
        }
        
        const horaSelect = document.getElementById('dispoHora');
        if (horaSelect) {
            horaSelect.addEventListener('change', () => this.buscarDisponibilidad());
        }
        
        const personasSelect = document.getElementById('dispoPersonas');
        if (personasSelect) {
            personasSelect.addEventListener('change', () => this.buscarDisponibilidad());
        }
    }
    
    configurarFecha() {
        const fechaInput = document.getElementById('dispoFecha');
        if (fechaInput) {
            const hoy = new Date();
            fechaInput.min = hoy.toISOString().split('T')[0];
            fechaInput.value = hoy.toISOString().split('T')[0];
            
            const max = new Date();
            max.setDate(max.getDate() + 30);
            fechaInput.max = max.toISOString().split('T')[0];
        }
    }
    
    async buscarDisponibilidad() {
        const fecha = document.getElementById('dispoFecha')?.value;
        const hora = document.getElementById('dispoHora')?.value;
        const personas = document.getElementById('dispoPersonas')?.value;
        const resultadosDiv = document.getElementById('resultadosDisponibilidad');
        
        if (!fecha) {
            resultadosDiv.innerHTML = `
                <div style="text-align: center; padding: 60px;">
                    <i class="fas fa-calendar-alt" style="font-size: 3rem; color: #ccc; margin-bottom: 15px;"></i>
                    <h3>Selecciona una fecha</h3>
                    <p>Elige una fecha para ver las mesas disponibles</p>
                </div>
            `;
            return;
        }
        
        this.mostrarLoader();
        
        try {
            // Filtrar mesas por capacidad si se seleccionó personas
            let mesasDisponibles = [...this.mesas];
            
            if (personas) {
                mesasDisponibles = mesasDisponibles.filter(m => m.capacidad >= parseInt(personas));
            }
            
            // Si hay hora seleccionada, filtrar mesas no ocupadas en ese horario
            if (hora) {
                const { data: reservasEnHorario } = await supabaseClient
                    .from('reservas')
                    .select('id_mesa')
                    .eq('fecha', fecha)
                    .eq('hora', hora)
                    .eq('estado_reserva', 'confirmada');
                
                const mesasOcupadasIds = (reservasEnHorario || []).map(r => r.id_mesa);
                mesasDisponibles = mesasDisponibles.filter(m => !mesasOcupadasIds.includes(m.id));
            }
            
            this.mostrarResultados(mesasDisponibles, fecha, hora, personas);
            
        } catch (error) {
            console.error('Error:', error);
            resultadosDiv.innerHTML = `
                <div style="text-align: center; padding: 60px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: red;"></i>
                    <h3>Error al buscar</h3>
                    <p>Intenta nuevamente</p>
                    <button onclick="disponibilidad.buscarDisponibilidad()" class="btn-primary">Reintentar</button>
                </div>
            `;
        } finally {
            this.ocultarLoader();
        }
    }
    
    mostrarResultados(mesas, fecha, hora, personas) {
        const resultadosDiv = document.getElementById('resultadosDisponibilidad');
        
        if (mesas.length === 0) {
            resultadosDiv.innerHTML = `
                <div style="text-align: center; padding: 60px;">
                    <i class="fas fa-chair" style="font-size: 3rem; color: #ccc; margin-bottom: 15px;"></i>
                    <h3>No hay mesas disponibles</h3>
                    <p>No encontramos mesas que cumplan con los criterios seleccionados.</p>
                    <p style="color: #999; font-size: 0.85rem; margin-top: 15px;">
                        💡 Sugerencias:<br>
                        • Prueba con otro horario<br>
                        • Reduce el número de personas<br>
                        • Selecciona otra fecha
                    </p>
                </div>
            `;
            return;
        }
        
        const fechaFormateada = new Date(fecha).toLocaleDateString('es-CO');
        const horaTexto = hora ? `a las ${this.formatearHora(hora)}` : 'en cualquier horario';
        const personasTexto = personas ? `para ${personas} ${personas == 1 ? 'persona' : 'personas'}` : 'para cualquier cantidad';
        
        resultadosDiv.innerHTML = `
            <div style="margin-top: 20px;">
                <div style="background: linear-gradient(135deg, #f5e6d3, #f0d5b5); padding: 15px 20px; border-radius: 12px; margin-bottom: 20px;">
                    <h4 style="margin: 0; color: #6B3E1A;">
                        <i class="fas fa-search"></i> Resultados para ${fechaFormateada} ${horaTexto} ${personasTexto}
                    </h4>
                    <p style="margin: 5px 0 0; font-size: 0.85rem;">${mesas.length} mesa(s) disponible(s)</p>
                </div>
                
                <div class="mesas-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px;">
                    ${mesas.map(mesa => `
                        <div class="mesa-card" style="background: white; border: 2px solid #e5e7eb; border-radius: 16px; padding: 15px; text-align: center; cursor: pointer; transition: all 0.3s ease;" 
                             onclick="disponibilidad.reservarMesa(${mesa.id})"
                             onmouseover="this.style.borderColor='#8B5A2B'; this.style.transform='translateY(-3px)'"
                             onmouseout="this.style.borderColor='#e5e7eb'; this.style.transform='translateY(0)'">
                            <div style="font-size: 2rem; margin-bottom: 10px;"><i class="fas fa-chair"></i></div>
                            <div style="font-size: 1.2rem; font-weight: bold; color: #8B5A2B;">Mesa #${mesa.id}</div>
                            <div style="font-size: 0.8rem; color: #666; margin: 5px 0;"><i class="fas fa-users"></i> ${mesa.capacidad} personas</div>
                            <div style="font-size: 0.75rem; color: #999; margin-bottom: 10px;"><i class="fas fa-map-marker-alt"></i> ${mesa.ubicacion}</div>
                            <button class="btn-primary btn-sm" style="margin-top: 5px; padding: 8px 15px;">Reservar</button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    formatearHora(hora) {
        if (!hora) return '';
        const [h, m] = hora.split(':');
        let hora12 = parseInt(h);
        const ampm = hora12 >= 12 ? 'PM' : 'AM';
        hora12 = hora12 % 12 || 12;
        return `${hora12}:${m} ${ampm}`;
    }
    
    reservarMesa(mesaId) {
        // Verificar si el usuario está autenticado
        if (!authService.isAuthenticated()) {
            this.mostrarNotificacion('Debes iniciar sesión para reservar', 'warning');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
            return;
        }
        
        // Guardar datos de la reserva
        const fecha = document.getElementById('dispoFecha')?.value;
        const hora = document.getElementById('dispoHora')?.value;
        const personas = document.getElementById('dispoPersonas')?.value;
        
        sessionStorage.setItem('reservaPendiente', JSON.stringify({
            mesaId: mesaId,
            fecha: fecha,
            hora: hora || '',
            personas: personas || 2
        }));
        
        window.location.href = 'crear-reserva.html';
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
let disponibilidad;
document.addEventListener('DOMContentLoaded', () => {
    disponibilidad = new Disponibilidad();
    window.disponibilidad = disponibilidad;
});