'use client';

import { useMemo, useState, useEffect } from 'react';
import React from 'react';
import { Eye, Edit2, X, Save } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import type { ItinerarioWithEscalas } from '@/types/itinerarios';

interface ItinerarioTableProps {
  itinerarios: ItinerarioWithEscalas[];
  onViewDetail: (itinerario: ItinerarioWithEscalas) => void;
  etaViewMode?: 'dias' | 'fecha' | 'ambos';
  hideActionColumn?: boolean;
  onGroupServiceChange?: (itinerarioIds: string[], nuevoServicio: string, nuevoConsorcio: string | null) => Promise<void>;
}

// Normalizar nombre de servicio para agrupar variantes del mismo servicio
function normalizarNombreServicio(nombre: string): string {
  if (!nombre) return nombre;
  
  // Remover espacios extra y convertir a mayúsculas para comparación
  let normalizado = nombre.trim().toUpperCase();
  
  // Detectar servicios con variantes como "ANDES EXPRESS/AX1/AN1" y "ANDES EXPRESS/AX2/AN2"
  // Estos deberían agruparse como "ANDES EXPRESS"
  
  // Patrón: Servicio con variantes separadas por barras
  // Ejemplos:
  // - "ANDES EXPRESS/AX1/AN1" -> "ANDES EXPRESS"
  // - "ANDES EXPRESS/AX2/AN2" -> "ANDES EXPRESS"
  // - "SERVICIO/VARIANTE1/VARIANTE2" -> "SERVICIO"
  
  const partes = normalizado.split('/').map(p => p.trim()).filter(p => p.length > 0);
  
  if (partes.length >= 2) {
    // Si tiene al menos 2 partes separadas por barras
    const primeraParte = partes[0];
    
    // Verificar si las partes siguientes parecen ser variantes (códigos cortos, números, etc.)
    const sonVariantes = partes.slice(1).every(parte => {
      // Una variante típicamente es:
      // - Un código corto (2-4 caracteres) como "AX1", "AN2", "INCA"
      // - O contiene números y letras mezclados
      return parte.length <= 6 && /^[A-Z0-9]+$/.test(parte);
    });
    
    if (sonVariantes && primeraParte.length > 3) {
      // Si las partes siguientes son variantes y la primera parte es suficientemente descriptiva,
      // usar solo la primera parte como base para agrupar
      return primeraParte;
    }
  }
  
  // Si no coincide con el patrón de variantes, devolver el nombre completo normalizado
  return normalizado;
}

