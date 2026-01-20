/**
 * Transforma un objeto de fila de Sheets (con headers como keys) a formato Supabase
 */
export const transformJsonRowToRegistro = (
  row: Record<string, string | number | boolean>,
  rowNumber: number,
  userId?: string
): { registro: Record<string, unknown> | null; transporte: Record<string, unknown> | null } => {
  const registro: Record<string, unknown> = {
    created_by: userId || null,
    updated_by: userId || null,
  };
  const transporte: Record<string, unknown> = {
    created_by: userId || null,
    updated_by: userId || null,
  };
  
  // Mapeo de columnas (igual que en googleSheets.ts)
  const COLUMN_MAPPING: Record<string, string> = {
    'INGRESADO': 'ingresado',
    'EJECUTIVO': 'ejecutivo',
    'SHIPPER': 'shipper',
    'REF ASLI': 'ref_asli',
    'REF CLIENTE': 'ref_externa',
    'AÉREO O MARÍTIMO': 'tipo_transporte',
    'BOOKING': 'booking',
    'NAVE [N°]': 'nave_inicial',
    'NAVIERA': 'naviera',
    'ESPECIE': 'especie',
    'T°': 'temperatura',
    'CBM': 'cbm',
    'CT': 'ct',
    'ATMOSFERA': 'tipo_atmosfera',
    'CO2': 'co2',
    'O2': 'o2',
    'PUERTO EMBARQUE': 'pol',
    'DESTINO': 'pod',
    'ETD': 'etd',
    'ETA': 'eta',
    'CONSIGNATARIO': 'consignatario',
    'PREPAID O COLLECT': 'flete',
    'PLANTA': 'planta',
    'EMISIÓN': 'emision',
    'EMISION': 'emision',
    'DEPOSITO': 'deposito',
    'TRANSPORTE': 'transporte_nombre',
    'CONDUCTOR': 'transporte_conductor',
    'RUT': 'transporte_rut',
    'CONTACTO': 'transporte_contacto',
    'PATENTES CAMION': 'transporte_patentes',
    'CONTENEDOR': 'contenedor',
    'SELLO': 'sello',
    'TARA': 'tara',
    'PORTEO': 'porteo',
    'SPS': 'sps',
    'DUS': 'dus',
    'N°GUÍA DESPACHO': 'numero_guia_despacho',
    'FECHA GUÍA': 'fecha_guia',
    'TRAMO': 'tramo',
    'VALOR FLETE': 'valor_flete',
    'SOBRE ESTADÍA': 'sobre_estadia',
    'NORMAL': 'tipo_ingreso_normal',
    'LATE': 'tipo_ingreso_late',
    'X LATE': 'tipo_ingreso_extra_late',
    'N° PROFORMA': 'numero_proforma',
    'N° BL': 'numero_bl',
    'ESTADO BL': 'estado_bl',
    'ACEPTADO': 'aceptado',
    'LEGALIZADO': 'legalizado'
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
      } else if (transporteField === 'tipo_transporte') {
        transporte['tipo_transporte'] = value.toUpperCase() === 'AÉREO' ? 'AÉREO' : 'MARÍTIMO';
      } else if (['sobre_estadia', 'aceptado', 'legalizado'].includes(transporteField)) {
        transporte[transporteField] = value.toUpperCase() === 'TRUE' || value.toUpperCase() === 'SI' || value === '1';
      } else if (['tara', 'valor_flete', 'valor5', 'valor25', 'kilos_netos'].includes(transporteField)) {
        transporte[transporteField] = value ? parseFloat(value) || null : null;
      } else if (['fecha_guia', 'stacking', 'cut_off', 'fin_stacking', 'fecha_planta'].includes(transporteField)) {
        try {
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            transporte[fieldName] = date.toISOString();
          } else {
            transporte[fieldName] = null;
          }
        } catch {
          transporte[fieldName] = null;
        }
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

    // Números
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

    // Emision
    if (fieldName === 'emision') {
      const emisionValue = value.toUpperCase().trim();
      const emisionesValidas = ['TELEX RELEASE', 'BILL OF LADING', 'SEA WAY BILL', 'EXPRESS RELEASE'];
      const emisionMatch = emisionesValidas.find(e => 
        e === emisionValue || 
        e.replace(/\s+/g, ' ') === emisionValue.replace(/\s+/g, ' ') ||
        e.includes(emisionValue) ||
        emisionValue.includes(e.split(' ')[0])
      );
      registro[fieldName] = emisionMatch || (value ? value : null);
      return;
    }

    // Strings
    registro[fieldName] = value || '';
  });

  // Validar campos obligatorios críticos (no pueden estar vacíos)
  // Los demás campos pueden ser strings vacíos pero no null/undefined
  const criticalFields = ['ref_asli', 'ejecutivo', 'shipper', 'booking', 'naviera', 'nave_inicial', 'especie', 'pol', 'pod'];
  const missingCriticalFields = criticalFields.filter(field => {
    const value = registro[field];
    return value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
  });

  if (missingCriticalFields.length > 0) {
    console.warn(`Fila ${rowNumber}: Faltan campos críticos: ${missingCriticalFields.join(', ')}`);
    return { registro: null, transporte: null };
  }

  // Asegurar que los campos NOT NULL tengan al menos string vacío (no null)
  const notNullFields = ['contenedor', 'deposito', 'flete', 'numero_bl', 'estado_bl'];
  notNullFields.forEach(field => {
    if (registro[field] === null || registro[field] === undefined) {
      registro[field] = '';
    }
  });

  // Valores por defecto
  registro['estado'] = 'PENDIENTE';
  registro['tipo_ingreso'] = hasTipoIngreso ? tipoIngreso : 'NORMAL';
  registro['roleada_desde'] = registro['roleada_desde'] || '';
  registro['contrato'] = registro['contrato'] || '';
  registro['facturacion'] = registro['facturacion'] || '';
  registro['booking_pdf'] = registro['booking_pdf'] || '';
  registro['comentario'] = registro['comentario'] || '';
  registro['observacion'] = registro['observacion'] || '';
  registro['ct'] = registro['ct'] || '';

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

  let transporteResult: Record<string, unknown> | null = null;
  if (hasTransporteData && (transporte.conductor || transporte.rut || transporte.fono || transporte.patentes)) {
    transporteResult = transporte;
  }

  return { registro, transporte: transporteResult };
};
