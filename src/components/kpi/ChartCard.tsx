'use client';

import { ReactNode } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

interface ChartCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function ChartCard({ title, description, children, className = '' }: ChartCardProps) {
  const { theme } = useTheme();

  return (
    <div
      className={`border p-4 sm:p-5 ${theme === 'dark' ? 'border-slate-700/60 bg-slate-800' : 'border-gray-300 bg-white'} ${className}`}
    >
      <div className="mb-4">
        <h3 className={`text-base sm:text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          {title}
        </h3>
        {description && (
          <p className={`text-xs sm:text-sm mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
            {description}
          </p>
        )}
      </div>
      <div className="w-full">
        {children}
      </div>
    </div>
  );
}
