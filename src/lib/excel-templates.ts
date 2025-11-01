import ExcelJS from 'exceljs';
import { Registro } from '@/types/registros';

// Tipos de reportes disponibles
export type TipoReporte = 
  | 'factura' 
  | 'guia-despacho' 
  | 'zarpe' 
  | 'arribo' 
  | 'reserva-confirmada';

export interface OpcionReporte {
  id: TipoReporte;
  nombre: string;
  descripcion: string;
  icono: string;
}

export const tiposReportes: OpcionReporte[] = [
  {
    id: 'factura',
    nombre: 'Factura',
    descripcion: 'Generar factura comercial',
    icono: '📄'
  },
  {
    id: 'guia-despacho',
    nombre: 'Guía de Despacho',
    descripcion: 'Generar guía de despacho',
    icono: '📦'
  },
  {
    id: 'zarpe',
    nombre: 'Zarpe',
    descripcion: 'Documento de zarpe del barco',
    icono: '🚢'
  },
  {
    id: 'arribo',
    nombre: 'Arribo',
    descripcion: 'Documento de arribo del barco',
    icono: '⚓'
  },
  {
    id: 'reserva-confirmada',
    nombre: 'Reserva Confirmada',
    descripcion: 'Confirmación de reserva de contenedores',
    icono: '✅'
  }
];

// Estilos comunes
const crearEstilos = () => {
  return {
    header: {
      font: { bold: true, size: 14, color: { argb: 'FFFFFFFF' } },
      fill: {
        type: 'pattern' as const,
        pattern: 'solid' as const,
        fgColor: { argb: 'FF1e3a8a' }
      },
      alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
      border: {
        top: { style: 'thin' as const, color: { argb: 'FF000000' } },
        left: { style: 'thin' as const, color: { argb: 'FF000000' } },
        bottom: { style: 'thin' as const, color: { argb: 'FF000000' } },
        right: { style: 'thin' as const, color: { argb: 'FF000000' } }
      }
    },
    titulo: {
      font: { bold: true, size: 16, color: { argb: 'FF1e3a8a' } },
      alignment: { horizontal: 'center' as const, vertical: 'middle' as const }
    },
    subtitulo: {
      font: { bold: true, size: 12 },
      fill: {
        type: 'pattern' as const,
        pattern: 'solid' as const,
        fgColor: { argb: 'FFF3F4F6' }
      }
    },
    celda: {
      border: {
        top: { style: 'thin' as const, color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin' as const, color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin' as const, color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin' as const, color: { argb: 'FFE5E7EB' } }
      },
      alignment: { vertical: 'middle' as const }
    },
    total: {
      font: { bold: true, size: 12 },
      fill: {
        type: 'pattern' as const,
        pattern: 'solid' as const,
        fgColor: { argb: 'FFE0E7FF' }
      }
    }
  };
};

// Template: FACTURA
export async function generarFactura(registros: Registro[]): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Factura');
  const estilos = crearEstilos();

  // Título
  worksheet.mergeCells('A1:H1');
  worksheet.getCell('A1').value = 'FACTURA COMERCIAL';
  worksheet.getCell('A1').style = estilos.titulo;

  // Información de la empresa
  worksheet.mergeCells('A3:B3');
  worksheet.getCell('A3').value = 'Asesorías y Servicios Logísticos Integrales Ltda.';
  worksheet.getCell('A3').style = { font: { bold: true } };

  // Datos de cada registro
  let rowIndex = 5;
  
  registros.forEach((registro, index) => {
    // Encabezado del registro
    worksheet.mergeCells(`A${rowIndex}:H${rowIndex}`);
    worksheet.getCell(`A${rowIndex}`).value = `Registro ${index + 1}: ${registro.refAsli}`;
    worksheet.getCell(`A${rowIndex}`).style = estilos.subtitulo;
    rowIndex++;

    // Datos del registro
    const datos = [
      { label: 'REF ASLI', value: registro.refAsli },
      { label: 'Cliente', value: registro.shipper },
      { label: 'Booking', value: registro.booking },
      { label: 'Contenedores', value: Array.isArray(registro.contenedor) ? registro.contenedor.join(', ') : registro.contenedor },
      { label: 'Naviera', value: registro.naviera },
      { label: 'Nave', value: registro.naveInicial },
      { label: 'Estado', value: registro.estado },
      { label: 'Ejecutivo', value: registro.ejecutivo }
    ];

    datos.forEach((dato, i) => {
      worksheet.getCell(rowIndex, 1).value = dato.label;
      worksheet.getCell(rowIndex, 1).style = { ...estilos.celda, font: { bold: true } };
      worksheet.getCell(rowIndex, 2).value = dato.value || '-';
      worksheet.getCell(rowIndex, 2).style = estilos.celda;
      worksheet.mergeCells(rowIndex, 2, rowIndex, 8);
      rowIndex++;
    });

    rowIndex++; // Espacio entre registros
  });

  // Ajustar ancho de columnas
  worksheet.columns.forEach(column => {
    column.width = 15;
  });

  return await workbook.xlsx.writeBuffer();
}

