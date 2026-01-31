'use client';

import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { AlertCircle, Eye, EyeOff, Lock, LogIn, Mail, User, UserPlus, Building2 } from 'lucide-react';
import type { FormEvent } from 'react';
import { useState, useEffect } from 'react';

type AuthMode = 'login' | 'request-access';

const AuthPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const inputClasses = `w-full border px-12 py-3.5 text-sm transition-all focus:outline-none focus:ring-2 ${isDark
    ? 'border-slate-600 bg-slate-800 text-slate-100 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500/20'
    : 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500/20'
    }`;

  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resendingEmail, setResendingEmail] = useState(false);

  // Limpiar parámetros de URL si contienen credenciales (seguridad)
  useEffect(() => {
    const emailParam = searchParams.get('email');
    const passwordParam = searchParams.get('password');

    if (emailParam || passwordParam) {
      // Si hay credenciales en la URL, limpiarlas inmediatamente
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('email');
      newUrl.searchParams.delete('password');
      // Reemplazar la URL sin recargar la página
      window.history.replaceState({}, '', newUrl.pathname);

      // Si hay email, prellenarlo (pero NUNCA la contraseña)
      if (emailParam) {
        setEmail(emailParam);
      }

      // Mostrar advertencia de seguridad
      setError('⚠️ Por seguridad, las credenciales no deben estar en la URL. Por favor, ingresa tu contraseña manualmente.');
    }
  }, [searchParams]);

  const isLogin = authMode === 'login';
  const passwordAutoComplete = 'current-password';

  const handleToggleMode = (mode: AuthMode) => {
    if (loading || mode === authMode) {
      return;
    }

    setAuthMode(mode);
    setError('');
    setSuccess('');
    setNombreUsuario('');
    setEmpresa('');
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword((prevState) => !prevState);
  };

  const handleResendConfirmationEmail = async () => {
    if (!email || resendingEmail) {
      return;
    }

    setResendingEmail(true);
    setError('');

    try {
      const normalizedEmail = email.toLowerCase().trim();

      // Verificar si el email es secundario y obtener el email principal
      // Usar ruta relativa (funciona tanto en desarrollo como en producción)
      const fetchUrl = `/api/user/check-email?email=${encodeURIComponent(normalizedEmail)}`;
      console.log('[Resend] Fetching:', fetchUrl);
      const checkEmailResponse = await fetch(fetchUrl);
      let emailToUse = normalizedEmail;

      if (checkEmailResponse.ok) {
        const checkEmailData = await checkEmailResponse.json();
        if (checkEmailData.primary_email) {
          emailToUse = checkEmailData.primary_email.toLowerCase().trim();
        }
      }

      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: emailToUse,
      });

      if (resendError) {
        setError('Error al reenviar el email. Verifica que el email sea correcto.');
      } else {
        setError('✅ Email de confirmación reenviado. Revisa tu bandeja de entrada.');
      }
    } catch (err) {
      console.error('[Resend] Error:', err);
      setError('Error al reenviar el email. Por favor, intenta nuevamente.');
    } finally {
      setResendingEmail(false);
    }
  };

  const handleAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (loading) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        // Normalizar email a minúsculas para evitar problemas
        const normalizedEmail = email.toLowerCase().trim();

        console.log('[Login] Iniciando login con email:', normalizedEmail);

        // 1. Primero, verificar si el email es secundario y obtener el email principal
      // Usar ruta relativa (funciona tanto en desarrollo como en producción)
      const fetchUrl = `/api/user/check-email?email=${encodeURIComponent(normalizedEmail)}`;
      console.log('[Login] Fetching:', fetchUrl);
      const checkEmailResponse = await fetch(fetchUrl);

        if (!checkEmailResponse.ok) {
          console.error('[Login] Error al verificar email:', checkEmailResponse.statusText);
          // Continuar con login normal si falla la verificación
        }

        const checkEmailData = await checkEmailResponse.json();
        console.log('[Login] Respuesta de check-email:', checkEmailData);

        let emailToUse = normalizedEmail;

        if (checkEmailResponse.ok && checkEmailData.primary_email) {
          // Si es un email secundario, usar el email principal para autenticar
          emailToUse = checkEmailData.primary_email.toLowerCase().trim();
          console.log('[Login] Email es secundario, usando email principal:', emailToUse);
        } else {
          console.log('[Login] Email es principal o no existe como secundario, usando:', emailToUse);
        }

        // 2. Hacer login con Supabase usando el email correcto (principal o el mismo si no es secundario)
        console.log('[Login] Intentando autenticar con Supabase...');
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: emailToUse,
          password,
        });

        if (signInError) {
          console.error('[Login] Error de Supabase:', signInError);

          // Mejorar mensaje de error para el usuario
          if (signInError.message === 'Invalid login credentials' || signInError.message.includes('credentials')) {
            setError('Credenciales inválidas. Verifica tu email y contraseña.');
          } else if (signInError.message === 'Email not confirmed' || signInError.message.includes('not confirmed')) {
            setError('Tu email no ha sido confirmado. Revisa tu bandeja de entrada y haz clic en el enlace de confirmación.');
          } else {
            setError(signInError.message || 'Error al iniciar sesión. Por favor, intenta nuevamente.');
          }

          setLoading(false); // ✅ Limpiar estado de carga en error
          return;
        }

        if (!signInData.session) {
          setError('No se pudo crear la sesión. Por favor, intenta nuevamente.');
          setLoading(false); // ✅ Limpiar estado de carga en error
          return;
        }

        console.log('[Login] Login exitoso, redirigiendo...');
        // Usar window.location.replace para evitar bucles con middleware y rewrites
        // Esto fuerza una navegación completa del navegador en lugar de una navegación del cliente
        window.location.replace('/dashboard');
        return;
      }

      // Modo solicitud de acceso
      if (!nombreUsuario || !nombreUsuario.trim()) {
        setError('El nombre de usuario es requerido');
        setLoading(false);
        return;
      }

      if (!empresa || !empresa.trim()) {
        setError('La empresa es requerida');
        setLoading(false);
        return;
      }

      try {
        // Usar ruta relativa (funciona tanto en desarrollo como en producción)
        const response = await fetch(`/api/auth/request-access`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nombreUsuario: nombreUsuario.trim(),
            empresa: empresa.trim(),
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Error al enviar la solicitud. Por favor, intenta nuevamente.');
          return;
        }

        // Abrir el cliente de correo con el mailto
        if (data.mailtoLink) {
          window.location.href = data.mailtoLink;
          setSuccess('✅ Solicitud enviada. Se ha abierto tu cliente de correo. Por favor, confirma el envío del email.');
          // Limpiar formulario
          setNombreUsuario('');
          setEmpresa('');
        } else {
          setError('Error al preparar el email. Por favor, intenta nuevamente.');
        }
      } catch (authError: any) {
        console.error('[Auth] Error inesperado:', authError);
        setError(authError?.message ?? 'Error inesperado en la solicitud. Por favor, intenta nuevamente.');
      } finally {
        setLoading(false);
      }
    } catch (authError: any) {
      console.error('[Auth] Error inesperado general:', authError);
      setError(authError?.message || 'Error de autenticación');
      setLoading(false);
    }
  };

  return (
    <main className={`relative flex h-screen items-center justify-center overflow-hidden px-4 py-4 ${isDark
      ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950'
      : 'bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100'
      }`}>
      {/* Botón de cambio de tema - Esquina superior derecha */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle variant="icon" />
      </div>

      {/* Efectos de fondo sutiles */}
      <div className="pointer-events-none absolute inset-0">
        {isDark ? (
          <>
            <div className="absolute -left-20 top-16 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
            <div className="absolute bottom-12 right-12 h-80 w-80 rounded-full bg-sky-500/10 blur-3xl" />
            <div className="absolute top-1/2 left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/10 blur-3xl" />
          </>
        ) : (
          <>
            <div className="absolute -left-20 top-16 h-96 w-96 rounded-full bg-blue-400/20 blur-3xl" />
            <div className="absolute bottom-12 right-12 h-80 w-80 rounded-full bg-sky-400/15 blur-3xl" />
            <div className="absolute top-1/2 left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-300/10 blur-3xl" />
          </>
        )}
      </div>

      <section className={`relative z-10 grid w-full max-w-6xl gap-0 border backdrop-blur-xl md:grid-cols-[1.2fr_1fr] overflow-hidden ${isDark
        ? 'border-slate-700/80 bg-slate-800/80'
        : 'border-slate-200/80 bg-white/80'
        }`}>
        {/* Panel izquierdo - Información */}
        <aside className="hidden flex-col justify-between bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-6 text-white md:flex overflow-y-auto">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-white/95">
              Plataforma ASLI
            </div>
            <div className="space-y-3">
              <h2 className="text-2xl sm:text-3xl font-bold leading-tight text-white">
                Gestiona la logística con datos confiables y decisiones ágiles
              </h2>
              <p className="text-sm leading-relaxed text-blue-50/90">
                Centraliza la información de tu operación y accede a tableros inteligentes para planificar, ejecutar y medir en tiempo real.
              </p>
            </div>
            <ul className="space-y-3 text-sm text-blue-50/90">
              <li className="flex items-start gap-4">
                <span className="mt-1.5 h-2.5 w-2.5 flex-shrink-0 bg-white" aria-hidden="true" />
                <span>Monitoreo continuo de embarques y documentación</span>
              </li>
              <li className="flex items-start gap-4">
                <span className="mt-1.5 h-2.5 w-2.5 flex-shrink-0 bg-white" aria-hidden="true" />
                <span>Flujos colaborativos con tu equipo y clientes</span>
              </li>
              <li className="flex items-start gap-4">
                <span className="mt-1.5 h-2.5 w-2.5 flex-shrink-0 bg-white" aria-hidden="true" />
                <span>Autenticación segura respaldada por Supabase</span>
              </li>
            </ul>
          </div>
          <div className="mt-6 space-y-1 bg-white/10 backdrop-blur-sm p-4 border border-white/20">
            <p className="font-semibold text-sm text-white">Soporte dedicado</p>
            <p className="text-xs text-blue-50/90">Escríbenos a rodrigo.caceres@asli.cl</p>
          </div>
        </aside>

        {/* Panel derecho - Formulario */}
        <div className={`p-6 overflow-y-auto ${isDark ? 'bg-slate-800' : 'bg-white'
          }`}>
          <div className="mb-6 flex flex-col items-center gap-3 text-center md:items-start md:text-left">
            <div
              className={`flex h-20 w-20 items-center justify-center bg-gradient-to-br ${isDark
                ? 'from-blue-600 to-indigo-700'
                : 'from-blue-500 to-indigo-600'
                }`}
              data-preserve-bg
            >
              <Image
                src="/logoasli.png"
                alt="Logo ASLI"
                width={64}
                height={64}
                className="h-14 w-14 object-contain"
                priority
              />
            </div>
            <div className="space-y-1">
              <h1 className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-white' : 'text-slate-900'
                }`}>
                {isLogin ? 'Bienvenido de vuelta' : 'Solicita tu acceso'}
              </h1>
              <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'
                }`}>
                {isLogin
                  ? 'Ingresa tus credenciales para continuar gestionando tu operación.'
                  : 'Completa los datos y te contactaremos para darte acceso.'}
              </p>
            </div>
          </div>

          <div className={`mb-6 flex p-1.5 text-sm font-medium ${isDark ? 'bg-slate-700/50' : 'bg-slate-100'
            }`}>
            <button
              type="button"
              onClick={() => handleToggleMode('login')}
              aria-pressed={isLogin}
              aria-controls="auth-form"
              disabled={loading}
              className={`group flex-1 px-5 py-2.5 transition-all duration-200 ${isLogin
                ? isDark
                  ? 'bg-slate-700 text-blue-400 font-semibold'
                  : 'bg-white text-blue-600 font-semibold'
                : isDark
                  ? 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
            >
              <span className="flex items-center justify-center gap-2">
                <LogIn className="h-4 w-4" aria-hidden="true" />
                Iniciar sesión
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleToggleMode('request-access')}
              aria-pressed={!isLogin}
              aria-controls="auth-form"
              disabled={loading}
              className={`group flex-1 px-5 py-2.5 transition-all duration-200 ${!isLogin
                ? isDark
                  ? 'bg-slate-700 text-blue-400 font-semibold'
                  : 'bg-white text-blue-600 font-semibold'
                : isDark
                  ? 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
            >
              <span className="flex items-center justify-center gap-2">
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                Solicita tu acceso
              </span>
            </button>
          </div>

          {success && (
            <div
              role="alert"
              aria-live="assertive"
              className={`mb-4 flex flex-col gap-2 border-2 px-4 py-3 text-sm ${isDark
                ? 'border-green-500/50 bg-green-900/30 text-green-300'
                : 'border-green-200 bg-green-50 text-green-800'
                }`}
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                <span className="flex-1">{success}</span>
              </div>
            </div>
          )}

          {error && (
            <div
              role="alert"
              aria-live="assertive"
              className={`mb-4 flex flex-col gap-2 border-2 px-4 py-3 text-sm ${error.startsWith('✅')
                ? isDark
                  ? 'border-green-500/50 bg-green-900/30 text-green-300'
                  : 'border-green-200 bg-green-50 text-green-800'
                : isDark
                  ? 'border-red-500/50 bg-red-900/30 text-red-300'
                  : 'border-red-200 bg-red-50 text-red-800'
                }`}
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                <span className="flex-1">{error}</span>
              </div>
              {error.includes('no ha sido confirmado') && (
                <button
                  type="button"
                  onClick={handleResendConfirmationEmail}
                  disabled={resendingEmail || !email}
                  className="ml-8 text-left text-xs underline-offset-2 transition hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resendingEmail ? 'Reenviando...' : '¿No recibiste el email? Haz clic aquí para reenviarlo'}
                </button>
              )}
            </div>
          )}

          <form id="auth-form" onSubmit={handleAuth} className="space-y-4" noValidate>
            {!isLogin ? (
              <>
                <div className="space-y-2">
                  <label htmlFor="nombreUsuario" className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'
                    }`}>
                    Nombre de usuario
                  </label>
                  <div className="relative">
                    <User className={`absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'
                      }`} aria-hidden="true" />
                    <input
                      id="nombreUsuario"
                      name="nombreUsuario"
                      type="text"
                      autoComplete="name"
                      value={nombreUsuario}
                      onChange={(event) => setNombreUsuario(event.target.value)}
                      className={inputClasses}
                      placeholder="Ej: Ana Pérez"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="empresa" className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'
                    }`}>
                    Empresa
                  </label>
                  <div className="relative">
                    <Building2 className={`absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'
                      }`} aria-hidden="true" />
                    <input
                      id="empresa"
                      name="empresa"
                      type="text"
                      autoComplete="organization"
                      value={empresa}
                      onChange={(event) => setEmpresa(event.target.value)}
                      className={inputClasses}
                      placeholder="Ej: Empresa Exportadora S.A."
                      required
                    />
                  </div>
                </div>
              </>
            ) : null}

            {isLogin && (
              <>
                <div className="space-y-2">
                  <label htmlFor="email" className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'
                    }`}>
                    Email
                  </label>
                  <div className="relative">
                    <Mail className={`absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'
                      }`} aria-hidden="true" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className={inputClasses}
                      placeholder="tu@empresa.com"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'
                    }`}>
                    Contraseña
                  </label>
                  <div className="relative">
                    <Lock className={`absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'
                      }`} aria-hidden="true" />
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={passwordAutoComplete}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className={inputClasses}
                      placeholder="Ingresa tu contraseña"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={handleTogglePasswordVisibility}
                      className={`absolute right-4 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center transition ${isDark
                        ? 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-slate-300'
                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                        }`}
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                    </button>
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              aria-busy={loading}
              className={`group relative flex w-full items-center justify-center gap-3 bg-gradient-to-r py-4 text-sm font-semibold text-white transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-70 ${isDark
                ? 'from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-600 focus:ring-offset-slate-800'
                : 'from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:ring-offset-white'
                }`}
            >
              {loading ? (
                <>
                  <span className="flex h-5 w-5 items-center justify-center">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  </span>
                  {isLogin ? 'Iniciando sesión...' : 'Enviando solicitud...'}
                </>
              ) : (
                <>
                  {isLogin ? <LogIn className="h-4 w-4" aria-hidden="true" /> : <Mail className="h-4 w-4" aria-hidden="true" />}
                  {isLogin ? 'Ingresar' : 'Enviar solicitud'}
                </>
              )}
            </button>
          </form>

          <div className={`mt-6 text-center text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'
            }`}>
            {isLogin ? (
              <p>
                ¿No tienes cuenta?{' '}
                <button
                  type="button"
                  onClick={() => handleToggleMode('request-access')}
                  className={`font-semibold underline-offset-4 transition hover:underline ${isDark
                    ? 'text-blue-400 hover:text-blue-300'
                    : 'text-blue-600 hover:text-blue-700'
                    }`}
                >
                  Solicita tu acceso
                </button>
              </p>
            ) : (
              <p>
                ¿Ya perteneces a ASLI?{' '}
                <button
                  type="button"
                  onClick={() => handleToggleMode('login')}
                  className={`font-semibold underline-offset-4 transition hover:underline ${isDark
                    ? 'text-blue-400 hover:text-blue-300'
                    : 'text-blue-600 hover:text-blue-700'
                    }`}
                >
                  Inicia sesión aquí
                </button>
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
};

export default AuthPage;

