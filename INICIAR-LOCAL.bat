@echo off
setlocal enabledelayedexpansion
echo ========================================
echo    ASLI - INICIAR DESARROLLO LOCAL
echo ========================================
echo.

REM Cambiar al directorio del proyecto
cd /d "%~dp0"

REM [0/4] Verificar Node.js y npm
echo [0/4] Verificando Node.js y npm...
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ❌ ERROR: npm no se encuentra en el PATH del sistema
    echo.
    echo ⚠️  Node.js no está instalado o no está en el PATH.
    echo.
    echo 📥 Para instalar Node.js:
    echo    1. Visita: https://nodejs.org/
    echo    2. Descarga la versión LTS (recomendada)
    echo    3. Ejecuta el instalador y sigue las instrucciones
    echo    4. Asegúrate de marcar la opción "Add to PATH" durante la instalación
    echo    5. Reinicia PowerShell después de la instalación
    echo.
    echo 🔄 O si ya lo tienes instalado:
    echo    - Reinicia PowerShell para cargar las variables de entorno
    echo    - O agrega manualmente Node.js al PATH del sistema
    echo.
    pause
    exit /b 1
)

echo ✅ Node.js y npm están disponibles
echo.

echo [1/4] Verificando archivo .env.local...
if not exist ".env.local" (
    echo.
    echo ⚠️  ADVERTENCIA: Archivo .env.local no encontrado
    echo.
    echo Creando archivo .env.local...
    (
        echo NEXT_PUBLIC_SUPABASE_URL=https://knbnwbrjzkknarnkyriv.supabase.co
        echo NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuYm53YnJqemtrbmFybmt5cml2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0ODQzOTYsImV4cCI6MjA3NzA2MDM5Nn0.l7pwhkJSinVQLAsDVFvefP8V5gn_v8rN2U6FG03qVqs
    ) > .env.local
    echo ✅ Archivo .env.local creado
) else (
    echo ✅ Archivo .env.local encontrado
)

echo.
echo [2/4] Verificando node_modules...
if not exist "node_modules" (
    echo.
    echo ⚠️  Instalando dependencias...
    call npm install
    echo.
) else (
    echo ✅ Dependencias instaladas
)

echo.
echo [3/4] Verificando versión de Node.js...
node --version >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
    echo ✅ Node.js versión: %NODE_VERSION%
) else (
    echo ⚠️  No se pudo verificar la versión de Node.js
)
echo.

echo [4/4] Iniciando servidor de desarrollo...
echo.
echo ========================================
echo    ✅ Servidor iniciando...
echo ========================================
echo.
echo 🌐 Abre en tu navegador:
echo    http://localhost:3000
echo.
echo ⚠️  Para detener el servidor: Ctrl+C
echo.
echo ========================================
echo.

call npm run dev

pause