// Template: GUÍA DE DESPACHO
export async function generarGuiaDespacho(registros: Registro[]): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Guía de Despacho');
  const estilos = crearEstilos();

  // Título
  worksheet.mergeCells('A1:J1');
  worksheet.getCell('A1').value = 'GUÍA DE DESPACHO';
  worksheet.getCell('A1').style = estilos.titulo;

  // Encabezado de la tabla
  const headers = ['REF ASLI', 'Cliente', 'Contenedor', 'Naviera', 'Nave', 'Origen', 'Destino', 'ETD', 'ETA', 'Estado'];
  headers.forEach((header, index) => {
    const cell = worksheet.getCell(3, index + 1);
    cell.value = header;
    cell.style = estilos.header;
  });

  // Datos
  let rowIndex = 4;
  registros.forEach(registro => {
    const contenedores = Array.isArray(registro.contenedor) 
      ? registro.contenedor 
      : typeof registro.contenedor === 'string' 
        ? registro.contenedor.split(/\s+/).filter(c => c.trim())
        : [registro.contenedor];

    contenedores.forEach(contenedor => {
      worksheet.getCell(rowIndex, 1).value = registro.refAsli;
      worksheet.getCell(rowIndex, 2).value = registro.shipper;
      worksheet.getCell(rowIndex, 3).value = contenedor;
      worksheet.getCell(rowIndex, 4).value = registro.naviera;
      worksheet.getCell(rowIndex, 5).value = registro.naveInicial;
      worksheet.getCell(rowIndex, 6).value = registro.pol;
      worksheet.getCell(rowIndex, 7).value = registro.pod;
      worksheet.getCell(rowIndex, 8).value = registro.etd ? new Date(registro.etd).toLocaleDateString('es-CL') : '-';
      worksheet.getCell(rowIndex, 9).value = registro.eta ? new Date(registro.eta).toLocaleDateString('es-CL') : '-';
      worksheet.getCell(rowIndex, 10).value = registro.estado;

      // Aplicar estilos
      for (let col = 1; col <= 10; col++) {
        worksheet.getCell(rowIndex, col).style = estilos.celda;
      }

      rowIndex++;
    });
  });

  // Ajustar ancho de columnas
  worksheet.columns.forEach(column => {
    column.width = 15;
  });

  return await workbook.xlsx.writeBuffer();
}

// Template: ZARPE
export async function generarZarpe(registros: Registro[]): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Zarpe');
  const estilos = crearEstilos();

  // Título
  worksheet.mergeCells('A1:I1');
  worksheet.getCell('A1').value = 'DOCUMENTO DE ZARPE';
  worksheet.getCell('A1').style = estilos.titulo;

  // Encabezado
  const headers = ['REF ASLI', 'Naviera', 'Nave', 'Contenedores', 'Origen (POL)', 'Destino (POD)', 'ETD', 'Especie', 'Estado'];
  headers.forEach((header, index) => {
    const cell = worksheet.getCell(3, index + 1);
    cell.value = header;
    cell.style = estilos.header;
  });

  // Datos
  let rowIndex = 4;
  registros.forEach(registro => {
    worksheet.getCell(rowIndex, 1).value = registro.refAsli;
    worksheet.getCell(rowIndex, 2).value = registro.naviera;
    worksheet.getCell(rowIndex, 3).value = registro.naveInicial;
    worksheet.getCell(rowIndex, 4).value = Array.isArray(registro.contenedor) 
      ? registro.contenedor.join(', ') 
      : registro.contenedor;
    worksheet.getCell(rowIndex, 5).value = registro.pol;
    worksheet.getCell(rowIndex, 6).value = registro.pod;
    worksheet.getCell(rowIndex, 7).value = registro.etd ? new Date(registro.etd).toLocaleDateString('es-CL') : '-';
    worksheet.getCell(rowIndex, 8).value = registro.especie;
    worksheet.getCell(rowIndex, 9).value = registro.estado;

    for (let col = 1; col <= 9; col++) {
      worksheet.getCell(rowIndex, col).style = estilos.celda;
    }

    rowIndex++;
  });

  worksheet.columns.forEach(column => {
    column.width = 18;
  });

  return await workbook.xlsx.writeBuffer();
}

