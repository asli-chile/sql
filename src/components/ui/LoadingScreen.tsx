'use client';

import Image from "next/image";
import { useTheme } from "@/contexts/ThemeContext";

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

  return (
    <div className={`relative flex min-h-screen items-center justify-center overflow-hidden ${
      isDark
        ? 'bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white'
        : 'bg-gradient-to-br from-gray-50 via-white to-gray-50 text-gray-900'
    }`}>
      <div className="pointer-events-none absolute inset-0">
        {isDark ? (
          <>
            <div className="absolute -left-20 top-24 h-72 w-72 rounded-full bg-sky-500/20 blur-3xl" />
            <div className="absolute bottom-16 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-blue-600/10 blur-3xl" />
            <div className="absolute -bottom-12 right-16 h-64 w-64 rounded-full bg-teal-500/10 blur-3xl" />
          </>
        ) : (
          <>
            <div className="absolute -left-20 top-24 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
            <div className="absolute bottom-16 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-indigo-500/10 blur-3xl" />
            <div className="absolute -bottom-12 right-16 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
          </>
        )}
      </div>

      <div className={`relative z-10 flex w-full max-w-xl flex-col items-center gap-8 rounded-3xl border p-10 text-center shadow-2xl backdrop-blur-xl ${
        isDark
          ? 'border-white/10 bg-white/5'
          : 'border-gray-200 bg-white/80'
      }`}>
        <div
          className={`flex h-24 w-24 items-center justify-center rounded-full shadow-xl ${
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

        <div className="flex flex-col items-center gap-2">
          <span
            className={`flex h-12 w-12 items-center justify-center rounded-full border-2 ${
              isDark
                ? 'border-white/10 bg-white/10'
                : 'border-gray-300 bg-gray-100'
            }`}
            role="status"
            aria-live="assertive"
            aria-label="Cargando contenido"
          >
            <span className={`h-8 w-8 animate-spin rounded-full border-2 ${
              isDark
                ? 'border-white/20 border-t-white'
                : 'border-gray-300 border-t-blue-600'
            }`} />
          </span>
          <span className={`text-xs uppercase tracking-[0.3em] ${
            isDark ? 'text-slate-300' : 'text-gray-600'
          }`}>
            Preparando recursos
          </span>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;

