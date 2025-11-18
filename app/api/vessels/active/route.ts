import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import type { ActiveVessel, VesselTrackPoint } from '@/types/vessels';

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

const parseContainers = (raw: unknown): string[] => {
  if (Array.isArray(raw)) {
    return raw
      .map((item) => (item == null ? '' : String(item)))
      .flatMap((chunk) => chunk.split(/\s+/))
      .map((value) => value.trim())
      .filter(Boolean);
  }

  if (typeof raw === 'string') {
    try {
      const maybeArray = JSON.parse(raw);
      if (Array.isArray(maybeArray)) {
        return maybeArray
          .map((item) => (item == null ? '' : String(item)))
          .flatMap((chunk) => chunk.split(/\s+/))
          .map((value) => value.trim())
          .filter(Boolean);
      }
    } catch {
      // Si no es JSON, continuamos con el string plano.
    }

    return raw
      .split(/\s+/)
      .map((value) => value.trim())
      .filter(Boolean);
  }

  if (raw == null) {
    return [];
  }

  return String(raw)
    .split(/\s+/)
    .map((value) => value.trim())
    .filter(Boolean);
};

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const nowIso = new Date().toISOString();

    // 1) Traer todos los registros de embarques "activos"
    const { data: registros, error: registrosError } = await supabase
      .from('registros')
      .select('nave_inicial, booking, contenedor, etd, eta, pod')
      .is('deleted_at', null)
      .neq('estado', 'CANCELADO')
      .or(`eta.is.null,eta.gt.${nowIso}`);

    if (registrosError) {
      console.error('[ActiveVessels] Error consultando registros activos:', registrosError);
      return NextResponse.json(
        { error: 'Error consultando registros activos' },
        { status: 500 },
      );
    }

    type RegistroRow = {
      nave_inicial: string | null;
      booking: string | null;
      contenedor: unknown;
    etd: string | null;
      eta: string | null;
      pod: string | null;
    };

    const byVessel = new Map<
      string,
      {
        vessel_name: string;
        etdCandidates: string[];
        etaCandidates: string[];
        destinations: Set<string>;
        bookings: Set<string>;
        containers: Set<string>;
      }
    >();

    (registros || []).forEach((row: RegistroRow) => {
      const vesselName = parseVesselName(row.nave_inicial);
      if (!vesselName) {
        return;
      }

      let group = byVessel.get(vesselName);
      if (!group) {
        group = {
          vessel_name: vesselName,
          etdCandidates: [],
          etaCandidates: [],
          destinations: new Set<string>(),
          bookings: new Set<string>(),
          containers: new Set<string>(),
        };
        byVessel.set(vesselName, group);
      }

      if (row.etd) {
        group.etdCandidates.push(row.etd);
      }

      if (row.eta) {
        group.etaCandidates.push(row.eta);
      }

      if (row.pod) {
        const destination = row.pod.trim();
        if (destination) {
          group.destinations.add(destination);
        }
      }

      if (row.booking) {
        const booking = row.booking.trim();
        if (booking && booking !== '-') {
          group.bookings.add(booking);
        }
      }

      const containers = parseContainers(row.contenedor);
      containers.forEach((cont) => {
        if (cont && cont !== '-') {
          group!.containers.add(cont);
        }
      });
    });

    const vesselNames = Array.from(byVessel.keys());

    if (vesselNames.length === 0) {
      return NextResponse.json<ActiveVessel[] | { vessels: ActiveVessel[] }>(
        { vessels: [] },
        { status: 200 },
      );
    }

    // 2) Leer posiciones cacheadas desde vessel_positions
    const { data: positions, error: positionsError } = await supabase
      .from('vessel_positions')
      .select('vessel_name, last_lat, last_lon, last_position_at, last_api_call_at')
      .in('vessel_name', vesselNames);

    if (positionsError) {
      console.error('[ActiveVessels] Error leyendo vessel_positions:', positionsError);
      return NextResponse.json(
        { error: 'Error leyendo posiciones de buques' },
        { status: 500 },
      );
    }

    const positionByName = new Map<
      string,
      { last_lat: number | null; last_lon: number | null; last_position_at: string | null; last_api_call_at: string | null }
    >();

    (positions || []).forEach((row: any) => {
      positionByName.set(row.vessel_name, {
        last_lat: row.last_lat ?? null,
        last_lon: row.last_lon ?? null,
        last_position_at: row.last_position_at ?? null,
        last_api_call_at: row.last_api_call_at ?? null,
      });
    });

    // 3) Leer historial de posiciones para poder dibujar la ruta.
    //    Traemos todos los puntos para estos buques ordenados por fecha.
    //    Agregamos un timestamp para evitar cache en la consulta
    const { data: tracks, error: tracksError } = await supabase
      .from('vessel_position_history')
      .select('vessel_name, lat, lon, position_at')
      .in('vessel_name', vesselNames)
      .order('position_at', { ascending: true })
      .limit(1000); // Limitar a 1000 puntos para evitar sobrecarga

    if (tracksError) {
      console.error('[ActiveVessels] Error leyendo vessel_position_history:', tracksError);
    }

    const trackByVessel = new Map<string, VesselTrackPoint[]>();

    (tracks || []).forEach((row: any) => {
      const key = row.vessel_name as string;
      if (!trackByVessel.has(key)) {
        trackByVessel.set(key, []);
      }
      trackByVessel.get(key)!.push({
        lat: Number(row.lat),
        lon: Number(row.lon),
        position_at: row.position_at as string,
      });
    });

    const result: ActiveVessel[] = [];

    byVessel.forEach((group, vesselName) => {
      const position = positionByName.get(vesselName);
      let track = trackByVessel.get(vesselName) ?? [];

      // Asegurar que el track siempre incluya la última posición conocida del buque.
      if (position && position.last_lat != null && position.last_lon != null) {
        const latestFromHistory = track[track.length - 1];
        const latestHistoryTime = latestFromHistory
          ? new Date(latestFromHistory.position_at).getTime()
          : undefined;
        const lastPositionTime = position.last_position_at
          ? new Date(position.last_position_at).getTime()
          : undefined;

        const shouldAppendLastPosition =
          !Number.isFinite(latestHistoryTime ?? NaN) ||
          !Number.isFinite(lastPositionTime ?? NaN) ||
          (latestHistoryTime !== undefined &&
            lastPositionTime !== undefined &&
            lastPositionTime > latestHistoryTime);

        if (shouldAppendLastPosition) {
          track = [
            ...track,
            {
              lat: position.last_lat as number,
              lon: position.last_lon as number,
              position_at: position.last_position_at ?? new Date().toISOString(),
            },
          ];
        }
      }

      // Para la ETD/ETA mostramos la más cercana (orden alfabético de fecha ISO/string)
      const etd =
        group.etdCandidates.length > 0
          ? group.etdCandidates.slice().sort((a, b) => a.localeCompare(b))[0]
          : null;

      // Para la ETA mostramos la más próxima en el tiempo (mínima fecha futura)
      const eta =
        group.etaCandidates.length > 0
          ? group.etaCandidates.slice().sort((a, b) => a.localeCompare(b))[0]
          : null;

      const destination =
        group.destinations.size > 0 ? Array.from(group.destinations).join(' / ') : null;

      result.push({
        vessel_name: vesselName,
        last_lat: position?.last_lat ?? null,
        last_lon: position?.last_lon ?? null,
        last_position_at: position?.last_position_at ?? null,
        last_api_call_at: position?.last_api_call_at ?? null,
        etd,
        eta,
        destination,
        bookings: Array.from(group.bookings),
        containers: Array.from(group.containers),
        track,
      });
    });

    return NextResponse.json({ vessels: result }, { status: 200 });
  } catch (error) {
    console.error('[ActiveVessels] Error inesperado en endpoint /api/vessels/active:', error);
    return NextResponse.json(
      { error: 'Error interno obteniendo buques activos' },
      { status: 500 },
    );
  }
}


