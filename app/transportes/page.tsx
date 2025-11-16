'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import type { User } from '@supabase/supabase-js';
import { Search, RefreshCcw, ArrowLeft, Truck, Plus } from 'lucide-react';
import { TransporteRecord, fetchTransportes } from '@/lib/transportes-service';
import { transportesColumns } from '@/components/transportes/columns';
import { AddTransporteModal } from '@/components/transportes/AddTransporteModal';
import { useUser } from '@/hooks/useUser';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { AppFooter } from '@/components/AppFooter';

const dateKeys = new Set<keyof TransporteRecord>([
  'stacking',
  'cut_off',
  'fecha_planta',
  'created_at',
  'updated_at',
]);

function formatValue(item: TransporteRecord, key: keyof TransporteRecord) {
  const value = item[key];
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  if (dateKeys.has(key) && typeof value === 'string') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString('es-CL');
    }
  }

  if (typeof value === 'boolean') {
    return value ? 'Sí' : 'No';
  }

  return String(value);
}

export default function TransportesPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [records, setRecords] = useState<TransporteRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { canAdd, setCurrentUser } = useUser();

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

        const { data: userInfo } = await supabase
          .from('usuarios')
          .select('*')
          .eq('auth_user_id', currentUser.id)
          .single();

        if (userInfo) {
          setCurrentUser(userInfo);
        }
      } catch (error: any) {
        if (!error?.message?.includes('Refresh Token') && !error?.message?.includes('JWT')) {
          console.error('[Transportes] Error comprobando usuario:', error);
        }
        router.push('/auth');
      } finally {
        setLoadingUser(false);
      }
    };

    void checkUser();
  }, [router, setCurrentUser]);

  useEffect(() => {
    const loadTransportes = async () => {
      try {
        setIsLoading(true);
        const data = await fetchTransportes();
        setRecords(data);
      } catch (error) {
        console.error('[Transportes] Error cargando transportes:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      void loadTransportes();
    }
  }, [user]);

  const reload = async () => {
    try {
      setIsLoading(true);
      const data = await fetchTransportes();
      setRecords(data);
    } catch (error) {
      console.error('[Transportes] Error recargando transportes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRecords = useMemo(() => {
    if (!searchTerm.trim()) {
      return records;
    }

    const term = searchTerm.toLowerCase().trim();
    return records.filter((record) => {
      return (
        record.booking?.toLowerCase().includes(term) ||
        record.contenedor?.toLowerCase().includes(term) ||
        record.conductor?.toLowerCase().includes(term) ||
        record.transportes?.toLowerCase().includes(term) ||
        record.patentes?.toLowerCase().includes(term) ||
        record.nave?.toLowerCase().includes(term) ||
        record.planta?.toLowerCase().includes(term) ||
        record.deposito?.toLowerCase().includes(term) ||
        record.guia_despacho?.toLowerCase().includes(term)
      );
    });
  }, [records, searchTerm]);

  const stats = useMemo(() => {
    const total = records.length;
    const conConductor = records.filter((r) => r.conductor).length;
    const conPatentes = records.filter((r) => r.patentes).length;
    const late = records.filter((r) => r.late).length;
    return { total, conConductor, conPatentes, late };
  }, [records]);

  if (loadingUser) {
    return <LoadingScreen message="Cargando transportes..." />;
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
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-700/80 text-slate-300 hover:border-sky-500/60 hover:text-sky-200 transition-colors"
                aria-label="Volver al dashboard"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500/80 sm:text-[11px] sm:tracking-[0.35em]">
                  Coordinación y seguimiento
                </p>
                <h1 className="text-lg font-semibold text-white sm:text-xl md:text-2xl flex items-center gap-2">
                  <Truck className="h-5 w-5 sm:h-6 sm:w-6" />
                  Transportes Terrestres
                </h1>
                <p className="text-[11px] text-slate-400 sm:text-xs md:text-sm">
                  Registro y coordinación de transportes de contenedores y mercancías
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={reload}
                disabled={isLoading}
                className="inline-flex items-center gap-2 rounded-full border border-slate-700/80 px-3 py-1.5 text-[11px] font-semibold text-slate-200 hover:border-sky-400/60 hover:text-sky-100 sm:px-4 sm:py-2 sm:text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCcw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="whitespace-nowrap">Actualizar</span>
              </button>
              {canAdd && (
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-full border border-sky-500/60 bg-sky-500/10 px-3 py-1.5 text-[11px] font-semibold text-sky-200 hover:border-sky-400/80 hover:bg-sky-500/20 sm:px-4 sm:py-2 sm:text-xs transition-colors"
                >
                  <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="whitespace-nowrap">Nuevo Transporte</span>
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-3 pb-6 pt-4 space-y-4 sm:px-6 sm:pb-10 sm:pt-6 sm:space-y-6">
          {/* Estadísticas */}
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <div className="rounded-xl border border-slate-800/60 bg-slate-950/70 p-3 shadow-xl shadow-slate-950/30 sm:rounded-2xl sm:p-4">
              <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500 sm:text-[11px]">
                Total
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-100 sm:text-xl">
                {stats.total}
              </p>
            </div>
            <div className="rounded-xl border border-slate-800/60 bg-slate-950/70 p-3 shadow-xl shadow-slate-950/30 sm:rounded-2xl sm:p-4">
              <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500 sm:text-[11px]">
                Con Conductor
              </p>
              <p className="mt-1 text-lg font-semibold text-sky-300 sm:text-xl">
                {stats.conConductor}
              </p>
            </div>
            <div className="rounded-xl border border-slate-800/60 bg-slate-950/70 p-3 shadow-xl shadow-slate-950/30 sm:rounded-2xl sm:p-4">
              <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500 sm:text-[11px]">
                Con Patentes
              </p>
              <p className="mt-1 text-lg font-semibold text-emerald-300 sm:text-xl">
                {stats.conPatentes}
              </p>
            </div>
            <div className="rounded-xl border border-slate-800/60 bg-slate-950/70 p-3 shadow-xl shadow-slate-950/30 sm:rounded-2xl sm:p-4">
              <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500 sm:text-[11px]">
                Late
              </p>
              <p className="mt-1 text-lg font-semibold text-rose-300 sm:text-xl">
                {stats.late}
              </p>
            </div>
          </section>

          {/* Búsqueda y tabla */}
          <section className="space-y-3 rounded-xl border border-slate-800/60 bg-slate-950/70 p-3 shadow-xl shadow-slate-950/30 sm:space-y-4 sm:rounded-2xl sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500 sm:text-[11px] sm:tracking-[0.3em]">
                  Registros de Transporte
                </p>
                <p className="text-xs font-semibold text-slate-100 sm:text-sm">
                  {filteredRecords.length} de {records.length} registros
                </p>
              </div>
              <div className="relative w-full sm:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500 sm:h-4 sm:w-4" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar por booking, contenedor, conductor, patentes..."
                  className="w-full rounded-full border border-slate-800 bg-slate-950/80 px-8 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 sm:px-9 sm:py-2 sm:text-sm"
                />
              </div>
            </div>

            {/* Tabla con scroll interno */}
            <div className="max-h-[60vh] overflow-y-auto overflow-x-auto rounded-lg border border-slate-800/60">
              <table className="min-w-full divide-y divide-slate-800/60">
                <thead className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm">
                  <tr>
                    {transportesColumns.map((column) => (
                      <th
                        key={column.header}
                        scope="col"
                        className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400 sm:px-4 sm:py-3 sm:text-xs"
                      >
                        {column.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-950/50">
                  {isLoading ? (
                    <tr>
                      <td
                        colSpan={transportesColumns.length}
                        className="px-3 py-8 text-center text-sm text-slate-400 sm:px-4"
                      >
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCcw className="h-4 w-4 animate-spin" />
                          <span>Cargando transportes...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredRecords.length === 0 ? (
                    <tr>
                      <td
                        colSpan={transportesColumns.length}
                        className="px-3 py-8 text-center text-sm text-slate-400 sm:px-4"
                      >
                        {searchTerm
                          ? 'No se encontraron registros que coincidan con la búsqueda.'
                          : 'No hay registros de transporte disponibles.'}
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-900/50 transition-colors"
                      >
                        {transportesColumns.map((column) => (
                          <td
                            key={`${item.id}-${column.header}`}
                            className="whitespace-nowrap px-3 py-2 text-xs text-slate-200 sm:px-4 sm:py-3 sm:text-sm"
                          >
                            {column.render ? column.render(item) : formatValue(item, column.key)}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <AppFooter className="mt-4" />
        </main>

        {/* Modal para agregar transporte */}
        <AddTransporteModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={reload}
        />
      </div>
    </div>
  );
}
