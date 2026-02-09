"""
Módulo para procesamiento de imágenes de itinerarios usando OCR.
"""
import re
from typing import Dict, Optional
from pathlib import Path
import easyocr
import logging

logger = logging.getLogger(__name__)


class OCRProcessor:
    """Procesador de OCR para extraer texto de imágenes de itinerarios."""
    
    def __init__(self, languages: Optional[list] = None, gpu: bool = True):
        """
        Inicializa el procesador OCR.
        
        Args:
            languages: Lista de idiomas a usar (por defecto ['es', 'en']).
                      Ejemplo: ['es', 'en'] para español e inglés.
            gpu: Si usar GPU para procesamiento (por defecto True).
                 Si no hay GPU disponible, se usará CPU automáticamente.
        """
        if languages is None:
            languages = ['es', 'en']  # Español e inglés por defecto
        
        try:
            self.reader = easyocr.Reader(languages, gpu=gpu)
            logger.info(f"EasyOCR inicializado con idiomas: {languages}")
        except Exception as e:
            logger.warning(f"Error al inicializar EasyOCR con GPU, intentando con CPU: {str(e)}")
            try:
                self.reader = easyocr.Reader(languages, gpu=False)
                logger.info(f"EasyOCR inicializado con CPU e idiomas: {languages}")
            except Exception as e2:
                logger.error(f"Error al inicializar EasyOCR: {str(e2)}")
                raise
    
    def extract_text(self, image_path: str) -> str:
        """
        Extrae texto de una imagen usando OCR.
        
        Args:
            image_path: Ruta a la imagen a procesar.
            
        Returns:
            Texto extraído de la imagen.
            
        Raises:
            FileNotFoundError: Si la imagen no existe.
            ValueError: Si hay un error al procesar la imagen.
        """
        image_path_obj = Path(image_path)
        
        if not image_path_obj.exists():
            raise FileNotFoundError(f"La imagen no existe: {image_path}")
        
        try:
            # EasyOCR lee directamente desde la ruta del archivo
            results = self.reader.readtext(str(image_path))
            
            # Extraer texto de los resultados
            # results es una lista de tuplas: (bbox, text, confidence)
            text_lines = []
            for (bbox, text, confidence) in results:
                # Filtrar resultados con baja confianza (opcional)
                if confidence > 0.3:  # Umbral de confianza mínimo
                    text_lines.append(text)
            
            # Unir todas las líneas de texto
            text = '\n'.join(text_lines)
            
            logger.info(f"Texto extraído exitosamente de {image_path} ({len(results)} detecciones)")
            return text
        except Exception as e:
            logger.error(f"Error al procesar imagen {image_path}: {str(e)}")
            raise ValueError(f"Error al procesar la imagen: {str(e)}")
    
    def extract_structured_data(self, image_path: str) -> Dict[str, str]:
        """
        Extrae datos estructurados básicos de un itinerario.
        Siempre devuelve: Naviera, Nave, POL, POD, ETD, ETA
        Si hay múltiples naves, extrae información de todas.
        
        Args:
            image_path: Ruta a la imagen del itinerario.
            
        Returns:
            Diccionario con datos extraídos (texto crudo y datos estructurados).
        """
        raw_text = self.extract_text(image_path)
        
        # Extraer datos básicos siempre requeridos
        naviera = self._extract_shipping_line(raw_text)
        nave = self._extract_vessel(raw_text)
        pol = self._extract_pol(raw_text)  # Solo San Antonio o Valparaíso
        pod = self._extract_pod(raw_text)  # Cualquier otro destino
        
        # ETD y ETA - siempre intentar extraer con máxima prioridad
        # Intentar múltiples métodos para asegurar que se encuentren
        etd = self._extract_etd(raw_text)  # Fecha de salida
        if not etd:
            etd = self._extract_departure_date(raw_text)
        if not etd:
            # Buscar cualquier fecha en el texto como último recurso
            etd = self._extract_any_date_near_keyword(raw_text, ['salida', 'departure', 'etd', 'despacho'])
        
        eta = self._extract_eta(raw_text)  # Fecha de llegada
        if not eta:
            eta = self._extract_arrival_date(raw_text)
        if not eta:
            # Buscar cualquier fecha en el texto como último recurso
            eta = self._extract_any_date_near_keyword(raw_text, ['llegada', 'arrival', 'eta', 'arribo'])
        
        # Detectar múltiples naves
        naves_encontradas = self._extract_all_vessels(raw_text)
        
        # Si hay múltiples naves, extraer información de cada una
        if len(naves_encontradas) > 1:
            data = {
                'raw_text': raw_text,
                'multiple_naves': True,
                'total_naves': len(naves_encontradas),
                'naves': [],
                # Datos generales siempre requeridos
                'naviera': naviera,
                'pol': pol,
                'pod': pod,
                'etd': etd,
                'eta': eta,
                'fecha': self._extract_date(raw_text),
                'semana': self._extract_week(raw_text),
            }
            
            # Extraer información para cada nave
            for nave_info in naves_encontradas:
                nave_data = self._extract_data_for_vessel(raw_text, nave_info)
                # Asegurar que cada nave tenga los campos requeridos
                nave_data['naviera'] = naviera or nave_data.get('naviera')
                nave_data['pol'] = pol or self._extract_pol_from_context(raw_text, nave_info)
                nave_data['pod'] = pod or self._extract_pod_from_context(raw_text, nave_info)
                nave_data['etd'] = nave_data.get('fecha_salida') or etd
                nave_data['eta'] = nave_data.get('fecha_llegada') or eta
                data['naves'].append(nave_data)
            
        else:
            # Una sola nave - extracción normal con campos requeridos
            data = {
                'raw_text': raw_text,
                'multiple_naves': False,
                'naviera': naviera,
                'nave': nave,
                'pol': pol,
                'pod': pod,
                'etd': etd,
                'eta': eta,
                'fecha': self._extract_date(raw_text),
                'fecha_salida': etd,
                'fecha_llegada': eta,
                'semana': self._extract_week(raw_text),
                'puerto_origen': pol,  # POL es el puerto de origen
                'puerto_destino': pod,  # POD es el puerto de destino
                'numero_contenedor': self._extract_container_number(raw_text),
                'numero_booking': self._extract_booking_number(raw_text),
            }
        
        return data
    
    def _extract_date(self, text: str) -> Optional[str]:
        """Extrae fechas del texto usando patrones comunes."""
        # Patrones comunes de fechas en itinerarios (más flexibles)
        date_patterns = [
            r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}',  # DD/MM/YYYY o DD-MM-YYYY
            r'\d{1,2}\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+\d{4}',
            r'\d{4}[/-]\d{1,2}[/-]\d{1,2}',  # YYYY/MM/DD
            r'\d{1,2}[/-]\d{1,2}[/-]\d{2}',  # DD/MM/YY
            r'\d{1,2}\.\d{1,2}\.\d{2,4}',  # DD.MM.YYYY
            r'\d{1,2}\s+\d{1,2}\s+\d{2,4}',  # DD MM YYYY
        ]
        
        for pattern in date_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                fecha = match.group(0).strip()
                if fecha:
                    return fecha
        
        return None
    
    def _extract_any_date_near_keyword(self, text: str, keywords: list) -> Optional[str]:
        """
        Busca cualquier fecha cerca de palabras clave.
        Útil como último recurso para encontrar fechas.
        """
        lines = text.split('\n')
        for i, line in enumerate(lines):
            line_lower = line.lower()
            for keyword in keywords:
                if keyword in line_lower:
                    # Buscar fecha en esta línea
                    fecha = self._extract_date(line)
                    if fecha:
                        return fecha
                    # Buscar en líneas adyacentes (2 líneas antes y después)
                    for offset in [-2, -1, 1, 2]:
                        idx = i + offset
                        if 0 <= idx < len(lines):
                            fecha = self._extract_date(lines[idx])
                            if fecha:
                                return fecha
        return None
    
    def _extract_vessel(self, text: str) -> Optional[str]:
        """Extrae el nombre de la nave del texto."""
        # Buscar palabras clave relacionadas con naves
        vessel_keywords = ['nave', 'vessel', 'barco', 'ship', 'buque']
        
        lines = text.split('\n')
        for line in lines:
            line_lower = line.lower()
            for keyword in vessel_keywords:
                if keyword in line_lower:
                    # Intentar extraer el nombre que sigue a la palabra clave
                    parts = line.split(keyword, 1)
                    if len(parts) > 1:
                        # Capturar más palabras (hasta 5 o hasta encontrar números/fechas)
                        remaining = parts[1].strip()
                        words = remaining.split()
                        vessel_words = []
                        
                        for word in words:
                            # Detener si encontramos números que parecen fechas o códigos
                            if re.match(r'^\d{1,2}[/-]\d', word):  # Fecha
                                break
                            if re.match(r'^V\.?\d', word):  # Viaje V.123
                                break
                            if len(word) > 20:  # Palabra muy larga, probablemente no es parte del nombre
                                break
                            vessel_words.append(word)
                            # Limitar a 5 palabras máximo para evitar capturar demasiado
                            if len(vessel_words) >= 5:
                                break
                        
                        if vessel_words:
                            return ' '.join(vessel_words)
        
        return None
    
    def _extract_all_vessels(self, text: str) -> list:
        """Extrae todas las naves encontradas en el texto, evitando confundir con puertos."""
        naves = []
        vessel_keywords = ['nave', 'vessel', 'barco', 'ship', 'buque']
        
        # Lista de palabras que indican que es un puerto, no una nave
        port_indicators = [
            'puerto', 'port', 'terminal', 'centra', 'san antonio', 'valparaíso', 
            'iquique', 'antofagasta', 'arica', 'callao', 'guayaquil', 'buenos aires',
            'montevideo', 'santos', 'asia', 'central', 'centro'
        ]
        
        def is_likely_port(name: str) -> bool:
            """Verifica si un nombre es probablemente un puerto."""
            name_lower = name.lower()
            # Si contiene indicadores de puerto
            for indicator in port_indicators:
                if indicator in name_lower:
                    return True
            # Si empieza con "Puerto" o "Port"
            if name_lower.startswith('puerto ') or name_lower.startswith('port '):
                return True
            return False
        
        lines = text.split('\n')
        
        for i, line in enumerate(lines):
            line_lower = line.lower()
            for keyword in vessel_keywords:
                if keyword in line_lower:
                    # Extraer nombre de la nave
                    parts = line.split(keyword, 1)
                    if len(parts) > 1:
                        remaining = parts[1].strip()
                        words = remaining.split()
                        vessel_words = []
                        
                        for word in words:
                            # Detener si encontramos números que parecen fechas o códigos
                            if re.match(r'^\d{1,2}[/-]\d', word):  # Fecha
                                break
                            if re.match(r'^V\.?\d', word):  # Viaje V.123
                                break
                            if len(word) > 20:  # Palabra muy larga
                                break
                            vessel_words.append(word)
                            # Limitar a 5 palabras máximo
                            if len(vessel_words) >= 5:
                                break
                        
                        vessel_name_str = ' '.join(vessel_words) if vessel_words else None
                        
                        # Filtrar puertos y validar
                        if vessel_name_str and len(vessel_name_str.strip()) > 2:
                            if not is_likely_port(vessel_name_str):
                                if vessel_name_str not in [n['nombre'] for n in naves]:
                                    naves.append({
                                        'nombre': vessel_name_str,
                                        'linea': i,
                                        'contexto': line.strip()
                                    })
        
        # También buscar patrones de nombres de naves comunes
        # Patrón: palabras en mayúsculas que podrían ser nombres de naves
        vessel_patterns = [
            r'\b([A-Z][A-Za-z\s]{2,30})\s+(?:V\.|VOYAGE|VIAJE|V\s*\d)',  # Nombre seguido de V. o VOYAGE
            r'(?:NAVE|VESSEL|SHIP)[:\s]+([A-Z][A-Za-z\s]{2,30})',  # Después de NAVE/VESSEL
        ]
        
        for pattern in vessel_patterns:
            matches = re.finditer(pattern, text)
            for match in matches:
                vessel_name = match.group(1).strip()
                # Limpiar el nombre (remover espacios extra, limitar longitud)
                vessel_name = ' '.join(vessel_name.split()[:5])  # Máximo 5 palabras
                
                # Validar que no sea un puerto y que tenga letras
                if (len(vessel_name) > 2 and 
                    re.search(r'[A-Za-z]', vessel_name) and 
                    not is_likely_port(vessel_name) and
                    vessel_name not in [n['nombre'] for n in naves]):
                    naves.append({
                        'nombre': vessel_name,
                        'linea': text[:match.start()].count('\n'),
                        'contexto': match.group(0)
                    })
        
        return naves
    
    def _extract_data_for_vessel(self, text: str, vessel_info: dict) -> dict:
        """Extrae información específica para una nave."""
        nave_nombre = vessel_info['nombre']
        linea_nave = vessel_info['linea']
        
        # Obtener contexto alrededor de la nave (10 líneas antes y después)
        lines = text.split('\n')
        inicio_contexto = max(0, linea_nave - 10)
        fin_contexto = min(len(lines), linea_nave + 20)
        contexto_texto = '\n'.join(lines[inicio_contexto:fin_contexto])
        
        # Extraer datos del contexto de esta nave
        nave_data = {
            'nombre': nave_nombre,
            'fecha': self._extract_date(contexto_texto),
            'fecha_salida': self._extract_departure_date(contexto_texto),
            'fecha_llegada': self._extract_arrival_date(contexto_texto),
            'puerto_origen': self._extract_origin_port(contexto_texto),
            'puerto_destino': self._extract_destination_port(contexto_texto),
            'numero_viaje': self._extract_voyage_number(contexto_texto),
            'numero_contenedor': self._extract_container_number(contexto_texto),
            'numero_booking': self._extract_booking_number(contexto_texto),
        }
        
        return nave_data
    
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
            r'([A-Z]{1,3}\d{1,4})\s*(?:VOYAGE|VIAJE)',  # 123 VOYAGE
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
    
    def _extract_week(self, text: str) -> Optional[str]:
        """Extrae información de semana del texto."""
        # Buscar patrones de semana
        week_patterns = [
            r'semana\s+(\d+)',
            r'week\s+(\d+)',
            r'W(\d+)',
            r'Sem\.?\s*(\d+)',
        ]
        
        for pattern in week_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1) if match.groups() else match.group(0)
        
        return None
    
    def _extract_departure_date(self, text: str) -> Optional[str]:
        """Extrae fecha de salida."""
        patterns = [
            r'salida[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
            r'departure[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
            r'ETD[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
            r'despacho[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1)
        
        return None
    
    def _extract_arrival_date(self, text: str) -> Optional[str]:
        """Extrae fecha de llegada."""
        patterns = [
            r'llegada[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
            r'arrival[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
            r'ETA[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
            r'arribo[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1)
        
        return None
    
    def _extract_origin_port(self, text: str) -> Optional[str]:
        """Extrae puerto de origen."""
        patterns = [
            r'origen[:\s]+([A-ZÁÉÍÓÚÑ][a-záéíóúñ\s]+)',
            r'origin[:\s]+([A-ZÁÉÍÓÚÑ][a-záéíóúñ\s]+)',
            r'desde[:\s]+([A-ZÁÉÍÓÚÑ][a-záéíóúñ\s]+)',
            r'from[:\s]+([A-ZÁÉÍÓÚÑ][a-záéíóúñ\s]+)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                port = match.group(1).strip()
                # Limitar a las primeras palabras razonables
                port_words = port.split()[:3]
                return ' '.join(port_words)
        
        return None
    
    def _extract_destination_port(self, text: str) -> Optional[str]:
        """Extrae puerto de destino."""
        patterns = [
            r'destino[:\s]+([A-ZÁÉÍÓÚÑ][a-záéíóúñ\s]+)',
            r'destination[:\s]+([A-ZÁÉÍÓÚÑ][a-záéíóúñ\s]+)',
            r'hacia[:\s]+([A-ZÁÉÍÓÚÑ][a-záéíóúñ\s]+)',
            r'to[:\s]+([A-ZÁÉÍÓÚÑ][a-záéíóúñ\s]+)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                port = match.group(1).strip()
                port_words = port.split()[:3]
                return ' '.join(port_words)
        
        return None
    
    def _extract_container_number(self, text: str) -> Optional[str]:
        """Extrae número de contenedor."""
        # Formato estándar: 4 letras + 7 dígitos (ej: ABCD1234567)
        patterns = [
            r'contenedor[:\s]*([A-Z]{4}\d{7})',
            r'container[:\s]*([A-Z]{4}\d{7})',
            r'([A-Z]{4}\d{7})',  # Formato estándar ISO
            r'cont[:\s]*([A-Z]{4}\d{7})',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                return match.group(1)
        
        return None
    
    def _extract_booking_number(self, text: str) -> Optional[str]:
        """Extrae número de booking."""
        patterns = [
            r'booking[:\s]+([A-Z0-9-]+)',
            r'reserva[:\s]+([A-Z0-9-]+)',
            r'B/L[:\s]+([A-Z0-9-]+)',
            r'BL[:\s]+([A-Z0-9-]+)',
            r'BKG[:\s]+([A-Z0-9-]+)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()
        
        return None
    
    def _extract_shipping_line(self, text: str) -> Optional[str]:
        """Extrae nombre de la naviera."""
        shipping_lines = [
            'maersk', 'msc', 'cma cgm', 'cosco', 'evergreen', 'hapag-lloyd',
            'yang ming', 'oocl', 'hyundai', 'pil', 'zim', 'hamburg sud',
            'mol', 'nyk', 'k line', 'apl', 'cma', 'cma cgm'
        ]
        
        text_lower = text.lower()
        for line in shipping_lines:
            if line in text_lower:
                return line.upper()
        
        return None
    
    def _extract_pol(self, text: str) -> Optional[str]:
        """
        Extrae POL (Point of Loading) - solo San Antonio o Valparaíso.
        
        Args:
            text: Texto completo extraído.
            
        Returns:
            'San Antonio' o 'Valparaíso' si se encuentra, None en caso contrario.
        """
        text_lower = text.lower()
        
        # Buscar San Antonio
        if 'san antonio' in text_lower:
            return 'San Antonio'
        
        # Buscar Valparaíso (con diferentes variantes)
        if 'valparaíso' in text_lower or 'valparaiso' in text_lower:
            return 'Valparaíso'
        
        # Buscar patrones POL
        pol_patterns = [
            r'POL[:\s]+(?:San\s+Antonio|Valpara[ií]so)',
            r'Point\s+of\s+Loading[:\s]+(?:San\s+Antonio|Valpara[ií]so)',
            r'Puerto\s+de\s+Carga[:\s]+(?:San\s+Antonio|Valpara[ií]so)',
        ]
        
        for pattern in pol_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                pol_text = match.group(0)
                if 'san antonio' in pol_text.lower():
                    return 'San Antonio'
                elif 'valpara' in pol_text.lower():
                    return 'Valparaíso'
        
        return None
    
    def _extract_pod(self, text: str) -> Optional[str]:
        """
        Extrae POD (Point of Discharge) - cualquier puerto de destino.
        
        Args:
            text: Texto completo extraído.
            
        Returns:
            Nombre del puerto de destino (excluyendo San Antonio y Valparaíso).
        """
        # Buscar patrones POD
        pod_patterns = [
            r'POD[:\s]+([A-ZÁÉÍÓÚÑ][a-záéíóúñ\s]+)',
            r'Point\s+of\s+Discharge[:\s]+([A-ZÁÉÍÓÚÑ][a-záéíóúñ\s]+)',
            r'Puerto\s+de\s+Descarga[:\s]+([A-ZÁÉÍÓÚÑ][a-záéíóúñ\s]+)',
            r'destino[:\s]+([A-ZÁÉÍÓÚÑ][a-záéíóúñ\s]+)',
            r'destination[:\s]+([A-ZÁÉÍÓÚÑ][a-záéíóúñ\s]+)',
            r'to[:\s]+([A-ZÁÉÍÓÚÑ][a-záéíóúñ\s]+)',
        ]
        
        for pattern in pod_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                pod = match.group(1).strip()
                pod_words = pod.split()[:3]
                pod_clean = ' '.join(pod_words).title()
                
                # Excluir San Antonio y Valparaíso (esos son POL)
                pod_lower = pod_clean.lower()
                if 'san antonio' not in pod_lower and 'valpara' not in pod_lower:
                    return pod_clean
        
        # Si no se encuentra con patrones, buscar puertos comunes excluyendo POL
        common_pods = [
            'callao', 'guayaquil', 'buenos aires', 'montevideo', 'santos',
            'iquique', 'antofagasta', 'arica', 'centra terminal', 'puerto centra',
            'asia central'
        ]
        
        text_lower = text.lower()
        for pod in common_pods:
            if pod in text_lower:
                pod_clean = pod.title()
                # Excluir San Antonio y Valparaíso
                if 'san antonio' not in pod_clean.lower() and 'valpara' not in pod_clean.lower():
                    return pod_clean
        
        return None
    
    def _extract_etd(self, text: str) -> Optional[str]:
        """
        Extrae ETD (Estimated Time of Departure) - fecha de salida.
        Busca múltiples variantes y formatos.
        
        Args:
            text: Texto completo extraído.
            
        Returns:
            Fecha de salida en formato encontrado.
        """
        # Buscar ETD específicamente con múltiples variantes
        etd_patterns = [
            r'ETD[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
            r'ETD[:\s]+(\d{1,2}\s+\w+\s+\d{4})',
            r'ETD[:\s]+(\d{4}[/-]\d{1,2}[/-]\d{1,2})',
            r'ETD\s*[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
            r'Estimated\s+Time\s+of\s+Departure[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
            r'Fecha\s+de\s+Salida[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
            r'Salida[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
            r'Departure[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
            r'Despacho[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
            # Buscar fechas cerca de palabras clave ETD
            r'(?:ETD|Salida|Departure|Despacho)[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
        ]
        
        for pattern in etd_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                fecha = match.group(1).strip()
                if fecha:
                    return fecha
        
        # Si no se encuentra ETD explícito, usar fecha de salida genérica
        fecha_salida = self._extract_departure_date(text)
        if fecha_salida:
            return fecha_salida
        
        # Como último recurso, buscar cualquier fecha cerca de palabras clave de salida
        salida_keywords = ['salida', 'departure', 'etd', 'despacho']
        lines = text.split('\n')
        for i, line in enumerate(lines):
            line_lower = line.lower()
            for keyword in salida_keywords:
                if keyword in line_lower:
                    # Buscar fecha en esta línea o la siguiente
                    fecha = self._extract_date(line)
                    if not fecha and i + 1 < len(lines):
                        fecha = self._extract_date(lines[i + 1])
                    if fecha:
                        return fecha
        
        return None
    
    def _extract_eta(self, text: str) -> Optional[str]:
        """
        Extrae ETA (Estimated Time of Arrival) - fecha de llegada.
        Busca múltiples variantes y formatos.
        
        Args:
            text: Texto completo extraído.
            
        Returns:
            Fecha de llegada en formato encontrado.
        """
        # Buscar ETA específicamente con múltiples variantes
        eta_patterns = [
            r'ETA[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
            r'ETA[:\s]+(\d{1,2}\s+\w+\s+\d{4})',
            r'ETA[:\s]+(\d{4}[/-]\d{1,2}[/-]\d{1,2})',
            r'ETA\s*[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
            r'Estimated\s+Time\s+of\s+Arrival[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
            r'Fecha\s+de\s+Llegada[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
            r'Llegada[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
            r'Arrival[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
            r'Arribo[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
            # Buscar fechas cerca de palabras clave ETA
            r'(?:ETA|Llegada|Arrival|Arribo)[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
        ]
        
        for pattern in eta_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                fecha = match.group(1).strip()
                if fecha:
                    return fecha
        
        # Si no se encuentra ETA explícito, usar fecha de llegada genérica
        fecha_llegada = self._extract_arrival_date(text)
        if fecha_llegada:
            return fecha_llegada
        
        # Como último recurso, buscar cualquier fecha cerca de palabras clave de llegada
        llegada_keywords = ['llegada', 'arrival', 'eta', 'arribo']
        lines = text.split('\n')
        for i, line in enumerate(lines):
            line_lower = line.lower()
            for keyword in llegada_keywords:
                if keyword in line_lower:
                    # Buscar fecha en esta línea o la siguiente
                    fecha = self._extract_date(line)
                    if not fecha and i + 1 < len(lines):
                        fecha = self._extract_date(lines[i + 1])
                    if fecha:
                        return fecha
        
        return None
    
    def _extract_pol_from_context(self, text: str, vessel_info: dict) -> Optional[str]:
        """Extrae POL del contexto de una nave específica."""
        linea_nave = vessel_info['linea']
        lines = text.split('\n')
        inicio_contexto = max(0, linea_nave - 5)
        fin_contexto = min(len(lines), linea_nave + 10)
        contexto_texto = '\n'.join(lines[inicio_contexto:fin_contexto])
        return self._extract_pol(contexto_texto)
    
    def _extract_pod_from_context(self, text: str, vessel_info: dict) -> Optional[str]:
        """Extrae POD del contexto de una nave específica."""
        linea_nave = vessel_info['linea']
        lines = text.split('\n')
        inicio_contexto = max(0, linea_nave - 5)
        fin_contexto = min(len(lines), linea_nave + 10)
        contexto_texto = '\n'.join(lines[inicio_contexto:fin_contexto])
        return self._extract_pod(contexto_texto)