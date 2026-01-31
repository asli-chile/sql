# 📋 Documentación de Variables de Entorno

Este documento explica qué hace cada variable de entorno en el proyecto ASLI.

---

## 🔐 Variables de Supabase

### `NEXT_PUBLIC_SUPABASE_URL`
- **Tipo**: Público (visible en el cliente)
- **Descripción**: URL de tu proyecto de Supabase. Es la dirección base donde se encuentra tu base de datos.
- **Ejemplo**: `https://knbnwbrjzkknarnkyriv.supabase.co`
- **Uso**: Se usa para inicializar el cliente de Supabase tanto en el servidor como en el navegador.
- **Dónde se usa**: `src/lib/supabase.ts`, `src/lib/supabase-browser.ts`, `src/lib/supabase-server.ts`

### `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Tipo**: Público (visible en el cliente)
- **Descripción**: Clave anónima (anon key) de Supabase. Esta clave tiene permisos limitados según las políticas RLS (Row Level Security) que configures.
- **Ejemplo**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Uso**: Se usa para autenticación y operaciones de base de datos desde el cliente y servidor.
- **Seguridad**: Aunque es "pública", está protegida por RLS. No permite acceso a datos sin autenticación adecuada.
- **Dónde se usa**: `src/lib/supabase.ts`, `src/lib/supabase-browser.ts`, `src/lib/supabase-server.ts`

### `SUPABASE_SERVICE_ROLE_KEY`
- **Tipo**: Privado (solo servidor)
- **Descripción**: Clave de servicio (service role key) de Supabase. Esta clave tiene permisos completos y **bypasea todas las políticas RLS**.
- **Ejemplo**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Uso**: Se usa para operaciones administrativas que requieren acceso completo a la base de datos, como:
  - Importación masiva de datos desde Google Sheets
  - Operaciones de administración de usuarios
  - Operaciones que requieren bypass de RLS
- **⚠️ SEGURIDAD CRÍTICA**: **NUNCA** expongas esta clave en el cliente. Solo debe usarse en rutas API del servidor.
- **Dónde se usa**: `app/api/google-sheets/import/route.ts`, `app/api/admin/*/route.ts`, `app/api/ref-*/route.ts`

---

## 🚢 Variables de API AIS (DataDocked)

### `VESSEL_API_BASE_URL`
- **Tipo**: Privado (solo servidor)
- **Descripción**: URL base de la API de DataDocked, servicio que proporciona información de posicionamiento de buques (AIS - Automatic Identification System).
- **Ejemplo**: `https://datadocked.com/api`
- **Uso**: Se usa para construir las URLs completas de los endpoints de la API de DataDocked.
- **Dónde se usa**: `src/lib/vessel-ais-client.ts`, `app/api/vessels/update-positions/route.ts`

### `VESSEL_API_KEY`
- **Tipo**: Privado (solo servidor)
- **Descripción**: Clave de API de DataDocked. Se usa para autenticarse en las peticiones a la API de posicionamiento de buques.
- **Ejemplo**: `89c549273f293763f6affe3d3ced484d`
- **Uso**: Se envía como parámetro `api_key` en las peticiones a la API de DataDocked.
- **⚠️ SEGURIDAD**: No debe exponerse en el cliente. Solo se usa en rutas API del servidor.
- **Dónde se usa**: `src/lib/vessel-ais-client.ts`, `app/api/vessels/update-positions/route.ts`, `app/api/vessels/update-positions-cron/route.ts`

---

## 📊 Variables de Google Sheets

### `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- **Tipo**: Privado (solo servidor)
- **Descripción**: Email de la cuenta de servicio de Google Cloud. Esta cuenta se usa para autenticarse con la API de Google Sheets sin necesidad de autenticación de usuario.
- **Ejemplo**: `asli-sheets@proyecto-123456.iam.gserviceaccount.com`
- **Uso**: Se usa junto con `GOOGLE_SERVICE_ACCOUNT_KEY` para autenticarse con Google Sheets API.
- **Dónde se usa**: `src/lib/googleSheets.ts`, `app/api/google-sheets/import/route.ts`, `app/api/email/send/route.ts`

### `GOOGLE_SERVICE_ACCOUNT_KEY`
- **Tipo**: Privado (solo servidor)
- **Descripción**: Clave privada de la cuenta de servicio de Google Cloud. Es una clave privada en formato PEM que se usa para firmar las peticiones a la API de Google Sheets.
- **Ejemplo**: `-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCrUG0TWyajYYjG...\n-----END PRIVATE KEY-----\n`
- **Uso**: Se usa para autenticación JWT con Google Sheets API.
- **⚠️ SEGURIDAD CRÍTICA**: Esta clave privada nunca debe exponerse. Solo debe usarse en el servidor.
- **Dónde se usa**: `src/lib/googleSheets.ts`, `app/api/google-sheets/import/route.ts`, `app/api/email/send/route.ts`

### `GOOGLE_SHEETS_SPREADSHEET_ID`
- **Tipo**: Privado (solo servidor)
- **Descripción**: ID del Google Spreadsheet principal donde se almacenan los registros. Este ID se encuentra en la URL del spreadsheet.
- **Ejemplo**: `1w-qqXkBPNW2j0yvOiL4xp83cBtdbpYWU8YV77PaGBjg`
- **Uso**: Se usa para identificar qué spreadsheet leer/escribir cuando se importan datos desde Google Sheets.
- **Dónde se usa**: `src/lib/googleSheets.ts`, `app/api/google-sheets/import/route.ts`

