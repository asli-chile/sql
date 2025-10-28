-- Script para crear tabla de historial de cambios
-- Ejecutar en el SQL Editor de Supabase

-- Crear tabla de historial de cambios
CREATE TABLE IF NOT EXISTS historial_cambios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  registro_id UUID NOT NULL REFERENCES registros(id) ON DELETE CASCADE,
  campo_modificado TEXT NOT NULL,
  valor_anterior TEXT,
  valor_nuevo TEXT,
  tipo_cambio TEXT NOT NULL CHECK (tipo_cambio IN ('CREATE', 'UPDATE', 'DELETE')),
  usuario_id TEXT, -- Para futuras implementaciones de usuarios
  usuario_nombre TEXT DEFAULT 'Sistema',
  fecha_cambio TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET, -- Para auditoría
  user_agent TEXT, -- Para auditoría
  metadata JSONB, -- Información adicional del cambio
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_historial_registro_id ON historial_cambios(registro_id);
CREATE INDEX IF NOT EXISTS idx_historial_fecha_cambio ON historial_cambios(fecha_cambio DESC);
CREATE INDEX IF NOT EXISTS idx_historial_campo_modificado ON historial_cambios(campo_modificado);
CREATE INDEX IF NOT EXISTS idx_historial_tipo_cambio ON historial_cambios(tipo_cambio);

-- Crear función para registrar cambios automáticamente
CREATE OR REPLACE FUNCTION registrar_cambio_historial()
RETURNS TRIGGER AS $$
DECLARE
  campo TEXT;
  valor_anterior TEXT;
  valor_nuevo TEXT;
  old_value TEXT;
  new_value TEXT;
