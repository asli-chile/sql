const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Configuración de Supabase
const supabaseUrl = 'https://knbnwbrjzkknarnkyriv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuYm53YnJqemtrbmFybmt5cml2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0ODQzOTYsImV4cCI6MjA3NzA2MDM5Nn0.l7pwhkJSinVQLAsDVFvefP8V5gn_v8rN2U6FG03qVqs';

const supabase = createClient(supabaseUrl, supabaseKey);

// Función para parsear fechas del formato DD-MM-YYYY
const parseDate = (dateStr) => {
  const [day, month, year] = dateStr.split('-');
  return new Date(year, month - 1, day);
};

// Función para leer y procesar el archivo de fechas
const loadFechasFromFile = () => {
  try {
    const content = fs.readFileSync('fechas por ref', 'utf8');
    const lines = content.split('\n');
    const fechasMap = {};
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && trimmedLine.includes('\t')) {
        const [fechaStr, refAsli] = trimmedLine.split('\t');
        if (fechaStr && refAsli) {
          fechasMap[refAsli.trim()] = fechaStr.trim();
        }
      }
    });
    
    console.log(`📅 Cargadas ${Object.keys(fechasMap).length} fechas desde el archivo`);
    return fechasMap;
  } catch (error) {
    console.error('Error leyendo archivo de fechas:', error);
    return {};
  }
};

// Función para arreglar registros con fechas reales
const fixDatesWithRealData = async () => {
  try {
    console.log('🔄 Cargando fechas reales desde archivo...');
    const fechasMap = loadFechasFromFile();
    
    if (Object.keys(fechasMap).length === 0) {
      console.log('❌ No se pudieron cargar las fechas del archivo');
      return;
    }
    
    console.log('🔄 Buscando registros para actualizar...');
    
    // Obtener todos los registros
    const { data: registros, error } = await supabase
      .from('registros')
      .select('id, ref_asli, ingresado, etd, eta');
    
    if (error) {
      console.error('Error buscando registros:', error);
      return;
    }
    
    console.log(`📦 Encontrados ${registros?.length || 0} registros`);
    
    if (!registros || registros.length === 0) {
      console.log('✅ No hay registros que actualizar');
      return;
    }
    
    let updated = 0;
    let notFound = 0;
    
    for (const registro of registros) {
      const fechaStr = fechasMap[registro.ref_asli];
      
      if (fechaStr) {
        try {
          const fechaIngresado = parseDate(fechaStr);
          
          // Calcular ETD (7 días después del ingreso)
          const fechaEtd = new Date(fechaIngresado);
          fechaEtd.setDate(fechaEtd.getDate() + 7);
          
          // Calcular ETA (14 días después del ingreso)
          const fechaEta = new Date(fechaIngresado);
          fechaEta.setDate(fechaEta.getDate() + 14);
          
          const { error: updateError } = await supabase
            .from('registros')
            .update({
              ingresado: fechaIngresado.toISOString(),
              etd: fechaEtd.toISOString(),
              eta: fechaEta.toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', registro.id);
          
          if (updateError) {
            console.error(`Error actualizando ${registro.ref_asli}:`, updateError);
          } else {
            updated++;
            console.log(`✅ ${registro.ref_asli}: ${fechaStr} → ETD: ${fechaEtd.toLocaleDateString()}, ETA: ${fechaEta.toLocaleDateString()}`);
          }
        } catch (dateError) {
          console.error(`Error parseando fecha para ${registro.ref_asli}:`, dateError);
        }
      } else {
        notFound++;
        console.log(`⚠️ No se encontró fecha para: ${registro.ref_asli}`);
      }
    }
    
    console.log(`🎉 Actualización completada:`);
    console.log(`   ✅ Actualizados: ${updated}`);
    console.log(`   ⚠️ Sin fecha encontrada: ${notFound}`);
    
  } catch (error) {
    console.error('Error en la función:', error);
  }
};

// Ejecutar la corrección
const main = async () => {
  console.log('🚀 Iniciando corrección con fechas reales...');
  
  await fixDatesWithRealData();
  
  console.log('✅ Corrección completada');
};

main();
