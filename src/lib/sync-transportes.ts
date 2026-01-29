import { createClient } from '@/lib/supabase-browser';
import { Registro } from '@/types/registros';
import { convertSupabaseToApp } from './migration-utils';

/**
 * Helper para asegurar que el objeto registro tenga el formato de la aplicación (camelCase).
 * Esto es necesario porque a veces recibimos el objeto directamente de Supabase (snake_case).
 */
function ensureAppRegistro(registro: any): Registro {
  if (registro.refAsli || registro.naveInicial || registro.refCliente) {
    return registro as Registro;
  }
  // Si parece snake_case o no tiene campos clave en camelCase, convertir
  if (registro.ref_asli || registro.nave_inicial || registro.ref_cliente) {
    console.log('🔄 Convirtiendo registro de snake_case a camelCase para sincronización');
    return convertSupabaseToApp(registro);
  }
  return registro as Registro;
}

/**
 * Sincroniza los datos de un registro con sus transportes relacionados
 * @param registro El registro actualizado
 * @param oldBooking (opcional) El booking anterior para buscar transportes que puedan haber cambiado
 */
export async function syncTransportesFromRegistro(rawRegistro: any, oldBooking?: string) {
  const supabase = createClient();
  const registro = ensureAppRegistro(rawRegistro);

  try {
    const registroId = registro.id;
    const currentBooking = registro.booking?.trim();
    const refAsli = registro.refAsli?.trim();
    const refCliente = registro.refCliente?.trim();

    console.log(`🔄 [Sync] Iniciando para: ${refAsli || currentBooking || registroId}`);
    console.log(`   - ID: ${registroId}`);
    console.log(`   - Booking: ${currentBooking} (Anterior: ${oldBooking})`);
    console.log(`   - Ref Cliente: ${refCliente}`);

    // Buscar transportes relacionados por registro_id O por booking (para vincular huérfanos)
    const bookingsToSearch = [currentBooking].filter(Boolean) as string[];
    if (oldBooking && oldBooking.trim() && !bookingsToSearch.includes(oldBooking.trim())) {
      bookingsToSearch.push(oldBooking.trim());
    }

    let transportesQuery = supabase
      .from('transportes')
      .select('id, booking, registro_id, ref_cliente')
      .is('deleted_at', null);

    const orConditions: string[] = [];

    // 1. Prioridad: Link por ID
    if (registroId) {
      orConditions.push(`registro_id.eq.${registroId}`);
    }

    // 2. Link por Bookings (actual o anterior)
    if (bookingsToSearch.length > 0) {
      // Usar comillas para bookings que puedan tener caracteres especiales
      const bookingsStr = bookingsToSearch.map(b => `"${b}"`).join(',');
      orConditions.push(`booking.in.(${bookingsStr})`);
    }

    // 3. Link por Ref ASLI (para transportes que tengan esta referencia)
    if (refAsli) {
      orConditions.push(`ref_asli.eq."${refAsli}"`);
    }

    // 4. Fallback: Link por Ref Cliente (solo para transportes que no tengan registro_id o que coincidan con la ref)
    if (refCliente) {
      // Limpiar caracteres especiales que rompen la query .or()
      const sanitizedRef = refCliente.replace(/[(),]/g, '');
      if (sanitizedRef) {
        orConditions.push(`ref_cliente.eq."${sanitizedRef}"`);
      }
    }

    if (orConditions.length === 0) {
      console.log('ℹ️ [Sync] Sin criterios de búsqueda suficientes');
      return { success: true, updated: 0 };
    }

    const { data: transportes, error: fetchError } = await transportesQuery.or(orConditions.join(','));

    if (fetchError) {
      console.error('❌ [Sync] Error al buscar transportes:', fetchError);
      return { success: false, error: fetchError.message };
    }

    if (!transportes || transportes.length === 0) {
      console.log('ℹ️ [Sync] No se encontraron transportes para sincronizar');
      return { success: true, updated: 0 };
    }

    console.log(`🔍 [Sync] Encontrados ${transportes.length} transportes candidatos`);

    // Preparar datos de actualización
    const updateData: any = {
      registro_id: registroId, // Asegurar que se vincule si era huérfano
      booking: currentBooking || null,
      ref_asli: refAsli || null,
      nave: registro.naveInicial?.trim() || null,
      naviera: registro.naviera?.trim() || null,
      contenedor: Array.isArray(registro.contenedor)
        ? (registro.contenedor[0] || '').trim() || null
        : (registro.contenedor || '').trim() || null,
      ref_cliente: refCliente || null,
      exportador: registro.shipper?.trim() || null,
      especie: registro.especie?.trim() || null,
      pol: registro.pol?.trim() || null,
      pod: registro.pod?.trim() || null,
      deposito: registro.deposito?.trim() || null,
      temperatura: registro.temperatura !== undefined ? registro.temperatura : null,
      updated_at: new Date().toISOString(),
    };

    // Actualizar todos los transportes relacionados
    const { data: updatedTransportes, error: updateError } = await supabase
      .from('transportes')
      .update(updateData)
      .in('id', transportes.map(t => t.id))
      .select();

    if (updateError) {
      console.error('❌ [Sync] Error al actualizar transportes:', updateError);
      return { success: false, error: updateError.message };
    }

    console.log(`✅ [Sync] Sincronización completada: ${updatedTransportes?.length || 0} transportes actualizados`);

    return {
      success: true,
      updated: updatedTransportes?.length || 0,
      transportes: updatedTransportes
    };

  } catch (error) {
    console.error('❌ [Sync] Error inesperado en sincronización:', error);
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
      if (!transporte.booking && !transporte.ref_cliente) continue;

      console.log(`✅ [Sync Manual] Procesando transporte: ${transporte.booking || transporte.ref_cliente || transporte.id}`);

      // Buscar registros que coincidan por booking o por ref_cliente
      const orConditions = [];
      if (transporte.booking?.trim()) orConditions.push(`booking.eq.${transporte.booking.trim()}`);
      if (transporte.ref_cliente?.trim()) orConditions.push(`ref_cliente.eq.${transporte.ref_cliente.trim()}`);

      if (orConditions.length === 0) continue;

      const { data: registros, error: registroError } = await supabase
        .from('registros')
        .select('*')
        .is('deleted_at', null)
        .or(orConditions.join(','));

      if (registroError) {
        console.error('❌ Error buscando registros para vincular:', registroError);
        continue;
      }

      if (registros && registros.length > 0) {
        // Priorizar el que coincida por booking
        const registroParaVincular = registros.find(r =>
          r.booking?.trim() === transporte.booking?.trim()
        ) || registros[0];

        console.log(`🔗 Vinculando transporte ${transporte.id} con registro ${registroParaVincular.id}`);

        // Usar la función principal de sincronización que ya maneja toda la lógica de mapeo
        const syncResult = await syncTransportesFromRegistro(registroParaVincular, transporte.booking);

        if (syncResult.success) {
          updatedCount++;
        }
      } else {
        console.log(`ℹ️ No se encontró registro coincidente para transporte ${transporte.id}`);
      }
    }

    console.log(`📊 Sincronización de huérfanos completada: ${updatedCount}/${orphanTransportes.length} vinculados`);

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
