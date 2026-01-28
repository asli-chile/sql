import { auth, sheets_v4 } from '@googleapis/sheets';
import { NextResponse } from 'next/server';
import { Registro } from '@/types/registros';
import { TipoReporte } from './reportes';

// Debug al inicio del módulo
console.log('🔍 Debug - Variables de entorno al cargar googleSheets.ts:');
console.log('🔍 GOOGLE_SHEETS_SPREADSHEET_ID:', process.env.GOOGLE_SHEETS_SPREADSHEET_ID);
console.log('🔍 NEXT_PUBLIC_GOOGLE_SHEETS_SPREADSHEET_ID:', process.env.NEXT_PUBLIC_GOOGLE_SHEETS_SPREADSHEET_ID);
console.log('🔍 GOOGLE_SERVICE_ACCOUNT_EMAIL:', process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
console.log('🔍 GOOGLE_SERVICE_ACCOUNT_KEY exists:', !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY);

type SheetsClient = sheets_v4.Sheets;

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

const TIPO_REPORTE_TO_SHEET: Record<TipoReporte, string> = {
  'reserva-confirmada': 'RESERVA CONFIRMADA + STACKING',
  zarpe: 'ZARPE',
  arribo: 'ARRIBO',
  'gate-out': 'GATE OUT'
};

const normalizePrivateKey = (value?: string): string | undefined => {
  if (!value) {
    return undefined;
  }

  console.log('🔑 Debug - Normalizando private key original length:', value.length);

  // Remover comillas si están presentes
  let key = value.replace(/^"(.*)"$/, '$1');

  // Reemplazar \n con saltos de línea reales
  if (key.includes('\\n')) {
    key = key.replace(/\\n/g, '\n');
    console.log('🔑 Debug - Reemplazados \\n con saltos de línea');
  }

  // Limpiar espacios en blanco al inicio y final
  key = key.trim();

  // Verificar que tenga el formato correcto
  if (!key.startsWith('-----BEGIN PRIVATE KEY-----') || !key.endsWith('-----END PRIVATE KEY-----')) {
    console.error('🔑 Error: La clave privada no tiene el formato correcto');
    console.error('🔑 Inicio:', key.substring(0, 30));
    console.error('🔑 Fin:', key.substring(key.length - 30));
    console.error('🔑 Longitud:', key.length);
    return undefined;
  }

  // Verificar que no contenga caracteres inválidos
  const invalidChars = /[^\x20-\x7E\n\r]/;
  if (invalidChars.test(key)) {
    console.error('🔑 Error: La clave privada contiene caracteres inválidos');
    return undefined;
  }

  // Verificar longitud mínima (una clave RSA típica tiene ~1600-2000 caracteres)
  if (key.length < 1000) {
    console.error('🔑 Error: La clave privada parece demasiado corta:', key.length);
    return undefined;
  }

  console.log('🔑 Debug - Private key normalizada correctamente, length:', key.length);
  return key;
};

export const createSheetsClient = async (): Promise<SheetsClient> => {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || 
                     process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL_NEW || 
                     'asli-gmail-erp@asli-gmail-erp.iam.gserviceaccount.com';
  const privateKey = normalizePrivateKey(process.env.GOOGLE_SERVICE_ACCOUNT_KEY) || 
                     normalizePrivateKey(process.env.GOOGLE_SERVICE_ACCOUNT_KEY_NEW) || 
                     "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCrUG0TWyajYYjG\nlkZcnIhMrYvAJNjIHg5dPc1lGOHLgtj9BkGYdaXvq0bDoArCYFxxcrZ+LV5ivBKF\nFONE67KPiudzMpBEWyxg8kZXgzPXD5427O4jITCPSsW6xJhByNM6v51Z9TjMq4Dt\nmeiRMO3aJK7Y1MI2bn0hmGALmPnV4xHh2fr3Ri6YSzAsDWAwviALnoDgIevUQpGa\n8oe325z0v20kNbhjdEcStDUO7bYQYjNgob0kQgkCFPQjkqb8oJTZlzANnLpsqPyn\nSaz6yIVHLYeA7/7MFDobwVQNNlGVf0IIsJujnnXG6kuAHTfHdFzzs+w8QTRmCeKp\nJPWXKP2RAgMBAAECggEAEVJb/QmJ4hoyDLZUHfgb1fj0OPTg0Hcth6MAmhjGd9/e\nldLknghDQ3UDfjM380hwAG6TYjWvJfeTPc6LXkQgtV/boCu8J5U6awEEOMQE4Vls\na2xQdc/cy5hJXuWS6Y/nP7jxLY/ccuFic2PM/qU+X4C3ByiYDI3mbBeumm2Y0VXu\nLI5m8WJ01mQVk/KBnWSbeJBiV4uq0+9OPFS/hnoEtpwBcvbKEFqi74D/zvs+fivG\nGur9SqVgTVDMrp48Pd0aep0eTs4lNqyvUly5K/yGf80ngKIB7iEkoOIWamaQyMb6\nOd6wwSCkFmDxnMTNbwPmbRuqO0TembTeD4xR88XqOwKBgQDrbJXrvhYPou5o7Amh\nlvp13a769rPLozBKG1HER9dq7p2M36+ti4zFtdEln9GBAvhxNSHIKaxsemH3ktUu\n66UWT15EM0lQqAUCawlN6JokNfKLy8a3TZLmX1tf9oAIBB5VGDwxTEQm/eOrup/W\n5Lzf0f/Sl/lEG5nu2r2BAtMgRwKBgQC6SW8dn1FMQuHPuo3zal9mEDGqf/FskJEB\n6mjZGhN8lIsl54Z8TWD5kDGbohCUa6+ibPqMx/MfwhaypRBrQXj11FrYCYR+z4UD\ncoxNgRuG5T225EETGlPdnYDFutgVekkR1ucDwkrTuEcBhgAG0gO2p9BJ+U7NDgRU\nmpopLxp3ZwKBgQC1P+xMixRBBZe3f8IKfkpl5D6LSNQzu3e6Fj5ld0oKMZtqkeyX\nGBFRRiG3bcvGH5tWzSktCaiN+8rg6FLoxNNc0c4pg7K2PiVdLzsCmEnUBxStPD3J\nchfe9RtMTmNTyJfxu67b5XOy8VUPKadVstUXHH5wjECEhxuEITQ01w/kkQKBgFHa\nxJ1yjOmClfCOG6OywPp68SfnEjFPELiTxMBoqdla+A2Ov1RNN+hRCMtHGhvteX5Y\nfntvvI/e29RhnWZTnY//YG9/Nx31l4/dPHMt4OeUQVrkzwdS0TkW5Sd9I0fEtOjG\n0jmfnPuNBH5R4B8fFwyijm6CwrJtj0+Ro12nWezPAoGAKNrloHOblE4uaCKSpjOB\nIXXh2GMVO7O9YoavQVdWPcZW3XhWmWCWJmhBzonFGBtyfvZnRkNzqSEs+9HyBtX4\nAr89O/w8elvecdAszDT/6WSDcFHq+8Yr6LLdBt20iBLj7zNOTuMpMEKb+LzoB4O8\n9T1QQQsRloSj3zwdVxLh1TQ=\n-----END PRIVATE KEY-----\n";

  console.log('🔑 Debug - Creando cliente Sheets:');
  console.log('🔑 Email:', clientEmail);
  console.log('🔑 Private Key length:', privateKey?.length);
  console.log('🔑 Private Key starts with:', privateKey?.substring(0, 50));
  console.log('🔑 Private Key ends with:', privateKey?.substring(privateKey.length - 50));
  console.log('🔑 Todas las variables GOOGLE:', Object.keys(process.env).filter(key => key.includes('GOOGLE')));

  if (!clientEmail || !privateKey) {
    console.error('🔑 ❌ Variables faltantes:');
    console.error('🔑 ❌ clientEmail existe:', !!clientEmail);
    console.error('🔑 ❌ privateKey existe:', !!privateKey);
    throw new Error(
      'Variables de entorno de Google Sheets incompletas. Asegúrate de definir GOOGLE_SERVICE_ACCOUNT_EMAIL y GOOGLE_SERVICE_ACCOUNT_KEY.'
    );
  }

  try {
    const authClient = new auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: SCOPES
    });

    console.log('🔑 Intentando autorizar...');
    await authClient.authorize();
    console.log('🔑 ✅ Autorización exitosa');

    return new sheets_v4.Sheets({ auth: authClient });
  } catch (error) {
    console.error('🔑 ❌ Error en autenticación:', error);
    throw error;
  }
};

