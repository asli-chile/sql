import { Registro } from './registros';

export type MilestoneType =
    | 'reserva_confirmada'
    | 'unidad_asignada'
    | 'unidad_en_planta'
    | 'despachado_planta'
    | 'ingresada_stacking'
    | 'zarpe_nave'
    | 'arribo_destino';

export type MilestoneStatus = 'SI' | 'PENDIENTE' | 'NO';

export interface TrackingEvent {
    id: string;
    registro_id: string;
    milestone: MilestoneType;
    status: MilestoneStatus;
    event_date: string | null;
    observation: string | null;
    updated_at: string;
    updated_by: string | null;
}

export interface ShipmentHito {
    milestone: MilestoneType;
    label: string;
    status: MilestoneStatus;
    date: string | null;
    observation: string | null;
    isAutomated?: boolean;
}

export const MILESTONE_LABELS: Record<MilestoneType, string> = {
    reserva_confirmada: 'Reserva Confirmada',
    unidad_asignada: 'Unidad Asignada',
    unidad_en_planta: 'Unidad en Planta',
    despachado_planta: 'Despachado Planta',
    ingresada_stacking: 'Ingresada Stacking',
    zarpe_nave: 'Zarpe Nave',
    arribo_destino: 'Arribo Destino'
};

export const MILESTONES_ORDER: MilestoneType[] = [
    'reserva_confirmada',
    'unidad_asignada',
    'unidad_en_planta',
    'despachado_planta',
    'ingresada_stacking',
    'zarpe_nave',
    'arribo_destino'
];
