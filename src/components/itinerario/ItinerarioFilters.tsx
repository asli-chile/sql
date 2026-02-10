'use client';

import type { ItinerarioFilters } from '@/types/itinerarios';

interface ItinerarioFiltersProps {
  servicios: string[];
  consorcios: string[];
  serviciosPorNaviera?: Record<string, string[]>; // Servicios filtrados por naviera
  pols: string[];
  regiones?: string[];
  filters: ItinerarioFilters;
  onFiltersChange: (filters: ItinerarioFilters) => void;
  onReset: () => void;
  etaViewMode?: 'dias' | 'fecha' | 'ambos';
  onEtaViewModeChange?: (mode: 'dias' | 'fecha' | 'ambos') => void;
}

const REGIONES = ['ASIA', 'EUROPA', 'AMERICA', 'INDIA-MEDIOORIENTE'] as const;

export function ItinerarioFilters({
  servicios,
  consorcios,
  serviciosPorNaviera = {},
  pols,
  regiones = [],
  filters,
  onFiltersChange,
  onReset,
  etaViewMode,
  onEtaViewModeChange,
}: ItinerarioFiltersProps) {
  const handleChange = (key: keyof ItinerarioFilters, value: string | number | undefined) => {
    const newFilters: ItinerarioFilters = { ...filters, [key]: value || undefined };
    // Si cambia la naviera, limpiar el servicio
    if (key === 'consorcio' && value !== filters.consorcio) {
      newFilters.servicio = undefined;
    }
    onFiltersChange(newFilters);
  };

  // Obtener servicios filtrados por naviera seleccionada
  const serviciosFiltrados = filters.consorcio && serviciosPorNaviera[filters.consorcio]
    ? serviciosPorNaviera[filters.consorcio]
    : servicios;

  const handleReset = () => {
    const emptyFilters: ItinerarioFilters = {};
    onReset();
  };

  // Calcular semana actual y opciones de semanas
  const calcularSemanaActual = () => {
    const hoy = new Date();
    const d = new Date(Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  const semanaActual = calcularSemanaActual();
  const opcionesSemanas = Array.from({ length: 6 }, (_, i) => {
    const numSemanas = i + 1;
    const semanaInicio = semanaActual;
    const semanaFin = semanaActual + numSemanas - 1;
    return {
      value: numSemanas,
      label: numSemanas === 1 
        ? `1 semana (Semana ${semanaInicio})`
        : `${numSemanas} semanas (Semana ${semanaInicio} - ${semanaFin})`
    };
  });

  return (
    <div className="border border-[#E1E1E1] dark:border-[#3D3D3D] bg-white dark:bg-[#2D2D2D] p-2" style={{ borderRadius: '4px' }}>
      <div className="flex flex-wrap items-end gap-2">
        {/* Región */}
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-semibold text-[#323130] dark:text-[#C0C0C0] mb-1 uppercase tracking-wide">
            Región
          </label>
          <select
            value={filters.region || ''}
            onChange={(e) => handleChange('region', e.target.value)}
            className="w-full border bg-white dark:bg-[#1F1F1F] px-2 py-1.5 text-xs text-[#1F1F1F] dark:text-[#FFFFFF] focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-[#0078D4] transition-all"
            style={{ borderRadius: '4px', borderColor: '#E1E1E1' }}
          >
            <option value="">Todas las regiones</option>
            {REGIONES.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </div>

        {/* Naviera (antes Consorcio) */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-semibold text-[#323130] dark:text-[#C0C0C0] mb-1 uppercase tracking-wide">
            Naviera
          </label>
          <select
            value={filters.consorcio || ''}
            onChange={(e) => handleChange('consorcio', e.target.value)}
            className="w-full border bg-white dark:bg-[#1F1F1F] px-2 py-1.5 text-xs text-[#1F1F1F] dark:text-[#FFFFFF] focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-[#0078D4] transition-all"
            style={{ borderRadius: '4px', borderColor: '#E1E1E1' }}
          >
            <option value="">Todas las navieras</option>
            {consorcios.map((consorcio) => (
              <option key={consorcio} value={consorcio}>
                {consorcio}
              </option>
            ))}
          </select>
        </div>

        {/* Servicio (filtrado por naviera) */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-semibold text-[#323130] dark:text-[#C0C0C0] mb-1 uppercase tracking-wide">
            Servicio
          </label>
          <select
            value={filters.servicio || ''}
            onChange={(e) => handleChange('servicio', e.target.value)}
            disabled={!filters.consorcio}
            className={`w-full border bg-white dark:bg-[#1F1F1F] px-2 py-1.5 text-xs text-[#1F1F1F] dark:text-[#FFFFFF] focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-[#0078D4] transition-all ${!filters.consorcio ? 'opacity-50 cursor-not-allowed' : ''}`}
            style={{ borderRadius: '4px', borderColor: '#E1E1E1' }}
          >
            <option value="">
              {filters.consorcio ? 'Todos los servicios' : 'Selecciona naviera primero'}
            </option>
            {serviciosFiltrados.map((servicio) => (
              <option key={servicio} value={servicio}>
                {servicio}
              </option>
            ))}
          </select>
        </div>

        {/* Semanas */}
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-semibold text-[#323130] dark:text-[#C0C0C0] mb-1 uppercase tracking-wide">
            Semanas
          </label>
          <select
            value={filters.semanas || ''}
            onChange={(e) => handleChange('semanas', e.target.value ? parseInt(e.target.value) : undefined)}
            className="w-full border bg-white dark:bg-[#1F1F1F] px-2 py-1.5 text-xs text-[#1F1F1F] dark:text-[#FFFFFF] focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-[#0078D4] transition-all"
            style={{ borderRadius: '4px', borderColor: '#E1E1E1' }}
          >
            <option value="">Todas las semanas</option>
            {opcionesSemanas.map((opcion) => (
              <option key={opcion.value} value={opcion.value}>
                {opcion.label}
              </option>
            ))}
          </select>
        </div>

        {/* POL */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-semibold text-[#323130] dark:text-[#C0C0C0] mb-1 uppercase tracking-wide">
            POL
          </label>
          <select
            value={filters.pol || ''}
            onChange={(e) => handleChange('pol', e.target.value)}
            className="w-full border bg-white dark:bg-[#1F1F1F] px-2 py-1.5 text-xs text-[#1F1F1F] dark:text-[#FFFFFF] focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-[#0078D4] transition-all"
            style={{ borderRadius: '4px', borderColor: '#E1E1E1' }}
          >
            <option value="">Todos los POLs</option>
            {pols.map((pol) => (
              <option key={pol} value={pol}>
                {pol}
              </option>
            ))}
          </select>
        </div>

        {/* Vista (ETA View Mode) */}
        {etaViewMode !== undefined && onEtaViewModeChange && (
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-semibold text-[#323130] dark:text-[#C0C0C0] mb-1 uppercase tracking-wide">
              Vista
            </label>
            <select
              value={etaViewMode}
              onChange={(e) => onEtaViewModeChange(e.target.value as 'dias' | 'fecha' | 'ambos')}
              className="w-full border bg-white dark:bg-[#1F1F1F] px-2 py-1.5 text-xs text-[#1F1F1F] dark:text-[#FFFFFF] focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-[#0078D4] transition-all"
              style={{ borderRadius: '4px', borderColor: '#E1E1E1' }}
            >
              <option value="dias">Días de tránsito</option>
              <option value="fecha">Fecha de llegada</option>
              <option value="ambos">Días y fecha</option>
            </select>
          </div>
        )}

        {/* Botones */}
        <div className="flex gap-1.5">
          <button
            onClick={handleReset}
            className="px-3 py-1.5 text-xs font-medium text-[#323130] dark:text-[#C0C0C0] hover:text-[#1F1F1F] dark:hover:text-white hover:bg-[#F3F3F3] dark:hover:bg-[#3D3D3D] transition-all"
            style={{ borderRadius: '4px' }}
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}

