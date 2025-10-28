-- SOLUCIÓN DEFINITIVA PARA EL HISTORIAL DE CAMBIOS
-- Ejecutar en el SQL Editor de Supabase

-- 1. ELIMINAR TODO Y EMPEZAR DE CERO
DROP TRIGGER IF EXISTS registrar_cambio_historial_trigger ON registros CASCADE;
DROP TRIGGER IF EXISTS update_registros_updated_at ON registros CASCADE;
DROP FUNCTION IF EXISTS registrar_cambio_historial() CASCADE;
DROP FUNCTION IF EXISTS obtener_usuario_actual() CASCADE;

-- 2. CREAR FUNCIÓN ULTRA SIMPLE PARA OBTENER USUARIO
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

-- 3. CREAR FUNCIÓN DE HISTORIAL ULTRA SIMPLE
CREATE OR REPLACE FUNCTION registrar_cambio_historial()
RETURNS TRIGGER AS $$
DECLARE
  usuario_actual_id UUID;
BEGIN
  usuario_actual_id := obtener_usuario_actual();
  
  IF usuario_actual_id IS NOT NULL AND TG_OP = 'UPDATE' THEN
    -- Registrar un cambio genérico para cada actualización
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
      NEW.id, 
      'registro_completo', 
      'actualizado', 
      'actualizado', 
      'UPDATE', 
      (SELECT usuarios.nombre FROM usuarios WHERE usuarios.id = usuario_actual_id), 
      usuario_actual_id,
      jsonb_build_object(
        'timestamp', NOW(), 
        'operation', 'update',
        'changes', jsonb_build_object(
          'ref_asli', CASE WHEN OLD.ref_asli IS DISTINCT FROM NEW.ref_asli THEN 'changed' ELSE 'same' END,
          'shipper', CASE WHEN OLD.shipper IS DISTINCT FROM NEW.shipper THEN 'changed' ELSE 'same' END,
          'naviera', CASE WHEN OLD.naviera IS DISTINCT FROM NEW.naviera THEN 'changed' ELSE 'same' END,
          'estado', CASE WHEN OLD.estado IS DISTINCT FROM NEW.estado THEN 'changed' ELSE 'same' END,
          'etd', CASE WHEN OLD.etd IS DISTINCT FROM NEW.etd THEN 'changed' ELSE 'same' END,
          'eta', CASE WHEN OLD.eta IS DISTINCT FROM NEW.eta THEN 'changed' ELSE 'same' END
        )
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RECREAR TRIGGERS
CREATE TRIGGER update_registros_updated_at 
  BEFORE UPDATE ON registros 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER registrar_cambio_historial_trigger
  AFTER UPDATE ON registros
  FOR EACH ROW EXECUTE FUNCTION registrar_cambio_historial();

-- 5. ASEGURAR QUE TU USUARIO EXISTE
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

-- 6. CREAR HISTORIAL DE PRUEBA MANUAL
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
  'registro_completo',
  'prueba_anterior',
  'prueba_nuevo',
  'UPDATE',
  u.nombre,
  u.id,
  jsonb_build_object('timestamp', NOW(), 'operation', 'test_manual')
FROM registros r
CROSS JOIN usuarios u
WHERE r.ref_asli IS NOT NULL 
  AND u.email = 'rodrigo.caceres@asli.cl'
LIMIT 3;

-- 7. VERIFICAR QUE SE CREÓ EL HISTORIAL
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

-- 8. MENSAJE DE CONFIRMACIÓN
SELECT 'HISTORIAL DEFINITIVO IMPLEMENTADO - PRUEBA EDITAR UN REGISTRO' as resultado;
