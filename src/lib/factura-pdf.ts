// Generación de PDF para facturas usando jsPDF
import jsPDF from 'jspdf';
import { Factura } from '@/types/factura';

export async function generarFacturaPDF(factura: Factura): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  let y = 20;

  // Header - Invoice Number and RUT
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  // Exportador (left)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(factura.exportador.nombre.toUpperCase(), 20, y);
  y += 5;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  if (factura.exportador.giro) {
    doc.text(`Giro: ${factura.exportador.giro}`, 20, y);
    y += 4;
  }
  if (factura.exportador.direccion) {
    doc.text(factura.exportador.direccion, 20, y);
    y += 4;
  }
  
  y = 20;
  // RUT and Invoice Number (right)
  doc.setFontSize(9);
  if (factura.exportador.rut) {
    doc.text(`R.U.T: ${factura.exportador.rut}`, 180, y, { align: 'right' });
    y += 5;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`INVOICE N°: ${factura.embarque.numeroEmbarque}`, 180, y, { align: 'right' });
  
  y = 40;

  // Consignatario
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('CONSIGNEE:', 20, y);
  y += 5;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(factura.consignatario.nombre, 20, y);
  y += 4;
  
  if (factura.consignatario.direccion) {
    const direccionLines = doc.splitTextToSize(factura.consignatario.direccion, 170);
    doc.text(direccionLines, 20, y);
    y += direccionLines.length * 4;
  }
  
  if (factura.consignatario.email || factura.consignatario.telefono) {
    const contactInfo = [
      factura.consignatario.email || '',
      factura.consignatario.telefono || '',
    ].filter(Boolean).join(' / ');
    doc.text(contactInfo, 20, y);
    y += 4;
  }
  
  if (factura.consignatario.contacto) {
    doc.text(
      `Contact Person: ${factura.consignatario.contacto}${factura.consignatario.telefonoContacto ? `, Telephone: ${factura.consignatario.telefonoContacto}` : ''}`,
      20,
      y
    );
    y += 4;
  }
  
  if (factura.consignatario.usci) {
    doc.text(`USCI: ${factura.consignatario.usci}`, 20, y);
    y += 4;
  }
  
  if (factura.consignatario.codigoPostal) {
    doc.text(`Postal Code: ${factura.consignatario.codigoPostal}`, 20, y);
    y += 4;
  }
  
  doc.text(`Country: ${factura.consignatario.pais}`, 20, y);
  y += 8;

  // Fecha y Embarque
  doc.setFontSize(9);
  const fechaFormatted = factura.embarque.fechaFactura
    ? new Date(factura.embarque.fechaFactura).toLocaleDateString('en-US', {
        month: 'long',
        day: '2-digit',
        year: 'numeric',
      })
    : '';
  doc.text(`FECHA (Date): ${fechaFormatted}`, 20, y);
  y += 4;
  doc.text(`EMBARQUE N° (Shipment Number): ${factura.embarque.numeroEmbarque}`, 20, y);
  y += 8;

  // Shipping Details Table
  doc.setFontSize(8);
  const tableY = y;
  let currentY = tableY;
  
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
    doc.setFont('helvetica', 'bold');
    doc.text(row[0], 20, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(row[1] || '', 60, currentY);
    
    if (row[2]) {
      doc.setFont('helvetica', 'bold');
      doc.text(row[2], 120, currentY);
      doc.setFont('helvetica', 'normal');
      doc.text(row[3] || '', 160, currentY);
    }
    
    currentY += 5;
  });

  y = currentY + 5;

  // Productos Table Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`ESPECIE (Specie): ${factura.productos[0]?.variedad || ''}`, 20, y);
  y += 6;

  doc.setFontSize(7);
  const headers = [
    'CANT.',
    'ENVASE',
    'VARIEDAD',
    'CAT.',
    'ETIQUETA',
    'CALIBRE',
    'KG NETO',
    'KG BRUTO',
    'PRECIO/CAJA',
    'TOTAL',
  ];
  
  const colWidths = [15, 18, 25, 12, 18, 12, 15, 15, 18, 22];
  let x = 20;
  
  headers.forEach((header, index) => {
    doc.setFont('helvetica', 'bold');
    doc.text(header, x, y);
    x += colWidths[index];
  });
  
  y += 4;
  doc.line(20, y, 190, y);
  y += 3;

  // Productos Rows
  doc.setFont('helvetica', 'normal');
  factura.productos.forEach((producto) => {
    const row = [
      producto.cantidad.toLocaleString(),
      producto.tipoEnvase,
      producto.variedad.substring(0, 12),
      producto.categoria,
      producto.etiqueta.substring(0, 10),
      producto.calibre,
      producto.kgNetoUnidad.toFixed(2),
      producto.kgBrutoUnidad.toFixed(2),
      `US$${producto.precioPorCaja.toFixed(2)}`,
      `US$${producto.total.toFixed(2)}`,
    ];
    
    x = 20;
    row.forEach((cell, index) => {
      doc.text(cell, x, y);
      x += colWidths[index];
    });
    
    y += 5;
    
    // New page if needed
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
  });

  y += 3;
  doc.line(20, y, 190, y);
  y += 4;

  // Totals
  doc.setFont('helvetica', 'bold');
  x = 20;
  doc.text('TOTALES:', x, y);
  x = 170;
  doc.text(`US$${factura.totales.valorTotal.toFixed(2)}`, x, y, { align: 'right' });
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Quantity: ${factura.totales.cantidadTotal.toLocaleString()}`, 20, y);
  y += 8;

  // Payment Summary
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('VALOR TOTAL A PAGAR (Total Value to Pay):', 20, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  const totalTextLines = doc.splitTextToSize(factura.totales.valorTotalTexto, 170);
  doc.text(totalTextLines, 20, y);
  y += totalTextLines.length * 4 + 2;
  
  if (factura.embarque.formaPago) {
    doc.text(`PLAZO DE PAGO (Payment Terms): ${factura.embarque.formaPago}`, 20, y);
  }
  y += 10;

  // Footer
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(factura.exportador.nombre, 105, y, { align: 'center' });

  // Descargar PDF
  doc.save(`Factura_${factura.refAsli}_${factura.embarque.numeroEmbarque}.pdf`);
}

