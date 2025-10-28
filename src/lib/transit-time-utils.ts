// Utilidades para cálculo de tiempo de tránsito
export const calculateTransitTime = (etd: Date | string | null, eta: Date | string | null): number | null => {
  if (!etd || !eta) return null;
  
  try {
    const etdDate = typeof etd === 'string' ? new Date(etd) : etd;
    const etaDate = typeof eta === 'string' ? new Date(eta) : eta;
    
    // Verificar que las fechas sean válidas
    if (isNaN(etdDate.getTime()) || isNaN(etaDate.getTime())) {
      return null;
    }
    
    // Calcular la diferencia en milisegundos
    const diffInMs = etaDate.getTime() - etdDate.getTime();
    
    // Convertir a días (dividir por milisegundos en un día)
    const diffInDays = Math.round(diffInMs / (1000 * 60 * 60 * 24));
    
    // Retornar null si el resultado es negativo (ETA antes que ETD)
    return diffInDays >= 0 ? diffInDays : null;
  } catch (error) {
    console.error('Error calculando tiempo de tránsito:', error);
    return null;
  }
};

export const formatTransitTime = (days: number | null): string => {
  if (days === null) return '-';
  if (days === 0) return '0 días';
  if (days === 1) return '1 día';
  return `${days} días`;
};
