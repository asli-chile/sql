// Helper para generar facturas usando plantillas personalizadas
import { createClient } from '@/lib/supabase-browser';
import { PlantillaExcelProcessor, facturaADatosPlantilla } from './plantilla-excel-processor';
import { PlantillaProforma } from '@/types/plantillas-proforma';

/**
 * Obtiene la plantilla default para un cliente
 */
export async function obtenerPlantillaCliente(
  cliente: string,
  tipoFactura: 'proforma' | 'commercial_invoice' | 'packing_list' = 'proforma'
): Promise<PlantillaProforma | null> {
  const supabase = createClient();

  // Buscar plantilla default del cliente
  const { data: plantillaCliente } = await supabase
    .from('plantillas_proforma')
    .select('*')
    .eq('cliente', cliente)
    .eq('tipo_factura', tipoFactura)
    .eq('es_default', true)
    .eq('activa', true)
    .single();

  if (plantillaCliente) return plantillaCliente;

  // Si no hay plantilla del cliente, buscar plantilla genérica
  const { data: plantillaGenerica } = await supabase
    .from('plantillas_proforma')
    .select('*')
    .is('cliente', null)
    .eq('tipo_factura', tipoFactura)
    .eq('es_default', true)
    .eq('activa', true)
    .single();

  return plantillaGenerica || null;
}

/**
 * Genera una factura usando plantilla personalizada o método tradicional
 */
export async function generarFacturaConPlantilla(
  factura: any,
  plantillaId?: string
): Promise<{ blob: Blob; fileName: string; usaPlantilla: boolean }> {
  const supabase = createClient();
  let plantilla: PlantillaProforma | null = null;

  // Si se especifica un ID de plantilla, usarlo
  if (plantillaId) {
    const { data } = await supabase
      .from('plantillas_proforma')
      .select('*')
      .eq('id', plantillaId)
      .single();
    
    plantilla = data;
  } else {
    // Buscar plantilla automáticamente según el cliente
    const clienteNombre = factura.exportador?.nombre || 
                          factura.consignatario?.nombre || 
                          factura.clientePlantilla;
    
    if (clienteNombre) {
      plantilla = await obtenerPlantillaCliente(clienteNombre, 'proforma');
    }
  }

  // Si hay plantilla, usarla
  if (plantilla) {
    try {
      const datos = facturaADatosPlantilla(factura);
      const processor = new PlantillaExcelProcessor(datos);
      
      // Obtener URL firmada si es necesario
      let archivoUrl = plantilla.archivo_url;
      if (!archivoUrl.startsWith('http')) {
        const { data: urlData } = await supabase.storage
          .from('documentos')
          .createSignedUrl(archivoUrl, 60);
        
        if (urlData?.signedUrl) {
          archivoUrl = urlData.signedUrl;
        }
      }
      
      await processor.cargarPlantilla(archivoUrl);
      await processor.procesar();
      
      const blob = await processor.generarBlob();
      const fileName = `Proforma_${factura.refAsli}_${Date.now()}.xlsx`;
      
      return { blob, fileName, usaPlantilla: true };
    } catch (error) {
      console.error('Error procesando plantilla, usando método tradicional:', error);
      // Si falla, continuar con método tradicional
    }
  }

  // Fallback: usar método tradicional (generar Excel programáticamente)
  // Aquí llamarías a tu función existente de generación de Excel
  throw new Error('Método tradicional no implementado en este helper. Usar generador existente.');
}

/**
 * Lista todas las plantillas disponibles para un cliente
 */
export async function listarPlantillasCliente(
  cliente: string,
  tipoFactura?: 'proforma' | 'commercial_invoice' | 'packing_list'
): Promise<PlantillaProforma[]> {
  const supabase = createClient();

  let query = supabase
    .from('plantillas_proforma')
    .select('*')
    .or(`cliente.eq.${cliente},cliente.is.null`)
    .eq('activa', true)
    .order('es_default', { ascending: false })
    .order('created_at', { ascending: false });

  if (tipoFactura) {
    query = query.eq('tipo_factura', tipoFactura);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error listando plantillas:', error);
    return [];
  }

  return data || [];
}

/**
 * Previsualiza una plantilla con datos de ejemplo
 */
