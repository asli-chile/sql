// Helper para generar facturas usando plantillas personalizadas
import { createClient } from '@/lib/supabase-browser';
import { PlantillaExcelProcessor, facturaADatosPlantilla } from './plantilla-excel-processor';
import { PlantillaProforma } from '@/types/plantillas-proforma';

/**
 * Obtiene la plantilla ESPECÍFICA del cliente (NO busca genéricas)
 */
export async function obtenerPlantillaCliente(
  cliente: string,
  tipoFactura: 'proforma' | 'commercial_invoice' | 'packing_list' = 'proforma'
): Promise<PlantillaProforma | null> {
  const supabase = createClient();

  // 1. Buscar plantilla default del cliente
  const { data: plantillaDefaultCliente, error: errorDefaultCliente } = await supabase
    .from('plantillas_proforma')
    .select('*')
    .eq('cliente', cliente)
    .eq('tipo_factura', tipoFactura)
    .eq('es_default', true)
    .eq('activa', true)
    .maybeSingle();

  if (errorDefaultCliente && errorDefaultCliente.code !== 'PGRST116') {
    console.warn('Error buscando plantilla default del cliente:', errorDefaultCliente);
  }

  if (plantillaDefaultCliente) return plantillaDefaultCliente;

  // 2. Si no hay default, buscar cualquier plantilla activa del cliente
  const { data: plantillasCliente, error: errorCliente } = await supabase
    .from('plantillas_proforma')
    .select('*')
    .eq('cliente', cliente)
    .eq('tipo_factura', tipoFactura)
    .eq('activa', true)
    .order('es_default', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1);

  if (errorCliente && errorCliente.code !== 'PGRST116') {
    console.warn('Error buscando plantillas del cliente:', errorCliente);
  }

  if (plantillasCliente && plantillasCliente.length > 0) {
    return plantillasCliente[0];
  }

  // NO buscar plantillas genéricas - solo específicas del cliente
  return null;
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

  // PRIORIDAD 1: Usar plantilla_id guardada en la factura (si existe)
  if (factura.plantillaId) {
    const { data, error } = await supabase
      .from('plantillas_proforma')
      .select('*')
      .eq('id', factura.plantillaId)
      .eq('activa', true)
      .maybeSingle();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error obteniendo plantilla guardada:', error);
      throw new Error(`Error al obtener la plantilla guardada: ${error.message}`);
    }
    
    if (data) {
      plantilla = data;
    }
  }
  
  // PRIORIDAD 2: Si se especifica un ID de plantilla explícitamente, usarlo
  if (!plantilla && plantillaId) {
    const { data, error } = await supabase
      .from('plantillas_proforma')
      .select('*')
      .eq('id', plantillaId)
      .eq('activa', true)
      .maybeSingle();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error obteniendo plantilla por ID:', error);
      throw new Error(`Error al obtener la plantilla: ${error.message}`);
    }
    
    plantilla = data;
  }
  
  // PRIORIDAD 3: Buscar plantilla automáticamente según el cliente (SOLO ESPECÍFICAS)
  if (!plantilla) {
    // Intentar múltiples variantes del nombre del cliente
    const nombresCliente = [
      factura.clientePlantilla,
      factura.exportador?.nombre,
      factura.consignatario?.nombre,
    ].filter(Boolean) as string[];
    
    // Buscar con cada variante del nombre
    for (const nombreCliente of nombresCliente) {
      if (nombreCliente) {
        plantilla = await obtenerPlantillaCliente(nombreCliente, 'proforma');
        if (plantilla) break;
      }
    }
  }

  // SIEMPRE requerir plantilla ESPECÍFICA del cliente - NO hay formato genérico
  if (!plantilla) {
    const clienteNombre = factura.clientePlantilla || 
                          factura.exportador?.nombre || 
                          factura.consignatario?.nombre || 
                          'el cliente';
    
    // Buscar TODAS las plantillas activas para ver qué clientes tienen plantillas
    const { data: todasPlantillas, error: errorTodas } = await supabase
      .from('plantillas_proforma')
      .select('id, nombre, cliente, activa, es_default')
      .eq('activa', true)
      .order('cliente', { ascending: true })
      .order('es_default', { ascending: false })
      .limit(50);
    
    let mensaje = `No se encontró una plantilla personalizada ESPECÍFICA para "${clienteNombre}".\n\n`;
    mensaje += `IMPORTANTE: Solo se usan plantillas específicas del cliente, NO genéricas.\n\n`;
    
    if (errorTodas) {
      mensaje += `Error al verificar plantillas: ${errorTodas.message}\n`;
      mensaje += `Por favor, verifica que tengas permisos para leer plantillas o contacta a un administrador.`;
    } else if (todasPlantillas && todasPlantillas.length > 0) {
      // Agrupar por cliente
      const plantillasPorCliente: Record<string, string[]> = {};
      todasPlantillas.forEach(p => {
        const cliente = p.cliente || '(Sin cliente)';
        if (!plantillasPorCliente[cliente]) {
          plantillasPorCliente[cliente] = [];
        }
        plantillasPorCliente[cliente].push(p.nombre);
      });
      
      mensaje += `Plantillas disponibles en el sistema:\n\n`;
      Object.entries(plantillasPorCliente).forEach(([cliente, nombres]) => {
        mensaje += `Cliente: "${cliente}"\n`;
        nombres.forEach(nombre => {
          mensaje += `  - ${nombre}\n`;
        });
        mensaje += `\n`;
      });
      
      mensaje += `Para usar una plantilla con "${clienteNombre}":\n`;
      mensaje += `1. Ve a la sección "Plantillas de Factura"\n`;
      mensaje += `2. Edita la plantilla deseada y asigna el cliente "${clienteNombre}"\n`;
      mensaje += `3. O crea una nueva plantilla para "${clienteNombre}"`;
    } else {
      mensaje += `No hay plantillas en el sistema.\n`;
      mensaje += `Por favor, ve a la sección "Plantillas de Factura" y sube una plantilla Excel.`;
    }
    
    throw new Error(mensaje);
  }

  // Usar plantilla personalizada
  try {
    const datos = await facturaADatosPlantilla(factura);
    const processor = new PlantillaExcelProcessor(datos);
    
    // Obtener URL firmada si es necesario
    let archivoUrl = plantilla.archivo_url;
    if (!archivoUrl.startsWith('http')) {
      const { data: urlData } = await supabase.storage
        .from('documentos')
        .createSignedUrl(archivoUrl, 60);
      
      if (urlData?.signedUrl) {
        archivoUrl = urlData.signedUrl;
      } else {
        throw new Error('No se pudo obtener la URL de la plantilla');
      }
    }
    
    await processor.cargarPlantilla(archivoUrl);
    await processor.procesar();
    
    const blob = await processor.generarBlob();
    
    // Usar el número de invoice como nombre del archivo
    const numeroInvoice = factura.embarque?.numeroInvoice || '';
    let fileName: string;
    
    if (numeroInvoice && numeroInvoice.trim()) {
      // Limpiar el número de invoice de caracteres no válidos para nombres de archivo
      const nombreLimpio = numeroInvoice
        .trim()
        .replace(/[<>:"/\\|?*]/g, '_') // Reemplazar caracteres no válidos
        .replace(/\s+/g, '_') // Reemplazar espacios con guiones bajos
        .replace(/_+/g, '_') // Eliminar guiones bajos múltiples
        .replace(/^_+|_+$/g, ''); // Eliminar guiones bajos al inicio y final
      
      fileName = `${nombreLimpio}.xlsx`;
    } else {
      // Fallback si no hay número de invoice
      fileName = `Proforma_${factura.refAsli}_${Date.now()}.xlsx`;
    }
    
    return { blob, fileName, usaPlantilla: true };
  } catch (error: any) {
    console.error('Error procesando plantilla:', error);
    throw new Error(`Error al procesar la plantilla personalizada: ${error?.message || 'Error desconocido'}`);
  }
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
