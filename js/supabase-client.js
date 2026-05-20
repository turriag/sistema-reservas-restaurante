// ============================================
// CONFIGURACIÓN DE SUPABASE
// ============================================
const SUPABASE_URL = 'https://fijdyrbfwtvmbpedyhjl.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ifeKGvdbxBexiO3Jd9QTDA_5u7-vCMt';

// ============================================
// CLIENTE DE SUPABASE
// ============================================
let supabaseClient = null;

async function initSupabase() {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Conectado a Supabase');
    return supabaseClient;
}

async function loginSupabase(email, password) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
    });
    if (error) throw error;
    return data;
}

async function getClienteByEmail(email) {
    const { data, error } = await supabaseClient
        .from('clientes')
        .select('*')
        .eq('correo', email)
        .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
}

async function getAdminByEmail(email) {
    const { data, error } = await supabaseClient
        .from('administradores')
        .select('*')
        .eq('correo', email)
        .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
}

// Inicializar
initSupabase();

// 🔴 EXPORTAR PARA USO GLOBAL
window.supabaseClient = supabaseClient;