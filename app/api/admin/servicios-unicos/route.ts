import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase-server';

// Cliente admin para operaciones que requieren permisos elevados
const getAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  return createAdminClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};

// Validar usuario autenticado
const validateUser = async () => {
  const supabase = await createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return { ok: false, message: 'No autenticado', status: 401 };
  }
  
  return { ok: true, userId: user.id };
};

// GET: Obtener todos los servicios únicos
export async function GET() {
  try {
    const validation = await validateUser();
    if (!validation.ok) {
      return NextResponse.json({ error: validation.message }, { status: validation.status });
    }

    let adminClient;
    try {
      adminClient = getAdminClient();
    } catch (clientError: any) {
      console.error('Error obteniendo admin client:', clientError);
      return NextResponse.json({ 
        error: 'Error al inicializar cliente de base de datos',
        details: clientError?.message 
      }, { status: 500 });
    }

    // Obtener servicios únicos
    const { data: servicios, error: serviciosError } = await adminClient
      .from('servicios_unicos')
      .select('*')
      .order('nombre', { ascending: true });

    if (serviciosError) {
      console.error('Error obteniendo servicios únicos:', serviciosError);
      
      // Verificar si el error es porque la tabla no existe
      if (serviciosError.message?.includes('does not exist') || 
          serviciosError.message?.includes('schema cache') ||
          serviciosError.code === '42P01') {
        return NextResponse.json({ 
          error: 'La tabla de servicios únicos no existe en la base de datos. Por favor, ejecuta el script SQL de creación: scripts/create-servicios-unicos-table.sql',
          code: 'TABLE_NOT_FOUND',
          details: serviciosError.message 
        }, { status: 500 });
      }
      
      return NextResponse.json({ 
        error: serviciosError.message,
        code: serviciosError.code 
      }, { status: 400 });
    }

    // Obtener todas las navieras para mapear
    const navieraIds = [...new Set((servicios || []).map((s: any) => s.naviera_id).filter(Boolean))];
    const navierasMap: Record<string, any> = {};
    
    if (navieraIds.length > 0) {
      const { data: navieras, error: navierasError } = await adminClient
        .from('catalogos_navieras')
        .select('id, nombre')
        .in('id', navieraIds);
      
      if (!navierasError && navieras) {
        navieras.forEach((nav: any) => {
          navierasMap[nav.id] = nav;
        });
      }
    }

    // Obtener naves y destinos para cada servicio
    const serviciosConDetalles = await Promise.all(
      (servicios || []).map(async (servicio: any) => {
        // Obtener naves
        const { data: naves } = await adminClient
          .from('servicios_unicos_naves')
          .select('*')
          .eq('servicio_unico_id', servicio.id)
          .eq('activo', true)
          .order('orden', { ascending: true });

        // Obtener destinos
        const { data: destinos } = await adminClient
          .from('servicios_unicos_destinos')
          .select('*')
          .eq('servicio_unico_id', servicio.id)
          .eq('activo', true)
          .order('orden', { ascending: true });

        const navieraInfo = navierasMap[servicio.naviera_id];

        return {
          ...servicio,
          naviera: navieraInfo ? { id: navieraInfo.id, nombre: navieraInfo.nombre } : null,
          naviera_nombre: navieraInfo?.nombre || null,
          naves: naves || [],
          destinos: destinos || [],
        };
      })
    );

    return NextResponse.json({
      success: true,
      servicios: serviciosConDetalles,
    });
  } catch (error: any) {
    console.error('Error obteniendo servicios únicos:', error);
    return NextResponse.json({
      error: error?.message || 'Error inesperado al obtener servicios únicos',
      details: error?.stack || error
    }, { status: 500 });
  }
}

