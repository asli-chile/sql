const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://knbnwbrjzkknarnkyriv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuYm53YnJqemtrbmFybmt5cml2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0ODQzOTYsImV4cCI6MjA3NzA2MDM5Nn0.l7pwhkJSinQQLAsDVFvefP8V5gn_v8rN2U6FG03qVqs';
const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnoseSupabaseIssue() {
  console.log('🔍 Diagnosticando problema con Supabase...');
  console.log('📋 URL:', supabaseUrl);
  console.log('🔑 Key (primeros 20 chars):', supabaseKey.substring(0, 20) + '...');

  try {
    // Test 1: Verificar conectividad básica
    console.log('\n📡 Probando conectividad básica...');
    const { data: basicTest, error: basicError } = await supabase
      .from('registros')
      .select('count')
      .limit(1);

    if (basicError) {
      console.error('❌ Error de conectividad:', basicError);
      console.error('📋 Código de error:', basicError.code);
      console.error('📋 Mensaje:', basicError.message);
      console.error('📋 Hint:', basicError.hint);
      
      // Analizar el tipo de error
      if (basicError.message === 'Invalid API key') {
        console.log('\n🔍 Análisis del error:');
        console.log('  - El proyecto puede estar pausado');
        console.log('  - La API key puede haber expirado');
        console.log('  - El proyecto puede haber sido eliminado');
        console.log('  - Puede haber un problema de red');
      }
    } else {
      console.log('✅ Conectividad básica OK');
    }

    // Test 2: Verificar si el proyecto existe
    console.log('\n🌐 Probando acceso al proyecto...');
    try {
      const response = await fetch(supabaseUrl + '/rest/v1/', {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      });
      
      console.log('📊 Status HTTP:', response.status);
      console.log('📊 Status Text:', response.statusText);
      
      if (response.status === 401) {
        console.log('🔍 Error 401: API key inválida o proyecto pausado');
      } else if (response.status === 404) {
        console.log('🔍 Error 404: Proyecto no encontrado');
      } else if (response.status === 200) {
        console.log('✅ Proyecto accesible');
      }
      
    } catch (fetchError) {
      console.error('❌ Error de red:', fetchError.message);
    }

    // Test 3: Verificar JWT token
    console.log('\n🔐 Analizando JWT token...');
    try {
      const tokenParts = supabaseKey.split('.');
      if (tokenParts.length === 3) {
        const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
        console.log('📋 Payload del token:');
        console.log('  - iss:', payload.iss);
        console.log('  - ref:', payload.ref);
        console.log('  - role:', payload.role);
        console.log('  - iat:', new Date(payload.iat * 1000).toISOString());
        console.log('  - exp:', new Date(payload.exp * 1000).toISOString());
        
        const now = Date.now() / 1000;
        if (payload.exp < now) {
          console.log('⚠️ Token expirado!');
        } else {
          console.log('✅ Token válido');
        }
      }
    } catch (jwtError) {
      console.error('❌ Error analizando JWT:', jwtError.message);
    }

  } catch (error) {
    console.error('💥 Error inesperado:', error);
  }
}

diagnoseSupabaseIssue();
