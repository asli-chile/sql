'use client';

import React from 'react';
import { Eye } from 'lucide-react';
import type { ItinerarioWithEscalas } from '@/types/itinerarios';

interface ItinerarioCardProps {
  itinerario: ItinerarioWithEscalas;
  onViewDetail: (itinerario: ItinerarioWithEscalas) => void;
  etaViewMode?: 'dias' | 'fecha' | 'ambos';
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).replace(/\./g, '');
  } catch {
    return '—';
  }
}

export function ItinerarioCard({ itinerario, onViewDetail, etaViewMode = 'dias' }: ItinerarioCardProps) {
  // Ordenar escalas por ETA (de menor a mayor) - orden del primer registro
  const escalasOrdenadas = [...(itinerario.escalas || [])].sort((a, b) => {
    // Ordenar por ETA (fecha de arribo) de menor a mayor
    if (!a.eta && !b.eta) return a.orden - b.orden;
    if (!a.eta) return 1;
    if (!b.eta) return -1;
    return new Date(a.eta).getTime() - new Date(b.eta).getTime();
  });

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 shadow-sm hover:shadow-md transition-shadow">
      {/* Nave y Viaje - Claramente etiquetados */}
      <div className="space-y-2 mb-3">
        <div>
          <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">
            Nave
          </p>
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {itinerario.nave}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">
            Viaje
          </p>
          <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
            {itinerario.viaje || '—'}
          </p>
        </div>
      </div>

      {/* POL y ETD - Resaltados */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-gradient-to-br from-[#00AEEF]/10 to-[#0099CC]/10 dark:from-[#00AEEF]/20 dark:to-[#0099CC]/20 border border-[#00AEEF]/30 dark:border-[#00AEEF]/40 rounded-lg p-2">
          <p className="text-[10px] font-semibold text-[#00AEEF] dark:text-[#4FC3F7] uppercase tracking-wide mb-1">
            POL
          </p>
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {itinerario.pol}
          </p>
        </div>
        <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 dark:from-emerald-500/20 dark:to-emerald-600/20 border border-emerald-500/30 dark:border-emerald-500/40 rounded-lg p-2">
          <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-1">
            ETD
          </p>
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {itinerario.etd ? formatDate(itinerario.etd) : '—'}
          </p>
        </div>
      </div>

      {/* Semana (si existe) */}
      {itinerario.semana && (
        <div className="mb-3">
          <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
            Semana {itinerario.semana}
          </span>
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-slate-200 dark:border-slate-700 mb-3" />

      {/* Lista de escalas - Scroll horizontal en móvil */}
      {escalasOrdenadas.length > 0 ? (
        <div className="mb-3">
          <div className="overflow-x-auto -mx-3 px-3">
            <div className="flex gap-2 min-w-max pb-2">
              {escalasOrdenadas.map((escala) => (
                <div
                  key={escala.id}
                  className="flex flex-col items-center gap-1 min-w-[80px] px-2 py-2 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600"
                >
                  <span className="text-[10px] font-semibold text-slate-900 dark:text-slate-100 text-center leading-tight">
                    {escala.puerto_nombre || escala.puerto}
                  </span>
                  <div className="flex flex-col items-center gap-1">
                    {etaViewMode === 'dias' && escala.dias_transito && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#00AEEF] text-white dark:bg-[#4FC3F7] dark:text-slate-900">
                        {escala.dias_transito}d
                      </span>
                    )}
                    {etaViewMode === 'fecha' && escala.eta && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                        {formatDate(escala.eta)}
                      </span>
                    )}
                    {etaViewMode === 'ambos' && (
                      <>
                        {escala.dias_transito && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#00AEEF] text-white dark:bg-[#4FC3F7] dark:text-slate-900">
                            {escala.dias_transito}d
                          </span>
                        )}
                        {escala.eta && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                            {formatDate(escala.eta)}
                          </span>
                        )}
                      </>
                    )}
                    {((etaViewMode === 'dias' && !escala.dias_transito) || (etaViewMode === 'fecha' && !escala.eta) || (etaViewMode === 'ambos' && !escala.dias_transito && !escala.eta)) && (
                      <span className="text-[10px] text-slate-400">—</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-3 text-center">
          No hay escalas registradas
        </p>
      )}

      {/* Botón ver detalle */}
      <button
        onClick={() => onViewDetail(itinerario)}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-[#00AEEF] hover:text-white hover:bg-[#00AEEF] dark:hover:bg-[#4FC3F7] dark:hover:text-slate-900 border border-[#00AEEF] dark:border-[#4FC3F7] rounded-lg transition-all duration-150 active:scale-95"
      >
        <Eye className="h-3.5 w-3.5" />
        Ver detalle
      </button>
    </div>
  );
}

