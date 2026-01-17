/**
 * Utilidades para generar referencias externas automáticamente
 * Formato: [3 letras del cliente][2526][3 letras de especie][001]
 * Ejemplo: "FAS2526KIW001"
 */

/**
 * Genera las 3 letras del cliente según las reglas:
 * - Múltiples palabras: primeras iniciales (ej: "fruit andes sur" = "FAS")
 * - 2 palabras: primera letra de primera palabra + 2 primeras letras de segunda (ej: "san andres" = "SAN")
 * - 1 palabra: 3 primeras letras (ej: "copefrut" = "COP")
 */
export function generateClientPrefix(cliente: string): string {
  if (!cliente || cliente.trim() === '') {
    return 'XXX';
  }

  const trimmed = cliente.trim().toUpperCase();
  const words = trimmed.split(/\s+/).filter(word => word.length > 0);

  if (words.length === 0) {
    return 'XXX';
  }

  // Una sola palabra: 3 primeras letras
  if (words.length === 1) {
    return words[0].substring(0, 3).padEnd(3, 'X');
  }

  // Dos palabras: primera letra de primera palabra + 2 primeras letras de segunda
  if (words.length === 2) {
    const first = words[0].substring(0, 1);
    const second = words[1].substring(0, 2);
    return (first + second).padEnd(3, 'X');
  }

  // Tres o más palabras: primeras iniciales de cada palabra
  return words
    .map(word => word.substring(0, 1))
    .join('')
    .substring(0, 3)
    .padEnd(3, 'X');
}

/**
 * Genera las 3 primeras letras de la especie (en mayúsculas)
 */
export function generateEspeciePrefix(especie: string): string {
  if (!especie || especie.trim() === '') {
    return 'XXX';
  }
  return especie.trim().toUpperCase().substring(0, 3).padEnd(3, 'X');
}

/**
 * Genera el prefijo base de la referencia externa (sin el correlativo)
 * Formato: [3 letras cliente][2526][3 letras especie]
 */
export function generateRefExternaPrefix(cliente: string, especie: string): string {
  const clientPrefix = generateClientPrefix(cliente);
  const especiePrefix = generateEspeciePrefix(especie);
  return `${clientPrefix}2526${especiePrefix}`;
}

/**
 * Encuentra el siguiente número correlativo para un prefijo dado
 * Busca en la base de datos las referencias que empiecen con el prefijo
 * y retorna el siguiente número (001, 002, 003, etc.)
 * Garantiza que el correlativo retornado sea único
 */
export async function getNextCorrelative(
  supabase: any,
  prefix: string
): Promise<string> {
  try {
    // Buscar referencias que empiecen con el prefijo
    const { data, error } = await supabase
      .from('registros')
      .select('ref_cliente')
      .not('ref_cliente', 'is', null)
      .like('ref_cliente', `${prefix}%`)
      .order('ref_cliente', { ascending: false });

    if (error) {
      console.error('Error al buscar referencias existentes:', error);
      return '001'; // Por defecto, empezar en 001
    }

    if (!data || data.length === 0) {
      return '001';
    }

    // Extraer los números correlativos de las referencias encontradas
    const correlatives = data
      .map((record: { ref_cliente: string }) => {
        const ref = record.ref_cliente?.trim().toUpperCase();
        if (!ref || ref.length < prefix.length + 3) {
          return 0;
        }
        // Verificar que la referencia empiece exactamente con el prefijo
        if (!ref.startsWith(prefix)) {
          return 0;
        }
        const numStr = ref.substring(prefix.length);
        const num = parseInt(numStr, 10);
        return isNaN(num) ? 0 : num;
      })
      .filter((num: number) => num > 0 && num <= 999); // Limitar a 3 dígitos

    if (correlatives.length === 0) {
      return '001';
    }

    // Encontrar el máximo y sumar 1
    const maxCorrelative = Math.max(...correlatives);
    const nextCorrelative = maxCorrelative + 1;

    // Formatear con 3 dígitos (001, 002, etc.)
    return String(nextCorrelative).padStart(3, '0');
  } catch (err) {
    console.error('Error al obtener siguiente correlativo:', err);
    return '001';
  }
}

/**
 * Verifica si una referencia externa ya existe en la base de datos
 */
