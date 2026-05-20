/**
 * Sistema de Reservas de Restaurante
 * API Service - Conexión con Supabase/Backend
 * @version 1.0.0
 */

class API {
    constructor() {
        // Configuración de Supabase (reemplazar con tus credenciales)
        this.supabaseUrl = 'https://tu-proyecto.supabase.co';
        this.supabaseKey = 'tu-anon-key-aqui';
        this.useRealAPI = false; // Cambiar a true cuando tengas Supabase configurado
        
        // Endpoints simulados
        this.endpoints = {
            // Clientes
            clientes: '/api/clientes',
            clienteById: '/api/clientes/:id',
            
            // Mesas
            mesas: '/api/mesas',
            mesaById: '/api/mesas/:id',
            mesasDisponibles: '/api/mesas/disponibles',
            
            // Reservas
            reservas: '/api/reservas',
            reservaById: '/api/reservas/:id',
            reservasCliente: '/api/reservas/cliente/:clienteId',
            reservasFecha: '/api/reservas/fecha/:fecha',
            
            // Administradores
            administradores: '/api/administradores',
            adminById: '/api/administradores/:id',
            
            // Notificaciones
            notificaciones: '/api/notificaciones',
            notificacionesCliente: '/api/notificaciones/cliente/:correo',
            
            // Auth
            login: '/api/auth/login',
            register: '/api/auth/register',
            logout: '/api/auth/logout',
            verificarToken: '/api/auth/verify'
        };
    }

    // ============================================
    // MÉTODOS BASE HTTP
    // ============================================

    async request(endpoint, method = 'GET', data = null, params = {}) {
        const url = this.buildURL(endpoint, params);
        const options = {
            method,
            headers: this.getHeaders(),
            credentials: 'include'
        };

        if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            options.body = JSON.stringify(data);
        }

