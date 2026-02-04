'use client';

import React from 'react';
import { X, RotateCcw, Filter } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface DocumentosFiltersPanelProps {
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  hasActiveFilters: boolean;
  handleClearFilters: () => void;
  selectedSeason: string | null;
  setSelectedSeason: (season: string | null) => void;
  selectedClientes: string[];
  setSelectedClientes: (clientes: string[]) => void;
  selectedEjecutivo: string | null;
  setSelectedEjecutivo: (ejecutivo: string | null) => void;
  selectedEstado: string | null;
  setSelectedEstado: (estado: string | null) => void;
  selectedNaviera: string | null;
  setSelectedNaviera: (naviera: string | null) => void;
  selectedEspecie: string | null;
  setSelectedEspecie: (especie: string | null) => void;
  selectedNave: string | null;
  setSelectedNave: (nave: string | null) => void;
  fechaDesde: string;
  setFechaDesde: (fecha: string) => void;
  fechaHasta: string;
  setFechaHasta: (fecha: string) => void;
  filterOptions: {
    temporadas: string[];
    clientes: string[];
    ejecutivos: string[];
    navieras: string[];
    especies: string[];
    naves: string[];
  };
  handleToggleCliente: (cliente: string) => void;
  handleSelectAllClientes: () => void;
}

