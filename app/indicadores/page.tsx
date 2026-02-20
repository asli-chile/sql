'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { ChevronUp, ChevronDown, Gift, Calendar } from 'lucide-react';

// Open-Meteo: códigos WMO a estado en español
const CIUDADES_CLIMA = [
  { nombre: 'Curicó', lat: -34.9828, lon: -71.2394 },
  { nombre: 'Santiago', lat: -33.4489, lon: -70.6693 },
  { nombre: 'Valparaíso', lat: -33.0472, lon: -71.6127 },
  { nombre: 'San Antonio', lat: -33.5931, lon: -71.6056 },
];

const WEATHER_CODES: Record<number, string> = {
  0: 'Despejado', 1: 'Mayormente despejado', 2: 'Parcialmente nublado', 3: 'Nublado',
  45: 'Niebla', 48: 'Neblina', 51: 'Llovizna', 53: 'Llovizna', 55: 'Llovizna',
  61: 'Lluvia ligera', 63: 'Lluvia', 65: 'Lluvia fuerte',
  71: 'Nieve ligera', 73: 'Nieve', 75: 'Nieve fuerte',
  80: 'Chubascos', 81: 'Chubascos', 82: 'Chubascos fuertes',
  95: 'Tormenta', 96: 'Tormenta', 99: 'Tormenta fuerte',
};

// --- FUNCIONES AUXILIARES ---
function calcularVariacion(actual: number, anterior: number): { absoluta: number; porcentual: number } {
  if (anterior === 0) return { absoluta: 0, porcentual: 0 };
  const absoluta = actual - anterior;
  const porcentual = (absoluta / anterior) * 100;
  return { absoluta, porcentual };
}

function formatearMoneda(valor: number, decimals = 2): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'decimal',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(valor);
}

