(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push(["chunks/[root-of-the-server]__22898bb3._.js",
"[externals]/node:buffer [external] (node:buffer, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:buffer", () => require("node:buffer"));

module.exports = mod;
}),
"[externals]/node:async_hooks [external] (node:async_hooks, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:async_hooks", () => require("node:async_hooks"));

module.exports = mod;
}),
"[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/middleware.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "config",
    ()=>config,
    "middleware",
    ()=>middleware
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/node_modules/@supabase/ssr/dist/module/index.js [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/node_modules/@supabase/ssr/dist/module/createServerClient.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$next$2f$dist$2f$esm$2f$api$2f$server$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/node_modules/next/dist/esm/api/server.js [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/node_modules/next/dist/esm/server/web/exports/index.js [middleware-edge] (ecmascript)");
;
;
async function middleware(req) {
    const { pathname } = req.nextUrl;
    const origin = req.headers.get('origin') || '';
    // 1. Manejo de CORS para la App Móvil (Capacitor)
    // Permitir localhost (Android) y capacitor://localhost (iOS)
    const isAllowedOrigin = origin.includes('localhost') || origin.includes('capacitor://');
    if (pathname.startsWith('/api/') && isAllowedOrigin) {
        // Si es una solicitud OPTIONS (preflight), responder inmediatamente
        if (req.method === 'OPTIONS') {
            return new __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"](null, {
                status: 204,
                headers: {
                    'Access-Control-Allow-Origin': origin,
                    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
                    'Access-Control-Allow-Credentials': 'true'
                }
            });
        }
    }
    // Detectar si viene desde asli.cl
    const forwardedHost = req.headers.get('x-forwarded-host') || '';
    const host = req.headers.get('host') || '';
    const referer = req.headers.get('referer') || '';
    const isFromAsliCl = forwardedHost.includes('asli.cl') || host.includes('asli.cl') || referer.includes('asli.cl') || origin.includes('asli.cl');
    // Si viene desde asli.cl, retornar con headers de CORS si es necesario
    if (isFromAsliCl) {
        const res = __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next({
            request: {
                headers: req.headers
            }
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
    let res = __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next({
        request: {
            headers: req.headers
        }
    });
    // Usar SOLO variables de entorno (sin fallbacks hardcodeados para seguridad)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('❌ ERROR: Variables de entorno NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY deben estar definidas en .env.local');
    }
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["createServerClient"])(supabaseUrl, supabaseAnonKey, {
        cookies: {
            get (name) {
                return req.cookies.get(name)?.value;
            },
            set (name, value, options) {
                req.cookies.set({
                    name,
                    value,
                    ...options
                });
                res = __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next({
                    request: {
                        headers: req.headers
                    }
                });
                res.cookies.set({
                    name,
                    value,
                    ...options
                });
            },
            remove (name, options) {
                req.cookies.set({
                    name,
                    value: '',
                    ...options
                });
                res = __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next({
                    request: {
                        headers: req.headers
                    }
                });
                res.cookies.set({
                    name,
                    value: '',
                    ...options
                });
            }
        }
    });
    const { data: { session } } = await supabase.auth.getSession();
    // Rutas que requieren autenticación
    const protectedRoutes = [
        '/dashboard',
        '/registros',
        '/documentos',
        '/facturas',
        '/tablas-personalizadas',
        '/reportes',
        '/finanzas',
        '/facturar-preview'
    ];
    const authRoutes = [
        '/auth'
    ];
    // Comportamiento normal cuando NO viene desde asli.cl (acceso directo al dominio de Vercel)
    // Si está en una ruta protegida y no tiene sesión, redirigir a auth
    if (protectedRoutes.some((route)=>pathname.startsWith(route)) && !session) {
        const authUrl = new URL('/auth', req.url);
        authUrl.search = '';
        return __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(authUrl);
    }
    // Si está en auth y ya tiene sesión, redirigir a dashboard
    if (pathname === '/auth' && session) {
        const dashboardUrl = new URL('/dashboard', req.url);
        return __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(dashboardUrl);
    }
    // Si está en la raíz, redirigir a dashboard si tiene sesión, sino a auth
    if (pathname === '/') {
        if (session) {
            const dashboardUrl = new URL('/dashboard', req.url);
            return __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(dashboardUrl);
        } else {
            const authUrl = new URL('/auth', req.url);
            authUrl.search = '';
            return __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(authUrl);
        }
    }
    return res;
}
const config = {
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
     */ '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
    ]
};
}),
]);

//# sourceMappingURL=%5Broot-of-the-server%5D__22898bb3._.js.map