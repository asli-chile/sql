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

// Función helper para calcular el ancho de columna basado en el contenido
const calcularAnchoColumna = (valor: string | number | null | undefined, anchoMinimo: number = 8, anchoMaximo: number = 20): number => {
  if (!valor) return anchoMinimo;
  const texto = String(valor);
  // Aproximación: ~1.2 caracteres por unidad de ancho en Excel
  const anchoCalculado = Math.max(texto.length * 1.1 + 1, anchoMinimo);
  return Math.min(anchoCalculado, anchoMaximo);
};

// Función helper para ajustar automáticamente el ancho de columnas
const ajustarAnchoColumnas = (worksheet: ExcelJS.Worksheet, numColumns: number, startRow: number = 1, endRow?: number) => {
  const maxRow = endRow || worksheet.rowCount || startRow;
  
  for (let col = 1; col <= numColumns; col++) {
    let maxWidth = 8;
    
    for (let row = startRow; row <= maxRow; row++) {
      const cell = worksheet.getCell(row, col);
      if (cell.value !== null && cell.value !== undefined) {
        const cellValue = String(cell.value);
        const width = calcularAnchoColumna(cellValue, 8, 20);
        if (width > maxWidth) {
          maxWidth = width;
        }
      }
    }
    
    const column = worksheet.getColumn(col);
    if (column) {
      column.width = maxWidth;
    }
  }
};

// Función para agregar el logo de ASLI
const agregarLogo = async (workbook: ExcelJS.Workbook, worksheet: ExcelJS.Worksheet, rowIndex: number, colSpan: number) => {
  try {
    // Intentar cargar el logo desde la URL externa (logo blanco)
    const logoUrl = 'https://asli.cl/img/LOGO ASLI SIN FONDO BLLANCO.png';
    const response = await fetch(logoUrl);
    
    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      
      // Convertir ArrayBuffer a Buffer
      // En Node.js tenemos Buffer disponible, en el navegador debemos crearlo
      let buffer: Buffer;
      if (typeof Buffer !== 'undefined' && typeof Buffer.from === 'function') {
        // Entorno Node.js - usar Buffer nativo
        buffer = Buffer.from(arrayBuffer);
      } else {
        // Entorno navegador - convertir Uint8Array a Buffer-like
        // ExcelJS internamente maneja esto, pero necesitamos el tipo correcto
        const uint8Array = new Uint8Array(arrayBuffer);
        // En el navegador, ExcelJS puede trabajar con Uint8Array en algunas versiones
        // Si no funciona, simplemente no agregamos el logo
        // @ts-expect-error - ExcelJS puede aceptar Uint8Array pero TypeScript espera Buffer
        buffer = uint8Array;
      }
      
      try {
        const imageId = workbook.addImage({
          // @ts-expect-error - ExcelJS puede aceptar Uint8Array en runtime pero TypeScript espera Buffer
          buffer: buffer as Buffer,
          extension: 'png',
        });
        
        // Centrar el logo calculando la columna media
        const startCol = Math.max(0, Math.floor((colSpan - 2) / 2));
        
        // Agregar la imagen
        worksheet.addImage(imageId, {
          tl: { col: startCol, row: rowIndex },
          ext: { width: 150, height: 60 },
        });
        
        return true;
      } catch (imageError) {
        // Si hay error agregando la imagen, simplemente continuar sin logo
        console.warn('Error al agregar imagen al Excel (continuando sin logo):', imageError);
        return false;
      }
    }
  } catch (error) {
    // Si hay error cargando el logo, simplemente continuar sin logo
    console.warn('No se pudo cargar el logo (continuando sin logo):', error);
  }
  return false;
};

