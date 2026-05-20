/**
 * Sistema de Reservas de Restaurante
 * Autenticación con Supabase - Completa
 */

class AuthService {
    constructor() {
        this.usuarioActual = null;
        this.cargarSesion();
    }
    
    cargarSesion() {
        const usuario = localStorage.getItem('usuario');
        if (usuario) {
            this.usuarioActual = JSON.parse(usuario);
        }
    }
    
    async login(email, password) {
        try {
            const btn = document.querySelector('.btn-login');
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Iniciando...';
            }
            
            if (!supabaseClient) {
                throw new Error('Supabase no inicializado');
            }
            
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password
            });
            
            if (error) throw new Error(error.message);
            
            // Buscar en administradores
            const { data: admin } = await supabaseClient
                .from('administradores')
                .select('*')
                .eq('correo', email);
            
            let usuario = null;
            
            if (admin && admin.length > 0) {
                usuario = {
                    id: admin[0].id_admin,
                    nombre: admin[0].nombre_admin,
                    email: admin[0].correo,
                    rol: admin[0].rol || 'administrador'
                };
            } else {
                // Buscar en clientes
                const { data: cliente } = await supabaseClient
                    .from('clientes')
                    .select('*')
                    .eq('correo', email);
                
                if (cliente && cliente.length > 0) {
                    usuario = {
                        id: cliente[0].id_cliente,
                        nombre: cliente[0].nombre_cliente,
                        email: cliente[0].correo,
                        rol: 'cliente'
                    };
                }
            }
            
            if (!usuario) {
                throw new Error('Usuario no encontrado en la base de datos');
            }
            
            this.usuarioActual = usuario;
            localStorage.setItem('usuario', JSON.stringify(usuario));
            
            if (usuario.rol === 'administrador' || usuario.rol === 'superadmin') {
                window.location.href = 'dashboard-admin.html';
            } else {
                window.location.href = 'dashboard-cliente.html';
            }
            
            return { success: true };
            
        } catch (error) {
            console.error('Error en login:', error);
            alert('Error: ' + error.message);
            return { success: false };
        } finally {
            const btn = document.querySelector('.btn-login');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<span>Iniciar Sesión</span>';
            }
        }
    }
    
    async register(userData) {
        try {
            const btn = document.querySelector('.btn-register');
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando...';
            }
            
            if (!supabaseClient) {
                throw new Error('Supabase no inicializado');
            }
            
            const { data: authData, error: authError } = await supabaseClient.auth.signUp({
                email: userData.email,
                password: userData.password,
                options: {
                    data: {
                        nombre: userData.nombre
                    }
                }
            });
            
            if (authError) throw new Error(authError.message);
            
            const { error: clienteError } = await supabaseClient
                .from('clientes')
                .insert([{
                    nombre_cliente: userData.nombre,
                    correo: userData.email,
                    telefono: userData.telefono,
                    estado: 'activo'
                }]);
            
            if (clienteError) throw new Error(clienteError.message);
            
            alert('✅ Registro exitoso. Ya puedes iniciar sesión.');
            window.location.href = 'login.html';
            
            return { success: true };
            
        } catch (error) {
            console.error('Error en registro:', error);
            alert('Error: ' + error.message);
            return { success: false };
        } finally {
            const btn = document.querySelector('.btn-register');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<span>Registrarse</span>';
            }
        }
    }
    
    logout() {
        this.usuarioActual = null;
        localStorage.removeItem('usuario');
        window.location.href = 'login.html';
    }
    
    isAuthenticated() {
        return this.usuarioActual !== null;
    }
    
    getCurrentUser() {
        return this.usuarioActual;
    }
    
    isAdmin() {
        return this.usuarioActual && (this.usuarioActual.rol === 'administrador' || this.usuarioActual.rol === 'superadmin');
    }
}

const authService = new AuthService();
window.authService = authService;