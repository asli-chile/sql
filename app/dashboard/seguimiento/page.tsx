'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { User } from '@supabase/supabase-js';
import dynamic from 'next/dynamic';
import { ArrowLeft, RefreshCcw, Search, X, ChevronRight, ChevronLeft, LayoutDashboard, Anchor, Truck, FileText, Globe, DollarSign, BarChart3, Users, User as UserIcon } from 'lucide-react';
import type { ActiveVessel } from '@/types/vessels';
import { VesselDetailsModal } from '@/components/tracking/VesselDetailsModal';
import { Sidebar } from '@/components/layout/Sidebar';
import { SidebarSection } from '@/types/layout';
import { useTheme } from '@/contexts/ThemeContext';
import { UserProfileModal } from '@/components/users/UserProfileModal';

const ActiveVesselsMap = dynamic(
  () => import('@/components/tracking/ActiveVesselsMap').then((mod) => mod.ActiveVesselsMap),
  { ssr: false }
);

type FetchState = 'idle' | 'loading' | 'error' | 'success';

type ActiveVesselsResponse = {
  vessels: ActiveVessel[];
};

const SeguimientoPage = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const { theme } = useTheme();

  const [fetchState, setFetchState] = useState<FetchState>('idle');
  const [vessels, setVessels] = useState<ActiveVessel[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [focusedVesselName, setFocusedVesselName] = useState<string | null>(null);
  const [selectedVessel, setSelectedVessel] = useState<ActiveVessel | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isListSidebarOpen, setIsListSidebarOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user: currentUser },
          error,
        } = await supabase.auth.getUser();

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

        // Obtener información del usuario desde la tabla usuarios
        const { data: userData, error: userError } = await supabase
          .from('usuarios')
          .select('*')
          .eq('auth_user_id', currentUser.id)
          .single();

        if (userError) {
          console.error('Error obteniendo información del usuario:', userError);
          setUserInfo({
            nombre: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'Usuario',
            email: currentUser.email || ''
          });
        } else {
          setUserInfo(userData);
        }
      } catch (error: any) {
        if (!error?.message?.includes('Refresh Token') && !error?.message?.includes('JWT')) {
          console.error('[Seguimiento] Error comprobando usuario:', error);
        }
        router.push('/auth');
      } finally {
        setLoadingUser(false);
      }
    };

    void checkUser();
  }, [router]);

  const loadVessels = async () => {
    try {
      setFetchState('loading');
      setErrorMessage(null);

      // Usar ruta relativa (funciona tanto en desarrollo como en producción)
      // Forzar ruta relativa para evitar problemas con NEXT_PUBLIC_API_URL
      const url = `/api/vessels/active?t=${Date.now()}`;
      console.log('[Seguimiento] Cargando buques desde:', url);
      console.log('[Seguimiento] window.location.origin:', typeof window !== 'undefined' ? window.location.origin : 'N/A');

      let response: Response;
      try {
        response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
      } catch (fetchError) {
        console.error('[Seguimiento] Error en fetch:', fetchError);
        console.error('[Seguimiento] URL intentada:', url);
        console.error('[Seguimiento] Tipo de error:', fetchError instanceof Error ? fetchError.constructor.name : typeof fetchError);
        throw new Error(
          `Error de conexión: ${fetchError instanceof Error ? fetchError.message : 'Error desconocido'}. Verifica que el servidor esté corriendo y que la ruta sea correcta.`,
        );
      }

      if (!response.ok) {
        let errorMessage = `Error HTTP ${response.status}: ${response.statusText}`;
        try {
          const payload = (await response.json()) as { error?: string } | null;
          if (payload?.error) {
            errorMessage = payload.error;
          }
        } catch {
          // Si no se puede parsear el JSON, usar el mensaje por defecto
        }
        throw new Error(errorMessage);
      }

      let data: ActiveVesselsResponse;
      try {
        data = (await response.json()) as ActiveVesselsResponse;
      } catch (parseError) {
        console.error('[Seguimiento] Error parseando respuesta:', parseError);
        throw new Error('Error parseando respuesta del servidor');
      }

      setVessels(data.vessels || []);
      setFetchState('success');

      setFocusedVesselName(null);
      setSelectedVessel(null);
      setIsModalOpen(false);
    } catch (error) {
      console.error('[Seguimiento] Error cargando buques activos:', error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Error inesperado al cargar buques activos',
      );
      setFetchState('error');
    }
  };

  const handleRefreshPositions = async () => {
    try {
      const url = `/api/vessels/update-positions`;
      const response = await fetch(url, {
        method: 'POST',
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        const message =
          payload?.error ?? 'Error al actualizar posiciones desde la API AIS';
        throw new Error(message);
      }
    } catch (error) {
      console.error('[Seguimiento] Error actualizando posiciones:', error);
    } finally {
      await loadVessels();
    }
  };

  useEffect(() => {
    if (!user) {
      return;
    }
    void loadVessels();
  }, [user]);

  const filteredVessels = useMemo(() => {
    if (!searchTerm.trim()) {
      return vessels;
    }

    const term = searchTerm.toLowerCase();

    return vessels.filter((vessel) => {
      if (vessel.vessel_name.toLowerCase().includes(term)) {
        return true;
      }
      if (vessel.destination && vessel.destination.toLowerCase().includes(term)) {
        return true;
      }
      if (vessel.bookings.some((booking) => booking.toLowerCase().includes(term))) {
        return true;
      }
      if (vessel.containers.some((container) => container.toLowerCase().includes(term))) {
        return true;
      }
      return false;
    });
  }, [vessels, searchTerm]);

  useEffect(() => {
    if (selectedVessel && !filteredVessels.some(
      (v) => v.vessel_name === selectedVessel.vessel_name,
    )) {
      setSelectedVessel(null);
      setFocusedVesselName(null);
      setIsModalOpen(false);
    }
  }, [filteredVessels, selectedVessel]);

  const handleVesselSelect = (vessel: ActiveVessel | null) => {
    if (!vessel) {
      setSelectedVessel(null);
      setFocusedVesselName(null);
      setIsModalOpen(false);
      return;
    }

    if (selectedVessel && selectedVessel.vessel_name === vessel.vessel_name) {
      setSelectedVessel(null);
      setFocusedVesselName(null);
      setIsModalOpen(false);
      return;
    }

    setSelectedVessel(vessel);
    setFocusedVesselName(vessel.vessel_name);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedVessel(null);
    setFocusedVesselName(null);
  };

  const isRodrigo = userInfo?.email?.toLowerCase() === 'rodrigo.caceres@asli.cl';
  const isAdmin = userInfo?.rol === 'admin';

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
        { label: 'Embarques', id: '/registros', icon: Anchor },
        { label: 'Transportes', id: '/transportes', icon: Truck },
        { label: 'Documentos', id: '/documentos', icon: FileText },
        { label: 'Seguimiento Marítimo', id: '/dashboard/seguimiento', isActive: true, icon: Globe },
        ...(isRodrigo
          ? [
            { label: 'Finanzas', id: '/finanzas', icon: DollarSign },
            { label: 'Reportes', id: '/reportes', icon: BarChart3 },
          ]
          : []),
      ],
    },
    ...(isAdmin
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

  if (loadingUser || !user) {
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
        currentUser={userInfo}
        user={user}
        setShowProfileModal={setShowProfileModal}
      />

      {/* Content Area */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden h-full relative">
        {/* Header Estándar */}
        <header className={`sticky top-0 z-40 border-b overflow-hidden ${theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <div className="flex flex-wrap items-center gap-2 pl-2 pr-2 sm:px-3 sm:py-2 py-2">
            {/* Botón hamburguesa para móvil */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className={`lg:hidden flex h-9 w-9 items-center justify-center border transition-colors flex-shrink-0 ${theme === 'dark'
                ? 'text-slate-300 hover:bg-slate-700 border-slate-700/60'
                : 'text-gray-600 hover:bg-gray-100 border-gray-300'
                }`}
              aria-label="Abrir menú"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            {/* Botón para expandir sidebar colapsado en desktop */}
            {isSidebarCollapsed && (
              <button
                onClick={() => setIsSidebarCollapsed(false)}
                className={`hidden lg:flex h-9 w-9 items-center justify-center border transition-colors flex-shrink-0 ${theme === 'dark'
                  ? 'text-slate-300 hover:bg-slate-700 border-slate-700/60'
                  : 'text-gray-600 hover:bg-gray-100 border-gray-300'
                  }`}
                aria-label="Expandir menú lateral"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            )}

            <div className="flex items-center gap-3 sm:gap-4">
              <div className={`hidden sm:flex h-10 w-10 items-center justify-center border ${theme === 'dark' ? 'bg-sky-500/15 border-sky-500/20' : 'bg-blue-100 border-blue-200'}`}>
                <Globe className={`h-6 w-6 ${theme === 'dark' ? 'text-sky-300' : 'text-blue-600'}`} />
              </div>
              <div>
                <p className={`text-[10px] sm:text-[11px] uppercase tracking-[0.2em] sm:tracking-[0.3em] ${theme === 'dark' ? 'text-slate-500/80' : 'text-gray-500'}`}>Módulo Operativo</p>
                <h1 className={`text-lg sm:text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Seguimiento Marítimo</h1>
                <p className={`text-[11px] sm:text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>Mapa de buques activos y posiciones AIS</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-3 ml-auto">
              <button
                type="button"
                onClick={handleRefreshPositions}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-colors border ${theme === 'dark'
                  ? 'border-slate-700/60 text-slate-300 hover:border-sky-500 hover:text-sky-200 bg-slate-800/60'
                  : 'border-gray-300 text-gray-700 hover:border-blue-400 hover:text-blue-600 bg-white'
                  }`}
              >
                <RefreshCcw className="h-4 w-4" />
                <span className="hidden sm:inline">Actualizar</span>
              </button>

              <button
                onClick={() => setShowProfileModal(true)}
                className={`hidden sm:flex items-center gap-2 border px-3 py-2 text-xs sm:text-sm ${theme === 'dark'
                  ? 'border-slate-700/60 text-slate-300 hover:border-sky-400 hover:text-sky-200 bg-slate-800/60'
                  : 'border-gray-300 text-gray-700 hover:border-blue-400 hover:text-blue-600 bg-white'
                  }`}
                title={userInfo?.nombre || user?.email}
              >
                <UserIcon className="h-4 w-4" />
                {userInfo?.nombre || user?.email}
              </button>
            </div>
          </div>
        </header>

        {/* Mapa a pantalla completa dentro del área de contenido */}
        <div className="flex-1 relative overflow-hidden">
          <ActiveVesselsMap
            vessels={filteredVessels}
            focusedVesselName={selectedVessel?.vessel_name ?? null}
            onVesselSelect={handleVesselSelect}
          />

          {/* Panel lateral flotante (Lista de buques) */}
          <div
            className={`absolute top-4 left-4 z-30 h-[calc(100%-2rem)] w-full max-w-xs transform transition-transform duration-300 ease-in-out sm:max-w-sm ${isListSidebarOpen ? 'translate-x-0' : '-translate-x-[calc(100%+1rem)]'
              }`}
          >
            <div className={`h-full overflow-y-auto border ${theme === 'dark' ? 'border-slate-700 bg-slate-900' : 'border-gray-200 bg-white'}`}>
              <div className={`sticky top-0 z-10 flex items-center justify-between border-b p-3 ${theme === 'dark' ? 'border-slate-700 bg-slate-900/95' : 'border-gray-100 bg-white/95'}`}>
                <div>
                  <p className={`text-[10px] uppercase tracking-[0.25em] ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`}>
                    Lista de buques
                  </p>
                  <p className={`text-xs font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-gray-900'}`}>
                    {filteredVessels.length} buques activos
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsListSidebarOpen(false)}
                  className={`inline-flex h-7 w-7 items-center justify-center border transition-colors ${theme === 'dark'
                    ? 'border-slate-700/60 bg-slate-800 text-slate-400 hover:text-slate-200'
                    : 'border-gray-300 bg-gray-50 text-gray-500 hover:text-gray-700'
                    }`}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </div>

              <div className="p-3 space-y-3">
                {/* Búsqueda */}
                <div className="relative">
                  <Search className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`} />
                  <input
                    type="search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar buque, destino, booking..."
                    className={`w-full border py-2 pl-9 pr-3 text-xs focus:outline-none focus:ring-2 ${theme === 'dark'
                      ? 'border-slate-700/60 bg-slate-800 text-slate-200 focus:border-sky-500 focus:ring-sky-500/30'
                      : 'border-gray-300 bg-gray-50 text-gray-900 focus:border-blue-500 focus:ring-blue-500/30'
                      }`}
                  />
                </div>

                {/* Información */}
                <div className={`border p-3 ${theme === 'dark' ? 'border-slate-700/60 bg-slate-800/50' : 'border-gray-300 bg-gray-50/50'}`}>
                  <p className={`mb-2 text-[10px] uppercase tracking-[0.25em] ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`}>
                    Información
                  </p>
                  <div className={`space-y-1.5 text-[10px] ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                    <p>Datos basados en transmisiones AIS satelitales.</p>
                    <p>Actualización diaria a las 7:00 AM (Chile).</p>
                    <p>Última posición guardada en base de datos.</p>
                  </div>
                </div>

                {/* Lista de buques */}
                <div className="space-y-2">
                  <p className={`text-[10px] uppercase tracking-[0.25em] ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`}>
                    Buques ({filteredVessels.length})
                  </p>
                  <div className="max-h-[calc(100vh-25rem)] space-y-1.5 overflow-y-auto pr-1 custom-scrollbar">
                    {filteredVessels.length === 0 ? (
                      <p className="py-4 text-center text-xs text-slate-500">
                        No hay buques activos
                      </p>
                    ) : (
                      filteredVessels.map((vessel) => (
                        <button
                          key={vessel.vessel_name}
                          type="button"
                          onClick={() => handleVesselSelect(vessel)}
                          className={`w-full border p-2.5 text-left transition-colors ${selectedVessel?.vessel_name === vessel.vessel_name
                            ? theme === 'dark'
                              ? 'border-sky-500/60 bg-sky-500/10'
                              : 'border-blue-500/60 bg-blue-50/50'
                            : theme === 'dark'
                              ? 'border-slate-700/60 bg-slate-800/50 hover:border-slate-700 hover:bg-slate-800'
                              : 'border-gray-300 bg-gray-50 hover:border-gray-300 hover:bg-gray-100'
                            }`}
                        >
                          <p className={`text-xs font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-gray-900'}`}>
                            {vessel.vessel_name}
                          </p>
                          {vessel.destination && (
                            <p className="mt-0.5 text-[10px] text-slate-400">
                              Destino: <span className={theme === 'dark' ? 'text-sky-400' : 'text-blue-600'}>{vessel.destination}</span>
                            </p>
                          )}
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            <span className={`rounded-full px-1.5 py-0.5 text-[9px] ${theme === 'dark' ? 'bg-slate-800 text-slate-400' : 'bg-gray-200 text-gray-600'}`}>
                              {vessel.bookings.length} bookings
                            </span>
                            <span className={`rounded-full px-1.5 py-0.5 text-[9px] ${theme === 'dark' ? 'bg-slate-800 text-slate-400' : 'bg-gray-200 text-gray-600'}`}>
                              {vessel.containers.length} contenedores
                            </span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Botón para abrir panel lateral cuando está cerrado */}
          {!isListSidebarOpen && (
            <button
              type="button"
              onClick={() => setIsListSidebarOpen(true)}
              className={`absolute top-4 left-0 z-30 flex h-10 w-10 items-center justify-center border-r border-t border-b transition-colors ${theme === 'dark'
                ? 'border-slate-700/60 bg-slate-900 text-slate-300 hover:text-sky-200'
                : 'border-gray-300 bg-white text-gray-600 hover:text-blue-600'
                }`}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Modal de detalles del buque */}
      <VesselDetailsModal
        isOpen={isModalOpen}
        vessel={selectedVessel}
        onClose={handleCloseModal}
      />

      {/* Modal de perfil de usuario */}
      {showProfileModal && (
        <UserProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          userInfo={userInfo}
          onUserUpdate={setUserInfo}
        />
      )}
    </div>
  );
};

export default SeguimientoPage;
