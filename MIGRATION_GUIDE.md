# Guía de Migración de Firebase a Supabase

Esta guía te ayudará a migrar tu aplicación ASLI de Firebase a Supabase.

## Pasos de Migración

### 1. Configurar Supabase

1. Ve a [supabase.com](https://supabase.com) y crea una cuenta
2. Crea un nuevo proyecto
3. Anota las credenciales:
   - URL del proyecto
   - API Key (anon key)

### 2. Configurar Variables de Entorno

Crea o actualiza el archivo `.env.local` con tus credenciales de Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase_aqui
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_api_key_de_supabase_aqui
```

### 3. Crear Estructura de Base de Datos

Ejecuta el script SQL en el panel de Supabase (SQL Editor):

1. Ve a tu proyecto en Supabase
2. Navega a "SQL Editor"
3. Copia y pega el contenido de `supabase-schema.sql`
4. Ejecuta el script

### 4. Migrar Datos

Ejecuta el script de migración:

```bash
npm run migrate
```

Este script:
- Conecta a Firebase y Supabase
- Migra todos los registros de la colección `registros`
- Migra todos los catálogos de la colección `catalogos`
- Convierte los datos al formato correcto de Supabase

### 5. Verificar la Migración

1. Ejecuta la aplicación:
   ```bash
   npm run dev
   ```

2. Verifica que:
   - Los datos se carguen correctamente
   - Los filtros funcionen
   - Las operaciones CRUD funcionen
   - No haya errores en la consola

## Cambios Realizados

### Archivos Modificados

- `src/lib/supabase.ts` - Nueva configuración de Supabase
- `src/lib/migration-utils.ts` - Utilidades para conversión de datos
- `src/app/page.tsx` - Actualizado para usar Supabase en lugar de Firebase
- `package.json` - Agregado script de migración

### Archivos Nuevos

- `supabase-schema.sql` - Esquema de base de datos para Supabase
- `scripts/migrate-to-supabase.js` - Script de migración
- `MIGRATION_GUIDE.md` - Esta guía

### Cambios en la Estructura de Datos

Los nombres de campos se han convertido de camelCase a snake_case:

- `refAsli` → `ref_asli`
- `naveInicial` → `nave_inicial`
- `roleadaDesde` → `roleada_desde`
- `ingresoStacking` → `ingreso_stacking`
- `tipoIngreso` → `tipo_ingreso`
- `numeroBl` → `numero_bl`
- `estadoBl` → `estado_bl`
- `semanaIngreso` → `semana_ingreso`
- `mesIngreso` → `mes_ingreso`
- `semanaZarpe` → `semana_zarpe`
- `mesZarpe` → `mes_zarpe`
- `semanaArribo` → `semana_arribo`
- `mesArribo` → `mes_arribo`
- `bookingPdf` → `booking_pdf`
- `rowOriginal` → `row_original`
- `createdAt` → `created_at`
- `updatedAt` → `updated_at`
- `createdBy` → `created_by`
- `updatedBy` → `updated_by`
- `deletedAt` → `deleted_at`
- `deletedBy` → `deleted_by`

## Ventajas de Supabase

1. **Base de datos PostgreSQL** - Más potente que Firestore
2. **APIs REST y GraphQL** - Más flexibles
3. **Autenticación integrada** - Más opciones de autenticación
4. **Storage** - Almacenamiento de archivos
5. **Edge Functions** - Funciones serverless
6. **Real-time** - Suscripciones en tiempo real
7. **Dashboard** - Interfaz de administración más completa

## Solución de Problemas

### Error de Conexión a Supabase

Verifica que las variables de entorno estén configuradas correctamente:
```bash
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### Error de Migración

Si el script de migración falla:
1. Verifica que Firebase esté configurado correctamente
2. Verifica que Supabase esté configurado correctamente
3. Revisa los logs de error para más detalles

### Datos No Se Muestran

1. Verifica que la migración se completó exitosamente
2. Revisa la consola del navegador para errores
3. Verifica que las políticas de seguridad de Supabase permitan el acceso

## Limpieza Post-Migración

Una vez que hayas verificado que todo funciona correctamente:

1. **Opcional**: Elimina las dependencias de Firebase:
   ```bash
   npm uninstall firebase
   ```

2. **Opcional**: Elimina archivos de Firebase:
   - `src/lib/firebase.ts`
   - `firebase.json`

3. **Opcional**: Elimina el script de migración:
   - `scripts/migrate-to-supabase.js`
   - `MIGRATION_GUIDE.md`

## Soporte

Si encuentras problemas durante la migración, revisa:
1. Los logs de la consola del navegador
2. Los logs del servidor de desarrollo
3. Los logs de Supabase en el dashboard
4. La documentación de Supabase: https://supabase.com/docs
