import ExcelJS from 'exceljs';
import { createClient } from '@/lib/supabase-browser';
import { PlantillaExcelProcessor } from './plantilla-excel-processor';
import { Registro } from '@/types/registros';

interface GrupoPorNave {
  nave: string;
  registros: Registro[];
  cantidad: number;
  etd: Date | null;
  especies: string[];
  temperaturas: (number | null)[];
  ventilaciones: (number | null)[];
}

interface DatosFacturacion {
  grupos: GrupoPorNave[];
  fecha_hoy: string;
  fecha_hoy_largo: string;
  hora_actual: string;
  total_registros: number;
  total_naves: number;
}

/**
 * Convierte los registros agrupados por nave a formato de datos para plantilla
 */
function registrosADatosFacturacion(gruposPorNave: GrupoPorNave[]): DatosFacturacion {
  const ahora = new Date();
  
  return {
    grupos: gruposPorNave,
    fecha_hoy: ahora.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    fecha_hoy_largo: ahora.toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    hora_actual: ahora.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
    total_registros: gruposPorNave.reduce((sum, g) => sum + g.cantidad, 0),
    total_naves: gruposPorNave.length,
  };
}

/**
 * Genera Excel de facturación usando una plantilla
 */
export async function generarFacturacionExcel(
  gruposPorNave: GrupoPorNave[],
  plantillaId?: string
): Promise<{ blob: Blob; fileName: string }> {
  const supabase = createClient();
  
  // Si hay plantilla seleccionada, usarla
  if (plantillaId) {
    try {
      // Cargar plantilla
      const { data: plantilla, error } = await supabase
        .from('plantillas_proforma')
        .select('*')
        .eq('id', plantillaId)
        .eq('tipo_factura', 'booking_fee')
        .eq('activa', true)
        .single();

      if (error || !plantilla) {
        throw new Error('No se encontró la plantilla seleccionada');
      }

      // Obtener URL pública del archivo
      const { data: urlData } = await supabase.storage
        .from('documentos')
        .createSignedUrl(plantilla.archivo_url, 3600);

      if (!urlData?.signedUrl) {
        throw new Error('No se pudo obtener la URL de la plantilla');
      }

      // Por ahora, si hay plantilla pero el procesador no soporta este formato,
      // generar Excel básico. En el futuro se puede extender el procesador.
      console.warn('Las plantillas personalizadas para facturación aún no están implementadas. Generando Excel básico.');
      return generarFacturacionExcelBasico(gruposPorNave);
      
      // TODO: Implementar procesamiento de plantillas personalizadas para facturación
      // const processor = new PlantillaExcelProcessor();
      // await processor.cargarPlantilla(urlData.signedUrl);
      // const workbook = await processor.procesar();
      // const buffer = await workbook.xlsx.writeBuffer();
      // const blob = new Blob([buffer], {
      //   type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      // });
      // const fileName = `Facturacion_${new Date().toISOString().split('T')[0]}.xlsx`;
      // return { blob, fileName };
    } catch (error: any) {
      console.error('Error generando Excel con plantilla:', error);
      // Si falla, generar Excel básico
      return generarFacturacionExcelBasico(gruposPorNave);
    }
  }

  // Si no hay plantilla, generar Excel básico
  return generarFacturacionExcelBasico(gruposPorNave);
}

/**
 * Convierte una fecha a formato YYYY-MM-DD usando la fecha local (sin zona horaria)
 */
