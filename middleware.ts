import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const origin = req.headers.get('origin') || '';

  // 1. Manejo de CORS para la App Móvil (Capacitor)
  // Permitir localhost (Android) y capacitor://localhost (iOS)
  const isAllowedOrigin = origin.includes('localhost') || origin.includes('capacitor://');

  if (pathname.startsWith('/api/') && isAllowedOrigin) {
    // Si es una solicitud OPTIONS (preflight), responder inmediatamente
    if (req.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
          'Access-Control-Allow-Credentials': 'true',
        },
      });
    }
  }

  // Detectar si viene desde asli.cl
  const forwardedHost = req.headers.get('x-forwarded-host') || '';
  const host = req.headers.get('host') || '';
  const referer = req.headers.get('referer') || '';
  const isFromAsliCl =
    forwardedHost.includes('asli.cl') ||
    host.includes('asli.cl') ||
    referer.includes('asli.cl') ||
    origin.includes('asli.cl');

  // Si viene desde asli.cl, retornar con headers de CORS si es necesario
  if (isFromAsliCl) {
    const res = NextResponse.next({
      request: {
        headers: req.headers,
      },
    });

    if (pathname.startsWith('/api/') && isAllowedOrigin) {
      res.headers.set('Access-Control-Allow-Origin', origin);
      res.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
      res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
      res.headers.set('Access-Control-Allow-Credentials', 'true');
    }

    return res;
  }

  // Solo continuar con la lógica del middleware si NO viene desde asli.cl
  let res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  // Usar SOLO variables de entorno (sin fallbacks hardcodeados para seguridad)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('❌ ERROR: Variables de entorno NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY deben estar definidas en .env.local')
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          req.cookies.set({
            name,
            value,
            ...options,
          });
          res = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });
          res.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: any) {
          req.cookies.set({
            name,
            value: '',
            ...options,
          });
          res = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });
          res.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Rutas que requieren autenticación
  const protectedRoutes = ['/dashboard', '/registros', '/documentos', '/facturas', '/reportes', '/finanzas', '/facturar-preview'];
  const authRoutes = ['/auth'];

  // Comportamiento normal cuando NO viene desde asli.cl (acceso directo al dominio de Vercel)

  // Si está en una ruta protegida y no tiene sesión, redirigir a auth
  if (protectedRoutes.some(route => pathname.startsWith(route)) && !session) {
    const authUrl = new URL('/auth', req.url);
    authUrl.search = '';
    return NextResponse.redirect(authUrl);
  }

  // Si está en auth y ya tiene sesión, redirigir a dashboard
  if (pathname === '/auth' && session) {
    const dashboardUrl = new URL('/dashboard', req.url);
    return NextResponse.redirect(dashboardUrl);
  }

  // Si está en la raíz, redirigir a dashboard si tiene sesión, sino a auth
  if (pathname === '/') {
    if (session) {
      const dashboardUrl = new URL('/dashboard', req.url);
      return NextResponse.redirect(dashboardUrl);
    } else {
      const authUrl = new URL('/auth', req.url);
      authUrl.search = '';
      return NextResponse.redirect(authUrl);
    }
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * 
     * NOTA: El middleware se deshabilita completamente cuando viene desde asli.cl
     * dentro de la función middleware(), pero el matcher aún procesa todas las rutas
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
