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
  FileCheck,
  DollarSign,
  Users,
} from 'lucide-react';
import { Registro } from '@/types/registros';
import { convertSupabaseToApp } from '@/lib/migration-utils';
import { calcularKPIs, KPIMetrics } from '@/lib/kpi-calculations';
import { MetricCard } from '@/components/kpi/MetricCard';
import { KPICharts } from '@/components/kpi/KPICharts';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { AppFooter } from '@/components/layout/AppFooter';
import { Sidebar } from '@/components/layout/Sidebar';
import { SidebarSection } from '@/types/layout';
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
    // Si no hay registros, retornar opciones vacías
    if (!allRegistros || allRegistros.length === 0) {
      return {
        clientes: [],
        ejecutivos: [],
        navieras: [],
        especies: [],
        temporadas: [],
      };
    }

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
    if (!filterOptions || !filterOptions.clientes || filterOptions.clientes.length === 0) return;
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
        { label: 'Dashboard', id: '/dashboard', icon: LayoutDashboard },
      ],
    },
    {
      title: 'Módulos',
      items: [
        { label: 'Embarques', id: '/registros', icon: Ship },
        { label: 'Transportes', id: '/transportes', icon: Truck },
        { label: 'Documentos', id: '/documentos', icon: FileText },
        ...(userInfo && userInfo.rol !== 'cliente'
          ? [{ label: 'Generar Documentos', id: '/generar-documentos', icon: FileCheck }]
          : []),
        { label: 'Seguimiento Marítimo', id: '/dashboard/seguimiento', icon: Globe },
        { label: 'Tracking Movs', id: '/dashboard/tracking', icon: Activity },
        ...(isRodrigo
          ? [
            { label: 'Finanzas', id: '/finanzas', icon: DollarSign },
            { label: 'Reportes', id: '/reportes', isActive: true, icon: BarChart3 },
          ]
          : []),
      ],
    },
    ...(isRodrigo
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
    return <LoadingScreen message="Cargando reportes..." />;
  }

  if (!user) {
    return null;
  }

  // Verificar acceso solo para Rodrigo
  // isRodrigo ya está definido más arriba en el componente
  if (!isRodrigo) {
    return (
      <div className={`flex h-screen items-center justify-center ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-gray-50 text-gray-900'}`}>
        <div className={`border p-8 text-center max-w-md ${theme === 'dark' ? 'border-slate-700/60 bg-slate-900' : 'border-gray-300 bg-white'}`}>
          <AlertCircle className={`h-16 w-16 mx-auto mb-4 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`} />
          <h2 className={`text-2xl font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Acceso Restringido
          </h2>
          <p className={`text-sm mb-6 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
            No tienes permisos para acceder a esta sección. Solo el administrador puede ver los reportes.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className={`px-6 py-2 rounded-lg font-semibold transition-colors ${theme === 'dark'
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
    <div className={`flex h-screen overflow-hidden ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-gray-50 text-gray-900'}`}>
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
        sections={sidebarNav}
        currentUser={userInfo}
        user={user}
        setShowProfileModal={setShowProfileModal}
      />

      {/* Content */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden h-full">
        <header className={`sticky top-0 z-40 border-b overflow-hidden ${theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <div className="flex flex-wrap items-center gap-2 pl-2 pr-2 sm:px-3 py-2 sm:py-3">
            {/* Botón hamburguesa para móvil */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className={`lg:hidden flex h-8 w-8 items-center justify-center border transition-colors flex-shrink-0 ${theme === 'dark'
                ? 'border-slate-700/60 text-slate-300 hover:bg-slate-700'
                : 'border-gray-300 text-gray-600 hover:bg-gray-100'
                }`}
              aria-label="Abrir menú"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            {/* Botón para expandir sidebar colapsado en desktop */}
            {isSidebarCollapsed && (
              <button
                onClick={toggleSidebar}
                className={`hidden lg:flex h-8 w-8 items-center justify-center border transition-colors flex-shrink-0 ${theme === 'dark'
                  ? 'border-slate-700/60 text-slate-300 hover:bg-slate-700'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-100'
                  }`}
                aria-label="Expandir menú lateral"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            )}

            <div className="flex items-center gap-3 sm:gap-4">
              <div>
                <p className={`text-[10px] sm:text-[11px] uppercase tracking-[0.2em] sm:tracking-[0.3em] ${theme === 'dark' ? 'text-slate-500/80' : 'text-gray-500'}`}>Análisis y Métricas</p>
                <h1 className={`text-lg sm:text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Reportes y KPIs</h1>
                <p className={`text-[11px] sm:text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>Indicadores clave de rendimiento y análisis de operaciones</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 ml-auto">
              <button
                onClick={() => setShowFilters(prev => !prev)}
                className={`inline-flex items-center gap-1.5 border px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors ${showFilters
                  ? theme === 'dark'
                    ? 'bg-sky-600 text-white border-sky-600'
                    : 'bg-blue-600 text-white border-blue-600'
                  : hasActiveFilters
                    ? theme === 'dark'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-blue-600 text-white border-blue-600'
                    : theme === 'dark'
                      ? 'border-slate-800/70 text-slate-300 hover:border-sky-400/60 hover:text-sky-200'
                      : 'border-gray-300 text-gray-700 hover:border-blue-400 hover:text-blue-600 bg-white'
                  }`}
                type="button"
                aria-label="Mostrar/Ocultar filtros"
                aria-expanded={showFilters}
              >
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Filtros</span>
                {hasActiveFilters && (
                  <span className={`text-xs px-1.5 py-0.5 ${theme === 'dark' ? 'bg-white/20' : 'bg-white/30'
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
                className={`hidden sm:flex items-center gap-1.5 border px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm ${theme === 'dark'
                  ? 'border-slate-700/60 bg-slate-800/60 text-slate-200 hover:border-sky-500/60 hover:text-sky-200'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400 hover:text-blue-700'
                  }`}
              >
                <UserIcon className="h-4 w-4" />
                {userInfo?.nombre || user.email}
              </button>
            </div>
          </div>
        </header>

        <main className="flex flex-1 overflow-hidden h-full">
          {/* Contenido principal */}
          <div className={`flex-1 overflow-y-auto px-4 sm:px-6 pb-10 pt-6 sm:pt-8 space-y-6 sm:space-y-8 transition-all duration-300 ${showFilters ? 'lg:mr-80' : ''}`}>
          {/* Mensaje cuando no hay datos */}
          {registros.length === 0 && allRegistros.length > 0 && (
            <div className={`border p-6 text-center ${theme === 'dark' ? 'border-amber-700/60 bg-amber-900/20' : 'border-amber-300 bg-amber-50'}`}>
              <AlertCircle className={`h-12 w-12 mx-auto mb-4 ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`} />
              <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                No hay datos con los filtros aplicados
              </h3>
              <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                Intenta ajustar los filtros para ver los resultados
              </p>
              <button
                onClick={handleClearFilters}
                className={`px-4 py-2 border text-sm font-semibold transition-colors ${theme === 'dark'
                  ? 'border-amber-600 bg-amber-600 text-white hover:bg-amber-700'
                  : 'border-amber-500 bg-amber-500 text-white hover:bg-amber-600'
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
                <div className={`border p-4 sm:p-5 ${theme === 'dark' ? 'border-slate-700/60 bg-slate-900' : 'border-gray-300 bg-white'}`}>
                  <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Top Clientes por Contenedores
                  </h3>
                  <div className="space-y-2">
                    {metrics.topClientes.map((cliente, index) => (
                      <div
                        key={cliente.cliente}
                        className={`flex items-center justify-between p-3 border ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700/60' : 'bg-gray-50 border-gray-300'
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
                <div className={`border p-4 sm:p-5 ${theme === 'dark' ? 'border-red-700/60 bg-slate-900' : 'border-red-300 bg-white'}`}>
                  <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Top Clientes Cancelados
                  </h3>
                  <div className="space-y-2">
                    {metrics.topClientesCancelados.length > 0 ? (
                      metrics.topClientesCancelados.map((cliente, index) => (
                        <div
                          key={cliente.cliente}
                          className={`flex items-center justify-between p-3 border ${theme === 'dark' ? 'bg-red-900/20 border-red-700/60' : 'bg-red-50 border-red-300'
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
                <div className={`border p-4 sm:p-5 ${theme === 'dark' ? 'border-slate-700/60 bg-slate-900' : 'border-gray-300 bg-white'}`}>
                  <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Top Ejecutivos
                  </h3>
                  <div className="space-y-2">
                    {metrics.topEjecutivos.map((ejecutivo, index) => (
                      <div
                        key={ejecutivo.ejecutivo}
                        className={`flex items-center justify-between p-3 border ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700/60' : 'bg-gray-50 border-gray-300'
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
                <div className={`border p-4 sm:p-5 ${theme === 'dark' ? 'border-red-700/60 bg-slate-900' : 'border-red-300 bg-white'}`}>
                  <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Top Ejecutivos Cancelados
                  </h3>
                  <div className="space-y-2">
                    {metrics.topEjecutivosCancelados.length > 0 ? (
                      metrics.topEjecutivosCancelados.map((ejecutivo, index) => (
                        <div
                          key={ejecutivo.ejecutivo}
                          className={`flex items-center justify-between p-3 border ${theme === 'dark' ? 'bg-red-900/20 border-red-700/60' : 'bg-red-50 border-red-300'
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
          </div>

          {/* Panel lateral de filtros */}
          <aside
            className={`fixed lg:relative right-0 top-0 z-50 lg:z-auto flex h-full lg:h-auto flex-col transition-all duration-300 ${theme === 'dark' ? 'border-l border-slate-700/60 bg-slate-900' : 'border-l border-gray-300 bg-white'} ${showFilters
              ? 'translate-x-0 lg:w-80 lg:opacity-100 lg:pointer-events-auto'
              : 'translate-x-full lg:translate-x-0 lg:w-0 lg:opacity-0 lg:overflow-hidden lg:pointer-events-none lg:min-w-0'
              } w-80 lg:flex-shrink-0`}
          >
            {/* Overlay para móvil */}
            {showFilters && (
              <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
                onClick={() => setShowFilters(false)}
              />
            )}

            <div className={`flex items-center justify-between px-4 py-4 border-b ${theme === 'dark' ? 'border-slate-700/60' : 'border-gray-200'}`}>
              <h2 className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>Filtros de Reportes</h2>
              <button
                onClick={() => setShowFilters(false)}
                className={`flex h-8 w-8 items-center justify-center border transition ${theme === 'dark' ? 'border-slate-700/60 bg-slate-700/60 text-slate-300 hover:border-sky-500/60 hover:text-sky-200' : 'border-gray-300 bg-white text-gray-600 hover:border-blue-500 hover:text-blue-700'}`}
                aria-label="Cerrar panel de filtros"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {hasActiveFilters && (
                <button
                  onClick={handleClearFilters}
                  className={`w-full text-xs px-3 py-2 mb-4 border transition-colors ${theme === 'dark'
                    ? 'border-slate-700/60 text-slate-300 hover:bg-slate-700'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-100'
                    }`}
                >
                  Limpiar filtros
                </button>
              )}
              <div className="space-y-4">
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
                    }}
                    className={`w-full border px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 ${theme === 'dark'
                      ? 'border-slate-700 bg-slate-800 text-slate-200 focus:border-sky-500 focus:ring-sky-500/30'
                      : 'border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500/30'
                      }`}
                  >
                    <option value="">Todas</option>
                    {filterOptions && filterOptions.temporadas && filterOptions.temporadas.length > 0 ? (
                      filterOptions.temporadas.map((temp) => (
                        <option key={temp} value={temp}>
                          Temporada {temp}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>Cargando...</option>
                    )}
                  </select>
                </div>

                {/* Filtro Cliente - Lista de Checkboxes */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className={`block text-xs font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                      Clientes {selectedClientes.length > 0 && `(${selectedClientes.length} seleccionados)`}
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSelectAllClientes}
                        className={`text-xs px-2 py-1 border transition-colors ${theme === 'dark'
                          ? 'border-slate-700/60 text-sky-400 hover:bg-slate-700'
                          : 'border-gray-300 text-blue-600 hover:bg-gray-100'
                          }`}
                      >
                        {filterOptions && filterOptions.clientes && selectedClientes.length === filterOptions.clientes.length && filterOptions.clientes.length > 0
                          ? 'Desmarcar todos'
                          : 'Seleccionar todos'}
                      </button>
                      {selectedClientes.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedClientes([])}
                          className={`text-xs px-2 py-1 border transition-colors ${theme === 'dark'
                            ? 'border-slate-700/60 text-slate-400 hover:bg-slate-700'
                            : 'border-gray-300 text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                          Limpiar
                        </button>
                      )}
                    </div>
                  </div>
                  <div className={`max-h-48 overflow-y-auto border p-2 ${theme === 'dark'
                    ? 'border-slate-700 bg-slate-800'
                    : 'border-gray-300 bg-white'
                    }`}>
                    {filterOptions && filterOptions.clientes && filterOptions.clientes.length > 0 ? (
                      <div className="space-y-1">
                        {filterOptions.clientes.map((cliente) => {
                          const isChecked = selectedClientes.some(c => c.toUpperCase() === cliente.toUpperCase());
                          return (
                            <label
                              key={cliente}
                              className={`flex items-center gap-2 p-1.5 cursor-pointer transition-colors rounded ${isChecked
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
                                  handleToggleCliente(cliente);
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                }}
                                className={`h-4 w-4 cursor-pointer flex-shrink-0 ${theme === 'dark'
                                  ? 'border-slate-600 bg-slate-800 text-sky-500 focus:ring-sky-500/50'
                                  : 'border-gray-300 bg-white text-blue-600 focus:ring-blue-500/50'
                                  }`}
                              />
                              <span className={`text-xs sm:text-sm flex-1 ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>
                                {cliente}
                              </span>
                            </label>
                          );
                        })}
                      </div>
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
                    className={`w-full border px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 ${theme === 'dark'
                      ? 'border-slate-700 bg-slate-800 text-slate-200 focus:border-sky-500 focus:ring-sky-500/30'
                      : 'border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500/30'
                      }`}
                    disabled={!filterOptions || !filterOptions.ejecutivos || filterOptions.ejecutivos.length === 0}
                  >
                    <option value="">Todos</option>
                    {filterOptions && filterOptions.ejecutivos && filterOptions.ejecutivos.length > 0 ? (
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
                    className={`w-full border px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 ${theme === 'dark'
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
                    className={`w-full border px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 ${theme === 'dark'
                      ? 'border-slate-700 bg-slate-800 text-slate-200 focus:border-sky-500 focus:ring-sky-500/30'
                      : 'border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500/30'
                      }`}
                    disabled={!filterOptions || !filterOptions.navieras || filterOptions.navieras.length === 0}
                  >
                    <option value="">Todas</option>
                    {filterOptions && filterOptions.navieras && filterOptions.navieras.length > 0 ? (
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
                    className={`w-full border px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 ${theme === 'dark'
                      ? 'border-slate-700 bg-slate-800 text-slate-200 focus:border-sky-500 focus:ring-sky-500/30'
                      : 'border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500/30'
                      }`}
                    disabled={!filterOptions || !filterOptions.especies || filterOptions.especies.length === 0}
                  >
                    <option value="">Todas</option>
                    {filterOptions && filterOptions.especies && filterOptions.especies.length > 0 ? (
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
                    className={`w-full border px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 ${theme === 'dark'
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
                    className={`w-full border px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 ${theme === 'dark'
                      ? 'border-slate-700 bg-slate-800 text-slate-200 focus:border-sky-500 focus:ring-sky-500/30'
                      : 'border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500/30'
                      }`}
                  />
                </div>
              </div>
            </div>
          </aside>
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

const Activity = (props: any) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24" height="24" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round"
  >
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
  </svg>
);
