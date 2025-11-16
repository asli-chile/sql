import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { fetchVesselPositionFromAisApi } from '@/lib/vessel-ais-client';
import type { VesselPosition } from '@/types/vessels';

const TWENTY_FOUR_HOURS_IN_MS = 24 * 60 * 60 * 1000;

type ActiveVesselFromRegistros = {
  vessel_name: string;
  any_eta: string | null;
};

const parseVesselName = (rawName: string | null): string | null => {
  if (!rawName) {
    return null;
  }

  const trimmed = rawName.trim();
  const match = trimmed.match(/^(.+?)\s*\[.+\]$/);
  if (match) {
    return match[1].trim();
  }

  return trimmed || null;
};

const shouldCallApi = (lastApiCallAt: string | null): boolean => {
  if (!lastApiCallAt) {
    return true;
  }

  const last = new Date(lastApiCallAt).getTime();
  if (!Number.isFinite(last)) {
    return true;
  }

  const now = Date.now();
  return now - last >= TWENTY_FOUR_HOURS_IN_MS;
};

export const dynamic = 'force-dynamic';

/**
 * Endpoint para cron job que actualiza posiciones de buques automáticamente
 * Se ejecuta diariamente a las 8:30 UTC
 * 
 * Este endpoint puede ser llamado por:
 * - Vercel Cron Jobs (configurado en vercel.json)
 * - Servicios externos de cron (cron-job.org, etc.)
 * 
 * Para seguridad, verifica que la llamada viene con el header correcto
 */
