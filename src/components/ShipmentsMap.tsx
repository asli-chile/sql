'use client';

import React, { useMemo, useState } from 'react';
import { DeckGL } from '@deck.gl/react';
import { ScatterplotLayer } from '@deck.gl/layers';
import { Map as MaplibreMap } from 'react-map-gl/maplibre';
import { CanvasContext } from '@luma.gl/core';
import 'maplibre-gl/dist/maplibre-gl.css';
import { getPortCoordinates } from '@/lib/port-coordinates';
import { getCountryFromPort, getCountryCoordinates } from '@/lib/country-coordinates';
import { Registro } from '@/types/registros';
import type { ActiveVessel } from '@/types/vessels';

interface CountryStats {
  country: string;
  coordinates: [number, number];
  ports: {
    [portName: string]: {
      confirmados: number;
      pendientes: number;
      cancelados: number;
      etdCumplida: number; // ETD en el pasado
      etaCumplida: number; // ETA en el pasado
      etdPendiente: number; // ETD en el futuro
      etaPendiente: number; // ETA en el futuro
      total: number;
    };
  };
  totalConfirmados: number;
  totalPendientes: number;
  totalCancelados: number;
  totalEtdCumplida: number;
  totalEtaCumplida: number;
  totalEtdPendiente: number;
  totalEtaPendiente: number;
  totalGeneral: number;
}

interface ShipmentsMapProps {
  registros: Registro[];
  activeVessels?: ActiveVessel[];
  className?: string;
}

const INITIAL_VIEW_STATE = {
  longitude: -70.0,
  latitude: -30.0,
  zoom: 1.5,
  pitch: 0, // Vista desde arriba (plano)
  bearing: 0
};

type VistaMapa = 'puerto' | 'pais';

const IS_DEV = process.env.NODE_ENV !== 'production';

interface OriginPortStats {
  name: string;
  coordinates: [number, number];
  totalEmbarques: number;
  depositos: string[];
}

// Fix for deck.gl v9 bug: ResizeObserver may fire before the GPU device is ready,
// causing CanvasContext.getMaxDrawingBufferSize to read limits from an undefined device.
// We guard the method so it returns a sane default until the device is available.
if (typeof window !== 'undefined') {
  const canvasContextProto = CanvasContext?.prototype as any;
  if (canvasContextProto && !canvasContextProto.__maxTextureGuardPatched) {
    const originalGetMaxDrawingBufferSize = canvasContextProto.getMaxDrawingBufferSize;
    canvasContextProto.getMaxDrawingBufferSize = function getMaxDrawingBufferSizePatched() {
      const maxTextureDimension: number | undefined = this?.device?.limits?.maxTextureDimension2D;

      if (typeof maxTextureDimension === 'number' && Number.isFinite(maxTextureDimension)) {
        return [maxTextureDimension, maxTextureDimension];
      }

      if (typeof originalGetMaxDrawingBufferSize === 'function') {
        try {
          const result = originalGetMaxDrawingBufferSize.call(this);
          if (Array.isArray(result) && result.length === 2) {
            return result;
          }
        } catch {
          // Ignore and fall back to default
        }
      }

      // Conservative fallback that keeps deck.gl running until the device is ready.
      return [4096, 4096];
    };
    canvasContextProto.__maxTextureGuardPatched = true;
  }
}

