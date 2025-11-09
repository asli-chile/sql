'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { createClient } from '@/lib/supabase-browser';
import { TransporteRecord, fetchTransportes } from '@/lib/transportes-service';
import { transportesColumns } from './columns';
import { AddTransporteModal } from './AddTransporteModal';

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
  const router = useRouter();
  const { canAdd, setCurrentUser } = useUser();

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
      router.refresh();
    });
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
          {canAdd && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    colSpan={transportesColumns.length}
                    className="px-3 py-6 text-center text-gray-500 dark:text-gray-400"
                  >
                    {isRefreshing ? 'Actualizando…' : 'No hay registros de transporte disponibles.'}
                  </td>
                </tr>
              ) : (
                records.map((item) => (
                  <tr key={item.id}>
                    {transportesColumns.map((column) => (
                      <td
                        key={`${item.id}-${column.header}`}
                        className="px-3 py-2 whitespace-nowrap text-gray-900 dark:text-gray-100"
                      >
                        {column.render ? column.render(item) : formatValue(item, column.key)}
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

