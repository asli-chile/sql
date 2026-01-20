import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase-server';

const getAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY.');
  }
  return createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
};

const validateUser = async () => {
  const supabaseServer = await createServerClient();
  const { data: userData, error: userError } = await supabaseServer.auth.getUser();
  if (userError || !userData?.user?.id) {
    return { ok: false, status: 401, message: 'No autorizado.' };
  }

  const { data: perfil, error: perfilError } = await supabaseServer
    .from('usuarios')
    .select('rol')
    .eq('auth_user_id', userData.user.id)
    .single();

  if (perfilError || !perfil?.rol) {
    return { ok: false, status: 403, message: 'No se pudo validar el rol.' };
  }

  if (perfil.rol === 'cliente') {
    return { ok: false, status: 403, message: 'Acceso restringido.' };
  }

  return { ok: true, userId: userData.user.id };
};

interface ImportJsonRequest {
  webAppUrl: string;
  sheetName?: string;
  startRow?: number;
  endRow?: number;
  verificarDuplicados?: boolean;
  sobrescribirDuplicados?: boolean;
}

/**
 * Transforma un objeto de fila de Sheets (con headers como keys) a formato Supabase
 */
const transformJsonRowToRegistro = (
  row: Record<string, string>,
  rowNumber: number
): { registro: Record<string, unknown> | null; transporte: Record<string, unknown> | null } => {
  const registro: Record<string, unknown> = {};
  const transporte: Record<string, unknown> = {};
  
  // Mapeo de columnas (igual que en googleSheets.ts)
  const COLUMN_MAPPING: Record<string, string> = {
    'INGRESADO': 'ingresado',
    'EJECUTIVO': 'ejecutivo',
    'SHIPPER': 'shipper',
    'REF ASLI': 'ref_asli',
    'REF CLIENTE': 'ref_externa',
    'BOOKING': 'booking',
    'NAVE [N°]': 'nave_inicial',
    'NAVIERA': 'naviera',
    'ESPECIE': 'especie',
    'T°': 'temperatura',
    'CBM': 'cbm',
    'CT': 'tratamiento de frio',
    'ATMOSFERA': 'tipo_atmosfera',
    'CO2': 'co2',
    'O2': 'o2',
    'PUERTO EMBARQUE': 'pol',
    'DESTINO': 'pod',
    'ETD': 'etd',
    'ETA': 'eta',
    'PREPAID O COLLECT': 'flete',
    'EMISIÓN': 'emision',
    'EMISION': 'emision',
    'DEPOSITO': 'deposito',
    'CONTENEDOR': 'contenedor',
    'NORMAL': 'tipo_ingreso_normal',
    'LATE': 'tipo_ingreso_late',
    'X LATE': 'tipo_ingreso_extra_late',
    'N° BL': 'numero_bl',
    'ESTADO BL': 'estado',
    'CONDUCTOR': 'transporte_conductor',
    'RUT': 'transporte_rut',
    'CONTACTO': 'transporte_contacto',
    'PATENTES CAMION': 'transporte_patentes'
  };

  let tipoIngreso: 'NORMAL' | 'EARLY' | 'LATE' | 'EXTRA LATE' = 'NORMAL';
  let hasTipoIngreso = false;
  let hasTransporteData = false;

  // Procesar cada campo
  Object.keys(row).forEach((header) => {
    const fieldName = COLUMN_MAPPING[header.toUpperCase().trim()];
    if (!fieldName) return;

    const value = String(row[header] || '').trim();

    // Campos de transporte
    if (fieldName.startsWith('transporte_')) {
      hasTransporteData = true;
      const transporteField = fieldName.replace('transporte_', '');
      if (transporteField === 'contacto') {
        transporte['fono'] = value || null;
      } else {
        transporte[transporteField] = value || null;
      }
      return;
    }

    // Tipo de ingreso
    if (fieldName === 'tipo_ingreso_normal' || fieldName === 'tipo_ingreso_late' || fieldName === 'tipo_ingreso_extra_late') {
      const boolValue = value.toUpperCase() === 'TRUE' || value.toUpperCase() === 'SI' || value === '1';
      if (boolValue) {
        hasTipoIngreso = true;
        if (fieldName === 'tipo_ingreso_normal') tipoIngreso = 'NORMAL';
        else if (fieldName === 'tipo_ingreso_late') tipoIngreso = 'LATE';
        else if (fieldName === 'tipo_ingreso_extra_late') tipoIngreso = 'EXTRA LATE';
      }
      return;
    }

    // Fechas (pueden venir como Date string de JavaScript o ISO)
    if (['ingresado', 'etd', 'eta'].includes(fieldName)) {
      if (!value || value.trim() === '' || value.trim() === 'undefined' || value.trim() === 'null') {
        registro[fieldName] = null;
      } else {
        try {
          // Intentar parsear la fecha (puede venir en formato JavaScript Date string)
          const date = new Date(value);
          if (!isNaN(date.getTime()) && date.getFullYear() > 1900) {
            registro[fieldName] = date.toISOString();
          } else {
            registro[fieldName] = null;
          }
        } catch {
          registro[fieldName] = null;
        }
      }
      return;
    }

    // Números (CO2 y O2 pueden ser decimales)
    if (['temperatura', 'cbm'].includes(fieldName)) {
      const numValue = value && value.trim() !== '' ? parseInt(value) || null : null;
      registro[fieldName] = numValue;
      return;
    }
    
    // CO2 y O2 (son INTEGER en la base de datos, redondear si vienen como decimal)
    if (['co2', 'o2'].includes(fieldName)) {
      if (!value || value.trim() === '') {
        registro[fieldName] = null;
      } else {
        // Intentar parsear como número y redondear a entero
        const numValue = parseFloat(value);
        registro[fieldName] = !isNaN(numValue) ? Math.round(numValue) : null;
      }
      return;
    }

    // Emision - normalizar valores
    if (fieldName === 'emision') {
      const emisionValue = value.toUpperCase().trim();
      const emisionesValidas = ['TELEX RELEASE', 'BILL OF LADING', 'SEA WAY BILL', 'EXPRESS RELEASE'];
      
      // Mapeo de valores comunes a valores válidos
      const emisionMapping: Record<string, string> = {
        'SWB': 'SEA WAY BILL',
        'BL': 'BILL OF LADING',
        'BILL': 'BILL OF LADING',
        'TELEX': 'TELEX RELEASE',
        'EXPRESS': 'EXPRESS RELEASE',
        'CIF': null, // CIF no es un tipo de emisión válido, será null
      };
      
      // Verificar si hay un mapeo directo
      if (emisionMapping[emisionValue]) {
        registro[fieldName] = emisionMapping[emisionValue];
        return;
      }
      
      // Buscar coincidencia exacta o parcial
      const emisionMatch = emisionesValidas.find(e => 
        e === emisionValue || 
        e.replace(/\s+/g, ' ') === emisionValue.replace(/\s+/g, ' ') ||
        e.includes(emisionValue) ||
        emisionValue.includes(e.split(' ')[0])
      );
      
      registro[fieldName] = emisionMatch || null;
      return;
    }

    // Strings
    registro[fieldName] = value || '';
  });

  // Validar solo campos realmente críticos (ref_asli es el único obligatorio)
  // Los demás campos pueden estar vacíos y se rellenarán con string vacío o "-"
  if (!registro['ref_asli'] || String(registro['ref_asli']).trim() === '') {
    console.warn(`Fila ${rowNumber}: Falta campo crítico: ref_asli`);
    return { registro: null, transporte: null };
  }

  // Rellenar campos críticos faltantes con "-" o string vacío
  const criticalFields = ['ejecutivo', 'shipper', 'booking', 'naviera', 'nave_inicial', 'especie', 'pol', 'pod'];
  criticalFields.forEach(field => {
    if (!registro[field] || registro[field] === null || registro[field] === undefined || (typeof registro[field] === 'string' && registro[field].trim() === '')) {
      registro[field] = '-';
    }
  });

  // Asegurar que los campos NOT NULL tengan al menos string vacío (no null)
  // Estos campos deben tener string vacío, no "-"
  const notNullFields = ['contenedor', 'deposito', 'flete', 'numero_bl', 'estado_bl', 'tratamiento de frio'];
  notNullFields.forEach(field => {
    if (registro[field] === null || registro[field] === undefined || (typeof registro[field] === 'string' && registro[field].trim() === '')) {
      registro[field] = '';
    }
  });

  // Valores por defecto
  // Si estado viene de ESTADO BL, validar que sea uno de los valores permitidos
  if (registro['estado']) {
    const estadoValue = String(registro['estado']).toUpperCase().trim();
    const estadosValidos = ['PENDIENTE', 'CONFIRMADO', 'CANCELADO'];
    if (estadosValidos.includes(estadoValue)) {
      registro['estado'] = estadoValue;
    } else {
      // Si no es válido, usar PENDIENTE por defecto
      registro['estado'] = 'PENDIENTE';
    }
  } else {
    registro['estado'] = 'PENDIENTE';
  }
  
  registro['tipo_ingreso'] = hasTipoIngreso ? tipoIngreso : 'NORMAL';
  registro['roleada_desde'] = registro['roleada_desde'] || '';
  registro['contrato'] = registro['contrato'] || '';
  registro['facturacion'] = registro['facturacion'] || '';
  registro['booking_pdf'] = registro['booking_pdf'] || '';
  registro['comentario'] = registro['comentario'] || '';
  registro['observacion'] = registro['observacion'] || '';
  
  // estado_bl debe tener un valor por defecto (no viene de ESTADO BL)
  registro['estado_bl'] = registro['estado_bl'] || '';

  // Calcular TT
  if (registro['etd'] && registro['eta']) {
    const etd = new Date(registro['etd'] as string);
    const eta = new Date(registro['eta'] as string);
    const diff = eta.getTime() - etd.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    registro['tt'] = days > 0 ? days : null;
  }

  // Calcular semanas y meses
  const getWeekOfYear = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  };

  if (registro['ingresado']) {
    const date = new Date(registro['ingresado'] as string);
    if (!isNaN(date.getTime())) {
      registro['semana_ingreso'] = getWeekOfYear(date);
      registro['mes_ingreso'] = date.getMonth() + 1;
    }
  }

  if (registro['etd']) {
    const date = new Date(registro['etd'] as string);
    if (!isNaN(date.getTime())) {
      registro['semana_zarpe'] = getWeekOfYear(date);
      registro['mes_zarpe'] = date.getMonth() + 1;
    }
  }

  if (registro['eta']) {
    const date = new Date(registro['eta'] as string);
    if (!isNaN(date.getTime())) {
      registro['semana_arribo'] = getWeekOfYear(date);
      registro['mes_arribo'] = date.getMonth() + 1;
    }
  }

  registro['row_original'] = rowNumber;

  // Limpiar campos temporales
  delete registro['tipo_ingreso_normal'];
  delete registro['tipo_ingreso_late'];
  delete registro['tipo_ingreso_extra_late'];
  delete registro['ref_externa'];

  // Preparar transporte
  let transporteResult: Record<string, unknown> | null = null;
  if (hasTransporteData && (transporte.conductor || transporte.rut || transporte.fono || transporte.patentes)) {
    transporteResult = {
      conductor: transporte.conductor || null,
      rut: transporte.rut || null,
      fono: transporte.fono || null,
      patentes: transporte.patentes || null
    };
  }

  return { registro, transporte: transporteResult };
};

