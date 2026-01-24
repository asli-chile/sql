'use client';

import React, { useState, useEffect } from 'react';
import { Edit3 } from 'lucide-react';
import { TransporteRecord } from '@/lib/transportes-service';
import { createClient } from '@/lib/supabase-browser';
import { useEditingCell } from '@/contexts/EditingCellContext';
import { useUser } from '@/hooks/useUser';
import { useTheme } from '@/contexts/ThemeContext';

interface InlineEditCellProps {
  value: any;
  field: keyof TransporteRecord;
  record: TransporteRecord;
  onSave: (updatedRecord: TransporteRecord) => void;
  type?: 'text' | 'number' | 'date' | 'select';
  options?: string[];
  className?: string;
}

const dateKeys = new Set<keyof TransporteRecord>([
  'stacking',
  'fin_stacking',
  'cut_off',
  'fecha_planta',
  'created_at',
  'updated_at',
]);

// Columnas que no se deben editar en transportes
const READONLY_FIELDS = [
  'semana',        // wk
  'exportacion',   // export
  'booking',       // booking
  'nave',          // nave
  'naviera',       // naviera
  'especie',       // especie
  'at_controlada', // at controlada
  'co2',           // co2
  'o2',            // 02
  'temperatura',   // temperatura
  'vent',          // ventilacion cbm
  'pol',           // pol
  'pod'            // pod
];

