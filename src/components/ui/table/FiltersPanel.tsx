'use client';

import React from 'react';
import { Table } from '@tanstack/react-table';
import { Registro } from '@/types/registros';
import { X, RotateCcw } from 'lucide-react';
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
}: FiltersPanelProps) {
  const { theme } = useTheme();

  const columnFilters = table.getState().columnFilters;
  const hasActiveFilters = columnFilters.length > 0 || executiveFilter !== '';

  const getFilterStyles = (hasFilter: boolean) => {
    const baseStyles = "w-full px-3 py-2 text-sm border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors";
    if (hasFilter) {
      return theme === 'dark'
        ? `${baseStyles} border-blue-500 bg-blue-900/30 font-semibold text-white`
        : `${baseStyles} border-blue-600 bg-blue-100 font-semibold text-gray-900`;
    } else {
      return theme === 'dark'
        ? `${baseStyles} border-gray-600 bg-gray-700 text-white placeholder:text-gray-400`
        : `${baseStyles} border-gray-300 bg-white text-gray-900 placeholder:text-gray-500`;
    }
  };

  const getLabelStyles = (hasFilter: boolean) => {
    if (hasFilter) {
      return theme === 'dark' ? 'text-blue-400 font-bold' : 'text-blue-600 font-bold';
    } else {
      return theme === 'dark' ? 'text-gray-400' : 'text-gray-600';
    }
  };

  const handleClearAll = () => {
    table.resetColumnFilters();
    setExecutiveFilter('');
    onClearAll?.();
  };

  const importantColumns = ['refAsli', 'estado', 'naviera', 'shipper', 'pod', 'deposito', 'pol', 'especie', 'naveInicial'];

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
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                theme === 'dark'
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

      <div className="space-y-4">
        {/* Filtro de Ejecutivo (separado) */}
        <div className="space-y-1">
          <label className={`text-xs font-medium ${getLabelStyles(executiveFilter !== '')}`}>
            Ejecutivo {executiveFilter && '(✓)'}
          </label>
          <select
            value={executiveFilter}
            onChange={(e) => setExecutiveFilter(e.target.value)}
            className={getFilterStyles(executiveFilter !== '')}
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

          const filterValue = (column.getFilterValue() ?? '') as string;
          const hasFilter = filterValue !== '';

          if (column.id === 'refAsli') {
            return (
              <div key={column.id} className="space-y-1">
                <label className={`text-xs font-medium ${getLabelStyles(hasFilter)}`}>
                  REF ASLI {hasFilter && '(✓)'}
                </label>
                <input
                  type="text"
                  value={filterValue}
                  onChange={(e) => column.setFilterValue(e.target.value)}
                  placeholder="Filtrar por REF ASLI..."
                  className={getFilterStyles(hasFilter)}
                />
              </div>
            );
          }

          if (column.id === 'shipper') {
            return (
              <div key={column.id} className="space-y-1">
                <label className={`text-xs font-medium ${getLabelStyles(hasFilter)}`}>
                  Cliente {hasFilter && '(✓)'}
                </label>
                <select
                  value={filterValue}
                  onChange={(e) => column.setFilterValue(e.target.value)}
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
            return (
              <div key={column.id} className="space-y-1">
                <label className={`text-xs font-medium ${getLabelStyles(hasFilter)}`}>
                  Nave {hasFilter && '(✓)'}
                </label>
                <select
                  value={filterValue}
                  onChange={(e) => column.setFilterValue(e.target.value)}
                  className={getFilterStyles(hasFilter)}
                >
                  <option value="">Todas</option>
                  {navesFiltrables.map(([value, label]) => (
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
                  Destino {hasFilter && '(✓)'}
                </label>
                <select
                  value={filterValue}
                  onChange={(e) => column.setFilterValue(e.target.value)}
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
                  Depósito {hasFilter && '(✓)'}
                </label>
                <select
                  value={filterValue}
                  onChange={(e) => column.setFilterValue(e.target.value)}
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
                  Puerto de Salida (POL) {hasFilter && '(✓)'}
                </label>
                <select
                  value={filterValue}
                  onChange={(e) => column.setFilterValue(e.target.value)}
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
                  Estado {hasFilter && '(✓)'}
                </label>
                <select
                  value={filterValue}
                  onChange={(e) => column.setFilterValue(e.target.value)}
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
                  Naviera {hasFilter && '(✓)'}
                </label>
                <select
                  value={filterValue}
                  onChange={(e) => column.setFilterValue(e.target.value)}
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
                  Especie {hasFilter && '(✓)'}
                </label>
                <select
                  value={filterValue}
                  onChange={(e) => column.setFilterValue(e.target.value)}
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
