'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import type { User } from '@supabase/supabase-js';
import { Search, RefreshCcw, ArrowLeft } from 'lucide-react';
import { ActiveVesselsMap } from '@/components/ActiveVesselsMap';
import type { ActiveVessel } from '@/types/vessels';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { AppFooter } from '@/components/AppFooter';

type FetchState = 'idle' | 'loading' | 'error' | 'success';

type ActiveVesselsResponse = {
  vessels: ActiveVessel[];
};

type VesselDetailRow = {
  id: string;
  booking: string | null;
  contenedor: string | null;
  origen: string | null;
  destino: string | null;
  etd: string | null;
  eta: string | null;
  ttEstimadoDias: number | null;
  ttRealDias: number | null;
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
  const [detailsState, setDetailsState] = useState<FetchState>('idle');
  const [detailRows, setDetailRows] = useState<VesselDetailRow[]>([]);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user: currentUser },
          error,
        } = await supabase.auth.getUser();

        if (error) {
          throw error;
        }

        if (!currentUser) {
          router.push('/auth');
          return;
        }

        setUser(currentUser);
      } catch (error) {
        console.error('[Seguimiento] Error comprobando usuario:', error);
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
      setDetailRows([]);
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
      setDetailRows([]);
    }
  }, [filteredVessels, selectedVessel]);

  const handleVesselSelect = (vessel: ActiveVessel | null) => {
    setSelectedVessel((prev) => {
      if (!vessel) return null;
      if (prev && prev.vessel_name === vessel.vessel_name) {
        setFocusedVesselName(null);
        setDetailRows([]);
        return null;
      }
      setFocusedVesselName(vessel.vessel_name);
      return vessel;
    });
  };

  const loadVesselDetails = async (vessel: ActiveVessel) => {
    try {
      setDetailsState('loading');
      setDetailRows([]);
      const supabase = createClient();

      // Buscar registros relacionados al buque y sus bookings
      const { data, error } = await supabase
        .from('registros')
        .select('id, booking, contenedor, pol, pod, etd, eta')
        .in('booking', vessel.bookings)
        .is('deleted_at', null);

      if (error) {
        throw error;
      }

      const now = new Date();

      const rows: VesselDetailRow[] = (data || []).map((row: any) => {
        const etd = row.etd as string | null;
        const eta = row.eta as string | null;

        let ttEstimadoDias: number | null = null;
        let ttRealDias: number | null = null;

        if (etd && eta) {
          const etdDate = new Date(etd);
          const etaDate = new Date(eta);
          const diffMs = etaDate.getTime() - etdDate.getTime();
          ttEstimadoDias = Number.isFinite(diffMs) ? Math.round(diffMs / (1000 * 60 * 60 * 24)) : null;
        }

        if (etd) {
          const etdDate = new Date(etd);
          const diffMsReal = now.getTime() - etdDate.getTime();
          ttRealDias = Number.isFinite(diffMsReal) ? Math.max(0, Math.round(diffMsReal / (1000 * 60 * 60 * 24))) : null;
        }

        return {
          id: row.id as string,
          booking: row.booking ?? null,
          contenedor: row.contenedor ?? null,
          origen: row.pol ?? null,
          destino: row.pod ?? null,
          etd: etd,
          eta: eta,
          ttEstimadoDias,
          ttRealDias,
        };
      });

      setDetailRows(rows);
      setDetailsState('success');
    } catch (error) {
      console.error('[Seguimiento] Error cargando detalles de buque:', error);
      setDetailsState('error');
    }
  };

  // Cargar detalles cuando cambia el buque seleccionado
  useEffect(() => {
    if (!selectedVessel) {
      setDetailsState('idle');
      setDetailRows([]);
      return;
    }
    void loadVesselDetails(selectedVessel);
  }, [selectedVessel]);

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
          <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-700/80 text-slate-300 hover:border-sky-500/60 hover:text-sky-200"
                aria-label="Volver al dashboard"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500/80">
                  Seguimiento en tiempo casi real
                </p>
                <h1 className="text-xl font-semibold text-white sm:text-2xl">
                  Mapa de buques activos
                </h1>
                <p className="text-xs text-slate-400 sm:text-sm">
                  Visualiza los buques con embarques en curso usando posiciones cacheadas.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleRefreshPositions}
                className="inline-flex items-center gap-2 rounded-full border border-slate-700/80 px-4 py-2 text-xs font-semibold text-slate-200 hover:border-sky-400/60 hover:text-sky-100"
              >
                <RefreshCcw className="h-4 w-4" />
                Actualizar posiciones
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-6 pb-10 pt-6 space-y-6">
          <section className="space-y-4 rounded-2xl border border-slate-800/60 bg-slate-950/70 p-4 shadow-xl shadow-slate-950/30">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">
                  Lista de buques
                </p>
                <p className="text-sm font-semibold text-slate-100">
                  {filteredVessels.length} buques activos
                </p>
              </div>
              <div className="relative w-full max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar por barco, booking, contenedor o destino"
                  className="w-full rounded-full border border-slate-800 bg-slate-950/80 px-9 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                />
              </div>
            </div>
            {errorMessage && (
              <p className="rounded-xl border border-rose-500/50 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
                {errorMessage}
              </p>
            )}
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">
                  Visualización
                </p>
                <p className="text-sm font-semibold text-slate-100">
                  Mapa mundial de posiciones AIS cacheadas
                </p>
              </div>
              <div className="text-right text-[11px] text-slate-500">
                <p>Para proteger los créditos de la API AIS:</p>
                <p>· Máx. 1 llamada cada 3 días por buque activo.</p>
                <p>· El mapa usa siempre la última posición guardada en Supabase.</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800/60 bg-slate-950/70 p-4">
              <ActiveVesselsMap
                vessels={filteredVessels}
                focusedVesselName={selectedVessel?.vessel_name ?? null}
                onVesselSelect={handleVesselSelect}
              />
            </div>
          </section>

          {selectedVessel && (
            <section className="space-y-4 rounded-2xl border border-slate-800/60 bg-slate-950/70 p-4 shadow-xl shadow-slate-950/30">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">
                    Detalle del buque
                  </p>
                  <p className="text-sm font-semibold text-slate-100">
                    {selectedVessel.vessel_name}
                  </p>
                </div>
              </div>

              {detailsState === 'loading' && (
                <p className="text-xs text-slate-400">Cargando detalle de embarques…</p>
              )}
              {detailsState === 'error' && (
                <p className="text-xs text-rose-300">
                  No se pudo cargar el detalle de este buque.
                </p>
              )}
              {detailsState === 'success' && detailRows.length === 0 && (
                <p className="text-xs text-slate-400">
                  No se encontraron embarques asociados a este buque.
                </p>
              )}

              {detailsState === 'success' && detailRows.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-xs text-slate-200">
                    <thead className="border-b border-slate-800 text-[11px] uppercase tracking-[0.2em] text-slate-500">
                      <tr>
                        <th className="px-3 py-2">Booking</th>
                        <th className="px-3 py-2">Contenedor</th>
                        <th className="px-3 py-2">Origen</th>
                        <th className="px-3 py-2">Destino</th>
                        <th className="px-3 py-2">ETD</th>
                        <th className="px-3 py-2">ETA</th>
                        <th className="px-3 py-2">TT estimado (días)</th>
                        <th className="px-3 py-2">TT real (días)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {detailRows.map((row) => (
                        <tr key={row.id}>
                          <td className="px-3 py-2 font-medium">{row.booking ?? '—'}</td>
                          <td className="px-3 py-2">{row.contenedor ?? '—'}</td>
                          <td className="px-3 py-2">{row.origen ?? '—'}</td>
                          <td className="px-3 py-2">{row.destino ?? '—'}</td>
                          <td className="px-3 py-2">
                            {row.etd
                              ? new Date(row.etd).toLocaleString('es-CL', {
                                  timeZone: 'UTC',
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: '2-digit',
                                })
                              : '—'}
                          </td>
                          <td className="px-3 py-2">
                            {row.eta
                              ? new Date(row.eta).toLocaleString('es-CL', {
                                  timeZone: 'UTC',
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: '2-digit',
                                })
                              : '—'}
                          </td>
                          <td className="px-3 py-2">
                            {row.ttEstimadoDias != null ? row.ttEstimadoDias : '—'}
                          </td>
                          <td className="px-3 py-2">
                            {row.ttRealDias != null ? row.ttRealDias : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          <AppFooter className="mt-4" />
        </main>
      </div>
    </div>
  );
};

export default SeguimientoPage;


