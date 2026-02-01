// Tipos para el sistema de plantillas de proforma

export interface PlantillaProforma {
  id: string;
  nombre: string;
  cliente: string | null; // NULL = plantilla genérica
  descripcion: string | null;
  tipo_factura: 'proforma' | 'commercial_invoice' | 'packing_list';
  archivo_url: string;
  archivo_nombre: string;
  archivo_size: number | null;
  configuracion: PlantillaConfiguracion;
  marcadores_usados: string[];
  version: number;
  activa: boolean;
  es_default: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface PlantillaConfiguracion {
  idioma?: 'es' | 'en' | 'zh';
  formato_fecha?: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  moneda?: 'USD' | 'EUR' | 'CLP';
  separador_decimal?: '.' | ',';
  incluir_logo?: boolean;
  hoja_inicio?: number; // Hoja de Excel donde empezar (0-indexed)
  fila_productos?: number; // Fila donde está la tabla de productos
  notas_especiales?: string;
}

export interface PlantillaFormData {
  nombre: string;
  cliente: string;
  descripcion: string;
  tipo_factura: 'proforma' | 'commercial_invoice' | 'packing_list';
  archivo: File | null;
  configuracion: PlantillaConfiguracion;
  activa: boolean;
  es_default: boolean;
}

// Datos para reemplazar marcadores
export interface DatosPlantilla {
  // Exportador
  exportador_nombre: string;
  exportador_rut: string;
  exportador_giro: string;
  exportador_direccion: string;
  exportador_email: string;
  
  // Consignee
  consignee_company: string;
  consignee_address: string;
  consignee_attn: string;
  consignee_uscc: string;
  consignee_mobile: string;
  consignee_email: string;
  consignee_zip: string;
  consignee_pais: string;
  
  // Notify Party
  notify_company?: string;
  notify_address?: string;
  notify_attn?: string;
  notify_uscc?: string;
  notify_mobile?: string;
  notify_email?: string;
  notify_zip?: string;
  
  // Embarque
  fecha_factura: string;
  invoice_number: string;
  embarque_number: string;
  csp?: string;
  csg?: string;
  fecha_embarque: string;
  motonave: string;
  viaje: string;
  modalidad_venta?: string;
  clausula_venta: string;
  pais_origen: string;
  puerto_embarque: string;
  puerto_destino: string;
  pais_destino: string;
  forma_pago: string;
  contenedor?: string;
  
  // Referencias
  ref_asli: string;
  booking: string;
  ref_cliente?: string;
  
  // Productos
  productos: ProductoPlantilla[];
  
  // Totales
  cantidad_total: number;
  peso_neto_total: number;
  peso_bruto_total: number;
  valor_total: number;
  valor_total_texto: string;
  
