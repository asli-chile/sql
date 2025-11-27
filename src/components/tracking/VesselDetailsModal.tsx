'use client';

import { useEffect, useState } from 'react';
import { X, MapPin, Clock, Navigation, Ship } from 'lucide-react';
import type { ActiveVessel } from '@/types/vessels';
import { createClient } from '@/lib/supabase-browser';

type VesselDetailRow = {
  id: string;
  booking: string | null;
  contenedor: string | null;
  origen: string | null;
  destino: string | null;
  etd: string | null;
  eta: string | null;
  ttEstimadoDias: number | null;
  ttRealDias: number | null;
};

type FetchState = 'idle' | 'loading' | 'error' | 'success';

type VesselDetailsModalProps = {
  isOpen: boolean;
  vessel: ActiveVessel | null;
  onClose: () => void;
};

type VesselPositionData = {
  speed?: number | null;
  course?: number | null;
  imo?: string | null;
  mmsi?: string | null;
  destination?: string | null;
  navigationalStatus?: string | null;
  shipType?: string | null;
  country?: string | null;
  etaUtc?: string | null;
  atdUtc?: string | null;
  lastPort?: string | null;
  distance?: string | null;
  predictedEta?: string | null;
  currentDraught?: string | null;
  length?: string | null;
  beam?: string | null;
  grossTonnage?: string | null;
  yearOfBuilt?: string | null;
  callsign?: string | null;
  typeSpecific?: string | null;
  deadweight?: string | null;
  hull?: string | null;
  builder?: string | null;
  material?: string | null;
  placeOfBuild?: string | null;
  ballastWater?: string | null;
  crudeOil?: string | null;
  freshWater?: string | null;
  gas?: string | null;
  grain?: string | null;
  bale?: string | null;
  timeRemaining?: string | null;
  teu?: string | null;
  engine?: any;
  ports?: any;
  management?: any;
  vesselImage?: string | null;
  lastPositionAt?: string | null;
  lastApiCallAt?: string | null;
};

