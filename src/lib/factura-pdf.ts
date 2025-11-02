// Generación de PDF para facturas usando jsPDF
import jsPDF from 'jspdf';
import { Factura } from '@/types/factura';

export async function generarFacturaPDF(factura: Factura): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Funciones auxiliares para formateo
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const month = months[date.getMonth()];
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const formatDateShort = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  let y = 15;
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);

  // Header - Exportador centrado a la izquierda
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  const exporterName = factura.exportador.nombre.toUpperCase();
  const exporterNameWidth = doc.getTextWidth(exporterName);
  doc.text(exporterName, margin + (contentWidth * 0.35) - (exporterNameWidth / 2), y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  if (factura.exportador.giro) {
    const giroWidth = doc.getTextWidth(factura.exportador.giro);
    doc.text(factura.exportador.giro, margin + (contentWidth * 0.35) - (giroWidth / 2), y);
    y += 4;
  }
  if (factura.exportador.direccion) {
    // Manejar saltos de línea en la dirección
    const dirLines = factura.exportador.direccion.split('\n');
    dirLines.forEach((line, index) => {
      if (line.trim()) {
        const dirWidth = doc.getTextWidth(line);
        doc.text(line, margin + (contentWidth * 0.35) - (dirWidth / 2), y);
        y += 4;
      }
    });
  }

  // RUT e Invoice en caja a la derecha
  y = 15;
  const boxX = margin + (contentWidth * 0.7);
  const boxWidth = 65;
  
  // Dibujar borde del cuadro
  doc.rect(boxX, y - 8, boxWidth, 12);
  
  let boxY = y - 5;
  if (factura.exportador.rut) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`R.U.T ${factura.exportador.rut}`, boxX + 3, boxY);
    boxY += 3.5;
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('INVOICE', boxX + 3, boxY);
  boxY += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`N° ${factura.embarque.numeroInvoice}`, boxX + 3, boxY);

  // FECHA en caja
  y = 28;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const fechaLabelWidth = doc.getTextWidth('FECHA:');
  doc.text('FECHA:', boxX, y);
  doc.rect(boxX + fechaLabelWidth + 2, y - 4, 35, 6);
  doc.text(formatDate(factura.embarque.fechaFactura), boxX + fechaLabelWidth + 5, y);

  // EMBARQUE N° en caja
  y += 6;
  const embarqueLabelWidth = doc.getTextWidth('EMBARQUE N°');
  doc.text('EMBARQUE N°', boxX, y);
  doc.rect(boxX + embarqueLabelWidth + 2, y - 4, 35, 6);
  doc.text(factura.embarque.numeroEmbarque, boxX + embarqueLabelWidth + 5, y);

  // Consignatario
  y = 48;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('CONSIGNEE:', margin, y);
  y += 5;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(factura.consignatario.nombre, margin, y);
  y += 4;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  if (factura.consignatario.direccion) {
    // Manejar saltos de línea en la dirección del consignatario
    const addressLines = factura.consignatario.direccion.split('\n');
    addressLines.forEach((line, index) => {
      if (line.trim() || index === 0) {
        const prefix = index === 0 ? 'Address: ' : '         ';
        doc.text(`${prefix}${line}`, margin, y);
        y += 4;
      }
    });
  }
  
  if (factura.consignatario.email || factura.consignatario.telefono) {
    const email = factura.consignatario.email ? `Email: ${factura.consignatario.email}` : '';
    const tel = factura.consignatario.telefono ? `TEL: ${factura.consignatario.telefono}` : '';
    const contactInfo = [email, tel].filter(Boolean).join(' ');
    doc.text(contactInfo, margin, y);
    y += 4;
  }
  
  if (factura.consignatario.usci) {
    doc.text(`USCI: ${factura.consignatario.usci}`, margin, y);
    y += 4;
  }
  
  doc.text(factura.consignatario.pais, margin, y);
  y += 5;

  // CSP y CSG
  const cspCsg: string[] = [];
  if (factura.embarque.csp) cspCsg.push(`CSP ${factura.embarque.csp}`);
  if (factura.embarque.csg) cspCsg.push(`CSG ${factura.embarque.csg}`);
  if (cspCsg.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text(cspCsg.join(' '), margin, y);
    y += 6;
  }

  // Tabla de detalles de embarque con bordes
  const tableStartY = y;
  const col1Width = 30;
  const col2Width = 30;
  const col3Width = 30;
  const col4Width = 30;
  const col5Width = 30;
  const col6Width = 30;
  const rowHeight = 5;

  const shippingRows = [
    [
      'FECHA EMBARQUE', formatDateShort(factura.embarque.fechaEmbarque),
      'MOTONAVE', factura.embarque.motonave || '-',
      'N° VIAJE', factura.embarque.numeroViaje || '-'
    ],
    [
      'MODALIDAD DE VENTA', factura.embarque.modalidadVenta || 'BAJO CONDICION',
      'CLÁUSULA DE VENTA', factura.embarque.clausulaVenta,
      'PAIS ORIGEN', factura.embarque.paisOrigen
    ],
    [
      'PTO EMBARQUE', factura.embarque.puertoEmbarque,
      'PTO DESTINO', factura.embarque.puertoDestino,
      'PAIS DESTINO FINAL', factura.embarque.paisDestinoFinal
    ],
    [
      'FORMA DE PAGO', factura.embarque.formaPago || '',
      'PESO NETO TOTAL', factura.embarque.pesoNetoTotal ? `${formatNumber(factura.embarque.pesoNetoTotal)} Kgs.` : '',
      'PESO BRUTO TOTAL', factura.embarque.pesoBrutoTotal ? `${formatNumber(factura.embarque.pesoBrutoTotal)} Kgs.` : ''
    ],
    [
      'CONTENEDOR / AWB', factura.embarque.contenedor || '', '', '', '', ''
    ]
  ];

  doc.setFontSize(7);
  shippingRows.forEach((row, rowIndex) => {
    const currentY = tableStartY + (rowIndex * rowHeight);
    
    // Dibujar bordes de las celdas
    for (let col = 0; col < 6; col++) {
      const x = margin + (col * 31);
      doc.rect(x, currentY - 4, 31, rowHeight);
    }

    // Dibujar contenido
    for (let col = 0; col < 6; col += 2) {
      if (row[col]) {
        const x = margin + (col * 31) + 1;
        doc.setFont('helvetica', 'bold');
        doc.text(row[col], x, currentY);
        
        if (row[col + 1]) {
          doc.setFont('helvetica', 'normal');
          doc.text(row[col + 1], x + col1Width, currentY);
        }
      }
    }
  });

  y = tableStartY + (shippingRows.length * rowHeight) + 5;

  // ESPECIE en caja
  const especieY = y;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  const especieLabelWidth = doc.getTextWidth('ESPECIE');
  doc.text('ESPECIE', margin + (contentWidth / 2) - (especieLabelWidth / 2), especieY);
  y += 4;
  
  const especieBoxWidth = 40;
  const especieBoxX = margin + (contentWidth / 2) - (especieBoxWidth / 2);
  doc.rect(especieBoxX, especieY, especieBoxWidth, 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  const especieValue = factura.productos[0]?.variedad || '';
  const especieValueWidth = doc.getTextWidth(especieValue);
  doc.text(especieValue, margin + (contentWidth / 2) - (especieValueWidth / 2), especieY + 3.5);
  
  y += 8;

  // Tabla de productos con bordes
  const productTableStartY = y;
  const productColWidths = [18, 20, 25, 18, 20, 18, 25, 25, 22];
  const productRowHeight = 5;
  const totalProductColWidth = productColWidths.reduce((a, b) => a + b, 0);

  // Headers de productos
  doc.setFontSize(6);
  const productHeaders = [
    'CANTIDAD\n(Quantity)',
    'TIPO ENVASE\n(Type of Package)',
    'VARIEDAD\n(Variety)',
    'CATEGORÍA\n(Category)',
    'ETIQUETA\n(Label)',
    'CALIBRE\n(Size)',
    'KG NETO UNIDAD\n(Net Weight Per Unit)',
    'PRECIO POR CAJA\n(Price per Box)',
    'TOTAL'
  ];

  let productX = margin;
  productHeaders.forEach((header, index) => {
    doc.rect(productX, productTableStartY - 4, productColWidths[index], productRowHeight * 2);
    doc.setFont('helvetica', 'bold');
    const headerLines = header.split('\n');
    let headerY = productTableStartY - 1;
    headerLines.forEach((line, lineIndex) => {
      doc.text(line, productX + 1, headerY);
      headerY += 2.5;
    });
    productX += productColWidths[index];
  });

  y = productTableStartY + (productRowHeight * 2);

  // Filas de productos
  doc.setFont('helvetica', 'normal');
  factura.productos.forEach((producto) => {
    productX = margin;
    
    // Dibujar bordes de la fila
    productColWidths.forEach((width) => {
      doc.rect(productX, y - 4, width, productRowHeight);
      productX += width;
    });

    // Contenido de la fila
    productX = margin;
    const productData = [
      producto.cantidad.toLocaleString('es-ES'),
      producto.tipoEnvase,
      producto.variedad,
      producto.categoria,
      producto.etiqueta,
      producto.calibre,
      `${producto.kgNetoUnidad.toFixed(2).replace('.', ',')} Kgs.`,
      `US$${producto.precioPorCaja.toFixed(2).replace('.', ',')}/box`,
      `US$${formatNumber(producto.total)}`
    ];

    productData.forEach((data, index) => {
      doc.text(data, productX + 1, y);
      if (index === productData.length - 1) {
        // TOTAL alineado a la derecha
        const textWidth = doc.getTextWidth(data);
        doc.text(data, productX + productColWidths[index] - textWidth - 1, y);
      }
      productX += productColWidths[index];
    });

    y += productRowHeight;

    // Nueva página si es necesario
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
  });

  // Fila de totales
  doc.rect(margin, y - 4, totalProductColWidth, productRowHeight);
  doc.setFont('helvetica', 'normal');
  doc.text(factura.totales.cantidadTotal.toLocaleString('es-ES'), margin + 1, y);
  doc.setFont('helvetica', 'bold');
  const totalesText = 'TOTALES';
  const totalesTextWidth = doc.getTextWidth(totalesText);
  doc.text(totalesText, margin + (totalProductColWidth / 2) - (totalesTextWidth / 2), y);
  doc.setFont('helvetica', 'bold');
  const totalValue = `US$${formatNumber(factura.totales.valorTotal)}`;
  const totalValueWidth = doc.getTextWidth(totalValue);
  doc.text(totalValue, margin + totalProductColWidth - totalValueWidth - 1, y);

  y += 8;

  // Payment Summary
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('VALOR TOTAL A PAGAR: (TOTAL VALUE:)', margin, y);
  y += 4;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const totalTextLines = doc.splitTextToSize(factura.totales.valorTotalTexto, 80);
  doc.text(totalTextLines, margin, y);
  
  const totalValueY = y;
  doc.setFont('helvetica', 'bold');
  doc.text(`US$${formatNumber(factura.totales.valorTotal)}`, margin + 140, totalValueY);
  y += totalTextLines.length * 4 + 2;

  if (factura.embarque.formaPago) {
    doc.setFont('helvetica', 'bold');
    doc.text('PLAZO DE PAGO: (PAYMENT TERMS:)', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(factura.embarque.formaPago, margin + 50, y);
    y += 6;
  }

  // Footer
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  const footerText = factura.exportador.nombre;
  const footerTextWidth = doc.getTextWidth(footerText);
  doc.text(footerText, margin + (contentWidth) - footerTextWidth, y);

  // Descargar PDF
  doc.save(`Factura_${factura.refAsli}_${factura.embarque.numeroInvoice}.pdf`);
}
