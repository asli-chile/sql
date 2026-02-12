'use client';

import type { ItinerarioFilters } from '@/types/itinerarios';

interface ServicioCompleto {
  id: string;
  nombre: string;
  tipo: 'servicio_unico' | 'consorcio';
  consorcio?: string;
}

interface ItinerarioFiltersProps {
  servicios: string[];
  serviciosCompletos?: ServicioCompleto[]; // Lista completa de servicios con información adicional
  consorcios: string[];
  consorcioDelServicio?: string | null; // Consorcio del servicio seleccionado
  serviciosPorNaviera?: Record<string, string[]>; // Servicios filtrados por naviera (deprecated)
  pols: string[];
  regiones?: string[];
  filters: ItinerarioFilters;
  onFiltersChange: (filters: ItinerarioFilters) => void;
  onReset: () => void;
  etaViewMode?: 'dias' | 'fecha' | 'ambos';
  onEtaViewModeChange?: (mode: 'dias' | 'fecha' | 'ambos') => void;
}

// REGIONES ahora se obtienen dinámicamente desde los itinerarios

export function ItinerarioFilters({
  servicios,
  serviciosCompletos = [],
  consorcios,
  consorcioDelServicio,
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
    onFiltersChange(newFilters);
  };

  const handleReset = () => {
    const emptyFilters: ItinerarioFilters = {};
    onReset();
  };

  // Opciones de semanas (solo cantidad, sin rangos)
  const opcionesSemanas = Array.from({ length: 12 }, (_, i) => {
    const numSemanas = i + 1;
    return {
      value: numSemanas,
      label: numSemanas === 1 
        ? '1 semana'
        : `${numSemanas} semanas`
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
            {Array.isArray(regiones) && regiones.length > 0 ? (
              regiones.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))
            ) : null}
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

        {/* Servicio (lista desplegable independiente) */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-semibold text-[#323130] dark:text-[#C0C0C0] mb-1 uppercase tracking-wide">
            Servicio
          </label>
          <select
            value={filters.servicio || ''}
            onChange={(e) => handleChange('servicio', e.target.value)}
            className="w-full border bg-white dark:bg-[#1F1F1F] px-2 py-1.5 text-xs text-[#1F1F1F] dark:text-[#FFFFFF] focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-[#0078D4] transition-all"
            style={{ borderRadius: '4px', borderColor: '#E1E1E1' }}
          >
            <option value="">Todos los servicios</option>
            {servicios.map((servicio) => (
              <option key={servicio} value={servicio}>
                {servicio}
              </option>
            ))}
          </select>
          {filters.servicio && consorcioDelServicio && (
            <p className="text-xs text-[#0078D4] dark:text-[#4FC3F7] mt-1">
              Consorcio: {consorcioDelServicio}
            </p>
          )}
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

