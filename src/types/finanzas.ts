// Tipos para información financiera de embarques

export interface CostosEmbarque {
  id?: string;
  registroId: string;
  booking: string;
  
  // Costos principales
  flete: number | null; // Costo del flete
  deposito: number | null; // Costo del depósito
  tarifasExtra: number | null; // Tarifas adicionales (demoras, almacenaje, etc.)
  
  // Desglose de tarifas extra (opcional)
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
    flete: number;
    deposito: number;
    tarifasExtra: number;
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
