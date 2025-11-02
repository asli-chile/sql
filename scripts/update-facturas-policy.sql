-- Script para actualizar la política UPDATE de facturas
-- Ejecutar en el SQL Editor de Supabase

-- Eliminar la política antigua
DROP POLICY IF EXISTS "Los usuarios pueden actualizar facturas que crearon" ON facturas;

-- Crear la nueva política con permisos más amplios
CREATE POLICY "Los usuarios pueden actualizar facturas que crearon"
  ON facturas
  FOR UPDATE
  USING (
    created_by = (SELECT email FROM auth.users WHERE id = auth.uid())::TEXT
    OR EXISTS (
      SELECT 1 FROM registros r
      WHERE r.id = facturas.registro_id
      AND r.deleted_at IS NULL
    )
  )
  WITH CHECK (
    created_by = (SELECT email FROM auth.users WHERE id = auth.uid())::TEXT
    OR EXISTS (
      SELECT 1 FROM registros r
      WHERE r.id = facturas.registro_id
      AND r.deleted_at IS NULL
    )
  );

