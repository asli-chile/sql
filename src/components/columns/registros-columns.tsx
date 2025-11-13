import React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Registro } from '@/types/registros';
import { Badge } from '@/components/ui/badge';
import { calculateTransitTime, formatTransitTime } from '@/lib/transit-time-utils';
import { InlineEditCell } from '@/components/InlineEditCell';
import { History, Eye } from 'lucide-react';
import { Factura } from '@/types/factura';

// Función para crear un mapeo de naves a navieras
const createNaveToNavieraMap = (data: Registro[]): Map<string, string[]> => {
  const naveToNavieras = new Map<string, string[]>();
  
  data.forEach(record => {
    if (record.naveInicial && record.naviera) {
      if (!naveToNavieras.has(record.naveInicial)) {
        naveToNavieras.set(record.naveInicial, []);
      }
      const navieras = naveToNavieras.get(record.naveInicial)!;
      if (!navieras.includes(record.naviera)) {
        navieras.push(record.naviera);
      }
    }
  });
  
  return naveToNavieras;
};

// Función para obtener la traducción al inglés de la especie
const getEspecieEnIngles = (especie: string): string => {
  const mapping: Record<string, string> = {
    'CEREZA': 'FRESH CHERRIES',
    'Cereza': 'FRESH CHERRIES',
    'cereza': 'FRESH CHERRIES',
    'PALTA': 'AVOCADO',
    'Palta': 'AVOCADO',
    'palta': 'AVOCADO',
    'UVA': 'GRAPES',
    'Uva': 'GRAPES',
    'uva': 'GRAPES',
    'ARANDANO': 'BLUEBERRY',
    'Arandano': 'BLUEBERRY',
    'arandano': 'BLUEBERRY',
    'ARÁNDANO': 'BLUEBERRY',
    'Arándano': 'BLUEBERRY',
    'arándano': 'BLUEBERRY',
  };
  return mapping[especie] || especie;
};

// Campos que NO permiten edición múltiple (son únicos)
const UNIQUE_FIELDS = ['booking', 'contenedor'];

// Función para verificar si un campo permite edición múltiple
const allowsBulkEdit = (field: keyof Registro): boolean => {
  return !UNIQUE_FIELDS.includes(field as string);
};

// Mapeo de anchos mínimos y máximos para cada columna (dinámico según contenido)
const COLUMN_WIDTHS: Record<string, { min: number; max: number }> = {
  refAsli: { min: 150, max: 220 }, // Fijo para sticky pero con rango
  refCliente: { min: 120, max: 200 },
  ejecutivo: { min: 120, max: 200 },
  usuario: { min: 120, max: 200 },
  ingresado: { min: 90, max: 120 },
  shipper: { min: 150, max: 300 },
  booking: { min: 120, max: 200 },
  contenedor: { min: 100, max: 250 },
  naviera: { min: 130, max: 220 },
  naveInicial: { min: 130, max: 220 },
  viaje: { min: 70, max: 120 },
  especie: { min: 90, max: 180 },
  pol: { min: 100, max: 180 },
  pod: { min: 100, max: 180 },
  etd: { min: 80, max: 120 },
  eta: { min: 80, max: 120 },
  tt: { min: 50, max: 80 },
  deposito: { min: 100, max: 180 },
  ingresoStacking: { min: 120, max: 200 },
  flete: { min: 80, max: 150 },
  contrato: { min: 180, max: 350 },
  tipoIngreso: { min: 100, max: 180 },
  estado: { min: 100, max: 150 },
  temperatura: { min: 60, max: 100 },
  cbm: { min: 50, max: 90 },
  co2: { min: 50, max: 90 },
  o2: { min: 50, max: 90 },
  tratamientoFrio: { min: 120, max: 220 },
  facturacion: { min: 150, max: 300 },
  factura: { min: 150, max: 300 },
  proforma: { min: 70, max: 120 },
  comentario: { min: 200, max: 400 },
  historial: { min: 70, max: 100 },
};

