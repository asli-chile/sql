'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { DeckGL } from '@deck.gl/react';
import { ScatterplotLayer, PathLayer } from '@deck.gl/layers';
import { Map as MaplibreMap } from 'react-map-gl/maplibre';
import { CanvasContext } from '@luma.gl/core';
import type { ActiveVessel } from '@/types/vessels';

type ActiveVesselsMapProps = {
  vessels: ActiveVessel[];
  focusedVesselName?: string | null;
  onVesselSelect?: (vessel: ActiveVessel | null) => void;
};

// Centrar por defecto en la zona de Valparaíso, Chile
const INITIAL_VIEW_STATE = {
  longitude: -71.6197,
  latitude: -33.0458,
  zoom: 4,
  pitch: 0,
  bearing: 0,
};

type ViewState = typeof INITIAL_VIEW_STATE;

// Mismo fix que en `ShipmentsMap` para el bug de deck.gl v9 con `maxTextureDimension2D`.
if (typeof window !== 'undefined') {
  const canvasContextProto = CanvasContext?.prototype as any;
  if (canvasContextProto && !canvasContextProto.__maxTextureGuardPatched) {
    const originalGetMaxDrawingBufferSize = canvasContextProto.getMaxDrawingBufferSize;
    canvasContextProto.getMaxDrawingBufferSize = function getMaxDrawingBufferSizePatched() {
      const maxTextureDimension: number | undefined =
        this?.device?.limits?.maxTextureDimension2D;

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
          // Ignorar y usar fallback
        }
      }

      // Fallback conservador mientras el device no está listo.
      return [4096, 4096];
    };
    canvasContextProto.__maxTextureGuardPatched = true;
  }
}

