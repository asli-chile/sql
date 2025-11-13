import { createClient } from '@/lib/supabase-browser';

/**
 * Genera un REF ASLI único sin repetición
 * Usa una función SQL con SECURITY DEFINER para ver TODOS los registros
 * (ignora RLS para encontrar el siguiente número correcto)
 * @returns Promise<string> - REF ASLI único (ej: A0443)
 */
export const generateUniqueRefAsli = async (): Promise<string> => {
  try {
    const supabase = createClient();
    
    // Llamar a la función SQL que ve TODOS los registros (ignora RLS)
    const { data, error } = await supabase.rpc('get_next_ref_asli');

    if (error) {
      console.error('❌ Error generando REF ASLI:', error);
      console.error('📋 Detalles del error:', JSON.stringify(error, null, 2));
      console.error('⚠️ ERROR: La función SQL get_next_ref_asli no existe o hay un problema.');
      console.error('⚠️ Por favor, ejecuta el script: scripts/crear-funcion-ref-asli.sql en Supabase');
      
      // Intentar método antiguo como fallback
      const fallbackResult = await generateUniqueRefAsliFallback();
      console.warn('⚠️ IMPORTANTE: Ejecuta scripts/crear-funcion-ref-asli.sql para corregir esto');
      return fallbackResult;
    }

    const refAsli = data as string;
    
    if (!refAsli || refAsli === 'A0001') {
      console.warn('⚠️ La función devolvió A0001, esto puede indicar que no hay registros o hay un problema');
    }
    
    return refAsli;
    
  } catch (error) {
    console.error('💥 Error generando REF ASLI único:', error);
    const fallbackResult = await generateUniqueRefAsliFallback();
    console.warn('⚠️ IMPORTANTE: Ejecuta scripts/crear-funcion-ref-asli.sql para corregir esto');
    return fallbackResult;
  }
};

/**
 * Método fallback: consulta directa (puede fallar con RLS)
 */
const generateUniqueRefAsliFallback = async (): Promise<string> => {
  try {
    const supabase = createClient();
    
    const { data: registros, error } = await supabase
      .from('registros')
      .select('ref_asli')
      .order('ref_asli', { ascending: true });

    if (error) throw error;

    const numerosExistentes = new Set<number>();
    
    if (registros && registros.length > 0) {
      registros.forEach(registro => {
        const match = registro.ref_asli.match(/^A(\d+)$/i);
        if (match) {
          numerosExistentes.add(parseInt(match[1], 10));
        }
      });
    }

    let siguienteNumero = 1;
    while (numerosExistentes.has(siguienteNumero)) {
      siguienteNumero++;
    }

    const refAsli = `A${siguienteNumero.toString().padStart(4, '0')}`;
    return refAsli;
    
  } catch (error) {
    console.error('💥 Error en fallback, usando timestamp:', error);
    const timestamp = Date.now() % 10000;
    const fallbackRefAsli = `A${timestamp.toString().padStart(4, '0')}`;
    return fallbackRefAsli;
  }
};

/**
 * Valida que un REF ASLI sea único
 * @param refAsli - REF ASLI a validar
 * @returns Promise<boolean> - true si es único, false si ya existe
 */
export const validateUniqueRefAsli = async (refAsli: string): Promise<boolean> => {
  try {
    const supabase = createClient();
    
    // Usar función SQL que ve TODOS los registros
    const { data, error } = await supabase.rpc('validate_ref_asli_unique', {
      ref_asli_to_check: refAsli
    });

    if (error) {
      console.error('❌ Error validando REF ASLI:', error);
      // Fallback: validación directa
      const { data: directData, error: directError } = await supabase
        .from('registros')
        .select('id')
        .eq('ref_asli', refAsli)
        .limit(1);

      if (directError) {
        console.error('❌ Error en validación directa:', directError);
        return false;
      }

      const isUnique = !directData || directData.length === 0;
      return isUnique;
    }

    const isUnique = data as boolean;
    return isUnique;
    
  } catch (error) {
    console.error('💥 Error validando REF ASLI:', error);
    return false;
  }
};

/**
 * Genera múltiples REF ASLI únicos
 * Usa una función SQL con SECURITY DEFINER para ver TODOS los registros
 * @param cantidad - Número de REF ASLI a generar
 * @returns Promise<string[]> - Array de REF ASLI únicos
 */
export const generateMultipleUniqueRefAsli = async (cantidad: number): Promise<string[]> => {
  try {
    const supabase = createClient();
    
    // Llamar a la función SQL que ve TODOS los registros (ignora RLS)
    const { data, error } = await supabase.rpc('get_multiple_ref_asli', {
      cantidad: cantidad
    });

    if (error) {
      if ((error as any)?.code === '42P10') {
        console.warn(
          '⚠️ get_multiple_ref_asli no soportado (42P10). Usando fallback automático.'
        );
      } else {
        console.error('❌ Error generando múltiples REF ASLI:', error);
        console.error('📋 Detalles del error:', JSON.stringify(error, null, 2));
      }
      
      // Si la función no existe, intentar método antiguo como fallback
      return await generateMultipleUniqueRefAsliFallback(cantidad);
    }

    const refAsliList = data as string[];
    return refAsliList;
    
  } catch (error) {
    console.error('💥 Error generando múltiples REF ASLI:', error);
    return await generateMultipleUniqueRefAsliFallback(cantidad);
  }
};

/**
 * Método fallback: consulta directa (puede fallar con RLS)
 */
const generateMultipleUniqueRefAsliFallback = async (cantidad: number): Promise<string[]> => {
  try {
    const supabase = createClient();
    
    const { data: registros, error } = await supabase
      .from('registros')
      .select('ref_asli')
      .order('ref_asli', { ascending: true });

    if (error) throw error;

    const numerosExistentes = new Set<number>();
    
    if (registros && registros.length > 0) {
      registros.forEach(registro => {
        const match = registro.ref_asli.match(/^A(\d+)$/i);
        if (match) {
          numerosExistentes.add(parseInt(match[1], 10));
        }
      });
    }

    const refAsliList: string[] = [];
    let siguienteNumero = 1;
    
    for (let i = 0; i < cantidad; i++) {
      while (numerosExistentes.has(siguienteNumero)) {
        siguienteNumero++;
      }
      
      const refAsli = `A${siguienteNumero.toString().padStart(4, '0')}`;
      refAsliList.push(refAsli);
      numerosExistentes.add(siguienteNumero);
      siguienteNumero++;
    }
    
    return refAsliList;
    
  } catch (error) {
    console.error('💥 Error en fallback, usando timestamp:', error);
    const refAsliList: string[] = [];
    const baseTimestamp = Date.now() % 10000;
    
    for (let i = 0; i < cantidad; i++) {
      const fallbackRefAsli = `A${(baseTimestamp + i).toString().padStart(4, '0')}`;
      refAsliList.push(fallbackRefAsli);
    }
    
    return refAsliList;
  }
};
