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

  // Para DataDocked el endpoint de posición es:
  // GET https://datadocked.com/api/vessels_operations/get-vessel-location?imo_or_mmsi=9870666
  // con header: { accept: 'application/json', api_key: '...' }
  //
  // Para proteger los créditos, SOLO llamamos si tenemos IMO o MMSI configurado.
  const identifier = params.mmsi || params.imo;

  if (!identifier) {
    console.warn(
      '[AIS] No se llamó a DataDocked porque no hay IMO ni MMSI configurado para este buque.',
    );
    return null;
  }
  const url = `${VESSEL_API_BASE_URL.replace(/\/$/, '')}/vessels_operations/get-vessel-location?imo_or_mmsi=${encodeURIComponent(
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
     * {
     *   "detail": {
     *     "latitude": "53.47305",
     *     "longitude": "8.49434",
     *     "positionReceived": "Nov 16, 2025 03:20 UTC",
     *     "updateTime": "Nov 16, 2025 03:21 UTC",
     *     ...
     *   }
     * }
     */
    const candidate = (rawPayload as any)?.detail ?? rawPayload;

    const lat = Number(candidate?.latitude);
    const lon = Number(candidate?.longitude);

    // Usamos primero `positionReceived`, luego `updateTime` como timestamp.
    const positionTimestampRaw: string | undefined =
      candidate?.positionReceived ?? candidate?.updateTime;

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

    return {
      lat,
      lon,
      positionTimestamp,
      rawPayload,
    };
  } catch (error) {
    console.error('[AIS] Error llamando a la API AIS externa:', error);
    return null;
  }
};


