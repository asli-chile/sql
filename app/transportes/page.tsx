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
import { AppFooter } from '@/components/layout/AppFooter';
import { EditingCellProvider } from '@/contexts/EditingCellContext';
import { InlineEditCell } from '@/components/transportes/InlineEditCell';

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
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const { canAdd, setCurrentUser } = useUser();

  useEffect(() => {
    let isMounted = true;

    const checkUser = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user: currentUser },
          error,
        } = await supabase.auth.getUser();

        if (!isMounted) return;

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

        if (userInfo && isMounted) {
          setCurrentUser(userInfo);
        }
      } catch (error: any) {
        if (!isMounted) return;
        if (!error?.message?.includes('Refresh Token') && !error?.message?.includes('JWT')) {
          console.error('[Transportes] Error comprobando usuario:', error);
        }
        router.push('/auth');
      } finally {
        if (isMounted) {
          setLoadingUser(false);
        }
      }
    };

    void checkUser();

    return () => {
      isMounted = false;
    };
  }, [router]); // Removido setCurrentUser de dependencias

  useEffect(() => {
    let isMounted = true;

    const loadTransportes = async () => {
      if (!user) {
        if (isMounted) {
          setIsLoading(false);
        }
        return;
      }

      try {
        if (isMounted) {
          setIsLoading(true);
        }
        const data = await fetchTransportes();
        if (isMounted) {
          setRecords(data || []);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('[Transportes] Error cargando transportes:', error);
        if (isMounted) {
          setRecords([]);
          setIsLoading(false);
        }
      }
    };

    void loadTransportes();

    return () => {
      isMounted = false;
    };
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

  const handleUpdateRecord = (updatedRecord: TransporteRecord) => {
    setRecords((prev) =>
      prev.map((r) => (r.id === updatedRecord.id ? updatedRecord : r))
    );
  };

  const handleToggleRowSelection = (recordId: string) => {
    setSelectedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(recordId)) {
        newSet.delete(recordId);
      } else {
        newSet.add(recordId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedRows.size === filteredRecords.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filteredRecords.map((r) => r.id)));
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

  if (loadingUser) {
    return <LoadingScreen message="Cargando transportes..." />;
  }

  if (!user) {
    return null;
  }

  return (
    <EditingCellProvider>
      <div className="flex min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 overflow-x-hidden">
        <div className="flex flex-1 flex-col w-full min-w-0">
          <header className="sticky top-0 z-40 border-b border-slate-800/60 bg-slate-950/70 backdrop-blur-xl">
            <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-3 px-2.5 py-2.5 sm:px-4 sm:py-3 lg:px-6">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => router.push('/dashboard')}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-700/80 text-slate-300 hover:border-sky-500/60 hover:text-sky-200 transition-colors"
                    aria-label="Volver al dashboard"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div className="space-y-0.5">
                    <p className="text-[9px] uppercase tracking-[0.25em] text-slate-500/80">Módulo Operativo</p>
                    <h1 className="text-base sm:text-lg lg:text-xl font-semibold text-white flex items-center gap-2">
                      <Truck className="h-4 w-4 sm:h-5 sm:w-5" />
                      Transportes Terrestres
                    </h1>
                    <p className="hidden text-[11px] text-slate-400 md:block">
                      Registro y coordinación de transportes de contenedores y mercancías
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={reload}
                    disabled={isLoading}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-800/70 px-3 py-1.5 text-xs text-slate-300 hover:border-sky-400/60 hover:text-sky-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCcw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">Actualizar</span>
                  </button>
                  {canAdd && (
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(true)}
                      className="inline-flex items-center gap-2 rounded-full border border-sky-500/60 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-200 hover:border-sky-400/80 hover:bg-sky-500/20 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">Nuevo Transporte</span>
                      <span className="sm:hidden">Nuevo</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 w-full">
            <div className="mx-auto w-full max-w-[1600px] px-3 pb-10 pt-4 space-y-4 sm:px-6 sm:pt-6 sm:space-y-6 lg:px-8 lg:space-y-6 xl:px-10 xl:space-y-8">
              {/* Búsqueda */}
              <section className="rounded-3xl border border-slate-800/60 bg-slate-950/60 shadow-xl shadow-slate-950/20 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Búsqueda</p>
                    <p className="text-sm font-semibold text-slate-100">
                      {filteredRecords.length} de {records.length} registros
                    </p>
                  </div>
                  <div className="relative w-full sm:max-w-md">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      type="search"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Buscar por booking, contenedor, conductor, patentes..."
                      className="w-full rounded-lg border border-slate-800 bg-slate-950/80 px-9 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                    />
                  </div>
                </div>
              </section>

              {/* Tabla principal */}
              <section className="rounded-3xl border border-slate-800/60 bg-slate-950/60 shadow-xl shadow-slate-950/20 overflow-hidden w-full">
                <div className="max-h-[70vh] overflow-y-auto overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-800/60">
                    <thead className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm">
                      <tr>
                        <th scope="col" className="px-3 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={selectedRows.size === filteredRecords.length && filteredRecords.length > 0}
                            onChange={handleSelectAll}
                            className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-sky-500 focus:ring-2 focus:ring-sky-500/50"
                          />
                        </th>
                        {transportesColumns.map((column) => (
                          <th
                            key={column.header}
                            scope="col"
                            className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400 whitespace-nowrap"
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
                            colSpan={transportesColumns.length + 1}
                            className="px-3 py-8 text-center text-sm text-slate-400"
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
                            colSpan={transportesColumns.length + 1}
                            className="px-3 py-8 text-center text-sm text-slate-400"
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
                            className={`hover:bg-slate-900/50 transition-colors ${selectedRows.has(item.id) ? 'bg-slate-800/30' : ''}`}
                          >
                            <td className="px-3 py-3">
                              <input
                                type="checkbox"
                                checked={selectedRows.has(item.id)}
                                onChange={() => handleToggleRowSelection(item.id)}
                                className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-sky-500 focus:ring-2 focus:ring-sky-500/50"
                              />
                            </td>
                            {transportesColumns.map((column) => (
                              <td
                                key={`${item.id}-${column.header}`}
                                className="px-3 py-3 text-sm text-slate-200 whitespace-nowrap"
                              >
                                {column.render ? (
                                  column.render(item)
                                ) : (
                                  <InlineEditCell
                                    value={item[column.key]}
                                    field={column.key}
                                    record={item}
                                    onSave={handleUpdateRecord}
                                    type={
                                      dateKeys.has(column.key)
                                        ? 'date'
                                        : typeof item[column.key] === 'number'
                                          ? 'number'
                                          : 'text'
                                    }
                                  />
                                )}
                              </td>
                            ))}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <AppFooter className="mt-6" />
            </div>
          </main>

          {/* Modal para agregar transporte */}
          <AddTransporteModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSuccess={reload}
          />
        </div>
      </div>
    </EditingCellProvider>
  );
}
