/**
 * Configuración de anchos de columnas para la página de Registros
 * 
 * NOTA: Para aplicar cambios de ancho:
 * 1. Modifica el valor de 'width' de la columna deseada
 * 2. Guarda el archivo
 * 3. Si los cambios no se aplican inmediatamente, ejecuta el script:
 *    scripts/resetear-anchos-columnas-registros.sql
 */

export interface ColumnaConfig {
  field: string;
  headerName: string;
  width: number;
  pinned?: 'left' | 'right';
}

export const ANCHOS_COLUMNAS: ColumnaConfig[] = [
  // Columnas principales (pinned)
  { field: 'refCliente', headerName: 'REF Cliente', width: 139, pinned: 'left' },
  { field: 'refAsli', headerName: 'REF ASLI', width: 122, pinned: 'left' },
  
  // Información básica
  { field: 'ejecutivo', headerName: 'Ejecutivo', width: 158 },
  { field: 'shipper', headerName: 'Cliente', width: 120 },
  { field: 'booking', headerName: 'Booking', width: 125 },
  { field: 'contenedor', headerName: 'Contenedor', width: 140 },
  
  // Transporte
  { field: 'naviera', headerName: 'Naviera', width: 120 },
  { field: 'naveInicial', headerName: 'Nave', width: 210 },
  { field: 'viaje', headerName: 'Viaje', width: 120 },
  
  // Producto y destino
  { field: 'especie', headerName: 'Especie', width: 160},
  { field: 'pol', headerName: 'POL', width: 120 },
  { field: 'pod', headerName: 'POD', width: 120 },
  { field: 'deposito', headerName: 'Depósito', width: 130 },
  
  // Fechas
  { field: 'etd', headerName: 'ETD', width: 110 },
  { field: 'eta', headerName: 'ETA', width: 110 },
  { field: 'tt', headerName: 'TT', width: 100 },
  
  // Estado y tipo
  { field: 'estado', headerName: 'Estado', width: 120 },
  { field: 'flete', headerName: 'Flete', width: 120 },
  { field: 'tipoIngreso', headerName: 'Tipo Ingreso', width: 150 },
  
  // Especificaciones técnicas
  { field: 'temperatura', headerName: 'Temp (°C)', width: 140 },
  { field: 'cbm', headerName: 'CBM', width: 100 },
  { field: 'ingresado', headerName: 'Ingresado', width: 147 },
  { field: 'usuario', headerName: 'Usuario', width: 138 },
  
  // Cliente y contrato
  { field: 'clienteAbr', headerName: 'Cliente Abr', width: 120 },
  { field: 'ct', headerName: 'CT', width: 90 },
  { field: 'co2', headerName: 'CO2', width: 100 },
  { field: 'o2', headerName: 'O2', width: 90 },
  
  // Tratamiento
  { field: 'tratamientoFrio', headerName: 'Tratamiento Frío', width: 154 },
  { field: 'tipoAtmosfera', headerName: 'Tipo Atmósfera', width: 160 },
  { field: 'roleadaDesde', headerName: 'Roleada Desde', width: 134 },
  { field: 'ingresoStacking', headerName: 'Ingreso Stacking', width: 173 },
  
  // Documentación
  { field: 'numeroBl', headerName: 'Número BL', width: 142 },
  { field: 'estadoBl', headerName: 'Estado BL', width: 132 },
  { field: 'contrato', headerName: 'Contrato', width: 130 },
  
  // Semanas y meses
  { field: 'semanaIngreso', headerName: 'Semana Ingreso', width: 165 },
  { field: 'mesIngreso', headerName: 'Mes Ingreso', width: 130 },
  { field: 'semanaZarpe', headerName: 'Semana Zarpe', width: 160 },
  { field: 'mesZarpe', headerName: 'Mes Zarpe', width: 120 },
  { field: 'semanaArribo', headerName: 'Semana Arribo', width: 150 },
  { field: 'mesArribo', headerName: 'Mes Arribo', width: 120 },
  
  // Otros
  { field: 'facturacion', headerName: 'Facturación', width: 140 },
  { field: 'bookingPdf', headerName: 'Booking PDF', width: 152 },
  { field: 'comentario', headerName: 'Comentario', width: 200 },
  { field: 'observacion', headerName: 'Observación', width: 200 },
  { field: 'temporada', headerName: 'Temporada', width: 150 },
  { field: 'historial', headerName: 'Historial', width: 120 },
];

/**
 * Obtener el ancho de una columna por su field
 */
export function obtenerAnchoColumna(field: string): number {
  const columna = ANCHOS_COLUMNAS.find(col => col.field === field);
  return columna?.width || 120; // Ancho por defecto: 120px
}

/**
 * Crear un mapa de anchos para fácil acceso
 */
export function crearMapaAnchos(): Map<string, number> {
  return new Map(ANCHOS_COLUMNAS.map(col => [col.field, col.width]));
}
