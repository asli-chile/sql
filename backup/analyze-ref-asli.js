const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://knbnwbrjzkknarnkyriv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuYm53YnJqemtrbmFybmt5cml2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0ODQzOTYsImV4cCI6MjA3NzA2MDM5Nn0.l7pwhkJSinVQLAsDVFvefP8V5gn_v8rN2U6FG03qVqs';

const supabase = createClient(supabaseUrl, supabaseKey);

// Función para encontrar y reportar REF ASLI duplicados
const findDuplicateRefAsli = async () => {
  try {
    console.log('🔍 Buscando REF ASLI duplicados...');
    
    // Obtener todos los registros
    const { data: registros, error } = await supabase
      .from('registros')
      .select('id, ref_asli, created_at')
      .order('ref_asli', { ascending: true });
    
    if (error) {
      console.error('Error obteniendo registros:', error);
      return;
    }
    
    console.log(`📦 Total de registros: ${registros?.length || 0}`);
    
    if (!registros || registros.length === 0) {
      console.log('✅ No hay registros para verificar');
      return;
    }
    
    // Agrupar por REF ASLI
    const refAsliGroups = {};
    
    registros.forEach(registro => {
      if (!refAsliGroups[registro.ref_asli]) {
        refAsliGroups[registro.ref_asli] = [];
      }
      refAsliGroups[registro.ref_asli].push(registro);
    });
    
    // Encontrar duplicados
    const duplicados = Object.entries(refAsliGroups).filter(([refAsli, registros]) => registros.length > 1);
    
    if (duplicados.length === 0) {
      console.log('✅ No se encontraron REF ASLI duplicados');
      return;
    }
    
    console.log(`⚠️ Se encontraron ${duplicados.length} REF ASLI duplicados:`);
    
    duplicados.forEach(([refAsli, registros]) => {
      console.log(`\n📋 ${refAsli} (${registros.length} registros):`);
      registros.forEach((registro, index) => {
        console.log(`   ${index + 1}. ID: ${registro.id}, Creado: ${new Date(registro.created_at).toLocaleString()}`);
      });
    });
    
    return duplicados;
    
  } catch (error) {
    console.error('Error buscando duplicados:', error);
  }
};

// Función para limpiar duplicados (mantener el más reciente)
const cleanDuplicateRefAsli = async () => {
  try {
    console.log('🧹 Limpiando REF ASLI duplicados...');
    
    const duplicados = await findDuplicateRefAsli();
    
    if (!duplicados || duplicados.length === 0) {
      console.log('✅ No hay duplicados que limpiar');
      return;
    }
    
    let eliminados = 0;
    
    for (const [refAsli, registros] of duplicados) {
      // Ordenar por fecha de creación (más reciente primero)
      const registrosOrdenados = registros.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      // Mantener el primero (más reciente) y eliminar el resto
      const registrosAEliminar = registrosOrdenados.slice(1);
      
      console.log(`\n🔄 Procesando ${refAsli}:`);
      console.log(`   ✅ Manteniendo: ID ${registrosOrdenados[0].id} (${new Date(registrosOrdenados[0].created_at).toLocaleString()})`);
      
      for (const registro of registrosAEliminar) {
        console.log(`   🗑️ Eliminando: ID ${registro.id} (${new Date(registro.created_at).toLocaleString()})`);
        
        const { error } = await supabase
          .from('registros')
          .delete()
          .eq('id', registro.id);
        
        if (error) {
          console.error(`   ❌ Error eliminando ${registro.id}:`, error);
        } else {
          eliminados++;
        }
      }
    }
    
    console.log(`\n🎉 Limpieza completada: ${eliminados} registros duplicados eliminados`);
    
  } catch (error) {
    console.error('Error limpiando duplicados:', error);
  }
};

// Función para generar el siguiente REF ASLI disponible
const getNextAvailableRefAsli = async () => {
  try {
    console.log('🔢 Calculando siguiente REF ASLI disponible...');
    
    const { data: registros, error } = await supabase
      .from('registros')
      .select('ref_asli')
      .order('ref_asli', { ascending: true });
    
    if (error) {
      console.error('Error obteniendo registros:', error);
      return 'A0001';
    }
    
    // Extraer números de los REF ASLI existentes
    const numerosExistentes = new Set();
    
    if (registros && registros.length > 0) {
      registros.forEach(registro => {
        const match = registro.ref_asli.match(/^A(\d+)$/i);
        if (match) {
          numerosExistentes.add(parseInt(match[1], 10));
        }
      });
    }
    
    // Encontrar el siguiente número disponible
    let siguienteNumero = 1;
    while (numerosExistentes.has(siguienteNumero)) {
      siguienteNumero++;
    }
    
    const siguienteRefAsli = `A${siguienteNumero.toString().padStart(4, '0')}`;
    
    console.log(`📊 Estadísticas:`);
    console.log(`   📦 Total registros: ${registros?.length || 0}`);
    console.log(`   🔢 Números usados: ${numerosExistentes.size}`);
    console.log(`   📈 Rango: A0001 - A${Math.max(...Array.from(numerosExistentes), 0).toString().padStart(4, '0')}`);
    console.log(`   ✅ Siguiente disponible: ${siguienteRefAsli}`);
    
    return siguienteRefAsli;
    
  } catch (error) {
    console.error('Error calculando siguiente REF ASLI:', error);
    return 'A0001';
  }
};

// Función principal
const main = async () => {
  console.log('🚀 Iniciando análisis de REF ASLI...\n');
  
  // 1. Buscar duplicados
  await findDuplicateRefAsli();
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // 2. Calcular siguiente REF ASLI disponible
  await getNextAvailableRefAsli();
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // 3. Preguntar si limpiar duplicados
  console.log('💡 Para limpiar duplicados automáticamente, ejecuta:');
  console.log('   node scripts/clean-duplicates.js');
  
  console.log('\n✅ Análisis completado');
};

main();
