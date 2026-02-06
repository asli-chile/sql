import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * Endpoint para buscar automáticamente IMO/MMSI de todos los buques activos que no los tienen.
 * 
 * POST /api/vessels/auto-set-all-imos
 * Body: (opcional) { limit?: number } - límite de buques a procesar (default: 10)
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

    const body = (await request.json().catch(() => null)) as {
      limit?: number;
    } | null;

    const limit = body?.limit || 10;

    const AISSTREAM_API_KEY = process.env.AISSTREAM_API_KEY;

    // NOTA: aisstream.io es un servicio WebSocket, no REST API
    // No podemos buscar IMO/MMSI usando REST con aisstream.io
    // Por ahora, este endpoint no puede funcionar con aisstream.io
    if (!AISSTREAM_API_KEY) {
      return NextResponse.json(
        { 
          error: 'AISSTREAM_API_KEY no está configurada',
          note: 'aisstream.io requiere WebSocket para streaming en tiempo real, no es una API REST para búsquedas. Considera usar otra API REST para buscar IMO/MMSI.'
        },
        { status: 500 },
      );
    }

    // Si AISSTREAM_API_KEY está configurada, informamos que no podemos usarla para búsquedas REST
    return NextResponse.json(
      { 
        error: 'aisstream.io no soporta búsquedas REST',
        message: 'aisstream.io es un servicio WebSocket para streaming en tiempo real. No proporciona una API REST para buscar IMO/MMSI por nombre de buque.',
        suggestion: 'Usa otra API REST (como DataDocked o MarineTraffic) para buscar IMO/MMSI, o implementa WebSocket de aisstream.io para recibir datos en tiempo real.'
      },
      { status: 501 },
    );

    // 1. Obtener buques activos sin IMO/MMSI
    const nowIso = new Date().toISOString();
    const { data: registros, error: registrosError } = await supabase
      .from('registros')
      .select('nave_inicial, eta')
      .is('deleted_at', null)
      .neq('estado', 'CANCELADO')
      .or(`eta.is.null,eta.gt.${nowIso}`)
      .limit(100);

    if (registrosError) {
      console.error('[AutoSetIMO] Error consultando registros:', registrosError);
      return NextResponse.json(
        { error: 'Error consultando registros activos' },
        { status: 500 },
      );
    }

    // Parsear nombres de buques (limpiar [001E] etc)
    const vesselMap = new Map<string, boolean>();
    (registros || []).forEach((row: any) => {
      const rawName = row.nave_inicial;
      if (!rawName) return;
      
      const trimmed = rawName.trim();
      const match = trimmed.match(/^(.+?)\s*\[.+\]$/);
      const vesselName = match ? match[1].trim() : trimmed;
      
      if (vesselName) {
        vesselMap.set(vesselName, true);
      }
    });

    const activeVesselNames = Array.from(vesselMap.keys());

    // 2. Obtener posiciones existentes
    const { data: existingPositions, error: positionsError } = await supabase
      .from('vessel_positions')
      .select('vessel_name, imo, mmsi')
      .in('vessel_name', activeVesselNames);

    if (positionsError) {
      console.error('[AutoSetIMO] Error consultando posiciones:', positionsError);
      return NextResponse.json(
        { error: 'Error consultando posiciones existentes' },
        { status: 500 },
      );
    }

    const positionsByName = new Map<string, any>();
    (existingPositions || []).forEach((row: any) => {
      positionsByName.set(row.vessel_name, row);
    });

    // 3. Filtrar buques que necesitan IMO/MMSI
    const vesselsNeedingIMO = activeVesselNames.filter((name) => {
      const existing = positionsByName.get(name);
      return !existing || (!existing.imo && !existing.mmsi);
    }).slice(0, limit);

    console.log(`[AutoSetIMO] Buscando IMO/MMSI para ${vesselsNeedingIMO.length} buques...`);

    const results: Array<{
      vessel_name: string;
      success: boolean;
      imo: string | null;
      mmsi: string | null;
      message: string;
    }> = [];

    // 4. Buscar IMO/MMSI para cada buque
    for (const vesselName of vesselsNeedingIMO) {
      try {
        // Intentar buscar en aisstream.io
        // Nota: aisstream.io puede tener diferentes endpoints para búsqueda
        // Por ahora intentamos con el endpoint de búsqueda más común
        const AISSTREAM_BASE_URL = process.env.AISSTREAM_BASE_URL || 'https://api.aisstream.io';
        const searchUrl = `${AISSTREAM_BASE_URL}/v1/vessels/search?name=${encodeURIComponent(vesselName)}`;
        
        const response = await fetch(searchUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${AISSTREAM_API_KEY}`,
          },
        });

        let imo: string | null = null;
        let mmsi: string | null = null;
        let found = false;

        if (response.ok) {
          const data = await response.json();
          
          // Intentar extraer IMO y MMSI de la respuesta
          if (Array.isArray(data) && data.length > 0) {
            const vessel = data.find((v: any) => 
              v.name?.toLowerCase().includes(vesselName.toLowerCase()) ||
              vesselName.toLowerCase().includes(v.name?.toLowerCase() || '')
            ) || data[0];
            
            imo = vessel?.imo ? String(vessel.imo) : null;
            mmsi = vessel?.mmsi ? String(vessel.mmsi) : null;
            found = true;
          } else if (data?.vessel) {
            const vessel = data.vessel;
            imo = vessel?.imo ? String(vessel.imo) : null;
            mmsi = vessel?.mmsi ? String(vessel.mmsi) : null;
            found = true;
          } else if (data?.imo || data?.mmsi) {
            imo = data?.imo ? String(data.imo) : null;
            mmsi = data?.mmsi ? String(data.mmsi) : null;
            found = true;
          }
        }

        if (found && (imo || mmsi)) {
          // Guardar en la base de datos
          const existing = positionsByName.get(vesselName);
          
          if (existing) {
            const { error: updateError } = await supabase
              .from('vessel_positions')
              .update({
                imo: imo || null,
                mmsi: mmsi || null,
                updated_at: new Date().toISOString(),
              })
              .eq('vessel_name', vesselName);

            if (updateError) {
              console.error(`[AutoSetIMO] Error actualizando ${vesselName}:`, updateError);
              results.push({
                vessel_name: vesselName,
                success: false,
                imo: null,
                mmsi: null,
                message: `Error actualizando en BD: ${updateError?.message || 'Error desconocido'}`,
              });
              continue;
            }
          } else {
            const { error: insertError } = await supabase
              .from('vessel_positions')
              .insert({
                vessel_name: vesselName,
                imo: imo || null,
                mmsi: mmsi || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              });

            if (insertError) {
              console.error(`[AutoSetIMO] Error creando ${vesselName}:`, insertError);
              results.push({
                vessel_name: vesselName,
                success: false,
                imo: null,
                mmsi: null,
                message: `Error creando en BD: ${insertError?.message || 'Error desconocido'}`,
              });
              continue;
            }
          }

          results.push({
            vessel_name: vesselName,
            success: true,
            imo,
            mmsi,
            message: `IMO/MMSI configurado correctamente`,
          });
        } else {
          results.push({
            vessel_name: vesselName,
            success: false,
            imo: null,
            mmsi: null,
            message: `No se encontró información en aisstream.io`,
          });
        }
      } catch (error: any) {
        console.error(`[AutoSetIMO] Error buscando ${vesselName}:`, error);
        results.push({
          vessel_name: vesselName,
          success: false,
          imo: null,
          mmsi: null,
          message: `Error: ${error.message || 'Error desconocido'}`,
        });
      }

      // Pequeña pausa para no saturar la API
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `Procesados ${results.length} buques: ${successful} exitosos, ${failed} fallidos`,
      total: results.length,
      successful,
      failed,
      results,
    });
  } catch (error: any) {
    console.error('[AutoSetIMO] Error inesperado:', error);
    return NextResponse.json(
      { error: 'Error inesperado al buscar IMO/MMSI', details: error.message },
      { status: 500 },
    );
  }
}
