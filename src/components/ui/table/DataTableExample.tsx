// EJEMPLO DE CÓMO QUEDARÍA EL TOOLBAR CON COMPONENTES DESACOPLADOS

import React from 'react';
import { Grid, List, RotateCcw, Trash2 } from 'lucide-react';
import { NewRecordButton } from './NewRecordButton';
import { TableSearch } from './TableSearch';
import { TableButton } from './TableButton';
import { TableActionsMenu } from './TableActionsMenu';

const DataTableToolbarExample = () => {
  const [viewMode, setViewMode] = React.useState<'table' | 'cards'>('table');
  const [globalFilter, setGlobalFilter] = React.useState('');
  const [showSheetsPreview, setShowSheetsPreview] = React.useState(false);
  const hasSelection = false;
  const selectedCount = 0;

  return (
    <div className="flex flex-col gap-2 sm:gap-3">
      <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2">
        {/* Sección izquierda: Botón principal, buscador y menú hamburguesa */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
          {/* Botón Nuevo Registro - Componente desacoplado */}
          <NewRecordButton onClick={() => console.log('Nuevo registro')} />
          
          {/* Buscador - Componente desacoplado */}
          <TableSearch
            value={globalFilter}
            onChange={setGlobalFilter}
            placeholder="Buscar..."
          />
          
          {/* Menú hamburguesa con acciones agrupadas */}
          <TableActionsMenu
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onExport={() => console.log('Exportar')}
            onReset={() => console.log('Reset')}
            showSheets={true}
            onSheetsToggle={() => setShowSheetsPreview(!showSheetsPreview)}
            sheetsVisible={showSheetsPreview}
          />
        </div>

        {/* Sección derecha: Botones de acción crítica */}
        <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 flex-shrink-0">
          {/* Botón Limpiar selección */}
          <TableButton
            icon={RotateCcw}
            text="Limpiar"
            onClick={() => console.log('Limpiar selección')}
            disabled={!hasSelection}
            textVisible={false}
            badge={hasSelection ? selectedCount : undefined}
          />
          
          {/* Botón Eliminar */}
          <TableButton
            icon={Trash2}
            text="Eliminar"
            variant="destructive"
            onClick={() => console.log('Eliminar seleccionados')}
            disabled={!hasSelection}
            badge={hasSelection ? selectedCount : undefined}
          />
        </div>
      </div>
    </div>
  );
};

export default DataTableToolbarExample;