// Agrupar itinerarios por servicio (normalizado)
function groupByService(itinerarios: ItinerarioWithEscalas[]) {
  const grouped = new Map<string, ItinerarioWithEscalas[]>();
  
  itinerarios.forEach((it) => {
    // Normalizar el nombre del servicio para agrupar variantes
    const servicioNormalizado = normalizarNombreServicio(it.servicio);
    const key = servicioNormalizado;
    
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(it);
  });
  
  return Array.from(grouped.entries()).map(([servicioNormalizado, items]) => {
    // Obtener el servicio original (el más común o el primero)
    // Si todos tienen el mismo servicio, usar ese; si no, usar el más frecuente
    const serviciosOriginales = items.map(it => it.servicio);
    const servicioOriginal = serviciosOriginales[0] || servicioNormalizado;
    
    // Obtener todos los consorcios únicos del servicio
    const consorcios = Array.from(new Set(
      items.map(it => it.consorcio).filter((c): c is string => !!c)
    )).sort();
    
    // Ordenar items primero por ETD (ascendente), luego por consorcio
    const itemsOrdenados = [...items].sort((a, b) => {
      // Primero ordenar por ETD
      if (a.etd && b.etd) {
        const etdA = new Date(a.etd).getTime();
        const etdB = new Date(b.etd).getTime();
        if (etdA !== etdB) {
          return etdA - etdB;
        }
      } else if (a.etd && !b.etd) {
        return -1; // a tiene ETD, b no -> a primero
      } else if (!a.etd && b.etd) {
        return 1; // b tiene ETD, a no -> b primero
      }
      // Si tienen el mismo ETD o ambos no tienen ETD, ordenar por naviera
      const navieraA = a.naviera || '';
      const navieraB = b.naviera || '';
      return navieraA.localeCompare(navieraB);
    });
    
    return {
      servicio: servicioOriginal, // Usar el servicio original, no el normalizado
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

export function ItinerarioTable({ 
  itinerarios, 
  onViewDetail, 
  etaViewMode = 'dias', 
  hideActionColumn = false,
  onGroupServiceChange 
}: ItinerarioTableProps) {
  const grouped = useMemo(() => groupByService(itinerarios), [itinerarios]);
  
  // Obtener todos los PODs únicos para crear columnas dinámicas
  const allPODs = useMemo(() => getAllPODs(itinerarios), [itinerarios]);
  
  // Estado para el modal de edición de grupo
  const [editingGroup, setEditingGroup] = useState<{
    servicio: string;
    itinerarioIds: string[];
  } | null>(null);
  const [serviciosDisponibles, setServiciosDisponibles] = useState<Array<{ id: string; nombre: string; consorcio: string | null; tipo: 'servicio_unico' | 'consorcio' }>>([]);
  const [nuevoServicioId, setNuevoServicioId] = useState<string>('');
  const [isSavingGroup, setIsSavingGroup] = useState(false);
  const [loadingServicios, setLoadingServicios] = useState(false);

  // Cargar servicios disponibles cuando se abre el modal
  useEffect(() => {
    const cargarServicios = async () => {
      if (!editingGroup) return;
      
      try {
        setLoadingServicios(true);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
        
        const [serviciosUnicosResponse, consorciosResponse] = await Promise.all([
          fetch(`${apiUrl}/api/admin/servicios-unicos`).then(r => r.json()).catch(() => ({ servicios: [] })),
          fetch(`${apiUrl}/api/admin/consorcios`).then(r => r.json()).catch(() => ({ consorcios: [] }))
        ]);

        const serviciosList: Array<{ id: string; nombre: string; consorcio: string | null; tipo: 'servicio_unico' | 'consorcio' }> = [];
        
        if (serviciosUnicosResponse?.servicios) {
          serviciosUnicosResponse.servicios
            .filter((s: any) => s.activo)
            .forEach((servicio: any) => {
              serviciosList.push({
                id: servicio.id,
                nombre: servicio.nombre,
                consorcio: servicio.naviera_nombre || null,
                tipo: 'servicio_unico',
              });
            });
        }

        if (consorciosResponse?.consorcios) {
          consorciosResponse.consorcios
            .filter((c: any) => c.activo)
            .forEach((consorcio: any) => {
              serviciosList.push({
                id: consorcio.id,
                nombre: consorcio.nombre,
                consorcio: 'Consorcio',
                tipo: 'consorcio',
              });
            });
        }

        serviciosList.sort((a, b) => a.nombre.localeCompare(b.nombre));
        setServiciosDisponibles(serviciosList);
      } catch (err) {
        console.error('Error cargando servicios:', err);
      } finally {
        setLoadingServicios(false);
      }
    };

    cargarServicios();
  }, [editingGroup]);

  const handleSaveGroupService = async () => {
    if (!editingGroup || !nuevoServicioId || !onGroupServiceChange) return;

    setIsSavingGroup(true);
    try {
      const servicioSeleccionado = serviciosDisponibles.find(s => s.id === nuevoServicioId);
      if (!servicioSeleccionado) {
        throw new Error('Servicio no encontrado');
      }

      const nuevoServicio = servicioSeleccionado.nombre;
      const nuevoConsorcio = servicioSeleccionado.tipo === 'consorcio' 
        ? servicioSeleccionado.nombre 
        : servicioSeleccionado.consorcio;

      await onGroupServiceChange(editingGroup.itinerarioIds, nuevoServicio, nuevoConsorcio);
      setEditingGroup(null);
      setNuevoServicioId('');
    } catch (err: any) {
      console.error('Error actualizando grupo:', err);
      alert(err?.message || 'Error al actualizar el servicio del grupo');
    } finally {
      setIsSavingGroup(false);
    }
  };

  if (itinerarios.length === 0) {
    return (
      <div className="border border-[#E1E1E1] dark:border-[#3D3D3D] bg-white dark:bg-[#2D2D2D] p-12 text-center" style={{ borderRadius: '4px' }}>
        <p className="text-[#6B6B6B] dark:text-[#A0A0A0]">No hay itinerarios disponibles</p>
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
            className="border border-[#E1E1E1] dark:border-[#3D3D3D] bg-white dark:bg-[#2D2D2D] overflow-hidden flex flex-col"
            style={{ borderRadius: '4px' }}
          >
            {/* Header del servicio */}
            <div className="bg-[#0078D4] dark:bg-[#0F1C33] px-3 py-2 border-b border-[#005A9E] dark:border-[#00AEEF]/30 flex-shrink-0">
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
                        onError={(e) => {
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
                        onError={(e) => {
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
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    );
                  }
                  
                  return <React.Fragment key={consorcio}>{logos}</React.Fragment>;
                })}
                <div className="flex-1 min-w-0 flex items-center justify-between">
                  <div className="flex-1 min-w-0 text-center flex items-center justify-center gap-2">
                    {(() => {
                      // Obtener navieras únicas de todos los itinerarios del grupo
                      const navierasUnicas = new Set<string>();
                      group.items.forEach((it: any) => {
                        if (it.navierasDelServicio && it.navierasDelServicio.length > 0) {
                          it.navierasDelServicio.forEach((nav: string) => navierasUnicas.add(nav));
                        } else if (it.consorcio) {
                          navierasUnicas.add(it.consorcio);
                        } else if (it.naviera) {
                          navierasUnicas.add(it.naviera);
                        }
                      });
                      
                      const navierasTexto = navierasUnicas.size > 0 
                        ? Array.from(navierasUnicas).join(' - ')
                        : (group.consorcios.length > 0 ? group.consorcios.join(' / ') : group.servicio);
                      
                      // Obtener regiones únicas de las escalas
                      const regionesUnicas = new Set<string>();
                      group.items.forEach((it: any) => {
                        if (it.escalas) {
                          it.escalas.forEach((escala: any) => {
                            if (escala.area) {
                              regionesUnicas.add(escala.area);
                            }
                          });
                        }
                      });
                      const regionesTexto = regionesUnicas.size > 0 
                        ? Array.from(regionesUnicas).join(' / ')
                        : null;
                      
                      return (
                        <>
                          <div className="flex-1 min-w-0 text-center">
                            <h2 className="text-lg font-bold text-white dark:text-white leading-tight">
                              {navierasTexto}
                            </h2>
                            <p className="text-xs text-white/90 dark:text-[#4FC3F7] mt-0.5">
                              Servicio: <span className="font-semibold">
                                {group.items.length > 0 ? group.items[0].servicio : group.servicio}
                              </span>
                            </p>
                          </div>
                          {onGroupServiceChange && (
                            <button
                              onClick={() => {
                                const itinerarioIds = group.items.map(it => it.id);
                                setEditingGroup({
                                  servicio: group.servicio,
                                  itinerarioIds
                                });
                              }}
                              className="flex-shrink-0 p-1.5 rounded-md text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                              title="Editar servicio/consorcio del grupo"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                          )}
                        </>
                      );
                    })()}
                  </div>
                  {(() => {
                    // Obtener regiones únicas de las escalas
                    const regionesUnicas = new Set<string>();
                    group.items.forEach((it: any) => {
                      if (it.escalas) {
                        it.escalas.forEach((escala: any) => {
                          if (escala.area) {
                            regionesUnicas.add(escala.area);
                          }
                        });
                      }
                    });
                    const regionesTexto = regionesUnicas.size > 0 
                      ? Array.from(regionesUnicas).join(' / ')
                      : null;
                    
                    return regionesTexto ? (
                      <div className="flex-shrink-0 ml-4">
                        <h3 className="text-lg font-bold text-white dark:text-white leading-tight">
                          {regionesTexto}
                        </h3>
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>
            </div>

            {/* Tabla */}
            <div className="overflow-auto">
              <table className="w-full text-xs">
                <thead className="bg-[#E8F4F8] dark:bg-[#1F1F1F] border-b border-[#C0E0F0] dark:border-[#3D3D3D] sticky top-0 z-20">
                  <tr>
                    <th className="px-2 py-1.5 text-center text-[10px] font-semibold text-[#1F1F1F] dark:text-[#C0C0C0] uppercase tracking-wide sticky left-0 bg-[#E8F4F8] dark:bg-[#1F1F1F] z-30">
                      Naviera
                    </th>
                    <th className="px-2 py-1.5 text-center text-[10px] font-semibold text-[#1F1F1F] dark:text-[#C0C0C0] uppercase tracking-wide sticky left-[80px] bg-[#E8F4F8] dark:bg-[#1F1F1F] z-30">
                      Nave
                    </th>
                    <th className="px-2 py-1.5 text-center text-[10px] font-semibold text-[#1F1F1F] dark:text-[#C0C0C0] uppercase tracking-wide">
                      Viaje
                    </th>
                    <th className="px-2 py-1.5 text-center text-[10px] font-semibold text-[#1F1F1F] dark:text-[#C0C0C0] uppercase tracking-wide">
                      Semana
                    </th>
                    <th className="px-2 py-1.5 text-center text-[10px] font-semibold text-[#1F1F1F] dark:text-[#C0C0C0] uppercase tracking-wide">
                      POL
                    </th>
                    <th className="px-2 py-1.5 text-center text-[10px] font-semibold text-[#1F1F1F] dark:text-[#C0C0C0] uppercase tracking-wide">
                      ETD
                    </th>
                    {groupPODs.map((pod) => (
                      <th
                        key={pod}
                        className="px-2 py-1.5 text-center text-[10px] font-semibold text-[#1F1F1F] dark:text-[#C0C0C0] uppercase tracking-wide"
                      >
                        {pod}
                      </th>
                    ))}
                    {!hideActionColumn && (
                      <th className="px-2 py-1.5 text-center text-[10px] font-semibold text-[#1F1F1F] dark:text-[#C0C0C0] uppercase tracking-wide sticky right-0 bg-[#E8F4F8] dark:bg-[#1F1F1F] z-30">
                        Acción
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E1E1E1] dark:divide-[#3D3D3D]">
                  {group.items.map((itinerario, index) => {
                    // Crear mapa de escalas por puerto para acceso rápido
                    const escalasMap = new Map(
                      itinerario.escalas?.map((e) => [e.puerto, e]) || []
                    );
                    
                    return (
                      <tr
                        key={itinerario.id}
                        className="hover:bg-[#F3F3F3] dark:hover:bg-[#3D3D3D] transition-colors"
                      >
                          <td className="px-2 py-1.5 text-center text-xs font-medium text-[#1F1F1F] dark:text-[#FFFFFF] sticky left-0 bg-white dark:bg-[#2D2D2D] z-10">
                            {itinerario.naviera || '—'}
                          </td>
                          <td className="px-2 py-1.5 text-center text-xs font-medium text-[#1F1F1F] dark:text-[#FFFFFF] sticky left-[80px] bg-white dark:bg-[#2D2D2D] z-10">
                            {itinerario.nave}
                          </td>
                        <td className="px-2 py-1.5 text-center text-xs text-[#1F1F1F] dark:text-[#FFFFFF]">
                          {itinerario.viaje}
                        </td>
                        <td className="px-2 py-1.5 text-center text-xs text-[#1F1F1F] dark:text-[#FFFFFF]">
                          {itinerario.semana || '—'}
                        </td>
                        <td className="px-2 py-1.5 text-center text-xs text-[#1F1F1F] dark:text-[#FFFFFF]">
                          {itinerario.pol}
                        </td>
                        <td className="px-2 py-1.5 text-center text-xs text-[#1F1F1F] dark:text-[#FFFFFF]">
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
                                <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium bg-[#E8F4FD] text-[#0078D4] dark:bg-[#1A3A52] dark:text-[#4FC3F7]" style={{ borderRadius: '4px' }}>
                                  {escala.dias_transito}d
                                </span>
                              ) : etaViewMode === 'fecha' && hasFecha ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium bg-[#DFF6DD] text-[#107C10] dark:bg-[#1A3A1A] dark:text-[#6FCF97]" style={{ borderRadius: '4px' }}>
                                  {formatDate(escala.eta)}
                                </span>
                              ) : etaViewMode === 'ambos' ? (
                                <div className="flex flex-col items-center gap-0.5">
                                  {hasDias && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium bg-[#E8F4FD] text-[#0078D4] dark:bg-[#1A3A52] dark:text-[#4FC3F7]" style={{ borderRadius: '4px' }}>
                                      {escala.dias_transito}d
                                    </span>
                                  )}
                                  {hasFecha && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium bg-[#DFF6DD] text-[#107C10] dark:bg-[#1A3A1A] dark:text-[#6FCF97]" style={{ borderRadius: '4px' }}>
                                      {formatDate(escala.eta)}
                                    </span>
                                  )}
                                  {!hasDias && !hasFecha && (
                                    <span className="text-[#6B6B6B] dark:text-[#A0A0A0]">—</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[#6B6B6B] dark:text-[#A0A0A0]">—</span>
                              )}
                            </td>
                          );
                        })}
                        {!hideActionColumn && (
                          <td className="px-2 py-1.5 text-center sticky right-0 bg-white dark:bg-[#2D2D2D] z-10">
                            <button
                              onClick={() => onViewDetail(itinerario)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-[#0078D4] hover:text-[#005A9E] hover:bg-[#E8F4FD] dark:hover:bg-[#3D3D3D] transition-all duration-150"
                              style={{ borderRadius: '4px' }}
                            >
                              <Eye className="h-3 w-3" />
                              Ver
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {/* Modal para editar servicio del grupo */}
      {editingGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-lg shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Editar Servicio del Grupo
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Cambiará el servicio de {editingGroup.itinerarioIds.length} itinerario(s)
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingGroup(null);
                  setNuevoServicioId('');
                }}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Servicio Actual
                </label>
                <p className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 px-3 py-2 rounded-lg">
                  {editingGroup.servicio}
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Nuevo Servicio
                </label>
                {loadingServicios ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#00AEEF] border-t-transparent" />
                  </div>
                ) : (
                  <select
                    value={nuevoServicioId}
                    onChange={(e) => setNuevoServicioId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#00AEEF] focus:border-transparent"
                  >
                    <option value="">Seleccionar nuevo servicio</option>
                    {serviciosDisponibles.map((servicio) => (
                      <option key={servicio.id} value={servicio.id}>
                        {servicio.tipo === 'servicio_unico' && servicio.consorcio 
                          ? `${servicio.nombre} (${servicio.consorcio})` 
                          : servicio.nombre}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => {
                  setEditingGroup(null);
                  setNuevoServicioId('');
                }}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveGroupService}
                disabled={!nuevoServicioId || isSavingGroup}
                className="inline-flex items-center gap-2 px-6 py-2 text-sm font-semibold text-white bg-[#00AEEF] hover:bg-[#4FC3F7] rounded-lg transition-all duration-150 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4" />
                {isSavingGroup ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