export async function GET(request: Request) {
  // Verificar que la llamada viene de un cron job autorizado
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // Si hay un CRON_SECRET configurado, validarlo
  if (cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
  }

  // También verificar el header de Vercel Cron
  const cronHeader = request.headers.get('x-vercel-cron');
  if (!cronHeader && !cronSecret) {
    // Si no es un cron de Vercel y no hay secret, permitir solo en desarrollo
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
  }

  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    // Para cron jobs, no requerimos usuario autenticado
    // pero verificamos que Supabase esté configurado correctamente
    if (userError && userError.message?.includes('JWT')) {
      // Error de JWT es esperado en cron jobs, continuamos
    }

    const nowIso = new Date().toISOString();

    const { data: registros, error: registrosError } = await supabase
      .from('registros')
      .select('nave_inicial, eta')
      .is('deleted_at', null)
      .neq('estado', 'CANCELADO')
      .or(`eta.is.null,eta.gt.${nowIso}`);

    if (registrosError) {
      console.error('[UpdatePositionsCron] Error consultando registros activos:', registrosError);
      return NextResponse.json(
        { error: 'Error consultando registros activos' },
        { status: 500 },
      );
    }

    const vesselMap = new Map<string, ActiveVesselFromRegistros>();

    (registros || []).forEach((row: any) => {
      const vesselName = parseVesselName(row.nave_inicial);
      if (!vesselName) {
        return;
      }

      const eta = row.eta as string | null;
      const existing = vesselMap.get(vesselName);

      if (!existing) {
        vesselMap.set(vesselName, {
          vessel_name: vesselName,
          any_eta: eta ?? null,
        });
        return;
      }

      if (eta) {
        if (!existing.any_eta || existing.any_eta < eta) {
          existing.any_eta = eta;
        }
      }
    });

    const activeVessels = Array.from(vesselMap.values());

    if (activeVessels.length === 0) {
      return NextResponse.json(
        {
          message: 'No se encontraron buques activos según los criterios actuales',
          updated: [],
          skipped: [],
        },
        { status: 200 },
      );
    }

    const vesselNames = activeVessels.map((v) => v.vessel_name);

    const { data: existingPositions, error: positionsError } = await supabase
      .from('vessel_positions')
      .select('*')
      .in('vessel_name', vesselNames);

    if (positionsError) {
      console.error(
        '[UpdatePositionsCron] Error leyendo vessel_positions existentes:',
        positionsError,
      );
      return NextResponse.json(
        { error: 'Error leyendo posiciones actuales de buques' },
        { status: 500 },
      );
    }

    const positionsByName = new Map<string, VesselPosition>();
    (existingPositions || []).forEach((row: any) => {
      positionsByName.set(row.vessel_name, {
        id: row.id,
        vessel_name: row.vessel_name,
        imo: row.imo,
        mmsi: row.mmsi,
        last_lat: row.last_lat,
        last_lon: row.last_lon,
        last_position_at: row.last_position_at,
        last_api_call_at: row.last_api_call_at,
        raw_payload: row.raw_payload,
        speed: row.speed ?? null,
        course: row.course ?? null,
        destination: row.destination ?? null,
        navigational_status: row.navigational_status ?? null,
        ship_type: row.ship_type ?? null,
        country: row.country ?? null,
        eta_utc: row.eta_utc ?? null,
        atd_utc: row.atd_utc ?? null,
        last_port: row.last_port ?? null,
        unlocode_lastport: row.unlocode_lastport ?? null,
        distance: row.distance ?? null,
        predicted_eta: row.predicted_eta ?? null,
        current_draught: row.current_draught ?? null,
        length: row.length ?? null,
        beam: row.beam ?? null,
        gross_tonnage: row.gross_tonnage ?? null,
        year_of_built: row.year_of_built ?? null,
        callsign: row.callsign ?? null,
        type_specific: row.type_specific ?? null,
        deadweight: row.deadweight ?? null,
        hull: row.hull ?? null,
        builder: row.builder ?? null,
        material: row.material ?? null,
        place_of_build: row.place_of_build ?? null,
        ballast_water: row.ballast_water ?? null,
        crude_oil: row.crude_oil ?? null,
        fresh_water: row.fresh_water ?? null,
        gas: row.gas ?? null,
        grain: row.grain ?? null,
        bale: row.bale ?? null,
        time_remaining: row.time_remaining ?? null,
        teu: row.teu ?? null,
      });
    });

    const updated: string[] = [];
    const skipped: string[] = [];
    const failed: { vessel_name: string; reason: string }[] = [];
    const missingIdentifiers: string[] = [];

    for (const vessel of activeVessels) {
      const existing = positionsByName.get(vessel.vessel_name);

      // En el cron job, forzamos la actualización si han pasado 24 horas
      // (ignoramos el check de shouldCallApi para asegurar actualización diaria)
      if (existing && !shouldCallApi(existing.last_api_call_at)) {
        skipped.push(vessel.vessel_name);
        continue;
      }

      const imoToUse = existing?.imo ?? null;
      const mmsiToUse = existing?.mmsi ?? null;

      if (!imoToUse && !mmsiToUse) {
        missingIdentifiers.push(vessel.vessel_name);
        continue;
      }

      const aisResult = await fetchVesselPositionFromAisApi({
        vesselName: vessel.vessel_name,
        imo: imoToUse,
        mmsi: mmsiToUse,
      });

      if (!aisResult) {
        failed.push({
          vessel_name: vessel.vessel_name,
          reason:
            'La API AIS no devolvió datos válidos, no está configurada o no hay IMO/MMSI para este buque.',
        });
        continue;
      }

      const now = new Date().toISOString();

      if (!existing) {
        const { error: insertError } = await supabase.from('vessel_positions').insert({
          vessel_name: vessel.vessel_name,
          imo: aisResult.imo ?? existing?.imo ?? null,
          mmsi: aisResult.mmsi ?? existing?.mmsi ?? null,
          last_lat: aisResult.lat,
          last_lon: aisResult.lon,
          last_position_at: aisResult.positionTimestamp,
          last_api_call_at: now,
          raw_payload: aisResult.rawPayload,
          speed: aisResult.speed ?? null,
          course: aisResult.course ?? null,
          destination: aisResult.destination ?? null,
          navigational_status: aisResult.navigationalStatus ?? null,
          ship_type: aisResult.shipType ?? null,
          country: aisResult.country ?? null,
          eta_utc: aisResult.etaUtc ?? null,
          atd_utc: aisResult.atdUtc ?? null,
          last_port: aisResult.lastPort ?? null,
          unlocode_lastport: aisResult.unlocodeLastport ?? null,
          distance: aisResult.distance ?? null,
          predicted_eta: aisResult.predictedEta ?? null,
          current_draught: aisResult.currentDraught ?? null,
          length: aisResult.length ?? null,
          beam: aisResult.beam ?? null,
          gross_tonnage: aisResult.grossTonnage ?? null,
          year_of_built: aisResult.yearOfBuilt ?? null,
          callsign: aisResult.callsign ?? null,
          type_specific: aisResult.typeSpecific ?? null,
          deadweight: aisResult.deadweight ?? null,
          hull: aisResult.hull ?? null,
          builder: aisResult.builder ?? null,
          material: aisResult.material ?? null,
          place_of_build: aisResult.placeOfBuild ?? null,
          ballast_water: aisResult.ballastWater ?? null,
          crude_oil: aisResult.crudeOil ?? null,
          fresh_water: aisResult.freshWater ?? null,
          gas: aisResult.gas ?? null,
          grain: aisResult.grain ?? null,
          bale: aisResult.bale ?? null,
          time_remaining: aisResult.timeRemaining ?? null,
          teu: aisResult.teu ?? null,
          engine: aisResult.engine ? JSON.stringify(aisResult.engine) : null,
          ports: aisResult.ports ? JSON.stringify(aisResult.ports) : null,
          management: aisResult.management ? JSON.stringify(aisResult.management) : null,
        });

        if (insertError) {
          console.error(
            '[UpdatePositionsCron] Error insertando nueva posición de buque:',
            vessel.vessel_name,
            insertError,
          );
          failed.push({
            vessel_name: vessel.vessel_name,
            reason: 'Error al insertar en vessel_positions',
          });
          continue;
        }
      } else {
        const { error: updateError } = await supabase
          .from('vessel_positions')
          .update({
            imo: aisResult.imo ?? existing.imo ?? null,
            mmsi: aisResult.mmsi ?? existing.mmsi ?? null,
            last_lat: aisResult.lat,
            last_lon: aisResult.lon,
            last_position_at: aisResult.positionTimestamp,
            last_api_call_at: now,
            raw_payload: aisResult.rawPayload,
            speed: aisResult.speed ?? null,
            course: aisResult.course ?? null,
            destination: aisResult.destination ?? null,
            navigational_status: aisResult.navigationalStatus ?? null,
            ship_type: aisResult.shipType ?? null,
            country: aisResult.country ?? null,
            eta_utc: aisResult.etaUtc ?? null,
            atd_utc: aisResult.atdUtc ?? null,
            last_port: aisResult.lastPort ?? null,
            unlocode_lastport: aisResult.unlocodeLastport ?? null,
            distance: aisResult.distance ?? null,
            predicted_eta: aisResult.predictedEta ?? null,
            current_draught: aisResult.currentDraught ?? null,
            length: aisResult.length ?? null,
            beam: aisResult.beam ?? null,
            gross_tonnage: aisResult.grossTonnage ?? null,
            year_of_built: aisResult.yearOfBuilt ?? null,
            callsign: aisResult.callsign ?? null,
            type_specific: aisResult.typeSpecific ?? null,
            deadweight: aisResult.deadweight ?? null,
            hull: aisResult.hull ?? null,
            builder: aisResult.builder ?? null,
            material: aisResult.material ?? null,
            place_of_build: aisResult.placeOfBuild ?? null,
            ballast_water: aisResult.ballastWater ?? null,
            crude_oil: aisResult.crudeOil ?? null,
            fresh_water: aisResult.freshWater ?? null,
            gas: aisResult.gas ?? null,
            grain: aisResult.grain ?? null,
            bale: aisResult.bale ?? null,
            time_remaining: aisResult.timeRemaining ?? null,
            teu: aisResult.teu ?? null,
            engine: aisResult.engine ? JSON.stringify(aisResult.engine) : null,
            ports: aisResult.ports ? JSON.stringify(aisResult.ports) : null,
            management: aisResult.management ? JSON.stringify(aisResult.management) : null,
          })
          .eq('id', existing.id);

        if (updateError) {
          console.error(
            '[UpdatePositionsCron] Error actualizando posición de buque:',
            vessel.vessel_name,
            updateError,
          );
          failed.push({
            vessel_name: vessel.vessel_name,
            reason: 'Error al actualizar vessel_positions',
          });
          continue;
        }
      }

      // Guardar la posición en el historial
      const { error: historyError } = await supabase.from('vessel_position_history').insert({
        vessel_name: vessel.vessel_name,
        lat: aisResult.lat,
        lon: aisResult.lon,
        position_at: aisResult.positionTimestamp,
        source: 'AIS',
      });

      if (historyError) {
        console.error(
          '[UpdatePositionsCron] Error insertando en vessel_position_history:',
          vessel.vessel_name,
          historyError,
        );
      }

      updated.push(vessel.vessel_name);
    }

    return NextResponse.json(
      {
        message: 'Proceso de actualización de posiciones de buques completado (cron job)',
        timestamp: new Date().toISOString(),
        totalActiveVessels: activeVessels.length,
        updated,
        skipped,
        failed,
        missingIdentifiers,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('[UpdatePositionsCron] Error inesperado:', error);
    return NextResponse.json(
      { error: 'Error interno al actualizar posiciones de buques' },
      { status: 500 },
    );
  }
}

