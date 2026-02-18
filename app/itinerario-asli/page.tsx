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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsDetailModalOpen(false)}
          />
          
          {/* Modal Content */}
          <div className={`relative min-h-screen ${theme === 'dark' ? 'bg-[#1F1F1F]' : 'bg-white'}`}>
            {/* Header fijo */}
            <div className={`sticky top-0 z-10 border-b ${theme === 'dark' 
              ? 'border-[#3D3D3D] bg-[#2D2D2D]' 
              : 'border-[#E1E1E1] bg-white'
            } px-4 py-3 shadow-md`}>
              <div className="flex items-center justify-between">
                <h2 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-[#1F1F1F]'}`}>
                  Detalles del Viaje
                </h2>
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className={`p-2 rounded-lg transition-colors ${
                    theme === 'dark' 
                      ? 'hover:bg-[#3D3D3D] text-[#C0C0C0]' 
                      : 'hover:bg-[#F3F3F3] text-[#323130]'
                  }`}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Contenido del Modal */}
            <div className="px-4 py-6 max-w-4xl mx-auto">
              {/* Información Principal */}
              <div className={`rounded-lg border ${theme === 'dark' 
                ? 'border-[#3D3D3D] bg-[#2D2D2D]' 
                : 'border-[#E1E1E1] bg-white'
              } p-6 mb-6`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Nave */}
                  <div className="flex items-start gap-3">
                    <Ship className={`h-5 w-5 mt-0.5 ${theme === 'dark' ? 'text-[#4FC3F7]' : 'text-[#00AEEF]'}`} />
                    <div>
                      <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${theme === 'dark' ? 'text-[#A0A0A0]' : 'text-[#6B6B6B]'}`}>
                        Nave
                      </p>
                      <p className={`text-base font-bold ${theme === 'dark' ? 'text-white' : 'text-[#1F1F1F]'}`}>
                        {selectedItinerario.nave}
                      </p>
                    </div>
                  </div>

                  {/* Viaje */}
                  <div className="flex items-start gap-3">
                    <Navigation className={`h-5 w-5 mt-0.5 ${theme === 'dark' ? 'text-[#4FC3F7]' : 'text-[#00AEEF]'}`} />
                    <div>
                      <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${theme === 'dark' ? 'text-[#A0A0A0]' : 'text-[#6B6B6B]'}`}>
                        Viaje
                      </p>
                      <p className={`text-base font-bold ${theme === 'dark' ? 'text-white' : 'text-[#1F1F1F]'}`}>
                        {selectedItinerario.viaje || '—'}
                      </p>
                    </div>
                  </div>

                  {/* Servicio */}
                  <div className="flex items-start gap-3">
                    <MapPin className={`h-5 w-5 mt-0.5 ${theme === 'dark' ? 'text-[#4FC3F7]' : 'text-[#00AEEF]'}`} />
                    <div>
                      <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${theme === 'dark' ? 'text-[#A0A0A0]' : 'text-[#6B6B6B]'}`}>
                        Servicio
                      </p>
                      <p className={`text-base font-semibold ${theme === 'dark' ? 'text-white' : 'text-[#1F1F1F]'}`}>
                        {selectedItinerario.servicio}
                      </p>
                    </div>
                  </div>

                  {/* Consorcio/Naviera */}
                  <div className="flex items-start gap-3">
                    <Ship className={`h-5 w-5 mt-0.5 ${theme === 'dark' ? 'text-[#4FC3F7]' : 'text-[#00AEEF]'}`} />
                    <div>
                      <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${theme === 'dark' ? 'text-[#A0A0A0]' : 'text-[#6B6B6B]'}`}>
                        {selectedItinerario.consorcio ? 'Consorcio' : 'Naviera'}
                      </p>
                      <p className={`text-base font-semibold ${theme === 'dark' ? 'text-white' : 'text-[#1F1F1F]'}`}>
                        {selectedItinerario.navierasDelServicio && selectedItinerario.navierasDelServicio.length > 0
                          ? selectedItinerario.navierasDelServicio.join(' - ')
                          : (selectedItinerario.consorcio || selectedItinerario.naviera || '—')}
                      </p>
                    </div>
                  </div>

                  {/* POL */}
                  <div className="flex items-start gap-3">
                    <MapPin className={`h-5 w-5 mt-0.5 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`} />
                    <div>
                      <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${theme === 'dark' ? 'text-[#A0A0A0]' : 'text-[#6B6B6B]'}`}>
                        POL (Puerto de Origen)
                      </p>
                      <p className={`text-base font-bold ${theme === 'dark' ? 'text-white' : 'text-[#1F1F1F]'}`}>
                        {selectedItinerario.pol}
                      </p>
                    </div>
                  </div>

                  {/* ETD */}
                  <div className="flex items-start gap-3">
                    <Calendar className={`h-5 w-5 mt-0.5 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`} />
                    <div>
                      <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${theme === 'dark' ? 'text-[#A0A0A0]' : 'text-[#6B6B6B]'}`}>
                        ETD (Fecha de Salida)
                      </p>
                      <p className={`text-base font-bold ${theme === 'dark' ? 'text-white' : 'text-[#1F1F1F]'}`}>
                        {selectedItinerario.etd 
                          ? new Date(selectedItinerario.etd).toLocaleDateString('es-CL', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric'
                            })
                          : '—'}
                      </p>
                    </div>
                  </div>

                  {/* Semana */}
                  {selectedItinerario.semana && (
                    <div className="flex items-start gap-3">
                      <Calendar className={`h-5 w-5 mt-0.5 ${theme === 'dark' ? 'text-[#A0A0A0]' : 'text-[#6B6B6B]'}`} />
                      <div>
                        <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${theme === 'dark' ? 'text-[#A0A0A0]' : 'text-[#6B6B6B]'}`}>
                          Semana
                        </p>
                        <p className={`text-base font-semibold ${theme === 'dark' ? 'text-white' : 'text-[#1F1F1F]'}`}>
                          Semana {selectedItinerario.semana}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Escalas */}
              {selectedItinerario.escalas && selectedItinerario.escalas.length > 0 && (
                <div className={`rounded-lg border ${theme === 'dark' 
                  ? 'border-[#3D3D3D] bg-[#2D2D2D]' 
                  : 'border-[#E1E1E1] bg-white'
                } p-6`}>
                  <h3 className={`text-lg font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-[#1F1F1F]'}`}>
                    Escalas del Viaje
                  </h3>
                  
                  {/* Ordenar escalas por orden */}
                  {[...selectedItinerario.escalas].sort((a, b) => a.orden - b.orden).map((escala, index) => (
                    <div 
                      key={escala.id}
                      className={`mb-4 last:mb-0 pb-4 last:pb-0 border-b last:border-b-0 ${
                        theme === 'dark' ? 'border-[#3D3D3D]' : 'border-[#E1E1E1]'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        {/* Número de escala */}
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          theme === 'dark' 
                            ? 'bg-[#00AEEF] text-white' 
                            : 'bg-[#00AEEF] text-white'
                        }`}>
                          {index + 1}
                        </div>

                        {/* Información de la escala */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div className="flex-1 min-w-0">
                              <p className={`text-base font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-[#1F1F1F]'}`}>
                                {escala.puerto_nombre || escala.puerto}
                              </p>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {/* ETA */}
                                {escala.eta && (
                                  <div className="flex items-center gap-2">
                                    <Calendar className={`h-4 w-4 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`} />
                                    <div>
                                      <p className={`text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-[#A0A0A0]' : 'text-[#6B6B6B]'}`}>
                                        ETA
                                      </p>
                                      <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-[#1F1F1F]'}`}>
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
                                  <div className="flex items-center gap-2">
                                    <Clock className={`h-4 w-4 ${theme === 'dark' ? 'text-[#4FC3F7]' : 'text-[#00AEEF]'}`} />
                                    <div>
                                      <p className={`text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-[#A0A0A0]' : 'text-[#6B6B6B]'}`}>
                                        Días de Tránsito
                                      </p>
                                      <p className={`text-sm font-bold ${theme === 'dark' ? 'text-[#4FC3F7]' : 'text-[#00AEEF]'}`}>
                                        {escala.dias_transito} días
                                      </p>
                                    </div>
                                  </div>
                                )}

                                {/* Región */}
                                {escala.area && (
                                  <div className="flex items-center gap-2">
                                    <MapPin className={`h-4 w-4 ${theme === 'dark' ? 'text-[#A0A0A0]' : 'text-[#6B6B6B]'}`} />
                                    <div>
                                      <p className={`text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-[#A0A0A0]' : 'text-[#6B6B6B]'}`}>
                                        Región
                                      </p>
                                      <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-[#1F1F1F]'}`}>
                                        {escala.area}
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Botón Cerrar */}
              <div className="mt-6 flex justify-center">
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                    theme === 'dark'
                      ? 'bg-[#0078D4] hover:bg-[#005A9E] text-white'
                      : 'bg-[#00AEEF] hover:bg-[#0099CC] text-white'
                  } shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95`}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
