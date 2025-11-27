# Script simple para ejecutar npm run dev
# Evita problemas de política de ejecución usando npm.cmd
# Limpia caché de Next.js para evitar errores en Windows

# Cambiar al directorio del script si se ejecuta desde otro lugar
if ($PSScriptRoot) {
    Set-Location $PSScriptRoot
}

# Limpiar directorio .next si existe (evita errores EINVAL en Windows)
if (Test-Path ".next") {
    Write-Host "Limpiando caché de Next.js..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force ".next" -ErrorAction SilentlyContinue
}

# Limpiar caché de node_modules si existe
if (Test-Path "node_modules\.cache") {
    Remove-Item -Recurse -Force "node_modules\.cache" -ErrorAction SilentlyContinue
}

# Usar npm.cmd para evitar problemas de política de ejecución
& cmd /c "npm run dev"

