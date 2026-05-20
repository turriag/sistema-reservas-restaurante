/**
 * Sistema de Reservas de Restaurante
 * Lógica de registro - Con toasts
 * @version 2.2.0
 */

console.log('🔵 register.js cargado');

class RegisterController {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 3;
        
        this.form = document.getElementById('registerForm');
        this.step1Content = document.getElementById('step1Content');
        this.step2Content = document.getElementById('step2Content');
        this.step3Content = document.getElementById('step3Content');
        this.prevBtn = document.getElementById('prevBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.submitBtn = document.getElementById('submitBtn');
        
        this.nombreInput = document.getElementById('nombre');
        this.emailInput = document.getElementById('email');
        this.telefonoInput = document.getElementById('telefono');
        this.passwordInput = document.getElementById('password');
        this.confirmInput = document.getElementById('confirmPassword');
        this.terminosCheckbox = document.getElementById('terminos');
        
        this.init();
    }
    
    init() {
        console.log('RegisterController iniciado');
        
        // Verificar que supabaseClient existe
        if (typeof supabaseClient === 'undefined' || !supabaseClient) {
            console.error('supabaseClient no está disponible');
            this.mostrarNotificacion('Error de conexión. Recarga la página.', 'error');
            return;
        }
        
        console.log('✅ supabaseClient disponible');
        this.setupEventListeners();
        this.setupPasswordStrength();
        this.updateStepDisplay();
        this.actualizarBotonRegistro();
    }
    
    actualizarBotonRegistro() {
        if (!this.submitBtn) return;
        // El botón se habilita solo en el paso 3 Y con términos aceptados
        const habilitado = (this.currentStep === this.totalSteps) && this.terminosCheckbox?.checked;
        this.submitBtn.disabled = !habilitado;
    }
    
