// Procesador de plantillas Excel con marcadores
import ExcelJS from 'exceljs';
import { DatosPlantilla, ProductoPlantilla } from '@/types/plantillas-proforma';

export class PlantillaExcelProcessor {
  private workbook: ExcelJS.Workbook;
  private datos: DatosPlantilla;

  constructor(datos: DatosPlantilla) {
    this.workbook = new ExcelJS.Workbook();
    this.datos = datos;
  }

  /**
   * Carga una plantilla Excel desde una URL
   */
  async cargarPlantilla(url: string): Promise<void> {
    try {
      console.log('🔄 Cargando plantilla desde:', url);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Error cargando plantilla: ${response.status} ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      console.log('📦 ArrayBuffer size:', arrayBuffer.byteLength);
      
      await this.workbook.xlsx.load(arrayBuffer);
      
      const sheetsCount = this.workbook.worksheets.length;
      console.log('📊 Hojas cargadas:', sheetsCount);
      
      if (sheetsCount === 0) {
        throw new Error('El archivo Excel no contiene hojas de trabajo');
      }
    } catch (error: any) {
      console.error('❌ Error en cargarPlantilla:', error);
      throw new Error(`No se pudo cargar la plantilla: ${error?.message || 'Error desconocido'}`);
    }
  }

  /**
   * Procesa la plantilla reemplazando todos los marcadores
   */
  async procesar(): Promise<ExcelJS.Workbook> {
    console.log('🔧 Iniciando procesamiento de plantilla...');
    
    // Procesar cada hoja del libro
    this.workbook.eachSheet((worksheet, sheetId) => {
      console.log(`📄 Procesando hoja ${sheetId}: "${worksheet.name}"`);
      this.procesarHoja(worksheet);
    });

    console.log('✅ Procesamiento completado');
    return this.workbook;
  }

  /**
   * Procesa una hoja individual
   */
  private procesarHoja(worksheet: ExcelJS.Worksheet): void {
    const filaProductos = this.encontrarFilaProductos(worksheet);

    // Si encontramos fila de productos, procesarla especialmente
    if (filaProductos) {
      this.procesarTablaProductos(worksheet, filaProductos);
    }

    // Reemplazar marcadores simples en toda la hoja
    worksheet.eachRow((row, rowNumber) => {
      // Si es la fila de productos, ya la procesamos
      if (filaProductos && rowNumber === filaProductos) return;

      row.eachCell((cell) => {
        if (cell.value && typeof cell.value === 'string') {
          cell.value = this.reemplazarMarcadores(cell.value);
        }
      });
    });
  }

  /**
   * Encuentra la fila que contiene marcadores de productos
   * Soporta ambos formatos: {{PRODUCTO_*}} y "PRODUCTO_*"
   */
  private encontrarFilaProductos(worksheet: ExcelJS.Worksheet): number | null {
    let filaEncontrada: number | null = null;

    worksheet.eachRow((row, rowNumber) => {
      if (filaEncontrada) return; // Ya encontramos

      row.eachCell((cell) => {
        if (cell.value && typeof cell.value === 'string') {
          if (cell.value.includes('{{PRODUCTO_CANTIDAD}}') || 
              cell.value.includes('{{PRODUCTO_VARIEDAD}}') ||
              cell.value.includes('"PRODUCTO_CANTIDAD"') || 
              cell.value.includes('"PRODUCTO_VARIEDAD"')) {
            filaEncontrada = rowNumber;
          }
        }
      });
    });

    return filaEncontrada;
  }

  /**
   * Procesa la tabla de productos duplicando filas
   */
  private procesarTablaProductos(worksheet: ExcelJS.Worksheet, filaBase: number): void {
    // Guardar la fila plantilla
    const filaPlantilla = worksheet.getRow(filaBase);
    const valores = filaPlantilla.values as any[];
    const estilos = this.copiarEstilosDeRow(filaPlantilla);

    // Eliminar la fila plantilla
    worksheet.spliceRows(filaBase, 1);

    // Insertar una fila por cada producto
    this.datos.productos.forEach((producto, index) => {
      const nuevaFila = worksheet.insertRow(filaBase + index, []);
      
      // Copiar valores y reemplazar marcadores de producto
      valores.forEach((valor, colIndex) => {
        if (colIndex === 0) return; // Skip primera columna (índice)
        
        const cell = nuevaFila.getCell(colIndex);
        
        if (typeof valor === 'string') {
          cell.value = this.reemplazarMarcadoresProducto(valor, producto);
        } else {
          cell.value = valor;
        }
        
        // Aplicar estilos
        if (estilos[colIndex]) {
          this.aplicarEstilos(cell, estilos[colIndex]);
        }
      });
    });
  }

