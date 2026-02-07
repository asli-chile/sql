import { supabase } from '@/lib/supabase-mobile';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * UTILIDADES PARA REEMPLAZAR APIs EN ENTORNO MÓVIL
 * Estas funciones hacen lo mismo que las APIs pero funcionan directamente en el cliente
 */

// Cliente Supabase que se puede sobreescribir (para versión web)
let supabaseClient: SupabaseClient = supabase;

/**
 * Establece el cliente Supabase a usar (para compatibilidad web/móvil)
 */
export function setSupabaseClient(client: SupabaseClient) {
  supabaseClient = client;
}

/**
 * Genera REF ASLI único (versión móvil)
 * @param count - Número de referencias a generar (default: 1)
 * @returns Promise<string | string[]> - REF ASLI único o array de REF ASLI
 */
export const generateRefAsliMobile = async (count: number = 1): Promise<string | string[]> => {
  try {
    if (count === 1) {
      // Para un solo REF ASLI, usar la función simple
      const { data, error } = await supabaseClient.rpc('get_next_ref_asli');

      if (error) {
        console.error('❌ Error generando REF ASLI:', error);
        // Fallback: método directo
        return await generateRefAsliFallback(count);
      }

      return data as string;
    }

    // Para múltiples, SIEMPRE intentar primero la función optimizada que genera todos de una vez
    try {
      const { data: multipleData, error: multipleError } = await supabaseClient.rpc('get_multiple_ref_asli', {
        cantidad: count
      });

      if (!multipleError && multipleData && Array.isArray(multipleData) && multipleData.length === count) {
        // Verificar que todos sean únicos
        const uniqueSet = new Set(multipleData);
        if (uniqueSet.size === count) {
          console.log(`✅ Generados ${count} REF ASLI usando get_multiple_ref_asli`);
          return multipleData;
        } else {
          console.warn('⚠️ La función devolvió REF ASLI duplicados, usando fallback');
        }
      } else if (multipleError) {
        console.warn('⚠️ Error usando get_multiple_ref_asli, usando fallback:', multipleError);
      }
    } catch (multipleError) {
      console.warn('⚠️ Excepción usando get_multiple_ref_asli, usando fallback:', multipleError);
    }

    // Fallback optimizado: usar el método que consulta la tabla una sola vez
    // Este método es mucho más rápido que las llamadas secuenciales
    console.log(`📋 Usando método fallback para generar ${count} REF ASLI`);
    return await generateRefAsliFallback(count);

  } catch (error) {
    console.error('💥 Error generando REF ASLI móvil:', error);
    return generateRefAsliFallback(count);
  }
};

/**
 * Método fallback para generar REF ASLI
 */
