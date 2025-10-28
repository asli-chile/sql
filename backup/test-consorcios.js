const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://knbnwbrjzkknarnkyriv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuYm53YnJqemtrbmFybmt5cml2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0ODQzOTYsImV4cCI6MjA3NzA2MDM5Nn0.l7pwhkJSinQQLAsDVFvefP8V5gn_v8rN2U6FG03qVqs';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testConsorcios() {
  console.log('🚀 Verificando datos de consorcios en Supabase...');

  try {
    // Verificar catálogo de consorcios
    const { data: consorciosData, error: consorciosError } = await supabase
      .from('catalogos')
      .select('*')
      .eq('categoria', 'consorciosNavesMapping');

    if (consorciosError) {
      console.error('Error obteniendo consorcios:', consorciosError);
      return;
    }

    if (consorciosData && consorciosData.length > 0) {
      const mapping = consorciosData[0].mapping || {};
      console.log('📊 Consorcios encontrados:');
      Object.keys(mapping).forEach(consorcio => {
        console.log(`  🔗 ${consorcio}: ${mapping[consorcio].length} naves`);
        if (consorcio.includes('HAPAG') || consorcio.includes('ONE') || consorcio.includes('MSC')) {
          console.log(`    ⭐ Consorcio especial detectado: ${consorcio}`);
        }
      });
    } else {
      console.log('⚠️ No se encontraron datos de consorcios');
    }

    // Verificar algunas naves específicas de consorcios
    const consorciosEspeciales = [
      'HAPAG-LLOYD / ONE / MSC',
      'PIL / YANG MING / WAN HAI'
    ];

    console.log('\n🔍 Verificando naves de consorcios especiales...');
    for (const consorcio of consorciosEspeciales) {
      const { data: navesData, error: navesError } = await supabase
        .from('registros')
        .select('nave_inicial')
        .ilike('nave_inicial', '%')
        .limit(5);

      if (!navesError && navesData) {
        console.log(`📋 Ejemplos de naves en registros:`);
        navesData.forEach(registro => {
          console.log(`  🚢 ${registro.nave_inicial}`);
        });
        break;
      }
    }

    console.log('\n✅ Verificación completada');

  } catch (error) {
    console.error('Error en verificación:', error);
  }
}

testConsorcios();
