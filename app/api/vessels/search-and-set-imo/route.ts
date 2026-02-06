import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * Endpoint para buscar buques por nombre usando aisstream.io y configurar automáticamente IMO/MMSI.
 * 
 * POST /api/vessels/search-and-set-imo
 * Body: { vessel_name: string }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as {
      vessel_name?: string;
    } | null;

    if (!body || !body.vessel_name) {
      return NextResponse.json(
        { error: 'Se requiere vessel_name en el body' },
        { status: 400 },
      );
    }

    const { vessel_name } = body;
    const AISSTREAM_API_KEY = process.env.AISSTREAM_API_KEY;

    if (!AISSTREAM_API_KEY) {
      return NextResponse.json(
        { error: 'AISSTREAM_API_KEY no está configurada' },
        { status: 500 },
      );
    }

    // NOTA: aisstream.io es un servicio WebSocket, no REST API
    // No podemos buscar IMO/MMSI usando REST con aisstream.io
    return NextResponse.json(
      { 
        success: false,
        message: 'aisstream.io no soporta búsquedas REST',
        error: 'aisstream.io es un servicio WebSocket para streaming en tiempo real. No proporciona una API REST para buscar IMO/MMSI por nombre de buque.',
        suggestion: 'Usa otra API REST (como DataDocked o MarineTraffic) para buscar IMO/MMSI, o implementa WebSocket de aisstream.io para recibir datos en tiempo real.'
      },
      { status: 501 },
    );
  } catch (error: any) {
    console.error('[SearchIMO] Error inesperado:', error);
    return NextResponse.json(
      { error: 'Error inesperado al buscar IMO/MMSI', details: error.message },
      { status: 500 },
    );
  }
}
