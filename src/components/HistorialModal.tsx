'use client';
/* eslint-disable react-hooks/exhaustive-deps */

import { useState, useEffect } from 'react';
import { AlertCircle, Clock, Edit3, RotateCcw, User, X } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';

interface HistorialEntry {
  id: string;
  campo_modificado: string;
  valor_anterior: string;
  valor_nuevo: string;
  tipo_cambio: string;
  usuario_nombre: string;
  usuario_email?: string;
  usuario_rol?: string;
  fecha_cambio: string;
  metadata: any;
}

interface HistorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  registroId: string;
  registroRefAsli: string;
}

export function HistorialModal({ isOpen, onClose, registroId, registroRefAsli }: HistorialModalProps) {
  const [historial, setHistorial] = useState<HistorialEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLoadHistorial = async () => {
    setLoading(true);
    setError('');

    try {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from('historial_cambios')
        .select(`
          *,
          usuarios:usuario_real_id (
            email,
            rol
          )
        `)
        .eq('registro_id', registroId)
        .order('fecha_cambio', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      const transformedData = (data || []).map((entry) => ({
        ...entry,
        usuario_email: entry.usuarios?.email,
        usuario_rol: entry.usuarios?.rol,
      }));

      setHistorial(transformedData);
    } catch (fetchError: any) {
      setError(fetchError?.message ?? 'Error al cargar historial');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && registroId) {
      handleLoadHistorial();
    }
  }, [isOpen, registroId]);

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleString('es-CL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getFieldDisplayName = (campo: string) => {
    const fieldNames: Record<string, string> = {
      ref_asli: 'REF ASLI',
      shipper: 'Cliente',
      booking: 'Booking',
      contenedor: 'Contenedor',
      naviera: 'Naviera',
      nave_inicial: 'Nave',
      especie: 'Especie',
      temperatura: 'Temperatura',
      cbm: 'CBM',
      co2: 'CO2',
      o2: 'O2',
      pol: 'POL',
      pod: 'POD',
      deposito: 'Depósito',
      etd: 'ETD',
      eta: 'ETA',
      tt: 'TT',
      flete: 'Flete',
      ejecutivo: 'Ejecutivo',
      estado: 'Estado',
      tipo_ingreso: 'Tipo Ingreso',
      contrato: 'Contrato',
      comentario: 'Comentario',
    };

    return fieldNames[campo] || campo;
  };

  const formatValue = (value: string, campo: string) => {
    if (value === 'NULL' || value === null) {
      return '-';
    }

    if (campo === 'etd' || campo === 'eta' || campo === 'ingresado' || campo === 'ingreso_stacking') {
      try {
        return new Date(value).toLocaleDateString('es-CL');
      } catch {
        return value;
      }
    }

    if (campo === 'temperatura') return `${value}°C`;
    if (campo === 'co2' || campo === 'o2') return `${value}%`;
    if (campo === 'cbm') return `${value}`;
    if (campo === 'tt') return `${value} días`;

    return value;
  };

  const renderChangeIcon = (tipo: string) => {
    const baseClasses =
      'inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white shadow-inner';

    switch (tipo) {
      case 'UPDATE':
        return (
          <span className={`${baseClasses} border-sky-400/40 bg-sky-500/20 text-sky-200`}>
            <Edit3 className="h-4 w-4" aria-hidden="true" />
          </span>
        );
      case 'CREATE':
        return (
          <span className={`${baseClasses} border-emerald-400/40 bg-emerald-500/20 text-emerald-200`}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          </span>
        );
      case 'DELETE':
        return (
          <span className={`${baseClasses} border-rose-400/40 bg-rose-500/20 text-rose-200`}>
            <X className="h-4 w-4" aria-hidden="true" />
          </span>
        );
      default:
        return (
          <span className={`${baseClasses} border-slate-400/30 bg-slate-500/10 text-slate-200`}>
            <Clock className="h-4 w-4" aria-hidden="true" />
          </span>
        );
    }
  };

  const handleRetryLoad = () => {
    handleLoadHistorial();
  };

  const handleCloseModal = () => {
    onClose();
  };

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/85 px-4 py-10 backdrop-blur-md"
      onClick={handleOverlayClick}
      role="presentation"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-[10%] h-64 w-64 rounded-full bg-sky-500/20 blur-3xl" />
        <div className="absolute top-1/2 right-[15%] h-72 w-72 -translate-y-1/2 rounded-full bg-blue-500/15 blur-3xl" />
        <div className="absolute -bottom-28 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-teal-500/10 blur-3xl" />
      </div>

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="historial-dialog-title"
        className="relative z-[1210] flex w-full max-w-5xl max-h-[85vh] flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950/80 shadow-2xl backdrop-blur-2xl"
      >
        <div className="flex items-center justify-between gap-4 border-b border-white/10 bg-white/5 px-6 py-5">
          <div className="flex items-center gap-4">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-sky-200 shadow-inner">
              <HistoryGlyph />
            </span>
            <div>
              <p className="text-[11px] uppercase tracking-[0.32em] text-slate-300/70">Registro</p>
              <h2 id="historial-dialog-title" className="text-2xl font-semibold text-white">
                Historial de Cambios
              </h2>
              <p className="text-sm text-slate-300/90">
                REF ASLI&nbsp;
                <span className="font-semibold text-sky-200">{registroRefAsli}</span>
              </p>
            </div>
          </div>

          <button
            onClick={handleCloseModal}
            type="button"
            aria-label="Cerrar historial de cambios"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/10 text-slate-200 transition hover:border-sky-400/40 hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-4 py-16">
              <span className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/10">
                <span className="h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              </span>
              <p className="text-sm font-medium text-slate-200">Sincronizando historial en tiempo real…</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-8 py-10 text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-rose-400/40 bg-rose-500/20 text-rose-200">
                <AlertCircle className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-white">No pudimos cargar los cambios</h3>
                <p className="text-sm text-rose-100/80">{error}</p>
              </div>
              <button
                type="button"
                onClick={handleRetryLoad}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-sky-400/40 hover:bg-sky-500/20"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Reintentar
              </button>
            </div>
          ) : historial.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-6 py-12 text-center">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/10 text-slate-200">
                <Clock className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-white">Sin cambios registrados</h3>
                <p className="text-sm text-slate-300/90">
                  Guarda un nuevo ajuste para comenzar a construir el historial de auditoría.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {historial.map((entry) => (
                <article
                  key={entry.id}
                  className="group rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition hover:border-sky-400/40 hover:bg-sky-500/5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-4">
                      {renderChangeIcon(entry.tipo_cambio)}
                      <div className="space-y-1">
                        <h3 className="text-base font-semibold text-white">
                          {getFieldDisplayName(entry.campo_modificado)}
                        </h3>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-300">
                          <div className="inline-flex items-center gap-2">
                            <User className="h-4 w-4 text-slate-400" aria-hidden="true" />
                            <span>{entry.usuario_nombre}</span>
                            {entry.usuario_rol && (
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide ${
                                  entry.usuario_rol === 'admin'
                                    ? 'bg-rose-500/20 text-rose-200'
                                    : entry.usuario_rol === 'supervisor'
                                    ? 'bg-sky-500/20 text-sky-200'
                                    : entry.usuario_rol === 'usuario'
                                    ? 'bg-emerald-500/20 text-emerald-200'
                                    : 'bg-slate-500/20 text-slate-200'
                                }`}
                              >
                                {entry.usuario_rol.toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="inline-flex items-center gap-2 text-sm text-slate-300">
                            <Clock className="h-4 w-4 text-slate-400" aria-hidden="true" />
                            <span>{formatFecha(entry.fecha_cambio)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-200">Valor anterior</p>
                      <p className="mt-2 break-words text-sm font-medium text-rose-100">
                        {formatValue(entry.valor_anterior, entry.campo_modificado)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200">Valor nuevo</p>
                      <p className="mt-2 break-words text-sm font-medium text-emerald-100">
                        {formatValue(entry.valor_nuevo, entry.campo_modificado)}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-white/10 bg-white/5 px-6 py-4">
          <button
            type="button"
            onClick={handleCloseModal}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-sky-400/40 hover:bg-sky-500/20"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

const HistoryGlyph = () => (
  <svg
    className="h-6 w-6"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M12 6v6l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
