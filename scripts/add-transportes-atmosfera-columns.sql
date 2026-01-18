-- ============================================
-- AGREGAR COLUMNAS A TABLA TRANSPORTES
-- ============================================
-- Este script agrega todas las columnas necesarias
-- Ejecutar en el SQL Editor de Supabase
-- ============================================

-- Agregar columna ref_cliente (referencia externa)
ALTER TABLE public.transportes
ADD COLUMN IF NOT EXISTS ref_cliente TEXT;

-- Agregar columna atmosfera_controlada (boolean)
ALTER TABLE public.transportes
ADD COLUMN IF NOT EXISTS atmosfera_controlada BOOLEAN DEFAULT FALSE;

-- Agregar columna co2 (número)
ALTER TABLE public.transportes
ADD COLUMN IF NOT EXISTS co2 NUMERIC;

-- Agregar columna o2 (número)
ALTER TABLE public.transportes
ADD COLUMN IF NOT EXISTS o2 NUMERIC;

-- Agregar columna fin_stacking (fecha)
ALTER TABLE public.transportes
ADD COLUMN IF NOT EXISTS fin_stacking DATE;

-- Agregar columna extra_late (boolean)
ALTER TABLE public.transportes
ADD COLUMN IF NOT EXISTS extra_late BOOLEAN DEFAULT FALSE;

-- Agregar campos de datos contenedor
ALTER TABLE public.transportes
ADD COLUMN IF NOT EXISTS horario_retiro TEXT;
ALTER TABLE public.transportes
ADD COLUMN IF NOT EXISTS porteo BOOLEAN DEFAULT FALSE;

-- Agregar campos de datos conductor
ALTER TABLE public.transportes
ADD COLUMN IF NOT EXISTS patente_rem TEXT;

-- Agregar campos de datos presentación
ALTER TABLE public.transportes
ADD COLUMN IF NOT EXISTS ubicacion TEXT;
ALTER TABLE public.transportes
ADD COLUMN IF NOT EXISTS dia_presentacion TEXT;
ALTER TABLE public.transportes
ADD COLUMN IF NOT EXISTS hora_presentacion TEXT;

-- Agregar campos de despacho
ALTER TABLE public.transportes
ADD COLUMN IF NOT EXISTS llegada_planta TEXT;
ALTER TABLE public.transportes
ADD COLUMN IF NOT EXISTS salida_planta TEXT;
ALTER TABLE public.transportes
ADD COLUMN IF NOT EXISTS terminal_portuario TEXT;
ALTER TABLE public.transportes
ADD COLUMN IF NOT EXISTS llegada_puerto TEXT;

-- Agregar campos adicionales
ALTER TABLE public.transportes
ADD COLUMN IF NOT EXISTS ingresado_stacking BOOLEAN DEFAULT FALSE;
ALTER TABLE public.transportes
ADD COLUMN IF NOT EXISTS sobreestadia BOOLEAN DEFAULT FALSE;
ALTER TABLE public.transportes
ADD COLUMN IF NOT EXISTS scanner BOOLEAN DEFAULT FALSE;
ALTER TABLE public.transportes
ADD COLUMN IF NOT EXISTS lote_carga TEXT;
ALTER TABLE public.transportes
ADD COLUMN IF NOT EXISTS observacion TEXT;

-- Agregar comentarios
COMMENT ON COLUMN public.transportes.atmosfera_controlada IS 'Indica si el contenedor tiene atmósfera controlada';
COMMENT ON COLUMN public.transportes.co2 IS 'Nivel de CO2 en porcentaje (solo si atmósfera controlada está activo)';
COMMENT ON COLUMN public.transportes.o2 IS 'Nivel de O2 en porcentaje (solo si atmósfera controlada está activo)';
COMMENT ON COLUMN public.transportes.fin_stacking IS 'Fecha de fin de stacking';
COMMENT ON COLUMN public.transportes.extra_late IS 'Indica si el transporte es extra late';
COMMENT ON COLUMN public.transportes.horario_retiro IS 'Horario de retiro del contenedor';
COMMENT ON COLUMN public.transportes.porteo IS 'Indica si tiene porteo';
COMMENT ON COLUMN public.transportes.patente_rem IS 'Patente del remolque';
COMMENT ON COLUMN public.transportes.ubicacion IS 'Ubicación de la planta';
COMMENT ON COLUMN public.transportes.dia_presentacion IS 'Día de presentación';
COMMENT ON COLUMN public.transportes.hora_presentacion IS 'Hora de presentación';
COMMENT ON COLUMN public.transportes.llegada_planta IS 'Hora de llegada a planta';
COMMENT ON COLUMN public.transportes.salida_planta IS 'Hora de salida de planta';
COMMENT ON COLUMN public.transportes.terminal_portuario IS 'Terminal portuario';
COMMENT ON COLUMN public.transportes.llegada_puerto IS 'Hora de llegada a puerto';
COMMENT ON COLUMN public.transportes.ingresado_stacking IS 'Indica si fue ingresado a stacking';
COMMENT ON COLUMN public.transportes.sobreestadia IS 'Indica si hay sobreestadía';
COMMENT ON COLUMN public.transportes.scanner IS 'Indica si pasó por scanner';
COMMENT ON COLUMN public.transportes.lote_carga IS 'Lote de carga';
COMMENT ON COLUMN public.transportes.observacion IS 'Observaciones adicionales';
COMMENT ON COLUMN public.transportes.ref_cliente IS 'Referencia externa del cliente (refCliente del registro de embarque)';

-- Verificar que las columnas se agregaron correctamente
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'transportes'
  AND column_name IN (
    'ref_cliente',
    'atmosfera_controlada', 'co2', 'o2', 'fin_stacking', 'extra_late',
    'horario_retiro', 'porteo', 'patente_rem',
    'ubicacion', 'dia_presentacion', 'hora_presentacion',
    'llegada_planta', 'salida_planta', 'terminal_portuario', 'llegada_puerto',
    'ingresado_stacking', 'sobreestadia', 'scanner', 'lote_carga', 'observacion'
  );

-- Mensaje de confirmación
SELECT 'Columnas agregadas exitosamente' as resultado;
