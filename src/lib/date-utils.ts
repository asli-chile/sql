// Utilidades para manejo de fechas con zona horaria correcta
export const parseDateString = (dateString: string): Date => {
  // Si la fecha viene en formato YYYY-MM-DD (de input type="date"), usar directamente
  if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    // Crear fecha en zona horaria local (no UTC)
    const [year, month, day] = dateString.split('-');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  
  // Si la fecha viene en formato DD-MM-YYYY, la convertimos correctamente
  if (dateString.includes('-') && dateString.split('-').length === 3) {
    const [day, month, year] = dateString.split('-');
    // Crear fecha en zona horaria local (no UTC)
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  
  // Si viene en formato ISO o cualquier otro formato, usar directamente
  return new Date(dateString);
};

export const formatDateForDisplay = (date: Date | string | null): string => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Formatear en zona horaria local
  return dateObj.toLocaleDateString('es-CL', {
    timeZone: 'America/Santiago',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

export const formatDateForInput = (date: Date | string | null): string => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Formatear para input type="date" (YYYY-MM-DD)
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};
