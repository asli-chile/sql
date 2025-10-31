-- =====================================================
-- CAMBIAR ROL A ADMIN
-- =====================================================
-- Ejecuta esto para convertirte en admin

-- Ver tu rol actual
SELECT 
  email,
  rol,
  'Rol actual' as estado
FROM usuarios
WHERE email = 'rodrigo.caceres@asli.cl';

-- Cambiar tu rol a admin
UPDATE usuarios
SET rol = 'admin'
WHERE email = 'rodrigo.caceres@asli.cl';

-- Verificar que se cambió
SELECT 
  email,
  rol,
  CASE 
    WHEN rol = 'admin' THEN '✅ Ahora eres Admin'
    ELSE '❌ Algo salió mal'
  END as estado
FROM usuarios
WHERE email = 'rodrigo.caceres@asli.cl';

SELECT '✅ Rol cambiado a admin - Cierra sesión y vuelve a entrar' as resultado;

