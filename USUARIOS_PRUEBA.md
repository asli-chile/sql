# Usuarios de Prueba para Sistema ASLI

## Cómo crear usuarios de prueba

### Opción 1: Usar el formulario de registro
1. Ve a `/auth` en tu aplicación
2. Haz clic en "Registrarse"
3. Completa el formulario con:
   - Nombre: Tu nombre completo
   - Email: tu-email@ejemplo.com
   - Contraseña: mínimo 6 caracteres

### Opción 2: Usar usuarios predefinidos
El sistema ya tiene usuarios de ejemplo creados en la base de datos:

1. **Administrador**
   - Email: admin@asli.com
   - Contraseña: admin123
   - Rol: admin

2. **Supervisor**
   - Email: supervisor@asli.com
   - Contraseña: supervisor123
   - Rol: supervisor

3. **Usuario Operativo**
   - Email: usuario@asli.com
   - Contraseña: usuario123
   - Rol: usuario

4. **Auditor**
   - Email: auditor@asli.com
   - Contraseña: auditor123
   - Rol: lector

## Pasos para iniciar sesión

1. **Ejecuta la aplicación:**
   ```bash
   npm run dev
   ```

2. **Ve a la página de autenticación:**
   - Abre tu navegador
   - Ve a `http://localhost:3000/auth`

3. **Inicia sesión:**
   - Usa cualquiera de los emails de arriba
   - Usa la contraseña correspondiente
   - O regístrate con tu propio email

4. **Después del login:**
   - Serás redirigido automáticamente a `/dashboard`
   - Podrás acceder a todas las funcionalidades del sistema

## Solución de problemas

### Si los campos se ven oscuros:
- ✅ **SOLUCIONADO**: He actualizado los estilos para que los campos tengan fondo blanco y texto oscuro

### Si no puedes iniciar sesión:
1. Verifica que la aplicación esté ejecutándose
2. Asegúrate de usar un email válido
3. La contraseña debe tener al menos 6 caracteres
4. Si usas usuarios de prueba, usa exactamente los emails y contraseñas de arriba

### Si hay errores de conexión:
1. Verifica que Supabase esté funcionando
2. Revisa la consola del navegador para errores
3. Asegúrate de que las variables de entorno estén configuradas

## Configuración adicional

Para configurar Google Auth (opcional):
1. Ve a tu proyecto en Supabase
2. Ve a Authentication > Providers
3. Habilita Google
4. Configura las credenciales de Google OAuth
