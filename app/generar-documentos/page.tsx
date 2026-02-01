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
} from 'lucide-react';
import { SidebarSection } from '@/types/layout';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { InstructivoEmbarqueModal } from '@/components/documentos/InstructivoEmbarqueModal';
import { FacturaProformaModal } from '@/components/documentos/FacturaProformaModal';

interface ContenedorInfo {
  contenedor: string;
  registro: Registro;
}

interface ReferenciaConContenedores {
  refAsli: string;
  refCliente?: string;
  contenedores: ContenedorInfo[];
}

export default function GenerarDocumentosPage() {
  const { theme } = useTheme();
  const { currentUser, registrosCount, transportesCount, setCurrentUser } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRef, setSelectedRef] = useState<ReferenciaConContenedores | null>(null);
  const [selectedContenedor, setSelectedContenedor] = useState<ContenedorInfo | null>(null);
  const [selectedRegistro, setSelectedRegistro] = useState<Registro | null>(null); // Para generar sin contenedor
  const [showInstructivoModal, setShowInstructivoModal] = useState(false);
  const [showProformaModal, setShowProformaModal] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  
  // Estados para filtros
  const [showFilters, setShowFilters] = useState(false);
  const [selectedClientes, setSelectedClientes] = useState<string[]>([]);
  const [selectedNaviera, setSelectedNaviera] = useState<string | null>(null);
  const [selectedNave, setSelectedNave] = useState<string | null>(null);
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

  // Agrupar registros por referencia y extraer contenedores
  const referenciasConContenedores = useMemo(() => {
    const refsMap = new Map<string, ReferenciaConContenedores>();

    registros.forEach(registro => {
      const refAsli = registro.refAsli?.trim();
      if (!refAsli) return;

      // Aplicar filtros
      if (selectedClientes.length > 0) {
        const cliente = registro.shipper?.trim().toUpperCase();
        if (!cliente || !selectedClientes.includes(cliente)) return;
      }
      if (selectedNaviera) {
        const naviera = registro.naviera?.trim().toUpperCase();
        if (!naviera || naviera !== selectedNaviera.toUpperCase()) return;
      }
      if (selectedNave) {
        const naveMatch = registro.naveInicial?.trim().match(/^(.+?)\s*\[/);
        const naveName = naveMatch ? naveMatch[1].trim() : registro.naveInicial?.trim();
        const nave = naveName?.toUpperCase();
        if (!nave || nave !== selectedNave.toUpperCase()) return;
      }
      if (selectedEspecie) {
        const especie = registro.especie?.trim().toUpperCase();
        if (!especie || especie !== selectedEspecie.toUpperCase()) return;
      }

      if (!refsMap.has(refAsli)) {
        refsMap.set(refAsli, {
          refAsli,
          refCliente: registro.refCliente?.trim(),
          contenedores: [],
        });
      }

      const refData = refsMap.get(refAsli)!;
      const contenedores = Array.isArray(registro.contenedor)
        ? registro.contenedor
        : registro.contenedor
          ? [registro.contenedor]
          : [];

      contenedores.forEach(contenedor => {
        const contenedorStr = contenedor?.trim();
        if (contenedorStr && !refData.contenedores.some(c => c.contenedor === contenedorStr)) {
          refData.contenedores.push({
            contenedor: contenedorStr,
            registro,
          });
        }
      });
    });

    return Array.from(refsMap.values()).sort((a, b) => {
      // Ordenar de mayor a menor (descendente)
      // Si son numéricas, ordenar numéricamente
      const aNum = parseInt(a.refAsli);
      const bNum = parseInt(b.refAsli);
      
      if (!isNaN(aNum) && !isNaN(bNum)) {
        // Si ambas son numéricas, ordenar numéricamente
        return bNum - aNum;
      }
      
      // Si no son numéricas o una no lo es, ordenar alfabéticamente descendente
      return b.refAsli.localeCompare(a.refAsli);
    });
  }, [registros, selectedClientes, selectedNaviera, selectedNave, selectedEspecie]);

  // Filtrar referencias por término de búsqueda
  const filteredReferencias = useMemo(() => {
    if (!searchTerm.trim()) return referenciasConContenedores;

    const searchLower = searchTerm.toLowerCase();
    return referenciasConContenedores.filter(ref => 
      ref.refAsli.toLowerCase().includes(searchLower) ||
      ref.refCliente?.toLowerCase().includes(searchLower) ||
      ref.contenedores.some(c => c.contenedor.toLowerCase().includes(searchLower))
    );
  }, [referenciasConContenedores, searchTerm]);

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

  const handleSelectRef = (ref: ReferenciaConContenedores) => {
    setSelectedRef(ref);
    setSelectedContenedor(null);
    // Si la referencia tiene un registro asociado, guardarlo para generar sin contenedor
    if (ref.contenedores.length > 0) {
      setSelectedRegistro(ref.contenedores[0].registro);
    } else {
      // Buscar el registro de esta referencia
      const registro = registros.find(r => r.refAsli === ref.refAsli);
      setSelectedRegistro(registro || null);
    }
  };

  const handleSelectContenedor = (contenedor: ContenedorInfo) => {
    setSelectedContenedor(contenedor);
  };

  const handleGenerarInstructivo = () => {
    // Permitir generar sin contenedor - solo necesita registro
    if (!selectedRegistro) return;
    setShowInstructivoModal(true);
  };

  const handleGenerarProforma = () => {
    // La proforma requiere contenedor
    if (!selectedContenedor) return;
    setShowProformaModal(true);
  };

  const handleClearFilters = () => {
    setSelectedClientes([]);
    setSelectedNaviera(null);
    setSelectedNave(null);
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

  const hasActiveFilters = selectedClientes.length > 0 || selectedNaviera || selectedNave || selectedEspecie;

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

        <div className="flex-1 flex overflow-hidden relative">
          {/* Panel izquierdo - Lista de referencias */}
          <div className={`w-80 flex-shrink-0 flex flex-col border-r overflow-hidden ${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'}`}>
            {/* Búsqueda */}
            <div className={`p-3 border-b ${theme === 'dark' ? 'border-slate-700' : 'border-gray-200'}`}>
              <div className="relative">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`} />
                <input
                  type="text"
                  placeholder="Buscar referencia o contenedor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 border text-sm ${theme === 'dark'
                    ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                    }`}
                />
              </div>
            </div>

            {/* Lista de referencias */}
            <div className="flex-1 overflow-y-auto p-2">
              {filteredReferencias.length === 0 ? (
                <div className="text-center py-10">
                  <p className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`}>
                    {searchTerm ? 'No se encontraron referencias' : 'No hay referencias disponibles'}
                  </p>
                </div>
              ) : (
                filteredReferencias.map((ref) => (
                  <div
                    key={ref.refAsli}
                    className={`mb-2 border cursor-pointer transition-colors ${selectedRef?.refAsli === ref.refAsli
                      ? theme === 'dark'
                        ? 'bg-sky-900/30 border-sky-600'
                        : 'bg-blue-50 border-blue-400'
                      : theme === 'dark'
                        ? 'border-slate-700 hover:bg-slate-800'
                        : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    onClick={() => handleSelectRef(ref)}
                  >
                    <div className="p-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className={`font-semibold text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {ref.refAsli}
                        </p>
                        <span className={`text-xs px-2 py-0.5 ${theme === 'dark' ? 'bg-slate-700 text-slate-300' : 'bg-gray-200 text-gray-700'}`}>
                          {ref.contenedores.length} {ref.contenedores.length === 1 ? 'contenedor' : 'contenedores'}
                        </span>
                      </div>
                      {ref.refCliente && (
                        <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                          Ref Cliente: {ref.refCliente}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Panel central - Contenedores */}
          <div className={`w-80 flex-shrink-0 flex flex-col border-r overflow-hidden ${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'}`}>
            {selectedRef ? (
              <>
                <div className={`p-3 border-b ${theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-gray-50'}`}>
                  <h3 className={`font-semibold text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Contenedores - {selectedRef.refAsli}
                  </h3>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                  {selectedRef.contenedores.length === 0 ? (
                    <div className="text-center py-10">
                      <p className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`}>
                        No hay contenedores para esta referencia
                      </p>
                    </div>
                  ) : (
                    selectedRef.contenedores.map((cont) => (
                      <div
                        key={cont.contenedor}
                        className={`mb-2 border cursor-pointer transition-colors ${selectedContenedor?.contenedor === cont.contenedor
                          ? theme === 'dark'
                            ? 'bg-sky-900/30 border-sky-600'
                            : 'bg-blue-50 border-blue-400'
                          : theme === 'dark'
                            ? 'border-slate-700 hover:bg-slate-800'
                            : 'border-gray-300 hover:bg-gray-50'
                          }`}
                        onClick={() => handleSelectContenedor(cont)}
                      >
                        <div className="p-3">
                          <p className={`font-medium text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {cont.contenedor}
                          </p>
                          <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                            Booking: {cont.registro.booking}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`}>
                  Selecciona una referencia
                </p>
              </div>
            )}
          </div>

          {/* Panel derecho - Acciones */}
          <div className={`flex-1 flex flex-col overflow-hidden transition-all ${showFilters ? 'lg:mr-80' : ''}`}>
            {selectedRef ? (
              <div className="flex-1 p-6">
                <div className="max-w-2xl mx-auto">
                  <div className={`border p-6 ${theme === 'dark' ? 'border-slate-700 bg-slate-900' : 'border-gray-300 bg-white'}`}>
                    <h2 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Generar Documentos
                    </h2>
                    <div className="mb-4">
                      <p className={`text-sm mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                        Referencia: <span className="font-semibold">{selectedRef.refAsli}</span>
                      </p>
                      {selectedContenedor ? (
                        <>
                          <p className={`text-sm mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                            Contenedor: <span className="font-semibold">{selectedContenedor.contenedor}</span>
                          </p>
                          <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                            Booking: <span className="font-semibold">{selectedContenedor.registro.booking}</span>
                          </p>
                        </>
                      ) : (
                        <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                          {selectedRegistro?.booking ? (
                            <>Booking: <span className="font-semibold">{selectedRegistro.booking}</span></>
                          ) : (
                            <span className="text-orange-500">Contenedor pendiente de asignación</span>
                          )}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <button
                        onClick={handleGenerarInstructivo}
                        disabled={!selectedRegistro}
                        className={`flex flex-col items-center justify-center p-6 border transition-colors ${!selectedRegistro
                          ? 'opacity-50 cursor-not-allowed'
                          : theme === 'dark'
                            ? 'border-slate-700 hover:bg-slate-800'
                            : 'border-gray-300 hover:bg-gray-50'
                          }`}
                      >
                        <FileCheck className={`h-12 w-12 mb-3 ${theme === 'dark' ? 'text-sky-400' : 'text-blue-600'}`} />
                        <p className={`font-semibold text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          Instructivo de Embarque
                        </p>
                        <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                          {selectedContenedor ? 'Generar documento de instrucciones' : 'Generar sin contenedor (pendiente)'}
                        </p>
                      </button>

                      <button
                        onClick={handleGenerarProforma}
                        disabled={!selectedContenedor}
                        className={`flex flex-col items-center justify-center p-6 border transition-colors ${!selectedContenedor
                          ? 'opacity-50 cursor-not-allowed'
                          : theme === 'dark'
                            ? 'border-slate-700 hover:bg-slate-800'
                            : 'border-gray-300 hover:bg-gray-50'
                          }`}
                      >
                        <Receipt className={`h-12 w-12 mb-3 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`} />
                        <p className={`font-semibold text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          Factura Proforma
                        </p>
                        <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                          {selectedContenedor ? 'Generar factura proforma' : 'Requiere contenedor'}
                        </p>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <FileText className={`h-16 w-16 mx-auto mb-4 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-400'}`} />
                  <p className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Selecciona una referencia
                  </p>
                  <p className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>
                    Elige una referencia para generar documentos
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
                  value={selectedNave || ''}
                  onChange={(e) => setSelectedNave(e.target.value || null)}
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
      {selectedRegistro && (
        <>
          <InstructivoEmbarqueModal
            isOpen={showInstructivoModal}
            onClose={() => setShowInstructivoModal(false)}
            contenedor={selectedContenedor?.contenedor}
            registro={selectedRegistro}
          />
          {selectedContenedor && (
            <FacturaProformaModal
              isOpen={showProformaModal}
              onClose={() => setShowProformaModal(false)}
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
