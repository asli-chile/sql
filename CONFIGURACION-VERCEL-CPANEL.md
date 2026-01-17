# 🚀 Configuración Completa: Vercel + cPanel para asli.cl

Esta guía te explica paso a paso cómo configurar **todo** para que tu página web y ERP funcionen bajo `asli.cl`.

---

## 📋 Estructura del Monorepo

Tu repositorio ahora tiene esta estructura:

```
/
├── app/              # ERP (Next.js App Router)
├── web/              # Página Web Principal (Next.js Pages Router)
├── next.config.ts    # Configuración ERP
└── web/next.config.js # Configuración Web con rewrites
```

---

## 🔧 PASO 1: Configurar Proyectos en Vercel

Necesitas crear **2 proyectos** en Vercel desde el mismo repositorio.

### Proyecto 1: Web Principal (asli.cl)

1. Ve a [Vercel Dashboard](https://vercel.com/dashboard)
2. Click en **"Add New..." → "Project"**
3. **IMPORTANTE**: Si ves el error "The specified name is already used", significa que el repositorio ya está conectado. En ese caso:
   - Busca el repositorio `asli-chile/sql` en la lista
   - Click en **"Import"** (no en "Create")
   - O si no aparece, ve a **Settings → Git** en tu proyecto existente y desconéctalo temporalmente
4. Si es la primera vez, simplemente busca `asli-chile/sql` y click en **"Import"**
5. Configura el proyecto:
   - **Project Name**: `asli-web` ⚠️ **Usa un nombre DIFERENTE** (no "sql")
   - **Framework Preset**: `Next.js`
   - **Root Directory**: `web` ⚠️ **IMPORTANTE: Cambia esto a `/web`**
   - **Build Command**: `npm run build` (o déjalo por defecto)
   - **Output Directory**: `.next` (o déjalo por defecto)
   - **Install Command**: `npm install` (o déjalo por defecto)

5. **Variables de Entorno** (Settings → Environment Variables):
   ```
   NEXT_PUBLIC_ERP_URL = https://registo-de-embarques-asli-toox.vercel.app
   ```
   - Aplica a: **Production**, **Preview**, **Development**

6. Click en **"Deploy"**

### Proyecto 2: ERP (Backend)

1. En Vercel Dashboard, click en **"Add New..." → "Project"**
2. Busca el mismo repositorio: `asli-chile/sql` y click en **"Import"**
   - ⚠️ **SÍ puedes importar el mismo repositorio varias veces** con diferentes configuraciones
3. Configura el proyecto:
   - **Project Name**: `asli-erp` ⚠️ **Usa un nombre DIFERENTE** (no "sql" ni "asli-web")
   - **Framework Preset**: `Next.js`
   - **Root Directory**: `/` (raíz, por defecto) ⚠️ **NO cambies esto**
   - **Build Command**: `npm run build` (o déjalo por defecto)
   - **Output Directory**: `.next` (o déjalo por defecto)
   - **Install Command**: `npm install` (o déjalo por defecto)

4. **Variables de Entorno** (Settings → Environment Variables):
   - Copia **TODAS** las variables que tienes en `ASLI-ERP/.env.local`
   - **NO subas el archivo `.env.local` a GitHub** (ya está en `.gitignore`)
   - Variables típicas que necesitas:
     ```
     NEXT_PUBLIC_SUPABASE_URL=tu_url_supabase
     NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
     SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
     # ... todas las demás variables que uses
     ```
   - Aplica a: **Production**, **Preview**, **Development**

5. Click en **"Deploy"**

---

## 🌐 PASO 2: Configurar Dominio en Vercel

### En el Proyecto de la Web (asli-web)

1. Ve a **Settings → Domains**
2. Agrega tu dominio:
   - `asli.cl`
   - (Opcional) `www.asli.cl`
3. Vercel te mostrará los **registros DNS** que necesitas configurar

**Ejemplo de lo que verás:**
```
Tipo: A
Nombre: @
Valor: 76.76.21.21

Tipo: CNAME
Nombre: www
Valor: cname.vercel-dns.com
```

---

## 🔗 PASO 3: Configurar DNS en cPanel

1. Accede a tu **cPanel**
2. Ve a la sección **"Dominios"** o **"Zone Editor"** o **"DNS Zone Editor"**
3. Busca tu dominio `asli.cl`
4. **Elimina** o **modifica** los registros existentes que apunten a otro lugar
5. Agrega los registros que Vercel te indicó:

   **Registro A (Dominio raíz):**
   - **Tipo**: `A`
   - **Nombre**: `@` (o deja vacío, según tu cPanel)
   - **TTL**: `3600` (o el valor por defecto)
   - **Valor**: `76.76.21.21` (IP de Vercel - verifica en Vercel si es diferente)

   **Registro CNAME (Subdominio www):**
   - **Tipo**: `CNAME`
   - **Nombre**: `www`
   - **TTL**: `3600`
   - **Valor**: `cname.vercel-dns.com` (o el que Vercel te indique)

6. **Guarda** los cambios

---

## ⏱️ PASO 4: Esperar Propagación DNS

- Los cambios DNS pueden tardar entre **5 minutos y 48 horas**
- Normalmente funciona en **15-30 minutos**
- Puedes verificar el estado en: [whatsmydns.net](https://www.whatsmydns.net)

---

## ✅ PASO 5: Verificar que Todo Funciona

Una vez que el DNS se propague:

### Páginas de la Web:
- ✅ `asli.cl/` → Página principal
- ✅ `asli.cl/presentacion` → Página de presentación
- ✅ `asli.cl/servicios` → Página de servicios
- ✅ `asli.cl/tracking` → Página de tracking

### Rutas de la ERP (vía rewrites):
- ✅ `asli.cl/auth` → Login de la ERP
- ✅ `asli.cl/dashboard` → Dashboard
- ✅ `asli.cl/registros` → Registros
- ✅ `asli.cl/documentos` → Documentos
- ✅ `asli.cl/facturas` → Facturas
- ✅ `asli.cl/itinerario` → Itinerario
- ✅ `asli.cl/transportes` → Transportes
- ✅ `asli.cl/mantenimiento` → Mantenimiento
- ✅ `asli.cl/profile` → Perfil
- ✅ `asli.cl/tablas-personalizadas` → Tablas personalizadas
- ✅ `asli.cl/vessel-diagnose` → Diagnóstico de buques
- ✅ `asli.cl/contacto` → Contacto
- ✅ `asli.cl/api/*` → Todas las rutas API

---

## 🔄 Actualizar Variable de Entorno si Cambia la URL de la ERP

Si en el futuro cambias la URL de la ERP en Vercel:

1. Ve al proyecto **asli-web** en Vercel
2. **Settings → Environment Variables**
3. Actualiza `NEXT_PUBLIC_ERP_URL` con la nueva URL
4. **Redeploy** el proyecto (Deployments → ... → Redeploy)

---

## 🐛 Solución de Problemas

### El dominio no carga
- Verifica que los DNS estén correctos en cPanel
- Espera más tiempo para la propagación
- Verifica en Vercel que el dominio esté verificado (Settings → Domains)

### Las rutas de la ERP no funcionan
- Verifica que `NEXT_PUBLIC_ERP_URL` esté configurada correctamente
- Verifica que la ERP esté desplegada y funcionando
- Revisa los logs de Vercel en el proyecto de la web

### Error 404 en rutas de la ERP
- Verifica que los rewrites estén en `web/next.config.js`
- Haz un redeploy del proyecto de la web después de cambiar variables

---

## 📝 Resumen Rápido

1. ✅ Crear proyecto **asli-web** en Vercel (Root: `/web`)
2. ✅ Agregar variable `NEXT_PUBLIC_ERP_URL` en asli-web
3. ✅ Crear proyecto **asli-erp** en Vercel (Root: `/`)
4. ✅ Agregar todas las variables de entorno de la ERP
5. ✅ Configurar dominio `asli.cl` en el proyecto asli-web
6. ✅ Configurar DNS en cPanel con los valores de Vercel
7. ✅ Esperar propagación DNS
8. ✅ Verificar que todo funciona

---

¡Listo! 🎉 Ahora todo debería funcionar bajo `asli.cl`.
