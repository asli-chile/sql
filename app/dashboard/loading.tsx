'use client';

import React from 'react';

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        {/* Logo ASLI */}
        <div className="mx-auto w-20 h-20 mb-6 flex items-center justify-center">
          <img
            src="/logo-asli.png"
            alt="ASLI Logo"
            className="max-w-full max-h-full object-contain"
          />
        </div>
        
        {/* Spinner */}
        <div className="flex items-center justify-center mb-6">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
        
        {/* Texto */}
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Sistema ASLI
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
          Cargando Dashboard...
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500">
          Gestión Logística Integral
        </p>
      </div>
    </div>
  );
}
