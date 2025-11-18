// Tipos TypeScript para el módulo de itinerarios

export type Itinerario = {
  id: string;
  servicio: string;
  consorcio: string | null;
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
  created_at: string;
  updated_at: string;
};

export type ItinerarioWithEscalas = Itinerario & {
  escalas: ItinerarioEscala[];
};

export type ItinerarioFilters = {
  servicio?: string;
  consorcio?: string;
  nave?: string;
  semana?: number;
  pol?: string;
};