  /**
   * Copia los estilos de una fila
   */
  private copiarEstilosDeRow(row: ExcelJS.Row): any[] {
    const estilos: any[] = [];
    
    row.eachCell((cell, colNumber) => {
      estilos[colNumber] = {
        font: cell.font ? { ...cell.font } : undefined,
        alignment: cell.alignment ? { ...cell.alignment } : undefined,
        fill: cell.fill ? { ...cell.fill } : undefined,
        border: cell.border ? { ...cell.border } : undefined,
        numFmt: cell.numFmt,
      };
    });
    
    return estilos;
  }

  /**
   * Aplica estilos a una celda
   */
  private aplicarEstilos(cell: ExcelJS.Cell, estilos: any): void {
    if (estilos.font) cell.font = estilos.font;
    if (estilos.alignment) cell.alignment = estilos.alignment;
    if (estilos.fill) cell.fill = estilos.fill;
    if (estilos.border) cell.border = estilos.border;
    if (estilos.numFmt) cell.numFmt = estilos.numFmt;
  }

  /**
   * Reemplaza todos los marcadores en un texto
   * Soporta dos formatos: {{MARCADOR}} y "MARCADOR"
   */
  private reemplazarMarcadores(texto: string): string {
    let resultado = texto;

    // Exportador
    resultado = resultado.replace(/\{\{EXPORTADOR_NOMBRE\}\}|"EXPORTADOR_NOMBRE"/g, this.datos.exportador_nombre);
    resultado = resultado.replace(/\{\{EXPORTADOR_RUT\}\}|"EXPORTADOR_RUT"/g, this.datos.exportador_rut);
    resultado = resultado.replace(/\{\{EXPORTADOR_GIRO\}\}|"EXPORTADOR_GIRO"/g, this.datos.exportador_giro);
    resultado = resultado.replace(/\{\{EXPORTADOR_DIRECCION\}\}|"EXPORTADOR_DIRECCION"/g, this.datos.exportador_direccion);
    resultado = resultado.replace(/\{\{EXPORTADOR_EMAIL\}\}|"EXPORTADOR_EMAIL"/g, this.datos.exportador_email);

    // Consignee
    resultado = resultado.replace(/\{\{CONSIGNEE_COMPANY\}\}|"CONSIGNEE_COMPANY"/g, this.datos.consignee_company);
    resultado = resultado.replace(/\{\{CONSIGNEE_ADDRESS\}\}|"CONSIGNEE_ADDRESS"/g, this.datos.consignee_address);
    resultado = resultado.replace(/\{\{CONSIGNEE_ATTN\}\}|"CONSIGNEE_ATTN"/g, this.datos.consignee_attn);
    resultado = resultado.replace(/\{\{CONSIGNEE_USCC\}\}|"CONSIGNEE_USCC"/g, this.datos.consignee_uscc);
    resultado = resultado.replace(/\{\{CONSIGNEE_MOBILE\}\}|"CONSIGNEE_MOBILE"/g, this.datos.consignee_mobile);
    resultado = resultado.replace(/\{\{CONSIGNEE_EMAIL\}\}|"CONSIGNEE_EMAIL"/g, this.datos.consignee_email);
    resultado = resultado.replace(/\{\{CONSIGNEE_ZIP\}\}|"CONSIGNEE_ZIP"/g, this.datos.consignee_zip);
    resultado = resultado.replace(/\{\{CONSIGNEE_PAIS\}\}|"CONSIGNEE_PAIS"/g, this.datos.consignee_pais);

    // Notify Party
    resultado = resultado.replace(/\{\{NOTIFY_COMPANY\}\}|"NOTIFY_COMPANY"/g, this.datos.notify_company || '');
    resultado = resultado.replace(/\{\{NOTIFY_ADDRESS\}\}|"NOTIFY_ADDRESS"/g, this.datos.notify_address || '');
    resultado = resultado.replace(/\{\{NOTIFY_ATTN\}\}|"NOTIFY_ATTN"/g, this.datos.notify_attn || '');
    resultado = resultado.replace(/\{\{NOTIFY_USCC\}\}|"NOTIFY_USCC"/g, this.datos.notify_uscc || '');
    resultado = resultado.replace(/\{\{NOTIFY_MOBILE\}\}|"NOTIFY_MOBILE"/g, this.datos.notify_mobile || '');
    resultado = resultado.replace(/\{\{NOTIFY_EMAIL\}\}|"NOTIFY_EMAIL"/g, this.datos.notify_email || '');
    resultado = resultado.replace(/\{\{NOTIFY_ZIP\}\}|"NOTIFY_ZIP"/g, this.datos.notify_zip || '');

    // Embarque
    resultado = resultado.replace(/\{\{FECHA_FACTURA\}\}|"FECHA_FACTURA"/g, this.datos.fecha_factura);
    resultado = resultado.replace(/\{\{INVOICE_NUMBER\}\}|"INVOICE_NUMBER"/g, this.datos.invoice_number);
    resultado = resultado.replace(/\{\{EMBARQUE_NUMBER\}\}|"EMBARQUE_NUMBER"/g, this.datos.embarque_number);
    resultado = resultado.replace(/\{\{CSP\}\}|"CSP"/g, this.datos.csp || '');
    resultado = resultado.replace(/\{\{CSG\}\}|"CSG"/g, this.datos.csg || '');
    resultado = resultado.replace(/\{\{FECHA_EMBARQUE\}\}|"FECHA_EMBARQUE"/g, this.datos.fecha_embarque);
    resultado = resultado.replace(/\{\{MOTONAVE\}\}|"MOTONAVE"/g, this.datos.motonave);
    resultado = resultado.replace(/\{\{VIAJE\}\}|"VIAJE"/g, this.datos.viaje);
    resultado = resultado.replace(/\{\{MODALIDAD_VENTA\}\}|"MODALIDAD_VENTA"/g, this.datos.modalidad_venta || '');
    resultado = resultado.replace(/\{\{CLAUSULA_VENTA\}\}|"CLAUSULA_VENTA"/g, this.datos.clausula_venta);
    resultado = resultado.replace(/\{\{PAIS_ORIGEN\}\}|"PAIS_ORIGEN"/g, this.datos.pais_origen);
    resultado = resultado.replace(/\{\{PUERTO_EMBARQUE\}\}|"PUERTO_EMBARQUE"/g, this.datos.puerto_embarque);
    resultado = resultado.replace(/\{\{PUERTO_DESTINO\}\}|"PUERTO_DESTINO"/g, this.datos.puerto_destino);
    resultado = resultado.replace(/\{\{PAIS_DESTINO\}\}|"PAIS_DESTINO"/g, this.datos.pais_destino);
    resultado = resultado.replace(/\{\{FORMA_PAGO\}\}|"FORMA_PAGO"/g, this.datos.forma_pago);
    resultado = resultado.replace(/\{\{CONTENEDOR\}\}|"CONTENEDOR"/g, this.datos.contenedor || '');

    // Referencias
    resultado = resultado.replace(/\{\{REF_ASLI\}\}|"REF_ASLI"/g, this.datos.ref_asli);
    resultado = resultado.replace(/\{\{BOOKING\}\}|"BOOKING"/g, this.datos.booking);
    resultado = resultado.replace(/\{\{REF_CLIENTE\}\}|"REF_CLIENTE"/g, this.datos.ref_cliente || '');

    // Totales
    resultado = resultado.replace(/\{\{CANTIDAD_TOTAL\}\}|"CANTIDAD_TOTAL"/g, this.datos.cantidad_total.toString());
    resultado = resultado.replace(/\{\{PESO_NETO_TOTAL\}\}|"PESO_NETO_TOTAL"/g, this.datos.peso_neto_total.toString());
    resultado = resultado.replace(/\{\{PESO_BRUTO_TOTAL\}\}|"PESO_BRUTO_TOTAL"/g, this.datos.peso_bruto_total.toString());
    resultado = resultado.replace(/\{\{VALOR_TOTAL\}\}|"VALOR_TOTAL"/g, this.datos.valor_total.toFixed(2));
    resultado = resultado.replace(/\{\{VALOR_TOTAL_TEXTO\}\}|"VALOR_TOTAL_TEXTO"/g, this.datos.valor_total_texto);

    // Fecha/Hora
    resultado = resultado.replace(/\{\{FECHA_HOY\}\}|"FECHA_HOY"/g, this.datos.fecha_hoy);
    resultado = resultado.replace(/\{\{FECHA_HOY_LARGO\}\}|"FECHA_HOY_LARGO"/g, this.datos.fecha_hoy_largo);
    resultado = resultado.replace(/\{\{HORA_ACTUAL\}\}|"HORA_ACTUAL"/g, this.datos.hora_actual);

    return resultado;
  }

