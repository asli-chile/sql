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
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm">
      {/* Header con naviera y servicio */}
      <div className="mb-3">
        {itinerario.consorcio && (
          <div className="flex items-center gap-2 mb-2">
            {(() => {
              const consorcioUpper = itinerario.consorcio.toUpperCase();
              const logos: React.ReactElement[] = [];
              
              // Usar assetPrefix si está disponible (para producción)
              const getImageSrc = (filename: string) => {
                const assetPrefix = process.env.NEXT_PUBLIC_ASSET_PREFIX;
                if (assetPrefix && typeof window !== 'undefined') {
                  // En producción con assetPrefix, construir la URL completa
                  return `${assetPrefix}${filename}`;
                }
                return filename;
              };
              
              if (consorcioUpper.includes('MSC')) {
                logos.push(
                  <img
                    key="msc"
                    src={getImageSrc('/msc.png')}
                    alt=""
                    className="h-10 w-auto object-contain flex-shrink-0"
                    style={{ display: 'block' }}
                    onError={(e) => {
                      console.error('Error cargando logo MSC');
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                );
              }
              if (consorcioUpper.includes('COSCO')) {
                logos.push(
                  <img
                    key="cosco"
                    src={getImageSrc('/cosco.png')}
                    alt=""
                    className="h-10 w-auto object-contain flex-shrink-0"
                    style={{ display: 'block' }}
                    onError={(e) => {
                      console.error('Error cargando logo COSCO');
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                );
              }
              if (consorcioUpper.includes('EVERGREEN')) {
                logos.push(
                  <img
                    key="evergreen"
                    src={getImageSrc('/evergreen.png')}
                    alt=""
                    className="h-10 w-auto object-contain flex-shrink-0"
                    style={{ display: 'block' }}
                    onError={(e) => {
                      console.error('Error cargando logo EVERGREEN');
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                );
              }
              
              return logos;
            })()}
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">
                {itinerario.navierasDelServicio && itinerario.navierasDelServicio.length > 0
                  ? itinerario.navierasDelServicio.join(' - ')
                  : (itinerario.consorcio || itinerario.naviera || '—')}
              </h2>
              <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5">
                Servicio: <span className="font-semibold">{itinerario.servicio}</span>
              </p>
            </div>
          </div>
        )}
        {!itinerario.consorcio && (
          <p className="text-[10px] text-slate-600 dark:text-slate-400 mb-2">
            Servicio: <span className="font-semibold">{itinerario.servicio}</span>
          </p>
        )}
      </div>

      {/* Información principal */}
      <div className="space-y-2 mb-4">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {itinerario.nave}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400">{itinerario.viaje}</p>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
          {itinerario.semana && (
            <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700">
              Semana {itinerario.semana}
            </span>
          )}
          <span>{itinerario.pol}</span>
        </div>

        {itinerario.etd && (
          <p className="text-xs text-slate-600 dark:text-slate-400">
            ETD: <span className="font-medium">{formatDate(itinerario.etd)}</span>
          </p>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-slate-200 dark:border-slate-700 my-4" />

      {/* Lista de escalas */}
      {escalasOrdenadas.length > 0 ? (
        <div className="space-y-2 mb-4">
          {escalasOrdenadas.map((escala) => (
            <div
              key={escala.id}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-slate-900 dark:text-slate-100 font-medium">
                {escala.puerto_nombre || escala.puerto}
              </span>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                {etaViewMode === 'dias' && escala.dias_transito && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#00AEEF]/10 text-[#00AEEF] dark:bg-[#4FC3F7]/20 dark:text-[#4FC3F7]">
                    {escala.dias_transito}d
                  </span>
                )}
                {etaViewMode === 'fecha' && escala.eta && (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    {formatDate(escala.eta)}
                  </span>
                )}
                {etaViewMode === 'ambos' && (
                  <>
                    {escala.dias_transito && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#00AEEF]/10 text-[#00AEEF] dark:bg-[#4FC3F7]/20 dark:text-[#4FC3F7]">
                        {escala.dias_transito}d
                      </span>
                    )}
                    {escala.eta && (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        {formatDate(escala.eta)}
                      </span>
                    )}
                  </>
                )}
                {((etaViewMode === 'dias' && !escala.dias_transito) || (etaViewMode === 'fecha' && !escala.eta) || (etaViewMode === 'ambos' && !escala.dias_transito && !escala.eta)) && (
                  <span className="text-xs text-slate-400">—</span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
          No hay escalas registradas
        </p>
      )}

      {/* Botón ver detalle */}
      <button
        onClick={() => onViewDetail(itinerario)}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-[#00AEEF] hover:text-[#4FC3F7] hover:bg-[#00AEEF]/10 dark:hover:bg-[#4FC3F7]/20 rounded-lg transition-all duration-150"
      >
        <Eye className="h-4 w-4" />
        Ver detalle
      </button>
    </div>
  );
}

