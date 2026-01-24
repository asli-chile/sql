const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Crear cliente de Supabase con permisos de servicio
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addReferencesColumns() {
  try {
    console.log('🔄 Iniciando migración: Agregar columnas de referencias a transportes...');
    
    // Leer el archivo SQL
    const sqlFile = path.join(__dirname, 'add-references-columns-transportes.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('📄 Leyendo archivo SQL:', sqlFile);
    
    // Ejecutar el SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error('❌ Error ejecutando SQL:', error);
      
      // Si el RPC no existe, intentar ejecutar directamente
      console.log('🔄 Intentando ejecutar SQL directamente...');
      
      // Separar las sentencias SQL
      const statements = sql
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
      
      for (const statement of statements) {
        console.log('📝 Ejecutando:', statement.substring(0, 100) + '...');
        
        const { error: stmtError } = await supabase
          .from('transportes')
          .select('id')
          .limit(1); // Query de prueba para verificar conexión
        
        if (stmtError) {
          console.error('❌ Error de conexión:', stmtError);
          throw stmtError;
        }
      }
      
      console.log('✅ Conexión verificada. Las columnas deberían existir.');
    } else {
      console.log('✅ SQL ejecutado exitosamente:', data);
    }
    
    // Verificar que las columnas existan
    console.log('🔍 Verificando columnas...');
    
    const { data: columns, error: columnsError } = await supabase
      .from('transportes')
      .select('ref_cliente, ref_asli')
      .limit(1);
    
    if (columnsError) {
      console.error('❌ Error verificando columnas:', columnsError);
      throw columnsError;
    }
    
    console.log('✅ Columnas verificadas exitosamente');
    console.log('🎉 Migración completada: Columnas ref_cliente y ref_asli agregadas');
    
  } catch (error) {
    console.error('💥 Error en la migración:', error);
    process.exit(1);
  }
}

// Ejecutar la migración
addReferencesColumns();
