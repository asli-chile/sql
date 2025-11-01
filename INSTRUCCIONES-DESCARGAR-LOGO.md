# 📥 CÓMO DESCARGAR EL LOGO AZUL LOCALMENTE

## 🎯 Objetivo

Tener el logo azul marino de ASLI como archivo local en `public/logo-asli-azul.png` para que los reportes Excel lo usen rápidamente sin depender de la conexión a internet.

---

## 📋 Pasos

### Opción 1: Usar el script automático (Recomendado)

Ejecuta este comando en la terminal:

```bash
npm run download-logo
```

Este comando:
1. Descargará el logo desde `https://asli.cl/img/logo%20asli%20azul%20sin%20fondo.png`
2. Lo guardará en `public/logo-asli-azul.png`
3. Confirmará cuando termine

---

### Opción 2: Descarga manual

1. Abre tu navegador
2. Ve a: `https://asli.cl/img/logo%20asli%20azul%20sin%20fondo.png`
3. Haz clic derecho en la imagen → "Guardar imagen como..."
4. Guárdala como `logo-asli-azul.png` en la carpeta `public/` de tu proyecto

---

## ✅ Verificación

Después de descargar, verifica que el archivo existe:

- `public/logo-asli-azul.png` debe existir
- Debe ser una imagen PNG del logo azul marino de ASLI

---

## 🔄 Cómo funciona

El código ahora intenta cargar el logo en este orden:

1. **Primero**: `/logo-asli-azul.png` (local, rápido)
2. **Si falla**: `https://asli.cl/img/logo%20asli%20azul%20sin%20fondo.png` (URL externa)
3. **Si falla**: `https://asli.cl/img/LOGO%20ASLI%20SIN%20FONDO%20AZUL.png` (URL alternativa)

Esto garantiza que:
- ✅ Si tienes el logo local, se usa rápidamente
- ✅ Si no lo tienes, se descarga automáticamente desde la web
- ✅ Más rápido y confiable

---

## 📝 Nota

- El archivo `logo-asli-azul.png` **NO se sube a GitHub** (está en `public/`, pero si quieres puedes agregarlo)
- Si prefieres tenerlo en Git, simplemente no agregues `logo-asli-azul.png` a `.gitignore`
- El script puede ejecutarse cada vez que quieras actualizar el logo

---

¿Ya ejecutaste `npm run download-logo`? 🚀

