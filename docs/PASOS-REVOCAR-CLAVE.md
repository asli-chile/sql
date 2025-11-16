# 🔒 PASOS PARA REVOCAR SERVICE ROLE KEY

## ⚠️ PASO 1: REVOCAR EN SUPABASE (HACER PRIMERO)

1. **Ve a**: https://supabase.com/dashboard
2. **Selecciona tu proyecto** (debería aparecer como `knbnwbrjzkknarnkyriv`)
3. **En el menú lateral izquierdo**, haz clic en **"Settings"** (Configuración)
4. **Luego haz clic en "API"**
5. **Busca la sección "Project API keys"** o "Legacy API Keys"
6. **Encuentra la clave que dice "service_role"** (tiene una etiqueta roja "secret")
7. **Haz clic en "Reset"** o **"Regenerate"** que está al lado de esa clave
8. ✅ **Listo!** La clave vieja queda invalidada INMEDIATAMENTE

**IMPORTANTE**: Esto NO afecta tu aplicación, sigue funcionando normal.

---

## 🗑️ PASO 2: ELIMINAR ARCHIVOS CON CLAVES

Después de revocar en Supabase, elimina estos archivos de tu proyecto:

1. `backup/test-rls-policies.js` (contiene la Service Role Key)
2. `backup/migrate-to-supabase.js` (contiene Firebase key, no se usa)

Puedes eliminarlos manualmente desde tu explorador de archivos o desde aquí.

---

## ✅ PASO 3: VERIFICAR QUE TODO SIGUE FUNCIONANDO

1. Abre tu aplicación
2. Prueba iniciar sesión
3. Prueba cargar registros
4. Si todo funciona normal, ¡perfecto! 🎉

---

## 📝 PASO 4: SUBIR CAMBIOS A GIT (OPCIONAL)

Si eliminaste los archivos, puedes subir los cambios:

```bash
git add .
git commit -m "🔒 Seguridad: Eliminados archivos con claves expuestas"
git push origin main
```

