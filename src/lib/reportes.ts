import ExcelJS from 'exceljs';
import { Registro } from '@/types/registros';

// URL del logo de ASLI
const LOGO_URL = '/logoasli.png';

// Tipos de reportes disponibles
export type TipoReporte = 
  | 'reserva-confirmada' 
  | 'zarpe' 
  | 'arribo'
  | 'gate-out';

export interface OpcionReporte {
  id: TipoReporte;
  nombre: string;
  descripcion: string;
  icono: string;
}

export const tiposReportes: OpcionReporte[] = [
  {
    id: 'reserva-confirmada',
    nombre: 'Reserva Confirmada',
    descripcion: 'Confirmación de reserva de contenedores con todos los datos',
    icono: '✅'
  },
  {
    id: 'zarpe',
    nombre: 'Informe de Zarpe',
    descripcion: 'Informe de zarpe del barco',
    icono: '🚢'
  },
  {
    id: 'arribo',
    nombre: 'Informe de Arribo',
    descripcion: 'Informe de arribo del barco',
    icono: '⚓'
  },
  {
    id: 'gate-out',
    nombre: 'Gate Out',
    descripcion: 'Registro de salida de contenedores del depósito',
    icono: '📤'
  }
];

// Función helper para cargar imagen
async function cargarImagen(url: string): Promise<ExcelJS.Image> {
  try {
    let imageUrl = url;
    if (url.startsWith('/')) {
      if (typeof window !== 'undefined') {
        imageUrl = `${window.location.origin}${url}`;
      }
    }
    
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Error al cargar imagen: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    
    let buffer: Buffer | Uint8Array;
    if (typeof Buffer !== 'undefined') {
      buffer = Buffer.from(arrayBuffer);
    } else {
      buffer = new Uint8Array(arrayBuffer);
    }
    
    return {
      buffer: buffer as any,
      extension: 'png',
    };
  } catch (error) {
    console.error('Error al cargar imagen:', error);
    const emptyBuffer = typeof Buffer !== 'undefined' ? Buffer.alloc(0) : new Uint8Array(0);
    return {
      buffer: emptyBuffer as any,
      extension: 'png',
    };
  }
}