export function ShipmentsMap({ registros, activeVessels = [], className = '' }: ShipmentsMapProps) {
  const [hoveredCountry, setHoveredCountry] = useState<CountryStats | null>(null);
  const [hoveredOriginPort, setHoveredOriginPort] = useState<OriginPortStats | null>(null);
  const [hoveredVessel, setHoveredVessel] = useState<ActiveVessel | null>(null);
  const [vista, setVista] = useState<VistaMapa>('puerto');
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const [isMounted, setIsMounted] = useState(false);
  const [webglSupported, setWebglSupported] = useState(false);
  const [deckGlReady, setDeckGlReady] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const controls = (
    <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-800/60 bg-slate-950/70 px-4 py-3 shadow-lg shadow-slate-950/40">
      <div className="flex flex-col gap-1 text-xs text-slate-400">
        <span className="font-semibold uppercase tracking-[0.2em] text-slate-500">Vista</span>
        <select
          value={vista}
          onChange={(e) => setVista(e.target.value as VistaMapa)}
          className="rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
        >
          <option value="puerto">Por Puerto</option>
          <option value="pais">Por País</option>
        </select>
      </div>
      <div className="flex flex-1 min-w-[220px] items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Zoom</span>
        <input
          type="range"
          min={1}
          max={8}
          step={0.1}
          value={viewState.zoom}
          onChange={(event) => {
            const zoom = Number(event.target.value);
            setViewState((prev) => ({ ...prev, zoom }));
          }}
          className="flex-1 accent-sky-500"
        />
        <span className="w-12 text-right text-xs font-semibold text-slate-400">
          {viewState.zoom.toFixed(1)}x
        </span>
      </div>
    </div>
  );

  // Asegurar que solo se renderice en el cliente y verificar WebGL
  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    // Esperar a que el DOM esté completamente listo
    const checkWebGL = () => {
      try {
        const canvas = document.createElement('canvas');
        // Intentar primero WebGL1, luego WebGL2
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') || canvas.getContext('webgl2');
        if (gl) {
          setWebglSupported(true);
          setIsMounted(true);
          // Esperar a que el contenedor esté montado y tenga dimensiones
          const waitForContainer = () => {
            if (containerRef.current) {
              const rect = containerRef.current.getBoundingClientRect();
              if (rect.width > 0 && rect.height > 0) {
                setDeckGlReady(true);
                return;
              }
            }
            // Reintentar después de un frame
            requestAnimationFrame(waitForContainer);
          };
          
          // Esperar un poco antes de verificar el contenedor
          setTimeout(() => {
            waitForContainer();
          }, 300);
        } else {
          if (IS_DEV) {
            console.warn('WebGL no está disponible en este navegador');
          }
          setWebglSupported(false);
          setIsMounted(true);
        }
      } catch (error) {
        console.error('Error al verificar WebGL:', error);
        setWebglSupported(false);
        setIsMounted(true);
      }
    };

    // Esperar a que el documento esté listo
    if (document.readyState === 'complete') {
      checkWebGL();
    } else {
      window.addEventListener('load', checkWebGL);
      return () => window.removeEventListener('load', checkWebGL);
    }
  }, []);

  // Obtener puertos de salida (POL) únicos con estadísticas
  const originPorts = useMemo(() => {
    const portMap = new Map<string, {
      name: string;
      coordinates: [number, number];
      totalEmbarques: number;
      depositos: Set<string>;
    }>();
    
    registros.forEach(registro => {
      if (!registro.pol) return;
      
      const portName = registro.pol.toUpperCase().trim();
      const coords = getPortCoordinates(registro.pol);
      if (!coords) return;
      
      if (!portMap.has(portName)) {
        portMap.set(portName, {
          name: portName,
          coordinates: coords,
          totalEmbarques: 0,
          depositos: new Set<string>()
        });
      }
      
      const portStats = portMap.get(portName)!;
      portStats.totalEmbarques++;
      
      if (registro.deposito) {
        portStats.depositos.add(registro.deposito.trim());
      }
    });
    
    return Array.from(portMap.values()).map(port => ({
      name: port.name,
      coordinates: port.coordinates,
      totalEmbarques: port.totalEmbarques,
      depositos: Array.from(port.depositos).filter(d => d && d.trim() !== '')
    }));
  }, [registros]);

  // Agrupar registros según la vista seleccionada (por puerto o por país)
  const countryStats = useMemo(() => {
    const portMap = new Map<string, CountryStats>();

    registros.forEach(registro => {
      if (!registro.pod) return;

      // Normalizar nombre del puerto primero
      const portName = registro.pod.toUpperCase().trim();
      
      // Intentar obtener el país del puerto
      const country = getCountryFromPort(registro.pod);
      
      // Si la vista es por país, necesitamos el país
      if (vista === 'pais') {
        if (!country) {
          if (IS_DEV) {
            console.warn(`⚠️ País no encontrado para puerto "${registro.pod}" - no se mostrará en vista por país`);
          }
          return;
        }
      }
      
      // Si la vista es por país, agrupar por país
      if (vista === 'pais') {
        if (!country) return; // Asegurar que country no sea null
        const countryCoords = getCountryCoordinates(country);
        if (!countryCoords) return;
        
        const key = country;
        let stats = portMap.get(key);
        if (!stats) {
        stats = {
          country,
          coordinates: countryCoords,
          ports: {},
          totalConfirmados: 0,
          totalPendientes: 0,
          totalCancelados: 0,
          totalEtdCumplida: 0,
          totalEtaCumplida: 0,
          totalEtdPendiente: 0,
          totalEtaPendiente: 0,
          totalGeneral: 0,
        };
          portMap.set(key, stats);
        }
        
        // Inicializar estadísticas del puerto si no existen
        if (!stats.ports[portName]) {
          stats.ports[portName] = {
            confirmados: 0,
            pendientes: 0,
            cancelados: 0,
            etdCumplida: 0,
            etaCumplida: 0,
            etdPendiente: 0,
            etaPendiente: 0,
            total: 0,
          };
        }
        
        const portStats = stats.ports[portName];
        portStats.total++;
        
        // Verificar fechas
        const ahora = new Date();
        if (registro.etd) {
          const etdDate = new Date(registro.etd);
          if (etdDate < ahora) {
            portStats.etdCumplida++;
            stats.totalEtdCumplida++;
          } else {
            portStats.etdPendiente++;
            stats.totalEtdPendiente++;
          }
        }
        
        if (registro.eta) {
          const etaDate = new Date(registro.eta);
          if (etaDate < ahora) {
            portStats.etaCumplida++;
            stats.totalEtaCumplida++;
          } else {
            portStats.etaPendiente++;
            stats.totalEtaPendiente++;
          }
        }
        
        switch (registro.estado) {
          case 'CONFIRMADO':
            portStats.confirmados++;
            stats.totalConfirmados++;
            stats.totalGeneral++;
            break;
          case 'CANCELADO':
            portStats.cancelados++;
            stats.totalCancelados++;
            stats.totalGeneral++;
            break;
          case 'PENDIENTE':
            break;
        }
        
        return;
      }
      
      // Si la vista es por puerto, cada puerto tiene su propia ubicación
      const portCoords = getPortCoordinates(registro.pod);
      
      // Si no encontramos coordenadas del puerto, intentar usar coordenadas del país como fallback
      let finalCoords: [number, number] | null = portCoords;
        if (!finalCoords && country) {
        const countryCoords = getCountryCoordinates(country);
        if (countryCoords) {
          finalCoords = countryCoords;
            if (IS_DEV) {
              console.warn(`⚠️ Coordenadas del puerto "${registro.pod}" no encontradas, usando coordenadas del país "${country}" como fallback`);
            }
        }
      }
      
      if (!finalCoords) {
        // Si no tenemos coordenadas ni del puerto ni del país, no mostrarlo
        if (IS_DEV) {
          console.warn(`⚠️ No se encontraron coordenadas para puerto "${registro.pod}" - no se mostrará en el mapa`);
        }
        return;
      }

      // Usar el puerto como clave única (permite múltiples puntos por país)
      // Para la vista por puerto, usamos el nombre del puerto como clave principal
      const key = vista === 'puerto' ? portName : (country ? `${country}-${portName}` : portName);
      
      // Obtener o crear estadísticas del puerto
      let stats = portMap.get(key);
      if (!stats) {
        const displayName = vista === 'puerto' 
          ? portName 
          : (country ? `${country} - ${portName}` : portName);
        
        stats = {
          country: displayName,
          coordinates: finalCoords, // Coordenadas reales del puerto o del país como fallbackimage.png
          ports: {},
          totalConfirmados: 0,
          totalPendientes: 0,
          totalCancelados: 0,
          totalEtdCumplida: 0,
          totalEtaCumplida: 0,
          totalEtdPendiente: 0,
          totalEtaPendiente: 0,
          totalGeneral: 0,
        };
        portMap.set(key, stats);
      }

      // Inicializar estadísticas del puerto si no existen
      if (!stats.ports[portName]) {
        stats.ports[portName] = {
          confirmados: 0,
          pendientes: 0,
          cancelados: 0,
          etdCumplida: 0,
          etaCumplida: 0,
          etdPendiente: 0,
          etaPendiente: 0,
          total: 0,
        };
      }

      // Incrementar contadores (solo confirmados y cancelados, no pendientes)
      const portStats = stats.ports[portName];
      portStats.total++;

      // Verificar fechas
      const ahora = new Date();
      if (registro.etd) {
        const etdDate = new Date(registro.etd);
        if (etdDate < ahora) {
          portStats.etdCumplida++;
          stats.totalEtdCumplida++;
        } else {
          portStats.etdPendiente++;
          stats.totalEtdPendiente++;
        }
      }
      
      if (registro.eta) {
        const etaDate = new Date(registro.eta);
        if (etaDate < ahora) {
          portStats.etaCumplida++;
          stats.totalEtaCumplida++;
        } else {
          portStats.etaPendiente++;
          stats.totalEtaPendiente++;
        }
      }

      switch (registro.estado) {
        case 'CONFIRMADO':
          portStats.confirmados++;
          stats.totalConfirmados++;
          stats.totalGeneral++;
          break;
        case 'CANCELADO':
          portStats.cancelados++;
          stats.totalCancelados++;
          stats.totalGeneral++;
          break;
        case 'PENDIENTE':
          // No contar pendientes
          break;
      }
    });

    return Array.from(portMap.values());
  }, [registros, vista]);

  const activeVesselPoints = useMemo(
    () =>
      (activeVessels ?? []).filter(
        (vessel) => vessel.last_lat != null && vessel.last_lon != null,
      ),
    [activeVessels],
  );

  // Capa de puertos de salida (POL) - en rojo
  const originPortsLayer = new ScatterplotLayer<OriginPortStats>({
    id: 'origin-ports',
    data: originPorts,
    getPosition: (d) => d.coordinates,
    getRadius: (d) => {
      // Hacer más grande si está hovered
      const isHovered = hoveredOriginPort && hoveredOriginPort.name === d.name;
      return isHovered ? 12000 : 9000;
    },
    getFillColor: (d) => {
      // Si está hovered, usar un rojo más brillante
      const isHovered = hoveredOriginPort && hoveredOriginPort.name === d.name;
      return isHovered ? [255, 82, 82, 255] : [244, 67, 54, 240]; // Rojo más brillante cuando está hovered
    },
    pickable: true,
    radiusMinPixels: 3,
    radiusMaxPixels: 14,
    onHover: (info) => {
      if (info.object) {
        setHoveredOriginPort(info.object as OriginPortStats);
      } else {
        setHoveredOriginPort(null);
      }
    },
    updateTriggers: {
      getFillColor: [hoveredOriginPort],
      getRadius: [hoveredOriginPort]
    }
  });

  // Capa de puntos por país/puerto de destino
  const countriesLayer = new ScatterplotLayer<CountryStats>({
    id: 'countries',
    data: countryStats,
    getPosition: (d) => d.coordinates,
    getRadius: (d) => {
      // El tamaño del punto depende del total de bookings
      // Si está hovered, hacerlo más grande
      const isHovered = hoveredCountry && hoveredCountry.country === d.country;
      const baseRadius = 10000;
      const multiplier = Math.log10(Math.max(d.totalGeneral, 1)) + 1;
      const baseSize = baseRadius * multiplier;
      return isHovered ? baseSize * 1.5 : baseSize; // 50% más grande cuando está hovered
    },
    getFillColor: (d) => {
      // Si está hovered, usar un color brillante (cyan/azul claro)
      const isHovered = hoveredCountry && hoveredCountry.country === d.country;
      if (isHovered) {
        return [0, 188, 212, 255]; // Cyan brillante cuando está hovered
      }
      
      // Si tiene ETA cumplida, verde
      if (d.totalEtaCumplida > 0) {
        return [76, 175, 80, 220]; // Verde (ETA cumplida)
      }
      
      // Si tiene ETD cumplida, amarillo
      if (d.totalEtdCumplida > 0) {
        return [255, 193, 7, 220]; // Amarillo (ETD cumplida)
      }
      
      // Por defecto, gris (si no tiene fechas cumplidas)
      return [158, 158, 158, 220]; // Gris
    },
    pickable: true,
    radiusMinPixels: 4,
    radiusMaxPixels: 28, // más contenido para evitar puntos gigantes en zoom alto
    onHover: (info) => {
      if (info.object) {
        setHoveredCountry(info.object as CountryStats);
      } else {
        setHoveredCountry(null);
      }
    },
    updateTriggers: {
      getFillColor: [countryStats, hoveredCountry],
      getRadius: [countryStats, hoveredCountry]
    }
  });

  // Capa de posiciones AIS de buques activos (punto tipo "estrella" amarilla)
  const activeVesselsLayer = new ScatterplotLayer<ActiveVessel>({
    id: 'active-vessels-main',
    data: activeVesselPoints,
    getPosition: (vessel) => [vessel.last_lon as number, vessel.last_lat as number],
    getRadius: () => 9000,
    getFillColor: () => [250, 204, 21, 255], // amarillo intenso
    pickable: true,
    radiusMinPixels: 3,
    radiusMaxPixels: 14,
    stroked: true,
    getLineWidth: () => 2,
    lineWidthUnits: 'pixels',
    getLineColor: () => [252, 211, 77, 255],
    onHover: (info) => {
      if (info.object) {
        setHoveredVessel(info.object as ActiveVessel);
      } else {
        setHoveredVessel(null);
      }
    },
  });

  // No renderizar hasta que estemos en el cliente
  if (!isMounted) {
    return (
      <div className={`space-y-4 ${className}`}>
        {controls}
        <div className="relative h-[600px] w-full rounded-2xl border border-slate-800/60 bg-slate-950/60">
          <div className="flex h-full items-center justify-center rounded-2xl bg-slate-950/60">
            <div className="text-center">
              <div className="mb-4 mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-sky-500"></div>
              <p className="text-slate-400 text-sm">Cargando mapa...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Mostrar mensaje si WebGL no está disponible
  if (!webglSupported) {
    return (
      <div className={`space-y-4 ${className}`}>
        {controls}
        <div className="relative h-[600px] w-full rounded-2xl border border-slate-800/60 bg-slate-950/60">
          <div className="flex h-full items-center justify-center rounded-2xl bg-slate-950/60">
            <div className="text-center p-6">
              <div className="mb-4 text-red-400">
                <svg className="mx-auto h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">WebGL no está disponible</h3>
              <p className="mb-3 text-sm text-slate-300">
                Tu navegador no soporta WebGL, necesario para mostrar el mapa.
              </p>
              <p className="text-xs text-slate-500">
                Por favor, actualiza tu navegador o habilita la aceleración por hardware.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {controls}
      <div
        ref={containerRef}
        className="relative h-[600px] w-full overflow-hidden rounded-2xl border border-slate-800/60 bg-slate-950/60"
      >
        {deckGlReady ? (
          <DeckGL
            initialViewState={INITIAL_VIEW_STATE}
            viewState={viewState}
            controller={{
              scrollZoom: false,
              dragPan: true,
              dragRotate: false,
              keyboard: true,
              doubleClickZoom: false,
            }}
            onViewStateChange={({ viewState: nextViewState }) => {
              setViewState(nextViewState as typeof viewState);
            }}
            layers={[
              originPortsLayer,
              ...(hoveredCountry
                ? [
                    new ScatterplotLayer<CountryStats>({
                      id: 'country-highlight',
                      data: [hoveredCountry],
                      getPosition: (d: CountryStats) => d.coordinates,
                      getRadius: vista === 'pais' ? 200000 : 80000,
                      getFillColor: [0, 188, 212, 50],
                      pickable: false,
                      radiusMinPixels: 0,
                      radiusMaxPixels: 1000,
                      updateTriggers: {
                        getPosition: [hoveredCountry],
                        getRadius: [vista],
                      },
                    }),
                  ]
                : []),
              countriesLayer,
              activeVesselsLayer,
            ]}
            onError={(error) => {
              if (error) {
                console.error('Error de DeckGL:', error);
              }
              if (error && error.message && error.message.includes('WebGL')) {
                setDeckGlReady(false);
                setTimeout(() => {
                  setDeckGlReady(true);
                }, 2000);
              }
            }}
          >
            <MaplibreMap
              mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
              style={{ width: '100%', height: '100%' }}
              reuseMaps={true}
              onError={(error) => {
                if (error) {
                  console.error('Error de MapLibre:', error);
                }
              }}
            />
          </DeckGL>
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="mb-4 mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-sky-500"></div>
              <p className="text-sm text-slate-300">Inicializando mapa...</p>
            </div>
          </div>
        )}

        {/* Tooltips */}
        {hoveredOriginPort && !hoveredVessel && (
          <div
            className="absolute top-4 left-4 z-10 max-w-[300px] rounded-lg border border-slate-800/60 bg-slate-950/90 p-4 text-slate-100 shadow-xl"
          >
            <h3 className="mb-3 flex items-center gap-2 font-semibold">
              <span className="h-3 w-3 rounded-full bg-red-500"></span>
              Puerto de Salida (POL)
            </h3>
            <p className="mb-3 text-sm font-medium text-slate-200">{hoveredOriginPort.name}</p>
            <div className="mb-3 grid grid-cols-1 gap-2 border-b border-slate-800/70 pb-3 text-center">
              <div>
                <div className="text-xl font-bold text-red-400">{hoveredOriginPort.totalEmbarques}</div>
                <div className="text-xs text-slate-300">Total de Embarques</div>
              </div>
            </div>
            {hoveredOriginPort.depositos.length > 0 ? (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-slate-200">Depósitos utilizados:</h4>
                <div className="flex flex-wrap gap-1">
                  {hoveredOriginPort.depositos.map((deposito, index) => (
                    <span
                      key={index}
                      className="rounded bg-sky-500/15 px-2 py-1 text-xs text-sky-200"
                    >
                      {deposito}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">No hay depósitos registrados</p>
            )}
          </div>
        )}

        {hoveredCountry && !hoveredOriginPort && !hoveredVessel && (
          <div
            className="absolute top-4 left-4 z-10 max-w-[420px] rounded-lg border border-slate-800/60 bg-slate-950/90 p-4 text-slate-100 shadow-xl"
          >
            <h3 className="mb-1 text-lg font-semibold">
              {hoveredCountry.country.includes(' - ')
                ? hoveredCountry.country.split(' - ')[1]
                : hoveredCountry.country}
            </h3>
            {hoveredCountry.country.includes(' - ') && (
              <p className="mb-3 text-xs text-slate-400">
                {hoveredCountry.country.split(' - ')[0]}
              </p>
            )}
            <div className="mb-3 grid grid-cols-2 gap-2 border-b border-slate-800/70 pb-3 text-center text-xs">
              <div>
                <div className="text-xl font-bold text-green-300">{hoveredCountry.totalConfirmados}</div>
                <div className="text-slate-400">Confirmados</div>
              </div>
              <div>
                <div className="text-xl font-bold text-red-300">{hoveredCountry.totalCancelados}</div>
                <div className="text-slate-400">Cancelados</div>
              </div>
            </div>
            <div className="mb-4 grid grid-cols-4 gap-2 border-b border-slate-800/70 pb-3 text-center text-xs">
              <div>
                <div className="text-lg font-semibold text-sky-300">{hoveredCountry.totalEtdCumplida}</div>
                <div className="text-slate-400">ETD Cumplida</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-amber-300">{hoveredCountry.totalEtdPendiente}</div>
                <div className="text-slate-400">ETD Pendiente</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-sky-300">{hoveredCountry.totalEtaCumplida}</div>
                <div className="text-slate-400">ETA Cumplida</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-amber-300">{hoveredCountry.totalEtaPendiente}</div>
                <div className="text-slate-400">ETA Pendiente</div>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-slate-200">Detalle por puerto:</h4>
              {Object.entries(hoveredCountry.ports)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([portName, portStats]) => (
                  <div key={portName} className="rounded-lg bg-slate-900/60 p-2 text-xs">
                    <div className="mb-1 font-medium text-slate-200">{portName}</div>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap items-center gap-2">
                        {portStats.confirmados > 0 && (
                          <span className="text-green-300">✅ {portStats.confirmados} confirmados</span>
                        )}
                        {portStats.cancelados > 0 && (
                          <span className="text-red-300">❌ {portStats.cancelados} cancelados</span>
                        )}
                      </div>
                      <span className="font-semibold text-slate-300">Total: {portStats.total}</span>
                    </div>
                    {(portStats.etdCumplida > 0 || portStats.etdPendiente > 0 || portStats.etaCumplida > 0 || portStats.etaPendiente > 0) && (
                      <div className="mt-2 border-t border-slate-800/60 pt-2">
                        <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-400">
                          {portStats.etdCumplida > 0 && <span>✓ ETD cumplida: {portStats.etdCumplida}</span>}
                          {portStats.etdPendiente > 0 && <span>⏳ ETD pendiente: {portStats.etdPendiente}</span>}
                          {portStats.etaCumplida > 0 && <span>✓ ETA cumplida: {portStats.etaCumplida}</span>}
                          {portStats.etaPendiente > 0 && <span>⏳ ETA pendiente: {portStats.etaPendiente}</span>}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Tooltip de buque activo (posición AIS en mapa principal) */}
        {hoveredVessel && (
          <div
            className="absolute top-4 left-4 z-10 max-w-[320px] rounded-lg border border-slate-800/70 bg-slate-950/90 p-4 text-xs text-slate-100 shadow-xl"
          >
            <h3 className="mb-1 text-sm font-semibold text-yellow-200">
              {hoveredVessel.vessel_name}
            </h3>
            {hoveredVessel.destination && (
              <p className="mb-1 text-[11px] text-slate-300">
                Destino:{' '}
                <span className="font-medium text-sky-200">
                  {hoveredVessel.destination}
                </span>
              </p>
            )}
            {hoveredVessel.etd && (
              <p className="mb-1 text-[11px] text-slate-300">
                Zarpe estimado (ETD):{' '}
                <span className="font-medium text-slate-100">
                  {new Date(hoveredVessel.etd).toLocaleString('es-CL', {
                    timeZone: 'UTC',
                    day: '2-digit',
                    month: '2-digit',
                    year: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </p>
            )}
            {hoveredVessel.eta && (
              <p className="mb-1 text-[11px] text-slate-300">
                Arribo estimado (ETA):{' '}
                <span className="font-medium text-slate-100">
                  {new Date(hoveredVessel.eta).toLocaleString('es-CL', {
                    timeZone: 'UTC',
                    day: '2-digit',
                    month: '2-digit',
                    year: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </p>
            )}
            {hoveredVessel.last_position_at && (
              <p className="mb-1 text-[11px] text-slate-400">
                Última posición AIS:{' '}
                {new Date(hoveredVessel.last_position_at).toLocaleString('es-CL')}
              </p>
            )}
            <p className="mt-1 text-[11px] text-slate-300">
              Bookings en curso:{' '}
              <span className="font-semibold text-slate-100">
                {hoveredVessel.bookings.length}
              </span>
            </p>
            <p className="mt-1 text-[11px] text-slate-300">
              Contenedores:{' '}
              <span className="font-semibold text-slate-100">
                {hoveredVessel.containers.length}
              </span>
            </p>
          </div>
        )}

        {/* Leyenda */}
        <div className="absolute bottom-4 right-4 z-10 max-w-[220px] rounded-lg border border-slate-800/60 bg-slate-950/90 p-4 text-xs text-slate-100 shadow-xl">
          <h4 className="mb-2 text-sm font-semibold text-white">Leyenda</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-green-500"></span>
              <span>ETA cumplida</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-yellow-500"></span>
              <span>ETD cumplida</span>
            </div>
            <div className="mt-2 border-t border-slate-800/60 pt-2">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full border-2 border-slate-900 bg-red-600"></span>
                <span>Puertos de salida (POL)</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="h-3 w-3 rounded-full border border-yellow-300 bg-yellow-400"></span>
                <span>Posición actual de buques (AIS)</span>
              </div>
            </div>
            <p className="mt-2 border-t border-slate-800/60 pt-2 text-[11px] text-slate-400">
              Pasa el mouse sobre un destino para ver detalles.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
