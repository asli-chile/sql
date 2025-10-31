-- ============================================
-- FIX: Políticas SELECT para usuarios normales
-- ============================================
-- Los usuarios con rol 'usuario' (no admin, no ejecutivo @asli.cl)
-- SOLO deben ver registros que ellos crearon (created_by = su nombre)
-- ============================================

-- PASO 1: Eliminar políticas SELECT existentes
-- ============================================
DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'registros'
      AND cmd = 'SELECT'
  ) LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON registros';
  END LOOP;
END $$;

-- PASO 2: Crear políticas SELECT correctas
-- ============================================

-- Política 1: Admins pueden ver TODOS los registros (activos y eliminados)
CREATE POLICY "Admins pueden ver todos los registros"
  ON registros FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE auth_user_id = auth.uid() 
        AND rol = 'admin'
    )
  );

-- Política 2: Ejecutivos (@asli.cl) pueden ver registros de sus clientes asignados
CREATE POLICY "Ejecutivos pueden ver sus clientes asignados"
  ON registros FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.auth_user_id = auth.uid()
        AND u.email LIKE '%@asli.cl'
        AND (
          -- Si tiene clientes asignados, solo ver esos clientes
          -- Si no tiene clientes asignados, ver todos (comportamiento por defecto)
          EXISTS (
            SELECT 1 FROM ejecutivo_clientes ec
            WHERE ec.ejecutivo_id = u.id
              AND ec.cliente_nombre = registros.shipper
              AND ec.activo = true
          )
          OR NOT EXISTS (
            SELECT 1 FROM ejecutivo_clientes ec
            WHERE ec.ejecutivo_id = u.id
              AND ec.activo = true
          )
        )
    )
  );

-- Política 3: Usuarios normales (rol 'usuario', sin @asli.cl) SOLO ven sus propios registros
-- IMPORTANTE: Comparar created_by con el nombre del usuario
CREATE POLICY "Usuarios normales solo ven sus propios registros"
  ON registros FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM usuarios 
      WHERE auth_user_id = auth.uid() 
        AND rol = 'admin'
    )
    AND NOT EXISTS (
      SELECT 1 FROM usuarios 
      WHERE auth_user_id = auth.uid() 
        AND email LIKE '%@asli.cl'
    )
    AND EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.auth_user_id = auth.uid()
        AND u.rol = 'usuario'
        AND registros.created_by = u.nombre
    )
  );

-- PASO 3: Verificar políticas creadas
-- ============================================
SELECT 
  'Políticas SELECT creadas' as seccion,
  policyname,
  cmd,
  LEFT(qual, 200) as using_clause
FROM pg_policies
WHERE tablename = 'registros'
  AND cmd = 'SELECT'
ORDER BY policyname;

-- PASO 4: Verificar usuario actual y sus permisos
-- ============================================
SELECT 
  'Usuario actual' as seccion,
  u.id,
  u.nombre,
  u.email,
  u.rol,
  CASE 
    WHEN u.rol = 'admin' THEN '✅ Es ADMIN - Puede ver todo'
    WHEN u.email LIKE '%@asli.cl' THEN '✅ Es EJECUTIVO - Puede ver sus clientes asignados'
    WHEN u.rol = 'usuario' THEN '✅ Es USUARIO NORMAL - Solo puede ver registros creados por: ' || u.nombre
    ELSE '⚠️ Rol desconocido: ' || u.rol
  END as tipo_usuario
FROM usuarios u
WHERE u.auth_user_id = auth.uid();

-- PASO 5: Verificar si puede ver registros
-- ============================================
SELECT 
  '¿Puede ver registros?' as paso,
  CASE 
    WHEN EXISTS (SELECT 1 FROM usuarios WHERE auth_user_id = auth.uid() AND rol = 'admin') 
    THEN '✅ SÍ - Es admin (puede ver todo)'
    WHEN EXISTS (SELECT 1 FROM usuarios WHERE auth_user_id = auth.uid() AND email LIKE '%@asli.cl') 
    THEN '✅ SÍ - Es ejecutivo (puede ver sus clientes)'
    WHEN EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.auth_user_id = auth.uid()
        AND u.rol = 'usuario'
    )
    THEN '✅ SÍ - Es usuario normal (puede ver solo registros creados por: ' || 
         (SELECT nombre FROM usuarios WHERE auth_user_id = auth.uid()) || ')'
    ELSE '❌ NO - Usuario no identificado'
  END as resultado;

-- PASO 6: Ver cuántos registros puede ver
-- ============================================
SELECT 
  'Registros visibles' as paso,
  COUNT(*) as total_registros_visibles
FROM registros
WHERE deleted_at IS NULL;

-- Mensaje final
SELECT '✅ Políticas SELECT actualizadas:
- Admins: Ven todos los registros
- Ejecutivos (@asli.cl): Ven registros de sus clientes asignados
- Usuarios normales (rol usuario): SOLO ven registros donde created_by = su nombre
- Verifica el Paso 5 para confirmar tus permisos' as mensaje;
