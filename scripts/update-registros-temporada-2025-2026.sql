-- Actualizar todos los registros a la temporada 2025-2026
-- Primero agregar la columna temporada si no existe
ALTER TABLE public.registros
ADD COLUMN IF NOT EXISTS temporada TEXT;

-- Actualizar todos los registros a temporada 2025-2026
UPDATE public.registros
SET temporada = '2025-2026',
    updated_at = NOW()
WHERE deleted_at IS NULL;

-- Opcional: Verificar cuántos registros se actualizaron
-- SELECT COUNT(*) as total_actualizados, temporada 
-- FROM public.registros 
-- WHERE deleted_at IS NULL 
-- GROUP BY temporada;
