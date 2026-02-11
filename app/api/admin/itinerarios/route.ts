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

  // Permitir solo admin o rodrigo.caceres@asli.cl
  const isAdmin = perfil.rol === 'admin';
  const isRodrigo = perfil.email?.toLowerCase() === 'rodrigo.caceres@asli.cl';
  
  if (!isAdmin && !isRodrigo) {
    return { ok: false, status: 403, message: 'Acceso restringido. Solo administradores.' };
  }

  return { ok: true, userId: userData.user.id, email: perfil.email };
};

type EscalaInput = {
  puerto: string;
  puerto_nombre: string | null;
  eta: string; // ISO date string
  orden: number;
  area?: string; // Área geográfica: ASIA, EUROPA, AMERICA, INDIA-MEDIOORIENTE
};

type ItinerarioInput = {
  servicio: string;
  servicio_id?: string | null; // ID del servicio desde la tabla servicios
  consorcio: string | null;
  naviera?: string | null; // Naviera seleccionada (nuevo campo)
  nave: string;
  viaje: string;
  semana: number | null;
  pol: string;
  etd: string; // ISO date string
  escalas: EscalaInput[];
};

// Validar usuario autenticado (sin restricción de admin)
const validateUser = async () => {
  const supabaseServer = await createServerClient();
  const { data: userData, error: userError } = await supabaseServer.auth.getUser();
  if (userError || !userData?.user?.id) {
    return { ok: false, status: 401, message: 'No autorizado.' };
  }
  return { ok: true, userId: userData.user.id };
};

