import { TransporteRecord } from '@/lib/transportes-service';
import { ReactNode, useState, useEffect } from 'react';
import { InlineEditCell } from './InlineEditCell';
import { PlantaCell } from './PlantaCell';

export type TransporteColumn = {
  key: keyof TransporteRecord;
  header: string;
  section: string;
  render?: (item: TransporteRecord) => ReactNode;
};

export type TransporteSection = {
  name: string;
  columns: TransporteColumn[];
};

export const transportesSections: TransporteSection[] = [
  {
    name: 'CONTROL INTERNO',
    columns: [
      { key: 'semana', header: 'WK', section: 'CONTROL INTERNO' },
      { key: 'exportacion', header: 'EXPORT.', section: 'CONTROL INTERNO' },
    ],
  },
  {
    name: 'INFORMACION BOOKING',
    columns: [
      { key: 'booking', header: 'BOOKING', section: 'INFORMACION BOOKING' },
      { key: 'nave', header: 'NAVE', section: 'INFORMACION BOOKING' },
      { key: 'naviera', header: 'NAVIERA', section: 'INFORMACION BOOKING' },
      { key: 'especie', header: 'ESPECIE', section: 'INFORMACION BOOKING' },
      {
        key: 'atmosfera_controlada',
        header: 'AT CONTROLADA',
        section: 'INFORMACION BOOKING',
        render: (item) => (item.atmosfera_controlada ? '✅' : ''),
      },
      { key: 'co2', header: 'CO₂', section: 'INFORMACION BOOKING' },
      { key: 'o2', header: 'O₂', section: 'INFORMACION BOOKING' },
      { key: 'temperatura', header: 'T°', section: 'INFORMACION BOOKING' },
      { key: 'vent', header: 'VENT (cbm)', section: 'INFORMACION BOOKING' },
      { key: 'pol', header: 'POL', section: 'INFORMACION BOOKING' },
      { key: 'pod', header: 'POD', section: 'INFORMACION BOOKING' },
    ],
  },
  {
    name: 'STACKING',
    columns: [
      { key: 'stacking', header: 'INICIO STACKING', section: 'STACKING' },
      { key: 'fin_stacking', header: 'FIN STACKING', section: 'STACKING' },
      { key: 'cut_off', header: 'CUT OFF', section: 'STACKING' },
      { key: 'late', header: 'LATE', section: 'STACKING' },
      { key: 'extra_late', header: 'EXTRA LATE', section: 'STACKING' },
    ],
  },
  {
    name: 'DATOS CONTENEDOR',
    columns: [
      { key: 'deposito', header: 'DEPOSITO', section: 'DATOS CONTENEDOR' },
      { key: 'horario_retiro', header: 'HORARIO RETIRO', section: 'DATOS CONTENEDOR' },
      { key: 'contenedor', header: 'CONTENEDOR', section: 'DATOS CONTENEDOR' },
      { key: 'sello', header: 'SELLO', section: 'DATOS CONTENEDOR' },
      { key: 'tara', header: 'TARA', section: 'DATOS CONTENEDOR' },
      { key: 'porteo', header: 'PORTEO', section: 'DATOS CONTENEDOR' },
    ],
  },
  {
    name: 'DATOS CONDUCTOR',
    columns: [
      { key: 'conductor', header: 'CONDUCTOR', section: 'DATOS CONDUCTOR' },
      { key: 'rut', header: 'RUT', section: 'DATOS CONDUCTOR' },
      { key: 'telefono', header: 'TELEFONO', section: 'DATOS CONDUCTOR' },
      { key: 'patente', header: 'PATENTE', section: 'DATOS CONDUCTOR' },
      { key: 'patente_rem', header: 'PATENTE REM.', section: 'DATOS CONDUCTOR' },
      { key: 'transporte', header: 'TRANSPORTISTA', section: 'DATOS CONDUCTOR' },
    ],
  },
  {
    name: 'DATOS PRESENTACIÓN',
    columns: [
      { key: 'planta', header: 'PLANTA', section: 'DATOS PRESENTACIÓN' },
      { key: 'ubicacion', header: 'UBICACIÓN', section: 'DATOS PRESENTACIÓN' },
      { key: 'dia_presentacion', header: 'DÍA PRESENTACIÓN', section: 'DATOS PRESENTACIÓN' },
      { key: 'hora_presentacion', header: 'HORA PRESENTACIÓN', section: 'DATOS PRESENTACIÓN' },
    ],
  },
  {
    name: 'DESPACHO',
    columns: [
      { key: 'llegada_planta', header: 'LLEGADA PLANTA', section: 'DESPACHO' },
      { key: 'salida_planta', header: 'SALIDA PLANTA', section: 'DESPACHO' },
      { key: 'guia_despacho', header: 'GUIA DESPACHO', section: 'DESPACHO' },
      { key: 'terminal_portuario', header: 'TERMINAL PORTUARIO', section: 'DESPACHO' },
      { key: 'llegada_puerto', header: 'LLEGADA PUERTO', section: 'DESPACHO' },
    ],
  },
  {
    name: 'ADICIONAL',
    columns: [
      { key: 'ingreso_stacking', header: 'INGRESADO STACKING', section: 'ADICIONAL' },
      { key: 'sobreestadia', header: 'SOBREESTADIA', section: 'ADICIONAL' },
      { key: 'scanner', header: 'SCANNER', section: 'ADICIONAL' },
      { key: 'lote_carga', header: 'LOTE CARGA', section: 'ADICIONAL' },
      { key: 'observacion', header: 'OBSERVACION', section: 'ADICIONAL' },
    ],
  },
];

// Para compatibilidad con el código existente
export const transportesColumns: TransporteColumn[] = transportesSections.flatMap((section) => section.columns);

