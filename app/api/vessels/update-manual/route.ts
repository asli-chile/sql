import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * Endpoint para actualizar manualmente la posición de un buque con datos JSON de DataDocked
 * 
 * POST /api/vessels/update-manual
 * Body: { vessel_name: string, data: DataDockedResponse }
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

    const body = await request.json();
    const { vessel_name, data } = body;

    if (!vessel_name || !data) {
      return NextResponse.json(
        { error: 'Se requiere vessel_name y data' },
        { status: 400 },
      );
    }

    // Extraer datos del JSON de DataDocked (formato con "detail")
    const detail = data?.detail ?? data;
    
    // Extraer coordenadas
    const latStr = detail?.latitude ?? detail?.Latitud ?? detail?.lat ?? detail?.Lat;
    const lonStr = detail?.longitude ?? detail?.Longitud ?? detail?.lon ?? detail?.Lon;
    
    const lat = latStr !== null && latStr !== undefined && latStr !== '' 
      ? Number(latStr) 
      : null;
    const lon = lonStr !== null && lonStr !== undefined && lonStr !== '' 
      ? Number(lonStr) 
      : null;

    if (lat === null || lon === null || !Number.isFinite(lat) || !Number.isFinite(lon)) {
      return NextResponse.json(
        { error: 'Coordenadas inválidas en los datos proporcionados' },
        { status: 400 },
      );
    }

    // Extraer timestamp
    const positionTimestampRaw = detail?.positionReceived ?? detail?.['Posición recibida'] ?? detail?.updateTime;
    let positionTimestamp = new Date().toISOString();
    if (positionTimestampRaw) {
      const parsed = new Date(positionTimestampRaw);
      positionTimestamp = Number.isNaN(parsed.getTime())
        ? positionTimestampRaw
        : parsed.toISOString();
    }

    // Función helper para normalizar valores
    const normalizeValue = (value: any): string | null => {
      if (value === null || value === undefined || value === '') {
        return null;
      }
      const str = String(value).trim();
      return str === '' ? null : str;
    };

    // Extraer todos los campos
    const imo = normalizeValue(detail?.imo);
    const mmsi = normalizeValue(detail?.mmsi);
    const name = normalizeValue(detail?.name);
    const speedValue = detail?.speed ?? detail?.Velocidad;
    const speed = speedValue !== undefined && speedValue !== null && speedValue !== '' 
      ? Number(speedValue) 
      : null;
    const courseValue = detail?.course ?? detail?.Rumbo;
    const course = courseValue !== undefined && courseValue !== null && courseValue !== '' 
      ? Number(courseValue) 
      : null;
    const destination = normalizeValue(detail?.destination ?? detail?.Destino);
    const navigationalStatus = normalizeValue(detail?.navigationalStatus);
    const shipType = normalizeValue(detail?.shipType);
    const country = normalizeValue(detail?.country);
    const countryIso = normalizeValue(detail?.countryIso);
    const etaUtc = normalizeValue(detail?.etaUtc);
    const atdUtc = normalizeValue(detail?.atdUtc);
    const lastPort = normalizeValue(detail?.lastPort);
    const unlocodeLastport = normalizeValue(detail?.unlocode_lastport);
    const unlocodeDestination = normalizeValue(detail?.unlocode_destination ?? detail?.unlocode_destination);
    const distance = normalizeValue(detail?.distance);
    const updateTime = normalizeValue(detail?.updateTime);
    const dataSource = normalizeValue(detail?.dataSource);
    const eni = normalizeValue(detail?.eni);
    const predictedEta = normalizeValue(detail?.predictedEta);
    const currentDraught = normalizeValue(detail?.currentDraught ?? detail?.draught);
    const length = normalizeValue(detail?.length);
    const beam = normalizeValue(detail?.beam);
    const grossTonnage = normalizeValue(detail?.grossTonnage);
    const yearOfBuilt = normalizeValue(detail?.yearOfBuilt);
    const callsign = normalizeValue(detail?.callsign);
    const typeSpecific = normalizeValue(detail?.typeSpecific);
    const deadweight = normalizeValue(detail?.deadweight);
    const hull = normalizeValue(detail?.hull);
    const builder = normalizeValue(detail?.builder);
    const material = normalizeValue(detail?.material);
    const placeOfBuild = normalizeValue(detail?.placeOfBuild);
    const ballastWater = normalizeValue(detail?.ballastWater);
    const crudeOil = normalizeValue(detail?.crudeOil);
    const freshWater = normalizeValue(detail?.freshWater);
    const gas = normalizeValue(detail?.gas);
    const grain = normalizeValue(detail?.grain);
    const bale = normalizeValue(detail?.bale);
    const timeRemaining = normalizeValue(detail?.time);
    const teu = normalizeValue(detail?.teu);
    const engine = detail?.engine ?? null;
    const ports = detail?.ports ?? null;
    const management = detail?.management ?? null;
    const vesselImage = normalizeValue(detail?.image ?? detail?.Image);

    const now = new Date().toISOString();

    // Verificar si existe en vessel_positions
    const { data: existing, error: existingError } = await supabase
      .from('vessel_positions')
      .select('id')
      .eq('vessel_name', vessel_name)
      .single();

    const updateData: any = {
      vessel_name,
      imo,
      mmsi,
      name,
      last_lat: lat,
      last_lon: lon,
      last_position_at: positionTimestamp,
      last_api_call_at: now,
      raw_payload: data,
      speed,
      course,
      destination,
      navigational_status: navigationalStatus,
      ship_type: shipType,
      country,
      country_iso: countryIso,
      eta_utc: etaUtc,
      atd_utc: atdUtc,
      last_port: lastPort,
      unlocode_lastport: unlocodeLastport,
      unlocode_destination: unlocodeDestination,
      distance,
      update_time: updateTime,
      data_source: dataSource,
      eni,
      predicted_eta: predictedEta,
      current_draught: currentDraught,
      length,
      beam,
      gross_tonnage: grossTonnage,
      year_of_built: yearOfBuilt,
      callsign,
      type_specific: typeSpecific,
      deadweight,
      hull,
      builder,
      material,
      place_of_build: placeOfBuild,
      ballast_water: ballastWater,
      crude_oil: crudeOil,
      fresh_water: freshWater,
      gas,
      grain,
      bale,
      time_remaining: timeRemaining,
      teu,
      engine: engine ? JSON.stringify(engine) : null,
      ports: ports ? JSON.stringify(ports) : null,
      management: management ? JSON.stringify(management) : null,
      vessel_image: vesselImage,
      updated_at: now,
    };

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('[UpdateManual] Error verificando existencia:', existingError);
      return NextResponse.json(
        { error: 'Error verificando buque existente' },
        { status: 500 },
      );
    }

    let result;
    if (existing) {
      // Actualizar registro existente
      const { data: updated, error: updateError } = await supabase
        .from('vessel_positions')
        .update(updateData)
        .eq('id', existing.id)
        .select()
        .single();

      if (updateError) {
        console.error('[UpdateManual] Error actualizando:', updateError);
        return NextResponse.json(
          { error: 'Error al actualizar vessel_positions', details: updateError.message },
          { status: 500 },
        );
      }

      result = updated;
    } else {
      // Insertar nuevo registro
      const { data: inserted, error: insertError } = await supabase
        .from('vessel_positions')
        .insert(updateData)
        .select()
        .single();

      if (insertError) {
        console.error('[UpdateManual] Error insertando:', insertError);
        return NextResponse.json(
          { error: 'Error al insertar vessel_positions', details: insertError.message },
          { status: 500 },
        );
      }

      result = inserted;
    }

    // También insertar en el historial
    const { error: historyError } = await supabase.from('vessel_position_history').insert({
      vessel_name,
      imo,
      mmsi,
      name,
      lat,
      lon,
      position_at: positionTimestamp,
      source: 'AIS',
      speed,
      course,
      destination,
      navigational_status: navigationalStatus,
      ship_type: shipType,
      country,
      country_iso: countryIso,
      eta_utc: etaUtc,
      atd_utc: atdUtc,
      last_port: lastPort,
      unlocode_lastport: unlocodeLastport,
      unlocode_destination: unlocodeDestination,
      distance,
      predicted_eta: predictedEta,
      current_draught: currentDraught,
      length,
      beam,
      gross_tonnage: grossTonnage,
      year_of_built: yearOfBuilt,
      callsign,
      type_specific: typeSpecific,
      deadweight,
      hull,
      builder,
      material,
      place_of_build: placeOfBuild,
      ballast_water: ballastWater,
      crude_oil: crudeOil,
      fresh_water: freshWater,
      gas,
      grain,
      bale,
      time_remaining: timeRemaining,
      teu,
      engine: engine ? JSON.stringify(engine) : null,
      ports: ports ? JSON.stringify(ports) : null,
      management: management ? JSON.stringify(management) : null,
      vessel_image: vesselImage,
      update_time: updateTime,
      data_source: dataSource,
      eni,
      raw_payload: data,
    });

    if (historyError) {
      console.error('[UpdateManual] Error insertando en historial:', historyError);
      // No fallar si el historial falla, pero loguear el error
    }

    return NextResponse.json({
      message: 'Posición actualizada correctamente',
      vessel_name,
      updated: {
        lat: result.last_lat,
        lon: result.last_lon,
        position_at: result.last_position_at,
        vessel_image: result.vessel_image,
      },
      history_inserted: !historyError,
    });
  } catch (error) {
    console.error('[UpdateManual] Error inesperado:', error);
    return NextResponse.json(
      { error: 'Error interno actualizando posición', details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