const generateRefAsliFallback = async (count: number): Promise<string | string[]> => {
  try {
    const { data: registros, error } = await supabase
      .from('registros')
      .select('ref_asli')
      .order('ref_asli', { ascending: true });

    if (error) throw error;

    const numerosExistentes = new Set<number>();

    if (registros && registros.length > 0) {
      registros.forEach(registro => {
        const match = registro.ref_asli?.match(/^A(\d+)$/i);
        if (match) {
          numerosExistentes.add(parseInt(match[1], 10));
        }
      });
    }

    if (count === 1) {
      let siguienteNumero = 1;
      while (numerosExistentes.has(siguienteNumero)) {
        siguienteNumero++;
      }
      return `A${siguienteNumero.toString().padStart(4, '0')}`;
    }

    const refAsliList: string[] = [];
    let siguienteNumero = 1;

    for (let i = 0; i < count; i++) {
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
    console.error('💥 Error en fallback REF ASLI:', error);
    // Último fallback con timestamp
    if (count === 1) {
      const timestamp = Date.now() % 10000;
      return `A${timestamp.toString().padStart(4, '0')}`;
    }

    const refAsliList: string[] = [];
    const baseTimestamp = Date.now() % 10000;

    for (let i = 0; i < count; i++) {
      const fallbackRefAsli = `A${(baseTimestamp + i).toString().padStart(4, '0')}`;
      refAsliList.push(fallbackRefAsli);
    }

    return refAsliList;
  }
};

/**
 * Genera referencia externa única (versión móvil)
 * @param cliente - Nombre del cliente
 * @param especie - Nombre de la especie
 * @param count - Número de referencias a generar (default: 1)
 * @returns Promise<string | string[]> - Referencia externa única
 */
export const generateRefExternaMobile = async (
  cliente: string,
  especie: string,
  count: number = 1
): Promise<string | string[]> => {
  try {
    if (!cliente?.trim() || !especie?.trim()) {
      throw new Error('Cliente y especie son obligatorios');
    }

    console.log('🔍 Intentando generar REF EXTERNA:', { cliente, especie, count });

    // Llamar a la función SQL personalizada
    const { data, error } = await supabase.rpc('generate_ref_externa', {
      cliente_input: cliente.trim(),
      especie_input: especie.trim(),
      count_input: count
    });

    console.log('📊 Resultado RPC:', { data, error });

    if (error) {
      // Silenciar error de REF EXTERNA ya que el fallback maneja el caso
      console.log('🔄 RPC no disponible, usando fallback para REF EXTERNA...');
      return generateRefExternaFallback(cliente, especie, count);
    }

    if (!data) {
      console.log('⚠️ RPC devolvió data vacía, usando fallback');
      return generateRefExternaFallback(cliente, especie, count);
    }

    if (count === 1) {
      return data as string;
    }

    return data as string[];

  } catch (error) {
    console.error('💥 Error generando REF EXTERNA móvil:', error);
    console.log('🔄 Usando fallback por excepción...');
    return generateRefExternaFallback(cliente, especie, count);
  }
};

/**
 * Método fallback para generar referencia externa
 */
const generateRefExternaFallback = async (
  cliente: string,
  especie: string,
  count: number
): Promise<string | string[]> => {
  try {
    // Generar 3 letras del cliente
    const clienteLetras = cliente.substring(0, 3).toUpperCase();

    // Generar 3 letras de la especie
    const especieLetras = especie.substring(0, 3).toUpperCase();

    // Base: 2526 (año actual)
    const base = '2526';

    // Generar prefijo base
    const prefix = `${clienteLetras}${base}${especieLetras}`;

    // Buscar referencias existentes para este cliente y especie
    // Solo necesitamos ref_cliente, no todos los campos
    const { data: registros, error } = await supabaseClient
      .from('registros')
      .select('ref_cliente')
      .ilike('shipper', `%${cliente}%`)
      .ilike('especie', `%${especie}%`)
      .limit(100); // Aumentar límite para mejor cobertura, pero solo seleccionar ref_cliente

    if (error) {
      console.error('Error buscando referencias existentes:', error);
      // Si hay error, usar timestamp como último recurso
      return generateTimestampFallback(cliente, especie, count);
    }

    const numerosExistentes = new Set<number>();
    if (registros && registros.length > 0) {
      registros.forEach(registro => {
        if (registro.ref_cliente) {
          // Extraer el número correlativo del final
          const ref = registro.ref_cliente.trim();
          const match = ref.match(new RegExp(`^${prefix}(\\d+)$`));
          if (match) {
            numerosExistentes.add(parseInt(match[1], 10));
          }
        }
      });
    }

    if (count === 1) {
      // Si no hay referencias existentes, empezar desde 001
      if (numerosExistentes.size === 0) {
        return `${prefix}001`;
      }
      
      let siguienteNumero = 1;
      while (numerosExistentes.has(siguienteNumero)) {
        siguienteNumero++;
      }
      return `${prefix}${siguienteNumero.toString().padStart(3, '0')}`;
    }

    const refExternaList: string[] = [];
    let siguienteNumero = 1;

    for (let i = 0; i < count; i++) {
      while (numerosExistentes.has(siguienteNumero)) {
        siguienteNumero++;
      }

      const refExterna = `${prefix}${siguienteNumero.toString().padStart(3, '0')}`;
      refExternaList.push(refExterna);
      numerosExistentes.add(siguienteNumero);
      siguienteNumero++;
    }

    return refExternaList;

  } catch (error) {
    console.error('💥 Error en fallback REF EXTERNA:', error);
    // Último recurso: usar timestamp
    return generateTimestampFallback(cliente, especie, count);
  }
};

/**
 * Último recurso: generar con timestamp
 */
const generateTimestampFallback = (
  cliente: string,
  especie: string,
  count: number
): string | string[] => {
  const clienteLetras = cliente.substring(0, 3).toUpperCase();
  const especieLetras = especie.substring(0, 3).toUpperCase();
  const base = '2526';
  const timestamp = Date.now() % 1000;

  if (count === 1) {
    return `${clienteLetras}${base}${especieLetras}${timestamp.toString().padStart(3, '0')}`;
  }

  const refExternaList: string[] = [];
  for (let i = 0; i < count; i++) {
    const refExterna = `${clienteLetras}${base}${especieLetras}${(timestamp + i).toString().padStart(3, '0')}`;
    refExternaList.push(refExterna);
  }
  return refExternaList;
};

/**
 * Crea registros en la base de datos (versión móvil)
 * @param records - Array de registros a insertar
 * @returns Promise<any> - Resultado de la inserción
 */
export const createRegistrosMobile = async (records: Record<string, unknown>[]): Promise<any> => {
  try {
    if (!Array.isArray(records) || records.length === 0) {
      throw new Error('No hay registros para crear');
    }

    // Verificar si el usuario está autenticado
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Usuario no autenticado. Por favor inicia sesión nuevamente.');
    }

    console.log('🔍 Usuario autenticado:', user.email);
    console.log('🔍 Intentando insertar registros:', JSON.stringify(records, null, 2));

    const { data, error } = await supabaseClient
      .from('registros')
      .insert(records)
      .select();

    console.log('📊 Resultado inserción:', { data, error });

    if (error) {
      console.error('❌ Error creando registros:', error);
      throw new Error(error.message);
    }

    return { records: data ?? [] };

  } catch (error: any) {
    console.error('💥 Error creando registros móvil:', error);
    throw new Error(error?.message || 'Error creando registros');
  }
};

