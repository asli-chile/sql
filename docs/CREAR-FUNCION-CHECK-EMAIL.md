# Crear Función check_secondary_email en Supabase

## Problema

Si ves este error en la consola:
```
Could not find the function public.check_secondary_email(search_email) in the schema cache
```

Significa que la función SQL necesaria no existe en tu base de datos de Supabase.

## Solución

Ejecuta el script SQL para crear la función:

### Pasos:

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Navega a **SQL Editor** (en el menú lateral)
3. Haz clic en **New Query**
4. Copia y pega el contenido completo del archivo:
   ```
   scripts/create-check-secondary-email-function.sql
   ```
5. Haz clic en **Run** (o presiona `Ctrl+Enter`)

### Verificación

Después de ejecutar el script, deberías ver:
```
✅ Función creada correctamente
```

### ¿Qué hace esta función?

La función `check_secondary_email` permite verificar si un email es secundario y obtener el email principal asociado. Esto es necesario para que los usuarios puedan hacer login con emails secundarios.

- **Si el email es principal**: retorna `{ is_secondary: false }`
- **Si el email es secundario**: retorna `{ is_secondary: true, primary_email: "email@principal.com" }`
- **Si el email no existe**: retorna `{ is_secondary: false }`

### Nota

Si no creas esta función, el login seguirá funcionando, pero solo podrás hacer login con el email principal. Los emails secundarios no funcionarán hasta que la función esté creada.

