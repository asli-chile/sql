-- ==================================================================
-- SOLUCIÓN ALTERNATIVA: Función RPC para insertar naves
-- ==================================================================
-- Si las políticas RLS no funcionan, esta función permite insertar
-- naves usando SECURITY DEFINER (bypass RLS)
-- ==================================================================

-- Eliminar la función si existe
DROP FUNCTION IF EXISTS public.insert_nave_nueva(TEXT, TEXT);

-- Crear función para insertar nave nueva
CREATE OR REPLACE FUNCTION public.insert_nave_nueva(
  p_nombre_nave TEXT,
  p_nombre_naviera TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Bypass RLS
SET search_path = public
AS $$
DECLARE
  v_naviera_id UUID;
  v_nave_existente RECORD;
  v_nueva_nave_id UUID;
  v_result JSONB;
BEGIN
  -- Buscar el ID de la naviera
  SELECT id INTO v_naviera_id
  FROM public.catalogos_navieras
  WHERE nombre = p_nombre_naviera;

  -- Si no se encuentra la naviera, retornar error
  IF v_naviera_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Naviera no encontrada',
      'naviera', p_nombre_naviera
    );
  END IF;

  -- Verificar si la nave ya existe
  SELECT id INTO v_nave_existente
  FROM public.catalogos_naves
  WHERE nombre = p_nombre_nave
    AND naviera_id = v_naviera_id;

  -- Si ya existe, retornar info
  IF v_nave_existente IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'La nave ya existe',
      'nave_id', v_nave_existente.id,
      'is_new', false
    );
  END IF;

  -- Insertar la nueva nave
  INSERT INTO public.catalogos_naves (
    nombre,
    naviera_id,
    naviera_nombre,
    activo
  ) VALUES (
    p_nombre_nave,
    v_naviera_id,
    p_nombre_naviera,
    true
  )
  RETURNING id INTO v_nueva_nave_id;

  -- Retornar resultado exitoso
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Nave insertada correctamente',
    'nave_id', v_nueva_nave_id,
    'is_new', true
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'detail', SQLSTATE
    );
END;
$$;

-- Dar permisos de ejecución a usuarios autenticados
GRANT EXECUTE ON FUNCTION public.insert_nave_nueva(TEXT, TEXT) TO authenticated;

-- ==================================================================
-- PRUEBA
-- ==================================================================

-- Probar la función
SELECT public.insert_nave_nueva('NAVE TEST', 'MAERSK');

-- Limpiar la prueba
DELETE FROM public.catalogos_naves WHERE nombre = 'NAVE TEST';

-- ==================================================================
-- INSTRUCCIONES DE USO
-- ==================================================================
-- 
-- Desde el frontend (TypeScript), usar así:
-- 
-- const { data, error } = await supabase.rpc('insert_nave_nueva', {
--   p_nombre_nave: 'NOMBRE DE LA NAVE',
--   p_nombre_naviera: 'NOMBRE DE LA NAVIERA'
-- });
-- 
-- if (data?.success) {
--   console.log('✅ Nave insertada:', data.nave_id);
--   console.log('¿Es nueva?', data.is_new);
-- } else {
--   console.error('❌ Error:', data?.error);
-- }
--
-- ==================================================================

-- Verificación final
DO $$
BEGIN
  RAISE NOTICE '✅ Función insert_nave_nueva creada correctamente';
  RAISE NOTICE '✅ Los usuarios autenticados pueden ejecutar esta función';
  RAISE NOTICE '';
  RAISE NOTICE '📝 USO DESDE FRONTEND:';
  RAISE NOTICE 'const { data } = await supabase.rpc(''insert_nave_nueva'', {';
  RAISE NOTICE '  p_nombre_nave: ''NOMBRE_NAVE'',';
  RAISE NOTICE '  p_nombre_naviera: ''NOMBRE_NAVIERA''';
  RAISE NOTICE '});';
END $$;
