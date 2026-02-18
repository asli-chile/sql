'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Sun, Moon, X, Ship, Calendar, MapPin, Clock, Navigation } from 'lucide-react';
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
  }, [itinerarios, filters, serviciosParaFiltro, consorcioDelServicioSeleccionado, puertoSeleccionadoMapa]);

  return (
    <div className={`min-h-screen w-full ${theme === 'dark' ? 'bg-[#202020]' : 'bg-[#F5F5F5]'}`}>
      {/* Header - Estilo Windows Fluent */}
      <header className={`sticky top-0 z-40 border-b backdrop-blur-sm ${theme === 'dark' 
        ? 'border-[#3D3D3D] bg-[#2D2D2D]/95' 
        : 'border-[#E1E1E1] bg-[#FFFFFF]/95'
      }`}>
        <div className="w-full px-3 py-2.5">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <img
                src="https://asli.cl/img/logoblanco.png"
                alt="ASLI Logo"
                className="h-9 w-auto object-contain group-hover:opacity-90 transition-opacity"
              />
              <div>
                <h1 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-[#1F1F1F]'}`}>
                  ITINERARIO
                </h1>
                <p className={`text-xs ${theme === 'dark' ? 'text-[#A0A0A0]' : 'text-[#6B6B6B]'}`}>
                  Vista de solo lectura
                </p>
              </div>
            </Link>
            <div className="flex items-center gap-2">
              {/* Botón Mapa */}
              <button
                onClick={() => {
                  setShowMap(!showMap);
                  if (showMap) {
                    setPuertoSeleccionadoMapa(null);
                  }
                }}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium border transition-all duration-150 ${
                  theme === 'dark'
                    ? showMap
                      ? 'border-[#00AEEF] bg-[#00AEEF]/20 text-[#00AEEF]'
                      : 'border-[#3D3D3D] bg-[#2D2D2D] text-[#C0C0C0] hover:bg-[#3D3D3D]'
                    : showMap
                      ? 'border-[#00AEEF] bg-[#00AEEF]/10 text-[#00AEEF]'
                      : 'border-[#E1E1E1] bg-white text-[#323130] hover:bg-[#F3F3F3]'
                }`}
                style={{ borderRadius: '4px' }}
                title={showMap ? 'Ocultar mapa' : 'Ver mapa'}
              >
                <MapIcon className="h-3.5 w-3.5" />
                <span>{showMap ? 'Ocultar Mapa' : 'Ver Mapa'}</span>
              </button>
              {/* Botón Día/Noche */}
              <button
                onClick={toggleTheme}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium border transition-all duration-150 ${
                  theme === 'dark'
                    ? 'border-[#3D3D3D] bg-[#2D2D2D] text-[#C0C0C0] hover:bg-[#3D3D3D]'
                    : 'border-[#E1E1E1] bg-white text-[#323130] hover:bg-[#F3F3F3]'
                }`}
                style={{ borderRadius: '4px' }}
                title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              >
                {theme === 'dark' ? (
                  <Sun className="h-3.5 w-3.5" />
                ) : (
                  <Moon className="h-3.5 w-3.5" />
                )}
                <span>{theme === 'dark' ? 'Claro' : 'Oscuro'}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Pantalla completa */}
      <main className="w-full px-3 py-2">
        <div className="flex flex-col gap-2 w-full">
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
              }}
              etaViewMode={etaViewMode}
              onEtaViewModeChange={setEtaViewMode}
            />
          </div>

          {/* Mapa */}
          {showMap && (
            <div className="flex-shrink-0 w-full h-96">
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
          <div className="flex-1 w-full">
            {isLoading ? (
              <div className={`flex items-center justify-center py-12 border ${theme === 'dark'
                ? 'border-[#3D3D3D] bg-[#2D2D2D]'
                : 'border-[#E1E1E1] bg-white'
              }`} style={{ borderRadius: '4px' }}>
                <div className="flex items-center justify-center gap-2">
                  <div className={`h-5 w-5 animate-spin rounded-full border-2 ${theme === 'dark' ? 'border-[#0078D4]' : 'border-[#0078D4]'} border-t-transparent`} />
                  <span className={`text-sm ${theme === 'dark' ? 'text-[#A0A0A0]' : 'text-[#6B6B6B]'}`}>Cargando itinerarios...</span>
                </div>
              </div>
            ) : error ? (
              <div className={`flex items-center justify-center py-12 border ${theme === 'dark'
                ? 'border-[#D83B01] bg-[#D83B01]/10'
                : 'border-[#D83B01] bg-[#FFF4F1]'
              }`} style={{ borderRadius: '4px' }}>
                <div className="space-y-4 text-center">
                  <div className={`text-lg font-semibold ${theme === 'dark' ? 'text-[#FF6B47]' : 'text-[#D83B01]'}`}>
                    ⚠️ Error
                  </div>
                  <div className={`text-sm ${theme === 'dark' ? 'text-[#C0C0C0]' : 'text-[#323130]'}`}>{error}</div>
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
                    <div className={`flex items-center justify-center py-12 border ${theme === 'dark'
                      ? 'border-[#3D3D3D] bg-[#2D2D2D]'
                      : 'border-[#E1E1E1] bg-white'
                    }`} style={{ borderRadius: '4px' }}>
                      <p className={theme === 'dark' ? 'text-[#A0A0A0]' : 'text-[#6B6B6B]'}>No hay itinerarios disponibles</p>
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
