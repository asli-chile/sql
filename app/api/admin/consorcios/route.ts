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

  const { data: perfil, error: perfilError } = await supabaseServer
    .from('usuarios')
    .select('rol, email')
    .eq('auth_user_id', userData.user.id)
    .single();

  if (perfilError || !perfil?.rol) {
    return { ok: false, status: 403, message: 'No se pudo validar el rol.' };
  }

  const isAdmin = perfil.rol === 'admin';
  const isRodrigo = perfil.email?.toLowerCase() === 'rodrigo.caceres@asli.cl';
  
  if (!isAdmin && !isRodrigo) {
    return { ok: false, status: 403, message: 'Acceso restringido. Solo administradores.' };
  }

  return { ok: true, userId: userData.user.id, email: perfil.email };
};

// GET - Obtener todos los consorcios
export async function GET() {
  try {
    const validation = await validateAdmin();
    if (!validation.ok) {
      return NextResponse.json({ error: validation.message }, { status: validation.status });
    }

    const adminClient = getAdminClient();

    const { data: consorcios, error: consorciosError } = await adminClient
      .from('consorcios')
      .select('*')
      .eq('activo', true)
      .order('nombre');

    if (consorciosError) {
      return NextResponse.json({ error: consorciosError.message }, { status: 500 });
    }

    // Obtener las relaciones naviera-servicio para cada consorcio
    const consorciosConDetalles = await Promise.all(
      (consorcios || []).map(async (consorcio) => {
        const { data: relaciones, error: relacionesError } = await adminClient
          .from('consorcios_navieras_servicios')
          .select('*')
          .eq('consorcio_id', consorcio.id)
          .eq('activo', true)
          .order('orden');

        if (relacionesError) {
          console.error('Error obteniendo relaciones:', relacionesError);
        }

        return {
          ...consorcio,
          navierasServicios: relaciones || [],
        };
      })
    );

    return NextResponse.json({ consorcios: consorciosConDetalles });
  } catch (error: any) {
    console.error('Error obteniendo consorcios:', error);
    return NextResponse.json(
      { error: error?.message || 'Error al obtener consorcios' },
      { status: 500 }
    );
  }
}

