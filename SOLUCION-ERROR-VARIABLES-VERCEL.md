# ❌ ERROR DE VARIABLES DE ENTORNO EN VERCEL

## Problema

El build falla con este error:
```
❌ ERROR: Variables de entorno NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY deben estar definidas en .env.local
```

## Solución

Las variables de entorno NO se agregaron correctamente en Vercel.

## PASOS PARA FIJARLO:

### 1. Ve al Dashboard de Vercel

👉 **https://vercel.com/dashboard**

### 2. Selecciona tu Proyecto

Click en el proyecto **"sql-v2"** (o el nombre que le pusiste)

### 3. Ve a Settings

En el menú superior, click en **"Settings"**

### 4. Environment Variables

Click en **"Environment Variables"** en el menú lateral

### 5. VERIFICA que existan estas 2 variables:

Debes ver en la lista:

1. `NEXT_PUBLIC_SUPABASE_URL`
2. `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 6. Si NO existen, agréguelas:

#### Variable 1:
- **Click en "Add New"**
- **Key**: `NEXT_PUBLIC_SUPABASE_URL`
- **Value**: `https://knbnwbrjzkknarnkyriv.supabase.co`
- **Environments**: Marca TODAS las opciones:
  - ✅ Production
  - ✅ Preview
  - ✅ Development
- **Click en "Save"**

#### Variable 2:
- **Click en "Add New"**
- **Key**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuYm53YnJqemtrbmFybmt5cml2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0ODQzOTYsImV4cCI6MjA3NzA2MDM5Nn0.l7pwhkJSinVQLAsDVFvefP8V5gn_v8rN2U6FG03qVqs`
- **Environments**: Marca TODAS las opciones:
  - ✅ Production
  - ✅ Preview
  - ✅ Development
- **Click en "Save"**

### 7. REDEPLOY

Una vez que agregues/verifiques las variables:

1. Ve a la pestaña **"Deployments"**
2. Encuentra el deployment fallido
3. Click en los **3 puntos (...)** del deployment
4. Click en **"Redeploy"**
5. Espera 2-3 minutos

✅ **El build ahora debería completarse exitosamente**

## Verificación

Si todo está bien, deberías ver:
- ✅ Build completado
- ✅ Deployment "Ready"
- ✅ URL de tu app funcionando

---

**IMPORTANTE**: Las variables de entorno son **CRÍTICAS** para que la app funcione.

