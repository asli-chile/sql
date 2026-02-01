'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/hooks/useUser';
import { Sidebar } from '@/components/layout/Sidebar';
import { UserProfileModal } from '@/components/users/UserProfileModal';
import { Registro } from '@/types/registros';
import { convertSupabaseToApp } from '@/lib/migration-utils';
import {
  LayoutDashboard,
  Ship,
  Truck,
  FileText,
  Globe,
  Activity,
  DollarSign,
  BarChart3,
  Users,
  Menu,
  X,
  ChevronRight,
  User as UserIcon,
  FileCheck,
  Receipt,
  Search,
  Filter,
  CheckCircle2,
  ChevronLeft,
  Anchor,
  Package,
} from 'lucide-react';
import { SidebarSection } from '@/types/layout';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { InstructivoEmbarqueModal } from '@/components/documentos/InstructivoEmbarqueModal';
import { FacturaProformaModal } from '@/components/documentos/FacturaProformaModal';

interface ContenedorInfo {
  contenedor: string;
  registro: Registro;
}

interface BookingInfo {
  booking: string;
  refAsli?: string;
  refCliente?: string;
  registro: Registro;
  contenedores: ContenedorInfo[];
}

interface NaveInfo {
  nave: string;
  naveCompleta: string; // Nombre con viaje
  bookings: BookingInfo[];
}

