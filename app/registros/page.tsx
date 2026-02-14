'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { User } from '@supabase/supabase-js';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridOptions, GridReadyEvent, ICellRendererParams, IHeaderParams } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import { UserProfileModal } from '@/components/users/UserProfileModal';
import { obtenerAnchoColumna } from '@/config/registros-columnas';
import {
  User as UserIcon,
  ArrowLeft,
  Download,
  Settings,
  Grid3x3,
  Filter,
  RefreshCw,
  Send,
  X,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  LayoutDashboard,
  Ship,
  Truck,
  FileText,
  FileCheck,
  Globe,
  Activity,
  DollarSign,
  BarChart3,
  Trash2,
  Users,
  Menu,
  Plus,
  Search
} from 'lucide-react';
import { Sidebar } from '@/components/layout/Sidebar';
import { SidebarSection } from '@/types/layout';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/hooks/useToast';
import { Registro } from '@/types/registros';
import { convertSupabaseToApp } from '@/lib/migration-utils';
import { AddModal } from '@/components/modals/AddModal';
import { EditNaveViajeModal } from '@/components/EditNaveViajeModal';
import { TrashModal } from '@/components/modals/TrashModal';
import { logHistoryEntry, mapRegistroFieldToDb } from '@/lib/history';
import { calculateTransitTime } from '@/lib/transit-time-utils';
import { generarReporte, descargarExcel, TipoReporte } from '@/lib/reportes';
import { useUser } from '@/hooks/useUser';

