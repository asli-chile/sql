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
    User as UserIcon,
    Ship
} from 'lucide-react';
import { Registro } from '@/types/registros';
import { ShipmentHito } from '@/types/tracking';
import { searchShipments, getShipmentTracking, updateTrackingEvent } from '@/lib/tracking-service';
import { MovementCard, TimelineStep, MilestoneEditModal } from '@/components/tracking/TrackingComponents';
import { MilestoneStatus } from '@/types/tracking';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
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

    // Cargar lista inicial (respeta rol del usuario: admin/lector ven todo; ejecutivo sus clientes; usuario los que creó; cliente los de su empresa)
    useEffect(() => {
        const initFetch = async () => {
            setLoading(true);
            const data = await searchShipments('', currentUser ?? null);
            setShipments(data);
            if (data.length > 0) {
                setSelectedId(data[0].id || null);
            } else {
                setSelectedId(null);
            }
            setLoading(false);
        };
        initFetch();
    }, [currentUser]);

    // Búsqueda con debounce (respeta rol del usuario)
    useEffect(() => {
        const timer = setTimeout(async () => {
            setSearching(true);
            const data = await searchShipments(searchTerm, currentUser ?? null);
            setShipments(data);
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
    
    // Verificar si es superadmin (Hans o Rodrigo)
    const isSuperAdmin = useMemo(() => {
      const email = (currentUser?.email || '').toLowerCase();
      if (!email) {
        console.log('⚠️ No se encontró email del usuario en tracking:', { currentUser: currentUser?.email });
        return false;
      }
      const isSuperAdmin = email === 'rodrigo.caceres@asli.cl' || email === 'hans.vasquez@asli.cl';
      console.log('🔍 Verificando superadmin en tracking:', { email, isSuperAdmin });
      return isSuperAdmin;
    }, [currentUser]);
    
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
                ...(isSuperAdmin
                  ? [{ label: 'Seguimiento Marítimo', id: '/dashboard/seguimiento', icon: Globe }]
                  : []),
                { label: 'Tracking Movs', id: '/dashboard/tracking', icon: Activity, isActive: true, counter: trackingCount, tone: 'emerald' as const },
                ...(isSuperAdmin
                    ? [
                        { label: 'Finanzas', id: '/finanzas', icon: DollarSign },
                        { label: 'Reportes', id: '/reportes', icon: BarChart3 },
                    ]
                    : []),
                { label: 'Itinerario', id: '/itinerario', icon: Ship },
            ],
        },
        ...(isSuperAdmin
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
        <div className={`flex h-screen overflow-hidden ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-[#F5F5F5] text-[#323130]'}`}>
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
                {/* Header - Estilo moderno con blur */}
                <header className={`flex-shrink-0 sticky top-0 z-20 border-b backdrop-blur-sm ${theme === 'dark' ? 'border-slate-700/80 bg-slate-900/95' : 'border-[#E1E1E1] bg-white/95'}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => isSidebarCollapsed ? setIsSidebarCollapsed(false) : setIsMobileMenuOpen(true)}
                                className={`p-2 border transition-colors ${theme === 'dark' ? 'border-slate-700 hover:bg-slate-800 text-slate-400' : 'border-[#E1E1E1] hover:bg-[#F3F3F3] text-[#6B6B6B]'} ${!isSidebarCollapsed && 'lg:hidden'}`}
                                style={{ borderRadius: '4px' }}
                            >
                                <Menu className="h-5 w-5" />
                            </button>
                            <div>
                                <p className={`text-[10px] sm:text-[11px] uppercase tracking-[0.2em] ${theme === 'dark' ? 'text-slate-500' : 'text-[#6B6B6B]'}`}>Módulo Operativo</p>
                                <h1 className={`text-lg sm:text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-[#1F1F1F]'}`}>
                                    Tracking de Movimientos
                                </h1>
                                <p className={`text-[11px] sm:text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-[#6B6B6B]'}`}>
                                    Seguimiento en tiempo real por hito operativo
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-3 w-full sm:max-w-lg">
                            <div className="relative flex-1">
                                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none ${theme === 'dark' ? 'text-slate-500' : 'text-[#6B6B6B]'}`} />
                                <input
                                    type="text"
                                    placeholder="Buscar booking, contenedor, ref..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className={`w-full pl-10 pr-10 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 transition-all ${theme === 'dark'
                                        ? 'bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-[#00AEEF] focus:ring-[#00AEEF]/30'
                                        : 'bg-white border-[#E1E1E1] text-[#323130] placeholder-[#6B6B6B] focus:border-[#00AEEF] focus:ring-[#00AEEF]/20'
                                    }`}
                                />
                                {searching && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        <div className="h-4 w-4 border-2 border-[#00AEEF] border-t-transparent animate-spin" />
                                    </div>
                                )}
                            </div>

                            <div className="relative">
                                <button
                                    onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${isFiltersOpen || filters.estado || filters.shipper
                                        ? 'bg-[#00AEEF] border border-[#00AEEF] text-white shadow-sm'
                                        : theme === 'dark'
                                            ? 'border border-slate-700 bg-slate-900 text-slate-300 hover:border-[#00AEEF]/50'
                                            : 'border border-[#E1E1E1] bg-white text-[#323130] hover:border-[#00AEEF]/50 hover:shadow-sm'
                                    }`}
                                >
                                    <Filter className="h-4 w-4" />
                                    <span className="hidden sm:inline">Filtros</span>
                                    {(filters.estado || filters.shipper) && (
                                        <span className="flex h-2 w-2 bg-white" style={{ borderRadius: '50%' }} />
                                    )}
                                </button>

                                {isFiltersOpen && (
                                    <div className={`absolute right-0 mt-2 w-72 rounded-lg border z-50 p-4 shadow-lg ${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-[#E1E1E1] shadow-slate-200/60'}`}>
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className={`font-semibold text-sm ${theme === 'dark' ? 'text-white' : 'text-[#1F1F1F]'}`}>Filtros</h3>
                                            <button
                                                onClick={() => {
                                                    setFilters({ estado: '', shipper: '' });
                                                    setIsFiltersOpen(false);
                                                }}
                                                className="text-xs font-medium text-[#00AEEF] hover:text-[#0099CC]"
                                            >
                                                Limpiar
                                            </button>
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <label className={`block text-xs font-medium mb-1.5 ${theme === 'dark' ? 'text-slate-400' : 'text-[#6B6B6B]'}`}>Estado</label>
                                                <select
                                                    value={filters.estado}
                                                    onChange={(e) => setFilters({ ...filters, estado: e.target.value })}
                                                    className={`w-full p-2 text-sm border focus:outline-none focus:ring-1 ${theme === 'dark'
                                                        ? 'bg-slate-900 border-slate-700 text-slate-100 focus:border-[#00AEEF]'
                                                        : 'bg-white border-[#E1E1E1] text-[#323130] focus:border-[#00AEEF]'
                                                    }`}
                                                    style={{ borderRadius: '4px' }}
                                                >
                                                    <option value="">Todos</option>
                                                    {estadosPosibles.map(e => (
                                                        <option key={e} value={e}>{e}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className={`block text-xs font-medium mb-1.5 ${theme === 'dark' ? 'text-slate-400' : 'text-[#6B6B6B]'}`}>Shipper</label>
                                                <select
                                                    value={filters.shipper}
                                                    onChange={(e) => setFilters({ ...filters, shipper: e.target.value })}
                                                    className={`w-full p-2 text-sm border focus:outline-none focus:ring-1 ${theme === 'dark'
                                                        ? 'bg-slate-900 border-slate-700 text-slate-100 focus:border-[#00AEEF]'
                                                        : 'bg-white border-[#E1E1E1] text-[#323130] focus:border-[#00AEEF]'
                                                    }`}
                                                    style={{ borderRadius: '4px' }}
                                                >
                                                    <option value="">Todos</option>
                                                    {shippersUnicos.map(s => (
                                                        <option key={s} value={s}>{s}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={() => setShowProfileModal(true)}
                                className={`hidden sm:flex items-center gap-2 border px-3 py-1.5 text-xs font-medium transition-colors ${theme === 'dark'
                                    ? 'border-slate-700 bg-slate-900 text-slate-300 hover:border-[#00AEEF]/50'
                                    : 'border-[#E1E1E1] bg-white text-[#323130] hover:border-[#00AEEF]/50'
                                }`}
                                style={{ borderRadius: '4px' }}
                                title={currentUser?.nombre || user?.user_metadata?.full_name || user?.email || 'Usuario'}
                            >
                                <UserIcon className="h-4 w-4 flex-shrink-0" />
                                <span className="max-w-[140px] truncate">{currentUser?.nombre || user?.user_metadata?.full_name || user?.email || 'Usuario'}</span>
                            </button>
                        </div>
                    </div>
                </header>

                <div className="flex-1 flex overflow-hidden min-h-0">
                    {/* Lista Izquierda */}
                    <div className={`w-80 sm:w-[22rem] flex-shrink-0 flex flex-col overflow-hidden ${theme === 'dark' ? 'bg-slate-900/50' : 'bg-white'}`}>
                        <div className={`flex-shrink-0 px-4 py-3 border-b ${theme === 'dark' ? 'border-slate-700/60' : 'border-[#E1E1E1]'}`}>
                            <h3 className={`text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-[#6B6B6B]'}`}>
                                Movimientos
                            </h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {filteredShipments.length === 0 && !searching ? (
                                <div className={`text-center py-12 px-4 rounded-lg ${theme === 'dark' ? 'bg-slate-800/60' : 'bg-[#F5F5F5]'}`}>
                                    <Activity className={`h-10 w-10 mx-auto mb-3 block ${theme === 'dark' ? 'text-slate-500' : 'text-[#C0C0C0]'}`} />
                                    <p className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-[#6B6B6B]'}`}>No se encontraron movimientos</p>
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
                    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${theme === 'dark' ? 'bg-slate-950' : 'bg-[#F5F5F5]'}`}>
                        {selectedShipment ? (
                            <div className="flex-1 flex flex-col min-h-0 p-4 sm:p-5 overflow-y-auto">
                                <div className="w-full max-w-6xl mx-auto flex-1 flex flex-col min-h-0">
                                <div className={`flex-shrink-0 mb-4 p-4 sm:p-5 rounded-lg shadow-sm ${theme === 'dark' ? 'bg-slate-900/80 border border-slate-700/60' : 'bg-white border border-[#E8E8E8] shadow-slate-200/50'}`}>
                                    <div className="flex flex-wrap items-end gap-x-6 gap-y-2 mb-3">
                                        <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-slate-100' : 'text-[#1F1F1F]'}`}>{selectedShipment.booking}</h2>
                                        {selectedShipment.naviera && (
                                            <span className={`px-2.5 py-1 text-xs font-medium rounded-md ${theme === 'dark' ? 'bg-slate-800/80 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>{selectedShipment.naviera}</span>
                                        )}
                                        {selectedShipment.naveInicial && (
                                            <span className={`px-2.5 py-1 text-xs font-medium rounded-md ${theme === 'dark' ? 'bg-slate-800/80 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>{selectedShipment.naveInicial}</span>
                                        )}
                                        {selectedShipment.etd && (
                                            <span className={`px-2.5 py-1 text-xs font-medium rounded-md ${theme === 'dark' ? 'bg-slate-800/80 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>ETD: {format(new Date(selectedShipment.etd), 'dd MMM', { locale: es })}</span>
                                        )}
                                        {selectedShipment.eta && (
                                            <span className={`px-2.5 py-1 text-xs font-medium rounded-md ${theme === 'dark' ? 'bg-slate-800/80 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>ETA: {format(new Date(selectedShipment.eta), 'dd MMM', { locale: es })}</span>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-5 gap-y-2">
                                        <div>
                                            <p className={`text-xs font-medium mb-0.5 ${theme === 'dark' ? 'text-slate-500' : 'text-[#6B6B6B]'}`}>Cliente</p>
                                            <p className={`text-sm font-semibold truncate ${theme === 'dark' ? 'text-slate-200' : 'text-[#1F1F1F]'}`}>{selectedShipment.shipper || '-'}</p>
                                        </div>
                                        <div>
                                            <p className={`text-xs font-medium mb-0.5 ${theme === 'dark' ? 'text-slate-500' : 'text-[#6B6B6B]'}`}>Contenedor</p>
                                            <p className={`text-sm font-semibold truncate ${theme === 'dark' ? 'text-slate-200' : 'text-[#1F1F1F]'}`}>{Array.isArray(selectedShipment.contenedor) ? selectedShipment.contenedor.join(', ') : selectedShipment.contenedor || '-'}</p>
                                        </div>
                                        <div>
                                            <p className={`text-xs font-medium mb-0.5 ${theme === 'dark' ? 'text-slate-500' : 'text-[#6B6B6B]'}`}>Depósito</p>
                                            <p className={`text-sm font-semibold truncate ${theme === 'dark' ? 'text-slate-200' : 'text-[#1F1F1F]'}`}>{selectedShipment.deposito || '-'}</p>
                                        </div>
                                        <div>
                                            <p className={`text-xs font-medium mb-0.5 ${theme === 'dark' ? 'text-slate-500' : 'text-[#6B6B6B]'}`}>Ref / Especie</p>
                                            <p className={`text-sm font-semibold truncate ${theme === 'dark' ? 'text-slate-200' : 'text-[#1F1F1F]'}`}>{selectedShipment.refCliente || selectedShipment.refAsli || '-'} {selectedShipment.especie ? ` · ${selectedShipment.especie}` : ''}</p>
                                        </div>
                                        <div>
                                            <p className={`text-xs font-medium mb-0.5 ${theme === 'dark' ? 'text-slate-500' : 'text-[#6B6B6B]'}`}>Trayecto</p>
                                            <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-slate-200' : 'text-[#1F1F1F]'}`}>{selectedShipment.pol} → {selectedShipment.pod}</p>
                                        </div>
                                        <div>
                                            <p className={`text-xs font-medium mb-0.5 ${theme === 'dark' ? 'text-slate-500' : 'text-[#6B6B6B]'}`}>Estado</p>
                                            <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-slate-200' : 'text-[#1F1F1F]'}`}>{selectedShipment.estado}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className={`flex-1 min-h-0 p-4 sm:p-5 rounded-lg shadow-sm flex flex-col ${theme === 'dark' ? 'bg-slate-900/80 border border-slate-700/60' : 'bg-white border border-[#E8E8E8] shadow-slate-200/50'}`}>
                                    {loadingTracking ? (
                                        <div className="flex items-center justify-center flex-1">
                                            <div className="h-8 w-8 border-2 border-[#00AEEF] border-t-transparent animate-spin rounded-full" />
                                        </div>
                                    ) : (
                                        <div className="space-y-0">
                                            {tracking.map((hito, index) => (
                                                <TimelineStep
                                                    key={hito.milestone}
                                                    hito={hito}
                                                    isLast={index === tracking.length - 1}
                                                    theme={theme}
                                                    canEdit={isAdmin || isSuperAdmin}
                                                    onEdit={(h) => setEditingHito(h)}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                                <div className={`h-24 w-24 flex items-center justify-center mb-8 rounded-xl ${theme === 'dark' ? 'bg-slate-800/60' : 'bg-white shadow-sm border border-[#E8E8E8]'}`}>
                                    <Box className={`h-12 w-12 ${theme === 'dark' ? 'text-slate-500' : 'text-[#C0C0C0]'}`} />
                                </div>
                                <h3 className={`text-xl font-semibold mb-3 ${theme === 'dark' ? 'text-slate-100' : 'text-[#1F1F1F]'}`}>Selecciona un movimiento</h3>
                                <p className={`max-w-sm text-base ${theme === 'dark' ? 'text-slate-400' : 'text-[#6B6B6B]'}`}>
                                    Elige un embarque de la lista para ver su línea de tiempo.
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
