'use client';

import { useState, useEffect } from 'react';
import { createTransporte, TransporteRecord } from '@/lib/transportes-service';
import { useToast } from '@/hooks/useToast';
import { createClient } from '@/lib/supabase-browser';

type FormState = Partial<Pick<
  TransporteRecord,
  | 'semana'
  | 'exportacion'
  | 'planta'
  | 'deposito'
  | 'booking'
  | 'nave'
  | 'naviera'
  | 'stacking'
  | 'cut_off'
  | 'late'
  | 'contenedor'
  | 'sello'
  | 'tara'
  | 'especie'
  | 'temperatura'
  | 'vent'
  | 'pol'
  | 'pod'
  | 'fecha_planta'
  | 'guia_despacho'
  | 'transportes'
  | 'conductor'
  | 'rut'
  | 'fono'
  | 'patentes'
>>;

interface AddTransporteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const initialState: FormState = {
  semana: null,
  exportacion: '',
  planta: '',
  deposito: '',
  booking: '',
  nave: '',
  naviera: '',
  stacking: '',
  cut_off: '',
  late: false,
  contenedor: '',
  sello: '',
  tara: null,
  especie: '',
  temperatura: null,
  vent: '',
  pol: '',
  pod: '',
  fecha_planta: '',
  guia_despacho: '',
  transportes: '',
  conductor: '',
  rut: '',
  fono: '',
  patentes: '',
};

