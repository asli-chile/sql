-- =====================================================
-- OPTIMIZACIÓN DE ÍNDICES PARA MEJORAR RENDIMIENTO
-- =====================================================
-- Este script agrega índices en campos frecuentemente
-- consultados para acelerar las búsquedas y filtros.
-- =====================================================

-- ÍNDICES PARA TABLA REGISTROS
-- =====================================================

-- Índice para deleted_at (usado en casi todas las consultas)
CREATE INDEX IF NOT EXISTS idx_registros_deleted_at 
ON registros(deleted_at) 
WHERE deleted_at IS NULL;

-- Índice para ref_asli (usado para ordenar y filtrar)
CREATE INDEX IF NOT EXISTS idx_registros_ref_asli 
ON registros(ref_asli) 
WHERE deleted_at IS NULL AND ref_asli IS NOT NULL;

-- Índice compuesto para shipper (filtrado por cliente)
CREATE INDEX IF NOT EXISTS idx_registros_shipper 
ON registros(shipper) 
WHERE deleted_at IS NULL;

-- Índice para estado (filtrado frecuente)
CREATE INDEX IF NOT EXISTS idx_registros_estado 
ON registros(estado) 
WHERE deleted_at IS NULL;

-- Índice para temporada (filtrado frecuente)
CREATE INDEX IF NOT EXISTS idx_registros_temporada 
ON registros(temporada) 
WHERE deleted_at IS NULL AND temporada IS NOT NULL;

-- Índice compuesto para búsquedas comunes (shipper + estado + deleted_at)
CREATE INDEX IF NOT EXISTS idx_registros_shipper_estado 
ON registros(shipper, estado) 
WHERE deleted_at IS NULL;

-- Índice para naviera (filtrado frecuente)
CREATE INDEX IF NOT EXISTS idx_registros_naviera 
ON registros(naviera) 
WHERE deleted_at IS NULL;

-- Índice para ejecutivo (filtrado frecuente)
CREATE INDEX IF NOT EXISTS idx_registros_ejecutivo 
ON registros(ejecutivo) 
WHERE deleted_at IS NULL;

-- Índice para updated_at (usado para ordenar)
CREATE INDEX IF NOT EXISTS idx_registros_updated_at 
ON registros(updated_at DESC) 
WHERE deleted_at IS NULL;

-- Índice para etd y eta (filtrado por fechas)
CREATE INDEX IF NOT EXISTS idx_registros_etd 
ON registros(etd) 
WHERE deleted_at IS NULL AND etd IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_registros_eta 
ON registros(eta) 
WHERE deleted_at IS NULL AND eta IS NOT NULL;

-- Índice para booking (búsquedas frecuentes)
CREATE INDEX IF NOT EXISTS idx_registros_booking 
ON registros(booking) 
WHERE deleted_at IS NULL AND booking IS NOT NULL;

-- Índice para contenedor (búsquedas frecuentes)
CREATE INDEX IF NOT EXISTS idx_registros_contenedor 
ON registros(contenedor) 
WHERE deleted_at IS NULL AND contenedor IS NOT NULL;

-- ÍNDICES PARA TABLA TRANSPORTES
-- =====================================================

-- Índice para deleted_at en transportes
CREATE INDEX IF NOT EXISTS idx_transportes_deleted_at 
ON transportes(deleted_at) 
WHERE deleted_at IS NULL;

-- Índice para booking en transportes (búsquedas frecuentes)
CREATE INDEX IF NOT EXISTS idx_transportes_booking 
ON transportes(booking) 
WHERE deleted_at IS NULL AND booking IS NOT NULL;

-- Índice para contenedor en transportes
CREATE INDEX IF NOT EXISTS idx_transportes_contenedor 
ON transportes(contenedor) 
WHERE deleted_at IS NULL AND contenedor IS NOT NULL;

-- Índice para registro_id (relación con registros)
CREATE INDEX IF NOT EXISTS idx_transportes_registro_id 
ON transportes(registro_id) 
WHERE deleted_at IS NULL AND registro_id IS NOT NULL;

-- ÍNDICES PARA TABLAS DE CATÁLOGOS
-- =====================================================

-- Índice para activo en todas las tablas de catálogos
CREATE INDEX IF NOT EXISTS idx_catalogos_navieras_activo 
ON catalogos_navieras(activo) 
WHERE activo = true;

CREATE INDEX IF NOT EXISTS idx_catalogos_ejecutivos_activo 
ON catalogos_ejecutivos(activo) 
WHERE activo = true;

CREATE INDEX IF NOT EXISTS idx_catalogos_clientes_activo 
ON catalogos_clientes(activo) 
WHERE activo = true;