### `NEXT_PUBLIC_GOOGLE_SHEETS_SPREADSHEET_ID`
- **Tipo**: Público (visible en el cliente)
- **Descripción**: Mismo ID del spreadsheet, pero expuesto como variable pública para que el cliente pueda acceder a él.
- **Ejemplo**: `1w-qqXkBPNW2j0yvOiL4xp83cBtdbpYWU8YV77PaGBjg`
- **Uso**: Se usa en el cliente para mostrar información del spreadsheet o construir URLs de preview.
- **Dónde se usa**: Componentes del cliente que necesitan mostrar información del spreadsheet.

### `NEXT_PUBLIC_GOOGLE_SHEETS_PREVIEW_URL`
- **Tipo**: Público (visible en el cliente)
- **Descripción**: URL completa del preview del Google Spreadsheet. Se usa para mostrar una vista previa del spreadsheet en la aplicación.
- **Ejemplo**: `https://docs.google.com/spreadsheets/d/1w-qqXkBPNW2j0yvOiL4xp83cBtdbpYWU8YV77PaGBjg/preview`
- **Uso**: Se usa para el botón "Ver Sheets" que abre el spreadsheet en una nueva pestaña.
- **Dónde se usa**: Componentes que muestran el botón de preview del spreadsheet.

---

## 🌐 Variables de API

### `NEXT_PUBLIC_API_URL`
- **Tipo**: Público (visible en el cliente)
- **Descripción**: URL base de la API de la aplicación. Se usa para construir URLs completas de endpoints cuando se hacen peticiones desde el cliente.
- **Ejemplo**: `https://registo-de-embarques-asli-toox.vercel.app`
- **Uso**: Se usa en páginas del cliente para hacer peticiones a los endpoints de la API.
- **Dónde se usa**: `app/auth/page.tsx`, `app/dashboard/*/page.tsx`, `app/mantenimiento/page.tsx`

---

## ⏰ Variables de Cron Jobs

### `CRON_SECRET`
- **Tipo**: Privado (solo servidor)
- **Descripción**: Secreto opcional para proteger los endpoints de cron jobs. Si está configurado, los cron jobs externos deben enviar este secreto en un header para autenticarse.
- **Ejemplo**: `mi_secreto_super_seguro_123`
- **Uso**: Se valida en los endpoints de cron jobs para asegurar que solo servicios autorizados puedan ejecutarlos.
- **⚠️ SEGURIDAD**: Si no se configura, los endpoints de cron son públicos. Se recomienda configurarlo en producción.
- **Dónde se usa**: `app/api/vessels/update-positions-cron/route.ts`, `app/api/documentos/limpiar-papelera/route.ts`

---

## 🛠️ Variables de Desarrollo

### `VERCEL_TOOLBAR_DISABLED`
- **Tipo**: Público (visible en el cliente)
- **Descripción**: Desactiva el toolbar de Vercel que aparece automáticamente cuando tienes un proyecto conectado a Vercel.
- **Valores**: `true` (desactivado) o `false` (activado)
- **Uso**: Se usa en desarrollo local para ocultar el toolbar de Vercel que puede ser molesto durante el desarrollo.
- **Dónde se usa**: Automáticamente detectado por Vercel en desarrollo local.

---

## 📝 Notas Importantes

### Variables Públicas vs Privadas

- **Variables con prefijo `NEXT_PUBLIC_``**: Son expuestas al cliente (navegador). Cualquier valor que pongas aquí será visible en el código JavaScript del cliente.
- **Variables sin prefijo `NEXT_PUBLIC_`**: Solo están disponibles en el servidor (rutas API, Server Components, etc.).

### Seguridad

1. **NUNCA** expongas claves privadas como `SUPABASE_SERVICE_ROLE_KEY` o `GOOGLE_SERVICE_ACCOUNT_KEY` como variables públicas.
2. Las variables públicas como `NEXT_PUBLIC_SUPABASE_ANON_KEY` están protegidas por RLS en Supabase, pero aún así deben manejarse con cuidado.
3. El archivo `.env.local` está en `.gitignore` y **NO se sube a GitHub**.

### Dónde Configurar

- **Desarrollo local**: Configura las variables en `.env.local`
- **Producción (Vercel)**: Configura las variables en Vercel Dashboard → Settings → Environment Variables

---

## 🔄 Sincronización con Vercel

Para copiar las variables de Vercel a tu `.env.local`:

1. Ve a [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **Settings → Environment Variables**
4. Copia cada variable a tu `.env.local`

---

## ✅ Checklist de Variables

Asegúrate de tener configuradas:

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` (para operaciones admin)
- [ ] `VESSEL_API_BASE_URL` (si usas tracking de buques)
- [ ] `VESSEL_API_KEY` (si usas tracking de buques)
- [ ] `GOOGLE_SERVICE_ACCOUNT_EMAIL` (si usas Google Sheets)
- [ ] `GOOGLE_SERVICE_ACCOUNT_KEY` (si usas Google Sheets)
- [ ] `GOOGLE_SHEETS_SPREADSHEET_ID` (si usas Google Sheets)
- [ ] `NEXT_PUBLIC_GOOGLE_SHEETS_PREVIEW_URL` (si usas preview de Sheets)
- [ ] `NEXT_PUBLIC_API_URL` (si haces peticiones desde el cliente)
- [ ] `CRON_SECRET` (opcional, recomendado en producción)
- [ ] `VERCEL_TOOLBAR_DISABLED=true` (opcional, para desarrollo local)
