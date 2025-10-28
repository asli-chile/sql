'use client';

import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  const handleToggle = () => {
    console.log('🔄 Cambiando tema de', theme, 'a', theme === 'light' ? 'dark' : 'light');
    
    // Cambio directo en el DOM
    const root = document.documentElement;
    const newTheme = theme === 'light' ? 'dark' : 'light';
    
    root.classList.remove('light', 'dark');
    root.classList.add(newTheme);
    
    // Forzar estilos del body
    if (newTheme === 'light') {
      document.body.style.backgroundColor = '#f9fafb';
      document.body.style.color = '#111827';
    } else {
      document.body.style.backgroundColor = '#0a0a0a';
      document.body.style.color = '#ededed';
    }
    
    console.log('🎨 Aplicado directamente:', newTheme);
    console.log('📋 Clases del documento:', root.className);
    console.log('🎨 Body background:', document.body.style.backgroundColor);
    
    // También llamar al contexto
    toggleTheme();
  };

  return (
    <button
      onClick={handleToggle}
      className="flex items-center justify-center w-10 h-10 rounded-lg transition-colors border"
      style={{
        backgroundColor: theme === 'dark' ? '#374151' : '#f3f4f6',
        color: theme === 'dark' ? '#f9fafb' : '#374151',
        borderColor: theme === 'dark' ? '#4b5563' : '#d1d5db'
      }}
      title={`Cambiar a tema ${theme === 'light' ? 'oscuro' : 'claro'}`}
    >
      {theme === 'light' ? (
        <Moon className="w-5 h-5" />
      ) : (
        <Sun className="w-5 h-5" style={{ color: '#fbbf24' }} />
      )}
    </button>
  );
}
