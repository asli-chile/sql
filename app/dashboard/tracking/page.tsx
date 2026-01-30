'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useTheme } from '@/contexts/ThemeContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { useUser } from '@/hooks/useUser';
import { User as SupabaseUser } from '@supabase/supabase-js';
import {
    Search,
    MapPin,
    Ship,
    Box,
    Calendar,
    ChevronRight,
    Filter,
    LayoutDashboard,
    Truck,
    FileText,
    Globe,
    BarChart3,
    DollarSign,
    Users,
    Menu,
    X,
    FilterX
} from 'lucide-react';
import { Registro } from '@/types/registros';
import { ShipmentHito } from '@/types/tracking';
import { searchShipments, getShipmentTracking, updateTrackingEvent } from '@/lib/tracking-service';
import { subscribeToTrackingUpdates } from '@/lib/auto-tracking-sync';
import { MovementCard, TimelineStep, MilestoneEditModal } from '@/components/tracking/TrackingComponents';
import { MilestoneStatus } from '@/types/tracking';
import LoadingScreen from '@/components/ui/LoadingScreen';

export default function TrackingPage() {
    const { theme } = useTheme();
    const { currentUser, transportesCount, registrosCount } = useUser();
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);
    const [user, setUser] = useState<SupabaseUser | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [shipments, setShipments] = useState<Registro[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [tracking, setTracking] = useState<ShipmentHito[]>([]);
    const [loadingTracking, setLoadingTracking] = useState(false);
    const [editingHito, setEditingHito] = useState<ShipmentHito | null>(null);

    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Obtener usuario de auth
    useEffect(() => {
        const fetchUser = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        fetchUser();
    }, []);

    // Estados de filtros
    const [isFiltersOpen, setIsFiltersOpen] = useState(false);
    const [filters, setFilters] = useState({
        estado: '',
        shipper: ''
    });

    // Listas para filtros (se podrían cargar de catálogos)
    const estadosPosibles = ['PENDIENTE', 'CONFIRMADO', 'CANCELADO'];

    // Cargar lista inicial
    useEffect(() => {
        const initFetch = async () => {
            setLoading(true);
            const data = await searchShipments('');
            setShipments(data);
            if (data.length > 0) {
                setSelectedId(data[0].id || null);
            }
            setLoading(false);
        };
        initFetch();
    }, []);

    // Búsqueda con debounce
    useEffect(() => {
        const timer = setTimeout(async () => {
            setSearching(true);
            const data = await searchShipments(searchTerm);
            setShipments(data);
            setSearching(false);
        }, 500);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Cargar tracking cuando cambia la selección
    useEffect(() => {
        fetchTracking();
    }, [selectedId]);

    // Suscribirse a actualizaciones en tiempo real del tracking
    useEffect(() => {
        if (!selectedId) return;

        const unsubscribe = subscribeToTrackingUpdates(selectedId, (updatedTracking) => {
            console.log('📡 [Tracking UI] Actualización recibida en tiempo real');
            setTracking(updatedTracking);
        });

        return () => {
            unsubscribe();
        };
    }, [selectedId]);

    const fetchTracking = async () => {
        if (!selectedId) return;
        setLoadingTracking(true);
        const data = await getShipmentTracking(selectedId);
        setTracking(data);
        setLoadingTracking(false);
    };

    const handleUpdateHito = async (status: MilestoneStatus, date: string, observation: string) => {
        if (!selectedId || !editingHito) return;

        const { error } = await updateTrackingEvent(
            selectedId,
            editingHito.milestone,
            status,
            observation,
            date
        );

        if (!error) {
            await fetchTracking();
            setEditingHito(null);
        } else {
            alert('Error al actualizar el hito: ' + error.message);
        }
    };

    const filteredShipments = useMemo(() => {
        return shipments.filter(s => {
            if (filters.estado && s.estado !== filters.estado) return false;
            if (filters.shipper && s.shipper !== filters.shipper) return false;
            return true;
        });
    }, [shipments, filters]);

    const shippersUnicos = useMemo(() => {
        const set = new Set(shipments.map(s => s.shipper).filter(Boolean));
        return Array.from(set).sort();
    }, [shipments]);

    const selectedShipment = useMemo(() =>
        filteredShipments.find(s => s.id === selectedId) || (filteredShipments.length > 0 ? filteredShipments[0] : null),
        [filteredShipments, selectedId]);

    const isAdmin = currentUser?.rol === 'admin';
    const isRodrigo = currentUser?.email?.toLowerCase() === 'rodrigo.caceres@asli.cl';

    const sidebarNav = [
        {
            title: 'Inicio',
            items: [
                { label: 'Dashboard', id: '/dashboard', icon: LayoutDashboard },
            ],
        },
        {
            title: 'Módulos',
            items: [
                { label: 'Embarques', id: '/registros', icon: Ship, counter: registrosCount, tone: 'violet' as const },
                { label: 'Transportes', id: '/transportes', icon: Truck, counter: transportesCount, tone: 'sky' as const },
                { label: 'Documentos', id: '/documentos', icon: FileText },
                { label: 'Seguimiento Marítimo', id: '/dashboard/seguimiento', icon: Globe },
                { label: 'Tracking Movs', id: '/dashboard/tracking', icon: Activity, isActive: true },
                ...(isRodrigo
                    ? [
                        { label: 'Finanzas', id: '/finanzas', icon: DollarSign },
                        { label: 'Reportes', id: '/reportes', icon: BarChart3 },
                    ]
                    : []),
            ],
        },
        ...(isAdmin
            ? [
                {
                    title: 'Mantenimiento',
                    items: [
                        { label: 'Usuarios', id: '/mantenimiento', icon: Users },
                    ],
                },
            ]
            : []),
    ];

    if (loading && !shipments.length) return <LoadingScreen message="Cargando seguimiento..." />;

    return (
        <div className={`flex h-screen overflow-hidden ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-gray-50 text-gray-900'}`}>
            <Sidebar
                isSidebarCollapsed={isSidebarCollapsed}
                setIsSidebarCollapsed={setIsSidebarCollapsed}
                isMobileMenuOpen={isMobileMenuOpen}
                setIsMobileMenuOpen={setIsMobileMenuOpen}
                sections={sidebarNav}
                currentUser={currentUser}
                user={user}
                setShowProfileModal={() => { }}
            />

            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Header */}
                <header className={`p-3 sm:p-4 border-b ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            {/* Botón Menu (Sidebar Toggle) */}
                            <button
                                onClick={() => isSidebarCollapsed ? setIsSidebarCollapsed(false) : setIsMobileMenuOpen(true)}
                                className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-gray-100 text-gray-500'
                                    } ${!isSidebarCollapsed && 'lg:hidden'}`}
                            >
                                <Menu className="h-6 w-6" />
                            </button>
                            <div>
                                <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                                    Tracking de Movimientos
                                </h1>
                                <p className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
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
                                    className={`w-full pl-10 pr-4 py-2 rounded-full border text-sm transition-all focus:outline-none focus:ring-2 ${theme === 'dark'
                                        ? 'bg-slate-800 border-slate-700 text-white focus:ring-sky-500/50 focus:border-sky-500'
                                        : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500/50 focus:border-blue-500'
                                        }`}
                                />
                                {searching && (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                        <div className="h-4 w-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                                    </div>
                                )}
                            </div>

                            <div className="relative">
                                <button
                                    onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-all ${isFiltersOpen || filters.estado || filters.shipper
                                        ? 'bg-sky-500 border-sky-500 text-white shadow-lg'
                                        : theme === 'dark'
                                            ? 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                                        }`}
                                >
                                    <Filter className="h-4 w-4" />
                                    <span className="hidden sm:inline">Filtros</span>
                                    {(filters.estado || filters.shipper) && (
                                        <span className="flex h-2 w-2 rounded-full bg-white animate-pulse" />
                                    )}
                                </button>

                                {/* Dropdown de Filtros */}
                                {isFiltersOpen && (
                                    <div className={`absolute right-0 mt-3 w-72 rounded-2xl border shadow-2xl z-50 p-5 animate-in fade-in zoom-in duration-200 ${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'
                                        }`}>
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="font-bold text-sm">Filtros Avanzados</h3>
                                            <button
                                                onClick={() => {
                                                    setFilters({ estado: '', shipper: '' });
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
                                                    className={`w-full p-2 text-sm rounded-lg border focus:outline-none focus:ring-1 ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white focus:border-sky-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-500'}`}
                                                >
                                                    <option value="">Todos los estados</option>
                                                    {estadosPosibles.map(e => (
                                                        <option key={e} value={e}>{e}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className={`block text-[10px] uppercase font-bold tracking-widest mb-2 ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`}>Shipper / Exportador</label>
                                                <select
                                                    value={filters.shipper}
                                                    onChange={(e) => setFilters({ ...filters, shipper: e.target.value })}
                                                    className={`w-full p-2 text-sm rounded-lg border focus:outline-none focus:ring-1 ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white focus:border-sky-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-500'}`}
                                                >
                                                    <option value="">Todos los clientes</option>
                                                    {shippersUnicos.map(s => (
                                                        <option key={s} value={s}>{s}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                )}
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
                                            <span className={`px-3 py-1 rounded-lg text-xs font-medium ${theme === 'dark' ? 'bg-slate-800 text-slate-300' : 'bg-gray-100 text-gray-700'}`}>
                                                Contenedor: {selectedShipment.contenedor}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${theme === 'dark' ? 'bg-slate-800 text-slate-300' : 'bg-gray-100 text-gray-700'}`}>
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
                                            <div className="h-8 w-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
                                        </div>
                                    ) : (
                                        <div className="space-y-0">
                                            {tracking.map((hito, index) => (
                                                <TimelineStep
                                                    key={hito.milestone}
                                                    hito={hito}
                                                    isLast={index === tracking.length - 1}
                                                    theme={theme}
                                                    canEdit={isAdmin || isRodrigo}
                                                    onEdit={(h) => setEditingHito(h)}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center p-10">
                                <div className={`h-20 w-20 rounded-full flex items-center justify-center mb-6 ${theme === 'dark' ? 'bg-slate-900' : 'bg-gray-100'}`}>
                                    <Box className="h-10 w-10 text-slate-400" />
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

            {/* Modal de Edición */}
            {editingHito && (
                <MilestoneEditModal
                    hito={editingHito}
                    onClose={() => setEditingHito(null)}
                    onSave={handleUpdateHito}
                    theme={theme}
                />
            )}
        </div>
    );
}

// Icono temporal si no existe Activity en lucide-react
const Activity = (props: any) => (
    <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24" height="24" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round"
    >
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
    </svg>
);
