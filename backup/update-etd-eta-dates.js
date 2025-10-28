const { createClient } = require('@supabase/supabase-js');

// Función para parsear fechas correctamente (sin problemas de zona horaria)
function parseDateString(dateString) {
  // Si la fecha viene en formato YYYY-MM-DD (de input type="date"), usar directamente
  if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    // Crear fecha en zona horaria local (no UTC)
    const [year, month, day] = dateString.split('-');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  
  // Si la fecha viene en formato DD-MM-YYYY, la convertimos correctamente
  if (dateString.includes('-') && dateString.split('-').length === 3) {
    const [day, month, year] = dateString.split('-');
    // Crear fecha en zona horaria local (no UTC)
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  
  // Si viene en formato ISO o cualquier otro formato, usar directamente
  return new Date(dateString);
}

// Configuración de Supabase
const supabaseUrl = 'https://knbnwbrjzkknarnkyriv.supabase.co';
const supabaseKey = 'sb_publishable_NzHIwidg8DuxunhWhpHvBQ_-uf0WcVp';

const supabase = createClient(supabaseUrl, supabaseKey);

// Datos a actualizar basados en la imagen
const updates = [
  { refAsli: 'A0302', etd: '16-06-2025', eta: '16-08-2025' },
  { refAsli: 'A0301', etd: '16-06-2025', eta: '01-08-2025' },
  { refAsli: 'A0300', etd: '16-06-2025', eta: '01-08-2025' },
  { refAsli: 'A0299', etd: '16-06-2025', eta: '01-08-2025' },
  { refAsli: 'A0298', etd: '16-06-2025', eta: '01-08-2025' },
  { refAsli: 'A0207', etd: '26-04-2025', eta: '25-06-2025' },
  { refAsli: 'A0206', etd: '26-04-2025', eta: '25-06-2025' },
  { refAsli: 'A0205', etd: '25-04-2025', eta: '16-06-2025' },
  { refAsli: 'A0204', etd: '25-04-2025', eta: '16-06-2025' },
  { refAsli: 'A0192', etd: '07-05-2025', eta: '05-07-2025' },
  { refAsli: 'A0147', etd: '04-04-2025', eta: '07-06-2025' },
  { refAsli: 'A0146', etd: '04-04-2025', eta: '02-06-2025' }
];

async function updateDates() {
  console.log('🚀 Iniciando actualización de fechas ETD y ETA...');
  console.log(`📊 Total de registros a actualizar: ${updates.length}`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const update of updates) {
    try {
      console.log(`\n🔄 Actualizando ${update.refAsli}...`);
      
      // Convertir fechas usando parseDateString
      const etdDate = parseDateString(update.etd);
      const etaDate = parseDateString(update.eta);
      
      console.log(`   ETD: ${update.etd} → ${etdDate.toISOString()}`);
      console.log(`   ETA: ${update.eta} → ${etaDate.toISOString()}`);
      
      // Actualizar en Supabase
      const { data, error } = await supabase
        .from('registros')
        .update({
          etd: etdDate.toISOString(),
          eta: etaDate.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('ref_asli', update.refAsli);
      
      if (error) {
        console.error(`   ❌ Error actualizando ${update.refAsli}:`, error.message);
        errorCount++;
      } else {
        console.log(`   ✅ ${update.refAsli} actualizado exitosamente`);
        successCount++;
      }
      
    } catch (error) {
      console.error(`   ❌ Error procesando ${update.refAsli}:`, error.message);
      errorCount++;
    }
  }
  
  console.log('\n📊 Resumen de actualización:');
  console.log(`   ✅ Exitosos: ${successCount}`);
  console.log(`   ❌ Errores: ${errorCount}`);
  console.log(`   📈 Total procesados: ${updates.length}`);
  
  if (errorCount === 0) {
    console.log('\n🎉 ¡Todas las fechas fueron actualizadas exitosamente!');
  } else {
    console.log('\n⚠️  Algunas actualizaciones fallaron. Revisa los errores arriba.');
  }
}

// Ejecutar la actualización
updateDates().catch(console.error);
