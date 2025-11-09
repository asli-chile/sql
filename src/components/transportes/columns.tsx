import { TransporteRecord } from '@/lib/transportes-service';
import { ReactNode } from 'react';

export type TransporteColumn = {
  key: keyof TransporteRecord;
  header: string;
  render?: (item: TransporteRecord) => ReactNode;
};

export const transportesColumns: TransporteColumn[] = [
  { key: 'semana', header: 'Semana' },
  { key: 'exportacion', header: 'Export.' },
  { key: 'planta', header: 'Planta' },
  { key: 'deposito', header: 'Depósito' },
  { key: 'booking', header: 'Booking' },
  { key: 'nave', header: 'Nave' },
  { key: 'naviera', header: 'Naviera' },
  { key: 'stacking', header: 'Stacking' },
  { key: 'cut_off', header: 'Cut Off' },
  {
    key: 'late',
    header: 'Late',
    render: (item) => (item.late ? '✅' : ''),
  },
  { key: 'contenedor', header: 'Contenedor' },
  { key: 'sello', header: 'Sello' },
  { key: 'tara', header: 'Tara' },
  { key: 'especie', header: 'Especie' },
  { key: 'temperatura', header: 'T°' },
  { key: 'vent', header: 'Vent' },
  { key: 'pol', header: 'POL' },
  { key: 'pod', header: 'POD' },
  { key: 'fecha_planta', header: 'Fecha Planta' },
  { key: 'guia_despacho', header: 'Guía Despacho' },
  { key: 'transportes', header: 'Transportes' },
  { key: 'conductor', header: 'Conductor' },
  { key: 'rut', header: 'RUT' },
  { key: 'fono', header: 'Fono' },
  { key: 'patentes', header: 'Patentes' },
];

