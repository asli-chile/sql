'use client';

import React, { useState, useEffect } from 'react';
import { Edit3 } from 'lucide-react';
import { Registro } from '@/types/registros';
import { createClient } from '@/lib/supabase-browser';
import { logHistoryEntry } from '@/lib/history';
import { parseDateString } from '@/lib/date-utils';
import { calculateTransitTime } from '@/lib/transit-time-utils';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/hooks/useUser';
import { useEditingCell } from '@/contexts/EditingCellContext';

interface InlineEditCellProps {
  value: any;
  field: keyof Registro;
  record: Registro;
  onSave: (updatedRecord: Registro) => void;
  onBulkSave?: (field: keyof Registro, value: any, selectedRecords: Registro[]) => void;
  type?: 'text' | 'number' | 'date' | 'select' | 'textarea';
  options?: string[];
  className?: string;
  selectedRecords?: Registro[];
  isSelectionMode?: boolean;
  customDisplay?: React.ReactNode;
  displayAsVerticalList?: boolean;
}

export function InlineEditCell({ 
  value, 
  field, 
  record, 
  onSave, 
  onBulkSave,
  type = 'text', 
  options = [],
  className = '',
  selectedRecords = [],
  isSelectionMode = false,
  customDisplay,
  displayAsVerticalList = false
}: InlineEditCellProps) {
  
  // Función para procesar contenedores múltiples
  const processContainers = (containerValue: string): string => {
    if (!containerValue || containerValue.trim() === '') {
      return '';
    }
    
    // Siempre devolver como texto plano con espacios
    // Limpiar espacios múltiples y mantener formato: "cont1 cont2 cont3"
    return containerValue.trim().split(/\s+/).join(' ');
  };
  const { theme } = useTheme();
  
  const { canEdit, currentUser } = useUser();
  const { setEditingCell, isEditing: isEditingInContext, clearEditing } = useEditingCell();
  
  const [editValue, setEditValue] = useState(value || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastTap, setLastTap] = useState(0);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [showTapHint, setShowTapHint] = useState(false);
  
  const upsertRefClienteCatalog = async (supabaseClient: ReturnType<typeof createClient>, valor: string | null | undefined) => {
    const trimmed = (valor || '').trim();
    if (!trimmed) return;

    try {
      const { data, error } = await supabaseClient
        .from('catalogos')
        .select('id, valores')
        .eq('categoria', 'refCliente')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error leyendo catálogo refCliente:', error);
        return;
      }

      let valores: string[] = [];
      let recordId: string | undefined;

      if (data) {
        recordId = (data as any).id;
        valores = Array.isArray(data.valores) ? data.valores : [];
      }

      if (!valores.includes(trimmed)) {
        const nuevosValores = [...valores, trimmed];
        const payload = {
          categoria: 'refCliente',
          valores: nuevosValores,
          updated_at: new Date().toISOString(),
        };

        if (recordId) {
          await supabaseClient
            .from('catalogos')
            .update(payload)
            .eq('id', recordId);
        } else {
          await supabaseClient
            .from('catalogos')
            .insert({ ...payload, created_at: new Date().toISOString() });
        }
      }
    } catch (catalogError) {
      console.error('Error actualizando catálogo refCliente:', catalogError);
    }
  };

  // Determinar si esta celda específica está en edición
  const isEditing = isEditingInContext(record.id || '', field);
  
  // Detectar si es un dispositivo táctil
  useEffect(() => {
    const checkTouchDevice = () => {
      return (
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        // @ts-ignore
        navigator.msMaxTouchPoints > 0
      );
    };
    setIsTouchDevice(checkTouchDevice());
  }, []);

  useEffect(() => {
    setEditValue(value || '');
  }, [value]);

  // Mapear nombres de campos del tipo TypeScript a nombres de la base de datos
  const getDatabaseFieldName = (fieldName: keyof Registro): string => {
    const fieldMapping: Record<string, string> = {
      naveInicial: 'nave_inicial',
      tipoIngreso: 'tipo_ingreso',
      roleadaDesde: 'roleada_desde',
      ingresoStacking: 'ingreso_stacking',
      refAsli: 'ref_asli',
      refCliente: 'ref_cliente',
      tratamientoFrio: 'tratamiento de frio',
    };
    
    return fieldMapping[fieldName] || fieldName;
  };

  const handleSave = async (overrideValue?: any) => {
    const currentValue = overrideValue !== undefined ? overrideValue : editValue;

    if (currentValue === value) {
      clearEditing();
      return;
    }

    // Validaciones básicas
    if (type === 'number' && currentValue !== '' && currentValue !== null) {
      const numValue = parseFloat(currentValue);
      if (isNaN(numValue)) {
        setError('Debe ser un número válido');
        return;
      }
      
      // Validaciones específicas por campo
      if (field === 'temperatura' && (numValue < -1 || numValue > 1)) {
        setError('La temperatura debe estar entre -1°C y 1°C');
        return;
      }
      
      if ((field === 'co2' || field === 'o2') && (numValue < 0 || numValue > 100)) {
        setError('El porcentaje debe estar entre 0% y 100%');
        return;
      }
      
      if (field === 'cbm' && numValue < 0) {
        setError('El CBM debe ser un valor positivo');
        return;
      }
    }

    // Si hay registros seleccionados y estamos en modo selección, usar edición masiva
    if (isSelectionMode && selectedRecords.length > 1 && onBulkSave) {
      let processedValue = currentValue;
      
      // Procesar diferentes tipos de datos
      if (type === 'number') {
        processedValue = currentValue === '' ? null : parseFloat(currentValue);
      } else if (type === 'date') {
        if (currentValue) {
          processedValue = parseDateString(currentValue).toISOString();
        } else {
          processedValue = null;
        }
      } else if (field === 'contenedor') {
        // Procesar contenedores: convertir string a lista si hay múltiples
        processedValue = processContainers(currentValue);
      }
      
      onBulkSave(field, processedValue, selectedRecords);
      clearEditing();
      return;
    }

    setLoading(true);
    setError('');

    const previousValue = record[field];
    const previousTransitTime = record.tt;

    try {
      let processedValue = currentValue;

      // Procesar diferentes tipos de datos
      if (type === 'number') {
        processedValue = currentValue === '' ? null : parseFloat(currentValue);
      } else if (type === 'date') {
        if (currentValue) {
          processedValue = parseDateString(currentValue).toISOString();
        } else {
          processedValue = null;
        }
      } else if (field === 'contenedor') {
        // Procesar contenedores: convertir string a lista si hay múltiples
        processedValue = processContainers(currentValue);
      }

      // Obtener el nombre del campo en la base de datos
      const dbFieldName = getDatabaseFieldName(field);

      // Preparar datos para actualizar
      const updateData: any = {
        [dbFieldName]: processedValue,
        updated_at: new Date().toISOString()
      };

      // Si estamos editando ETD o ETA, recalcular TT
      if (field === 'etd' || field === 'eta') {
        const etd = field === 'etd' ? processedValue : record.etd;
        const eta = field === 'eta' ? processedValue : record.eta;
        const newTT = calculateTransitTime(etd, eta);
        updateData.tt = newTT;
      }

      const supabase = createClient();
      const { data, error: updateError } = await supabase
        .from('registros')
        .update(updateData)
        .eq('id', record.id)
        .select()
        .single();

      if (!data) {
        clearEditing();
        return;
      }

      if (field === 'refCliente' && typeof processedValue === 'string') {
        await upsertRefClienteCatalog(supabase, processedValue);
      }

      await logHistoryEntry(supabase, {
        registroId: record.id,
        field,
        previousValue,
        newValue: processedValue,
      });

      if ((field === 'etd' || field === 'eta') && updateData.tt !== undefined) {
        await logHistoryEntry(supabase, {
          registroId: record.id,
          field: 'tt',
          previousValue: previousTransitTime,
          newValue: updateData.tt,
        });
      }

      const updatedRecord: Registro = {
        ...record,
        ...data,
        [field]: processedValue,
        ...(field === 'etd' || field === 'eta' ? { tt: updateData.tt } : {})
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

  // Manejar el clic/toque para activar la edición
  const handleCellClick = () => {
    if (!canEdit) return;

    // En dispositivos táctiles, requerir doble tap
    if (isTouchDevice) {
      const now = Date.now();
      const DOUBLE_TAP_DELAY = 300; // 300ms para considerar un doble tap
      
      if (now - lastTap < DOUBLE_TAP_DELAY) {
        // Doble tap detectado, activar edición
        setEditingCell(record.id || '', field);
        setLastTap(0);
        setShowTapHint(false);
      } else {
        // Primer tap, mostrar hint
        setLastTap(now);
        setShowTapHint(true);
        setTimeout(() => setShowTapHint(false), 1500);
      }
    } else {
      // En desktop, activar inmediatamente con un solo clic
      setEditingCell(record.id || '', field);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const target = e.currentTarget as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      handleSave(target.value);
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const formatDisplayValue = (val: any) => {
    if (val === null || val === undefined || val === '') return '-';
    
    if (type === 'date' && val) {
      return new Date(val).toLocaleDateString('es-CL');
    }
    
    if (type === 'number' && val !== null) {
      if (field === 'temperatura') {
        return `${val}°C`;
      } else if (field === 'co2' || field === 'o2') {
        return `${val}%`;
      }
      return val.toString();
    }
    
    return val.toString();
  };

  const getDisplayStyle = (val: any) => {
    if (field === 'estado') {
      if (val === 'CONFIRMADO') {
        return theme === 'dark'
          ? 'bg-green-900/30 text-green-300 px-2 py-0.5 rounded-full text-[10px] font-semibold'
          : 'bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-[10px] font-semibold';
      } else if (val === 'CANCELADO') {
        return theme === 'dark'
          ? 'bg-red-900/30 text-red-300 px-2 py-0.5 rounded-full text-[10px] font-semibold'
          : 'bg-red-100 text-red-800 px-2 py-0.5 rounded-full text-[10px] font-semibold';
      } else if (val === 'PENDIENTE') {
        return theme === 'dark'
          ? 'bg-yellow-900/30 text-yellow-300 px-2 py-0.5 rounded-full text-[10px] font-semibold'
          : 'bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full text-[10px] font-semibold';
      } else {
        return theme === 'dark'
          ? 'bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full text-[10px] font-semibold'
          : 'bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full text-[10px] font-semibold';
      }
    }
    
    if (field === 'tipoIngreso') {
      if (val === 'NORMAL') {
        return theme === 'dark'
          ? 'bg-green-600 text-white px-2 py-0.5 rounded-full text-[10px] font-semibold'
          : 'bg-green-500 text-white px-2 py-0.5 rounded-full text-[10px] font-semibold';
      } else if (val === 'EARLY') {
        return theme === 'dark'
          ? 'bg-cyan-600 text-white px-2 py-0.5 rounded-full text-[10px] font-semibold'
          : 'bg-cyan-500 text-white px-2 py-0.5 rounded-full text-[10px] font-semibold';
      } else if (val === 'LATE') {
        return theme === 'dark'
          ? 'bg-yellow-600 text-white px-2 py-0.5 rounded-full text-[10px] font-semibold'
          : 'bg-yellow-500 text-white px-2 py-0.5 rounded-full text-[10px] font-semibold';
      } else if (val === 'EXTRA LATE') {
        return theme === 'dark'
          ? 'bg-red-600 text-white px-2 py-0.5 rounded-full text-[10px] font-semibold'
          : 'bg-red-500 text-white px-2 py-0.5 rounded-full text-[10px] font-semibold';
      }
    }
    
    return theme === 'dark' ? 'font-semibold text-gray-100' : 'font-semibold text-gray-900';
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        {type === 'select' ? (
          <select
            value={editValue}
            onChange={(e) => {
              const newValue = e.target.value;
              setEditValue(newValue);
              handleSave(newValue);
            }}
            className="px-1 py-0.5 text-[10px] border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 dark:text-white dark:border-gray-600"
            autoFocus
          >
            <option value="">Seleccionar opción</option>
            {options.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        ) : type === 'date' ? (
          <input
            type="date"
            value={editValue ? new Date(editValue).toISOString().split('T')[0] : ''}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={(e) => handleSave(e.target.value)}
            onKeyDown={handleKeyDown}
            className="px-1 py-0.5 text-[10px] border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 dark:text-white dark:border-gray-600"
            autoFocus
          />
        ) : type === 'textarea' ? (
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={(e) => handleSave(e.target.value)}
            onKeyDown={handleKeyDown}
            className="px-1 py-0.5 text-[10px] border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 dark:text-white dark:border-gray-600 resize-none"
            rows={3}
            cols={20}
            autoFocus
          />
        ) : (
          <input
            type={type}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={(e) => handleSave(e.target.value)}
            onKeyDown={handleKeyDown}
            className="px-1 py-0.5 text-[10px] border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 dark:text-white dark:border-gray-600"
            autoComplete="off"
            autoFocus
          />
        )}
        {error && (
          <span className="text-[10px] text-red-500 ml-2">{error}</span>
        )}
      </div>
    );
  }

  // Verificar si el registro actual está seleccionado
  const isCurrentRecordSelected = selectedRecords.some(selected => selected.id === record.id);
  // Solo mostrar el indicador en REF ASLI para mejor UX
  const shouldShowBulkIndicator = field === 'refAsli' && isSelectionMode && selectedRecords.length > 1 && isCurrentRecordSelected;

  return (
    <div 
      className={`flex items-center gap-1 group rounded px-2 py-0.5 transition-colors relative ${className} ${
        shouldShowBulkIndicator 
          ? theme === 'dark'
            ? 'bg-blue-900/30 border border-blue-600'
            : 'bg-blue-100 border border-blue-300'
          : ''
      } ${
        showTapHint
          ? theme === 'dark'
            ? 'bg-yellow-900/40 border border-yellow-500'
            : 'bg-yellow-100 border border-yellow-400'
          : theme === 'dark'
            ? 'hover:bg-gray-700'
            : 'hover:bg-blue-50'
      } ${
        canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
      }`}
      onClick={handleCellClick}
      title={
        !canEdit 
          ? "No tienes permisos para editar"
          : isTouchDevice
            ? "Toca dos veces para editar"
            : shouldShowBulkIndicator
              ? `Editar ${selectedRecords.length} registros seleccionados`
              : onBulkSave === undefined
                ? "Campo único - Solo edición individual"
                : "Haz clic para editar"
      }
    >
      {customDisplay ? (
        <div className="flex-1">
          {customDisplay}
        </div>
      ) : (
        <span className={`w-full text-center ${getDisplayStyle(value)}`}>
          {formatDisplayValue(value)}
        </span>
      )}
      {showTapHint && (
        <span className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-[10px] bg-yellow-500 text-white px-2 py-0.5 rounded-full font-semibold whitespace-nowrap z-10 shadow-md animate-pulse">
          Toca de nuevo
        </span>
      )}
      {shouldShowBulkIndicator && (
        <span className="text-[10px] bg-blue-500 text-white px-1 py-0.5 rounded-full font-semibold">
          {selectedRecords.length}
        </span>
      )}
      {canEdit && !showTapHint && (
        <Edit3 
          size={12} 
          className="text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" 
        />
      )}
    </div>
  );
}

