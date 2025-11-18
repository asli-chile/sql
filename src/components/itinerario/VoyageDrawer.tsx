'use client';

import { useState, useEffect } from 'react';
import { X, Save, Trash2, Plus } from 'lucide-react';
import type { ItinerarioWithEscalas, ItinerarioEscala } from '@/types/itinerarios';
import { createClient } from '@/lib/supabase-browser';
import { useToast } from '@/hooks/useToast';

interface VoyageDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  itinerario: ItinerarioWithEscalas | null;
  onSave: () => void;
  onDelete: () => void;
}

export function VoyageDrawer({
  isOpen,
  onClose,
  itinerario,
  onSave,
  onDelete,
}: VoyageDrawerProps) {
  const { success, error } = useToast();
  const [escalas, setEscalas] = useState<ItinerarioEscala[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (itinerario) {
      setEscalas(
        [...(itinerario.escalas || [])].sort((a, b) => a.orden - b.orden)
      );
    }
  }, [itinerario]);

  if (!isOpen || !itinerario) return null;

  const handleEtaChange = (escalaId: string, eta: string) => {
    setEscalas((prev) =>
      prev.map((e) => {
        if (e.id === escalaId) {
          const newEta = eta || null;
          // Calcular días de tránsito si hay ETD y ETA
          let diasTransito = e.dias_transito;
          if (itinerario.etd && newEta) {
            try {
              const etdDate = new Date(itinerario.etd);
              const etaDate = new Date(newEta);
              const diffTime = etaDate.getTime() - etdDate.getTime();
              diasTransito = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            } catch {
              // Ignorar errores de fecha
            }
          }
          return { ...e, eta: newEta, dias_transito: diasTransito };
        }
        return e;
      })
    );
  };

  const handleAddEscala = () => {
    const newEscala: Partial<ItinerarioEscala> = {
      id: `temp-${Date.now()}`,
      itinerario_id: itinerario.id,
      puerto: '',
      puerto_nombre: null,
      eta: null,
      dias_transito: null,
      orden: escalas.length + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setEscalas([...escalas, newEscala as ItinerarioEscala]);
  };

  const handleRemoveEscala = (escalaId: string) => {
    setEscalas((prev) => prev.filter((e) => e.id !== escalaId));
  };

  const handleSave = async () => {
    if (!itinerario) return;

    setIsSaving(true);
    try {
      const supabase = createClient();

      // Eliminar escalas existentes y crear nuevas
      const { error: deleteError } = await supabase
        .from('itinerario_escalas')
        .delete()
        .eq('itinerario_id', itinerario.id);

      if (deleteError) throw deleteError;

      // Insertar escalas actualizadas
      const escalasToInsert = escalas
        .filter((e) => e.puerto) // Solo escalas con puerto
        .map((e, index) => ({
          itinerario_id: itinerario.id,
          puerto: e.puerto,
          puerto_nombre: e.puerto_nombre,
          eta: e.eta,
          dias_transito: e.dias_transito,
          orden: index + 1,
        }));

      if (escalasToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('itinerario_escalas')
          .insert(escalasToInsert);

        if (insertError) throw insertError;
      }

      success('Itinerario actualizado correctamente');
      onSave();
      onClose();
    } catch (err: any) {
      console.error('Error guardando itinerario:', err);
      error(err?.message || 'Error al guardar el itinerario');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!itinerario) return;
    if (!confirm('¿Estás seguro de eliminar este viaje? Esta acción no se puede deshacer.')) {
      return;
    }

    setIsDeleting(true);
    try {
      const supabase = createClient();
      const { error: deleteError } = await supabase
        .from('itinerarios')
        .delete()
        .eq('id', itinerario.id);

      if (deleteError) throw deleteError;

      success('Viaje eliminado correctamente');
      onDelete();
      onClose();
    } catch (err: any) {
      console.error('Error eliminando itinerario:', err);
      error(err?.message || 'Error al eliminar el viaje');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-300 ${
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`absolute right-0 top-0 h-full w-full max-w-2xl bg-white dark:bg-slate-800 shadow-2xl transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-6 py-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Detalle de Viaje
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {itinerario.servicio}
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {/* Información del viaje */}
            <div className="mb-6 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                  Servicio
                </label>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-1">
                  {itinerario.servicio}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                  Nave
                </label>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-1">
                  {itinerario.nave}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                  Viaje
                </label>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-1">
                  {itinerario.viaje}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                    Semana
                  </label>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-1">
                    {itinerario.semana || '—'}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                    POL
                  </label>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-1">
                    {itinerario.pol}
                  </p>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                  ETD
                </label>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-1">
                  {itinerario.etd
                    ? new Date(itinerario.etd).toLocaleDateString('es-CL')
                    : '—'}
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-slate-200 dark:border-slate-700 my-6" />

            {/* Escalas */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Escalas (PODs)
                </h3>
                <button
                  onClick={handleAddEscala}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#00AEEF] hover:text-[#4FC3F7] hover:bg-[#00AEEF]/10 dark:hover:bg-[#4FC3F7]/20 rounded-lg transition-all duration-150"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Agregar escala
                </button>
              </div>

              <div className="space-y-3">
                {escalas.map((escala, index) => (
                  <div
                    key={escala.id}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 p-4"
                  >
                    <div className="grid grid-cols-12 gap-4 items-end">
                      <div className="col-span-5">
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                          Puerto
                        </label>
                        <input
                          type="text"
                          value={escala.puerto}
                          onChange={(e) => {
                            setEscalas((prev) =>
                              prev.map((esc) =>
                                esc.id === escala.id
                                  ? { ...esc, puerto: e.target.value }
                                  : esc
                              )
                            );
                          }}
                          placeholder="Ej: YOKO"
                          className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#00AEEF] focus:border-transparent"
                        />
                      </div>
                      <div className="col-span-5">
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                          ETA
                        </label>
                        <input
                          type="date"
                          value={escala.eta ? escala.eta.split('T')[0] : ''}
                          onChange={(e) => handleEtaChange(escala.id, e.target.value)}
                          className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#00AEEF] focus:border-transparent"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                          Días
                        </label>
                        <div className="px-3 py-2 text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 rounded-lg">
                          {escala.dias_transito || '—'}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveEscala(escala.id)}
                      className="mt-2 text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    >
                      Eliminar
                    </button>
                  </div>
                ))}

                {escalas.length === 0 && (
                  <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">
                    No hay escalas registradas. Haz clic en "Agregar escala" para comenzar.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-150 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              {isDeleting ? 'Eliminando...' : 'Eliminar viaje'}
            </button>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-6 py-2 text-sm font-semibold text-white bg-[#00AEEF] hover:bg-[#4FC3F7] rounded-lg transition-all duration-150 shadow-sm hover:shadow-md disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {isSaving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

