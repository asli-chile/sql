import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, MoreVertical, Trash2, Download, ChevronDown, Upload, FileText } from 'lucide-react';
import { Registro } from '@/types/registros';
import { StoredDocument } from '@/types/documents';
import { DOCUMENT_TYPES } from './constants';
import { normalizeBooking } from '@/utils/documentUtils';
import { useTheme } from '@/contexts/ThemeContext';

interface DocumentListProps {
    bookingsWithDocs: {
        booking: string;
        bookingKey: string;
        cliente: string;
        registro: Registro;
        docsByType: Record<string, StoredDocument[]>;
        hasPending: boolean;
        instructivoIndex: number | null;
    }[];
    pendingBookingsCount: number;
    uploadingBooking: string | null;
    uploadingType: string | null;
    downloadUrlLoading: string | null;
    isDeleting: string | null;
    isAdmin: boolean;
    isAdminOrEjecutivo: boolean;
    canUpload: boolean;
    handleDownload: (doc: StoredDocument) => void;
    handleDeleteDocument: (doc: StoredDocument) => void;
    handleUpload: (typeId: string, files: FileList | null, bookingOverride?: string) => Promise<void>;
    setContextMenu: (menu: { doc: StoredDocument; x: number; y: number } | null) => void;
    sortOrder: 'asc' | 'desc';
    setSortOrder: (order: 'asc' | 'desc') => void;
}

