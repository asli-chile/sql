-- ============================================
-- FIX: Error "cannot execute UPDATE in a read-only transaction"
-- ============================================
-- El problema es que ensure_user_exists() hace UPDATE en la tabla usuarios
-- cuando se ejecuta desde un trigger BEFORE INSERT, esto causa el error.
-- 
-- Solución: Modificar el trigger para que solo haga INSERT si el usuario no existe,
-- sin hacer UPDATE durante el INSERT de registros.
-- ============================================

-- PASO 1: Crear una versión simplificada de ensure_user_exists() que no haga UPDATE durante INSERT
-- ============================================

CREATE OR REPLACE FUNCTION ensure_user_exists_insert_only()
RETURNS UUID AS $$
DECLARE
  current_auth_id UUID;
  user_id UUID;
  user_email TEXT;
  user_name TEXT;
BEGIN
  -- Obtener ID del usuario autenticado
  current_auth_id := auth.uid();
  
  -- Si no hay usuario autenticado, devolver NULL
  IF current_auth_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Buscar usuario existente
  SELECT id INTO user_id
  FROM usuarios
  WHERE auth_user_id = current_auth_id
  LIMIT 1;
  
  -- Si existe, devolverlo (sin hacer UPDATE)
  IF user_id IS NOT NULL THEN
    RETURN user_id;
  END IF;
  
  -- Si no existe, crearlo (solo INSERT, sin ON CONFLICT DO UPDATE)
  user_email := COALESCE(auth.email(), 'usuario_' || current_auth_id::TEXT || '@temporal.com');
  user_name := COALESCE(
    auth.jwt() ->> 'full_name',
    auth.jwt() ->> 'name',
    split_part(user_email, '@', 1),
    'Usuario'
  );
  
  -- Solo INSERT, sin UPDATE para evitar el error de transacción de solo lectura
  BEGIN
    INSERT INTO usuarios (auth_user_id, nombre, email, rol)
    VALUES (current_auth_id, user_name, user_email, 'usuario')
    RETURNING id INTO user_id;
    
    RETURN user_id;
  EXCEPTION WHEN unique_violation THEN
    -- Si ya existe (race condition), simplemente obtenerlo
    SELECT id INTO user_id
    FROM usuarios
    WHERE auth_user_id = current_auth_id
    LIMIT 1;
    
    RETURN user_id;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PASO 2: Actualizar el trigger set_user_fields() para usar la versión sin UPDATE
-- ============================================

CREATE OR REPLACE FUNCTION set_user_fields()
RETURNS TRIGGER AS $$
DECLARE
  user_nombre TEXT;
  user_id UUID;
BEGIN
  -- Usar la versión sin UPDATE para evitar el error de transacción de solo lectura
  user_id := ensure_user_exists_insert_only();
  
  IF user_id IS NULL THEN
    -- Si no hay usuario, usar valores por defecto
    NEW.created_by := 'Usuario';
    NEW.updated_by := 'Usuario';
    RETURN NEW;
  END IF;
  
  -- Obtener el NOMBRE del usuario
  SELECT nombre INTO user_nombre
  FROM usuarios
  WHERE id = user_id
  LIMIT 1;
  
  -- Si es INSERT, establecer created_by con el NOMBRE
  IF TG_OP = 'INSERT' THEN
    IF user_nombre IS NOT NULL THEN
      NEW.created_by := user_nombre;
    ELSE
      NEW.created_by := 'Usuario';
    END IF;
    NEW.updated_by := NEW.created_by;
  END IF;
  
  -- Si es UPDATE, establecer updated_by con el NOMBRE
  IF TG_OP = 'UPDATE' THEN
    IF user_nombre IS NOT NULL THEN
      NEW.updated_by := user_nombre;
    ELSE
      NEW.updated_by := 'Usuario';
    END IF;
    -- Mantener created_by original
    NEW.created_by := OLD.created_by;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PASO 3: Verificar que el trigger esté configurado correctamente
-- ============================================

-- Verificar que el trigger existe
SELECT 
  'Trigger verificado' as estado,
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'set_registros_user_fields'
  AND event_object_table = 'registros';

-- Mensaje de confirmación
SELECT '✅ Fix aplicado: 
- Función ensure_user_exists_insert_only() creada (sin UPDATE durante INSERT)
- Trigger set_user_fields() actualizado para usar la versión sin UPDATE
- Esto debería resolver el error "cannot execute UPDATE in a read-only transaction"
' as resultado;

