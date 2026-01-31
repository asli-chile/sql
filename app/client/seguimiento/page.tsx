'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useUser } from '@/hooks/useUser';
import { createClient } from '@/lib/supabase-browser';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Anchor, Search, X, ChevronRight, RefreshCcw, Globe } from 'lucide-react';
import type { ActiveVessel } from '@/types/vessels';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { VesselDetailsModal } from '@/components/tracking/VesselDetailsModal';

const ActiveVesselsMap = dynamic(
    () => import('@/components/tracking/ActiveVesselsMap').then((mod) => mod.ActiveVesselsMap),
    { ssr: false }
);

export default function ClientSeguimiento() {
    const { currentUser } = useUser();
    const { theme } = useTheme();
    const router = useRouter();

    const [vessels, setVessels] = useState<ActiveVessel[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedVessel, setSelectedVessel] = useState<ActiveVessel | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [focusedVesselName, setFocusedVesselName] = useState<string | null>(null);
    const [clientBookings, setClientBookings] = useState<string[]>([]);

    useEffect(() => {
        const fetchClientData = async () => {
            if (!currentUser?.cliente_nombre) return;

            const supabase = createClient();

            // 1. Obtener los bookings del cliente
            const { data: registrosData } = await supabase
                .from('registros')
                .select('booking')
                .eq('shipper', currentUser.cliente_nombre)
                .is('deleted_at', null)
                .not('booking', 'is', null)
                .not('booking', 'eq', '');

            const bookings = (registrosData || []).map(r => r.booking);
            setClientBookings(bookings);

            // 2. Cargar buques activos
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
                const response = await fetch(`${apiUrl}/api/vessels/active`);
                if (response.ok) {
                    const data = await response.json();
                    const allVessels = data.vessels || [];

                    // 3. Filtrar buques que tengan al menos uno de los bookings del cliente
                    const filteredVessels = allVessels.filter((v: ActiveVessel) =>
                        v.bookings.some(b => bookings.includes(b))
                    );

                    setVessels(filteredVessels);
                }
            } catch (err) {
                console.error('Error loading vessels:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchClientData();
    }, [currentUser]);

    const filteredVessels = useMemo(() => {
        if (!searchTerm.trim()) return vessels;
        const term = searchTerm.toLowerCase();
        return vessels.filter(v =>
            v.vessel_name.toLowerCase().includes(term) ||
            v.destination?.toLowerCase().includes(term)
        );
    }, [vessels, searchTerm]);

    if (loading) {
        return <LoadingScreen message="Cargando mapa de seguimiento..." />;
    }

    return (
        <div className="relative h-full w-full flex flex-col overflow-hidden">
            {/* Header flotante */}
            <div className="absolute top-4 left-4 right-4 z-20 flex flex-col sm:flex-row gap-2 pointer-events-none">
                <div className="flex gap-2 pointer-events-auto">
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl border backdrop-blur-md ${theme === 'dark' ? 'bg-slate-900/80 border-slate-800 text-white' : 'bg-white/80 border-gray-200 text-gray-900 shadow-lg'}`}>
                        <Globe className="h-5 w-5 text-blue-600" />
                        <span className="font-bold text-sm hidden sm:inline">Seguimiento de Carga</span>
                        <span className="font-bold text-sm sm:hidden">Seguimiento</span>
                    </div>
                </div>

                <div className="flex-1 max-w-md pointer-events-auto">
                    <div className={`relative flex items-center p-1 rounded-2xl border backdrop-blur-md ${theme === 'dark' ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-gray-200 shadow-lg'}`}>
                        <Search className="h-4 w-4 text-gray-400 ml-3" />
                        <input
                            type="text"
                            placeholder="Buscar buque o destino..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full p-2 bg-transparent outline-none text-sm"
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full mr-1">
                                <X className="h-4 w-4 text-gray-400" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Mapa */}
            <div className="flex-1 relative">
                <ActiveVesselsMap
                    vessels={vessels}
                    focusedVesselName={focusedVesselName}
                    onVesselSelect={(v) => {
                        setSelectedVessel(v);
                        setIsModalOpen(true);
                    }}
                />

                {/* Lista lateral (Desktop) o Inferior (Mobile) */}
                <div className={`absolute bottom-20 left-4 right-4 sm:bottom-auto sm:top-24 sm:right-4 sm:left-auto sm:w-80 z-20 max-h-[40vh] sm:max-h-[60vh] overflow-y-auto rounded-2xl border backdrop-blur-md transition-all ${theme === 'dark' ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-gray-200 shadow-2xl'
                    }`}>
                    <div className="p-4 space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 px-1">Tus Buques en Tránsito ({filteredVessels.length})</h3>
                        {filteredVessels.length === 0 ? (
                            <p className="text-sm text-gray-500 italic p-2">No hay buques activos para tus embarques.</p>
                        ) : (
                            filteredVessels.map((v) => (
                                <div
                                    key={v.vessel_name}
                                    onClick={() => setFocusedVesselName(v.vessel_name)}
                                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${focusedVesselName === v.vessel_name
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                        : theme === 'dark' ? 'bg-slate-800 border-slate-700 hover:border-slate-600' : 'bg-gray-50 border-gray-100 hover:bg-gray-100'
                                        }`}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <Anchor className={`h-4 w-4 shrink-0 ${focusedVesselName === v.vessel_name ? 'text-blue-600' : 'text-gray-400'}`} />
                                        <div className="min-w-0">
                                            <p className="font-bold text-xs truncate">{v.vessel_name}</p>
                                            <p className="text-[10px] text-gray-500 truncate">{v.destination || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Modal de detalles */}
            {selectedVessel && (
                <VesselDetailsModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    vessel={selectedVessel}
                />
            )}
        </div>
    );
}
