'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { User } from '@supabase/supabase-js';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridOptions, GridReadyEvent, ICellRendererParams, ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

// Registrar todos los módulos de AG Grid Community
ModuleRegistry.registerModules([AllCommunityModule]);
import { ThemeToggle } from '@/components/ThemeToggle';
import { UserProfileModal } from '@/components/UserProfileModal';
import { 
  LogOut, 
  User as UserIcon, 
  ArrowLeft,
  Download,
  Settings,
  Grid3x3,
  Filter,
  RefreshCw
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/hooks/useToast';
import { Registro } from '@/types/registros';
import { convertSupabaseToApp } from '@/lib/migration-utils';

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
  const [gridOptions, setGridOptions] = useState<GridOptions>({
    pagination: true,
    paginationPageSize: 10,
    paginationPageSizeSelector: [10, 20, 50, 100],
    defaultColDef: {
      sortable: true,
      filter: true,
      resizable: true,
    },
  });

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
          .eq('id', currentUser.id)
          .single();

        if (!error && userData) {
          setUserInfo(userData);
        }

        // Cargar registros
        await loadRegistros();
      } catch (error) {
        console.error('Error checking user:', error);
        router.push('/auth');
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, [router, loadRegistros]);

  useEffect(() => {
    // Ajustar tema según el tema del sistema
    if (theme === 'dark') {
      setSelectedTheme('quartz-dark');
    } else {
      setSelectedTheme('quartz');
    }
  }, [theme]);

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
      field: 'refAsli',
      headerName: 'REF ASLI',
      width: 120,
      pinned: 'left',
      checkboxSelection: true,
      headerCheckboxSelection: true,
      filter: 'agTextColumnFilter',
    },
    {
      field: 'shipper',
      headerName: 'Cliente',
      width: 150,
      filter: 'agTextColumnFilter',
    },
    {
      field: 'ejecutivo',
      headerName: 'Ejecutivo',
      width: 120,
      filter: 'agSetColumnFilter',
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
      width: 120,
      filter: 'agSetColumnFilter',
    },
    {
      field: 'naveInicial',
      headerName: 'Nave',
      width: 120,
      filter: 'agTextColumnFilter',
    },
    {
      field: 'especie',
      headerName: 'Especie',
      width: 120,
      filter: 'agSetColumnFilter',
    },
    {
      field: 'pol',
      headerName: 'POL',
      width: 120,
      filter: 'agSetColumnFilter',
    },
    {
      field: 'pod',
      headerName: 'POD',
      width: 120,
      filter: 'agSetColumnFilter',
    },
    {
      field: 'deposito',
      headerName: 'Depósito',
      width: 120,
      filter: 'agSetColumnFilter',
    },
    {
      field: 'etd',
      headerName: 'ETD',
      width: 120,
      filter: 'agDateColumnFilter',
      valueFormatter: (params) => {
        if (!params.value) return '';
        return new Date(params.value).toLocaleDateString('es-CL');
      },
    },
    {
      field: 'eta',
      headerName: 'ETA',
      width: 120,
      filter: 'agDateColumnFilter',
      valueFormatter: (params) => {
        if (!params.value) return '';
        return new Date(params.value).toLocaleDateString('es-CL');
      },
    },
    {
      field: 'estado',
      headerName: 'Estado',
      width: 120,
      filter: 'agSetColumnFilter',
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
      filter: 'agSetColumnFilter',
    },
    {
      field: 'temperatura',
      headerName: 'Temp (°C)',
      width: 100,
      filter: 'agNumberColumnFilter',
      valueFormatter: (params) => {
        return params.value ? `${params.value}°C` : '';
      },
    },
    {
      field: 'cbm',
      headerName: 'CBM',
      width: 100,
      filter: 'agNumberColumnFilter',
    },
  ], []);

  const onGridReady = (params: GridReadyEvent) => {
    console.log('Grid ready:', params);
  };

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-50 border-b ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className={`p-2 rounded-lg transition-colors ${
                  theme === 'dark' ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center space-x-2">
                <Grid3x3 className={`w-6 h-6 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                <h1 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Tablas Personalizadas
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <ThemeToggle />
              <button
                onClick={() => setShowProfileModal(true)}
                className={`p-2 rounded-lg transition-colors ${
                  theme === 'dark' ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                <UserIcon className="w-5 h-5" />
              </button>
              <button
                onClick={handleLogout}
                className={`p-2 rounded-lg transition-colors ${
                  theme === 'dark' ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Controls */}
        <div className={`mb-6 p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleRefreshData}
                disabled={loadingData}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  loadingData
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : theme === 'dark'
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${loadingData ? 'animate-spin' : ''}`} />
                <span>{loadingData ? 'Cargando...' : 'Recargar Datos'}</span>
              </button>
              <button
                onClick={handleExportCSV}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Exportar CSV</span>
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Total: {rowData.length} registros
              </span>
            </div>
          </div>
        </div>

        {/* AG Grid */}
        {loadingData ? (
          <div className={`flex items-center justify-center h-[600px] ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg`}>
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Cargando registros...</p>
            </div>
          </div>
        ) : (
          <div className={`${selectedTheme} ${theme === 'dark' ? 'ag-theme-quartz-dark' : 'ag-theme-quartz'}`} style={{ height: '600px', width: '100%' }}>
            <AgGridReact
              rowData={rowData}
              columnDefs={columnDefs}
              gridOptions={gridOptions}
              onGridReady={onGridReady}
              rowSelection="multiple"
              animateRows={true}
              suppressRowClickSelection={true}
            />
          </div>
        )}

        {/* Info Section */}
        <div className={`mt-6 p-6 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
          <h2 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Tabla de Registros con AG Grid
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <h3 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Filtrado Avanzado
              </h3>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                Filtros por texto, números, fechas y conjuntos. Cada columna tiene su propio filtro personalizable.
              </p>
            </div>
            <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <h3 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Ordenamiento
              </h3>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                Ordena por una o múltiples columnas. Clic en el header para ordenar ascendente/descendente.
              </p>
            </div>
            <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <h3 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Selección Múltiple
              </h3>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                Selecciona filas individuales o todas con el checkbox del header. Ideal para operaciones en lote.
              </p>
            </div>
            <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <h3 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Paginación
              </h3>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                Navega entre páginas y ajusta el tamaño de página (10, 20, 50, 100 registros).
              </p>
            </div>
            <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <h3 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Resize de Columnas
              </h3>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                Ajusta el ancho de las columnas arrastrando el borde. Columnas pueden ser fijadas (pinned).
              </p>
            </div>
            <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <h3 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Renderizado Personalizado
              </h3>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                Celdas personalizadas con colores, iconos y formatos según el valor de los datos.
              </p>
            </div>
          </div>
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
    </div>
  );
}

