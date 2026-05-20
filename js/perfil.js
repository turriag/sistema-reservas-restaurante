/**
 * Sistema de Reservas de Restaurante
 * Módulo de Perfil de Usuario
 */

class PerfilUsuario {
    constructor() {
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
                alert('Error de conexión. Recarga la página.');
                return;
            }
        }
        
        if (!authService.isAuthenticated()) {
            window.location.href = 'login.html';
            return;
        }
        
        this.usuarioActual = authService.getCurrentUser();
        this.cargarDatosUsuario();
        this.setupEventListeners();
    }
    
    async cargarDatosUsuario() {
        try {
            const { data, error } = await supabaseClient
                .from('clientes')
                .select('*')
                .eq('id_cliente', this.usuarioActual.id)
                .single();
            
            if (error) throw error;
            
            if (data) {
                document.getElementById('perfilNombre').value = data.nombre_cliente || '';
                document.getElementById('perfilEmail').value = data.correo || '';
                document.getElementById('perfilTelefono').value = data.telefono || '';
                
                const fechaRegistro = data.fecha_registro ? new Date(data.fecha_registro).toLocaleDateString('es-CO') : 'No disponible';
                document.getElementById('perfilRegistro').value = fechaRegistro;
                
                // Actualizar sidebar
                const userNameSpan = document.getElementById('userName');
                const userEmailSpan = document.getElementById('userEmail');
                if (userNameSpan) userNameSpan.textContent = data.nombre_cliente || 'Cliente';
                if (userEmailSpan) userEmailSpan.textContent = data.correo || '';
            }
            
        } catch (error) {
            console.error('Error al cargar perfil:', error);
        }
    }
    
    setupEventListeners() {
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
        
        if (!nombre) {
            alert('El nombre es requerido');
            return;
        }
        
        this.mostrarLoader();
        
        try {
            const { error } = await supabaseClient
                .from('clientes')
                .update({
                    nombre_cliente: nombre,
                    telefono: telefono || null
                })
                .eq('id_cliente', this.usuarioActual.id);
            
            if (error) throw error;
            
            // Actualizar usuario local
            this.usuarioActual.nombre = nombre;
            this.usuarioActual.telefono = telefono;
            localStorage.setItem('usuario', JSON.stringify(this.usuarioActual));
            
            alert('✅ Perfil actualizado correctamente');
            
            // Actualizar sidebar
            const userNameSpan = document.getElementById('userName');
            if (userNameSpan) userNameSpan.textContent = nombre;
            
        } catch (error) {
            console.error('Error:', error);
            alert('Error: ' + error.message);
        } finally {
            this.ocultarLoader();
        }
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
let perfilUsuario;
document.addEventListener('DOMContentLoaded', () => {
    perfilUsuario = new PerfilUsuario();
    window.perfilUsuario = perfilUsuario;
});