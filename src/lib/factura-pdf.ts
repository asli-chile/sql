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

  // Función para transformar variedad según especie
  const transformVariety = (variedad: string): string => {
    const mapping: Record<string, string> = {
      'CEREZA': 'RED CHERRIES',
      'Cereza': 'RED CHERRIES',
      'cereza': 'RED CHERRIES',
    };
    return mapping[variedad] || variedad;
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

  // Tabla de detalles de embarque con bordes - estructura reorganizada
  const tableStartY = y;
  const numCols = 5;
  const colWidth = 35;
  const headerRowHeight = 5;
  const valueRowHeight = 5;

  doc.setFontSize(7);
  let currentY = tableStartY;

  // Primera fila: Headers en español
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  const spanishHeaders = ['FECHA EMBARQUE', 'MOTONAVE', 'N° VIAJE', 'MODALIDAD DE VENTA', 'CLÁUSULA DE VENTA'];
  for (let col = 0; col < numCols; col++) {
    const x = margin + (col * colWidth);
    doc.rect(x, currentY - 4, colWidth, headerRowHeight);
    const textWidth = doc.getTextWidth(spanishHeaders[col]);
    doc.text(spanishHeaders[col], x + (colWidth / 2) - (textWidth / 2), currentY);
  }
  currentY += headerRowHeight;

  // Segunda fila: Headers en inglés (fuente más chica)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  const englishHeaders = ['(Departure Date)', '(Vessel)', '(Travel Number)', '(Terms of Sale)', '(Clause of Sale)'];
  for (let col = 0; col < numCols; col++) {
    const x = margin + (col * colWidth);
    doc.rect(x, currentY - 4, colWidth, headerRowHeight);
    const textWidth = doc.getTextWidth(englishHeaders[col]);
    doc.text(englishHeaders[col], x + (colWidth / 2) - (textWidth / 2), currentY);
  }
  currentY += headerRowHeight;

  // Tercera fila: Valores (centrados)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  const values = [
    formatDateShort(factura.embarque.fechaEmbarque),
    factura.embarque.motonave || '-',
    factura.embarque.numeroViaje || '-',
    factura.embarque.modalidadVenta || 'BAJO CONDICION',
    factura.embarque.clausulaVenta
  ];
  for (let col = 0; col < numCols; col++) {
    const x = margin + (col * colWidth);
    doc.rect(x, currentY - 4, colWidth, valueRowHeight);
    const textWidth = doc.getTextWidth(values[col]);
    doc.text(values[col], x + (colWidth / 2) - (textWidth / 2), currentY);
  }
  currentY += valueRowHeight + 1;

  // Segunda sección: PAIS ORIGEN, PTO EMBARQUE, etc.
  // Primera fila: Headers en español
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  const section2SpanishHeaders = ['PAIS ORIGEN', 'PTO EMBARQUE', 'PTO DESTINO', 'PAIS DESTINO FINAL', 'FORMA DE PAGO'];
  for (let col = 0; col < numCols; col++) {
    const x = margin + (col * colWidth);
    doc.rect(x, currentY - 4, colWidth, headerRowHeight);
    const textWidth = doc.getTextWidth(section2SpanishHeaders[col]);
    doc.text(section2SpanishHeaders[col], x + (colWidth / 2) - (textWidth / 2), currentY);
  }
  currentY += headerRowHeight;

  // Segunda fila: Headers en inglés
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  const section2EnglishHeaders = ['(Country of Origin)', '(Loading Port)', '(Destination Port)', '(Country of Destination)', '(Payment Terms)'];
  for (let col = 0; col < numCols; col++) {
    const x = margin + (col * colWidth);
    doc.rect(x, currentY - 4, colWidth, headerRowHeight);
    const textWidth = doc.getTextWidth(section2EnglishHeaders[col]);
    doc.text(section2EnglishHeaders[col], x + (colWidth / 2) - (textWidth / 2), currentY);
  }
  currentY += headerRowHeight;

  // Tercera fila: Valores (centrados)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  const values2 = [
    factura.embarque.paisOrigen,
    factura.embarque.puertoEmbarque,
    factura.embarque.puertoDestino,
    factura.embarque.paisDestinoFinal,
    factura.embarque.formaPago || ''
  ];
  for (let col = 0; col < numCols; col++) {
    const x = margin + (col * colWidth);
    doc.rect(x, currentY - 4, colWidth, valueRowHeight);
    const textWidth = doc.getTextWidth(values2[col]);
    doc.text(values2[col], x + (colWidth / 2) - (textWidth / 2), currentY);
  }
  currentY += valueRowHeight + 1;

  // Tercera sección: PESO NETO, PESO BRUTO, CONTENEDOR
  // Primera fila: Headers en español
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  const section3SpanishHeaders = ['PESO NETO TOTAL', 'PESO BRUTO TOTAL', 'CONTENEDOR / AWB'];
  for (let col = 0; col < 3; col++) {
    const x = margin + (col * colWidth);
    const colspan = col === 2 ? 3 : 1;
    const width = colWidth * colspan;
    doc.rect(x, currentY - 4, width, headerRowHeight);
    const textWidth = doc.getTextWidth(section3SpanishHeaders[col]);
    doc.text(section3SpanishHeaders[col], x + (width / 2) - (textWidth / 2), currentY);
    if (col === 2) break; // Salir después del contenedor que ocupa 3 columnas
  }
  currentY += headerRowHeight;

  // Segunda fila: Headers en inglés
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  const section3EnglishHeaders = ['(Total Net Weight)', '(Total Gross Weight)', '(Container / AWB)'];
  for (let col = 0; col < 3; col++) {
    const x = margin + (col * colWidth);
    const colspan = col === 2 ? 3 : 1;
    const width = colWidth * colspan;
    doc.rect(x, currentY - 4, width, headerRowHeight);
    const textWidth = doc.getTextWidth(section3EnglishHeaders[col]);
    doc.text(section3EnglishHeaders[col], x + (width / 2) - (textWidth / 2), currentY);
    if (col === 2) break; // Salir después del contenedor que ocupa 3 columnas
  }
  currentY += headerRowHeight;

  // Tercera fila: Valores (centrados)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  const pesoNeto = factura.embarque.pesoNetoTotal ? `${formatNumber(factura.embarque.pesoNetoTotal)} Kgs.` : '';
  const pesoBruto = factura.embarque.pesoBrutoTotal ? `${formatNumber(factura.embarque.pesoBrutoTotal)} Kgs.` : '';
  const contenedor = factura.embarque.contenedor || '';
  
  // PESO NETO
  doc.rect(margin, currentY - 4, colWidth, valueRowHeight);
  const pesoNetoWidth = doc.getTextWidth(pesoNeto);
  doc.text(pesoNeto, margin + (colWidth / 2) - (pesoNetoWidth / 2), currentY);
  
  // PESO BRUTO
  doc.rect(margin + colWidth, currentY - 4, colWidth, valueRowHeight);
  const pesoBrutoWidth = doc.getTextWidth(pesoBruto);
  doc.text(pesoBruto, margin + colWidth + (colWidth / 2) - (pesoBrutoWidth / 2), currentY);
  
  // CONTENEDOR (ocupa 3 columnas)
  doc.rect(margin + (colWidth * 2), currentY - 4, colWidth * 3, valueRowHeight);
  const contenedorWidth = doc.getTextWidth(contenedor);
  doc.text(contenedor, margin + (colWidth * 2) + ((colWidth * 3) / 2) - (contenedorWidth / 2), currentY);
  
  currentY += valueRowHeight;

  y = currentY + 5;

  // Tabla de productos con bordes
  const productTableStartY = y;
  const productColWidths = [18, 20, 25, 18, 20, 18, 25, 25, 22];
  const productRowHeight = 5;
  const totalProductColWidth = productColWidths.reduce((a, b) => a + b, 0);

  // Fila ESPECIE
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  // Primera columna: ESPECIE header
  doc.rect(margin, productTableStartY - 4, productColWidths[0], productRowHeight * 2);
  doc.text('ESPECIE', margin + (productColWidths[0] / 2) - (doc.getTextWidth('ESPECIE') / 2), productTableStartY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.text('(Specie)', margin + (productColWidths[0] / 2) - (doc.getTextWidth('(Specie)') / 2), productTableStartY + 3);
  
  // Resto de columnas con variedad (colSpan 8)
  const variedadColSpan = productColWidths.slice(1).reduce((a, b) => a + b, 0);
  doc.rect(margin + productColWidths[0], productTableStartY - 4, variedadColSpan, productRowHeight * 2);
  const especieValue = transformVariety(factura.productos[0]?.variedad || '');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(especieValue, margin + productColWidths[0] + (variedadColSpan / 2) - (doc.getTextWidth(especieValue) / 2), productTableStartY + 1);

  y = productTableStartY + (productRowHeight * 2) + 1;

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
    doc.rect(productX, y - 4, productColWidths[index], productRowHeight * 2);
    doc.setFont('helvetica', 'bold');
    const headerLines = header.split('\n');
    let headerY = y - 1;
    headerLines.forEach((line, lineIndex) => {
      doc.text(line, productX + 1, headerY);
      headerY += 2.5;
    });
    productX += productColWidths[index];
  });

  y += (productRowHeight * 2);

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
      transformVariety(producto.variedad),
      producto.categoria,
      producto.etiqueta,
      producto.calibre,
      `${producto.kgNetoUnidad.toFixed(2).replace('.', ',')} Kgs.`,
      `US$${producto.precioPorCaja.toFixed(2).replace('.', ',')}/box`,
      `US$${formatNumber(producto.total)}`
    ];

    productData.forEach((data, index) => {
      if (index === productData.length - 1) {
        // TOTAL alineado a la derecha (solo una vez)
        doc.setFont('helvetica', 'bold');
        const textWidth = doc.getTextWidth(data);
        doc.text(data, productX + productColWidths[index] - textWidth - 1, y);
      } else if (index === 4) {
        // ETIQUETA: usar splitTextToSize para manejar texto largo
        doc.setFont('helvetica', 'normal');
        const labelLines = doc.splitTextToSize(data, productColWidths[index] - 2);
        labelLines.forEach((line: string, lineIndex: number) => {
          doc.text(line, productX + 1, y + (lineIndex * 2.5));
        });
      } else {
        doc.setFont('helvetica', 'normal');
        doc.text(data, productX + 1, y);
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

  // Fila de totales - Dibujar bordes de cada celda
  let totalesX = margin;
  // Primera celda: cantidad total
  doc.rect(totalesX, y - 4, productColWidths[0], productRowHeight);
  doc.setFont('helvetica', 'normal');
  doc.text(factura.totales.cantidadTotal.toLocaleString('es-ES'), totalesX + 1, y);
  totalesX += productColWidths[0];
  
  // Celdas intermedias con "TOTALES" (ocupan 7 columnas)
  const totalesColsWidth = productColWidths.slice(1, 8).reduce((a, b) => a + b, 0);
  doc.rect(totalesX, y - 4, totalesColsWidth, productRowHeight);
  doc.setFont('helvetica', 'bold');
  const totalesText = 'TOTALES';
  const totalesTextWidth = doc.getTextWidth(totalesText);
  doc.text(totalesText, totalesX + (totalesColsWidth / 2) - (totalesTextWidth / 2), y);
  totalesX += totalesColsWidth;
  
  // Última celda: valor total
  doc.rect(totalesX, y - 4, productColWidths[8], productRowHeight);
  doc.setFont('helvetica', 'bold');
  const totalValue = `US$${formatNumber(factura.totales.valorTotal)}`;
  const totalValueWidth = doc.getTextWidth(totalValue);
  doc.text(totalValue, totalesX + productColWidths[8] - totalValueWidth - 1, y);

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
