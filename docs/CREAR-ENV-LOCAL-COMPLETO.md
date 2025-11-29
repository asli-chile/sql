# 📝 Crear archivo .env.local completo

## ⚠️ Problema

El archivo `.env.local` no existe, por lo que las variables de entorno no se están leyendo en desarrollo local.

## ✅ Solución

Crea el archivo `.env.local` en la **raíz del proyecto** (mismo nivel que `package.json`).

## 📝 Contenido del archivo

Crea un archivo llamado `.env.local` (con el punto al inicio) y agrega:

```env
# Variables de Supabase
NEXT_PUBLIC_SUPABASE_URL=https://knbnwbrjzkknarnkyriv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuYm53YnJqemtrbmFybmt5cml2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0ODQzOTYsImV4cCI6MjA3NzA2MDM5Nn0.l7pwhkJSinVQLAsDVFvefP8V5gn_v8rN2U6FG03qVqs

# Variables de API AIS (DataDocked)
VESSEL_API_BASE_URL=https://datadocked.com/api
VESSEL_API_KEY=tu_api_key_de_datadocked_aqui
```

**⚠️ IMPORTANTE**: Reemplaza `tu_api_key_de_datadocked_aqui` con tu API key real de DataDocked.

## 📍 Ubicación

El archivo debe estar en:
```
C:\Users\rodri\OneDrive\Desktop\vivobook\CODE DEVELOPER\sql\.env.local
```

## 🔄 Después de crear el archivo

1. **Detén el servidor** (Ctrl+C en la terminal donde corre `npm run dev`)
2. **Vuelve a iniciar**:
   ```bash
   npm run dev
   ```
3. **Verifica** que ahora las variables se lean correctamente

## ✅ Verificación

Después de reiniciar, los logs deberían mostrar:
```
[AIS] Verificando variables de entorno: {
  hasBaseUrl: true,
  hasApiKey: true,
  baseUrl: 'https://datadocked.com/api...'
}
```

En lugar de:
```
hasBaseUrl: false,
hasApiKey: false
```

