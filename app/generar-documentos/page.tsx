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
import { SimpleFacturaProformaModal } from '@/components/documentos/SimpleFacturaProformaModal';
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
  const [showFullEditor, setShowFullEditor] = useState(false);
  const [expandedNaves, setExpandedNaves] = useState<Set<string>>(new Set());
  const [expandedBookings, setExpandedBookings] = useState<Set<string>>(new Set());
  
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

  const toggleNave = (naveName: string) => {
    setExpandedNaves(prev => {
      const newSet = new Set(prev);
      if (newSet.has(naveName)) {
        newSet.delete(naveName);
      } else {
        newSet.add(naveName);
      }
      return newSet;
    });
  };

  const toggleBooking = (bookingName: string) => {
    setExpandedBookings(prev => {
      const newSet = new Set(prev);
      if (newSet.has(bookingName)) {
        newSet.delete(bookingName);
      } else {
        newSet.add(bookingName);
      }
      return newSet;
    });
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
    <div className={`flex h-screen overflow-hidden ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-gray-50 text-gray-900'}`}>
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
        <header className={`p-4 border-b ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => isSidebarCollapsed ? setIsSidebarCollapsed(false) : setIsMobileMenuOpen(true)}
                className={`p-2 border transition-colors rounded-lg ${theme === 'dark'
                  ? 'hover:bg-slate-700 border-slate-700 text-slate-400'
                  : 'hover:bg-gray-100 border-gray-300 text-gray-500'
                  } ${!isSidebarCollapsed && 'lg:hidden'}`}
              >
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Generar Documentos
                </h1>
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                  Selecciona nave → booking → contenedor paso a paso
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors border ${showFilters
                  ? theme === 'dark'
                    ? 'bg-sky-600 text-white hover:bg-sky-500 border-sky-500'
                    : 'bg-blue-600 text-white hover:bg-blue-500 border-blue-500'
                  : theme === 'dark'
                    ? 'border-slate-700 text-slate-100 hover:border-sky-500 hover:text-sky-200 hover:bg-slate-700 bg-slate-800'
                    : 'border-gray-300 text-gray-900 hover:border-blue-500 hover:text-blue-700 hover:bg-gray-100 bg-white'
                  }`}
              >
                <Filter className="h-4 w-4" />
                Filtros
                {hasActiveFilters && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${showFilters
                    ? 'bg-white/20'
                    : theme === 'dark'
                      ? 'bg-sky-500/30'
                      : 'bg-blue-500/20'
                    }`}>
                    {selectedClientes.length + (selectedNaviera ? 1 : 0) + (filterNave ? 1 : 0) + (selectedEspecie ? 1 : 0)}
                  </span>
                )}
              </button>
              
              <button
                type="button"
                onClick={() => setShowProfileModal(true)}
                className={`hidden sm:flex items-center gap-2 border rounded-lg px-4 py-2 transition ${theme === 'dark'
                  ? 'border-slate-700 bg-slate-800 text-slate-200 hover:border-sky-500 hover:text-sky-200'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-blue-500 hover:text-blue-700'
                  }`}
                title={currentUser?.nombre || user?.user_metadata?.full_name || user?.email || 'Usuario'}
              >
                <UserIcon className="h-4 w-4" />
                <span className="max-w-[160px] truncate font-medium text-sm">
                  {currentUser?.nombre || user?.user_metadata?.full_name || user?.email || 'Usuario'}
                </span>
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden relative">
          {/* Panel Principal - Lista Vertical */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Búsqueda */}
            <div className={`p-4 border-b ${theme === 'dark' ? 'border-slate-700' : 'border-gray-200'}`}>
              <div className="relative max-w-2xl">
                <Search className={`absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`} />
                <input
                  type="text"
                  placeholder="Buscar nave, booking, contenedor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-12 pr-4 py-3 border rounded-lg text-sm ${theme === 'dark'
                    ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                    }`}
                />
              </div>
            </div>

            {/* Lista de Naves - Expandible */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="max-w-4xl mx-auto space-y-3">
                {filteredNaves.length === 0 ? (
                  <div className="text-center py-12">
                    <Anchor className={`h-16 w-16 mx-auto mb-4 ${theme === 'dark' ? 'text-slate-600' : 'text-gray-300'}`} />
                    <p className={`text-lg font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                      {searchTerm ? 'No se encontraron naves' : 'No hay naves disponibles'}
                    </p>
                  </div>
                ) : (
                  filteredNaves.map((nave) => (
                    <div
                      key={nave.nave}
                      className={`border rounded-lg overflow-hidden ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}
                    >
                      {/* Header de Nave */}
                      <button
                        onClick={() => toggleNave(nave.nave)}
                        className={`w-full p-4 flex items-center justify-between hover:bg-opacity-50 transition-colors ${
                          expandedNaves.has(nave.nave)
                            ? theme === 'dark'
                              ? 'bg-sky-900/20'
                              : 'bg-blue-50'
                            : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Anchor className={`h-6 w-6 ${theme === 'dark' ? 'text-sky-400' : 'text-blue-600'}`} />
                          <div className="text-left">
                            <p className={`font-bold text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                              {nave.nave}
                            </p>
                            <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                              {nave.naveCompleta}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-sm px-3 py-1 rounded-full ${theme === 'dark' ? 'bg-slate-700 text-slate-300' : 'bg-gray-200 text-gray-700'}`}>
                            {nave.bookings.length} {nave.bookings.length === 1 ? 'reserva' : 'reservas'}
                          </span>
                          {expandedNaves.has(nave.nave) ? (
                            <ChevronDown className={`h-5 w-5 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`} />
                          ) : (
                            <ChevronRight className={`h-5 w-5 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`} />
                          )}
                        </div>
                      </button>

                      {/* Lista de Bookings */}
                      {expandedNaves.has(nave.nave) && (
                        <div className={`border-t ${theme === 'dark' ? 'border-slate-700 bg-slate-900/50' : 'border-gray-200 bg-gray-50'}`}>
                          {nave.bookings.map((booking) => {
                            const hasInstructivo = existingDocs[booking.booking]?.instructivo;
                            const hasProforma = existingDocs[booking.booking]?.proforma;

                            return (
                              <div
                                key={booking.booking}
                                className={`border-b last:border-b-0 ${theme === 'dark' ? 'border-slate-700' : 'border-gray-200'}`}
                              >
                                {/* Header de Booking */}
                                <button
                                  onClick={() => toggleBooking(booking.booking)}
                                  className={`w-full p-4 pl-12 flex items-center justify-between hover:bg-opacity-50 transition-colors ${
                                    expandedBookings.has(booking.booking)
                                      ? theme === 'dark'
                                        ? 'bg-slate-800'
                                        : 'bg-white'
                                      : ''
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <FileText className={`h-5 w-5 ${theme === 'dark' ? 'text-violet-400' : 'text-violet-600'}`} />
                                    <div className="text-left">
                                      <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                        {booking.booking}
                                      </p>
                                      <div className="flex gap-2 mt-1">
                                        {booking.refAsli && (
                                          <span className={`text-xs px-2 py-0.5 rounded ${theme === 'dark' ? 'bg-slate-700 text-slate-300' : 'bg-gray-200 text-gray-700'}`}>
                                            ASLI: {booking.refAsli}
                                          </span>
                                        )}
                                        {booking.refCliente && (
                                          <span className={`text-xs px-2 py-0.5 rounded ${theme === 'dark' ? 'bg-slate-700 text-slate-300' : 'bg-gray-200 text-gray-700'}`}>
                                            Cliente: {booking.refCliente}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className={`text-xs px-2 py-1 rounded ${theme === 'dark' ? 'bg-slate-700 text-slate-300' : 'bg-gray-200 text-gray-700'}`}>
                                      {booking.contenedores.length} {booking.contenedores.length === 1 ? 'contenedor' : 'contenedores'}
                                    </span>
                                    {expandedBookings.has(booking.booking) ? (
                                      <ChevronDown className={`h-4 w-4 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`} />
                                    ) : (
                                      <ChevronRight className={`h-4 w-4 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`} />
                                    )}
                                  </div>
                                </button>

                                {/* Acciones y Contenedores */}
                                {expandedBookings.has(booking.booking) && (
                                  <div className={`p-4 pl-16 space-y-3 ${theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50'}`}>
                                    {/* Botón Instructivo */}
                                    <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                            Instructivo de Embarque
                                          </p>
                                          <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                                            Documento para coordinación de transporte
                                          </p>
                                        </div>
                                        <button
                                          onClick={() => handleGenerarInstructivo(booking)}
                                          disabled={hasInstructivo}
                                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                                            hasInstructivo
                                              ? theme === 'dark'
                                                ? 'bg-green-900/30 text-green-400 border border-green-700'
                                                : 'bg-green-50 text-green-700 border border-green-200'
                                              : theme === 'dark'
                                                ? 'bg-sky-600 text-white hover:bg-sky-500'
                                                : 'bg-blue-600 text-white hover:bg-blue-500'
                                          }`}
                                        >
                                          {hasInstructivo ? (
                                            <>
                                              <CheckCircle2 className="h-4 w-4" />
                                              Ya existe
                                            </>
                                          ) : (
                                            <>
                                              <Receipt className="h-4 w-4" />
                                              Generar
                                            </>
                                          )}
                                        </button>
                                      </div>
                                    </div>

                                    {/* Lista de Contenedores */}
                                    <div className="space-y-2">
                                      <p className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                                        Contenedores ({booking.contenedores.length})
                                      </p>
                                      {booking.contenedores.map((contenedor) => (
                                        <div
                                          key={contenedor.contenedor}
                                          className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}
                                        >
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                              <Package className={`h-5 w-5 ${theme === 'dark' ? 'text-orange-400' : 'text-orange-600'}`} />
                                              <p className={`font-mono font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                                {contenedor.contenedor}
                                              </p>
                                            </div>
                                            <button
                                              onClick={() => handleGenerarProforma(contenedor, booking)}
                                              disabled={hasProforma}
                                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                                                hasProforma
                                                  ? theme === 'dark'
                                                    ? 'bg-green-900/30 text-green-400 border border-green-700'
                                                    : 'bg-green-50 text-green-700 border border-green-200'
                                                  : theme === 'dark'
                                                    ? 'bg-violet-600 text-white hover:bg-violet-500'
                                                    : 'bg-violet-600 text-white hover:bg-violet-500'
                                              }`}
                                            >
                                              {hasProforma ? (
                                                <>
                                                  <CheckCircle2 className="h-4 w-4" />
                                                  Proforma existe
                                                </>
                                              ) : (
                                                <>
                                                  <Receipt className="h-4 w-4" />
                                                  Generar Proforma
                                                </>
                                              )}
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))
                )}
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
                theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
              }`}>
                <div className="p-4 border-b ${theme === 'dark' ? 'border-slate-700' : 'border-gray-200'}">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Filtros</h3>
                    {hasActiveFilters && (
                      <button
                        onClick={handleClearFilters}
                        className={`text-xs px-2 py-1 rounded ${theme === 'dark'
                          ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                      >
                        Limpiar
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-4 space-y-4">
                  {/* Filtro de Clientes */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                      Clientes
                    </label>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {filterOptions.clientes.map((cliente) => (
                        <label key={cliente} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedClientes.includes(cliente)}
                            onChange={() => handleToggleCliente(cliente)}
                            className="rounded"
                          />
                          <span className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                            {cliente}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Filtro de Naviera */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                      Naviera
                    </label>
                    <select
                      value={selectedNaviera || ''}
                      onChange={(e) => setSelectedNaviera(e.target.value || null)}
                      className={`w-full px-3 py-2 border rounded-lg text-sm ${theme === 'dark'
                        ? 'bg-slate-700 border-slate-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                        }`}
                    >
                      <option value="">Todas</option>
                      {filterOptions.navieras.map((naviera) => (
                        <option key={naviera} value={naviera}>{naviera}</option>
                      ))}
                    </select>
                  </div>

                  {/* Filtro de Nave */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                      Nave
                    </label>
                    <select
                      value={filterNave || ''}
                      onChange={(e) => setFilterNave(e.target.value || null)}
                      className={`w-full px-3 py-2 border rounded-lg text-sm ${theme === 'dark'
                        ? 'bg-slate-700 border-slate-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                        }`}
                    >
                      <option value="">Todas</option>
                      {filterOptions.naves.map((nave) => (
                        <option key={nave} value={nave}>{nave}</option>
                      ))}
                    </select>
                  </div>

                  {/* Filtro de Especie */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                      Especie
                    </label>
                    <select
                      value={selectedEspecie || ''}
                      onChange={(e) => setSelectedEspecie(e.target.value || null)}
                      className={`w-full px-3 py-2 border rounded-lg text-sm ${theme === 'dark'
                        ? 'bg-slate-700 border-slate-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                        }`}
                    >
                      <option value="">Todas</option>
                      {filterOptions.especies.map((especie) => (
                        <option key={especie} value={especie}>{especie}</option>
                      ))}
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
        <SimpleFacturaProformaModal
          isOpen={showProformaModal}
          onClose={handleCloseProformaModal}
          registro={selectedContenedor.registro}
          onOpenFullEditor={() => setShowFullEditor(true)}
        />
      )}

      {showFullEditor && selectedContenedor && (
        <FacturaCreator
          registro={selectedContenedor.registro}
          isOpen={showFullEditor}
          onClose={() => setShowFullEditor(false)}
          onSave={() => setShowFullEditor(false)}
          mode="proforma"
          onGenerateProforma={handleGenerateProformaFromEditor}
        />
      )}
    </div>
  );
}
