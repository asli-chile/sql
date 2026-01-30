'use client';

import React, { useState, useEffect } from 'react';
import { Edit3 } from 'lucide-react';
import { TransporteRecord } from '@/lib/transportes-service';
import { createClient } from '@/lib/supabase-browser';
import { useEditingCell } from '@/contexts/EditingCellContext';
import { useUser } from '@/hooks/useUser';
import { useTheme } from '@/contexts/ThemeContext';
import { refreshTrackingForRegistro } from '@/lib/auto-tracking-sync';

interface InlineEditCellProps {
  value: any;
  field: keyof TransporteRecord;
  record: TransporteRecord;
  onSave: (updatedRecord: TransporteRecord) => void;
  type?: 'text' | 'number' | 'date' | 'datetime' | 'time' | 'select';
  options?: string[];
  className?: string;
}

const dateKeys = new Set<keyof TransporteRecord>([
  'cut_off_documental',
  'fecha_planta',
  'dia_presentacion',
  'created_at',
  'updated_at',
]);

const datetimeKeys = new Set<keyof TransporteRecord>([
  'stacking',           // Inicio stacking (fecha y hora)
  'fin_stacking',       // Fin stacking (fecha y hora)
  'ingreso_stacking',   // Ingresado stacking (fecha y hora)
  'cut_off',            // Cut off (fecha y hora)
]);

