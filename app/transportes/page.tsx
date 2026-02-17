'use client';

import { useEffect, useState, useCallback, useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import type { User } from '@supabase/supabase-js';
import { Truck, ChevronRight, Ship, Globe, FileText, FileCheck, LayoutDashboard, User as UserIcon, Trash2, Users, DollarSign, BarChart3, Plus, RefreshCw } from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridOptions, GridReadyEvent, ICellRendererParams, ICellEditorParams, GridApi } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import { useUser } from '@/hooks/useUser';
import { useTheme } from '@/contexts/ThemeContext';
import { UserProfileModal } from '@/components/users/UserProfileModal';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { Sidebar } from '@/components/layout/Sidebar';
import { SidebarSection } from '@/types/layout';
import { TransporteRecord, fetchTransportes } from '@/lib/transportes-service';
import { useToast } from '@/hooks/useToast';

export default function TransportesPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const { success, error: showError } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const { setCurrentUser, currentUser, transportesCount, registrosCount, canAdd, canEdit } = useUser();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isTrashModalOpen, setIsTrashModalOpen] = useState(false);
  const [trashCount, setTrashCount] = useState(0);
  const [rowData, setRowData] = useState<TransporteRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const gridRef = useRef<AgGridReact<TransporteRecord>>(null);
  const [selectedTransportes, setSelectedTransportes] = useState<TransporteRecord[]>([]);

  useEffect(() => {
    let isMounted = true;

    const checkUser = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user: authUser },
          error,
        } = await supabase.auth.getUser();

        if (!isMounted) {
          setLoadingUser(false);
          return;
        }

        if (error) {
          if (error.message?.includes('Refresh Token') || error.message?.includes('JWT')) {
            await supabase.auth.signOut();
            router.push('/auth');
            setLoadingUser(false);
            return;
          }
          console.error('[Transportes] Error obteniendo usuario:', error);
          setLoadingUser(false);
          return;
        }

        if (!authUser) {
          router.push('/auth');
          setLoadingUser(false);
          return;
        }

        setUser(authUser);

        const { data: userInfo } = await supabase
          .from('usuarios')
          .select('*')
          .eq('auth_user_id', authUser.id)
          .single();

        if (userInfo && isMounted) {
          setCurrentUser(userInfo);
        }
      } catch (error: any) {
        if (!isMounted) {
          setLoadingUser(false);
          return;
        }
        if (!error?.message?.includes('Refresh Token') && !error?.message?.includes('JWT')) {
          console.error('[Transportes] Error comprobando usuario:', error);
        }
      } finally {
        if (isMounted) {
          setLoadingUser(false);
        }
      }
    };

    const timeoutId = setTimeout(() => {
      void checkUser();
    }, 200);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      setLoadingUser(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    const loadTrashCount = async () => {
      try {
        const supabase = createClient();
        const { count, error } = await supabase
          .from('transportes')
          .select('*', { count: 'exact', head: true })
          .not('deleted_at', 'is', null);

        if (error) {
          throw error;
        }

        setTrashCount(count ?? 0);
      } catch (err) {
        console.warn('[Transportes] Error cargando contador de papelera:', err);
        setTrashCount(0);
      }
    };

    if (currentUser?.id) {
      void loadTrashCount();
    }
  }, [currentUser?.id]);

  const loadTransportes = useCallback(async () => {
    if (!user || !currentUser) return;

    try {
      setIsLoading(true);
      const userInfo = currentUser ? {
        rol: currentUser.rol,
        cliente_nombre: currentUser.cliente_nombre || null,
        clientes_asignados: currentUser.clientes_asignados || []
      } : null;
      const data = await fetchTransportes(userInfo);
      setRowData(data || []);
    } catch (error) {
      console.error('Error cargando transportes:', error);
      showError('Error al cargar transportes');
      setRowData([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, currentUser, showError]);

  useEffect(() => {
    void loadTransportes();
  }, [loadTransportes]);

  // Agregar estilos CSS globales para centrar headers y checkboxes
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .ag-center-header .ag-header-cell-label {
        justify-content: center;
        text-align: center;
      }
      .ag-center-header .ag-header-cell-text {
        text-align: center;
      }
      /* SIMPLE: Centrar checkbox - El wrapper ya está centrado con flex, solo centrar el checkbox */
      .ag-cell[col-id="checkbox"] .ag-cell-wrapper {
        justify-content: center !important;
      }
      .ag-cell[col-id="checkbox"] .ag-selection-checkbox {
        margin: 0 auto !important;
      }
      /* Centrar header checkbox - TODOS LOS SELECTORES POSIBLES */
      .ag-header-cell[col-id="checkbox"] {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        text-align: center !important;
      }
      .ag-header-cell[col-id="checkbox"] .ag-header-cell-label {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .ag-header-cell[col-id="checkbox"] .ag-header-cell-label .ag-selection-checkbox,
      .ag-header-cell[col-id="checkbox"] .ag-selection-checkbox,
      .ag-header-cell[col-id="checkbox"] > .ag-selection-checkbox {
        margin: 0 auto !important;
        margin-left: auto !important;
        margin-right: auto !important;
        display: block !important;
        flex-shrink: 0 !important;
        position: relative !important;
        left: auto !important;
        right: auto !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);


  // Editor de fecha y hora personalizado
  const DateTimeCellEditor = forwardRef<any, ICellEditorParams>((props, ref) => {
    const [dateValue, setDateValue] = useState<string>('');
    const [timeValue, setTimeValue] = useState<string>('');
    const dateInputRef = useRef<HTMLInputElement>(null);
    const timeInputRef = useRef<HTMLInputElement>(null);
    const datePickerRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (props.value) {
        const date = props.value instanceof Date ? props.value : new Date(props.value);
        if (!isNaN(date.getTime())) {
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          setDateValue(`${day}/${month}/${year}`);
          setTimeValue(`${hours}:${minutes}`);
        } else {
          setDateValue('');
          setTimeValue('');
        }
      } else {
        setDateValue('');
        setTimeValue('');
      }
      setTimeout(() => {
        dateInputRef.current?.focus();
        dateInputRef.current?.select();
      }, 0);
    }, [props.value]);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setTimeout(() => {
            if (props.api && props.node) {
              props.api.stopEditing(true);
            }
          }, 0);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [props.api, props.node]);

    useImperativeHandle(ref, () => ({
      getValue: () => {
        if (!dateValue || dateValue.trim() === '') return null;
        
        let hours = 0;
        let minutes = 0;
        if (timeValue && timeValue.trim() !== '') {
          const [h, m] = timeValue.split(':');
          if (h && m) {
            hours = parseInt(h) || 0;
            minutes = parseInt(m) || 0;
          }
        }
        
        const [day, month, year] = dateValue.split('/');
        if (day && month && year && day.length === 2 && month.length === 2 && year.length === 4) {
          const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), hours, minutes);
          if (!isNaN(date.getTime())) {
            return date;
          }
        }
        return null;
      },
      isCancelBeforeStart: () => false,
      isCancelAfterEnd: () => false,
      afterGuiAttached: () => {
        setTimeout(() => {
          dateInputRef.current?.focus();
          dateInputRef.current?.select();
        }, 0);
      },
      focusIn: () => {
        setTimeout(() => {
          dateInputRef.current?.focus();
        }, 0);
      },
      focusOut: () => {},
    }));

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let input = e.target.value.replace(/\D/g, '');
      if (input.length > 8) input = input.slice(0, 8);
      
      let formatted = input;
      if (input.length > 2) {
        formatted = input.slice(0, 2) + '/' + input.slice(2);
      }
      if (input.length > 4) {
        formatted = input.slice(0, 2) + '/' + input.slice(2, 4) + '/' + input.slice(4);
      }
      setDateValue(formatted);
    };

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let input = e.target.value.replace(/\D/g, '');
      if (input.length > 4) input = input.slice(0, 4);
      
      let formatted = input;
      if (input.length > 2) {
        formatted = input.slice(0, 2) + ':' + input.slice(2);
      }
      setTimeValue(formatted);
    };

    const handleDatePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.value) {
        const date = new Date(e.target.value + 'T00:00:00');
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        setDateValue(`${day}/${month}/${year}`);
        timeInputRef.current?.focus();
      }
    };

    const handleDateKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Tab' && dateValue) {
        e.preventDefault();
        timeInputRef.current?.focus();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        if (props.api && props.node) {
          props.api.stopEditing(true);
        }
      }
    };

    const handleContainerBlur = (e: React.FocusEvent) => {
      const relatedTarget = e.relatedTarget as Node;
      const isFocusMovingInside = containerRef.current?.contains(relatedTarget);
      
      if (!isFocusMovingInside && props.api && props.node) {
        setTimeout(() => {
          props.api.stopEditing(false);
        }, 50);
      }
    };

    return (
      <div 
        ref={containerRef} 
        className={`relative flex items-center gap-1 w-full h-full px-2 border border-blue-500 rounded ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} focus-within:ring-2 focus-within:ring-blue-500`}
        onBlur={handleContainerBlur}
        tabIndex={-1}
      >
        <input
          ref={dateInputRef}
          type="text"
          value={dateValue}
          onChange={handleDateChange}
          onKeyDown={handleDateKeyDown}
          placeholder="dd/mm/yyyy"
          className={`flex-1 border-none outline-none bg-transparent ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
          style={{ minWidth: '100px', fontSize: '14px' }}
          maxLength={10}
        />
        <button
          type="button"
          onClick={() => {
            datePickerRef.current?.showPicker?.();
          }}
          className={`${theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
          tabIndex={-1}
        >
          📅
        </button>
        <input
          ref={datePickerRef}
          type="date"
          className="absolute opacity-0 pointer-events-none"
          tabIndex={-1}
          onChange={handleDatePickerChange}
          style={{ width: 0, height: 0 }}
        />
        <input
          ref={timeInputRef}
          type="time"
          value={timeValue}
          onChange={(e) => setTimeValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Tab' || e.key === 'Enter') {
              e.preventDefault();
              e.stopPropagation();
              if (props.api && props.node) {
                props.api.stopEditing(true);
              }
            }
          }}
          placeholder="HH:mm"
          className={`w-20 border-none outline-none bg-transparent ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
          style={{ fontSize: '14px' }}
        />
      </div>
    );
  });

  DateTimeCellEditor.displayName = 'DateTimeCellEditor';

  const onGridReady = useCallback((params: GridReadyEvent) => {
    setGridApi(params.api);
  }, []);

  const onSelectionChanged = useCallback(() => {
    if (!gridApi) return;
    const selectedRows = gridApi.getSelectedRows() as TransporteRecord[];
    setSelectedTransportes(selectedRows);
  }, [gridApi]);

  const onCellValueChanged = useCallback(async (params: any) => {
    if (!params.data || !params.data.id) return;

    const field = params.colDef.field as keyof TransporteRecord;
    const newValue = params.newValue;
    const record = params.data as TransporteRecord;

    try {
      const supabase = createClient();
      let processedValue: any = newValue;

      // Procesar valores según el tipo
      if (newValue === '' || newValue === null || newValue === undefined) {
        processedValue = null;
      } else if (['stacking', 'fin_stacking', 'cut_off', 'fecha_planta', 'cut_off_documental'].includes(field)) {
        // Campos de fecha
        if (newValue instanceof Date) {
          processedValue = isNaN(newValue.getTime()) ? null : newValue.toISOString();
        } else if (typeof newValue === 'string') {
          const date = new Date(newValue);
          processedValue = isNaN(date.getTime()) ? null : date.toISOString();
        }
      } else if (['tara', 'temperatura', 'co2', 'o2', 'semana'].includes(field)) {
        // Campos numéricos
        processedValue = Number(newValue);
        if (isNaN(processedValue)) {
          processedValue = null;
        }
      } else if (['late', 'extra_late', 'porteo', 'atmosfera_controlada', 'sobreestadia', 'scanner'].includes(field)) {
        // Campos booleanos
        processedValue = Boolean(newValue);
      }

      const { error } = await supabase
        .from('transportes')
        .update({ 
          [field]: processedValue,
          updated_at: new Date().toISOString(),
          updated_by: user?.id || null
        })
        .eq('id', record.id);

      if (error) {
        throw error;
      }

      // Actualizar el registro local
      setRowData(prev => prev.map(r => 
        r.id === record.id ? { ...r, [field]: processedValue } : r
      ));
    } catch (error) {
      console.error('Error actualizando transporte:', error);
      showError('Error al actualizar el transporte');
      // Revertir el cambio en el grid
      params.api.refreshCells({ rowNodes: [params.node] });
    }
  }, [user, showError]);

  // Función para borrar filas seleccionadas
  const handleDeleteSelectedRows = useCallback(async () => {
    if (selectedTransportes.length === 0) {
      showError('No hay transportes seleccionados');
      return;
    }

    const confirmDelete = window.confirm(
      `¿Estás seguro de eliminar ${selectedTransportes.length} transporte${selectedTransportes.length > 1 ? 's' : ''}?`
    );

    if (!confirmDelete) return;

    try {
      const supabase = createClient();
      const transporteIds = selectedTransportes.map(t => t.id).filter((id): id is string => Boolean(id));

      if (transporteIds.length === 0) {
        showError('No se encontraron IDs válidos para eliminar');
        return;
      }

      const { error } = await supabase
        .from('transportes')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: user?.id || null,
        })
        .in('id', transporteIds);

      if (error) {
        console.error('Error eliminando transportes:', error);
        showError('Error al eliminar los transportes');
        return;
      }

      // Recargar datos
      await loadTransportes();
      setSelectedTransportes([]);
      if (gridApi) {
        gridApi.deselectAll();
      }
      success(`${selectedTransportes.length} transporte${selectedTransportes.length > 1 ? 's' : ''} eliminado${selectedTransportes.length > 1 ? 's' : ''} correctamente`);
    } catch (error) {
      console.error('Error eliminando transportes:', error);
      showError('Error al eliminar los transportes');
    }
  }, [selectedTransportes, user, gridApi, loadTransportes, success, showError]);

  // Definir columnas del grid
  const columnDefs = useMemo<ColDef<TransporteRecord>[]>(() => [
    {
      colId: 'checkbox',
      headerName: '',
      width: 50,
      pinned: 'left',
      checkboxSelection: true,
      headerCheckboxSelection: true,
      suppressMovable: true,
      lockPosition: 'left',
      sortable: false,
      headerClass: 'ag-center-header',
    },
    {
      field: 'booking',
      headerName: 'Booking',
      width: 150,
      editable: canEdit,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: ICellRendererParams<TransporteRecord>) => {
        return <div style={{ textAlign: 'center', width: '100%' }}>{params.value || '—'}</div>;
      }
    },
    {
      field: 'contenedor',
      headerName: 'Contenedor',
      width: 130,
      editable: canEdit,
      filter: 'agTextColumnFilter'
    },
    {
      field: 'exportacion',
      headerName: 'Cliente',
      width: 150,
      editable: canEdit,
      filter: 'agTextColumnFilter'
    },
    {
      field: 'ref_cliente',
      headerName: 'Ref Cliente',
      width: 120,
      editable: canEdit,
      filter: 'agTextColumnFilter'
    },
    {
      field: 'naviera',
      headerName: 'Naviera',
      width: 150,
      editable: canEdit,
      filter: 'agTextColumnFilter'
    },
    {
      field: 'nave',
      headerName: 'Nave',
      width: 150,
      editable: canEdit,
      filter: 'agTextColumnFilter',
      valueGetter: (params) => {
        // Extraer solo el nombre de la nave, sin el viaje (si viene en formato "NAVE [VIAJE]")
        const nave = params.data?.nave || '';
        if (nave.includes('[')) {
          const match = nave.match(/^(.+?)\s*\[/);
          return match ? match[1].trim() : nave;
        }
        return nave;
      },
      valueSetter: (params) => {
        // Guardar solo el nombre de la nave sin el viaje
        const newNaveValue = params.newValue || '';
        if (params.data) {
          params.data.nave = newNaveValue;
        }
        return true;
      },
      cellRenderer: (params: ICellRendererParams<TransporteRecord>) => {
        const value = params.value || '';
        return <div style={{ textAlign: 'center', width: '100%' }}>{value || '—'}</div>;
      }
    },
    {
      field: 'viaje',
      headerName: 'Viaje',
      width: 120,
      editable: canEdit,
      filter: 'agTextColumnFilter',
      valueGetter: (params) => {
        // Priorizar el campo viaje del registro
        const viajeValue = params.data?.viaje;
        if (viajeValue !== undefined && viajeValue !== null && String(viajeValue).trim() !== '') {
          return String(viajeValue).trim();
        }
        // Si no existe en el campo viaje, extraerlo de la columna nave que puede tener formato "NAVE [VIAJE]" (solo para datos antiguos)
        const nave = params.data?.nave || '';
        const match = nave.match(/\[(.+?)\]/);
        return match ? match[1] : '';
      },
      valueSetter: (params) => {
        // Guardar el viaje editado directamente en el campo viaje
        const newViajeValue = params.newValue || '';
        if (params.data) {
          params.data.viaje = newViajeValue;
        }
        return true;
      },
      cellRenderer: (params: ICellRendererParams<TransporteRecord>) => {
        const value = params.value || '';
        return <div style={{ textAlign: 'center', width: '100%' }}>{value || '—'}</div>;
      }
    },
    {
      field: 'especie',
      headerName: 'Especie',
      width: 120,
      editable: canEdit,
      filter: 'agTextColumnFilter'
    },
    {
      field: 'deposito',
      headerName: 'Depósito',
      width: 120,
      editable: canEdit,
      filter: 'agTextColumnFilter'
    },
    {
      field: 'stacking',
      headerName: 'Inicio Stacking',
      width: 200,
      editable: canEdit,
      filter: 'agDateColumnFilter',
      cellEditor: 'dateTimeCellEditor',
      valueGetter: (params) => {
        if (!params.data?.stacking) return null;
        const date = new Date(params.data.stacking);
        return isNaN(date.getTime()) ? null : date;
      },
      valueParser: (params) => {
        if (!params.newValue) return null;
        const date = new Date(params.newValue);
        return isNaN(date.getTime()) ? null : date;
      },
      cellRenderer: (params: ICellRendererParams<TransporteRecord>) => {
        if (!params.value) return <div style={{ textAlign: 'center', width: '100%' }}>—</div>;
        const date = params.value instanceof Date ? params.value : new Date(params.value);
        if (isNaN(date.getTime())) return <div style={{ textAlign: 'center', width: '100%' }}>—</div>;
        const formatted = date.toLocaleDateString('es-CL') + ' ' + date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
        return <div style={{ textAlign: 'center', width: '100%' }}>{formatted}</div>;
      }
    },
    {
      field: 'fin_stacking',
      headerName: 'Fin Stacking',
      width: 200,
      editable: canEdit,
      filter: 'agDateColumnFilter',
      cellEditor: 'dateTimeCellEditor',
      valueGetter: (params) => {
        if (!params.data?.fin_stacking) return null;
        const date = new Date(params.data.fin_stacking);
        return isNaN(date.getTime()) ? null : date;
      },
      valueParser: (params) => {
        if (!params.newValue) return null;
        const date = new Date(params.newValue);
        return isNaN(date.getTime()) ? null : date;
      },
      cellRenderer: (params: ICellRendererParams<TransporteRecord>) => {
        if (!params.value) return <div style={{ textAlign: 'center', width: '100%' }}>—</div>;
        const date = params.value instanceof Date ? params.value : new Date(params.value);
        if (isNaN(date.getTime())) return <div style={{ textAlign: 'center', width: '100%' }}>—</div>;
        const formatted = date.toLocaleDateString('es-CL') + ' ' + date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
        return <div style={{ textAlign: 'center', width: '100%' }}>{formatted}</div>;
      }
    },
    {
      field: 'cut_off',
      headerName: 'Cut Off',
      width: 200,
      editable: canEdit,
      filter: 'agDateColumnFilter',
      cellEditor: 'dateTimeCellEditor',
      valueGetter: (params) => {
        if (!params.data?.cut_off) return null;
        const date = new Date(params.data.cut_off);
        return isNaN(date.getTime()) ? null : date;
      },
      valueParser: (params) => {
        if (!params.newValue) return null;
        const date = new Date(params.newValue);
        return isNaN(date.getTime()) ? null : date;
      },
      cellRenderer: (params: ICellRendererParams<TransporteRecord>) => {
        if (!params.value) return <div style={{ textAlign: 'center', width: '100%' }}>—</div>;
        const date = params.value instanceof Date ? params.value : new Date(params.value);
        if (isNaN(date.getTime())) return <div style={{ textAlign: 'center', width: '100%' }}>—</div>;
        const formatted = date.toLocaleDateString('es-CL') + ' ' + date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
        return <div style={{ textAlign: 'center', width: '100%' }}>{formatted}</div>;
      }
    },
    {
      field: 'transporte',
      headerName: 'Transportista',
      width: 150,
      editable: canEdit,
      filter: 'agTextColumnFilter'
    },
    {
      field: 'conductor',
      headerName: 'Conductor',
      width: 150,
      editable: canEdit,
      filter: 'agTextColumnFilter'
    },
    {
      field: 'patente',
      headerName: 'Patente',
      width: 120,
      editable: canEdit,
      filter: 'agTextColumnFilter'
    },
    {
      field: 'semana',
      headerName: 'Semana',
      width: 100,
      editable: canEdit,
      filter: 'agNumberColumnFilter',
      cellEditor: 'agNumberCellEditor'
    },
    {
      field: 'late',
      headerName: 'Late',
      width: 80,
      editable: canEdit,
      filter: 'agSetColumnFilter',
      cellRenderer: (params: ICellRendererParams<TransporteRecord>) => {
        return <div style={{ textAlign: 'center', width: '100%' }}>{params.value ? '✓' : '—'}</div>;
      },
      cellEditor: 'agCheckboxCellEditor'
    },
    {
      field: 'extra_late',
      headerName: 'Extra Late',
      width: 100,
      editable: canEdit,
      filter: 'agSetColumnFilter',
      cellRenderer: (params: ICellRendererParams<TransporteRecord>) => {
        return <div style={{ textAlign: 'center', width: '100%' }}>{params.value ? '✓' : '—'}</div>;
      },
      cellEditor: 'agCheckboxCellEditor'
    },
    {
      field: 'atmosfera_controlada',
      headerName: 'AT Controlada',
      width: 120,
      editable: canEdit,
      filter: 'agSetColumnFilter',
      cellRenderer: (params: ICellRendererParams<TransporteRecord>) => {
        return <div style={{ textAlign: 'center', width: '100%' }}>{params.value ? '✓' : '—'}</div>;
      },
      cellEditor: 'agCheckboxCellEditor'
    },
    {
      field: 'temperatura',
      headerName: 'Temp',
      width: 100,
      editable: canEdit,
      filter: 'agNumberColumnFilter',
      cellEditor: 'agNumberCellEditor'
    },
    {
      field: 'observaciones',
      headerName: 'Observaciones',
      width: 200,
      editable: canEdit,
      filter: 'agTextColumnFilter'
    }
  ], [canEdit]);

  const gridOptions: GridOptions<TransporteRecord> = useMemo(() => ({
    defaultColDef: {
      resizable: true,
      sortable: true,
      filter: true,
      editable: false,
      cellStyle: { 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        textAlign: 'center'
      },
      headerClass: 'ag-center-header',
    },
    rowSelection: 'multiple',
    suppressRowClickSelection: true,
    animateRows: true,
    rowHeight: 35,
    headerHeight: 40,
    onCellValueChanged,
    onSelectionChanged,
    components: {
      dateTimeCellEditor: DateTimeCellEditor,
    },
  }), [onCellValueChanged, onSelectionChanged, DateTimeCellEditor]);

  const getRowStyle = useCallback((params: any) => {
    if (params.node.isSelected()) {
      return {
        backgroundColor: theme === 'dark' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(59, 130, 246, 0.1)',
      };
    }
    return undefined;
  }, [theme]);

  const isSuperAdmin = currentUser?.email?.toLowerCase() === 'rodrigo.caceres@asli.cl' || 
                      currentUser?.email?.toLowerCase() === 'hans.vasquez@asli.cl';

  const toggleSidebar = () => setIsSidebarCollapsed((prev) => !prev);

  const Activity = (props: any) => (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
    </svg>
  );

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
        { label: 'Embarques', id: '/registros', icon: Ship, counter: registrosCount, tone: 'violet' },
        { label: 'Transportes', id: '/transportes', isActive: true, icon: Truck, counter: transportesCount, tone: 'sky' },
        { label: 'Documentos', id: '/documentos', icon: FileText },
        ...(currentUser && currentUser.rol !== 'cliente'
          ? [{ label: 'Generar Documentos', id: '/generar-documentos', icon: FileCheck }]
          : []),
        ...(isSuperAdmin
          ? [{ label: 'Seguimiento Marítimo', id: '/dashboard/seguimiento', icon: Globe }]
          : []),
        { label: 'Tracking Movs', id: '/dashboard/tracking', icon: Activity },
        ...(isSuperAdmin
          ? [
            { label: 'Finanzas', id: '/finanzas', icon: DollarSign },
            { label: 'Reportes', id: '/reportes', icon: BarChart3 },
          ]
          : []),
        { label: 'Itinerario', id: '/itinerario', icon: Ship },
      ],
    },
    {
      title: 'Sistema',
      items: [
        { label: 'Papelera', onClick: () => setIsTrashModalOpen(true), counter: trashCount, tone: 'violet', icon: Trash2 },
      ],
    },
    ...(isSuperAdmin
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

  if (loadingUser) {
    return <LoadingScreen message="Cargando transportes..." />;
  }

  if (!user) {
    return null;
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

      <Sidebar
        isSidebarCollapsed={isSidebarCollapsed}
        setIsSidebarCollapsed={setIsSidebarCollapsed}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        sections={sidebarSections}
        currentUser={currentUser}
        user={user}
        setShowProfileModal={setShowProfileModal}
      />

      {/* Content */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden h-full">
        <header className={`sticky top-0 z-40 border-b overflow-hidden ${theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white shadow-sm'}`}>
          <div className="flex flex-wrap items-center gap-3 pl-3 pr-2 sm:px-4 py-2">
            {/* Botón hamburguesa para móvil */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className={`lg:hidden flex h-9 w-9 items-center justify-center border transition-colors flex-shrink-0 ${theme === 'dark'
                ? 'text-slate-300 hover:bg-slate-700 border-slate-700/60'
                : 'text-gray-600 hover:bg-gray-100 border-gray-300'
                }`}
              aria-label="Abrir menú"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            {/* Botón para expandir sidebar colapsado en desktop */}
            {isSidebarCollapsed && (
              <button
                onClick={toggleSidebar}
                className={`hidden lg:flex h-9 w-9 items-center justify-center border transition-colors flex-shrink-0 ${theme === 'dark'
                  ? 'text-slate-300 hover:bg-slate-700 border-slate-700/60'
                  : 'text-gray-600 hover:bg-gray-100 border-gray-300'
                  }`}
                aria-label="Expandir menú lateral"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            )}

            <div className="flex items-center gap-2 sm:gap-3">
              <div className={`hidden sm:flex h-10 w-10 items-center justify-center border ${theme === 'dark' ? 'bg-sky-500/15 border-sky-500/20' : 'bg-blue-100 border-blue-200'}`}>
                <Truck className={`h-6 w-6 ${theme === 'dark' ? 'text-sky-300' : 'text-blue-600'}`} />
              </div>
              <div>
                <p className={`text-[10px] sm:text-[11px] uppercase tracking-[0.2em] sm:tracking-[0.3em] ${theme === 'dark' ? 'text-slate-500/80' : 'text-gray-500'}`}>Módulo Operativo</p>
                <h1 className={`text-lg sm:text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Transportes Terrestres</h1>
                <p className={`text-[11px] sm:text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>Registro y coordinación de transportes</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-3 ml-auto">
              <button
                onClick={() => setShowProfileModal(true)}
                className={`hidden sm:flex items-center gap-2 border px-3 py-2 text-xs sm:text-sm ${theme === 'dark'
                  ? 'border-slate-700/60 text-slate-300 hover:border-sky-400/60 hover:text-sky-200 bg-slate-800/60'
                  : 'border-gray-300 text-gray-700 hover:border-blue-400 hover:text-blue-600 bg-white'
                  }`}
                title={currentUser?.nombre || user?.email}
              >
                <UserIcon className="h-4 w-4" />
                {currentUser?.nombre || user?.email}
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-hidden min-w-0 w-full flex flex-col">
          <div className="flex-1 overflow-hidden min-w-0 flex flex-col">
            <div className="mx-auto w-full max-w-full px-2 pt-2 sm:px-3 sm:pt-3 flex-1 flex flex-col min-h-0 relative">
              {/* Barra de herramientas */}
              <div className={`flex items-center justify-between gap-2 mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                <div className="flex items-center gap-2">
                  {canAdd && (
                    <button
                      onClick={() => {
                        // TODO: Abrir modal para agregar transporte
                        success('Funcionalidad de agregar transporte próximamente');
                      }}
                      className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium transition ${theme === 'dark'
                        ? 'bg-sky-600 hover:bg-sky-500 text-white'
                        : 'bg-blue-600 hover:bg-blue-500 text-white'
                      }`}
                    >
                      <Plus className="h-4 w-4" />
                      Nuevo
                    </button>
                  )}
                  <button
                    onClick={loadTransportes}
                    disabled={isLoading}
                    className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium transition ${theme === 'dark'
                      ? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                    } disabled:opacity-50`}
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    Actualizar
                  </button>
                  {canEdit && selectedTransportes.length > 0 && (
                    <button
                      onClick={handleDeleteSelectedRows}
                      className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium transition ${theme === 'dark'
                        ? 'bg-red-600 hover:bg-red-500 text-white'
                        : 'bg-red-600 hover:bg-red-500 text-white'
                      }`}
                    >
                      <Trash2 className="h-4 w-4" />
                      Borrar ({selectedTransportes.length})
                    </button>
                  )}
                </div>
                <div className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                  {rowData.length} transporte{rowData.length !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Grid de ag-grid */}
              <div 
                className={`flex-1 ${theme === 'dark' ? 'ag-theme-quartz-dark' : 'ag-theme-quartz'}`}
                style={{
                  backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                  height: '100%',
                  width: '100%'
                }}
              >
                {isLoading && rowData.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="flex items-center gap-3">
                      <RefreshCw className={`h-5 w-5 animate-spin ${theme === 'dark' ? 'text-sky-400' : 'text-blue-600'}`} />
                      <span className={theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}>Cargando transportes...</span>
                    </div>
                  </div>
                ) : (
                  <AgGridReact<TransporteRecord>
                    ref={gridRef}
                    rowData={rowData}
                    columnDefs={columnDefs}
                    gridOptions={gridOptions}
                    onGridReady={onGridReady}
                    onSelectionChanged={onSelectionChanged}
                    getRowStyle={getRowStyle}
                    style={{ height: '100%', width: '100%' }}
                  />
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Modal de perfil de usuario */}
      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        userInfo={currentUser}
        onUserUpdate={(updatedUser) => {
          setCurrentUser({ ...currentUser, ...updatedUser });
        }}
      />
    </div>
  );
}
