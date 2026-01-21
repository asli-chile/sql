'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { X, Save, DollarSign, Truck, Ship, FileText, Anchor, AlertCircle, Users } from 'lucide-react';
import { CostosEmbarque } from '@/types/finanzas';
import { Registro } from '@/types/registros';
import { calcularCostoTotal } from '@/lib/finanzas-calculations';

interface CostosModalProps {
    isOpen: boolean;
    onClose: () => void;
    costo: Partial<CostosEmbarque>;
    registro: Registro;
    onSave: (costo: Partial<CostosEmbarque>) => Promise<void>;
}

// Sub-components moved outside to prevent re-renders and focus loss
const InputField = ({
    label,
    field,
    value,
    onChange,
    isDark,
    type = 'number',
    prefix = '$'
}: {
    label: string,
    field: keyof CostosEmbarque,
    value: any,
    onChange: (field: keyof CostosEmbarque, value: any) => void,
    isDark: boolean,
    type?: string,
    prefix?: string
}) => {
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (type === 'number') {
            onChange(field, val === '' ? null : parseFloat(val));
        } else {
            onChange(field, val);
        }
    };

    return (
        <div>
            <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                {label}
            </label>
            <div className="relative">
                {type === 'number' && prefix && (
                    <div className={`absolute left-3 top-1/2 transform -translate-y-1/2 text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                        {prefix}
                    </div>
                )}
                <input
                    type={type}
                    value={value === null || value === undefined ? '' : value}
                    onChange={handleInputChange}
                    className={`w-full ${type === 'number' && prefix ? 'pl-7' : 'pl-3'} pr-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isDark
                            ? 'border-slate-600 bg-slate-700 text-white placeholder-slate-400'
                            : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400'
                        }`}
                    placeholder={type === 'number' ? '0' : ''}
                />
            </div>
        </div>
    );
};

const SectionTitle = ({ title, icon: Icon, isDark }: { title: string, icon: any, isDark: boolean }) => (
    <div className={`flex items-center gap-2 pb-2 mb-4 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
        <Icon className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
        <h3 className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>{title}</h3>
    </div>
);

const TabButton = ({
    id,
    label,
    icon: Icon,
    activeTab,
    setActiveTab,
    isDark
}: {
    id: string,
    label: string,
    icon: any,
    activeTab: string,
    setActiveTab: (id: any) => void,
    isDark: boolean
}) => (
    <button
        onClick={() => setActiveTab(id)}
        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === id
                ? isDark
                    ? 'border-blue-500 text-blue-400'
                    : 'border-blue-600 text-blue-600'
                : isDark
                    ? 'border-transparent text-slate-400 hover:text-slate-200'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
    >
        <Icon className="w-4 h-4" />
        {label}
    </button>
);

export function CostosModal({ isOpen, onClose, costo: initialCosto, registro, onSave }: CostosModalProps) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [formData, setFormData] = useState<Partial<CostosEmbarque>>({});
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'detalle' | 'transporte' | 'coordinacion' | 'navieros' | 'otros'>('transporte');

    useEffect(() => {
        if (isOpen) {
            setFormData(initialCosto);
        }
    }, [isOpen, initialCosto]);

    const handleChange = (field: keyof CostosEmbarque, value: any) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await onSave(formData);
            onClose();
        } catch (error) {
            console.error('Error saving:', error);
            // Don't close modal on error so user can retry
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const totalCalculado = calcularCostoTotal(formData as CostosEmbarque);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                className={`rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-200'
                    }`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className={`flex items-center justify-between p-6 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                    <div>
                        <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            Detalle de Costos
                        </h2>
                        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                            Booking: <span className="font-mono font-medium">{registro.booking}</span> • Cliente: {registro.shipper}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-lg transition-colors ${isDark ? 'text-slate-400 hover:bg-slate-700 hover:text-white' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-900'
                            }`}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className={`flex overflow-x-auto px-6 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                    <TabButton id="detalle" label="Detalle Reserva" icon={FileText} activeTab={activeTab} setActiveTab={setActiveTab} isDark={isDark} />
                    <TabButton id="transporte" label="Transporte Terrestre" icon={Truck} activeTab={activeTab} setActiveTab={setActiveTab} isDark={isDark} />
                    <TabButton id="coordinacion" label="Coordinación" icon={Users} activeTab={activeTab} setActiveTab={setActiveTab} isDark={isDark} />
                    <TabButton id="navieros" label="Costos Navieros" icon={Anchor} activeTab={activeTab} setActiveTab={setActiveTab} isDark={isDark} />
                    <TabButton id="otros" label="Otros" icon={DollarSign} activeTab={activeTab} setActiveTab={setActiveTab} isDark={isDark} />
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'detalle' && (
                        <div className="space-y-6">
                            <SectionTitle title="Información de Reserva" icon={FileText} isDark={isDark} />
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {/* Read-only fields from Registro */}
                                <div>
                                    <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>IE (Ref. ASLI)</label>
                                    <div className={`px-3 py-1.5 text-sm rounded-lg border ${isDark ? 'bg-slate-900/50 border-slate-700 text-slate-300' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                                        {registro.refAsli || '-'}
                                    </div>
                                </div>
                                <div>
                                    <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>Naviera</label>
                                    <div className={`px-3 py-1.5 text-sm rounded-lg border ${isDark ? 'bg-slate-900/50 border-slate-700 text-slate-300' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                                        {registro.naviera || '-'}
                                    </div>
                                </div>
                                <div>
                                    <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>POL</label>
                                    <div className={`px-3 py-1.5 text-sm rounded-lg border ${isDark ? 'bg-slate-900/50 border-slate-700 text-slate-300' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                                        {registro.pol || '-'}
                                    </div>
                                </div>
                                <div>
                                    <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>Nave</label>
                                    <div className={`px-3 py-1.5 text-sm rounded-lg border ${isDark ? 'bg-slate-900/50 border-slate-700 text-slate-300' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                                        {registro.naveInicial || '-'}
                                    </div>
                                </div>
                                <div>
                                    <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>Contenedor</label>
                                    <div className={`px-3 py-1.5 text-sm rounded-lg border ${isDark ? 'bg-slate-900/50 border-slate-700 text-slate-300' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                                        {Array.isArray(registro.contenedor) ? registro.contenedor.join(', ') : registro.contenedor || '-'}
                                    </div>
                                </div>

                                {/* Editable SWB */}
                                <InputField label="SWB" field="swb" value={formData.swb} onChange={handleChange} isDark={isDark} type="text" prefix="" />
                            </div>
                        </div>
                    )}

                    {activeTab === 'transporte' && (
                        <div className="space-y-6">
                            <SectionTitle title="Transporte Terrestre" icon={Truck} isDark={isDark} />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InputField label="Flete" field="tt_flete" value={formData.tt_flete} onChange={handleChange} isDark={isDark} />
                                <InputField label="Sobre Estadía" field="tt_sobre_estadia" value={formData.tt_sobre_estadia} onChange={handleChange} isDark={isDark} />
                                <InputField label="Porteo" field="tt_porteo" value={formData.tt_porteo} onChange={handleChange} isDark={isDark} />
                                <InputField label="Almacenamiento" field="tt_almacenamiento" value={formData.tt_almacenamiento} onChange={handleChange} isDark={isDark} />
                            </div>
                        </div>
                    )}

                    {activeTab === 'coordinacion' && (
                        <div className="space-y-6">
                            <SectionTitle title="Coordinación" icon={Users} isDark={isDark} />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InputField label="Adm. Espacio Naviero" field="coord_adm_espacio" value={formData.coord_adm_espacio} onChange={handleChange} isDark={isDark} />
                                <InputField label="Comex" field="coord_comex" value={formData.coord_comex} onChange={handleChange} isDark={isDark} />
                                <InputField label="AGA" field="coord_aga" value={formData.coord_aga} onChange={handleChange} isDark={isDark} />
                            </div>
                        </div>
                    )}

                    {activeTab === 'navieros' && (
                        <div className="space-y-6">
                            <SectionTitle title="Costos Navieros" icon={Anchor} isDark={isDark} />
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <InputField label="Gate Out" field="nav_gate_out" value={formData.nav_gate_out} onChange={handleChange} isDark={isDark} />
                                <InputField label="Seguridad Contenedor" field="nav_seguridad_contenedor" value={formData.nav_seguridad_contenedor} onChange={handleChange} isDark={isDark} />
                                <InputField label="Matriz Fuera de Plazo" field="nav_matriz_fuera_plazo" value={formData.nav_matriz_fuera_plazo} onChange={handleChange} isDark={isDark} />
                                <InputField label="Correcciones" field="nav_correcciones" value={formData.nav_correcciones} onChange={handleChange} isDark={isDark} />
                                <InputField label="Extra Late" field="nav_extra_late" value={formData.nav_extra_late} onChange={handleChange} isDark={isDark} />
                                <InputField label="Telex Release" field="nav_telex_release" value={formData.nav_telex_release} onChange={handleChange} isDark={isDark} />
                                <InputField label="Courier" field="nav_courier" value={formData.nav_courier} onChange={handleChange} isDark={isDark} />
                                <InputField label="Pago SAG - CF Extra" field="nav_pago_sag_cf_extra" value={formData.nav_pago_sag_cf_extra} onChange={handleChange} isDark={isDark} />
                                <InputField label="Pago UCCO - CO Extra" field="nav_pago_ucco_co_extra" value={formData.nav_pago_ucco_co_extra} onChange={handleChange} isDark={isDark} />
                            </div>
                        </div>
                    )}

                    {activeTab === 'otros' && (
                        <div className="space-y-6">
                            <SectionTitle title="Otros Costos e Ingresos" icon={DollarSign} isDark={isDark} />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="col-span-full p-4 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
                                    <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">Resumen Financiero</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs text-blue-600 dark:text-blue-400">Total Costos Calculado</p>
                                            <p className="text-xl font-bold text-blue-900 dark:text-blue-100">${totalCalculado.toLocaleString('es-CL')}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-blue-600 dark:text-blue-400">Margen Estimado</p>
                                            <p className={`text-xl font-bold ${(formData.ingresos || 0) - totalCalculado >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                ${((formData.ingresos || 0) - totalCalculado).toLocaleString('es-CL')}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <InputField label="Ingresos Totales" field="ingresos" value={formData.ingresos} onChange={handleChange} isDark={isDark} />
                                <InputField label="Rebates" field="rebates" value={formData.rebates} onChange={handleChange} isDark={isDark} />
                                <InputField label="Contrato Forwarder" field="contrato_forwarder" value={formData.contrato_forwarder} onChange={handleChange} isDark={isDark} type="text" prefix="" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className={`flex items-center justify-between p-6 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                    <div className="flex flex-col">
                        <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Total Costos</span>
                        <span className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            ${totalCalculado.toLocaleString('es-CL')}
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className={`px-4 py-2 rounded-lg transition-colors ${isDark
                                    ? 'text-slate-300 hover:text-slate-200 hover:bg-slate-700'
                                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                                }`}
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-blue-500/20"
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    <span>Guardando...</span>
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    <span>Guardar Cambios</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
