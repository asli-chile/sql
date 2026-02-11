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
  const [filters, setFilters] = useState<FiltersType>({});
  const [etaViewMode, setEtaViewMode] = useState<'dias' | 'fecha' | 'ambos'>('dias');

  useEffect(() => {
    const loadItinerarios = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await fetchPublicItinerarios();
        setItinerarios(data);
      } catch (error: any) {
        console.error('Error loading itinerarios:', error);
        setError(error?.message || 'Error al cargar itinerarios');
      } finally {
        setIsLoading(false);
      }
    };

    void loadItinerarios();
  }, []);

  // Obtener valores únicos para los filtros
  const servicios = useMemo(
    () => Array.from(new Set(itinerarios.map((it) => it.servicio))).sort(),
    [itinerarios]
  );

  const consorcios = useMemo(
    () =>
      Array.from(
        new Set(itinerarios.map((it) => it.consorcio).filter((c): c is string => !!c))
      ).sort(),
    [itinerarios]
  );

  // Mapa de servicios por naviera
  const serviciosPorNaviera = useMemo(() => {
    const mapa: Record<string, string[]> = {};
    itinerarios.forEach((it) => {
      if (it.consorcio && it.servicio) {
        if (!mapa[it.consorcio]) {
          mapa[it.consorcio] = [];
        }
        if (!mapa[it.consorcio].includes(it.servicio)) {
          mapa[it.consorcio].push(it.servicio);
        }
      }
    });
    Object.keys(mapa).forEach((naviera) => {
      mapa[naviera].sort();
    });
    return mapa;
  }, [itinerarios]);

  const pols = useMemo(
    () => Array.from(new Set(itinerarios.map((it) => it.pol))).sort(),
    [itinerarios]
  );

  // Calcular semana actual para filtro de semanas
  const calcularSemanaActual = () => {
    const hoy = new Date();
    const d = new Date(Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  // Filtrar itinerarios
  const filteredItinerarios = useMemo(() => {
    const semanaActual = calcularSemanaActual();
    
    return itinerarios.filter((it) => {
      if (filters.servicio && it.servicio !== filters.servicio) return false;
      if (filters.consorcio && it.consorcio !== filters.consorcio) return false;
      if (filters.pol && it.pol !== filters.pol) return false;
      if (filters.region) {
        const hasRegion = it.escalas?.some((escala) => escala.area === filters.region);
        if (!hasRegion) return false;
      }
      if (filters.semanas && it.semana) {
        const semanaInicio = semanaActual;
        const semanaFin = semanaActual + filters.semanas - 1;
        if (it.semana < semanaInicio || it.semana > semanaFin) return false;
      }
      return true;
    });
  }, [itinerarios, filters]);

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
              servicios={servicios}
              consorcios={consorcios}
              serviciosPorNaviera={serviciosPorNaviera}
              pols={pols}
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
