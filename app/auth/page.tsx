'use client';

import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { AlertCircle, Eye, EyeOff, Lock, LogIn, Mail, User, UserPlus } from 'lucide-react';
import type { FormEvent } from 'react';
import { useState, useEffect } from 'react';

type AuthMode = 'login' | 'register';

const inputClasses =
  'w-full rounded-xl border border-white/10 bg-white/5 px-12 py-3 text-sm text-white placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/50';

const AuthPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

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
        router.push('/dashboard');
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

      router.push('/dashboard');
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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-12">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-16 h-72 w-72 rounded-full bg-sky-500/20 blur-3xl" />
        <div className="absolute bottom-12 right-12 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-500/10 blur-3xl" />
      </div>

      <section className="relative z-10 grid w-full max-w-5xl gap-8 rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-2xl md:grid-cols-[1fr_minmax(0,420px)]">
        <aside className="hidden flex-col justify-between rounded-2xl bg-gradient-to-br from-sky-500/20 via-slate-900/60 to-blue-600/30 p-8 text-slate-100 shadow-xl md:flex">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1 text-xs font-medium uppercase tracking-[0.35em] text-slate-100/90">
              Plataforma ASLI
            </span>
            <div className="space-y-4">
              <h2 className="text-3xl font-semibold text-white">
                Gestiona la logística con datos confiables y decisiones ágiles
              </h2>
              <p className="text-sm text-slate-200">
                Centraliza la información de tu operación y accede a tableros inteligentes para planificar, ejecutar y medir en tiempo real.
              </p>
            </div>
            <ul className="space-y-3 text-sm text-slate-100/80">
              <li className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-sky-300" aria-hidden="true" />
                Monitoreo continuo de embarques y documentación
              </li>
              <li className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-sky-300" aria-hidden="true" />
                Flujos colaborativos con tu equipo y clientes
              </li>
              <li className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-sky-300" aria-hidden="true" />
                Autenticación segura respaldada por Supabase
              </li>
            </ul>
          </div>
          <div className="mt-10 space-y-2 text-sm text-slate-200">
            <p className="font-medium text-white">Soporte dedicado</p>
            <p>Escríbenos a rodrigo.caceres@asli.cl</p>
          </div>
        </aside>

        <div className="rounded-2xl bg-slate-950/70 p-6 shadow-lg sm:p-8">
          <div className="mb-8 flex flex-col items-center gap-4 text-center md:items-start md:text-left">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-xl"
              data-preserve-bg
            >
              <Image
                src="/logoasli.png"
                alt="Logo ASLI"
                width={56}
                height={56}
                className="h-12 w-12 object-contain drop-shadow-[0_0_16px_rgba(125,211,252,0.45)]"
                priority
              />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold text-white">
                {isLogin ? 'Bienvenido de vuelta' : 'Crea tu acceso seguro'}
              </h1>
              <p className="text-sm text-slate-300">
                {isLogin
                  ? 'Ingresa tus credenciales para continuar gestionando tu operación.'
                  : 'Completa los datos para habilitar tu cuenta y comienza a colaborar.'}
              </p>
            </div>
          </div>

          <div className="mb-6 flex rounded-xl bg-white/5 p-1 text-sm font-medium">
            <button
              type="button"
              onClick={() => handleToggleMode('login')}
              aria-pressed={isLogin}
              aria-controls="auth-form"
              disabled={loading}
              className={`group flex-1 rounded-lg px-4 py-2 transition ${isLogin ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30' : 'text-slate-300 hover:bg-white/10'}`}
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
              className={`group flex-1 rounded-lg px-4 py-2 transition ${!isLogin ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30' : 'text-slate-300 hover:bg-white/10'}`}
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
              className={`mb-6 flex flex-col gap-2 rounded-xl border px-4 py-3 text-sm ${
                error.startsWith('✅')
                  ? 'border-green-500/40 bg-green-500/10 text-green-100'
                  : 'border-red-500/40 bg-red-500/10 text-red-100'
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
                <label htmlFor="fullName" className="text-sm font-medium text-slate-200">
                  Nombre / Exportadora
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
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
              <label htmlFor="email" className="text-sm font-medium text-slate-200">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
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
              <label htmlFor="password" className="text-sm font-medium text-slate-200">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
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
                  className="absolute right-4 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg bg-white/5 text-slate-300 transition hover:bg-white/10"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-200">
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
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
              className="group relative flex w-full items-center justify-center gap-3 rounded-xl bg-sky-500 py-3 text-sm font-semibold text-white transition hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
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

          <div className="mt-8 text-center text-sm text-slate-300">
            {isLogin ? (
              <p>
                ¿No tienes cuenta?
                <button
                  type="button"
                  onClick={() => handleToggleMode('register')}
                  className="ml-2 text-sky-300 underline-offset-4 transition hover:text-sky-200 hover:underline"
                >
                  Solicitar acceso
                </button>
              </p>
            ) : (
              <p>
                ¿Ya perteneces a ASLI?
                <button
                  type="button"
                  onClick={() => handleToggleMode('login')}
                  className="ml-2 text-sky-300 underline-offset-4 transition hover:text-sky-200 hover:underline"
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

