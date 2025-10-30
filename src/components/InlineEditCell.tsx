'use client';

import React, { useState, useEffect } from 'react';
import { Check, X, Edit3 } from 'lucide-react';
import { Registro } from '@/types/registros';
import { createClient } from '@/lib/supabase-browser';
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
  const processContainers = (containerValue: string): string | string[] => {
    if (!containerValue || containerValue.trim() === '') {
      return '';
    }
    
    // Si contiene espacios, es múltiple - convertir a lista
    if (containerValue.includes(' ')) {
      return containerValue.split(/\s+/).filter(container => container.trim() !== '');
    }
    
    // Si es uno solo, mantener como string
    return containerValue.trim();
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
  const [catalogSuggestions, setCatalogSuggestions] = useState<string[]>([]);
  
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

  // Debug básico
  console.log('🚀 InlineEditCell se está renderizando para campo:', field);

  useEffect(() => {
    setEditValue(value || '');
  }, [value]);

  // Cargar sugerencias del catálogo cuando se entra en modo edición
  useEffect(() => {
    if (!isEditing || type === 'select' || type === 'date' || type === 'number') {
      return;
    }

    const loadCatalogSuggestions = async () => {
      try {
        const supabase = createClient();
        
        // Mapear campos a categorías del catálogo
        const fieldToCatalogCategory: Record<string, string> = {
          'naviera': 'navieras',
          'naveInicial': 'naves',
          'viaje': 'viajes',
          'ejecutivo': 'ejecutivos',
          'especie': 'especies',
          'shipper': 'shippers',
          'pol': 'puertos_origen',
          'pod': 'puertos_destino',
          'deposito': 'depositos',
          'flete': 'fletes',
          'roleadaDesde': 'roleada_desde',
          'tipoIngreso': 'tipos_ingreso',
          'estado': 'estados',
          'estadoBl': 'estados_bl',
          'ct': 'cts'
        };

        const category = fieldToCatalogCategory[field];
        
        if (!category) {
          // Si no hay categoría mapeada, no cargar sugerencias
          setCatalogSuggestions([]);
          return;
        }

        const { data, error } = await supabase
          .from('catalogos')
          .select('valores')
          .eq('categoria', category)
          .single();

        if (error) {
          console.warn(`No se encontraron sugerencias para ${category}:`, error);
          setCatalogSuggestions([]);
          return;
        }

        if (data && Array.isArray(data.valores)) {
          setCatalogSuggestions(data.valores);
        } else {
          setCatalogSuggestions([]);
        }
      } catch (err) {
        console.error('Error cargando sugerencias del catálogo:', err);
        setCatalogSuggestions([]);
      }
    };

    loadCatalogSuggestions();
  }, [isEditing, field, type]);

  // Mapear nombres de campos del tipo TypeScript a nombres de la base de datos
  const getDatabaseFieldName = (fieldName: keyof Registro): string => {
    const fieldMapping: Record<string, string> = {
      'naveInicial': 'nave_inicial',
      'tipoIngreso': 'tipo_ingreso',
      'roleadaDesde': 'roleada_desde',
      'ingresoStacking': 'ingreso_stacking',
      'refAsli': 'ref_asli'
    };
    
    return fieldMapping[fieldName] || fieldName;
  };

  const handleSave = async () => {
    if (editValue === value) {
      clearEditing();
      return;
    }

    // Validaciones básicas
    if (type === 'number' && editValue !== '' && editValue !== null) {
      const numValue = parseFloat(editValue);
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
      let processedValue = editValue;
      
      // Procesar diferentes tipos de datos
      if (type === 'number') {
        processedValue = editValue === '' ? null : parseFloat(editValue);
      } else if (type === 'date') {
        if (editValue) {
          processedValue = parseDateString(editValue).toISOString();
        } else {
          processedValue = null;
        }
      } else if (field === 'contenedor') {
        // Procesar contenedores: convertir string a lista si hay múltiples
        processedValue = processContainers(editValue);
      }
      
      onBulkSave(field, processedValue, selectedRecords);
      clearEditing();
      return;
    }

    setLoading(true);
    setError('');

    try {
      let processedValue = editValue;

      // Procesar diferentes tipos de datos
      if (type === 'number') {
        processedValue = editValue === '' ? null : parseFloat(editValue);
      } else if (type === 'date') {
        if (editValue) {
          processedValue = parseDateString(editValue).toISOString();
        } else {
          processedValue = null;
        }
      } else if (field === 'contenedor') {
        // Procesar contenedores: convertir string a lista si hay múltiples
        processedValue = processContainers(editValue);
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
        .eq('id', record.id);

      if (updateError) {
        throw updateError;
      }

      // Crear historial manualmente
      try {
        await supabase.rpc('crear_historial_manual', {
          registro_uuid: record.id,
          campo: field,
          valor_anterior: value || 'NULL',
          valor_nuevo: processedValue || 'NULL'
        });
        console.log('✅ Historial creado para campo:', field);
      } catch (historialError) {
        console.warn('⚠️ Error creando historial:', historialError);
        // No fallar la operación por el historial
      }

      // Actualizar el registro local
      const updatedRecord = {
        ...record,
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
        // Es un doble tap, activar edición
        setEditingCell(record.id || '', field);
        setLastTap(0);
        setShowTapHint(false);
      } else {
        // Es el primer tap, guardar el timestamp y mostrar hint
        setLastTap(now);
        setShowTapHint(true);
        
        // Ocultar el hint después de 500ms
        setTimeout(() => {
          setShowTapHint(false);
        }, 500);
      }
    } else {
      // En desktop, activar inmediatamente con un solo clic
      setEditingCell(record.id || '', field);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
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
          ? 'bg-green-900/30 text-green-300 px-2 py-1 rounded-full text-xs font-semibold'
          : 'bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold';
      } else if (val === 'CANCELADO') {
        return theme === 'dark'
          ? 'bg-red-900/30 text-red-300 px-2 py-1 rounded-full text-xs font-semibold'
          : 'bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-semibold';
      } else if (val === 'PENDIENTE') {
        return theme === 'dark'
          ? 'bg-yellow-900/30 text-yellow-300 px-2 py-1 rounded-full text-xs font-semibold'
          : 'bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-semibold';
      } else {
        return theme === 'dark'
          ? 'bg-gray-700 text-gray-300 px-2 py-1 rounded-full text-xs font-semibold'
          : 'bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-semibold';
      }
    }
    
    if (field === 'tipoIngreso') {
      if (val === 'NORMAL') {
        return theme === 'dark'
          ? 'bg-green-600 text-white px-2 py-1 rounded-full text-xs font-semibold'
          : 'bg-green-500 text-white px-2 py-1 rounded-full text-xs font-semibold';
      } else if (val === 'EARLY') {
        return theme === 'dark'
          ? 'bg-cyan-600 text-white px-2 py-1 rounded-full text-xs font-semibold'
          : 'bg-cyan-500 text-white px-2 py-1 rounded-full text-xs font-semibold';
      } else if (val === 'LATE') {
        return theme === 'dark'
          ? 'bg-yellow-600 text-white px-2 py-1 rounded-full text-xs font-semibold'
          : 'bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-semibold';
      } else if (val === 'EXTRA LATE') {
        return theme === 'dark'
          ? 'bg-red-600 text-white px-2 py-1 rounded-full text-xs font-semibold'
          : 'bg-red-500 text-white px-2 py-1 rounded-full text-xs font-semibold';
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
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="px-2 py-1 text-xs border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            autoFocus
          >
            {options.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        ) : type === 'date' ? (
          <input
            type="date"
            value={editValue ? new Date(editValue).toISOString().split('T')[0] : ''}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="px-2 py-1 text-xs border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            autoFocus
          />
        ) : type === 'textarea' ? (
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="px-2 py-1 text-xs border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white resize-none"
            rows={3}
            cols={20}
            autoFocus
          />
        ) : (
          <>
            <input
              type={type}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="px-2 py-1 text-xs border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              autoComplete="off"
              list={catalogSuggestions.length > 0 ? `catalog-suggestions-${field}-${record.id}` : undefined}
              autoFocus
            />
            {catalogSuggestions.length > 0 && (
              <datalist id={`catalog-suggestions-${field}-${record.id}`}>
                {catalogSuggestions.map((suggestion, index) => (
                  <option key={index} value={suggestion} />
                ))}
              </datalist>
            )}
          </>
        )}
        
        <button
          onClick={handleSave}
          disabled={loading}
          className="p-1 text-green-600 hover:text-green-800 disabled:opacity-50"
          title="Guardar"
        >
          <Check size={14} />
        </button>
        
        <button
          onClick={handleCancel}
          disabled={loading}
          className="p-1 text-red-600 hover:text-red-800 disabled:opacity-50"
          title="Cancelar"
        >
          <X size={14} />
        </button>
        
        {error && (
          <span className="text-xs text-red-600 ml-1 bg-red-50 px-1 py-0.5 rounded">{error}</span>
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
      className={`flex items-center gap-1 group rounded px-2 py-1 transition-colors relative ${className} ${
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
        <span className={`flex-1 ${getDisplayStyle(value)}`}>
          {formatDisplayValue(value)}
        </span>
      )}
      {showTapHint && (
        <span className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-[10px] bg-yellow-500 text-white px-2 py-0.5 rounded-full font-semibold whitespace-nowrap z-10 shadow-md animate-pulse">
          Toca de nuevo
        </span>
      )}
      {shouldShowBulkIndicator && (
        <span className="text-xs bg-blue-500 text-white px-1 py-0.5 rounded-full font-semibold">
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