export async function previsualizarPlantilla(
  plantillaId: string,
  datosEjemplo?: any
): Promise<{ blob: Blob; fileName: string }> {
  const supabase = createClient();

  const { data: plantilla, error: errorPlantilla } = await supabase
    .from('plantillas_proforma')
    .select('*')
    .eq('id', plantillaId)
    .single();

  if (errorPlantilla || !plantilla) {
    throw new Error('Plantilla no encontrada');
  }

  // Obtener URL firmada del archivo
  let archivoUrl = plantilla.archivo_url;
  
  // Si la URL es relativa (path en storage), obtener URL pública o firmada
  if (!archivoUrl.startsWith('http')) {
    const { data: urlData } = await supabase.storage
      .from('documentos')
      .createSignedUrl(archivoUrl, 60); // URL válida por 60 segundos
    
    if (urlData?.signedUrl) {
      archivoUrl = urlData.signedUrl;
    } else {
      throw new Error('No se pudo obtener URL del archivo');
    }
  }

  // Datos de ejemplo si no se proporcionan
  const datos = datosEjemplo || {
    exportador_nombre: 'EXPORTADORA EJEMPLO S.A.',
    exportador_rut: '12.345.678-9',
    exportador_giro: 'Exportación de frutas',
    exportador_direccion: 'Av. Ejemplo 123, Santiago, Chile',
    exportador_email: 'contacto@ejemplo.cl',
    consignee_company: 'EXAMPLE IMPORT CO.',
    consignee_address: '123 Example St, Shanghai, China',
    consignee_attn: 'John Doe',
    consignee_uscc: '1234567890123456',
    consignee_mobile: '+86 123 4567 8900',
    consignee_email: 'john@example.com',
    consignee_zip: '200000',
    consignee_pais: 'CHINA',
    notify_company: 'EXAMPLE IMPORT CO.',
    notify_address: '123 Example St, Shanghai, China',
    notify_attn: 'John Doe',
    notify_uscc: '1234567890123456',
    notify_mobile: '+86 123 4567 8900',
    notify_email: 'john@example.com',
    notify_zip: '200000',
    fecha_factura: '01/02/2026',
    invoice_number: 'INV-2026-001',
    embarque_number: 'EMB-2026-001',
    csp: 'CSP-001',
    csg: 'CSG-001',
    fecha_embarque: '05/02/2026',
    motonave: 'MV EXAMPLE',
    viaje: 'V.001',
    modalidad_venta: 'FOB',
    clausula_venta: 'FOB VALPARAISO',
    pais_origen: 'CHILE',
    puerto_embarque: 'VALPARAISO',
    puerto_destino: 'SHANGHAI',
    pais_destino: 'CHINA',
    forma_pago: 'T/T 30 DAYS',
    contenedor: 'ABCD1234567',
    ref_asli: 'ASLI-2026-001',
    booking: 'BKG-2026-001',
    ref_cliente: 'CLI-001',
    productos: [
      {
        cantidad: 1000,
        tipo_envase: 'CASES',
        especie: 'CHERRY',
        variedad: 'SANTINA',
        categoria: 'CAT 1',
        etiqueta: 'EXAMPLE BRAND',
        calibre: '2J',
        kg_neto_unidad: 2.5,
        kg_bruto_unidad: 3.0,
        precio_caja: 35.00,
        total: 35000.00,
      },
      {
        cantidad: 500,
        tipo_envase: 'CASES',
        especie: 'CHERRY',
        variedad: 'REGINA',
        categoria: 'PREMIUM',
        etiqueta: 'EXAMPLE BRAND',
        calibre: 'XL',
        kg_neto_unidad: 2.5,
        kg_bruto_unidad: 3.0,
        precio_caja: 40.00,
        total: 20000.00,
      },
    ],
    cantidad_total: 1500,
    peso_neto_total: 3750,
    peso_bruto_total: 4500,
    valor_total: 55000.00,
    valor_total_texto: 'FIFTY FIVE THOUSAND US DOLLARS',
    fecha_hoy: '01/02/2026',
    fecha_hoy_largo: '1 de Febrero de 2026',
    hora_actual: '14:30',
  };

  const processor = new PlantillaExcelProcessor(datos);
  await processor.cargarPlantilla(archivoUrl);
  await processor.procesar();
  
  const blob = await processor.generarBlob();
  const fileName = `Preview_${plantilla.nombre}_${Date.now()}.xlsx`;

  return { blob, fileName };
}