// Santoral chileno - nombres por día (fuente: calendario católico)
const SANTORAL: Record<string, string[]> = {
  enero: ['María, Madre de Dios', 'Basilio, Gregorio', 'Genoveva', 'Yolando, Rigoberto', 'Emilia', 'Wilma, Melanio', 'Raimundo', 'Luciano, Eladio', 'Lucrecia', 'Gonzalo', 'Alejandro', 'Julián', 'Hilario', 'Félix', 'Raquel, Mauro', 'Marcelo', 'Antonio, Guido', 'Prisca, Priscila', 'Mario', 'Sebastián, Fabián', 'Inés', 'Laura Vicuña, Vicente', 'Virginia', 'Francisco de Sales', 'Elvira', 'Timoteo, Tito, Paula', 'Ángela Merici', 'Tomás de Aquino', 'Valerio', 'Martina', 'Juan Bosco, Marcela'],
  febrero: ['Severiano', 'Presentación del Señor', 'Blas, Oscar', 'Gilberto', 'Agueda', 'Doris, Pablo Miki', 'Gastón', 'Jerónimo Emiliano, Jacqueline', 'Rebeca', 'Escolástica', 'N.Sra. de Lourdes', 'Panfilio, Pamela', 'Beatriz', 'Cirilo, Metodio, Valentino', 'Fausto, Jovita', 'Samuel', 'Alexis', 'Bernardita', 'Álvaro', 'Eleuterio, Claudio', 'Pedro Damián, Severino', 'Eleonora, Nora', 'Florencio', 'Rubén, Sergio', 'Néstor', 'Augusto', 'Leandro, Gabriel', 'Román'],
  marzo: ['Rosendo', 'Lucio', 'Celedonio', 'Ariel', 'Olivia', 'Elcira', 'Perpétua, Felicidad', 'Juan de Dios', 'Francisca Romana', 'Macario', 'Eulogio', 'Norma', 'Rodrigo', 'Matilde', 'Luisa de Marillac', 'Heriberto', 'Patricio', 'Cirilo', 'José', 'Alejandra', 'Eugenia', 'Lea', 'Dimas', 'Elba, Catalina de Suecia', 'Anunciación', 'Braulio', 'Ruperto', 'Octavio', 'Gladys', 'Artemio', 'Benjamín, Balbina'],
  abril: ['Hugo', 'Sandra, Francisco de Paula', 'Ricardo', 'Isidoro', 'Vicente Ferrer', 'Edith', 'Juan Bautista de La Salle', 'Constanza', 'Demetrio', 'Ezequiel', 'Estanislao', 'Arnoldo, Julio', 'Martín, Aída', 'Máximo', 'Crescente', 'Flavio', 'Leopoldo, Aniceto', 'Wladimir', 'Ema', 'Edgardo', 'Anselmo', 'Karina', 'Jorge', 'Fidel', 'Marcos', 'Cleto, Marcelino', 'Zita, Toribio de Mogrovejo', 'Valeria', 'Catalina de Siena', 'Amador, Pío V'],
  mayo: ['José Obrero', 'Atanasio, Boris', 'Santa Cruz', 'Felipe y Santiago', 'Judit', 'Eleodoro', 'Domitila', 'Segundo', 'Isaías', 'Antonino, Solange', 'Estela', 'Pancracio, Nereo, Aquiles', 'N.S. Fátima', 'Matías', 'Isidro, Denise', 'Honorato', 'Pascual Bailón', 'Erica, Corina', 'Yvo', 'Bernardino de Siena', 'Constantino', 'Rita', 'Desiderio', 'María Auxiliadora, Susana', 'Beda, Gregorio, Magdalena', 'Mariana', 'Emilio, Agustín', 'Germán', 'Maximiano, Hilda', 'Fernando, Juana de Arco, Lorena', 'Visitación'],
  junio: ['Justino, Juvenal', 'Marcelino, Erasmo', 'Maximiliano, Carlos Lwanga', 'Frida', 'Bonifacio, Salvador', 'Norberto', 'Claudio', 'Armando', 'Efraín', 'Paulina', 'Bernabé, Trinidad', 'Onofre', 'Antonio', 'Eliseo', 'Leonidas, Manuela, Micaela', 'Aurelio', 'Ismael', 'Salomón', 'Romualdo', 'Florentino', 'Raul, Rodolfo, Luís Gonzaga', 'Paulino, Tomás Moro, Juan Fisher', 'Marcial', 'Juan Bautista', 'Guillermo', 'Pelayo', 'Cirilo', 'Ireneo', 'Pedro y Pablo', 'Adolfo'],
  julio: ['Ester', 'Gloria', 'Tomás', 'Isabel, Eliana, Liliana', 'Antonio María, Berta', 'María Goretti', 'Fermín', 'Eugenio', 'Verónica', 'Elías', 'Benito', 'Filomena', 'Teresa de los Andes, Enrique, Joel', 'Camilo de Lelis', 'Buenaventura, Julio', 'Carmen', 'Carolina', 'Federico', 'Arsenio', 'Marina', 'Daniel', 'María Magdalena', 'Brigida', 'Cristina', 'Santiago', 'Joaquín, Ana', 'Natalia', 'Celso', 'Marta', 'Abdón y Senén', 'Ignacio de Loyola'],
  agosto: ['Alfonso María de Ligorio', 'Eusebio', 'Lydia', 'Juan María Vianney', 'Osvaldo, Nieves', 'Transfiguración', 'Sixto, Cayetano', 'Domingo de Guzmán', 'Justo', 'Lorenzo', 'Clara de Asís', 'Laura', 'Víctor', 'Maximiliano Kolbe, Alfredo', 'Asunción', 'Esteban, Roque', 'Jacinto', 'Alberto Hurtado, Elena, Nelly, Leticia', 'Mariano', 'Bernardo', 'Pío X, Graciela', 'María Reina', 'Donato', 'Bartolomé', 'Luís, José Calasanz', 'Teresa de Jesús Jornet, César', 'Mónica', 'Agustín', 'Juan Bautista, Sabina', 'Rosa de Lima', 'Ramón'],
  septiembre: ['Arturo', 'Moisés', 'Gregorio Magno', 'Irma', 'Victorino', 'Eva, Evelyne', 'Regina', 'Natividad de la Virgen', 'Sergio, Omar', 'Nicolás de Tolentino, Adalberto', 'Orlando, Rolando', 'María', 'Juan Crisóstomo', 'Imelda', 'N. Sra. de Dolores', 'Cornelio, Cipriano', 'Roberto Belarmino', 'José de Cupertino', 'Jenaro', 'Amelia, Andrés Kim, Pablo Tung', 'Mateo', 'Mauricio', 'Lino, Tecla', 'N. Sra. del Carmen', 'Aurelio', 'Cosme y Damián', 'Vicente de Paul', 'Wenceslao', 'Miguel, Gabriel y Rafael', 'Jerónimo'],
  octubre: ['Teresita del Niño Jesús', 'Ángeles Custodios', 'Gerardo', 'Francisco de Asís', 'Flor', 'Bruno', 'N. Sra. del Rosario', 'N. Sra. de Begoña', 'Dionisio, Juan Leonardi', 'Francisco de Borja', 'Soledad', 'N. Sra. del Pilar', 'Eduardo', 'Calixto', 'Teresa de Ávila', 'Eduvigis, Margarita Alacoque', 'Ignacio de Antioquía', 'Lucas', 'Pablo de la Cruz, Renato', 'Irene', 'Úrsula', 'Sara', 'Juan Capistrano, Remigio', 'Antonio María Claret', 'Olga', 'Darío', 'Gustavo', 'Simón, Judas', 'Narciso', 'Alonso', 'Quintin'],
  noviembre: ['Todos los Santos', 'Todos los Fieles difuntos', 'Martín de Porres', 'Carlos Borromeo', 'Silvia', 'Leonardo', 'Ernesto', 'Ninfa, Godofredo', 'Teodoro', 'León Magno', 'Martín de Tours', 'Cristián', 'Diego', 'Humberto', 'Alberto Magno', 'Margarita, Gertrudis', 'Isabel de Hungría', 'Elsa', 'Andrés Avelino', 'Edmundo', 'Presentación de la Virgen', 'Cecilia', 'Clemento, Columbano', 'Flora, Andrés Dung-Lac', 'Catalina Labouré', 'Delfina', 'Virgilio', 'Blanca', 'Saturnino', 'Andrés'],
  diciembre: ['Florencia', 'Viviana', 'Francisco Javier', 'Juan Damasceno, Bárbara', 'Ada', 'Nicolás', 'Ambrosio', 'Inmaculada Concepción', 'Jéssica', 'N. Sra. de Loreto, Eulalia', 'Dámaso', 'N. Sra. de Guadalupe', 'Lucía', 'Juan de la Cruz', 'Reinaldo', 'Alicia', 'Lázaro', 'Sonia', 'Urbano', 'Abrahám, Isaac, Jacob', 'Pedro Canisio', 'Fabiola', 'Victoria', 'Adela', 'Natividad del Señor', 'Esteban', 'Juan', 'Santos Inocentes', 'Tomás Becket, David', 'Rogelio', 'Silvestre'],
};