export function DocumentList({
    bookingsWithDocs,
    pendingBookingsCount,
    uploadingBooking,
    uploadingType,
    downloadUrlLoading,
    isDeleting,
    isAdmin,
    isAdminOrEjecutivo,
    canUpload,
    handleDownload,
    handleDeleteDocument,
    handleUpload,
    setContextMenu,
    sortOrder,
    setSortOrder,
}: DocumentListProps) {
    const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
    const { theme } = useTheme();

    useEffect(() => {
        if (expandedFiles.size === 0) return;
        const handleClickOutside = () => {
            setExpandedFiles(new Set());
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [expandedFiles]);
    
    const getSectionStyles = () => theme === 'dark' 
        ? "rounded-xl border border-slate-800 bg-slate-950 p-3 shadow-xl shadow-slate-950/30"
        : "rounded-xl border border-gray-200 bg-white p-3 shadow-lg shadow-gray-100";
    
    const getBorderStyles = () => theme === 'dark'
        ? "border-slate-800/60"
        : "border-gray-200";
    
    const getTextStyles = () => theme === 'dark'
        ? "text-white"
        : "text-gray-900";
    
    const getTextSecondaryStyles = () => theme === 'dark'
        ? "text-slate-400"
        : "text-gray-600";
    
    const getCellBgStyles = () => theme === 'dark'
        ? "bg-slate-950"
        : "bg-white";
    
    const getTableHeaderStyles = () => theme === 'dark'
        ? "bg-slate-900 text-slate-300"
        : "bg-gray-50 text-gray-700";
    
    const getRowHoverStyles = () => theme === 'dark'
        ? "hover:bg-slate-900 border-slate-800"
        : "hover:bg-gray-50 border-gray-200";

    const getDocumentTone = (fileName: string) => {
        const lowerName = fileName.toLowerCase();
        const isPdf = lowerName.endsWith('.pdf');
        const isExcel = lowerName.endsWith('.xls') || lowerName.endsWith('.xlsx');

        if (isPdf) {
            return {
                button: theme === 'dark'
                    ? 'text-red-300 hover:text-red-200 hover:bg-red-500/20 border border-red-500/30 hover:border-red-400/50'
                    : 'text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-300 hover:border-red-400',
                icon: theme === 'dark' ? 'text-red-400' : 'text-red-600',
            };
        }

        if (isExcel) {
            return {
                button: theme === 'dark'
                    ? 'text-emerald-300 hover:text-emerald-200 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-400/50'
                    : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border border-emerald-300 hover:border-emerald-400',
                icon: theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600',
            };
        }

        return {
            button: theme === 'dark'
                ? 'text-sky-300 hover:text-sky-200 hover:bg-sky-500/20 border border-sky-500/30 hover:border-sky-400/50'
                : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-blue-300 hover:border-blue-400',
            icon: theme === 'dark' ? 'text-sky-400' : 'text-blue-600',
        };
    };
    
    return (
        <section className={`${getSectionStyles()} ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'} flex flex-col h-full overflow-hidden`}>
            <div className={`flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between ${theme === 'dark' ? 'border-b border-slate-700' : 'border-b border-gray-200'} pb-2.5 mb-2.5 flex-shrink-0`}>
                <div>
                    <h2 className={`text-xl font-bold ${getTextStyles()}`}>Bookings con documentos</h2>
                    <p className={`text-sm ${getTextSecondaryStyles()} mt-0.5`}>Gestiona los documentos de cada embarque</p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-2">
                        <label htmlFor="sort-order" className={`text-xs ${getTextSecondaryStyles()} font-medium`}>
                            Ordenar:
                        </label>
                        <select
                            id="sort-order"
                            value={sortOrder}
                            onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                            className={theme === 'dark' 
                                ? "rounded-lg border border-slate-700/80 bg-slate-900/80 px-3 py-1.5 text-xs text-white focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 transition-colors hover:border-slate-600"
                                : "rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors hover:border-gray-400"
                            }
                        >
                            <option value="asc">Más antiguo primero</option>
                            <option value="desc">Más reciente primero</option>
                        </select>
                    </div>
                    <div className={`flex items-center gap-2 rounded-lg ${theme === 'dark' ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-amber-50 border border-amber-200'} px-3 py-1.5`}>
                        <AlertCircle className={`h-4 w-4 ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`} />
                        <span className={`text-xs font-semibold ${theme === 'dark' ? 'text-amber-300' : 'text-amber-800'}`}>
                            {pendingBookingsCount} booking{pendingBookingsCount === 1 ? '' : 's'} pendiente{pendingBookingsCount === 1 ? '' : 's'}
                        </span>
                    </div>
                </div>
            </div>
            {bookingsWithDocs.length === 0 ? (
                <div className={`flex-1 flex items-center justify-center rounded-xl border ${theme === 'dark' ? 'border-slate-700/70 bg-gradient-to-br from-slate-950/60 to-slate-900/40' : 'border-gray-300 bg-gradient-to-br from-gray-50 to-white'} px-6 py-8 text-center backdrop-blur-sm`}>
                    <div>
                        <AlertCircle className={`h-8 w-8 ${theme === 'dark' ? 'text-slate-600' : 'text-gray-400'} mx-auto mb-3`} />
                        <p className={`text-sm ${getTextSecondaryStyles()} font-medium`}>No encontramos bookings disponibles</p>
                        <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'} mt-1`}>en esta temporada o con tus permisos.</p>
                    </div>
                </div>
            ) : (
                <div className={`flex-1 overflow-x-auto overflow-y-auto ${theme === 'dark' ? 'bg-slate-900 rounded-xl' : 'bg-white rounded-xl border border-gray-200'} shadow-sm min-h-0`}>
                    <table className="w-full">
                        <thead className={`${theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50'} sticky top-0 z-20`}>
                            <tr>
                                <th className={`px-2 py-2 text-center font-bold text-xs uppercase tracking-wider ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'} sticky left-0 ${getCellBgStyles()} z-10 w-[120px] min-w-[120px] max-w-[120px]`}>Booking</th>
                                <th className={`px-2 py-2 text-center font-bold text-xs uppercase tracking-wider ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'} sticky left-[120px] ${getCellBgStyles()} z-10 w-[160px] min-w-[160px] max-w-[160px]`}>Nave</th>
                                <th className={`px-3 py-2 text-center font-bold text-xs uppercase tracking-wider ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'} min-w-[180px]`}>Contenedor</th>
                                {(() => {
                                    // Reordenar: Instructivo primero, Factura Comercial y DUS al final
                                    const instructivoType = DOCUMENT_TYPES.find(t => t.id === 'instructivo-embarque');
                                    const facturaComercialType = DOCUMENT_TYPES.find(t => t.id === 'factura-comercial');
                                    const dusType = DOCUMENT_TYPES.find(t => t.id === 'documentos-aga');
                                    const otherTypes = DOCUMENT_TYPES.filter(t => t.id !== 'instructivo-embarque' && t.id !== 'factura-comercial' && t.id !== 'documentos-aga');
                                    const orderedTypes = [
                                        ...(instructivoType ? [instructivoType] : []),
                                        ...otherTypes,
                                        ...(facturaComercialType ? [facturaComercialType] : []),
                                        ...(dusType ? [dusType] : [])
                                    ];

                                    return orderedTypes.map((type) => {
                                        const IconComponent = type.icon;
                                        return (
                                            <th key={type.id} className={`px-2 py-2 text-center font-bold text-xs uppercase tracking-wider ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'} min-w-[120px]`}>
                                                <div className="flex flex-col items-center gap-1">
                                                    <IconComponent className={`h-4 w-4 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`} aria-hidden="true" />
                                                    <span className="text-[10px] leading-tight font-medium">{type.name}</span>
                                                </div>
                                            </th>
                                        );
                                    });
                                })()}
                            </tr>
                        </thead>
                        <tbody className={theme === 'dark' ? 'divide-y divide-slate-700/30' : 'divide-y divide-gray-100'}>
                            {bookingsWithDocs.map((row) => {
                                const isUploadingForThisBooking = uploadingBooking && row.bookingKey === normalizeBooking(uploadingBooking);
                                return (
                                    <tr key={row.bookingKey} className={`${theme === 'dark' ? 'hover:bg-slate-900 border-b border-slate-800' : 'hover:bg-gray-50 border-b border-gray-100'} transition-colors group`}>
                                        <td className={`px-2 py-2 font-semibold text-center ${theme === 'dark' ? 'text-white' : 'text-gray-900'} sticky left-0 ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'} z-10 w-[120px] min-w-[120px] max-w-[120px]`}>
                                            <span className={`mx-auto inline-flex items-center justify-center px-2.5 py-0.5 rounded-md ${theme === 'dark' ? 'bg-blue-500/20 border border-blue-400/30 text-blue-300' : 'bg-blue-50 border border-blue-200 text-blue-700'} text-sm font-bold`}>
                                                {row.booking}
                                            </span>
                                        </td>
                                        <td className={`px-2 py-2 text-center ${theme === 'dark' ? 'text-slate-200' : 'text-gray-700'} text-sm sticky left-[120px] ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'} z-10 w-[160px] min-w-[160px] max-w-[160px]`}>
                                            {row.registro.naveInicial || <span className={theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}>-</span>}
                                        </td>
                                        <td className={`px-3 py-2 text-center ${theme === 'dark' ? 'text-slate-200' : 'text-gray-700'} text-sm min-w-[180px]`}>
                                            {Array.isArray(row.registro.contenedor) 
                                                ? row.registro.contenedor.join(', ') 
                                                : (row.registro.contenedor || <span className={theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}>-</span>)}
                                        </td>
                                        {(() => {
                                            // Reordenar: Instructivo primero, DUS al final
                                            const instructivoType = DOCUMENT_TYPES.find(t => t.id === 'instructivo-embarque');
                                            const dusType = DOCUMENT_TYPES.find(t => t.id === 'documentos-aga');
                                            const otherTypes = DOCUMENT_TYPES.filter(t => t.id !== 'instructivo-embarque' && t.id !== 'documentos-aga');
                                            const orderedTypes = [
                                                ...(instructivoType ? [instructivoType] : []),
                                                ...otherTypes,
                                                ...(dusType ? [dusType] : [])
                                            ];

                                            return orderedTypes.map((type) => {
                                                const docsForType = row.docsByType[type.id] ?? [];
                                                const hasDoc = docsForType.length > 0;
                                                const isUploading = isUploadingForThisBooking && uploadingType === type.id;
                                                const uploadKey = `upload-${row.bookingKey}-${type.id}`;

                                                // Obtener número de contenedores del registro
                                                const contenedores = Array.isArray(row.registro.contenedor)
                                                    ? row.registro.contenedor
                                                    : row.registro.contenedor ? [row.registro.contenedor] : [];
                                                const numContenedores = contenedores.length || 1;

                                                // canUpload ya viene como prop, verifica isAdminOrEjecutivo Y puede_subir = true

                                                return (
                                                    <td key={type.id} className="px-2 py-2">
                                                        <div className="flex flex-col items-center gap-1.5 min-w-[120px]">
                                                            {hasDoc ? (
                                                                <>
                                                                    <div className="flex flex-col items-center gap-2 relative w-full">
                                                                        {/* Siempre usar el mismo formato: badge de estado y botón para ver archivos */}
                                                                        <div className="flex flex-col items-center gap-1 w-full">
                                                                            {/* Badge de estado */}
                                                                            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${theme === 'dark' ? 'bg-emerald-500/15 border border-emerald-500/40' : 'bg-emerald-50 border border-emerald-300'} w-full`}>
                                                                                <CheckCircle className={`h-3.5 w-3.5 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'} flex-shrink-0`} aria-hidden="true" />
                                                                                <span className={`text-xs ${theme === 'dark' ? 'text-emerald-200' : 'text-emerald-800'} font-bold`}>
                                                                                    {docsForType.length} archivo{docsForType.length > 1 ? 's' : ''}
                                                                                </span>
                                                                            </div>
                                                                            {/* Botón para ver/ocultar archivos */}
                                                                            <button
                                                                                type="button"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    const menuKey = `${row.bookingKey}-${type.id}`;
                                                                                    const newExpanded = new Set(expandedFiles);
                                                                                    if (newExpanded.has(menuKey)) {
                                                                                        newExpanded.delete(menuKey);
                                                                                    } else {
                                                                                        newExpanded.add(menuKey);
                                                                                    }
                                                                                    setExpandedFiles(newExpanded);
                                                                                }}
                                                                                className={`flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium ${theme === 'dark' ? 'text-sky-300 hover:text-sky-200 hover:bg-sky-500/20 border border-sky-500/30 hover:border-sky-400/50' : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-blue-300 hover:border-blue-400'} rounded-md transition-all w-full`}
                                                                                title="Ver archivos disponibles"
                                                                            >
                                                                                <FileText className="h-3.5 w-3.5" />
                                                                                <span className="flex-1 text-left font-semibold">Ver archivos</span>
                                                                                <ChevronDown className={`h-3 w-3 transition-transform ${expandedFiles.has(`${row.bookingKey}-${type.id}`) ? 'rotate-180' : ''}`} />
                                                                            </button>
                                                                                {expandedFiles.has(`${row.bookingKey}-${type.id}`) && (
                                                                                    <div
                                                                                        onClick={(event) => event.stopPropagation()}
                                                                                        className={`absolute top-full mt-2 z-20 ${theme === 'dark' ? 'bg-slate-800 border border-slate-600' : 'bg-white border border-gray-300 shadow-xl'} rounded-xl shadow-2xl p-3 min-w-[280px] max-h-[300px] overflow-y-auto`}
                                                                                    >
                                                                                        <div className="flex flex-col gap-2.5">
                                                                                            <div className={`flex items-center justify-between mb-1 pb-2.5 border-b ${theme === 'dark' ? 'border-slate-600' : 'border-gray-200'}`}>
                                                                                                <span className={`text-sm font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-gray-800'}`}>Archivos disponibles</span>
                                                                                                <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'} font-medium`}>{docsForType.length} archivo{docsForType.length > 1 ? 's' : ''}</span>
                                                                                            </div>
                                                                                            {docsForType.map((doc, idx) => {
                                                                                                const tone = getDocumentTone(doc.name);
                                                                                                return (
                                                                                                <div
                                                                                                    key={doc.path}
                                                                                                    className={`flex items-center gap-2.5 group/file p-2.5 rounded-lg ${theme === 'dark' ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50'} transition-colors border ${theme === 'dark' ? 'border-slate-700/50' : 'border-gray-200'}`}
                                                                                                >
                                                                                                    <button
                                                                                                        type="button"
                                                                                                        onClick={(e) => {
                                                                                                            e.stopPropagation();
                                                                                                            if (!downloadUrlLoading && !isDeleting) {
                                                                                                                handleDownload(doc);
                                                                                                            }
                                                                                                        }}
                                                                                                        disabled={downloadUrlLoading === doc.path || isDeleting === doc.path}
                                                                                                        className={`flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium ${tone.button} rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex-1 transition-all shadow-sm`}
                                                                                                        title={`Descargar: ${doc.name}`}
                                                                                                    >
                                                                                                        {downloadUrlLoading === doc.path ? (
                                                                                                            <div className={`h-4 w-4 border-2 ${tone.icon} border-t-transparent rounded-full animate-spin flex-shrink-0`} />
                                                                                                        ) : (
                                                                                                            <Download className={`h-4 w-4 ${tone.icon} flex-shrink-0`} />
                                                                                                        )}
                                                                                                        <FileText className={`h-4 w-4 ${tone.icon} flex-shrink-0`} />
                                                                                                        <span className={`truncate flex-1 text-left ${theme === 'dark' ? 'text-slate-100' : 'text-gray-800'} font-medium`}>
                                                                                                            {doc.name.length > 35 ? `${doc.name.substring(0, 32)}...` : doc.name}
                                                                                                        </span>
                                                                                                    </button>
                                                                                                    {isAdmin && (
                                                                                                        <button
                                                                                                            type="button"
                                                                                                            onClick={(e) => {
                                                                                                                e.stopPropagation();
                                                                                                                if (!isDeleting && !downloadUrlLoading) {
                                                                                                                    if (confirm(`¿Estás seguro de que deseas eliminar "${doc.name}"?\n\nEl documento se moverá a la papelera y se eliminará permanentemente después de 7 días.`)) {
                                                                                                                        handleDeleteDocument(doc);
                                                                                                                    }
                                                                                                                }
                                                                                                            }}
                                                                                                            disabled={isDeleting === doc.path || downloadUrlLoading === doc.path}
                                                                                                            className={`p-2.5 ${theme === 'dark' ? 'text-red-400 hover:text-red-300 hover:bg-red-500/20 border border-red-500/30 hover:border-red-400/50' : 'text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-300 hover:border-red-400'} rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm`}
                                                                                                            title="Eliminar documento"
                                                                                                        >
                                                                                                            {isDeleting === doc.path ? (
                                                                                                                <div className={`h-4 w-4 border-2 ${theme === 'dark' ? 'border-red-400' : 'border-red-600'} border-t-transparent rounded-full animate-spin`} />
                                                                                                            ) : (
                                                                                                                <Trash2 className="h-4 w-4" />
                                                                                                            )}
                                                                                                        </button>
                                                                                                    )}
                                                                                                </div>
                                                                                            );
                                                                                            })}
                                                                                            {docsForType.length > 1 && (
                                                                                                <button
                                                                                                    type="button"
                                                                                                    onClick={(e) => {
                                                                                                        e.stopPropagation();
                                                                                                        // Descargar todos los archivos uno por uno
                                                                                                        docsForType.forEach((doc, idx) => {
                                                                                                            setTimeout(() => {
                                                                                                                handleDownload(doc);
                                                                                                            }, idx * 500);
                                                                                                        });
                                                                                                    }}
                                                                                                    disabled={!!downloadUrlLoading}
                                                                                                    className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-2"
                                                                                                    title="Descargar todos los archivos"
                                                                                                >
                                                                                                    <Download className="h-4 w-4" />
                                                                                                    <span>Descargar todos ({docsForType.length})</span>
                                                                                                </button>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                    </div>
                                                                    {/* Botón para agregar más documentos - siempre visible si el usuario tiene permisos */}
                                                                    {canUpload && (
                                                                        <label
                                                                            htmlFor={`${uploadKey}-add`}
                                                                            className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md ${theme === 'dark' ? 'bg-amber-500/15 border border-amber-500/40 hover:bg-amber-500/25 hover:border-amber-400/60' : 'bg-amber-50 border border-amber-300 hover:bg-amber-100 hover:border-amber-400'} cursor-pointer group transition-all w-full mt-0.5`}
                                                                            title={`Subir ${type.name}${numContenedores > docsForType.length ? ` (${numContenedores - docsForType.length} más)` : ''}`}
                                                                        >
                                                                            <div className="relative">
                                                                                {isUploading ? (
                                                                                    <div className={`h-3.5 w-3.5 border-2 ${theme === 'dark' ? 'border-amber-400' : 'border-amber-600'} border-t-transparent rounded-full animate-spin`} />
                                                                                ) : (
                                                                                    <Upload className={`h-3.5 w-3.5 ${theme === 'dark' ? 'text-amber-400 group-hover:text-amber-300' : 'text-amber-600 group-hover:text-amber-700'} transition`} aria-hidden="true" />
                                                                                )}
                                                                            </div>
                                                                            <span className={`text-xs ${theme === 'dark' ? 'text-amber-200' : 'text-amber-800'} font-bold`}>
                                                                                {isUploading 
                                                                                    ? 'Subiendo...' 
                                                                                    : numContenedores > docsForType.length 
                                                                                        ? `Agregar +${numContenedores - docsForType.length}` 
                                                                                        : 'Agregar más'}
                                                                            </span>
                                                                            <input
                                                                                id={`${uploadKey}-add`}
                                                                                type="file"
                                                                                className="sr-only"
                                                                                accept=".pdf,.xls,.xlsx"
                                                                                multiple
                                                                                onChange={(event) => {
                                                                                    void handleUpload(type.id, event.target.files, row.booking);
                                                                                    event.target.value = '';
                                                                                }}
                                                                            />
                                                                        </label>
                                                                    )}
                                                                </>
                                                            ) : (
                                                                canUpload ? (
                                                                    <label
                                                                        htmlFor={uploadKey}
                                                                        className={`flex flex-col items-center gap-2 px-3 py-2.5 rounded-lg ${theme === 'dark' ? 'bg-gradient-to-br from-amber-500/15 to-amber-600/10 border border-dashed border-amber-500/50 hover:border-amber-400/70 hover:from-amber-500/20 hover:to-amber-600/15' : 'bg-amber-50 border border-dashed border-amber-300 hover:border-amber-400 hover:bg-amber-100'} cursor-pointer group transition-all w-full`}
                                                                        title={`Subir ${type.name}${numContenedores > 1 ? ` (${numContenedores} archivo${numContenedores > 1 ? 's' : ''} requerido${numContenedores > 1 ? 's' : ''})` : ''}`}
                                                                    >
                                                                        <div className="relative">
                                                                            {isUploading ? (
                                                                                <div className={`h-6 w-6 border-2 ${theme === 'dark' ? 'border-amber-400' : 'border-amber-600'} border-t-transparent rounded-full animate-spin`} />
                                                                            ) : (
                                                                                <div className={`flex items-center justify-center h-8 w-8 rounded-full ${theme === 'dark' ? 'bg-amber-500/25 border border-amber-500/50 group-hover:bg-amber-500/35 group-hover:border-amber-400/70' : 'bg-amber-100 border border-amber-300 group-hover:bg-amber-200 group-hover:border-amber-400'} transition-all`}>
                                                                                    <Upload className={`h-4.5 w-4.5 ${theme === 'dark' ? 'text-amber-400 group-hover:text-amber-300' : 'text-amber-600 group-hover:text-amber-700'}`} aria-hidden="true" />
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex flex-col items-center gap-0.5">
                                                                            <span className={`text-xs font-bold ${theme === 'dark' ? 'text-amber-200 group-hover:text-amber-100' : 'text-amber-800 group-hover:text-amber-900'} transition`}>
                                                                                {isUploading ? 'Subiendo...' : 'Subir documento'}
                                                                            </span>
                                                                            {numContenedores > 1 && (
                                                                                <span className={`text-[10px] ${theme === 'dark' ? 'text-amber-300/80 group-hover:text-amber-200' : 'text-amber-700 group-hover:text-amber-800'} transition`}>
                                                                                    {numContenedores} req.
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <input
                                                                            id={uploadKey}
                                                                            type="file"
                                                                            className="sr-only"
                                                                            accept=".pdf,.xls,.xlsx"
                                                                            multiple
                                                                            onChange={(event) => {
                                                                                void handleUpload(type.id, event.target.files, row.booking);
                                                                                event.target.value = '';
                                                                            }}
                                                                        />
                                                                    </label>
                                                                ) : (
                                                                    // Usuario cliente sin permisos de subida - mostrar mensaje
                                                                    <div className="flex flex-col items-center gap-2 px-4 py-4 rounded-xl bg-slate-800/30 border border-slate-700/50 w-full">
                                                                        <AlertCircle className="h-6 w-6 text-slate-500" aria-hidden="true" />
                                                                        <span className="text-xs text-slate-400 font-medium">Solo lectura</span>
                                                                        <span className="text-[10px] text-slate-500 text-center">No tienes permisos para subir archivos</span>
                                                                    </div>
                                                                )
                                                            )}
                                                        </div>
                                                    </td>
                                                );
                                            });
                                        })()}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}
