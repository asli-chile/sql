import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase-server';

type CreateUserPayload = {
  email: string;
  password: string;
  nombre: string;
  rol: 'admin' | 'ejecutivo' | 'cliente';
  clienteNombre?: string | null;
  clientesAsignados?: string[];
  bootstrapKey?: string;
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

const validateAdmin = async () => {
  const supabaseServer = await createServerClient();
  const { data: userData, error: userError } = await supabaseServer.auth.getUser();
  if (userError || !userData?.user?.id) {
    return { ok: false, status: 401, message: 'No autorizado.' };
  }

  const { data: perfil, error: perfilError } = await supabaseServer
    .from('usuarios')
    .select('rol, email')
    .eq('auth_user_id', userData.user.id)
    .single();

  if (perfilError || !perfil?.rol) {
    return { ok: false, status: 403, message: 'No se pudo validar el rol.' };
  }

  // Permitir solo admin o rodrigo.caceres@asli.cl
  const isAdmin = perfil.rol === 'admin';
  const isRodrigo = perfil.email?.toLowerCase() === 'rodrigo.caceres@asli.cl';
  
  if (!isAdmin && !isRodrigo) {
    return { ok: false, status: 403, message: 'Acceso restringido. Solo administradores.' };
  }

  return { ok: true };
};

export async function POST(request: Request) {
  try {
    const validation = await validateAdmin();
    if (!validation.ok) {
      return NextResponse.json({ error: validation.message }, { status: validation.status });
    }

    const payload = (await request.json()) as CreateUserPayload;

    if (!payload.email || !payload.password || !payload.nombre || !payload.rol) {
      return NextResponse.json({ error: 'Faltan campos requeridos.' }, { status: 400 });
    }

    // Validar bootstrap key si es necesario (para primera creación)
    if (!payload.bootstrapKey) {
      // Verificar si ya existe algún usuario admin
      const adminClient = getAdminClient();
      const { count } = await adminClient
        .from('usuarios')
        .select('*', { count: 'exact', head: true })
        .eq('rol', 'admin');

      if (count === 0) {
        return NextResponse.json({ error: 'Se requiere bootstrap key para crear el primer usuario.' }, { status: 400 });
      }
    }

    const adminClient = getAdminClient();

    // 1. Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: payload.email.toLowerCase().trim(),
      password: payload.password,
      email_confirm: true,
      user_metadata: {
        full_name: payload.nombre,
      },
    });

    if (authError || !authData.user) {
      return NextResponse.json({ error: authError?.message || 'No se pudo crear el usuario en Auth.' }, { status: 400 });
    }

    // 2. Crear registro en tabla usuarios
    const { data: usuarioData, error: usuarioError } = await adminClient
      .from('usuarios')
      .insert({
        auth_user_id: authData.user.id,
        email: payload.email.toLowerCase().trim(),
        nombre: payload.nombre,
        rol: payload.rol,
        cliente_nombre: payload.clienteNombre || null,
        clientes_asignados: payload.clientesAsignados || [],
        activo: true,
      })
      .select()
      .single();

    if (usuarioError) {
      // Si falla, intentar eliminar el usuario de Auth
      await adminClient.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: usuarioError.message, details: usuarioError }, { status: 400 });
    }

    return NextResponse.json({ user: usuarioData });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error inesperado.' }, { status: 500 });
  }
}
