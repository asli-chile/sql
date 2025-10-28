'use client';

import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';

export function ThemeTest() {
  const { theme } = useTheme();

  return (
    <div 
      className="px-2 py-1 rounded text-xs font-mono border"
      style={{
        backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
        color: theme === 'dark' ? '#f9fafb' : '#111827',
        borderColor: theme === 'dark' ? '#374151' : '#d1d5db'
      }}
    >
      <div 
        className="w-3 h-3 rounded-full inline-block mr-2"
        style={{
          backgroundColor: theme === 'dark' ? '#10b981' : '#ef4444'
        }}
      ></div>
      {theme}
    </div>
  );
}
