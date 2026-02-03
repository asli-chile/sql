import { createClient } from '@/lib/supabase-browser';
import { Factura } from '@/types/factura';
import { PlantillaProforma } from '@/types/plantillas-proforma';
import { PlantillaExcelProcessor, facturaADatosPlantilla } from './plantilla-excel-processor';
import { generarFacturaExcel } from './factura-excel';
import { generarFacturaPDF } from './factura-pdf';
import { normalizeBooking } from '@/utils/documentUtils';

/**
 * Carga una plantilla desde Google Sheets y la convierte a Excel
 */
async function cargarPlantillaDesdeGoogleSheets(): Promise<Blob | null> {
  try {
    const response = await fetch('/api/google-sheets/export-proforma-template');
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || 'Error al cargar plantilla desde Google Sheets');
    }

    return await response.blob();
  } catch (error) {
    console.error('Error cargando plantilla desde Google Sheets:', error);
    return null;
  }
}

interface GenerarProformaOptions {
  factura: Factura;
  plantillaId?: string; // ID de plantilla específica, o undefined para auto/tradicional
  contenedor?: string;
}

interface GenerarProformaResult {
  pdfBlob: Blob;
  pdfFileName: string;
  excelBlob: Blob;
  excelFileName: string;
  plantillaUsada: PlantillaProforma | null;
}

/**
 * Genera una proforma (PDF + Excel) usando plantilla personalizada o método tradicional
 */
export async function generarProformaCompleta(
  options: GenerarProformaOptions
): Promise<GenerarProformaResult> {
  const supabase = createClient();
  const { factura, plantillaId, contenedor = '' } = options;

  const refExterna = factura.refAsli?.trim();
  if (!refExterna) {
    throw new Error('La referencia ASLI es obligatoria');
  }

  const safeBaseName = refExterna.replace(/[\\/]/g, '-').trim();
  const fileBaseName = `${safeBaseName} PROFORMA ${contenedor}`.trim();

  let plantillaUsada: PlantillaProforma | null = null;
  let excelBlob: Blob | null = null;
  let excelFileName = '';

  // Intentar usar plantilla desde Google Sheets si plantillaId es 'google-sheets'
  if (plantillaId === 'google-sheets') {
    try {
      console.log('✅ Usando plantilla desde Google Sheets');
      const excelBlobFromSheets = await cargarPlantillaDesdeGoogleSheets();
      
      if (excelBlobFromSheets) {
        // Convertir Blob a ArrayBuffer para el procesador
        const arrayBuffer = await excelBlobFromSheets.arrayBuffer();
        const datos = await facturaADatosPlantilla(factura);
        const processor = new PlantillaExcelProcessor(datos);
        
        // Crear un workbook temporal desde el blob
        const ExcelJS = (await import('exceljs')).default;
        const tempWorkbook = new ExcelJS.Workbook();
        await tempWorkbook.xlsx.load(arrayBuffer);
        
        // Copiar al procesador
        processor['workbook'] = tempWorkbook;
        await processor.procesar();
        
        excelBlob = await processor.generarBlob();
        excelFileName = `${fileBaseName}.xlsx`;
        plantillaUsada = {
          id: 'google-sheets',
          nombre: 'Plantilla Google Sheets',
          cliente: null,
          descripcion: 'Plantilla editada en Google Sheets',
          tipo_factura: 'proforma',
          archivo_url: 'google-sheets://FORMATO PROFORMA',
          archivo_nombre: 'FORMATO PROFORMA',
          archivo_size: null,
          configuracion: {},
          marcadores_usados: [],
          version: 1,
          activa: true,
          es_default: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: null,
        };
      }
    } catch (err) {
      console.error('Error procesando plantilla desde Google Sheets:', err);
      // Continuar con fallback
    }
  }
  
  // Intentar usar plantilla si se especificó o si hay una default para el cliente
  if (plantillaId && plantillaId !== 'google-sheets') {
    // Plantilla específica seleccionada
    const { data: plantilla } = await supabase
      .from('plantillas_proforma')
      .select('*')
      .eq('id', plantillaId)
      .single();

    if (plantilla) {
      try {
        console.log(`✅ Usando plantilla seleccionada: ${plantilla.nombre}`);
        
        // Obtener URL firmada
        const { data: urlData } = await supabase.storage
          .from('documentos')
          .createSignedUrl(plantilla.archivo_url, 60);
        
        if (urlData?.signedUrl) {
          const datos = await facturaADatosPlantilla(factura);
          const processor = new PlantillaExcelProcessor(datos);
          await processor.cargarPlantilla(urlData.signedUrl);
          await processor.procesar();
          
          excelBlob = await processor.generarBlob();
          excelFileName = `${fileBaseName}.xlsx`;
          plantillaUsada = plantilla;
        }
      } catch (err) {
        console.error('Error procesando plantilla seleccionada:', err);
        throw new Error(`Error con plantilla: ${err}`);
      }
    }
  } else if (factura.clientePlantilla) {
    // Auto-buscar plantilla default del cliente
    const { data: plantilla } = await supabase
      .from('plantillas_proforma')
      .select('*')
      .eq('cliente', factura.clientePlantilla)
      .eq('tipo_factura', 'proforma')
      .eq('es_default', true)
      .eq('activa', true)
      .single();

    if (plantilla) {
      try {
        console.log(`✅ Usando plantilla default del cliente: ${plantilla.nombre}`);
        
        const { data: urlData } = await supabase.storage
          .from('documentos')
          .createSignedUrl(plantilla.archivo_url, 60);
        
        if (urlData?.signedUrl) {
          const datos = await facturaADatosPlantilla(factura);
          const processor = new PlantillaExcelProcessor(datos);
          await processor.cargarPlantilla(urlData.signedUrl);
          await processor.procesar();
          
          excelBlob = await processor.generarBlob();
          excelFileName = `${fileBaseName}.xlsx`;
          plantillaUsada = plantilla;
        }
      } catch (err) {
        console.warn('Error con plantilla default, usando tradicional:', err);
      }
    }
  }

  // NO hay fallback genérico - SIEMPRE requerir plantilla específica
  if (!excelBlob) {
    const clienteNombre = factura.exportador?.nombre || 
                          factura.consignatario?.nombre || 
                          factura.clientePlantilla || 
                          'el cliente';
    
    throw new Error(
      `No se encontró una plantilla personalizada ESPECÍFICA para "${clienteNombre}". ` +
      `Por favor, ve a la sección "Plantillas de Factura" y sube una plantilla Excel para este cliente. ` +
      `NO se usan formatos genéricos.`
    );
  }

  // Generar PDF (siempre tradicional)
  const pdfResult = await generarFacturaPDF(factura, {
    returnBlob: true,
    fileNameBase: fileBaseName,
  });
  
  if (!pdfResult || !('blob' in pdfResult)) {
    throw new Error('Error generando PDF');
  }

  return {
    pdfBlob: pdfResult.blob,
    pdfFileName: pdfResult.fileName,
    excelBlob,
    excelFileName,
    plantillaUsada,
  };
}