const MESES: Record<number, keyof typeof SANTORAL> = {
  0: 'enero', 1: 'febrero', 2: 'marzo', 3: 'abril', 4: 'mayo', 5: 'junio',
  6: 'julio', 7: 'agosto', 8: 'septiembre', 9: 'octubre', 10: 'noviembre', 11: 'diciembre',
};

function getSantosDelDia(): string {
  const hoy = new Date();
  const dia = hoy.getDate();
  const mes = MESES[hoy.getMonth()];
  const nombres = SANTORAL[mes]?.[dia - 1];
  return nombres || '—';
}

// Fotos del equipo (web public) - mapeo nombre CUMPLEANOS -> path
const FOTOS_EQUIPO: Record<string, string> = {
  'Mario Bazaes': '/img/mariobasaez.png',
  'Hanz Vásquez': '/img/hansv.png',
  'Poliana Cisternas': '/img/poli.jpg',
  'Rocío Villarroel': '/img/rocio.png',
  'Ricardo Lazo': '/img/ricardolazo.png',
  'Alex Cárdenas': '/img/alex.png',
  'Stefanie Córdova': '/img/stefanie.png',
  'Rodrigo Cáceres': '/img/rodrigo.png',
};

const WEB_BASE = process.env.NEXT_PUBLIC_WEB_URL || 'https://asli.cl';

// Cumpleaños: { nombre, mes, dia } - mes 1-12, dia 1-31
const CUMPLEANOS: { nombre: string; mes: number; dia: number }[] = [
  { nombre: 'Oscar Marchant', mes: 1, dia: 15 },
  { nombre: 'Exequiel Sepúlveda', mes: 4, dia: 24 },
  { nombre: 'Diego Valenzuela', mes: 6, dia: 1 },
  { nombre: 'Sebastián Pacheco', mes: 6, dia: 8 },
  { nombre: 'Yerko Varas', mes: 7, dia: 1 },
  { nombre: 'Bryan Zuñiga', mes: 12, dia: 24 },
  { nombre: 'Nicolás Santana', mes: 11, dia: 24 },
  { nombre: 'Stefanie Córdova', mes: 2, dia: 27 },
  { nombre: 'Poliana Cisternas', mes: 6, dia: 1 },
  { nombre: 'Ricardo Lazo', mes: 9, dia: 1 },
  { nombre: 'Alex Cárdenas', mes: 10, dia: 17 },
  { nombre: 'Rodrigo Cáceres', mes: 10, dia: 31 },
  { nombre: 'Rocío Villarroel', mes: 11, dia: 1 },
  { nombre: 'Mario Bazaes', mes: 12, dia: 2 },
  { nombre: 'Hanz Vásquez', mes: 12, dia: 20 },
];

function getProximoCumpleanos(): { nombre: string; fechaStr: string; esHoy: boolean; foto?: string } | null {
  if (CUMPLEANOS.length === 0) return null;
  const hoy = new Date();
  const hoyDia = hoy.getDate();
  const hoyMes = hoy.getMonth() + 1;
  const hoyOrd = hoyMes * 100 + hoyDia;

  const conOrden = CUMPLEANOS.map((c) => ({
    ...c,
    orden: c.mes * 100 + c.dia,
    fechaStr: `${c.dia} de ${MESES[(c.mes - 1) as keyof typeof MESES]}`,
  }));

  const hoyCumple = conOrden.filter((c) => c.orden === hoyOrd);
  if (hoyCumple.length > 0) {
    const nombres = hoyCumple.map((c) => c.nombre).join(', ');
    const foto = FOTOS_EQUIPO[hoyCumple[0].nombre] ? WEB_BASE + FOTOS_EQUIPO[hoyCumple[0].nombre] : undefined;
    return { nombre: nombres, fechaStr: hoyCumple[0].fechaStr, esHoy: true, foto };
  }

  const proximos = conOrden
    .map((c) => ({ ...c, ordenAhead: c.orden >= hoyOrd ? c.orden - hoyOrd : 365 + (c.orden - hoyOrd) }))
    .sort((a, b) => a.ordenAhead - b.ordenAhead);
  const siguiente = proximos[0];
  if (!siguiente) return null;
  const foto = FOTOS_EQUIPO[siguiente.nombre] ? WEB_BASE + FOTOS_EQUIPO[siguiente.nombre] : undefined;
  return { nombre: siguiente.nombre, fechaStr: siguiente.fechaStr, esHoy: false, foto };
}

const INDICADORES_BC = ['dolar', 'euro', 'uf', 'utm', 'ipc', 'bitcoin'] as const;

function formatearFecha(fechaStr: string): string {
  const d = new Date(fechaStr);
  return d.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatearPesos(valor: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor);
}

function formatearPorcentaje(valor: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'decimal',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(valor) + '%';
}

