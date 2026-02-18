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

    // OPTIMIZACIÓN: Cargar todos los datos necesarios en batch antes de procesar
    // Obtener todos los servicios únicos con sus navieras
    const { data: serviciosUnicos } = await adminClient
      .from('servicios_unicos')
      .select('id, naviera_id');
    
    const servicioNavieraMap = new Map<string, string>();
    if (serviciosUnicos) {
      const navieraIds = [...new Set(serviciosUnicos.map((s: any) => s.naviera_id).filter(Boolean))];
      if (navieraIds.length > 0) {
        const { data: navieras } = await adminClient
          .from('catalogos_navieras')
          .select('id, nombre')
          .in('id', navieraIds);
        
        const navieraMap = new Map((navieras || []).map((n: any) => [n.id, n.nombre]));
        serviciosUnicos.forEach((s: any) => {
          if (s.naviera_id && navieraMap.has(s.naviera_id)) {
            servicioNavieraMap.set(s.id, navieraMap.get(s.naviera_id)!);
          }
        });
      }
    }

    // Obtener todos los consorcios con sus servicios
    const { data: consorcios } = await adminClient
      .from('consorcios')
      .select('id, nombre');
    
    const consorcioMap = new Map((consorcios || []).map((c: any) => [c.nombre, c.id]));
    const consorcioNavierasMap = new Map<string, string[]>();
    
    if (consorcios && consorcios.length > 0) {
      const consorcioIds = consorcios.map((c: any) => c.id);
      const { data: consorcioServicios } = await adminClient
        .from('consorcios_servicios')
        .select(`
          consorcio_id,
          servicio_unico_id,
          servicio_unico:servicios_unicos(
            naviera_id
          )
        `)
        .in('consorcio_id', consorcioIds)
        .eq('activo', true);
      
      if (consorcioServicios) {
        const navieraIdsSet = new Set<string>();
        consorcioServicios.forEach((cs: any) => {
          if (cs.servicio_unico?.naviera_id) {
            navieraIdsSet.add(cs.servicio_unico.naviera_id);
          }
        });
        
        if (navieraIdsSet.size > 0) {
          const { data: navierasConsorcio } = await adminClient
            .from('catalogos_navieras')
            .select('id, nombre')
            .in('id', Array.from(navieraIdsSet));
          
          const navieraMap = new Map((navierasConsorcio || []).map((n: any) => [n.id, n.nombre]));
          
          consorcios.forEach((consorcio: any) => {
            const navieras: string[] = [];
            consorcioServicios
              .filter((cs: any) => cs.consorcio_id === consorcio.id)
              .forEach((cs: any) => {
                if (cs.servicio_unico?.naviera_id && navieraMap.has(cs.servicio_unico.naviera_id)) {
                  const navieraNombre = navieraMap.get(cs.servicio_unico.naviera_id)!;
                  if (!navieras.includes(navieraNombre)) {
                    navieras.push(navieraNombre);
                  }
                }
              });
            if (navieras.length > 0) {
              consorcioNavierasMap.set(consorcio.nombre, navieras.sort());
            }
          });
        }
      }
    }

    // Función optimizada para obtener navieras del servicio (usa cache)
    const obtenerNavierasDelServicio = (servicioNombre: string, servicioId: string | null): string[] => {
      if (servicioId && servicioNavieraMap.has(servicioId)) {
        return [servicioNavieraMap.get(servicioId)!];
      }
      
      if (consorcioNavierasMap.has(servicioNombre)) {
        return consorcioNavierasMap.get(servicioNombre)!;
      }
      
      return [];
    };

    // Para cada servicio, encontrar el primer viaje y ordenar todas las escalas según su ETA
    const itinerariosConEscalasOrdenadas = (itinerarios || []).map((it: any) => {
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

      // Obtener navieras del servicio/consorcio (ahora es síncrono, usa cache)
      const navierasDelServicio = obtenerNavierasDelServicio(it.servicio, it.servicio_id);
      
      return {
        ...it,
        escalas: escalasOrdenadas,
        navierasDelServicio,
      };
    });

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
