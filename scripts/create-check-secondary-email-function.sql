-- Script para crear la función check_secondary_email en Supabase
-- Ejecutar este script en el SQL Editor de Supabase si la función no existe

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

-- Otorgar permisos de ejecución
GRANT EXECUTE ON FUNCTION public.check_secondary_email(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.check_secondary_email(TEXT) TO authenticated;

-- ✅ Función creada correctamente

