'use client';

import React from 'react';

export default function RegistrosLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="text-center w-full max-w-4xl px-8">
        {/* Logo ASLI con animación - MUY GRANDE */}
        <div className="mx-auto w-64 h-64 mb-8 flex items-center justify-center">
          <img
            src="https://asli.cl/img/logo.png?v=1761679285274&t=1761679285274"
            alt="ASLI Logo"
            className="max-w-full max-h-full object-contain"
            style={{
              animation: 'zoomInOut 2s ease-in-out infinite'
            }}
            onError={(e) => {
              console.log('Error cargando logo:', e);
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
        
        {/* Texto */}
        <h2 className="text-3xl font-semibold text-gray-900 dark:text-white mb-4">
          Sistema ASLI
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-2">
          Cargando Registros...
        </p>
        <p className="text-base text-gray-500 dark:text-gray-500">
          Gestión de Embarques
        </p>
      </div>
    </div>
  );
}
