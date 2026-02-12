'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { createClient } from '@/lib/supabase-browser';
import type { Itinerario, ItinerarioEscala } from '@/types/itinerarios';
import { Plus, Trash2, Save, Calendar, Settings, X } from 'lucide-react';
import { ServiciosManager } from './ServiciosManager';

const AREAS = [
  'ASIA',
  'EUROPA',
  'AMERICA',
  'INDIA-MEDIOORIENTE',
] as const;

type EscalaForm = {
  puerto: string;
  puerto_nombre: string;
  eta: string;
  orden: number;
  area: string;
  esPuertoNuevo?: boolean;
  ajusteDias?: number; // Ajuste de días de tránsito (+/-)
  etaBase?: string; // ETA original sin ajustes (para calcular correctamente)
};

// PUERTOS_DESTINO ahora se carga desde la base de datos

// Función para calcular el número de semana del año
function calcularSemana(fecha: Date): number {
  const d = new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// Función para parsear fecha en formato DD/MM/YYYY
function parsearFechaLatinoamericana(fechaStr: string): Date | null {
  const partes = fechaStr.split('/');
  if (partes.length !== 3) return null;
  const dia = parseInt(partes[0], 10);
  const mes = parseInt(partes[1], 10) - 1; // Mes es 0-indexed
  const año = parseInt(partes[2], 10);
  if (isNaN(dia) || isNaN(mes) || isNaN(año)) return null;
  return new Date(año, mes, dia);
}

interface ItinerariosManagerProps {
  onSuccess?: () => void;
}

export function ItinerariosManager({ onSuccess }: ItinerariosManagerProps) {
  const { theme } = useTheme();

  // Catálogos desde BD
  const [navieras, setNavieras] = useState<string[]>([]);
  const [navesPorNaviera, setNavesPorNaviera] = useState<Record<string, string[]>>({});
  const [pols, setPols] = useState<string[]>([]);
  const [pods, setPods] = useState<string[]>([]);
  const [serviciosExistentes, setServiciosExistentes] = useState<Array<{ id: string; nombre: string; consorcio: string | null; tipo: 'servicio_unico' | 'consorcio' }>>([]);
  const [navesPorServicio, setNavesPorServicio] = useState<Record<string, string[]>>({}); // Mapa servicio_id -> naves[]
  const [navierasPorServicio, setNavierasPorServicio] = useState<Record<string, string[]>>({}); // Mapa servicio_id -> navieras[]
  const [puertoOrigenPorServicio, setPuertoOrigenPorServicio] = useState<Record<string, string>>({}); // Mapa servicio_id -> puerto_origen
  const [loadingCatalogos, setLoadingCatalogos] = useState(true);
  const [showServiciosManager, setShowServiciosManager] = useState(false);

  // Formulario
  const [servicioId, setServicioId] = useState<string>('');
  const [servicioNombre, setServicioNombre] = useState('');
  const [servicioNuevo, setServicioNuevo] = useState('');
  const [esServicioNuevo, setEsServicioNuevo] = useState(false);
  const [naviera, setNaviera] = useState('');
  const [nave, setNave] = useState('');
  const [naveNueva, setNaveNueva] = useState('');
  const [esNaveNueva, setEsNaveNueva] = useState(false);
  const [viaje, setViaje] = useState('');
  const [semana, setSemana] = useState<number | null>(null);
  const [pol, setPol] = useState('');
  const [etd, setEtd] = useState('');
  const [etdFormatoLatino, setEtdFormatoLatino] = useState('');
  const [escalas, setEscalas] = useState<EscalaForm[]>([]);
  const etdDateInputRef = useRef<HTMLInputElement>(null);

  // Estado
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [itinerarioResultado, setItinerarioResultado] = useState<Itinerario | null>(null);
  const [servicioIdDelItinerario, setServicioIdDelItinerario] = useState<string>(''); // Guardar servicioId usado para el itinerario

  // Función para cargar catálogos desde la base de datos (optimizada con carga en paralelo)
  const cargarCatalogos = async () => {
      try {
        setLoadingCatalogos(true);
        const supabase = createClient();
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

        // Cargar todo en paralelo para mejorar el rendimiento
        const [
          { data: navierasData, error: navierasError },
          { data: navesData, error: navesError },
          { data: destinosData, error: destinosError },
          serviciosUnicosResponse,
          consorciosResponse
        ] = await Promise.all([
          // 1. Navieras
          supabase
            .from('catalogos_navieras')
            .select('nombre')
            .eq('activo', true)
            .order('nombre'),
          // 2. Naves
          supabase
            .from('catalogos_naves')
            .select('nombre, naviera_nombre')
            .eq('activo', true)
            .order('nombre'),
          // 3. PODs desde catalogos_destinos
          supabase
            .from('catalogos_destinos')
            .select('nombre')
            .eq('activo', true)
            .order('nombre'),
          // 4. Servicios únicos (API)
          fetch(`${apiUrl}/api/admin/servicios-unicos`).then(r => r.json()).catch(() => ({ servicios: [] })),
          // 5. Consorcios (API)
          fetch(`${apiUrl}/api/admin/consorcios`).then(r => r.json()).catch(() => ({ consorcios: [] }))
        ]);

        // Procesar navieras
        if (!navierasError && navierasData) {
          const navierasList = navierasData.map((n: any) => n.nombre).filter(Boolean);
          setNavieras(navierasList);
          if (navierasList.length > 0 && !naviera) {
            setNaviera(navierasList[0]);
          }
        }

        // Procesar naves
        if (!navesError && navesData) {
          const navesConNaviera = navesData.filter((n: any) => n.naviera_nombre && n.nombre);
          const mapping: Record<string, string[]> = {};
          navesConNaviera.forEach((nave: any) => {
            const navieraNombre = nave.naviera_nombre.trim();
            const nombreNave = nave.nombre.trim();
            if (!mapping[navieraNombre]) {
              mapping[navieraNombre] = [];
            }
            if (!mapping[navieraNombre].includes(nombreNave)) {
              mapping[navieraNombre].push(nombreNave);
            }
          });
          Object.keys(mapping).forEach(n => mapping[n].sort());
          setNavesPorNaviera(mapping);
        }

        // Procesar PODs
        if (!destinosError && destinosData) {
          const podsList = destinosData.map((d: any) => d.nombre).filter(Boolean);
          setPods(podsList);
        }

        // Cargar POLs en segundo plano (puede ser lento, no bloquear la UI)
        (async () => {
          try {
            const { data: registrosData, error: registrosError } = await supabase
              .from('registros')
              .select('pol')
              .not('pol', 'is', null)
              .is('deleted_at', null);
            
            if (!registrosError && registrosData) {
              const polsUnicos = Array.from(new Set(registrosData.map((r: any) => r.pol).filter(Boolean))).sort() as string[];
              setPols(polsUnicos);
              if (polsUnicos.length > 0 && !pol) {
                setPol(polsUnicos[0]);
              }
            }
          } catch {
            // Si falla, no es crítico, el usuario puede ingresar el POL manualmente
          }
        })();

        // Procesar servicios únicos y consorcios
        const serviciosList: Array<{ id: string; nombre: string; consorcio: string | null; tipo: 'servicio_unico' | 'consorcio' }> = [];
        const navesPorServicioMap: Record<string, string[]> = {};
        const navierasPorServicioMap: Record<string, string[]> = {};
        const puertoOrigenPorServicioMap: Record<string, string> = {};

        // Procesar servicios únicos
        if (serviciosUnicosResponse?.servicios) {
          serviciosUnicosResponse.servicios
            .filter((s: any) => s.activo)
            .forEach((servicio: any) => {
              serviciosList.push({
                id: servicio.id,
                nombre: servicio.nombre,
                consorcio: servicio.naviera_nombre || null,
                tipo: 'servicio_unico',
              });

              if (servicio.naviera_nombre) {
                navierasPorServicioMap[servicio.id] = [servicio.naviera_nombre];
              }

              if (servicio.puerto_origen) {
                puertoOrigenPorServicioMap[servicio.id] = servicio.puerto_origen;
              }

              if (servicio.naves && Array.isArray(servicio.naves)) {
                const navesActivas = servicio.naves
                  .filter((n: any) => n.activo !== false && n.nave_nombre)
                  .map((n: any) => n.nave_nombre)
                  .sort();
                
                if (navesActivas.length > 0) {
                  navesPorServicioMap[servicio.id] = navesActivas;
                }
              }
            });
        }

        // Procesar consorcios
        if (consorciosResponse?.consorcios) {
          consorciosResponse.consorcios
            .filter((c: any) => c.activo)
            .forEach((consorcio: any) => {
              serviciosList.push({
                id: consorcio.id,
                nombre: consorcio.nombre,
                consorcio: 'Consorcio',
                tipo: 'consorcio',
              });

              if (consorcio.servicios && Array.isArray(consorcio.servicios)) {
                const todasLasNavieras = new Set<string>();
                const todasLasNaves: string[] = [];
                const puertosOrigen: string[] = [];
                
                consorcio.servicios.forEach((cs: any) => {
                  const navieraNombre = cs.servicio_unico?.naviera?.nombre || 
                                       cs.servicio_unico?.naviera_nombre || 
                                       null;
                  if (navieraNombre) {
                    todasLasNavieras.add(navieraNombre);
                  }
                  
                  if (cs.servicio_unico?.puerto_origen) {
                    puertosOrigen.push(cs.servicio_unico.puerto_origen);
                  }
                  
                  if (cs.servicio_unico?.naves && Array.isArray(cs.servicio_unico.naves)) {
                    cs.servicio_unico.naves
                      .filter((n: any) => n.activo !== false && n.nave_nombre)
                      .forEach((n: any) => {
                        if (!todasLasNaves.includes(n.nave_nombre)) {
                          todasLasNaves.push(n.nave_nombre);
                        }
                      });
                  }
                });
                
                navierasPorServicioMap[consorcio.id] = Array.from(todasLasNavieras).sort();
                navesPorServicioMap[consorcio.id] = todasLasNaves.sort();
                
                if (puertosOrigen.length > 0) {
                  puertoOrigenPorServicioMap[consorcio.id] = puertosOrigen[0];
                }
              }
            });
        }

        // Ordenar servicios por nombre
        serviciosList.sort((a, b) => a.nombre.localeCompare(b.nombre));
        setServiciosExistentes(serviciosList);
        setNavesPorServicio(navesPorServicioMap);
        setNavierasPorServicio(navierasPorServicioMap);
        setPuertoOrigenPorServicio(puertoOrigenPorServicioMap);
      } catch (error) {
        console.error('Error cargando catálogos:', error);
      } finally {
        setLoadingCatalogos(false);
      }
  };

  // Cargar catálogos al montar el componente
  useEffect(() => {
    void cargarCatalogos();
  }, []);

  // Navieras disponibles: filtrar según el servicio seleccionado
  const navierasDisponibles = useMemo(() => {
    if (servicioId && navierasPorServicio[servicioId]) {
      // Filtrar navieras del servicio/consorcio seleccionado
      const navierasDelServicio = navierasPorServicio[servicioId];
      return navieras.filter(n => navierasDelServicio.includes(n));
    }
    // Si no hay servicio seleccionado, mostrar todas
    return navieras;
  }, [servicioId, navierasPorServicio, navieras]);

  // Naves disponibles: si hay servicio seleccionado, mostrar naves del servicio; si no, mostrar todas de la naviera
  const navesDisponibles = useMemo(() => {
    // Si hay servicio seleccionado, mostrar naves del servicio filtradas por naviera si está seleccionada
    if (servicioId && navesPorServicio[servicioId]) {
      const navesDelServicio = navesPorServicio[servicioId];
      
      // Si hay naviera seleccionada, filtrar para mostrar solo las naves que pertenecen a esa naviera
      if (naviera && navesPorNaviera[naviera] && navesPorNaviera[naviera].length > 0) {
        const navesFiltradas = navesDelServicio.filter(nave => 
          navesPorNaviera[naviera].includes(nave)
        );
        // Si hay naves filtradas, mostrarlas; si no, mostrar todas las del servicio
        return navesFiltradas.length > 0 ? navesFiltradas : navesDelServicio;
      }
      // Si no hay naviera seleccionada, mostrar todas las naves del servicio
      return navesDelServicio;
    }
    
    // Si no hay servicio seleccionado, mostrar todas las naves de la naviera
    if (!naviera) return [];
    return navesPorNaviera[naviera] || [];
  }, [servicioId, servicioNombre, naviera, navesPorNaviera, navesPorServicio]);

  // Cuando cambia el servicio, resetear naviera si no está en las navieras del servicio
  useEffect(() => {
    if (servicioId && navierasPorServicio[servicioId]) {
      const navierasDelServicio = navierasPorServicio[servicioId];
      // Si la naviera actual no está en las navieras del servicio, resetearla
      if (naviera && !navierasDelServicio.includes(naviera)) {
        setNaviera('');
      }
    }
  }, [servicioId, navierasPorServicio, naviera]);

  // Cuando cambia la naviera o el servicio, resetear nave
  useEffect(() => {
    if (naviera || servicioId) {
      setNave('');
      setEsNaveNueva(false);
      setNaveNueva('');
    }
  }, [naviera, servicioId]);

  // Rellenar naviera automáticamente cuando se selecciona una nave
  // SOLO si no hay naviera seleccionada o si la nave no pertenece a la naviera actual
  useEffect(() => {
    if (nave && !esNaveNueva) {
      // Si ya hay una naviera seleccionada, verificar que la nave pertenezca a esa naviera
      if (naviera) {
        const navesDeNavieraActual = navesPorNaviera[naviera] || [];
        if (navesDeNavieraActual.includes(nave)) {
          // La nave pertenece a la naviera actual, no hacer nada
          return;
        }
      }
      
      // Buscar a qué naviera pertenece esta nave
      for (const [nombreNaviera, navesDeNaviera] of Object.entries(navesPorNaviera)) {
        if (navesDeNaviera.includes(nave)) {
          // Verificar que esta naviera esté disponible para el servicio seleccionado
          if (servicioId && navierasPorServicio[servicioId]) {
            const navierasDisponibles = navierasPorServicio[servicioId];
            if (!navierasDisponibles.includes(nombreNaviera)) {
              continue; // Buscar otra naviera
            }
          }
          
          // Si la naviera actual es diferente, actualizarla
          if (naviera !== nombreNaviera) {
            setNaviera(nombreNaviera);
          }
          return;
        }
      }
      
      // Si la nave viene del servicio, buscar en navesPorServicio
      if (servicioId && navesPorServicio[servicioId]?.includes(nave)) {
        // La nave pertenece al servicio, buscar su naviera entre las navieras disponibles del servicio
        if (navierasPorServicio[servicioId]) {
          const navierasDelServicio = navierasPorServicio[servicioId];
          for (const nombreNaviera of navierasDelServicio) {
            const navesDeNaviera = navesPorNaviera[nombreNaviera] || [];
            if (navesDeNaviera.includes(nave)) {
              if (naviera !== nombreNaviera) {
                setNaviera(nombreNaviera);
              }
              return;
            }
          }
        }
      }
    }
  }, [nave, esNaveNueva, navesPorNaviera, naviera, servicioId, navesPorServicio, navierasPorServicio]);

  // Función para cargar escalas del servicio desde servicios_unicos o consorcios
  const cargarEscalasDelServicio = async () => {
    if (!servicioId || esServicioNuevo) {
      setErrorMessage('Por favor selecciona un servicio primero.');
      return;
    }

    try {
      setErrorMessage(null);
      setSuccessMessage(null);
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      let escalasDelServicio: any[] = [];
      let servicio: any = null;

      // Buscar primero en servicios únicos
      try {
        const serviciosUnicosResponse = await fetch(`${apiUrl}/api/admin/servicios-unicos`);
        const serviciosUnicosResult = await serviciosUnicosResponse.json();
        
        if (serviciosUnicosResponse.ok && serviciosUnicosResult.servicios) {
          servicio = serviciosUnicosResult.servicios.find((s: any) => s.id === servicioId);
          if (servicio && servicio.destinos) {
            escalasDelServicio = servicio.destinos.map((destino: any) => ({
              puerto: destino.puerto,
              puerto_nombre: destino.puerto_nombre || destino.puerto,
              area: destino.area || 'ASIA',
              orden: destino.orden || 0,
              activo: destino.activo !== false,
            }));
          }
        }
      } catch (error) {
        // Error cargando servicios únicos
      }

      // Si no se encontró en servicios únicos, buscar en consorcios
      if (!servicio || escalasDelServicio.length === 0) {
        try {
          const consorciosResponse = await fetch(`${apiUrl}/api/admin/consorcios`);
          const consorciosResult = await consorciosResponse.json();
          
          if (consorciosResponse.ok && consorciosResult.consorcios) {
            servicio = consorciosResult.consorcios.find((c: any) => c.id === servicioId);
            if (servicio && servicio.destinos_activos) {
              // Obtener destinos activos del consorcio y eliminar duplicados por código de puerto
              const destinosMap = new Map<string, any>();
              
              servicio.destinos_activos
                .filter((da: any) => da.activo !== false && da.destino)
                .forEach((da: any) => {
                  const puerto = da.destino.puerto;
                  // Si el puerto no existe en el mapa, agregarlo (esto elimina duplicados)
                  if (puerto && !destinosMap.has(puerto)) {
                    destinosMap.set(puerto, {
                      puerto: puerto,
                      puerto_nombre: da.destino.puerto_nombre || puerto,
                      area: da.destino.area || 'ASIA',
                      orden: da.orden || 0,
                      activo: true,
                    });
                  }
                });
              
              // Convertir mapa a array y ordenar por orden
              escalasDelServicio = Array.from(destinosMap.values())
                .sort((a: any, b: any) => a.orden - b.orden)
                .map((escala, index) => ({ ...escala, orden: index })); // Reordenar secuencialmente
              
            }
          }
        } catch (error) {
          // Error cargando consorcios
        }
      }

      if (!servicio) {
        setErrorMessage(`No se encontró el servicio seleccionado.`);
        return;
      }

      
      if (!Array.isArray(escalasDelServicio) || escalasDelServicio.length === 0) {
        setErrorMessage(`El servicio "${servicioNombre || servicio.nombre}" no tiene escalas definidas. Define las escalas en el gestor de servicios primero.`);
        return;
      }

      // Filtrar solo escalas activas (el orden se determinará por ETA del primer viaje)
      const escalasActivas = escalasDelServicio
        .filter((e: any) => e.activo !== false && e.activo !== null);

      if (escalasActivas.length === 0) {
        setErrorMessage(`El servicio "${servicioNombre || servicio.nombre}" no tiene escalas activas. Todas las escalas están inactivas.`);
        return;
      }

      // Verificar si hay un ETD ingresado y si existen viajes anteriores para calcular fechas automáticamente
      let escalasPrellenadas: EscalaForm[] = [];
      
      
      if (etd) {
        try {
          // Normalizar ETD a fecha local (sin considerar hora) para cálculos precisos
          let etdDate: Date;
          if (etd.includes('/')) {
            // Formato DD/MM/YYYY
            const fechaParseada = parsearFechaLatinoamericana(etd);
            if (!fechaParseada) {
              etdDate = new Date(etd);
            } else {
              // Crear fecha en zona horaria local con mediodía para evitar problemas
              etdDate = new Date(fechaParseada.getFullYear(), fechaParseada.getMonth(), fechaParseada.getDate(), 12, 0, 0);
            }
          } else if (etd.includes('-') && !etd.includes('T')) {
            // Formato YYYY-MM-DD, crear fecha en zona horaria local
            const [año, mes, dia] = etd.split('-');
            etdDate = new Date(parseInt(año), parseInt(mes) - 1, parseInt(dia), 12, 0, 0);
          } else {
            // Formato ISO, extraer solo la fecha y crear en zona horaria local
            const fechaISO = new Date(etd);
            etdDate = new Date(fechaISO.getFullYear(), fechaISO.getMonth(), fechaISO.getDate(), 12, 0, 0);
          }
          
          if (isNaN(etdDate.getTime())) {
            escalasPrellenadas = escalasActivas.map((escala: any, index: number) => ({
              puerto: escala.puerto || '',
              puerto_nombre: escala.puerto_nombre || escala.puerto || '',
              eta: '',
              orden: escala.orden || index + 1,
              area: escala.area || 'ASIA',
              esPuertoNuevo: false,
              ajusteDias: 0,
            }));
            setEscalas(escalasPrellenadas);
            setSuccessMessage(`✅ ${escalasPrellenadas.length} escala(s) cargada(s) del servicio "${servicioNombre || servicio.nombre}". ETD inválido, completa las fechas ETA manualmente.`);
            return;
          }
          
          // Buscar itinerarios existentes del mismo servicio
          const apiUrlItinerarios = process.env.NEXT_PUBLIC_API_URL || '';
          const responseItinerarios = await fetch(`${apiUrlItinerarios}/api/admin/itinerarios`);
          
          if (responseItinerarios.ok) {
            const resultItinerarios = await responseItinerarios.json();
            const itinerariosDelServicio = (resultItinerarios.itinerarios || []).filter((it: any) => 
              (it.servicio_id === servicioId) || (it.servicio === servicioNombre || it.servicio === servicio.nombre)
            );
            
            
            if (itinerariosDelServicio.length > 0) {
              // Ordenar todos los viajes por ETD (ascendente - del más antiguo al más reciente)
              const itinerariosOrdenados = [...itinerariosDelServicio].sort((a: any, b: any) => 
                new Date(a.etd).getTime() - new Date(b.etd).getTime()
              );
              
              // El primer viaje (el más antiguo) es el que usaremos como base para las ETAs y para calcular la diferencia
              const primerViaje = itinerariosOrdenados[0];
              
              // Normalizar ETD del primer viaje a fecha local (sin considerar hora) para cálculos precisos
              let etdPrimerViaje: Date;
              if (primerViaje.etd && typeof primerViaje.etd === 'string') {
                if (primerViaje.etd.includes('T')) {
                  // Si es formato ISO, extraer solo la fecha y crear en zona horaria local
                  const fechaISO = new Date(primerViaje.etd);
                  etdPrimerViaje = new Date(fechaISO.getFullYear(), fechaISO.getMonth(), fechaISO.getDate(), 12, 0, 0);
                } else {
                  // Si es formato YYYY-MM-DD, crear fecha en zona horaria local
                  const [año, mes, dia] = primerViaje.etd.split('-');
                  etdPrimerViaje = new Date(parseInt(año), parseInt(mes) - 1, parseInt(dia), 12, 0, 0);
                }
              } else {
                const fechaISO = new Date(primerViaje.etd);
                etdPrimerViaje = new Date(fechaISO.getFullYear(), fechaISO.getMonth(), fechaISO.getDate(), 12, 0, 0);
              }
              
              // Calcular diferencia en días entre el primer ETD y el nuevo ETD (el que se está ingresando)
              // Usar solo las partes de fecha (año, mes, día) para evitar problemas de zona horaria
              const diffTime = etdDate.getTime() - etdPrimerViaje.getTime();
              const diferenciaDias = Math.round(diffTime / (1000 * 60 * 60 * 24));
              
              
              // Obtener escalas del primer viaje ordenadas por ETA (orden del primer registro)
              if (primerViaje.escalas && primerViaje.escalas.length > 0) {
                // Ordenar escalas del primer viaje por ETA (de menor a mayor)
                const escalasPrimerViaje = primerViaje.escalas.sort((a: any, b: any) => {
                  // Ordenar por ETA (fecha de arribo) de menor a mayor
                  if (!a.eta && !b.eta) return (a.orden || 0) - (b.orden || 0);
                  if (!a.eta) return 1;
                  if (!b.eta) return -1;
                  return new Date(a.eta).getTime() - new Date(b.eta).getTime();
                });
                
                // Crear un mapa de escalas del servicio por puerto para búsqueda rápida
                const escalasServicioMap = new Map<string, any>();
                escalasActivas.forEach((escala: any) => {
                  const key = escala.puerto || escala.puerto_nombre || '';
                  escalasServicioMap.set(key, escala);
                });
                
                // Mapear escalas siguiendo el orden del primer viaje (por ETA)
                const escalasOrdenadas: EscalaForm[] = [];
                const puertosProcesados = new Set<string>();
                
                // Primero, agregar escalas que están en el primer viaje, en el orden de sus ETAs
                escalasPrimerViaje.forEach((escalaPrimera: any, index: number) => {
                  const puertoKey = escalaPrimera.puerto || escalaPrimera.puerto_nombre || '';
                  const escalaServicio = escalasServicioMap.get(puertoKey);
                  
                  if (escalaServicio) {
                    puertosProcesados.add(puertoKey);
                    
                    if (escalaPrimera.eta) {
                      // Calcular nueva ETA sumando la diferencia de días
                      const etaPrimera = new Date(escalaPrimera.eta);
                      const nuevaEta = new Date(etaPrimera);
                      nuevaEta.setDate(nuevaEta.getDate() + diferenciaDias);
                      
                      // Formatear fecha en zona horaria local (no UTC) para evitar pérdida de días
                      const año = nuevaEta.getFullYear();
                      const mes = String(nuevaEta.getMonth() + 1).padStart(2, '0');
                      const dia = String(nuevaEta.getDate()).padStart(2, '0');
                      const fechaFormateada = `${año}-${mes}-${dia}`;
                      
                      escalasOrdenadas.push({
                        puerto: escalaServicio.puerto || '',
                        puerto_nombre: escalaServicio.puerto_nombre || escalaServicio.puerto || '',
                        eta: fechaFormateada,
                        orden: index + 1,
                        area: escalaServicio.area || 'ASIA',
                        esPuertoNuevo: false,
                        ajusteDias: 0,
                        etaBase: fechaFormateada, // Guardar ETA base original para ajustes
                      });
                    } else {
                      escalasOrdenadas.push({
                        puerto: escalaServicio.puerto || '',
                        puerto_nombre: escalaServicio.puerto_nombre || escalaServicio.puerto || '',
                        eta: '',
                        orden: index + 1,
                        area: escalaServicio.area || 'ASIA',
                        esPuertoNuevo: false,
                        ajusteDias: 0,
                      });
                    }
                  }
                });
                
                // Luego, agregar escalas del servicio que no están en el primer viaje
                escalasActivas.forEach((escalaServicio: any) => {
                  const puertoKey = escalaServicio.puerto || escalaServicio.puerto_nombre || '';
                  if (!puertosProcesados.has(puertoKey)) {
                    escalasOrdenadas.push({
                      puerto: escalaServicio.puerto || '',
                      puerto_nombre: escalaServicio.puerto_nombre || escalaServicio.puerto || '',
                      eta: '',
                      orden: escalasOrdenadas.length + 1,
                      area: escalaServicio.area || 'ASIA',
                      esPuertoNuevo: false,
                      ajusteDias: 0,
                    });
                  }
                });
                
                escalasPrellenadas = escalasOrdenadas;
                
                setSuccessMessage(`✅ ${escalasPrellenadas.length} escala(s) cargada(s) con fechas calculadas automáticamente (diferencia: ${diferenciaDias} días desde el primer viaje).`);
              } else {
                // No hay escalas en el primer viaje, cargar sin fechas
                escalasPrellenadas = escalasActivas.map((escala: any, index: number) => ({
                  puerto: escala.puerto || '',
                  puerto_nombre: escala.puerto_nombre || escala.puerto || '',
                  eta: '',
                  orden: escala.orden || index + 1,
                  area: escala.area || 'ASIA',
                  esPuertoNuevo: false,
                }));
                setSuccessMessage(`✅ ${escalasPrellenadas.length} escala(s) cargada(s) del servicio "${servicioNombre || servicio.nombre}". Completa las fechas ETA.`);
              }
            } else {
              // No hay viajes anteriores, es el primer viaje
              escalasPrellenadas = escalasActivas.map((escala: any, index: number) => ({
                puerto: escala.puerto || '',
                puerto_nombre: escala.puerto_nombre || escala.puerto || '',
                eta: '',
                orden: escala.orden || index + 1,
                area: escala.area || 'ASIA',
                esPuertoNuevo: false,
              }));
              setSuccessMessage(`✅ ${escalasPrellenadas.length} escala(s) cargada(s) del servicio "${servicioNombre || servicio.nombre}". Completa las fechas ETA.`);
            }
          } else {
            // Error al cargar itinerarios, cargar escalas sin fechas
            escalasPrellenadas = escalasActivas.map((escala: any, index: number) => ({
              puerto: escala.puerto || '',
              puerto_nombre: escala.puerto_nombre || escala.puerto || '',
              eta: '',
              orden: escala.orden || index + 1,
              area: escala.area || 'ASIA',
              esPuertoNuevo: false,
              ajusteDias: 0,
            }));
            setSuccessMessage(`✅ ${escalasPrellenadas.length} escala(s) cargada(s) del servicio "${servicioNombre || servicio.nombre}". Completa las fechas ETA.`);
          }
        } catch (errorItinerarios: any) {
          // En caso de error, cargar escalas sin fechas
          escalasPrellenadas = escalasActivas.map((escala: any, index: number) => ({
            puerto: escala.puerto || '',
            puerto_nombre: escala.puerto_nombre || escala.puerto || '',
            eta: '',
            orden: escala.orden || index + 1,
            area: escala.area || 'ASIA',
            esPuertoNuevo: false,
          }));
          setSuccessMessage(`✅ ${escalasPrellenadas.length} escala(s) cargada(s) del servicio "${servicioNombre || servicio.nombre}". Completa las fechas ETA.`);
        }
      } else {
        // No hay ETD, cargar escalas sin fechas
        escalasPrellenadas = escalasActivas.map((escala: any, index: number) => ({
          puerto: escala.puerto || '',
          puerto_nombre: escala.puerto_nombre || escala.puerto || '',
          eta: '',
          orden: escala.orden || index + 1,
          area: escala.area || 'ASIA',
          esPuertoNuevo: false,
        }));
        setSuccessMessage(`✅ ${escalasPrellenadas.length} escala(s) cargada(s) del servicio "${servicioNombre || servicio.nombre}". Ingresa el ETD y vuelve a cargar las escalas para calcular fechas automáticamente.`);
      }

      setEscalas(escalasPrellenadas);
    } catch (error: any) {
      console.error('❌ Error cargando escalas del servicio:', error);
      setErrorMessage(`Error al cargar escalas: ${error?.message || 'Error desconocido'}`);
    }
  };

  // Recalcular fechas automáticamente cuando cambia el ETD y hay escalas cargadas
  useEffect(() => {
    const recalcularFechasAutomaticamente = async () => {
      // Solo recalcular si hay ETD, escalas cargadas, servicio seleccionado y no es servicio nuevo
      if (!etd || escalas.length === 0 || !servicioId || esServicioNuevo) {
        return;
      }

      try {
        // Buscar itinerarios existentes del mismo servicio
        const apiUrlItinerarios = process.env.NEXT_PUBLIC_API_URL || '';
        const responseItinerarios = await fetch(`${apiUrlItinerarios}/api/admin/itinerarios`);
        
        if (!responseItinerarios.ok) return;

        const resultItinerarios = await responseItinerarios.json();
        const itinerariosDelServicio = (resultItinerarios.itinerarios || []).filter((it: any) => 
          (it.servicio_id === servicioId) || (it.servicio === servicioNombre)
        );
        
        if (itinerariosDelServicio.length === 0) {
          // Es el primer viaje, no calcular
          return;
        }

        // Ordenar todos los viajes por ETD (ascendente - del más antiguo al más reciente)
        const itinerariosOrdenados = [...itinerariosDelServicio].sort((a: any, b: any) => 
          new Date(a.etd).getTime() - new Date(b.etd).getTime()
        );
        
        // El primer viaje (el más antiguo) es el que usaremos como base para las ETAs y para calcular la diferencia
        const primerViaje = itinerariosOrdenados[0];
        
        // Normalizar ETD a fecha local (sin considerar hora) para cálculos precisos
        let etdDateNormalizado: Date;
        if (etd.includes('-') && !etd.includes('T')) {
          // Formato YYYY-MM-DD, crear fecha en zona horaria local
          const [año, mes, dia] = etd.split('-');
          etdDateNormalizado = new Date(parseInt(año), parseInt(mes) - 1, parseInt(dia), 12, 0, 0);
        } else {
          // Formato ISO, extraer solo la fecha y crear en zona horaria local
          const fechaISO = new Date(etd);
          etdDateNormalizado = new Date(fechaISO.getFullYear(), fechaISO.getMonth(), fechaISO.getDate(), 12, 0, 0);
        }
        
        // Normalizar ETD del primer viaje a fecha local (sin considerar hora) para cálculos precisos
        let etdPrimerViaje: Date;
        if (primerViaje.etd && typeof primerViaje.etd === 'string') {
          if (primerViaje.etd.includes('T')) {
            // Si es formato ISO, extraer solo la fecha y crear en zona horaria local
            const fechaISO = new Date(primerViaje.etd);
            etdPrimerViaje = new Date(fechaISO.getFullYear(), fechaISO.getMonth(), fechaISO.getDate(), 12, 0, 0);
          } else {
            // Si es formato YYYY-MM-DD, crear fecha en zona horaria local
            const [año, mes, dia] = primerViaje.etd.split('-');
            etdPrimerViaje = new Date(parseInt(año), parseInt(mes) - 1, parseInt(dia), 12, 0, 0);
          }
        } else {
          const fechaISO = new Date(primerViaje.etd);
          etdPrimerViaje = new Date(fechaISO.getFullYear(), fechaISO.getMonth(), fechaISO.getDate(), 12, 0, 0);
        }
        
        // Calcular diferencia en días entre el primer ETD y el nuevo ETD (el que se está ingresando)
        // Usar solo las partes de fecha (año, mes, día) para evitar problemas de zona horaria
        const diffTime = etdDateNormalizado.getTime() - etdPrimerViaje.getTime();
        const diferenciaDias = Math.round(diffTime / (1000 * 60 * 60 * 24));
        
        
        // Obtener escalas del primer viaje
        if (primerViaje.escalas && primerViaje.escalas.length > 0) {
          const escalasPrimerViaje = primerViaje.escalas.sort((a: any, b: any) => {
            // Ordenar por ETA (fecha de arribo) - orden del primer registro
            if (!a.eta && !b.eta) return (a.orden || 0) - (b.orden || 0);
            if (!a.eta) return 1;
            if (!b.eta) return -1;
            return new Date(a.eta).getTime() - new Date(b.eta).getTime();
          });
          
          // Actualizar escalas con fechas calculadas
          const escalasActualizadas = escalas.map((escalaActual) => {
            // Buscar la escala correspondiente en el primer viaje por puerto
            const escalaPrimera = escalasPrimerViaje.find((ep: any) => 
              ep.puerto === escalaActual.puerto || ep.puerto_nombre === escalaActual.puerto_nombre
            );
            
            if (escalaPrimera && escalaPrimera.eta) {
              // Calcular nueva ETA sumando la diferencia de días
              const etaPrimera = new Date(escalaPrimera.eta);
              const nuevaEta = new Date(etaPrimera);
              nuevaEta.setDate(nuevaEta.getDate() + diferenciaDias);
              
              // Formatear fecha en zona horaria local (no UTC) para evitar pérdida de días
              const año = nuevaEta.getFullYear();
              const mes = String(nuevaEta.getMonth() + 1).padStart(2, '0');
              const dia = String(nuevaEta.getDate()).padStart(2, '0');
              const fechaFormateada = `${año}-${mes}-${dia}`;
              
              // Guardar etaBase si no existe (primera vez que se calcula)
              const etaBaseAGuardar = escalaActual.etaBase || fechaFormateada;
              return {
                ...escalaActual,
                eta: fechaFormateada,
                etaBase: etaBaseAGuardar, // Guardar como etaBase si no existe
              };
            }
            
            // Si no se encuentra, mantener la escala actual
            return escalaActual;
          });
          
          setEscalas(escalasActualizadas);
          setSuccessMessage(`✅ Fechas recalculadas automáticamente (diferencia: ${diferenciaDias} días desde el viaje anterior).`);
        }
      } catch (error: any) {
        // Error al recalcular fechas automáticamente
      }
    };

    // Debounce para evitar cálculos excesivos
    const timeoutId = setTimeout(() => {
      recalcularFechasAutomaticamente();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [etd, servicioId, servicioNombre]); // Recalcular cuando cambia el ETD o el servicio

  // Seleccionar naviera y puerto de origen automáticamente cuando se selecciona un servicio
  useEffect(() => {
    if (servicioId && !esServicioNuevo) {
      const servicioSeleccionado = serviciosExistentes.find(s => s.id === servicioId);
      if (servicioSeleccionado?.consorcio && navieras.includes(servicioSeleccionado.consorcio)) {
        setNaviera(servicioSeleccionado.consorcio);
      }
      setServicioNombre(servicioSeleccionado?.nombre || '');
      
      // Cargar puerto de origen automáticamente
      if (puertoOrigenPorServicio[servicioId]) {
        const puertoOrigen = puertoOrigenPorServicio[servicioId];
        setPol(puertoOrigen);
      }
    } else {
      setServicioNombre('');
      // Si se deselecciona el servicio, no limpiar el POL (el usuario puede haberlo cambiado)
    }
  }, [servicioId, esServicioNuevo, serviciosExistentes, navieras, puertoOrigenPorServicio]);

  // Cargar escalas automáticamente cuando se selecciona un servicio existente (solo si no hay escalas)
  useEffect(() => {
    if (servicioId && !esServicioNuevo && escalas.length === 0) {
      void cargarEscalasDelServicio();
    }
  }, [servicioId, esServicioNuevo]);

  // Función para convertir fecha ISO (YYYY-MM-DD) a formato latinoamericano (DD/MM/YYYY)
  const formatearFechaLatinoamericana = (fechaISO: string): string => {
    if (!fechaISO) return '';
    const partes = fechaISO.split('-');
    if (partes.length !== 3) return '';
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  };

  // Cuando cambia ETD desde el input de fecha nativo
  const handleEtdDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fechaISO = e.target.value;
    if (fechaISO) {
      setEtd(fechaISO);
      const fecha = new Date(fechaISO + 'T00:00:00');
      const semanaCalculada = calcularSemana(fecha);
      setSemana(semanaCalculada);
      setEtdFormatoLatino(formatearFechaLatinoamericana(fechaISO));
    } else {
      setEtd('');
      setEtdFormatoLatino('');
      setSemana(null);
    }
  };

  // Cuando cambia ETD en formato latinoamericano (texto manual), calcular semana
  useEffect(() => {
    if (etdFormatoLatino) {
      const fecha = parsearFechaLatinoamericana(etdFormatoLatino);
      if (fecha) {
        const semanaCalculada = calcularSemana(fecha);
        setSemana(semanaCalculada);
        // Convertir a formato ISO para el backend
        const año = fecha.getFullYear();
        const mes = String(fecha.getMonth() + 1).padStart(2, '0');
        const dia = String(fecha.getDate()).padStart(2, '0');
        setEtd(`${año}-${mes}-${dia}`);
      } else {
        setSemana(null);
        setEtd('');
      }
    } else if (!etd) {
      setSemana(null);
    }
  }, [etdFormatoLatino, etd]);

  const agregarEscala = () => {
    const nuevaEscala: EscalaForm = {
      puerto: '',
      puerto_nombre: '',
      eta: '',
      orden: escalas.length + 1,
      area: 'ASIA', // Valor por defecto
      esPuertoNuevo: false,
      ajusteDias: 0, // Inicializar ajuste en 0
    };
    setEscalas([...escalas, nuevaEscala]);
  };

  const eliminarEscala = (index: number) => {
    const nuevasEscalas = escalas.filter((_, i) => i !== index).map((e, i) => ({ ...e, orden: i + 1 }));
    setEscalas(nuevasEscalas);
  };

  const actualizarEscala = (index: number, campo: keyof EscalaForm, valor: string | boolean | number) => {
    const nuevasEscalas = [...escalas];
    const escalaOriginal = escalas[index];
    
    // Si se ajusta días de tránsito, calcular primero ANTES de actualizar el estado
    if (campo === 'ajusteDias' && typeof valor === 'number') {
      // Si no hay ETA, no se puede ajustar
      if (!escalaOriginal.eta) {
        return;
      }
      
      try {
        // Obtener la ETA base: si existe etaBase, usarla; si no, calcularla desde la ETA actual
        let etaBase = escalaOriginal.etaBase;
        
        if (!etaBase) {
          // Primera vez que se ajusta: necesitamos obtener la ETA original
          // Si hay un ajuste previo, revertirlo para obtener la base
          if (escalaOriginal.ajusteDias && escalaOriginal.ajusteDias !== 0) {
            // Revertir el ajuste previo para obtener la base
            const etaActual = new Date(escalaOriginal.eta);
            etaActual.setDate(etaActual.getDate() - escalaOriginal.ajusteDias);
            const año = etaActual.getFullYear();
            const mes = String(etaActual.getMonth() + 1).padStart(2, '0');
            const dia = String(etaActual.getDate()).padStart(2, '0');
            etaBase = `${año}-${mes}-${dia}`;
          } else {
            // No hay ajuste previo, usar la ETA actual como base
            etaBase = escalaOriginal.eta;
          }
        }
        
        // Calcular nueva ETA desde la ETA base + el nuevo ajuste
        // Parsear fecha en zona horaria local para evitar problemas
        let etaBaseDate: Date;
        if (etaBase.includes('T')) {
          // Formato ISO, extraer solo la fecha
          const fechaISO = new Date(etaBase);
          etaBaseDate = new Date(fechaISO.getFullYear(), fechaISO.getMonth(), fechaISO.getDate(), 12, 0, 0);
        } else {
          // Formato YYYY-MM-DD, crear fecha en zona horaria local
          const [año, mes, dia] = etaBase.split('-');
          etaBaseDate = new Date(parseInt(año), parseInt(mes) - 1, parseInt(dia), 12, 0, 0);
        }
        
        if (isNaN(etaBaseDate.getTime())) {
          console.error('❌ ETA base inválida:', etaBase);
          return;
        }
        
        const nuevaEta = new Date(etaBaseDate);
        nuevaEta.setDate(nuevaEta.getDate() + valor);
        
        // Formatear fecha en formato YYYY-MM-DD
        const año = nuevaEta.getFullYear();
        const mes = String(nuevaEta.getMonth() + 1).padStart(2, '0');
        const dia = String(nuevaEta.getDate()).padStart(2, '0');
        const fechaFormateada = `${año}-${mes}-${dia}`;
        
        // Actualizar la escala con el nuevo ajuste y ETA, preservando etaBase
        nuevasEscalas[index] = {
          ...escalaOriginal,
          ajusteDias: valor,
          eta: fechaFormateada,
          etaBase: etaBase, // Preservar o establecer etaBase
        };
        setEscalas(nuevasEscalas);
        return; // Salir temprano para evitar procesamiento adicional
      } catch (error) {
        console.error('❌ Error calculando nueva ETA:', error);
      }
    }
    
    // Si se actualiza la ETA manualmente, guardar como etaBase si no existe
    if (campo === 'eta' && typeof valor === 'string' && valor && !escalaOriginal.etaBase) {
      nuevasEscalas[index] = { ...escalaOriginal, [campo]: valor, etaBase: valor };
    } else {
      nuevasEscalas[index] = { ...escalaOriginal, [campo]: valor };
    }
    
    // Si se selecciona un puerto existente, actualizar el nombre
    if (campo === 'puerto' && typeof valor === 'string') {
      if (valor === '__nuevo__') {
        nuevasEscalas[index].esPuertoNuevo = true;
        nuevasEscalas[index].puerto = '';
        nuevasEscalas[index].puerto_nombre = '';
      } else if (valor && pods.includes(valor)) {
        nuevasEscalas[index].esPuertoNuevo = false;
        nuevasEscalas[index].puerto = valor;
        nuevasEscalas[index].puerto_nombre = valor; // Usar el mismo nombre del POD
      } else if (valor && nuevasEscalas[index].esPuertoNuevo) {
        // Si es un puerto nuevo, usar el valor como nombre también
        nuevasEscalas[index].puerto_nombre = valor;
      }
    }
    
    setEscalas(nuevasEscalas);
  };

  const calcularDiasTransito = (etd: string, eta: string): number => {
    if (!etd || !eta) return 0;
    
    try {
      // Parsear fechas en zona horaria local para evitar problemas de UTC
      let fechaETD: Date;
      let fechaETA: Date;
      
      // Parsear ETD
      if (etd.includes('T')) {
        // Formato ISO, extraer solo la fecha y crear en zona horaria local
        const fechaISO = new Date(etd);
        fechaETD = new Date(fechaISO.getFullYear(), fechaISO.getMonth(), fechaISO.getDate(), 12, 0, 0);
      } else if (etd.includes('/')) {
        // Formato DD/MM/YYYY
        const fechaParseada = parsearFechaLatinoamericana(etd);
        if (fechaParseada) {
          fechaETD = fechaParseada;
        } else {
          fechaETD = new Date(etd);
        }
      } else {
        // Formato YYYY-MM-DD, crear fecha en zona horaria local
        const [año, mes, dia] = etd.split('-');
        fechaETD = new Date(parseInt(año), parseInt(mes) - 1, parseInt(dia), 12, 0, 0);
      }
      
      // Parsear ETA
      if (eta.includes('T')) {
        // Formato ISO, extraer solo la fecha y crear en zona horaria local
        const fechaISO = new Date(eta);
        fechaETA = new Date(fechaISO.getFullYear(), fechaISO.getMonth(), fechaISO.getDate(), 12, 0, 0);
      } else if (eta.includes('/')) {
        // Formato DD/MM/YYYY
        const fechaParseada = parsearFechaLatinoamericana(eta);
        if (fechaParseada) {
          fechaETA = fechaParseada;
        } else {
          fechaETA = new Date(eta);
        }
      } else {
        // Formato YYYY-MM-DD, crear fecha en zona horaria local
        const [año, mes, dia] = eta.split('-');
        fechaETA = new Date(parseInt(año), parseInt(mes) - 1, parseInt(dia), 12, 0, 0);
      }
      
      // Verificar que las fechas sean válidas
      if (isNaN(fechaETD.getTime()) || isNaN(fechaETA.getTime())) {
        return 0;
      }
      
      // Calcular diferencia en milisegundos
      const diffTime = fechaETA.getTime() - fechaETD.getTime();
      
      // Convertir a días (usar Math.round para redondear correctamente)
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays >= 0 ? diffDays : 0;
    } catch (error) {
      console.error('Error calculando días de tránsito:', error);
      return 0;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setItinerarioResultado(null);

    const servicioFinal = esServicioNuevo ? servicioNuevo.trim() : servicioNombre;
    const naveFinal = esNaveNueva ? naveNueva.trim() : nave;

    if (!servicioFinal || !naviera || !naveFinal || !viaje.trim() || !pol.trim() || !etd) {
      setErrorMessage('Completa todos los campos requeridos.');
      return;
    }

    // Validar que la nave seleccionada pertenezca al servicio (si hay servicio seleccionado)
    if (servicioId && navesPorServicio[servicioId] && !navesPorServicio[servicioId].includes(naveFinal)) {
      setErrorMessage(`La nave "${naveFinal}" no está asignada al servicio seleccionado.`);
      return;
    }

    if (escalas.length === 0) {
      setErrorMessage('Agrega al menos una escala (POD).');
      return;
    }

    const escalasValidadas = escalas.filter(e => e.puerto && e.eta);
    if (escalasValidadas.length === 0) {
      setErrorMessage('Todas las escalas deben tener puerto y fecha ETA.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Si es una nave nueva, guardarla en catalogos_naves usando la API
      if (esNaveNueva && naveNueva.trim() && naviera) {
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
          const response = await fetch(`${apiUrl}/api/admin/catalogos/naves`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nombre: naveNueva.trim(),
              naviera_nombre: naviera,
            }),
          });

          if (response.ok) {
            // Actualizar el mapping local
            const nuevoMapping = { ...navesPorNaviera };
            if (!nuevoMapping[naviera]) {
              nuevoMapping[naviera] = [];
            }
            if (!nuevoMapping[naviera].includes(naveNueva.trim())) {
              nuevoMapping[naviera].push(naveNueva.trim());
              nuevoMapping[naviera].sort();
              setNavesPorNaviera(nuevoMapping);
            }
          } else {
            const errorData = await response.json().catch(() => ({}));
            console.error('Error guardando nueva nave:', errorData);
            // No fallar el proceso, solo loguear el error
          }
        } catch (error) {
          console.error('Error al llamar a la API para guardar nave:', error);
          // No fallar el proceso, solo loguear el error
        }
      }

      // Guardar nuevos PODs en catalogos_destinos
      const podsNuevos = escalasValidadas
        .filter(e => e.esPuertoNuevo && e.puerto && e.puerto.trim())
        .map(e => e.puerto.trim());

      if (podsNuevos.length > 0) {
        const supabase = createClient();
        for (const podNuevo of podsNuevos) {
          try {
            // Verificar si el POD ya existe
            const { data: existingPod, error: checkError } = await supabase
              .from('catalogos_destinos')
              .select('id')
              .eq('nombre', podNuevo)
              .maybeSingle();

          if (checkError) {
            console.error('Error verificando POD existente:', checkError);
            // Continuar intentando insertar
          }

          if (!existingPod) {
            // Solo insertar si no existe - usar solo campos esenciales
            const { data: insertedPod, error: podError } = await supabase
              .from('catalogos_destinos')
              .insert({
                nombre: podNuevo,
                activo: true,
              })
              .select('id')
              .single();

            if (podError) {
              console.error('Error guardando nuevo POD:', {
                message: podError.message,
                code: podError.code,
                details: podError.details,
                hint: podError.hint,
                error: podError
              });
              
              // Si el error es de constraint único, el POD ya existe, intentar actualizar
              if (podError.code === '23505') {
                const { error: updateError } = await supabase
                  .from('catalogos_destinos')
                  .update({
                    activo: true,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('nombre', podNuevo);

                if (updateError) {
                  console.error('Error actualizando POD existente:', updateError);
                } else {
                  // Actualizar la lista local de PODs
                  if (!pods.includes(podNuevo)) {
                    setPods([...pods, podNuevo].sort());
                  }
                }
              }
            } else if (insertedPod) {
              // Actualizar la lista local de PODs
              if (!pods.includes(podNuevo)) {
                setPods([...pods, podNuevo].sort());
              }
            }
          } else {
            // Si ya existe, actualizar activo si es necesario
            const { error: updateError } = await supabase
              .from('catalogos_destinos')
              .update({
                activo: true,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingPod.id);

            if (updateError) {
              console.error('Error actualizando POD:', {
                message: updateError.message,
                code: updateError.code,
                details: updateError.details,
                hint: updateError.hint,
                error: updateError
              });
            } else {
              // Actualizar la lista local de PODs
              if (!pods.includes(podNuevo)) {
                setPods([...pods, podNuevo].sort());
              }
            }
          }
        } catch (error: any) {
          console.error('Error inesperado guardando POD:', {
            message: error?.message,
            error: error
          });
        }
      }
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      // Determinar si es un consorcio o servicio único
      const servicioSeleccionado = serviciosExistentes.find(s => s.id === servicioId);
      const esConsorcio = servicioSeleccionado?.tipo === 'consorcio';
      
      const payload = {
        servicio: servicioFinal,
        // NO incluir servicio_id porque la foreign key apunta a la tabla servicios (antigua),
        // pero los IDs vienen de servicios_unicos o consorcios (tablas nuevas).
        // Solo usar el campo servicio (texto) para compatibilidad.
        servicio_id: null,
        // Si es consorcio, usar el nombre del consorcio; si no, usar el consorcio del servicio único
        consorcio: esConsorcio ? servicioFinal : (servicioSeleccionado?.consorcio || null),
        naviera: naviera || null, // Naviera seleccionada
        nave: naveFinal,
        viaje: viaje.trim(),
        semana,
        pol: pol.trim(),
        etd,
        escalas: escalasValidadas.map(e => ({
          puerto: e.puerto.trim(),
          puerto_nombre: e.puerto_nombre?.trim() || e.puerto.trim() || null,
          eta: e.eta,
          orden: e.orden,
          area: e.area || 'ASIA',
        })),
      };
      
      
      const response = await fetch(`${apiUrl}/api/admin/itinerarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) {
        const errorMessage = result?.error || 'No se pudo guardar el itinerario.';
        const errorDetails = result?.details ? `\nDetalles: ${result.details}` : '';
        const errorCode = result?.code ? `\nCódigo: ${result.code}` : '';
        console.error('Error al crear itinerario:', { error: errorMessage, details: errorDetails, code: errorCode, payload });
        throw new Error(`${errorMessage}${errorDetails}${errorCode}`);
      }

      setSuccessMessage('Itinerario guardado exitosamente.');
      setItinerarioResultado(result.itinerario);
      setServicioIdDelItinerario(servicioId); // Guardar el servicioId usado para obtener navieras
      
      // Llamar callback si existe (recargar inmediatamente)
      if (onSuccess) {
        // Llamar inmediatamente para recargar la lista
        onSuccess();
      }
      
      // Limpiar formulario (pero mantener el servicio para que pueda cargar escalas automáticamente)
      setServicioNuevo('');
      setEsServicioNuevo(false);
      setNave('');
      setNaveNueva('');
      setEsNaveNueva(false);
      setViaje('');
      setSemana(null);
      setEtd('');
      setEtdFormatoLatino('');
      setEscalas([]); // Limpiar escalas para que se recarguen automáticamente si hay servicio
      
      // Recargar servicios desde la API
      try {
        const serviciosResponse = await fetch(`${apiUrl}/api/admin/servicios`);
        const serviciosResult = await serviciosResponse.json();
        if (serviciosResponse.ok && serviciosResult.servicios) {
          const serviciosList = serviciosResult.servicios
            .filter((s: any) => s.activo)
            .map((s: any) => ({
              id: s.id,
              nombre: s.nombre,
              consorcio: s.consorcio,
            }))
            .sort((a: any, b: any) => a.nombre.localeCompare(b.nombre));
          
          setServiciosExistentes(serviciosList);

          const navesPorServicioMap: Record<string, string[]> = {};
          serviciosResult.servicios.forEach((servicio: any) => {
            if (servicio.naves && Array.isArray(servicio.naves)) {
              navesPorServicioMap[servicio.id] = servicio.naves
                .filter((n: any) => n.activo)
                .map((n: any) => n.nave_nombre)
                .sort();
            }
          });
          setNavesPorServicio(navesPorServicioMap);
        }
      } catch (error) {
        console.error('Error recargando servicios:', error);
      }
    } catch (error: any) {
      setErrorMessage(error?.message || 'Error inesperado al guardar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formTone = theme === 'dark'
    ? 'bg-slate-950/70 border-slate-800/70 text-slate-100'
    : 'bg-white border-gray-200 text-gray-900';

  const inputTone = theme === 'dark'
    ? 'bg-slate-900/60 border-slate-700/70 text-slate-100 placeholder:text-slate-500 focus:border-sky-500/60 focus:ring-sky-500/30'
    : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-blue-500/60 focus:ring-blue-500/30';

  return (
    <div className="mx-auto max-w-6xl">
      <form onSubmit={handleSubmit} className={`border p-6 sm:p-8 ${formTone}`}>
        <div className="flex flex-col gap-2 border-b pb-4 mb-6">
          <h2 className="text-lg sm:text-xl font-semibold">Crear nuevo itinerario</h2>
          <p className="text-sm opacity-70">
            Ingresa la información del itinerario y sus escalas (PODs).
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loadingCatalogos && serviciosExistentes.length === 0 && (
            <div className="col-span-full text-center py-4 text-xs opacity-60">
              Cargando catálogos...
            </div>
          )}
          <label className="text-xs font-semibold uppercase tracking-wide">
            Servicio
            <div className="mt-2 flex gap-2">
              <select
                value={esServicioNuevo ? '' : servicioId}
                onChange={(e) => {
                  if (e.target.value === '__nuevo__') {
                    setEsServicioNuevo(true);
                    setServicioId('');
                    setServicioNombre('');
                  } else if (e.target.value === '__gestionar__') {
                    setShowServiciosManager(true);
                  } else {
                    setEsServicioNuevo(false);
                    setServicioId(e.target.value);
                    const servicioSeleccionado = serviciosExistentes.find(s => s.id === e.target.value);
                    setServicioNombre(servicioSeleccionado?.nombre || '');
                  }
                }}
                disabled={esServicioNuevo || loadingCatalogos}
                className={`flex-1 border px-3 py-2 text-sm outline-none focus:ring-2 ${inputTone} ${(esServicioNuevo || loadingCatalogos) ? 'opacity-50' : ''}`}
              >
                <option value="">Selecciona servicio</option>
                {serviciosExistentes.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.tipo === 'servicio_unico' && s.consorcio 
                      ? `${s.nombre} (${s.consorcio})` 
                      : s.nombre}
                  </option>
                ))}
                <option value="__nuevo__">+ Nuevo servicio</option>
                <option value="__gestionar__">⚙️ Gestionar servicios</option>
              </select>
            </div>
              {esServicioNuevo && (
                <input
                  type="text"
                  value={servicioNuevo}
                  onChange={(e) => setServicioNuevo(e.target.value)}
                  className={`mt-2 w-full border px-3 py-2 text-sm outline-none focus:ring-2 ${inputTone}`}
                  placeholder="Escribe el nuevo servicio"
                  required
                />
              )}
              {servicioId && navesPorServicio[servicioId] && (
                <p className="mt-1 text-[10px] opacity-60">
                  Naves disponibles: {navesPorServicio[servicioId] ? navesPorServicio[servicioId].length : 0}
                  {!navesPorServicio[servicioId] && (
                    <span className="text-orange-500 ml-1">(Verificando...)</span>
                  )}
                </p>
              )}
            </label>

            <label className="text-xs font-semibold uppercase tracking-wide">
              Naviera
              <select
                value={naviera}
                onChange={(e) => setNaviera(e.target.value)}
                className={`mt-2 w-full border px-3 py-2 text-sm outline-none focus:ring-2 ${inputTone}`}
                required
                disabled={loadingCatalogos || !servicioId || navierasDisponibles.length === 0}
              >
                <option value="">
                  {!servicioId 
                    ? 'Selecciona servicio primero' 
                    : navierasDisponibles.length === 0 
                      ? 'No hay navieras disponibles' 
                      : 'Selecciona naviera'}
                </option>
                {navierasDisponibles.map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              {servicioId && navierasDisponibles.length > 0 && (
                <p className="mt-1 text-[10px] opacity-60">
                  Navieras del servicio: {navierasDisponibles.length}
                </p>
              )}
            </label>

            <label className="text-xs font-semibold uppercase tracking-wide">
              Nave
              {naviera ? (
                <>
                  <div className="mt-2 flex gap-2">
                    <select
                      value={esNaveNueva ? '' : nave}
                      onChange={(e) => {
                        if (e.target.value === '__nueva__') {
                          setEsNaveNueva(true);
                          setNave('');
                        } else {
                          setEsNaveNueva(false);
                          setNave(e.target.value);
                        }
                      }}
                      disabled={esNaveNueva || loadingCatalogos}
                      className={`flex-1 border px-3 py-2 text-sm outline-none focus:ring-2 ${inputTone} ${(esNaveNueva || loadingCatalogos) ? 'opacity-50' : ''}`}
                    >
                      <option value="">Selecciona nave</option>
                      {navesDisponibles.length > 0 ? (
                        navesDisponibles.map(n => (
                          <option key={n} value={n}>{n}</option>
                        ))
                      ) : (
                        <option value="" disabled>
                          {servicioId ? 'No hay naves asignadas a este servicio' : 'Selecciona una naviera primero'}
                        </option>
                      )}
                      <option value="__nueva__">+ Nueva nave</option>
                    </select>
                  </div>
                  {esNaveNueva && (
                    <input
                      type="text"
                      value={naveNueva}
                      onChange={(e) => setNaveNueva(e.target.value)}
                      className={`mt-2 w-full border px-3 py-2 text-sm outline-none focus:ring-2 ${inputTone}`}
                      placeholder={`Escribe la nueva nave para ${naviera}`}
                      required
                    />
                  )}
                </>
              ) : (
                <input
                  type="text"
                  value=""
                  disabled
                  className={`mt-2 w-full border px-3 py-2 text-sm outline-none ${inputTone} opacity-50 cursor-not-allowed`}
                  placeholder="Selecciona una naviera primero"
                />
              )}
            </label>

          <label className="text-xs font-semibold uppercase tracking-wide">
            Número de Viaje
            <input
              type="text"
              value={viaje}
              onChange={(e) => setViaje(e.target.value)}
              className={`mt-2 w-full border px-3 py-2 text-sm outline-none focus:ring-2 ${inputTone}`}
              placeholder="Ej: FA606R"
              required
            />
          </label>

          {/* Campo Semana oculto - se calcula y guarda automáticamente */}
          <input type="hidden" value={semana || ''} />

          <label className="text-xs font-semibold uppercase tracking-wide">
            POL (Puerto de Origen)
            <select
              value={pol}
              onChange={(e) => setPol(e.target.value)}
              className={`mt-2 w-full border px-3 py-2 text-sm outline-none focus:ring-2 ${inputTone}`}
              required
              disabled={loadingCatalogos && pols.length === 0}
            >
              <option value="">
                {loadingCatalogos && pols.length === 0 ? 'Cargando POLs...' : 'Selecciona POL'}
              </option>
              {pols.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold uppercase tracking-wide">
            ETD (Fecha de Zarpe)
            <div className="mt-2 relative">
              <input
                type="text"
                value={etdFormatoLatino}
                onChange={(e) => setEtdFormatoLatino(e.target.value)}
                className={`w-full border px-3 py-2 pr-10 text-sm outline-none focus:ring-2 ${inputTone}`}
                placeholder="DD/MM/YYYY (ej: 15/03/2024)"
                pattern="\d{2}/\d{2}/\d{4}"
                required
              />
              <button
                type="button"
                onClick={() => etdDateInputRef.current?.showPicker?.()}
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 ${theme === 'dark' ? 'text-slate-400 hover:text-sky-400' : 'text-gray-400 hover:text-blue-600'} transition-colors`}
                title="Abrir calendario"
              >
                <Calendar className="h-4 w-4" />
              </button>
              <input
                ref={etdDateInputRef}
                type="date"
                value={etd}
                onChange={handleEtdDateChange}
                className="absolute opacity-0 pointer-events-none"
                aria-hidden="true"
              />
            </div>
            <p className="mt-1 text-[10px] opacity-60">Formato: DD/MM/YYYY o usa el calendario</p>
          </label>
        </div>

        <div className="mt-6 border-t pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide">Escalas (PODs)</h3>
            <div className="flex items-center gap-2">
              {servicioNombre && !esServicioNuevo && (
                <button
                  type="button"
                  onClick={cargarEscalasDelServicio}
                  className={`flex items-center gap-2 border px-3 py-1.5 text-xs font-semibold transition ${theme === 'dark'
                    ? 'border-blue-500/60 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'
                    : 'border-blue-500 bg-blue-50 text-blue-700 hover:bg-blue-100'
                    }`}
                  title={`Cargar escalas definidas para el servicio "${servicioNombre}"`}
                >
                  <Plus className="h-3 w-3" />
                  Cargar Escalas del Servicio
                </button>
              )}
              <button
                type="button"
                onClick={agregarEscala}
                className={`flex items-center gap-2 border px-3 py-1.5 text-xs font-semibold transition ${theme === 'dark'
                  ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                  : 'border-emerald-500 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
              >
                <Plus className="h-3 w-3" />
                Agregar Escala
              </button>
            </div>
          </div>

          {escalas.length === 0 ? (
            <p className="text-sm opacity-70 text-center py-4">No hay escalas agregadas. Haz clic en "Agregar Escala" para comenzar.</p>
          ) : (
            <div className="grid gap-4">
              {escalas.map((escala, index) => (
                <div key={index} className={`border p-4 ${theme === 'dark' ? 'border-slate-700/60 bg-slate-900' : 'border-gray-300 bg-white'}`}>
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-xs font-semibold uppercase tracking-wide opacity-70">Escala {index + 1}</span>
                    <button
                      type="button"
                      onClick={() => eliminarEscala(index)}
                      className={`p-1 border transition ${theme === 'dark'
                        ? 'border-red-500/60 text-red-400 hover:bg-red-500/20'
                        : 'border-red-300 text-red-600 hover:bg-red-50'
                        }`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="text-xs font-semibold uppercase tracking-wide">
                      Área
                      <select
                        value={escala.area}
                        onChange={(e) => actualizarEscala(index, 'area', e.target.value)}
                        className={`mt-2 w-full border px-3 py-2 text-sm outline-none focus:ring-2 ${inputTone}`}
                        required
                      >
                        {AREAS.map(area => (
                          <option key={area} value={area}>{area}</option>
                        ))}
                      </select>
                    </label>
                    <label className="text-xs font-semibold uppercase tracking-wide">
                      Puerto (POD)
                      {escala.esPuertoNuevo ? (
                        <input
                          type="text"
                          value={escala.puerto}
                          onChange={(e) => actualizarEscala(index, 'puerto', e.target.value)}
                          className={`mt-2 w-full border px-3 py-2 text-sm outline-none focus:ring-2 ${inputTone}`}
                          placeholder="Escribe el nuevo POD"
                          required
                        />
                      ) : (
                        <select
                          value={escala.puerto}
                          onChange={(e) => actualizarEscala(index, 'puerto', e.target.value)}
                          className={`mt-2 w-full border px-3 py-2 text-sm outline-none focus:ring-2 ${inputTone}`}
                          required
                        >
                          <option value="">Selecciona POD</option>
                          {pods.map(pod => (
                            <option key={pod} value={pod}>{pod}</option>
                          ))}
                          <option value="__nuevo__">+ Nuevo POD</option>
                        </select>
                      )}
                    </label>
                    <label className="text-xs font-semibold uppercase tracking-wide">
                      ETA (Fecha de Arribo)
                      <input
                        type="date"
                        value={escala.eta}
                        onChange={(e) => actualizarEscala(index, 'eta', e.target.value)}
                        className={`mt-2 w-full border px-3 py-2 text-sm outline-none focus:ring-2 ${inputTone}`}
                        required
                      />
                    </label>
                  </div>
                  {escala.eta && etd && (
                    <div className="mt-3 space-y-2">
                      <div className="text-xs opacity-70">
                        Días de tránsito: {calcularDiasTransito(etd, escala.eta)} días
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold uppercase tracking-wide flex-1">
                          Ajustar días:
                        </label>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const ajusteActual = escala.ajusteDias || 0;
                              const nuevoAjuste = ajusteActual - 1;
                              actualizarEscala(index, 'ajusteDias', nuevoAjuste);
                            }}
                            className={`px-2 py-1 border text-sm font-bold transition ${theme === 'dark'
                              ? 'border-slate-600 bg-slate-700 text-slate-200 hover:bg-slate-600'
                              : 'border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                            title="Restar 1 día"
                          >
                            −
                          </button>
                          <input
                            type="number"
                            value={escala.ajusteDias ?? 0}
                            onChange={(e) => {
                              const valor = parseInt(e.target.value) || 0;
                              actualizarEscala(index, 'ajusteDias', valor);
                            }}
                            className={`w-16 border px-2 py-1 text-sm text-center outline-none focus:ring-2 ${inputTone}`}
                            placeholder="0"
                            title="Ajuste de días de tránsito (+/-)"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const ajusteActual = escala.ajusteDias || 0;
                              const nuevoAjuste = ajusteActual + 1;
                              actualizarEscala(index, 'ajusteDias', nuevoAjuste);
                            }}
                            className={`px-2 py-1 border text-sm font-bold transition ${theme === 'dark'
                              ? 'border-slate-600 bg-slate-700 text-slate-200 hover:bg-slate-600'
                              : 'border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                            title="Sumar 1 día"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      {escala.ajusteDias && escala.ajusteDias !== 0 && (
                        <div className={`text-xs ${escala.ajusteDias > 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {escala.ajusteDias > 0 ? '+' : ''}{escala.ajusteDias} día{escala.ajusteDias !== 1 && escala.ajusteDias !== -1 ? 's' : ''} de ajuste
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {errorMessage && (
          <div className="mt-4 border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-500">
            {errorMessage}
          </div>
        )}
        {successMessage && (
          <div className="mt-4 border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-500">
            {successMessage}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className={`mt-6 inline-flex items-center justify-center gap-2 border px-5 py-2.5 text-sm font-semibold transition ${theme === 'dark'
            ? 'bg-sky-500 border-sky-500 text-slate-950 hover:bg-sky-400'
            : 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700'
            } ${isSubmitting ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          <Save className="h-4 w-4" />
          {isSubmitting ? 'Guardando...' : 'Guardar Itinerario'}
        </button>
      </form>

          {itinerarioResultado && (
        <div className={`mt-8 border p-6 sm:p-8 ${formTone}`}>
          <div className="flex flex-col gap-2 border-b pb-4 mb-6">
            <h2 className="text-lg sm:text-xl font-semibold">Itinerario Guardado</h2>
            <p className="text-sm opacity-70">Vista previa del itinerario guardado.</p>
          </div>

          <ItinerarioTable
            servicio={itinerarioResultado.servicio}
            consorcio={itinerarioResultado.consorcio}
            nave={itinerarioResultado.nave}
            viaje={itinerarioResultado.viaje}
            semana={itinerarioResultado.semana}
            naviera={itinerarioResultado.naviera || itinerarioResultado.consorcio || ''}
            navierasDelServicio={servicioIdDelItinerario ? navierasPorServicio[servicioIdDelItinerario] || [] : []}
            pol={itinerarioResultado.pol}
            etd={itinerarioResultado.etd}
            escalas={itinerarioResultado.escalas || []}
            theme={theme}
          />
        </div>
      )}

      {/* Modal para gestionar servicios */}
      {showServiciosManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div 
            className={`relative w-full max-w-4xl max-h-[90vh] overflow-hidden border shadow-2xl ${theme === 'dark'
              ? 'bg-slate-800 border-slate-700'
              : 'bg-white border-gray-200'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`flex items-center justify-between px-6 py-4 border-b ${theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-gray-50'}`}>
              <div>
                <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Gestionar Servicios
                </h2>
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                  Crea y administra servicios marítimos y sus naves asignadas
                </p>
              </div>
              <button
                onClick={() => {
                  setShowServiciosManager(false);
                  void cargarCatalogos();
                }}
                className={`inline-flex h-9 w-9 items-center justify-center border transition ${theme === 'dark'
                  ? 'border-slate-700 text-slate-300 hover:border-sky-500/60 hover:text-sky-200 hover:bg-slate-700'
                  : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400 hover:text-gray-900 hover:bg-gray-100'
                }`}
                title="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[calc(90vh-8rem)] p-6">
              <ServiciosManager
                onServicioChange={(id) => {
                  if (id) {
                    setServicioId(id);
                    const servicioSeleccionado = serviciosExistentes.find(s => s.id === id);
                    setServicioNombre(servicioSeleccionado?.nombre || '');
                    setShowServiciosManager(false);
                  }
                }}
                onServicioCreated={() => {
                  // Recargar servicios cuando se crea/actualiza/elimina uno
                  void cargarCatalogos();
                }}
                selectedServicioId={servicioId}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ItinerarioTable({
  servicio,
  consorcio,
  nave,
  viaje,
  semana,
  naviera,
  navierasDelServicio,
  pol,
  etd,
  escalas,
  theme,
}: {
  servicio: string;
  consorcio: string | null;
  nave: string;
  viaje: string;
  semana: number | null;
  naviera: string;
  navierasDelServicio?: string[]; // Navieras que conforman el servicio/consorcio
  pol: string;
  etd: string | null;
  escalas: ItinerarioEscala[];
  theme: string;
}) {
  const formatearFecha = (fechaISO: string | null): string => {
    if (!fechaISO) return '';
    const fecha = new Date(fechaISO);
    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const dia = fecha.getDate();
    const mes = meses[fecha.getMonth()];
    return `${dia}-${mes}`;
  };

  // Ordenar escalas por ETA (de menor a mayor) - orden del primer registro
  const escalasOrdenadas = [...escalas].sort((a, b) => {
    // Ordenar por ETA (fecha de arribo) de menor a mayor
    if (!a.eta && !b.eta) return a.orden - b.orden;
    if (!a.eta) return 1;
    if (!b.eta) return -1;
    return new Date(a.eta).getTime() - new Date(b.eta).getTime();
  });

  // Mostrar navieras del servicio si están disponibles
  const navierasTexto = navierasDelServicio && navierasDelServicio.length > 0
    ? navierasDelServicio.join(' - ')
    : (consorcio || naviera || 'Hapag Lloyd - MSC - ONE');
  

  return (
    <div className="overflow-x-auto">
      <div className={`mb-4 p-3 text-center ${theme === 'dark' ? 'bg-amber-600/20 text-amber-200' : 'bg-amber-100 text-amber-800'}`}>
        <p className="text-sm font-semibold">{navierasTexto}</p>
        {navierasDelServicio && navierasDelServicio.length > 0 && (
          <p className="text-xs mt-1 opacity-75">
            {navierasDelServicio.length > 1 
              ? `Navieras que conforman el servicio (${navierasDelServicio.length})`
              : 'Naviera del servicio'}
          </p>
        )}
      </div>
      <p className="text-center mb-4 text-sm font-medium">Servicio: {servicio}</p>
      
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className={`border p-2 text-left ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-gray-100 border-gray-300'}`}>Nave</th>
            <th className={`border p-2 text-center ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-gray-100 border-gray-300'}`}>Semana</th>
            <th className={`border p-2 text-center ${theme === 'dark' ? 'bg-amber-600/30 border-amber-500/50' : 'bg-amber-200 border-amber-300'}`}>Naviera</th>
            <th className={`border p-2 text-center ${theme === 'dark' ? 'bg-amber-600/30 border-amber-500/50' : 'bg-amber-200 border-amber-300'}`}>POL</th>
            {escalasOrdenadas.map((escala) => (
              <th key={escala.id} className={`border p-2 text-center ${theme === 'dark' ? 'bg-yellow-600/30 border-yellow-500/50' : 'bg-yellow-200 border-yellow-300'}`}>
                {escala.puerto_nombre || escala.puerto}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className={`border p-2 ${theme === 'dark' ? 'border-slate-700' : 'border-gray-300'}`}>
              <div>
                <div className="font-semibold">{nave} v.{viaje}</div>
                <div className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>DIAS DE TRANSITO</div>
              </div>
            </td>
            <td className={`border p-2 text-center ${theme === 'dark' ? 'border-slate-700' : 'border-gray-300'}`}>{semana || '-'}</td>
            <td className={`border p-2 text-center ${theme === 'dark' ? 'bg-amber-600/20 border-amber-500/50' : 'bg-amber-100 border-amber-300'}`}>{naviera}</td>
            <td className={`border p-2 text-center ${theme === 'dark' ? 'bg-amber-600/20 border-amber-500/50' : 'bg-amber-100 border-amber-300'}`}>
              {etd ? formatearFecha(etd) : '-'}
            </td>
            {escalasOrdenadas.map((escala) => (
              <td key={escala.id} className={`border p-2 text-center ${theme === 'dark' ? 'bg-yellow-600/20 border-yellow-500/50' : 'bg-yellow-100 border-yellow-300'}`}>
                <div>{formatearFecha(escala.eta)}</div>
                <div className={`text-xs font-semibold ${theme === 'dark' ? 'text-yellow-300' : 'text-yellow-700'}`}>
                  {escala.dias_transito || 0} días
                </div>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
