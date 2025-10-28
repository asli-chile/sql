-- SOLUCIÓN ULTRA SIMPLE - SIN TRIGGERS AUTOMÁTICOS
-- Ejecutar en el SQL Editor de Supabase

-- 1. ELIMINAR TODOS LOS TRIGGERS PROBLEMÁTICOS
DROP TRIGGER IF EXISTS registrar_cambio_historial_trigger ON registros CASCADE;
DROP TRIGGER IF EXISTS update_registros_updated_at ON registros CASCADE;
DROP FUNCTION IF EXISTS registrar_cambio_historial() CASCADE;
DROP FUNCTION IF EXISTS obtener_usuario_actual() CASCADE;

-- 2. CREAR FUNCIÓN SIMPLE PARA OBTENER USUARIO
CREATE OR REPLACE FUNCTION obtener_usuario_actual()
RETURNS UUID AS $$
DECLARE
  usuario_id UUID;
  current_auth_id UUID;
BEGIN
  current_auth_id := auth.uid();
  
  IF current_auth_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  SELECT id INTO usuario_id FROM usuarios WHERE usuarios.auth_user_id = current_auth_id;
  
  IF usuario_id IS NOT NULL THEN
    RETURN usuario_id;
  END IF;
  
  INSERT INTO usuarios (auth_user_id, nombre, email, rol)
  VALUES (
    current_auth_id,
    COALESCE(auth.jwt() ->> 'full_name', 'Usuario'),
    COALESCE(auth.email(), 'usuario_' || current_auth_id::text || '@temporal.com'),
    'usuario'
  )
  RETURNING id INTO usuario_id;
  
  RETURN usuario_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. CREAR FUNCIÓN PARA CREAR HISTORIAL MANUALMENTE
CREATE OR REPLACE FUNCTION crear_historial_manual(
  registro_uuid UUID, 
  campo TEXT, 
  valor_anterior TEXT, 
  valor_nuevo TEXT
)
RETURNS VOID AS $$
DECLARE
  usuario_id UUID;
BEGIN
  usuario_id := obtener_usuario_actual();
  
  IF usuario_id IS NOT NULL THEN
    INSERT INTO historial_cambios (
      registro_id, 
      campo_modificado, 
      valor_anterior, 
      valor_nuevo, 
      tipo_cambio, 
      usuario_nombre, 
      usuario_real_id, 
      metadata
    )
    VALUES (
      registro_uuid, 
      campo, 
      valor_anterior, 
      valor_nuevo, 
      'UPDATE', 
      (SELECT usuarios.nombre FROM usuarios WHERE usuarios.id = usuario_id), 
      usuario_id,
      jsonb_build_object('timestamp', NOW(), 'operation', 'manual')
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. ASEGURAR QUE TU USUARIO EXISTE
INSERT INTO usuarios (auth_user_id, nombre, email, rol)
SELECT 
  id,
  COALESCE(raw_user_meta_data->>'full_name', 'Rodrigo Caceres'),
  email,
  'admin'
FROM auth.users 
WHERE email = 'rodrigo.caceres@asli.cl'
ON CONFLICT (email) DO UPDATE SET
  auth_user_id = EXCLUDED.auth_user_id,
  nombre = EXCLUDED.nombre,
  rol = 'admin';

-- 5. CREAR HISTORIAL DE PRUEBA MANUAL
INSERT INTO historial_cambios (
  registro_id, 
  campo_modificado, 
  valor_anterior, 
  valor_nuevo, 
  tipo_cambio, 
  usuario_nombre, 
  usuario_real_id, 
  metadata
)
SELECT 
  r.id,
  'estado',
  'PENDIENTE',
  'CONFIRMADO',
  'UPDATE',
  u.nombre,
  u.id,
  jsonb_build_object('timestamp', NOW(), 'operation', 'test_manual')
FROM registros r
CROSS JOIN usuarios u
WHERE r.ref_asli IS NOT NULL 
  AND u.email = 'rodrigo.caceres@asli.cl'
LIMIT 5;

-- 6. VERIFICAR QUE SE CREÓ EL HISTORIAL
SELECT 
  h.id,
  h.registro_id,
  h.campo_modificado,
  h.valor_anterior,
  h.valor_nuevo,
  h.usuario_nombre,
  h.fecha_cambio,
  r.ref_asli
FROM historial_cambios h
LEFT JOIN registros r ON h.registro_id = r.id
ORDER BY h.fecha_cambio DESC
LIMIT 10;

-- 7. MENSAJE DE CONFIRMACIÓN
SELECT 'HISTORIAL ULTRA SIMPLE IMPLEMENTADO - USA LA FUNCIÓN MANUAL' as resultado;
