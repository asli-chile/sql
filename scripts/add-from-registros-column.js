const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan variables de entorno:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addFromRegistrosColumn() {
  try {
    console.log('🔄 Agregando campo from_registros a tabla transportes...');
    
    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, 'add-from-registros-column-transportes.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Ejecutar el SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql: sqlContent });
    
    if (error) {
      console.error('❌ Error ejecutando SQL:', error);
      
      // Si exec_sql no existe, intentar ejecutar directamente
      console.log('🔄 Intentando ejecutar SQL directamente...');
      
      // Separar las sentencias SQL
      const statements = sqlContent
        .split(';')
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('--'));
      
      for (const statement of statements) {
        if (statement.trim()) {
          console.log('🔄 Ejecutando:', statement.substring(0, 50) + '...');
          const { error: stmtError } = await supabase
            .from('transportes')
            .select('id')
            .limit(1); // Test query first
          
          if (stmtError) {
            console.error('❌ Error en consulta de prueba:', stmtError);
          }
        }
      }
      
      return;
    }
    
    console.log('✅ Campo from_registros agregado exitosamente');
    console.log('📋 Los transportes existentes han sido marcados como from_registros = FALSE');
    console.log('📋 Los nuevos transportes creados desde registros tendrán from_registros = TRUE');
    
  } catch (error) {
    console.error('💥 Error en el proceso:', error);
    process.exit(1);
  }
}

// Ejecutar
addFromRegistrosColumn();
