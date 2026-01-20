'use client';
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect, useMemo } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { User } from '@supabase/supabase-js';
import dynamic from 'next/dynamic';
import { UserProfileModal } from '@/components/users/UserProfileModal';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useTheme } from '@/contexts/ThemeContext';
import {
  Ship,
  Truck,
  LogOut,
  User as UserIcon,
  ArrowRight,
  Clock,
  FileText,
  Plus,
  ChevronLeft,
  ChevronRight,
  Globe,
  Settings,
  Users,
  X,
  LayoutDashboard,
} from 'lucide-react';
import { Registro } from '@/types/registros';
import type { ActiveVessel } from '@/types/vessels';
import { convertSupabaseToApp } from '@/lib/migration-utils';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { AppFooter } from '@/components/layout/AppFooter';

// Importar el mapa dinámicamente para evitar problemas con SSR
const ShipmentsMap = dynamic(() => import('@/components/tracking/ShipmentsMap').then(mod => ({ default: mod.ShipmentsMap })), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[600px] bg-gray-100 dark:bg-gray-900 rounded-lg">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Cargando mapa...</p>
      </div>
    </div>
  )
});

type DashboardStats = {
  total: number;
  totalContenedores: number;
  pendientes: number;
  confirmados: number;
  cancelados: number;
};

type RawRegistroStats = {
  ref_asli: string | null;
  updated_at: string | null;
  contenedor: any;
  estado: string | null;
  temporada?: string | null;
  pod?: string | null;
  shipper?: string | null;
  ejecutivo?: string | null;
  booking?: string | null;
  nave_inicial?: string | null;
  etd?: string | null;
  eta?: string | null;
};

const EMPTY_STATS: DashboardStats = {
  total: 0,
  totalContenedores: 0,
  pendientes: 0,
  confirmados: 0,
  cancelados: 0
};

const normalizeSeasonLabel = (value?: string | null): string => {
  if (!value) {
    return '';
  }
  return value.toString().replace(/^Temporada\s+/i, '').trim();
};

const normalizeToUpper = (value?: string | null): string => {
  if (!value) {
    return '';
  }
  return value.toString().trim().toUpperCase();
};

const parseVesselNameFromNaveInicial = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  const match = trimmed.match(/^(.+?)\s*\[.+\]$/);
  if (match) {
    return match[1].trim();
  }
  return trimmed || null;
};

const computeStatsForRecords = (records: RawRegistroStats[]): DashboardStats => {
  const refAsliMap = new Map<string, { estado: string | null; updated_at: string | null; contenedor: any }>();

  records.forEach((record) => {
    if (!record?.ref_asli) {
      return;
    }

    const existing = refAsliMap.get(record.ref_asli);
    const recordDate = record.updated_at ? new Date(record.updated_at) : null;
    const existingDate = existing?.updated_at ? new Date(existing.updated_at) : null;

    if (!existing || (recordDate && (!existingDate || recordDate > existingDate))) {
      refAsliMap.set(record.ref_asli, {
        estado: record.estado ?? null,
        updated_at: record.updated_at ?? null,
        contenedor: record.contenedor ?? null
      });
    }
  });

  let totalContenedores = 0;
  const estadoCounts = {
    pendientes: 0,
    confirmados: 0,
    cancelados: 0
  };

  refAsliMap.forEach((data) => {
    let contenedorTexto = '';

    if (Array.isArray(data.contenedor)) {
      contenedorTexto = data.contenedor.join(' ');
    } else if (typeof data.contenedor === 'string') {
      try {
        const parsed = JSON.parse(data.contenedor);
        if (Array.isArray(parsed)) {
          contenedorTexto = parsed.join(' ');
        } else {
          contenedorTexto = data.contenedor;
        }
      } catch {
        contenedorTexto = data.contenedor;
      }
    }

    const contenedores = contenedorTexto.trim().split(/\s+/).filter(Boolean);
    totalContenedores += contenedores.length;

    const estado = data.estado ? data.estado.toLowerCase() : '';
    switch (estado) {
      case 'pendiente':
      case 'en proceso':
        estadoCounts.pendientes++;
        break;
      case 'confirmado':
      case 'completado':
        estadoCounts.confirmados++;
        break;
      case 'cancelado':
      case 'rechazado':
        estadoCounts.cancelados++;
        break;
      default:
        break;
    }
  });

  return {
    total: refAsliMap.size,
    totalContenedores,
    pendientes: estadoCounts.pendientes,
    confirmados: estadoCounts.confirmados,
    cancelados: estadoCounts.cancelados
  };
};

