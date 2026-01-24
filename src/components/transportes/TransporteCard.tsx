'use client';

import { TransporteRecord } from '@/lib/transportes-service';
import { InlineEditCell } from './InlineEditCell';
import { Download, RefreshCcw, Truck, Calendar, MapPin, User, Package, Thermometer, Wind, Ship } from 'lucide-react';

interface TransporteCardProps {
  transporte: TransporteRecord;
  theme: 'dark' | 'light';
  canEdit: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updatedRecord: TransporteRecord) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  bookingDocuments: Map<string, { nombre: string; fecha: string; path: string }>;
  downloadingBooking: string | null;
  onDownloadBooking: (booking: string) => void;
}

const dateKeys = new Set<keyof TransporteRecord>([
  'stacking',
  'fin_stacking',
  'cut_off',
  'created_at',
  'updated_at',
]);

export function TransporteCard({
  transporte,
  theme,
  canEdit,
  isSelected,
  onSelect,
  onUpdate,
  onContextMenu,
  bookingDocuments,
  downloadingBooking,
  onDownloadBooking,
}: TransporteCardProps) {
  const formatValue = (value: any) => {
    if (value === null || value === undefined || value === '') {
      return '—';
    }

    if (dateKeys.has(value) && typeof value === 'string') {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleDateString('es-CL');
      }
    }

    if (typeof value === 'boolean') {
      return value ? 'Sí' : 'No';
    }

    return String(value);
  };

  const bookingValue = transporte.booking;
  const bookingKey = bookingValue ? bookingValue.trim().toUpperCase().replace(/\s+/g, '') : '';
  const hasPdf = bookingKey && bookingDocuments.has(bookingKey);

  return (
    <div
      className={`relative rounded-xl border-2 transition-all duration-200 hover:shadow-lg ${
        isSelected
          ? theme === 'dark'
            ? 'border-sky-500 bg-slate-800/50'
            : 'border-blue-500 bg-blue-50'
          : theme === 'dark'
            ? 'border-slate-700 bg-slate-900/50 hover:border-slate-600'
            : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
      onContextMenu={onContextMenu}
    >
      {/* Checkbox de selección */}
      <div className="absolute top-3 left-3 z-10">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          disabled={!canEdit}
          className={`h-4 w-4 rounded focus:ring-2 ${canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'} ${
            theme === 'dark'
              ? 'border-slate-600 bg-slate-800 text-sky-500 focus:ring-sky-500/50'
              : 'border-gray-300 bg-white text-blue-600 focus:ring-blue-500/50'
          }`}
        />
      </div>

      {/* Header */}
      <div className={`p-4 border-b ${theme === 'dark' ? 'border-slate-700' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className={`h-5 w-5 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`} />
            <span className={`font-semibold text-sm ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>
              {transporte.contenedor || 'Sin contenedor'}
            </span>
          </div>
          {transporte.atmosfera_controlada && (
            <span className={`px-2 py-1 text-xs rounded-full font-medium ${
              theme === 'dark' ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'
            }`}>
              AT Controlada
            </span>
          )}
        </div>
      </div>

      {/* Contenido principal */}
      <div className="p-4 space-y-4">
        {/* Información de Booking */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Package className={`h-4 w-4 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`} />
            <span className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>Booking</span>
          </div>
          <div className="flex items-center gap-2">
            {canEdit ? (
              <InlineEditCell
                value={transporte.booking}
                field="booking"
                record={transporte}
                onSave={onUpdate}
                type="text"
              />
            ) : (
              <span className={`text-sm ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>
                {formatValue(transporte.booking)}
              </span>
            )}
            {hasPdf && canEdit && bookingValue && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDownloadBooking(bookingValue);
                }}
                disabled={downloadingBooking === bookingKey}
                className={`p-1 rounded transition-colors ${
                  downloadingBooking === bookingKey
                    ? 'opacity-50 cursor-not-allowed'
                    : theme === 'dark'
                      ? 'hover:bg-slate-700 text-slate-400 hover:text-sky-300'
                      : 'hover:bg-gray-100 text-gray-500 hover:text-blue-600'
                }`}
                title="Descargar PDF de booking"
              >
                {downloadingBooking === bookingKey ? (
                  <RefreshCcw className="h-3 w-3 animate-spin" />
                ) : (
                  <Download className="h-3 w-3" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Información de Nave y Naviera */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <Ship className={`h-3 w-3 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`} />
              <span className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>Nave</span>
            </div>
            {canEdit ? (
              <InlineEditCell
                value={transporte.nave}
                field="nave"
                record={transporte}
                onSave={onUpdate}
                type="text"
              />
            ) : (
              <span className={`text-xs ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                {formatValue(transporte.nave)}
              </span>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <MapPin className={`h-3 w-3 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`} />
              <span className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>Naviera</span>
            </div>
            {canEdit ? (
              <InlineEditCell
                value={transporte.naviera}
                field="naviera"
                record={transporte}
                onSave={onUpdate}
                type="text"
              />
            ) : (
              <span className={`text-xs ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                {formatValue(transporte.naviera)}
              </span>
            )}
          </div>
        </div>

        {/* Información de Conductor y Transportista */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <User className={`h-3 w-3 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`} />
              <span className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>Conductor</span>
            </div>
            {canEdit ? (
              <InlineEditCell
                value={transporte.conductor}
                field="conductor"
                record={transporte}
                onSave={onUpdate}
                type="text"
              />
            ) : (
              <span className={`text-xs ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                {formatValue(transporte.conductor)}
              </span>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <Truck className={`h-3 w-3 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`} />
              <span className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>Transportista</span>
            </div>
            {canEdit ? (
              <InlineEditCell
                value={transporte.transportes}
                field="transportes"
                record={transporte}
                onSave={onUpdate}
                type="text"
              />
            ) : (
              <span className={`text-xs ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                {formatValue(transporte.transportes)}
              </span>
            )}
          </div>
        </div>

        {/* Información de Temperatura y Ventilación */}
        {transporte.atmosfera_controlada && (
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <Thermometer className={`h-3 w-3 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`} />
                <span className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>T°</span>
              </div>
              {canEdit ? (
                <InlineEditCell
                  value={transporte.temperatura}
                  field="temperatura"
                  record={transporte}
                  onSave={onUpdate}
                  type="text"
                />
              ) : (
                <span className={`text-xs ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                  {formatValue(transporte.temperatura)}
                </span>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <Wind className={`h-3 w-3 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`} />
                <span className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>VENT</span>
              </div>
              {canEdit ? (
                <InlineEditCell
                  value={transporte.vent}
                  field="vent"
                  record={transporte}
                  onSave={onUpdate}
                  type="text"
                />
              ) : (
                <span className={`text-xs ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                  {formatValue(transporte.vent)}
                </span>
              )}
            </div>

            <div className="space-y-1">
              <span className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>CO₂/O₂</span>
              <div className="flex gap-1">
                {canEdit ? (
                  <>
                    <InlineEditCell
                      value={transporte.co2}
                      field="co2"
                      record={transporte}
                      onSave={onUpdate}
                      type="text"
                    />
                    <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>/</span>
                    <InlineEditCell
                      value={transporte.o2}
                      field="o2"
                      record={transporte}
                      onSave={onUpdate}
                      type="text"
                    />
                  </>
                ) : (
                  <span className={`text-xs ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                    {formatValue(transporte.co2)}/{formatValue(transporte.o2)}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Estados */}
        <div className="flex flex-wrap gap-2">
          {transporte.late && (
            <span className={`px-2 py-1 text-xs rounded-full font-medium ${
              theme === 'dark' ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-700'
            }`}>
              Late
            </span>
          )}
          {transporte.extra_late && (
            <span className={`px-2 py-1 text-xs rounded-full font-medium ${
              theme === 'dark' ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700'
            }`}>
              Extra Late
            </span>
          )}
          {transporte.porteo && (
            <span className={`px-2 py-1 text-xs rounded-full font-medium ${
              theme === 'dark' ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-700'
            }`}>
              Porteo
            </span>
          )}
          {transporte.ingresado_stacking && (
            <span className={`px-2 py-1 text-xs rounded-full font-medium ${
              theme === 'dark' ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'
            }`}>
              Ingresado Stacking
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
