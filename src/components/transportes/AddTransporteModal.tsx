'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
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
  | 'transporte'
  | 'conductor'
  | 'rut'
  | 'telefono'
  | 'patente'
  | 'from_registros'
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
  transport: '',
  conductor: '',
  rut: '',
  telefono: '',
  patente: '',
  from_registros: false,
};

export function AddTransporteModal({ isOpen, onClose, onSuccess }: AddTransporteModalProps) {
  const [form, setForm] = useState<FormState>(initialState);
  const [isSaving, setIsSaving] = useState(false);
  const [catalogs, setCatalogs] = useState<Record<string, string[]>>({});
  const [searchValue, setSearchValue] = useState('');
  const [isSearching, setIsSearching] = useState(false);
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

  const handleSearchRegistro = async () => {
    if (!searchValue.trim()) {
      error('Por favor ingresa un REF ASLI, Booking o Contenedor');
      return;
    }

    setIsSearching(true);
    try {
      const supabase = createClient();
      const searchTerm = searchValue.trim().toUpperCase();

      // Buscar por ref_asli, booking o contenedor
      const { data, error: searchError } = await supabase
        .from('registros')
        .select('*')
        .or(`ref_asli.ilike.%${searchTerm}%,booking.ilike.%${searchTerm}%,contenedor.ilike.%${searchTerm}%`)
        .is('deleted_at', null)
        .limit(1);

      if (searchError) {
        throw searchError;
      }

      if (!data || data.length === 0) {
        error('No se encontró ningún registro con ese REF ASLI, Booking o Contenedor');
        setIsSearching(false);
        return;
      }

      const registro = data[0];

      // Mapear los datos del registro al formulario de transporte
      const contenedorValue = Array.isArray(registro.contenedor) 
        ? registro.contenedor[0] || registro.contenedor.join(' ')
        : registro.contenedor || '';

      const formatDate = (date: string | null) => {
        if (!date) return '';
        try {
          const d = new Date(date);
          return d.toISOString().split('T')[0];
        } catch {
          return '';
        }
      };

      setForm({
        booking: registro.booking || '',
        contenedor: contenedorValue,
        nave: registro.nave_inicial || '',
        naviera: registro.naviera || '',
        especie: registro.especie || '',
        temperatura: registro.temperatura || null,
        pol: registro.pol || '',
        pod: registro.pod || '',
        deposito: registro.deposito || '',
        stacking: formatDate(registro.ingreso_stacking),
        cut_off: formatDate(registro.etd),
        // Mantener los valores existentes para campos que no se mapean
        semana: form.semana,
        exportacion: form.exportacion,
        planta: form.planta,
        late: form.late || false,
        sello: form.sello,
        tara: form.tara,
        vent: form.vent,
        fecha_planta: form.fecha_planta,
        guia_despacho: form.guia_despacho,
        transporte: form.transporte,
        conductor: form.conductor,
        rut: form.rut,
        telefono: form.telefono,
        patente: form.patente,
        // Marcar que viene de registros
        from_registros: true,
      });

      success(`Datos cargados desde registro ${registro.ref_asli || 'encontrado'}`);
      setSearchValue('');
    } catch (err: any) {
      console.error('Error buscando registro:', err);
      error('Error al buscar el registro');
    } finally {
      setIsSearching(false);
    }
  };

  const resetAndClose = () => {
    setForm(initialState);
    setSearchValue('');
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
    } catch (err: any) {
      console.error('Error creating transporte:', err);
      const errorMessage = err?.message || err?.error?.message || 'No se pudo crear el registro de transporte.';
      error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="w-full max-w-4xl rounded-3xl border border-slate-800/70 bg-slate-950/95 shadow-2xl shadow-slate-950/50 overflow-hidden backdrop-blur-xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800/60 bg-slate-900/50">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500 mb-1">Registro de Transporte</p>
            <h2 className="text-xl font-semibold text-white">Nuevo Transporte</h2>
            <p className="text-sm text-slate-400 mt-1">
              Completa la información del transporte para agregarlo al registro.
            </p>
          </div>
          <button
            onClick={resetAndClose}
            className="rounded-full p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500/50"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-6 bg-slate-950/50">
          {/* Campo de búsqueda */}
          <div className="rounded-2xl border border-sky-500/40 bg-sky-500/10 p-5 space-y-3 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-sky-200">Buscar por REF ASLI, Booking o Contenedor</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearchRegistro();
                  }
                }}
                placeholder="Ej: A0001, MSCU1234567, CONT123456"
                className="flex-1 rounded-xl border border-sky-400/50 bg-slate-900/80 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/70 transition-colors"
                disabled={isSearching}
              />
              <button
                type="button"
                onClick={handleSearchRegistro}
                disabled={isSearching || !searchValue.trim()}
                className="rounded-xl border border-sky-500/60 bg-sky-500/20 px-4 py-2.5 text-sm font-semibold text-sky-200 hover:bg-sky-500/30 hover:border-sky-400/80 focus:outline-none focus:ring-2 focus:ring-sky-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSearching ? 'Buscando...' : 'Buscar y Rellenar'}
              </button>
            </div>
            <p className="text-xs text-sky-300/70">
              Ingresa un REF ASLI, Booking o Contenedor para rellenar automáticamente los campos del formulario
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-slate-300">Semana</span>
              <input
                type="number"
                value={form.semana ?? ''}
                onChange={(e) => handleChange('semana', e.target.value ? Number(e.target.value) : null)}
                className="rounded-xl border border-slate-800/70 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/70 transition-colors"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-slate-300">Export.</span>
              <input
                type="text"
                value={form.exportacion ?? ''}
                onChange={(e) => handleChange('exportacion', e.target.value)}
                className="rounded-xl border border-slate-800/70 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/70 transition-colors"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-slate-300">Planta</span>
              <input
                type="text"
                value={form.planta ?? ''}
                onChange={(e) => handleChange('planta', e.target.value)}
                list="catalogo-plantas"
                className="rounded-xl border border-slate-800/70 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/70 transition-colors"
              />
              <datalist id="catalogo-plantas">
                {catalogs['plantas']?.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-slate-300">Depósito</span>
              <input
                type="text"
                value={form.deposito ?? ''}
                onChange={(e) => handleChange('deposito', e.target.value)}
                list="catalogo-depositos"
                className="rounded-xl border border-slate-800/70 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/70 transition-colors"
              />
              <datalist id="catalogo-depositos">
                {catalogs['depositos']?.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-slate-300">Booking</span>
              <input
                type="text"
                value={form.booking ?? ''}
                onChange={(e) => handleChange('booking', e.target.value)}
                className="rounded-xl border border-slate-800/70 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/70 transition-colors"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-slate-300">Nave</span>
              <input
                type="text"
                value={form.nave ?? ''}
                onChange={(e) => handleChange('nave', e.target.value)}
                list="catalogo-naves"
                className="rounded-xl border border-slate-800/70 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/70 transition-colors"
              />
              <datalist id="catalogo-naves">
                {catalogs['naves']?.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-slate-300">Naviera</span>
              <input
                type="text"
                value={form.naviera ?? ''}
                onChange={(e) => handleChange('naviera', e.target.value)}
                list="catalogo-navieras"
                className="rounded-xl border border-slate-800/70 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/70 transition-colors"
              />
              <datalist id="catalogo-navieras">
                {catalogs['navieras']?.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-slate-300">Stacking</span>
              <input
                type="date"
                value={form.stacking ?? ''}
                onChange={(e) => handleChange('stacking', e.target.value)}
                className="rounded-xl border border-slate-800/70 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/70 transition-colors"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-slate-300">Cut Off</span>
              <input
                type="date"
                value={form.cut_off ?? ''}
                onChange={(e) => handleChange('cut_off', e.target.value)}
                className="rounded-xl border border-slate-800/70 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/70 transition-colors"
              />
            </label>

            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 pt-6">
              <input
                type="checkbox"
                checked={form.late ?? false}
                onChange={(e) => handleChange('late', e.target.checked)}
                className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-sky-500 focus:ring-sky-500/50"
              />
              Late
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-slate-300">Contenedor</span>
              <input
                type="text"
                value={form.contenedor ?? ''}
                onChange={(e) => handleChange('contenedor', e.target.value)}
                className="rounded-xl border border-slate-800/70 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/70 transition-colors"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-slate-300">Sello</span>
              <input
                type="text"
                value={form.sello ?? ''}
                onChange={(e) => handleChange('sello', e.target.value)}
                className="rounded-xl border border-slate-800/70 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/70 transition-colors"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-slate-300">Tara</span>
              <input
                type="number"
                value={form.tara ?? ''}
                onChange={(e) => handleChange('tara', e.target.value ? Number(e.target.value) : null)}
                className="rounded-xl border border-slate-800/70 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/70 transition-colors"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-slate-300">Especie</span>
              <input
                type="text"
                value={form.especie ?? ''}
                onChange={(e) => handleChange('especie', e.target.value)}
                list="catalogo-especies"
                className="rounded-xl border border-slate-800/70 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/70 transition-colors"
              />
              <datalist id="catalogo-especies">
                {catalogs['especies']?.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-slate-300">Temperatura</span>
              <input
                type="number"
                value={form.temperatura ?? ''}
                onChange={(e) => handleChange('temperatura', e.target.value ? Number(e.target.value) : null)}
                className="rounded-xl border border-slate-800/70 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/70 transition-colors"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-slate-300">Vent</span>
              <input
                type="text"
                value={form.vent ?? ''}
                onChange={(e) => handleChange('vent', e.target.value)}
                className="rounded-xl border border-slate-800/70 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/70 transition-colors"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-slate-300">POL</span>
              <input
                type="text"
                value={form.pol ?? ''}
                onChange={(e) => handleChange('pol', e.target.value)}
                list="catalogo-pols"
                className="rounded-xl border border-slate-800/70 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/70 transition-colors"
              />
              <datalist id="catalogo-pols">
                {catalogs['pols']?.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-slate-300">POD</span>
              <input
                type="text"
                value={form.pod ?? ''}
                onChange={(e) => handleChange('pod', e.target.value)}
                list="catalogo-destinos"
                className="rounded-xl border border-slate-800/70 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/70 transition-colors"
              />
              <datalist id="catalogo-destinos">
                {catalogs['destinos']?.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-slate-300">Fecha Planta</span>
              <input
                type="date"
                value={form.fecha_planta ?? ''}
                onChange={(e) => handleChange('fecha_planta', e.target.value)}
                className="rounded-xl border border-slate-800/70 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/70 transition-colors"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-slate-300">Guía Despacho</span>
              <input
                type="text"
                value={form.guia_despacho ?? ''}
                onChange={(e) => handleChange('guia_despacho', e.target.value)}
                className="rounded-xl border border-slate-800/70 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/70 transition-colors"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-slate-300">Transporte</span>
              <input
                type="text"
                value={form.transporte ?? ''}
                onChange={(e) => handleChange('transporte', e.target.value)}
                className="rounded-xl border border-slate-800/70 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/70 transition-colors"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-slate-300">Conductor</span>
              <input
                type="text"
                value={form.conductor ?? ''}
                onChange={(e) => handleChange('conductor', e.target.value)}
                className="rounded-xl border border-slate-800/70 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/70 transition-colors"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-slate-300">RUT</span>
              <input
                type="text"
                value={form.rut ?? ''}
                onChange={(e) => handleChange('rut', e.target.value)}
                className="rounded-xl border border-slate-800/70 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/70 transition-colors"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-slate-300">Teléfono</span>
              <input
                type="text"
                value={form.telefono ?? ''}
                onChange={(e) => handleChange('telefono', e.target.value)}
                className="rounded-xl border border-slate-800/70 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/70 transition-colors"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm lg:col-span-3">
              <span className="font-medium text-slate-300">Patente</span>
              <input
                type="text"
                value={form.patente ?? ''}
                onChange={(e) => handleChange('patente', e.target.value)}
                className="rounded-xl border border-slate-800/70 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/70 transition-colors"
              />
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800/60">
            <button
              type="button"
              onClick={resetAndClose}
              className="rounded-xl border border-slate-800/70 bg-slate-900/50 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800/70 hover:border-slate-700/80 focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-xl border border-sky-500/60 bg-sky-500/20 px-4 py-2.5 text-sm font-semibold text-sky-200 hover:bg-sky-500/30 hover:border-sky-400/80 focus:outline-none focus:ring-2 focus:ring-sky-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? 'Guardando...' : 'Guardar Transporte'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

