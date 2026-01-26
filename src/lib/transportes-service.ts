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
  transporte: string | null;
  conductor: string | null;
  rut: string | null;
  telefono: string | null;
  patente: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  registro_id: string | null;
  lote_carga: string | null;
  porteo: boolean | null;
  retiro_deposito: string | null;
  hora_planta: string | null;
  fecha_salida: string | null;
  llegada_puerto: string | null;
  patente_remolque: string | null;
  observaciones: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
  cut_off_documental: string | null;
  at_controlada: boolean | null;
  co2: number | null;
  o2: number | null;
  extra_late: boolean | null;
  ubicacion: string | null;
  dia_presentacion: string | null;
  hora_presentacion: string | null;
  llegada_planta: string | null;
  salida_planta: string | null;
  tiempo_planta: string | null;
  terminal_portuario: string | null;
  ingreso_stacking: string | null;
  sobre_estadia: boolean | null;
  scanner: boolean | null;
  atmosfera_controlada: boolean | null;
  fin_stacking: string | null;
  horario_retiro: string | null;
  patente_rem: string | null;
  sobreestadia: boolean | null;
  observacion: string | null;
  ref_cliente: string | null;
  from_registros: boolean | null;
  ref_asli: string | null;
  shipper: string | null;
  consignatario: string | null;
};

export async function fetchTransportes(clientName?: string | null): Promise<TransporteRecord[]> {
  const supabase = createClient();
  
  let query = supabase
    .from('transportes')
    .select('*')
    .is('deleted_at', null);

  // Si hay un cliente específico, obtener el cliente real desde la tabla usuarios
  if (clientName && clientName.trim() !== '') {
    console.log('🔍 Buscando cliente real para usuario:', clientName.trim());
    
    // Primero buscar el usuario y obtener su cliente asignado
    const { data: userData, error: userError } = await supabase
      .from('usuarios')
      .select('cliente')
      .eq('nombre', clientName.trim())
      .single();
    
    if (userError) {
      console.log('⚠️ Usuario no encontrado en tabla usuarios, sin acceso a transportes');
      console.log('🔍 Error detalles:', userError);
      console.log('🔍 Usuario buscado:', clientName.trim());
      // SEGURIDAD: Si no encuentra el usuario, no mostrar ningún transporte
      query = query.eq('exportacion', 'USUARIO_NO_VALIDO_' + Date.now());
    } else if (userData) {
      console.log('✅ Usuario encontrado:', clientName.trim(), '-> cliente:', userData.cliente);
      
      if (userData.cliente && userData.cliente.trim() !== '') {
        // Ahora buscar el cliente real en la tabla clientes
        const { data: clienteData, error: clienteError } = await supabase
          .from('clientes')
          .select('nombre')
          .eq('nombre', userData.cliente.trim())
          .single();
        
        if (clienteError) {
          console.log('⚠️ Cliente no encontrado en tabla clientes, usando nombre directo del usuario');
          query = query.eq('exportacion', userData.cliente.trim());
        } else if (clienteData) {
          console.log('✅ Cliente confirmado:', clienteData.nombre);
          query = query.eq('exportacion', clienteData.nombre);
        }
      } else {
        console.log('⚠️ Usuario sin cliente asignado, sin acceso a transportes');
        query = query.eq('exportacion', 'SIN_CLIENTE_' + Date.now());
      }
    }
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching transportes:', error);
    throw error;
  }

  console.log('📋 Transportes fetched:', data?.length || 0);
  
  // Para debug: mostrar exportacion y otros campos
  if (data && data.length > 0) {
    console.log('🔍 Sample registros con exportacion:', data.slice(0, 3).map(t => ({ 
      id: t.id, 
      exportacion: t.exportacion,
      shipper: t.shipper,
      ref_cliente: t.ref_cliente,
      booking: t.booking,
      contenedor: t.contenedor
    })));
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