export function InlineEditCell({
  value,
  field,
  record,
  onSave,
  type = 'text',
  options = [],
  className = '',
}: InlineEditCellProps) {
  const { canEdit } = useUser();
  const { theme } = useTheme();
  const { setEditingCell, isEditing: isEditingInContext, clearEditing } = useEditingCell();

  const [editValue, setEditValue] = useState(value || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Determinar si el campo es editable
  const isFieldEditable = () => {
    if (!canEdit) return false;
    
    // Bloquear columnas específicas que no se deben editar
    if (READONLY_FIELDS.includes(field)) {
      return false;
    }
    
    return true; // Permitir editar las demás columnas
  };

  const isEditable = isFieldEditable();
  const isEditing = isEditingInContext(record.id, field);
  const isDateField = dateKeys.has(field);

  useEffect(() => {
    if (isDateField && value) {
      // Manejar fechas sin conversión de zona horaria
      if (typeof value === 'string') {
        // Si ya es un string en formato YYYY-MM-DD, usarlo directamente
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          setEditValue(value);
        } else {
          // Si es una fecha ISO, extraer solo la parte de fecha
          const date = new Date(value + 'T00:00:00');
          if (!Number.isNaN(date.getTime())) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            setEditValue(`${year}-${month}-${day}`);
          } else {
            setEditValue('');
          }
        }
      } else {
        setEditValue('');
      }
    } else {
      setEditValue(value || '');
    }
  }, [value, isDateField]);

  const handleSave = async () => {
    if (!canEdit) return;

    try {
      setLoading(true);
      setError('');

      const supabase = createClient();
      let processedValue: any = editValue;

      // Procesar según el tipo
      if (type === 'number') {
        processedValue = editValue === '' ? null : Number(editValue);
      } else if (isDateField && editValue) {
        // Para fechas, usar el string directamente (ya está en formato YYYY-MM-DD)
        // No convertir a Date para evitar problemas de zona horaria
        const dateStr = editValue.trim();
        if (dateStr === '') {
          processedValue = null;
        } else {
          // Validar que sea un formato de fecha válido YYYY-MM-DD
          if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            // Usar el string directamente sin conversión de zona horaria
            processedValue = dateStr;
          } else {
            processedValue = null;
          }
        }
      } else if (type === 'text') {
        processedValue = editValue === '' ? null : String(editValue).trim();
      }

      const { error: updateError } = await supabase
        .from('transportes')
        .update({ [field]: processedValue })
        .eq('id', record.id);

      if (updateError) {
        throw updateError;
      }

      const updatedRecord: TransporteRecord = {
        ...record,
        [field]: processedValue,
      };

      onSave(updatedRecord);
      clearEditing();
    } catch (err: any) {
      setError(err.message || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value || '');
    clearEditing();
    setError('');
  };

  const handleCellClick = () => {
    if (!canEdit) return;
    
    // Usar la misma lógica de isFieldEditable para mantener consistencia
    if (!isFieldEditable()) {
      return;
    }
    
    setEditingCell(record.id, field);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const target = e.currentTarget as HTMLInputElement | HTMLSelectElement;
      setEditValue(target.value);
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const formatDisplayValue = (val: any) => {
    if (val === null || val === undefined || val === '') {
      return '—';
    }

    if (isDateField && typeof val === 'string') {
      const date = new Date(val);
      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleDateString('es-CL');
      }
    }

    if (typeof val === 'boolean') {
      return val ? 'Sí' : 'No';
    }

    return String(val);
  };

  if (!canEdit) {
    return (
      <span className={`text-sm text-center ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900 font-medium'} ${className}`}>
        {formatDisplayValue(value)}
      </span>
    );
  }

  if (isEditing) {
    return (
      <div className="relative">
        {type === 'select' && options.length > 0 ? (
          <select
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            autoFocus
            className={`w-full rounded border px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 ${
              theme === 'dark'
                ? 'border-sky-500 bg-slate-900 text-slate-100 focus:ring-sky-500/50'
                : 'border-blue-500 bg-white text-gray-900 focus:ring-blue-500/50 shadow-sm'
            }`}
            disabled={loading}
          >
            <option value="">—</option>
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        ) : isDateField ? (
          <input
            type="date"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            autoFocus
            className={`w-full rounded border px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 ${
              theme === 'dark'
                ? 'border-sky-500 bg-slate-900 text-slate-100 focus:ring-sky-500/50'
                : 'border-blue-500 bg-white text-gray-900 focus:ring-blue-500/50 shadow-sm'
            }`}
            disabled={loading}
          />
        ) : type === 'number' ? (
          <input
            type="number"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            autoFocus
            className={`w-full rounded border px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 ${
              theme === 'dark'
                ? 'border-sky-500 bg-slate-900 text-slate-100 focus:ring-sky-500/50'
                : 'border-blue-500 bg-white text-gray-900 focus:ring-blue-500/50 shadow-sm'
            }`}
            disabled={loading}
          />
        ) : (
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            autoFocus
            className={`w-full rounded border px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 ${
              theme === 'dark'
                ? 'border-sky-500 bg-slate-900 text-slate-100 focus:ring-sky-500/50'
                : 'border-blue-500 bg-white text-gray-900 focus:ring-blue-500/50 shadow-sm'
            }`}
            disabled={loading}
          />
        )}
        {error && (
          <span className="absolute -bottom-5 left-0 text-[10px] text-rose-400">
            {error}
          </span>
        )}
        {loading && (
          <span className="absolute -bottom-5 left-0 text-[10px] text-sky-400">
            Guardando...
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={handleCellClick}
      className={`group flex items-center gap-1 rounded px-1 py-0.5 -mx-1 -my-0.5 transition-colors ${
        isEditable
          ? theme === 'dark'
            ? 'hover:bg-slate-800/50 cursor-pointer'
            : 'hover:bg-gray-100 cursor-pointer'
          : 'cursor-not-allowed opacity-75'
      } ${className}`}
      title={
        !isEditable && READONLY_FIELDS.includes(field)
          ? `Campo bloqueado: ${field} no se puede editar`
          : isEditable
            ? 'Click para editar'
            : 'Campo no editable'
      }
    >
      <span className={`text-sm flex-1 text-center ${
        theme === 'dark' ? 'text-slate-200' : 'text-gray-900 font-medium'
      }`}>
        {formatDisplayValue(value)}
      </span>
      {isEditable ? (
        <Edit3 className={`h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity ${
          theme === 'dark' ? 'text-slate-500' : 'text-gray-500'
        }`} />
      ) : null}
    </div>
  );
}

