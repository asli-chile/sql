'use client';

import React from 'react';

export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        {/* Logo ASLI */}
        <div className="mx-auto w-16 h-16 mb-4 flex items-center justify-center">
          <img
            src="https://asli.cl/img/logo.png?v=1761679285274&t=1761679285274"
            alt="ASLI Logo"
            className="max-w-full max-h-full object-contain"
            onError={(e) => {
              console.log('Error cargando logo:', e);
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
        
        {/* Spinner */}
        <div className="flex items-center justify-center mb-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
        
        {/* Texto */}
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Sistema ASLI
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Cargando...
        </p>
      </div>
    </div>
  );
}