export const getSheetNameFromTipo = (tipo: TipoReporte): string => {
  const sheetName = TIPO_REPORTE_TO_SHEET[tipo];

  if (!sheetName) {
    throw new Error(`Tipo de reporte no soportado: ${tipo}`);
  }

  return sheetName;
};

export const getSheetIdByName = async (
  sheets: SheetsClient,
  spreadsheetId: string,
  sheetName: string
): Promise<number> => {
  const metadata = await sheets.spreadsheets.get({
    spreadsheetId,
    includeGridData: false
  });

  const matchingSheet = metadata.data.sheets?.find(
    (sheet) => sheet.properties?.title === sheetName
  );

  const sheetId = matchingSheet?.properties?.sheetId;

  if (typeof sheetId !== 'number') {
    throw new Error(`No se encontró la hoja "${sheetName}" en el Spreadsheet.`);
  }

  return sheetId;
};

export const getSpreadsheetId = (): string => {
  // Debug más detallado
  console.log('🔍 Debug - getSpreadsheetId llamado:');
  console.log('🔍 process.env.GOOGLE_SHEETS_SPREADSHEET_ID:', process.env.GOOGLE_SHEETS_SPREADSHEET_ID);
  console.log('🔍 process.env.NEXT_PUBLIC_GOOGLE_SHEETS_SPREADSHEET_ID:', process.env.NEXT_PUBLIC_GOOGLE_SHEETS_SPREADSHEET_ID);
  console.log('🔍 Todas las variables de entorno:', Object.keys(process.env).filter(key => key.includes('GOOGLE')));

  const envValue =
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID ??
    process.env.NEXT_PUBLIC_GOOGLE_SHEETS_SPREADSHEET_ID ??
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID_NEW ??
    process.env.NEXT_PUBLIC_GOOGLE_SHEETS_SPREADSHEET_ID_NEW ??
    '1w-qqXkBPNW2j0yvOiL4xp83cBtdbpYWU8YV77PaGBjg'; // Temporal: hardcoded

  // Debug: Verificar qué variables están cargadas
  console.log('🔍 Debug - Variables de entorno:');
  console.log('GOOGLE_SHEETS_SPREADSHEET_ID:', process.env.GOOGLE_SHEETS_SPREADSHEET_ID);
  console.log('NEXT_PUBLIC_GOOGLE_SHEETS_SPREADSHEET_ID:', process.env.NEXT_PUBLIC_GOOGLE_SHEETS_SPREADSHEET_ID);
  console.log('envValue:', envValue);

  const spreadsheetId = envValue.trim();

  if (!spreadsheetId) {
    throw new Error(
      'Falta configurar GOOGLE_SHEETS_SPREADSHEET_ID en las variables de entorno.'
    );
  }

  return spreadsheetId;
};

