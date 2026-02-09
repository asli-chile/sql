"""
Aplicacion web Flask para procesar itinerarios de navieras.
Interfaz amigable en el navegador.
"""
import os
import sys

# Parche para Python 3.8 - evitar error con usedforsecurity
# Este error ocurre porque Python 3.9+ agregó el parámetro usedforsecurity
# pero Python 3.8 no lo soporta. Reportlab y otras librerías lo usan.
if sys.version_info < (3, 9):
    import hashlib
    import functools
    
    # Parchear md5 para que ignore usedforsecurity
    # Solo aplicar si no está ya parcheado (evitar doble parcheo)
    if not hasattr(hashlib, '_md5_patched_app'):
        _original_md5_func = hashlib.md5
        
        class _MD5Wrapper:
            def __init__(self, original_func):
                self._original = original_func
                self._patched = True
            
            def __call__(self, data=b'', **kwargs):
                # Python 3.8 no soporta usedforsecurity, ignorarlo completamente
                kwargs.pop('usedforsecurity', None)
                return self._original(data)
            
            def __getattr__(self, name):
                # Delegar cualquier otro atributo a la función original
                return getattr(self._original, name)
        
        hashlib._md5_patched_app = True
        hashlib.md5 = _MD5Wrapper(_original_md5_func)
    
    # También parchear openssl_md5 si existe
    if hasattr(hashlib, 'openssl_md5'):
        _original_openssl_md5 = hashlib.openssl_md5
        
        def _openssl_md5_wrapper(data=b'', **kwargs):
            # Remover usedforsecurity si está presente
            kwargs.pop('usedforsecurity', None)
            return _original_openssl_md5(data)
        
        hashlib.openssl_md5 = _openssl_md5_wrapper

from flask import Flask, render_template, request, send_file, jsonify, flash
from werkzeug.utils import secure_filename
from pathlib import Path
import json

# Aplicar parche ANTES de importar módulos que usan reportlab
# El parche debe estar activo antes de que reportlab se importe
if sys.version_info < (3, 9):
    import hashlib
    # Asegurar que el parche esté aplicado también aquí
    if not hasattr(hashlib.md5, '_patched'):
        _original_md5 = hashlib.md5
        
        def _md5_patched(data=b'', *, usedforsecurity=True):
            return _original_md5(data)
        
        _md5_patched._patched = True
        hashlib.md5 = _md5_patched

from src.ocr_processor import OCRProcessor
from src.data_normalizer import DataNormalizer
from src.excel_exporter import ExcelExporter
from src.pdf_exporter import PDFExporter
from src.utils import setup_logging

# Configurar logging
setup_logging(log_level='INFO')

app = Flask(__name__)
app.secret_key = 'itinerario-processor-secret-key-2024'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['OUTPUT_FOLDER'] = 'output'

# Crear carpetas necesarias
Path(app.config['UPLOAD_FOLDER']).mkdir(exist_ok=True)
Path(app.config['OUTPUT_FOLDER']).mkdir(exist_ok=True)

