"""
Módulo para normalizar datos extraídos de itinerarios.
"""
import re
from typing import Dict, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class DataNormalizer:
    """Normalizador de datos extraídos de itinerarios."""
    
    # Mapeo de meses en español
    MONTHS_ES = {
        'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04',
        'mayo': '05', 'junio': '06', 'julio': '07', 'agosto': '08',
        'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12'
    }
    
    def normalize(self, raw_data: Dict[str, str]) -> Dict[str, any]:
        """
        Normaliza los datos extraídos del OCR.
        Siempre devuelve: Naviera, Nave, POL, POD, ETD, ETA
        Si hay múltiples naves, normaliza la información de cada una.
        
        Args:
            raw_data: Diccionario con datos crudos extraídos.
            
        Returns:
            Diccionario con datos normalizados.
        """
        # Si hay múltiples naves, normalizar cada una
        if raw_data.get('multiple_naves') and raw_data.get('naves'):
            # Asegurar que ETD y ETA siempre tengan valor
            etd_general = raw_data.get('etd')
            eta_general = raw_data.get('eta')
            
            normalized = {
                'multiple_naves': True,
                'total_naves': raw_data.get('total_naves', 0),
                'naves_normalizadas': [],
                # Campos siempre requeridos
                'naviera': raw_data.get('naviera') or 'No encontrada',
                'pol': self.normalize_pol(raw_data.get('pol')) or 'No encontrado',
                'pod': self.normalize_port(raw_data.get('pod')) or 'No encontrado',
                'etd': self.normalize_date(etd_general) or etd_general or 'No encontrada',
                'eta': self.normalize_date(eta_general) or eta_general or 'No encontrada',
                'fecha_normalizada': self.normalize_date(raw_data.get('fecha')),
                'semana_normalizada': self.normalize_week(raw_data.get('semana')),
                'texto_completo': raw_data.get('raw_text', ''),
            }
            
            # Normalizar cada nave
            for nave_data in raw_data.get('naves', []):
                # Asegurar ETD y ETA para cada nave
                nave_etd = nave_data.get('etd') or nave_data.get('fecha_salida') or etd_general
                nave_eta = nave_data.get('eta') or nave_data.get('fecha_llegada') or eta_general
                
                nave_normalizada = {
                    'nombre': self.normalize_vessel(nave_data.get('nombre')) or 'No encontrada',
                    'nombre_original': nave_data.get('nombre') or 'No encontrada',
                    'naviera': nave_data.get('naviera') or normalized.get('naviera') or 'No encontrada',
                    'pol': self.normalize_pol(nave_data.get('pol')) or normalized.get('pol') or 'No encontrado',
                    'pod': self.normalize_port(nave_data.get('pod')) or normalized.get('pod') or 'No encontrado',
                    'etd': self.normalize_date(nave_etd) or nave_etd or normalized.get('etd') or 'No encontrada',
                    'eta': self.normalize_date(nave_eta) or nave_eta or normalized.get('eta') or 'No encontrada',
                    'fecha_normalizada': self.normalize_date(nave_data.get('fecha')),
                    'fecha_original': nave_data.get('fecha'),
                    'numero_viaje': nave_data.get('numero_viaje'),
                    'numero_contenedor': nave_data.get('numero_contenedor'),
                    'numero_booking': nave_data.get('numero_booking'),
                }
                normalized['naves_normalizadas'].append(nave_normalizada)
            
            return normalized
        
        # Una sola nave - normalización normal con campos requeridos
        # Asegurar que ETD y ETA siempre tengan valor
        etd_raw = raw_data.get('etd') or raw_data.get('fecha_salida')
        eta_raw = raw_data.get('eta') or raw_data.get('fecha_llegada')
        
        normalized = {
            'multiple_naves': False,
            # Campos siempre requeridos
            'naviera': raw_data.get('naviera') or 'No encontrada',
            'nave_normalizada': self.normalize_vessel(raw_data.get('nave')) or 'No encontrada',
            'nave_original': raw_data.get('nave') or 'No encontrada',
            'pol': self.normalize_pol(raw_data.get('pol')) or 'No encontrado',
            'pod': self.normalize_port(raw_data.get('pod')) or 'No encontrado',
            'etd': self.normalize_date(etd_raw) or etd_raw or 'No encontrada',
            'eta': self.normalize_date(eta_raw) or eta_raw or 'No encontrada',
            # Campos adicionales
            'fecha_normalizada': self.normalize_date(raw_data.get('fecha')),
            'fecha_salida_normalizada': self.normalize_date(raw_data.get('fecha_salida')),
            'fecha_llegada_normalizada': self.normalize_date(raw_data.get('fecha_llegada')),
            'semana_normalizada': self.normalize_week(raw_data.get('semana')),
            'puerto_origen': self.normalize_pol(raw_data.get('pol') or raw_data.get('puerto_origen')),
            'puerto_destino': self.normalize_port(raw_data.get('pod') or raw_data.get('puerto_destino')),
            'numero_contenedor': raw_data.get('numero_contenedor'),
            'numero_booking': raw_data.get('numero_booking'),
            # Valores originales
            'fecha_original': raw_data.get('fecha'),
            'fecha_salida_original': raw_data.get('fecha_salida'),
            'fecha_llegada_original': raw_data.get('fecha_llegada'),
            'semana_original': raw_data.get('semana'),
            'texto_completo': raw_data.get('raw_text', ''),
        }
        
        return normalized
    
    def normalize_pol(self, pol_str: Optional[str]) -> Optional[str]:
        """
        Normaliza POL - solo puede ser San Antonio o Valparaíso.
        
        Args:
            pol_str: POL en formato variado.
            
        Returns:
            'San Antonio' o 'Valparaíso' si es válido, None en caso contrario.
        """
        if not pol_str:
            return None
        
        pol_lower = pol_str.lower()
        
        # Validar que sea San Antonio o Valparaíso
        if 'san antonio' in pol_lower:
            return 'San Antonio'
        elif 'valpara' in pol_lower:
            return 'Valparaíso'
        
        return None
    
    def normalize_date(self, date_str: Optional[str]) -> Optional[str]:
        """
        Normaliza una fecha a formato estándar YYYY-MM-DD.
        
        Args:
            date_str: Fecha en formato variado.
            
        Returns:
            Fecha normalizada en formato YYYY-MM-DD o None si no se puede parsear.
        """
        if not date_str:
            return None
        
        try:
            # Intentar diferentes formatos
            formats = [
                '%d/%m/%Y', '%d-%m-%Y', '%Y/%m/%d', '%Y-%m-%d',
                '%d/%m/%y', '%d-%m-%y', '%y/%m/%d', '%y-%m-%d',
            ]
            
            # Primero intentar con formatos estándar
            for fmt in formats:
                try:
                    dt = datetime.strptime(date_str.strip(), fmt)
                    return dt.strftime('%Y-%m-%d')
                except ValueError:
                    continue
            
            # Intentar con formato de texto (ej: "15 enero 2024")
            for month_name, month_num in self.MONTHS_ES.items():
                if month_name.lower() in date_str.lower():
                    pattern = rf'(\d{{1,2}})\s+{month_name}\s+(\d{{4}})'
                    match = re.search(pattern, date_str, re.IGNORECASE)
                    if match:
                        day = match.group(1).zfill(2)
                        year = match.group(2)
                        return f"{year}-{month_num}-{day}"
            
            logger.warning(f"No se pudo normalizar la fecha: {date_str}")
            return date_str  # Retornar original si no se puede normalizar
            
        except Exception as e:
            logger.error(f"Error al normalizar fecha {date_str}: {str(e)}")
            return date_str
    
    def normalize_vessel(self, vessel_str: Optional[str]) -> Optional[str]:
        """
        Normaliza el nombre de la nave (mayúsculas, espacios, etc.).
        
        Args:
            vessel_str: Nombre de la nave en formato variado.
            
        Returns:
            Nombre de la nave normalizado.
        """
        if not vessel_str:
            return None
        
        # Limpiar espacios extra, convertir a título
        normalized = ' '.join(vessel_str.split())
        normalized = normalized.title()
        
        # Remover caracteres especiales no deseados
        normalized = re.sub(r'[^\w\s-]', '', normalized)
        
        return normalized.strip()
    
    def normalize_week(self, week_str: Optional[str]) -> Optional[int]:
        """
        Normaliza el número de semana a entero.
        
        Args:
            week_str: Número de semana como string.
            
        Returns:
            Número de semana como entero o None si no es válido.
        """
        if not week_str:
            return None
        
        try:
            # Extraer solo números
            numbers = re.findall(r'\d+', week_str)
            if numbers:
                week_num = int(numbers[0])
                # Validar rango razonable (1-53)
                if 1 <= week_num <= 53:
                    return week_num
            return None
        except (ValueError, IndexError):
            logger.warning(f"No se pudo normalizar la semana: {week_str}")
            return None
    
    def extract_additional_fields(self, text: str) -> Dict[str, any]:
        """
        Extrae campos adicionales del texto completo.
        
        Args:
            text: Texto completo extraído del OCR.
            
        Returns:
            Diccionario con campos adicionales extraídos.
        """
        additional = {}
        
        # Extraer puertos
        ports = self._extract_ports(text)
        if ports:
            additional['puertos'] = ports
        
        # Extraer números de viaje
        voyage = self._extract_voyage_number(text)
        if voyage:
            additional['numero_viaje'] = voyage
        
        return additional
    
    def _extract_ports(self, text: str) -> list:
        """Extrae nombres de puertos del texto."""
        # Lista común de puertos (puede extenderse)
        common_ports = [
            'valparaíso', 'san antonio', 'iquique', 'antofagasta', 'arica',
            'callao', 'guayaquil', 'buenos aires', 'montevideo', 'santos',
            'centra terminal', 'puerto centra', 'asia central', 'central terminal'
        ]
        
        found_ports = []
        text_lower = text.lower()
        
        # Buscar puertos por nombre completo
        for port in common_ports:
            if port in text_lower:
                found_ports.append(port.title())
        
        # También buscar patrones de puertos
        port_patterns = [
            r'puerto[:\s]+([A-ZÁÉÍÓÚÑ][a-záéíóúñ\s]+)',
            r'port[:\s]+([A-ZÁÉÍÓÚÑ][a-záéíóúñ\s]+)',
            r'terminal[:\s]+([A-ZÁÉÍÓÚÑ][a-záéíóúñ\s]+)',
        ]
        
        for pattern in port_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                port_name = match.group(1).strip()
                port_words = port_name.split()[:3]  # Primeras 3 palabras
                port_clean = ' '.join(port_words).title()
                if port_clean and port_clean not in found_ports:
                    found_ports.append(port_clean)
        
        return found_ports
    
    def _extract_voyage_number(self, text: str) -> Optional[str]:
        """Extrae número de viaje del texto con múltiples variantes."""
        patterns = [
            # Patrones en español
            r'viaje[:\s]+([A-Z0-9-]+)',
            r'n[úu]mero\s+de\s+viaje[:\s]+([A-Z0-9-]+)',
            r'viaje\s+n[úu]mero[:\s]+([A-Z0-9-]+)',
            # Patrones en inglés
            r'voyage[:\s]+([A-Z0-9-]+)',
            r'voyage\s+number[:\s]+([A-Z0-9-]+)',
            r'voyage\s+no[.:\s]+([A-Z0-9-]+)',
            r'voyage\s+#[:\s]*([A-Z0-9-]+)',
            r'voy\s+number[:\s]+([A-Z0-9-]+)',
            r'voy\s+no[.:\s]+([A-Z0-9-]+)',
            # Patrones abreviados
            r'V\.?\s*([A-Z0-9-]+)',
            r'VOY[:\s]*([A-Z0-9-]+)',
            r'VN[:\s]+([A-Z0-9-]+)',  # Voyage Number
            r'V\.?\s*N[úu]?[.:\s]*([A-Z0-9-]+)',  # V.N. o V N
            # Patrones con formato común
            r'V[OY]?[:\s]*([A-Z]{1,3}\d{1,4})',  # V123, VOY123, V.123
            r'([A-Z0-9-]{2,15})\s*(?:VOYAGE|VIAJE)',  # 123 VOYAGE
            # Patrones con guiones
            r'V[OY]?[:\s]*([A-Z0-9-]{3,15})',  # V-123, VOY-ABC
            # Buscar después de palabras clave
            r'(?:voyage|viaje|voy)[:\s]+(?:number|n[úu]mero|no|#)?[:\s]*([A-Z0-9-]{2,15})',
        ]
        
        for pattern in patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                voyage_num = match.group(1).strip()
                # Validar que tenga al menos un carácter alfanumérico
                if voyage_num and len(voyage_num) >= 2:
                    # Limpiar caracteres no deseados al inicio/final
                    voyage_num = voyage_num.strip('.,;:')
                    return voyage_num
        
        return None
    
    def normalize_port(self, port_str: Optional[str]) -> Optional[str]:
        """
        Normaliza el nombre de un puerto.
        
        Args:
            port_str: Nombre del puerto en formato variado.
            
        Returns:
            Nombre del puerto normalizado.
        """
        if not port_str:
            return None
        
        # Limpiar y capitalizar
        normalized = ' '.join(port_str.split())
        normalized = normalized.title()
        
        return normalized.strip()