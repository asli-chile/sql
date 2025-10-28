-- Script para crear sistema de usuarios y actualizar historial
-- Ejecutar en el SQL Editor de Supabase

-- Crear tabla de usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID UNIQUE, -- ID del usuario en Supabase Auth
  nombre TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  rol TEXT NOT NULL DEFAULT 'usuario' CHECK (rol IN ('admin', 'supervisor', 'usuario', 'lector')),
  activo BOOLEAN DEFAULT true,
  ultimo_acceso TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para usuarios
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol);
CREATE INDEX IF NOT EXISTS idx_usuarios_activo ON usuarios(activo);

-- Insertar usuarios de ejemplo
INSERT INTO usuarios (nombre, email, rol) VALUES
('Administrador Sistema', 'admin@asli.com', 'admin'),
('Supervisor Operaciones', 'supervisor@asli.com', 'supervisor'),
('Usuario Operativo', 'usuario@asli.com', 'usuario'),
('Lector Auditoría', 'auditor@asli.com', 'lector')
ON CONFLICT (email) DO NOTHING;

-- Crear tabla de sesiones activas
CREATE TABLE IF NOT EXISTS sesiones_activas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token_sesion TEXT NOT NULL UNIQUE,
  ip_address INET,
  user_agent TEXT,
  fecha_inicio TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fecha_expiracion TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '8 hours'),
  activa BOOLEAN DEFAULT true
);

-- Crear índices para sesiones
CREATE INDEX IF NOT EXISTS idx_sesiones_usuario ON sesiones_activas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_sesiones_token ON sesiones_activas(token_sesion);
CREATE INDEX IF NOT EXISTS idx_sesiones_activa ON sesiones_activas(activa);

-- Actualizar tabla de historial para incluir usuario real
ALTER TABLE historial_cambios 
ADD COLUMN IF NOT EXISTS usuario_real_id UUID REFERENCES usuarios(id),
ADD COLUMN IF NOT EXISTS sesion_id UUID REFERENCES sesiones_activas(id);

-- Crear función para obtener usuario actual desde Supabase Auth
CREATE OR REPLACE FUNCTION obtener_usuario_actual()
RETURNS UUID AS $$
DECLARE
  usuario_id UUID;
  auth_user_id UUID;
BEGIN
  -- Obtener el ID del usuario autenticado desde Supabase Auth
  auth_user_id := auth.uid();
  
  -- Buscar el usuario en nuestra tabla usuarios por el auth.uid()
  SELECT id INTO usuario_id FROM usuarios WHERE usuarios.auth_user_id = auth_user_id LIMIT 1;
  
  -- Si no existe, crear un usuario básico
  IF usuario_id IS NULL THEN
    INSERT INTO usuarios (auth_user_id, nombre, email, rol)
    VALUES (
      auth_user_id,
      COALESCE(auth.jwt() ->> 'full_name', 'Usuario'),
      auth.email(),
      'usuario'
    )
    RETURNING id INTO usuario_id;
  END IF;
  
  RETURN usuario_id;
END;
$$ LANGUAGE plpgsql;

-- Actualizar función de historial para incluir usuario
CREATE OR REPLACE FUNCTION registrar_cambio_historial()
RETURNS TRIGGER AS $$
DECLARE
  usuario_actual_id UUID;
