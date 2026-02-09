"""
Módulo para exportar datos normalizados a PDF.
"""
import sys

# Parche para Python 3.8 - evitar error con usedforsecurity en reportlab
# DEBE estar antes de importar reportlab
if sys.version_info < (3, 9):
    import hashlib
    
    # Parchear md5 para que ignore usedforsecurity
    # Reportlab llama md5(usedforsecurity=False) pero Python 3.8 no lo soporta
    # Usar una clase wrapper para evitar recursión infinita
    if not hasattr(hashlib, '_md5_patched_pdf'):
        _original_md5_func = hashlib.md5
        
        class _MD5Wrapper:
            def __init__(self, original_func):
                self._original = original_func
                self._patched = True
            
            def __call__(self, data=b'', **kwargs):
                # Python 3.8 no soporta usedforsecurity, ignorarlo completamente
                kwargs.pop('usedforsecurity', None)
                # Llamar directamente a la función original sin pasar kwargs
                return self._original(data)
            
            def __getattr__(self, name):
                # Delegar cualquier otro atributo a la función original
                return getattr(self._original, name)
        
        hashlib._md5_patched_pdf = True
        hashlib.md5 = _MD5Wrapper(_original_md5_func)

from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from pathlib import Path
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)


class PDFExporter:
    """Exportador de datos a formato PDF."""
    
    def __init__(self, page_size: str = 'A4'):
        """
        Inicializa el exportador PDF.
        
        Args:
            page_size: Tamaño de página ('A4' o 'letter').
        """
        self.page_size = A4 if page_size.upper() == 'A4' else letter
    
    def export_single(self, data: Dict[str, any], output_path: str) -> str:
        """
        Exporta un único registro a PDF.
        
        Args:
            data: Diccionario con datos normalizados.
            output_path: Ruta donde guardar el archivo PDF.
            
        Returns:
            Ruta del archivo generado.
        """
        output_path_obj = Path(output_path)
        output_path_obj.parent.mkdir(parents=True, exist_ok=True)
        
        doc = SimpleDocTemplate(str(output_path), pagesize=self.page_size)
        story = []
        
        # Estilos
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=18,
            textColor=colors.HexColor('#366092'),
            spaceAfter=30,
            alignment=1  # Centrado
        )
        
        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=12,
            textColor=colors.HexColor('#366092'),
            spaceAfter=10,
        )
        
        # Título
        story.append(Paragraph("Itinerario de Naviera", title_style))
        story.append(Spacer(1, 0.3*inch))
        
        # Datos principales
        data_items = [
            ('Fecha Normalizada', data.get('fecha_normalizada')),
            ('Fecha Original', data.get('fecha_original')),
            ('Nave Normalizada', data.get('nave_normalizada')),
            ('Nave Original', data.get('nave_original')),
            ('Semana Normalizada', data.get('semana_normalizada')),
            ('Semana Original', data.get('semana_original')),
        ]
        
        # Agregar campos adicionales
        if 'puertos' in data and data['puertos']:
            ports_str = ', '.join(data['puertos']) if isinstance(data['puertos'], list) else str(data['puertos'])
            data_items.append(('Puertos', ports_str))
        
        if 'numero_viaje' in data and data['numero_viaje']:
            data_items.append(('Número de Viaje', data['numero_viaje']))
        
        # Crear tabla de datos
        table_data = [['Campo', 'Valor']]
        for field, value in data_items:
            if value is not None:
                table_data.append([field, str(value)])
        
        table = Table(table_data, colWidths=[2*inch, 4*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#366092')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
        ]))
        
        story.append(table)
        story.append(Spacer(1, 0.5*inch))
        
        # Texto completo (opcional, si es muy largo puede omitirse)
        if data.get('texto_completo'):
            story.append(Paragraph("Texto Extraído Completo", heading_style))
            # Limitar texto si es muy largo
            texto = data['texto_completo']
            if len(texto) > 1000:
                texto = texto[:1000] + "... (texto truncado)"
            story.append(Paragraph(texto.replace('\n', '<br/>'), styles['Normal']))
        
        # Construir PDF
        doc.build(story)
        
        logger.info(f"Archivo PDF generado exitosamente: {output_path}")
        return output_path
    
    def export_multiple(self, data_list: List[Dict[str, any]], output_path: str) -> str:
        """
        Exporta múltiples registros a PDF.
        
        Args:
            data_list: Lista de diccionarios con datos normalizados.
            output_path: Ruta donde guardar el archivo PDF.
            
        Returns:
            Ruta del archivo generado.
        """
        if not data_list:
            raise ValueError("La lista de datos está vacía")
        
        output_path_obj = Path(output_path)
        output_path_obj.parent.mkdir(parents=True, exist_ok=True)
        
        doc = SimpleDocTemplate(str(output_path), pagesize=self.page_size)
        story = []
        
        # Estilos
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=18,
            textColor=colors.HexColor('#366092'),
            spaceAfter=30,
            alignment=1
        )
        
        # Título
        story.append(Paragraph(f"Itinerarios de Naviera ({len(data_list)} registros)", title_style))
        story.append(Spacer(1, 0.3*inch))
        
        # Crear tabla con todos los registros
        table_data = [['Fecha', 'Nave', 'Semana', 'Puertos', 'Viaje']]
        
        for data in data_list:
            row = [
                data.get('fecha_normalizada') or data.get('fecha_original') or '',
                data.get('nave_normalizada') or data.get('nave_original') or '',
                str(data.get('semana_normalizada') or data.get('semana_original') or ''),
                ', '.join(data.get('puertos', [])) if isinstance(data.get('puertos'), list) else str(data.get('puertos', '')),
                data.get('numero_viaje', ''),
            ]
            table_data.append(row)
        
        table = Table(table_data, colWidths=[1.2*inch, 1.5*inch, 0.8*inch, 1.5*inch, 1*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#366092')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
        ]))
        
        story.append(table)
        
        # Construir PDF
        doc.build(story)
        
        logger.info(f"Archivo PDF con {len(data_list)} registros generado: {output_path}")
        return output_path
