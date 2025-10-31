-- =====================================================
-- POLÍTICAS RLS ACTUALIZADAS - VERSIÓN COMPLETA
-- =====================================================
-- 
-- Reglas:
-- 1. Usuarios sin @asli.cl → Solo ven registros que CREARON ellos mismos
-- 2. Usuarios con @asli.cl (ejecutivos) → Ven según clientes asignados
-- 3. Admins → Ven todo
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


-- PASO 6: Crear trigger para guardar created_by automáticamente
-- =====================================================

-- Función para actualizar created_by y updated_by
CREATE OR REPLACE FUNCTION set_user_fields()
RETURNS TRIGGER AS $$
DECLARE
  current_user_uuid UUID;
BEGIN
  -- Obtener el UUID del usuario actual de la tabla usuarios
  SELECT id INTO current_user_uuid
  FROM usuarios
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
  
  -- Si es INSERT, establecer created_by
  IF TG_OP = 'INSERT' THEN
    IF current_user_uuid IS NOT NULL THEN
      NEW.created_by := current_user_uuid::TEXT;
    END IF;
    NEW.updated_by := NEW.created_by;
  END IF;
  
  -- Si es UPDATE, establecer updated_by
  IF TG_OP = 'UPDATE' THEN
    IF current_user_uuid IS NOT NULL THEN
      NEW.updated_by := current_user_uuid::TEXT;
    END IF;
    -- Mantener created_by original
    NEW.created_by := OLD.created_by;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger
DROP TRIGGER IF EXISTS set_registros_user_fields ON registros;
CREATE TRIGGER set_registros_user_fields
  BEFORE INSERT OR UPDATE ON registros
  FOR EACH ROW
  EXECUTE FUNCTION set_user_fields();


-- PASO 7: POLÍTICAS PARA TABLA 'registros' - ACTUALIZADAS
-- =====================================================

-- Eliminar todas las políticas existentes
DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'registros') LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON registros';
  END LOOP;
END $$;

-- SELECT: 
-- - Admins ven todo
-- - Ejecutivos (@asli.cl) ven solo sus clientes asignados
-- - Usuarios normales (sin @asli.cl) SOLO ven registros que ellos crearon
CREATE POLICY "Admins pueden ver todos los registros"
  ON registros FOR SELECT
  USING (
    is_admin() = true
  );

CREATE POLICY "Ejecutivos pueden ver sus clientes asignados"
  ON registros FOR SELECT
  USING (
    is_ejecutivo() = true
    AND shipper = ANY(
      get_assigned_clientes(get_current_user_id())
    )
  );

CREATE POLICY "Usuarios normales solo ven sus propios registros"
  ON registros FOR SELECT
  USING (
    -- Solo usuarios autenticados que NO son ejecutivos ni admins
    auth.uid() IS NOT NULL
    AND is_ejecutivo() = false
    AND is_admin() = false
    AND created_by = get_current_user_id()::TEXT
  );

-- INSERT: 
-- - Todos los autenticados pueden crear registros
-- - Ejecutivos solo pueden crear registros de sus clientes asignados
CREATE POLICY "Admins pueden crear cualquier registro"
  ON registros FOR INSERT
  WITH CHECK (
    is_admin() = true
  );

CREATE POLICY "Ejecutivos pueden crear registros de sus clientes"
  ON registros FOR INSERT
  WITH CHECK (
    is_ejecutivo() = true
    AND shipper = ANY(
      get_assigned_clientes(get_current_user_id())
    )
  );

CREATE POLICY "Usuarios normales pueden crear sus propios registros"
  ON registros FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND is_ejecutivo() = false
    AND is_admin() = false
    -- created_by se establecerá automáticamente por el trigger
  );

-- UPDATE:
-- - Admins pueden actualizar todo
-- - Ejecutivos solo pueden actualizar registros de sus clientes asignados
-- - Usuarios normales solo pueden actualizar registros que crearon
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

-- DELETE: Solo admins pueden eliminar físicamente
CREATE POLICY "Solo admins pueden eliminar registros"
  ON registros FOR DELETE
  USING (is_admin() = true);


-- PASO 8: POLÍTICAS PARA TABLA 'ejecutivo_clientes'
-- =====================================================

DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ejecutivo_clientes') LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON ejecutivo_clientes';
  END LOOP;
END $$;

CREATE POLICY "Ejecutivos pueden ver sus asignaciones"
  ON ejecutivo_clientes FOR SELECT
  USING (
    is_admin() = true
    OR ejecutivo_id = get_current_user_id()
  );

CREATE POLICY "Solo admins pueden gestionar asignaciones"
  ON ejecutivo_clientes FOR ALL
  USING (is_admin() = true)
  WITH CHECK (is_admin() = true);


-- PASO 9: POLÍTICAS PARA TABLA 'usuarios'
-- =====================================================

DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'usuarios') LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON usuarios';
  END LOOP;
END $$;

CREATE POLICY "Usuarios pueden ver su propia información"
  ON usuarios FOR SELECT
  USING (
    is_admin() = true
    OR auth_user_id = auth.uid()
  );

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

CREATE POLICY "Solo admins pueden gestionar usuarios"
  ON usuarios FOR ALL
  USING (is_admin() = true)
  WITH CHECK (is_admin() = true);


-- PASO 10: POLÍTICAS PARA TABLA 'catalogos'
-- =====================================================

DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'catalogos') LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON catalogos';
  END LOOP;
END $$;

CREATE POLICY "Todos los autenticados pueden leer catálogos"
  ON catalogos FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Solo admins pueden modificar catálogos"
  ON catalogos FOR ALL
  USING (is_admin() = true)
  WITH CHECK (is_admin() = true);


-- PASO 11: POLÍTICAS PARA TABLA 'historial_cambios'
-- =====================================================

DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'historial_cambios') LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON historial_cambios';
  END LOOP;
END $$;

CREATE POLICY "Usuarios pueden ver historial de registros que pueden ver"
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
      -- Usuarios normales ven historial de sus propios registros
      registro_id IN (
        SELECT id 
        FROM registros 
        WHERE created_by = get_current_user_id()::TEXT
      )
    )
  );

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
  cmd as "Operación"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('registros', 'ejecutivo_clientes', 'usuarios', 'catalogos', 'historial_cambios')
ORDER BY tablename, policyname;

SELECT '✅ Políticas RLS actualizadas exitosamente' as resultado;
SELECT '📋 Usuarios sin @asli.cl ahora solo ven sus propios registros' as nota;

