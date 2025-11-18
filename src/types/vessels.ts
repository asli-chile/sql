export type ActiveVessel = {
  vessel_name: string;
  last_lat: number | null;
  last_lon: number | null;
  last_position_at: string | null;
  last_api_call_at?: string | null;
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
  distance: string | null;
  predicted_eta: string | null;
  current_draught: string | null;
  length: string | null;
  beam: string | null;
  gross_tonnage: string | null;
  year_of_built: string | null;
  callsign: string | null;
  type_specific: string | null;
  deadweight: string | null;
  hull: string | null;
  builder: string | null;
  material: string | null;
  place_of_build: string | null;
  ballast_water: string | null;
  crude_oil: string | null;
  fresh_water: string | null;
  gas: string | null;
  grain: string | null;
  bale: string | null;
  time_remaining: string | null;
  teu: string | null;
  vessel_image: string | null;
  country_iso: string | null;
  unlocode_destination: string | null;
  update_time: string | null;
  data_source: string | null;
  eni: string | null;
  name: string | null;
};

export type VesselTrackPoint = {
  lat: number;
  lon: number;
  position_at: string;
};


