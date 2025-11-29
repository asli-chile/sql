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
  const cronHeader = request.headers.get('x-vercel-cron');

  // Si hay un CRON_SECRET configurado, validarlo (seguridad opcional)
  if (cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
  } else {
    // Si NO hay CRON_SECRET configurado, permitir llamadas
    // (esto permite usar servicios externos sin configuración adicional)
    // NOTA: Para mayor seguridad, configura CRON_SECRET en Vercel
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

    console.log(`[UpdatePositionsCron] Registros encontrados: ${(registros || []).length}`);
    console.log(`[UpdatePositionsCron] nowIso: ${nowIso}`);

    const vesselMap = new Map<string, ActiveVesselFromRegistros>();

    (registros || []).forEach((row: any) => {
      const vesselName = parseVesselName(row.nave_inicial);
      if (!vesselName) {
        console.log(`[UpdatePositionsCron] Saltando registro con nave_inicial: ${row.nave_inicial} (parseVesselName devolvió null)`);
        return;
      }

      const eta = row.eta as string | null;
      const existing = vesselMap.get(vesselName);

      if (!existing) {
        vesselMap.set(vesselName, {
          vessel_name: vesselName,
          any_eta: eta ?? null,
        });
        console.log(`[UpdatePositionsCron] Agregado buque activo: ${vesselName}`);
        return;
      }

      if (eta) {
        if (!existing.any_eta || existing.any_eta < eta) {
          existing.any_eta = eta;
        }
      }
    });

    const activeVessels = Array.from(vesselMap.values());

    console.log(`[UpdatePositionsCron] Total de buques activos únicos: ${activeVessels.length}`);
    if (activeVessels.length > 0) {
      console.log(`[UpdatePositionsCron] Buques activos: ${activeVessels.map(v => v.vessel_name).join(', ')}`);
    }

    if (activeVessels.length === 0) {
      return NextResponse.json(
        {
          message: 'No se encontraron buques activos según los criterios actuales',
          updated: [],
          skipped: [],
          debug: {
            registrosEncontrados: (registros || []).length,
            nowIso,
            registrosSample: (registros || []).slice(0, 3).map((r: any) => ({
              nave_inicial: r.nave_inicial,
              eta: r.eta,
            })),
          },
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
        vessel_image: row.vessel_image ?? null,
        country_iso: row.country_iso ?? null,
        unlocode_destination: row.unlocode_destination ?? null,
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

    for (const vessel of activeVessels) {
      const existing = positionsByName.get(vessel.vessel_name);

      // Si la nave no existe en vessel_positions, crear entrada vacía primero
      if (!existing) {
        console.log(`[UpdatePositionsCron] Creando entrada vacía para nueva nave: ${vessel.vessel_name}`);
        const { error: createError } = await supabase.from('vessel_positions').insert({
          vessel_name: vessel.vessel_name,
          last_lat: null,
          last_lon: null,
          last_position_at: null,
          last_api_call_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        if (createError) {
          console.error(
            `[UpdatePositionsCron] Error creando entrada para ${vessel.vessel_name}:`,
            createError,
          );
          // Continuar de todas formas, intentará actualizar después
        } else {
          console.log(`[UpdatePositionsCron] ✅ Entrada creada para ${vessel.vessel_name}`);
        }
      }

      // Re-leer la posición después de crear (si era nueva)
      const { data: updatedExisting, error: reReadError } = await supabase
        .from('vessel_positions')
        .select('*')
        .eq('vessel_name', vessel.vessel_name)
        .single();

      if (reReadError && reReadError.code !== 'PGRST116') {
        console.error(
          `[UpdatePositionsCron] Error re-leyendo posición para ${vessel.vessel_name}:`,
          reReadError,
        );
        failed.push({
          vessel_name: vessel.vessel_name,
          reason: 'Error leyendo posición después de crear',
        });
        continue;
      }

      const currentPosition = updatedExisting || existing;

      // En el cron job, forzamos la actualización si han pasado 24 horas
      // (ignoramos el check de shouldCallApi para asegurar actualización diaria)
      if (currentPosition && !shouldCallApi(currentPosition.last_api_call_at)) {
        skipped.push(vessel.vessel_name);
        continue;
      }

      const imoToUse = currentPosition?.imo ?? null;
      const mmsiToUse = currentPosition?.mmsi ?? null;

      if (!imoToUse && !mmsiToUse) {
        missingIdentifiers.push(vessel.vessel_name);
        failed.push({
          vessel_name: vessel.vessel_name,
          reason:
            'No tiene IMO/MMSI configurado. Usa el endpoint /api/vessels/set-imo o el script scripts/set-vessel-imo-mmsi.js para configurarlo.',
        });
        continue;
      }

      console.log(
        `[UpdatePositionsCron] Llamando API AIS para ${vessel.vessel_name} con IMO: ${imoToUse || 'N/A'}, MMSI: ${mmsiToUse || 'N/A'}`,
      );

      const aisResult = await fetchVesselPositionFromAisApi({
        vesselName: vessel.vessel_name,
        imo: imoToUse,
        mmsi: mmsiToUse,
      });

      if (!aisResult) {
        // Verificar si la API está configurada (leer dentro de la función)
        const VESSEL_API_BASE_URL = process.env.VESSEL_API_BASE_URL;
        const VESSEL_API_KEY = process.env.VESSEL_API_KEY;
        const apiConfigured = VESSEL_API_BASE_URL && VESSEL_API_KEY;
        
        let reason = `La API AIS no devolvió datos válidos. IMO usado: ${imoToUse || 'N/A'}, MMSI usado: ${mmsiToUse || 'N/A'}.`;
        if (!apiConfigured) {
          reason = 'La API AIS no está configurada (faltan variables de entorno VESSEL_API_BASE_URL o VESSEL_API_KEY).';
        } else {
          reason = `La API AIS no devolvió datos válidos para este buque. IMO usado: ${imoToUse || 'N/A'}, MMSI usado: ${mmsiToUse || 'N/A'}. Verifica que los identificadores sean correctos o que el buque esté disponible en la API.`;
        }

        console.error(
          `[UpdatePositionsCron] Error para ${vessel.vessel_name}:`,
          reason,
          {
            imo: imoToUse,
            mmsi: mmsiToUse,
            apiConfigured,
            hasBaseUrl: !!VESSEL_API_BASE_URL,
            hasApiKey: !!VESSEL_API_KEY,
            baseUrl: VESSEL_API_BASE_URL || 'NO DEFINIDA',
          },
        );

        failed.push({
          vessel_name: vessel.vessel_name,
          reason,
        });
        continue;
      }

      // Log para debugging: verificar que tenemos todos los datos, especialmente coordenadas e imagen
      console.log(
        `[UpdatePositionsCron] Datos recibidos para ${vessel.vessel_name}:`,
        {
          coordenadas: {
            lat: aisResult.lat,
            lon: aisResult.lon,
            positionTimestamp: aisResult.positionTimestamp,
          },
          coordenadasAnteriores: existing ? {
            lat: existing.last_lat,
            lon: existing.last_lon,
            position_at: existing.last_position_at,
          } : 'N/A',
          tieneImagen: !!aisResult.vesselImage,
          imagen: aisResult.vesselImage ? aisResult.vesselImage.substring(0, 80) + '...' : 'N/A',
          tieneRawPayload: !!aisResult.rawPayload,
          // Verificar si la imagen está en raw_payload
          imagenEnRawPayload: (aisResult.rawPayload as any)?.detail?.image || (aisResult.rawPayload as any)?.image || 'N/A',
          camposExtraidos: {
            imo: !!aisResult.imo,
            mmsi: !!aisResult.mmsi,
            speed: aisResult.speed !== null && aisResult.speed !== undefined,
            country: !!aisResult.country,
            countryIso: !!aisResult.countryIso,
            hasEngine: !!aisResult.engine,
            hasPorts: !!aisResult.ports,
            hasManagement: !!aisResult.management,
          },
        },
      );

      const now = new Date().toISOString();

      // ANTES DE ACTUALIZAR: Mover datos actuales al historial si existen y tienen coordenadas válidas
      if (currentPosition && currentPosition.last_lat != null && currentPosition.last_lon != null) {
        console.log(
          `[UpdatePositionsCron] Moviendo datos actuales al historial para ${vessel.vessel_name}`,
        );
        
        const { error: historyMoveError } = await supabase
          .from('vessel_position_history')
          .insert({
            vessel_name: currentPosition.vessel_name,
            imo: currentPosition.imo ?? null,
            mmsi: currentPosition.mmsi ?? null,
            name: currentPosition.name ?? null,
            lat: currentPosition.last_lat,
            lon: currentPosition.last_lon,
            position_at: currentPosition.last_position_at || currentPosition.last_api_call_at || now,
            source: 'AIS',
            speed: currentPosition.speed ?? null,
            course: currentPosition.course ?? null,
            destination: currentPosition.destination ?? null,
            navigational_status: currentPosition.navigational_status ?? null,
            ship_type: currentPosition.ship_type ?? null,
            country: currentPosition.country ?? null,
            country_iso: currentPosition.country_iso ?? null,
            callsign: currentPosition.callsign ?? null,
            type_specific: currentPosition.type_specific ?? null,
            length: currentPosition.length ?? null,
            beam: currentPosition.beam ?? null,
            current_draught: currentPosition.current_draught ?? null,
            deadweight: currentPosition.deadweight ?? null,
            gross_tonnage: currentPosition.gross_tonnage ?? null,
            teu: currentPosition.teu ?? null,
            eta_utc: currentPosition.eta_utc ?? null,
            atd_utc: currentPosition.atd_utc ?? null,
            predicted_eta: currentPosition.predicted_eta ?? null,
            time_remaining: currentPosition.time_remaining ?? null,
            update_time: currentPosition.update_time ?? null,
            last_port: currentPosition.last_port ?? null,
            unlocode_lastport: currentPosition.unlocode_lastport ?? null,
            unlocode_destination: currentPosition.unlocode_destination ?? null,
            year_of_built: currentPosition.year_of_built ?? null,
            hull: currentPosition.hull ?? null,
            builder: currentPosition.builder ?? null,
            material: currentPosition.material ?? null,
            place_of_build: currentPosition.place_of_build ?? null,
            ballast_water: currentPosition.ballast_water ?? null,
            crude_oil: currentPosition.crude_oil ?? null,
            fresh_water: currentPosition.fresh_water ?? null,
            gas: currentPosition.gas ?? null,
            grain: currentPosition.grain ?? null,
            bale: currentPosition.bale ?? null,
            engine: currentPosition.engine ? (typeof currentPosition.engine === 'string' ? JSON.parse(currentPosition.engine) : currentPosition.engine) : null,
            ports: currentPosition.ports ? (typeof currentPosition.ports === 'string' ? JSON.parse(currentPosition.ports) : currentPosition.ports) : null,
            management: currentPosition.management ? (typeof currentPosition.management === 'string' ? JSON.parse(currentPosition.management) : currentPosition.management) : null,
            vessel_image: currentPosition.vessel_image ?? null,
            data_source: currentPosition.data_source ?? null,
            eni: currentPosition.eni ?? null,
            raw_payload: currentPosition.raw_payload,
          });

        if (historyMoveError) {
          console.error(
            `[UpdatePositionsCron] Error moviendo datos actuales al historial para ${vessel.vessel_name}:`,
            historyMoveError,
          );
          // Continuar con la actualización aunque falle el movimiento al historial
        } else {
          console.log(
            `[UpdatePositionsCron] ✅ Datos actuales movidos al historial para ${vessel.vessel_name}`,
          );
        }
      }

      // Usar currentPosition en lugar de existing (puede haber sido creado arriba)
      if (!currentPosition) {
        const { error: insertError } = await supabase.from('vessel_positions').insert({
          vessel_name: vessel.vessel_name,
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
          country_iso: aisResult.countryIso ?? null,
          eta_utc: aisResult.etaUtc ?? null,
          atd_utc: aisResult.atdUtc ?? null,
          last_port: aisResult.lastPort ?? null,
          unlocode_lastport: aisResult.unlocodeLastport ?? null,
          unlocode_destination: aisResult.unlocodeDestination ?? null,
          distance: aisResult.distance ?? null,
          update_time: aisResult.updateTime ?? null,
          data_source: aisResult.dataSource ?? null,
          eni: aisResult.eni ?? null,
          name: aisResult.name ?? null,
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
          vessel_image: aisResult.vesselImage ?? null,
        });

        if (insertError) {
          console.error('[UpdatePositionsCron] Error al insertar:', insertError);
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
        updated.push(vessel.vessel_name);
      } else {
        // Log antes de actualizar para verificar qué se va a guardar
        console.log(
          `[UpdatePositionsCron] Actualizando posición para ${vessel.vessel_name}:`,
          {
            coordenadasNuevas: {
              lat: aisResult.lat,
              lon: aisResult.lon,
            },
            coordenadasAntiguas: currentPosition ? {
              lat: currentPosition.last_lat,
              lon: currentPosition.last_lon,
            } : null,
            timestampNuevo: aisResult.positionTimestamp,
            timestampAntiguo: currentPosition?.last_position_at ?? null,
          },
        );

        const { error: updateError } = await supabase
          .from('vessel_positions')
          .update({
            imo: aisResult.imo ?? currentPosition?.imo ?? null,
            mmsi: aisResult.mmsi ?? currentPosition?.mmsi ?? null,
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
            country_iso: aisResult.countryIso ?? null,
            eta_utc: aisResult.etaUtc ?? null,
            atd_utc: aisResult.atdUtc ?? null,
            last_port: aisResult.lastPort ?? null,
            unlocode_lastport: aisResult.unlocodeLastport ?? null,
            unlocode_destination: aisResult.unlocodeDestination ?? null,
            distance: aisResult.distance ?? null,
            update_time: aisResult.updateTime ?? null,
            data_source: aisResult.dataSource ?? null,
            eni: aisResult.eni ?? null,
            name: aisResult.name ?? null,
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
            vessel_image: aisResult.vesselImage ?? null,
          })
          .eq('id', currentPosition!.id);

        if (updateError) {
          console.error('[UpdatePositionsCron] Error al actualizar:', updateError);
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
        updated.push(vessel.vessel_name);
      }

      // Guardar la posición en el historial con TODOS los datos
      const { error: historyError } = await supabase.from('vessel_position_history').insert({
        vessel_name: vessel.vessel_name,
        imo: aisResult.imo ?? null,
        mmsi: aisResult.mmsi ?? null,
        name: aisResult.name ?? null,
        lat: aisResult.lat,
        lon: aisResult.lon,
        position_at: aisResult.positionTimestamp,
        source: 'AIS',
        speed: aisResult.speed ?? null,
        course: aisResult.course ?? null,
        destination: aisResult.destination ?? null,
        navigational_status: aisResult.navigationalStatus ?? null,
        ship_type: aisResult.shipType ?? null,
        country: aisResult.country ?? null,
        country_iso: aisResult.countryIso ?? null,
        eta_utc: aisResult.etaUtc ?? null,
        atd_utc: aisResult.atdUtc ?? null,
        last_port: aisResult.lastPort ?? null,
        unlocode_lastport: aisResult.unlocodeLastport ?? null,
        unlocode_destination: aisResult.unlocodeDestination ?? null,
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
        vessel_image: aisResult.vesselImage ?? null,
        update_time: aisResult.updateTime ?? null,
        data_source: aisResult.dataSource ?? null,
        eni: aisResult.eni ?? null,
        raw_payload: aisResult.rawPayload,
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

