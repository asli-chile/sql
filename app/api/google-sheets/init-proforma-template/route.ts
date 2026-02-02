import { NextRequest, NextResponse } from 'next/server';
import { createSheetsClient, getSpreadsheetId, handleGoogleError, getSheetIdByName } from '@/lib/googleSheets';

const SHEET_NAME = 'FORMATO PROFORMA';

/**
 * Inicializa la hoja "FORMATO PROFORMA" con contenido de ejemplo
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Iniciando inicialización de plantilla...');
    const spreadsheetId = getSpreadsheetId();
    console.log('📊 Spreadsheet ID:', spreadsheetId);
    
    const sheets = await createSheetsClient();
    console.log('✅ Cliente de Sheets creado');

    // Verificar si la hoja existe, si no, crearla
    let sheetId: number;
    try {
      sheetId = await getSheetIdByName(sheets, spreadsheetId, SHEET_NAME);
      console.log(`✅ Hoja "${SHEET_NAME}" ya existe, ID: ${sheetId}`);
    } catch (error: any) {
      // La hoja no existe, crearla
      console.log(`📝 Creando hoja "${SHEET_NAME}"...`);
      try {
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
          console.error('❌ Error: No se pudo obtener el ID de la hoja creada');
          console.error('Response:', JSON.stringify(createResponse.data, null, 2));
          throw new Error('Error creando la hoja: No se pudo obtener el ID');
        }
        sheetId = newSheetId;
        console.log(`✅ Hoja creada exitosamente, ID: ${sheetId}`);
      } catch (createError: any) {
        console.error('❌ Error al crear la hoja:', createError);
        throw new Error(`Error creando la hoja: ${createError.message || 'Error desconocido'}`);
      }
    }

    // Contenido de ejemplo para la plantilla
    const ejemploContenido = [
      ['PROFORMA INVOICE'],
      [''],
      ['EXPORTADOR:', 'CONSIGNATARIO:'],
      ['"SHIPPER_NAME"', '"CONSIGNEE_NAME"'],
      ['"SHIPPER_ADDRESS"', '"CONSIGNEE_ADDRESS"'],
      ['"SHIPPER_COUNTRY"', '"CONSIGNEE_COUNTRY"'],
      [''],
      ['INVOICE NO:', '"INVOICE_NUMBER"', 'DATE:', '"ETD"'],
      ['BOOKING NO:', '"BOOKING_NUMBER"', 'REF:', '"REF_ASLI"'],
      [''],
      ['VESSEL:', '"VESSEL_NAME"', 'VOYAGE:', '"VOYAGE_NUMBER"'],
      ['PORT OF LOADING:', '"PORT_OF_LOADING"'],
      ['PORT OF DISCHARGE:', '"PORT_OF_DISCHARGE"'],
      ['CONTAINER:', '"CONTAINER"'],
      [''],
      ['PRODUCTOS:'],
      ['Cantidad', 'Tipo Envase', 'Variedad', 'Categoría', 'Etiqueta', 'Calibre', 'KG Neto', 'Precio Caja', 'Total'],
      ['"CANTIDAD"', '"TIPO_ENVASE"', '"VARIEDAD"', '"CATEGORIA"', '"ETIQUETA"', '"CALIBRE"', '"KG_NETO"', '"PRECIO_CAJA"', '"TOTAL"'],
      [''],
      ['TOTAL CANTIDAD:', '"TOTAL_CANTIDAD"'],
      ['TOTAL VALOR:', '"TOTAL_VALOR"'],
      ['TOTAL EN PALABRAS:', '"TOTAL_EN_PALABRAS"'],
    ];

    // Escribir contenido
    console.log('📝 Escribiendo contenido en la hoja...');
    try {
      const safeSheetName = SHEET_NAME.replace(/'/g, "''");
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${safeSheetName}'!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: ejemploContenido,
        },
      });
      console.log('✅ Contenido escrito exitosamente');
    } catch (writeError: any) {
      console.error('❌ Error escribiendo contenido:', writeError);
      throw new Error(`Error escribiendo contenido: ${writeError.message || 'Error desconocido'}`);
    }

    // Aplicar formato básico
    console.log('🎨 Aplicando formato...');
    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            // Título en negrita y centrado
            {
              repeatCell: {
                range: {
                  sheetId,
                  startRowIndex: 0,
                  endRowIndex: 1,
                  startColumnIndex: 0,
                  endColumnIndex: 10,
                },
                cell: {
                  userEnteredFormat: {
                    textFormat: {
                      bold: true,
                      fontSize: 16,
                    },
                    horizontalAlignment: 'CENTER',
                  },
                },
                fields: 'userEnteredFormat(textFormat,horizontalAlignment)',
              },
            },
            // Headers de productos en negrita
            {
              repeatCell: {
                range: {
                  sheetId,
                  startRowIndex: 15,
                  endRowIndex: 16,
                  startColumnIndex: 0,
                  endColumnIndex: 9,
                },
                cell: {
                  userEnteredFormat: {
                    textFormat: {
                      bold: true,
                    },
                    backgroundColor: {
                      red: 0.9,
                      green: 0.9,
                      blue: 0.9,
                    },
                  },
                },
                fields: 'userEnteredFormat(textFormat,backgroundColor)',
              },
            },
          ],
        },
      });
      console.log('✅ Formato aplicado exitosamente');
    } catch (formatError: any) {
      console.error('⚠️ Error aplicando formato (continuando de todas formas):', formatError);
      // No lanzamos error aquí porque el contenido ya se escribió
    }

    return NextResponse.json({
      ok: true,
      message: `Hoja "${SHEET_NAME}" inicializada con contenido de ejemplo`,
    });
  } catch (error: any) {
    console.error('❌ Error inicializando plantilla:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    
    // Si el error ya tiene un mensaje claro, usarlo
    if (error instanceof Error && error.message && error.message.includes('Error')) {
      return NextResponse.json({ 
        ok: false, 
        message: error.message 
      }, { status: 500 });
    }
    
    // Si no, usar handleGoogleError
    return handleGoogleError(error);
  }
}
