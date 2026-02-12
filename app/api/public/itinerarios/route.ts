import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

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

export async function GET() {
  try {
    const adminClient = getAdminClient();

    // Obtener todos los itinerarios con sus escalas (acceso público, solo lectura)
    const { data: itinerarios, error: itinerariosError } = await adminClient
      .from('itinerarios')
      .select(`
        *,
        escalas:itinerario_escalas(
          id,
          itinerario_id,
          puerto,
          puerto_nombre,
          eta,
          dias_transito,
          orden,
          area,
          created_at,
          updated_at
        )
      `)
      .order('servicio', { ascending: true })
      .order('etd', { ascending: true });


    if (itinerariosError) {
      if (itinerariosError.message?.includes('does not exist') || 
          itinerariosError.message?.includes('schema cache') ||
          itinerariosError.code === '42P01') {
        return NextResponse.json({ 
          error: 'La tabla de itinerarios no existe en la base de datos.',
          code: 'TABLE_NOT_FOUND',
          details: itinerariosError.message 
        }, { status: 500 });
      }
      return NextResponse.json({ 
        error: itinerariosError.message,
        code: itinerariosError.code,
        details: itinerariosError 
      }, { status: 400 });
    }

    // Agrupar itinerarios por servicio y ordenar escalas según ETA del primer viaje
    const serviciosMap = new Map<string, any[]>();
    (itinerarios || []).forEach((it: any) => {
      const servicioKey = it.servicio_id || it.servicio || 'sin-servicio';
      if (!serviciosMap.has(servicioKey)) {
        serviciosMap.set(servicioKey, []);
      }
      serviciosMap.get(servicioKey)!.push(it);
    });

    // Función para obtener navieras del servicio/consorcio (similar a la API admin)
    const obtenerNavierasDelServicio = async (servicioNombre: string, servicioId: string | null) => {
      try {
        if (servicioId) {
          const { data: servicioUnico } = await adminClient
            .from('servicios_unicos')
            .select('id, naviera_id')
            .eq('id', servicioId)
            .single();
          
          if (servicioUnico?.naviera_id) {
            const { data: navieraData } = await adminClient
              .from('catalogos_navieras')
              .select('id, nombre')
              .eq('id', servicioUnico.naviera_id)
              .single();
            
            if (navieraData?.nombre) {
              return [navieraData.nombre];
            }
          }
        }
        
        const { data: consorcio } = await adminClient
          .from('consorcios')
          .select('id')
          .eq('nombre', servicioNombre)
          .single();
        
        if (consorcio?.id) {
          const { data: consorcioServicios } = await adminClient
            .from('consorcios_servicios')
            .select(`
              servicio_unico_id,
              servicio_unico:servicios_unicos(
                naviera_id
              )
            `)
            .eq('consorcio_id', consorcio.id)
            .eq('activo', true);
          
          if (consorcioServicios && consorcioServicios.length > 0) {
            const navieraIds = new Set<string>();
            consorcioServicios.forEach((cs: any) => {
              if (cs.servicio_unico?.naviera_id) {
                navieraIds.add(cs.servicio_unico.naviera_id);
              }
            });
            
            if (navieraIds.size > 0) {
              const { data: navieras } = await adminClient
                .from('catalogos_navieras')
                .select('id, nombre')
                .in('id', Array.from(navieraIds));
              
              if (navieras && navieras.length > 0) {
                return navieras.map((n: any) => n.nombre).sort();
              }
            }
          }
        }
        
        return [];
      } catch (error) {
        console.error('Error al obtener navieras del servicio:', error);
        return [];
      }
    };

    // Para cada servicio, encontrar el primer viaje y ordenar todas las escalas según su ETA
    const itinerariosConEscalasOrdenadas = await Promise.all((itinerarios || []).map(async (it: any) => {
      const servicioKey = it.servicio_id || it.servicio || 'sin-servicio';
      const viajesDelServicio = serviciosMap.get(servicioKey) || [];
      
      if (viajesDelServicio.length === 0 || !it.escalas || it.escalas.length === 0) {
        return it;
      }

      // Encontrar el primer viaje del servicio (el más antiguo por ETD)
      const primerViaje = viajesDelServicio
        .filter((v: any) => v.escalas && v.escalas.length > 0)
        .sort((a: any, b: any) => {
          if (!a.etd || !b.etd) return 0;
          return new Date(a.etd).getTime() - new Date(b.etd).getTime();
        })[0];

      if (!primerViaje || !primerViaje.escalas) {
        return it;
      }

      // Ordenar escalas del primer viaje por ETA (de menor a mayor)
      const escalasPrimerViajeOrdenadas = [...primerViaje.escalas].sort((a: any, b: any) => {
        if (!a.eta && !b.eta) return (a.orden || 0) - (b.orden || 0);
        if (!a.eta) return 1;
        if (!b.eta) return -1;
        return new Date(a.eta).getTime() - new Date(b.eta).getTime();
      });

      // Crear un mapa de orden basado en las ETAs del primer viaje
      const ordenPorPuerto = new Map<string, number>();
      escalasPrimerViajeOrdenadas.forEach((escala: any, index: number) => {
        const puertoKey = escala.puerto || escala.puerto_nombre || '';
        ordenPorPuerto.set(puertoKey, index + 1);
      });

      // Ordenar escalas del viaje actual según el orden del primer viaje
      const escalasOrdenadas = [...it.escalas].sort((a: any, b: any) => {
        const puertoA = a.puerto || a.puerto_nombre || '';
        const puertoB = b.puerto || b.puerto_nombre || '';
        const ordenA = ordenPorPuerto.get(puertoA) ?? 999;
        const ordenB = ordenPorPuerto.get(puertoB) ?? 999;
        return ordenA - ordenB;
      });

      // Obtener navieras del servicio/consorcio
      const navierasDelServicio = await obtenerNavierasDelServicio(it.servicio, it.servicio_id);
      
      return {
        ...it,
        escalas: escalasOrdenadas,
        navierasDelServicio,
      };
    }));

    return NextResponse.json({
      success: true,
      itinerarios: itinerariosConEscalasOrdenadas || [],
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: error?.message || 'Error inesperado.',
      details: error 
    }, { status: 500 });
  }
}
