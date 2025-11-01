# 🧹 INSTRUCCIONES PARA LIMPIAR CLAVES EXPUESTAS

## ⚠️ PASO 1: REVOCAR SERVICE ROLE KEY EN SUPABASE (URGENTE)

**ANTES DE CUALQUIER COSA**, revoca la Service Role Key:

1. Ve a https://supabase.com/dashboard
2. Selecciona tu proyecto `knbnwbrjzkknarnkyriv`
3. Ve a **Settings → API**
4. Busca la sección **"Project API keys"**
5. Encuentra **"service_role"** key (secret, rojo)
6. Haz clic en **"Reset"** o **"Regenerate"**
7. Esto invalidará la clave expuesta **INMEDIATAMENTE**

---

## 🗑️ PASO 2: LIMPIAR ARCHIVOS EN EL REPOSITORIO

### Opción A: Eliminar archivos completos (Recomendado)

Los siguientes archivos contienen claves y están en la carpeta `backup/` (no son críticos para producción):

```bash
# Eliminar archivos con claves expuestas
rm backup/test-rls-policies.js
rm backup/migrate-to-supabase.js
```

**O manualmente elimina**:
- `backup/test-rls-policies.js` (contiene Service Role Key)
- `backup/migrate-to-supabase.js` (contiene Firebase API key)

### Opción B: Limpiar solo las claves (si necesitas los archivos)

Si necesitas mantener los archivos, reemplaza las claves con placeholders:

**1. `backup/test-rls-policies.js`** (línea 74):
```javascript
// ANTES (PELIGROSO):
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

// DESPUÉS (SEGURO):
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'TU_SERVICE_ROLE_KEY_AQUI';
```

**2. `backup/migrate-to-supabase.js`** (líneas 7 y 17):
```javascript
// ANTES:
apiKey: "AIzaSyCSgJpjlnuEYMp28rpg3kQSAocMJVZICzE"
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'

// DESPUÉS:
apiKey: process.env.FIREBASE_API_KEY || "TU_API_KEY_AQUI"
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'TU_ANON_KEY_AQUI'
```

**3. `src/lib/firebase.ts`** (si ya no usas Firebase):
- Si ya migraste a Supabase completamente, puedes eliminar este archivo o comentar las claves

---

## 🔒 PASO 3: ACTUALIZAR .gitignore

Asegúrate de que `.gitignore` incluya:

```gitignore
# Archivos de backup con claves
backup/*.js
backup/*.env*

# O específicamente los archivos problemáticos:
backup/test-rls-policies.js
backup/migrate-to-supabase.js
```

---

## ✅ PASO 4: VERIFICAR QUE NO HAY MÁS CLAVES

Ejecuta este comando para buscar más claves:

```bash
# Buscar Service Role Keys
grep -r "service_role" . --exclude-dir=node_modules

# Buscar otras posibles claves
grep -r "eyJ" . --exclude-dir=node_modules | grep -v "node_modules"
```

---

## 📝 PASO 5: HACER COMMIT Y PUSH

Una vez limpiados los archivos:

```bash
git add .
git commit -m "🔒 Seguridad: Eliminar claves expuestas del repositorio"
git push origin main
```

**NOTA**: Si alguien ya hizo `git clone` antes de estos cambios, la clave seguirá en el historial de Git. 
En ese caso, considera:
1. Revocar la clave (YA HECHO en paso 1)
2. Verificar que nadie más tenga acceso al repositorio
3. Como medida extrema, puedes eliminar y recrear el repositorio (pero esto es innecesario si revocas la clave)

---

## 🎯 PASO 6: VERIFICAR RLS EN SUPABASE

Asegúrate de que Row Level Security (RLS) esté habilitado:

1. Ve a Supabase Dashboard
2. **Table Editor** → Selecciona cada tabla (`registros`, `catalogos`, `usuarios`, etc.)
3. Ve a **"Policies"** en el menú lateral
4. Verifica que **"Enable Row Level Security"** esté activado
5. Revisa que las políticas estén correctamente configuradas

---

## ✅ VERIFICACIÓN FINAL

- [ ] Service Role Key revocada en Supabase Dashboard
- [ ] Archivos con claves eliminados o limpiados
- [ ] `.gitignore` actualizado
- [ ] Commit y push realizados
- [ ] RLS verificado en todas las tablas
- [ ] Variables de entorno configuradas en Vercel (si aplica)

---

## 📞 DESPUÉS DE TODO

Una vez completados estos pasos:
- ✅ El repositorio estará seguro
- ✅ Las claves expuestas estarán invalidadas
- ✅ Los datos estarán protegidos por RLS
- ✅ Solo el código será visible (sin acceso a datos)

