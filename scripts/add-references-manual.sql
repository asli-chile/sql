-- =====================================================
-- AGREGAR COLUMNAS DE REFERENCIAS A TABLA TRANSPORTES
-- =====================================================
-- Ejecutar este SQL manualmente en tu base de datos Supabase
-- Ve a: Database > SQL Editor > pega y ejecuta

-- Agregar columna ref_cliente
ALTER TABLE transportes 
ADD COLUMN IF NOT EXISTS ref_cliente TEXT;

-- Agregar columna ref_asli  
ALTER TABLE transportes 
ADD COLUMN IF NOT EXISTS ref_asli TEXT;

-- Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_transportes_ref_cliente ON transportes(ref_cliente);
CREATE INDEX IF NOT EXISTS idx_transportes_ref_asli ON transportes(ref_asli);

-- Verificar que las columnas se agregaron correctamente
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'transportes' 
  AND column_name IN ('ref_cliente', 'ref_asli')
ORDER BY column_name;
