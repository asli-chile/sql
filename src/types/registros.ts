// Tipos para los registros de embarques
export interface Registro {
  id?: string;
  // Datos básicos
  ingresado: Date | null;
  refAsli: string;
  ejecutivo: string;
  shipper: string;
  booking: string;
  contenedor: string;
  naviera: string;
  naveInicial: string;
  // Número de viaje (opcional); se muestra entre corchetes en UI
  viaje?: string | null;
  especie: string;
  temperatura: number | null;
  cbm: number | null;
  ct: string;
  co2: number | null;
  o2: number | null;
  pol: string;
  pod: string;
  deposito: string;
  etd: Date | null;
  eta: Date | null;
  tt: number | null;
  flete: string;
  estado: 'PENDIENTE' | 'CONFIRMADO' | 'CANCELADO';
  roleadaDesde: string;
  ingresoStacking: Date | null;
  tipoIngreso: 'NORMAL' | 'EARLY' | 'LATE' | 'EXTRA LATE';
  numeroBl: string;
  estadoBl: string;
  contrato: string;
  semanaIngreso: number | null;
  mesIngreso: number | null;
  semanaZarpe: number | null;
  mesZarpe: number | null;
  semanaArribo: number | null;
  mesArribo: number | null;
  facturacion: string;
  bookingPdf: string;
  comentario: string;
  observacion: string;
  
  // Metadatos
  rowOriginal?: number;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
  updatedBy?: string;
  deletedAt?: Date | null;
  deletedBy?: string;
}

export interface ControlOperacional {
  id?: string;
  // Datos básicos
  ejecutivo: string;
  cliente: string;
  refAsli: string;
  refCliente: string;
  tipoTransporte: 'AÉREO' | 'MARÍTIMO';
  booking: string;
  nave: string;
  naviera: string;
  especie: string;
  puertoEmbarque: string;
  destino: string;
  etd: Date | null;
  eta: Date | null;
  consignatario: string;
  prepaidCollect: string;
  planta: string;
  emision: string;
  deposito: string;
  transporte: string;
  contenedor: string;
  sello: string;
  tara: number | null;
  porteo: string;
  sps: string;
  dus: string;
  numeroGuiaDespacho: string;
  fechaGuia: Date | null;
  tramo: string;
  valorFlete: number | null;
  
  // Estados operacionales
  sobreEstadia: boolean;
  normal: boolean;
  late: boolean;
  extraLate: boolean;
  
  // Documentos
  numeroProforma: string;
  valor5: number | null;
  valor25: number | null;
  kilosNetos: number | null;
  numeroBl: string;
  estadoBl: string;
  aceptado: boolean;
  legalizado: boolean;
  
  // Metadatos
  rowOriginal?: number;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
  updatedBy?: string;
}
