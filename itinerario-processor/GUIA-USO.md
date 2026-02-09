# Guia de Uso - Procesador de Itinerarios

## Que hace este sistema?

Este sistema procesa imagenes de itinerarios de navieras y extrae informacion automaticamente:
- Lee el texto de las imagenes usando OCR
- Normaliza fechas, nombres de naves y semanas
- Genera archivos Excel y PDF con los datos

---

## Inicio Rapido

### Paso 1: Activar el entorno virtual

Abre PowerShell o Terminal y ejecuta:

```powershell
cd itinerario-processor
.\venv\Scripts\Activate.ps1
```

### Paso 2: Procesar una imagen

```powershell
python main.py "ruta\a\tu\imagen.jpg"
```

**Ejemplo:**
```powershell
python main.py "C:\MisImagenes\itinerario1.jpg"
```

### Paso 3: Ver los resultados

Los archivos se generan en la carpeta `output\`:
- `imagen_datos.xlsx` - Archivo Excel
- `imagen_datos.pdf` - Archivo PDF

---

## Ejemplos de Uso

### Ejemplo 1: Procesar una imagen simple

```powershell
# Activar entorno virtual
.\venv\Scripts\Activate.ps1

# Procesar imagen
python main.py "mi_itinerario.jpg"
```

### Ejemplo 2: Especificar carpeta de salida personalizada

```powershell
python main.py "mi_itinerario.jpg" -o "mis_resultados"
```

Los archivos se guardaran en `mis_resultados\` en lugar de `output\`

### Ejemplo 3: Usar desde codigo Python

Crea un archivo `mi_script.py`:

```python
from src.ocr_processor import OCRProcessor
from src.data_normalizer import DataNormalizer
from src.excel_exporter import ExcelExporter

# 1. Procesar la imagen
ocr = OCRProcessor()
datos_crudos = ocr.extract_structured_data('mi_imagen.jpg')

# 2. Normalizar los datos
normalizador = DataNormalizer()
datos_normalizados = normalizador.normalize(datos_crudos)

# 3. Exportar a Excel
exportador = ExcelExporter()
exportador.export_single(datos_normalizados, 'resultado.xlsx')

print("Proceso completado!")
```

Ejecutar:
```powershell
python mi_script.py
```

---

## Configuracion de Tesseract OCR

Si Tesseract no esta instalado o no se encuentra automaticamente:

### Instalar Tesseract (Windows)

1. Descargar desde: https://github.com/UB-Mannheim/tesseract/wiki
2. Instalar y **seleccionar espanol e ingles** durante la instalacion
3. Anotar la ruta (normalmente: `C:\Program Files\Tesseract-OCR\tesseract.exe`)

### Especificar ruta manualmente

Si Tesseract no se encuentra automaticamente, especifica la ruta:

```python
from src.ocr_processor import OCRProcessor

# Especificar ruta de Tesseract
ocr = OCRProcessor(tesseract_cmd=r'C:\Program Files\Tesseract-OCR\tesseract.exe')
```

---

## Que datos extrae?

El sistema busca y normaliza:

| Campo | Descripcion | Ejemplo |
|-------|-------------|---------|
| **Fecha** | Fechas del itinerario | `2024-01-15` |
| **Nave** | Nombre de la embarcacion | `Santa Maria` |
| **Semana** | Numero de semana | `3` |
| **Puertos** | Puertos mencionados | `Valparaiso, Callao` |
| **Viaje** | Numero de viaje | `V-1234` |

---

## Casos de Uso Comunes

### Procesar multiples imagenes

Crea un script `procesar_lote.py`:

```python
import os
from pathlib import Path
from src.ocr_processor import OCRProcessor
from src.data_normalizer import DataNormalizer
from src.excel_exporter import ExcelExporter

# Configurar
carpeta_imagenes = "imagenes"
carpeta_salida = "resultados"

# Procesar todas las imagenes
ocr = OCRProcessor()
normalizador = DataNormalizer()
exportador = ExcelExporter()

