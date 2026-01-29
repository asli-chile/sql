'use client';

import React, { useMemo, useEffect, useState } from 'react';
import { Table } from '@tanstack/react-table';
import { Registro } from '@/types/registros';
import { X, RotateCcw, Filter } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface FiltersPanelProps {
  table: Table<Registro>;
  executiveFilter: string;
  setExecutiveFilter: (value: string) => void;
  navierasUnicas: string[];
  ejecutivosUnicos: string[];
  especiesUnicas: string[];
  clientesUnicos: string[];
  polsUnicos: string[];
  destinosUnicos: string[];
  depositosUnicos: string[];
  navesFiltrables: Array<[string, string]>;
  onClearAll?: () => void;
  compact?: boolean;
  // Prop adicional para forzar actualizaciones cuando cambien los filtros
  filterUpdateKey?: string;
}

export function FiltersPanel({
  table,
  executiveFilter,
  setExecutiveFilter,
  navierasUnicas,
  ejecutivosUnicos,
  especiesUnicas,
  clientesUnicos,
  polsUnicos,
  destinosUnicos,
  depositosUnicos,
  navesFiltrables,
  onClearAll,
  compact = false,
  filterUpdateKey,
}: FiltersPanelProps) {
  const { theme } = useTheme();

  // Estado local para forzar re-renders cuando cambian los filtros
  const [filterUpdateTrigger, setFilterUpdateTrigger] = useState(0);

  // Suscribirse a cambios en el estado de la tabla para forzar actualizaciones
  useEffect(() => {
    // Forzar actualización cuando cambian los filtros de columna
    const checkForChanges = () => {
      setFilterUpdateTrigger(prev => prev + 1);
    };

    // Crear un intervalo para verificar cambios (fallback)
    const interval = setInterval(checkForChanges, 100);

    return () => {
      clearInterval(interval);
    };
  }, [table]);

  // Normalizar executiveFilter para asegurar que siempre sea string
  const normalizedExecutiveFilter = executiveFilter || '';

  // Leer columnFilters directamente del estado de la tabla en cada render
  // Esto asegura que siempre tengamos el estado más actualizado
  const columnFilters = table.getState().columnFilters;
  const hasActiveFilters = columnFilters.length > 0 || normalizedExecutiveFilter !== '';

  const getFilterStyles = (hasFilter: boolean) => {
    const baseStyles = "w-full px-3 py-2 text-sm border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all";
    if (hasFilter) {
      return theme === 'dark'
        ? `${baseStyles} border-blue-500 bg-blue-900/40 font-semibold text-white shadow-lg shadow-blue-900/30`
        : `${baseStyles} border-blue-600 bg-blue-100 font-semibold text-gray-900 shadow-md`;
    } else {
      return theme === 'dark'
        ? `${baseStyles} border-gray-600 bg-gray-700 text-white placeholder:text-gray-400`
        : `${baseStyles} border-gray-300 bg-white text-gray-900 placeholder:text-gray-500`;
    }
  };

  const getLabelStyles = (hasFilter: boolean) => {
    if (hasFilter) {
      return theme === 'dark' ? 'text-blue-300 font-bold flex items-center gap-1.5' : 'text-blue-700 font-bold flex items-center gap-1.5';
    } else {
      return theme === 'dark' ? 'text-gray-400' : 'text-gray-600';
    }
  };

  // Función auxiliar para obtener el valor de un filtro de manera consistente
  const getFilterValue = (column: any): string => {
    // Leer columnFilters fresco del estado de la tabla cada vez
    const currentColumnFilters = table.getState().columnFilters;

    // Primero intentar desde el estado de columnFilters
    const columnFilterFromState = currentColumnFilters.find(f => f.id === column.id);
    if (columnFilterFromState && columnFilterFromState.value !== undefined && columnFilterFromState.value !== null) {
      const stateValue = columnFilterFromState.value;
      if (typeof stateValue === 'string' && stateValue.trim() !== '') {
        return stateValue.trim();
      } else if (Array.isArray(stateValue) && stateValue.length > 0) {
        return String(stateValue[0]).trim();
      } else if (stateValue !== '' && stateValue !== null) {
        return String(stateValue).trim();
      }
    }

    // Fallback a getFilterValue si no está en columnFilters
    const rawFilterValue = column.getFilterValue();
    if (rawFilterValue !== null && rawFilterValue !== undefined) {
      if (Array.isArray(rawFilterValue)) {
        return rawFilterValue.length > 0 ? String(rawFilterValue[0]).trim() : '';
      } else if (typeof rawFilterValue === 'string') {
        return rawFilterValue.trim();
      } else if (rawFilterValue !== '' && rawFilterValue !== null) {
        return String(rawFilterValue).trim();
      }
    }

    return '';
  };

  // Obtener todos los filtros activos para mostrar en el resumen
  // Usar filterUpdateTrigger para forzar recálculo cuando cambien los filtros
  const getActiveFiltersSummary = useMemo(() => {
    const activeFilters: Array<{ label: string; value: string; onClear: () => void }> = [];

    if (normalizedExecutiveFilter) {
      activeFilters.push({
        label: 'Ejecutivo',
        value: normalizedExecutiveFilter,
        onClear: () => setExecutiveFilter('')
      });
    }

    // Usar columnFilters directamente del estado de la tabla como fuente de verdad
    // Leer fresco cada vez para obtener el estado más actualizado
    const columnFiltersFromState = table.getState().columnFilters;

    columnFiltersFromState.forEach((filter) => {
      // Verificar que el filtro tenga un valor válido
      if (!filter.value || filter.value === '' || filter.value === null || filter.value === undefined) {
        return;
      }

      // Normalizar el valor del filtro a string
      let filterValueStr = '';
      if (typeof filter.value === 'string') {
        filterValueStr = filter.value.trim();
      } else if (Array.isArray(filter.value)) {
        filterValueStr = filter.value.length > 0 ? String(filter.value[0]).trim() : '';
      } else {
        filterValueStr = String(filter.value).trim();
      }

      // Solo agregar si el valor no está vacío
      if (filterValueStr !== '') {
        const columnNames: Record<string, string> = {
          shipper: 'Cliente',
          naviera: 'Naviera',
          naveInicial: 'Nave',
          pod: 'Destino',
          deposito: 'Depósito',
          pol: 'POL',
          estado: 'Estado',
          especie: 'Especie',
          id: 'ID'
        };

        // Usar getAllColumns().find para evitar el error de consola "[Table] Column with id 'id' does not exist"
        const column = table.getAllColumns().find(c => c.id === filter.id);

        activeFilters.push({
          label: columnNames[filter.id] || filter.id,
          value: filterValueStr,
          onClear: () => {
            if (column) {
              column.setFilterValue(undefined);
            } else {
              // Si la columna no está definida (ej. id), limpiar el filtro manualmente
              table.setColumnFilters(prev => prev.filter(f => f.id !== filter.id));
            }
          }
        });
      }
    });

    return activeFilters;
  }, [normalizedExecutiveFilter, setExecutiveFilter, table, filterUpdateTrigger]);

  const activeFiltersSummary = getActiveFiltersSummary;

  const handleClearAll = () => {
    // Limpiar el filtro de ejecutivo primero
    setExecutiveFilter('');

    // Limpiar todos los filtros de columnas individualmente
    table.getAllLeafColumns().forEach((column) => {
      if (!column.id.startsWith('_')) {
        column.setFilterValue(undefined);
      }
    });

    // Resetear usando el método de la tabla para asegurar sincronización
    table.resetColumnFilters();

    // Llamar al callback si existe
    onClearAll?.();
  };

  const importantColumns = ['estado', 'naviera', 'shipper', 'pod', 'deposito', 'pol', 'especie', 'naveInicial'];

  return (
    <div className="space-y-4">
      {!compact && (
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Filtros por columna</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Aplica filtros para refinar los resultados</p>
          </div>
          {hasActiveFilters && (
            <button
              onClick={handleClearAll}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${theme === 'dark'
                  ? 'border border-blue-500/70 bg-blue-500/10 text-blue-200 hover:bg-blue-500/20'
                  : 'border border-blue-500 bg-blue-50 text-blue-600 hover:bg-blue-100'
                }`}
            >
              <RotateCcw className="h-3 w-3" />
              Limpiar
            </button>
          )}
        </div>
      )}

      {/* Resumen de filtros activos */}
      {activeFiltersSummary.length > 0 && (
        <div className={`rounded-lg border-2 p-3 space-y-2 ${theme === 'dark'
            ? 'border-blue-500/50 bg-blue-900/20'
            : 'border-blue-300 bg-blue-50'
          }`}>
          <div className="flex items-center gap-2">
            <Filter className={`h-4 w-4 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
            <span className={`text-xs font-semibold ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>
              Filtros activos ({activeFiltersSummary.length})
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {activeFiltersSummary.map((filter: { label: string; value: string; onClear: () => void }, index: number) => (
              <div
                key={index}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${theme === 'dark'
                    ? 'bg-blue-800/50 border border-blue-600/50 text-blue-200'
                    : 'bg-blue-100 border border-blue-300 text-blue-700'
                  }`}
              >
                <span className="font-semibold">{filter.label}:</span>
                <span>{filter.value}</span>
                <button
                  onClick={filter.onClear}
                  className={`ml-1 hover:opacity-70 transition-opacity ${theme === 'dark' ? 'text-blue-300' : 'text-blue-600'
                    }`}
                  aria-label={`Quitar filtro ${filter.label}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Filtro de Ejecutivo (separado) */}
        <div className="space-y-1">
          <label className={`text-xs font-medium ${getLabelStyles(normalizedExecutiveFilter !== '')}`}>
            {normalizedExecutiveFilter && <Filter className="h-3 w-3 inline" />}
            Ejecutivo {normalizedExecutiveFilter && <span className="text-xs">(✓)</span>}
          </label>
          <select
            value={normalizedExecutiveFilter}
            onChange={(e) => {
              const newValue = e.target.value;
              setExecutiveFilter(newValue);
            }}
            className={getFilterStyles(normalizedExecutiveFilter !== '')}
          >
            <option value="">Todos</option>
            {ejecutivosUnicos.map((ejecutivo) => (
              <option key={ejecutivo} value={ejecutivo}>
                {ejecutivo}
              </option>
            ))}
          </select>
        </div>

        {/* Filtros de columnas principales */}
        {table.getAllLeafColumns().map((column) => {
          if (column.id.startsWith('_') || !importantColumns.includes(column.id)) {
            return null;
          }

          // Usar la función centralizada para obtener el valor del filtro
          const filterValue = getFilterValue(column);
          const hasFilter = filterValue !== '';

          if (column.id === 'shipper') {
            return (
              <div key={column.id} className="space-y-1">
                <label className={`text-xs font-medium ${getLabelStyles(hasFilter)}`}>
                  {hasFilter && <Filter className="h-3 w-3 inline" />}
                  Cliente {hasFilter && <span className="text-xs">(✓)</span>}
                </label>
                <select
                  value={filterValue}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    // Usar undefined en lugar de string vacío para limpiar el filtro
                    column.setFilterValue(newValue === '' ? undefined : newValue);
                  }}
                  className={getFilterStyles(hasFilter)}
                >
                  <option value="">Todos</option>
                  {clientesUnicos.map((cliente) => (
                    <option key={cliente} value={cliente}>
                      {cliente}
                    </option>
                  ))}
                </select>
              </div>
            );
          }

          if (column.id === 'naveInicial') {
            // Obtener el filtro de naviera activo
            const navieraFilter = table.getColumn('naviera')?.getFilterValue() as string;

            // Filtrar naves por naviera seleccionada
            const navesFiltradas = navieraFilter
              ? navesFiltrables.filter(([value]) => {
                // Buscar la nave en los datos originales para verificar su naviera
                const registro = table.getPreFilteredRowModel().rows.find(row =>
                  row.original.naveInicial === value
                );
                return registro?.original.naviera === navieraFilter;
              })
              : navesFiltrables;

            return (
              <div key={column.id} className="space-y-1">
                <label className={`text-xs font-medium ${getLabelStyles(hasFilter)}`}>
                  {hasFilter && <Filter className="h-3 w-3 inline" />}
                  Nave {hasFilter && <span className="text-xs">(✓)</span>}
                </label>
                <select
                  value={filterValue}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    // Usar undefined en lugar de string vacío para limpiar el filtro
                    column.setFilterValue(newValue === '' ? undefined : newValue);
                  }}
                  className={getFilterStyles(hasFilter)}
                >
                  <option value="">Todas</option>
                  {navesFiltradas.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            );
          }

          if (column.id === 'pod') {
            return (
              <div key={column.id} className="space-y-1">
                <label className={`text-xs font-medium ${getLabelStyles(hasFilter)}`}>
                  {hasFilter && <Filter className="h-3 w-3 inline" />}
                  Destino {hasFilter && <span className="text-xs">(✓)</span>}
                </label>
                <select
                  value={filterValue}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    // Usar undefined en lugar de string vacío para limpiar el filtro
                    column.setFilterValue(newValue === '' ? undefined : newValue);
                  }}
                  className={getFilterStyles(hasFilter)}
                >
                  <option value="">Todos</option>
                  {destinosUnicos.map((destino) => (
                    <option key={destino} value={destino}>
                      {destino}
                    </option>
                  ))}
                </select>
              </div>
            );
          }

          if (column.id === 'deposito') {
            return (
              <div key={column.id} className="space-y-1">
                <label className={`text-xs font-medium ${getLabelStyles(hasFilter)}`}>
                  {hasFilter && <Filter className="h-3 w-3 inline" />}
                  Depósito {hasFilter && <span className="text-xs">(✓)</span>}
                </label>
                <select
                  value={filterValue}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    // Usar undefined en lugar de string vacío para limpiar el filtro
                    column.setFilterValue(newValue === '' ? undefined : newValue);
                  }}
                  className={getFilterStyles(hasFilter)}
                >
                  <option value="">Todos</option>
                  {depositosUnicos.map((deposito) => (
                    <option key={deposito} value={deposito}>
                      {deposito}
                    </option>
                  ))}
                </select>
              </div>
            );
          }

          if (column.id === 'pol') {
            return (
              <div key={column.id} className="space-y-1">
                <label className={`text-xs font-medium ${getLabelStyles(hasFilter)}`}>
                  {hasFilter && <Filter className="h-3 w-3 inline" />}
                  Puerto de Salida (POL) {hasFilter && <span className="text-xs">(✓)</span>}
                </label>
                <select
                  value={filterValue}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    // Usar undefined en lugar de string vacío para limpiar el filtro
                    column.setFilterValue(newValue === '' ? undefined : newValue);
                  }}
                  className={getFilterStyles(hasFilter)}
                >
                  <option value="">Todos</option>
                  {polsUnicos.map((pol) => (
                    <option key={pol} value={pol}>
                      {pol}
                    </option>
                  ))}
                </select>
              </div>
            );
          }

          if (column.id === 'estado') {
            return (
              <div key={column.id} className="space-y-1">
                <label className={`text-xs font-medium ${getLabelStyles(hasFilter)}`}>
                  {hasFilter && <Filter className="h-3 w-3 inline" />}
                  Estado {hasFilter && <span className="text-xs">(✓)</span>}
                </label>
                <select
                  value={filterValue}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    // Usar undefined en lugar de string vacío para limpiar el filtro
                    column.setFilterValue(newValue === '' ? undefined : newValue);
                  }}
                  className={getFilterStyles(hasFilter)}
                >
                  <option value="">Todos</option>
                  <option value="PENDIENTE">PENDIENTE</option>
                  <option value="CONFIRMADO">CONFIRMADO</option>
                  <option value="CANCELADO">CANCELADO</option>
                </select>
              </div>
            );
          }

          if (column.id === 'naviera') {
            return (
              <div key={column.id} className="space-y-1">
                <label className={`text-xs font-medium ${getLabelStyles(hasFilter)}`}>
                  {hasFilter && <Filter className="h-3 w-3 inline" />}
                  Naviera {hasFilter && <span className="text-xs">(✓)</span>}
                </label>
                <select
                  value={filterValue}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    // Usar undefined en lugar de string vacío para limpiar el filtro
                    column.setFilterValue(newValue === '' ? undefined : newValue);
                  }}
                  className={getFilterStyles(hasFilter)}
                >
                  <option value="">Todas</option>
                  {navierasUnicas.map((naviera) => (
                    <option key={naviera} value={naviera}>
                      {naviera}
                    </option>
                  ))}
                </select>
              </div>
            );
          }

          if (column.id === 'especie') {
            return (
              <div key={column.id} className="space-y-1">
                <label className={`text-xs font-medium ${getLabelStyles(hasFilter)}`}>
                  {hasFilter && <Filter className="h-3 w-3 inline" />}
                  Especie {hasFilter && <span className="text-xs">(✓)</span>}
                </label>
                <select
                  value={filterValue}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    // Usar undefined en lugar de string vacío para limpiar el filtro
                    column.setFilterValue(newValue === '' ? undefined : newValue);
                  }}
                  className={getFilterStyles(hasFilter)}
                >
                  <option value="">Todas</option>
                  {especiesUnicas.map((especie) => (
                    <option key={especie} value={especie}>
                      {especie}
                    </option>
                  ))}
                </select>
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}
