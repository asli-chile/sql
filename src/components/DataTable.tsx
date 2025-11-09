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
import { Search, Filter, Plus, X, ArrowUpDown, ArrowUp, ArrowDown, Trash2, Grid, List, Edit, CheckSquare, Send, RotateCcw, RotateCw, Download, RefreshCw, SlidersHorizontal, History } from 'lucide-react';

import { ColumnToggle } from './ColumnToggle';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/hooks/useUser';
import { ReportGenerator } from './ReportGenerator';

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
  // Props para selección múltiple
  selectedRows?: Set<string>;
  onToggleRowSelection?: (recordId: string) => void;
  onSelectAll?: (filteredRecords: Registro[]) => void;
  onClearSelection?: () => void;
  onBulkDelete?: () => void;
  // Prop para mantener filtros
  preserveFilters?: boolean;
  onShowHistorial?: (record: Registro) => void;
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
  selectedRows = new Set(),
  onToggleRowSelection,
  onSelectAll,
  onClearSelection,
  onBulkDelete,
  preserveFilters = true,
  onShowHistorial,
}: DataTableProps) {
  // Log muy básico al inicio
  console.log('🚀🚀🚀 DataTable INICIANDO RENDERIZADO - VERSION 1.0.5-FINAL');
  console.log('📊 Número de columnas recibidas:', columns.length);
  console.log('📋 IDs de columnas:', columns.map(c => c.id).filter(Boolean));
  console.log('📋 Headers de columnas:', columns.map(c => typeof c.header === 'string' ? c.header : 'Complex Header'));
  
  const { theme } = useTheme();
  
  const { canEdit, canAdd, canDelete, canExport, currentUser } = useUser();
  
  const isDark = theme === 'dark';
  const panelClasses = isDark
    ? 'border border-slate-800/60 bg-slate-950/60 shadow-lg shadow-slate-950/30'
    : 'border border-gray-200 bg-white shadow-sm';
  const chipClasses = isDark
    ? 'rounded-full border border-slate-800/70 bg-slate-900/70 px-3 py-1 text-xs font-medium text-slate-200'
    : 'rounded-full border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700';
  const controlButtonBase = 'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  const controlButtonDefault = isDark
    ? `${controlButtonBase} border border-slate-800/70 bg-slate-900/60 text-slate-300 hover:border-sky-500/60 hover:text-sky-200 focus-visible:ring-sky-500/40 focus-visible:ring-offset-slate-950`
    : `${controlButtonBase} border border-gray-300 bg-white text-gray-700 hover:border-blue-400 hover:text-blue-600 focus-visible:ring-blue-400/40 focus-visible:ring-offset-white`;
  const controlButtonActive = isDark
    ? `${controlButtonBase} border border-sky-500/70 bg-sky-500/10 text-sky-200 shadow-[0_0_12px_rgba(14,165,233,0.2)] focus-visible:ring-sky-500/40 focus-visible:ring-offset-slate-950`
    : `${controlButtonBase} border border-blue-500 bg-blue-50 text-blue-600 focus-visible:ring-blue-400/40 focus-visible:ring-offset-white`;
  const toolbarButtonClasses = `${controlButtonDefault} shadow-inner shadow-slate-950/20`;
  const primaryActionClasses = isDark
    ? 'inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition-transform hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950'
    : 'inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white';
  const destructiveButtonClasses = isDark
    ? `${controlButtonBase} border border-rose-500/60 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20 focus-visible:ring-rose-500/40 focus-visible:ring-offset-slate-950`
    : `${controlButtonBase} border border-red-500 bg-red-500 text-white hover:bg-red-600 focus-visible:ring-red-400/40 focus-visible:ring-offset-white`;

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
  const [isCompact, setIsCompact] = useState(false);
  const manualViewToggleRef = useRef(false);
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
  const [showReportGenerator, setShowReportGenerator] = useState(false);
  const [columnSizing, setColumnSizing] = useState<Record<string, number>>({});
  
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
  const alwaysVisibleColumns = ['refAsli', 'refCliente', 'booking', 'historial'];
  
  // Estado para el menú contextual
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; record: Registro } | null>(null);
  
  const initialDateFilters: {
    semanaIngreso: string;
    semanaEtd: string;
    semanaEta: string;
    mesIngreso: string;
    mesEtd: string;
    mesEta: string;
    year: string;
  } = {
    semanaIngreso: '',
    semanaEtd: '',
    semanaEta: '',
    mesIngreso: '',
    mesEtd: '',
    mesEta: '',
    year: '',
  };
  
  // Estado para filtros de fechas
  const [dateFilters, setDateFilters] = useState<typeof initialDateFilters>(initialDateFilters);
  
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
      if (isSelected) return { bg: 'bg-sky-500/15', hover: 'hover:bg-sky-500/25', text: 'text-sky-100 font-semibold', border: 'border-sky-500/40', refAsliBg: 'rgba(12,74,110,1)' };
      if (isCancelado) return { bg: 'bg-rose-900/40', hover: 'hover:bg-rose-900/55', text: 'text-rose-200 font-medium', border: 'border-rose-500/40', refAsliBg: 'rgba(76,5,25,1)' };
      if (isPendiente) return { bg: 'bg-amber-900/40', hover: 'hover:bg-amber-900/55', text: 'text-amber-100 font-medium', border: 'border-amber-500/30', refAsliBg: 'rgba(88,53,1,1)' };
      return { bg: 'bg-slate-950/40', hover: 'hover:bg-slate-900/55', text: 'text-slate-200', border: 'border-slate-800/50', refAsliBg: 'rgba(15,23,42,1)' };
    } else {
      if (isSelected) return { bg: 'bg-blue-100', hover: 'hover:bg-blue-200', text: 'text-blue-800 font-semibold', border: 'border-blue-300', refAsliBg: '#bfdbfe' };
      if (isCancelado) return { bg: 'bg-red-100', hover: 'hover:bg-red-200', text: 'text-red-900 font-medium', border: 'border-red-200', refAsliBg: '#fecaca' };
      if (isPendiente) return { bg: 'bg-yellow-100', hover: 'hover:bg-yellow-200', text: 'text-yellow-900 font-medium', border: 'border-yellow-200', refAsliBg: '#fef08a' };
      return { bg: 'bg-white', hover: 'hover:bg-gray-50', text: 'text-gray-900', border: 'border-gray-200', refAsliBg: '#ffffff' };
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
    onColumnSizingChange: setColumnSizing,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      columnVisibility,
      columnSizing,
    },
    columnResizeMode: 'onChange',
    enableColumnResizing: true,
  });

  const handleResetTable = () => {
    table.resetSorting();
    table.resetColumnSizing();
    table.resetColumnVisibility();
    table.resetColumnOrder();
    setColumnFilters([]);
    setGlobalFilter('');
    setDateFilters({ ...initialDateFilters });
  };

  // Virtualización para optimizar el renderizado de muchas filas
  const { rows } = table.getRowModel();
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 44, // Altura estimada de cada fila en píxeles
    overscan: 10, // Renderizar 10 filas adicionales fuera del viewport para scroll suave
  });

  const selectedCount = selectedRows?.size ?? 0;
  const hasSelection = selectedCount > 0;

  const selectedRecordsList = useMemo(() => {
    if (!selectedRows || selectedRows.size === 0) return [] as Registro[];
    return data.filter((record) => record.id && selectedRows.has(record.id));
  }, [data, selectedRows]);

  const columnToggleOptions = useMemo(() => {
    return table.getAllLeafColumns().map((column) => {
      const headerLabel = typeof column.columnDef.header === 'string'
        ? column.columnDef.header
        : (column.id?.toUpperCase() ?? '');
      return {
        id: column.id ?? headerLabel,
        header: headerLabel,
        visible: column.getIsVisible(),
      };
    }).filter((option) => option.id && !option.id.startsWith('_'));
  }, [table]);

  const handleToggleFilters = () => setShowFilters((prev) => !prev);

  const handleSelectAllClick = () => {
    if (!onSelectAll) return;
    onSelectAll(filteredData);
  };

  const handleClearSelectionClick = () => {
    onClearSelection?.();
  };

  const handleBulkDeleteClick = () => {
    if (!hasSelection) return;
    onBulkDelete?.();
  };

  const handleToggleViewMode = () => {
    setViewMode((prev) => (prev === 'table' ? 'cards' : 'table'));
  };

  const handleGlobalSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setGlobalFilter(event.target.value);
  };

  const closeContextMenu = () => setContextMenu(null);

  const handleContextEdit = () => {
    if (!contextMenu || !onEdit) return;
    onEdit(contextMenu.record);
    closeContextMenu();
  };

  const handleContextEditNaveViaje = () => {
    if (!contextMenu) return;
    if (selectedRecordsList.length > 1 && onBulkEditNaveViaje) {
      onBulkEditNaveViaje(selectedRecordsList);
    } else if (onEditNaveViaje) {
      onEditNaveViaje(contextMenu.record);
    }
    closeContextMenu();
  };

  const handleContextDelete = () => {
    if (!contextMenu) return;
    if (hasSelection && onBulkDelete) {
      onBulkDelete();
    } else if (onDelete) {
      onDelete(contextMenu.record);
    }
    closeContextMenu();
  };

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const mediaQuery = window.matchMedia('(max-width: 1024px)');
    const handleMatch = () => {
      setIsCompact(mediaQuery.matches);
    };
    handleMatch();
    mediaQuery.addEventListener('change', handleMatch);
    return () => mediaQuery.removeEventListener('change', handleMatch);
  }, []);

  useEffect(() => {
    if (isCompact) {
      if (!manualViewToggleRef.current) {
        setViewMode('cards');
      }
    } else {
      manualViewToggleRef.current = false;
      setMobileActionsOpen(false);
    }
  }, [isCompact]);

  const renderToolbar = () => {
    if (isCompact) {
      return (
        <div className="flex flex-col gap-3">
          {canAdd && onAdd && (
            <button
              onClick={onAdd}
              className={`${primaryActionClasses} w-full justify-center text-sm py-3`}
            >
              <Plus className="h-4 w-4" />
              Nuevo registro
            </button>
          )}

          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={globalFilter ?? ''}
              onChange={handleGlobalSearchChange}
              placeholder="Buscar en la tabla..."
              className={`w-full pl-9 pr-3 py-2 text-xs rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                isDark
                  ? 'bg-slate-950/70 border-slate-800/70 text-slate-200 focus-visible:ring-sky-500/40 focus-visible:ring-offset-slate-950'
                  : 'bg-white border-gray-300 text-gray-700 focus-visible:ring-blue-400/40 focus-visible:ring-offset-white'
              }`}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              data-filter-button
              onClick={handleToggleFilters}
              className={`${showFilters ? controlButtonActive : toolbarButtonClasses} flex-1 justify-center text-[11px]`}
            >
              <Filter className="h-4 w-4" />
              Filtros
            </button>
            <button
              onClick={() => {
                manualViewToggleRef.current = true;
                handleToggleViewMode();
              }}
              className={`${toolbarButtonClasses} flex-1 justify-center text-[11px]`}
            >
              {viewMode === 'table' ? <Grid className="h-4 w-4" /> : <List className="h-4 w-4" />}
              {viewMode === 'table' ? 'Ver tarjetas' : 'Ver tabla'}
            </button>
            <button
              onClick={() => setMobileActionsOpen(true)}
              className={`${toolbarButtonClasses} flex-1 justify-center text-[11px]`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Acciones
            </button>
          </div>

          {mobileActionsOpen && (
            <div
              className="fixed inset-0 z-[1200] flex items-end justify-center bg-black/60 px-4 pb-6 sm:hidden"
              onClick={() => setMobileActionsOpen(false)}
            >
              <div
                className="w-full max-w-sm rounded-2xl border border-slate-800/70 bg-slate-950/95 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-slate-800/70 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-200">Acciones</p>
                  <button
                    onClick={() => setMobileActionsOpen(false)}
                    className="rounded-full bg-slate-900/70 p-2 text-slate-300 hover:bg-slate-800/80"
                    aria-label="Cerrar acciones"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex flex-col gap-2 px-4 py-4 text-[12px]">
                  <button
                    onClick={() => {
                      setShowReportGenerator(true);
                      setMobileActionsOpen(false);
                    }}
                    className={`${toolbarButtonClasses} justify-between`}
                  >
                    <span className="flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      Exportar reporte
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      handleResetTable();
                      setMobileActionsOpen(false);
                    }}
                    className={`${toolbarButtonClasses} justify-between border-sky-500/60 text-sky-200 hover:bg-sky-500/10`}
                  >
                    <span className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4" />
                      Reiniciar tabla
                    </span>
                  </button>
                  <button className={`${toolbarButtonClasses} justify-between`} disabled>
                    <span className="flex items-center gap-2">
                      <RotateCcw className="h-4 w-4" />
                      Deshacer
                    </span>
                  </button>
                  <button className={`${toolbarButtonClasses} justify-between`} disabled>
                    <span className="flex items-center gap-2">
                      <RotateCw className="h-4 w-4" />
                      Rehacer
                    </span>
                  </button>
                  <button className={`${toolbarButtonClasses} justify-between`} disabled>
                    <span className="flex items-center gap-2">
                      <SlidersHorizontal className="h-4 w-4" />
                      Densidad
                    </span>
                  </button>
                  {onSelectAll && (
                    <button
                      onClick={() => {
                        handleSelectAllClick();
                        setMobileActionsOpen(false);
                      }}
                      className={`${toolbarButtonClasses} justify-between`}
                    >
                      <span className="flex items-center gap-2">
                        <CheckSquare className="h-4 w-4" />
                        Seleccionar todo
                      </span>
                    </button>
                  )}
                  {onClearSelection && (
                    <button
                      onClick={() => {
                        handleClearSelectionClick();
                        setMobileActionsOpen(false);
                      }}
                      className={`${toolbarButtonClasses} justify-between ${!hasSelection ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={!hasSelection}
                    >
                      <span className="flex items-center gap-2">
                        <RotateCcw className="h-4 w-4" />
                        Limpiar selección
                      </span>
                    </button>
                  )}
                  {canDelete && onBulkDelete && (
                    <button
                      onClick={() => {
                        handleBulkDeleteClick();
                        setMobileActionsOpen(false);
                      }}
                      className={`${destructiveButtonClasses} justify-between ${!hasSelection ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={!hasSelection}
                    >
                      <span className="flex items-center gap-2">
                        <Trash2 className="h-4 w-4" />
                        Eliminar selección
                      </span>
                    </button>
                  )}
                  {columnToggleOptions.length > 0 && (
                    <div className="mt-2 rounded-xl border border-slate-800/60 bg-slate-900/60 p-2">
                      <ColumnToggle
                        columns={columnToggleOptions}
                        onToggleColumn={handleToggleColumn}
                        onToggleAll={handleToggleAllColumns}
                        alwaysVisibleColumns={alwaysVisibleColumns}
                      />
                    </div>
                  )}
                  {hasSelection && (
                    <span className="inline-flex items-center justify-center gap-1 rounded-full px-3 py-2 text-xs font-semibold border border-sky-500/40 bg-sky-500/10 text-sky-200">
                      {selectedCount} seleccionados
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {canAdd && onAdd && (
              <button
                onClick={onAdd}
                className={primaryActionClasses}
              >
                <Plus className="h-4 w-4" />
                Nuevo registro
              </button>
            )}

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={globalFilter ?? ''}
                onChange={handleGlobalSearchChange}
                placeholder="Buscar en la tabla..."
                className={`pl-9 pr-3 py-2 text-xs rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                  isDark
                    ? 'bg-slate-950/70 border-slate-800/70 text-slate-200 focus-visible:ring-sky-500/40 focus-visible:ring-offset-slate-950'
                    : 'bg-white border-gray-300 text-gray-700 focus-visible:ring-blue-400/40 focus-visible:ring-offset-white'
                }`}
              />
            </div>

            <button
              data-filter-button
              onClick={handleToggleFilters}
              className={showFilters ? controlButtonActive : toolbarButtonClasses}
            >
              <Filter className="h-4 w-4" />
              Filtros
            </button>

            <button
              onClick={() => {
                manualViewToggleRef.current = true;
                handleToggleViewMode();
              }}
              className={toolbarButtonClasses}
            >
              {viewMode === 'table' ? <Grid className="h-4 w-4" /> : <List className="h-4 w-4" />}
              {viewMode === 'table' ? 'Ver tarjetas' : 'Ver tabla'}
            </button>

            {columnToggleOptions.length > 0 && (
              <ColumnToggle
                columns={columnToggleOptions}
                onToggleColumn={handleToggleColumn}
                onToggleAll={handleToggleAllColumns}
                alwaysVisibleColumns={alwaysVisibleColumns}
              />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button className={toolbarButtonClasses} disabled>
              <RotateCcw className="h-4 w-4" />
              Deshacer
            </button>
            <button className={toolbarButtonClasses} disabled>
              <RotateCw className="h-4 w-4" />
              Rehacer
            </button>
            <button className={toolbarButtonClasses} disabled>
              <SlidersHorizontal className="h-4 w-4" />
              Densidad
            </button>
            <button
              className={toolbarButtonClasses}
              onClick={() => setShowReportGenerator(true)}
            >
              <Download className="h-4 w-4" />
              Exportar
            </button>
            <button
              className={`${toolbarButtonClasses} border-sky-500/60 text-sky-200 hover:bg-sky-500/10`}
              onClick={handleResetTable}
            >
              <RefreshCw className="h-4 w-4" />
              Reiniciar tabla
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {onSelectAll && (
              <button
                onClick={handleSelectAllClick}
                className={toolbarButtonClasses}
              >
                <CheckSquare className="h-4 w-4" />
                Seleccionar todo
              </button>
            )}
            {onClearSelection && (
              <button
                onClick={handleClearSelectionClick}
                className={`${toolbarButtonClasses} ${!hasSelection ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={!hasSelection}
              >
                <RotateCcw className="h-4 w-4" />
                Limpiar selección
              </button>
            )}
            {canDelete && onBulkDelete && (
              <button
                onClick={handleBulkDeleteClick}
                className={`${destructiveButtonClasses} ${!hasSelection ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={!hasSelection}
              >
                <Trash2 className="h-4 w-4" />
                Eliminar selección
              </button>
            )}
            {hasSelection && (
              <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                isDark
                  ? 'bg-sky-500/10 text-sky-200 border border-sky-500/40'
                  : 'bg-blue-100 text-blue-700 border border-blue-200'
              }`}>
                {selectedCount} seleccionados
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full space-y-4">
      {/* Header con controles */}
      <div className={`${panelClasses} rounded-2xl px-4 py-4 backdrop-blur`}
      >
        {renderToolbar()}
      </div>

      {/* Panel de filtros */}
      {showFilters && (
        <div
          ref={filterPanelRef}
          className={`${panelClasses} rounded-2xl border border-slate-800/60 bg-slate-950/70 p-5 backdrop-blur transition-all`}
        >
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Controles avanzados</p>
              <h3 className="text-sm font-semibold text-slate-100">Filtros por columna</h3>
            </div>
            <div className="flex items-center gap-2">
              {(columnFilters.length > 0 || Object.values(dateFilters).some((value) => value !== '')) && (
                <button
                  onClick={() => {
                    setColumnFilters([]);
                    setDateFilters({ ...initialDateFilters });
                  }}
                  className={`${controlButtonActive} px-3 py-1 text-[11px]`}
                >
                  Limpiar filtros
                </button>
              )}
              <button
                onClick={() => setShowFilters(false)}
                className={`${toolbarButtonClasses} px-3 py-1 text-[11px]`}
              >
                <X className="h-4 w-4" />
                Cerrar
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {/* Filtros de columnas principales */}
            {table.getAllLeafColumns().map((column) => {
              if (column.id.startsWith('_')) {
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
                    <label className={`text-xs font-medium ${getLabelStyles(hasFilter)}`}>
                      Ejecutivo {hasFilter && '(✓)'}
                    </label>
                    <select
                      value={filterValue}
                      onChange={(e) => column.setFilterValue(e.target.value)}
                      className={getFilterStyles(hasFilter)}
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
                  <label className={`text-xs font-medium ${getLabelStyles(hasFilter)}`}>
                    {column.id.toUpperCase()} {hasFilter && '(✓)'}
                  </label>
                  <input
                    type="text"
                    value={filterValue}
                    onChange={(e) => column.setFilterValue(e.target.value)}
                    placeholder={`Filtrar por ${column.id}...`}
                    className={getFilterStyles(hasFilter)}
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
       <div className={`${panelClasses} rounded-2xl overflow-hidden backdrop-blur`}
       >
         <div 
           ref={tableContainerRef}
           className={`max-h-[70vh] overflow-y-auto overflow-x-auto ${isDark ? 'bg-slate-950/40' : 'bg-white'}`}
           style={{
             willChange: 'scroll-position',
             WebkitOverflowScrolling: 'touch'
           }}
         >
          <table style={{ tableLayout: 'fixed', width: '100%', borderCollapse: 'collapse' }}>
            <thead className="sticky top-0 z-[250] shadow-[0_10px_24px_rgba(8,15,30,0.45)]">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort();
                    const sortDirection = header.column.getIsSorted();
                    const isRefAsliColumn = header.id === 'refAsli';

                    let stickyClasses = '';
                    let stickyStyles: React.CSSProperties = {};
                    
                    const columnMinSize = header.column.columnDef.minSize || 100;
                    const columnMaxSize = header.column.columnDef.maxSize || 300;
                    const columnSize = Math.min(
                      Math.max(header.column.getSize() || columnMinSize, columnMinSize),
                      columnMaxSize
                    );
                    const headerBorderColor = isDark ? 'rgba(56, 74, 110, 0.9)' : 'rgba(209, 213, 219, 0.9)';
                    
                    const baseHeaderStyle = {
                      background: isDark
                        ? 'linear-gradient(180deg, #10203f 0%, #0c1a36 100%)'
                        : 'linear-gradient(180deg, #f9fafb 0%, #e5e7eb 100%)',
                      color: isDark ? '#f8fafc' : '#0f172a',
                      backdropFilter: 'blur(12px)',
                    };
                    
                    if (isRefAsliColumn) {
                      stickyClasses = 'sticky left-0 z-[260]';
                      stickyStyles = {
                        ...baseHeaderStyle,
                        left: 0,
                        top: 0,
                        width: `${columnSize}px`,
                        minWidth: `${columnSize}px`,
                        maxWidth: `${columnSize}px`,
                        transform: 'translateZ(0)',
                        WebkitBackfaceVisibility: 'hidden',
                        backfaceVisibility: 'hidden' as any,
                        willChange: 'transform',
                        borderBottom: `1px solid ${headerBorderColor}`,
                        borderRight: `1px solid ${headerBorderColor}`,
                        boxShadow: 'none',
                        opacity: 1,
                      };
                    } else {
                      stickyClasses = 'relative z-[220]';
                      stickyStyles = {
                        ...baseHeaderStyle,
                        width: `${columnSize}px`,
                        minWidth: `${columnSize}px`,
                        maxWidth: `${columnSize}px`,
                        borderRight: `1px solid ${headerBorderColor}`,
                        borderBottom: `1px solid ${headerBorderColor}`,
                      };
                    }

                    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
                      if (!canSort) return;
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        header.column.toggleSorting();
                      }
                    };

                    return (
                      <th
                        key={header.id}
                        colSpan={header.colSpan}
                        className={`p-0 ${stickyClasses}`}
                        style={stickyStyles}
                      >
                        <div
                          className={`relative flex min-h-[44px] w-full items-center justify-between gap-1.5 px-3 py-2 select-none`}
                        >
                          <div
                            {...(canSort
                              ? {
                                  role: 'button',
                                  tabIndex: 0,
                                  onClick: header.column.getToggleSortingHandler(),
                                  onKeyDown: handleKeyDown,
                                }
                              : {})}
                            className={`flex items-center gap-2 ${
                              canSort ? 'cursor-pointer text-slate-300 hover:text-white' : 'text-slate-200'
                            }`}
                          >
                            <span className={`block whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.1em] ${
                              isDark ? 'text-slate-100' : 'text-slate-700'
                            }`}>
                              {flexRender(header.column.columnDef.header, header.getContext())}
                            </span>
                            {sortDirection ? (
                              sortDirection === 'asc' ? (
                                <ArrowUp size={12} />
                              ) : (
                                <ArrowDown size={12} />
                              )
                            ) : (
                              canSort && <ArrowUpDown size={12} />
                            )}
                          </div>
                          {header.column.getCanResize() && (
                            <div
                              onMouseDown={header.getResizeHandler()}
                              onTouchStart={header.getResizeHandler()}
                              className="absolute top-0 right-0 h-full w-2 cursor-col-resize select-none"
                            >
                              <div className="h-full w-[2px] bg-white/20 hover:bg-white/60" />
                            </div>
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
              className={`transition-colors ${
                isDark ? 'bg-transparent divide-slate-800/60' : 'bg-white divide-gray-200'
              }`}
            >
              {rowVirtualizer.getVirtualItems().length > 0 && (
                <tr>
                  <td
                    colSpan={table.getHeaderGroups()[0]?.headers.length ?? columns.length}
                    style={{
                      height: `${rowVirtualizer.getVirtualItems()[0]?.start ?? 0}px`,
                      padding: 0,
                      border: 'none',
                    }}
                  />
                </tr>
              )}
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const row = rows[virtualRow.index];
                if (!row) return null;

                const isCancelado = row.original.estado === 'CANCELADO';
                const isPendiente = row.original.estado === 'PENDIENTE';
                const isSelected = selectedRows?.has(row.original.id || '');
                const rowClasses = getRowClasses(theme, isSelected, isCancelado, isPendiente);
                const borderColor = isDark ? 'rgba(30, 41, 59, 0.9)' : 'rgba(229, 231, 235, 1)';
                const refAsliShadow = isDark ? '8px 0 14px rgba(8, 15, 30, 0.45)' : '2px 0 6px rgba(148, 163, 184, 0.2)';

                return (
                  <tr
                    key={row.id}
                    className={`relative border-b ${rowClasses.border} ${rowClasses.bg} ${rowClasses.hover}`}
                    style={{ height: `${virtualRow.size}px` }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      const hasEditNaveViaje = currentUser?.rol === 'admin' &&
                        ((selectedRows.size > 0 && onBulkEditNaveViaje) || onEditNaveViaje);
                      const hasDelete = canDelete && (selectedRows.size > 0 ? onBulkDelete : onDelete);
                      if (hasEditNaveViaje || hasDelete) {
                        setContextMenu({ x: e.clientX, y: e.clientY, record: row.original });
                      }
                    }}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const isRefAsliColumnCell = cell.column.id === 'refAsli';

                      let stickyClasses = '';
                      let stickyStyles: React.CSSProperties = {};

                      const columnMinSize = cell.column.columnDef.minSize || 100;
                      const columnMaxSize = cell.column.columnDef.maxSize || 300;
                      const columnWidth = Math.min(
                        Math.max(cell.column.getSize() || columnMinSize, columnMinSize),
                        columnMaxSize
                      );

                      if (isRefAsliColumnCell) {
                        stickyClasses = `sticky z-[240]`;
                        stickyStyles = {
                          left: 0,
                          width: `${columnWidth}px`,
                          minWidth: `${columnWidth}px`,
                          maxWidth: `${columnWidth}px`,
                          transform: 'translateZ(0)',
                          WebkitBackfaceVisibility: 'hidden',
                          backfaceVisibility: 'hidden' as any,
                          willChange: 'transform',
                          boxShadow: `${refAsliShadow}, inset 0 -1px 0 0 ${borderColor}`,
                          borderRight: `1px solid ${borderColor}`,
                          background: rowClasses.refAsliBg,
                        };
                      } else {
                        stickyClasses = 'relative z-[120]';
                        stickyStyles = {
                          width: `${columnWidth}px`,
                          minWidth: `${columnWidth}px`,
                          maxWidth: `${columnWidth}px`,
                        };
                      }

                      return (
                        <td
                          key={cell.id}
                          className={`p-0 whitespace-nowrap border-r ${
                            isDark ? 'border-slate-800/40' : 'border-gray-200'
                          } overflow-hidden ${rowClasses.text} ${stickyClasses}`}
                          style={stickyStyles}
                        >
                          <div
                            className={`flex h-full w-full items-center ${
                              isRefAsliColumnCell ? 'justify-start px-1.5 py-0.5' : 'justify-start px-3 py-2'
                            } text-[11px] sm:text-xs`}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {rowVirtualizer.getVirtualItems().length > 0 && (
                <tr>
                  <td
                    colSpan={table.getHeaderGroups()[0]?.headers.length ?? columns.length}
                    style={{
                      height: `${
                        rowVirtualizer.getTotalSize() -
                        (rowVirtualizer.getVirtualItems()[rowVirtualizer.getVirtualItems().length - 1]?.end ?? 0)
                      }px`,
                      padding: 0,
                      border: 'none',
                    }}
                  />
                </tr>
              )}
            </tbody>
          </table>
         </div>
       </div>
      )}

      {viewMode === 'cards' && (
        <div className={`${panelClasses} rounded-2xl p-4 backdrop-blur space-y-4`}>
          <div className={`grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 ${isCompact ? 'grid-cols-1 sm:grid-cols-2' : ''}`}>
            {filteredData.map((record, index) => {
              const key = record.id ?? `registro-${record.refAsli ?? index}`;
              const estado = record.estado ?? 'SIN ESTADO';
              const estadoColor = estado === 'CONFIRMADO'
                ? 'bg-emerald-500/15 text-emerald-200 border border-emerald-500/30'
                : estado === 'PENDIENTE'
                  ? 'bg-amber-500/15 text-amber-200 border border-amber-500/30'
                  : estado === 'CANCELADO'
                    ? 'bg-rose-500/15 text-rose-200 border border-rose-500/30'
                    : 'bg-slate-500/15 text-slate-200 border border-slate-500/30';

              const handleCardContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
                event.preventDefault();
                const hasEditNaveViaje = currentUser?.rol === 'admin' &&
                  ((selectedRows.size > 0 && onBulkEditNaveViaje) || onEditNaveViaje);
                const hasDelete = canDelete && (selectedRows.size > 0 ? onBulkDelete : onDelete);
                if (onEdit || hasEditNaveViaje || hasDelete) {
                  setContextMenu({ x: event.clientX, y: event.clientY, record });
                }
              };

              return (
                <div
                  key={key}
                  className={`group relative border border-slate-800/60 bg-slate-950/60 shadow-lg shadow-slate-950/20 transition-transform hover:-translate-y-[3px] hover:border-sky-500/60 ${isCompact ? 'rounded-xl p-3 space-y-3' : 'rounded-2xl p-4'}`}
                  onContextMenu={handleCardContextMenu}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Ref ASLI</p>
                      <h3 className={`${isCompact ? 'text-base' : 'text-lg'} font-semibold text-slate-100`}>{record.refAsli || 'Sin referencia'}</h3>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold ${estadoColor}`}>
                      {estado}
                    </span>
                  </div>

                  <div className={`mt-3 grid gap-2 text-slate-300 ${isCompact ? 'text-[11px]' : 'text-xs'}`}>
                    <div className="flex justify-between gap-3"><span className="text-slate-500">Ref Externa</span><span className="font-semibold text-right text-slate-200">{record.refCliente || '-'}</span></div>
                    <div className="flex justify-between gap-3"><span className="text-slate-500">Cliente</span><span className="font-semibold text-right text-slate-200">{record.shipper || '-'}</span></div>
                    <div className="flex justify-between gap-3"><span className="text-slate-500">Naviera</span><span className="font-semibold text-right text-slate-200">{record.naviera || '-'}</span></div>
                    <div className="flex justify-between gap-3"><span className="text-slate-500">Booking</span><span className="font-semibold text-right text-slate-200">{record.booking || '-'}</span></div>
                    <div className="flex justify-between gap-3"><span className="text-slate-500">Contenedor</span><span className="font-semibold text-right text-slate-200">{Array.isArray(record.contenedor) ? record.contenedor.join(', ') : (record.contenedor || '-')}</span></div>
                    <div className="flex justify-between gap-3"><span className="text-slate-500">Ingresado</span><span className="font-semibold text-right text-slate-200">{record.ingresado ? new Date(record.ingresado).toLocaleDateString('es-CL') : '-'}</span></div>
                  </div>

                  <div className={`mt-4 flex gap-2 ${isCompact ? 'flex-col' : 'items-center justify-between'}`}>
                    {onEdit && (
                      <button
                        onClick={() => onEdit(record)}
                        className={`${toolbarButtonClasses} flex-1 justify-center ${isCompact ? 'w-full text-[11px] py-2' : ''}`}
                      >
                        <Edit className="h-4 w-4" />
                        Editar
                      </button>
                    )}
                    {onShowHistorial && (
                      <button
                        onClick={() => onShowHistorial(record)}
                        className={`${toolbarButtonClasses} flex-1 justify-center ${isCompact ? 'w-full text-[11px] py-2' : ''}`}
                      >
                        <History className="h-4 w-4" />
                        Historial
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Report Generator Modal */}
      {showReportGenerator && (
        <ReportGenerator
          isOpen={showReportGenerator}
          registros={filteredData}
          onClose={() => setShowReportGenerator(false)}
        />
      )}

      {contextMenu && (
        <div
          ref={contextMenuRef}
          className={`fixed z-[999] min-w-[220px] overflow-hidden rounded-2xl border shadow-2xl ${
            isDark
              ? 'border-slate-800/70 bg-slate-950/95 text-slate-100'
              : 'border-gray-200 bg-white text-gray-900'
          }`}
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <div className={`border-b px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] ${
            isDark ? 'border-slate-800/60 text-slate-400' : 'border-gray-200 text-gray-500'
          }`}>
            Acciones rápidas
          </div>
          <div className="flex flex-col py-1 text-sm">
            {onEdit && (
              <button
                onClick={handleContextEdit}
                className="flex w-full items-center gap-2 px-4 py-2 text-left transition-colors hover:bg-sky-500/15 hover:text-sky-200"
              >
                <Edit className="h-4 w-4" />
                Editar registro
              </button>
            )}
            {(onEditNaveViaje || onBulkEditNaveViaje) && (
              <button
                onClick={handleContextEditNaveViaje}
                className="flex w-full items-center gap-2 px-4 py-2 text-left transition-colors hover:bg-sky-500/15 hover:text-sky-200"
              >
                <Send className="h-4 w-4" />
                Editar Nave / Viaje
              </button>
            )}
            {(canDelete && (onDelete || onBulkDelete)) && (
              <button
                onClick={handleContextDelete}
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-rose-200 transition-colors hover:bg-rose-500/15"
              >
                <Trash2 className="h-4 w-4" />
                {hasSelection ? 'Eliminar selección' : 'Eliminar registro'}
              </button>
            )}
          </div>
          <button
            onClick={closeContextMenu}
            className={`w-full border-t px-4 py-2 text-xs uppercase tracking-[0.2em] transition-colors ${
              isDark
                ? 'border-slate-800/60 text-slate-500 hover:bg-slate-900/70'
                : 'border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            Cerrar
          </button>
        </div>
      )}
    </div>
  );
}