import React from 'react';
import { Registro } from '@/types/registros';
import { ShipmentHito, MilestoneStatus } from '@/types/tracking';
import { CheckCircle2, Circle, XCircle, Clock, MapPin, Ship, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface MovementCardProps {
    registro: Registro;
    isSelected: boolean;
    onClick: () => void;
    theme: 'light' | 'dark';
}

export const MovementCard: React.FC<MovementCardProps> = ({ registro, isSelected, onClick, theme }) => {
    const contStr = Array.isArray(registro.contenedor) ? registro.contenedor.join(', ') : (registro.contenedor || 'Carga Suelta');
    return (
        <div
            onClick={onClick}
            className={`p-4 rounded-lg cursor-pointer transition-all duration-200 ${isSelected
                ? theme === 'dark'
                    ? 'border-2 border-[#00AEEF] bg-[#00AEEF]/15 ring-2 ring-[#00AEEF]/20'
                    : 'border-2 border-[#00AEEF] bg-[#00AEEF]/10 shadow-md'
                : theme === 'dark'
                    ? 'border border-slate-700/60 bg-slate-800/60 hover:border-[#00AEEF]/50 hover:bg-slate-800'
                    : 'border border-[#E8E8E8] bg-white hover:border-[#00AEEF]/50 hover:shadow-sm'
                }`}
        >
            <div className="flex justify-between items-start gap-2 mb-2">
                <span className={`text-sm font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-[#00AEEF]' : 'text-[#0078D4]'}`}>
                    {registro.booking || 'SIN BOOKING'}
                </span>
                <span className={`text-xs flex-shrink-0 ${theme === 'dark' ? 'text-slate-500' : 'text-[#6B6B6B]'}`}>
                    {registro.updatedAt ? format(new Date(registro.updatedAt), 'dd MMM HH:mm', { locale: es }) : ''}
                </span>
            </div>

            <h4 className={`text-sm font-semibold truncate ${theme === 'dark' ? 'text-slate-100' : 'text-[#1F1F1F]'}`}>
                {contStr}
            </h4>

            <p className={`text-xs mt-0.5 font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-[#6B6B6B]'}`}>
                Ref: {registro.refCliente || registro.refAsli}
            </p>

            {registro.shipper && (
                <p className={`text-xs mt-0.5 truncate ${theme === 'dark' ? 'text-slate-400' : 'text-[#6B6B6B]'}`}>
                    {registro.shipper}
                </p>
            )}

            <div className="mt-2.5 space-y-1">
                <div className="flex items-center gap-2 text-sm">
                    <MapPin className={`h-4 w-4 flex-shrink-0 ${theme === 'dark' ? 'text-slate-500' : 'text-[#6B6B6B]'}`} />
                    <span className={`truncate ${theme === 'dark' ? 'text-slate-400' : 'text-[#6B6B6B]'}`}>
                        {registro.pol} → {registro.pod}
                    </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                    <Ship className={`h-4 w-4 flex-shrink-0 ${theme === 'dark' ? 'text-slate-500' : 'text-[#6B6B6B]'}`} />
                    <span className={`truncate ${theme === 'dark' ? 'text-slate-400' : 'text-[#6B6B6B]'}`}>
                        {registro.naveInicial || '-'}
                    </span>
                </div>
            </div>
        </div>
    );
};

interface TimelineStepProps {
    hito: ShipmentHito;
    isLast: boolean;
    theme: 'light' | 'dark';
    canEdit?: boolean;
    onEdit?: (hito: ShipmentHito) => void;
    hideConnector?: boolean;
}

export const TimelineStep: React.FC<TimelineStepProps> = ({ hito, isLast, theme, canEdit, onEdit, hideConnector }) => {
    const isSi = hito.status === 'SI';
    const isNo = hito.status === 'NO';
    const isPendiente = hito.status === 'PENDIENTE';
    const shouldAllowEdit = canEdit && !hito.isAutomated;

    return (
        <div
            className={`relative flex gap-3 pb-3 transition-opacity ${shouldAllowEdit ? 'cursor-pointer hover:opacity-90' : ''}`}
            onClick={() => shouldAllowEdit && onEdit && onEdit(hito)}
        >
            {!isLast && !hideConnector && (
                <div className={`absolute left-[9px] top-5 w-[1.5px] h-full ${isSi
                    ? theme === 'dark' ? 'bg-[#0D5C2E]/40' : 'bg-[#D4F4DD]'
                    : theme === 'dark' ? 'bg-slate-700' : 'bg-[#E1E1E1]'
                    }`} />
            )}

            <div className="relative z-10 flex-shrink-0 mt-0">
                {isSi ? (
                    <CheckCircle2 className="h-5 w-5 text-[#0D5C2E]" />
                ) : isNo ? (
                    <XCircle className="h-5 w-5 text-[#A1260D]" />
                ) : (
                    <Clock className={`h-5 w-5 ${theme === 'dark' ? 'text-slate-500' : 'text-[#C0C0C0]'}`} />
                )}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex flex-row items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <h5 className={`text-sm font-semibold ${isSi
                            ? theme === 'dark' ? 'text-[#4EC9B0]' : 'text-[#0D5C2E]'
                            : isNo
                                ? 'text-[#A1260D]'
                                : theme === 'dark' ? 'text-slate-400' : 'text-[#6B6B6B]'
                            }`}>
                            {hito.label}
                        </h5>
                        {shouldAllowEdit && (
                            <span className="text-[10px] bg-[#00AEEF]/15 text-[#00AEEF] px-2 py-0.5 rounded uppercase font-medium">Editar</span>
                        )}
                        {hito.isAutomated && (
                            <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-medium ${theme === 'dark' ? 'bg-[#0D5C2E]/20 text-[#4EC9B0]' : 'bg-[#D4F4DD] text-[#0D5C2E]'}`}>Sincronizado</span>
                        )}
                    </div>
                    {hito.date && !isNaN(new Date(hito.date).getTime()) && (
                        <span className={`text-xs font-medium flex items-center gap-1.5 flex-shrink-0 ${theme === 'dark' ? 'text-slate-500' : 'text-[#6B6B6B]'}`}>
                            <Calendar className="h-3.5 w-3.5" />
                            {format(new Date(hito.date), "dd-MM-yy HH:mm", { locale: es })}
                        </span>
                    )}
                </div>

                {hito.observation && (
                    <p className={`mt-1 text-xs leading-snug line-clamp-2 ${theme === 'dark' ? 'text-slate-400' : 'text-[#6B6B6B]'}`}>
                        {hito.observation}
                    </p>
                )}

                {isPendiente && (
                    <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded ${theme === 'dark'
                        ? 'bg-slate-800/80 text-slate-500'
                        : 'bg-[#F5F5F5] text-[#6B6B6B]'
                        }`}>
                        A la espera de actualización
                    </span>
                )}
            </div>
        </div>
    );
};

