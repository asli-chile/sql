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
    // Log inicial para diagnóstico
    console.log('[UpdatePositions] Iniciando actualización de posiciones');
    const AISSTREAM_API_KEY = process.env.AISSTREAM_API_KEY;
    console.log('[UpdatePositions] Variables de entorno:', {
      provider: 'aisstream.io (WebSocket)',
      hasAisstreamKey: !!AISSTREAM_API_KEY,
      nodeEnv: process.env.NODE_ENV,
    });

    if (!AISSTREAM_API_KEY) {
      return NextResponse.json(
        { 
          error: 'AISSTREAM_API_KEY no está configurada',
          message: 'aisstream.io es gratuito. Configura AISSTREAM_API_KEY en tus variables de entorno.'
        },
        { status: 500 },
      );
    }

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
      .select('id, vessel_name, imo, mmsi, last_lat, last_lon, last_position_at, last_api_call_at, raw_payload, speed, course, destination, navigational_status, ship_type, country, country_iso, eta_utc, atd_utc, last_port, unlocode_lastport, unlocode_destination, distance, predicted_eta, current_draught, length, beam, gross_tonnage, year_of_built, callsign, type_specific, deadweight, hull, builder, material, place_of_build, ballast_water, crude_oil, fresh_water, gas, grain, bale, time_remaining, teu, vessel_image, update_time, data_source, eni, name')
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

    const positionsByName = new Map<string, VesselPosition & { engine?: any; ports?: any; management?: any }>();
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
        country_iso: row.country_iso ?? null,
        eta_utc: row.eta_utc ?? null,
        atd_utc: row.atd_utc ?? null,
        last_port: row.last_port ?? null,
        unlocode_lastport: row.unlocode_lastport ?? null,
        unlocode_destination: row.unlocode_destination ?? null,
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
        vessel_image: row.vessel_image ?? null,
        update_time: row.update_time ?? null,
        data_source: row.data_source ?? null,
        eni: row.eni ?? null,
        name: row.name ?? null,
        engine: row.engine ?? null,
        ports: row.ports ?? null,
        management: row.management ?? null,
      });
    });

    const updated: string[] = [];
    const skipped: string[] = [];
    const failed: { vessel_name: string; reason: string }[] = [];
    const missingIdentifiers: string[] = [];

    console.log(`[UpdatePositions] Procesando ${activeVessels.length} buques activos`);

    for (const vessel of activeVessels) {
      const existing = positionsByName.get(vessel.vessel_name);

      console.log(`[UpdatePositions] Procesando buque: ${vessel.vessel_name}`, {
        existeEnPosiciones: !!existing,
        tieneImo: !!existing?.imo,
        tieneMmsi: !!existing?.mmsi,
        lastApiCallAt: existing?.last_api_call_at || 'N/A',
        shouldCall: existing ? shouldCallApi(existing.last_api_call_at) : true,
      });

      if (existing && !shouldCallApi(existing.last_api_call_at)) {
        console.log(`[UpdatePositions] ⏸️ Saltando ${vessel.vessel_name} - actualizado hace menos de 24 horas`);
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
        console.log(`[UpdatePositions] ⚠️ Saltando ${vessel.vessel_name} - sin IMO/MMSI configurado`);
        missingIdentifiers.push(vessel.vessel_name);
        continue;
      }

      console.log(
        `[UpdatePositions] Llamando API AIS para ${vessel.vessel_name} con IMO: ${imoToUse || 'N/A'}, MMSI: ${mmsiToUse || 'N/A'}`,
      );

      const aisResult = await fetchVesselPositionFromAisApi({
        vesselName: vessel.vessel_name,
        imo: imoToUse,
        mmsi: mmsiToUse,
      });

      if (!aisResult) {
        console.log(
          `[UpdatePositions] ⚠️ No se encontró posición en la base de datos para ${vessel.vessel_name}. ` +
            'El servicio WebSocket puede no haber recibido datos aún. Asegúrate de que el WebSocket esté activo llamando a /api/vessels/start-websocket',
        );

        failed.push({
          vessel_name: vessel.vessel_name,
          reason: 'No se encontró posición en la base de datos. El WebSocket puede no estar activo.',
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

      // ANTES DE ACTUALIZAR: Mover datos actuales al historial si existen y tienen coordenadas válidas
      if (existing && existing.last_lat != null && existing.last_lon != null) {
        console.log(
          `[UpdatePositions] Moviendo datos actuales al historial para ${vessel.vessel_name}`,
        );
        
        const { error: historyMoveError } = await supabase
          .from('vessel_position_history')
          .insert({
            vessel_name: existing.vessel_name,
            imo: existing.imo ?? null,
            mmsi: existing.mmsi ?? null,
            name: existing.name ?? null,
            lat: existing.last_lat,
            lon: existing.last_lon,
            position_at: existing.last_position_at || existing.last_api_call_at || now,
            source: 'AIS',
            speed: existing.speed ?? null,
            course: existing.course ?? null,
            destination: existing.destination ?? null,
            navigational_status: existing.navigational_status ?? null,
            ship_type: existing.ship_type ?? null,
            country: existing.country ?? null,
            country_iso: existing.country_iso ?? null,
            callsign: existing.callsign ?? null,
            type_specific: existing.type_specific ?? null,
            length: existing.length ?? null,
            beam: existing.beam ?? null,
            current_draught: existing.current_draught ?? null,
            deadweight: existing.deadweight ?? null,
            gross_tonnage: existing.gross_tonnage ?? null,
            teu: existing.teu ?? null,
            eta_utc: existing.eta_utc ?? null,
            atd_utc: existing.atd_utc ?? null,
            predicted_eta: existing.predicted_eta ?? null,
            time_remaining: existing.time_remaining ?? null,
            update_time: existing.update_time ?? null,
            last_port: existing.last_port ?? null,
            unlocode_lastport: existing.unlocode_lastport ?? null,
            unlocode_destination: existing.unlocode_destination ?? null,
            year_of_built: existing.year_of_built ?? null,
            hull: existing.hull ?? null,
            builder: existing.builder ?? null,
            material: existing.material ?? null,
            place_of_build: existing.place_of_build ?? null,
            ballast_water: existing.ballast_water ?? null,
            crude_oil: existing.crude_oil ?? null,
            fresh_water: existing.fresh_water ?? null,
            gas: existing.gas ?? null,
            grain: existing.grain ?? null,
            bale: existing.bale ?? null,
            engine: existing.engine ? (typeof existing.engine === 'string' ? JSON.parse(existing.engine) : existing.engine) : null,
            ports: existing.ports ? (typeof existing.ports === 'string' ? JSON.parse(existing.ports) : existing.ports) : null,
            management: existing.management ? (typeof existing.management === 'string' ? JSON.parse(existing.management) : existing.management) : null,
            vessel_image: existing.vessel_image ?? null,
            data_source: existing.data_source ?? null,
            eni: existing.eni ?? null,
            raw_payload: existing.raw_payload,
          });

        if (historyMoveError) {
          console.error(
            `[UpdatePositions] Error moviendo datos actuales al historial para ${vessel.vessel_name}:`,
            historyMoveError,
          );
          // Continuar con la actualización aunque falle el movimiento al historial
        } else {
          console.log(
            `[UpdatePositions] ✅ Datos actuales movidos al historial para ${vessel.vessel_name}`,
          );
        }
      }

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


