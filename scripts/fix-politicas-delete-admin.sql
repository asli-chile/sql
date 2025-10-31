-- =====================================================
-- CORREGIR POLÍTICAS DE UPDATE PARA PERMITIR SOFT DELETE A ADMINS
-- =====================================================
-- 
-- El problema: Los admins no pueden hacer UPDATE (soft delete)
-- porque las políticas no permiten actualizar deleted_at
-- =====================================================

-- Eliminar políticas de UPDATE existentes
DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'registros'
      AND cmd = 'UPDATE'
  ) LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON registros';
  END LOOP;
END $$;

-- UPDATE: Admins pueden actualizar cualquier registro (incluyendo soft delete)
CREATE POLICY "Admins pueden actualizar todos los registros"
  ON registros FOR UPDATE
  USING (is_admin() = true)
  WITH CHECK (is_admin() = true);

-- UPDATE: Ejecutivos pueden actualizar registros de sus clientes asignados
CREATE POLICY "Ejecutivos pueden actualizar sus clientes asignados"
  ON registros FOR UPDATE
  USING (
    is_ejecutivo() = true
    AND shipper = ANY(
      get_assigned_clientes(get_current_user_id())
    )
  )
  WITH CHECK (
    is_ejecutivo() = true
    AND shipper = ANY(
      get_assigned_clientes(get_current_user_id())
    )
  );

-- UPDATE: Usuarios normales solo pueden actualizar sus propios registros
CREATE POLICY "Usuarios normales solo pueden actualizar sus propios registros"
  ON registros FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND is_ejecutivo() = false
    AND is_admin() = false
    AND created_by = get_current_user_id()::TEXT
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND is_ejecutivo() = false
    AND is_admin() = false
    AND created_by = get_current_user_id()::TEXT
  );

-- Verificar políticas creadas
SELECT 
  policyname,
  cmd as "Operación",
  qual as "USING",
  with_check as "WITH CHECK"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'registros'
  AND cmd = 'UPDATE'
ORDER BY policyname;

SELECT '✅ Políticas de UPDATE corregidas - Admins ahora pueden hacer soft delete' as resultado;

