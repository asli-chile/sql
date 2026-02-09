"""
Script simple para probar el sistema de procesamiento de itinerarios.
Solo necesitas cambiar la ruta de la imagen y ejecutar.
"""
from src.ocr_processor import OCRProcessor
from src.data_normalizer import DataNormalizer
from src.excel_exporter import ExcelExporter
from src.pdf_exporter import PDFExporter

# ============================================
# CONFIGURACION - CAMBIA ESTO
# ============================================
# Pega aqui la ruta completa a tu imagen
RUTA_IMAGEN = r"C:\Users\rodri\Desktop\mi_itinerario.jpg"

# EasyOCR no requiere configuración de rutas
# Si quieres especificar idiomas o usar CPU en lugar de GPU, puedes modificar la inicialización

# ============================================
# NO CAMBIES NADA DE AQUI PARA ABAJO
# ============================================

def main():
    print("\n" + "="*60)
    print("PROCESADOR DE ITINERARIOS - PRUEBA SIMPLE")
    print("="*60 + "\n")
    
    # Verificar que la imagen existe
    from pathlib import Path
    if not Path(RUTA_IMAGEN).exists():
        print(f"ERROR: No se encuentra la imagen: {RUTA_IMAGEN}")
        print("\nPor favor, cambia la variable RUTA_IMAGEN en este archivo.")
        return
    
    try:
        # 1. Crear procesador OCR
        print("1. Inicializando EasyOCR...")
        ocr = OCRProcessor()  # EasyOCR se inicializa automáticamente con español e inglés
        print("   OK")
        
        # 2. Extraer texto de la imagen
        print("\n2. Extrayendo texto de la imagen...")
        datos_crudos = ocr.extract_structured_data(RUTA_IMAGEN)
        print(f"   OK - Texto extraido: {len(datos_crudos.get('raw_text', ''))} caracteres")
        print(f"   Fecha encontrada: {datos_crudos.get('fecha', 'No encontrada')}")
        print(f"   Nave encontrada: {datos_crudos.get('nave', 'No encontrada')}")
        
        # 3. Normalizar datos
        print("\n3. Normalizando datos...")
        normalizador = DataNormalizer()
        datos_normalizados = normalizador.normalize(datos_crudos)
        
        # Extraer campos adicionales
        adicionales = normalizador.extract_additional_fields(datos_crudos.get('raw_text', ''))
        datos_normalizados.update(adicionales)
        print("   OK")
        
        # 4. Exportar a Excel
        print("\n4. Generando archivo Excel...")
        exportador_excel = ExcelExporter()
        excel_path = "output/resultado.xlsx"
        exportador_excel.export_single(datos_normalizados, excel_path)
        print(f"   OK - Archivo creado: {excel_path}")
        
        # 5. Exportar a PDF
        print("\n5. Generando archivo PDF...")
        exportador_pdf = PDFExporter()
        pdf_path = "output/resultado.pdf"
        exportador_pdf.export_single(datos_normalizados, pdf_path)
        print(f"   OK - Archivo creado: {pdf_path}")
        
        print("\n" + "="*60)
        print("PROCESO COMPLETADO EXITOSAMENTE!")
        print("="*60)
        print(f"\nArchivos generados en la carpeta 'output':")
        print(f"  - {excel_path}")
        print(f"  - {pdf_path}\n")
        
    except FileNotFoundError as e:
        print(f"\nERROR: {str(e)}")
        print("\nVerifica que:")
        print("  1. La ruta de la imagen sea correcta")
        print("  2. EasyOCR este instalado (pip install easyocr)")
    except Exception as e:
        print(f"\nERROR: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()
