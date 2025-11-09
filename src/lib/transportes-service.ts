import { createClient } from '@/lib/supabase-browser';

export type TransporteRecord = {
  id: string;
  semana: number | null;
  exportacion: string | null;
  planta: string | null;
  deposito: string | null;
  booking: string | null;
  nave: string | null;
  naviera: string | null;
  stacking: string | null;
  cut_off: string | null;
  late: boolean | null;
  contenedor: string | null;
  sello: string | null;
  tara: number | null;
  especie: string | null;
  temperatura: number | null;
  vent: string | null;
  pol: string | null;
  pod: string | null;
  fecha_planta: string | null;
  guia_despacho: string | null;
  transportes: string | null;
  conductor: string | null;
  rut: string | null;
  fono: string | null;
  patentes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};

export async function fetchTransportes(): Promise<TransporteRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('transportes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching transportes:', error);
    throw error;
  }

  return data ?? [];
}

export async function createTransporte(payload: Partial<TransporteRecord>): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('transportes').insert(payload);
  if (error) {
    console.error('Error creating transporte:', error);
    throw error;
  }
}

