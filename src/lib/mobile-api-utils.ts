import { supabase } from '@/lib/supabase-mobile';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * UTILIDADES PARA REEMPLAZAR APIs EN ENTORNO MÓVIL
 * Estas funciones hacen lo mismo que las APIs pero funcionan directamente en el cliente
 */

/**
 * Genera REF ASLI único (versión móvil)
 * @param count - Número de referencias a generar (default: 1)
 * @returns Promise<string | string[]> - REF ASLI único o array de REF ASLI
 */
export const generateRefAsliMobile = async (count: number = 1): Promise<string | string[]> => {
  try {
    // Llamar a la función SQL que ve TODOS los registros (ignora RLS)
    const { data, error } = await supabase.rpc('get_next_ref_asli');

    if (error) {
      console.error('❌ Error generando REF ASLI:', error);
      // Fallback: método directo
      return await generateRefAsliFallback(count);
    }

    if (count === 1) {
      return data as string;
    }

    // Para múltiples, llamar la función varias veces
    const refAsliList: string[] = [];
    for (let i = 0; i < count; i++) {
      const { data: refData, error: refError } = await supabase.rpc('get_next_ref_asli');
      if (refError) {
        console.error(`❌ Error generando REF ASLI ${i + 1}:`, refError);
        break;
      }
      refAsliList.push(refData as string);
    }

    return refAsliList;

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

    // Llamar a la función SQL personalizada
    const { data, error } = await supabase.rpc('generate_ref_externa', {
      cliente_input: cliente.trim(),
      especie_input: especie.trim(),
      count_input: count
    });

    if (error) {
      console.error('❌ Error generando REF EXTERNA:', error);
      return generateRefExternaFallback(cliente, especie, count);
    }

    if (count === 1) {
      return data as string;
    }

    return data as string[];

  } catch (error) {
    console.error('💥 Error generando REF EXTERNA móvil:', error);
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
    // Obtener registros existentes para este cliente y especie
    const { data: registros, error } = await supabase
      .from('registros')
      .select('ref_cliente')
      .ilike('shipper', `%${cliente}%`)
      .ilike('especie', `%${especie}%`)
      .not('ref_cliente', 'is', null);

    if (error) throw error;

    const refsExistentes = new Set<string>();
    if (registros && registros.length > 0) {
      registros.forEach(registro => {
        if (registro.ref_cliente) {
          refsExistentes.add(registro.ref_cliente.toLowerCase());
        }
      });
    }

    // Generar 3 letras del cliente
    const clienteLetras = cliente.substring(0, 3).toUpperCase();

    // Generar 3 letras de la especie
    const especieLetras = especie.substring(0, 3).toUpperCase();

    // Base: 2526 (año actual)
    const base = '2526';

    if (count === 1) {
      let numero = 1;
      let refExterna: string;

      do {
        refExterna = `${clienteLetras}${base}${especieLetras}${numero.toString().padStart(3, '0')}`;
        numero++;
      } while (refsExistentes.has(refExterna.toLowerCase()) && numero < 1000);

      return refExterna;
    }

    const refExternaList: string[] = [];
    let numero = 1;

    for (let i = 0; i < count; i++) {
      let refExterna: string;

      do {
        refExterna = `${clienteLetras}${base}${especieLetras}${numero.toString().padStart(3, '0')}`;
        numero++;
      } while (refsExistentes.has(refExterna.toLowerCase()) && numero < 1000);

      refExternaList.push(refExterna);
      refsExistentes.add(refExterna.toLowerCase());
    }

    return refExternaList;

  } catch (error) {
    console.error('💥 Error en fallback REF EXTERNA:', error);
    // Último fallback
    const clienteLetras = cliente.substring(0, 3).toUpperCase();
    const especieLetras = especie.substring(0, 3).toUpperCase();
    const timestamp = Date.now() % 1000;

    if (count === 1) {
      return `${clienteLetras}2526${especieLetras}${timestamp.toString().padStart(3, '0')}`;
    }

    const refExternaList: string[] = [];
    for (let i = 0; i < count; i++) {
      const refExterna = `${clienteLetras}2526${especieLetras}${(timestamp + i).toString().padStart(3, '0')}`;
      refExternaList.push(refExterna);
    }

    return refExternaList;
  }
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

    const { data, error } = await supabase
      .from('registros')
      .insert(records)
      .select();

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