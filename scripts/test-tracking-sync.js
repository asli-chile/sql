/**
 * Script de prueba para verificar la sincronización de tracking
 * Ejecutar con: node scripts/test-tracking-sync.js
 */

const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase (reemplazar con tus variables de entorno)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Faltan variables de entorno de Supabase');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testTrackingSync() {
    console.log('🧪 Iniciando prueba de sincronización de tracking...\n');

    try {
        // 1. Obtener un registro con transporte asociado
        console.log('📋 Paso 1: Buscando registro con transporte...');
        
        const { data: transportes, error: transError } = await supabase
            .from('transportes')
            .select('registro_id, ingreso_stacking, booking')
            .not('registro_id', 'is', null)
            .is('deleted_at', null)
            .limit(5);

        if (transError) {
            console.error('❌ Error al obtener transportes:', transError);
            return;
        }

        if (!transportes || transportes.length === 0) {
            console.log('⚠️ No se encontraron transportes con registro_id');
            return;
        }

        const testTransporte = transportes[0];
        console.log('✅ Transporte encontrado:', {
            registro_id: testTransporte.registro_id,
            ingreso_stacking: testTransporte.ingreso_stacking,
            booking: testTransporte.booking
        });

        // 2. Obtener el registro asociado
        console.log('\n📋 Paso 2: Obteniendo registro asociado...');
        
        const { data: registro, error: regError } = await supabase
            .from('registros')
            .select('*')
            .eq('id', testTransporte.registro_id)
            .single();

        if (regError) {
            console.error('❌ Error al obtener registro:', regError);
            return;
        }

        console.log('✅ Registro encontrado:', {
            id: registro.id,
            booking: registro.booking,
            ingreso_stacking: registro.ingreso_stacking,
            contenedor: registro.contenedor
        });

        // 3. Simular actualización de ingreso_stacking en transporte
        console.log('\n📋 Paso 3: Actualizando ingreso_stacking en transporte...');
        
        const newDate = new Date().toISOString();
        
        const { error: updateError } = await supabase
            .from('transportes')
            .update({ ingreso_stacking: newDate })
            .eq('registro_id', testTransporte.registro_id);

        if (updateError) {
            console.error('❌ Error al actualizar transporte:', updateError);
            return;
        }

        console.log('✅ Transporte actualizado con nueva fecha:', newDate);

        // 4. Verificar el tracking
        console.log('\n📋 Paso 4: Verificando tracking...');
        
        // Simular la lógica de getShipmentTracking
        const { data: trackingEvents, error: trackingError } = await supabase
            .from('shipment_tracking_events')
            .select('*')
            .eq('registro_id', testTransporte.registro_id)
            .eq('milestone', 'ingresada_stacking');

        if (trackingError) {
            console.error('❌ Error al obtener eventos de tracking:', trackingError);
            return;
        }

        console.log('📊 Eventos de tracking encontrados:', trackingEvents);

        // 5. Obtener transporte actualizado
        const { data: updatedTransporte } = await supabase
            .from('transportes')
            .select('ingreso_stacking')
            .eq('registro_id', testTransporte.registro_id)
            .single();

        console.log('📊 Transporte actualizado:', updatedTransporte);

        // 6. Evaluar lógica de tracking
        console.log('\n📋 Paso 5: Evaluando lógica de sincronización...');
        
        const hasRegistroIngreso = registro?.ingreso_stacking;
        const hasTransporteIngreso = updatedTransporte?.ingreso_stacking;
        
        console.log('🔍 Evaluación:', {
            'registro.ingreso_stacking': hasRegistroIngreso,
            'transporte.ingreso_stacking': hasTransporteIngreso,
            'debería estar SI': hasRegistroIngreso || hasTransporteIngreso
        });

        if (hasRegistroIngreso || hasTransporteIngreso) {
            console.log('✅ La lógica indica que ingresada_stacking debería estar en "SI"');
        } else {
            console.log('❌ La lógica indica que ingresada_stacking debería estar en "PENDIENTE"');
        }

        console.log('\n🎉 Prueba completada. Revisa la consola de la aplicación para ver los logs de debug.');

    } catch (error) {
        console.error('❌ Error en la prueba:', error);
    }
}

// Ejecutar prueba
testTrackingSync();
