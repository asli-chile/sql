-- Calcular la distancia que avanzó HMM BLESSING entre las dos posiciones
-- Usando la fórmula de Haversine para calcular distancia en línea recta (great circle distance)

WITH posiciones AS (
  SELECT 
    -- Posición antigua (de la base de datos)
    -35.65407 AS lat_antigua,
    -92.66505 AS lon_antigua,
    '2025-11-16 20:04:00+00'::timestamp AS fecha_antigua,
    
    -- Posición nueva (del JSON más reciente)
    -35.65115 AS lat_nueva,
    -103.16366 AS lon_nueva,
    '2025-11-17 23:01:00+00'::timestamp AS fecha_nueva
)
SELECT 
  -- Coordenadas
  lat_antigua,
  lon_antigua,
  lat_nueva,
  lon_nueva,
  
  -- Fechas
  fecha_antigua,
  fecha_nueva,
  fecha_nueva - fecha_antigua AS tiempo_transcurrido,
  
  -- Cálculo de distancia usando fórmula de Haversine
  -- Radio de la Tierra en kilómetros: 6371 km
  (
    6371 * acos(
      cos(radians(lat_antigua)) * 
      cos(radians(lat_nueva)) * 
      cos(radians(lon_nueva) - radians(lon_antigua)) + 
      sin(radians(lat_antigua)) * 
      sin(radians(lat_nueva))
    )
  ) AS distancia_km,
  
  -- También en millas náuticas (1 nm = 1.852 km)
  (
    6371 * acos(
      cos(radians(lat_antigua)) * 
      cos(radians(lat_nueva)) * 
      cos(radians(lon_nueva) - radians(lon_antigua)) + 
      sin(radians(lat_antigua)) * 
      sin(radians(lat_nueva))
    )
  ) / 1.852 AS distancia_millas_nauticas,
  
  -- Velocidad promedio (si la distancia y tiempo son válidos)
  CASE 
    WHEN (fecha_nueva - fecha_antigua) > INTERVAL '0' 
    THEN (
      6371 * acos(
        cos(radians(lat_antigua)) * 
        cos(radians(lat_nueva)) * 
        cos(radians(lon_nueva) - radians(lon_antigua)) + 
        sin(radians(lat_antigua)) * 
        sin(radians(lat_nueva))
      )
    ) / EXTRACT(EPOCH FROM (fecha_nueva - fecha_antigua)) * 3600 -- km/h
    ELSE NULL
  END AS velocidad_promedio_kmh,
  
  -- Velocidad promedio en nudos (1 nudo = 1.852 km/h)
  CASE 
    WHEN (fecha_nueva - fecha_antigua) > INTERVAL '0' 
    THEN (
      (
        6371 * acos(
          cos(radians(lat_antigua)) * 
          cos(radians(lat_nueva)) * 
          cos(radians(lon_nueva) - radians(lon_antigua)) + 
          sin(radians(lat_antigua)) * 
          sin(radians(lat_nueva))
        )
      ) / EXTRACT(EPOCH FROM (fecha_nueva - fecha_antigua)) * 3600
    ) / 1.852
    ELSE NULL
  END AS velocidad_promedio_nudos
  
FROM posiciones;

-- También mostrar la diferencia en coordenadas
SELECT 
  'Posición Antigua' AS tipo,
  -35.65407 AS latitud,
  -92.66505 AS longitud,
  '2025-11-16 20:04:00+00' AS fecha
UNION ALL
SELECT 
  'Posición Nueva' AS tipo,
  -35.65115 AS latitud,
  -103.16366 AS longitud,
  '2025-11-17 23:01:00+00' AS fecha
ORDER BY fecha;

