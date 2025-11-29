'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { User } from '@supabase/supabase-js';
import { ArrowLeft, RefreshCcw, CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { AppFooter } from '@/components/layout/AppFooter';

type UpdateResult = {
  message: string;
  timestamp?: string;
  totalActiveVessels?: number;
  updated?: string[];
  skipped?: string[];
  failed?: { vessel_name: string; reason: string }[];
  missingIdentifiers?: string[];
};

type ActiveVesselInfo = {
  vessel_name: string;
  last_lat: number | null;
  last_lon: number | null;
  last_position_at: string | null;
  last_api_call_at: string | null;
  imo: string | null;
  mmsi: string | null;
};

const ServiciosPage = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  const [activeVessels, setActiveVessels] = useState<ActiveVesselInfo[]>([]);
  const [loadingVessels, setLoadingVessels] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateResult, setUpdateResult] = useState<UpdateResult | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [balanceInfo, setBalanceInfo] = useState<{
    apiBalance: number | null;
    apiBalanceError: string | null;
    estimatedCost: number;
    vesselsToUpdate: number;
  } | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);

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

        // Verificar permisos: admin o ejecutivo (@asli.cl)
        const { data: userData } = await supabase
          .from('usuarios')
          .select('rol, email')
          .eq('auth_user_id', currentUser.id)
          .single();

        const isAdmin = userData?.rol === 'admin';
        const isEjecutivo = userData?.email?.endsWith('@asli.cl') || currentUser.email?.endsWith('@asli.cl');

        if (!isAdmin && !isEjecutivo) {
          router.push('/dashboard');
          return;
        }

        setIsAuthorized(true);
        setUserInfo(userData);
      } catch (error: any) {
        if (!error?.message?.includes('Refresh Token') && !error?.message?.includes('JWT')) {
          console.error('[Servicios] Error comprobando usuario:', error);
        }
        router.push('/auth');
      } finally {
        setLoadingUser(false);
      }
    };

    void checkUser();
  }, [router]);

  useEffect(() => {
    if (isAuthorized) {
      void loadActiveVessels();
      void loadBalanceInfo();
    }
  }, [isAuthorized]);

  const loadBalanceInfo = async () => {
    try {
      setLoadingBalance(true);
      const response = await fetch('/api/vessels/check-balance');
      if (!response.ok) {
        throw new Error('Error al consultar saldo');
      }

      const data = await response.json();
      setBalanceInfo({
        apiBalance: data.apiBalance,
        apiBalanceError: data.apiBalanceError,
        estimatedCost: data.estimatedCost || 0,
        vesselsToUpdate: data.vesselsToUpdate || 0,
      });
    } catch (error) {
      console.error('Error cargando información de saldo:', error);
    } finally {
      setLoadingBalance(false);
    }
  };

  const loadActiveVessels = async () => {
    try {
      setLoadingVessels(true);
      const response = await fetch('/api/vessels/active');
      if (!response.ok) {
        throw new Error('Error al cargar buques activos');
      }

      const data = await response.json();
      const vessels = (data.vessels || []) as Array<{ vessel_name: string }>;

      // Obtener información detallada de posiciones
      const supabase = createClient();
      const vesselNames = vessels.map((v) => v.vessel_name);
      
      if (vesselNames.length === 0) {
        setActiveVessels([]);
        return;
      }

      const { data: positions, error } = await supabase
        .from('vessel_positions')
        .select('vessel_name, last_lat, last_lon, last_position_at, last_api_call_at, imo, mmsi')
        .in('vessel_name', vesselNames);

      if (error) {
        console.error('Error cargando posiciones:', error);
        setActiveVessels(
          vessels.map((v) => ({
            vessel_name: v.vessel_name,
            last_lat: null,
            last_lon: null,
            last_position_at: null,
            last_api_call_at: null,
            imo: null,
            mmsi: null,
          })),
        );
        return;
      }

      const positionsMap = new Map(
        (positions || []).map((p: any) => [p.vessel_name, p]),
      );

      setActiveVessels(
        vessels.map((v) => {
          const pos = positionsMap.get(v.vessel_name);
          return {
            vessel_name: v.vessel_name,
            last_lat: pos?.last_lat ?? null,
            last_lon: pos?.last_lon ?? null,
            last_position_at: pos?.last_position_at ?? null,
            last_api_call_at: pos?.last_api_call_at ?? null,
            imo: pos?.imo ?? null,
            mmsi: pos?.mmsi ?? null,
          };
        }),
      );
    } catch (error) {
      console.error('Error cargando buques activos:', error);
    } finally {
      setLoadingVessels(false);
    }
  };

  const handleUpdatePositions = async () => {
    try {
      setUpdating(true);
      setUpdateResult(null);
      setUpdateError(null);

      const response = await fetch('/api/vessels/update-positions', {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Error al actualizar posiciones');
      }

      const result = (await response.json()) as UpdateResult;
      setUpdateResult(result);

      // Recargar buques activos y saldo después de actualizar
      await loadActiveVessels();
      await loadBalanceInfo();
    } catch (error) {
      console.error('Error actualizando posiciones:', error);
      setUpdateError(
        error instanceof Error ? error.message : 'Error inesperado al actualizar posiciones',
      );
    } finally {
      setUpdating(false);
    }
  };

  if (loadingUser) {
    return <LoadingScreen message="Cargando servicios..." />;
  }

  if (!isAuthorized) {
    return null;
  }

  const vesselsWithCoords = activeVessels.filter(
    (v) => v.last_lat != null && v.last_lon != null,
  );
  const vesselsWithoutCoords = activeVessels.filter(
    (v) => v.last_lat == null || v.last_lon == null,
  );
  const vesselsWithoutIdentifiers = activeVessels.filter(
    (v) => !v.imo && !v.mmsi,
  );

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-slate-800/60 bg-slate-950/70 backdrop-blur-xl">
          <div className="flex items-center gap-3 px-3 py-3 sm:px-6 sm:py-4">
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-700/80 text-slate-300 transition-colors hover:border-sky-500/60 hover:text-sky-200"
              aria-label="Volver al dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-semibold text-white sm:text-xl md:text-2xl">
                Servicios del Sistema
              </h1>
              <p className="text-[11px] text-slate-400 sm:text-xs md:text-sm">
                Gestión y mantenimiento del sistema
              </p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-3 pb-6 pt-4 sm:px-6 sm:pb-10 sm:pt-6">
          <section className="space-y-4 rounded-xl border border-slate-800/60 bg-slate-950/70 p-4 shadow-xl shadow-slate-950/30 sm:rounded-2xl sm:p-6">
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500 sm:text-[11px] sm:tracking-[0.3em]">
                Actualización de Posiciones AIS
              </p>
              <p className="text-xs font-semibold text-slate-100 sm:text-sm">
                Actualizar posiciones de buques activos desde la API AIS
              </p>
            </div>

            {/* Información de saldo y créditos */}
            {balanceInfo && (
              <div className="rounded-lg border border-slate-800/60 bg-slate-900/50 p-4">
                <p className="mb-3 text-[10px] uppercase tracking-[0.25em] text-slate-500">
                  Saldo y Créditos
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-[10px] text-slate-400">Saldo API AIS</p>
                    {balanceInfo.apiBalance !== null ? (
                      <p className="mt-1 text-xl font-semibold text-sky-400">
                        {balanceInfo.apiBalance.toLocaleString()} créditos
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-slate-500">
                        {balanceInfo.apiBalanceError || 'No disponible'}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400">Costo estimado de actualización</p>
                    <p className="mt-1 text-xl font-semibold text-yellow-400">
                      {balanceInfo.estimatedCost} créditos
                    </p>
                    <p className="mt-1 text-[10px] text-slate-500">
                      ({balanceInfo.vesselsToUpdate} buques × 5 créditos)
                    </p>
                  </div>
                </div>
                {balanceInfo.apiBalance !== null && balanceInfo.estimatedCost > 0 && (
                  <div className="mt-3 rounded border border-slate-800/60 bg-slate-950/50 p-2">
                    <p className="text-[10px] text-slate-400">
                      Saldo después de actualizar:{' '}
                      <span
                        className={`font-semibold ${
                          balanceInfo.apiBalance - balanceInfo.estimatedCost >= 0
                            ? 'text-green-400'
                            : 'text-red-400'
                        }`}
                      >
                        {Math.max(0, balanceInfo.apiBalance - balanceInfo.estimatedCost).toLocaleString()}{' '}
                        créditos
                      </span>
                    </p>
                    {balanceInfo.apiBalance - balanceInfo.estimatedCost < 0 && (
                      <p className="mt-1 text-[10px] text-red-400">
                        ⚠️ No hay suficientes créditos para actualizar todos los buques
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Resumen de buques activos */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-800/60 bg-slate-900/50 p-3">
                <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">
                  Total de buques
                </p>
                <p className="mt-1 text-2xl font-semibold text-slate-100">
                  {activeVessels.length}
                </p>
              </div>
              <div className="rounded-lg border border-slate-800/60 bg-slate-900/50 p-3">
                <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">
                  Con coordenadas
                </p>
                <p className="mt-1 text-2xl font-semibold text-green-400">
                  {vesselsWithCoords.length}
                </p>
              </div>
              <div className="rounded-lg border border-slate-800/60 bg-slate-900/50 p-3">
                <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">
                  Sin IMO/MMSI
                </p>
                <p className="mt-1 text-2xl font-semibold text-yellow-400">
                  {vesselsWithoutIdentifiers.length}
                </p>
              </div>
            </div>

            {/* Botón de actualización */}
            <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-800/60 bg-slate-900/50 p-4">
              <div>
                <p className="text-xs font-semibold text-slate-100">
                  Ejecutar actualización de posiciones
                </p>
                <p className="mt-1 text-[10px] text-slate-400">
                  Los datos actuales se moverán al historial antes de actualizar
                </p>
                <p className="mt-1 text-[10px] text-slate-500">
                  Cada buque actualizado consume 5 créditos de la API AIS
                </p>
              </div>
              <button
                type="button"
                onClick={handleUpdatePositions}
                disabled={updating || loadingVessels}
                className="inline-flex items-center gap-2 rounded-full border border-sky-700/80 bg-sky-900/50 px-4 py-2 text-xs font-semibold text-sky-200 transition-colors hover:border-sky-500/60 hover:bg-sky-800/50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updating ? (
                  <>
                    <Clock className="h-4 w-4 animate-spin" />
                    <span>Actualizando...</span>
                  </>
                ) : (
                  <>
                    <RefreshCcw className="h-4 w-4" />
                    <span>Actualizar Posiciones</span>
                  </>
                )}
              </button>
            </div>

            {/* Resultado de la actualización */}
            {updateResult && (
              <div className="rounded-lg border border-slate-800/60 bg-slate-900/50 p-4">
                <p className="mb-3 text-xs font-semibold text-slate-100">Resultado de la actualización</p>
                <div className="space-y-2 text-[10px] sm:text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                    <span className="text-slate-300">
                      Actualizados: <span className="font-semibold text-green-400">{updateResult.updated?.length || 0}</span>
                    </span>
                  </div>
                  {updateResult.skipped && updateResult.skipped.length > 0 && (
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-400" />
                      <span className="text-slate-300">
                        Omitidos: <span className="font-semibold text-yellow-400">{updateResult.skipped.length}</span>
                      </span>
                    </div>
                  )}
                  {updateResult.failed && updateResult.failed.length > 0 && (
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-400" />
                      <span className="text-slate-300">
                        Fallidos: <span className="font-semibold text-red-400">{updateResult.failed.length}</span>
                      </span>
                    </div>
                  )}
                  {updateResult.timestamp && (
                    <p className="mt-2 text-[10px] text-slate-500">
                      Ejecutado: {new Date(updateResult.timestamp).toLocaleString('es-CL')}
                    </p>
                  )}
                </div>

                {/* Detalles de fallidos */}
                {updateResult.failed && updateResult.failed.length > 0 && (
                  <div className="mt-4 max-h-48 space-y-1 overflow-y-auto rounded border border-slate-800/60 bg-slate-950/50 p-2">
                    {updateResult.failed.map((f, idx) => (
                      <div key={idx} className="text-[10px] text-slate-400">
                        <span className="font-semibold text-red-400">{f.vessel_name}:</span>{' '}
                        {f.reason}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Error */}
            {updateError && (
              <div className="rounded-lg border border-red-800/60 bg-red-950/30 p-4">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-400" />
                  <p className="text-xs font-semibold text-red-400">Error</p>
                </div>
                <p className="mt-1 text-[10px] text-slate-300">{updateError}</p>
              </div>
            )}

            {/* Lista de buques activos */}
            {loadingVessels ? (
              <div className="flex items-center justify-center py-8">
                <Clock className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : activeVessels.length === 0 ? (
              <div className="rounded-lg border border-slate-800/60 bg-slate-900/50 p-4 text-center">
                <p className="text-xs text-slate-400">No hay buques activos</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">
                  Buques activos ({activeVessels.length})
                </p>
                <div className="max-h-96 space-y-1 overflow-y-auto rounded-lg border border-slate-800/60 bg-slate-900/50 p-2">
                  {activeVessels.map((vessel) => (
                    <div
                      key={vessel.vessel_name}
                      className="flex items-center justify-between rounded border border-slate-800/60 bg-slate-950/50 p-2 text-[10px]"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-100">{vessel.vessel_name}</p>
                        <div className="mt-1 flex flex-wrap gap-2 text-slate-400">
                          {vessel.last_lat && vessel.last_lon ? (
                            <span className="text-green-400">
                              {vessel.last_lat.toFixed(4)}, {vessel.last_lon.toFixed(4)}
                            </span>
                          ) : (
                            <span className="text-yellow-400">Sin coordenadas</span>
                          )}
                          {vessel.last_position_at && (
                            <span>
                              {new Date(vessel.last_position_at).toLocaleDateString('es-CL')}
                            </span>
                          )}
                          {!vessel.imo && !vessel.mmsi && (
                            <span className="text-red-400">Sin IMO/MMSI</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <AppFooter className="mt-4" />
        </main>
      </div>
    </div>
  );
};

export default ServiciosPage;