// Función para generar el contenido del correo como tabla HTML (igual que Excel) - DESHABILITADA
function generarContenidoEmail_DESHABILITADA(tipo: TipoReporte, registros: Registro[]): string {
  // Determinar qué columnas incluir según el tipo
  let headers: string[] = [];
  const colorHeader = tipo === 'reserva-confirmada' ? '#10B981' : tipo === 'zarpe' ? '#1e3a8a' : '#059669';
  
  if (tipo === 'reserva-confirmada') {
    headers = [
      'REF ASLI', 'Cliente', 'Naviera', 'Nave', 
      'POL', 'POD', 'ETD', 'ETA', 'TT', 'Especie', 'T°', 'CBM', 
      'Flete', 'Depósito'
    ];
    
    const tieneCo2 = registros.some(r => r.co2 !== null && r.co2 !== undefined);
    const tieneO2 = registros.some(r => r.o2 !== null && r.o2 !== undefined);
    if (tieneCo2) headers.push('CO2');
    if (tieneO2) headers.push('O2');
  } else {
    headers = [
      'REF ASLI', 'Cliente', 'Naviera', 'Nave', 'Booking', 'Contenedor',
      'POL', 'POD', 'ETD', 'ETA', 'TT', 'Especie', 'T°', 'CBM',
      'Flete', 'Depósito'
    ];
  }

  // Generar tabla HTML con estilos iguales al Excel (formato compatible con Gmail)
  // Gmail requiere HTML más simple y estilos inline
  let tablaHTML = `<div style="font-family:Arial,sans-serif"><table border="1" cellpadding="5" cellspacing="0" style="border-collapse:collapse;width:100%;border:1px solid #000"><thead><tr style="background-color:${colorHeader};color:#FFFFFF">`;
  
  headers.forEach(header => {
    tablaHTML += `<th style="padding:8px;text-align:center;border:1px solid #000;font-weight:bold;font-size:12px">${header}</th>`;
  });
  
  tablaHTML += `</tr></thead><tbody>`;

  registros.forEach(registro => {
    tablaHTML += '<tr>';
    
    // Función helper para generar celdas con estilo consistente
    const generarCelda = (valor: string) => {
      return `<td style="padding:5px;text-align:center;border-top:2px solid #9CA3AF;border-bottom:2px solid #9CA3AF;border-left:1px solid #D1D5DB;border-right:1px solid #D1D5DB">${valor}</td>`;
    };
    
    // REF ASLI
    tablaHTML += generarCelda(registro.refAsli || '-');
    
    // Cliente
    tablaHTML += generarCelda(registro.shipper || '-');
    
    // Naviera
    tablaHTML += generarCelda(registro.naviera || '-');
    
    // Nave
    tablaHTML += generarCelda(registro.naveInicial || '-');
    
    // Si es zarpe o arribo, agregar Booking y Contenedor
    if (tipo !== 'reserva-confirmada') {
      tablaHTML += generarCelda(registro.booking || '-');
      const contenedor = Array.isArray(registro.contenedor) 
        ? registro.contenedor.join(', ') 
        : registro.contenedor || '-';
      tablaHTML += generarCelda(contenedor);
    }
    
    // POL
    tablaHTML += generarCelda(registro.pol || '-');
    
    // POD
    tablaHTML += generarCelda(registro.pod || '-');
    
    // ETD
    const etd = registro.etd 
      ? (registro.etd instanceof Date ? registro.etd.toLocaleDateString('es-CL') : new Date(registro.etd).toLocaleDateString('es-CL'))
      : '-';
    tablaHTML += generarCelda(etd);
    
    // ETA
    const eta = registro.eta 
      ? (registro.eta instanceof Date ? registro.eta.toLocaleDateString('es-CL') : new Date(registro.eta).toLocaleDateString('es-CL'))
      : '-';
    tablaHTML += generarCelda(eta);
    
    // TT
    let tt = '-';
    if (registro.etd && registro.eta) {
      try {
        const fechaEtd = registro.etd instanceof Date ? registro.etd : new Date(registro.etd);
        const fechaEta = registro.eta instanceof Date ? registro.eta : new Date(registro.eta);
        const diffTime = fechaEta.getTime() - fechaEtd.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        tt = diffDays >= 0 ? diffDays.toString() : '-';
      } catch {
        tt = '-';
      }
    }
    tablaHTML += generarCelda(tt);
    
    // Especie
    tablaHTML += generarCelda(registro.especie || '-');
    
    // T°
    tablaHTML += generarCelda(registro.temperatura !== null && registro.temperatura !== undefined ? registro.temperatura.toString() : '-');
    
    // CBM
    tablaHTML += generarCelda(registro.cbm !== null && registro.cbm !== undefined ? registro.cbm.toString() : '-');
    
    // Flete
    tablaHTML += generarCelda(registro.flete || '-');
    
    // Depósito
    tablaHTML += generarCelda(registro.deposito || '-');
    
    // CO2 y O2 solo para reserva confirmada si existen
    if (tipo === 'reserva-confirmada') {
      const tieneCo2 = registros.some(r => r.co2 !== null && r.co2 !== undefined);
      const tieneO2 = registros.some(r => r.o2 !== null && r.o2 !== undefined);
      if (tieneCo2) {
        tablaHTML += generarCelda(registro.co2 !== null && registro.co2 !== undefined ? registro.co2.toString() : '-');
      }
      if (tieneO2) {
        tablaHTML += generarCelda(registro.o2 !== null && registro.o2 !== undefined ? registro.o2.toString() : '-');
      }
    }
    
    tablaHTML += '</tr>';
  });

  tablaHTML += `</tbody></table><br><p style="font-family:Arial,sans-serif;font-weight:bold;text-align:center;margin-top:15px">Asesorías y Servicios Logísticos Integrales</p></div>`;

  return tablaHTML;
}

// Función para generar el asunto del correo - DESHABILITADA
function generarAsuntoEmail_DESHABILITADA(tipo: TipoReporte, registros: Registro[]): string {
  if (registros.length === 0) {
    const tipoNombre = tiposReportes.find(r => r.id === tipo)?.nombre || 'REPORTE';
    return `ASLI ${tipoNombre.toUpperCase()}`;
  }

  const primerRegistro = registros[0];
  const nave = primerRegistro.naveInicial || 'N/A';
  
  // Determinar semana según el tipo de reporte
  let semana: string = 'N/A';
  if (tipo === 'zarpe' && primerRegistro.semanaZarpe) {
    semana = `SEMANA ${primerRegistro.semanaZarpe}`;
  } else if (tipo === 'arribo' && primerRegistro.semanaArribo) {
    semana = `SEMANA ${primerRegistro.semanaArribo}`;
  } else if (tipo === 'reserva-confirmada' && primerRegistro.semanaIngreso) {
    semana = `SEMANA ${primerRegistro.semanaIngreso}`;
  } else {
    // Si no hay semana, intentar calcularla desde ETD
    if (primerRegistro.etd) {
      try {
        const fecha = primerRegistro.etd instanceof Date ? primerRegistro.etd : new Date(primerRegistro.etd);
        const inicioAno = new Date(fecha.getFullYear(), 0, 1);
        const dias = Math.floor((fecha.getTime() - inicioAno.getTime()) / (24 * 60 * 60 * 1000));
        const semanaNum = Math.ceil((dias + inicioAno.getDay() + 1) / 7);
        semana = `SEMANA ${semanaNum}`;
      } catch {
        semana = 'SEMANA N/A';
      }
    }
  }
  
  const pol = primerRegistro.pol || 'N/A';
  const pod = primerRegistro.pod || 'N/A';
  
  const tipoNombre = tiposReportes.find(r => r.id === tipo)?.nombre || 'REPORTE';
  const tipoUpper = tipoNombre.toUpperCase().replace('INFORME DE ', 'INFORME ');
  
  return `ASLI ${tipoUpper} // ${nave} // ${semana} // ${pol} // ${pod}`;
}

