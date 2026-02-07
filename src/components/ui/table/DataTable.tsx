'use client';

import React, { useState, useMemo, useEffect, useRef, memo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  type ColumnSizingState,
  type Updater,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Registro } from '@/types/registros';
import { Search, Plus, X, ArrowUpDown, ArrowUp, ArrowDown, Trash2, Grid, List, Edit, CheckSquare, Send, RotateCcw, Download, RefreshCw, History, Eye, ExternalLink, Copy, Truck, Menu, Check, Clock, Receipt } from 'lucide-react';

import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/hooks/useUser';
import { ReportGenerator } from '@/components/tools/ReportGenerator';

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
  onSendToTransportes?: (record: Registro | Registro[]) => void;
  bookingDocuments?: Map<string, { nombre: string; fecha: string }>;
  // Callbacks para exponer estados al sidebar externo
  onTableInstanceReady?: (table: any, states: {
    executiveFilter: string;
    setExecutiveFilter: (value: string) => void;
    columnToggleOptions: Array<{ id: string; header: string; visible: boolean }>;
    handleToggleColumn: (columnId: string) => void;
    handleToggleAllColumns: (visible: boolean) => void;
    alwaysVisibleColumns: string[];
    navesFiltrables: Array<[string, string]>;
  }) => void;
}

