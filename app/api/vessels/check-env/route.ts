import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * Endpoint de diagnóstico para verificar que las variables de entorno estén disponibles
 * Solo para admins/ejecutivos
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

    // Leer variables de entorno dentro de la función
    const VESSEL_API_BASE_URL = process.env.VESSEL_API_BASE_URL;
    const VESSEL_API_KEY = process.env.VESSEL_API_KEY;

    return NextResponse.json({
      message: 'Diagnóstico de variables de entorno',
      variables: {
        VESSEL_API_BASE_URL: {
          definida: !!VESSEL_API_BASE_URL,
          valor: VESSEL_API_BASE_URL ? `${VESSEL_API_BASE_URL.substring(0, 30)}...` : 'NO DEFINIDA',
          longitud: VESSEL_API_BASE_URL?.length || 0,
        },
        VESSEL_API_KEY: {
          definida: !!VESSEL_API_KEY,
          valor: VESSEL_API_KEY ? `${VESSEL_API_KEY.substring(0, 10)}...${VESSEL_API_KEY.substring(VESSEL_API_KEY.length - 4)}` : 'NO DEFINIDA',
          longitud: VESSEL_API_KEY?.length || 0,
        },
      },
      todasDefinidas: !!(VESSEL_API_BASE_URL && VESSEL_API_KEY),
      entorno: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[CheckEnv] Error inesperado:', error);
    return NextResponse.json(
      { error: 'Error interno al verificar variables de entorno' },
      { status: 500 },
    );
  }
}

