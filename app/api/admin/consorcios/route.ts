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

// GET: Obtener todos los consorcios
export async function GET() {
  try {
    const validation = await validateUser();
    if (!validation.ok) {
      return NextResponse.json({ error: validation.message }, { status: validation.status });
    }

    const adminClient = getAdminClient();

    // Obtener consorcios
    const { data: consorcios, error: consorciosError } = await adminClient
      .from('consorcios')
      .select('*')
      .order('nombre', { ascending: true });

    if (consorciosError) {
      return NextResponse.json({ 
        error: consorciosError.message,
        code: consorciosError.code 
      }, { status: 400 });
    }

    // Obtener servicios y destinos para cada consorcio
    const consorciosConDetalles = await Promise.all(
      (consorcios || []).map(async (consorcio: any) => {
        // Obtener servicios únicos del consorcio
        const { data: consorcioServicios } = await adminClient
          .from('consorcios_servicios')
          .select(`
            *,
            servicio_unico:servicios_unicos (
              *,
              naviera:naviera_id (
                id,
                nombre
              )
            )
          `)
          .eq('consorcio_id', consorcio.id)
          .eq('activo', true)
          .order('orden', { ascending: true });

        // Obtener naves y destinos para cada servicio único
        const serviciosConNaves = await Promise.all(
          (consorcioServicios || []).map(async (cs: any) => {
            if (!cs.servicio_unico) return cs;

            // Obtener naves del servicio único
            const { data: naves } = await adminClient
              .from('servicios_unicos_naves')
              .select('*')
              .eq('servicio_unico_id', cs.servicio_unico.id)
              .eq('activo', true)
              .order('orden', { ascending: true });

            // Obtener destinos del servicio único
            const { data: destinos } = await adminClient
              .from('servicios_unicos_destinos')
              .select('*')
              .eq('servicio_unico_id', cs.servicio_unico.id)
              .eq('activo', true)
              .order('orden', { ascending: true });

            // Obtener nombre de naviera
            const navieraNombre = cs.servicio_unico?.naviera?.nombre || null;
            
            return {
              ...cs,
              servicio_unico: {
                ...cs.servicio_unico,
                naviera_nombre: navieraNombre, // Agregar naviera_nombre para facilitar acceso
                naviera: cs.servicio_unico.naviera, // Mantener objeto naviera también
                naves: naves || [],
                destinos: destinos || [],
              },
            };
          })
        );

        // Obtener destinos activos del consorcio
        const { data: destinosActivos } = await adminClient
          .from('consorcios_destinos_activos')
          .select(`
            *,
            destino:servicios_unicos_destinos (*)
          `)
          .eq('consorcio_id', consorcio.id)
          .eq('activo', true)
          .order('orden', { ascending: true });

        return {
          ...consorcio,
          servicios: serviciosConNaves,
          destinos_activos: destinosActivos || [],
        };
      })
    );

    return NextResponse.json({
      success: true,
      consorcios: consorciosConDetalles,
    });
  } catch (error: any) {
    console.error('Error obteniendo consorcios:', error);
    return NextResponse.json({
      error: error?.message || 'Error inesperado al obtener consorcios',
      details: error
    }, { status: 500 });
  }
}

