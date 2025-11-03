// Generación de Excel para facturas usando ExcelJS
import ExcelJS from 'exceljs';
import { Factura } from '@/types/factura';

export async function generarFacturaExcel(factura: Factura): Promise<void> {
  // Detectar plantilla según cliente
  const clienteNombre = factura.exportador.nombre?.toUpperCase() || '';
  const clientePlantilla = factura.clientePlantilla || '';
  
  if (clienteNombre.includes('FRUIT ANDES') || clientePlantilla === 'FRUIT ANDES SUR') {
    return generarFacturaExcelFruitAndes(factura);
  }
  
  // Plantilla por defecto (ALMA)
  return generarFacturaExcelAlma(factura);
}

async function generarFacturaExcelAlma(factura: Factura): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Factura');

  // Configurar columnas
  worksheet.columns = [
    { width: 15 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
  ];

  let rowIndex = 1;

  // Header - Invoice Number and RUT (Row 1)
  const headerRow = worksheet.getRow(rowIndex);
  headerRow.getCell(1).value = factura.exportador.nombre.toUpperCase();
  headerRow.getCell(1).font = { bold: true, size: 12 };
  
  if (factura.exportador.rut) {
    headerRow.getCell(10).value = `R.U.T: ${factura.exportador.rut}`;
    headerRow.getCell(10).alignment = { horizontal: 'right' };
  }
  rowIndex++;

  // Exportador details (Row 2)
  if (factura.exportador.giro) {
    const giroRow = worksheet.getRow(rowIndex);
    giroRow.getCell(1).value = `Giro: ${factura.exportador.giro}`;
    rowIndex++;
  }

  if (factura.exportador.direccion) {
    const dirRow = worksheet.getRow(rowIndex);
    dirRow.getCell(1).value = factura.exportador.direccion;
    rowIndex++;
  }

  // Invoice Number (Row 2, right)
  const invoiceRow = worksheet.getRow(2);
  invoiceRow.getCell(10).value = `INVOICE N°: ${factura.embarque.numeroEmbarque}`;
  invoiceRow.getCell(10).font = { bold: true, size: 11 };
  invoiceRow.getCell(10).alignment = { horizontal: 'right' };

  rowIndex += 2;

  // Consignatario Header
  const consigneeHeaderRow = worksheet.getRow(rowIndex);
  consigneeHeaderRow.getCell(1).value = 'CONSIGNEE:';
  consigneeHeaderRow.getCell(1).font = { bold: true };
  rowIndex++;

  // Consignatario Info
  const consigneeRow = worksheet.getRow(rowIndex);
  consigneeRow.getCell(1).value = factura.consignatario.nombre;
  consigneeRow.getCell(1).font = { bold: true };
  rowIndex++;

  if (factura.consignatario.direccion) {
    const direccionRow = worksheet.getRow(rowIndex);
    direccionRow.getCell(1).value = factura.consignatario.direccion;
    rowIndex++;
  }

  if (factura.consignatario.email || factura.consignatario.telefono) {
    const contactRow = worksheet.getRow(rowIndex);
    contactRow.getCell(1).value = [
      factura.consignatario.email || '',
      factura.consignatario.telefono || '',
    ].filter(Boolean).join(' / ');
    rowIndex++;
  }

  if (factura.consignatario.contacto) {
    const contactPersonRow = worksheet.getRow(rowIndex);
    contactPersonRow.getCell(1).value = `Contact Person: ${factura.consignatario.contacto}`;
    if (factura.consignatario.telefonoContacto) {
      contactPersonRow.getCell(1).value += `, Telephone: ${factura.consignatario.telefonoContacto}`;
    }
    rowIndex++;
  }

  if (factura.consignatario.usci) {
    const usciRow = worksheet.getRow(rowIndex);
    usciRow.getCell(1).value = `USCI: ${factura.consignatario.usci}`;
    rowIndex++;
  }

  if (factura.consignatario.codigoPostal) {
    const postalRow = worksheet.getRow(rowIndex);
    postalRow.getCell(1).value = `Postal Code: ${factura.consignatario.codigoPostal}`;
    rowIndex++;
  }

  const countryRow = worksheet.getRow(rowIndex);
  countryRow.getCell(1).value = `Country: ${factura.consignatario.pais}`;
  rowIndex += 2;

  // Fecha y Embarque
  const fechaRow = worksheet.getRow(rowIndex);
  const fechaFormatted = factura.embarque.fechaFactura
    ? new Date(factura.embarque.fechaFactura).toLocaleDateString('en-US', {
        month: 'long',
        day: '2-digit',
        year: 'numeric',
      })
    : '';
  fechaRow.getCell(1).value = `FECHA (Date): ${fechaFormatted}`;
  rowIndex++;

  const embarqueRow = worksheet.getRow(rowIndex);
  embarqueRow.getCell(1).value = `EMBARQUE N° (Shipment Number): ${factura.embarque.numeroEmbarque}`;
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
    const detailRow = worksheet.getRow(rowIndex);
    detailRow.getCell(1).value = row[0];
    detailRow.getCell(1).font = { bold: true };
    detailRow.getCell(2).value = row[1] || '';
    
    if (row[2]) {
      detailRow.getCell(6).value = row[2];
      detailRow.getCell(6).font = { bold: true };
      detailRow.getCell(7).value = row[3] || '';
    }
    
    rowIndex++;
  });

  rowIndex += 2;

  // Productos Header
  const especieRow = worksheet.getRow(rowIndex);
  especieRow.getCell(1).value = `ESPECIE (Specie): ${factura.productos[0]?.variedad || ''}`;
  especieRow.getCell(1).font = { bold: true };
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

  const headerProductRow = worksheet.getRow(rowIndex);
  productHeaders.forEach((header, index) => {
    headerProductRow.getCell(index + 1).value = header;
    headerProductRow.getCell(index + 1).font = { bold: true };
    headerProductRow.getCell(index + 1).alignment = { horizontal: 'center', vertical: 'middle' };
    headerProductRow.getCell(index + 1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    } as ExcelJS.Fill;
  });
  headerProductRow.height = 30;
  rowIndex++;

  // Productos Rows
  factura.productos.forEach((producto) => {
    const productRow = worksheet.getRow(rowIndex);
    productRow.getCell(1).value = producto.cantidad;
    productRow.getCell(2).value = producto.tipoEnvase;
    productRow.getCell(3).value = producto.variedad;
    productRow.getCell(4).value = producto.categoria;
    productRow.getCell(5).value = producto.etiqueta;
    productRow.getCell(6).value = producto.calibre;
    productRow.getCell(7).value = `${producto.kgNetoUnidad.toFixed(2)} Kgs.`;
    productRow.getCell(8).value = `${producto.kgBrutoUnidad.toFixed(2)} Kgs.`;
    productRow.getCell(9).value = `US$${producto.precioPorCaja.toFixed(2)}/box`;
    productRow.getCell(10).value = `US$${producto.total.toFixed(2)}`;
    
    // Centrar todas las celdas
    for (let i = 1; i <= 10; i++) {
      productRow.getCell(i).alignment = { horizontal: 'center', vertical: 'middle' };
    }
    
    rowIndex++;
  });

  rowIndex += 1;

  // Totals Row
  const totalsRow = worksheet.getRow(rowIndex);
  totalsRow.getCell(1).value = 'TOTALES (Totals):';
  totalsRow.getCell(1).font = { bold: true };
  totalsRow.getCell(10).value = `US$${factura.totales.valorTotal.toFixed(2)}`;
  totalsRow.getCell(10).font = { bold: true };
  totalsRow.getCell(10).alignment = { horizontal: 'center', vertical: 'middle' };
  totalsRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  } as ExcelJS.Fill;
  rowIndex++;

  const totalQtyRow = worksheet.getRow(rowIndex);
  totalQtyRow.getCell(1).value = 'Total Quantity:';
  totalQtyRow.getCell(1).font = { bold: true };
  totalQtyRow.getCell(10).value = factura.totales.cantidadTotal;
  totalQtyRow.getCell(10).alignment = { horizontal: 'center', vertical: 'middle' };
  rowIndex += 2;

  // Payment Summary
  const paymentRow = worksheet.getRow(rowIndex);
  paymentRow.getCell(1).value = 'VALOR TOTAL A PAGAR (Total Value to Pay):';
  paymentRow.getCell(1).font = { bold: true };
  rowIndex++;

  const totalTextRow = worksheet.getRow(rowIndex);
  totalTextRow.getCell(1).value = factura.totales.valorTotalTexto;
  rowIndex += 2;

  if (factura.embarque.formaPago) {
    const plazoRow = worksheet.getRow(rowIndex);
    plazoRow.getCell(1).value = `PLAZO DE PAGO (Payment Terms): ${factura.embarque.formaPago}`;
    rowIndex++;
  }

  rowIndex += 2;

  // Footer
  const footerRow = worksheet.getRow(rowIndex);
  footerRow.getCell(5).value = factura.exportador.nombre;
  footerRow.getCell(5).font = { bold: true };
  footerRow.getCell(5).alignment = { horizontal: 'center' };

  // Aplicar bordes a todas las celdas con contenido
  worksheet.eachRow((row) => {
    row.eachCell({ includeEmpty: false }, (cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
  });

  // Generar buffer y descargar
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Factura_${factura.refAsli}_${factura.embarque.numeroEmbarque}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

async function generarFacturaExcelFruitAndes(factura: Factura): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Proforma');

  // Plantilla vacía - esperando coordenadas exactas del usuario

  // Generar buffer y descargar
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Proforma_${factura.refAsli}_${factura.embarque.numeroInvoice}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

