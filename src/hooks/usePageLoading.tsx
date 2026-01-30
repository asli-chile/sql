'use client';

import { usePathname } from 'next/navigation';
import { useLoading } from '@/contexts/LoadingContext';
import { useEffect } from 'react';

export const usePageLoading = () => {
  const pathname = usePathname();
  const { startLoading, updateProgress, stopLoading } = useLoading();

  useEffect(() => {
    // Iniciar loading inmediatamente al cambiar de ruta
    const pageMessages: Record<string, string> = {
      '/dashboard': 'Cargando dashboard...',
      '/registros': 'Cargando registros de embarques...',
      '/documentos': 'Cargando documentos...',
      '/transportes': 'Cargando transportes...',
      '/finanzas': 'Cargando finanzas...',
      '/reportes': 'Cargando reportes...',
      '/mantenimiento': 'Cargando mantenimiento...',
    };

    const message = pageMessages[pathname] || 'Cargando página...';
    
    // Iniciar loading inmediatamente
    startLoading(message);
    updateProgress(5, "Navegando...");

    // Simular progreso de navegación
    const navTimeout = setTimeout(() => {
      updateProgress(20, "Preparando página...");
    }, 50);

    const prepTimeout = setTimeout(() => {
      updateProgress(40, "Cargando componentes...");
    }, 150);

    const dataTimeout = setTimeout(() => {
      updateProgress(70, "Procesando datos...");
    }, 350);

    const finalTimeout = setTimeout(() => {
      updateProgress(100, "Completado");
      setTimeout(() => {
        stopLoading();
      }, 300);
    }, 800);

    return () => {
      clearTimeout(navTimeout);
      clearTimeout(prepTimeout);
      clearTimeout(dataTimeout);
      clearTimeout(finalTimeout);
    };
  }, [pathname]); // Se ejecuta al cambiar de ruta
};
