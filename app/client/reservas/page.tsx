'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@/hooks/useUser';
import { createClient } from '@/lib/supabase-browser';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Send, AlertCircle, CheckCircle2, Calendar as CalendarIcon } from 'lucide-react';
import { Combobox } from '@/components/ui/Combobox';
import { useToast } from '@/hooks/useToast';
import { generateUniqueRefAsli } from '@/lib/ref-asli-utils';

export default function ClientReservas() {
    const { currentUser } = useUser();
    const { theme } = useTheme();
    const router = useRouter();
    const { success, error: showError } = useToast();

    const [loading, setLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    // Catálogos
    const [especies, setEspecies] = useState<string[]>([]);
    const [destinos, setDestinos] = useState<string[]>([]);
    const [temperaturas, setTemperaturas] = useState<string[]>([]);

    const [formData, setFormData] = useState({
        especie: '',
        cantidad: '1',
        destino: '',
        etd: '',
        temperatura: '',
        comentario: '',
    });

    useEffect(() => {
        const loadCatalogs = async () => {
            const supabase = createClient();

            // Cargar especies y destinos desde la tabla catalogos
            const { data: catalogosData } = await supabase
                .from('catalogos')
                .select('*')
                .in('categoria', ['especies', 'pols', 'depositos']); // Usamos pols/depositos como referencia si fuera necesario, pero destinos es mejor

            // Cargar destinos desde catalogos_destinos (nueva tabla)
            const { data: destinosData } = await supabase
                .from('catalogos_destinos')
                .select('nombre')
                .eq('activo', true)
                .order('nombre');

            if (destinosData) {
                setDestinos(destinosData.map(d => d.nombre));
            }

            if (catalogosData) {
                catalogosData.forEach(cat => {
                    if (cat.categoria === 'especies') {
                        const valores = Array.isArray(cat.valores) ? cat.valores : [];
                        setEspecies(valores);
                    }
                });
            }

            // Cargar temperaturas desde catalogos_condiciones
            const { data: condicionesData } = await supabase
                .from('catalogos_condiciones')
                .select('valor')
                .eq('tipo', 'temperatura')
                .eq('activo', true);

            if (condicionesData) {
                setTemperaturas(condicionesData.map(c => c.valor));
            }
        };

        loadCatalogs();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.especie || !formData.destino || !formData.etd) {
            showError('Por favor completa los campos obligatorios (Especie, Destino, ETD)');
            return;
        }

        setLoading(true);
        try {
            const supabase = createClient();

            // Generar un REF ASLI único
            const refAsli = await generateUniqueRefAsli();

            const newRecord = {
                ref_asli: refAsli,
                shipper: currentUser?.cliente_nombre || 'CLIENTE APP',
                especie: formData.especie,
                pod: formData.destino,
                etd: formData.etd,
                temperatura: formData.temperatura ? parseFloat(formData.temperatura) : null,
                comentario: `SOLICITUD DESDE APP: ${formData.comentario}`,
                estado: 'PENDIENTE',
                tipo_ingreso: 'NORMAL',
                created_by: currentUser?.id,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                // Campos por defecto
                ejecutivo: 'POR ASIGNAR',
                naviera: 'POR ASIGNAR',
                nave_inicial: 'POR ASIGNAR',
                pol: 'POR ASIGNAR',
                deposito: 'POR ASIGNAR',
                flete: 'POR ASIGNAR',
                contenedor: '',
                booking: '',
                temporada: '2025-2026',
            };

            const { error: insertError } = await supabase
                .from('registros')
                .insert([newRecord]);

            if (insertError) throw insertError;

            setIsSubmitted(true);
            success('Solicitud enviada correctamente');

            // Redirigir al dashboard después de 2 segundos
            setTimeout(() => {
                router.push('/client/dashboard');
            }, 2000);

        } catch (err: any) {
            console.error('Error submitting booking:', err);
            showError('Error al enviar la solicitud: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    if (isSubmitted) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-4">
                <div className="p-4 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
                    <CheckCircle2 className="h-16 w-16 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h1 className="text-2xl font-bold">¡Solicitud Enviada!</h1>
                <p className={theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}>
                    Tu solicitud de reserva ha sido recibida. El equipo de ASLI se pondrá en contacto contigo a la brevedad.
                </p>
                <p className="text-sm text-blue-600 font-medium">Redirigiendo al inicio...</p>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6 pb-20">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => router.back()}
                    className={`p-2 rounded-xl border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}
                >
                    <ChevronLeft className="h-5 w-5" />
                </button>
                <h1 className="text-xl font-bold">Nueva Solicitud de Reserva</h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className={`p-6 rounded-2xl border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200 shadow-sm'} space-y-4`}>

                    {/* Especie */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Especie *</label>
                        <Combobox
                            options={especies}
                            value={formData.especie}
                            onChange={(val) => setFormData({ ...formData, especie: val })}
                            placeholder="Selecciona especie"
                        />
                    </div>

                    {/* Destino */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Puerto de Destino (POD) *</label>
                        <Combobox
                            options={destinos}
                            value={formData.destino}
                            onChange={(val) => setFormData({ ...formData, destino: val })}
                            placeholder="Selecciona destino"
                        />
                    </div>

                    {/* ETD */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Fecha Estimada de Zarpe (ETD) *</label>
                        <div className="relative">
                            <input
                                type="date"
                                value={formData.etd}
                                onChange={(e) => setFormData({ ...formData, etd: e.target.value })}
                                className={`w-full p-3 rounded-xl border ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-200'} focus:ring-2 focus:ring-blue-500 outline-none transition-all`}
                            />
                        </div>
                    </div>

                    {/* Temperatura */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Temperatura (°C)</label>
                        <Combobox
                            options={temperaturas}
                            value={formData.temperatura}
                            onChange={(val) => setFormData({ ...formData, temperatura: val })}
                            placeholder="Selecciona temperatura"
                        />
                    </div>

                    {/* Comentarios */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Comentarios / Observaciones</label>
                        <textarea
                            value={formData.comentario}
                            onChange={(e) => setFormData({ ...formData, comentario: e.target.value })}
                            placeholder="Ej: Necesito early stacking, carga delicada..."
                            rows={4}
                            className={`w-full p-3 rounded-xl border ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-200'} focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none`}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800">
                    <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                        Al enviar esta solicitud, se notificará al equipo de coordinación de ASLI para procesar tu reserva.
                    </p>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white p-4 rounded-2xl font-bold text-lg transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98]"
                >
                    {loading ? (
                        <div className="h-6 w-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <>
                            <Send className="h-5 w-5" />
                            Enviar Solicitud
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}
