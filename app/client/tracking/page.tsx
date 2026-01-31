'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/hooks/useUser';
import { User as SupabaseUser } from '@supabase/supabase-js';
import {
    Search,
    Box,
    Filter,
    Activity,
    User as UserIcon
} from 'lucide-react';
import { Registro } from '@/types/registros';
import { ShipmentHito } from '@/types/tracking';
import { searchShipments, getShipmentTracking } from '@/lib/tracking-service';
import { MovementCard, TimelineStep } from '@/components/tracking/TrackingComponents';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { convertSupabaseToApp } from '@/lib/migration-utils';
import { useClientLayout } from '../layout';

export default function ClientTrackingPage() {
    const { theme } = useTheme();
    const { currentUser } = useUser();
    const { setShowProfileModal } = useClientLayout();
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);
    const [user, setUser] = useState<SupabaseUser | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [shipments, setShipments] = useState<Registro[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [tracking, setTracking] = useState<ShipmentHito[]>([]);
    const [loadingTracking, setLoadingTracking] = useState(false);

    // Estados de filtros
    const [isFiltersOpen, setIsFiltersOpen] = useState(false);
    const [filters, setFilters] = useState({
        estado: ''
    });

    // Listas para filtros
    const estadosPosibles = ['PENDIENTE', 'CONFIRMADO', 'CANCELADO'];

    // Obtener usuario de auth
    useEffect(() => {
        const fetchUser = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        fetchUser();
    }, []);

    // Cargar lista inicial filtrada por cliente
    useEffect(() => {
        const initFetch = async () => {
            if (!currentUser?.cliente_nombre) {
                setLoading(false);
                return;
            }

            setLoading(true);
            const supabase = createClient();

            // Obtener registros del cliente
            const { data: registrosData, error } = await supabase
                .from('registros')
                .select('*')
                .eq('shipper', currentUser.cliente_nombre)
                .is('deleted_at', null)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching client shipments:', error);
                setShipments([]);
            } else {
                const mappedData = (registrosData || []).map(convertSupabaseToApp);
                setShipments(mappedData);
                if (mappedData.length > 0) {
                    setSelectedId(mappedData[0].id || null);
                }
            }
            setLoading(false);
        };
        initFetch();
    }, [currentUser]);

    // Búsqueda con debounce
    useEffect(() => {
        if (!currentUser?.cliente_nombre) return;

        const timer = setTimeout(async () => {
            setSearching(true);
            const supabase = createClient();

            // Buscar registros del cliente
            let query = supabase
                .from('registros')
                .select('*')
                .eq('shipper', currentUser.cliente_nombre)
                .is('deleted_at', null);

            if (searchTerm.trim()) {
                query = query.or(`booking.ilike.%${searchTerm}%,contenedor.ilike.%${searchTerm}%,ref_cliente.ilike.%${searchTerm}%,ref_asli.ilike.%${searchTerm}%`);
            }

            const { data: registrosData, error } = await query.order('created_at', { ascending: false });

            if (error) {
                console.error('Error searching shipments:', error);
            } else {
                const mappedData = (registrosData || []).map(convertSupabaseToApp);
                setShipments(mappedData);
            }
            setSearching(false);
        }, 500);

        return () => clearTimeout(timer);
    }, [searchTerm, currentUser]);

    // Cargar tracking cuando cambia la selección
    useEffect(() => {
        fetchTracking();
    }, [selectedId]);

    const fetchTracking = async () => {
        if (!selectedId) return;
        setLoadingTracking(true);
        const data = await getShipmentTracking(selectedId);
        setTracking(data);
        setLoadingTracking(false);
    };

    const filteredShipments = useMemo(() => {
        return shipments.filter(s => {
            if (filters.estado && s.estado !== filters.estado) return false;
            return true;
        });
    }, [shipments, filters]);

    const selectedShipment = useMemo(() =>
        filteredShipments.find(s => s.id === selectedId) || (filteredShipments.length > 0 ? filteredShipments[0] : null),
        [filteredShipments, selectedId]);

    if (loading && !shipments.length) return <LoadingScreen message="Cargando seguimiento..." />;

    return (
        <div className={`flex h-screen overflow-hidden ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-gray-50 text-gray-900'}`}>
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Header */}
                <header className={`p-2 sm:p-3 border-b ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <div>
                                <p className={`text-[10px] sm:text-[11px] uppercase tracking-[0.2em] sm:tracking-[0.3em] ${theme === 'dark' ? 'text-slate-500/80' : 'text-gray-500'}`}>Módulo Operativo</p>
                                <h1 className={`text-lg sm:text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                    Tracking de Movimientos
                                </h1>
                                <p className={`text-[11px] sm:text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                                    Seguimiento en tiempo real por hito operativo
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 w-full sm:max-w-md">
                            <div className="relative flex-1">
                                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`} />
                                <input
                                    type="text"
                                    placeholder="Buscar por booking, contenedor, ref..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className={`w-full pl-10 pr-4 py-2 border text-sm transition-all focus:outline-none focus:ring-2 ${theme === 'dark'
                                        ? 'bg-slate-800 border-slate-700/60 text-white focus:ring-sky-500/50 focus:border-sky-500'
                                        : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500/50 focus:border-blue-500'
                                        }`}
                                />
                                {searching && (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                        <div className="h-4 w-4 border-2 border-sky-500 border-t-transparent animate-spin" />
                                    </div>
                                )}
                            </div>

                            <div className="relative">
                                <button
                                    onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 border text-xs font-medium transition-colors ${isFiltersOpen || filters.estado
                                        ? 'bg-sky-600 border-sky-500 text-white'
                                        : theme === 'dark'
                                            ? 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:border-sky-500'
                                            : 'bg-white border-gray-300 text-gray-700 hover:border-blue-400'
                                        }`}
                                >
                                    <Filter className="h-4 w-4" />
                                    <span className="hidden sm:inline">Filtros</span>
                                    {filters.estado && (
                                        <span className="flex h-2 w-2 bg-white" />
                                    )}
                                </button>

                                {/* Dropdown de Filtros */}
                                {isFiltersOpen && (
                                    <div className={`absolute right-0 mt-2 w-72 border z-50 p-4 ${theme === 'dark' ? 'bg-slate-900 border-slate-700/60' : 'bg-white border-gray-300'
                                        }`}>
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="font-bold text-sm">Filtros Avanzados</h3>
                                            <button
                                                onClick={() => {
                                                    setFilters({ estado: '' });
                                                    setIsFiltersOpen(false);
                                                }}
                                                className="text-[10px] uppercase tracking-wider font-bold text-sky-500 hover:text-sky-400"
                                            >
                                                Limpiar
                                            </button>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <label className={`block text-[10px] uppercase font-bold tracking-widest mb-2 ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`}>Estado</label>
                                                <select
                                                    value={filters.estado}
                                                    onChange={(e) => setFilters({ ...filters, estado: e.target.value })}
                                                    className={`w-full p-2 text-sm border focus:outline-none focus:ring-1 ${theme === 'dark' ? 'bg-slate-800 border-slate-700/60 text-white focus:border-sky-500' : 'bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500'}`}
                                                >
                                                    <option value="">Todos los estados</option>
                                                    {estadosPosibles.map(e => (
                                                        <option key={e} value={e}>{e}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Botón de usuario */}
                            <div className="relative hidden sm:flex flex-shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setShowProfileModal(true)}
                                    className={`flex items-center gap-1.5 sm:gap-2 border ${theme === 'dark' ? 'border-slate-700/60 bg-slate-800/60 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-slate-200 hover:border-sky-500/60 hover:text-sky-200' : 'border-gray-300 bg-white px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-700 hover:border-blue-500 hover:text-blue-700'} transition`}
                                    aria-haspopup="dialog"
                                    title={currentUser?.nombre || currentUser?.email || 'Usuario'}
                                >
                                    <UserIcon className="h-4 w-4 sm:h-4 sm:w-4 flex-shrink-0" />
                                    <span className="max-w-[100px] md:max-w-[160px] truncate font-medium text-xs sm:text-sm">
                                        {currentUser?.nombre || currentUser?.email || 'Usuario'}
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="flex-1 flex overflow-hidden">
                    {/* Lista Izquierda */}
                    <div className={`w-72 flex-shrink-0 flex flex-col border-r overflow-hidden ${theme === 'dark' ? 'bg-slate-950/50 border-slate-800' : 'bg-white border-gray-100'}`}>
                        <div className="p-3 overflow-y-auto">
                            {filteredShipments.length === 0 && !searching ? (
                                <div className="text-center py-10">
                                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`}>No se encontraron movimientos</p>
                                </div>
                            ) : (
                                filteredShipments.map(s => (
                                    <MovementCard
                                        key={s.id}
                                        registro={s}
                                        isSelected={selectedId === s.id}
                                        onClick={() => setSelectedId(s.id || null)}
                                        theme={theme}
                                    />
                                ))
                            )}
                        </div>
                    </div>

                    {/* Timeline Derecha */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                        {selectedShipment ? (
                            <div className="max-w-3xl mx-auto">
                                <div className="mb-6 flex items-start justify-between">
                                    <div>
                                        <h2 className="text-xl font-bold mb-1">{selectedShipment.booking}</h2>
                                        <div className="flex flex-wrap gap-3">
                                            <span className={`px-3 py-1 border text-xs font-medium ${theme === 'dark' ? 'bg-slate-800 border-slate-700/60 text-slate-300' : 'bg-gray-50 border-gray-300 text-gray-700'}`}>
                                                Contenedor: {selectedShipment.contenedor}
                                            </span>
                                            <span className={`px-2 py-0.5 border text-xs font-medium ${theme === 'dark' ? 'bg-slate-800 border-slate-700/60 text-slate-300' : 'bg-gray-50 border-gray-300 text-gray-700'}`}>
                                                REF CLIENTE: {selectedShipment.refCliente || selectedShipment.refAsli}
                                            </span>
                                        </div>
                                    </div>
                                    <div className={`text-right hidden sm:block`}>
                                        <p className={`text-[10px] uppercase font-bold tracking-widest ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`}>Trayecto</p>
                                        <p className="font-bold">{selectedShipment.pol} → {selectedShipment.pod}</p>
                                    </div>
                                </div>

                                <div className="relative">
                                    {loadingTracking ? (
                                        <div className="flex items-center justify-center py-20">
                                            <div className="h-8 w-8 border-4 border-sky-500 border-t-transparent animate-spin" />
                                        </div>
                                    ) : (
                                        <div className="space-y-0">
                                            {tracking.map((hito, index) => (
                                                <TimelineStep
                                                    key={hito.milestone}
                                                    hito={hito}
                                                    isLast={index === tracking.length - 1}
                                                    theme={theme}
                                                    canEdit={false}
                                                    onEdit={undefined}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center p-10">
                                <div className={`h-20 w-20 border flex items-center justify-center mb-6 ${theme === 'dark' ? 'bg-slate-900 border-slate-700/60' : 'bg-gray-100 border-gray-300'}`}>
                                    <Box className={`h-10 w-10 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-400'}`} />
                                </div>
                                <h3 className="text-lg font-bold mb-2">Selecciona un movimiento</h3>
                                <p className={`max-w-xs text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`}>
                                    Elige un embarque de la lista lateral para visualizar su línea de tiempo detallada.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