const formatDate = (value: Date | string | null): string => {
  if (!value) {
    return '-';
  }

  try {
    const date =
      value instanceof Date
        ? value
        : new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return date.toLocaleDateString('es-CL');
  } catch {
    return '-';
  }
};

const calculateTransitTime = (etd: Date | string | null, eta: Date | string | null): string => {
  if (!etd || !eta) {
    return '-';
  }

  try {
    const etdDate = etd instanceof Date ? etd : new Date(etd);
    const etaDate = eta instanceof Date ? eta : new Date(eta);

    const diff = etaDate.getTime() - etdDate.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (Number.isNaN(days) || days < 0) {
      return '-';
    }

    return days.toString();
  } catch {
    return '-';
  }
};

const ensureArray = (value: Registro['contenedor']): string => {
  if (!value) {
    return '-';
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(', ') : '-';
  }

  return value;
};

const shouldIncludeGasColumn = (
  registros: Registro[],
  key: 'co2' | 'o2'
): boolean => {
  return registros.some((registro) => registro[key] !== null && registro[key] !== undefined);
};

export interface SheetPayload {
  headers: string[];
  rows: string[][];
  columnWidths: number[];
}

export const mapRegistrosToRows = (
  tipo: TipoReporte,
  registros: Registro[],
  usuario: string
): SheetPayload => {
  if (registros.length === 0) {
    return {
      headers: [],
      rows: [],
      columnWidths: []
    };
  }

  const generatedBy =
    usuario && usuario.trim().length > 0 ? usuario.trim() : 'Usuario desconocido';

  if (tipo === 'reserva-confirmada') {
    const includeCo2 = shouldIncludeGasColumn(registros, 'co2');
    const includeO2 = shouldIncludeGasColumn(registros, 'o2');

    const baseHeaders = [
      'REF ASLI',
      'Cliente',
      'Booking',
      'Naviera',
      'Nave',
      'POL',
      'POD',
      'ETD',
      'ETA',
      'TT',
      'Especie',
      'T°',
      'CBM',
      'Flete',
      'Depósito'
    ];

    const baseWidths = [90, 140, 120, 140, 160, 120, 140, 110, 110, 70, 140, 70, 70, 120, 160];

    const headers = [...baseHeaders];
    const columnWidths = [...baseWidths];

    if (includeCo2) {
      headers.push('CO2');
      columnWidths.push(80);
    }

    if (includeO2) {
      headers.push('O2');
      columnWidths.push(80);
    }

    const rows = registros.map((registro) => {
      const row: string[] = [
        registro.refAsli ?? '-',
        registro.shipper ?? '-',
        registro.booking ?? '-',
        registro.naviera ?? '-',
        registro.naveInicial ?? '-',
        registro.pol ?? '-',
        registro.pod ?? '-',
        formatDate(registro.etd),
        formatDate(registro.eta),
        calculateTransitTime(registro.etd, registro.eta),
        registro.especie ?? '-',
        registro.temperatura !== null && registro.temperatura !== undefined
          ? String(registro.temperatura)
          : '-',
        registro.cbm !== null && registro.cbm !== undefined
          ? String(registro.cbm)
          : '-',
        registro.flete ?? '-',
        registro.deposito ?? '-'
      ];

      if (includeCo2) {
        row.push(
          registro.co2 !== null && registro.co2 !== undefined
            ? String(registro.co2)
            : '-'
        );
      }

      if (includeO2) {
        row.push(
          registro.o2 !== null && registro.o2 !== undefined
            ? String(registro.o2)
            : '-'
        );
      }

      return row;
    });

    return {
      headers,
      rows,
      columnWidths
    };
  }

  if (tipo === 'zarpe' || tipo === 'arribo') {
    const headers = [
      'Generado por',
      'REF ASLI',
      'REF EXTERNA',
      'Cliente',
      'Naviera',
      'Nave',
      'Booking',
      'Contenedor',
      'POL',
      'POD',
      'ETD',
      'ETA',
      'TT',
      'Especie',
      'T°',
      'CBM',
      'Flete',
      'Depósito'
    ];

    const columnWidths = [180, 90, 110, 140, 140, 160, 140, 160, 120, 140, 110, 110, 70, 140, 70, 70, 120, 160];

    const rows = registros.map((registro) => [
      generatedBy,
      registro.refAsli ?? '-',
      registro.refCliente ?? '-',
      registro.shipper ?? '-',
      registro.naviera ?? '-',
      registro.naveInicial ?? '-',
      registro.booking ?? '-',
      ensureArray(registro.contenedor),
      registro.pol ?? '-',
      registro.pod ?? '-',
      formatDate(registro.etd),
      formatDate(registro.eta),
      calculateTransitTime(registro.etd, registro.eta),
      registro.especie ?? '-',
      registro.temperatura !== null && registro.temperatura !== undefined
        ? String(registro.temperatura)
        : '-',
      registro.cbm !== null && registro.cbm !== undefined
        ? String(registro.cbm)
        : '-',
      registro.flete ?? '-',
      registro.deposito ?? '-'
    ]);

    return {
      headers,
      rows,
      columnWidths
    };
  }

  if (tipo === 'gate-out') {
    const headers = [
      'Generado por',
      'Naviera',
      'Nave',
      'Booking',
      'Depósito'
    ];

    const columnWidths = [180, 140, 160, 140, 160];

    const rows = registros.map((registro) => [
      generatedBy,
      registro.naviera ?? '-',
      registro.naveInicial ?? '-',
      registro.booking ?? '-',
      registro.deposito ?? '-'
    ]);

    return {
      headers,
      rows,
      columnWidths
    };
  }

  throw new Error(`Tipo de reporte no soportado: ${tipo}`);
};

