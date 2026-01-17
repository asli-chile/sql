# 🔄 SOLUCIÓN PARA BUCLE DE REDIRECCIÓN EN ASLI.CL

## ❌ PROBLEMA ACTUAL

Después de hacer login en `asli.cl/auth`, se produce un bucle infinito de redirecciones (`ERR_TOO_MANY_REDIRECTS`) que impide cargar el dashboard.

## 🔍 CAUSAS POSIBLES

### 1. **Configuración de Redirect URLs en Supabase**
Supabase puede estar rechazando las redirecciones desde `asli.cl` si no está configurado como URL permitida.

**SOLUCIÓN:**
1. Ve a tu dashboard de Supabase: https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a **Authentication** → **URL Configuration**
4. En **Redirect URLs**, agrega:
   - `https://asli.cl/auth`
   - `https://asli.cl/dashboard`
   - `https://asli.cl/*`
5. En **Site URL**, asegúrate de que esté: `https://asli.cl`
6. Guarda los cambios

### 2. **Cookies no se están pasando correctamente con rewrites**
Cuando Vercel hace un rewrite de `asli.cl/dashboard` a la ERP, las cookies pueden no estar pasando correctamente.

**SOLUCIÓN:**
Verificar que las cookies de Supabase estén configuradas con el dominio correcto. Las cookies deben ser accesibles desde `asli.cl`.

### 3. **Peticiones RSC causando bucles**
Las peticiones React Server Components (RSC) con `?rsc=` pueden estar causando bucles cuando pasan por el middleware.

**SOLUCIÓN ACTUAL:**
El middleware ya está deshabilitado cuando viene desde `asli.cl`, pero puede que necesitemos excluir las peticiones RSC del matcher.

## ✅ SOLUCIONES IMPLEMENTADAS

1. ✅ Middleware deshabilitado cuando viene desde `asli.cl`
2. ✅ Todas las redirecciones usan `window.location.replace` en lugar de `router.push`
3. ✅ Headers agregados en `vercel.json` para rewrites

## 🛠️ PRÓXIMOS PASOS A PROBAR

### ⚠️ PASO CRÍTICO: Agregar dominio asli.cl en Vercel (HACER PRIMERO)

**PROBLEMA DETECTADO:** `asli.cl` NO está configurado como dominio en Vercel. Sin esto, los rewrites NO funcionarán.

**SOLUCIÓN:**
1. Ve a Vercel Dashboard → Tu proyecto **asli-web** (el proyecto de la página web)
2. Ve a **Settings** → **Domains**
3. Click en **"Add Domain"**
4. Ingresa: `asli.cl`
5. Click en **"Add"**
6. Vercel te mostrará los registros DNS que necesitas configurar en cPanel
7. **IMPORTANTE:** Configura los DNS en cPanel según lo que Vercel te indique
8. Espera a que Vercel verifique el dominio (puede tardar unos minutos)

**Una vez que `asli.cl` esté configurado y verificado en Vercel, los rewrites comenzarán a funcionar.**

### Opción 1: Verificar configuración de Supabase (DESPUÉS de agregar dominio)

1. Ve a Supabase Dashboard → Authentication → URL Configuration
2. Verifica que `https://asli.cl` esté en las Redirect URLs
3. Verifica que `https://asli.cl` esté en Site URL
4. Si no están, agrégalas y guarda

### Opción 2: Verificar cookies en el navegador

1. Abre las DevTools (F12)
2. Ve a la pestaña **Application** → **Cookies**
3. Verifica que las cookies de Supabase estén presentes cuando accedes desde `asli.cl`
4. Verifica que el dominio de las cookies sea correcto

### Opción 3: Revisar logs de Vercel

1. Ve a Vercel Dashboard → Tu proyecto → **Functions** o **Logs**
2. Busca errores relacionados con redirecciones o middleware
3. Revisa si hay peticiones que se están repitiendo infinitamente

### Opción 4: Solución alternativa - Usar subdominio

Si los rewrites no funcionan, podemos usar un subdominio:
- `app.asli.cl` → ERP directamente
- `asli.cl` → Página web

Esto evitaría los problemas con rewrites y cookies.

## 📝 NOTAS

- El middleware está completamente deshabilitado cuando viene desde `asli.cl`
- Todas las redirecciones usan `window.location.replace` para evitar bucles
- Los rewrites están configurados en `web/vercel.json` y `web/next.config.js`

## 🔗 ENLACES ÚTILES

- [Supabase Auth Configuration](https://supabase.com/dashboard/project/_/auth/url-configuration)
- [Vercel Rewrites Documentation](https://vercel.com/docs/configuration/rewrites)
- [Next.js Middleware Documentation](https://nextjs.org/docs/app/building-your-application/routing/middleware)
