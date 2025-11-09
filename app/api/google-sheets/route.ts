import { sheets_v4 } from '@googleapis/sheets';
import { NextRequest, NextResponse } from 'next/server';
import { TipoReporte } from '@/lib/reportes';
import {
  createSheetsClient,
  getSheetIdByName,
  getSheetNameFromTipo,
  getSpreadsheetId,
  handleGoogleError,
  mapRegistrosToRows
} from '@/lib/googleSheets';
import { Registro } from '@/types/registros';

interface GoogleSheetsPayload {
  tipoReporte?: TipoReporte;
  registros?: Registro[];
  usuario?: string;
}

export async function POST(request: NextRequest) {
  try {
    const spreadsheetId = getSpreadsheetId();

    const body = (await request.json()) as GoogleSheetsPayload;
    const { tipoReporte, registros, usuario } = body;

    if (!tipoReporte) {
      return NextResponse.json(
        { ok: false, message: 'Debes indicar el tipo de reporte.' },
        { status: 400 }
      );
    }

    if (!registros || !Array.isArray(registros) || registros.length === 0) {
      return NextResponse.json(
        { ok: false, message: 'No hay registros para enviar.' },
        { status: 400 }
      );
    }

    const sheetName = getSheetNameFromTipo(tipoReporte);
    const { headers, rows, columnWidths } = mapRegistrosToRows(
      tipoReporte,
      registros,
      usuario ?? 'Usuario desconocido'
    );

    if (rows.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          message: 'No se generaron filas para enviar a Google Sheets.'
        },
        { status: 400 }
      );
    }

    const sheets = await createSheetsClient();

    const safeSheetName = sheetName.replace(/'/g, "''");

    const sheetId = await getSheetIdByName(sheets, spreadsheetId, sheetName);

    const existingDataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${safeSheetName}'!A4:A`,
      majorDimension: 'ROWS'
    });

    const hasExistingDataRows = existingDataResponse.data.values
      ? existingDataResponse.data.values.some(
          (row) =>
            Array.isArray(row) &&
            row.some((cell) => typeof cell === 'string' && cell.trim().length > 0)
        )
      : false;

    const blockValues = [headers, ...rows];
    const separatorRows = hasExistingDataRows ? 1 : 0;
    const totalInsertedRows = blockValues.length + separatorRows;

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            insertDimension: {
              range: {
                sheetId,
                dimension: 'ROWS',
                startIndex: 3,
                endIndex: 3 + totalInsertedRows
              },
              inheritFromBefore: false
            }
          }
        ]
      }
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${safeSheetName}'!A4`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: blockValues
      }
    });

    const startRowIndex = 3;
    const headerRowIndex = startRowIndex;
    const dataStartRowIndex = headerRowIndex + 1;
    const dataEndRowIndex = startRowIndex + blockValues.length;

    const headerBackgroundColor = {
      red: 0,
      green: 32 / 255,
      blue: 96 / 255
    };

    const requests: sheets_v4.Schema$Request[] = [];
    const headerFormat: sheets_v4.Schema$CellFormat = {
      backgroundColor: headerBackgroundColor,
      horizontalAlignment: 'CENTER',
      verticalAlignment: 'MIDDLE',
      textFormat: {
        foregroundColor: { red: 1, green: 1, blue: 1 },
        bold: true,
        fontSize: 12
      }
    };

    requests.push({
      repeatCell: {
          range: {
            sheetId,
            startRowIndex: headerRowIndex,
            endRowIndex: headerRowIndex + 1,
            startColumnIndex: 0,
            endColumnIndex: headers.length
          },
        cell: {
          userEnteredFormat: headerFormat
        },
        fields:
          'userEnteredFormat(backgroundColor,horizontalAlignment,verticalAlignment,textFormat.foregroundColor,textFormat.bold,textFormat.fontSize)'
      }
    });

    if (dataStartRowIndex < dataEndRowIndex) {
      requests.push({
        repeatCell: {
          range: {
            sheetId,
            startRowIndex: dataStartRowIndex,
            endRowIndex: dataEndRowIndex,
            startColumnIndex: 0,
            endColumnIndex: headers.length
          },
          cell: {
            userEnteredFormat: {
              horizontalAlignment: 'CENTER',
              verticalAlignment: 'MIDDLE'
            }
          },
          fields: 'userEnteredFormat(horizontalAlignment,verticalAlignment)'
        }
      });
    }

    if (blockValues.length > 0) {
      requests.push({
        repeatCell: {
          range: {
            sheetId,
            startRowIndex,
            endRowIndex: dataEndRowIndex,
            startColumnIndex: 0,
            endColumnIndex: headers.length
          },
          cell: {
            userEnteredFormat: {
              wrapStrategy: 'WRAP'
            }
          },
          fields: 'userEnteredFormat.wrapStrategy'
        }
      });
    }

    columnWidths.forEach((pixelSize, index) => {
      requests.push({
        updateDimensionProperties: {
          range: {
            sheetId,
            dimension: 'COLUMNS',
            startIndex: index,
            endIndex: index + 1
          },
          properties: {
            pixelSize
          },
          fields: 'pixelSize'
        }
      });
    });

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests
      }
    });

    return NextResponse.json({
      ok: true,
      inserted: rows.length,
      sheetName
    });
  } catch (error) {
    return handleGoogleError(error);
  }
}

