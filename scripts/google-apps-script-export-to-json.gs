/**
 * Script de Google Apps Script para exportar datos de la hoja a JSON
 * 
 * INSTRUCCIONES:
 * 1. Abre tu Google Sheet
 * 2. Ve a Extensiones > Apps Script
 * 3. Pega este código
 * 4. Guarda el proyecto (Ctrl+S)
 * 5. Ejecuta la función crearWebApp() una vez para crear el endpoint
 * 6. Copia la URL del Web App que se genera
 * 7. Úsala en tu aplicación para obtener los datos en JSON
 */

/**
 * Función principal para crear el Web App
 */
function crearWebApp() {
  const spreadsheetId = SpreadsheetApp.getActiveSpreadsheet().getId();
  Logger.log('Spreadsheet ID: ' + spreadsheetId);
  Logger.log('Configura el Web App y copia la URL para usar en tu aplicación');
}

/**
 * Función que será expuesta como Web App
 * Devuelve los datos de la hoja "CONTROL" en formato JSON
 * 
 * GET /exec?sheetName=CONTROL&startRow=1&endRow=646
 */
function doGet(e) {
  try {
    const sheetName = e.parameter.sheetName || 'CONTROL';
    const startRow = parseInt(e.parameter.startRow || '1');
    const endRow = parseInt(e.parameter.endRow || '646');
    
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName(sheetName);
    
    if (!sheet) {
      return ContentService
        .createTextOutput(JSON.stringify({
          ok: false,
          error: `No se encontró la hoja "${sheetName}"`
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Obtener todos los datos
    const lastRow = sheet.getLastRow();
    const lastColumn = sheet.getLastColumn();
    
    if (lastRow < startRow) {
      return ContentService
        .createTextOutput(JSON.stringify({
          ok: false,
          error: `La hoja no tiene datos en la fila ${startRow}`
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Leer encabezados (fila 1)
    const headersRange = sheet.getRange(1, 1, 1, lastColumn);
    const headers = headersRange.getValues()[0].map(h => String(h || '').trim());
    
    // Leer datos (filas desde startRow hasta endRow, pero sin la fila de encabezados)
    const dataStartRow = Math.max(2, startRow); // Datos empiezan en fila 2
    const dataEndRow = Math.min(lastRow, endRow);
    const numRows = dataEndRow - dataStartRow + 1;
    
    if (numRows <= 0) {
      return ContentService
        .createTextOutput(JSON.stringify({
          ok: false,
          error: 'No hay filas de datos para procesar'
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const dataRange = sheet.getRange(dataStartRow, 1, numRows, lastColumn);
    const values = dataRange.getValues();
    
    // Convertir a array de objetos
    const rows = values.map((row, index) => {
      const rowObj = {};
      headers.forEach((header, colIndex) => {
        const value = row[colIndex];
        
        // Detectar si es una fecha (puede venir como Date object o como string de fecha)
        if (value instanceof Date) {
          // Convertir fecha a ISO string
          rowObj[header] = value.toISOString();
        } else if (value !== null && value !== undefined) {
          // Verificar si es un string que parece una fecha
          const strValue = String(value).trim();
          if (strValue !== '') {
            // Intentar parsear como fecha si tiene formato de fecha
            const dateMatch = strValue.match(/\d{4}-\d{2}-\d{2}/) || 
                             strValue.match(/\d{2}\/\d{2}\/\d{4}/) ||
                             strValue.match(/\d{2}-\d{2}-\d{4}/);
            if (dateMatch) {
              try {
                const date = new Date(strValue);
                if (!isNaN(date.getTime())) {
                  rowObj[header] = date.toISOString();
                } else {
                  rowObj[header] = strValue;
                }
              } catch {
                rowObj[header] = strValue;
              }
            } else {
              rowObj[header] = strValue;
            }
          } else {
            rowObj[header] = '';
          }
        } else {
          rowObj[header] = '';
        }
      });
      return rowObj;
    });
    
    // Retornar JSON
    return ContentService
      .createTextOutput(JSON.stringify({
        ok: true,
        spreadsheetId: spreadsheet.getId(),
        sheetName: sheetName,
        headers: headers,
        totalRows: rows.length,
        startRow: dataStartRow,
        endRow: dataEndRow,
        data: rows
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        ok: false,
        error: error.toString(),
        message: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Función POST (opcional, si necesitas más control)
 */
function doPost(e) {
  // Similar a doGet pero con más opciones
  return doGet(e);
}
