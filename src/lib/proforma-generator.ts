import { createClient } from '@/lib/supabase-browser';
import { Factura } from '@/types/factura';
import { PlantillaProforma } from '@/types/plantillas-proforma';
import { PlantillaExcelProcessor, facturaADatosPlantilla } from './plantilla-excel-processor';
import { generarFacturaExcel } from './factura-excel';
import { generarFacturaPDF } from './factura-pdf';
import { normalizeBooking } from '@/utils/documentUtils';

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

  // Intentar usar plantilla si se especificó o si hay una default para el cliente
  if (plantillaId) {
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
          const datos = facturaADatosPlantilla(factura);
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
          const datos = facturaADatosPlantilla(factura);
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

  // Fallback a método tradicional si no hay plantilla o falló
  if (!excelBlob) {
    console.log('📄 Usando generador tradicional de Excel');
    const excelResult = await generarFacturaExcel(factura, {
      returnBlob: true,
      fileNameBase: fileBaseName,
    });
    
    if (!excelResult || !('blob' in excelResult)) {
      throw new Error('Error generando Excel');
    }
    
    excelBlob = excelResult.blob;
    excelFileName = excelResult.fileName;
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
