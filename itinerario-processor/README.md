# Procesador de Itinerarios de Navieras

Microproyecto para procesar imagenes de itinerarios de navieras usando OCR, normalizar los datos extraidos y exportarlos a Excel o PDF.

## Caracteristicas

- **Extraccion de texto con OCR**: Utiliza Tesseract OCR para extraer texto de imagenes
- **Normalizacion de datos**: Normaliza fechas, nombres de naves y semanas a formatos estandar
- **Exportacion a Excel**: Genera archivos Excel con formato profesional
- **Exportacion a PDF**: Genera documentos PDF con los datos extraidos
- **Codigo modular**: Estructura limpia y facil de extender

## Requisitos Previos

### 1. Instalar Tesseract OCR

**Windows:**
- Descargar e instalar desde: https://github.com/UB-Mannheim/tesseract/wiki
- Durante la instalacion, asegurate de instalar los idiomas espanol e ingles
- Anotar la ruta de instalacion (ej: `C:\Program Files\Tesseract-OCR\tesseract.exe`)

**Linux:**
```bash
sudo apt-get update
sudo apt-get install tesseract-ocr
sudo apt-get install tesseract-ocr-spa tesseract-ocr-eng
```

**macOS:**
```bash
brew install tesseract
brew install tesseract-lang
```

### 2. Instalar Python 3.8+

Verificar version:
```bash
python --version
```

## Instalacion

1. **Navegar al directorio del proyecto:**
```bash
cd itinerario-processor
```

2. **Crear entorno virtual (recomendado):**
```bash
python -m venv venv
```

3. **Activar entorno virtual:**

**Windows:**
```bash
venv\Scripts\activate
```

**Linux/macOS:**
```bash
source venv/bin/activate
```

4. **Instalar dependencias:**
```bash
pip install -r requirements.txt
```

## Uso

### Uso Basico

Procesar una imagen de itinerario:

```bash
python main.py ruta/a/imagen.jpg
```

Esto generara:
- `output/imagen_datos.xlsx` - Archivo Excel con los datos extraidos
- `output/imagen_datos.pdf` - Archivo PDF con los datos extraidos

### Especificar Directorio de Salida

```bash
python main.py ruta/a/imagen.jpg -o mi_directorio
```

### Uso Programatico

```python
from src.ocr_processor import OCRProcessor
from src.data_normalizer import DataNormalizer
from src.excel_exporter import ExcelExporter

# Procesar imagen
ocr = OCRProcessor()
raw_data = ocr.extract_structured_data('imagen.jpg')

# Normalizar datos
normalizer = DataNormalizer()
normalized_data = normalizer.normalize(raw_data)

# Exportar a Excel
exporter = ExcelExporter()
exporter.export_single(normalized_data, 'salida.xlsx')
```

### Configurar Ruta de Tesseract (si es necesario)

Si Tesseract no esta en el PATH del sistema:

```python
from src.ocr_processor import OCRProcessor

# Windows
ocr = OCRProcessor(tesseract_cmd=r'C:\Program Files\Tesseract-OCR\tesseract.exe')

# Linux/macOS
ocr = OCRProcessor(tesseract_cmd='/usr/bin/tesseract')
```

## Estructura del Proyecto

```
itinerario-processor/
├── src/
│   ├── __init__.py
│   ├── ocr_processor.py      # Procesamiento OCR
│   ├── data_normalizer.py     # Normalizacion de datos
│   ├── excel_exporter.py      # Exportacion a Excel
│   ├── pdf_exporter.py        # Exportacion a PDF
│   └── utils.py               # Utilidades
├── main.py                    # Script principal de ejemplo
├── requirements.txt           # Dependencias Python
├── README.md                  # Este archivo
└── .gitignore                 # Archivos a ignorar en Git
```

## Datos Extraidos

El sistema extrae y normaliza los siguientes campos:

- **Fechas**: Normalizadas a formato YYYY-MM-DD
- **Naves**: Nombres de naves normalizados
- **Semanas**: Numeros de semana (1-53)
- **Puertos**: Lista de puertos mencionados
- **Numeros de viaje**: Identificadores de viaje

## Extension del Proyecto

El proyecto esta disenado para ser facilmente extensible:

1. **Agregar nuevos campos**: Modificar `data_normalizer.py` para extraer campos adicionales
2. **Mejorar OCR**: Ajustar parametros en `ocr_processor.py` para mejorar precision
3. **Nuevos formatos de exportacion**: Crear nuevos modulos exportadores siguiendo el patron existente
4. **Procesamiento por lotes**: Extender `main.py` para procesar multiples imagenes

## Solucion de Problemas

### Error: "tesseract is not installed"

- Verificar que Tesseract este instalado correctamente
- Si es necesario, especificar la ruta manualmente al crear `OCRProcessor`

### Error: "No module named 'pytesseract'"

- Asegurarse de haber activado el entorno virtual
- Reinstalar dependencias: `pip install -r requirements.txt`

### Baja precision en OCR

- Verificar que la imagen tenga buena calidad y resolucion
- Asegurarse de que los idiomas espanol e ingles esten instalados en Tesseract
- Considerar preprocesar la imagen (escalado, contraste, etc.)

## Licencia

Este es un proyecto de ejemplo para uso interno.
