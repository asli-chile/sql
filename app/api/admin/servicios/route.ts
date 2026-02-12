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

// GET - Obtener todos los servicios con sus naves y escalas
export async function GET() {
  try {
    const validation = await validateAdmin();
    if (!validation.ok) {
      return NextResponse.json({ error: validation.message }, { status: validation.status });
    }

    const adminClient = getAdminClient();

    // Obtener servicios con sus naves
    const { data: servicios, error: serviciosError } = await adminClient
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
      .order('nombre', { ascending: true });

    if (serviciosError) {
      return NextResponse.json({ 
        error: serviciosError.message,
        code: serviciosError.code,
      }, { status: 400 });
    }

    // Cargar escalas para cada servicio
    const serviciosConEscalas = await Promise.all(
      (servicios || []).map(async (servicio: any) => {
        try {
          // Verificar si la tabla existe
          const { data: escalasData, error: escalasError } = await adminClient
            .from('servicios_escalas')
            .select('id, puerto, puerto_nombre, area, orden, activo')
            .eq('servicio_id', servicio.id)
            .order('orden', { ascending: true });
          
          if (escalasError) {
            if (escalasError.message.includes('Could not find the table')) {
              // La tabla servicios_escalas no existe
              return { ...servicio, escalas: [] };
            }
            // Error cargando escalas
            return { ...servicio, escalas: [] };
          }
          
          // Escalas cargadas
          return { ...servicio, escalas: escalasData || [] };
        } catch (error: any) {
          if (error?.message?.includes('Could not find the table')) {
            console.warn(`⚠️ La tabla servicios_escalas no existe para servicio ${servicio.nombre}`);
            return { ...servicio, escalas: [] };
          }
          console.warn(`Error cargando escalas para servicio ${servicio.nombre} (${servicio.id}):`, error);
          return { ...servicio, escalas: [] };
        }
      })
    );

    // Ordenar servicios: activos primero, luego por nombre
    const serviciosOrdenados = serviciosConEscalas?.sort((a: any, b: any) => {
      if (a.activo !== b.activo) {
        return a.activo ? -1 : 1;
      }
      return (a.nombre || '').localeCompare(b.nombre || '');
    });

    // Procesar y ordenar naves y escalas dentro de cada servicio
    // IMPORTANTE: Incluir TODAS las escalas (activas e inactivas) para que el frontend pueda validarlas
    const resultado = serviciosOrdenados?.map((servicio: any) => {
      const navesOrdenadas = servicio.naves
        ?.filter((n: any) => n.activo !== false)
        .sort((a: any, b: any) => (a.orden || 0) - (b.orden || 0)) || [];
      
      // Incluir todas las escalas, no solo las activas, para que el frontend pueda validar
      const escalasOrdenadas = servicio.escalas
        ?.sort((a: any, b: any) => (a.orden || 0) - (b.orden || 0)) || [];

      return {
        ...servicio,
        naves: navesOrdenadas,
        escalas: escalasOrdenadas // Incluir todas las escalas
      };
    });

    return NextResponse.json({
      success: true,
      servicios: resultado || [],
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

    console.log('🔍 Verificando servicio existente:', { nombre: nombre.trim() });
    
    // Verificar si existe un servicio con ese nombre (activo o inactivo)
    const { data: servicioExistente, error: servicioExistenteError } = await adminClient
      .from('servicios')
      .select('id, nombre, activo')
      .eq('nombre', nombre.trim())
      .maybeSingle();

    if (servicioExistenteError) {
      console.error('Error verificando servicio existente:', servicioExistenteError);
    }


    let servicioData: any;
    let esServicioReactivado = false;

    if (servicioExistente) {
      if (servicioExistente.activo) {
        return NextResponse.json({ 
          error: 'Ya existe un servicio activo con ese nombre. Por favor, usa un nombre diferente o edita el servicio existente.' 
        }, { status: 400 });
      } else {
        // Si existe pero está inactivo, reactivarlo y actualizarlo
        esServicioReactivado = true;
        const { data: servicioActualizado, error: updateError } = await adminClient
          .from('servicios')
          .update({
            consorcio: consorcio?.trim() || null,
            descripcion: descripcion?.trim() || null,
            activo: true,
            updated_by: usuarioData?.email || validation.email,
          })
          .eq('id', servicioExistente.id)
          .select()
          .single();

        if (updateError) {
          return NextResponse.json({ error: updateError.message }, { status: 400 });
        }

        servicioData = servicioActualizado;

        // Si es un servicio reactivado, eliminar naves y escalas antiguas
        await adminClient
          .from('servicios_naves')
          .delete()
          .eq('servicio_id', servicioData.id);
        
        await adminClient
          .from('servicios_escalas')
          .delete()
          .eq('servicio_id', servicioData.id);
      }
    } else {
      // Crear el servicio nuevo
      const { data: servicioNuevo, error: servicioError } = await adminClient
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
        return NextResponse.json({ error: servicioError.message }, { status: 400 });
      }

      servicioData = servicioNuevo;
    }

    // Si se proporcionaron naves, asignarlas al servicio
    if (naves && Array.isArray(naves) && naves.length > 0) {
      // Manejar tanto array de strings como array de objetos
      const navesToInsert = naves
        .filter((nave: any) => {
          // Si es string, verificar que no esté vacío
          if (typeof nave === 'string') return nave.trim();
          // Si es objeto, verificar que tenga nave_nombre
          if (typeof nave === 'object' && nave !== null) return nave.nave_nombre && nave.nave_nombre.trim();
          return false;
        })
        .map((nave: any, index: number) => {
          // Extraer el nombre de la nave (puede ser string o objeto)
          const naveNombre = typeof nave === 'string' ? nave.trim() : nave.nave_nombre.trim();
          return {
            servicio_id: servicioData.id,
            nave_nombre: naveNombre,
            activo: nave.activo !== undefined ? nave.activo : true,
            orden: nave.orden !== undefined ? nave.orden : index + 1,
            created_by: usuarioData?.email || validation.email,
            updated_by: usuarioData?.email || validation.email,
          };
        });

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
      
      try {
        // Verificar si la tabla existe
        const { error: tableCheckError } = await adminClient
          .from('servicios_escalas')
          .select('id')
          .limit(1);

        if (tableCheckError && tableCheckError.message.includes('Could not find the table')) {
          // La tabla servicios_escalas no existe. Las escalas no se guardarán.
          // Continuar sin error, simplemente no guardar las escalas
        } else {
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

          console.log('📝 Escalas a insertar:', escalasToInsert);

          if (escalasToInsert.length > 0) {
            const { data: escalasInsertadas, error: escalasError } = await adminClient
              .from('servicios_escalas')
              .insert(escalasToInsert)
              .select();

            if (escalasError) {
              if (escalasError.message.includes('Could not find the table')) {
                console.warn('⚠️ La tabla servicios_escalas no existe. Las escalas no se guardarán.');
                console.warn('💡 Ejecuta el script: scripts/create-servicios-escalas-table.sql para crear la tabla.');
                // Continuar sin error
              } else {
                console.error('❌ Error asignando escalas:', escalasError);
                return NextResponse.json({ 
                  error: `Error al guardar escalas: ${escalasError.message}` 
                }, { status: 400 });
              }
            } else {
            }
          } else {
            console.warn('⚠️ No hay escalas válidas para insertar después del filtrado');
          }
        }
      } catch (error: any) {
        console.warn('⚠️ Error al procesar escalas (la tabla puede no existir):', error);
        // Continuar sin error, simplemente no guardar las escalas
      }
    } else {
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
      message: esServicioReactivado ? 'Servicio reactivado exitosamente.' : 'Servicio creado exitosamente.',
      servicio: {
        ...servicioCompleto,
        naves: servicioCompleto.naves?.sort((a: any, b: any) => a.orden - b.orden) || [],
        escalas: escalasData.sort((a: any, b: any) => a.orden - b.orden) || []
      },
      reactivado: esServicioReactivado
    });
  } catch (error: any) {
    console.error('❌ Error en POST /api/admin/servicios:', error);
    return NextResponse.json({ 
      error: error?.message || 'Error inesperado al crear el servicio.',
      details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
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

    // Obtener el servicio actual antes de actualizarlo para comparar cambios
    const { data: servicioAnterior, error: fetchAnteriorError } = await adminClient
      .from('servicios')
      .select('nombre, consorcio')
      .eq('id', id)
      .single();

    if (fetchAnteriorError) {
      return NextResponse.json({ error: 'No se encontró el servicio a actualizar.' }, { status: 404 });
    }

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
      
      try {
        // Verificar si la tabla existe intentando hacer una consulta simple
        const { error: tableCheckError } = await adminClient
          .from('servicios_escalas')
          .select('id')
          .limit(1);

        if (tableCheckError && tableCheckError.message.includes('Could not find the table')) {
          // La tabla servicios_escalas no existe. Las escalas no se guardarán.
          // Continuar sin error, simplemente no guardar las escalas
        } else {
          // Eliminar todas las escalas existentes
          const { error: deleteError } = await adminClient
            .from('servicios_escalas')
            .delete()
            .eq('servicio_id', id);

          if (deleteError && !deleteError.message.includes('Could not find the table')) {
            console.error('❌ Error eliminando escalas antiguas:', deleteError);
          }

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
              const { data: escalasInsertadas, error: escalasError } = await adminClient
                .from('servicios_escalas')
                .insert(escalasToInsert)
                .select();

              if (escalasError) {
                if (escalasError.message.includes('Could not find the table')) {
                  console.warn('⚠️ La tabla servicios_escalas no existe. Las escalas no se guardarán.');
                  console.warn('💡 Ejecuta el script: scripts/create-servicios-escalas-table.sql para crear la tabla.');
                  // Continuar sin error
                } else {
                  console.error('❌ Error actualizando escalas:', escalasError);
                  return NextResponse.json({ 
                    error: `Error al actualizar escalas: ${escalasError.message}` 
                  }, { status: 400 });
                }
              } else {
              }
            } else {
            }
          } else {
          }
        }
      } catch (error: any) {
        // Error al procesar escalas (la tabla puede no existir)
        // Continuar sin error, simplemente no guardar las escalas
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

    // Actualizar itinerarios relacionados si el nombre del servicio cambió
    if (nombre !== undefined && nombre.trim() !== servicioAnterior.nombre) {
      try {
        const nombreAnterior = servicioAnterior.nombre;
        const nuevoNombre = nombre.trim();

        // Buscar itinerarios que usan este servicio por servicio_id
        const { data: itinerariosPorId, error: errorPorId } = await adminClient
          .from('itinerarios')
          .select('id, servicio')
          .eq('servicio_id', id);

        if (!errorPorId && itinerariosPorId && itinerariosPorId.length > 0) {
          // Actualizar el campo servicio en los itinerarios
          const { error: updateError } = await adminClient
            .from('itinerarios')
            .update({ 
              servicio: nuevoNombre,
              updated_by: usuarioData?.email || validation.email,
              updated_at: new Date().toISOString()
            })
            .eq('servicio_id', id);

          if (updateError) {
            // Error actualizando nombre del servicio en itinerarios
          } else {
          }
        }

        // También buscar itinerarios que usan este servicio por nombre (compatibilidad)
        const { data: itinerariosPorNombre, error: errorPorNombre } = await adminClient
          .from('itinerarios')
          .select('id, servicio')
          .eq('servicio', nombreAnterior);

        if (!errorPorNombre && itinerariosPorNombre && itinerariosPorNombre.length > 0) {
          // Actualizar el campo servicio en los itinerarios y asignar servicio_id si no lo tienen
          const { error: updateErrorNombre } = await adminClient
            .from('itinerarios')
            .update({ 
              servicio: nuevoNombre,
              servicio_id: id, // Asignar servicio_id si no lo tenía
              updated_by: usuarioData?.email || validation.email,
              updated_at: new Date().toISOString()
            })
            .eq('servicio', nombreAnterior);

          if (updateErrorNombre) {
            console.warn('⚠️ Error actualizando nombre del servicio en itinerarios (por nombre):', updateErrorNombre);
          } else {
          }
        }
      } catch (error: any) {
        // Error al actualizar itinerarios relacionados
        // No fallar la actualización del servicio si falla la actualización de itinerarios
      }
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

// DELETE - Eliminar un servicio definitivamente
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

    // Verificar si el servicio tiene itinerarios asociados
    const { data: itinerarios, error: itinerariosError } = await adminClient
      .from('itinerarios')
      .select('id')
      .eq('servicio_id', id)
      .limit(1);

    if (itinerariosError) {
      // Error verificando itinerarios
    }

    if (itinerarios && itinerarios.length > 0) {
      return NextResponse.json({ 
        error: 'No se puede eliminar el servicio porque tiene itinerarios asociados. Elimina primero los itinerarios relacionados.' 
      }, { status: 400 });
    }

    // Eliminar definitivamente el servicio (CASCADE eliminará automáticamente naves y escalas)
    const { error: deleteError } = await adminClient
      .from('servicios')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Servicio eliminado definitivamente.',
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: error?.message || 'Error inesperado.',
      details: error 
    }, { status: 500 });
  }
}
