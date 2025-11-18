import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * Endpoint para sincronizar naves activas desde registros a vessel_positions
 * 
 * Crea entradas en vessel_positions para naves que están en registros activos
 * pero que no tienen entrada en vessel_positions aún.
 * 
 * POST /api/vessels/sync-missing-vessels
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

    // Función para parsear el nombre de la nave (remover [VIAJE] si existe)
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

    // Obtener todas las naves activas de registros
    const nowIso = new Date().toISOString();
    const { data: registros, error: registrosError } = await supabase
      .from('registros')
      .select('nave_inicial, eta')
      .is('deleted_at', null)
      .neq('estado', 'CANCELADO')
      .or(`eta.is.null,eta.gt.${nowIso}`);

    if (registrosError) {
      console.error('[SyncMissingVessels] Error consultando registros:', registrosError);
      return NextResponse.json(
        { error: 'Error consultando registros activos' },
        { status: 500 },
      );
    }

    // Extraer nombres únicos de naves
    const vesselNamesSet = new Set<string>();
    (registros || []).forEach((row: any) => {
      const vesselName = parseVesselName(row.nave_inicial);
      if (vesselName) {
        vesselNamesSet.add(vesselName);
      }
    });

    const vesselNames = Array.from(vesselNamesSet);

    if (vesselNames.length === 0) {
      return NextResponse.json({
        message: 'No se encontraron naves activas en registros',
        created: [],
      });
    }

    // Verificar cuáles ya existen en vessel_positions
    const { data: existingPositions, error: positionsError } = await supabase
      .from('vessel_positions')
      .select('vessel_name')
      .in('vessel_name', vesselNames);

    if (positionsError) {
      console.error('[SyncMissingVessels] Error consultando vessel_positions:', positionsError);
      return NextResponse.json(
        { error: 'Error consultando vessel_positions' },
        { status: 500 },
      );
    }

    const existingNames = new Set(
      (existingPositions || []).map((row: any) => row.vessel_name),
    );

    // Identificar naves faltantes
    const missingVessels = vesselNames.filter((name) => !existingNames.has(name));

    if (missingVessels.length === 0) {
      return NextResponse.json({
        message: 'Todas las naves activas ya están en vessel_positions',
        created: [],
        total: vesselNames.length,
      });
    }

    // Crear entradas para las naves faltantes (sin coordenadas inicialmente)
    const now = new Date().toISOString();
    const inserts = missingVessels.map((vesselName) => ({
      vessel_name: vesselName,
      last_lat: null,
      last_lon: null,
      last_position_at: null,
      last_api_call_at: null,
      created_at: now,
      updated_at: now,
    }));

    const { data: inserted, error: insertError } = await supabase
      .from('vessel_positions')
      .insert(inserts)
      .select('vessel_name');

    if (insertError) {
      console.error('[SyncMissingVessels] Error insertando naves:', insertError);
      return NextResponse.json(
        { error: 'Error insertando naves en vessel_positions', details: insertError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: 'Naves sincronizadas correctamente',
      created: inserted?.map((row: any) => row.vessel_name) || [],
      total_created: inserted?.length || 0,
      total_active: vesselNames.length,
      already_existed: existingNames.size,
    });
  } catch (error) {
    console.error('[SyncMissingVessels] Error inesperado:', error);
    return NextResponse.json(
      {
        error: 'Error interno sincronizando naves faltantes',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

