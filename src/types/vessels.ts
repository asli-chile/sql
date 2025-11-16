export type ActiveVessel = {
  vessel_name: string;
  last_lat: number | null;
  last_lon: number | null;
  last_position_at: string | null;
  etd?: string | null;
  eta: string | null;
  destination?: string | null;
  bookings: string[];
  containers: string[];
  track?: VesselTrackPoint[];
};

export type VesselPosition = {
  id: string;
  vessel_name: string;
  imo: string | null;
  mmsi: string | null;
  last_lat: number | null;
  last_lon: number | null;
  last_position_at: string | null;
  last_api_call_at: string | null;
  raw_payload: unknown | null;
  // Campos adicionales extraídos del raw_payload para consultas más rápidas
  speed: number | null;
  course: number | null;
  destination: string | null;
  navigational_status: string | null;
  ship_type: string | null;
  country: string | null;
  eta_utc: string | null;
  atd_utc: string | null;
  last_port: string | null;
  unlocode_lastport: string | null;
};

export type VesselTrackPoint = {
  lat: number;
  lon: number;
  position_at: string;
};


