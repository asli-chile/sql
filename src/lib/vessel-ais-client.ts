/**
 * Cliente AIS usando aisstream.io (WebSocket - GRATUITO)
 * 
 * IMPORTANTE: aisstream.io es un servicio WebSocket que actualiza la base de datos
 * en tiempo real. Esta función lee desde la base de datos, no hace llamadas REST.
 */

import { createClient } from '@/lib/supabase-server';

type FetchVesselPositionInput = {
  vesselName: string;
  imo?: string | null;
  mmsi?: string | null;
};

export type FetchVesselPositionResult = {
  lat: number;
  lon: number;
  positionTimestamp: string;
  rawPayload: unknown;
  // Identificadores del buque (extraídos del payload)
  vesselName?: string | null;
  imo?: string | null;
  mmsi?: string | null;
  // Campos adicionales extraídos del payload
  speed?: number | null;
  course?: number | null;
  destination?: string | null;
  navigationalStatus?: string | null;
  shipType?: string | null;
  country?: string | null;
  countryIso?: string | null;
  etaUtc?: string | null;
  atdUtc?: string | null;
  lastPort?: string | null;
  unlocodeLastport?: string | null;
  unlocodeDestination?: string | null;
  updateTime?: string | null;
  dataSource?: string | null;
  eni?: string | null;
  name?: string | null;
  distance?: string | null;
  predictedEta?: string | null;
  currentDraught?: string | null;
  length?: string | null;
  beam?: string | null;
  grossTonnage?: string | null;
  yearOfBuilt?: string | null;
  callsign?: string | null;
  typeSpecific?: string | null;
  // Campos adicionales del JSON completo
  deadweight?: string | null;
  hull?: string | null;
  builder?: string | null;
  material?: string | null;
  placeOfBuild?: string | null;
  ballastWater?: string | null;
  crudeOil?: string | null;
  freshWater?: string | null;
  gas?: string | null;
  grain?: string | null;
  bale?: string | null;
  timeRemaining?: string | null;
  teu?: string | null;
  // Objetos complejos guardados como JSON
  engine?: unknown;
  ports?: unknown;
  management?: unknown;
  // Imagen del buque
  vesselImage?: string | null;
};

/**
 * Obtiene la posición de un buque desde la base de datos
 * (actualizada en tiempo real por el servicio WebSocket de aisstream.io)
 */
export const fetchVesselPositionFromAisApi = async (
  params: FetchVesselPositionInput,
): Promise<FetchVesselPositionResult | null> => {
  const AISSTREAM_API_KEY = process.env.AISSTREAM_API_KEY;

  if (!AISSTREAM_API_KEY) {
    console.error(
      '[AIS] ❌ AISSTREAM_API_KEY no está definida. ' +
        'El servicio WebSocket de aisstream.io no puede iniciarse.',
    );
    return null;
  }

  // Para proteger las consultas, SOLO buscamos si tenemos IMO o MMSI configurado
  const identifier = params.mmsi || params.imo;

  if (!identifier) {
    console.warn(
      '[AIS] No se puede buscar posición porque no hay IMO ni MMSI configurado para este buque.',
    );
    return null;
  }

  console.log('[AIS] Buscando posición en base de datos para', params.vesselName, ':', {
    identifier,
    provider: 'aisstream.io (WebSocket)',
  });

  try {
    const supabase = await createClient();

    // Buscar por MMSI primero (más común), luego por IMO
    const { data: position, error } = await supabase
      .from('vessel_positions')
      .select('*')
      .or(`mmsi.eq.${identifier},imo.eq.${identifier}`)
      .maybeSingle();

    if (error) {
      console.error('[AIS] Error consultando base de datos:', error);
      return null;
    }

    if (!position || !position.last_lat || !position.last_lon) {
      console.warn(
        '[AIS] No se encontró posición en la base de datos para',
        params.vesselName,
        '. El servicio WebSocket puede no haber recibido datos aún.',
      );
      return null;
    }

    // Construir resultado desde la base de datos
    const result: FetchVesselPositionResult = {
      lat: position.last_lat,
      lon: position.last_lon,
      positionTimestamp: position.last_position_at || new Date().toISOString(),
      rawPayload: position.raw_payload || {},
      vesselName: position.vessel_name,
      imo: position.imo,
      mmsi: position.mmsi,
      speed: position.speed,
      course: position.course,
      destination: position.destination,
      navigationalStatus: position.navigational_status,
      shipType: position.ship_type,
      country: position.country,
      countryIso: position.country_iso,
      etaUtc: position.eta_utc,
      atdUtc: position.atd_utc,
      lastPort: position.last_port,
      unlocodeLastport: position.unlocode_lastport,
      unlocodeDestination: position.unlocode_destination,
      updateTime: position.update_time,
      dataSource: position.data_source || 'AISStream',
      eni: position.eni,
      name: position.name,
      distance: position.distance,
      predictedEta: position.predicted_eta,
      currentDraught: position.current_draught,
      length: position.length,
      beam: position.beam,
      grossTonnage: position.gross_tonnage,
      yearOfBuilt: position.year_of_built,
      callsign: position.callsign,
      typeSpecific: position.type_specific,
      deadweight: position.deadweight,
      hull: position.hull,
      builder: position.builder,
      material: position.material,
      placeOfBuild: position.place_of_build,
      ballastWater: position.ballast_water,
      crudeOil: position.crude_oil,
      freshWater: position.fresh_water,
      gas: position.gas,
      grain: position.grain,
      bale: position.bale,
      timeRemaining: position.time_remaining,
      teu: position.teu,
      engine: (position.raw_payload as any)?.engine || null,
      ports: (position.raw_payload as any)?.ports || null,
      management: (position.raw_payload as any)?.management || null,
      vesselImage: position.vessel_image,
    };

    console.log('[AIS] ✅ Posición encontrada en base de datos para', params.vesselName, {
      lat: result.lat,
      lon: result.lon,
      timestamp: result.positionTimestamp,
      lastUpdate: position.last_api_call_at,
    });

    return result;
  } catch (error) {
    console.error('[AIS] ❌ Error consultando base de datos:', {
      error: error instanceof Error ? error.message : String(error),
      vesselName: params.vesselName,
      identifier,
    });
    return null;
  }
};
