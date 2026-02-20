import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BANCO_CENTRAL_API_URL = 'https://si3.bcentral.cl/SieteRestWS/SieteRestWS.ashx';

// Series Banco Central de Chile
const SERIES: Record<string, string> = {
  dolar: 'F073.TCO.PRE.Z.D',   // Dólar observado
  euro: 'F074.TCO.PRE.Z.D',    // Euro observado
  uf: 'F000.TOT.SV.CLS.UF.D',  // UF
  utm: 'F000.TOT.SV.CLS.UTM.M', // UTM
  // IPC general, variación mensual (serie vigente base 2023)
  ipc: 'G073.IPC.VAR.2023.M',
};

/**
 * Verifica si una fecha es día hábil (lunes a viernes)
 */
function esDiaHabil(fecha: Date): boolean {
  const diaSemana = fecha.getDay(); // 0 = domingo, 1 = lunes, ..., 6 = sábado
  return diaSemana >= 1 && diaSemana <= 5; // Lunes a Viernes
}

/**
 * Encuentra el primer día hábil anterior a una fecha (incluyendo la fecha misma si es hábil)
 */
function encontrarPrimerDiaHabilAnterior(fecha: Date): Date {
  let fechaActual = new Date(fecha);
  
  // Buscar hacia atrás hasta encontrar un día hábil (máximo 30 días para cubrir feriados)
  for (let i = 0; i <= 30; i++) {
    if (esDiaHabil(fechaActual)) {
      return fechaActual;
    }
    // Si no es hábil, retroceder un día
    fechaActual.setDate(fechaActual.getDate() - 1);
  }
  
  // Si no se encuentra (no debería pasar), retornar la fecha original
  return fecha;
}

/**
 * Formatea una fecha a YYYY-MM-DD
 */