  /**
   * Reemplaza marcadores específicos de un producto
   * Soporta ambos formatos: {{PRODUCTO_*}} y "PRODUCTO_*"
   */
  private reemplazarMarcadoresProducto(texto: string, producto: ProductoPlantilla): string {
    let resultado = texto;

    resultado = resultado.replace(/\{\{PRODUCTO_CANTIDAD\}\}|"PRODUCTO_CANTIDAD"/g, producto.cantidad.toString());
    resultado = resultado.replace(/\{\{PRODUCTO_TIPO_ENVASE\}\}|"PRODUCTO_TIPO_ENVASE"/g, producto.tipo_envase);
    resultado = resultado.replace(/\{\{PRODUCTO_ESPECIE\}\}|"PRODUCTO_ESPECIE"/g, producto.especie || '');
    resultado = resultado.replace(/\{\{PRODUCTO_VARIEDAD\}\}|"PRODUCTO_VARIEDAD"/g, producto.variedad);
    resultado = resultado.replace(/\{\{PRODUCTO_CATEGORIA\}\}|"PRODUCTO_CATEGORIA"/g, producto.categoria);
    resultado = resultado.replace(/\{\{PRODUCTO_ETIQUETA\}\}|"PRODUCTO_ETIQUETA"/g, producto.etiqueta);
    resultado = resultado.replace(/\{\{PRODUCTO_CALIBRE\}\}|"PRODUCTO_CALIBRE"/g, producto.calibre);
    resultado = resultado.replace(/\{\{PRODUCTO_KG_NETO_UNIDAD\}\}|"PRODUCTO_KG_NETO_UNIDAD"/g, producto.kg_neto_unidad.toString());
    resultado = resultado.replace(/\{\{PRODUCTO_KG_BRUTO_UNIDAD\}\}|"PRODUCTO_KG_BRUTO_UNIDAD"/g, producto.kg_bruto_unidad.toString());
    resultado = resultado.replace(/\{\{PRODUCTO_PRECIO_CAJA\}\}|"PRODUCTO_PRECIO_CAJA"/g, producto.precio_caja.toFixed(2));
    resultado = resultado.replace(/\{\{PRODUCTO_TOTAL\}\}|"PRODUCTO_TOTAL"/g, producto.total.toFixed(2));

    return resultado;
  }

