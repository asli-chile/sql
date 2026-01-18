'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { User } from '@supabase/supabase-js';
import dynamic from 'next/dynamic';
import { ArrowLeft, RefreshCcw, Search, X, ChevronRight, ChevronLeft } from 'lucide-react';
import type { ActiveVessel } from '@/types/vessels';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { VesselDetailsModal } from '@/components/tracking/VesselDetailsModal';

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
  const [loadingUser, setLoadingUser] = useState(true);

  const [fetchState, setFetchState] = useState<FetchState>('idle');
  const [vessels, setVessels] = useState<ActiveVessel[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [focusedVesselName, setFocusedVesselName] = useState<string | null>(null);
  const [selectedVessel, setSelectedVessel] = useState<ActiveVessel | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user: currentUser },
          error,
        } = await supabase.auth.getUser();

        // Si hay error de refresh token, limpiar sesión y redirigir
        if (error) {
          // Si es un error de refresh token inválido, es esperado y no necesita log
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
      } catch (error: any) {
        // Solo loguear errores que no sean de refresh token
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

      // Agregar timestamp para evitar cache y asegurar datos frescos
      const url = `/api/vessels/active?t=${Date.now()}`;
      console.log('[Seguimiento] Cargando buques desde:', url);

      let response: Response;
      try {
        response = await fetch(url, {
          cache: 'no-store',
          next: { revalidate: 0 },
        });
      } catch (fetchError) {
        console.error('[Seguimiento] Error en fetch:', fetchError);
        throw new Error(
          `Error de conexión: ${fetchError instanceof Error ? fetchError.message : 'Error desconocido'}. Verifica que el servidor esté corriendo.`,
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
      const response = await fetch('/api/vessels/update-positions', {
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
      // Después de pedir actualización, recargar datos desde cache.
      await loadVessels();
    }
  };

  useEffect(() => {
    if (!user) {
      return;
    }

    // Cargar buques inicialmente
    void loadVessels();

    // El auto-refresh está desactivado para no interrumpir la experiencia del usuario
    // Usa el botón "Actualizar posiciones" cuando necesites datos frescos
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

  // Si el buque seleccionado ya no está en el filtro, limpiar selección
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

    // Si es el mismo buque, cerrar el modal
    if (selectedVessel && selectedVessel.vessel_name === vessel.vessel_name) {
      setSelectedVessel(null);
      setFocusedVesselName(null);
      setIsModalOpen(false);
      return;
    }

    // Seleccionar nuevo buque y abrir modal
    setSelectedVessel(vessel);
    setFocusedVesselName(vessel.vessel_name);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedVessel(null);
    setFocusedVesselName(null);
  };


  if (loadingUser) {
    return <LoadingScreen message="Cargando seguimiento de buques..." />;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-950">
      {/* Mapa a pantalla completa */}
      <div className="absolute inset-0">
        <ActiveVesselsMap
          vessels={filteredVessels}
          focusedVesselName={selectedVessel?.vessel_name ?? null}
          onVesselSelect={handleVesselSelect}
        />
      </div>

      {/* Header flotante compacto */}
      <header className="absolute top-0 left-0 right-0 z-50 border-b border-slate-800/40 bg-slate-950/90 backdrop-blur-xl shadow-lg">
        <div className="flex items-center justify-between gap-3 px-3 py-2 sm:px-4 sm:py-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-700/80 bg-slate-900/80 text-slate-300 transition-colors hover:border-sky-500/60 hover:bg-slate-800/80 hover:text-sky-200"
              aria-label="Volver al dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-white sm:text-base">
                Mapa de buques activos
              </h1>
              <p className="hidden text-[10px] text-slate-400 sm:block sm:text-xs">
                {filteredVessels.length} buques activos
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefreshPositions}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-700/80 bg-slate-900/80 px-2.5 py-1.5 text-[10px] font-semibold text-slate-200 transition-colors hover:border-sky-400/60 hover:bg-slate-800/80 hover:text-sky-100 sm:gap-2 sm:px-3 sm:py-2 sm:text-xs"
            >
              <RefreshCcw className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span className="hidden whitespace-nowrap sm:inline">Actualizar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Panel lateral flotante */}
      <div
        className={`absolute top-14 left-0 z-40 h-[calc(100vh-3.5rem)] w-full max-w-sm transform transition-transform duration-300 ease-in-out sm:top-16 sm:max-w-md ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full overflow-y-auto rounded-r-2xl border-r border-slate-800/60 bg-slate-950/95 backdrop-blur-xl shadow-2xl">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800/60 bg-slate-950/95 p-3 backdrop-blur-sm">
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500 sm:text-[11px] sm:tracking-[0.3em]">
                Lista de buques
              </p>
              <p className="text-xs font-semibold text-slate-100 sm:text-sm">
                {filteredVessels.length} buques activos
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-700/80 bg-slate-900/80 text-slate-400 transition-colors hover:border-slate-600 hover:bg-slate-800 hover:text-slate-200"
              aria-label="Cerrar panel"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>

          <div className="p-3 space-y-3">
            {/* Búsqueda */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar buque, destino, booking..."
                className="w-full rounded-lg border border-slate-800 bg-slate-900/80 py-2 pl-9 pr-3 text-xs text-slate-200 placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
              />
            </div>

            {/* Información */}
            <div className="rounded-lg border border-slate-800/60 bg-slate-900/50 p-3">
              <p className="mb-2 text-[10px] uppercase tracking-[0.25em] text-slate-500">
                Información
              </p>
              <div className="space-y-1.5 text-[10px] text-slate-400">
                <p>Datos basados en transmisiones AIS satelitales.</p>
                <p>Actualización diaria a las 7:00 AM (Chile).</p>
                <p>Última posición guardada en base de datos.</p>
              </div>
            </div>

            {/* Lista de buques */}
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">
                Buques ({filteredVessels.length})
              </p>
              <div className="max-h-[calc(100vh-20rem)] space-y-1.5 overflow-y-auto">
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
                      className={`w-full rounded-lg border p-2.5 text-left transition-colors ${
                        selectedVessel?.vessel_name === vessel.vessel_name
                          ? 'border-sky-500/60 bg-sky-500/10'
                          : 'border-slate-800/60 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-800/50'
                      }`}
                    >
                      <p className="text-xs font-semibold text-slate-100">
                        {vessel.vessel_name}
                      </p>
                      {vessel.destination && (
                        <p className="mt-0.5 text-[10px] text-slate-400">
                          Destino: <span className="text-sky-400">{vessel.destination}</span>
                        </p>
                      )}
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <span className="rounded-full bg-slate-800/60 px-1.5 py-0.5 text-[9px] text-slate-400">
                          {vessel.bookings.length} bookings
                        </span>
                        <span className="rounded-full bg-slate-800/60 px-1.5 py-0.5 text-[9px] text-slate-400">
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
      {!isSidebarOpen && (
        <>
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="absolute top-20 left-0 z-40 hidden h-10 w-10 items-center justify-center rounded-r-lg border-r border-slate-800/60 bg-slate-950/90 text-slate-300 shadow-lg backdrop-blur-sm transition-colors hover:bg-slate-900/90 hover:text-sky-200 sm:inline-flex"
            aria-label="Abrir panel"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          {/* Botón flotante para móviles */}
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="fixed bottom-4 left-4 z-40 inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-950/90 px-4 py-2.5 text-xs font-semibold text-slate-200 shadow-xl backdrop-blur-sm transition-colors hover:border-sky-500/60 hover:bg-slate-900/90 hover:text-sky-200 sm:hidden"
            aria-label="Abrir panel de buques"
          >
            <Search className="h-4 w-4" />
            <span>Buscar buques</span>
          </button>
        </>
      )}

      {/* Modal de detalles del buque */}
      <VesselDetailsModal
        isOpen={isModalOpen}
        vessel={selectedVessel}
        onClose={handleCloseModal}
      />
    </div>
  );
};

export default SeguimientoPage;
