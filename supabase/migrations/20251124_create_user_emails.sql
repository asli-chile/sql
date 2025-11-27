-- Migración: Crear tabla user_emails para múltiples emails por usuario
-- VERSIÓN SIMPLIFICADA - Ejecutar en orden

-- PASO 1: Eliminar constraint si existe
ALTER TABLE IF EXISTS public.user_emails DROP CONSTRAINT IF EXISTS unique_email;

-- PASO 2: Crear la tabla (solo si no existe)
CREATE TABLE IF NOT EXISTS public.user_emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PASO 3: Crear índices
CREATE INDEX IF NOT EXISTS idx_user_emails_user_id ON public.user_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_user_emails_email ON public.user_emails(email);

-- PASO 4: Agregar constraint único
ALTER TABLE public.user_emails ADD CONSTRAINT unique_email UNIQUE (email);

-- PASO 5: Comentarios
COMMENT ON TABLE public.user_emails IS 'Almacena emails secundarios para usuarios';
COMMENT ON COLUMN public.user_emails.user_id IS 'Referencia al usuario en auth.users';
COMMENT ON COLUMN public.user_emails.email IS 'Email secundario del usuario';
COMMENT ON COLUMN public.user_emails.is_primary IS 'Email principal';

-- PASO 6: Habilitar RLS
ALTER TABLE public.user_emails ENABLE ROW LEVEL SECURITY;

-- PASO 7: Eliminar políticas existentes
DROP POLICY IF EXISTS "Users can view their own emails" ON public.user_emails;
DROP POLICY IF EXISTS "Users can insert their own emails" ON public.user_emails;
DROP POLICY IF EXISTS "Users can update their own emails" ON public.user_emails;
DROP POLICY IF EXISTS "Users can delete their own emails" ON public.user_emails;

-- PASO 8: Crear políticas
CREATE POLICY "Users can view their own emails"
  ON public.user_emails FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own emails"
  ON public.user_emails FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own emails"
  ON public.user_emails FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own emails"
  ON public.user_emails FOR DELETE
  USING (auth.uid() = user_id);

-- PASO 9: Función para sincronizar email principal y crear usuario
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
  
  -- Crear email principal en user_emails
  INSERT INTO public.user_emails (user_id, email, is_primary)
  VALUES (NEW.id, NEW.email, true)
  ON CONFLICT (email) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN undefined_table THEN
    -- Si la tabla usuarios no existe, solo crear en user_emails
    INSERT INTO public.user_emails (user_id, email, is_primary)
    VALUES (NEW.id, NEW.email, true)
    ON CONFLICT (email) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PASO 10: Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_primary_email();

-- PASO 11: Sincronizar usuarios existentes
INSERT INTO public.user_emails (user_id, email, is_primary)
SELECT id, email, true
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_emails 
  WHERE user_emails.email = auth.users.email
)
ON CONFLICT (email) DO NOTHING;

-- PASO 12: Funciones helper
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(search_email TEXT)
RETURNS UUID AS $$
DECLARE
  found_user_id UUID;
BEGIN
  SELECT user_id INTO found_user_id
  FROM public.user_emails
  WHERE email = search_email
  LIMIT 1;
  RETURN found_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_primary_email(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  primary_email TEXT;
BEGIN
  SELECT email INTO primary_email
  FROM public.user_emails
  WHERE user_id = p_user_id AND is_primary = true
  LIMIT 1;
  
  IF primary_email IS NULL THEN
    SELECT email INTO primary_email
    FROM auth.users
    WHERE id = p_user_id;
  END IF;
  
  RETURN primary_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si un email es secundario y obtener el principal
-- Esta función es pública y puede ser llamada sin autenticación para el login
CREATE OR REPLACE FUNCTION public.check_secondary_email(search_email TEXT)
RETURNS JSON AS $$
DECLARE
  email_record RECORD;
  primary_email TEXT;
BEGIN
  -- Buscar el email en user_emails
  SELECT user_id, is_primary INTO email_record
  FROM public.user_emails
  WHERE email = LOWER(search_email)
  LIMIT 1;
  
  -- Si no existe, retornar que no es secundario
  IF email_record IS NULL THEN
    RETURN json_build_object('is_secondary', false);
  END IF;
  
  -- Si es principal, retornar que no es secundario
  IF email_record.is_primary THEN
    RETURN json_build_object('is_secondary', false);
  END IF;
  
  -- Es secundario, obtener el email principal
  SELECT email INTO primary_email
  FROM public.user_emails
  WHERE user_id = email_record.user_id AND is_primary = true
  LIMIT 1;
  
  -- Si no hay email principal en user_emails, buscar en auth.users
  IF primary_email IS NULL THEN
    SELECT email INTO primary_email
    FROM auth.users
    WHERE id = email_record.user_id;
  END IF;
  
  -- Retornar resultado
  IF primary_email IS NOT NULL THEN
    RETURN json_build_object(
      'is_secondary', true,
      'primary_email', primary_email
    );
  ELSE
    RETURN json_build_object('is_secondary', false);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ✅ Migración completada
