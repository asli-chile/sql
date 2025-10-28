-- Script para crear usuarios de prueba
-- Ejecutar en el SQL Editor de Supabase

-- Insertar usuarios de prueba (estos se sincronizarán con Supabase Auth)
INSERT INTO usuarios (nombre, email, rol, auth_user_id) VALUES
('Administrador Sistema', 'admin@asli.com', 'admin', gen_random_uuid()),
('Supervisor Operaciones', 'supervisor@asli.com', 'supervisor', gen_random_uuid()),
('Usuario Operativo', 'usuario@asli.com', 'usuario', gen_random_uuid()),
('Lector Auditoría', 'auditor@asli.com', 'lector', gen_random_uuid())
ON CONFLICT (email) DO NOTHING;

-- Verificar usuarios creados
SELECT id, nombre, email, rol, activo, created_at 
FROM usuarios 
ORDER BY created_at DESC;

-- Mostrar mensaje de confirmación
SELECT 'Usuarios de prueba creados exitosamente' as resultado;
