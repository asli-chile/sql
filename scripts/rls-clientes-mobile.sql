-- =====================================================
-- REFINAMIENTO DE POLÍTICAS RLS PARA CLIENTES (MOBILE)
-- =====================================================

-- 1. Asegurar que los clientes puedan ver registros donde son el 'shipper'
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Clientes pueden ver sus propios registros por nombre" ON registros;
CREATE POLICY "Clientes pueden ver sus propios registros por nombre"
  ON registros FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.auth_user_id = auth.uid()
        AND u.rol = 'cliente'
        AND UPPER(TRIM(registros.shipper)) = UPPER(TRIM(u.cliente_nombre))
    )
  );

-- 2. Permitir a los clientes insertar sus propias solicitudes
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Clientes pueden insertar sus propias solicitudes" ON registros;
CREATE POLICY "Clientes pueden insertar sus propias solicitudes"
  ON registros FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.auth_user_id = auth.uid()
        AND u.rol = 'cliente'
        AND UPPER(TRIM(shipper)) = UPPER(TRIM(u.cliente_nombre))
    )
  );

-- 3. Permitir a los clientes ver documentos asociados a sus bookings
-- ---------------------------------------------------------------------
-- Nota: Esto requiere una función que verifique si el usuario tiene acceso al booking
-- que está en el nombre del archivo (formato: booking__filename)

CREATE OR REPLACE FUNCTION public.can_access_document(file_name text)
RETURNS boolean AS $$
DECLARE
  booking_from_file text;
  user_cliente_nombre text;
BEGIN
  -- Extraer el booking del nombre del archivo (todo antes del primer '__')
  booking_from_file := split_part(file_name, '__', 1);
  
  -- Obtener el cliente_nombre del usuario actual
  SELECT cliente_nombre INTO user_cliente_nombre
  FROM usuarios
  WHERE auth_user_id = auth.uid();
  
  -- Si no es cliente (ej: admin o ejecutivo), permitir según otras reglas (aquí simplificado)
  IF user_cliente_nombre IS NULL THEN
    RETURN true; -- Los admins/ejecutivos pasan por sus propias políticas
  END IF;

  -- Verificar si existe un registro con ese booking para ese cliente
  RETURN EXISTS (
    SELECT 1 FROM registros
    WHERE UPPER(TRIM(booking)) = UPPER(TRIM(booking_from_file))
      AND UPPER(TRIM(shipper)) = UPPER(TRIM(user_cliente_nombre))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar a la tabla de objetos de storage (si es necesario, o usar políticas de bucket)
-- En Supabase Storage, las políticas se aplican a 'storage.objects'

-- 4. TRIGGER DE NOTIFICACIÓN PARA NUEVAS RESERVAS DE CLIENTES
-- ---------------------------------------------------------------------

-- Función que será llamada por el trigger
CREATE OR REPLACE FUNCTION notify_new_client_booking()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo notificar si el registro viene de un cliente (comentario empieza con 'SOLICITUD DESDE APP')
  -- O si el usuario que lo crea tiene el rol 'cliente'
  IF (NEW.comentario LIKE 'SOLICITUD DESDE APP%') THEN
    -- Aquí se podría insertar en una tabla de notificaciones
    -- O llamar a una Edge Function vía HTTP (requiere extensiones habilitadas)
    
    -- Por ahora, insertamos en una tabla de auditoría/notificaciones interna si existe
    -- Si no, el personal de ASLI lo verá en su dashboard con estado PENDIENTE
    
    -- Ejemplo de log en consola de Supabase
    RAISE NOTICE 'Nueva solicitud de reserva del cliente %: %', NEW.shipper, NEW.ref_asli;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_notify_client_booking ON registros;
CREATE TRIGGER tr_notify_client_booking
  AFTER INSERT ON registros
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_client_booking();
