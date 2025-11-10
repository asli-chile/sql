import Image from "next/image";

type LoadingScreenProps = {
  title?: string;
  message?: string;
};

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  title = "ASLI Gestión Logística",
  message = "Cargando...",
}) => {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-24 h-72 w-72 rounded-full bg-sky-500/20 blur-3xl" />
        <div className="absolute bottom-16 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute -bottom-12 right-16 h-64 w-64 rounded-full bg-teal-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 flex w-full max-w-xl flex-col items-center gap-8 rounded-3xl border border-white/10 bg-white/5 p-10 text-center shadow-2xl backdrop-blur-xl">
        <div
          className="flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-xl"
          data-preserve-bg
        >
          <Image
            src="/logoasli.png"
            alt="Logo ASLI"
            width={96}
            height={96}
            className="h-16 w-16 object-contain drop-shadow-[0_0_18px_rgba(148,163,184,0.45)]"
            priority
          />
        </div>

        <div className="space-y-3">
          <h1 className="text-2xl font-semibold text-white">{title}</h1>
          {message && (
            <p className="text-base text-slate-200" aria-live="polite">
              {message}
            </p>
          )}
        </div>

        <div className="flex flex-col items-center gap-2">
          <span
            className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white/10 bg-white/10"
            role="status"
            aria-live="assertive"
            aria-label="Cargando contenido"
          >
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          </span>
          <span className="text-xs uppercase tracking-[0.3em] text-slate-300">
            Preparando recursos
          </span>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;

