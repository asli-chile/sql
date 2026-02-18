'use client';

import { useMemo, useState, useEffect } from 'react';
import React from 'react';
import { Eye, Edit2, X, Save, Plus, Ship, MapPin } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import { useTheme } from '@/contexts/ThemeContext';
import type { ItinerarioWithEscalas } from '@/types/itinerarios';

interface ItinerarioTableProps {
  itinerarios: ItinerarioWithEscalas[];
  onViewDetail: (itinerario: ItinerarioWithEscalas) => void;
  etaViewMode?: 'dias' | 'fecha' | 'ambos';
  hideActionColumn?: boolean;
  onGroupServiceChange?: (itinerarioIds: string[], nuevoServicio: string, nuevoConsorcio: string | null) => Promise<void>;
  onAddItinerario?: (servicio: string, consorcio: string | null) => void;
  regionFilter?: string | null; // Filtro de región para mostrar solo grupos de esa región
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

// Obtener todas las regiones únicas de un itinerario
function obtenerRegiones(itinerario: ItinerarioWithEscalas): string[] {
  if (!itinerario.escalas || itinerario.escalas.length === 0) {
    return ['SIN REGIÓN'];
  }
  
  const regionesSet = new Set<string>();
  itinerario.escalas.forEach((escala) => {
    if (escala.area) {
      const region = escala.area.toUpperCase().trim();
      if (region) {
        regionesSet.add(region);
      }
    }
  });
  
  if (regionesSet.size === 0) {
    return ['SIN REGIÓN'];
  }
  
  return Array.from(regionesSet).sort();
}

// Agrupar itinerarios por servicio y región
// Si un itinerario tiene múltiples regiones, aparecerá en múltiples grupos
// Si regionFilter está presente, solo se crearán grupos para esa región específica
function groupByService(itinerarios: ItinerarioWithEscalas[], regionFilter?: string | null) {
  const grouped = new Map<string, ItinerarioWithEscalas[]>();
  
  // Normalizar el filtro de región si está presente
  const regionFilterNormalizado = regionFilter 
    ? regionFilter.toUpperCase().trim() 
    : null;
  
  itinerarios.forEach((it) => {
    // Normalizar el nombre del servicio para agrupar variantes
    const servicioNormalizado = normalizarNombreServicio(it.servicio);
    // Obtener todas las regiones del itinerario (ya normalizadas)
    const regiones = obtenerRegiones(it);
    
    // Si hay un filtro de región, solo usar esa región específica
    const regionesParaAgrupar = regionFilterNormalizado 
      ? regiones.filter(region => region === regionFilterNormalizado)
      : regiones;
    
    // Si no hay regiones para agrupar (por ejemplo, el filtro no coincide), saltar este itinerario
    if (regionesParaAgrupar.length === 0) {
      return;
    }
    
    // Agregar el itinerario a cada grupo de región correspondiente
    regionesParaAgrupar.forEach((region) => {
      // Crear key combinando servicio y región
      const key = `${servicioNormalizado}|||${region}`;
      
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(it);
    });
  });
  
  return Array.from(grouped.entries()).map(([key, items]) => {
    const [servicioNormalizado, region] = key.split('|||');
    
    // Obtener el servicio original (el más común o el primero)
    const serviciosOriginales = items.map(it => it.servicio);
    const servicioOriginal = serviciosOriginales[0] || servicioNormalizado;
    
    // Obtener todos los consorcios únicos del servicio
    const consorcios = Array.from(new Set(
      items.map(it => it.consorcio).filter((c): c is string => !!c)
    )).sort();
    
    // Filtrar escalas para mostrar solo las de la región del grupo
    const itemsConEscalasFiltradas = items.map(it => {
      if (!it.escalas || it.escalas.length === 0) {
        return it;
      }
      
      // Filtrar escalas que pertenecen a esta región
      const escalasFiltradas = it.escalas.filter(escala => {
        if (!escala.area) return false;
        return escala.area.toUpperCase().trim() === region;
      });
      
      // Si no hay escalas de esta región, mantener todas las escalas (para mostrar el itinerario completo)
      // pero marcar que este grupo es para esta región específica
      return {
        ...it,
        escalas: escalasFiltradas.length > 0 ? escalasFiltradas : it.escalas,
      };
    });
    
    // Ordenar items primero por ETD (ascendente), luego por consorcio
    const itemsOrdenados = [...itemsConEscalasFiltradas].sort((a, b) => {
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
      region: region, // Región del grupo
      consorcios, // Ahora es un array de consorcios
      items: itemsOrdenados,
    };
  }).sort((a, b) => {
    // Ordenar primero por región (orden definido: ASIA, EUROPA, AMERICA, INDIA-MEDIOORIENTE, SIN REGIÓN)
    const ordenRegiones: Record<string, number> = {
      'ASIA': 1,
      'EUROPA': 2,
      'AMERICA': 3,
      'INDIA-MEDIOORIENTE': 4,
      'INDIA': 4,
      'MEDIOORIENTE': 4,
      'SIN REGIÓN': 99,
    };
    
    const ordenA = ordenRegiones[a.region] || 50;
    const ordenB = ordenRegiones[b.region] || 50;
    
    if (ordenA !== ordenB) {
      return ordenA - ordenB;
    }
    
    // Si tienen la misma región, ordenar por servicio
    return a.servicio.localeCompare(b.servicio);
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
  onGroupServiceChange,
  onAddItinerario,
  regionFilter
}: ItinerarioTableProps) {
  const { theme } = useTheme();
  const grouped = useMemo(() => {
    // Pasar el filtro de región directamente a groupByService para que solo cree grupos de esa región
    return groupByService(itinerarios, regionFilter || undefined);
  }, [itinerarios, regionFilter]);
  
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
            key={`${group.servicio}-${group.region}`}
            className={`rounded-xl border overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-all duration-200 ${theme === 'dark' 
              ? 'border-[#3D3D3D]/50 bg-gradient-to-br from-[#2D2D2D] to-[#1F1F1F]' 
              : 'border-[#E1E1E1] bg-white'
            }`}
          >
            {/* Header del servicio */}
            <div className={`bg-gradient-to-r from-[#0078D4] via-[#00AEEF] to-[#0078D4] dark:from-[#005A9E] dark:via-[#0078D4] dark:to-[#005A9E] px-4 py-3 border-b ${theme === 'dark' ? 'border-[#00AEEF]/30' : 'border-[#005A9E]/30'} flex-shrink-0 shadow-lg`}>
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
                              {group.region && group.region !== 'SIN REGIÓN' && (
                                <> • Región: <span className="font-semibold">{group.region}</span></>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {onAddItinerario && (
                              <button
                                onClick={() => {
                                  const servicio = group.items.length > 0 ? group.items[0].servicio : group.servicio;
                                  const consorcio = group.consorcios.length > 0 ? group.consorcios[0] : null;
                                  onAddItinerario(servicio, consorcio);
                                }}
                                className="flex-shrink-0 p-2 rounded-xl text-white/90 hover:text-white hover:bg-white/20 transition-all duration-200 hover:scale-110 active:scale-95 shadow-sm"
                                title="Agregar nueva nave al servicio"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            )}
                            {onGroupServiceChange && (
                              <button
                                onClick={() => {
                                  const itinerarioIds = group.items.map(it => it.id);
                                  setEditingGroup({
                                    servicio: group.servicio,
                                    itinerarioIds
                                  });
                                }}
                                className="flex-shrink-0 p-2 rounded-xl text-white/90 hover:text-white hover:bg-white/20 transition-all duration-200 hover:scale-110 active:scale-95 shadow-sm"
                                title="Editar servicio/consorcio del grupo"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  {group.region && group.region !== 'SIN REGIÓN' && (
                    <div className="flex-shrink-0 ml-4">
                      <h3 className="text-lg font-bold text-white dark:text-white leading-tight">
                        {group.region}
                      </h3>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tabla */}
            <div className="overflow-auto">
              <table className="w-full text-xs">
                <thead className={`${theme === 'dark' 
                  ? 'bg-gradient-to-br from-[#1F1F1F] to-[#2D2D2D] border-b border-[#3D3D3D]' 
                  : 'bg-gradient-to-br from-[#E8F4F8] to-[#F0F8FC] border-b border-[#C0E0F0]'
                } sticky top-0 z-20 shadow-sm`}>
                  <tr>
                    <th className={`px-2 py-1.5 text-center text-[10px] font-semibold ${theme === 'dark' ? 'text-[#C0C0C0]' : 'text-[#1F1F1F]'} uppercase tracking-wide sticky left-0 ${theme === 'dark' ? 'bg-[#1F1F1F]' : 'bg-[#E8F4F8]'} z-30`}>
                      Naviera
                    </th>
                    <th className={`px-2 py-1.5 text-center text-[10px] font-semibold ${theme === 'dark' ? 'text-[#C0C0C0]' : 'text-[#1F1F1F]'} uppercase tracking-wide sticky left-[80px] ${theme === 'dark' ? 'bg-[#1F1F1F]' : 'bg-[#E8F4F8]'} z-30`}>
                      Nave
                    </th>
                    <th className={`px-2 py-1.5 text-center text-[10px] font-semibold ${theme === 'dark' ? 'text-[#C0C0C0]' : 'text-[#1F1F1F]'} uppercase tracking-wide`}>
                      Viaje
                    </th>
                    <th className={`px-2 py-1.5 text-center text-[10px] font-semibold ${theme === 'dark' ? 'text-[#C0C0C0]' : 'text-[#1F1F1F]'} uppercase tracking-wide`}>
                      Semana
                    </th>
                    <th className={`px-2 py-1.5 text-center text-[10px] font-semibold ${theme === 'dark' ? 'text-[#C0C0C0]' : 'text-[#1F1F1F]'} uppercase tracking-wide`}>
                      POL
                    </th>
                    <th className={`px-2 py-1.5 text-center text-[10px] font-semibold ${theme === 'dark' ? 'text-[#C0C0C0]' : 'text-[#1F1F1F]'} uppercase tracking-wide`}>
                      ETD
                    </th>
                    {groupPODs.map((pod) => (
                      <th
                        key={pod}
                        className={`px-2 py-1.5 text-center text-[10px] font-semibold ${theme === 'dark' ? 'text-[#C0C0C0]' : 'text-[#1F1F1F]'} uppercase tracking-wide`}
                      >
                        {pod}
                      </th>
                    ))}
                    {!hideActionColumn && (
                      <th className={`px-2 py-1.5 text-center text-[10px] font-semibold ${theme === 'dark' ? 'text-[#C0C0C0]' : 'text-[#1F1F1F]'} uppercase tracking-wide sticky right-0 ${theme === 'dark' ? 'bg-[#1F1F1F]' : 'bg-[#E8F4F8]'} z-30`}>
                        Acción
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className={`divide-y ${theme === 'dark' ? 'divide-[#3D3D3D]' : 'divide-[#E1E1E1]'}`}>
                  {group.items.map((itinerario, index) => {
                    // Crear mapa de escalas por puerto para acceso rápido
                    const escalasMap = new Map(
                      itinerario.escalas?.map((e) => [e.puerto, e]) || []
                    );
                    
                    return (
                      <tr
                        key={`${itinerario.id}-${group.region}`}
                        className={`hover:bg-opacity-50 transition-colors ${theme === 'dark' 
                          ? 'hover:bg-[#3D3D3D]/50' 
                          : 'hover:bg-[#F3F3F3]'
                        }`}
                      >
                          <td className={`px-2 py-1.5 text-center text-xs font-medium ${theme === 'dark' ? 'text-white' : 'text-[#1F1F1F]'} sticky left-0 ${theme === 'dark' ? 'bg-[#2D2D2D]' : 'bg-white'} z-10`}>
                            {itinerario.naviera || '—'}
                          </td>
                          <td className={`px-2 py-1.5 text-center text-xs font-medium ${theme === 'dark' ? 'text-white' : 'text-[#1F1F1F]'} sticky left-[80px] ${theme === 'dark' ? 'bg-[#2D2D2D]' : 'bg-white'} z-10`}>
                            {itinerario.nave}
                          </td>
                        <td className={`px-2 py-1.5 text-center text-xs ${theme === 'dark' ? 'text-white' : 'text-[#1F1F1F]'}`}>
                          {itinerario.viaje}
                        </td>
                        <td className={`px-2 py-1.5 text-center text-xs ${theme === 'dark' ? 'text-white' : 'text-[#1F1F1F]'}`}>
                          {itinerario.semana || '—'}
                        </td>
                        <td className={`px-2 py-1.5 text-center text-xs ${theme === 'dark' ? 'text-white' : 'text-[#1F1F1F]'}`}>
                          {itinerario.pol}
                        </td>
                        <td className={`px-2 py-1.5 text-center text-xs ${theme === 'dark' ? 'text-white' : 'text-[#1F1F1F]'}`}>
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
                                <span className={`inline-flex items-center px-2 py-1 text-[10px] font-semibold rounded-lg ${theme === 'dark' 
                                  ? 'bg-[#00AEEF]/20 text-[#4FC3F7] border border-[#00AEEF]/30' 
                                  : 'bg-[#00AEEF]/10 text-[#00AEEF] border border-[#00AEEF]/20'
                                }`}>
                                  {escala.dias_transito}d
                                </span>
                              ) : etaViewMode === 'fecha' && hasFecha ? (
                                <span className={`inline-flex items-center px-2 py-1 text-[10px] font-semibold rounded-lg ${theme === 'dark' 
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                                  : 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                                }`}>
                                  {formatDate(escala.eta)}
                                </span>
                              ) : etaViewMode === 'ambos' ? (
                                <div className="flex flex-col items-center gap-1">
                                  {hasDias && (
                                    <span className={`inline-flex items-center px-2 py-1 text-[10px] font-semibold rounded-lg ${theme === 'dark' 
                                      ? 'bg-[#00AEEF]/20 text-[#4FC3F7] border border-[#00AEEF]/30' 
                                      : 'bg-[#00AEEF]/10 text-[#00AEEF] border border-[#00AEEF]/20'
                                    }`}>
                                      {escala.dias_transito}d
                                    </span>
                                  )}
                                  {hasFecha && (
                                    <span className={`inline-flex items-center px-2 py-1 text-[10px] font-semibold rounded-lg ${theme === 'dark' 
                                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                                      : 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                                    }`}>
                                      {formatDate(escala.eta)}
                                    </span>
                                  )}
                                  {!hasDias && !hasFecha && (
                                    <span className={theme === 'dark' ? 'text-[#A0A0A0]' : 'text-[#6B6B6B]'}>—</span>
                                  )}
                                </div>
                              ) : (
                                <span className={theme === 'dark' ? 'text-[#A0A0A0]' : 'text-[#6B6B6B]'}>—</span>
                              )}
                            </td>
                          );
                        })}
                        {!hideActionColumn && (
                          <td className={`px-2 py-1.5 text-center sticky right-0 ${theme === 'dark' ? 'bg-[#2D2D2D]' : 'bg-white'} z-10`}>
                            <button
                              onClick={() => onViewDetail(itinerario)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-semibold rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm hover:shadow-md ${
                                theme === 'dark'
                                  ? 'bg-[#00AEEF]/20 text-[#4FC3F7] hover:bg-[#00AEEF]/30 border border-[#00AEEF]/30'
                                  : 'bg-[#00AEEF]/10 text-[#00AEEF] hover:bg-[#00AEEF]/20 border border-[#00AEEF]/20'
                              }`}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md px-4">
          <div className={`relative w-full max-w-md rounded-xl shadow-2xl ${theme === 'dark' 
            ? 'bg-gradient-to-br from-[#2D2D2D] to-[#1F1F1F] border border-[#3D3D3D]/50' 
            : 'bg-white border border-[#E1E1E1]'
          }`}>
            {/* Header */}
            <div className={`flex items-center justify-between px-4 sm:px-6 py-4 border-b ${theme === 'dark' 
              ? 'border-[#3D3D3D] bg-gradient-to-r from-[#0078D4]/20 via-[#00AEEF]/20 to-[#0078D4]/20' 
              : 'border-[#E1E1E1] bg-gradient-to-r from-[#00AEEF]/10 via-white to-[#00AEEF]/10'
            }`}>
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className={`p-2 rounded-xl flex-shrink-0 ${theme === 'dark' ? 'bg-[#00AEEF]/20' : 'bg-[#00AEEF]/10'}`}>
                  <Edit2 className={`h-5 w-5 ${theme === 'dark' ? 'text-[#4FC3F7]' : 'text-[#00AEEF]'}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-[#1F1F1F]'}`}>
                    Editar Servicio del Grupo
                  </h2>
                  <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-[#A0A0A0]' : 'text-[#6B6B6B]'}`}>
                    Cambiará el servicio de {editingGroup.itinerarioIds.length} itinerario(s)
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setEditingGroup(null);
                  setNuevoServicioId('');
                }}
                className={`p-2 rounded-xl transition-all duration-200 flex-shrink-0 ${
                  theme === 'dark' 
                    ? 'hover:bg-[#3D3D3D]/80 text-[#C0C0C0] hover:text-white' 
                    : 'hover:bg-gray-100 text-[#323130] hover:text-[#1F1F1F]'
                } hover:scale-110 active:scale-95`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="px-4 sm:px-6 py-4 sm:py-6 space-y-4">
              <div className={`rounded-xl border ${theme === 'dark' 
                ? 'border-[#3D3D3D]/50 bg-[#2D2D2D]/50' 
                : 'border-[#E1E1E1] bg-gray-50'
              } p-4`}>
                <label className={`block text-xs font-semibold uppercase tracking-wide mb-2 ${theme === 'dark' ? 'text-[#A0A0A0]' : 'text-[#6B6B6B]'}`}>
                  Servicio Actual
                </label>
                <p className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-[#1F1F1F]'}`}>
                  {editingGroup.servicio}
                </p>
              </div>

              <div className={`rounded-xl border ${theme === 'dark' 
                ? 'border-[#3D3D3D]/50 bg-gradient-to-br from-[#2D2D2D] to-[#1F1F1F]' 
                : 'border-[#E1E1E1] bg-white shadow-sm'
              } p-4`}>
                <label className={`block text-xs font-semibold uppercase tracking-wide mb-3 ${theme === 'dark' ? 'text-[#A0A0A0]' : 'text-[#6B6B6B]'}`}>
                  Nuevo Servicio
                </label>
                {loadingServicios ? (
                  <div className="flex items-center justify-center py-4">
                    <div className={`h-6 w-6 animate-spin rounded-full border-3 ${theme === 'dark' ? 'border-[#00AEEF]/30 border-t-[#00AEEF]' : 'border-[#00AEEF]/30 border-t-[#00AEEF]'}`} />
                  </div>
                ) : (
                  <select
                    value={nuevoServicioId}
                    onChange={(e) => setNuevoServicioId(e.target.value)}
                    className={`w-full rounded-lg border ${theme === 'dark' 
                      ? 'border-[#3D3D3D]/50 bg-[#1F1F1F] text-white' 
                      : 'border-gray-300 bg-white text-[#1F1F1F]'
                    } px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00AEEF] focus:border-transparent transition-all`}
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
            <div className={`flex items-center justify-end gap-3 px-4 sm:px-6 py-4 border-t ${theme === 'dark' ? 'border-[#3D3D3D]' : 'border-[#E1E1E1]'}`}>
              <button
                onClick={() => {
                  setEditingGroup(null);
                  setNuevoServicioId('');
                }}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  theme === 'dark'
                    ? 'text-slate-300 hover:text-white hover:bg-[#3D3D3D]'
                    : 'text-gray-600 hover:text-[#1F1F1F] hover:bg-gray-100'
                }`}
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveGroupService}
                disabled={!nuevoServicioId || isSavingGroup}
                className={`relative inline-flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-semibold transition-all duration-200 overflow-hidden group shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                  theme === 'dark'
                    ? 'bg-gradient-to-r from-[#0078D4] to-[#00AEEF] hover:from-[#005A9E] hover:to-[#0099CC] text-white'
                    : 'bg-gradient-to-r from-[#00AEEF] to-[#0099CC] hover:from-[#0099CC] hover:to-[#0078D4] text-white'
                }`}
              >
                <span className="relative z-10 flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  {isSavingGroup ? 'Guardando...' : 'Guardar Cambios'}
                </span>
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

