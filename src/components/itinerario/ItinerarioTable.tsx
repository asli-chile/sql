'use client';

import { useMemo } from 'react';
import { Eye } from 'lucide-react';
import type { ItinerarioWithEscalas } from '@/types/itinerarios';

interface ItinerarioTableProps {
  itinerarios: ItinerarioWithEscalas[];
  onViewDetail: (itinerario: ItinerarioWithEscalas) => void;
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
  
  return Array.from(grouped.entries()).map(([servicio, items]) => ({
    servicio,
    consorcio: items[0]?.consorcio || null,
    items,
  }));
}

// Obtener todos los PODs únicos de un grupo de servicios
function getAllPODs(itinerarios: ItinerarioWithEscalas[]): string[] {
  const pods = new Set<string>();
  itinerarios.forEach((it) => {
    it.escalas?.forEach((escala) => {
      pods.add(escala.puerto);
    });
  });
  return Array.from(pods).sort();
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

export function ItinerarioTable({ itinerarios, onViewDetail }: ItinerarioTableProps) {
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
    <div className="space-y-6">
      {grouped.map((group) => {
        const groupPODs = getAllPODs(group.items);
        
        return (
          <div
            key={group.servicio}
            className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden shadow-sm"
          >
            {/* Header del servicio */}
            <div className="bg-[#0A203F] dark:bg-[#0F1C33] px-6 py-4 border-b border-[#00AEEF]/30">
              <h3 className="text-lg font-bold text-white">
                {group.servicio}
              </h3>
              {group.consorcio && (
                <p className="text-sm text-[#4FC3F7] mt-1">{group.consorcio}</p>
              )}
            </div>

            {/* Tabla */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide sticky left-0 bg-slate-50 dark:bg-slate-900/50 z-10">
                      Nave
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                      Viaje
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                      Semana
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                      POL
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                      ETD
                    </th>
                    {groupPODs.map((pod) => (
                      <th
                        key={pod}
                        className="px-4 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide"
                      >
                        {pod}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide sticky right-0 bg-slate-50 dark:bg-slate-900/50 z-10">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {group.items.map((itinerario) => {
                    // Crear mapa de escalas por puerto para acceso rápido
                    const escalasMap = new Map(
                      itinerario.escalas?.map((e) => [e.puerto, e]) || []
                    );

                    return (
                      <tr
                        key={itinerario.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-slate-100 sticky left-0 bg-white dark:bg-slate-800 z-10">
                          {itinerario.nave}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                          {itinerario.viaje}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                          {itinerario.semana || '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                          {itinerario.pol}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                          {formatDate(itinerario.etd)}
                        </td>
                        {groupPODs.map((pod) => {
                          const escala = escalasMap.get(pod);
                          return (
                            <td
                              key={pod}
                              className="px-4 py-3 text-center text-sm"
                            >
                              {escala?.dias_transito ? (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#00AEEF]/10 text-[#00AEEF] dark:bg-[#4FC3F7]/20 dark:text-[#4FC3F7]">
                                  {escala.dias_transito}d
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-center sticky right-0 bg-white dark:bg-slate-800 z-10">
                          <button
                            onClick={() => onViewDetail(itinerario)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#00AEEF] hover:text-[#4FC3F7] hover:bg-[#00AEEF]/10 dark:hover:bg-[#4FC3F7]/20 rounded-lg transition-all duration-150"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Ver detalle
                          </button>
                        </td>
                      </tr>
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

