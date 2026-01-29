'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { Registro } from '@/types/registros';
import { supabase } from '@/lib/supabase-mobile';
import { parseDateString, formatDateForDisplay, formatDateForInput } from '@/lib/date-utils';
import { calculateTransitTime } from '@/lib/transit-time-utils';
import { logHistoryEntry, mapRegistroFieldToDb } from '@/lib/history';
import { syncTransportesFromRegistro } from '@/lib/sync-transportes';
import { convertSupabaseToApp } from '@/lib/migration-utils';

interface EditModalProps {
  record: Registro | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  navierasUnicas?: string[];
  navesUnicas?: string[];
  fletesUnicos?: string[];
  temperaturasUnicas?: string[];
  navierasNavesMapping?: Record<string, string[]>;
  consorciosNavesMapping?: Record<string, string[]>;
  refExternasUnicas?: string[];
  tratamientosDeFrioOpciones?: string[];
}

const VIAJE_REQUIRED_MESSAGE = 'El número de viaje es obligatorio cuando hay una nave seleccionada';

const sanitizeNaveName = (nave?: string | null) => {
  if (!nave) {
    return '';
  }

  const match = nave.match(/^(.+?)\s*\[(.+)\]$/);
  if (match) {
    return match[1].trim();
  }

  return nave.trim();
};

interface EditFormData {
  refAsli?: string;
  refCliente?: string;
  ejecutivo?: string;
  shipper?: string;
  booking?: string;
  contenedor?: string;
  naviera?: string;
  naveInicial?: string;
  viaje?: string;
  especie?: string;
  temperatura?: number | null;
  cbm?: number | null;
  co2?: number | null;
  o2?: number | null;
  tratamientoFrio?: string | null;
  pol?: string;
  pod?: string;
  deposito?: string;
  etd?: string; // String para input type="date"
  eta?: string; // String para input type="date"
  tt?: number | null;
  flete?: string;
  estado?: string;
  roleadaDesde?: string;
  tipoIngreso?: string;
  numeroBl?: string;
  estadoBl?: string;
  contrato?: string;
  semanaIngreso?: number | null;
  mesIngreso?: number | null;
  semanaZarpe?: number | null;
  mesZarpe?: number | null;
  semanaArribo?: number | null;
  mesArribo?: number | null;
  facturacion?: string;
  bookingPdf?: string;
  comentario?: string;
  observacion?: string;
  ingresoStacking?: string; // String para input type="date"
}

