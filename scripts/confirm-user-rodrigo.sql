-- Script para deshabilitar confirmación de email en Supabase
-- Ejecutar en el SQL Editor de Supabase

-- Actualizar configuración de autenticación para no requerir confirmación de email
-- Esto debe hacerse desde el panel de Supabase, no desde SQL

-- Alternativa: Confirmar manualmente el usuario desde el panel
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email = 'rodrigo.caceres@asli.cl';

-- También crear el usuario en nuestra tabla de usuarios
INSERT INTO usuarios (auth_user_id, nombre, email, rol) 
VALUES (
  (SELECT id FROM auth.users WHERE email = 'rodrigo.caceres@asli.cl'),
  'Rodrigo Caceres',
  'rodrigo.caceres@asli.cl',
  'admin'
) ON CONFLICT (email) DO NOTHING;
