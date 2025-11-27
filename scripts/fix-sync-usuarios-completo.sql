-- ============================================
-- FIX COMPLETO: Sincronizar usuarios entre auth.users y tabla usuarios
-- ============================================
-- Este script:
-- 1. Actualiza la función sync_primary_email() para crear también en tabla usuarios
-- 2. Sincroniza usuarios existentes que faltan en la tabla usuarios
-- ============================================

-- PASO 1: Actualizar función para crear usuario en tabla usuarios
-- ============================================
CREATE OR REPLACE FUNCTION public.sync_primary_email()
RETURNS TRIGGER AS $$
DECLARE
  user_name TEXT;
BEGIN
  -- Obtener nombre del usuario desde metadata
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1),
    'Usuario'
  );
  
  -- Si el nombre es muy corto, usar "Usuario"
  IF LENGTH(user_name) < 2 THEN
    user_name := 'Usuario';
  END IF;
  
  -- Crear usuario en tabla usuarios (si la tabla existe)
  BEGIN
    INSERT INTO public.usuarios (auth_user_id, nombre, email, rol, activo)
    VALUES (
      NEW.id,
      user_name,
      NEW.email,
      'usuario', -- Rol por defecto
      true -- Activo por defecto
    )
    ON CONFLICT (auth_user_id) DO UPDATE SET
      nombre = COALESCE(EXCLUDED.nombre, usuarios.nombre),
      email = COALESCE(EXCLUDED.email, usuarios.email),
      activo = true;
  EXCEPTION
    WHEN undefined_table THEN
      -- Si la tabla usuarios no existe, solo continuar con user_emails
      NULL;
  END;
  
  -- Crear email principal en user_emails
  INSERT INTO public.user_emails (user_id, email, is_primary)
  VALUES (NEW.id, NEW.email, true)
  ON CONFLICT (email) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PASO 2: Sincronizar usuarios existentes que faltan en tabla usuarios
-- ============================================
-- Insertar usuarios que existen en auth.users pero no en usuarios
INSERT INTO public.usuarios (auth_user_id, nombre, email, rol, activo)
SELECT 
  au.id as auth_user_id,
  COALESCE(
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'name',
    split_part(au.email, '@', 1),
    'Usuario'
  ) as nombre,
  au.email,
  'usuario' as rol,
  true as activo
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.usuarios u WHERE u.auth_user_id = au.id
)
ON CONFLICT (auth_user_id) DO UPDATE SET
  nombre = COALESCE(EXCLUDED.nombre, usuarios.nombre),
  email = COALESCE(EXCLUDED.email, usuarios.email),
  activo = true;

-- PASO 3: Mostrar resumen
-- ============================================
SELECT 
  '✅ Sincronización completada' as resultado,
  COUNT(*) as usuarios_en_auth,
  (SELECT COUNT(*) FROM public.usuarios) as usuarios_en_tabla,
  (SELECT COUNT(*) FROM public.user_emails) as emails_en_tabla
FROM auth.users;

-- PASO 4: Mostrar usuarios sincronizados
SELECT 
  'Usuarios sincronizados' as tipo,
  u.id,
  u.auth_user_id,
  u.nombre,
  u.email,
  u.rol,
  u.activo
FROM public.usuarios u
ORDER BY u.created_at DESC
LIMIT 10;