export function AddTransporteModal({ isOpen, onClose, onSuccess }: AddTransporteModalProps) {
  const [form, setForm] = useState<FormState>(initialState);
  const [isSaving, setIsSaving] = useState(false);
  const [catalogs, setCatalogs] = useState<Record<string, string[]>>({});
  const { success, error } = useToast();

  useEffect(() => {
    const loadCatalogs = async () => {
      try {
        const supabase = createClient();
        const { data, error: catalogError } = await supabase
          .from('catalogos')
          .select('categoria, valores');

        if (catalogError) {
          console.error('Error fetching catalogos:', catalogError);
          return;
        }

        const mapping: Record<string, string[]> = {};
        data?.forEach((item) => {
          mapping[item.categoria] = item.valores ?? [];
        });
        setCatalogs(mapping);
      } catch (err) {
        console.error('Unexpected error loading catalogos:', err);
      }
    };

    if (isOpen && Object.keys(catalogs).length === 0) {
      loadCatalogs();
    }
  }, [isOpen, catalogs]);

  const handleChange = (field: keyof FormState, value: string | number | boolean | null) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const resetAndClose = () => {
    setForm(initialState);
    onClose();
  };

  const handleSubmit = async (evt: React.FormEvent<HTMLFormElement>) => {
    evt.preventDefault();
    setIsSaving(true);
    try {
      await createTransporte(form);
      success('Registro de transporte creado correctamente.');
      resetAndClose();
      onSuccess();
    } catch (err) {
      console.error('Error creating transporte:', err);
      error('No se pudo crear el registro de transporte.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-4xl rounded-2xl bg-white dark:bg-gray-900 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Nuevo Transporte</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Completa la información del transporte para agregarlo al registro.
            </p>
          </div>
          <button
            onClick={resetAndClose}
            className="rounded-full p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[70vh] overflow-y-auto px-6 py-4 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-gray-700 dark:text-gray-300">Semana</span>
              <input
                type="number"
                value={form.semana ?? ''}
                onChange={(e) => handleChange('semana', e.target.value ? Number(e.target.value) : null)}
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-gray-700 dark:text-gray-300">Export.</span>
              <input
                type="text"
                value={form.exportacion ?? ''}
                onChange={(e) => handleChange('exportacion', e.target.value)}
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-gray-700 dark:text-gray-300">Planta</span>
              <input
                type="text"
                value={form.planta ?? ''}
                onChange={(e) => handleChange('planta', e.target.value)}
                list="catalogo-plantas"
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <datalist id="catalogo-plantas">
                {catalogs['plantas']?.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-gray-700 dark:text-gray-300">Depósito</span>
              <input
                type="text"
                value={form.deposito ?? ''}
                onChange={(e) => handleChange('deposito', e.target.value)}
                list="catalogo-depositos"
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <datalist id="catalogo-depositos">
                {catalogs['depositos']?.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-gray-700 dark:text-gray-300">Booking</span>
              <input
                type="text"
                value={form.booking ?? ''}
                onChange={(e) => handleChange('booking', e.target.value)}
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-gray-700 dark:text-gray-300">Nave</span>
              <input
                type="text"
                value={form.nave ?? ''}
                onChange={(e) => handleChange('nave', e.target.value)}
                list="catalogo-naves"
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <datalist id="catalogo-naves">
                {catalogs['naves']?.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-gray-700 dark:text-gray-300">Naviera</span>
              <input
                type="text"
                value={form.naviera ?? ''}
                onChange={(e) => handleChange('naviera', e.target.value)}
                list="catalogo-navieras"
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <datalist id="catalogo-navieras">
                {catalogs['navieras']?.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-gray-700 dark:text-gray-300">Stacking</span>
              <input
                type="date"
                value={form.stacking ?? ''}
                onChange={(e) => handleChange('stacking', e.target.value)}
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-gray-700 dark:text-gray-300">Cut Off</span>
              <input
                type="date"
                value={form.cut_off ?? ''}
                onChange={(e) => handleChange('cut_off', e.target.value)}
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>

            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={form.late ?? false}
                onChange={(e) => handleChange('late', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Late
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-gray-700 dark:text-gray-300">Contenedor</span>
              <input
                type="text"
                value={form.contenedor ?? ''}
                onChange={(e) => handleChange('contenedor', e.target.value)}
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-gray-700 dark:text-gray-300">Sello</span>
              <input
                type="text"
                value={form.sello ?? ''}
                onChange={(e) => handleChange('sello', e.target.value)}
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-gray-700 dark:text-gray-300">Tara</span>
              <input
                type="number"
                value={form.tara ?? ''}
                onChange={(e) => handleChange('tara', e.target.value ? Number(e.target.value) : null)}
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-gray-700 dark:text-gray-300">Especie</span>
              <input
                type="text"
                value={form.especie ?? ''}
                onChange={(e) => handleChange('especie', e.target.value)}
                list="catalogo-especies"
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <datalist id="catalogo-especies">
                {catalogs['especies']?.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-gray-700 dark:text-gray-300">Temperatura</span>
              <input
                type="number"
                value={form.temperatura ?? ''}
                onChange={(e) => handleChange('temperatura', e.target.value ? Number(e.target.value) : null)}
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-gray-700 dark:text-gray-300">Vent</span>
              <input
                type="text"
                value={form.vent ?? ''}
                onChange={(e) => handleChange('vent', e.target.value)}
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-gray-700 dark:text-gray-300">POL</span>
              <input
                type="text"
                value={form.pol ?? ''}
                onChange={(e) => handleChange('pol', e.target.value)}
                list="catalogo-pols"
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <datalist id="catalogo-pols">
                {catalogs['pols']?.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-gray-700 dark:text-gray-300">POD</span>
              <input
                type="text"
                value={form.pod ?? ''}
                onChange={(e) => handleChange('pod', e.target.value)}
                list="catalogo-destinos"
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <datalist id="catalogo-destinos">
                {catalogs['destinos']?.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-gray-700 dark:text-gray-300">Fecha Planta</span>
              <input
                type="date"
                value={form.fecha_planta ?? ''}
                onChange={(e) => handleChange('fecha_planta', e.target.value)}
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-gray-700 dark:text-gray-300">Guía Despacho</span>
              <input
                type="text"
                value={form.guia_despacho ?? ''}
                onChange={(e) => handleChange('guia_despacho', e.target.value)}
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-gray-700 dark:text-gray-300">Transportes</span>
              <input
                type="text"
                value={form.transportes ?? ''}
                onChange={(e) => handleChange('transportes', e.target.value)}
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-gray-700 dark:text-gray-300">Conductor</span>
              <input
                type="text"
                value={form.conductor ?? ''}
                onChange={(e) => handleChange('conductor', e.target.value)}
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-gray-700 dark:text-gray-300">RUT</span>
              <input
                type="text"
                value={form.rut ?? ''}
                onChange={(e) => handleChange('rut', e.target.value)}
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-gray-700 dark:text-gray-300">Fono</span>
              <input
                type="text"
                value={form.fono ?? ''}
                onChange={(e) => handleChange('fono', e.target.value)}
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm lg:col-span-3">
              <span className="font-medium text-gray-700 dark:text-gray-300">Patentes</span>
              <input
                type="text"
                value={form.patentes ?? ''}
                onChange={(e) => handleChange('patentes', e.target.value)}
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={resetAndClose}
              className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
            >
              {isSaving ? 'Guardando...' : 'Guardar Transporte'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

