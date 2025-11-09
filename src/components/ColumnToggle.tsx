'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [panelPosition, setPanelPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [isMounted, setIsMounted] = useState(false);
  const { theme } = useTheme();

  const visibleCount = columns.filter(col => col.visible).length;
  const totalCount = columns.length;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const padding = 12;
      const panelWidth = 288; // w-72
      const left = Math.max(16, Math.min(rect.left, window.innerWidth - panelWidth - 16));
      const top = rect.bottom + padding;
      setPanelPosition({ top, left });
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen]);

  return (
    <div className="relative">
      {/* Botón principal */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
          theme === 'dark'
            ? 'border border-slate-800/70 bg-slate-900/60 text-slate-300 hover:border-sky-500/60 hover:text-sky-200 focus-visible:ring-sky-500/40 focus-visible:ring-offset-slate-950'
            : 'border border-gray-300 bg-white text-gray-700 hover:border-blue-400 hover:text-blue-600 focus-visible:ring-blue-400/40 focus-visible:ring-offset-white'
        }`}
        title="Mostrar/Ocultar Columnas"
      >
        <Settings className="h-4 w-4" />
        <span className="hidden sm:inline">Columnas</span>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
          theme === 'dark'
            ? 'bg-sky-500/15 text-sky-200'
            : 'bg-blue-100 text-blue-700'
        }`}>
          {visibleCount}/{totalCount}
        </span>
      </button>

      {isOpen && isMounted && createPortal(
        <div className="pointer-events-auto">
          <div
            className="fixed inset-0 z-[1100]"
            onClick={() => setIsOpen(false)}
          />
          <div
            className={`fixed z-[1110] max-h-[80vh] w-72 overflow-y-auto rounded-2xl border shadow-2xl backdrop-blur ${
              theme === 'dark'
                ? 'border-slate-800/70 bg-slate-950/95'
                : 'border-gray-200 bg-white'
            }`}
            style={{
              top: `${panelPosition.top}px`,
              left: `${panelPosition.left}px`
            }}
          >
            {/* Header */}
            <div className={`p-3 border-b ${
              theme === 'dark' ? 'border-slate-800/60' : 'border-gray-200'
            }`}>
              <div className="flex items-center justify-between">
                <h3 className={`text-sm font-semibold ${
                  theme === 'dark' ? 'text-slate-200' : 'text-gray-900'
                }`}>Columnas</h3>
                <div className="flex space-x-2">
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
            </div>

            {/* Lista de columnas */}
            <div className="p-2">
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

            {/* Footer con estadísticas */}
            <div className={`p-3 border-t text-center text-xs ${
              theme === 'dark'
                ? 'border-slate-800/60 bg-slate-900/60 text-slate-400'
                : 'border-gray-200 bg-gray-50 text-gray-600'
            }`}>
              {visibleCount} de {totalCount} columnas visibles
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