for archivo in Path(carpeta_imagenes).glob("*.jpg"):
    print(f"Procesando {archivo.name}...")
    
    # Extraer datos
    datos_crudos = ocr.extract_structured_data(str(archivo))
    datos_normalizados = normalizador.normalize(datos_crudos)
    
    # Exportar
    nombre_salida = carpeta_salida / f"{archivo.stem}_datos.xlsx"
    exportador.export_single(datos_normalizados, str(nombre_salida))
    
    print(f"Completado: {nombre_salida}")
```

### Solo exportar a PDF

```python
from src.ocr_processor import OCRProcessor
from src.data_normalizer import DataNormalizer
from src.pdf_exporter import PDFExporter

ocr = OCRProcessor()
normalizador = DataNormalizer()
pdf_exportador = PDFExporter()

# Procesar
datos_crudos = ocr.extract_structured_data('imagen.jpg')
datos_normalizados = normalizador.normalize(datos_crudos)

# Solo PDF
pdf_exportador.export_single(datos_normalizados, 'resultado.pdf')
```

### Exportar multiples registros a un solo Excel

```python
from src.excel_exporter import ExcelExporter

exportador = ExcelExporter()

# Lista de datos normalizados
lista_datos = [
    datos_normalizados_1,
    datos_normalizados_2,
    datos_normalizados_3,
]

# Exportar todos juntos
exportador.export_multiple(lista_datos, 'todos_los_itinerarios.xlsx')
```

---

## Solucion de Problemas

### Error: "tesseract is not installed"

**Solucion:**
1. Instalar Tesseract OCR (ver seccion de configuracion)
2. O especificar la ruta manualmente al crear `OCRProcessor`

### Error: "No module named 'pytesseract'"

**Solucion:**
```powershell
# Asegurate de estar en el entorno virtual
.\venv\Scripts\Activate.ps1

# Reinstalar dependencias
pip install -r requirements.txt
```

### La imagen no se procesa correctamente

**Sugerencias:**
- Usa imagenes con buena calidad y resolucion
- Asegurate de que el texto sea legible
- Verifica que los idiomas espanol e ingles esten instalados en Tesseract

### Los datos extraidos no son correctos

**Mejoras posibles:**
- Preprocesar la imagen (aumentar contraste, escalar)
- Ajustar los patrones de busqueda en `data_normalizer.py`
- Verificar el texto extraido con `raw_text` en los datos

---

## Estructura de Archivos

```
itinerario-processor/
├── src/                          # Codigo fuente
│   ├── ocr_processor.py          # Extraccion de texto (OCR)
│   ├── data_normalizer.py        # Normalizacion de datos
│   ├── excel_exporter.py         # Exportar a Excel
│   ├── pdf_exporter.py           # Exportar a PDF
│   └── utils.py                  # Utilidades
├── main.py                       # Script principal
├── venv/                         # Entorno virtual (ya creado)
├── output/                       # Archivos generados (se crea automaticamente)
└── requirements.txt              # Dependencias (ya instaladas)
```

---

## Tips y Mejores Practicas

1. **Activa siempre el entorno virtual** antes de usar el sistema
2. **Usa imagenes de buena calidad** para mejores resultados
3. **Revisa el texto extraido** (`raw_text`) si los datos no son correctos
4. **Guarda tus scripts personalizados** fuera de la carpeta `src/`
5. **Los archivos de salida** se guardan en `output/` por defecto

---

## Comandos Utiles

```powershell
# Activar entorno virtual
.\venv\Scripts\Activate.ps1

# Desactivar entorno virtual
deactivate

# Ver version de Python
python --version

# Verificar instalacion de modulos
python -c "import pytesseract; print('OK')"

# Procesar imagen
python main.py "imagen.jpg"

# Procesar con carpeta personalizada
python main.py "imagen.jpg" -o "mis_resultados"
```

---

## Necesitas ayuda?

Si tienes problemas:
1. Revisa la seccion "Solucion de Problemas"
2. Verifica que Tesseract este instalado correctamente
3. Asegurate de estar usando el entorno virtual
4. Revisa los mensajes de error en la consola