// Funciones de correo deshabilitadas temporalmente
// Función para copiar al portapapeles - DESHABILITADA
// async function copiarAlPortapapeles_DESHABILITADA(texto: string): Promise<boolean> { ... }

// Función para abrir Gmail con el correo pre-escrito - DESHABILITADA
// export async function abrirGmailConCorreo_DESHABILITADA(tipo: TipoReporte, registros: Registro[]): Promise<boolean> { ... }

// Función para descargar el archivo Excel
export function descargarExcel(buffer: ExcelJS.Buffer, nombreArchivo: string) {
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  
  // Generar nombre con fecha y hora
  const ahora = new Date();
  const fecha = ahora.toISOString().split('T')[0].replace(/-/g, '');
  const hora = ahora.toTimeString().split(' ')[0].replace(/:/g, '');
  
  link.download = `${fecha}_${hora}.xlsx`;
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

// Función principal para generar reporte según tipo
export async function generarReporte(
  tipo: TipoReporte, 
  registros: Registro[]
): Promise<ExcelJS.Buffer> {
  switch (tipo) {
    case 'reserva-confirmada':
      return await generarReservaConfirmada(registros);
    case 'zarpe':
      return await generarZarpe(registros);
    case 'arribo':
      return await generarArribo(registros);
    default:
      throw new Error(`Tipo de reporte no válido: ${tipo}`);
  }
}

// Helper para obtener letra de columna
const getColumnLetter = (colNum: number): string => {
  let result = '';
  while (colNum > 0) {
    colNum--;
    result = String.fromCharCode(65 + (colNum % 26)) + result;
    colNum = Math.floor(colNum / 26);
  }
  return result;
};

// Template: RESERVA CONFIRMADA
async function generarReservaConfirmada(registros: Registro[]): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Reserva Confirmada');

  // Headers base - sin Usuario, Ejecutivo, Contrato. CO2 y O2 se agregan dinámicamente si hay datos
  const headers = [
    'REF ASLI', 'Cliente', 'Booking', 'Naviera', 'Nave', 
    'POL', 'POD', 'ETD', 'ETA', 'TT', 'Especie', 'T°', 'CBM', 
    'Flete', 'Depósito'
  ];
  
  // Verificar si hay registros con CO2 u O2 para incluir esas columnas
  const tieneCo2 = registros.some(r => r.co2 !== null && r.co2 !== undefined);
  const tieneO2 = registros.some(r => r.o2 !== null && r.o2 !== undefined);
  
  // Agregar columnas CO2 y O2 solo si hay datos
  let headersFinales = [...headers];
  let columnaCo2 = -1;
  let columnaO2 = -1;
  
  if (tieneCo2) {
    columnaCo2 = headersFinales.length + 1;
    headersFinales.push('CO2');
  }
  if (tieneO2) {
    columnaO2 = headersFinales.length + 1;
    headersFinales.push('O2');
  }
  
  const colSpan = headersFinales.length;

  // Estilos
  const headerStyle = {
    font: { bold: true, size: 12, color: { argb: 'FFFFFFFF' } },
    fill: {
      type: 'pattern' as const,
      pattern: 'solid' as const,
      fgColor: { argb: 'FF10B981' }
    },
    alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
    border: {
      top: { style: 'thick' as const, color: { argb: 'FF000000' } },
      left: { style: 'thin' as const, color: { argb: 'FF000000' } },
      bottom: { style: 'thick' as const, color: { argb: 'FF000000' } },
      right: { style: 'thin' as const, color: { argb: 'FF000000' } }
    }
  };

  const cellStyle = {
    alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
    border: {
      top: { style: 'medium' as const, color: { argb: 'FF9CA3AF' } },
      left: { style: 'thin' as const, color: { argb: 'FFD1D5DB' } },
      bottom: { style: 'medium' as const, color: { argb: 'FF9CA3AF' } },
      right: { style: 'thin' as const, color: { argb: 'FFD1D5DB' } }
    }
  };

  // Logo en la fila 1 - intentar agregar después de crear todo
  worksheet.getRow(1).height = 60;
  
  // Título en la fila 2
  worksheet.mergeCells(`A2:${getColumnLetter(colSpan)}2`);
  const tituloCell = worksheet.getCell('A2');
  tituloCell.value = 'RESERVA CONFIRMADA';
  tituloCell.style = {
    font: { bold: true, size: 16, color: { argb: 'FF10B981' } },
    alignment: { horizontal: 'center' as const, vertical: 'middle' as const }
  };
  worksheet.getRow(2).height = 30;

  // Headers en la fila 3
  headersFinales.forEach((header, index) => {
    const cell = worksheet.getCell(3, index + 1);
    cell.value = header;
    cell.style = headerStyle;
  });
  worksheet.getRow(3).height = 25;

  // Datos
  let rowIndex = 4;
  registros.forEach(registro => {
    const row = worksheet.getRow(rowIndex);
    
    row.getCell(1).value = registro.refAsli || '-';
    row.getCell(2).value = registro.shipper || '-';
    row.getCell(3).value = registro.booking || '-';
    row.getCell(4).value = registro.naviera || '-';
    row.getCell(5).value = registro.naveInicial || '-';
    row.getCell(6).value = registro.pol || '-';
    row.getCell(7).value = registro.pod || '-';
    row.getCell(8).value = registro.etd 
      ? (registro.etd instanceof Date ? registro.etd.toLocaleDateString('es-CL') : new Date(registro.etd).toLocaleDateString('es-CL'))
      : '-';
    row.getCell(9).value = registro.eta 
      ? (registro.eta instanceof Date ? registro.eta.toLocaleDateString('es-CL') : new Date(registro.eta).toLocaleDateString('es-CL'))
      : '-';
    
    // TT
    let tt = '-';
    if (registro.etd && registro.eta) {
      try {
        const fechaEtd = registro.etd instanceof Date ? registro.etd : new Date(registro.etd);
        const fechaEta = registro.eta instanceof Date ? registro.eta : new Date(registro.eta);
        const diffTime = fechaEta.getTime() - fechaEtd.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        tt = diffDays >= 0 ? diffDays.toString() : '-';
      } catch {
        tt = '-';
      }
    }
    row.getCell(10).value = tt;
    
    row.getCell(11).value = registro.especie || '-';
    row.getCell(12).value = registro.temperatura !== null && registro.temperatura !== undefined ? registro.temperatura : '-';
    row.getCell(13).value = registro.cbm !== null && registro.cbm !== undefined ? registro.cbm : '-';
    row.getCell(14).value = registro.flete || '-';
    row.getCell(15).value = registro.deposito || '-';
    
    // Agregar CO2 y O2 solo si existen columnas para ellos
    if (columnaCo2 > 0) {
      row.getCell(columnaCo2).value = registro.co2 !== null && registro.co2 !== undefined ? registro.co2 : '-';
    }
    if (columnaO2 > 0) {
      row.getCell(columnaO2).value = registro.o2 !== null && registro.o2 !== undefined ? registro.o2 : '-';
    }

    // Aplicar estilos
    const totalColumnas = headersFinales.length;
    for (let col = 1; col <= totalColumnas; col++) {
      const cell = row.getCell(col);
      cell.style = cellStyle;
    }

    rowIndex++;
  });

  // Fila vacía después de los datos
  const filaVacia = rowIndex;
  worksheet.getRow(filaVacia).height = 20;

  // Footer con texto "Asesorías y Servicios Logísticos Integrales"
  const filaFooter = rowIndex + 1;
  worksheet.mergeCells(`A${filaFooter}:${getColumnLetter(colSpan)}${filaFooter}`);
  const footerCell = worksheet.getCell(`A${filaFooter}`);
  footerCell.value = 'Asesorías y Servicios Logísticos Integrales';
  footerCell.style = {
    font: { bold: true, size: 12 },
    alignment: { horizontal: 'center' as const, vertical: 'middle' as const }
  };
  worksheet.getRow(filaFooter).height = 25;

  // Aplicar borde externo delgado a todo el contenido (desde fila 2 hasta footer)
  // Bordes superiores e inferiores
  for (let col = 1; col <= colSpan; col++) {
    const colLetter = getColumnLetter(col);
    // Borde superior (fila 2)
    const topCell = worksheet.getCell(`${colLetter}2`);
    if (!topCell.style.border) topCell.style.border = {};
    topCell.style.border.top = { style: 'thin' as const, color: { argb: 'FF000000' } };
    
    // Borde inferior (fila footer)
    const bottomCell = worksheet.getCell(`${colLetter}${filaFooter}`);
    if (!bottomCell.style.border) bottomCell.style.border = {};
    bottomCell.style.border.bottom = { style: 'thin' as const, color: { argb: 'FF000000' } };
  }
  
  // Bordes laterales (primera y última columna)
  for (let row = 2; row <= filaFooter; row++) {
    // Borde izquierdo (columna A)
    const leftCell = worksheet.getCell(row, 1);
    if (!leftCell.style.border) leftCell.style.border = {};
    leftCell.style.border.left = { style: 'thin' as const, color: { argb: 'FF000000' } };
    
    // Borde derecho (última columna)
    const rightCell = worksheet.getCell(row, colSpan);
    if (!rightCell.style.border) rightCell.style.border = {};
    rightCell.style.border.right = { style: 'thin' as const, color: { argb: 'FF000000' } };
  }

  // Ajustar ancho de columnas
  for (let i = 1; i <= colSpan; i++) {
    const colLetter = getColumnLetter(i);
    const column = worksheet.getColumn(i);
    column.width = i === 1 ? 12 : i === 4 ? 18 : 15;
  }

  // Logo deshabilitado temporalmente - al copiar y pegar en correo aparece como cuadro blanco
  // Si necesitas el logo, puedes agregarlo manualmente en el correo o usar el Excel como adjunto
  // Intentar agregar logo al final (sin que rompa el workbook) - centrado
  // try {
  //   const logo = await cargarImagen(LOGO_URL);
  //   if (logo && logo.buffer) {
  //     const buffer = logo.buffer as any;
  //     if (buffer && (buffer.length > 0 || (buffer.byteLength && buffer.byteLength > 0))) {
  //       const imageId = workbook.addImage(logo);
  //       // Calcular posición central: el logo ocupa aproximadamente 2 columnas (150px / ~75px por columna)
  //       // Columna central menos 1 columna para centrar
  //       const columnaCentral = Math.max(0, Math.floor(colSpan / 2) - 1);
  //       worksheet.addImage(imageId, {
  //         tl: { col: columnaCentral, row: 0 },
  //         ext: { width: 150, height: 60 },
  //       });
  //     }
  //   }
  // } catch (error) {
  //   console.warn('Logo no se pudo agregar (no crítico):', error);
  // }

  return await workbook.xlsx.writeBuffer();
}

