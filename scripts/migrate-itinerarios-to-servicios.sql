-- =====================================================
-- MIGRAR ITINERARIOS PARA USAR TABLA DE SERVICIOS
-- =====================================================
-- Este script modifica la tabla itinerarios para que use
-- la foreign key a servicios en lugar del campo texto servicio
-- =====================================================

-- Paso 1: Agregar columna servicio_id a itinerarios (nullable inicialmente)
ALTER TABLE public.itinerarios
ADD COLUMN IF NOT EXISTS servicio_id UUID REFERENCES public.servicios(id) ON DELETE SET NULL;

-- Paso 2: Crear índice para mejorar consultas
CREATE INDEX IF NOT EXISTS idx_itinerarios_servicio_id ON public.itinerarios(servicio_id);

-- Paso 3: Migrar datos existentes (si hay servicios con nombres que coincidan)
-- Esto crea servicios basados en los valores únicos del campo servicio actual
-- y luego actualiza los itinerarios para referenciarlos
DO $$
DECLARE
  servicio_record RECORD;
  servicio_id_val UUID;
BEGIN
  -- Para cada servicio único en itinerarios, crear o encontrar el servicio correspondiente
  FOR servicio_record IN 
    SELECT DISTINCT servicio, consorcio 
    FROM public.itinerarios 
    WHERE servicio IS NOT NULL AND servicio != ''
  LOOP
    -- Buscar si ya existe un servicio con ese nombre
    SELECT id INTO servicio_id_val
    FROM public.servicios
    WHERE nombre = servicio_record.servicio
    LIMIT 1;
    
    -- Si no existe, crearlo
    IF servicio_id_val IS NULL THEN
      INSERT INTO public.servicios (nombre, consorcio, activo)
      VALUES (servicio_record.servicio, servicio_record.consorcio, true)
      RETURNING id INTO servicio_id_val;
    END IF;
    
    -- Actualizar todos los itinerarios con ese servicio
    UPDATE public.itinerarios
    SET servicio_id = servicio_id_val
    WHERE servicio = servicio_record.servicio
      AND servicio_id IS NULL;
  END LOOP;
END $$;

-- Paso 4: Agregar comentario
COMMENT ON COLUMN public.itinerarios.servicio_id IS 'ID del servicio al que pertenece este itinerario (referencia a servicios)';

-- Nota: El campo servicio (texto) se mantiene por compatibilidad hacia atrás
-- pero se recomienda usar servicio_id en el futuro. Si quieres eliminar el campo servicio,
-- descomenta las siguientes líneas después de verificar que todo funciona correctamente:

-- ALTER TABLE public.itinerarios DROP COLUMN IF EXISTS servicio;
-- ALTER TABLE public.itinerarios DROP COLUMN IF EXISTS consorcio;

-- Verificar la migración
SELECT 
  i.id,
  i.servicio as servicio_antiguo,
  s.nombre as servicio_nuevo,
  i.nave,
  i.viaje
FROM public.itinerarios i
LEFT JOIN public.servicios s ON i.servicio_id = s.id
LIMIT 10;