CREATE INDEX IF NOT EXISTS idx_catalogos_destinos_activo 
ON catalogos_destinos(activo) 
WHERE activo = true;

CREATE INDEX IF NOT EXISTS idx_catalogos_naves_activo 
ON catalogos_naves(activo) 
WHERE activo = true;

CREATE INDEX IF NOT EXISTS idx_catalogos_condiciones_activo 
ON catalogos_condiciones(activo) 
WHERE activo = true;

-- Índice para nombre en catálogos (búsquedas y ordenamiento)
CREATE INDEX IF NOT EXISTS idx_catalogos_navieras_nombre 
ON catalogos_navieras(nombre) 
WHERE activo = true;

CREATE INDEX IF NOT EXISTS idx_catalogos_ejecutivos_nombre 
ON catalogos_ejecutivos(nombre) 
WHERE activo = true;

CREATE INDEX IF NOT EXISTS idx_catalogos_clientes_nombre 
ON catalogos_clientes(nombre) 
WHERE activo = true;

CREATE INDEX IF NOT EXISTS idx_catalogos_destinos_nombre 
ON catalogos_destinos(nombre) 
WHERE activo = true;

CREATE INDEX IF NOT EXISTS idx_catalogos_naves_nombre 
ON catalogos_naves(nombre) 
WHERE activo = true;

-- Índice para naviera_nombre en catalogos_naves (relación)
CREATE INDEX IF NOT EXISTS idx_catalogos_naves_naviera 
ON catalogos_naves(naviera_nombre) 
WHERE activo = true AND naviera_nombre IS NOT NULL;

-- ÍNDICES PARA TABLA USUARIOS
-- =====================================================

-- Índice para email (búsquedas frecuentes)
CREATE INDEX IF NOT EXISTS idx_usuarios_email 
ON usuarios(email);

-- Índice para auth_user_id (relación con Supabase Auth)
CREATE INDEX IF NOT EXISTS idx_usuarios_auth_user_id 
ON usuarios(auth_user_id) 
WHERE auth_user_id IS NOT NULL;

-- Índice para rol (filtrado de permisos)
CREATE INDEX IF NOT EXISTS idx_usuarios_rol 
ON usuarios(rol) 
WHERE activo = true;

-- Índice compuesto para activo + rol
CREATE INDEX IF NOT EXISTS idx_usuarios_activo_rol 
ON usuarios(activo, rol) 
WHERE activo = true;

-- ÍNDICES PARA TABLA ITINERARIOS
-- =====================================================

-- Índice para servicio_id (relación con servicios)
CREATE INDEX IF NOT EXISTS idx_itinerarios_servicio_id 
ON itinerarios(servicio_id) 
WHERE servicio_id IS NOT NULL;

-- Índice para etd (fecha estimada de zarpe - ordenamiento frecuente)
CREATE INDEX IF NOT EXISTS idx_itinerarios_etd 
ON itinerarios(etd DESC) 
WHERE etd IS NOT NULL;

-- ÍNDICES PARA TABLA SERVICIOS
-- =====================================================

-- Índice para activo en servicios
CREATE INDEX IF NOT EXISTS idx_servicios_activo 
ON servicios(activo) 
WHERE activo = true;

-- Índice para nombre en servicios (búsquedas)
CREATE INDEX IF NOT EXISTS idx_servicios_nombre 
ON servicios(nombre) 
WHERE activo = true;

-- =====================================================
-- VERIFICAR ÍNDICES CREADOS
-- =====================================================

SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'registros', 
    'transportes', 
    'catalogos_navieras',
    'catalogos_ejecutivos',
    'catalogos_clientes',
    'catalogos_destinos',
    'catalogos_naves',
    'catalogos_condiciones',
    'usuarios',
    'itinerarios',
    'servicios'
  )
ORDER BY tablename, indexname;

-- =====================================================
-- ESTADÍSTICAS DE ÍNDICES
-- =====================================================

-- Actualizar estadísticas para que el planificador use los índices
ANALYZE registros;
ANALYZE transportes;
ANALYZE catalogos_navieras;
ANALYZE catalogos_ejecutivos;
ANALYZE catalogos_clientes;
ANALYZE catalogos_destinos;
ANALYZE catalogos_naves;
ANALYZE catalogos_condiciones;
ANALYZE usuarios;
ANALYZE itinerarios;
ANALYZE servicios;

-- Mensaje de confirmación
SELECT 
  '✅ Índices de rendimiento creados y estadísticas actualizadas' as resultado,
  COUNT(*) as total_indices
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%';
