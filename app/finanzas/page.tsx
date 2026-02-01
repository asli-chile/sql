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
  FileText,
  FileCheck,
  DollarSign,
  Filter,
  X as XIcon,
  AlertCircle,
  BarChart3,
  Users,
} from 'lucide-react';
import { Registro } from '@/types/registros';
import { convertSupabaseToApp } from '@/lib/migration-utils';
import { FinanzasSection } from '@/components/finanzas/FinanzasSection';
import { AppFooter } from '@/components/layout/AppFooter';
import { Sidebar } from '@/components/layout/Sidebar';
import { SidebarSection } from '@/types/layout';

const normalizeSeasonLabel = (value?: string | null): string => {
  if (!value) {
    return '';
  }
  return value.toString().replace(/^Temporada\s+/i, '').trim();
};


export default function FinanzasPage() {
  // Página de finanzas - Acceso restringido solo para Rodrigo
  const [user, setUser] = useState<User | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [allRegistros, setAllRegistros] = useState<Registro[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);
  const [selectedClientes, setSelectedClientes] = useState<string[]>([]);
  const [selectedEjecutivo, setSelectedEjecutivo] = useState<string | null>(null);
  const [selectedEstado, setSelectedEstado] = useState<string | null>(null);
  const [selectedNaviera, setSelectedNaviera] = useState<string | null>(null);
  const [selectedEspecie, setSelectedEspecie] = useState<string | null>(null);
  const [selectedNave, setSelectedNave] = useState<string | null>(null);
  const [selectedContrato, setSelectedContrato] = useState<string | null>(null);
  const [fechaDesde, setFechaDesde] = useState<string>('');
  const [fechaHasta, setFechaHasta] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { theme } = useTheme();

  // Verificar si es Rodrigo (debe estar antes de los hooks)
  const isRodrigo = userInfo?.email?.toLowerCase() === 'rodrigo.caceres@asli.cl';

  // Calcular canEdit basado en el rol del usuario
  const canEdit = useMemo(() => {
    if (!userInfo) return false;
    return userInfo.rol === 'admin' || userInfo.rol === 'ejecutivo' || isRodrigo;
  }, [userInfo, isRodrigo]);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadRegistros();
    }
  }, [user]);

  // Debug: Log cuando cambian los registros
  useEffect(() => {
    console.log('[FinanzasPage] Registros actualizados:', {
      count: registros.length,
      allCount: allRegistros.length,
      hasData: registros.length > 0,
      firstRecord: registros[0]
    });
  }, [registros, allRegistros]);

  // Generar opciones para los filtros basadas en los filtros ya seleccionados (filtrado en cascada)
  const filterOptions = useMemo(() => {
    if (!allRegistros || allRegistros.length === 0) {
      return {
        clientes: [],
        ejecutivos: [],
        navieras: [],
        especies: [],
        temporadas: [],
        naves: [],
        contratos: [],
      };
    }

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

    if (selectedNave) {
      registrosFiltrados = registrosFiltrados.filter((r) => {
        const nave = (r.naveInicial || '').trim().toUpperCase();
        return nave === selectedNave.toUpperCase();
      });
    }

    if (selectedContrato) {
      registrosFiltrados = registrosFiltrados.filter((r) => {
        const contrato = (r.contrato || '').trim().toUpperCase();
        return contrato === selectedContrato.toUpperCase();
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

    // Generar opciones desde los registros filtrados
    const clientes = new Set<string>();
    const ejecutivos = new Set<string>();
    const navieras = new Set<string>();
    const especies = new Set<string>();
    const temporadas = new Set<string>();
    const naves = new Set<string>();
    const contratos = new Set<string>();

    registrosFiltrados.forEach((r) => {
      if (r.shipper) clientes.add(r.shipper.trim());
      if (r.ejecutivo) ejecutivos.add(r.ejecutivo.trim());
      if (r.naviera) navieras.add(r.naviera.trim());
      if (r.especie) especies.add(r.especie.trim());
      if (r.naveInicial) naves.add(r.naveInicial.trim());
      if (r.contrato) contratos.add(r.contrato.trim());
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
      naves: Array.from(naves).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' })),
      contratos: Array.from(contratos).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' })),
    };
  }, [allRegistros, selectedSeason, selectedClientes, selectedEjecutivo, selectedEstado, selectedNaviera, selectedEspecie, selectedNave, selectedContrato, fechaDesde, fechaHasta]);

  // Aplicar filtros a los registros
  const filteredRegistros = useMemo(() => {
    if (!allRegistros || allRegistros.length === 0) {
      return [];
    }

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

    if (selectedNave) {
      filtered = filtered.filter((r) => {
        const nave = (r.naveInicial || '').trim().toUpperCase();
        return nave === selectedNave.toUpperCase();
      });
    }

    if (selectedContrato) {
      filtered = filtered.filter((r) => {
        const contrato = (r.contrato || '').trim().toUpperCase();
        return contrato === selectedContrato.toUpperCase();
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
      hasta.setHours(23, 59, 59, 999);
      filtered = filtered.filter((r) => {
        if (!r.etd) return false;
        const etd = r.etd instanceof Date ? r.etd : new Date(r.etd);
        return etd <= hasta;
      });
    }

    return filtered;
  }, [allRegistros, selectedSeason, selectedClientes, selectedEjecutivo, selectedEstado, selectedNaviera, selectedEspecie, selectedNave, selectedContrato, fechaDesde, fechaHasta]);

  // Actualizar registros cuando cambian los filtros
  useEffect(() => {
    setRegistros(filteredRegistros);
  }, [filteredRegistros]);

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

  const loadRegistros = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('registros')
        .select('*')
        .is('deleted_at', null)
        .not('ref_asli', 'is', null)
        .order('ref_asli', { ascending: false });

      if (error) {
        console.error('Error en consulta de registros:', error);
        throw error;
      }

      const registrosList = (data || []).map((registro: any) => convertSupabaseToApp(registro));
      console.log('[Finanzas] Registros cargados:', registrosList.length);
      setAllRegistros(registrosList);
      setRegistros(registrosList);
    } catch (error) {
      console.error('Error cargando registros:', error);
      setRegistros([]);
      setAllRegistros([]);
    }
  };

  const handleClearFilters = () => {
    setSelectedSeason(null);
    setSelectedClientes([]);
    setSelectedEjecutivo(null);
    setSelectedEstado(null);
    setSelectedNaviera(null);
    setSelectedEspecie(null);
    setSelectedNave(null);
    setSelectedContrato(null);
    setFechaDesde('');
    setFechaHasta('');
  };

  const handleToggleCliente = (cliente: string) => {
    setSelectedClientes((prev) => {
      const clienteNormalizado = cliente.trim();
      const clienteUpper = clienteNormalizado.toUpperCase();
      const exists = prev.some(c => c.trim().toUpperCase() === clienteUpper);

      if (exists) {
        return prev.filter(c => c.trim().toUpperCase() !== clienteUpper);
      } else {
        return [...prev, clienteNormalizado];
      }
    });
  };

  const handleSelectAllClientes = () => {
    if (!filterOptions || !filterOptions.clientes || filterOptions.clientes.length === 0) {
      return;
    }
    if (selectedClientes.length === filterOptions.clientes.length) {
      setSelectedClientes([]);
    } else {
      setSelectedClientes([...filterOptions.clientes]);
    }
  };

  const hasActiveFilters = selectedSeason || selectedClientes.length > 0 || selectedEjecutivo || selectedEstado || selectedNaviera || selectedEspecie || selectedNave || selectedContrato || fechaDesde || fechaHasta;

  const toggleSidebar = () => setIsSidebarCollapsed((prev) => !prev);

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
            { label: 'Finanzas', id: '/finanzas', isActive: true, icon: DollarSign },
            { label: 'Reportes', id: '/reportes', icon: BarChart3 },
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
    return null;
  }

  if (!user || !isRodrigo) {
    return (
      <div className={`flex h-screen items-center justify-center ${theme === 'dark' ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100' : 'bg-gray-50 text-gray-900'}`}>
        <div className={`border p-8 text-center max-w-md ${theme === 'dark' ? 'border-slate-700/60 bg-slate-900' : 'border-gray-300 bg-white'}`}>
          <AlertCircle className={`h-16 w-16 mx-auto mb-4 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`} />
          <h2 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Acceso Restringido</h2>
          <p className={`mb-6 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
            No tienes permiso para acceder a este módulo.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-3 border text-lg font-medium text-white bg-blue-600 border-blue-500 hover:bg-blue-700 transition-colors"
          >
            Volver al Dashboard
          </button>
        </div>
      </div>
    );
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
        <header className={`sticky top-0 z-40 border-b overflow-hidden ${theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'} print:hidden`}>
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
              <ChevronRight className="h-5 w-5" />
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
                <p className={`text-[10px] sm:text-[11px] uppercase tracking-[0.2em] sm:tracking-[0.3em] ${theme === 'dark' ? 'text-slate-500/80' : 'text-gray-500'}`}>Módulo Financiero</p>
                <h1 className={`text-lg sm:text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Finanzas</h1>
                <p className={`text-[11px] sm:text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>Control de costos, ingresos y márgenes por embarque</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-3 ml-auto">
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
                      : 'border-gray-300 text-gray-700 hover:border-blue-400 hover:text-blue-600 bg-white shadow-sm'
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
                      selectedNave,
                      selectedContrato,
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
                title={userInfo?.nombre || userInfo?.email}
              >
                <UserIcon className="h-4 w-4" />
                {userInfo?.nombre || userInfo?.email}
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 w-full">
          <div className="mx-auto w-full max-w-[1600px] px-4 pt-4 space-y-4 sm:px-6 sm:pt-6 sm:space-y-6 lg:px-8 lg:space-y-6 xl:px-10 xl:space-y-8">
            {/* Panel de Filtros */}
            {showFilters && (
              <div className={`border p-4 sm:p-5 ${theme === 'dark' ? 'border-slate-700/60 bg-slate-900' : 'border-gray-300 bg-white'}`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Filtros
                  </h3>
                  <div className="flex items-center gap-2">
                    {hasActiveFilters && (
                      <button
                        onClick={handleClearFilters}
                        className={`text-xs px-3 py-1.5 border transition-colors ${theme === 'dark'
                          ? 'border-slate-700/60 text-slate-300 hover:bg-slate-700'
                          : 'border-gray-300 text-gray-600 hover:bg-gray-100'
                          }`}
                      >
                        Limpiar filtros
                      </button>
                    )}
                    <button
                      onClick={() => setShowFilters(false)}
                      className={`p-1.5 border transition-colors ${theme === 'dark'
                        ? 'border-slate-700/60 text-slate-300 hover:bg-slate-700'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-100'
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
                      onChange={(e) => setSelectedSeason(e.target.value || null)}
                      className={`w-full border px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 ${theme === 'dark'
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
                          className={`text-xs px-2 py-1 rounded transition-colors ${theme === 'dark'
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
                            className={`text-xs px-2 py-1 rounded transition-colors ${theme === 'dark'
                              ? 'text-slate-400 hover:bg-slate-700'
                              : 'text-gray-600 hover:bg-gray-100'
                              }`}
                          >
                            Limpiar
                          </button>
                        )}
                      </div>
                    </div>
                    <div className={`max-h-48 overflow-y-auto border p-3 space-y-2 ${theme === 'dark'
                      ? 'border-slate-700 bg-slate-800'
                      : 'border-gray-300 bg-white'
                      }`}>
                      {filterOptions.clientes.length > 0 ? (
                        filterOptions.clientes.map((cliente) => {
                          const isChecked = selectedClientes.some(c => c.toUpperCase() === cliente.toUpperCase());
                          return (
                            <label
                              key={cliente}
                              className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${isChecked
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
                                className={`h-4 w-4 rounded cursor-pointer flex-shrink-0 ${theme === 'dark'
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
                      onChange={(e) => setSelectedEjecutivo(e.target.value || null)}
                      className={`w-full border px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 ${theme === 'dark'
                        ? 'border-slate-700 bg-slate-800 text-slate-200 focus:border-sky-500 focus:ring-sky-500/30'
                        : 'border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500/30'
                        }`}
                      disabled={filterOptions.ejecutivos.length === 0}
                    >
                      <option value="">Todos</option>
                      {filterOptions.ejecutivos.map((ejecutivo) => (
                        <option key={ejecutivo} value={ejecutivo}>
                          {ejecutivo}
                        </option>
                      ))}
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
                      onChange={(e) => setSelectedNaviera(e.target.value || null)}
                      className={`w-full border px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 ${theme === 'dark'
                        ? 'border-slate-700 bg-slate-800 text-slate-200 focus:border-sky-500 focus:ring-sky-500/30'
                        : 'border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500/30'
                        }`}
                      disabled={filterOptions.navieras.length === 0}
                    >
                      <option value="">Todas</option>
                      {filterOptions.navieras.map((naviera) => (
                        <option key={naviera} value={naviera}>
                          {naviera}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Filtro Especie */}
                  <div>
                    <label className={`block text-xs font-medium mb-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                      Especie
                    </label>
                    <select
                      value={selectedEspecie ?? ''}
                      onChange={(e) => setSelectedEspecie(e.target.value || null)}
                      className={`w-full border px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 ${theme === 'dark'
                        ? 'border-slate-700 bg-slate-800 text-slate-200 focus:border-sky-500 focus:ring-sky-500/30'
                        : 'border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500/30'
                        }`}
                      disabled={filterOptions.especies.length === 0}
                    >
                      <option value="">Todas</option>
                      {filterOptions.especies.map((especie) => (
                        <option key={especie} value={especie}>
                          {especie}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Filtro Nave */}
                  <div>
                    <label className={`block text-xs font-medium mb-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                      Nave
                    </label>
                    <select
                      value={selectedNave ?? ''}
                      onChange={(e) => setSelectedNave(e.target.value || null)}
                      className={`w-full border px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 ${theme === 'dark'
                        ? 'border-slate-700 bg-slate-800 text-slate-200 focus:border-sky-500 focus:ring-sky-500/30'
                        : 'border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500/30'
                        }`}
                      disabled={filterOptions.naves.length === 0}
                    >
                      <option value="">Todas</option>
                      {filterOptions.naves.map((nave) => (
                        <option key={nave} value={nave}>
                          {nave}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Filtro Contrato */}
                  <div>
                    <label className={`block text-xs font-medium mb-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                      Contrato
                    </label>
                    <select
                      value={selectedContrato ?? ''}
                      onChange={(e) => setSelectedContrato(e.target.value || null)}
                      className={`w-full border px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 ${theme === 'dark'
                        ? 'border-slate-700 bg-slate-800 text-slate-200 focus:border-sky-500 focus:ring-sky-500/30'
                        : 'border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500/30'
                        }`}
                      disabled={filterOptions.contratos.length === 0}
                    >
                      <option value="">Todos</option>
                      {filterOptions.contratos.map((contrato) => (
                        <option key={contrato} value={contrato}>
                          {contrato}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Filtro Fecha Desde */}
                  <div>
                    <label className={`block text-xs font-medium mb-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                      Fecha Desde
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
                      Fecha Hasta
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
            )}

            {/* Contenido de Finanzas */}
            <FinanzasSection registros={registros} canEdit={canEdit} />

            {/* Footer */}
            <div className="pt-6">
              <AppFooter />
            </div>
          </div>
        </main>
      </div>

      {/* Modal de perfil de usuario */}
      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        userInfo={userInfo}
        onUserUpdate={(updatedUser) => setUserInfo(updatedUser)}
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
