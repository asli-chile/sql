# 🔧 Instrucciones para Convertir Contenedores a Texto Plano

## ❗ PROBLEMA IDENTIFICADO

Los contenedores existentes en la base de datos están guardados como **array JSON**:
```json
["comr12545","cdc98746132","dd6","sdfafa","fafaf"]
```

Pero el formato correcto debe ser **texto plano con espacios**:
```
comr12545 cdc98746132 dd6 sdfafa fafaf
```

## ✅ SOLUCIÓN

Ya se corrigió el código para que los **nuevos registros** se guarden correctamente.

Ahora necesitas **convertir los registros existentes** ejecutando el script SQL.

## 📋 PASOS A SEGUIR

### 1. Abrir Supabase SQL Editor
- Ve a tu proyecto en Supabase
- Click en "SQL Editor" en el menú lateral

### 2. Ejecutar el Script
- Abre el archivo `convertir-contenedores-a-texto.sql`
- Copia **TODO** el contenido
- Pégalo en el SQL Editor de Supabase
- Click en **"Run"** o presiona `Ctrl+Enter`

### 3. Verificar el Resultado
El script hará 3 cosas:

1. **Ver cuántos registros hay** con formato array (primera consulta)
2. **Convertir todos los arrays a texto** (segunda consulta - UPDATE)
3. **Mostrar 10 ejemplos** del resultado (tercera consulta)

### 4. Resultado Esperado
Deberías ver algo como:
```
✅ X registros actualizados
```

Y en la verificación final, todos deberían mostrar:
```
formato: "Texto plano"
```

## ⚠️ IMPORTANTE

- Este script es **seguro** - no borra datos, solo los convierte
- Solo convierte registros que:
  - Tengan contenedor no vacío
  - No estén eliminados (`deleted_at IS NULL`)
  - Estén en formato array JSON
- Los registros que ya son texto plano **se mantienen igual**

## 🎯 DESPUÉS DE LA CONVERSIÓN

1. Los contenedores existentes estarán en formato texto plano ✅
2. Los nuevos contenedores se guardarán en formato texto plano ✅
3. El contador en el dashboard funcionará correctamente ✅
4. La visualización en la tabla seguirá igual (badges verticales) ✅

## 🔍 VERIFICACIÓN MANUAL

Después de ejecutar el script, puedes verificar manualmente:

1. Ve a "Table Editor" → tabla `registros` en Supabase
2. Busca cualquier registro con contenedores
3. El campo `contenedor` debería verse así:
   - ❌ Antes: `["ABC123","DEF456","GHI789"]`
   - ✅ Después: `ABC123 DEF456 GHI789`

