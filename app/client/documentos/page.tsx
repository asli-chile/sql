'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '@/hooks/useUser';
import { createClient } from '@/lib/supabase-browser';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'next/navigation';
import { FileText, Download, Search, Package, ChevronRight, File } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { normalizeBooking } from '@/utils/documentUtils';
import { Registro } from '@/types/registros';
import { convertSupabaseToApp } from '@/lib/migration-utils';

interface DocumentInfo {
    path: string;
    name: string;
    type: string;
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
    'booking': 'Reserva PDF',
    'instructivo-embarque': 'Instructivo',
    'guia-despacho': 'Guía de Despacho',
    'packing-list': 'Packing List',
    'factura-proforma': 'Proforma Invoice',
    'bl': 'BL / SWB / Telex',
    'factura-comercial': 'Factura SII',
    'dus': 'DUS Legalizado',
    'fullset': 'Full Set',
};

export default function ClientDocumentos() {
    const { currentUser } = useUser();
    const { theme } = useTheme();
    const { error: showError } = useToast();

    const [registros, setRegistros] = useState<Registro[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedBooking, setSelectedBooking] = useState<string | null>(null);
    const [bookingDocuments, setBookingDocuments] = useState<DocumentInfo[]>([]);
    const [loadingDocs, setLoadingDocs] = useState(false);

    useEffect(() => {
        const fetchClientRegistros = async () => {
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
                setRegistros((data || []).map(convertSupabaseToApp));
            }
            setLoading(false);
        };

        fetchClientRegistros();
    }, [currentUser]);

    const loadDocumentsForBooking = useCallback(async (booking: string) => {
        if (!booking) return;

        setLoadingDocs(true);
        setSelectedBooking(booking);

        try {
            const supabase = createClient();
            const normalizedBooking = normalizeBooking(booking);
            const bookingKey = normalizedBooking.replace(/\s+/g, '');
            const foundDocs: DocumentInfo[] = [];

            const docTypes = [
                'booking', 'instructivo-embarque', 'guia-despacho',
                'packing-list', 'factura-proforma', 'bl',
                'factura-comercial', 'dus', 'fullset'
            ];

            for (const type of docTypes) {
                const { data, error } = await supabase.storage
                    .from('documentos')
                    .list(type, {
                        limit: 100,
                        offset: 0,
                        sortBy: { column: 'name', order: 'desc' },
                    });

                if (data) {
                    // Buscar archivos que empiecen con el booking
                    const file = data.find(f => {
                        const separatorIndex = f.name.indexOf('__');
                        if (separatorIndex === -1) return false;
                        const fileBooking = normalizeBooking(decodeURIComponent(f.name.slice(0, separatorIndex))).replace(/\s+/g, '');
                        return fileBooking === bookingKey;
                    });

                    if (file) {
                        foundDocs.push({
                            path: `${type}/${file.name}`,
                            name: file.name,
                            type: type
                        });
                    }
                }
            }

            setBookingDocuments(foundDocs);
        } catch (err) {
            console.error('Error loading docs:', err);
            showError('Error al cargar los documentos');
        } finally {
            setLoadingDocs(false);
        }
    }, [showError]);

    const handleDownload = async (doc: DocumentInfo) => {
        try {
            const supabase = createClient();
            const { data, error } = await supabase.storage
                .from('documentos')
                .createSignedUrl(doc.path, 60);

            if (error || !data?.signedUrl) throw error;
            window.open(data.signedUrl, '_blank');
        } catch (err) {
            showError('No se pudo descargar el archivo');
        }
    };

    const filteredRegistros = registros.filter(r =>
        r.refAsli?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.booking?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.naveInicial?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto pb-20">
            <h1 className="text-2xl font-bold">Mis Documentos</h1>

            {/* Buscador */}
            <div className={`relative flex items-center p-2 rounded-2xl border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                <Search className="h-5 w-5 text-gray-400 ml-2" />
                <input
                    type="text"
                    placeholder="Buscar por REF, Booking o Nave..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full p-2 bg-transparent outline-none text-sm"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Lista de Embarques */}
                <div className="space-y-3">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Selecciona un Embarque</h2>
                    {filteredRegistros.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">No se encontraron embarques.</p>
                    ) : (
                        filteredRegistros.map((reg) => (
                            <div
                                key={reg.id}
                                onClick={() => loadDocumentsForBooking(reg.booking || '')}
                                className={`p-4 rounded-2xl border transition-all cursor-pointer ${selectedBooking === reg.booking
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                        : theme === 'dark' ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : 'bg-white border-gray-200 hover:shadow-md'
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Package className={`h-5 w-5 ${selectedBooking === reg.booking ? 'text-blue-600' : 'text-gray-400'}`} />
                                        <div>
                                            <p className="font-bold text-sm">{reg.refAsli}</p>
                                            <p className="text-xs text-gray-500">{reg.naveInicial} • {reg.booking}</p>
                                        </div>
                                    </div>
                                    <ChevronRight className={`h-4 w-4 ${selectedBooking === reg.booking ? 'text-blue-600' : 'text-gray-400'}`} />
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Lista de Documentos */}
                <div className="space-y-3">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Documentos Disponibles</h2>
                    {!selectedBooking ? (
                        <div className={`p-8 text-center rounded-2xl border border-dashed ${theme === 'dark' ? 'border-slate-800 text-slate-500' : 'border-gray-300 text-gray-500'}`}>
                            Selecciona un embarque para ver sus documentos.
                        </div>
                    ) : loadingDocs ? (
                        <div className="flex justify-center p-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : bookingDocuments.length === 0 ? (
                        <div className={`p-8 text-center rounded-2xl border border-dashed ${theme === 'dark' ? 'border-slate-800 text-slate-500' : 'border-gray-300 text-gray-500'}`}>
                            No hay documentos cargados para este embarque aún.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {bookingDocuments.map((doc, idx) => (
                                <div
                                    key={idx}
                                    className={`flex items-center justify-between p-4 rounded-2xl border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                            <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">{DOCUMENT_TYPE_LABELS[doc.type] || doc.type}</p>
                                            <p className="text-[10px] text-gray-500 truncate max-w-[150px]">{doc.name}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDownload(doc)}
                                        className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                                    >
                                        <Download className="h-5 w-5 text-blue-600" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
