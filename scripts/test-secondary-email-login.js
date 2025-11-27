// Script de prueba para verificar el login con emails secundarios
// Ejecuta esto en la consola del navegador (F12)

async function testSecondaryEmailLogin() {
    const email = 'informaciones@asli.cl';
    const password = 'asli2025';

    console.log('=== PRUEBA DE LOGIN CON EMAIL SECUNDARIO ===');
    console.log('Email:', email);

    // Paso 1: Verificar si el email es secundario
    console.log('\n1. Verificando si el email es secundario...');
    const checkResponse = await fetch(`/api/user/check-email?email=${encodeURIComponent(email)}`);
    const checkData = await checkResponse.json();
    console.log('Respuesta:', checkData);

    if (checkData.is_secondary) {
        console.log('✅ Email es secundario');
        console.log('📧 Email principal:', checkData.primary_email);
    } else {
        console.log('ℹ️ Email es principal o no existe como secundario');
    }

    // Paso 2: Intentar login
    console.log('\n2. Intentando login...');
    const emailToUse = checkData.primary_email || email;
    console.log('Email a usar para auth:', emailToUse);

    // Nota: Esto usará el cliente Supabase del navegador
    // Asegúrate de que la página de login esté cargada
    console.log('\n⚠️ IMPORTANTE: Ejecuta este código en la página de login');
    console.log('Código para copiar y pegar en la página de login:');
    console.log(`
// Ejecutar en la página de login
const supabase = window.supabase || (await import('@/lib/supabase-browser')).createClient();
const result = await supabase.auth.signInWithPassword({
  email: '${emailToUse}',
  password: '${password}'
});
console.log('Resultado del login:', result);
if (result.error) {
  console.error('❌ Error:', result.error.message);
} else {
  console.log('✅ Login exitoso!');
  console.log('Usuario:', result.data.user.email);
}
  `);
}

// Ejecutar la prueba
testSecondaryEmailLogin();
