import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase-server';
import {
  createSheetsClient,
  getSpreadsheetId,
  readSheetData,
  transformSheetRowToRegistro,
  handleGoogleError
} from '@/lib/googleSheets';

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
    .single();

  if (perfilError || !perfil?.rol) {
    return { ok: false, status: 403, message: 'No se pudo validar el rol.' };
  }

  if (perfil.rol === 'cliente') {
    return { ok: false, status: 403, message: 'Acceso restringido.' };
  }

  return { ok: true, userId: userData.user.id };
};

interface ImportRequest {
  spreadsheetId?: string;
  sheetName: string;
  startRow?: number;
  endRow?: number;
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

    const body = (await request.json()) as ImportRequest;
    const {
      spreadsheetId: customSpreadsheetId,
      sheetName,
      startRow = 1,
      endRow = 646,
      verificarDuplicados = false,
      sobrescribirDuplicados = false
    } = body;

    if (!sheetName || sheetName.trim() === '') {
      return NextResponse.json(
        { error: 'Debes proporcionar el nombre de la hoja a importar.' },
        { status: 400 }
      );
    }

    // Obtener spreadsheet ID
    let spreadsheetId: string;
    try {
      spreadsheetId = customSpreadsheetId || getSpreadsheetId();
    } catch (spreadsheetError: any) {
      console.error('Error obteniendo Spreadsheet ID:', spreadsheetError);
      return NextResponse.json(
        { error: `Error de configuración: ${spreadsheetError?.message || 'Spreadsheet ID no configurado'}` },
        { status: 500 }
      );
    }

    // Crear cliente de Google Sheets
    let sheets: any;
    try {
      sheets = await createSheetsClient();
    } catch (sheetsError: any) {
      console.error('Error creando cliente de Google Sheets:', sheetsError);
      return NextResponse.json(
        { error: `Error de autenticación con Google Sheets: ${sheetsError?.message || 'Verifica las variables de entorno GOOGLE_SERVICE_ACCOUNT_EMAIL y GOOGLE_SERVICE_ACCOUNT_KEY'}` },
        { status: 500 }
      );
    }

    // Leer datos de la hoja (fila 1 = headers, filas 2-646 = datos)
    console.log(`Leyendo datos de la hoja "${sheetName}" (filas ${startRow}-${endRow})...`);
    console.log(`Spreadsheet ID: ${spreadsheetId}`);
    
    let headers: string[] = [];
    let rows: string[][] = [];
    
    try {
      const result = await readSheetData(sheets, spreadsheetId, sheetName, startRow, endRow);
      headers = result.headers;
      rows = result.rows;
    } catch (readError: any) {
      console.error('Error leyendo datos de Sheets:', readError);
      return NextResponse.json(
        { 
          error: `Error al leer datos de Google Sheets: ${readError?.message || 'Error desconocido'}`,
          details: readError?.toString()
        },
        { status: 500 }
      );
    }

    console.log(`Se encontraron ${rows.length} filas de datos con ${headers.length} columnas`);

    // Transformar filas a registros válidos
    let registrosValidos: Record<string, unknown>[] = [];
    const transportesValidos: Array<{ transporte: Record<string, unknown>; booking: string; contenedor: string }> = [];
    const registrosInvalidos: Array<{ row: number; error: string }> = [];
    const registrosDuplicados: string[] = [];

    rows.forEach((row, index) => {
      const rowNumber = startRow + index + 1; // +1 porque headers es la fila 1, datos empiezan en 2
      const resultado = transformSheetRowToRegistro(headers, row, rowNumber);
      const registro = resultado.registro;
      const transporte = resultado.transporte;

      if (!registro) {
        registrosInvalidos.push({
          row: rowNumber,
          error: 'Faltan campos obligatorios o datos inválidos'
        });
        return;
      }

      registrosValidos.push(registro);

      // Guardar datos de transporte para procesar después
      if (transporte && (transporte.conductor || transporte.rut || transporte.fono || transporte.patentes)) {
        const booking = String(registro.booking || '').trim();
        const contenedor = String(registro.contenedor || '').trim();
        if (booking || contenedor) {
          transportesValidos.push({
            transporte,
            booking,
            contenedor
          });
        }
      }
    });

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
        // Filtrar duplicados para actualización
        const paraInsertar = registrosValidos.filter(r => !refAslisExistentes.has(r.ref_asli as string));
        const paraActualizar = registrosValidos.filter(r => refAslisExistentes.has(r.ref_asli as string));

        if (paraActualizar.length > 0) {
          // Actualizar registros existentes (uno por uno porque Supabase no tiene upsert masivo fácil)
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

          // Usar solo los no duplicados para inserción
          registrosValidos.length = 0;
          registrosValidos.push(...paraInsertar);
        }
      } else {
        // Filtrar duplicados - solo insertar los que no existen
        const paraInsertar = registrosValidos.filter(r => !refAslisExistentes.has(r.ref_asli as string));
        const duplicados = registrosValidos.filter(r => refAslisExistentes.has(r.ref_asli as string));
        registrosDuplicados.push(...duplicados.map(r => r.ref_asli as string));
        registrosValidos = paraInsertar;
      }
    }

    // Insertar en lotes de 100 para evitar timeouts
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

    // Procesar transportes si hay datos
    let transportesProcesados = 0;
    const transportesErrores: Array<{ booking: string; error: string }> = [];

    if (transportesValidos.length > 0) {
      console.log(`\nProcesando ${transportesValidos.length} registros de transporte...`);
      
      for (const item of transportesValidos) {
        try {
          // Buscar o crear registro de transporte basándose en booking y contenedor
          const { data: transporteExistente } = await adminClient
            .from('transportes')
            .select('id')
            .eq('booking', item.booking)
            .eq('contenedor', item.contenedor)
            .limit(1)
            .single();

          if (transporteExistente) {
            // Actualizar transporte existente
            const { error: updateError } = await adminClient
              .from('transportes')
              .update(item.transporte)
              .eq('id', transporteExistente.id);

            if (!updateError) {
              transportesProcesados++;
            } else {
              transportesErrores.push({
                booking: item.booking,
                error: updateError.message
              });
            }
          } else {
            // Insertar nuevo transporte
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
              transportesErrores.push({
                booking: item.booking,
                error: insertError.message
              });
            }
          }
        } catch (error: any) {
          transportesErrores.push({
            booking: item.booking,
            error: error?.message || 'Error inesperado'
          });
        }
      }
    }

    // Calcular estadísticas finales
    const total = rows.length;
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
        registrosInvalidos: registrosInvalidos.slice(0, 50), // Limitar a 50 para no sobrecargar la respuesta
        errores: errores.slice(0, 50),
        transportesErrores: transportesErrores.slice(0, 50)
      }
    });
  } catch (error: any) {
    console.error('Error en importación:', error);
    return handleGoogleError(error);
  }
}
