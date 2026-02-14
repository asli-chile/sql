-- =====================================================
-- CREAR CATÁLOGO DE POLS (PUERTOS DE ORIGEN)
-- =====================================================
-- Este script crea o actualiza el catálogo de puertos de origen (POLs)
-- POL = Port of Loading (Puerto de Carga/Origen)
-- Ejecutar en el SQL Editor de Supabase
-- =====================================================

-- Verificar si existe el catálogo de pols
SELECT categoria, valores, created_at, updated_at
FROM catalogos
WHERE categoria = 'pols';

-- Si no existe, crearlo con valores comunes de puertos chilenos
INSERT INTO catalogos (categoria, valores)
VALUES ('pols', ARRAY[
  'Antofagasta',
  'Arica',
  'Caldera',
  'Coquimbo',
  'Coronel',
  'Iquique',
  'Lirquén',
  'Puerto Montt',
  'Punta Arenas',
  'San Antonio',
  'San Vicente',
  'Talcahuano',
  'Valparaíso',
  'Ventanas'
]::TEXT[])
ON CONFLICT (categoria) DO UPDATE SET
  valores = EXCLUDED.valores,
  updated_at = NOW();

-- Verificar que se creó correctamente
SELECT categoria, valores, created_at, updated_at
FROM catalogos
WHERE categoria = 'pols';

-- =====================================================
-- NOTAS:
-- =====================================================
-- - POL (Port of Loading): Puerto de origen/carga
-- - POD (Port of Discharge): Puerto de destino (se maneja en catalogos_destinos)
-- 
-- Para agregar un puerto nuevo a POLs:
-- UPDATE catalogos
-- SET valores = array_append(valores, 'NUEVO_PUERTO'),
--     updated_at = NOW()
-- WHERE categoria = 'pols';
--
-- Para PODs, usar la tabla catalogos_destinos en su lugar.

