import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getAisstreamService } from '@/lib/aisstream-websocket';

export const dynamic = 'force-dynamic';

/**
 * Endpoint para iniciar el servicio WebSocket de aisstream.io
 * 
 * POST /api/vessels/start-websocket
 */
export async function POST() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const AISSTREAM_API_KEY = process.env.AISSTREAM_API_KEY;

    if (!AISSTREAM_API_KEY) {
      return NextResponse.json(
        { error: 'AISSTREAM_API_KEY no está configurada' },
        { status: 500 },
      );
    }

    // Obtener MMSIs de buques que ya tienen MMSI configurado en vessel_position
    // IMPORTANTE: Solo procesar naves que ya existen, no crear nuevas
    const { data: positions, error: positionsError } = await supabase
      .from('vessel_position')
      .select('mmsi')
      .not('mmsi', 'is', null);

    if (positionsError) {
      console.error('[StartWebSocket] Error consultando posiciones:', positionsError);
    }

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

    console.log('[StartWebSocket] Iniciando servicio WebSocket con', activeMMSIs.length, 'MMSIs activos');
    console.log('[StartWebSocket] 📋 MMSIs que se enviarán al WebSocket:', activeMMSIs);

    // Iniciar el servicio WebSocket
    const service = getAisstreamService();
    if (!service) {
      return NextResponse.json(
        { error: 'No se pudo crear el servicio WebSocket. Verifica AISSTREAM_API_KEY.' },
        { status: 500 },
      );
    }

    await service.connect(activeMMSIs);

    return NextResponse.json({
      success: true,
      message: 'Servicio WebSocket iniciado correctamente',
      activeMMSIs: activeMMSIs.length,
      note: 'El servicio recibirá datos AIS en tiempo real y actualizará la base de datos automáticamente.',
    });
  } catch (error: any) {
    console.error('[StartWebSocket] Error inesperado:', error);
    return NextResponse.json(
      { error: 'Error inesperado al iniciar WebSocket', details: error.message },
      { status: 500 },
    );
  }
}
