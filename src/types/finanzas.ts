// Tipos para información financiera de embarques

export interface CostosEmbarque {
  id?: string;
  registroId: string;
  booking: string;

  // Detalle Reserva
  swb?: string;

  // Transporte Terrestre
  tt_flete: number | null;
  tt_sobre_estadia: number | null;
  tt_porteo: number | null;
  tt_almacenamiento: number | null;

  // Coordinación
  coord_adm_espacio: number | null;
  coord_comex: number | null;
  coord_aga: number | null;

  // Costos Navieros
  nav_gate_out: number | null;
  nav_seguridad_contenedor: number | null;
  nav_matriz_fuera_plazo: number | null;
  nav_correcciones: number | null;
  nav_extra_late: number | null;
  nav_telex_release: number | null;
  nav_courier: number | null;
  nav_pago_sag_cf_extra: number | null;
  nav_pago_ucco_co_extra: number | null;

  // Otros
  rebates: number | null;
  contrato_forwarder?: string;

  // Campos legacy (mantener por compatibilidad si es necesario, o marcar como opcionales/deprecated)
  flete?: number | null;
  deposito?: number | null;
  tarifasExtra?: number | null;
  demoras?: number | null;
  almacenaje?: number | null;
  otros?: number | null;

  // Ingresos
  ingresos: number | null; // Ingresos totales del embarque

  // Metadatos
  moneda?: string; // Por defecto USD o CLP
  fechaActualizacion?: Date;
  notas?: string;

  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
  updatedBy?: string;
}

export interface ReporteFinanciero {
  // Ingresos
  ingresosTotales: number;
  ingresosPorCliente: Array<{
    cliente: string;
    ingresos: number;
    embarques: number;
  }>;

  // Costos
  costosTotales: number;
  costosPorNaviera: Array<{
    naviera: string;
    costos: number;
    embarques: number;
  }>;
  costosPorTipo: {
    transporteTerrestre: number;
    coordinacion: number;
    costosNavieros: number;
    otros: number;
  };

  // Margen
  margenTotal: number;
  margenPorcentaje: number;
  margenPorCliente: Array<{
    cliente: string;
    margen: number;
    margenPorcentaje: number;
  }>;

  // Estadísticas
  totalEmbarques: number;
  promedioIngresoPorEmbarque: number;
  promedioCostoPorEmbarque: number;
  promedioMargenPorEmbarque: number;
}