// POST: Crear un nuevo servicio único
export async function POST(request: Request) {
  try {
    const validation = await validateUser();
    if (!validation.ok) {
      return NextResponse.json({ error: validation.message }, { status: validation.status });
    }

    const body = await request.json();
    const { nombre, naviera_id, descripcion, puerto_origen, naves, destinos } = body;

    // Validaciones
    if (!nombre || !nombre.trim()) {
      return NextResponse.json({ error: 'El nombre del servicio es requerido' }, { status: 400 });
    }

    if (!naviera_id) {
      return NextResponse.json({ error: 'La naviera es requerida' }, { status: 400 });
    }

    if (!naves || naves.length === 0) {
      return NextResponse.json({ error: 'Debe asignar al menos una nave' }, { status: 400 });
    }

    if (!destinos || destinos.length === 0) {
      return NextResponse.json({ error: 'Debe asignar al menos un destino' }, { status: 400 });
    }

    if (!puerto_origen || !puerto_origen.trim()) {
      return NextResponse.json({ error: 'El puerto de origen es requerido' }, { status: 400 });
    }

    const adminClient = getAdminClient();

    // Verificar que la naviera existe
    const { data: navieraVerificada, error: navieraError } = await adminClient
      .from('catalogos_navieras')
      .select('id, nombre')
      .eq('id', naviera_id)
      .eq('activo', true)
      .single();

    if (navieraError || !navieraVerificada) {
      return NextResponse.json({ error: 'La naviera seleccionada no existe o está inactiva' }, { status: 400 });
    }

    // Verificar que el nombre no existe para esta naviera
    const { data: servicioExistente } = await adminClient
      .from('servicios_unicos')
      .select('id')
      .eq('naviera_id', naviera_id)
      .eq('nombre', nombre.trim())
      .single();

    if (servicioExistente) {
      return NextResponse.json({ 
        error: `Ya existe un servicio con el nombre "${nombre}" para la naviera ${navieraVerificada.nombre}` 
      }, { status: 400 });
    }

    // Crear servicio único
    const { data: nuevoServicio, error: servicioError } = await adminClient
      .from('servicios_unicos')
      .insert({
        nombre: nombre.trim(),
        naviera_id,
        descripcion: descripcion?.trim() || null,
        puerto_origen: puerto_origen.trim(),
        activo: true,
      })
      .select()
      .single();

    if (servicioError || !nuevoServicio) {
      return NextResponse.json({ 
        error: servicioError?.message || 'Error al crear el servicio único' 
      }, { status: 400 });
    }

    // Crear/verificar naves en catálogo si no existen
    for (const naveNombre of naves) {
      const naveNombreTrim = naveNombre.trim();
      
      // Verificar si la nave existe en el catálogo para esta naviera
      const { data: naveExistente } = await adminClient
        .from('catalogos_naves')
        .select('id')
        .eq('nombre', naveNombreTrim)
        .eq('naviera_nombre', navieraVerificada.nombre)
        .single();

      // Si no existe, crearla
      if (!naveExistente) {
        const { error: crearNaveError } = await adminClient
          .from('catalogos_naves')
          .insert({
            nombre: naveNombreTrim,
            naviera_nombre: navieraVerificada.nombre,
            activo: true,
          });

        if (crearNaveError) {
          console.warn(`No se pudo crear la nave ${naveNombreTrim} en el catálogo:`, crearNaveError);
          // Continuar de todas formas, no es crítico
        }
      }
    }

    // Crear naves
    const navesToInsert = naves.map((naveNombre: string, index: number) => ({
      servicio_unico_id: nuevoServicio.id,
      nave_nombre: naveNombre.trim(),
      activo: true,
      orden: index,
    }));

    const { error: navesError } = await adminClient
      .from('servicios_unicos_naves')
      .insert(navesToInsert);

    if (navesError) {
      // Rollback: eliminar servicio creado
      await adminClient.from('servicios_unicos').delete().eq('id', nuevoServicio.id);
      return NextResponse.json({ 
        error: `Error al asignar naves: ${navesError.message}` 
      }, { status: 400 });
    }

    // Crear/verificar destinos en catálogo si no existen
    for (const destino of destinos) {
      const puertoCodigo = destino.puerto.trim();
      
      // Verificar si el destino existe en el catálogo
      const { data: destinoExistente } = await adminClient
        .from('catalogos_destinos')
        .select('id')
        .eq('nombre', puertoCodigo)
        .single();

      // Si no existe, crearlo
      if (!destinoExistente) {
        const { error: crearDestinoError } = await adminClient
          .from('catalogos_destinos')
          .insert({
            nombre: puertoCodigo,
            activo: true,
          });

        if (crearDestinoError) {
          console.warn(`No se pudo crear el destino ${puertoCodigo} en el catálogo:`, crearDestinoError);
          // Continuar de todas formas, no es crítico
        }
      }
    }

    // Crear destinos
    const destinosToInsert = destinos.map((destino: any) => ({
      servicio_unico_id: nuevoServicio.id,
      puerto: destino.puerto.trim(),
      puerto_nombre: destino.puerto_nombre?.trim() || null,
      area: destino.area || 'ASIA',
      orden: destino.orden || 0,
      activo: true,
    }));

    const { error: destinosError } = await adminClient
      .from('servicios_unicos_destinos')
      .insert(destinosToInsert);

    if (destinosError) {
      // Rollback: eliminar servicio y naves creadas
      await adminClient.from('servicios_unicos_naves').delete().eq('servicio_unico_id', nuevoServicio.id);
      await adminClient.from('servicios_unicos').delete().eq('id', nuevoServicio.id);
      return NextResponse.json({ 
        error: `Error al asignar destinos: ${destinosError.message}` 
      }, { status: 400 });
    }

    // Obtener servicio completo con detalles
    const { data: servicioCompleto } = await adminClient
      .from('servicios_unicos')
      .select('*')
      .eq('id', nuevoServicio.id)
      .single();

    // Obtener naviera
    const { data: navieraData } = await adminClient
      .from('catalogos_navieras')
      .select('id, nombre')
      .eq('id', servicioCompleto?.naviera_id)
      .single();

    const { data: navesCompletas } = await adminClient
      .from('servicios_unicos_naves')
      .select('*')
      .eq('servicio_unico_id', nuevoServicio.id)
      .order('orden', { ascending: true });

    const { data: destinosCompletos } = await adminClient
      .from('servicios_unicos_destinos')
      .select('*')
      .eq('servicio_unico_id', nuevoServicio.id)
      .order('orden', { ascending: true });

    return NextResponse.json({
      success: true,
      servicio: {
        ...servicioCompleto,
        naviera: navieraData ? { id: navieraData.id, nombre: navieraData.nombre } : null,
        naviera_nombre: navieraData?.nombre || null,
        naves: navesCompletas || [],
        destinos: destinosCompletos || [],
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creando servicio único:', error);
    return NextResponse.json({
      error: error?.message || 'Error inesperado al crear servicio único',
      details: error
    }, { status: 500 });
  }
}

// PUT: Actualizar un servicio único
export async function PUT(request: Request) {
  try {
    const validation = await validateUser();
    if (!validation.ok) {
      return NextResponse.json({ error: validation.message }, { status: validation.status });
    }

    const body = await request.json();
    console.log('📥 Body recibido en PUT servicios-unicos:', JSON.stringify(body, null, 2));
    const { id, nombre, naviera_id, descripcion, puerto_origen, naves, destinos, activo } = body;

    if (!id) {
      console.log('❌ Error: ID faltante');
      return NextResponse.json({ error: 'El ID del servicio es requerido' }, { status: 400 });
    }

    if (!nombre || !nombre.trim()) {
      console.log('❌ Error: nombre faltante o vacío');
      return NextResponse.json({ error: 'El nombre del servicio es requerido' }, { status: 400 });
    }

    if (!naviera_id) {
      console.log('❌ Error: naviera_id faltante');
      return NextResponse.json({ error: 'La naviera es requerida' }, { status: 400 });
    }

    if (!puerto_origen || !puerto_origen.trim()) {
      console.log('❌ Error: puerto_origen faltante o vacío. Body recibido:', JSON.stringify(body));
      return NextResponse.json({ 
        error: 'El puerto de origen es requerido',
        details: 'El campo puerto_origen es obligatorio. Asegúrate de seleccionar un puerto de origen desde el catálogo de POLs.'
      }, { status: 400 });
    }

    const adminClient = getAdminClient();

    // Verificar que el servicio existe
    const { data: servicioExistente, error: servicioError } = await adminClient
      .from('servicios_unicos')
      .select('*')
      .eq('id', id)
      .single();

    if (servicioError || !servicioExistente) {
      return NextResponse.json({ error: 'El servicio no existe' }, { status: 404 });
    }

    // Verificar unicidad del nombre (si cambió)
    if (nombre.trim() !== servicioExistente.nombre || naviera_id !== servicioExistente.naviera_id) {
      const { data: nombreDuplicado } = await adminClient
        .from('servicios_unicos')
        .select('id')
        .eq('naviera_id', naviera_id)
        .eq('nombre', nombre.trim())
        .neq('id', id)
        .single();

      if (nombreDuplicado) {
        return NextResponse.json({ 
          error: `Ya existe un servicio con el nombre "${nombre}" para esta naviera` 
        }, { status: 400 });
      }
    }

    // Obtener información de la naviera para crear naves si es necesario
    const { data: navieraParaNaves } = await adminClient
      .from('catalogos_navieras')
      .select('nombre')
      .eq('id', naviera_id)
      .single();

    // Crear/verificar naves en catálogo si no existen (si se proporcionaron naves)
    if (naves && Array.isArray(naves) && naves.length > 0 && navieraParaNaves) {
      for (const naveNombre of naves) {
        const naveNombreTrim = naveNombre.trim();
        
        // Verificar si la nave existe en el catálogo para esta naviera
        const { data: naveExistente } = await adminClient
          .from('catalogos_naves')
          .select('id')
          .eq('nombre', naveNombreTrim)
          .eq('naviera_nombre', navieraParaNaves.nombre)
          .single();

        // Si no existe, crearla
        if (!naveExistente) {
          const { error: crearNaveError } = await adminClient
            .from('catalogos_naves')
            .insert({
              nombre: naveNombreTrim,
              naviera_nombre: navieraParaNaves.nombre,
              activo: true,
            });

          if (crearNaveError) {
            console.warn(`No se pudo crear la nave ${naveNombreTrim} en el catálogo:`, crearNaveError);
            // Continuar de todas formas, no es crítico
          }
        }
      }
    }

    // Crear/verificar destinos en catálogo si no existen (si se proporcionaron destinos)
    if (destinos && Array.isArray(destinos) && destinos.length > 0) {
      for (const destino of destinos) {
        const puertoCodigo = destino.puerto.trim();
        
        // Verificar si el destino existe en el catálogo
        const { data: destinoExistente } = await adminClient
          .from('catalogos_destinos')
          .select('id')
          .eq('nombre', puertoCodigo)
          .single();

        // Si no existe, crearlo
        if (!destinoExistente) {
          const { error: crearDestinoError } = await adminClient
            .from('catalogos_destinos')
            .insert({
              nombre: puertoCodigo,
              activo: true,
            });

          if (crearDestinoError) {
            console.warn(`No se pudo crear el destino ${puertoCodigo} en el catálogo:`, crearDestinoError);
            // Continuar de todas formas, no es crítico
          }
        }
      }
    }

    // Actualizar servicio único
    const { error: updateError } = await adminClient
      .from('servicios_unicos')
      .update({
        nombre: nombre.trim(),
        naviera_id,
        descripcion: descripcion?.trim() || null,
        puerto_origen: puerto_origen.trim(),
        activo: activo !== undefined ? activo : servicioExistente.activo,
      })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ 
        error: updateError.message || 'Error al actualizar el servicio' 
      }, { status: 400 });
    }

    // Actualizar naves si se proporcionaron
    if (naves && Array.isArray(naves)) {
      // Eliminar naves existentes
      await adminClient
        .from('servicios_unicos_naves')
        .delete()
        .eq('servicio_unico_id', id);

      // Insertar nuevas naves
      if (naves.length > 0) {
        const navesToInsert = naves.map((naveNombre: string, index: number) => ({
          servicio_unico_id: id,
          nave_nombre: naveNombre.trim(),
          activo: true,
          orden: index,
        }));

        const { error: navesError } = await adminClient
          .from('servicios_unicos_naves')
          .insert(navesToInsert);

        if (navesError) {
          return NextResponse.json({ 
            error: `Error al actualizar naves: ${navesError.message}` 
          }, { status: 400 });
        }
      }
    }

    // Actualizar destinos si se proporcionaron
    if (destinos && Array.isArray(destinos)) {
      // Eliminar destinos existentes
      await adminClient
        .from('servicios_unicos_destinos')
        .delete()
        .eq('servicio_unico_id', id);

      // Insertar nuevos destinos
      if (destinos.length > 0) {
        const destinosToInsert = destinos.map((destino: any) => ({
          servicio_unico_id: id,
          puerto: destino.puerto.trim(),
          puerto_nombre: destino.puerto_nombre?.trim() || null,
          area: destino.area || 'ASIA',
          orden: destino.orden || 0,
          activo: true,
        }));

        const { error: destinosError } = await adminClient
          .from('servicios_unicos_destinos')
          .insert(destinosToInsert);

        if (destinosError) {
          return NextResponse.json({ 
            error: `Error al actualizar destinos: ${destinosError.message}` 
          }, { status: 400 });
        }
      }
    }

    // Obtener servicio actualizado
    const { data: servicioActualizado } = await adminClient
      .from('servicios_unicos')
      .select('*')
      .eq('id', id)
      .single();

    // Obtener naviera completa para la respuesta
    const { data: navieraInfo } = await adminClient
      .from('catalogos_navieras')
      .select('id, nombre')
      .eq('id', servicioActualizado?.naviera_id)
      .single();

    const { data: navesActualizadas } = await adminClient
      .from('servicios_unicos_naves')
      .select('*')
      .eq('servicio_unico_id', id)
      .order('orden', { ascending: true });

    const { data: destinosActualizados } = await adminClient
      .from('servicios_unicos_destinos')
      .select('*')
      .eq('servicio_unico_id', id)
      .order('orden', { ascending: true });

    return NextResponse.json({
      success: true,
      servicio: {
        ...servicioActualizado,
        naviera: navieraInfo ? { id: navieraInfo.id, nombre: navieraInfo.nombre } : null,
        naviera_nombre: navieraInfo?.nombre || null,
        naves: navesActualizadas || [],
        destinos: destinosActualizados || [],
      },
    });
  } catch (error: any) {
    console.error('Error actualizando servicio único:', error);
    return NextResponse.json({
      error: error?.message || 'Error inesperado al actualizar servicio único',
      details: error
    }, { status: 500 });
  }
}

