@echo off
echo ========================================
echo    ASLI - INICIAR DESARROLLO LOCAL
echo ========================================
echo.

REM Cambiar al directorio del proyecto
cd /d "%~dp0"

echo [1/3] Verificando archivo .env.local...
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
echo [2/3] Verificando node_modules...
if not exist "node_modules" (
    echo.
    echo ⚠️  Instalando dependencias...
    call npm install
    echo.
) else (
    echo ✅ Dependencias instaladas
)

echo.
echo [3/3] Iniciando servidor de desarrollo...
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

