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
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    await this.workbook.xlsx.load(arrayBuffer);
  }

  /**
   * Procesa la plantilla reemplazando todos los marcadores
   */
  async procesar(): Promise<ExcelJS.Workbook> {
    // Procesar cada hoja del libro
    this.workbook.eachSheet((worksheet) => {
      this.procesarHoja(worksheet);
    });

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
   */
  private encontrarFilaProductos(worksheet: ExcelJS.Worksheet): number | null {
    let filaEncontrada: number | null = null;

    worksheet.eachRow((row, rowNumber) => {
      if (filaEncontrada) return; // Ya encontramos

      row.eachCell((cell) => {
        if (cell.value && typeof cell.value === 'string') {
          if (cell.value.includes('{{PRODUCTO_CANTIDAD}}') || 
              cell.value.includes('{{PRODUCTO_VARIEDAD}}')) {
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
   */
  private reemplazarMarcadores(texto: string): string {
    let resultado = texto;

    // Exportador
    resultado = resultado.replace(/\{\{EXPORTADOR_NOMBRE\}\}/g, this.datos.exportador_nombre);
    resultado = resultado.replace(/\{\{EXPORTADOR_RUT\}\}/g, this.datos.exportador_rut);
    resultado = resultado.replace(/\{\{EXPORTADOR_GIRO\}\}/g, this.datos.exportador_giro);
    resultado = resultado.replace(/\{\{EXPORTADOR_DIRECCION\}\}/g, this.datos.exportador_direccion);
    resultado = resultado.replace(/\{\{EXPORTADOR_EMAIL\}\}/g, this.datos.exportador_email);

    // Consignee
    resultado = resultado.replace(/\{\{CONSIGNEE_COMPANY\}\}/g, this.datos.consignee_company);
    resultado = resultado.replace(/\{\{CONSIGNEE_ADDRESS\}\}/g, this.datos.consignee_address);
    resultado = resultado.replace(/\{\{CONSIGNEE_ATTN\}\}/g, this.datos.consignee_attn);
    resultado = resultado.replace(/\{\{CONSIGNEE_USCC\}\}/g, this.datos.consignee_uscc);
    resultado = resultado.replace(/\{\{CONSIGNEE_MOBILE\}\}/g, this.datos.consignee_mobile);
    resultado = resultado.replace(/\{\{CONSIGNEE_EMAIL\}\}/g, this.datos.consignee_email);
    resultado = resultado.replace(/\{\{CONSIGNEE_ZIP\}\}/g, this.datos.consignee_zip);
    resultado = resultado.replace(/\{\{CONSIGNEE_PAIS\}\}/g, this.datos.consignee_pais);

    // Notify Party
    resultado = resultado.replace(/\{\{NOTIFY_COMPANY\}\}/g, this.datos.notify_company || '');
    resultado = resultado.replace(/\{\{NOTIFY_ADDRESS\}\}/g, this.datos.notify_address || '');
    resultado = resultado.replace(/\{\{NOTIFY_ATTN\}\}/g, this.datos.notify_attn || '');
    resultado = resultado.replace(/\{\{NOTIFY_USCC\}\}/g, this.datos.notify_uscc || '');
    resultado = resultado.replace(/\{\{NOTIFY_MOBILE\}\}/g, this.datos.notify_mobile || '');
    resultado = resultado.replace(/\{\{NOTIFY_EMAIL\}\}/g, this.datos.notify_email || '');
    resultado = resultado.replace(/\{\{NOTIFY_ZIP\}\}/g, this.datos.notify_zip || '');

    // Embarque
    resultado = resultado.replace(/\{\{FECHA_FACTURA\}\}/g, this.datos.fecha_factura);
    resultado = resultado.replace(/\{\{INVOICE_NUMBER\}\}/g, this.datos.invoice_number);
    resultado = resultado.replace(/\{\{EMBARQUE_NUMBER\}\}/g, this.datos.embarque_number);
    resultado = resultado.replace(/\{\{CSP\}\}/g, this.datos.csp || '');
    resultado = resultado.replace(/\{\{CSG\}\}/g, this.datos.csg || '');
    resultado = resultado.replace(/\{\{FECHA_EMBARQUE\}\}/g, this.datos.fecha_embarque);
    resultado = resultado.replace(/\{\{MOTONAVE\}\}/g, this.datos.motonave);
    resultado = resultado.replace(/\{\{VIAJE\}\}/g, this.datos.viaje);
    resultado = resultado.replace(/\{\{MODALIDAD_VENTA\}\}/g, this.datos.modalidad_venta || '');
    resultado = resultado.replace(/\{\{CLAUSULA_VENTA\}\}/g, this.datos.clausula_venta);
    resultado = resultado.replace(/\{\{PAIS_ORIGEN\}\}/g, this.datos.pais_origen);
    resultado = resultado.replace(/\{\{PUERTO_EMBARQUE\}\}/g, this.datos.puerto_embarque);
    resultado = resultado.replace(/\{\{PUERTO_DESTINO\}\}/g, this.datos.puerto_destino);
    resultado = resultado.replace(/\{\{PAIS_DESTINO\}\}/g, this.datos.pais_destino);
    resultado = resultado.replace(/\{\{FORMA_PAGO\}\}/g, this.datos.forma_pago);
    resultado = resultado.replace(/\{\{CONTENEDOR\}\}/g, this.datos.contenedor || '');

    // Referencias
    resultado = resultado.replace(/\{\{REF_ASLI\}\}/g, this.datos.ref_asli);
    resultado = resultado.replace(/\{\{BOOKING\}\}/g, this.datos.booking);
    resultado = resultado.replace(/\{\{REF_CLIENTE\}\}/g, this.datos.ref_cliente || '');

    // Totales
    resultado = resultado.replace(/\{\{CANTIDAD_TOTAL\}\}/g, this.datos.cantidad_total.toString());
    resultado = resultado.replace(/\{\{PESO_NETO_TOTAL\}\}/g, this.datos.peso_neto_total.toString());
    resultado = resultado.replace(/\{\{PESO_BRUTO_TOTAL\}\}/g, this.datos.peso_bruto_total.toString());
    resultado = resultado.replace(/\{\{VALOR_TOTAL\}\}/g, this.datos.valor_total.toFixed(2));
    resultado = resultado.replace(/\{\{VALOR_TOTAL_TEXTO\}\}/g, this.datos.valor_total_texto);

    // Fecha/Hora
    resultado = resultado.replace(/\{\{FECHA_HOY\}\}/g, this.datos.fecha_hoy);
    resultado = resultado.replace(/\{\{FECHA_HOY_LARGO\}\}/g, this.datos.fecha_hoy_largo);
    resultado = resultado.replace(/\{\{HORA_ACTUAL\}\}/g, this.datos.hora_actual);

    return resultado;
  }

  /**
   * Reemplaza marcadores específicos de un producto
   */
  private reemplazarMarcadoresProducto(texto: string, producto: ProductoPlantilla): string {
    let resultado = texto;

    resultado = resultado.replace(/\{\{PRODUCTO_CANTIDAD\}\}/g, producto.cantidad.toString());
    resultado = resultado.replace(/\{\{PRODUCTO_TIPO_ENVASE\}\}/g, producto.tipo_envase);
    resultado = resultado.replace(/\{\{PRODUCTO_ESPECIE\}\}/g, producto.especie || '');
    resultado = resultado.replace(/\{\{PRODUCTO_VARIEDAD\}\}/g, producto.variedad);
    resultado = resultado.replace(/\{\{PRODUCTO_CATEGORIA\}\}/g, producto.categoria);
    resultado = resultado.replace(/\{\{PRODUCTO_ETIQUETA\}\}/g, producto.etiqueta);
    resultado = resultado.replace(/\{\{PRODUCTO_CALIBRE\}\}/g, producto.calibre);
    resultado = resultado.replace(/\{\{PRODUCTO_KG_NETO_UNIDAD\}\}/g, producto.kg_neto_unidad.toString());
    resultado = resultado.replace(/\{\{PRODUCTO_KG_BRUTO_UNIDAD\}\}/g, producto.kg_bruto_unidad.toString());
    resultado = resultado.replace(/\{\{PRODUCTO_PRECIO_CAJA\}\}/g, producto.precio_caja.toFixed(2));
    resultado = resultado.replace(/\{\{PRODUCTO_TOTAL\}\}/g, producto.total.toFixed(2));

    return resultado;
  }

  /**
   * Genera el archivo Excel procesado como buffer
   */
  async generarBuffer(): Promise<Buffer> {
    return await this.workbook.xlsx.writeBuffer() as Buffer;
  }

  /**
   * Genera el archivo Excel procesado como Blob
   */
  async generarBlob(): Promise<Blob> {
    const buffer = await this.generarBuffer();
    return new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
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
