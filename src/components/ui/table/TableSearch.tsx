'use client';

import React from 'react';
import { Search } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface TableSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const TableSearch: React.FC<TableSearchProps> = ({
  value,
  onChange,
  placeholder = 'Buscar...',
  className = '',
  disabled = false,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const containerClasses = `relative flex-1 min-w-0 max-w-full ${className}`;
  const inputClasses = `w-full min-w-[120px] max-w-full border pl-8 sm:pl-10 md:pl-11 pr-3 sm:pr-4 py-2 sm:py-2.5 text-xs sm:text-sm transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed ${
    isDark
      ? 'bg-slate-950/70 border-slate-800/70 text-slate-200 focus-visible:ring-sky-500/40 focus-visible:ring-offset-slate-950'
      : 'bg-white border-gray-300 text-gray-700 focus-visible:ring-blue-400/40 focus-visible:ring-offset-white'
  }`;

  const iconClasses = `pointer-events-none absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 ${
    isDark ? 'text-slate-400' : 'text-gray-400'
  }`;

  return (
    <div className={containerClasses}>
      <Search className={`${iconClasses} h-4 w-4 sm:h-5 sm:w-5`} />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={inputClasses}
      />
    </div>
  );
};

export default TableSearch;
