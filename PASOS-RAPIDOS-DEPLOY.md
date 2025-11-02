# 🚀 PASOS RÁPIDOS PARA HACER DEPLOY

## ✅ Situación Actual
- ✅ Todos los cambios están pusheados a GitHub (repo: `asli-chile/sql`)
- ✅ Último commit: `db5e428` - Con campos ATTN y Zip Code

## 📍 DESPLIEGUE AHORA:

### **OPCIÓN A: Si tienes un proyecto Vercel existente**

1. Ve a: **https://vercel.com/dashboard**
2. Busca tu proyecto
3. Click en **"Deployments"**
4. Click en los **3 puntos (...)** del último deployment
5. Click en **"Redeploy"**
6. Espera 2-3 minutos

✅ **LISTO** - Tus cambios estarán en producción

---

### **OPCIÓN B: Si NO tienes proyecto o se agotó el saldo**

1. Ve a: **https://vercel.com/new**
2. Click en **"Import Git Repository"**
3. Busca y selecciona: **`asli-chile/sql`**
4. Deja la configuración por defecto:
   - Framework: **Next.js** ✅
   - Root Directory: `./` ✅
5. **ANTES de hacer deploy**, ve a **"Environment Variables"** (Settings)
6. Agrega estas **2 variables**:

   **Variable 1:**
   - Name: `NEXT_PUBLIC_SUPABASE_URL`
   - Value: `https://knbnwbrjzkknarnkyriv.supabase.co`
   - Environments: ✅ Production, ✅ Preview, ✅ Development

   **Variable 2:**
   - Name: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuYm53YnJqemtrbmFybmt5cml2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0ODQzOTYsImV4cCI6MjA3NzA2MDM5Nn0.l7pwhkJSinVQLAsDVFvefP8V5gn_v8rN2U6FG03qVqs`
   - Environments: ✅ Production, ✅ Preview, ✅ Development

7. Click en **"Deploy"**
8. Espera 2-3 minutos

✅ **LISTO** - Tu app estará en un nuevo URL como `tu-proyecto.vercel.app`

---

## 🎯 ¿CUÁL OPCIÓN USAR?

- **Proyecto existente y con saldo?** → Usa OPCIÓN A (Redeploy)
- **Sin proyecto o sin saldo?** → Usa OPCIÓN B (Nuevo proyecto)

## 🔍 VERIFICAR QUE FUNCIONÓ

1. Ve a **"Deployments"** en Vercel
2. Deberías ver:
   - ⏳ **Building** = En progreso (espera)
   - ✅ **Ready** = ¡Funcionó!
   - ❌ **Error** = Revisa los logs

3. Click en **"View"** para ver tu app funcionando

## 📝 CAMBIOS QUE SE DESPLEGARÁN

✅ Campo "Contacto" renombrado a **"ATTN"** y mostrado después del teléfono  
✅ Campo **"Zip Code"** agregado antes de USCI  
✅ Mejor visualización de datos del consignatario  
✅ Inicialización correcta de campos opcionales  

---

**¿Dudas?** Revisa `INSTRUCCIONES-DEPLOY-VERCEL.md` para más detalles.

