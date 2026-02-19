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
  User as UserIcon,
  FileCheck,
  Search,
  Filter,
  CheckCircle2,
  Anchor,
  Package,
  Receipt,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { SidebarSection } from '@/types/layout';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { InstructivoEmbarqueModal } from '@/components/documentos/InstructivoEmbarqueModal';
import { FacturaCreator } from '@/components/facturas/FacturaCreator';
import { Factura } from '@/types/factura';
import { generarProformaCompleta, subirProforma } from '@/lib/proforma-generator';

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
  naveCompleta: string;
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

  // Verificar si es superadmin (Hans o Rodrigo)
  const isSuperAdmin = useMemo(() => {
    const email = (currentUser?.email || '').toLowerCase();
    if (!email) {
      console.log('⚠️ No se encontró email del usuario en generar-documentos:', { currentUser: currentUser?.email });
      return false;
    }
    const isSuperAdmin = email === 'rodrigo.caceres@asli.cl' || email === 'hans.vasquez@asli.cl';
    console.log('🔍 Verificando superadmin en generar-documentos:', { email, isSuperAdmin });
    return isSuperAdmin;
  }, [currentUser]);
  
  const isRodrigo = currentUser?.email?.toLowerCase() === 'rodrigo.caceres@asli.cl';

  // Redirigir clientes al dashboard
  useEffect(() => {
    if (currentUser && currentUser.rol === 'cliente') {
      router.push('/dashboard');
    }
  }, [currentUser, router]);

  // Cargar registros
  useEffect(() => {
    const loadRegistros = async () => {
      try {
        setLoading(true);
        const supabase = createClient();
        const { data: sessionData } = await supabase.auth.getSession();
        
        if (sessionData?.session?.user) {
          setUser(sessionData.session.user);
        }

        const { data, error } = await supabase.from('registros').select('*').order('ingresado', { ascending: false });

        if (error) throw error;

        const convertedData = data.map(convertSupabaseToApp);
        setRegistros(convertedData);
      } catch (error) {
        console.error('Error cargando registros:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRegistros();
  }, []);

  // Verificar documentos existentes para el booking seleccionado
  useEffect(() => {
    if (!selectedBooking) return;

    const checkExistingDocuments = async () => {
      try {
        const supabase = createClient();
        const booking = selectedBooking.booking;
        const normalizedBooking = booking.trim().toUpperCase().replace(/\s+/g, '');
        
        const { data: instructivoData } = await supabase.storage
          .from('documentos')
          .list('instructivo-embarque', { limit: 100 });
        
        const hasInstructivo = instructivoData?.some(file => {
          const separatorIndex = file.name.indexOf('__');
          if (separatorIndex === -1) return false;
          const fileBooking = decodeURIComponent(file.name.slice(0, separatorIndex)).replace(/\s+/g, '');
          return fileBooking === normalizedBooking;
        }) || false;
        
        const { data: proformaData } = await supabase.storage
          .from('documentos')
          .list('factura-proforma', { limit: 100 });
        
        const hasProforma = proformaData?.some(file => {
          const separatorIndex = file.name.indexOf('__');
          if (separatorIndex === -1) return false;
          const fileBooking = decodeURIComponent(file.name.slice(0, separatorIndex)).replace(/\s+/g, '');
          return fileBooking === normalizedBooking;
        }) || false;
        
        setExistingDocs(prev => ({
          ...prev,
          [booking]: {
            instructivo: hasInstructivo,
            proforma: hasProforma,
          }
        }));
      } catch (error) {
        console.error('Error verificando documentos existentes:', error);
      }
    };
    
    checkExistingDocuments();
  }, [selectedBooking]);

  // Verificar TODOS los documentos existentes cuando se cargan los registros
  useEffect(() => {
    if (registros.length === 0) return;

    const checkAllExistingDocuments = async () => {
      try {
        const supabase = createClient();
        
        // Obtener todos los archivos de instructivos y proformas
        const { data: instructivoData } = await supabase.storage
          .from('documentos')
          .list('instructivo-embarque', { limit: 1000 });
        
        const { data: proformaData } = await supabase.storage
          .from('documentos')
          .list('factura-proforma', { limit: 1000 });

        // Crear un mapa de bookings únicos de los registros
        const bookingsMap = new Map<string, boolean>();
        registros.forEach(registro => {
          const booking = registro.booking?.trim();
          if (booking) {
            bookingsMap.set(booking, true);
          }
        });

        // Verificar cada booking
        const newExistingDocs: {[booking: string]: {instructivo: boolean, proforma: boolean}} = {};
        
        bookingsMap.forEach((_, booking) => {
          const normalizedBooking = booking.trim().toUpperCase().replace(/\s+/g, '');
          
          const hasInstructivo = instructivoData?.some(file => {
            const separatorIndex = file.name.indexOf('__');
            if (separatorIndex === -1) return false;
            const fileBooking = decodeURIComponent(file.name.slice(0, separatorIndex)).replace(/\s+/g, '');
            return fileBooking === normalizedBooking;
          }) || false;
          
          const hasProforma = proformaData?.some(file => {
            const separatorIndex = file.name.indexOf('__');
            if (separatorIndex === -1) return false;
            const fileBooking = decodeURIComponent(file.name.slice(0, separatorIndex)).replace(/\s+/g, '');
            return fileBooking === normalizedBooking;
          }) || false;
          
          newExistingDocs[booking] = {
            instructivo: hasInstructivo,
            proforma: hasProforma,
          };
        });
        
        setExistingDocs(newExistingDocs);
      } catch (error) {
        console.error('Error verificando todos los documentos existentes:', error);
      }
    };
    
    checkAllExistingDocuments();
  }, [registros]);

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

      if (!navesMap.has(naveName)) {
        navesMap.set(naveName, {
          nave: naveName,
          naveCompleta: naveInicial,
          bookings: [],
        });
      }

      const naveInfo = navesMap.get(naveName)!;
      
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

  const handleSelectNave = (nave: NaveInfo) => {
    setSelectedNave(prev => (prev?.nave === nave.nave ? null : nave));
    setSelectedBooking(null);
  };

  const handleSelectBooking = (booking: BookingInfo) => {
    setSelectedBooking(prev => (prev?.booking === booking.booking ? null : booking));
  };

  const handleGenerarInstructivo = (booking: BookingInfo) => {
    setSelectedBooking(booking);
    setShowInstructivoModal(true);
  };

  const handleGenerarProforma = (contenedor: ContenedorInfo, booking: BookingInfo) => {
    setSelectedBooking(booking);
    setSelectedContenedor(contenedor);
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
          
          const { data: instructivoData } = await supabase.storage
            .from('documentos')
            .list('instructivo-embarque', { limit: 100 });
          
          const hasInstructivo = instructivoData?.some(file => {
            const separatorIndex = file.name.indexOf('__');
            if (separatorIndex === -1) return false;
            const fileBooking = decodeURIComponent(file.name.slice(0, separatorIndex)).replace(/\s+/g, '');
            return fileBooking === normalizedBooking;
          }) || false;
          
          const { data: proformaData } = await supabase.storage
            .from('documentos')
            .list('factura-proforma', { limit: 100 });
          
          const hasProforma = proformaData?.some(file => {
            const separatorIndex = file.name.indexOf('__');
            if (separatorIndex === -1) return false;
            const fileBooking = decodeURIComponent(file.name.slice(0, separatorIndex)).replace(/\s+/g, '');
            return fileBooking === normalizedBooking;
          }) || false;
          
          setExistingDocs(prev => ({
            ...prev,
            [booking]: {
              instructivo: hasInstructivo,
              proforma: hasProforma,
            }
          }));
        } catch (error) {
          console.error('Error verificando documentos existentes:', error);
        }
      };
      
      checkExistingDocuments();
    }
  };

  const handleCloseProformaModal = () => {
    setShowProformaModal(false);
    if (selectedBooking) {
      const checkExistingDocuments = async () => {
        try {
          const supabase = createClient();
          const booking = selectedBooking.booking;
          const normalizedBooking = booking.trim().toUpperCase().replace(/\s+/g, '');
          
          const { data: instructivoData } = await supabase.storage
            .from('documentos')
            .list('instructivo-embarque', { limit: 100 });
          
          const hasInstructivo = instructivoData?.some(file => {
            const separatorIndex = file.name.indexOf('__');
            if (separatorIndex === -1) return false;
            const fileBooking = decodeURIComponent(file.name.slice(0, separatorIndex)).replace(/\s+/g, '');
            return fileBooking === normalizedBooking;
          }) || false;
          
          const { data: proformaData } = await supabase.storage
            .from('documentos')
            .list('factura-proforma', { limit: 100 });
          
          const hasProforma = proformaData?.some(file => {
            const separatorIndex = file.name.indexOf('__');
            if (separatorIndex === -1) return false;
            const fileBooking = decodeURIComponent(file.name.slice(0, separatorIndex)).replace(/\s+/g, '');
            return fileBooking === normalizedBooking;
          }) || false;
          
          setExistingDocs(prev => ({
            ...prev,
            [booking]: {
              instructivo: hasInstructivo,
              proforma: hasProforma,
            }
          }));
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

  // Handler para generar proforma desde el editor completo
  const handleGenerateProformaFromEditor = async (factura: Factura, plantillaId?: string) => {
    if (!selectedContenedor) {
      throw new Error('No se seleccionó un contenedor.');
    }

    const booking = selectedContenedor.registro.booking?.trim().toUpperCase().replace(/\s+/g, '');
    if (!booking) {
      throw new Error('El booking es obligatorio.');
    }

    const contenedor = selectedContenedor.contenedor || '';

    // Generar proforma con plantilla
    const result = await generarProformaCompleta({
      factura,
      plantillaId,
      contenedor,
    });

    // Subir archivos
    await subirProforma(
      booking,
      contenedor,
      result.pdfBlob,
      result.pdfFileName,
      result.excelBlob,
      result.excelFileName
    );

    const mensaje = result.plantillaUsada
      ? `✨ Proforma generada con plantilla "${result.plantillaUsada.nombre}"`
      : '📄 Proforma generada con formato tradicional';
    
    alert(mensaje);
    
    // Recargar documentos existentes
    handleCloseProformaModal();
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
    <div className={`flex h-screen overflow-hidden ${theme === 'dark' ? 'bg-[#202020] text-[#E0E0E0]' : 'bg-[#F5F5F5] text-[#323130]'}`}>
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
        {/* Header - Estilo itinerarios */}
        <header className={`sticky top-0 z-30 border-b backdrop-blur-sm ${theme === 'dark'
          ? 'border-[#3D3D3D] bg-[#2D2D2D]/95'
          : 'border-[#E1E1E1] bg-[#FFFFFF]/95'
        }`}>
          <div className="w-full px-3 py-2.5 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <button
                onClick={() => isSidebarCollapsed ? setIsSidebarCollapsed(false) : setIsMobileMenuOpen(true)}
                className={`p-2 border transition-colors ${theme === 'dark'
                  ? 'border-[#3D3D3D] bg-[#2D2D2D] text-[#C0C0C0] hover:bg-[#3D3D3D]'
                  : 'border-[#E1E1E1] bg-white text-[#323130] hover:bg-[#F3F3F3]'
                } ${!isSidebarCollapsed && 'lg:hidden'}`}
                style={{ borderRadius: '4px' }}
              >
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <h1 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-[#1F1F1F]'}`}>
                  Generar Documentos
                </h1>
                <p className={`text-xs ${theme === 'dark' ? 'text-[#A0A0A0]' : 'text-[#6B6B6B]'}`}>
                  Nave → booking → contenedor
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border transition-colors ${showFilters
                  ? theme === 'dark'
                    ? 'border-[#00AEEF] bg-[#00AEEF]/20 text-[#00AEEF]'
                    : 'border-[#00AEEF] bg-[#00AEEF]/10 text-[#0078D4]'
                  : theme === 'dark'
                    ? 'border-[#3D3D3D] bg-[#2D2D2D] text-[#C0C0C0] hover:bg-[#3D3D3D]'
                    : 'border-[#E1E1E1] bg-white text-[#323130] hover:bg-[#F3F3F3]'
                }`}
                style={{ borderRadius: '4px' }}
              >
                <Filter className="h-4 w-4" />
                Filtros
                {hasActiveFilters && (
                  <span className="text-xs px-1.5 py-0.5 bg-white/20 rounded">
                    {selectedClientes.length + (selectedNaviera ? 1 : 0) + (filterNave ? 1 : 0) + (selectedEspecie ? 1 : 0)}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowProfileModal(true)}
                className={`hidden sm:flex items-center gap-2 border px-3 py-1.5 text-xs font-medium transition-colors ${theme === 'dark'
                  ? 'border-[#3D3D3D] bg-[#2D2D2D] text-[#C0C0C0] hover:bg-[#3D3D3D]'
                  : 'border-[#E1E1E1] bg-white text-[#323130] hover:bg-[#F3F3F3]'
                }`}
                style={{ borderRadius: '4px' }}
                title={currentUser?.nombre || user?.user_metadata?.full_name || user?.email || 'Usuario'}
              >
                <UserIcon className="h-4 w-4" />
                <span className="max-w-[160px] truncate">{currentUser?.nombre || user?.user_metadata?.full_name || user?.email || 'Usuario'}</span>
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden relative">
          {/* Panel Principal - Lista Vertical */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Búsqueda */}
            <div className={`flex-shrink-0 p-3 border-b ${theme === 'dark' ? 'border-[#3D3D3D] bg-[#2D2D2D]' : 'border-[#E1E1E1] bg-white'}`}>
              <div className="relative w-full">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none ${theme === 'dark' ? 'text-[#A0A0A0]' : 'text-[#6B6B6B]'}`} />
                <input
                  type="text"
                  placeholder="Buscar nave, booking, contenedor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-10 pr-3 py-2 border text-sm focus:outline-none focus:ring-1 ${theme === 'dark'
                    ? 'bg-[#1F1F1F] border-[#3D3D3D] text-white placeholder-[#6B6B6B] focus:border-[#00AEEF] focus:ring-[#00AEEF]/30'
                    : 'bg-white border-[#E1E1E1] text-[#323130] placeholder-[#6B6B6B] focus:border-[#00AEEF] focus:ring-[#00AEEF]/20'
                  }`}
                  style={{ borderRadius: '4px' }}
                />
              </div>
            </div>

            {/* Layout 3 columnas: Naves | Bookings | Contenedores/Acciones */}
            <div className={`flex-1 flex min-h-0 overflow-x-auto ${theme === 'dark' ? 'bg-[#202020]' : 'bg-[#F5F5F5]'}`}>
              {/* Columna 1: Naves */}
              <div className={`flex-1 min-w-[200px] flex flex-col border-r overflow-hidden ${theme === 'dark' ? 'border-[#3D3D3D]' : 'border-[#E1E1E1]'}`}>
                <div className={`flex-shrink-0 px-3 py-2 border-b ${theme === 'dark' ? 'border-[#3D3D3D] bg-[#2D2D2D]' : 'border-[#E1E1E1] bg-white'}`}>
                  <h3 className={`text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-[#A0A0A0]' : 'text-[#6B6B6B]'}`}>
                    Naves
                  </h3>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {filteredNaves.length === 0 ? (
                    <div className={`text-center py-8 px-3 border ${theme === 'dark' ? 'border-[#3D3D3D] bg-[#2D2D2D]' : 'border-[#E1E1E1] bg-white'}`} style={{ borderRadius: '4px' }}>
                      <Anchor className={`h-8 w-8 mx-auto mb-2 block ${theme === 'dark' ? 'text-[#6B6B6B]' : 'text-[#C0C0C0]'}`} />
                      <p className={`text-xs font-medium ${theme === 'dark' ? 'text-[#A0A0A0]' : 'text-[#6B6B6B]'}`}>
                        {searchTerm ? 'No hay resultados' : 'No hay naves'}
                      </p>
                    </div>
                  ) : (
                    filteredNaves.map((nave) => (
                      <button
                        key={nave.nave}
                        type="button"
                        onClick={() => handleSelectNave(nave)}
                        className={`w-full p-2.5 flex items-center justify-between text-left border ${theme === 'dark'
                          ? selectedNave?.nave === nave.nave
                            ? 'bg-[#00AEEF]/15 border-[#00AEEF]'
                            : 'border-[#3D3D3D] bg-[#2D2D2D] hover:border-[#00AEEF]/50'
                          : selectedNave?.nave === nave.nave
                            ? 'bg-[#00AEEF]/10 border-[#00AEEF]'
                            : 'border-[#E1E1E1] bg-white hover:border-[#00AEEF]/50'
                        }`}
                        style={{ borderRadius: '4px' }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`flex-shrink-0 flex h-8 w-8 items-center justify-center ${theme === 'dark' ? 'bg-[#00AEEF]/20' : 'bg-[#00AEEF]/10'}`} style={{ borderRadius: '4px' }}>
                            <Anchor className={`h-4 w-4 ${theme === 'dark' ? 'text-[#00AEEF]' : 'text-[#0078D4]'}`} />
                          </div>
                          <div className="min-w-0 text-left">
                            <p className={`font-semibold text-sm truncate ${theme === 'dark' ? 'text-white' : 'text-[#1F1F1F]'}`}>{nave.nave}</p>
                            <p className={`text-xs truncate ${theme === 'dark' ? 'text-[#A0A0A0]' : 'text-[#6B6B6B]'}`}>{nave.bookings.length} reservas</p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Columna 2: Bookings de la nave seleccionada */}
              <div className={`flex-1 min-w-[200px] flex flex-col border-r overflow-hidden ${theme === 'dark' ? 'border-[#3D3D3D]' : 'border-[#E1E1E1]'}`}>
                <div className={`flex-shrink-0 px-3 py-2 border-b ${theme === 'dark' ? 'border-[#3D3D3D] bg-[#2D2D2D]' : 'border-[#E1E1E1] bg-white'}`}>
                  <h3 className={`text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-[#A0A0A0]' : 'text-[#6B6B6B]'}`}>
                    Bookings
                  </h3>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {!selectedNave ? (
                    <div className={`text-center py-8 px-3 border ${theme === 'dark' ? 'border-[#3D3D3D] bg-[#2D2D2D]' : 'border-[#E1E1E1] bg-white'}`} style={{ borderRadius: '4px' }}>
                      <FileText className={`h-8 w-8 mx-auto mb-2 block ${theme === 'dark' ? 'text-[#6B6B6B]' : 'text-[#C0C0C0]'}`} />
                      <p className={`text-xs font-medium ${theme === 'dark' ? 'text-[#A0A0A0]' : 'text-[#6B6B6B]'}`}>Selecciona una nave</p>
                    </div>
                  ) : selectedNave.bookings.length === 0 ? (
                    <div className={`text-center py-8 px-3 border ${theme === 'dark' ? 'border-[#3D3D3D] bg-[#2D2D2D]' : 'border-[#E1E1E1] bg-white'}`} style={{ borderRadius: '4px' }}>
                      <p className={`text-xs font-medium ${theme === 'dark' ? 'text-[#A0A0A0]' : 'text-[#6B6B6B]'}`}>Sin bookings</p>
                    </div>
                  ) : (
                    selectedNave.bookings.map((booking) => {
                      const hasInstructivo = existingDocs[booking.booking]?.instructivo;
                      const isSelected = selectedBooking?.booking === booking.booking;
                      return (
                        <button
                          key={booking.booking}
                          type="button"
                          onClick={() => handleSelectBooking(booking)}
                          className={`w-full p-2.5 flex items-center justify-between text-left border ${theme === 'dark'
                            ? isSelected ? 'bg-[#00AEEF]/15 border-[#00AEEF]' : 'border-[#3D3D3D] bg-[#2D2D2D] hover:border-[#00AEEF]/50'
                            : isSelected ? 'bg-[#00AEEF]/10 border-[#00AEEF]' : 'border-[#E1E1E1] bg-white hover:border-[#00AEEF]/50'
                          }`}
                          style={{ borderRadius: '4px' }}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={`flex-shrink-0 flex h-8 w-8 items-center justify-center ${theme === 'dark' ? 'bg-[#00AEEF]/20' : 'bg-[#00AEEF]/10'}`} style={{ borderRadius: '4px' }}>
                              <FileText className={`h-4 w-4 ${theme === 'dark' ? 'text-[#00AEEF]' : 'text-[#0078D4]'}`} />
                            </div>
                            <div className="min-w-0 text-left">
                              <p className={`font-semibold text-sm truncate ${theme === 'dark' ? 'text-white' : 'text-[#1F1F1F]'}`}>{booking.booking}</p>
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                {booking.refAsli && <span className={`text-[10px] px-1.5 py-0.5 ${theme === 'dark' ? 'bg-[#3D3D3D] text-[#C0C0C0]' : 'bg-[#E1E1E1] text-[#323130]'}`} style={{ borderRadius: '4px' }}>ASLI</span>}
                                {hasInstructivo && <span className={`text-[10px] px-1.5 py-0.5 ${theme === 'dark' ? 'text-[#4EC9B0]' : 'text-[#0D5C2E]'}`}>Instructivo</span>}
                              </div>
                            </div>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 font-medium flex-shrink-0 ${theme === 'dark' ? 'bg-[#3D3D3D] text-[#C0C0C0]' : 'bg-[#E1E1E1] text-[#323130]'}`} style={{ borderRadius: '4px' }}>
                            {booking.contenedores.length} cnt
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Columna 3: Detalle del booking (Instructivo + Contenedores) */}
              <div className={`flex-1 min-w-[240px] flex flex-col overflow-hidden ${theme === 'dark' ? 'bg-[#252525]' : 'bg-[#FAFAFA]'}`}>
                <div className={`flex-shrink-0 px-3 py-2 border-b ${theme === 'dark' ? 'border-[#3D3D3D] bg-[#2D2D2D]' : 'border-[#E1E1E1] bg-white'}`}>
                  <h3 className={`text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-[#A0A0A0]' : 'text-[#6B6B6B]'}`}>
                    Documentos
                  </h3>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {!selectedBooking ? (
                    <div className={`text-center py-12 px-4 border ${theme === 'dark' ? 'border-[#3D3D3D] bg-[#2D2D2D]' : 'border-[#E1E1E1] bg-white'}`} style={{ borderRadius: '4px' }}>
                      <Receipt className={`h-10 w-10 mx-auto mb-3 block ${theme === 'dark' ? 'text-[#6B6B6B]' : 'text-[#C0C0C0]'}`} />
                      <p className={`text-sm font-medium ${theme === 'dark' ? 'text-[#A0A0A0]' : 'text-[#6B6B6B]'}`}>Selecciona un booking</p>
                      <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-[#6B6B6B]' : 'text-[#9B9B9B]'}`}>Instructivo y proformas por contenedor</p>
                    </div>
                  ) : (
                    <>
                      {(() => {
                        const hasInstructivo = existingDocs[selectedBooking.booking]?.instructivo;
                        const hasProforma = existingDocs[selectedBooking.booking]?.proforma;
                        return (
                          <>
                            <div className={`p-3 border ${theme === 'dark' ? 'bg-[#2D2D2D] border-[#3D3D3D]' : 'bg-white border-[#E1E1E1]'}`} style={{ borderRadius: '4px' }}>
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div className="min-w-0">
                                  <p className={`font-medium text-sm ${theme === 'dark' ? 'text-white' : 'text-[#1F1F1F]'}`}>Instructivo de Embarque</p>
                                  <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-[#A0A0A0]' : 'text-[#6B6B6B]'}`}>Documento para coordinación de transporte</p>
                                </div>
                                <button
                                  onClick={() => handleGenerarInstructivo(selectedBooking)}
                                  disabled={hasInstructivo}
                                  className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium border flex-shrink-0 ${
                                    hasInstructivo
                                      ? theme === 'dark' ? 'bg-[#0D5C2E]/30 text-[#4EC9B0] border-[#0D5C2E]' : 'bg-[#D4F4DD] text-[#0D5C2E] border-[#0D5C2E]/40'
                                      : theme === 'dark' ? 'bg-[#00AEEF] text-white border-[#00AEEF] hover:bg-[#0099CC]' : 'bg-[#00AEEF] text-white border-[#00AEEF] hover:bg-[#0099CC]'
                                  }`}
                                  style={{ borderRadius: '4px' }}
                                >
                                  {hasInstructivo ? <><CheckCircle2 className="h-3.5 w-3.5" /> Ya existe</> : <><Receipt className="h-3.5 w-3.5" /> Generar</>}
                                </button>
                              </div>
                            </div>
                            <p className={`text-xs font-medium ${theme === 'dark' ? 'text-[#A0A0A0]' : 'text-[#6B6B6B]'}`}>Contenedores ({selectedBooking.contenedores.length})</p>
                            {selectedBooking.contenedores.map((contenedor) => (
                              <div
                                key={contenedor.contenedor}
                                className={`p-3 border ${theme === 'dark' ? 'bg-[#2D2D2D] border-[#3D3D3D]' : 'bg-white border-[#E1E1E1]'}`}
                                style={{ borderRadius: '4px' }}
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className={`flex-shrink-0 flex h-8 w-8 items-center justify-center ${theme === 'dark' ? 'bg-[#3D3D3D]' : 'bg-[#E1E1E1]'}`} style={{ borderRadius: '4px' }}>
                                      <Package className={`h-4 w-4 ${theme === 'dark' ? 'text-[#C0C0C0]' : 'text-[#323130]'}`} />
                                    </div>
                                    <p className={`font-mono font-semibold text-sm ${theme === 'dark' ? 'text-white' : 'text-[#1F1F1F]'}`}>{contenedor.contenedor}</p>
                                  </div>
                                  <button
                                    onClick={() => {
                                      if (hasProforma) {
                                        window.location.href = `/documentos?booking=${encodeURIComponent(selectedBooking.booking)}`;
                                      } else {
                                        handleGenerarProforma(contenedor, selectedBooking);
                                      }
                                    }}
                                    className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium border flex-shrink-0 ${
                                      hasProforma
                                        ? theme === 'dark' ? 'bg-[#0D5C2E]/30 text-[#4EC9B0] border-[#0D5C2E]' : 'bg-[#D4F4DD] text-[#0D5C2E] border-[#0D5C2E]/40'
                                        : theme === 'dark' ? 'bg-[#00AEEF] text-white border-[#00AEEF] hover:bg-[#0099CC]' : 'bg-[#00AEEF] text-white border-[#00AEEF] hover:bg-[#0099CC]'
                                    }`}
                                    style={{ borderRadius: '4px' }}
                                  >
                                    {hasProforma ? <><CheckCircle2 className="h-3.5 w-3.5" /> Proforma existe</> : <><Receipt className="h-3.5 w-3.5" /> Generar Proforma</>}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </>
                        );
                      })()}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Panel de Filtros */}
          {showFilters && (
            <>
              <div
                className="fixed inset-0 bg-black/50 z-[60] lg:hidden"
                onClick={() => setShowFilters(false)}
              />
              <aside className={`fixed lg:relative top-0 right-0 h-full w-80 flex-shrink-0 border-l overflow-y-auto z-[70] ${
                theme === 'dark' ? 'bg-[#2D2D2D] border-[#3D3D3D]' : 'bg-white border-[#E1E1E1]'
              }`}>
                <div className={`p-3 border-b ${theme === 'dark' ? 'border-[#3D3D3D]' : 'border-[#E1E1E1]'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className={`font-semibold text-xs uppercase tracking-wider ${theme === 'dark' ? 'text-[#C0C0C0]' : 'text-[#323130]'}`}>
                      Filtros
                    </h3>
                    {hasActiveFilters && (
                      <button
                        onClick={handleClearFilters}
                        className={`text-xs font-medium px-2 py-1 border ${theme === 'dark' ? 'border-[#3D3D3D] bg-[#2D2D2D] text-[#C0C0C0] hover:bg-[#3D3D3D]' : 'border-[#E1E1E1] bg-white text-[#323130] hover:bg-[#F3F3F3]'}`}
                        style={{ borderRadius: '4px' }}
                      >
                        Limpiar
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-3 space-y-4">
                  <div>
                    <label className={`block text-xs font-medium mb-1.5 ${theme === 'dark' ? 'text-[#A0A0A0]' : 'text-[#6B6B6B]'}`}>Clientes</label>
                    <div className={`space-y-1 max-h-48 overflow-y-auto p-2 border ${theme === 'dark' ? 'border-[#3D3D3D] bg-[#252525]' : 'border-[#E1E1E1] bg-[#FAFAFA]'}`} style={{ borderRadius: '4px' }}>
                      {filterOptions.clientes.map((cliente) => (
                        <label key={cliente} className={`flex items-center gap-2 cursor-pointer py-1 px-2 ${theme === 'dark' ? 'hover:bg-[#3D3D3D]' : 'hover:bg-[#E1E1E1]'}`} style={{ borderRadius: '4px' }}>
                          <input type="checkbox" checked={selectedClientes.includes(cliente)} onChange={() => handleToggleCliente(cliente)} className="rounded border-[#3D3D3D] text-[#00AEEF] focus:ring-[#00AEEF]" />
                          <span className={`text-sm truncate ${theme === 'dark' ? 'text-[#C0C0C0]' : 'text-[#323130]'}`}>{cliente}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={`block text-xs font-medium mb-1.5 ${theme === 'dark' ? 'text-[#A0A0A0]' : 'text-[#6B6B6B]'}`}>Naviera</label>
                    <select value={selectedNaviera || ''} onChange={(e) => setSelectedNaviera(e.target.value || null)} className={`w-full px-3 py-2 border text-sm focus:outline-none focus:ring-1 ${theme === 'dark' ? 'bg-[#1F1F1F] border-[#3D3D3D] text-white focus:border-[#00AEEF] focus:ring-[#00AEEF]/30' : 'bg-white border-[#E1E1E1] text-[#323130] focus:border-[#00AEEF] focus:ring-[#00AEEF]/20'}`} style={{ borderRadius: '4px' }}>
                      <option value="">Todas</option>
                      {filterOptions.navieras.map((n) => (<option key={n} value={n}>{n}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className={`block text-xs font-medium mb-1.5 ${theme === 'dark' ? 'text-[#A0A0A0]' : 'text-[#6B6B6B]'}`}>Nave</label>
                    <select value={filterNave || ''} onChange={(e) => setFilterNave(e.target.value || null)} className={`w-full px-3 py-2 border text-sm focus:outline-none focus:ring-1 ${theme === 'dark' ? 'bg-[#1F1F1F] border-[#3D3D3D] text-white focus:border-[#00AEEF] focus:ring-[#00AEEF]/30' : 'bg-white border-[#E1E1E1] text-[#323130] focus:border-[#00AEEF] focus:ring-[#00AEEF]/20'}`} style={{ borderRadius: '4px' }}>
                      <option value="">Todas</option>
                      {filterOptions.naves.map((n) => (<option key={n} value={n}>{n}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className={`block text-xs font-medium mb-1.5 ${theme === 'dark' ? 'text-[#A0A0A0]' : 'text-[#6B6B6B]'}`}>Especie</label>
                    <select value={selectedEspecie || ''} onChange={(e) => setSelectedEspecie(e.target.value || null)} className={`w-full px-3 py-2 border text-sm focus:outline-none focus:ring-1 ${theme === 'dark' ? 'bg-[#1F1F1F] border-[#3D3D3D] text-white focus:border-[#00AEEF] focus:ring-[#00AEEF]/30' : 'bg-white border-[#E1E1E1] text-[#323130] focus:border-[#00AEEF] focus:ring-[#00AEEF]/20'}`} style={{ borderRadius: '4px' }}>
                      <option value="">Todas</option>
                      {filterOptions.especies.map((esp) => (<option key={esp} value={esp}>{esp}</option>))}
                    </select>
                  </div>
                </div>
              </aside>
            </>
          )}
        </div>
      </main>

      {/* Modales */}
      {showProfileModal && currentUser && (
        <UserProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          userInfo={currentUser}
          onUserUpdate={setCurrentUser}
        />
      )}

      {showInstructivoModal && selectedBooking && (
        <InstructivoEmbarqueModal
          isOpen={showInstructivoModal}
          onClose={handleCloseInstructivoModal}
          contenedor=""
          registro={selectedBooking.registro}
        />
      )}

      {showProformaModal && selectedContenedor && selectedBooking && (
        <FacturaCreator
          registro={selectedContenedor.registro}
          isOpen={showProformaModal}
          onClose={handleCloseProformaModal}
          onSave={handleCloseProformaModal}
          mode="proforma"
          onGenerateProforma={handleGenerateProformaFromEditor}
        />
      )}
    </div>
  );
}
