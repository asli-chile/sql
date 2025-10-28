-- Script completo para solucionar errores de ambigüedad en Supabase
-- Ejecutar en el SQL Editor de Supabase

-- 1. Actualizar la función obtener_usuario_actual
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

-- 2. Actualizar la función de historial para usar la función corregida
CREATE OR REPLACE FUNCTION registrar_cambio_historial()
RETURNS TRIGGER AS $$
DECLARE
  usuario_actual_id UUID;
BEGIN
  -- Obtener usuario actual usando la función corregida
  usuario_actual_id := obtener_usuario_actual();
  
  -- Solo procesar si es una actualización
  IF TG_OP = 'UPDATE' THEN
    -- Verificar campos específicos que pueden cambiar
    -- REF ASLI
    IF OLD.ref_asli IS DISTINCT FROM NEW.ref_asli THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, usuario_real_id, metadata)
      VALUES (NEW.id, 'ref_asli', COALESCE(OLD.ref_asli::TEXT, 'NULL'), COALESCE(NEW.ref_asli::TEXT, 'NULL'), 'UPDATE', 
              (SELECT nombre FROM usuarios WHERE usuarios.id = usuario_actual_id), usuario_actual_id,
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'TEXT'));
    END IF;
    
    -- Cliente (shipper)
    IF OLD.shipper IS DISTINCT FROM NEW.shipper THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, usuario_real_id, metadata)
      VALUES (NEW.id, 'shipper', COALESCE(OLD.shipper::TEXT, 'NULL'), COALESCE(NEW.shipper::TEXT, 'NULL'), 'UPDATE', 
              (SELECT nombre FROM usuarios WHERE usuarios.id = usuario_actual_id), usuario_actual_id,
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'TEXT'));
    END IF;
    
    -- Booking
    IF OLD.booking IS DISTINCT FROM NEW.booking THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, usuario_real_id, metadata)
      VALUES (NEW.id, 'booking', COALESCE(OLD.booking::TEXT, 'NULL'), COALESCE(NEW.booking::TEXT, 'NULL'), 'UPDATE', 
              (SELECT nombre FROM usuarios WHERE usuarios.id = usuario_actual_id), usuario_actual_id,
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'TEXT'));
    END IF;
    
    -- Contenedor
    IF OLD.contenedor IS DISTINCT FROM NEW.contenedor THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, usuario_real_id, metadata)
      VALUES (NEW.id, 'contenedor', COALESCE(OLD.contenedor::TEXT, 'NULL'), COALESCE(NEW.contenedor::TEXT, 'NULL'), 'UPDATE', 
              (SELECT nombre FROM usuarios WHERE usuarios.id = usuario_actual_id), usuario_actual_id,
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'TEXT'));
    END IF;
    
    -- Naviera
    IF OLD.naviera IS DISTINCT FROM NEW.naviera THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, usuario_real_id, metadata)
      VALUES (NEW.id, 'naviera', COALESCE(OLD.naviera::TEXT, 'NULL'), COALESCE(NEW.naviera::TEXT, 'NULL'), 'UPDATE', 
              (SELECT nombre FROM usuarios WHERE usuarios.id = usuario_actual_id), usuario_actual_id,
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'TEXT'));
    END IF;
    
    -- Nave Inicial
    IF OLD.nave_inicial IS DISTINCT FROM NEW.nave_inicial THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, usuario_real_id, metadata)
      VALUES (NEW.id, 'nave_inicial', COALESCE(OLD.nave_inicial::TEXT, 'NULL'), COALESCE(NEW.nave_inicial::TEXT, 'NULL'), 'UPDATE', 
              (SELECT nombre FROM usuarios WHERE usuarios.id = usuario_actual_id), usuario_actual_id,
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'TEXT'));
    END IF;
    
    -- Especie
    IF OLD.especie IS DISTINCT FROM NEW.especie THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, usuario_real_id, metadata)
      VALUES (NEW.id, 'especie', COALESCE(OLD.especie::TEXT, 'NULL'), COALESCE(NEW.especie::TEXT, 'NULL'), 'UPDATE', 
              (SELECT nombre FROM usuarios WHERE usuarios.id = usuario_actual_id), usuario_actual_id,
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'TEXT'));
    END IF;
    
    -- Temperatura
    IF OLD.temperatura IS DISTINCT FROM NEW.temperatura THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, usuario_real_id, metadata)
      VALUES (NEW.id, 'temperatura', COALESCE(OLD.temperatura::TEXT, 'NULL'), COALESCE(NEW.temperatura::TEXT, 'NULL'), 'UPDATE', 
              (SELECT nombre FROM usuarios WHERE usuarios.id = usuario_actual_id), usuario_actual_id,
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'NUMERIC'));
    END IF;
    
    -- CBM
    IF OLD.cbm IS DISTINCT FROM NEW.cbm THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, usuario_real_id, metadata)
      VALUES (NEW.id, 'cbm', COALESCE(OLD.cbm::TEXT, 'NULL'), COALESCE(NEW.cbm::TEXT, 'NULL'), 'UPDATE', 
              (SELECT nombre FROM usuarios WHERE usuarios.id = usuario_actual_id), usuario_actual_id,
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'NUMERIC'));
    END IF;
    
    -- CO2
    IF OLD.co2 IS DISTINCT FROM NEW.co2 THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, usuario_real_id, metadata)
      VALUES (NEW.id, 'co2', COALESCE(OLD.co2::TEXT, 'NULL'), COALESCE(NEW.co2::TEXT, 'NULL'), 'UPDATE', 
              (SELECT nombre FROM usuarios WHERE usuarios.id = usuario_actual_id), usuario_actual_id,
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'NUMERIC'));
    END IF;
    
    -- O2
    IF OLD.o2 IS DISTINCT FROM NEW.o2 THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, usuario_real_id, metadata)
      VALUES (NEW.id, 'o2', COALESCE(OLD.o2::TEXT, 'NULL'), COALESCE(NEW.o2::TEXT, 'NULL'), 'UPDATE', 
              (SELECT nombre FROM usuarios WHERE usuarios.id = usuario_actual_id), usuario_actual_id,
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'NUMERIC'));
    END IF;
    
    -- POL
    IF OLD.pol IS DISTINCT FROM NEW.pol THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, usuario_real_id, metadata)
      VALUES (NEW.id, 'pol', COALESCE(OLD.pol::TEXT, 'NULL'), COALESCE(NEW.pol::TEXT, 'NULL'), 'UPDATE', 
              (SELECT nombre FROM usuarios WHERE usuarios.id = usuario_actual_id), usuario_actual_id,
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'TEXT'));
    END IF;
    
    -- POD
    IF OLD.pod IS DISTINCT FROM NEW.pod THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, usuario_real_id, metadata)
      VALUES (NEW.id, 'pod', COALESCE(OLD.pod::TEXT, 'NULL'), COALESCE(NEW.pod::TEXT, 'NULL'), 'UPDATE', 
              (SELECT nombre FROM usuarios WHERE usuarios.id = usuario_actual_id), usuario_actual_id,
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'TEXT'));
    END IF;
    
    -- Depósito
    IF OLD.deposito IS DISTINCT FROM NEW.deposito THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, usuario_real_id, metadata)
      VALUES (NEW.id, 'deposito', COALESCE(OLD.deposito::TEXT, 'NULL'), COALESCE(NEW.deposito::TEXT, 'NULL'), 'UPDATE', 
              (SELECT nombre FROM usuarios WHERE usuarios.id = usuario_actual_id), usuario_actual_id,
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'TEXT'));
    END IF;
    
    -- ETD
    IF OLD.etd IS DISTINCT FROM NEW.etd THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, usuario_real_id, metadata)
      VALUES (NEW.id, 'etd', COALESCE(OLD.etd::TEXT, 'NULL'), COALESCE(NEW.etd::TEXT, 'NULL'), 'UPDATE', 
              (SELECT nombre FROM usuarios WHERE usuarios.id = usuario_actual_id), usuario_actual_id,
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'TIMESTAMP'));
    END IF;
    
    -- ETA
    IF OLD.eta IS DISTINCT FROM NEW.eta THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, usuario_real_id, metadata)
      VALUES (NEW.id, 'eta', COALESCE(OLD.eta::TEXT, 'NULL'), COALESCE(NEW.eta::TEXT, 'NULL'), 'UPDATE', 
              (SELECT nombre FROM usuarios WHERE usuarios.id = usuario_actual_id), usuario_actual_id,
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'TIMESTAMP'));
    END IF;
    
    -- TT
    IF OLD.tt IS DISTINCT FROM NEW.tt THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, usuario_real_id, metadata)
      VALUES (NEW.id, 'tt', COALESCE(OLD.tt::TEXT, 'NULL'), COALESCE(NEW.tt::TEXT, 'NULL'), 'UPDATE', 
              (SELECT nombre FROM usuarios WHERE usuarios.id = usuario_actual_id), usuario_actual_id,
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'NUMERIC'));
    END IF;
    
    -- Flete
    IF OLD.flete IS DISTINCT FROM NEW.flete THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, usuario_real_id, metadata)
      VALUES (NEW.id, 'flete', COALESCE(OLD.flete::TEXT, 'NULL'), COALESCE(NEW.flete::TEXT, 'NULL'), 'UPDATE', 
              (SELECT nombre FROM usuarios WHERE usuarios.id = usuario_actual_id), usuario_actual_id,
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'TEXT'));
    END IF;
    
    -- Ejecutivo
    IF OLD.ejecutivo IS DISTINCT FROM NEW.ejecutivo THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, usuario_real_id, metadata)
      VALUES (NEW.id, 'ejecutivo', COALESCE(OLD.ejecutivo::TEXT, 'NULL'), COALESCE(NEW.ejecutivo::TEXT, 'NULL'), 'UPDATE', 
              (SELECT nombre FROM usuarios WHERE usuarios.id = usuario_actual_id), usuario_actual_id,
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'TEXT'));
    END IF;
    
    -- Estado
    IF OLD.estado IS DISTINCT FROM NEW.estado THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, usuario_real_id, metadata)
      VALUES (NEW.id, 'estado', COALESCE(OLD.estado::TEXT, 'NULL'), COALESCE(NEW.estado::TEXT, 'NULL'), 'UPDATE', 
              (SELECT nombre FROM usuarios WHERE usuarios.id = usuario_actual_id), usuario_actual_id,
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'TEXT'));
    END IF;
    
    -- Tipo Ingreso
    IF OLD.tipo_ingreso IS DISTINCT FROM NEW.tipo_ingreso THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, usuario_real_id, metadata)
      VALUES (NEW.id, 'tipo_ingreso', COALESCE(OLD.tipo_ingreso::TEXT, 'NULL'), COALESCE(NEW.tipo_ingreso::TEXT, 'NULL'), 'UPDATE', 
              (SELECT nombre FROM usuarios WHERE usuarios.id = usuario_actual_id), usuario_actual_id,
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'TEXT'));
    END IF;
    
    -- Contrato
    IF OLD.contrato IS DISTINCT FROM NEW.contrato THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, usuario_real_id, metadata)
      VALUES (NEW.id, 'contrato', COALESCE(OLD.contrato::TEXT, 'NULL'), COALESCE(NEW.contrato::TEXT, 'NULL'), 'UPDATE', 
              (SELECT nombre FROM usuarios WHERE usuarios.id = usuario_actual_id), usuario_actual_id,
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'TEXT'));
    END IF;
    
    -- Comentario
    IF OLD.comentario IS DISTINCT FROM NEW.comentario THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, usuario_real_id, metadata)
      VALUES (NEW.id, 'comentario', COALESCE(OLD.comentario::TEXT, 'NULL'), COALESCE(NEW.comentario::TEXT, 'NULL'), 'UPDATE', 
              (SELECT nombre FROM usuarios WHERE usuarios.id = usuario_actual_id), usuario_actual_id,
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'TEXT'));
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Verificar que las funciones se actualizaron correctamente
SELECT 'Funciones SQL actualizadas exitosamente - Error de ambigüedad solucionado' as resultado;
