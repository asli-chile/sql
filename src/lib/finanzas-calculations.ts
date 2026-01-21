import { Registro } from '@/types/registros';
import { CostosEmbarque, ReporteFinanciero } from '@/types/finanzas';

/**
 * Calcula el costo total de un embarque
 */
export function calcularCostoTotal(costos: CostosEmbarque): number {
  // Transporte Terrestre
  const tt = (costos.tt_flete || 0) +
    (costos.tt_sobre_estadia || 0) +
    (costos.tt_porteo || 0) +
    (costos.tt_almacenamiento || 0);

  // Coordinación
  const coord = (costos.coord_adm_espacio || 0) +
    (costos.coord_comex || 0) +
    (costos.coord_aga || 0);

  // Costos Navieros
  const nav = (costos.nav_gate_out || 0) +
    (costos.nav_seguridad_contenedor || 0) +
    (costos.nav_matriz_fuera_plazo || 0) +
    (costos.nav_correcciones || 0) +
    (costos.nav_extra_late || 0) +
    (costos.nav_telex_release || 0) +
    (costos.nav_courier || 0) +
    (costos.nav_pago_sag_cf_extra || 0) +
    (costos.nav_pago_ucco_co_extra || 0);

  // Legacy (mantener por si acaso hay datos antiguos)
  const legacy = (costos.flete || 0) + (costos.deposito || 0) + (costos.tarifasExtra || 0);

  // Rebates (se restan del costo total? Por ahora lo dejamos fuera del total de costos directos o lo restamos?
  // Generalmente rebates reduce el costo. Asumiremos que reduce el costo.)
  const rebates = costos.rebates || 0;

  return tt + coord + nav + legacy - rebates;
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
    transporteTerrestre: 0,
    coordinacion: 0,
    costosNavieros: 0,
    otros: 0,
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
    // Por tipo de costo
    if (costo) {
      // Transporte Terrestre
      costosPorTipo.transporteTerrestre += (costo.tt_flete || 0) +
        (costo.tt_sobre_estadia || 0) +
        (costo.tt_porteo || 0) +
        (costo.tt_almacenamiento || 0);

      // Coordinación
      costosPorTipo.coordinacion += (costo.coord_adm_espacio || 0) +
        (costo.coord_comex || 0) +
        (costo.coord_aga || 0);

      // Costos Navieros
      costosPorTipo.costosNavieros += (costo.nav_gate_out || 0) +
        (costo.nav_seguridad_contenedor || 0) +
        (costo.nav_matriz_fuera_plazo || 0) +
        (costo.nav_correcciones || 0) +
        (costo.nav_extra_late || 0) +
        (costo.nav_telex_release || 0) +
        (costo.nav_courier || 0) +
        (costo.nav_pago_sag_cf_extra || 0) +
        (costo.nav_pago_ucco_co_extra || 0);

      // Otros/Legacy
      costosPorTipo.otros += (costo.flete || 0) + (costo.deposito || 0) + (costo.tarifasExtra || 0) - (costo.rebates || 0);
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
