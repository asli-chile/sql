'use client';

import { useMemo } from 'react';
import { Registro } from '@/types/registros';
import { CostosEmbarque } from '@/types/finanzas';
import { calcularCostoTotal, calcularMargen } from '@/lib/finanzas-calculations';
import { useTheme } from '@/contexts/ThemeContext';
import { X, Download, FileText } from 'lucide-react';
import ExcelJS from 'exceljs';

interface ReporteDetalladoCostosProps {
  registros: Registro[];
  costosEmbarques: CostosEmbarque[];
  isOpen: boolean;
  onClose: () => void;
}

interface CostoDetallado {
  registro: Registro;
  costo: CostosEmbarque | null;
  costoTotal: number;
  ingresos: number;
  margen: number;
  margenPorcentaje: number;
}

interface AgrupacionPorRef {
  refExterna: string;
  contenedores: Map<string, {
    contenedor: string;
    reservas: Map<string, CostoDetallado[]>;
  }>;
}

export function ReporteDetalladoCostos({
  registros,
  costosEmbarques,
  isOpen,
  onClose,
}: ReporteDetalladoCostosProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Crear mapa de costos por booking
  const costosMap = useMemo(() => {
    const map = new Map<string, CostosEmbarque>();
    costosEmbarques.forEach(costo => {
      map.set(costo.booking, costo);
    });
    return map;
  }, [costosEmbarques]);

  // Agrupar datos por ref externa, contenedor y reserva
  const datosAgrupados = useMemo(() => {
    const agrupacion = new Map<string, AgrupacionPorRef>();

    registros.forEach(registro => {
      // Obtener ref externa (prioridad: refCliente, luego refAsli)
      const refExterna = (registro.refCliente || registro.refAsli || 'Sin ref').trim();
      
      // Obtener contenedor(es) - puede ser string o array
      const contenedores = Array.isArray(registro.contenedor) 
        ? registro.contenedor 
        : registro.contenedor 
          ? [registro.contenedor] 
          : ['Sin contenedor'];

      // Obtener reserva (booking)
      const reserva = registro.booking || 'Sin booking';

      // Obtener costo asociado
      const costo = costosMap.get(registro.booking) || null;
      const costoTotal = costo ? calcularCostoTotal(costo) : 0;
      const ingresos = costo?.ingresos || 0;
      const { margen, porcentaje: margenPorcentaje } = calcularMargen(ingresos, costoTotal);

      const costoDetallado: CostoDetallado = {
        registro,
        costo,
        costoTotal,
        ingresos,
        margen,
        margenPorcentaje,
      };

      // Agrupar por ref externa
      if (!agrupacion.has(refExterna)) {
        agrupacion.set(refExterna, {
          refExterna,
          contenedores: new Map(),
        });
      }

      const refData = agrupacion.get(refExterna)!;

      // Agrupar por contenedor
      contenedores.forEach(contenedor => {
        const contenedorKey = contenedor.trim() || 'Sin contenedor';
        
        if (!refData.contenedores.has(contenedorKey)) {
          refData.contenedores.set(contenedorKey, {
            contenedor: contenedorKey,
            reservas: new Map(),
          });
        }

        const contenedorData = refData.contenedores.get(contenedorKey)!;

        // Agrupar por reserva
        if (!contenedorData.reservas.has(reserva)) {
          contenedorData.reservas.set(reserva, []);
        }

        contenedorData.reservas.get(reserva)!.push(costoDetallado);
      });
    });

    return Array.from(agrupacion.values()).sort((a, b) => 
      a.refExterna.localeCompare(b.refExterna)
    );
  }, [registros, costosMap]);

  // Calcular totales generales
  const totales = useMemo(() => {
    let totalIngresos = 0;
    let totalCostos = 0;
    let totalRegistros = 0;

    datosAgrupados.forEach(refData => {
      refData.contenedores.forEach(contenedorData => {
        contenedorData.reservas.forEach(costos => {
          costos.forEach(costo => {
            totalIngresos += costo.ingresos;
            totalCostos += costo.costoTotal;
            totalRegistros += 1;
          });
        });
      });
    });

    const totalMargen = totalIngresos - totalCostos;
    const totalMargenPorcentaje = totalIngresos > 0 ? (totalMargen / totalIngresos) * 100 : 0;

    return {
      totalIngresos,
      totalCostos,
      totalMargen,
      totalMargenPorcentaje,
      totalRegistros,
    };
  }, [datosAgrupados]);

  // Función para exportar a Excel
  const exportarExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Reporte Detallado de Costos');

    // Estilos
    const headerStyle = {
      font: { bold: true, size: 12, color: { argb: 'FFFFFFFF' } },
      fill: {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E40AF' }, // Azul oscuro
      },
      alignment: { horizontal: 'center', vertical: 'middle' as const },
      border: {
        top: { style: 'thin' as const },
        left: { style: 'thin' as const },
        bottom: { style: 'thin' as const },
        right: { style: 'thin' as const },
      },
    };

    const dataStyle = {
      border: {
        top: { style: 'thin' as const },
        left: { style: 'thin' as const },
        bottom: { style: 'thin' as const },
        right: { style: 'thin' as const },
      },
      alignment: { vertical: 'middle' as const },
    };

    const numberStyle = {
      ...dataStyle,
      numFmt: '#,##0.00',
      alignment: { horizontal: 'right' as const, vertical: 'middle' as const },
    };

    const currencyStyle = {
      ...numberStyle,
      numFmt: '"$"#,##0.00',
    };

    let currentRow = 1;

    // Encabezados según el formato solicitado
    const headers = [
      'REF EXTERNA',
      'CONTENEDOR',
      'RESERVA',
      'CLIENTE',
      'NAVIERA',
      'COSTO TOTAL',
      'TT FLETE',
      'TT SOBRE ESTADIA',
      'TT PORTEO',
      'TT ALMACENAMIENTO',
      'COORDINACION ESPACIO NAVIERO',
      'COORDINACION COMEX',
      'COORDINACION AGA',
      'NAV GATE OUT',
      'NAV SEGURIDAD CONTENEDOR',
      'NAV MATRIZ FUERA PLAZO',
      'NAV CORRECCIONES',
      'NAV EXTRA LATE',
      'NAV TELEX RELEASE',
      'NAV COURIER',
      'NAV PAGO SAG CER.FITO EXTRA',
      'NAV PAGO CERT.OR EXTRA',
      'REBATES',
    ];

    // Agregar encabezados
    headers.forEach((header, colIndex) => {
      const col = String.fromCharCode(65 + colIndex); // A, B, C, etc.
      worksheet.getCell(`${col}${currentRow}`).value = header;
      worksheet.getCell(`${col}${currentRow}`).style = headerStyle;
    });
    currentRow++;

    // Recopilar todos los datos en formato plano
    const allRows: Array<{
      refExterna: string;
      contenedor: string;
      reserva: string;
      cliente: string;
      naviera: string;
      costoTotal: number;
      ttFlete: number;
      ttSobreEstadia: number;
      ttPorteo: number;
      ttAlmacenamiento: number;
      coordAdmEspacio: number;
      coordComex: number;
      coordAga: number;
      navGateOut: number;
      navSeguridadContenedor: number;
      navMatrizFueraPlazo: number;
      navCorrecciones: number;
      navExtraLate: number;
      navTelexRelease: number;
      navCourier: number;
      navPagoSagCfExtra: number;
      navPagoUccoCoExtra: number;
      rebates: number;
    }> = [];

    datosAgrupados.forEach((refData) => {
      refData.contenedores.forEach((contenedorData) => {
        contenedorData.reservas.forEach((costos, reserva) => {
          costos.forEach((costo) => {
            const costoData = costo.costo;
            allRows.push({
              refExterna: refData.refExterna,
              contenedor: contenedorData.contenedor,
              reserva: reserva,
              cliente: costo.registro.shipper || '',
              naviera: costo.registro.naviera || '',
              costoTotal: costo.costoTotal,
              ttFlete: costoData?.tt_flete || 0,
              ttSobreEstadia: costoData?.tt_sobre_estadia || 0,
              ttPorteo: costoData?.tt_porteo || 0,
              ttAlmacenamiento: costoData?.tt_almacenamiento || 0,
              coordAdmEspacio: costoData?.coord_adm_espacio || 0,
              coordComex: costoData?.coord_comex || 0,
              coordAga: costoData?.coord_aga || 0,
              navGateOut: costoData?.nav_gate_out || 0,
              navSeguridadContenedor: costoData?.nav_seguridad_contenedor || 0,
              navMatrizFueraPlazo: costoData?.nav_matriz_fuera_plazo || 0,
              navCorrecciones: costoData?.nav_correcciones || 0,
              navExtraLate: costoData?.nav_extra_late || 0,
              navTelexRelease: costoData?.nav_telex_release || 0,
              navCourier: costoData?.nav_courier || 0,
              navPagoSagCfExtra: costoData?.nav_pago_sag_cf_extra || 0,
              navPagoUccoCoExtra: costoData?.nav_pago_ucco_co_extra || 0,
              rebates: costoData?.rebates || 0,
            });
          });
        });
      });
    });

    // Agregar todas las filas de datos
    allRows.forEach((row) => {
      const rowData = [
        row.refExterna,
        row.contenedor,
        row.reserva,
        row.cliente,
        row.naviera,
        row.costoTotal,
        row.ttFlete,
        row.ttSobreEstadia,
        row.ttPorteo,
        row.ttAlmacenamiento,
        row.coordAdmEspacio,
        row.coordComex,
        row.coordAga,
        row.navGateOut,
        row.navSeguridadContenedor,
        row.navMatrizFueraPlazo,
        row.navCorrecciones,
        row.navExtraLate,
        row.navTelexRelease,
        row.navCourier,
        row.navPagoSagCfExtra,
        row.navPagoUccoCoExtra,
        row.rebates,
      ];

      rowData.forEach((value, colIndex) => {
        const col = String.fromCharCode(65 + colIndex);
        const cell = worksheet.getCell(`${col}${currentRow}`);
        cell.value = value;

        if (colIndex < 5) {
          // REF EXTERNA, CONTENEDOR, RESERVA, CLIENTE, NAVIERA - texto
          cell.style = dataStyle;
          cell.alignment = { horizontal: 'left' as const, vertical: 'middle' as const };
        } else {
          // Resto - moneda
          cell.style = currencyStyle;
        }
      });
      currentRow++;
    });

    // Ajustar ancho de columnas
    worksheet.columns.forEach((column, index) => {
      if (index < 5) {
        column.width = 20; // Columnas de texto
      } else {
        column.width = 18; // Columnas numéricas
      }
    });

    // Congelar primera fila (encabezados)
    worksheet.views = [{
      state: 'frozen',
      ySplit: 1,
    }];

    // Generar archivo
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte-detallado-costos-${new Date().toISOString().split('T')[0]}.xlsx`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className={`border max-w-[95vw] w-full max-h-[90vh] flex flex-col ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 border flex items-center justify-center ${isDark ? 'bg-blue-600 border-blue-500' : 'bg-blue-50 border-blue-200'}`}>
              <FileText className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
            <div>
              <h2 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Reporte Detallado de Costos
              </h2>
              <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                Agrupado por Ref Externa, Contenedor y Reserva
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportarExcel}
              className={`flex items-center gap-2 px-4 py-2 border transition-colors ${isDark
                ? 'border-slate-700 text-slate-300 hover:bg-slate-700'
                : 'border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>Exportar Excel</span>
            </button>
            <button
              onClick={onClose}
              className={`p-2 border transition-colors ${isDark
                ? 'border-slate-700 text-slate-300 hover:bg-slate-700'
                : 'border-gray-300 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Totales */}
        <div className={`p-4 border-b ${isDark ? 'border-slate-700 bg-slate-900' : 'border-gray-200 bg-gray-50'}`}>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>Total Registros</p>
              <p className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {totales.totalRegistros}
              </p>
            </div>
            <div>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>Ingresos Totales</p>
              <p className={`text-lg font-semibold ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                {formatCurrency(totales.totalIngresos)}
              </p>
            </div>
            <div>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>Costos Totales</p>
              <p className={`text-lg font-semibold ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                {formatCurrency(totales.totalCostos)}
              </p>
            </div>
            <div>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>Margen Total</p>
              <p className={`text-lg font-semibold ${totales.totalMargen >= 0 ? (isDark ? 'text-green-400' : 'text-green-600') : (isDark ? 'text-red-400' : 'text-red-600')}`}>
                {formatCurrency(totales.totalMargen)}
              </p>
            </div>
            <div>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>Margen %</p>
              <p className={`text-lg font-semibold ${totales.totalMargenPorcentaje >= 0 ? (isDark ? 'text-green-400' : 'text-green-600') : (isDark ? 'text-red-400' : 'text-red-600')}`}>
                {totales.totalMargenPorcentaje.toFixed(2)}%
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-8">
            {datosAgrupados.map((refData) => (
              <div key={refData.refExterna} className="space-y-4">
                {/* Ref Externa Header */}
                <div className={`p-4 border ${isDark ? 'border-slate-700 bg-slate-900' : 'border-gray-300 bg-gray-50'}`}>
                  <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Ref Externa: {refData.refExterna}
                  </h3>
                </div>

                {/* Contenedores */}
                {Array.from(refData.contenedores.values()).map((contenedorData) => (
                  <div key={contenedorData.contenedor} className="ml-4 space-y-4">
                    {/* Contenedor Header */}
                    <div className={`p-3 border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-300 bg-white'}`}>
                      <h4 className={`text-md font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Contenedor: {contenedorData.contenedor}
                      </h4>
                    </div>

                    {/* Reservas */}
                    {Array.from(contenedorData.reservas.entries()).map(([reserva, costos]) => (
                      <div key={reserva} className="ml-4 space-y-2">
                        {/* Reserva Header */}
                        <div className={`p-2 border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-300 bg-white'}`}>
                          <h5 className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                            Reserva: {reserva}
                          </h5>
                        </div>

                        {/* Tabla de costos detallados */}
                        <div className="overflow-x-auto">
                          <table className={`w-full text-xs border-collapse ${isDark ? 'text-slate-200' : 'text-gray-900'}`}>
                            <thead>
                              <tr className={`border-b ${isDark ? 'border-slate-700 bg-slate-900' : 'border-gray-300 bg-gray-100'}`}>
                                <th className="p-2 text-left border">Cliente</th>
                                <th className="p-2 text-left border">Naviera</th>
                                <th className="p-2 text-right border">Ingresos</th>
                                <th className="p-2 text-right border">Costo Total</th>
                                <th className="p-2 text-right border">Margen</th>
                                <th className="p-2 text-right border">Margen %</th>
                                <th className="p-2 text-right border">TT Flete</th>
                                <th className="p-2 text-right border">TT Sobre Estadia</th>
                                <th className="p-2 text-right border">TT Porteo</th>
                                <th className="p-2 text-right border">TT Almacenamiento</th>
                                <th className="p-2 text-right border">Coord Adm Espacio</th>
                                <th className="p-2 text-right border">Coord Comex</th>
                                <th className="p-2 text-right border">Coord AGA</th>
                                <th className="p-2 text-right border">Nav Gate Out</th>
                                <th className="p-2 text-right border">Nav Seguridad</th>
                                <th className="p-2 text-right border">Nav Matriz</th>
                                <th className="p-2 text-right border">Nav Correcciones</th>
                                <th className="p-2 text-right border">Nav Extra Late</th>
                                <th className="p-2 text-right border">Nav Telex</th>
                                <th className="p-2 text-right border">Nav Courier</th>
                                <th className="p-2 text-right border">Nav SAG CF</th>
                                <th className="p-2 text-right border">Nav UCCO CO</th>
                                <th className="p-2 text-right border">Rebates</th>
                              </tr>
                            </thead>
                            <tbody>
                              {costos.map((costo, index) => {
                                const costoData = costo.costo;
                                return (
                                  <tr
                                    key={index}
                                    className={`border-b ${isDark ? 'border-slate-700 hover:bg-slate-800' : 'border-gray-300 hover:bg-gray-50'}`}
                                  >
                                    <td className="p-2 border">{costo.registro.shipper || '-'}</td>
                                    <td className="p-2 border">{costo.registro.naviera || '-'}</td>
                                    <td className="p-2 text-right border">{formatCurrency(costo.ingresos)}</td>
                                    <td className="p-2 text-right border">{formatCurrency(costo.costoTotal)}</td>
                                    <td className={`p-2 text-right border ${costo.margen >= 0 ? (isDark ? 'text-green-400' : 'text-green-600') : (isDark ? 'text-red-400' : 'text-red-600')}`}>
                                      {formatCurrency(costo.margen)}
                                    </td>
                                    <td className={`p-2 text-right border ${costo.margenPorcentaje >= 0 ? (isDark ? 'text-green-400' : 'text-green-600') : (isDark ? 'text-red-400' : 'text-red-600')}`}>
                                      {costo.margenPorcentaje.toFixed(2)}%
                                    </td>
                                    <td className="p-2 text-right border">{formatCurrency(costoData?.tt_flete || 0)}</td>
                                    <td className="p-2 text-right border">{formatCurrency(costoData?.tt_sobre_estadia || 0)}</td>
                                    <td className="p-2 text-right border">{formatCurrency(costoData?.tt_porteo || 0)}</td>
                                    <td className="p-2 text-right border">{formatCurrency(costoData?.tt_almacenamiento || 0)}</td>
                                    <td className="p-2 text-right border">{formatCurrency(costoData?.coord_adm_espacio || 0)}</td>
                                    <td className="p-2 text-right border">{formatCurrency(costoData?.coord_comex || 0)}</td>
                                    <td className="p-2 text-right border">{formatCurrency(costoData?.coord_aga || 0)}</td>
                                    <td className="p-2 text-right border">{formatCurrency(costoData?.nav_gate_out || 0)}</td>
                                    <td className="p-2 text-right border">{formatCurrency(costoData?.nav_seguridad_contenedor || 0)}</td>
                                    <td className="p-2 text-right border">{formatCurrency(costoData?.nav_matriz_fuera_plazo || 0)}</td>
                                    <td className="p-2 text-right border">{formatCurrency(costoData?.nav_correcciones || 0)}</td>
                                    <td className="p-2 text-right border">{formatCurrency(costoData?.nav_extra_late || 0)}</td>
                                    <td className="p-2 text-right border">{formatCurrency(costoData?.nav_telex_release || 0)}</td>
                                    <td className="p-2 text-right border">{formatCurrency(costoData?.nav_courier || 0)}</td>
                                    <td className="p-2 text-right border">{formatCurrency(costoData?.nav_pago_sag_cf_extra || 0)}</td>
                                    <td className="p-2 text-right border">{formatCurrency(costoData?.nav_pago_ucco_co_extra || 0)}</td>
                                    <td className="p-2 text-right border">{formatCurrency(costoData?.rebates || 0)}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
