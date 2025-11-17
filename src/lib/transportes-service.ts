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
  
  // Preparar los datos para insertar, convirtiendo strings vacíos a null y fechas correctamente
  const insertData: any = { ...payload };
  
  // Convertir strings vacíos a null para campos opcionales
  Object.keys(insertData).forEach((key) => {
    if (insertData[key] === '' || insertData[key] === undefined) {
      insertData[key] = null;
    }
  });
  
  // Convertir fechas de string a formato correcto
  const dateFields = ['stacking', 'cut_off', 'fecha_planta'];
  dateFields.forEach((field) => {
    if (insertData[field] && typeof insertData[field] === 'string') {
      const dateStr = insertData[field].trim();
      if (dateStr === '') {
        insertData[field] = null;
      } else {
        // Asegurar que la fecha esté en formato ISO
        try {
          const date = new Date(dateStr);
          if (!Number.isNaN(date.getTime())) {
            insertData[field] = date.toISOString().split('T')[0];
          } else {
            insertData[field] = null;
          }
        } catch {
          insertData[field] = null;
        }
      }
    }
  });
  
  // Remover campos que no existen en la tabla
  delete insertData.id;
  delete insertData.created_at;
  delete insertData.updated_at;
  delete insertData.created_by;
  delete insertData.updated_by;
  
  const { error } = await supabase.from('transportes').insert(insertData);
  if (error) {
    console.error('Error creating transporte:', error);
    throw error;
  }
}

