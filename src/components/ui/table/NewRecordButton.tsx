'use client';

import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';

interface NewRecordButtonProps {
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export const NewRecordButton: React.FC<NewRecordButtonProps> = ({
  onClick,
  disabled = false,
  loading = false,
  className = '',
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const baseClasses = 'flex-col justify-center flex-shrink-0 px-4 sm:px-5 md:px-6 py-3 sm:py-3.5 md:py-4 min-h-[60px] sm:min-h-[68px] md:min-h-[76px] min-w-[140px] sm:min-w-[160px] md:min-w-[180px] font-semibold leading-tight tracking-wide transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = isDark
    ? 'bg-sky-600 text-white hover:bg-sky-700 focus-visible:ring-sky-500/60 focus-visible:ring-offset-slate-950'
    : 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-400 focus-visible:ring-offset-white';

  const classes = `${baseClasses} ${variantClasses} ${className}`;

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={classes}
      aria-label="Nuevo registro"
    >
      {loading ? (
        <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent" />
      ) : (
        <span className="text-[11px] sm:text-xs md:text-sm !text-white text-center uppercase">
          <span className="block">+ NUEVO</span>
          <span className="block">REGISTRO</span>
        </span>
      )}
    </button>
  );
};

export default NewRecordButton;
