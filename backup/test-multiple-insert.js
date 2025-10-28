const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://knbnwbrjzkknarnkyriv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuYm53YnJqemtrbmFybmt5cml2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0ODQzOTYsImV4cCI6MjA3NzA2MDM5Nn0.l7pwhkJSinQQLAsDVFvefP8V5gn_v8rN2U6FG03qVqs';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testMultipleInsert() {
  console.log('🚀 Probando inserción de múltiples registros...');

  try {
    // Crear datos de prueba similares a los del formulario
    const testRecords = [
      {
        ref_asli: 'TEST001',
        ejecutivo: 'Test Ejecutivo',
        shipper: 'Test Cliente',
        naviera: 'Test Naviera',
        nave_inicial: 'Test Nave',
        especie: 'Test Especie',
        temperatura: null,
        cbm: null,
        pol: 'Test POL',
        pod: 'Test POD',
        deposito: 'Test Depósito',
        estado: 'PENDIENTE',
        tipo_ingreso: 'NORMAL',
        flete: 'Test Flete',
        comentario: 'Registro de prueba 1',
        cant_cont: 1,
        contenedor: '',
        ct: '',
        co2: null,
        o2: null,
        tt: null,
        roleada_desde: '',
        numero_bl: '',
        estado_bl: '',
        contrato: '',
        facturacion: '',
        booking_pdf: '',
        observacion: '',
        semana_ingreso: null,
        mes_ingreso: null,
        semana_zarpe: null,
        mes_zarpe: null,
        semana_arribo: null,
        mes_arribo: null,
        ingresado: new Date().toISOString(),
        etd: null,
        eta: null,
        ingreso_stacking: null,
        booking: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        ref_asli: 'TEST002',
        ejecutivo: 'Test Ejecutivo',
        shipper: 'Test Cliente',
        naviera: 'Test Naviera',
        nave_inicial: 'Test Nave',
        especie: 'Test Especie',
        temperatura: null,
        cbm: null,
        pol: 'Test POL',
        pod: 'Test POD',
        deposito: 'Test Depósito',
        estado: 'PENDIENTE',
        tipo_ingreso: 'NORMAL',
        flete: 'Test Flete',
        comentario: 'Registro de prueba 2',
        cant_cont: 1,
        contenedor: '',
        ct: '',
        co2: null,
        o2: null,
        tt: null,
        roleada_desde: '',
        numero_bl: '',
        estado_bl: '',
        contrato: '',
        facturacion: '',
        booking_pdf: '',
        observacion: '',
        semana_ingreso: null,
        mes_ingreso: null,
        semana_zarpe: null,
        mes_zarpe: null,
        semana_arribo: null,
        mes_arribo: null,
        ingresado: new Date().toISOString(),
        etd: null,
        eta: null,
        ingreso_stacking: null,
        booking: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    ];

    console.log('📋 Datos de prueba preparados:', testRecords.length, 'registros');
    console.log('🔄 Intentando insertar registros de prueba...');

    const { data: insertData, error: insertError } = await supabase
      .from('registros')
      .insert(testRecords)
      .select();

    if (insertError) {
      console.error('❌ Error insertando registros de prueba:', insertError);
      console.error('📋 Detalles del error:', JSON.stringify(insertError, null, 2));
      return;
    }

    console.log('✅ Registros de prueba insertados exitosamente:', insertData.length);
    console.log('📋 IDs generados:', insertData.map(r => r.id));

    // Limpiar registros de prueba
    console.log('🧹 Limpiando registros de prueba...');
    const testIds = insertData.map(r => r.id);
    const { error: deleteError } = await supabase
      .from('registros')
      .delete()
      .in('id', testIds);

    if (deleteError) {
      console.error('⚠️ Error limpiando registros de prueba:', deleteError);
    } else {
      console.log('✅ Registros de prueba eliminados');
    }

    console.log('🎉 Prueba de inserción múltiple completada exitosamente');

  } catch (error) {
    console.error('💥 Error inesperado:', error);
  }
}

testMultipleInsert();
