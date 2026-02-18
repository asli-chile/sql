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
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 shadow-sm hover:shadow-md transition-shadow">
      {/* Nave y Viaje - Más compactos */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-0.5">
            <p className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Nave:
            </p>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
              {itinerario.nave}
            </p>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Viaje:
            </p>
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
              {itinerario.viaje || '—'}
            </p>
          </div>
        </div>
        {itinerario.semana && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex-shrink-0">
            Sem {itinerario.semana}
          </span>
        )}
      </div>

      {/* POL y ETD - Más compactos */}
      <div className="grid grid-cols-2 gap-1.5 mb-2">
        <div className="bg-gradient-to-br from-[#00AEEF]/10 to-[#0099CC]/10 dark:from-[#00AEEF]/20 dark:to-[#0099CC]/20 border border-[#00AEEF]/30 dark:border-[#00AEEF]/40 rounded-md p-1.5">
          <p className="text-[9px] font-semibold text-[#00AEEF] dark:text-[#4FC3F7] uppercase tracking-wide mb-0.5">
            POL
          </p>
          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
            {itinerario.pol}
          </p>
        </div>
        <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 dark:from-emerald-500/20 dark:to-emerald-600/20 border border-emerald-500/30 dark:border-emerald-500/40 rounded-md p-1.5">
          <p className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-0.5">
            ETD
          </p>
          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
            {itinerario.etd ? formatDate(itinerario.etd) : '—'}
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-slate-200 dark:border-slate-700 mb-2" />

      {/* Lista de escalas - Scroll horizontal en móvil */}
      {escalasOrdenadas.length > 0 ? (
        <div className="mb-2">
          <div className="overflow-x-auto -mx-2.5 px-2.5">
            <div className="flex gap-1.5 min-w-max pb-1.5">
              {escalasOrdenadas.map((escala) => (
                <div
                  key={escala.id}
                  className="flex flex-col items-center gap-0.5 min-w-[70px] px-1.5 py-1.5 rounded-md bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600"
                >
                  <span className="text-[9px] font-semibold text-slate-900 dark:text-slate-100 text-center leading-tight truncate w-full">
                    {escala.puerto_nombre || escala.puerto}
                  </span>
                  <div className="flex flex-col items-center gap-0.5">
                    {etaViewMode === 'dias' && escala.dias_transito && (
                      <span className="inline-flex items-center px-1 py-0.5 rounded-full text-[9px] font-bold bg-[#00AEEF] text-white dark:bg-[#4FC3F7] dark:text-slate-900">
                        {escala.dias_transito}d
                      </span>
                    )}
                    {etaViewMode === 'fecha' && escala.eta && (
                      <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold">
                        {formatDate(escala.eta)}
                      </span>
                    )}
                    {etaViewMode === 'ambos' && (
                      <>
                        {escala.dias_transito && (
                          <span className="inline-flex items-center px-1 py-0.5 rounded-full text-[9px] font-bold bg-[#00AEEF] text-white dark:bg-[#4FC3F7] dark:text-slate-900">
                            {escala.dias_transito}d
                          </span>
                        )}
                        {escala.eta && (
                          <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold">
                            {formatDate(escala.eta)}
                          </span>
                        )}
                      </>
                    )}
                    {((etaViewMode === 'dias' && !escala.dias_transito) || (etaViewMode === 'fecha' && !escala.eta) || (etaViewMode === 'ambos' && !escala.dias_transito && !escala.eta)) && (
                      <span className="text-[9px] text-slate-400">—</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-2 text-center">
          No hay escalas registradas
        </p>
      )}

      {/* Botón ver detalle - Con más vida */}
      <button
        onClick={() => onViewDetail(itinerario)}
        className="w-full relative flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-[#00AEEF] via-[#0099CC] to-[#00AEEF] dark:from-[#4FC3F7] dark:via-[#00AEEF] dark:to-[#4FC3F7] border-0 rounded-lg shadow-md hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 overflow-hidden group"
      >
        {/* Efecto de brillo animado */}
        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
        
        {/* Contenido del botón */}
        <Eye className="h-4 w-4 relative z-10 group-hover:scale-110 transition-transform duration-200" />
        <span className="relative z-10">Ver Detalle</span>
        
        {/* Efecto de pulso */}
        <span className="absolute inset-0 rounded-lg bg-white/0 group-active:bg-white/20 transition-colors duration-150"></span>
      </button>
    </div>
  );
}

