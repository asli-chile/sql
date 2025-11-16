# 🔧 CONFIGURAR VARIABLES DE ENTORNO EN VERCEL

## ⚠️ PROBLEMA

El build en Vercel falla porque no encuentra las variables de entorno `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

**Razón**: El archivo `.env.local` solo funciona en tu computadora, NO en Vercel.

---

## ✅ SOLUCIÓN: Configurar Variables en Vercel Dashboard

### Paso 1: Ve a tu proyecto en Vercel

1. Abre https://vercel.com/dashboard
2. Selecciona tu proyecto **ASLI SUPABASE** (o el nombre que tenga)

### Paso 2: Ir a Settings → Environment Variables

1. En el menú superior, haz clic en **"Settings"**
2. En el menú lateral izquierdo, haz clic en **"Environment Variables"**

### Paso 3: Agregar las Variables

Agrega estas **2 variables**:

#### Variable 1:
- **Name**: `NEXT_PUBLIC_SUPABASE_URL`
- **Value**: `https://knbnwbrjzkknarnkyriv.supabase.co`
- **Environments**: Marca todas las opciones (Production, Preview, Development)

#### Variable 2:
- **Name**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuYm53YnJqemtrbmFybmt5cml2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0ODQzOTYsImV4cCI6MjA3NzA2MDM5Nn0.l7pwhkJSinVQLAsDVFvefP8V5gn_v8rN2U6FG03qVqs`
- **Environments**: Marca todas las opciones (Production, Preview, Development)

### Paso 4: Guardar

1. Haz clic en **"Save"** o **"Add"** para cada variable
2. Espera a que se guarden

### Paso 5: Redesplegar

Después de agregar las variables, necesitas hacer un nuevo deployment:

**Opción A: Automático**
- Vercel debería detectar automáticamente y hacer un nuevo deploy
- O haz un pequeño cambio (agregar un espacio en un archivo) y haz commit/push

**Opción B: Manual**
- En el dashboard de Vercel, ve a la pestaña **"Deployments"**
- Haz clic en los **3 puntos (⋯)** del último deployment
- Selecciona **"Redeploy"**
- Esto hará un nuevo build con las variables de entorno

---

## 📸 Pasos Visuales

1. **Settings** → **Environment Variables**
2. Haz clic en **"Add New"** o **"Add"**
3. Escribe el nombre de la variable
4. Pega el valor
5. Marca todos los environments (Production, Preview, Development)
6. Haz clic en **"Save"**
7. Repite para la segunda variable
8. Redesplega el proyecto

---

## ✅ VERIFICACIÓN

Después de configurar y redesplegar:

1. El build debería completarse exitosamente
2. Tu aplicación debería funcionar en producción
3. No deberías ver el error de variables de entorno

---

## 🔍 DIFERENCIA ENTRE .env.local Y VERCEL

| Lugar | Cuándo se usa | Cómo se configura |
|-------|---------------|-------------------|
| **`.env.local`** | Desarrollo local (tu computadora) | Archivo en la raíz del proyecto |
| **Vercel** | Producción (en línea) | Dashboard de Vercel → Settings → Environment Variables |

**Ambos son necesarios**:
- `.env.local` → Para desarrollo local (`npm run dev`)
- Vercel Variables → Para producción (despliegue en Vercel)

---

## 🚨 SI SIGUE FALLANDO

1. Verifica que las variables tengan el nombre **EXACTO**:
   - `NEXT_PUBLIC_SUPABASE_URL` (con guiones bajos, mayúsculas)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (con guiones bajos, mayúsculas)

2. Verifica que estén marcadas para **todos los environments**

3. Verifica que hayas hecho **Redeploy** después de agregarlas

4. Revisa los logs del build en Vercel para ver si hay otros errores

---

¿Ya configuraste las variables en Vercel? Una vez que lo hagas y redesplegues, debería funcionar. 🚀

