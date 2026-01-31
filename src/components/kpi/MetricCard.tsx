'use client';

import { ReactNode } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'sky';
  className?: string;
}

const colorClasses = {
  blue: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    icon: 'text-blue-500',
    value: 'text-blue-600 dark:text-blue-400',
  },
  green: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    icon: 'text-emerald-500',
    value: 'text-emerald-600 dark:text-emerald-400',
  },
  amber: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    icon: 'text-amber-500',
    value: 'text-amber-600 dark:text-amber-400',
  },
  red: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    icon: 'text-red-500',
    value: 'text-red-600 dark:text-red-400',
  },
  purple: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    icon: 'text-purple-500',
    value: 'text-purple-600 dark:text-purple-400',
  },
  sky: {
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/30',
    icon: 'text-sky-500',
    value: 'text-sky-600 dark:text-sky-400',
  },
};

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'blue',
  className = '',
}: MetricCardProps) {
  const { theme } = useTheme();
  const colors = colorClasses[color];

  return (
    <div
      className={`border p-4 sm:p-5 transition-all ${theme === 'dark' ? 'border-slate-700/60 bg-slate-800' : 'border-gray-300 bg-white'} ${colors.border} ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {Icon && <Icon className={`h-5 w-5 ${colors.icon}`} />}
            <p className={`text-xs sm:text-sm font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
              {title}
            </p>
          </div>
          <p className={`text-2xl sm:text-3xl font-bold ${colors.value} mb-1`}>
            {typeof value === 'number' ? value.toLocaleString('es-CL') : value}
          </p>
          {subtitle && (
            <p className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>
              {subtitle}
            </p>
          )}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <span
                className={`text-xs font-semibold ${trend.isPositive ? 'text-emerald-500' : 'text-red-500'}`}
              >
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value).toFixed(1)}%
              </span>
              <span className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>
                vs período anterior
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
