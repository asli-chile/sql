'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useUser } from '@/hooks/useUser';
import { createClient } from '@/lib/supabase-browser';
import { Ship, Package, Clock, CheckCircle2, AlertCircle, ChevronRight, PlusCircle } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'next/navigation';
import { Registro } from '@/types/registros';
import { convertSupabaseToApp } from '@/lib/migration-utils';

export default function ClientDashboard() {
    const { currentUser } = useUser();
    const { theme } = useTheme();
    const router = useRouter();
    const [registros, setRegistros] = useState<Registro[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchClientData = async () => {
            if (!currentUser?.cliente_nombre) return;

            const supabase = createClient();
            const { data, error } = await supabase
                .from('registros')
                .select('*')
                .eq('shipper', currentUser.cliente_nombre)
                .is('deleted_at', null)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching client records:', error);
            } else {
                const mappedData = (data || []).map(convertSupabaseToApp);
                setRegistros(mappedData);
            }
            setLoading(false);
        };

        fetchClientData();
    }, [currentUser]);

    const stats = useMemo(() => {
        const total = registros.length;
        const confirmados = registros.filter(r => r.estado === 'CONFIRMADO').length;
        const pendientes = registros.filter(r => r.estado === 'PENDIENTE').length;

        return { total, confirmados, pendientes };
    }, [registros]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
            {/* Bienvenida */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        Hola, {currentUser?.nombre}
                    </h1>
                    <p className={`${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                        Bienvenido a tu portal de gestión de carga.
                    </p>
                </div>
                <button
                    onClick={() => router.push('/client/reservas')}
                    className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-semibold transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                >
                    <PlusCircle className="h-5 w-5" />
                    Nueva Solicitud
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className={`p-4 rounded-2xl border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <Ship className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Total Embarques</span>
                    </div>
                    <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <div className={`p-4 rounded-2xl border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <span className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Confirmados</span>
                    </div>
                    <p className="text-2xl font-bold text-emerald-500">{stats.confirmados}</p>
                </div>
                <div className={`p-4 rounded-2xl border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                            <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <span className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>En Proceso</span>
                    </div>
                    <p className="text-2xl font-bold text-amber-500">{stats.pendientes}</p>
                </div>
            </div>

            {/* Recientes */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Embarques Recientes</h2>
                </div>

                <div className="space-y-3">
                    {registros.length === 0 ? (
                        <div className={`p-8 text-center rounded-2xl border border-dashed ${theme === 'dark' ? 'border-slate-800 text-slate-500' : 'border-gray-300 text-gray-500'}`}>
                            No tienes embarques registrados aún.
                        </div>
                    ) : (
                        registros.slice(0, 5).map((reg) => (
                            <div
                                key={reg.id}
                                className={`p-4 rounded-2xl border transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer ${theme === 'dark' ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : 'bg-white border-gray-200 shadow-sm hover:shadow-md'}`}
                            >
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={`p-2 rounded-lg flex-shrink-0 ${theme === 'dark' ? 'bg-slate-800' : 'bg-gray-100'}`}>
                                            <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold truncate">{reg.refAsli || 'Sin Referencia'}</p>
                                            <p className={`text-xs truncate ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                                                {reg.naveInicial} • {reg.booking}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${reg.estado === 'CONFIRMADO'
                                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                : reg.estado === 'CANCELADO'
                                                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                            }`}>
                                            {reg.estado}
                                        </span>
                                        <ChevronRight className="h-4 w-4 text-gray-400" />
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