export function DocumentosFiltersPanel({
  showFilters,
  setShowFilters,
  hasActiveFilters,
  handleClearFilters,
  selectedSeason,
  setSelectedSeason,
  selectedClientes,
  setSelectedClientes,
  selectedEjecutivo,
  setSelectedEjecutivo,
  selectedEstado,
  setSelectedEstado,
  selectedNaviera,
  setSelectedNaviera,
  selectedEspecie,
  setSelectedEspecie,
  selectedNave,
  setSelectedNave,
  fechaDesde,
  setFechaDesde,
  fechaHasta,
  setFechaHasta,
  filterOptions,
  handleToggleCliente,
  handleSelectAllClientes,
}: DocumentosFiltersPanelProps) {
  const { theme } = useTheme();

  return (
    <>
      {/* Overlay para móvil */}
      {showFilters && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[260] lg:hidden"
          onClick={() => setShowFilters(false)}
        />
      )}

      {/* Sidebar de filtros */}
      <div className={`fixed top-0 right-0 h-screen w-full sm:h-full sm:w-80 md:w-96 transform transition-transform duration-300 ease-in-out z-[270] ${
        showFilters ? 'translate-x-0' : 'translate-x-full'
      } ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'} border-l shadow-2xl`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-3 sm:p-4 border-b ${theme === 'dark' ? 'border-slate-800' : 'border-gray-200'}`}>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 sm:h-5 sm:w-5" />
            <h2 className={`text-base sm:text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Filtros
            </h2>
          </div>
          <button
            onClick={() => setShowFilters(false)}
            className={`p-1.5 sm:p-2 rounded-lg transition-colors ${theme === 'dark' 
              ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200' 
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>

        {/* Contenido de filtros */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4" style={{ maxHeight: 'calc(100vh - 140px)' }}>
          {/* Filtro Temporada */}
          <div>
            <label className={`block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
              Temporada
            </label>
            <select
              value={selectedSeason ?? ''}
              onChange={(e) => setSelectedSeason(e.target.value || null)}
              className={`w-full rounded-lg border px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 ${theme === 'dark'
                ? 'border-slate-700 bg-slate-800 text-slate-200 focus:border-sky-500 focus:ring-sky-500/30'
                : 'border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500/30'
                }`}
            >
              <option value="">Todas</option>
              {filterOptions.temporadas.map((temporada) => (
                <option key={temporada} value={temporada}>
                  {temporada}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Clientes */}
          <div>
            <label className={`block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
              Clientes
            </label>
            <div className="space-y-2 max-h-32 sm:max-h-40 overflow-y-auto">
              <button
                onClick={handleSelectAllClientes}
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  selectedClientes.length === filterOptions.clientes.length
                    ? theme === 'dark' ? 'bg-slate-700 text-slate-200' : 'bg-gray-200 text-gray-700'
                    : theme === 'dark' ? 'text-slate-400 hover:bg-slate-800' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {selectedClientes.length === filterOptions.clientes.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
              </button>
              {filterOptions.clientes.map((cliente) => (
                <label key={cliente} className="flex items-center gap-2 text-xs sm:text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedClientes.some(c => c.trim().toUpperCase() === cliente.trim().toUpperCase())}
                    onChange={() => handleToggleCliente(cliente)}
                    className={`rounded border w-3.5 h-3.5 sm:w-4 sm:h-4 ${theme === 'dark' 
                      ? 'border-slate-600 bg-slate-800 text-sky-500 focus:ring-sky-500/30' 
                      : 'border-gray-300 bg-white text-blue-600 focus:ring-blue-500/30'
                    }`}
                  />
                  <span className={`truncate ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                    {cliente}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Filtro Ejecutivo */}
          <div>
            <label className={`block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
              Ejecutivo
            </label>
            <select
              value={selectedEjecutivo ?? ''}
              onChange={(e) => setSelectedEjecutivo(e.target.value || null)}
              className={`w-full rounded-lg border px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 ${theme === 'dark'
                ? 'border-slate-700 bg-slate-800 text-slate-200 focus:border-sky-500 focus:ring-sky-500/30'
                : 'border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500/30'
                }`}
            >
              <option value="">Todos</option>
              {filterOptions.ejecutivos.map((ejecutivo) => (
                <option key={ejecutivo} value={ejecutivo}>
                  {ejecutivo}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Estado */}
          <div>
            <label className={`block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
              Estado
            </label>
            <select
              value={selectedEstado ?? ''}
              onChange={(e) => setSelectedEstado(e.target.value || null)}
              className={`w-full rounded-lg border px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 ${theme === 'dark'
                ? 'border-slate-700 bg-slate-800 text-slate-200 focus:border-sky-500 focus:ring-sky-500/30'
                : 'border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500/30'
                }`}
            >
              <option value="">Todos</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="CONFIRMADO">Confirmado</option>
              <option value="CANCELADO">Cancelado</option>
            </select>
          </div>

          {/* Filtro Naviera */}
          <div>
            <label className={`block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
              Naviera
            </label>
            <select
              value={selectedNaviera ?? ''}
              onChange={(e) => setSelectedNaviera(e.target.value || null)}
              className={`w-full rounded-lg border px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 ${theme === 'dark'
                ? 'border-slate-700 bg-slate-800 text-slate-200 focus:border-sky-500 focus:ring-sky-500/30'
                : 'border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500/30'
                }`}
              disabled={filterOptions.navieras.length === 0}
            >
              <option value="">Todas</option>
              {filterOptions.navieras.map((naviera) => (
                <option key={naviera} value={naviera}>
                  {naviera}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Especie */}
          <div>
            <label className={`block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
              Especie
            </label>
            <select
              value={selectedEspecie ?? ''}
              onChange={(e) => setSelectedEspecie(e.target.value || null)}
              className={`w-full rounded-lg border px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 ${theme === 'dark'
                ? 'border-slate-700 bg-slate-800 text-slate-200 focus:border-sky-500 focus:ring-sky-500/30'
                : 'border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500/30'
                }`}
              disabled={filterOptions.especies.length === 0}
            >
              <option value="">Todas</option>
              {filterOptions.especies.map((especie) => (
                <option key={especie} value={especie}>
                  {especie}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Nave */}
          <div>
            <label className={`block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
              Nave
            </label>
            <select
              value={selectedNave ?? ''}
              onChange={(e) => setSelectedNave(e.target.value || null)}
              className={`w-full rounded-lg border px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 ${theme === 'dark'
                ? 'border-slate-700 bg-slate-800 text-slate-200 focus:border-sky-500 focus:ring-sky-500/30'
                : 'border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500/30'
                }`}
              disabled={filterOptions.naves.length === 0}
            >
              <option value="">Todas</option>
              {filterOptions.naves.map((nave) => (
                <option key={nave} value={nave}>
                  {nave}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Fecha Desde */}
          <div>
            <label className={`block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
              Fecha Desde
            </label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className={`w-full rounded-lg border px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 ${theme === 'dark'
                ? 'border-slate-700 bg-slate-800 text-slate-200 focus:border-sky-500 focus:ring-sky-500/30'
                : 'border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500/30'
                }`}
            />
          </div>

          {/* Filtro Fecha Hasta */}
          <div>
            <label className={`block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
              Fecha Hasta
            </label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className={`w-full rounded-lg border px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 ${theme === 'dark'
                ? 'border-slate-700 bg-slate-800 text-slate-200 focus:border-sky-500 focus:ring-sky-500/30'
                : 'border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500/30'
                }`}
            />
          </div>
        </div>

        {/* Footer */}
        <div className={`p-3 sm:p-4 border-t ${theme === 'dark' ? 'border-slate-800' : 'border-gray-200'}`}>
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className={`w-full flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${theme === 'dark'
                ? 'text-slate-300 hover:bg-slate-800 hover:text-slate-200'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <RotateCcw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Limpiar filtros
            </button>
          )}
        </div>
      </div>
    </>
  );
}
