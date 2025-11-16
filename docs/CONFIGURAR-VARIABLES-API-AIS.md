# 🔧 Configurar Variables de Entorno para API AIS (DataDocked)

## 📋 Variables Necesarias

Para que el cron job y la actualización de posiciones funcionen, necesitas configurar estas variables en **Vercel**:

### Variable 1: `VESSEL_API_BASE_URL`
- **Valor**: `https://datadocked.com/api`
- **Descripción**: URL base de la API de DataDocked

### Variable 2: `VESSEL_API_KEY`
- **Valor**: `89c549273f293763f6affe3d3ced484d`
- **Descripción**: Tu API key de DataDocked

---

## 🚀 Pasos para Configurar en Vercel

### 1. Ve a tu proyecto en Vercel
- Abre [https://vercel.com/dashboard](https://vercel.com/dashboard)
- Selecciona tu proyecto **"registo-de-embarques-asli-toox"**

### 2. Ir a Settings → Environment Variables
- En el menú superior, haz clic en **"Settings"**
- En el menú lateral izquierdo, haz clic en **"Environment Variables"**

### 3. Agregar Variable 1: `VESSEL_API_BASE_URL`
1. Haz clic en **"Add New"** o **"Add"**
2. **Key**: `VESSEL_API_BASE_URL`
3. **Value**: `https://datadocked.com/api`
4. **Environments**: Marca todas las opciones:
   - ✅ Production
   - ✅ Preview
   - ✅ Development
5. Haz clic en **"Save"**

### 4. Agregar Variable 2: `VESSEL_API_KEY`
1. Haz clic en **"Add New"** o **"Add"**
2. **Key**: `VESSEL_API_KEY`
3. **Value**: `89c549273f293763f6affe3d3ced484d`
4. **Environments**: Marca todas las opciones:
   - ✅ Production
   - ✅ Preview
   - ✅ Development
5. Haz clic en **"Save"**

### 5. Redesplegar
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

## ✅ Verificación

Después de configurar y redesplegar:

1. **Prueba el endpoint manualmente**:
   ```
   https://registo-de-embarques-asli-toox.vercel.app/api/vessels/update-positions-cron
   ```

2. **Deberías ver un JSON con**:
   - `message`: "Proceso de actualización completado"
   - `updated`: Lista de buques actualizados
   - Sin errores de "Variables de entorno no definidas"

3. **Revisa los logs en Vercel**:
   - Ve a tu proyecto → Logs
   - Filtra por `/api/vessels/update-positions-cron`
   - Deberías ver las ejecuciones exitosas

---

## 🔒 Seguridad

- ✅ Estas variables **NO** se exponen en el código
- ✅ Solo están disponibles en el servidor (Vercel)
- ✅ El cron job externo (cron-job.org) **NO** necesita estas variables
- ✅ El cron externo solo llama a tu URL de Vercel, y Vercel usa estas variables internamente

---

## 📝 Notas

- **`.env.local`**: Para desarrollo local, agrega estas mismas variables en tu archivo `.env.local`
- **No las agregues en cron-job.org**: El servicio externo solo necesita la URL de tu endpoint
- **El endpoint construye la URL completa**: `https://datadocked.com/api/vessels_operations/get-vessel-info?imo_or_mmsi=...`

---

¿Ya configuraste las variables en Vercel? Una vez que lo hagas y redesplegues, el cron job debería funcionar correctamente. 🚀

