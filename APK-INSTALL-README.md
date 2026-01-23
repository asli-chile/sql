# 📱 Instalación de ASLI Mobile APK

## Archivo APK - Generado con Android Studio

**Nombre del archivo:** `app-debug.apk` (generado por Android Studio)
**Ubicación:** `android/app/build/outputs/apk/debug/`
**Tamaño:** ~23MB
**Tipo:** APK de desarrollo (debug)
**Ícono:** Logo personalizado de ASLI (azul)

## 🚀 Instrucciones de Instalación

### Paso 1: Transferir el APK a tu teléfono
- Conecta tu teléfono Android a la computadora
- Copia el archivo `ASLI-Mobile.apk` a tu teléfono
- O envíalo por email, WhatsApp, Google Drive, etc.

### Paso 2: Habilitar instalación de apps desconocidas
**En Android 8.0 o superior:**
1. Ve a **Ajustes** > **Apps** > **Acceso especial** > **Instalar apps desconocidas**
2. Selecciona tu navegador o gestor de archivos
3. Activa **"Permitir desde esta fuente"**

**En versiones anteriores de Android:**
1. Ve a **Ajustes** > **Seguridad**
2. Activa **"Fuentes desconocidas"** o **"Instalación de apps desconocidas"**

### Paso 3: Instalar la aplicación
1. Abre tu gestor de archivos
2. Navega hasta donde guardaste el archivo `ASLI-Mobile.apk`
3. Toca el archivo para abrirlo
4. Confirma la instalación cuando aparezca el diálogo
5. Espera a que se complete la instalación
### Generar nuevo APK
```bash
# Construir la aplicación
npm run build:mobile

# Sincronizar con Capacitor
npm run cap:sync android

# Preparar APK para instalación
npm run prepare:apk
```

### Generar APK con Android Studio (Método Recomendado)

```bash
# Comando rápido para preparar y abrir Android Studio
npm run open-studio
```

**Pasos detallados:**
1. **Ejecutar:** `npm run open-studio` (abre Android Studio automáticamente)
2. **File > Open > carpeta `android`** del proyecto
3. **Esperar sincronización:** 3-5 minutos para descargar dependencias
4. **Build > Build Bundle(s)/APK(s) > Build APK(s)**
5. **Ubicación del APK:** `android/app/build/outputs/apk/debug/app-debug.apk`

**Solución de problemas comunes:**
- **Error "Unsupported class file major version 65":** Ejecuta `npm run clean-gradle`, luego reinicia Android Studio
- **Error "Cannot sync the project":** Ejecuta `npm run configure-jdk` y sigue las instrucciones
- **Error de Gradle:** Build > Clean Project, luego Rebuild Project
- **Error de dependencias:** File > Invalidate Caches / Restart
- **Configuración JDK:** File > Settings > Build > Gradle > Gradle JDK > "Embedded JDK"

### Método Alternativo (si tienes Java 17+ instalado)
```bash
# Actualizar versiones de Gradle y plugins en android/
npm run mobile:build
npm run cap:sync android
cd android && ./gradlew assembleDebug
npm run prepare:apk
```

### Copiar APK generado por Android Studio
```bash
# Después de generar el APK en Android Studio
npm run copy-apk
```

### Comando rápido para abrir Android Studio
```bash
npm run open-studio
```

### Cambiar el ícono de la app
```bash
# Opción rápida: reemplazar íconos directamente
npm run fix-icons

# Opción completa: regenerar íconos procesados
npm run update-icons

# Reconstruir APK con nuevos íconos
npm run prepare:apk
```

**Logos disponibles en `/public/`:**
- `LOGO ASLI SIN FONDO AZUL.png` ⭐ (actualmente usado)
- `LOGO ASLI SIN FONDO BLANCO.png`
- `LOGO ASLI SIN FONDO BLLANCO.png`
- `logo.png`
- `logoasli.png`
- `logoblanco.png`
- `logopro.png`

## 🆘 Solución de problemas

### "Archivo dañado" o "No se puede instalar"
- Verifica que el archivo se transfirió completamente
- Habilita fuentes desconocidas correctamente
- Reinicia tu teléfono e intenta nuevamente

### "App no instalada"
- Desinstala versiones anteriores si existen
- Libera espacio en tu teléfono (mínimo 50MB libres)
- Verifica que tu versión de Android sea compatible (minSdkVersion 24)

### La app no funciona
- Verifica la conexión a internet
- Revisa que las variables de entorno estén configuradas
- Consulta los logs de la aplicación

## 📞 Soporte

Si tienes problemas con la instalación, contacta al equipo de desarrollo.