export const handleGoogleError = (error: unknown) => {
  console.error('Error al interactuar con Google Sheets:', error);

  if (error instanceof Error) {
    return NextResponse.json(
      {
        ok: false,
        message: error.message
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      ok: false,
      message: 'Error inesperado al conectar con Google Sheets.'
    },
    { status: 500 }
  );
};

// ============ FUNCIONES DE IMPORTACIÓN DESDE SHEETS ============

/**
 * Parsea una fecha desde Google Sheets que puede venir en múltiples formatos
 */
export const parseSheetDate = (value: string | null | undefined): string | null => {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed === '-' || trimmed === '') {
    return null;
  }

  try {
    // Si ya es un formato ISO o serial date de Excel/Sheets
    if (trimmed.match(/^\d{4}-\d{2}-\d{2}/)) {
      const date = new Date(trimmed);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }

    // Formato DD/MM/YYYY o DD-MM-YYYY
    if (trimmed.includes('/') || trimmed.includes('-')) {
      const separators = trimmed.includes('/') ? '/' : '-';
      const parts = trimmed.split(separators);
      
      if (parts.length === 3) {
        let day: number, month: number, year: number;
        
        // Intentar determinar el formato por la longitud del año
        if (parts[2].length === 4) {
          // Probablemente DD/MM/YYYY o MM/DD/YYYY
          day = parseInt(parts[0]);
          month = parseInt(parts[1]);
          year = parseInt(parts[2]);
          
          // Si el día es > 12, definitivamente es DD/MM/YYYY
          if (day > 12 && month <= 12) {
            // DD/MM/YYYY
          } else if (month > 12 && day <= 12) {
            // MM/DD/YYYY - intercambiar
            [day, month] = [month, day];
          } else {
            // Asumir DD/MM/YYYY por defecto
          }
        } else {
          // Formato corto, asumir DD/MM/YY
          day = parseInt(parts[0]);
          month = parseInt(parts[1]);
          year = 2000 + parseInt(parts[2]);
        }

        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
          const date = new Date(year, month - 1, day);
          if (!isNaN(date.getTime())) {
            return date.toISOString();
          }
        }
      }
    }

    // Intentar parseo directo
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  } catch {
    // Si falla, retornar null
  }

  return null;
};

