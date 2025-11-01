import PDFDocument from 'pdfkit';
import { Registro } from '@/types/registros';
import { tiposReportes, TipoReporte } from './excel-templates';

// Tipos para PDFs (mismos que Excel)
export type TipoReportePDF = TipoReporte;

// Función helper para agregar header con logo y título
const agregarHeader = (
  doc: PDFKit.PDFDocument,
  titulo: string,
  y: number = 50
): number => {
  // Título centrado
  doc
    .fontSize(20)
    .font('Helvetica-Bold')
    .fillColor('#11224E') // Dark Blue
    .text(titulo, {
      align: 'center',
      y: y
    });
  
  return y + 40;
};

// Función helper para agregar tabla
const agregarTabla = (
  doc: PDFKit.PDFDocument,
  headers: string[],
  datos: (string | number | null | undefined)[][],
  startY: number,
  anchoPagina: number = 550
): number => {
  const columnas = headers.length;
  const anchoColumna = anchoPagina / columnas;
  const alturaFila = 25;
  const alturaHeader = 30;
  
  let y = startY;
  
  // Header de la tabla
  doc
    .fontSize(11)
    .font('Helvetica-Bold')
    .fillColor('#FFFFFF')
    .rect(50, y, anchoPagina, alturaHeader)
    .fill('#11224E'); // Dark Blue background
  
  headers.forEach((header, index) => {
    const x = 50 + (index * anchoColumna);
    doc.text(header, x + 5, y + 8, {
      width: anchoColumna - 10,
      align: 'left'
    });
  });
  
  y += alturaHeader;
  
  // Datos de la tabla
  doc.fillColor('#000000').font('Helvetica').fontSize(9);
  
  datos.forEach((fila, index) => {
    // Alternar colores de fondo
    if (index % 2 === 0) {
      doc
        .rect(50, y, anchoPagina, alturaFila)
        .fillColor('#F6EEE8') // Beige light
        .fill();
    }
    
    doc.fillColor('#000000');
    
    fila.forEach((valor, colIndex) => {
      const x = 50 + (colIndex * anchoColumna);
      const texto = valor?.toString() || '-';
      doc.text(texto, x + 5, y + 8, {
        width: anchoColumna - 10,
        align: 'left'
      });
    });
    
    y += alturaFila;
    
    // Nueva página si es necesario
    if (y > 750) {
      doc.addPage();
      y = 50;
    }
  });
  
  return y + 20;
};

// Función helper para agregar pie de página
const agregarPieDePagina = (
  doc: PDFKit.PDFDocument,
  y: number
): void => {
  doc
    .fontSize(10)
    .font('Helvetica-Italic')
    .fillColor('#666666')
    .text(
      'Asesorías y Servicios Logísticos Integrales Ltda.',
      {
        align: 'center',
        y: y
      }
    );
};

// Template: FACTURA
export async function generarFacturaPDF(registros: Registro[]): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const stream = doc.pipe(blobStream());
    
    stream.on('finish', async () => {
      const blob = stream.toBlob('application/pdf');
      const arrayBuffer = await blob.arrayBuffer();
      resolve(new Uint8Array(arrayBuffer));
    });
    
    doc.on('error', reject);
    
    let y = agregarHeader(doc, 'FACTURA COMERCIAL', 50);
    
    // Headers de la tabla
    const headers = ['REF ASLI', 'Cliente', 'Booking', 'Contenedores', 'Naviera', 'Nave', 'Estado', 'Ejecutivo'];
    
    // Procesar datos
    const datos: (string | number | null | undefined)[][] = registros.map(registro => [
      registro.refAsli,
      registro.shipper,
      registro.booking,
      Array.isArray(registro.contenedor) ? registro.contenedor.join(', ') : registro.contenedor,
      registro.naviera,
      registro.naveInicial,
      registro.estado,
      registro.ejecutivo
    ]);
    
    y = agregarTabla(doc, headers, datos, y);
    agregarPieDePagina(doc, y);
    
    doc.end();
  });
}

// Template: GUÍA DE DESPACHO
export async function generarGuiaDespachoPDF(registros: Registro[]): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4', layout: 'landscape' });
    const stream = doc.pipe(blobStream());
    
    stream.on('finish', async () => {
      const blob = stream.toBlob('application/pdf');
      const arrayBuffer = await blob.arrayBuffer();
      resolve(new Uint8Array(arrayBuffer));
    });
    
    doc.on('error', reject);
    
    let y = agregarHeader(doc, 'GUÍA DE DESPACHO', 50);
    
    const headers = ['REF ASLI', 'Cliente', 'Contenedor', 'Naviera', 'Nave', 'Origen', 'Destino', 'ETD', 'ETA', 'Estado'];
    
    const datos: (string | number | null | undefined)[][] = registros.map(registro => {
      const contenedores = Array.isArray(registro.contenedor) 
        ? registro.contenedor.join(', ')
        : typeof registro.contenedor === 'string' 
          ? registro.contenedor.split(/\s+/).filter(c => c.trim()).join(', ')
          : registro.contenedor?.toString() || '-';
      
      return [
        registro.refAsli,
        registro.shipper,
        contenedores,
        registro.naviera,
        registro.naveInicial,
        registro.pol,
        registro.pod,
        registro.etd ? new Date(registro.etd).toLocaleDateString('es-CL') : '-',
        registro.eta ? new Date(registro.eta).toLocaleDateString('es-CL') : '-',
        registro.estado
      ];
    });
    
    y = agregarTabla(doc, headers, datos, y, 750);
    agregarPieDePagina(doc, y);
    
    doc.end();
  });
}

