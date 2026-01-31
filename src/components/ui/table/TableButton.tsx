'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface TableButtonProps {
  // Contenido
  icon: LucideIcon;
  text?: string;
  textVisible?: boolean;
  
  // Comportamiento
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  
  // Estado visual
  variant?: 'default' | 'primary' | 'destructive' | 'active';
  size?: 'sm' | 'md' | 'lg';
  
  // Accesibilidad
  ariaLabel?: string;
  
  // Personalización
  className?: string;
  badge?: string | number;
}

export const TableButton: React.FC<TableButtonProps> = ({
  icon: Icon,
  text,
  textVisible = true,
  onClick,
  disabled = false,
  loading = false,
  variant = 'default',
  size = 'md',
  ariaLabel,
  className = '',
  badge,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Base classes
  const baseClasses = 'inline-flex items-center gap-1.5 sm:gap-2 font-medium transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed';
  
  // Size classes
  const sizeClasses = {
    sm: 'px-2 py-1.5 text-xs',
    md: 'px-2 sm:px-3 md:px-5 py-2 sm:py-2.5 text-xs sm:text-sm',
    lg: 'px-4 py-3 text-sm',
  }[size];

  // Variant classes
  const variantClasses = {
    default: isDark
      ? 'border border-slate-800/70 bg-slate-900/60 text-slate-300 hover:border-sky-500/60 hover:text-sky-200 focus-visible:ring-sky-500/40 focus-visible:ring-offset-slate-950'
      : 'border border-gray-300 bg-white text-gray-700 hover:border-blue-500 hover:text-blue-600 focus-visible:ring-blue-400/40 focus-visible:ring-offset-white',
    primary: isDark
      ? 'bg-sky-600 text-white hover:bg-sky-700 focus-visible:ring-sky-500/60 focus-visible:ring-offset-slate-950'
      : 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-400 focus-visible:ring-offset-white',
    destructive: isDark
      ? 'border border-red-500 bg-red-500 text-white hover:bg-red-600 focus-visible:ring-red-400/50 focus-visible:ring-offset-slate-950'
      : 'border border-red-500 bg-red-500 text-black hover:bg-red-600 focus-visible:ring-red-400/40 focus-visible:ring-offset-white',
    active: isDark
      ? 'border border-sky-500/70 bg-sky-500/10 text-sky-200 focus-visible:ring-sky-500/40 focus-visible:ring-offset-slate-950'
      : 'border border-blue-500 bg-blue-50 text-blue-600 focus-visible:ring-blue-400/40 focus-visible:ring-offset-white',
  }[variant];

  const classes = `${baseClasses} ${sizeClasses} ${variantClasses} ${className}`;

  // Icon size based on button size
  const iconSize = {
    sm: 'h-4 w-4',
    md: 'h-4 w-4 sm:h-5 sm:w-5',
    lg: 'h-5 w-5',
  }[size];

  // Text visibility
  const shouldShowText = textVisible && text;
  const textClasses = variant === 'primary' 
    ? 'hidden sm:inline whitespace-nowrap' 
    : size === 'lg' 
      ? 'whitespace-nowrap' 
      : 'hidden xl:inline whitespace-nowrap';

  // Badge classes
  const badgeClasses = isDark
    ? 'ml-1.5 inline-flex items-center border px-1.5 sm:px-2 py-0.5 text-[10px] font-medium bg-white/20 text-white'
    : 'ml-1.5 inline-flex items-center border px-1.5 sm:px-2 py-0.5 text-[10px] font-medium bg-black/15 text-black';

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={classes}
      aria-label={ariaLabel}
    >
      {loading ? (
        <div className="animate-spin h-4 w-4 sm:h-5 sm:w-5 border-2 border-current border-t-transparent" />
      ) : (
        <Icon className={iconSize} />
      )}
      
      {shouldShowText && (
        <span className={textClasses}>
          {text}
        </span>
      )}
      
      {badge && (
        <span className={badgeClasses}>
          {badge}
        </span>
      )}
    </button>
  );
};

export default TableButton;
