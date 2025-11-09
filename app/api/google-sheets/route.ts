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

const columnLettersToIndex = (letters: string): number => {
  let result = 0;
  const uppercase = letters.toUpperCase();
  for (let i = 0; i < uppercase.length; i += 1) {
    const code = uppercase.charCodeAt(i) - 64; // 'A' => 1
    result = result * 26 + code;
  }
  return result - 1; // Convert to zero-based index
};

const parseA1Range = (range?: string | null) => {
  if (!range) {
    return null;
  }

  const match = range.match(/^(?:'([^']+)'|([^!]+))!([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
  if (!match) {
    return null;
  }

  const [, quotedSheet, unquotedSheet, startColLetters, startRowStr, endColLetters, endRowStr] = match;
  const sheetName = quotedSheet ?? unquotedSheet;

  const startRowIndex = parseInt(startRowStr, 10) - 1;
  const endRowIndex = parseInt(endRowStr, 10);
  const startColumnIndex = columnLettersToIndex(startColLetters);
  const endColumnIndex = columnLettersToIndex(endColLetters) + 1;

  return {
    sheetName,
    startRowIndex,
    endRowIndex,
    startColumnIndex,
    endColumnIndex
  };
};

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

    const [headerResponse, dataResponse, sheetId] = await Promise.all([
      sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `'${safeSheetName}'!1:1`,
        majorDimension: 'ROWS'
      }),
      sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `'${safeSheetName}'!A2:A`,
        majorDimension: 'ROWS'
      }),
      getSheetIdByName(sheets, spreadsheetId, sheetName)
    ]);

    const firstRow = headerResponse.data.values?.[0] ?? [];
    const hasHeader = firstRow.some((cell) => typeof cell === 'string' && cell.trim().length > 0);
    const hasExistingDataRows = dataResponse.data.values
      ? dataResponse.data.values.some((row) =>
          Array.isArray(row)
            ? row.some((cell) => typeof cell === 'string' && cell.trim().length > 0)
            : false
        )
      : false;

    const valuesToInsert: string[][] = [];

    if (!hasHeader) {
      valuesToInsert.push(headers);
    } else if (hasExistingDataRows) {
      valuesToInsert.push(new Array(headers.length).fill(''));
      valuesToInsert.push(headers);
    }

    valuesToInsert.push(...rows);

    const appendResponse = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `'${safeSheetName}'!A:A`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: valuesToInsert
      }
    });

    const updatedRangeInfo = parseA1Range(appendResponse.data.updates?.updatedRange);
    const startRowIndex = updatedRangeInfo?.startRowIndex ?? 0;
    const totalInsertedRows = valuesToInsert.length;
    const endRowIndex = startRowIndex + totalInsertedRows;

    const headerBackgroundColor = {
      red: 0,
      green: 32 / 255,
      blue: 96 / 255
    };

    const requests: sheets_v4.Schema$Request[] = [];

    const headerRanges: sheets_v4.Schema$GridRange[] = [];

    if (!hasHeader) {
      headerRanges.push({
        sheetId,
        startRowIndex,
        endRowIndex: startRowIndex + 1,
        startColumnIndex: 0,
        endColumnIndex: headers.length
      });
    } else if (hasExistingDataRows) {
      headerRanges.push({
        sheetId,
        startRowIndex: startRowIndex + 1,
        endRowIndex: startRowIndex + 2,
        startColumnIndex: 0,
        endColumnIndex: headers.length
      });
    }

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

    headerRanges.forEach((range) => {
      requests.push({
        repeatCell: {
          range,
          cell: {
            userEnteredFormat: headerFormat
          },
          fields:
            'userEnteredFormat(backgroundColor,horizontalAlignment,verticalAlignment,textFormat.foregroundColor,textFormat.bold,textFormat.fontSize)'
        }
      });
    });

    const dataStartRowIndex = (() => {
      if (!hasHeader) {
        return startRowIndex + 1;
      }

      if (hasExistingDataRows) {
        return startRowIndex + 2;
      }

      return startRowIndex;
    })();

    if (dataStartRowIndex < endRowIndex) {
      requests.push({
        repeatCell: {
          range: {
            sheetId,
            startRowIndex: dataStartRowIndex,
            endRowIndex,
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

    if (totalInsertedRows > 0) {
      requests.push({
        repeatCell: {
          range: {
            sheetId,
            startRowIndex,
            endRowIndex,
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

