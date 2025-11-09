'use client';

import React, { useMemo, useState } from 'react';
import { DeckGL } from '@deck.gl/react';
import { ScatterplotLayer } from '@deck.gl/layers';
import { Map as MaplibreMap } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import type {
  ShipmentRecord,
  Coordinates,
  PortCoordinateResolver,
  CountryCoordinateResolver,
  CountryFromPortResolver
} from './types';

export interface ShipmentsMapProps {
  registros: ShipmentRecord[];
  getPortCoordinates: PortCoordinateResolver;
  getCountryFromPort: CountryFromPortResolver;
  getCountryCoordinates: CountryCoordinateResolver;
  className?: string;
  mapStyle?: string;
  initialViewState?: {
    longitude: number;
    latitude: number;
    zoom: number;
    pitch?: number;
    bearing?: number;
  };
}

const DEFAULT_VIEW_STATE = {
  longitude: -70,
  latitude: -30,
  zoom: 3,
  pitch: 0,
  bearing: 0
};

type VistaMapa = 'puerto' | 'pais';

interface CountryStats {
  country: string;
  coordinates: Coordinates;
  ports: Record<
    string,
    {
      confirmados: number;
      pendientes: number;
      cancelados: number;
      etdCumplida: number;
      etaCumplida: number;
      etdPendiente: number;
      etaPendiente: number;
      total: number;
    }
  >;
  totalConfirmados: number;
  totalPendientes: number;
  totalCancelados: number;
  totalEtdCumplida: number;
  totalEtaCumplida: number;
  totalEtdPendiente: number;
  totalEtaPendiente: number;
  totalGeneral: number;
}

interface OriginPortStats {
  name: string;
  coordinates: Coordinates;
  totalEmbarques: number;
  depositos: string[];
}

