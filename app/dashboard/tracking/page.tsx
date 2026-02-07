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
    Anchor,
    Box,
    Calendar,
    ChevronRight,
    Filter,
    LayoutDashboard,
    Truck,
    FileText,
    FileCheck,
    Globe,
    BarChart3,
    DollarSign,
    Users,
    Menu,
    X,
    FilterX,
    Activity,
    User as UserIcon
} from 'lucide-react';
import { Registro } from '@/types/registros';
import { ShipmentHito } from '@/types/tracking';
import { searchShipments, getShipmentTracking, updateTrackingEvent } from '@/lib/tracking-service';
import { MovementCard, TimelineStep, MilestoneEditModal } from '@/components/tracking/TrackingComponents';
import { MilestoneStatus } from '@/types/tracking';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { UserProfileModal } from '@/components/users/UserProfileModal';

export default function TrackingPage() {
    const { theme } = useTheme();
    const { currentUser, transportesCount, registrosCount, setCurrentUser } = useUser();
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);
    const [user, setUser] = useState<SupabaseUser | null>(null);
    const [trackingCount, setTrackingCount] = useState<number>(0);
    const [localRegistrosCount, setLocalRegistrosCount] = useState<number>(0);
    const [localTransportesCount, setLocalTransportesCount] = useState<number>(0);

    const [searchTerm, setSearchTerm] = useState('');
    const [shipments, setShipments] = useState<Registro[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [tracking, setTracking] = useState<ShipmentHito[]>([]);
    const [loadingTracking, setLoadingTracking] = useState(false);
    const [editingHito, setEditingHito] = useState<ShipmentHito | null>(null);

    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [userInfo, setUserInfo] = useState<any>(null);

    // Obtener usuario de auth
    useEffect(() => {
        const fetchUser = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);

            // Obtener información del usuario desde la tabla usuarios
            if (user) {
                const { data: userData } = await supabase
                    .from('usuarios')
                    .select('*')
                    .eq('auth_user_id', user.id)
                    .single();
                setUserInfo(userData || {
                    nombre: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario',
                    email: user.email || ''
                });
            }
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

    // Cargar contadores cuando currentUser esté disponible
    useEffect(() => {
        const loadCounts = async () => {
            if (!currentUser) {
                setLocalRegistrosCount(0);
                setLocalTransportesCount(0);
                setTrackingCount(0);
                return;
            }

            try {
                const supabase = createClient();
                const isAdmin = currentUser.rol === 'admin';
                const clienteNombre = currentUser.cliente_nombre?.trim();
                const clientesAsignados = currentUser.clientes_asignados || [];

                // Contar registros
                let registrosQuery = supabase
                    .from('registros')
                    .select('*', { count: 'exact', head: true })
                    .is('deleted_at', null);

                if (!isAdmin) {
                    if (currentUser.rol === 'cliente' && clienteNombre) {
                        registrosQuery = registrosQuery.ilike('shipper', clienteNombre);
                    } else if (clientesAsignados.length > 0) {
                        registrosQuery = registrosQuery.in('shipper', clientesAsignados);
                    } else {
                        registrosQuery = registrosQuery.eq('id', 'NONE');
                    }
                }

                const { count: rCount, error: rError } = await registrosQuery;
                setLocalRegistrosCount(rError ? 0 : (rCount || 0));

                // Contar transportes
                let transportesQuery = supabase
                    .from('transportes')
                    .select('*', { count: 'exact', head: true })
                    .is('deleted_at', null);

                if (!isAdmin) {
                    if (currentUser.rol === 'cliente' && clienteNombre) {
                        transportesQuery = transportesQuery.eq('exportacion', clienteNombre);
                    } else if (clientesAsignados.length > 0) {
                        transportesQuery = transportesQuery.in('exportacion', clientesAsignados);
                    } else {
                        transportesQuery = transportesQuery.eq('id', 'NONE');
                    }
                }

                const { count: tCount, error: tError } = await transportesQuery;
                setLocalTransportesCount(tError ? 0 : (tCount || 0));

                // Contar registros con tracking (todos los registros no cancelados)
                let trackingQuery = supabase
                    .from('registros')
                    .select('*', { count: 'exact', head: true })
                    .is('deleted_at', null)
                    .neq('estado', 'CANCELADO');

                if (!isAdmin) {
                    if (currentUser.rol === 'cliente' && clienteNombre) {
                        trackingQuery = trackingQuery.ilike('shipper', clienteNombre);
                    } else if (clientesAsignados.length > 0) {
                        trackingQuery = trackingQuery.in('shipper', clientesAsignados);
                    } else {
                        trackingQuery = trackingQuery.eq('id', 'NONE');
                    }
                }

                const { count, error } = await trackingQuery;
                setTrackingCount(error ? 0 : (count || 0));
            } catch (error) {
                console.error('Error loading counts:', error);
                setLocalRegistrosCount(0);
                setLocalTransportesCount(0);
                setTrackingCount(0);
            }
        };

        loadCounts();
    }, [currentUser]);

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
                { label: 'Embarques', id: '/registros', icon: Anchor, counter: localRegistrosCount || registrosCount, tone: 'violet' as const },
                { label: 'Transportes', id: '/transportes', icon: Truck, counter: localTransportesCount || transportesCount, tone: 'sky' as const },
                { label: 'Documentos', id: '/documentos', icon: FileText },
                ...(currentUser && currentUser.rol !== 'cliente'
                  ? [{ label: 'Generar Documentos', id: '/generar-documentos', icon: FileCheck }]
                  : []),
                ...(isRodrigo
                  ? [{ label: 'Seguimiento Marítimo', id: '/dashboard/seguimiento', icon: Globe }]
                  : []),
                { label: 'Tracking Movs', id: '/dashboard/tracking', icon: Activity, isActive: true, counter: trackingCount, tone: 'emerald' as const },
                ...(isRodrigo
                    ? [
                        { label: 'Finanzas', id: '/finanzas', icon: DollarSign },
                        { label: 'Reportes', id: '/reportes', icon: BarChart3 },
                    ]
                    : []),
            ],
        },
        ...(isRodrigo
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
                setShowProfileModal={setShowProfileModal}
            />

            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Header */}
                <header className={`p-2 sm:p-3 border-b ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            {/* Botón Menu (Sidebar Toggle) */}
                            <button
                                onClick={() => isSidebarCollapsed ? setIsSidebarCollapsed(false) : setIsMobileMenuOpen(true)}
                                className={`p-2 border transition-colors ${theme === 'dark' ? 'hover:bg-slate-700 border-slate-700/60 text-slate-400' : 'hover:bg-gray-100 border-gray-300 text-gray-500'
                                    } ${!isSidebarCollapsed && 'lg:hidden'}`}
                            >
                                <Menu className="h-5 w-5" />
                            </button>
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
                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 border text-xs font-medium transition-colors ${isFiltersOpen || filters.estado || filters.shipper
                                        ? 'bg-sky-600 border-sky-500 text-white'
                                        : theme === 'dark'
                                            ? 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:border-sky-500'
                                            : 'bg-white border-gray-300 text-gray-700 hover:border-blue-400'
                                        }`}
                                >
                                    <Filter className="h-4 w-4" />
                                    <span className="hidden sm:inline">Filtros</span>
                                    {(filters.estado || filters.shipper) && (
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
                                                    className={`w-full p-2 text-sm border focus:outline-none focus:ring-1 ${theme === 'dark' ? 'bg-slate-800 border-slate-700/60 text-white focus:border-sky-500' : 'bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500'}`}
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
                                                    className={`w-full p-2 text-sm border focus:outline-none focus:ring-1 ${theme === 'dark' ? 'bg-slate-800 border-slate-700/60 text-white focus:border-sky-500' : 'bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500'}`}
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

                            {/* Botón de usuario */}
                            <div className="relative hidden sm:flex flex-shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setShowProfileModal(true)}
                                    className={`flex items-center gap-1.5 sm:gap-2 border ${theme === 'dark' ? 'border-slate-700/60 bg-slate-800/60 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-slate-200 hover:border-sky-500/60 hover:text-sky-200' : 'border-gray-300 bg-white px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-700 hover:border-blue-500 hover:text-blue-700'} transition`}
                                    aria-haspopup="dialog"
                                    title={currentUser?.nombre || user?.user_metadata?.full_name || user?.email || 'Usuario'}
                                >
                                    <UserIcon className="h-4 w-4 sm:h-4 sm:w-4 flex-shrink-0" />
                                    <span className="max-w-[100px] md:max-w-[160px] truncate font-medium text-xs sm:text-sm">
                                        {currentUser?.nombre || user?.user_metadata?.full_name || user?.email || 'Usuario'}
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

            {/* Modal de Edición */}
            {editingHito && (
                <MilestoneEditModal
                    hito={editingHito}
                    onClose={() => setEditingHito(null)}
                    onSave={handleUpdateHito}
                    theme={theme}
                />
            )}

            {/* Modal de Perfil */}
            {showProfileModal && userInfo && (
                <UserProfileModal
                    isOpen={showProfileModal}
                    onClose={() => setShowProfileModal(false)}
                    userInfo={userInfo}
                    onUserUpdate={(updatedUser) => {
                        setUserInfo(updatedUser);
                        if (currentUser) {
                            setCurrentUser({ ...currentUser, ...updatedUser });
                        }
                    }}
                />
            )}
        </div>
    );
}
