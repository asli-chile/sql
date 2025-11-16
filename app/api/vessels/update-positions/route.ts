import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { fetchVesselPositionFromAisApi } from '@/lib/vessel-ais-client';
import type { VesselPosition } from '@/types/vessels';

const TWENTY_FOUR_HOURS_IN_MS = 24 * 60 * 60 * 1000;

type ActiveVesselFromRegistros = {
  vessel_name: string;
  // Campos opcionales por si en el futuro decidimos enriquecer la lógica
  any_eta: string | null;
};

const parseVesselName = (rawName: string | null): string | null => {
  if (!rawName) {
    return null;
  }

  // En la tabla registros se almacena la nave con posible viaje: "NAVE [001E]"
  // Limpiamos el número de viaje para agrupar por nave física.
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

    // 1) Obtener buques "activos" desde registros:
    //   - eta en el futuro o nula
    //   - estado distinto de CANCELADO
    //   - no eliminados (deleted_at IS NULL)
    const nowIso = new Date().toISOString();

    const { data: registros, error: registrosError } = await supabase
      .from('registros')
      .select('nave_inicial, eta')
      .is('deleted_at', null)
      .neq('estado', 'CANCELADO')
      .or(`eta.is.null,eta.gt.${nowIso}`);

    if (registrosError) {
      console.error('[UpdatePositions] Error consultando registros activos:', registrosError);
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

      // Mantener la ETA "más próxima" en el futuro, si hiciera falta en el futuro.
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

    // 2) Leer todas las posiciones existentes para estos buques
    const vesselNames = activeVessels.map((v) => v.vessel_name);

    const { data: existingPositions, error: positionsError } = await supabase
      .from('vessel_positions')
      .select('*')
      .in('vessel_name', vesselNames);

    if (positionsError) {
      console.error(
        '[UpdatePositions] Error leyendo vessel_positions existentes:',
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
      });
    });

    const updated: string[] = [];
    const skipped: string[] = [];
    const failed: { vessel_name: string; reason: string }[] = [];
    const missingIdentifiers: string[] = [];

    for (const vessel of activeVessels) {
      const existing = positionsByName.get(vessel.vessel_name);

      if (existing && !shouldCallApi(existing.last_api_call_at)) {
        skipped.push(vessel.vessel_name);
        continue;
      }

      // 3) Llamar a la API AIS solo si:
      //    - Existe registro con IMO/MMSI, y
      //    - Han pasado >= 24 horas desde la última llamada (o nunca se ha llamado)
      // 
      // NOTA: Si no tenemos IMO/MMSI, intentamos usar el que viene en la respuesta de la API
      // para guardarlo y usarlo en futuras búsquedas. Pero preferimos usar el que ya tenemos.
      const imoToUse = existing?.imo ?? null;
      const mmsiToUse = existing?.mmsi ?? null;

      // Si no tenemos IMO/MMSI configurado, no llamamos a la API
      // para evitar gastar créditos en búsquedas por nombre poco fiables.
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

      // Log para debugging (solo en desarrollo)
      if (process.env.NODE_ENV === 'development') {
        console.log('[UpdatePositions] Datos recibidos de AIS para', vessel.vessel_name, {
          speed: aisResult.speed,
          course: aisResult.course,
          destination: aisResult.destination,
          lastPort: aisResult.lastPort,
          distance: aisResult.distance,
          navigationalStatus: aisResult.navigationalStatus,
          shipType: aisResult.shipType,
          country: aisResult.country,
        });
      }

      const now = new Date().toISOString();

      if (!existing) {
        const { error: insertError } = await supabase.from('vessel_positions').insert({
          vessel_name: vessel.vessel_name,
          // Guardar IMO y MMSI de la respuesta de la API (si vienen)
          imo: aisResult.imo ?? null,
          mmsi: aisResult.mmsi ?? null,
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
            '[UpdatePositions] Error insertando nueva posición de buque:',
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
            // Actualizar IMO y MMSI si vienen en la respuesta (o mantener los existentes)
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
            '[UpdatePositions] Error actualizando posición de buque:',
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

      // Guardar la posición en el historial para poder dibujar la ruta del buque.
      const { error: historyError } = await supabase.from('vessel_position_history').insert({
        vessel_name: vessel.vessel_name,
        lat: aisResult.lat,
        lon: aisResult.lon,
        position_at: aisResult.positionTimestamp,
        source: 'AIS',
      });

      if (historyError) {
        // No bloqueamos el flujo principal por errores de historial, solo logueamos.
        console.error(
          '[UpdatePositions] Error insertando en vessel_position_history:',
          vessel.vessel_name,
          historyError,
        );
      }

      updated.push(vessel.vessel_name);
    }

    return NextResponse.json(
      {
        message: 'Proceso de actualización de posiciones de buques completado',
        totalActiveVessels: activeVessels.length,
        updated,
        skipped,
        failed,
        missingIdentifiers,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('[UpdatePositions] Error inesperado en endpoint /api/vessels/update-positions:', error);
    return NextResponse.json(
      { error: 'Error interno al actualizar posiciones de buques' },
      { status: 500 },
    );
  }
}


