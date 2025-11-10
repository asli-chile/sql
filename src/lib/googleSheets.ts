import { auth, sheets_v4 } from '@googleapis/sheets';
import { NextResponse } from 'next/server';
import { Registro } from '@/types/registros';
import { TipoReporte } from './reportes';

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

  if (value.includes('\\n')) {
    return value.replace(/\\n/g, '\n');
  }

  return value;
};

export const createSheetsClient = async (): Promise<SheetsClient> => {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = normalizePrivateKey(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);

  if (!clientEmail || !privateKey) {
    throw new Error(
      'Variables de entorno de Google Sheets incompletas. Asegúrate de definir GOOGLE_SERVICE_ACCOUNT_EMAIL y GOOGLE_SERVICE_ACCOUNT_KEY.'
    );
  }

  const authClient = new auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: SCOPES
  });

  await authClient.authorize();

  return new sheets_v4.Sheets({ auth: authClient });
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
  const envValue =
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID ??
    process.env.NEXT_PUBLIC_GOOGLE_SHEETS_SPREADSHEET_ID ??
    '';

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
      'Generado por',
      'REF ASLI',
      'REF EXTERNA',
      'Cliente',
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

    const baseWidths = [180, 90, 110, 140, 140, 160, 120, 140, 110, 110, 70, 140, 70, 70, 120, 160];

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
        generatedBy,
        registro.refAsli ?? '-',
        registro.refCliente ?? '-',
        registro.shipper ?? '-',
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

