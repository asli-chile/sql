-- =====================================================
-- CREAR TABLA DE ESCALAS PARA SERVICIOS
-- =====================================================
-- Esta tabla permite definir los puertos de escalada (PODs)
-- que siempre usa un servicio, para luego solo cambiar las fechas
-- =====================================================

-- Tabla de escalas (PODs) de cada servicio
CREATE TABLE IF NOT EXISTS public.servicios_escalas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  servicio_id UUID NOT NULL REFERENCES public.servicios(id) ON DELETE CASCADE,
  puerto TEXT NOT NULL,                     -- Código del puerto (ej: "YOKO", "NING", "HKG")
  puerto_nombre TEXT,                       -- Nombre completo del puerto
  area TEXT DEFAULT 'ASIA',                 -- Área geográfica: ASIA, EUROPA, AMERICA, INDIA-MEDIOORIENTE
  orden INTEGER NOT NULL,                   -- Orden de la escala (1, 2, 3...)
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  updated_by TEXT,
  
  -- Constraint único: un puerto no puede repetirse en el mismo servicio
  CONSTRAINT unique_servicio_puerto UNIQUE (servicio_id, puerto)
);

-- Índices para mejorar búsquedas
CREATE INDEX IF NOT EXISTS idx_servicios_escalas_servicio_id ON public.servicios_escalas(servicio_id);
CREATE INDEX IF NOT EXISTS idx_servicios_escalas_orden ON public.servicios_escalas(servicio_id, orden);
CREATE INDEX IF NOT EXISTS idx_servicios_escalas_activo ON public.servicios_escalas(activo);

-- Trigger para actualizar updated_at automáticamente
DROP TRIGGER IF EXISTS update_servicios_escalas_updated_at_trigger ON public.servicios_escalas;
CREATE TRIGGER update_servicios_escalas_updated_at_trigger
    BEFORE UPDATE ON public.servicios_escalas
    FOR EACH ROW
    EXECUTE FUNCTION update_servicios_updated_at();

-- Habilitar RLS
ALTER TABLE public.servicios_escalas ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS básicas
DROP POLICY IF EXISTS servicios_escalas_select_policy ON public.servicios_escalas;
CREATE POLICY servicios_escalas_select_policy
ON public.servicios_escalas
FOR SELECT
USING (true);

DROP POLICY IF EXISTS servicios_escalas_insert_policy ON public.servicios_escalas;
CREATE POLICY servicios_escalas_insert_policy
ON public.servicios_escalas
FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS servicios_escalas_update_policy ON public.servicios_escalas;
CREATE POLICY servicios_escalas_update_policy
ON public.servicios_escalas
FOR UPDATE
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS servicios_escalas_delete_policy ON public.servicios_escalas;
CREATE POLICY servicios_escalas_delete_policy
ON public.servicios_escalas
FOR DELETE
USING (true);

-- Agregar comentarios
COMMENT ON TABLE public.servicios_escalas IS 'Puertos de escalada (PODs) que siempre usa un servicio';
COMMENT ON COLUMN public.servicios_escalas.servicio_id IS 'ID del servicio';
COMMENT ON COLUMN public.servicios_escalas.puerto IS 'Código del puerto de escalada (POD)';
COMMENT ON COLUMN public.servicios_escalas.puerto_nombre IS 'Nombre completo del puerto';
COMMENT ON COLUMN public.servicios_escalas.area IS 'Área geográfica del puerto';
COMMENT ON COLUMN public.servicios_escalas.orden IS 'Orden de la escala en el servicio';
COMMENT ON COLUMN public.servicios_escalas.activo IS 'Indica si la escala está activa';

-- Verificar que la tabla se creó correctamente
SELECT 
  table_name,
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'servicios_escalas'
ORDER BY table_name, ordinal_position;
