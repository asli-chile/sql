'use client';
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { User } from '@supabase/supabase-js';
import { UserProfileModal } from '@/components/users/UserProfileModal';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useTheme } from '@/contexts/ThemeContext';
import {
  Ship,
  Truck,
  User as UserIcon,
  ChevronLeft,
  ChevronRight,
  Globe,
  Settings,
  X,
  LayoutDashboard,
  BarChart3,
  FileText,
} from 'lucide-react';
import { Registro } from '@/types/registros';
import { convertSupabaseToApp } from '@/lib/migration-utils';
import { calcularKPIs, KPIMetrics } from '@/lib/kpi-calculations';
import { MetricCard } from '@/components/kpi/MetricCard';
import { KPICharts } from '@/components/kpi/KPICharts';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { AppFooter } from '@/components/layout/AppFooter';
import {
  TrendingUp,
  Clock,
  Package,
  AlertCircle,
  CheckCircle,
  XCircle,
  Filter,
  X as XIcon,
} from 'lucide-react';

const normalizeSeasonLabel = (value?: string | null): string => {
  if (!value) {
    return '';
  }
  return value.toString().replace(/^Temporada\s+/i, '').trim();
};

type SidebarNavItem =
  | { label: string; id: string; isActive?: boolean; icon?: React.ComponentType<{ className?: string }> }
  | { label: string; counter: number; tone: keyof typeof toneBadgeClasses; onClick?: () => void; isActive?: boolean; icon?: React.ComponentType<{ className?: string }> };

type SidebarSection = {
  title: string;
  items: SidebarNavItem[];
};

const toneBadgeClasses = {
  sky: 'bg-sky-500/20 text-sky-300',
  rose: 'bg-rose-500/20 text-rose-300',
  violet: 'bg-violet-500/20 text-violet-300',
  lime: 'bg-lime-500/20 text-lime-300',
} as const;

