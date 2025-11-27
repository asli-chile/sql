import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * Endpoint de diagnóstico para verificar el estado de una nave
 * GET /api/vessels/diagnose?name=MSC%20CARMELA
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const vesselName = searchParams.get('name');

        if (!vesselName) {
            return NextResponse.json(
                { error: 'Parámetro "name" requerido' },
                { status: 400 }
            );
        }

        const supabase = await createClient();

        // 1. Verificar en registros
        const nowIso = new Date().toISOString();
        const { data: registros, error: registrosError } = await supabase
            .from('registros')
            .select('nave_inicial, booking, estado, eta, etd, pod, contenedor')
            .is('deleted_at', null)
            .ilike('nave_inicial', `%${vesselName}%`);

        // 2. Verificar en vessel_positions
        const { data: positions, error: positionsError } = await supabase
            .from('vessel_positions')
            .select('*')
            .ilike('vessel_name', `%${vesselName}%`);

        // 3. Verificar registros activos (los que deberían aparecer)
        const { data: activeRegistros, error: activeError } = await supabase
            .from('registros')
            .select('nave_inicial, estado, eta')
            .is('deleted_at', null)
            .neq('estado', 'CANCELADO')
            .or(`eta.is.null,eta.gt.${nowIso}`)
            .ilike('nave_inicial', `%${vesselName}%`);

        return NextResponse.json({
            vessel_name: vesselName,
            timestamp: new Date().toISOString(),

            registros: {
                found: registros?.length || 0,
                data: registros || [],
                error: registrosError?.message || null,
            },

            active_registros: {
                found: activeRegistros?.length || 0,
                data: activeRegistros || [],
                error: activeError?.message || null,
                note: 'Estos son los registros que deberían hacer que la nave aparezca como activa',
            },

            vessel_positions: {
                found: positions?.length || 0,
                data: positions || [],
                error: positionsError?.message || null,
                has_coordinates: positions?.[0]?.last_lat != null && positions?.[0]?.last_lon != null,
                has_imo_mmsi: positions?.[0]?.imo != null || positions?.[0]?.mmsi != null,
            },

            diagnosis: {
                in_registros: (registros?.length || 0) > 0,
                in_active_registros: (activeRegistros?.length || 0) > 0,
                in_vessel_positions: (positions?.length || 0) > 0,
                has_coordinates: positions?.[0]?.last_lat != null && positions?.[0]?.last_lon != null,
                has_imo_or_mmsi: positions?.[0]?.imo != null || positions?.[0]?.mmsi != null,
                should_appear_on_map:
                    (activeRegistros?.length || 0) > 0 &&
                    (positions?.length || 0) > 0 &&
                    positions?.[0]?.last_lat != null &&
                    positions?.[0]?.last_lon != null,
            },

            recommendations: getRecommendations(
                (activeRegistros?.length || 0) > 0,
                (positions?.length || 0) > 0,
                positions?.[0]?.last_lat != null && positions?.[0]?.last_lon != null,
                positions?.[0]?.imo != null || positions?.[0]?.mmsi != null
            ),
        });
    } catch (error) {
        console.error('[VesselDiagnose] Error:', error);
        return NextResponse.json(
            { error: 'Error interno', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}

function getRecommendations(
    inActiveRegistros: boolean,
    inVesselPositions: boolean,
    hasCoordinates: boolean,
    hasImoMmsi: boolean
): string[] {
    const recommendations: string[] = [];

    if (!inActiveRegistros) {
        recommendations.push('❌ La nave NO está en registros activos. Verifica que tenga ETA futura o nula y estado != CANCELADO');
    }

    if (!inVesselPositions) {
        recommendations.push('❌ La nave NO está en vessel_positions. Ejecuta: POST /api/vessels/sync-missing-vessels');
    }

    if (inVesselPositions && !hasCoordinates) {
        if (!hasImoMmsi) {
            recommendations.push('❌ La nave NO tiene IMO/MMSI configurado. Configúralo primero en vessel_positions');
        }
        recommendations.push('❌ La nave NO tiene coordenadas. Ejecuta: POST /api/vessels/update-positions');
    }

    if (inActiveRegistros && inVesselPositions && hasCoordinates) {
        recommendations.push('✅ La nave debería aparecer en el mapa. Si no aparece, verifica los logs del navegador');
    }

    return recommendations;
}
