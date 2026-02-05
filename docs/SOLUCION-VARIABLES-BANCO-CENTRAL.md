# 🔧 Solución: Variables del Banco Central no se detectan

## ⚠️ Problema

Las variables `BANCO_CENTRAL_USER` y `BANCO_CENTRAL_PASS` están en `.env.local` pero el servidor no las detecta.

## ✅ Solución Paso a Paso

### 1. Verificar el formato del archivo `.env.local`

Abre el archivo `.env.local` en la raíz del proyecto y verifica que tenga este formato exacto:

```env
BANCO_CENTRAL_USER=tu_usuario_aqui
BANCO_CENTRAL_PASS=tu_contraseña_aqui
```

**⚠️ IMPORTANTE:**
- ❌ **NO** uses espacios alrededor del `=`
- ❌ **NO** uses comillas a menos que el valor las necesite
- ✅ **SÍ** usa una variable por línea
- ✅ **SÍ** asegúrate de que no haya espacios al inicio de la línea

**Ejemplos INCORRECTOS:**
```env
# ❌ INCORRECTO - espacios alrededor del =
BANCO_CENTRAL_USER = tu_usuario_aqui

# ❌ INCORRECTO - comillas innecesarias
BANCO_CENTRAL_USER="tu_usuario_aqui"

# ❌ INCORRECTO - espacios al inicio
 BANCO_CENTRAL_USER=tu_usuario_aqui
```

**Ejemplo CORRECTO:**
```env
# ✅ CORRECTO
BANCO_CENTRAL_USER=tu_usuario_aqui
BANCO_CENTRAL_PASS=tu_contraseña_aqui
```

### 2. Reiniciar el servidor de desarrollo

**Next.js solo carga las variables de `.env.local` cuando el servidor se inicia.** Si agregaste las variables mientras el servidor ya estaba corriendo, necesitas reiniciarlo:

1. **Detén el servidor**: Presiona `Ctrl+C` en la terminal donde corre `npm run dev`
2. **Espera** a que se detenga completamente
3. **Inicia de nuevo**: Ejecuta `npm run dev`

### 3. Verificar que las variables se cargaron

Después de reiniciar, intenta generar el Excel de nuevo. Si sigue fallando, revisa la consola del servidor (no la del navegador) y deberías ver logs como:

```
🔍 Verificando variables de entorno: {
  hasUser: true,
  hasPass: true,
  userLength: 10,
  passLength: 15,
  nodeEnv: 'development'
}
```

Si ves `hasUser: false` o `hasPass: false`, las variables no se están cargando correctamente.

### 4. Verificar la ubicación del archivo

El archivo `.env.local` debe estar en la **raíz del proyecto**, al mismo nivel que `package.json`:

```
tu-proyecto/
├── .env.local          ← AQUÍ
├── package.json
├── next.config.js
└── ...
```

### 5. Verificar que no hay caracteres especiales

Si tu usuario o contraseña tienen caracteres especiales, puede que necesites usar comillas:

```env
# Si el valor tiene espacios o caracteres especiales
BANCO_CENTRAL_USER="usuario con espacios"
BANCO_CENTRAL_PASS="contraseña#especial"
```

Pero en la mayoría de los casos, **NO necesitas comillas**.

## 🔍 Debugging

Si después de seguir estos pasos sigue sin funcionar:

1. **Revisa la consola del servidor** (no la del navegador) para ver los logs de debugging
2. **Verifica que el archivo se llama exactamente** `.env.local` (con el punto al inicio)
3. **Asegúrate de que no hay otro archivo** `.env` que esté sobrescribiendo las variables
4. **Verifica que no hay errores de sintaxis** en el archivo `.env.local`

## 📝 Ejemplo completo de `.env.local`

```env
# Variables de Supabase
NEXT_PUBLIC_SUPABASE_URL=https://knbnwbrjzkknarnkyriv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui

# Variables del Banco Central de Chile
BANCO_CENTRAL_USER=tu_usuario_banco_central
BANCO_CENTRAL_PASS=tu_contraseña_banco_central

# Otras variables...
```

## ✅ Verificación Final

Después de reiniciar el servidor, intenta generar el Excel de nuevo. Si funciona, deberías ver en la consola del servidor:

```
🔄 Consultando Banco Central para fecha: 2024-12-25
✅ Tipo de cambio obtenido: 950.50 CLP/USD para fecha: 2024-12-25
```

En lugar de:
```
❌ Credenciales del Banco Central no configuradas
```
