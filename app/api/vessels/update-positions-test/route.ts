import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { fetchVesselPositionFromAisApi } from '@/lib/vessel-ais-client';

export const dynamic = 'force-dynamic';

/**
 * Endpoint de PRUEBA para actualizar posiciones SIN restricción de 24 horas
 * 
 * ⚠️ ADVERTENCIA: Este endpoint NO verifica el límite de 24 horas.
 * Úsalo solo para pruebas. Cada llamada consume créditos de la API AIS.
 * 
 * POST /api/vessels/update-positions-test
 * Body (opcional): { "vesselNames": ["MSC CARMELA", "OTRA_NAVE"] }
 * 
 * Si no se especifica vesselNames, actualiza TODAS las naves activas con IMO/MMSI.
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

        // Leer body para ver si se especificaron naves específicas
        let requestedVesselNames: string[] | null = null;
        try {
            const body = await request.json();
            if (body.vesselNames && Array.isArray(body.vesselNames)) {
                requestedVesselNames = body.vesselNames;
            }
        } catch {
            // No hay body o no es JSON válido, continuar sin filtro
        }

        const parseVesselName = (rawName: string | null): string | null => {
            if (!rawName) return null;
            const trimmed = rawName.trim();
            const match = trimmed.match(/^(.+?)\s*\[.+\]$/);
            if (match) return match[1].trim();
            return trimmed || null;
        };

        // Obtener naves activas de registros
        const nowIso = new Date().toISOString();
        const { data: registros, error: registrosError } = await supabase
            .from('registros')
            .select('nave_inicial, eta')
            .is('deleted_at', null)
            .neq('estado', 'CANCELADO')
            .or(`eta.is.null,eta.gt.${nowIso}`);

        if (registrosError) {
            console.error('[UpdatePositionsTest] Error consultando registros:', registrosError);
            return NextResponse.json(
                { error: 'Error consultando registros activos' },
                { status: 500 }
            );
        }

        const vesselMap = new Map<string, { vessel_name: string }>();
        (registros || []).forEach((row: any) => {
            const vesselName = parseVesselName(row.nave_inicial);
            if (!vesselName) return;

            // Si se especificaron naves, filtrar
            if (requestedVesselNames && !requestedVesselNames.includes(vesselName)) {
                return;
            }

            vesselMap.set(vesselName, { vessel_name: vesselName });
        });

        const activeVessels = Array.from(vesselMap.values());

        if (activeVessels.length === 0) {
            return NextResponse.json({
                message: requestedVesselNames
                    ? 'No se encontraron las naves especificadas en registros activos'
                    : 'No se encontraron buques activos',
                updated: [],
                skipped: [],
            });
        }

        // Leer posiciones existentes
        const vesselNames = activeVessels.map((v) => v.vessel_name);
        const { data: existingPositions, error: positionsError } = await supabase
            .from('vessel_positions')
            .select('id, vessel_name, imo, mmsi, last_lat, last_lon, last_position_at, last_api_call_at')
            .in('vessel_name', vesselNames);

        if (positionsError) {
            console.error('[UpdatePositionsTest] Error leyendo vessel_positions:', positionsError);
            return NextResponse.json(
                { error: 'Error leyendo posiciones actuales' },
                { status: 500 }
            );
        }

        const positionsByName = new Map<string, any>();
        (existingPositions || []).forEach((row: any) => {
            positionsByName.set(row.vessel_name, row);
        });

        const updated: string[] = [];
        const skipped: string[] = [];
        const failed: { vessel_name: string; reason: string }[] = [];
        const missingIdentifiers: string[] = [];

        for (const vessel of activeVessels) {
            const existing = positionsByName.get(vessel.vessel_name);

            // ⚠️ DIFERENCIA CON EL ENDPOINT NORMAL: NO verificamos shouldCallApi (24 horas)
            // Llamamos a la API directamente si hay IMO/MMSI

            const imoToUse = existing?.imo ?? null;
            const mmsiToUse = existing?.mmsi ?? null;

            if (!imoToUse && !mmsiToUse) {
                missingIdentifiers.push(vessel.vessel_name);
                continue;
            }

            console.log(`[UpdatePositionsTest] Llamando API AIS para ${vessel.vessel_name} (IMO: ${imoToUse}, MMSI: ${mmsiToUse})`);

            const aisResult = await fetchVesselPositionFromAisApi({
                vesselName: vessel.vessel_name,
                imo: imoToUse,
                mmsi: mmsiToUse,
            });

            if (!aisResult) {
                failed.push({
                    vessel_name: vessel.vessel_name,
                    reason: 'La API AIS no devolvió datos válidos',
                });
                continue;
            }

            const now = new Date().toISOString();

            if (!existing) {
                // Crear nueva entrada
                const { error: insertError } = await supabase.from('vessel_positions').insert({
                    vessel_name: vessel.vessel_name,
                    imo: aisResult.imo ?? imoToUse,
                    mmsi: aisResult.mmsi ?? mmsiToUse,
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
                });

                if (insertError) {
                    console.error('[UpdatePositionsTest] Error insertando:', vessel.vessel_name, insertError);
                    failed.push({
                        vessel_name: vessel.vessel_name,
                        reason: 'Error al insertar en vessel_positions',
                    });
                    continue;
                }
            } else {
                // Actualizar existente
                const { error: updateError } = await supabase
                    .from('vessel_positions')
                    .update({
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
                    })
                    .eq('id', existing.id);

                if (updateError) {
                    console.error('[UpdatePositionsTest] Error actualizando:', vessel.vessel_name, updateError);
                    failed.push({
                        vessel_name: vessel.vessel_name,
                        reason: 'Error al actualizar vessel_positions',
                    });
                    continue;
                }
            }

            // Guardar en historial
            await supabase.from('vessel_position_history').insert({
                vessel_name: vessel.vessel_name,
                lat: aisResult.lat,
                lon: aisResult.lon,
                position_at: aisResult.positionTimestamp,
                source: 'AIS',
            });

            updated.push(vessel.vessel_name);
        }

        return NextResponse.json({
            message: '⚠️ Actualización de PRUEBA completada (sin restricción de 24 horas)',
            warning: 'Este endpoint consume créditos de la API AIS en cada llamada',
            totalActiveVessels: activeVessels.length,
            updated,
            skipped,
            failed,
            missingIdentifiers,
        });
    } catch (error) {
        console.error('[UpdatePositionsTest] Error inesperado:', error);
        return NextResponse.json(
            { error: 'Error interno', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
