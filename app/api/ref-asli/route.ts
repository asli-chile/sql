import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase-server';

type RefAsliRequest = {
  count?: number;
};

const getAdminClient = (): SupabaseClient => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY.');
  }
  return createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  }) as SupabaseClient;
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

const fetchAllRefAsliNumbers = async (adminClient: SupabaseClient) => {
  const pageSize = 1000;
  let from = 0;
  const numbers = new Set<number>();

  while (true) {
    const { data, error } = await adminClient
      .from('registros')
      .select('ref_asli')
      .order('ref_asli', { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      break;
    }

    data.forEach((row: { ref_asli: string | null }) => {
      const ref = row.ref_asli?.trim().toUpperCase() || '';
      const match = ref.match(/^A(\d+)$/);
      if (match) {
        const value = parseInt(match[1], 10);
        if (!Number.isNaN(value)) {
          numbers.add(value);
        }
      }
    });

    if (data.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return numbers;
};

const generateRefAsliList = (existingNumbers: Set<number>, count: number): string[] => {
  const result: string[] = [];
  let current = 1;

  while (result.length < count) {
    if (!existingNumbers.has(current)) {
      existingNumbers.add(current);
      result.push(`A${String(current).padStart(4, '0')}`);
    }
    current += 1;
  }

  return result;
};

export async function POST(request: Request) {
  try {
    const validation = await validateUser();
    if (!validation.ok) {
      return NextResponse.json({ error: validation.message }, { status: validation.status });
    }

    const payload = (await request.json()) as RefAsliRequest;
    const count = typeof payload?.count === 'number' ? payload.count : 1;

    if (count <= 0) {
      return NextResponse.json({ error: 'Cantidad inválida.' }, { status: 400 });
    }

    const adminClient = getAdminClient();
    const existingNumbers = await fetchAllRefAsliNumbers(adminClient);
    const refAsliList = generateRefAsliList(existingNumbers, count);

    if (count === 1) {
      return NextResponse.json({ refAsli: refAsliList[0] });
    }

    return NextResponse.json({ refAsliList });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error inesperado.' }, { status: 500 });
  }
}
