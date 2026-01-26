import React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Registro } from '@/types/registros';
import { Badge } from '@/components/ui/badge';
import { calculateTransitTime, formatTransitTime } from '@/lib/transit-time-utils';
import { InlineEditCell } from '@/components/InlineEditCell';
import { History, Eye, FileText, Upload, Plus, Edit, CheckCircle, CheckCircle2 } from 'lucide-react';
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
  refAsli: { min: 100, max: 180 }, // Fijo para sticky pero con rango
  refCliente: { min: 200, max: 320 },
  ejecutivo: { min: 184, max: 288 },
  usuario: { min: 173, max: 288 },
  ingresado: { min: 127, max: 173 },
  shipper: { min: 250, max: 250 },
  booking: { min: 230, max: 355 },
  contenedor: { min: 150, max: 322 },
  naviera: { min: 184, max: 299 },
  naveInicial: { min: 250, max: 250 },
  viaje: { min: 104, max: 173 },
  especie: { min: 138, max: 253 },
  pol: { min: 150, max: 253 },
  pod: { min: 150, max: 253 },
  etd: { min: 115, max: 173 },
  eta: { min: 115, max: 173 },
  tt: { min: 81, max: 127 },
  deposito: { min: 150, max: 253 },
  ingresoStacking: { min: 173, max: 288 },
  flete: { min: 115, max: 207 },
  contrato: { min: 300, max: 300 },
  tipoIngreso: { min: 150, max: 253 },
  estado: { min: 150, max: 207 },
  temperatura: { min: 92, max: 150 },
  cbm: { min: 81, max: 138 },
  co2: { min: 81, max: 138 },
  o2: { min: 81, max: 138 },
  tipoAtmosfera: { min: 150, max: 253 },
  tratamientoFrio: { min: 173, max: 299 },
  facturacion: { min: 207, max: 403 },
  factura: { min: 207, max: 403 },
  proforma: { min: 207, max: 322 },
  comentario: { min: 288, max: 575 },
  historial: { min: 104, max: 150 },
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
  tiposAtmosferaOpciones?: string[],
  facturacionesUnicas?: string[],
  onShowHistorial?: (registro: Registro) => void,
  facturasPorRegistro?: Map<string, Factura>,
  onViewFactura?: (factura: Factura) => void,
  bookingsConProforma?: Map<string, { nombre: string; fecha: string }>,
  onUploadProforma?: (booking: string, file: File) => Promise<void>,
  onGenerateProforma?: (registro: Registro) => void,
  onOpenBookingModal?: (registro: Registro) => void,
  bookingDocuments?: Map<string, { nombre: string; fecha: string }>,
  canUploadProforma?: boolean
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
    id: 'refCliente',
    accessorKey: 'refCliente',
    size: COLUMN_WIDTHS.refCliente.min,
    minSize: COLUMN_WIDTHS.refCliente.min,
    maxSize: COLUMN_WIDTHS.refCliente.max,
    header: 'Ref Externa',
    cell: ({ row, table }) => {
      const selectedRecordsArray = getSelectedRecords();
      const isCurrentRecordSelected = selectedRecordsArray.some(selected => selected.id === row.original.id);
      const shouldShowIndicator = selectedRecordsArray.length > 1 && isCurrentRecordSelected;
      const rowId = row.original.id || '';
      const isSelected = selectedRows?.has(rowId) || false;
      const rowIndex = row.index;
      
      // Detectar si la refCliente está duplicada
      const currentRefCliente = row.original.refCliente;
      const isDuplicate = currentRefCliente && currentRefCliente.trim() !== '' 
        ? table.getFilteredRowModel().rows.filter(r => 
            r.original.refCliente === currentRefCliente
          ).length > 1
        : false;
      
      // Determinar clases de estilo para resaltar duplicados
      const cellClasses = isDuplicate 
        ? "bg-orange-100 dark:bg-orange-900/40 border border-orange-300 dark:border-orange-600 rounded px-1" 
        : "";
      
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
            <InlineEditCell
              value={row.original.refCliente || ''}
              field="refCliente"
              record={row.original}
              onSave={onUpdateRecord || (() => {})}
              onBulkSave={onBulkUpdate}
              type="text"
              selectedRecords={selectedRecordsArray}
              isSelectionMode={true}
              className={`justify-center text-center font-semibold ${cellClasses}`}
            />
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
    id: 'refAsli',
    accessorKey: 'refAsli',
    size: COLUMN_WIDTHS.refAsli.min,
    minSize: COLUMN_WIDTHS.refAsli.min,
    maxSize: COLUMN_WIDTHS.refAsli.max,
    header: 'REF ASLI',
    cell: ({ row }) => {
      const refAsli = row.getValue('refAsli') as string;
      const tipoIngreso = row.original.tipoIngreso;
      
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
        <span className={`truncate text-center font-semibold ${textColor}`}>
          {refAsli}
        </span>
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
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
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
          // Formatear fecha en formato DD-MM-YYYY (estándar chileno)
          const dia = String(parsedDate.getDate()).padStart(2, '0');
          const mes = String(parsedDate.getMonth() + 1).padStart(2, '0');
          const año = parsedDate.getFullYear();
          display = `${dia}-${mes}-${año}`;
        }
      }

      return <span className="font-semibold text-gray-900 dark:text-slate-100">{display}</span>;
    },
  },
  {
    id: 'shipper',
    accessorKey: 'shipper',
    size: COLUMN_WIDTHS.shipper.min,
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
    size: COLUMN_WIDTHS.booking.min,
    minSize: COLUMN_WIDTHS.booking.min,
    maxSize: COLUMN_WIDTHS.booking.max,
    header: 'Booking',
    cell: ({ row }) => {
      const value = row.getValue('booking') as string;
      const estado = row.original.estado;
      const isCancelado = estado === 'CANCELADO';
      
      // Verificar si existe un documento PDF para este booking
      const bookingKey = value ? value.trim().toUpperCase().replace(/\s+/g, '') : '';
      const existingDocument = bookingKey ? bookingDocuments?.get(bookingKey) : undefined;
      
      return (
        <div className="flex items-center gap-2 w-full">
          <div className="flex-1 flex items-center gap-2">
            {value ? (
              <span className={`px-2 py-1 text-sm font-medium ${
                isCancelado ? 'bg-red-600 text-black rounded' : ''
              }`}>
                {value}
              </span>
            ) : (
              <span className="px-2 py-1 text-sm text-gray-400 dark:text-gray-500">
                Sin booking
              </span>
            )}
            {existingDocument && (
              <span title="PDF disponible en Documentos">
                <CheckCircle2 className="h-4 w-4 text-green-500 dark:text-green-400 flex-shrink-0" />
              </span>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenBookingModal) {
                onOpenBookingModal(row.original);
              }
            }}
            className="p-2.5 rounded transition-colors dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-gray-200 text-gray-500 hover:text-gray-700 flex-shrink-0"
            title={value ? 'Editar booking' : 'Agregar booking'}
          >
            {value ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
          </button>
        </div>
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
      
      // Si no hay valor de filtro o es string vacío, mostrar todo
      if (!value || value === '' || (typeof value === 'string' && value.trim() === '')) {
        return true;
      }
      
      // Normalizar el valor a string para comparación
      const filterValue = typeof value === 'string' ? value : String(value);
      
      // Verificar si la naviera coincide directamente
      if (naviera && filterValue === naviera) return true;
      
      // Verificar si la nave pertenece a alguna de las navieras seleccionadas
      if (nave && naveToNavierasMap.has(nave)) {
        const navierasDeLaNave = naveToNavierasMap.get(nave)!;
        return navierasDeLaNave.some(n => filterValue === n);
      }
      
      return false;
    },
  },
  {
    id: 'naveInicial',
    accessorKey: 'naveInicial',
    size: COLUMN_WIDTHS.naveInicial.min,
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
        <div className="text-sm">
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
    id: 'tipoAtmosfera',
    accessorKey: 'tipoAtmosfera',
    minSize: COLUMN_WIDTHS.tipoAtmosfera.min,
    maxSize: COLUMN_WIDTHS.tipoAtmosfera.max,
    header: 'Tipo Atmósfera',
    cell: ({ row }) => {
      const tipoAtmosfera = row.getValue('tipoAtmosfera') as string;
      return (
        <InlineEditCell
          value={tipoAtmosfera || ''}
          field="tipoAtmosfera"
          record={row.original}
          onSave={onUpdateRecord || (() => {})}
          onBulkSave={onBulkUpdate}
          type="select"
          options={tiposAtmosferaOpciones || []}
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
    size: COLUMN_WIDTHS.contrato.min,
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
      
      // Verificar si hay documento proforma en storage
      const booking = row.original.booking;
      const bookingKey = booking?.trim().toUpperCase().replace(/\s+/g, '') || '';
      const documentoProforma = bookingKey ? bookingsConProforma?.get(bookingKey) : undefined;

      // Si hay factura o documento proforma, mostrar como disponible
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

      // Si hay documento proforma pero no factura, mostrar nombre y fecha
      if (documentoProforma) {
        return (
          <div className="flex flex-col items-center justify-center gap-1 px-2 py-1 max-w-[180px]">
            <span className="text-xs text-green-600 dark:text-green-400 font-medium truncate w-full text-center" title={documentoProforma.nombre}>
              {documentoProforma.nombre}
            </span>
            <span className="text-[10px] text-gray-500 dark:text-gray-400">
              {documentoProforma.fecha}
            </span>
          </div>
        );
      }

      if (canUploadProforma === false) {
        return (
          <div className="flex flex-col items-center justify-center gap-1 px-2 py-2">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Solo lectura</span>
          </div>
        );
      }

      // Componente interno para manejar el upload
      const ProformaUploadCell = () => {
        const fileInputRef = React.useRef<HTMLInputElement>(null);

        const handleUploadClick = (e: React.MouseEvent) => {
          e.stopPropagation();
          fileInputRef.current?.click();
        };

        const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
          const file = e.target.files?.[0];
          if (file && booking && onUploadProforma) {
            await onUploadProforma(booking, file);
            // Resetear el input para permitir subir el mismo archivo otra vez
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          }
        };

        return (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.xls,.xlsx"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex flex-col items-center justify-center gap-1.5 px-1 py-1">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onGenerateProforma?.(row.original);
                  }}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors border border-blue-300 dark:border-blue-700"
                  title="Generar proforma"
                >
                  <FileText size={12} />
                  <span>Generar</span>
                </button>
                <button
                  onClick={handleUploadClick}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/30 rounded transition-colors border border-green-300 dark:border-green-700"
                  title="Subir proforma"
                >
                  <Upload size={12} />
                  <span>Subir</span>
                </button>
              </div>
              <span className="text-[9px] text-gray-500 dark:text-gray-400">PENDIENTE</span>
            </div>
          </>
        );
      };

      return <ProformaUploadCell />;
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
