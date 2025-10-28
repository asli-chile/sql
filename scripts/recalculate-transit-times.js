const { createClient } = require('@supabase/supabase-js');

// Función para calcular tiempo de tránsito
function calculateTransitTime(etd, eta) {
  if (!etd || !eta) return null;
  
  try {
    const etdDate = new Date(etd);
    const etaDate = new Date(eta);
    
    // Verificar que las fechas sean válidas
    if (isNaN(etdDate.getTime()) || isNaN(etaDate.getTime())) {
      return null;
    }
    
    // Calcular la diferencia en milisegundos
    const diffInMs = etaDate.getTime() - etdDate.getTime();
    
    // Convertir a días (dividir por milisegundos en un día)
    const diffInDays = Math.round(diffInMs / (1000 * 60 * 60 * 24));
    
    // Retornar null si el resultado es negativo (ETA antes que ETD)
    return diffInDays >= 0 ? diffInDays : null;
  } catch (error) {
    console.error('Error calculando tiempo de tránsito:', error);
    return null;
  }
}

// Configuración de Supabase
const supabaseUrl = 'https://knbnwbrjzkknarnkyriv.supabase.co';
const supabaseKey = 'sb_publishable_NzHIwidg8DuxunhWhpHvBQ_-uf0WcVp';

const supabase = createClient(supabaseUrl, supabaseKey);

async function recalculateAllTransitTimes() {
  console.log('🚀 Iniciando recálculo de todos los tiempos de tránsito (TT)...');
  
  try {
    // Obtener todos los registros que tienen ETD y ETA
    const { data: registros, error: fetchError } = await supabase
      .from('registros')
      .select('id, ref_asli, etd, eta, tt')
      .not('etd', 'is', null)
      .not('eta', 'is', null)
      .is('deleted_at', null);
    
    if (fetchError) {
      console.error('❌ Error obteniendo registros:', fetchError.message);
      return;
    }
    
    console.log(`📊 Total de registros encontrados: ${registros.length}`);
    
    let successCount = 0;
    let errorCount = 0;
    let unchangedCount = 0;
    
    // Procesar en lotes para evitar sobrecarga
    const batchSize = 20;
    const batches = [];
    
    for (let i = 0; i < registros.length; i += batchSize) {
      batches.push(registros.slice(i, i + batchSize));
    }
    
    console.log(`📦 Procesando en ${batches.length} lotes de ${batchSize} registros cada uno...`);
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`\n🔄 Procesando lote ${batchIndex + 1}/${batches.length} (${batch.length} registros)...`);
      
      for (const registro of batch) {
        try {
          const newTT = calculateTransitTime(registro.etd, registro.eta);
          const currentTT = registro.tt;
          
          // Solo actualizar si el valor ha cambiado
          if (newTT !== currentTT) {
            const { error: updateError } = await supabase
              .from('registros')
              .update({
                tt: newTT,
                updated_at: new Date().toISOString()
              })
              .eq('id', registro.id);
            
            if (updateError) {
              console.error(`   ❌ Error actualizando ${registro.ref_asli}:`, updateError.message);
              errorCount++;
            } else {
              console.log(`   ✅ ${registro.ref_asli} actualizado: TT ${currentTT} → ${newTT} días`);
              successCount++;
            }
          } else {
            console.log(`   ➖ ${registro.ref_asli} sin cambios: TT ${currentTT} días`);
            unchangedCount++;
          }
          
          // Pequeña pausa para no sobrecargar la API
          await new Promise(resolve => setTimeout(resolve, 50));
          
        } catch (error) {
          console.error(`   ❌ Error procesando ${registro.ref_asli}:`, error.message);
          errorCount++;
        }
      }
      
      // Pausa entre lotes
      if (batchIndex < batches.length - 1) {
        console.log('   ⏳ Pausa entre lotes...');
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    console.log('\n📊 Resumen del recálculo:');
    console.log(`   ✅ Actualizados: ${successCount}`);
    console.log(`   ➖ Sin cambios: ${unchangedCount}`);
    console.log(`   ❌ Errores: ${errorCount}`);
    console.log(`   📈 Total procesados: ${registros.length}`);
    
    if (errorCount === 0) {
      console.log('\n🎉 ¡Recálculo completado exitosamente!');
    } else {
      console.log('\n⚠️  Algunos registros tuvieron errores. Revisa los mensajes arriba.');
    }
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

// Ejecutar el recálculo
recalculateAllTransitTimes().catch(console.error);
