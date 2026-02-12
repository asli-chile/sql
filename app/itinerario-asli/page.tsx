'use client';

import { useState, useEffect, useMemo } from 'react';
import { Sun, Moon } from 'lucide-react';
import Link from 'next/link';
import { ItinerarioFilters } from '@/components/itinerario/ItinerarioFilters';
import { ItinerarioTable } from '@/components/itinerario/ItinerarioTable';
import { ItinerarioCard } from '@/components/itinerario/ItinerarioCard';
import { fetchPublicItinerarios } from '@/lib/itinerarios-service';
import type { ItinerarioWithEscalas, ItinerarioFilters as FiltersType } from '@/types/itinerarios';
import { useTheme } from '@/contexts/ThemeContext';

export default function ItinerarioPublicPage() {
  const { theme, toggleTheme } = useTheme();
  const [itinerarios, setItinerarios] = useState<ItinerarioWithEscalas[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FiltersType>({ semanas: 6 });
  const [etaViewMode, setEtaViewMode] = useState<'dias' | 'fecha' | 'ambos'>('dias');
  const [serviciosUnicos, setServiciosUnicos] = useState<any[]>([]);
  const [consorcios, setConsorcios] = useState<any[]>([]);

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
        const hasRegion = it.escalas?.some((escala) => escala.area === filters.region);
        if (!hasRegion) return false;
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
  }, [itinerarios, filters, serviciosParaFiltro, consorcioDelServicioSeleccionado]);

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
              onReset={() => setFilters({})}
              etaViewMode={etaViewMode}
              onEtaViewModeChange={setEtaViewMode}
            />
          </div>

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
                    onViewDetail={() => {}} // Sin acción en modo solo lectura
                    etaViewMode={etaViewMode}
                    hideActionColumn={true}
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
                    filteredItinerarios.map((itinerario) => (
                      <ItinerarioCard
                        key={itinerario.id}
                        itinerario={itinerario}
                        onViewDetail={() => {}} // Sin acción en modo solo lectura
                        etaViewMode={etaViewMode}
                      />
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
