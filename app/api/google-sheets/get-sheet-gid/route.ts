import { NextRequest, NextResponse } from 'next/server';
import { createSheetsClient, getSpreadsheetId, handleGoogleError } from '@/lib/googleSheets';

/**
 * Obtiene el gid (sheet ID) de una hoja específica
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sheetName = searchParams.get('sheetName');

    if (!sheetName) {
      return NextResponse.json(
        { ok: false, message: 'Debes proporcionar el nombre de la hoja' },
        { status: 400 }
      );
    }

    const spreadsheetId = getSpreadsheetId();
    const sheets = await createSheetsClient();

    const response = await sheets.spreadsheets.get({
      spreadsheetId,
      includeGridData: false,
    });

    const sheet = response.data.sheets?.find(
      (s) => s.properties?.title === sheetName
    );

    if (!sheet) {
      return NextResponse.json(
        { ok: false, message: `No se encontró la hoja "${sheetName}"` },
        { status: 404 }
      );
    }

    const gid = sheet.properties?.sheetId?.toString() || '0';

    return NextResponse.json({
      ok: true,
      gid,
      sheetName: sheet.properties?.title,
    });
  } catch (error) {
    console.error('Error obteniendo gid de la hoja:', error);
    return handleGoogleError(error);
  }
}
