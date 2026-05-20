/**
 * Sistema de Reservas de Restaurante
 * Configuración Global y Constantes
 * @version 1.0.0
 */

// ============================================
// CONFIGURACIÓN DE LA BASE DE DATOS
// ============================================

// Configuración para Supabase (reemplazar con tus credenciales reales)
const SUPABASE_CONFIG = {
    url: 'https://tu-proyecto.supabase.co',  // Reemplazar con tu URL
    anonKey: 'tu-anon-key-aqui',              // Reemplazar con tu clave anónima
    apiKey: 'tu-api-key-aqui'                 // Reemplazar si es necesario
};

// Configuración de API (para desarrollo local)
const API_CONFIG = {
    baseURL: window.location.origin,
    endpoints: {
        login: '/api/login',
        register: '/api/register',
        reservas: '/api/reservas',
        mesas: '/api/mesas',
        clientes: '/api/clientes',
        notificaciones: '/api/notificaciones'
    },
    timeout: 30000 // 30 segundos
};

// ============================================
// CONSTANTES DEL SISTEMA
// ============================================

// Estados de reserva
const ESTADOS_RESERVA = {
    CONFIRMADA: 'confirmada',
    CANCELADA: 'cancelada',
    PENDIENTE: 'pendiente',
    COMPLETADA: 'completada'
};

// Estados de mesa
const ESTADOS_MESA = {
    DISPONIBLE: 'disponible',
    OCUPADA: 'ocupada',
    MANTENIMIENTO: 'mantenimiento'
};

// Capacidades de mesa (mínimo y máximo)
const CAPACIDAD_MESA = {
    MIN: 1,
    MAX: 20,
    DEFAULT: 4
};

// Horarios del restaurante
const HORARIOS = {
    APERTURA: '12:00',
    CIERRE: '23:00',
    INTERVALO: 30, // minutos entre reservas
    DIAS_LABORALES: 'LUNES_A_DOMINGO'
};

// Tiempo máximo de anticipación para reservas (días)
const ANTICIPACION_MAXIMA = 30;

// Tiempo mínimo de anticipación para reservas (horas)
const ANTICIPACION_MINIMA = 1;

// Mensajes del sistema
const MENSAJES = {
    // Éxito
    EXITO_REGISTRO: 'Registro exitoso. Por favor inicia sesión.',
    EXITO_RESERVA: 'Reserva creada exitosamente. Se ha enviado una notificación a tu correo.',
    EXITO_ACTUALIZACION: 'Actualización exitosa.',
    EXITO_ELIMINACION: 'Eliminación exitosa.',
    
    // Error
    ERROR_CAMPOS: 'Por favor completa todos los campos requeridos.',
    ERROR_EMAIL: 'Por favor ingresa un correo electrónico válido.',
    ERROR_CONTRASENA: 'La contraseña debe tener al menos 6 caracteres.',
    ERROR_CONTRASENAS_NO_COINCIDEN: 'Las contraseñas no coinciden.',
    ERROR_TELEFONO: 'Por favor ingresa un número de teléfono válido.',
    ERROR_FECHA: 'La fecha seleccionada no es válida.',
    ERROR_HORA: 'La hora seleccionada está fuera del horario del restaurante.',
    ERROR_CAPACIDAD: 'La capacidad de la mesa no es suficiente para el número de personas.',
    ERROR_RESERVA_DUPLICADA: 'Ya existe una reserva para esta mesa en el horario seleccionado.',
    ERROR_LOGIN: 'Credenciales inválidas. Por favor verifica tu correo y contraseña.',
    ERROR_SERVIDOR: 'Error del servidor. Por favor intenta más tarde.',
    ERROR_RED: 'Error de conexión. Verifica tu conexión a internet.',
    
    // Advertencia
    ADVERTENCIA_CANCELACION: '¿Estás seguro de cancelar esta reserva? Esta acción no se puede deshacer.',
    ADVERTENCIA_ELIMINACION: '¿Estás seguro de eliminar este registro? Esta acción no se puede deshacer.',
    
    // Información
    INFO_RESERVA_LIMITE: `Las reservas se pueden hacer con ${ANTICIPACION_MINIMA} hora de anticipación.`,
    INFO_CANCELACION: 'Las cancelaciones se deben realizar al menos 1 hora antes de la reserva.',
    INFO_HORARIO: `Horario de atención: ${HORARIOS.APERTURA} - ${HORARIOS.CIERRE}`
};

// ============================================
// FUNCIONES DE VALIDACIÓN
// ============================================

/**
 * Valida si un email tiene formato correcto
 */
function validarEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

/**
 * Valida si una contraseña es segura
 */
function validarContrasena(contrasena) {
    return contrasena && contrasena.length >= 6;
}

/**
 * Valida si un teléfono tiene formato correcto (Colombia)
 */
function validarTelefono(telefono) {
    const regex = /^3\d{9}$/;
    return regex.test(telefono);
}

/**
 * Valida si una fecha es válida y está dentro del rango permitido
 */
