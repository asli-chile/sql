-- Script para permitir lectura de plantillas a todos los usuarios autenticados
-- Esto es necesario para que los usuarios puedan usar las plantillas al generar facturas

-- 1. Eliminar políticas existentes de SELECT
DROP POLICY IF EXISTS "Admins can view all plantillas" ON public.plantillas_proforma;
DROP POLICY IF EXISTS "Authenticated users can view plantillas" ON public.plantillas_proforma;
DROP POLICY IF EXISTS "public_plantillas_select" ON public.plantillas_proforma;

-- 2. Crear política permisiva para LECTURA
-- Permitir a TODOS los usuarios autenticados leer plantillas
CREATE POLICY "All authenticated users can view plantillas"
ON public.plantillas_proforma
FOR SELECT
TO authenticated
USING (true);

-- 3. Verificar las políticas creadas
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual
FROM pg_policies
WHERE tablename = 'plantillas_proforma'
ORDER BY cmd, policyname;
