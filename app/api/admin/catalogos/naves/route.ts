import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase-server';

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
  return { ok: true, userId: userData.user.id };
};

// POST: Crear o actualizar una nave en el catálogo
export async function POST(request: Request) {
  try {
    const validation = await validateAdmin();
    if (!validation.ok) {
      return NextResponse.json({ error: validation.message }, { status: validation.status });
    }

    const body = await request.json();
    const { nombre, naviera_nombre } = body;

    // Validaciones
    if (!nombre || !nombre.trim()) {
      return NextResponse.json({ error: 'El nombre de la nave es requerido' }, { status: 400 });
    }

    if (!naviera_nombre || !naviera_nombre.trim()) {
      return NextResponse.json({ error: 'El nombre de la naviera es requerido' }, { status: 400 });
    }

    const adminClient = getAdminClient();

    // Verificar si la nave ya existe
    const { data: naveExistente, error: errorBusqueda } = await adminClient
      .from('catalogos_naves')
      .select('id, activo')
      .eq('nombre', nombre.trim())
      .eq('naviera_nombre', naviera_nombre.trim())
      .single();

    if (naveExistente) {
      // Si existe pero está inactiva, activarla
      if (!naveExistente.activo) {
        const { error: updateError } = await adminClient
          .from('catalogos_naves')
          .update({ activo: true })
          .eq('id', naveExistente.id);

        if (updateError) {
          return NextResponse.json({ 
            error: 'Error al actualizar la nave existente',
            details: updateError.message 
          }, { status: 500 });
        }

        return NextResponse.json({ 
          success: true,
          message: 'Nave activada correctamente',
          nave: { id: naveExistente.id, nombre: nombre.trim(), naviera_nombre: naviera_nombre.trim(), activo: true }
        });
      }

      // Si ya existe y está activa, retornar éxito
      return NextResponse.json({ 
        success: true,
        message: 'La nave ya existe',
        nave: { id: naveExistente.id, nombre: nombre.trim(), naviera_nombre: naviera_nombre.trim(), activo: true }
      });
    }

    // Si no existe, crearla
    const { data: nuevaNave, error: insertError } = await adminClient
      .from('catalogos_naves')
      .insert({
        nombre: nombre.trim(),
        naviera_nombre: naviera_nombre.trim(),
        activo: true,
      })
      .select()
      .single();

    if (insertError || !nuevaNave) {
      return NextResponse.json({ 
        error: 'Error al crear la nave',
        details: insertError?.message || 'Error desconocido'
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Nave creada correctamente',
      nave: nuevaNave
    });

  } catch (error: any) {
    console.error('Error en POST /api/admin/catalogos/naves:', error);
    return NextResponse.json({ 
      error: 'Error inesperado al procesar la solicitud',
      details: error?.message || error
    }, { status: 500 });
  }
}
