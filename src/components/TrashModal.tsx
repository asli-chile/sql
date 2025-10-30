'use client';

import { useState, useEffect } from 'react';
import { X, Trash2, RotateCcw, RefreshCw, CheckSquare, Square } from 'lucide-react';
import { Registro } from '@/types/registros';
import { supabase } from '@/lib/supabase';
import { convertSupabaseToApp } from '@/lib/migration-utils';

interface TrashModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestore?: () => void;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

export function TrashModal({ isOpen, onClose, onRestore, onSuccess, onError }: TrashModalProps) {
  const [deletedRecords, setDeletedRecords] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDays, setSelectedDays] = useState(7); // Días para conservar registros eliminados
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadDeletedRecords();
    }
  }, [isOpen, selectedDays]);

  const loadDeletedRecords = async () => {
    setLoading(true);
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - selectedDays);
      cutoffDate.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from('registros')
        .select('*')
        .not('deleted_at', 'is', null)
        .gte('deleted_at', cutoffDate.toISOString())
        .order('deleted_at', { ascending: false });
    
        
      if (error) {
        console.error('Error al cargar registros eliminados:', error);
        return;
      }

      const convertedData = data?.map(convertSupabaseToApp) || [];
      setDeletedRecords(convertedData);
      setSelectedRecords(new Set()); // Limpiar selección al cargar nuevos datos
    } catch (error) {
      console.error('Error al cargar registros eliminados:', error);
    } finally {
      setLoading(false);
    }
  };

  // Funciones para selección múltiple
  const toggleRecordSelection = (recordId: string) => {
    const newSelected = new Set(selectedRecords);
    if (newSelected.has(recordId)) {
      newSelected.delete(recordId);
    } else {
      newSelected.add(recordId);
    }
    setSelectedRecords(newSelected);
  };

  const selectAllRecords = () => {
    const allIds = deletedRecords.map(record => record.id!).filter(Boolean);
    setSelectedRecords(new Set(allIds));
  };

  const clearSelection = () => {
    setSelectedRecords(new Set());
  };

  const isAllSelected = deletedRecords.length > 0 && selectedRecords.size === deletedRecords.length;
  const isPartiallySelected = selectedRecords.size > 0 && selectedRecords.size < deletedRecords.length;

  // Funciones para operaciones masivas
  const handleBulkRestore = async () => {
    if (selectedRecords.size === 0) return;
    
    const confirmMessage = `¿Estás seguro de que deseas restaurar ${selectedRecords.size} registro(s)?`;
    if (!confirm(confirmMessage)) return;

    setBulkLoading(true);
    try {
      const selectedIds = Array.from(selectedRecords);
      const { error } = await supabase
        .from('registros')
        .update({
          deleted_at: null,
          deleted_by: null,
          updated_at: new Date().toISOString(),
        })
        .in('id', selectedIds);

      if (error) {
        console.error('Error al restaurar registros:', error);
        if (onError) onError('Error al restaurar los registros');
        return;
      }

      console.log(`✅ Restaurados ${selectedIds.length} registros`);
      if (onSuccess) onSuccess(`✅ Se restauraron ${selectedIds.length} registros exitosamente`);
      clearSelection();
      loadDeletedRecords();
      
      if (onRestore) {
        onRestore();
      }
    } catch (error) {
      console.error('Error al restaurar registros:', error);
      if (onError) onError('Error al restaurar los registros');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRecords.size === 0) return;
    
    const confirmMessage = `¿Estás seguro de que deseas eliminar permanentemente ${selectedRecords.size} registro(s)? Esta acción no se puede deshacer.`;
    if (!confirm(confirmMessage)) return;

    setBulkLoading(true);
    try {
      const selectedIds = Array.from(selectedRecords);
      const { error } = await supabase
        .from('registros')
        .delete()
        .in('id', selectedIds);

      if (error) {
        console.error('Error al eliminar registros:', error);
        if (onError) onError('Error al eliminar los registros permanentemente');
        return;
      }

      console.log(`✅ Eliminados permanentemente ${selectedIds.length} registros`);
      if (onSuccess) onSuccess(`✅ Se eliminaron ${selectedIds.length} registros permanentemente`);
      clearSelection();
      loadDeletedRecords();
      
      if (onRestore) {
        onRestore();
      }
    } catch (error) {
      console.error('Error al eliminar registros:', error);
      if (onError) onError('Error al eliminar los registros permanentemente');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleRestore = async (recordId: string) => {
    try {
      const { error } = await supabase
        .from('registros')
        .update({
          deleted_at: null,
          deleted_by: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', recordId);

      if (error) {
        console.error('Error al restaurar registro:', error);
        if (onError) onError('Error al restaurar el registro');
        return;
      }

      // Recargar lista
      if (onSuccess) onSuccess('✅ Registro restaurado exitosamente');
      loadDeletedRecords();
      
      // Notificar al componente padre
      if (onRestore) {
        onRestore();
      }
    } catch (error) {
      console.error('Error al restaurar registro:', error);
      if (onError) onError('Error al restaurar el registro');
    }
  };

  const handlePermanentDelete = async (recordId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar permanentemente este registro? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('registros')
        .delete()
        .eq('id', recordId);

      if (error) {
        console.error('Error al eliminar permanentemente:', error);
        if (onError) onError('Error al eliminar permanentemente el registro');
        return;
      }

      if (onSuccess) onSuccess('✅ Registro eliminado permanentemente');
      loadDeletedRecords();
      
      if (onRestore) {
        onRestore();
      }
    } catch (error) {
      console.error('Error al eliminar permanentemente:', error);
      if (onError) onError('Error al eliminar permanentemente el registro');
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '-';
    return date.toLocaleDateString('es-CL', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateDaysRemaining = (deletedAt: Date | null) => {
    if (!deletedAt) return 0;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + selectedDays);
    const diffTime = cutoffDate.getTime() - deletedAt.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Trash2 className="h-6 w-6 text-red-600" />
            <h2 className="text-xl font-semibold text-gray-900">Papelera</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-700" />
          </button>
        </div>

        {/* Controls */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="space-y-4">
            {/* Primera fila: Configuración de días */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium text-gray-700">
                  Conservar registros eliminados por:
                </label>
                <select
                  value={selectedDays}
                  onChange={(e) => setSelectedDays(Number(e.target.value))}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={7}>7 días</option>
                  <option value={14}>14 días</option>
                  <option value={30}>30 días</option>
                  <option value={90}>90 días</option>
                </select>
              </div>
              <button
                onClick={loadDeletedRecords}
                disabled={loading}
                className="flex items-center space-x-2 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Actualizar</span>
              </button>
            </div>

            {/* Segunda fila: Selección múltiple */}
            {deletedRecords.length > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={isAllSelected ? clearSelection : selectAllRecords}
                    className="flex items-center space-x-2 px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
                  >
                    {isAllSelected ? (
                      <CheckSquare className="h-4 w-4 text-blue-600" />
                    ) : isPartiallySelected ? (
                      <div className="h-4 w-4 border-2 border-blue-600 rounded bg-blue-600/20" />
                    ) : (
                      <Square className="h-4 w-4 text-gray-600" />
                    )}
                    <span>
                      {isAllSelected ? 'Deseleccionar todo' : 'Seleccionar todo'}
                    </span>
                  </button>
                  {selectedRecords.size > 0 && (
                    <span className="text-sm text-gray-600">
                      {selectedRecords.size} registro(s) seleccionado(s)
                    </span>
                  )}
                </div>
                
                {selectedRecords.size > 0 && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleBulkRestore}
                      disabled={bulkLoading}
                      className="flex items-center space-x-1 px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm"
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span>Restaurar ({selectedRecords.size})</span>
                    </button>
                    <button
                      onClick={handleBulkDelete}
                      disabled={bulkLoading}
                      className="flex items-center space-x-1 px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 text-sm"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Eliminar ({selectedRecords.size})</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-auto max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Cargando registros eliminados...</span>
            </div>
          ) : deletedRecords.length === 0 ? (
            <div className="text-center py-8">
              <Trash2 className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-700">No hay registros eliminados</p>
            </div>
          ) : (
            <div className="space-y-4">
              {deletedRecords.map((record) => (
                <div
                  key={record.id}
                  className={`bg-gray-50 border rounded-lg p-4 transition-colors ${
                    selectedRecords.has(record.id!) 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      {/* Checkbox de selección */}
                      <button
                        onClick={() => toggleRecordSelection(record.id!)}
                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded"
                      >
                        {selectedRecords.has(record.id!) ? (
                          <CheckSquare className="h-5 w-5 text-blue-600" />
                        ) : (
                          <Square className="h-5 w-5 text-gray-600" />
                        )}
                      </button>
                      
                      {/* Información del registro */}
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-2">
                          <span className="font-medium text-gray-900">
                            {record.refAsli}
                          </span>
                          <span className="text-sm text-gray-600">
                            {record.ejecutivo} - {record.shipper}
                          </span>
                          <span className="text-sm text-gray-600">
                            {record.naviera} - {record.especie}
                          </span>
                        </div>
                        <div className="text-sm text-gray-700">
                          <span>Eliminado: {formatDate(record.deletedAt || null)}</span>
                          <span className="mx-2">•</span>
                          <span>Por: {record.deletedBy || 'Usuario'}</span>
                          <span className="mx-2">•</span>
                          <span className="text-orange-600">
                            Se eliminará permanentemente en {calculateDaysRemaining(record.deletedAt || null)} días
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Botones de acción individual */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleRestore(record.id!)}
                        className="flex items-center space-x-1 px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                      >
                        <RotateCcw className="h-4 w-4" />
                        <span>Restaurar</span>
                      </button>
                      <button
                        onClick={() => handlePermanentDelete(record.id!)}
                        className="flex items-center space-x-1 px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {deletedRecords.length} registro(s) eliminado(s)
            </p>
            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}