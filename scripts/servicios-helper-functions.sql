-- =====================================================
-- FUNCIONES AUXILIARES PARA SERVICIOS
-- =====================================================
-- Funciones útiles para trabajar con servicios y naves
-- =====================================================

-- Función para obtener todas las naves activas de un servicio
CREATE OR REPLACE FUNCTION get_naves_by_servicio(servicio_uuid UUID)
RETURNS TABLE (
  nave_nombre TEXT,
  orden INTEGER,
  activo BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sn.nave_nombre,
    sn.orden,
    sn.activo
  FROM public.servicios_naves sn
  WHERE sn.servicio_id = servicio_uuid
    AND sn.activo = true
  ORDER BY sn.orden ASC, sn.nave_nombre ASC;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener el servicio por nombre
CREATE OR REPLACE FUNCTION get_servicio_by_nombre(servicio_nombre TEXT)
RETURNS TABLE (
  id UUID,
  nombre TEXT,
  consorcio TEXT,
  activo BOOLEAN,
  descripcion TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.nombre,
    s.consorcio,
    s.activo,
    s.descripcion
  FROM public.servicios s
  WHERE s.nombre = servicio_nombre
    AND s.activo = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Función para verificar si una nave pertenece a un servicio
CREATE OR REPLACE FUNCTION nave_belongs_to_servicio(
  nave_nombre_param TEXT,
  servicio_uuid UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  existe BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1
    FROM public.servicios_naves
    WHERE servicio_id = servicio_uuid
      AND nave_nombre = nave_nombre_param
      AND activo = true
  ) INTO existe;
  
  RETURN existe;
END;
$$ LANGUAGE plpgsql;

-- Vista útil: servicios con sus naves
CREATE OR REPLACE VIEW servicios_con_naves AS
SELECT 
  s.id as servicio_id,
  s.nombre as servicio_nombre,
  s.consorcio,
  s.activo as servicio_activo,
  s.descripcion,
  sn.nave_nombre,
  sn.orden,
  sn.activo as nave_activa,
  sn.created_at as nave_asignada_at
FROM public.servicios s
LEFT JOIN public.servicios_naves sn ON s.id = sn.servicio_id
WHERE s.activo = true
ORDER BY s.nombre ASC, sn.orden ASC, sn.nave_nombre ASC;

-- Comentarios
COMMENT ON FUNCTION get_naves_by_servicio IS 'Obtiene todas las naves activas de un servicio ordenadas por orden y nombre';
COMMENT ON FUNCTION get_servicio_by_nombre IS 'Obtiene un servicio por su nombre';
COMMENT ON FUNCTION nave_belongs_to_servicio IS 'Verifica si una nave pertenece a un servicio activo';
COMMENT ON VIEW servicios_con_naves IS 'Vista que muestra todos los servicios con sus naves asignadas';