    setupEventListeners() {
        if (this.prevBtn) this.prevBtn.addEventListener('click', () => this.prevStep());
        if (this.nextBtn) this.nextBtn.addEventListener('click', () => this.nextStep());
        if (this.form) {
            this.form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRegister();
            });
        }
        
        if (this.nombreInput) this.nombreInput.addEventListener('input', () => this.validateNombre());
        if (this.emailInput) this.emailInput.addEventListener('input', () => this.validateEmail());
        if (this.telefonoInput) this.telefonoInput.addEventListener('input', () => this.validateTelefono());
        if (this.passwordInput) {
            this.passwordInput.addEventListener('input', () => {
                this.validatePassword();
                this.updatePasswordStrength();
            });
        }
        if (this.confirmInput) this.confirmInput.addEventListener('input', () => this.validateConfirmPassword());
        
        // ============================================
        // CORRECCIÓN: Habilitar botón cuando se aceptan términos
        // ============================================
        if (this.terminosCheckbox) {
            this.terminosCheckbox.addEventListener('change', () => {
                this.actualizarBotonRegistro();
            });
        }
        
        const togglePassword = document.getElementById('togglePassword');
        if (togglePassword) {
            togglePassword.addEventListener('click', () => {
                const type = this.passwordInput.type === 'password' ? 'text' : 'password';
                this.passwordInput.type = type;
                togglePassword.classList.toggle('fa-eye');
                togglePassword.classList.toggle('fa-eye-slash');
            });
        }
        
        const verTerminos = document.getElementById('verTerminos');
        if (verTerminos) {
            verTerminos.addEventListener('click', (e) => {
                e.preventDefault();
                this.showModal();
            });
        }
        
        const modalClose = document.querySelector('.modal-close');
        if (modalClose) {
            modalClose.addEventListener('click', () => this.hideModal());
        }
        
        const aceptarTerminos = document.getElementById('aceptarTerminos');
        if (aceptarTerminos) {
            aceptarTerminos.addEventListener('click', () => {
                if (this.terminosCheckbox) {
                    this.terminosCheckbox.checked = true;
                    this.actualizarBotonRegistro();
                }
                this.hideModal();
            });
        }
    }
    
    nextStep() {
        if (this.validateCurrentStep()) {
            if (this.currentStep < this.totalSteps) {
                this.currentStep++;
                this.updateStepDisplay();
                this.actualizarBotonRegistro();
            }
        }
    }
    
    prevStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.updateStepDisplay();
            this.actualizarBotonRegistro();
        }
    }
    
    updateStepDisplay() {
        if (this.step1Content) this.step1Content.style.display = this.currentStep === 1 ? 'block' : 'none';
        if (this.step2Content) this.step2Content.style.display = this.currentStep === 2 ? 'block' : 'none';
        if (this.step3Content) this.step3Content.style.display = this.currentStep === 3 ? 'block' : 'none';
        
        if (this.prevBtn) this.prevBtn.style.display = this.currentStep > 1 ? 'flex' : 'none';
        if (this.nextBtn) this.nextBtn.style.display = this.currentStep < this.totalSteps ? 'flex' : 'none';
        if (this.submitBtn) this.submitBtn.style.display = this.currentStep === this.totalSteps ? 'flex' : 'none';
        
        for (let i = 1; i <= this.totalSteps; i++) {
            const step = document.getElementById(`step${i}`);
            if (step) {
                step.classList.remove('active', 'completed');
                if (i === this.currentStep) step.classList.add('active');
                else if (i < this.currentStep) step.classList.add('completed');
            }
        }
        
        if (this.currentStep === 3) {
            this.updateResumen();
            this.actualizarBotonRegistro();
        }
    }
    
    validateCurrentStep() {
        switch(this.currentStep) {
            case 1: return this.validateStep1();
            case 2: return this.validateStep2();
            default: return true;
        }
    }
    
    validateStep1() {
        let isValid = true;
        isValid = this.validateNombre() && isValid;
        isValid = this.validateEmail() && isValid;
        isValid = this.validateTelefono() && isValid;
        return isValid;
    }
    
    validateStep2() {
        let isValid = true;
        isValid = this.validatePassword() && isValid;
        isValid = this.validateConfirmPassword() && isValid;
        return isValid;
    }
    
    validateNombre() {
        const nombre = this.nombreInput?.value.trim();
        const errorElement = document.getElementById('nombreError');
        if (!nombre) {
            if (errorElement) errorElement.textContent = 'El nombre es requerido';
            return false;
        }
        if (nombre.length < 3) {
            if (errorElement) errorElement.textContent = 'El nombre debe tener al menos 3 caracteres';
            return false;
        }
        if (errorElement) errorElement.textContent = '';
        return true;
    }
    
    validateEmail() {
        const email = this.emailInput?.value.trim();
        const errorElement = document.getElementById('emailError');
        if (!email) {
            if (errorElement) errorElement.textContent = 'El email es requerido';
            return false;
        }
        if (!email.includes('@') || !email.includes('.')) {
            if (errorElement) errorElement.textContent = 'Email inválido';
            return false;
        }
        if (errorElement) errorElement.textContent = '';
        return true;
    }
    
    validateTelefono() {
        const telefono = this.telefonoInput?.value.trim();
        const errorElement = document.getElementById('telefonoError');
        if (!telefono) {
            if (errorElement) errorElement.textContent = 'El teléfono es requerido';
            return false;
        }
        if (telefono.length < 10 || telefono.length > 10) {
            if (errorElement) errorElement.textContent = 'Teléfono inválido (10 dígitos)';
            return false;
        }
        if (errorElement) errorElement.textContent = '';
        return true;
    }
    
    validatePassword() {
        const password = this.passwordInput?.value;
        const errorElement = document.getElementById('passwordError');
        if (!password) {
            if (errorElement) errorElement.textContent = 'La contraseña es requerida';
            return false;
        }
        if (password.length < 6) {
            if (errorElement) errorElement.textContent = 'Mínimo 6 caracteres';
            return false;
        }
        if (errorElement) errorElement.textContent = '';
        return true;
    }
    
    validateConfirmPassword() {
        const password = this.passwordInput?.value;
        const confirm = this.confirmInput?.value;
        const errorElement = document.getElementById('confirmError');
        if (password !== confirm) {
            if (errorElement) errorElement.textContent = 'Las contraseñas no coinciden';
            return false;
        }
        if (errorElement) errorElement.textContent = '';
        return true;
    }
    
    setupPasswordStrength() {
        if (!this.passwordInput) return;
        this.passwordInput.addEventListener('input', () => this.updatePasswordStrength());
    }
    
    updatePasswordStrength() {
        const password = this.passwordInput?.value || '';
        const strengthBar = document.getElementById('passwordStrength');
        const strengthText = document.getElementById('passwordStrengthText');
        if (!strengthBar) return;
        
        if (password.length === 0) {
            strengthBar.style.width = '0%';
            if (strengthText) strengthText.textContent = '';
            return;
        }
        
        if (password.length < 6) {
            strengthBar.style.width = '33%';
            strengthBar.style.background = '#ef4444';
            if (strengthText) strengthText.textContent = 'Contraseña débil';
        } else if (password.length < 8) {
            strengthBar.style.width = '66%';
            strengthBar.style.background = '#f59e0b';
            if (strengthText) strengthText.textContent = 'Contraseña mediana';
        } else {
            strengthBar.style.width = '100%';
            strengthBar.style.background = '#10b981';
            if (strengthText) strengthText.textContent = 'Contraseña segura';
        }
    }
    
    updateResumen() {
        const resumenDiv = document.getElementById('resumenDatos');
        if (resumenDiv) {
            resumenDiv.innerHTML = `
                <div><strong>📝 Nombre:</strong> ${this.nombreInput?.value || ''}</div>
                <div><strong>📧 Email:</strong> ${this.emailInput?.value || ''}</div>
                <div><strong>📱 Teléfono:</strong> ${this.telefonoInput?.value || ''}</div>
            `;
        }
    }
    
    async handleRegister() {
        if (!this.terminosCheckbox?.checked) {
            this.mostrarNotificacion('Debes aceptar los términos y condiciones', 'warning');
            return;
        }
        
        const userData = {
            nombre: this.nombreInput?.value.trim(),
            email: this.emailInput?.value.trim(),
            telefono: this.telefonoInput?.value.trim(),
            password: this.passwordInput?.value
        };
        
        // Validaciones finales
        if (!userData.nombre || !userData.email || !userData.telefono || !userData.password) {
            this.mostrarNotificacion('Por favor completa todos los campos', 'warning');
            return;
        }
        
        if (userData.password.length < 6) {
            this.mostrarNotificacion('La contraseña debe tener al menos 6 caracteres', 'warning');
            return;
        }
        
        this.setLoading(true);
        
        try {
            if (!supabaseClient) throw new Error('Conexión no disponible');
            
            console.log('Registrando:', userData.email);
            
            // 1. Registrar en Supabase Auth
            const { data, error: authError } = await supabaseClient.auth.signUp({
                email: userData.email,
                password: userData.password,
                options: {
                    data: {
                        nombre: userData.nombre
                    },
                    emailRedirectTo: window.location.origin + '/confirmar-email.html'
                }
            });
            
            if (authError) throw new Error(authError.message);
            
            console.log('Auth exitoso');
            
            // 2. Registrar en tabla clientes
            const { error: clienteError } = await supabaseClient
                .from('clientes')
                .insert([{
                    nombre_cliente: userData.nombre,
                    correo: userData.email,
                    telefono: userData.telefono,
                    estado: 'activo'
                }]);
            
            if (clienteError) throw new Error(clienteError.message);
            
            this.mostrarNotificacion('✅ ¡Registro exitoso! Redirigiendo al login...', 'success');
            
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            
        } catch (error) {
            console.error('Error:', error);
            this.mostrarNotificacion('Error: ' + error.message, 'error');
        } finally {
            this.setLoading(false);
        }
    }
    
    setLoading(loading) {
        if (!this.submitBtn) return;
        if (loading) {
            this.submitBtn.disabled = true;
            this.submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando...';
        } else {
            this.submitBtn.disabled = false;
            this.submitBtn.innerHTML = '<i class="fas fa-user-check"></i> Registrarse';
        }
    }
    
    showModal() {
        const modal = document.getElementById('terminosModal');
        if (modal) modal.classList.add('show');
    }
    
    hideModal() {
        const modal = document.getElementById('terminosModal');
        if (modal) modal.classList.remove('show');
    }
    
    // ============================================
    // NOTIFICACIONES TIPO TOAST
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
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM listo, creando RegisterController');
    window.registerController = new RegisterController();
});