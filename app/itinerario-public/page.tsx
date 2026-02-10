'use client';

import { useState, useEffect, useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import { ItinerarioFilters } from '@/components/itinerario/ItinerarioFilters';
import { ItinerarioTable } from '@/components/itinerario/ItinerarioTable';
import { ItinerarioCard } from '@/components/itinerario/ItinerarioCard';
import { fetchPublicItinerarios } from '@/lib/itinerarios-service';
import type { ItinerarioWithEscalas, ItinerarioFilters as FiltersType } from '@/types/itinerarios';
import { useTheme } from '@/contexts/ThemeContext';

export default function ItinerarioPublicPage() {
  const { theme } = useTheme();
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
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-40 border-b ${theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="https://asli.cl/img/logoblanco.png"
                alt="ASLI Logo"
                className="h-10 w-auto object-contain"
              />
              <div>
                <h1 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Itinerario
                </h1>
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                  Vista de solo lectura
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Toggle de vista ETA */}
              <div className={`flex items-center gap-0 border rounded-md overflow-hidden ${theme === 'dark'
                ? 'border-slate-700/60 bg-slate-800/60'
                : 'border-gray-300 bg-white'
                }`}>
                <button
                  onClick={() => setEtaViewMode('dias')}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    etaViewMode === 'dias'
                      ? theme === 'dark'
                        ? 'bg-[#00AEEF] text-white'
                        : 'bg-[#00AEEF] text-white'
                      : theme === 'dark'
                        ? 'text-slate-300 hover:bg-slate-700'
                        : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title="Mostrar días de tránsito"
                >
                  Días
                </button>
                <button
                  onClick={() => setEtaViewMode('fecha')}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors border-l ${
                    theme === 'dark' ? 'border-slate-700/60' : 'border-gray-300'
                  } ${
                    etaViewMode === 'fecha'
                      ? theme === 'dark'
                        ? 'bg-[#00AEEF] text-white'
                        : 'bg-[#00AEEF] text-white'
                      : theme === 'dark'
                        ? 'text-slate-300 hover:bg-slate-700'
                        : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title="Mostrar fecha de llegada"
                >
                  Fecha
                </button>
                <button
                  onClick={() => setEtaViewMode('ambos')}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors border-l ${
                    theme === 'dark' ? 'border-slate-700/60' : 'border-gray-300'
                  } ${
                    etaViewMode === 'ambos'
                      ? theme === 'dark'
                        ? 'bg-[#00AEEF] text-white'
                        : 'bg-[#00AEEF] text-white'
                      : theme === 'dark'
                        ? 'text-slate-300 hover:bg-slate-700'
                        : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title="Mostrar días y fecha"
                >
                  Ambos
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col space-y-4">
          {/* Filtros */}
          <div className="flex-shrink-0">
            <ItinerarioFilters
              servicios={servicios}
              consorcios={consorcios}
              serviciosPorNaviera={serviciosPorNaviera}
              pols={pols}
              filters={filters}
              onFiltersChange={setFilters}
              onReset={() => setFilters({})}
            />
          </div>

          {/* Contenido */}
          <div className="flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-12 rounded-2xl border border-slate-800/60 bg-slate-950/60">
                <div className="flex items-center justify-center gap-2">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#00AEEF] border-t-transparent" />
                  <span className="text-sm text-slate-400">Cargando itinerarios...</span>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-12 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-8">
                <div className="space-y-4 text-center">
                  <div className="text-amber-400 text-lg font-semibold">
                    ⚠️ Error
                  </div>
                  <div className="text-slate-300 text-sm">{error}</div>
                </div>
              </div>
            ) : (
              <>
                {/* Vista Desktop (Tabla) */}
                <div className="hidden lg:block">
                  <ItinerarioTable
                    itinerarios={filteredItinerarios}
                    onViewDetail={() => {}} // Sin acción en modo solo lectura
                    etaViewMode={etaViewMode}
                    hideActionColumn={true}
                  />
                </div>

                {/* Vista Mobile (Cards) */}
                <div className="lg:hidden space-y-4">
                  {filteredItinerarios.length === 0 ? (
                    <div className="flex items-center justify-center py-12 rounded-2xl border border-slate-800/60 bg-slate-950/60">
                      <p className="text-slate-400">No hay itinerarios disponibles</p>
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