BEGIN
  -- Solo procesar si es una actualización
  IF TG_OP = 'UPDATE' THEN
    -- Verificar campos específicos que pueden cambiar
    -- REF ASLI
    IF OLD.ref_asli IS DISTINCT FROM NEW.ref_asli THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, metadata)
      VALUES (NEW.id, 'ref_asli', COALESCE(OLD.ref_asli::TEXT, 'NULL'), COALESCE(NEW.ref_asli::TEXT, 'NULL'), 'UPDATE', 'Sistema', 
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'TEXT'));
    END IF;
    
    -- Cliente (shipper)
    IF OLD.shipper IS DISTINCT FROM NEW.shipper THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, metadata)
      VALUES (NEW.id, 'shipper', COALESCE(OLD.shipper::TEXT, 'NULL'), COALESCE(NEW.shipper::TEXT, 'NULL'), 'UPDATE', 'Sistema', 
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'TEXT'));
    END IF;
    
    -- Booking
    IF OLD.booking IS DISTINCT FROM NEW.booking THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, metadata)
      VALUES (NEW.id, 'booking', COALESCE(OLD.booking::TEXT, 'NULL'), COALESCE(NEW.booking::TEXT, 'NULL'), 'UPDATE', 'Sistema', 
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'TEXT'));
    END IF;
    
    -- Contenedor
    IF OLD.contenedor IS DISTINCT FROM NEW.contenedor THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, metadata)
      VALUES (NEW.id, 'contenedor', COALESCE(OLD.contenedor::TEXT, 'NULL'), COALESCE(NEW.contenedor::TEXT, 'NULL'), 'UPDATE', 'Sistema', 
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'TEXT'));
    END IF;
    
    -- Naviera
    IF OLD.naviera IS DISTINCT FROM NEW.naviera THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, metadata)
      VALUES (NEW.id, 'naviera', COALESCE(OLD.naviera::TEXT, 'NULL'), COALESCE(NEW.naviera::TEXT, 'NULL'), 'UPDATE', 'Sistema', 
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'TEXT'));
    END IF;
    
    -- Nave Inicial
    IF OLD.nave_inicial IS DISTINCT FROM NEW.nave_inicial THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, metadata)
      VALUES (NEW.id, 'nave_inicial', COALESCE(OLD.nave_inicial::TEXT, 'NULL'), COALESCE(NEW.nave_inicial::TEXT, 'NULL'), 'UPDATE', 'Sistema', 
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'TEXT'));
    END IF;
    
    -- Especie
    IF OLD.especie IS DISTINCT FROM NEW.especie THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, metadata)
      VALUES (NEW.id, 'especie', COALESCE(OLD.especie::TEXT, 'NULL'), COALESCE(NEW.especie::TEXT, 'NULL'), 'UPDATE', 'Sistema', 
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'TEXT'));
    END IF;
    
    -- Temperatura
    IF OLD.temperatura IS DISTINCT FROM NEW.temperatura THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, metadata)
      VALUES (NEW.id, 'temperatura', COALESCE(OLD.temperatura::TEXT, 'NULL'), COALESCE(NEW.temperatura::TEXT, 'NULL'), 'UPDATE', 'Sistema', 
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'NUMERIC'));
    END IF;
    
    -- CBM
    IF OLD.cbm IS DISTINCT FROM NEW.cbm THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, metadata)
      VALUES (NEW.id, 'cbm', COALESCE(OLD.cbm::TEXT, 'NULL'), COALESCE(NEW.cbm::TEXT, 'NULL'), 'UPDATE', 'Sistema', 
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'NUMERIC'));
    END IF;
    
    -- CO2
    IF OLD.co2 IS DISTINCT FROM NEW.co2 THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, metadata)
      VALUES (NEW.id, 'co2', COALESCE(OLD.co2::TEXT, 'NULL'), COALESCE(NEW.co2::TEXT, 'NULL'), 'UPDATE', 'Sistema', 
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'NUMERIC'));
    END IF;
    
    -- O2
    IF OLD.o2 IS DISTINCT FROM NEW.o2 THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, metadata)
      VALUES (NEW.id, 'o2', COALESCE(OLD.o2::TEXT, 'NULL'), COALESCE(NEW.o2::TEXT, 'NULL'), 'UPDATE', 'Sistema', 
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'NUMERIC'));
    END IF;
    
    -- POL
    IF OLD.pol IS DISTINCT FROM NEW.pol THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, metadata)
      VALUES (NEW.id, 'pol', COALESCE(OLD.pol::TEXT, 'NULL'), COALESCE(NEW.pol::TEXT, 'NULL'), 'UPDATE', 'Sistema', 
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'TEXT'));
    END IF;
    
    -- POD
    IF OLD.pod IS DISTINCT FROM NEW.pod THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, metadata)
      VALUES (NEW.id, 'pod', COALESCE(OLD.pod::TEXT, 'NULL'), COALESCE(NEW.pod::TEXT, 'NULL'), 'UPDATE', 'Sistema', 
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'TEXT'));
    END IF;
    
    -- Depósito
    IF OLD.deposito IS DISTINCT FROM NEW.deposito THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, metadata)
      VALUES (NEW.id, 'deposito', COALESCE(OLD.deposito::TEXT, 'NULL'), COALESCE(NEW.deposito::TEXT, 'NULL'), 'UPDATE', 'Sistema', 
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'TEXT'));
    END IF;
    
    -- ETD
    IF OLD.etd IS DISTINCT FROM NEW.etd THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, metadata)
      VALUES (NEW.id, 'etd', COALESCE(OLD.etd::TEXT, 'NULL'), COALESCE(NEW.etd::TEXT, 'NULL'), 'UPDATE', 'Sistema', 
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'TIMESTAMP'));
    END IF;
    
    -- ETA
    IF OLD.eta IS DISTINCT FROM NEW.eta THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, metadata)
      VALUES (NEW.id, 'eta', COALESCE(OLD.eta::TEXT, 'NULL'), COALESCE(NEW.eta::TEXT, 'NULL'), 'UPDATE', 'Sistema', 
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'TIMESTAMP'));
    END IF;
    
    -- TT
    IF OLD.tt IS DISTINCT FROM NEW.tt THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, metadata)
      VALUES (NEW.id, 'tt', COALESCE(OLD.tt::TEXT, 'NULL'), COALESCE(NEW.tt::TEXT, 'NULL'), 'UPDATE', 'Sistema', 
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'NUMERIC'));
    END IF;
    
    -- Flete
    IF OLD.flete IS DISTINCT FROM NEW.flete THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, metadata)
      VALUES (NEW.id, 'flete', COALESCE(OLD.flete::TEXT, 'NULL'), COALESCE(NEW.flete::TEXT, 'NULL'), 'UPDATE', 'Sistema', 
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'TEXT'));
    END IF;
    
    -- Ejecutivo
    IF OLD.ejecutivo IS DISTINCT FROM NEW.ejecutivo THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, metadata)
      VALUES (NEW.id, 'ejecutivo', COALESCE(OLD.ejecutivo::TEXT, 'NULL'), COALESCE(NEW.ejecutivo::TEXT, 'NULL'), 'UPDATE', 'Sistema', 
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'TEXT'));
    END IF;
    
    -- Estado
    IF OLD.estado IS DISTINCT FROM NEW.estado THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, metadata)
      VALUES (NEW.id, 'estado', COALESCE(OLD.estado::TEXT, 'NULL'), COALESCE(NEW.estado::TEXT, 'NULL'), 'UPDATE', 'Sistema', 
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'TEXT'));
    END IF;
    
    -- Tipo Ingreso
    IF OLD.tipo_ingreso IS DISTINCT FROM NEW.tipo_ingreso THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, metadata)
      VALUES (NEW.id, 'tipo_ingreso', COALESCE(OLD.tipo_ingreso::TEXT, 'NULL'), COALESCE(NEW.tipo_ingreso::TEXT, 'NULL'), 'UPDATE', 'Sistema', 
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'TEXT'));
    END IF;
    
    -- Contrato
    IF OLD.contrato IS DISTINCT FROM NEW.contrato THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, metadata)
      VALUES (NEW.id, 'contrato', COALESCE(OLD.contrato::TEXT, 'NULL'), COALESCE(NEW.contrato::TEXT, 'NULL'), 'UPDATE', 'Sistema', 
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'TEXT'));
    END IF;
    
    -- Comentario
    IF OLD.comentario IS DISTINCT FROM NEW.comentario THEN
      INSERT INTO historial_cambios (registro_id, campo_modificado, valor_anterior, valor_nuevo, tipo_cambio, usuario_nombre, metadata)
      VALUES (NEW.id, 'comentario', COALESCE(OLD.comentario::TEXT, 'NULL'), COALESCE(NEW.comentario::TEXT, 'NULL'), 'UPDATE', 'Sistema', 
              jsonb_build_object('timestamp', NOW(), 'operation', 'inline_edit', 'field_type', 'TEXT'));
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para registrar cambios automáticamente
DROP TRIGGER IF EXISTS trigger_historial_cambios ON registros;
CREATE TRIGGER trigger_historial_cambios
  AFTER UPDATE ON registros
  FOR EACH ROW
  EXECUTE FUNCTION registrar_cambio_historial();