type Feriado = { date: string; name: string };

function formatearFeriadoFecha(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const meses: Record<number, string> = {
    1: 'enero', 2: 'febrero', 3: 'marzo', 4: 'abril', 5: 'mayo', 6: 'junio',
    7: 'julio', 8: 'agosto', 9: 'septiembre', 10: 'octubre', 11: 'noviembre', 12: 'diciembre',
  };
  return `${d} de ${meses[m]}`;
}

type IndicadorBc = typeof INDICADORES_BC[number];
type IndicadorValor = { hoy: number; anterior: number | null; fechaHoy: string | null };

function formatearFechaDato(fechaRaw?: string | null): string | undefined {
  if (!fechaRaw) return undefined;
  if (/^\d{2}-\d{2}-\d{4}$/.test(fechaRaw)) return fechaRaw;
  const d = new Date(fechaRaw);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toLocaleDateString('es-CL');
}

export default function IndicadoresPage() {
  const [indicadores, setIndicadores] = useState<Record<IndicadorBc, IndicadorValor>>({
    dolar: { hoy: 0, anterior: null, fechaHoy: null },
    euro: { hoy: 0, anterior: null, fechaHoy: null },
    uf: { hoy: 0, anterior: null, fechaHoy: null },
    utm: { hoy: 0, anterior: null, fechaHoy: null },
    ipc: { hoy: 0, anterior: null, fechaHoy: null },
    bitcoin: { hoy: 0, anterior: null, fechaHoy: null },
  });
  const [feriados, setFeriados] = useState<Feriado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hora, setHora] = useState<string>('00:00:00');
  const [fechaCompleta, setFechaCompleta] = useState<string>('');
  const [climaBanner, setClimaBanner] = useState<Array<{
    ciudad: string;
    ahora?: { temp: number; estado: string };
    dias: Array<{ fecha: string; tempMax: number; tempMin: number; estado: string }>;
  }>>([]);
  const [tarjetaDerecha, setTarjetaDerecha] = useState<'cumple' | 'santo' | 'feriado'>('cumple');

  useEffect(() => {
    const t = setInterval(() => {
      setTarjetaDerecha((v) => (v === 'cumple' ? 'santo' : v === 'santo' ? 'feriado' : 'cumple'));
    }, 10000);
    return () => clearInterval(t);
  }, []);

  const actualizarReloj = useCallback(() => {
    const now = new Date();
    setHora(now.toLocaleTimeString('es-CL', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    setFechaCompleta(now.toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
  }, []);

  useEffect(() => {
    actualizarReloj();
    const interval = setInterval(actualizarReloj, 1000);
    return () => clearInterval(interval);
  }, [actualizarReloj]);

  const hoy = new Date();
  const mesActual = hoy.getMonth();
  const añoActual = hoy.getFullYear();
  const primerDia = new Date(añoActual, mesActual, 1).getDay();
  const diasEnMes = new Date(añoActual, mesActual + 1, 0).getDate();
  const diasCalendario: (number | null)[] = [];
  for (let i = 0; i < (primerDia === 0 ? 6 : primerDia - 1); i++) diasCalendario.push(null);
  for (let d = 1; d <= diasEnMes; d++) diasCalendario.push(d);

  useEffect(() => {
    const fetchFeriados = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
        const feriadosRes = await fetch(`${apiUrl}/api/feriados`);
        if (feriadosRes.ok) {
          const feriadosData = await feriadosRes.json();
          const objs = feriadosData?.objects || [];
          setFeriados(objs.map((o: { date: string; name: string }) => ({ date: o.date, name: o.name })));
        }
      } catch {
        // Feriados fallan en silencio (ej. CORS) sin afectar indicadores
      }
    };

    void fetchFeriados();
  }, []);

  useEffect(() => {
    const fetchIndicadoresBc = async () => {
      setLoading(true);
      setError(null);
      const ahora = new Date();
      const fmt = (d: Date) => d.toLocaleDateString('sv-SE', { timeZone: 'America/Santiago' });
      const fmtMindicador = (d: Date) => {
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${dd}-${mm}-${yyyy}`;
      };
      const hoyStr = fmt(ahora);

      try {
        const parsed: Record<IndicadorBc, IndicadorValor> = {
          dolar: { hoy: 0, anterior: null, fechaHoy: null },
          euro: { hoy: 0, anterior: null, fechaHoy: null },
          uf: { hoy: 0, anterior: null, fechaHoy: null },
          utm: { hoy: 0, anterior: null, fechaHoy: null },
          ipc: { hoy: 0, anterior: null, fechaHoy: null },
          bitcoin: { hoy: 0, anterior: null, fechaHoy: null },
        };
        const DIARIOS: IndicadorBc[] = ['dolar', 'euro', 'uf'];

        const mindicadorMap: Record<IndicadorBc, string> = {
          dolar: 'dolar',
          euro: 'euro',
          uf: 'uf',
          utm: 'utm',
          ipc: 'ipc',
          bitcoin: 'bitcoin',
        };
        const [allRes, ...serieRes] = await Promise.all([
          fetch('https://mindicador.cl/api'),
          ...INDICADORES_BC.map((ind) =>
            fetch(`https://mindicador.cl/api/${mindicadorMap[ind]}`).then((r) => (r.ok ? r.json() : null))
          ),
        ]);
        const all = allRes.ok ? await allRes.json() : {};
        INDICADORES_BC.forEach((ind, idx) => {
          const key = mindicadorMap[ind];
          const ser = serieRes[idx] as any;
          const serie = Array.isArray(ser?.serie) ? ser.serie : [];
          const getVal = (obj: any) => (obj?.valor != null ? Number(obj.valor) : 0);
          const hoyApi = getVal(all?.[key]);
          const hoySerie = getVal(serie[0]);
          const anteriorSerie = getVal(serie[1]);
          const hoyVal = hoySerie || hoyApi;
          const anteriorVal = anteriorSerie || null;
          if (hoyVal !== 0 || anteriorVal != null) {
            parsed[ind] = {
              hoy: hoyVal,
              // diarios: vs día anterior; no diarios: vs última actualización (ambos serie[1])
              anterior: DIARIOS.includes(ind) ? anteriorVal : anteriorVal,
              fechaHoy: all?.[key]?.fecha || ser?.serie?.[0]?.fecha || null,
            };
          }
        });

        // IPC forzado desde BC (si BC responde), porque mindicador puede venir desactualizado
        try {
          const ipcHoyRes = await fetch(`/api/banco-central/tipo-cambio?fecha=${hoyStr}&indicador=ipc`, { signal: AbortSignal.timeout(7000) });
          const ipcHoy = ipcHoyRes.ok ? await ipcHoyRes.json() : null;
          const toNum = (v: unknown) => (v != null && !Number.isNaN(Number(v)) ? Number(v) : null);
          const h = toNum(ipcHoy?.valor ?? ipcHoy?.tipoCambio);
          let a = toNum(ipcHoy?.valorAnterior);

          // Si el endpoint no envía valorAnterior, obtener publicación previa desde BC
          if (a == null && typeof ipcHoy?.fechaObservacion === 'string') {
            const m = ipcHoy.fechaObservacion.match(/^(\d{2})-(\d{2})-(\d{4})$/);
            if (m) {
              const obsDate = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
              obsDate.setDate(obsDate.getDate() - 1);
              const fechaPrev = fmt(obsDate);
              const ipcPrevRes = await fetch(`/api/banco-central/tipo-cambio?fecha=${fechaPrev}&indicador=ipc`, { signal: AbortSignal.timeout(7000) });
              const ipcPrev = ipcPrevRes.ok ? await ipcPrevRes.json() : null;
              a = toNum(ipcPrev?.valor ?? ipcPrev?.tipoCambio);
            }
          }

          const bcIpcValido = Boolean(ipcHoy && !ipcHoy.sinDatos && (ipcHoy.fechaObservacion || ipcHoy.fechaUtilizada));
          if (bcIpcValido && h != null) {
            parsed.ipc = {
              hoy: h,
              anterior: a,
              fechaHoy: ipcHoy?.fechaObservacion || ipcHoy?.fechaUtilizada || ipcHoy?.fecha || parsed.ipc.fechaHoy,
            };
          }
        } catch {
          // Si falla BC, se mantiene dato de mindicador
        }

        setIndicadores(parsed);
      } catch (err) {
        console.error('Error fetchIndicadoresBc:', err);
        setError(err instanceof Error ? err.message : 'Error al cargar indicadores');
      } finally {
        setLoading(false);
      }
    };
    void fetchIndicadoresBc();
  }, []);

  useEffect(() => {
    const fetchClimaBanner = async () => {
      try {
        const hoyStr = new Date().toISOString().slice(0, 10);
        const fetches = CIUDADES_CLIMA.map(({ nombre, lat, lon }) =>
          fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=America/Santiago&forecast_days=4`
          ).then(async (r) => {
            if (!r.ok) return { ciudad: nombre, dias: [] };
            const data = await r.json();
            const c = data?.current;
            const d = data?.daily;
            const ahora = c
              ? { temp: Math.round(c.temperature_2m ?? 0), estado: WEATHER_CODES[c.weather_code] ?? '—' }
              : undefined;
            if (!d?.time?.length) return { ciudad: nombre, ahora, dias: [] };
            const dias = d.time.map((fecha: string, i: number) => ({
              fecha: fecha === hoyStr ? 'Hoy' : new Date(fecha + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric' }),
              tempMax: Math.round(d.temperature_2m_max[i] ?? 0),
              tempMin: Math.round(d.temperature_2m_min[i] ?? 0),
              estado: WEATHER_CODES[d.weather_code[i]] ?? '—',
            }));
            return { ciudad: nombre, ahora, dias };
          })
        );
        const resultados = await Promise.all(fetches);
        setClimaBanner(resultados);
      } catch {
        setClimaBanner([]);
      }
    };
    void fetchClimaBanner();
  }, []);

  type RowItem = {
    label: string;
    sublabel?: string;
    fechaDato?: string;
    valor?: number;
    key: string;
    tipo: 'pesos' | 'porcentaje' | 'dolares';
    variacion?: { absoluta: number; porcentual: number };
  };

  const proximoCumple = getProximoCumpleanos();

  const hoyStr = new Date().toISOString().slice(0, 10);
  const feriadoHoy = feriados.find((f) => f.date === hoyStr);
  const proximoFeriado = feriadoHoy
    ? null
    : feriados
        .filter((f) => f.date > hoyStr)
        .sort((a, b) => a.date.localeCompare(b.date))[0] || null;

  const config: Record<IndicadorBc, { label: string; sublabel: string; tipo: 'pesos' | 'porcentaje' | 'dolares' }> = {
    dolar: { label: 'Dólar Observado', sublabel: 'Tipo de cambio BCCh', tipo: 'pesos' },
    euro: { label: 'Euro Observado', sublabel: 'Tipo de cambio BCCh', tipo: 'pesos' },
    uf: { label: 'UF', sublabel: 'Unidad de Fomento', tipo: 'pesos' },
    utm: { label: 'UTM', sublabel: 'Unidad Tributaria Mensual', tipo: 'pesos' },
    ipc: { label: 'IPC', sublabel: 'Índice de Precios al Consumidor', tipo: 'porcentaje' },
    bitcoin: { label: 'Bitcoin', sublabel: 'Valor en USD (mindicador)', tipo: 'dolares' },
  };

  const rows: RowItem[] = INDICADORES_BC.map((key) => {
    const { hoy, anterior, fechaHoy } = indicadores[key];
    const { label, sublabel, tipo } = config[key];
    const sinDato = hoy === 0 && anterior == null;
    return {
      label,
      sublabel,
      fechaDato: sinDato ? undefined : formatearFechaDato(fechaHoy),
      valor: sinDato ? undefined : hoy,
      key,
      tipo,
      variacion: sinDato || anterior == null ? undefined : calcularVariacion(hoy, anterior),
    };
  });

  return (
    <div className="min-h-screen bg-[#0A1524] flex flex-col w-full" style={{ color: '#ffffff' }}>
      {/* Header superior: 3 zonas - optimizado 70" */}
      <header className="w-full flex-shrink-0 pt-4 pb-2 px-4 sm:px-8 lg:px-12 2xl:pt-6 2xl:pb-3 2xl:px-12">
        <div className="w-full max-w-[2560px] mx-auto grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 2xl:gap-8 items-stretch">
          {/* IZQUIERDA: Reloj + Fecha + Mini calendario compacto */}
          <div className="rounded-xl border border-white/15 bg-[#0F1C33] p-3 2xl:p-5 hd:p-6 order-2 lg:order-1 flex flex-col min-h-[140px] lg:min-h-0 2xl:min-h-[160px] hd:min-h-[200px] relative">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-mono text-xl sm:text-2xl 2xl:text-4xl hd:text-6xl font-bold tabular-nums leading-tight" style={{ color: '#4FC3F7' }}>{hora}</div>
                <div className="text-xs 2xl:text-base hd:text-xl mt-0.5 capitalize" style={{ color: 'rgba(255,255,255,0.85)' }}>{fechaCompleta}</div>
              </div>
              <div className="text-base sm:text-lg 2xl:text-xl font-semibold capitalize shrink-0" style={{ color: '#4FC3F7' }}>
                {MESES[hoy.getMonth()]}
              </div>
            </div>
            <div className="mt-2 2xl:mt-3 hd:mt-4 grid grid-cols-7 gap-px 2xl:gap-0.5 hd:gap-1 text-[9px] 2xl:text-sm hd:text-base">
              {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => (
                <div key={d} className="w-5 h-5 2xl:w-8 2xl:h-8 hd:w-10 hd:h-10 flex items-center justify-center font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>{d}</div>
              ))}
              {diasCalendario.map((d, i) => (
                <div
                  key={i}
                  className={`w-5 h-5 2xl:w-8 2xl:h-8 hd:w-10 hd:h-10 flex items-center justify-center rounded-sm ${
                    d === hoy.getDate()
                      ? 'bg-[#4FC3F7] text-[#0A1524] font-semibold'
                      : d ? 'text-white/80' : 'opacity-20'
                  }`}
                >
                  {d ?? ''}
                </div>
              ))}
            </div>
          </div>

          {/* CENTRO: Logo + Título - centrado en pantalla */}
          <div className="flex flex-col items-center justify-center gap-2 2xl:gap-3 hd:gap-4 order-1 lg:order-2 place-self-center">
            <Image
              src="https://asli.cl/img/logoblanco.png"
              alt="ASLI Logo"
              width={224}
              height={90}
              className="object-contain w-auto h-14 2xl:h-24 hd:h-36"
              style={{ width: 'auto' }}
              loading="eager"
              unoptimized
            />
            <h1 className="text-lg md:text-xl 2xl:text-3xl hd:text-4xl font-semibold text-center" style={{ color: '#f0f4f8' }}>
              Indicadores Económicos Chile
            </h1>
          </div>

          {/* DERECHA: Cumpleaños / Santo - alterna cada 10 s con transición */}
          <div className="rounded-xl border border-white/15 bg-[#0F1C33] p-4 2xl:p-5 hd:p-6 order-3 min-h-[140px] lg:min-h-0 2xl:min-h-[160px] hd:min-h-[200px] flex flex-col flex-1 relative overflow-hidden">
            <div
              className={`absolute inset-0 p-4 flex flex-row items-center justify-center gap-4 transition-opacity duration-500 ease-in-out ${
                tarjetaDerecha === 'cumple' ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none z-0'
              }`}
            >
              {proximoCumple?.foto ? (
                <div className="shrink-0 w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 2xl:w-32 2xl:h-32 hd:w-40 hd:h-40 rounded-full overflow-hidden border-2 flex-shrink-0" style={{ borderColor: '#4FC3F7' }}>
                  <Image
                    src={proximoCumple.foto}
                    alt={proximoCumple.nombre}
                    width={128}
                    height={128}
                    className="w-full h-full object-cover"
                  unoptimized
                />
              </div>
            ) : proximoCumple ? (
              <div className="shrink-0 w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 2xl:w-32 2xl:h-32 hd:w-40 hd:h-40 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(79,195,247,0.2)' }}>
                <Gift className="w-12 h-12 sm:w-14 sm:h-14 2xl:w-16 2xl:h-16 hd:w-20 hd:h-20" style={{ color: '#4FC3F7' }} />
                </div>
              ) : null}
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="text-sm 2xl:text-base font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  {proximoCumple?.esHoy ? 'Hoy cumple' : 'Próximo cumpleaños'}
                </div>
                {proximoCumple ? (
                  <>
                    <div className="text-xl sm:text-2xl lg:text-3xl 2xl:text-3xl hd:text-4xl font-bold leading-tight break-words" style={{ color: '#4FC3F7' }}>{proximoCumple.nombre}</div>
                    <div className="text-base 2xl:text-lg mt-1" style={{ color: 'rgba(255,255,255,0.8)' }}>{proximoCumple.fechaStr}</div>
                  </>
                ) : (
                  <span className="text-lg 2xl:text-base" style={{ color: 'rgba(255,255,255,0.6)' }}>—</span>
                )}
              </div>
            </div>
            <div
              className={`absolute inset-0 p-4 flex flex-col items-center justify-center text-center transition-opacity duration-500 ease-in-out ${
                tarjetaDerecha === 'santo' ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none z-0'
              }`}
            >
                <div className="text-sm 2xl:text-base hd:text-lg font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>Hoy está de santo</div>
              <div className="text-xl sm:text-2xl lg:text-3xl 2xl:text-3xl hd:text-4xl font-bold leading-tight px-2" style={{ color: '#4FC3F7' }}>{getSantosDelDia()}</div>
            </div>
            <div
              className={`absolute inset-0 p-4 flex flex-row items-center justify-center gap-4 transition-opacity duration-500 ease-in-out ${
                tarjetaDerecha === 'feriado' ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none z-0'
              }`}
            >
              <div className="shrink-0 w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 2xl:w-32 2xl:h-32 hd:w-40 hd:h-40 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(79,195,247,0.2)' }}>
                <Calendar className="w-12 h-12 sm:w-14 sm:h-14 2xl:w-16 2xl:h-16 hd:w-20 hd:h-20" style={{ color: '#4FC3F7' }} />
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-center text-left">
                <div className="text-sm 2xl:text-base font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  {feriadoHoy ? 'Feriado en curso' : 'Próximo feriado'}
                </div>
                {feriadoHoy ? (
                  <>
                    <div className="text-xl sm:text-2xl lg:text-3xl 2xl:text-3xl hd:text-4xl font-bold leading-tight break-words" style={{ color: '#4FC3F7' }}>{feriadoHoy.name}</div>
                  </>
                ) : proximoFeriado ? (
                  <>
                    <div className="text-xl sm:text-2xl lg:text-3xl 2xl:text-3xl hd:text-4xl font-bold leading-tight break-words" style={{ color: '#4FC3F7' }}>{proximoFeriado.name}</div>
                    <div className="text-base 2xl:text-lg mt-1" style={{ color: 'rgba(255,255,255,0.8)' }}>{formatearFeriadoFecha(proximoFeriado.date)}</div>
                  </>
                ) : (
                  <span className="text-lg 2xl:text-base" style={{ color: 'rgba(255,255,255,0.6)' }}>{loading ? 'Cargando...' : '—'}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Banner Clima: 4 ciudades × (hoy + 3 días) */}
      {climaBanner.length > 0 && (
        <section className="w-full px-4 sm:px-8 lg:px-12 2xl:px-12 mt-2 2xl:mt-3">
          <div className="w-full max-w-[2304px] mx-auto rounded-xl bg-[#0F1C33] overflow-x-auto">
            <div
              className="grid gap-x-4 2xl:gap-x-6 hd:gap-x-8 gap-y-1.5 2xl:gap-y-2.5 hd:gap-y-2.5 px-4 py-2 2xl:px-5 2xl:py-3 hd:px-6 hd:py-4 min-w-[980px]"
              style={{
                gridTemplateColumns: 'minmax(110px, 1fr) minmax(190px, 1.4fr) repeat(4, minmax(180px, 1.4fr))',
              }}
            >
              {/* Encabezados */}
              <div className="text-xs 2xl:text-sm hd:text-base font-medium uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.5)' }}>Ciudad</div>
              <div className="text-xs 2xl:text-sm hd:text-base font-medium uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.5)' }}>Ahora</div>
              {(climaBanner[0]?.dias ?? []).map((d, i) => (
                <div key={`h-${i}`} className="text-xs 2xl:text-sm hd:text-base font-medium uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.5)' }}>{d.fecha}</div>
              ))}
              {/* Filas por ciudad */}
              {climaBanner.map(({ ciudad, ahora, dias }) => (
                <React.Fragment key={ciudad}>
                  <div className="font-medium text-xs 2xl:text-sm hd:text-base whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.95)' }}>{ciudad}</div>
                  <div className="flex items-center gap-1.5 whitespace-nowrap min-w-0">
                    {ahora ? (
                      <>
                        <span className="font-mono text-xs 2xl:text-sm hd:text-base tabular-nums whitespace-nowrap shrink-0" style={{ color: '#4FC3F7' }}>{ahora.temp}°</span>
                        <span className="text-xs 2xl:text-xs hd:text-sm whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.7)' }}>{ahora.estado}</span>
                      </>
                    ) : (
                      <span className="text-xs 2xl:text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>—</span>
                    )}
                  </div>
                  {dias.map((d, i) => (
                    <div key={i} className="flex items-center gap-1.5 whitespace-nowrap min-w-0">
                      <span className="font-mono text-xs 2xl:text-sm hd:text-base tabular-nums whitespace-nowrap shrink-0" style={{ color: '#4FC3F7' }}>{d.tempMin}° / {d.tempMax}°</span>
                      <span className="text-xs 2xl:text-xs hd:text-sm whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.7)' }}>{d.estado}</span>
                    </div>
                  ))}
                </React.Fragment>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Tarjetas indicadores - una sola fila */}
      <main className="w-full max-w-[2560px] mt-8 2xl:mt-10 flex-1 px-4 sm:px-8 lg:px-12 2xl:px-12 mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 2xl:gap-5 hd:gap-6">
        {loading ? (
          <div className="col-span-full rounded-xl border border-white/15 bg-[#0F1C33] p-8 2xl:p-10 text-center text-lg 2xl:text-xl" style={{ color: 'rgba(255,255,255,0.8)' }}>
            Cargando indicadores...
          </div>
        ) : error ? (
          <div className="col-span-full rounded-xl border border-white/15 bg-[#0F1C33] p-8 2xl:p-10 text-center text-amber-400 text-lg 2xl:text-xl">
            {error}
          </div>
        ) : rows.length === 0 ? (
          <div className="col-span-full rounded-xl border border-white/15 bg-[#0F1C33] p-8 2xl:p-10 text-center text-lg 2xl:text-xl" style={{ color: 'rgba(255,255,255,0.8)' }}>
            Sin datos
          </div>
        ) : (
          rows.map((row) => {
            const variacion = row.variacion;
            const tieneVar = variacion && row.valor != null;
            const sube = variacion ? variacion.absoluta >= 0 : false;
            return (
              <div
                key={row.key}
                className="rounded-xl border border-white/15 bg-[#0F1C33] p-3 sm:p-4 2xl:p-5 hd:p-6 shadow-lg flex flex-col h-[150px] 2xl:h-[175px] hd:h-[240px] max-h-[150px] 2xl:max-h-[175px] hd:max-h-none"
              >
                <div>
                  <div className="font-medium text-sm 2xl:text-base hd:text-lg" style={{ color: '#ffffff' }}>
                    {row.label}
                  </div>
                  {row.sublabel && (
                    <div className="text-xs 2xl:text-sm hd:text-base mt-0.5 capitalize" style={{ color: 'rgba(255,255,255,0.7)' }}>
                      {row.sublabel}
                    </div>
                  )}
                  {row.fechaDato && (
                    <div className="text-xs 2xl:text-sm hd:text-base mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
                      Dato: {row.fechaDato}
                    </div>
                  )}
                </div>
                <div className="mt-auto pt-2 2xl:pt-3 hd:pt-4">
                  <div className="font-mono text-lg sm:text-xl 2xl:text-2xl hd:text-4xl font-semibold tabular-nums" style={{ color: '#4FC3F7' }}>
                    {row.valor == null
                      ? '—'
                      : row.tipo === 'porcentaje'
                        ? formatearPorcentaje(row.valor)
                        : row.tipo === 'dolares'
                          ? `US$${formatearPesos(row.valor)}`
                        : `$${formatearPesos(row.valor)}`}
                  </div>
                  {tieneVar && variacion && (
                    <div className="mt-1.5 2xl:mt-2 flex items-center gap-2 flex-wrap">
                      {sube ? <ChevronUp className="w-4 h-4 2xl:w-5 2xl:h-5 hd:w-6 hd:h-6" style={{ color: '#22c55e' }} /> : <ChevronDown className="w-4 h-4 2xl:w-5 2xl:h-5 hd:w-6 hd:h-6" style={{ color: '#ef4444' }} />}
                      <span style={{ color: sube ? '#22c55e' : '#ef4444' }} className="text-xs 2xl:text-sm hd:text-base font-medium">
                        {sube ? '+' : ''}{formatearMoneda(variacion.absoluta)} ({sube ? '+' : ''}{formatearMoneda(variacion.porcentual, 1)}%)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        </div>
      </main>

      <p className="mt-auto pt-8 2xl:pt-10 pb-8 2xl:pb-10 flex-shrink-0 text-xs 2xl:text-base text-center px-4" style={{ color: 'rgba(255,255,255,0.5)' }}>
        Fuente: mindicador.cl (datos del Banco Central de Chile)
      </p>
    </div>
  );
}
