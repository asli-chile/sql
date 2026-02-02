import { NextRequest, NextResponse } from 'next/server';
import { createSheetsClient, getSpreadsheetId, handleGoogleError } from '@/lib/googleSheets';
import ExcelJS from 'exceljs';

const SHEET_NAME = 'FORMATO PROFORMA';

/**
 * Exporta la hoja "FORMATO PROFORMA" de Google Sheets a Excel
 */
export async function GET(request: NextRequest) {
  try {
    const spreadsheetId = getSpreadsheetId();
    const sheets = await createSheetsClient();

    // Obtener todos los datos de la hoja
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
      includeGridData: true,
    });

    let sheet = response.data.sheets?.find(
      (s) => s.properties?.title === SHEET_NAME
    );

    // Si la hoja no existe, crearla
    if (!sheet) {
      console.log(`Creando hoja "${SHEET_NAME}"...`);
      const createResponse = await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: SHEET_NAME,
                },
              },
            },
          ],
        },
      });

      const newSheetId = createResponse.data.replies?.[0]?.addSheet?.properties?.sheetId;
      if (typeof newSheetId !== 'number') {
        return NextResponse.json(
          { ok: false, message: 'Error creando la hoja' },
          { status: 500 }
        );
      }

      // Obtener la hoja recién creada
      const updatedResponse = await sheets.spreadsheets.get({
        spreadsheetId,
        includeGridData: true,
      });

      sheet = updatedResponse.data.sheets?.find(
        (s) => s.properties?.sheetId === newSheetId
      );

      if (!sheet) {
        return NextResponse.json(
          { ok: false, message: 'Error obteniendo la hoja creada' },
          { status: 500 }
        );
      }
    }

    const sheetId = sheet.properties?.sheetId;
    if (typeof sheetId !== 'number') {
      return NextResponse.json(
        { ok: false, message: 'Error obteniendo ID de la hoja' },
        { status: 500 }
      );
    }

    // Obtener datos de valores y formato
    const valuesResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${SHEET_NAME}'!A1:ZZ1000`, // Rango amplio para capturar todo
    });

    // Obtener formato de celdas
    const gridData = sheet.data?.[0];
    const rowData = gridData?.rowData || [];

    // Crear workbook de Excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(SHEET_NAME);

    const values = valuesResponse.data.values || [];
    const maxRow = Math.max(values.length, rowData.length);

    // Procesar cada fila
    for (let rowIdx = 0; rowIdx < maxRow; rowIdx++) {
      const excelRow = worksheet.getRow(rowIdx + 1);
      const rowValues = values[rowIdx] || [];
      const rowFormat = rowData[rowIdx];

      // Procesar cada columna
      const maxCol = Math.max(rowValues.length, rowFormat?.values?.length || 0, 20);
      for (let colIdx = 0; colIdx < maxCol; colIdx++) {
        const cell = excelRow.getCell(colIdx + 1);
        const cellValue = rowValues[colIdx];
        const cellFormat = rowFormat?.values?.[colIdx];

        // Valor
        if (cellValue !== undefined && cellValue !== null && cellValue !== '') {
          cell.value = cellValue;
        }

        // Formato
        if (cellFormat) {
          const userEnteredFormat = cellFormat.userEnteredFormat;
          
          // Fuente
          if (userEnteredFormat?.textFormat) {
            const textFormat = userEnteredFormat.textFormat;
            cell.font = {
              bold: textFormat.bold || false,
              italic: textFormat.italic || false,
              size: textFormat.fontSize || 11,
              color: textFormat.foregroundColor
                ? {
                    argb: convertColorToArgb(textFormat.foregroundColor),
                  }
                : undefined,
            };
          }

          // Fondo
          if (userEnteredFormat?.backgroundColor) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: {
                argb: convertColorToArgb(userEnteredFormat.backgroundColor),
              },
            };
          }

          // Alineación
          if (userEnteredFormat?.horizontalAlignment) {
            cell.alignment = {
              horizontal: userEnteredFormat.horizontalAlignment as
                | 'left'
                | 'center'
                | 'right',
              vertical: 'middle',
            };
          }

          // Bordes
          if (userEnteredFormat?.borders) {
            const borders: any = {};
            if (userEnteredFormat.borders.top) {
              borders.top = {
                style: 'thin',
                color: { argb: convertColorToArgb(userEnteredFormat.borders.top.color || {}) },
              };
            }
            if (userEnteredFormat.borders.bottom) {
              borders.bottom = {
                style: 'thin',
                color: { argb: convertColorToArgb(userEnteredFormat.borders.bottom.color || {}) },
              };
            }
            if (userEnteredFormat.borders.left) {
              borders.left = {
                style: 'thin',
                color: { argb: convertColorToArgb(userEnteredFormat.borders.left.color || {}) },
              };
            }
            if (userEnteredFormat.borders.right) {
              borders.right = {
                style: 'thin',
                color: { argb: convertColorToArgb(userEnteredFormat.borders.right.color || {}) },
              };
            }
            if (Object.keys(borders).length > 0) {
              cell.border = borders;
            }
          }

          // Celdas combinadas - se manejan a nivel de hoja, no de celda individual
          // Las celdas combinadas se detectan por mergedCells en la hoja
        }
      }

      // Altura de fila
      if (rowFormat?.effectiveFormat?.rowProperties?.pixelSize) {
        excelRow.height = rowFormat.effectiveFormat.rowProperties.pixelSize;
      }
    }

    // Procesar celdas combinadas
    if (gridData?.mergedCells) {
      for (const mergedCell of gridData.mergedCells) {
        try {
          worksheet.mergeCells(
            mergedCell.startRowIndex + 1,
            mergedCell.startColumnIndex + 1,
            mergedCell.endRowIndex,
            mergedCell.endColumnIndex
          );
        } catch (err) {
          // Ignorar errores de celdas ya combinadas
          console.warn('Error combinando celdas:', err);
        }
      }
    }

    // Ancho de columnas
    if (sheet.properties?.gridProperties) {
      const defaultWidth = Math.max(
        sheet.properties.gridProperties.columnCount || 20,
        values[0]?.length || 20
      );
      for (let i = 1; i <= defaultWidth; i++) {
        const col = worksheet.getColumn(i);
        // Google Sheets usa ~72 píxeles por unidad, Excel usa caracteres
        col.width = 10; // Ancho por defecto, se puede ajustar
      }
    }

    // Generar buffer
    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="FORMATO_PROFORMA_${Date.now()}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Error exportando plantilla desde Google Sheets:', error);
    const { message, status } = handleGoogleError(error);
    return NextResponse.json({ ok: false, message }, { status });
  }
}

/**
 * Convierte color de Google Sheets a formato ARGB
 */
function convertColorToArgb(color: any): string {
  if (!color) return 'FF000000'; // Negro por defecto

  const red = Math.round((color.red || 0) * 255);
  const green = Math.round((color.green || 0) * 255);
  const blue = Math.round((color.blue || 0) * 255);
  const alpha = color.alpha !== undefined ? Math.round((1 - color.alpha) * 255) : 0;

  return (
    alpha.toString(16).padStart(2, '0') +
    red.toString(16).padStart(2, '0') +
    green.toString(16).padStart(2, '0') +
    blue.toString(16).padStart(2, '0')
  ).toUpperCase();
}
