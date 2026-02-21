'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Sun, Moon, X, Ship, Calendar, MapPin, Clock, Navigation, Search, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { ItinerarioFilters } from '@/components/itinerario/ItinerarioFilters';
import { ItinerarioTable } from '@/components/itinerario/ItinerarioTable';
import { ItinerarioCard } from '@/components/itinerario/ItinerarioCard';
import { ItinerarioMap } from '@/components/itinerario/ItinerarioMap';
import { fetchPublicItinerarios } from '@/lib/itinerarios-service';
import type { ItinerarioWithEscalas, ItinerarioFilters as FiltersType } from '@/types/itinerarios';
import { useTheme } from '@/contexts/ThemeContext';
import { Map as MapIcon } from 'lucide-react';

export default function ItinerarioPublicPage() {
  const { theme, toggleTheme } = useTheme();
  const [itinerarios, setItinerarios] = useState<ItinerarioWithEscalas[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FiltersType>({ semanas: 3 });
  const [etaViewMode, setEtaViewMode] = useState<'dias' | 'fecha' | 'ambos'>('dias');
  const [serviciosUnicos, setServiciosUnicos] = useState<any[]>([]);
  const [consorcios, setConsorcios] = useState<any[]>([]);
  const [showMap, setShowMap] = useState(false);
  const [puertoSeleccionadoMapa, setPuertoSeleccionadoMapa] = useState<string | null>(null);
  const [selectedItinerario, setSelectedItinerario] = useState<ItinerarioWithEscalas | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [destinoSearch, setDestinoSearch] = useState('');
  const [destinoSeleccionado, setDestinoSeleccionado] = useState<string | null>(null);
  const [showDestinoDropdown, setShowDestinoDropdown] = useState(false);
  const destinoInputRef = useRef<HTMLInputElement>(null);
  const destinoDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
        
        // Cargar itinerarios, servicios únicos y consorcios en paralelo
        const [itinerariosData, serviciosResponse, consorciosResponse] = await Promise.all([
          fetchPublicItinerarios(),
          fetch(`${apiUrl}/api/admin/servicios-unicos`).then(r => r.json()),
          fetch(`${apiUrl}/api/admin/consorcios`).then(r => r.json())
        ]);
        
        setItinerarios(itinerariosData);
        
        if (serviciosResponse.success && serviciosResponse.servicios) {
          setServiciosUnicos(serviciosResponse.servicios.filter((s: any) => s.activo));
        }
        
        if (consorciosResponse.success && consorciosResponse.consorcios) {
          setConsorcios(consorciosResponse.consorcios);
        }
      } catch (error: any) {
        console.error('Error loading data:', error);
        setError(error?.message || 'Error al cargar datos');
      } finally {
        setIsLoading(false);
      }
    };

    void loadData();
  }, []);

  // Crear lista de servicios para el filtro (servicios únicos + consorcios)
  const serviciosParaFiltro = useMemo(() => {
    const lista: Array<{ id: string; nombre: string; tipo: 'servicio_unico' | 'consorcio'; consorcio?: string }> = [];
    
    // Agregar servicios únicos
    serviciosUnicos.forEach((servicio) => {
      lista.push({
        id: servicio.id,
        nombre: servicio.nombre,
        tipo: 'servicio_unico',
        consorcio: servicio.naviera_nombre || undefined
      });
    });
    
    // Agregar consorcios
    consorcios.forEach((consorcio) => {
      lista.push({
        id: consorcio.id,
        nombre: consorcio.nombre,
        tipo: 'consorcio'
      });
    });
    
    return lista.sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [serviciosUnicos, consorcios]);

  // Mapa de servicio_id a consorcio (para saber qué consorcio contiene un servicio)
  const servicioAConsorcioMap = useMemo(() => {
    const mapa: Record<string, string> = {};
    consorcios.forEach((consorcio) => {
      if (consorcio.servicios) {
        consorcio.servicios.forEach((servicioRel: any) => {
          if (servicioRel.servicio_unico?.id) {
            mapa[servicioRel.servicio_unico.id] = consorcio.nombre;
          }
        });
      }
    });
    return mapa;
  }, [consorcios]);

  // Obtener consorcio del servicio seleccionado
  const consorcioDelServicioSeleccionado = useMemo(() => {
    if (!filters.servicio) return null;
    // Buscar el servicio en la lista
    const servicio = serviciosParaFiltro.find(s => s.nombre === filters.servicio);
    if (servicio && servicio.tipo === 'servicio_unico' && servicio.id) {
      return servicioAConsorcioMap[servicio.id] || null;
    }
    return null;
  }, [filters.servicio, serviciosParaFiltro, servicioAConsorcioMap]);

  // Obtener navieras únicas de los itinerarios
  const navierasUnicas = useMemo(() => {
    const navierasSet = new Set<string>();
    itinerarios.forEach((it) => {
      // Priorizar navierasDelServicio si está disponible
      if (it.navierasDelServicio && it.navierasDelServicio.length > 0) {
        it.navierasDelServicio.forEach((nav: string) => navierasSet.add(nav));
      } else if (it.naviera) {
        navierasSet.add(it.naviera);
      } else if (it.consorcio) {
        // Si no hay naviera específica, usar consorcio como fallback
        navierasSet.add(it.consorcio);
      }
    });
    return Array.from(navierasSet).sort();
  }, [itinerarios]);

  // Obtener regiones únicas disponibles en los itinerarios
  const regionesDisponibles = useMemo(() => {
    if (!itinerarios || itinerarios.length === 0) {
      return [];
    }
    
    const regionesSet = new Set<string>();
    
    // Extraer regiones de todas las escalas
    itinerarios.forEach((it) => {
      if (it.escalas && Array.isArray(it.escalas)) {
        it.escalas.forEach((escala: any) => {
          // Verificar si el campo area existe y tiene valor
          if (escala?.area) {
            const areaValue = typeof escala.area === 'string' 
              ? escala.area.trim() 
              : String(escala.area).trim();
            if (areaValue) {
              regionesSet.add(areaValue.toUpperCase());
            }
          }
        });
      }
    });
    
    return Array.from(regionesSet).sort();
  }, [itinerarios]);

  const pols = useMemo(
    () => Array.from(new Set(itinerarios.map((it) => it.pol))).sort(),
    [itinerarios]
  );

  // Obtener destinos únicos de todos los itinerarios
  const destinosUnicos = useMemo(() => {
    const destinosSet = new Set<string>();
    itinerarios.forEach((it) => {
      if (it.escalas && Array.isArray(it.escalas)) {
        it.escalas.forEach((escala) => {
          const nombrePuerto = escala.puerto_nombre || escala.puerto;
          if (nombrePuerto) {
            destinosSet.add(nombrePuerto);
          }
        });
      }
    });
    return Array.from(destinosSet).sort();
  }, [itinerarios]);

  // Filtrar destinos según búsqueda
  const destinosFiltrados = useMemo(() => {
    if (!destinoSearch.trim()) return destinosUnicos;
    const searchLower = destinoSearch.toLowerCase().trim();
    return destinosUnicos.filter(destino => 
      destino.toLowerCase().includes(searchLower)
    );
  }, [destinosUnicos, destinoSearch]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        destinoDropdownRef.current && 
        !destinoDropdownRef.current.contains(event.target as Node) &&
        destinoInputRef.current &&
        !destinoInputRef.current.contains(event.target as Node)
      ) {
        setShowDestinoDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtrar itinerarios
  const filteredItinerarios = useMemo(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0); // Inicio del día para comparar solo fechas
    
    // Primero aplicar todos los filtros excepto el de semanas
    let filtered = itinerarios.filter((it) => {
      // Filtrar solo itinerarios con ETD >= fecha actual (aún no cumplido)
      if (it.etd) {
        const etdDate = new Date(it.etd);
        etdDate.setHours(0, 0, 0, 0);
        if (etdDate < hoy) return false; // Excluir ETD pasados
      }
      
      // Si hay filtro de servicio
      if (filters.servicio) {
        // Verificar si el servicio seleccionado es parte de un consorcio
        const servicioSeleccionado = serviciosParaFiltro.find(s => s.nombre === filters.servicio);
        if (servicioSeleccionado) {
          // Si el servicio es parte de un consorcio, mostrar todos los itinerarios del consorcio
          if (servicioSeleccionado.tipo === 'servicio_unico' && consorcioDelServicioSeleccionado) {
            // Mostrar itinerarios del consorcio o del servicio específico
            if (it.consorcio !== consorcioDelServicioSeleccionado && it.servicio !== filters.servicio) {
              return false;
            }
          } else if (servicioSeleccionado.tipo === 'consorcio') {
            // Si se seleccionó un consorcio, mostrar todos los itinerarios de ese consorcio
            if (it.servicio !== filters.servicio) {
              return false;
            }
          } else {
            // Servicio único sin consorcio
            if (it.servicio !== filters.servicio) {
              return false;
            }
          }
        } else {
          // Si no se encuentra el servicio, usar comparación directa
          if (it.servicio !== filters.servicio) return false;
        }
      }
      
      if (filters.consorcio && it.consorcio !== filters.consorcio) return false;
      if (filters.pol && it.pol !== filters.pol) return false;
      if (filters.region) {
        // Filtrar por región: el itinerario debe tener al menos una escala con esa región
        // Normalizar ambas partes para comparación consistente
        const regionFilterNormalizada = filters.region.toUpperCase().trim();
        const hasRegion = it.escalas?.some((escala) => {
          if (!escala.area) return false;
          return escala.area.toUpperCase().trim() === regionFilterNormalizada;
        });
        if (!hasRegion) return false;
      }
      // Filtro por puerto del mapa
      if (puertoSeleccionadoMapa) {
        const hasPuerto = it.escalas?.some((escala) => 
          (escala.puerto || escala.puerto_nombre) === puertoSeleccionadoMapa
        );
        if (!hasPuerto) return false;
      }
      // Filtro por destino seleccionado en búsqueda
      if (destinoSeleccionado) {
        const hasDestino = it.escalas?.some((escala) => 
          (escala.puerto_nombre || escala.puerto) === destinoSeleccionado
        );
        if (!hasDestino) return false;
      }
      return true;
    });
    
    // Si hay filtro de semanas, agrupar por servicio y limitar N filas por servicio
    if (filters.semanas && filters.semanas > 0) {
      // Agrupar por servicio
      const groupedByService = new Map<string, typeof filtered>();
      filtered.forEach((it) => {
        const servicioKey = it.servicio || 'sin-servicio';
        if (!groupedByService.has(servicioKey)) {
          groupedByService.set(servicioKey, []);
        }
        groupedByService.get(servicioKey)!.push(it);
      });
      
      // Para cada servicio, ordenar por ETD y limitar a N filas
      const result: typeof filtered = [];
      groupedByService.forEach((items) => {
        // Ordenar por ETD ascendente (primero los más próximos)
        const sorted = items.sort((a, b) => {
          if (!a.etd && !b.etd) return 0;
          if (!a.etd) return 1;
          if (!b.etd) return -1;
          return new Date(a.etd).getTime() - new Date(b.etd).getTime();
        });
        // Limitar a N filas por servicio
        result.push(...sorted.slice(0, filters.semanas));
      });
      
      return result;
    }
    
    // Si no hay filtro de semanas, solo ordenar por ETD
    filtered = filtered.sort((a, b) => {
      if (!a.etd && !b.etd) return 0;
      if (!a.etd) return 1;
      if (!b.etd) return -1;
      return new Date(a.etd).getTime() - new Date(b.etd).getTime();
    });
    
    return filtered;
  }, [itinerarios, filters, serviciosParaFiltro, consorcioDelServicioSeleccionado, puertoSeleccionadoMapa, destinoSeleccionado]);

  return (
    <div className={`min-h-screen w-full ${theme === 'dark' ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950' : 'bg-gray-50'}`}>
      {/* Header - Estilo similar a versión usuario */}
      <header className={`sticky top-0 z-40 border-b backdrop-blur-xl ${theme === 'dark' 
        ? 'border-[#3D3D3D]/50 bg-gradient-to-r from-[#0078D4]/20 via-[#00AEEF]/20 to-[#0078D4]/20' 
        : 'border-[#E1E1E1] bg-gradient-to-r from-[#00AEEF]/10 via-white to-[#00AEEF]/10'
      } shadow-lg`}>
        <div className="w-full px-2 sm:px-4 py-2 sm:py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link href="/" className="flex items-center gap-3 sm:gap-4 group">
              <div className={`p-2 sm:p-2.5 rounded-xl flex-shrink-0 ${theme === 'dark' ? 'bg-[#00AEEF]/20' : 'bg-[#00AEEF]/10'}`}>
                <Ship className={`h-5 w-5 sm:h-6 sm:w-6 ${theme === 'dark' ? 'text-[#4FC3F7]' : 'text-[#00AEEF]'}`} />
              </div>
              <div>
                <p className={`text-[10px] sm:text-[11px] uppercase tracking-[0.2em] sm:tracking-[0.3em] ${theme === 'dark' ? 'text-[#A0A0A0]' : 'text-[#6B6B6B]'}`}>Itinerarios</p>
                <h1 className={`text-lg sm:text-xl md:text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-[#1F1F1F]'}`}>
                  ITINERARIO
                </h1>
                <p className={`text-[11px] sm:text-xs ${theme === 'dark' ? 'text-[#A0A0A0]' : 'text-[#6B6B6B]'}`}>
                  Tentativo semanal por servicio
                </p>
              </div>
            </Link>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {/* Botón Mapa */}
              <button
                onClick={() => {
                  setShowMap(!showMap);
                  if (showMap) {
                    setPuertoSeleccionadoMapa(null);
                  }
                }}
                className={`flex items-center gap-1.5 rounded-xl border px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-md hover:scale-105 active:scale-95 ${showMap
                  ? theme === 'dark'
                    ? 'border-[#00AEEF] bg-gradient-to-r from-[#00AEEF]/30 to-[#0078D4]/30 text-[#4FC3F7] hover:from-[#00AEEF]/40 hover:to-[#0078D4]/40'
                    : 'border-[#00AEEF] bg-gradient-to-r from-[#00AEEF] to-[#0099CC] text-white hover:from-[#0099CC] hover:to-[#0078D4]'
                  : theme === 'dark'
                    ? 'border-[#3D3D3D]/50 bg-[#2D2D2D]/80 text-slate-200 hover:bg-[#3D3D3D] hover:border-[#00AEEF]/50'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-[#00AEEF]'
                }`}
                title={showMap ? 'Ocultar mapa' : 'Ver mapa'}
              >
                <MapIcon className="h-4 w-4" />
                <span className="hidden sm:inline">{showMap ? 'Ocultar Mapa' : 'Ver Mapa'}</span>
              </button>
              {/* Campo de búsqueda de destinos */}
              <div className="relative">
                <div className={`flex items-center gap-1.5 rounded-xl border px-2.5 sm:px-3 py-1.5 sm:py-2 shadow-sm transition-all duration-200 ${
                  showDestinoDropdown || destinoSeleccionado
                    ? theme === 'dark'
                      ? 'border-[#00AEEF] bg-[#2D2D2D]/90 ring-1 ring-[#00AEEF]/30'
                      : 'border-[#00AEEF] bg-white ring-1 ring-[#00AEEF]/30'
                    : theme === 'dark'
                      ? 'border-[#3D3D3D]/50 bg-[#2D2D2D]/80 hover:border-[#00AEEF]/50'
                      : 'border-gray-300 bg-white hover:border-[#00AEEF]'
                }`}>
                  <Search className={`h-4 w-4 flex-shrink-0 ${
                    destinoSeleccionado
                      ? theme === 'dark' ? 'text-[#4FC3F7]' : 'text-[#00AEEF]'
                      : theme === 'dark' ? 'text-slate-400' : 'text-gray-400'
                  }`} />
                  <input
                    ref={destinoInputRef}
                    type="text"
                    placeholder="Buscar destino..."
                    value={destinoSeleccionado || destinoSearch}
                    onChange={(e) => {
                      setDestinoSearch(e.target.value);
                      setDestinoSeleccionado(null);
                      setShowDestinoDropdown(true);
                    }}
                    onFocus={() => setShowDestinoDropdown(true)}
                    className={`w-24 sm:w-36 text-xs sm:text-sm font-medium bg-transparent outline-none placeholder:text-gray-400 ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}
                  />
                  {destinoSeleccionado && (
                    <button
                      onClick={() => {
                        setDestinoSeleccionado(null);
                        setDestinoSearch('');
                      }}
                      className={`p-0.5 rounded-full transition-colors ${
                        theme === 'dark' 
                          ? 'hover:bg-slate-600 text-slate-400 hover:text-white' 
                          : 'hover:bg-gray-200 text-gray-400 hover:text-gray-700'
                      }`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {!destinoSeleccionado && (
                    <ChevronDown className={`h-3.5 w-3.5 flex-shrink-0 transition-transform ${
                      showDestinoDropdown ? 'rotate-180' : ''
                    } ${theme === 'dark' ? 'text-slate-400' : 'text-gray-400'}`} />
                  )}
                </div>
                {/* Dropdown de destinos */}
                {showDestinoDropdown && (
                  <div
                    ref={destinoDropdownRef}
                    className={`absolute top-full left-0 mt-1 w-56 max-h-64 overflow-y-auto rounded-xl border shadow-2xl z-[100] ${
                      theme === 'dark'
                        ? 'border-[#3D3D3D] bg-[#2D2D2D] backdrop-blur-xl'
                        : 'border-gray-200 bg-white backdrop-blur-xl'
                    }`}
                  >
                    {destinosFiltrados.length === 0 ? (
                      <div className={`px-3 py-2 text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                        No se encontraron destinos
                      </div>
                    ) : (
                      destinosFiltrados.map((destino) => (
                        <button
                          key={destino}
                          onClick={() => {
                            setDestinoSeleccionado(destino);
                            setDestinoSearch('');
                            setShowDestinoDropdown(false);
                          }}
                          className={`w-full px-3 py-2 text-left text-xs sm:text-sm transition-colors ${
                            destinoSeleccionado === destino
                              ? theme === 'dark'
                                ? 'bg-[#00AEEF]/20 text-[#4FC3F7]'
                                : 'bg-[#00AEEF]/10 text-[#00AEEF]'
                              : theme === 'dark'
                                ? 'text-slate-200 hover:bg-[#3D3D3D]'
                                : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <MapPin className={`h-3.5 w-3.5 flex-shrink-0 ${
                              theme === 'dark' ? 'text-slate-400' : 'text-gray-400'
                            }`} />
                            <span className="truncate">{destino}</span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              {/* Toggle de vista ETA */}
              <div className={`flex items-center gap-0 border rounded-xl overflow-hidden shadow-sm ${theme === 'dark'
                ? 'border-[#3D3D3D]/50 bg-[#2D2D2D]/80'
                : 'border-gray-300 bg-white'
              }`}>
                <button
                  onClick={() => setEtaViewMode('dias')}
                  className={`px-2.5 py-1.5 text-[10px] sm:text-xs font-semibold transition-all duration-200 ${
                    etaViewMode === 'dias'
                      ? theme === 'dark'
                        ? 'bg-gradient-to-r from-[#00AEEF] to-[#0078D4] text-white shadow-sm'
                        : 'bg-gradient-to-r from-[#00AEEF] to-[#0099CC] text-white shadow-sm'
                      : theme === 'dark'
                        ? 'text-slate-300 hover:bg-[#3D3D3D]'
                        : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title="Mostrar días de tránsito"
                >
                  Días
                </button>
                <button
                  onClick={() => setEtaViewMode('fecha')}
                  className={`px-2.5 py-1.5 text-[10px] sm:text-xs font-semibold transition-all duration-200 border-l ${
                    theme === 'dark' ? 'border-[#3D3D3D]/50' : 'border-gray-300'
                  } ${
                    etaViewMode === 'fecha'
                      ? theme === 'dark'
                        ? 'bg-gradient-to-r from-[#00AEEF] to-[#0078D4] text-white shadow-sm'
                        : 'bg-gradient-to-r from-[#00AEEF] to-[#0099CC] text-white shadow-sm'
                      : theme === 'dark'
                        ? 'text-slate-300 hover:bg-[#3D3D3D]'
                        : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title="Mostrar fecha de llegada"
                >
                  Fecha
                </button>
                <button
                  onClick={() => setEtaViewMode('ambos')}
                  className={`px-2.5 py-1.5 text-[10px] sm:text-xs font-semibold transition-all duration-200 border-l ${
                    theme === 'dark' ? 'border-[#3D3D3D]/50' : 'border-gray-300'
                  } ${
                    etaViewMode === 'ambos'
                      ? theme === 'dark'
                        ? 'bg-gradient-to-r from-[#00AEEF] to-[#0078D4] text-white shadow-sm'
                        : 'bg-gradient-to-r from-[#00AEEF] to-[#0099CC] text-white shadow-sm'
                      : theme === 'dark'
                        ? 'text-slate-300 hover:bg-[#3D3D3D]'
                        : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title="Mostrar días y fecha"
                >
                  Ambos
                </button>
              </div>
              {/* Botón Día/Noche */}
              <button
                onClick={toggleTheme}
                className={`flex items-center gap-1.5 rounded-xl border px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-md hover:scale-105 active:scale-95 ${theme === 'dark'
                  ? 'border-[#3D3D3D]/50 bg-[#2D2D2D]/80 text-slate-200 hover:bg-[#3D3D3D] hover:border-[#00AEEF]/50'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-[#00AEEF]'
                }`}
                title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              >
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">{theme === 'dark' ? 'Claro' : 'Oscuro'}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Pantalla completa */}
      <main className="flex-1 overflow-auto min-w-0 w-full">
        <div className="flex flex-col w-full px-1 sm:px-2 py-2 space-y-2">
          {/* Filtros */}
          <div className="flex-shrink-0 w-full">
            <ItinerarioFilters
              servicios={serviciosParaFiltro.map(s => s.nombre)}
              serviciosCompletos={serviciosParaFiltro}
              consorcios={navierasUnicas}
              consorcioDelServicio={consorcioDelServicioSeleccionado}
              pols={pols}
              regiones={regionesDisponibles}
              filters={filters}
              onFiltersChange={setFilters}
              onReset={() => {
                setFilters({});
                setPuertoSeleccionadoMapa(null);
                setDestinoSeleccionado(null);
                setDestinoSearch('');
              }}
            />
          </div>

          {/* Mapa */}
          {showMap && (
            <div className="flex-shrink-0 w-full h-96 mb-4">
              <ItinerarioMap
                itinerarios={filteredItinerarios}
                onPuertoClick={(puerto) => {
                  setPuertoSeleccionadoMapa(puerto === puertoSeleccionadoMapa ? null : puerto);
                }}
                puertoSeleccionado={puertoSeleccionadoMapa}
              />
            </div>
          )}

          {/* Contenido */}
          <div className="flex-1 min-h-0 overflow-auto w-full">
            {isLoading ? (
              <div className={`h-full flex items-center justify-center rounded-xl border shadow-lg ${theme === 'dark'
                ? 'border-[#3D3D3D]/50 bg-gradient-to-br from-[#2D2D2D] to-[#1F1F1F]'
                : 'border-[#E1E1E1] bg-white'
              }`}>
                <div className="flex flex-col items-center justify-center gap-4">
                  <div className={`relative h-12 w-12 ${theme === 'dark' ? 'text-[#00AEEF]' : 'text-[#00AEEF]'}`}>
                    <div className="absolute inset-0 animate-spin rounded-full border-4 border-t-transparent border-[#00AEEF]/30"></div>
                    <div className="absolute inset-0 animate-spin rounded-full border-4 border-t-transparent border-[#00AEEF] [animation-delay:-0.15s]"></div>
                  </div>
                  <div className="text-center">
                    <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-[#1F1F1F]'}`}>
                      Cargando itinerarios...
                    </p>
                    <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-[#A0A0A0]' : 'text-[#6B6B6B]'}`}>
                      Por favor espera
                    </p>
                  </div>
                </div>
              </div>
            ) : error ? (
              <div className={`h-full flex items-center justify-center rounded-xl border shadow-lg p-8 ${theme === 'dark'
                ? 'border-amber-500/40 bg-gradient-to-br from-amber-900/20 to-[#1F1F1F]'
                : 'border-amber-300 bg-gradient-to-br from-amber-50 to-white'
              }`}>
                <div className="space-y-4 text-center max-w-md">
                  <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-amber-500/20' : 'bg-amber-100'} inline-block`}>
                    <div className={`text-2xl ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`}>
                      ⚠️
                    </div>
                  </div>
                  <div>
                    <h3 className={`text-lg font-bold mb-2 ${theme === 'dark' ? 'text-amber-300' : 'text-amber-700'}`}>
                      Error al cargar
                    </h3>
                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                      {error}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Vista Desktop (Tabla) */}
                <div className="hidden lg:block w-full">
                  <ItinerarioTable
                    itinerarios={filteredItinerarios}
                    onViewDetail={(itinerario) => {
                      setSelectedItinerario(itinerario);
                      setIsDetailModalOpen(true);
                    }}
                    etaViewMode={etaViewMode}
                    hideActionColumn={true}
                    regionFilter={filters.region || null}
                  />
                </div>

                {/* Vista Mobile (Cards) */}
                <div className="lg:hidden space-y-2 w-full">
                  {filteredItinerarios.length === 0 ? (
                    <div className={`flex items-center justify-center py-12 rounded-xl border shadow-sm ${theme === 'dark'
                      ? 'border-[#3D3D3D]/50 bg-gradient-to-br from-[#2D2D2D] to-[#1F1F1F]'
                      : 'border-[#E1E1E1] bg-white'
                    }`}>
                      <div className="text-center">
                        <div className={`p-3 rounded-xl inline-block mb-3 ${theme === 'dark' ? 'bg-[#00AEEF]/20' : 'bg-[#00AEEF]/10'}`}>
                          <Ship className={`h-6 w-6 ${theme === 'dark' ? 'text-[#4FC3F7]' : 'text-[#00AEEF]'}`} />
                        </div>
                        <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-[#1F1F1F]'}`}>
                          No hay itinerarios disponibles
                        </p>
                        <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-[#A0A0A0]' : 'text-[#6B6B6B]'}`}>
                          Intenta ajustar los filtros
                        </p>
                      </div>
                    </div>
                  ) : (
                    (() => {
                      // Función para normalizar nombre de servicio (similar a ItinerarioTable)
                      const normalizarNombreServicio = (nombre: string) => {
                        return nombre.toUpperCase().trim();
                      };

                      // Función para obtener regiones de un itinerario
                      const obtenerRegiones = (it: typeof filteredItinerarios[0]) => {
                        if (!it.escalas || it.escalas.length === 0) {
                          return ['SIN REGIÓN'];
                        }
                        const regionesSet = new Set<string>();
                        it.escalas.forEach((escala) => {
                          if (escala.area) {
                            const region = escala.area.toUpperCase().trim();
                            if (region) {
                              regionesSet.add(region);
                            }
                          }
                        });
                        if (regionesSet.size === 0) {
                          return ['SIN REGIÓN'];
                        }
                        return Array.from(regionesSet).sort();
                      };

                      // Agrupar por servicio y región como en la tabla
                      const grouped = new Map<string, typeof filteredItinerarios>();
                      const regionFilterNormalizado = filters.region 
                        ? filters.region.toUpperCase().trim() 
                        : null;

                      filteredItinerarios.forEach((it) => {
                        const servicioNormalizado = normalizarNombreServicio(it.servicio);
                        const regiones = obtenerRegiones(it);
                        
                        // Si hay un filtro de región, solo usar esa región
                        const regionesParaAgrupar = regionFilterNormalizado 
                          ? regiones.filter(region => region === regionFilterNormalizado)
                          : regiones;
                        
                        // Si no hay regiones para agrupar, saltar este itinerario
                        if (regionesParaAgrupar.length === 0) {
                          return;
                        }
                        
                        // Agregar el itinerario a cada grupo de región correspondiente
                        regionesParaAgrupar.forEach((region) => {
                          const key = `${servicioNormalizado}|||${region}`;
                          if (!grouped.has(key)) {
                            grouped.set(key, []);
                          }
                          grouped.get(key)!.push(it);
                        });
                      });

                      // Ordenar grupos por región y luego por servicio
                      const ordenRegiones: Record<string, number> = {
                        'ASIA': 1,
                        'EUROPA': 2,
                        'AMERICA': 3,
                        'INDIA-MEDIOORIENTE': 4,
                        'INDIA': 4,
                        'MEDIOORIENTE': 4,
                        'SIN REGIÓN': 99,
                      };

                      const gruposOrdenados = Array.from(grouped.entries()).sort(([keyA], [keyB]) => {
                        const [, regionA] = keyA.split('|||');
                        const [, regionB] = keyB.split('|||');
                        const [servicioA] = keyA.split('|||');
                        const [servicioB] = keyB.split('|||');
                        
                        const ordenA = ordenRegiones[regionA] || 50;
                        const ordenB = ordenRegiones[regionB] || 50;
                        
                        if (ordenA !== ordenB) {
                          return ordenA - ordenB;
                        }
                        
                        return servicioA.localeCompare(servicioB);
                      });

                      return gruposOrdenados.map(([key, items]) => {
                        const [servicioNormalizado, region] = key.split('|||');
                        // Obtener el servicio original del primer item
                        const servicio = items[0]?.servicio || servicioNormalizado;
                        
                        return (
                          <div key={key} className="space-y-2">
                            {/* Header del grupo */}
                            <div className={`sticky top-0 z-10 bg-gradient-to-r ${theme === 'dark' 
                              ? 'from-[#0078D4] to-[#005A9E]' 
                              : 'from-[#00AEEF] to-[#0099CC]'
                            } px-4 py-3 rounded-lg shadow-md`}>
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {items[0]?.consorcio && (() => {
                                    const consorcioUpper = items[0].consorcio.toUpperCase();
                                    const logos: React.ReactElement[] = [];
                                    const getImageSrc = (filename: string) => {
                                      const assetPrefix = process.env.NEXT_PUBLIC_ASSET_PREFIX;
                                      if (assetPrefix && typeof window !== 'undefined') {
                                        return `${assetPrefix}${filename}`;
                                      }
                                      return filename;
                                    };
                                    
                                    if (consorcioUpper.includes('MSC')) {
                                      logos.push(
                                        <img
                                          key="msc"
                                          src={getImageSrc('/msc.png')}
                                          alt=""
                                          className="h-6 w-auto object-contain"
                                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                        />
                                      );
                                    }
                                    if (consorcioUpper.includes('COSCO')) {
                                      logos.push(
                                        <img
                                          key="cosco"
                                          src={getImageSrc('/cosco.png')}
                                          alt=""
                                          className="h-6 w-auto object-contain"
                                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                        />
                                      );
                                    }
                                    if (consorcioUpper.includes('EVERGREEN')) {
                                      logos.push(
                                        <img
                                          key="evergreen"
                                          src={getImageSrc('/evergreen.png')}
                                          alt=""
                                          className="h-6 w-auto object-contain"
                                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                        />
                                      );
                                    }
                                    return logos;
                                  })()}
                                  <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-bold text-white leading-tight">
                                      {items[0]?.navierasDelServicio && items[0].navierasDelServicio.length > 0
                                        ? items[0].navierasDelServicio.join(' - ')
                                        : (items[0]?.consorcio || items[0]?.naviera || '—')}
                                    </h3>
                                    <p className="text-[10px] text-white/90 mt-0.5">
                                      Servicio: {servicio} {region !== 'SIN REGIÓN' && `• Región: ${region}`}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {region !== 'SIN REGIÓN' && (
                                    <span className="px-2 py-1 text-[10px] font-semibold text-white bg-white/20 rounded">
                                      {region}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {/* Cards del grupo */}
                            <div className="space-y-2 px-1">
                              {items.map((itinerario) => (
                                <ItinerarioCard
                                  key={`${itinerario.id}-${region}`}
                                  itinerario={itinerario}
                                  onViewDetail={(itinerario) => {
                      setSelectedItinerario(itinerario);
                      setIsDetailModalOpen(true);
                    }}
                                  etaViewMode={etaViewMode}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      });
                    })()
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Modal de Detalles - Pantalla Completa */}
      {isDetailModalOpen && selectedItinerario && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Overlay con blur */}
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-md transition-opacity"
            onClick={() => setIsDetailModalOpen(false)}
          />
          
          {/* Modal Content */}
          <div className={`relative min-h-screen ${theme === 'dark' ? 'bg-gradient-to-b from-[#1A1A1A] to-[#0F0F0F]' : 'bg-gradient-to-b from-gray-50 to-white'}`}>
            {/* Header fijo con gradiente moderno */}
            <div className={`sticky top-0 z-10 border-b backdrop-blur-xl ${theme === 'dark' 
              ? 'border-[#3D3D3D]/50 bg-gradient-to-r from-[#0078D4]/20 via-[#00AEEF]/20 to-[#0078D4]/20 backdrop-blur-xl' 
              : 'border-[#E1E1E1] bg-gradient-to-r from-[#00AEEF]/10 via-white to-[#00AEEF]/10 backdrop-blur-xl'
            } px-3 sm:px-4 md:px-6 py-3 sm:py-4 shadow-lg`}>
              <div className="flex items-center justify-between max-w-6xl mx-auto gap-2">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <div className={`p-1.5 sm:p-2 rounded-xl flex-shrink-0 ${theme === 'dark' ? 'bg-[#00AEEF]/20' : 'bg-[#00AEEF]/10'}`}>
                    <Ship className={`h-5 w-5 sm:h-6 sm:w-6 ${theme === 'dark' ? 'text-[#4FC3F7]' : 'text-[#00AEEF]'}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className={`text-base sm:text-lg md:text-xl font-bold truncate ${theme === 'dark' ? 'text-white' : 'text-[#1F1F1F]'}`}>
                      Detalles del Viaje
                    </h2>
                    <p className={`text-[10px] sm:text-xs truncate ${theme === 'dark' ? 'text-[#A0A0A0]' : 'text-[#6B6B6B]'}`}>
                      {selectedItinerario.nave} • {selectedItinerario.viaje || 'N/A'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className={`p-2 sm:p-2.5 rounded-xl transition-all duration-200 flex-shrink-0 ${
                    theme === 'dark' 
                      ? 'hover:bg-[#3D3D3D]/80 text-[#C0C0C0] hover:text-white' 
                      : 'hover:bg-gray-100 text-[#323130] hover:text-[#1F1F1F]'
                  } hover:scale-110 active:scale-95`}
                >
                  <X className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </div>
            </div>

            {/* Contenido del Modal */}
            <div className="px-3 sm:px-4 md:px-6 py-4 sm:py-6 max-w-6xl mx-auto">
              {/* Información Principal - Cards modernas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
                {/* Nave */}
                <div className={`rounded-xl border ${theme === 'dark' 
                  ? 'border-[#3D3D3D]/50 bg-gradient-to-br from-[#2D2D2D] to-[#1F1F1F]' 
                  : 'border-[#E1E1E1] bg-white shadow-sm'
                } p-4 sm:p-5 hover:shadow-lg transition-all duration-200`}>
                  <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                    <div className={`p-2 sm:p-2.5 rounded-lg flex-shrink-0 ${theme === 'dark' ? 'bg-[#00AEEF]/20' : 'bg-[#00AEEF]/10'}`}>
                      <Ship className={`h-4 w-4 sm:h-5 sm:w-5 ${theme === 'dark' ? 'text-[#4FC3F7]' : 'text-[#00AEEF]'}`} />
                    </div>
                    <p className={`text-[10px] sm:text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-[#A0A0A0]' : 'text-[#6B6B6B]'}`}>
                      Nave
                    </p>
                  </div>
                  <p className={`text-base sm:text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-[#1F1F1F]'}`}>
                    {selectedItinerario.nave}
                  </p>
                </div>

                {/* Viaje */}
                <div className={`rounded-xl border ${theme === 'dark' 
                  ? 'border-[#3D3D3D]/50 bg-gradient-to-br from-[#2D2D2D] to-[#1F1F1F]' 
                  : 'border-[#E1E1E1] bg-white shadow-sm'
                } p-4 sm:p-5 hover:shadow-lg transition-all duration-200`}>
                  <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                    <div className={`p-2 sm:p-2.5 rounded-lg flex-shrink-0 ${theme === 'dark' ? 'bg-[#00AEEF]/20' : 'bg-[#00AEEF]/10'}`}>
                      <Navigation className={`h-4 w-4 sm:h-5 sm:w-5 ${theme === 'dark' ? 'text-[#4FC3F7]' : 'text-[#00AEEF]'}`} />
                    </div>
                    <p className={`text-[10px] sm:text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-[#A0A0A0]' : 'text-[#6B6B6B]'}`}>
                      Viaje
                    </p>
                  </div>
                  <p className={`text-base sm:text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-[#1F1F1F]'}`}>
                    {selectedItinerario.viaje || '—'}
                  </p>
                </div>

                {/* Servicio */}
                <div className={`rounded-xl border ${theme === 'dark' 
                  ? 'border-[#3D3D3D]/50 bg-gradient-to-br from-[#2D2D2D] to-[#1F1F1F]' 
                  : 'border-[#E1E1E1] bg-white shadow-sm'
                } p-4 sm:p-5 hover:shadow-lg transition-all duration-200`}>
                  <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                    <div className={`p-2 sm:p-2.5 rounded-lg flex-shrink-0 ${theme === 'dark' ? 'bg-[#00AEEF]/20' : 'bg-[#00AEEF]/10'}`}>
                      <MapPin className={`h-4 w-4 sm:h-5 sm:w-5 ${theme === 'dark' ? 'text-[#4FC3F7]' : 'text-[#00AEEF]'}`} />
                    </div>
                    <p className={`text-[10px] sm:text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-[#A0A0A0]' : 'text-[#6B6B6B]'}`}>
                      Servicio
                    </p>
                  </div>
                  <p className={`text-base sm:text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-[#1F1F1F]'}`}>
                    {selectedItinerario.servicio}
                  </p>
                </div>

                {/* Consorcio/Naviera */}
                <div className={`rounded-xl border ${theme === 'dark' 
                  ? 'border-[#3D3D3D]/50 bg-gradient-to-br from-[#2D2D2D] to-[#1F1F1F]' 
                  : 'border-[#E1E1E1] bg-white shadow-sm'
                } p-4 sm:p-5 hover:shadow-lg transition-all duration-200`}>
                  <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                    <div className={`p-2 sm:p-2.5 rounded-lg flex-shrink-0 ${theme === 'dark' ? 'bg-[#00AEEF]/20' : 'bg-[#00AEEF]/10'}`}>
                      <Ship className={`h-4 w-4 sm:h-5 sm:w-5 ${theme === 'dark' ? 'text-[#4FC3F7]' : 'text-[#00AEEF]'}`} />
                    </div>
                    <p className={`text-[10px] sm:text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-[#A0A0A0]' : 'text-[#6B6B6B]'}`}>
                      {selectedItinerario.consorcio ? 'Consorcio' : 'Naviera'}
                    </p>
                  </div>
                  <p className={`text-base sm:text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-[#1F1F1F]'}`}>
                    {selectedItinerario.navierasDelServicio && selectedItinerario.navierasDelServicio.length > 0
                      ? selectedItinerario.navierasDelServicio.join(' - ')
                      : (selectedItinerario.consorcio || selectedItinerario.naviera || '—')}
                  </p>
                </div>

                {/* POL */}
                <div className={`rounded-xl border ${theme === 'dark' 
                  ? 'border-emerald-500/30 bg-gradient-to-br from-emerald-900/20 to-[#1F1F1F]' 
                  : 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-white shadow-sm'
                } p-4 sm:p-5 hover:shadow-lg transition-all duration-200`}>
                  <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                    <div className={`p-2 sm:p-2.5 rounded-lg flex-shrink-0 ${theme === 'dark' ? 'bg-emerald-500/20' : 'bg-emerald-100'}`}>
                      <MapPin className={`h-4 w-4 sm:h-5 sm:w-5 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`} />
                    </div>
                    <p className={`text-[10px] sm:text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-emerald-300' : 'text-emerald-700'}`}>
                      POL
                    </p>
                  </div>
                  <p className={`text-base sm:text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-emerald-900'}`}>
                    {selectedItinerario.pol}
                  </p>
                </div>

                {/* ETD */}
                <div className={`rounded-xl border ${theme === 'dark' 
                  ? 'border-emerald-500/30 bg-gradient-to-br from-emerald-900/20 to-[#1F1F1F]' 
                  : 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-white shadow-sm'
                } p-4 sm:p-5 hover:shadow-lg transition-all duration-200`}>
                  <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                    <div className={`p-2 sm:p-2.5 rounded-lg flex-shrink-0 ${theme === 'dark' ? 'bg-emerald-500/20' : 'bg-emerald-100'}`}>
                      <Calendar className={`h-4 w-4 sm:h-5 sm:w-5 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`} />
                    </div>
                    <p className={`text-[10px] sm:text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-emerald-300' : 'text-emerald-700'}`}>
                      ETD
                    </p>
                  </div>
                  <p className={`text-base sm:text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-emerald-900'}`}>
                    {selectedItinerario.etd 
                      ? new Date(selectedItinerario.etd).toLocaleDateString('es-CL', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric'
                        })
                      : '—'}
                  </p>
                </div>

                {/* Semana */}
                {selectedItinerario.semana && (
                  <div className={`rounded-xl border ${theme === 'dark' 
                    ? 'border-[#3D3D3D]/50 bg-gradient-to-br from-[#2D2D2D] to-[#1F1F1F]' 
                    : 'border-[#E1E1E1] bg-white shadow-sm'
                  } p-4 sm:p-5 hover:shadow-lg transition-all duration-200`}>
                    <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                      <div className={`p-2 sm:p-2.5 rounded-lg flex-shrink-0 ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
                        <Calendar className={`h-4 w-4 sm:h-5 sm:w-5 ${theme === 'dark' ? 'text-[#A0A0A0]' : 'text-[#6B6B6B]'}`} />
                      </div>
                      <p className={`text-[10px] sm:text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-[#A0A0A0]' : 'text-[#6B6B6B]'}`}>
                        Semana
                      </p>
                    </div>
                    <p className={`text-base sm:text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-[#1F1F1F]'}`}>
                      Semana {selectedItinerario.semana}
                    </p>
                  </div>
                )}
              </div>

              {/* Escalas */}
              {selectedItinerario.escalas && selectedItinerario.escalas.length > 0 && (
                <div className={`rounded-xl border ${theme === 'dark' 
                  ? 'border-[#3D3D3D]/50 bg-gradient-to-br from-[#2D2D2D] to-[#1F1F1F]' 
                  : 'border-[#E1E1E1] bg-white shadow-sm'
                } p-4 sm:p-6 mb-4 sm:mb-6`}>
                  <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6 flex-wrap">
                    <div className={`p-2 sm:p-2.5 rounded-lg ${theme === 'dark' ? 'bg-[#00AEEF]/20' : 'bg-[#00AEEF]/10'}`}>
                      <Navigation className={`h-5 w-5 sm:h-6 sm:w-6 ${theme === 'dark' ? 'text-[#4FC3F7]' : 'text-[#00AEEF]'}`} />
                    </div>
                    <h3 className={`text-lg sm:text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-[#1F1F1F]'}`}>
                      Escalas del Viaje
                    </h3>
                    <span className={`px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold ${
                      theme === 'dark' 
                        ? 'bg-[#00AEEF]/20 text-[#4FC3F7]' 
                        : 'bg-[#00AEEF]/10 text-[#00AEEF]'
                    }`}>
                      {selectedItinerario.escalas.length} {selectedItinerario.escalas.length === 1 ? 'escala' : 'escalas'}
                    </span>
                  </div>
                  
                  {/* Ordenar escalas por orden */}
                  <div className="space-y-3">
                    {[...selectedItinerario.escalas].sort((a, b) => a.orden - b.orden).map((escala, index) => (
                      <div 
                        key={escala.id}
                        className={`rounded-xl border ${theme === 'dark' 
                          ? 'border-[#3D3D3D]/50 bg-gradient-to-br from-[#2D2D2D]/80 to-[#1F1F1F]' 
                          : 'border-[#E1E1E1] bg-gradient-to-br from-gray-50 to-white'
                        } p-4 sm:p-5 hover:shadow-lg transition-all duration-200`}
                      >
                        <div className="flex items-start gap-3 sm:gap-4">
                          {/* Número de escala con diseño moderno */}
                          <div className={`flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center font-bold text-sm sm:text-base shadow-lg ${
                            theme === 'dark' 
                              ? 'bg-gradient-to-br from-[#00AEEF] to-[#0078D4] text-white' 
                              : 'bg-gradient-to-br from-[#00AEEF] to-[#0099CC] text-white'
                          }`}>
                            {index + 1}
                          </div>

                          {/* Información de la escala */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 sm:gap-4 mb-3 flex-wrap">
                              <p className={`text-base sm:text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-[#1F1F1F]'}`}>
                                {escala.puerto_nombre || escala.puerto}
                              </p>
                              {escala.area && (
                                <span className={`px-2 sm:px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-semibold flex-shrink-0 ${
                                  theme === 'dark' 
                                    ? 'bg-slate-700/50 text-slate-300' 
                                    : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {escala.area}
                                </span>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                              {/* ETA */}
                              {escala.eta && (
                                <div className={`flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg ${
                                  theme === 'dark' 
                                    ? 'bg-emerald-900/20 border border-emerald-500/30' 
                                    : 'bg-emerald-50 border border-emerald-200'
                                }`}>
                                  <div className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 ${theme === 'dark' ? 'bg-emerald-500/20' : 'bg-emerald-100'}`}>
                                    <Calendar className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`} />
                                  </div>
                                  <div className="min-w-0">
                                    <p className={`text-[9px] sm:text-[10px] font-semibold uppercase tracking-wide mb-0.5 ${theme === 'dark' ? 'text-emerald-300' : 'text-emerald-700'}`}>
                                      ETA
                                    </p>
                                    <p className={`text-xs sm:text-sm font-bold truncate ${theme === 'dark' ? 'text-white' : 'text-emerald-900'}`}>
                                      {new Date(escala.eta).toLocaleDateString('es-CL', {
                                        day: '2-digit',
                                        month: 'long',
                                        year: 'numeric'
                                      })}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* Días de Tránsito */}
                              {escala.dias_transito !== null && escala.dias_transito !== undefined && (
                                <div className={`flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg ${
                                  theme === 'dark' 
                                    ? 'bg-[#00AEEF]/10 border border-[#00AEEF]/30' 
                                    : 'bg-[#00AEEF]/5 border border-[#00AEEF]/20'
                                }`}>
                                  <div className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 ${theme === 'dark' ? 'bg-[#00AEEF]/20' : 'bg-[#00AEEF]/10'}`}>
                                    <Clock className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${theme === 'dark' ? 'text-[#4FC3F7]' : 'text-[#00AEEF]'}`} />
                                  </div>
                                  <div className="min-w-0">
                                    <p className={`text-[9px] sm:text-[10px] font-semibold uppercase tracking-wide mb-0.5 ${theme === 'dark' ? 'text-[#4FC3F7]' : 'text-[#00AEEF]'}`}>
                                      Días de Tránsito
                                    </p>
                                    <p className={`text-xs sm:text-sm font-bold ${theme === 'dark' ? 'text-[#4FC3F7]' : 'text-[#00AEEF]'}`}>
                                      {escala.dias_transito} días
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Botón Cerrar */}
              <div className="mt-6 sm:mt-8 flex justify-center">
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className={`relative px-6 sm:px-8 py-2.5 sm:py-3.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 overflow-hidden group ${
                    theme === 'dark'
                      ? 'bg-gradient-to-r from-[#0078D4] to-[#00AEEF] hover:from-[#005A9E] hover:to-[#0099CC] text-white'
                      : 'bg-gradient-to-r from-[#00AEEF] to-[#0099CC] hover:from-[#0099CC] hover:to-[#0078D4] text-white'
                  } shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95`}
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    Cerrar
                  </span>
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}