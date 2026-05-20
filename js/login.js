/**
 * Sistema de Reservas de Restaurante
 * Lógica de la página de inicio de sesión - Con toasts
 * @version 3.0.0
 */

class LoginController {
    constructor() {
        this.form = document.getElementById('loginForm');
        this.emailInput = document.getElementById('email');
        this.passwordInput = document.getElementById('password');
        this.rememberCheckbox = document.getElementById('rememberMe');
        this.loginBtn = document.getElementById('loginBtn');
        this.togglePassword = document.getElementById('togglePassword');
        
        this.init();
    }
    
    init() {
        this.cargarEmailGuardado();
        this.setupEventListeners();
        this.verificarSesionActiva();
    }
    
    setupEventListeners() {
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });
        
        if (this.togglePassword) {
            this.togglePassword.addEventListener('click', () => {
                const type = this.passwordInput.type === 'password' ? 'text' : 'password';
                this.passwordInput.type = type;
                this.togglePassword.classList.toggle('fa-eye');
                this.togglePassword.classList.toggle('fa-eye-slash');
            });
        }
        
        this.emailInput.addEventListener('input', () => this.hideEmailError());
        this.passwordInput.addEventListener('input', () => this.hidePasswordError());
        
        this.passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleLogin();
            }
        });
        
        const forgotLink = document.getElementById('forgotPassword');
        if (forgotLink) {
            forgotLink.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.href = 'recuperar-password.html';
            });
        }
    }
    
    async handleLogin() {
        const email = this.emailInput.value.trim();
        const password = this.passwordInput.value;
        const rememberMe = this.rememberCheckbox.checked;
        
        // Validar campos
        let isValid = true;
        
        if (!email) {
            this.showEmailError('El correo electrónico es requerido');
            isValid = false;
        } else if (!this.validarEmail(email)) {
            this.showEmailError('Ingresa un correo electrónico válido');
            isValid = false;
        } else {
            this.hideEmailError();
        }
        
        if (!password) {
            this.showPasswordError('La contraseña es requerida');
            isValid = false;
        } else if (password.length < 6) {
            this.showPasswordError('La contraseña debe tener al menos 6 caracteres');
            isValid = false;
        } else {
            this.hidePasswordError();
        }
        
        if (!isValid) return;
        
        this.setLoading(true);
        
        try {
            const result = await authService.login(email, password, rememberMe);
            
            if (result.success) {
                if (rememberMe) {
                    localStorage.setItem('savedEmail', email);
                } else {
                    localStorage.removeItem('savedEmail');
                }
                // La redirección la hace authService
            }
        } catch (error) {
            let mensaje = error.message || 'Error al iniciar sesión';
            
            // Mensajes más amigables
            if (mensaje.includes('Email not confirmed')) {
                mensaje = '📧 Por favor confirma tu correo electrónico. Revisa tu bandeja de entrada y haz clic en el enlace de verificación.';
            } else if (mensaje.includes('Invalid login credentials')) {
                mensaje = '❌ Correo o contraseña incorrectos. Por favor verifica tus datos.';
            }
            
            this.mostrarToast(mensaje, 'error');
            this.setLoading(false);
        }
    }
    
    validarEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }
    
    showEmailError(message) {
        const errorDiv = document.getElementById('emailError');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.classList.add('show');
        }
        this.emailInput.classList.add('error');
    }
    
    hideEmailError() {
        const errorDiv = document.getElementById('emailError');
        if (errorDiv) {
            errorDiv.textContent = '';
            errorDiv.classList.remove('show');
        }
        this.emailInput.classList.remove('error');
    }
    
    showPasswordError(message) {
        const errorDiv = document.getElementById('passwordError');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.classList.add('show');
        }
        this.passwordInput.classList.add('error');
    }
    
    hidePasswordError() {
        const errorDiv = document.getElementById('passwordError');
        if (errorDiv) {
            errorDiv.textContent = '';
            errorDiv.classList.remove('show');
        }
        this.passwordInput.classList.remove('error');
    }
    
    setLoading(loading) {
        if (loading) {
            this.loginBtn.disabled = true;
            this.loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Iniciando sesión...';
        } else {
            this.loginBtn.disabled = false;
            this.loginBtn.innerHTML = '<span>Iniciar Sesión</span>';
        }
    }
    
    cargarEmailGuardado() {
        const savedEmail = localStorage.getItem('savedEmail');
        if (savedEmail && this.emailInput) {
            this.emailInput.value = savedEmail;
            this.rememberCheckbox.checked = true;
        }
    }
    
    verificarSesionActiva() {
        if (authService.isAuthenticated()) {
            const user = authService.getCurrentUser();
            if (user.rol === 'administrador' || user.rol === 'superadmin') {
                window.location.href = 'dashboard-admin.html';
            } else {
                window.location.href = 'dashboard-cliente.html';
            }
        }
    }
    
    // ============================================
    // TOAST ELEGANTE
    // ============================================
    
    mostrarToast(mensaje, tipo = 'info') {
        // Crear contenedor de toasts si no existe
        let toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toastContainer';
            toastContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: 10px;
            `;
            document.body.appendChild(toastContainer);
        }
        
        // Crear toast
        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${tipo}`;
        
        // Iconos según tipo
        const iconos = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas ${iconos[tipo] || iconos.info}"></i>
                <span>${mensaje}</span>
            </div>
            <button class="toast-close">&times;</button>
        `;
        
        toast.style.cssText = `
            background: white;
            border-radius: 16px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
            padding: 14px 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 15px;
            min-width: 300px;
            max-width: 450px;
            transform: translateX(400px);
            transition: transform 0.3s ease;
            border-left: 4px solid ${tipo === 'success' ? '#10b981' : tipo === 'error' ? '#ef4444' : '#f59e0b'};
            background: linear-gradient(135deg, #fff, #f8f9fa);
        `;
        
        toastContainer.appendChild(toast);
        
        // Mostrar con animación
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 10);
        
        // Auto cerrar después de 5 segundos
        setTimeout(() => {
            toast.style.transform = 'translateX(400px)';
            setTimeout(() => toast.remove(), 300);
        }, 5000);
        
        // Botón cerrar
        toast.querySelector('.toast-close').onclick = () => {
            toast.style.transform = 'translateX(400px)';
            setTimeout(() => toast.remove(), 300);
        };
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.loginController = new LoginController();
});