const DEFAULT_SEASON_ORDER = ['2025-2026', '2024-2025', '2023-2024', '2022-2023'];

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [rawRegistros, setRawRegistros] = useState<RawRegistroStats[]>([]);
  const [registrosParaMapa, setRegistrosParaMapa] = useState<Registro[]>([]);
  const [activeVessels, setActiveVessels] = useState<ActiveVessel[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<string | null>('2025-2026');
  const [clienteOptions, setClienteOptions] = useState<string[]>([]);
  const [ejecutivoOptions, setEjecutivoOptions] = useState<string[]>([]);
  const [selectedCliente, setSelectedCliente] = useState<string | null>(null);
  const [selectedEjecutivo, setSelectedEjecutivo] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { theme } = useTheme();
  
  // Detectar si estamos en la página de registros y qué filtro está activo
  const isRegistrosPage = pathname === '/registros';
  const activeEstadoFilter = isRegistrosPage ? searchParams.get('estado') : null;

  const recordsForOptions = useMemo(() => {
    if (!selectedSeason) {
      return rawRegistros;
    }

    return rawRegistros.filter(
      (record) => normalizeSeasonLabel(record.temporada) === selectedSeason
    );
  }, [rawRegistros, selectedSeason]);

  useEffect(() => {
    const clienteSet = new Set<string>();
    const ejecutivoSet = new Set<string>();

    recordsForOptions.forEach((record) => {
      const cliente = record.shipper?.trim();
      if (cliente) {
        clienteSet.add(cliente);
      }
      const ejecutivo = record.ejecutivo?.trim();
      if (ejecutivo) {
        ejecutivoSet.add(ejecutivo);
      }
    });

    const clientesList = Array.from(clienteSet).sort((a, b) =>
      a.localeCompare(b, 'es', { sensitivity: 'base' })
    );
    const ejecutivosList = Array.from(ejecutivoSet).sort((a, b) =>
      a.localeCompare(b, 'es', { sensitivity: 'base' })
    );

    setClienteOptions(clientesList);
    setEjecutivoOptions(ejecutivosList);

    if (selectedCliente && !clienteSet.has(selectedCliente)) {
      setSelectedCliente(null);
    }
    if (selectedEjecutivo && !ejecutivoSet.has(selectedEjecutivo)) {
      setSelectedEjecutivo(null);
    }
  }, [recordsForOptions, selectedCliente, selectedEjecutivo, selectedSeason]);

  const filteredByPersona = useMemo(() => {
    return rawRegistros.filter((record) => {
      if (selectedCliente) {
        const cliente = record.shipper?.trim();
        if (!cliente || cliente !== selectedCliente) {
          return false;
        }
      }
      if (selectedEjecutivo) {
        const ejecutivo = record.ejecutivo?.trim();
        if (!ejecutivo || ejecutivo !== selectedEjecutivo) {
          return false;
        }
      }
      return true;
    });
  }, [rawRegistros, selectedCliente, selectedEjecutivo]);

  const seasonAggregations = useMemo(() => {
    const counts: Record<string, number> = {};
    const details: Record<string, DashboardStats> = {};

    const seasonBuckets = new Map<string, RawRegistroStats[]>();

    filteredByPersona.forEach((record) => {
      const seasonKey = normalizeSeasonLabel(record.temporada);
      if (!seasonKey) {
        return;
      }
      if (!seasonBuckets.has(seasonKey)) {
        seasonBuckets.set(seasonKey, []);
      }
      seasonBuckets.get(seasonKey)!.push(record);
    });

    seasonBuckets.forEach((items, key) => {
      const statsForSeason = computeStatsForRecords(items);
      details[key] = statsForSeason;
      counts[key] = statsForSeason.total;
    });

    DEFAULT_SEASON_ORDER.forEach((seasonKey) => {
      if (!(seasonKey in counts)) {
        counts[seasonKey] = 0;
      }
      if (!details[seasonKey]) {
        details[seasonKey] = { ...EMPTY_STATS };
      }
    });

    return { counts, details };
  }, [filteredByPersona]);

  const seasonStats = seasonAggregations.counts;

  const filteredByAll = useMemo(() => {
    return filteredByPersona.filter((record) => {
      if (selectedSeason) {
        return normalizeSeasonLabel(record.temporada) === selectedSeason;
      }
      return true;
    });
  }, [filteredByPersona, selectedSeason]);

  const displayedStats = useMemo(
    () => computeStatsForRecords(filteredByAll),
    [filteredByAll]
  );

  const now = new Date();

  const inTransitBookingsCount = useMemo(() => {
    const bookingSet = new Set<string>();

    filteredByAll.forEach((record) => {
      const estadoNorm = normalizeToUpper(record.estado);
      if (estadoNorm === 'CANCELADO') {
        return;
      }

      const etdDate = record.etd ? new Date(record.etd) : null;
      const etaDate = record.eta ? new Date(record.eta) : null;

      // Zarpe ya ocurrió y aún no llega al destino (ETA futura o nula)
      if (etdDate && etdDate <= now && (!etaDate || etaDate > now)) {
        if (record.booking) {
          bookingSet.add(record.booking.trim());
        }
      }
    });

    return bookingSet.size;
  }, [filteredByAll, now]);

  const filteredRegistrosParaMapa = useMemo(() => {
    return registrosParaMapa.filter((registro) => {
      if (selectedSeason && normalizeSeasonLabel(registro.temporada ?? '') !== selectedSeason) {
        return false;
      }
      if (selectedCliente) {
        const cliente = registro.shipper?.trim();
        if (!cliente || cliente !== selectedCliente) {
          return false;
        }
      }
      if (selectedEjecutivo) {
        const ejecutivo = registro.ejecutivo?.trim();
        if (!ejecutivo || ejecutivo !== selectedEjecutivo) {
          return false;
        }
      }
      return true;
    });
  }, [registrosParaMapa, selectedSeason, selectedCliente, selectedEjecutivo]);


  // TEMPORARY: Mostrar todas las naves para debugging
  const filteredActiveVessels = useMemo(() => {
    console.log('[Dashboard] Total active vessels:', activeVessels.length);
    activeVessels.forEach(v => {
      console.log('[Dashboard] Active vessel:', v.vessel_name, 'lat:', v.last_lat, 'lon:', v.last_lon);
    });

    // Por ahora, mostrar TODAS las naves activas sin filtrar
    return activeVessels;

    /* FILTRO ORIGINAL - COMENTADO TEMPORALMENTE
    const validVesselNames = new Set<string>();
    const now = new Date();

    filteredRegistrosParaMapa.forEach((registro) => {
      // Si tiene ETA y ya pasó, no mostrar el barco
      if (registro.eta) {
        const etaDate = new Date(registro.eta);
        if (etaDate <= now) {
          return;
        }
      }

      // Obtener nombre del barco
      const vesselName = parseVesselNameFromNaveInicial(registro.naveInicial);
      if (vesselName) {
        const normalizedName = vesselName.toUpperCase().trim();
        validVesselNames.add(normalizedName);
        console.log('[Dashboard] Vessel from registro:', normalizedName, 'from:', registro.naveInicial);
      }
    });

    console.log('[Dashboard] Valid vessel names from registros:', Array.from(validVesselNames));
    console.log('[Dashboard] Active vessels from API:', activeVessels.map(v => v.vessel_name));

    const filtered = activeVessels.filter((vessel) => {
      if (!vessel.vessel_name) return false;
      const normalizedVesselName = vessel.vessel_name.toUpperCase().trim();
      const matches = validVesselNames.has(normalizedVesselName);
      console.log('[Dashboard] Checking vessel:', normalizedVesselName, 'matches:', matches);
      return matches;
    });

    console.log('[Dashboard] Filtered vessels count:', filtered.length);
    return filtered;
    */
  }, [activeVessels, filteredRegistrosParaMapa]);


  const displayedSeasonLabel = selectedSeason ? `Temporada ${selectedSeason}` : null;

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadStats();
      void loadActiveVessels();

      // Refrescar datos de buques automáticamente cada 60 segundos (1 minuto)
      const intervalId = setInterval(() => {
        void loadActiveVessels();
      }, 60000); // 60000 ms = 60 segundos

      return () => {
        clearInterval(intervalId);
      };
    }
  }, [user]);

  const checkUser = async () => {
    try {
      const supabase = createClient();
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error) throw error;

      if (!user) {
        // Usar window.location.replace para evitar bucles con rewrites
        window.location.replace('/auth');
        return;
      }

      setUser(user);

      // Obtener información del usuario desde la tabla usuarios
      // SIEMPRE cargar datos frescos desde Supabase para evitar datos obsoletos
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('auth_user_id', user.id)
        .single();

      if (userError) {
        console.error('Error obteniendo información del usuario:', userError);
        // Si no se encuentra en la tabla usuarios, intentar usar datos de auth como fallback
        setUserInfo({
          nombre: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario',
          email: user.email || ''
        });
      } else {
        // Usar datos de la tabla usuarios (fuente de verdad)
        setUserInfo(userData);
      }
    } catch (error) {
      console.error('Error checking user:', error);
      // Usar window.location.replace para evitar bucles con rewrites
      window.location.replace('/auth');
    } finally {
      setLoading(false);
    }
  };

  const handleUserUpdate = (updatedUser: any) => {
    setUserInfo(updatedUser);
  };

  const loadStats = async () => {
    try {
      const supabase = createClient();

      const { data: registros, error } = await supabase
        .from('registros')
        .select('ref_asli, estado, updated_at, contenedor, pol, pod, naviera, shipper, ejecutivo, booking, nave_inicial, etd, eta, deposito, temporada')
        .is('deleted_at', null)
        .not('ref_asli', 'is', null);

      if (error) throw error;

      const registrosList = (registros || []) as RawRegistroStats[];

      const registrosConRutas = registrosList
        .filter((r) => r.pod)
        .map((registro) => convertSupabaseToApp(registro));

      setRegistrosParaMapa(registrosConRutas);
      setRawRegistros(registrosList);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadActiveVessels = async () => {
    try {
      // Agregar timestamp para evitar cache
      const response = await fetch(`/api/vessels/active?t=${Date.now()}`, {
        cache: 'no-store',
        next: { revalidate: 0 },
      });
      if (!response.ok) {
        return;
      }
      const payload = (await response.json()) as { vessels?: ActiveVessel[] } | ActiveVessel[];
      const vessels = Array.isArray(payload) ? payload : payload.vessels ?? [];
      setActiveVessels(vessels);
    } catch (error) {
      console.error('Error loading active vessels for main map:', error);
    }
  };

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/auth');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const toggleSidebar = () => setIsSidebarCollapsed((prev) => !prev);

  const modules = [
    {
      id: 'registros',
      title: 'Registros de Embarques',
      description: 'Gestión completa de contenedores y embarques',
      icon: Ship,
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600',
      available: true,
      stats: displayedStats
    },
    {
      id: 'dashboard/seguimiento',
      title: 'Seguimiento de Buques',
      description: 'Mapa AIS y estado de los buques activos',
      icon: Globe,
      color: 'bg-sky-500',
      hoverColor: 'hover:bg-sky-600',
      available: true,
      stats: null
    },
    {
      id: 'transportes',
      title: 'Registros de Transporte',
      description: 'Control de flota y rutas de transporte',
      icon: Truck,
      color: 'bg-green-500',
      hoverColor: 'hover:bg-green-600',
      available: true,
      stats: null
    },
    {
      id: 'documentos',
      title: 'Documentos',
      description: 'Ver, editar y crear facturas para las REF ASLI',
      icon: FileText,
      color: 'bg-purple-500',
      hoverColor: 'hover:bg-purple-600',
      available: true,
      stats: null
    }
  ];

  if (loading) {
    return <LoadingScreen message="Cargando dashboard..." />;
  }

  if (!user) {
    return null;
  }

  const toneBadgeClasses = {
    sky: 'bg-sky-500/20 text-sky-300',
    rose: 'bg-rose-500/20 text-rose-300',
    violet: 'bg-violet-500/20 text-violet-300',
    lime: 'bg-lime-500/20 text-lime-300',
  } as const;

  type SidebarNavItem =
    | { label: string; id: string; isActive?: boolean; icon?: React.ComponentType<{ className?: string }> }
    | { label: string; counter: number; tone: keyof typeof toneBadgeClasses; onClick?: () => void; isActive?: boolean; icon?: React.ComponentType<{ className?: string }> };

  type SidebarSection = {
    title: string;
    items: SidebarNavItem[];
  };

  const toneCycle: (keyof typeof toneBadgeClasses)[] = ['sky', 'rose', 'violet', 'lime'];
  const seasonKeys = Array.from(new Set([...DEFAULT_SEASON_ORDER, ...Object.keys(seasonStats)]));
  const seasonNavItems: SidebarNavItem[] = seasonKeys.map((seasonKey, index) => ({
    label: `Temporada ${seasonKey}`,
    counter: seasonStats[seasonKey] ?? 0,
    tone: toneCycle[index % toneCycle.length],
    onClick: () => setSelectedSeason((prev) => (prev === seasonKey ? null : seasonKey)),
    isActive: selectedSeason === seasonKey,
  }));

  const isAdmin = userInfo?.rol === 'admin';
  const isEjecutivo = userInfo?.email?.endsWith('@asli.cl') || user?.email?.endsWith('@asli.cl');

  const isRodrigo = userInfo?.email?.toLowerCase() === 'rodrigo.caceres@asli.cl';
  const canAccessMaintenance = isAdmin || isRodrigo;

  const sidebarNav: SidebarSection[] = [
    {
      title: 'Inicio',
      items: [
        { label: 'Dashboard', id: 'dashboard', isActive: true, icon: LayoutDashboard },
      ],
    },
    {
      title: 'Módulos',
      items: [
        { label: 'Embarques', id: 'registros', isActive: false, icon: Ship },
        { label: 'Seguimiento', id: 'dashboard/seguimiento', isActive: false, icon: Globe },
        { label: 'Transportes', id: 'transportes', isActive: false, icon: Truck },
        { label: 'Documentos', id: 'documentos', isActive: false, icon: FileText },
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
                            if (item.id === 'dashboard') {
                              // Si ya estamos en dashboard, no hacer nada
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
                <p className={`text-[10px] sm:text-[11px] uppercase tracking-[0.3em] sm:tracking-[0.4em] ${theme === 'dark' ? 'text-slate-500/80' : 'text-gray-500'}`}>Panel General</p>
                <h1 className={`text-xl sm:text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Dashboard</h1>
                <p className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>Coordinación integral de embarques y transportes</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 ml-auto">
              <select
                value={selectedSeason ?? ''}
                onChange={(event) => setSelectedSeason(event.target.value || null)}
                className={`min-w-[180px] sm:min-w-[200px] rounded-full border px-3 sm:px-4 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 ${
                  theme === 'dark'
                    ? 'border-slate-800 bg-slate-900/80 text-slate-200 focus:border-sky-500 focus:ring-sky-500/30'
                    : 'border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500/30 shadow-sm'
                }`}
              >
                <option value="">Todas las temporadas</option>
                {Array.from(new Set([...DEFAULT_SEASON_ORDER, ...Object.keys(seasonStats)])).map((seasonKey) => (
                  <option key={seasonKey} value={seasonKey}>
                    Temporada {seasonKey} ({seasonStats[seasonKey] ?? 0})
                  </option>
                ))}
              </select>
              <button
                onClick={() => router.push('/registros')}
                className={`inline-flex items-center gap-2 rounded-full px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 ${
                  theme === 'dark'
                    ? 'bg-gradient-to-r from-sky-500 to-indigo-500 shadow-sky-500/20 focus:ring-sky-500/50'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-blue-500/20 focus:ring-blue-500/50'
                }`}
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Agregar registro</span>
                <span className="sm:hidden">Agregar</span>
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
          {/* Sección de bienvenida simplificada */}
          <section className={`rounded-2xl border p-4 sm:p-6 shadow-xl ${
            theme === 'dark'
              ? 'border-slate-800/60 bg-gradient-to-br from-slate-950/80 to-slate-900/60'
              : 'border-gray-200 bg-white shadow-md'
          }`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className={`text-xs sm:text-sm mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>Bienvenido</p>
                <h2 className={`text-xl sm:text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {userInfo?.nombre || user.user_metadata?.full_name || 'Usuario'}
                </h2>
                {displayedSeasonLabel && (
                  <p className={`text-xs sm:text-sm mt-2 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                    Temporada: <span className={`font-medium ${theme === 'dark' ? 'text-sky-300' : 'text-blue-600'}`}>{displayedSeasonLabel}</span>
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3 sm:gap-4">
                <button
                  onClick={() => router.push('/registros')}
                  className={`text-center transition-all hover:scale-105 active:scale-95 cursor-pointer rounded-lg px-2 py-1 -mx-2 -my-1 ${
                    isRegistrosPage && !activeEstadoFilter
                      ? theme === 'dark'
                        ? 'bg-slate-800/60 border border-slate-600/50 shadow-lg shadow-slate-900/50'
                        : 'bg-gray-100 border border-gray-300 shadow-md'
                      : ''
                  }`}
                  aria-label="Ver todos los embarques"
                >
                  <p className={`text-xl sm:text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{displayedStats.total}</p>
                  <p className={`text-[10px] sm:text-xs mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>Embarques</p>
                </button>
                <div className={`h-12 w-px ${theme === 'dark' ? 'bg-slate-700' : 'bg-gray-300'}`}></div>
                <button
                  onClick={() => router.push('/registros?estado=CONFIRMADO')}
                  className={`text-center transition-all hover:scale-105 active:scale-95 cursor-pointer rounded-lg px-2 py-1 -mx-2 -my-1 ${
                    activeEstadoFilter === 'CONFIRMADO'
                      ? theme === 'dark'
                        ? 'bg-emerald-900/40 border border-emerald-600/50 shadow-lg shadow-emerald-900/30'
                        : 'bg-emerald-50 border border-emerald-300 shadow-md'
                      : ''
                  }`}
                  aria-label="Ver confirmados"
                >
                  <p className="text-xl sm:text-2xl font-bold text-emerald-500">{displayedStats.confirmados}</p>
                  <p className={`text-[10px] sm:text-xs mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>Confirmados</p>
                </button>
                <div className={`h-12 w-px ${theme === 'dark' ? 'bg-slate-700' : 'bg-gray-300'}`}></div>
                <button
                  onClick={() => router.push('/registros?estado=PENDIENTE')}
                  className={`text-center transition-all hover:scale-105 active:scale-95 cursor-pointer rounded-lg px-2 py-1 -mx-2 -my-1 ${
                    activeEstadoFilter === 'PENDIENTE'
                      ? theme === 'dark'
                        ? 'bg-amber-900/40 border border-amber-600/50 shadow-lg shadow-amber-900/30'
                        : 'bg-amber-50 border border-amber-300 shadow-md'
                      : ''
                  }`}
                  aria-label="Ver pendientes"
                >
                  <p className="text-xl sm:text-2xl font-bold text-amber-500">{displayedStats.pendientes}</p>
                  <p className={`text-[10px] sm:text-xs mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>Pendientes</p>
                </button>
                <div className={`h-12 w-px ${theme === 'dark' ? 'bg-slate-700' : 'bg-gray-300'}`}></div>
                <button
                  onClick={() => router.push('/registros?estado=CANCELADO')}
                  className={`text-center transition-all hover:scale-105 active:scale-95 cursor-pointer rounded-lg px-2 py-1 -mx-2 -my-1 ${
                    activeEstadoFilter === 'CANCELADO'
                      ? theme === 'dark'
                        ? 'bg-red-900/40 border border-red-600/50 shadow-lg shadow-red-900/30'
                        : 'bg-red-50 border border-red-300 shadow-md'
                      : ''
                  }`}
                  aria-label="Ver cancelados"
                >
                  <p className="text-xl sm:text-2xl font-bold text-red-500">{displayedStats.cancelados}</p>
                  <p className={`text-[10px] sm:text-xs mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>Cancelados</p>
                </button>
              </div>
            </div>
          </section>

          {/* Módulos principales - Simplificados */}
          <section className="space-y-4">
            <div>
              <h3 className={`text-base sm:text-lg font-semibold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Accesos rápidos</h3>
              <p className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>Selecciona una opción para comenzar</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {modules.map((module) => {
                const IconComponent = module.icon;
                const isDisabled = !module.available;

                return (
                  <button
                    key={module.id}
                    onClick={() => {
                      if (!isDisabled) {
                        router.push(`/${module.id}`);
                      }
                    }}
                    disabled={isDisabled}
                    className={`group relative overflow-hidden rounded-xl border-2 p-4 sm:p-6 text-left transition-all ${
                      theme === 'dark'
                        ? `border-slate-800/70 bg-gradient-to-br from-slate-950/80 to-slate-900/60 ${isDisabled ? 'opacity-60 cursor-not-allowed' : 'hover:border-sky-500/60 hover:shadow-xl hover:shadow-sky-900/30 hover:scale-[1.02] active:scale-[0.98]'}`
                        : `border-gray-200 bg-white shadow-md ${isDisabled ? 'opacity-60 cursor-not-allowed' : 'hover:border-blue-500 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]'}`
                    }`}
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className={`flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-xl border flex-shrink-0 ${
                        theme === 'dark'
                          ? 'bg-gradient-to-br from-sky-500/20 to-indigo-500/20 border-sky-500/30'
                          : 'bg-gradient-to-br from-blue-100 to-indigo-100 border-blue-200'
                      }`}>
                        <IconComponent className={`h-6 w-6 sm:h-7 sm:w-7 ${theme === 'dark' ? 'text-sky-300' : 'text-blue-600'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className={`text-lg sm:text-xl font-semibold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{module.title}</h4>
                        <p className={`text-xs sm:text-sm mb-3 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>{module.description}</p>
                        {module.stats && (
                          <div className="flex items-center gap-3 sm:gap-4 text-xs">
                            <div className="flex items-center gap-1.5">
                              <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                              <span className={theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}>{module.stats.confirmados} confirmados</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="h-2 w-2 rounded-full bg-amber-500"></div>
                              <span className={theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}>{module.stats.pendientes} pendientes</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="h-2 w-2 rounded-full bg-red-500"></div>
                              <span className={theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}>{module.stats.cancelados} cancelados</span>
                            </div>
                          </div>
                        )}
                      </div>
                      <ArrowRight className={`h-5 w-5 transition flex-shrink-0 ${theme === 'dark' ? 'text-slate-500 group-hover:text-sky-300' : 'text-gray-400 group-hover:text-blue-600'}`} />
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Mapa de embarques - Simplificado */}
          <section className="space-y-4">
            <div>
              <h3 className={`text-base sm:text-lg font-semibold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Ubicación de embarques</h3>
              <p className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>Visualiza el estado de tus embarques en tiempo real</p>
            </div>
            <div className={`rounded-2xl border p-4 shadow-lg ${
              theme === 'dark'
                ? 'border-slate-800/70 bg-slate-950/60'
                : 'border-gray-200 bg-white'
            }`}>
              <ShipmentsMap registros={filteredRegistrosParaMapa} activeVessels={filteredActiveVessels} />
            </div>
          </section>

          <AppFooter />
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

