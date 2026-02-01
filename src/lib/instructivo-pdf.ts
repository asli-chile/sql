// Generación de PDF para Instructivo de Embarque usando jsPDF
import jsPDF from 'jspdf';
import { Registro } from '@/types/registros';

export interface InstructivoPDFData {
  fechaEmision: string;
  consignatario: string;
  exportador: string;
  naviera: string;
  booking: string;
  contenedor?: string; // Opcional: puede no tener contenedor aún
  tipoContenedor: string;
  temperatura?: string;
  pol: string;
  pod: string;
  etd?: string;
  eta?: string;
  especie: string;
  observaciones?: string;
  registro: Registro;
}

export async function generarInstructivoPDF(data: InstructivoPDFData): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Funciones auxiliares para formateo
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  let y = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);

  // Título
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  const title = 'INSTRUCTIVO DE EMBARQUE';
  const titleWidth = doc.getTextWidth(title);
  doc.text(title, margin + (contentWidth / 2) - (titleWidth / 2), y);
  y += 10;

  // Fecha de Emisión
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Fecha de Emisión: ${formatDate(data.fechaEmision)}`, margin, y);
  y += 8;

  // Información del Contenedor
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('INFORMACIÓN DEL CONTENEDOR', margin, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const containerInfo = [
    { label: 'Contenedor:', value: data.contenedor || 'PENDIENTE ASIGNACIÓN' },
    { label: 'Tipo:', value: data.tipoContenedor },
    { label: 'Booking:', value: data.booking },
  ];

  containerInfo.forEach(({ label, value }) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, margin + 35, y);
    y += 6;
  });

  y += 4;

  // Información del Embarque
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('INFORMACIÓN DEL EMBARQUE', margin, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const shippingInfo = [
    { label: 'Exportador:', value: data.exportador },
    { label: 'Consignatario:', value: data.consignatario },
    { label: 'Naviera:', value: data.naviera },
    { label: 'Especie:', value: data.especie },
  ];

  shippingInfo.forEach(({ label, value }) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin, y);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(value || '', contentWidth - 40);
    doc.text(lines, margin + 35, y);
    y += lines.length * 5;
  });

  y += 4;

  // Información de Puertos y Fechas
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('INFORMACIÓN DE PUERTOS Y FECHAS', margin, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const portInfo = [
    { label: 'Puerto de Origen (POL):', value: data.pol },
    { label: 'Puerto de Destino (POD):', value: data.pod },
  ];

  portInfo.forEach(({ label, value }) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value || '-', margin + 50, y);
    y += 6;
  });

  if (data.etd) {
    doc.setFont('helvetica', 'bold');
    doc.text('ETD (Fecha de Zarpe):', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(formatDate(data.etd), margin + 50, y);
    y += 6;
  }

  if (data.eta) {
    doc.setFont('helvetica', 'bold');
    doc.text('ETA (Fecha de Arribo):', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(formatDate(data.eta), margin + 50, y);
    y += 6;
  }

  y += 4;

  // Información de Temperatura (si aplica)
  if (data.temperatura) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('INFORMACIÓN DE TEMPERATURA', margin, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Temperatura:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${data.temperatura} °C`, margin + 35, y);
    y += 8;
  }

  // Observaciones
  if (data.observaciones) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('OBSERVACIONES', margin, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const obsLines = doc.splitTextToSize(data.observaciones, contentWidth);
    doc.text(obsLines, margin, y);
    y += obsLines.length * 5;
  }

  // Footer con información adicional del registro
  if (y > 250) {
    doc.addPage();
    y = 20;
  }

  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('INFORMACIÓN ADICIONAL', margin, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const additionalInfo = [];
  if (data.registro.refAsli) {
    additionalInfo.push({ label: 'Ref. ASLI:', value: data.registro.refAsli });
  }
  if (data.registro.numeroBl) {
    additionalInfo.push({ label: 'N° BL:', value: data.registro.numeroBl });
  }
  if (data.registro.naveInicial) {
    additionalInfo.push({ label: 'Nave:', value: data.registro.naveInicial });
  }

  additionalInfo.forEach(({ label, value }) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, margin + 30, y);
    y += 5;
  });

  // Generar nombre del archivo
  const contenedorNombre = data.contenedor || 'PENDIENTE';
  const fileName = `Instructivo_Embarque_${contenedorNombre}_${formatDate(data.fechaEmision).replace(/-/g, '')}.pdf`;
  
  // Descargar PDF
  doc.save(fileName);
}
