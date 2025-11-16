# ⚠️ FALTA ARCHIVO .env.local

## ❌ Problema

El servidor necesita las credenciales de Supabase para funcionar.

## ✅ Solución

Crea manualmente el archivo `.env.local` en la raíz del proyecto.

## 📝 Pasos:

1. **Abre tu editor** (VSCode, Notepad++, etc.)

2. **Crea un nuevo archivo** llamado exactamente: `.env.local`

3. **Copia y pega esto** dentro del archivo:

```
NEXT_PUBLIC_SUPABASE_URL=https://knbnwbrjzkknarnkyriv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuYm53YnJqemtrbmFybmt5cml2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0ODQzOTYsImV4cCI6MjA3NzA2MDM5Nn0.l7pwhkJSinVQLAsDVFvefP8V5gn_v8rN2U6FG03qVqs
```

4. **Guarda el archivo**

5. **Detén el servidor** (Ctrl+C en la terminal)

6. **Vuelve a iniciar**:
   ```bash
   npm run dev
   ```

7. **Abre**: http://localhost:3000

## 📁 Ubicación

El archivo debe estar en:
```
C:\Users\Rodrigo Caceres\Desktop\CODE DEVELOPER\ASLI SUPABASE\.env.local
```

## ⚠️ IMPORTANTE

- **NO** lo subas a GitHub (ya está en .gitignore)
- Es solo para desarrollo local
- Las credenciales son las mismas que usas en Vercel

