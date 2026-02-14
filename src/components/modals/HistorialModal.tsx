'use client';
/* eslint-disable react-hooks/exhaustive-deps */

import { useState, useEffect } from 'react';
import { AlertCircle, Clock, Edit3, RotateCcw, User, X, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import { useTheme } from '@/contexts/ThemeContext';

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
  const { theme } = useTheme();
  const isDark = theme === 'dark';
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
    const baseClasses = isDark
      ? 'inline-flex h-10 w-10 items-center justify-center rounded border shadow-sm transition-transform hover:scale-105'
      : 'inline-flex h-10 w-10 items-center justify-center rounded border shadow-sm transition-transform hover:scale-105';

    switch (tipo) {
      case 'UPDATE':
        return (
          <span className={`${baseClasses} ${isDark ? 'border-blue-400/60 bg-blue-500/20 text-blue-300' : 'border-blue-500 bg-blue-50 text-blue-600'}`}>
            <Edit3 className="h-5 w-5" aria-hidden="true" />
          </span>
        );
      case 'CREATE':
        return (
          <span className={`${baseClasses} ${isDark ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-300' : 'border-emerald-500 bg-emerald-50 text-emerald-600'}`}>
            <RotateCcw className="h-5 w-5" aria-hidden="true" />
          </span>
        );
      case 'DELETE':
        return (
          <span className={`${baseClasses} ${isDark ? 'border-rose-400/60 bg-rose-500/20 text-rose-300' : 'border-rose-500 bg-rose-50 text-rose-600'}`}>
            <X className="h-5 w-5" aria-hidden="true" />
          </span>
        );
      default:
        return (
          <span className={`${baseClasses} ${isDark ? 'border-slate-400/40 bg-slate-500/10 text-slate-300' : 'border-gray-300 bg-gray-50 text-gray-600'}`}>
            <Clock className="h-5 w-5" aria-hidden="true" />
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
      className={`fixed inset-0 z-[1200] flex items-center justify-center px-4 py-10 backdrop-blur-sm transition-colors ${
        isDark ? 'bg-black/70' : 'bg-gray-900/50'
      }`}
      onClick={handleOverlayClick}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="historial-dialog-title"
        className={`relative z-[1210] flex w-full max-w-4xl max-h-[90vh] flex-col overflow-hidden rounded shadow-lg transition-all ${
          isDark
            ? 'border border-gray-800 bg-gray-900'
            : 'border border-gray-200 bg-white'
        }`}
      >
        <div className={`flex items-center justify-between gap-4 border-b px-6 py-4 ${
          isDark ? 'border-gray-800 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
        }`}>
          <div className="flex items-center gap-4">
            <div className={`inline-flex h-10 w-10 items-center justify-center rounded ${
              isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'
            }`}>
              <HistoryGlyph />
            </div>
            <div>
              <h2 id="historial-dialog-title" className={`text-xl font-bold ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                Historial de Cambios
              </h2>
              <p className={`text-sm mt-1 ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>
                REF ASLI: <span className={`font-semibold ${
                  isDark ? 'text-blue-400' : 'text-blue-600'
                }`}>{registroRefAsli}</span>
              </p>
            </div>
          </div>

          <button
            onClick={handleCloseModal}
            type="button"
            aria-label="Cerrar historial de cambios"
            className={`inline-flex h-9 w-9 items-center justify-center rounded transition-colors ${
              isDark
                ? 'text-gray-400 hover:bg-gray-800 hover:text-white'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className={`flex-1 overflow-y-auto px-6 py-6 ${
          isDark ? 'bg-gray-900' : 'bg-white'
        }`}>
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-4 py-16">
              <div className={`h-12 w-12 animate-spin rounded-full border-4 ${
                isDark ? 'border-gray-700 border-t-blue-500' : 'border-gray-200 border-t-blue-600'
              }`} />
              <p className={`text-sm font-medium ${
                isDark ? 'text-gray-300' : 'text-gray-600'
              }`}>
                Cargando historial...
              </p>
            </div>
          ) : error ? (
            <div className={`flex flex-col items-center justify-center gap-4 rounded border px-8 py-10 text-center ${
              isDark
                ? 'border-red-500/30 bg-red-500/10'
                : 'border-red-200 bg-red-50'
            }`}>
              <div className={`inline-flex h-12 w-12 items-center justify-center rounded-full ${
                isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600'
              }`}>
                <AlertCircle className="h-6 w-6" aria-hidden="true" />
              </div>
              <div className="space-y-2">
                <h3 className={`text-lg font-semibold ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>
                  Error al cargar historial
                </h3>
                <p className={`text-sm ${
                  isDark ? 'text-red-300' : 'text-red-600'
                }`}>
                  {error}
                </p>
              </div>
              <button
                type="button"
                onClick={handleRetryLoad}
                className={`inline-flex items-center gap-2 rounded px-4 py-2 text-sm font-medium transition-colors ${
                  isDark
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Reintentar
              </button>
            </div>
          ) : historial.length === 0 ? (
            <div className={`flex flex-col items-center justify-center gap-4 rounded border px-6 py-12 text-center ${
              isDark
                ? 'border-gray-800 bg-gray-800/50'
                : 'border-gray-200 bg-gray-50'
            }`}>
              <div className={`inline-flex h-12 w-12 items-center justify-center rounded-full ${
                isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'
              }`}>
                <Clock className="h-6 w-6" aria-hidden="true" />
              </div>
              <div className="space-y-2">
                <h3 className={`text-lg font-semibold ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>
                  Sin cambios registrados
                </h3>
                <p className={`text-sm ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  No hay cambios registrados para este registro.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {historial.map((entry) => (
                <article
                  key={entry.id}
                  className={`group rounded border p-4 transition-all hover:shadow-md ${
                    isDark
                      ? 'border-gray-800 bg-gray-800/50 hover:border-gray-700'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {renderChangeIcon(entry.tipo_cambio)}
                    <div className="flex-1 space-y-3">
                      <div>
                        <h3 className={`text-base font-semibold mb-2 ${
                          isDark ? 'text-white' : 'text-gray-900'
                        }`}>
                          {getFieldDisplayName(entry.campo_modificado)}
                        </h3>
                        <div className="flex flex-wrap items-center gap-3 text-sm">
                          <div className={`inline-flex items-center gap-2 ${
                            isDark ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            <User className="h-4 w-4" aria-hidden="true" />
                            <span>{entry.usuario_nombre}</span>
                            {entry.usuario_rol && (
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                  entry.usuario_rol === 'admin'
                                    ? isDark
                                      ? 'bg-red-500/20 text-red-400'
                                      : 'bg-red-100 text-red-700'
                                    : entry.usuario_rol === 'ejecutivo'
                                    ? isDark
                                      ? 'bg-blue-500/20 text-blue-400'
                                      : 'bg-blue-100 text-blue-700'
                                    : isDark
                                    ? 'bg-gray-700 text-gray-300'
                                    : 'bg-gray-100 text-gray-700'
                                }`}
                              >
                                {entry.usuario_rol.toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className={`inline-flex items-center gap-2 ${
                            isDark ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            <Clock className="h-4 w-4" aria-hidden="true" />
                            <span>{formatFecha(entry.fecha_cambio)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className={`rounded border-l-4 p-3 ${
                          isDark
                            ? 'border-red-500/50 bg-red-500/10'
                            : 'border-red-300 bg-red-50'
                        }`}>
                          <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${
                            isDark ? 'text-red-300' : 'text-red-700'
                          }`}>
                            Valor Anterior
                          </p>
                          <p className={`break-words text-sm font-medium ${
                            isDark ? 'text-red-200' : 'text-red-900'
                          }`}>
                            {formatValue(entry.valor_anterior, entry.campo_modificado)}
                          </p>
                        </div>
                        <div className={`rounded border-l-4 p-3 ${
                          isDark
                            ? 'border-green-500/50 bg-green-500/10'
                            : 'border-green-300 bg-green-50'
                        }`}>
                          <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${
                            isDark ? 'text-green-300' : 'text-green-700'
                          }`}>
                            Valor Nuevo
                          </p>
                          <p className={`break-words text-sm font-medium ${
                            isDark ? 'text-green-200' : 'text-green-900'
                          }`}>
                            {formatValue(entry.valor_nuevo, entry.campo_modificado)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className={`flex items-center justify-end gap-3 border-t px-6 py-4 ${
          isDark ? 'border-gray-800 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
        }`}>
          <button
            type="button"
            onClick={handleCloseModal}
            className={`inline-flex items-center gap-2 rounded px-4 py-2 text-sm font-medium transition-colors ${
              isDark
                ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
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
