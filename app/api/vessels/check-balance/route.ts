import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * Endpoint para consultar el saldo de créditos de la API AIS
 * También calcula cuántos créditos se consumirían si se ejecuta la actualización
 */
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

    // Verificar permisos: admin o ejecutivo
    const { data: userData } = await supabase
      .from('usuarios')
      .select('rol, email')
      .eq('auth_user_id', user.id)
      .single();

    const isAdmin = userData?.rol === 'admin';
    const isEjecutivo = userData?.email?.endsWith('@asli.cl') || user.email?.endsWith('@asli.cl');

    if (!isAdmin && !isEjecutivo) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Intentar consultar el saldo desde DataDocked (si tienen endpoint)
    // Leer variables de entorno dentro de la función
    const VESSEL_API_BASE_URL = process.env.VESSEL_API_BASE_URL;
    const VESSEL_API_KEY = process.env.VESSEL_API_KEY;

    // Log para debugging
    console.log('[CheckBalance] Variables de entorno:', {
      hasBaseUrl: !!VESSEL_API_BASE_URL,
      hasApiKey: !!VESSEL_API_KEY,
      baseUrl: VESSEL_API_BASE_URL || 'NO DEFINIDA',
    });

    let apiBalance: number | null = null;
    let apiBalanceError: string | null = null;

    if (VESSEL_API_BASE_URL && VESSEL_API_KEY) {
      try {
        // DataDocked puede tener un endpoint para consultar el saldo
        // Ajusta la URL según la documentación de DataDocked
        const balanceUrl = `${VESSEL_API_BASE_URL.replace(/\/$/, '')}/account/balance`;
        
        const response = await fetch(balanceUrl, {
          method: 'GET',
          headers: {
            accept: 'application/json',
            api_key: VESSEL_API_KEY,
          },
        });

        if (response.ok) {
          const data = await response.json();
          // Ajusta según el formato de respuesta de DataDocked
          apiBalance = data.balance ?? data.credits ?? data.remaining_credits ?? null;
        } else {
          // Si el endpoint no existe o no está disponible, no es un error crítico
          apiBalanceError = 'Endpoint de saldo no disponible';
        }
      } catch (error) {
        // Si falla, no es crítico, simplemente no mostramos el saldo
        apiBalanceError = 'No se pudo consultar el saldo de la API';
      }
    } else {
      apiBalanceError = 'API no configurada';
    }

    // Calcular cuántos créditos se consumirían si se ejecuta la actualización
    const nowIso = new Date().toISOString();

    const { data: registros, error: registrosError } = await supabase
      .from('registros')
      .select('nave_inicial, eta')
      .is('deleted_at', null)
      .neq('estado', 'CANCELADO')
      .or(`eta.is.null,eta.gt.${nowIso}`);

    if (registrosError) {
      return NextResponse.json(
        { error: 'Error consultando registros activos' },
        { status: 500 },
      );
    }

    // Parsear nombres de buques
    const parseVesselName = (rawName: string | null): string | null => {
      if (!rawName) return null;
      const trimmed = rawName.trim();
      const match = trimmed.match(/^(.+?)\s*\[.+\]$/);
      return match ? match[1].trim() : trimmed || null;
    };

    const vesselNames = new Set<string>();
    (registros || []).forEach((row: any) => {
      const vesselName = parseVesselName(row.nave_inicial);
      if (vesselName) {
        vesselNames.add(vesselName);
      }
    });

    const activeVesselNames = Array.from(vesselNames);

    if (activeVesselNames.length === 0) {
      return NextResponse.json({
        apiBalance,
        apiBalanceError,
        estimatedCost: 0,
        vesselsToUpdate: 0,
        vesselsWithIdentifiers: 0,
        vesselsWithoutIdentifiers: 0,
        vesselsSkipped: 0,
      });
    }

    // Obtener posiciones existentes
    const { data: existingPositions } = await supabase
      .from('vessel_positions')
      .select('vessel_name, imo, mmsi, last_api_call_at')
      .in('vessel_name', activeVesselNames);

    const positionsMap = new Map(
      (existingPositions || []).map((p: any) => [p.vessel_name, p]),
    );

    const TWENTY_FOUR_HOURS_IN_MS = 24 * 60 * 60 * 1000;
    const shouldCallApi = (lastApiCallAt: string | null): boolean => {
      if (!lastApiCallAt) return true;
      const last = new Date(lastApiCallAt).getTime();
      if (!Number.isFinite(last)) return true;
      const now = Date.now();
      return now - last >= TWENTY_FOUR_HOURS_IN_MS;
    };

    let vesselsToUpdate = 0;
    let vesselsWithIdentifiers = 0;
    let vesselsWithoutIdentifiers = 0;
    let vesselsSkipped = 0;

    activeVesselNames.forEach((vesselName) => {
      const existing = positionsMap.get(vesselName);
      const hasIdentifiers = existing && (existing.imo || existing.mmsi);

      if (!hasIdentifiers) {
        vesselsWithoutIdentifiers++;
        return;
      }

      if (existing && !shouldCallApi(existing.last_api_call_at)) {
        vesselsSkipped++;
        return;
      }

      vesselsWithIdentifiers++;
      vesselsToUpdate++;
    });

    // Cada buque consume 5 créditos
    const estimatedCost = vesselsToUpdate * 5;

    return NextResponse.json({
      apiBalance,
      apiBalanceError,
      estimatedCost,
      vesselsToUpdate,
      vesselsWithIdentifiers,
      vesselsWithoutIdentifiers,
      vesselsSkipped,
      totalActiveVessels: activeVesselNames.length,
    });
  } catch (error) {
    console.error('[CheckBalance] Error inesperado:', error);
    return NextResponse.json(
      { error: 'Error interno al consultar el saldo' },
      { status: 500 },
    );
  }
}

