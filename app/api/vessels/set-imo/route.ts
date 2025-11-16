import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * Endpoint para configurar el IMO/MMSI de un buque manualmente.
 * Esto permite que el sistema use estos identificadores para buscar en la API AIS.
 * 
 * POST /api/vessels/set-imo
 * Body: { vessel_name: string, imo?: string, mmsi?: string }
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
      imo?: string | null;
      mmsi?: string | null;
    } | null;

    if (!body || !body.vessel_name) {
      return NextResponse.json(
        { error: 'Se requiere vessel_name en el body' },
        { status: 400 },
      );
    }

    if (!body.imo && !body.mmsi) {
      return NextResponse.json(
        { error: 'Se requiere al menos IMO o MMSI' },
        { status: 400 },
      );
    }

    const { vessel_name, imo, mmsi } = body;

    // Buscar si ya existe un registro para este buque
    const { data: existing, error: selectError } = await supabase
      .from('vessel_positions')
      .select('id')
      .eq('vessel_name', vessel_name)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      // PGRST116 = no rows returned, que es OK si no existe
      console.error('[SetIMO] Error buscando buque:', selectError);
      return NextResponse.json(
        { error: 'Error buscando buque en la base de datos' },
        { status: 500 },
      );
    }

    if (existing) {
      // Actualizar registro existente
      const { error: updateError } = await supabase
        .from('vessel_positions')
        .update({
          imo: imo ?? null,
          mmsi: mmsi ?? null,
        })
        .eq('id', existing.id);

      if (updateError) {
        console.error('[SetIMO] Error actualizando IMO/MMSI:', updateError);
        return NextResponse.json(
          { error: 'Error actualizando IMO/MMSI del buque' },
          { status: 500 },
        );
      }

      return NextResponse.json({
        message: 'IMO/MMSI actualizado correctamente',
        vessel_name,
        imo: imo ?? null,
        mmsi: mmsi ?? null,
      });
    } else {
      // Crear nuevo registro solo con IMO/MMSI (sin posición aún)
      const { error: insertError } = await supabase.from('vessel_positions').insert({
        vessel_name,
        imo: imo ?? null,
        mmsi: mmsi ?? null,
        last_lat: null,
        last_lon: null,
        last_position_at: null,
        last_api_call_at: null,
        raw_payload: null,
      });

      if (insertError) {
        console.error('[SetIMO] Error insertando IMO/MMSI:', insertError);
        return NextResponse.json(
          { error: 'Error insertando IMO/MMSI del buque' },
          { status: 500 },
        );
      }

      return NextResponse.json({
        message: 'IMO/MMSI configurado correctamente',
        vessel_name,
        imo: imo ?? null,
        mmsi: mmsi ?? null,
      });
    }
  } catch (error) {
    console.error('[SetIMO] Error inesperado:', error);
    return NextResponse.json(
      { error: 'Error interno al configurar IMO/MMSI' },
      { status: 500 },
    );
  }
}