type ScrollLockState = {
  bodyOverflow: string;
  htmlOverflow: string;
  bodyPosition: string;
  bodyTop: string;
  bodyLeft: string;
  bodyRight: string;
  bodyWidth: string;
  scrollY: number;
};

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
  onTableInstanceReady,
  onSendToTransportes,
  bookingDocuments,
}: DataTableProps) {
  const router = useRouter();
  const { theme } = useTheme();

  const { canEdit, canAdd, canDelete, canExport, currentUser } = useUser();
  const isAdmin = currentUser?.rol === 'admin';

  const isDark = theme === 'dark';
  const panelClasses = isDark
    ? 'border border-slate-800/60 bg-slate-950/60'
    : 'border border-gray-200 bg-white';
  const chipClasses = isDark
    ? 'border border-slate-800/70 bg-slate-900/70 px-3 py-1 text-xs font-medium text-slate-200'
    : 'border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700';
  const controlButtonBase = 'inline-flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed';
  const controlButtonDefault = isDark
    ? `${controlButtonBase} border border-slate-800/70 bg-slate-900/60 text-slate-300 hover:border-sky-500/60 hover:text-sky-200 focus-visible:ring-sky-500/40 focus-visible:ring-offset-slate-950`
    : `${controlButtonBase} border border-gray-300 bg-white text-gray-700 hover:border-blue-500 hover:text-blue-600 focus-visible:ring-blue-400/40 focus-visible:ring-offset-white`;
  const controlButtonActive = isDark
    ? `${controlButtonBase} border border-sky-500/70 bg-sky-500/10 text-sky-200 focus-visible:ring-sky-500/40 focus-visible:ring-offset-slate-950`
    : `${controlButtonBase} border border-blue-500 bg-blue-50 text-blue-600 focus-visible:ring-blue-400/40 focus-visible:ring-offset-white`;
  const toolbarButtonClasses = `${controlButtonDefault}`;
  const primaryActionClasses = isDark
    ? 'inline-flex items-center gap-1.5 sm:gap-2 bg-sky-600 text-xs sm:text-sm font-medium text-white transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-sky-500/60 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950'
    : 'inline-flex items-center gap-1.5 sm:gap-2 bg-blue-600 text-xs sm:text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-400 focus-visible:ring-offset-1 focus-visible:ring-offset-white';
  const destructiveButtonClasses = isDark
    ? `${controlButtonBase} border border-red-500 bg-red-500 text-white hover:bg-red-600 focus-visible:ring-red-400/50 focus-visible:ring-offset-slate-950`
    : `${controlButtonBase} border border-red-500 bg-red-500 text-black hover:bg-red-600 focus-visible:ring-red-400/40 focus-visible:ring-offset-white`;


  const [sorting, setSorting] = useState<SortingState>([
    { id: 'refAsli', desc: true } // Ordenar por REF ASLI descendente por defecto
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [showReportGenerator, setShowReportGenerator] = useState(false);
  const [showSheetsPreview, setShowSheetsPreview] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [iframeKey, setIframeKey] = useState(0);
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
  const columnSizingRef = useRef<ColumnSizingState>({});
  const columnSizingRafRef = useRef<number | null>(null);
  const pendingColumnSizingRef = useRef<ColumnSizingState | null>(null);
  const sheetsPreviewUrl = 'https://docs.google.com/spreadsheets/d/1w-qqXkBPNW2j0yvOiL4xp83cBtdbpYWU8YV77PaGBjg/preview';
  const sheetsEditUrl = 'https://docs.google.com/spreadsheets/d/1w-qqXkBPNW2j0yvOiL4xp83cBtdbpYWU8YV77PaGBjg/edit';
  const canPreviewSheets = Boolean(sheetsPreviewUrl);
  const scrollLockState = useRef<ScrollLockState | null>(null);
  const sizingResetRef = useRef(false);

  useEffect(() => {
    if (sizingResetRef.current) {
      return;
    }
    if (Object.keys(columnSizing).length > 0) {
      setColumnSizing({});
    }
    sizingResetRef.current = true;
  }, [columnSizing]);

  useEffect(() => {
    columnSizingRef.current = columnSizing;
  }, [columnSizing]);

  useEffect(() => {
    return () => {
      if (columnSizingRafRef.current) {
        cancelAnimationFrame(columnSizingRafRef.current);
      }
    };
  }, []);

  const handleSheetsUpdated = useCallback(() => {
    setIframeKey((prev) => prev + 1);
  }, []);

  const navesFiltrables = useMemo(() => {
    const map = new Map<string, string>();

    data.forEach((registro) => {
      const rawNave = (registro.naveInicial ?? '').trim();
      if (!rawNave) {
        return;
      }

      const display = registro.viaje && !rawNave.includes('[')
        ? `${rawNave} [${registro.viaje.trim()}]`
        : rawNave;

      if (!map.has(rawNave)) {
        map.set(rawNave, display);
      }
    });

    return Array.from(map.entries()).sort((a, b) =>
      a[1].localeCompare(b[1], 'es', { sensitivity: 'base' }),
    );
  }, [data]);

  // Estado para visibilidad de columnas
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
    // Inicializar todas las columnas como visibles por defecto
    const initialVisibility: Record<string, boolean> = {};
    columns.forEach(column => {
      if (column.id) {
        // La columna 'id' se mantiene oculta por defecto (se usa para filtrado interno)
        initialVisibility[column.id] = column.id !== 'id';
      }
    });
    return initialVisibility;
  });

  // Columnas que nunca se pueden ocultar
  const alwaysVisibleColumns = ['refAsli', 'refCliente', 'booking', 'historial'];

  // Estado para el menú contextual
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; record: Registro; openUpward?: boolean } | null>(null);

  const [executiveFilter, setExecutiveFilter] = useState('');
  const hasGlobalFilter = typeof globalFilter === 'string' && globalFilter.trim().length > 0;

  // Refs
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const tableBodyRef = useRef<HTMLTableSectionElement>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const cardsScrollRef = useRef<HTMLDivElement>(null);
  const cardsScrollStateRef = useRef({
    lastScrollTop: 0,
    lastDeltaY: 0,
    lastWheelTs: 0,
  });
  const cardsWheelRafRef = useRef<number | null>(null);
  const cardsWheelDeltaRef = useRef({ x: 0, y: 0 });
  const [tableWidth, setTableWidth] = useState<number>(0);
  const autoScrollRef = useRef({
    isActive: false,
    originX: 0,
    originY: 0,
    velocityX: 0,
    velocityY: 0,
    targetVelocityX: 0,
    targetVelocityY: 0,
    lastTimestamp: 0,
  });
  const autoScrollRafRef = useRef<number | null>(null);

  // Helper function para calcular clases de fila (fuera del map para optimización)
  const getRowClasses = (theme: string, isSelected: boolean, isCancelado: boolean, isPendiente: boolean) => {
    if (theme === 'dark') {
      if (isSelected) return { bg: 'bg-sky-500/15', hover: 'hover:bg-sky-500/25', text: 'text-sky-100', border: 'border-sky-500/40', refAsliBg: 'rgba(12,74,110,1)' };
      if (isCancelado) return { bg: 'bg-rose-900/40', hover: 'hover:bg-rose-900/55', text: 'text-rose-200', border: 'border-rose-500/40', refAsliBg: 'rgba(76,5,25,1)' };
      if (isPendiente) return { bg: 'bg-amber-900/40', hover: 'hover:bg-amber-900/55', text: 'text-amber-100', border: 'border-amber-500/30', refAsliBg: 'rgba(88,53,1,1)' };
      return { bg: 'bg-slate-950/40', hover: 'hover:bg-slate-900/55', text: 'text-slate-200', border: 'border-slate-800/50', refAsliBg: 'rgba(15,23,42,1)' };
    } else {
      if (isSelected) return { bg: 'bg-blue-100', hover: 'hover:bg-blue-200', text: 'text-blue-800', border: 'border-blue-300', refAsliBg: '#bfdbfe' };
      if (isCancelado) return { bg: 'bg-red-100', hover: 'hover:bg-red-200', text: 'text-red-900', border: 'border-red-200', refAsliBg: '#fecaca' };
      if (isPendiente) return { bg: 'bg-yellow-100', hover: 'hover:bg-yellow-200', text: 'text-yellow-900', border: 'border-yellow-200', refAsliBg: '#fef08a' };
      return { bg: 'bg-white', hover: 'hover:bg-gray-50', text: 'text-gray-900', border: 'border-gray-200', refAsliBg: '#ffffff' };
    }
  };

  // Funciones para manejar visibilidad de columnas
  const handleToggleColumn = useCallback((columnId: string) => {
    // No permitir ocultar columnas críticas
    if (alwaysVisibleColumns.includes(columnId)) {
      return;
    }

    setColumnVisibility(prev => ({
      ...prev,
      [columnId]: !prev[columnId]
    }));
  }, [alwaysVisibleColumns]);

  const handleToggleAllColumns = useCallback((visible: boolean) => {
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
  }, [columns, alwaysVisibleColumns]);

  // Mantener filtros cuando los datos cambien
  // Los filtros se mantienen automáticamente por React Table

  // Ajustar posición del menú contextual después de renderizarse
  useEffect(() => {
    if (contextMenu && contextMenuRef.current) {
      const menuElement = contextMenuRef.current;
      const menuHeight = menuElement.offsetHeight;
      const menuWidth = menuElement.offsetWidth;
      
      // Verificar si el menú se sale de la pantalla
      const spaceBelow = window.innerHeight - contextMenu.y;
      const spaceAbove = contextMenu.y;
      const spaceRight = window.innerWidth - contextMenu.x;
      const spaceLeft = contextMenu.x;
      
      let adjustedY = contextMenu.y;
      let adjustedX = contextMenu.x;
      
      // Si no hay espacio debajo pero sí arriba, abrir hacia arriba
      if (spaceBelow < menuHeight && spaceAbove > menuHeight) {
        adjustedY = contextMenu.y - menuHeight;
      }
      // Si tampoco hay espacio arriba, ajustar para que quepa
      else if (spaceBelow < menuHeight && spaceAbove < menuHeight) {
        adjustedY = Math.max(10, window.innerHeight - menuHeight - 10);
      }
      
      // Ajustar posición horizontal si se sale por la derecha
      if (spaceRight < menuWidth && spaceLeft > menuWidth) {
        adjustedX = contextMenu.x - menuWidth;
      }
      // Si tampoco hay espacio a la izquierda, ajustar para que quepa
      else if (spaceRight < menuWidth && spaceLeft < menuWidth) {
        adjustedX = Math.max(10, window.innerWidth - menuWidth - 10);
      }
      
      // Solo actualizar si es necesario
      if (adjustedY !== contextMenu.y || adjustedX !== contextMenu.x) {
        menuElement.style.top = `${Math.max(10, adjustedY)}px`;
        menuElement.style.left = `${Math.max(10, adjustedX)}px`;
      }
    }
  }, [contextMenu]);

  // Cerrar menú contextual si se hace click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Cerrar menú contextual si se hace click fuera
      if (contextMenuRef.current && contextMenu && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu(null);
      }
      // Cerrar menú hamburguesa si se hace click fuera
      if (menuRef.current && isMenuOpen && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (contextMenu || isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [contextMenu, isMenuOpen]);

  // Calcular ancho de la tabla dinámicamente
  useEffect(() => {
    let debounceTimer: NodeJS.Timeout;

    const updateTableWidth = () => {
      if (tableContainerRef.current) {
        // Obtener el ancho del contenedor padre (el div que envuelve tableContainerRef)
        const parentElement = tableContainerRef.current.parentElement;
        if (parentElement) {
          const parentRect = parentElement.getBoundingClientRect();
          const parentWidth = Math.floor(parentRect.width); // Redondear para evitar cambios mínimos

          // Solo actualizar si el cambio es significativo (más de 2px de diferencia)
          if (parentWidth > 0 && Math.abs(parentWidth - tableWidth) > 2) {
            setTableWidth(parentWidth);
          }
        } else {
          // Fallback: usar el ancho del contenedor mismo
          const rect = tableContainerRef.current.getBoundingClientRect();
          const containerWidth = Math.floor(Math.max(rect.width, tableContainerRef.current.clientWidth || 0));
          if (containerWidth > 0 && Math.abs(containerWidth - tableWidth) > 2) {
            setTableWidth(containerWidth);
          }
        }
      }
    };

    const debouncedUpdate = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(updateTableWidth, 16); // ~60fps
    };

    // Actualizar inmediatamente
    updateTableWidth();

    // Usar requestAnimationFrame solo una vez al inicio
    const rafId = requestAnimationFrame(updateTableWidth);

    window.addEventListener('resize', debouncedUpdate);

    // Usar ResizeObserver solo en el contenedor padre para evitar observaciones redundantes
    const resizeObserver = new ResizeObserver(debouncedUpdate);

    const parentElement = tableContainerRef.current?.parentElement;
    if (parentElement) {
      resizeObserver.observe(parentElement);
    }

    return () => {
      clearTimeout(debounceTimer);
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', debouncedUpdate);
      resizeObserver.disconnect();
    };
  }, [tableWidth]);

  // Filtrar datos por ejecutivo antes de pasar a la tabla
  const filteredData = useMemo(() => {
    if (!executiveFilter) {
      return data;
    }

    return data.filter((row) => row.ejecutivo === executiveFilter);
  }, [data, executiveFilter]);

  const handleColumnSizingChange = useCallback((updater: Updater<ColumnSizingState>) => {
    const nextSizing = typeof updater === 'function'
      ? updater(columnSizingRef.current)
      : updater;

    pendingColumnSizingRef.current = nextSizing;

    if (columnSizingRafRef.current) return;

    columnSizingRafRef.current = window.requestAnimationFrame(() => {
      columnSizingRafRef.current = null;
      if (pendingColumnSizingRef.current) {
        setColumnSizing(pendingColumnSizingRef.current);
        pendingColumnSizingRef.current = null;
      }
    });
  }, []);

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
    onColumnSizingChange: handleColumnSizingChange,
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
    setExecutiveFilter('');
  };


  // Memoizar el cálculo de anchos de columnas para evitar recalcularlos en cada render
  const columnWidths = useMemo(() => {
    const widths: Map<string, number> = new Map();
    const visibleColumns = table.getAllLeafColumns().filter(col =>
      table.getIsAllColumnsVisible() || col.getIsVisible(),
    );
    const totalColumns = visibleColumns.length;
    const hasCustomSizing = Object.keys(columnSizing).length > 0;
    const fixedShipperWidth = 250;
    const fixedNaveWidth = 250;
    const fixedContratoWidth = 300;
    const fixedBookingWidth = 230;

    // Si no hay columnas, retornar vacío
    if (totalColumns === 0) {
      return widths;
    }

    const getDefaultWidth = (column: (typeof visibleColumns)[number]) =>
      column.columnDef.size ?? column.columnDef.minSize ?? 150;
    const getColumnWidth = (column: (typeof visibleColumns)[number]) => {
      if (column.id === 'shipper') return fixedShipperWidth;
      if (column.id === 'naveInicial') return fixedNaveWidth;
      if (column.id === 'contrato') return fixedContratoWidth;
      if (column.id === 'booking') return fixedBookingWidth;
      return getDefaultWidth(column);
    };

    // Si tableWidth aún no está calculado, usar anchos por defecto
    if (tableWidth === 0) {
      visibleColumns.forEach(column => {
        widths.set(column.id, getColumnWidth(column));
      });
      return widths;
    }

    // Si hay anchos personalizados, usarlos directamente
    if (hasCustomSizing) {
      visibleColumns.forEach(column => {
        if (column.id === 'shipper') {
          widths.set(column.id, fixedShipperWidth);
          return;
        }
        if (column.id === 'naveInicial') {
          widths.set(column.id, fixedNaveWidth);
          return;
        }
        if (column.id === 'contrato') {
          widths.set(column.id, fixedContratoWidth);
          return;
        }
        if (column.id === 'booking') {
          widths.set(column.id, fixedBookingWidth);
          return;
        }
        const customSize = columnSizing[column.id];
        if (customSize && customSize > 0) {
          widths.set(column.id, customSize);
        } else {
          widths.set(column.id, getDefaultWidth(column));
        }
      });
      return widths;
    }

    // Usar anchos estándar definidos por columna
    visibleColumns.forEach(column => {
      widths.set(column.id, getColumnWidth(column));
    });

    return widths;
  }, [table, tableWidth, columnSizing, columnVisibility]);

  const calculatedTableWidth = useMemo(() => {
    if (tableWidth === 0) {
      return tableWidth;
    }

    let totalWidth = 0;
    columnWidths.forEach(size => {
      totalWidth += size;
    });

    return Math.max(tableWidth, totalWidth);
  }, [columnWidths, tableWidth]);

  // Virtualización para optimizar el renderizado de muchas filas
  const { rows } = table.getRowModel();
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 40, // Altura estimada de cada fila en píxeles
    overscan: rows.length > 50 ? 5 : 10, // Menos overscan para tablas grandes, más para pequeñas
    paddingEnd: 20, // Padding al final para evitar vibración en el scroll
    scrollPaddingEnd: 20, // Padding adicional para scroll suave
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
  }, [table, columnVisibility]);

  // Exponer estados al componente padre si se proporciona el callback
  // Usar useRef para almacenar el callback y evitar re-renders infinitos
  const onTableInstanceReadyRef = useRef(onTableInstanceReady);
  useEffect(() => {
    onTableInstanceReadyRef.current = onTableInstanceReady;
  }, [onTableInstanceReady]);

  // Almacenar estados actuales en refs para pasarlos frescos sin causar re-renders
  const statesRef = useRef({
    executiveFilter,
    setExecutiveFilter,
    columnToggleOptions,
    handleToggleColumn,
    handleToggleAllColumns,
    alwaysVisibleColumns,
    navesFiltrables,
  });

  // Actualizar refs cuando los estados cambien
  useEffect(() => {
    statesRef.current = {
      executiveFilter,
      setExecutiveFilter,
      columnToggleOptions,
      handleToggleColumn,
      handleToggleAllColumns,
      alwaysVisibleColumns,
      navesFiltrables,
    };
  }, [executiveFilter, columnToggleOptions, navesFiltrables, handleToggleColumn, handleToggleAllColumns, alwaysVisibleColumns, setExecutiveFilter]);

  // Ejecutar cuando la tabla cambie (nueva instancia)
  // Usar useRef para rastrear la última tabla que se pasó al callback
  const lastTableRef = useRef<any>(null);
  useEffect(() => {
    // Solo llamar si la tabla cambió (nueva referencia de objeto)
    if (onTableInstanceReadyRef.current && table && lastTableRef.current !== table) {
      lastTableRef.current = table;
      // Pasar los estados frescos desde el ref
      onTableInstanceReadyRef.current(table, statesRef.current);
    }
  }, [table]); // Solo dependemos de table para evitar ejecuciones innecesarias

  // Actualizar el callback cuando cambien los estados importantes para que el padre tenga los valores actualizados
  useEffect(() => {
    if (onTableInstanceReadyRef.current && table && lastTableRef.current === table) {
      // Actualizar solo los estados sin cambiar la referencia de la tabla
      onTableInstanceReadyRef.current(table, statesRef.current);
    }
  }, [table, executiveFilter, columnToggleOptions, navesFiltrables]); // Actualizar cuando cambien estos estados

  const handleSelectAllClick = () => {
    if (!onSelectAll) return;
    const visibleRecords = table.getRowModel().rows.map(row => row.original);
    onSelectAll(visibleRecords);
    setIsMenuOpen(false);
  };

  // Detectar si hay filtros activos
  const visibleRowsCount = table.getRowModel().rows.length;
  const totalRowsCount = data.length;
  const hasActiveFilters = visibleRowsCount < totalRowsCount;
  
  // Verificar si todos los registros visibles están seleccionados
  const visibleRecordIds = new Set(table.getRowModel().rows.map(row => row.original.id).filter((id): id is string => Boolean(id)));
  const allVisibleSelected = visibleRecordIds.size > 0 && Array.from(visibleRecordIds).every(id => selectedRows.has(id));

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

  const handleContextSendToTransportes = () => {
    if (!contextMenu || !onSendToTransportes) return;

    // Si hay múltiples registros seleccionados, enviarlos todos de una vez
    if (hasSelection && selectedRecordsList.length > 0) {
      onSendToTransportes(selectedRecordsList);
    } else {
      // Si no hay selección, enviar solo el registro del menú contextual
      onSendToTransportes(contextMenu.record);
    }

    closeContextMenu();
  };

  useEffect(() => {
    if (!canPreviewSheets) {
      setShowSheetsPreview(false);
    }
  }, [canPreviewSheets]);

  const lockPageScroll = useCallback(() => {
    if (typeof window === 'undefined' || scrollLockState.current) {
      return;
    }

    const scrollY =
      window.scrollY ||
      window.pageYOffset ||
      document.documentElement.scrollTop ||
      0;

    scrollLockState.current = {
      bodyOverflow: document.body.style.overflow,
      htmlOverflow: document.documentElement.style.overflow,
      bodyPosition: document.body.style.position,
      bodyTop: document.body.style.top,
      bodyLeft: document.body.style.left,
      bodyRight: document.body.style.right,
      bodyWidth: document.body.style.width,
      scrollY,
    };

    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
  }, []);

  const unlockPageScroll = useCallback(() => {
    if (typeof window === 'undefined' || !scrollLockState.current) {
      return;
    }

    const previous = scrollLockState.current;
    document.body.style.overflow = previous.bodyOverflow;
    document.documentElement.style.overflow = previous.htmlOverflow;
    document.body.style.position = previous.bodyPosition;
    document.body.style.top = previous.bodyTop;
    document.body.style.left = previous.bodyLeft;
    document.body.style.right = previous.bodyRight;
    document.body.style.width = previous.bodyWidth;

    scrollLockState.current = null;

    window.requestAnimationFrame(() => {
      window.scrollTo(0, previous.scrollY);
    });
  }, []);

  useEffect(() => {
    if (!showSheetsPreview) {
      unlockPageScroll();
    }
    return () => {
      unlockPageScroll();
    };
  }, [showSheetsPreview, unlockPageScroll]);

  const handleSheetsMouseEnter = () => {
    lockPageScroll();
  };

  const handleSheetsMouseLeave = () => {
    unlockPageScroll();
  };

  const handleCardsWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    const container = event.currentTarget;
    const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);
    const maxScrollLeft = Math.max(0, container.scrollWidth - container.clientWidth);

    if (maxScrollTop === 0 && maxScrollLeft === 0) return;

    const isHorizontalIntent = Math.abs(event.deltaX) > Math.abs(event.deltaY) || event.shiftKey;
    const deltaX = isHorizontalIntent ? (event.deltaX || event.deltaY) : event.deltaX;
    const deltaY = isHorizontalIntent ? 0 : event.deltaY;

    cardsWheelDeltaRef.current.x += deltaX;
    cardsWheelDeltaRef.current.y += deltaY;

    if (!cardsWheelRafRef.current) {
      cardsWheelRafRef.current = requestAnimationFrame(() => {
        cardsWheelRafRef.current = null;
        const pendingX = cardsWheelDeltaRef.current.x;
        const pendingY = cardsWheelDeltaRef.current.y;
        cardsWheelDeltaRef.current.x = 0;
        cardsWheelDeltaRef.current.y = 0;

        const nextTop = Math.min(maxScrollTop, Math.max(0, container.scrollTop + pendingY));
        const nextLeft = Math.min(maxScrollLeft, Math.max(0, container.scrollLeft + pendingX));

        if (nextTop !== container.scrollTop) {
          container.scrollTop = nextTop;
        }
        if (nextLeft !== container.scrollLeft) {
          container.scrollLeft = nextLeft;
        }
      });
    }

    cardsScrollStateRef.current.lastDeltaY = event.deltaY;
    cardsScrollStateRef.current.lastWheelTs = performance.now();
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleCardsScroll = useCallback(() => {
    const container = cardsScrollRef.current;
    if (!container) return;
    const currentTop = container.scrollTop;
    const { lastScrollTop, lastDeltaY, lastWheelTs } = cardsScrollStateRef.current;
    const now = performance.now();
    const jumpedUp = currentTop < lastScrollTop - 40;
    const scrollingDown = lastDeltaY > 0 && now - lastWheelTs < 200;

    if (jumpedUp && scrollingDown) {
      container.scrollTop = lastScrollTop;
      return;
    }

    cardsScrollStateRef.current.lastScrollTop = currentTop;
  }, []);

  const stopAutoScroll = useCallback(() => {
    const container = tableContainerRef.current;
    if (container) {
      container.style.cursor = '';
    }
    autoScrollRef.current.isActive = false;
    autoScrollRef.current.velocityX = 0;
    autoScrollRef.current.velocityY = 0;
    autoScrollRef.current.targetVelocityX = 0;
    autoScrollRef.current.targetVelocityY = 0;
    autoScrollRef.current.lastTimestamp = 0;
    if (autoScrollRafRef.current) {
      cancelAnimationFrame(autoScrollRafRef.current);
      autoScrollRafRef.current = null;
    }
  }, []);

  const startAutoScroll = useCallback((originX: number, originY: number) => {
    const container = tableContainerRef.current;
    if (!container) return;

    autoScrollRef.current.isActive = true;
    autoScrollRef.current.originX = originX;
    autoScrollRef.current.originY = originY;
    container.style.cursor = 'all-scroll';

    const tick = (timestamp: number) => {
      if (!autoScrollRef.current.isActive) return;
      const last = autoScrollRef.current.lastTimestamp || timestamp;
      const dt = Math.min(0.05, (timestamp - last) / 1000);
      autoScrollRef.current.lastTimestamp = timestamp;

      const smooth = 12;
      const ease = 1 - Math.exp(-smooth * dt);

      autoScrollRef.current.velocityX +=
        (autoScrollRef.current.targetVelocityX - autoScrollRef.current.velocityX) * ease;
      autoScrollRef.current.velocityY +=
        (autoScrollRef.current.targetVelocityY - autoScrollRef.current.velocityY) * ease;

      const maxScrollLeft = Math.max(0, container.scrollWidth - container.clientWidth);
      const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);

      const nextLeft = Math.min(
        maxScrollLeft,
        Math.max(0, container.scrollLeft + autoScrollRef.current.velocityX),
      );
      const nextTop = Math.min(
        maxScrollTop,
        Math.max(0, container.scrollTop + autoScrollRef.current.velocityY),
      );

      if (
        (nextLeft === 0 && autoScrollRef.current.targetVelocityX < 0) ||
        (nextLeft === maxScrollLeft && autoScrollRef.current.targetVelocityX > 0)
      ) {
        autoScrollRef.current.velocityX = 0;
        autoScrollRef.current.targetVelocityX = 0;
      }

      if (
        (nextTop === 0 && autoScrollRef.current.targetVelocityY < 0) ||
        (nextTop === maxScrollTop && autoScrollRef.current.targetVelocityY > 0)
      ) {
        autoScrollRef.current.velocityY = 0;
        autoScrollRef.current.targetVelocityY = 0;
      }

      container.scrollLeft = nextLeft;
      container.scrollTop = nextTop;
      autoScrollRafRef.current = requestAnimationFrame(tick);
    };

    autoScrollRafRef.current = requestAnimationFrame(tick);
  }, []);

  const handleTableMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 1) return;
    event.preventDefault();

    if (autoScrollRef.current.isActive) {
      stopAutoScroll();
      return;
    }

    startAutoScroll(event.clientX, event.clientY);
  }, [startAutoScroll, stopAutoScroll]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!autoScrollRef.current.isActive) return;
      const dx = event.clientX - autoScrollRef.current.originX;
      const dy = event.clientY - autoScrollRef.current.originY;
      const maxSpeed = 20;
      const nextX = Math.max(-maxSpeed, Math.min(maxSpeed, dx / 14));
      const nextY = Math.max(-maxSpeed, Math.min(maxSpeed, dy / 14));
      autoScrollRef.current.targetVelocityX = nextX;
      autoScrollRef.current.targetVelocityY = nextY;
    };

    const handleMouseDown = (event: MouseEvent) => {
      if (event.button === 1) return;
      if (!autoScrollRef.current.isActive) return;
      stopAutoScroll();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (!autoScrollRef.current.isActive) return;
      stopAutoScroll();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [stopAutoScroll]);

  // Calcular estadísticas basadas en los datos filtrados de la tabla
  // Usar el estado de la tabla para obtener las filas filtradas actualizadas
  const estadisticas = useMemo(() => {
    if (!table) {
      return { total: 0, confirmadas: 0, pendientes: 0, canceladas: 0 };
    }

    // Obtener las filas filtradas actuales de la tabla
    const filteredRows = table.getFilteredRowModel().rows;

    // Detectar si hay filtros aplicados desde el panel de filtros
    // (excluyendo el filtro de estado que puede venir de las tarjetas)
    const filtrosPanel = columnFilters.filter(f => f.id !== 'estado');
    const hayFiltrosPanel = filtrosPanel.length > 0 || globalFilter.trim() !== '' || executiveFilter.trim() !== '';

    // Calcular total: si hay filtros del panel, usar el filtrado; si no, usar todos los datos
    const total = hayFiltrosPanel ? filteredRows.length : data.length;

    let confirmadas = 0;
    let pendientes = 0;
    let canceladas = 0;

    filteredRows.forEach((row) => {
      const estado = row.original.estado;
      if (estado === 'CONFIRMADO') {
        confirmadas++;
      } else if (estado === 'PENDIENTE') {
        pendientes++;
      } else if (estado === 'CANCELADO') {
        canceladas++;
      }
    });

    return { total, confirmadas, pendientes, canceladas };
  }, [
    table.getFilteredRowModel().rows.length,
    columnFilters,
    globalFilter,
    executiveFilter,
    data.length
  ]);

  const renderToolbar = () => {
    // Preparar las clases base de las tarjetas KPI
    const cardBaseClasses = isDark
      ? 'border border-slate-800/50 bg-slate-950/40 backdrop-blur-sm'
      : 'border border-gray-200/60 bg-white/80 backdrop-blur-sm';

    // Detectar qué filtro de estado está activo
    const estadoFilter = columnFilters.find(f => f.id === 'estado');
    const estadoActivo = estadoFilter?.value as string | undefined;

    // Clases para el menú desplegable
    const dropdownClasses = `
      absolute top-full right-0 mt-1 z-50 min-w-[180px] rounded-lg shadow-lg border
      ${isDark 
        ? 'bg-slate-900 border-slate-700' 
        : 'bg-white border-gray-200'
      }
    `;

    const menuItemClasses = `
      w-full text-left px-3 py-2 text-xs transition-colors flex items-center gap-2
      ${isDark 
        ? 'hover:bg-slate-800 text-slate-200' 
        : 'hover:bg-gray-100 text-gray-700'
      }
    `;

    return (
      <div className="flex flex-col gap-2 sm:gap-3">
        {/* Primera fila de botones */}
        {viewMode === 'table' ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {canAdd && onAdd && (
                <button
                  onClick={onAdd}
                  aria-label="Nueva reserva"
                  className={`${primaryActionClasses} flex items-center justify-center gap-2 h-10 w-[140px] flex-shrink-0`}
                >
                  <Plus className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase whitespace-nowrap">Nueva Reserva</span>
                </button>
              )}
              <div className="relative w-[500px]">
                <Search className={`pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />
                <input
                  type="search"
                  value={globalFilter ?? ''}
                  onChange={handleGlobalSearchChange}
                  placeholder="Buscar..."
                  className={`w-full h-10 border pl-8 pr-3 text-xs transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-offset-1 ${isDark
                    ? 'bg-slate-950/70 border-slate-800/70 text-slate-200 focus-visible:ring-sky-500/40 focus-visible:ring-offset-slate-950'
                    : 'bg-white border-gray-300 text-gray-700 focus-visible:ring-blue-400/40 focus-visible:ring-offset-white'
                    }`}
                />
              </div>
              {/* Menú hamburguesa */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className={`${toolbarButtonClasses} flex items-center justify-center gap-2 h-10 w-[120px] flex-shrink-0`}
                  aria-label="Menú de acciones"
                  aria-expanded={isMenuOpen}
                >
                  <Menu className="h-4 w-4" />
                  <span className="text-xs whitespace-nowrap">Más</span>
                </button>
                {isMenuOpen && (
                  <div className={dropdownClasses}>
                    <div className="py-1">
                      {canPreviewSheets && (
                        <button
                          onClick={() => {
                            setShowSheetsPreview((prev) => !prev);
                            setIsMenuOpen(false);
                          }}
                          className={menuItemClasses}
                        >
                          <Eye className="h-4 w-4" />
                          {showSheetsPreview ? 'Ocultar' : 'Ver'} Sheets
                        </button>
                      )}
                      {onSelectAll && (
                        <button
                          onClick={handleSelectAllClick}
                          className={menuItemClasses}
                        >
                          <CheckSquare className="h-4 w-4" />
                          {allVisibleSelected 
                            ? (hasActiveFilters ? 'Deseleccionar visibles' : 'Deseleccionar todo')
                            : (hasActiveFilters ? 'Seleccionar visibles' : 'Seleccionar todo')
                          }
                          {hasActiveFilters && (
                            <span
                              className={`ml-auto inline-flex items-center border px-1.5 py-0.5 text-[10px] font-medium rounded ${isDark
                                ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                                : 'bg-blue-100 text-blue-700 border-blue-300'
                                }`}
                            >
                              {visibleRowsCount}/{totalRowsCount}
                            </span>
                          )}
                        </button>
                      )}
                      {onClearSelection && (
                        <button
                          onClick={() => {
                            handleClearSelectionClick();
                            setIsMenuOpen(false);
                          }}
                          className={`${menuItemClasses} ${!hasSelection ? 'opacity-50 cursor-not-allowed' : ''}`}
                          disabled={!hasSelection}
                        >
                          <RotateCcw className="h-4 w-4" />
                          Limpiar
                        </button>
                      )}
                      {canDelete && onBulkDelete && (
                        <button
                          onClick={() => {
                            handleBulkDeleteClick();
                            setIsMenuOpen(false);
                          }}
                          className={`${menuItemClasses} ${!hasSelection ? 'opacity-50 cursor-not-allowed' : ''} ${isDark ? 'text-red-400 hover:bg-red-500/10' : 'text-red-600 hover:bg-red-50'}`}
                          disabled={!hasSelection}
                        >
                          <Trash2 className="h-4 w-4" />
                          Eliminar
                          {hasSelection && (
                            <span
                              className={`ml-auto inline-flex items-center border px-1.5 py-0.5 text-[10px] font-medium rounded ${isDark
                                ? 'bg-red-500/20 text-red-300 border-red-500/30'
                                : 'bg-red-100 text-red-700 border-red-300'
                                }`}
                            >
                              {selectedCount}
                            </span>
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setShowReportGenerator(true);
                          setIsMenuOpen(false);
                        }}
                        className={menuItemClasses}
                      >
                        <Download className="h-4 w-4" />
                        Exportar
                      </button>
                      <button
                        onClick={() => {
                          handleResetTable();
                          setIsMenuOpen(false);
                        }}
                        className={menuItemClasses}
                      >
                        <RefreshCw className="h-4 w-4" />
                        Reset
                      </button>
                      <button
                        onClick={() => {
                          handleToggleViewMode();
                          setIsMenuOpen(false);
                        }}
                        className={menuItemClasses}
                      >
                        {viewMode === 'table' ? <Grid className="h-4 w-4" /> : <List className="h-4 w-4" />}
                        {viewMode === 'table' ? 'Tarjetas' : 'Tabla'}
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => {
                            if (hasSelection && selectedRecordsList.length > 0) {
                              const ids = selectedRecordsList
                                .map(r => r.id)
                                .filter((id): id is string => id !== undefined && id !== null)
                                .join(',');
                              if (ids) {
                                router.push(`/facturar-preview?ids=${ids}`);
                              }
                              setIsMenuOpen(false);
                            }
                          }}
                          disabled={!hasSelection}
                          className={`${menuItemClasses} ${!hasSelection ? 'opacity-50 cursor-not-allowed' : ''}`}
                          title={!hasSelection ? 'Selecciona al menos un registro para facturar' : ''}
                        >
                          <Receipt className="h-4 w-4" />
                          Facturar
                          {hasSelection && (
                            <span
                              className={`ml-auto inline-flex items-center border px-1.5 py-0.5 text-[10px] font-medium rounded ${isDark
                                ? 'bg-green-500/20 text-green-300 border-green-500/30'
                                : 'bg-green-100 text-green-700 border-green-300'
                                }`}
                            >
                              {selectedCount}
                            </span>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* Tarjeta Total/Reservas */}
              <button
                onClick={() => {
                  setColumnFilters(prev => prev.filter(f => f.id !== 'estado'));
                }}
                className={`${cardBaseClasses} px-3 py-2 transition-all hover:border-opacity-80 cursor-pointer h-10 ${!estadoActivo
                  ? isDark
                    ? 'bg-slate-800/60 border-slate-600/50'
                    : 'bg-gray-100 border-gray-300'
                  : ''
                  }`}
                aria-label="Mostrar todos los registros"
              >
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-medium uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    Reservas
                  </span>
                  <span className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-gray-900'}`}>
                    {estadisticas.total}
                  </span>
                </div>
              </button>

              {/* Tarjeta Confirmadas */}
              <button
                onClick={() => {
                  setColumnFilters(prev => {
                    const filtered = prev.filter(f => f.id !== 'estado');
                    return [...filtered, { id: 'estado', value: 'CONFIRMADO' }];
                  });
                }}
                className={`${cardBaseClasses} px-2 py-2 transition-all hover:border-emerald-500/30 cursor-pointer h-10 ${estadoActivo === 'CONFIRMADO'
                  ? isDark
                    ? 'bg-emerald-900/40 border-emerald-600/50'
                    : 'bg-emerald-50 border-emerald-300'
                  : ''
                  }`}
                aria-label="Filtrar por confirmados"
              >
                <div className="flex items-center gap-1.5">
                  <Check className={`h-4 w-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                  <span className={`text-sm font-semibold ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
                    {estadisticas.confirmadas}
                  </span>
                </div>
              </button>

              {/* Tarjeta Pendientes */}
              <button
                onClick={() => {
                  setColumnFilters(prev => {
                    const filtered = prev.filter(f => f.id !== 'estado');
                    return [...filtered, { id: 'estado', value: 'PENDIENTE' }];
                  });
                }}
                className={`${cardBaseClasses} px-2 py-2 transition-all hover:border-amber-500/30 cursor-pointer h-10 ${estadoActivo === 'PENDIENTE'
                  ? isDark
                    ? 'bg-amber-900/40 border-amber-600/50'
                    : 'bg-amber-50 border-amber-300'
                  : ''
                  }`}
                aria-label="Filtrar por pendientes"
              >
                <div className="flex items-center gap-1.5">
                  <Clock className={`h-4 w-4 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                  <span className={`text-sm font-semibold ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                    {estadisticas.pendientes}
                  </span>
                </div>
              </button>

              {/* Tarjeta Canceladas */}
              <button
                onClick={() => {
                  setColumnFilters(prev => {
                    const filtered = prev.filter(f => f.id !== 'estado');
                    return [...filtered, { id: 'estado', value: 'CANCELADO' }];
                  });
                }}
                className={`${cardBaseClasses} px-2 py-2 transition-all hover:border-rose-500/30 cursor-pointer h-10 ${estadoActivo === 'CANCELADO'
                  ? isDark
                    ? 'bg-rose-900/40 border-rose-600/50'
                    : 'bg-rose-50 border-rose-300'
                  : ''
                  }`}
                aria-label="Filtrar por cancelados"
              >
                <div className="flex items-center gap-1.5">
                  <X className={`h-4 w-4 ${isDark ? 'text-rose-400' : 'text-rose-600'}`} />
                  <span className={`text-sm font-semibold ${isDark ? 'text-rose-300' : 'text-rose-700'}`}>
                    {estadisticas.canceladas}
                  </span>
                </div>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {canAdd && onAdd && (
              <button
                onClick={onAdd}
                aria-label="Nuevo registro"
                className={`${primaryActionClasses} flex items-center justify-center gap-2 h-10 w-[120px] flex-shrink-0`}
              >
                <Plus className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase whitespace-nowrap">Nuevo</span>
              </button>
            )}
            <div className="relative w-[500px]">
              <Search className={`pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />
              <input
                type="search"
                value={globalFilter ?? ''}
                onChange={handleGlobalSearchChange}
                placeholder="Buscar..."
                className={`w-full h-10 border pl-8 pr-3 text-xs transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-offset-1 ${isDark
                  ? 'bg-slate-950/70 border-slate-800/70 text-slate-200 focus-visible:ring-sky-500/40 focus-visible:ring-offset-slate-950'
                  : 'bg-white border-gray-300 text-gray-700 focus-visible:ring-blue-400/40 focus-visible:ring-offset-white'
                  }`}
              />
            </div>
            {/* Menú hamburguesa */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`${toolbarButtonClasses} flex items-center justify-center gap-2 h-10 w-[120px] flex-shrink-0`}
                aria-label="Menú de acciones"
                aria-expanded={isMenuOpen}
              >
                <Menu className="h-4 w-4" />
                <span className="text-xs whitespace-nowrap">Más</span>
              </button>
              {isMenuOpen && (
                <div className={dropdownClasses}>
                  <div className="py-1">
                    {canPreviewSheets && (
                      <button
                        onClick={() => {
                          setShowSheetsPreview((prev) => !prev);
                          setIsMenuOpen(false);
                        }}
                        className={menuItemClasses}
                      >
                        <Eye className="h-4 w-4" />
                        {showSheetsPreview ? 'Ocultar' : 'Ver'} Sheets
                      </button>
                    )}
                    {onClearSelection && (
                      <button
                        onClick={() => {
                          handleClearSelectionClick();
                          setIsMenuOpen(false);
                        }}
                        className={`${menuItemClasses} ${!hasSelection ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={!hasSelection}
                      >
                        <RotateCcw className="h-4 w-4" />
                        Limpiar
                      </button>
                    )}
                    {canDelete && onBulkDelete && (
                      <button
                        onClick={() => {
                          handleBulkDeleteClick();
                          setIsMenuOpen(false);
                        }}
                        className={`${menuItemClasses} ${!hasSelection ? 'opacity-50 cursor-not-allowed' : ''} ${isDark ? 'text-red-400 hover:bg-red-500/10' : 'text-red-600 hover:bg-red-50'}`}
                        disabled={!hasSelection}
                      >
                        <Trash2 className="h-4 w-4" />
                        Eliminar
                        {hasSelection && (
                          <span
                            className={`ml-auto inline-flex items-center border px-1.5 py-0.5 text-[10px] font-medium rounded ${isDark
                              ? 'bg-red-500/20 text-red-300 border-red-500/30'
                              : 'bg-red-100 text-red-700 border-red-300'
                              }`}
                          >
                            {selectedCount}
                          </span>
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setShowReportGenerator(true);
                        setIsMenuOpen(false);
                      }}
                      className={menuItemClasses}
                    >
                      <Download className="h-4 w-4" />
                      Exportar
                    </button>
                    <button
                      onClick={() => {
                        handleResetTable();
                        setIsMenuOpen(false);
                      }}
                      className={menuItemClasses}
                    >
                      <RefreshCw className="h-4 w-4" />
                      Reset
                    </button>
                    <button
                      onClick={() => {
                        handleToggleViewMode();
                        setIsMenuOpen(false);
                      }}
                      className={menuItemClasses}
                    >
                      {viewMode === 'cards' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
                      {viewMode === 'cards' ? 'Tabla' : 'Tarjetas'}
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => {
                          if (hasSelection && selectedRecordsList.length > 0) {
                            const ids = selectedRecordsList
                              .map(r => r.id)
                              .filter((id): id is string => id !== undefined && id !== null)
                              .join(',');
                            if (ids) {
                              router.push(`/facturar-preview?ids=${ids}`);
                            }
                            setIsMenuOpen(false);
                          }
                        }}
                        disabled={!hasSelection}
                        className={`${menuItemClasses} ${!hasSelection ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title={!hasSelection ? 'Selecciona al menos un registro para facturar' : ''}
                      >
                        <Receipt className="h-4 w-4" />
                        Facturar
                        {hasSelection && (
                          <span
                            className={`ml-auto inline-flex items-center border px-1.5 py-0.5 text-[10px] font-medium rounded ${isDark
                              ? 'bg-green-500/20 text-green-300 border-green-500/30'
                              : 'bg-green-100 text-green-700 border-green-300'
                              }`}
                          >
                            {selectedCount}
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Segunda fila de botones - Vacía ahora que el buscador está en la primera fila */}
        {viewMode === 'table' ? (
          <div className="flex flex-wrap items-center gap-2">
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
          </div>
        )}
      </div>
    );
  };


  return (
    <div className="w-full h-full flex flex-col min-w-0" style={{ width: '100%', maxWidth: '100%', minWidth: 0, height: '100%', padding: 0, margin: 0 }}>
      {/* Header con controles */}
      <div className={`${panelClasses} py-2 sm:py-2.5 md:py-3 w-full flex-shrink-0 min-w-0`} style={{ paddingLeft: '8px', paddingRight: '8px' }}>
        {renderToolbar()}
      </div>

      {canPreviewSheets && showSheetsPreview && (
        <div className={`${panelClasses} flex-shrink-0 w-full`}>
          <div
            className={`flex flex-wrap items-center justify-between gap-2 sm:gap-3 border-b px-3 sm:px-4 py-2 sm:py-3 ${isDark ? 'border-slate-800/60 bg-slate-950/80' : 'border-gray-200 bg-slate-50'
              }`}
          >
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Previsualización</p>
              <h3
                className={`text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}
              >
                Google Sheets
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (sheetsEditUrl) {
                    window.open(sheetsEditUrl, '_blank', 'noopener,noreferrer');
                  }
                }}
                className={`${toolbarButtonClasses} text-xs`}
                aria-label="Abrir hoja de Google Sheets en una nueva pestaña"
              >
                <ExternalLink className="h-4 w-4" />
                Abrir en pestaña
              </button>
              <button
                onClick={() => setShowSheetsPreview(false)}
                className={`${toolbarButtonClasses} text-xs`}
                aria-label="Cerrar previsualización de Google Sheets"
              >
                <X className="h-4 w-4" />
                Cerrar vista
              </button>
            </div>
          </div>
          <div
            className="relative w-full overflow-hidden"
            style={{ height: '70vh', maxHeight: '600px' }}
            onMouseEnter={handleSheetsMouseEnter}
            onMouseLeave={handleSheetsMouseLeave}
          >
            <div className="h-full w-full origin-top-left scale-[0.85]">
              <iframe
                key={iframeKey}
                src={sheetsPreviewUrl}
                title="Previsualización Google Sheets"
                className="h-[118%] w-[118%] border-0"
                loading="lazy"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}

      {/* Tabla con scroll interno */}
      {viewMode === 'table' && (
        <div className={`${panelClasses} backdrop-blur flex-1 flex flex-col min-h-0 min-w-0`}
          style={{ width: '100%', minWidth: 0, minHeight: 0, overflow: 'hidden', padding: 0, margin: 0 }}
        >
          <div
            ref={tableContainerRef}
            className={`flex-1 min-h-0 min-w-0 ${isDark ? 'bg-slate-950/40' : 'bg-white'}`}
            style={{
              width: '100%',
              minWidth: 0,
              minHeight: 0,
              overflow: 'auto',
              overflowAnchor: 'none',
              WebkitOverflowScrolling: 'touch',
              padding: 0,
              margin: 0,
              overscrollBehavior: 'contain',
              scrollbarGutter: 'stable both-edges',
            }}
            onMouseDown={handleTableMouseDown}
          >
            <table
              style={{
                tableLayout: 'fixed',
                width: calculatedTableWidth > 0 ? `${calculatedTableWidth}px` : '100%',
                minWidth: calculatedTableWidth > 0 ? `${calculatedTableWidth}px` : '100%',
                borderCollapse: 'collapse',
                fontFamily: 'Arial',
                fontSize: '14px',
                fontWeight: 'normal',
                fontStyle: 'normal',
              }}
            >
              <thead className="sticky top-0 z-[250] shadow-[0_10px_24px_rgba(8,15,30,0.45)]">
                {table.getHeaderGroups().map((headerGroup) => {
                  return (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => {
                        if (!table.getIsAllColumnsVisible() && !header.column.getIsVisible()) {
                          return null;
                        }

                        const canSort = header.column.getCanSort();
                        const sortDirection = header.column.getIsSorted();
                        const isRefClienteColumn = header.id === 'refCliente';

                        let stickyClasses = '';
                        let stickyStyles: React.CSSProperties = {};

                        // Usar anchos memoizados para evitar recálculos
                        const columnSize = columnWidths.get(header.id) || 150;
                        const headerBorderColor = isDark ? 'rgba(56, 74, 110, 0.9)' : 'rgba(209, 213, 219, 0.9)';

                        const baseHeaderStyle = {
                          background: isDark
                            ? 'linear-gradient(180deg, #10203f 0%, #0c1a36 100%)'
                            : 'linear-gradient(180deg, #f9fafb 0%, #e5e7eb 100%)',
                          color: isDark ? '#f8fafc' : '#0f172a',
                          backdropFilter: 'blur(12px)',
                        };

                        if (isRefClienteColumn) {
                          stickyClasses = 'sticky left-0 z-[260]';
                          stickyStyles = {
                            ...baseHeaderStyle,
                            left: 0,
                            top: 0,
                            width: `${columnSize}px`,
                            minWidth: `${columnSize}px`,
                            maxWidth: `${columnSize}px`,
                            borderBottom: `1px solid ${headerBorderColor}`,
                            borderRight: `1px solid ${headerBorderColor}`,
                          };
                        } else {
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
                              className={`relative flex min-h-[36px] w-full items-center justify-center gap-1.5 px-3 py-1.5 select-none`}
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
                                className={`flex items-center justify-center gap-1.5 text-center ${canSort ? 'cursor-pointer text-slate-300 hover:text-white' : 'text-slate-200'}`}
                              >
                                <span className={`block whitespace-nowrap text-xs uppercase tracking-[0.08em] ${isDark ? 'text-slate-100' : 'text-slate-700'
                                  }`}>
                                  {flexRender(header.column.columnDef.header, header.getContext())}
                                </span>
                                {sortDirection ? (
                                  sortDirection === 'asc' ? (
                                    <ArrowUp size={14} />
                                  ) : (
                                    <ArrowDown size={14} />
                                  )
                                ) : (
                                  canSort && <ArrowUpDown size={14} />
                                )}
                              </div>
                              {header.column.getCanResize() && (
                                <div
                                  onMouseDown={header.getResizeHandler()}
                                  onTouchStart={header.getResizeHandler()}
                                  onDoubleClick={() => {
                                    // Auto-ajustar ancho de columna al contenido más largo (como Excel)
                                    const columnId = header.column.id;

                                    // Crear un elemento temporal para medir el ancho del texto
                                    const tempElement = document.createElement('span');
                                    tempElement.style.visibility = 'hidden';
                                    tempElement.style.position = 'absolute';
                                    tempElement.style.whiteSpace = 'nowrap';
                                    tempElement.style.fontSize = '13px';
                                    tempElement.style.fontFamily = 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
                                    tempElement.style.fontWeight = '500';
                                    document.body.appendChild(tempElement);

                                    let maxWidth = 0;

                                    // Medir el ancho del header
                                    const headerText = typeof header.column.columnDef.header === 'string'
                                      ? header.column.columnDef.header
                                      : columnId;
                                    tempElement.textContent = headerText;
                                    tempElement.style.fontWeight = '600';
                                    tempElement.style.fontSize = '12px';
                                    tempElement.style.textTransform = 'uppercase';
                                    tempElement.style.letterSpacing = '0.08em';
                                    maxWidth = Math.max(maxWidth, tempElement.offsetWidth + 40); // +40 para padding y iconos

                                    // Medir el ancho de todas las celdas visibles
                                    tempElement.style.fontWeight = '500';
                                    tempElement.style.fontSize = '13px';
                                    tempElement.style.textTransform = 'none';
                                    tempElement.style.letterSpacing = 'normal';

                                    const rowsToMeasure = rows.slice(0, Math.min(100, rows.length)); // Medir máximo 100 filas para performance
                                    rowsToMeasure.forEach(row => {
                                      const cell = row.getVisibleCells().find(c => c.column.id === columnId);
                                      if (cell) {
                                        const cellValue = cell.getValue();
                                        let textContent = '';

                                        if (cellValue === null || cellValue === undefined) {
                                          textContent = '-';
                                        } else if (Array.isArray(cellValue)) {
                                          textContent = cellValue.join(', ');
                                        } else if (typeof cellValue === 'object' && cellValue instanceof Date) {
                                          textContent = cellValue.toLocaleDateString();
                                        } else {
                                          textContent = String(cellValue);
                                        }

                                        tempElement.textContent = textContent;
                                        maxWidth = Math.max(maxWidth, tempElement.offsetWidth + 24); // +24 para padding
                                      }
                                    });

                                    document.body.removeChild(tempElement);

                                    // Aplicar un ancho mínimo de 120px y máximo de 600px
                                    const newWidth = Math.max(120, Math.min(600, maxWidth));

                                    // Actualizar el tamaño de la columna
                                    setColumnSizing(prev => ({
                                      ...prev,
                                      [columnId]: newWidth
                                    }));
                                  }}
                                  className="absolute top-0 right-0 h-full w-4 cursor-col-resize select-none z-[270] group"
                                  style={{ marginRight: '-2px' }}
                                  title="Doble clic para auto-ajustar al contenido"
                                >
                                  <div className={`h-full w-[2px] transition-colors ${isDark
                                    ? 'bg-slate-600/40 group-hover:bg-sky-400/80'
                                    : 'bg-gray-300/60 group-hover:bg-blue-500/80'
                                    }`} />
                                </div>
                              )}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  );
                })}
              </thead>
              <tbody
                ref={tableBodyRef}
                className={`transition-colors ${isDark ? 'bg-transparent divide-slate-800/60' : 'bg-white divide-gray-200'
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
                        // Mostrar menú si hay alguna opción disponible
                        const hasAnyOption =
                          ((selectedRows.size > 0 && onBulkEditNaveViaje) || onEditNaveViaje) ||
                          onSendToTransportes ||
                          onEdit ||
                          onDelete ||
                          onShowHistorial;
                        if (hasAnyOption) {
                          // Calcular si hay espacio suficiente debajo del punto de clic
                          // Estimamos la altura del menú contextual (aproximadamente 300px)
                          const menuEstimatedHeight = 300;
                          const spaceBelow = window.innerHeight - e.clientY;
                          const openUpward = spaceBelow < menuEstimatedHeight;
                          
                          // Si se abre hacia arriba, ajustar la posición Y
                          const adjustedY = openUpward 
                            ? e.clientY - menuEstimatedHeight 
                            : e.clientY;
                          
                          setContextMenu({ 
                            x: e.clientX, 
                            y: Math.max(10, adjustedY), // Asegurar que no se salga por arriba
                            record: row.original,
                            openUpward 
                          });
                        }
                      }}
                    >
                      {row.getVisibleCells().map((cell) => {
                        const isRefClienteColumnCell = cell.column.id === 'refCliente';
                        // Usar anchos memoizados para evitar recálculos
                        const columnWidth = columnWidths.get(cell.column.id) || 150;

                        const cellStyles: React.CSSProperties = {
                          width: `${columnWidth}px`,
                          minWidth: `${columnWidth}px`,
                          maxWidth: `${columnWidth}px`,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        };

                        if (isRefClienteColumnCell) {
                          cellStyles.left = 0;
                          cellStyles.boxShadow = `${refAsliShadow}, inset 0 -1px 0 0 ${borderColor}`;
                          cellStyles.borderRight = `1px solid ${borderColor}`;
                          cellStyles.background = rowClasses.refAsliBg;
                        }

                        return (
                          <td
                            key={cell.id}
                            className={`p-0 whitespace-nowrap border-r ${isDark ? 'border-slate-800/40' : 'border-gray-200'
                              } overflow-hidden text-ellipsis ${rowClasses.text} ${isRefClienteColumnCell ? 'sticky z-[240]' : ''}`}
                            style={cellStyles}
                          >
                            <div
                              className={`flex h-full w-full items-center justify-center px-3 py-1.5 text-sm text-center`}
                              style={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                {rowVirtualizer.getVirtualItems().length > 0 && (() => {
                  const lastItem = rowVirtualizer.getVirtualItems()[rowVirtualizer.getVirtualItems().length - 1];
                  const paddingBottom = Math.max(0, rowVirtualizer.getTotalSize() - (lastItem?.end ?? 0));

                  return paddingBottom > 0 ? (
                    <tr>
                      <td
                        colSpan={table.getHeaderGroups()[0]?.headers.length ?? columns.length}
                        style={{
                          height: `${paddingBottom}px`,
                          padding: 0,
                          border: 'none',
                        }}
                      />
                    </tr>
                  ) : null;
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewMode === 'cards' && (
        <div className={`${panelClasses} backdrop-blur w-full flex-1 min-h-0`}>
          <div
            ref={cardsScrollRef}
            className="h-full w-full overflow-y-auto overflow-x-hidden p-2 sm:p-3 md:p-4 overscroll-contain"
            onWheel={handleCardsWheel}
            onScroll={handleCardsScroll}
            style={{ overscrollBehavior: 'contain', overflowAnchor: 'none' }}
          >
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {table.getFilteredRowModel().rows.map((row) => {
                const record = row.original;
                const index = row.index;
                const key = record.id ?? `registro-${record.refAsli ?? index}`;
                const estado = record.estado ?? 'SIN ESTADO';
                const estadoColor = estado === 'CONFIRMADO'
                  ? isDark
                    ? 'bg-emerald-500/15 text-emerald-200 border border-emerald-500/30'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                  : estado === 'PENDIENTE'
                    ? isDark
                      ? 'bg-amber-500/15 text-amber-200 border border-amber-500/30'
                      : 'bg-amber-50 text-amber-700 border border-amber-300'
                    : estado === 'CANCELADO'
                      ? isDark
                        ? 'bg-rose-500/15 text-rose-200 border border-rose-500/30'
                        : 'bg-rose-50 text-rose-700 border border-rose-300'
                      : isDark
                        ? 'bg-slate-500/15 text-slate-200 border border-slate-500/30'
                        : 'bg-gray-100 text-gray-700 border border-gray-300';

                const handleCardContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
                  event.preventDefault();
                  const hasEditNaveViaje = currentUser?.rol === 'admin' &&
                    ((selectedRows.size > 0 && onBulkEditNaveViaje) || onEditNaveViaje);
                  if (hasEditNaveViaje) {
                    // Calcular si hay espacio suficiente debajo del punto de clic
                    const menuEstimatedHeight = 300;
                    const spaceBelow = window.innerHeight - event.clientY;
                    const openUpward = spaceBelow < menuEstimatedHeight;
                    
                    // Si se abre hacia arriba, ajustar la posición Y
                    const adjustedY = openUpward 
                      ? event.clientY - menuEstimatedHeight 
                      : event.clientY;
                    
                    setContextMenu({ 
                      x: event.clientX, 
                      y: Math.max(10, adjustedY), // Asegurar que no se salga por arriba
                      record,
                      openUpward 
                    });
                  }
                };

                const formatDate = (date: Date | null): string => {
                  if (!date) return '-';
                  // Formatear fecha en formato DD-MM-YYYY (estándar chileno)
                  const fecha = new Date(date);
                  const dia = String(fecha.getDate()).padStart(2, '0');
                  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
                  const año = fecha.getFullYear();
                  return `${dia}-${mes}-${año}`;
                };

                const formatNave = (): string => {
                  const nave = record.naveInicial || '';
                  const viaje = record.viaje;
                  if (viaje && !nave.includes('[')) {
                    return `${nave} [${viaje}]`;
                  }
                  return nave || '-';
                };

                const calculateTransito = (): string => {
                  if (!record.etd || !record.eta) return '-';
                  const etdDate = new Date(record.etd);
                  const etaDate = new Date(record.eta);
                  const diffTime = etaDate.getTime() - etdDate.getTime();
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  return diffDays >= 0 ? `${diffDays} días` : '-';
                };

                const escapeHtml = (text: string | null | undefined): string => {
                  if (!text) return '-';
                  const str = String(text);
                  return str
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#039;');
                };

                const handleCopyCard = async (e: React.MouseEvent) => {
                  e.stopPropagation();

                  const estadoBadgeStyle = estado === 'CONFIRMADO'
                    ? 'background-color: rgba(16, 185, 129, 0.15); color: #a7f3d0; border: 1px solid rgba(16, 185, 129, 0.3);'
                    : estado === 'PENDIENTE'
                      ? 'background-color: rgba(245, 158, 11, 0.15); color: #fde68a; border: 1px solid rgba(245, 158, 11, 0.3);'
                      : estado === 'CANCELADO'
                        ? 'background-color: rgba(244, 63, 94, 0.15); color: #fda4af; border: 1px solid rgba(244, 63, 94, 0.3);'
                        : 'background-color: rgba(100, 116, 139, 0.15); color: #cbd5e1; border: 1px solid rgba(100, 116, 139, 0.3);';

                  const contenedorText = Array.isArray(record.contenedor)
                    ? record.contenedor.join(', ')
                    : (record.contenedor || '-');

                  const formatValueForCopy = (value: any): string => {
                    if (value === null || value === undefined) return '-';
                    if (value instanceof Date) return formatDate(value);
                    return String(value);
                  };

                  const cardHtml = `<div style="font-family: Arial, sans-serif; background-color: #0f172a; border: 1px solid rgba(51, 65, 85, 0.6); border-radius: 16px; padding: 20px; max-width: 400px; color: #cbd5e1;">
  <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px;">
    <div>
      <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.14em; color: #64748b; margin: 0 0 4px 0;">Ref ASLI</p>
      <h3 style="font-size: 18px; font-weight: 600; color: #f1f5f9; margin: 0;">${escapeHtml(record.refAsli) || 'Sin referencia'}</h3>
    </div>
    <span style="display: inline-flex; align-items: center; border-radius: 9999px; padding: 4px 8px; font-size: 10px; font-weight: 600; ${estadoBadgeStyle}">${escapeHtml(estado)}</span>
  </div>
  <div style="margin-top: 12px; display: flex; flex-direction: column; gap: 10px; font-size: 12px; color: #cbd5e1;">
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="color: #ffffff; font-weight: 700; flex-shrink: 0;">REF CLIENTE</span>
      <span style="flex: 1; border-bottom: 1px dotted #475569; min-width: 20px;"></span>
      <span style="font-weight: 600; text-align: right; color: #e2e8f0;">${escapeHtml(formatValueForCopy(record.refCliente))}</span>
    </div>
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="color: #ffffff; font-weight: 700; flex-shrink: 0;">EJECUTIVO</span>
      <span style="flex: 1; border-bottom: 1px dotted #475569; min-width: 20px;"></span>
      <span style="font-weight: 600; text-align: right; color: #e2e8f0;">${escapeHtml(formatValueForCopy(record.ejecutivo))}</span>
    </div>
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="color: #ffffff; font-weight: 700; flex-shrink: 0;">SHIPPER</span>
      <span style="flex: 1; border-bottom: 1px dotted #475569; min-width: 20px;"></span>
      <span style="font-weight: 600; text-align: right; color: #e2e8f0;">${escapeHtml(formatValueForCopy(record.shipper))}</span>
    </div>
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="color: #ffffff; font-weight: 700; flex-shrink: 0;">NAVIERA</span>
      <span style="flex: 1; border-bottom: 1px dotted #475569; min-width: 20px;"></span>
      <span style="font-weight: 600; text-align: right; color: #e2e8f0;">${escapeHtml(formatValueForCopy(record.naviera))}</span>
    </div>
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="color: #ffffff; font-weight: 700; flex-shrink: 0;">NAVE</span>
      <span style="flex: 1; border-bottom: 1px dotted #475569; min-width: 20px;"></span>
      <span style="font-weight: 600; text-align: right; color: #e2e8f0;">${escapeHtml(formatNave())}</span>
    </div>
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="color: #ffffff; font-weight: 700; flex-shrink: 0;">BOOKING</span>
      <span style="flex: 1; border-bottom: 1px dotted #475569; min-width: 20px;"></span>
      <span style="font-weight: 600; text-align: right; color: #e2e8f0;">${escapeHtml(formatValueForCopy(record.booking))}</span>
    </div>
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="color: #ffffff; font-weight: 700; flex-shrink: 0;">ESPECIE</span>
      <span style="flex: 1; border-bottom: 1px dotted #475569; min-width: 20px;"></span>
      <span style="font-weight: 600; text-align: right; color: #e2e8f0;">${escapeHtml(formatValueForCopy(record.especie))}</span>
    </div>
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="color: #ffffff; font-weight: 700; flex-shrink: 0;">CONTENEDOR</span>
      <span style="flex: 1; border-bottom: 1px dotted #475569; min-width: 20px;"></span>
      <span style="font-weight: 600; text-align: right; color: #e2e8f0;">${escapeHtml(contenedorText)}</span>
    </div>
    ${record.temperatura !== null && record.temperatura !== undefined ? `<div style="display: flex; align-items: center; gap: 8px;">
      <span style="color: #ffffff; font-weight: 700; flex-shrink: 0;">TEMP</span>
      <span style="flex: 1; border-bottom: 1px dotted #475569; min-width: 20px;"></span>
      <span style="font-weight: 600; text-align: right; color: #e2e8f0;">${record.temperatura}°C</span>
    </div>` : ''}
    ${record.cbm !== null && record.cbm !== undefined ? `<div style="display: flex; align-items: center; gap: 8px;">
      <span style="color: #ffffff; font-weight: 700; flex-shrink: 0;">CBM</span>
      <span style="flex: 1; border-bottom: 1px dotted #475569; min-width: 20px;"></span>
      <span style="font-weight: 600; text-align: right; color: #e2e8f0;">${record.cbm}</span>
    </div>` : ''}
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="color: #ffffff; font-weight: 700; flex-shrink: 0;">POL</span>
      <span style="flex: 1; border-bottom: 1px dotted #475569; min-width: 20px;"></span>
      <span style="font-weight: 600; text-align: right; color: #e2e8f0;">${escapeHtml(formatValueForCopy(record.pol))}</span>
    </div>
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="color: #ffffff; font-weight: 700; flex-shrink: 0;">ETD</span>
      <span style="flex: 1; border-bottom: 1px dotted #475569; min-width: 20px;"></span>
      <span style="font-weight: 600; text-align: right; color: #e2e8f0;">${escapeHtml(formatDate(record.etd))}</span>
    </div>
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="color: #ffffff; font-weight: 700; flex-shrink: 0;">POD</span>
      <span style="flex: 1; border-bottom: 1px dotted #475569; min-width: 20px;"></span>
      <span style="font-weight: 600; text-align: right; color: #e2e8f0;">${escapeHtml(formatValueForCopy(record.pod))}</span>
    </div>
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="color: #ffffff; font-weight: 700; flex-shrink: 0;">ETA</span>
      <span style="flex: 1; border-bottom: 1px dotted #475569; min-width: 20px;"></span>
      <span style="font-weight: 600; text-align: right; color: #e2e8f0;">${escapeHtml(formatDate(record.eta))}</span>
    </div>
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="color: #ffffff; font-weight: 700; flex-shrink: 0;">TRÁNSITO</span>
      <span style="flex: 1; border-bottom: 1px dotted #475569; min-width: 20px;"></span>
      <span style="font-weight: 600; text-align: right; color: #e2e8f0;">${escapeHtml(calculateTransito())}</span>
    </div>
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="color: #ffffff; font-weight: 700; flex-shrink: 0;">DEPÓSITO</span>
      <span style="flex: 1; border-bottom: 1px dotted #475569; min-width: 20px;"></span>
      <span style="font-weight: 600; text-align: right; color: #e2e8f0;">${escapeHtml(formatValueForCopy(record.deposito))}</span>
    </div>
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="color: #ffffff; font-weight: 700; flex-shrink: 0;">TIPO INGRESO</span>
      <span style="flex: 1; border-bottom: 1px dotted #475569; min-width: 20px;"></span>
      <span style="font-weight: 600; text-align: right; color: #e2e8f0;">${escapeHtml(formatValueForCopy(record.tipoIngreso))}</span>
    </div>
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="color: #ffffff; font-weight: 700; flex-shrink: 0;">FLETE</span>
      <span style="flex: 1; border-bottom: 1px dotted #475569; min-width: 20px;"></span>
      <span style="font-weight: 600; text-align: right; color: #e2e8f0;">${escapeHtml(formatValueForCopy(record.flete))}</span>
    </div>
    ${record.numeroBl ? `<div style="display: flex; align-items: center; gap: 8px;">
      <span style="color: #ffffff; font-weight: 700; flex-shrink: 0;">N° BL</span>
      <span style="flex: 1; border-bottom: 1px dotted #475569; min-width: 20px;"></span>
      <span style="font-weight: 600; text-align: right; color: #e2e8f0;">${escapeHtml(record.numeroBl)}</span>
    </div>` : ''}
    ${record.estadoBl ? `<div style="display: flex; align-items: center; gap: 8px;">
      <span style="color: #ffffff; font-weight: 700; flex-shrink: 0;">ESTADO BL</span>
      <span style="flex: 1; border-bottom: 1px dotted #475569; min-width: 20px;"></span>
      <span style="font-weight: 600; text-align: right; color: #e2e8f0;">${escapeHtml(record.estadoBl)}</span>
    </div>` : ''}
    ${(record as any).consignatario ? `<div style="display: flex; align-items: center; gap: 8px;">
      <span style="color: #ffffff; font-weight: 700; flex-shrink: 0;">CONSIGNATARIO</span>
      <span style="flex: 1; border-bottom: 1px dotted #475569; min-width: 20px;"></span>
      <span style="font-weight: 600; text-align: right; color: #e2e8f0;">${escapeHtml((record as any).consignatario)}</span>
    </div>` : ''}
  </div>
</div>`;

                  const cardText = `REF ASLI: ${record.refAsli || '-'}
REF CLIENTE: ${record.refCliente || '-'}
EJECUTIVO: ${record.ejecutivo || '-'}
SHIPPER: ${record.shipper || '-'}
NAVIERA: ${record.naviera || '-'}
NAVE: ${formatNave()}
BOOKING: ${record.booking || '-'}
ESPECIE: ${record.especie || '-'}
CONTENEDOR: ${contenedorText}
${record.temperatura !== null && record.temperatura !== undefined ? `TEMP: ${record.temperatura}°C\n` : ''}${record.cbm !== null && record.cbm !== undefined ? `CBM: ${record.cbm}\n` : ''}POL: ${record.pol || '-'}
ETD: ${formatDate(record.etd)}
POD: ${record.pod || '-'}
ETA: ${formatDate(record.eta)}
TRÁNSITO: ${calculateTransito()}
DEPÓSITO: ${record.deposito || '-'}
TIPO INGRESO: ${record.tipoIngreso || '-'}
FLETE: ${record.flete || '-'}
${record.numeroBl ? `N° BL: ${record.numeroBl}\n` : ''}${record.estadoBl ? `ESTADO BL: ${record.estadoBl}\n` : ''}${(record as any).consignatario ? `CONSIGNATARIO: ${(record as any).consignatario}\n` : ''}${record.comentario ? `COMENTARIO: ${record.comentario}\n` : ''}${record.observacion ? `OBSERVACIÓN: ${record.observacion}` : ''}`;

                  try {
                    // Copiar como HTML para preservar el formato visual
                    const clipboardItem = new ClipboardItem({
                      'text/html': new Blob([cardHtml], { type: 'text/html' }),
                      'text/plain': new Blob([cardText], { type: 'text/plain' })
                    });
                    await navigator.clipboard.write([clipboardItem]);
                  } catch (err) {
                    // Fallback a texto plano si falla la copia HTML
                    try {
                      await navigator.clipboard.writeText(cardText);
                    } catch (fallbackErr) {
                      console.error('Error al copiar:', fallbackErr);
                    }
                  }
                };

                return (
                  <div
                    key={key}
                    className={`group relative space-y-2 sm:space-y-3 rounded-xl sm:rounded-2xl border p-3 sm:p-4 md:p-5 shadow-lg transition-transform hover:-translate-y-[3px] w-full max-w-full overflow-hidden ${isDark
                      ? 'border-slate-800/60 bg-slate-950/60 shadow-slate-950/20 hover:border-sky-500/60'
                      : 'border-gray-200 bg-white shadow-gray-200/20 hover:border-blue-500/60'
                      }`}
                    onContextMenu={handleCardContextMenu}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className={`text-[11px] uppercase tracking-[0.14em] ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>Ref ASLI</p>
                        <h3 className={`text-base font-semibold sm:text-lg ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>{record.refAsli || 'Sin referencia'}</h3>
                      </div>
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold ${estadoColor}`}>
                        {estado}
                      </span>
                    </div>

                    <div className={`mt-3 space-y-3 text-[11px] sm:text-xs ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                      {/* Sección: Referencias y Cliente */}
                      <div className="space-y-2">
                        <div className={`text-[10px] uppercase tracking-wider font-bold mb-1.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                          Referencias
                        </div>
                        <div className="grid gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`font-bold flex-shrink-0 ${isDark ? 'text-white' : 'text-gray-900'}`}>REF CLIENTE</span>
                            <span className={`flex-1 border-b border-dotted ${isDark ? 'border-slate-600' : 'border-gray-300'}`}></span>
                            <span className={`font-semibold text-right ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>{record.refCliente || '-'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`font-bold flex-shrink-0 ${isDark ? 'text-white' : 'text-gray-900'}`}>EJECUTIVO</span>
                            <span className={`flex-1 border-b border-dotted ${isDark ? 'border-slate-600' : 'border-gray-300'}`}></span>
                            <span className={`font-semibold text-right ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>{record.ejecutivo || '-'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`font-bold flex-shrink-0 ${isDark ? 'text-white' : 'text-gray-900'}`}>SHIPPER</span>
                            <span className={`flex-1 border-b border-dotted ${isDark ? 'border-slate-600' : 'border-gray-300'}`}></span>
                            <span className={`font-semibold text-right ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>{record.shipper || '-'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Sección: Naviera y Nave */}
                      <div className="space-y-2">
                        <div className={`text-[10px] uppercase tracking-wider font-bold mb-1.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                          Naviera
                        </div>
                        <div className="grid gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`font-bold flex-shrink-0 ${isDark ? 'text-white' : 'text-gray-900'}`}>NAVIERA</span>
                            <span className={`flex-1 border-b border-dotted ${isDark ? 'border-slate-600' : 'border-gray-300'}`}></span>
                            <span className={`font-semibold text-right ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>{record.naviera || '-'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`font-bold flex-shrink-0 ${isDark ? 'text-white' : 'text-gray-900'}`}>NAVE</span>
                            <span className={`flex-1 border-b border-dotted ${isDark ? 'border-slate-600' : 'border-gray-300'}`}></span>
                            <span className={`font-semibold text-right ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>{formatNave()}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`font-bold flex-shrink-0 ${isDark ? 'text-white' : 'text-gray-900'}`}>BOOKING</span>
                            <span className={`flex-1 border-b border-dotted ${isDark ? 'border-slate-600' : 'border-gray-300'}`}></span>
                            <span className={`font-semibold text-right ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>{record.booking || '-'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Sección: Mercancía y Contenedor */}
                      <div className="space-y-2">
                        <div className={`text-[10px] uppercase tracking-wider font-bold mb-1.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                          Mercancía
                        </div>
                        <div className="grid gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`font-bold flex-shrink-0 ${isDark ? 'text-white' : 'text-gray-900'}`}>ESPECIE</span>
                            <span className={`flex-1 border-b border-dotted ${isDark ? 'border-slate-600' : 'border-gray-300'}`}></span>
                            <span className={`font-semibold text-right ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>{record.especie || '-'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`font-bold flex-shrink-0 ${isDark ? 'text-white' : 'text-gray-900'}`}>CONTENEDOR</span>
                            <span className={`flex-1 border-b border-dotted ${isDark ? 'border-slate-600' : 'border-gray-300'}`}></span>
                            <span className={`font-semibold text-right ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>{Array.isArray(record.contenedor) ? record.contenedor.join(', ') : (record.contenedor || '-')}</span>
                          </div>
                          {record.temperatura !== null && record.temperatura !== undefined && (
                            <div className="flex items-center gap-2">
                              <span className={`font-bold flex-shrink-0 ${isDark ? 'text-white' : 'text-gray-900'}`}>TEMP</span>
                              <span className={`flex-1 border-b border-dotted ${isDark ? 'border-slate-600' : 'border-gray-300'}`}></span>
                              <span className={`font-semibold text-right ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>{record.temperatura}°C</span>
                            </div>
                          )}
                          {record.cbm !== null && record.cbm !== undefined && (
                            <div className="flex items-center gap-2">
                              <span className={`font-bold flex-shrink-0 ${isDark ? 'text-white' : 'text-gray-900'}`}>CBM</span>
                              <span className={`flex-1 border-b border-dotted ${isDark ? 'border-slate-600' : 'border-gray-300'}`}></span>
                              <span className={`font-semibold text-right ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>{record.cbm}</span>
                            </div>
                          )}
                          {record.tratamientoFrio && (
                            <div className="flex items-center gap-2">
                              <span className={`font-bold flex-shrink-0 ${isDark ? 'text-white' : 'text-gray-900'}`}>TRAT. FRÍO</span>
                              <span className={`flex-1 border-b border-dotted ${isDark ? 'border-slate-600' : 'border-gray-300'}`}></span>
                              <span className={`font-semibold text-right ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>{record.tratamientoFrio}</span>
                            </div>
                          )}
                          {record.tipoAtmosfera && (
                            <div className="flex items-center gap-2">
                              <span className={`font-bold flex-shrink-0 ${isDark ? 'text-white' : 'text-gray-900'}`}>ATMÓSFERA</span>
                              <span className={`flex-1 border-b border-dotted ${isDark ? 'border-slate-600' : 'border-gray-300'}`}></span>
                              <span className={`font-semibold text-right ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>{record.tipoAtmosfera}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Sección: Rutas y Fechas */}
                      <div className="space-y-2">
                        <div className={`text-[10px] uppercase tracking-wider font-bold mb-1.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                          Ruta
                        </div>
                        <div className="grid gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`font-bold flex-shrink-0 ${isDark ? 'text-white' : 'text-gray-900'}`}>POL</span>
                            <span className={`flex-1 border-b border-dotted ${isDark ? 'border-slate-600' : 'border-gray-300'}`}></span>
                            <span className={`font-semibold text-right ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>{record.pol || '-'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`font-bold flex-shrink-0 ${isDark ? 'text-white' : 'text-gray-900'}`}>ETD</span>
                            <span className={`flex-1 border-b border-dotted ${isDark ? 'border-slate-600' : 'border-gray-300'}`}></span>
                            <span className={`font-semibold text-right ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>{formatDate(record.etd)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`font-bold flex-shrink-0 ${isDark ? 'text-white' : 'text-gray-900'}`}>POD</span>
                            <span className={`flex-1 border-b border-dotted ${isDark ? 'border-slate-600' : 'border-gray-300'}`}></span>
                            <span className={`font-semibold text-right ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>{record.pod || '-'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`font-bold flex-shrink-0 ${isDark ? 'text-white' : 'text-gray-900'}`}>ETA</span>
                            <span className={`flex-1 border-b border-dotted ${isDark ? 'border-slate-600' : 'border-gray-300'}`}></span>
                            <span className={`font-semibold text-right ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>{formatDate(record.eta)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`font-bold flex-shrink-0 ${isDark ? 'text-white' : 'text-gray-900'}`}>TRÁNSITO</span>
                            <span className={`flex-1 border-b border-dotted ${isDark ? 'border-slate-600' : 'border-gray-300'}`}></span>
                            <span className={`font-semibold text-right ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>{calculateTransito()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Sección: Operaciones y Documentos */}
                      <div className="space-y-2">
                        <div className={`text-[10px] uppercase tracking-wider font-bold mb-1.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                          Operaciones
                        </div>
                        <div className="grid gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`font-bold flex-shrink-0 ${isDark ? 'text-white' : 'text-gray-900'}`}>DEPÓSITO</span>
                            <span className={`flex-1 border-b border-dotted ${isDark ? 'border-slate-600' : 'border-gray-300'}`}></span>
                            <span className={`font-semibold text-right ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>{record.deposito || '-'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`font-bold flex-shrink-0 ${isDark ? 'text-white' : 'text-gray-900'}`}>TIPO INGRESO</span>
                            <span className={`flex-1 border-b border-dotted ${isDark ? 'border-slate-600' : 'border-gray-300'}`}></span>
                            <span className={`font-semibold text-right ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>{record.tipoIngreso || '-'}</span>
                          </div>
                          {record.ingresoStacking && (
                            <div className="flex items-center gap-2">
                              <span className={`font-bold flex-shrink-0 ${isDark ? 'text-white' : 'text-gray-900'}`}>ING. STACKING</span>
                              <span className={`flex-1 border-b border-dotted ${isDark ? 'border-slate-600' : 'border-gray-300'}`}></span>
                              <span className={`font-semibold text-right ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>{formatDate(record.ingresoStacking)}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <span className={`font-bold flex-shrink-0 ${isDark ? 'text-white' : 'text-gray-900'}`}>FLETE</span>
                            <span className={`flex-1 border-b border-dotted ${isDark ? 'border-slate-600' : 'border-gray-300'}`}></span>
                            <span className={`font-semibold text-right ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>{record.flete || '-'}</span>
                          </div>
                          {record.numeroBl && (
                            <div className="flex items-center gap-2">
                              <span className={`font-bold flex-shrink-0 ${isDark ? 'text-white' : 'text-gray-900'}`}>N° BL</span>
                              <span className={`flex-1 border-b border-dotted ${isDark ? 'border-slate-600' : 'border-gray-300'}`}></span>
                              <span className={`font-semibold text-right ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>{record.numeroBl}</span>
                            </div>
                          )}
                          {record.estadoBl && (
                            <div className="flex items-center gap-2">
                              <span className={`font-bold flex-shrink-0 ${isDark ? 'text-white' : 'text-gray-900'}`}>ESTADO BL</span>
                              <span className={`flex-1 border-b border-dotted ${isDark ? 'border-slate-600' : 'border-gray-300'}`}></span>
                              <span className={`font-semibold text-right ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>{record.estadoBl}</span>
                            </div>
                          )}
                          {record.contrato && (
                            <div className="flex items-center gap-2">
                              <span className={`font-bold flex-shrink-0 ${isDark ? 'text-white' : 'text-gray-900'}`}>CONTRATO</span>
                              <span className={`flex-1 border-b border-dotted ${isDark ? 'border-slate-600' : 'border-gray-300'}`}></span>
                              <span className={`font-semibold text-right ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>{record.contrato}</span>
                            </div>
                          )}
                          {record.facturacion && (
                            <div className="flex items-center gap-2">
                              <span className={`font-bold flex-shrink-0 ${isDark ? 'text-white' : 'text-gray-900'}`}>FACTURACIÓN</span>
                              <span className={`flex-1 border-b border-dotted ${isDark ? 'border-slate-600' : 'border-gray-300'}`}></span>
                              <span className={`font-semibold text-right ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>{record.facturacion}</span>
                            </div>
                          )}
                          {(record as any).consignatario && (
                            <div className="flex items-center gap-2">
                              <span className={`font-bold flex-shrink-0 ${isDark ? 'text-white' : 'text-gray-900'}`}>CONSIGNATARIO</span>
                              <span className={`flex-1 border-b border-dotted ${isDark ? 'border-slate-600' : 'border-gray-300'}`}></span>
                              <span className={`font-semibold text-right ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>{(record as any).consignatario}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Sección: Comentarios y Observaciones */}
                      {(record.comentario || record.observacion) && (
                        <div className="space-y-2">
                          <div className={`text-[10px] uppercase tracking-wider font-bold mb-1.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                            Notas
                          </div>
                          <div className="grid gap-2">
                            {record.comentario && (
                              <div className="flex flex-col gap-1">
                                <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>COMENTARIO</span>
                                <span className={`text-[10px] ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>{record.comentario}</span>
                              </div>
                            )}
                            {record.observacion && (
                              <div className="flex flex-col gap-1">
                                <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>OBSERVACIÓN</span>
                                <span className={`text-[10px] ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>{record.observacion}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex gap-2">
                        {onEdit && (
                          <button
                            onClick={() => onEdit(record)}
                            className={`${toolbarButtonClasses} flex-1 justify-center text-[11px] py-2`}
                          >
                            <Edit className="h-4 w-4" />
                            Editar
                          </button>
                        )}
                        <button
                          onClick={handleCopyCard}
                          className={`${toolbarButtonClasses} flex-1 justify-center text-[11px] py-2`}
                          title="Copiar tarjeta al portapapeles"
                        >
                          <Copy className="h-4 w-4" />
                          Copiar
                        </button>
                      </div>
                      {onShowHistorial && (
                        <button
                          onClick={() => onShowHistorial(record)}
                          className={`${toolbarButtonClasses} flex-1 justify-center text-[11px] py-2`}
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
        </div>
      )}

      {/* Report Generator Modal */}
      {showReportGenerator && (
        <ReportGenerator
          isOpen={showReportGenerator}
          registros={hasSelection ? selectedRecordsList : filteredData}
          onClose={() => setShowReportGenerator(false)}
          onSheetsUpdated={handleSheetsUpdated}
        />
      )}

      {contextMenu && (
        <div
          ref={contextMenuRef}
          className={`fixed z-[999] min-w-[260px] overflow-hidden border backdrop-blur-xl ${isDark
            ? 'border-slate-700/80 bg-slate-950/90 text-slate-100'
            : 'border-gray-300/80 bg-white/95 text-gray-900'
          }`}
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <div className={`border-b px-4 py-3 bg-gradient-to-r ${isDark ? 'from-slate-900 to-slate-800 border-slate-700/60' : 'from-gray-50 to-white border-gray-200'}`}>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 ${isDark ? 'bg-sky-500' : 'bg-blue-500'}`}></div>
              <span className={`text-xs font-bold uppercase tracking-[0.15em] ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                Acciones
              </span>
            </div>
          </div>
          <div className="flex flex-col py-1 text-sm">
            {(onEditNaveViaje || onBulkEditNaveViaje) && (
              <button
                onClick={handleContextEditNaveViaje}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-all ${isDark ? 'hover:bg-sky-500/10 border-l-2 border-transparent hover:border-sky-500 hover:text-sky-100' : 'hover:bg-blue-50 border-l-2 border-transparent hover:border-blue-500 hover:text-blue-700'}`}
              >
                <div className={`flex items-center justify-center w-8 h-8 ${isDark ? 'bg-sky-500/20 text-sky-400' : 'bg-blue-100 text-blue-600'}`}>
                  <Send className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className={`font-medium ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>Editar Nave / Viaje</div>
                  <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>Modificar nave y viaje</div>
                </div>
              </button>
            )}
            {onSendToTransportes && (() => {
              // Verificar si el registro tiene PDF de booking cargado
              const bookingPdfValue = contextMenu.record.bookingPdf;
              const bookingValue = contextMenu.record.booking;

              // Verificar si tiene bookingPdf en el campo
              const hasPdfField = bookingPdfValue &&
                typeof bookingPdfValue === 'string' &&
                bookingPdfValue.trim() !== '' &&
                bookingPdfValue.trim() !== 'null' &&
                bookingPdfValue.trim() !== 'undefined';

              // Verificar si existe PDF en storage usando bookingDocuments
              let hasPdfInStorage = false;
              if (bookingValue && bookingDocuments) {
                const bookingKey = bookingValue.trim().toUpperCase().replace(/\s+/g, '');
                hasPdfInStorage = bookingDocuments.has(bookingKey);
              }

              const recordHasPdf = hasPdfField || hasPdfInStorage;

              // Si hay selección múltiple, verificar que todos tengan PDF
              let allHavePdf = recordHasPdf;
              if (hasSelection && selectedRecordsList.length > 0) {
                allHavePdf = selectedRecordsList.every(r => {
                  const pdfValue = r.bookingPdf;
                  const bookingVal = r.booking;

                  const hasPdf = pdfValue &&
                    typeof pdfValue === 'string' &&
                    pdfValue.trim() !== '' &&
                    pdfValue.trim() !== 'null' &&
                    pdfValue.trim() !== 'undefined';

                  let hasStoragePdf = false;
                  if (bookingVal && bookingDocuments) {
                    const bookingKey = bookingVal.trim().toUpperCase().replace(/\s+/g, '');
                    hasStoragePdf = bookingDocuments.has(bookingKey);
                  }

                  return hasPdf || hasStoragePdf;
                });
              }

              // Mostrar el botón siempre, pero deshabilitado si no hay PDF
              return (
                <button
                  onClick={allHavePdf ? handleContextSendToTransportes : undefined}
                  disabled={!allHavePdf}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-all ${allHavePdf
                    ? isDark
                      ? 'hover:bg-emerald-500/10 border-l-2 border-transparent hover:border-emerald-500 hover:text-emerald-100 cursor-pointer'
                      : 'hover:bg-green-50 border-l-2 border-transparent hover:border-green-500 hover:text-green-700 cursor-pointer'
                    : isDark
                      ? 'opacity-50 cursor-not-allowed border-l-2 border-transparent'
                      : 'opacity-50 cursor-not-allowed border-l-2 border-transparent'
                    }`}
                  title={!allHavePdf ? 'El registro debe tener PDF de booking cargado para enviar a Transportes' : ''}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center justify-center w-8 h-8 ${allHavePdf
                      ? isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-green-100 text-green-600'
                      : isDark ? 'bg-slate-700/50 text-slate-500' : 'bg-gray-200 text-gray-500'
                    }`}>
                      <Truck className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className={`font-medium ${allHavePdf
                        ? isDark ? 'text-slate-100' : 'text-gray-900'
                        : isDark ? 'text-slate-500' : 'text-gray-500'
                      }`}>Enviar a Transportes</div>
                      <div className={`text-xs ${allHavePdf
                        ? isDark ? 'text-slate-500' : 'text-gray-500'
                        : isDark ? 'text-slate-600' : 'text-gray-400'
                      }`}>
                        {hasSelection && selectedRecordsList.length > 0
                          ? `${selectedRecordsList.length} registros seleccionados`
                          : 'Enviar registro a transportes'
                        }
                      </div>
                    </div>
                  </div>
                  {hasSelection && selectedRecordsList.length > 0 && (
                    <span className={`text-xs font-bold px-2 py-1 ${isDark
                      ? allHavePdf ? 'bg-emerald-500 text-white' : 'bg-slate-600 text-slate-300'
                      : allHavePdf ? 'bg-green-500 text-white' : 'bg-gray-400 text-white'
                    }`}>
                      {selectedRecordsList.length}
                    </span>
                  )}
                </button>
              );
            })()}
          </div>
          <div className={`border-t px-4 py-2 ${isDark ? 'bg-slate-900/50 border-slate-800/60' : 'bg-gray-50 border-gray-200'}`}>
            <button
              onClick={closeContextMenu}
              className={`w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium uppercase tracking-[0.15em] transition-colors ${isDark
                ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <X className="h-3 w-3" />
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}