import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase-server';

type CreateRegistrosRequest = {
  records?: Record<string, unknown>[];
};

const getAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY.');
  }
  return createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};

const validateUser = async () => {
  const supabaseServer = await createServerClient();
  const { data: userData, error: userError } = await supabaseServer.auth.getUser();
  if (userError || !userData?.user?.id) {
    return { ok: false, status: 401, message: 'No autorizado.' };
  }

  const { data: perfil, error: perfilError } = await supabaseServer
    .from('usuarios')
    .select('rol')
    .eq('auth_user_id', userData.user.id)
    .single();

  if (perfilError || !perfil?.rol) {
    return { ok: false, status: 403, message: 'No se pudo validar el rol.' };
  }

  if (perfil.rol === 'cliente') {
    return { ok: false, status: 403, message: 'Acceso restringido.' };
  }

  return { ok: true };
};

export async function POST(request: Request) {
  try {
    const validation = await validateUser();
    if (!validation.ok) {
      return NextResponse.json({ error: validation.message }, { status: validation.status });
    }

    const payload = (await request.json()) as CreateRegistrosRequest;
    const records = payload?.records ?? [];

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: 'No hay registros para crear.' }, { status: 400 });
    }

    const adminClient = getAdminClient();
    const { data, error } = await adminClient
      .from('registros')
      .insert(records)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message, details: error }, { status: 400 });
    }

    return NextResponse.json({ records: data ?? [] });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error inesperado.' }, { status: 500 });
  }
}
