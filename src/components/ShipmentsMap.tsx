'use client';

import React, { useMemo, useState } from 'react';
import { DeckGL } from '@deck.gl/react';
import { ScatterplotLayer } from '@deck.gl/layers';
import { Map as MaplibreMap } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { getPortCoordinates } from '@/lib/port-coordinates';
import { getCountryFromPort, getCountryCoordinates } from '@/lib/country-coordinates';
import { Registro } from '@/types/registros';

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
  className?: string;
}

const INITIAL_VIEW_STATE = {
  longitude: -70.0,
  latitude: -30.0,
  zoom: 3,
  pitch: 0, // Vista desde arriba (plano)
  bearing: 0
};

type VistaMapa = 'puerto' | 'pais';

interface OriginPortStats {
  name: string;
  coordinates: [number, number];
  totalEmbarques: number;
  depositos: string[];
}

export function ShipmentsMap({ registros, className = '' }: ShipmentsMapProps) {
  const [hoveredCountry, setHoveredCountry] = useState<CountryStats | null>(null);
  const [hoveredOriginPort, setHoveredOriginPort] = useState<OriginPortStats | null>(null);
  const [vista, setVista] = useState<VistaMapa>('puerto');
  const [isMounted, setIsMounted] = useState(false);
  const [webglSupported, setWebglSupported] = useState(false);
  const [deckGlReady, setDeckGlReady] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

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
          console.log('✅ WebGL disponible:', gl instanceof WebGLRenderingContext ? 'WebGL1' : 'WebGL2');
          setWebglSupported(true);
          setIsMounted(true);
          // Esperar a que el contenedor esté montado y tenga dimensiones
          const waitForContainer = () => {
            if (containerRef.current) {
              const rect = containerRef.current.getBoundingClientRect();
              if (rect.width > 0 && rect.height > 0) {
                console.log('✅ Contenedor listo, inicializando DeckGL...');
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
          console.warn('WebGL no está disponible en este navegador');
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
          console.warn(`⚠️ País no encontrado para puerto "${registro.pod}" - no se mostrará en vista por país`);
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
          console.warn(`⚠️ Coordenadas del puerto "${registro.pod}" no encontradas, usando coordenadas del país "${country}" como fallback`);
        }
      }
      
      if (!finalCoords) {
        // Si no tenemos coordenadas ni del puerto ni del país, no mostrarlo
        console.warn(`⚠️ No se encontraron coordenadas para puerto "${registro.pod}" - no se mostrará en el mapa`);
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
          coordinates: finalCoords, // Coordenadas reales del puerto o del país como fallback
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

  // Capa de puertos de salida (POL) - en rojo
  const originPortsLayer = new ScatterplotLayer<OriginPortStats>({
    id: 'origin-ports',
    data: originPorts,
    getPosition: (d) => d.coordinates,
    getRadius: (d) => {
      // Hacer más grande si está hovered
      const isHovered = hoveredOriginPort && hoveredOriginPort.name === d.name;
      return isHovered ? 15000 : 12000;
    },
    getFillColor: (d) => {
      // Si está hovered, usar un rojo más brillante
      const isHovered = hoveredOriginPort && hoveredOriginPort.name === d.name;
      return isHovered ? [255, 82, 82, 255] : [244, 67, 54, 240]; // Rojo más brillante cuando está hovered
    },
    pickable: true,
    radiusMinPixels: 6,
    radiusMaxPixels: 20,
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
    radiusMinPixels: 8,
    radiusMaxPixels: 50, // Aumentado para permitir el aumento cuando está hovered
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

  // No renderizar hasta que estemos en el cliente
  if (!isMounted) {
    return (
      <div className={`relative ${className}`} style={{ height: '600px', width: '100%' }}>
        <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-900 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Cargando mapa...</p>
          </div>
        </div>
      </div>
    );
  }

  // Mostrar mensaje si WebGL no está disponible
  if (!webglSupported) {
    return (
      <div className={`relative ${className}`} style={{ height: '600px', width: '100%' }}>
        <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-900 rounded-lg">
          <div className="text-center p-6">
            <div className="text-red-600 dark:text-red-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              WebGL no está disponible
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
              Tu navegador no soporta WebGL, que es necesario para mostrar el mapa.
            </p>
            <p className="text-gray-500 dark:text-gray-500 text-xs">
              Por favor, actualiza tu navegador o habilita aceleración por hardware en la configuración.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative ${className}`} style={{ height: '600px', width: '100%' }}>
      {/* Selector de vista */}
      <div className="absolute top-4 right-4 z-20 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-2">
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          Vista:
        </label>
        <select
          value={vista}
          onChange={(e) => setVista(e.target.value as VistaMapa)}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="puerto">Por Puerto</option>
          <option value="pais">Por País</option>
        </select>
      </div>

      {webglSupported && deckGlReady && (
        <div style={{ width: '100%', height: '100%' }}>
          <DeckGL
            initialViewState={INITIAL_VIEW_STATE}
            controller={true}
            layers={[
              originPortsLayer,
              // Capa de resaltado del país cuando está hovered (usando ScatterplotLayer con radio grande)
              ...(hoveredCountry ? [new ScatterplotLayer<CountryStats>({
                id: 'country-highlight',
                data: [hoveredCountry],
                getPosition: (d: CountryStats) => d.coordinates,
                getRadius: vista === 'pais' ? 200000 : 80000, // Radio más grande para vista por país, más pequeño para vista por puerto
                getFillColor: [0, 188, 212, 50], // Cyan semi-transparente
                pickable: false,
                radiusMinPixels: 0,
                radiusMaxPixels: 1000,
                updateTriggers: {
                  getPosition: [hoveredCountry],
                  getRadius: [vista]
                }
              })] : []),
              countriesLayer
            ]}
            onError={(error) => {
              console.error('Error de DeckGL:', error);
              // Si hay un error, intentar recargar después de un momento
              if (error && error.message && error.message.includes('WebGL')) {
                console.warn('Reintentando inicialización de DeckGL...');
                setDeckGlReady(false);
                setTimeout(() => {
                  setDeckGlReady(true);
                }, 2000);
              }
            }}
            onLoad={() => {
              console.log('✅ DeckGL cargado correctamente');
            }}
          >
            <MaplibreMap
              mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
              style={{ width: '100%', height: '100%' }}
              reuseMaps={true}
              onError={(error) => {
                console.error('Error de MapLibre:', error);
              }}
            />
          </DeckGL>
        </div>
      )}
      
      {webglSupported && !deckGlReady && (
        <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-900 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Inicializando mapa...</p>
          </div>
        </div>
      )}
      
      {/* Tooltip de información del puerto de salida (POL) */}
      {hoveredOriginPort && (
        <div
          className="absolute top-4 left-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 z-10 border border-gray-200 dark:border-gray-700"
          style={{ maxWidth: '300px' }}
        >
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-600"></div>
            <span>Puerto de Salida (POL)</span>
          </h3>
          
          <div className="mb-3">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {hoveredOriginPort.name}
            </p>
          </div>
          
          {/* Estadísticas */}
          <div className="grid grid-cols-1 gap-2 mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <div className="text-xl font-bold text-red-600 dark:text-red-400">
                {hoveredOriginPort.totalEmbarques}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Total de Embarques</div>
            </div>
          </div>
          
          {/* Depósitos */}
          {hoveredOriginPort.depositos.length > 0 && (
            <div className="mb-2">
              <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">
                Depósitos utilizados:
              </h4>
              <div className="flex flex-wrap gap-1">
                {hoveredOriginPort.depositos.map((deposito, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 text-xs rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                  >
                    {deposito}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {hoveredOriginPort.depositos.length === 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              No hay depósitos registrados
            </p>
          )}
        </div>
      )}

      {/* Tooltip de información del país */}
      {hoveredCountry && !hoveredOriginPort && (
        <div
          className="absolute top-4 left-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 z-10 border border-gray-200 dark:border-gray-700"
          style={{ maxWidth: '400px' }}
        >
          <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-3">
            {hoveredCountry.country.includes(' - ') 
              ? hoveredCountry.country.split(' - ')[1] 
              : hoveredCountry.country}
          </h3>
          {hoveredCountry.country.includes(' - ') && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              {hoveredCountry.country.split(' - ')[0]}
            </p>
          )}
          
          {/* Resumen general */}
          <div className="grid grid-cols-2 gap-2 mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <div className="text-xl font-bold text-green-600 dark:text-green-400">
                {hoveredCountry.totalConfirmados}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Confirmados</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-red-600 dark:text-red-400">
                {hoveredCountry.totalCancelados}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Cancelados</div>
            </div>
          </div>
          
          {/* Fechas cumplidas y pendientes */}
          <div className="grid grid-cols-4 gap-2 mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {hoveredCountry.totalEtdCumplida}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">ETD Cumplida</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                {hoveredCountry.totalEtdPendiente}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">ETD Pendiente</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {hoveredCountry.totalEtaCumplida}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">ETA Cumplida</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                {hoveredCountry.totalEtaPendiente}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">ETA Pendiente</div>
            </div>
          </div>

          {/* Detalle por puerto */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">
              Detalle por puerto:
            </h4>
            {Object.entries(hoveredCountry.ports)
              .sort((a, b) => b[1].total - a[1].total) // Ordenar por total descendente
              .map(([portName, portStats]) => (
                <div
                  key={portName}
                  className="p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm"
                >
                  <div className="font-medium text-gray-900 dark:text-white mb-1">
                    {portName}
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      {portStats.confirmados > 0 && (
                        <span className="text-green-600 dark:text-green-400">
                          ✅ {portStats.confirmados} confirmados
                        </span>
                      )}
                      {portStats.cancelados > 0 && (
                        <span className="text-red-600 dark:text-red-400">
                          ❌ {portStats.cancelados} cancelados
                        </span>
                      )}
                      <span className="text-gray-600 dark:text-gray-400 font-semibold">
                        Total: {portStats.total}
                      </span>
                    </div>
                    {(portStats.etdCumplida > 0 || portStats.etdPendiente > 0 || portStats.etaCumplida > 0 || portStats.etaPendiente > 0) && (
                      <div className="flex items-center justify-between pt-1 border-t border-gray-200 dark:border-gray-600">
                        <div className="flex flex-col space-y-0.5">
                          {portStats.etdCumplida > 0 && (
                            <span className="text-blue-600 dark:text-blue-400 text-xs">
                              ✓ ETD cumplida: {portStats.etdCumplida}
                            </span>
                          )}
                          {portStats.etdPendiente > 0 && (
                            <span className="text-orange-600 dark:text-orange-400 text-xs">
                              ⏳ ETD pendiente: {portStats.etdPendiente}
                            </span>
                          )}
                          {portStats.etaCumplida > 0 && (
                            <span className="text-blue-600 dark:text-blue-400 text-xs">
                              ✓ ETA cumplida: {portStats.etaCumplida}
                            </span>
                          )}
                          {portStats.etaPendiente > 0 && (
                            <span className="text-orange-600 dark:text-orange-400 text-xs">
                              ⏳ ETA pendiente: {portStats.etaPendiente}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
      
      {/* Leyenda */}
      <div className="absolute bottom-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 z-10 border border-gray-200 dark:border-gray-700" style={{ maxWidth: '200px' }}>
        <h4 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm">Leyenda</h4>
        <div className="space-y-2 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-gray-600 dark:text-gray-300">ETA cumplida</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-gray-600 dark:text-gray-300">ETD cumplida</span>
          </div>
          <div className="flex items-center space-x-2 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="w-3 h-3 rounded-full bg-red-600 border-2 border-white dark:border-gray-800"></div>
            <span className="text-gray-600 dark:text-gray-300 text-xs">Puertos de salida (POL)</span>
          </div>
          <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400 text-xs">
              Pasa el mouse sobre un destino para ver detalles
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
