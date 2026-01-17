'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import type { User } from '@supabase/supabase-js';
import { Search, RefreshCcw, Truck, Plus, ChevronLeft, ChevronRight, Ship, Globe, FileText, LayoutDashboard, Settings, X, Menu, User as UserIcon } from 'lucide-react';
import { TransporteRecord, fetchTransportes } from '@/lib/transportes-service';
import { transportesColumns, transportesSections } from '@/components/transportes/columns';
import { AddTransporteModal } from '@/components/transportes/AddTransporteModal';
import { useUser } from '@/hooks/useUser';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { UserProfileModal } from '@/components/users/UserProfileModal';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { EditingCellProvider } from '@/contexts/EditingCellContext';
import { InlineEditCell } from '@/components/transportes/InlineEditCell';

const dateKeys = new Set<keyof TransporteRecord>([
  'stacking',
  'fin_stacking',
  'cut_off',
  'fecha_planta',
  'created_at',
  'updated_at',
]);

function formatValue(item: TransporteRecord, key: keyof TransporteRecord) {
  const value = item[key];
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  if (dateKeys.has(key) && typeof value === 'string') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString('es-CL');
    }
  }

  if (typeof value === 'boolean') {
    return value ? 'Sí' : 'No';
  }

  return String(value);
}

