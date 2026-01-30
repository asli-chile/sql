'use client';

import { useLayoutEffect, useRef } from 'react';
import { useLoading } from '@/contexts/LoadingContext';

interface PageWrapperProps {
  children: React.ReactNode;
  loadingMessage?: string;
  dependencies?: any[];
}

export const PageWrapper: React.FC<PageWrapperProps> = ({ 
  children, 
  loadingMessage = "Cargando página...",
  dependencies = []
}) => {
  const { startLoading, stopLoading, updateProgress } = useLoading();
  const hasLoaded = useRef(false);

  useLayoutEffect(() => {
    // Evitar múltiples ciclos de loading
    if (hasLoaded.current) return;
    
    // Iniciar loading INMEDIATAMENTE sin espera
    startLoading(loadingMessage);
    updateProgress(10, "Iniciando...");

    // Fases de carga simples y controladas
    const timeouts: NodeJS.Timeout[] = [];

    // Fase 1: Inicialización (inmediato)
    timeouts.push(setTimeout(() => {
      updateProgress(30, "Cargando componentes...");
    }, 50)); // Muy rápido

    // Fase 2: Cargando componentes
    timeouts.push(setTimeout(() => {
      updateProgress(60, "Procesando datos...");
    }, 200));

    // Fase 3: Procesando datos
    timeouts.push(setTimeout(() => {
      updateProgress(90, "Finalizando...");
    }, 500));

    // Fase 4: Finalización
    timeouts.push(setTimeout(() => {
      updateProgress(100, "Completado");
      
      // Pequeña pausa y detener
      setTimeout(() => {
        stopLoading();
        hasLoaded.current = true;
      }, 300);
    }, 800));

    return () => {
      // Limpiar todos los timeouts
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, []); // Sin dependencias para evitar re-ejecuciones

  return <>{children}</>;
};
