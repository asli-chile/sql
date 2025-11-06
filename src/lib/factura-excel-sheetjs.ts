// Generación de Excel para facturas usando SheetJS (xlsx) - VERSIÓN EXPERIMENTAL
import * as XLSX from 'xlsx';
import { Factura } from '@/types/factura';

/**
 * Genera un archivo Excel de factura usando SheetJS (xlsx)
 * Esta es una versión experimental para comparar con ExcelJS
 */
export async function generarFacturaExcelSheetJS(factura: Factura): Promise<void> {
  // Crear un nuevo workbook
  const workbook = XLSX.utils.book_new();

  // Preparar los datos de la hoja
  const datos: any[][] = [];

  let rowIndex = 0;

  // Header - Invoice Number and RUT (Row 1)
  const headerRow: any[] = [];
  headerRow[0] = factura.exportador.nombre.toUpperCase();
  if (factura.exportador.rut) {
    headerRow[9] = `R.U.T: ${factura.exportador.rut}`;
  }
  datos.push(headerRow);
  rowIndex++;

  // Exportador details
  if (factura.exportador.giro) {
    datos.push([`Giro: ${factura.exportador.giro}`]);
    rowIndex++;
  }

  if (factura.exportador.direccion) {
    datos.push([factura.exportador.direccion]);
    rowIndex++;
  }

  // Invoice Number (Row 2, right)
  const invoiceRow: any[] = [];
  if (rowIndex === 2) {
    invoiceRow[9] = `INVOICE N°: ${factura.embarque.numeroEmbarque}`;
  } else {
    datos[rowIndex - 1][9] = `INVOICE N°: ${factura.embarque.numeroEmbarque}`;
  }
  if (invoiceRow.length > 0) {
    datos[rowIndex] = invoiceRow;
    rowIndex++;
  }

  // Espacio
  datos.push([]);
  rowIndex++;

  // Consignatario Header
  datos.push(['CONSIGNEE:']);
  rowIndex++;

  // Consignatario Info
  datos.push([factura.consignatario.nombre]);
  rowIndex++;

  if (factura.consignatario.direccion) {
    datos.push([factura.consignatario.direccion]);
    rowIndex++;
  }

  if (factura.consignatario.email || factura.consignatario.telefono) {
    const contactos = [
      factura.consignatario.email || '',
      factura.consignatario.telefono || '',
    ].filter(Boolean).join(' / ');
    datos.push([contactos]);
    rowIndex++;
  }

  if (factura.consignatario.contacto) {
    let contactoText = `Contact Person: ${factura.consignatario.contacto}`;
    if (factura.consignatario.telefonoContacto) {
      contactoText += `, Telephone: ${factura.consignatario.telefonoContacto}`;
    }
    datos.push([contactoText]);
    rowIndex++;
  }

  if (factura.consignatario.usci) {
    datos.push([`USCI: ${factura.consignatario.usci}`]);
    rowIndex++;
  }

  if (factura.consignatario.codigoPostal) {
    datos.push([`Postal Code: ${factura.consignatario.codigoPostal}`]);
    rowIndex++;
  }

  datos.push([`Country: ${factura.consignatario.pais}`]);
  rowIndex += 2;

  // Fecha y Embarque
  const fechaFormatted = factura.embarque.fechaFactura
    ? new Date(factura.embarque.fechaFactura).toLocaleDateString('en-US', {
        month: 'long',
        day: '2-digit',
        year: 'numeric',
      })
    : '';
  datos.push([`FECHA (Date): ${fechaFormatted}`]);
  rowIndex++;

  datos.push([`EMBARQUE N° (Shipment Number): ${factura.embarque.numeroEmbarque}`]);
  rowIndex += 2;

  // Shipping Details Table
  const shippingDetails = [
    ['CSP:', factura.embarque.csp || '', 'CSG:', factura.embarque.csg || ''],
    [
      'FECHA EMBARQUE (Departure Date):',
      factura.embarque.fechaEmbarque
        ? new Date(factura.embarque.fechaEmbarque).toLocaleDateString('es-CL')
        : '',
      'MOTONAVE (Vessel):',
      factura.embarque.motonave,
    ],
    ['N° VIAJE (Travel Number):', factura.embarque.numeroViaje, 'MODALIDAD DE VENTA:', factura.embarque.modalidadVenta || 'BAJO CONDICION'],
    ['CLÁUSULA DE VENTA:', factura.embarque.clausulaVenta, 'PAIS ORIGEN:', factura.embarque.paisOrigen],
    ['PTO EMBARQUE:', factura.embarque.puertoEmbarque, 'PTO DESTINO:', factura.embarque.puertoDestino],
    ['PAIS DESTINO FINAL:', factura.embarque.paisDestinoFinal, 'FORMA DE PAGO:', factura.embarque.formaPago],
    [
      'PESO NETO TOTAL:',
      factura.embarque.pesoNetoTotal ? `${factura.embarque.pesoNetoTotal.toLocaleString()} Kgs.` : '',
      'PESO BRUTO TOTAL:',
      factura.embarque.pesoBrutoTotal ? `${factura.embarque.pesoBrutoTotal.toLocaleString()} Kgs.` : '',
    ],
    ['CONTENEDOR / AWB:', factura.embarque.contenedor || ''],
  ];

  shippingDetails.forEach((row) => {
    const detailRow: any[] = [];
    detailRow[0] = row[0];
    detailRow[1] = row[1] || '';
    
    if (row[2]) {
      detailRow[5] = row[2];
      detailRow[6] = row[3] || '';
    }
    
    datos.push(detailRow);
    rowIndex++;
  });

  rowIndex += 2;

  // Productos Header
  datos.push([`ESPECIE (Specie): ${factura.productos[0]?.variedad || ''}`]);
  rowIndex += 2;

  // Productos Table Headers
  const productHeaders = [
    'CANTIDAD (Quantity)',
    'TIPO ENVASE (Type of Package)',
    'VARIEDAD (Variety)',
    'CATEGORÍA (Category)',
    'ETIQUETA (Label)',
    'CALIBRE (Size)',
    'KG NETO UNIDAD (Net Weight Per Unit)',
    'BRUTO UNID (Gross Weight Per Unit)',
    'PRECIO POR CAJA (Price per Box)',
    'TOTAL',
  ];
  datos.push(productHeaders);
  rowIndex++;

  // Productos Rows
  factura.productos.forEach((producto) => {
    const productRow = [
      producto.cantidad,
      producto.tipoEnvase,
      producto.variedad,
      producto.categoria,
      producto.etiqueta,
      producto.calibre,
      `${producto.kgNetoUnidad.toFixed(2)} Kgs.`,
      `${producto.kgBrutoUnidad.toFixed(2)} Kgs.`,
      `US$${producto.precioPorCaja.toFixed(2)}/box`,
      `US$${producto.total.toFixed(2)}`,
    ];
    datos.push(productRow);
    rowIndex++;
  });

  rowIndex += 1;

  // Totals Row
  const totalsRow: any[] = [];
  totalsRow[0] = 'TOTALES (Totals):';
  totalsRow[9] = `US$${factura.totales.valorTotal.toFixed(2)}`;
  datos.push(totalsRow);
  rowIndex++;

  const totalQtyRow: any[] = [];
  totalQtyRow[0] = 'Total Quantity:';
  totalQtyRow[9] = factura.totales.cantidadTotal;
  datos.push(totalQtyRow);
  rowIndex += 2;

  // Payment Summary
  datos.push(['VALOR TOTAL A PAGAR (Total Value to Pay):']);
  rowIndex++;

  datos.push([factura.totales.valorTotalTexto]);
  rowIndex += 2;

  if (factura.embarque.formaPago) {
    datos.push([`PLAZO DE PAGO (Payment Terms): ${factura.embarque.formaPago}`]);
    rowIndex++;
  }

  rowIndex += 2;

  // Footer
  const footerRow: any[] = [];
  footerRow[4] = factura.exportador.nombre;
  datos.push(footerRow);

  // Crear la hoja de trabajo
  const worksheet = XLSX.utils.aoa_to_sheet(datos);

  // Aplicar estilos básicos (SheetJS tiene limitaciones con estilos, pero podemos usar anchos de columna)
  const columnWidths = [
    { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
    { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
  ];
  worksheet['!cols'] = columnWidths;

  // Agregar la hoja al workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Factura');

  // Generar el archivo Excel
  const excelBuffer = XLSX.write(workbook, { 
    type: 'array', 
    bookType: 'xlsx',
    cellStyles: false // SheetJS Community Edition no soporta estilos avanzados
  });

  // Crear blob y descargar
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Factura_SheetJS_${factura.refAsli}_${factura.embarque.numeroEmbarque}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

