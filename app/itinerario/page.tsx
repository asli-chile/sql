'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import type { User } from '@supabase/supabase-js';
import { 
  LayoutDashboard, 
  Ship, 
  Truck, 
  FileText, 
  FileCheck, 
  Globe, 
  DollarSign, 
  BarChart3, 
  Users, 
  User as UserIcon, 
  ChevronRight, 
  Anchor, 
  Activity,
  Plus
} from 'lucide-react';
import { ItinerarioFilters } from '@/components/itinerario/ItinerarioFilters';
import { ItinerarioTable } from '@/components/itinerario/ItinerarioTable';
import { ItinerarioCard } from '@/components/itinerario/ItinerarioCard';
import { VoyageDrawer } from '@/components/itinerario/VoyageDrawer';
import { ItinerariosManager } from '@/components/itinerarios/ItinerariosManager';
import { fetchItinerarios } from '@/lib/itinerarios-service';
import type { ItinerarioWithEscalas, ItinerarioFilters as FiltersType } from '@/types/itinerarios';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { Sidebar } from '@/components/layout/Sidebar';
import { SidebarSection } from '@/types/layout';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/hooks/useUser';
import { UserProfileModal } from '@/components/users/UserProfileModal';

export default function ItinerarioPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const { currentUser, transportesCount, registrosCount, setCurrentUser } = useUser();
  const [user, setUser] = useState<User | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [itinerarios, setItinerarios] = useState<ItinerarioWithEscalas[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FiltersType>({});
  const [selectedItinerario, setSelectedItinerario] = useState<ItinerarioWithEscalas | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [etaViewMode, setEtaViewMode] = useState<'dias' | 'fecha' | 'ambos'>('dias');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const isRodrigo = currentUser?.email?.toLowerCase() === 'rodrigo.caceres@asli.cl';
  const isAdmin = currentUser?.rol === 'admin';

  useEffect(() => {
    const checkUser = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user: currentUser },
          error,
        } = await supabase.auth.getUser();

        if (error || !currentUser) {
          router.push('/auth');
          return;
        }

        setUser(currentUser);

        if (currentUser) {
          const { data: userData } = await supabase
            .from('usuarios')
            .select('*')
            .eq('auth_user_id', currentUser.id)
            .single();
          setUserInfo(userData || {
            nombre: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'Usuario',
            email: currentUser.email || ''
          });
        }
      } catch (error) {
        console.error('Error checking user:', error);
        router.push('/auth');
      } finally {
        setLoadingUser(false);
      }
    };

    void checkUser();
  }, [router]);

  const toggleSidebar = () => setIsSidebarCollapsed(prev => !prev);

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
        { label: 'Embarques', id: '/registros', icon: Anchor, counter: registrosCount, tone: 'violet' },
        { label: 'Transportes', id: '/transportes', icon: Truck, counter: transportesCount, tone: 'sky' },
        { label: 'Documentos', id: '/documentos', icon: FileText },
        ...(currentUser && currentUser.rol !== 'cliente'
          ? [{ label: 'Generar Documentos', id: '/generar-documentos', icon: FileCheck }]
          : []),
        ...(isRodrigo
          ? [{ label: 'Seguimiento Marítimo', id: '/dashboard/seguimiento', icon: Globe }]
          : []),
        { label: 'Tracking Movs', id: '/dashboard/tracking', icon: Activity },
        ...(isRodrigo
          ? [
            { label: 'Finanzas', id: '/finanzas', icon: DollarSign },
            { label: 'Reportes', id: '/reportes', icon: BarChart3 },
          ]
          : []),
        { label: 'Itinerario', id: '/itinerario', icon: Ship },
      ],
    },
    ...(isRodrigo || isAdmin
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

  useEffect(() => {
    if (!user) return;

    const loadItinerarios = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await fetchItinerarios();
        setItinerarios(data);
      } catch (error: any) {
        console.error('Error loading itinerarios:', error);
        setError(error?.message || 'Error al cargar itinerarios');
      } finally {
        setIsLoading(false);
      }
    };

    void loadItinerarios();
  }, [user]);

  // Obtener valores únicos para los filtros
  const servicios = useMemo(
    () => Array.from(new Set(itinerarios.map((it) => it.servicio))).sort(),
    [itinerarios]
  );

  const consorcios = useMemo(
    () =>
      Array.from(
        new Set(itinerarios.map((it) => it.consorcio).filter((c): c is string => !!c))
      ).sort(),
    [itinerarios]
  );

  // Mapa de servicios por naviera
  const serviciosPorNaviera = useMemo(() => {
    const mapa: Record<string, string[]> = {};
    itinerarios.forEach((it) => {
      if (it.consorcio && it.servicio) {
        if (!mapa[it.consorcio]) {
          mapa[it.consorcio] = [];
        }
        if (!mapa[it.consorcio].includes(it.servicio)) {
          mapa[it.consorcio].push(it.servicio);
        }
      }
    });
    // Ordenar servicios dentro de cada naviera
    Object.keys(mapa).forEach((naviera) => {
      mapa[naviera].sort();
    });
    return mapa;
  }, [itinerarios]);

  const pols = useMemo(
    () => Array.from(new Set(itinerarios.map((it) => it.pol))).sort(),
    [itinerarios]
  );

  // Calcular semana actual para filtro de semanas
  const calcularSemanaActual = () => {
    const hoy = new Date();
    const d = new Date(Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  // Filtrar itinerarios
  const filteredItinerarios = useMemo(() => {
    const semanaActual = calcularSemanaActual();
    
    return itinerarios.filter((it) => {
      if (filters.servicio && it.servicio !== filters.servicio) return false;
      if (filters.consorcio && it.consorcio !== filters.consorcio) return false;
      if (filters.pol && it.pol !== filters.pol) return false;
      if (filters.region) {
        // Filtrar por región: el itinerario debe tener al menos una escala con esa región
        const hasRegion = it.escalas?.some((escala) => escala.area === filters.region);
        if (!hasRegion) return false;
      }
      if (filters.semanas && it.semana) {
        // Filtrar por rango de semanas: desde semana actual hasta semana actual + (semanas - 1)
        const semanaInicio = semanaActual;
        const semanaFin = semanaActual + filters.semanas - 1;
        if (it.semana < semanaInicio || it.semana > semanaFin) return false;
      }
      return true;
    });
  }, [itinerarios, filters]);

  const handleViewDetail = (itinerario: ItinerarioWithEscalas) => {
    setSelectedItinerario(itinerario);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedItinerario(null);
  };

  const handleSave = async () => {
    // Recargar itinerarios
    try {
      const data = await fetchItinerarios();
      setItinerarios(data);
    } catch (error) {
      console.error('Error reloading itinerarios:', error);
    }
  };

  const handleDelete = async () => {
    // Recargar itinerarios
    try {
      const data = await fetchItinerarios();
      setItinerarios(data);
    } catch (error) {
      console.error('Error reloading itinerarios:', error);
    }
  };

  const handleCreateSuccess = async () => {
    setIsCreateModalOpen(false);
    // Recargar itinerarios
    try {
      const data = await fetchItinerarios();
      setItinerarios(data);
    } catch (error) {
      console.error('Error reloading itinerarios:', error);
    }
  };

  if (loadingUser) {
    return <LoadingScreen message="Cargando itinerarios..." />;
  }

  if (!user) {
    return null;
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

      <Sidebar
        isSidebarCollapsed={isSidebarCollapsed}
        setIsSidebarCollapsed={setIsSidebarCollapsed}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        sections={sidebarSections}
        currentUser={userInfo || currentUser}
        user={user}
        setShowProfileModal={setShowProfileModal}
      />

      <div className="flex flex-1 flex-col min-w-0 overflow-hidden h-full">
        {/* Header */}
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
                <ChevronRight className="h-4 w-4" />
              </button>
            )}

            <div className="flex items-center gap-3 sm:gap-4">
              <div>
                <p className={`text-[10px] sm:text-[11px] uppercase tracking-[0.2em] sm:tracking-[0.3em] ${theme === 'dark' ? 'text-slate-500/80' : 'text-gray-500'}`}>Itinerarios</p>
                <h1 className={`text-lg sm:text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Itinerarios
                </h1>
                <p className={`text-[11px] sm:text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                  Seguimiento semanal de servicios y naves
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 ml-auto">
              {/* Botón Agregar */}
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className={`flex items-center gap-1.5 border px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-colors ${theme === 'dark'
                  ? 'border-[#00AEEF]/60 bg-[#00AEEF]/20 text-[#00AEEF] hover:bg-[#00AEEF]/30 hover:border-[#00AEEF]'
                  : 'border-[#00AEEF] bg-[#00AEEF] text-white hover:bg-[#0099D6]'
                  }`}
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Agregar</span>
              </button>
              {/* Toggle de vista ETA */}
              <div className={`flex items-center gap-0 border rounded-md overflow-hidden ${theme === 'dark'
                ? 'border-slate-700/60 bg-slate-800/60'
                : 'border-gray-300 bg-white'
                }`}>
                <button
                  onClick={() => setEtaViewMode('dias')}
                  className={`px-2.5 py-1.5 text-[10px] sm:text-xs font-medium transition-colors ${
                    etaViewMode === 'dias'
                      ? theme === 'dark'
                        ? 'bg-[#00AEEF] text-white'
                        : 'bg-[#00AEEF] text-white'
                      : theme === 'dark'
                        ? 'text-slate-300 hover:bg-slate-700'
                        : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title="Mostrar días de tránsito"
                >
                  Días
                </button>
                <button
                  onClick={() => setEtaViewMode('fecha')}
                  className={`px-2.5 py-1.5 text-[10px] sm:text-xs font-medium transition-colors border-l ${
                    theme === 'dark' ? 'border-slate-700/60' : 'border-gray-300'
                  } ${
                    etaViewMode === 'fecha'
                      ? theme === 'dark'
                        ? 'bg-[#00AEEF] text-white'
                        : 'bg-[#00AEEF] text-white'
                      : theme === 'dark'
                        ? 'text-slate-300 hover:bg-slate-700'
                        : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title="Mostrar fecha de llegada"
                >
                  Fecha
                </button>
                <button
                  onClick={() => setEtaViewMode('ambos')}
                  className={`px-2.5 py-1.5 text-[10px] sm:text-xs font-medium transition-colors border-l ${
                    theme === 'dark' ? 'border-slate-700/60' : 'border-gray-300'
                  } ${
                    etaViewMode === 'ambos'
                      ? theme === 'dark'
                        ? 'bg-[#00AEEF] text-white'
                        : 'bg-[#00AEEF] text-white'
                      : theme === 'dark'
                        ? 'text-slate-300 hover:bg-slate-700'
                        : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title="Mostrar días y fecha"
                >
                  Ambos
                </button>
              </div>
              <button
                onClick={() => setShowProfileModal(true)}
                className={`hidden sm:flex items-center gap-1.5 border px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm ${theme === 'dark'
                  ? 'border-slate-700/60 bg-slate-800/60 text-slate-200 hover:border-sky-500/60 hover:text-sky-200'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400 hover:text-blue-700'
                  }`}
              >
                <UserIcon className="h-4 w-4" />
                {userInfo?.nombre || currentUser?.nombre || user?.email}
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto min-w-0 w-full">
          <div className="flex flex-col mx-auto w-full max-w-[1600px] px-2 sm:px-3 py-2 space-y-2">
            {/* Filtros */}
            <div className="flex-shrink-0">
              <ItinerarioFilters
                servicios={servicios}
                consorcios={consorcios}
                serviciosPorNaviera={serviciosPorNaviera}
                pols={pols}
                filters={filters}
                onFiltersChange={setFilters}
                onReset={() => setFilters({})}
              />
            </div>

            {/* Contenido */}
            <div className="flex-1 min-h-0 overflow-auto">
              {isLoading ? (
                <div className="h-full flex items-center justify-center rounded-2xl border border-slate-800/60 bg-slate-950/60">
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#00AEEF] border-t-transparent" />
                    <span className="text-sm text-slate-400">Cargando itinerarios...</span>
                  </div>
                </div>
              ) : error ? (
                <div className="h-full flex items-center justify-center rounded-2xl border border-amber-500/40 bg-amber-500/10 p-8">
                  <div className="space-y-4 text-center">
                    <div className="text-amber-400 text-lg font-semibold">
                      ⚠️ Configuración Requerida
                    </div>
                    <div className="text-slate-300 space-y-2">
                      <p className="text-sm">{error}</p>
                      {error.includes('tabla') && (
                        <div className="mt-4 p-4 bg-slate-900/60 rounded-lg text-left text-xs space-y-2">
                          <p className="font-semibold text-amber-300">Pasos para resolver:</p>
                          <ol className="list-decimal list-inside space-y-1 text-slate-400">
                            <li>Ve a tu proyecto en Supabase Dashboard</li>
                            <li>Abre el "SQL Editor" en el menú lateral</li>
                            <li>Copia el contenido del archivo: <code className="text-amber-400">scripts/create-itinerarios-table.sql</code></li>
                            <li>Pega y ejecuta el script en el SQL Editor</li>
                            <li>Recarga esta página</li>
                          </ol>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Vista Desktop (Tabla) */}
                  <div className="hidden lg:block">
                    <ItinerarioTable
                      itinerarios={filteredItinerarios}
                      onViewDetail={handleViewDetail}
                      etaViewMode={etaViewMode}
                    />
                  </div>

                  {/* Vista Mobile (Cards) */}
                  <div className="lg:hidden space-y-4">
                    {filteredItinerarios.length === 0 ? (
                      <div className="flex items-center justify-center py-12 rounded-2xl border border-slate-800/60 bg-slate-950/60">
                        <p className="text-slate-400">No hay itinerarios disponibles</p>
                      </div>
                    ) : (
                      filteredItinerarios.map((itinerario) => (
                        <ItinerarioCard
                          key={itinerario.id}
                          itinerario={itinerario}
                          onViewDetail={handleViewDetail}
                          etaViewMode={etaViewMode}
                        />
                      ))
                    )}
                  </div>
                </>
              )}
            </div>

          </div>
        </main>

        {/* Drawer de edición */}
        <VoyageDrawer
          isOpen={isDrawerOpen}
          onClose={handleCloseDrawer}
          itinerario={selectedItinerario}
          onSave={handleSave}
          onDelete={handleDelete}
        />

        {/* Modal de creación */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
            <div className={`relative w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-lg shadow-xl ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'}`}>
              {/* Header del modal */}
              <div className={`flex items-center justify-between px-4 sm:px-6 py-3 border-b ${theme === 'dark' ? 'border-slate-700' : 'border-gray-200'}`}>
                <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Crear Nuevo Itinerario
                </h2>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className={`p-1.5 rounded-md transition-colors ${theme === 'dark'
                    ? 'text-slate-400 hover:text-white hover:bg-slate-700'
                    : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                >
                  <ChevronRight className="h-5 w-5 rotate-90" />
                </button>
              </div>

              {/* Contenido del modal */}
              <div className="overflow-y-auto max-h-[calc(90vh-4rem)]">
                <div className="p-4 sm:p-6">
                  <ItinerariosManager onSuccess={handleCreateSuccess} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        userInfo={userInfo || currentUser}
        onUserUpdate={(updatedUser) => {
          setUserInfo(updatedUser);
          if (currentUser) {
            setCurrentUser({ ...currentUser, ...updatedUser });
          }
        }}
      />
    </div>
  );
}
