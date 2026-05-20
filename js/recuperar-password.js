/**
 * Sistema de Reservas de Restaurante
 * Recuperación de Contraseña
 */

class RecuperarPassword {
    constructor() {
        this.form = document.getElementById('recuperarForm');
        this.emailInput = document.getElementById('email');
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
    }
    
    setupEventListeners() {
        if (this.form) {
            this.form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.enviarRecuperacion();
            });
        }
    }
    
    async enviarRecuperacion() {
        const email = this.emailInput.value.trim();
        
        if (!email) {
            this.showMessage('Por favor ingresa tu correo electrónico', 'error');
            return;
        }
        
        if (!this.validarEmail(email)) {
            this.showMessage('Ingresa un correo electrónico válido', 'error');
            return;
        }
        
        this.showLoading(true);
        
        try {
            // Usar la función de Supabase para restablecer contraseña
            const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + '/reset-password.html'
            });
            
            if (error) throw error;
            
            this.showMessage(
                '✅ ¡Correo enviado! Revisa tu bandeja de entrada para restablecer tu contraseña.',
                'success'
            );
            this.emailInput.value = '';
            
        } catch (error) {
            console.error('Error:', error);
            this.showMessage('❌ Error: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
    validarEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
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
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
        } else {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar enlace';
        }
    }
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    new RecuperarPassword();
});