const timeKeys = new Set<keyof TransporteRecord>([
  'hora_presentacion',
  'llegada_planta',
  'salida_planta',
  'hora_planta',
  'horario_retiro',
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
  const [plantasOptions, setPlantasOptions] = useState<string[]>([]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showDatetimePicker, setShowDatetimePicker] = useState(false);

  // Cargar catálogo de plantas si el campo es 'planta'
  useEffect(() => {
    if (field === 'planta') {
      console.log('🔄 InlineEditCell: Cargando catálogo de plantas para campo:', field);
      const loadPlantas = async () => {
        try {
          const response = await fetch('/api/catalogos/plantas');
          console.log('📡 InlineEditCell: Response status:', response.status);
          
          if (response.ok) {
            const data = await response.json();
            console.log('📋 InlineEditCell: Plantas recibidas:', data.plantas);
            console.log('📋 InlineEditCell: Longitud:', data.plantas?.length);
            setPlantasOptions(data.plantas || []);
          } else {
            console.error('❌ InlineEditCell: Error en respuesta:', response.statusText);
          }
        } catch (error) {
          console.error('💥 InlineEditCell: Error cargando plantas:', error);
        }
      };
      loadPlantas();
    }
  }, [field]);

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
  const isTimeField = timeKeys.has(field) || type === 'time';
  const isDateTimeField = datetimeKeys.has(field) || type === 'datetime';

  // Usar plantasOptions si el campo es planta, sino usar options
  const selectOptions = field === 'planta' ? plantasOptions : options;

  // Debug logs
  if (field === 'planta') {
    console.log('🔍 InlineEditCell Debug:', {
      field,
      type,
      isEditing,
      plantasOptionsLength: plantasOptions.length,
      selectOptionsLength: selectOptions.length,
      selectOptions: selectOptions.slice(0, 3) // Primeras 3 opciones
    });
  }

  useEffect(() => {
    if (isDateField && value) {
      // Para fechas, manejar conversión entre formatos
      console.log('🗓️ Cargando fecha:', { value, field });
      if (typeof value === 'string') {
        // Si viene de BD en formato YYYY-MM-DD, convertir a DD-MM-YYYY para mostrar
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          const [year, month, day] = value.split('-');
          const displayDate = `${day}-${month}-${year}`;
          setEditValue(displayDate); // Guardar en formato DD-MM-YYYY
        } 
        // Si ya está en formato DD-MM-YYYY, usarlo directamente
        else if (/^\d{2}-\d{2}-\d{4}$/.test(value)) {
          setEditValue(value);
        } else {
          setEditValue('');
        }
      } else {
        setEditValue('');
      }
    } else if (isTimeField && value) {
      // Para hora, usar el valor directamente si es un string de hora
      if (typeof value === 'string') {
        setEditValue(value);
      } else {
        setEditValue('');
      }
    } else if (isDateTimeField && value) {
      // Para datetime, formatear para input datetime-local
      console.log('Datetime field value:', value, 'type:', typeof value);
      if (typeof value === 'string') {
        // Si es un string de fecha/hora, formatearlo para datetime-local
        let date: Date;
        
        // Intentar parsear diferentes formatos
        if (value.includes('T')) {
          // Ya está en formato ISO
          date = new Date(value);
        } else if (value.includes(' ')) {
          // Formato "YYYY-MM-DD HH:MM"
          date = new Date(value.replace(' ', 'T'));
        } else {
          // Otro formato, intentar directamente
          date = new Date(value);
        }
        
        console.log('Parsed date:', date, 'isValid:', !Number.isNaN(date.getTime()));
        if (!Number.isNaN(date.getTime())) {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          const formattedValue = `${year}-${month}-${day}T${hours}:${minutes}`;
          console.log('Formatted datetime value:', formattedValue);
          setEditValue(formattedValue);
        } else {
          console.log('Invalid date, setting current datetime');
          // Si no se puede parsear, usar fecha y hora actual
          const now = new Date();
          const year = now.getFullYear();
          const month = String(now.getMonth() + 1).padStart(2, '0');
          const day = String(now.getDate()).padStart(2, '0');
          const hours = String(now.getHours()).padStart(2, '0');
          const minutes = String(now.getMinutes()).padStart(2, '0');
          setEditValue(`${year}-${month}-${day}T${hours}:${minutes}`);
        }
      } else {
        console.log('Value is not string, setting current datetime');
        // Si no es string, usar fecha y hora actual
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        setEditValue(`${year}-${month}-${day}T${hours}:${minutes}`);
      }
    } else {
      setEditValue(value || '');
    }
  }, [value, isDateField, isTimeField, isDateTimeField]);

  // Resetear estados cuando empieza a editar
  useEffect(() => {
    if (isEditing) {
      setShowCalendar(false);
      setShowDatetimePicker(false);
    }
  }, [isEditing]);

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
        // Para fechas, convertir DD-MM-YYYY a YYYY-MM-DD para BD
        if (/^\d{2}-\d{2}-\d{4}$/.test(editValue)) {
          const [day, month, year] = editValue.split('-');
          processedValue = `${year}-${month}-${day}`; // YYYY-MM-DD para BD
        } else {
          processedValue = null;
        }
      } else if (isTimeField && editValue) {
        // Para hora, limpiar y formatear correctamente
        let cleanValue = editValue.trim();
        
        // Si está en formato HHMM, convertir a HH:MM
        if (/^\d{4}$/.test(cleanValue)) {
          const hours = cleanValue.slice(0, 2);
          const minutes = cleanValue.slice(2, 4);
          cleanValue = `${hours}:${minutes}`;
        }
        
        // Validar formato HH:MM
        if (/^\d{2}:\d{2}$/.test(cleanValue)) {
          const [hours, minutes] = cleanValue.split(':');
          const hourNum = parseInt(hours);
          const minuteNum = parseInt(minutes);
          
          if (hourNum <= 23 && minuteNum <= 59) {
            processedValue = cleanValue;
          } else {
            console.error('Hora inválida:', cleanValue);
            processedValue = null;
          }
        } else {
          console.error('Formato de hora inválido:', cleanValue);
          processedValue = null;
        }
      } else if (isDateTimeField && editValue) {
        // Para datetime, convertir a formato ISO
        const dateStr = editValue.trim();
        if (dateStr === '') {
          processedValue = null;
        } else {
          // Convertir datetime-local a ISO string
          const date = new Date(dateStr);
          if (!Number.isNaN(date.getTime())) {
            processedValue = date.toISOString();
          } else {
            processedValue = null;
          }
        }
      } else if (type === 'select') {
        processedValue = editValue === '' ? null : String(editValue).trim();
      } else if (type === 'text') {
        processedValue = editValue === '' ? null : String(editValue).trim();
      }

      console.log('Guardando:', { field, processedValue, type: typeof processedValue });

      const { error: updateError } = await supabase
        .from('transportes')
        .update({ [field]: processedValue })
        .eq('id', record.id);

      console.log('Respuesta:', { updateError, hasError: !!updateError });

      if (updateError) {
        console.error('Error updating record:', updateError);
        setError('Error al guardar');
        return;
      }

      // Para fechas, mantener formato DD/MM/YYYY en el registro actualizado
      let updatedRecord = { ...record, [field]: processedValue };
      if (isDateField && processedValue && /^\d{4}-\d{2}-\d{2}$/.test(processedValue)) {
        const [year, month, day] = processedValue.split('-');
        updatedRecord = { ...record, [field]: `${day}/${month}/${year}` };
      }
      // Para datetime, mantener formato ISO en la BD pero el display se manejará con formatDisplayValue
      else if (isDateTimeField && processedValue) {
        // Mantener el valor ISO para la BD, la visualización se manejará con formatDisplayValue
        updatedRecord = { ...record, [field]: processedValue };
      }

      onSave(updatedRecord);
      
      // Actualizar tracking automáticamente si el transporte tiene registro_id
      if (record.registro_id) {
        try {
          await refreshTrackingForRegistro(record.registro_id);
        } catch (trackingError) {
          console.warn('⚠️ Error al actualizar tracking después de editar transporte:', trackingError);
        }
      }
      
      clearEditing();
    } catch (err) {
      console.error('Error in handleSave:', err);
      setError('Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelect = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const formattedDate = `${day}-${month}-${year}`;
    setEditValue(formattedDate);
    setShowCalendar(false);
    // Pequeño delay antes de guardar para asegurar que el valor se actualice
    setTimeout(() => {
      handleSave();
    }, 100);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showCalendar) {
        const target = event.target as Element;
        if (!target.closest('.calendar-container')) {
          setShowCalendar(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCalendar]);

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
      // Si está en formato YYYY-MM-DD, convertir a DD/MM/YYYY
      if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
        const [year, month, day] = val.split('-');
        return `${day}/${month}/${year}`;
      }
      // Si ya está en formato DD-MM-YYYY, convertir a DD/MM/YYYY
      if (/^\d{2}-\d{2}-\d{4}$/.test(val)) {
        const [day, month, year] = val.split('-');
        return `${day}/${month}/${year}`;
      }
      // Si ya está en formato DD/MM/YYYY, mostrarlo directamente
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(val)) {
        return val;
      }
    }

    if (isDateTimeField && typeof val === 'string') {
      // Para campos datetime, formatear a DD/MM/YYYY HH:MM
      let date: Date;
      
      // Intentar parsear diferentes formatos
      if (val.includes('T')) {
        // Formato ISO: 2024-01-15T14:30:00.000Z
        date = new Date(val);
      } else if (val.includes(' ')) {
        // Formato "YYYY-MM-DD HH:MM"
        date = new Date(val.replace(' ', 'T'));
      } else {
        // Otro formato, intentar directamente
        date = new Date(val);
      }
      
      if (!isNaN(date.getTime())) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}`;
      }
    }

    if (isTimeField && typeof val === 'string') {
      // Si está en formato HHMM, convertir a HH:MM
      if (/^\d{4}$/.test(val)) {
        const hours = val.slice(0, 2);
        const minutes = val.slice(2, 4);
        return `${hours}:${minutes}`;
      }
      // Si ya está en formato HH:MM, mostrarlo directamente
      if (/^\d{2}:\d{2}$/.test(val)) {
        return val;
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
    console.log('🎯 InlineEditCell Render Debug:', {
      field,
      type,
      isEditing,
      isDateField,
      isTimeField,
      isDateTimeField,
      selectOptionsLength: selectOptions.length,
      hasSelectOptions: selectOptions.length > 0,
      shouldRenderSelect: field === 'planta' || (type === 'select' && selectOptions.length > 0)
    });

    return (
      <div className="relative">
        {/* SIEMPRE mostrar select para el campo planta */}
        {field === 'planta' ? (
          <>
            <select
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              autoFocus
              className={`w-full rounded border px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 ${
                theme === 'dark'
                  ? 'border-slate-600 bg-slate-800 text-slate-200 focus:ring-sky-500'
                  : 'border-gray-300 bg-white text-gray-900 focus:ring-blue-500'
              } ${className}`}
            >
              <option value="">Seleccionar planta...</option>
              {selectOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <div className="text-xs text-gray-500 mt-1">
              {selectOptions.length} plantas disponibles
            </div>
          </>
        ) : type === 'select' && selectOptions.length > 0 ? (
          <>
            <select
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              autoFocus
              className={`w-full rounded border px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 ${
                theme === 'dark'
                  ? 'border-slate-600 bg-slate-800 text-slate-200 focus:ring-sky-500'
                  : 'border-gray-300 bg-white text-gray-900 focus:ring-blue-500'
              } ${className}`}
            >
              <option value="">Seleccionar...</option>
              {selectOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <div className="text-xs text-gray-500 mt-1">
              {selectOptions.length} opciones disponibles
            </div>
          </>
        ) : isDateField || type === 'date' ? (
          <>
            <div className="relative">
              <input
                type="date"
                value={(() => {
                  // Convertir DD-MM-YYYY a YYYY-MM-DD para el input
                  if (editValue && /^\d{2}-\d{2}-\d{4}$/.test(editValue)) {
                    const [day, month, year] = editValue.split('-');
                    return `${year}-${month}-${day}`;
                  }
                  return editValue;
                })()}
                onChange={(e) => {
                  if (e.target.value) {
                    // Convertir YYYY-MM-DD a DD-MM-YYYY para display
                    const [year, month, day] = e.target.value.split('-');
                    const displayDate = `${day}-${month}-${year}`;
                    setEditValue(displayDate);
                  }
                }}
                onBlur={(e) => {
                  if (e.target.value) {
                    // Guardar en BD en formato YYYY-MM-DD
                    const supabase = createClient();
                    supabase
                      .from('transportes')
                      .update({ [field]: e.target.value }) // YYYY-MM-DD para BD
                      .eq('id', record.id)
                      .select('*')
                      .single()
                      .then(({ data, error }) => {
                        if (!error) {
                          const [year, month, day] = e.target.value.split('-');
                          const displayDate = `${day}-${month}-${year}`;
                          const updatedRecord = { ...record, [field]: displayDate };
                          onSave(updatedRecord);
                          clearEditing();
                        } else {
                          console.error('Error guardando fecha:', error);
                        }
                      });
                  }
                }}
                onKeyDown={handleKeyDown}
                autoFocus
                className={`w-full rounded border px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 ${
                  theme === 'dark'
                    ? 'border-sky-500 bg-slate-900 text-slate-100 focus:ring-sky-500/50'
                    : 'border-blue-500 bg-white text-gray-900 focus:ring-blue-500/50 shadow-sm'
                }`}
                disabled={loading}
              />
              <div className="text-xs text-gray-500 mt-1">
                📅 Calendario (DD-MM-AAAA)
              </div>
            </div>
          </>
        ) : isTimeField || (type as string) === 'time' ? (
          <>
            <input
              type="text"
              placeholder="HH:MM"
              value={editValue}
              onChange={(e) => {
                let value = e.target.value.replace(/\D/g, ''); // Solo números
                
                // Limitar a 4 dígitos máximo (HHMM)
                if (value.length > 4) {
                  value = value.slice(0, 4);
                }
                
                // Agregar dos puntos automáticamente después de 2 dígitos
                if (value.length === 2) {
                  value = value + ':';
                } else if (value.length > 2 && !value.includes(':')) {
                  // Si somehow no tiene :, agregarlo
                  value = value.slice(0, 2) + ':' + value.slice(2);
                }
                
                setEditValue(value);
              }}
              onBlur={(e) => {
                // Usar el mismo handleSave para consistencia
                handleSave();
              }}
              onKeyDown={handleKeyDown}
              autoFocus
              maxLength={5} // HH:MM = 5 caracteres
              className={`w-full rounded border px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 ${
                theme === 'dark'
                  ? 'border-sky-500 bg-slate-900 text-slate-100 focus:ring-sky-500/50'
                  : 'border-blue-500 bg-white text-gray-900 focus:ring-blue-500/50 shadow-sm'
              }`}
              disabled={loading}
            />
            <div className="text-xs text-gray-500 mt-1">
              🕐 Hora (24h) - Formato HH:MM
            </div>
          </>
        ) : isDateTimeField || (type as string) === 'datetime' ? (
          <>
            <input
              type="datetime-local"
              value={editValue}
              onChange={(e) => {
                console.log('Datetime input change:', e.target.value);
                setEditValue(e.target.value);
              }}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              autoFocus
              step="60" // Forzar minutos como unidad mínima
              className={`w-full rounded border px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 ${
                theme === 'dark'
                  ? 'border-sky-500 bg-slate-900 text-slate-100 focus:ring-sky-500/50'
                  : 'border-blue-500 bg-white text-gray-900 focus:ring-blue-500/50 shadow-sm'
              }`}
              disabled={loading}
            />
            <div className="text-xs text-gray-500 mt-1">
              📅🕐 Seleccionar fecha y hora
            </div>
          </>
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
          <>
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
            {type === 'select' && (
              <div className="text-xs text-red-500 mt-1">
                Cargando opciones... ({selectOptions.length})
              </div>
            )}
          </>
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

