// Generación de PDF para facturas usando jsPDF
import jsPDF from 'jspdf';
import { Factura } from '@/types/factura';

// Función para convertir número a palabras (en inglés, como en la factura)
function numberToWords(num: number): string {
  const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];
  const teens = ['TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
  const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];

  if (num === 0) return 'ZERO';

  // Asegurar que num es un número válido
  if (isNaN(num) || !isFinite(num)) {
    return 'ZERO US Dollar';
  }
  
  // Separar parte entera y decimal
  const integerPart = Math.floor(Math.abs(num));
  const rawDecimal = Math.abs(num) - integerPart;
  const decimalPart = Math.round(Math.round(rawDecimal * 10000) / 100);

  const parts = [];
  let workingNum = integerPart;

  // Simple implementation for up to millions
  if (workingNum >= 1000000) {
    const millions = Math.floor(workingNum / 1000000);
    parts.push(convertHundreds(millions) + ' MILLION');
    workingNum %= 1000000;
  }

  if (workingNum >= 1000) {
    const thousands = Math.floor(workingNum / 1000);
    parts.push(convertHundreds(thousands) + ' THOUSAND');
    workingNum %= 1000;
  }

  if (workingNum > 0) {
    parts.push(convertHundreds(workingNum));
  }

  // Filtrar partes vacías antes de unir
  const validParts = parts.filter(p => p && p.trim() !== '');
  let result = validParts.length > 0 ? validParts.join(' ') + ' US Dollar' : 'ZERO US Dollar';
  
  // Agregar centavos si hay decimales
  if (decimalPart > 0) {
    const cents = convertHundreds(decimalPart);
    if (cents && cents.trim() !== '') {
      result += ' AND ' + cents + ' Cent';
      if (decimalPart > 1) {
        result += 's';
      }
    }
  }

  return result;

  function convertHundreds(num: number): string {
    if (!num || num === 0 || isNaN(num)) return '';
    
    if (num < 10) {
      const result = ones[num];
      return (result && result.trim() !== '') ? result : '';
    }
    if (num < 20) {
      const index = num - 10;
      const result = teens[index];
      return (result && result.trim() !== '') ? result : '';
    }
    if (num < 100) {
      const tensDigit = Math.floor(num / 10);
      const onesDigit = num % 10;
      const tensStr = (tens[tensDigit] && tens[tensDigit].trim() !== '') ? tens[tensDigit] : '';
      const onesStr = (onesDigit > 0 && ones[onesDigit] && ones[onesDigit].trim() !== '') ? ones[onesDigit] : '';
      if (!tensStr && !onesStr) return '';
      return tensStr + (onesStr ? ' ' + onesStr : '').trim();
    }
    
    const hundreds = Math.floor(num / 100);
    const remainder = num % 100;
    const hundredsStr = (ones[hundreds] && ones[hundreds].trim() !== '') ? ones[hundreds] : '';
    if (!hundredsStr) return '';
    
    const remainderStr = remainder > 0 ? convertHundreds(remainder) : '';
    return hundredsStr + ' HUNDRED' + (remainderStr && remainderStr.trim() !== '' ? ' ' + remainderStr : '');
  }
}

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
      'CEREZA': 'FRESH CHERRIES',
      'Cereza': 'FRESH CHERRIES',
      'cereza': 'FRESH CHERRIES',
    };
    return mapping[variedad] || variedad;
  };

  let y = 15;
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 5; // Reducir margen para dar más espacio
  const contentWidth = pageWidth - (margin * 2);
  const tableWidth = contentWidth; // Usar todo el ancho disponible
  const colWidth = tableWidth / 5; // 5 columnas de igual ancho

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
  let headerY = 15;
  const boxWidth = 65;
  const boxX = pageWidth - margin - boxWidth; // Alineado a la derecha del contenido
  
  // Dibujar borde del cuadro
  doc.rect(boxX, headerY - 8, boxWidth, 12);
  
  let boxY = headerY - 5;
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

  // FECHA y EMBARQUE N° - Alineados a la derecha
  y = 28;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const tableRightEdge = margin + tableWidth;
  const fechaLabelWidth = doc.getTextWidth('FECHA:');
  const fechaBoxWidth = 40;
  const fechaLabelX = tableRightEdge - fechaBoxWidth - fechaLabelWidth - 4;
  doc.text('FECHA:', fechaLabelX, y);
  const fechaBoxX = tableRightEdge - fechaBoxWidth;
  doc.rect(fechaBoxX, y - 4, fechaBoxWidth, 6);
  const fechaTextWidth = doc.getTextWidth(formatDate(factura.embarque.fechaFactura));
  doc.text(formatDate(factura.embarque.fechaFactura), fechaBoxX + (fechaBoxWidth / 2) - (fechaTextWidth / 2), y);

  // EMBARQUE N° en caja - Alineado a la derecha
  y += 8;
  const embarqueLabelWidth = doc.getTextWidth('EMBARQUE N°');
  const embarqueBoxWidth = 40;
  const embarqueLabelX = tableRightEdge - embarqueBoxWidth - embarqueLabelWidth - 4;
  doc.text('EMBARQUE N°', embarqueLabelX, y);
  const embarqueBoxX = tableRightEdge - embarqueBoxWidth;
  doc.rect(embarqueBoxX, y - 4, embarqueBoxWidth, 6);
  const embarqueTextWidth = doc.getTextWidth(factura.embarque.numeroEmbarque);
  doc.text(factura.embarque.numeroEmbarque, embarqueBoxX + (embarqueBoxWidth / 2) - (embarqueTextWidth / 2), y);

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
  
  if (factura.consignatario.email || factura.consignatario.telefono || factura.consignatario.telefonoContacto) {
    const email = factura.consignatario.email ? `Email: ${factura.consignatario.email}` : '';
    const tel = (factura.consignatario.telefonoContacto || factura.consignatario.telefono) 
      ? `TEL: ${factura.consignatario.telefonoContacto || factura.consignatario.telefono}`
      : '';
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
  // colWidth ya está definido arriba (tableWidth / 5)
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
  const englishHeaders = ['Departure Date', 'Vessel', 'Travel Number', 'Terms of Sale', 'Clause of Sale'];
  for (let col = 0; col < numCols; col++) {
    const x = margin + (col * colWidth);
    doc.rect(x, currentY - 4, colWidth, headerRowHeight);
    const textWidth = doc.getTextWidth(englishHeaders[col]);
    doc.text(englishHeaders[col], x + (colWidth / 2) - (textWidth / 2), currentY);
  }
  currentY += headerRowHeight;

  // Tercera fila: Valores (alineados a la derecha)
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
  const section2EnglishHeaders = ['Country of Origin', 'Loading Port', 'Destination Port', 'Country of Destination', 'Payment Terms'];
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
  const section3EnglishHeaders = ['Net Weight', 'Gross Weight', 'Container / AWB'];
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
  
  // CONTENEDOR (ocupa 3 columnas) - centrado
  doc.rect(margin + (colWidth * 2), currentY - 4, colWidth * 3, valueRowHeight);
  const contenedorWidth = doc.getTextWidth(contenedor);
  doc.text(contenedor, margin + (colWidth * 2) + ((colWidth * 3) / 2) - (contenedorWidth / 2), currentY);
  
  currentY += valueRowHeight;

  y = currentY + 5;

  // Tabla de productos con bordes - Mismo ancho que la tabla de embarque
  const productTableStartY = y;
  // Anchuras originales proporcionales
  const originalColWidths = [18, 20, 25, 18, 20, 18, 25, 25, 22];
  const originalTotal = originalColWidths.reduce((a, b) => a + b, 0);
  // Escalar proporcionalmente para que coincida con el ancho de la tabla de embarque
  const scale = tableWidth / originalTotal;
  const productColWidths = originalColWidths.map(w => w * scale);
  const productRowHeight = 5;
  const totalProductColWidth = tableWidth;

  // Fila ESPECIE
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  // Primera columna: ESPECIE header
  doc.rect(margin, productTableStartY - 4, productColWidths[0], productRowHeight * 2);
  doc.text('ESPECIE', margin + (productColWidths[0] / 2) - (doc.getTextWidth('ESPECIE') / 2), productTableStartY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.text('(Specie)', margin + (productColWidths[0] / 2) - (doc.getTextWidth('(Specie)') / 2), productTableStartY + 3);
  
  // Resto de columnas con variedad (colSpan 8) - centrado
  const variedadColSpan = productColWidths.slice(1).reduce((a, b) => a + b, 0);
  doc.rect(margin + productColWidths[0], productTableStartY - 4, variedadColSpan, productRowHeight * 2);
  const especieValue = transformVariety(factura.productos[0]?.especie || '');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  const especieValueWidth = doc.getTextWidth(especieValue);
  doc.text(especieValue, margin + productColWidths[0] + (variedadColSpan / 2) - (especieValueWidth / 2), productTableStartY + 1);

  y = productTableStartY + (productRowHeight * 2) + 1;

  // Headers de productos en español
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  const productHeadersSpanish = [
    'CANTIDAD',
    'TIPO ENVASE',
    'VARIEDAD',
    'CATEGORÍA',
    'ETIQUETA',
    'CALIBRE',
    'KG NETO UNIDAD',
    'PRECIO POR CAJA',
    'TOTAL'
  ];

  let productX = margin;
  productHeadersSpanish.forEach((header, index) => {
    doc.rect(productX, y - 4, productColWidths[index], productRowHeight);
    const textWidth = doc.getTextWidth(header);
    doc.text(header, productX + (productColWidths[index] / 2) - (textWidth / 2), y);
    productX += productColWidths[index];
  });

  y += productRowHeight;

  // Headers de productos en inglés
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  const productHeadersEnglish = [
    'Quantity',
    'Type of Package',
    'Variety',
    'Category',
    'Label',
    'Size',
    'Net Weight Per Unit',
    'Price per Box',
    'Total Value'
  ];

  productX = margin;
  productHeadersEnglish.forEach((header, index) => {
    doc.rect(productX, y - 4, productColWidths[index], productRowHeight);
    if (header) {
      const textWidth = doc.getTextWidth(header);
      doc.text(header, productX + (productColWidths[index] / 2) - (textWidth / 2), y);
    }
    productX += productColWidths[index];
  });

  y += productRowHeight;

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
        // TOTAL centrado
        doc.setFont('helvetica', 'bold');
        const textWidth = doc.getTextWidth(data);
        doc.text(data, productX + (productColWidths[index] / 2) - (textWidth / 2), y);
      } else if (index === 4) {
        // ETIQUETA: usar splitTextToSize para manejar texto largo - centrado
        doc.setFont('helvetica', 'normal');
        const labelLines = doc.splitTextToSize(data, productColWidths[index] - 2);
        labelLines.forEach((line: string, lineIndex: number) => {
          const lineWidth = doc.getTextWidth(line);
          doc.text(line, productX + (productColWidths[index] / 2) - (lineWidth / 2), y + (lineIndex * 2.5));
        });
      } else {
        // Todos los demás campos centrados
        doc.setFont('helvetica', 'normal');
        const textWidth = doc.getTextWidth(data);
        doc.text(data, productX + (productColWidths[index] / 2) - (textWidth / 2), y);
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
  // Primera celda: cantidad total - centrada
  doc.rect(totalesX, y - 4, productColWidths[0], productRowHeight);
  doc.setFont('helvetica', 'normal');
  const cantidadTotalText = factura.totales.cantidadTotal.toLocaleString('es-ES');
  const cantidadTotalWidth = doc.getTextWidth(cantidadTotalText);
  doc.text(cantidadTotalText, totalesX + (productColWidths[0] / 2) - (cantidadTotalWidth / 2), y);
  totalesX += productColWidths[0];
  
  // Celdas intermedias con "TOTALES" (ocupan 7 columnas) - centrado
  const totalesColsWidth = productColWidths.slice(1, 8).reduce((a, b) => a + b, 0);
  doc.rect(totalesX, y - 4, totalesColsWidth, productRowHeight);
  doc.setFont('helvetica', 'bold');
  const totalesText = 'TOTALES';
  const totalesTextWidth = doc.getTextWidth(totalesText);
  doc.text(totalesText, totalesX + (totalesColsWidth / 2) - (totalesTextWidth / 2), y);
  totalesX += totalesColsWidth;
  
  // Última celda: valor total - centrado
  doc.rect(totalesX, y - 4, productColWidths[8], productRowHeight);
  doc.setFont('helvetica', 'bold');
  const totalValue = `US$${formatNumber(factura.totales.valorTotal)}`;
  const totalValueWidth = doc.getTextWidth(totalValue);
  doc.text(totalValue, totalesX + (productColWidths[8] / 2) - (totalValueWidth / 2), y);

  y += 8;

  // Payment Summary
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('VALOR TOTAL A PAGAR: (TOTAL VALUE:)', margin, y);
  y += 4;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  // Recalcular el texto si contiene "undefined" o está vacío
  const valorTotalTexto = factura.totales.valorTotalTexto && !factura.totales.valorTotalTexto.includes('undefined') 
    ? factura.totales.valorTotalTexto 
    : numberToWords(factura.totales.valorTotal);
  const totalTextLines = doc.splitTextToSize(valorTotalTexto, 80);
  doc.text(totalTextLines, margin, y);
  
  const totalValueY = y;
  doc.setFont('helvetica', 'bold');
  doc.text(`US$${formatNumber(factura.totales.valorTotal)}`, margin + 140, totalValueY);
  y += totalTextLines.length * 4 + 2;

  if (factura.embarque.formaPago) {
    doc.setFont('helvetica', 'bold');
    const plazoLabel = 'PLAZO DE PAGO:';
    const paymentTermsLabel = '(PAYMENT TERMS:)';
    const labelWidth = doc.getTextWidth(plazoLabel);
    doc.text(plazoLabel, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(paymentTermsLabel, margin + labelWidth + 2, y);
    const paymentTermsWidth = doc.getTextWidth(paymentTermsLabel);
    doc.text(factura.embarque.formaPago, margin + labelWidth + paymentTermsWidth + 4, y);
    y += 6;
  }

  // Footer - Centrado
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  const footerText = factura.exportador.nombre;
  const footerTextWidth = doc.getTextWidth(footerText);
  doc.text(footerText, margin + (contentWidth / 2) - (footerTextWidth / 2), y);

  // Descargar PDF
  doc.save(`Factura_${factura.refAsli}_${factura.embarque.numeroInvoice}.pdf`);
}