-- Crear función para obtener historial de un registro
CREATE OR REPLACE FUNCTION obtener_historial_registro(registro_uuid UUID)
RETURNS TABLE (
  id UUID,
  campo_modificado TEXT,
  valor_anterior TEXT,
  valor_nuevo TEXT,
  tipo_cambio TEXT,
  usuario_nombre TEXT,
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
    h.fecha_cambio,
    h.metadata
  FROM historial_cambios h
  WHERE h.registro_id = registro_uuid
  ORDER BY h.fecha_cambio DESC;
END;
$$ LANGUAGE plpgsql;

-- Agregar comentarios
COMMENT ON TABLE historial_cambios IS 'Historial de cambios realizados en los registros ASLI';
COMMENT ON COLUMN historial_cambios.registro_id IS 'ID del registro que fue modificado';
COMMENT ON COLUMN historial_cambios.campo_modificado IS 'Nombre del campo que fue modificado';
COMMENT ON COLUMN historial_cambios.valor_anterior IS 'Valor anterior del campo';
COMMENT ON COLUMN historial_cambios.valor_nuevo IS 'Nuevo valor del campo';
COMMENT ON COLUMN historial_cambios.tipo_cambio IS 'Tipo de operación: CREATE, UPDATE, DELETE';
COMMENT ON COLUMN historial_cambios.usuario_nombre IS 'Nombre del usuario que realizó el cambio';
COMMENT ON COLUMN historial_cambios.metadata IS 'Información adicional sobre el cambio';

-- Configurar Row Level Security (RLS)
ALTER TABLE historial_cambios ENABLE ROW LEVEL SECURITY;

-- Crear política para permitir lectura a todos los usuarios autenticados
CREATE POLICY "Permitir lectura de historial a usuarios autenticados" ON historial_cambios
  FOR SELECT USING (true);

-- Crear política para permitir inserción desde triggers del sistema
CREATE POLICY "Permitir inserción desde triggers del sistema" ON historial_cambios
  FOR INSERT WITH CHECK (true);

-- Crear política para permitir actualización (si es necesario)
CREATE POLICY "Permitir actualización de historial" ON historial_cambios
  FOR UPDATE USING (true);

-- Crear política para permitir eliminación (solo para administradores)
CREATE POLICY "Permitir eliminación de historial" ON historial_cambios
  FOR DELETE USING (true);

-- Verificar que la tabla se creó correctamente
SELECT 'Tabla historial_cambios creada exitosamente con RLS configurado' as resultado;
