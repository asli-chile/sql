-- scripts/insert-container-prefixes.sql
-- Script para insertar los prefijos de contenedores en la base de datos

-- Crear tabla si no existe
CREATE TABLE IF NOT EXISTS container_prefixes (
  id SERIAL PRIMARY KEY,
  prefix VARCHAR(4) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insertar prefijos únicos
INSERT INTO container_prefixes (prefix) VALUES
('BMOU'),
('CAAU'),
('CAIU'),
('CNIU'),
('CRLU'),
('CRSU'),
('CXRU'),
('FBIU'),
('FSCU'),
('GESU'),
('HLBU'),
('MCAU'),
('MEDU'),
('MMAU'),
('MNBU'),
('MRFU'),
('MSCU'),
('MSDU'),
('MSWU'),
('MWCU'),
('ONEU'),
('OOLU'),
('OTPU'),
('PCIU'),
('SEGU'),
('SUDU'),
('SZLU'),
('TEMU'),
('TGHU'),
('TLLU'),
('TRIU'),
('TTNU')
ON CONFLICT (prefix) DO NOTHING;

-- Verificar inserción
SELECT COUNT(*) as total_prefixes FROM container_prefixes;
SELECT * FROM container_prefixes ORDER BY prefix;
