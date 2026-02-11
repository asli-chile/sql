// Tipos TypeScript para el módulo de itinerarios

export type Itinerario = {
  id: string;
  servicio: string;
  consorcio: string | null;
  naviera?: string | null; // Naviera seleccionada
  nave: string;
  viaje: string;
  semana: number | null;
  pol: string;
  etd: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  escalas?: ItinerarioEscala[];
};

export type ItinerarioEscala = {
  id: string;
  itinerario_id: string;
  puerto: string;
  puerto_nombre: string | null;
  eta: string | null;
  dias_transito: number | null;
  orden: number;
  area: string | null; // Área geográfica: ASIA, EUROPA, AMERICA, INDIA-MEDIOORIENTE
  created_at: string;
  updated_at: string;
};

export type ItinerarioWithEscalas = Itinerario & {
  escalas: ItinerarioEscala[];
};

export type ItinerarioFilters = {
  servicio?: string;
  consorcio?: string; // Mantener para compatibilidad, pero usar "naviera" en la UI
  nave?: string;
  semanas?: number; // Número de semanas a mostrar (1-6)
  pol?: string;
  region?: string;
};