// POST: Crear un nuevo consorcio
export async function POST(request: Request) {
  try {
    const validation = await validateUser();
    if (!validation.ok) {
      return NextResponse.json({ error: validation.message }, { status: validation.status });
    }

    const body = await request.json();
    const { nombre, descripcion, servicios_unicos } = body;

    // Validaciones
    if (!nombre || !nombre.trim()) {
      return NextResponse.json({ error: 'El nombre del consorcio es requerido' }, { status: 400 });
    }

    if (!servicios_unicos || !Array.isArray(servicios_unicos) || servicios_unicos.length === 0) {
      return NextResponse.json({ 
        error: 'Debe incluir al menos un servicio único',
        details: `servicios_unicos recibido: ${JSON.stringify(servicios_unicos)}`
      }, { status: 400 });
    }

    // Validar estructura de servicios_unicos
    for (const servicio of servicios_unicos) {
      if (!servicio.servicio_unico_id) {
        return NextResponse.json({ 
          error: 'Cada servicio único debe tener un servicio_unico_id',
          details: `Servicio inválido: ${JSON.stringify(servicio)}`
        }, { status: 400 });
      }
    }

    const adminClient = getAdminClient();

    // Verificar que el nombre no existe
    const { data: consorcioExistente } = await adminClient
      .from('consorcios')
      .select('id')
      .eq('nombre', nombre.trim())
      .single();

    if (consorcioExistente) {
      return NextResponse.json({ 
        error: `Ya existe un consorcio con el nombre "${nombre}"` 
      }, { status: 400 });
    }

    // Validar que todos los servicios únicos existen y están activos
    const servicioUnicoIds = servicios_unicos.map((s: any) => s.servicio_unico_id);
    
    const { data: serviciosValidos, error: serviciosError } = await adminClient
      .from('servicios_unicos')
      .select('id, nombre, activo')
      .in('id', servicioUnicoIds);

    if (serviciosError) {
      return NextResponse.json({ 
        error: 'Error al validar servicios únicos',
        details: serviciosError.message
      }, { status: 400 });
    }

    if (!serviciosValidos || serviciosValidos.length !== servicioUnicoIds.length) {
      return NextResponse.json({ 
        error: 'Uno o más servicios únicos no existen',
        details: `IDs esperados: ${servicioUnicoIds.join(', ')}, IDs encontrados: ${serviciosValidos?.map((s: any) => s.id).join(', ') || 'ninguno'}`
      }, { status: 400 });
    }

    // Verificar que no hay servicios inactivos
    const serviciosInactivos = serviciosValidos.filter((s: any) => !s.activo);
    if (serviciosInactivos.length > 0) {
      return NextResponse.json({ 
        error: `Los siguientes servicios están inactivos: ${serviciosInactivos.map((s: any) => s.nombre).join(', ')}` 
      }, { status: 400 });
    }

    // Verificar que no hay servicios duplicados
    const idsUnicos = new Set(servicioUnicoIds);
    if (idsUnicos.size !== servicioUnicoIds.length) {
      return NextResponse.json({ 
        error: 'No se puede incluir el mismo servicio único dos veces en un consorcio' 
      }, { status: 400 });
    }

    // Crear consorcio
    const { data: nuevoConsorcio, error: consorcioError } = await adminClient
      .from('consorcios')
      .insert({
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || null,
        activo: true,
        requiere_revision: false,
      })
      .select()
      .single();

    if (consorcioError || !nuevoConsorcio) {
      return NextResponse.json({ 
        error: consorcioError?.message || 'Error al crear el consorcio',
        details: consorcioError?.details || consorcioError?.hint || JSON.stringify(consorcioError)
      }, { status: 400 });
    }

    // Crear relaciones con servicios únicos
    const consorcioServiciosToInsert = servicios_unicos.map((servicio: any, index: number) => ({
      consorcio_id: nuevoConsorcio.id,
      servicio_unico_id: servicio.servicio_unico_id,
      orden: servicio.orden !== undefined ? servicio.orden : index,
      activo: true,
    }));

    const { error: serviciosInsertError } = await adminClient
      .from('consorcios_servicios')
      .insert(consorcioServiciosToInsert);

    if (serviciosInsertError) {
      // Rollback: eliminar consorcio creado
      await adminClient.from('consorcios').delete().eq('id', nuevoConsorcio.id);
      return NextResponse.json({ 
        error: `Error al asociar servicios: ${serviciosInsertError.message}` 
      }, { status: 400 });
    }

    // Crear destinos activos - CONSOLIDAR DESTINOS ÚNICOS
    // Recopilar todos los destinos de todos los servicios únicos
    const todosLosDestinos: Map<string, { destino_id: string; orden: number; servicio_unico_id: string }> = new Map();

    for (const servicio of servicios_unicos) {
      const servicioUnicoId = servicio.servicio_unico_id;
      
      // Obtener destinos del servicio único
      const { data: destinosDelServicio } = await adminClient
        .from('servicios_unicos_destinos')
        .select('*')
        .eq('servicio_unico_id', servicioUnicoId)
        .eq('activo', true)
        .order('orden', { ascending: true });

      if (destinosDelServicio && destinosDelServicio.length > 0) {
        // Si se especificaron destinos activos, usar esos
        // Si no, usar todos los destinos del servicio
        const destinosSeleccionados = servicio.destinos_activos && servicio.destinos_activos.length > 0
          ? servicio.destinos_activos
          : destinosDelServicio.map((d: any) => ({ destino_id: d.id, orden: d.orden }));

        // Agregar destinos al mapa (solo si no existe ya - destinos únicos por destino_id)
        destinosSeleccionados.forEach((destinoConfig: any, index: number) => {
          const destinoId = typeof destinoConfig === 'string' 
            ? destinoConfig 
            : destinoConfig.destino_id;
          
          const destinoOriginal = destinosDelServicio.find((d: any) => d.id === destinoId);
          
          // Si el destino_id no existe en el mapa, agregarlo (consolidación de duplicados)
          if (!todosLosDestinos.has(destinoId)) {
            todosLosDestinos.set(destinoId, {
              destino_id: destinoId,
              orden: destinoConfig.orden !== undefined ? destinoConfig.orden : (destinoOriginal?.orden || index),
              servicio_unico_id: servicioUnicoId, // Guardar el primer servicio que tiene este destino
            });
          }
        });
      }
    }

    // Convertir mapa a array y ordenar por orden
    const destinosUnicosArray = Array.from(todosLosDestinos.values())
      .sort((a, b) => a.orden - b.orden)
      .map((destino, index) => ({
        consorcio_id: nuevoConsorcio.id,
        servicio_unico_id: destino.servicio_unico_id,
        destino_id: destino.destino_id,
        activo: true,
        orden: index, // Reordenar secuencialmente desde 0
      }));


    // Insertar destinos activos únicos si hay alguno
    if (destinosUnicosArray.length > 0) {
      
      const { error: destinosError } = await adminClient
        .from('consorcios_destinos_activos')
        .insert(destinosUnicosArray);

      if (destinosError) {
        console.error('❌ Error al insertar destinos activos:', destinosError);
        // Rollback: eliminar relaciones y consorcio
        await adminClient.from('consorcios_servicios').delete().eq('consorcio_id', nuevoConsorcio.id);
        await adminClient.from('consorcios').delete().eq('id', nuevoConsorcio.id);
        return NextResponse.json({ 
          error: `Error al configurar destinos activos: ${destinosError.message}`,
          details: destinosError.details || destinosError.hint || JSON.stringify(destinosError)
        }, { status: 400 });
      }
    }

    // Obtener consorcio completo con detalles
    const { data: consorcioCompleto } = await adminClient
      .from('consorcios')
      .select('*')
      .eq('id', nuevoConsorcio.id)
      .single();

    const { data: serviciosCompletos } = await adminClient
      .from('consorcios_servicios')
      .select(`
        *,
        servicio_unico:servicios_unicos (
          *,
          naviera:naviera_id (
            id,
            nombre
          )
        )
      `)
      .eq('consorcio_id', nuevoConsorcio.id)
      .order('orden', { ascending: true });

    const { data: destinosCompletos } = await adminClient
      .from('consorcios_destinos_activos')
      .select(`
        *,
        destino:servicios_unicos_destinos (*)
      `)
      .eq('consorcio_id', nuevoConsorcio.id)
      .order('orden', { ascending: true });

    return NextResponse.json({
      success: true,
      consorcio: {
        ...consorcioCompleto,
        servicios: serviciosCompletos || [],
        destinos_activos: destinosCompletos || [],
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('❌ Error creando consorcio:', error);
    console.error('❌ Stack:', error?.stack);
    return NextResponse.json({
      error: error?.message || 'Error inesperado al crear consorcio',
      details: error?.details || error?.hint || error?.code || JSON.stringify(error),
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    }, { status: 500 });
  }
}

// PUT: Actualizar un consorcio
export async function PUT(request: Request) {
  try {
    const validation = await validateUser();
    if (!validation.ok) {
      return NextResponse.json({ error: validation.message }, { status: validation.status });
    }

    const body = await request.json();
    const { id, nombre, descripcion, servicios_unicos } = body;

    if (!id) {
      return NextResponse.json({ error: 'El ID del consorcio es requerido' }, { status: 400 });
    }

    if (!nombre || !nombre.trim()) {
      return NextResponse.json({ error: 'El nombre del consorcio es requerido' }, { status: 400 });
    }

    if (!servicios_unicos || !Array.isArray(servicios_unicos) || servicios_unicos.length === 0) {
      return NextResponse.json({ 
        error: 'Debe incluir al menos un servicio único' 
      }, { status: 400 });
    }

    const adminClient = getAdminClient();

    // Verificar que el consorcio existe
    const { data: consorcioExistente, error: consorcioError } = await adminClient
      .from('consorcios')
      .select('id, nombre')
      .eq('id', id)
      .single();

    if (consorcioError || !consorcioExistente) {
      return NextResponse.json({ error: 'El consorcio no existe' }, { status: 404 });
    }

    // Verificar unicidad del nombre (si cambió)
    if (nombre.trim() !== consorcioExistente.nombre) {
      const { data: nombreDuplicado } = await adminClient
        .from('consorcios')
        .select('id')
        .eq('nombre', nombre.trim())
        .neq('id', id)
        .single();

      if (nombreDuplicado) {
        return NextResponse.json({ 
          error: `Ya existe un consorcio con el nombre "${nombre}"` 
        }, { status: 400 });
      }
    }

    // Validar servicios únicos
    const servicioUnicoIds = servicios_unicos.map((s: any) => s.servicio_unico_id);
    const { data: serviciosValidos } = await adminClient
      .from('servicios_unicos')
      .select('id, activo')
      .in('id', servicioUnicoIds);

    if (!serviciosValidos || serviciosValidos.length !== servicioUnicoIds.length) {
      return NextResponse.json({ 
        error: 'Uno o más servicios únicos no existen' 
      }, { status: 400 });
    }

    // Verificar que no hay servicios duplicados
    const idsUnicos = new Set(servicioUnicoIds);
    if (idsUnicos.size !== servicioUnicoIds.length) {
      return NextResponse.json({ 
        error: 'No se puede incluir el mismo servicio único dos veces' 
      }, { status: 400 });
    }

    // Actualizar consorcio
    const { error: updateError } = await adminClient
      .from('consorcios')
      .update({
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || null,
      })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ 
        error: updateError.message || 'Error al actualizar el consorcio' 
      }, { status: 400 });
    }

    // Eliminar relaciones existentes
    await adminClient
      .from('consorcios_destinos_activos')
      .delete()
      .eq('consorcio_id', id);

    await adminClient
      .from('consorcios_servicios')
      .delete()
      .eq('consorcio_id', id);

    // Eliminar destinos activos antiguos
    await adminClient
      .from('consorcios_destinos_activos')
      .delete()
      .eq('consorcio_id', id);

    // Crear nuevas relaciones con servicios únicos
    const consorcioServiciosToInsert = servicios_unicos.map((servicio: any, index: number) => ({
      consorcio_id: id,
      servicio_unico_id: servicio.servicio_unico_id,
      orden: servicio.orden !== undefined ? servicio.orden : index,
      activo: true,
    }));

    const { error: serviciosInsertError } = await adminClient
      .from('consorcios_servicios')
      .insert(consorcioServiciosToInsert);

    if (serviciosInsertError) {
      return NextResponse.json({ 
        error: `Error al actualizar servicios: ${serviciosInsertError.message}` 
      }, { status: 400 });
    }

    // Crear destinos activos - CONSOLIDAR DESTINOS ÚNICOS (igual que en POST)
    const todosLosDestinos: Map<string, { destino_id: string; orden: number; servicio_unico_id: string }> = new Map();

    for (const servicio of servicios_unicos) {
      const servicioUnicoId = servicio.servicio_unico_id;
      
      const { data: destinosDelServicio } = await adminClient
        .from('servicios_unicos_destinos')
        .select('*')
        .eq('servicio_unico_id', servicioUnicoId)
        .eq('activo', true)
        .order('orden', { ascending: true });

      if (destinosDelServicio && destinosDelServicio.length > 0) {
        const destinosSeleccionados = servicio.destinos_activos && servicio.destinos_activos.length > 0
          ? servicio.destinos_activos
          : destinosDelServicio.map((d: any) => ({ destino_id: d.id, orden: d.orden }));

        destinosSeleccionados.forEach((destinoConfig: any, index: number) => {
          const destinoId = typeof destinoConfig === 'string' 
            ? destinoConfig 
            : destinoConfig.destino_id;
          
          const destinoOriginal = destinosDelServicio.find((d: any) => d.id === destinoId);
          
          // Si el destino_id no existe en el mapa, agregarlo (consolidación de duplicados)
          if (!todosLosDestinos.has(destinoId)) {
            todosLosDestinos.set(destinoId, {
              destino_id: destinoId,
              orden: destinoConfig.orden !== undefined ? destinoConfig.orden : (destinoOriginal?.orden || index),
              servicio_unico_id: servicioUnicoId,
            });
          }
        });
      }
    }

    // Convertir mapa a array y ordenar por orden
    const destinosUnicosArray = Array.from(todosLosDestinos.values())
      .sort((a, b) => a.orden - b.orden)
      .map((destino, index) => ({
        consorcio_id: id,
        servicio_unico_id: destino.servicio_unico_id,
        destino_id: destino.destino_id,
        activo: true,
        orden: index, // Reordenar secuencialmente desde 0
      }));

    if (destinosUnicosArray.length > 0) {
      const { error: destinosError } = await adminClient
        .from('consorcios_destinos_activos')
        .insert(destinosUnicosArray);

      if (destinosError) {
        return NextResponse.json({ 
          error: `Error al actualizar destinos: ${destinosError.message}` 
        }, { status: 400 });
      }
    }

    // Obtener consorcio actualizado
    const { data: consorcioActualizado } = await adminClient
      .from('consorcios')
      .select('*')
      .eq('id', id)
      .single();

    const { data: serviciosCompletos } = await adminClient
      .from('consorcios_servicios')
      .select(`
        *,
        servicio_unico:servicios_unicos (
          *,
          naviera:naviera_id (
            id,
            nombre
          )
        )
      `)
      .eq('consorcio_id', id)
      .order('orden', { ascending: true });

    const { data: destinosCompletos } = await adminClient
      .from('consorcios_destinos_activos')
      .select(`
        *,
        destino:servicios_unicos_destinos (*)
      `)
      .eq('consorcio_id', id)
      .order('orden', { ascending: true });

    return NextResponse.json({
      success: true,
      consorcio: {
        ...consorcioActualizado,
        servicios: serviciosCompletos || [],
        destinos_activos: destinosCompletos || [],
      },
    });
  } catch (error: any) {
    console.error('Error actualizando consorcio:', error);
    return NextResponse.json({
      error: error?.message || 'Error inesperado al actualizar consorcio',
      details: error
    }, { status: 500 });
  }
}

// DELETE: Eliminar un consorcio
export async function DELETE(request: Request) {
  try {
    const validation = await validateUser();
    if (!validation.ok) {
      return NextResponse.json({ error: validation.message }, { status: validation.status });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'El ID del consorcio es requerido' }, { status: 400 });
    }

    const adminClient = getAdminClient();

    // Verificar que el consorcio existe
    const { data: consorcio, error: consorcioError } = await adminClient
      .from('consorcios')
      .select('id')
      .eq('id', id)
      .single();

    if (consorcioError || !consorcio) {
      return NextResponse.json({ error: 'El consorcio no existe' }, { status: 404 });
    }

    // Eliminar consorcio (CASCADE eliminará relaciones)
    const { error: deleteError } = await adminClient
      .from('consorcios')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json({ 
        error: deleteError.message || 'Error al eliminar el consorcio' 
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Consorcio eliminado correctamente',
    });
  } catch (error: any) {
    console.error('Error eliminando consorcio:', error);
    return NextResponse.json({
      error: error?.message || 'Error inesperado al eliminar consorcio',
      details: error
    }, { status: 500 });
  }
}
