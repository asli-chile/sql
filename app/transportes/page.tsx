'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import type { User } from '@supabase/supabase-js';
import { Search, RefreshCcw, Truck, Plus, ChevronLeft, ChevronRight, Ship, Globe, FileText, LayoutDashboard, Settings, X, Menu, User as UserIcon, Download, CheckCircle2, Trash2, AlertTriangle, Users, DollarSign, BarChart3, Filter, ChevronDown, Grid, List, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { parseStoredDocumentName, formatFileDisplayName } from '@/utils/documentUtils';
import { TransporteRecord, fetchTransportes } from '@/lib/transportes-service';
import { transportesColumns, transportesSections } from '@/components/transportes/columns';
import { AddTransporteModal } from '@/components/transportes/AddTransporteModal';
import { TransporteCard } from '@/components/transportes/TransporteCard';
import { useUser } from '@/hooks/useUser';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { UserProfileModal } from '@/components/users/UserProfileModal';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { Sidebar } from '@/components/layout/Sidebar';
import { SidebarSection } from '@/types/layout';
import { EditingCellProvider } from '@/contexts/EditingCellContext';
import { InlineEditCell } from '@/components/transportes/InlineEditCell';
import { TrashModalTransportes } from '@/components/transportes/TrashModalTransportes';
import { SimpleStackingModal } from '@/components/transportes/SimpleStackingModal';

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
  const [isDateTimeModalOpen, setIsDateTimeModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<TransporteRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  
  // Estados para filtros
  const [filters, setFilters] = useState({
    booking: '',
    contenedor: '',
    nave: '',
    naviera: '',
    especie: '',
    deposito: '',
    conductor: '',
    transportista: '',
    semana: '',
    atControlada: '',
    late: '',
    extraLate: '',
    porteo: '',
    ingresadoStacking: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [sortBy, setSortBy] = useState<keyof TransporteRecord>('contenedor');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const { canAdd, canEdit, setCurrentUser, currentUser } = useUser();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [bookingDocuments, setBookingDocuments] = useState<Map<string, { nombre: string; fecha: string; path: string }>>(new Map());
  const [downloadingBooking, setDownloadingBooking] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; record: TransporteRecord } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<TransporteRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTrashModalOpen, setIsTrashModalOpen] = useState(false);
  const [trashCount, setTrashCount] = useState(0);

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

  // Cargar documentos booking desde storage
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
        if (separatorIndex !== -1) {
          const bookingSegment = file.name.slice(0, separatorIndex);
          try {
            const booking = decodeURIComponent(bookingSegment).trim().toUpperCase().replace(/\s+/g, '');
            if (booking) {
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

              const existente = bookingsMap.get(booking);
              if (!existente) {
                bookingsMap.set(booking, { nombre: nombreFormateado, fecha: fechaFormateada, path: filePath });
              } else if (fechaArchivo && existente.fecha !== '-') {
                const fechaExistente = existente.fecha.split('-').reverse().join('-');
                const fechaNueva = fechaArchivo.split('T')[0];
                if (fechaNueva > fechaExistente) {
                  bookingsMap.set(booking, { nombre: nombreFormateado, fecha: fechaFormateada, path: filePath });
                }
              }
            }
          } catch {
            const booking = bookingSegment.trim().toUpperCase().replace(/\s+/g, '');
            if (booking) {
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
              const existente = bookingsMap.get(booking);
              if (!existente) {
                bookingsMap.set(booking, { nombre: nombreFormateado, fecha: fechaFormateada, path: filePath });
              } else if (fechaArchivo && existente.fecha !== '-') {
                const fechaExistente = existente.fecha.split('-').reverse().join('-');
                const fechaNueva = fechaArchivo.split('T')[0];
                if (fechaNueva > fechaExistente) {
                  bookingsMap.set(booking, { nombre: nombreFormateado, fecha: fechaFormateada, path: filePath });
                }
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
    void loadBookingDocuments();
  }, [loadBookingDocuments]);

  useEffect(() => {
    let isMounted = true;

    const loadTransportes = async () => {
      if (!user) {
        return;
      }
      
      if (isMounted) {
        setIsLoading(true);
      }
      const data = await fetchTransportes();
      if (isMounted) {
        setRecords(data || []);
        setIsLoading(false);
      }
    };

    void loadTransportes();

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Función para descargar el PDF de booking
  const handleDownloadBooking = async (booking: string | null) => {
    if (!booking) return;

    // Validar permisos: solo ejecutivos y admin pueden descargar
    if (!canEdit) {
      console.warn('No tienes permisos para descargar bookings');
      return;
    }

    const bookingKey = booking.trim().toUpperCase().replace(/\s+/g, '');
    const document = bookingDocuments.get(bookingKey);

    if (!document) {
      console.warn('No se encontró PDF para el booking:', booking);
      return;
    }

    try {
      setDownloadingBooking(bookingKey);
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from('documentos')
        .createSignedUrl(document.path, 60);

      if (error || !data?.signedUrl) {
        throw error || new Error('No se pudo generar la URL de descarga');
      }

      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('Error descargando booking PDF:', err);
    } finally {
      setDownloadingBooking(null);
    }
  };

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

  const loadTrashCount = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    if (currentUser?.id) {
      void loadTrashCount();
    }
  }, [currentUser?.id, loadTrashCount]);

  const handleDeleteTransporte = async (transporte: TransporteRecord) => {
    setDeleteConfirm(transporte);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm || isDeleting || !currentUser?.id) return;

    setIsDeleting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('transportes')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: currentUser.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', deleteConfirm.id);

      if (error) {
        console.error('Error eliminando transporte:', error);
        throw error;
      }

      // Actualizar estado local
      setRecords((prev) => prev.filter((r) => r.id !== deleteConfirm.id));
      setDeleteConfirm(null);
      await loadTrashCount();
    } catch (error: any) {
      console.error('Error eliminando transporte:', error);
      alert(`Error al eliminar el transporte: ${error?.message || 'Error desconocido'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirm(null);
  };

  const handleDeleteSelected = async () => {
    if (selectedRows.size === 0 || !currentUser?.id) return;

    setIsDeleting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('transportes')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: currentUser.id,
          updated_at: new Date().toISOString(),
        })
        .in('id', Array.from(selectedRows));

      if (error) {
        console.error('Error eliminando transportes seleccionados:', error);
        throw error;
      }

      // Actualizar estado local
      setRecords((prev) => prev.filter((r) => !selectedRows.has(r.id)));
      setSelectedRows(new Set());
      await loadTrashCount();
    } catch (error: any) {
      console.error('Error eliminando transportes seleccionados:', error);
      alert(`Error al eliminar los transportes seleccionados: ${error?.message || 'Error desconocido'}`);
    } finally {
      setIsDeleting(false);
    }
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

  const handleStackingClick = (record: TransporteRecord) => {
    console.log('📅 handleStackingClick llamado para registro:', record.id);
    setSelectedRecord(record);
    setIsDateTimeModalOpen(true);
  };

  const filteredRecords = useMemo(() => {
    let filtered = records.filter((record) => {
      // Búsqueda general
      const searchMatch = !searchTerm || 
        Object.values(record).some(value => 
          value !== null && value !== undefined && 
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        );

      // Filtros específicos
      const bookingMatch = !filters.booking || 
        (record.booking && record.booking.toLowerCase().includes(filters.booking.toLowerCase()));
      
      const contenedorMatch = !filters.contenedor || 
        (record.contenedor && record.contenedor.toLowerCase().includes(filters.contenedor.toLowerCase()));
      
      const naveMatch = !filters.nave || 
        (record.nave && record.nave.toLowerCase().includes(filters.nave.toLowerCase()));
      
      const navieraMatch = !filters.naviera || 
        (record.naviera && record.naviera.toLowerCase().includes(filters.naviera.toLowerCase()));
      
      const especieMatch = !filters.especie || 
        (record.especie && record.especie.toLowerCase().includes(filters.especie.toLowerCase()));
      
      const depositoMatch = !filters.deposito || 
        (record.deposito && record.deposito.toLowerCase().includes(filters.deposito.toLowerCase()));
      
      const conductorMatch = !filters.conductor || 
        (record.conductor && record.conductor.toLowerCase().includes(filters.conductor.toLowerCase()));
      
      const transportistaMatch = !filters.transportista || 
        (record.transporte && record.transporte.toLowerCase().includes(filters.transportista.toLowerCase()));
      
      const semanaMatch = !filters.semana || 
        (record.semana && String(record.semana).includes(filters.semana));
      
      const atControladaMatch = filters.atControlada === '' || 
        (filters.atControlada === 'true' && record.atmosfera_controlada) ||
        (filters.atControlada === 'false' && !record.atmosfera_controlada);
      
      const lateMatch = filters.late === '' || 
        (filters.late === 'true' && record.late) ||
        (filters.late === 'false' && !record.late);
      
      const extraLateMatch = filters.extraLate === '' || 
        (filters.extraLate === 'true' && record.extra_late) ||
        (filters.extraLate === 'false' && !record.extra_late);
      
      const porteoMatch = filters.porteo === '' || 
        (filters.porteo === 'true' && record.porteo) ||
        (filters.porteo === 'false' && !record.porteo);
      
      const ingresadoStackingMatch = filters.ingresadoStacking === '' || 
        (filters.ingresadoStacking === 'true' && record.ingreso_stacking) ||
        (filters.ingresadoStacking === 'false' && !record.ingreso_stacking);

      return searchMatch && bookingMatch && contenedorMatch && naveMatch && navieraMatch && 
             especieMatch && depositoMatch && conductorMatch && transportistaMatch && semanaMatch &&
             atControladaMatch && lateMatch && extraLateMatch && porteoMatch && ingresadoStackingMatch;
    });

    // Aplicar ordenamiento
    return filtered.sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];
      
      // Manejar valores nulos/undefined
      if (aValue === null || aValue === undefined) return sortOrder === 'asc' ? 1 : -1;
      if (bValue === null || bValue === undefined) return sortOrder === 'asc' ? -1 : 1;
      
      // Convertir a string para comparación
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      
      let comparison = 0;
      if (aStr < bStr) comparison = -1;
      if (aStr > bStr) comparison = 1;
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [records, searchTerm, filters, sortBy, sortOrder]);

  const isRodrigo = currentUser?.email?.toLowerCase() === 'rodrigo.caceres@asli.cl';

  const toggleSidebar = () => setIsSidebarCollapsed((prev) => !prev);

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
        { label: 'Seguimiento Marítimo', id: '/dashboard/seguimiento', icon: Globe },
        ...(isRodrigo
          ? [
            { label: 'Finanzas', id: '/finanzas', icon: DollarSign },
            { label: 'Reportes', id: '/reportes', icon: BarChart3 },
          ]
          : []),
      ],
    },
    {
      title: 'Sistema',
      items: [
        { label: 'Papelera', onClick: () => setIsTrashModalOpen(true), counter: trashCount, tone: 'violet', icon: Trash2 },
      ],
    },
    ...(currentUser?.rol === 'admin'
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
    <EditingCellProvider>
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
            <div className="flex flex-wrap items-center gap-4 pl-4 pr-2 sm:px-6 py-3 sm:py-4">
              {/* Botón hamburguesa para móvil */}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className={`lg:hidden flex h-9 w-9 items-center justify-center rounded-lg transition-colors flex-shrink-0 ${theme === 'dark'
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
                  className={`hidden lg:flex h-9 w-9 items-center justify-center rounded-lg transition-colors flex-shrink-0 ${theme === 'dark'
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

              <div className="flex items-center gap-1.5 sm:gap-3 ml-auto">
                <button
                  type="button"
                  onClick={reload}
                  disabled={isLoading}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs sm:text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${theme === 'dark'
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
                    className={`inline-flex items-center gap-2 rounded-full px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 ${theme === 'dark'
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
                  className={`hidden sm:flex items-center gap-2 rounded-full border px-3 py-2 text-xs sm:text-sm ${theme === 'dark'
                    ? 'border-slate-800/70 text-slate-300 hover:border-sky-400/60 hover:text-sky-200'
                    : 'border-gray-300 text-gray-700 hover:border-blue-400 hover:text-blue-600 bg-white shadow-sm'
                    }`}
                  title={currentUser?.nombre || user?.email}
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
              <section className={`rounded-3xl border shadow-xl backdrop-blur-xl p-5 ${theme === 'dark'
                ? 'border-slate-800/70 bg-slate-950/70 shadow-slate-950/30'
                : 'border-gray-200 bg-white shadow-md'
                }`}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1">
                    <p className={`text-[11px] uppercase tracking-[0.25em] mb-1 ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>Búsqueda y Filtros</p>
                    <div className="relative">
                      <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-400'}`} />
                      <input
                        type="text"
                        placeholder="Buscar por booking, contenedor, nave, naviera..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`w-full pl-10 pr-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors ${theme === 'dark'
                          ? 'border-slate-700 bg-slate-800/50 text-slate-100 placeholder-slate-400 focus:ring-sky-500/50 focus:border-sky-500'
                          : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:ring-blue-500/50 focus:border-blue-500'
                          }`}
                      />
                    </div>
                  </div>
                  
                  {/* Botones de acción */}
                  <div className="flex items-center gap-2">
                    {/* Controles de ordenamiento sutiles */}
                    <div className="flex items-center gap-1">
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as keyof TransporteRecord)}
                        className={`px-2 py-1.5 text-xs font-medium transition-colors rounded border ${
                          theme === 'dark'
                            ? 'border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 focus:ring-1 focus:ring-sky-500/50'
                            : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50 focus:ring-1 focus:ring-blue-500/50'
                        }`}
                      >
                        <option value="contenedor">Contenedor</option>
                        <option value="ref_cliente">Ref Cliente</option>
                        <option value="ref_asli">Ref ASLI</option>
                        <option value="booking">Booking</option>
                        <option value="nave">Nave</option>
                        <option value="naviera">Naviera</option>
                        <option value="deposito">Depósito</option>
                        <option value="planta">Planta</option>
                        <option value="conductor">Conductor</option>
                        <option value="semana">Semana</option>
                      </select>
                      <button
                        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                        className={`p-1.5 text-xs font-medium transition-colors rounded border ${
                          theme === 'dark'
                            ? 'border-slate-700 bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
                            : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'
                        }`}
                        title={`Ordenar ${sortOrder === 'asc' ? 'descendente' : 'ascendente'}`}
                      >
                        {sortOrder === 'asc' ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : (
                          <ArrowDown className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                    
                    {/* Botones de vista */}
                    <div className={`flex items-center rounded-lg border ${theme === 'dark' ? 'border-slate-700' : 'border-gray-300'}`}>
                      <button
                        onClick={() => setViewMode('table')}
                        className={`px-3 py-2 text-sm font-medium transition-colors rounded-l-lg ${
                          viewMode === 'table'
                            ? theme === 'dark'
                              ? 'bg-sky-600 text-white'
                              : 'bg-blue-600 text-white'
                            : theme === 'dark'
                              ? 'text-slate-300 hover:bg-slate-800'
                              : 'text-gray-700 hover:bg-gray-100'
                        }`}
                        title="Vista de tabla"
                      >
                        <List className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setViewMode('cards')}
                        className={`px-3 py-2 text-sm font-medium transition-colors rounded-r-lg ${
                          viewMode === 'cards'
                            ? theme === 'dark'
                              ? 'bg-sky-600 text-white'
                              : 'bg-blue-600 text-white'
                            : theme === 'dark'
                              ? 'text-slate-300 hover:bg-slate-800'
                              : 'text-gray-700 hover:bg-gray-100'
                        }`}
                        title="Vista de tarjetas"
                      >
                        <Grid className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        showFilters
                          ? theme === 'dark'
                            ? 'bg-sky-600 text-white hover:bg-sky-500'
                            : 'bg-blue-600 text-white hover:bg-blue-500'
                          : theme === 'dark'
                            ? 'border-slate-700 text-slate-300 hover:border-sky-500 hover:text-sky-200'
                            : 'border-gray-300 text-gray-700 hover:border-blue-400 hover:text-blue-600 bg-white'
                      }`}
                    >
                      <Filter className="h-4 w-4" />
                      <span className="hidden sm:inline">Filtros</span>
                      <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {selectedRows.size > 0 && (
                      <>
                        <span className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                          {selectedRows.size} seleccionado(s)
                        </span>
                        <button
                          onClick={handleDeleteSelected}
                          disabled={isDeleting}
                          className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white shadow transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            theme === 'dark'
                              ? 'bg-red-600 hover:bg-red-500 focus:ring-2 focus:ring-red-500/50'
                              : 'bg-red-600 hover:bg-red-500 focus:ring-2 focus:ring-red-500/50'
                          }`}
                        >
                          <Trash2 className="h-4 w-4" />
                          {isDeleting ? 'Eliminando...' : 'Eliminar'}
                        </button>
                        <button
                          onClick={() => setSelectedRows(new Set())}
                          className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white shadow transition-colors ${
                            theme === 'dark'
                              ? 'bg-gray-600 hover:bg-gray-500 focus:ring-2 focus:ring-gray-500/50'
                              : 'bg-gray-600 hover:bg-gray-500 focus:ring-2 focus:ring-gray-500/50'
                          }`}
                        >
                          <X className="h-4 w-4" />
                          Deseleccionar
                        </button>
                      </>
                    )}
                    
                    {filteredRecords.length > 0 && (
                      <button
                        onClick={handleSelectAll}
                        className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white shadow transition-colors ${
                          theme === 'dark'
                            ? 'bg-blue-600 hover:bg-blue-500 focus:ring-2 focus:ring-blue-500/50'
                            : 'bg-blue-600 hover:bg-blue-500 focus:ring-2 focus:ring-blue-500/50'
                        }`}
                      >
                        {selectedRows.size === filteredRecords.length ? (
                          <>
                            <X className="h-4 w-4" />
                            Deseleccionar todo
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4" />
                            Seleccionar todo
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Panel de filtros */}
                {showFilters && (
                  <div className={`mt-4 p-4 rounded-xl border ${theme === 'dark'
                    ? 'border-slate-700 bg-slate-900/50'
                    : 'border-gray-200 bg-gray-50'
                  }`}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {/* Filtros de texto */}
                      <div>
                        <label className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>Booking</label>
                        <input
                          type="text"
                          value={filters.booking}
                          onChange={(e) => setFilters(prev => ({ ...prev, booking: e.target.value }))}
                          className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
                            theme === 'dark'
                              ? 'border-slate-600 bg-slate-800 text-slate-100 focus:ring-sky-500/50'
                              : 'border-gray-300 bg-white text-gray-900 focus:ring-blue-500/50'
                          }`}
                          placeholder="Filtrar booking..."
                        />
                      </div>
                      
                      <div>
                        <label className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>Contenedor</label>
                        <input
                          type="text"
                          value={filters.contenedor}
                          onChange={(e) => setFilters(prev => ({ ...prev, contenedor: e.target.value }))}
                          className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
                            theme === 'dark'
                              ? 'border-slate-600 bg-slate-800 text-slate-100 focus:ring-sky-500/50'
                              : 'border-gray-300 bg-white text-gray-900 focus:ring-blue-500/50'
                          }`}
                          placeholder="Filtrar contenedor..."
                        />
                      </div>
                      
                      <div>
                        <label className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>Nave</label>
                        <input
                          type="text"
                          value={filters.nave}
                          onChange={(e) => setFilters(prev => ({ ...prev, nave: e.target.value }))}
                          className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
                            theme === 'dark'
                              ? 'border-slate-600 bg-slate-800 text-slate-100 focus:ring-sky-500/50'
                              : 'border-gray-300 bg-white text-gray-900 focus:ring-blue-500/50'
                          }`}
                          placeholder="Filtrar nave..."
                        />
                      </div>
                      
                      <div>
                        <label className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>Naviera</label>
                        <input
                          type="text"
                          value={filters.naviera}
                          onChange={(e) => setFilters(prev => ({ ...prev, naviera: e.target.value }))}
                          className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
                            theme === 'dark'
                              ? 'border-slate-600 bg-slate-800 text-slate-100 focus:ring-sky-500/50'
                              : 'border-gray-300 bg-white text-gray-900 focus:ring-blue-500/50'
                          }`}
                          placeholder="Filtrar naviera..."
                        />
                      </div>
                      
                      <div>
                        <label className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>Especie</label>
                        <input
                          type="text"
                          value={filters.especie}
                          onChange={(e) => setFilters(prev => ({ ...prev, especie: e.target.value }))}
                          className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
                            theme === 'dark'
                              ? 'border-slate-600 bg-slate-800 text-slate-100 focus:ring-sky-500/50'
                              : 'border-gray-300 bg-white text-gray-900 focus:ring-blue-500/50'
                          }`}
                          placeholder="Filtrar especie..."
                        />
                      </div>
                      
                      <div>
                        <label className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>Depósito</label>
                        <input
                          type="text"
                          value={filters.deposito}
                          onChange={(e) => setFilters(prev => ({ ...prev, deposito: e.target.value }))}
                          className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
                            theme === 'dark'
                              ? 'border-slate-600 bg-slate-800 text-slate-100 focus:ring-sky-500/50'
                              : 'border-gray-300 bg-white text-gray-900 focus:ring-blue-500/50'
                          }`}
                          placeholder="Filtrar depósito..."
                        />
                      </div>
                      
                      <div>
                        <label className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>Conductor</label>
                        <input
                          type="text"
                          value={filters.conductor}
                          onChange={(e) => setFilters(prev => ({ ...prev, conductor: e.target.value }))}
                          className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
                            theme === 'dark'
                              ? 'border-slate-600 bg-slate-800 text-slate-100 focus:ring-sky-500/50'
                              : 'border-gray-300 bg-white text-gray-900 focus:ring-blue-500/50'
                          }`}
                          placeholder="Filtrar conductor..."
                        />
                      </div>
                      
                      <div>
                        <label className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>Transportista</label>
                        <input
                          type="text"
                          value={filters.transportista}
                          onChange={(e) => setFilters(prev => ({ ...prev, transportista: e.target.value }))}
                          className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
                            theme === 'dark'
                              ? 'border-slate-600 bg-slate-800 text-slate-100 focus:ring-sky-500/50'
                              : 'border-gray-300 bg-white text-gray-900 focus:ring-blue-500/50'
                          }`}
                          placeholder="Filtrar transportista..."
                        />
                      </div>
                      
                      <div>
                        <label className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>Semana</label>
                        <input
                          type="text"
                          value={filters.semana}
                          onChange={(e) => setFilters(prev => ({ ...prev, semana: e.target.value }))}
                          className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
                            theme === 'dark'
                              ? 'border-slate-600 bg-slate-800 text-slate-100 focus:ring-sky-500/50'
                              : 'border-gray-300 bg-white text-gray-900 focus:ring-blue-500/50'
                          }`}
                          placeholder="Filtrar semana..."
                        />
                      </div>
                      
                      {/* Filtros booleanos */}
                      <div>
                        <label className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>AT Controlada</label>
                        <select
                          value={filters.atControlada}
                          onChange={(e) => setFilters(prev => ({ ...prev, atControlada: e.target.value }))}
                          className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
                            theme === 'dark'
                              ? 'border-slate-600 bg-slate-800 text-slate-100 focus:ring-sky-500/50'
                              : 'border-gray-300 bg-white text-gray-900 focus:ring-blue-500/50'
                          }`}
                        >
                          <option value="">Todos</option>
                          <option value="true">Sí</option>
                          <option value="false">No</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>Late</label>
                        <select
                          value={filters.late}
                          onChange={(e) => setFilters(prev => ({ ...prev, late: e.target.value }))}
                          className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
                            theme === 'dark'
                              ? 'border-slate-600 bg-slate-800 text-slate-100 focus:ring-sky-500/50'
                              : 'border-gray-300 bg-white text-gray-900 focus:ring-blue-500/50'
                          }`}
                        >
                          <option value="">Todos</option>
                          <option value="true">Sí</option>
                          <option value="false">No</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>Extra Late</label>
                        <select
                          value={filters.extraLate}
                          onChange={(e) => setFilters(prev => ({ ...prev, extraLate: e.target.value }))}
                          className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
                            theme === 'dark'
                              ? 'border-slate-600 bg-slate-800 text-slate-100 focus:ring-sky-500/50'
                              : 'border-gray-300 bg-white text-gray-900 focus:ring-blue-500/50'
                          }`}
                        >
                          <option value="">Todos</option>
                          <option value="true">Sí</option>
                          <option value="false">No</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>Porteo</label>
                        <select
                          value={filters.porteo}
                          onChange={(e) => setFilters(prev => ({ ...prev, porteo: e.target.value }))}
                          className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
                            theme === 'dark'
                              ? 'border-slate-600 bg-slate-800 text-slate-100 focus:ring-sky-500/50'
                              : 'border-gray-300 bg-white text-gray-900 focus:ring-blue-500/50'
                          }`}
                        >
                          <option value="">Todos</option>
                          <option value="true">Sí</option>
                          <option value="false">No</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>Ingresado Stacking</label>
                        <select
                          value={filters.ingresadoStacking}
                          onChange={(e) => setFilters(prev => ({ ...prev, ingresadoStacking: e.target.value }))}
                          className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
                            theme === 'dark'
                              ? 'border-slate-600 bg-slate-800 text-slate-100 focus:ring-sky-500/50'
                              : 'border-gray-300 bg-white text-gray-900 focus:ring-blue-500/50'
                          }`}
                        >
                          <option value="">Todos</option>
                          <option value="true">Sí</option>
                          <option value="false">No</option>
                        </select>
                      </div>
                      
                      {/* Botón para limpiar filtros */}
                      <div className="flex items-end">
                        <button
                          onClick={() => setFilters({
                            booking: '',
                            contenedor: '',
                            nave: '',
                            naviera: '',
                            especie: '',
                            deposito: '',
                            conductor: '',
                            transportista: '',
                            semana: '',
                            atControlada: '',
                            late: '',
                            extraLate: '',
                            porteo: '',
                            ingresadoStacking: ''
                          })}
                          className={`w-full px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                            theme === 'dark'
                              ? 'border-slate-600 text-slate-300 hover:bg-slate-800'
                              : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          Limpiar filtros
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* Tabla principal */}
              {viewMode === 'table' ? (
                <section className={`rounded-3xl border shadow-xl backdrop-blur-xl overflow-hidden w-full ${theme === 'dark'
                  ? 'border-slate-800/70 bg-slate-950/70 shadow-slate-950/30'
                  : 'border-gray-200 bg-white shadow-md'
                  }`}>
                  <div className="max-h-[70vh] overflow-y-auto overflow-x-auto">
                    <table className={`min-w-full divide-y ${theme === 'dark' ? 'divide-slate-800/60' : 'divide-gray-200'
                      }`}>
                      <thead className={`sticky top-0 z-10 backdrop-blur-sm border-b ${theme === 'dark'
                        ? 'bg-slate-900/95 border-slate-800/60'
                        : 'bg-white border-gray-200'
                        }`}>
                        {/* Primera fila: Títulos de sección */}
                        <tr>
                          <th
                            rowSpan={2}
                            scope="col"
                            className={`px-4 py-4 text-center border-r ${theme === 'dark' ? 'border-slate-800/60' : 'border-gray-200'
                              }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedRows.size === filteredRecords.length && filteredRecords.length > 0}
                              onChange={handleSelectAll}
                              disabled={!canEdit}
                              className={`h-4 w-4 rounded focus:ring-2 ${canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'} ${theme === 'dark'
                                ? 'border-slate-600 bg-slate-800 text-sky-500 focus:ring-sky-500/50'
                                : 'border-gray-300 bg-white text-blue-600 focus:ring-blue-500/50'
                                }`}
                            />
                          </th>
                        </tr>
                        {/* Segunda fila: Nombres de columnas individuales */}
                        <tr>
                          {transportesSections.map((section) =>
                            section.columns.map((column) => (
                              <th
                                key={`${section.name}-${column.header}`}
                                scope="col"
                                className={`px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider whitespace-nowrap border-r ${theme === 'dark'
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
                      <tbody className={`divide-y ${theme === 'dark'
                        ? 'divide-slate-800/60 bg-slate-950/50'
                        : 'divide-gray-200 bg-white'
                        }`}>
                        {isLoading ? (
                          <tr>
                            <td
                              colSpan={transportesColumns.length + 1}
                              className={`px-4 py-12 text-center text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
                                }`}
                            >
                              <div className="flex items-center justify-center gap-3">
                                <RefreshCcw className={`h-5 w-5 animate-spin ${theme === 'dark' ? 'text-sky-400' : 'text-blue-600'
                                  }`} />
                                <span className={theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}>Cargando transportes...</span>
                              </div>
                            </td>
                          </tr>
                        ) : filteredRecords.length === 0 ? (
                          <tr>
                            <td
                              colSpan={transportesColumns.length + 1}
                              className={`px-4 py-12 text-center text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
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
                                    className={`text-xs underline ${theme === 'dark'
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
                              onContextMenu={(e) => {
                                e.preventDefault();
                                setContextMenu({
                                  x: e.clientX,
                                  y: e.clientY,
                                  record: item,
                                });
                              }}
                              className={`transition-colors ${theme === 'dark'
                                ? `hover:bg-slate-900/60 ${selectedRows.has(item.id) ? 'bg-slate-800/40' : ''}`
                                : `hover:bg-gray-100 ${selectedRows.has(item.id) ? 'bg-blue-50' : ''}`
                                }`}
                            >
                              <td className="px-4 py-4">
                                <input
                                  type="checkbox"
                                  checked={selectedRows.has(item.id)}
                                  onChange={() => handleToggleRowSelection(item.id)}
                                  disabled={!canEdit}
                                  className={`h-4 w-4 rounded focus:ring-2 ${canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'} ${theme === 'dark'
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
                                      className={`px-4 py-4 text-sm whitespace-nowrap text-center ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900 font-medium'
                                        }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={item.atmosfera_controlada || false}
                                        onChange={(e) => handleToggleAtmosferaControlada(item, e.target.checked)}
                                        disabled={!canEdit}
                                        className={`h-4 w-4 rounded ${canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'} ${theme === 'dark'
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
                                      className={`px-4 py-4 text-sm whitespace-nowrap text-center ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900 font-medium'
                                        }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={item.late || false}
                                        onChange={(e) => handleToggleLate(item, e.target.checked)}
                                        disabled={!canEdit}
                                        className={`h-4 w-4 rounded ${canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'} ${theme === 'dark'
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
                                      className={`px-4 py-4 text-sm whitespace-nowrap text-center ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900 font-medium'
                                        }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={item.extra_late || false}
                                        onChange={(e) => handleToggleExtraLate(item, e.target.checked)}
                                        disabled={!canEdit}
                                        className={`h-4 w-4 rounded ${canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'} ${theme === 'dark'
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
                                      className={`px-4 py-4 text-sm whitespace-nowrap text-center ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900 font-medium'
                                        }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={checkboxValue || false}
                                        onChange={(e) => handleToggleBoolean(item, column.key, e.target.checked)}
                                        disabled={!canEdit}
                                        className={`h-4 w-4 rounded ${canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'} ${theme === 'dark'
                                          ? 'border-slate-600 bg-slate-800 text-sky-500 focus:ring-sky-500/50'
                                          : 'border-gray-300 bg-white text-blue-600 focus:ring-blue-500/50'
                                          }`}
                                      />
                                    </td>
                                  );
                                }

                                // Renderizado especial para BOOKING con botón de descarga
                                if (column.key === 'booking') {
                                  const bookingValue = item.booking;
                                  const bookingKey = bookingValue ? bookingValue.trim().toUpperCase().replace(/\s+/g, '') : '';
                                  const hasPdf = bookingKey && bookingDocuments.has(bookingKey);

                                  return (
                                    <td
                                      key={`${item.id}-${column.header}`}
                                      className={`px-4 py-4 text-sm whitespace-nowrap text-center ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900 font-medium'
                                        }`}
                                    >
                                      <div className="flex items-center justify-center gap-2">
                                        <span>{bookingValue || '—'}</span>
                                        {hasPdf && canEdit && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDownloadBooking(bookingValue);
                                            }}
                                            disabled={downloadingBooking === bookingKey}
                                            className={`p-1.5 rounded transition-colors flex-shrink-0 ${downloadingBooking === bookingKey
                                              ? 'opacity-50 cursor-not-allowed'
                                              : theme === 'dark'
                                                ? 'hover:bg-slate-700 text-slate-300 hover:text-sky-200'
                                                : 'hover:bg-gray-200 text-gray-600 hover:text-blue-600'
                                              }`}
                                            title="Descargar PDF de booking"
                                          >
                                            {downloadingBooking === bookingKey ? (
                                              <RefreshCcw className="h-4 w-4 animate-spin" />
                                            ) : (
                                              <Download className="h-4 w-4" />
                                            )}
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  );
                                }

                                // CO2 y O2 solo editables si AT CONTROLADA está activo
                                const isDisabled = (column.key === 'co2' || column.key === 'o2') && !item.atmosfera_controlada;
                                // Si no tiene permisos de edición, mostrar solo texto
                                const shouldShowTextOnly = !canEdit || isDisabled;

                                return (
                                  <td
                                    key={`${item.id}-${column.header}`}
                                    className={`px-4 py-4 text-sm whitespace-nowrap text-center ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900 font-medium'
                                      }`}
                                  >
                                    {column.render ? (
                                      column.render(item, handleStackingClick, theme)
                                    ) : shouldShowTextOnly ? (
                                      <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
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
              ) : (
                /* Vista de tarjetas */
                <section className={`rounded-3xl border shadow-xl backdrop-blur-xl p-6 ${theme === 'dark'
                  ? 'border-slate-800/70 bg-slate-950/70 shadow-slate-950/30'
                  : 'border-gray-200 bg-white shadow-md'
                  }`}>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="flex items-center gap-3">
                        <RefreshCcw className={`h-5 w-5 animate-spin ${theme === 'dark' ? 'text-sky-400' : 'text-blue-600'}`} />
                        <span className={theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}>Cargando transportes...</span>
                      </div>
                    </div>
                  ) : filteredRecords.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <p className={theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}>
                        {searchTerm
                          ? 'No se encontraron registros que coincidan con la búsqueda.'
                          : 'No hay registros de transporte disponibles.'}
                      </p>
                      {searchTerm && (
                        <button
                          onClick={() => setSearchTerm('')}
                          className={`mt-2 text-xs underline ${theme === 'dark'
                            ? 'text-sky-400 hover:text-sky-300'
                            : 'text-blue-600 hover:text-blue-700'
                            }`}
                        >
                          Limpiar búsqueda
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-4">
                      {filteredRecords.map((item) => (
                        <TransporteCard
                          key={item.id}
                          transporte={item}
                          theme={theme}
                          canEdit={canEdit}
                          isSelected={selectedRows.has(item.id)}
                          onSelect={() => handleToggleRowSelection(item.id)}
                          onUpdate={handleUpdateRecord}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setContextMenu({
                              x: e.clientX,
                              y: e.clientY,
                              record: item,
                            });
                          }}
                          bookingDocuments={bookingDocuments}
                          downloadingBooking={downloadingBooking}
                          onDownloadBooking={handleDownloadBooking}
                        />
                      ))}
                    </div>
                  )}
                </section>
              )}
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

          {/* Modal de papelera */}
          <TrashModalTransportes
            isOpen={isTrashModalOpen}
            onClose={() => setIsTrashModalOpen(false)}
            onRestore={async () => {
              // Recargar transportes después de restaurar
              await reload();
              await loadTrashCount();
            }}
            onSuccess={(message) => {
              console.log(message);
            }}
            onError={(message) => {
              console.error(message);
            }}
          />

          {/* Modal para editar fechas de stacking */}
          <SimpleStackingModal
            isOpen={isDateTimeModalOpen}
            onClose={() => {
              setIsDateTimeModalOpen(false);
              setSelectedRecord(null);
            }}
            record={selectedRecord}
            onSave={(updatedRecord: TransporteRecord) => {
              setRecords(prev => prev.map(r => r.id === updatedRecord.id ? updatedRecord : r));
            }}
          />

          {/* Menú contextual */}
          {
            contextMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setContextMenu(null)}
                />
                <div
                  className={`fixed z-50 min-w-[200px] rounded-lg border shadow-xl ${theme === 'dark'
                    ? 'border-slate-700 bg-slate-900'
                    : 'border-gray-200 bg-white'
                    }`}
                  style={{
                    left: `${contextMenu.x}px`,
                    top: `${contextMenu.y}px`,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-1">
                    <div className={`mb-1 border-b px-2 py-1.5 ${theme === 'dark' ? 'border-slate-700' : 'border-gray-200'
                      }`}>
                      <p className={`text-xs font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                        }`}>
                        {contextMenu.record.booking || 'Transporte'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        handleDeleteTransporte(contextMenu.record);
                        setContextMenu(null);
                      }}
                      disabled={isDeleting}
                      className={`flex w-full items-center gap-2 rounded px-3 py-2 text-sm transition-colors disabled:opacity-50 ${theme === 'dark'
                        ? 'text-red-400 hover:bg-slate-800'
                        : 'text-red-600 hover:bg-gray-100'
                        }`}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>{isDeleting ? 'Eliminando…' : 'Eliminar'}</span>
                    </button>
                  </div>
                </div>
              </>
            )
          }

          {/* Modal de confirmación de eliminación */}
          {
            deleteConfirm && (
              <div
                className="fixed inset-0 z-[1300] flex items-center justify-center px-4 py-6 backdrop-blur-sm"
                onClick={handleCancelDelete}
                role="presentation"
                style={{
                  backgroundColor: theme === 'dark' ? 'rgba(2, 6, 23, 0.8)' : 'rgba(0, 0, 0, 0.5)',
                }}
              >
                <div
                  className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl ${theme === 'dark'
                    ? 'border-white/10 bg-slate-950/90'
                    : 'border-gray-200 bg-white'
                    }`}
                  onClick={(event) => event.stopPropagation()}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="delete-confirm-title"
                >
                  <div className="flex items-start gap-4">
                    <span className={`inline-flex h-12 w-12 items-center justify-center rounded-full border ${theme === 'dark'
                      ? 'border-amber-400/40 bg-amber-500/10 text-amber-200'
                      : 'border-amber-400/60 bg-amber-50 text-amber-600'
                      }`}>
                      <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <h3
                        id="delete-confirm-title"
                        className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                          }`}
                      >
                        Enviar a papelera
                      </h3>
                      <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'
                        }`}>
                        ¿Quieres enviar el transporte{' '}
                        <strong>{deleteConfirm.booking || deleteConfirm.contenedor || 'este registro'}</strong> a la papelera?
                        Podrás restaurarlo más tarde desde la papelera.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={handleCancelDelete}
                      disabled={isDeleting}
                      className={`inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60 ${theme === 'dark'
                        ? 'border-slate-700/70 text-slate-200 hover:border-slate-500 hover:text-white'
                        : 'border-gray-300 text-gray-700 hover:border-gray-400 hover:text-gray-900'
                        }`}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmDelete}
                      disabled={isDeleting}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-rose-500 to-red-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-rose-500/20 transition hover:scale-[1.02] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isDeleting ? (
                        <>
                          <RefreshCcw className="h-4 w-4 animate-spin" aria-hidden="true" />
                          Eliminando…
                        </>
                      ) : (
                        'Enviar a papelera'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )
          }
        </div >
      </div >
    </EditingCellProvider >
  );
}