// Función para agregar pie de página
const agregarPieDePagina = (worksheet: ExcelJS.Worksheet, rowIndex: number, colSpan: number) => {
  // Dejar una fila en blanco antes del footer
  rowIndex++;
  
  worksheet.mergeCells(rowIndex, 1, rowIndex, colSpan);
  const pieCell = worksheet.getCell(rowIndex, 1);
  pieCell.value = 'Asesorías y Servicios Logísticos Integrales Ltda.';
  pieCell.style = {
    font: { size: 10, italic: true },
    alignment: { horizontal: 'center' as const, vertical: 'middle' as const }
  };
};

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
      },
      alignment: { horizontal: 'center' as const, vertical: 'middle' as const }
    },
    celda: {
      border: {
        top: { style: 'thin' as const, color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin' as const, color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin' as const, color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin' as const, color: { argb: 'FFE5E7EB' } }
      },
      alignment: { horizontal: 'center' as const, vertical: 'middle' as const }
    },
    total: {
      font: { bold: true, size: 12 },
      fill: {
        type: 'pattern' as const,
        pattern: 'solid' as const,
        fgColor: { argb: 'FFE0E7FF' }
      },
      alignment: { horizontal: 'center' as const, vertical: 'middle' as const }
    }
  };
};

// Template: FACTURA
export async function generarFactura(registros: Registro[]): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Factura');
  const estilos = crearEstilos();
  const colSpan = 8;

  // Dejar dos filas vacías al inicio (filas 1 y 2)
  
  // Logo en la fila 3 (rowIndex 2)
  await agregarLogo(workbook, worksheet, 2, colSpan);
  
  // Título en la fila 4
  worksheet.mergeCells('A4:H4');
  const tituloCell = worksheet.getCell('A4');
  tituloCell.value = 'FACTURA COMERCIAL';
  tituloCell.style = estilos.titulo;

  // Datos de cada registro empezando en la fila 6
  let rowIndex = 6;
  
  registros.forEach((registro, index) => {
    // Encabezado del registro
    worksheet.mergeCells(rowIndex, 1, rowIndex, colSpan);
    const subtituloCell = worksheet.getCell(rowIndex, 1);
    subtituloCell.value = `Registro ${index + 1}: ${registro.refAsli}`;
    subtituloCell.style = estilos.subtitulo;
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

    datos.forEach((dato) => {
      const labelCell = worksheet.getCell(rowIndex, 1);
      labelCell.value = dato.label;
      labelCell.style = {
        ...estilos.celda,
        font: { bold: true, size: 11 }
      };
      
      const valueCell = worksheet.getCell(rowIndex, 2);
      valueCell.value = dato.value || '-';
      valueCell.style = {
        ...estilos.celda,
        alignment: { horizontal: 'center' as const, vertical: 'middle' as const }
      };
      worksheet.mergeCells(rowIndex, 2, rowIndex, colSpan);
      rowIndex++;
    });

    rowIndex++; // Espacio entre registros
  });

  // Pie de página
  agregarPieDePagina(worksheet, rowIndex, colSpan);

  // Ajustar ancho de columnas automáticamente
  ajustarAnchoColumnas(worksheet, colSpan, 1, rowIndex);

  return await workbook.xlsx.writeBuffer();
}

// Template: GUÍA DE DESPACHO
export async function generarGuiaDespacho(registros: Registro[]): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Guía de Despacho');
  const estilos = crearEstilos();
  const colSpan = 10;

  // Dejar dos filas vacías al inicio (filas 1 y 2)
  
  // Logo en la fila 3 (rowIndex 2)
  await agregarLogo(workbook, worksheet, 2, colSpan);

  // Título en la fila 4
  worksheet.mergeCells('A4:J4');
  const tituloCell = worksheet.getCell('A4');
  tituloCell.value = 'GUÍA DE DESPACHO';
  tituloCell.style = estilos.titulo;

  // Encabezado de la tabla en la fila 5
  const headers = ['REF ASLI', 'Cliente', 'Contenedor', 'Naviera', 'Nave', 'Origen', 'Destino', 'ETD', 'ETA', 'Estado'];
  headers.forEach((header, index) => {
    const cell = worksheet.getCell(5, index + 1);
    cell.value = header;
    cell.style = estilos.header;
  });

  // Datos empezando en la fila 6
  let rowIndex = 6;
  registros.forEach(registro => {
    const contenedores = Array.isArray(registro.contenedor) 
      ? registro.contenedor 
      : typeof registro.contenedor === 'string' 
        ? registro.contenedor.split(/\s+/).filter(c => c.trim())
        : [registro.contenedor];

    contenedores.forEach(contenedor => {
      const row = worksheet.getRow(rowIndex);
      
      row.getCell(1).value = registro.refAsli;
      row.getCell(2).value = registro.shipper;
      row.getCell(3).value = contenedor;
      row.getCell(4).value = registro.naviera;
      row.getCell(5).value = registro.naveInicial;
      row.getCell(6).value = registro.pol;
      row.getCell(7).value = registro.pod;
      row.getCell(8).value = registro.etd ? new Date(registro.etd).toLocaleDateString('es-CL') : '-';
      row.getCell(9).value = registro.eta ? new Date(registro.eta).toLocaleDateString('es-CL') : '-';
      row.getCell(10).value = registro.estado;

      // Aplicar estilos centrados a todas las celdas
      for (let col = 1; col <= colSpan; col++) {
        const cell = row.getCell(col);
        cell.style = estilos.celda;
      }

      rowIndex++;
    });
  });

  // Pie de página
  agregarPieDePagina(worksheet, rowIndex, colSpan);

  // Ajustar ancho de columnas automáticamente
  ajustarAnchoColumnas(worksheet, colSpan, 1, rowIndex);

  return await workbook.xlsx.writeBuffer();
}