        try {
            if (this.useRealAPI) {
                const response = await fetch(url, options);
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || 'Error en la petición');
                }
                return await response.json();
            } else {
                // Usar datos simulados
                return await this.simulateRequest(endpoint, method, data, params);
            }
        } catch (error) {
            console.error(`Error en ${method} ${endpoint}:`, error);
            throw error;
        }
    }

    buildURL(endpoint, params = {}) {
        let url = this.useRealAPI ? this.supabaseUrl : '';
        let endpointPath = this.endpoints[endpoint] || endpoint;
        
        // Reemplazar parámetros en la URL
        Object.keys(params).forEach(key => {
            if (endpointPath.includes(`:${key}`)) {
                endpointPath = endpointPath.replace(`:${key}`, params[key]);
                delete params[key];
            }
        });
        
        url += endpointPath;
        
        // Agregar query params
        const queryParams = new URLSearchParams(params);
        if (queryParams.toString()) {
            url += `?${queryParams.toString()}`;
        }
        
        return url;
    }

    getHeaders() {
        const token = this.getToken();
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        return headers;
    }

    getToken() {
        return localStorage.getItem('token') || sessionStorage.getItem('token');
    }

    // ============================================
    // SIMULACIÓN DE RESPUESTAS (Modo Desarrollo)
    // ============================================

    async simulateRequest(endpoint, method, data, params) {
        // Simular delay de red
        await this.delay(500 + Math.random() * 500);
        
        switch(endpoint) {
            case 'login':
                return this.simulateLogin(data);
            case 'register':
                return this.simulateRegister(data);
            case 'clientes':
                return this.simulateClientes(method, data, params);
            case 'mesas':
                return this.simulateMesas(method, data, params);
            case 'reservas':
                return this.simulateReservas(method, data, params);
            case 'notificaciones':
                return this.simulateNotificaciones(method, data, params);
            default:
                return { success: true, data: [] };
        }
    }

    simulateLogin(data) {
        const { email, password } = data;
        
        // Usuarios de prueba
        const usuarios = {
            'cliente@test.com': {
                id: 1,
                nombre: 'Cliente Test',
                email: 'cliente@test.com',
                rol: 'cliente',
                telefono: '3001234567'
            },
            'admin@restaurante.com': {
                id: 1,
                nombre: 'Administrador',
                email: 'admin@restaurante.com',
                rol: 'admin',
                telefono: '3009999999'
            }
        };
        
        const usuario = usuarios[email];
        
        if (usuario && password === '123456') {
            return {
                success: true,
                data: {
                    user: usuario,
                    token: 'fake-jwt-token-' + Date.now()
                },
                message: 'Inicio de sesión exitoso'
            };
        }
        
        return {
            success: false,
            message: 'Credenciales inválidas'
        };
    }

    simulateRegister(data) {
        const { email } = data;
        
        if (email === 'cliente@test.com') {
            return {
                success: false,
                message: 'El correo ya está registrado'
            };
        }
        
        return {
            success: true,
            data: {
                id: Math.floor(Math.random() * 1000),
                ...data
            },
            message: 'Registro exitoso'
        };
    }

    simulateClientes(method, data, params) {
        const clientesDB = [
            { id: 1, nombre: 'Juan Pérez', email: 'juan@email.com', telefono: '3001111111', fechaRegistro: '2024-12-01', estado: 'activo' },
            { id: 2, nombre: 'María López', email: 'maria@email.com', telefono: '3002222222', fechaRegistro: '2024-12-02', estado: 'activo' },
            { id: 3, nombre: 'Carlos Gómez', email: 'carlos@email.com', telefono: '3003333333', fechaRegistro: '2024-12-03', estado: 'activo' }
        ];
        
        switch(method) {
            case 'GET':
                if (params.id) {
                    const cliente = clientesDB.find(c => c.id == params.id);
                    return { success: true, data: cliente };
                }
                return { success: true, data: clientesDB };
            case 'POST':
                const nuevoCliente = {
                    id: clientesDB.length + 1,
                    ...data,
                    fechaRegistro: new Date().toISOString().split('T')[0]
                };
                return { success: true, data: nuevoCliente, message: 'Cliente creado exitosamente' };
            case 'PUT':
                return { success: true, data: { ...data, id: params.id }, message: 'Cliente actualizado' };
            case 'DELETE':
                return { success: true, message: 'Cliente eliminado' };
            default:
                return { success: true, data: clientesDB };
        }
    }

    simulateMesas(method, data, params) {
        const mesasDB = [
            { id: 1, capacidad: 2, ubicacion: 'Salón principal', estado: 'disponible' },
            { id: 2, capacidad: 4, ubicacion: 'Terraza', estado: 'disponible' },
            { id: 3, capacidad: 6, ubicacion: 'Salón VIP', estado: 'ocupada' },
            { id: 4, capacidad: 8, ubicacion: 'Salón principal', estado: 'disponible' }
        ];
        
        switch(method) {
            case 'GET':
                if (params.id) {
                    const mesa = mesasDB.find(m => m.id == params.id);
                    return { success: true, data: mesa };
                }
                if (endpoint === 'mesasDisponibles') {
                    const disponibles = mesasDB.filter(m => m.estado === 'disponible' && m.capacidad >= (params.personas || 1));
                    return { success: true, data: disponibles };
                }
                return { success: true, data: mesasDB };
            case 'POST':
                const nuevaMesa = { id: mesasDB.length + 1, ...data };
                return { success: true, data: nuevaMesa, message: 'Mesa creada' };
            case 'PUT':
                return { success: true, data: { ...data, id: params.id }, message: 'Mesa actualizada' };
            case 'DELETE':
                return { success: true, message: 'Mesa eliminada' };
            default:
                return { success: true, data: mesasDB };
        }
    }

    simulateReservas(method, data, params) {
        const reservasDB = [
            { id: 1, clienteId: 1, clienteNombre: 'Juan Pérez', mesaId: 2, fecha: '2024-12-15', hora: '19:00', personas: 2, estado: 'confirmada', observaciones: '' },
            { id: 2, clienteId: 2, clienteNombre: 'María López', mesaId: 3, fecha: '2024-12-15', hora: '20:00', personas: 4, estado: 'confirmada', observaciones: '' }
        ];
        
        switch(method) {
            case 'GET':
                if (params.id) {
                    const reserva = reservasDB.find(r => r.id == params.id);
                    return { success: true, data: reserva };
                }
                if (params.clienteId) {
                    const reservasCliente = reservasDB.filter(r => r.clienteId == params.clienteId);
                    return { success: true, data: reservasCliente };
                }
                if (params.fecha) {
                    const reservasFecha = reservasDB.filter(r => r.fecha === params.fecha);
                    return { success: true, data: reservasFecha };
                }
                return { success: true, data: reservasDB };
            case 'POST':
                const nuevaReserva = {
                    id: reservasDB.length + 1,
                    ...data,
                    fechaCreacion: new Date().toISOString()
                };
                return { success: true, data: nuevaReserva, message: 'Reserva creada exitosamente' };
            case 'PUT':
                return { success: true, data: { ...data, id: params.id }, message: 'Reserva actualizada' };
            case 'DELETE':
                return { success: true, message: 'Reserva cancelada' };
            default:
                return { success: true, data: reservasDB };
        }
    }

    simulateNotificaciones(method, data, params) {
        const notificacionesDB = [
            { id: 1, reservaId: 1, correo: 'juan@email.com', mensaje: 'Reserva confirmada', fecha: '2024-12-14T10:00:00', leida: false },
            { id: 2, reservaId: 2, correo: 'maria@email.com', mensaje: 'Reserva confirmada', fecha: '2024-12-14T10:30:00', leida: false }
        ];
        
        switch(method) {
            case 'GET':
                if (params.correo) {
                    const notifsCliente = notificacionesDB.filter(n => n.correo === params.correo);
                    return { success: true, data: notifsCliente };
                }
                return { success: true, data: notificacionesDB };
            case 'POST':
                const nuevaNotif = { id: notificacionesDB.length + 1, ...data, fecha: new Date().toISOString() };
                return { success: true, data: nuevaNotif };
            case 'PUT':
                return { success: true, data: { ...data, id: params.id }, message: 'Notificación actualizada' };
            default:
                return { success: true, data: notificacionesDB };
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ============================================
    // MÉTODOS PÚBLICOS DE LA API
    // ============================================

    // Auth
    async login(email, password) {
        return this.request('login', 'POST', { email, password });
    }

    async register(userData) {
        return this.request('register', 'POST', userData);
    }

    async logout() {
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        localStorage.removeItem('usuario');
        sessionStorage.removeItem('usuario');
        return { success: true };
    }

    async verificarToken() {
        return this.request('verificarToken', 'GET');
    }

    // Clientes
    async getClientes(filtros = {}) {
        return this.request('clientes', 'GET', null, filtros);
    }

    async getClienteById(id) {
        return this.request('clienteById', 'GET', null, { id });
    }

    async createCliente(data) {
        return this.request('clientes', 'POST', data);
    }

    async updateCliente(id, data) {
        return this.request('clienteById', 'PUT', data, { id });
    }

    async deleteCliente(id) {
        return this.request('clienteById', 'DELETE', null, { id });
    }

    // Mesas
    async getMesas(filtros = {}) {
        return this.request('mesas', 'GET', null, filtros);
    }

    async getMesaById(id) {
        return this.request('mesaById', 'GET', null, { id });
    }

    async getMesasDisponibles(fecha, hora, personas) {
        return this.request('mesasDisponibles', 'GET', null, { fecha, hora, personas });
    }

    async createMesa(data) {
        return this.request('mesas', 'POST', data);
    }

    async updateMesa(id, data) {
        return this.request('mesaById', 'PUT', data, { id });
    }

    async deleteMesa(id) {
        return this.request('mesaById', 'DELETE', null, { id });
    }

    // Reservas
    async getReservas(filtros = {}) {
        return this.request('reservas', 'GET', null, filtros);
    }

    async getReservaById(id) {
        return this.request('reservaById', 'GET', null, { id });
    }

    async getReservasByCliente(clienteId) {
        return this.request('reservasCliente', 'GET', null, { clienteId });
    }

    async getReservasByFecha(fecha) {
        return this.request('reservasFecha', 'GET', null, { fecha });
    }

    async createReserva(data) {
        return this.request('reservas', 'POST', data);
    }

    async updateReserva(id, data) {
        return this.request('reservaById', 'PUT', data, { id });
    }

    async cancelReserva(id) {
        return this.request('reservaById', 'DELETE', null, { id });
    }

    // Notificaciones
    async getNotificaciones(filtros = {}) {
        return this.request('notificaciones', 'GET', null, filtros);
    }

    async getNotificacionesByCliente(correo) {
        return this.request('notificacionesCliente', 'GET', null, { correo });
    }

    async createNotificacion(data) {
        return this.request('notificaciones', 'POST', data);
    }
}

// Instancia global de la API
const api = new API();
window.api = api;