// POST - Crear un nuevo consorcio
export async function POST(request: Request) {
  try {
    const validation = await validateAdmin();
    if (!validation.ok) {
      return NextResponse.json({ error: validation.message }, { status: validation.status });
    }

    const payload = await request.json();
    const { nombre, descripcion, navierasServicios } = payload;

    if (!nombre || !nombre.trim()) {
      return NextResponse.json({ error: 'El nombre del consorcio es requerido.' }, { status: 400 });
    }

    if (!navierasServicios || !Array.isArray(navierasServicios) || navierasServicios.length === 0) {
      return NextResponse.json({ error: 'Debe incluir al menos una naviera con su servicio.' }, { status: 400 });
    }

    const adminClient = getAdminClient();

    // Obtener información del usuario para auditoría
    const { data: usuarioData } = await adminClient
      .from('usuarios')
      .select('id, nombre, email')
      .eq('auth_user_id', validation.userId)
      .single();

    // Crear el consorcio
    const { data: consorcioData, error: consorcioError } = await adminClient
      .from('consorcios')
      .insert({
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || null,
        activo: true,
        created_by: usuarioData?.email || validation.email,
        updated_by: usuarioData?.email || validation.email,
      })
      .select()
      .single();

    if (consorcioError) {
      if (consorcioError.code === '23505') {
        return NextResponse.json({ error: 'Ya existe un consorcio con ese nombre.' }, { status: 400 });
      }
      return NextResponse.json({ error: consorcioError.message }, { status: 400 });
    }

    // Insertar las relaciones naviera-servicio
    const relacionesToInsert = navierasServicios
      .filter((rel: any) => rel.naviera && rel.servicio_nombre)
      .map((rel: any, index: number) => ({
        consorcio_id: consorcioData.id,
        naviera: rel.naviera.trim(),
        servicio_nombre: rel.servicio_nombre.trim(),
        orden: rel.orden !== undefined ? rel.orden : index + 1,
        activo: true,
        created_by: usuarioData?.email || validation.email,
        updated_by: usuarioData?.email || validation.email,
      }));

    if (relacionesToInsert.length > 0) {
      const { error: relacionesError } = await adminClient
        .from('consorcios_navieras_servicios')
        .insert(relacionesToInsert);

      if (relacionesError) {
        console.error('Error insertando relaciones:', relacionesError);
        // Eliminar el consorcio si falla la inserción de relaciones
        await adminClient.from('consorcios').delete().eq('id', consorcioData.id);
        return NextResponse.json({ error: 'Error al guardar las relaciones naviera-servicio.' }, { status: 400 });
      }
    }

    // Obtener el consorcio completo con relaciones
    const { data: consorcioCompleto, error: fetchError } = await adminClient
      .from('consorcios')
      .select(`
        *,
        navierasServicios:consorcios_navieras_servicios(*)
      `)
      .eq('id', consorcioData.id)
      .single();

    if (fetchError) {
      console.error('Error obteniendo consorcio completo:', fetchError);
    }

    return NextResponse.json({ 
      consorcio: consorcioCompleto || consorcioData,
      message: 'Consorcio creado exitosamente' 
    });
  } catch (error: any) {
    console.error('Error creando consorcio:', error);
    return NextResponse.json(
      { error: error?.message || 'Error al crear consorcio' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar un consorcio
export async function PUT(request: Request) {
  try {
    const validation = await validateAdmin();
    if (!validation.ok) {
      return NextResponse.json({ error: validation.message }, { status: validation.status });
    }

    const payload = await request.json();
    const { id, nombre, descripcion, activo, navierasServicios } = payload;

    if (!id) {
      return NextResponse.json({ error: 'El ID del consorcio es requerido.' }, { status: 400 });
    }

    if (!nombre || !nombre.trim()) {
      return NextResponse.json({ error: 'El nombre del consorcio es requerido.' }, { status: 400 });
    }

    const adminClient = getAdminClient();

    // Obtener información del usuario para auditoría
    const { data: usuarioData } = await adminClient
      .from('usuarios')
      .select('id, nombre, email')
      .eq('auth_user_id', validation.userId)
      .single();

    // Actualizar el consorcio
    const updateData: any = {
      nombre: nombre.trim(),
      updated_by: usuarioData?.email || validation.email,
    };

    if (descripcion !== undefined) updateData.descripcion = descripcion?.trim() || null;
    if (activo !== undefined) updateData.activo = activo;

    const { data: consorcioData, error: consorcioError } = await adminClient
      .from('consorcios')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (consorcioError) {
      if (consorcioError.code === '23505') {
        return NextResponse.json({ error: 'Ya existe un consorcio con ese nombre.' }, { status: 400 });
      }
      return NextResponse.json({ error: consorcioError.message }, { status: 400 });
    }

    // Si se proporcionaron relaciones, actualizarlas
    if (navierasServicios && Array.isArray(navierasServicios)) {
      // Eliminar relaciones existentes
      await adminClient
        .from('consorcios_navieras_servicios')
        .delete()
        .eq('consorcio_id', id);

      // Insertar nuevas relaciones
      const relacionesToInsert = navierasServicios
        .filter((rel: any) => rel.naviera && rel.servicio_nombre)
        .map((rel: any, index: number) => ({
          consorcio_id: id,
          naviera: rel.naviera.trim(),
          servicio_nombre: rel.servicio_nombre.trim(),
          orden: rel.orden !== undefined ? rel.orden : index + 1,
          activo: true,
          created_by: usuarioData?.email || validation.email,
          updated_by: usuarioData?.email || validation.email,
        }));

      if (relacionesToInsert.length > 0) {
        const { error: relacionesError } = await adminClient
          .from('consorcios_navieras_servicios')
          .insert(relacionesToInsert);

        if (relacionesError) {
          console.error('Error actualizando relaciones:', relacionesError);
        }
      }
    }

    // Obtener el consorcio completo con relaciones
    const { data: consorcioCompleto, error: fetchError } = await adminClient
      .from('consorcios')
      .select(`
        *,
        navierasServicios:consorcios_navieras_servicios(*)
      `)
      .eq('id', id)
      .single();

    return NextResponse.json({ 
      consorcio: consorcioCompleto || consorcioData,
      message: 'Consorcio actualizado exitosamente' 
    });
  } catch (error: any) {
    console.error('Error actualizando consorcio:', error);
    return NextResponse.json(
      { error: error?.message || 'Error al actualizar consorcio' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar (marcar como inactivo) un consorcio
export async function DELETE(request: Request) {
  try {
    const validation = await validateAdmin();
    if (!validation.ok) {
      return NextResponse.json({ error: validation.message }, { status: validation.status });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'El ID del consorcio es requerido.' }, { status: 400 });
    }

    const adminClient = getAdminClient();

    // Obtener información del usuario para auditoría
    const { data: usuarioData } = await adminClient
      .from('usuarios')
      .select('id, nombre, email')
      .eq('auth_user_id', validation.userId)
      .single();

    // Marcar como inactivo en lugar de eliminar
    const { error } = await adminClient
      .from('consorcios')
      .update({
        activo: false,
        updated_by: usuarioData?.email || validation.email,
      })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: 'Consorcio eliminado exitosamente' });
  } catch (error: any) {
    console.error('Error eliminando consorcio:', error);
    return NextResponse.json(
      { error: error?.message || 'Error al eliminar consorcio' },
      { status: 500 }
    );
  }
}
