-- Script v2 para corregir las políticas RLS de plantillas_proforma
-- Solución definitiva: permitir lectura a todos los usuarios autenticados

-- 1. Eliminar TODAS las políticas existentes
DROP POLICY IF EXISTS "Authenticated users can view plantillas" ON public.plantillas_proforma;
DROP POLICY IF EXISTS "Only Rodrigo can insert plantillas" ON public.plantillas_proforma;
DROP POLICY IF EXISTS "Only Rodrigo can update plantillas" ON public.plantillas_proforma;
DROP POLICY IF EXISTS "Only Rodrigo can delete plantillas" ON public.plantillas_proforma;
DROP POLICY IF EXISTS "Admins can view all plantillas" ON public.plantillas_proforma;
DROP POLICY IF EXISTS "Admins can insert plantillas" ON public.plantillas_proforma;
DROP POLICY IF EXISTS "Admins can update plantillas" ON public.plantillas_proforma;
DROP POLICY IF EXISTS "Admins can delete plantillas" ON public.plantillas_proforma;

-- 2. Crear políticas simples y permisivas
-- LECTURA: Permitir a TODOS los usuarios autenticados
CREATE POLICY "public_plantillas_select"
ON public.plantillas_proforma
FOR SELECT
TO authenticated
USING (true);

-- ESCRITURA: Solo Rodrigo o admins
CREATE POLICY "public_plantillas_insert"
ON public.plantillas_proforma
FOR INSERT
TO authenticated
WITH CHECK (
    auth.jwt() ->> 'email' = 'rodrigo.caceres@asli.cl'
    OR EXISTS (
        SELECT 1 FROM public.usuarios 
        WHERE usuarios.auth_user_id = auth.uid() 
        AND usuarios.rol = 'admin'
    )
);

CREATE POLICY "public_plantillas_update"
ON public.plantillas_proforma
FOR UPDATE
TO authenticated
USING (
    auth.jwt() ->> 'email' = 'rodrigo.caceres@asli.cl'
    OR EXISTS (
        SELECT 1 FROM public.usuarios 
        WHERE usuarios.auth_user_id = auth.uid() 
        AND usuarios.rol = 'admin'
    )
);

CREATE POLICY "public_plantillas_delete"
ON public.plantillas_proforma
FOR DELETE
TO authenticated
USING (
    auth.jwt() ->> 'email' = 'rodrigo.caceres@asli.cl'
    OR EXISTS (
        SELECT 1 FROM public.usuarios 
        WHERE usuarios.auth_user_id = auth.uid() 
        AND usuarios.rol = 'admin'
    )
);

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
