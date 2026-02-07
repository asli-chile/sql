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
import {
  LogOut,
  User as UserIcon,
  ArrowLeft,
  Download,
  Settings,
  Grid3x3,
  Filter,
  RefreshCw,
  Send,
  X
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/hooks/useToast';
import { Registro } from '@/types/registros';
import { convertSupabaseToApp } from '@/lib/migration-utils';
import { EditNaveViajeModal } from '@/components/EditNaveViajeModal';
import { logHistoryEntry, mapRegistroFieldToDb } from '@/lib/history';
import { calculateTransitTime } from '@/lib/transit-time-utils';

export default function TablasPersonalizadasPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const { success, error: showError } = useToast();
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
  const [estadosUnicos, setEstadosUnicos] = useState<string[]>([]);
  const [tipoIngresoUnicos, setTipoIngresoUnicos] = useState<string[]>([]);
  const [temporadasUnicas, setTemporadasUnicas] = useState<string[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [selectedRegistros, setSelectedRegistros] = useState<Registro[]>([]);
  const [showEditNaveViajeModal, setShowEditNaveViajeModal] = useState(false);
  const [navesUnicas, setNavesUnicas] = useState<string[]>([]);
  const [navierasNavesMapping, setNavierasNavesMapping] = useState<Record<string, string[]>>({});
  const [consorciosNavesMapping, setConsorciosNavesMapping] = useState<Record<string, string[]>>({});
  const [gridApi, setGridApi] = useState<any>(null);
  // Componente de header personalizado que integra el filtro
  const CustomHeaderWithFilter = (props: IHeaderParams) => {
    const [filterValue, setFilterValue] = useState('');
    
    const applyFilter = useCallback(async (value: string) => {
      try {
        const filterType = props.column.getColDef().filter || 'agTextColumnFilter';
        const field = props.column.getColDef().field;
        
        if (!field) {
          console.error('No field defined for column');
          return;
        }
        
        if (!props.api) {
          console.error('API not available');
          return;
        }
        
        // Obtener la instancia del filtro de forma asíncrona
        const filterInstance = await props.api.getColumnFilterInstance(field);
        
        if (!filterInstance) {
          console.error('Filter instance not available');
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
        
        // Verificar que el filtro se aplicó correctamente y obtener información de debug
        setTimeout(() => {
          const appliedFilter = props.api.getFilterModel();
          const rowCount = props.api.getDisplayedRowCount();
          
          // Obtener TODAS las filas (no solo las renderizadas) para ver los datos reales
          const allRowData: any[] = [];
          props.api.forEachNode((node) => {
            if (node.data) {
              allRowData.push(node.data);
            }
          });
          
          // Obtener valores únicos del campo
          const uniqueValues = Array.from(new Set(
            allRowData.map(row => row[field]).filter(Boolean)
          )).slice(0, 20);
          
          // Verificar coincidencias
          const trimmedValue = value.trim();
          const matchingRows = allRowData.filter(row => {
            const rowValue = String(row[field] || '').trim();
            return rowValue.toLowerCase().includes(trimmedValue.toLowerCase());
          });
          
          console.log('=== FILTER DEBUG ===');
          console.log('Field:', field);
          console.log('Filter Value:', trimmedValue);
          console.log('Displayed Rows:', rowCount);
          console.log('Total Rows in Grid:', allRowData.length);
          console.log('Applied Filter Model:', appliedFilter[field]);
          console.log('Unique Values in Field (first 20):', uniqueValues);
          console.log('Matching Rows (by our check):', matchingRows.length);
          console.log('Sample Matching Rows:', matchingRows.slice(0, 3).map(r => ({ 
            ejecutivo: r.ejecutivo, 
            [field]: r[field] 
          })));
          console.log('Value exists in unique values:', uniqueValues.some(v => 
            String(v).toLowerCase().includes(trimmedValue.toLowerCase())
          ));
          console.log('===================');
        }, 200);
      } catch (error) {
        console.error('Error applying filter:', error);
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

    return (
      <div className="flex flex-col h-full w-full">
        <div className="flex items-center justify-between h-6 px-2">
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">
            {props.displayName}
          </span>
          {props.enableSorting && (
            <div className="flex flex-col ml-1">
              <button
                onClick={() => {
                  try {
                    props.setSort('asc', false);
                  } catch (error) {
                    console.error('Error setting sort:', error);
                  }
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-[10px] leading-none"
                title="Ordenar ascendente"
              >
                ▲
              </button>
              <button
                onClick={() => {
                  try {
                    props.setSort('desc', false);
                  } catch (error) {
                    console.error('Error setting sort:', error);
                  }
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-[10px] leading-none"
                title="Ordenar descendente"
              >
                ▼
              </button>
            </div>
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
          console.warn('Error al registrar en historial:', historialError);
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
      checkboxes: true,
      headerCheckbox: true,
      enableClickSelection: false,
    },
    defaultColDef: {
      sortable: true,
      filter: true,
      resizable: true,
      floatingFilter: false, // Deshabilitar filtros flotantes
      headerComponent: CustomHeaderWithFilter as any,
      editable: true, // Habilitar edición inline por defecto
      cellStyle: { textAlign: 'center' },
      cellClass: 'ag-center-cell',
    },
    sideBar: false,
    suppressMenuHide: true,
    // Solo permitir seleccionar filas que pasan los filtros
    isRowSelectable: (node: any) => {
      // Por defecto todas las filas son seleccionables
      // La lógica de filtrado se maneja en onSelectionChanged
      return true;
    },
    // Manejar cambios de celda para edición inline
    onCellValueChanged: onCellValueChanged,
  });

  const loadCatalogos = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: catalogos, error } = await supabase
        .from('catalogos')
        .select('*');

      if (error) {
        console.error('Error loading catalogos:', error);
        return;
      }

      // Procesar catálogos
      catalogos.forEach(catalogo => {
        const valores = catalogo.valores || [];
        const mapping = catalogo.mapping;

        switch (catalogo.categoria) {
          case 'naves':
            setNavesUnicas(valores);
            break;
          case 'navierasNavesMapping':
            if (mapping && typeof mapping === 'object') {
              const cleanMapping: Record<string, string[]> = {};
              Object.keys(mapping).forEach(key => {
                const naves = (mapping[key] || []) as string[];
                cleanMapping[key] = naves.map((nave: string) => {
                  const match = nave.match(/^(.+?)\s*\[.+\]$/);
                  return match ? match[1].trim() : nave.trim();
                });
              });
              setNavierasNavesMapping(cleanMapping);
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
    } catch (error) {
      console.error('Error loading catalogos:', error);
    }
  }, []);

  const loadRegistros = useCallback(async () => {
    setLoadingData(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('registros')
        .select('*')
        .is('deleted_at', null)
        .order('ref_asli', { ascending: false });

      if (error) {
        console.error('Error loading registros:', error);
        showError('Error al cargar registros: ' + error.message);
        return;
      }

      const registrosConvertidos = (data || []).map(convertSupabaseToApp);
      setRowData(registrosConvertidos);

      // Extraer valores únicos para filtros
      const navieras = [...new Set(registrosConvertidos.map(r => r.naviera).filter(Boolean))].sort();
      const ejecutivos = [...new Set(registrosConvertidos.map(r => r.ejecutivo).filter(Boolean))].sort();
      const especies = [...new Set(registrosConvertidos.map(r => r.especie).filter(Boolean))].sort();
      const clientes = [...new Set(registrosConvertidos.map(r => r.shipper).filter(Boolean))].sort();
      const pols = [...new Set(registrosConvertidos.map(r => r.pol).filter(Boolean))].sort();
      const destinos = [...new Set(registrosConvertidos.map(r => r.pod).filter(Boolean))].sort();
      const depositos = [...new Set(registrosConvertidos.map(r => r.deposito).filter(Boolean))].sort();
      const fletes = [...new Set(registrosConvertidos.map(r => r.flete).filter(Boolean))].sort();
      const estados = [...new Set(registrosConvertidos.map(r => r.estado).filter(Boolean))].sort();
      const tipoIngreso = [...new Set(registrosConvertidos.map(r => r.tipoIngreso).filter(Boolean))].sort();
      const temporadas = [...new Set(registrosConvertidos.map(r => r.temporada).filter((t): t is string => Boolean(t)))].sort();

      setNavierasUnicas(navieras);
      setEjecutivosUnicos(ejecutivos);
      setEspeciesUnicas(especies);
      setClientesUnicos(clientes);
      setPolsUnicos(pols);
      setDestinosUnicos(destinos);
      setDepositosUnicos(depositos);
      setFletesUnicos(fletes);
      setEstadosUnicos(estados);
      setTipoIngresoUnicos(tipoIngreso);
      setTemporadasUnicas(temporadas);

      // Extraer naves únicas
      const naves = [...new Set(registrosConvertidos.map(r => {
        let nave = r.naveInicial || '';
        const match = nave.match(/^(.+?)\s*\[(.+?)\]$/);
        return match ? match[1].trim() : nave.trim();
      }).filter(Boolean))].sort();
      setNavesUnicas(naves);

      success(`${registrosConvertidos.length} registros cargados`);
    } catch (error: any) {
      console.error('Error loading registros:', error);
      showError('Error al cargar registros: ' + error.message);
    } finally {
      setLoadingData(false);
    }
  }, [showError, success]);

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
      } catch (error) {
        console.error('Error checking user:', error);
        router.push('/auth');
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, [router, loadRegistros, loadCatalogos]);

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

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/auth');
    } catch (error) {
      console.error('Error logging out:', error);
      showError('Error al cerrar sesión');
    }
  };

  // Definición de columnas para registros
  const columnDefs: ColDef[] = useMemo(() => [
    {
      headerName: '',
      width: 50,
      pinned: 'left',
      lockPosition: true,
      checkboxSelection: true,
      headerCheckboxSelection: true,
      suppressMovable: true,
      sortable: false,
      filter: false,
      editable: false,
      resizable: false,
      cellStyle: { textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' },
      headerClass: 'ag-center-header',
    },
    {
      field: 'refAsli',
      headerName: 'REF ASLI',
      width: 120,
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
      width: 120,
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
      width: 150,
      filter: 'agTextColumnFilter',
      filterParams: {
        values: clientesUnicos,
      },
    },
    {
      field: 'booking',
      headerName: 'Booking',
      width: 120,
      filter: 'agTextColumnFilter',
    },
    {
      field: 'contenedor',
      headerName: 'Contenedor',
      width: 150,
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
      width: 130,
      filter: 'agTextColumnFilter',
      filterParams: {
        values: navierasUnicas,
      },
    },
    {
      field: 'naveInicial',
      headerName: 'Nave',
      width: 130,
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
      field: 'especie',
      headerName: 'Especie',
      width: 120,
      filter: 'agTextColumnFilter',
      filterParams: {
        values: especiesUnicas,
      },
    },
    {
      field: 'pol',
      headerName: 'POL',
      width: 120,
      filter: 'agTextColumnFilter',
      filterParams: {
        values: polsUnicos,
      },
    },
    {
      field: 'pod',
      headerName: 'POD',
      width: 120,
      filter: 'agTextColumnFilter',
      filterParams: {
        values: destinosUnicos,
      },
    },
    {
      field: 'deposito',
      headerName: 'Depósito',
      width: 120,
      filter: 'agTextColumnFilter',
      filterParams: {
        values: depositosUnicos,
      },
    },
    {
      field: 'etd',
      headerName: 'ETD',
      width: 100,
      filter: 'agDateColumnFilter',
      valueFormatter: (params) => {
        if (!params.value) return '';
        return new Date(params.value).toLocaleDateString('es-CL');
      },
    },
    {
      field: 'eta',
      headerName: 'ETA',
      width: 100,
      filter: 'agDateColumnFilter',
      valueFormatter: (params) => {
        if (!params.value) return '';
        return new Date(params.value).toLocaleDateString('es-CL');
      },
    },
    {
      field: 'tt',
      headerName: 'TT',
      width: 60,
      filter: 'agNumberColumnFilter',
    },
    {
      field: 'estado',
      headerName: 'Estado',
      width: 120,
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
      width: 100,
      filter: 'agTextColumnFilter',
      filterParams: {
        values: fletesUnicos,
      },
    },
    {
      field: 'tipoIngreso',
      headerName: 'Tipo Ingreso',
      width: 120,
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
      width: 90,
      filter: 'agNumberColumnFilter',
      valueFormatter: (params) => {
        return params.value ? `${params.value}°C` : '';
      },
    },
    {
      field: 'cbm',
      headerName: 'CBM',
      width: 70,
      filter: 'agNumberColumnFilter',
    },
    {
      field: 'ingresado',
      headerName: 'Ingresado',
      width: 100,
      filter: 'agDateColumnFilter',
      valueFormatter: (params) => {
        if (!params.value) return '';
        return new Date(params.value).toLocaleDateString('es-CL');
      },
    },
    {
      field: 'refCliente',
      headerName: 'REF Cliente',
      width: 120,
      filter: 'agTextColumnFilter',
    },
    {
      field: 'usuario',
      headerName: 'Usuario',
      width: 100,
      filter: 'agTextColumnFilter',
    },
    {
      field: 'clienteAbr',
      headerName: 'Cliente Abr',
      width: 100,
      filter: 'agTextColumnFilter',
    },
    {
      field: 'viaje',
      headerName: 'Viaje',
      width: 80,
      filter: 'agTextColumnFilter',
    },
    {
      field: 'ct',
      headerName: 'CT',
      width: 80,
      filter: 'agTextColumnFilter',
    },
    {
      field: 'co2',
      headerName: 'CO2',
      width: 80,
      filter: 'agNumberColumnFilter',
    },
    {
      field: 'o2',
      headerName: 'O2',
      width: 80,
      filter: 'agNumberColumnFilter',
    },
    {
      field: 'tratamientoFrio',
      headerName: 'Tratamiento Frío',
      width: 130,
      filter: 'agTextColumnFilter',
    },
    {
      field: 'tipoAtmosfera',
      headerName: 'Tipo Atmósfera',
      width: 130,
      filter: 'agTextColumnFilter',
    },
    {
      field: 'roleadaDesde',
      headerName: 'Roleada Desde',
      width: 120,
      filter: 'agTextColumnFilter',
    },
    {
      field: 'ingresoStacking',
      headerName: 'Ingreso Stacking',
      width: 130,
      filter: 'agDateColumnFilter',
      valueFormatter: (params) => {
        if (!params.value) return '';
        return new Date(params.value).toLocaleDateString('es-CL');
      },
    },
    {
      field: 'numeroBl',
      headerName: 'Número BL',
      width: 120,
      filter: 'agTextColumnFilter',
    },
    {
      field: 'estadoBl',
      headerName: 'Estado BL',
      width: 100,
      filter: 'agTextColumnFilter',
    },
    {
      field: 'contrato',
      headerName: 'Contrato',
      width: 120,
      filter: 'agTextColumnFilter',
    },
    {
      field: 'semanaIngreso',
      headerName: 'Semana Ingreso',
      width: 120,
      filter: 'agNumberColumnFilter',
    },
    {
      field: 'mesIngreso',
      headerName: 'Mes Ingreso',
      width: 100,
      filter: 'agNumberColumnFilter',
    },
    {
      field: 'semanaZarpe',
      headerName: 'Semana Zarpe',
      width: 120,
      filter: 'agNumberColumnFilter',
    },
    {
      field: 'mesZarpe',
      headerName: 'Mes Zarpe',
      width: 100,
      filter: 'agNumberColumnFilter',
    },
    {
      field: 'semanaArribo',
      headerName: 'Semana Arribo',
      width: 120,
      filter: 'agNumberColumnFilter',
    },
    {
      field: 'mesArribo',
      headerName: 'Mes Arribo',
      width: 100,
      filter: 'agNumberColumnFilter',
    },
    {
      field: 'facturacion',
      headerName: 'Facturación',
      width: 120,
      filter: 'agTextColumnFilter',
    },
    {
      field: 'bookingPdf',
      headerName: 'Booking PDF',
      width: 120,
      filter: 'agTextColumnFilter',
    },
    {
      field: 'comentario',
      headerName: 'Comentario',
      width: 200,
      filter: 'agTextColumnFilter',
    },
    {
      field: 'observacion',
      headerName: 'Observación',
      width: 200,
      filter: 'agTextColumnFilter',
    },
    {
      field: 'temporada',
      headerName: 'Temporada',
      width: 100,
      filter: 'agTextColumnFilter',
      filterParams: {
        values: temporadasUnicas,
        caseSensitive: false,
        trimInput: true,
      },
    },
  ], [navierasUnicas, ejecutivosUnicos, especiesUnicas, clientesUnicos, polsUnicos, destinosUnicos, depositosUnicos, fletesUnicos, estadosUnicos, tipoIngresoUnicos, temporadasUnicas]);

  // Función para cargar el orden guardado desde Supabase
  const loadSortOrderFromSupabase = useCallback(async () => {
    if (!gridApi || !user) return;

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('preferencias_usuario')
        .select('valor')
        .eq('usuario_id', user.id)
        .eq('pagina', 'tablas-personalizadas')
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
    
    // Cargar el orden guardado desde Supabase
    // Esperar un momento para que el usuario esté cargado
    setTimeout(() => {
      loadSortOrderFromSupabase();
    }, 500);
  };

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
            pagina: 'tablas-personalizadas',
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
          .eq('pagina', 'tablas-personalizadas')
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

  const handleExportCSV = () => {
    const csvContent = [
      // Headers
      columnDefs.map(col => col.headerName || col.field).join(','),
      // Rows
      ...rowData.map(row =>
        columnDefs.map(col => {
          const field = col.field as keyof Registro;
          let value = row[field];

          // Formatear valores especiales
          if (value instanceof Date) {
            value = value.toLocaleDateString('es-CL');
          } else if (Array.isArray(value)) {
            value = value.join(', ');
          } else if (value === null || value === undefined) {
            value = '';
          }

          // Escape commas and quotes in CSV
          const stringValue = String(value);
          return `"${stringValue.replace(/"/g, '""')}"`;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `registros_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success('CSV exportado exitosamente');
  };

  const handleRefreshData = () => {
    loadRegistros();
  };

  const handleClearSelection = () => {
    if (gridApi) {
      gridApi.deselectAll();
      setSelectedRows(new Set());
      setSelectedRegistros([]);
    }
  };

  const handleBulkEditNaveViaje = () => {
    if (selectedRegistros.length > 0) {
      setShowEditNaveViajeModal(true);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 flex flex-col overflow-hidden ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className={`flex-shrink-0 border-b ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="w-full px-3">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className={`p-2 transition-colors ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
                  }`}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center space-x-2">
                <Grid3x3 className={`w-5 h-5 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                <h1 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Tablas Personalizadas
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowProfileModal(true)}
                className={`p-2 transition-colors ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
                  }`}
              >
                <UserIcon className="w-5 h-5" />
              </button>
              <button
                onClick={handleLogout}
                className={`p-2 transition-colors ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
                  }`}
              >
                <LogOut className="w-5 h-5" />
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
                onClick={handleRefreshData}
                disabled={loadingData}
                className={`flex items-center space-x-2 px-3 py-1.5 transition-colors text-sm ${loadingData
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : theme === 'dark'
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
              >
                <RefreshCw className={`w-4 h-4 ${loadingData ? 'animate-spin' : ''}`} />
                <span>{loadingData ? 'Cargando...' : 'Recargar'}</span>
              </button>
              <button
                onClick={handleExportCSV}
                className="flex items-center space-x-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
                <span>Exportar CSV</span>
              </button>
            </div>
            <div className="flex items-center space-x-2">
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
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleBulkEditNaveViaje}
                  className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white transition-colors text-sm"
                >
                  <Send className="w-4 h-4" />
                  <span>Enviar a</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* AG Grid - Ocupa todo el espacio restante con scroll interno */}
        <div className="flex-1" style={{ minHeight: 0, height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {loadingData ? (
            <div className={`flex items-center justify-center h-full ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Cargando registros...</p>
              </div>
            </div>
          ) : (
            <div
              className={`h-full w-full ${selectedTheme} ${theme === 'dark' ? 'ag-theme-quartz-dark' : 'ag-theme-quartz'}`}
              style={{
                backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                height: '100%',
                width: '100%'
              }}
            >
              <AgGridReact
                rowData={rowData}
                columnDefs={columnDefs}
                gridOptions={gridOptions}
                onGridReady={onGridReady}
                onSelectionChanged={onSelectionChanged}
                onSortChanged={onSortChanged}
                animateRows={true}
                getRowStyle={getRowStyle}
                rowHeight={35}
                headerHeight={70}
                domLayout="normal"
              />
            </div>
          )}
        </div>
      </main>

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
    </div>
  );
}

