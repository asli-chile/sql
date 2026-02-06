/**
 * Inicialización automática del servicio WebSocket de aisstream.io
 * Este módulo se ejecuta cuando el servidor arranca
 */

import { getAisstreamService } from './aisstream-websocket';
import { createClient } from './supabase-server';

let initialized = false;

/**
 * Inicializa el servicio WebSocket automáticamente
 */
export async function initAisstreamService(): Promise<void> {
  if (initialized) {
    return;
  }

  const apiKey = process.env.AISSTREAM_API_KEY;
  if (!apiKey) {
    console.log('[InitAISStream] AISSTREAM_API_KEY no configurada, omitiendo inicialización automática');
    return;
  }

  try {
    console.log('[InitAISStream] Inicializando servicio WebSocket de aisstream.io...');
    
    const supabase = await createClient();
    
    // Obtener MMSIs de buques que ya tienen MMSI configurado en vessel_position
    // IMPORTANTE: Solo procesar naves que ya existen, no crear nuevas
    const { data: positions } = await supabase
      .from('vessel_position')
      .select('mmsi')
      .not('mmsi', 'is', null);

    const activeMMSIs = (positions || [])
      .map((p) => {
        // Convertir a string, pero solo si es un número válido
        const mmsiValue = p.mmsi;
        if (mmsiValue === null || mmsiValue === undefined) {
          return null;
        }
        // Si es número, convertir a string
        if (typeof mmsiValue === 'number') {
          return String(mmsiValue);
        }
        // Si es string, verificar que sea un número válido
        if (typeof mmsiValue === 'string') {
          const num = parseInt(mmsiValue, 10);
          if (!isNaN(num) && num > 0) {
            return String(num);
          }
        }
        return null;
      })
      .filter((mmsi): mmsi is string => !!mmsi && mmsi !== 'null' && mmsi !== 'undefined' && mmsi !== 'NaN');

    const service = getAisstreamService();
    if (service) {
      await service.connect(activeMMSIs);
      console.log('[InitAISStream] ✅ Servicio WebSocket iniciado con', activeMMSIs.length, 'MMSIs activos');
      initialized = true;
    }
  } catch (error) {
    console.error('[InitAISStream] Error al inicializar:', error);
  }
}

// NOTA: La inicialización automática está deshabilitada porque requiere cookies()
// que solo está disponible en el contexto de una request de Next.js.
// El servicio se iniciará manualmente desde /api/vessels/start-websocket
// o cuando se llame a initAisstreamService() desde un contexto de request.