export default function TransportesPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [records, setRecords] = useState<TransporteRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const { canAdd, setCurrentUser, currentUser } = useUser();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkUser = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user: currentUser },
          error,
        } = await supabase.auth.getUser();

        if (!isMounted) return;

        if (error) {
          if (error.message?.includes('Refresh Token') || error.message?.includes('JWT')) {
            await supabase.auth.signOut();
            router.push('/auth');
            return;
          }
          throw error;
        }

        if (!currentUser) {
          router.push('/auth');
          return;
        }

        setUser(currentUser);

        const { data: userInfo } = await supabase
          .from('usuarios')
          .select('*')
          .eq('auth_user_id', currentUser.id)
          .single();

        if (userInfo && isMounted) {
          setCurrentUser(userInfo);
        }
      } catch (error: any) {
        if (!isMounted) return;
        if (!error?.message?.includes('Refresh Token') && !error?.message?.includes('JWT')) {
          console.error('[Transportes] Error comprobando usuario:', error);
        }
        router.push('/auth');
      } finally {
        if (isMounted) {
          setLoadingUser(false);
        }
      }
    };

    void checkUser();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]); // setCurrentUser es estable desde useUser hook

  useEffect(() => {
    let isMounted = true;

    const loadTransportes = async () => {
      if (!user) {
        if (isMounted) {
          setIsLoading(false);
        }
        return;
      }

      try {
        if (isMounted) {
          setIsLoading(true);
        }
        const data = await fetchTransportes();
        if (isMounted) {
          setRecords(data || []);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('[Transportes] Error cargando transportes:', error);
        if (isMounted) {
          setRecords([]);
          setIsLoading(false);
        }
      }
    };

    void loadTransportes();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const reload = async () => {
    try {
      setIsLoading(true);
      const data = await fetchTransportes();
      setRecords(data);
    } catch (error) {
      console.error('[Transportes] Error recargando transportes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateRecord = async (updatedRecord: TransporteRecord) => {
    // Si se desactiva AT CONTROLADA, limpiar CO2 y O2
    if (updatedRecord.atmosfera_controlada === false && records.find(r => r.id === updatedRecord.id)?.atmosfera_controlada === true) {
      const supabase = createClient();
      await supabase
        .from('transportes')
        .update({ co2: null, o2: null })
        .eq('id', updatedRecord.id);
      updatedRecord.co2 = null;
      updatedRecord.o2 = null;
    }
    
    setRecords((prev) =>
      prev.map((r) => (r.id === updatedRecord.id ? updatedRecord : r))
    );
  };

  const handleToggleAtmosferaControlada = async (record: TransporteRecord, checked: boolean) => {
    const supabase = createClient();
    const updateData: Partial<TransporteRecord> = {
      atmosfera_controlada: checked,
    };
    
    // Si se desactiva, limpiar CO2 y O2
    if (!checked) {
      updateData.co2 = null;
      updateData.o2 = null;
    }
    
    const { error } = await supabase
      .from('transportes')
      .update(updateData)
      .eq('id', record.id);
    
    if (error) {
      console.error('Error actualizando atmosfera controlada:', error);
      return;
    }
    
    handleUpdateRecord({ ...record, ...updateData });
  };

  const handleToggleLate = async (record: TransporteRecord, checked: boolean) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('transportes')
      .update({ late: checked })
      .eq('id', record.id);
    
    if (error) {
      console.error('Error actualizando late:', error);
      return;
    }
    
    handleUpdateRecord({ ...record, late: checked });
  };

  const handleToggleExtraLate = async (record: TransporteRecord, checked: boolean) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('transportes')
      .update({ extra_late: checked })
      .eq('id', record.id);
    
    if (error) {
      console.error('Error actualizando extra_late:', error);
      return;
    }
    
    handleUpdateRecord({ ...record, extra_late: checked });
  };

  const handleToggleBoolean = async (record: TransporteRecord, field: keyof TransporteRecord, checked: boolean) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('transportes')
      .update({ [field]: checked })
      .eq('id', record.id);
    
    if (error) {
      console.error(`Error actualizando ${String(field)}:`, error);
      return;
    }
    
    handleUpdateRecord({ ...record, [field]: checked });
  };

  const handleToggleRowSelection = (recordId: string) => {
    setSelectedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(recordId)) {
        newSet.delete(recordId);
      } else {
        newSet.add(recordId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedRows.size === filteredRecords.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filteredRecords.map((r) => r.id)));
    }
  };

  const filteredRecords = useMemo(() => {
    if (!searchTerm.trim()) {
      return records;
    }

    const term = searchTerm.toLowerCase().trim();
    return records.filter((record) => {
      return (
        record.booking?.toLowerCase().includes(term) ||
        record.contenedor?.toLowerCase().includes(term) ||
        record.conductor?.toLowerCase().includes(term) ||
        record.transportes?.toLowerCase().includes(term) ||
        record.patentes?.toLowerCase().includes(term) ||
        record.nave?.toLowerCase().includes(term) ||
        record.planta?.toLowerCase().includes(term) ||
        record.deposito?.toLowerCase().includes(term) ||
        record.guia_despacho?.toLowerCase().includes(term)
      );
    });
  }, [records, searchTerm]);

  const toggleSidebar = () => setIsSidebarCollapsed((prev) => !prev);

  const toneBadgeClasses = {
    sky: 'bg-sky-500/20 text-sky-300',
    violet: 'bg-violet-500/20 text-violet-300',
    emerald: 'bg-emerald-500/20 text-emerald-300',
  } as const;

  type SidebarNavItem = {
    label: string;
    id?: string;
    counter?: number;
    tone?: keyof typeof toneBadgeClasses;
    isActive?: boolean;
    onClick?: () => void;
    icon?: React.ComponentType<{ className?: string }>;
  };

  type SidebarSection = {
    title: string;
    items: SidebarNavItem[];
  };

  const isRodrigo = currentUser?.email?.toLowerCase() === 'rodrigo.caceres@asli.cl';

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
        { label: 'Embarques', id: '/registros', icon: Ship },
        { label: 'Transportes', id: '/transportes', isActive: true, icon: Truck },
        { label: 'Documentos', id: '/documentos', icon: FileText },
        { label: 'Tracking', id: '/dashboard/seguimiento', icon: Globe },
      ],
    },
    ...(isRodrigo
      ? [
          {
            title: 'Mantenimiento',
            items: [{ label: 'Usuarios', id: '/mantenimiento', icon: Settings }],
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
    <EditingCellProvider>
      <div className={`flex h-screen overflow-hidden ${theme === 'dark' ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100' : 'bg-gray-50 text-gray-900'}`}>
        {/* Overlay para móvil */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed lg:sticky left-0 top-0 z-50 lg:z-auto flex h-full flex-col transition-all duration-300 ${theme === 'dark' ? 'border-r border-slate-700 bg-slate-800' : 'border-r border-gray-200 bg-white shadow-lg'} ${
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          } ${
            isSidebarCollapsed && !isMobileMenuOpen ? 'lg:w-0 lg:opacity-0 lg:overflow-hidden lg:border-r-0' : 'w-64 lg:opacity-100'
          }`}
        >
          <div className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 sm:py-4 ${theme === 'dark' ? 'border-b border-slate-700 bg-slate-800' : 'border-b border-gray-200 bg-white'} sticky top-0 z-10 overflow-hidden`}>
            {/* Botón cerrar móvil */}
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className={`lg:hidden absolute right-3 flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${theme === 'dark' ? 'text-slate-300 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-100'}`}
              aria-label="Cerrar menú"
            >
              <X className="h-5 w-5" />
            </button>

            {(!isSidebarCollapsed || isMobileMenuOpen) && (
              <>
                <div className={`h-9 w-9 sm:h-10 sm:w-10 overflow-hidden rounded-lg flex-shrink-0 ${theme === 'dark' ? 'bg-slate-700' : 'bg-gray-100'} flex items-center justify-center`}>
                  <img
                    src="https://asli.cl/img/logo.png?v=1761679285274&t=1761679285274"
                    alt="ASLI Gestión Logística"
                    className="h-7 w-7 sm:h-8 sm:w-8 object-contain"
                    onError={(event) => {
                      event.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <p className={`text-xs sm:text-sm font-semibold truncate ${theme === 'dark' ? 'text-slate-200' : 'text-gray-800'}`}>ASLI Gestión Logística</p>
                  <p className={`text-[10px] sm:text-xs truncate ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>Plataforma Operativa</p>
                </div>
              </>
            )}
            {!isSidebarCollapsed && !isMobileMenuOpen && (
              <button
                onClick={toggleSidebar}
                className={`hidden lg:flex h-8 w-8 items-center justify-center rounded-lg border flex-shrink-0 ${theme === 'dark' ? 'border-slate-700/60 bg-slate-900/60 text-slate-300 hover:border-sky-500/60 hover:text-sky-200' : 'border-gray-300 bg-gray-100 text-gray-600 hover:border-blue-400 hover:text-blue-700'} transition`}
                aria-label="Contraer menú lateral"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
          </div>

          {(!isSidebarCollapsed || isMobileMenuOpen) && (
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-4 py-4 sm:py-6 space-y-6 sm:space-y-8">
              {sidebarSections.map((section) => (
                <div key={section.title} className="space-y-2 sm:space-y-3">
                  <p className={`text-[10px] sm:text-xs uppercase tracking-[0.25em] sm:tracking-[0.3em] truncate ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>{section.title}</p>
                  <div className="space-y-1 sm:space-y-1.5 overflow-y-visible">
                    {section.items.map((item) => {
                      const isActive = item.isActive || false;
                      return (
                        <button
                          key={item.label}
                          onClick={() => {
                            if (item.onClick) {
                              item.onClick();
                              setIsMobileMenuOpen(false);
                            } else if (item.id) {
                              router.push(item.id);
                              setIsMobileMenuOpen(false);
                            }
                          }}
                          className={`group w-full text-left flex items-center justify-between rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 transition-colors min-w-0 ${
                            isActive
                              ? 'bg-blue-600 text-white'
                              : theme === 'dark'
                                ? 'hover:bg-slate-700 text-slate-300'
                                : 'hover:bg-blue-50 text-blue-600 font-semibold'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {item.icon && (
                              <item.icon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                            )}
                            <span className={`text-xs sm:text-sm font-semibold truncate flex-1 min-w-0 ${
                              isActive
                                ? '!text-white'
                                : theme !== 'dark'
                                  ? '!text-blue-600'
                                  : ''
                            }`}>{item.label}</span>
                          </div>
                          {item.counter !== undefined && item.tone && (
                            <span className={`text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 rounded-full flex-shrink-0 ml-1.5 ${toneBadgeClasses[item.tone]}`}>
                              {item.counter}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              <div className="space-y-2 sm:space-y-3">
                <p className={`text-[10px] sm:text-xs uppercase tracking-[0.25em] sm:tracking-[0.3em] truncate ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Preferencias</p>
                <ThemeToggle variant="switch" label="Tema" />
              </div>
            </div>
          )}
        </aside>

        {/* Content */}
        <div className="flex flex-1 flex-col min-w-0 overflow-hidden h-full">
          <header className={`sticky top-0 z-40 border-b overflow-hidden ${theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white shadow-sm'}`}>
            <div className="flex flex-wrap items-center gap-4 px-4 sm:px-6 py-3 sm:py-4">
              {/* Botón hamburguesa para móvil */}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className={`lg:hidden flex h-9 w-9 items-center justify-center rounded-lg transition-colors flex-shrink-0 ${
                  theme === 'dark' 
                    ? 'text-slate-300 hover:bg-slate-700' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                aria-label="Abrir menú"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              {/* Botón para expandir sidebar colapsado en desktop */}
              {isSidebarCollapsed && (
                <button
                  onClick={toggleSidebar}
                  className={`hidden lg:flex h-9 w-9 items-center justify-center rounded-lg transition-colors flex-shrink-0 ${
                    theme === 'dark' 
                      ? 'text-slate-300 hover:bg-slate-700 border border-slate-700' 
                      : 'text-gray-600 hover:bg-gray-100 border border-gray-300'
                  }`}
                  aria-label="Expandir menú lateral"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              )}

              <div className="flex items-center gap-3 sm:gap-4">
                <div className={`hidden sm:flex h-12 w-12 items-center justify-center rounded-xl ${theme === 'dark' ? 'bg-sky-500/15' : 'bg-blue-100'}`}>
                  <Truck className={`h-7 w-7 ${theme === 'dark' ? 'text-sky-300' : 'text-blue-600'}`} />
                </div>
                <div>
                  <p className={`text-[10px] sm:text-[11px] uppercase tracking-[0.3em] sm:tracking-[0.4em] ${theme === 'dark' ? 'text-slate-500/80' : 'text-gray-500'}`}>Módulo Operativo</p>
                  <h1 className={`text-xl sm:text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Transportes Terrestres</h1>
                  <p className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>Registro y coordinación de transportes de contenedores y mercancías</p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 ml-auto">
                <button
                  type="button"
                  onClick={reload}
                  disabled={isLoading}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs sm:text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    theme === 'dark'
                      ? 'border-slate-800/70 text-slate-300 hover:border-sky-400/60 hover:text-sky-200'
                      : 'border-gray-300 text-gray-700 hover:border-blue-400 hover:text-blue-600 bg-white shadow-sm'
                  }`}
                >
                  <RefreshCcw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Actualizar</span>
                </button>
                {canAdd && (
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className={`inline-flex items-center gap-2 rounded-full px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 ${
                      theme === 'dark'
                        ? 'bg-gradient-to-r from-sky-500 to-indigo-500 shadow-sky-500/20 focus:ring-sky-500/50'
                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-blue-500/20 focus:ring-blue-500/50'
                    }`}
                  >
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Nuevo Transporte</span>
                    <span className="sm:hidden">Nuevo</span>
                  </button>
                )}
                <button
                  onClick={() => setShowProfileModal(true)}
                  className={`hidden sm:flex items-center gap-2 rounded-full border px-3 py-2 text-xs sm:text-sm ${
                    theme === 'dark'
                      ? 'border-slate-800/70 text-slate-300 hover:border-sky-400/60 hover:text-sky-200'
                      : 'border-gray-300 text-gray-700 hover:border-blue-400 hover:text-blue-600 bg-white shadow-sm'
                  }`}
                >
                  <UserIcon className="h-4 w-4" />
                  {currentUser?.nombre || user?.email}
                </button>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 w-full">
            <div className="mx-auto w-full max-w-[1600px] px-4 pb-10 pt-4 space-y-4 sm:px-6 sm:pt-6 sm:space-y-6 lg:px-8 lg:space-y-6 xl:px-10 xl:space-y-8">
              {/* Búsqueda */}
              <section className={`rounded-3xl border shadow-xl backdrop-blur-xl p-5 ${
                theme === 'dark'
                  ? 'border-slate-800/70 bg-slate-950/70 shadow-slate-950/30'
                  : 'border-gray-200 bg-white shadow-md'
              }`}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className={`text-[11px] uppercase tracking-[0.25em] mb-1 ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>Búsqueda y Filtros</p>
                    <p className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {filteredRecords.length} de {records.length} registros
                    </p>
                    <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                      Busca por booking, contenedor, conductor, patentes o cualquier campo
                    </p>
                  </div>
                  <div className="relative w-full sm:max-w-md">
                    <Search className={`pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`} />
                    <input
                      type="search"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Buscar por booking, contenedor, conductor, patentes..."
                      className={`w-full rounded-xl border px-10 py-2.5 text-sm focus:outline-none focus:ring-2 transition-colors ${
                        theme === 'dark'
                          ? 'border-slate-800/70 bg-slate-900/80 text-slate-100 placeholder:text-slate-500 focus:border-sky-500/70 focus:ring-sky-500/30'
                          : 'border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500/30 shadow-sm'
                      }`}
                    />
                  </div>
                </div>
              </section>

              {/* Tabla principal */}
              <section className={`rounded-3xl border shadow-xl backdrop-blur-xl overflow-hidden w-full ${
                theme === 'dark'
                  ? 'border-slate-800/70 bg-slate-950/70 shadow-slate-950/30'
                  : 'border-gray-200 bg-white shadow-md'
              }`}>
                <div className="max-h-[70vh] overflow-y-auto overflow-x-auto">
                  <table className={`min-w-full divide-y ${
                    theme === 'dark' ? 'divide-slate-800/60' : 'divide-gray-200'
                  }`}>
                    <thead className={`sticky top-0 z-10 backdrop-blur-sm border-b ${
                      theme === 'dark'
                        ? 'bg-slate-900/95 border-slate-800/60'
                        : 'bg-white border-gray-200'
                    }`}>
                      {/* Primera fila: Títulos de sección */}
                      <tr>
                        <th
                          rowSpan={2}
                          scope="col"
                          className={`px-4 py-4 text-left border-r ${
                            theme === 'dark' ? 'border-slate-800/60' : 'border-gray-200'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedRows.size === filteredRecords.length && filteredRecords.length > 0}
                            onChange={handleSelectAll}
                            className={`h-4 w-4 rounded focus:ring-2 cursor-pointer ${
                              theme === 'dark'
                                ? 'border-slate-600 bg-slate-800 text-sky-500 focus:ring-sky-500/50'
                                : 'border-gray-300 bg-white text-blue-600 focus:ring-blue-500/50'
                            }`}
                          />
                        </th>
                        {transportesSections.map((section) => (
                          <th
                            key={section.name}
                            colSpan={section.columns.length}
                            scope="colgroup"
                            className={`px-4 py-3 text-center text-xs font-bold uppercase tracking-wider border-r ${
                              theme === 'dark'
                                ? 'text-slate-300 bg-slate-800/80 border-slate-800/60'
                                : 'text-gray-800 bg-gray-100 border-gray-200'
                            }`}
                          >
                            {section.name}
                          </th>
                        ))}
                      </tr>
                      {/* Segunda fila: Nombres de columnas individuales */}
                      <tr>
                        {transportesSections.map((section) =>
                          section.columns.map((column) => (
                            <th
                              key={`${section.name}-${column.header}`}
                              scope="col"
                              className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap border-r ${
                                theme === 'dark'
                                  ? 'text-slate-400 bg-slate-900/60 border-slate-800/60'
                                  : 'text-gray-600 bg-gray-50 border-gray-200'
                              }`}
                            >
                              {column.header}
                            </th>
                          ))
                        )}
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${
                      theme === 'dark'
                        ? 'divide-slate-800/60 bg-slate-950/50'
                        : 'divide-gray-200 bg-gray-50'
                    }`}>
                      {isLoading ? (
                        <tr>
                          <td
                            colSpan={transportesColumns.length + 1}
                            className={`px-4 py-12 text-center text-sm ${
                              theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
                            }`}
                          >
                            <div className="flex items-center justify-center gap-3">
                              <RefreshCcw className={`h-5 w-5 animate-spin ${
                                theme === 'dark' ? 'text-sky-400' : 'text-blue-600'
                              }`} />
                              <span className={theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}>Cargando transportes...</span>
                            </div>
                          </td>
                        </tr>
                      ) : filteredRecords.length === 0 ? (
                        <tr>
                          <td
                            colSpan={transportesColumns.length + 1}
                            className={`px-4 py-12 text-center text-sm ${
                              theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
                            }`}
                          >
                            <div className="flex flex-col items-center gap-2">
                              <p className={theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}>
                                {searchTerm
                                  ? 'No se encontraron registros que coincidan con la búsqueda.'
                                  : 'No hay registros de transporte disponibles.'}
                              </p>
                              {searchTerm && (
                                <button
                                  onClick={() => setSearchTerm('')}
                                  className={`text-xs underline ${
                                    theme === 'dark'
                                      ? 'text-sky-400 hover:text-sky-300'
                                      : 'text-blue-600 hover:text-blue-700'
                                  }`}
                                >
                                  Limpiar búsqueda
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredRecords.map((item) => (
                          <tr
                            key={item.id}
                            className={`transition-colors ${
                              theme === 'dark'
                                ? `hover:bg-slate-900/60 ${selectedRows.has(item.id) ? 'bg-slate-800/40' : ''}`
                                : `hover:bg-gray-100 ${selectedRows.has(item.id) ? 'bg-blue-50' : ''}`
                            }`}
                          >
                            <td className="px-4 py-4">
                              <input
                                type="checkbox"
                                checked={selectedRows.has(item.id)}
                                onChange={() => handleToggleRowSelection(item.id)}
                                className={`h-4 w-4 rounded focus:ring-2 cursor-pointer ${
                                  theme === 'dark'
                                    ? 'border-slate-600 bg-slate-800 text-sky-500 focus:ring-sky-500/50'
                                    : 'border-gray-300 bg-white text-blue-600 focus:ring-blue-500/50'
                                }`}
                              />
                            </td>
                            {transportesColumns.map((column) => {
                              // Checkbox especial para AT CONTROLADA
                              if (column.key === 'atmosfera_controlada') {
                                return (
                                  <td
                                    key={`${item.id}-${column.header}`}
                                    className={`px-4 py-4 text-sm whitespace-nowrap ${
                                      theme === 'dark' ? 'text-slate-200' : 'text-gray-900'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={item.atmosfera_controlada || false}
                                      onChange={(e) => handleToggleAtmosferaControlada(item, e.target.checked)}
                                      className={`h-4 w-4 rounded cursor-pointer ${
                                        theme === 'dark'
                                          ? 'border-slate-600 bg-slate-800 text-sky-500 focus:ring-sky-500/50'
                                          : 'border-gray-300 bg-white text-blue-600 focus:ring-blue-500/50'
                                      }`}
                                    />
                                  </td>
                                );
                              }
                              
                              // Checkbox especial para LATE
                              if (column.key === 'late') {
                                return (
                                  <td
                                    key={`${item.id}-${column.header}`}
                                    className={`px-4 py-4 text-sm whitespace-nowrap ${
                                      theme === 'dark' ? 'text-slate-200' : 'text-gray-900'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={item.late || false}
                                      onChange={(e) => handleToggleLate(item, e.target.checked)}
                                      className={`h-4 w-4 rounded cursor-pointer ${
                                        theme === 'dark'
                                          ? 'border-slate-600 bg-slate-800 text-sky-500 focus:ring-sky-500/50'
                                          : 'border-gray-300 bg-white text-blue-600 focus:ring-blue-500/50'
                                      }`}
                                    />
                                  </td>
                                );
                              }
                              
                              // Checkbox especial para EXTRA LATE
                              if (column.key === 'extra_late') {
                                return (
                                  <td
                                    key={`${item.id}-${column.header}`}
                                    className={`px-4 py-4 text-sm whitespace-nowrap ${
                                      theme === 'dark' ? 'text-slate-200' : 'text-gray-900'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={item.extra_late || false}
                                      onChange={(e) => handleToggleExtraLate(item, e.target.checked)}
                                      className={`h-4 w-4 rounded cursor-pointer ${
                                        theme === 'dark'
                                          ? 'border-slate-600 bg-slate-800 text-sky-500 focus:ring-sky-500/50'
                                          : 'border-gray-300 bg-white text-blue-600 focus:ring-blue-500/50'
                                      }`}
                                    />
                                  </td>
                                );
                              }
                              
                              // Checkboxes booleanos adicionales
                              const booleanCheckboxes = ['porteo', 'ingresado_stacking', 'sobreestadia', 'scanner'];
                              if (booleanCheckboxes.includes(column.key)) {
                                const checkboxValue = item[column.key] as boolean | null;
                                return (
                                  <td
                                    key={`${item.id}-${column.header}`}
                                    className={`px-4 py-4 text-sm whitespace-nowrap ${
                                      theme === 'dark' ? 'text-slate-200' : 'text-gray-900'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checkboxValue || false}
                                      onChange={(e) => handleToggleBoolean(item, column.key, e.target.checked)}
                                      className={`h-4 w-4 rounded cursor-pointer ${
                                        theme === 'dark'
                                          ? 'border-slate-600 bg-slate-800 text-sky-500 focus:ring-sky-500/50'
                                          : 'border-gray-300 bg-white text-blue-600 focus:ring-blue-500/50'
                                      }`}
                                    />
                                  </td>
                                );
                              }
                              
                              // CO2 y O2 solo editables si AT CONTROLADA está activo
                              const isDisabled = (column.key === 'co2' || column.key === 'o2') && !item.atmosfera_controlada;
                              
                              return (
                                <td
                                  key={`${item.id}-${column.header}`}
                                  className={`px-4 py-4 text-sm whitespace-nowrap ${
                                    theme === 'dark' ? 'text-slate-200' : 'text-gray-900'
                                  }`}
                                >
                                  {column.render ? (
                                    column.render(item)
                                  ) : isDisabled ? (
                                    <span className={`text-sm ${
                                      theme === 'dark' ? 'text-slate-400' : 'text-gray-400'
                                    }`}>
                                      {item[column.key] !== null && item[column.key] !== undefined ? item[column.key] : '—'}
                                    </span>
                                  ) : (
                                    <InlineEditCell
                                      value={item[column.key]}
                                      field={column.key}
                                      record={item}
                                      onSave={handleUpdateRecord}
                                      type={
                                        dateKeys.has(column.key)
                                          ? 'date'
                                          : typeof item[column.key] === 'number'
                                            ? 'number'
                                            : 'text'
                                      }
                                    />
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </main>

          {/* Modal para agregar transporte */}
          <AddTransporteModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSuccess={reload}
          />

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
      </div>
    </EditingCellProvider>
  );
}