  /**
   * Genera el archivo Excel procesado como buffer
   */
  async generarBuffer(): Promise<ArrayBuffer> {
    const buffer = await this.workbook.xlsx.writeBuffer();
    return buffer as ArrayBuffer;
  }

  /**
   * Genera el archivo Excel procesado como Blob
   */
  async generarBlob(): Promise<Blob> {
    console.log('💾 Generando blob...');
    const buffer = await this.generarBuffer();
    console.log('📦 Buffer size:', buffer.byteLength);
    
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    console.log('✅ Blob generado:', blob.size, 'bytes');
    return blob;
  }

  /**
   * Genera una representación HTML de la primera hoja del workbook
   * para mostrar como vista previa
   */
  generarHTMLPreview(): string {
    const worksheet = this.workbook.worksheets[0];
    if (!worksheet) {
      return '<div class="p-4 text-gray-500">No hay datos para mostrar</div>';
    }

    // Timestamp único para forzar regeneración
    const timestamp = Date.now();
    let html = `<div class="excel-preview" data-timestamp="${timestamp}" style="font-family: \'Calibri\', Arial, sans-serif; font-size: 10pt; overflow-x: auto; padding: 20px; background: #f5f5f5;">`;
    html += '<table style="border-collapse: collapse; width: 100%; max-width: 1400px; margin: 0 auto; background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">';
    
    // Contar columnas para distribución uniforme
    let maxColumns = 0;
    worksheet.eachRow((row) => {
      let colCount = 0;
      row.eachCell({ includeEmpty: false }, () => {
        colCount++;
      });
      if (colCount > maxColumns) maxColumns = colCount;
    });
    
    // Calcular ancho uniforme por columna
    const uniformWidth = maxColumns > 0 ? (100 / maxColumns).toFixed(2) : '11.11';
    
    worksheet.eachRow((row, rowNumber) => {
      const height = row.height ? row.height * 1.3 : 28;
      html += `<tr style="height: ${height}px; min-height: 28px;">`;
      
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const value = cell.value;
        let displayValue = '';
        
        // Convertir diferentes tipos de valores
        if (value === null || value === undefined) {
          displayValue = '&nbsp;';
        } else if (typeof value === 'object' && 'richText' in value) {
          displayValue = (value as any).richText.map((rt: any) => rt.text).join('');
        } else if (typeof value === 'object' && 'formula' in value) {
          displayValue = (value as any).result?.toString() || '';
        } else if (value instanceof Date) {
          displayValue = value.toLocaleDateString();
        } else {
          displayValue = value.toString().replace(/\n/g, '<br>');
        }

        // Construir estilos inline - MÁS UNIFORMES
        const stylesParts: string[] = [
          'padding: 10px 12px',
          'box-sizing: border-box',
          'min-height: 28px',
          'line-height: 1.5',
          `width: ${uniformWidth}%`, // Ancho uniforme para todas las columnas
          'text-align: center', // TODO centrado por defecto
          'vertical-align: middle', // TODO al medio verticalmente
          'font-size: 10pt',
          'white-space: nowrap',
          'overflow: hidden',
          'text-overflow: ellipsis'
        ];
        
        // Sobrescribir alineación solo si está explícitamente definida en Excel
        if (cell.alignment) {
          if (cell.alignment.horizontal && cell.alignment.horizontal !== 'general') {
            stylesParts.push(`text-align: ${cell.alignment.horizontal} !important`);
          }
          if (cell.alignment.wrapText) {
            stylesParts.push('white-space: normal !important');
            stylesParts.push('word-wrap: break-word');
          }
        }
        
        // Fuente
        if (cell.font) {
          if (cell.font.bold) stylesParts.push('font-weight: 700');
          if (cell.font.italic) stylesParts.push('font-style: italic');
          if (cell.font.size) {
            // Normalizar tamaños de fuente
            const fontSize = Math.max(9, Math.min(cell.font.size, 12));
            stylesParts.push(`font-size: ${fontSize}pt`);
          }
          if (cell.font.color && (cell.font.color as any).argb) {
            const color = (cell.font.color as any).argb;
            if (color && color !== 'FF000000') {
              stylesParts.push(`color: #${color.substring(2)}`);
            }
          }
          if (cell.font.underline) stylesParts.push('text-decoration: underline');
        }
        
        // Color de fondo
        if (cell.fill && 'fgColor' in cell.fill && cell.fill.fgColor) {
          const color = (cell.fill.fgColor as any).argb;
          if (color && color !== 'FFFFFFFF' && color !== '00000000') {
            stylesParts.push(`background-color: #${color.substring(2)}`);
          }
        }
        
        // Bordes uniformes y consistentes
        stylesParts.push('border: 1px solid #d0d0d0');
        
        const cellStyle = stylesParts.join('; ');
        
        html += `<td style="${cellStyle}">${displayValue}</td>`;
        
        // Manejar celdas fusionadas (merged)
        let colspan = 1;
        let rowspan = 1;
        if (worksheet.getCell(rowNumber, colNumber).isMerged) {
          // Buscar el rango de la celda fusionada
          const masterCell = worksheet.getCell(rowNumber, colNumber).master;
          if (masterCell && masterCell.address === cell.address) {
            // Esta es la celda maestra, calcular colspan/rowspan
            // (simplificado, ExcelJS no expone esto directamente)
          }
        }
        
        html += `<td style="${cellStyle}">${displayValue}</td>`;
      });
      
      html += '</tr>';
    });
    
    html += '</table></div>';
    return html;
  }
}

