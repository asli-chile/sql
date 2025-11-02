# Instrucciones para Forzar Deployment en Vercel

## Información Importante sobre Plan Gratuito de Vercel

Vercel permite tener **múltiples proyectos gratuitos**. Si te quedaste sin saldo en un proyecto, puedes:

1. **Crear un nuevo proyecto** en Vercel con tu misma cuenta
2. **Conectar el mismo repositorio** a este nuevo proyecto
3. **Cada proyecto tiene su propio límite gratis** (100GB bandwidth, 100 horas de build por mes, etc.)

**NO necesitas crear otra cuenta de Vercel** - puedes tener múltiples proyectos gratuitos en la misma cuenta.

---

Si Vercel no está haciendo deploy automático después de hacer push a GitHub, sigue estos pasos:

## Opción 1: Redeploy desde Vercel Dashboard (RECOMENDADO)

1. **Ve al dashboard de Vercel**: https://vercel.com/dashboard
2. **Selecciona tu proyecto** "ASLI SUPABASE"
3. **Ve a la pestaña "Deployments"**
4. **Encuentra el último deployment** (debería mostrar el commit más reciente)
5. **Haz clic en los 3 puntos** (...) al lado del deployment
6. **Selecciona "Redeploy"**
7. **Confirma el redeploy**

## Opción 2: Conectar a un Nuevo Proyecto de Vercel (Si se agotó el saldo)

Si tu proyecto actual se quedó sin saldo gratuito, puedes crear un nuevo proyecto:

1. **En Vercel Dashboard**, ve a https://vercel.com/new
2. **Selecciona "Import Git Repository"**
3. **Conecta tu repositorio** `asli-chile/sql`
4. **Configura el proyecto:**
   - Framework Preset: Next.js
   - Root Directory: `./` (raíz del proyecto)
   - Build Command: `npm run build`
   - Output Directory: `.next`
5. **Agrega las variables de entorno** desde Settings → Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://knbnwbrjzkknarnkyriv.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuYm53YnJqemtrbmFybmt5cml2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0ODQzOTYsImV4cCI6MjA3NzA2MDM5Nn0.l7pwhkJSinVQLAsDVFvefP8V5gn_v8rN2U6FG03qVqs`
   - Marca todas las opciones (Production, Preview, Development)
6. **Haz click en "Deploy"**

**Importante**: Al crear un nuevo proyecto, tendrás un nuevo URL. Puedes configurar un dominio personalizado si lo deseas.

## Opción 3: Verificar Conexión con GitHub

1. **En Vercel Dashboard**, ve a tu proyecto
2. **Settings** → **Git**
3. **Verifica que:**
   - El repositorio conectado sea: `asli-chile/sql`
   - La rama de producción sea: `main`
   - "Production Branch" esté configurado como `main`
4. **Si no está conectado**, haz clic en "Connect Git Repository" y conecta tu repositorio

## Opción 3: Usar Vercel CLI

Si tienes Vercel CLI instalado:

```bash
vercel --prod
```

## Opción 4: Hacer un cambio mínimo y pushear

Si ninguna de las opciones anteriores funciona, puedes hacer un cambio mínimo (como agregar un espacio en un comentario) y pushearlo:

1. Hacer un cambio mínimo en cualquier archivo
2. Commit y push
3. Esto debería forzar un nuevo deployment

## Verificar que el Deployment Funcionó

1. **Espera 2-3 minutos** después de iniciar el redeploy
2. **Revisa la pestaña "Deployments"** para ver el estado:
   - ⏳ "Building" = En progreso
   - ✅ "Ready" = Completado exitosamente
   - ❌ "Error" = Hay un problema, revisa los logs
3. **Haz clic en el deployment** para ver los logs completos

## Troubleshooting

### Si el deployment falla:
- **Revisa los logs** haciendo clic en el deployment fallido
- **Busca errores** en la consola de Vercel
- **Verifica variables de entorno** en Settings → Environment Variables

### Si no aparece ningún deployment:
- **Verifica la conexión con GitHub** en Settings → Git
- **Revisa que tengas permisos** en el repositorio de GitHub
- **Confirma que estés en la rama correcta** (`main`)

## Estado Actual

Los cambios que necesitan ser desplegados:
- ✅ Campo "Contacto" renombrado a "ATTN" y mostrado después del teléfono
- ✅ Campo "Zip Code" agregado antes de USCI
- ✅ Inicialización correcta de campos opcionales
- ✅ Mejoras en la visualización de datos del consignatario

Últimos commits pusheados:
- `b24bc6f` - chore: Force Vercel redeploy - ATTN and Zip Code fields
- `a75a952` - chore: Trigger Vercel deployment
- `93527bc` - fix: Inicializar campos contacto, codigoPostal...