// Template: ZARPE
export async function generarZarpePDF(registros: Registro[]): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4', layout: 'landscape' });
    const stream = doc.pipe(blobStream());
    
    stream.on('finish', async () => {
      const blob = stream.toBlob('application/pdf');
      const arrayBuffer = await blob.arrayBuffer();
      resolve(new Uint8Array(arrayBuffer));
    });
    
    doc.on('error', reject);
    
    let y = agregarHeader(doc, 'DOCUMENTO DE ZARPE', 50);
    
    const headers = ['REF ASLI', 'Naviera', 'Nave', 'Contenedores', 'Origen (POL)', 'Destino (POD)', 'ETD', 'Especie', 'Estado'];
    
    const datos: (string | number | null | undefined)[][] = registros.map(registro => [
      registro.refAsli,
      registro.naviera,
      registro.naveInicial,
      Array.isArray(registro.contenedor) ? registro.contenedor.join(', ') : registro.contenedor,
      registro.pol,
      registro.pod,
      registro.etd ? new Date(registro.etd).toLocaleDateString('es-CL') : '-',
      registro.especie,
      registro.estado
    ]);
    
    y = agregarTabla(doc, headers, datos, y, 750);
    agregarPieDePagina(doc, y);
    
    doc.end();
  });
}

// Template: ARRIBO
export async function generarArriboPDF(registros: Registro[]): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4', layout: 'landscape' });
    const stream = doc.pipe(blobStream());
    
    stream.on('finish', async () => {
      const blob = stream.toBlob('application/pdf');
      const arrayBuffer = await blob.arrayBuffer();
      resolve(new Uint8Array(arrayBuffer));
    });
    
    doc.on('error', reject);
    
    let y = agregarHeader(doc, 'DOCUMENTO DE ARRIBO', 50);
    
    const headers = ['REF ASLI', 'Naviera', 'Nave', 'Contenedores', 'Origen', 'Destino (POD)', 'ETA', 'Especie', 'Estado'];
    
    const datos: (string | number | null | undefined)[][] = registros.map(registro => [
      registro.refAsli,
      registro.naviera,
      registro.naveInicial,
      Array.isArray(registro.contenedor) ? registro.contenedor.join(', ') : registro.contenedor,
      registro.pol,
      registro.pod,
      registro.eta ? new Date(registro.eta).toLocaleDateString('es-CL') : '-',
      registro.especie,
      registro.estado
    ]);
    
    y = agregarTabla(doc, headers, datos, y, 750);
    agregarPieDePagina(doc, y);
    
    doc.end();
  });
}

// Template: RESERVA CONFIRMADA
export async function generarReservaConfirmadaPDF(registros: Registro[]): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4', layout: 'landscape' });
    const stream = doc.pipe(blobStream());
    
    stream.on('finish', async () => {
      const blob = stream.toBlob('application/pdf');
      const arrayBuffer = await blob.arrayBuffer();
      resolve(new Uint8Array(arrayBuffer));
    });
    
    doc.on('error', reject);
    
    let y = agregarHeader(doc, 'RESERVA CONFIRMADA', 50);
    
    const headers = [
      'REF ASLI', 'Cliente', 'Ejecutivo', 'Booking', 'Contenedores', 
      'Naviera', 'Nave', 'Origen', 'Destino', 'ETD', 'Estado'
    ];
    
    const datos: (string | number | null | undefined)[][] = registros.map(registro => {
      const contenedores = Array.isArray(registro.contenedor)
        ? registro.contenedor.join(', ')
        : typeof registro.contenedor === 'string'
          ? registro.contenedor.split(/\s+/).filter(c => c.trim()).join(', ')
          : registro.contenedor?.toString() || '-';
      
      return [
        registro.refAsli,
        registro.shipper,
        registro.ejecutivo,
        registro.booking,
        contenedores,
        registro.naviera,
        registro.naveInicial,
        registro.pol,
        registro.pod,
        registro.etd ? new Date(registro.etd).toLocaleDateString('es-CL') : '-',
        registro.estado
      ];
    });
    
    y = agregarTabla(doc, headers, datos, y, 750);
    agregarPieDePagina(doc, y);
    
    doc.end();
  });
}

// Función principal para generar reporte PDF según tipo
export async function generarReportePDF(
  tipo: TipoReportePDF,
  registros: Registro[]
): Promise<Uint8Array> {
  switch (tipo) {
    case 'factura':
      return generarFacturaPDF(registros);
    case 'guia-despacho':
      return generarGuiaDespachoPDF(registros);
    case 'zarpe':
      return generarZarpePDF(registros);
    case 'arribo':
      return generarArriboPDF(registros);
    case 'reserva-confirmada':
      return generarReservaConfirmadaPDF(registros);
    default:
      throw new Error(`Tipo de reporte PDF no válido: ${tipo}`);
  }
}

// Función helper para descargar PDF
export function descargarPDF(buffer: Uint8Array, nombreArchivo: string): void {
  const blob = new Blob([buffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${nombreArchivo}-${new Date().toISOString().split('T')[0]}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

