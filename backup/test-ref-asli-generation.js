const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://knbnwbrjzkknarnkyriv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuYm53YnJqemtrbmFybmt5cml2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0ODQzOTYsImV4cCI6MjA3NzA2MDM5Nn0.l7pwhkJSinQQLAsDVFvefP8V5gn_v8rN2U6FG03qVqs';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testRefAsliGeneration() {
  console.log('🚀 Probando generación de REF ASLI...');

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

    // Test 2: Obtener REF ASLI existentes
    console.log('🔍 Obteniendo REF ASLI existentes...');
    const { data: registros, error: registrosError } = await supabase
      .from('registros')
      .select('ref_asli')
      .order('ref_asli', { ascending: true })
      .limit(10);

    if (registrosError) {
      console.error('❌ Error obteniendo REF ASLI:', registrosError);
      return;
    }

    console.log(`✅ REF ASLI obtenidos: ${registros.length}`);
    if (registros.length > 0) {
      console.log('📋 Primeros REF ASLI encontrados:');
      registros.slice(0, 5).forEach(registro => {
        console.log(`  🔢 ${registro.ref_asli}`);
      });
    }

    // Test 3: Simular generación de REF ASLI único
    console.log('🔢 Simulando generación de REF ASLI único...');
    
    const numerosExistentes = new Set();
    if (registros && registros.length > 0) {
      registros.forEach(registro => {
        const match = registro.ref_asli.match(/^A(\d+)$/i);
        if (match) {
          numerosExistentes.add(parseInt(match[1], 10));
        }
      });
    }

    let siguienteNumero = 1;
    while (numerosExistentes.has(siguienteNumero)) {
      siguienteNumero++;
    }

    const nuevoRefAsli = `A${siguienteNumero.toString().padStart(4, '0')}`;
    console.log(`✅ Siguiente REF ASLI disponible: ${nuevoRefAsli}`);

    // Test 4: Verificar que el nuevo REF ASLI sea único
    console.log('🔍 Verificando unicidad del nuevo REF ASLI...');
    const { data: existingRecord, error: checkError } = await supabase
      .from('registros')
      .select('id')
      .eq('ref_asli', nuevoRefAsli)
      .limit(1);

    if (checkError) {
      console.error('❌ Error verificando unicidad:', checkError);
      return;
    }

    const isUnique = !existingRecord || existingRecord.length === 0;
    console.log(`✅ REF ASLI ${nuevoRefAsli} es ${isUnique ? 'único' : 'duplicado'}`);

    console.log('🎉 Todas las pruebas de REF ASLI pasaron exitosamente');

  } catch (error) {
    console.error('💥 Error inesperado:', error);
  }
}

testRefAsliGeneration();