// Calcular días de tránsito desde ETD hasta cada ETA
function calcularDiasTransito(etd: Date, eta: Date): number {
  const diffTime = eta.getTime() - etd.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

export async function GET() {
  try {
    const validation = await validateUser();
    if (!validation.ok) {
      return NextResponse.json({ error: validation.message }, { status: validation.status });
    }

    const adminClient = getAdminClient();

    // Obtener todos los itinerarios con sus escalas
    const { data: itinerarios, error: itinerariosError } = await adminClient
      .from('itinerarios')
      .select(`
        *,
        escalas:itinerario_escalas(*)
      `)
      .order('servicio', { ascending: true })
      .order('etd', { ascending: true });

    if (itinerariosError) {
      // Verificar si el error es porque la tabla no existe
      if (itinerariosError.message?.includes('does not exist') || 
          itinerariosError.message?.includes('schema cache') ||
          itinerariosError.code === '42P01') {
        return NextResponse.json({ 
          error: 'La tabla de itinerarios no existe en la base de datos. Por favor, ejecuta el script SQL de creación: scripts/create-itinerarios-table.sql',
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

    // Función para obtener navieras del servicio/consorcio
    const obtenerNavierasDelServicio = async (servicioNombre: string, servicioId: string | null) => {
      try {
        // Si hay servicio_id, buscar en servicios_unicos
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
        
        // Si no hay servicio_id o no se encontró, buscar consorcio por nombre
        const { data: consorcio } = await adminClient
          .from('consorcios')
          .select('id')
          .eq('nombre', servicioNombre)
          .single();
        
        if (consorcio?.id) {
          // Obtener servicios únicos del consorcio
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
            // Obtener todos los naviera_ids únicos
            const navieraIds = new Set<string>();
            consorcioServicios.forEach((cs: any) => {
              if (cs.servicio_unico?.naviera_id) {
                navieraIds.add(cs.servicio_unico.naviera_id);
              }
            });
            
            // Obtener las navieras
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

    // Agrupar itinerarios por servicio y ordenar escalas según ETA del primer viaje
    const serviciosMap = new Map<string, any[]>();
    (itinerarios || []).forEach((it: any) => {
      const servicioKey = it.servicio_id || it.servicio || 'sin-servicio';
      if (!serviciosMap.has(servicioKey)) {
        serviciosMap.set(servicioKey, []);
      }
      serviciosMap.get(servicioKey)!.push(it);
    });

    // Para cada servicio, encontrar el primer viaje y ordenar todas las escalas según su ETA
    // También obtener navieras del servicio/consorcio
    const itinerariosConEscalasOrdenadas = await Promise.all((itinerarios || []).map(async (it: any) => {
      const servicioKey = it.servicio_id || it.servicio || 'sin-servicio';
      const viajesDelServicio = serviciosMap.get(servicioKey) || [];
      
      // Obtener navieras del servicio/consorcio
      const navierasDelServicio = await obtenerNavierasDelServicio(it.servicio, it.servicio_id);
      
      if (viajesDelServicio.length === 0 || !it.escalas || it.escalas.length === 0) {
        return {
          ...it,
          navierasDelServicio,
        };
      }

      // Encontrar el primer viaje del servicio (el más antiguo por ETD)
      const primerViaje = viajesDelServicio
        .filter((v: any) => v.escalas && v.escalas.length > 0)
        .sort((a: any, b: any) => {
          if (!a.etd || !b.etd) return 0;
          return new Date(a.etd).getTime() - new Date(b.etd).getTime();
        })[0];

      if (!primerViaje || !primerViaje.escalas) {
        return {
          ...it,
          navierasDelServicio,
        };
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
    console.error('Error en GET /api/admin/itinerarios:', error);
    return NextResponse.json({ 
      error: error?.message || 'Error inesperado.',
      details: error?.stack || error 
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const validation = await validateAdmin();
    if (!validation.ok) {
      return NextResponse.json({ error: validation.message }, { status: validation.status });
    }

    const payload = (await request.json()) as ItinerarioInput;
    
    console.log('📥 Payload recibido en POST itinerarios:', JSON.stringify(payload, null, 2));

    // Validaciones
    if (!payload.nave || !payload.viaje || !payload.pol || !payload.etd) {
      console.log('❌ Error: Faltan campos requeridos:', {
        nave: !!payload.nave,
        viaje: !!payload.viaje,
        pol: !!payload.pol,
        etd: !!payload.etd,
        payload
      });
      return NextResponse.json({ 
        error: 'Faltan campos requeridos: nave, viaje, pol, etd.',
        details: {
          nave: payload.nave || 'FALTANTE',
          viaje: payload.viaje || 'FALTANTE',
          pol: payload.pol || 'FALTANTE',
          etd: payload.etd || 'FALTANTE'
        }
      }, { status: 400 });
    }

    // Las escalas pueden venir vacías si es un viaje posterior (se calcularán automáticamente)

    // Normalizar ETD a fecha local (sin considerar hora) para cálculos precisos
    let etdDate: Date;
    if (payload.etd && !payload.etd.includes('T')) {
      // Si es formato YYYY-MM-DD, crear fecha en zona horaria local
      const [año, mes, dia] = payload.etd.split('-');
      etdDate = new Date(parseInt(año), parseInt(mes) - 1, parseInt(dia), 12, 0, 0);
    } else {
      etdDate = new Date(payload.etd);
    }
    
    if (isNaN(etdDate.getTime())) {
      return NextResponse.json({ error: 'Fecha ETD inválida.' }, { status: 400 });
    }

    const adminClient = getAdminClient();

    // Verificar si ya existen itinerarios para este servicio
    let escalasConDias: any[] = [];
    let esPrimerViaje = false;

    try {
      // Buscar itinerarios existentes del mismo servicio
      const servicioFiltro = payload.servicio_id 
        ? { servicio_id: payload.servicio_id }
        : { servicio: payload.servicio || 'AX2/AN2/ANDES EXPRESS' };

      const { data: itinerariosExistentes, error: errorBusqueda } = await adminClient
        .from('itinerarios')
        .select('id, etd, nave, viaje')
        .match(servicioFiltro)
        .order('etd', { ascending: true });

      if (errorBusqueda && !errorBusqueda.message?.includes('does not exist')) {
        console.warn('⚠️ Error buscando itinerarios existentes:', errorBusqueda);
      }

      // Si no hay itinerarios existentes o solo hay uno (el que estamos creando), es el primer viaje
      if (!itinerariosExistentes || itinerariosExistentes.length === 0) {
        esPrimerViaje = true;
        console.log('✅ Este es el primer viaje del servicio');
      } else {
        // Ordenar todos los viajes por ETD (ascendente - del más antiguo al más reciente)
        const itinerariosOrdenados = [...itinerariosExistentes].sort((a: any, b: any) => 
          new Date(a.etd).getTime() - new Date(b.etd).getTime()
        );
        
        // El primer viaje (el más antiguo) es el que usaremos como base para las ETAs y para calcular la diferencia
        const primerViaje = itinerariosOrdenados[0];
        
        // Normalizar ETD del primer viaje a fecha local (sin considerar hora) para cálculos precisos
        let etdPrimerViaje: Date;
        if (primerViaje.etd && typeof primerViaje.etd === 'string') {
          if (primerViaje.etd.includes('T')) {
            // Si es formato ISO, extraer solo la fecha y crear en zona horaria local
            const fechaISO = new Date(primerViaje.etd);
            etdPrimerViaje = new Date(fechaISO.getFullYear(), fechaISO.getMonth(), fechaISO.getDate(), 12, 0, 0);
          } else {
            // Si es formato YYYY-MM-DD, crear fecha en zona horaria local
            const [año, mes, dia] = primerViaje.etd.split('-');
            etdPrimerViaje = new Date(parseInt(año), parseInt(mes) - 1, parseInt(dia), 12, 0, 0);
          }
        } else {
          etdPrimerViaje = new Date(primerViaje.etd);
        }
        
        // Calcular diferencia en días entre el primer ETD y el nuevo ETD (el que se está ingresando)
        // Usar solo las partes de fecha (año, mes, día) para evitar problemas de zona horaria
        const diffTime = etdDate.getTime() - etdPrimerViaje.getTime();
        const diferenciaDias = Math.round(diffTime / (1000 * 60 * 60 * 24));
        console.log(`📅 Usando primer viaje (${primerViaje.viaje}, ETD: ${primerViaje.etd}) como base`);
        console.log(`📅 Diferencia entre primer ETD (${primerViaje.etd}) y nuevo ETD (${payload.etd}): ${diferenciaDias} días`);

          // Obtener las escalas del primer viaje ordenadas por ETA (orden del primer registro)
          const { data: escalasPrimerViaje, error: errorEscalas } = await adminClient
            .from('itinerario_escalas')
            .select('*')
            .eq('itinerario_id', primerViaje.id)
            .order('eta', { ascending: true });

          if (!errorEscalas && escalasPrimerViaje && escalasPrimerViaje.length > 0) {
            console.log(`✅ Encontradas ${escalasPrimerViaje.length} escalas del primer viaje`);
            
            // Si el payload ya tiene escalas, usarlas; si no, calcularlas automáticamente
            if (payload.escalas && payload.escalas.length > 0) {
              // El usuario proporcionó escalas, calcular días de tránsito normalmente
              escalasConDias = payload.escalas.map((escala, index) => {
                const etaDate = new Date(escala.eta);
                if (isNaN(etaDate.getTime())) {
                  throw new Error(`Fecha ETA inválida para escala ${index + 1} (${escala.puerto}).`);
                }
                const diasTransito = calcularDiasTransito(etdDate, etaDate);
                return {
                  ...escala,
                  dias_transito: diasTransito,
                };
              });
            } else {
              // Ordenar escalas del primer viaje por ETA (orden del primer registro)
              const escalasOrdenadasPorEta = [...escalasPrimerViaje].sort((a: any, b: any) => {
                if (!a.eta && !b.eta) return (a.orden || 0) - (b.orden || 0);
                if (!a.eta) return 1;
                if (!b.eta) return -1;
                return new Date(a.eta).getTime() - new Date(b.eta).getTime();
              });
              
              // Calcular automáticamente las escalas basándose en el primer viaje (ordenadas por ETA)
              escalasConDias = escalasOrdenadasPorEta.map((escalaPrimera: any, index: number) => {
                if (!escalaPrimera.eta) {
                  // Si el primer viaje no tiene ETA, usar la del payload si existe
                  const escalaPayload = payload.escalas?.[index];
                  if (escalaPayload?.eta) {
                    const etaDate = new Date(escalaPayload.eta);
                    const diasTransito = calcularDiasTransito(etdDate, etaDate);
                    return {
                      puerto: escalaPayload.puerto || escalaPrimera.puerto,
                      puerto_nombre: escalaPayload.puerto_nombre || escalaPrimera.puerto_nombre || escalaPrimera.puerto,
                      area: escalaPayload.area || escalaPrimera.area || 'ASIA',
                      orden: escalaPayload.orden !== undefined ? escalaPayload.orden : index + 1,
                      eta: escalaPayload.eta,
                      dias_transito: diasTransito,
                    };
                  }
                  // Si no hay ETA en el payload, calcular basándose en días de tránsito del primer viaje
                  const nuevaEta = new Date(etdDate);
                  nuevaEta.setDate(nuevaEta.getDate() + (escalaPrimera.dias_transito || 0));
                  
                  // Formatear fecha en zona horaria local (no UTC) para evitar pérdida de días
                  const año = nuevaEta.getFullYear();
                  const mes = String(nuevaEta.getMonth() + 1).padStart(2, '0');
                  const dia = String(nuevaEta.getDate()).padStart(2, '0');
                  const fechaFormateada = `${año}-${mes}-${dia}`;
                  
                  return {
                    puerto: escalaPrimera.puerto,
                    puerto_nombre: escalaPrimera.puerto_nombre || escalaPrimera.puerto,
                    area: escalaPrimera.area || 'ASIA',
                    orden: index + 1,
                    eta: fechaFormateada,
                    dias_transito: escalaPrimera.dias_transito || 0,
                  };
                }

                // Calcular nueva ETA sumando la diferencia de días a la ETA del primer viaje
                const etaPrimera = new Date(escalaPrimera.eta);
                const nuevaEta = new Date(etaPrimera);
                nuevaEta.setDate(nuevaEta.getDate() + diferenciaDias);
                
                // Formatear fecha en zona horaria local (no UTC) para evitar pérdida de días
                const año = nuevaEta.getFullYear();
                const mes = String(nuevaEta.getMonth() + 1).padStart(2, '0');
                const dia = String(nuevaEta.getDate()).padStart(2, '0');
                const fechaFormateada = `${año}-${mes}-${dia}`;
                
                // Calcular días de tránsito para el nuevo viaje
                const diasTransito = calcularDiasTransito(etdDate, nuevaEta);

                return {
                  puerto: escalaPrimera.puerto,
                  puerto_nombre: escalaPrimera.puerto_nombre || escalaPrimera.puerto,
                  area: escalaPrimera.area || 'ASIA',
                  orden: index + 1,
                  eta: fechaFormateada,
                  dias_transito: diasTransito,
                };
              });
              
              console.log(`✅ Calculadas automáticamente ${escalasConDias.length} escalas basadas en el primer viaje`);
            }
          } else {
            // No se encontraron escalas del primer viaje, usar las del payload
            console.warn('⚠️ No se encontraron escalas del primer viaje, usando escalas del payload');
            if (payload.escalas && payload.escalas.length > 0) {
              escalasConDias = payload.escalas.map((escala, index) => {
                const etaDate = new Date(escala.eta);
                if (isNaN(etaDate.getTime())) {
                  throw new Error(`Fecha ETA inválida para escala ${index + 1} (${escala.puerto}).`);
                }
                const diasTransito = calcularDiasTransito(etdDate, etaDate);
                return {
                  ...escala,
                  dias_transito: diasTransito,
                };
              });
            } else {
              // No hay escalas en el payload ni en el primer viaje, cargar sin fechas
              escalasConDias = [];
            }
          }
      }
    } catch (error: any) {
      console.warn('⚠️ Error al buscar itinerarios existentes, usando escalas del payload:', error);
      // En caso de error, usar las escalas del payload normalmente
      escalasConDias = payload.escalas.map((escala, index) => {
        const etaDate = new Date(escala.eta);
        if (isNaN(etaDate.getTime())) {
          throw new Error(`Fecha ETA inválida para escala ${index + 1} (${escala.puerto}).`);
        }
        const diasTransito = calcularDiasTransito(etdDate, etaDate);
        return {
          ...escala,
          dias_transito: diasTransito,
        };
      });
    }

    // Si no se calcularon escalas automáticamente, calcularlas del payload
    if (escalasConDias.length === 0 && payload.escalas && payload.escalas.length > 0) {
      escalasConDias = payload.escalas.map((escala, index) => {
        const etaDate = new Date(escala.eta);
        if (isNaN(etaDate.getTime())) {
          throw new Error(`Fecha ETA inválida para escala ${index + 1} (${escala.puerto}).`);
        }
        const diasTransito = calcularDiasTransito(etdDate, etaDate);
        return {
          ...escala,
          dias_transito: diasTransito,
        };
      });
    }

    // Validar que tenemos escalas
    if (!escalasConDias || escalasConDias.length === 0) {
      return NextResponse.json({ error: 'Debe incluir al menos una escala (POD).' }, { status: 400 });
    }

    // Obtener información del usuario para auditoría
    const { data: usuarioData } = await adminClient
      .from('usuarios')
      .select('id, nombre, email')
      .eq('auth_user_id', validation.userId)
      .single();

    // Convertir ETD a formato ISO con hora local (no UTC) para evitar pérdida de días
    let etdFormateado = payload.etd;
    if (etdFormateado && !etdFormateado.includes('T')) {
      // Si es formato YYYY-MM-DD, crear fecha en zona horaria local
      const [año, mes, dia] = etdFormateado.split('-');
      const fechaLocal = new Date(parseInt(año), parseInt(mes) - 1, parseInt(dia), 12, 0, 0); // Usar mediodía para evitar problemas de zona horaria
      
      // Convertir a ISO string - al usar mediodía, la conversión a UTC no cambiará el día
      etdFormateado = fechaLocal.toISOString();
    }
    
    // Insertar itinerario
    const insertData: any = {
      servicio: payload.servicio || 'AX2/AN2/ANDES EXPRESS',
      consorcio: payload.consorcio,
      naviera: payload.naviera || null, // Agregar naviera si está disponible
      nave: payload.nave,
      viaje: payload.viaje,
      semana: payload.semana,
      pol: payload.pol,
      etd: etdFormateado,
      created_by: usuarioData?.email || validation.email,
      updated_by: usuarioData?.email || validation.email,
    };

    // Si se proporciona servicio_id, incluirlo
    if (payload.servicio_id) {
      insertData.servicio_id = payload.servicio_id;
    }

    console.log('📝 Insertando itinerario con datos:', JSON.stringify(insertData, null, 2));
    
    const { data: itinerarioData, error: itinerarioError } = await adminClient
      .from('itinerarios')
      .insert(insertData)
      .select()
      .single();

    if (itinerarioError) {
      console.error('❌ Error al insertar itinerario:', {
        message: itinerarioError.message,
        code: itinerarioError.code,
        details: itinerarioError.details,
        hint: itinerarioError.hint,
        insertData
      });
      
      // Si el error es porque la columna naviera no existe, intentar sin ella
      if (itinerarioError.message?.includes('naviera') || itinerarioError.code === '42703') {
        console.log('⚠️ Columna naviera no existe, intentando sin ella...');
        const insertDataSinNaviera = { ...insertData };
        delete insertDataSinNaviera.naviera;
        
        const { data: itinerarioDataRetry, error: itinerarioErrorRetry } = await adminClient
          .from('itinerarios')
          .insert(insertDataSinNaviera)
          .select()
          .single();
          
        if (itinerarioErrorRetry) {
          return NextResponse.json({ 
            error: `Error al crear el itinerario: ${itinerarioErrorRetry.message}`,
            details: itinerarioErrorRetry.details || itinerarioErrorRetry.hint,
            code: itinerarioErrorRetry.code
          }, { status: 400 });
        }
        
        // Si funcionó sin naviera, usar ese resultado
        return NextResponse.json({ 
          error: 'Error al crear el itinerario. La columna naviera no existe en la base de datos. Por favor, ejecuta el script: scripts/add-naviera-itinerarios.sql',
          details: itinerarioError.message,
          code: 'COLUMN_NOT_FOUND'
        }, { status: 400 });
      }
      // Si es error de duplicado, actualizar en lugar de crear
      if (itinerarioError.code === '23505') {
        const { data: existingItinerario, error: fetchError } = await adminClient
          .from('itinerarios')
          .select('id')
          .eq('nave', payload.nave)
          .eq('viaje', payload.viaje)
          .single();

        if (fetchError || !existingItinerario) {
          return NextResponse.json({ error: 'Error al buscar itinerario existente.' }, { status: 400 });
        }

        // Eliminar escalas existentes
        await adminClient
          .from('itinerario_escalas')
          .delete()
          .eq('itinerario_id', existingItinerario.id);

        // Convertir ETD a formato ISO con hora local (no UTC) para evitar pérdida de días
        let etdFormateado = payload.etd;
        if (etdFormateado && !etdFormateado.includes('T')) {
          // Si es formato YYYY-MM-DD, crear fecha en zona horaria local
          const [año, mes, dia] = etdFormateado.split('-');
          const fechaLocal = new Date(parseInt(año), parseInt(mes) - 1, parseInt(dia), 12, 0, 0); // Usar mediodía para evitar problemas de zona horaria
          
          // Convertir a ISO string - al usar mediodía, la conversión a UTC no cambiará el día
          etdFormateado = fechaLocal.toISOString();
        }
        
        // Actualizar itinerario
        const updateData: any = {
          servicio: payload.servicio || 'AX2/AN2/ANDES EXPRESS',
          consorcio: payload.consorcio,
          semana: payload.semana,
          pol: payload.pol,
          etd: etdFormateado,
          updated_by: usuarioData?.email || validation.email,
        };

        // Si se proporciona servicio_id, incluirlo
        if (payload.servicio_id) {
          updateData.servicio_id = payload.servicio_id;
        }

        const { data: updatedItinerario, error: updateError } = await adminClient
          .from('itinerarios')
          .update(updateData)
          .eq('id', existingItinerario.id)
          .select()
          .single();

        if (updateError) {
          return NextResponse.json({ error: updateError.message }, { status: 400 });
        }

        // Insertar nuevas escalas
        const escalasToInsert = escalasConDias.map((escala) => {
          // Convertir fecha ETA a formato ISO con hora local (no UTC) para evitar pérdida de días
          let etaFormateada = escala.eta;
          if (etaFormateada && !etaFormateada.includes('T')) {
            // Si es formato YYYY-MM-DD, crear fecha en zona horaria local
            const [año, mes, dia] = etaFormateada.split('-');
            const fechaLocal = new Date(parseInt(año), parseInt(mes) - 1, parseInt(dia), 12, 0, 0); // Usar mediodía para evitar problemas de zona horaria
            
            // Convertir a ISO string - al usar mediodía, la conversión a UTC no cambiará el día
            etaFormateada = fechaLocal.toISOString();
          }
          
          return {
            itinerario_id: existingItinerario.id,
            puerto: escala.puerto,
            puerto_nombre: escala.puerto_nombre,
            eta: etaFormateada,
            dias_transito: escala.dias_transito,
            orden: escala.orden,
            area: escala.area || 'ASIA',
          };
        });

        const { error: escalasError } = await adminClient
          .from('itinerario_escalas')
          .insert(escalasToInsert);

        if (escalasError) {
          return NextResponse.json({ error: escalasError.message }, { status: 400 });
        }

        // Obtener el itinerario completo con escalas
        const { data: itinerarioCompleto, error: fetchCompleteError } = await adminClient
          .from('itinerarios')
          .select(`
            *,
            escalas:itinerario_escalas(*)
          `)
          .eq('id', existingItinerario.id)
          .single();

        if (fetchCompleteError) {
          return NextResponse.json({ error: fetchCompleteError.message }, { status: 400 });
        }

        return NextResponse.json({
          success: true,
          message: 'Itinerario actualizado exitosamente.',
          itinerario: itinerarioCompleto,
        });
      }

      return NextResponse.json({ error: itinerarioError.message }, { status: 400 });
    }

    // Insertar escalas
    const escalasToInsert = escalasConDias.map((escala) => {
      // Convertir fecha ETA a formato ISO con hora local (no UTC) para evitar pérdida de días
      let etaFormateada = escala.eta;
      if (etaFormateada && !etaFormateada.includes('T')) {
        // Si es formato YYYY-MM-DD, crear fecha en zona horaria local
        const [año, mes, dia] = etaFormateada.split('-');
        const fechaLocal = new Date(parseInt(año), parseInt(mes) - 1, parseInt(dia), 12, 0, 0); // Usar mediodía para evitar problemas de zona horaria
        
        // Convertir a ISO string - al usar mediodía, la conversión a UTC no cambiará el día
        etaFormateada = fechaLocal.toISOString();
      }
      
      return {
        itinerario_id: itinerarioData.id,
        puerto: escala.puerto,
        puerto_nombre: escala.puerto_nombre,
        eta: etaFormateada,
        dias_transito: escala.dias_transito,
        orden: escala.orden,
        area: escala.area || 'ASIA',
      };
    });

    const { error: escalasError } = await adminClient
      .from('itinerario_escalas')
      .insert(escalasToInsert);

    if (escalasError) {
      // Si falla la inserción de escalas, eliminar el itinerario creado
      await adminClient.from('itinerarios').delete().eq('id', itinerarioData.id);
      return NextResponse.json({ error: escalasError.message }, { status: 400 });
    }

    // Obtener el itinerario completo con escalas
    const { data: itinerarioCompleto, error: fetchCompleteError } = await adminClient
      .from('itinerarios')
      .select(`
        *,
        escalas:itinerario_escalas(*)
      `)
      .eq('id', itinerarioData.id)
      .single();

    if (fetchCompleteError) {
      return NextResponse.json({ error: fetchCompleteError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Itinerario creado exitosamente.',
      itinerario: itinerarioCompleto,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error inesperado.' }, { status: 500 });
  }
}
