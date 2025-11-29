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
 * Punto único para integrar la API AIS real (DataDocked, MarineTraffic, JSONCargo, etc.).
 *
 * IMPORTANTE:
 * - Ajusta la URL, headers, query params y parsing de respuesta según el proveedor real.
 * - Mantén esta función como única responsable de hablar con la API externa.
 */
export const fetchVesselPositionFromAisApi = async (
  params: FetchVesselPositionInput,
): Promise<FetchVesselPositionResult | null> => {
  // Leer variables de entorno dentro de la función para asegurar que estén disponibles
  const VESSEL_API_BASE_URL = process.env.VESSEL_API_BASE_URL;
  const VESSEL_API_KEY = process.env.VESSEL_API_KEY;

  // Log detallado para debugging (siempre, no solo en desarrollo)
  console.log('[AIS] Verificando variables de entorno para', params.vesselName, ':', {
    hasBaseUrl: !!VESSEL_API_BASE_URL,
    hasApiKey: !!VESSEL_API_KEY,
    baseUrl: VESSEL_API_BASE_URL || 'NO DEFINIDA',
    baseUrlLength: VESSEL_API_BASE_URL?.length || 0,
    apiKeyLength: VESSEL_API_KEY?.length || 0,
    nodeEnv: process.env.NODE_ENV,
    todasLasEnvKeys: Object.keys(process.env).filter(k => k.includes('VESSEL') || k.includes('API')).join(', '),
  });

  if (!VESSEL_API_BASE_URL || !VESSEL_API_KEY) {
    console.error(
      '[AIS] ❌ Variables de entorno VESSEL_API_BASE_URL y/o VESSEL_API_KEY no están definidas. ' +
        'No se hará llamada externa a la API AIS.',
      {
        VESSEL_API_BASE_URL: VESSEL_API_BASE_URL ? `Definida (${VESSEL_API_BASE_URL.length} chars)` : 'NO DEFINIDA',
        VESSEL_API_KEY: VESSEL_API_KEY ? `Definida (${VESSEL_API_KEY.length} chars)` : 'NO DEFINIDA',
        todasLasEnvKeys: Object.keys(process.env).filter(k => k.includes('VESSEL') || k.includes('API')),
      },
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

  console.log('[AIS] ✅ Haciendo llamada a API AIS:', {
    vesselName: params.vesselName,
    identifier,
    url: url.substring(0, 80) + '...',
    hasApiKey: !!VESSEL_API_KEY,
    apiKeyLength: VESSEL_API_KEY?.length || 0,
  });

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

    console.log('[AIS] Respuesta recibida:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries()),
    });

    if (!response.ok) {
      console.error('[AIS] Error en respuesta de API AIS:', response.status, await response.text());
      return null;
    }

    const rawPayload = await response.json();

    /**
     * DataDocked devuelve un objeto con una propiedad `detail`:
     * 
     * Formato de respuesta:
     * {
     *   "detail": {
     *     "name": "LAURANA",
     *     "mmsi": "247342000",
     *     "imo": "9011014",
     *     "country": "Italy",
     *     "shipType": "Miscellaneous",
     *     "callsign": "ICEL",
     *     "image": "https://static.vesselfinder.net/ship-photo/9011014-247342000-672d4d9a1223ae7b65c7d90997ca8641/1?v1",
     *     "latitude": "38.21558",
     *     "longitude": "15.24491",
     *     "speed": "0.0",
     *     "course": "307.0",
     *     "destination": "ITMLZ",
     *     "positionReceived": "Oct 02, 2025 08:27 UTC",
     *     "updateTime": "Oct 02, 2025 08:30 UTC",
     *     "etaUtc": "Oct 01, 2025 10:15 UTC",
     *     "atdUtc": "Sep 30, 2025 18:25 UTC",
     *     "lastPort": "Napoli, Italy",
     *     "unlocode_lastport": "ITNAP",
     *     "distance": "88.49 kn",
     *     "predictedEta": "Oct 7, 16:28",
     *     "length": "122 m",
     *     "beam": "20 m",
     *     "currentDraught": "4.8 m",
     *     "deadweight": "2328",
     *     "grossTonnage": "11193",
     *     "yearOfBuilt": "1992",
     *     "hull": "SINGLE HULL",
     *     "builder": "FINCANTIERI PALERMO",
     *     "material": "STEEL/ORDINARY",
     *     "placeOfBuild": "PALERMO, Italy",
     *     "ballastWater": "0",
     *     "crudeOil": "0",
     *     "freshWater": "0",
     *     "gas": "0 m³",
     *     "grain": "0 m³",
     *     "bale": "0 m³",
     *     "typeSpecific": "Passenger/Ro-Ro Cargo Ship",
     *     "navigationalStatus": "Moored",
     *     "teu": "",
     *     "time": "3 hours 59 minutes",
     *     "engine": { ... },
     *     "ports": [ ... ],
     *     "management": { ... },
     *     "dataSource": "Satellite"
     *   }
     * }
     * 
     * Ver documentación completa: docs/FORMATO-RESPUESTA-DATADOCKED.md
     */
    const candidate = (rawPayload as any)?.detail ?? rawPayload;

    // Manejar campos en inglés o español
    // IMPORTANTE: DataDocked puede devolver las coordenadas como strings o números
    let lat: number | null = null;
    let lon: number | null = null;
    
    // Intentar múltiples ubicaciones posibles para latitude/longitude
    const latCandidate = candidate?.latitude ?? candidate?.Latitud ?? candidate?.lat ?? candidate?.Lat;
    const lonCandidate = candidate?.longitude ?? candidate?.Longitud ?? candidate?.lon ?? candidate?.Lon;
    
    if (latCandidate !== null && latCandidate !== undefined && latCandidate !== '') {
      const latNum = Number(latCandidate);
      if (Number.isFinite(latNum)) {
        lat = latNum;
      }
    }
    
    if (lonCandidate !== null && lonCandidate !== undefined && lonCandidate !== '') {
      const lonNum = Number(lonCandidate);
      if (Number.isFinite(lonNum)) {
        lon = lonNum;
      }
    }

    // Log detallado para debugging de coordenadas
    console.log('[AIS] Extracción de coordenadas para', params.vesselName, ':', {
      tieneDetail: !!candidate,
      latCandidate,
      lonCandidate,
      latExtraida: lat,
      lonExtraida: lon,
      keysEnCandidate: candidate ? Object.keys(candidate).filter(k => 
        k.toLowerCase().includes('lat') || k.toLowerCase().includes('lon') || 
        k.toLowerCase().includes('position') || k.toLowerCase().includes('coord')
      ) : [],
      rawPayloadKeys: rawPayload && typeof rawPayload === 'object' ? Object.keys(rawPayload) : [],
    });

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

    if (lat === null || lon === null || !Number.isFinite(lat) || !Number.isFinite(lon)) {
      console.warn(
        '[AIS] La respuesta de la API AIS no contiene coordenadas válidas para el buque:',
        params.vesselName,
        {
          lat,
          lon,
          latCandidate,
          lonCandidate,
          tieneRawPayload: !!rawPayload,
          rawPayloadSample: rawPayload && typeof rawPayload === 'object' 
            ? JSON.stringify(rawPayload).substring(0, 200) 
            : 'N/A',
        },
      );
      return null;
    }

    // Extraer identificadores del buque (IMO y MMSI)
    const imo = candidate?.imo ?? null;
    const mmsi = candidate?.mmsi ?? null;

    // Extraer campos adicionales (manejar inglés y español)
    // Función helper para normalizar valores (convertir strings vacíos a null)
    // IMPORTANTE: Para URLs (como vessel_image), solo hacemos trim, NO modificamos la URL
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
    const countryIso = normalizeValue(candidate?.countryIso);
    const etaUtc = normalizeValue(candidate?.etaUtc);
    const atdUtc = normalizeValue(candidate?.atdUtc);
    const lastPort = normalizeValue(candidate?.lastPort);
    const unlocodeLastport = normalizeValue(candidate?.unlocode_lastport);
    const unlocodeDestination = normalizeValue(candidate?.unlocode_destination);
    const distance = normalizeValue(candidate?.distance);
    const updateTime = normalizeValue(candidate?.updateTime);
    const dataSource = normalizeValue(candidate?.dataSource);
    const eni = normalizeValue(candidate?.eni);
    const name = normalizeValue(candidate?.name);
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
    
    // Extraer imagen del buque
    // DataDocked devuelve la imagen en: detail.image
    // Formato: "https://static.vesselfinder.net/ship-photo/{imo}-{mmsi}-{hash}/1?v1"
    // IMPORTANTE: candidate ya es rawPayload?.detail ?? rawPayload, así que candidate?.image debería funcionar
    // Pero intentamos múltiples variaciones por si la API cambia el formato
    const rawPayloadObj = rawPayload as any;
    
    // Intentar extraer la imagen desde múltiples ubicaciones posibles
    let imageValue = null;
    
    // Primero intentar desde candidate (que ya es detail si existe)
    if (candidate?.image) {
      imageValue = candidate.image;
    } else if (candidate?.Image) {
      imageValue = candidate.Image;
    } else if (rawPayloadObj?.detail?.image) {
      // Si candidate no tiene image, intentar directamente desde rawPayload.detail.image
      imageValue = rawPayloadObj.detail.image;
    } else if (rawPayloadObj?.detail?.Image) {
      imageValue = rawPayloadObj.detail.Image;
    } else if (rawPayloadObj?.image) {
      // Intentar desde el root del rawPayload
      imageValue = rawPayloadObj.image;
    } else if (rawPayloadObj?.Image) {
      imageValue = rawPayloadObj.Image;
    }
    
    // Normalizar la URL de la imagen (solo trim, mantener URL completa)
    const vesselImage = normalizeValue(imageValue);
    
    // Log específico para debugging de imagen (SIEMPRE mostrar, no solo en dev)
    if (vesselImage) {
      console.log('[AIS] ✅ Imagen encontrada para', params.vesselName, ':', {
        url: vesselImage,
        esUrlValida: vesselImage.startsWith('http'),
        longitud: vesselImage.length,
        origen: imageValue === candidate?.image ? 'candidate.image' :
                imageValue === rawPayloadObj?.detail?.image ? 'rawPayload.detail.image' :
                imageValue === rawPayloadObj?.image ? 'rawPayload.image' : 'otro',
      });
    } else {
      console.log('[AIS] ⚠️ No se encontró imagen para', params.vesselName, '. Buscando en:', {
        'candidate?.image': candidate?.image || 'null',
        'rawPayloadObj?.detail?.image': rawPayloadObj?.detail?.image || 'null',
        'rawPayloadObj?.image': rawPayloadObj?.image || 'null',
        'keys en candidate': candidate ? Object.keys(candidate).filter(k => k.toLowerCase().includes('image') || k.toLowerCase().includes('photo')) : [],
        'tieneDetail': !!rawPayloadObj?.detail,
        'tieneRawPayload': !!rawPayloadObj,
      });
    }

    // Log para debugging (mostrar campos críticos que podrían faltar)
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
        countryIso,
        deadweight,
        builder,
        placeOfBuild,
        vesselImage: vesselImage ? '✅ Imagen presente' : '❌ Sin imagen',
        hasEngine: !!engine,
        hasPorts: !!ports,
        hasManagement: !!management,
        updateTime,
        dataSource,
        eni,
        name,
      });
      
      // Log completo del JSON recibido para debugging (solo mostrar estructura, no todo el contenido)
      console.log('[AIS] Campos disponibles en candidate:', Object.keys(candidate || {}));
      console.log('[AIS] raw_payload completo guardado:', !!rawPayload);
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
      countryIso,
      etaUtc,
      atdUtc,
      lastPort,
      unlocodeLastport,
      unlocodeDestination,
      distance,
      updateTime,
      dataSource,
      eni,
      name,
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
      vesselImage,
    };
  } catch (error) {
    console.error('[AIS] ❌ Error llamando a la API AIS externa:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      vesselName: params.vesselName,
      identifier,
      url: url.substring(0, 100),
    });
    return null;
  }
};


