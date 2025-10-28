const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://knbnwbrjzkknarnkyriv.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuYm53YnJqemtrbmFybmt5cml2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0ODQzOTYsImV4cCI6MjA3NzA2MDM5Nn0.l7pwhkJSinQQLAsDVFvefP8V5gn_v8rN2U6FG03qVqs';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testDataLoad() {
  console.log('🚀 Probando carga de datos desde Supabase...');

  try {
    // Test 1: Contar registros
    console.log('📊 Contando registros...');
    const { count: registrosCount, error: countError } = await supabase
      .from('registros')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error contando registros:', countError);
    } else {
      console.log(`✅ Total de registros: ${registrosCount}`);
    }

    // Test 2: Obtener algunos registros
    console.log('📋 Obteniendo registros...');
    const { data: registros, error: registrosError } = await supabase
      .from('registros')
      .select('id, ref_asli, ejecutivo, estado')
      .limit(5);

    if (registrosError) {
      console.error('❌ Error obteniendo registros:', registrosError);
    } else {
      console.log(`✅ Registros obtenidos: ${registros.length}`);
      if (registros.length > 0) {
        console.log('📋 Primeros registros:');
        registros.forEach(reg => {
          console.log(`  🔢 ${reg.ref_asli} - ${reg.ejecutivo} - ${reg.estado}`);
        });
      }
    }

    // Test 3: Contar catálogos
    console.log('📚 Contando catálogos...');
    const { count: catalogosCount, error: catalogosError } = await supabase
      .from('catalogos')
      .select('*', { count: 'exact', head: true });

    if (catalogosError) {
      console.error('❌ Error contando catálogos:', catalogosError);
    } else {
      console.log(`✅ Total de catálogos: ${catalogosCount}`);
    }

    // Test 4: Obtener catálogos
    console.log('📚 Obteniendo catálogos...');
    const { data: catalogos, error: catalogosDataError } = await supabase
      .from('catalogos')
      .select('categoria, valores')
      .limit(3);

    if (catalogosDataError) {
      console.error('❌ Error obteniendo catálogos:', catalogosDataError);
    } else {
      console.log(`✅ Catálogos obtenidos: ${catalogos.length}`);
      if (catalogos.length > 0) {
        console.log('📚 Catálogos encontrados:');
        catalogos.forEach(cat => {
          console.log(`  📋 ${cat.categoria}: ${cat.valores?.length || 0} valores`);
        });
      }
    }

    console.log('🎉 Diagnóstico completado');

  } catch (error) {
    console.error('💥 Error inesperado:', error);
  }
}

testDataLoad();
