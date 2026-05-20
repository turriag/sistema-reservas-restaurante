/**
 * Sistema de Reservas de Restaurante
 * Restablecer Contraseña
 */

class ResetPassword {
    constructor() {
        this.form = document.getElementById('resetForm');
        this.passwordInput = document.getElementById('password');
        this.confirmInput = document.getElementById('confirmPassword');
        this.messageDiv = document.getElementById('message');
        
        this.init();
    }
    
    async init() {
        // Esperar Supabase
        let esperas = 0;
        while (typeof supabaseClient === 'undefined' || !supabaseClient) {
            await new Promise(resolve => setTimeout(resolve, 200));
            esperas++;
            if (esperas > 30) {
                this.showMessage('Error de conexión. Recarga la página.', 'error');
                return;
            }
        }
        
        this.setupEventListeners();
        this.setupPasswordStrength();
    }
    
    setupEventListeners() {
        if (this.form) {
            this.form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.resetPassword();
            });
        }
        
        if (this.passwordInput) {
            this.passwordInput.addEventListener('input', () => this.updatePasswordStrength());
        }
    }
    
    setupPasswordStrength() {
        this.passwordInput.addEventListener('input', () => this.updatePasswordStrength());
    }
    
    updatePasswordStrength() {
        const password = this.passwordInput.value;
        const strengthBar = document.getElementById('strengthBar');
        const strengthText = document.getElementById('strengthText');
        
        if (!strengthBar) return;
        
        if (password.length === 0) {
            strengthBar.style.width = '0%';
            strengthText.textContent = '';
            return;
        }
        
        const strength = this.calculateStrength(password);
        
        if (strength === 'weak') {
            strengthBar.className = 'strength-bar strength-weak';
            strengthText.textContent = 'Contraseña débil';
            strengthText.style.color = '#ef4444';
        } else if (strength === 'medium') {
            strengthBar.className = 'strength-bar strength-medium';
            strengthText.textContent = 'Contraseña mediana';
            strengthText.style.color = '#f59e0b';
        } else {
            strengthBar.className = 'strength-bar strength-strong';
            strengthText.textContent = 'Contraseña segura';
            strengthText.style.color = '#10b981';
        }
    }
    
    calculateStrength(password) {
        let score = 0;
        if (password.length >= 8) score++;
        if (password.length >= 12) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;
        
        if (score < 2) return 'weak';
        if (score < 4) return 'medium';
        return 'strong';
    }
    
    async resetPassword() {
        const password = this.passwordInput.value;
        const confirm = this.confirmInput.value;
        
        if (!password) {
            this.showMessage('Ingresa una nueva contraseña', 'error');
            return;
        }
        
        if (password.length < 6) {
            this.showMessage('La contraseña debe tener al menos 6 caracteres', 'error');
            return;
        }
        
        if (password !== confirm) {
            this.showMessage('Las contraseñas no coinciden', 'error');
            return;
        }
        
        this.showLoading(true);
        
        try {
            // Actualizar la contraseña en Supabase
            const { error } = await supabaseClient.auth.updateUser({
                password: password
            });
            
            if (error) throw error;
            
            this.showMessage('✅ ¡Contraseña actualizada! Redirigiendo al login...', 'success');
            
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 3000);
            
        } catch (error) {
            console.error('Error:', error);
            this.showMessage('❌ Error: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
    showMessage(message, type) {
        this.messageDiv.textContent = message;
        this.messageDiv.className = `message message-${type} show`;
        
        setTimeout(() => {
            this.messageDiv.classList.remove('show');
        }, 5000);
    }
    
    showLoading(loading) {
        const btn = this.form.querySelector('button[type="submit"]');
        if (loading) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Actualizando...';
        } else {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save"></i> Actualizar contraseña';
        }
    }
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    new ResetPassword();
});