/**
 * Actualiza catálogos (versión móvil)
 * @param categoria - Nombre de la categoría
 * @param valor - Valor a agregar
 */
export const upsertCatalogValueMobile = async (
  categoria: string,
  valor: string | null | undefined
): Promise<void> => {
  const trimmed = (valor || '').trim();
  if (!trimmed) return;

  try {
    const { data, error } = await supabase
      .from('catalogos')
      .select('id, valores')
      .eq('categoria', categoria)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error(`Error leyendo catálogo ${categoria}:`, error);
      return;
    }

    let valores: string[] = [];
    let recordId: string | undefined;

    if (data) {
      recordId = (data as any).id;
      valores = Array.isArray(data.valores) ? data.valores : [];
    }

    const exists = valores.some(
      (entry) => entry.trim().toLowerCase() === trimmed.toLowerCase()
    );

    if (!exists) {
      const nuevosValores = [...valores, trimmed];
      const payload = {
        categoria,
        valores: nuevosValores,
        updated_at: new Date().toISOString(),
      };

      if (recordId) {
        await supabase
          .from('catalogos')
          .update(payload)
          .eq('id', recordId);
      } else {
        await supabase
          .from('catalogos')
          .insert({ ...payload, created_at: new Date().toISOString() });
      }
    }
  } catch (catalogError) {
    console.error(`Error actualizando catálogo ${categoria}:`, catalogError);
  }
};

/**
 * Actualiza mapeo de naves (versión móvil)
 * @param naviera - Nombre de la naviera
 * @param nave - Nombre de la nave
 */
export const upsertNaveMappingMobile = async (naviera: string, nave: string): Promise<void> => {
  const navieraTrimmed = (naviera || '').trim();
  const naveTrimmed = (nave || '').trim();

  if (!navieraTrimmed || !naveTrimmed) return;

  const sanitizedNave = naveTrimmed.replace(/\s*\[.*\]$/, '').trim();
  if (!sanitizedNave) return;

  const isConsorcio = navieraTrimmed.includes('/');
  const categoria = isConsorcio ? 'consorciosNavesMapping' : 'navierasNavesMapping';

  try {
    const { data, error } = await supabase
      .from('catalogos')
      .select('id, mapping')
      .eq('categoria', categoria)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error(`Error leyendo mapeo ${categoria}:`, error);
      return;
    }

    const currentMapping: Record<string, string[]> =
      data?.mapping && typeof data.mapping === 'object' ? data.mapping : {};

    const existingList = (currentMapping[navieraTrimmed] || []).map((item: string) => item.trim().toLowerCase());

    if (existingList.includes(sanitizedNave.toLowerCase())) {
      return;
    }

    const updatedList = Array.from(
      new Set([...(currentMapping[navieraTrimmed] || []), sanitizedNave].map((item: string) => item.trim()))
    );

    const updatedMapping = {
      ...currentMapping,
      [navieraTrimmed]: updatedList,
    };

    const timestamp = new Date().toISOString();

    if (data?.id) {
      await supabase
        .from('catalogos')
        .update({
          mapping: updatedMapping,
          updated_at: timestamp,
        })
        .eq('id', data.id);
    } else {
      await supabase
        .from('catalogos')
        .insert({
          categoria,
          valores: [],
          mapping: updatedMapping,
          created_at: timestamp,
          updated_at: timestamp,
        });
    }
  } catch (mappingError) {
    console.error(`Error actualizando mapeo ${categoria}:`, mappingError);
  }
};