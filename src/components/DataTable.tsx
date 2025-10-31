'use client';

import React, { useState, useMemo, useEffect, useRef, memo, useCallback } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Registro } from '@/types/registros';
import { Search, Filter, Download, Plus, X, ArrowUpDown, ArrowUp, ArrowDown, Trash2, Grid, List, Edit } from 'lucide-react';
import { ColumnToggle } from './ColumnToggle';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/hooks/useUser';

interface DataTableProps {
  data: Registro[];
  columns: ColumnDef<Registro>[];
  navierasUnicas: string[];
  ejecutivosUnicos: string[];
  especiesUnicas: string[];
  clientesUnicos: string[];
  polsUnicos: string[];
  destinosUnicos: string[];
  depositosUnicos: string[];
  yearsUnicos: string[];
  onAdd?: () => void;
  onEdit?: (record: Registro) => void;
  onEditNaveViaje?: (record: Registro) => void;
  onBulkEditNaveViaje?: (records: Registro[]) => void;
  onDelete?: (record: Registro) => void;
  onExport?: (filteredData?: Registro[]) => void;
  // Props para selección múltiple
  selectedRows?: Set<string>;
  onToggleRowSelection?: (recordId: string) => void;
  onSelectAll?: () => void;
  onClearSelection?: () => void;
  onBulkDelete?: () => void;
  // Prop para mantener filtros
  preserveFilters?: boolean;
}

