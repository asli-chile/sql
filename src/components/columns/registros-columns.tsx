import { ColumnDef } from '@tanstack/react-table';
import { Registro } from '@/types/registros';
import { Badge } from '@/components/ui/badge';
import { calculateTransitTime, formatTransitTime } from '@/lib/transit-time-utils';
import { InlineEditCell } from '@/components/InlineEditCell';
import { History } from 'lucide-react';

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

// Campos que NO permiten edición múltiple (son únicos)
const UNIQUE_FIELDS = ['booking', 'contenedor'];

// Función para verificar si un campo permite edición múltiple
const allowsBulkEdit = (field: keyof Registro): boolean => {
  return !UNIQUE_FIELDS.includes(field as string);
};

// Función para crear las columnas con soporte de selección
export const createRegistrosColumns = (
  data: Registro[] = [],
  selectionMode?: boolean,
  selectedRows?: Set<string>,
  onToggleRowSelection?: (id: string) => void,
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
  onShowHistorial?: (registro: Registro) => void
): ColumnDef<Registro>[] => {
  // Crear mapeo de naves a navieras
  const naveToNavierasMap = createNaveToNavieraMap(data);
  
  // Obtener registros seleccionados
  const getSelectedRecords = (): Registro[] => {
    if (!selectedRows || selectedRows.size === 0) return [];
    return data.filter(record => record.id && selectedRows.has(record.id));
  };
  const baseColumns: ColumnDef<Registro>[] = [
    ...(selectionMode ? [{
      id: 'select',
      header: () => null,
      cell: ({ row }: any) => {
        const isSelected = selectedRows?.has(row.original.id || '');
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={isSelected || false}
              onChange={() => onToggleRowSelection?.(row.original.id || '')}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
          </div>
        );
      },
      enableSorting: false,
    }] : []),
  {
    id: 'refAsli',
    accessorKey: 'refAsli',
    header: 'REF ASLI',
    cell: ({ row }) => {
      const refAsli = row.getValue('refAsli') as string;
      const tipoIngreso = row.original.tipoIngreso;
      
      let bgColor = 'bg-green-500';
      let textColor = 'text-white';
      
      if (tipoIngreso === 'EARLY') {
        bgColor = 'bg-cyan-500';
        textColor = 'text-white';
      } else if (tipoIngreso === 'LATE') {
        bgColor = 'bg-yellow-500';
        textColor = 'text-white';
      } else if (tipoIngreso === 'EXTRA LATE') {
        bgColor = 'bg-red-500';
        textColor = 'text-white';
      }
      
      return (
        <div className={`font-semibold px-2 py-1 rounded ${bgColor} ${textColor}`}>
          {refAsli}
        </div>
      );
    },
  },
  {
    id: 'ingresado',
    accessorKey: 'ingresado',
    header: 'Ingresado',
    cell: ({ row }) => {
      const ingresado = row.getValue('ingresado') as Date;
      return <span className="font-semibold text-gray-900">{ingresado ? ingresado.toLocaleDateString('es-CL') : '-'}</span>;
    },
  },
  {
    id: 'shipper',
    accessorKey: 'shipper',
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
          isSelectionMode={selectionMode || false}
        />
      );
    },
  },
  {
    id: 'booking',
    accessorKey: 'booking',
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
          className={isCancelado ? 'bg-red-600 text-black px-2 py-1 rounded' : ''}
          selectedRecords={allowsBulkEdit('booking') ? getSelectedRecords() : []}
          isSelectionMode={allowsBulkEdit('booking') && (selectionMode || false)}
        />
      );
    },
  },
  {
    id: 'contenedor',
    accessorKey: 'contenedor',
    header: 'Contenedor',
    cell: ({ row }) => {
      const contenedor = row.getValue('contenedor') as string | string[];
      const estado = row.original.estado;
      
      // Si está cancelado, aplicar fondo rojo intenso con texto negro
      const isCancelado = estado === 'CANCELADO';
      
      // Procesar contenedores para mostrar como lista
      const displayContainers = () => {
        if (!contenedor || contenedor === '') {
          return '-';
        }
        
        // Si ya es un array, mostrarlo directamente
        if (Array.isArray(contenedor)) {
          return contenedor.map((container, index) => (
            <span key={index} className={`px-2 py-1 rounded text-xs font-mono ${
              isCancelado ? 'bg-red-600 text-black' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
            }`}>
              {container}
            </span>
          ));
        }
        
        // Si es string con espacios, convertir a array
        if (typeof contenedor === 'string' && contenedor.includes(' ')) {
          const containers = contenedor.split(/\s+/).filter(c => c.trim() !== '');
          return containers.map((container, index) => (
            <span key={index} className={`px-2 py-1 rounded text-xs font-mono ${
              isCancelado ? 'bg-red-600 text-black' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
            }`}>
              {container}
            </span>
          ));
        }
        
        // Si es un solo contenedor
        return (
          <span className={`px-2 py-1 rounded text-xs font-mono ${
            isCancelado ? 'bg-red-600 text-black' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
          }`}>
            {contenedor}
          </span>
        );
      };
      
      return (
        <div className="flex flex-col gap-1" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {displayContainers()}
        </div>
      );
    },
  },
  {
    id: 'naviera',
    accessorKey: 'naviera',
    header: 'Naviera',
    cell: ({ row }) => {
      const value = row.getValue('naviera') as string;
      return (
        <span className="font-semibold text-gray-900">
          {value || '-'}
        </span>
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
    header: 'Nave',
    cell: ({ row }) => {
      const value = row.getValue('naveInicial') as string;
      return (
        <InlineEditCell
          value={value}
          field="naveInicial"
          record={row.original}
          onSave={onUpdateRecord || (() => {})}
          onBulkSave={onBulkUpdate}
          type="select"
          options={navesUnicas || []}
          selectedRecords={getSelectedRecords()}
          isSelectionMode={selectionMode || false}
        />
      );
    },
  },
  {
    id: 'pol',
    accessorKey: 'pol',
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
          isSelectionMode={selectionMode || false}
        />
      );
    },
  },
  {
    id: 'pod',
    accessorKey: 'pod',
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
          isSelectionMode={selectionMode || false}
        />
      );
    },
  },
  {
    id: 'etd',
    accessorKey: 'etd',
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
          isSelectionMode={selectionMode || false}
        />
      );
    },
  },
  {
    id: 'eta',
    accessorKey: 'eta',
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
          isSelectionMode={selectionMode || false}
        />
      );
    },
  },
  {
    id: 'tt',
    accessorKey: 'tt',
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
          isSelectionMode={selectionMode || false}
        />
      );
    },
  },
  {
    id: 'tipoIngreso',
    accessorKey: 'tipoIngreso',
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
          isSelectionMode={selectionMode || false}
        />
      );
    },
  },
  {
    id: 'especie',
    accessorKey: 'especie',
    header: 'Especie',
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
          isSelectionMode={selectionMode || false}
        />
      );
    },
  },
  {
    id: 'temperatura',
    accessorKey: 'temperatura',
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
          type="number"
          selectedRecords={getSelectedRecords()}
          isSelectionMode={selectionMode || false}
        />
      );
    },
  },
  {
    id: 'cbm',
    accessorKey: 'cbm',
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
          type="number"
          selectedRecords={getSelectedRecords()}
          isSelectionMode={selectionMode || false}
        />
      );
    },
  },
  {
    id: 'co2',
    accessorKey: 'co2',
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
          type="number"
          selectedRecords={getSelectedRecords()}
          isSelectionMode={selectionMode || false}
        />
      );
    },
  },
  {
    id: 'o2',
    accessorKey: 'o2',
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
          type="number"
          selectedRecords={getSelectedRecords()}
          isSelectionMode={selectionMode || false}
        />
      );
    },
  },
  {
    id: 'flete',
    accessorKey: 'flete',
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
          isSelectionMode={selectionMode || false}
        />
      );
    },
  },
  {
    id: 'ejecutivo',
    accessorKey: 'ejecutivo',
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
          isSelectionMode={selectionMode || false}
        />
      );
    },
  },
  {
    id: 'deposito',
    accessorKey: 'deposito',
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
          isSelectionMode={selectionMode || false}
        />
      );
    },
  },
  {
    id: 'contrato',
    accessorKey: 'contrato',
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
          type="text"
          selectedRecords={getSelectedRecords()}
          isSelectionMode={selectionMode || false}
        />
      );
    },
  },
  {
    id: 'comentario',
    accessorKey: 'comentario',
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
          isSelectionMode={selectionMode || false}
        />
      );
    },
  },
  {
    id: 'historial',
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
