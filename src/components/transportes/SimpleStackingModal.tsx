'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock } from 'lucide-react';
import { TransporteRecord } from '@/lib/transportes-service';
import { createClient } from '@/lib/supabase-browser';
import { useTheme } from '@/contexts/ThemeContext';

interface SimpleStackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: TransporteRecord | null;
  onSave: (updatedRecord: TransporteRecord) => void;
}

export function SimpleStackingModal({ isOpen, onClose, record, onSave }: SimpleStackingModalProps) {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    stacking: '',
    fin_stacking: '',
    cut_off: '',
  });

  useEffect(() => {
    if (record && isOpen) {
      console.log('📅 SimpleStackingModal abierto para:', record.id);
      
      // Función para formatear para el input datetime-local
      const formatForInput = (value: any) => {
        if (!value) return '';
        
        if (typeof value === 'string') {
          // Si ya viene en formato ISO o datetime-local
          if (value.includes('T')) return value.slice(0, 16);
          
          // Si viene en formato DD-MM-YYYY o DD-MM-YYYY HH:MM
          if (/^\d{2}-\d{2}-\d{4}/.test(value)) {
            const parts = value.split(' ');
            const [day, month, year] = parts[0].split('-');
            const time = parts[1] || '00:00';
            return `${year}-${month}-${day}T${time}`;
          }
          
          // Si viene en formato YYYY-MM-DD
          if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
            return value.includes('T') ? value.slice(0, 16) : `${value}T00:00`;
          }
        }
        
        return '';
      };

      setFormData({
        stacking: formatForInput(record.stacking),
        fin_stacking: formatForInput(record.fin_stacking),
        cut_off: formatForInput(record.cut_off),
      });
      setError('');
    }
  }, [record, isOpen]);

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

      // Función para formatear de datetime-local a timestamp ISO estándar
      const formatForDB = (datetimeLocal: string) => {
        if (!datetimeLocal) return null;
        
        // datetime-local viene como "YYYY-MM-DDTHH:MM"
        // Devolverlo en formato ISO estándar para Supabase
        return datetimeLocal + ':00';
      };

      // Guardar en formato ISO estándar
      const stackingValue = formatForDB(formData.stacking);
      const finStackingValue = formatForDB(formData.fin_stacking);
      const cutOffValue = formatForDB(formData.cut_off);

      console.log('📅 Valores para DB (ISO):');
      console.log('- stacking:', stackingValue);
      console.log('- fin_stacking:', finStackingValue);
      console.log('- cut_off:', cutOffValue);

      // Crear objeto de actualización solo con campos que tienen valores
      const updateData: any = {};
      if (stackingValue) updateData.stacking = stackingValue;
      if (finStackingValue) updateData.fin_stacking = finStackingValue;
      if (cutOffValue) updateData.cut_off = cutOffValue;

      console.log('📅 Objeto updateData final:', updateData);
      console.log('📅 Registro ID:', record.id);

      const { data, error: updateError } = await supabase
        .from('transportes')
        .update(updateData)
        .eq('id', record.id)
        .select();

      console.log('📅 Resultado data:', data);
      console.log('📅 Error completo:', updateError);

      if (updateError) {
        console.error('Error updating record:', updateError);
        console.error('Error details:', {
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint,
          code: updateError.code
        });
        setError(`Error al guardar: ${updateError.message || 'Error desconocido'}`);
        return;
      }

      const updatedRecord = { ...record, ...updateData };
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

  console.log('📅 Renderizando SimpleStackingModal:', { isOpen, recordId: record.id });

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
            <div className="space-y-2">
              <label className={`flex items-center gap-2 text-sm font-medium ${
                theme === 'dark' ? 'text-slate-200' : 'text-gray-700'
              }`}>
                <Clock className="h-4 w-4" />
                Inicio Stacking (Fecha y Hora)
              </label>
              <input
                type="datetime-local"
                value={formData.stacking}
                onChange={(e) => handleInputChange('stacking', e.target.value)}
                className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                  theme === 'dark'
                    ? 'border-slate-600 bg-slate-900 text-slate-100 focus:ring-sky-500'
                    : 'border-gray-300 bg-white text-gray-900 focus:ring-blue-500'
                }`}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label className={`flex items-center gap-2 text-sm font-medium ${
                theme === 'dark' ? 'text-slate-200' : 'text-gray-700'
              }`}>
                <Clock className="h-4 w-4" />
                Fin Stacking (Fecha y Hora)
              </label>
              <input
                type="datetime-local"
                value={formData.fin_stacking}
                onChange={(e) => handleInputChange('fin_stacking', e.target.value)}
                className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                  theme === 'dark'
                    ? 'border-slate-600 bg-slate-900 text-slate-100 focus:ring-sky-500'
                    : 'border-gray-300 bg-white text-gray-900 focus:ring-blue-500'
                }`}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label className={`flex items-center gap-2 text-sm font-medium ${
                theme === 'dark' ? 'text-slate-200' : 'text-gray-700'
              }`}>
                <Clock className="h-4 w-4" />
                Cut Off (Fecha y Hora)
              </label>
              <input
                type="datetime-local"
                value={formData.cut_off}
                onChange={(e) => handleInputChange('cut_off', e.target.value)}
                className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                  theme === 'dark'
                    ? 'border-slate-600 bg-slate-900 text-slate-100 focus:ring-sky-500'
                    : 'border-gray-300 bg-white text-gray-900 focus:ring-blue-500'
                }`}
                disabled={loading}
              />
            </div>

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
