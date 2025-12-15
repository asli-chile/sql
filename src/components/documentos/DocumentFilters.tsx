import React from 'react';
import { Search, ArrowLeft, CheckCircle, AlertCircle, FileText, TrendingUp, Clock, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Registro } from '@/types/registros';
import { StoredDocument } from '@/types/documents';
import { DOCUMENT_TYPES } from './constants';

interface DocumentFiltersProps {
    searchInput: string;
    setSearchInput: (value: string) => void;
    handleInspect: (bookingValue?: string, contenedorValue?: string) => void;
    inspectedBooking: string;
    inspectedContenedor: string;
    inspectedRegistro: Registro | null | undefined;
    inspectedDocsByType: Record<string, StoredDocument[]>;
    selectedTemporada: string | null;
    setSelectedTemporada: (value: string | null) => void;
    temporadasDisponibles: string[];
    totalUploadedDocs: number;
    facturasCount: number;
    registrosSinFacturaProformaCount: number;
    bookingOptions: string[];
    contenedorOptions: string[];
    selectedBookingFromSelect: string;
    setSelectedBookingFromSelect: (value: string) => void;
    selectedContenedorFromSelect: string;
    setSelectedContenedorFromSelect: (value: string) => void;
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
    registrosSinFacturaProformaCount,
    bookingOptions,
    contenedorOptions,
    selectedBookingFromSelect,
    setSelectedBookingFromSelect,
    selectedContenedorFromSelect,
    setSelectedContenedorFromSelect,
}: DocumentFiltersProps) {
    const router = useRouter();

    return (
        <>
            <header className="space-y-6">
                <button
                    onClick={() => router.push('/dashboard')}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-800/70 bg-slate-900/50 px-4 py-2.5 text-sm text-slate-300 transition-all hover:border-sky-500/60 hover:bg-sky-500/10 hover:text-sky-200 hover:shadow-lg hover:shadow-sky-900/20"
                >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Volver al panel
                </button>
            </header>
            <section className="space-y-4 rounded-3xl border border-slate-800/70 bg-slate-950/70 p-6 shadow-xl shadow-slate-950/30 backdrop-blur-xl">
                <div className="flex flex-col gap-4">
                    <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-slate-500 mb-1">Estado por booking o contenedor</p>
                        <h2 className="text-xl font-semibold text-white">Busca un booking o contenedor</h2>
                        <p className="text-sm text-slate-400 mt-1">Revisa el estado de los documentos de un embarque específico</p>
                    </div>
                    
                    {/* Desplegables de búsqueda */}
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="flex flex-col gap-2">
                            <label htmlFor="booking-select" className="text-xs font-semibold text-slate-400">
                                Buscar por Booking
                            </label>
                            <div className="relative">
                                <select
                                    id="booking-select"
                                    value={selectedBookingFromSelect}
                                    onChange={(event) => {
                                        const value = event.target.value;
                                        setSelectedBookingFromSelect(value);
                                        setSelectedContenedorFromSelect(''); // Limpiar contenedor cuando se selecciona booking
                                        if (value) {
                                            handleInspect(value, undefined);
                                        } else {
                                            // Limpiar búsqueda si se selecciona la opción vacía
                                            handleInspect('', undefined);
                                        }
                                    }}
                                    className="w-full rounded-xl border border-slate-800/70 bg-slate-900/80 px-4 py-2.5 text-sm text-white focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 transition-colors hover:border-slate-700"
                                >
                                    <option value="">Selecciona un booking</option>
                                    {bookingOptions.map((booking) => (
                                        <option key={booking} value={booking}>
                                            {booking}
                                        </option>
                                    ))}
                                </select>
                                {selectedBookingFromSelect && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedBookingFromSelect('');
                                            handleInspect('', undefined);
                                        }}
                                        className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                        title="Limpiar selección"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label htmlFor="contenedor-select" className="text-xs font-semibold text-slate-400">
                                Buscar por Contenedor
                            </label>
                            <div className="relative">
                                <select
                                    id="contenedor-select"
                                    value={selectedContenedorFromSelect}
                                    onChange={(event) => {
                                        const value = event.target.value;
                                        setSelectedContenedorFromSelect(value);
                                        setSelectedBookingFromSelect(''); // Limpiar booking cuando se selecciona contenedor
                                        if (value) {
                                            handleInspect(undefined, value);
                                        } else {
                                            // Limpiar búsqueda si se selecciona la opción vacía
                                            handleInspect(undefined, '');
                                        }
                                    }}
                                    className="w-full rounded-xl border border-slate-800/70 bg-slate-900/80 px-4 py-2.5 text-sm text-white focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 transition-colors hover:border-slate-700"
                                >
                                    <option value="">Selecciona un contenedor</option>
                                    {contenedorOptions.map((contenedor) => (
                                        <option key={contenedor} value={contenedor}>
                                            {contenedor}
                                        </option>
                                    ))}
                                </select>
                                {selectedContenedorFromSelect && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedContenedorFromSelect('');
                                            handleInspect(undefined, '');
                                        }}
                                        className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                        title="Limpiar selección"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-1">
                            <label htmlFor="search-input" className="text-xs font-semibold text-slate-400">
                                O busca manualmente
                            </label>
                            <div className="relative flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" aria-hidden="true" />
                                    <input
                                        id="search-input"
                                        value={searchInput}
                                        onChange={(event) => {
                                            setSearchInput(event.target.value.toUpperCase());
                                            // Limpiar selects cuando se escribe manualmente
                                            if (event.target.value.trim()) {
                                                setSelectedBookingFromSelect('');
                                                setSelectedContenedorFromSelect('');
                                            }
                                        }}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter') {
                                                event.preventDefault();
                                                handleInspect();
                                            }
                                        }}
                                        placeholder="Ej. BK123456 o CONT1234567"
                                        className="w-full rounded-xl border border-slate-800/70 bg-slate-900/80 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 transition-colors hover:border-slate-700"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleInspect()}
                                    disabled={!searchInput.trim()}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-900/40 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-sky-900/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                                >
                                    <Search className="h-4 w-4" aria-hidden="true" />
                                    Buscar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {((inspectedBooking && inspectedBooking.trim()) || (inspectedContenedor && inspectedContenedor.trim())) && (
                    <div className="rounded-2xl border border-slate-800/70 bg-gradient-to-br from-slate-950/90 to-slate-900/50 p-5 backdrop-blur-sm">
                        {inspectedRegistro ? (
                            <div className="space-y-4">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="rounded-xl border border-slate-800/60 bg-slate-900/60 p-5 backdrop-blur-sm">
                                        <p className="text-xs uppercase tracking-[0.3em] text-slate-500 mb-3">Detalles del {inspectedBooking ? 'booking' : 'contenedor'}</p>
                                        <div className="space-y-2.5 text-sm">
                                            <div className="flex items-center justify-between py-1.5 border-b border-slate-800/50">
                                                <span className="text-slate-500 font-medium">Booking:</span>
                                                <span className="text-slate-200 font-semibold">{inspectedRegistro.booking || '-'}</span>
                                            </div>
                                            <div className="flex items-center justify-between py-1.5 border-b border-slate-800/50">
                                                <span className="text-slate-500 font-medium">Contenedor:</span>
                                                <span className="text-slate-200 font-semibold">{Array.isArray(inspectedRegistro.contenedor) ? inspectedRegistro.contenedor.join(', ') : (inspectedRegistro.contenedor || '-')}</span>
                                            </div>
                                            <div className="flex items-center justify-between py-1.5 border-b border-slate-800/50">
                                                <span className="text-slate-500 font-medium">REF ASLI:</span>
                                                <span className="text-slate-200 font-semibold">{inspectedRegistro.refAsli || '-'}</span>
                                            </div>
                                            <div className="flex items-center justify-between py-1.5 border-b border-slate-800/50">
                                                <span className="text-slate-500 font-medium">Cliente:</span>
                                                <span className="text-slate-200 font-semibold">{inspectedRegistro.shipper || '-'}</span>
                                            </div>
                                            <div className="flex items-center justify-between py-1.5 border-b border-slate-800/50">
                                                <span className="text-slate-500 font-medium">Naviera:</span>
                                                <span className="text-slate-200 font-semibold">{inspectedRegistro.naviera || '-'}</span>
                                            </div>
                                            <div className="flex items-center justify-between py-1.5">
                                                <span className="text-slate-500 font-medium">Temporada:</span>
                                                <span className="text-slate-200 font-semibold">{inspectedRegistro.temporada || '-'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="rounded-xl border border-slate-800/60 bg-slate-900/60 p-5 backdrop-blur-sm">
                                        <p className="text-xs uppercase tracking-[0.3em] text-slate-500 mb-3">Estado de documentos</p>
                                        <ul className="space-y-2.5 text-xs">
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
                                                        <li key={type.id} className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg bg-slate-800/40 border border-slate-800/50">
                                                            <div className="flex items-center gap-2.5 flex-1">
                                                                {hasDoc ? (
                                                                    <CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0" aria-hidden="true" />
                                                                ) : (
                                                                    <AlertCircle className="h-4 w-4 text-amber-400 flex-shrink-0" aria-hidden="true" />
                                                                )}
                                                                <span className="text-sm text-slate-200 font-medium">{type.name}</span>
                                                            </div>
                                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${hasDoc ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                                                                {hasDoc ? 'Completado' : 'Pendiente'}
                                                            </span>
                                                        </li>
                                                    );
                                                });
                                            })()}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-amber-600/5 px-5 py-4 text-sm text-amber-100 backdrop-blur-sm">
                                <AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0" aria-hidden="true" />
                                <span>No encontramos {inspectedBooking ? `el booking "${inspectedBooking}"` : `el contenedor "${inspectedContenedor}"`} en los registros visibles.</span>
                            </div>
                        )}
                    </div>
                )}
            </section>

            <section className="rounded-3xl border border-slate-800/70 bg-slate-950/70 p-6 shadow-xl shadow-slate-900/40 backdrop-blur-xl">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-sky-500/20 to-indigo-500/20 flex items-center justify-center border border-sky-500/30">
                                    <FileText className="h-5 w-5 text-sky-400" />
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Centro documental</p>
                                    <h1 className="text-2xl font-semibold text-white">Documentos de embarque</h1>
                                </div>
                            </div>
                            <p className="text-sm text-slate-400 max-w-2xl">
                                Sube archivos PDF o Excel para cada etapa: proforma, instructivo, packing, booking o BL. Nosotros los
                                guardamos con su etiqueta correspondiente.
                            </p>
                        </div>
                        <div className="flex flex-col gap-2 sm:min-w-[220px]">
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
                                className="rounded-xl border border-slate-800/70 bg-slate-900/80 px-4 py-2.5 text-sm text-white focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 transition-colors hover:border-slate-700"
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
                    <div className="mt-6 grid gap-4 text-xs sm:grid-cols-2 lg:grid-cols-3">
                        <div className="group rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-900/80 to-slate-950/80 p-5 transition-all hover:border-sky-500/50 hover:shadow-lg hover:shadow-sky-900/20">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Documentos cargados</p>
                                <FileText className="h-4 w-4 text-sky-400/60 group-hover:text-sky-400 transition-colors" />
                            </div>
                            <p className="text-3xl font-bold text-white">{totalUploadedDocs}</p>
                            <p className="mt-1 text-[10px] text-slate-500">Archivos en el sistema</p>
                        </div>
                        <div className="group rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-900/80 to-slate-950/80 p-5 transition-all hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-900/20">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Facturas generadas</p>
                                <TrendingUp className="h-4 w-4 text-emerald-400/60 group-hover:text-emerald-400 transition-colors" />
                            </div>
                            <p className="text-3xl font-bold text-white">{facturasCount}</p>
                            <p className="mt-1 text-[10px] text-slate-500">Facturas comerciales</p>
                        </div>
                        <div className="group rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-900/80 to-slate-950/80 p-5 transition-all hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-900/20">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Registros sin factura proforma</p>
                                <Clock className="h-4 w-4 text-amber-400/60 group-hover:text-amber-400 transition-colors" />
                            </div>
                            <p className="text-3xl font-bold text-white">{registrosSinFacturaProformaCount}</p>
                            <p className="mt-1 text-[10px] text-slate-500">Pendientes de proforma</p>
                        </div>
                    </div>
            </section>
        </>
    );
}
