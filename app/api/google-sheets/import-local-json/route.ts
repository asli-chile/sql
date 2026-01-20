import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { readFileSync, existsSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { transformJsonRowToRegistro } from './transform-json-row';

const getAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY.');
  }
  return createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
};

const validateUser = async () => {
  const supabaseServer = await createServerClient();
  const { data: userData, error: userError } = await supabaseServer.auth.getUser();
  if (userError || !userData?.user?.id) {
    return { ok: false, status: 401, message: 'No autorizado.' };
  }

  const { data: perfil, error: perfilError } = await supabaseServer
    .from('usuarios')
    .select('rol')
    .eq('auth_user_id', userData.user.id)
    .maybeSingle();

  if (perfilError || !perfil?.rol) {
    return { ok: false, status: 403, message: 'No se pudo validar el rol.' };
  }

  if (perfil.rol === 'cliente') {
    return { ok: false, status: 403, message: 'Acceso restringido.' };
  }

  return { ok: true, userId: userData.user.id };
};

interface ImportLocalJsonRequest {
  fileName?: string;
  verificarDuplicados?: boolean;
  sobrescribirDuplicados?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    // Validar usuario
    const validation = await validateUser();
    if (!validation.ok) {
      return NextResponse.json({ error: validation.message }, { status: validation.status });
    }

    const body = (await request.json()) as ImportLocalJsonRequest;
    const {
      fileName = 'migra-googlesheets.json',
      verificarDuplicados = false,
      sobrescribirDuplicados = false
    } = body;

    // Leer el archivo JSON
    console.log(`Leyendo archivo JSON: ${fileName}...`);
    
    // Intentar múltiples rutas posibles
    const possiblePaths = [
      join(process.cwd(), fileName),
      resolve(process.cwd(), fileName),
    ];
    
