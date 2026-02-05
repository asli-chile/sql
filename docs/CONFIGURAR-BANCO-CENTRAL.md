# 🔧 CONFIGURAR VARIABLES DEL BANCO CENTRAL DE CHILE

## 📋 Descripción

Para que la funcionalidad de facturación pueda obtener el tipo de cambio USD/CLP (dólar observado) del Banco Central de Chile, necesitas configurar las credenciales de acceso a su API.

---

## 🚀 PASO 1: Obtener Credenciales del Banco Central

### Opción A: API Oficial del Banco Central (Requiere Registro)

1. **Visita el sitio del Banco Central de Chile**:
   - URL: https://si3.bcentral.cl/SieteRestWS/SieteRestWS.ashx
   - O busca "Banco Central de Chile API REST" en Google

2. **Regístrate en el sistema**:
   - Crea una cuenta en el portal del Banco Central
   - Solicita acceso a la API REST para obtener tipos de cambio

3. **Obtén tus credenciales**:
   - Usuario (user)
   - Contraseña (pass)

**⚠️ NOTA**: El proceso de registro puede tardar algunos días en ser aprobado.

---

### Opción B: APIs Alternativas (Gratuitas, Sin Credenciales)

Si no tienes acceso a la API oficial del Banco Central, puedes usar estas alternativas:

#### 1. **MinIndicador.cl** (Recomendada)
- **URL**: `https://mindicador.cl/api/dolar/{dd-mm-yyyy}`
- **Ejemplo**: `https://mindicador.cl/api/dolar/25-12-2024`
- **Ventajas**: Gratuita, sin credenciales, datos históricos desde 1984
- **Desventaja**: Requiere modificar el código para usar esta API

#### 2. **DolarApi.com**
- **URL Base**: `https://cl.dolarapi.com`
- **Ventajas**: Gratuita, sin credenciales
- **Desventaja**: Requiere modificar el código para usar esta API

---

## 📝 PASO 2: Configurar Variables en Desarrollo Local

### 1. Crear o editar `.env.local`

En la **raíz del proyecto** (mismo nivel que `package.json`), crea o edita el archivo `.env.local`:

```env
# Variables de Supabase (si no las tienes ya)
NEXT_PUBLIC_SUPABASE_URL=https://knbnwbrjzkknarnkyriv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui

# Variables del Banco Central de Chile
BANCO_CENTRAL_USER=tu_usuario_banco_central
BANCO_CENTRAL_PASS=tu_contraseña_banco_central
```

**⚠️ IMPORTANTE**: 
- Reemplaza `tu_usuario_banco_central` y `tu_contraseña_banco_central` con tus credenciales reales
- El archivo `.env.local` **NO se sube a Git** (está en `.gitignore`)
- **NUNCA** compartas estas credenciales públicamente

### 2. Reiniciar el servidor de desarrollo

Después de agregar las variables, **reinicia el servidor**:

```bash
# Detén el servidor (Ctrl+C)
# Luego inicia de nuevo:
npm run dev
```

---

## 🌐 PASO 3: Configurar Variables en Producción (Vercel)

Si tu aplicación está desplegada en Vercel, también necesitas configurar las variables allí:

### 1. Ve a tu proyecto en Vercel

1. Abre https://vercel.com/dashboard
2. Selecciona tu proyecto

### 2. Ir a Settings → Environment Variables

1. En el menú superior, haz clic en **"Settings"**
2. En el menú lateral izquierdo, haz clic en **"Environment Variables"**

### 3. Agregar las Variables

Agrega estas **2 variables**:

#### Variable 1:
- **Name**: `BANCO_CENTRAL_USER`
- **Value**: `tu_usuario_banco_central` (reemplaza con tu usuario real)
- **Environments**: Marca todas las opciones (Production, Preview, Development)

#### Variable 2:
- **Name**: `BANCO_CENTRAL_PASS`
- **Value**: `tu_contraseña_banco_central` (reemplaza con tu contraseña real)
- **Environments**: Marca todas las opciones (Production, Preview, Development)

### 4. Guardar y Redesplegar

1. Haz clic en **"Save"** o **"Add"** para cada variable
2. **Redesplega** tu aplicación:
   - Ve a la pestaña **"Deployments"**
   - Haz clic en los **3 puntos (⋯)** del último deployment
   - Selecciona **"Redeploy"**

---

## ✅ Verificación

### En Desarrollo Local

Después de configurar las variables y reiniciar el servidor, puedes verificar que funcionan:

1. Abre la consola del navegador (F12)
2. Intenta generar un Excel de facturación
3. Deberías ver en la consola mensajes como:
   ```
   🔄 Consultando tipo de cambio para fecha ETD: 2024-12-25
   ✅ Tipo de cambio obtenido para 2024-12-25: 950.50 CLP/USD
   ```

Si ves errores como:
```
❌ Credenciales del Banco Central no configuradas
```

Significa que las variables no están configuradas correctamente.

---

## 🔍 Solución de Problemas

### Error: "Credenciales del Banco Central no configuradas"

**Causa**: Las variables de entorno no están definidas o no se están leyendo correctamente.

**Solución**:
1. Verifica que el archivo `.env.local` existe en la raíz del proyecto
2. Verifica que las variables se llaman exactamente:
   - `BANCO_CENTRAL_USER`
   - `BANCO_CENTRAL_PASS`
3. Reinicia el servidor de desarrollo (`npm run dev`)
4. En Vercel, verifica que las variables estén configuradas en Settings → Environment Variables

### Error: "No se puede consultar el tipo de cambio para fechas futuras"

**Causa**: Estás intentando consultar el tipo de cambio para una fecha futura.

**Solución**: El Banco Central solo tiene datos históricos. Para fechas futuras, el sistema dejará la celda vacía o puedes usar el último tipo de cambio disponible.

### Error: "No se encontró tipo de cambio para la fecha especificada"

**Causa**: La fecha solicitada es un fin de semana o feriado, y el Banco Central no publica datos esos días.

**Solución**: El sistema dejará la celda vacía. Esto es normal para fines de semana y feriados.

---

## 📚 Referencias

- [API del Banco Central de Chile](https://si3.bcentral.cl/SieteRestWS/SieteRestWS.ashx)
- [MinIndicador.cl (API alternativa)](https://mindicador.cl/)
- [Documentación de Variables de Entorno en Next.js](https://nextjs.org/docs/basic-features/environment-variables)
