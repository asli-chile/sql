# Script para limpiar la caché de Next.js
# Útil cuando hay errores de compilación o el servidor no arranca

Write-Host "Limpiando caché de Next.js..." -ForegroundColor Yellow

# Limpiar directorio .next
if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next" -ErrorAction SilentlyContinue
    Write-Host "✅ Directorio .next eliminado" -ForegroundColor Green
} else {
    Write-Host "ℹ️  No existe directorio .next" -ForegroundColor Gray
}

# Limpiar caché de node_modules
if (Test-Path "node_modules\.cache") {
    Remove-Item -Recurse -Force "node_modules\.cache" -ErrorAction SilentlyContinue
    Write-Host "✅ Caché de node_modules eliminada" -ForegroundColor Green
} else {
    Write-Host "ℹ️  No existe caché en node_modules" -ForegroundColor Gray
}

Write-Host ""
Write-Host "✅ Limpieza completada" -ForegroundColor Green
Write-Host ""
Write-Host "Ahora puedes ejecutar: npm run dev" -ForegroundColor Cyan

