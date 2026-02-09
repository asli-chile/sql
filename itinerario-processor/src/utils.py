"""
Utilidades generales para el procesamiento de itinerarios.
"""
import logging
from pathlib import Path
from typing import Optional


def setup_logging(log_level: str = 'INFO', log_file: Optional[str] = None):
    """
    Configura el sistema de logging.
    
    Args:
        log_level: Nivel de logging ('DEBUG', 'INFO', 'WARNING', 'ERROR').
        log_file: Ruta opcional para archivo de log.
    """
    level = getattr(logging, log_level.upper(), logging.INFO)
    
    handlers = [logging.StreamHandler()]
    
    if log_file:
        log_path = Path(log_file)
        log_path.parent.mkdir(parents=True, exist_ok=True)
        handlers.append(logging.FileHandler(log_file))
    
    logging.basicConfig(
        level=level,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=handlers
    )


def ensure_output_dir(output_path: str) -> Path:
    """
    Asegura que el directorio de salida exista.
    
    Args:
        output_path: Ruta del archivo de salida.
        
    Returns:
        Path del directorio creado.
    """
    output_dir = Path(output_path).parent
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir
