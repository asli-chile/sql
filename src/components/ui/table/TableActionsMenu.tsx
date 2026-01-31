'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Menu, Grid, List, Eye, Download, RefreshCw } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface TableActionsMenuProps {
  // Estado y acciones básicas
  viewMode: 'table' | 'cards';
  onViewModeChange: (mode: 'table' | 'cards') => void;
  
  // Acciones opcionales
  onExport?: () => void;
  onReset?: () => void;
  
  // Opciones de Sheets (opcional)
  showSheets?: boolean;
  onSheetsToggle?: () => void;
  sheetsVisible?: boolean;
  
  // Personalización
  className?: string;
  disabled?: boolean;
}

export const TableActionsMenu: React.FC<TableActionsMenuProps> = ({
  viewMode,
  onViewModeChange,
  onExport,
  onReset,
  showSheets = false,
  onSheetsToggle,
  sheetsVisible = false,
  className = '',
  disabled = false,
}) => {
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Cerrar menú con Escape
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  const isDark = theme === 'dark';
  const buttonClasses = `
    inline-flex items-center gap-2 px-2 py-2 text-sm font-medium transition-colors
    focus:outline-none focus-visible:ring-1 focus-visible:ring-offset-1
    disabled:opacity-50 disabled:cursor-not-allowed
    ${isDark 
      ? 'text-slate-300 hover:bg-slate-800 focus-visible:ring-slate-500 focus-visible:ring-offset-slate-950' 
      : 'text-gray-700 hover:bg-gray-100 focus-visible:ring-gray-400 focus-visible:ring-offset-white'
    }
  `;

  const dropdownClasses = `
    absolute top-full left-0 mt-1 z-50 min-w-[200px] rounded-lg shadow-lg border
    ${isDark 
      ? 'bg-slate-900 border-slate-700' 
      : 'bg-white border-gray-200'
    }
  `;

  const itemClasses = `
    w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2
    ${isDark 
      ? 'hover:bg-slate-800 text-slate-200' 
      : 'hover:bg-gray-100 text-gray-700'
    }
  `;

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={buttonClasses}
        aria-label="Menú de acciones de la tabla"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Menu className="h-4 w-4" />
      </button>
      
      {isOpen && (
        <div className={dropdownClasses}>
          <div className="py-1">
            {/* Cambiar vista */}
            <button
              onClick={() => handleAction(() => onViewModeChange(viewMode === 'table' ? 'cards' : 'table'))}
              className={itemClasses}
            >
              {viewMode === 'table' ? <Grid className="h-4 w-4" /> : <List className="h-4 w-4" />}
              {viewMode === 'table' ? 'Tarjetas' : 'Tabla'}
            </button>

            {/* Sheets (si está disponible) */}
            {showSheets && onSheetsToggle && (
              <button
                onClick={() => handleAction(onSheetsToggle)}
                className={itemClasses}
              >
                <Eye className="h-4 w-4" />
                {sheetsVisible ? 'Ocultar' : 'Ver'} Sheets
              </button>
            )}

            {/* Exportar (si está disponible) */}
            {onExport && (
              <button
                onClick={() => handleAction(onExport)}
                className={itemClasses}
              >
                <Download className="h-4 w-4" />
                Exportar
              </button>
            )}

            {/* Reset (si está disponible) */}
            {onReset && (
              <button
                onClick={() => handleAction(onReset)}
                className={itemClasses}
              >
                <RefreshCw className="h-4 w-4" />
                Reset
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TableActionsMenu;