interface MilestoneEditModalProps {
    hito: ShipmentHito;
    onClose: () => void;
    onSave: (status: MilestoneStatus, date: string, observation: string) => Promise<void>;
    theme: 'light' | 'dark';
}

export const MilestoneEditModal: React.FC<MilestoneEditModalProps> = ({ hito, onClose, onSave, theme }) => {
    const [status, setStatus] = React.useState<MilestoneStatus>(hito.status);
    const [date, setDate] = React.useState(() => {
        if (hito.date) {
            const d = new Date(hito.date);
            if (!isNaN(d.getTime())) return format(d, 'yyyy-MM-dd');
        }
        return format(new Date(), 'yyyy-MM-dd');
    });
    const [observation, setObservation] = React.useState(hito.observation || '');
    const [loading, setLoading] = React.useState(false);

    const handleSave = async () => {
        setLoading(true);
        try {
            await onSave(status, date, observation);
            onClose();
        } catch (error) {
            console.error('Error saving milestone:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
            <div
                className={`w-full max-w-md overflow-hidden border ${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-[#E1E1E1]'
                    }`}
                style={{ borderRadius: '4px' }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className={`p-4 border-b ${theme === 'dark' ? 'border-slate-700' : 'border-[#E1E1E1]'}`}>
                    <h3 className={`text-base font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-[#1F1F1F]'}`}>Actualizar: {hito.label}</h3>
                    <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-[#6B6B6B]'}`}>
                        Cambia el estado del hito operativo
                    </p>
                </div>

                <div className="p-4 space-y-4">
                    <div>
                        <label className={`block text-xs font-medium mb-1.5 ${theme === 'dark' ? 'text-slate-400' : 'text-[#6B6B6B]'}`}>
                            Estado
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {(['SI', 'NO', 'PENDIENTE'] as MilestoneStatus[]).map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setStatus(s)}
                                    className={`py-2 px-2 text-xs font-semibold border transition-colors ${status === s
                                        ? s === 'SI' ? 'bg-[#0D5C2E]/20 border-[#0D5C2E] text-[#4EC9B0]' :
                                            s === 'NO' ? 'bg-[#A1260D]/20 border-[#A1260D] text-[#A1260D]' :
                                                theme === 'dark' ? 'bg-slate-800 border-slate-600 text-slate-300' : 'bg-[#E1E1E1] border-[#6B6B6B] text-[#323130]'
                                        : theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-400 hover:border-[#00AEEF]/50' : 'bg-[#F5F5F5] border-[#E1E1E1] text-[#6B6B6B] hover:border-[#00AEEF]/50'
                                        }`}
                                    style={{ borderRadius: '4px' }}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className={`block text-xs font-medium mb-1.5 ${theme === 'dark' ? 'text-slate-400' : 'text-[#6B6B6B]'}`}>
                            Fecha del Evento
                        </label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className={`w-full p-2.5 border text-sm focus:outline-none focus:ring-1 ${theme === 'dark'
                                ? 'bg-slate-900 border-slate-700 text-slate-100 focus:border-[#00AEEF] focus:ring-[#00AEEF]/30'
                                : 'bg-white border-[#E1E1E1] text-[#323130] focus:border-[#00AEEF] focus:ring-[#00AEEF]/20'
                                }`}
                            style={{ borderRadius: '4px' }}
                        />
                    </div>

                    <div>
                        <label className={`block text-xs font-medium mb-1.5 ${theme === 'dark' ? 'text-slate-400' : 'text-[#6B6B6B]'}`}>
                            Observaciones (opcional)
                        </label>
                        <textarea
                            value={observation}
                            onChange={(e) => setObservation(e.target.value)}
                            rows={3}
                            placeholder="Detalles adicionales..."
                            className={`w-full p-2.5 border text-sm focus:outline-none focus:ring-1 resize-none ${theme === 'dark'
                                ? 'bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-[#00AEEF] focus:ring-[#00AEEF]/30'
                                : 'bg-white border-[#E1E1E1] text-[#323130] placeholder-[#6B6B6B] focus:border-[#00AEEF] focus:ring-[#00AEEF]/20'
                                }`}
                            style={{ borderRadius: '4px' }}
                        />
                    </div>
                </div>

                <div className={`p-4 flex gap-2 border-t ${theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-[#E1E1E1] bg-[#FAFAFA]'}`}>
                    <button
                        onClick={onClose}
                        className={`flex-1 py-2.5 text-sm font-medium border transition-colors ${theme === 'dark'
                            ? 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
                            : 'border-[#E1E1E1] bg-white text-[#323130] hover:bg-[#F3F3F3]'
                        }`}
                        style={{ borderRadius: '4px' }}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="flex-1 py-2.5 text-sm font-medium bg-[#00AEEF] border border-[#00AEEF] text-white hover:bg-[#0099CC] disabled:opacity-50 transition-colors"
                        style={{ borderRadius: '4px' }}
                    >
                        {loading ? 'Guardando...' : 'Guardar'}
                    </button>
                </div>
            </div>
        </div>
    );
};