# Extensiones permitidas
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    """Pagina principal con formulario de carga."""
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    """Procesa la imagen subida."""
    if 'file' not in request.files:
        return jsonify({'error': 'No se selecciono archivo'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No se selecciono archivo'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': 'Tipo de archivo no permitido. Use: PNG, JPG, JPEG'}), 400
    
    try:
        # Guardar archivo
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        # Procesar imagen con EasyOCR
        # EasyOCR no requiere configuración de rutas, se inicializa automáticamente
        ocr = OCRProcessor()
        datos_crudos = ocr.extract_structured_data(filepath)
        
        # Normalizar datos
        normalizador = DataNormalizer()
        datos_normalizados = normalizador.normalize(datos_crudos)
        
        # Extraer campos adicionales
        adicionales = normalizador.extract_additional_fields(datos_crudos.get('raw_text', ''))
        datos_normalizados.update(adicionales)
        
        # Generar nombres de archivos de salida
        base_name = Path(filename).stem
        excel_path = os.path.join(app.config['OUTPUT_FOLDER'], f'{base_name}_datos.xlsx')
        pdf_path = os.path.join(app.config['OUTPUT_FOLDER'], f'{base_name}_datos.pdf')
        
        # Exportar a Excel
        excel_exporter = ExcelExporter()
        excel_exporter.export_single(datos_normalizados, excel_path)
        
        # Exportar a PDF
        pdf_exporter = PDFExporter()
        pdf_exporter.export_single(datos_normalizados, pdf_path)
        
        # Preparar datos para mostrar (siempre incluir campos requeridos)
        datos_mostrar = {}
        
        # Campos siempre requeridos - asegurar que siempre tengan valor
        datos_mostrar['naviera'] = datos_normalizados.get('naviera') or 'No encontrada'
        datos_mostrar['pol'] = datos_normalizados.get('pol') or 'No encontrado'
        datos_mostrar['pod'] = datos_normalizados.get('pod') or 'No encontrado'
        
        # ETD - buscar en múltiples lugares (prioridad: normalizada > original > cruda)
        etd = (datos_normalizados.get('etd') or 
               datos_normalizados.get('fecha_salida_normalizada') or 
               datos_normalizados.get('fecha_salida_original') or
               datos_normalizados.get('fecha_salida') or
               'No encontrada')
        # Si es None o string vacío, usar 'No encontrada'
        if not etd or etd == 'None' or str(etd).strip() == '':
            etd = 'No encontrada'
        datos_mostrar['etd'] = str(etd)
        
        # ETA - buscar en múltiples lugares (prioridad: normalizada > original > cruda)
        eta = (datos_normalizados.get('eta') or 
               datos_normalizados.get('fecha_llegada_normalizada') or 
               datos_normalizados.get('fecha_llegada_original') or
               datos_normalizados.get('fecha_llegada') or
               'No encontrada')
        # Si es None o string vacío, usar 'No encontrada'
        if not eta or eta == 'None' or str(eta).strip() == '':
            eta = 'No encontrada'
        datos_mostrar['eta'] = str(eta)
        
        # Si hay múltiples naves
        if datos_normalizados.get('multiple_naves'):
            datos_mostrar['multiple_naves'] = True
            datos_mostrar['total_naves'] = datos_normalizados.get('total_naves', 0)
            datos_mostrar['naves'] = datos_normalizados.get('naves_normalizadas', [])
            datos_mostrar['fecha_normalizada'] = datos_normalizados.get('fecha_normalizada')
            datos_mostrar['semana_normalizada'] = datos_normalizados.get('semana_normalizada')
        else:
            # Una sola nave - campos principales
            datos_mostrar['nave'] = datos_normalizados.get('nave_normalizada') or datos_normalizados.get('nave_original') or 'No encontrada'
            datos_mostrar['fecha_normalizada'] = datos_normalizados.get('fecha_normalizada')
            datos_mostrar['semana_normalizada'] = datos_normalizados.get('semana_normalizada')
            datos_mostrar['numero_contenedor'] = datos_normalizados.get('numero_contenedor')
            datos_mostrar['numero_booking'] = datos_normalizados.get('numero_booking')
            
            # Campos adicionales
            if datos_normalizados.get('puertos'):
                puertos = datos_normalizados.get('puertos')
                if isinstance(puertos, list):
                    datos_mostrar['puertos'] = ', '.join(puertos)
                else:
                    datos_mostrar['puertos'] = str(puertos)
            
            if datos_normalizados.get('numero_viaje'):
                datos_mostrar['numero_viaje'] = datos_normalizados.get('numero_viaje')
        
        # Texto completo (truncado para mostrar)
        texto_completo = datos_normalizados.get('texto_completo', '')
        datos_mostrar['texto_completo'] = texto_completo[:1000] + '...' if len(texto_completo) > 1000 else texto_completo
        datos_mostrar['texto_completo_largo'] = texto_completo  # Versión completa para descargar
        
        resultado = {
            'success': True,
            'datos': datos_mostrar,
            'archivos': {
                'excel': f'/download/excel/{base_name}_datos.xlsx',
                'pdf': f'/download/pdf/{base_name}_datos.pdf'
            }
        }
        
        return jsonify(resultado)
        
    except Exception as e:
        import traceback
        error_msg = str(e)
        traceback.print_exc()
        
        # Mensaje de error más amigable para EasyOCR
        if 'easyocr' in error_msg.lower() or 'no module named' in error_msg.lower():
            error_msg = (
                'EasyOCR no está instalado correctamente.\n\n'
                'SOLUCION:\n'
                '1. Instala EasyOCR ejecutando: pip install easyocr\n'
                '2. EasyOCR descargará automáticamente los modelos necesarios en el primer uso\n'
                '3. Asegúrate de tener conexión a internet para la primera descarga de modelos'
            )
        
        return jsonify({'error': error_msg}), 500

@app.route('/download/excel/<filename>')
def download_excel(filename):
    """Descarga archivo Excel."""
    filepath = os.path.join(app.config['OUTPUT_FOLDER'], filename)
    if os.path.exists(filepath):
        return send_file(filepath, as_attachment=True, download_name=filename)
    return jsonify({'error': 'Archivo no encontrado'}), 404

@app.route('/download/pdf/<filename>')
def download_pdf(filename):
    """Descarga archivo PDF."""
    filepath = os.path.join(app.config['OUTPUT_FOLDER'], filename)
    if os.path.exists(filepath):
        return send_file(filepath, as_attachment=True, download_name=filename)
    return jsonify({'error': 'Archivo no encontrado'}), 404

if __name__ == '__main__':
    print("\n" + "="*60)
    print("SERVIDOR WEB INICIADO")
    print("="*60)
    print("\nAbre tu navegador en: http://localhost:5000")
    print("\nPresiona Ctrl+C para detener el servidor\n")
    app.run(debug=True, host='0.0.0.0', port=5000)
