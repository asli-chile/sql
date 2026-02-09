@echo off
echo ===========================================
echo INSTALANDO IDIOMA ESPANOL PARA TESSERACT
echo ===========================================
echo.
echo Este script necesita permisos de administrador.
echo.
pause

REM Descargar archivo de idioma espanol
echo Descargando archivo de idioma espanol...
powershell -Command "$ProgressPreference = 'SilentlyContinue'; Invoke-WebRequest -Uri 'https://github.com/tesseract-ocr/tessdata/raw/main/spa.traineddata' -OutFile '%TEMP%\spa.traineddata'"

REM Copiar a la carpeta de Tesseract
echo Instalando archivo...
copy "%TEMP%\spa.traineddata" "C:\Program Files\Tesseract-OCR\tessdata\spa.traineddata"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ===========================================
    echo INSTALACION COMPLETADA EXITOSAMENTE
    echo ===========================================
    echo.
    echo El idioma espanol ha sido instalado.
    echo Ahora puedes procesar imagenes en espanol e ingles.
    echo.
) else (
    echo.
    echo ERROR: No se pudo instalar. Asegurate de ejecutar como administrador.
    echo.
)

pause
