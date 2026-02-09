# Script PowerShell para iniciar el servidor web

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "INICIANDO SERVIDOR WEB" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# Activar entorno virtual
& .\venv\Scripts\Activate.ps1

# Instalar Flask si no esta instalado
pip install Flask Werkzeug --quiet

# Iniciar servidor
Write-Host ""
Write-Host "Abrindo navegador en http://localhost:5000" -ForegroundColor Green
Write-Host ""
Write-Host "Presiona Ctrl+C para detener el servidor" -ForegroundColor Yellow
Write-Host ""

Start-Process "http://localhost:5000"
python app.py