// DELETE: Eliminar un servicio único
export async function DELETE(request: Request) {
  try {
    const validation = await validateUser();
    if (!validation.ok) {
      return NextResponse.json({ error: validation.message }, { status: validation.status });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'El ID del servicio es requerido' }, { status: 400 });
    }

    const adminClient = getAdminClient();

    // Verificar que el servicio existe
    const { data: servicio, error: servicioError } = await adminClient
      .from('servicios_unicos')
      .select('id')
      .eq('id', id)
      .single();

    if (servicioError || !servicio) {
      return NextResponse.json({ error: 'El servicio no existe' }, { status: 404 });
    }

    // Verificar si el servicio está siendo usado en consorcios
    const { data: consorciosUsandoServicio } = await adminClient
      .from('consorcios_servicios')
      .select('consorcio_id')
      .eq('servicio_unico_id', id)
      .limit(1);

    if (consorciosUsandoServicio && consorciosUsandoServicio.length > 0) {
      return NextResponse.json({ 
        error: 'No se puede eliminar el servicio porque está siendo usado en uno o más consorcios. Desactívelo en su lugar.' 
      }, { status: 400 });
    }

    // Eliminar servicio (CASCADE eliminará naves y destinos)
    const { error: deleteError } = await adminClient
      .from('servicios_unicos')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json({ 
        error: deleteError.message || 'Error al eliminar el servicio' 
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Servicio eliminado correctamente',
    });
  } catch (error: any) {
    console.error('Error eliminando servicio único:', error);
    return NextResponse.json({
      error: error?.message || 'Error inesperado al eliminar servicio único',
      details: error
    }, { status: 500 });
  }
}
