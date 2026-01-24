import { createClient } from '@/lib/supabase-browser';

export type TransporteRecord = {
  id: string;
  ref_cliente: string | null;
  semana: number | null;
  exportacion: string | null;
  planta: string | null;
  deposito: string | null;
  booking: string | null;
  nave: string | null;
  naviera: string | null;
  stacking: string | null;
  fin_stacking: string | null;
  cut_off: string | null;
  late: boolean | null;
  extra_late: boolean | null;
  contenedor: string | null;
  sello: string | null;
  tara: number | null;
  porteo: boolean | null;
  horario_retiro: string | null;
  especie: string | null;
  atmosfera_controlada: boolean | null;
  co2: number | null;
  o2: number | null;
  temperatura: number | null;
  vent: string | null;
  pol: string | null;
  pod: string | null;
  ubicacion: string | null;
  dia_presentacion: string | null;
  hora_presentacion: string | null;
  fecha_planta: string | null;
  llegada_planta: string | null;
  salida_planta: string | null;
  guia_despacho: string | null;
  terminal_portuario: string | null;
  llegada_puerto: string | null;
  transportes: string | null;
  conductor: string | null;
  rut: string | null;
  fono: string | null;
  patentes: string | null;
  patente_rem: string | null;
  ingresado_stacking: boolean | null;
  sobreestadia: boolean | null;
  scanner: boolean | null;
  lote_carga: string | null;
  observacion: string | null;
  // Campo para identificar si viene de registros
  from_registros: boolean | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
};

export async function fetchTransportes(): Promise<TransporteRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('transportes')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching transportes:', error);
    throw error;
  }

  return data ?? [];
}

export async function fetchDeletedTransportes(selectedDays: number = 7): Promise<TransporteRecord[]> {
  const supabase = createClient();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - selectedDays);
  cutoffDate.setHours(0, 0, 0, 0);
  
  const { data, error } = await supabase
    .from('transportes')
    .select('*')
    .not('deleted_at', 'is', null)
    .gte('deleted_at', cutoffDate.toISOString())
    .order('deleted_at', { ascending: false });

  if (error) {
    console.error('Error fetching deleted transportes:', error);
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
  const dateFields = ['stacking', 'fin_stacking', 'cut_off', 'fecha_planta'];
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

export async function deleteTransporte(id: string): Promise<void> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('transportes')
    .update({ 
      deleted_at: new Date().toISOString(),
      deleted_by: (await supabase.auth.getUser()).data.user?.id || null
    })
    .eq('id', id);

  if (error) {
    console.error('Error deleting transporte:', error);
    throw error;
  }
}

export async function deleteMultipleTransportes(ids: string[]): Promise<void> {
  const supabase = createClient();
  
  console.log('🗑️ Servicio: Eliminando múltiples transportes');
  console.log('📋 IDs recibidos:', ids);
  console.log('📊 Cantidad de IDs:', ids.length);
  
  const { error } = await supabase
    .from('transportes')
    .update({ 
      deleted_at: new Date().toISOString(),
      deleted_by: (await supabase.auth.getUser()).data.user?.id || null
    })
    .in('id', ids);

  if (error) {
    console.error('❌ Error deleting multiple transportes:', error);
    throw error;
  }
  
  console.log('✅ Eliminación múltiple completada en BD');
}

