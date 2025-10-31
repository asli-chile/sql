-- =====================================================
-- SOLUCIÓN DEFINITIVA: Admins pueden borrar cualquier registro
-- =====================================================
-- 
-- Problema: Los admins no pueden hacer UPDATE (soft delete) 
-- en registros que no crearon ellos mismos
-- 
-- Solución: Asegurar que la política de UPDATE para admins
-- tenga prioridad y permita cualquier actualización
-- =====================================================

-- PASO 1: Eliminar TODAS las políticas de UPDATE existentes
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

-- PASO 2: Verificar función is_admin() y mejorarla si es necesario
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  usuario_rol TEXT;
BEGIN
  -- Obtener el rol del usuario actual
  SELECT rol INTO usuario_rol
  FROM usuarios
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
  
  -- Si no encuentra el usuario, retornar false
  IF usuario_rol IS NULL THEN
    RETURN false;
  END IF;
  
  -- Retornar true solo si el rol es 'admin'
  RETURN usuario_rol = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- PASO 3: Crear política de UPDATE para ADMINS PRIMERO (mayor prioridad)
-- Esta política debe ser muy permisiva
CREATE POLICY "Admins pueden actualizar TODOS los registros"
  ON registros FOR UPDATE
  USING (
    -- Verificar que es admin de forma explícita
    EXISTS (
      SELECT 1 
      FROM usuarios 
      WHERE auth_user_id = auth.uid() 
        AND rol = 'admin'
    )
  )
  WITH CHECK (
    -- Verificar que sigue siendo admin
    EXISTS (
      SELECT 1 
      FROM usuarios 
      WHERE auth_user_id = auth.uid() 
        AND rol = 'admin'
    )
  );

-- PASO 4: Crear política para ejecutivos (solo sus clientes asignados)
CREATE POLICY "Ejecutivos pueden actualizar sus clientes asignados"
  ON registros FOR UPDATE
  USING (
    -- No aplicar si es admin (los admins ya tienen su política)
    NOT EXISTS (
      SELECT 1 
      FROM usuarios 
      WHERE auth_user_id = auth.uid() 
        AND rol = 'admin'
    )
    AND is_ejecutivo() = true
    AND shipper = ANY(
      get_assigned_clientes(get_current_user_id())
    )
  )
  WITH CHECK (
    NOT EXISTS (
      SELECT 1 
      FROM usuarios 
      WHERE auth_user_id = auth.uid() 
        AND rol = 'admin'
    )
    AND is_ejecutivo() = true
    AND shipper = ANY(
      get_assigned_clientes(get_current_user_id())
    )
  );

-- PASO 5: Crear política para usuarios normales (solo sus propios registros)
CREATE POLICY "Usuarios normales solo pueden actualizar sus propios registros"
  ON registros FOR UPDATE
  USING (
    -- No aplicar si es admin o ejecutivo
    NOT EXISTS (
      SELECT 1 
      FROM usuarios 
      WHERE auth_user_id = auth.uid() 
        AND rol = 'admin'
    )
    AND is_ejecutivo() = false
    AND auth.uid() IS NOT NULL
    AND created_by = get_current_user_id()::TEXT
  )
  WITH CHECK (
    NOT EXISTS (
      SELECT 1 
      FROM usuarios 
      WHERE auth_user_id = auth.uid() 
        AND rol = 'admin'
    )
    AND is_ejecutivo() = false
    AND auth.uid() IS NOT NULL
    AND created_by = get_current_user_id()::TEXT
  );

-- PASO 6: Verificar que se crearon correctamente
SELECT 
  policyname as "Política",
  cmd as "Operación",
  CASE 
    WHEN qual LIKE '%admin%' THEN '✅ Prioritaria (Admin)'
    WHEN qual LIKE '%ejecutivo%' THEN '🔵 Ejecutivo'
    ELSE '⚪ Usuario normal'
  END as "Tipo"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'registros'
  AND cmd = 'UPDATE'
ORDER BY 
  CASE 
    WHEN qual LIKE '%admin%' THEN 1
    WHEN qual LIKE '%ejecutivo%' THEN 2
    ELSE 3
  END;

-- PASO 7: Verificar tu usuario
SELECT 
  email,
  rol,
  CASE 
    WHEN rol = 'admin' THEN '✅ Eres Admin'
    ELSE '❌ NO eres Admin (rol: ' || rol || ')'
  END as estado
FROM usuarios
WHERE auth_user_id = auth.uid();

SELECT '✅ Políticas de UPDATE corregidas - Admins pueden borrar cualquier registro' as resultado;

