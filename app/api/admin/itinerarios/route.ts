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
  consorcio: string | null;
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

    return NextResponse.json({
      success: true,
      itinerarios: itinerarios || [],
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: error?.message || 'Error inesperado.',
      details: error 
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

    // Validaciones
    if (!payload.nave || !payload.viaje || !payload.pol || !payload.etd) {
      return NextResponse.json({ error: 'Faltan campos requeridos: nave, viaje, pol, etd.' }, { status: 400 });
    }

    if (!payload.escalas || payload.escalas.length === 0) {
      return NextResponse.json({ error: 'Debe incluir al menos una escala (POD).' }, { status: 400 });
    }

    const etdDate = new Date(payload.etd);
    if (isNaN(etdDate.getTime())) {
      return NextResponse.json({ error: 'Fecha ETD inválida.' }, { status: 400 });
    }

    // Validar y calcular días de tránsito para cada escala
    const escalasConDias = payload.escalas.map((escala, index) => {
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

    const adminClient = getAdminClient();

    // Obtener información del usuario para auditoría
    const { data: usuarioData } = await adminClient
      .from('usuarios')
      .select('id, nombre, email')
      .eq('auth_user_id', validation.userId)
      .single();

    // Insertar itinerario
    const { data: itinerarioData, error: itinerarioError } = await adminClient
      .from('itinerarios')
      .insert({
        servicio: payload.servicio || 'AX2/AN2/ANDES EXPRESS',
        consorcio: payload.consorcio,
        nave: payload.nave,
        viaje: payload.viaje,
        semana: payload.semana,
        pol: payload.pol,
        etd: payload.etd,
        created_by: usuarioData?.email || validation.email,
        updated_by: usuarioData?.email || validation.email,
      })
      .select()
      .single();

    if (itinerarioError) {
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

        // Actualizar itinerario
        const { data: updatedItinerario, error: updateError } = await adminClient
          .from('itinerarios')
          .update({
            servicio: payload.servicio || 'AX2/AN2/ANDES EXPRESS',
            consorcio: payload.consorcio,
            semana: payload.semana,
            pol: payload.pol,
            etd: payload.etd,
            updated_by: usuarioData?.email || validation.email,
          })
          .eq('id', existingItinerario.id)
          .select()
          .single();

        if (updateError) {
          return NextResponse.json({ error: updateError.message }, { status: 400 });
        }

        // Insertar nuevas escalas
        const escalasToInsert = escalasConDias.map((escala) => ({
          itinerario_id: existingItinerario.id,
          puerto: escala.puerto,
          puerto_nombre: escala.puerto_nombre,
          eta: escala.eta,
          dias_transito: escala.dias_transito,
          orden: escala.orden,
          area: escala.area || 'ASIA',
        }));

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
    const escalasToInsert = escalasConDias.map((escala) => ({
      itinerario_id: itinerarioData.id,
      puerto: escala.puerto,
      puerto_nombre: escala.puerto_nombre,
      eta: escala.eta,
      dias_transito: escala.dias_transito,
      orden: escala.orden,
      area: escala.area || 'ASIA',
    }));

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
