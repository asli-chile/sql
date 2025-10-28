// Script para crear catálogo de estados en Supabase
const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase (usar las mismas credenciales del proyecto)
const supabaseUrl = 'https://your-project.supabase.co';
const supabaseKey = 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createEstadosCatalog() {
  try {
    console.log('🔄 Creando catálogo de estados...');

    // Crear tabla de catálogo
    const { error: createError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS catalogo_estados (
          id SERIAL PRIMARY KEY,
          codigo VARCHAR(20) UNIQUE NOT NULL,
          nombre VARCHAR(50) NOT NULL,
          descripcion TEXT,
          color VARCHAR(20) DEFAULT 'gray',
          activo BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    if (createError) {
      console.error('❌ Error creando tabla:', createError);
      return;
    }

    // Insertar estados
    const estados = [
      { codigo: 'PENDIENTE', nombre: 'Pendiente', descripcion: 'Estado inicial del registro, esperando confirmación', color: 'yellow' },
      { codigo: 'CONFIRMADO', nombre: 'Confirmado', descripcion: 'Registro confirmado y procesado', color: 'green' },
      { codigo: 'CANCELADO', nombre: 'Cancelado', descripcion: 'Registro cancelado o anulado', color: 'red' }
    ];

    for (const estado of estados) {
      const { error: insertError } = await supabase
        .from('catalogo_estados')
        .upsert(estado, { onConflict: 'codigo' });

      if (insertError) {
        console.error(`❌ Error insertando ${estado.codigo}:`, insertError);
      } else {
        console.log(`✅ Estado ${estado.codigo} creado/actualizado`);
      }
    }

    // Verificar datos
    const { data, error } = await supabase
      .from('catalogo_estados')
      .select('*')
      .order('id');

    if (error) {
      console.error('❌ Error verificando datos:', error);
    } else {
      console.log('📋 Estados en catálogo:');
      data.forEach(estado => {
        console.log(`  - ${estado.codigo}: ${estado.nombre} (${estado.color})`);
      });
    }

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

createEstadosCatalog();