/**
 * Parsea un número desde Google Sheets
 */
export const parseSheetNumber = (value: string | null | undefined): number | null => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number') {
    return isNaN(value) ? null : value;
  }

  const trimmed = String(value).trim();
  if (!trimmed || trimmed === '-' || trimmed === '') {
    return null;
  }

  // Eliminar caracteres no numéricos excepto punto y coma
  const cleaned = trimmed.replace(/[^\d.,]/g, '').replace(',', '.');
  const parsed = parseFloat(cleaned);

  return isNaN(parsed) ? null : Math.round(parsed);
};

/**
 * Obtiene la semana del año (1-52)
 */
export const getWeekOfYear = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
};

/**
 * Calcula la diferencia en días entre dos fechas
 */
export const calculateDaysDifference = (startDate: Date | string | null, endDate: Date | string | null): number | null => {
  if (!startDate || !endDate) {
    return null;
  }

  try {
    const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
    const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return null;
    }

    const diff = end.getTime() - start.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    return days > 0 ? days : null;
  } catch {
    return null;
  }
};

/**
 * Lee datos de una hoja de Google Sheets
 */
export const readSheetData = async (
  sheets: SheetsClient,
  spreadsheetId: string,
  sheetName: string,
  startRow: number = 1,
  endRow?: number
): Promise<{ headers: string[]; rows: string[][] }> => {
  const safeSheetName = sheetName.replace(/'/g, "''");
  // Usar notación A1 para el rango (ej: 'CONTROL'!A1:BC646)
  // Si no se especifica endRow, usar hasta la última columna disponible
  const range = endRow 
    ? `'${safeSheetName}'!A${startRow}:ZZ${endRow}`
    : `'${safeSheetName}'!A${startRow}:ZZ`;

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
      majorDimension: 'ROWS'
    });

    const values = response.data.values || [];

    if (values.length === 0) {
      throw new Error(`No se encontraron datos en la hoja "${sheetName}"`);
    }

    const headers = (values[0] || []).map((h: string) => String(h).trim());
    const rows = values.slice(1).map((row: string[]) => 
      row.map((cell: string) => String(cell ?? '').trim())
    );

    return { headers, rows };
  } catch (error: any) {
    console.error('Error en readSheetData:', error);
    if (error?.message) {
      throw new Error(`Error al leer hoja "${sheetName}": ${error.message}`);
    }
    throw error;
  }
};

