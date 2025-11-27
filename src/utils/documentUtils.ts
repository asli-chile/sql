export const allowedExtensions = ['pdf', 'xls', 'xlsx'];

export const sanitizeFileName = (name: string) => {
    const cleanName = name.toLowerCase().replace(/[^a-z0-9.\-]/g, '-');
    const [base, ext] = cleanName.split(/\.(?=[^.\s]+$)/);
    const safeBase = base?.replace(/-+/g, '-').replace(/^-|-$/g, '') || `archivo-${Date.now()}`;
    return `${safeBase}.${ext || 'pdf'}`;
};

export const formatFileDisplayName = (name: string) => {
    // Quitar cualquier número al inicio seguido de guiones o espacios
    // Esto elimina patrones como "0-", "123-", "0 ", etc.
    let cleaned = name.replace(/^\d+[\s_-]+/, '').trim();
    // También quitar timestamps y índices en el formato "timestamp-indice-"
    cleaned = cleaned.replace(/^\d+-\d+-/, '');
    // Reemplazar múltiples guiones bajos o guiones por espacios
    cleaned = cleaned.replace(/[_-]+/g, ' ');
    return cleaned.trim();
};

export const normalizeBooking = (value?: string | null) => (value ?? '').trim().toUpperCase();

export const normalizeTemporada = (value?: string | null): string => {
    if (!value) {
        return '';
    }
    return value.toString().replace(/^Temporada\s+/i, '').trim();
};

export const parseStoredDocumentName = (fileName: string) => {
    const separatorIndex = fileName.indexOf('__');
    if (separatorIndex === -1) {
        return { booking: null as string | null, originalName: fileName, instructivoIndex: null };
    }

    const bookingSegment = fileName.slice(0, separatorIndex);
    const rest = fileName.slice(separatorIndex + 2);

    // Buscar si hay un identificador de instructivo: instructivo-0, instructivo-1, etc.
    const instructivoMatch = rest.match(/^instructivo-(\d+)__/);
    let instructivoIndex: number | null = null;
    let originalName = rest;

    if (instructivoMatch) {
        instructivoIndex = parseInt(instructivoMatch[1], 10);
        originalName = rest.slice(instructivoMatch[0].length);
    }

    // Quitar timestamp e índice del formato "timestamp-indice-nombre" que se agrega al subir
    // Ejemplo: "1234567890-0-nombre-archivo.pdf" -> "nombre-archivo.pdf"
    originalName = originalName.replace(/^\d+-\d+-/, '');

    try {
        return {
            booking: decodeURIComponent(bookingSegment),
            originalName,
            instructivoIndex
        };
    } catch {
        return { booking: bookingSegment, originalName, instructivoIndex };
    }
};