export function VesselDetailsModal({ isOpen, vessel, onClose }: VesselDetailsModalProps) {
  const [detailsState, setDetailsState] = useState<FetchState>('idle');
  const [detailRows, setDetailRows] = useState<VesselDetailRow[]>([]);
  const [positionData, setPositionData] = useState<VesselPositionData | null>(null);

  useEffect(() => {
    if (!isOpen || !vessel) {
      setDetailsState('idle');
      setDetailRows([]);
      setPositionData(null);
      return;
    }

    const loadVesselDetails = async () => {
      try {
        setDetailsState('loading');
        setDetailRows([]);

        // Si el buque no tiene bookings asociados, no intentamos consultar Supabase
        if (!vessel.bookings || vessel.bookings.length === 0) {
          setDetailRows([]);
          setDetailsState('success');
          return;
        }

        const supabase = createClient();

        // Buscar registros relacionados al buque y sus bookings
        const { data, error } = await supabase
          .from('registros')
          .select('id, booking, contenedor, pol, pod, etd, eta')
          .in('booking', vessel.bookings)
          .is('deleted_at', null);

        if (error) {
          throw error;
        }

        const now = new Date();

        const rows: VesselDetailRow[] = (data || []).map((row: any) => {
          const etd = row.etd as string | null;
          const eta = row.eta as string | null;

          let ttEstimadoDias: number | null = null;
          let ttRealDias: number | null = null;

          if (etd && eta) {
            const etdDate = new Date(etd);
            const etaDate = new Date(eta);
            const diffMs = etaDate.getTime() - etdDate.getTime();
            ttEstimadoDias = Number.isFinite(diffMs)
              ? Math.round(diffMs / (1000 * 60 * 60 * 24))
              : null;
          }

          if (etd) {
            const etdDate = new Date(etd);
            const diffMsReal = now.getTime() - etdDate.getTime();
            ttRealDias = Number.isFinite(diffMsReal)
              ? Math.max(0, Math.round(diffMsReal / (1000 * 60 * 60 * 24)))
              : null;
          }

          return {
            id: row.id as string,
            booking: row.booking ?? null,
            contenedor: row.contenedor ?? null,
            origen: row.pol ?? null,
            destino: row.pod ?? null,
            etd: etd,
            eta: eta,
            ttEstimadoDias,
            ttRealDias,
          };
        });

        setDetailRows(rows);
        setDetailsState('success');
      } catch (error) {
        console.error('[VesselDetailsModal] Error cargando detalles de buque:', error);
        setDetailsState('error');
      }
    };

    const loadPositionData = async () => {
      try {
        const supabase = createClient();
        // Agregar .maybeSingle() para evitar errores si no existe el registro
        const { data, error } = await supabase
          .from('vessel_positions')
          .select('speed, course, destination, navigational_status, ship_type, country, eta_utc, atd_utc, last_port, unlocode_lastport, imo, mmsi, distance, predicted_eta, current_draught, length, beam, gross_tonnage, year_of_built, callsign, type_specific, deadweight, hull, builder, material, place_of_build, ballast_water, crude_oil, fresh_water, gas, grain, bale, time_remaining, teu, engine, ports, management, vessel_image, last_position_at, last_api_call_at')
          .eq('vessel_name', vessel.vessel_name)
          .maybeSingle();

        if (error || !data) {
          return;
        }

        // Parsear JSON fields si existen
        let engine = null;
        let ports = null;
        let management = null;
        
        try {
          if (data.engine && typeof data.engine === 'string') {
            engine = JSON.parse(data.engine);
          } else if (data.engine) {
            engine = data.engine;
          }
        } catch (e) {
          // Ignorar errores de parsing
        }
        
        try {
          if (data.ports && typeof data.ports === 'string') {
            ports = JSON.parse(data.ports);
          } else if (data.ports) {
            ports = data.ports;
          }
        } catch (e) {
          // Ignorar errores de parsing
        }
        
        try {
          if (data.management && typeof data.management === 'string') {
            management = JSON.parse(data.management);
          } else if (data.management) {
            management = data.management;
          }
        } catch (e) {
          // Ignorar errores de parsing
        }

        // Usar los campos directamente de la base de datos (más rápido que parsear JSON)
        const positionInfo: VesselPositionData = {
          imo: data.imo ?? null,
          mmsi: data.mmsi ?? null,
          speed: data.speed ?? null,
          course: data.course ?? null,
          destination: data.destination ?? null,
          navigationalStatus: data.navigational_status ?? null,
          shipType: data.ship_type ?? null,
          country: data.country ?? null,
          etaUtc: data.eta_utc ?? null,
          atdUtc: data.atd_utc ?? null,
          lastPort: data.last_port ?? null,
          distance: data.distance ?? null,
          predictedEta: data.predicted_eta ?? null,
          currentDraught: data.current_draught ?? null,
          length: data.length ?? null,
          beam: data.beam ?? null,
          grossTonnage: data.gross_tonnage ?? null,
          yearOfBuilt: data.year_of_built ?? null,
          callsign: data.callsign ?? null,
          typeSpecific: data.type_specific ?? null,
          deadweight: data.deadweight ?? null,
          hull: data.hull ?? null,
          builder: data.builder ?? null,
          material: data.material ?? null,
          placeOfBuild: data.place_of_build ?? null,
          ballastWater: data.ballast_water ?? null,
          crudeOil: data.crude_oil ?? null,
          freshWater: data.fresh_water ?? null,
          gas: data.gas ?? null,
          grain: data.grain ?? null,
          bale: data.bale ?? null,
          timeRemaining: data.time_remaining ?? null,
          teu: data.teu ?? null,
          engine,
          ports,
          management,
          vesselImage: data.vessel_image ?? null,
          lastPositionAt: data.last_position_at ?? null,
          lastApiCallAt: data.last_api_call_at ?? null,
        };

        setPositionData(positionInfo);
      } catch (error) {
        console.error('[VesselDetailsModal] Error cargando datos de posición:', error);
      }
    };

    void loadVesselDetails();
    void loadPositionData();
    
    // Refrescar datos automáticamente cada 30 segundos mientras el modal esté abierto
    if (isOpen && vessel) {
      const intervalId = setInterval(() => {
        void loadPositionData();
      }, 30000); // 30000 ms = 30 segundos
      
      return () => {
        clearInterval(intervalId);
      };
    }
  }, [isOpen, vessel]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !vessel) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-2xl border border-slate-800/60 bg-slate-950/95 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/60 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-sky-400">
              <Ship className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-white truncate sm:text-xl">
                {vessel.vessel_name}
              </h2>
              {vessel.destination && (
                <p className="text-xs text-slate-400 truncate sm:text-sm">
                  Destino: {vessel.destination}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-3 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-700/80 text-slate-400 hover:border-slate-600 hover:text-slate-200 transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6 space-y-6">
          {/* Imagen del buque - SIEMPRE VISIBLE SI EXISTE */}
          {positionData?.vesselImage && (
            <div className="w-full">
              <div className="relative w-full h-64 sm:h-80 rounded-xl overflow-hidden border border-slate-800/60 bg-slate-900/50">
                <img
                  src={positionData.vesselImage}
                  alt={`${vessel.vessel_name}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Si la imagen falla al cargar, ocultar el contenedor
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            </div>
          )}

          {/* Información principal de posición y navegación - SIEMPRE VISIBLE */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Posición - SIEMPRE VISIBLE */}
            <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-3">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-4 w-4 text-sky-400" />
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                  Posición
                </p>
              </div>
              <p className="text-xs font-medium text-slate-200 sm:text-sm">
                {vessel.last_lat != null && vessel.last_lon != null
                  ? `${vessel.last_lat.toFixed(4)}°N, ${Math.abs(vessel.last_lon).toFixed(4)}°W`
                  : 'No disponible'}
              </p>
            </div>

            {/* Última actualización - SIEMPRE VISIBLE */}
            <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-sky-400" />
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                  Última actualización
                </p>
              </div>
              <p className="text-xs font-medium text-slate-200 sm:text-sm">
                {(positionData?.lastApiCallAt || positionData?.lastPositionAt || vessel.last_api_call_at || vessel.last_position_at)
                  ? new Date(positionData?.lastApiCallAt || positionData?.lastPositionAt || vessel.last_api_call_at || vessel.last_position_at!).toLocaleString('es-CL', {
                      day: '2-digit',
                      month: '2-digit',
                      year: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })
                  : 'No disponible'}
              </p>
            </div>

            {/* Velocidad - SIEMPRE VISIBLE */}
            <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Navigation className="h-4 w-4 text-sky-400" />
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                  Velocidad
                </p>
              </div>
              <p className="text-xs font-medium text-slate-200 sm:text-sm">
                {positionData?.speed != null
                  ? `${Number(positionData.speed).toFixed(1)} nudos`
                  : 'No disponible'}
              </p>
            </div>

            {/* Rumbo - SIEMPRE VISIBLE */}
            <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Navigation className="h-4 w-4 text-sky-400 rotate-45" />
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                  Rumbo
                </p>
              </div>
              <p className="text-xs font-medium text-slate-200 sm:text-sm">
                {positionData?.course != null
                  ? `${Math.round(Number(positionData.course))}°`
                  : 'No disponible'}
              </p>
            </div>
          </div>

          {/* Información de navegación y destino */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Último puerto - SIEMPRE VISIBLE */}
            <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-3">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-4 w-4 text-sky-400" />
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                  Último puerto
                </p>
              </div>
              <p className="text-xs font-medium text-slate-200 sm:text-sm">
                {positionData?.lastPort || 'No disponible'}
              </p>
            </div>

            {/* Destino AIS - SIEMPRE VISIBLE */}
            <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-3">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-4 w-4 text-sky-400" />
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                  Destino AIS
                </p>
              </div>
              <p className="text-xs font-medium text-slate-200 sm:text-sm truncate">
                {positionData?.destination || 'No disponible'}
              </p>
            </div>

            {/* Estado de navegación - SIEMPRE VISIBLE */}
            <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Ship className="h-4 w-4 text-sky-400" />
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                  Estado
                </p>
              </div>
              <p className="text-xs font-medium text-slate-200 sm:text-sm">
                {positionData?.navigationalStatus || 'No disponible'}
              </p>
            </div>

            {/* Distancia al destino - SIEMPRE VISIBLE */}
            <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Navigation className="h-4 w-4 text-sky-400" />
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                  Distancia al destino
                </p>
              </div>
              <p className="text-xs font-medium text-slate-200 sm:text-sm">
                {positionData?.distance || 'No disponible'}
              </p>
            </div>
          </div>

          {/* Identificadores del buque */}
          {(positionData?.imo || positionData?.mmsi || positionData?.callsign) && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {positionData?.imo && (
                <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1">
                    IMO
                  </p>
                  <p className="text-xs font-medium text-slate-200 sm:text-sm">
                    {positionData.imo}
                  </p>
                </div>
              )}

              {positionData?.mmsi && (
                <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1">
                    MMSI
                  </p>
                  <p className="text-xs font-medium text-slate-200 sm:text-sm">
                    {positionData.mmsi}
                  </p>
                </div>
              )}

              {positionData?.callsign && (
                <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1">
                    Callsign
                  </p>
                  <p className="text-xs font-medium text-slate-200 sm:text-sm">
                    {positionData.callsign}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Información adicional del buque */}
          {(positionData?.shipType || positionData?.country || positionData?.typeSpecific) && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {positionData?.shipType && (
                <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1">
                    Tipo de buque
                  </p>
                  <p className="text-xs font-medium text-slate-200 sm:text-sm">
                    {positionData.shipType}
                  </p>
                </div>
              )}

              {positionData?.typeSpecific && (
                <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1">
                    Tipo específico
                  </p>
                  <p className="text-xs font-medium text-slate-200 sm:text-sm">
                    {positionData.typeSpecific}
                  </p>
                </div>
              )}

              {positionData?.country && (
                <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1">
                    País
                  </p>
                  <p className="text-xs font-medium text-slate-200 sm:text-sm">
                    {positionData.country}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Información de dimensiones y características */}
          {(positionData?.length || positionData?.beam || positionData?.grossTonnage || positionData?.yearOfBuilt || positionData?.currentDraught || positionData?.deadweight || positionData?.teu) && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {positionData?.length && (
                <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1">
                    Longitud
                  </p>
                  <p className="text-xs font-medium text-slate-200 sm:text-sm">
                    {positionData.length}
                  </p>
                </div>
              )}

              {positionData?.beam && (
                <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1">
                    Manga
                  </p>
                  <p className="text-xs font-medium text-slate-200 sm:text-sm">
                    {positionData.beam}
                  </p>
                </div>
              )}

              {positionData?.currentDraught && (
                <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1">
                    Calado actual
                  </p>
                  <p className="text-xs font-medium text-slate-200 sm:text-sm">
                    {positionData.currentDraught}
                  </p>
                </div>
              )}

              {positionData?.grossTonnage && (
                <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1">
                    Tonelaje bruto
                  </p>
                  <p className="text-xs font-medium text-slate-200 sm:text-sm">
                    {positionData.grossTonnage}
                  </p>
                </div>
              )}

              {positionData?.deadweight && (
                <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1">
                    Peso muerto
                  </p>
                  <p className="text-xs font-medium text-slate-200 sm:text-sm">
                    {positionData.deadweight}
                  </p>
                </div>
              )}

              {positionData?.teu && (
                <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1">
                    TEU
                  </p>
                  <p className="text-xs font-medium text-slate-200 sm:text-sm">
                    {positionData.teu}
                  </p>
                </div>
              )}

              {positionData?.yearOfBuilt && (
                <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1">
                    Año construcción
                  </p>
                  <p className="text-xs font-medium text-slate-200 sm:text-sm">
                    {positionData.yearOfBuilt}
                  </p>
                </div>
              )}

              {positionData?.timeRemaining && (
                <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1">
                    Tiempo restante
                  </p>
                  <p className="text-xs font-medium text-slate-200 sm:text-sm">
                    {positionData.timeRemaining}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Información de construcción */}
          {(positionData?.builder || positionData?.placeOfBuild || positionData?.hull || positionData?.material) && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {positionData?.builder && (
                <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1">
                    Astillero
                  </p>
                  <p className="text-xs font-medium text-slate-200 sm:text-sm">
                    {positionData.builder}
                  </p>
                </div>
              )}

              {positionData?.placeOfBuild && (
                <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1">
                    Lugar de construcción
                  </p>
                  <p className="text-xs font-medium text-slate-200 sm:text-sm">
                    {positionData.placeOfBuild}
                  </p>
                </div>
              )}

              {positionData?.hull && (
                <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1">
                    Casco
                  </p>
                  <p className="text-xs font-medium text-slate-200 sm:text-sm">
                    {positionData.hull}
                  </p>
                </div>
              )}

              {positionData?.material && (
                <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1">
                    Material
                  </p>
                  <p className="text-xs font-medium text-slate-200 sm:text-sm">
                    {positionData.material}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Información de carga */}
          {(positionData?.ballastWater || positionData?.crudeOil || positionData?.freshWater || positionData?.gas || positionData?.grain || positionData?.bale) && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {positionData?.ballastWater && (
                <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1">
                    Agua de lastre
                  </p>
                  <p className="text-xs font-medium text-slate-200 sm:text-sm">
                    {positionData.ballastWater}
                  </p>
                </div>
              )}

              {positionData?.crudeOil && (
                <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1">
                    Petróleo crudo
                  </p>
                  <p className="text-xs font-medium text-slate-200 sm:text-sm">
                    {positionData.crudeOil}
                  </p>
                </div>
              )}

              {positionData?.freshWater && (
                <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1">
                    Agua dulce
                  </p>
                  <p className="text-xs font-medium text-slate-200 sm:text-sm">
                    {positionData.freshWater}
                  </p>
                </div>
              )}

              {positionData?.gas && (
                <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1">
                    Gas
                  </p>
                  <p className="text-xs font-medium text-slate-200 sm:text-sm">
                    {positionData.gas}
                  </p>
                </div>
              )}

              {positionData?.grain && (
                <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1">
                    Grano
                  </p>
                  <p className="text-xs font-medium text-slate-200 sm:text-sm">
                    {positionData.grain}
                  </p>
                </div>
              )}

              {positionData?.bale && (
                <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1">
                    Fardos
                  </p>
                  <p className="text-xs font-medium text-slate-200 sm:text-sm">
                    {positionData.bale}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Información de navegación y destino */}
          {(positionData?.lastPort || positionData?.distance || positionData?.predictedEta) && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {positionData?.lastPort && (
                <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1">
                    Último puerto
                  </p>
                  <p className="text-xs font-medium text-slate-200 sm:text-sm">
                    {positionData.lastPort}
                  </p>
                </div>
              )}

              {positionData?.distance && (
                <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1">
                    Distancia al destino
                  </p>
                  <p className="text-xs font-medium text-slate-200 sm:text-sm">
                    {positionData.distance}
                  </p>
                </div>
              )}

              {positionData?.predictedEta && (
                <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1">
                    ETA predicho
                  </p>
                  <p className="text-xs font-medium text-slate-200 sm:text-sm">
                    {positionData.predictedEta}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Información de fechas */}
          {(vessel.etd || vessel.eta || positionData?.etaUtc || positionData?.atdUtc) && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {vessel.etd && (
                <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1">
                    Zarpe estimado (ETD)
                  </p>
                  <p className="text-xs font-medium text-slate-200 sm:text-sm">
                    {new Date(vessel.etd).toLocaleString('es-CL', {
                      timeZone: 'UTC',
                      day: '2-digit',
                      month: '2-digit',
                      year: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              )}

              {vessel.eta && (
                <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1">
                    Arribo estimado (ETA)
                  </p>
                  <p className="text-xs font-medium text-slate-200 sm:text-sm">
                    {new Date(vessel.eta).toLocaleString('es-CL', {
                      timeZone: 'UTC',
                      day: '2-digit',
                      month: '2-digit',
                      year: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              )}

              {positionData?.atdUtc && (
                <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1">
                    Zarpe real (ATD)
                  </p>
                  <p className="text-xs font-medium text-slate-200 sm:text-sm">
                    {new Date(positionData.atdUtc).toLocaleString('es-CL', {
                      timeZone: 'UTC',
                      day: '2-digit',
                      month: '2-digit',
                      year: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              )}

              {positionData?.etaUtc && (
                <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1">
                    Arribo AIS (ETA)
                  </p>
                  <p className="text-xs font-medium text-slate-200 sm:text-sm">
                    {new Date(positionData.etaUtc).toLocaleString('es-CL', {
                      timeZone: 'UTC',
                      day: '2-digit',
                      month: '2-digit',
                      year: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Información del motor */}
          {positionData?.engine && (
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500 mb-3">
                Motor
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {positionData.engine.engineBuilder && (
                  <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1">
                      Fabricante
                    </p>
                    <p className="text-xs font-medium text-slate-200 sm:text-sm">
                      {positionData.engine.engineBuilder}
                    </p>
                  </div>
                )}
                {positionData.engine.engineType && (
                  <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1">
                      Tipo
                    </p>
                    <p className="text-xs font-medium text-slate-200 sm:text-sm">
                      {positionData.engine.engineType}
                    </p>
                  </div>
                )}
                {positionData.engine['enginePower(kW)'] && (
                  <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1">
                      Potencia (kW)
                    </p>
                    <p className="text-xs font-medium text-slate-200 sm:text-sm">
                      {positionData.engine['enginePower(kW)']}
                    </p>
                  </div>
                )}
                {positionData.engine.fuelType && (
                  <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1">
                      Tipo de combustible
                    </p>
                    <p className="text-xs font-medium text-slate-200 sm:text-sm">
                      {positionData.engine.fuelType}
                    </p>
                  </div>
                )}
                {positionData.engine.Propeller && (
                  <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1">
                      Hélice
                    </p>
                    <p className="text-xs font-medium text-slate-200 sm:text-sm">
                      {positionData.engine.Propeller}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Historial de puertos */}
          {positionData?.ports && Array.isArray(positionData.ports) && positionData.ports.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500 mb-3">
                Historial de puertos ({positionData.ports.length} puertos)
              </p>
              <div className="rounded-lg border border-slate-800/60 bg-slate-950/40">
                <div
                  className="max-h-[30vh] overflow-y-auto overflow-x-auto"
                  style={{
                    willChange: 'scroll-position',
                    WebkitOverflowScrolling: 'touch',
                  }}
                >
                  <table className="min-w-full text-left text-[10px] text-slate-200 sm:text-xs">
                    <thead className="sticky top-0 border-b border-slate-800 bg-slate-950/90 text-[10px] uppercase tracking-[0.15em] text-slate-500 sm:text-[11px] sm:tracking-[0.2em]">
                      <tr>
                        <th className="px-2 py-1.5 sm:px-3 sm:py-2">Puerto</th>
                        <th className="px-2 py-1.5 sm:px-3 sm:py-2">Código</th>
                        <th className="px-2 py-1.5 sm:px-3 sm:py-2">Llegada</th>
                        <th className="px-2 py-1.5 sm:px-3 sm:py-2">Salida</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {positionData.ports.slice(0, 10).map((port: any, index: number) => (
                        <tr key={index}>
                          <td className="px-2 py-1.5 sm:px-3 sm:py-2">
                            {port.portName || port['Nombre del puerto'] || '—'}
                          </td>
                          <td className="px-2 py-1.5 sm:px-3 sm:py-2">
                            {port.portSign || port['Signo del puerto'] || port['Signato del puerto'] || '—'}
                          </td>
                          <td className="px-2 py-1.5 sm:px-3 sm:py-2">
                            {port.arrived || port.llegada || port.llegó || '—'}
                          </td>
                          <td className="px-2 py-1.5 sm:px-3 sm:py-2">
                            {port.departed || port.salida || port.salió || port.Salió || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Información de gestión */}
          {positionData?.management && (
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500 mb-3">
                Gestión y propiedad
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {positionData.management.registeredOwner || positionData.management['Propietario registrado'] ? (
                  <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1">
                      Propietario registrado
                    </p>
                    <p className="text-xs font-medium text-slate-200 sm:text-sm">
                      {positionData.management.registeredOwner || positionData.management['Propietario registrado']}
                    </p>
                    {positionData.management.registeredOwnerAddress || positionData.management['Dirección del propietario registrado'] ? (
                      <p className="text-[10px] text-slate-400 mt-1">
                        {positionData.management.registeredOwnerAddress || positionData.management['Dirección del propietario registrado']}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {positionData.management.manager || positionData.management.Gerente ? (
                  <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1">
                      Gerente
                    </p>
                    <p className="text-xs font-medium text-slate-200 sm:text-sm">
                      {positionData.management.manager || positionData.management.Gerente}
                    </p>
                  </div>
                ) : null}
                {positionData.management.ism ? (
                  <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1">
                      ISM
                    </p>
                    <p className="text-xs font-medium text-slate-200 sm:text-sm">
                      {positionData.management.ism}
                    </p>
                  </div>
                ) : null}
                {positionData.management['P&I'] ? (
                  <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1">
                      P&I
                    </p>
                    <p className="text-xs font-medium text-slate-200 sm:text-sm">
                      {positionData.management['P&I']}
                    </p>
                  </div>
                ) : null}
                {positionData.management.ClassificationSociety ? (
                  <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1">
                      Sociedad de clasificación
                    </p>
                    <p className="text-xs font-medium text-slate-200 sm:text-sm">
                      {positionData.management.ClassificationSociety}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {/* Tabla de detalles */}
          <div>
            <div className="mb-3">
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">
                Detalle de embarques
              </p>
              <p className="text-xs text-slate-400">
                {vessel.bookings.length} bookings · {vessel.containers.length} contenedores
              </p>
            </div>

            {detailsState === 'loading' && (
              <p className="text-xs text-slate-400 py-4">Cargando detalle de embarques…</p>
            )}

            {detailsState === 'error' && (
              <p className="text-xs text-rose-300 py-4">
                No se pudo cargar el detalle de este buque.
              </p>
            )}

            {detailsState === 'success' && detailRows.length === 0 && (
              <p className="text-xs text-slate-400 py-4">
                No se encontraron embarques asociados a este buque.
              </p>
            )}

            {detailsState === 'success' && detailRows.length > 0 && (
              <div className="rounded-lg border border-slate-800/60 bg-slate-950/40">
                <div
                  className="max-h-[40vh] overflow-y-auto overflow-x-auto"
                  style={{
                    willChange: 'scroll-position',
                    WebkitOverflowScrolling: 'touch',
                  }}
                >
                  <table className="min-w-full text-left text-[10px] text-slate-200 sm:text-xs">
                    <thead className="sticky top-0 border-b border-slate-800 bg-slate-950/90 text-[10px] uppercase tracking-[0.15em] text-slate-500 sm:text-[11px] sm:tracking-[0.2em]">
                      <tr>
                        <th className="px-2 py-1.5 sm:px-3 sm:py-2">Booking</th>
                        <th className="px-2 py-1.5 sm:px-3 sm:py-2">Contenedor</th>
                        <th className="px-2 py-1.5 sm:px-3 sm:py-2">Origen</th>
                        <th className="px-2 py-1.5 sm:px-3 sm:py-2">Destino</th>
                        <th className="px-2 py-1.5 sm:px-3 sm:py-2">ETD</th>
                        <th className="px-2 py-1.5 sm:px-3 sm:py-2">ETA</th>
                        <th className="px-2 py-1.5 sm:px-3 sm:py-2">TT estimado</th>
                        <th className="px-2 py-1.5 sm:px-3 sm:py-2">TT real</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {detailRows.map((row) => (
                        <tr key={row.id}>
                          <td className="px-2 py-1.5 font-medium sm:px-3 sm:py-2">
                            {row.booking ?? '—'}
                          </td>
                          <td className="px-2 py-1.5 sm:px-3 sm:py-2">{row.contenedor ?? '—'}</td>
                          <td className="px-2 py-1.5 sm:px-3 sm:py-2">{row.origen ?? '—'}</td>
                          <td className="px-2 py-1.5 sm:px-3 sm:py-2">{row.destino ?? '—'}</td>
                          <td className="px-2 py-1.5 whitespace-nowrap sm:px-3 sm:py-2">
                            {row.etd
                              ? new Date(row.etd).toLocaleString('es-CL', {
                                  timeZone: 'UTC',
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: '2-digit',
                                })
                              : '—'}
                          </td>
                          <td className="px-2 py-1.5 whitespace-nowrap sm:px-3 sm:py-2">
                            {row.eta
                              ? new Date(row.eta).toLocaleString('es-CL', {
                                  timeZone: 'UTC',
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: '2-digit',
                                })
                              : '—'}
                          </td>
                          <td className="px-2 py-1.5 sm:px-3 sm:py-2">
                            {row.ttEstimadoDias != null ? row.ttEstimadoDias : '—'}
                          </td>
                          <td className="px-2 py-1.5 sm:px-3 sm:py-2">
                            {row.ttRealDias != null ? row.ttRealDias : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