// Template: INFORME DE ZARPE
async function generarZarpe(registros: Registro[]): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Informe de Zarpe');

  // Headers
  const headers = [
    'REF ASLI', 'Cliente', 'Naviera', 'Nave', 'Booking', 'Contenedor',
    'POL', 'POD', 'ETD', 'ETA', 'TT', 'Especie', 'T°', 'CBM',
    'Flete', 'Depósito'
  ];
  
  const colSpan = headers.length;

  // Estilos
  const headerStyle = {
    font: { bold: true, size: 12, color: { argb: 'FFFFFFFF' } },
    fill: {
      type: 'pattern' as const,
      pattern: 'solid' as const,
      fgColor: { argb: 'FF1e3a8a' }
    },
    alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
    border: {
      top: { style: 'thick' as const, color: { argb: 'FF000000' } },
      left: { style: 'thin' as const, color: { argb: 'FF000000' } },
      bottom: { style: 'thick' as const, color: { argb: 'FF000000' } },
      right: { style: 'thin' as const, color: { argb: 'FF000000' } }
    }
  };

  const cellStyle = {
    alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
    border: {
      top: { style: 'medium' as const, color: { argb: 'FF9CA3AF' } },
      left: { style: 'thin' as const, color: { argb: 'FFD1D5DB' } },
      bottom: { style: 'medium' as const, color: { argb: 'FF9CA3AF' } },
      right: { style: 'thin' as const, color: { argb: 'FFD1D5DB' } }
    }
  };

  // Logo en la fila 1
  worksheet.getRow(1).height = 60;

  // Título en la fila 2
  worksheet.mergeCells(`A2:${getColumnLetter(colSpan)}2`);
  const tituloCell = worksheet.getCell('A2');
  tituloCell.value = 'INFORME DE ZARPE';
  tituloCell.style = {
    font: { bold: true, size: 16, color: { argb: 'FF1e3a8a' } },
    alignment: { horizontal: 'center' as const, vertical: 'middle' as const }
  };
  worksheet.getRow(2).height = 30;

  // Headers en la fila 3
  headers.forEach((header, index) => {
    const cell = worksheet.getCell(3, index + 1);
    cell.value = header;
    cell.style = headerStyle;
  });
  worksheet.getRow(3).height = 25;

  // Datos
  let rowIndex = 4;
  registros.forEach(registro => {
    const row = worksheet.getRow(rowIndex);
    
    row.getCell(1).value = registro.refAsli || '-';
    row.getCell(2).value = registro.shipper || '-';
    row.getCell(3).value = registro.naviera || '-';
    row.getCell(4).value = registro.naveInicial || '-';
    row.getCell(5).value = registro.booking || '-';
    row.getCell(6).value = Array.isArray(registro.contenedor) 
      ? registro.contenedor.join(', ') 
      : registro.contenedor || '-';
    row.getCell(7).value = registro.pol || '-';
    row.getCell(8).value = registro.pod || '-';
    row.getCell(9).value = registro.etd 
      ? (registro.etd instanceof Date ? registro.etd.toLocaleDateString('es-CL') : new Date(registro.etd).toLocaleDateString('es-CL'))
      : '-';
    row.getCell(10).value = registro.eta 
      ? (registro.eta instanceof Date ? registro.eta.toLocaleDateString('es-CL') : new Date(registro.eta).toLocaleDateString('es-CL'))
      : '-';
    
    // TT
    let tt = '-';
    if (registro.etd && registro.eta) {
      try {
        const fechaEtd = registro.etd instanceof Date ? registro.etd : new Date(registro.etd);
        const fechaEta = registro.eta instanceof Date ? registro.eta : new Date(registro.eta);
        const diffTime = fechaEta.getTime() - fechaEtd.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        tt = diffDays >= 0 ? diffDays.toString() : '-';
      } catch {
        tt = '-';
      }
    }
    row.getCell(11).value = tt;
    
    row.getCell(12).value = registro.especie || '-';
    row.getCell(13).value = registro.temperatura !== null && registro.temperatura !== undefined ? registro.temperatura : '-';
    row.getCell(14).value = registro.cbm !== null && registro.cbm !== undefined ? registro.cbm : '-';
    row.getCell(15).value = registro.flete || '-';
    row.getCell(16).value = registro.deposito || '-';

    // Aplicar estilos
    for (let col = 1; col <= colSpan; col++) {
      const cell = row.getCell(col);
      cell.style = cellStyle;
    }

    rowIndex++;
  });

  // Fila vacía después de los datos
  const filaVacia = rowIndex;
  worksheet.getRow(filaVacia).height = 20;

  // Footer con texto "Asesorías y Servicios Logísticos Integrales"
  const filaFooter = rowIndex + 1;
  worksheet.mergeCells(`A${filaFooter}:${getColumnLetter(colSpan)}${filaFooter}`);
  const footerCell = worksheet.getCell(`A${filaFooter}`);
  footerCell.value = 'Asesorías y Servicios Logísticos Integrales';
  footerCell.style = {
    font: { bold: true, size: 12 },
    alignment: { horizontal: 'center' as const, vertical: 'middle' as const }
  };
  worksheet.getRow(filaFooter).height = 25;

  // Aplicar borde externo delgado a todo el contenido (desde fila 2 hasta footer)
  // Bordes superiores e inferiores
  for (let col = 1; col <= colSpan; col++) {
    const colLetter = getColumnLetter(col);
    // Borde superior (fila 2)
    const topCell = worksheet.getCell(`${colLetter}2`);
    if (!topCell.style.border) topCell.style.border = {};
    topCell.style.border.top = { style: 'thin' as const, color: { argb: 'FF000000' } };
    
    // Borde inferior (fila footer)
    const bottomCell = worksheet.getCell(`${colLetter}${filaFooter}`);
    if (!bottomCell.style.border) bottomCell.style.border = {};
    bottomCell.style.border.bottom = { style: 'thin' as const, color: { argb: 'FF000000' } };
  }
  
  // Bordes laterales (primera y última columna)
  for (let row = 2; row <= filaFooter; row++) {
    // Borde izquierdo (columna A)
    const leftCell = worksheet.getCell(row, 1);
    if (!leftCell.style.border) leftCell.style.border = {};
    leftCell.style.border.left = { style: 'thin' as const, color: { argb: 'FF000000' } };
    
    // Borde derecho (última columna)
    const rightCell = worksheet.getCell(row, colSpan);
    if (!rightCell.style.border) rightCell.style.border = {};
    rightCell.style.border.right = { style: 'thin' as const, color: { argb: 'FF000000' } };
  }

  // Ajustar ancho de columnas
  for (let i = 1; i <= colSpan; i++) {
    const column = worksheet.getColumn(i);
    column.width = i === 1 ? 12 : i === 6 ? 20 : 15;
  }

  // Logo deshabilitado temporalmente - al copiar y pegar en correo aparece como cuadro blanco
  // Intentar agregar logo - centrado
  // try {
  //   const logo = await cargarImagen(LOGO_URL);
  //   if (logo && logo.buffer) {
  //     const buffer = logo.buffer as any;
  //     if (buffer && (buffer.length > 0 || (buffer.byteLength && buffer.byteLength > 0))) {
  //       const imageId = workbook.addImage(logo);
  //       // Calcular posición central: el logo ocupa aproximadamente 2 columnas (150px / ~75px por columna)
  //       // Columna central menos 1 columna para centrar
  //       const columnaCentral = Math.max(0, Math.floor(colSpan / 2) - 1);
  //       worksheet.addImage(imageId, {
  //         tl: { col: columnaCentral, row: 0 },
  //         ext: { width: 150, height: 60 },
  //       });
  //     }
  //   }
  // } catch (error) {
  //   console.warn('Logo no se pudo agregar (no crítico):', error);
  // }

  return await workbook.xlsx.writeBuffer();
}

