import { Registro } from '@/types/registros';
import { CostosEmbarque, ReporteFinanciero } from '@/types/finanzas';

/**
 * Calcula el costo total de un embarque
 */
export function calcularCostoTotal(costos: CostosEmbarque): number {
  const flete = costos.flete || 0;
  const deposito = costos.deposito || 0;
  const tarifasExtra = costos.tarifasExtra || 0;
  return flete + deposito + tarifasExtra;
}

/**
 * Calcula el margen de un embarque
 */
export function calcularMargen(ingresos: number, costos: number): { margen: number; porcentaje: number } {
  const margen = ingresos - costos;
  const porcentaje = ingresos > 0 ? (margen / ingresos) * 100 : 0;
  return { margen, porcentaje };
}

/**
 * Genera reporte financiero completo basado en registros y costos
 */
export function generarReporteFinanciero(
  registros: Registro[],
  costosEmbarques: CostosEmbarque[]
): ReporteFinanciero {
  // Crear mapa de costos por booking
  const costosMap = new Map<string, CostosEmbarque>();
  costosEmbarques.forEach(costo => {
    costosMap.set(costo.booking, costo);
  });

  // Filtrar registros válidos (no cancelados)
  const registrosValidos = registros.filter(r => r.estado !== 'CANCELADO');

  // Calcular ingresos y costos totales
  let ingresosTotales = 0;
  let costosTotales = 0;
  const ingresosPorCliente: Record<string, { ingresos: number; embarques: number }> = {};
  const costosPorNaviera: Record<string, { costos: number; embarques: number }> = {};
  const costosPorTipo = {
    flete: 0,
    deposito: 0,
    tarifasExtra: 0,
  };
  const margenPorCliente: Record<string, { ingresos: number; costos: number }> = {};

  registrosValidos.forEach(registro => {
    const costo = costosMap.get(registro.booking);
    const ingresos = costo?.ingresos || 0;
    const costos = costo ? calcularCostoTotal(costo) : 0;

    ingresosTotales += ingresos;
    costosTotales += costos;

    // Por cliente
    const cliente = (registro.shipper || 'Sin cliente').trim().toUpperCase();
    if (!ingresosPorCliente[cliente]) {
      ingresosPorCliente[cliente] = { ingresos: 0, embarques: 0 };
      margenPorCliente[cliente] = { ingresos: 0, costos: 0 };
    }
    ingresosPorCliente[cliente].ingresos += ingresos;
    ingresosPorCliente[cliente].embarques += 1;
    margenPorCliente[cliente].ingresos += ingresos;
    margenPorCliente[cliente].costos += costos;

    // Por naviera
    const naviera = (registro.naviera || 'Sin naviera').trim().toUpperCase();
    if (!costosPorNaviera[naviera]) {
      costosPorNaviera[naviera] = { costos: 0, embarques: 0 };
    }
    costosPorNaviera[naviera].costos += costos;
    costosPorNaviera[naviera].embarques += 1;

    // Por tipo de costo
    if (costo) {
      costosPorTipo.flete += costo.flete || 0;
      costosPorTipo.deposito += costo.deposito || 0;
      costosPorTipo.tarifasExtra += costo.tarifasExtra || 0;
    }
  });

  // Calcular margen total
  const margenTotal = ingresosTotales - costosTotales;
  const margenPorcentaje = ingresosTotales > 0 ? (margenTotal / ingresosTotales) * 100 : 0;

  // Convertir a arrays y ordenar
  const ingresosPorClienteArray = Object.entries(ingresosPorCliente)
    .map(([cliente, datos]) => ({
      cliente,
      ingresos: datos.ingresos,
      embarques: datos.embarques,
    }))
    .sort((a, b) => b.ingresos - a.ingresos);

  const costosPorNavieraArray = Object.entries(costosPorNaviera)
    .map(([naviera, datos]) => ({
      naviera,
      costos: datos.costos,
      embarques: datos.embarques,
    }))
    .sort((a, b) => b.costos - a.costos);

  const margenPorClienteArray = Object.entries(margenPorCliente)
    .map(([cliente, datos]) => {
      const { margen, porcentaje } = calcularMargen(datos.ingresos, datos.costos);
      return {
        cliente,
        margen,
        margenPorcentaje: porcentaje,
      };
    })
    .sort((a, b) => b.margen - a.margen);

  const totalEmbarques = registrosValidos.length;
  const promedioIngresoPorEmbarque = totalEmbarques > 0 ? ingresosTotales / totalEmbarques : 0;
  const promedioCostoPorEmbarque = totalEmbarques > 0 ? costosTotales / totalEmbarques : 0;
  const promedioMargenPorEmbarque = totalEmbarques > 0 ? margenTotal / totalEmbarques : 0;

  return {
    ingresosTotales,
    ingresosPorCliente: ingresosPorClienteArray,
    costosTotales,
    costosPorNaviera: costosPorNavieraArray,
    costosPorTipo,
    margenTotal,
    margenPorcentaje,
    margenPorCliente: margenPorClienteArray,
    totalEmbarques,
    promedioIngresoPorEmbarque,
    promedioCostoPorEmbarque,
    promedioMargenPorEmbarque,
  };
}
