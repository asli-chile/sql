@echo off
echo ===========================================
echo PROBADOR DE ITINERARIOS
echo ===========================================
echo.

REM Activar entorno virtual
call venv\Scripts\activate.bat

REM Ejecutar el script de prueba
python probar.py

REM Pausar para ver los resultados
pause
