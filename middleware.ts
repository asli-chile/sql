import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
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
  const protectedRoutes = ['/dashboard', '/registros', '/documentos', '/facturas'];
  const authRoutes = ['/auth'];

  const { pathname } = req.nextUrl;

  // Si está en una ruta protegida y no tiene sesión, redirigir a auth
  if (protectedRoutes.some(route => pathname.startsWith(route)) && !session) {
    return NextResponse.redirect(new URL('/auth', req.url));
  }

  // Si está en auth y ya tiene sesión, redirigir a dashboard
  if (authRoutes.some(route => pathname.startsWith(route)) && session) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Si está en la raíz, redirigir a dashboard si tiene sesión, sino a auth
  if (pathname === '/') {
    if (session) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    } else {
      return NextResponse.redirect(new URL('/auth', req.url));
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
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
