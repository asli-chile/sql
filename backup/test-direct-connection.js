const { createClient } = require('@supabase/supabase-js');

// Usar directamente la nueva API key
const supabaseUrl = 'https://knbnwbrjzkknarnkyriv.supabase.co';
const supabaseKey = 'sb_publishable_NzHIwidg8DuxunhWhpHvBQ_-uf0WcVp';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testDirectConnection() {
  console.log('🚀 Probando conexión directa con Supabase...');
  console.log('📋 URL:', supabaseUrl);
  console.log('🔑 Key:', supabaseKey.substring(0, 20) + '...');

  try {
    // Test 1: Verificar conectividad básica
    console.log('\n📡 Probando conectividad básica...');
    const { data: basicTest, error: basicError } = await supabase
      .from('registros')
      .select('id')
      .limit(1);

    if (basicError) {
      console.error('❌ Error de conectividad:', basicError);
      console.error('📋 Código:', basicError.code);
      console.error('📋 Mensaje:', basicError.message);
      console.error('📋 Hint:', basicError.hint);
    } else {
      console.log('✅ Conectividad básica OK');
      console.log('📋 Datos obtenidos:', basicTest?.length || 0);
    }

    // Test 2: Obtener algunos registros
    console.log('\n📋 Obteniendo registros...');
    const { data: registros, error: registrosError } = await supabase
      .from('registros')
      .select('id, ref_asli, ejecutivo, estado')
      .limit(5);

    if (registrosError) {
      console.error('❌ Error obteniendo registros:', registrosError);
    } else {
      console.log(`✅ Registros obtenidos: ${registros?.length || 0}`);
      if (registros && registros.length > 0) {
        console.log('📋 Primeros registros:');
        registros.forEach(reg => {
          console.log(`  🔢 ${reg.ref_asli} - ${reg.ejecutivo} - ${reg.estado}`);
        });
      }
    }

    // Test 3: Obtener catálogos
    console.log('\n📚 Obteniendo catálogos...');
    const { data: catalogos, error: catalogosError } = await supabase
      .from('catalogos')
      .select('categoria, valores')
      .limit(3);

    if (catalogosError) {
      console.error('❌ Error obteniendo catálogos:', catalogosError);
    } else {
      console.log(`✅ Catálogos obtenidos: ${catalogos?.length || 0}`);
      if (catalogos && catalogos.length > 0) {
        console.log('📚 Catálogos encontrados:');
        catalogos.forEach(cat => {
          console.log(`  📋 ${cat.categoria}: ${cat.valores?.length || 0} valores`);
        });
      }
    }

    console.log('\n🎉 Prueba completada');

  } catch (error) {
    console.error('💥 Error inesperado:', error);
  }
}

testDirectConnection();
