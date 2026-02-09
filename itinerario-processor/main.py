"""
Ejemplo de uso del procesador de itinerarios de navieras.

Este script demuestra cómo procesar una imagen de itinerario,
extraer datos con OCR, normalizarlos y exportarlos a Excel.
"""
import sys
from pathlib import Path

# Agregar el directorio src al path
sys.path.insert(0, str(Path(__file__).parent / 'src'))

from src.ocr_processor import OCRProcessor
from src.data_normalizer import DataNormalizer
from src.excel_exporter import ExcelExporter
from src.pdf_exporter import PDFExporter
from src.utils import setup_logging


def process_itinerary(image_path: str, output_dir: str = 'output'):
    """
    Procesa una imagen de itinerario y genera archivos Excel y PDF.
    
    Args:
        image_path: Ruta a la imagen del itinerario.
        output_dir: Directorio donde guardar los archivos de salida.
    """
    # Configurar logging
    setup_logging(log_level='INFO')
    
    # Crear directorio de salida
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    # Obtener nombre base del archivo
    image_name = Path(image_path).stem
    
    print(f"\n{'='*60}")
    print(f"Procesando itinerario: {image_path}")
    print(f"{'='*60}\n")
    
    try:
        # 1. Procesar OCR
        print("1. Extrayendo texto con OCR...")
        ocr = OCRProcessor()
        raw_data = ocr.extract_structured_data(image_path)
        print(f"   ✓ Texto extraído ({len(raw_data.get('raw_text', ''))} caracteres)")
        print(f"   ✓ Fecha encontrada: {raw_data.get('fecha')}")
        print(f"   ✓ Nave encontrada: {raw_data.get('nave')}")
        print(f"   ✓ Semana encontrada: {raw_data.get('semana')}")
        
        # 2. Normalizar datos
        print("\n2. Normalizando datos...")
        normalizer = DataNormalizer()
        normalized_data = normalizer.normalize(raw_data)
        
        # Extraer campos adicionales
        additional = normalizer.extract_additional_fields(raw_data.get('raw_text', ''))
        normalized_data.update(additional)
        
        print(f"   ✓ Fecha normalizada: {normalized_data.get('fecha_normalizada')}")
        print(f"   ✓ Nave normalizada: {normalized_data.get('nave_normalizada')}")
        print(f"   ✓ Semana normalizada: {normalized_data.get('semana_normalizada')}")
        if additional:
            print(f"   ✓ Campos adicionales: {list(additional.keys())}")
        
        # 3. Exportar a Excel
        print("\n3. Generando archivo Excel...")
        excel_exporter = ExcelExporter()
        excel_path = output_path / f"{image_name}_datos.xlsx"
        excel_exporter.export_single(normalized_data, str(excel_path))
        print(f"   ✓ Archivo Excel generado: {excel_path}")
        
        # 4. Exportar a PDF
        print("\n4. Generando archivo PDF...")
        pdf_exporter = PDFExporter()
        pdf_path = output_path / f"{image_name}_datos.pdf"
        pdf_exporter.export_single(normalized_data, str(pdf_path))
        print(f"   ✓ Archivo PDF generado: {pdf_path}")
        
        print(f"\n{'='*60}")
        print("✓ Procesamiento completado exitosamente")
        print(f"{'='*60}\n")
        
        return {
            'excel': str(excel_path),
            'pdf': str(pdf_path),
            'data': normalized_data
        }
        
    except FileNotFoundError as e:
        print(f"\n✗ Error: {str(e)}")
        return None
    except Exception as e:
        print(f"\n✗ Error durante el procesamiento: {str(e)}")
        import traceback
        traceback.print_exc()
        return None


def main():
    """Función principal."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Procesa imágenes de itinerarios de navieras con OCR'
    )
    parser.add_argument(
        'image',
        type=str,
        help='Ruta a la imagen del itinerario a procesar'
    )
    parser.add_argument(
        '-o', '--output',
        type=str,
        default='output',
        help='Directorio de salida (default: output)'
    )
    
    args = parser.parse_args()
    
    # Verificar que la imagen existe
    image_path = Path(args.image)
    if not image_path.exists():
        print(f"Error: La imagen no existe: {args.image}")
        sys.exit(1)
    
    # Procesar
    result = process_itinerary(str(image_path), args.output)
    
    if result:
        print(f"\nArchivos generados:")
        print(f"  - Excel: {result['excel']}")
        print(f"  - PDF: {result['pdf']}")
    else:
        sys.exit(1)


if __name__ == '__main__':
    main()
