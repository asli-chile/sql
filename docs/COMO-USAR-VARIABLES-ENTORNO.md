# 🔐 CÓMO USAR VARIABLES DE ENTORNO (SEGURO)

## ✅ PROBLEMA RESUELTO

He actualizado tu código para que **NO tenga keys hardcodeadas**. Ahora usa **SOLO variables de entorno**, que **NO se suben a GitHub**.

---

## 📝 PASOS PARA CONFIGURAR

### 1. Crear archivo `.env.local` (SOLO en tu computadora)

En la raíz de tu proyecto, crea un archivo llamado `.env.local` (no `.env.local.example`, sino `.env.local`):

```env
NEXT_PUBLIC_SUPABASE_URL=https://knbnwbrjzkknarnkyriv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuYm53YnJqemtrbmFybmt5cril2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0ODQzOTYsImV4cCI6MjA3NzA2MDM5Nn0.l7pwhkJSinVQLAsDVFvefP8V5gn_v8rN2U6FG03qVqs
```

**⚠️ IMPORTANTE**: Usa tus keys reales aquí. Este archivo **NO se subirá a GitHub** porque está en `.gitignore`.

---

### 2. Verificar que `.env.local` esté en `.gitignore`

Ya está configurado ✅. El archivo `.gitignore` tiene `.env*` que ignora todos los archivos `.env`.

---

### 3. Para desarrollo local

1. Crea `.env.local` con tus keys
2. Ejecuta `npm run dev`
3. ¡Listo! Tu app usará las keys del `.env.local`

---

### 4. Para producción (Vercel)

En Vercel, configura las variables de entorno:

1. Ve a tu proyecto en Vercel
2. **Settings → Environment Variables**
3. Agrega:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://knbnwbrjzkknarnkyriv.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = tu anon key

---

## ✅ VENTAJAS

✅ **Las keys NO se suben a GitHub** (`.env.local` está en `.gitignore`)
✅ **Cada desarrollador** puede tener su propio `.env.local`
✅ **Producción y desarrollo** usan variables de entorno separadas
✅ **Más seguro** - No hay keys hardcodeadas en el código

---

## 🔄 Si regeneras las keys en Supabase

Si regeneras las keys en Supabase:

1. **Actualiza `.env.local`** con la nueva key (solo en tu computadora)
2. **Actualiza las variables en Vercel** (Settings → Environment Variables)
3. **NO necesitas cambiar el código** - Ya usa variables de entorno

---

## ⚠️ IMPORTANTE

- ❌ **NUNCA** subas `.env.local` a GitHub
- ✅ **SÍ** puedes subir `.env.local.example` (solo plantilla, sin keys)
- ✅ El código ya NO tiene keys hardcodeadas

---

¿Ya creaste tu archivo `.env.local`? Si tienes dudas, avísame.

