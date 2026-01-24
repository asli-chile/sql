-- =====================================================
-- VERIFICAR TABLA CATALOGOS
-- =====================================================
-- Ejecutar este SQL manualmente en tu base de datos Supabase
-- Ve a: Database > SQL Editor > pega y ejecuta

-- Verificar si la tabla catalogos existe
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_name = 'catalogos'
ORDER BY table_name;

-- Verificar estructura de la tabla catalogos si existe
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'catalogos'
ORDER BY ordinal_position;

-- Verificar si hay registros con categoria 'plantas'
SELECT categoria, valores, created_at, updated_at
FROM catalogos
WHERE categoria = 'plantas'
ORDER BY created_at DESC;

-- Verificar todas las categorías existentes
SELECT categoria, COUNT(*) as cantidad, 
       AVG(CASE 
         WHEN valores IS NULL THEN 0
         ELSE cardinality(valores)
       END) as cantidad_valores
FROM catalogos
GROUP BY categoria
ORDER BY categoria;

-- Si la tabla no existe, crearla
CREATE TABLE IF NOT EXISTS catalogos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria TEXT NOT NULL,
  valores TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  updated_by TEXT
);

-- Habilitar RLS
ALTER TABLE catalogos ENABLE ROW LEVEL SECURITY;

-- Crear política básica si no existe
DROP POLICY IF EXISTS catalogos_select_policy ON catalogos;
CREATE POLICY catalogos_select_policy
ON catalogos
FOR SELECT
USING (true);

-- Insertar catálogo de plantas si no existe
INSERT INTO catalogos (categoria, valores)
VALUES ('plantas', ARRAY[
  'Planta Central',
  'Planta Norte', 
  'Planta Sur',
  'Planta Este',
  'Planta Oeste',
  'Terminal Puerto',
  'Terminal Aeropuerto',
  'Depósito Principal'
])
ON CONFLICT (categoria) DO UPDATE SET
  valores = EXCLUDED.valores,
  updated_at = NOW();
