'use client';
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { User } from '@supabase/supabase-js';
import dynamic from 'next/dynamic';
import { UserProfileModal } from '@/components/users/UserProfileModal';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { PageWrapper } from '@/components/PageWrapper';
import { useTheme } from '@/contexts/ThemeContext';
import {
  Ship,
  Truck,
  LogOut,
  User as UserIcon,
  ArrowRight,
  Clock,
  FileText,
  FileCheck,
  Plus,
  ChevronLeft,
  ChevronRight,
  Globe,
  Settings,
  Users,
  X,
  LayoutDashboard,
  BarChart3,
  DollarSign,
  Activity,
} from 'lucide-react';
import { Registro } from '@/types/registros';
import type { ActiveVessel } from '@/types/vessels';
import { convertSupabaseToApp } from '@/lib/migration-utils';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { AppFooter } from '@/components/layout/AppFooter';
import { Sidebar } from '@/components/layout/Sidebar';
import { SidebarSection } from '@/types/layout';
import { useUser } from '@/hooks/useUser';
import { BookingModal } from '@/components/modals/BookingModal';
import { Upload, Eye, RefreshCw } from 'lucide-react';
import { normalizeBooking, sanitizeFileName, parseStoredDocumentName, formatFileDisplayName } from '@/utils/documentUtils';
import { useToast } from '@/hooks/useToast';

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
  let totalContenedores = 0;
  const estadoCounts = {
    pendientes: 0,
    confirmados: 0,
    cancelados: 0
  };

  records.forEach((record) => {
    // 1. Contar contenedores
    let contenedorTexto = '';
    const contenedorData = record.contenedor;

    if (Array.isArray(contenedorData)) {
      contenedorTexto = contenedorData.join(' ');
    } else if (typeof contenedorData === 'string') {
      try {
        const parsed = JSON.parse(contenedorData);
        if (Array.isArray(parsed)) {
          contenedorTexto = parsed.join(' ');
        } else {
          contenedorTexto = contenedorData;
        }
      } catch {
        contenedorTexto = contenedorData;
      }
    }

    const contenedores = contenedorTexto.trim().split(/\s+/).filter(Boolean);
    totalContenedores += contenedores.length;

    // 2. Contar estados (según estados estándar de Registros)
    const estado = record.estado ? record.estado.toUpperCase() : '';
    switch (estado) {
      case 'PENDIENTE':
        estadoCounts.pendientes++;
        break;
      case 'CONFIRMADO':
        estadoCounts.confirmados++;
        break;
      case 'CANCELADO':
        estadoCounts.cancelados++;
        break;
      default:
        // Por defecto, si no es confirmado ni cancelado, lo tratamos como pendiente si tiene valor
        if (estado && !['CONFIRMADO', 'CANCELADO'].includes(estado)) {
          estadoCounts.pendientes++;
        }
        break;
    }
  });

  return {
    total: records.length,
    totalContenedores,
    pendientes: estadoCounts.pendientes,
    confirmados: estadoCounts.confirmados,
    cancelados: estadoCounts.cancelados
  };
};

const DEFAULT_SEASON_ORDER = ['2025-2026', '2024-2025', '2023-2024', '2022-2023'];