/**
 * Helper para convertir Factura a DatosPlantilla
 */
export function facturaADatosPlantilla(factura: any): DatosPlantilla {
  const now = new Date();
  const formatoFecha = (fecha: string) => {
    if (!fecha) return '';
    const d = new Date(fecha);
    return d.toLocaleDateString('es-CL');
  };

  return {
    // Exportador
    exportador_nombre: factura.exportador.nombre,
    exportador_rut: factura.exportador.rut,
    exportador_giro: factura.exportador.giro,
    exportador_direccion: factura.exportador.direccion,
    exportador_email: factura.exportador.email || '',

    // Consignee
    consignee_company: factura.consignatario.nombre,
    consignee_address: factura.consignatario.direccion,
    consignee_attn: factura.consignatario.contacto || '',
    consignee_uscc: factura.consignatario.usci || '',
    consignee_mobile: factura.consignatario.telefono || '',
    consignee_email: factura.consignatario.email || '',
    consignee_zip: factura.consignatario.codigoPostal || '',
    consignee_pais: factura.consignatario.pais,

    // Notify Party
    notify_company: factura.notifyParty?.nombre || '',
    notify_address: factura.notifyParty?.direccion || '',
    notify_attn: factura.notifyParty?.contacto || '',
    notify_uscc: factura.notifyParty?.usci || '',
    notify_mobile: factura.notifyParty?.telefono || '',
    notify_email: factura.notifyParty?.email || '',
    notify_zip: factura.notifyParty?.codigoPostal || '',

    // Embarque
    fecha_factura: formatoFecha(factura.embarque.fechaFactura),
    invoice_number: factura.embarque.numeroInvoice,
    embarque_number: factura.embarque.numeroEmbarque,
    csp: factura.embarque.csp || '',
    csg: factura.embarque.csg || '',
    fecha_embarque: formatoFecha(factura.embarque.fechaEmbarque),
    motonave: factura.embarque.motonave,
    viaje: factura.embarque.numeroViaje,
    modalidad_venta: factura.embarque.modalidadVenta || '',
    clausula_venta: factura.embarque.clausulaVenta,
    pais_origen: factura.embarque.paisOrigen,
    puerto_embarque: factura.embarque.puertoEmbarque,
    puerto_destino: factura.embarque.puertoDestino,
    pais_destino: factura.embarque.paisDestinoFinal,
    forma_pago: factura.embarque.formaPago,
    contenedor: factura.embarque.contenedor || '',

    // Referencias
    ref_asli: factura.refAsli,
    booking: factura.embarque.numeroEmbarque, // O usar otro campo si existe
    ref_cliente: '', // Agregar si existe en el modelo

    // Productos
    productos: factura.productos.map((p: any) => ({
      cantidad: p.cantidad,
      tipo_envase: p.tipoEnvase,
      especie: p.especie || '',
      variedad: p.variedad,
      categoria: p.categoria,
      etiqueta: p.etiqueta,
      calibre: p.calibre,
      kg_neto_unidad: p.kgNetoUnidad,
      kg_bruto_unidad: p.kgBrutoUnidad,
      precio_caja: p.precioPorCaja,
      total: p.total,
    })),

    // Totales
    cantidad_total: factura.totales.cantidadTotal,
    peso_neto_total: factura.embarque.pesoNetoTotal || 0,
    peso_bruto_total: factura.embarque.pesoBrutoTotal || 0,
    valor_total: factura.totales.valorTotal,
    valor_total_texto: factura.totales.valorTotalTexto,

    // Fecha/Hora
    fecha_hoy: now.toLocaleDateString('es-CL'),
    fecha_hoy_largo: now.toLocaleDateString('es-CL', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    }),
    hora_actual: now.toLocaleTimeString('es-CL', { 
      hour: '2-digit', 
      minute: '2-digit' 
    }),
  };
}