/**
 * Mapeo de columnas de Sheets a campos de Supabase
 * Basado en el mapeo proporcionado por el usuario
 */
const COLUMN_MAPPING: Record<string, string> = {
  'INGRESADO': 'ingresado',
  'EJECUTIVO': 'ejecutivo',
  'SHIPPER': 'shipper',
  'REF ASLI': 'ref_asli',
  'REF CLIENTE': 'ref_externa', // Se guarda temporalmente para uso posterior
  'BOOKING': 'booking',
  'NAVE [N°]': 'nave_inicial',
  'NAVIERA': 'naviera',
  'ESPECIE': 'especie',
  'T°': 'temperatura',
  'CBM': 'cbm',
  'CT': 'ct',
  'ATMOSFERA': 'tipo_atmosfera', // AT CONTROLADA
  'CO2': 'co2',
  'O2': 'o2',
  'PUERTO EMBARQUE': 'pol',
  'DESTINO': 'pod',
  'ETD': 'etd',
  'ETA': 'eta',
  'PREPAID O COLLECT': 'flete',
  'EMISIÓN': 'emision',
  'EMISION': 'emision', // Variante sin tilde
  'DEPOSITO': 'deposito',
  'CONTENEDOR': 'contenedor',
  'NORMAL': 'tipo_ingreso_normal',
  'LATE': 'tipo_ingreso_late',
  'X LATE': 'tipo_ingreso_extra_late',
  'N° BL': 'numero_bl',
  'ESTADO BL': 'estado_bl',
  // Campos para transportes (se procesan por separado)
  'CONDUCTOR': 'transporte_conductor',
  'RUT': 'transporte_rut',
  'CONTACTO': 'transporte_contacto',
  'PATENTES CAMION': 'transporte_patentes'
};

/**
 * Transforma una fila de Sheets a un objeto compatible con Supabase registros
 * Retorna un objeto con registro y transporte (si aplica)
 */
