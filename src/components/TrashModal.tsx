'use client';

import { useState, useEffect, useCallback, ComponentType } from 'react';
import { X, Trash2, RotateCcw, RefreshCw, CheckSquare, Square, Loader2 } from 'lucide-react';
import { Registro } from '@/types/registros';
import { createClient } from '@/lib/supabase-browser';
import { convertSupabaseToApp } from '@/lib/migration-utils';

interface TrashModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestore?: () => void;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

type ConfirmActionState =
  | { type: 'bulk-restore'; count: number }
  | { type: 'bulk-delete'; count: number }
  | { type: 'permanent-delete'; recordId: string };

type ConfirmDialogConfig = {
  title: string;
  description: string;
  confirmLabel: string;
  tone: 'sky' | 'rose';
  Icon: ComponentType<{ className?: string }>;
};

export function TrashModal({ isOpen, onClose, onRestore, onSuccess, onError }: TrashModalProps) {
  const [deletedRecords, setDeletedRecords] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDays, setSelectedDays] = useState(7); // Días para conservar registros eliminados
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmActionState | null>(null);
  const [confirmProcessing, setConfirmProcessing] = useState(false);

  const loadDeletedRecords = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - selectedDays);
      cutoffDate.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from('registros')
        .select('*')
        .not('deleted_at', 'is', null)
        .gte('deleted_at', cutoffDate.toISOString())
        .order('deleted_at', { ascending: false });
    
        
      if (error) {
        console.error('Error al cargar registros eliminados:', error);
        return;
      }

      const convertedData = data?.map(convertSupabaseToApp) || [];
      setDeletedRecords(convertedData);
      setSelectedRecords(new Set()); // Limpiar selección al cargar nuevos datos
    } catch (error) {
      console.error('Error al cargar registros eliminados:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedDays]);

  useEffect(() => {
    if (isOpen) {
      loadDeletedRecords();
    }
  }, [isOpen, loadDeletedRecords]);

  useEffect(() => {
    if (!confirmAction) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (!confirmProcessing && !bulkLoading) {
          setConfirmAction(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [confirmAction, confirmProcessing, bulkLoading]);

  // Funciones para selección múltiple
  const toggleRecordSelection = (recordId: string) => {
    const newSelected = new Set(selectedRecords);
    if (newSelected.has(recordId)) {
      newSelected.delete(recordId);
    } else {
      newSelected.add(recordId);
    }
    setSelectedRecords(newSelected);
  };

  const selectAllRecords = () => {
    const allIds = deletedRecords.map(record => record.id!).filter(Boolean);
    setSelectedRecords(new Set(allIds));
  };

  const clearSelection = () => {
    setSelectedRecords(new Set());
  };

  const isAllSelected = deletedRecords.length > 0 && selectedRecords.size === deletedRecords.length;
  const isPartiallySelected = selectedRecords.size > 0 && selectedRecords.size < deletedRecords.length;

  // Funciones para operaciones masivas
  const performBulkRestore = useCallback(async () => {
    if (selectedRecords.size === 0) return;

    setBulkLoading(true);
    try {
      const supabase = createClient();
      const selectedIds = Array.from(selectedRecords);
      const { error } = await supabase
        .from('registros')
        .update({
          deleted_at: null,
          deleted_by: null,
          updated_at: new Date().toISOString(),
        })
        .in('id', selectedIds);

      if (error) {
        console.error('Error al restaurar registros:', error);
        if (onError) onError('Error al restaurar los registros');
        return;
      }

      console.log(`✅ Restaurados ${selectedIds.length} registros`);
      if (onSuccess) onSuccess(`✅ Se restauraron ${selectedIds.length} registros exitosamente`);
      clearSelection();
      loadDeletedRecords();

      if (onRestore) {
        onRestore();
      }
    } catch (error) {
      console.error('Error al restaurar registros:', error);
      if (onError) onError('Error al restaurar los registros');
    } finally {
      setBulkLoading(false);
    }
  }, [selectedRecords, onError, onSuccess, onRestore, loadDeletedRecords]);

  const performBulkDelete = useCallback(async () => {
    if (selectedRecords.size === 0) return;

    setBulkLoading(true);
    try {
      const supabase = createClient();
      const selectedIds = Array.from(selectedRecords);
      const { data, error } = await supabase.rpc('delete_registros_permanente', {
        ids: selectedIds,
      });

      if (error) {
        console.error('Error al eliminar registros:', error);
        if (onError) onError(error.message || 'Error al eliminar los registros permanentemente');
        return;
      }

      const eliminados = typeof data === 'number' ? data : selectedIds.length;
      console.log(`✅ Eliminados permanentemente ${eliminados} registros`);
      if (onSuccess)
        onSuccess(`✅ Se eliminaron ${eliminados} registro(s) permanentemente`);
      clearSelection();
      loadDeletedRecords();

      if (onRestore) {
        onRestore();
      }
    } catch (error: any) {
      console.error('Error al eliminar registros:', error);
      if (onError) {
        onError(
          error?.message ?? 'Error inesperado al eliminar los registros permanentemente',
        );
      }
    } finally {
      setBulkLoading(false);
    }
  }, [selectedRecords, onError, onSuccess, onRestore, loadDeletedRecords]);

  const handleBulkRestore = () => {
    if (selectedRecords.size === 0) return;
    setConfirmAction({ type: 'bulk-restore', count: selectedRecords.size });
  };

  const handleBulkDelete = () => {
    if (selectedRecords.size === 0) return;
    setConfirmAction({ type: 'bulk-delete', count: selectedRecords.size });
  };

  const handleRestore = async (recordId: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('registros')
        .update({
          deleted_at: null,
          deleted_by: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', recordId);

      if (error) {
        console.error('Error al restaurar registro:', error);
        if (onError) onError('Error al restaurar el registro');
        return;
      }

      // Recargar lista
      if (onSuccess) onSuccess('✅ Registro restaurado exitosamente');
      loadDeletedRecords();
      
      // Notificar al componente padre
      if (onRestore) {
        onRestore();
      }
    } catch (error) {
      console.error('Error al restaurar registro:', error);
      if (onError) onError('Error al restaurar el registro');
    }
  };

  const performPermanentDelete = useCallback(
    async (recordId: string) => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.rpc('delete_registros_permanente', {
          ids: [recordId],
        });

        if (error) {
          console.error('Error al eliminar permanentemente:', error);
          if (onError) onError(error.message || 'Error al eliminar permanentemente el registro');
          return;
        }

        const eliminados = typeof data === 'number' ? data : 1;
        if (onSuccess) onSuccess(`✅ Registro eliminado permanentemente (${eliminados})`);
        loadDeletedRecords();

        if (onRestore) {
          onRestore();
        }
      } catch (error: any) {
        console.error('Error al eliminar permanentemente:', error);
        if (onError)
          onError(error?.message ?? 'Error inesperado al eliminar permanentemente el registro');
      }
    },
    [onError, onSuccess, onRestore, loadDeletedRecords],
  );

  const handlePermanentDelete = (recordId: string) => {
    setConfirmAction({ type: 'permanent-delete', recordId });
  };

  const confirmConfig: ConfirmDialogConfig | null = confirmAction
    ? (() => {
        switch (confirmAction.type) {
          case 'bulk-restore':
            return {
              title: 'Restaurar registros',
              description: `¿Estás seguro de que deseas restaurar ${confirmAction.count} registro(s)?`,
              confirmLabel: 'Restaurar',
              tone: 'sky',
              Icon: RotateCcw,
            };
          case 'bulk-delete':
            return {
              title: 'Eliminar permanentemente',
              description: `¿Quieres eliminar permanentemente ${confirmAction.count} registro(s)? Esta acción no se puede deshacer.`,
              confirmLabel: 'Eliminar',
              tone: 'rose',
              Icon: Trash2,
            };
          case 'permanent-delete':
            return {
              title: 'Eliminar permanentemente',
              description:
                '¿Quieres eliminar permanentemente este registro? Esta acción no se puede deshacer.',
              confirmLabel: 'Eliminar',
              tone: 'rose',
              Icon: Trash2,
            };
          default:
            return null;
        }
      })()
    : null;

  const cancelConfirmAction = () => {
    if (confirmProcessing || bulkLoading) return;
    setConfirmAction(null);
  };

  const executeConfirmAction = async () => {
    if (!confirmAction) return;
    setConfirmProcessing(true);
    try {
      if (confirmAction.type === 'bulk-restore') {
        await performBulkRestore();
      } else if (confirmAction.type === 'bulk-delete') {
        await performBulkDelete();
      } else if (confirmAction.type === 'permanent-delete') {
        await performPermanentDelete(confirmAction.recordId);
      }
      setConfirmAction(null);
    } finally {
      setConfirmProcessing(false);
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '-';
    return date.toLocaleDateString('es-CL', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateDaysRemaining = (deletedAt: Date | null) => {
    if (!deletedAt) return 0;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + selectedDays);
    const diffTime = cutoffDate.getTime() - deletedAt.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/80 px-4 py-6 backdrop-blur">
      <div className="relative flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-800/60 bg-slate-950 shadow-2xl shadow-slate-950/50">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/60 bg-slate-950/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-rose-500/15 text-rose-300">
              <Trash2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Papelera</h2>
              <p className="text-[12px] text-slate-400">Gestiona los registros eliminados</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-800/70 bg-slate-900/70 text-slate-300 transition-colors hover:border-slate-600 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Controls */}
        <div className="border-b border-slate-800/60 bg-slate-950/80 px-6 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm font-medium text-slate-300">
                Conservar registros eliminados por:
              </label>
              <select
                value={selectedDays}
                onChange={(e) => setSelectedDays(Number(e.target.value))}
                className="rounded-full border border-slate-800/70 bg-slate-900/70 px-3 py-1.5 text-sm text-slate-200 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/40"
              >
                <option value={7}>7 días</option>
                <option value={14}>14 días</option>
                <option value={30}>30 días</option>
                <option value={90}>90 días</option>
              </select>
              <button
                onClick={loadDeletedRecords}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 px-3 py-1.5 text-sm font-semibold text-white shadow-sky-500/20 transition disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Actualizar
              </button>
            </div>

            {deletedRecords.length > 0 && (
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={isAllSelected ? clearSelection : selectAllRecords}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-800/70 px-3 py-1.5 text-sm text-slate-200 hover:border-sky-500/60 hover:text-sky-200"
                >
                  {isAllSelected ? (
                    <CheckSquare className="h-4 w-4 text-sky-300" />
                  ) : isPartiallySelected ? (
                    <div className="h-4 w-4 rounded border-2 border-sky-400 bg-sky-400/20" />
                  ) : (
                    <Square className="h-4 w-4 text-slate-400" />
                  )}
                  {isAllSelected ? 'Deseleccionar todo' : 'Seleccionar todo'}
                </button>
                {selectedRecords.size > 0 && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 text-sm font-semibold text-sky-200">
                    {selectedRecords.size} seleccionado(s)
                  </span>
                )}
                {selectedRecords.size > 0 && (
                  <>
                    <button
                      onClick={handleBulkRestore}
                      disabled={bulkLoading}
                      className="inline-flex items-center gap-2 rounded-full border border-emerald-500/50 bg-emerald-500/10 px-3 py-1.5 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Restaurar
                    </button>
                    <button
                      onClick={handleBulkDelete}
                      disabled={bulkLoading}
                      className="inline-flex items-center gap-2 rounded-full border border-rose-500/60 bg-rose-500/10 px-3 py-1.5 text-sm font-semibold text-rose-200 hover:bg-rose-500/20 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      Eliminar
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-slate-300">
              <div className="mr-3 h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-sky-400" />
              Cargando registros eliminados…
            </div>
          ) : deletedRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800/60 bg-slate-950/70 py-12 text-slate-400">
              <Trash2 className="mb-3 h-10 w-10" />
              <p className="text-sm">No hay registros en la papelera.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {deletedRecords.map((record) => (
                <div
                  key={record.id}
                  className={`rounded-2xl border px-4 py-4 transition ${
                    selectedRecords.has(record.id!)
                      ? 'border-sky-500/50 bg-sky-500/10'
                      : 'border-slate-800/60 bg-slate-900/60'
                  }`}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggleRecordSelection(record.id!)}
                        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-slate-800/60 bg-slate-900/60 text-slate-300 transition hover:border-sky-500/60 hover:text-sky-200"
                      >
                        {selectedRecords.has(record.id!) ? (
                          <CheckSquare className="h-4 w-4 text-sky-300" />
                        ) : (
                          <Square className="h-4 w-4 text-slate-400" />
                        )}
                      </button>
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 text-sm font-semibold text-sky-200">
                            {record.refAsli}
                          </span>
                          <span className="text-sm text-slate-300">
                            {record.ejecutivo} · {record.shipper}
                          </span>
                          <span className="text-sm text-slate-400">
                            {record.naviera} · {record.especie}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-[12px] text-slate-400">
                          <span className="inline-flex items-center gap-1">
                            Eliminado: <span className="font-semibold text-slate-200">{formatDate(record.deletedAt || null)}</span>
                          </span>
                          <span className="inline-flex items-center gap-1">
                            Por: <span className="font-semibold text-slate-200">{record.deletedBy || 'Usuario'}</span>
                          </span>
                          <span className="inline-flex items-center gap-1 text-amber-300">
                            Se eliminará en {calculateDaysRemaining(record.deletedAt || null)} días
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-shrink-0 items-center gap-2">
                      <button
                        onClick={() => handleRestore(record.id!)}
                        className="inline-flex items-center gap-1 rounded-full border border-emerald-500/50 bg-emerald-500/10 px-3 py-1.5 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/20"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Restaurar
                      </button>
                      <button
                        onClick={() => handlePermanentDelete(record.id!)}
                        className="inline-flex items-center gap-1 rounded-full border border-rose-500/60 bg-rose-500/10 px-3 py-1.5 text-sm font-semibold text-rose-200 hover:bg-rose-500/20"
                      >
                        <Trash2 className="h-4 w-4" />
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800/60 bg-slate-950/75 px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
            <p>{deletedRecords.length} registro(s) eliminado(s)</p>
            <button
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-full border border-slate-800/70 px-4 py-1.5 text-sm font-medium text-slate-200 hover:border-slate-600 hover:text-white"
            >
              Cerrar
            </button>
          </div>
        </div>
        {confirmConfig && (
          <div
            className="fixed inset-0 z-[1300] flex items-center justify-center bg-slate-950/80 px-4 py-6 backdrop-blur-sm"
            onClick={cancelConfirmAction}
            role="presentation"
          >
            <div
              className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-950/90 p-6 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="trash-confirm-title"
            >
              <div className="flex items-start gap-4">
                <span
                  className={`inline-flex h-12 w-12 items-center justify-center rounded-full border ${
                    confirmConfig.tone === 'sky'
                      ? 'border-sky-500/40 bg-sky-500/15 text-sky-200'
                      : 'border-rose-500/40 bg-rose-500/15 text-rose-200'
                  }`}
                >
                  <confirmConfig.Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h3 id="trash-confirm-title" className="text-lg font-semibold text-white">
                    {confirmConfig.title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-300">{confirmConfig.description}</p>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={cancelConfirmAction}
                  disabled={confirmProcessing || bulkLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-700/70 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={executeConfirmAction}
                  disabled={confirmProcessing || bulkLoading}
                  className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:scale-[1.02] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 ${
                    confirmConfig.tone === 'sky'
                      ? 'bg-gradient-to-r from-sky-500 to-indigo-500 shadow-sky-500/20'
                      : 'bg-gradient-to-r from-rose-500 to-red-500 shadow-rose-500/20'
                  }`}
                >
                  {confirmProcessing || bulkLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      Procesando…
                    </>
                  ) : (
                    <>
                      {confirmConfig.confirmLabel}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}