function validarFecha(fecha) {
    const fechaSeleccionada = new Date(fecha);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const fechaMaxima = new Date();
    fechaMaxima.setDate(hoy.getDate() + ANTICIPACION_MAXIMA);
    
    return fechaSeleccionada >= hoy && fechaSeleccionada <= fechaMaxima;
}

/**
 * Valida si una hora está dentro del horario del restaurante
 */
function validarHora(hora) {
    const [horas, minutos] = hora.split(':');
    const horaNumerica = parseInt(horas) + parseInt(minutos) / 60;
    
    const apertura = parseFloat(HORARIOS.APERTURA.replace(':', '.'));
    const cierre = parseFloat(HORARIOS.CIERRE.replace(':', '.'));
    
    return horaNumerica >= apertura && horaNumerica <= cierre;
}

/**
 * Valida número de personas
 */
function validarNumeroPersonas(numero) {
    return numero >= CAPACIDAD_MESA.MIN && numero <= CAPACIDAD_MESA.MAX;
}

// ============================================
// FUNCIONES DE UTILIDAD GENERAL
// ============================================

/**
 * Muestra un mensaje de notificación al usuario
 */
function mostrarNotificacion(mensaje, tipo = 'info', duracion = 5000) {
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${tipo}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas ${getIconoTipo(tipo)}"></i>
            <span>${mensaje}</span>
        </div>
        <button class="toast-close">&times;</button>
    `;
    
    document.body.appendChild(toast);
    
    // Animación de entrada
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Cerrar automáticamente
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duracion);
    
    // Cerrar manualmente
    toast.querySelector('.toast-close').onclick = () => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    };
}

/**
 * Obtiene el ícono según el tipo de notificación
 */
function getIconoTipo(tipo) {
    const iconos = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    return iconos[tipo] || iconos.info;
}

/**
 * Formatea una fecha para mostrar
 */
function formatearFecha(fecha, formato = 'DD/MM/YYYY') {
    const date = new Date(fecha);
    const dia = String(date.getDate()).padStart(2, '0');
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const anio = date.getFullYear();
    
    const formatos = {
        'DD/MM/YYYY': `${dia}/${mes}/${anio}`,
        'YYYY-MM-DD': `${anio}-${mes}-${dia}`,
        'DD MMM YYYY': `${dia} ${getNombreMes(mes)} ${anio}`
    };
    
    return formatos[formato] || formatos['DD/MM/YYYY'];
}

/**
 * Obtiene el nombre del mes
 */
function getNombreMes(numeroMes) {
    const meses = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return meses[parseInt(numeroMes) - 1];
}

/**
 * Muestra un loader/spinner
 */
function mostrarLoader(elemento = null) {
    const loader = document.createElement('div');
    loader.className = 'loader-overlay';
    loader.innerHTML = '<div class="loader"></div>';
    
    if (elemento) {
        elemento.style.position = 'relative';
        elemento.appendChild(loader);
    } else {
        document.body.appendChild(loader);
    }
}

/**
 * Oculta el loader
 */
function ocultarLoader(elemento = null) {
    if (elemento) {
        const loader = elemento.querySelector('.loader-overlay');
        if (loader) loader.remove();
    } else {
        const loader = document.querySelector('.loader-overlay');
        if (loader) loader.remove();
    }
}

/**
 * Guarda datos en localStorage
 */
function guardarLocalStorage(clave, dato) {
    localStorage.setItem(clave, JSON.stringify(dato));
}

/**
 * Obtiene datos de localStorage
 */
function obtenerLocalStorage(clave) {
    const dato = localStorage.getItem(clave);
    return dato ? JSON.parse(dato) : null;
}

/**
 * Elimina datos de localStorage
 */
function eliminarLocalStorage(clave) {
    localStorage.removeItem(clave);
}

/**
 * Limpia el localStorage (cierre de sesión)
 */
function limpiarSesion() {
    eliminarLocalStorage('usuario');
    eliminarLocalStorage('token');
    eliminarLocalStorage('rol');
}

// ============================================
// EXPO RTAR FUNCIONES GLOBALES
// ============================================

window.config = {
    SUPABASE_CONFIG,
    API_CONFIG,
    ESTADOS_RESERVA,
    ESTADOS_MESA,
    CAPACIDAD_MESA,
    HORARIOS,
    ANTICIPACION_MAXIMA,
    ANTICIPACION_MINIMA,
    MENSAJES
};

window.utils = {
    validarEmail,
    validarContrasena,
    validarTelefono,
    validarFecha,
    validarHora,
    validarNumeroPersonas,
    mostrarNotificacion,
    formatearFecha,
    mostrarLoader,
    ocultarLoader,
    guardarLocalStorage,
    obtenerLocalStorage,
    eliminarLocalStorage,
    limpiarSesion
};

// ============================================
// INICIALIZACIÓN GLOBAL
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    // Verificar si hay usuario logueado
    const usuario = obtenerLocalStorage('usuario');
    if (usuario && window.location.pathname === '/login.html') {
        // Redirigir según el rol
        if (usuario.rol === 'admin') {
            window.location.href = 'dashboard-admin.html';
        } else {
            window.location.href = 'dashboard-cliente.html';
        }
    }
    
    console.log('✅ Sistema de Reservas Inicializado');
});