/**
 * Sube una proforma generada a Supabase Storage
 */
export async function subirProforma(
  booking: string,
  contenedor: string,
  pdfBlob: Blob,
  pdfFileName: string,
  excelBlob: Blob,
  excelFileName: string
): Promise<void> {
  const supabase = createClient();
  const bookingNormalizado = normalizeBooking(booking);
  const bookingSegment = encodeURIComponent(bookingNormalizado);

  // Eliminar archivos anteriores para este booking y contenedor
  try {
    const { data: existingFiles, error: listError } = await supabase.storage
      .from('documentos')
      .list('factura-proforma', {
        limit: 1000,
      });

    if (!listError && existingFiles && existingFiles.length > 0) {
      const filesToDelete = existingFiles
        .filter(f => {
          // Verificar si el archivo pertenece a este booking y contenedor
          const separatorIndex = f.name.indexOf('__');
          if (separatorIndex === -1) return false;
          
          const fileBookingSegment = f.name.slice(0, separatorIndex);
          const rest = f.name.slice(separatorIndex + 2);
          const fileContenedor = rest.split('__')[0];
          
          try {
            const decodedBooking = normalizeBooking(decodeURIComponent(fileBookingSegment));
            const bookingMatch = decodedBooking === bookingNormalizado || fileBookingSegment === bookingSegment;
            const contenedorMatch = fileContenedor === contenedor;
            return bookingMatch && contenedorMatch;
          } catch {
            return fileBookingSegment === bookingSegment && fileContenedor === contenedor;
          }
        })
        .map(f => `factura-proforma/${f.name}`);

      if (filesToDelete.length > 0) {
        const { error: deleteError } = await supabase.storage
          .from('documentos')
          .remove(filesToDelete);

        if (deleteError) {
          console.warn('Error al eliminar archivos anteriores de proforma:', deleteError);
        } else {
          console.log(`Eliminados ${filesToDelete.length} archivo(s) anterior(es) de proforma para ${booking} (${contenedor})`);
        }
      }
    }
  } catch (deleteErr) {
    console.warn('Error al procesar archivos anteriores de proforma:', deleteErr);
  }

  // Subir PDF
  const pdfPath = `factura-proforma/${bookingSegment}__${contenedor}__${pdfFileName}`;
  const { error: pdfError } = await supabase.storage
    .from('documentos')
    .upload(pdfPath, pdfBlob, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (pdfError) {
    throw new Error(`Error subiendo PDF: ${pdfError.message}`);
  }

  // Subir Excel
  const excelPath = `factura-proforma/${bookingSegment}__${contenedor}__${excelFileName}`;
  const { error: excelError } = await supabase.storage
    .from('documentos')
    .upload(excelPath, excelBlob, {
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      upsert: true,
    });

  if (excelError) {
    throw new Error(`Error subiendo Excel: ${excelError.message}`);
  }
}
