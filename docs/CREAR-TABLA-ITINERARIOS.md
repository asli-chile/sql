# Crear Tabla de Itinerarios

## Problema
Error: "Could not find the table 'public.itinerarios' in the schema cache"

## Solución

La tabla de itinerarios no existe en tu base de datos de Supabase. Necesitas ejecutar el script SQL de creación.

### Pasos:

1. **Abre Supabase Dashboard**
   - Ve a tu proyecto en [supabase.com](https://supabase.com)
   - Navega a "SQL Editor" en el menú lateral

2. **Ejecuta el Script SQL**
   - Abre el archivo `scripts/create-itinerarios-table.sql`
   - Copia todo el contenido
   - Pégalo en el SQL Editor de Supabase
   - Haz clic en "Run" o presiona `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)

3. **Verifica la Creación**
   - Deberías ver mensajes de éxito
   - Verifica que las tablas se crearon:
     ```sql
     SELECT table_name 
     FROM information_schema.tables 
     WHERE table_schema = 'public' 
     AND table_name IN ('itinerarios', 'itinerario_escalas');
     ```

4. **Recarga la Aplicación**
   - Vuelve a la aplicación
   - Recarga la página
   - El error debería desaparecer

## Archivos Relacionados

- `scripts/create-itinerarios-table.sql` - Script de creación de tablas
- `app/api/admin/itinerarios/route.ts` - API route para itinerarios
- `src/lib/itinerarios-service.ts` - Servicio para obtener itinerarios

## Nota

Si ya ejecutaste el script y el error persiste, verifica:
- Que estás conectado al proyecto correcto de Supabase
- Que las variables de entorno `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` están correctas
- Que el script se ejecutó sin errores
