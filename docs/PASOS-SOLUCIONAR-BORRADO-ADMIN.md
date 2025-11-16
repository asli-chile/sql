# 📝 Pasos para Solucionar: Admin No Puede Borrar

## 🎯 ¿Qué Necesitas Hacer?

Solo 3 pasos simples:

---

## PASO 1: Verificar que Eres Admin

1. Abre **Supabase Dashboard**
2. Ve a **SQL Editor** (menú izquierdo)
3. Ejecuta este código:

```sql
SELECT 
  email,
  rol,
  CASE 
    WHEN rol = 'admin' THEN '✅ SÍ eres admin'
    ELSE '❌ NO eres admin - Necesitas cambiar tu rol'
  END as estado
FROM usuarios
WHERE auth_user_id = auth.uid();
```

### Si NO eres admin:
Ejecuta esto (cambia el email por el tuyo):

```sql
UPDATE usuarios
SET rol = 'admin'
WHERE email = 'TU-EMAIL@asli.cl';
```

---

## PASO 2: Ejecutar el Script de Corrección

1. **Abre el archivo** `scripts/fix-admin-delete-definitivo.sql` en tu editor
2. **Copia TODO el contenido** del archivo
3. **Pégalo en Supabase SQL Editor**
4. **Haz clic en "Run"** (o presiona F5)
5. **Espera** a que termine (debe decir "✅ Políticas de UPDATE corregidas...")

---

## PASO 3: Cerrar Sesión y Volver a Entrar

**MUY IMPORTANTE:**
1. **Cierra sesión** en la aplicación web
2. **Vuelve a iniciar sesión**
3. **Prueba borrar** un registro que NO creaste tú

---

## ✅ ¿Funcionó?

Si **SÍ funciona**: ¡Listo! ✅

Si **NO funciona**, comparte:
1. ¿Qué dice el PASO 1? (¿eres admin o no?)
2. ¿Qué error aparece en la consola del navegador? (F12 → Console)
3. Ejecuta esto y comparte el resultado:

```sql
SELECT 
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'registros' 
  AND cmd = 'UPDATE';
```

---

## 🔍 Ver el Error en la Consola

1. Presiona **F12** en tu navegador
2. Ve a la pestaña **"Console"**
3. Intenta borrar un registro
4. Busca líneas rojas con errores
5. **Copia el error completo** y compártelo

---

## 📌 Nota Importante

El sistema usa **"soft delete"**, que significa que NO borra físicamente el registro, sino que lo marca como eliminado poniendo una fecha en `deleted_at`. Esto es un **UPDATE**, no un **DELETE**, por eso necesitas permisos de UPDATE, no de DELETE.

