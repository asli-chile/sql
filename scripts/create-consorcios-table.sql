-- =====================================================
-- CREAR TABLAS DE CONSORCIOS (SERVICIOS COMPARTIDOS)
-- =====================================================
-- Este script crea las tablas necesarias para gestionar
-- consorcios que agrupan servicios únicos existentes
-- =====================================================

-- Crear extensión gen_random_uuid si no existe
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Tabla principal de consorcios
CREATE TABLE IF NOT EXISTS public.consorcios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,                       -- Ej: "ANDES EXPRESS", "ASIA EXPRESS"
  descripcion TEXT,
  activo BOOLEAN DEFAULT true,
  requiere_revision BOOLEAN DEFAULT false,           -- Flag si algún servicio único está inactivo
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  updated_by TEXT
);

-- Tabla de unión: consorcios <-> servicios únicos
CREATE TABLE IF NOT EXISTS public.consorcios_servicios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consorcio_id UUID NOT NULL REFERENCES public.consorcios(id) ON DELETE CASCADE,
  servicio_unico_id UUID NOT NULL REFERENCES public.servicios_unicos(id) ON DELETE RESTRICT,
  orden INTEGER DEFAULT 0,                          -- Orden de visualización
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint: un servicio único no puede estar duplicado en el mismo consorcio
  CONSTRAINT unique_consorcio_servicio_unico UNIQUE (consorcio_id, servicio_unico_id)
);

-- Tabla de destinos activos por consorcio
-- Define qué destinos de cada servicio único están activos en el consorcio
CREATE TABLE IF NOT EXISTS public.consorcios_destinos_activos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consorcio_id UUID NOT NULL REFERENCES public.consorcios(id) ON DELETE CASCADE,
  servicio_unico_id UUID NOT NULL REFERENCES public.servicios_unicos(id) ON DELETE CASCADE,
  destino_id UUID NOT NULL REFERENCES public.servicios_unicos_destinos(id) ON DELETE CASCADE,
  activo BOOLEAN DEFAULT true,
  orden INTEGER NOT NULL,                            -- Orden de visualización en el consorcio
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint: un destino no puede estar duplicado en el mismo consorcio para el mismo servicio
  CONSTRAINT unique_consorcio_servicio_destino UNIQUE (consorcio_id, servicio_unico_id, destino_id)
);

-- Índices para mejorar búsquedas
CREATE INDEX IF NOT EXISTS idx_consorcios_nombre ON public.consorcios(nombre);
CREATE INDEX IF NOT EXISTS idx_consorcios_activo ON public.consorcios(activo);
CREATE INDEX IF NOT EXISTS idx_consorcios_servicios_consorcio_id ON public.consorcios_servicios(consorcio_id);
CREATE INDEX IF NOT EXISTS idx_consorcios_servicios_servicio_unico_id ON public.consorcios_servicios(servicio_unico_id);
CREATE INDEX IF NOT EXISTS idx_consorcios_destinos_activos_consorcio_id ON public.consorcios_destinos_activos(consorcio_id);
CREATE INDEX IF NOT EXISTS idx_consorcios_destinos_activos_servicio_unico_id ON public.consorcios_destinos_activos(servicio_unico_id);
CREATE INDEX IF NOT EXISTS idx_consorcios_destinos_activos_orden ON public.consorcios_destinos_activos(consorcio_id, orden);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_consorcios_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_consorcios_updated_at_trigger ON public.consorcios;
CREATE TRIGGER update_consorcios_updated_at_trigger
    BEFORE UPDATE ON public.consorcios
    FOR EACH ROW
    EXECUTE FUNCTION update_consorcios_updated_at();

DROP TRIGGER IF EXISTS update_consorcios_servicios_updated_at_trigger ON public.consorcios_servicios;
CREATE TRIGGER update_consorcios_servicios_updated_at_trigger
    BEFORE UPDATE ON public.consorcios_servicios
    FOR EACH ROW
    EXECUTE FUNCTION update_consorcios_updated_at();

DROP TRIGGER IF EXISTS update_consorcios_destinos_activos_updated_at_trigger ON public.consorcios_destinos_activos;
CREATE TRIGGER update_consorcios_destinos_activos_updated_at_trigger
    BEFORE UPDATE ON public.consorcios_destinos_activos
    FOR EACH ROW
    EXECUTE FUNCTION update_consorcios_updated_at();

-- Función para marcar consorcios que requieren revisión cuando un servicio único se desactiva
CREATE OR REPLACE FUNCTION marcar_consorcios_requiere_revision()
RETURNS TRIGGER AS $$
BEGIN
  -- Si un servicio único se desactiva, marcar todos los consorcios que lo incluyen
  IF NEW.activo = false AND OLD.activo = true THEN
    UPDATE public.consorcios
    SET requiere_revision = true
    WHERE id IN (
      SELECT DISTINCT consorcio_id
      FROM public.consorcios_servicios
      WHERE servicio_unico_id = NEW.id
    );
  END IF;
  
  -- Si un servicio único se reactiva, verificar si todos los servicios del consorcio están activos
  IF NEW.activo = true AND OLD.activo = false THEN
    UPDATE public.consorcios
    SET requiere_revision = false
    WHERE id IN (
      SELECT DISTINCT cs.consorcio_id
      FROM public.consorcios_servicios cs
      WHERE cs.consorcio_id IN (
        SELECT consorcio_id
        FROM public.consorcios_servicios
        WHERE servicio_unico_id = NEW.id
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.consorcios_servicios cs2
        INNER JOIN public.servicios_unicos su ON cs2.servicio_unico_id = su.id
        WHERE cs2.consorcio_id = cs.consorcio_id
        AND su.activo = false
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS servicios_unicos_marcar_consorcios_revision_trigger ON public.servicios_unicos;
CREATE TRIGGER servicios_unicos_marcar_consorcios_revision_trigger
    AFTER UPDATE OF activo ON public.servicios_unicos
    FOR EACH ROW
    EXECUTE FUNCTION marcar_consorcios_requiere_revision();

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.consorcios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consorcios_servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consorcios_destinos_activos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS básicas
CREATE POLICY "consorcios_select" ON public.consorcios
  FOR SELECT USING (true);

CREATE POLICY "consorcios_insert" ON public.consorcios
  FOR INSERT WITH CHECK (true);

CREATE POLICY "consorcios_update" ON public.consorcios
  FOR UPDATE USING (true);

CREATE POLICY "consorcios_delete" ON public.consorcios
  FOR DELETE USING (true);

CREATE POLICY "consorcios_servicios_select" ON public.consorcios_servicios
  FOR SELECT USING (true);

CREATE POLICY "consorcios_servicios_insert" ON public.consorcios_servicios
  FOR INSERT WITH CHECK (true);

CREATE POLICY "consorcios_servicios_update" ON public.consorcios_servicios
  FOR UPDATE USING (true);

CREATE POLICY "consorcios_servicios_delete" ON public.consorcios_servicios
  FOR DELETE USING (true);

CREATE POLICY "consorcios_destinos_activos_select" ON public.consorcios_destinos_activos
  FOR SELECT USING (true);

CREATE POLICY "consorcios_destinos_activos_insert" ON public.consorcios_destinos_activos
  FOR INSERT WITH CHECK (true);

CREATE POLICY "consorcios_destinos_activos_update" ON public.consorcios_destinos_activos
  FOR UPDATE USING (true);

CREATE POLICY "consorcios_destinos_activos_delete" ON public.consorcios_destinos_activos
  FOR DELETE USING (true);
