# Script de Creación de Usuarios

Script de Node.js para crear usuarios (admin, ejecutivo, cliente) en Supabase desde la consola.

## 📋 Requisitos

### 1. Crear archivo `.env.local` (OBLIGATORIO)

**Paso 1: Obtener la Service Role Key de Supabase**

1. Ve a https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a **Settings** → **API**
4. En la sección **"Project API keys"**, busca la clave **"service_role"** (tiene una etiqueta roja "secret")
5. Haz clic en el ícono de **ojo** 👁️ para revelar la clave
6. **Copia la clave completa** (es muy larga, empieza con `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

**Paso 2: Crear el archivo `.env.local`**

En la **raíz del proyecto** (mismo nivel que `package.json`), crea un archivo llamado `.env.local` con este contenido:

```env

```

**⚠️ IMPORTANTE**: 
- Reemplaza `tu-service-role-key-aqui` con la Service Role Key que copiaste de Supabase
- El archivo `.env.local` **NO se sube a Git** (está en `.gitignore`)
- **NUNCA** compartas la Service Role Key públicamente

**Ejemplo completo:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://knbnwbrjzkknarnkyriv.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuYm53YnJqemtrbmFybmt5cml2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTQ4NDM5NiwiZXhwIjoyMDc3MDYwMzk2fQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 2. Ejecutar el script SQL para agregar columnas

**Antes de usar el script**, ejecuta el SQL en Supabase:

1. Ve a Supabase Dashboard → **SQL Editor**
2. Abre el archivo `scripts/add-clientes-asignados-column.sql`
3. **Copia TODO el contenido** del archivo (no el nombre del archivo)
4. Pégalo en el SQL Editor de Supabase
5. Haz clic en **"Run"** o presiona `Ctrl+Enter`

**⚠️ ERROR COMÚN**: No ejecutes `scripts/add-clientes-asignados-column.sql` como comando. Debes copiar el **contenido** del archivo y pegarlo en el SQL Editor.

## 🚀 Uso

### Modo Interactivo (Recomendado)

Ejecuta el script sin argumentos y sigue las instrucciones:

```bash
npm run create-user
# o
node scripts/create-user.js
```

El script te preguntará:
- Tipo de usuario (admin, ejecutivo, cliente)
- Email
- Nombre completo
- Contraseña
- Clientes asignados (si es ejecutivo)
- Nombre del cliente (si es cliente)

### Modo con Argumentos

#### Crear Usuario Admin

```bash
node scripts/create-user.js admin rodrigo.caceres@asli.cl "Rodrigo Caceres" password123
```

#### Crear Usuario Ejecutivo

```bash
node scripts/create-user.js ejecutivo hans.vasquez@asli.cl "Hans Vasquez" password123 "EXPORTADORA DEL SUR (XSUR),EXPORTADORA SAN ANDRES,FAMILY GROWERS"
```

#### Crear Usuario Cliente

```bash
node scripts/create-user.js cliente contacto@cliente.com "Contacto Cliente" password123 "EXPORTADORA SAN ANDRES"
```

## 📝 Ejemplos Completos

### Ejemplo 1: Crear Admin

```bash
npm run create-user admin rodrigo.caceres@asli.cl "Rodrigo Caceres" "MiPassword123!"
```

### Ejemplo 2: Crear Ejecutivo con Múltiples Clientes

```bash
npm run create-user ejecutivo nina.scoti@asli.cl "Nina Scoti" "Password123" "HILLVILLA,BLOSSOM,EXPORTADORA SAN ANDRES"
```

### Ejemplo 3: Crear Cliente

```bash
npm run create-user cliente contacto@exportadorasanandres.com "Contacto Exportadora" "Password123" "EXPORTADORA SAN ANDRES"
```

## 📋 Lista de Clientes Disponibles

Para ejecutivos y clientes, usa estos nombres **EXACTOS**:

- `AGRI. INDEPENDENCIA`
- `AGROSOL`
- `AISIEN`
- `ALMAFRUIT`
- `BARON EXPORT`
- `BLOSSOM`
- `COPEFRUT`
- `CRISTIAN MUÑOZ`
- `EXPORTADORA DEL SUR (XSUR)`
- `EXPORTADORA SAN ANDRES`
- `FAMILY GROWERS`
- `FENIX`
- `FRUIT ANDES SUR`
- `GF EXPORT`
- `HILLVILLA`
- `JOTRISA`
- `LA RESERVA`
- `RINOFRUIT`
- `SIBARIT`
- `TENO FRUIT`
- `THE GROWERS CLUB`
- `VIF`

## 🔍 Verificar Usuarios Creados

Para verificar que el usuario se creó correctamente, ejecuta en Supabase SQL Editor:

```sql
SELECT 
  id,
  email,
  nombre,
  rol,
  activo,
  clientes_asignados,
  cliente_nombre,
  created_at
FROM usuarios
WHERE email = 'email@ejemplo.com';
```

## ⚠️ Notas Importantes

1. **Service Role Key**: Este script usa `SUPABASE_SERVICE_ROLE_KEY` que tiene permisos completos. **NUNCA** lo expongas en el frontend.

2. **Primer Usuario Admin**: Si es el primer usuario admin, el script mostrará una advertencia pero continuará.

3. **Nombres de Clientes**: Los nombres de clientes deben coincidir **EXACTAMENTE** con los del catálogo. Usa mayúsculas y caracteres especiales correctamente.

4. **Contraseñas**: Las contraseñas deben tener al menos 6 caracteres.

5. **Emails**: Los emails se normalizan a minúsculas automáticamente.

## 🐛 Solución de Problemas

### Error: "Faltan variables de entorno"

**Solución**: Asegúrate de tener `.env.local` con:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### Error: "Could not find the 'clientes_asignados' column"

**Solución**: Ejecuta primero el script SQL:
```sql
-- En Supabase SQL Editor
scripts/add-clientes-asignados-column.sql
```

### Error: "User already exists"

**Solución**: El email ya está registrado. Usa otro email o elimina el usuario existente primero.

### Error: "Invalid password"

**Solución**: La contraseña debe tener al menos 6 caracteres.

## 📚 Estructura del Script

El script realiza las siguientes acciones:

1. ✅ Valida variables de entorno
2. ✅ Crea usuario en Supabase Auth
3. ✅ Crea registro en tabla `usuarios`
4. ✅ Configura `clientes_asignados` o `cliente_nombre` según el rol
5. ✅ Muestra resumen del usuario creado

## 🔐 Seguridad

- El script solo debe ejecutarse desde tu máquina local o servidor seguro
- **NUNCA** subas `.env.local` a Git
- El `SUPABASE_SERVICE_ROLE_KEY` tiene permisos completos, mantenlo seguro

---

¿Necesitas ayuda? Revisa los logs del script para más detalles sobre errores.