async function refExternaExists(
  supabase: any,
  refExterna: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('registros')
      .select('ref_cliente')
      .eq('ref_cliente', refExterna.trim().toUpperCase())
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error al verificar existencia de referencia:', error);
      return false; // Si hay error, asumir que no existe para continuar
    }

    return data !== null && data !== undefined;
  } catch (err) {
    console.error('Error al verificar existencia de referencia:', err);
    return false;
  }
}

/**
 * Genera una referencia externa completa y única
 * Formato: [3 letras cliente][2526][3 letras especie][001]
 * Garantiza que la referencia sea única verificando en la base de datos
 */
export async function generateUniqueRefExterna(
  supabase: any,
  cliente: string,
  especie: string
): Promise<string> {
  const prefix = generateRefExternaPrefix(cliente, especie);
  
  // Obtener el siguiente correlativo
  let correlative = await getNextCorrelative(supabase, prefix);
  let refExterna = `${prefix}${correlative}`;
  
  // Verificar que la referencia no exista (por si hay condición de carrera)
  // Si existe, intentar con el siguiente número hasta encontrar uno único
  let attempts = 0;
  const maxAttempts = 100; // Límite de seguridad
  
  while (await refExternaExists(supabase, refExterna) && attempts < maxAttempts) {
    const currentNum = parseInt(correlative, 10);
    if (isNaN(currentNum) || currentNum >= 999) {
      // Si llegamos al límite de 3 dígitos, empezar desde 001 con un sufijo
      correlative = '001';
      refExterna = `${prefix}${correlative}-${attempts + 1}`;
      break;
    }
    correlative = String(currentNum + 1).padStart(3, '0');
    refExterna = `${prefix}${correlative}`;
    attempts++;
  }
  
  if (attempts >= maxAttempts) {
    console.warn('No se pudo generar una referencia única después de múltiples intentos. Usando timestamp.');
    const timestamp = Date.now().toString().slice(-4);
    refExterna = `${prefix}${correlative}-${timestamp}`;
  }
  
  return refExterna;
}

/**
 * Genera múltiples referencias externas correlativas y únicas
 * Formato: [3 letras cliente][2526][3 letras especie][001], [002], [003], etc.
 * Garantiza que todas las referencias sean únicas y correlativas
 * @param supabase Cliente de Supabase
 * @param cliente Nombre del cliente
 * @param especie Nombre de la especie
 * @param count Número de referencias a generar
 * @returns Array de referencias externas correlativas
 */
export async function generateMultipleUniqueRefExterna(
  supabase: any,
  cliente: string,
  especie: string,
  count: number
): Promise<string[]> {
  if (count <= 0) {
    return [];
  }

  const prefix = generateRefExternaPrefix(cliente, especie);
  
  // Obtener el siguiente correlativo disponible
  let currentCorrelative = await getNextCorrelative(supabase, prefix);
  const refExternas: string[] = [];
  
  // Generar las referencias correlativas
  for (let i = 0; i < count; i++) {
    let refExterna = `${prefix}${currentCorrelative}`;
    let attempts = 0;
    const maxAttempts = 100;
    
    // Verificar que la referencia no exista
    while (await refExternaExists(supabase, refExterna) && attempts < maxAttempts) {
      const currentNum = parseInt(currentCorrelative, 10);
      if (isNaN(currentNum) || currentNum >= 999) {
        // Si llegamos al límite, usar timestamp como fallback
        const timestamp = Date.now().toString().slice(-4);
        refExterna = `${prefix}${currentCorrelative}-${timestamp}-${i}`;
        break;
      }
      currentCorrelative = String(currentNum + 1).padStart(3, '0');
      refExterna = `${prefix}${currentCorrelative}`;
      attempts++;
    }
    
    if (attempts >= maxAttempts) {
      // Fallback si no se puede generar
      const timestamp = Date.now().toString().slice(-4);
      refExterna = `${prefix}${currentCorrelative}-${timestamp}-${i}`;
    }
    
    refExternas.push(refExterna);
    
    // Incrementar el correlativo para la siguiente referencia
    const currentNum = parseInt(currentCorrelative, 10);
    if (!isNaN(currentNum) && currentNum < 999) {
      currentCorrelative = String(currentNum + 1).padStart(3, '0');
    } else {
      // Si llegamos al límite, usar sufijo
      currentCorrelative = '001';
    }
  }
  
  return refExternas;
}
