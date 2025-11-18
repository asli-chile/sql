import { createClient } from '@/lib/supabase-browser';
import type { Itinerario, ItinerarioEscala, ItinerarioWithEscalas } from '@/types/itinerarios';

export async function fetchItinerarios(): Promise<ItinerarioWithEscalas[]> {
  const supabase = createClient();
  
  const { data: itinerarios, error: itinerariosError } = await supabase
    .from('itinerarios')
    .select('*')
    .order('servicio', { ascending: true })
    .order('etd', { ascending: true });

  if (itinerariosError) {
    console.error('Error fetching itinerarios:', itinerariosError);
    throw itinerariosError;
  }

  if (!itinerarios || itinerarios.length === 0) {
    return [];
  }

  // Obtener escalas para cada itinerario
  const itinerarioIds = itinerarios.map((it) => it.id);
  const { data: escalas, error: escalasError } = await supabase
    .from('itinerario_escalas')
    .select('*')
    .in('itinerario_id', itinerarioIds)
    .order('orden', { ascending: true });

  if (escalasError) {
    console.error('Error fetching escalas:', escalasError);
    throw escalasError;
  }

  // Combinar itinerarios con sus escalas
  const escalasMap = new Map<string, ItinerarioEscala[]>();
  (escalas || []).forEach((escala) => {
    if (!escalasMap.has(escala.itinerario_id)) {
      escalasMap.set(escala.itinerario_id, []);
    }
    escalasMap.get(escala.itinerario_id)!.push(escala as ItinerarioEscala);
  });

  return (itinerarios as Itinerario[]).map((it) => ({
    ...it,
    escalas: escalasMap.get(it.id) || [],
  }));
}

export async function createItinerario(
  data: Omit<Itinerario, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by'>
): Promise<Itinerario> {
  const supabase = createClient();
  
  const { data: itinerario, error } = await supabase
    .from('itinerarios')
    .insert({
      servicio: data.servicio,
      consorcio: data.consorcio,
      nave: data.nave,
      viaje: data.viaje,
      semana: data.semana,
      pol: data.pol,
      etd: data.etd,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating itinerario:', error);
    throw error;
  }

  return itinerario as Itinerario;
}

