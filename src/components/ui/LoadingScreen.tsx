'use client';

import Image from "next/image";
import { useTheme } from "@/contexts/ThemeContext";
import { useState, useEffect } from "react";

type LoadingScreenProps = {
  title?: string;
  message?: string;
};

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  title = "ASLI Gestión Logística",
  message = "Cargando...",
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("Inicializando sistema...");

  // Simular progreso real de carga
  useEffect(() => {
    const steps = [
      { progress: 10, message: "Inicializando sistema..." },
      { progress: 25, message: "Cargando configuración..." },
      { progress: 40, message: "Conectando con la base de datos..." },
      { progress: 55, message: "Verificando autenticación..." },
      { progress: 70, message: "Cargando componentes..." },
      { progress: 85, message: "Preparando interfaz..." },
      { progress: 95, message: "Optimizando rendimiento..." },
      { progress: 100, message: "Listo para comenzar" }
    ];

    let currentStepIndex = 0;
    
    const interval = setInterval(() => {
      if (currentStepIndex < steps.length) {
        const step = steps[currentStepIndex];
        setProgress(step.progress);
        setCurrentStep(step.message);
        currentStepIndex++;
      } else {
        clearInterval(interval);
      }
    }, 300); // Cada 300ms avanza al siguiente paso

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`relative flex min-h-screen items-center justify-center overflow-hidden ${
      isDark
        ? 'bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white'
        : 'bg-gradient-to-br from-gray-50 via-white to-gray-50 text-gray-900'
    }`}>
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

      <div className={`relative z-10 flex w-full max-w-xl flex-col items-center gap-8 border p-10 text-center backdrop-blur-xl ${
        isDark
          ? 'border-white/10 bg-white/5'
          : 'border-gray-200 bg-white/80'
      }`}>
        <div
          className={`flex h-24 w-24 items-center justify-center ${
            isDark ? 'bg-white' : 'bg-gray-50'
          }`}
          data-preserve-bg
        >
          <Image
            src="/logoasli.png"
            alt="Logo ASLI"
            width={96}
            height={96}
            className={`h-16 w-16 object-contain ${
              isDark
                ? 'drop-shadow-[0_0_18px_rgba(148,163,184,0.45)]'
                : 'drop-shadow-[0_0_18px_rgba(59,130,246,0.3)]'
            }`}
            priority
          />
        </div>

        <div className="space-y-3">
          <h1 className={`text-2xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{title}</h1>
          {message && (
            <p className={`text-base ${isDark ? 'text-slate-200' : 'text-gray-700'}`} aria-live="polite">
              {message}
            </p>
          )}
        </div>

        <div className="w-full max-w-md space-y-4">
          {/* Barra de progreso */}
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
          
          {/* Porcentaje y mensaje */}
          <div className="flex items-center justify-between">
            <span className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
              {progress}%
            </span>
            <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              {currentStep}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;

