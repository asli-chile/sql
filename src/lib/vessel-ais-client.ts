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
  imo?: string | null;
  mmsi?: string | null;
  // Campos adicionales extraídos del payload
  speed?: number | null;
  course?: number | null;
  destination?: string | null;
  navigationalStatus?: string | null;
  shipType?: string | null;
  country?: string | null;
  etaUtc?: string | null;
  atdUtc?: string | null;
  lastPort?: string | null;
  unlocodeLastport?: string | null;
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
};

const VESSEL_API_BASE_URL = process.env.VESSEL_API_BASE_URL;
const VESSEL_API_KEY = process.env.VESSEL_API_KEY;

/**
 * Punto único para integrar la API AIS real (DataDocked, MarineTraffic, JSONCargo, etc.).
 *
 * IMPORTANTE:
 * - Ajusta la URL, headers, query params y parsing de respuesta según el proveedor real.
 * - Mantén esta función como única responsable de hablar con la API externa.
 */
export const fetchVesselPositionFromAisApi = async (
  params: FetchVesselPositionInput,
): Promise<FetchVesselPositionResult | null> => {
  if (!VESSEL_API_BASE_URL || !VESSEL_API_KEY) {
    console.warn(
      '[AIS] Variables de entorno VESSEL_API_BASE_URL y/o VESSEL_API_KEY no están definidas. ' +
        'No se hará llamada externa a la API AIS.',
    );
    return null;
  }

  // Para DataDocked el endpoint de información completa es:
  // GET https://datadocked.com/api/vessels_operations/get-vessel-info?imo_or_mmsi=9870666
  // con header: { accept: 'application/json', api_key: '...' }
  // NOTA: Este endpoint consume 5 créditos por uso (vs 1 crédito del endpoint anterior)
  //
  // Para proteger los créditos, SOLO llamamos si tenemos IMO o MMSI configurado.
  const identifier = params.mmsi || params.imo;

  if (!identifier) {
    console.warn(
      '[AIS] No se llamó a DataDocked porque no hay IMO ni MMSI configurado para este buque.',
    );
    return null;
  }
  const url = `${VESSEL_API_BASE_URL.replace(/\/$/, '')}/vessels_operations/get-vessel-info?imo_or_mmsi=${encodeURIComponent(
    identifier,
  )}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        // DataDocked espera la API key en el header `api_key`
        api_key: VESSEL_API_KEY,
      },
      // Los endpoints de Next API se ejecutan en Node, por lo que no es necesario modo `next: { revalidate }` aquí.
    });

    if (!response.ok) {
      console.error('[AIS] Error en respuesta de API AIS:', response.status, await response.text());
      return null;
    }

    const rawPayload = await response.json();

    /**
     * DataDocked devuelve un objeto con una propiedad `detail`:
     * 
     * NOTA: La API puede devolver campos en inglés o español según la configuración.
     * Campos en inglés: latitude, longitude, speed, course, destination, positionReceived, updateTime, etaUtc, atdUtc
     * Campos en español: Latitud, Longitud, Velocidad, Rumbo, Destino, Posición recibida, etc.
     *
     * {
     *   "detail": {
     *     "latitude": "38.21558" o "Latitud": "-35.65407",
     *     "longitude": "15.24491" o "Longitud": "-92.66505",
     *     "speed": "0.0" o "Velocidad": "4.2",
     *     "course": "307.0" o "Rumbo": "228.2",
     *     "destination": "ITMLZ" o "Destino": "CNHKG",
     *     "positionReceived": "Oct 02, 2025 08:27 UTC" o "Posición recibida": "16 de noviembre de 2025, 20:04 UTC",
     *     "updateTime": "Oct 02, 2025 08:30 UTC",
     *     "etaUtc": "Oct 01, 2025 10:15 UTC" o "etaUtc": "6 de diciembre de 2025, 15:30 UTC",
     *     "atdUtc": "Sep 30, 2025 18:25 UTC" o "atdUtc": "14 de noviembre de 2025, 10:00 UTC",
     *     ...
     *   }
     * }
     */
    const candidate = (rawPayload as any)?.detail ?? rawPayload;

    // Manejar campos en inglés o español
    const lat = Number(candidate?.latitude ?? candidate?.Latitud);
    const lon = Number(candidate?.longitude ?? candidate?.Longitud);

    // Usamos primero `positionReceived`/`Posición recibida`, luego `updateTime` como timestamp.
    const positionTimestampRaw: string | undefined =
      candidate?.positionReceived ?? candidate?.['Posición recibida'] ?? candidate?.updateTime;

    // Normalizar a ISO si es posible, si no, guardar el string tal cual.
    let positionTimestamp = new Date().toISOString();
    if (positionTimestampRaw) {
      const parsed = new Date(positionTimestampRaw);
      positionTimestamp = Number.isNaN(parsed.getTime())
        ? positionTimestampRaw
        : parsed.toISOString();
    }

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      console.warn(
        '[AIS] La respuesta de la API AIS no contiene coordenadas válidas para el buque:',
        params.vesselName,
      );
      return null;
    }

    // Extraer identificadores del buque (IMO y MMSI)
    const imo = candidate?.imo ?? null;
    const mmsi = candidate?.mmsi ?? null;

    // Extraer campos adicionales (manejar inglés y español)
    // Función helper para normalizar valores (convertir strings vacíos a null)
    const normalizeValue = (value: any): string | null => {
      if (value === null || value === undefined || value === '') {
        return null;
      }
      const str = String(value).trim();
      return str === '' ? null : str;
    };

    const speedValue = candidate?.speed ?? candidate?.Velocidad;
    const speed = speedValue !== undefined && speedValue !== null && speedValue !== '' 
      ? Number(speedValue) 
      : null;

    const courseValue = candidate?.course ?? candidate?.Rumbo;
    const course = courseValue !== undefined && courseValue !== null && courseValue !== '' 
      ? Number(courseValue) 
      : null;

    const destination = normalizeValue(candidate?.destination ?? candidate?.Destino);
    const navigationalStatus = normalizeValue(candidate?.navigationalStatus);
    const shipType = normalizeValue(candidate?.shipType);
    const country = normalizeValue(candidate?.country);
    const etaUtc = normalizeValue(candidate?.etaUtc);
    const atdUtc = normalizeValue(candidate?.atdUtc);
    const lastPort = normalizeValue(candidate?.lastPort);
    const unlocodeLastport = normalizeValue(candidate?.unlocode_lastport);
    const distance = normalizeValue(candidate?.distance);
    const predictedEta = normalizeValue(candidate?.predictedEta);
    const currentDraught = normalizeValue(candidate?.currentDraught ?? candidate?.draught);
    const length = normalizeValue(candidate?.length);
    const beam = normalizeValue(candidate?.beam);
    const grossTonnage = normalizeValue(candidate?.grossTonnage);
    const yearOfBuilt = normalizeValue(candidate?.yearOfBuilt);
    const callsign = normalizeValue(candidate?.callsign);
    const typeSpecific = normalizeValue(candidate?.typeSpecific);
    
    // Campos adicionales (manejar español e inglés)
    const deadweight = normalizeValue(candidate?.deadweight ?? candidate?.['Peso muerto']);
    const hull = normalizeValue(candidate?.hull ?? candidate?.Casco);
    const builder = normalizeValue(candidate?.builder ?? candidate?.Astillero);
    const material = normalizeValue(candidate?.material ?? candidate?.Material);
    const placeOfBuild = normalizeValue(candidate?.placeOfBuild ?? candidate?.['Lugar de construcción']);
    const ballastWater = normalizeValue(candidate?.ballastWater ?? candidate?.['Agua de lastre']);
    const crudeOil = normalizeValue(candidate?.crudeOil ?? candidate?.['Petróleo crudo']);
    const freshWater = normalizeValue(candidate?.freshWater ?? candidate?.['Agua dulce']);
    const gas = normalizeValue(candidate?.gas ?? candidate?.Gas);
    const grain = normalizeValue(candidate?.grain ?? candidate?.Grano);
    const bale = normalizeValue(candidate?.bale ?? candidate?.Fardos);
    const timeRemaining = normalizeValue(candidate?.time);
    const teu = normalizeValue(candidate?.teu);
    
    // Objetos complejos (guardar como JSON)
    const engine = candidate?.engine ?? null;
    const ports = candidate?.ports ?? null;
    const management = candidate?.management ?? candidate?.gestión ?? null;

    // Log para debugging (solo en desarrollo)
    if (process.env.NODE_ENV === 'development') {
      console.log('[AIS] Datos extraídos para', params.vesselName, {
        speed,
        course,
        destination,
        lastPort,
        distance,
        navigationalStatus,
        shipType,
        country,
        deadweight,
        builder,
        placeOfBuild,
      });
    }

    return {
      lat,
      lon,
      positionTimestamp,
      rawPayload,
      // Guardar IMO y MMSI de la respuesta para futuras búsquedas
      imo: imo ? String(imo) : null,
      mmsi: mmsi ? String(mmsi) : null,
      speed: Number.isFinite(speed) ? speed : null,
      course: Number.isFinite(course) ? course : null,
      destination,
      navigationalStatus,
      shipType,
      country,
      etaUtc,
      atdUtc,
      lastPort,
      unlocodeLastport,
      distance,
      predictedEta,
      currentDraught,
      length,
      beam,
      grossTonnage,
      yearOfBuilt,
      callsign,
      typeSpecific,
      deadweight,
      hull,
      builder,
      material,
      placeOfBuild,
      ballastWater,
      crudeOil,
      freshWater,
      gas,
      grain,
      bale,
      timeRemaining,
      teu,
      engine,
      ports,
      management,
    };
  } catch (error) {
    console.error('[AIS] Error llamando a la API AIS externa:', error);
    return null;
  }
};


