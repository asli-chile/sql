-- Tabla para rastrear documentos eliminados (papelera de 7 días)
CREATE TABLE IF NOT EXISTS documentos_eliminados (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  file_path TEXT NOT NULL UNIQUE,
  type_id TEXT NOT NULL,
  booking TEXT,
  original_name TEXT,
  deleted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ GENERATED ALWAYS AS (deleted_at + INTERVAL '7 days') STORED,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para búsquedas rápidas por file_path
CREATE INDEX IF NOT EXISTS idx_documentos_eliminados_file_path ON documentos_eliminados(file_path);

-- Índice para limpieza automática (documentos expirados)
CREATE INDEX IF NOT EXISTS idx_documentos_eliminados_expires_at ON documentos_eliminados(expires_at);

-- Función para limpiar documentos expirados (ejecutar periódicamente)
CREATE OR REPLACE FUNCTION limpiar_documentos_expirados()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Eliminar registros de documentos que han expirado (más de 7 días)
  DELETE FROM documentos_eliminados
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Política RLS: Solo admins pueden ver documentos eliminados
ALTER TABLE documentos_eliminados ENABLE ROW LEVEL SECURITY;

-- Política para SELECT: Solo admins
CREATE POLICY "Solo admins pueden ver documentos eliminados"
ON documentos_eliminados
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_user_meta_data->>'rol')::text = 'admin'
  )
);

-- Política para INSERT: Solo admins
CREATE POLICY "Solo admins pueden eliminar documentos"
ON documentos_eliminados
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_user_meta_data->>'rol')::text = 'admin'
  )
);

-- Política para DELETE: Solo admins (para restaurar antes de expirar)
CREATE POLICY "Solo admins pueden restaurar documentos"
ON documentos_eliminados
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_user_meta_data->>'rol')::text = 'admin'
  )
);

