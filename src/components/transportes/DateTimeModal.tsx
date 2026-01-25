'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock } from 'lucide-react';
import { TransporteRecord } from '@/lib/transportes-service';
import { createClient } from '@/lib/supabase-browser';
import { useTheme } from '@/contexts/ThemeContext';

interface DateTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: TransporteRecord | null;
  onSave: (updatedRecord: TransporteRecord) => void;
}

interface DateTimeField {
  key: keyof TransporteRecord;
  label: string;
  type: 'date' | 'datetime';
}

const STACKING_FIELDS: DateTimeField[] = [
  { key: 'stacking', label: 'Inicio Stacking', type: 'date' },
  { key: 'fin_stacking', label: 'Fin Stacking', type: 'datetime' },
  { key: 'cut_off', label: 'Cut Off', type: 'datetime' },
];

export function DateTimeModal({ isOpen, onClose, record, onSave }: DateTimeModalProps) {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    stacking: '',
    fin_stacking: '',
    cut_off: '',
  });

  console.log('📅 DateTimeModal render:', { isOpen, recordId: record?.id, theme });

  useEffect(() => {
    if (record && isOpen) {
      setFormData({
        stacking: formatDateForInput(record.stacking, 'date'),
        fin_stacking: formatDateForInput(record.fin_stacking, 'datetime'),
        cut_off: formatDateForInput(record.cut_off, 'datetime'),
      });
      setError('');
    }
  }, [record, isOpen]);

  const formatDateForInput = (value: any, type: 'date' | 'datetime'): string => {
    if (!value) return '';
    
    if (typeof value === 'string') {
      let date: Date;
      
      if (value.includes('T')) {
        date = new Date(value);
      } else if (value.includes(' ')) {
        date = new Date(value.replace(' ', 'T'));
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        date = new Date(value + 'T00:00:00');
      } else if (/^\d{2}-\d{2}-\d{4}$/.test(value)) {
        const [day, month, year] = value.split('-');
        date = new Date(`${year}-${month}-${day}T00:00:00`);
      } else {
        date = new Date(value);
      }
      
      if (!Number.isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        
        if (type === 'date') {
          return `${year}-${month}-${day}`;
        } else {
          return `${year}-${month}-${day}T${hours}:${minutes}`;
        }
      }
    }
    
    return '';
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!record) return;

    try {
      setLoading(true);
      setError('');

      const supabase = createClient();
      const updates: Partial<TransporteRecord> = {};

      // Procesar cada campo
      Object.entries(formData).forEach(([key, value]) => {
        if (value.trim()) {
          if (key === 'stacking') {
            // Para fecha, guardar en formato YYYY-MM-DD
            updates[key as keyof TransporteRecord] = value as any;
          } else {
            // Para datetime, convertir a ISO
            const date = new Date(value);
            if (!Number.isNaN(date.getTime())) {
              updates[key as keyof TransporteRecord] = date.toISOString() as any;
            }
          }
        } else {
          updates[key as keyof TransporteRecord] = null as any;
        }
      });

      const { error: updateError } = await supabase
        .from('transportes')
        .update(updates)
        .eq('id', record.id);

      if (updateError) {
        console.error('Error updating record:', updateError);
        setError('Error al guardar los cambios');
        return;
      }

      // Crear registro actualizado para el callback
      const updatedRecord = { ...record, ...updates };
      onSave(updatedRecord);
      onClose();
    } catch (err) {
      console.error('Error in handleSave:', err);
      setError('Error al guardar los cambios');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
      setError('');
    }
  };

  if (!isOpen || !record) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={handleClose}
        />
        
        {/* Modal */}
        <div className={`relative w-full max-w-md rounded-lg shadow-xl ${
          theme === 'dark' 
            ? 'bg-slate-800 border border-slate-700' 
            : 'bg-white border border-gray-200'
        }`}>
          {/* Header */}
          <div className={`flex items-center justify-between p-6 border-b ${
            theme === 'dark' ? 'border-slate-700' : 'border-gray-200'
          }`}>
            <h2 className={`text-lg font-semibold ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Editar Fechas de Stacking
            </h2>
            <button
              onClick={handleClose}
              disabled={loading}
              className={`p-1 rounded-md transition-colors ${
                theme === 'dark' 
                  ? 'hover:bg-slate-700 text-slate-400' 
                  : 'hover:bg-gray-100 text-gray-500'
              } disabled:opacity-50`}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            {STACKING_FIELDS.map((field) => (
              <div key={field.key} className="space-y-2">
                <label className={`flex items-center gap-2 text-sm font-medium ${
                  theme === 'dark' ? 'text-slate-200' : 'text-gray-700'
                }`}>
                  {field.type === 'date' ? (
                    <Calendar className="h-4 w-4" />
                  ) : (
                    <Clock className="h-4 w-4" />
                  )}
                  {field.label}
                </label>
                <input
                  type={field.type}
                  value={formData[field.key as keyof typeof formData]}
                  onChange={(e) => handleInputChange(field.key as keyof typeof formData, e.target.value)}
                  className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                    theme === 'dark'
                      ? 'border-slate-600 bg-slate-900 text-slate-100 focus:ring-sky-500'
                      : 'border-gray-300 bg-white text-gray-900 focus:ring-blue-500'
                  }`}
                  disabled={loading}
                />
              </div>
            ))}

            {error && (
              <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={`flex justify-end gap-3 p-6 border-t ${
            theme === 'dark' ? 'border-slate-700' : 'border-gray-200'
          }`}>
            <button
              onClick={handleClose}
              disabled={loading}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                theme === 'dark'
                  ? 'bg-slate-700 text-slate-200 hover:bg-slate-600 disabled:opacity-50'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50'
              }`}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors disabled:opacity-50 ${
                loading
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
