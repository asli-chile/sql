-- ============================================
-- FIX: Políticas RLS para Papelera (Registros Eliminados)
-- ============================================
-- Este script actualiza las políticas SELECT para permitir
-- ver registros eliminados (con deleted_at IS NOT NULL)
-- aplicando los mismos permisos que para registros activos
-- ============================================

-- Eliminar las políticas SELECT existentes que solo permiten ver registros activos
DROP POLICY IF EXISTS "Admins pueden ver todos los registros" ON registros;
DROP POLICY IF EXISTS "Ejecutivos pueden ver sus clientes asignados" ON registros;
DROP POLICY IF EXISTS "Usuarios normales solo ven sus propios registros" ON registros;

-- Crear nuevas políticas SELECT que permiten ver registros eliminados
-- usando los mismos criterios de permisos que para registros activos

-- Política para Admins: Pueden ver TODOS los registros (activos y eliminados)
CREATE POLICY "Admins pueden ver todos los registros"
  ON registros FOR SELECT
  USING (
    is_admin() = true
    -- No se verifica deleted_at, admins ven todo
  );

-- Política para Ejecutivos: Pueden ver registros de sus clientes asignados
-- (activos Y eliminados)
CREATE POLICY "Ejecutivos pueden ver sus clientes asignados"
  ON registros FOR SELECT
  USING (
    is_ejecutivo() = true
    AND shipper = ANY(
      get_assigned_clientes(get_current_user_id())
    )
    -- No se verifica deleted_at, ejecutivos ven eliminados de sus clientes
  );

-- Política para Usuarios normales: Solo ven sus propios registros
-- (activos Y eliminados que ellos crearon)
CREATE POLICY "Usuarios normales solo ven sus propios registros"
  ON registros FOR SELECT
  USING (
    -- Solo usuarios autenticados que NO son ejecutivos ni admins
    auth.uid() IS NOT NULL
    AND is_ejecutivo() = false
    AND is_admin() = false
    AND created_by = get_current_user_id()::TEXT
    -- No se verifica deleted_at, usuarios ven sus propios eliminados
  );

-- ============================================
-- IMPORTANTE:
-- ============================================
-- Las políticas UPDATE y DELETE no cambian.
-- El TrashModal usa .update() para restaurar (eliminar deleted_at)
-- y .delete() para eliminación permanente.
-- 
-- Las políticas UPDATE existentes ya permiten restaurar registros
-- eliminados porque no verifican deleted_at.
-- ============================================

-- Verificar que las políticas se crearon correctamente
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'registros'
  AND cmd = 'SELECT'
ORDER BY policyname;

