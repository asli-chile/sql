import type { Itinerario, ItinerarioWithEscalas } from '@/types/itinerarios';

// Función pública para obtener itinerarios (sin autenticación)
export async function fetchPublicItinerarios(): Promise<ItinerarioWithEscalas[]> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const response = await fetch(`${apiUrl}/api/public/itinerarios`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      if (errorData?.code === 'TABLE_NOT_FOUND') {
        console.error('❌ Error: La tabla de itinerarios no existe en la base de datos.');
        throw new Error('La tabla de itinerarios no existe.');
      }
      
      throw new Error(errorData?.error || `Error ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return result.itinerarios || [];
  } catch (error: any) {
    console.error('Error fetching public itinerarios:', error);
    throw error;
  }
}

export async function fetchItinerarios(): Promise<ItinerarioWithEscalas[]> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const response = await fetch(`${apiUrl}/api/admin/itinerarios`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Si la tabla no existe, mostrar un mensaje más útil
      if (errorData?.code === 'TABLE_NOT_FOUND') {
        console.error('❌ Error: La tabla de itinerarios no existe en la base de datos.');
        console.error('📝 Por favor, ejecuta el script SQL: scripts/create-itinerarios-table.sql');
        console.error('💡 Ve a Supabase Dashboard > SQL Editor y ejecuta el script.');
        throw new Error('La tabla de itinerarios no existe. Por favor, ejecuta el script de creación en Supabase SQL Editor.');
      }
      
      throw new Error(errorData?.error || `Error ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return result.itinerarios || [];
  } catch (error: any) {
    console.error('Error fetching itinerarios:', error);
    throw error;
  }
}

// Nota: createItinerario ahora debería usar la API route POST /api/admin/itinerarios
// Esta función se mantiene por compatibilidad pero debería actualizarse para usar la API
export async function createItinerario(
  data: Omit<Itinerario, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by'>
): Promise<Itinerario> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const response = await fetch(`${apiUrl}/api/admin/itinerarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        servicio: data.servicio,
        consorcio: data.consorcio,
        nave: data.nave,
        viaje: data.viaje || '',
        semana: data.semana,
        pol: data.pol,
        etd: data.etd,
        escalas: [], // Las escalas deben agregarse por separado
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.error || `Error ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return result.itinerario;
  } catch (error: any) {
    console.error('Error creating itinerario:', error);
    throw error;
  }
}