export async function POST(request: NextRequest) {
  try {
    // Validar usuario
    const validation = await validateUser();
    if (!validation.ok) {
      return NextResponse.json({ error: validation.message }, { status: validation.status });
    }

    const body = (await request.json()) as ImportJsonRequest;
    const {
      webAppUrl,
      sheetName = 'CONTROL',
      startRow = 1,
      endRow = 646,
      verificarDuplicados = false,
      sobrescribirDuplicados = false
    } = body;

    if (!webAppUrl || webAppUrl.trim() === '') {
      return NextResponse.json(
        { error: 'Debes proporcionar la URL del Web App de Google Apps Script.' },
        { status: 400 }
      );
    }

    // Obtener datos desde el Web App de Google Apps Script
    console.log(`Obteniendo datos desde Google Apps Script Web App...`);
    const url = new URL(webAppUrl);
    url.searchParams.set('sheetName', sheetName);
    url.searchParams.set('startRow', String(startRow));
    url.searchParams.set('endRow', String(endRow));

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`Error al obtener datos del Web App: ${response.status} ${response.statusText}`);
    }

    const jsonData = await response.json();

    if (!jsonData.ok) {
      return NextResponse.json(
        { error: jsonData.error || 'Error al obtener datos del Web App' },
        { status: 500 }
      );
    }

    console.log(`Se recibieron ${jsonData.data.length} filas de datos con ${jsonData.headers.length} columnas`);

    // Transformar datos
    let registrosValidos: Record<string, unknown>[] = [];
    const transportesValidos: Array<{ transporte: Record<string, unknown>; booking: string; contenedor: string }> = [];
    const registrosInvalidos: Array<{ row: number; error: string }> = [];
    const registrosDuplicados: string[] = [];

    jsonData.data.forEach((row: Record<string, string>, index: number) => {
      const rowNumber = startRow + index + 1;
      const resultado = transformJsonRowToRegistro(row, rowNumber);
      const registro = resultado.registro;
      const transporte = resultado.transporte;

      if (!registro) {
        registrosInvalidos.push({
          row: rowNumber,
          error: `Faltan campos críticos en fila ${rowNumber}`
        });
        return;
      }

      registrosValidos.push(registro);

      if (transporte && (transporte.conductor || transporte.rut || transporte.fono || transporte.patentes)) {
        const booking = String(registro.booking || '').trim();
        const contenedor = String(registro.contenedor || '').trim();
        if (booking || contenedor) {
          transportesValidos.push({ transporte, booking, contenedor });
        }
      }
    });

    console.log(`Registros válidos: ${registrosValidos.length}`);
    console.log(`Registros inválidos: ${registrosInvalidos.length}`);

    // Verificar duplicados si se solicita
    if (verificarDuplicados && registrosValidos.length > 0) {
      const adminClient = getAdminClient();
      const refAslis = registrosValidos.map(r => r.ref_asli as string);

      const { data: existentes } = await adminClient
        .from('registros')
        .select('ref_asli')
        .in('ref_asli', refAslis);

      const refAslisExistentes = new Set((existentes || []).map(e => e.ref_asli));

      if (sobrescribirDuplicados) {
        const paraInsertar = registrosValidos.filter(r => !refAslisExistentes.has(r.ref_asli as string));
        const paraActualizar = registrosValidos.filter(r => refAslisExistentes.has(r.ref_asli as string));

        if (paraActualizar.length > 0) {
          let actualizados = 0;
          for (const registro of paraActualizar) {
            const { error: updateError } = await adminClient
              .from('registros')
              .update(registro)
              .eq('ref_asli', registro.ref_asli);

            if (!updateError) {
              actualizados++;
            }
          }

          console.log(`Registros actualizados: ${actualizados}`);
          registrosDuplicados.push(...paraActualizar.map(r => r.ref_asli as string));
          registrosValidos = paraInsertar;
        }
      } else {
        const paraInsertar = registrosValidos.filter(r => !refAslisExistentes.has(r.ref_asli as string));
        const duplicados = registrosValidos.filter(r => refAslisExistentes.has(r.ref_asli as string));
        registrosDuplicados.push(...duplicados.map(r => r.ref_asli as string));
        registrosValidos = paraInsertar;
      }
    }

    // Insertar en lotes
    const adminClient = getAdminClient();
    const BATCH_SIZE = 100;
    const registrosInsertados: Record<string, unknown>[] = [];
    const errores: Array<{ row: number; error: string }> = [];

    for (let i = 0; i < registrosValidos.length; i += BATCH_SIZE) {
      const lote = registrosValidos.slice(i, i + BATCH_SIZE);

      try {
        const { data, error: insertError } = await adminClient
          .from('registros')
          .insert(lote)
          .select();

        if (insertError) {
          console.error(`Error insertando lote ${Math.floor(i / BATCH_SIZE) + 1}:`, insertError);
          errores.push({
            row: i + 1,
            error: insertError.message
          });
        } else {
          registrosInsertados.push(...(data || []));
          console.log(`Lote ${Math.floor(i / BATCH_SIZE) + 1} insertado: ${data?.length || 0} registros`);
        }
      } catch (error: any) {
        console.error(`Error inesperado en lote ${Math.floor(i / BATCH_SIZE) + 1}:`, error);
        errores.push({
          row: i + 1,
          error: error?.message || 'Error inesperado'
        });
      }
    }

    // Procesar transportes
    let transportesProcesados = 0;
    const transportesErrores: Array<{ booking: string; error: string }> = [];

    if (transportesValidos.length > 0) {
      console.log(`\nProcesando ${transportesValidos.length} registros de transporte...`);
      
      for (const item of transportesValidos) {
        try {
          const { data: transporteExistente } = await adminClient
            .from('transportes')
            .select('id')
            .eq('booking', item.booking)
            .eq('contenedor', item.contenedor)
            .limit(1)
            .single();

          if (transporteExistente) {
            const { error: updateError } = await adminClient
              .from('transportes')
              .update(item.transporte)
              .eq('id', transporteExistente.id);

            if (!updateError) {
              transportesProcesados++;
            } else {
              transportesErrores.push({ booking: item.booking, error: updateError.message });
            }
          } else {
            const transporteData = {
              ...item.transporte,
              booking: item.booking || null,
              contenedor: item.contenedor || null
            };

            const { error: insertError } = await adminClient
              .from('transportes')
              .insert([transporteData]);

            if (!insertError) {
              transportesProcesados++;
            } else {
              transportesErrores.push({ booking: item.booking, error: insertError.message });
            }
          }
        } catch (error: any) {
          transportesErrores.push({ booking: item.booking, error: error?.message || 'Error inesperado' });
        }
      }
    }

    // Estadísticas
    const total = jsonData.data.length;
    const exitosos = registrosInsertados.length;
    const fallidos = errores.length + registrosInvalidos.length;

    console.log(`\n=== Resumen de importación ===`);
    console.log(`Total de filas procesadas: ${total}`);
    console.log(`Registros insertados exitosamente: ${exitosos}`);
    console.log(`Registros fallidos: ${fallidos}`);
    console.log(`Registros duplicados: ${registrosDuplicados.length}`);
    console.log(`Registros inválidos: ${registrosInvalidos.length}`);
    console.log(`Transportes procesados: ${transportesProcesados}`);

    return NextResponse.json({
      ok: true,
      resumen: {
        total,
        exitosos,
        fallidos,
        duplicados: registrosDuplicados.length,
        invalidos: registrosInvalidos.length,
        transportes: transportesProcesados
      },
      detalles: {
        registrosInsertados: exitosos,
        registrosDuplicados,
        registrosInvalidos: registrosInvalidos.slice(0, 50),
        errores: errores.slice(0, 50),
        transportesErrores: transportesErrores.slice(0, 50)
      }
    });
  } catch (error: any) {
    console.error('Error en importación:', error);
    return NextResponse.json(
      { error: error?.message || 'Error inesperado al importar', details: error?.toString() },
      { status: 500 }
    );
  }
}
