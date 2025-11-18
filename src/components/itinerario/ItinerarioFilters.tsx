'use client';

import { useState } from 'react';
import { Search, X } from 'lucide-react';
import type { ItinerarioFilters } from '@/types/itinerarios';

interface ItinerarioFiltersProps {
  servicios: string[];
  consorcios: string[];
  naves: string[];
  pols: string[];
  filters: ItinerarioFilters;
  onFiltersChange: (filters: ItinerarioFilters) => void;
  onReset: () => void;
}

export function ItinerarioFilters({
  servicios,
  consorcios,
  naves,
  pols,
  filters,
  onFiltersChange,
  onReset,
}: ItinerarioFiltersProps) {
  const [localFilters, setLocalFilters] = useState<ItinerarioFilters>(filters);

  const handleChange = (key: keyof ItinerarioFilters, value: string | number | undefined) => {
    const newFilters = { ...localFilters, [key]: value || undefined };
    setLocalFilters(newFilters);
  };

  const handleApply = () => {
    onFiltersChange(localFilters);
  };

  const handleReset = () => {
    const emptyFilters: ItinerarioFilters = {};
    setLocalFilters(emptyFilters);
    onReset();
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm">
      <div className="flex flex-wrap items-end gap-4">
        {/* Servicio */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
            Servicio
          </label>
          <select
            value={localFilters.servicio || ''}
            onChange={(e) => handleChange('servicio', e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#00AEEF] focus:border-transparent"
          >
            <option value="">Todos los servicios</option>
            {servicios.map((servicio) => (
              <option key={servicio} value={servicio}>
                {servicio}
              </option>
            ))}
          </select>
        </div>

        {/* Consorcio */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
            Consorcio
          </label>
          <select
            value={localFilters.consorcio || ''}
            onChange={(e) => handleChange('consorcio', e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#00AEEF] focus:border-transparent"
          >
            <option value="">Todos los consorcios</option>
            {consorcios.map((consorcio) => (
              <option key={consorcio} value={consorcio}>
                {consorcio}
              </option>
            ))}
          </select>
        </div>

        {/* Nave */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
            Nave
          </label>
          <select
            value={localFilters.nave || ''}
            onChange={(e) => handleChange('nave', e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#00AEEF] focus:border-transparent"
          >
            <option value="">Todas las naves</option>
            {naves.map((nave) => (
              <option key={nave} value={nave}>
                {nave}
              </option>
            ))}
          </select>
        </div>

        {/* Semana */}
        <div className="w-32">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
            Semana
          </label>
          <input
            type="number"
            value={localFilters.semana || ''}
            onChange={(e) => handleChange('semana', e.target.value ? parseInt(e.target.value) : undefined)}
            placeholder="Ej: 42"
            min="1"
            max="53"
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#00AEEF] focus:border-transparent"
          />
        </div>

        {/* POL */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
            POL
          </label>
          <select
            value={localFilters.pol || ''}
            onChange={(e) => handleChange('pol', e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#00AEEF] focus:border-transparent"
          >
            <option value="">Todos los POLs</option>
            {pols.map((pol) => (
              <option key={pol} value={pol}>
                {pol}
              </option>
            ))}
          </select>
        </div>

        {/* Botones */}
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
          >
            Reset
          </button>
          <button
            onClick={handleApply}
            className="px-6 py-2 text-sm font-semibold text-white bg-[#00AEEF] hover:bg-[#4FC3F7] rounded-lg transition-all duration-150 shadow-sm hover:shadow-md"
          >
            Filtrar
          </button>
        </div>
      </div>
    </div>
  );
}