BEGIN
  -- Obtener usuario actual
  usuario_actual_id := obtener_usuario_actual();
  
  -- Solo procesar si es una actualización
  IF TG_OP = 'UPDATE' THEN
    -- Verificar campos específicos que pueden cambiar
    -- REF ASLI
    IF OLD.ref_asli IS DISTINCT FROM NEW.ref_asli THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, usuario_real_id, metadata)
      VALUES (NEW.id, 'ref_asli', COALESCE(OLD.ref_asli::TEXT, 'NULL'), COALESCE(NEW.ref_asli::TEXT, 'NULL'), 'UPDATE', 
              (SELECT nombre FROM usuarios WHERE id = usuario_actual_id), usuario_actual_id,
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'TEXT'));
    END IF;
    
    -- Cliente (shipper)
    IF OLD.shipper IS DISTINCT FROM NEW.shipper THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, usuario_real_id, metadata)
      VALUES (NEW.id, 'shipper', COALESCE(OLD.shipper::TEXT, 'NULL'), COALESCE(NEW.shipper::TEXT, 'NULL'), 'UPDATE', 
              (SELECT nombre FROM usuarios WHERE id = usuario_actual_id), usuario_actual_id,
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'TEXT'));
    END IF;
    
    -- Booking
    IF OLD.booking IS DISTINCT FROM NEW.booking THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, usuario_real_id, metadata)
      VALUES (NEW.id, 'booking', COALESCE(OLD.booking::TEXT, 'NULL'), COALESCE(NEW.booking::TEXT, 'NULL'), 'UPDATE', 
              (SELECT nombre FROM usuarios WHERE id = usuario_actual_id), usuario_actual_id,
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'TEXT'));
    END IF;
    
    -- Contenedor
    IF OLD.contenedor IS DISTINCT FROM NEW.contenedor THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, usuario_real_id, metadata)
      VALUES (NEW.id, 'contenedor', COALESCE(OLD.contenedor::TEXT, 'NULL'), COALESCE(NEW.contenedor::TEXT, 'NULL'), 'UPDATE', 
              (SELECT nombre FROM usuarios WHERE id = usuario_actual_id), usuario_actual_id,
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'TEXT'));
    END IF;
    
    -- Naviera
    IF OLD.naviera IS DISTINCT FROM NEW.naviera THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, usuario_real_id, metadata)
      VALUES (NEW.id, 'naviera', COALESCE(OLD.naviera::TEXT, 'NULL'), COALESCE(NEW.naviera::TEXT, 'NULL'), 'UPDATE', 
              (SELECT nombre FROM usuarios WHERE id = usuario_actual_id), usuario_actual_id,
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'TEXT'));
    END IF;
    
    -- Nave Inicial
    IF OLD.nave_inicial IS DISTINCT FROM NEW.nave_inicial THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, usuario_real_id, metadata)
      VALUES (NEW.id, 'nave_inicial', COALESCE(OLD.nave_inicial::TEXT, 'NULL'), COALESCE(NEW.nave_inicial::TEXT, 'NULL'), 'UPDATE', 
              (SELECT nombre FROM usuarios WHERE id = usuario_actual_id), usuario_actual_id,
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'TEXT'));
    END IF;
    
    -- Especie
    IF OLD.especie IS DISTINCT FROM NEW.especie THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, usuario_real_id, metadata)
      VALUES (NEW.id, 'especie', COALESCE(OLD.especie::TEXT, 'NULL'), COALESCE(NEW.especie::TEXT, 'NULL'), 'UPDATE', 
              (SELECT nombre FROM usuarios WHERE id = usuario_actual_id), usuario_actual_id,
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'TEXT'));
    END IF;
    
    -- Temperatura
    IF OLD.temperatura IS DISTINCT FROM NEW.temperatura THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, usuario_real_id, metadata)
      VALUES (NEW.id, 'temperatura', COALESCE(OLD.temperatura::TEXT, 'NULL'), COALESCE(NEW.temperatura::TEXT, 'NULL'), 'UPDATE', 
              (SELECT nombre FROM usuarios WHERE id = usuario_actual_id), usuario_actual_id,
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'NUMERIC'));
    END IF;
    
    -- CBM
    IF OLD.cbm IS DISTINCT FROM NEW.cbm THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, usuario_real_id, metadata)
      VALUES (NEW.id, 'cbm', COALESCE(OLD.cbm::TEXT, 'NULL'), COALESCE(NEW.cbm::TEXT, 'NULL'), 'UPDATE', 
              (SELECT nombre FROM usuarios WHERE id = usuario_actual_id), usuario_actual_id,
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'NUMERIC'));
    END IF;
    
    -- CO2
    IF OLD.co2 IS DISTINCT FROM NEW.co2 THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, usuario_real_id, metadata)
      VALUES (NEW.id, 'co2', COALESCE(OLD.co2::TEXT, 'NULL'), COALESCE(NEW.co2::TEXT, 'NULL'), 'UPDATE', 
              (SELECT nombre FROM usuarios WHERE id = usuario_actual_id), usuario_actual_id,
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'NUMERIC'));
    END IF;
    
    -- O2
    IF OLD.o2 IS DISTINCT FROM NEW.o2 THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, usuario_real_id, metadata)
      VALUES (NEW.id, 'o2', COALESCE(OLD.o2::TEXT, 'NULL'), COALESCE(NEW.o2::TEXT, 'NULL'), 'UPDATE', 
              (SELECT nombre FROM usuarios WHERE id = usuario_actual_id), usuario_actual_id,
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'NUMERIC'));
    END IF;
    
    -- POL
    IF OLD.pol IS DISTINCT FROM NEW.pol THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, usuario_real_id, metadata)
      VALUES (NEW.id, 'pol', COALESCE(OLD.pol::TEXT, 'NULL'), COALESCE(NEW.pol::TEXT, 'NULL'), 'UPDATE', 
              (SELECT nombre FROM usuarios WHERE id = usuario_actual_id), usuario_actual_id,
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'TEXT'));
    END IF;
    
    -- POD
    IF OLD.pod IS DISTINCT FROM NEW.pod THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, usuario_real_id, metadata)
      VALUES (NEW.id, 'pod', COALESCE(OLD.pod::TEXT, 'NULL'), COALESCE(NEW.pod::TEXT, 'NULL'), 'UPDATE', 
              (SELECT nombre FROM usuarios WHERE id = usuario_actual_id), usuario_actual_id,
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'TEXT'));
    END IF;
    
    -- Depósito
    IF OLD.deposito IS DISTINCT FROM NEW.deposito THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, usuario_real_id, metadata)
      VALUES (NEW.id, 'deposito', COALESCE(OLD.deposito::TEXT, 'NULL'), COALESCE(NEW.deposito::TEXT, 'NULL'), 'UPDATE', 
              (SELECT nombre FROM usuarios WHERE id = usuario_actual_id), usuario_actual_id,
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'TEXT'));
    END IF;
    
    -- ETD
    IF OLD.etd IS DISTINCT FROM NEW.etd THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, usuario_real_id, metadata)
      VALUES (NEW.id, 'etd', COALESCE(OLD.etd::TEXT, 'NULL'), COALESCE(NEW.etd::TEXT, 'NULL'), 'UPDATE', 
              (SELECT nombre FROM usuarios WHERE id = usuario_actual_id), usuario_actual_id,
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'TIMESTAMP'));
    END IF;
    
    -- ETA
    IF OLD.eta IS DISTINCT FROM NEW.eta THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, usuario_real_id, metadata)
      VALUES (NEW.id, 'eta', COALESCE(OLD.eta::TEXT, 'NULL'), COALESCE(NEW.eta::TEXT, 'NULL'), 'UPDATE', 
              (SELECT nombre FROM usuarios WHERE id = usuario_actual_id), usuario_actual_id,
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'TIMESTAMP'));
    END IF;
    
    -- TT
    IF OLD.tt IS DISTINCT FROM NEW.tt THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, usuario_real_id, metadata)
      VALUES (NEW.id, 'tt', COALESCE(OLD.tt::TEXT, 'NULL'), COALESCE(NEW.tt::TEXT, 'NULL'), 'UPDATE', 
              (SELECT nombre FROM usuarios WHERE id = usuario_actual_id), usuario_actual_id,
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'NUMERIC'));
    END IF;
    
    -- Flete
    IF OLD.flete IS DISTINCT FROM NEW.flete THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, usuario_real_id, metadata)
      VALUES (NEW.id, 'flete', COALESCE(OLD.flete::TEXT, 'NULL'), COALESCE(NEW.flete::TEXT, 'NULL'), 'UPDATE', 
              (SELECT nombre FROM usuarios WHERE id = usuario_actual_id), usuario_actual_id,
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'TEXT'));
    END IF;
    
    -- Ejecutivo
    IF OLD.ejecutivo IS DISTINCT FROM NEW.ejecutivo THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, usuario_real_id, metadata)
      VALUES (NEW.id, 'ejecutivo', COALESCE(OLD.ejecutivo::TEXT, 'NULL'), COALESCE(NEW.ejecutivo::TEXT, 'NULL'), 'UPDATE', 
              (SELECT nombre FROM usuarios WHERE id = usuario_actual_id), usuario_actual_id,
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'TEXT'));
    END IF;
    
    -- Estado
    IF OLD.estado IS DISTINCT FROM NEW.estado THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, usuario_real_id, metadata)
      VALUES (NEW.id, 'estado', COALESCE(OLD.estado::TEXT, 'NULL'), COALESCE(NEW.estado::TEXT, 'NULL'), 'UPDATE', 
              (SELECT nombre FROM usuarios WHERE id = usuario_actual_id), usuario_actual_id,
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'TEXT'));
    END IF;
    
    -- Tipo Ingreso
    IF OLD.tipo_ingreso IS DISTINCT FROM NEW.tipo_ingreso THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, usuario_real_id, metadata)
      VALUES (NEW.id, 'tipo_ingreso', COALESCE(OLD.tipo_ingreso::TEXT, 'NULL'), COALESCE(NEW.tipo_ingreso::TEXT, 'NULL'), 'UPDATE', 
              (SELECT nombre FROM usuarios WHERE id = usuario_actual_id), usuario_actual_id,
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'TEXT'));
    END IF;
    
    -- Contrato
    IF OLD.contrato IS DISTINCT FROM NEW.contrato THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, usuario_real_id, metadata)
      VALUES (NEW.id, 'contrato', COALESCE(OLD.contrato::TEXT, 'NULL'), COALESCE(NEW.contrato::TEXT, 'NULL'), 'UPDATE', 
              (SELECT nombre FROM usuarios WHERE id = usuario_actual_id), usuario_actual_id,
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'TEXT'));
    END IF;
    
    -- Comentario
    IF OLD.comentario IS DISTINCT FROM NEW.comentario THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, usuario_real_id, metadata)
      VALUES (NEW.id, 'comentario', COALESCE(OLD.comentario::TEXT, 'NULL'), COALESCE(NEW.comentario::TEXT, 'NULL'), 'UPDATE', 
              (SELECT nombre FROM usuarios WHERE id = usuario_actual_id), usuario_actual_id,
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'TEXT'));
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear función para obtener historial con información de usuario
CREATE OR REPLACE FUNCTION obtener_historial_registro_con_usuario(registro_uuid UUID)
RETURNS TABLE (
  id UUID,
  campo_modificado TEXT,
  valor_anterior TEXT,
  valor_nuevo TEXT,
  tipo_cambio TEXT,
  usuario_nombre TEXT,
  usuario_email TEXT,
  usuario_rol TEXT,
  fecha_cambio TIMESTAMP WITH TIME ZONE,
  metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    h.id,
    h.campo_modificado,
    h.valor_anterior,
    h.valor_nuevo,
    h.tipo_cambio,
    h.usuario_nombre,
    u.email,
    u.rol,
    h.fecha_cambio,
    h.metadata
  FROM historial_cambios h
  LEFT JOIN usuarios u ON h.usuario_real_id = u.id
  WHERE h.registro_id = registro_uuid
  ORDER BY h.fecha_cambio DESC;
END;
$$ LANGUAGE plpgsql;

-- Agregar comentarios
COMMENT ON TABLE usuarios IS 'Usuarios del sistema ASLI con roles y permisos';
COMMENT ON COLUMN usuarios.nombre IS 'Nombre completo del usuario';
COMMENT ON COLUMN usuarios.email IS 'Email único del usuario';
COMMENT ON COLUMN usuarios.rol IS 'Rol del usuario: admin, supervisor, usuario, lector';
COMMENT ON COLUMN usuarios.activo IS 'Si el usuario está activo en el sistema';

COMMENT ON TABLE sesiones_activas IS 'Sesiones activas de usuarios';
COMMENT ON COLUMN sesiones_activas.token_sesion IS 'Token único de la sesión';
COMMENT ON COLUMN sesiones_activas.fecha_expiracion IS 'Fecha de expiración de la sesión';

-- Verificar que las tablas se crearon correctamente
SELECT 'Sistema de usuarios creado exitosamente' as resultado;
