'use client';

import { useMemo } from 'react';
import React from 'react';
import { Eye } from 'lucide-react';
import type { ItinerarioWithEscalas } from '@/types/itinerarios';

interface ItinerarioTableProps {
  itinerarios: ItinerarioWithEscalas[];
  onViewDetail: (itinerario: ItinerarioWithEscalas) => void;
  etaViewMode?: 'dias' | 'fecha' | 'ambos';
}

// Agrupar itinerarios por servicio
function groupByService(itinerarios: ItinerarioWithEscalas[]) {
  const grouped = new Map<string, ItinerarioWithEscalas[]>();
  
  itinerarios.forEach((it) => {
    const key = it.servicio;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(it);
  });
  
  return Array.from(grouped.entries()).map(([servicio, items]) => {
    // Obtener todos los consorcios únicos del servicio
    const consorcios = Array.from(new Set(
      items.map(it => it.consorcio).filter((c): c is string => !!c)
    )).sort();
    
    // Ordenar items por consorcio para agruparlos visualmente
    const itemsOrdenados = [...items].sort((a, b) => {
      const consorcioA = a.consorcio || '';
      const consorcioB = b.consorcio || '';
      return consorcioA.localeCompare(consorcioB);
    });
    
    return {
      servicio,
      consorcios, // Ahora es un array de consorcios
      items: itemsOrdenados,
    };
  });
}

// Obtener todos los PODs únicos de un grupo de servicios, ordenados por ETA del primer viaje
function getAllPODs(itinerarios: ItinerarioWithEscalas[]): string[] {
  if (itinerarios.length === 0) return [];
  
  // Encontrar el primer viaje (el más antiguo por ETD)
  const primerViaje = [...itinerarios]
    .filter((it) => it.escalas && it.escalas.length > 0)
    .sort((a, b) => {
      if (!a.etd || !b.etd) return 0;
      return new Date(a.etd).getTime() - new Date(b.etd).getTime();
    })[0];
  
  if (!primerViaje || !primerViaje.escalas) {
    // Si no hay primer viaje con escalas, usar orden alfabético como fallback
    const pods = new Set<string>();
    itinerarios.forEach((it) => {
      it.escalas?.forEach((escala) => {
        pods.add(escala.puerto);
      });
    });
    return Array.from(pods).sort();
  }
  
  // Ordenar escalas del primer viaje por ETA (de menor a mayor)
  const escalasPrimerViajeOrdenadas = [...primerViaje.escalas].sort((a, b) => {
    // Ordenar por ETA (fecha de arribo) de menor a mayor
    if (!a.eta && !b.eta) return (a.orden || 0) - (b.orden || 0);
    if (!a.eta) return 1;
    if (!b.eta) return -1;
    return new Date(a.eta).getTime() - new Date(b.eta).getTime();
  });
  
  // Extraer los PODs en el orden del primer viaje
  const podsOrdenados = escalasPrimerViajeOrdenadas.map((escala) => escala.puerto);
  
  // Agregar cualquier POD que no esté en el primer viaje (al final, ordenados alfabéticamente)
  const podsSet = new Set(podsOrdenados);
  itinerarios.forEach((it) => {
    it.escalas?.forEach((escala) => {
      if (!podsSet.has(escala.puerto)) {
        podsSet.add(escala.puerto);
        podsOrdenados.push(escala.puerto);
      }
    });
  });
  
  // Ordenar los PODs adicionales alfabéticamente y agregarlos al final
  const podsAdicionales = podsOrdenados.slice(escalasPrimerViajeOrdenadas.length).sort();
  return [...podsOrdenados.slice(0, escalasPrimerViajeOrdenadas.length), ...podsAdicionales];
}

// Formatear fecha
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

