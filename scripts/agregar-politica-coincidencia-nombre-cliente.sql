-- Script para agregar política RLS que permite a usuarios ver registros
-- de clientes cuyo nombre coincide con su nombre de usuario
-- 
-- IMPORTANTE: Esta política se suma a las existentes, no las reemplaza
-- Ejecutar en el SQL Editor de Supabase

-- PASO 1: Crear política adicional para usuarios con nombre coincidente con cliente
-- ===============================================================================

-- Esta política permite que usuarios normales (no admin, no ejecutivo) vean
-- registros donde el nombre del cliente (shipper) coincide con su nombre de usuario
-- Se suma a la política existente que permite ver sus propios registros
CREATE POLICY "Usuarios pueden ver registros de cliente con su nombre"
  ON registros FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM usuarios 
      WHERE auth_user_id = auth.uid() 
        AND rol = 'admin'
    )
    AND NOT EXISTS (
      SELECT 1 FROM usuarios 
      WHERE auth_user_id = auth.uid() 
        AND email LIKE '%@asli.cl'
    )
    AND EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.auth_user_id = auth.uid()
        AND u.rol IN ('usuario', 'lector')
        -- Comparar nombre del usuario con el shipper (case-insensitive)
        AND UPPER(TRIM(COALESCE(registros.shipper, ''))) = UPPER(TRIM(COALESCE(u.nombre, '')))
        AND registros.shipper IS NOT NULL
        AND u.nombre IS NOT NULL
        -- Verificar que el nombre existe en el catálogo de clientes
        AND EXISTS (
          SELECT 1 FROM catalogos c
          WHERE c.categoria = 'clientes'
            AND (
              -- Si valores es un array JSONB, buscar en el array
              (jsonb_typeof(c.valores) = 'array' AND c.valores::text LIKE '%' || u.nombre || '%')
              OR
              -- Si valores es texto, buscar como substring
              (jsonb_typeof(c.valores) != 'array' AND c.valores::text LIKE '%' || u.nombre || '%')
            )
        )
    )
  );

-- PASO 2: Verificar políticas creadas
-- ====================================
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'registros'
  AND cmd = 'SELECT'
ORDER BY policyname;

-- PASO 3: Probar la política (opcional, para verificación)
-- =========================================================
-- Este SELECT mostrará los registros que el usuario actual puede ver
-- según todas las políticas aplicadas
SELECT 
  COUNT(*) as total_registros_visibles,
  COUNT(DISTINCT shipper) as clientes_distintos
FROM registros
WHERE deleted_at IS NULL;

