const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuración de Supabase (usando las mismas credenciales del proyecto)
const supabaseUrl = 'https://qjqjqjqjqjqjqjqjqjqj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqcWpxanFqcWpxanFqcWpxanFqcWoiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY5OTk5OTk5OSwiZXhwIjoyMDE1NTc1OTk5fQ.example';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createHistoryTable() {
  try {
    console.log('🔄 Creando tabla de historial de cambios...');
    
    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, 'create-history-table.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Ejecutar el SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql: sqlContent });
    
    if (error) {
      console.error('❌ Error ejecutando SQL:', error);
      return;
    }
    
    console.log('✅ Tabla de historial creada exitosamente');
    console.log('📊 Datos:', data);
    
    // Verificar que la tabla existe
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'historial_cambios');
    
    if (tableError) {
      console.error('❌ Error verificando tabla:', tableError);
      return;
    }
    
    if (tables && tables.length > 0) {
      console.log('✅ Tabla historial_cambios verificada en la base de datos');
    } else {
      console.log('⚠️ Tabla historial_cambios no encontrada');
    }
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  createHistoryTable();
}

module.exports = { createHistoryTable };
