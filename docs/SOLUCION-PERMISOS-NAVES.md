# Solución: Error de Permisos al Insertar Naves

## 🐛 Problema

Error al intentar insertar naves nuevas:
```
permission denied for table users
POST https://...supabase.co/rest/v1/catalogos_naves 403 (Forbidden)
```

## 🎯 Causa

La tabla `catalogos_naves` tiene políticas RLS (Row Level Security) que impiden la inserción directa desde el frontend.

## ✅ Solución (Elige una)

### Opción 1: Configurar Políticas RLS (Recomendado)

**Archivo**: `scripts/configurar-permisos-catalogos-naves.sql`

1. Abre **Supabase Dashboard** → **SQL Editor**
2. Copia y ejecuta el contenido de `configurar-permisos-catalogos-naves.sql`
3. Verás el mensaje: `✅ Políticas RLS configuradas correctamente`

**Qué hace:**
- Habilita RLS en `catalogos_naves`
- Permite a usuarios autenticados: SELECT, INSERT, UPDATE, DELETE

---

### Opción 2: Usar Función RPC (Alternativa más segura)

**Archivo**: `scripts/crear-funcion-insert-nave-nueva.sql`

1. Abre **Supabase Dashboard** → **SQL Editor**
2. Copia y ejecuta el contenido de `crear-funcion-insert-nave-nueva.sql`
3. Verás el mensaje: `✅ Función insert_nave_nueva creada correctamente`

**Qué hace:**
- Crea una función SQL que bypasea RLS con `SECURITY DEFINER`
- El frontend ya está configurado para usar esta función automáticamente

---

## 🧪 Probar

Después de ejecutar cualquiera de los scripts:

1. **Recarga la página** (Ctrl + Shift + R)
2. **Abre el modal** "Nuevo Registro"
3. **Selecciona una naviera** (ej: "MAERSK")
4. **Escribe una nave nueva** (ej: "TEST NAVE")
5. **Presiona Enter**

**Logs esperados:**
```
🆕 Detectada nave nueva: "TEST NAVE" para naviera "MAERSK"
📝 Guardando nave nueva...
✅ Nave guardada via RPC: {success: true, ...}
✅ Estados locales actualizados
```

---

## 🔍 Verificar en Supabase

### Verificar RLS (Opción 1)
```sql
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'catalogos_naves';
```

### Verificar Función RPC (Opción 2)
```sql
SELECT proname, prosrc
FROM pg_proc
WHERE proname = 'insert_nave_nueva';
```

---

## 📝 Notas

- **El código del frontend ya está actualizado** para intentar ambos métodos
- **Prioridad**: Primero intenta RPC, luego inserción directa
- **Si ambos fallan**: Verás un mensaje de error en consola con instrucciones

---

## 🆘 Si Sigue sin Funcionar

Verifica estos puntos:

1. **¿El usuario está autenticado?**
   ```sql
   SELECT auth.uid(); -- Debe retornar un UUID
   ```

2. **¿La tabla existe?**
   ```sql
   SELECT * FROM catalogos_naves LIMIT 1;
   ```

3. **¿Hay triggers problemáticos?**
   ```sql
   SELECT tgname FROM pg_trigger 
   WHERE tgrelid = 'public.catalogos_naves'::regclass;
   ```

4. **¿El error menciona 'users'?**
   - Puede haber un trigger que accede a `auth.users`
   - Ese trigger necesita `SECURITY DEFINER`

---

## 🎯 Resultado Final

Una vez configurado correctamente:
- ✅ Puedes escribir naves nuevas en el modal
- ✅ Se guardan automáticamente en la BD
- ✅ Aparecen inmediatamente en el dropdown
- ✅ Quedan asociadas a la naviera correcta
