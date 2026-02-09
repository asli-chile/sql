@echo off
echo ===========================================
echo INICIANDO SERVIDOR WEB
echo ===========================================
echo.

REM Activar entorno virtual
call venv\Scripts\activate.bat

REM Instalar Flask si no esta instalado
pip install Flask Werkzeug --quiet

REM Iniciar servidor
echo.
echo Abriendo navegador en http://localhost:5000
echo.
echo Presiona Ctrl+C para detener el servidor
echo.

start http://localhost:5000
python app.py
