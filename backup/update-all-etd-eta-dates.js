const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

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

// Función para leer y parsear el archivo de fechas
function parseFechasFile() {
  try {
    const fileContent = fs.readFileSync('fechas por ref', 'utf8');
    const lines = fileContent.split('\n');
    
    const updates = [];
    
    // Saltar la primera línea (encabezado) y procesar cada línea
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line && line.includes('\t')) {
        const parts = line.split('\t');
        if (parts.length >= 3) {
          const refAsli = parts[0].trim();
          const etd = parts[1].trim();
          const eta = parts[2].trim();
          
          // Validar que tenemos datos válidos
          if (refAsli && etd && eta && refAsli.startsWith('A')) {
            updates.push({ refAsli, etd, eta });
          }
        }
      }
    }
    
    return updates;
  } catch (error) {
    console.error('❌ Error leyendo el archivo:', error.message);
    return [];
  }
}

async function updateAllDates() {
  console.log('🚀 Iniciando actualización masiva de fechas ETD y ETA...');
  
  // Leer datos del archivo
  const updates = parseFechasFile();
  
  if (updates.length === 0) {
    console.error('❌ No se encontraron datos válidos en el archivo');
    return;
  }
  
  console.log(`📊 Total de registros encontrados: ${updates.length}`);
  
  let successCount = 0;
  let errorCount = 0;
  let notFoundCount = 0;
  
  // Procesar en lotes para evitar sobrecarga
  const batchSize = 10;
  const batches = [];
  
  for (let i = 0; i < updates.length; i += batchSize) {
    batches.push(updates.slice(i, i + batchSize));
  }
  
  console.log(`📦 Procesando en ${batches.length} lotes de ${batchSize} registros cada uno...`);
  
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    console.log(`\n🔄 Procesando lote ${batchIndex + 1}/${batches.length} (${batch.length} registros)...`);
    
    for (const update of batch) {
      try {
        // Convertir fechas usando parseDateString
        const etdDate = parseDateString(update.etd);
        const etaDate = parseDateString(update.eta);
        
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
          if (error.message.includes('No rows found') || error.message.includes('not found')) {
            console.log(`   ⚠️  ${update.refAsli} no encontrado en la base de datos`);
            notFoundCount++;
          } else {
            console.error(`   ❌ Error actualizando ${update.refAsli}:`, error.message);
            errorCount++;
          }
        } else {
          console.log(`   ✅ ${update.refAsli} actualizado (ETD: ${update.etd}, ETA: ${update.eta})`);
          successCount++;
        }
        
        // Pequeña pausa para no sobrecargar la API
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`   ❌ Error procesando ${update.refAsli}:`, error.message);
        errorCount++;
      }
    }
    
    // Pausa entre lotes
    if (batchIndex < batches.length - 1) {
      console.log('   ⏳ Pausa entre lotes...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log('\n📊 Resumen final de actualización:');
  console.log(`   ✅ Exitosos: ${successCount}`);
  console.log(`   ⚠️  No encontrados: ${notFoundCount}`);
  console.log(`   ❌ Errores: ${errorCount}`);
  console.log(`   📈 Total procesados: ${updates.length}`);
  
  if (errorCount === 0) {
    console.log('\n🎉 ¡Actualización completada exitosamente!');
  } else {
    console.log('\n⚠️  Algunas actualizaciones fallaron. Revisa los errores arriba.');
  }
}

// Ejecutar la actualización
updateAllDates().catch(console.error);
