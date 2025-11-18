'use client';

import { useState } from 'react';
import { X, Save } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import { createItinerario } from '@/lib/itinerarios-service';
import { useToast } from '@/hooks/useToast';

interface NewVoyageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function NewVoyageModal({ isOpen, onClose, onSuccess }: NewVoyageModalProps) {
  const { success, error } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    servicio: '',
    consorcio: '',
    nave: '',
    viaje: '',
    semana: '',
    pol: '',
    etd: '',
  });

  if (!isOpen) return null;

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      await createItinerario({
        servicio: form.servicio,
        consorcio: form.consorcio || null,
        nave: form.nave,
        viaje: form.viaje,
        semana: form.semana ? parseInt(form.semana) : null,
        pol: form.pol,
        etd: form.etd || null,
      });

      success('Viaje creado correctamente');
      setForm({
        servicio: '',
        consorcio: '',
        nave: '',
        viaje: '',
        semana: '',
        pol: '',
        etd: '',
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error creating voyage:', err);
      error(err?.message || 'Error al crear el viaje');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-800 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Nuevo Viaje
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Completa la información del viaje
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                Servicio *
              </label>
              <input
                type="text"
                required
                value={form.servicio}
                onChange={(e) => handleChange('servicio', e.target.value)}
                placeholder="Ej: AX2/AN2"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#00AEEF] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                Consorcio
              </label>
              <input
                type="text"
                value={form.consorcio}
                onChange={(e) => handleChange('consorcio', e.target.value)}
                placeholder="Ej: MSC + Hapag + ONE"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#00AEEF] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                Nave *
              </label>
              <input
                type="text"
                required
                value={form.nave}
                onChange={(e) => handleChange('nave', e.target.value)}
                placeholder="Ej: MSC VIRGO"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#00AEEF] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                Viaje *
              </label>
              <input
                type="text"
                required
                value={form.viaje}
                onChange={(e) => handleChange('viaje', e.target.value)}
                placeholder="Ej: FA532R"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#00AEEF] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                Semana
              </label>
              <input
                type="number"
                min="1"
                max="53"
                value={form.semana}
                onChange={(e) => handleChange('semana', e.target.value)}
                placeholder="Ej: 42"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#00AEEF] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                POL *
              </label>
              <input
                type="text"
                required
                value={form.pol}
                onChange={(e) => handleChange('pol', e.target.value)}
                placeholder="Ej: SAN ANTONIO"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#00AEEF] focus:border-transparent"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                ETD
              </label>
              <input
                type="date"
                value={form.etd}
                onChange={(e) => handleChange('etd', e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#00AEEF] focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-6 py-2 text-sm font-semibold text-white bg-[#00AEEF] hover:bg-[#4FC3F7] rounded-lg transition-all duration-150 shadow-sm hover:shadow-md disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Guardando...' : 'Crear Viaje'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

