-- =====================================================
-- FUNCIÓN: delete_registros_permanente
-- =====================================================
-- Elimina definitivamente registros (sin pasar por RLS)
-- Solo permite ejecución a usuarios con rol admin
-- =====================================================

CREATE OR REPLACE FUNCTION delete_registros_permanente(ids UUID[])
RETURNS INTEGER AS $$
DECLARE
  cantidad_eliminada INTEGER := 0;
BEGIN
  -- Asegurar que solo un admin ejecute la función
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Solo administradores pueden eliminar permanentemente registros';
  END IF;

  SET LOCAL search_path = public;

  DELETE FROM registros
  WHERE id = ANY(ids);

  GET DIAGNOSTICS cantidad_eliminada = ROW_COUNT;
  RETURN cantidad_eliminada;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION delete_registros_permanente(UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION delete_registros_permanente(UUID[]) TO authenticated;

SELECT '✅ Función delete_registros_permanente creada/actualizada' AS resultado;

