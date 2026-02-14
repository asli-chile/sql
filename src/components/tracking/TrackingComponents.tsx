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
    return (
        <div
            onClick={onClick}
            className={`p-3 border transition-all cursor-pointer mb-2 ${isSelected
                ? theme === 'dark'
                    ? 'border-sky-500 bg-sky-500/10'
                    : 'border-blue-500 bg-blue-50'
                : theme === 'dark'
                    ? 'border-slate-700/60 bg-slate-900/50 hover:border-slate-600'
                    : 'border-gray-300 bg-white hover:border-gray-400'
                }`}
        >
            <div className="flex justify-between items-start mb-2">
                <span className={`text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-sky-400' : 'text-blue-600'}`}>
                    {registro.booking || 'SIN BOOKING'}
                </span>
                <span className={`text-[10px] ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`}>
                    {registro.updatedAt ? format(new Date(registro.updatedAt), 'dd MMM HH:mm', { locale: es }) : ''}
                </span>
            </div>

            <h4 className={`text-xs font-semibold truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {registro.contenedor || 'Carga Suelta'}
            </h4>

            <p className={`text-[10px] mt-1 font-medium ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`}>
                Ref. Cliente: {registro.refCliente || registro.refAsli}
            </p>

            <div className="mt-2 space-y-1">
                <div className="flex items-center gap-2 text-xs">
                    <MapPin className="h-3 w-3 text-slate-400" />
                    <span className={theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}>
                        {registro.pol} → {registro.pod}
                    </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                    <Ship className="h-3 w-3 text-slate-400" />
                    <span className={theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}>
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
}

export const TimelineStep: React.FC<TimelineStepProps> = ({ hito, isLast, theme, canEdit, onEdit }) => {
    const isSi = hito.status === 'SI';
    const isNo = hito.status === 'NO';
    const isPendiente = hito.status === 'PENDIENTE';
    const shouldAllowEdit = canEdit && !hito.isAutomated;

    return (
        <div
            className={`relative flex gap-3 pb-4 transition-opacity ${shouldAllowEdit ? 'cursor-pointer hover:opacity-80' : ''}`}
            onClick={() => shouldAllowEdit && onEdit && onEdit(hito)}
        >
            {!isLast && (
                <div className={`absolute left-[9px] top-5 w-[1.5px] h-full ${isSi
                    ? theme === 'dark' ? 'bg-emerald-500/30' : 'bg-emerald-200'
                    : theme === 'dark' ? 'bg-slate-800' : 'bg-gray-100'
                    }`} />
            )}

            <div className="relative z-10 flex-shrink-0 mt-0.5">
                {isSi ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : isNo ? (
                    <XCircle className="h-5 w-5 text-rose-500" />
                ) : (
                    <Clock className={`h-5 w-5 ${theme === 'dark' ? 'text-slate-600' : 'text-gray-300'}`} />
                )}
            </div>

            <div className="flex-1">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                        <h5 className={`text-sm font-bold ${isSi
                            ? theme === 'dark' ? 'text-emerald-400' : 'text-emerald-700'
                            : isNo
                                ? 'text-rose-500'
                                : theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
                            }`}>
                            {hito.label}
                        </h5>
                        {shouldAllowEdit && (
                            <span className="text-[8px] bg-sky-500/10 text-sky-500 px-1 rounded uppercase font-bold">Editar</span>
                        )}
                        {hito.isAutomated && (
                            <span className={`text-[8px] px-1 rounded uppercase font-bold ${theme === 'dark' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
                                }`}>Sincronizado</span>
                        )}
                    </div>
                    {hito.date && !isNaN(new Date(hito.date).getTime()) && (
                        <span className={`text-[10px] font-medium flex items-center gap-1 ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`}>
                            <Calendar className="h-3 w-3" />
                            {format(new Date(hito.date), "dd-MM-yyyy HH:mm", { locale: es })}
                        </span>
                    )}
                </div>

                {hito.observation && (
                    <p className={`mt-1 text-xs leading-relaxed ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>
                        {hito.observation}
                    </p>
                )}

                {isPendiente && (
                    <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 border ${theme === 'dark'
                        ? 'border-slate-800 bg-slate-900/50 text-slate-500'
                        : 'border-gray-200 bg-gray-50 text-gray-400'
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60">
            <div
                className={`w-full max-w-md overflow-hidden border ${theme === 'dark' ? 'bg-slate-900 border-slate-700/60' : 'bg-white border-gray-300'
                    }`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className={`p-6 border-b ${theme === 'dark' ? 'border-slate-800' : 'border-gray-100'}`}>
                    <h3 className="text-lg font-bold">Actualizar: {hito.label}</h3>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>
                        Cambia el estado del hito operativo para este embarque
                    </p>
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <label className={`block text-[10px] uppercase font-bold tracking-widest mb-2 ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`}>
                            Estado Actual
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {(['SI', 'NO', 'PENDIENTE'] as MilestoneStatus[]).map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setStatus(s)}
                                    className={`py-2 px-1 text-xs font-bold border transition-all ${status === s
                                        ? s === 'SI' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500' :
                                            s === 'NO' ? 'bg-rose-500/20 border-rose-500 text-rose-500' :
                                                'bg-slate-500/20 border-slate-500 text-slate-500'
                                        : theme === 'dark' ? 'bg-slate-800 border-transparent text-slate-400' : 'bg-gray-100 border-transparent text-gray-500'
                                        }`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className={`block text-[10px] uppercase font-bold tracking-widest mb-2 ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`}>
                            Fecha del Evento
                        </label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className={`w-full p-3 border text-sm transition-all focus:outline-none focus:ring-2 ${theme === 'dark'
                                ? 'bg-slate-800 border-slate-700 text-white focus:ring-sky-500/30 focus:border-sky-500'
                                : 'bg-gray-50 border-gray-200 text-gray-900 focus:ring-blue-500/20 focus:border-blue-500'
                                }`}
                        />
                    </div>

                    <div>
                        <label className={`block text-[10px] uppercase font-bold tracking-widest mb-2 ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`}>
                            Observaciones (Opcional)
                        </label>
                        <textarea
                            value={observation}
                            onChange={(e) => setObservation(e.target.value)}
                            rows={3}
                            placeholder="Detalles adicionales sobre el hito..."
                            className={`w-full p-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 resize-none ${theme === 'dark'
                                ? 'bg-slate-800 border-slate-700 text-white focus:ring-sky-500/30 focus:border-sky-500'
                                : 'bg-gray-50 border-gray-200 text-gray-900 focus:ring-blue-500/20 focus:border-blue-500'
                                }`}
                        />
                    </div>
                </div>

                <div className={`p-6 flex gap-3 ${theme === 'dark' ? 'bg-slate-900/50' : 'bg-gray-50/50'}`}>
                    <button
                        onClick={onClose}
                        className={`flex-1 py-3 text-sm font-bold transition-all border ${theme === 'dark' ? 'bg-slate-800 border-slate-700/60 text-slate-300 hover:bg-slate-700' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className={`flex-1 py-3 text-sm font-bold bg-sky-600 border border-sky-500 text-white hover:bg-sky-700 disabled:opacity-50 transition-all`}
                    >
                        {loading ? 'Guardando...' : 'Guardar Hito'}
                    </button>
                </div>
            </div>
        </div>
    );
};
