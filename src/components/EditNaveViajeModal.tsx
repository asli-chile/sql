'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Registro } from '@/types/registros';
import { useTheme } from '@/contexts/ThemeContext';

interface EditNaveViajeModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: Registro | null;
  records?: Registro[]; // Para edición múltiple
  navesUnicas: string[];
  navierasNavesMapping: Record<string, string[]>;
  consorciosNavesMapping: Record<string, string[]>;
  onSave: (nave: string, viaje: string) => Promise<void>;
  onBulkSave?: (nave: string, viaje: string, records: Registro[]) => Promise<void>;
}

export function EditNaveViajeModal({
  isOpen,
  onClose,
  record,
  records,
  navesUnicas,
  navierasNavesMapping,
  consorciosNavesMapping,
  onSave,
  onBulkSave
}: EditNaveViajeModalProps) {
  const { theme } = useTheme();
  const [nave, setNave] = useState('');
  const [viaje, setViaje] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isBulkEdit = records && records.length > 1;
  const recordsToEdit = isBulkEdit ? records : (record ? [record] : []);

  useEffect(() => {
    if (record && !isBulkEdit) {
      // Para edición individual, pre-llenar con los valores del registro
      let naveActual = record.naveInicial || '';
      let viajeActual = record.viaje || '';
      
      const match = naveActual.match(/^(.+?)\s*\[(.+?)\]$/);
      if (match) {
        naveActual = match[1].trim();
        viajeActual = match[2].trim();
      }
      
      setNave(naveActual);
      setViaje(viajeActual);
    } else {
      // Para edición múltiple, dejar en blanco
      setNave('');
      setViaje('');
    }
    setError('');
  }, [record, isBulkEdit]);

  // Obtener naves disponibles según la naviera del registro
  const getAvailableNaves = () => {
    // Para edición múltiple, usar todas las naves (o la naviera común si todos tienen la misma)
    if (isBulkEdit && records && records.length > 0) {
      // Si todos los registros tienen la misma naviera, usar esa
      const navierasUnicas = [...new Set(records.map(r => r.naviera).filter(Boolean))];
      if (navierasUnicas.length === 1) {
        const navieraComun = navierasUnicas[0];
        // Si es consorcio
        if (navieraComun.includes('/')) {
          const navesConsorcio = consorciosNavesMapping[navieraComun] || [];
          return navesConsorcio.length > 0 ? navesConsorcio.sort() : navesUnicas;
        }
        // Si es naviera individual
        const navesNaviera = navierasNavesMapping[navieraComun] || [];
        return navesNaviera.length > 0 ? navesNaviera.sort() : navesUnicas;
      }
      // Si hay múltiples navieras diferentes, mostrar todas las naves
      return navesUnicas;
    }
    
    // Para edición individual, usar la naviera del registro
    if (record && record.naviera) {
      const naviera = record.naviera;
      
      // Si es un consorcio, buscar en consorciosNavesMapping
      if (naviera.includes('/')) {
        const navesConsorcio = consorciosNavesMapping[naviera] || [];
        return navesConsorcio.length > 0 ? navesConsorcio.sort() : navesUnicas;
      }
      
      // Si es naviera individual, buscar en navierasNavesMapping
      const navesNaviera = navierasNavesMapping[naviera] || [];
      return navesNaviera.length > 0 ? navesNaviera.sort() : navesUnicas;
    }
    
    // Si no hay naviera, mostrar todas las naves
    return navesUnicas;
  };

  if (!isOpen || (!record && !records?.length)) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!nave.trim()) {
      setError('La nave es obligatoria');
      return;
    }

    if (!viaje.trim()) {
      setError('El número de viaje es obligatorio');
      return;
    }

    setLoading(true);
    try {
      if (isBulkEdit && onBulkSave && records) {
        await onBulkSave(nave.trim(), viaje.trim(), records);
      } else if (record) {
        await onSave(nave.trim(), viaje.trim());
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className={`relative w-full max-w-md mx-4 rounded-lg shadow-xl ${
        theme === 'dark' ? 'bg-gray-800' : 'bg-white'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${
          theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <h2 className={`text-lg font-semibold ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            {isBulkEdit ? `Editar Nave y Viaje (${recordsToEdit.length} registros)` : 'Editar Nave y Viaje'}
          </h2>
          <button
            onClick={onClose}
            className={`p-1 rounded hover:bg-opacity-20 ${
              theme === 'dark' ? 'text-gray-400 hover:bg-white' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* REF ASLI (solo lectura) */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              {isBulkEdit ? `REF ASLI (${recordsToEdit.length} registros)` : 'REF ASLI'}
            </label>
            {isBulkEdit ? (
              <div className={`w-full max-h-32 overflow-y-auto px-3 py-2 rounded border ${
                theme === 'dark'
                  ? 'bg-gray-700 text-gray-400 border-gray-600'
                  : 'bg-gray-100 text-gray-500 border-gray-300'
              }`}>
                <div className="flex flex-col gap-1">
                  {recordsToEdit.map((r, idx) => (
                    <span key={idx} className="text-xs">{r.refAsli || '-'}</span>
                  ))}
                </div>
              </div>
            ) : (
              <input
                type="text"
                value={record?.refAsli || ''}
                disabled
              className={`w-full px-3 py-2 rounded border ${
                theme === 'dark'
                  ? 'bg-gray-700 text-gray-400 border-gray-600'
                  : 'bg-gray-100 text-gray-500 border-gray-300'
              } cursor-not-allowed`}
            />
            )}
          </div>

          {/* Nave */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Nave <span className="text-red-500">*</span>
            </label>
            <select
              value={nave}
              onChange={(e) => setNave(e.target.value)}
              className={`w-full px-3 py-2 rounded border ${
                theme === 'dark'
                  ? 'bg-gray-700 text-white border-gray-600 focus:border-blue-500'
                  : 'bg-white text-gray-900 border-gray-300 focus:border-blue-500'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              required
            >
              <option value="">Seleccionar nave</option>
              {getAvailableNaves().map((nav) => (
                <option key={nav} value={nav}>
                  {nav}
                </option>
              ))}
            </select>
          </div>

          {/* Viaje */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Número de Viaje <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={viaje}
              onChange={(e) => setViaje(e.target.value)}
              className={`w-full px-3 py-2 rounded border ${
                theme === 'dark'
                  ? 'bg-gray-700 text-white border-gray-600 focus:border-blue-500'
                  : 'bg-white text-gray-900 border-gray-300 focus:border-blue-500'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="Ej: 123"
              required
            />
          </div>

          {/* Error */}
          {error && (
            <div className={`p-2 rounded text-sm ${
              theme === 'dark' ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-600'
            }`}>
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded text-sm font-medium ${
                theme === 'dark'
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