export default function TablasPersonalizadasPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const { success, error: showError } = useToast();
  
  // Obtener permisos del usuario desde el hook
  const { 
    currentUser, 
    canEdit, 
    canAdd, 
    canDelete, 
    canExport,
    canViewHistory 
  } = useUser();
  
  const [user, setUser] = useState<User | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [rowData, setRowData] = useState<Registro[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<'quartz' | 'quartz-dark'>('quartz');

  // Valores únicos para filtros
  const [navierasUnicas, setNavierasUnicas] = useState<string[]>([]);
  const [ejecutivosUnicos, setEjecutivosUnicos] = useState<string[]>([]);
  const [especiesUnicas, setEspeciesUnicas] = useState<string[]>([]);
  const [clientesUnicos, setClientesUnicos] = useState<string[]>([]);
  const [polsUnicos, setPolsUnicos] = useState<string[]>([]);
  const [destinosUnicos, setDestinosUnicos] = useState<string[]>([]);
  const [depositosUnicos, setDepositosUnicos] = useState<string[]>([]);
  const [fletesUnicos, setFletesUnicos] = useState<string[]>([]);
  const [cbmUnicos, setCbmUnicos] = useState<string[]>([]);
  const [estadosUnicos, setEstadosUnicos] = useState<string[]>([]);
  const [tipoIngresoUnicos, setTipoIngresoUnicos] = useState<string[]>([]);
  const [temporadasUnicas, setTemporadasUnicas] = useState<string[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [selectedRegistros, setSelectedRegistros] = useState<Registro[]>([]);
  const [showEditNaveViajeModal, setShowEditNaveViajeModal] = useState(false);
  const [showTrashModal, setShowTrashModal] = useState(false);
  const [trashCount, setTrashCount] = useState(0);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [copiedRegistro, setCopiedRegistro] = useState<Registro | null>(null);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  
  // Estados para filtros del panel
  const [filterPanelValues, setFilterPanelValues] = useState({
    ejecutivo: '',
    shipper: '',
    naviera: '',
    especie: '',
    pol: '',
    pod: '',
    deposito: '',
    estado: '',
    tipoIngreso: '',
    flete: '',
    temporada: '',
  });
  const [searchText, setSearchText] = useState<string>('');
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; visible: boolean }>({
    x: 0,
    y: 0,
    visible: false,
  });
  const [navesUnicas, setNavesUnicas] = useState<string[]>([]);
  const [navierasNavesMapping, setNavierasNavesMapping] = useState<Record<string, string[]>>({});
  const [consorciosNavesMapping, setConsorciosNavesMapping] = useState<Record<string, string[]>>({});
  const [gridApi, setGridApi] = useState<any>(null);
  const preferencesLoadedRef = useRef(false);
  
  // Estados para el Sidebar
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  // Componente de header personalizado que integra el filtro
  const CustomHeaderWithFilter = (props: IHeaderParams) => {
    const [filterValue, setFilterValue] = useState('');
    const [currentSort, setCurrentSort] = useState<string | null | undefined>(props.column.getSort());
    
    // Actualizar el estado cuando cambie el sort
    useEffect(() => {
      const updateSort = () => {
        setCurrentSort(props.column.getSort());
      };
      
      // Suscribirse a cambios de sort
      props.api.addEventListener('sortChanged', updateSort);
      
      return () => {
        props.api.removeEventListener('sortChanged', updateSort);
      };
    }, [props.api, props.column]);
    
    const applyFilter = useCallback(async (value: string) => {
      try {
        const filterType = props.column.getColDef().filter || 'agTextColumnFilter';
        const field = props.column.getColDef().field;
        
        if (!field || !props.api) {
          return;
        }
        
        // Obtener la instancia del filtro de forma asíncrona
        const filterInstance = await props.api.getColumnFilterInstance(field);
        
        if (!filterInstance) {
          return;
        }
        
        // Aplicar el filtro directamente a la instancia
        if (value !== '') {
          if (filterType === 'agTextColumnFilter') {
            // Para agTextColumnFilter, necesitamos especificar explícitamente el tipo
            // El tipo 'contains' permite búsqueda parcial (más flexible)
            (filterInstance as any).setModel({
              filter: value.trim(),
              type: 'contains'
            });
          } else if (filterType === 'agNumberColumnFilter') {
            (filterInstance as any).setModel({
              filter: parseFloat(value) || null,
              type: 'equals'
            });
          } else if (filterType === 'agDateColumnFilter') {
            (filterInstance as any).setModel({
              dateFrom: value,
              type: 'equals'
            });
          }
        } else {
          // Si el valor está vacío, limpiar el filtro
          (filterInstance as any).setModel(null);
        }
        
        // Forzar actualización de filtros
        props.api.onFilterChanged();
      } catch (error) {
        // Error silencioso al aplicar filtro
      }
    }, [props.api, props.column]);

    const onFilterChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setFilterValue(value);
      applyFilter(value);
    }, [applyFilter]);

    const onSelectChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      setFilterValue(value);
      applyFilter(value);
    }, [applyFilter]);

    const getFilterType = () => {
      const colDef = props.column.getColDef();
      return colDef.filter || 'agTextColumnFilter';
    };

    // Verificar si tiene valores únicos para mostrar un select
    const hasFilterValues = props.column.getColDef().filterParams?.values && 
                            Array.isArray(props.column.getColDef().filterParams.values) &&
                            props.column.getColDef().filterParams.values.length > 0;
    const isDateFilter = getFilterType() === 'agDateColumnFilter';
    const isNumberFilter = getFilterType() === 'agNumberColumnFilter';
    
    // Función para manejar el click en la flecha de ordenamiento
    const handleSortClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      const sort = props.column.getSort();
      let newSort: 'asc' | 'desc' | null;
      
      if (sort === 'asc') {
        // Si está ascendente (mayor a menor), cambiar a descendente (menor a mayor)
        newSort = 'desc';
      } else {
        // Si está descendente o no hay orden, poner ascendente (mayor a menor)
        newSort = 'asc';
      }
      
      // Actualizar el estado local primero para que el componente se re-renderice
      setCurrentSort(newSort);
      
      // Luego aplicar el sort al grid
      props.setSort(newSort, false);
    };

    // Determinar qué flecha mostrar: arriba por defecto, abajo si está ordenado descendente
    const showDownArrow = currentSort === 'desc';

    return (
      <div className="flex flex-col h-full w-full">
        <div className="flex items-center justify-center h-6 px-2">
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">
            {props.displayName}
          </span>
          {props.enableSorting && (
            <button
              onClick={handleSortClick}
              className="ml-2 p-0.5 rounded transition-colors text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"
              title={
                showDownArrow 
                  ? 'Ordenar ascendente (mayor a menor)' 
                  : 'Ordenar descendente (menor a mayor)'
              }
            >
              {showDownArrow ? (
                <ArrowDown className="w-4 h-4" />
              ) : (
                <ArrowUp className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
        <div className="flex-1 px-1 pb-1">
          {hasFilterValues ? (
            <select
              className="w-full h-6 text-xs border border-gray-300 dark:border-gray-600 px-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              onChange={onSelectChange}
              value={filterValue}
            >
              <option value="">Todos</option>
              {props.column.getColDef().filterParams?.values?.map((val: string) => (
                <option key={val} value={val}>{val}</option>
              ))}
            </select>
          ) : isDateFilter ? (
            <input
              type="date"
              className="w-full h-6 text-xs border border-gray-300 dark:border-gray-600 px-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              onChange={onFilterChange}
              value={filterValue}
            />
          ) : isNumberFilter ? (
            <input
              type="number"
              className="w-full h-6 text-xs border border-gray-300 dark:border-gray-600 px-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              onChange={onFilterChange}
              value={filterValue}
              placeholder="Filtrar..."
            />
          ) : (
            <input
              type="text"
              className="w-full h-6 text-xs border border-gray-300 dark:border-gray-600 px-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              onChange={onFilterChange}
              value={filterValue}
              placeholder="Filtrar..."
            />
          )}
        </div>
      </div>
    );
  };

  // Manejar cambios de celda para edición inline
  const onCellValueChanged = useCallback(async (params: any) => {
    if (!params.data || !params.data.id) return;

    const field = params.colDef.field as keyof Registro;
    const newValue = params.newValue;
    const oldValue = params.oldValue;
    const record = params.data as Registro;

    // Si el valor no cambió, no hacer nada
    if (newValue === oldValue) return;

    try {
      const supabase = createClient();
      
      // Procesar el valor según el tipo de campo
      let processedValue: any = newValue;
      
      // Campos numéricos
      if (['temperatura', 'cbm', 'co2', 'o2', 'tt', 'cantCont'].includes(field)) {
        processedValue = newValue === '' || newValue === null ? null : Number(newValue);
        if (isNaN(processedValue)) {
          processedValue = null;
        }
      }
      
      // Campos de fecha
      if (['etd', 'eta', 'ingresado', 'ingresoStacking'].includes(field)) {
        if (newValue) {
          // Si es string, intentar parsearlo
          if (typeof newValue === 'string') {
            processedValue = new Date(newValue).toISOString();
          } else if (newValue instanceof Date) {
            processedValue = newValue.toISOString();
          }
        } else {
          processedValue = null;
        }
      }

      // Mapear el campo de app a BD
      const dbFieldName = mapRegistroFieldToDb(field);
      
      // Preparar datos para actualizar
      const updateData: any = {
        [dbFieldName]: processedValue,
        updated_at: new Date().toISOString()
      };

      // Si estamos editando ETD o ETA, recalcular TT
      if (field === 'etd' || field === 'eta') {
        const etd = field === 'etd' ? processedValue : record.etd;
        const eta = field === 'eta' ? processedValue : record.eta;
        const newTT = calculateTransitTime(etd, eta);
        if (newTT !== null) {
          updateData.tt = newTT;
        }
      }

      // Función para calcular semana del año
      const getWeekOfYear = (date: Date): number => {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
      };

      // Si estamos editando fecha de ingreso, recalcular semana y mes de ingreso
      if (field === 'ingresado' && processedValue) {
        const date = new Date(processedValue);
        if (!isNaN(date.getTime())) {
          updateData.semana_ingreso = getWeekOfYear(date);
          updateData.mes_ingreso = date.getMonth() + 1;
        }
      }

      // Si estamos editando ETD, recalcular semana y mes de zarpe
      if (field === 'etd' && processedValue) {
        const date = new Date(processedValue);
        if (!isNaN(date.getTime())) {
          updateData.semana_zarpe = getWeekOfYear(date);
          updateData.mes_zarpe = date.getMonth() + 1;
        }
      }

      // Si estamos editando ETA, recalcular semana y mes de arribo
      if (field === 'eta' && processedValue) {
        const date = new Date(processedValue);
        if (!isNaN(date.getTime())) {
          updateData.semana_arribo = getWeekOfYear(date);
          updateData.mes_arribo = date.getMonth() + 1;
        }
      }

      // Actualizar en Supabase
      const { data, error: updateError } = await supabase
        .from('registros')
        .update(updateData)
        .eq('id', record.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error al actualizar registro:', updateError);
        showError('Error al guardar el cambio. Por favor, intenta de nuevo.');
        // Revertir el cambio en la tabla
        params.node.setDataValue(field, oldValue);
        return;
      }

      if (data) {
        // Registrar en historial
        try {
          await logHistoryEntry(supabase, {
            registroId: record.id,
            field,
            previousValue: oldValue,
            newValue: processedValue,
          });
        } catch (historialError) {
          // Error silencioso al registrar historial
        }

        // Actualizar el registro en el estado local
        const updatedRegistro = convertSupabaseToApp(data);
        setRowData(prev => prev.map(r => r.id === updatedRegistro.id ? updatedRegistro : r));
        
        success('Cambio guardado correctamente');
      }
    } catch (error) {
      console.error('Error al procesar cambio de celda:', error);
      showError('Error al guardar el cambio. Por favor, intenta de nuevo.');
      // Revertir el cambio en la tabla
      params.node.setDataValue(field, oldValue);
    }
  }, [success, showError]);

  const [gridOptions, setGridOptions] = useState<GridOptions>({
    pagination: false,
    rowSelection: {
      mode: 'multiRow',
      checkboxes: false, // Deshabilitado porque usamos checkboxSelection en la columna
      headerCheckbox: false,
      enableClickSelection: false,
    },
    defaultColDef: {
      sortable: true,
      filter: true,
      resizable: true,
      floatingFilter: false, // Deshabilitar filtros flotantes
      headerComponent: CustomHeaderWithFilter as any,
      editable: canEdit, // Habilitar edición inline solo si el usuario tiene permisos
      cellStyle: { textAlign: 'center' },
      cellClass: 'ag-center-cell',
      headerClass: 'ag-header-cell-center', // Centrar headers
    },
    sideBar: false,
    suppressMenuHide: true,
    // Manejar cambios de celda para edición inline
    onCellValueChanged: onCellValueChanged,
    // Nota: isRowSelectable está deprecado pero se mantiene por compatibilidad
    // La lógica de filtrado se maneja en onSelectionChanged
  } as GridOptions);

  const loadCatalogos = useCallback(async () => {
    try {
      const supabase = createClient();
      
      // Cargar navieras desde catalogos_navieras
      const { data: navierasData, error: navierasError } = await supabase
        .from('catalogos_navieras')
        .select('*');

      if (navierasError) {
        console.error('Error loading catalogos_navieras:', navierasError);
      } else if (navierasData && navierasData.length > 0) {
        const navieras = navierasData
          .map(item => item.nombre)
          .filter(Boolean)
          .sort();
        setNavierasUnicas([...new Set(navieras)]);
      }

      // Cargar naves desde catalogos_naves
      const { data: navesData, error: navesError } = await supabase
        .from('catalogos_naves')
        .select('*');

      if (navesError) {
        console.error('Error loading catalogos_naves:', navesError);
      } else if (navesData && navesData.length > 0) {
        const naves = navesData
          .map(item => item.nombre)
          .filter(Boolean)
          .sort();
        setNavesUnicas([...new Set(naves)]);

        // Crear mapping de navieras -> naves
        const mapping: Record<string, string[]> = {};
        navesData.forEach(item => {
          const navieraNombre = item.naviera_nombre;
          const naveNombre = item.nombre;
          
          if (navieraNombre && naveNombre) {
            if (!mapping[navieraNombre]) {
              mapping[navieraNombre] = [];
            }
            if (!mapping[navieraNombre].includes(naveNombre)) {
              mapping[navieraNombre].push(naveNombre);
            }
          }
        });
        
        // Ordenar las naves de cada naviera
        Object.keys(mapping).forEach(key => {
          mapping[key].sort();
        });
        
        setNavierasNavesMapping(mapping);
      }

      // Cargar destinos desde catalogos_destinos
      const { data: destinosData, error: destinosError } = await supabase
        .from('catalogos_destinos')
        .select('nombre')
        .eq('activo', true)
        .order('nombre');

      if (destinosError) {
        console.error('Error loading catalogos_destinos:', destinosError);
      } else if (destinosData && destinosData.length > 0) {
        const destinos = destinosData
          .map(item => item.nombre)
          .filter(Boolean);
        setDestinosUnicos([...new Set(destinos)]);
      }

      // Cargar catálogo general para pols, depositos, etc.
      const { data: catalogos, error: catalogosError } = await supabase
        .from('catalogos')
        .select('*');

      if (catalogosError) {
        console.error('Error loading catalogos:', catalogosError);
      } else if (catalogos) {
        catalogos.forEach(catalogo => {
          const valores = catalogo.valores || [];
          const mapping = catalogo.mapping;

          switch (catalogo.categoria) {
            case 'pols':
              setPolsUnicos(valores);
              break;
            case 'naves':
              // Solo usar si no hay datos de catalogos_naves
              if (navesError || !navesData || navesData.length === 0) {
                setNavesUnicas(valores);
              }
              break;
            case 'navierasNavesMapping':
              // Solo usar si no hay datos de catalogos_naves
              if ((navesError || !navesData || navesData.length === 0) && mapping && typeof mapping === 'object') {
                const cleanMapping: Record<string, string[]> = {};
                Object.keys(mapping).forEach(key => {
                  const naves = (mapping[key] || []) as string[];
                  cleanMapping[key] = naves.map((nave: string) => {
                    const match = nave.match(/^(.+?)\s*\[.+\]$/);
                    return match ? match[1].trim() : nave.trim();
                  });
                });
                setNavierasNavesMapping(cleanMapping);
                
                if (navierasError || !navierasData || navierasData.length === 0) {
                  const navierasFromMapping = Object.keys(cleanMapping).sort();
                  setNavierasUnicas(navierasFromMapping);
                }
              }
              break;
            case 'consorciosNavesMapping':
              if (mapping && typeof mapping === 'object') {
                const cleanMapping: Record<string, string[]> = {};
                Object.keys(mapping).forEach(key => {
                  const naves = (mapping[key] || []) as string[];
                  cleanMapping[key] = naves.map((nave: string) => {
                    const match = nave.match(/^(.+?)\s*\[.+\]$/);
                    return match ? match[1].trim() : nave.trim();
                  });
                });
                setConsorciosNavesMapping(cleanMapping);
              }
              break;
          }
        });
      }
    } catch (error) {
      console.error('Error en loadCatalogos:', error);
    }
  }, []);

  const loadRegistros = useCallback(async () => {
    setLoadingData(true);
    try {
      const supabase = createClient();
      
      // Aplicar filtros según el rol del usuario
      let query = supabase
        .from('registros')
        .select('*')
        .is('deleted_at', null);

      // Si currentUser está disponible, aplicar filtros por rol
      if (currentUser) {
        const isAdmin = currentUser.rol === 'admin';
        const isEjecutivo = currentUser.rol === 'ejecutivo' 
          || (currentUser.email?.endsWith('@asli.cl') && currentUser.rol !== 'cliente');
        const clienteNombre = currentUser.cliente_nombre?.trim();
        const clientesAsignados = currentUser.clientes_asignados || [];

        if (!isAdmin) {
          if (currentUser.rol === 'cliente' && clienteNombre) {
            // Cliente: solo ve sus propios registros
            query = query.ilike('shipper', clienteNombre);
          } else if (isEjecutivo && clientesAsignados.length > 0) {
            // Ejecutivo: solo ve registros de sus clientes asignados
            query = query.in('shipper', clientesAsignados);
          } else if (!isAdmin && !isEjecutivo) {
            // Usuario sin permisos específicos: no ve nada
            query = query.eq('id', 'NONE');
          }
        }
      }

      const { data, error } = await query.order('ref_asli', { ascending: false });

      if (error) {
        console.error('Error loading registros:', error);
        showError('Error al cargar registros: ' + (error.message || 'Error desconocido'));
        return;
      }

      const registrosConvertidos = (data || []).map(convertSupabaseToApp);
      setRowData(registrosConvertidos);

      // Extraer valores únicos para filtros (excepto navieras, naves, pols y destinos que se cargan desde catálogos)
      const ejecutivos = [...new Set(registrosConvertidos.map(r => r.ejecutivo).filter(Boolean))].sort();
      const especies = [...new Set(registrosConvertidos.map(r => r.especie).filter(Boolean))].sort();
      const clientes = [...new Set(registrosConvertidos.map(r => r.shipper).filter(Boolean))].sort();
      const depositos = [...new Set(registrosConvertidos.map(r => r.deposito).filter(Boolean))].sort();
      const fletes = [...new Set(registrosConvertidos.map(r => r.flete).filter(Boolean))].sort();
      const estados = [...new Set(registrosConvertidos.map(r => r.estado).filter(Boolean))].sort();
      const tipoIngreso = [...new Set(registrosConvertidos.map(r => r.tipoIngreso).filter(Boolean))].sort();
      const temporadas = [...new Set(registrosConvertidos.map(r => r.temporada).filter((t): t is string => Boolean(t)))].sort();

      // ❌ NO sobrescribir navierasUnicas, navesUnicas, polsUnicos ni destinosUnicos: se cargan desde catálogos
      setEjecutivosUnicos(ejecutivos);
      setEspeciesUnicas(especies);
      setClientesUnicos(clientes);
      setDepositosUnicos(depositos);
      setFletesUnicos(fletes);
      setEstadosUnicos(estados);
      setTipoIngresoUnicos(tipoIngreso);
      setTemporadasUnicas(temporadas);

      // ❌ NO sobrescribir navesUnicas: se cargan desde catalogos_naves
      // Extraer naves únicas
      // const naves = [...new Set(registrosConvertidos.map(r => {
      //   let nave = r.naveInicial || '';
      //   const match = nave.match(/^(.+?)\s*\[(.+?)\]$/);
      //   return match ? match[1].trim() : nave.trim();
      // }).filter(Boolean))].sort();
      // setNavesUnicas(naves); // ELIMINADO: se carga desde catalogos_naves

      success(`${registrosConvertidos.length} registros cargados`);
    } catch (error: any) {
      console.error('Error loading registros:', error);
      showError('Error al cargar registros: ' + error.message);
    } finally {
      setLoadingData(false);
    }
  }, [showError, success, currentUser]);

  // Cargar contador de papelera
  const loadTrashCount = useCallback(async () => {
    try {
      const supabase = createClient();
      const { count, error } = await supabase
        .from('registros')
        .select('*', { count: 'exact', head: true })
        .not('deleted_at', 'is', null);

      if (error) {
        console.error('Error loading trash count:', error);
        return;
      }

      setTrashCount(count ?? 0);
    } catch (err) {
      console.warn('[Registros] Error cargando contador de papelera:', err);
      setTrashCount(0);
    }
  }, []);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const supabase = createClient();
        const { data: { user: currentUser } } = await supabase.auth.getUser();

        if (!currentUser) {
          router.push('/auth');
          return;
        }

        setUser(currentUser);

        // Cargar información adicional del usuario
        const { data: userData, error } = await supabase
          .from('usuarios')
          .select('*')
          .eq('auth_user_id', currentUser.id)
          .single();

        if (!error && userData) {
          setUserInfo(userData);
        }

        // Cargar catálogos y registros
        await loadCatalogos();
        await loadRegistros();
        await loadTrashCount();
      } catch (error) {
        console.error('Error checking user:', error);
        router.push('/auth');
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, [router, loadRegistros, loadCatalogos]);

  // Inicializar valores estándar de CBM
  useEffect(() => {
    const cbmValues = ['0', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55', '60', '65', '70', '75', '80', '85', '90'];
    setCbmUnicos(cbmValues);
  }, []);

  useEffect(() => {
    // Ajustar tema según el tema del sistema
    if (theme === 'dark') {
      setSelectedTheme('quartz-dark');
    } else {
      setSelectedTheme('quartz');
    }
  }, [theme]);

  // Deshabilitar scroll del body y html para que solo la tabla tenga scroll
  useEffect(() => {
    // Guardar estilos originales
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalBodyHeight = document.body.style.height;
    const originalHtmlHeight = document.documentElement.style.height;

    // Deshabilitar scroll
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.height = '100vh';
    document.documentElement.style.height = '100vh';

    // Cleanup: restaurar estilos originales al desmontar
    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.height = originalBodyHeight;
      document.documentElement.style.height = originalHtmlHeight;
    };
  }, []);

  // Cerrar el desplegable de exportar cuando se hace clic fuera
  useEffect(() => {
    if (!showExportDropdown) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const container = document.querySelector('.export-dropdown-container');
      if (container && !container.contains(target)) {
        setShowExportDropdown(false);
      }
    };

    // Usar un pequeño delay para evitar que se cierre inmediatamente
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showExportDropdown]);

  // Definición de columnas para registros
  const columnDefs: ColDef[] = useMemo(() => [
    {
      field: 'refCliente',
      headerName: 'REF Cliente',
      width: obtenerAnchoColumna('refCliente'),
      pinned: 'left',
      checkboxSelection: true, // Checkbox en esta columna
      headerCheckboxSelection: true, // Checkbox en el header para seleccionar todo
      filter: 'agTextColumnFilter',
    },
    {
      field: 'refAsli',
      headerName: 'REF ASLI',
      width: obtenerAnchoColumna('refAsli'),
      pinned: 'left',
      filter: 'agTextColumnFilter',
      editable: false, // No editable (campo clave)
      cellRenderer: (params: ICellRendererParams) => {
        const registro = params.data as Registro;
        const tipoIngreso = registro.tipoIngreso;
        let textColor = '#22c55e'; // green-600

        if (tipoIngreso === 'EARLY') {
          textColor = '#0891b2'; // cyan-600
        } else if (tipoIngreso === 'LATE') {
          textColor = '#eab308'; // yellow-600
        } else if (tipoIngreso === 'EXTRA LATE') {
          textColor = '#ef4444'; // red-600
        }

        return (
          <span style={{ color: textColor, fontWeight: 'bold' }}>
            {params.value}
          </span>
        );
      },
    },
    {
      field: 'ejecutivo',
      headerName: 'Ejecutivo',
      width: obtenerAnchoColumna('ejecutivo'),
      filter: 'agTextColumnFilter',
      filterParams: {
        values: ejecutivosUnicos,
        caseSensitive: false,
        trimInput: true,
      },
    },
    {
      field: 'shipper',
      headerName: 'Cliente',
      width: obtenerAnchoColumna('shipper'),
      filter: 'agTextColumnFilter',
      filterParams: {
        values: clientesUnicos,
      },
    },
    {
      field: 'booking',
      headerName: 'Booking',
      width: obtenerAnchoColumna('booking'),
      filter: 'agTextColumnFilter',
    },
    {
      field: 'contenedor',
      headerName: 'Contenedor',
      width: obtenerAnchoColumna('contenedor'),
      filter: 'agTextColumnFilter',
      valueFormatter: (params) => {
        if (Array.isArray(params.value)) {
          return params.value.join(', ');
        }
        return params.value || '';
      },
    },
    {
      field: 'naviera',
      headerName: 'Naviera',
      width: obtenerAnchoColumna('naviera'),
      filter: 'agTextColumnFilter',
      filterParams: {
        values: navierasUnicas,
      },
    },
    {
      field: 'naveInicial',
      headerName: 'Nave',
      width: obtenerAnchoColumna('naveInicial'),
      filter: 'agTextColumnFilter',
      valueFormatter: (params) => {
        let value = params.value || '';
        const registro = params.data as Registro;
        if (registro.viaje) {
          value = `${value} [${registro.viaje}]`;
        }
        return value;
      },
    },
    {
      field: 'viaje',
      headerName: 'Viaje',
      valueGetter: (params) => {
        // Primero intentar obtener el viaje directamente del registro
        if (params.data?.viaje) {
          return params.data.viaje;
        }
        // Si no existe, extraerlo de la columna naveInicial que tiene formato "NAVE [VIAJE]"
        const naveInicial = params.data?.naveInicial || '';
        const match = naveInicial.match(/\[(.+?)\]/);
        return match ? match[1] : '';
      },
      width: obtenerAnchoColumna('viaje'),
      filter: 'agTextColumnFilter',
    },
    {
      field: 'especie',
      headerName: 'Especie',
      width: obtenerAnchoColumna('especie'),
      filter: 'agTextColumnFilter',
      filterParams: {
        values: especiesUnicas,
      },
    },
    {
      field: 'pol',
      headerName: 'POL',
      width: obtenerAnchoColumna('pol'),
      filter: 'agTextColumnFilter',
      filterParams: {
        values: polsUnicos,
      },
    },
    {
      field: 'pod',
      headerName: 'POD',
      width: obtenerAnchoColumna('pod'),
      filter: 'agTextColumnFilter',
      filterParams: {
        values: destinosUnicos,
      },
    },
    {
      field: 'deposito',
      headerName: 'Depósito',
      width: obtenerAnchoColumna('deposito'),
      filter: 'agTextColumnFilter',
      filterParams: {
        values: depositosUnicos,
      },
    },
    {
      field: 'etd',
      headerName: 'ETD',
      width: obtenerAnchoColumna('etd'),
      filter: 'agDateColumnFilter',
      valueFormatter: (params) => {
        if (!params.value) return '';
        return new Date(params.value).toLocaleDateString('es-CL');
      },
    },
    {
      field: 'eta',
      headerName: 'ETA',
      width: obtenerAnchoColumna('eta'),
      filter: 'agDateColumnFilter',
      valueFormatter: (params) => {
        if (!params.value) return '';
        return new Date(params.value).toLocaleDateString('es-CL');
      },
    },
    {
      field: 'tt',
      headerName: 'TT',
      width: obtenerAnchoColumna('tt'),
      filter: 'agNumberColumnFilter',
      valueGetter: (params: any) => {
        // Si tt tiene un valor, usarlo
        if (params.data.tt !== null && params.data.tt !== undefined) {
          return params.data.tt;
        }
        // Si no, intentar calcularlo desde etd y eta
        const etd = params.data.etd;
        const eta = params.data.eta;
        if (etd && eta) {
          return calculateTransitTime(etd, eta);
        }
        return null;
      },
      valueFormatter: (params: any) => {
        return params.value !== null && params.value !== undefined ? params.value.toString() : '';
      },
    },
    {
      field: 'estado',
      headerName: 'Estado',
      width: obtenerAnchoColumna('estado'),
      filter: 'agTextColumnFilter',
      filterParams: {
        values: estadosUnicos,
      },
      cellRenderer: (params: ICellRendererParams) => {
        const estado = params.value;
        const colors: Record<string, string> = {
          'CONFIRMADO': '#22c55e',
          'PENDIENTE': '#f59e0b',
          'CANCELADO': '#ef4444',
        };
        return (
          <span style={{ color: colors[estado] || '#666', fontWeight: 'bold' }}>
            {estado}
          </span>
        );
      },
    },
    {
      field: 'flete',
      headerName: 'Flete',
      width: obtenerAnchoColumna('flete'),
      filter: 'agTextColumnFilter',
      filterParams: {
        values: fletesUnicos,
      },
    },
    {
      field: 'tipoIngreso',
      headerName: 'Tipo Ingreso',
      width: obtenerAnchoColumna('tipoIngreso'),
      filter: 'agTextColumnFilter',
      filterParams: {
        values: tipoIngresoUnicos,
      },
      cellRenderer: (params: ICellRendererParams) => {
        const tipoIngreso = params.value;
        let textColor = '#22c55e'; // green-600

        if (tipoIngreso === 'EARLY') {
          textColor = '#0891b2'; // cyan-600
        } else if (tipoIngreso === 'LATE') {
          textColor = '#eab308'; // yellow-600
        } else if (tipoIngreso === 'EXTRA LATE') {
          textColor = '#ef4444'; // red-600
        }

        return (
          <span style={{ color: textColor, fontWeight: 'bold' }}>
            {tipoIngreso}
          </span>
        );
      },
    },
    {
      field: 'temperatura',
      headerName: 'Temp (°C)',
      width: obtenerAnchoColumna('temperatura'),
      filter: 'agNumberColumnFilter',
      valueFormatter: (params) => {
        return params.value ? `${params.value}°C` : '';
      },
    },
    {
      field: 'cbm',
      headerName: 'CBM',
      width: obtenerAnchoColumna('cbm'),
      filter: 'agNumberColumnFilter',
    },
    {
      field: 'ingresado',
      headerName: 'Ingresado',
      width: obtenerAnchoColumna('ingresado'),
      filter: 'agDateColumnFilter',
      sort: 'desc', // Ordenar por defecto: más recientes primero
      valueFormatter: (params) => {
        if (!params.value) return '';
        return new Date(params.value).toLocaleDateString('es-CL');
      },
    },
    {
      field: 'usuario',
      headerName: 'Usuario',
      width: obtenerAnchoColumna('usuario'),
      filter: 'agTextColumnFilter',
    },
    {
      field: 'clienteAbr',
      headerName: 'Cliente Abr',
      width: obtenerAnchoColumna('clienteAbr'),
      filter: 'agTextColumnFilter',
      hide: true, // Ocultar esta columna
    },
    {
      field: 'ct',
      headerName: 'CT',
      width: obtenerAnchoColumna('ct'),
      filter: 'agTextColumnFilter',
    },
    {
      field: 'co2',
      headerName: 'CO2',
      width: obtenerAnchoColumna('co2'),
      filter: 'agNumberColumnFilter',
    },
    {
      field: 'o2',
      headerName: 'O2',
      width: obtenerAnchoColumna('o2'),
      filter: 'agNumberColumnFilter',
    },
    {
      field: 'tratamientoFrio',
      headerName: 'Tratamiento Frío',
      width: obtenerAnchoColumna('tratamientoFrio'),
      filter: 'agTextColumnFilter',
    },
    {
      field: 'tipoAtmosfera',
      headerName: 'Tipo Atmósfera',
      width: obtenerAnchoColumna('tipoAtmosfera'),
      filter: 'agTextColumnFilter',
    },
    {
      field: 'roleadaDesde',
      headerName: 'Roleada Desde',
      width: obtenerAnchoColumna('roleadaDesde'),
      filter: 'agTextColumnFilter',
    },
    {
      field: 'ingresoStacking',
      headerName: 'Ingreso Stacking',
      width: obtenerAnchoColumna('ingresoStacking'),
      filter: 'agDateColumnFilter',
      valueFormatter: (params) => {
        if (!params.value) return '';
        return new Date(params.value).toLocaleDateString('es-CL');
      },
    },
    {
      field: 'numeroBl',
      headerName: 'Número BL',
      width: obtenerAnchoColumna('numeroBl'),
      filter: 'agTextColumnFilter',
    },
    {
      field: 'estadoBl',
      headerName: 'Estado BL',
      width: obtenerAnchoColumna('estadoBl'),
      filter: 'agTextColumnFilter',
    },
    {
      field: 'contrato',
      headerName: 'Contrato',
      width: obtenerAnchoColumna('contrato'),
      filter: 'agTextColumnFilter',
    },
    {
      field: 'semanaIngreso',
      headerName: 'Semana Ingreso',
      width: obtenerAnchoColumna('semanaIngreso'),
      filter: 'agNumberColumnFilter',
      valueGetter: (params: any) => {
        // Si ya tiene un valor, usarlo
        if (params.data.semanaIngreso !== null && params.data.semanaIngreso !== undefined) {
          return params.data.semanaIngreso;
        }
        // Si no, calcularlo desde la fecha de ingreso
        const ingresado = params.data.ingresado;
        if (!ingresado) return null;
        
        const date = new Date(ingresado);
        if (isNaN(date.getTime())) return null;
        
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
      },
    },
    {
      field: 'mesIngreso',
      headerName: 'Mes Ingreso',
      width: obtenerAnchoColumna('mesIngreso'),
      filter: 'agNumberColumnFilter',
      hide: true,
    },
    {
      field: 'semanaZarpe',
      headerName: 'Semana Zarpe',
      width: obtenerAnchoColumna('semanaZarpe'),
      filter: 'agNumberColumnFilter',
      valueGetter: (params: any) => {
        // Si ya tiene un valor, usarlo
        if (params.data.semanaZarpe !== null && params.data.semanaZarpe !== undefined) {
          return params.data.semanaZarpe;
        }
        // Si no, calcularlo desde ETD
        const etd = params.data.etd;
        if (!etd) return null;
        
        const date = new Date(etd);
        if (isNaN(date.getTime())) return null;
        
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
      },
    },
    {
      field: 'mesZarpe',
      headerName: 'Mes Zarpe',
      width: obtenerAnchoColumna('mesZarpe'),
      filter: 'agNumberColumnFilter',
      hide: true,
    },
    {
      field: 'semanaArribo',
      headerName: 'Semana Arribo',
      width: obtenerAnchoColumna('semanaArribo'),
      filter: 'agNumberColumnFilter',
      hide: true,
    },
    {
      field: 'mesArribo',
      headerName: 'Mes Arribo',
      width: obtenerAnchoColumna('mesArribo'),
      filter: 'agNumberColumnFilter',
      hide: true,
    },
    {
      field: 'facturacion',
      headerName: 'Facturación',
      width: obtenerAnchoColumna('facturacion'),
      filter: 'agTextColumnFilter',
    },
    {
      field: 'bookingPdf',
      headerName: 'Booking PDF',
      width: obtenerAnchoColumna('bookingPdf'),
      filter: 'agTextColumnFilter',
    },
    {
      field: 'comentario',
      headerName: 'Comentario',
      width: obtenerAnchoColumna('comentario'),
      filter: 'agTextColumnFilter',
    },
    {
      field: 'observacion',
      headerName: 'Observación',
      width: obtenerAnchoColumna('observacion'),
      filter: 'agTextColumnFilter',
    },
    {
      field: 'temporada',
      headerName: 'Temporada',
      width: obtenerAnchoColumna('temporada'),
      filter: 'agTextColumnFilter',
      filterParams: {
        values: temporadasUnicas,
        caseSensitive: false,
        trimInput: true,
      },
    },
  ], [navierasUnicas, ejecutivosUnicos, especiesUnicas, clientesUnicos, polsUnicos, destinosUnicos, depositosUnicos, fletesUnicos, estadosUnicos, tipoIngresoUnicos, temporadasUnicas]);

  // Función para cargar el orden de columnas guardado desde Supabase
  const loadColumnOrderFromSupabase = useCallback(async () => {
    if (!gridApi || !user) {
      return;
    }

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('preferencias_usuario')
        .select('valor')
        .eq('usuario_id', user.id)
        .eq('pagina', 'registros')
        .eq('clave', 'column-order')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading column order from Supabase:', error);
        return;
      }

      const currentState = gridApi.getColumnState();
      
      // Crear mapa de anchos desde el archivo de configuración
      const configWidths = new Map<string, number>();
      columnDefs.forEach((col: any) => {
        if (col.field && col.width) {
          configWidths.set(col.field, col.width);
        }
      });

      // Si NO hay orden guardado, solo aplicar anchos del config
      if (!data || !data.valor) {
        const updatedState = currentState.map((col: any) => {
          const configWidth = configWidths.get(col.colId);
          if (configWidth) {
            return { ...col, width: configWidth };
          }
          return col;
        });
        
        gridApi.applyColumnState({
          state: updatedState,
          defaultState: { sort: null },
          applyOrder: false
        });
        return;
      }

      // Si HAY orden guardado, aplicar orden pero con anchos del config
      try {
        const savedColumnState = data.valor as any[];
        const savedColIds = new Set(savedColumnState.map((col: any) => col.colId));
        const mergedState: any[] = [];
        
        // Agregar columnas guardadas en el orden guardado, con anchos del config
        savedColumnState.forEach((savedCol: any) => {
          const { sort, sortIndex, width, ...rest } = savedCol;
          const configWidth = configWidths.get(rest.colId) || 120;
          rest.width = configWidth;
          mergedState.push(rest);
        });
        
        // Agregar columnas nuevas (que no estaban guardadas)
        currentState.forEach((currentCol: any) => {
          if (!savedColIds.has(currentCol.colId)) {
            const { sort, sortIndex, ...rest } = currentCol;
            const configWidth = configWidths.get(rest.colId) || 120;
            rest.width = configWidth;
            mergedState.push(rest);
          }
        });
        
        gridApi.applyColumnState({
          state: mergedState,
          defaultState: { sort: null },
          applyOrder: true
        });
      } catch (parseError) {
        console.error('Error parsing column state:', parseError);
      }
    } catch (error) {
      console.error('Error loading column order:', error);
    }
  }, [gridApi, user, columnDefs]);

  // Función para cargar el orden guardado desde Supabase
  const loadSortOrderFromSupabase = useCallback(async () => {
    if (!gridApi || !user) return;

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('preferencias_usuario')
        .select('valor')
        .eq('usuario_id', user.id)
        .eq('pagina', 'registros')
        .eq('clave', 'sort-order')
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error loading sort order from Supabase:', error);
        return;
      }

      if (data && data.valor) {
        try {
          const sortModel = data.valor as any[];
          gridApi.applyColumnState({
            state: sortModel,
            defaultState: { sort: null }
          });
        } catch (parseError) {
          console.error('Error parsing sort model:', parseError);
        }
      }
    } catch (error) {
      console.error('Error loading sort order:', error);
    }
  }, [gridApi, user]);

  const onGridReady = async (params: GridReadyEvent) => {
    setGridApi(params.api);
  };

  // Cargar preferencias cuando gridApi, user y rowData estén listos
  useEffect(() => {
    if (!gridApi || !user || rowData.length === 0 || preferencesLoadedRef.current) {
      return;
    }

    // Marcar como cargado para evitar múltiples cargas
    preferencesLoadedRef.current = true;

    // Esperar un momento para asegurar que el grid esté completamente renderizado
    const timeoutId = setTimeout(async () => {
      try {
        // Primero cargar el orden de columnas
        await loadColumnOrderFromSupabase();
        // Luego cargar el ordenamiento (con un pequeño delay para asegurar que el orden de columnas se aplicó primero)
        setTimeout(() => {
          loadSortOrderFromSupabase();
        }, 100);
      } catch (error) {
        console.error('Error loading preferences:', error);
        preferencesLoadedRef.current = false; // Permitir reintentar si falla
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [gridApi, user, rowData.length, loadColumnOrderFromSupabase, loadSortOrderFromSupabase]);

  // Configurar el comportamiento del header checkbox para toggle después de que el grid esté listo
  useEffect(() => {
    if (!gridApi) return;

    // Buscar el header checkbox en el DOM después de un pequeño delay para asegurar que esté renderizado
    const setupHeaderCheckbox = () => {
      const gridElement = document.querySelector('.ag-theme-quartz, .ag-theme-quartz-dark');
      if (!gridElement) return;

      const headerCheckbox = gridElement.querySelector('.ag-header-select-all input[type="checkbox"]') as HTMLInputElement;
      if (!headerCheckbox) return;

      // Remover listeners anteriores si existen
      const newCheckbox = headerCheckbox.cloneNode(true) as HTMLInputElement;
      headerCheckbox.parentNode?.replaceChild(newCheckbox, headerCheckbox);

      newCheckbox.addEventListener('click', (e: MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();

        // Contar filas visibles y seleccionadas
        let visibleCount = 0;
        let selectedVisibleCount = 0;

        gridApi.forEachNodeAfterFilter((node: any) => {
          visibleCount++;
          if (node.isSelected()) {
            selectedVisibleCount++;
          }
        });

        const allVisibleSelected = visibleCount > 0 && selectedVisibleCount === visibleCount;

        if (allVisibleSelected) {
          // Si todo está seleccionado, deseleccionar todo
          gridApi.forEachNodeAfterFilter((node: any) => {
            if (node.isSelected()) {
              node.setSelected(false);
            }
          });
        } else {
          // Si no todo está seleccionado, seleccionar todo
          gridApi.forEachNodeAfterFilter((node: any) => {
            if (!node.isSelected()) {
              node.setSelected(true);
            }
          });
        }
      }, true);
    };

    // Intentar configurar inmediatamente y también después de un pequeño delay
    setupHeaderCheckbox();
    const timeoutId = setTimeout(setupHeaderCheckbox, 100);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [gridApi, rowData]);

  // Guardar el orden de columnas cuando cambie (SOLO posición, NO anchos)
  const onColumnMoved = useCallback(async () => {
    if (!gridApi || !user) return;
    
    try {
      const supabase = createClient();
      
      // Obtener el estado de las columnas
      const columnState = gridApi.getColumnState();
      
      // Guardar SOLO el orden (colId), eliminando anchos
      const columnOrderOnly = columnState.map((col: any) => ({
        colId: col.colId,
        hide: col.hide,
        pinned: col.pinned,
        // NO guardar width
      }));
      
      const { error } = await supabase
        .from('preferencias_usuario')
        .upsert({
          usuario_id: user.id,
          pagina: 'registros',
          clave: 'column-order',
          valor: columnOrderOnly,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'usuario_id,pagina,clave'
        });

      if (error) {
        console.error('Error saving column order to Supabase:', error);
      }
    } catch (error) {
      console.error('Error saving column order:', error);
    }
  }, [gridApi, user]);

  // Guardar el orden cuando cambie
  // Guardar el orden cuando cambie en Supabase
  const onSortChanged = useCallback(async () => {
    if (!gridApi || !user) return;
    
    const sortModel = gridApi.getColumnState()
      .filter((col: any) => col.sort !== null && col.sort !== undefined)
      .map((col: any) => ({
        colId: col.colId,
        sort: col.sort,
        sortIndex: col.sortIndex
      }));
    
    try {
      const supabase = createClient();
      
      if (sortModel.length > 0) {
        // Guardar o actualizar la preferencia
        const { error } = await supabase
          .from('preferencias_usuario')
          .upsert({
            usuario_id: user.id,
            pagina: 'registros',
            clave: 'sort-order',
            valor: sortModel,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'usuario_id,pagina,clave'
          });

        if (error) {
          console.error('Error saving sort order to Supabase:', error);
        }
      } else {
        // Si no hay orden, eliminar la preferencia
        const { error } = await supabase
          .from('preferencias_usuario')
          .delete()
          .eq('usuario_id', user.id)
          .eq('pagina', 'registros')
          .eq('clave', 'sort-order');

        if (error) {
          console.error('Error deleting sort order from Supabase:', error);
        }
      }
    } catch (error) {
      console.error('Error saving sort order:', error);
    }
  }, [gridApi, user]);

  // Ref para rastrear el estado anterior de selección
  const previousSelectionRef = useRef<{ count: number; allSelected: boolean }>({ count: 0, allSelected: false });
  const isProcessingHeaderClickRef = useRef(false);

  const onSelectionChanged = () => {
    if (!gridApi || isProcessingHeaderClickRef.current) return;
    
    // Contar filas visibles y seleccionadas
    let visibleCount = 0;
    let selectedVisibleCount = 0;
    const visibleSelectedRows: Registro[] = [];
    const visibleSelectedIds = new Set<string>();
    
    gridApi.forEachNodeAfterFilter((node: any) => {
      visibleCount++;
      if (node.isSelected() && node.data) {
        selectedVisibleCount++;
        visibleSelectedRows.push(node.data);
        if (node.data.id && typeof node.data.id === 'string') {
          visibleSelectedIds.add(node.data.id);
        }
      }
    });
    
    const allVisibleSelected = visibleCount > 0 && selectedVisibleCount === visibleCount;
    const previousState = previousSelectionRef.current;
    
    // Detectar si se hizo clic en el header checkbox cuando todo estaba seleccionado
    // Si antes todo estaba seleccionado y ahora no hay ninguna seleccionada, fue un clic para deseleccionar
    if (previousState.allSelected && selectedVisibleCount === 0 && visibleCount > 0) {
      // Ya está deseleccionado, solo actualizar el estado
      setSelectedRows(new Set());
      setSelectedRegistros([]);
      previousSelectionRef.current = { count: 0, allSelected: false };
      return;
    }
    
    // Si todo está seleccionado y el usuario hace clic en el header checkbox de nuevo,
    // AG Grid intentará deseleccionar todo. Necesitamos interceptar esto.
    // Pero como AG Grid ya procesó la selección, necesitamos verificar el estado anterior.
    
    // Deseleccionar cualquier fila que no esté visible (filtrada)
    gridApi.forEachNode((node: any) => {
      if (node.isSelected()) {
        const nodeId = node.data?.id;
        if (nodeId && typeof nodeId === 'string') {
          if (!visibleSelectedIds.has(nodeId)) {
            // La fila está seleccionada pero no pasa los filtros, deseleccionarla
            node.setSelected(false);
          }
        }
      }
    });
    
    // Actualizar el estado
    const selectedIdsArray = Array.from(visibleSelectedIds);
    const selectedIds = new Set<string>(selectedIdsArray);
    setSelectedRows(selectedIds);
    setSelectedRegistros(visibleSelectedRows);
    
    // Actualizar el ref con el estado actual
    previousSelectionRef.current = {
      count: selectedVisibleCount,
      allSelected: allVisibleSelected
    };
  };


  // Función para obtener el estilo de la fila según el estado
  const getRowStyle = useCallback((params: any) => {
    const estado = params.data?.estado;
    if (!estado) return undefined;

    if (theme === 'dark') {
      if (estado === 'CANCELADO') {
        return { backgroundColor: 'rgba(220, 38, 38, 0.3)', color: '#fca5a5' };
      }
      if (estado === 'PENDIENTE') {
        return { backgroundColor: 'rgba(234, 179, 8, 0.3)', color: '#fde047' };
      }
    } else {
      if (estado === 'CANCELADO') {
        return { backgroundColor: 'rgba(254, 226, 226, 0.8)', color: '#991b1b' };
      }
      if (estado === 'PENDIENTE') {
        return { backgroundColor: 'rgba(254, 249, 195, 0.8)', color: '#854d0e' };
      }
    }
    return undefined;
  }, [theme]);

  const handleExportReport = async (tipo: TipoReporte) => {
    if (selectedRegistros.length === 0) {
      showError('Por favor, selecciona al menos un registro para exportar');
      return;
    }

    try {
      setShowExportDropdown(false);
      const buffer = await generarReporte(tipo, selectedRegistros);
      const nombreReporte = tipo === 'reserva-confirmada' 
        ? 'Reserva_Confirmada' 
        : tipo === 'zarpe' 
        ? 'Informe_Zarpe' 
        : tipo === 'arribo'
        ? 'Informe_Arribo'
        : tipo === 'booking-fee'
        ? 'Booking_Fee'
        : 'Reporte';
      descargarExcel(buffer, nombreReporte);
      success(`Reporte ${nombreReporte} exportado exitosamente`);
    } catch (error) {
      console.error('Error al generar reporte:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      showError(`Error al generar el reporte: ${errorMessage}`);
    }
  };

  const handleRefreshData = () => {
    loadRegistros();
  };

  const handleToggleFiltersPanel = () => {
    setShowFiltersPanel(!showFiltersPanel);
  };

  // Calcular opciones filtradas basadas en los filtros ya seleccionados
  const getFilteredOptions = useMemo(() => {
    let filteredData = [...rowData];

    // Aplicar filtros en cascada según los valores seleccionados
    if (filterPanelValues.ejecutivo) {
      filteredData = filteredData.filter(r => r.ejecutivo === filterPanelValues.ejecutivo);
    }
    if (filterPanelValues.shipper) {
      filteredData = filteredData.filter(r => r.shipper === filterPanelValues.shipper);
    }
    if (filterPanelValues.naviera) {
      filteredData = filteredData.filter(r => r.naviera === filterPanelValues.naviera);
    }
    if (filterPanelValues.especie) {
      filteredData = filteredData.filter(r => r.especie === filterPanelValues.especie);
    }
    if (filterPanelValues.pol) {
      filteredData = filteredData.filter(r => r.pol === filterPanelValues.pol);
    }
    if (filterPanelValues.pod) {
      filteredData = filteredData.filter(r => r.pod === filterPanelValues.pod);
    }
    if (filterPanelValues.deposito) {
      filteredData = filteredData.filter(r => r.deposito === filterPanelValues.deposito);
    }
    if (filterPanelValues.estado) {
      filteredData = filteredData.filter(r => r.estado === filterPanelValues.estado);
    }
    if (filterPanelValues.tipoIngreso) {
      filteredData = filteredData.filter(r => r.tipoIngreso === filterPanelValues.tipoIngreso);
    }
    if (filterPanelValues.flete) {
      filteredData = filteredData.filter(r => r.flete === filterPanelValues.flete);
    }
    if (filterPanelValues.temporada) {
      filteredData = filteredData.filter(r => r.temporada === filterPanelValues.temporada);
    }

    // Extraer valores únicos de los datos filtrados
    return {
      ejecutivos: [...new Set(filteredData.map(r => r.ejecutivo).filter(Boolean))].sort(),
      clientes: [...new Set(filteredData.map(r => r.shipper).filter(Boolean))].sort(),
      navieras: [...new Set(filteredData.map(r => r.naviera).filter(Boolean))].sort(),
      especies: [...new Set(filteredData.map(r => r.especie).filter(Boolean))].sort(),
      pols: [...new Set(filteredData.map(r => r.pol).filter(Boolean))].sort(),
      pods: [...new Set(filteredData.map(r => r.pod).filter(Boolean))].sort(),
      depositos: [...new Set(filteredData.map(r => r.deposito).filter(Boolean))].sort(),
      estados: [...new Set(filteredData.map(r => r.estado).filter(Boolean))].sort(),
      tiposIngreso: [...new Set(filteredData.map(r => r.tipoIngreso).filter(Boolean))].sort(),
      fletes: [...new Set(filteredData.map(r => r.flete).filter(Boolean))].sort(),
      temporadas: [...new Set(filteredData.map(r => r.temporada).filter((t): t is string => Boolean(t)))].sort(),
    };
  }, [rowData, filterPanelValues]);

  const handleApplyFilters = () => {
    if (!gridApi) return;

    const filterModel: any = {};

    // Aplicar filtros solo si tienen valor
    if (filterPanelValues.ejecutivo) {
      filterModel.ejecutivo = {
        type: 'contains',
        filter: filterPanelValues.ejecutivo,
      };
    }
    if (filterPanelValues.shipper) {
      filterModel.shipper = {
        type: 'contains',
        filter: filterPanelValues.shipper,
      };
    }
    if (filterPanelValues.naviera) {
      filterModel.naviera = {
        type: 'contains',
        filter: filterPanelValues.naviera,
      };
    }
    if (filterPanelValues.especie) {
      filterModel.especie = {
        type: 'contains',
        filter: filterPanelValues.especie,
      };
    }
    if (filterPanelValues.pol) {
      filterModel.pol = {
        type: 'contains',
        filter: filterPanelValues.pol,
      };
    }
    if (filterPanelValues.pod) {
      filterModel.pod = {
        type: 'contains',
        filter: filterPanelValues.pod,
      };
    }
    if (filterPanelValues.deposito) {
      filterModel.deposito = {
        type: 'contains',
        filter: filterPanelValues.deposito,
      };
    }
    if (filterPanelValues.estado) {
      filterModel.estado = {
        type: 'equals',
        filter: filterPanelValues.estado,
      };
    }
    if (filterPanelValues.tipoIngreso) {
      filterModel.tipoIngreso = {
        type: 'equals',
        filter: filterPanelValues.tipoIngreso,
      };
    }
    if (filterPanelValues.flete) {
      filterModel.flete = {
        type: 'equals',
        filter: filterPanelValues.flete,
      };
    }
    if (filterPanelValues.temporada) {
      filterModel.temporada = {
        type: 'equals',
        filter: filterPanelValues.temporada,
      };
    }

    gridApi.setFilterModel(Object.keys(filterModel).length > 0 ? filterModel : null);
    success('Filtros aplicados');
  };

  const handleFilterChange = (field: keyof typeof filterPanelValues, value: string) => {
    setFilterPanelValues(prev => {
      const newValues = { ...prev, [field]: value };
      
      // Calcular opciones filtradas con los nuevos valores para validar dependencias
      let filteredData = [...rowData];
      
      // Aplicar todos los filtros excepto el que se está cambiando
      if (field !== 'ejecutivo' && newValues.ejecutivo) {
        filteredData = filteredData.filter(r => r.ejecutivo === newValues.ejecutivo);
      }
      if (field !== 'shipper' && newValues.shipper) {
        filteredData = filteredData.filter(r => r.shipper === newValues.shipper);
      }
      if (field !== 'naviera' && newValues.naviera) {
        filteredData = filteredData.filter(r => r.naviera === newValues.naviera);
      }
      if (field !== 'especie' && newValues.especie) {
        filteredData = filteredData.filter(r => r.especie === newValues.especie);
      }
      if (field !== 'pol' && newValues.pol) {
        filteredData = filteredData.filter(r => r.pol === newValues.pol);
      }
      if (field !== 'pod' && newValues.pod) {
        filteredData = filteredData.filter(r => r.pod === newValues.pod);
      }
      if (field !== 'deposito' && newValues.deposito) {
        filteredData = filteredData.filter(r => r.deposito === newValues.deposito);
      }
      if (field !== 'estado' && newValues.estado) {
        filteredData = filteredData.filter(r => r.estado === newValues.estado);
      }
      if (field !== 'tipoIngreso' && newValues.tipoIngreso) {
        filteredData = filteredData.filter(r => r.tipoIngreso === newValues.tipoIngreso);
      }
      if (field !== 'flete' && newValues.flete) {
        filteredData = filteredData.filter(r => r.flete === newValues.flete);
      }
      if (field !== 'temporada' && newValues.temporada) {
        filteredData = filteredData.filter(r => r.temporada === newValues.temporada);
      }
      
      // Aplicar el nuevo filtro
      if (value) {
        filteredData = filteredData.filter(r => (r as any)[field] === value);
      }
      
      // Validar y limpiar filtros dependientes si ya no son válidos
      if (field === 'ejecutivo') {
        // Si cambió el ejecutivo, verificar si el cliente actual sigue siendo válido
        if (newValues.shipper && !filteredData.some(r => r.shipper === newValues.shipper)) {
          newValues.shipper = '';
        }
      }
      
      return newValues;
    });
  };

  const handleClearAllFilters = () => {
    if (gridApi) {
      gridApi.setFilterModel(null);
      setFilterPanelValues({
        ejecutivo: '',
        shipper: '',
        naviera: '',
        especie: '',
        pol: '',
        pod: '',
        deposito: '',
        estado: '',
        tipoIngreso: '',
        flete: '',
        temporada: '',
      });
      setSearchText('');
      success('Filtros limpiados');
    }
  };

  const handleClearSelection = () => {
    if (gridApi) {
      gridApi.deselectAll();
      setSelectedRows(new Set());
      setSelectedRegistros([]);
    }
  };

  // Manejar clic derecho en la fila
  const handleRowContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    if (selectedRegistros.length > 0) {
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        visible: true,
      });
    }
  };

  // Cerrar menú contextual al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu.visible) {
        setContextMenu({ ...contextMenu, visible: false });
      }
    };

    if (contextMenu.visible) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [contextMenu.visible]);

  const handleBulkEditNaveViaje = () => {
    if (selectedRegistros.length > 0) {
      setShowEditNaveViajeModal(true);
    }
    setContextMenu({ ...contextMenu, visible: false });
  };

  const handleCopyReserva = () => {
    if (selectedRegistros.length > 0) {
      // Copiar el primer registro seleccionado
      setCopiedRegistro(selectedRegistros[0]);
      setShowAddModal(true);
    }
    setContextMenu({ ...contextMenu, visible: false });
  };

  const handleDeleteSelectedRows = async () => {
    if (selectedRegistros.length === 0) return;

    const confirmDelete = window.confirm(
      `¿Estás seguro de eliminar ${selectedRegistros.length} registro${selectedRegistros.length > 1 ? 's' : ''}?`
    );

    if (!confirmDelete) {
      setContextMenu({ ...contextMenu, visible: false });
      return;
    }

    try {
      const supabase = createClient();
      const recordIds = selectedRegistros.map(r => r.id).filter((id): id is string => Boolean(id));

      const { error } = await supabase
        .from('registros')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: user?.email || 'unknown',
        })
        .in('id', recordIds);

      if (error) {
        console.error('Error deleting records:', error);
        alert('Error al eliminar los registros');
        return;
      }

      // Recargar datos
      await loadRegistros();
      await loadTrashCount();
      handleClearSelection();
      alert(`${selectedRegistros.length} registro${selectedRegistros.length > 1 ? 's' : ''} eliminado${selectedRegistros.length > 1 ? 's' : ''} correctamente`);
    } catch (error) {
      console.error('Error deleting records:', error);
      alert('Error al eliminar los registros');
    } finally {
      setContextMenu({ ...contextMenu, visible: false });
    }
  };

  const handleBulkSaveNaveViaje = async (nave: string, viaje: string, records: Registro[]) => {
    try {
      const supabase = createClient();
      const recordIds = records.map(r => r.id).filter((id): id is string => Boolean(id));

      if (recordIds.length === 0) return;

      const { error } = await supabase
        .from('registros')
        .update({
          nave_inicial: nave,
          viaje: viaje,
          updated_at: new Date().toISOString(),
        })
        .in('id', recordIds);

      if (error) throw error;

      success(`${records.length} registros actualizados con nave y viaje`);
      handleClearSelection();
      await loadRegistros();
    } catch (error: any) {
      console.error('Error actualizando nave/viaje:', error);
      showError('Error al actualizar nave/viaje: ' + error.message);
    }
  };

  // Verificar si es super admin o admin
  const isSuperAdmin = currentUser?.rol === 'super_admin';
  const isAdmin = currentUser?.rol === 'admin';
  const canAccessAdvancedModules = isSuperAdmin || isAdmin;

  // Configuración del sidebar
  const sidebarSections: SidebarSection[] = [
    {
      title: 'Inicio',
      items: [
        { label: 'Dashboard', id: '/dashboard', icon: LayoutDashboard },
      ],
    },
    {
      title: 'Módulos',
      items: [
        { label: 'Embarques', id: '/registros', isActive: true, icon: Ship },
        { label: 'Transportes', id: '/transportes', icon: Truck },
        { label: 'Documentos', id: '/documentos', icon: FileText },
        ...(currentUser && currentUser.rol !== 'cliente'
          ? [{ label: 'Generar Documentos', id: '/generar-documentos', icon: FileCheck }]
          : []),
        ...(canAccessAdvancedModules
          ? [{ label: 'Seguimiento Marítimo', id: '/dashboard/seguimiento', icon: Globe }]
          : []),
        { label: 'Tracking Movs', id: '/dashboard/tracking', icon: Activity },
        ...(canAccessAdvancedModules
          ? [
            { label: 'Finanzas', id: '/finanzas', icon: DollarSign },
            { label: 'Reportes', id: '/reportes', icon: BarChart3 },
          ]
          : []),
        { label: 'Itinerario', id: '/itinerario', icon: Ship },
        { 
          label: 'Papelera', 
          icon: Trash2, 
          counter: trashCount, 
          tone: 'rose' as const,
          onClick: () => setShowTrashModal(true)
        },
      ],
    },
    ...(canAccessAdvancedModules
      ? [
        {
          title: 'Mantenimiento',
          items: [
            { label: 'Usuarios', id: '/mantenimiento', icon: Users },
          ],
        },
      ]
      : []),
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`flex h-screen overflow-hidden ${theme === 'dark' ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100' : 'bg-gray-50 text-gray-900'}`}>
      {/* Overlay para móvil */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar
        isSidebarCollapsed={isSidebarCollapsed}
        setIsSidebarCollapsed={setIsSidebarCollapsed}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        sections={sidebarSections}
        currentUser={userInfo}
        user={user}
        setShowProfileModal={setShowProfileModal}
      />

      {/* Content Wrapper */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden h-full">
        {/* Botón para expandir sidebar cuando está colapsado */}
        {isSidebarCollapsed && (
          <button
            onClick={() => setIsSidebarCollapsed(false)}
            className={`fixed top-4 left-4 z-50 p-2 rounded-lg shadow-lg border ${
              theme === 'dark' 
                ? 'bg-slate-800 text-slate-200 hover:bg-slate-700 border-slate-700' 
                : 'bg-white text-gray-700 hover:bg-gray-100 border-gray-300'
            }`}
            title="Abrir menú"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className={`fixed inset-0 flex flex-col overflow-hidden ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} ${isSidebarCollapsed ? '' : 'lg:ml-64'}`}>
      {/* Header */}
      <header className={`flex-shrink-0 border-b ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="w-full px-3">
          <div className="flex items-center justify-between h-14">
            <div className="flex-1 flex flex-col items-center justify-center">
              <h1 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                REGISTROS ASLI
              </h1>
              <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                logistica y comercio exterior
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleToggleFiltersPanel}
                disabled={!gridApi}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium transition ${!gridApi
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : showFiltersPanel
                      ? theme === 'dark'
                        ? 'bg-sky-600 hover:bg-sky-700 text-white border border-sky-500'
                        : 'bg-blue-600 hover:bg-blue-700 text-white border border-blue-500'
                      : theme === 'dark'
                        ? 'bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
                  }`}
                title="Abrir panel de filtros"
              >
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">Filtros</span>
              </button>
              <button
                type="button"
                onClick={() => setShowProfileModal(true)}
                className={`flex items-center gap-1.5 sm:gap-2 border px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm transition ${theme === 'dark' 
                  ? 'border-gray-700/60 bg-gray-800/60 text-gray-200 hover:border-blue-500/60 hover:text-blue-200' 
                  : 'border-gray-300 bg-white text-gray-700 hover:border-blue-500 hover:text-blue-700'
                  }`}
                aria-haspopup="dialog"
                title={userInfo?.nombre || user?.user_metadata?.full_name || user?.email || 'Usuario'}
              >
                <UserIcon className="h-4 w-4 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="max-w-[100px] md:max-w-[160px] truncate font-medium text-xs sm:text-sm hidden sm:inline">
                  {userInfo?.nombre || user?.user_metadata?.full_name || user?.email || 'Usuario'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Flex container para aprovechar espacio vertical */}
      <main className="flex-1 flex flex-col overflow-hidden w-full" style={{ minHeight: 0, maxHeight: '100%', overflow: 'hidden' }}>
        {/* Controls - Compacto */}
        <div className={`flex-shrink-0 p-2 border-b ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`} style={{ flexShrink: 0 }}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowAddModal(true)}
                disabled={!canAdd}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium transition ${
                  !canAdd
                    ? 'bg-gray-400 cursor-not-allowed text-gray-200 border border-gray-300'
                    : theme === 'dark'
                    ? 'bg-sky-600 hover:bg-sky-700 text-white border border-sky-500'
                    : 'bg-blue-600 hover:bg-blue-700 text-white border border-blue-500'
                }`}
                title={canAdd ? "Nuevo Registro" : "No tienes permisos para crear registros"}
              >
                <Plus className="h-4 w-4" />
                <span>NUEVO</span>
              </button>
              <div className="relative export-dropdown-container">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowExportDropdown(!showExportDropdown);
                  }}
                  disabled={!canExport}
                  className={`flex items-center space-x-2 px-3 py-1.5 transition-colors text-sm ${
                    !canExport
                      ? 'bg-gray-400 cursor-not-allowed text-gray-200 border border-gray-300'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                  title={canExport ? "Exportar registros" : "No tienes permisos para exportar"}
                >
                  <Download className="w-4 h-4" />
                  <span>EXPORTAR</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showExportDropdown ? 'rotate-180' : ''}`} />
                </button>
                {showExportDropdown && (
                  <div 
                    className={`absolute top-full left-0 mt-1 z-[100] min-w-[220px] border shadow-xl rounded-sm ${
                      theme === 'dark' 
                        ? 'bg-gray-800 border-gray-600' 
                        : 'bg-white border-gray-300'
                    }`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {selectedRegistros.length === 0 ? (
                      <div className={`px-4 py-3 text-sm text-center ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        Selecciona registros para exportar
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExportReport('reserva-confirmada');
                          }}
                          className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b ${
                            theme === 'dark' 
                              ? 'text-gray-200 border-gray-700' 
                              : 'text-gray-700 border-gray-200'
                          }`}
                        >
                          ✅ Reserva Confirmada
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExportReport('zarpe');
                          }}
                          className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b ${
                            theme === 'dark' 
                              ? 'text-gray-200 border-gray-700' 
                              : 'text-gray-700 border-gray-200'
                          }`}
                        >
                          🚢 Informe de Zarpe
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExportReport('arribo');
                          }}
                          className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b ${
                            theme === 'dark' 
                              ? 'text-gray-200 border-gray-700' 
                              : 'text-gray-700 border-gray-200'
                          }`}
                        >
                          ⚓ Informe de Arribo
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExportReport('booking-fee');
                          }}
                          className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                            theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                          }`}
                        >
                          💰 Booking Fee
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
              
              {/* Barra de búsqueda */}
              <div className="relative">
                <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`} />
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => {
                    setSearchText(e.target.value);
                    if (gridApi) {
                      gridApi.setGridOption('quickFilterText', e.target.value);
                    }
                  }}
                  placeholder="Buscar..."
                  className={`w-[200px] pl-9 pr-3 py-1.5 text-sm border transition ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                  }`}
                />
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {/* Botón de vista */}
              <button
                onClick={() => setViewMode(viewMode === 'table' ? 'card' : 'table')}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm border transition ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}
                title={viewMode === 'table' ? 'Vista de tarjetas' : 'Vista de tabla'}
              >
                {viewMode === 'table' ? (
                  <>
                    <LayoutDashboard className="w-4 h-4" />
                    <span className="hidden sm:inline">Tarjetas</span>
                  </>
                ) : (
                  <>
                    <Grid3x3 className="w-4 h-4" />
                    <span className="hidden sm:inline">Tabla</span>
                  </>
                )}
              </button>
              
              <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Total: {rowData.length} registros
              </span>
            </div>
          </div>

          {/* Barra de acciones para filas seleccionadas */}
          {selectedRows.size > 0 && (
            <div className={`mt-2 p-2 border-b flex items-center justify-between ${theme === 'dark' ? 'bg-blue-900/30 border-blue-700' : 'bg-blue-50 border-blue-200'
              }`}>
              <div className="flex items-center space-x-3">
                <span className={`text-sm font-medium ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'
                  }`}>
                  {selectedRows.size} registro{selectedRows.size > 1 ? 's' : ''} seleccionado{selectedRows.size > 1 ? 's' : ''}
                </span>
                <button
                  onClick={handleClearSelection}
                  className={`flex items-center space-x-1 px-2 py-1 rounded text-xs ${theme === 'dark' ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-800'
                    }`}
                >
                  <X className="w-3 h-3" />
                  <span>Limpiar</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Vista de datos - Tabla o Tarjetas */}
        <div className="flex-1" style={{ minHeight: 0, height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {loadingData ? (
            <div className={`flex items-center justify-center h-full ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Cargando registros...</p>
              </div>
            </div>
          ) : viewMode === 'table' ? (
            <div
              className={`h-full w-full ${selectedTheme} ${theme === 'dark' ? 'ag-theme-quartz-dark' : 'ag-theme-quartz'}`}
              style={{
                backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                height: '100%',
                width: '100%'
              }}
            >
              <div onContextMenu={handleRowContextMenu} className="h-full w-full">
                <AgGridReact
                  rowData={rowData}
                  columnDefs={columnDefs}
                  gridOptions={gridOptions}
                  onGridReady={onGridReady}
                  onSelectionChanged={onSelectionChanged}
                  onSortChanged={onSortChanged}
                  onColumnMoved={onColumnMoved}
                  animateRows={true}
                  getRowStyle={getRowStyle}
                  rowHeight={35}
                  headerHeight={70}
                  domLayout="normal"
                />
              </div>
            </div>
          ) : (
            /* Vista de tarjetas */
            <div className={`h-full w-full overflow-y-auto p-4 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {rowData
                  .filter(registro => {
                    if (!searchText) return true;
                    const searchLower = searchText.toLowerCase();
                    return (
                      registro.refAsli?.toLowerCase().includes(searchLower) ||
                      registro.refCliente?.toLowerCase().includes(searchLower) ||
                      registro.shipper?.toLowerCase().includes(searchLower) ||
                      registro.naviera?.toLowerCase().includes(searchLower) ||
                      registro.especie?.toLowerCase().includes(searchLower) ||
                      registro.naveInicial?.toLowerCase().includes(searchLower)
                    );
                  })
                  .map((registro) => (
                    <div
                      key={registro.id}
                      className={`border transition-all ${
                        (canEdit || canDelete) ? 'cursor-pointer hover:shadow-lg' : ''
                      } ${
                        selectedRows.has(registro.id || '')
                          ? theme === 'dark'
                            ? 'bg-sky-900/30 border-sky-500'
                            : 'bg-blue-50 border-blue-500'
                          : theme === 'dark'
                            ? 'bg-gray-800 border-gray-700 hover:border-gray-600'
                            : 'bg-white border-gray-200 hover:border-gray-400'
                      }`}
                      onClick={() => {
                        // Solo permitir selección si tiene permisos
                        if (!canEdit && !canDelete) return;
                        if (!gridApi || !registro.id) return;
                        const node = gridApi.getRowNode(registro.id);
                        if (node) {
                          node.setSelected(!node.isSelected());
                        }
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        // Solo permitir menú contextual si tiene permisos
                        if (!canEdit && !canDelete) return;
                        if (!gridApi || !registro.id) return;
                        const node = gridApi.getRowNode(registro.id);
                        if (node && !node.isSelected()) {
                          gridApi.deselectAll();
                          node.setSelected(true);
                        }
                        setContextMenu({
                          x: e.clientX,
                          y: e.clientY,
                          visible: true,
                        });
                      }}
                    >
                      {/* Header de la tarjeta */}
                      <div className={`px-4 py-3 border-b ${
                        theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
                      }`}>
                        <div className="flex items-center justify-between">
                          <h3 className={`text-lg font-bold ${
                            theme === 'dark' ? 'text-sky-400' : 'text-blue-600'
                          }`}>
                            {registro.refAsli}
                          </h3>
                          {/* Solo mostrar checkbox si el usuario puede seleccionar (Admin/Ejecutivo) */}
                          {(canEdit || canDelete) && (
                            <input
                              type="checkbox"
                              checked={selectedRows.has(registro.id || '')}
                              onChange={() => {}}
                              className="w-4 h-4"
                              onClick={(e) => e.stopPropagation()}
                            />
                          )}
                        </div>
                        <p className={`text-sm mt-1 ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          {registro.refCliente || 'Sin ref. cliente'}
                        </p>
                      </div>

                      {/* Contenido de la tarjeta */}
                      <div className="px-4 py-3 space-y-2">
                        {/* Cliente */}
                        <div className="flex items-start gap-2">
                          <UserIcon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs ${
                              theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                            }`}>
                              Cliente
                            </p>
                            <p className={`text-sm font-medium truncate ${
                              theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                            }`}>
                              {registro.shipper || '-'}
                            </p>
                          </div>
                        </div>

                        {/* Naviera / Nave */}
                        <div className="flex items-start gap-2">
                          <Ship className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs ${
                              theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                            }`}>
                              Naviera / Nave
                            </p>
                            <p className={`text-sm font-medium truncate ${
                              theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                            }`}>
                              {registro.naviera || '-'}
                            </p>
                            <p className={`text-xs truncate ${
                              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              {registro.naveInicial || '-'} {registro.viaje ? `(${registro.viaje})` : ''}
                            </p>
                          </div>
                        </div>

                        {/* Especie */}
                        <div className="flex items-start gap-2">
                          <Globe className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs ${
                              theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                            }`}>
                              Especie
                            </p>
                            <p className={`text-sm font-medium truncate ${
                              theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                            }`}>
                              {registro.especie || '-'}
                            </p>
                          </div>
                        </div>

                        {/* Reserva / Contenedor / Depósito */}
                        <div className={`pt-2 border-t ${
                          theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
                        }`}>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <p className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                                Reserva
                              </p>
                              <p className={`font-medium truncate ${
                                theme === 'dark' ? 'text-gray-300' : 'text-gray-800'
                              }`}>
                                {registro.booking || '-'}
                              </p>
                            </div>
                            <div>
                              <p className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                                Contenedor
                              </p>
                              <p className={`font-medium truncate ${
                                theme === 'dark' ? 'text-gray-300' : 'text-gray-800'
                              }`}>
                                {registro.contenedor || '-'}
                              </p>
                            </div>
                            <div>
                              <p className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                                Depósito
                              </p>
                              <p className={`font-medium truncate ${
                                theme === 'dark' ? 'text-gray-300' : 'text-gray-800'
                              }`}>
                                {registro.deposito || '-'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* ETD / ETA / TT */}
                        <div className={`pt-2 border-t ${
                          theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
                        }`}>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <p className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                                ETD
                              </p>
                              <p className={`font-medium ${
                                theme === 'dark' ? 'text-gray-300' : 'text-gray-800'
                              }`}>
                                {registro.etd ? new Date(registro.etd).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' }) : '-'}
                              </p>
                            </div>
                            <div>
                              <p className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                                ETA
                              </p>
                              <p className={`font-medium ${
                                theme === 'dark' ? 'text-gray-300' : 'text-gray-800'
                              }`}>
                                {registro.eta ? new Date(registro.eta).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' }) : '-'}
                              </p>
                            </div>
                            <div>
                              <p className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                                TT
                              </p>
                              <p className={`font-medium ${
                                theme === 'dark' ? 'text-gray-300' : 'text-gray-800'
                              }`}>
                                {registro.tt ? `${registro.tt}d` : '-'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Ruta y Estado */}
                        <div className={`pt-2 border-t flex items-center justify-between text-xs ${
                          theme === 'dark' ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-500'
                        }`}>
                          <span className="font-medium">{registro.pol || '-'} → {registro.pod || '-'}</span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            registro.estado === 'CONFIRMADO'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : registro.estado === 'PENDIENTE'
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {registro.estado}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Panel lateral de filtros */}
      {showFiltersPanel && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowFiltersPanel(false)}
          />
          {/* Panel slide desde la derecha */}
          <div
            className={`fixed top-0 right-0 h-full w-full max-w-md z-50 transform transition-transform duration-300 ease-in-out ${
              showFiltersPanel ? 'translate-x-0' : 'translate-x-full'
            } ${theme === 'dark' ? 'bg-slate-900 border-l border-slate-700' : 'bg-white border-l border-gray-200'} shadow-2xl`}
          >
            <div className="flex flex-col h-full">
              {/* Header del panel */}
              <div className={`flex items-center justify-between px-4 sm:px-6 py-4 border-b ${
                theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-gray-50'
              }`}>
                <div className="flex items-center gap-3">
                  <Filter className={`w-5 h-5 ${theme === 'dark' ? 'text-sky-400' : 'text-blue-600'}`} />
                  <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-gray-900'}`}>
                    Filtros Avanzados
                  </h2>
                </div>
                <button
                  onClick={() => setShowFiltersPanel(false)}
                  className={`p-2 transition ${theme === 'dark'
                    ? 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                  title="Cerrar panel"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Contenido del panel - Scrollable */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4">
                {/* Ejecutivo */}
                <div className="space-y-2">
                  <label className={`block text-xs sm:text-sm font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>
                    Ejecutivo
                  </label>
                  <select
                    value={filterPanelValues.ejecutivo}
                    onChange={(e) => handleFilterChange('ejecutivo', e.target.value)}
                    className={`w-full border px-3 py-2 text-sm ${theme === 'dark'
                      ? 'border-slate-700 bg-slate-800 text-slate-100'
                      : 'border-gray-300 bg-white text-gray-900'
                    }`}
                  >
                    <option value="">Todos</option>
                    {getFilteredOptions.ejecutivos.map((ejecutivo) => (
                      <option key={ejecutivo} value={ejecutivo}>{ejecutivo}</option>
                    ))}
                  </select>
                </div>

                {/* Cliente */}
                <div className="space-y-2">
                  <label className={`block text-xs sm:text-sm font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>
                    Cliente
                  </label>
                  <select
                    value={filterPanelValues.shipper}
                    onChange={(e) => handleFilterChange('shipper', e.target.value)}
                    className={`w-full border px-3 py-2 text-sm ${theme === 'dark'
                      ? 'border-slate-700 bg-slate-800 text-slate-100'
                      : 'border-gray-300 bg-white text-gray-900'
                    }`}
                    disabled={!filterPanelValues.ejecutivo}
                  >
                    <option value="">Todos</option>
                    {getFilteredOptions.clientes.map((cliente) => (
                      <option key={cliente} value={cliente}>{cliente}</option>
                    ))}
                  </select>
                  {!filterPanelValues.ejecutivo && (
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                      Selecciona un ejecutivo primero
                    </p>
                  )}
                </div>

                {/* Naviera */}
                <div className="space-y-2">
                  <label className={`block text-xs sm:text-sm font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>
                    Naviera
                  </label>
                  <select
                    value={filterPanelValues.naviera}
                    onChange={(e) => handleFilterChange('naviera', e.target.value)}
                    className={`w-full border px-3 py-2 text-sm ${theme === 'dark'
                      ? 'border-slate-700 bg-slate-800 text-slate-100'
                      : 'border-gray-300 bg-white text-gray-900'
                    }`}
                  >
                    <option value="">Todas</option>
                    {getFilteredOptions.navieras.map((naviera) => (
                      <option key={naviera} value={naviera}>{naviera}</option>
                    ))}
                  </select>
                </div>

                {/* Especie */}
                <div className="space-y-2">
                  <label className={`block text-xs sm:text-sm font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>
                    Especie
                  </label>
                  <select
                    value={filterPanelValues.especie}
                    onChange={(e) => handleFilterChange('especie', e.target.value)}
                    className={`w-full border px-3 py-2 text-sm ${theme === 'dark'
                      ? 'border-slate-700 bg-slate-800 text-slate-100'
                      : 'border-gray-300 bg-white text-gray-900'
                    }`}
                  >
                    <option value="">Todas</option>
                    {getFilteredOptions.especies.map((especie) => (
                      <option key={especie} value={especie}>{especie}</option>
                    ))}
                  </select>
                </div>

                {/* POL */}
                <div className="space-y-2">
                  <label className={`block text-xs sm:text-sm font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>
                    POL
                  </label>
                  <select
                    value={filterPanelValues.pol}
                    onChange={(e) => handleFilterChange('pol', e.target.value)}
                    className={`w-full border px-3 py-2 text-sm ${theme === 'dark'
                      ? 'border-slate-700 bg-slate-800 text-slate-100'
                      : 'border-gray-300 bg-white text-gray-900'
                    }`}
                  >
                    <option value="">Todos</option>
                    {getFilteredOptions.pols.map((pol) => (
                      <option key={pol} value={pol}>{pol}</option>
                    ))}
                  </select>
                </div>

                {/* POD */}
                <div className="space-y-2">
                  <label className={`block text-xs sm:text-sm font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>
                    POD
                  </label>
                  <select
                    value={filterPanelValues.pod}
                    onChange={(e) => handleFilterChange('pod', e.target.value)}
                    className={`w-full border px-3 py-2 text-sm ${theme === 'dark'
                      ? 'border-slate-700 bg-slate-800 text-slate-100'
                      : 'border-gray-300 bg-white text-gray-900'
                    }`}
                  >
                    <option value="">Todos</option>
                    {getFilteredOptions.pods.map((pod) => (
                      <option key={pod} value={pod}>{pod}</option>
                    ))}
                  </select>
                </div>

                {/* Depósito */}
                <div className="space-y-2">
                  <label className={`block text-xs sm:text-sm font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>
                    Depósito
                  </label>
                  <select
                    value={filterPanelValues.deposito}
                    onChange={(e) => handleFilterChange('deposito', e.target.value)}
                    className={`w-full border px-3 py-2 text-sm ${theme === 'dark'
                      ? 'border-slate-700 bg-slate-800 text-slate-100'
                      : 'border-gray-300 bg-white text-gray-900'
                    }`}
                  >
                    <option value="">Todos</option>
                    {getFilteredOptions.depositos.map((deposito) => (
                      <option key={deposito} value={deposito}>{deposito}</option>
                    ))}
                  </select>
                </div>

                {/* Estado */}
                <div className="space-y-2">
                  <label className={`block text-xs sm:text-sm font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>
                    Estado
                  </label>
                  <select
                    value={filterPanelValues.estado}
                    onChange={(e) => handleFilterChange('estado', e.target.value)}
                    className={`w-full border px-3 py-2 text-sm ${theme === 'dark'
                      ? 'border-slate-700 bg-slate-800 text-slate-100'
                      : 'border-gray-300 bg-white text-gray-900'
                    }`}
                  >
                    <option value="">Todos</option>
                    {getFilteredOptions.estados.map((estado) => (
                      <option key={estado} value={estado}>{estado}</option>
                    ))}
                  </select>
                </div>

                {/* Tipo de Ingreso */}
                <div className="space-y-2">
                  <label className={`block text-xs sm:text-sm font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>
                    Tipo de Ingreso
                  </label>
                  <select
                    value={filterPanelValues.tipoIngreso}
                    onChange={(e) => handleFilterChange('tipoIngreso', e.target.value)}
                    className={`w-full border px-3 py-2 text-sm ${theme === 'dark'
                      ? 'border-slate-700 bg-slate-800 text-slate-100'
                      : 'border-gray-300 bg-white text-gray-900'
                    }`}
                  >
                    <option value="">Todos</option>
                    {getFilteredOptions.tiposIngreso.map((tipo) => (
                      <option key={tipo} value={tipo}>{tipo}</option>
                    ))}
                  </select>
                </div>

                {/* Flete */}
                <div className="space-y-2">
                  <label className={`block text-xs sm:text-sm font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>
                    Flete
                  </label>
                  <select
                    value={filterPanelValues.flete}
                    onChange={(e) => handleFilterChange('flete', e.target.value)}
                    className={`w-full border px-3 py-2 text-sm ${theme === 'dark'
                      ? 'border-slate-700 bg-slate-800 text-slate-100'
                      : 'border-gray-300 bg-white text-gray-900'
                    }`}
                  >
                    <option value="">Todos</option>
                    {getFilteredOptions.fletes.map((flete) => (
                      <option key={flete} value={flete}>{flete}</option>
                    ))}
                  </select>
                </div>

                {/* Temporada */}
                <div className="space-y-2">
                  <label className={`block text-xs sm:text-sm font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>
                    Temporada
                  </label>
                  <select
                    value={filterPanelValues.temporada}
                    onChange={(e) => handleFilterChange('temporada', e.target.value)}
                    className={`w-full border px-3 py-2 text-sm ${theme === 'dark'
                      ? 'border-slate-700 bg-slate-800 text-slate-100'
                      : 'border-gray-300 bg-white text-gray-900'
                    }`}
                  >
                    <option value="">Todas</option>
                    {getFilteredOptions.temporadas.map((temporada) => (
                      <option key={temporada} value={temporada}>{temporada}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Footer con botones */}
              <div className={`px-4 sm:px-6 py-4 border-t flex gap-3 ${theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-gray-50'}`}>
                <button
                  onClick={handleClearAllFilters}
                  className={`flex-1 px-4 py-2 text-sm font-medium border transition ${
                    theme === 'dark'
                      ? 'border-slate-600 text-slate-300 hover:bg-slate-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Limpiar
                </button>
                <button
                  onClick={handleApplyFilters}
                  className={`flex-1 px-4 py-2 text-sm font-semibold text-white transition ${
                    theme === 'dark'
                      ? 'bg-sky-600 hover:bg-sky-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  Aplicar Filtros
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Menú contextual */}
      {contextMenu.visible && (
        <div
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            zIndex: 1000,
          }}
          className={`min-w-[180px] border shadow-xl ${
            theme === 'dark'
              ? 'bg-gray-800 border-gray-600'
              : 'bg-white border-gray-300'
          }`}
        >
          {/* Solo mostrar "Copiar reserva" si hay exactamente 1 fila seleccionada */}
          {selectedRegistros.length === 1 && (
            <button
              onClick={handleCopyReserva}
              disabled={!canAdd}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors border-b flex items-center gap-2 ${
                !canAdd
                  ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed border-gray-200 dark:border-gray-700'
                  : theme === 'dark'
                  ? 'text-sky-300 border-gray-700 hover:bg-gray-700'
                  : 'text-sky-600 border-gray-200 hover:bg-gray-100'
              }`}
              title={canAdd ? "Copiar reserva y crear nueva" : "No tienes permisos para crear registros"}
            >
              <Plus className="w-4 h-4" />
              <span>Copiar reserva</span>
            </button>
          )}
          <button
            onClick={handleBulkEditNaveViaje}
            disabled={!canEdit}
            className={`w-full text-left px-4 py-2.5 text-sm transition-colors border-b flex items-center gap-2 ${
              !canEdit
                ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed border-gray-200 dark:border-gray-700'
                : theme === 'dark'
                ? 'text-gray-200 border-gray-700 hover:bg-gray-700'
                : 'text-gray-700 border-gray-200 hover:bg-gray-100'
            }`}
            title={canEdit ? "Enviar a transporte" : "No tienes permisos para editar registros"}
          >
            <Truck className="w-4 h-4" />
            <span>Enviar a transporte</span>
          </button>
          <button
            onClick={handleDeleteSelectedRows}
            disabled={!canDelete}
            className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2 ${
              !canDelete
                ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                : theme === 'dark'
                ? 'text-red-400 hover:text-red-300 hover:bg-red-900/20'
                : 'text-red-600 hover:text-red-700 hover:bg-red-50'
            }`}
            title={canDelete ? `Borrar (${selectedRegistros.length})` : "No tienes permisos para borrar registros"}
          >
            <Trash2 className="w-4 h-4" />
            <span>Borrar ({selectedRegistros.length})</span>
          </button>
        </div>
      )}

      {/* Profile Modal */}
      {showProfileModal && userInfo && (
        <UserProfileModal
          userInfo={userInfo}
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          onUserUpdate={(updatedUser) => {
            setUserInfo(updatedUser);
          }}
        />
      )}

      {/* Edit Nave/Viaje Modal */}
      {showEditNaveViajeModal && selectedRegistros.length > 0 && (
        <EditNaveViajeModal
          isOpen={showEditNaveViajeModal}
          onClose={() => setShowEditNaveViajeModal(false)}
          record={selectedRegistros[0]}
          records={selectedRegistros}
          navesUnicas={navesUnicas}
          navierasNavesMapping={navierasNavesMapping}
          consorciosNavesMapping={consorciosNavesMapping}
          onSave={async () => { }}
          onBulkSave={handleBulkSaveNaveViaje}
        />
      )}

      {/* Add Modal */}
      {showAddModal && (
        <AddModal
          isOpen={showAddModal}
          onClose={() => {
            setShowAddModal(false);
            setCopiedRegistro(null); // Limpiar datos copiados al cerrar
          }}
          onSuccess={async (createdRecords) => {
            setShowAddModal(false);
            setCopiedRegistro(null); // Limpiar datos copiados después de crear
            await handleRefreshData();
          }}
          createdByName={userInfo?.nombre || user?.user_metadata?.full_name || user?.email || 'Usuario'}
          userEmail={user?.email || null}
          ejecutivosUnicos={ejecutivosUnicos}
          clientesUnicos={clientesUnicos}
          refExternasUnicas={[]}
          navierasUnicas={navierasUnicas}
          especiesUnicas={especiesUnicas}
          polsUnicos={polsUnicos}
          destinosUnicos={destinosUnicos}
          depositosUnicos={depositosUnicos}
          navesUnicas={navesUnicas}
          navierasNavesMapping={navierasNavesMapping}
          consorciosNavesMapping={consorciosNavesMapping}
          cbmUnicos={cbmUnicos}
          fletesUnicos={fletesUnicos}
          contratosUnicos={[]}
          co2sUnicos={[]}
          o2sUnicos={[]}
          tratamientosDeFrioOpciones={[]}
          initialData={copiedRegistro || undefined}
        />
      )}

      {/* Trash Modal */}
      {showTrashModal && (
        <TrashModal
          isOpen={showTrashModal}
          onClose={() => setShowTrashModal(false)}
          onRestore={async () => {
            await loadRegistros();
            await loadTrashCount();
          }}
          onSuccess={(message) => success(message)}
          onError={(message) => showError(message)}
        />
      )}
        </div>
      </div>

      {/* Estilos para centrar los headers */}
      <style jsx global>{`
        .ag-header-cell-center .ag-header-cell-label {
          justify-content: center !important;
        }
        .ag-header-cell-center .ag-header-cell-text {
          text-align: center !important;
        }
        .ag-header-cell-label {
          justify-content: center !important;
        }
        .ag-cell-label-container {
          justify-content: center !important;
        }
        .ag-header-cell-comp-wrapper {
          justify-content: center !important;
        }
      `}</style>
    </div>
  );
}