// Template: INFORME DE ARRIBO
async function generarArribo(registros: Registro[]): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Informe de Arribo');

  // Headers
  const headers = [
    'REF ASLI', 'Cliente', 'Naviera', 'Nave', 'Booking', 'Contenedor',
    'POL', 'POD', 'ETD', 'ETA', 'TT', 'Especie', 'T°', 'CBM',
    'Flete', 'Depósito'
  ];
  
  const colSpan = headers.length;

  // Estilos
  const headerStyle = {
    font: { bold: true, size: 12, color: { argb: 'FFFFFFFF' } },
    fill: {
      type: 'pattern' as const,
      pattern: 'solid' as const,
      fgColor: { argb: 'FF059669' }
    },
    alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
    border: {
      top: { style: 'thick' as const, color: { argb: 'FF000000' } },
      left: { style: 'thin' as const, color: { argb: 'FF000000' } },
      bottom: { style: 'thick' as const, color: { argb: 'FF000000' } },
      right: { style: 'thin' as const, color: { argb: 'FF000000' } }
    }
  };

  const cellStyle = {
    alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
    border: {
      top: { style: 'medium' as const, color: { argb: 'FF9CA3AF' } },
      left: { style: 'thin' as const, color: { argb: 'FFD1D5DB' } },
      bottom: { style: 'medium' as const, color: { argb: 'FF9CA3AF' } },
      right: { style: 'thin' as const, color: { argb: 'FFD1D5DB' } }
    }
  };

  // Logo en la fila 1
  worksheet.getRow(1).height = 60;

  // Título en la fila 2
  worksheet.mergeCells(`A2:${getColumnLetter(colSpan)}2`);
  const tituloCell = worksheet.getCell('A2');
  tituloCell.value = 'INFORME DE ARRIBO';
  tituloCell.style = {
    font: { bold: true, size: 16, color: { argb: 'FF059669' } },
    alignment: { horizontal: 'center' as const, vertical: 'middle' as const }
  };
  worksheet.getRow(2).height = 30;

  // Headers en la fila 3
  headers.forEach((header, index) => {
    const cell = worksheet.getCell(3, index + 1);
    cell.value = header;
    cell.style = headerStyle;
  });
  worksheet.getRow(3).height = 25;

  // Datos
  let rowIndex = 4;
  registros.forEach(registro => {
    const row = worksheet.getRow(rowIndex);
    
    row.getCell(1).value = registro.refAsli || '-';
    row.getCell(2).value = registro.shipper || '-';
    row.getCell(3).value = registro.naviera || '-';
    row.getCell(4).value = registro.naveInicial || '-';
    row.getCell(5).value = registro.booking || '-';
    row.getCell(6).value = Array.isArray(registro.contenedor) 
      ? registro.contenedor.join(', ') 
      : registro.contenedor || '-';
    row.getCell(7).value = registro.pol || '-';
    row.getCell(8).value = registro.pod || '-';
    row.getCell(9).value = registro.etd 
      ? (registro.etd instanceof Date ? registro.etd.toLocaleDateString('es-CL') : new Date(registro.etd).toLocaleDateString('es-CL'))
      : '-';
    row.getCell(10).value = registro.eta 
      ? (registro.eta instanceof Date ? registro.eta.toLocaleDateString('es-CL') : new Date(registro.eta).toLocaleDateString('es-CL'))
      : '-';
    
    // TT
    let tt = '-';
    if (registro.etd && registro.eta) {
      try {
        const fechaEtd = registro.etd instanceof Date ? registro.etd : new Date(registro.etd);
        const fechaEta = registro.eta instanceof Date ? registro.eta : new Date(registro.eta);
        const diffTime = fechaEta.getTime() - fechaEtd.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        tt = diffDays >= 0 ? diffDays.toString() : '-';
      } catch {
        tt = '-';
      }
    }
    row.getCell(11).value = tt;
    
    row.getCell(12).value = registro.especie || '-';
    row.getCell(13).value = registro.temperatura !== null && registro.temperatura !== undefined ? registro.temperatura : '-';
    row.getCell(14).value = registro.cbm !== null && registro.cbm !== undefined ? registro.cbm : '-';
    row.getCell(15).value = registro.flete || '-';
    row.getCell(16).value = registro.deposito || '-';

    // Aplicar estilos
    for (let col = 1; col <= colSpan; col++) {
      const cell = row.getCell(col);
      cell.style = cellStyle;
    }

    rowIndex++;
  });

  // Fila vacía después de los datos
  const filaVacia = rowIndex;
  worksheet.getRow(filaVacia).height = 20;

  // Footer con texto "Asesorías y Servicios Logísticos Integrales"
  const filaFooter = rowIndex + 1;
  worksheet.mergeCells(`A${filaFooter}:${getColumnLetter(colSpan)}${filaFooter}`);
  const footerCell = worksheet.getCell(`A${filaFooter}`);
  footerCell.value = 'Asesorías y Servicios Logísticos Integrales';
  footerCell.style = {
    font: { bold: true, size: 12 },
    alignment: { horizontal: 'center' as const, vertical: 'middle' as const }
  };
  worksheet.getRow(filaFooter).height = 25;

  // Aplicar borde externo delgado a todo el contenido (desde fila 2 hasta footer)
  // Bordes superiores e inferiores
  for (let col = 1; col <= colSpan; col++) {
    const colLetter = getColumnLetter(col);
    // Borde superior (fila 2)
    const topCell = worksheet.getCell(`${colLetter}2`);
    if (!topCell.style.border) topCell.style.border = {};
    topCell.style.border.top = { style: 'thin' as const, color: { argb: 'FF000000' } };
    
    // Borde inferior (fila footer)
    const bottomCell = worksheet.getCell(`${colLetter}${filaFooter}`);
    if (!bottomCell.style.border) bottomCell.style.border = {};
    bottomCell.style.border.bottom = { style: 'thin' as const, color: { argb: 'FF000000' } };
  }
  
  // Bordes laterales (primera y última columna)
  for (let row = 2; row <= filaFooter; row++) {
    // Borde izquierdo (columna A)
    const leftCell = worksheet.getCell(row, 1);
    if (!leftCell.style.border) leftCell.style.border = {};
    leftCell.style.border.left = { style: 'thin' as const, color: { argb: 'FF000000' } };
    
    // Borde derecho (última columna)
    const rightCell = worksheet.getCell(row, colSpan);
    if (!rightCell.style.border) rightCell.style.border = {};
    rightCell.style.border.right = { style: 'thin' as const, color: { argb: 'FF000000' } };
  }

  // Ajustar ancho de columnas
  for (let i = 1; i <= colSpan; i++) {
    const column = worksheet.getColumn(i);
    column.width = i === 1 ? 12 : i === 6 ? 20 : 15;
  }

  // Logo deshabilitado temporalmente - al copiar y pegar en correo aparece como cuadro blanco
  // Intentar agregar logo - centrado
  // try {
  //   const logo = await cargarImagen(LOGO_URL);
  //   if (logo && logo.buffer) {
  //     const buffer = logo.buffer as any;
  //     if (buffer && (buffer.length > 0 || (buffer.byteLength && buffer.byteLength > 0))) {
  //       const imageId = workbook.addImage(logo);
  //       // Calcular posición central: el logo ocupa aproximadamente 2 columnas (150px / ~75px por columna)
  //       // Columna central menos 1 columna para centrar
  //       const columnaCentral = Math.max(0, Math.floor(colSpan / 2) - 1);
  //       worksheet.addImage(imageId, {
  //         tl: { col: columnaCentral, row: 0 },
  //         ext: { width: 150, height: 60 },
  //       });
  //     }
  //   }
  // } catch (error) {
  //   console.warn('Logo no se pudo agregar (no crítico):', error);
  // }

  return await workbook.xlsx.writeBuffer();
}
