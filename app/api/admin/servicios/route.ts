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

// GET - Obtener todos los servicios con sus naves
export async function GET() {
  try {
    const validation = await validateAdmin();
    if (!validation.ok) {
      return NextResponse.json({ error: validation.message }, { status: validation.status });
    }

    const adminClient = getAdminClient();

    // Obtener servicios con sus naves y escalas (solo activos)
    // Intentar incluir escalas, pero si la tabla no existe, continuar sin escalas
    let serviciosQuery = adminClient
      .from('servicios')
      .select(`
        *,
        naves:servicios_naves(
          id,
          nave_nombre,
          activo,
          orden,
          created_at
        )
      `)
      .eq('activo', true)
      .order('nombre', { ascending: true });

    const { data: servicios, error: serviciosError } = await serviciosQuery;

    if (serviciosError) {
      return NextResponse.json({ 
        error: serviciosError.message,
        code: serviciosError.code,
      }, { status: 400 });
    }

    // Intentar cargar escalas si la tabla existe
    const serviciosConEscalas = await Promise.all(
      (servicios || []).map(async (servicio: any) => {
        try {
          const { data: escalasData } = await adminClient
            .from('servicios_escalas')
            .select('id, puerto, puerto_nombre, area, orden, activo')
            .eq('servicio_id', servicio.id)
            .eq('activo', true)
            .order('orden', { ascending: true });
          
          return {
            ...servicio,
            escalas: escalasData || []
          };
        } catch (error) {
          // Si la tabla no existe, continuar sin escalas
          return {
            ...servicio,
            escalas: []
          };
        }
      })
    );

    // Ordenar naves y escalas por orden dentro de cada servicio
    const serviciosConNavesOrdenadas = serviciosConEscalas?.map(servicio => ({
      ...servicio,
      naves: servicio.naves?.sort((a: any, b: any) => a.orden - b.orden) || [],
      escalas: servicio.escalas?.filter((e: any) => e.activo).sort((a: any, b: any) => a.orden - b.orden) || []
    }));

    return NextResponse.json({
      success: true,
      servicios: serviciosConNavesOrdenadas || [],
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: error?.message || 'Error inesperado.',
      details: error 
    }, { status: 500 });
  }
}

