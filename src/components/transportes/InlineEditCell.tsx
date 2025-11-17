'use client';

import React, { useState, useEffect } from 'react';
import { Edit3 } from 'lucide-react';
import { TransporteRecord } from '@/lib/transportes-service';
import { createClient } from '@/lib/supabase-browser';
import { useEditingCell } from '@/contexts/EditingCellContext';
import { useUser } from '@/hooks/useUser';

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
  'cut_off',
  'fecha_planta',
  'created_at',
  'updated_at',
]);

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
  const { setEditingCell, isEditing: isEditingInContext, clearEditing } = useEditingCell();

  const [editValue, setEditValue] = useState(value || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEditing = isEditingInContext(record.id, field);
  const isDateField = dateKeys.has(field);

  useEffect(() => {
    if (isDateField && value) {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) {
        setEditValue(date.toISOString().split('T')[0]);
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
        processedValue = new Date(editValue).toISOString();
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
      <span className={`text-sm text-slate-200 ${className}`}>
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
            className="w-full rounded border border-sky-500 bg-slate-900 px-2 py-1 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
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
            className="w-full rounded border border-sky-500 bg-slate-900 px-2 py-1 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
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
            className="w-full rounded border border-sky-500 bg-slate-900 px-2 py-1 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
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
            className="w-full rounded border border-sky-500 bg-slate-900 px-2 py-1 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
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
      className={`group flex items-center gap-1 cursor-pointer hover:bg-slate-800/50 rounded px-1 py-0.5 -mx-1 -my-0.5 transition-colors ${className}`}
    >
      <span className="text-sm text-slate-200 flex-1">{formatDisplayValue(value)}</span>
      <Edit3 className="h-3 w-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

