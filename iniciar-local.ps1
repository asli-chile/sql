# Script para iniciar el servidor de desarrollo local
# Evita problemas de política de ejecución de PowerShell

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   ASLI - INICIAR DESARROLLO LOCAL" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Cambiar al directorio del script
Set-Location $PSScriptRoot

# Verificar Node.js
Write-Host "[0/5] Verificando Node.js y npm..." -ForegroundColor Yellow
$nodePath = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodePath) {
    Write-Host ""
    Write-Host "❌ ERROR: Node.js no se encuentra en el PATH del sistema" -ForegroundColor Red
    Write-Host ""
    Write-Host "⚠️  Node.js no está instalado o no está en el PATH." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "📥 Para instalar Node.js:" -ForegroundColor Cyan
    Write-Host "   1. Visita: https://nodejs.org/"
    Write-Host "   2. Descarga la versión LTS (recomendada)"
    Write-Host "   3. Ejecuta el instalador y sigue las instrucciones"
    Write-Host "   4. Asegúrate de marcar la opción 'Add to PATH' durante la instalación"
    Write-Host "   5. Reinicia PowerShell después de la instalación"
    Write-Host ""
    pause
    exit 1
}

Write-Host "✅ Node.js y npm están disponibles" -ForegroundColor Green
Write-Host ""

# Verificar .env.local
Write-Host "[1/5] Verificando archivo .env.local..." -ForegroundColor Yellow
if (-not (Test-Path ".env.local")) {
    Write-Host ""
    Write-Host "⚠️  ADVERTENCIA: Archivo .env.local no encontrado" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Creando archivo .env.local..." -ForegroundColor Cyan
    @"
NEXT_PUBLIC_SUPABASE_URL=https://knbnwbrjzkknarnkyriv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuYm53YnJqemtrbmFybmt5cml2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0ODQzOTYsImV4cCI6MjA3NzA2MDM5Nn0.l7pwhkJSinVQLAsDVFvefP8V5gn_v8rN2U6FG03qVqs
"@ | Out-File -FilePath ".env.local" -Encoding utf8
    Write-Host "✅ Archivo .env.local creado" -ForegroundColor Green
} else {
    Write-Host "✅ Archivo .env.local encontrado" -ForegroundColor Green
}

Write-Host ""
Write-Host "[2/5] Verificando node_modules..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host ""
    Write-Host "⚠️  Instalando dependencias..." -ForegroundColor Yellow
    # Usar npm.cmd para evitar problemas de política de ejecución
    & cmd /c "npm install"
    Write-Host ""
} else {
    Write-Host "✅ Dependencias instaladas" -ForegroundColor Green
}

Write-Host ""
Write-Host "[3/5] Verificando versión de Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if ($nodeVersion) {
    Write-Host "✅ Node.js versión: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "⚠️  No se pudo verificar la versión de Node.js" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "[4/5] Limpiando caché de Next.js..." -ForegroundColor Yellow
# Limpiar directorio .next si existe (suele causar errores en Windows)
if (Test-Path ".next") {
    Write-Host "   Eliminando directorio .next..." -ForegroundColor Gray
    Remove-Item -Recurse -Force ".next" -ErrorAction SilentlyContinue
    Write-Host "✅ Caché de Next.js limpiada" -ForegroundColor Green
} else {
    Write-Host "✅ No hay caché que limpiar" -ForegroundColor Green
}

# Limpiar caché de node_modules si existe
if (Test-Path "node_modules\.cache") {
    Write-Host "   Eliminando caché de node_modules..." -ForegroundColor Gray
    Remove-Item -Recurse -Force "node_modules\.cache" -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "[5/5] Iniciando servidor de desarrollo..." -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   ✅ Servidor iniciando..." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "🌐 Abre en tu navegador:" -ForegroundColor Cyan
Write-Host "   http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  Para detener el servidor: Ctrl+C" -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Usar npm.cmd para evitar problemas de política de ejecución
& cmd /c "npm run dev"

