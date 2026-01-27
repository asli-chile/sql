import { createClient } from '@/lib/supabase-browser';
import { Registro } from '@/types/registros';

/**
 * Sincroniza los datos de un registro con sus transportes relacionados
 * @param registro El registro actualizado
 * @param oldBooking (opcional) El booking anterior para buscar transportes que puedan haber cambiado
 */
export async function syncTransportesFromRegistro(registro: Registro, oldBooking?: string) {
  const supabase = createClient();
  
  try {
    console.log('🔄 Iniciando sincronización de transportes para registro:', registro.refAsli || registro.booking);
    
    // Buscar transportes relacionados por registro_id o por booking
    let transportesQuery = supabase
      .from('transportes')
      .select('*')
      .is('deleted_at', null);

    // Primero buscar por registro_id si existe
    if (registro.id) {
      transportesQuery = transportesQuery.eq('registro_id', registro.id);
    } else {
      // Si no hay registro_id, buscar por booking (antiguo y nuevo)
      const bookingsToSearch = [registro.booking];
      if (oldBooking && oldBooking !== registro.booking) {
        bookingsToSearch.push(oldBooking);
      }
      transportesQuery = transportesQuery.in('booking', bookingsToSearch);
    }

    const { data: transportes, error: fetchError } = await transportesQuery;

    if (fetchError) {
      console.error('❌ Error al buscar transportes relacionados:', fetchError);
      return { success: false, error: fetchError.message };
    }

    if (!transportes || transportes.length === 0) {
      console.log('ℹ️ No se encontraron transportes relacionados para sincronizar');
      return { success: true, updated: 0 };
    }

    // Preparar datos de actualización
    const updateData: any = {
      booking: registro.booking?.trim() || null,
      nave: registro.naveInicial?.trim() || null,
      naviera: registro.naviera?.trim() || null,
      contenedor: Array.isArray(registro.contenedor) 
        ? (registro.contenedor[0] || '').trim() || null
        : (registro.contenedor || '').trim() || null,
      ref_cliente: registro.refCliente?.trim() || null,
      updated_at: new Date().toISOString(),
    };

    // Actualizar todos los transportes relacionados
    const { data: updatedTransportes, error: updateError } = await supabase
      .from('transportes')
      .update(updateData)
      .in('id', transportes.map(t => t.id))
      .select();

    if (updateError) {
      console.error('❌ Error al actualizar transportes:', updateError);
      return { success: false, error: updateError.message };
    }

    console.log(`✅ Sincronización completada: ${updatedTransportes?.length || 0} transportes actualizados`);
    
    return { 
      success: true, 
      updated: updatedTransportes?.length || 0,
      transportes: updatedTransportes 
    };

  } catch (error) {
    console.error('❌ Error inesperado en sincronización:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    };
  }
}

/**
 * Sincroniza múltiples registros con sus transportes relacionados
 * @param registros Array de registros actualizados
 */
export async function syncMultipleTransportesFromRegistros(registros: Registro[]) {
  const results = [];
  
  for (const registro of registros) {
    const result = await syncTransportesFromRegistro(registro);
    results.push({
      registro: registro.refAsli || registro.booking,
      ...result
    });
  }

  const totalUpdated = results.reduce((sum, r) => sum + (r.updated || 0), 0);
  const successCount = results.filter(r => r.success).length;
  
  console.log(`📊 Sincronización batch: ${successCount}/${results.length} exitosos, ${totalUpdated} transportes actualizados`);
  
  return {
    success: successCount === registros.length,
    totalRegistros: registros.length,
    successCount,
    totalUpdated,
    results
  };
}

/**
 * Busca y actualiza transportes huérfanos (sin registro_id) basándose en el booking
 */
export async function syncOrphanTransportes() {
  const supabase = createClient();
  
  try {
    console.log('🔍 Buscando transportes huérfanos para sincronizar...');
    
    // Buscar transportes sin registro_id pero con booking
    const { data: orphanTransportes, error: fetchError } = await supabase
      .from('transportes')
      .select('*')
      .is('registro_id', null)
      .not('booking', 'is', null)
      .is('deleted_at', null);

    if (fetchError) {
      console.error('❌ Error al buscar transportes huérfanos:', fetchError);
      return { success: false, error: fetchError.message };
    }

    if (!orphanTransportes || orphanTransportes.length === 0) {
      console.log('ℹ️ No se encontraron transportes huérfanos');
      return { success: true, updated: 0 };
    }

    let updatedCount = 0;
    
    for (const transporte of orphanTransportes) {
      if (!transporte.booking) continue;
      
      // Buscar el registro correspondiente por booking
      const { data: registro, error: regError } = await supabase
        .from('registros')
        .select('*')
        .eq('booking', transporte.booking.trim())
        .single();

      if (regError || !registro) {
        console.log(`⚠️ No se encontró registro para booking: ${transporte.booking}`);
        continue;
      }

      // Actualizar transporte con el registro_id y datos sincronizados
      const updateData = {
        registro_id: registro.id,
        nave: registro.naveInicial?.trim() || null,
        naviera: registro.naviera?.trim() || null,
        contenedor: Array.isArray(registro.contenedor) 
          ? (registro.contenedor[0] || '').trim() || null
          : (registro.contenedor || '').trim() || null,
        ref_cliente: registro.refCliente?.trim() || null,
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from('transportes')
        .update(updateData)
        .eq('id', transporte.id);

      if (updateError) {
        console.error(`❌ Error actualizando transporte ${transporte.id}:`, updateError);
      } else {
        updatedCount++;
        console.log(`✅ Transporte ${transporte.id} sincronizado con registro ${registro.id}`);
      }
    }

    console.log(`📊 Sincronización de huérfanos completada: ${updatedCount}/${orphanTransportes.length} actualizados`);
    
    return { 
      success: true, 
      totalOrphan: orphanTransportes.length,
      updated: updatedCount 
    };

  } catch (error) {
    console.error('❌ Error en sincronización de huérfanos:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    };
  }
}
