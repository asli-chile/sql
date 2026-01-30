import { createClient } from '@/lib/supabase-browser';
import { getShipmentTracking } from './tracking-service';

/**
 * Sistema de sincronización automática de tracking
 * Actualiza los datos de tracking cuando cambian registros o transportes
 */

export interface TrackingUpdatePayload {
  registro_id: string;
  type: 'registro' | 'transporte';
  changes: Record<string, any>;
}

/**
 * Actualiza el tracking de un registro específico
 * Esta función se llama automáticamente cuando hay cambios en registros o transportes
 */
export async function refreshTrackingForRegistro(registroId: string): Promise<{
  success: boolean;
  error?: string;
  tracking?: any[];
}> {
  try {
    console.log(`🔄 [Auto-Tracking] Actualizando tracking para registro: ${registroId}`);
    
    // Obtener el tracking actualizado con las nuevas reglas de automatización
    const tracking = await getShipmentTracking(registroId);
    
    // Opcional: Aquí podríamos emitir un evento WebSocket para actualizar UI en tiempo real
    await emitTrackingUpdate(registroId, tracking);
    
    console.log(`✅ [Auto-Tracking] Tracking actualizado: ${tracking.length} hitos procesados`);
    
    return {
      success: true,
      tracking
    };
  } catch (error) {
    console.error('❌ [Auto-Tracking] Error al actualizar tracking:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Emite una actualización de tracking para clientes conectados (WebSocket/Realtime)
 */
async function emitTrackingUpdate(registroId: string, tracking: any[]): Promise<void> {
  const supabase = createClient();
  
  try {
    // Emitir evento a través del canal de realtime de Supabase
    const channel = supabase.channel(`tracking_updates:${registroId}`);
    
    // Enviar actualización a todos los suscriptores
    await channel.send({
      type: 'broadcast',
      event: 'tracking_updated',
      payload: {
        registro_id: registroId,
        tracking,
        timestamp: new Date().toISOString()
      }
    });
    
    console.log(`📡 [Auto-Tracking] Evento emitido para registro ${registroId}`);
  } catch (error) {
    console.warn('⚠️ [Auto-Tracking] No se pudo emitir evento realtime:', error);
    // No fallar si el realtime no está disponible
  }
}

/**
 * Procesa cambios masivos en registros/transportes y actualiza tracking afectado
 */
export async function processBatchTrackingUpdates(payloads: TrackingUpdatePayload[]): Promise<{
  success: boolean;
  processed: number;
  errors: string[];
}> {
  const results = [];
  const errors: string[] = [];
  
  // Agrupar por registro_id para evitar duplicados
  const uniqueRegistros = [...new Set(payloads.map(p => p.registro_id))];
  
  console.log(`🔄 [Auto-Tracking] Procesando actualización batch: ${uniqueRegistros.length} registros únicos`);
  
  for (const registroId of uniqueRegistros) {
    const result = await refreshTrackingForRegistro(registroId);
    
    if (result.success) {
      results.push(registroId);
    } else {
      errors.push(`${registroId}: ${result.error}`);
    }
    
    // Pequeña pausa para no sobrecargar la BD
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`📊 [Auto-Tracking] Batch completado: ${results.length}/${uniqueRegistros.length} exitosos`);
  
  return {
    success: errors.length === 0,
    processed: results.length,
    errors
  };
}

/**
 * Hook para suscribirse a actualizaciones de tracking en tiempo real
 */
export function subscribeToTrackingUpdates(
  registroId: string, 
  onUpdate: (tracking: any[]) => void
) {
  const supabase = createClient();
  
  const channel = supabase.channel(`tracking_updates:${registroId}`)
    .on('broadcast', { event: 'tracking_updated' }, (payload) => {
      console.log(`📡 [Auto-Tracking] Recibida actualización para registro ${registroId}`);
      onUpdate(payload.payload.tracking);
    })
    .subscribe();
  
  // Retornar función de limpieza
  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Verifica si los cambios afectan al tracking y necesita actualización
 */
export function shouldUpdateTracking(changes: Record<string, any>, type: 'registro' | 'transporte'): boolean {
  // Campos críticos que afectan el tracking
  const criticalFields = {
    registro: [
      'estado', 'contenedor', 'ingreso_stacking', 'etd', 'eta', 
      'nave_inicial', 'booking', 'ref_asli', 'ref_cliente'
    ],
    transporte: [
      'llegada_planta', 'salida_planta', 'ingreso_stacking'
    ]
  };
  
  const fields = criticalFields[type] || [];
  
  // Verificar si algún campo crítico cambió
  return fields.some(field => changes.hasOwnProperty(field));
}