// Función para crear las columnas con soporte de selección
export const createRegistrosColumns = (
  data: Registro[] = [],
  selectedRows?: Set<string>,
  onToggleRowSelection?: (id: string, rowIndex?: number, event?: React.MouseEvent<HTMLInputElement>) => void,
  onUpdateRecord?: (updatedRecord: Registro) => void,
  onBulkUpdate?: (field: keyof Registro, value: any, selectedRecords: Registro[]) => void,
  navierasUnicas?: string[],
  ejecutivosUnicos?: string[],
  especiesUnicas?: string[],
  clientesUnicos?: string[],
  polsUnicos?: string[],
  destinosUnicos?: string[],
  depositosUnicos?: string[],
  navesUnicas?: string[],
  fletesUnicos?: string[],
  contratosUnicos?: string[],
  tipoIngresoUnicos?: string[],
  estadosUnicos?: string[],
  temperaturasUnicas?: string[],
  cbmUnicos?: string[],
  co2sUnicos?: string[],
  o2sUnicos?: string[],
  tratamientosFrioOpciones?: string[],
  facturacionesUnicas?: string[],
  onShowHistorial?: (registro: Registro) => void,
  facturasPorRegistro?: Map<string, Factura>,
  onViewFactura?: (factura: Factura) => void
): ColumnDef<Registro>[] => {
  // Crear mapeo de naves a navieras
  const naveToNavierasMap = createNaveToNavieraMap(data);
  
  // Obtener registros seleccionados
  const getSelectedRecords = (): Registro[] => {
    if (!selectedRows || selectedRows.size === 0) return [];
    return data.filter(record => record.id && selectedRows.has(record.id));
  };
  const baseColumns: ColumnDef<Registro>[] = [
  {
    id: 'refAsli',
    accessorKey: 'refAsli',
    size: COLUMN_WIDTHS.refAsli.min,
    minSize: COLUMN_WIDTHS.refAsli.min,
    maxSize: COLUMN_WIDTHS.refAsli.max,
    header: 'REF ASLI',
    cell: ({ row }) => {
      const refAsli = row.getValue('refAsli') as string;
      const tipoIngreso = row.original.tipoIngreso;
      const selectedRecordsArray = getSelectedRecords();
      const isCurrentRecordSelected = selectedRecordsArray.some(selected => selected.id === row.original.id);
      const shouldShowIndicator = selectedRecordsArray.length > 1 && isCurrentRecordSelected;
      const rowId = row.original.id || '';
      const isSelected = selectedRows?.has(rowId) || false;
      const rowIndex = row.index;
      
      // Color del texto según tipoIngreso, sin fondo de color en la celda
      let textColor = 'text-green-600 dark:text-green-400';
      
      if (tipoIngreso === 'EARLY') {
        textColor = 'text-cyan-600 dark:text-cyan-400';
      } else if (tipoIngreso === 'LATE') {
        textColor = 'text-yellow-600 dark:text-yellow-400';
      } else if (tipoIngreso === 'EXTRA LATE') {
        textColor = 'text-red-600 dark:text-red-400';
      }
      
      return (
        <div className="flex w-full items-center justify-center gap-3 overflow-hidden px-2">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              onToggleRowSelection?.(rowId, rowIndex, e as any);
            }}
            onClick={(e) => e.stopPropagation()}
            className="h-4 w-4 cursor-pointer rounded border-slate-500 text-blue-500 focus:ring-blue-500"
          />
          <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
            <span className={`truncate text-center font-semibold ${textColor}`}>
              {refAsli}
            </span>
            {shouldShowIndicator && (
              <span className="flex-shrink-0 text-[10px] font-semibold text-white bg-blue-500 rounded-full px-1 py-0.5">
                {selectedRecordsArray.length}
              </span>
            )}
          </div>
        </div>
      );
    },
  },
  {
    id: 'refCliente',
    accessorKey: 'refCliente',
    size: COLUMN_WIDTHS.refCliente.min,
    minSize: COLUMN_WIDTHS.refCliente.min,
    maxSize: COLUMN_WIDTHS.refCliente.max,
    header: 'Ref Externa',
    cell: ({ row }) => {
      return (
        <InlineEditCell
          value={row.original.refCliente || ''}
          field="refCliente"
          record={row.original}
          onSave={onUpdateRecord || (() => {})}
          onBulkSave={onBulkUpdate}
          type="text"
          selectedRecords={getSelectedRecords()}
          isSelectionMode={true}
          className="justify-center text-center"
        />
      );
    },
  },
  {
    id: 'ejecutivo',
    accessorKey: 'ejecutivo',
    minSize: COLUMN_WIDTHS.ejecutivo.min,
    maxSize: COLUMN_WIDTHS.ejecutivo.max,
    header: 'Ejecutivo',
    cell: ({ row }) => {
      const value = row.getValue('ejecutivo') as string;
      return (
        <InlineEditCell
          value={value}
          field="ejecutivo"
          record={row.original}
          onSave={onUpdateRecord || (() => {})}
          onBulkSave={onBulkUpdate}
          type="select"
          options={ejecutivosUnicos || []}
          selectedRecords={getSelectedRecords()}
          isSelectionMode={true}
        />
      );
    },
  },
  {
    id: 'usuario',
    accessorKey: 'usuario',
    minSize: COLUMN_WIDTHS.usuario.min,
    maxSize: COLUMN_WIDTHS.usuario.max,
    header: 'Usuario',
    cell: ({ row }) => {
      const value = row.getValue('usuario') as string || row.original.createdBy || '';
      return (
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
          {value || '-'}
        </span>
      );
    },
  },
  {
    id: 'ingresado',
    accessorKey: 'ingresado',
    minSize: COLUMN_WIDTHS.ingresado.min,
    maxSize: COLUMN_WIDTHS.ingresado.max,
    header: 'Ingresado',
    cell: ({ row }) => {
      const rawValue = row.getValue('ingresado');
      let display = '-';

      if (rawValue) {
        const parsedDate = typeof rawValue === 'string' || typeof rawValue === 'number'
          ? new Date(rawValue)
          : (rawValue as Date);

        if (parsedDate instanceof Date && !isNaN(parsedDate.getTime())) {
          display = parsedDate.toLocaleDateString('es-CL');
        }
      }

      return <span className="font-semibold text-gray-900 dark:text-slate-100">{display}</span>;
    },
  },
  {
    id: 'shipper',
    accessorKey: 'shipper',
    minSize: COLUMN_WIDTHS.shipper.min,
    maxSize: COLUMN_WIDTHS.shipper.max,
    header: 'Cliente',
    cell: ({ row }) => {
      const value = row.getValue('shipper') as string;
      return (
        <InlineEditCell
          value={value}
          field="shipper"
          record={row.original}
          onSave={onUpdateRecord || (() => {})}
          onBulkSave={onBulkUpdate}
          type="select"
          options={clientesUnicos || []}
          selectedRecords={getSelectedRecords()}
          isSelectionMode={true}
        />
      );
    },
  },
  {
    id: 'booking',
    accessorKey: 'booking',
    minSize: COLUMN_WIDTHS.booking.min,
    maxSize: COLUMN_WIDTHS.booking.max,
    header: 'Booking',
    cell: ({ row }) => {
      const value = row.getValue('booking') as string;
      const estado = row.original.estado;
      
      // Si está cancelado, aplicar fondo rojo intenso con texto negro
      const isCancelado = estado === 'CANCELADO';
      
      return (
        <InlineEditCell
          value={value}
          field="booking"
          record={row.original}
          onSave={onUpdateRecord || (() => {})}
          onBulkSave={allowsBulkEdit('booking') ? onBulkUpdate : undefined}
          type="text"
          className={isCancelado ? 'bg-red-600 text-black px-2 py-0.5 rounded text-[10px]' : ''}
          selectedRecords={allowsBulkEdit('booking') ? getSelectedRecords() : []}
          isSelectionMode={allowsBulkEdit('booking')}
        />
      );
    },
  },
  {
    id: 'contenedor',
    accessorKey: 'contenedor',
    minSize: COLUMN_WIDTHS.contenedor.min,
    maxSize: COLUMN_WIDTHS.contenedor.max,
    header: 'Contenedor',
    cell: ({ row }) => {
      const contenedor = row.getValue('contenedor') as string | string[];
      const estado = row.original.estado;
      
      // Si está cancelado, aplicar fondo rojo intenso con texto negro
      const isCancelado = estado === 'CANCELADO';
      
      // Parsear contenedor si viene como string JSON
      let contenedorParsed = contenedor;
      if (typeof contenedor === 'string' && (contenedor.startsWith('[') || contenedor.startsWith('{"'))) {
        try {
          contenedorParsed = JSON.parse(contenedor);
        } catch (e) {
          // Si falla el parsing, mantener el valor original
          contenedorParsed = contenedor;
        }
      }
      
      // Convertir a string para edición
      const value = Array.isArray(contenedorParsed) ? contenedorParsed.join(' ') : (contenedorParsed || '');
      
      // Procesar para mostrar en lista vertical
      const contenedores = Array.isArray(contenedorParsed) 
        ? contenedorParsed 
        : typeof contenedorParsed === 'string' && contenedorParsed.includes(' ')
          ? contenedorParsed.split(/\s+/).filter(c => c.trim() !== '')
          : contenedorParsed ? [contenedorParsed] : [];
      
      return (
        <InlineEditCell
          value={value}
          field="contenedor"
          record={row.original}
          onSave={onUpdateRecord || (() => {})}
          onBulkSave={allowsBulkEdit('contenedor') ? onBulkUpdate : undefined}
          type="text"
          className={isCancelado ? 'bg-red-600 text-black px-2 py-0.5 rounded text-[10px]' : ''}
          selectedRecords={allowsBulkEdit('contenedor') ? getSelectedRecords() : []}
          isSelectionMode={allowsBulkEdit('contenedor')}
          displayAsVerticalList={contenedores.length > 1}
          customDisplay={contenedores.length > 1 ? (
            <div className="flex flex-col gap-1">
              {contenedores.map((container, index) => (
                <span key={index} className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                  isCancelado ? 'bg-red-600 text-black' : 'bg-gray-100 dark:bg-gray-700 text-black dark:text-gray-200'
                }`}>
                  {container}
                </span>
              ))}
            </div>
          ) : undefined}
        />
      );
    },
  },
  {
    id: 'tratamientoFrio',
    accessorKey: 'tratamientoFrio',
    size: COLUMN_WIDTHS.tratamientoFrio.min,
    minSize: COLUMN_WIDTHS.tratamientoFrio.min,
    maxSize: COLUMN_WIDTHS.tratamientoFrio.max,
    header: 'Trat. Frío',
    cell: ({ row }) => (
      <InlineEditCell
        value={row.original.tratamientoFrio || ''}
        field="tratamientoFrio"
        record={row.original}
        onSave={onUpdateRecord || (() => {})}
        onBulkSave={onBulkUpdate}
        type="select"
        options={tratamientosFrioOpciones || []}
        selectedRecords={getSelectedRecords()}
        isSelectionMode={true}
      />
    ),
  },
  {
    id: 'naviera',
    accessorKey: 'naviera',
    minSize: COLUMN_WIDTHS.naviera.min,
    maxSize: COLUMN_WIDTHS.naviera.max,
    header: 'Naviera',
    cell: ({ row }) => {
      const value = row.getValue('naviera') as string;
      return (
        <InlineEditCell
          value={value}
          field="naviera"
          record={row.original}
          onSave={onUpdateRecord || (() => {})}
          onBulkSave={onBulkUpdate}
          type="select"
          options={navierasUnicas || []}
          selectedRecords={getSelectedRecords()}
          isSelectionMode={true}
        />
      );
    },
    filterFn: (row, id, value) => {
      // Filtro personalizado para naviera que incluye naves compartidas
      const naviera = row.getValue('naviera') as string;
      const nave = row.getValue('naveInicial') as string;
      
      // Si no hay valor de filtro, mostrar todo
      if (!value || value.length === 0) return true;
      
      // Verificar si la naviera coincide directamente
      if (value.includes(naviera)) return true;
      
      // Verificar si la nave pertenece a alguna de las navieras seleccionadas
      if (nave && naveToNavierasMap.has(nave)) {
        const navierasDeLaNave = naveToNavierasMap.get(nave)!;
        return navierasDeLaNave.some(n => value.includes(n));
      }
      
      return false;
    },
  },
  {
    id: 'naveInicial',
    accessorKey: 'naveInicial',
    minSize: COLUMN_WIDTHS.naveInicial.min,
    maxSize: COLUMN_WIDTHS.naveInicial.max,
    header: 'Nave',
    cell: ({ row }) => {
      let value = row.getValue('naveInicial') as string;
      let viaje = row.original.viaje;
      
      // Si la nave contiene [ ], extraer el viaje
      const match = value?.match(/^(.+?)\s*\[(.+?)\]$/);
      if (match) {
        value = match[1].trim();
        viaje = match[2].trim();
      }
      
      // Mostrar nave y viaje juntos, sin edición inline (solo se edita con clic derecho)
      return (
        <div className="text-[10px]">
          {value || '-'}
          {viaje && <span className="text-gray-500 dark:text-gray-400"> [{viaje}]</span>}
        </div>
      );
    },
  },
  {
    id: 'pol',
    accessorKey: 'pol',
    minSize: COLUMN_WIDTHS.pol.min,
    maxSize: COLUMN_WIDTHS.pol.max,
    header: 'POL',
    cell: ({ row }) => {
      const value = row.getValue('pol') as string;
      return (
        <InlineEditCell
          value={value}
          field="pol"
          record={row.original}
          onSave={onUpdateRecord || (() => {})}
          onBulkSave={onBulkUpdate}
          type="select"
          options={polsUnicos || []}
          selectedRecords={getSelectedRecords()}
          isSelectionMode={true}
        />
      );
    },
  },
  {
    id: 'pod',
    accessorKey: 'pod',
    minSize: COLUMN_WIDTHS.pod.min,
    maxSize: COLUMN_WIDTHS.pod.max,
    header: 'POD',
    cell: ({ row }) => {
      const value = row.getValue('pod') as string;
      return (
        <InlineEditCell
          value={value}
          field="pod"
          record={row.original}
          onSave={onUpdateRecord || (() => {})}
          onBulkSave={onBulkUpdate}
          type="select"
          options={destinosUnicos || []}
          selectedRecords={getSelectedRecords()}
          isSelectionMode={true}
        />
      );
    },
  },
  {
    id: 'etd',
    accessorKey: 'etd',
    minSize: COLUMN_WIDTHS.etd.min,
    maxSize: COLUMN_WIDTHS.etd.max,
    header: 'ETD',
    cell: ({ row }) => {
      const etd = row.getValue('etd') as Date;
      return (
        <InlineEditCell
          value={etd}
          field="etd"
          record={row.original}
          onSave={onUpdateRecord || (() => {})}
          onBulkSave={onBulkUpdate}
          type="date"
          selectedRecords={getSelectedRecords()}
          isSelectionMode={true}
        />
      );
    },
  },
  {
    id: 'eta',
    accessorKey: 'eta',
    minSize: COLUMN_WIDTHS.eta.min,
    maxSize: COLUMN_WIDTHS.eta.max,
    header: 'ETA',
    cell: ({ row }) => {
      const eta = row.getValue('eta') as Date;
      return (
        <InlineEditCell
          value={eta}
          field="eta"
          record={row.original}
          onSave={onUpdateRecord || (() => {})}
          onBulkSave={onBulkUpdate}
          type="date"
          selectedRecords={getSelectedRecords()}
          isSelectionMode={true}
        />
      );
    },
  },
  {
    id: 'tt',
    accessorKey: 'tt',
    minSize: COLUMN_WIDTHS.tt.min,
    maxSize: COLUMN_WIDTHS.tt.max,
    header: 'TT',
    cell: ({ row }) => {
      const etd = row.original.etd;
      const eta = row.original.eta;
      const transitTime = calculateTransitTime(etd, eta);
      
      return (
        <span className="font-semibold text-gray-900">
          {formatTransitTime(transitTime)}
        </span>
      );
    },
  },
  {
    id: 'estado',
    accessorKey: 'estado',
    minSize: COLUMN_WIDTHS.estado.min,
    maxSize: COLUMN_WIDTHS.estado.max,
    header: 'Estado',
    cell: ({ row }) => {
      const estado = row.getValue('estado') as string;
      return (
        <InlineEditCell
          value={estado}
          field="estado"
          record={row.original}
          onSave={onUpdateRecord || (() => {})}
          onBulkSave={onBulkUpdate}
          type="select"
          options={estadosUnicos || ['PENDIENTE', 'CONFIRMADO', 'CANCELADO']}
          selectedRecords={getSelectedRecords()}
          isSelectionMode={true}
        />
      );
    },
  },
  {
    id: 'tipoIngreso',
    accessorKey: 'tipoIngreso',
    minSize: COLUMN_WIDTHS.tipoIngreso.min,
    maxSize: COLUMN_WIDTHS.tipoIngreso.max,
    header: 'Tipo Ingreso',
    cell: ({ row }) => {
      const tipo = row.getValue('tipoIngreso') as string;
      return (
        <InlineEditCell
          value={tipo}
          field="tipoIngreso"
          record={row.original}
          onSave={onUpdateRecord || (() => {})}
          onBulkSave={onBulkUpdate}
          type="select"
          options={['NORMAL', 'EARLY', 'LATE', 'EXTRA LATE']}
          selectedRecords={getSelectedRecords()}
          isSelectionMode={true}
        />
      );
    },
  },
  {
    id: 'especie',
    accessorKey: 'especie',
    minSize: COLUMN_WIDTHS.especie.min,
    maxSize: COLUMN_WIDTHS.especie.max,
    header: 'ESPECIE',
    cell: ({ row }) => {
      const value = row.getValue('especie') as string;
      return (
        <InlineEditCell
          value={value}
          field="especie"
          record={row.original}
          onSave={onUpdateRecord || (() => {})}
          onBulkSave={onBulkUpdate}
          type="select"
          options={especiesUnicas || []}
          selectedRecords={getSelectedRecords()}
          isSelectionMode={true}
        />
      );
    },
  },
  {
    id: 'temperatura',
    accessorKey: 'temperatura',
    minSize: COLUMN_WIDTHS.temperatura.min,
    maxSize: COLUMN_WIDTHS.temperatura.max,
    header: 'T°',
    cell: ({ row }) => {
      const temp = row.getValue('temperatura') as number;
      return (
        <InlineEditCell
          value={temp}
          field="temperatura"
          record={row.original}
          onSave={onUpdateRecord || (() => {})}
          onBulkSave={onBulkUpdate}
          type="select"
          options={temperaturasUnicas || []}
          selectedRecords={getSelectedRecords()}
          isSelectionMode={true}
        />
      );
    },
  },
  {
    id: 'cbm',
    accessorKey: 'cbm',
    minSize: COLUMN_WIDTHS.cbm.min,
    maxSize: COLUMN_WIDTHS.cbm.max,
    header: 'CBM',
    cell: ({ row }) => {
      const cbm = row.getValue('cbm') as number;
      return (
        <InlineEditCell
          value={cbm}
          field="cbm"
          record={row.original}
          onSave={onUpdateRecord || (() => {})}
          onBulkSave={onBulkUpdate}
          type="select"
          options={cbmUnicos || []}
          selectedRecords={getSelectedRecords()}
          isSelectionMode={true}
        />
      );
    },
  },
  {
    id: 'co2',
    accessorKey: 'co2',
    minSize: COLUMN_WIDTHS.co2.min,
    maxSize: COLUMN_WIDTHS.co2.max,
    header: 'CO2',
    cell: ({ row }) => {
      const co2 = row.getValue('co2') as number;
      return (
        <InlineEditCell
          value={co2}
          field="co2"
          record={row.original}
          onSave={onUpdateRecord || (() => {})}
          onBulkSave={onBulkUpdate}
          type="select"
          options={co2sUnicos || []}
          selectedRecords={getSelectedRecords()}
          isSelectionMode={true}
        />
      );
    },
  },
  {
    id: 'o2',
    accessorKey: 'o2',
    minSize: COLUMN_WIDTHS.o2.min,
    maxSize: COLUMN_WIDTHS.o2.max,
    header: 'O2',
    cell: ({ row }) => {
      const o2 = row.getValue('o2') as number;
      return (
        <InlineEditCell
          value={o2}
          field="o2"
          record={row.original}
          onSave={onUpdateRecord || (() => {})}
          onBulkSave={onBulkUpdate}
          type="select"
          options={o2sUnicos || []}
          selectedRecords={getSelectedRecords()}
          isSelectionMode={true}
        />
      );
    },
  },
  {
    id: 'flete',
    accessorKey: 'flete',
    minSize: COLUMN_WIDTHS.flete.min,
    maxSize: COLUMN_WIDTHS.flete.max,
    header: 'Flete',
    cell: ({ row }) => {
      const value = row.getValue('flete') as string;
      return (
        <InlineEditCell
          value={value}
          field="flete"
          record={row.original}
          onSave={onUpdateRecord || (() => {})}
          onBulkSave={onBulkUpdate}
          type="select"
          options={fletesUnicos || []}
          selectedRecords={getSelectedRecords()}
          isSelectionMode={true}
        />
      );
    },
  },
  {
    id: 'deposito',
    accessorKey: 'deposito',
    minSize: COLUMN_WIDTHS.deposito.min,
    maxSize: COLUMN_WIDTHS.deposito.max,
    header: 'Depósito',
    cell: ({ row }) => {
      const value = row.getValue('deposito') as string;
      return (
        <InlineEditCell
          value={value}
          field="deposito"
          record={row.original}
          onSave={onUpdateRecord || (() => {})}
          onBulkSave={onBulkUpdate}
          type="select"
          options={depositosUnicos || []}
          selectedRecords={getSelectedRecords()}
          isSelectionMode={true}
        />
      );
    },
  },
  {
    id: 'contrato',
    accessorKey: 'contrato',
    minSize: COLUMN_WIDTHS.contrato.min,
    maxSize: COLUMN_WIDTHS.contrato.max,
    header: 'Contrato',
    cell: ({ row }) => {
      const value = row.getValue('contrato') as string;
      return (
        <InlineEditCell
          value={value}
          field="contrato"
          record={row.original}
          onSave={onUpdateRecord || (() => {})}
          onBulkSave={onBulkUpdate}
          type="select"
          options={contratosUnicos || []}
          selectedRecords={getSelectedRecords()}
          isSelectionMode={true}
        />
      );
    },
  },
  {
    id: 'comentario',
    accessorKey: 'comentario',
    minSize: COLUMN_WIDTHS.comentario.min,
    maxSize: COLUMN_WIDTHS.comentario.max,
    header: 'Comentario',
    cell: ({ row }) => {
      const comentario = row.getValue('comentario') as string;
      return (
        <InlineEditCell
          value={comentario}
          field="comentario"
          record={row.original}
          onSave={onUpdateRecord || (() => {})}
          onBulkSave={onBulkUpdate}
          type="textarea"
          className="max-w-xs"
          selectedRecords={getSelectedRecords()}
          isSelectionMode={true}
        />
      );
    },
  },
  {
    id: 'proforma',
    minSize: COLUMN_WIDTHS.proforma.min,
    maxSize: COLUMN_WIDTHS.proforma.max,
    header: 'PROFORMA',
    cell: ({ row }) => {
      const registroId = row.original.id;
      const factura = registroId ? facturasPorRegistro?.get(registroId) : undefined;

      if (factura && onViewFactura) {
        return (
          <div className="flex items-center justify-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewFactura(factura);
              }}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors dark:hover:bg-blue-900 dark:text-gray-300"
              title="Ver factura"
            >
              <Eye size={16} />
            </button>
          </div>
        );
      }

      return (
        <div className="flex items-center justify-center">
          <span className="text-[10px] text-gray-500 dark:text-gray-400">PENDIENTE</span>
        </div>
      );
    },
    enableSorting: false,
  },
  {
    id: 'historial',
    minSize: COLUMN_WIDTHS.historial.min,
    maxSize: COLUMN_WIDTHS.historial.max,
    header: 'Historial',
    cell: ({ row }) => {
      return (
        <div className="flex items-center justify-center">
          <button
            onClick={() => onShowHistorial?.(row.original)}
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Ver historial de cambios"
          >
            <History size={16} />
          </button>
        </div>
      );
    },
    enableSorting: false,
  },
];

  return baseColumns;
};

// Exportar por defecto las columnas sin selección (para compatibilidad)
export const registrosColumns = createRegistrosColumns();
