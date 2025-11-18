/**
 * Script para configurar IMO/MMSI de buques manualmente
 * 
 * Uso:
 *   node scripts/set-vessel-imo-mmsi.js "NOMBRE DEL BUQUE" --imo 1234567 --mmsi 987654321
 *   node scripts/set-vessel-imo-mmsi.js "NOMBRE DEL BUQUE" --imo 1234567
 *   node scripts/set-vessel-imo-mmsi.js "NOMBRE DEL BUQUE" --mmsi 987654321
 * 
 * Ejemplo:
 *   node scripts/set-vessel-imo-mmsi.js "MANZANILLO EXPRESS" --imo 9870666
 *   node scripts/set-vessel-imo-mmsi.js "MSC ANS" --mmsi 538005123
 */

const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://knbnwbrjzkknarnkyriv.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('❌ Error: No se encontró SUPABASE_SERVICE_ROLE_KEY o NEXT_PUBLIC_SUPABASE_ANON_KEY');
  console.error('   Configura la variable de entorno o úsala desde .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Parsear argumentos de línea de comandos
const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  console.log(`
📋 Uso del script para configurar IMO/MMSI de buques

Sintaxis:
  node scripts/set-vessel-imo-mmsi.js "NOMBRE DEL BUQUE" [--imo IMO] [--mmsi MMSI]

Ejemplos:
  node scripts/set-vessel-imo-mmsi.js "MANZANILLO EXPRESS" --imo 9870666
  node scripts/set-vessel-imo-mmsi.js "MSC ANS" --mmsi 538005123
  node scripts/set-vessel-imo-mmsi.js "SALLY MAERSK" --imo 1234567 --mmsi 987654321

Notas:
  - El nombre del buque debe coincidir exactamente con el que aparece en los registros
  - Puedes proporcionar solo IMO, solo MMSI, o ambos
  - El script creará o actualizará el registro en vessel_positions
  `);
  process.exit(0);
}

const vesselName = args[0];
let imo = null;
let mmsi = null;

// Parsear flags --imo y --mmsi
for (let i = 1; i < args.length; i++) {
  if (args[i] === '--imo' && i + 1 < args.length) {
    imo = args[i + 1];
    i++;
  } else if (args[i] === '--mmsi' && i + 1 < args.length) {
    mmsi = args[i + 1];
    i++;
  }
}

if (!imo && !mmsi) {
  console.error('❌ Error: Debes proporcionar al menos --imo o --mmsi');
  console.error('   Ejemplo: node scripts/set-vessel-imo-mmsi.js "NOMBRE" --imo 1234567');
  process.exit(1);
}

async function setVesselIMMMSI() {
  console.log(`\n🔧 Configurando IMO/MMSI para: "${vesselName}"`);
  console.log(`   IMO: ${imo || '(no proporcionado)'}`);
  console.log(`   MMSI: ${mmsi || '(no proporcionado)'}\n`);

  try {
    // Buscar si ya existe un registro para este buque
    const { data: existing, error: selectError } = await supabase
      .from('vessel_positions')
      .select('id, imo, mmsi')
      .eq('vessel_name', vesselName)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      // PGRST116 = no rows returned, que es OK si no existe
      console.error('❌ Error buscando buque:', selectError);
      process.exit(1);
    }

    if (existing) {
      // Actualizar registro existente
      console.log('📝 Actualizando registro existente...');
      const { error: updateError } = await supabase
        .from('vessel_positions')
        .update({
          imo: imo || existing.imo || null,
          mmsi: mmsi || existing.mmsi || null,
        })
        .eq('id', existing.id);

      if (updateError) {
        console.error('❌ Error actualizando IMO/MMSI:', updateError);
        process.exit(1);
      }

      console.log('✅ IMO/MMSI actualizado correctamente');
      console.log(`   IMO: ${imo || existing.imo || '(sin IMO)'}`);
      console.log(`   MMSI: ${mmsi || existing.mmsi || '(sin MMSI)'}`);
    } else {
      // Crear nuevo registro solo con IMO/MMSI (sin posición aún)
      console.log('📝 Creando nuevo registro...');
      const { error: insertError } = await supabase
        .from('vessel_positions')
        .insert({
          vessel_name: vesselName,
          imo: imo || null,
          mmsi: mmsi || null,
          last_lat: null,
          last_lon: null,
          last_position_at: null,
          last_api_call_at: null,
          raw_payload: null,
        });

      if (insertError) {
        console.error('❌ Error insertando IMO/MMSI:', insertError);
        process.exit(1);
      }

      console.log('✅ IMO/MMSI configurado correctamente');
      console.log(`   IMO: ${imo || '(sin IMO)'}`);
      console.log(`   MMSI: ${mmsi || '(sin MMSI)'}`);
      console.log('\n💡 El próximo cron job intentará actualizar la posición de este buque.');
    }

    console.log('\n✨ ¡Listo! El buque ahora tiene IMO/MMSI configurado.');
    console.log('   El cron job podrá actualizar su posición en la próxima ejecución.\n');
  } catch (error) {
    console.error('❌ Error inesperado:', error);
    process.exit(1);
  }
}

setVesselIMMMSI();