export function ShipmentsMap({
  registros,
  getPortCoordinates,
  getCountryCoordinates,
  getCountryFromPort,
  className = '',
  mapStyle = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  initialViewState = DEFAULT_VIEW_STATE
}: ShipmentsMapProps) {
  const [hoveredCountry, setHoveredCountry] = useState<CountryStats | null>(null);
  const [hoveredOriginPort, setHoveredOriginPort] = useState<OriginPortStats | null>(null);
  const [vista, setVista] = useState<VistaMapa>('puerto');
  const [isMounted, setIsMounted] = useState(false);
  const [webglSupported, setWebglSupported] = useState(false);
  const [deckGlReady, setDeckGlReady] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkWebGL = () => {
      try {
        const canvas = document.createElement('canvas');
        const gl =
          canvas.getContext('webgl') ||
          canvas.getContext('experimental-webgl') ||
          canvas.getContext('webgl2');

        if (gl) {
          setWebglSupported(true);
          setIsMounted(true);

          const waitForContainer = () => {
            if (containerRef.current) {
              const rect = containerRef.current.getBoundingClientRect();
              if (rect.width > 0 && rect.height > 0) {
                setDeckGlReady(true);
                return;
              }
            }
            requestAnimationFrame(waitForContainer);
          };

          setTimeout(waitForContainer, 300);
        } else {
          setWebglSupported(false);
          setIsMounted(true);
        }
      } catch {
        setWebglSupported(false);
        setIsMounted(true);
      }
    };

    if (document.readyState === 'complete') {
      checkWebGL();
    } else {
      window.addEventListener('load', checkWebGL);
      return () => window.removeEventListener('load', checkWebGL);
    }
  }, []);

  const originPorts = useMemo<OriginPortStats[]>(() => {
    const portMap = new Map<
      string,
      {
        name: string;
        coordinates: Coordinates;
        totalEmbarques: number;
        depositos: Set<string>;
      }
    >();

    registros.forEach((registro) => {
      if (!registro.pol) return;
      const portName = registro.pol.toUpperCase().trim();
      const coords = getPortCoordinates(portName);
      if (!coords) return;

      if (!portMap.has(portName)) {
        portMap.set(portName, {
          name: portName,
          coordinates: coords,
          totalEmbarques: 0,
          depositos: new Set<string>()
        });
      }

      const stats = portMap.get(portName)!;
      stats.totalEmbarques += 1;
      if (registro.deposito) {
        stats.depositos.add(registro.deposito.trim());
      }
    });

    return Array.from(portMap.values()).map((value) => ({
      name: value.name,
      coordinates: value.coordinates,
      totalEmbarques: value.totalEmbarques,
      depositos: Array.from(value.depositos)
    }));
  }, [registros, getPortCoordinates]);

  const countryStats = useMemo<CountryStats[]>(() => {
    const portMap = new Map<string, CountryStats>();

    registros.forEach((registro) => {
      if (!registro.pod) return;
      const portName = registro.pod.toUpperCase().trim();
      const country = getCountryFromPort(portName) ?? null;

      if (vista === 'pais' && !country) {
        return;
      }

      if (vista === 'pais') {
        if (!country) return;
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
            totalGeneral: 0
          };
          portMap.set(key, stats);
        }

        if (!stats.ports[portName]) {
          stats.ports[portName] = {
            confirmados: 0,
            pendientes: 0,
            cancelados: 0,
            etdCumplida: 0,
            etaCumplida: 0,
            etdPendiente: 0,
            etaPendiente: 0,
            total: 0
          };
        }

        const portStats = stats.ports[portName];
        portStats.total += 1;
        const now = new Date();

        if (registro.etd) {
          const etdDate = new Date(registro.etd);
          if (etdDate < now) {
            portStats.etdCumplida += 1;
            stats.totalEtdCumplida += 1;
          } else {
            portStats.etdPendiente += 1;
            stats.totalEtdPendiente += 1;
          }
        }

        if (registro.eta) {
          const etaDate = new Date(registro.eta);
          if (etaDate < now) {
            portStats.etaCumplida += 1;
            stats.totalEtaCumplida += 1;
          } else {
            portStats.etaPendiente += 1;
            stats.totalEtaPendiente += 1;
          }
        }

        switch (registro.estado) {
          case 'CONFIRMADO':
            portStats.confirmados += 1;
            stats.totalConfirmados += 1;
            stats.totalGeneral += 1;
            break;
          case 'CANCELADO':
            portStats.cancelados += 1;
            stats.totalCancelados += 1;
            stats.totalGeneral += 1;
            break;
          case 'PENDIENTE':
            portStats.pendientes += 1;
            stats.totalPendientes += 1;
            break;
          default:
            break;
        }
        return;
      }

      const portCoords = getPortCoordinates(portName);
      let finalCoords: Coordinates | null | undefined = portCoords;
      if (!finalCoords && country) {
        finalCoords = getCountryCoordinates(country);
      }
      if (!finalCoords) {
        return;
      }

      const key = portName;
      let stats = portMap.get(key);
      if (!stats) {
        stats = {
          country: country ? `${country} - ${portName}` : portName,
          coordinates: finalCoords,
          ports: {},
          totalConfirmados: 0,
          totalPendientes: 0,
          totalCancelados: 0,
          totalEtdCumplida: 0,
          totalEtaCumplida: 0,
          totalEtdPendiente: 0,
          totalEtaPendiente: 0,
          totalGeneral: 0
        };
        portMap.set(key, stats);
      }

      if (!stats.ports[portName]) {
        stats.ports[portName] = {
          confirmados: 0,
          pendientes: 0,
          cancelados: 0,
          etdCumplida: 0,
          etaCumplida: 0,
          etdPendiente: 0,
          etaPendiente: 0,
          total: 0
        };
      }

      const portStats = stats.ports[portName];
      portStats.total += 1;
      const now = new Date();

      if (registro.etd) {
        const etdDate = new Date(registro.etd);
        if (etdDate < now) {
          portStats.etdCumplida += 1;
          stats.totalEtdCumplida += 1;
        } else {
          portStats.etdPendiente += 1;
          stats.totalEtdPendiente += 1;
        }
      }

      if (registro.eta) {
        const etaDate = new Date(registro.eta);
        if (etaDate < now) {
          portStats.etaCumplida += 1;
          stats.totalEtaCumplida += 1;
        } else {
          portStats.etaPendiente += 1;
          stats.totalEtaPendiente += 1;
        }
      }

      switch (registro.estado) {
        case 'CONFIRMADO':
          portStats.confirmados += 1;
          stats.totalConfirmados += 1;
          stats.totalGeneral += 1;
          break;
        case 'CANCELADO':
          portStats.cancelados += 1;
          stats.totalCancelados += 1;
          stats.totalGeneral += 1;
          break;
        case 'PENDIENTE':
          portStats.pendientes += 1;
          stats.totalPendientes += 1;
          break;
        default:
          break;
      }
    });

    return Array.from(portMap.values());
  }, [registros, vista, getCountryCoordinates, getCountryFromPort, getPortCoordinates]);

  const originPortsLayer = new ScatterplotLayer<OriginPortStats>({
    id: 'origin-ports',
    data: originPorts,
    getPosition: (d) => d.coordinates,
    getRadius: (d) => (hoveredOriginPort?.name === d.name ? 15000 : 12000),
    getFillColor: (d) => (hoveredOriginPort?.name === d.name ? [255, 82, 82, 255] : [244, 67, 54, 240]),
    pickable: true,
    radiusMinPixels: 6,
    radiusMaxPixels: 20,
    onHover: (info) => {
      if (info.object) {
        setHoveredOriginPort(info.object as OriginPortStats);
      } else {
        setHoveredOriginPort(null);
      }
    }
  });

  const countriesLayer = new ScatterplotLayer<CountryStats>({
    id: 'countries',
    data: countryStats,
    getPosition: (d) => d.coordinates,
    getRadius: (d) => {
      const isHovered = hoveredCountry?.country === d.country;
      const baseRadius = 10000;
      const multiplier = Math.log10(Math.max(d.totalGeneral, 1)) + 1;
      const baseSize = baseRadius * multiplier;
      return isHovered ? baseSize * 1.5 : baseSize;
    },
    getFillColor: (d) => {
      if (hoveredCountry?.country === d.country) {
        return [0, 188, 212, 255];
      }
      if (d.totalEtaCumplida > 0) {
        return [76, 175, 80, 220];
      }
      if (d.totalEtdCumplida > 0) {
        return [255, 193, 7, 220];
      }
      return [158, 158, 158, 220];
    },
    pickable: true,
    radiusMinPixels: 8,
    radiusMaxPixels: 50,
    onHover: (info) => {
      if (info.object) {
        setHoveredCountry(info.object as CountryStats);
      } else {
        setHoveredCountry(null);
      }
    }
  });

  if (!isMounted) {
    return (
      <div className={`relative ${className}`} style={{ height: '600px', width: '100%' }}>
        <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-900 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Cargando mapa...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!webglSupported) {
    return (
      <div className={`relative ${className}`} style={{ height: '600px', width: '100%' }}>
        <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-900 rounded-lg">
          <div className="text-center p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">WebGL no disponible</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Tu navegador no soporta WebGL. Intenta actualizarlo o habilitar la aceleración por hardware.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative ${className}`} style={{ height: '600px', width: '100%' }}>
      <div className="absolute top-4 right-4 z-20 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-2">
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Vista:</label>
        <select
          value={vista}
          onChange={(event) => setVista(event.target.value as VistaMapa)}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="puerto">Por Puerto</option>
          <option value="pais">Por País</option>
        </select>
      </div>

      {deckGlReady ? (
        <DeckGL
          initialViewState={initialViewState}
          controller
          layers={[
            originPortsLayer,
            ...(hoveredCountry
              ? [
                  new ScatterplotLayer<CountryStats>({
                    id: 'country-highlight',
                    data: [hoveredCountry],
                    getPosition: (d) => d.coordinates,
                    getRadius: vista === 'pais' ? 200000 : 80000,
                    getFillColor: [0, 188, 212, 50],
                    pickable: false
                  })
                ]
              : []),
            countriesLayer
          ]}
          onError={(error) => {
            console.error('Error DeckGL:', error);
            if (error instanceof Error && error.message.includes('WebGL')) {
              setDeckGlReady(false);
              setTimeout(() => setDeckGlReady(true), 2000);
            }
          }}
        >
          <MaplibreMap mapStyle={mapStyle} style={{ width: '100%', height: '100%' }} reuseMaps />
        </DeckGL>
      ) : (
        <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-900 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Inicializando mapa...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default ShipmentsMap;

