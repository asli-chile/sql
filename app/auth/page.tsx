'use client';

import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { AlertCircle, Eye, EyeOff, Lock, LogIn, Mail, User, UserPlus } from 'lucide-react';
import type { FormEvent } from 'react';
import { useState, useEffect } from 'react';

type AuthMode = 'login' | 'register';

const AuthPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const inputClasses = `w-full rounded-xl border px-12 py-3.5 text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:shadow-md ${
    isDark
      ? 'border-slate-600 bg-slate-800 text-slate-100 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500/20'
      : 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500/20'
  }`;

  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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
  const passwordAutoComplete = isLogin ? 'current-password' : 'new-password';

  const handleToggleMode = (mode: AuthMode) => {
    if (loading || mode === authMode) {
      return;
    }

    setAuthMode(mode);
    setError('');
    setConfirmPassword('');
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
      const checkEmailResponse = await fetch(`/api/user/check-email?email=${encodeURIComponent(normalizedEmail)}`);
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
        const checkEmailResponse = await fetch(`/api/user/check-email?email=${encodeURIComponent(normalizedEmail)}`);
        
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
          
          return;
        }

        if (!signInData.session) {
          setError('No se pudo crear la sesión. Por favor, intenta nuevamente.');
          return;
        }

        console.log('[Login] Login exitoso, redirigiendo...');
        // Usar window.location.replace para evitar bucles con middleware y rewrites
        // Esto fuerza una navegación completa del navegador en lugar de una navegación del cliente
        window.location.replace('/dashboard');
        return;
      }

      if (password !== confirmPassword) {
        setError('Las contraseñas no coinciden');
        return;
      }

      if (password.length < 6) {
        setError('La contraseña debe tener al menos 6 caracteres');
        return;
      }

      // Normalizar email a minúsculas
      const normalizedEmail = email.toLowerCase().trim();

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      if (signUpError) {
        // Mejorar mensaje de error para el usuario
        if (signUpError.message.includes('already registered') || signUpError.message.includes('already exists')) {
          setError('Este email ya está registrado. Por favor, inicia sesión en su lugar.');
        } else if (signUpError.message.includes('invalid')) {
          setError('Email inválido. Por favor, verifica el formato.');
        } else {
          setError(signUpError.message || 'Error al crear la cuenta. Por favor, intenta nuevamente.');
        }
        return;
      }

      if (data.user && !data.user.email_confirmed_at) {
        setError('Revisa tu email para confirmar tu cuenta');
        return;
      }

      // Usar window.location.replace para evitar bucles con middleware y rewrites
      // Esto fuerza una navegación completa del navegador en lugar de una navegación del cliente
      window.location.replace('/dashboard');
    } catch (authError: any) {
      console.error('[Auth] Error inesperado:', authError);
      // El error ya debería estar establecido en setError() dentro de los bloques try
      // Este catch solo maneja errores inesperados
      if (!error) {
        setError(authError?.message ?? 'Error inesperado en la autenticación. Por favor, intenta nuevamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={`relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12 ${
      isDark
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

      <section className={`relative z-10 grid w-full max-w-6xl gap-0 rounded-3xl border shadow-2xl backdrop-blur-xl md:grid-cols-[1.2fr_1fr] overflow-hidden ${
        isDark
          ? 'border-slate-700/80 bg-slate-800/80'
          : 'border-slate-200/80 bg-white/80'
      }`}>
        {/* Panel izquierdo - Información */}
        <aside className="hidden flex-col justify-between rounded-l-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-10 text-white shadow-2xl md:flex">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-5 py-2 text-xs font-semibold uppercase tracking-wider text-white/95 shadow-lg">
              Plataforma ASLI
            </div>
            <div className="space-y-5">
              <h2 className="text-4xl font-bold leading-tight text-white">
                Gestiona la logística con datos confiables y decisiones ágiles
              </h2>
              <p className="text-base leading-relaxed text-blue-50/90">
                Centraliza la información de tu operación y accede a tableros inteligentes para planificar, ejecutar y medir en tiempo real.
              </p>
            </div>
            <ul className="space-y-4 text-base text-blue-50/90">
              <li className="flex items-start gap-4">
                <span className="mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-white shadow-lg" aria-hidden="true" />
                <span>Monitoreo continuo de embarques y documentación</span>
              </li>
              <li className="flex items-start gap-4">
                <span className="mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-white shadow-lg" aria-hidden="true" />
                <span>Flujos colaborativos con tu equipo y clientes</span>
              </li>
              <li className="flex items-start gap-4">
                <span className="mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-white shadow-lg" aria-hidden="true" />
                <span>Autenticación segura respaldada por Supabase</span>
              </li>
            </ul>
          </div>
          <div className="mt-12 space-y-2 rounded-xl bg-white/10 backdrop-blur-sm p-5 border border-white/20">
            <p className="font-semibold text-white">Soporte dedicado</p>
            <p className="text-sm text-blue-50/90">Escríbenos a rodrigo.caceres@asli.cl</p>
          </div>
        </aside>

        {/* Panel derecho - Formulario */}
        <div className={`rounded-r-3xl p-8 shadow-xl sm:p-10 ${
          isDark ? 'bg-slate-800' : 'bg-white'
        }`}>
          <div className="mb-10 flex flex-col items-center gap-5 text-center md:items-start md:text-left">
            <div
              className={`flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br shadow-lg ${
                isDark
                  ? 'from-blue-600 to-indigo-700 shadow-blue-500/30'
                  : 'from-blue-500 to-indigo-600 shadow-blue-500/30'
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
            <div className="space-y-2">
              <h1 className={`text-3xl font-bold ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}>
                {isLogin ? 'Bienvenido de vuelta' : 'Crea tu acceso seguro'}
              </h1>
              <p className={`text-base ${
                isDark ? 'text-slate-300' : 'text-slate-600'
              }`}>
                {isLogin
                  ? 'Ingresa tus credenciales para continuar gestionando tu operación.'
                  : 'Completa los datos para habilitar tu cuenta y comienza a colaborar.'}
              </p>
            </div>
          </div>

          <div className={`mb-8 flex rounded-xl p-1.5 text-sm font-medium shadow-inner ${
            isDark ? 'bg-slate-700/50' : 'bg-slate-100'
          }`}>
            <button
              type="button"
              onClick={() => handleToggleMode('login')}
              aria-pressed={isLogin}
              aria-controls="auth-form"
              disabled={loading}
              className={`group flex-1 rounded-lg px-5 py-2.5 transition-all duration-200 ${
                isLogin
                  ? isDark
                    ? 'bg-slate-700 text-blue-400 shadow-md shadow-blue-500/20 font-semibold'
                    : 'bg-white text-blue-600 shadow-md shadow-blue-500/20 font-semibold'
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
              onClick={() => handleToggleMode('register')}
              aria-pressed={!isLogin}
              aria-controls="auth-form"
              disabled={loading}
              className={`group flex-1 rounded-lg px-5 py-2.5 transition-all duration-200 ${
                !isLogin
                  ? isDark
                    ? 'bg-slate-700 text-blue-400 shadow-md shadow-blue-500/20 font-semibold'
                    : 'bg-white text-blue-600 shadow-md shadow-blue-500/20 font-semibold'
                  : isDark
                    ? 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                Registrarse
              </span>
            </button>
          </div>

          {error && (
            <div
              role="alert"
              aria-live="assertive"
              className={`mb-6 flex flex-col gap-2 rounded-xl border-2 px-5 py-4 text-sm shadow-sm ${
                error.startsWith('✅')
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
            {!isLogin && (
              <div className="space-y-2">
                <label htmlFor="fullName" className={`text-sm font-semibold ${
                  isDark ? 'text-slate-200' : 'text-slate-700'
                }`}>
                  Nombre / Exportadora
                </label>
                <div className="relative">
                  <User className={`absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 ${
                    isDark ? 'text-slate-500' : 'text-slate-400'
                  }`} aria-hidden="true" />
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    autoComplete="name"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className={inputClasses}
                    placeholder="Ej: Ana Pérez"
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className={`text-sm font-semibold ${
                isDark ? 'text-slate-200' : 'text-slate-700'
              }`}>
                Email
              </label>
              <div className="relative">
                <Mail className={`absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 ${
                  isDark ? 'text-slate-500' : 'text-slate-400'
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
              <label htmlFor="password" className={`text-sm font-semibold ${
                isDark ? 'text-slate-200' : 'text-slate-700'
              }`}>
                Contraseña
              </label>
              <div className="relative">
                <Lock className={`absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 ${
                  isDark ? 'text-slate-500' : 'text-slate-400'
                }`} aria-hidden="true" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={passwordAutoComplete}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={inputClasses}
                  placeholder={isLogin ? 'Ingresa tu contraseña' : 'Crea una contraseña segura'}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={handleTogglePasswordVisibility}
                  className={`absolute right-4 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg transition ${
                    isDark
                      ? 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-slate-300'
                      : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                  }`}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className={`text-sm font-semibold ${
                  isDark ? 'text-slate-200' : 'text-slate-700'
                }`}>
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <Lock className={`absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 ${
                    isDark ? 'text-slate-500' : 'text-slate-400'
                  }`} aria-hidden="true" />
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className={inputClasses}
                    placeholder="Repite tu contraseña"
                    required
                    minLength={6}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              aria-busy={loading}
              className={`group relative flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r py-4 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:shadow-lg ${
                isDark
                  ? 'from-blue-600 to-indigo-600 shadow-blue-500/30 hover:from-blue-500 hover:to-indigo-600 hover:shadow-blue-500/40 focus:ring-offset-slate-800'
                  : 'from-blue-600 to-indigo-600 shadow-blue-500/30 hover:from-blue-700 hover:to-indigo-700 hover:shadow-blue-500/40 focus:ring-offset-white'
              }`}
            >
              {loading ? (
                <>
                  <span className="flex h-5 w-5 items-center justify-center">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  </span>
                  {isLogin ? 'Iniciando sesión...' : 'Creando cuenta...'}
                </>
              ) : (
                <>
                  {isLogin ? <LogIn className="h-4 w-4" aria-hidden="true" /> : <UserPlus className="h-4 w-4" aria-hidden="true" />}
                  {isLogin ? 'Ingresar' : 'Registrarme'}
                </>
              )}
            </button>
          </form>

          <div className={`mt-8 text-center text-sm ${
            isDark ? 'text-slate-300' : 'text-slate-600'
          }`}>
            {isLogin ? (
              <p>
                ¿No tienes cuenta?{' '}
                <button
                  type="button"
                  onClick={() => handleToggleMode('register')}
                  className={`font-semibold underline-offset-4 transition hover:underline ${
                    isDark
                      ? 'text-blue-400 hover:text-blue-300'
                      : 'text-blue-600 hover:text-blue-700'
                  }`}
                >
                  Solicitar acceso
                </button>
              </p>
            ) : (
              <p>
                ¿Ya perteneces a ASLI?{' '}
                <button
                  type="button"
                  onClick={() => handleToggleMode('login')}
                  className={`font-semibold underline-offset-4 transition hover:underline ${
                    isDark
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