// Template: ZARPE
export async function generarZarpe(registros: Registro[]): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Zarpe');
  const estilos = crearEstilos();
  const colSpan = 9;

  // Dejar dos filas vacías al inicio (filas 1 y 2)
  
  // Logo en la fila 3 (rowIndex 2)
  await agregarLogo(workbook, worksheet, 2, colSpan);

  // Título en la fila 4
  worksheet.mergeCells('A4:I4');
  const tituloCell = worksheet.getCell('A4');
  tituloCell.value = 'DOCUMENTO DE ZARPE';
  tituloCell.style = estilos.titulo;

  // Encabezado en la fila 5
  const headers = ['REF ASLI', 'Naviera', 'Nave', 'Contenedores', 'Origen (POL)', 'Destino (POD)', 'ETD', 'Especie', 'Estado'];
  headers.forEach((header, index) => {
    const cell = worksheet.getCell(5, index + 1);
    cell.value = header;
    cell.style = estilos.header;
  });

  // Datos empezando en la fila 6
  let rowIndex = 6;
  registros.forEach(registro => {
    const row = worksheet.getRow(rowIndex);
    
    row.getCell(1).value = registro.refAsli;
    row.getCell(2).value = registro.naviera;
    row.getCell(3).value = registro.naveInicial;
    row.getCell(4).value = Array.isArray(registro.contenedor) 
      ? registro.contenedor.join(', ') 
      : registro.contenedor;
    row.getCell(5).value = registro.pol;
    row.getCell(6).value = registro.pod;
    row.getCell(7).value = registro.etd ? new Date(registro.etd).toLocaleDateString('es-CL') : '-';
    row.getCell(8).value = registro.especie;
    row.getCell(9).value = registro.estado;

    for (let col = 1; col <= colSpan; col++) {
      const cell = row.getCell(col);
      cell.style = estilos.celda;
    }

    rowIndex++;
  });

  // Pie de página
  agregarPieDePagina(worksheet, rowIndex, colSpan);

  // Ajustar ancho de columnas automáticamente
  ajustarAnchoColumnas(worksheet, colSpan, 1, rowIndex);

  return await workbook.xlsx.writeBuffer();
}