function formatearFecha(fecha: Date): string {
  const año = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${año}-${mes}-${dia}`;
}

interface BancoCentralResponse {
  Codigo: number;
  Descripcion: string;
  Series: {
    descripEsp: string;
    descripIng: string;
    seriesId: string;
    Obs: Array<{
      indexDateString: string;
      value: string;
      statusCode: string;
    }>;
  };
  SeriesInfos: any[];
}

/**
 * Obtiene el tipo de cambio USD/CLP del Banco Central para una fecha específica
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const fecha = searchParams.get('fecha'); // Formato: YYYY-MM-DD
    const indicador = (searchParams.get('indicador') || searchParams.get('moneda') || 'dolar').toLowerCase();
    const SERIE_TIPO_CAMBIO = SERIES[indicador] || SERIES.dolar;

    if (!fecha) {
      return NextResponse.json(
        { error: 'Parámetro "fecha" es requerido (formato: YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    // Validar formato de fecha
    const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!fechaRegex.test(fecha)) {
      return NextResponse.json(
        { error: 'Formato de fecha inválido. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // Validar que la fecha no sea futura
    const fechaObj = new Date(fecha + 'T00:00:00');
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    if (fechaObj > hoy) {
      console.warn(`⚠️ Fecha futura solicitada: ${fecha}`);
      return NextResponse.json(
        { 
          error: 'No se puede consultar el tipo de cambio para fechas futuras',
          fecha,
          fechaActual: hoy.toISOString().split('T')[0]
        },
        { status: 400 }
      );
    }

    // Obtener credenciales de variables de entorno
    const user = process.env.BANCO_CENTRAL_USER;
    const pass = process.env.BANCO_CENTRAL_PASS;

    // Logging para debugging (sin mostrar valores completos por seguridad)
    console.log('🔍 Verificando variables de entorno:', {
      hasUser: !!user,
      hasPass: !!pass,
      userLength: user?.length || 0,
      passLength: pass?.length || 0,
      nodeEnv: process.env.NODE_ENV,
    });

    if (!user || !pass) {
      console.error('❌ Credenciales del Banco Central no configuradas');
      console.error('Variables disponibles que contienen "BANCO":', 
        Object.keys(process.env).filter(k => k.includes('BANCO')).join(', ') || 'NINGUNA'
      );
      return NextResponse.json(
        { 
          error: 'Credenciales del Banco Central no configuradas en el servidor',
          debug: {
            hasUser: !!user,
            hasPass: !!pass,
            hint: 'Verifica que BANCO_CENTRAL_USER y BANCO_CENTRAL_PASS estén en .env.local y reinicia el servidor'
          }
        },
        { status: 500 }
      );
    }

    // Función auxiliar para consultar el Banco Central para un rango de fechas
    const consultarBancoCentralRango = async (firstdate: string, lastdate: string): Promise<{ data: BancoCentralResponse | null; error: string | null }> => {
      const url = new URL(BANCO_CENTRAL_API_URL);
      url.searchParams.set('user', user);
      url.searchParams.set('pass', pass);
      url.searchParams.set('function', 'GetSeries');
      url.searchParams.set('timeseries', SERIE_TIPO_CAMBIO);
      url.searchParams.set('firstdate', firstdate);
      url.searchParams.set('lastdate', lastdate);

      try {
        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          return { data: null, error: `HTTP ${response.status}` };
        }

        const responseText = await response.text();
        const data: BancoCentralResponse = JSON.parse(responseText);

        if (data.Codigo !== 0) {
          return { data: null, error: data.Descripcion };
        }

        if (!data.Series || !data.Series.Obs || data.Series.Obs.length === 0) {
          return { data: null, error: 'No hay observaciones disponibles' };
        }

        return { data, error: null };
      } catch (error: any) {
        return { data: null, error: error.message || 'Error desconocido' };
      }
    };

    // IPC es mensual: consultar rango amplio para obtener el último dato disponible
    if (indicador === 'ipc') {
      const fechaOriginal = new Date(fechaObj);
      const desde = new Date(fechaObj);
      desde.setDate(desde.getDate() - 120); // ~4 meses
      const resultadoIpc = await consultarBancoCentralRango(formatearFecha(desde), formatearFecha(fechaObj));

      if (!resultadoIpc.data?.Series?.Obs?.length) {
        return NextResponse.json({
          fecha,
          tipoCambio: 0,
          valor: 0,
          indicador,
          moneda: indicador,
          fechaObservacion: null,
          sinDatos: true,
        });
      }

      const obsValidas = resultadoIpc.data.Series.Obs.filter((o) => o?.value && o.value !== 'NeuN');
      const ultima = obsValidas[obsValidas.length - 1];
      const anterior = obsValidas.length > 1 ? obsValidas[obsValidas.length - 2] : null;
      const valorIpc = Number(ultima?.value);
      if (!ultima || Number.isNaN(valorIpc)) {
        return NextResponse.json({
          fecha,
          tipoCambio: 0,
          valor: 0,
          indicador,
          moneda: indicador,
          fechaObservacion: null,
          sinDatos: true,
        });
      }

      return NextResponse.json({
        fecha,
        tipoCambio: valorIpc,
        valor: valorIpc,
        indicador,
        moneda: indicador,
        fechaObservacion: ultima.indexDateString,
        fechaUtilizada: ultima.indexDateString,
        valorAnterior: anterior ? Number(anterior.value) : null,
        fechaAnterior: anterior?.indexDateString ?? null,
        esDiaHabil: esDiaHabil(fechaOriginal),
        serie: SERIE_TIPO_CAMBIO,
      });
    }

    // Intentar primero con la fecha solicitada
    const fechaOriginal = new Date(fechaObj);
    let fechaBusqueda = new Date(fechaOriginal);
    let fechaConsulta = formatearFecha(fechaBusqueda);
    let resultado = await consultarBancoCentralRango(fechaConsulta, fechaConsulta);
    let fechaUtilizada = fechaConsulta;
    let intentos = 0;
    // Para indicadores sin datos diarios evitamos búsquedas largas
    const maxIntentos = indicador === 'dolar' ? 30 : 5;

    // Si no hay datos, buscar hacia atrás día por día hasta encontrar un día hábil con datos
    while (!resultado.data && intentos < maxIntentos) {
      // Retroceder un día
      fechaBusqueda.setDate(fechaBusqueda.getDate() - 1);
      
      // Encontrar el primer día hábil anterior
      const diaHabil = encontrarPrimerDiaHabilAnterior(fechaBusqueda);
      fechaConsulta = formatearFecha(diaHabil);
      
      // Si ya consultamos esta fecha, salir del loop
      if (fechaConsulta === fechaUtilizada && intentos > 0) {
        break;
      }
      
      fechaUtilizada = fechaConsulta;
      resultado = await consultarBancoCentralRango(fechaConsulta, fechaConsulta);
      intentos++;
    }

    // Si no hay datos, retornar 200 con valor 0 para que el frontend no falle
    if (!resultado.data) {
      console.warn(`⚠️ Sin datos para ${indicador} (${fecha}) después de ${intentos} intentos`);
      return NextResponse.json({
        fecha,
        tipoCambio: 0,
        valor: 0,
        indicador,
        moneda: indicador,
        fechaObservacion: null,
        sinDatos: true,
      });
    }

    const data = resultado.data;
    const ultimoValor = data.Series.Obs[data.Series.Obs.length - 1];
    
    if (!ultimoValor || !ultimoValor.value) {
      console.error('❌ Valor de observación inválido:', ultimoValor);
      return NextResponse.json(
        { 
          error: 'Estructura de datos inválida del Banco Central',
          fecha,
          observaciones: data.Series.Obs.length
        },
        { status: 500 }
      );
    }
    
    const tipoCambio = parseFloat(ultimoValor.value);

    const requierePositivo = indicador !== 'ipc';
    if (isNaN(tipoCambio) || (requierePositivo && tipoCambio <= 0)) {
      console.error('❌ Tipo de cambio inválido:', ultimoValor.value);
      return NextResponse.json(
        { 
          error: 'Tipo de cambio inválido recibido del Banco Central',
          fecha,
          valorRecibido: ultimoValor.value
        },
        { status: 500 }
      );
    }

    const fechaObservacion = ultimoValor.indexDateString;
    const esFechaOriginal = fecha === fechaObservacion;
    
    console.log(`✅ Tipo de cambio obtenido: ${tipoCambio} CLP/USD`);
    if (!esFechaOriginal) {
      console.log(`   📅 Fecha solicitada: ${fecha}`);
      console.log(`   📅 Fecha utilizada: ${fechaObservacion} (primer día hábil anterior con datos)`);
      if (intentos > 0) {
        console.log(`   🔄 Se consultaron ${intentos} fecha(s) antes de encontrar datos`);
      }
    }

    return NextResponse.json({
      fecha,
      tipoCambio,
      valor: tipoCambio,
      indicador,
      moneda: indicador,
      fechaObservacion,
      fechaUtilizada: fechaObservacion,
      esDiaHabil: esDiaHabil(fechaOriginal),
      serie: SERIE_TIPO_CAMBIO,
    });
  } catch (error: any) {
    console.error('❌ Error consultando Banco Central:', error);
    console.error('Stack trace:', error.stack);
    return NextResponse.json(
      { 
        error: 'Error interno al consultar Banco Central',
        mensaje: error.message || 'Error desconocido',
        tipo: error.name || 'Error'
      },
      { status: 500 }
    );
  }
}
