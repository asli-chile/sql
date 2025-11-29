import React from 'react';
import { Search, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Registro } from '@/types/registros';
import { StoredDocument } from '@/types/documents';
import { DOCUMENT_TYPES } from './constants';

interface DocumentFiltersProps {
    searchInput: string;
    setSearchInput: (value: string) => void;
    handleInspect: () => void;
    inspectedBooking: string;
    inspectedContenedor: string;
    inspectedRegistro: Registro | null | undefined;
    inspectedDocsByType: Record<string, StoredDocument[]>;
    selectedTemporada: string | null;
    setSelectedTemporada: (value: string | null) => void;
    temporadasDisponibles: string[];
    totalUploadedDocs: number;
    facturasCount: number;
    registrosSinFacturaCount: number;
}

export function DocumentFilters({
    searchInput,
    setSearchInput,
    handleInspect,
    inspectedBooking,
    inspectedContenedor,
    inspectedRegistro,
    inspectedDocsByType,
    selectedTemporada,
    setSelectedTemporada,
    temporadasDisponibles,
    totalUploadedDocs,
    facturasCount,
    registrosSinFacturaCount,
}: DocumentFiltersProps) {
    const router = useRouter();

    return (
        <>
            <header className="space-y-6">
                <button
                    onClick={() => router.push('/dashboard')}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-800/70 px-4 py-2 text-sm text-slate-300 transition hover:border-sky-500/60 hover:text-white"
                >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Volver al panel
                </button>
            </header>
            <section className="space-y-4 rounded-3xl border border-slate-800/70 bg-slate-950/70 p-5 shadow-xl shadow-slate-950/30">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Estado por booking o contenedor</p>
                        <h2 className="text-lg font-semibold text-white">Busca un booking o contenedor y revisa sus documentos</h2>
                    </div>
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                        <input
                            value={searchInput}
                            onChange={(event) => setSearchInput(event.target.value.toUpperCase())}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    event.preventDefault();
                                    handleInspect();
                                }
                            }}
                            placeholder="Ej. BK123456 o CONT1234567"
                            className="flex-1 rounded-2xl border border-slate-800/70 bg-slate-950 px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                        />
                        <button
                            type="button"
                            onClick={handleInspect}
                            disabled={!searchInput.trim()}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-600/90 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-900/40 transition hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Search className="h-4 w-4" aria-hidden="true" />
                            Ver estado
                        </button>
                    </div>
                </div>

                {(inspectedBooking || inspectedContenedor) && (
                    <div className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4">
                        {inspectedRegistro ? (
                            <div className="space-y-4">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="rounded-2xl border border-slate-800/60 bg-slate-900/50 p-4">
                                        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Detalles del {inspectedBooking ? 'booking' : 'contenedor'}</p>
                                        <div className="mt-2 space-y-1 text-sm text-slate-300">
                                            <p><span className="text-slate-500">Booking:</span> {inspectedRegistro.booking || '-'}</p>
                                            <p><span className="text-slate-500">Contenedor:</span> {Array.isArray(inspectedRegistro.contenedor) ? inspectedRegistro.contenedor.join(', ') : (inspectedRegistro.contenedor || '-')}</p>
                                            <p><span className="text-slate-500">REF ASLI:</span> {inspectedRegistro.refAsli || '-'}</p>
                                            <p><span className="text-slate-500">Cliente:</span> {inspectedRegistro.shipper || '-'}</p>
                                            <p><span className="text-slate-500">Naviera:</span> {inspectedRegistro.naviera || '-'}</p>
                                            <p><span className="text-slate-500">Temporada:</span> {inspectedRegistro.temporada || '-'}</p>
                                        </div>
                                    </div>
                                    <div className="rounded-2xl border border-slate-800/60 bg-slate-900/50 p-4">
                                        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Documentos faltantes</p>
                                        <ul className="mt-2 space-y-2 text-xs text-slate-300">
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
                                                    const docsForType = inspectedDocsByType[type.id] ?? [];
                                                    const hasDoc = docsForType.length > 0;
                                                    return (
                                                        <li key={type.id} className="flex items-center gap-2">
                                                            {hasDoc ? (
                                                                <CheckCircle className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                                                            ) : (
                                                                <AlertCircle className="h-4 w-4 text-amber-400" aria-hidden="true" />
                                                            )}
                                                            <span className="text-sm text-slate-200">{type.name}</span>
                                                            <span className="text-xs text-slate-500">{hasDoc ? 'Completado' : 'Pendiente'}</span>
                                                        </li>
                                                    );
                                                });
                                            })()}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                                No encontramos {inspectedBooking ? `el booking "${inspectedBooking}"` : `el contenedor "${inspectedContenedor}"`} en los registros visibles.
                            </div>
                        )}
                    </div>
                )}
            </section>

            <section className="rounded-3xl border border-slate-800/70 bg-slate-950/70 p-6 shadow-xl shadow-slate-900/40">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Centro documental</p>
                            <h1 className="mt-2 text-3xl font-semibold text-white">Documentos de embarque</h1>
                            <p className="mt-2 text-sm text-slate-400">
                                Sube archivos PDF o Excel para cada etapa: proforma, instructivo, packing, booking o BL. Nosotros los
                                guardamos con su etiqueta correspondiente.
                            </p>
                        </div>
                        <div className="flex flex-col gap-2 sm:min-w-[200px]">
                            <label htmlFor="temporada-select" className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                                Temporada
                            </label>
                            <select
                                id="temporada-select"
                                value={selectedTemporada || ''}
                                onChange={(event) => {
                                    const value = event.target.value || null;
                                    setSelectedTemporada(value);
                                    // Actualizar URL sin recargar
                                    const params = new URLSearchParams(window.location.search);
                                    if (value) {
                                        params.set('temporada', value);
                                    } else {
                                        params.delete('temporada');
                                    }
                                    router.push(`/documentos?${params.toString()}`, { scroll: false });
                                }}
                                className="rounded-2xl border border-slate-800/70 bg-slate-950 px-4 py-2 text-sm text-white focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                            >
                                <option value="">Todas las temporadas</option>
                                {temporadasDisponibles.map((temporada) => (
                                    <option key={temporada} value={temporada}>
                                        Temporada {temporada}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="mt-6 grid gap-3 text-xs text-slate-400 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4">
                            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Documentos cargados</p>
                            <p className="mt-1 text-2xl font-semibold text-white">{totalUploadedDocs}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4">
                            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Facturas generadas</p>
                            <p className="mt-1 text-2xl font-semibold text-white">{facturasCount}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4">
                            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Registros sin factura</p>
                            <p className="mt-1 text-2xl font-semibold text-white">{registrosSinFacturaCount}</p>
                        </div>
                    </div>
            </section>
        </>
    );
}
