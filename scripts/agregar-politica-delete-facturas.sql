-- Agregar política DELETE para la tabla facturas
-- Esto permite a los usuarios eliminar facturas que crearon o que tienen acceso

-- Eliminar la política existente si ya existe
DROP POLICY IF EXISTS "Los usuarios pueden eliminar facturas que crearon" ON facturas;

-- Política DELETE: Los usuarios pueden eliminar facturas que crearon o de registros que pueden ver
CREATE POLICY "Los usuarios pueden eliminar facturas que crearon"
  ON facturas
  FOR DELETE
  USING (
    -- Permitir si el usuario creó la factura (comparar con email del JWT)
    created_by = (auth.jwt() ->> 'email')
    OR 
    -- Permitir si el usuario puede ver el registro asociado
    EXISTS (
      SELECT 1 FROM registros r
      WHERE r.id = facturas.registro_id
      AND r.deleted_at IS NULL
    )
  );
