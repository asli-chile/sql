-- Script para corregir las políticas RLS de plantillas_proforma
-- El problema es que las políticas actuales verifican contra la tabla usuarios
-- pero pueden fallar si el usuario no está sincronizado correctamente

-- 1. Eliminar políticas actuales
DROP POLICY IF EXISTS "Admins can view all plantillas" ON public.plantillas_proforma;
DROP POLICY IF EXISTS "Admins can insert plantillas" ON public.plantillas_proforma;
DROP POLICY IF EXISTS "Admins can update plantillas" ON public.plantillas_proforma;
DROP POLICY IF EXISTS "Admins can delete plantillas" ON public.plantillas_proforma;

-- 2. Crear políticas más permisivas
-- Permitir lectura a todos los usuarios autenticados
CREATE POLICY "Authenticated users can view plantillas"
ON public.plantillas_proforma
FOR SELECT
TO authenticated
USING (true);

-- Solo Rodrigo puede insertar/actualizar/eliminar
CREATE POLICY "Only Rodrigo can insert plantillas"
ON public.plantillas_proforma
FOR INSERT
TO authenticated
WITH CHECK (
    auth.jwt() ->> 'email' = 'rodrigo.caceres@asli.cl'
);

CREATE POLICY "Only Rodrigo can update plantillas"
ON public.plantillas_proforma
FOR UPDATE
TO authenticated
USING (
    auth.jwt() ->> 'email' = 'rodrigo.caceres@asli.cl'
);

CREATE POLICY "Only Rodrigo can delete plantillas"
ON public.plantillas_proforma
FOR DELETE
TO authenticated
USING (
    auth.jwt() ->> 'email' = 'rodrigo.caceres@asli.cl'
);

-- 3. Verificar las políticas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'plantillas_proforma';
