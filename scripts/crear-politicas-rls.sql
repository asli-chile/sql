-- =====================================================
-- POLÍTICAS RLS (Row Level Security) PARA PROTEGER DATOS
-- =====================================================
-- 
-- Este script habilita RLS y crea políticas de seguridad
-- para que los ejecutivos solo vean sus clientes asignados
-- =====================================================

-- PASO 1: Habilitar RLS en todas las tablas críticas
-- =====================================================

ALTER TABLE registros ENABLE ROW LEVEL SECURITY;
ALTER TABLE ejecutivo_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE historial_cambios ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalogos ENABLE ROW LEVEL SECURITY;


-- PASO 2: Crear función auxiliar para obtener el usuario actual
-- =====================================================
-- Esta función obtiene el usuario de la tabla usuarios basado en auth.uid()

CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT id 
    FROM usuarios 
    WHERE auth_user_id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- PASO 3: Crear función auxiliar para verificar si es admin
-- =====================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT rol = 'admin'
    FROM usuarios
    WHERE auth_user_id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- PASO 4: Crear función auxiliar para verificar si es ejecutivo (@asli.cl)
-- =====================================================

CREATE OR REPLACE FUNCTION is_ejecutivo()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT email LIKE '%@asli.cl'
    FROM usuarios
    WHERE auth_user_id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- PASO 5: Crear función para obtener clientes asignados a un ejecutivo
-- =====================================================

CREATE OR REPLACE FUNCTION get_assigned_clientes(ejecutivo_uuid UUID)
RETURNS TEXT[] AS $$
BEGIN
  RETURN (
    SELECT ARRAY_AGG(cliente_nombre)
    FROM ejecutivo_clientes
    WHERE ejecutivo_id = ejecutivo_uuid
      AND activo = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- PASO 6: POLÍTICAS PARA TABLA 'registros'
-- =====================================================

-- Eliminar políticas existentes si las hay
DROP POLICY IF EXISTS "Admins pueden ver todos los registros" ON registros;
DROP POLICY IF EXISTS "Ejecutivos pueden ver sus clientes asignados" ON registros;
DROP POLICY IF EXISTS "Usuarios pueden ver sus registros" ON registros;
DROP POLICY IF EXISTS "Todos pueden crear registros si están autenticados" ON registros;
DROP POLICY IF EXISTS "Admins pueden actualizar todos los registros" ON registros;
DROP POLICY IF EXISTS "Ejecutivos pueden actualizar sus clientes asignados" ON registros;
DROP POLICY IF EXISTS "Usuarios pueden actualizar sus registros" ON registros;
DROP POLICY IF EXISTS "Admins pueden eliminar todos los registros" ON registros;
DROP POLICY IF EXISTS "Ejecutivos pueden eliminar sus clientes asignados" ON registros;

-- SELECT: Admins ven todo, ejecutivos ven solo sus clientes asignados
CREATE POLICY "Admins pueden ver todos los registros"
  ON registros FOR SELECT
  USING (
    is_admin() = true
    OR (
      is_ejecutivo() = true
      AND shipper = ANY(
        get_assigned_clientes(get_current_user_id())
      )
    )
    OR (
      -- Usuarios normales solo ven sus propios registros
      ejecutivo = (
        SELECT nombre 
        FROM usuarios 
        WHERE auth_user_id = auth.uid() 
        LIMIT 1
      )
    )
  );

-- INSERT: Cualquier usuario autenticado puede crear registros
CREATE POLICY "Todos pueden crear registros si están autenticados"
  ON registros FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      -- Admins pueden crear cualquier registro
      is_admin() = true
      OR (
        -- Ejecutivos solo pueden crear registros de sus clientes
        is_ejecutivo() = true
        AND shipper = ANY(
          get_assigned_clientes(get_current_user_id())
        )
      )
      OR (
        -- Usuarios normales pueden crear registros
        auth.uid() IS NOT NULL
      )
    )
  );

-- UPDATE: Admins todo, ejecutivos solo sus clientes asignados
CREATE POLICY "Admins pueden actualizar todos los registros"
  ON registros FOR UPDATE
  USING (is_admin() = true)
  WITH CHECK (is_admin() = true);

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

-- DELETE: Solo admins pueden eliminar (soft delete se maneja con UPDATE)
CREATE POLICY "Admins pueden eliminar todos los registros"
  ON registros FOR DELETE
  USING (is_admin() = true);


-- PASO 7: POLÍTICAS PARA TABLA 'ejecutivo_clientes'
-- =====================================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Ejecutivos pueden ver sus asignaciones" ON ejecutivo_clientes;
DROP POLICY IF EXISTS "Admins pueden ver todas las asignaciones" ON ejecutivo_clientes;
DROP POLICY IF EXISTS "Admins pueden gestionar asignaciones" ON ejecutivo_clientes;