export const ActiveVesselsMap: React.FC<ActiveVesselsMapProps> = ({
  vessels,
  focusedVesselName,
  onVesselSelect,
}) => {
  const [viewState, setViewState] = useState<ViewState>(INITIAL_VIEW_STATE);
  const [hoveredVessel, setHoveredVessel] = useState<ActiveVessel | null>(null);

  const vesselsWithCoords = useMemo(
    () => vessels.filter((vessel) => vessel.last_lat != null && vessel.last_lon != null),
    [vessels],
  );

  const activeVessel = useMemo(
    () =>
      focusedVesselName
        ? vessels.find((vessel) => vessel.vessel_name === focusedVesselName) ?? null
        : null,
    [focusedVesselName, vessels],
  );

  // Trayectoria del buque seleccionado (click)
  const trackFeatures = useMemo(() => {
    if (!activeVessel || !activeVessel.track || activeVessel.track.length <= 1) {
      // Sin selección o con menos de 2 puntos, no mostramos línea
      return [] as { vessel_name: string; path: [number, number][] }[];
    }

    return [
      {
        vessel_name: activeVessel.vessel_name,
        path: activeVessel.track.map(
          (point) => [point.lon, point.lat] as [number, number],
        ),
      },
    ];
  }, [activeVessel]);

  // Trayectoria del buque sobre el que se hace hover
  const hoverTrackFeatures = useMemo(() => {
    // Si hay un buque seleccionado, no mostramos la línea de hover
    if (activeVessel) {
      return [] as { vessel_name: string; path: [number, number][] }[];
    }

    if (!hoveredVessel || !hoveredVessel.track || hoveredVessel.track.length <= 1) {
      return [] as { vessel_name: string; path: [number, number][] }[];
    }

    return [
      {
        vessel_name: hoveredVessel.vessel_name,
        path: hoveredVessel.track.map(
          (point) => [point.lon, point.lat] as [number, number],
        ),
      },
    ];
  }, [hoveredVessel, activeVessel]);

  // Centrarse en un buque concreto cuando el usuario lo selecciona desde la lista
  useEffect(() => {
    if (!focusedVesselName) {
      return;
    }

    const target = vesselsWithCoords.find(
      (vessel) => vessel.vessel_name === focusedVesselName,
    );

    if (!target || target.last_lat == null || target.last_lon == null) {
      return;
    }

    setViewState((prev) => ({
      ...prev,
      longitude: target.last_lon as number,
      latitude: target.last_lat as number,
      zoom: Math.max(prev.zoom, 4),
    }));
  }, [focusedVesselName, vesselsWithCoords]);

  const vesselsLayer = new ScatterplotLayer<ActiveVessel>({
    id: 'active-vessels',
    data: vesselsWithCoords,
    getPosition: (vessel) => [vessel.last_lon as number, vessel.last_lat as number],
    // Usamos un radio en metros moderado y limitamos el tamaño en píxeles para que,
    // al hacer zoom, los puntos no se vean excesivamente grandes.
    getRadius: () => 9000,
    getFillColor: (vessel) =>
      activeVessel && vessel.vessel_name === activeVessel.vessel_name
        ? [56, 189, 248, 255] // cyan brillante para seleccionado
        : [56, 189, 248, 180], // cyan más suave para el resto
    pickable: true,
    radiusMinPixels: 3,
    radiusMaxPixels: 14,
    onClick: (info) => {
      const vessel = info.object as ActiveVessel | null;
      if (!vessel) {
        return;
      }
      if (onVesselSelect) {
        onVesselSelect(vessel);
      }
    },
    onHover: (info) => {
      if (info.object) {
        setHoveredVessel(info.object as ActiveVessel);
      } else {
        setHoveredVessel(null);
      }
    },
  });

  // Capa de trayectoria del buque seleccionado (click)
  const trackLayer = new PathLayer<{
    vessel_name: string;
    path: [number, number][];
  }>({
    id: 'vessel-tracks',
    data: trackFeatures,
    getPath: (feature) => feature.path,
    getWidth: () => 3,
    widthUnits: 'pixels',
    getColor: () => [148, 163, 184, 200], // gris azulado
    rounded: true,
    capRounded: true,
    jointRounded: true,
  });

  // Capa de trayectoria del buque sobre el que se hace hover
  const hoverTrackLayer = new PathLayer<{
    vessel_name: string;
    path: [number, number][];
  }>({
    id: 'hover-vessel-tracks',
    data: hoverTrackFeatures,
    getPath: (feature) => feature.path,
    getWidth: () => 2,
    widthUnits: 'pixels',
    getColor: () => [56, 189, 248, 150], // cyan más suave para hover
    rounded: true,
    capRounded: true,
    jointRounded: true,
  });

  return (
    <div className="relative h-[60vh] min-h-[320px] w-full overflow-hidden rounded-2xl border border-slate-800/60 bg-slate-950/60 sm:h-[600px]">
      <DeckGL
        initialViewState={INITIAL_VIEW_STATE}
        viewState={viewState}
        controller={{
          scrollZoom: true,
          dragPan: true,
          dragRotate: false,
          keyboard: true,
          doubleClickZoom: true,
        }}
        onViewStateChange={({ viewState: nextViewState }) => {
          setViewState(nextViewState as ViewState);
        }}
        layers={[trackLayer, hoverTrackLayer, vesselsLayer]}
      >
        <MaplibreMap
          mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
          style={{ width: '100%', height: '100%' }}
          reuseMaps
        />
      </DeckGL>

      {hoveredVessel && (
        <div className="absolute top-4 left-4 z-10 max-w-xs rounded-xl border border-slate-800/70 bg-slate-950/90 p-4 text-xs text-slate-100 shadow-xl">
          <h3 className="mb-1 text-sm font-semibold text-slate-50">
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
              Última posición:{' '}
              {new Date(hoveredVessel.last_position_at).toLocaleString('es-CL')}
            </p>
          )}
          <p className="mt-1 text-[11px] text-slate-300">
            Bookings:{' '}
            <span className="font-semibold text-slate-100">
              {hoveredVessel.bookings.length}
            </span>
          </p>
          {hoveredVessel.bookings.length > 0 && (
            <p className="mt-1 line-clamp-2 text-[11px] text-slate-400">
              {hoveredVessel.bookings.slice(0, 5).join(', ')}
              {hoveredVessel.bookings.length > 5 && '…'}
            </p>
          )}
          <p className="mt-1 text-[11px] text-slate-300">
            Contenedores:{' '}
            <span className="font-semibold text-slate-100">
              {hoveredVessel.containers.length}
            </span>
          </p>
          {hoveredVessel.containers.length > 0 && (
            <p className="mt-1 line-clamp-2 text-[11px] text-slate-400">
              {hoveredVessel.containers.slice(0, 5).join(', ')}
              {hoveredVessel.containers.length > 5 && '…'}
            </p>
          )}
        </div>
      )}
    </div>
  );
};