export const transformSheetRowToRegistro = (
  headers: string[],
  row: string[],
  rowNumber: number
): { registro: Record<string, unknown> | null; transporte: Record<string, unknown> | null } => {
  const registro: Record<string, unknown> = {};
  const transporte: Record<string, unknown> = {};
  
  // Crear mapa de índice de columna a nombre de campo
  const columnMap: Record<number, string> = {};
  headers.forEach((header, index) => {
    const normalizedHeader = header.toUpperCase().trim();
    if (COLUMN_MAPPING[normalizedHeader]) {
      columnMap[index] = COLUMN_MAPPING[normalizedHeader];
    }
  });

  // Extraer valores de tipo_ingreso (NORMAL, LATE, X LATE son booleanos)
  let tipoIngreso: 'NORMAL' | 'EARLY' | 'LATE' | 'EXTRA LATE' = 'NORMAL';
  let hasTipoIngreso = false;
  let hasTransporteData = false;

  // Procesar cada celda
  row.forEach((cell, index) => {
    const fieldName = columnMap[index];
    if (!fieldName) return;

    const value = cell || '';

    // Campos de transporte (se guardan por separado)
    if (fieldName.startsWith('transporte_')) {
      hasTransporteData = true;
      const transporteField = fieldName.replace('transporte_', '');
      // Mapear contacto a fono
      if (transporteField === 'contacto') {
        transporte['fono'] = value || null;
      } else {
        transporte[transporteField] = value || null;
      }
      return;
    }

    // Mapeo especial para tipo_ingreso
    if (fieldName === 'tipo_ingreso_normal' || fieldName === 'tipo_ingreso_late' || fieldName === 'tipo_ingreso_extra_late') {
      const boolValue = value.toUpperCase().trim() === 'TRUE' || value.toUpperCase().trim() === 'SI' || value === '1';
      if (boolValue) {
        hasTipoIngreso = true;
        if (fieldName === 'tipo_ingreso_normal') {
          tipoIngreso = 'NORMAL';
        } else if (fieldName === 'tipo_ingreso_late') {
          tipoIngreso = 'LATE';
        } else if (fieldName === 'tipo_ingreso_extra_late') {
          tipoIngreso = 'EXTRA LATE';
        }
      }
      return;
    }

    // Mapeo de fechas
    if (['ingresado', 'etd', 'eta'].includes(fieldName)) {
      const dateValue = parseSheetDate(value);
      registro[fieldName] = dateValue;
      return;
    }

    // Mapeo de números
    if (['temperatura', 'cbm', 'co2', 'o2'].includes(fieldName)) {
      const numValue = parseSheetNumber(value);
      registro[fieldName] = numValue;
      return;
    }

    // Mapeo especial para emision (validar valores permitidos)
    if (fieldName === 'emision') {
      const emisionValue = value.toUpperCase().trim();
      const emisionesValidas = ['TELEX RELEASE', 'BILL OF LADING', 'SEA WAY BILL', 'EXPRESS RELEASE'];
      // Buscar coincidencia parcial o exacta
      const emisionMatch = emisionesValidas.find(e => 
        e === emisionValue || 
        e.replace(/\s+/g, ' ') === emisionValue.replace(/\s+/g, ' ') ||
        e.includes(emisionValue) ||
        emisionValue.includes(e.split(' ')[0])
      );
      registro[fieldName] = emisionMatch || (value ? value : null);
      return;
    }

    // Mapeo de strings
    registro[fieldName] = value || '';
  });

  // Validar campos obligatorios
  const requiredFields = ['ref_asli', 'ejecutivo', 'shipper', 'booking', 'contenedor', 'naviera', 'nave_inicial', 'especie', 'pol', 'pod', 'deposito', 'flete', 'numero_bl', 'estado_bl'];
  const missingFields = requiredFields.filter(field => !registro[field] || String(registro[field]).trim() === '');

  if (missingFields.length > 0) {
    console.warn(`Fila ${rowNumber}: Faltan campos obligatorios: ${missingFields.join(', ')}`);
    return { registro: null, transporte: null };
  }

  // Agregar campos con valores por defecto
  registro['estado'] = 'PENDIENTE';
  registro['tipo_ingreso'] = hasTipoIngreso ? tipoIngreso : 'NORMAL';
  registro['roleada_desde'] = registro['roleada_desde'] || '';
  registro['contrato'] = registro['contrato'] || '';
  registro['facturacion'] = registro['facturacion'] || '';
  registro['booking_pdf'] = registro['booking_pdf'] || '';
  registro['comentario'] = registro['comentario'] || '';
  registro['observacion'] = registro['observacion'] || '';
  registro['ct'] = registro['ct'] || '';

  // Calcular TT si existen ETD y ETA
  if (registro['etd'] && registro['eta']) {
    const tt = calculateDaysDifference(registro['etd'] as string, registro['eta'] as string);
    registro['tt'] = tt;
  }

  // Calcular semanas y meses si existen fechas
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

  // Agregar número de fila original
  registro['row_original'] = rowNumber;

  // Limpiar campos temporales
  delete registro['tipo_ingreso_normal'];
  delete registro['tipo_ingreso_late'];
  delete registro['tipo_ingreso_extra_late'];
  delete registro['ref_externa'];

  // Preparar objeto de transporte si hay datos
  let transporteResult: Record<string, unknown> | null = null;
  if (hasTransporteData && (transporte.conductor || transporte.rut || transporte.fono || transporte.patentes)) {
    transporteResult = {
      conductor: transporte.conductor || null,
      rut: transporte.rut || null,
      fono: transporte.fono || null,
      patentes: transporte.patentes || null
    };
  }

  return { 
    registro: registro, 
    transporte: transporteResult 
  };
};