export default function ReportesPage() {
  // Página de reportes y KPIs - Acceso restringido solo para Rodrigo
  const [user, setUser] = useState<User | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [allRegistros, setAllRegistros] = useState<Registro[]>([]);
  const [metrics, setMetrics] = useState<KPIMetrics | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);
  const [selectedClientes, setSelectedClientes] = useState<string[]>([]);
  const [selectedEjecutivo, setSelectedEjecutivo] = useState<string | null>(null);
  const [selectedEstado, setSelectedEstado] = useState<string | null>(null);
  const [selectedNaviera, setSelectedNaviera] = useState<string | null>(null);
  const [selectedEspecie, setSelectedEspecie] = useState<string | null>(null);
  const [fechaDesde, setFechaDesde] = useState<string>('');
  const [fechaHasta, setFechaHasta] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { theme } = useTheme();

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadRegistros();
    }
  }, [user]);

  // Aplicar filtros a los registros
  const filteredRegistros = useMemo(() => {
    let filtered = [...allRegistros];

    if (selectedSeason) {
      filtered = filtered.filter((r) => {
        const season = normalizeSeasonLabel(r.temporada);
        return season === selectedSeason;
      });
    }

    if (selectedClientes.length > 0) {
      filtered = filtered.filter((r) => {
        const cliente = (r.shipper || '').trim().toUpperCase();
        return selectedClientes.some(selected => selected.toUpperCase() === cliente);
      });
    }

    if (selectedEjecutivo) {
      filtered = filtered.filter((r) => {
        const ejecutivo = (r.ejecutivo || '').trim().toUpperCase();
        return ejecutivo === selectedEjecutivo.toUpperCase();
      });
    }

    if (selectedEstado) {
      filtered = filtered.filter((r) => r.estado === selectedEstado);
    }

    if (selectedNaviera) {
      filtered = filtered.filter((r) => {
        const naviera = (r.naviera || '').trim().toUpperCase();
        return naviera === selectedNaviera.toUpperCase();
      });
    }

    if (selectedEspecie) {
      filtered = filtered.filter((r) => {
        const especie = (r.especie || '').trim().toUpperCase();
        return especie === selectedEspecie.toUpperCase();
      });
    }

    if (fechaDesde) {
      const desde = new Date(fechaDesde);
      filtered = filtered.filter((r) => {
        if (!r.etd) return false;
        const etd = r.etd instanceof Date ? r.etd : new Date(r.etd);
        return etd >= desde;
      });
    }

    if (fechaHasta) {
      const hasta = new Date(fechaHasta);
      hasta.setHours(23, 59, 59, 999); // Incluir todo el día
      filtered = filtered.filter((r) => {
        if (!r.etd) return false;
        const etd = r.etd instanceof Date ? r.etd : new Date(r.etd);
        return etd <= hasta;
      });
    }

    return filtered;
  }, [allRegistros, selectedSeason, selectedClientes, selectedEjecutivo, selectedEstado, selectedNaviera, selectedEspecie, fechaDesde, fechaHasta]);

  useEffect(() => {
    setRegistros(filteredRegistros);
  }, [filteredRegistros]);

  useEffect(() => {
    if (registros.length > 0) {
      const kpis = calcularKPIs(registros);
      setMetrics(kpis);
    } else {
      setMetrics(null);
    }
  }, [registros]);

  const checkUser = async () => {
    try {
      const supabase = createClient();
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error) throw error;

      if (!user) {
        window.location.replace('/auth');
        return;
      }

      setUser(user);

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('auth_user_id', user.id)
        .single();

      if (userError) {
        console.error('Error obteniendo información del usuario:', userError);
        setUserInfo({
          nombre: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario',
          email: user.email || ''
        });
      } else {
        setUserInfo(userData);
      }
    } catch (error) {
      console.error('Error checking user:', error);
      window.location.replace('/auth');
    } finally {
      setLoading(false);
    }
  };

  const handleUserUpdate = (updatedUser: any) => {
    setUserInfo(updatedUser);
  };

  const loadRegistros = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('registros')
        .select('*')
        .is('deleted_at', null)
        .not('ref_asli', 'is', null);

      if (error) throw error;

      const registrosList = (data || []).map((registro) => convertSupabaseToApp(registro));
      setAllRegistros(registrosList);
    } catch (error) {
      console.error('Error loading registros:', error);
    }
  };

  // Generar opciones para los filtros basadas en los filtros ya seleccionados (filtrado en cascada)
  const filterOptions = useMemo(() => {
    // Primero, filtrar los registros según los filtros ya seleccionados (excepto el que estamos generando)
    let registrosFiltrados = [...allRegistros];

    // Aplicar filtros existentes para generar opciones relevantes
    if (selectedSeason) {
      registrosFiltrados = registrosFiltrados.filter((r) => {
        const season = normalizeSeasonLabel(r.temporada);
        return season === selectedSeason;
      });
    }

    if (selectedClientes.length > 0) {
      registrosFiltrados = registrosFiltrados.filter((r) => {
        const cliente = (r.shipper || '').trim().toUpperCase();
        return selectedClientes.some(selected => selected.toUpperCase() === cliente);
      });
    }

    if (selectedEjecutivo) {
      registrosFiltrados = registrosFiltrados.filter((r) => {
        const ejecutivo = (r.ejecutivo || '').trim().toUpperCase();
        return ejecutivo === selectedEjecutivo.toUpperCase();
      });
    }

    if (selectedEstado) {
      registrosFiltrados = registrosFiltrados.filter((r) => r.estado === selectedEstado);
    }

    if (selectedNaviera) {
      registrosFiltrados = registrosFiltrados.filter((r) => {
        const naviera = (r.naviera || '').trim().toUpperCase();
        return naviera === selectedNaviera.toUpperCase();
      });
    }

    if (selectedEspecie) {
      registrosFiltrados = registrosFiltrados.filter((r) => {
        const especie = (r.especie || '').trim().toUpperCase();
        return especie === selectedEspecie.toUpperCase();
      });
    }

    if (fechaDesde) {
      const desde = new Date(fechaDesde);
      registrosFiltrados = registrosFiltrados.filter((r) => {
        if (!r.etd) return false;
        const etd = r.etd instanceof Date ? r.etd : new Date(r.etd);
        return etd >= desde;
      });
    }

    if (fechaHasta) {
      const hasta = new Date(fechaHasta);
      hasta.setHours(23, 59, 59, 999);
      registrosFiltrados = registrosFiltrados.filter((r) => {
        if (!r.etd) return false;
        const etd = r.etd instanceof Date ? r.etd : new Date(r.etd);
        return etd <= hasta;
      });
    }

    // Ahora generar opciones desde los registros filtrados
    const clientes = new Set<string>();
    const ejecutivos = new Set<string>();
    const navieras = new Set<string>();
    const especies = new Set<string>();
    const temporadas = new Set<string>();

    registrosFiltrados.forEach((r) => {
      if (r.shipper) clientes.add(r.shipper.trim());
      if (r.ejecutivo) ejecutivos.add(r.ejecutivo.trim());
      if (r.naviera) navieras.add(r.naviera.trim());
      if (r.especie) especies.add(r.especie.trim());
      if (r.temporada) {
        const season = normalizeSeasonLabel(r.temporada);
        if (season) temporadas.add(season);
      }
    });

    return {
      clientes: Array.from(clientes).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' })),
      ejecutivos: Array.from(ejecutivos).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' })),
      navieras: Array.from(navieras).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' })),
      especies: Array.from(especies).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' })),
      temporadas: Array.from(temporadas).sort().reverse(),
    };
  }, [allRegistros, selectedSeason, selectedClientes, selectedEjecutivo, selectedEstado, selectedNaviera, selectedEspecie, fechaDesde, fechaHasta]);

  const handleClearFilters = () => {
    setSelectedSeason(null);
    setSelectedClientes([]);
    setSelectedEjecutivo(null);
    setSelectedEstado(null);
    setSelectedNaviera(null);
    setSelectedEspecie(null);
    setFechaDesde('');
    setFechaHasta('');
  };

  const handleToggleCliente = (cliente: string) => {
    setSelectedClientes((prev) => {
      // Normalizar el cliente para comparación
      const clienteNormalizado = cliente.trim();
      const clienteUpper = clienteNormalizado.toUpperCase();
      
      // Verificar si ya existe (comparando normalizado)
      const exists = prev.some(c => c.trim().toUpperCase() === clienteUpper);
      
      console.log('Toggle cliente:', cliente, 'exists:', exists, 'prev:', prev);
      
      if (exists) {
        // Remover si ya existe
        const newList = prev.filter(c => c.trim().toUpperCase() !== clienteUpper);
        console.log('Removed, new list:', newList);
        return newList;
      } else {
        // Agregar si no existe
        const newList = [...prev, clienteNormalizado];
        console.log('Added, new list:', newList);
        return newList;
      }
    });
  };

  const handleSelectAllClientes = () => {
    if (selectedClientes.length === filterOptions.clientes.length) {
      setSelectedClientes([]);
    } else {
      setSelectedClientes([...filterOptions.clientes]);
    }
  };

  const hasActiveFilters = selectedSeason || selectedClientes.length > 0 || selectedEjecutivo || selectedEstado || selectedNaviera || selectedEspecie || fechaDesde || fechaHasta;

  const toggleSidebar = () => setIsSidebarCollapsed((prev) => !prev);

  const isAdmin = userInfo?.rol === 'admin';
  const isRodrigo = userInfo?.email?.toLowerCase() === 'rodrigo.caceres@asli.cl';
  const canAccessMaintenance = isAdmin || isRodrigo;
  const canAccessReportes = isRodrigo;

  const sidebarNav: SidebarSection[] = [
    {
      title: 'Inicio',
      items: [
        { label: 'Dashboard', id: 'dashboard', isActive: false, icon: LayoutDashboard },
      ],
    },
    {
      title: 'Módulos',
      items: [
        { label: 'Embarques', id: 'registros', isActive: false, icon: Ship },
        { label: 'Seguimiento', id: 'dashboard/seguimiento', isActive: false, icon: Globe },
        { label: 'Transportes', id: 'transportes', isActive: false, icon: Truck },
        { label: 'Documentos', id: 'documentos', isActive: false, icon: FileText },
        { label: 'Reportes', id: 'reportes', isActive: true, icon: BarChart3 },
      ],
    },
    ...(canAccessMaintenance
      ? [
          {
            title: 'Sistema',
            items: [{ label: 'Mantenimiento', id: 'mantenimiento', isActive: false, icon: Settings }],
          },
        ]
      : []),
  ];

  if (loading) {
    return <LoadingScreen message="Cargando reportes..." />;
  }

  if (!user) {
    return null;
  }

  // Verificar acceso solo para Rodrigo
  // isRodrigo ya está definido más arriba en el componente
  if (!isRodrigo) {
    return (
      <div className={`flex h-screen items-center justify-center ${theme === 'dark' ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100' : 'bg-gray-50 text-gray-900'}`}>
        <div className={`rounded-xl border p-8 text-center max-w-md ${theme === 'dark' ? 'border-slate-800 bg-slate-900' : 'border-gray-200 bg-white shadow-lg'}`}>
          <AlertCircle className={`h-16 w-16 mx-auto mb-4 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`} />
          <h2 className={`text-2xl font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Acceso Restringido
          </h2>
          <p className={`text-sm mb-6 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
            No tienes permisos para acceder a esta sección. Solo el administrador puede ver los reportes.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
              theme === 'dark'
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            Volver al Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return <LoadingScreen message="Cargando métricas..." />;
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
      <aside
        className={`fixed lg:sticky left-0 top-0 z-50 lg:z-auto flex h-full flex-col transition-all duration-300 self-start ${theme === 'dark' ? 'border-r border-slate-700 bg-slate-800' : 'border-r border-gray-200 bg-white shadow-lg'} ${
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
          {isSidebarCollapsed && !isMobileMenuOpen && (
            <button
              onClick={toggleSidebar}
              className={`hidden lg:flex h-8 w-8 items-center justify-center rounded-lg border flex-shrink-0 ${theme === 'dark' ? 'border-slate-700/60 bg-slate-900/60 text-slate-300 hover:border-sky-500/60 hover:text-sky-200' : 'border-gray-300 bg-gray-100 text-gray-600 hover:border-blue-400 hover:text-blue-700'} transition`}
              aria-label="Expandir menú lateral"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>

        {(!isSidebarCollapsed || isMobileMenuOpen) && (
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-4 py-4 sm:py-6 space-y-6 sm:space-y-8">
            {sidebarNav.map((section) => (
              <div key={section.title} className="space-y-2 sm:space-y-3">
                <p className={`text-[10px] sm:text-xs uppercase tracking-[0.25em] sm:tracking-[0.3em] truncate ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>{section.title}</p>
                <div className="space-y-1 sm:space-y-1.5 overflow-y-visible">
                  {section.items.map((item) => {
                    const isActive = ('id' in item && item.isActive) || ('counter' in item && item.isActive);
                    return (
                      <button
                        key={item.label}
                        onClick={() => {
                          if ('id' in item) {
                            if (item.id === 'reportes') {
                              setIsMobileMenuOpen(false);
                              return;
                            }
                            router.push(`/${item.id}`);
                            setIsMobileMenuOpen(false);
                          } else if ('onClick' in item && typeof item.onClick === 'function') {
                            item.onClick();
                            setIsMobileMenuOpen(false);
                          }
                        }}
                        aria-pressed={'counter' in item ? item.isActive : undefined}
                        className={`group w-full text-left flex items-center justify-between rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 transition-colors min-w-0 ${
                          isActive
                            ? 'bg-blue-600 text-white'
                            : theme === 'dark'
                              ? 'hover:bg-slate-700 text-slate-300'
                              : 'hover:bg-blue-50 text-blue-600 font-semibold'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {'icon' in item && item.icon && (
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
                        {'counter' in item && (
                          <span
                            className={`text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 rounded-full flex-shrink-0 ml-1.5 ${toneBadgeClasses[item.tone]} ${item.isActive ? 'ring-1 ring-sky-400/60' : ''
                              }`}
                          >
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
            
            {/* Botón de usuario para móvil */}
            <div className={`lg:hidden space-y-2 sm:space-y-3 pt-2 ${theme === 'dark' ? 'border-t border-slate-700/60' : 'border-t border-gray-200'}`}>
              <button
                onClick={() => {
                  setShowProfileModal(true);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full text-left flex items-center gap-2 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 transition-colors ${
                  theme === 'dark'
                    ? 'hover:bg-slate-700 text-slate-300'
                    : 'hover:bg-blue-50 text-blue-600 font-semibold'
                }`}
              >
                <UserIcon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-semibold truncate flex-1 min-w-0">
                  {userInfo?.nombre || user?.user_metadata?.full_name || user?.email || 'Usuario'}
                </span>
              </button>
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
                <img
                  src="https://asli.cl/img/logo.png?v=1761679285274&t=1761679285274"
                  alt="ASLI Logo"
                  className="h-10 w-10 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
              <div>
                <p className={`text-[10px] sm:text-[11px] uppercase tracking-[0.3em] sm:tracking-[0.4em] ${theme === 'dark' ? 'text-slate-500/80' : 'text-gray-500'}`}>Análisis y Métricas</p>
                <h1 className={`text-xl sm:text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Reportes y KPIs</h1>
                <p className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>Indicadores clave de rendimiento y análisis de operaciones</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 ml-auto">
              <button
                onClick={() => setShowFilters(prev => !prev)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold transition-colors ${
                  showFilters
                    ? theme === 'dark'
                      ? 'bg-sky-600 text-white border-sky-600'
                      : 'bg-blue-600 text-white border-blue-600'
                    : hasActiveFilters
                    ? theme === 'dark'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-blue-600 text-white border-blue-600'
                    : theme === 'dark'
                      ? 'border-slate-800/70 text-slate-300 hover:border-sky-400/60 hover:text-sky-200'
                      : 'border-gray-300 text-gray-700 hover:border-blue-400 hover:text-blue-600 bg-white shadow-sm'
                }`}
                type="button"
                aria-label="Mostrar/Ocultar filtros"
                aria-expanded={showFilters}
              >
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Filtros</span>
                {hasActiveFilters && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    theme === 'dark' ? 'bg-white/20' : 'bg-white/30'
                  }`}>
                    {[
                      selectedSeason,
                      selectedClientes.length > 0,
                      selectedEjecutivo,
                      selectedEstado,
                      selectedNaviera,
                      selectedEspecie,
                      fechaDesde,
                      fechaHasta,
                    ].filter(Boolean).length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setShowProfileModal(true)}
                className={`hidden sm:flex items-center gap-2 rounded-full border px-3 py-2 text-xs sm:text-sm ${
                  theme === 'dark'
                    ? 'border-slate-800/70 text-slate-300 hover:border-sky-400/60 hover:text-sky-200'
                    : 'border-gray-300 text-gray-700 hover:border-blue-400 hover:text-blue-600 bg-white shadow-sm'
                }`}
              >
                <UserIcon className="h-4 w-4" />
                {userInfo?.nombre || user.email}
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 sm:px-6 pb-10 pt-6 sm:pt-8 space-y-6 sm:space-y-8">
          {/* Panel de Filtros */}
          {showFilters ? (
            <div className={`rounded-xl border p-4 sm:p-6 shadow-lg ${theme === 'dark' ? 'border-slate-800/70 bg-gradient-to-br from-slate-950/80 to-slate-900/60' : 'border-gray-200 bg-white'}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Filtros de Reportes
                </h3>
                <div className="flex items-center gap-2">
                  {hasActiveFilters && (
                    <button
                      onClick={handleClearFilters}
                      className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                        theme === 'dark'
                          ? 'text-slate-300 hover:bg-slate-700'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      Limpiar filtros
                    </button>
                  )}
                  <button
                    onClick={() => setShowFilters(false)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      theme === 'dark'
                        ? 'text-slate-300 hover:bg-slate-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                    aria-label="Cerrar filtros"
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Filtro Temporada */}
                <div>
                  <label className={`block text-xs font-medium mb-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                    Temporada
                  </label>
                  <select
                    value={selectedSeason ?? ''}
                    onChange={(e) => {
                      const newValue = e.target.value || null;
                      setSelectedSeason(newValue);
                      // Si se cambia la temporada, limpiar otros filtros que puedan no ser válidos
                      if (!newValue) {
                        // Si se limpia, no hacer nada más
                      }
                    }}
                    className={`w-full rounded-lg border px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 ${
                      theme === 'dark'
                        ? 'border-slate-700 bg-slate-800 text-slate-200 focus:border-sky-500 focus:ring-sky-500/30'
                        : 'border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500/30'
                    }`}
                  >
                    <option value="">Todas</option>
                    {filterOptions.temporadas.map((temp) => (
                      <option key={temp} value={temp}>
                        Temporada {temp}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filtro Cliente - Lista de Checkboxes */}
                <div className="lg:col-span-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className={`block text-xs font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                      Clientes {selectedClientes.length > 0 && `(${selectedClientes.length} seleccionados)`}
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSelectAllClientes}
                        className={`text-xs px-2 py-1 rounded transition-colors ${
                          theme === 'dark'
                            ? 'text-sky-400 hover:bg-slate-700'
                            : 'text-blue-600 hover:bg-gray-100'
                        }`}
                      >
                        {selectedClientes.length === filterOptions.clientes.length && filterOptions.clientes.length > 0
                          ? 'Desmarcar todos'
                          : 'Seleccionar todos'}
                      </button>
                      {selectedClientes.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedClientes([])}
                          className={`text-xs px-2 py-1 rounded transition-colors ${
                            theme === 'dark'
                              ? 'text-slate-400 hover:bg-slate-700'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          Limpiar
                        </button>
                      )}
                    </div>
                  </div>
                  <div className={`max-h-48 overflow-y-auto rounded-lg border p-3 space-y-2 ${
                    theme === 'dark'
                      ? 'border-slate-700 bg-slate-800'
                      : 'border-gray-300 bg-white'
                  }`}>
                    {filterOptions.clientes.length > 0 ? (
                      filterOptions.clientes.map((cliente) => {
                        const isChecked = selectedClientes.some(c => c.toUpperCase() === cliente.toUpperCase());
                        return (
                          <label
                            key={cliente}
                            className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                              isChecked
                                ? theme === 'dark'
                                  ? 'bg-sky-900/30 border border-sky-700/50'
                                  : 'bg-blue-50 border border-blue-200'
                                : theme === 'dark'
                                  ? 'hover:bg-slate-700/50'
                                  : 'hover:bg-gray-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                e.stopPropagation();
                                console.log('Checkbox onChange triggered for:', cliente, 'current checked:', isChecked, 'selectedClientes:', selectedClientes);
                                handleToggleCliente(cliente);
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                              className={`h-4 w-4 rounded cursor-pointer flex-shrink-0 ${
                                theme === 'dark'
                                  ? 'border-slate-600 bg-slate-800 text-sky-500 focus:ring-sky-500/50'
                                  : 'border-gray-300 bg-white text-blue-600 focus:ring-blue-500/50'
                              }`}
                            />
                            <span className={`text-xs sm:text-sm flex-1 ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>
                              {cliente}
                            </span>
                          </label>
                        );
                      })
                    ) : (
                      <p className={`text-xs text-center py-4 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                        No hay clientes disponibles
                      </p>
                    )}
                  </div>
                </div>

                {/* Filtro Ejecutivo */}
                <div>
                  <label className={`block text-xs font-medium mb-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                    Ejecutivo
                  </label>
                  <select
                    value={selectedEjecutivo ?? ''}
                    onChange={(e) => {
                      const newValue = e.target.value || null;
                      setSelectedEjecutivo(newValue);
                    }}
                    className={`w-full rounded-lg border px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 ${
                      theme === 'dark'
                        ? 'border-slate-700 bg-slate-800 text-slate-200 focus:border-sky-500 focus:ring-sky-500/30'
                        : 'border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500/30'
                    }`}
                    disabled={filterOptions.ejecutivos.length === 0}
                  >
                    <option value="">Todos</option>
                    {filterOptions.ejecutivos.length > 0 ? (
                      filterOptions.ejecutivos.map((ejecutivo) => (
                        <option key={ejecutivo} value={ejecutivo}>
                          {ejecutivo}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>No hay opciones disponibles</option>
                    )}
                  </select>
                </div>

                {/* Filtro Estado */}
                <div>
                  <label className={`block text-xs font-medium mb-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                    Estado
                  </label>
                  <select
                    value={selectedEstado ?? ''}
                    onChange={(e) => setSelectedEstado(e.target.value || null)}
                    className={`w-full rounded-lg border px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 ${
                      theme === 'dark'
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
                  <label className={`block text-xs font-medium mb-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                    Naviera
                  </label>
                  <select
                    value={selectedNaviera ?? ''}
                    onChange={(e) => {
                      const newValue = e.target.value || null;
                      setSelectedNaviera(newValue);
                    }}
                    className={`w-full rounded-lg border px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 ${
                      theme === 'dark'
                        ? 'border-slate-700 bg-slate-800 text-slate-200 focus:border-sky-500 focus:ring-sky-500/30'
                        : 'border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500/30'
                    }`}
                    disabled={filterOptions.navieras.length === 0}
                  >
                    <option value="">Todas</option>
                    {filterOptions.navieras.length > 0 ? (
                      filterOptions.navieras.map((naviera) => (
                        <option key={naviera} value={naviera}>
                          {naviera}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>No hay opciones disponibles</option>
                    )}
                  </select>
                </div>

                {/* Filtro Especie */}
                <div>
                  <label className={`block text-xs font-medium mb-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                    Especie
                  </label>
                  <select
                    value={selectedEspecie ?? ''}
                    onChange={(e) => {
                      const newValue = e.target.value || null;
                      setSelectedEspecie(newValue);
                    }}
                    className={`w-full rounded-lg border px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 ${
                      theme === 'dark'
                        ? 'border-slate-700 bg-slate-800 text-slate-200 focus:border-sky-500 focus:ring-sky-500/30'
                        : 'border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500/30'
                    }`}
                    disabled={filterOptions.especies.length === 0}
                  >
                    <option value="">Todas</option>
                    {filterOptions.especies.length > 0 ? (
                      filterOptions.especies.map((especie) => (
                        <option key={especie} value={especie}>
                          {especie}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>No hay opciones disponibles</option>
                    )}
                  </select>
                </div>

                {/* Filtro Fecha Desde */}
                <div>
                  <label className={`block text-xs font-medium mb-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                    Fecha Desde (ETD)
                  </label>
                  <input
                    type="date"
                    value={fechaDesde}
                    onChange={(e) => setFechaDesde(e.target.value)}
                    className={`w-full rounded-lg border px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 ${
                      theme === 'dark'
                        ? 'border-slate-700 bg-slate-800 text-slate-200 focus:border-sky-500 focus:ring-sky-500/30'
                        : 'border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500/30'
                    }`}
                  />
                </div>

                {/* Filtro Fecha Hasta */}
                <div>
                  <label className={`block text-xs font-medium mb-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                    Fecha Hasta (ETD)
                  </label>
                  <input
                    type="date"
                    value={fechaHasta}
                    onChange={(e) => setFechaHasta(e.target.value)}
                    className={`w-full rounded-lg border px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 ${
                      theme === 'dark'
                        ? 'border-slate-700 bg-slate-800 text-slate-200 focus:border-sky-500 focus:ring-sky-500/30'
                        : 'border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500/30'
                    }`}
                  />
                </div>
              </div>
            </div>
          ) : null}

          {/* Mensaje cuando no hay datos */}
          {registros.length === 0 && allRegistros.length > 0 && (
            <div className={`rounded-xl border p-6 text-center ${theme === 'dark' ? 'border-amber-800/70 bg-amber-900/20' : 'border-amber-200 bg-amber-50'}`}>
              <AlertCircle className={`h-12 w-12 mx-auto mb-4 ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`} />
              <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                No hay datos con los filtros aplicados
              </h3>
              <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                Intenta ajustar los filtros para ver los resultados
              </p>
              <button
                onClick={handleClearFilters}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  theme === 'dark'
                    ? 'bg-amber-600 text-white hover:bg-amber-700'
                    : 'bg-amber-500 text-white hover:bg-amber-600'
                }`}
              >
                Limpiar filtros
              </button>
            </div>
          )}

          {/* Métricas principales */}
          {registros.length > 0 && metrics && (
            <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <MetricCard
              title="Total Reservas"
              value={metrics.totalReservas}
              subtitle={`${metrics.totalConfirmadas} confirmadas`}
              icon={Package}
              color="blue"
            />
            <MetricCard
              title="Tasa de Confirmación"
              value={`${metrics.porcentajeConfirmacion.toFixed(1)}%`}
              subtitle={`${metrics.totalConfirmadas} de ${metrics.totalReservas}`}
              icon={CheckCircle}
              color="green"
            />
            <MetricCard
              title="Ratio de Cancelación"
              value={`${metrics.ratioCancelacion.toFixed(1)}%`}
              subtitle={`${Math.round(metrics.totalReservas * metrics.ratioCancelacion / 100)} canceladas`}
              icon={XCircle}
              color="red"
            />
            <MetricCard
              title="Tiempo Promedio"
              value={`${metrics.tiempoPromedioReservaConfirmacion.toFixed(1)} días`}
              subtitle="Reserva a confirmación"
              icon={Clock}
              color="amber"
            />
          </div>

          {/* Métricas de tiempo y puntualidad */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <MetricCard
              title="TT Real"
              value={`${metrics.tiempoTransitoReal.toFixed(1)} días`}
              subtitle="Tiempo de tránsito promedio"
              icon={Ship}
              color="sky"
            />
            <MetricCard
              title="TT Planificado"
              value={`${metrics.tiempoTransitoPlanificado.toFixed(1)} días`}
              subtitle="Tiempo planificado promedio"
              icon={Clock}
              color="blue"
            />
            <MetricCard
              title="Diferencia TT"
              value={`${metrics.diferenciaTT > 0 ? '+' : ''}${metrics.diferenciaTT.toFixed(1)} días`}
              subtitle={metrics.diferenciaTT > 0 ? 'Retraso promedio' : 'Adelanto promedio'}
              icon={metrics.diferenciaTT > 0 ? AlertCircle : TrendingUp}
              color={metrics.diferenciaTT > 0 ? 'red' : 'green'}
            />
            <MetricCard
              title="Arribos a Tiempo"
              value={`${metrics.porcentajeArribosATiempo.toFixed(1)}%`}
              subtitle={`Retraso promedio: ${metrics.retrasosPromedio.toFixed(1)} días`}
              icon={CheckCircle}
              color="green"
            />
          </div>

          {/* Métricas de capacidad */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 sm:gap-6">
            <MetricCard
              title="Total Contenedores"
              value={metrics.totalContenedores}
              subtitle="Contenedores movilizados"
              icon={Package}
              color="blue"
            />
            <MetricCard
              title="Total Embarques"
              value={metrics.totalReservas}
              subtitle="Embarques registrados"
              icon={Ship}
              color="purple"
            />
          </div>

          {/* Gráficos */}
          <div>
            <h2 className={`text-xl sm:text-2xl font-semibold mb-4 sm:mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Análisis Visual
            </h2>
            <KPICharts metrics={metrics} />
          </div>

          {/* Tablas de distribución */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Top Clientes */}
            <div className={`rounded-xl border p-4 sm:p-6 shadow-lg ${theme === 'dark' ? 'border-slate-800/70 bg-gradient-to-br from-slate-950/80 to-slate-900/60' : 'border-gray-200 bg-white'}`}>
              <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Top Clientes por Contenedores
              </h3>
              <div className="space-y-2">
                {metrics.topClientes.map((cliente, index) => (
                  <div
                    key={cliente.cliente}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      theme === 'dark' ? 'bg-slate-800/50' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                        #{index + 1}
                      </span>
                      <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {cliente.cliente}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {cliente.contenedores} contenedores
                      </p>
                      <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                        {cliente.embarques} embarques
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Clientes Cancelados */}
            <div className={`rounded-xl border p-4 sm:p-6 shadow-lg ${theme === 'dark' ? 'border-red-800/70 bg-gradient-to-br from-slate-950/80 to-slate-900/60' : 'border-red-200 bg-white'}`}>
              <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Top Clientes Cancelados
              </h3>
              <div className="space-y-2">
                {metrics.topClientesCancelados.length > 0 ? (
                  metrics.topClientesCancelados.map((cliente, index) => (
                    <div
                      key={cliente.cliente}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        theme === 'dark' ? 'bg-red-900/20 border border-red-800/30' : 'bg-red-50 border border-red-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                          #{index + 1}
                        </span>
                        <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {cliente.cliente}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-red-300' : 'text-red-600'}`}>
                          {cliente.cancelaciones} cancelaciones
                        </p>
                        <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                          {cliente.contenedores} contenedores
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={`text-center py-8 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                    <p className="text-sm">No hay cancelaciones registradas</p>
                  </div>
                )}
              </div>
            </div>

            {/* Top Ejecutivos */}
            <div className={`rounded-xl border p-4 sm:p-6 shadow-lg ${theme === 'dark' ? 'border-slate-800/70 bg-gradient-to-br from-slate-950/80 to-slate-900/60' : 'border-gray-200 bg-white'}`}>
              <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Top Ejecutivos
              </h3>
              <div className="space-y-2">
                {metrics.topEjecutivos.map((ejecutivo, index) => (
                  <div
                    key={ejecutivo.ejecutivo}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      theme === 'dark' ? 'bg-slate-800/50' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                        #{index + 1}
                      </span>
                      <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {ejecutivo.ejecutivo}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {ejecutivo.embarques} embarques
                      </p>
                      <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                        {ejecutivo.tasaConfirmacion.toFixed(1)}% confirmación
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Ejecutivos Cancelados */}
            <div className={`rounded-xl border p-4 sm:p-6 shadow-lg ${theme === 'dark' ? 'border-red-800/70 bg-gradient-to-br from-slate-950/80 to-slate-900/60' : 'border-red-200 bg-white'}`}>
              <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Top Ejecutivos Cancelados
              </h3>
              <div className="space-y-2">
                {metrics.topEjecutivosCancelados.length > 0 ? (
                  metrics.topEjecutivosCancelados.map((ejecutivo, index) => (
                    <div
                      key={ejecutivo.ejecutivo}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        theme === 'dark' ? 'bg-red-900/20 border border-red-800/30' : 'bg-red-50 border border-red-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                          #{index + 1}
                        </span>
                        <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {ejecutivo.ejecutivo}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-red-300' : 'text-red-600'}`}>
                          {ejecutivo.cancelaciones} cancelaciones
                        </p>
                        <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                          {ejecutivo.contenedores} contenedores
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={`text-center py-8 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                    <p className="text-sm">No hay cancelaciones registradas</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <AppFooter />
            </>
          )}
        </main>
      </div>

      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        userInfo={userInfo}
        onUserUpdate={handleUserUpdate}
      />
    </div>
  );
}
