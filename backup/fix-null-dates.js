const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://knbnwbrjzkknarnkyriv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuYm53YnJqemtrbmFybmt5cml2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0ODQzOTYsImV4cCI6MjA3NzA2MDM5Nn0.l7pwhkJSinVQLAsDVFvefP8V5gn_v8rN2U6FG03qVqs';

const supabase = createClient(supabaseUrl, supabaseKey);

// Función para arreglar registros con ingresado null
const fixNullIngresado = async () => {
  try {
    console.log('🔄 Buscando registros con ingresado null...');
    
    // Buscar registros donde ingresado es null
    const { data: registros, error } = await supabase
      .from('registros')
      .select('id, ref_asli, created_at')
      .is('ingresado', null);
    
    if (error) {
      console.error('Error buscando registros:', error);
      return;
    }
    
    console.log(`📦 Encontrados ${registros?.length || 0} registros con ingresado null`);
    
    if (!registros || registros.length === 0) {
      console.log('✅ No hay registros que arreglar');
      return;
    }
    
    // Actualizar cada registro usando created_at como ingresado
    let updated = 0;
    for (const registro of registros) {
      const { error: updateError } = await supabase
        .from('registros')
        .update({
          ingresado: registro.created_at, // Usar created_at como ingresado
          updated_at: new Date().toISOString()
        })
        .eq('id', registro.id);
      
      if (updateError) {
        console.error(`Error actualizando registro ${registro.ref_asli}:`, updateError);
      } else {
        updated++;
        console.log(`✅ Actualizado: ${registro.ref_asli}`);
      }
    }
    
    console.log(`🎉 Actualización completada: ${updated} registros arreglados`);
    
  } catch (error) {
    console.error('Error en la función:', error);
  }
};

// Función para arreglar otros campos de fecha que puedan estar null
const fixNullDates = async () => {
  try {
    console.log('🔄 Arreglando otros campos de fecha null...');
    
    // Buscar registros con etd null pero que deberían tener fecha
    const { data: registrosEtd, error: etdError } = await supabase
      .from('registros')
      .select('id, ref_asli, created_at')
      .is('etd', null)
      .not('created_at', 'is', null);
    
    if (!etdError && registrosEtd && registrosEtd.length > 0) {
      console.log(`📦 Encontrados ${registrosEtd.length} registros con etd null`);
      
      for (const registro of registrosEtd) {
        // Establecer etd como 7 días después de created_at
        const etdDate = new Date(registro.created_at);
        etdDate.setDate(etdDate.getDate() + 7);
        
        await supabase
          .from('registros')
          .update({
            etd: etdDate.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', registro.id);
        
        console.log(`✅ ETD actualizado para: ${registro.ref_asli}`);
      }
    }
    
    // Buscar registros con eta null pero que deberían tener fecha
    const { data: registrosEta, error: etaError } = await supabase
      .from('registros')
      .select('id, ref_asli, created_at')
      .is('eta', null)
      .not('created_at', 'is', null);
    
    if (!etaError && registrosEta && registrosEta.length > 0) {
      console.log(`📦 Encontrados ${registrosEta.length} registros con eta null`);
      
      for (const registro of registrosEta) {
        // Establecer eta como 14 días después de created_at
        const etaDate = new Date(registro.created_at);
        etaDate.setDate(etaDate.getDate() + 14);
        
        await supabase
          .from('registros')
          .update({
            eta: etaDate.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', registro.id);
        
        console.log(`✅ ETA actualizado para: ${registro.ref_asli}`);
      }
    }
    
    console.log('🎉 Campos de fecha arreglados');
    
  } catch (error) {
    console.error('Error arreglando fechas:', error);
  }
};

// Ejecutar las correcciones
const main = async () => {
  console.log('🚀 Iniciando corrección de datos...');
  
  await fixNullIngresado();
  await fixNullDates();
  
  console.log('✅ Corrección completada');
};

main();