// Template: ARRIBO
export async function generarArribo(registros: Registro[]): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Arribo');
  const estilos = crearEstilos();
  const colSpan = 9;

  // Dejar dos filas vacías al inicio (filas 1 y 2)
  
  // Logo en la fila 3 (rowIndex 2)
  await agregarLogo(workbook, worksheet, 2, colSpan);

  // Título en la fila 4
  worksheet.mergeCells('A4:I4');
  const tituloCell = worksheet.getCell('A4');
  tituloCell.value = 'DOCUMENTO DE ARRIBO';
  tituloCell.style = { ...estilos.titulo, font: { ...estilos.titulo.font, color: { argb: 'FF059669' } } };

  // Encabezado en la fila 5
  const headers = ['REF ASLI', 'Naviera', 'Nave', 'Contenedores', 'Origen', 'Destino (POD)', 'ETA', 'Especie', 'Estado'];
  headers.forEach((header, index) => {
    const cell = worksheet.getCell(5, index + 1);
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

  // Datos empezando en la fila 6
  let rowIndex = 6;
  registros.forEach(registro => {
    const row = worksheet.getRow(rowIndex);
    
    row.getCell(1).value = registro.refAsli;
    row.getCell(2).value = registro.naviera;
    row.getCell(3).value = registro.naveInicial;
    row.getCell(4).value = Array.isArray(registro.contenedor) 
      ? registro.contenedor.join(', ') 
      : registro.contenedor;
    row.getCell(5).value = registro.pol;
    row.getCell(6).value = registro.pod;
    row.getCell(7).value = registro.eta ? new Date(registro.eta).toLocaleDateString('es-CL') : '-';
    row.getCell(8).value = registro.especie;
    row.getCell(9).value = registro.estado;

    for (let col = 1; col <= colSpan; col++) {
      const cell = row.getCell(col);
      cell.style = estilos.celda;
    }

    rowIndex++;
  });

  // Pie de página
  agregarPieDePagina(worksheet, rowIndex, colSpan);

  // Ajustar ancho de columnas automáticamente
  ajustarAnchoColumnas(worksheet, colSpan, 1, rowIndex);

  return await workbook.xlsx.writeBuffer();
}

// Template: RESERVA CONFIRMADA
export async function generarReservaConfirmada(registros: Registro[]): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Reserva Confirmada');
  const estilos = crearEstilos();
  const colSpan = 11;

  // Dejar dos filas vacías al inicio (filas 1 y 2)
  
  // Logo en la fila 3 (rowIndex 2)
  await agregarLogo(workbook, worksheet, 2, colSpan);

  // Título en la fila 4
  worksheet.mergeCells('A4:K4');
  const tituloCell = worksheet.getCell('A4');
  tituloCell.value = 'RESERVA CONFIRMADA';
  tituloCell.style = { ...estilos.titulo, font: { ...estilos.titulo.font, color: { argb: 'FF10B981' } } };

  // Encabezado en la fila 5
  const headers = [
    'REF ASLI', 'Cliente', 'Ejecutivo', 'Booking', 'Contenedores', 
    'Naviera', 'Nave', 'Origen', 'Destino', 'ETD', 'Estado'
  ];
  
  headers.forEach((header, index) => {
    const cell = worksheet.getCell(5, index + 1);
    cell.value = header;
    cell.style = {
      ...estilos.header,
      fill: {
        type: 'pattern' as const,
        pattern: 'solid' as const,
        fgColor: { argb: 'FF10B981' }
      }
    };
  });

  // Datos empezando en la fila 6
  let rowIndex = 6;
  registros.forEach(registro => {
    const row = worksheet.getRow(rowIndex);
    
    row.getCell(1).value = registro.refAsli;
    row.getCell(2).value = registro.shipper;
    row.getCell(3).value = registro.ejecutivo;
    row.getCell(4).value = registro.booking;
    row.getCell(5).value = Array.isArray(registro.contenedor) 
      ? registro.contenedor.join(', ') 
      : registro.contenedor;
    row.getCell(6).value = registro.naviera;
    row.getCell(7).value = registro.naveInicial;
    row.getCell(8).value = registro.pol;
    row.getCell(9).value = registro.pod;
    row.getCell(10).value = registro.etd ? new Date(registro.etd).toLocaleDateString('es-CL') : '-';
    row.getCell(11).value = registro.estado;

    for (let col = 1; col <= colSpan; col++) {
      const cell = row.getCell(col);
      cell.style = estilos.celda;
    }

    rowIndex++;
  });

  // Pie de página
  agregarPieDePagina(worksheet, rowIndex, colSpan);

  // Ajustar ancho de columnas automáticamente
  ajustarAnchoColumnas(worksheet, colSpan, 1, rowIndex);

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
