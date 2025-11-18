import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * Endpoint para sincronizar vessel_positions con los datos más recientes de vessel_position_history
 * 
 * Este endpoint actualiza las posiciones actuales con los datos más recientes del historial.
 * Útil cuando los datos más recientes están en el historial pero no en vessel_positions.
 * 
 * POST /api/vessels/sync-from-history
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

    // Obtener los datos más recientes del historial para cada buque
    const { data: latestHistory, error: historyError } = await supabase
      .from('vessel_position_history')
      .select('*')
      .order('position_at', { ascending: false });

    if (historyError) {
      console.error('[SyncFromHistory] Error leyendo historial:', historyError);
      return NextResponse.json(
        { error: 'Error leyendo historial de posiciones' },
        { status: 500 },
      );
    }

    if (!latestHistory || latestHistory.length === 0) {
      return NextResponse.json({
        message: 'No hay datos en el historial para sincronizar',
        updated: [],
      });
    }

    // Agrupar por vessel_name y tomar el más reciente de cada uno
    const byVessel = new Map<string, typeof latestHistory[0]>();
    latestHistory.forEach((record) => {
      const existing = byVessel.get(record.vessel_name);
      if (!existing || !record.position_at) {
        if (record.position_at) {
          byVessel.set(record.vessel_name, record);
        }
        return;
      }

      const recordTime = new Date(record.position_at).getTime();
      const existingTime = existing.position_at
        ? new Date(existing.position_at).getTime()
        : 0;

      if (recordTime > existingTime) {
        byVessel.set(record.vessel_name, record);
      }
    });

    const updated: string[] = [];
    const skipped: string[] = [];

    // Para cada buque, actualizar vessel_positions si el historial es más reciente
    for (const [vesselName, historyRecord] of byVessel.entries()) {
      // Verificar si existe en vessel_positions
      const { data: existing, error: existingError } = await supabase
        .from('vessel_positions')
        .select('last_position_at')
        .eq('vessel_name', vesselName)
        .single();

      if (existingError && existingError.code !== 'PGRST116') {
        console.error(`[SyncFromHistory] Error verificando ${vesselName}:`, existingError);
        skipped.push(vesselName);
        continue;
      }

      // Comparar fechas
      const historyTime = historyRecord.position_at
        ? new Date(historyRecord.position_at).getTime()
        : 0;
      const existingTime = existing?.last_position_at
        ? new Date(existing.last_position_at).getTime()
        : 0;

      // Solo actualizar si el historial es más reciente o si no existe en vessel_positions
      if (existing && historyTime <= existingTime) {
        skipped.push(vesselName);
        continue;
      }

      // Preparar los datos para actualizar
      const updateData: any = {
        last_lat: historyRecord.lat ?? null,
        last_lon: historyRecord.lon ?? null,
        last_position_at: historyRecord.position_at ?? null,
        imo: historyRecord.imo ?? null,
        mmsi: historyRecord.mmsi ?? null,
        name: historyRecord.name ?? null,
        speed: historyRecord.speed ?? null,
        course: historyRecord.course ?? null,
        destination: historyRecord.destination ?? null,
        navigational_status: historyRecord.navigational_status ?? null,
        ship_type: historyRecord.ship_type ?? null,
        country: historyRecord.country ?? null,
        country_iso: historyRecord.country_iso ?? null,
        eta_utc: historyRecord.eta_utc ?? null,
        atd_utc: historyRecord.atd_utc ?? null,
        last_port: historyRecord.last_port ?? null,
        unlocode_lastport: historyRecord.unlocode_lastport ?? null,
        unlocode_destination: historyRecord.unlocode_destination ?? null,
        distance: historyRecord.distance ?? null,
        predicted_eta: historyRecord.predicted_eta ?? null,
        current_draught: historyRecord.current_draught ?? null,
        length: historyRecord.length ?? null,
        beam: historyRecord.beam ?? null,
        gross_tonnage: historyRecord.gross_tonnage ?? null,
        year_of_built: historyRecord.year_of_built ?? null,
        callsign: historyRecord.callsign ?? null,
        type_specific: historyRecord.type_specific ?? null,
        deadweight: historyRecord.deadweight ?? null,
        hull: historyRecord.hull ?? null,
        builder: historyRecord.builder ?? null,
        material: historyRecord.material ?? null,
        place_of_build: historyRecord.place_of_build ?? null,
        ballast_water: historyRecord.ballast_water ?? null,
        crude_oil: historyRecord.crude_oil ?? null,
        fresh_water: historyRecord.fresh_water ?? null,
        gas: historyRecord.gas ?? null,
        grain: historyRecord.grain ?? null,
        bale: historyRecord.bale ?? null,
        time_remaining: historyRecord.time_remaining ?? null,
        teu: historyRecord.teu ?? null,
        engine: historyRecord.engine ?? null,
        ports: historyRecord.ports ?? null,
        management: historyRecord.management ?? null,
        vessel_image: historyRecord.vessel_image ?? null,
        update_time: historyRecord.update_time ?? null,
        data_source: historyRecord.data_source ?? null,
        eni: historyRecord.eni ?? null,
        updated_at: new Date().toISOString(),
      };

      // Si no existe, insertar; si existe, actualizar
      if (!existing) {
        updateData.vessel_name = vesselName;
        const { error: insertError } = await supabase
          .from('vessel_positions')
          .insert(updateData);

        if (insertError) {
          console.error(`[SyncFromHistory] Error insertando ${vesselName}:`, insertError);
          skipped.push(vesselName);
          continue;
        }
      } else {
        const { error: updateError } = await supabase
          .from('vessel_positions')
          .update(updateData)
          .eq('vessel_name', vesselName);

        if (updateError) {
          console.error(`[SyncFromHistory] Error actualizando ${vesselName}:`, updateError);
          skipped.push(vesselName);
          continue;
        }
      }

      updated.push(vesselName);
    }

    return NextResponse.json({
      message: 'Sincronización completada',
      updated: updated.length,
      updatedVessels: updated,
      skipped: skipped.length,
      skippedVessels: skipped,
    });
  } catch (error) {
    console.error('[SyncFromHistory] Error inesperado:', error);
    return NextResponse.json(
      { error: 'Error interno sincronizando desde historial' },
      { status: 500 },
    );
  }
}

