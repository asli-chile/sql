'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import type { User } from '@supabase/supabase-js';
import { Search, RefreshCcw, ArrowLeft } from 'lucide-react';
import { ActiveVesselsMap } from '@/components/ActiveVesselsMap';
import { VesselDetailsModal } from '@/components/VesselDetailsModal';
import type { ActiveVessel } from '@/types/vessels';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { AppFooter } from '@/components/AppFooter';

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

      const response = await fetch('/api/vessels/active');
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        const message = payload?.error ?? 'Error al obtener buques activos';
        throw new Error(message);
      }

      const data = (await response.json()) as ActiveVesselsResponse;
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
    <div className="flex min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-slate-800/60 bg-slate-950/70 backdrop-blur-xl">
          <div className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-700/80 text-slate-300 hover:border-sky-500/60 hover:text-sky-200"
                aria-label="Volver al dashboard"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500/80 sm:text-[11px] sm:tracking-[0.35em]">
                  Seguimiento en tiempo casi real
                </p>
                <h1 className="text-lg font-semibold text-white sm:text-xl md:text-2xl">
                  Mapa de buques activos
                </h1>
                <p className="text-[11px] text-slate-400 sm:text-xs md:text-sm">
                  Visualiza los buques con embarques en curso usando posiciones cacheadas.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={handleRefreshPositions}
                className="inline-flex items-center gap-2 rounded-full border border-slate-700/80 px-3 py-1.5 text-[11px] font-semibold text-slate-200 hover:border-sky-400/60 hover:text-sky-100 sm:px-4 sm:py-2 sm:text-xs"
              >
                <RefreshCcw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="whitespace-nowrap">Actualizar posiciones</span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-3 pb-6 pt-4 space-y-4 sm:px-6 sm:pb-10 sm:pt-6 sm:space-y-6">
          <section className="space-y-3 rounded-xl border border-slate-800/60 bg-slate-950/70 p-3 shadow-xl shadow-slate-950/30 sm:space-y-4 sm:rounded-2xl sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500 sm:text-[11px] sm:tracking-[0.3em]">
                  Lista de buques
                </p>
                <p className="text-xs font-semibold text-slate-100 sm:text-sm">
                  {filteredVessels.length} buques activos
                </p>
              </div>
              <div className="relative w-full sm:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500 sm:h-4 sm:w-4" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar por barco, booking, contenedor o destino"
                  className="w-full rounded-full border border-slate-800 bg-slate-950/80 px-8 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 sm:px-9 sm:py-2 sm:text-sm"
                />
              </div>
            </div>
            {errorMessage && (
              <p className="rounded-xl border border-rose-500/50 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
                {errorMessage}
              </p>
            )}
          </section>

          <section className="space-y-3 sm:space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500 sm:text-[11px] sm:tracking-[0.3em]">
                  Visualización
                </p>
                <p className="text-xs font-semibold text-slate-100 sm:text-sm">
                  Mapa mundial de posiciones AIS cacheadas
                </p>
              </div>
              <div className="text-left text-[10px] text-slate-500 sm:text-right sm:text-[11px]">
                <p className="whitespace-nowrap">Para proteger los créditos de la API AIS:</p>
                <p className="whitespace-nowrap">· Máx. 1 llamada cada 24 horas por buque activo.</p>
                <p className="whitespace-nowrap">· El mapa usa siempre la última posición guardada en Supabase.</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800/60 bg-slate-950/70 p-2 sm:rounded-2xl sm:p-4">
              <ActiveVesselsMap
                vessels={filteredVessels}
                focusedVesselName={selectedVessel?.vessel_name ?? null}
                onVesselSelect={handleVesselSelect}
              />
            </div>
          </section>

          <AppFooter className="mt-4" />
        </main>

        {/* Modal de detalles del buque */}
        <VesselDetailsModal
          isOpen={isModalOpen}
          vessel={selectedVessel}
          onClose={handleCloseModal}
        />
      </div>
    </div>
  );
};

export default SeguimientoPage;


