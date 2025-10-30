'use client';

import { useState } from 'react';
import { Eye, EyeOff, Settings } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface ColumnToggleProps {
  columns: Array<{
    id: string;
    header: string;
    visible: boolean;
  }>;
  onToggleColumn: (columnId: string) => void;
  onToggleAll: (visible: boolean) => void;
  alwaysVisibleColumns?: string[];
}

export const ColumnToggle = ({ columns, onToggleColumn, onToggleAll, alwaysVisibleColumns = [] }: ColumnToggleProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { theme } = useTheme();

  const visibleCount = columns.filter(col => col.visible).length;
  const totalCount = columns.length;

  return (
    <div className="relative">
      {/* Botón principal */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors text-sm ${
          theme === 'dark'
            ? 'bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600'
            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
        }`}
        title="Mostrar/Ocultar Columnas"
      >
        <Settings className="h-4 w-4" />
        <span className="hidden sm:inline">Columnas</span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          theme === 'dark'
            ? 'bg-gray-600 text-gray-200'
            : 'bg-gray-300 text-gray-700'
        }`}>
          {visibleCount}/{totalCount}
        </span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Overlay para cerrar al hacer click fuera */}
          <div 
            className="fixed inset-0 z-50" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Panel de columnas */}
          <div className={`absolute right-0 top-full mt-2 w-64 border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto ${
            theme === 'dark'
              ? 'bg-gray-800 border-gray-600'
              : 'bg-white border-gray-200'
          }`}>
            {/* Header */}
            <div className={`p-3 border-b ${
              theme === 'dark' ? 'border-gray-600' : 'border-gray-200'
            }`}>
              <div className="flex items-center justify-between">
                <h3 className={`text-sm font-semibold ${
                  theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                }`}>Columnas</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => onToggleAll(true)}
                    className={`text-xs px-2 py-1 rounded transition-colors ${
                      theme === 'dark'
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    Todas
                  </button>
                  <button
                    onClick={() => onToggleAll(false)}
                    className={`text-xs px-2 py-1 rounded transition-colors ${
                      theme === 'dark'
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-red-100 text-red-700 hover:bg-red-200'
                    }`}
                  >
                    Ninguna
                  </button>
                </div>
              </div>
            </div>

            {/* Lista de columnas */}
            <div className="p-2">
              {columns.map((column) => {
                const isAlwaysVisible = alwaysVisibleColumns.includes(column.id);
                return (
                  <div
                    key={column.id}
                    className={`flex items-center justify-between p-2 rounded transition-colors ${
                      isAlwaysVisible 
                        ? theme === 'dark'
                          ? 'bg-blue-900/30 border border-blue-700'
                          : 'bg-blue-50 border border-blue-200'
                        : theme === 'dark'
                          ? 'hover:bg-gray-700'
                          : 'hover:bg-gray-50'
                    }`}
                  >
                    <span className={`text-sm flex-1 truncate ${
                      isAlwaysVisible 
                        ? theme === 'dark'
                          ? 'text-blue-300 font-medium'
                          : 'text-blue-800 font-medium'
                        : theme === 'dark'
                          ? 'text-gray-300'
                          : 'text-gray-700'
                    }`}>
                      {column.header}
                      {isAlwaysVisible && (
                        <span className={`ml-2 text-xs ${
                          theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                        }`}>(Siempre visible)</span>
                      )}
                    </span>
                    {isAlwaysVisible ? (
                      <div className={`p-1 ${
                        theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                      }`} title="Columna crítica - Siempre visible">
                        <Eye className="h-4 w-4" />
                      </div>
                    ) : (
                      <button
                        onClick={() => onToggleColumn(column.id)}
                        className={`p-1 rounded transition-colors ${
                          column.visible 
                            ? theme === 'dark'
                              ? 'text-green-400 hover:bg-green-900/30'
                              : 'text-green-600 hover:bg-green-100'
                            : theme === 'dark'
                              ? 'text-gray-500 hover:bg-gray-700'
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

            {/* Footer con estadísticas */}
            <div className="p-3 border-t border-gray-200 bg-gray-50">
              <div className="text-xs text-gray-600 text-center">
                {visibleCount} de {totalCount} columnas visibles
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
