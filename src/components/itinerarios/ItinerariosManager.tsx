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
  const [serviciosExistentes, setServiciosExistentes] = useState<Array<{ id: string; nombre: string; consorcio: string | null }>>([]);
  const [navesPorServicio, setNavesPorServicio] = useState<Record<string, string[]>>({}); // Mapa servicio_id -> naves[]
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

  // Función para cargar catálogos desde la base de datos
  const cargarCatalogos = async () => {
      try {
        setLoadingCatalogos(true);
        const supabase = createClient();

        // 1. Cargar navieras desde catalogos_navieras
        const { data: navierasData, error: navierasError } = await supabase
          .from('catalogos_navieras')
          .select('nombre')
          .eq('activo', true)
          .order('nombre');

        if (!navierasError && navierasData) {
          const navierasList = navierasData.map((n: any) => n.nombre).filter(Boolean);
          setNavieras(navierasList);
          if (navierasList.length > 0 && !naviera) {
            setNaviera(navierasList[0]);
          }
        }

        // 2. Cargar naves desde catalogos_naves
        const { data: navesData, error: navesError } = await supabase
          .from('catalogos_naves')
          .select('nombre, naviera_nombre')
          .eq('activo', true)
          .order('nombre');

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

        // 3. Cargar POLs desde registros
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

        // 4. Cargar PODs desde catalogos_destinos
        const { data: destinosData, error: destinosError } = await supabase
          .from('catalogos_destinos')
          .select('nombre')
          .eq('activo', true)
          .order('nombre');

        if (!destinosError && destinosData) {
          const podsList = destinosData.map((d: any) => d.nombre).filter(Boolean);
          setPods(podsList);
        } else {
          // Si no hay en catalogos_destinos, cargar desde registros como respaldo
          const { data: registrosPodsData } = await supabase
            .from('registros')
            .select('pod')
            .not('pod', 'is', null)
            .is('deleted_at', null);

          if (registrosPodsData) {
            const podsUnicos = Array.from(new Set(registrosPodsData.map((r: any) => r.pod).filter(Boolean))).sort() as string[];
            setPods(podsUnicos);
          }
        }

        // 5. Cargar servicios desde la tabla servicios
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
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

            // Crear mapa de servicio_id -> naves[]
            const navesPorServicioMap: Record<string, string[]> = {};
            serviciosResult.servicios.forEach((servicio: any) => {
              if (servicio.naves && Array.isArray(servicio.naves)) {
                navesPorServicioMap[servicio.id] = servicio.naves
                  .filter((n: any) => n.activo)
                  .map((n: any) => n.nave_nombre)
                  .sort();
              }
            });
            console.log('📦 Mapa de naves por servicio cargado:', navesPorServicioMap);
            setNavesPorServicio(navesPorServicioMap);
          }
        } catch (error) {
          console.error('Error cargando servicios:', error);
          // Fallback: cargar desde itinerarios si la tabla servicios no existe aún
          const { data: itinerariosData } = await supabase
            .from('itinerarios')
            .select('servicio, consorcio')
            .not('servicio', 'is', null)
            .order('created_at', { ascending: false });

          if (itinerariosData) {
            const serviciosUnicos = Array.from(
              new Set(itinerariosData.map((i: any) => i.servicio).filter(Boolean))
            ).sort() as string[];
            
            setServiciosExistentes(
              serviciosUnicos.map(nombre => ({ id: '', nombre, consorcio: null }))
            );
          }
        }
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

  // Naves disponibles: si hay servicio seleccionado, mostrar naves del servicio; si no, mostrar todas de la naviera
  const navesDisponibles = useMemo(() => {
    console.log('🔍 Calculando naves disponibles:', {
      servicioId,
      servicioNombre,
      tieneMapa: !!navesPorServicio[servicioId],
      navesEnMapa: servicioId ? navesPorServicio[servicioId] : null,
      naviera,
      navesPorNaviera: naviera ? navesPorNaviera[naviera] : null,
      todasLasClaves: Object.keys(navesPorServicio)
    });
    
    // Si hay servicio seleccionado, mostrar todas las naves del servicio
    if (servicioId && navesPorServicio[servicioId]) {
      const navesDelServicio = navesPorServicio[servicioId];
      console.log('✅ Naves del servicio encontradas:', navesDelServicio);
      
      // Si también hay naviera seleccionada, filtrar para mostrar solo las naves que pertenecen a ambas
      if (naviera && navesPorNaviera[naviera] && navesPorNaviera[naviera].length > 0) {
        const navesFiltradas = navesDelServicio.filter(nave => 
          navesPorNaviera[naviera].includes(nave)
        );
        console.log('🔍 Naves filtradas por naviera:', navesFiltradas);
        // Si hay naves filtradas, mostrarlas; si no, mostrar todas las del servicio
        return navesFiltradas.length > 0 ? navesFiltradas : navesDelServicio;
      }
      // Si no hay naviera o no hay naves de la naviera, mostrar todas las del servicio
      return navesDelServicio;
    }
    
    // Si hay servicio pero no hay naves en el mapa, mostrar mensaje de depuración
    if (servicioId && !navesPorServicio[servicioId]) {
      console.warn('⚠️ Servicio seleccionado pero no hay naves en el mapa:', {
        servicioId,
        serviciosEnMapa: Object.keys(navesPorServicio)
      });
    }
    
    // Si no hay servicio seleccionado, mostrar todas las naves de la naviera
    if (!naviera) return [];
    return navesPorNaviera[naviera] || [];
  }, [servicioId, servicioNombre, naviera, navesPorNaviera, navesPorServicio]);

  // Cuando cambia la naviera o el servicio, resetear nave
  useEffect(() => {
    if (naviera || servicioId) {
      setNave('');
      setEsNaveNueva(false);
      setNaveNueva('');
    }
  }, [naviera, servicioId]);

  // Función para cargar escalas del servicio desde servicios_escalas
  const cargarEscalasDelServicio = async () => {
    if (!servicioId || esServicioNuevo) {
      setErrorMessage('Por favor selecciona un servicio primero.');
      return;
    }

    try {
      setErrorMessage(null);
      setSuccessMessage(null);
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const response = await fetch(`${apiUrl}/api/admin/servicios`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || 'Error al cargar servicios');
      }

      if (!result.servicios || !Array.isArray(result.servicios)) {
        throw new Error('No se recibieron servicios válidos');
      }

      const servicio = result.servicios.find((s: any) => s.id === servicioId);
      
      if (!servicio) {
        setErrorMessage(`No se encontró el servicio seleccionado.`);
        return;
      }

      console.log('🔍 Servicio encontrado:', {
        id: servicio.id,
        nombre: servicio.nombre,
        escalas: servicio.escalas,
        tieneEscalas: !!servicio.escalas,
        cantidadEscalas: servicio.escalas?.length || 0
      });

      if (!servicio.escalas || !Array.isArray(servicio.escalas) || servicio.escalas.length === 0) {
        setErrorMessage(`El servicio "${servicioNombre || servicio.nombre}" no tiene escalas definidas. Define las escalas en el gestor de servicios primero.`);
        return;
      }

      // Filtrar solo escalas activas y ordenar por orden
      const escalasActivas = servicio.escalas
        .filter((e: any) => e.activo !== false)
        .sort((a: any, b: any) => (a.orden || 0) - (b.orden || 0));

      if (escalasActivas.length === 0) {
        setErrorMessage(`El servicio "${servicioNombre || servicio.nombre}" no tiene escalas activas.`);
        return;
      }

      // Pre-llenar el formulario con las escalas (sin fechas)
      const escalasPrellenadas: EscalaForm[] = escalasActivas.map((escala: any, index: number) => ({
        puerto: escala.puerto || '',
        puerto_nombre: escala.puerto_nombre || escala.puerto || '',
        eta: '', // Sin fecha, el usuario debe completarla
        orden: escala.orden || index + 1,
        area: escala.area || 'ASIA',
        esPuertoNuevo: false,
      }));

      setEscalas(escalasPrellenadas);
      setSuccessMessage(`✅ ${escalasPrellenadas.length} escala(s) cargada(s) del servicio "${servicioNombre || servicio.nombre}". Completa las fechas ETA.`);
      
      console.log('✅ Escalas cargadas:', escalasPrellenadas);
    } catch (error: any) {
      console.error('❌ Error cargando escalas del servicio:', error);
      setErrorMessage(`Error al cargar escalas: ${error?.message || 'Error desconocido'}`);
    }
  };

  // Seleccionar naviera automáticamente cuando se selecciona un servicio
  useEffect(() => {
    if (servicioId && !esServicioNuevo) {
      const servicioSeleccionado = serviciosExistentes.find(s => s.id === servicioId);
      if (servicioSeleccionado?.consorcio && navieras.includes(servicioSeleccionado.consorcio)) {
        setNaviera(servicioSeleccionado.consorcio);
      }
      setServicioNombre(servicioSeleccionado?.nombre || '');
    } else {
      setServicioNombre('');
    }
  }, [servicioId, esServicioNuevo, serviciosExistentes, navieras]);

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
    };
    setEscalas([...escalas, nuevaEscala]);
  };

  const eliminarEscala = (index: number) => {
    const nuevasEscalas = escalas.filter((_, i) => i !== index).map((e, i) => ({ ...e, orden: i + 1 }));
    setEscalas(nuevasEscalas);
  };

  const actualizarEscala = (index: number, campo: keyof EscalaForm, valor: string | boolean) => {
    const nuevasEscalas = [...escalas];
    nuevasEscalas[index] = { ...nuevasEscalas[index], [campo]: valor };
    
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
    const fechaETD = new Date(etd);
    const fechaETA = new Date(eta);
    const diffTime = fechaETA.getTime() - fechaETD.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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
      const supabase = createClient();

      // Si es una nave nueva, guardarla en catalogos_naves
      if (esNaveNueva && naveNueva.trim() && naviera) {
        const naveData = {
          nombre: naveNueva.trim(),
          naviera_nombre: naviera,
          activo: true,
        };

        // Intentar insertar primero, si falla por duplicado, intentar update
        const { error: insertError } = await supabase
          .from('catalogos_naves')
          .insert(naveData);

        if (insertError) {
          // Si es error de duplicado (23505), intentar update
          if (insertError.code === '23505') {
            const { error: updateError } = await supabase
              .from('catalogos_naves')
              .update({ activo: true })
              .eq('nombre', naveNueva.trim())
              .eq('naviera_nombre', naviera);

            if (updateError) {
              console.error('Error actualizando nave existente:', {
                message: updateError.message,
                code: updateError.code,
                details: updateError.details,
                hint: updateError.hint,
                data: naveData,
              });
            }
          } else {
            console.error('Error guardando nueva nave:', {
              message: insertError.message,
              code: insertError.code,
              details: insertError.details,
              hint: insertError.hint,
              data: naveData,
            });
          }
          // No fallar el proceso, solo loguear el error
        } else {
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
        }
      }

      // Guardar nuevos PODs en catalogos_destinos
      const podsNuevos = escalasValidadas
        .filter(e => e.esPuertoNuevo && e.puerto && e.puerto.trim())
        .map(e => e.puerto.trim());

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

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const response = await fetch(`${apiUrl}/api/admin/itinerarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          servicio: servicioFinal,
          servicio_id: servicioId || null, // Incluir servicio_id si está disponible
          consorcio: naviera, // Consorcio ahora es naviera
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
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || 'No se pudo guardar el itinerario.');
      }

      setSuccessMessage('Itinerario guardado exitosamente.');
      setItinerarioResultado(result.itinerario);
      
      // Llamar callback si existe
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 1500); // Esperar 1.5 segundos para que el usuario vea el mensaje de éxito
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
          console.log('📦 Mapa de naves por servicio recargado:', navesPorServicioMap);
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

        {loadingCatalogos ? (
          <div className="text-center py-8 text-sm opacity-70">Cargando catálogos...</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                  disabled={esServicioNuevo}
                  className={`flex-1 border px-3 py-2 text-sm outline-none focus:ring-2 ${inputTone} ${esServicioNuevo ? 'opacity-50' : ''}`}
                >
                  <option value="">Selecciona servicio</option>
                  {serviciosExistentes.map(s => (
                    <option key={s.id} value={s.id}>{s.nombre}</option>
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
                  Naves disponibles: {navesPorServicio[servicioId].length}
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
              >
                <option value="">Selecciona naviera</option>
                {navieras.map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>

            <label className="text-xs font-semibold uppercase tracking-wide">
              Operador
              <input
                type="text"
                value={naviera}
                readOnly
                className={`mt-2 w-full border px-3 py-2 text-sm outline-none ${inputTone} opacity-60 cursor-not-allowed`}
              />
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
                      disabled={esNaveNueva}
                      className={`flex-1 border px-3 py-2 text-sm outline-none focus:ring-2 ${inputTone} ${esNaveNueva ? 'opacity-50' : ''}`}
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

          <label className="text-xs font-semibold uppercase tracking-wide">
            Semana
            <input
              type="number"
              value={semana || ''}
              readOnly
              className={`mt-2 w-full border px-3 py-2 text-sm outline-none ${inputTone} opacity-60 cursor-not-allowed`}
              placeholder="Se calcula automáticamente"
            />
            <p className="mt-1 text-[10px] opacity-60">Se calcula automáticamente desde ETD</p>
          </label>

          <label className="text-xs font-semibold uppercase tracking-wide">
            POL (Puerto de Origen)
            <select
              value={pol}
              onChange={(e) => setPol(e.target.value)}
              className={`mt-2 w-full border px-3 py-2 text-sm outline-none focus:ring-2 ${inputTone}`}
              required
            >
              <option value="">Selecciona POL</option>
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
        )}

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
                    <div className="mt-2 text-xs opacity-70">
                      Días de tránsito: {calcularDiasTransito(etd, escala.eta)} días
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
            operador={itinerarioResultado.consorcio || ''}
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
  operador,
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
  operador: string;
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

  const escalasOrdenadas = [...escalas].sort((a, b) => a.orden - b.orden);

  return (
    <div className="overflow-x-auto">
      <div className={`mb-4 p-3 text-center ${theme === 'dark' ? 'bg-amber-600/20 text-amber-200' : 'bg-amber-100 text-amber-800'}`}>
        <p className="text-sm font-semibold">{consorcio || 'Hapag Lloyd - MSC - ONE'}</p>
      </div>
      <p className="text-center mb-4 text-sm font-medium">Servicio: {servicio}</p>
      
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className={`border p-2 text-left ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-gray-100 border-gray-300'}`}>Nave</th>
            <th className={`border p-2 text-center ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-gray-100 border-gray-300'}`}>Semana</th>
            <th className={`border p-2 text-center ${theme === 'dark' ? 'bg-amber-600/30 border-amber-500/50' : 'bg-amber-200 border-amber-300'}`}>Operador</th>
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
            <td className={`border p-2 text-center ${theme === 'dark' ? 'bg-amber-600/20 border-amber-500/50' : 'bg-amber-100 border-amber-300'}`}>{operador}</td>
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
