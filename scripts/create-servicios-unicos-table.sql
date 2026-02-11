-- =====================================================
-- CREAR TABLAS DE SERVICIOS ÚNICOS
-- =====================================================
-- Este script crea las tablas necesarias para gestionar
-- servicios únicos por naviera (separados de consorcios)
-- =====================================================

-- Crear extensión gen_random_uuid si no existe
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Tabla principal de servicios únicos
CREATE TABLE IF NOT EXISTS public.servicios_unicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,                              -- Ej: "INCA", "AX1", "AN1"
  naviera_id UUID NOT NULL,                          -- Referencia a catalogos_navieras
  descripcion TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  updated_by TEXT,
  
  -- Constraint: nombre único por naviera
  CONSTRAINT unique_servicio_unico_naviera UNIQUE (naviera_id, nombre)
);

-- Tabla de naves asignadas a servicios únicos
CREATE TABLE IF NOT EXISTS public.servicios_unicos_naves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  servicio_unico_id UUID NOT NULL REFERENCES public.servicios_unicos(id) ON DELETE CASCADE,
  nave_nombre TEXT NOT NULL,                         -- Nombre de la nave
  activo BOOLEAN DEFAULT true,
  orden INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint: una nave no puede estar duplicada en el mismo servicio único
  CONSTRAINT unique_servicio_unico_nave UNIQUE (servicio_unico_id, nave_nombre)
);

-- Tabla de destinos (PODs) asignados a servicios únicos
CREATE TABLE IF NOT EXISTS public.servicios_unicos_destinos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  servicio_unico_id UUID NOT NULL REFERENCES public.servicios_unicos(id) ON DELETE CASCADE,
  puerto TEXT NOT NULL,                              -- Código del puerto (ej: "YOKO", "SHAN")
  puerto_nombre TEXT,                                 -- Nombre completo del puerto
  area TEXT DEFAULT 'ASIA',                           -- ASIA, EUROPA, AMERICA, INDIA-MEDIOORIENTE
  orden INTEGER NOT NULL,                             -- Orden de escala
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint: un puerto no puede repetirse en el mismo servicio único
  CONSTRAINT unique_servicio_unico_destino UNIQUE (servicio_unico_id, puerto)
);

-- Índices para mejorar búsquedas
CREATE INDEX IF NOT EXISTS idx_servicios_unicos_naviera_id ON public.servicios_unicos(naviera_id);
CREATE INDEX IF NOT EXISTS idx_servicios_unicos_nombre ON public.servicios_unicos(nombre);
CREATE INDEX IF NOT EXISTS idx_servicios_unicos_activo ON public.servicios_unicos(activo);
CREATE INDEX IF NOT EXISTS idx_servicios_unicos_naves_servicio_id ON public.servicios_unicos_naves(servicio_unico_id);
CREATE INDEX IF NOT EXISTS idx_servicios_unicos_destinos_servicio_id ON public.servicios_unicos_destinos(servicio_unico_id);
CREATE INDEX IF NOT EXISTS idx_servicios_unicos_destinos_orden ON public.servicios_unicos_destinos(servicio_unico_id, orden);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_servicios_unicos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_servicios_unicos_updated_at_trigger ON public.servicios_unicos;
CREATE TRIGGER update_servicios_unicos_updated_at_trigger
    BEFORE UPDATE ON public.servicios_unicos
    FOR EACH ROW
    EXECUTE FUNCTION update_servicios_unicos_updated_at();

DROP TRIGGER IF EXISTS update_servicios_unicos_naves_updated_at_trigger ON public.servicios_unicos_naves;
CREATE TRIGGER update_servicios_unicos_naves_updated_at_trigger
    BEFORE UPDATE ON public.servicios_unicos_naves
    FOR EACH ROW
    EXECUTE FUNCTION update_servicios_unicos_updated_at();

DROP TRIGGER IF EXISTS update_servicios_unicos_destinos_updated_at_trigger ON public.servicios_unicos_destinos;
CREATE TRIGGER update_servicios_unicos_destinos_updated_at_trigger
    BEFORE UPDATE ON public.servicios_unicos_destinos
    FOR EACH ROW
    EXECUTE FUNCTION update_servicios_unicos_updated_at();

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.servicios_unicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicios_unicos_naves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicios_unicos_destinos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS básicas (ajustar según necesidades de seguridad)
-- Permitir lectura a usuarios autenticados
CREATE POLICY "servicios_unicos_select" ON public.servicios_unicos
  FOR SELECT USING (true);

CREATE POLICY "servicios_unicos_naves_select" ON public.servicios_unicos_naves
  FOR SELECT USING (true);

CREATE POLICY "servicios_unicos_destinos_select" ON public.servicios_unicos_destinos
  FOR SELECT USING (true);

-- Permitir inserción/actualización a usuarios autenticados (ajustar según roles)
CREATE POLICY "servicios_unicos_insert" ON public.servicios_unicos
  FOR INSERT WITH CHECK (true);

CREATE POLICY "servicios_unicos_update" ON public.servicios_unicos
  FOR UPDATE USING (true);

CREATE POLICY "servicios_unicos_delete" ON public.servicios_unicos
  FOR DELETE USING (true);

CREATE POLICY "servicios_unicos_naves_insert" ON public.servicios_unicos_naves
  FOR INSERT WITH CHECK (true);

CREATE POLICY "servicios_unicos_naves_update" ON public.servicios_unicos_naves
  FOR UPDATE USING (true);

CREATE POLICY "servicios_unicos_naves_delete" ON public.servicios_unicos_naves
  FOR DELETE USING (true);

CREATE POLICY "servicios_unicos_destinos_insert" ON public.servicios_unicos_destinos
  FOR INSERT WITH CHECK (true);

CREATE POLICY "servicios_unicos_destinos_update" ON public.servicios_unicos_destinos
  FOR UPDATE USING (true);

CREATE POLICY "servicios_unicos_destinos_delete" ON public.servicios_unicos_destinos
  FOR DELETE USING (true);
