'use client';

import { useMemo, useState, useCallback } from 'react';
import { Map as MaplibreMap, Marker, Popup } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapPin } from 'lucide-react';
import type { ItinerarioWithEscalas } from '@/types/itinerarios';
import { getPortCoordinates } from '@/lib/port-coordinates';

type CoordenadasPuerto = {
  lat: number;
  lng: number;
  nombre: string;
};

// Función para obtener coordenadas de un puerto usando la función existente
const obtenerCoordenadasPuerto = (nombrePuerto: string): CoordenadasPuerto | null => {
  if (!nombrePuerto) return null;
  
  const coords = getPortCoordinates(nombrePuerto);
  if (coords) {
    const [lng, lat] = coords;
    return { lat, lng, nombre: nombrePuerto };
  }
  
  return null;
};

// Función para obtener todos los puertos únicos de una lista de itinerarios
const obtenerPuertosDeItinerarios = (itinerarios: any[]): Map<string, CoordenadasPuerto> => {
  const puertosMap = new Map<string, CoordenadasPuerto>();
  
  itinerarios.forEach((itinerario) => {
    if (itinerario.escalas && Array.isArray(itinerario.escalas)) {
      itinerario.escalas.forEach((escala: any) => {
        const puerto = escala.puerto || escala.puerto_nombre;
        if (puerto && !puertosMap.has(puerto)) {
          const coordenadas = obtenerCoordenadasPuerto(puerto);
          if (coordenadas) {
            puertosMap.set(puerto, coordenadas);
          }
        }
      });
    }
  });
  
  return puertosMap;
};

interface ItinerarioMapProps {
  itinerarios: ItinerarioWithEscalas[];
  onPuertoClick?: (puerto: string) => void;
  puertoSeleccionado?: string | null;
}

export function ItinerarioMap({ 
  itinerarios, 
  onPuertoClick,
  puertoSeleccionado 
}: ItinerarioMapProps) {
  const [popupInfo, setPopupInfo] = useState<{ puerto: string; coordenadas: CoordenadasPuerto } | null>(null);

  // Obtener todos los puertos únicos con sus coordenadas
  const puertosConCoordenadas = useMemo(() => {
    return obtenerPuertosDeItinerarios(itinerarios);
  }, [itinerarios]);

  // Calcular el centro del mapa basado en los puertos
  const centroMapa = useMemo(() => {
    const coordenadas = Array.from(puertosConCoordenadas.values());
    if (coordenadas.length === 0) {
      return { latitude: 0, longitude: 0 };
    }

    const latPromedio = coordenadas.reduce((sum, c) => sum + c.lat, 0) / coordenadas.length;
    const lngPromedio = coordenadas.reduce((sum, c) => sum + c.lng, 0) / coordenadas.length;

    return {
      latitude: latPromedio,
      longitude: lngPromedio,
    };
  }, [puertosConCoordenadas]);

  // Contar grupos/tablas de servicio que tienen este puerto como destino
  const contarTablasPorPuerto = useCallback((puerto: string): number => {
    // Agrupar itinerarios por servicio (como se hace en la tabla)
    const serviciosConPuerto = new Set<string>();
    
    itinerarios.forEach((it) => {
      const tienePuerto = it.escalas?.some((escala) => 
        (escala.puerto || escala.puerto_nombre) === puerto
      );
      if (tienePuerto && it.servicio) {
        // Normalizar el nombre del servicio para agrupar variantes
        const servicioNormalizado = it.servicio.trim().toUpperCase();
        serviciosConPuerto.add(servicioNormalizado);
      }
    });
    
    return serviciosConPuerto.size;
  }, [itinerarios]);

  const handleMarkerClick = useCallback((puerto: string, coordenadas: CoordenadasPuerto) => {
    setPopupInfo({ puerto, coordenadas });
    if (onPuertoClick) {
      onPuertoClick(puerto);
    }
  }, [onPuertoClick]);

  if (puertosConCoordenadas.size === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-900 rounded-lg">
        <p className="text-slate-500 dark:text-slate-400">
          No hay destinos con coordenadas disponibles
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-full rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
      <MaplibreMap
        initialViewState={{
          ...centroMapa,
          zoom: puertosConCoordenadas.size === 1 ? 8 : 2,
        }}
        minZoom={2}
        maxZoom={18}
        style={{ width: '100%', height: '100%' }}
        mapStyle="https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json"
      >
        {Array.from(puertosConCoordenadas.entries()).map(([puerto, coordenadas]) => {
          const cantidadTablas = contarTablasPorPuerto(puerto);
          const estaSeleccionado = puertoSeleccionado === puerto;

          return (
            <Marker
              key={puerto}
              latitude={coordenadas.lat}
              longitude={coordenadas.lng}
              anchor="bottom"
            >
              <button
                onClick={() => handleMarkerClick(puerto, coordenadas)}
                className={`relative group transition-all duration-200 ${
                  estaSeleccionado 
                    ? 'scale-125 z-10' 
                    : 'hover:scale-110'
                }`}
                title={`${coordenadas.nombre} - ${cantidadTablas} tabla(s) de servicio`}
              >
                <MapPin
                  className={`h-8 w-8 ${
                    estaSeleccionado
                      ? 'text-[#00AEEF] fill-[#00AEEF]'
                      : 'text-blue-500 fill-blue-500 group-hover:text-blue-600 group-hover:fill-blue-600'
                  } drop-shadow-lg`}
                />
                {cantidadTablas > 0 && (
                  <span className={`absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold rounded-full ${
                    estaSeleccionado
                      ? 'bg-[#00AEEF] text-white'
                      : 'bg-blue-600 text-white group-hover:bg-blue-700'
                  }`}>
                    {cantidadTablas}
                  </span>
                )}
              </button>
            </Marker>
          );
        })}

        {popupInfo && (
          <Popup
            latitude={popupInfo.coordenadas.lat}
            longitude={popupInfo.coordenadas.lng}
            anchor="top"
            onClose={() => setPopupInfo(null)}
            closeButton={true}
            closeOnClick={false}
            className="dark:bg-slate-800"
          >
            <div className="p-2">
              <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                {popupInfo.coordenadas.nombre}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                {contarTablasPorPuerto(popupInfo.puerto)} tabla(s) de servicio disponible(s)
              </p>
              {onPuertoClick && (
                <button
                  onClick={() => {
                    onPuertoClick(popupInfo.puerto);
                    setPopupInfo(null);
                  }}
                  className="mt-2 px-3 py-1.5 text-xs font-medium bg-[#00AEEF] text-white rounded hover:bg-[#4FC3F7] transition-colors"
                >
                  Ver Itinerarios
                </button>
              )}
            </div>
          </Popup>
        )}
      </MaplibreMap>
    </div>
  );
}