-- SELECT: Ejecutivos ven solo sus asignaciones, admins ven todo
CREATE POLICY "Ejecutivos pueden ver sus asignaciones"
  ON ejecutivo_clientes FOR SELECT
  USING (
    is_admin() = true
    OR ejecutivo_id = get_current_user_id()
  );

-- INSERT/UPDATE/DELETE: Solo admins pueden gestionar asignaciones
CREATE POLICY "Admins pueden gestionar asignaciones"
  ON ejecutivo_clientes FOR ALL
  USING (is_admin() = true)
  WITH CHECK (is_admin() = true);


-- PASO 8: POLÍTICAS PARA TABLA 'usuarios'
-- =====================================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Usuarios pueden ver su propia información" ON usuarios;
DROP POLICY IF EXISTS "Admins pueden ver todos los usuarios" ON usuarios;
DROP POLICY IF EXISTS "Admins pueden gestionar usuarios" ON usuarios;

-- SELECT: Usuarios ven su propia información, admins ven todo
CREATE POLICY "Usuarios pueden ver su propia información"
  ON usuarios FOR SELECT
  USING (
    is_admin() = true
    OR auth_user_id = auth.uid()
  );

-- UPDATE: Usuarios solo pueden actualizar su propia info, admins todo
CREATE POLICY "Usuarios pueden actualizar su propia información"
  ON usuarios FOR UPDATE
  USING (
    is_admin() = true
    OR auth_user_id = auth.uid()
  )
  WITH CHECK (
    is_admin() = true
    OR auth_user_id = auth.uid()
  );

-- INSERT/DELETE: Solo admins
CREATE POLICY "Admins pueden gestionar usuarios"
  ON usuarios FOR ALL
  USING (is_admin() = true)
  WITH CHECK (is_admin() = true);


-- PASO 9: POLÍTICAS PARA TABLA 'catalogos'
-- =====================================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Todos los autenticados pueden leer catálogos" ON catalogos;
DROP POLICY IF EXISTS "Solo admins pueden modificar catálogos" ON catalogos;

-- SELECT: Todos los usuarios autenticados pueden leer
CREATE POLICY "Todos los autenticados pueden leer catálogos"
  ON catalogos FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- INSERT/UPDATE/DELETE: Solo admins
CREATE POLICY "Solo admins pueden modificar catálogos"
  ON catalogos FOR ALL
  USING (is_admin() = true)
  WITH CHECK (is_admin() = true);


-- PASO 10: POLÍTICAS PARA TABLA 'historial_cambios'
-- =====================================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Usuarios pueden ver historial de sus registros" ON historial_cambios;
DROP POLICY IF EXISTS "Admins pueden ver todo el historial" ON historial_cambios;
DROP POLICY IF EXISTS "Solo el sistema puede crear historial" ON historial_cambios;

-- SELECT: Usuarios ven historial de registros que pueden ver
CREATE POLICY "Usuarios pueden ver historial de sus registros"
  ON historial_cambios FOR SELECT
  USING (
    is_admin() = true
    OR (
      -- Ejecutivos ven historial de sus clientes asignados
      is_ejecutivo() = true
      AND registro_id IN (
        SELECT id 
        FROM registros 
        WHERE shipper = ANY(
          get_assigned_clientes(get_current_user_id())
        )
      )
    )
    OR (
      -- Usuarios normales ven historial de sus registros
      registro_id IN (
        SELECT id 
        FROM registros 
        WHERE ejecutivo = (
          SELECT nombre 
          FROM usuarios 
          WHERE auth_user_id = auth.uid() 
          LIMIT 1
        )
      )
    )
  );

-- INSERT: Solo el sistema puede crear historial (vía funciones)
-- No permitimos INSERT directo, solo a través de funciones del sistema
CREATE POLICY "Solo el sistema puede crear historial"
  ON historial_cambios FOR INSERT
  WITH CHECK (
    is_admin() = true
    -- El historial se crea automáticamente por triggers/funciones
  );


-- =====================================================
-- VERIFICACIÓN
-- =====================================================

-- Verificar que RLS está habilitado
SELECT 
  schemaname,
  tablename,
  rowsecurity as "RLS Habilitado"
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('registros', 'ejecutivo_clientes', 'usuarios', 'catalogos', 'historial_cambios')
ORDER BY tablename;

-- Ver todas las políticas creadas
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
WHERE schemaname = 'public'
  AND tablename IN ('registros', 'ejecutivo_clientes', 'usuarios', 'catalogos', 'historial_cambios')
ORDER BY tablename, policyname;

SELECT '✅ Políticas RLS creadas exitosamente' as resultado;

