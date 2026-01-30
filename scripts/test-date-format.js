/**
 * Script para probar el formato de fecha DD/MM/AAAA HH:MM
 * Simula la lógica de formatDisplayValue para datetime
 */

function formatDisplayValue(val, isDateTimeField = true) {
    if (val === null || val === undefined || val === '') {
        return '—';
    }

    if (isDateTimeField && typeof val === 'string') {
        // Para campos datetime, formatear a DD/MM/YYYY HH:MM
        let date;
        
        // Intentar parsear diferentes formatos
        if (val.includes('T')) {
            // Formato ISO: 2024-01-15T14:30:00.000Z
            date = new Date(val);
        } else if (val.includes(' ')) {
            // Formato "YYYY-MM-DD HH:MM"
            date = new Date(val.replace(' ', 'T'));
        } else {
            // Otro formato, intentar directamente
            date = new Date(val);
        }
        
        if (!isNaN(date.getTime())) {
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${day}/${month}/${year} ${hours}:${minutes}`;
        }
    }

    return String(val);
}

// Casos de prueba
console.log('🧪 Probando formato de fecha DD/MM/AAAA HH:MM\n');

const testCases = [
    '2024-01-15T14:30:00.000Z',    // ISO format
    '2024-01-15 14:30',            // Space format
    '2024-01-15T14:30',            // ISO sin segundos
    '2024-01-15',                  // Solo fecha
    null,                          // Nulo
    '',                            // Vacío
    'invalid-date',               // Inválido
];

testCases.forEach((testCase, index) => {
    const result = formatDisplayValue(testCase);
    console.log(`${index + 1}. Input: ${testCase} → Output: ${result}`);
});

console.log('\n✅ Prueba completada');
