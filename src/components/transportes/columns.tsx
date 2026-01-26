import { TransporteRecord } from '@/lib/transportes-service';
import { ReactNode } from 'react';
import { InlineEditCell } from './InlineEditCell';
import { PlantaCell } from './PlantaCell';
import { Calendar } from 'lucide-react';

export type TransporteColumn = {
  key: keyof TransporteRecord;
  header: string;
  section: string;
  render?: (item: TransporteRecord, onStackingClick?: (record: TransporteRecord) => void, theme?: string) => ReactNode;
};

export type TransporteSection = {
  name: string;
  columns: TransporteColumn[];
};

// Función para crear render personalizado para columnas de stacking
const createStackingRender = (key: keyof TransporteRecord) => {
  return (item: TransporteRecord, onStackingClick?: (record: TransporteRecord) => void, theme?: string) => {
    const formatValue = (value: any) => {
      if (value === null || value === undefined || value === '') {
        return '—';
      }

      if (typeof value === 'string') {
        // Nombres de meses en español
        const meses = [
          'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
          'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
        ];

        // Si está en formato DD-MM-YYYY HH:MM, convertir a nombre de mes
        if (/^\d{2}-\d{2}-\d{4} \d{2}:\d{2}$/.test(value)) {
          const [datePart, timePart] = value.split(' ');
          const [day, month, year] = datePart.split('-');
          const monthName = meses[parseInt(month) - 1];
          return `${parseInt(day)} de ${monthName} de ${year} ${timePart}`;
        }
        
        // Si está en formato DD-MM-YYYY (solo fecha), convertir a nombre de mes
        if (/^\d{2}-\d{2}-\d{4}$/.test(value)) {
          const [day, month, year] = value.split('-');
          const monthName = meses[parseInt(month) - 1];
          return `${parseInt(day)} de ${monthName} de ${year}`;
        }
        
        // Para fechas en formato YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          const [year, month, day] = value.split('-');
          const monthName = meses[parseInt(month) - 1];
          return `${parseInt(day)} de ${monthName} de ${year}`;
        }
        
        // Para datetime en formato ISO (con T)
        if (value.includes('T')) {
          const date = new Date(value);
          if (!Number.isNaN(date.getTime())) {
            const day = date.getDate();
            const monthName = meses[date.getMonth()];
            const year = date.getFullYear();
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${day} de ${monthName} de ${year} ${hours}:${minutes}`;
          }
        }
        
        // Para datetime con espacio (formato legible)
        if (value.includes(' ') && !/^\d{2}-\d{2}-\d{4}/.test(value)) {
          const date = new Date(value.replace(' ', 'T'));
          if (!Number.isNaN(date.getTime())) {
            const day = date.getDate();
            const monthName = meses[date.getMonth()];
            const year = date.getFullYear();
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${day} de ${monthName} de ${year} ${hours}:${minutes}`;
          }
        }
      }

      return String(value);
    };

    return (
      <div
        onClick={() => {
          console.log('📅 Click detectado en columna:', key, 'para item:', item.id);
          if (onStackingClick) {
            console.log('📅 Llamando a onStackingClick');
            onStackingClick(item);
          } else {
            console.log('❌ onStackingClick es undefined');
          }
        }}
        className={`group flex items-center justify-center gap-1 rounded px-2 py-1 -mx-2 -my-1 transition-colors cursor-pointer ${
          theme === 'dark'
            ? 'hover:bg-slate-700/50'
            : 'hover:bg-blue-50'
        }`}
        title="Click para editar fechas de stacking"
      >
        <span className={`text-sm text-center ${
          theme === 'dark' ? 'text-slate-200' : 'text-gray-900 font-medium'
        }`}>
          {formatValue(item[key])}
        </span>
        <Calendar className={`h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity ${
          theme === 'dark' ? 'text-slate-500' : 'text-blue-500'
        }`} />
      </div>
    );
  };
};

export const transportesSections: TransporteSection[] = [
  {
    name: 'CONTROL INTERNO',
    columns: [
      { key: 'exportacion', header: 'EXPORT.', section: 'CONTROL INTERNO' },
      { key: 'semana', header: 'WK', section: 'CONTROL INTERNO' },
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
      { key: 'stacking', header: 'INICIO STACKING', section: 'STACKING', render: createStackingRender('stacking') },
      { key: 'fin_stacking', header: 'FIN STACKING', section: 'STACKING', render: createStackingRender('fin_stacking') },
      { key: 'cut_off', header: 'CUT OFF', section: 'STACKING', render: createStackingRender('cut_off') },
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

// Debug: Verificar que las columnas de stacking tengan render
console.log('📋 Stacking columns debug:');
transportesColumns
  .filter(col => ['stacking', 'fin_stacking', 'cut_off'].includes(col.key))
  .forEach(col => {
    console.log(`- ${col.key}: hasRender = ${!!col.render}`);
  });

