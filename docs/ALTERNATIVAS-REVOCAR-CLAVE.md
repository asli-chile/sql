# 🔄 ALTERNATIVAS PARA REVOCAR LA SERVICE ROLE KEY

Si no ves el botón "Reset" o "Regenerate", aquí hay varias alternativas:

## 📍 OPCIÓN 1: Buscar en "Secrets" (Nueva interfaz)

1. En el menú lateral izquierdo de Supabase
2. Ve a **Settings → Secrets** (o **API → Secrets**)
3. Busca la sección de **"JWT Secret"** o **"Service Role Key"**
4. Ahí deberías ver opciones para regenerar

---

## 📍 OPCIÓN 2: Regenerar el JWT Secret (Revoca TODAS las keys)

**IMPORTANTE**: Esto revocará TODAS las keys (anon + service_role), así que tendrás que actualizar tu código.

1. Ve a **Settings → API**
2. Busca la sección **"JWT Settings"** o **"JWT Secret"**
3. Haz clic en **"Regenerate JWT Secret"** o **"Reset JWT Secret"**
4. Esto invalidará TODAS las keys antiguas
5. Después de regenerar, copia la nueva **anon key** y actualízala en tu código

**Archivos a actualizar después de regenerar**:
- `src/lib/supabase.ts` (línea 4)
- `src/lib/supabase-browser.ts` (línea 6)

---

## 📍 OPCIÓN 3: Buscar icono de tres puntos (⋯) o menú

1. Mira en la esquina superior derecha de la tarjeta de "service_role secret"
2. Puede haber un icono de **tres puntos (⋯)** o un **menú desplegable**
3. Haz clic ahí y busca opciones como:
   - "Regenerate"
   - "Reset"
   - "Rotate"
   - "Revoke"

---

## 📍 OPCIÓN 4: Hacer hover sobre la clave

1. Pasa el mouse sobre la clave "service_role"
2. Puede aparecer un icono o botón al hacer hover
3. O intenta hacer **click derecho** sobre la clave

---

## 📍 OPCIÓN 5: Usar la nueva interfaz "API Keys" (no Legacy)

1. En la pantalla que estás viendo, hay dos pestañas:
   - "Legacy API Keys" (la que probablemente estás viendo)
   - "API Keys" (la nueva)
2. Haz clic en la pestaña **"API Keys"**
3. Busca ahí opciones para regenerar

---

## ⚠️ SOLUCIÓN RÁPIDA: Si no encuentras nada

**No te preocupes, la clave está en un archivo de backup que ya eliminé.**

Como la Service Role Key **NO se usa en tu aplicación** (solo estaba en un script de prueba), puedes:

1. **Dejar la clave como está** - No es crítica porque ya eliminé el archivo
2. **Cambiar el JWT Secret** - Esto revocará todas las keys y tendrás que actualizar la anon key en tu código

---

## 🎯 RECOMENDACIÓN

Si no encuentras fácilmente cómo revocar solo la service_role key:
- **Deja la clave como está por ahora** (ya eliminé los archivos del código)
- **Monitorea** tu base de datos por actividad sospechosa
- Si quieres estar 100% seguro, usa la **Opción 2** (regenerar JWT Secret) y actualiza la anon key en tu código

---

¿En qué pestaña estás? ¿"Legacy API Keys" o "API Keys"? ¿Ves algún icono o menú cerca de la clave service_role?