export function EditModal({
  record,
  isOpen,
  onClose,
  onSuccess,
  navierasUnicas = [],
  navesUnicas = [],
  fletesUnicos = [],
  temperaturasUnicas = [],
  navierasNavesMapping = {},
  consorciosNavesMapping = {},
  refExternasUnicas = [],
  tratamientosDeFrioOpciones = [],
}: EditModalProps) {

  // Función para procesar contenedores múltiples
  const processContainers = (containerValue: string): string => {
    if (!containerValue || containerValue.trim() === '') {
      return '';
    }

    // Convertir a mayúsculas y limpiar espacios múltiples
    // Mantener formato: "CONT1 CONT2 CONT3"
    return containerValue.trim().split(/\s+/).map(c => c.toUpperCase()).join(' ');
  };
  const [formData, setFormData] = useState<EditFormData>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const viajeInputRef = useRef<HTMLInputElement>(null);

  const labelClasses =
    'block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400';
  const inputClasses =
    'w-full rounded-xl border border-slate-800/60 bg-slate-900/70 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30';
  const selectClasses = inputClasses;
  const textAreaClasses =
    'w-full rounded-xl border border-slate-800/60 bg-slate-900/70 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30';
  const summaryValueClasses =
    'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold';
  const tipoIngresoBadge: Record<string, string> = {
    NORMAL: 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200',
    EARLY: 'border-cyan-400/40 bg-cyan-500/15 text-cyan-200',
    LATE: 'border-amber-400/40 bg-amber-500/15 text-amber-200',
    'EXTRA LATE': 'border-rose-400/40 bg-rose-500/15 text-rose-200',
  };

  const handleCloseModal = () => {
    if (!loading) {
      onClose();
    }
  };

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      handleCloseModal();
    }
  };

  // Inicializar el formulario cuando se abre el modal
  useEffect(() => {
    if (record) {
      const rawNaveInicial = typeof record.naveInicial === 'string' ? record.naveInicial : '';
      const sanitizedNave = sanitizeNaveName(rawNaveInicial);
      let extractedViaje = record.viaje ?? '';
      const viajeMatch = rawNaveInicial.match(/^(.+?)\s*\[(.+)\]$/);
      if (viajeMatch && !extractedViaje) {
        extractedViaje = viajeMatch[2].trim();
      }

      setFormData({
        refAsli: record.refAsli || '',
        refCliente: record.refCliente || '',
        ejecutivo: record.ejecutivo || '',
        shipper: record.shipper || '',
        booking: record.booking || '',
        contenedor: Array.isArray(record.contenedor) ? record.contenedor.join(' ') : record.contenedor || '',
        naviera: record.naviera || '',
        naveInicial: sanitizedNave,
        viaje: extractedViaje || '',
        especie: record.especie || '',
        temperatura: record.temperatura || null,
        cbm: record.cbm || null,
        co2: record.co2 || null,
        o2: record.o2 || null,
        tratamientoFrio: record.tratamientoFrio || '',
        pol: record.pol || '',
        pod: record.pod || '',
        deposito: record.deposito || '',
        etd: record.etd ? formatDateForInput(record.etd) : '',
        eta: record.eta ? formatDateForInput(record.eta) : '',
        tt: record.tt || null,
        flete: record.flete || '',
        estado: record.estado || 'PENDIENTE',
        roleadaDesde: record.roleadaDesde || '',
        tipoIngreso: record.tipoIngreso || 'NORMAL',
        numeroBl: record.numeroBl || '',
        estadoBl: record.estadoBl || '',
        contrato: record.contrato || '',
        facturacion: record.facturacion || '',
        bookingPdf: record.bookingPdf || '',
        comentario: record.comentario || '',
        observacion: record.observacion || '',
        ingresoStacking: record.ingresoStacking ? formatDateForInput(record.ingresoStacking) : '',
      });
      setError('');
    }
  }, [record]);

  const upsertRefClienteCatalog = async (valor: string | null | undefined) => {
    const trimmed = (valor || '').trim();
    if (!trimmed) return;

    try {
      const { data, error } = await supabase
        .from('catalogos')
        .select('id, valores')
        .eq('categoria', 'refCliente')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error leyendo catálogo refCliente:', error);
        return;
      }

      let valores: string[] = [];
      let recordId: string | undefined;

      if (data) {
        recordId = (data as any).id;
        valores = Array.isArray(data.valores) ? data.valores : [];
      }

      if (!valores.includes(trimmed)) {
        const nuevosValores = [...valores, trimmed];
        const payload = {
          categoria: 'refCliente',
          valores: nuevosValores,
          updated_at: new Date().toISOString(),
        };

        if (recordId) {
          await supabase
            .from('catalogos')
            .update(payload)
            .eq('id', recordId);
        } else {
          await supabase
            .from('catalogos')
            .insert({ ...payload, created_at: new Date().toISOString() });
        }
      }
    } catch (catalogError) {
      console.error('Error actualizando catálogo refCliente:', catalogError);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!record || !record.id) return;

    setLoading(true);
    setError('');

    try {
      const naveBase = sanitizeNaveName(formData.naveInicial);
      const viajeTrimmed = formData.viaje ? formData.viaje.trim() : '';

      if (naveBase && !viajeTrimmed) {
        setError(VIAJE_REQUIRED_MESSAGE);
        setLoading(false);
        setTimeout(() => {
          viajeInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          viajeInputRef.current?.focus();
        }, 100);
        return;
      }

      const touchedFields = new Set<keyof Registro>();
      const updatedData: Record<string, unknown> = {};

      const setField = (field: keyof Registro, value: unknown) => {
        if (value === undefined) {
          return;
        }
        const dbField = mapRegistroFieldToDb(field);
        updatedData[dbField] = value;
        touchedFields.add(field);
      };

      setField('refAsli', formData.refAsli);
      setField('refCliente', formData.refCliente);
      setField('ejecutivo', formData.ejecutivo);
      setField('shipper', formData.shipper);
      setField('booking', formData.booking);
      setField('contenedor', formData.contenedor ? processContainers(formData.contenedor) : '');
      setField('naviera', formData.naviera);
      setField('especie', formData.especie);
      setField('temperatura', formData.temperatura === null ? null : formData.temperatura);
      setField('cbm', formData.cbm === null ? null : formData.cbm);
      setField('co2', formData.co2 === null ? null : formData.co2);
      setField('o2', formData.o2 === null ? null : formData.o2);
      setField('tratamientoFrio', formData.tratamientoFrio ? formData.tratamientoFrio : null);
      setField('pol', formData.pol);
      setField('pod', formData.pod);
      setField('deposito', formData.deposito);

      const etdFormatted = formData.etd ? formatDateForInput(parseDateString(formData.etd)) : null;
      const etaFormatted = formData.eta ? formatDateForInput(parseDateString(formData.eta)) : null;
      setField('etd', etdFormatted);
      setField('eta', etaFormatted);
      setField('tt', (() => {
        const etdDate = formData.etd ? parseDateString(formData.etd) : null;
        const etaDate = formData.eta ? parseDateString(formData.eta) : null;
        return calculateTransitTime(etdDate, etaDate);
      })());

      setField('flete', formData.flete);
      setField('estado', formData.estado);
      setField('roleadaDesde', formData.roleadaDesde);
      setField(
        'ingresoStacking',
        formData.ingresoStacking ? formatDateForInput(parseDateString(formData.ingresoStacking)) : null
      );
      setField('tipoIngreso', formData.tipoIngreso);
      setField('numeroBl', formData.numeroBl);
      setField('estadoBl', formData.estadoBl);
      setField('contrato', formData.contrato);
      setField('semanaIngreso', formData.semanaIngreso === null ? null : formData.semanaIngreso);
      setField('mesIngreso', formData.mesIngreso === null ? null : formData.mesIngreso);
      setField('semanaZarpe', formData.semanaZarpe === null ? null : formData.semanaZarpe);
      setField('mesZarpe', formData.mesZarpe === null ? null : formData.mesZarpe);
      setField('semanaArribo', formData.semanaArribo === null ? null : formData.semanaArribo);
      setField('mesArribo', formData.mesArribo === null ? null : formData.mesArribo);
      setField('facturacion', formData.facturacion);
      setField('bookingPdf', formData.bookingPdf);
      setField('comentario', formData.comentario);
      setField('observacion', formData.observacion);

      const naveCompleta = naveBase ? (viajeTrimmed ? `${naveBase} [${viajeTrimmed}]` : naveBase) : null;
      setField('naveInicial', naveCompleta);
      setField('viaje', viajeTrimmed ? viajeTrimmed : null);

      updatedData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('registros')
        .update(updatedData)
        .eq('id', record.id)
        .select()
        .single();

      if (error) {
        console.error('Error al actualizar registro:', error);
        setError('Error al actualizar el registro. Por favor, intenta de nuevo.');
        return;
      }

      await upsertRefClienteCatalog(formData.refCliente);

      if (data) {
        const rowData = data as Record<string, unknown>;
        for (const field of touchedFields) {
          const dbField = mapRegistroFieldToDb(field);
          await logHistoryEntry(supabase, {
            registroId: record.id,
            field,
            previousValue: record[field],
            newValue: rowData[dbField] ?? updatedData[dbField],
          });
        }

        // Sincronizar con transportes relacionados
        try {
          const appRegistro = convertSupabaseToApp(data);
          await syncTransportesFromRegistro(appRegistro, record.booking);
        } catch (syncError) {
          console.warn('⚠️ Error al sincronizar transportes desde EditModal:', syncError);
        }
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error al actualizar registro:', err);
      setError('Error al actualizar el registro. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setError('');

    if (name === 'naviera') {
      setFormData((prev) => ({
        ...prev,
        naviera: value,
        naveInicial: '',
        viaje: '',
      }));
      return;
    }

    if (name === 'naveInicial') {
      const sanitizedValue = sanitizeNaveName(value);
      setFormData((prev) => ({
        ...prev,
        naveInicial: sanitizedValue,
        viaje: '',
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Función para obtener naves de consorcios especiales
  const getConsorcioNaves = (naviera: string) => {
    // Casos especiales de consorcios
    const consorciosEspeciales: Record<string, string[]> = {
      'HAPAG-LLOYD': ['HAPAG-LLOYD / ONE / MSC'],
      'ONE': ['HAPAG-LLOYD / ONE / MSC'],
      'MSC': ['HAPAG-LLOYD / ONE / MSC'],
      'PIL': ['PIL / YANG MING / WAN HAI'],
      'YANG MING': ['PIL / YANG MING / WAN HAI'],
      'WAN HAI': ['PIL / YANG MING / WAN HAI'],
    };

    return consorciosEspeciales[naviera] || [];
  };

  // Obtener naves disponibles basadas en la naviera seleccionada
  const getAvailableNaves = () => {
    const uniqueNaves = new Set<string>();

    if (!formData.naviera) {
      navesUnicas.forEach((nave) => {
        const sanitized = sanitizeNaveName(nave);
        if (sanitized) {
          uniqueNaves.add(sanitized);
        }
      });
      return Array.from(uniqueNaves).sort();
    }

    const navieraNaves = navierasNavesMapping[formData.naviera] || [];

    const consorciosEspeciales = getConsorcioNaves(formData.naviera);
    consorciosEspeciales.forEach((consorcio) => {
      const navesDelConsorcio = consorciosNavesMapping[consorcio] || [];
      navesDelConsorcio.forEach((nave) => {
        const sanitized = sanitizeNaveName(nave);
        if (sanitized) {
          uniqueNaves.add(sanitized);
        }
      });
    });

    const consorcioGeneralNaves = consorciosNavesMapping[formData.naviera] || [];

    [...navieraNaves, ...consorcioGeneralNaves].forEach((nave) => {
      const sanitized = sanitizeNaveName(nave);
      if (sanitized) {
        uniqueNaves.add(sanitized);
      }
    });

    return Array.from(uniqueNaves).sort();
  };

  if (!isOpen || !record) return null;

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/80 px-3 py-6 backdrop-blur"
      onClick={handleOverlayClick}
      role="presentation"
    >
      <div
        className="relative flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-800/60 bg-slate-950 shadow-2xl shadow-slate-950/60"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800/60 bg-slate-950/80 px-6 py-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
              Editor de Registros
            </p>
            <h2 className="text-lg font-semibold text-white">
              {record.refAsli}
            </h2>
          </div>
          <button
            onClick={handleCloseModal}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-800/70 bg-slate-900/70 text-slate-300 transition hover:border-slate-600 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
            aria-label="Cerrar editor"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          id="edit-registro-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-6 py-5 space-y-6"
        >
          {error && (
            <div className="flex items-center gap-2 rounded-2xl border border-rose-500/50 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          <section className="space-y-3 rounded-2xl border border-slate-800/60 bg-slate-900/60 p-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Información del registro
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <span className="block text-[10px] uppercase tracking-wide text-slate-500">
                  REF ASLI
                </span>
                <span
                  className={`${summaryValueClasses} ${tipoIngresoBadge[formData.tipoIngreso ?? 'NORMAL'] ??
                    tipoIngresoBadge.NORMAL
                    }`}
                >
                  {formData.refAsli}
                </span>
              </div>
              <div>
                <span className="block text-[10px] uppercase tracking-wide text-slate-500">
                  Ejecutivo
                </span>
                <span className={`${summaryValueClasses} border-slate-700/60 bg-slate-900/70 text-slate-200`}>
                  {formData.ejecutivo || '-'}
                </span>
              </div>
              <div>
                <span className="block text-[10px] uppercase tracking-wide text-slate-500">
                  Cliente
                </span>
                <span className={`${summaryValueClasses} border-slate-700/60 bg-slate-900/70 text-slate-200`}>
                  {formData.shipper || '-'}
                </span>
              </div>
              <div>
                <span className="block text-[10px] uppercase tracking-wide text-slate-500">
                  Nave actual
                </span>
                <span className={`${summaryValueClasses} border-slate-700/60 bg-slate-900/70 text-slate-200`}>
                  {formData.naveInicial
                    ? `${formData.naveInicial}${formData.viaje?.trim() ? ` [${formData.viaje.trim()}]` : ''
                    }`
                    : '-'}
                </span>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <div>
              <label className={labelClasses}>Ref Externa</label>
              <input
                type="text"
                name="refCliente"
                value={formData.refCliente || ''}
                onChange={handleChange}
                list="catalogo-ref-externa-edit"
                className={inputClasses}
              />
              <datalist id="catalogo-ref-externa-edit">
                {refExternasUnicas.map((ref) => (
                  <option key={ref} value={ref} />
                ))}
              </datalist>
            </div>

            <div>
              <label className={labelClasses}>Booking</label>
              <input
                type="text"
                name="booking"
                value={formData.booking || ''}
                onChange={handleChange}
                className={inputClasses}
                placeholder="Ej: SUDU1234567"
              />
            </div>

            <div>
              <label className={labelClasses}>Contenedor(es)</label>
              <input
                type="text"
                name="contenedor"
                value={formData.contenedor || ''}
                onChange={handleChange}
                className={inputClasses}
                placeholder="Separados por espacio"
              />
            </div>

            <div>
              <label className={labelClasses}>Naviera</label>
              <select
                name="naviera"
                value={formData.naviera || ''}
                onChange={handleChange}
                className={selectClasses}
              >
                <option value="">Seleccionar...</option>
                {navierasUnicas.map((nav) => (
                  <option key={nav} value={nav}>
                    {nav}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClasses}>Nave</label>
              <select
                name="naveInicial"
                value={formData.naveInicial || ''}
                onChange={handleChange}
                className={selectClasses}
              >
                <option value="">Seleccionar...</option>
                {getAvailableNaves().map((nave) => (
                  <option key={nave} value={nave}>
                    {nave}
                  </option>
                ))}
              </select>
              {getAvailableNaves().length === 0 && formData.naviera && (
                <p className="mt-1 text-[11px] text-amber-300">
                  No hay naves disponibles para esta naviera
                </p>
              )}
            </div>

            <div>
              <label className={labelClasses}>
                Número de viaje {formData.naveInicial ? '*' : ''}
              </label>
              <input
                ref={viajeInputRef}
                type="text"
                name="viaje"
                value={formData.viaje || ''}
                onChange={handleChange}
                className={`${inputClasses} ${!formData.naveInicial ? 'opacity-60' : ''}`}
                placeholder={formData.naveInicial ? 'Ej: 001E' : 'Selecciona una nave primero'}
                disabled={!formData.naveInicial}
              />
              {formData.naveInicial && !formData.viaje && error === VIAJE_REQUIRED_MESSAGE && (
                <p className="mt-1 text-[11px] text-rose-300">
                  {VIAJE_REQUIRED_MESSAGE}
                </p>
              )}
              {formData.naveInicial && formData.viaje?.trim() && (
                <p className="mt-1 text-[11px] text-slate-400">
                  Se guardará como {`${formData.naveInicial} [${formData.viaje.trim()}]`}
                </p>
              )}
            </div>

            <div>
              <label className={labelClasses}>Estado</label>
              <select
                name="estado"
                value={formData.estado || 'PENDIENTE'}
                onChange={handleChange}
                required
                className={selectClasses}
              >
                <option value="PENDIENTE">Pendiente</option>
                <option value="CONFIRMADO">Confirmado</option>
                <option value="CANCELADO">Cancelado</option>
              </select>
            </div>

            <div>
              <label className={labelClasses}>Tipo de ingreso</label>
              <select
                name="tipoIngreso"
                value={formData.tipoIngreso || 'NORMAL'}
                onChange={handleChange}
                className={selectClasses}
              >
                <option value="NORMAL">NORMAL</option>
                <option value="EARLY">EARLY</option>
                <option value="LATE">LATE</option>
                <option value="EXTRA LATE">EXTRA LATE</option>
              </select>
            </div>

            <div>
              <label className={labelClasses}>ETD</label>
              <input
                type="date"
                name="etd"
                value={formData.etd || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, etd: e.target.value }))}
                className={inputClasses}
              />
            </div>

            <div>
              <label className={labelClasses}>ETA</label>
              <input
                type="date"
                name="eta"
                value={formData.eta || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, eta: e.target.value }))}
                className={inputClasses}
              />
            </div>

            <div>
              <label className={labelClasses}>Temperatura (°C)</label>
              <select
                name="temperatura"
                value={formData.temperatura ?? ''}
                onChange={(event) => {
                  const value = event.target.value;
                  setFormData((prev) => ({
                    ...prev,
                    temperatura: value === '' ? null : Number(value),
                  }));
                }}
                className={selectClasses}
              >
                <option value="">Seleccionar temperatura</option>
                {Array.from({ length: 21 }, (_, i) => {
                  const temp = (-1 + i * 0.1).toFixed(1);
                  return (
                    <option key={temp} value={temp}>
                      {temp}°C
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className={labelClasses}>CBM</label>
              <select
                name="cbm"
                value={formData.cbm ?? ''}
                onChange={(event) => {
                  const value = event.target.value;
                  setFormData((prev) => ({
                    ...prev,
                    cbm: value === '' ? null : Number(value),
                  }));
                }}
                className={selectClasses}
              >
                <option value="">Seleccionar...</option>
                {[10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90].map((cbm) => (
                  <option key={cbm} value={cbm}>
                    {cbm} CBM
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClasses}>Flete</label>
              <select
                name="flete"
                value={formData.flete || ''}
                onChange={handleChange}
                className={selectClasses}
              >
                <option value="">Seleccionar...</option>
                {fletesUnicos.map((flete) => (
                  <option key={flete} value={flete}>
                    {flete}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClasses}>CO₂</label>
              <input
                type="number"
                step="0.1"
                name="co2"
                value={formData.co2 ?? ''}
                onChange={(event) => {
                  const value = event.target.value;
                  setFormData((prev) => ({
                    ...prev,
                    co2: value === '' ? null : Number(value),
                  }));
                }}
                className={inputClasses}
              />
            </div>

            <div>
              <label className={labelClasses}>O₂</label>
              <input
                type="number"
                step="0.1"
                name="o2"
                value={formData.o2 ?? ''}
                onChange={(event) => {
                  const value = event.target.value;
                  setFormData((prev) => ({
                    ...prev,
                    o2: value === '' ? null : Number(value),
                  }));
                }}
                className={inputClasses}
              />
            </div>

            <div>
              <label className={labelClasses}>Tratamiento de frío</label>
              <select
                name="tratamientoFrio"
                value={formData.tratamientoFrio || ''}
                onChange={handleChange}
                className={selectClasses}
              >
                <option value="">Seleccionar tratamiento</option>
                {tratamientosDeFrioOpciones.map((opcion) => (
                  <option key={opcion} value={opcion}>
                    {opcion}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClasses}>POL</label>
              <input
                type="text"
                name="pol"
                value={formData.pol || ''}
                onChange={handleChange}
                className={inputClasses}
              />
            </div>

            <div>
              <label className={labelClasses}>POD</label>
              <input
                type="text"
                name="pod"
                value={formData.pod || ''}
                onChange={handleChange}
                className={inputClasses}
              />
            </div>

            <div>
              <label className={labelClasses}>Depósito</label>
              <input
                type="text"
                name="deposito"
                value={formData.deposito || ''}
                onChange={handleChange}
                className={inputClasses}
              />
            </div>

            <div>
              <label className={labelClasses}>Ingreso Stacking</label>
              <input
                type="date"
                name="ingresoStacking"
                value={formData.ingresoStacking || ''}
                onChange={handleChange}
                className={inputClasses}
              />
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <div>
              <label className={labelClasses}>Contrato</label>
              <input
                type="text"
                name="contrato"
                value={formData.contrato || ''}
                onChange={handleChange}
                className={inputClasses}
              />
            </div>

            <div>
              <label className={labelClasses}>Facturación</label>
              <input
                type="text"
                name="facturacion"
                value={formData.facturacion || ''}
                onChange={handleChange}
                className={inputClasses}
              />
            </div>

            <div>
              <label className={labelClasses}>Número BL</label>
              <input
                type="text"
                name="numeroBl"
                value={formData.numeroBl || ''}
                onChange={handleChange}
                className={inputClasses}
              />
            </div>

            <div>
              <label className={labelClasses}>Estado BL</label>
              <input
                type="text"
                name="estadoBl"
                value={formData.estadoBl || ''}
                onChange={handleChange}
                className={inputClasses}
              />
            </div>

            <div className="md:col-span-2">
              <label className={labelClasses}>Comentario</label>
              <textarea
                name="comentario"
                value={formData.comentario || ''}
                onChange={handleChange}
                rows={3}
                className={textAreaClasses}
                placeholder="Notas internas, incidencias, etc."
              />
            </div>

            <div className="md:col-span-2">
              <label className={labelClasses}>Observaciones</label>
              <textarea
                name="observacion"
                value={formData.observacion || ''}
                onChange={handleChange}
                rows={2}
                className={textAreaClasses}
                placeholder="Información para otros equipos"
              />
            </div>
          </section>
        </form>

        <div className="flex items-center justify-between gap-3 border-t border-slate-800/60 bg-slate-950/80 px-6 py-4">
          <div className="text-[11px] text-slate-500">
            Última edición se registrará automáticamente
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCloseModal}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-800/70 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-600 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="edit-registro-form"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-sky-500/20 transition hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Guardando…
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  Guardar cambios
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
