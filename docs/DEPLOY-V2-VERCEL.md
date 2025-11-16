# 🚀 DEPLOY asli-sql-v2 A VERCEL

## ✅ Código Pusheado

El código ya está en: https://github.com/asli-chile/sql-v2

## 🔧 PASOS PARA DEPLOY EN VERCEL

### 1. Ir a Vercel

👉 **https://vercel.com/new**

### 2. Importar Repositorio

1. Click en **"Import Git Repository"**
2. Busca: **`asli-chile/sql-v2`**
3. Selecciona el repositorio

### 3. Configurar (Dejar por Defecto)

- **Framework Preset**: Next.js ✅
- **Root Directory**: `./` ✅
- **Build Command**: `npm run build` ✅
- **Output Directory**: `.next` ✅

### 4. IMPORTANTE: Agregar Variables de Entorno

**ANTES de hacer click en "Deploy"**, ve a:
**Settings → Environment Variables**

Agrega estas **2 variables**:

#### Variable 1:
- **Name**: `NEXT_PUBLIC_SUPABASE_URL`
- **Value**: `https://knbnwbrjzkknarnkyriv.supabase.co`
- **Environments**: ✅ Production, ✅ Preview, ✅ Development

#### Variable 2:
- **Name**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuYm53YnJqemtrbmFybmt5cml2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0ODQzOTYsImV4cCI6MjA3NzA2MDM5Nn0.l7pwhkJSinVQLAsDVFvefP8V5gn_v8rN2U6FG03qVqs`
- **Environments**: ✅ Production, ✅ Preview, ✅ Development

**Guarda cada variable** haciendo click en "Save" o "Add"

### 5. Deploy

1. Click en **"Deploy"** (botón verde)
2. Espera 2-3 minutos mientras build
3. ¡Listo! 🎉

## 📊 Resultado

Tu nueva app estará en un URL como:
- `sql-v2-xxxxx.vercel.app`

## ✅ Cambios Incluidos

- ✅ Campo "Contacto" renombrado a **ATTN** y mostrado después del teléfono
- ✅ Campo **Zip Code** agregado antes de USCI
- ✅ Mejor visualización de datos del consignatario
- ✅ Inicialización correcta de campos opcionales
- ✅ Todos los últimos fixes y mejoras

## 🔗 Links Útiles

- **Repo GitHub**: https://github.com/asli-chile/sql-v2
- **Vercel Dashboard**: https://vercel.com/dashboard

