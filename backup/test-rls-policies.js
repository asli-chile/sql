const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://knbnwbrjzkknarnkyriv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuYm53YnJqemtrbmFybmt5cml2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0ODQzOTYsImV4cCI6MjA3NzA2MDM5Nn0.l7pwhkJSinQQLAsDVFvefP8V5gn_v8rN2U6FG03qVqs';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testRLSPolicies() {
  console.log('🔍 Probando políticas RLS y acceso a datos...');

  try {
    // Test 1: Verificar si podemos acceder sin autenticación
    console.log('\n📡 Probando acceso básico...');
    const { data: basicData, error: basicError } = await supabase
      .from('registros')
      .select('count')
      .limit(1);

    if (basicError) {
      console.error('❌ Error básico:', basicError);
    } else {
      console.log('✅ Acceso básico OK');
    }

    // Test 2: Intentar obtener datos con diferentes enfoques
    console.log('\n📋 Probando diferentes consultas...');
    
    // Consulta simple
    const { data: simpleData, error: simpleError } = await supabase
      .from('registros')
      .select('id')
      .limit(1);

    if (simpleError) {
      console.error('❌ Error consulta simple:', simpleError);
    } else {
      console.log('✅ Consulta simple OK, datos:', simpleData?.length || 0);
    }

    // Test 3: Verificar si hay datos en las tablas
    console.log('\n📊 Verificando existencia de datos...');
    
    // Verificar registros
    const { data: registrosData, error: registrosError } = await supabase
      .from('registros')
      .select('id, ref_asli')
      .limit(1);

    if (registrosError) {
      console.error('❌ Error verificando registros:', registrosError);
    } else {
      console.log('✅ Registros encontrados:', registrosData?.length || 0);
      if (registrosData && registrosData.length > 0) {
        console.log('📋 Primer registro:', registrosData[0]);
      }
    }

    // Verificar catálogos
    const { data: catalogosData, error: catalogosError } = await supabase
      .from('catalogos')
      .select('categoria')
      .limit(1);

    if (catalogosError) {
      console.error('❌ Error verificando catálogos:', catalogosError);
    } else {
      console.log('✅ Catálogos encontrados:', catalogosData?.length || 0);
      if (catalogosData && catalogosData.length > 0) {
        console.log('📋 Primer catálogo:', catalogosData[0]);
      }
    }

    // Test 4: Probar con service role key (si está disponible)
    console.log('\n🔑 Probando con service role...');
    const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuYm53YnJqemtrbmFybmt5cml2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTQ4NDM5NiwiZXhwIjoyMDc3MDYwMzk2fQ.6QjOvJRWWctS97wODrU6CRm-tMoanPhJ0rq6QuDwjuc';
    const supabaseService = require('@supabase/supabase-js').createClient(supabaseUrl, serviceRoleKey);

    const { data: serviceData, error: serviceError } = await supabaseService
      .from('registros')
      .select('id, ref_asli')
      .limit(1);

    if (serviceError) {
      console.error('❌ Error con service role:', serviceError);
    } else {
      console.log('✅ Service role OK, datos:', serviceData?.length || 0);
      if (serviceData && serviceData.length > 0) {
        console.log('📋 Datos con service role:', serviceData[0]);
      }
    }

  } catch (error) {
    console.error('💥 Error inesperado:', error);
  }
}

testRLSPolicies();
