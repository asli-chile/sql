-- ============================================
-- CREAR TABLA DE CONSIGNATARIOS
-- ============================================
-- Este script crea la tabla para gestionar consignatarios
-- con información de Consignee y Notify
-- Ejecutar en el SQL Editor de Supabase
-- ============================================

-- Crear tabla consignatarios
CREATE TABLE IF NOT EXISTS public.consignatarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  cliente TEXT NOT NULL,
  destino TEXT NOT NULL,
  
  -- Datos del Consignee
  consignee_company TEXT NOT NULL,
  consignee_address TEXT,
  consignee_attn TEXT,
  consignee_uscc TEXT,
  consignee_mobile TEXT,
  consignee_email TEXT,
  consignee_zip TEXT,
  
  -- Datos del Notify/Notificante
  notify_company TEXT NOT NULL,
  notify_address TEXT,
  notify_attn TEXT,
  notify_uscc TEXT,
  notify_mobile TEXT,
  notify_email TEXT,
  notify_zip TEXT,
  
  -- Metadatos
  activo BOOLEAN DEFAULT true,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.usuarios(id),
  
  -- Índice único por nombre + cliente + destino
  CONSTRAINT consignatarios_unique_nombre_cliente_destino UNIQUE (nombre, cliente, destino)
);

-- Crear índices para mejorar búsquedas
CREATE INDEX IF NOT EXISTS idx_consignatarios_nombre ON public.consignatarios(nombre);
CREATE INDEX IF NOT EXISTS idx_consignatarios_cliente ON public.consignatarios(cliente);
CREATE INDEX IF NOT EXISTS idx_consignatarios_destino ON public.consignatarios(destino);
CREATE INDEX IF NOT EXISTS idx_consignatarios_activo ON public.consignatarios(activo);

-- Agregar comentarios
COMMENT ON TABLE public.consignatarios IS 'Tabla de consignatarios con información de Consignee y Notify para facturas';
COMMENT ON COLUMN public.consignatarios.nombre IS 'Nombre del consignatario (ej: HappyFarm)';
COMMENT ON COLUMN public.consignatarios.cliente IS 'Cliente/Shipper asociado';
COMMENT ON COLUMN public.consignatarios.destino IS 'Destino/Puerto (ej: Shanghai, Nansha)';
COMMENT ON COLUMN public.consignatarios.activo IS 'Si está activo para ser usado';

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.consignatarios ENABLE ROW LEVEL SECURITY;

-- Política: Todos los usuarios autenticados pueden leer consignatarios activos
CREATE POLICY "Usuarios autenticados pueden leer consignatarios activos"
  ON public.consignatarios
  FOR SELECT
  TO authenticated
  USING (activo = true OR auth.uid() IN (
    SELECT auth_user_id FROM public.usuarios WHERE email = 'rodrigo.caceres@asli.cl'
  ));

-- Política: Solo Rodrigo puede insertar
CREATE POLICY "Solo Rodrigo puede insertar consignatarios"
  ON public.consignatarios
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT auth_user_id FROM public.usuarios WHERE email = 'rodrigo.caceres@asli.cl'
    )
  );

-- Política: Solo Rodrigo puede actualizar
CREATE POLICY "Solo Rodrigo puede actualizar consignatarios"
  ON public.consignatarios
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT auth_user_id FROM public.usuarios WHERE email = 'rodrigo.caceres@asli.cl'
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT auth_user_id FROM public.usuarios WHERE email = 'rodrigo.caceres@asli.cl'
    )
  );

-- Política: Solo Rodrigo puede eliminar (soft delete recomendado)
CREATE POLICY "Solo Rodrigo puede eliminar consignatarios"
  ON public.consignatarios
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT auth_user_id FROM public.usuarios WHERE email = 'rodrigo.caceres@asli.cl'
    )
  );

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_consignatarios_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS trigger_update_consignatarios_updated_at ON public.consignatarios;
CREATE TRIGGER trigger_update_consignatarios_updated_at
  BEFORE UPDATE ON public.consignatarios
  FOR EACH ROW
  EXECUTE FUNCTION update_consignatarios_updated_at();

-- Verificar que la tabla se creó correctamente
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'consignatarios'
ORDER BY ordinal_position;

-- Mensaje de confirmación
SELECT 'Tabla consignatarios creada exitosamente' as resultado;