    let filePath: string | null = null;
    console.log(`Buscando archivo en las siguientes rutas:`);
    for (const path of possiblePaths) {
      console.log(`  - ${path}`);
      if (existsSync(path)) {
        filePath = path;
        console.log(`✓ Archivo encontrado en: ${path}`);
        // Verificar el tamaño del archivo
        try {
          const stats = statSync(path);
          console.log(`  Tamaño del archivo: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
        } catch (statError) {
          console.warn(`  No se pudo obtener el tamaño del archivo:`, statError);
        }
        break;
      } else {
        console.log(`  ✗ No encontrado`);
      }
    }
    
    if (!filePath) {
      console.error('Archivo no encontrado en ninguna de las rutas:', possiblePaths);
      console.error(`Directorio actual (process.cwd()): ${process.cwd()}`);
      return NextResponse.json(
        { 
          error: `Archivo ${fileName} no encontrado`,
          details: `Buscado en: ${possiblePaths.join(', ')}. Directorio actual: ${process.cwd()}`
        },
        { status: 404 }
      );
    }
    
    let jsonData: any;
    try {
      console.log(`Leyendo archivo desde: ${filePath}`);
      
      // Verificar el tamaño del archivo antes de leerlo
      const stats = statSync(filePath);
      const fileSizeBytes = stats.size;
      const fileSizeMB = (fileSizeBytes / 1024 / 1024).toFixed(2);
      console.log(`Tamaño del archivo en disco: ${fileSizeMB} MB (${fileSizeBytes} bytes)`);
      
      if (fileSizeBytes === 0) {
        throw new Error('El archivo está vacío (0 bytes)');
      }
      
      // Leer el archivo
      const fileContent = readFileSync(filePath, 'utf-8');
      console.log(`Archivo leído en memoria, tamaño: ${(fileContent.length / 1024 / 1024).toFixed(2)} MB (${fileContent.length} caracteres)`);
      
      // Verificar que el contenido no esté vacío
      if (!fileContent || fileContent.length === 0) {
        throw new Error('El archivo está vacío después de leerlo');
      }
      
      // Verificar que el contenido tenga al menos algunos caracteres válidos
      const trimmedContent = fileContent.trim();
      if (trimmedContent.length === 0) {
        throw new Error('El archivo contiene solo espacios en blanco');
      }
      
      console.log(`Primeros 100 caracteres: ${trimmedContent.substring(0, 100)}...`);
      console.log(`Últimos 100 caracteres: ...${trimmedContent.substring(Math.max(0, trimmedContent.length - 100))}`);
      
      // Verificar que termine con } para asegurar que está completo
      if (!trimmedContent.endsWith('}')) {
        console.warn('Advertencia: El archivo JSON podría estar incompleto (no termina con })');
        // Intentar buscar el último } válido
        const lastBrace = trimmedContent.lastIndexOf('}');
        if (lastBrace > 0) {
          console.log(`Intentando parsear hasta la posición ${lastBrace}`);
        }
      }
      
      // Intentar parsear el JSON
      try {
        jsonData = JSON.parse(fileContent);
        console.log(`JSON parseado exitosamente`);
      } catch (parseError: any) {
        console.error('Error al parsear JSON:', parseError);
        console.error('Posición del error (si aplica):', parseError?.toString().match(/position (\d+)/)?.[1]);
        
        // Intentar encontrar el punto exacto del error
        if (parseError.message?.includes('Unexpected end of JSON input')) {
          throw new Error('El archivo JSON está incompleto o corrupto. Por favor, verifica que el archivo se haya exportado completamente desde Google Apps Script.');
        }
        throw parseError;
      }
    } catch (fileError: any) {
      console.error('Error leyendo archivo JSON:', fileError);
      console.error('Tipo de error:', fileError?.code);
      console.error('Mensaje:', fileError?.message);
      console.error('Stack:', fileError?.stack);
      return NextResponse.json(
        { 
          error: `Error al leer archivo JSON: ${fileError?.message || 'Error desconocido'}`,
          details: fileError?.code === 'ENOENT' ? 'El archivo no existe' : (fileError?.message || fileError?.toString())
        },
        { status: 500 }
      );
    }

    if (!jsonData.ok || !jsonData.data || !Array.isArray(jsonData.data)) {
      console.error('Formato JSON inválido:', {
        ok: jsonData.ok,
        hasData: !!jsonData.data,
        isArray: Array.isArray(jsonData.data),
        dataLength: jsonData.data?.length
      });
      return NextResponse.json(
        { error: 'El archivo JSON no tiene el formato esperado o no contiene datos', details: 'Se esperaba { ok: true, data: [...] }' },
        { status: 400 }
      );
    }

    console.log(`Se encontraron ${jsonData.data.length} filas de datos con ${jsonData.headers?.length || 0} columnas`);

    // Transformar datos
    let registrosValidos: Record<string, unknown>[] = [];
    const transportesValidos: Array<{ transporte: Record<string, unknown>; booking: string; contenedor: string }> = [];
    const registrosInvalidos: Array<{ row: number; error: string }> = [];
    const registrosDuplicados: string[] = [];

    try {
      jsonData.data.forEach((row: Record<string, string>, index: number) => {
        try {
          const rowNumber = index + 2; // +2 porque fila 1 es headers, datos empiezan en 2
          const resultado = transformJsonRowToRegistro(row, rowNumber, validation.userId);
          const registro = resultado.registro;
          const transporte = resultado.transporte;

          if (!registro) {
            registrosInvalidos.push({
              row: rowNumber,
              error: `Faltan campos críticos en fila ${rowNumber}`
            });
            return;
          }

          registrosValidos.push(registro);

          if (transporte && (transporte.conductor || transporte.rut || transporte.fono || transporte.patentes)) {
            const booking = String(registro.booking || '').trim();
            const contenedor = String(registro.contenedor || '').trim();
            if (booking || contenedor) {
              transportesValidos.push({ transporte, booking, contenedor });
            }
          }
        } catch (rowError: any) {
          console.error(`Error procesando fila ${index + 2}:`, rowError);
          registrosInvalidos.push({
            row: index + 2,
            error: `Error al procesar fila: ${rowError?.message || 'Error desconocido'}`
          });
        }
      });
    } catch (transformError: any) {
      console.error('Error durante la transformación de datos:', transformError);
      return NextResponse.json(
        { 
          error: 'Error al transformar los datos',
          details: transformError?.message || transformError?.toString()
        },
        { status: 500 }
      );
    }

    console.log(`Registros válidos: ${registrosValidos.length}`);
    console.log(`Registros inválidos: ${registrosInvalidos.length}`);

    // Verificar duplicados si se solicita
    if (verificarDuplicados && registrosValidos.length > 0) {
      const adminClient = getAdminClient();
      const refAslis = registrosValidos.map(r => r.ref_asli as string);

      const { data: existentes } = await adminClient
        .from('registros')
        .select('ref_asli')
        .in('ref_asli', refAslis);

      const refAslisExistentes = new Set((existentes || []).map(e => e.ref_asli));

      if (sobrescribirDuplicados) {
        const paraInsertar = registrosValidos.filter(r => !refAslisExistentes.has(r.ref_asli as string));
        const paraActualizar = registrosValidos.filter(r => refAslisExistentes.has(r.ref_asli as string));

        if (paraActualizar.length > 0) {
          let actualizados = 0;
          for (const registro of paraActualizar) {
            const { error: updateError } = await adminClient
              .from('registros')
              .update(registro)
              .eq('ref_asli', registro.ref_asli);

            if (!updateError) {
              actualizados++;
            }
          }

          console.log(`Registros actualizados: ${actualizados}`);
          registrosDuplicados.push(...paraActualizar.map(r => r.ref_asli as string));
          registrosValidos = paraInsertar;
        }
      } else {
        const paraInsertar = registrosValidos.filter(r => !refAslisExistentes.has(r.ref_asli as string));
        const duplicados = registrosValidos.filter(r => refAslisExistentes.has(r.ref_asli as string));
        registrosDuplicados.push(...duplicados.map(r => r.ref_asli as string));
        registrosValidos = paraInsertar;
      }
    }

    // Insertar en lotes
    const adminClient = getAdminClient();
    const BATCH_SIZE = 100;
    const registrosInsertados: Record<string, unknown>[] = [];
    const errores: Array<{ row: number; error: string }> = [];

    for (let i = 0; i < registrosValidos.length; i += BATCH_SIZE) {
      const lote = registrosValidos.slice(i, i + BATCH_SIZE);

      try {
        const { data, error: insertError } = await adminClient
          .from('registros')
          .insert(lote)
          .select();

        if (insertError) {
          console.error(`Error insertando lote ${Math.floor(i / BATCH_SIZE) + 1}:`, insertError);
          errores.push({
            row: i + 1,
            error: insertError.message
          });
        } else {
          registrosInsertados.push(...(data || []));
          console.log(`Lote ${Math.floor(i / BATCH_SIZE) + 1} insertado: ${data?.length || 0} registros`);
        }
      } catch (error: any) {
        console.error(`Error inesperado en lote ${Math.floor(i / BATCH_SIZE) + 1}:`, error);
        errores.push({
          row: i + 1,
          error: error?.message || 'Error inesperado'
        });
      }
    }

    // Procesar transportes
    let transportesProcesados = 0;
    const transportesErrores: Array<{ booking: string; error: string }> = [];

    if (transportesValidos.length > 0) {
      console.log(`\nProcesando ${transportesValidos.length} registros de transporte...`);
      
      for (const item of transportesValidos) {
        try {
          const { data: transporteExistente, error: selectError } = await adminClient
            .from('transportes')
            .select('id')
            .eq('booking', item.booking)
            .eq('contenedor', item.contenedor)
            .limit(1)
            .maybeSingle();

          if (selectError && selectError.code !== 'PGRST116') {
            transportesErrores.push({ booking: item.booking, error: selectError.message });
            continue;
          }

          if (transporteExistente) {
            const { error: updateError } = await adminClient
              .from('transportes')
              .update(item.transporte)
              .eq('id', transporteExistente.id);

            if (!updateError) {
              transportesProcesados++;
            } else {
              transportesErrores.push({ booking: item.booking, error: updateError.message });
            }
          } else {
            const transporteData = {
              ...item.transporte,
              booking: item.booking || null,
              contenedor: item.contenedor || null
            };

            const { error: insertError } = await adminClient
              .from('transportes')
              .insert([transporteData]);

            if (!insertError) {
              transportesProcesados++;
            } else {
              transportesErrores.push({ booking: item.booking, error: insertError.message });
            }
          }
        } catch (error: any) {
          console.error(`Error procesando transporte para booking ${item.booking}:`, error);
          transportesErrores.push({ booking: item.booking, error: error?.message || 'Error inesperado' });
        }
      }
    }

    // Estadísticas
    const total = jsonData.data.length;
    const exitosos = registrosInsertados.length;
    const fallidos = errores.length + registrosInvalidos.length;

    console.log(`\n=== Resumen de importación ===`);
    console.log(`Total de filas procesadas: ${total}`);
    console.log(`Registros insertados exitosamente: ${exitosos}`);
    console.log(`Registros fallidos: ${fallidos}`);
    console.log(`Registros duplicados: ${registrosDuplicados.length}`);
    console.log(`Registros inválidos: ${registrosInvalidos.length}`);
    console.log(`Transportes procesados: ${transportesProcesados}`);

    return NextResponse.json({
      ok: true,
      resumen: {
        total,
        exitosos,
        fallidos,
        duplicados: registrosDuplicados.length,
        invalidos: registrosInvalidos.length,
        transportes: transportesProcesados
      },
      detalles: {
        registrosInsertados: exitosos,
        registrosDuplicados,
        registrosInvalidos: registrosInvalidos.slice(0, 50),
        errores: errores.slice(0, 50),
        transportesErrores: transportesErrores.slice(0, 50)
      }
    });
  } catch (error: any) {
    console.error('Error en importación:', error);
    console.error('Stack:', error?.stack);
    return NextResponse.json(
      { 
        error: error?.message || 'Error inesperado al importar', 
        details: error?.toString(),
        stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    );
  }
}
