'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface LoadingContextType {
  isLoading: boolean;
  progress: number;
  currentStep: string;
  startLoading: (message?: string) => void;
  stopLoading: () => void;
  updateProgress: (progress: number, step?: string) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within LoadingProvider');
  }
  return context;
};

interface LoadingProviderProps {
  children: ReactNode;
}

export const LoadingProvider: React.FC<LoadingProviderProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("Cargando...");

  const startLoading = (message = "Cargando...") => {
    setIsLoading(true);
    setProgress(0);
    setCurrentStep(message);
  };

  const stopLoading = () => {
    setIsLoading(false);
    setProgress(100);
    setCurrentStep("Completado");
  };

  const updateProgress = (newProgress: number, step?: string) => {
    setProgress(Math.min(100, Math.max(0, newProgress)));
    if (step) {
      setCurrentStep(step);
    }
  };

  // Eliminado el progreso automático para evitar ciclos infinitos
  // El progreso ahora se controla completamente desde PageWrapper

  return (
    <LoadingContext.Provider
      value={{
        isLoading,
        progress,
        currentStep,
        startLoading,
        stopLoading,
        updateProgress,
      }}
    >
      {children}
    </LoadingContext.Provider>
  );
};
