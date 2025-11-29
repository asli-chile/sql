import React, { useState } from 'react';
import { CheckCircle, AlertCircle, MoreVertical, Trash2, Download, ChevronDown } from 'lucide-react';
import { Registro } from '@/types/registros';
import { StoredDocument } from '@/types/documents';
import { DOCUMENT_TYPES } from './constants';
import { normalizeBooking } from '@/utils/documentUtils';

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
}: DocumentListProps) {
    const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
    return (
        <section className="rounded-3xl border border-slate-800/70 bg-slate-950/70 p-5 shadow-xl shadow-slate-950/30">
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-4">
                <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Seguimiento</p>
                    <h2 className="text-lg font-semibold text-white">Bookings con documentos pendientes</h2>
                </div>
                <span className="text-sm text-slate-400">
                    {pendingBookingsCount} booking{pendingBookingsCount === 1 ? '' : 's'} por completar
                </span>
            </div>
            {bookingsWithDocs.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-slate-700/70 bg-slate-950/40 px-4 py-6 text-center text-sm text-slate-400">
                    No encontramos bookings disponibles en esta temporada o con tus permisos.
                </div>
            ) : (
                <div className="mt-4 max-h-[560px] overflow-x-auto overflow-y-auto rounded-2xl border border-slate-800/60">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-900/60 text-xs uppercase tracking-wide text-slate-400">
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold sticky left-0 bg-slate-950 z-10">Booking</th>
                                <th className="px-4 py-3 text-left font-semibold">Nave</th>
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
                                        const IconComponent = type.icon;
                                        return (
                                            <th key={type.id} className="px-3 py-3 text-center font-semibold min-w-[140px]">
                                                <div className="flex flex-col items-center gap-1">
                                                    <IconComponent className="h-4 w-4" aria-hidden="true" />
                                                    <span className="text-[10px] leading-tight">{type.name}</span>
                                                </div>
                                            </th>
                                        );
                                    });
                                })()}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                            {bookingsWithDocs.map((row) => {
                                const isUploadingForThisBooking = uploadingBooking && row.bookingKey === normalizeBooking(uploadingBooking);
                                return (
                                    <tr key={row.bookingKey} className="hover:bg-slate-900/40">
                                        <td className="px-4 py-3 font-semibold text-white sticky left-0 bg-slate-950 z-10">
                                            {row.booking}
                                        </td>
                                        <td className="px-4 py-3 text-slate-300">
                                            {row.registro.naveInicial || '-'}
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
                                                    <td key={type.id} className="px-3 py-3">
                                                        <div className="flex flex-col items-center gap-1.5 min-w-[140px]">
                                                            {hasDoc ? (
                                                                <>
                                                                    <div className="flex flex-col items-center gap-1.5 relative">
                                                                        {docsForType.length === 1 ? (
                                                                            // Un solo archivo: descarga directa con opción de eliminar
                                                                            <div className="flex items-center gap-1.5 group/item">
                                                                                <div 
                                                                                    className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition"
                                                                                    onClick={() => {
                                                                                        if (!downloadUrlLoading && !isDeleting) {
                                                                                            handleDownload(docsForType[0]);
                                                                                        }
                                                                                    }}
                                                                                    title={'Click para descargar' + (isAdmin ? ' | Click derecho para más opciones' : '')}
                                                                                >
                                                                                    {downloadUrlLoading === docsForType[0]?.path ? (
                                                                                        <div className="h-4 w-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                                                                                    ) : isDeleting === docsForType[0]?.path ? (
                                                                                        <div className="h-4 w-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                                                                                    ) : (
                                                                                        <CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0" aria-hidden="true" />
                                                                                    )}
                                                                                    <span className="text-[10px] text-emerald-400 font-semibold">
                                                                                        {downloadUrlLoading === docsForType[0]?.path 
                                                                                            ? 'Descargando...' 
                                                                                            : isDeleting === docsForType[0]?.path
                                                                                            ? 'Eliminando...'
                                                                                            : 'Subido'}
                                                                                    </span>
                                                                                    {!downloadUrlLoading && !isDeleting && (
                                                                                        <Download className="h-3 w-3 text-emerald-300 opacity-0 group-hover/item:opacity-100 transition" aria-hidden="true" />
                                                                                    )}
                                                                                </div>
                                                                                {isAdmin && (
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            if (!isDeleting && !downloadUrlLoading) {
                                                                                                if (confirm(`¿Estás seguro de que deseas eliminar "${docsForType[0].name}"?\n\nEl documento se moverá a la papelera y se eliminará permanentemente después de 7 días.`)) {
                                                                                                    handleDeleteDocument(docsForType[0]);
                                                                                                }
                                                                                            }
                                                                                        }}
                                                                                        onContextMenu={(e) => {
                                                                                            if (isAdmin) {
                                                                                                e.preventDefault();
                                                                                                setContextMenu({
                                                                                                    doc: docsForType[0],
                                                                                                    x: e.clientX,
                                                                                                    y: e.clientY,
                                                                                                });
                                                                                            }
                                                                                        }}
                                                                                        disabled={isDeleting === docsForType[0]?.path || downloadUrlLoading === docsForType[0]?.path}
                                                                                        className="p-1 text-red-400 hover:text-red-300 hover:bg-slate-800/50 rounded disabled:opacity-50 disabled:cursor-not-allowed transition opacity-0 group-hover/item:opacity-100"
                                                                                        title="Eliminar documento"
                                                                                    >
                                                                                        {isDeleting === docsForType[0]?.path ? (
                                                                                            <div className="h-3 w-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                                                                                        ) : (
                                                                                            <Trash2 className="h-3 w-3" />
                                                                                        )}
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        ) : (
                                                                            // Múltiples archivos: menú desplegable
                                                                            <div className="flex flex-col items-center gap-1.5 w-full">
                                                                                <div className="flex items-center gap-1.5">
                                                                                    <CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0" aria-hidden="true" />
                                                                                    <span className="text-[10px] text-emerald-400 font-semibold">
                                                                                        Subido
                                                                                    </span>
                                                                                    <span className="text-[9px] text-emerald-300/70">
                                                                                        ({docsForType.length})
                                                                                    </span>
                                                                                </div>
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
                                                                                    className="flex items-center gap-1 text-[9px] text-sky-400 hover:text-sky-300 transition"
                                                                                    title="Ver archivos disponibles"
                                                                                >
                                                                                    <span>Ver archivos</span>
                                                                                    <ChevronDown className={`h-3 w-3 transition-transform ${expandedFiles.has(`${row.bookingKey}-${type.id}`) ? 'rotate-180' : ''}`} />
                                                                                </button>
                                                                                {expandedFiles.has(`${row.bookingKey}-${type.id}`) && (
                                                                                    <div className="absolute top-full mt-1 z-20 bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-2 min-w-[200px] max-h-[200px] overflow-y-auto">
                                                                                        <div className="flex flex-col gap-1">
                                                                                            {docsForType.map((doc, idx) => (
                                                                                                <div
                                                                                                    key={doc.path}
                                                                                                    className="flex items-center gap-1 group/file"
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
                                                                                                        className="flex items-center gap-2 px-2 py-1.5 text-left text-[10px] text-slate-300 hover:bg-slate-800 rounded disabled:opacity-50 disabled:cursor-not-allowed flex-1"
                                                                                                        title={doc.name}
                                                                                                    >
                                                                                                        {downloadUrlLoading === doc.path ? (
                                                                                                            <div className="h-3 w-3 border-2 border-sky-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                                                                                                        ) : (
                                                                                                            <Download className="h-3 w-3 text-sky-400 opacity-0 group-hover/file:opacity-100 transition flex-shrink-0" />
                                                                                                        )}
                                                                                                        <span className="truncate flex-1">
                                                                                                            {doc.name.length > 30 ? `${doc.name.substring(0, 27)}...` : doc.name}
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
                                                                                                            className="p-1.5 text-red-400 hover:text-red-300 hover:bg-slate-800 rounded disabled:opacity-50 disabled:cursor-not-allowed transition opacity-0 group-hover/file:opacity-100"
                                                                                                            title="Eliminar documento"
                                                                                                        >
                                                                                                            {isDeleting === doc.path ? (
                                                                                                                <div className="h-3 w-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                                                                                                            ) : (
                                                                                                                <Trash2 className="h-3 w-3" />
                                                                                                            )}
                                                                                                        </button>
                                                                                                    )}
                                                                                                </div>
                                                                                            ))}
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
                                                                                                className="flex items-center gap-2 px-2 py-1.5 text-left text-[10px] text-sky-400 hover:bg-slate-800 rounded disabled:opacity-50 disabled:cursor-not-allowed border-t border-slate-700 mt-1 pt-2"
                                                                                            >
                                                                                                <Download className="h-3 w-3" />
                                                                                                <span>Descargar todos</span>
                                                                                            </button>
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    {/* Botón para agregar más documentos - siempre visible si el usuario tiene permisos */}
                                                                    {canUpload && (
                                                                        <label
                                                                            htmlFor={`${uploadKey}-add`}
                                                                            className="flex items-center gap-1 cursor-pointer group mt-1"
                                                                        >
                                                                            <div className="relative">
                                                                                <AlertCircle className="h-3 w-3 text-amber-400 group-hover:text-amber-300 transition" aria-hidden="true" />
                                                                                {isUploading && (
                                                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                                                        <div className="h-2 w-2 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                            <span className="text-[9px] text-slate-400 group-hover:text-sky-300 transition">
                                                                                {numContenedores > docsForType.length 
                                                                                    ? `Agregar (${numContenedores - docsForType.length} más)`
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
                                                                        className="flex flex-col items-center gap-1 cursor-pointer group w-full"
                                                                    >
                                                                        <div className="relative">
                                                                            <AlertCircle className="h-5 w-5 text-amber-400 group-hover:text-amber-300 transition" aria-hidden="true" />
                                                                            {isUploading && (
                                                                                <div className="absolute inset-0 flex items-center justify-center">
                                                                                    <div className="h-3 w-3 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <span className="text-[10px] text-slate-400 group-hover:text-sky-300 transition">
                                                                            Subir {numContenedores > 1 ? `(${numContenedores})` : ''}
                                                                        </span>
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
                                                                    <div className="flex flex-col items-center gap-1">
                                                                        <AlertCircle className="h-5 w-5 text-slate-600" aria-hidden="true" />
                                                                        <span className="text-[9px] text-slate-500 italic">Solo lectura</span>
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