  // Fecha/Hora
  fecha_hoy: string;
  fecha_hoy_largo: string;
  hora_actual: string;
}

export interface ProductoPlantilla {
  cantidad: number;
  tipo_envase: string;
  especie?: string;
  variedad: string;
  categoria: string;
  etiqueta: string;
  calibre: string;
  kg_neto_unidad: number;
  kg_bruto_unidad: number;
  precio_caja: number;
  total: number;
}

// Marcadores disponibles en el sistema
export const MARCADORES_DISPONIBLES = {
  // Exportador
  EXPORTADOR_NOMBRE: '{{EXPORTADOR_NOMBRE}}',
  EXPORTADOR_RUT: '{{EXPORTADOR_RUT}}',
  EXPORTADOR_GIRO: '{{EXPORTADOR_GIRO}}',
  EXPORTADOR_DIRECCION: '{{EXPORTADOR_DIRECCION}}',
  EXPORTADOR_EMAIL: '{{EXPORTADOR_EMAIL}}',
  
  // Consignee
  CONSIGNEE_COMPANY: '{{CONSIGNEE_COMPANY}}',
  CONSIGNEE_ADDRESS: '{{CONSIGNEE_ADDRESS}}',
  CONSIGNEE_ATTN: '{{CONSIGNEE_ATTN}}',
  CONSIGNEE_USCC: '{{CONSIGNEE_USCC}}',
  CONSIGNEE_MOBILE: '{{CONSIGNEE_MOBILE}}',
  CONSIGNEE_EMAIL: '{{CONSIGNEE_EMAIL}}',
  CONSIGNEE_ZIP: '{{CONSIGNEE_ZIP}}',
  CONSIGNEE_PAIS: '{{CONSIGNEE_PAIS}}',
  
  // Notify Party
  NOTIFY_COMPANY: '{{NOTIFY_COMPANY}}',
  NOTIFY_ADDRESS: '{{NOTIFY_ADDRESS}}',
  NOTIFY_ATTN: '{{NOTIFY_ATTN}}',
  NOTIFY_USCC: '{{NOTIFY_USCC}}',
  NOTIFY_MOBILE: '{{NOTIFY_MOBILE}}',
  NOTIFY_EMAIL: '{{NOTIFY_EMAIL}}',
  NOTIFY_ZIP: '{{NOTIFY_ZIP}}',
  
  // Embarque
  FECHA_FACTURA: '{{FECHA_FACTURA}}',
  INVOICE_NUMBER: '{{INVOICE_NUMBER}}',
  EMBARQUE_NUMBER: '{{EMBARQUE_NUMBER}}',
  CSP: '{{CSP}}',
  CSG: '{{CSG}}',
  FECHA_EMBARQUE: '{{FECHA_EMBARQUE}}',
  MOTONAVE: '{{MOTONAVE}}',
  VIAJE: '{{VIAJE}}',
  MODALIDAD_VENTA: '{{MODALIDAD_VENTA}}',
  CLAUSULA_VENTA: '{{CLAUSULA_VENTA}}',
  PAIS_ORIGEN: '{{PAIS_ORIGEN}}',
  PUERTO_EMBARQUE: '{{PUERTO_EMBARQUE}}',
  PUERTO_DESTINO: '{{PUERTO_DESTINO}}',
  PAIS_DESTINO: '{{PAIS_DESTINO}}',
  FORMA_PAGO: '{{FORMA_PAGO}}',
  CONTENEDOR: '{{CONTENEDOR}}',
  
  // Referencias
  REF_ASLI: '{{REF_ASLI}}',
  BOOKING: '{{BOOKING}}',
  REF_CLIENTE: '{{REF_CLIENTE}}',
  
  // Productos (tabla automática)
  PRODUCTO_CANTIDAD: '{{PRODUCTO_CANTIDAD}}',
  PRODUCTO_TIPO_ENVASE: '{{PRODUCTO_TIPO_ENVASE}}',
  PRODUCTO_ESPECIE: '{{PRODUCTO_ESPECIE}}',
  PRODUCTO_VARIEDAD: '{{PRODUCTO_VARIEDAD}}',
  PRODUCTO_CATEGORIA: '{{PRODUCTO_CATEGORIA}}',
  PRODUCTO_ETIQUETA: '{{PRODUCTO_ETIQUETA}}',
  PRODUCTO_CALIBRE: '{{PRODUCTO_CALIBRE}}',
  PRODUCTO_KG_NETO_UNIDAD: '{{PRODUCTO_KG_NETO_UNIDAD}}',
  PRODUCTO_KG_BRUTO_UNIDAD: '{{PRODUCTO_KG_BRUTO_UNIDAD}}',
  PRODUCTO_PRECIO_CAJA: '{{PRODUCTO_PRECIO_CAJA}}',
  PRODUCTO_TOTAL: '{{PRODUCTO_TOTAL}}',
  
  // Totales
  CANTIDAD_TOTAL: '{{CANTIDAD_TOTAL}}',
  PESO_NETO_TOTAL: '{{PESO_NETO_TOTAL}}',
  PESO_BRUTO_TOTAL: '{{PESO_BRUTO_TOTAL}}',
  VALOR_TOTAL: '{{VALOR_TOTAL}}',
  VALOR_TOTAL_TEXTO: '{{VALOR_TOTAL_TEXTO}}',
  
  // Fecha/Hora
  FECHA_HOY: '{{FECHA_HOY}}',
  FECHA_HOY_LARGO: '{{FECHA_HOY_LARGO}}',
  HORA_ACTUAL: '{{HORA_ACTUAL}}',
};

// Helper para obtener lista de marcadores como array
export const LISTA_MARCADORES = Object.values(MARCADORES_DISPONIBLES);