export function ItinerarioTable({ itinerarios, onViewDetail, etaViewMode = 'dias' }: ItinerarioTableProps) {
  const grouped = useMemo(() => groupByService(itinerarios), [itinerarios]);
  
  // Obtener todos los PODs únicos para crear columnas dinámicas
  const allPODs = useMemo(() => getAllPODs(itinerarios), [itinerarios]);

  if (itinerarios.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-12 text-center">
        <p className="text-slate-500 dark:text-slate-400">No hay itinerarios disponibles</p>
      </div>
    );
  }

  return (
    <div className="space-y-2" data-itinerario-table>
      {grouped.map((group) => {
        const groupPODs = getAllPODs(group.items);
        
        return (
          <div
            key={group.servicio}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden shadow-sm flex flex-col"
          >
            {/* Header del servicio */}
            <div className="bg-[#0A203F] dark:bg-[#0F1C33] px-3 py-2 border-b border-[#00AEEF]/30 flex-shrink-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Mostrar todos los logos de consorcios */}
                {group.consorcios.map((consorcio) => {
                  const consorcioUpper = consorcio.toUpperCase();
                  const logos: React.ReactElement[] = [];
                  
                  // Detectar y mostrar logos
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
                        className="h-12 w-auto object-contain flex-shrink-0"
                        style={{ display: 'block', maxWidth: '100px' }}
                        onLoad={() => console.log('Logo MSC cargado correctamente')}
                        onError={(e) => {
                          console.error('Error cargando logo MSC para:', consorcio, e);
                          console.error('Ruta intentada:', getImageSrc('/msc.png'));
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
                        className="h-12 w-auto object-contain flex-shrink-0"
                        style={{ display: 'block', maxWidth: '100px' }}
                        onLoad={() => console.log('Logo COSCO cargado correctamente')}
                        onError={(e) => {
                          console.error('Error cargando logo COSCO para:', consorcio, e);
                          console.error('Ruta intentada:', getImageSrc('/cosco.png'));
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
                        className="h-12 w-auto object-contain flex-shrink-0"
                        style={{ display: 'block', maxWidth: '100px' }}
                        onLoad={() => console.log('Logo EVERGREEN cargado correctamente')}
                        onError={(e) => {
                          console.error('Error cargando logo EVERGREEN para:', consorcio, e);
                          console.error('Ruta intentada:', getImageSrc('/evergreen.png'));
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    );
                  }
                  
                  return <React.Fragment key={consorcio}>{logos}</React.Fragment>;
                })}
                <div className="flex-1 min-w-0">
                  {group.consorcios.length > 0 ? (
                    <>
                      <h2 className="text-lg font-bold text-white leading-tight">
                        {group.consorcios.join(' / ')}
                      </h2>
                      <p className="text-xs text-[#4FC3F7] mt-0.5">
                        Servicio: <span className="font-semibold">{group.servicio}</span>
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-[#4FC3F7]">
                      Servicio: <span className="font-semibold">{group.servicio}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Tabla */}
            <div className="overflow-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-20">
                  <tr>
                    <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide sticky left-0 bg-slate-50 dark:bg-slate-900/50 z-30">
                      Consorcio
                    </th>
                    <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide sticky left-[80px] bg-slate-50 dark:bg-slate-900/50 z-30">
                      Nave
                    </th>
                    <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                      Viaje
                    </th>
                    <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                      Semana
                    </th>
                    <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                      POL
                    </th>
                    <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                      ETD
                    </th>
                    {groupPODs.map((pod) => (
                      <th
                        key={pod}
                        className="px-2 py-1.5 text-center text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide"
                      >
                        {pod}
                      </th>
                    ))}
                    <th className="px-2 py-1.5 text-center text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide sticky right-0 bg-slate-50 dark:bg-slate-900/50 z-30">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {group.items.map((itinerario, index) => {
                    // Crear mapa de escalas por puerto para acceso rápido
                    const escalasMap = new Map(
                      itinerario.escalas?.map((e) => [e.puerto, e]) || []
                    );
                    
                    // Detectar si es el primer item de un consorcio diferente
                    const prevConsorcio = index > 0 ? group.items[index - 1].consorcio : null;
                    const isNewConsorcioGroup = itinerario.consorcio !== prevConsorcio;

                    return (
                      <React.Fragment key={itinerario.id}>
                        {isNewConsorcioGroup && index > 0 && (
                          <tr>
                            <td colSpan={8 + groupPODs.length} className="px-2 py-1 bg-slate-100 dark:bg-slate-900/50 border-t border-slate-300 dark:border-slate-600"></td>
                          </tr>
                        )}
                        <tr
                          className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors"
                        >
                          <td className="px-2 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 sticky left-0 bg-white dark:bg-slate-800 z-10">
                            {itinerario.consorcio || '—'}
                          </td>
                          <td className="px-2 py-1.5 text-xs font-medium text-slate-900 dark:text-slate-100 sticky left-[80px] bg-white dark:bg-slate-800 z-10">
                            {itinerario.nave}
                          </td>
                        <td className="px-2 py-1.5 text-xs text-slate-700 dark:text-slate-300">
                          {itinerario.viaje}
                        </td>
                        <td className="px-2 py-1.5 text-xs text-slate-700 dark:text-slate-300">
                          {itinerario.semana || '—'}
                        </td>
                        <td className="px-2 py-1.5 text-xs text-slate-700 dark:text-slate-300">
                          {itinerario.pol}
                        </td>
                        <td className="px-2 py-1.5 text-xs text-slate-700 dark:text-slate-300">
                          {formatDate(itinerario.etd)}
                        </td>
                        {groupPODs.map((pod) => {
                          const escala = escalasMap.get(pod);
                          const hasDias = escala?.dias_transito;
                          const hasFecha = escala?.eta;
                          
                          return (
                            <td
                              key={pod}
                              className="px-2 py-1.5 text-center text-xs"
                            >
                              {etaViewMode === 'dias' && hasDias ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#00AEEF]/10 text-[#00AEEF] dark:bg-[#4FC3F7]/20 dark:text-[#4FC3F7]">
                                  {escala.dias_transito}d
                                </span>
                              ) : etaViewMode === 'fecha' && hasFecha ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                                  {formatDate(escala.eta)}
                                </span>
                              ) : etaViewMode === 'ambos' ? (
                                <div className="flex flex-col items-center gap-0.5">
                                  {hasDias && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#00AEEF]/10 text-[#00AEEF] dark:bg-[#4FC3F7]/20 dark:text-[#4FC3F7]">
                                      {escala.dias_transito}d
                                    </span>
                                  )}
                                  {hasFecha && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                                      {formatDate(escala.eta)}
                                    </span>
                                  )}
                                  {!hasDias && !hasFecha && (
                                    <span className="text-slate-400">—</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-2 py-1.5 text-center sticky right-0 bg-white dark:bg-slate-800 z-10">
                          <button
                            onClick={() => onViewDetail(itinerario)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-[#00AEEF] hover:text-[#4FC3F7] hover:bg-[#00AEEF]/10 dark:hover:bg-[#4FC3F7]/20 rounded transition-all duration-150"
                          >
                            <Eye className="h-3 w-3" />
                            Ver
                          </button>
                        </td>
                      </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

