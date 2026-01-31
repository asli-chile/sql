'use client';

import React, { useMemo } from 'react';
import { X, RotateCcw, Filter } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { TransporteRecord } from '@/lib/transportes-service';

interface TransportesFiltersPanelProps {
  filters: {
    cliente: string;
    naviera: string;
    nave: string;
    especie: string;
    deposito: string;
  };
  setFilters: (filters: {
    cliente: string;
    naviera: string;
    nave: string;
    especie: string;
    deposito: string;
  }) => void;
  records: TransporteRecord[];
  compact?: boolean;
}

export function TransportesFiltersPanel({
  filters,
  setFilters,
  records,
  compact = false,
}: TransportesFiltersPanelProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Obtener valores únicos de cada campo
  const filterOptions = useMemo(() => {
    const clientes = new Set<string>();
    const navieras = new Set<string>();
    const naves = new Set<string>();
    const especies = new Set<string>();
    const depositos = new Set<string>();

    records.forEach((record) => {
      if (record.exportacion) clientes.add(record.exportacion);
      if (record.naviera) navieras.add(record.naviera);
      if (record.nave) naves.add(record.nave);
      if (record.especie) especies.add(record.especie);
      if (record.deposito) depositos.add(record.deposito);
    });

    return {
      clientes: Array.from(clientes).sort(),
      navieras: Array.from(navieras).sort(),
      naves: Array.from(naves).sort(),
      especies: Array.from(especies).sort(),
      depositos: Array.from(depositos).sort(),
    };
  }, [records]);

  const hasActiveFilters = useMemo(() => {
    return Object.values(filters).some(value => value !== '');
  }, [filters]);

  const getFilterStyles = (hasFilter: boolean) => {
    const baseStyles = "w-full px-3 py-2 text-sm border focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-200";
    if (hasFilter) {
      return isDark
        ? `${baseStyles} border-blue-500/60 bg-blue-900/30 font-medium text-white`
        : `${baseStyles} border-blue-500/60 bg-blue-50/80 font-medium text-gray-900`;
    } else {
      return isDark
        ? `${baseStyles} border-slate-700/60 bg-slate-800/50 text-slate-100 placeholder:text-slate-400 hover:border-slate-600/60 hover:bg-slate-700/50`
        : `${baseStyles} border-gray-300/60 bg-white/80 text-gray-900 placeholder:text-gray-500 hover:border-gray-400/80 hover:bg-gray-50/50`;
    }
  };

  const getLabelStyles = (hasFilter: boolean) => {
    if (hasFilter) {
      return isDark ? 'text-blue-300 font-semibold flex items-center gap-1.5 text-xs' : 'text-blue-700 font-semibold flex items-center gap-1.5 text-xs';
    } else {
      return isDark ? 'text-slate-400 text-xs font-medium' : 'text-gray-600 text-xs font-medium';
    }
  };

  const activeFiltersSummary = useMemo(() => {
    const active: Array<{ label: string; value: string; onClear: () => void }> = [];

    if (filters.cliente) {
      active.push({
        label: 'Cliente',
        value: filters.cliente,
        onClear: () => setFilters({ ...filters, cliente: '' }),
      });
    }
    if (filters.naviera) {
      active.push({
        label: 'Naviera',
        value: filters.naviera,
        onClear: () => setFilters({ ...filters, naviera: '' }),
      });
    }
    if (filters.nave) {
      active.push({
        label: 'Nave',
        value: filters.nave,
        onClear: () => setFilters({ ...filters, nave: '' }),
      });
    }
    if (filters.especie) {
      active.push({
        label: 'Especie',
        value: filters.especie,
        onClear: () => setFilters({ ...filters, especie: '' }),
      });
    }
    if (filters.deposito) {
      active.push({
        label: 'Depósito',
        value: filters.deposito,
        onClear: () => setFilters({ ...filters, deposito: '' }),
      });
    }

    return active;
  }, [filters, setFilters]);

  const handleClearAll = () => {
    setFilters({
      cliente: '',
      naviera: '',
      nave: '',
      especie: '',
      deposito: '',
    });
  };

  // Filtrar naves por naviera seleccionada
  const navesFiltradas = useMemo(() => {
    if (!filters.naviera) {
      return filterOptions.naves;
    }
    return records
      .filter(r => r.naviera === filters.naviera && r.nave)
      .map(r => r.nave!)
      .filter((nave, index, self) => self.indexOf(nave) === index)
      .sort();
  }, [filters.naviera, records, filterOptions.naves]);

  return (
    <div className="space-y-3">
      {!compact && (
        <div className="flex items-center justify-between border-b border-gray-200/20 dark:border-gray-700/30 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Filter className="h-4 w-4 text-blue-500" />
              Filtros Avanzados
            </h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Refina tu búsqueda con filtros específicos</p>
          </div>
          {hasActiveFilters && (
            <button
              onClick={handleClearAll}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all duration-200 hover:scale-105 ${isDark
                ? 'border border-blue-500/50 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20'
                : 'border border-blue-500/50 bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              <RotateCcw className="h-3 w-3" />
              Limpiar todo
            </button>
          )}
        </div>
      )}

      {/* Resumen de filtros activos */}
      {activeFiltersSummary.length > 0 && (
        <div className={`border p-3 space-y-3 ${isDark
          ? 'border-blue-500/30 bg-blue-900/20'
          : 'border-blue-200/60 bg-blue-50/80'
        }`}>
          <div className="flex items-center gap-2">
            <div className={`p-1.5 ${isDark ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
              <Filter className={`h-3.5 w-3.5 ${isDark ? 'text-blue-300' : 'text-blue-600'}`} />
            </div>
            <div>
              <span className={`text-xs font-semibold ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                Filtros activos
              </span>
              <span className={`ml-1.5 px-1.5 py-0.5 text-[10px] font-medium ${isDark ? 'bg-blue-500/30 text-blue-200' : 'bg-blue-200 text-blue-800'}`}>
                {activeFiltersSummary.length}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {activeFiltersSummary.map((filter, index) => (
              <div
                key={index}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium transition-all duration-200 hover:scale-105 ${isDark
                  ? 'bg-blue-800/40 border border-blue-600/40 text-blue-200 hover:bg-blue-700/50'
                  : 'bg-blue-100/80 border border-blue-300/60 text-blue-700 hover:bg-blue-200/80'
                }`}
              >
                <span className="font-semibold text-[10px] uppercase tracking-wide">{filter.label}:</span>
                <span className="text-xs">{filter.value}</span>
                <button
                  onClick={filter.onClear}
                  className={`ml-1 p-0.5 hover:bg-black/10 transition-colors ${isDark ? 'text-blue-300 hover:bg-white/10' : 'text-blue-600'
                    }`}
                  aria-label={`Quitar filtro ${filter.label}`}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {/* Filtro de Cliente */}
        <div className="space-y-2">
          <label className={`text-xs font-medium flex items-center gap-2 ${getLabelStyles(filters.cliente !== '')}`}>
            {filters.cliente && <Filter className="h-3 w-3" />}
            <span className="flex items-center gap-1">
              Cliente
              {filters.cliente && (
                <span className={`px-1.5 py-0.5 text-[9px] font-medium ${isDark ? 'bg-green-500/20 text-green-300' : 'bg-green-100 text-green-700'}`}>
                  ✓
                </span>
              )}
            </span>
          </label>
          <select
            value={filters.cliente}
            onChange={(e) => setFilters({ ...filters, cliente: e.target.value })}
            className={getFilterStyles(filters.cliente !== '')}
          >
            <option value="">Todos los clientes</option>
            {filterOptions.clientes.map((cliente) => (
              <option key={cliente} value={cliente}>
                {cliente}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro de Naviera */}
        <div className="space-y-2">
          <label className={`text-xs font-medium flex items-center gap-2 ${getLabelStyles(filters.naviera !== '')}`}>
            {filters.naviera && <Filter className="h-3 w-3" />}
            <span className="flex items-center gap-1">
              Naviera
              {filters.naviera && (
                <span className={`px-1.5 py-0.5 text-[9px] font-medium ${isDark ? 'bg-green-500/20 text-green-300' : 'bg-green-100 text-green-700'}`}>
                  ✓
                </span>
              )}
            </span>
          </label>
          <select
            value={filters.naviera}
            onChange={(e) => setFilters({ ...filters, naviera: e.target.value, nave: '' })}
            className={getFilterStyles(filters.naviera !== '')}
          >
            <option value="">Todas las navieras</option>
            {filterOptions.navieras.map((naviera) => (
              <option key={naviera} value={naviera}>
                {naviera}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro de Nave */}
        <div className="space-y-2">
          <label className={`text-xs font-medium flex items-center gap-2 ${getLabelStyles(filters.nave !== '')}`}>
            {filters.nave && <Filter className="h-3 w-3" />}
            <span className="flex items-center gap-1">
              Nave
              {filters.nave && (
                <span className={`px-1.5 py-0.5 text-[9px] font-medium ${isDark ? 'bg-green-500/20 text-green-300' : 'bg-green-100 text-green-700'}`}>
                  ✓
                </span>
              )}
            </span>
          </label>
          <select
            value={filters.nave}
            onChange={(e) => setFilters({ ...filters, nave: e.target.value })}
            className={getFilterStyles(filters.nave !== '')}
            disabled={filters.naviera === ''}
          >
            <option value="">{filters.naviera ? 'Todas las naves' : 'Selecciona una naviera primero'}</option>
            {navesFiltradas.map((nave) => (
              <option key={nave} value={nave}>
                {nave}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro de Especie */}
        <div className="space-y-2">
          <label className={`text-xs font-medium flex items-center gap-2 ${getLabelStyles(filters.especie !== '')}`}>
            {filters.especie && <Filter className="h-3 w-3" />}
            <span className="flex items-center gap-1">
              Especie
              {filters.especie && (
                <span className={`px-1.5 py-0.5 text-[9px] font-medium ${isDark ? 'bg-green-500/20 text-green-300' : 'bg-green-100 text-green-700'}`}>
                  ✓
                </span>
              )}
            </span>
          </label>
          <select
            value={filters.especie}
            onChange={(e) => setFilters({ ...filters, especie: e.target.value })}
            className={getFilterStyles(filters.especie !== '')}
          >
            <option value="">Todas las especies</option>
            {filterOptions.especies.map((especie) => (
              <option key={especie} value={especie}>
                {especie}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro de Depósito */}
        <div className="space-y-2">
          <label className={`text-xs font-medium flex items-center gap-2 ${getLabelStyles(filters.deposito !== '')}`}>
            {filters.deposito && <Filter className="h-3 w-3" />}
            <span className="flex items-center gap-1">
              Depósito
              {filters.deposito && (
                <span className={`px-1.5 py-0.5 text-[9px] font-medium ${isDark ? 'bg-green-500/20 text-green-300' : 'bg-green-100 text-green-700'}`}>
                  ✓
                </span>
              )}
            </span>
          </label>
          <select
            value={filters.deposito}
            onChange={(e) => setFilters({ ...filters, deposito: e.target.value })}
            className={getFilterStyles(filters.deposito !== '')}
          >
            <option value="">Todos los depósitos</option>
            {filterOptions.depositos.map((deposito) => (
              <option key={deposito} value={deposito}>
                {deposito}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