// POST - Crear un nuevo servicio
export async function POST(request: Request) {
  try {
    const validation = await validateAdmin();
    if (!validation.ok) {
      return NextResponse.json({ error: validation.message }, { status: validation.status });
    }

    const payload = await request.json();
    const { nombre, consorcio, descripcion, naves, escalas } = payload;

    if (!nombre || !nombre.trim()) {
      return NextResponse.json({ error: 'El nombre del servicio es requerido.' }, { status: 400 });
    }

    const adminClient = getAdminClient();

    // Obtener información del usuario para auditoría
    const { data: usuarioData } = await adminClient
      .from('usuarios')
      .select('id, nombre, email')
      .eq('auth_user_id', validation.userId)
      .single();

    // Crear el servicio
    const { data: servicioData, error: servicioError } = await adminClient
      .from('servicios')
      .insert({
        nombre: nombre.trim(),
        consorcio: consorcio?.trim() || null,
        descripcion: descripcion?.trim() || null,
        activo: true,
        created_by: usuarioData?.email || validation.email,
        updated_by: usuarioData?.email || validation.email,
      })
      .select()
      .single();

    if (servicioError) {
      if (servicioError.code === '23505') {
        return NextResponse.json({ error: 'Ya existe un servicio con ese nombre.' }, { status: 400 });
      }
      return NextResponse.json({ error: servicioError.message }, { status: 400 });
    }

    // Si se proporcionaron naves, asignarlas al servicio
    if (naves && Array.isArray(naves) && naves.length > 0) {
      const navesToInsert = naves
        .filter((nave: any) => nave && nave.trim())
        .map((nave: string, index: number) => ({
          servicio_id: servicioData.id,
          nave_nombre: nave.trim(),
          activo: true,
          orden: index + 1,
          created_by: usuarioData?.email || validation.email,
          updated_by: usuarioData?.email || validation.email,
        }));

      if (navesToInsert.length > 0) {
        const { error: navesError } = await adminClient
          .from('servicios_naves')
          .insert(navesToInsert);

        if (navesError) {
          console.error('Error asignando naves:', navesError);
          // No fallar, solo loguear el error
        }
      }
    }

    // Si se proporcionaron escalas, asignarlas al servicio
    if (escalas && Array.isArray(escalas) && escalas.length > 0) {
      const escalasToInsert = escalas
        .filter((escala: any) => escala && escala.puerto && escala.puerto.trim())
        .map((escala: any, index: number) => ({
          servicio_id: servicioData.id,
          puerto: escala.puerto.trim(),
          puerto_nombre: escala.puerto_nombre?.trim() || escala.puerto.trim(),
          area: escala.area || 'ASIA',
          orden: escala.orden !== undefined ? escala.orden : index + 1,
          activo: true,
          created_by: usuarioData?.email || validation.email,
          updated_by: usuarioData?.email || validation.email,
        }));

      if (escalasToInsert.length > 0) {
        const { error: escalasError } = await adminClient
          .from('servicios_escalas')
          .insert(escalasToInsert);

        if (escalasError) {
          console.error('Error asignando escalas:', escalasError);
          // No fallar, solo loguear el error
        }
      }
    }

    // Obtener el servicio completo con naves
    const { data: servicioCompleto, error: fetchError } = await adminClient
      .from('servicios')
      .select(`
        *,
        naves:servicios_naves(
          id,
          nave_nombre,
          activo,
          orden
        )
      `)
      .eq('id', servicioData.id)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 400 });
    }

    // Intentar cargar escalas si la tabla existe
    let escalasData: any[] = [];
    try {
      const { data } = await adminClient
        .from('servicios_escalas')
        .select('id, puerto, puerto_nombre, area, orden, activo')
        .eq('servicio_id', servicioData.id)
        .eq('activo', true)
        .order('orden', { ascending: true });
      escalasData = data || [];
    } catch (error) {
      // Si la tabla no existe, continuar sin escalas
      escalasData = [];
    }

    return NextResponse.json({
      success: true,
      message: 'Servicio creado exitosamente.',
      servicio: {
        ...servicioCompleto,
        naves: servicioCompleto.naves?.sort((a: any, b: any) => a.orden - b.orden) || [],
        escalas: escalasData.sort((a: any, b: any) => a.orden - b.orden) || []
      },
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: error?.message || 'Error inesperado.',
      details: error 
    }, { status: 500 });
  }
}

