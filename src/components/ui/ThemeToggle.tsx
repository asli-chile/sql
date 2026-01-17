'use client';

import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

type ThemeToggleProps = {
  variant?: 'icon' | 'switch';
  className?: string;
  label?: string;
};

export const ThemeToggle = ({ variant = 'icon', className = '', label = 'Tema' }: ThemeToggleProps) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const toggleLabel = isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
  const toggleTitle = isDark ? 'Modo claro' : 'Modo oscuro';

  if (variant === 'switch') {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        onClick={toggleTheme}
        className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 transition-colors ${
          isDark
            ? 'border-slate-700/60 bg-slate-900/60 text-slate-200 hover:border-sky-500/60'
            : 'border-gray-300 bg-white text-gray-700 hover:border-blue-500/60'
        } ${className}`}
        aria-label={toggleLabel}
        title={toggleTitle}
      >
        <span className="text-sm font-semibold">{label}</span>
        <span className="flex items-center gap-2">
          <span className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
            {isDark ? 'Oscuro' : 'Claro'}
          </span>
          <span
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              isDark ? 'bg-sky-500/60' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full shadow transition ${
                isDark ? 'translate-x-4 bg-slate-100' : 'translate-x-1 bg-white'
              }`}
            />
          </span>
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-all duration-200 ${
        isDark
          ? 'border-slate-700/60 bg-slate-900/60 text-slate-300 hover:border-sky-500/60 hover:bg-slate-800/60 hover:text-sky-200'
          : 'border-gray-300 bg-white text-gray-700 hover:border-blue-500/60 hover:bg-gray-50 hover:text-blue-600 shadow-sm'
      } ${className}`}
      aria-label={toggleLabel}
      title={toggleTitle}
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
};