function formatearFechaLocal(fecha: Date): string {
  const año = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${año}-${mes}-${dia}`;
}

/**
 * Obtiene el tipo de cambio USD/CLP del Banco Central para una fecha
 * Usa la fecha local del ETD para evitar problemas de zona horaria
 */
async function obtenerTipoCambio(fecha: Date): Promise<number | null> {
  try {
    // Usar fecha local para evitar problemas de zona horaria
    const fechaStr = formatearFechaLocal(fecha);
    console.log(`🔄 Consultando tipo de cambio para fecha ETD: ${fechaStr}`);
    
    const response = await fetch(`/api/banco-central/tipo-cambio?fecha=${fechaStr}`);
    
    if (!response.ok) {
      let errorData: any = {};
      try {
        errorData = await response.json();
      } catch (e) {
        // Si no se puede parsear el JSON, usar el texto de respuesta
        errorData = { error: response.statusText };
      }
      
      // Manejar diferentes tipos de errores
      if (response.status === 400) {
        // Fecha futura o formato inválido
        console.warn(`⚠️ ${errorData.error || 'Fecha inválida'} para ${fechaStr}`);
      } else if (response.status === 404) {
        // No se encontró tipo de cambio para esa fecha
        console.warn(`⚠️ No se encontró tipo de cambio para ${fechaStr} (puede ser fin de semana o feriado)`);
      } else {
        // Error del servidor
        console.error(`❌ Error del servidor al obtener tipo de cambio para ${fechaStr}:`, errorData.error || response.status);
      }
      return null;
    }
    
    const data = await response.json();
    if (data.tipoCambio && typeof data.tipoCambio === 'number' && data.tipoCambio > 0) {
      console.log(`✅ Tipo de cambio obtenido para ${fechaStr}: ${data.tipoCambio} CLP/USD`);
      return data.tipoCambio;
    }
    
    console.warn(`⚠️ Tipo de cambio inválido o vacío para ${fechaStr}`);
    return null;
  } catch (error: any) {
    console.error(`❌ Error obteniendo tipo de cambio para ${formatearFechaLocal(fecha)}:`, error?.message || error);
    return null;
  }
}

/**
 * Genera Excel básico de facturación sin plantilla
 */
function generarFacturacionExcelBasico(
  gruposPorNave: GrupoPorNave[]
): Promise<{ blob: Blob; fileName: string }> {
  return new Promise(async (resolve, reject) => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Facturación');

      // Expandir grupos a registros individuales
      const registros: Registro[] = [];
      gruposPorNave.forEach((grupo) => {
        registros.push(...grupo.registros);
      });

      // Ordenar registros de más antiguo a más nuevo por ETD
      registros.sort((a, b) => {
        // Si ambos tienen ETD, ordenar por fecha
        if (a.etd && b.etd) {
          return a.etd.getTime() - b.etd.getTime();
        }
        // Si solo a tiene ETD, va primero
        if (a.etd && !b.etd) {
          return -1;
        }
        // Si solo b tiene ETD, va primero
        if (!a.etd && b.etd) {
          return 1;
        }
        // Si ninguno tiene ETD, mantener orden original
        return 0;
      });

      // Obtener tipos de cambio para cada registro basado en su ETD
      const tiposCambio = new Map<string, number | null>();
      const fechasUnicas = new Set<string>();
      
      // Recopilar fechas únicas de ETD usando fecha local
      registros.forEach((registro) => {
        if (registro.etd) {
          const fechaStr = formatearFechaLocal(registro.etd);
          fechasUnicas.add(fechaStr);
        }
      });

      // Consultar tipos de cambio para todas las fechas únicas de ETD en paralelo
      console.log(`🔄 Consultando tipos de cambio del Banco Central para ${fechasUnicas.size} fecha(s) única(s) en paralelo...`);
      const promesasTipoCambio = Array.from(fechasUnicas).map(async (fechaStr) => {
        // Crear fecha desde string YYYY-MM-DD en hora local
        const [año, mes, dia] = fechaStr.split('-').map(Number);
        const fecha = new Date(año, mes - 1, dia);
        const tipoCambio = await obtenerTipoCambio(fecha);
        return { fechaStr, tipoCambio };
      });
      
      // Esperar todas las consultas en paralelo
      const resultados = await Promise.all(promesasTipoCambio);
      resultados.forEach(({ fechaStr, tipoCambio }) => {
        tiposCambio.set(fechaStr, tipoCambio);
      });
      
      const tiposCambioExitosos = Array.from(tiposCambio.values()).filter(tc => tc !== null).length;
      console.log(`✅ Tipos de cambio obtenidos: ${tiposCambioExitosos}/${fechasUnicas.size}`);

      // Estilos - crear una vez y reutilizar
      const headerStyle = {
        font: { bold: true, size: 11, color: { argb: 'FFFFFFFF' } },
        fill: {
          type: 'pattern' as const,
          pattern: 'solid' as const,
          fgColor: { argb: 'FF1e3a8a' },
        },
        alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
        border: {
          top: { style: 'thin' as const, color: { argb: 'FF000000' } },
          left: { style: 'thin' as const, color: { argb: 'FF000000' } },
          bottom: { style: 'thin' as const, color: { argb: 'FF000000' } },
          right: { style: 'thin' as const, color: { argb: 'FF000000' } },
        },
      };

      const cellStyle = {
        alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
        border: {
          top: { style: 'thin' as const, color: { argb: 'FFD1D5DB' } },
          left: { style: 'thin' as const, color: { argb: 'FFD1D5DB' } },
          bottom: { style: 'thin' as const, color: { argb: 'FFD1D5DB' } },
          right: { style: 'thin' as const, color: { argb: 'FFD1D5DB' } },
        },
      };

      const numberStyle = {
        ...cellStyle,
        numFmt: '#,##0.00',
      };

      const totalRowCellStyle = {
        ...cellStyle,
        fill: {
          type: 'pattern' as const,
          pattern: 'solid' as const,
          fgColor: { argb: 'FFE0E0E0' },
        },
      };

      const totalRowNumberStyle = {
        ...numberStyle,
        font: { bold: true },
        fill: {
          type: 'pattern' as const,
          pattern: 'solid' as const,
          fgColor: { argb: 'FFE0E0E0' },
        },
      };

      // Headers
      const headers = [
        'N°',
        'BOOKING',
        'ETD',
        'NAVE',
        'MERCANCIA',
        'DESTINO',
        'OPERADOR',
        'DEPOSITO',
        'T°',
        'CBM',
        'NAVIERA',
        'CONTENEDOR',
        'CONTRATO',
        'VALOR USD',
        'BOOKING FEE',
        'TOTAL',
      ];
      
      const headerRow = worksheet.getRow(1);
      headers.forEach((header, index) => {
        const cell = headerRow.getCell(index + 1);
        cell.value = header;
        cell.style = headerStyle;
      });
      headerRow.height = 25;

      // Datos - una fila por registro
      let rowIndex = 2;
      registros.forEach((registro, index) => {
        const row = worksheet.getRow(rowIndex);
        
        // N°
        row.getCell(1).value = index + 1;
        
        // BOOKING
        row.getCell(2).value = registro.booking || 'POR ASIGNAR';
        
        // ETD
        row.getCell(3).value = registro.etd
          ? new Date(registro.etd).toLocaleDateString('es-CL', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })
          : '';
        if (registro.etd) {
          row.getCell(3).numFmt = 'dd/mm/yyyy';
        }
        
        // NAVE
        row.getCell(4).value = registro.naveInicial || '';
        
        // MERCANCIA (Especie)
        row.getCell(5).value = registro.especie || '';
        
        // DESTINO (POD)
        row.getCell(6).value = registro.pod || '';
        
        // OPERADOR (Ejecutivo)
        row.getCell(7).value = registro.ejecutivo || '';
        
        // DEPOSITO
        row.getCell(8).value = registro.deposito || '';
        
        // T° (Temperatura)
        row.getCell(9).value = registro.temperatura !== null && registro.temperatura !== undefined
          ? registro.temperatura
          : '';
        
        // CBM
        row.getCell(10).value = registro.cbm !== null && registro.cbm !== undefined
          ? registro.cbm
          : '';
        
        // NAVIERA
        row.getCell(11).value = registro.naviera || '';
        
        // CONTENEDOR
        const contenedor = Array.isArray(registro.contenedor)
          ? registro.contenedor.join(', ')
          : registro.contenedor || 'POR ASIGNAR';
        row.getCell(12).value = contenedor;
        
        // CONTRATO
        row.getCell(13).value = registro.contrato || 'SIN CONTRATO';
        
        // VALOR USD (dólar observado del día del ETD - obtenido del Banco Central)
        let valorUsd: number | null = null;
        if (registro.etd) {
          const fechaStr = formatearFechaLocal(registro.etd);
          valorUsd = tiposCambio.get(fechaStr) || null;
          if (!valorUsd) {
            console.warn(`⚠️ No se encontró tipo de cambio para registro ${index + 1} con ETD ${fechaStr}`);
          }
        } else {
          console.warn(`⚠️ Registro ${index + 1} no tiene ETD definido`);
        }
        row.getCell(14).value = valorUsd !== null ? valorUsd : '';
        row.getCell(14).style = numberStyle;
        
        // BOOKING FEE (siempre USD 150)
        row.getCell(15).value = 150;
        row.getCell(15).style = numberStyle;
        
        // TOTAL (fórmula: VALOR USD * BOOKING FEE)
        const valorUsdCell = `N${rowIndex}`;
        const bookingFeeCell = `O${rowIndex}`;
        row.getCell(16).value = { formula: `=${valorUsdCell}*${bookingFeeCell}` };
        row.getCell(16).style = {
          ...numberStyle,
          font: { bold: true },
        };

        // Aplicar estilos a todas las celdas de una vez (más eficiente)
        for (let i = 1; i <= 13; i++) {
          row.getCell(i).style = cellStyle;
        }
        // Las celdas 14, 15, 16 ya tienen estilos aplicados arriba

        row.height = 20;
        rowIndex++;
      });

      // Fila de totales
      const totalRowIndex = rowIndex;
      const totalRow = worksheet.getRow(totalRowIndex);
      
      // Promedio en VALOR USD
      const primeraFilaDatos = 2;
      const ultimaFilaDatos = rowIndex - 1;
      const promedioCell = totalRow.getCell(14);
      promedioCell.value = { formula: `AVERAGE(N${primeraFilaDatos}:N${ultimaFilaDatos})` };
      promedioCell.style = totalRowNumberStyle;
      
      // Etiqueta "TOTAL" en columna 15
      totalRow.getCell(15).value = 'TOTAL';
      totalRow.getCell(15).style = {
        ...totalRowCellStyle,
        font: { bold: true },
        alignment: { horizontal: 'right' as const, vertical: 'middle' as const },
      };
      
      // Suma de totales en columna 16
      const sumaCell = totalRow.getCell(16);
      sumaCell.value = { formula: `SUM(P${primeraFilaDatos}:P${ultimaFilaDatos})` };
      sumaCell.style = totalRowNumberStyle;

      // Aplicar estilos a las demás celdas de la fila de totales
      for (let i = 1; i <= 13; i++) {
        totalRow.getCell(i).style = totalRowCellStyle;
      }

      totalRow.height = 25;

      // Ajustar ancho de columnas
      worksheet.columns = [
        { width: 8 },  // N°
        { width: 15 }, // BOOKING
        { width: 12 }, // ETD
        { width: 20 }, // NAVE
        { width: 15 }, // MERCANCIA
        { width: 15 }, // DESTINO
        { width: 15 }, // OPERADOR
        { width: 15 }, // DEPOSITO
        { width: 10 }, // T°
        { width: 10 }, // CBM
        { width: 20 }, // NAVIERA
        { width: 18 }, // CONTENEDOR
        { width: 15 }, // CONTRATO
        { width: 12 }, // VALOR USD
        { width: 12 }, // BOOKING FEE
        { width: 12 }, // TOTAL
      ];

      // Generar buffer
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const fileName = `Facturacion_${new Date().toISOString().split('T')[0]}.xlsx`;

      resolve({ blob, fileName });
    } catch (error) {
      reject(error);
    }
  });
}
