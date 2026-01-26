-- Agregar campo shipper a la tabla transportes
-- Esto permite acceder directamente a este dato sin JOIN

-- Agregar la columna si no existe
DO $$
BEGIN
    -- Agregar columna shipper si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transportes' 
        AND column_name = 'shipper'
    ) THEN
        ALTER TABLE transportes ADD COLUMN shipper TEXT;
        COMMENT ON COLUMN transportes.shipper IS 'Nombre del cliente (shipper) - replicado desde registros';
    END IF;
END $$;

-- Poblar el campo existente desde la tabla registros
UPDATE transportes t
SET shipper = r.shipper
FROM registros r
WHERE t.registro_id = r.id
AND t.shipper IS NULL;

-- Crear índice para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_transportes_shipper ON transportes(shipper);

-- Verificar resultados
SELECT 
    COUNT(*) as total_transportes,
    COUNT(shipper) as con_shipper
FROM transportes
WHERE deleted_at IS NULL;

SELECT '✅ Campo shipper agregado y poblado exitosamente' as resultado;
