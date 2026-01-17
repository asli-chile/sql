'use client';

import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface ColumnToggleInlineProps {
  columns: Array<{
    id: string;
    header: string;
    visible: boolean;
  }>;
  onToggleColumn: (columnId: string) => void;
  onToggleAll: (visible: boolean) => void;
  alwaysVisibleColumns?: string[];
}

export const ColumnToggleInline = ({ 
  columns, 
  onToggleColumn, 
  onToggleAll, 
  alwaysVisibleColumns = [] 
}: ColumnToggleInlineProps) => {
  const { theme } = useTheme();

  const visibleCount = columns.filter(col => col.visible).length;
  const totalCount = columns.length;

  return (
    <div className="space-y-3">
      {/* Header con botones de acción */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-400">
            {visibleCount} de {totalCount} columnas visibles
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onToggleAll(true)}
            className={`text-xs px-2 py-1 rounded-full transition-colors ${
              theme === 'dark'
                ? 'bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => onToggleAll(false)}
            className={`text-xs px-2 py-1 rounded-full transition-colors ${
              theme === 'dark'
                ? 'bg-rose-500/20 text-rose-200 hover:bg-rose-500/30'
                : 'bg-red-100 text-red-700 hover:bg-red-200'
            }`}
          >
            Ninguna
          </button>
        </div>
      </div>

      {/* Lista de columnas */}
      <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
        {columns.map((column) => {
          const isAlwaysVisible = alwaysVisibleColumns.includes(column.id);
          return (
            <div
              key={column.id}
              className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                isAlwaysVisible 
                  ? theme === 'dark'
                    ? 'bg-sky-500/10 border border-sky-500/40'
                    : 'bg-blue-50 border border-blue-200'
                  : theme === 'dark'
                    ? 'hover:bg-slate-900/70'
                    : 'hover:bg-gray-50'
              }`}
            >
              <span className={`text-sm flex-1 truncate ${
                isAlwaysVisible 
                  ? theme === 'dark'
                    ? 'text-sky-200 font-medium'
                    : 'text-blue-800 font-medium'
                  : theme === 'dark'
                    ? 'text-slate-300'
                    : 'text-gray-700'
              }`}>
                {column.header}
                {isAlwaysVisible && (
                  <span className={`ml-2 text-xs ${
                    theme === 'dark' ? 'text-sky-300' : 'text-blue-600'
                  }`}>(Siempre visible)</span>
                )}
              </span>
              {isAlwaysVisible ? (
                <div className={`p-1 ${
                  theme === 'dark' ? 'text-sky-300' : 'text-blue-600'
                }`} title="Columna crítica - Siempre visible">
                  <Eye className="h-4 w-4" />
                </div>
              ) : (
                <button
                  onClick={() => onToggleColumn(column.id)}
                  className={`p-1 rounded transition-colors ${
                    column.visible 
                      ? theme === 'dark'
                        ? 'text-emerald-300 hover:bg-emerald-500/20'
                        : 'text-green-600 hover:bg-green-100'
                      : theme === 'dark'
                        ? 'text-slate-500 hover:bg-slate-800/70'
                        : 'text-gray-400 hover:bg-gray-100'
                  }`}
                  title={column.visible ? 'Ocultar columna' : 'Mostrar columna'}
                >
                  {column.visible ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
