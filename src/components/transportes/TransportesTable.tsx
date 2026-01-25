'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { createClient } from '@/lib/supabase-browser';
import { TransporteRecord, fetchTransportes, deleteMultipleTransportes } from '@/lib/transportes-service';
import { transportesColumns } from './columns';
import { AddTransporteModal } from './AddTransporteModal';
import { InlineEditCell } from './InlineEditCell';
import { Trash2, CheckSquare, Square } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

interface TransportesTableProps {
  transportes: TransporteRecord[];
}

const dateKeys = new Set<keyof TransporteRecord>([
  'stacking',
  'cut_off',
  'fecha_planta',
  'created_at',
  'updated_at',
]);

function formatValue(item: TransporteRecord, key: keyof TransporteRecord) {
  const value = item[key];
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  if (dateKeys.has(key) && typeof value === 'string') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString('es-CL');
    }
  }

  if (typeof value === 'boolean') {
    return value ? 'Sí' : 'No';
  }

  return String(value);
}

export default function TransportesTable({ transportes }: TransportesTableProps) {
  const [records, setRecords] = useState<TransporteRecord[]>(transportes);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRefreshing, startTransition] = useTransition();
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const { canAdd, setCurrentUser } = useUser();
  const { success, error } = useToast();

  useEffect(() => {
    setRecords(transportes);
  }, [transportes]);

  useEffect(() => {
    const loadUser = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: userInfo } = await supabase
          .from('usuarios')
          .select('*')
          .eq('auth_user_id', user.id)
          .single();

        if (userInfo) {
          setCurrentUser(userInfo);
        }
      }
    };

    loadUser();
  }, [setCurrentUser]);

  const reload = () => {
    startTransition(async () => {
      const data = await fetchTransportes();
      setRecords(data);
      setSelectedRecords(new Set());
      router.refresh();
    });
  };

  const handleSelectRecord = (id: string) => {
    console.log('📝 Seleccionando registro:', id);
    setSelectedRecords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
        console.log('❌ Deseleccionado:', id);
      } else {
        newSet.add(id);
        console.log('✅ Seleccionado:', id);
      }
      console.log('📋 Selección actual:', Array.from(newSet));
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedRecords.size === records.length) {
      setSelectedRecords(new Set());
    } else {
      setSelectedRecords(new Set(records.map(r => r.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedRecords.size === 0) return;

    console.log('🗑️ Iniciando eliminación múltiple');
    console.log('📋 Registros seleccionados:', Array.from(selectedRecords));
    
    setIsDeleting(true);
    try {
      await deleteMultipleTransportes(Array.from(selectedRecords));
      console.log('✅ Eliminación completada');
      success(`${selectedRecords.size} transporte(s) eliminado(s) correctamente`);
      reload();
    } catch (err: any) {
      console.error('❌ Error deleting transportes:', err);
      error('Error al eliminar los transportes seleccionados');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Transportes</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Seguimiento de transportes, conductores y documentación asociada.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isRefreshing && (
            <span className="text-xs text-blue-500 font-medium">Actualizando…</span>
          )}
          {selectedRecords.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {selectedRecords.size} seleccionado(s)
              </span>
              <button
                onClick={handleDeleteSelected}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="h-4 w-4" />
                {isDeleting ? 'Eliminando...' : 'Eliminar'}
              </button>
              <button
                onClick={() => setSelectedRecords(new Set())}
                className="inline-flex items-center gap-2 rounded-lg bg-gray-600 px-3 py-2 text-sm font-semibold text-white shadow hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                <Square className="h-4 w-4" />
                Deseleccionar todo
              </button>
            </div>
          )}
          {records.length > 0 && (
            <button
              onClick={handleSelectAll}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {selectedRecords.size === records.length ? (
                <>
                  <Square className="h-4 w-4" />
                  Deseleccionar todo
                </>
              ) : (
                <>
                  <CheckSquare className="h-4 w-4" />
                  Seleccionar todo
                </>
              )}
            </button>
          )}
          {canAdd && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              + Nuevo Transporte
            </button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-100 dark:bg-gray-800">
              <tr>
                <th scope="col" className="px-3 py-2 text-left">
                  <input
                    type="checkbox"
                    checked={selectedRecords.size === records.length && records.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                {transportesColumns.map((column) => (
                  <th
                    key={column.header}
                    scope="col"
                    className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300"
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700 text-sm">
              {records.length === 0 ? (
                <tr>
                  <td
                    colSpan={transportesColumns.length + 1}
                    className="px-3 py-6 text-center text-gray-500 dark:text-gray-400"
                  >
                    {isRefreshing ? 'Actualizando…' : 'No hay registros de transporte disponibles.'}
                  </td>
                </tr>
              ) : (
                records.map((item) => (
                  <tr key={item.id} className={selectedRecords.has(item.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}>
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selectedRecords.has(item.id)}
                        onChange={() => handleSelectRecord(item.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    {transportesColumns.map((column) => (
                      <td
                        key={`${item.id}-${column.header}`}
                        className="px-3 py-2 whitespace-nowrap text-gray-900 dark:text-gray-100"
                      >
                        {column.render ? (
                          column.render(item)
                        ) : (
                          <InlineEditCell
                            value={item[column.key]}
                            field={column.key}
                            record={item}
                            onSave={(updatedRecord) => {
                              // Actualizar el registro en el estado local
                              setRecords(prev => prev.map(r => r.id === updatedRecord.id ? updatedRecord : r));
                            }}
                            type={
                              column.key === 'planta' ? 'select' :
                              column.key === 'dia_presentacion' ? 'date' :
                              column.key === 'stacking' ? 'date' :
                              column.key === 'hora_presentacion' ? 'time' :
                              column.key === 'llegada_planta' ? 'time' :
                              column.key === 'salida_planta' ? 'time' :
                              column.key === 'llegada_puerto' ? 'time' :
                              column.key === 'fin_stacking' ? 'datetime' :
                              column.key === 'ingreso_stacking' ? 'datetime' :
                              column.key === 'cut_off' ? 'datetime' :
                              'text'
                            }
                            options={column.key === 'planta' ? [] : undefined}
                            className="w-full"
                          />
                        )}
                        {/* Debug info */}
                        {process.env.NODE_ENV === 'development' && (
                          <div className="text-xs mt-1 text-gray-400">
                            {column.key}: {
                              column.key === 'planta' ? 'select' :
                              column.key === 'dia_presentacion' ? 'date' :
                              column.key === 'stacking' ? 'date' :
                              column.key === 'hora_presentacion' ? 'time' :
                              column.key === 'llegada_planta' ? 'time' :
                              column.key === 'salida_planta' ? 'time' :
                              column.key === 'llegada_puerto' ? 'time' :
                              column.key === 'fin_stacking' ? 'datetime' :
                              column.key === 'ingreso_stacking' ? 'datetime' :
                              column.key === 'cut_off' ? 'datetime' :
                              'text'
                            }
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddTransporteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={reload}
      />
    </div>
  );
}

