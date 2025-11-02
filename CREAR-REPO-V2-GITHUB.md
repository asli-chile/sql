# 🚀 CREAR NUEVO REPOSITORIO asli-sql-v2 EN GITHUB

## 📝 PASOS MANUALES

Necesitas crear el repositorio primero en GitHub antes de poder pushear el código.

### Paso 1: Crear el Repositorio en GitHub

1. **Ve a GitHub**: https://github.com/new
2. **Nombre del repositorio**: `asli-sql-v2`
3. **Descripción**: "ASLI SQL V2 - Sistema de gestión de embarques y facturas"
4. **Visibilidad**: 
   - ✅ **Private** (recomendado, para tu organización)
   - O **Public** si quieres que sea público
5. **NO marques ninguna casilla**:
   - ❌ No marques "Add a README file"
   - ❌ No marques "Add .gitignore"
   - ❌ No marques "Choose a license"
6. **Click en "Create repository"**

### Paso 2: Conectar y Pushear

Después de crear el repositorio, ejecuta estos comandos en tu terminal:

```bash
cd "C:\Users\Rodrigo Caceres\Desktop\CODE DEVELOPER\ASLI SUPABASE"

# Verificar que el remoto v2 está configurado
git remote -v

# Si no está, agregarlo:
git remote add origin-v2 https://github.com/asli-chile/asli-sql-v2.git

# Pushear todo el código a la rama main del nuevo repo
git push origin-v2 main

# Opcional: Si quieres pushear también otras ramas
git push origin-v2 --all
```

### Paso 3: Conectar a Vercel

Una vez que el repositorio esté creado y el código pusheado:

1. **Ve a Vercel**: https://vercel.com/new
2. **Click en "Import Git Repository"**
3. **Busca**: `asli-chile/asli-sql-v2`
4. **Selecciona** el repositorio
5. **Deja la configuración por defecto**:
   - Framework: Next.js ✅
   - Root Directory: `./` ✅
6. **Agrega las variables de entorno** antes de hacer deploy:
   
   Ve a **Settings → Environment Variables** y agrega:
   
   **Variable 1:**
   - Name: `NEXT_PUBLIC_SUPABASE_URL`
   - Value: `https://knbnwbrjzkknarnkyriv.supabase.co`
   - Environments: ✅ Production, ✅ Preview, ✅ Development
   
   **Variable 2:**
   - Name: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuYm53YnJqemtrbmFybmt5cml2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0ODQzOTYsImV4cCI6MjA3NzA2MDM5Nn0.l7pwhkJSinVQLAsDVFvefP8V5gn_v8rN2U6FG03qVqs`
   - Environments: ✅ Production, ✅ Preview, ✅ Development
   
7. **Click en "Deploy"**
8. **Espera 2-3 minutos**

✅ **LISTO** - Tu nueva app estará en producción

---

## 🎯 ¿POR QUÉ CREAR UN V2?

- ✅ Nuevo proyecto Vercel con límite gratuito independiente
- ✅ Código limpio con todos los últimos cambios
- ✅ Backup separado del proyecto original
- ✅ Posibilidad de hacer cambios sin afectar producción actual

---

## 📋 ALTERNATIVA: Copiar el Repositorio Existente

Si prefieres copiar el repositorio existente en lugar de crear uno nuevo:

1. Ve a: https://github.com/asli-chile/sql
2. Click en **"Settings"** (en la barra superior del repo)
3. Baja hasta **"Danger Zone"**
4. Click en **"Transfer ownership"** o **"Archive this repository"**

O simplemente crear un nuevo fork:

1. Ve a: https://github.com/asli-chile/sql
2. Click en **"Fork"** (esquina superior derecha)
3. Renombra el fork a `asli-sql-v2`

---

## ✅ RESUMEN

1. Crear repo en GitHub → `asli-sql-v2`
2. Pushear código → `git push origin-v2 main`
3. Conectar a Vercel → Import repository
4. Agregar variables de entorno
5. Deploy ✅

¿Listo? **Crear el repositorio en GitHub primero** y luego avísame para continuar.

