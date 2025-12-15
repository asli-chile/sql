'use client';

import React from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
}

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Componente Error Boundary para capturar errores de React
 * y evitar que toda la aplicación se caiga
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log del error para debugging
    console.error('[ErrorBoundary] Error capturado:', error);
    console.error('[ErrorBoundary] Error Info:', errorInfo);

    // Guardar información del error en el estado
    this.setState({
      error,
      errorInfo,
    });

    // TODO: En el futuro, enviar a un servicio de monitoreo (Sentry, LogRocket, etc.)
    // if (process.env.NODE_ENV === 'production') {
    //   reportErrorToService(error, errorInfo);
    // }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Si hay un fallback personalizado, usarlo
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} resetError={this.handleReset} />;
      }

      // Fallback por defecto
      return <DefaultErrorFallback error={this.state.error} resetError={this.handleReset} />;
    }

    return this.props.children;
  }
}

/**
 * Componente de fallback por defecto para mostrar errores
 */
function DefaultErrorFallback({ error, resetError }: ErrorFallbackProps) {
  const router = useRouter();
  const isDevelopment = process.env.NODE_ENV === 'development';

  const handleGoHome = () => {
    resetError();
    router.push('/dashboard');
  };

  const handleReload = () => {
    resetError();
    window.location.reload();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4">
      <div className="w-full max-w-2xl rounded-2xl border border-rose-500/20 bg-slate-900/95 p-8 shadow-2xl shadow-rose-500/10 backdrop-blur-xl">
        <div className="flex flex-col items-center text-center">
          {/* Ícono de error */}
          <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full border-2 border-rose-500/40 bg-rose-500/10">
            <AlertCircle className="h-10 w-10 text-rose-400" aria-hidden="true" />
          </div>

          {/* Título */}
          <h1 className="mb-3 text-2xl font-bold text-white">
            Algo salió mal
          </h1>

          {/* Mensaje */}
          <p className="mb-6 text-slate-300">
            Lo sentimos, ocurrió un error inesperado. Nuestro equipo ha sido notificado.
          </p>

          {/* Mensaje de error (solo en desarrollo) */}
          {isDevelopment && error && (
            <div className="mb-6 w-full rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-left">
              <p className="mb-2 text-sm font-semibold text-rose-300">
                Detalles del error (solo visible en desarrollo):
              </p>
              <pre className="max-h-48 overflow-auto text-xs text-rose-200">
                {error.toString()}
                {error.stack && (
                  <>
                    {'\n\n'}
                    {error.stack}
                  </>
                )}
              </pre>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={resetError}
              className="inline-flex items-center gap-2 rounded-full border border-slate-700/70 bg-slate-800/70 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-slate-600 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              aria-label="Intentar de nuevo"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Intentar de nuevo
            </button>

            <button
              onClick={handleGoHome}
              className="inline-flex items-center gap-2 rounded-full border border-slate-700/70 bg-slate-800/70 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-slate-600 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              aria-label="Ir al inicio"
            >
              <Home className="h-4 w-4" aria-hidden="true" />
              Ir al inicio
            </button>

            <button
              onClick={handleReload}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              aria-label="Recargar página"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Recargar página
            </button>
          </div>

          {/* Información adicional */}
          <p className="mt-6 text-xs text-slate-500">
            Si el problema persiste, por favor contacta al soporte técnico.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook para usar Error Boundary de forma más fácil en componentes funcionales
 * Usa este hook si necesitas lanzar errores manualmente
 */
export function useErrorHandler() {
  return (error: Error, errorInfo?: React.ErrorInfo) => {
    console.error('[useErrorHandler] Error:', error, errorInfo);
    // En el futuro, esto podría integrarse con un servicio de monitoreo
    throw error;
  };
}

