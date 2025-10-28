import { supabase } from '@/lib/supabase';

/**
 * Genera un REF ASLI único sin repetición
 * @returns Promise<string> - REF ASLI único (ej: A0443)
 */
export const generateUniqueRefAsli = async (): Promise<string> => {
  try {
    console.log('🔄 Obteniendo REF ASLI existentes desde Supabase...');
    
    // Obtener todos los REF ASLI existentes ordenados por número
    const { data: registros, error } = await supabase
      .from('registros')
      .select('ref_asli')
      .order('ref_asli', { ascending: true });

    if (error) {
      console.error('❌ Error obteniendo REF ASLI existentes:', error);
      console.error('📋 Detalles del error:', JSON.stringify(error, null, 2));
      throw new Error(`Error obteniendo REF ASLI existentes: ${error.message || 'Error desconocido'}`);
    }

    console.log(`✅ Conectividad con Supabase verificada. Registros encontrados: ${registros?.length || 0}`);

    // Extraer números de los REF ASLI existentes
    const numerosExistentes = new Set<number>();
    
    if (registros && registros.length > 0) {
      registros.forEach(registro => {
        const match = registro.ref_asli.match(/^A(\d+)$/i);
        if (match) {
          numerosExistentes.add(parseInt(match[1], 10));
        }
      });
    }

    // Encontrar el siguiente número disponible
    let siguienteNumero = 1;
    while (numerosExistentes.has(siguienteNumero)) {
      siguienteNumero++;
    }

    // Generar el REF ASLI con formato A0001
    const refAsli = `A${siguienteNumero.toString().padStart(4, '0')}`;
    
    console.log(`🔢 REF ASLI generado: ${refAsli} (siguiente número: ${siguienteNumero})`);
    
    return refAsli;
    
  } catch (error) {
    console.error('💥 Error generando REF ASLI único:', error);
    // Fallback: usar timestamp como número
    const timestamp = Date.now() % 10000; // Últimos 4 dígitos del timestamp
    const fallbackRefAsli = `A${timestamp.toString().padStart(4, '0')}`;
    console.log(`⚠️ Usando REF ASLI de fallback: ${fallbackRefAsli}`);
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
    console.log(`🔍 Validando REF ASLI: ${refAsli}`);
    
    const { data, error } = await supabase
      .from('registros')
      .select('id')
      .eq('ref_asli', refAsli)
      .limit(1);

    if (error) {
      console.error('❌ Error validando REF ASLI:', error);
      console.error('📋 Detalles del error:', JSON.stringify(error, null, 2));
      return false;
    }

    const isUnique = !data || data.length === 0;
    console.log(`✅ REF ASLI ${refAsli} es ${isUnique ? 'único' : 'duplicado'}`);
    return isUnique;
  } catch (error) {
    console.error('💥 Error validando REF ASLI:', error);
    return false;
  }
};

/**
 * Genera múltiples REF ASLI únicos
 * @param cantidad - Número de REF ASLI a generar
 * @returns Promise<string[]> - Array de REF ASLI únicos
 */
export const generateMultipleUniqueRefAsli = async (cantidad: number): Promise<string[]> => {
  console.log(`🔄 Generando ${cantidad} REF ASLI únicos...`);
  
  try {
    // Obtener todos los REF ASLI existentes una sola vez
    const { data: registros, error } = await supabase
      .from('registros')
      .select('ref_asli')
      .order('ref_asli', { ascending: true });

    if (error) {
      console.error('❌ Error obteniendo REF ASLI existentes:', error);
      throw new Error(`Error obteniendo REF ASLI existentes: ${error.message}`);
    }

    // Extraer números de los REF ASLI existentes
    const numerosExistentes = new Set<number>();
    
    if (registros && registros.length > 0) {
      registros.forEach(registro => {
        const match = registro.ref_asli.match(/^A(\d+)$/i);
        if (match) {
          numerosExistentes.add(parseInt(match[1], 10));
        }
      });
    }

    console.log(`📊 Números existentes encontrados:`, Array.from(numerosExistentes).slice(0, 10));

    // Generar múltiples REF ASLI únicos
    const refAsliList: string[] = [];
    let siguienteNumero = 1;
    
    for (let i = 0; i < cantidad; i++) {
      // Encontrar el siguiente número disponible
      while (numerosExistentes.has(siguienteNumero)) {
        siguienteNumero++;
      }
      
      // Generar el REF ASLI con formato A0001
      const refAsli = `A${siguienteNumero.toString().padStart(4, '0')}`;
      refAsliList.push(refAsli);
      
      // Agregar este número a la lista de existentes para evitar duplicados en la misma generación
      numerosExistentes.add(siguienteNumero);
      
      console.log(`✅ REF ASLI ${i + 1}/${cantidad}: ${refAsli}`);
      
      siguienteNumero++;
    }
    
    console.log(`🎯 REF ASLI generados:`, refAsliList);
    return refAsliList;
    
  } catch (error) {
    console.error('💥 Error generando múltiples REF ASLI:', error);
    // Fallback: generar REF ASLI basados en timestamp
    const refAsliList: string[] = [];
    const baseTimestamp = Date.now() % 10000;
    
    for (let i = 0; i < cantidad; i++) {
      const fallbackRefAsli = `A${(baseTimestamp + i).toString().padStart(4, '0')}`;
      refAsliList.push(fallbackRefAsli);
    }
    
    console.log(`⚠️ Usando REF ASLI de fallback:`, refAsliList);
    return refAsliList;
  }
};
