const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://knbnwbrjzkknarnkyriv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuYm53YnJqemtrbmFybmt5cml2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0ODQzOTYsImV4cCI6MjA3NzA2MDM5Nn0.l7pwhkJSinQQLAsDVFvefP8V5gn_v8rN2U6FG03qVqs';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSupabaseConnection() {
  console.log('🚀 Verificando conexión con Supabase...');

  try {
    // Test 1: Verificar conectividad básica
    console.log('📡 Probando conectividad básica...');
    const { data: basicTest, error: basicError } = await supabase
      .from('registros')
      .select('count')
      .limit(1);

    if (basicError) {
      console.error('❌ Error de conectividad básica:', basicError);
      return;
    }
    console.log('✅ Conectividad básica OK');

    // Test 2: Verificar permisos de lectura
    console.log('📖 Probando permisos de lectura...');
    const { data: readTest, error: readError } = await supabase
      .from('registros')
      .select('id, ref_asli')
      .limit(5);

    if (readError) {
      console.error('❌ Error de lectura:', readError);
      return;
    }
    console.log('✅ Permisos de lectura OK');
    console.log(`📊 Registros encontrados: ${readTest.length}`);

    // Test 3: Verificar permisos de inserción con un registro de prueba
    console.log('✏️ Probando permisos de inserción...');
    const testRecord = {
      ref_asli: 'TEST_CONNECTION',
      ejecutivo: 'Test',
      shipper: 'Test',
      naviera: 'Test',
      nave_inicial: 'Test',
      especie: 'Test',
      pol: 'Test',
      pod: 'Test',
      deposito: 'Test',
      estado: 'PENDIENTE',
      tipo_ingreso: 'NORMAL',
      flete: 'Test',
      cant_cont: 1,
      contenedor: '',
      ct: '',
      roleada_desde: '',
      numero_bl: '',
      estado_bl: '',
      contrato: '',
      facturacion: '',
      booking_pdf: '',
      observacion: '',
      booking: '',
      ingresado: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: insertTest, error: insertError } = await supabase
      .from('registros')
      .insert(testRecord)
      .select();

    if (insertError) {
      console.error('❌ Error de inserción:', insertError);
      console.error('📋 Detalles:', JSON.stringify(insertError, null, 2));
      return;
    }

    console.log('✅ Permisos de inserción OK');
    console.log('📋 Registro de prueba insertado:', insertTest[0].id);

    // Limpiar registro de prueba
    console.log('🧹 Limpiando registro de prueba...');
    const { error: deleteError } = await supabase
      .from('registros')
      .delete()
      .eq('id', insertTest[0].id);

    if (deleteError) {
      console.error('⚠️ Error limpiando registro de prueba:', deleteError);
    } else {
      console.log('✅ Registro de prueba eliminado');
    }

    console.log('🎉 Todas las pruebas de conexión pasaron exitosamente');

  } catch (error) {
    console.error('💥 Error inesperado:', error);
  }
}

checkSupabaseConnection();
