import { createClient } from './supabase-browser';
import { Registro } from '@/types/registros';
import { convertSupabaseToApp } from './migration-utils';
import { TrackingEvent, ShipmentHito, MILESTONES_ORDER, MILESTONE_LABELS, MilestoneStatus } from '@/types/tracking';

/**
 * Busca embarques (registros) basados en un término de búsqueda.
 * La política de RLS de Supabase filtra automáticamente por rol (admin/ejecutivo/cliente).
 */
export async function searchShipments(query: string): Promise<Registro[]> {
    const supabase = createClient();

    let q = supabase
        .from('registros')
        .select('*')
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(50);

    if (query) {
        // Búsqueda en múltiples campos (se remueve id para evitar errores con UUID)
        q = q.or(`booking.ilike.%${query}%,contenedor.ilike.%${query}%,ref_asli.ilike.%${query}%,nave_inicial.ilike.%${query}%`);
    }

    const { data, error } = await q;

    if (error) {
        console.error('Error detallado al buscar embarques:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
        });
        return [];
    }

    return (data || []).map(convertSupabaseToApp);
}

/**
 * Obtiene el seguimiento detallado (timeline) de un embarque.
 * Combina datos manuales de 'shipment_tracking_events' con datos automáticos de 'registros' y 'transportes'.
 */
export async function getShipmentTracking(registroId: string): Promise<ShipmentHito[]> {
    const supabase = createClient();

    // 1. Obtener eventos manuales
    const { data: events, error: eventsError } = await supabase
        .from('shipment_tracking_events')
        .select('*')
        .eq('registro_id', registroId);

    // 2. Obtener datos del registro para automatización
    const { data: rawRegistro, error: regError } = await supabase
        .from('registros')
        .select('*')
        .eq('id', registroId)
        .single();

    const registro = rawRegistro ? convertSupabaseToApp(rawRegistro) : null;

    // 3. Obtener datos de transporte para hitos logísticos
    const { data: transporte, error: transError } = await supabase
        .from('transportes')
        .select('*')
        .eq('registro_id', registroId)
        .is('deleted_at', null)
        .maybeSingle();

    if (eventsError) {
        console.error('Error al obtener eventos:', eventsError);
    }

    // Mapear hitos asegurando el orden y la automatización solicitada
    return MILESTONES_ORDER.map(m => {
        const manualEvent = events?.find(e => e.milestone === m);

        // Valores base (manuales o pendientes)
        let status: MilestoneStatus = manualEvent?.status || 'PENDIENTE';
        let date: string | null = manualEvent?.event_date || null;
        let observation: string | null = manualEvent?.observation || null;
        let isAutomated = false;

        // Reglas de automatización del usuario:
        switch (m) {
            case 'reserva_confirmada':
                if (registro?.estado?.toUpperCase() === 'CONFIRMADO') {
                    status = 'SI';
                    date = date || (registro.updatedAt ? registro.updatedAt.toISOString() : null);
                    observation = observation || 'Booking confirmado en sistema';
                    isAutomated = true;
                }
                break;

            case 'unidad_asignada':
                if (registro?.contenedor) {
                    const contStr = Array.isArray(registro.contenedor) ? registro.contenedor.join(', ') : registro.contenedor;
                    if (contStr && contStr.trim() !== '') {
                        status = 'SI';
                        date = date || (registro.updatedAt ? registro.updatedAt.toISOString() : null);
                        observation = observation || `Contenedor asignado: ${contStr}`;
                        isAutomated = true;
                    }
                }
                break;

            case 'unidad_en_planta':
                if (transporte?.llegada_planta) {
                    status = 'SI';
                    date = transporte.llegada_planta;
                    observation = observation || 'Unidad arribó a planta';
                    isAutomated = true;
                }
                break;

            case 'despachado_planta':
                if (transporte?.salida_planta) {
                    status = 'SI';
                    date = transporte.salida_planta;
                    observation = observation || 'Unidad despachada desde planta';
                    isAutomated = true;
                }
                break;

            case 'ingresada_stacking':
                if (registro?.ingresoStacking) {
                    status = 'SI';
                    date = registro.ingresoStacking.toISOString();
                    observation = observation || 'Ingreso exitoso a stacking (Registros)';
                    isAutomated = true;
                }
                break;

            case 'zarpe_nave':
                if (registro?.etd) {
                    status = 'SI';
                    date = registro.etd.toISOString();
                    observation = observation || `Zarpe programado: ${registro.naveInicial || ''}`;
                    isAutomated = true;
                }
                break;

            case 'arribo_destino':
                if (registro?.eta) {
                    status = 'SI';
                    date = registro.eta.toISOString();
                    observation = observation || 'Arribo programado a destino';
                    isAutomated = true;
                }
                break;
        }

        return {
            milestone: m,
            label: MILESTONE_LABELS[m],
            status,
            date,
            observation,
            isAutomated // Marcar si es automático para bloquear edición en UI
        };
    });
}

/**
 * Actualiza o crea un evento de seguimiento (Solo Admin/Ejecutivo por RLS).
 */
export async function updateTrackingEvent(
    registroId: string,
    milestone: string,
    status: 'SI' | 'PENDIENTE' | 'NO',
    observation?: string,
    eventDate?: string
) {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('shipment_tracking_events')
        .upsert({
            registro_id: registroId,
            milestone,
            status,
            observation,
            event_date: eventDate || new Date().toISOString(),
            updated_at: new Date().toISOString()
        }, { onConflict: 'registro_id, milestone' })
        .select()
        .single();

    return { data, error };
}
