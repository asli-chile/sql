-- ============================================
-- FIX COMPLETO: Usuarios normales solo ven sus registros
-- ============================================
-- 1. Corregir políticas SELECT
-- 2. Añadir columna 'usuario' si no existe (además de ejecutivo)
-- 3. Asegurar que created_by guarda el nombre correcto
-- ============================================

-- PASO 1: Verificar si existe columna 'usuario' en registros
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'registros' 
      AND column_name = 'usuario'
  ) THEN
    -- Añadir columna 'usuario' después de 'ejecutivo'
    ALTER TABLE registros 
    ADD COLUMN usuario TEXT;
    
    -- Copiar valores de created_by a usuario si created_by tiene valor
    UPDATE registros
    SET usuario = created_by
    WHERE created_by IS NOT NULL;
    
    RAISE NOTICE '✅ Columna "usuario" añadida a la tabla registros';
  ELSE
    RAISE NOTICE '✅ La columna "usuario" ya existe';
  END IF;
END $$;

-- PASO 2: Actualizar trigger para llenar también la columna 'usuario'
-- ============================================

CREATE OR REPLACE FUNCTION set_user_fields()
RETURNS TRIGGER AS $$
DECLARE
  user_nombre TEXT;
  user_id UUID;
BEGIN
  -- Asegurar que el usuario existe
  user_id := ensure_user_exists();
  
  IF user_id IS NULL THEN
    NEW.created_by := 'Usuario';
    NEW.usuario := 'Usuario';
    NEW.updated_by := 'Usuario';
    RETURN NEW;
  END IF;
  
  -- Obtener el nombre del usuario
  SELECT nombre INTO user_nombre
  FROM usuarios
  WHERE id = user_id
  LIMIT 1;
  
  -- Si el nombre es genérico, intentar obtenerlo de auth.users
  IF user_nombre IS NULL OR user_nombre = 'Usuario' OR LENGTH(TRIM(user_nombre)) < 2 THEN
    SELECT COALESCE(
      (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = auth.uid()),
      (SELECT raw_user_meta_data->>'name' FROM auth.users WHERE id = auth.uid()),
      split_part(COALESCE(auth.email(), ''), '@', 1),
      'Usuario'
    ) INTO user_nombre;
    
    -- Actualizar el nombre en la tabla usuarios
    UPDATE usuarios
    SET nombre = user_nombre
    WHERE id = user_id;
  END IF;
  
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := COALESCE(user_nombre, 'Usuario');
    NEW.usuario := COALESCE(user_nombre, 'Usuario');  -- Llenar también la columna usuario
    NEW.updated_by := NEW.created_by;
  END IF;
  
  IF TG_OP = 'UPDATE' THEN
    NEW.updated_by := COALESCE(user_nombre, 'Usuario');
    NEW.created_by := OLD.created_by;
    NEW.usuario := OLD.usuario;  -- Mantener el usuario original en UPDATE
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PASO 3: Actualizar registros existentes que no tengan 'usuario' lleno
-- ============================================
UPDATE registros
SET usuario = created_by
WHERE usuario IS NULL 
  AND created_by IS NOT NULL;

-- PASO 4: Eliminar políticas SELECT existentes
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

-- PASO 5: Crear políticas SELECT correctas
-- ============================================

-- Política 1: Admins pueden ver TODOS los registros
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
-- IMPORTANTE: Comparar usuario/created_by con el nombre del usuario actual
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
        AND (
          registros.created_by = u.nombre
          OR registros.usuario = u.nombre
        )
    )
  );

-- PASO 6: Verificar políticas creadas
-- ============================================
SELECT 
  'Políticas SELECT' as seccion,
  policyname,
  cmd,
  LEFT(qual, 150) as using_clause
FROM pg_policies
WHERE tablename = 'registros'
  AND cmd = 'SELECT'
ORDER BY policyname;

-- PASO 7: Verificar usuario actual
-- ============================================
SELECT 
  'Usuario actual' as seccion,
  u.id,
  u.nombre,
  u.email,
  u.rol,
  CASE 
    WHEN u.rol = 'admin' THEN '✅ Es ADMIN - Puede ver todo'
    WHEN u.email LIKE '%@asli.cl' THEN '✅ Es EJECUTIVO - Puede ver sus clientes'
    WHEN u.rol = 'usuario' THEN '✅ Es USUARIO - Solo puede ver registros donde usuario/created_by = "' || u.nombre || '"'
    ELSE '⚠️ Rol: ' || u.rol
  END as tipo_usuario
FROM usuarios u
WHERE u.auth_user_id = auth.uid();

-- PASO 8: Ver cuántos registros puede ver el usuario actual
-- ============================================
SELECT 
  'Registros visibles' as seccion,
  COUNT(*) as total_registros,
  COUNT(*) FILTER (WHERE deleted_at IS NULL) as registros_activos,
  COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) as registros_eliminados
FROM registros;

-- Mensaje final
SELECT '✅ FIX COMPLETO APLICADO:
- Columna "usuario" añadida/verificada en registros
- Trigger actualizado para llenar "usuario" y "created_by"
- Políticas SELECT corregidas: usuarios normales solo ven sus registros
- Compara created_by/usuario con nombre del usuario en la política' as mensaje;

