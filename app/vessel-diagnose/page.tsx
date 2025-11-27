'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function VesselDiagnosePage() {
    const searchParams = useSearchParams();
    const vesselName = searchParams.get('name') || 'MSC CARMELA';
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [syncing, setSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState<any>(null);
    const [testUpdating, setTestUpdating] = useState(false);
    const [testUpdateResult, setTestUpdateResult] = useState<any>(null);

    const handleSync = async () => {
        setSyncing(true);
        setSyncResult(null);
        try {
            const response = await fetch('/api/vessels/sync-missing-vessels', {
                method: 'POST',
            });
            const result = await response.json();
            setSyncResult(result);
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } catch (err: any) {
            setSyncResult({ error: err.message });
        } finally {
            setSyncing(false);
        }
    };

    const handleTestUpdate = async () => {
        setTestUpdating(true);
        setTestUpdateResult(null);
        try {
            const response = await fetch('/api/vessels/update-positions-test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    vesselNames: [vesselName]
                })
            });
            const result = await response.json();
            setTestUpdateResult(result);
            setTimeout(() => {
                window.location.reload();
            }, 3000);
        } catch (err: any) {
            setTestUpdateResult({ error: err.message });
        } finally {
            setTestUpdating(false);
        }
    };

    useEffect(() => {
        fetch(`/api/vessels/diagnose?name=${encodeURIComponent(vesselName)}`)
            .then(r => r.json())
            .then(data => {
                setData(data);
                setLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    }, [vesselName]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 text-white p-8">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-3xl font-bold mb-4">Diagnóstico de Nave</h1>
                    <p>Cargando...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-950 text-white p-8">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-3xl font-bold mb-4 text-red-400">Error</h1>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                <h1 className="text-3xl font-bold mb-4">Diagnóstico: {vesselName}</h1>

                {/* Resumen */}
                <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
                    <h2 className="text-xl font-semibold mb-4">Resumen</h2>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span className={data?.diagnosis?.in_registros ? 'text-green-400' : 'text-red-400'}>
                                {data?.diagnosis?.in_registros ? '✅' : '❌'}
                            </span>
                            <span>En tabla registros: {data?.registros?.found || 0} registros</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={data?.diagnosis?.in_active_registros ? 'text-green-400' : 'text-red-400'}>
                                {data?.diagnosis?.in_active_registros ? '✅' : '❌'}
                            </span>
                            <span>En registros activos: {data?.active_registros?.found || 0} registros</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={data?.diagnosis?.in_vessel_positions ? 'text-green-400' : 'text-red-400'}>
                                {data?.diagnosis?.in_vessel_positions ? '✅' : '❌'}
                            </span>
                            <span>En vessel_positions: {data?.vessel_positions?.found || 0} entradas</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={data?.diagnosis?.has_coordinates ? 'text-green-400' : 'text-red-400'}>
                                {data?.diagnosis?.has_coordinates ? '✅' : '❌'}
                            </span>
                            <span>Tiene coordenadas (lat/lon)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={data?.diagnosis?.has_imo_or_mmsi ? 'text-green-400' : 'text-red-400'}>
                                {data?.diagnosis?.has_imo_or_mmsi ? '✅' : '❌'}
                            </span>
                            <span>Tiene IMO o MMSI</span>
                        </div>
                    </div>

                    <div className="mt-6 p-4 rounded bg-slate-800 border-2 border-slate-700">
                        <div className="flex items-center gap-2">
                            <span className={data?.diagnosis?.should_appear_on_map ? 'text-green-400 text-2xl' : 'text-red-400 text-2xl'}>
                                {data?.diagnosis?.should_appear_on_map ? '✅' : '❌'}
                            </span>
                            <span className="text-lg font-semibold">
                                {data?.diagnosis?.should_appear_on_map ? 'DEBERÍA APARECER EN EL MAPA' : 'NO DEBERÍA APARECER EN EL MAPA'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Recomendaciones y Acciones */}
                <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
                    <h2 className="text-xl font-semibold mb-4">Recomendaciones</h2>
                    <ul className="space-y-2">
                        {data?.recommendations?.map((rec: string, i: number) => (
                            <li key={i} className="text-sm">{rec}</li>
                        ))}
                    </ul>

                    {/* Botones de acción */}
                    <div className="mt-6 space-y-4">
                        {/* Botón de sincronización */}
                        {!data?.diagnosis?.in_vessel_positions && (
                            <div>
                                <button
                                    onClick={handleSync}
                                    disabled={syncing}
                                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors w-full"
                                >
                                    {syncing ? 'Sincronizando...' : '🔄 Sincronizar Nave a vessel_positions'}
                                </button>

                                {syncResult && (
                                    <div className={`mt-4 p-4 rounded ${syncResult.error ? 'bg-red-900/50' : 'bg-green-900/50'}`}>
                                        <pre className="text-sm overflow-auto">
                                            {JSON.stringify(syncResult, null, 2)}
                                        </pre>
                                        {!syncResult.error && (
                                            <p className="mt-2 text-sm text-green-300">
                                                ✅ Recargando página en 2 segundos...
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Botón de actualización de prueba */}
                        {data?.diagnosis?.in_vessel_positions && data?.diagnosis?.has_imo_or_mmsi && (
                            <div>
                                <button
                                    onClick={handleTestUpdate}
                                    disabled={testUpdating}
                                    className="bg-orange-600 hover:bg-orange-700 disabled:bg-slate-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors w-full"
                                >
                                    {testUpdating ? 'Actualizando posición...' : '⚠️ PRUEBA: Actualizar Posición desde API AIS'}
                                </button>
                                <p className="mt-2 text-xs text-orange-300">
                                    ⚠️ Esta acción llama a la API AIS sin restricción de 24 horas. Consume créditos.
                                </p>

                                {testUpdateResult && (
                                    <div className={`mt-4 p-4 rounded ${testUpdateResult.error ? 'bg-red-900/50' : 'bg-green-900/50'}`}>
                                        <pre className="text-sm overflow-auto max-h-96">
                                            {JSON.stringify(testUpdateResult, null, 2)}
                                        </pre>
                                        {!testUpdateResult.error && testUpdateResult.updated?.length > 0 && (
                                            <p className="mt-2 text-sm text-green-300">
                                                ✅ Posición actualizada! Recargando en 3 segundos...
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Datos de vessel_positions */}
                {data?.vessel_positions?.data?.[0] && (
                    <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
                        <h2 className="text-xl font-semibold mb-4">Datos en vessel_positions</h2>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-slate-400">Nombre:</span>
                                <span className="ml-2">{data.vessel_positions.data[0].vessel_name}</span>
                            </div>
                            <div>
                                <span className="text-slate-400">IMO:</span>
                                <span className="ml-2">{data.vessel_positions.data[0].imo || 'No configurado'}</span>
                            </div>
                            <div>
                                <span className="text-slate-400">MMSI:</span>
                                <span className="ml-2">{data.vessel_positions.data[0].mmsi || 'No configurado'}</span>
                            </div>
                            <div>
                                <span className="text-slate-400">Latitud:</span>
                                <span className="ml-2">{data.vessel_positions.data[0].last_lat || 'NULL'}</span>
                            </div>
                            <div>
                                <span className="text-slate-400">Longitud:</span>
                                <span className="ml-2">{data.vessel_positions.data[0].last_lon || 'NULL'}</span>
                            </div>
                            <div>
                                <span className="text-slate-400">Última posición:</span>
                                <span className="ml-2">{data.vessel_positions.data[0].last_position_at || 'NULL'}</span>
                            </div>
                            <div>
                                <span className="text-slate-400">Última llamada API:</span>
                                <span className="ml-2">{data.vessel_positions.data[0].last_api_call_at || 'Nunca'}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* JSON completo */}
                <details className="bg-slate-900 rounded-lg p-6 border border-slate-800">
                    <summary className="text-xl font-semibold cursor-pointer">Ver JSON completo</summary>
                    <pre className="mt-4 text-xs overflow-auto bg-slate-950 p-4 rounded">
                        {JSON.stringify(data, null, 2)}
                    </pre>
                </details>
            </div>
        </div>
    );
}