export function DataTable({
  data,
  columns,
  navierasUnicas,
  ejecutivosUnicos,
  especiesUnicas,
  clientesUnicos,
  polsUnicos,
  destinosUnicos,
  depositosUnicos,
  yearsUnicos,
  onAdd,
  onEdit,
  onEditNaveViaje,
  onBulkEditNaveViaje,
  onDelete,
  onExport,
  selectedRows = new Set(),
  onToggleRowSelection,
  onSelectAll,
  onClearSelection,
  onBulkDelete,
  preserveFilters = true,
}: DataTableProps) {
  // Log muy básico al inicio
  console.log('🚀🚀🚀 DataTable INICIANDO RENDERIZADO - VERSION 1.0.5-FINAL');
  console.log('📊 Número de columnas recibidas:', columns.length);
  console.log('📋 IDs de columnas:', columns.map(c => c.id).filter(Boolean));
  console.log('📋 Headers de columnas:', columns.map(c => typeof c.header === 'string' ? c.header : 'Complex Header'));
  
  const { theme } = useTheme();
  
  const { canEdit, canAdd, canDelete, canExport, currentUser } = useUser();
  
  // Debug básico
  console.log('🚀 DataTable se está renderizando');
  console.log('🔍 DataTable Debug (Temporal):', {
    canEdit,
    canAdd,
    canDelete,
    canExport,
    currentUser,
    onAdd: !!onAdd,
    onEdit: !!onEdit,
    onDelete: !!onDelete,
    onExport: !!onExport,
    dataLength: data.length
  });
  
  // Helper para obtener estilos de filtro según el tema
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

  const [sorting, setSorting] = useState<SortingState>([
    { id: 'refAsli', desc: true } // Ordenar por REF ASLI descendente por defecto
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  
  // Estado para visibilidad de columnas
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
    // Inicializar todas las columnas como visibles por defecto
    const initialVisibility: Record<string, boolean> = {};
    columns.forEach(column => {
      if (column.id) {
        initialVisibility[column.id] = true;
      }
    });
    return initialVisibility;
  });

  // Columnas que nunca se pueden ocultar
  const alwaysVisibleColumns = ['select', 'refAsli', 'booking', 'historial'];
  
  // Estado para el menú contextual
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; record: Registro } | null>(null);
  
  // Estado para filtros de fechas
  const [dateFilters, setDateFilters] = useState({
    semanaIngreso: '',
    semanaEtd: '',
    semanaEta: '',
    mesIngreso: '',
    mesEtd: '',
    mesEta: '',
    year: '',
  });
  
  // Meses en español
  const months = [
    { value: '01', label: 'Enero' },
    { value: '02', label: 'Febrero' },
    { value: '03', label: 'Marzo' },
    { value: '04', label: 'Abril' },
    { value: '05', label: 'Mayo' },
    { value: '06', label: 'Junio' },
    { value: '07', label: 'Julio' },
    { value: '08', label: 'Agosto' },
    { value: '09', label: 'Septiembre' },
    { value: '10', label: 'Octubre' },
    { value: '11', label: 'Noviembre' },
    { value: '12', label: 'Diciembre' },
  ];

  // Refs
  const filterPanelRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const tableBodyRef = useRef<HTMLTableSectionElement>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Helper function para calcular clases de fila (fuera del map para optimización)
  const getRowClasses = (theme: string, isSelected: boolean, isCancelado: boolean, isPendiente: boolean) => {
    if (theme === 'dark') {
      if (isSelected) return { bg: 'bg-blue-900/40', hover: 'hover:bg-blue-900/60', text: 'text-blue-100 font-medium' };
      if (isCancelado) return { bg: 'bg-red-800/60', hover: 'hover:bg-red-800/80', text: 'text-red-100 font-medium' };
      if (isPendiente) return { bg: 'bg-yellow-800/60', hover: 'hover:bg-yellow-800/80', text: 'text-yellow-100 font-medium' };
      return { bg: 'bg-gray-800', hover: 'hover:bg-gray-700', text: 'text-gray-100' };
    } else {
      if (isSelected) return { bg: 'bg-blue-100', hover: 'hover:bg-blue-200', text: 'text-blue-800 font-medium' };
      if (isCancelado) return { bg: 'bg-red-100', hover: 'hover:bg-red-200', text: 'text-red-900 font-medium' };
      if (isPendiente) return { bg: 'bg-yellow-100', hover: 'hover:bg-yellow-200', text: 'text-yellow-900 font-medium' };
      return { bg: 'bg-white', hover: 'hover:bg-gray-50', text: 'text-gray-900' };
    }
  };

  // Funciones para manejar visibilidad de columnas
  const handleToggleColumn = (columnId: string) => {
    // No permitir ocultar columnas críticas
    if (alwaysVisibleColumns.includes(columnId)) {
      return;
    }
    
    setColumnVisibility(prev => ({
      ...prev,
      [columnId]: !prev[columnId]
    }));
  };

  const handleToggleAllColumns = (visible: boolean) => {
    const newVisibility: Record<string, boolean> = {};
    columns.forEach(column => {
      if (column.id) {
        // Las columnas críticas siempre deben estar visibles
        if (alwaysVisibleColumns.includes(column.id)) {
          newVisibility[column.id] = true;
        } else {
          newVisibility[column.id] = visible;
        }
      }
    });
    setColumnVisibility(newVisibility);
  };

  // Mantener filtros cuando los datos cambien
  // Los filtros se mantienen automáticamente por React Table

  // Cerrar con ESC
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowFilters(false);
      }
    };

    if (showFilters) {
      document.addEventListener('keydown', handleEsc);
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [showFilters]);

  // Cerrar con click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Verificar si el click fue fuera del panel de filtros
      if (filterPanelRef.current && showFilters) {
        // No cerrar si el click fue en el botón de filtros
        if (!target.closest('[data-filter-button]') && !filterPanelRef.current.contains(target)) {
          setShowFilters(false);
        }
      }
      
      // Cerrar menú contextual si se hace click fuera
      if (contextMenuRef.current && contextMenu && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu(null);
      }
    };

    if (showFilters || contextMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilters, contextMenu]);

  // Filtrar datos por fechas antes de pasar a la tabla (solo si hay filtros activos)
  const filteredData = useMemo(() => {
    const hasDateFilters = Object.values(dateFilters).some(v => v !== '');
    if (!hasDateFilters) return data;
    
    return data.filter((row) => {
      // Filtro por semana y mes de ingresado
      if (dateFilters.semanaIngreso) {
        if (!row.semanaIngreso || !String(row.semanaIngreso).includes(dateFilters.semanaIngreso)) {
          return false;
        }
      }
      if (dateFilters.mesIngreso) {
        // Calcular el mes directamente desde la fecha de ingreso
        const mesFiltro = parseInt(dateFilters.mesIngreso);
        if (!row.ingresado) {
          return false;
        }
        const fechaIngreso = new Date(row.ingresado);
        const mesIngreso = fechaIngreso.getMonth() + 1; // getMonth() devuelve 0-11, necesitamos 1-12
        if (mesIngreso !== mesFiltro) {
          return false;
        }
      }
      
      // Filtro por semana y mes de ETD
      if (dateFilters.semanaEtd) {
        if (!row.semanaZarpe || !String(row.semanaZarpe).includes(dateFilters.semanaEtd)) {
          return false;
        }
      }
      if (dateFilters.mesEtd) {
        // Calcular el mes directamente desde la fecha ETD
        const mesFiltro = parseInt(dateFilters.mesEtd);
        if (!row.etd) {
          return false;
        }
        const fechaEtd = new Date(row.etd);
        const mesEtd = fechaEtd.getMonth() + 1; // getMonth() devuelve 0-11, necesitamos 1-12
        if (mesEtd !== mesFiltro) {
          return false;
        }
      }
      
      // Filtro por semana y mes de ETA
      if (dateFilters.semanaEta) {
        if (!row.semanaArribo || !String(row.semanaArribo).includes(dateFilters.semanaEta)) {
          return false;
        }
      }
      if (dateFilters.mesEta) {
        // Calcular el mes directamente desde la fecha ETA
        const mesFiltro = parseInt(dateFilters.mesEta);
        if (!row.eta) {
          return false;
        }
        const fechaEta = new Date(row.eta);
        const mesEta = fechaEta.getMonth() + 1; // getMonth() devuelve 0-11, necesitamos 1-12
        if (mesEta !== mesFiltro) {
          return false;
        }
      }
      
      // Filtro por año
      if (dateFilters.year) {
        const yearFiltro = parseInt(dateFilters.year);
        const hasYearInFecha = 
          (row.ingresado && row.ingresado instanceof Date && row.ingresado.getFullYear() === yearFiltro) ||
          (row.etd && row.etd instanceof Date && row.etd.getFullYear() === yearFiltro) ||
          (row.eta && row.eta instanceof Date && row.eta.getFullYear() === yearFiltro);
        
        if (!hasYearInFecha) {
          return false;
        }
      }
      
      return true;
    });
  }, [data, dateFilters]);

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      columnVisibility,
    },
  });

  // Virtualización para optimizar el renderizado de muchas filas
  const { rows } = table.getRowModel();
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 40, // Altura estimada de cada fila en píxeles
    overscan: 10, // Renderizar 10 filas adicionales fuera del viewport para scroll suave
  });

  return (
    <div className="w-full space-y-4">
      {/* Header con controles */}
      <div className="flex flex-col gap-3">
        {/* Primera fila: Búsqueda */}
        <div className="w-full">
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            }`} />
            <input
              placeholder="Buscar en todos los campos..."
              value={globalFilter ?? ''}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                theme === 'dark'
                  ? 'border-gray-600 bg-gray-700 text-white placeholder:text-gray-400'
                  : 'border-gray-300 bg-white text-gray-900 placeholder:text-gray-500'
              }`}
            />
          </div>
        </div>
        
        {/* Segunda fila: Controles */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Filtros */}
            {/* Filtros */}
            <button 
              data-filter-button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center justify-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-2 border rounded-lg text-xs sm:text-sm transition-colors ${
                (columnFilters.length > 0 || Object.values(dateFilters).some(value => value !== ''))
                  ? theme === 'dark'
                    ? 'border-blue-500 bg-blue-900/30 text-blue-300'
                    : 'border-blue-500 bg-blue-50 text-blue-600'
                  : theme === 'dark'
                    ? 'border-gray-600 hover:bg-gray-700 text-gray-300'
                    : 'border-gray-300 hover:bg-gray-50 text-gray-600'
              }`}
            >
              <Filter className={`h-3 w-3 sm:h-4 sm:w-4 ${
                (columnFilters.length > 0 || Object.values(dateFilters).some(value => value !== ''))
                  ? theme === 'dark' ? 'text-blue-300' : 'text-blue-600'
                  : theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
              }`} />
              <span className="hidden sm:inline">Filtros</span>
              {(columnFilters.length > 0 || Object.values(dateFilters).some(value => value !== '')) && (
                <span className="bg-blue-600 text-white text-xs px-1 sm:px-1.5 py-0.5 rounded-full">
                  {columnFilters.length + Object.values(dateFilters).filter(value => value !== '').length}
                </span>
              )}
            </button>

            {/* Toggle de Vista */}
            <div className="flex border rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('table')}
                className={`px-2 sm:px-3 py-2 text-xs sm:text-sm transition-colors ${
                  viewMode === 'table'
                    ? theme === 'dark'
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-500 text-white'
                    : theme === 'dark'
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title="Vista de tabla"
              >
                <List className="h-3 w-3 sm:h-4 sm:w-4" />
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`px-2 sm:px-3 py-2 text-xs sm:text-sm transition-colors ${
                  viewMode === 'cards'
                    ? theme === 'dark'
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-500 text-white'
                    : theme === 'dark'
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title="Vista de tarjetas"
              >
                <Grid className="h-3 w-3 sm:h-4 sm:w-4" />
              </button>
            </div>

            {/* Toggle de Columnas */}
            <ColumnToggle
              columns={columns.map(col => ({
                id: col.id || '',
                header: typeof col.header === 'string' ? col.header : 'Columna',
                visible: columnVisibility[col.id || ''] ?? true
              }))}
              onToggleColumn={handleToggleColumn}
              onToggleAll={handleToggleAllColumns}
              alwaysVisibleColumns={alwaysVisibleColumns}
            />
          </div>

          {/* Botones de acción */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">


            {/* Exportar */}
            {onExport && canExport && (
              <button
                onClick={() => {
                  const actualFilteredData = table.getFilteredRowModel().rows.map(row => row.original);
                  onExport(actualFilteredData);
                }}
                className="flex items-center space-x-1 sm:space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                title="Exportar registros filtrados a Excel (solo los datos visibles actualmente)"
              >
                <Download className="h-4 w-4" />
                <span className="hidden xs:inline">Exportar</span>
              </button>
            )}
            
            {/* Agregar */}
            {onAdd && canAdd && (
              <button
                onClick={onAdd}
                className="flex items-center space-x-1 sm:space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                title="Agregar nuevo registro de embarque"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden xs:inline">Agregar</span>
              </button>
            )}

            {/* Limpiar selección */}
            {selectedRows.size > 0 && onClearSelection && (
              <button
                onClick={onClearSelection}
                className={`flex items-center space-x-1 sm:space-x-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  theme === 'dark'
                    ? 'bg-gray-700 text-gray-200 hover:bg-gray-600 border border-gray-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                }`}
                title="Limpiar selección"
              >
                <X className="h-4 w-4" />
                <span className="hidden xs:inline">Limpiar ({selectedRows.size})</span>
                <span className="xs:hidden">{selectedRows.size}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Panel de filtros */}
      {showFilters && (
        <div 
          ref={filterPanelRef} 
          className={`border rounded-lg p-4 transition-colors ${
            theme === 'dark'
              ? 'bg-gray-800 border-gray-600'
              : 'bg-white border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className={`font-medium ${
              theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
            }`}>Filtros por columna</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  setColumnFilters([]);
                  setDateFilters({
                    semanaIngreso: '',
                    semanaEtd: '',
                    semanaEta: '',
                    mesIngreso: '',
                    mesEtd: '',
                    mesEta: '',
                    year: '',
                  });
                }}
                className={`text-sm transition-colors ${
                  theme === 'dark'
                    ? 'text-blue-400 hover:text-blue-300'
                    : 'text-blue-600 hover:text-blue-800'
                }`}
              >
                Limpiar todos
              </button>
              <button
                onClick={() => setShowFilters(false)}
                className={`transition-colors ${
                  theme === 'dark'
                    ? 'text-gray-400 hover:text-gray-300'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {/* Filtros de columnas principales */}
            {table.getAllLeafColumns().map((column) => {
              if (column.id === 'select' || column.id.startsWith('_')) {
                return null;
              }
              
              // Filtrar solo las columnas importantes
                             const importantColumns = ['refAsli', 'estado', 'naviera', 'shipper', 'pod', 'deposito', 'pol', 'especie'];
               if (!importantColumns.includes(column.id)) {
                 return null;
               }
               
               const filterValue = (column.getFilterValue() ?? '') as string;
               const hasFilter = filterValue !== '';
               
               // Cambiar el label de refAsli a REF ASLI
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
               
                                                                                                                             // Cambiar el label de shipper a Cliente
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
                
                                                                   // Cambiar el label de pod a Destino
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
                
                                                                   // Cambiar el label de deposito a Depósito
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
                
                                                                   // Cambiar el label de pol a Puerto de Salida (POL)
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
               
                               // Filtro especial para estado: desplegable
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
              
              // Filtro especial para naviera: desplegable
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
              
              // Filtro especial para ejecutivo: desplegable
              if (column.id === 'ejecutivo') {
                return (
                  <div key={column.id} className="space-y-1">
                    <label className="text-xs font-medium text-black/50">
                      Ejecutivo
                    </label>
                    <select
                      value={filterValue}
                      onChange={(e) => column.setFilterValue(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black/50 bg-white"
                    >
                      <option value="">Todos</option>
                      {ejecutivosUnicos.map((ejecutivo) => (
                        <option key={ejecutivo} value={ejecutivo}>
                          {ejecutivo}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }
              
              // Filtro especial para especie: desplegable
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
              
              return (
                <div key={column.id} className="space-y-1">
                  <label className="text-xs font-medium text-black/50">
                    {column.id}
                  </label>
                  <input
                    type="text"
                    value={filterValue}
                    onChange={(e) => column.setFilterValue(e.target.value)}
                    placeholder={`Filtrar por ${column.id}...`}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black/50 placeholder:text-black/30"
                  />
                </div>
              );
            })}
            
            {/* Filtros de fechas reorganizados: Año, Meses, Semanas */}
            
            {/* Año */}
            <div className="space-y-1">
              <label className={`text-xs font-medium ${getLabelStyles(!!dateFilters.year)}`}>
                Año {dateFilters.year && '(✓)'}
              </label>
              <select
                value={dateFilters.year}
                onChange={(e) => setDateFilters({ ...dateFilters, year: e.target.value })}
                className={getFilterStyles(!!dateFilters.year)}
              >
                <option value="">Todos los años</option>
                {yearsUnicos.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Mes Ingresado */}
            <div className="space-y-1">
              <label className={`text-xs font-medium ${getLabelStyles(!!dateFilters.mesIngreso)}`}>
                Mes Ingresado {dateFilters.mesIngreso && '(✓)'}
              </label>
              <select
                value={dateFilters.mesIngreso}
                onChange={(e) => setDateFilters({ ...dateFilters, mesIngreso: e.target.value })}
                className={getFilterStyles(!!dateFilters.mesIngreso)}
              >
                <option value="">Todos los meses</option>
                {months.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Mes ETD */}
            <div className="space-y-1">
              <label className={`text-xs font-medium ${getLabelStyles(!!dateFilters.mesEtd)}`}>
                Mes ETD {dateFilters.mesEtd && '(✓)'}
              </label>
              <select
                value={dateFilters.mesEtd}
                onChange={(e) => setDateFilters({ ...dateFilters, mesEtd: e.target.value })}
                className={getFilterStyles(!!dateFilters.mesEtd)}
              >
                <option value="">Todos los meses</option>
                {months.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Mes ETA */}
            <div className="space-y-1">
              <label className={`text-xs font-medium ${getLabelStyles(!!dateFilters.mesEta)}`}>
                Mes ETA {dateFilters.mesEta && '(✓)'}
              </label>
              <select
                value={dateFilters.mesEta}
                onChange={(e) => setDateFilters({ ...dateFilters, mesEta: e.target.value })}
                className={getFilterStyles(!!dateFilters.mesEta)}
              >
                <option value="">Todos los meses</option>
                {months.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Semana Ingresado */}
            <div className="space-y-1">
              <label className={`text-xs font-medium ${getLabelStyles(!!dateFilters.semanaIngreso)}`}>
                Semana Ingresado {dateFilters.semanaIngreso && '(✓)'}
              </label>
              <input
                type="text"
                value={dateFilters.semanaIngreso}
                onChange={(e) => setDateFilters({ ...dateFilters, semanaIngreso: e.target.value })}
                placeholder="Ej: 2024-01 (Semana)"
                className={getFilterStyles(!!dateFilters.semanaIngreso)}
              />
            </div>
            
            {/* Semana ETD */}
            <div className="space-y-1">
              <label className={`text-xs font-medium ${getLabelStyles(!!dateFilters.semanaEtd)}`}>
                Semana ETD {dateFilters.semanaEtd && '(✓)'}
              </label>
              <input
                type="text"
                value={dateFilters.semanaEtd}
                onChange={(e) => setDateFilters({ ...dateFilters, semanaEtd: e.target.value })}
                placeholder="Ej: 2024-01 (Semana)"
                className={getFilterStyles(!!dateFilters.semanaEtd)}
              />
            </div>
            
            {/* Semana ETA */}
            <div className="space-y-1">
              <label className={`text-xs font-medium ${getLabelStyles(!!dateFilters.semanaEta)}`}>
                Semana ETA {dateFilters.semanaEta && '(✓)'}
              </label>
              <input
                type="text"
                value={dateFilters.semanaEta}
                onChange={(e) => setDateFilters({ ...dateFilters, semanaEta: e.target.value })}
                placeholder="Ej: 2024-01 (Semana)"
                className={getFilterStyles(!!dateFilters.semanaEta)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Tabla con scroll interno */}
      {viewMode === 'table' && (
       <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
         <div 
           ref={tableContainerRef}
           className="max-h-[70vh] overflow-y-auto overflow-x-auto"
         >
          <table className="w-full min-w-[800px] sm:min-w-[1000px] lg:min-w-[1200px]">
                         <thead className="bg-blue-900 sticky top-0 z-30 shadow-sm">
               {table.getHeaderGroups().map((headerGroup) => (
                 <tr key={headerGroup.id}>
                   {headerGroup.headers.map((header) => {
                     const canSort = header.column.getCanSort();
                     const sortDirection = header.column.getIsSorted();
                     const isSelectColumn = header.id === 'select';
                     const isRefAsliColumn = header.id === 'refAsli';
                     
                     // Clases para sticky
                     let stickyClasses = '';
                     let stickyStyles: React.CSSProperties = {};
                     
                    if (isSelectColumn) {
                      stickyClasses = 'sticky left-0 z-40 shadow-[2px_0_5px_rgba(0,0,0,0.1)]';
                      stickyStyles = { left: 0, width: '36px', minWidth: '36px', maxWidth: '36px', backgroundColor: '#1e3a8a' };
                    } else if (isRefAsliColumn) {
                      stickyClasses = 'sticky z-40 shadow-[2px_0_5px_rgba(0,0,0,0.1)]';
                      stickyStyles = { left: '36px', backgroundColor: '#1e3a8a' }; // Ancho exacto de checkbox
                    }
                     
                     return (
                       <th
                         key={header.id}
                        className={`${isSelectColumn ? 'px-1' : 'px-1 sm:px-2'} py-2 text-center text-xs font-bold uppercase tracking-wider whitespace-nowrap border-r border-gray-300 dark:border-gray-600 ${
                          canSort ? 'cursor-pointer select-none hover:bg-blue-800 transition-colors' : ''
                        } ${stickyClasses}`}
                         style={{ ...stickyStyles, color: 'white' }}
                         onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                       >
                         <div className="flex items-center justify-center gap-1">
                           {header.isPlaceholder
                             ? null
                             : flexRender(
                                 header.column.columnDef.header,
                                 header.getContext()
                               )}
                           {canSort && (
                             <span className="inline-flex flex-col ml-1">
                               {sortDirection === 'asc' && (
                                 <ArrowUp className="h-3 w-3" />
                               )}
                               {sortDirection === 'desc' && (
                                 <ArrowDown className="h-3 w-3" />
                               )}
                               {!sortDirection && (
                                 <ArrowUpDown className="h-3 w-3 opacity-50" />
                               )}
                             </span>
                           )}
                         </div>
                       </th>
                     );
                   })}
                 </tr>
               ))}
             </thead>
                         <tbody 
              ref={tableBodyRef}
              className={`divide-y transition-colors ${
                theme === 'dark' 
                  ? 'bg-gray-900 divide-gray-700' 
                  : 'bg-white divide-gray-200'
              }`}
            >
              {/* Spacer para filas que están antes del viewport */}
              {rowVirtualizer.getVirtualItems().length > 0 && (
                <tr>
                  <td 
                    colSpan={table.getHeaderGroups()[0]?.headers.length ?? columns.length} 
                    style={{ 
                      height: `${rowVirtualizer.getVirtualItems()[0]?.start ?? 0}px`,
                      padding: 0,
                      border: 'none'
                    }} 
                  />
                </tr>
              )}
              
              {/* Renderizar solo las filas virtuales visibles */}
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const row = rows[virtualRow.index];
                if (!row) return null;
                
                const isCancelado = row.original.estado === 'CANCELADO';
                const isPendiente = row.original.estado === 'PENDIENTE';
                const isSelected = selectedRows?.has(row.original.id || '');
                const rowClasses = getRowClasses(theme, isSelected, isCancelado, isPendiente);
                const rowBgColor = theme === 'dark' 
                  ? (row.index % 2 === 0 ? '#1f2937' : '#111827')
                  : (row.index % 2 === 0 ? '#ffffff' : '#f9fafb');
                
                return (
                  <tr
                    key={row.id}
                    className={`${rowClasses.bg} ${rowClasses.hover}`}
                    style={{
                      height: `${virtualRow.size}px`,
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({ x: e.clientX, y: e.clientY, record: row.original });
                    }}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const isSelectColumn = cell.column.id === 'select';
                      const isRefAsliColumn = cell.column.id === 'refAsli';
                      
                      // Clases para sticky
                      let stickyClasses = '';
                      let stickyStyles: React.CSSProperties = {};
                      
                      if (isSelectColumn) {
                        stickyClasses = `sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.1)]`;
                        stickyStyles = { left: 0, width: '36px', minWidth: '36px', maxWidth: '36px', backgroundColor: rowBgColor };
                      } else if (isRefAsliColumn) {
                        stickyClasses = `sticky z-10 shadow-[2px_0_5px_rgba(0,0,0,0.1)]`;
                        stickyStyles = { left: '36px', backgroundColor: rowBgColor };
                      }
                      
                      return (
                        <td 
                          key={cell.id} 
                          className={`${isSelectColumn ? 'px-1' : 'px-1 sm:px-2'} py-2 whitespace-nowrap text-xs text-center border-r border-b border-gray-200 dark:border-gray-700 ${rowClasses.text} ${stickyClasses}`}
                          style={stickyStyles}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              
              {/* Spacer para filas que están después del viewport */}
              {rowVirtualizer.getVirtualItems().length > 0 && (
                <tr>
                  <td 
                    colSpan={table.getHeaderGroups()[0]?.headers.length ?? columns.length} 
                    style={{ 
                      height: `${rowVirtualizer.getTotalSize() - (rowVirtualizer.getVirtualItems()[rowVirtualizer.getVirtualItems().length - 1]?.end ?? 0)}px`,
                      padding: 0,
                      border: 'none'
                    }} 
                  />
                </tr>
              )}
             </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Vista de Tarjetas para Móviles */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {table.getRowModel().rows.map((row) => {
            const registro = row.original;
            const isCancelado = registro.estado === 'CANCELADO';
            const isPendiente = registro.estado === 'PENDIENTE';
            
            return (
              <div
                key={row.id}
                className={`p-4 rounded-lg border transition-colors ${
                  theme === 'dark'
                    ? isCancelado
                      ? 'bg-red-800/60 border-red-600'
                      : isPendiente
                      ? 'bg-yellow-800/60 border-yellow-600'
                      : 'bg-gray-800 border-gray-600'
                    : isCancelado
                    ? 'bg-red-50 border-red-200'
                    : isPendiente
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-white border-gray-200'
                }`}
              >
                {/* Header de la tarjeta */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className={`font-bold text-sm ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      {registro.refAsli}
                    </h3>
                    <p className={`text-xs ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {registro.naviera} - {registro.naveInicial}
                    </p>
                    {registro.viaje && (
                      <p className={`text-xs font-mono ${
                        theme === 'dark' ? 'text-blue-300' : 'text-blue-600'
                      }`}>
                        [{registro.viaje}]
                      </p>
                    )}
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    registro.estado === 'CONFIRMADO'
                      ? theme === 'dark'
                        ? 'bg-green-800/60 text-green-200'
                        : 'bg-green-100 text-green-800'
                      : registro.estado === 'CANCELADO'
                      ? theme === 'dark'
                        ? 'bg-red-800/60 text-red-200'
                        : 'bg-red-100 text-red-800'
                      : theme === 'dark'
                        ? 'bg-yellow-800/60 text-yellow-200'
                        : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {registro.estado}
                  </div>
           </div>
           
                {/* Detalles principales */}
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between">
                    <span className={`text-xs ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>Cliente:</span>
                    <span className={`text-xs font-medium ${
                      theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                    }`}>{registro.shipper}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={`text-xs ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>Ejecutivo:</span>
                    <span className={`text-xs font-medium ${
                      theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                    }`}>{registro.ejecutivo}</span>
                  </div>
                  {registro.booking && (
                    <div className="flex justify-between">
                      <span className={`text-xs ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>Booking:</span>
                      <span className={`text-xs font-medium ${
                        theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                      }`}>{registro.booking}</span>
                    </div>
                  )}
                  {registro.contenedor && (
                    <div className="flex justify-between">
                      <span className={`text-xs ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>Contenedor:</span>
                      <div 
                        className="container-vertical" 
                        style={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          gap: '0.25rem', 
                          width: '100%',
                          alignItems: 'stretch'
                        }}
                      >
                        {(() => {
                          const contenedor = registro.contenedor;
                          if (!contenedor || contenedor === '') return null;
                          
                          // Si ya es un array, mostrarlo directamente
                          if (Array.isArray(contenedor)) {
                            return contenedor.map((container, index) => (
                              <span key={index} className={`text-xs font-mono px-1 py-0.5 rounded ${
                                theme === 'dark' ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-900'
                              }`}>
                                {container}
             </span>
                            ));
                          }
                          
                          // Si es string con espacios, convertir a array
                          if (typeof contenedor === 'string' && contenedor.includes(' ')) {
                            const containers = contenedor.split(/\s+/).filter(c => c.trim() !== '');
                            return containers.map((container, index) => (
                              <span key={index} className={`text-xs font-mono px-1 py-0.5 rounded ${
                                theme === 'dark' ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-900'
                              }`}>
                                {container}
                              </span>
                            ));
                          }
                          
                          // Si es un solo contenedor
                          return (
                            <span className={`text-xs font-mono px-1 py-0.5 rounded ${
                              theme === 'dark' ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-900'
                            }`}>
                              {contenedor}
                            </span>
                          );
                        })()}
           </div>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className={`text-xs ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>Especie:</span>
                    <span className={`text-xs font-medium ${
                      theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                    }`}>{registro.especie}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={`text-xs ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>POL:</span>
                    <span className={`text-xs font-medium ${
                      theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                    }`}>{registro.pol}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={`text-xs ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>POD:</span>
                    <span className={`text-xs font-medium ${
                      theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                    }`}>{registro.pod}</span>
                  </div>
                  {registro.etd && (
                    <div className="flex justify-between">
                      <span className={`text-xs ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>ETD:</span>
                      <span className={`text-xs font-medium ${
                        theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                      }`}>
                        {typeof registro.etd === 'string' ? registro.etd : 
                         registro.etd instanceof Date ? registro.etd.toLocaleDateString() : 
                         String(registro.etd)}
                      </span>
                    </div>
                  )}
                  {registro.eta && (
                    <div className="flex justify-between">
                      <span className={`text-xs ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>ETA:</span>
                      <span className={`text-xs font-medium ${
                        theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                      }`}>
                        {typeof registro.eta === 'string' ? registro.eta : 
                         registro.eta instanceof Date ? registro.eta.toLocaleDateString() : 
                         String(registro.eta)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Botones de acción */}
                <div className="flex justify-end space-x-2">
           </div>
         </div>
            );
          })}
        </div>
      )}

             {/* Footer con información de registros y logo */}
       <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
         {/* Información de registros - Izquierda */}
         <div className="flex-1 text-left">
           <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
             Mostrando {table.getFilteredRowModel().rows.length} registros
             {table.getFilteredRowModel().rows.length !== data.length && 
               ` (filtrados de ${data.length} total)`
             }
           </span>
         </div>
         
         {/* Logo ASLI - Centro */}
         <div className="flex-shrink-0 flex justify-center">
           <img 
             src="https://asli.cl/img/LOGO%20ASLI%20SIN%20FONDO%20BLLANCO.png" 
             alt="ASLI Logo" 
             className="h-8 w-auto opacity-70 hover:opacity-100 transition-opacity"
           />
         </div>
         
         {/* Espacio derecho (puede usarse para paginación futura) */}
         <div className="flex-1"></div>
       </div>
       
       {/* Menú contextual */}
       {contextMenu && (
         <div
           ref={contextMenuRef}
           className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-2 min-w-[180px]"
           style={{
             left: `${contextMenu.x}px`,
             top: `${contextMenu.y}px`,
           }}
         >
           {((selectedRows.size > 0 && onBulkEditNaveViaje) || onEditNaveViaje) && (
             <button
               onClick={() => {
                 if (selectedRows.size > 0 && onBulkEditNaveViaje) {
                   // Obtener los registros seleccionados
                   const selectedRecords = data.filter(r => r.id && selectedRows.has(r.id));
                   onBulkEditNaveViaje(selectedRecords);
                 } else if (onEditNaveViaje) {
                   onEditNaveViaje(contextMenu.record);
                 }
                 setContextMenu(null);
               }}
               className="w-full text-left px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center space-x-2"
             >
               <Edit className="h-4 w-4" />
               <span>
                 {selectedRows.size > 0 
                   ? `Editar Nave y Viaje (${selectedRows.size})`
                   : 'Editar Nave y Viaje'
                 }
               </span>
             </button>
           )}
           {canDelete && (selectedRows.size > 0 ? onBulkDelete : onDelete) && (
             <button
               onClick={() => {
                 if (selectedRows.size > 0 && onBulkDelete) {
                   // Si hay filas seleccionadas, eliminar todas las seleccionadas
                   onBulkDelete();
                 } else if (onDelete) {
                   // Si no hay selección, eliminar solo el registro del clic derecho
                   onDelete(contextMenu.record);
                 }
                 setContextMenu(null);
               }}
               className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-2"
             >
               <Trash2 className="h-4 w-4" />
               <span>
                 {selectedRows.size > 0 
                   ? `Eliminar selección (${selectedRows.size})`
                   : 'Eliminar'
                 }
               </span>
             </button>
           )}
         </div>
       )}
    </div>
  );
}
