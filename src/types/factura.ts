// Tipos para el sistema de facturas

export interface Factura {
  id?: string;
  // Referencia al registro original
  registroId: string;
  refAsli: string; // Para referencia rápida
  
  // Información del exportador
  exportador: {
    nombre: string;
    rut: string;
    giro: string;
    direccion: string;
  };
  
  // Información del consignatario
  consignatario: {
    nombre: string;
    direccion: string;
    email?: string;
    telefono?: string;
    contacto?: string;
    telefonoContacto?: string;
    usci?: string; // Para China
    codigoPostal?: string;
    pais: string;
  };
  
  // Detalles de embarque (vienen de registros o se completan manualmente)
  embarque: {
    fechaFactura: string; // Fecha de la factura
    numeroInvoice: string; // INVOICE N° (independiente del embarque)
    numeroEmbarque: string; // EMBARQUE N°
    csp?: string;
    csg?: string;
    fechaEmbarque: string;
    motonave: string;
    numeroViaje: string;
    modalidadVenta?: string;
    clausulaVenta: string; // FOB, CIF, etc.
    paisOrigen: string;
    puertoEmbarque: string;
    puertoDestino: string;
    paisDestinoFinal: string;
    formaPago: string;
    pesoNetoTotal?: number;
    pesoBrutoTotal?: number;
    contenedor?: string;
  };
  
  // Productos (pueden venir de registros o agregarse manualmente)
  productos: ProductoFactura[];
  
  // Totales
  totales: {
    cantidadTotal: number;
    valorTotal: number;
    valorTotalTexto: string; // "TWO HUNDRED SIXTY THOUSAND US Dollar"
  };
  
  // Metadatos
  clientePlantilla: string; // 'ALMAFRUIT', etc.
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

export interface ProductoFactura {
  cantidad: number;
  tipoEnvase: string; // "CASES"
  variedad: string; // "RED CHERRIES"
  categoria: string; // "CAT 1"
  etiqueta: string; // "ALMAFRUIT"
  calibre: string; // "2J", "3J", "J"
  kgNetoUnidad: number; // 2.50
  kgBrutoUnidad: number; // 3.00
  precioPorCaja: number; // 35.00
  total: number; // Calculado: cantidad * precioPorCaja
}

// Plantilla de factura
export interface PlantillaFactura {
  id?: string;
  cliente: string; // Nombre del cliente
  nombre: string; // Nombre de la plantilla
  configuracion: {
    camposObligatorios: string[];
    camposOpcionales: string[];
    estructura: any; // Estructura de la plantilla
  };
  activa: boolean;
  created_at?: string;
  updated_at?: string;
}

