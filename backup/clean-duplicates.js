const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://knbnwbrjzkknarnkyriv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuYm53YnJqemtrbmFybmt5cml2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0ODQzOTYsImV4cCI6MjA3NzA2MDM5Nn0.l7pwhkJSinVQLAsDVFvefP8V5gn_v8rN2U6FG03qVqs';

const supabase = createClient(supabaseUrl, supabaseKey);

// Función para limpiar duplicados (mantener el más reciente)
const cleanDuplicateRefAsli = async () => {
  try {
    console.log('🧹 Iniciando limpieza de REF ASLI duplicados...');
    
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
      console.log('✅ No hay registros para procesar');
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
    
    console.log(`⚠️ Se encontraron ${duplicados.length} REF ASLI duplicados`);
    console.log('🔄 Iniciando limpieza...\n');
    
    let eliminados = 0;
    let procesados = 0;
    
    for (const [refAsli, registros] of duplicados) {
      // Ordenar por fecha de creación (más reciente primero)
      const registrosOrdenados = registros.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      // Mantener el primero (más reciente) y eliminar el resto
      const registrosAEliminar = registrosOrdenados.slice(1);
      
      console.log(`📋 Procesando ${refAsli}:`);
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
      
      procesados++;
      
      // Pequeña pausa para evitar sobrecarga
      if (procesados % 50 === 0) {
        console.log(`\n⏳ Procesados ${procesados}/${duplicados.length} grupos...`);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`\n🎉 Limpieza completada:`);
    console.log(`   📊 Grupos procesados: ${procesados}`);
    console.log(`   🗑️ Registros eliminados: ${eliminados}`);
    console.log(`   ✅ Registros mantenidos: ${procesados}`);
    
    // Verificar resultado final
    console.log('\n🔍 Verificando resultado...');
    const { data: registrosFinales, error: errorFinal } = await supabase
      .from('registros')
      .select('ref_asli')
      .order('ref_asli', { ascending: true });
    
    if (!errorFinal && registrosFinales) {
      const refAsliUnicos = new Set(registrosFinales.map(r => r.ref_asli));
      console.log(`📊 Estado final:`);
      console.log(`   📦 Total registros: ${registrosFinales.length}`);
      console.log(`   🔢 REF ASLI únicos: ${refAsliUnicos.size}`);
      console.log(`   ✅ Sin duplicados: ${registrosFinales.length === refAsliUnicos.size ? 'SÍ' : 'NO'}`);
    }
    
  } catch (error) {
    console.error('Error en la limpieza:', error);
  }
};

// Función principal
const main = async () => {
  console.log('🚀 Iniciando limpieza automática de REF ASLI duplicados...\n');
  
  await cleanDuplicateRefAsli();
  
  console.log('\n✅ Limpieza completada');
};

main();
