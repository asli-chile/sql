'use client';

import { useState, useEffect, useCallback, ComponentType } from 'react';
import { X, Trash2, RotateCcw, RefreshCw, CheckSquare, Square, Loader2 } from 'lucide-react';
import { TransporteRecord } from '@/lib/transportes-service';
import { createClient } from '@/lib/supabase-browser';
import { fetchDeletedTransportes } from '@/lib/transportes-service';
import { useTheme } from '@/contexts/ThemeContext';

interface TrashModalTransportesProps {
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

export function TrashModalTransportes({ isOpen, onClose, onRestore, onSuccess, onError }: TrashModalTransportesProps) {
  const { theme } = useTheme();
  const [deletedRecords, setDeletedRecords] = useState<TransporteRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDays, setSelectedDays] = useState(7);
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmActionState | null>(null);
  const [confirmProcessing, setConfirmProcessing] = useState(false);

  const loadDeletedRecords = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchDeletedTransportes(selectedDays);
      setDeletedRecords(data);
      setSelectedRecords(new Set());
    } catch (error) {
      console.error('Error al cargar transportes eliminados:', error);
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

  const toggleRecordSelection = (recordId: string) => {
    const newSelected = new Set(selectedRecords);
    if (newSelected.has(recordId)) {
      newSelected.delete(recordId);
    } else {
      newSelected.add(recordId);
    }
    setSelectedRecords(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedRecords.size === deletedRecords.length) {
      setSelectedRecords(new Set());
    } else {
      setSelectedRecords(new Set(deletedRecords.map((r) => r.id)));
    }
  };

  const handleRestore = async (recordId: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('transportes')
        .update({
          deleted_at: null,
          deleted_by: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', recordId);

      if (error) {
        console.error('Error al restaurar transporte:', error);
        if (onError) onError('Error al restaurar el transporte');
        return;
      }

      if (onSuccess) onSuccess('✅ Transporte restaurado exitosamente');
      loadDeletedRecords();

      if (onRestore) {
        onRestore();
      }
    } catch (error) {
      console.error('Error al restaurar transporte:', error);
      if (onError) onError('Error al restaurar el transporte');
    }
  };

  const handleBulkRestore = async () => {
    if (selectedRecords.size === 0) return;

    setBulkLoading(true);
    try {
      const supabase = createClient();
      const ids = Array.from(selectedRecords);

      const { error } = await supabase
        .from('transportes')
        .update({
          deleted_at: null,
          deleted_by: null,
          updated_at: new Date().toISOString(),
        })
        .in('id', ids);

      if (error) {
        console.error('Error al restaurar transportes:', error);
        if (onError) onError('Error al restaurar los transportes');
        return;
      }

      if (onSuccess) onSuccess(`✅ ${ids.length} transporte(s) restaurado(s) exitosamente`);
      setSelectedRecords(new Set());
      loadDeletedRecords();

      if (onRestore) {
        onRestore();
      }
    } catch (error) {
      console.error('Error al restaurar transportes:', error);
      if (onError) onError('Error al restaurar los transportes');
    } finally {
      setBulkLoading(false);
      setConfirmAction(null);
    }
  };

  const performPermanentDelete = useCallback(
    async (recordId: string) => {
      try {
        const supabase = createClient();
        const { error } = await supabase
          .from('transportes')
          .delete()
          .eq('id', recordId);

        if (error) {
          console.error('Error al eliminar permanentemente:', error);
          if (onError) onError(error.message || 'Error al eliminar permanentemente el transporte');
          return;
        }

        if (onSuccess) onSuccess('✅ Transporte eliminado permanentemente');
        loadDeletedRecords();

        if (onRestore) {
          onRestore();
        }
      } catch (error: any) {
        console.error('Error al eliminar permanentemente:', error);
        if (onError) onError(error?.message ?? 'Error inesperado al eliminar permanentemente el transporte');
      }
    },
    [onError, onSuccess, onRestore, loadDeletedRecords],
  );

  const handlePermanentDelete = (recordId: string) => {
    setConfirmAction({ type: 'permanent-delete', recordId });
  };

  const handleBulkDelete = async () => {
    if (selectedRecords.size === 0) return;

    setBulkLoading(true);
    try {
      const supabase = createClient();
      const ids = Array.from(selectedRecords);

      const { error } = await supabase
        .from('transportes')
        .delete()
        .in('id', ids);

      if (error) {
        console.error('Error al eliminar permanentemente transportes:', error);
        if (onError) onError('Error al eliminar permanentemente los transportes');
        return;
      }

      if (onSuccess) onSuccess(`✅ ${ids.length} transporte(s) eliminado(s) permanentemente`);
      setSelectedRecords(new Set());
      loadDeletedRecords();

      if (onRestore) {
        onRestore();
      }
    } catch (error) {
      console.error('Error al eliminar permanentemente transportes:', error);
      if (onError) onError('Error al eliminar permanentemente los transportes');
    } finally {
      setBulkLoading(false);
      setConfirmAction(null);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmAction || confirmProcessing) return;

    setConfirmProcessing(true);
    try {
      if (confirmAction.type === 'bulk-restore') {
        await handleBulkRestore();
      } else if (confirmAction.type === 'bulk-delete') {
        await handleBulkDelete();
      } else if (confirmAction.type === 'permanent-delete') {
        await performPermanentDelete(confirmAction.recordId);
      }
    } finally {
      setConfirmProcessing(false);
      setConfirmAction(null);
    }
  };

  const getConfirmConfig = (): ConfirmDialogConfig | null => {
    if (!confirmAction) return null;

    switch (confirmAction.type) {
      case 'bulk-restore':
        return {
          title: 'Restaurar transportes',
          description: `¿Quieres restaurar ${confirmAction.count} transporte(s) seleccionado(s)?`,
          confirmLabel: 'Restaurar',
          tone: 'sky',
          Icon: RotateCcw,
        };
      case 'bulk-delete':
        return {
          title: 'Eliminar permanentemente',
          description: `¿Estás seguro de que quieres eliminar permanentemente ${confirmAction.count} transporte(s)? Esta acción no se puede deshacer.`,
          confirmLabel: 'Eliminar permanentemente',
          tone: 'rose',
          Icon: Trash2,
        };
      case 'permanent-delete':
        return {
          title: 'Eliminar permanentemente',
          description: '¿Estás seguro de que quieres eliminar permanentemente este transporte? Esta acción no se puede deshacer.',
          confirmLabel: 'Eliminar permanentemente',
          tone: 'rose',
          Icon: Trash2,
        };
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  const confirmConfig = getConfirmConfig();

  return (
    <>
      <div
        className="fixed inset-0 z-[1200] flex items-center justify-center px-4 py-6 backdrop-blur-sm"
        onClick={onClose}
        role="presentation"
        style={{
          backgroundColor: theme === 'dark' ? 'rgba(2, 6, 23, 0.8)' : 'rgba(0, 0, 0, 0.5)',
        }}
      >
        <div
          className={`w-full max-w-6xl rounded-3xl border p-6 shadow-2xl ${
            theme === 'dark' ? 'border-white/10 bg-slate-950/90' : 'border-gray-200 bg-white'
          }`}
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="trash-modal-title"
        >
          <div className="flex items-center justify-between mb-6">
            <h2
              id="trash-modal-title"
              className={`text-2xl font-bold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}
            >
              Papelera de Transportes
            </h2>
            <button
              type="button"
              onClick={onClose}
              className={`p-2 rounded-full transition-colors ${
                theme === 'dark'
                  ? 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  : 'text-gray-400 hover:bg-gray-100 hover:text-gray-900'
              }`}
              aria-label="Cerrar papelera"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mb-4 flex items-center gap-4">
            <label className={`text-sm font-medium ${
              theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
            }`}>
              Mostrar eliminados de los últimos:
            </label>
            <select
              value={selectedDays}
              onChange={(e) => setSelectedDays(Number(e.target.value))}
              className={`rounded-lg border px-3 py-1.5 text-sm ${
                theme === 'dark'
                  ? 'border-slate-700 bg-slate-800 text-slate-200'
                  : 'border-gray-300 bg-white text-gray-900'
              }`}
            >
              <option value={7}>7 días</option>
              <option value={14}>14 días</option>
              <option value={30}>30 días</option>
              <option value={60}>60 días</option>
              <option value={90}>90 días</option>
            </select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className={`h-8 w-8 animate-spin ${
                theme === 'dark' ? 'text-sky-400' : 'text-blue-600'
              }`} />
            </div>
          ) : deletedRecords.length === 0 ? (
            <div className={`py-12 text-center ${
              theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
            }`}>
              No hay transportes eliminados en los últimos {selectedDays} días.
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                      theme === 'dark'
                        ? 'text-slate-300 hover:bg-slate-800'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {selectedRecords.size === deletedRecords.length ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                    <span>Seleccionar todos</span>
                  </button>
                  {selectedRecords.size > 0 && (
                    <span className={`text-sm ${
                      theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                    }`}>
                      {selectedRecords.size} seleccionado(s)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {selectedRecords.size > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setConfirmAction({ type: 'bulk-restore', count: selectedRecords.size })}
                        disabled={bulkLoading}
                        className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:opacity-50"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Restaurar seleccionados
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmAction({ type: 'bulk-delete', count: selectedRecords.size })}
                        disabled={bulkLoading}
                        className="inline-flex items-center gap-2 rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        Eliminar permanentemente
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={loadDeletedRecords}
                    disabled={loading}
                    className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                      theme === 'dark'
                        ? 'text-slate-300 hover:bg-slate-800'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              <div className={`max-h-[60vh] overflow-y-auto rounded-lg border ${
                theme === 'dark' ? 'border-slate-800' : 'border-gray-200'
              }`}>
                <table className="w-full">
                  <thead className={`sticky top-0 ${
                    theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50'
                  }`}>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={selectedRecords.size === deletedRecords.length && deletedRecords.length > 0}
                          onChange={toggleSelectAll}
                          className={`h-4 w-4 rounded ${
                            theme === 'dark'
                              ? 'border-slate-600 bg-slate-800 text-sky-500'
                              : 'border-gray-300 bg-white text-blue-600'
                          }`}
                        />
                      </th>
                      <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${
                        theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                      }`}>
                        Booking
                      </th>
                      <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${
                        theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                      }`}>
                        Contenedor
                      </th>
                      <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${
                        theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                      }`}>
                        Eliminado
                      </th>
                      <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${
                        theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                      }`}>
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${
                    theme === 'dark' ? 'divide-slate-800' : 'divide-gray-200'
                  }`}>
                    {deletedRecords.map((record) => (
                      <tr
                        key={record.id}
                        className={`transition-colors ${
                          theme === 'dark' ? 'hover:bg-slate-900/60' : 'hover:bg-gray-50'
                        }`}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedRecords.has(record.id)}
                            onChange={() => toggleRecordSelection(record.id)}
                            className={`h-4 w-4 rounded ${
                              theme === 'dark'
                                ? 'border-slate-600 bg-slate-800 text-sky-500'
                                : 'border-gray-300 bg-white text-blue-600'
                            }`}
                          />
                        </td>
                        <td className={`px-4 py-3 text-sm ${
                          theme === 'dark' ? 'text-slate-200' : 'text-gray-900'
                        }`}>
                          {record.booking || '—'}
                        </td>
                        <td className={`px-4 py-3 text-sm ${
                          theme === 'dark' ? 'text-slate-200' : 'text-gray-900'
                        }`}>
                          {record.contenedor || '—'}
                        </td>
                        <td className={`px-4 py-3 text-sm ${
                          theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
                        }`}>
                          {record.deleted_at
                            ? new Date(record.deleted_at).toLocaleString('es-CL')
                            : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleRestore(record.id)}
                              className={`rounded px-3 py-1.5 text-sm transition-colors ${
                                theme === 'dark'
                                  ? 'text-sky-400 hover:bg-slate-800'
                                  : 'text-blue-600 hover:bg-gray-100'
                              }`}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePermanentDelete(record.id)}
                              className={`rounded px-3 py-1.5 text-sm transition-colors ${
                                theme === 'dark'
                                  ? 'text-rose-400 hover:bg-slate-800'
                                  : 'text-red-600 hover:bg-gray-100'
                              }`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {confirmConfig && (
        <div
          className="fixed inset-0 z-[1300] flex items-center justify-center px-4 py-6 backdrop-blur-sm"
          onClick={() => setConfirmAction(null)}
          role="presentation"
          style={{
            backgroundColor: theme === 'dark' ? 'rgba(2, 6, 23, 0.9)' : 'rgba(0, 0, 0, 0.7)',
          }}
        >
          <div
            className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl ${
              theme === 'dark' ? 'border-white/10 bg-slate-950/90' : 'border-gray-200 bg-white'
            }`}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start gap-4">
              <span className={`inline-flex h-12 w-12 items-center justify-center rounded-full border ${
                confirmConfig.tone === 'sky'
                  ? theme === 'dark'
                    ? 'border-sky-400/40 bg-sky-500/10 text-sky-200'
                    : 'border-sky-400/60 bg-sky-50 text-sky-600'
                  : theme === 'dark'
                    ? 'border-rose-400/40 bg-rose-500/10 text-rose-200'
                    : 'border-rose-400/60 bg-rose-50 text-rose-600'
              }`}>
                <confirmConfig.Icon className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <h3 className={`text-lg font-semibold ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  {confirmConfig.title}
                </h3>
                <p className={`mt-2 text-sm ${
                  theme === 'dark' ? 'text-slate-300' : 'text-gray-600'
                }`}>
                  {confirmConfig.description}
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                disabled={confirmProcessing}
                className={`inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  theme === 'dark'
                    ? 'border-slate-700/70 text-slate-200 hover:border-slate-500 hover:text-white'
                    : 'border-gray-300 text-gray-700 hover:border-gray-400 hover:text-gray-900'
                }`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={confirmProcessing}
                className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:scale-[1.02] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 ${
                  confirmConfig.tone === 'sky'
                    ? 'bg-gradient-to-r from-sky-500 to-blue-500 shadow-sky-500/20'
                    : 'bg-gradient-to-r from-rose-500 to-red-500 shadow-rose-500/20'
                }`}
              >
                {confirmProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Procesando…
                  </>
                ) : (
                  confirmConfig.confirmLabel
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
