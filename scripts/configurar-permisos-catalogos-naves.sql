-- ==================================================================
-- CONFIGURAR PERMISOS PARA catalogos_naves
-- ==================================================================
-- Este script configura las políticas RLS para permitir que los usuarios
-- autenticados puedan insertar naves nuevas en catalogos_naves
-- ==================================================================

-- 1. Verificar si RLS está habilitado en catalogos_naves
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'catalogos_naves';

-- 2. Ver las políticas actuales
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'catalogos_naves';

-- ==================================================================
-- SOLUCIÓN 1: Crear políticas RLS para catalogos_naves
-- ==================================================================

-- Habilitar RLS si no está habilitado
ALTER TABLE public.catalogos_naves ENABLE ROW LEVEL SECURITY;

-- Política para SELECT: Todos los usuarios autenticados pueden ver todas las naves
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver naves" ON public.catalogos_naves;
CREATE POLICY "Usuarios autenticados pueden ver naves"
ON public.catalogos_naves
FOR SELECT
TO authenticated
USING (true);

-- Política para INSERT: Todos los usuarios autenticados pueden insertar naves
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar naves" ON public.catalogos_naves;
CREATE POLICY "Usuarios autenticados pueden insertar naves"
ON public.catalogos_naves
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Política para UPDATE: Todos los usuarios autenticados pueden actualizar naves
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar naves" ON public.catalogos_naves;
CREATE POLICY "Usuarios autenticados pueden actualizar naves"
ON public.catalogos_naves
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Política para DELETE: Solo usuarios autenticados pueden eliminar (opcional)
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar naves" ON public.catalogos_naves;
CREATE POLICY "Usuarios autenticados pueden eliminar naves"
ON public.catalogos_naves
FOR DELETE
TO authenticated
USING (true);

-- ==================================================================
-- VERIFICACIÓN
-- ==================================================================

-- Ver las políticas creadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'catalogos_naves'
ORDER BY cmd, policyname;

-- ==================================================================
-- SOLUCIÓN 2: Si hay un trigger problemático, verificarlo
-- ==================================================================

-- Ver los triggers en catalogos_naves
SELECT tgname, tgtype, tgenabled, proname
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'public.catalogos_naves'::regclass;

-- ==================================================================
-- NOTAS
-- ==================================================================
-- 
-- Si el error persiste, puede ser que:
-- 1. Hay un trigger que intenta acceder a la tabla 'users' (auth.users)
-- 2. La función del trigger no tiene SECURITY DEFINER
-- 3. Hay una política RLS en 'users' que está bloqueando el acceso
--
-- Para verificar, ejecuta estas consultas:
--
-- SELECT * FROM pg_trigger WHERE tgrelid = 'public.catalogos_naves'::regclass;
-- 
-- Si encuentras un trigger, revisa su función:
-- SELECT prosrc FROM pg_proc WHERE proname = 'nombre_de_la_funcion';
--
-- ==================================================================

-- Verificar que todo esté correcto
DO $$
BEGIN
  RAISE NOTICE '✅ Políticas RLS configuradas correctamente para catalogos_naves';
  RAISE NOTICE '✅ Los usuarios autenticados ahora pueden:';
  RAISE NOTICE '   - Ver todas las naves (SELECT)';
  RAISE NOTICE '   - Insertar naves nuevas (INSERT)';
  RAISE NOTICE '   - Actualizar naves existentes (UPDATE)';
  RAISE NOTICE '   - Eliminar naves (DELETE)';
END $$;