export default function GenerarDocumentosPage() {
  const { theme } = useTheme();
  const { currentUser, registrosCount, transportesCount, setCurrentUser } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNave, setSelectedNave] = useState<NaveInfo | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<BookingInfo | null>(null);
  const [selectedContenedor, setSelectedContenedor] = useState<ContenedorInfo | null>(null);
  const [showInstructivoModal, setShowInstructivoModal] = useState(false);
  const [showProformaModal, setShowProformaModal] = useState(false);
  
  // Estados para navegación móvil
  const [mobileView, setMobileView] = useState<'naves' | 'bookings' | 'contenedores' | 'acciones'>('naves');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [existingDocs, setExistingDocs] = useState<{[booking: string]: {instructivo: boolean, proforma: boolean}}>({});
  
  // Estados para filtros
  const [showFilters, setShowFilters] = useState(false);
  const [selectedClientes, setSelectedClientes] = useState<string[]>([]);
  const [selectedNaviera, setSelectedNaviera] = useState<string | null>(null);
  const [filterNave, setFilterNave] = useState<string | null>(null);
  const [selectedEspecie, setSelectedEspecie] = useState<string | null>(null);

  const isRodrigo = currentUser?.email?.toLowerCase() === 'rodrigo.caceres@asli.cl';

  // Cargar registros
  useEffect(() => {
    const loadRegistros = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('registros')
          .select('*')
          .is('deleted_at', null)
          .not('ref_asli', 'is', null)
          .order('ref_asli', { ascending: false });

        if (error) throw error;

        const registrosList = (data || []).map((registro: any) => convertSupabaseToApp(registro));
        setRegistros(registrosList);
      } catch (error) {
        console.error('Error cargando registros:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRegistros();
  }, []);

  // Obtener usuario
  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data: userData } = await supabase
          .from('usuarios')
          .select('*')
          .eq('auth_user_id', user.id)
          .single();
        setUserInfo(userData || {
          nombre: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario',
          email: user.email || ''
        });
      }
    };
    fetchUser();
  }, []);

  // Verificar documentos existentes cuando se selecciona un booking
  useEffect(() => {
    if (!selectedBooking) return;
    
    const checkExistingDocuments = async () => {
      try {
        const supabase = createClient();
        const booking = selectedBooking.booking;
        const normalizedBooking = booking.trim().toUpperCase().replace(/\s+/g, '');
        
        // Verificar instructivo
        const { data: instructivoData } = await supabase.storage
          .from('documentos')
          .list('instructivo-embarque', { limit: 100 });
        
        const hasInstructivo = instructivoData?.some(file => {
          const separatorIndex = file.name.indexOf('__');
          if (separatorIndex === -1) return false;
          const fileBooking = decodeURIComponent(file.name.slice(0, separatorIndex)).replace(/\s+/g, '');
          return fileBooking === normalizedBooking;
        }) || false;
        
        // Verificar proforma
        const { data: proformaData } = await supabase.storage
          .from('documentos')
          .list('factura-proforma', { limit: 100 });
        
        const hasProforma = proformaData?.some(file => {
          const separatorIndex = file.name.indexOf('__');
          if (separatorIndex === -1) return false;
          const fileBooking = decodeURIComponent(file.name.slice(0, separatorIndex)).replace(/\s+/g, '');
          return fileBooking === normalizedBooking;
        }) || false;
        
        setExistingDocs({
          [booking]: {
            instructivo: hasInstructivo,
            proforma: hasProforma,
          }
        });
      } catch (error) {
        console.error('Error verificando documentos existentes:', error);
      }
    };
    
    checkExistingDocuments();
  }, [selectedBooking]);

  // Generar opciones de filtro
  const filterOptions = useMemo(() => {
    const clientesSet = new Set<string>();
    const navierasSet = new Set<string>();
    const navesSet = new Set<string>();
    const especiesSet = new Set<string>();

    registros.forEach(registro => {
      if (registro.shipper?.trim()) {
        clientesSet.add(registro.shipper.trim().toUpperCase());
      }
      if (registro.naviera?.trim()) {
        navierasSet.add(registro.naviera.trim().toUpperCase());
      }
      if (registro.naveInicial?.trim()) {
        // Extraer solo el nombre de la nave sin el viaje
        const naveMatch = registro.naveInicial.trim().match(/^(.+?)\s*\[/);
        const naveName = naveMatch ? naveMatch[1].trim() : registro.naveInicial.trim();
        if (naveName) {
          navesSet.add(naveName.toUpperCase());
        }
      }
      if (registro.especie?.trim()) {
        especiesSet.add(registro.especie.trim().toUpperCase());
      }
    });

    return {
      clientes: Array.from(clientesSet).sort(),
      navieras: Array.from(navierasSet).sort(),
      naves: Array.from(navesSet).sort(),
      especies: Array.from(especiesSet).sort(),
    };
  }, [registros]);

  // Agrupar registros por nave → booking → contenedores
  const navesConBookings = useMemo(() => {
    const navesMap = new Map<string, NaveInfo>();

    registros.forEach(registro => {
      // Extraer nombre de la nave
      const naveInicial = registro.naveInicial?.trim();
      if (!naveInicial) return;
      
      const naveMatch = naveInicial.match(/^(.+?)\s*\[/);
      const naveName = (naveMatch ? naveMatch[1].trim() : naveInicial).toUpperCase();
      
      // Aplicar filtros
      if (selectedClientes.length > 0) {
        const cliente = registro.shipper?.trim().toUpperCase();
        if (!cliente || !selectedClientes.includes(cliente)) return;
      }
      if (selectedNaviera) {
        const naviera = registro.naviera?.trim().toUpperCase();
        if (!naviera || naviera !== selectedNaviera.toUpperCase()) return;
      }
      if (filterNave) {
        if (naveName !== filterNave.toUpperCase()) return;
      }
      if (selectedEspecie) {
        const especie = registro.especie?.trim().toUpperCase();
        if (!especie || especie !== selectedEspecie.toUpperCase()) return;
      }

      const booking = registro.booking?.trim();
      if (!booking) return;

      // Crear o obtener nave
      if (!navesMap.has(naveName)) {
        navesMap.set(naveName, {
          nave: naveName,
          naveCompleta: naveInicial,
          bookings: [],
        });
      }

      const naveInfo = navesMap.get(naveName)!;
      
      // Buscar o crear booking dentro de la nave
      let bookingInfo = naveInfo.bookings.find(b => b.booking === booking);
      if (!bookingInfo) {
        bookingInfo = {
          booking,
          refAsli: registro.refAsli?.trim(),
          refCliente: registro.refCliente?.trim(),
          registro,
          contenedores: [],
        };
        naveInfo.bookings.push(bookingInfo);
      }

      // Agregar contenedores
      const contenedores = Array.isArray(registro.contenedor)
        ? registro.contenedor
        : registro.contenedor
          ? [registro.contenedor]
          : [];

      contenedores.forEach(contenedor => {
        const contenedorStr = contenedor?.trim();
        if (contenedorStr && !bookingInfo!.contenedores.some(c => c.contenedor === contenedorStr)) {
          bookingInfo!.contenedores.push({
            contenedor: contenedorStr,
            registro,
          });
        }
      });
    });

    // Ordenar naves alfabéticamente
    return Array.from(navesMap.values()).sort((a, b) => 
      a.nave.localeCompare(b.nave)
    );
  }, [registros, selectedClientes, selectedNaviera, filterNave, selectedEspecie]);

  // Filtrar naves por término de búsqueda
  const filteredNaves = useMemo(() => {
    if (!searchTerm.trim()) return navesConBookings;

    const searchLower = searchTerm.toLowerCase();
    return navesConBookings.filter(nave => 
      nave.nave.toLowerCase().includes(searchLower) ||
      nave.naveCompleta.toLowerCase().includes(searchLower) ||
      nave.bookings.some(b => 
        b.booking.toLowerCase().includes(searchLower) ||
        b.refAsli?.toLowerCase().includes(searchLower) ||
        b.refCliente?.toLowerCase().includes(searchLower) ||
        b.contenedores.some(c => c.contenedor.toLowerCase().includes(searchLower))
      )
    );
  }, [navesConBookings, searchTerm]);

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
        { label: 'Generar Documentos', id: '/generar-documentos', icon: FileCheck },
        { label: 'Seguimiento Marítimo', id: '/dashboard/seguimiento', icon: Globe },
        { label: 'Tracking Movs', id: '/dashboard/tracking', icon: Activity },
        ...(isRodrigo
          ? [
            { label: 'Finanzas', id: '/finanzas', icon: DollarSign },
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

  const handleSelectNave = (nave: NaveInfo) => {
    setSelectedNave(nave);
    setSelectedBooking(null);
    setSelectedContenedor(null);
    setMobileView('bookings'); // Cambiar a vista de bookings en móvil
  };

  const handleSelectBooking = (booking: BookingInfo) => {
    setSelectedBooking(booking);
    setSelectedContenedor(null);
    setMobileView('contenedores'); // Cambiar a vista de contenedores en móvil
  };

  const handleSelectContenedor = (contenedor: ContenedorInfo) => {
    setSelectedContenedor(contenedor);
    setMobileView('acciones'); // Cambiar a vista de acciones en móvil
  };

  const handleGenerarInstructivo = () => {
    // Requiere al menos un booking seleccionado
    if (!selectedBooking) return;
    setShowInstructivoModal(true);
  };

  const handleGenerarProforma = () => {
    // La proforma requiere contenedor
    if (!selectedContenedor) return;
    setShowProformaModal(true);
  };

  const handleCloseInstructivoModal = () => {
    setShowInstructivoModal(false);
    // Recargar estado de documentos
    if (selectedBooking) {
      const checkExistingDocuments = async () => {
        try {
          const supabase = createClient();
          const booking = selectedBooking.booking;
          const normalizedBooking = booking.trim().toUpperCase().replace(/\s+/g, '');
          
          // Verificar instructivo
          const { data: instructivoData } = await supabase.storage
            .from('documentos')
            .list('instructivo-embarque', { limit: 100 });
          
          const hasInstructivo = instructivoData?.some(file => {
            const separatorIndex = file.name.indexOf('__');
            if (separatorIndex === -1) return false;
            const fileBooking = decodeURIComponent(file.name.slice(0, separatorIndex)).replace(/\s+/g, '');
            return fileBooking === normalizedBooking;
          }) || false;
          
          // Verificar proforma
          const { data: proformaData } = await supabase.storage
            .from('documentos')
            .list('factura-proforma', { limit: 100 });
          
          const hasProforma = proformaData?.some(file => {
            const separatorIndex = file.name.indexOf('__');
            if (separatorIndex === -1) return false;
            const fileBooking = decodeURIComponent(file.name.slice(0, separatorIndex)).replace(/\s+/g, '');
            return fileBooking === normalizedBooking;
          }) || false;
          
          setExistingDocs({
            [booking]: {
              instructivo: hasInstructivo,
              proforma: hasProforma,
            }
          });
        } catch (error) {
          console.error('Error verificando documentos existentes:', error);
        }
      };
      
      checkExistingDocuments();
    }
  };

  const handleCloseProformaModal = () => {
    setShowProformaModal(false);
    // Recargar estado de documentos (usar la misma lógica que arriba)
    if (selectedBooking) {
      const checkExistingDocuments = async () => {
        try {
          const supabase = createClient();
          const booking = selectedBooking.booking;
          const normalizedBooking = booking.trim().toUpperCase().replace(/\s+/g, '');
          
          // Verificar instructivo
          const { data: instructivoData } = await supabase.storage
            .from('documentos')
            .list('instructivo-embarque', { limit: 100 });
          
          const hasInstructivo = instructivoData?.some(file => {
            const separatorIndex = file.name.indexOf('__');
            if (separatorIndex === -1) return false;
            const fileBooking = decodeURIComponent(file.name.slice(0, separatorIndex)).replace(/\s+/g, '');
            return fileBooking === normalizedBooking;
          }) || false;
          
          // Verificar proforma
          const { data: proformaData } = await supabase.storage
            .from('documentos')
            .list('factura-proforma', { limit: 100 });
          
          const hasProforma = proformaData?.some(file => {
            const separatorIndex = file.name.indexOf('__');
            if (separatorIndex === -1) return false;
            const fileBooking = decodeURIComponent(file.name.slice(0, separatorIndex)).replace(/\s+/g, '');
            return fileBooking === normalizedBooking;
          }) || false;
          
          setExistingDocs({
            [booking]: {
              instructivo: hasInstructivo,
              proforma: hasProforma,
            }
          });
        } catch (error) {
          console.error('Error verificando documentos existentes:', error);
        }
      };
      
      checkExistingDocuments();
    }
  };

  const handleClearFilters = () => {
    setSelectedClientes([]);
    setSelectedNaviera(null);
    setFilterNave(null);
    setSelectedEspecie(null);
  };

  const handleToggleCliente = (cliente: string) => {
    setSelectedClientes(prev => {
      const clienteUpper = cliente.toUpperCase();
      if (prev.includes(clienteUpper)) {
        return prev.filter(c => c !== clienteUpper);
      } else {
        return [...prev, clienteUpper];
      }
    });
  };

  const hasActiveFilters = selectedClientes.length > 0 || selectedNaviera || filterNave || selectedEspecie;

  if (loading) {
    return <LoadingScreen message="Cargando referencias..." />;
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
        currentUser={currentUser}
        user={user}
        setShowProfileModal={setShowProfileModal}
      />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className={`p-2 sm:p-3 border-b ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => isSidebarCollapsed ? setIsSidebarCollapsed(false) : setIsMobileMenuOpen(true)}
                className={`p-2 border transition-colors ${theme === 'dark'
                  ? 'hover:bg-slate-700 border-slate-700 text-slate-400'
                  : 'hover:bg-gray-100 border-gray-300 text-gray-500'
                  } ${!isSidebarCollapsed && 'lg:hidden'}`}
              >
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <p className={`text-[10px] sm:text-[11px] uppercase tracking-[0.2em] sm:tracking-[0.3em] ${theme === 'dark' ? 'text-slate-500/80' : 'text-gray-500'}`}>Módulo de Documentos</p>
                <h1 className={`text-lg sm:text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Generar Documentos
                </h1>
                <p className={`text-[11px] sm:text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                  Instructivo de Embarque y Factura Proforma por contenedor
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Botón de filtros */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-colors border ${showFilters
                  ? theme === 'dark'
                    ? 'bg-sky-600 text-white hover:bg-sky-500 border-sky-500'
                    : 'bg-blue-600 text-white hover:bg-blue-500 border-blue-500'
                  : theme === 'dark'
                    ? 'border-slate-700 text-slate-100 hover:border-sky-500 hover:text-sky-200 hover:bg-slate-700 bg-slate-800'
                    : 'border-gray-300 text-gray-900 hover:border-blue-500 hover:text-blue-700 hover:bg-gray-100 bg-white'
                  }`}
              >
                <Filter className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Filtros</span>
                {hasActiveFilters && (
                  <span className={`text-xs px-1.5 py-0.5 ${showFilters
                    ? 'bg-white/20'
                    : theme === 'dark'
                      ? 'bg-sky-500/30'
                      : 'bg-blue-500/20'
                    }`}>
                    {selectedClientes.length + (selectedNaviera ? 1 : 0) + (selectedNave ? 1 : 0) + (selectedEspecie ? 1 : 0)}
                  </span>
                )}
              </button>
              
              {/* Botón de usuario */}
              <button
                type="button"
                onClick={() => setShowProfileModal(true)}
                className={`hidden sm:flex items-center gap-1.5 border ${theme === 'dark'
                  ? 'border-slate-700 bg-slate-800 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-slate-200 hover:border-sky-500 hover:text-sky-200'
                  : 'border-gray-300 bg-white px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-700 hover:border-blue-500 hover:text-blue-700'
                  } transition`}
                title={currentUser?.nombre || user?.user_metadata?.full_name || user?.email || 'Usuario'}
              >
                <UserIcon className="h-4 w-4 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="max-w-[100px] md:max-w-[160px] truncate font-medium text-xs sm:text-sm">
                  {currentUser?.nombre || user?.user_metadata?.full_name || user?.email || 'Usuario'}
                </span>
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Navegación breadcrumb móvil */}
          <div className={`lg:hidden w-full border-b ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-1.5 p-2 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setMobileView('naves')}
                className={`flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium whitespace-nowrap rounded transition-colors ${
                  mobileView === 'naves'
                    ? theme === 'dark'
                      ? 'bg-sky-600 text-white'
                      : 'bg-blue-600 text-white'
                    : theme === 'dark'
                      ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Anchor className="h-3 w-3" />
                <span className="hidden sm:inline">Naves</span>
                <span className="sm:hidden">N</span>
              </button>
              {selectedNave && (
                <>
                  <ChevronRight className={`h-3 w-3 flex-shrink-0 ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`} />
                  <button
                    onClick={() => setMobileView('bookings')}
                    className={`flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium whitespace-nowrap rounded transition-colors ${
                      mobileView === 'bookings'
                        ? theme === 'dark'
                          ? 'bg-sky-600 text-white'
                          : 'bg-blue-600 text-white'
                        : theme === 'dark'
                          ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    <FileText className="h-3 w-3" />
                    <span className="hidden sm:inline">Bookings</span>
                    <span className="sm:hidden">B</span>
                  </button>
                </>
              )}
              {selectedBooking && (
                <>
                  <ChevronRight className={`h-3 w-3 flex-shrink-0 ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`} />
                  <button
                    onClick={() => setMobileView('contenedores')}
                    className={`flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium whitespace-nowrap rounded transition-colors ${
                      mobileView === 'contenedores'
                        ? theme === 'dark'
                          ? 'bg-sky-600 text-white'
                          : 'bg-blue-600 text-white'
                        : theme === 'dark'
                          ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    <Package className="h-3 w-3" />
                    <span className="hidden sm:inline">Contenedores</span>
                    <span className="sm:hidden">C</span>
                  </button>
                  <ChevronRight className={`h-3 w-3 flex-shrink-0 ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`} />
                  <button
                    onClick={() => setMobileView('acciones')}
                    className={`flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium whitespace-nowrap rounded transition-colors ${
                      mobileView === 'acciones'
                        ? theme === 'dark'
                          ? 'bg-sky-600 text-white'
                          : 'bg-blue-600 text-white'
                        : theme === 'dark'
                          ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    <FileCheck className="h-3 w-3" />
                    <span className="hidden sm:inline">Acciones</span>
                    <span className="sm:hidden">A</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Panel izquierdo - Lista de naves */}
          <div className={`w-full lg:w-80 flex-shrink-0 flex flex-col border-r overflow-hidden ${
            mobileView !== 'naves' ? 'hidden lg:flex' : 'flex'
          } ${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'}`}>
            {/* Búsqueda */}
            <div className={`p-2 sm:p-3 border-b ${theme === 'dark' ? 'border-slate-700' : 'border-gray-200'}`}>
              <div className="relative">
                <Search className={`absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`} />
                <input
                  type="text"
                  placeholder="Buscar nave, booking..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 border text-xs sm:text-sm ${theme === 'dark'
                    ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                    }`}
                />
              </div>
            </div>

            {/* Lista de naves */}
            <div className="flex-1 overflow-y-auto p-2">
              {filteredNaves.length === 0 ? (
                <div className="text-center py-8 sm:py-10">
                  <p className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`}>
                    {searchTerm ? 'No se encontraron naves' : 'No hay naves disponibles'}
                  </p>
                </div>
              ) : (
                filteredNaves.map((nave) => (
                  <div
                    key={nave.nave}
                    className={`mb-2 border cursor-pointer transition-colors rounded ${selectedNave?.nave === nave.nave
                      ? theme === 'dark'
                        ? 'bg-sky-900/30 border-sky-600'
                        : 'bg-blue-50 border-blue-400'
                      : theme === 'dark'
                        ? 'border-slate-700 hover:bg-slate-800'
                        : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    onClick={() => handleSelectNave(nave)}
                  >
                    <div className="p-2.5 sm:p-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className={`font-semibold text-xs sm:text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {nave.nave}
                        </p>
                        <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded ${theme === 'dark' ? 'bg-slate-700 text-slate-300' : 'bg-gray-200 text-gray-700'}`}>
                          {nave.bookings.length} {nave.bookings.length === 1 ? 'reserva' : 'reservas'}
                        </span>
                      </div>
                      <p className={`text-[10px] sm:text-xs truncate ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                        {nave.naveCompleta}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Panel central - Bookings de la nave seleccionada */}
          <div className={`w-full lg:w-80 flex-shrink-0 flex flex-col border-r overflow-hidden ${
            mobileView !== 'bookings' ? 'hidden lg:flex' : 'flex'
          } ${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'}`}>
            {selectedNave ? (
              <>
                <div className={`p-2 sm:p-3 border-b ${theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-gray-50'}`}>
                  <h3 className={`font-semibold text-xs sm:text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Reservas - {selectedNave.nave}
                  </h3>
                  <p className={`text-[10px] sm:text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                    {selectedNave.bookings.length} {selectedNave.bookings.length === 1 ? 'reserva' : 'reservas'}
                  </p>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                  {selectedNave.bookings.length === 0 ? (
                    <div className="text-center py-8 sm:py-10">
                      <p className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`}>
                        No hay reservas para esta nave
                      </p>
                    </div>
                  ) : (
                    selectedNave.bookings.map((booking) => (
                      <div
                        key={booking.booking}
                        className={`mb-2 border cursor-pointer transition-colors rounded ${selectedBooking?.booking === booking.booking
                          ? theme === 'dark'
                            ? 'bg-sky-900/30 border-sky-600'
                            : 'bg-blue-50 border-blue-400'
                          : theme === 'dark'
                            ? 'border-slate-700 hover:bg-slate-800'
                            : 'border-gray-300 hover:bg-gray-50'
                          }`}
                        onClick={() => handleSelectBooking(booking)}
                      >
                        <div className="p-2.5 sm:p-3">
                          <p className={`font-medium text-xs sm:text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {booking.booking}
                          </p>
                          {booking.refAsli && (
                            <p className={`text-[10px] sm:text-xs mt-0.5 sm:mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                              Ref ASLI: {booking.refAsli}
                            </p>
                          )}
                          {booking.refCliente && (
                            <p className={`text-[10px] sm:text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                              Ref Cliente: {booking.refCliente}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1.5 sm:mt-2">
                            <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded ${theme === 'dark' ? 'bg-slate-700 text-slate-300' : 'bg-gray-200 text-gray-700'}`}>
                              {booking.contenedores.length} {booking.contenedores.length === 1 ? 'contenedor' : 'contenedores'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-4">
                <p className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`}>
                  Selecciona una nave
                </p>
              </div>
            )}
          </div>

          {/* Panel derecho - Contenedores y Acciones */}
          <div className={`flex-1 flex flex-col overflow-hidden transition-all ${showFilters ? 'lg:mr-80' : ''} ${
            (mobileView !== 'contenedores' && mobileView !== 'acciones') ? 'hidden lg:flex' : 'flex'
          }`}>
            {selectedBooking ? (
              <div className="flex flex-col lg:flex-row h-full">
                {/* Subpanel izquierdo - Contenedores */}
                <div className={`w-full lg:w-80 flex-shrink-0 flex flex-col border-r overflow-hidden ${
                  mobileView !== 'contenedores' ? 'hidden lg:flex' : 'flex'
                } ${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'}`}>
                  <div className={`p-2 sm:p-3 border-b ${theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-gray-50'}`}>
                    <h3 className={`font-semibold text-xs sm:text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Contenedores
                    </h3>
                    <p className={`text-[10px] sm:text-xs truncate ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                      Booking: {selectedBooking.booking}
                    </p>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2">
                    {selectedBooking.contenedores.length === 0 ? (
                      <div className="text-center py-8 sm:py-10">
                        <p className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`}>
                          No hay contenedores
                        </p>
                      </div>
                    ) : (
                      selectedBooking.contenedores.map((cont) => (
                        <div
                          key={cont.contenedor}
                          className={`mb-2 border cursor-pointer transition-colors rounded ${selectedContenedor?.contenedor === cont.contenedor
                            ? theme === 'dark'
                              ? 'bg-sky-900/30 border-sky-600'
                              : 'bg-blue-50 border-blue-400'
                            : theme === 'dark'
                              ? 'border-slate-700 hover:bg-slate-800'
                              : 'border-gray-300 hover:bg-gray-50'
                            }`}
                          onClick={() => handleSelectContenedor(cont)}
                        >
                          <div className="p-2.5 sm:p-3">
                            <p className={`font-medium text-xs sm:text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                              {cont.contenedor}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Subpanel derecho - Acciones */}
                <div className={`flex-1 p-4 lg:p-6 overflow-y-auto ${
                  mobileView !== 'acciones' ? 'hidden lg:block' : 'block'
                }`}>
                  <div className="max-w-2xl mx-auto">
                    <div className={`border p-4 lg:p-6 ${theme === 'dark' ? 'border-slate-700 bg-slate-900' : 'border-gray-300 bg-white'}`}>
                      <h2 className={`text-lg lg:text-xl font-bold mb-3 lg:mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        Generar Documentos
                      </h2>
                      <div className="mb-4 space-y-1">
                        <p className={`text-xs lg:text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                          Nave: <span className="font-semibold">{selectedNave?.nave}</span>
                        </p>
                        <p className={`text-xs lg:text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                          Booking: <span className="font-semibold">{selectedBooking.booking}</span>
                        </p>
                        {selectedBooking.refAsli && (
                          <p className={`text-xs lg:text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                            Ref ASLI: <span className="font-semibold">{selectedBooking.refAsli}</span>
                          </p>
                        )}
                        {selectedContenedor && (
                          <p className={`text-xs lg:text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                            Contenedor: <span className="font-semibold">{selectedContenedor.contenedor}</span>
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
                        <button
                          onClick={handleGenerarInstructivo}
                          disabled={!selectedBooking}
                          className={`flex flex-col items-center justify-center p-4 lg:p-6 border transition-colors relative ${!selectedBooking
                            ? 'opacity-50 cursor-not-allowed'
                            : theme === 'dark'
                              ? 'border-slate-700 hover:bg-slate-800'
                              : 'border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                          {selectedBooking && existingDocs[selectedBooking.booking]?.instructivo && (
                            <div className="absolute top-2 right-2">
                              <CheckCircle2 className={`h-4 w-4 lg:h-5 lg:w-5 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`} />
                            </div>
                          )}
                          <FileCheck className={`h-10 w-10 lg:h-12 lg:w-12 mb-2 lg:mb-3 ${theme === 'dark' ? 'text-sky-400' : 'text-blue-600'}`} />
                          <p className={`font-semibold text-xs lg:text-sm text-center ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            Instructivo de Embarque
                          </p>
                          <p className={`text-[10px] lg:text-xs mt-1 text-center ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                            {selectedContenedor ? 'Para contenedor específico' : 'Para toda la reserva'}
                          </p>
                          {selectedBooking && existingDocs[selectedBooking.booking]?.instructivo && (
                            <p className={`text-[10px] lg:text-xs mt-1 font-medium text-center ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                              ✓ Ya existe en documentos
                            </p>
                          )}
                        </button>

                        <button
                          onClick={handleGenerarProforma}
                          disabled={!selectedContenedor}
                          className={`flex flex-col items-center justify-center p-4 lg:p-6 border transition-colors relative ${!selectedContenedor
                            ? 'opacity-50 cursor-not-allowed'
                            : theme === 'dark'
                              ? 'border-slate-700 hover:bg-slate-800'
                              : 'border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                          {selectedContenedor && selectedBooking && existingDocs[selectedBooking.booking]?.proforma && (
                            <div className="absolute top-2 right-2">
                              <CheckCircle2 className={`h-4 w-4 lg:h-5 lg:w-5 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`} />
                            </div>
                          )}
                          <Receipt className={`h-10 w-10 lg:h-12 lg:w-12 mb-2 lg:mb-3 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`} />
                          <p className={`font-semibold text-xs lg:text-sm text-center ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            Factura Proforma
                          </p>
                          <p className={`text-[10px] lg:text-xs mt-1 text-center ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                            {selectedContenedor ? 'Generar factura proforma' : 'Requiere contenedor'}
                          </p>
                          {selectedContenedor && selectedBooking && existingDocs[selectedBooking.booking]?.proforma && (
                            <p className={`text-[10px] lg:text-xs mt-1 font-medium text-center ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                              ✓ Ya existe en documentos
                            </p>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className={`flex-1 flex items-center justify-center p-4 ${
                mobileView !== 'acciones' ? 'hidden lg:flex' : 'flex'
              }`}>
                <div className="text-center">
                  <FileText className={`h-12 w-12 lg:h-16 lg:w-16 mx-auto mb-3 lg:mb-4 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-400'}`} />
                  <p className={`text-base lg:text-lg font-semibold mb-1 lg:mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Selecciona un booking
                  </p>
                  <p className={`text-xs lg:text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>
                    Elige una nave y luego un booking para generar documentos
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Panel lateral de filtros */}
          <aside
            className={`fixed lg:relative right-0 top-0 z-50 lg:z-auto flex h-full lg:h-auto flex-col transition-all duration-300 ${theme === 'dark' ? 'border-l border-slate-700 bg-slate-900' : 'border-l border-gray-200 bg-white'} ${showFilters
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

            <div className={`flex items-center justify-between px-4 py-4 border-b ${theme === 'dark' ? 'border-slate-700' : 'border-gray-200'}`}>
              <h2 className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>Filtros</h2>
              <button
                onClick={() => setShowFilters(false)}
                className={`flex h-8 w-8 items-center justify-center border transition ${theme === 'dark'
                  ? 'border-slate-700 bg-slate-800 text-slate-300 hover:border-sky-500 hover:text-sky-200'
                  : 'border-gray-300 bg-white text-gray-600 hover:border-blue-500 hover:text-blue-700'
                  }`}
                aria-label="Cerrar panel de filtros"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
              {/* Botón limpiar filtros */}
              {hasActiveFilters && (
                <button
                  onClick={handleClearFilters}
                  className={`w-full px-3 py-2 text-sm font-medium border transition-colors ${theme === 'dark'
                    ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  Limpiar filtros
                </button>
              )}

              {/* Filtro de Clientes */}
              <div>
                <label className={`block text-xs font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                  Clientes
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {filterOptions.clientes.map((cliente) => (
                    <label
                      key={cliente}
                      className={`flex items-center gap-2 cursor-pointer p-2 border transition-colors ${selectedClientes.includes(cliente)
                        ? theme === 'dark'
                          ? 'bg-sky-900/30 border-sky-600'
                          : 'bg-blue-50 border-blue-400'
                        : theme === 'dark'
                          ? 'border-slate-700 hover:bg-slate-800'
                          : 'border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedClientes.includes(cliente)}
                        onChange={() => handleToggleCliente(cliente)}
                        className={`w-4 h-4 ${theme === 'dark'
                          ? 'text-sky-600 bg-slate-800 border-slate-600'
                          : 'text-blue-600 bg-white border-gray-300'
                          }`}
                      />
                      <span className={`text-xs ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>
                        {cliente}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Filtro de Naviera */}
              <div>
                <label className={`block text-xs font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                  Naviera
                </label>
                <select
                  value={selectedNaviera || ''}
                  onChange={(e) => setSelectedNaviera(e.target.value || null)}
                  className={`w-full px-3 py-2 text-sm border ${theme === 'dark'
                    ? 'border-slate-700 bg-slate-800 text-white'
                    : 'border-gray-300 bg-white text-gray-900'
                    }`}
                >
                  <option value="">Todas las navieras</option>
                  {filterOptions.navieras.map((naviera) => (
                    <option key={naviera} value={naviera}>
                      {naviera}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro de Nave */}
              <div>
                <label className={`block text-xs font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                  Nave
                </label>
                <select
                  value={filterNave || ''}
                  onChange={(e) => setFilterNave(e.target.value || null)}
                  className={`w-full px-3 py-2 text-sm border ${theme === 'dark'
                    ? 'border-slate-700 bg-slate-800 text-white'
                    : 'border-gray-300 bg-white text-gray-900'
                    }`}
                >
                  <option value="">Todas las naves</option>
                  {filterOptions.naves.map((nave) => (
                    <option key={nave} value={nave}>
                      {nave}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro de Especie */}
              <div>
                <label className={`block text-xs font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                  Especie
                </label>
                <select
                  value={selectedEspecie || ''}
                  onChange={(e) => setSelectedEspecie(e.target.value || null)}
                  className={`w-full px-3 py-2 text-sm border ${theme === 'dark'
                    ? 'border-slate-700 bg-slate-800 text-white'
                    : 'border-gray-300 bg-white text-gray-900'
                    }`}
                >
                  <option value="">Todas las especies</option>
                  {filterOptions.especies.map((especie) => (
                    <option key={especie} value={especie}>
                      {especie}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Modales */}
      {selectedBooking && (
        <>
          <InstructivoEmbarqueModal
            isOpen={showInstructivoModal}
            onClose={handleCloseInstructivoModal}
            contenedor={selectedContenedor?.contenedor}
            registro={selectedBooking.registro}
          />
          {selectedContenedor && (
            <FacturaProformaModal
              isOpen={showProformaModal}
              onClose={handleCloseProformaModal}
              contenedor={selectedContenedor.contenedor}
              registro={selectedContenedor.registro}
            />
          )}
        </>
      )}

      {/* Modal de Perfil */}
      {showProfileModal && userInfo && (
        <UserProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          userInfo={userInfo}
          onUserUpdate={(updatedUser) => {
            setUserInfo(updatedUser);
            if (currentUser) {
              setCurrentUser({ ...currentUser, ...updatedUser });
            }
          }}
        />
      )}
    </div>
  );
}