// Template: ARRIBO
export async function generarArribo(registros: Registro[]): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Arribo');
  const estilos = crearEstilos();

  // Título
  worksheet.mergeCells('A1:I1');
  worksheet.getCell('A1').value = 'DOCUMENTO DE ARRIBO';
  worksheet.getCell('A1').style = { ...estilos.titulo, font: { ...estilos.titulo.font, color: { argb: 'FF059669' } } };

  // Encabezado
  const headers = ['REF ASLI', 'Naviera', 'Nave', 'Contenedores', 'Origen', 'Destino (POD)', 'ETA', 'Especie', 'Estado'];
  headers.forEach((header, index) => {
    const cell = worksheet.getCell(3, index + 1);
    cell.value = header;
    cell.style = {
      ...estilos.header,
      fill: {
        type: 'pattern' as const,
        pattern: 'solid' as const,
        fgColor: { argb: 'FF059669' }
      }
    };
  });

  // Datos
  let rowIndex = 4;
  registros.forEach(registro => {
    worksheet.getCell(rowIndex, 1).value = registro.refAsli;
    worksheet.getCell(rowIndex, 2).value = registro.naviera;
    worksheet.getCell(rowIndex, 3).value = registro.naveInicial;
    worksheet.getCell(rowIndex, 4).value = Array.isArray(registro.contenedor) 
      ? registro.contenedor.join(', ') 
      : registro.contenedor;
    worksheet.getCell(rowIndex, 5).value = registro.pol;
    worksheet.getCell(rowIndex, 6).value = registro.pod;
    worksheet.getCell(rowIndex, 7).value = registro.eta ? new Date(registro.eta).toLocaleDateString('es-CL') : '-';
    worksheet.getCell(rowIndex, 8).value = registro.especie;
    worksheet.getCell(rowIndex, 9).value = registro.estado;

    for (let col = 1; col <= 9; col++) {
      worksheet.getCell(rowIndex, col).style = estilos.celda;
    }

    rowIndex++;
  });

  worksheet.columns.forEach(column => {
    column.width = 18;
  });

  return await workbook.xlsx.writeBuffer();
}

// Template: RESERVA CONFIRMADA
export async function generarReservaConfirmada(registros: Registro[]): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Reserva Confirmada');
  const estilos = crearEstilos();

  // Título
  worksheet.mergeCells('A1:K1');
  worksheet.getCell('A1').value = 'RESERVA CONFIRMADA';
  worksheet.getCell('A1').style = { ...estilos.titulo, font: { ...estilos.titulo.font, color: { argb: 'FF10B981' } } };

  // Encabezado
  const headers = [
    'REF ASLI', 'Cliente', 'Ejecutivo', 'Booking', 'Contenedores', 
    'Naviera', 'Nave', 'Origen', 'Destino', 'ETD', 'Estado'
  ];
  
  headers.forEach((header, index) => {
    const cell = worksheet.getCell(3, index + 1);
    cell.value = header;
    cell.style = {
      ...estilos.header,
      fill: { ...estilos.header.fill, fgColor: { argb: 'FF10B981' } }
    };
  });

  // Datos
  let rowIndex = 4;
  registros.forEach(registro => {
    worksheet.getCell(rowIndex, 1).value = registro.refAsli;
    worksheet.getCell(rowIndex, 2).value = registro.shipper;
    worksheet.getCell(rowIndex, 3).value = registro.ejecutivo;
    worksheet.getCell(rowIndex, 4).value = registro.booking;
    worksheet.getCell(rowIndex, 5).value = Array.isArray(registro.contenedor) 
      ? registro.contenedor.join(', ') 
      : registro.contenedor;
    worksheet.getCell(rowIndex, 6).value = registro.naviera;
    worksheet.getCell(rowIndex, 7).value = registro.naveInicial;
    worksheet.getCell(rowIndex, 8).value = registro.pol;
    worksheet.getCell(rowIndex, 9).value = registro.pod;
    worksheet.getCell(rowIndex, 10).value = registro.etd ? new Date(registro.etd).toLocaleDateString('es-CL') : '-';
    worksheet.getCell(rowIndex, 11).value = registro.estado;

    for (let col = 1; col <= 11; col++) {
      worksheet.getCell(rowIndex, col).style = estilos.celda;
    }

    rowIndex++;
  });

  worksheet.columns.forEach(column => {
    column.width = 15;
  });

  return await workbook.xlsx.writeBuffer();
}

// Función principal para generar reporte según tipo
export async function generarReporte(
  tipo: TipoReporte, 
  registros: Registro[]
): Promise<ExcelJS.Buffer> {
  switch (tipo) {
    case 'factura':
      return await generarFactura(registros);
    case 'guia-despacho':
      return await generarGuiaDespacho(registros);
    case 'zarpe':
      return await generarZarpe(registros);
    case 'arribo':
      return await generarArribo(registros);
    case 'reserva-confirmada':
      return await generarReservaConfirmada(registros);
    default:
      throw new Error(`Tipo de reporte no válido: ${tipo}`);
  }
}

// Función para descargar el archivo
export function descargarExcel(buffer: ExcelJS.Buffer, nombreArchivo: string) {
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${nombreArchivo}-${new Date().toISOString().split('T')[0]}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