// PUT - Actualizar un servicio
export async function PUT(request: Request) {
  try {
    const validation = await validateAdmin();
    if (!validation.ok) {
      return NextResponse.json({ error: validation.message }, { status: validation.status });
    }

    const payload = await request.json();
    const { id, nombre, consorcio, descripcion, activo, naves, escalas } = payload;

    if (!id) {
      return NextResponse.json({ error: 'El ID del servicio es requerido.' }, { status: 400 });
    }

    const adminClient = getAdminClient();

    // Obtener información del usuario para auditoría
    const { data: usuarioData } = await adminClient
      .from('usuarios')
      .select('id, nombre, email')
      .eq('auth_user_id', validation.userId)
      .single();

    // Actualizar el servicio
    const updateData: any = {
      updated_by: usuarioData?.email || validation.email,
    };

    if (nombre !== undefined) updateData.nombre = nombre.trim();
    if (consorcio !== undefined) updateData.consorcio = consorcio?.trim() || null;
    if (descripcion !== undefined) updateData.descripcion = descripcion?.trim() || null;
    if (activo !== undefined) updateData.activo = activo;

    const { data: servicioData, error: servicioError } = await adminClient
      .from('servicios')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (servicioError) {
      if (servicioError.code === '23505') {
        return NextResponse.json({ error: 'Ya existe un servicio con ese nombre.' }, { status: 400 });
      }
      return NextResponse.json({ error: servicioError.message }, { status: 400 });
    }

    // Si se proporcionaron naves, actualizar la relación
    if (naves !== undefined && Array.isArray(naves)) {
      // Eliminar todas las naves existentes
      await adminClient
        .from('servicios_naves')
        .delete()
        .eq('servicio_id', id);

      // Insertar las nuevas naves
      if (naves.length > 0) {
        const navesToInsert = naves
          .filter((nave: any) => nave && nave.nave_nombre && nave.nave_nombre.trim())
          .map((nave: any, index: number) => ({
            servicio_id: id,
            nave_nombre: nave.nave_nombre.trim(),
            activo: nave.activo !== undefined ? nave.activo : true,
            orden: nave.orden !== undefined ? nave.orden : index + 1,
            created_by: usuarioData?.email || validation.email,
            updated_by: usuarioData?.email || validation.email,
          }));

        if (navesToInsert.length > 0) {
          const { error: navesError } = await adminClient
            .from('servicios_naves')
            .insert(navesToInsert);

          if (navesError) {
            console.error('Error actualizando naves:', navesError);
          }
        }
      }
    }

    // Si se proporcionaron escalas, actualizar la relación
    if (escalas !== undefined && Array.isArray(escalas)) {
      // Eliminar todas las escalas existentes
      await adminClient
        .from('servicios_escalas')
        .delete()
        .eq('servicio_id', id);

      // Insertar las nuevas escalas
      if (escalas.length > 0) {
        const escalasToInsert = escalas
          .filter((escala: any) => escala && escala.puerto && escala.puerto.trim())
          .map((escala: any, index: number) => ({
            servicio_id: id,
            puerto: escala.puerto.trim(),
            puerto_nombre: escala.puerto_nombre?.trim() || escala.puerto.trim(),
            area: escala.area || 'ASIA',
            orden: escala.orden !== undefined ? escala.orden : index + 1,
            activo: escala.activo !== undefined ? escala.activo : true,
            created_by: usuarioData?.email || validation.email,
            updated_by: usuarioData?.email || validation.email,
          }));

        if (escalasToInsert.length > 0) {
          const { error: escalasError } = await adminClient
            .from('servicios_escalas')
            .insert(escalasToInsert);

          if (escalasError) {
            console.error('Error actualizando escalas:', escalasError);
          }
        }
      }
    }

    // Obtener el servicio completo con naves
    const { data: servicioCompleto, error: fetchError } = await adminClient
      .from('servicios')
      .select(`
        *,
        naves:servicios_naves(
          id,
          nave_nombre,
          activo,
          orden
        )
      `)
      .eq('id', id)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 400 });
    }

    // Intentar cargar escalas si la tabla existe
    let escalasData: any[] = [];
    try {
      const { data } = await adminClient
        .from('servicios_escalas')
        .select('id, puerto, puerto_nombre, area, orden, activo')
        .eq('servicio_id', id)
        .eq('activo', true)
        .order('orden', { ascending: true });
      escalasData = data || [];
    } catch (error) {
      // Si la tabla no existe, continuar sin escalas
      escalasData = [];
    }

    return NextResponse.json({
      success: true,
      message: 'Servicio actualizado exitosamente.',
      servicio: {
        ...servicioCompleto,
        naves: servicioCompleto.naves?.sort((a: any, b: any) => a.orden - b.orden) || [],
        escalas: escalasData.sort((a: any, b: any) => a.orden - b.orden) || []
      },
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: error?.message || 'Error inesperado.',
      details: error 
    }, { status: 500 });
  }
}

// DELETE - Eliminar un servicio (soft delete marcando como inactivo)
export async function DELETE(request: Request) {
  try {
    const validation = await validateAdmin();
    if (!validation.ok) {
      return NextResponse.json({ error: validation.message }, { status: validation.status });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'El ID del servicio es requerido.' }, { status: 400 });
    }

    const adminClient = getAdminClient();

    // Obtener información del usuario para auditoría
    const { data: usuarioData } = await adminClient
      .from('usuarios')
      .select('id, nombre, email')
      .eq('auth_user_id', validation.userId)
      .single();

    // Marcar como inactivo en lugar de eliminar
    const { error: deleteError } = await adminClient
      .from('servicios')
      .update({
        activo: false,
        updated_by: usuarioData?.email || validation.email,
      })
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Servicio eliminado (marcado como inactivo) exitosamente.',
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: error?.message || 'Error inesperado.',
      details: error 
    }, { status: 500 });
  }
}
