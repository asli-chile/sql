// Tipos TypeScript para el sistema de servicios navieros
// Arquitectura: Separación estricta entre Servicios Únicos y Consorcios

// ============================================
// SERVICIOS ÚNICOS
// ============================================

export type ServicioUnico = {
  id: string;
  nombre: string; // Ej: "INCA", "AX1", "AN1"
  naviera_id: string;
  naviera_nombre?: string; // Para mostrar en UI
  descripcion: string | null;
  puerto_origen: string | null; // Puerto de origen del servicio
  activo: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  naves?: ServicioUnicoNave[];
  destinos?: ServicioUnicoDestino[];
};

export type ServicioUnicoNave = {
  id: string;
  servicio_unico_id: string;
  nave_nombre: string;
  activo: boolean;
  orden: number;
  created_at: string;
  updated_at: string;
};

export type ServicioUnicoDestino = {
  id: string;
  servicio_unico_id: string;
  puerto: string; // Código del puerto (ej: "YOKO", "SHAN")
  puerto_nombre: string | null;
  area: string; // ASIA, EUROPA, AMERICA, INDIA-MEDIOORIENTE
  orden: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
};

// ============================================
// CONSORCIOS (SERVICIOS COMPARTIDOS)
// ============================================

export type Consorcio = {
  id: string;
  nombre: string; // Ej: "ANDES EXPRESS", "ASIA EXPRESS"
  descripcion: string | null;
  activo: boolean;
  requiere_revision: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  servicios?: ConsorcioServicio[];
  destinos_activos?: ConsorcioDestinoActivo[];
};

export type ConsorcioServicio = {
  id: string;
  consorcio_id: string;
  servicio_unico_id: string;
  servicio_unico?: ServicioUnico; // Para mostrar en UI
  orden: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
};

export type ConsorcioDestinoActivo = {
  id: string;
  consorcio_id: string;
  servicio_unico_id: string;
  destino_id: string;
  destino?: ServicioUnicoDestino; // Para mostrar en UI
  activo: boolean;
  orden: number; // Orden en el consorcio (puede diferir del orden en el servicio único)
  created_at: string;
  updated_at: string;
};

// ============================================
// FORMULARIOS Y DTOs
// ============================================

export type ServicioUnicoFormData = {
  nombre: string;
  naviera_id: string;
  descripcion: string;
  puerto_origen: string; // Puerto de origen del servicio
  naves: string[]; // Array de nombres de naves
  destinos: Array<{
    puerto: string;
    puerto_nombre: string;
    area: string;
    orden: number;
  }>;
};

export type ConsorcioFormData = {
  nombre: string;
  descripcion: string;
  servicios_unicos: Array<{
    servicio_unico_id: string;
    orden: number;
    destinos_activos: Array<{
      destino_id: string;
      orden: number;
    }>;
  }>;
};

// ============================================
// RESPUESTAS DE API
// ============================================

export type ServiciosUnicosResponse = {
  success: boolean;
  servicios: ServicioUnico[];
  error?: string;
};

export type ConsorciosResponse = {
  success: boolean;
  consorcios: Consorcio[];
  error?: string;
};

export type ServicioUnicoResponse = {
  success: boolean;
  servicio: ServicioUnico;
  error?: string;
};

export type ConsorcioResponse = {
  success: boolean;
  consorcio: Consorcio;
  error?: string;
};
