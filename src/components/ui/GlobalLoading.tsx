'use client';

import { useLoading } from '@/contexts/LoadingContext';
import { useTheme } from '@/contexts/ThemeContext';
import { usePathname } from 'next/navigation';
import { useLayoutEffect, useRef } from 'react';

export const GlobalLoading = () => {
  const { isLoading, progress, currentStep, startLoading, updateProgress, stopLoading } = useLoading();
  const { theme } = useTheme();
  const pathname = usePathname();
  const hasStarted = useRef(false);

  // Iniciar loading inmediatamente al cambiar de ruta
  useLayoutEffect(() => {
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
    
    // INICIAR LOADING INMEDIATAMENTE ANTES DE CUALQUIER OTRA COSA
    startLoading(message);
    updateProgress(5, "Navegando...");

    // Simular progreso
    const timeouts: NodeJS.Timeout[] = [];

    // Para registros específicamente, extender el tiempo para cubrir carga real
    if (pathname === '/registros') {
      updateProgress(15, "Cargando embarques...");
      
      // Tiempos muy extendidos para registros (3.5 segundos total)
      timeouts.push(setTimeout(() => {
        updateProgress(25, "Preparando página...");
      }, 200));

      timeouts.push(setTimeout(() => {
        updateProgress(40, "Cargando componentes...");
      }, 600));

      timeouts.push(setTimeout(() => {
        updateProgress(55, "Cargando datos de embarques...");
      }, 1200));

      timeouts.push(setTimeout(() => {
        updateProgress(70, "Procesando registros...");
      }, 1800));

      timeouts.push(setTimeout(() => {
        updateProgress(85, "Optimizando vista...");
      }, 2400));

      timeouts.push(setTimeout(() => {
        updateProgress(95, "Finalizando...");
      }, 3000));

      timeouts.push(setTimeout(() => {
        updateProgress(100, "Completado");
        
        // Esperar a que la página esté realmente visible antes de desaparecer
        setTimeout(() => {
          // Verificar si el contenido está realmente cargado
          const checkContent = () => {
            const mainContent = document.querySelector('main, .main, [role="main"]');
            const hasContent = mainContent && mainContent.children.length > 0;
            
            if (hasContent) {
              // Dar tiempo extra para que se renderice completamente
              setTimeout(() => {
                stopLoading();
              }, 300);
            } else {
              // Si no hay contenido, esperar más y verificar de nuevo
              setTimeout(checkContent, 200);
            }
          };
          
          checkContent();
        }, 800); // Esperar más tiempo antes de verificar
      }, 3500)); // 3.5 segundos para registros
      
    } else if (pathname === '/documentos' || pathname === '/transportes') {
      // Para documentos y transportes, tiempo extendido similar a registros
      updateProgress(15, pathname === '/documentos' ? "Cargando documentos..." : "Cargando transportes...");
      
      timeouts.push(setTimeout(() => {
        updateProgress(25, "Preparando página...");
      }, 200));

      timeouts.push(setTimeout(() => {
        updateProgress(40, "Cargando componentes...");
      }, 600));

      timeouts.push(setTimeout(() => {
        updateProgress(55, pathname === '/documentos' ? "Cargando archivos..." : "Cargando datos...");
      }, 1200));

      timeouts.push(setTimeout(() => {
        updateProgress(70, pathname === '/documentos' ? "Procesando documentos..." : "Procesando transportes...");
      }, 1800));

      timeouts.push(setTimeout(() => {
        updateProgress(85, "Optimizando vista...");
      }, 2400));

      timeouts.push(setTimeout(() => {
        updateProgress(95, "Finalizando...");
      }, 3000));

      timeouts.push(setTimeout(() => {
        updateProgress(100, "Completado");
        
        // Esperar a que la página esté realmente visible antes de desaparecer
        setTimeout(() => {
          // Verificar si el contenido está realmente cargado
          const checkContent = () => {
            const mainContent = document.querySelector('main, .main, [role="main"]');
            const hasContent = mainContent && mainContent.children.length > 0;
            
            if (hasContent) {
              // Dar tiempo extra para que se renderice completamente
              setTimeout(() => {
                stopLoading();
              }, 300);
            } else {
              // Si no hay contenido, esperar más y verificar de nuevo
              setTimeout(checkContent, 200);
            }
          };
          
          checkContent();
        }, 800);
      }, 3500)); // 3.5 segundos para documentos y transportes
      
    } else {
      // Tiempos normales para otras páginas
      timeouts.push(setTimeout(() => {
        updateProgress(30, "Preparando página...");
      }, 25));

      timeouts.push(setTimeout(() => {
        updateProgress(60, "Cargando componentes...");
      }, 100));

      timeouts.push(setTimeout(() => {
        updateProgress(85, "Procesando datos...");
      }, 250));

      timeouts.push(setTimeout(() => {
        updateProgress(100, "Completado");
        setTimeout(() => {
          stopLoading();
        }, 200);
      }, 600));
    }

    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [pathname]);

  if (!isLoading) return null;

  const isDark = theme === 'dark';

  return (
    <div className={`fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden ${
      isDark
        ? 'bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900'
        : 'bg-gradient-to-br from-gray-50 via-white to-gray-50'
    }`}>
      {/* Efectos de fondo */}
      <div className="pointer-events-none absolute inset-0">
        {isDark ? (
          <>
            <div className="absolute -left-20 top-24 h-72 w-72 bg-sky-500/20 blur-3xl" />
            <div className="absolute bottom-16 left-1/2 h-80 w-80 -translate-x-1/2 bg-blue-600/10 blur-3xl" />
            <div className="absolute -bottom-12 right-16 h-64 w-64 bg-teal-500/10 blur-3xl" />
          </>
        ) : (
          <>
            <div className="absolute -left-20 top-24 h-72 w-72 bg-blue-500/10 blur-3xl" />
            <div className="absolute bottom-16 left-1/2 h-80 w-80 -translate-x-1/2 bg-indigo-500/10 blur-3xl" />
            <div className="absolute -bottom-12 right-16 h-64 w-64 bg-cyan-500/10 blur-3xl" />
          </>
        )}
      </div>

      {/* Contenedor principal */}
      <div className={`relative z-10 flex w-full max-w-md flex-col items-center gap-8 border p-8 text-center backdrop-blur-xl ${
        isDark
          ? 'border-white/10 bg-white/5'
          : 'border-gray-200 bg-white/80'
      }`}>
        {/* Logo */}
        <div
          className={`flex h-20 w-20 items-center justify-center ${
            isDark ? 'bg-white' : 'bg-gray-50'
          }`}
        >
          <img
            src="/logoasli.png"
            alt="Logo ASLI"
            width={80}
            height={80}
            className="h-14 w-14 object-contain"
          />
        </div>

        {/* Título */}
        <div className="space-y-2">
          <h1 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            ASLI Gestión Logística
          </h1>
          <p className={`text-sm ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
            {currentStep}
          </p>
        </div>

        {/* Barra de progreso */}
        <div className="w-full space-y-3">
          <div className={`w-full h-2 overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
            <div 
              className={`h-full transition-all duration-300 ease-out ${
                isDark ? 'bg-gradient-to-r from-blue-500 to-sky-500' : 'bg-gradient-to-r from-blue-600 to-sky-600'
              }`}
              style={{ width: `${progress}%` }}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Progreso de carga: ${progress}%`}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <span className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
              {progress}%
            </span>
            <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              Cargando recursos...
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