function DashboardPage() {
  console.log('🚀 DashboardPage - Componente renderizado');
  
  const [user, setUser] = useState<User | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [rawRegistros, setRawRegistros] = useState<RawRegistroStats[]>([]);
  const [registrosParaMapa, setRegistrosParaMapa] = useState<Registro[]>([]);
  const [activeVessels, setActiveVessels] = useState<ActiveVessel[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);
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
  const { transportesCount, registrosCount, setCurrentUser, currentUser } = useUser();
  const { success, error: showError } = useToast();
  
  // Estados para modal de booking y documentos
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedRecordForBooking, setSelectedRecordForBooking] = useState<RawRegistroStats | null>(null);
  const [bookingDocuments, setBookingDocuments] = useState<Map<string, { nombre: string; fecha: string; path: string }>>(new Map());
  const [uploadingBooking, setUploadingBooking] = useState<string | null>(null);
  
  console.log('🚀 DashboardPage - Estados inicializados, showBookingModal:', showBookingModal);

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

  const loadStats = useCallback(async () => {
    try {
      const supabase = createClient();

      let query = supabase
        .from('registros')
        .select('ref_asli, estado, updated_at, contenedor, pol, pod, naviera, shipper, ejecutivo, booking, nave_inicial, etd, eta, deposito, temporada')
        .is('deleted_at', null)
        .not('ref_asli', 'is', null);

      // Aplicar filtrado por cliente si no es admin
      if (currentUser) {
        const isAdmin = currentUser.rol === 'admin';
        const clienteNombre = currentUser.cliente_nombre?.trim();
        const clientesAsignados = currentUser.clientes_asignados || [];

        if (!isAdmin) {
          if (currentUser.rol === 'cliente' && clienteNombre) {
            // Cliente: filtrar directo por su cliente_nombre (case-insensitive)
            query = query.ilike('shipper', clienteNombre);
          } else if (clientesAsignados.length > 0) {
            // Ejecutivo u otros: filtrar por lista de clientes asignados
            query = query.in('shipper', clientesAsignados);
          } else {
            // Si no es admin y no tiene clientes, no debería ver nada
            query = query.eq('id', 'NONE');
          }
        }
      }

      const { data: registros, error } = await query;

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
  }, [currentUser]);

  // Cargar documentos de booking
  const loadBookingDocuments = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from('documentos')
        .list('booking', {
          limit: 1000,
          offset: 0,
          sortBy: { column: 'updated_at', order: 'desc' },
        });

      if (error) {
        console.warn('No se pudieron cargar documentos booking:', error.message);
        return;
      }

      const bookingsMap = new Map<string, { nombre: string; fecha: string; path: string }>();

      data?.forEach((file) => {
        const separatorIndex = file.name.indexOf('__');
        if (separatorIndex === -1) return;

        const segment = file.name.slice(0, separatorIndex);
        const { originalName } = parseStoredDocumentName(file.name);
        const nombreFormateado = formatFileDisplayName(originalName);
        const filePath = `booking/${file.name}`;

        const fechaArchivo = file.updated_at || file.created_at;
        let fechaFormateada = '-';
        if (fechaArchivo) {
          const fecha = new Date(fechaArchivo);
          const dia = String(fecha.getDate()).padStart(2, '0');
          const mes = String(fecha.getMonth() + 1).padStart(2, '0');
          const año = fecha.getFullYear();
          fechaFormateada = `${dia}-${mes}-${año}`;
        }

        const docInfo = { nombre: nombreFormateado, fecha: fechaFormateada, path: filePath };

        try {
          const decoded = decodeURIComponent(segment).trim();
          if (decoded) {
            const bookingKey = normalizeBooking(decoded).trim().toUpperCase().replace(/\s+/g, '');
            if (bookingKey) {
              const existente = bookingsMap.get(bookingKey);
              if (!existente || (fechaArchivo && existente.fecha !== '-' && fechaArchivo.split('T')[0] > existente.fecha.split('-').reverse().join('-'))) {
                bookingsMap.set(bookingKey, docInfo);
              }
            }
          }
        } catch {
          const segmentTrimmed = segment.trim();
          if (segmentTrimmed) {
            const bookingKey = normalizeBooking(segmentTrimmed).trim().toUpperCase().replace(/\s+/g, '');
            if (bookingKey) {
              const existente = bookingsMap.get(bookingKey);
              if (!existente || (fechaArchivo && existente.fecha !== '-' && fechaArchivo.split('T')[0] > existente.fecha.split('-').reverse().join('-'))) {
                bookingsMap.set(bookingKey, docInfo);
              }
            }
          }
        }
      });

      setBookingDocuments(bookingsMap);
    } catch (err) {
      console.error('Error cargando documentos booking:', err);
    }
  }, []);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user && currentUser) {
      loadStats();
      void loadActiveVessels();
      void loadBookingDocuments();

      // Refrescar datos de buques automáticamente cada 60 segundos (1 minuto)
      const intervalId = setInterval(() => {
        void loadActiveVessels();
      }, 60000); // 60000 ms = 60 segundos

      return () => {
        clearInterval(intervalId);
      };
    }
  }, [user, currentUser, loadStats, loadBookingDocuments]);

  // Debug: Verificar estado del modal
  useEffect(() => {
    console.log('🔍 Estado del modal actualizado:', {
      showBookingModal,
      selectedRecordForBooking: selectedRecordForBooking?.ref_asli,
      booking: selectedRecordForBooking?.booking,
      timestamp: new Date().toISOString()
    });
  }, [showBookingModal, selectedRecordForBooking]);

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
        const fallbackUser = {
          id: user.id,
          nombre: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario',
          email: user.email || '',
          rol: 'cliente',
          activo: true
        };
        setUserInfo(fallbackUser);
        setCurrentUser(fallbackUser);
      } else {
        // Usar datos de la tabla usuarios (fuente de verdad)
        setUserInfo(userData);
        setCurrentUser(userData);
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

  // Función para manejar la subida del documento de booking
  const handleSaveBooking = useCallback(async (booking: string, file?: File, customFileName?: string) => {
    if (!booking || !booking.trim()) {
      showError('El número de booking es requerido');
      return;
    }

    if (!file) {
      showError('Debe seleccionar un archivo PDF');
      return;
    }

    try {
      const normalizedBooking = normalizeBooking(booking);
      setUploadingBooking(normalizedBooking.trim().toUpperCase().replace(/\s+/g, ''));
      const supabase = createClient();
      
      const bookingSegment = encodeURIComponent(normalizedBooking);
      const safeName = customFileName 
        ? sanitizeFileName(`${customFileName}.pdf`)
        : sanitizeFileName(file.name);
      const filePath = `booking/${bookingSegment}__${Date.now()}-0-${safeName}`;

      // Eliminar archivos anteriores para este booking
      try {
        const { data: existingFiles } = await supabase.storage
          .from('documentos')
          .list('booking', { limit: 1000 });

        if (existingFiles) {
          const filesToDelete = existingFiles
            .filter(f => {
              const separatorIndex = f.name.indexOf('__');
              if (separatorIndex === -1) return false;
              const fileBookingSegment = f.name.slice(0, separatorIndex);
              try {
                const decodedBooking = normalizeBooking(decodeURIComponent(fileBookingSegment));
                return decodedBooking === normalizedBooking || fileBookingSegment === bookingSegment;
              } catch {
                return fileBookingSegment === bookingSegment;
              }
            })
            .map(f => `booking/${f.name}`);

          if (filesToDelete.length > 0) {
            await supabase.storage.from('documentos').remove(filesToDelete);
          }
        }
      } catch (deleteErr) {
        console.warn('Error al eliminar archivos anteriores:', deleteErr);
      }

      // Subir nuevo archivo
      const { error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(filePath, file, {
          contentType: 'application/pdf',
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Recargar documentos
      await loadBookingDocuments();
      success('PDF de booking subido correctamente');
    } catch (err: any) {
      console.error('Error subiendo PDF:', err);
      showError('No se pudo subir el PDF. Intenta nuevamente.');
      throw err;
    } finally {
      setUploadingBooking(null);
    }
  }, [loadBookingDocuments, success, showError]);

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

  // Verificar si es superadmin (Hans o Rodrigo) antes de usarlo en modules
  const getSuperAdminEmail = () => {
    return (userInfo?.email || currentUser?.email || user?.email || '').toLowerCase();
  };
  
  const isSuperAdminForModules = (() => {
    const email = getSuperAdminEmail();
    if (!email) return false;
    return email === 'rodrigo.caceres@asli.cl' || email === 'hans.vasquez@asli.cl';
  })();

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
    ...(isSuperAdminForModules
      ? [
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
      ]
      : []),
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
    },
    ...(isSuperAdminForModules
      ? [
        {
          id: 'finanzas',
          title: 'Finanzas',
          description: 'Control de costos, ingresos y márgenes por embarque',
          icon: DollarSign,
          color: 'bg-green-500',
          hoverColor: 'hover:bg-green-600',
          available: true,
          stats: null
        },
        {
          id: 'reportes',
          title: 'Reportes y KPIs',
          description: 'Indicadores clave de rendimiento y análisis de operaciones',
          icon: BarChart3,
          color: 'bg-indigo-500',
          hoverColor: 'hover:bg-indigo-600',
          available: true,
          stats: null
        }
      ]
      : [])
  ];

  if (loading) {
    return null; // El PageWrapper manejará el loading
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

  const isAdmin = userInfo?.rol === 'admin' || currentUser?.rol === 'admin';
  const isEjecutivo = (userInfo?.email || currentUser?.email || user?.email || '').endsWith('@asli.cl');

  // Verificar si es superadmin (Hans o Rodrigo)
  const isSuperAdmin = (() => {
    const email = getSuperAdminEmail();
    if (!email) return false;
    return email === 'rodrigo.caceres@asli.cl' || email === 'hans.vasquez@asli.cl';
  })();
  
  const canAccessMaintenance = isAdmin || isSuperAdmin;

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
        { label: 'Embarques', id: '/registros', icon: Ship, counter: registrosCount, tone: 'violet' },
        { label: 'Transportes', id: '/transportes', icon: Truck, counter: transportesCount, tone: 'sky' },
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
        ...(isSuperAdmin || isAdmin
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

  return (
    <>
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
        sections={sidebarNav}
        currentUser={userInfo}
        user={user}
        setShowProfileModal={setShowProfileModal}
      />

      {/* Content */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden h-full">
        <header className={`sticky top-0 z-40 border-b ${theme === 'dark' ? 'border-slate-700/50 bg-slate-800/95 backdrop-blur' : 'border-gray-200 bg-white/95 backdrop-blur'}`}>
          <div className="flex flex-wrap items-center gap-4 px-4 sm:px-6 py-3 sm:py-4">
            {/* Botón hamburguesa para móvil */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className={`lg:hidden flex h-8 w-8 items-center justify-center transition-colors flex-shrink-0 ${theme === 'dark'
                ? 'text-slate-300 hover:bg-slate-700/60'
                : 'text-gray-600 hover:bg-gray-100/80'
                }`}
              aria-label="Abrir menú"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            {/* Botón para expandir sidebar colapsado en desktop */}
            {isSidebarCollapsed && (
              <button
                onClick={toggleSidebar}
                className={`hidden lg:flex h-8 w-8 items-center justify-center transition-colors flex-shrink-0 ${theme === 'dark'
                  ? 'text-slate-300 hover:bg-slate-700/60 border border-slate-700/50'
                  : 'text-gray-600 hover:bg-gray-100/80 border border-gray-300/60'
                  }`}
                aria-label="Expandir menú lateral"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            )}

            <div className="flex items-center gap-3 sm:gap-4">
              <div className={`hidden sm:flex h-10 w-10 items-center justify-center ${theme === 'dark' ? 'bg-sky-500/10 border border-sky-500/20' : 'bg-blue-50 border border-blue-200'}`}>
                <img
                  src="https://asli.cl/img/logo.png?v=1761679285274&t=1761679285274"
                  alt="ASLI Logo"
                  className="h-8 w-8 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
              <div>
                <p className={`text-[10px] sm:text-[11px] uppercase tracking-[0.2em] sm:tracking-[0.3em] ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>Panel General</p>
                <h1 className={`text-xl sm:text-2xl font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Dashboard</h1>
                <p className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>Coordinación integral de embarques y transportes</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 ml-auto">
              <select
                value={selectedSeason ?? ''}
                onChange={(event) => setSelectedSeason(event.target.value || null)}
                className={`min-w-[180px] sm:min-w-[200px] border px-3 sm:px-4 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 ${theme === 'dark'
                  ? 'border-slate-700/60 bg-slate-800/80 text-slate-200 focus:border-sky-500 focus:ring-sky-500/20'
                  : 'border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500/20'
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
                className={`inline-flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white transition-colors focus:outline-none focus:ring-2 ${theme === 'dark'
                  ? 'bg-sky-600 hover:bg-sky-700 focus:ring-sky-500/30'
                  : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500/30'
                  }`}
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Agregar registro</span>
                <span className="sm:hidden">Agregar</span>
              </button>
              <button
                onClick={() => setShowProfileModal(true)}
                className={`hidden sm:flex items-center gap-2 border px-3 py-2 text-xs sm:text-sm ${theme === 'dark'
                  ? 'border-slate-700/60 text-slate-300 hover:border-sky-500/60 hover:text-sky-200 bg-slate-800/60'
                  : 'border-gray-300 text-gray-700 hover:border-blue-500 hover:text-blue-600 bg-white'
                  }`}
              >
                <UserIcon className="h-4 w-4" />
                {userInfo?.nombre || user.email}
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 sm:px-6 pb-10 pt-6 sm:pt-8 space-y-6">
          {/* Sección de bienvenida simplificada */}
          <section className={`border p-4 sm:p-6 ${theme === 'dark'
            ? 'border-slate-700/60 bg-slate-800/60'
            : 'border-gray-200 bg-white'
            }`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className={`text-lg sm:text-xl font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Bienvenido, {userInfo?.nombre || 'Usuario'}
                </h2>
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                  Gestiona tus embarques y transportes de manera eficiente
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className={`px-3 py-1 text-xs font-medium ${theme === 'dark' 
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' 
                  : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                  {filteredByAll.length} embarques activos
                </div>
              </div>
            </div>
          </section>

          {/* Módulos principales - Simplificados */}
          <section className="space-y-4">
            <div>
              <h3 className={`text-base sm:text-lg font-medium mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Accesos rápidos</h3>
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
                    className={`group relative overflow-hidden border p-4 sm:p-6 text-left transition-all ${theme === 'dark'
                      ? `border-slate-700/60 bg-slate-800/60 ${isDisabled ? 'opacity-60 cursor-not-allowed' : 'hover:border-sky-500/60 hover:scale-[1.01] active:scale-[0.99]'}`
                      : `border-gray-200 bg-white ${isDisabled ? 'opacity-60 cursor-not-allowed' : 'hover:border-blue-500 hover:scale-[1.01] active:scale-[0.99]'}`
                      }`}
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className={`flex h-10 w-10 items-center justify-center border flex-shrink-0 ${theme === 'dark'
                        ? 'bg-sky-500/10 border-sky-500/30'
                        : 'bg-blue-50 border-blue-200'
                        }`}>
                        <IconComponent className={`h-5 w-5 ${theme === 'dark' ? 'text-sky-300' : 'text-blue-600'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className={`text-base sm:text-lg font-medium mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{module.title}</h4>
                        <p className={`text-xs sm:text-sm mb-3 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>{module.description}</p>
                        {module.stats && (
                          <div className="flex items-center gap-3 sm:gap-4 text-xs">
                            <div className="flex items-center gap-1.5">
                              <div className="h-1.5 w-1.5 bg-emerald-500"></div>
                              <span className={theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}>{module.stats.confirmados} confirmados</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="h-1.5 w-1.5 bg-amber-500"></div>
                              <span className={theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}>{module.stats.pendientes} pendientes</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="h-1.5 w-1.5 bg-red-500"></div>
                              <span className={theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}>{module.stats.cancelados} cancelados</span>
                            </div>
                          </div>
                        )}
                      </div>
                      <ArrowRight className={`h-4 w-4 transition flex-shrink-0 ${theme === 'dark' ? 'text-slate-500 group-hover:text-sky-300' : 'text-gray-400 group-hover:text-blue-600'}`} />
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Tabla de registros recientes */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className={`text-base sm:text-lg font-medium mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Registros recientes</h3>
                <p className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>Vista resumida de tus embarques activos</p>
              </div>
              <button
                onClick={() => router.push('/registros')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    router.push('/registros');
                  }
                }}
                className={`text-xs sm:text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${theme === 'dark'
                  ? 'text-sky-400 hover:text-sky-300 focus:ring-sky-500'
                  : 'text-blue-600 hover:text-blue-700 focus:ring-blue-500'
                  }`}
                aria-label="Ver todos los registros"
                tabIndex={0}
              >
                Ver todos →
              </button>
            </div>
            <div className={`border overflow-hidden ${theme === 'dark'
              ? 'border-slate-700/60 bg-slate-800/60'
              : 'border-gray-200 bg-white'
              }`}>
              <div className="overflow-x-auto">
                <table className="w-full" role="table" aria-label="Tabla de registros recientes">
                  <thead className={`${theme === 'dark'
                    ? 'bg-slate-900/60 border-b border-slate-700/60'
                    : 'bg-gray-50 border-b border-gray-200'
                    }`}>
                    <tr>
                      <th className={`px-2 sm:px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                        REF ASLI
                      </th>
                      <th className={`hidden sm:table-cell px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                        Cliente
                      </th>
                      <th className={`px-2 sm:px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                        Booking
                      </th>
                      <th className={`px-2 sm:px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                        Estado
                      </th>
                      <th className={`hidden md:table-cell px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                        ETD
                      </th>
                      <th className={`hidden md:table-cell px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                        ETA
                      </th>
                      <th className={`hidden lg:table-cell px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                        POD
                      </th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-gray-200'}`}>
                    {filteredByAll.slice(0, 10).length === 0 ? (
                      <tr>
                        <td colSpan={7} className={`px-4 py-8 text-center ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`} role="status" aria-live="polite">
                          No hay registros disponibles
                        </td>
                      </tr>
                    ) : (
                      filteredByAll
                        .sort((a, b) => {
                          const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
                          const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
                          return dateB - dateA;
                        })
                        .slice(0, 10)
                        .map((record, index) => {
                          const estado = record.estado?.toUpperCase() || 'PENDIENTE';
                          const estadoColors = {
                            CONFIRMADO: theme === 'dark' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200',
                            PENDIENTE: theme === 'dark' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-amber-50 text-amber-700 border-amber-200',
                            CANCELADO: theme === 'dark' ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-red-50 text-red-700 border-red-200',
                          };
                          const estadoColor = estadoColors[estado as keyof typeof estadoColors] || estadoColors.PENDIENTE;

                          const formatDate = (dateString: string | null | undefined): string => {
                            if (!dateString) return '—';
                            try {
                              const date = new Date(dateString);
                              return date.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
                            } catch {
                              return '—';
                            }
                          };

                          const bookingValue = record.booking?.trim() || '';
                          const bookingKey = bookingValue ? normalizeBooking(bookingValue).trim().toUpperCase().replace(/\s+/g, '') : '';
                          const hasPdf = bookingKey ? bookingDocuments.has(bookingKey) : false;
                          const bookingDoc = bookingKey ? bookingDocuments.get(bookingKey) : null;
                          const isUploading = uploadingBooking === bookingKey;
                          
                          // Log para verificar que el código se está ejecutando
                          console.log('📋 Renderizando fila:', {
                            ref_asli: record.ref_asli,
                            booking: bookingValue,
                            hasPdf,
                            isUploading,
                            bookingDocumentsSize: bookingDocuments.size
                          });

                          const handleBookingUploadClick = (e: React.MouseEvent<HTMLButtonElement>) => {
                            console.log('🔘 CLICK DETECTADO - Iniciando handleBookingUploadClick');
                            e.stopPropagation();
                            e.preventDefault();
                            e.nativeEvent.stopImmediatePropagation();
                            
                            console.log('🔘 Click en botón de upload, registro:', record.ref_asli, 'booking:', record.booking);
                            
                            if (!record.booking?.trim()) {
                              console.log('❌ No hay booking en el registro');
                              showError('El registro debe tener un número de booking para subir el documento');
                              return;
                            }
                            
                            console.log('📝 Configurando registro seleccionado:', record);
                            setSelectedRecordForBooking(record);
                            console.log('📝 Estado antes de abrir modal');
                            
                            // Abrir modal inmediatamente
                            setShowBookingModal(true);
                            console.log('✅ Modal abierto - showBookingModal:', true);
                          };

                          const handleBookingViewClick = async (e: React.MouseEvent) => {
                            e.stopPropagation();
                            if (!bookingDoc) return;

                            try {
                              const supabase = createClient();
                              const { data, error } = await supabase.storage
                                .from('documentos')
                                .createSignedUrl(bookingDoc.path, 60);

                              if (error || !data?.signedUrl) {
                                throw error || new Error('No se pudo generar la URL');
                              }

                              window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
                            } catch (err) {
                              console.error('Error abriendo PDF:', err);
                              showError('No se pudo abrir el PDF');
                            }
                          };

                          return (
                            <tr
                              key={`${record.ref_asli}-${index}`}
                              className={`transition-colors ${theme === 'dark'
                                ? 'hover:bg-slate-700/40'
                                : 'hover:bg-gray-50'
                                } cursor-pointer focus-within:outline-none focus-within:ring-2 ${theme === 'dark' ? 'focus-within:ring-sky-500' : 'focus-within:ring-blue-500'}`}
                              onClick={(e) => {
                                // No navegar si se hizo click en un botón, input, o div con data-booking-upload-button
                                const target = e.target as HTMLElement;
                                if (
                                  target.closest('button') || 
                                  target.closest('input') || 
                                  target.closest('td[data-booking-cell]') ||
                                  target.closest('[data-booking-upload-button]') ||
                                  target.hasAttribute('data-booking-upload-button')
                                ) {
                                  console.log('🚫 Navegación cancelada - click en botón/input');
                                  return;
                                }
                                router.push(`/registros?ref=${encodeURIComponent(record.ref_asli || '')}`);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  const target = e.target as HTMLElement;
                                  if (target.closest('button')) {
                                    return;
                                  }
                                  e.preventDefault();
                                  router.push(`/registros?ref=${encodeURIComponent(record.ref_asli || '')}`);
                                }
                              }}
                              tabIndex={0}
                              role="button"
                              aria-label={`Ver detalles del registro ${record.ref_asli || 'sin referencia'}`}
                            >
                              <td className={`px-2 sm:px-4 py-3 text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                {record.ref_asli || '—'}
                              </td>
                              <td className={`hidden sm:table-cell px-4 py-3 text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>
                                <span className="truncate block max-w-[200px]" title={record.shipper || undefined}>
                                  {record.shipper || '—'}
                                </span>
                              </td>
                              <td 
                                data-booking-cell="true"
                                className={`px-2 sm:px-4 py-3 text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                }}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                }}
                              >
                                <div className="flex items-center gap-1.5">
                                  <span className="truncate flex-1">{bookingValue || '—'}</span>
                                  {/* Botón siempre visible para debugging */}
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    {hasPdf && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          e.preventDefault();
                                          handleBookingViewClick(e);
                                        }}
                                        className={`p-1 hover:bg-slate-700/60 dark:hover:bg-slate-600 rounded transition-colors ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}
                                        title="Ver PDF de booking"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    {/* Botón de upload - siempre visible */}
                                    {(() => {
                                      const buttonId = `booking-upload-${record.ref_asli}-${index}`;
                                      return (
                                        <button
                                          id={buttonId}
                                          type="button"
                                          ref={(el) => {
                                            if (el && !isUploading) {
                                              // Agregar listener directo al DOM como fallback
                                              const handleClick = (e: MouseEvent) => {
                                                console.log('🔵🔵🔵 CLICK DETECTADO EN BOTÓN (DOM) 🔵🔵🔵');
                                                e.stopPropagation();
                                                e.preventDefault();
                                                
                                                if (!record.booking?.trim()) {
                                                  showError('Este registro no tiene booking. Por favor, agrega un booking primero.');
                                                  return;
                                                }
                                                
                                                setSelectedRecordForBooking(record);
                                                setShowBookingModal(true);
                                              };
                                              
                                              // Remover listener anterior si existe
                                              el.removeEventListener('click', handleClick as any);
                                              // Agregar nuevo listener
                                              el.addEventListener('click', handleClick, { capture: true });
                                            }
                                          }}
                                          onClick={(e) => {
                                            // Log inmediato para verificar que se ejecuta
                                            console.log('🔵🔵🔵 CLICK EN BOTÓN DE UPLOAD (React) 🔵🔵🔵');
                                            console.log('🔵 Evento:', e);
                                            console.log('🔵 Registro:', record.ref_asli);
                                            
                                            // Prevenir cualquier comportamiento por defecto y propagación
                                            e.stopPropagation();
                                            e.preventDefault();
                                            if (e.nativeEvent) {
                                              e.nativeEvent.stopImmediatePropagation();
                                            }
                                            
                                            // Verificar booking
                                            if (!record.booking?.trim()) {
                                              console.log('❌ No hay booking');
                                              showError('Este registro no tiene booking. Por favor, agrega un booking primero.');
                                              return;
                                            }
                                            
                                            console.log('✅ Hay booking, abriendo modal');
                                            
                                            // Abrir modal directamente
                                            setSelectedRecordForBooking(record);
                                            setShowBookingModal(true);
                                            
                                            console.log('✅ Estado actualizado - showBookingModal:', true);
                                          }}
                                          onMouseDown={(e) => {
                                            console.log('🟢 MouseDown en botón de upload');
                                            e.stopPropagation();
                                            e.preventDefault();
                                            if (e.nativeEvent) {
                                              e.nativeEvent.stopImmediatePropagation();
                                            }
                                          }}
                                          disabled={isUploading}
                                          style={{ 
                                            zIndex: 1000, 
                                            position: 'relative',
                                            cursor: isUploading ? 'not-allowed' : 'pointer',
                                            pointerEvents: isUploading ? 'none' : 'auto',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: '0.375rem',
                                            opacity: isUploading ? 0.5 : 1,
                                            background: 'transparent',
                                            border: 'none'
                                          }}
                                          className={`hover:bg-slate-700/60 dark:hover:bg-slate-600 rounded transition-colors ${theme === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-gray-500 hover:text-gray-700'}`}
                                          title="Subir PDF de booking"
                                          aria-label="Subir PDF de booking"
                                        >
                                          {isUploading ? (
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                          ) : (
                                            <Upload className="w-4 h-4" />
                                          )}
                                        </button>
                                      );
                                    })()}
                                  </div>
                                </div>
                              </td>
                              <td className="px-2 sm:px-4 py-3">
                                <span className={`inline-flex items-center px-2 py-1 text-xs font-medium border rounded ${estadoColor}`}>
                                  {estado}
                                </span>
                              </td>
                              <td className={`hidden md:table-cell px-4 py-3 text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>
                                {formatDate(record.etd ?? null)}
                              </td>
                              <td className={`hidden md:table-cell px-4 py-3 text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>
                                {formatDate(record.eta ?? null)}
                              </td>
                              <td className={`hidden lg:table-cell px-4 py-3 text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>
                                {record.pod || '—'}
                              </td>
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Mapa de embarques - Simplificado */}
          <section className="space-y-4">
            <div>
              <h3 className={`text-base sm:text-lg font-medium mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Ubicación de embarques</h3>
              <p className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>Visualiza el estado de tus embarques en tiempo real</p>
            </div>
            <div className={`border p-4 ${theme === 'dark'
              ? 'border-slate-700/60 bg-slate-800/60'
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
    
    {/* Booking Modal - Renderizado fuera del contenedor principal */}
    {showBookingModal && selectedRecordForBooking && (
      <BookingModal
        isOpen={true}
        onClose={() => {
          console.log('🔴 Cerrando modal de booking');
          setShowBookingModal(false);
          setSelectedRecordForBooking(null);
        }}
        onSave={async (booking, file, customFileName) => {
          console.log('💾 Guardando booking:', booking, 'archivo:', file?.name);
          try {
            await handleSaveBooking(booking, file, customFileName);
            setShowBookingModal(false);
            setSelectedRecordForBooking(null);
          } catch (error) {
            console.error('Error al guardar booking:', error);
            throw error; // Re-lanzar para que el modal lo maneje
          }
        }}
        currentBooking={selectedRecordForBooking.booking || ''}
        registroId={selectedRecordForBooking.ref_asli || ''}
        existingDocument={(() => {
          const bookingValue = selectedRecordForBooking.booking?.trim() || '';
          const bookingKey = bookingValue ? normalizeBooking(bookingValue).trim().toUpperCase().replace(/\s+/g, '') : '';
          const doc = bookingKey ? bookingDocuments.get(bookingKey) : null;
          return doc || null;
        })()}
      />
    )}
    </>
  );
}

export default DashboardPage;
