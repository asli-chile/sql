/** @type {import('next').NextConfig} */
const erpBaseUrl =
  process.env.NEXT_PUBLIC_ERP_URL ||
  'https://registo-de-embarques-asli-toox.vercel.app'

/**
 * Rewrites solo para rutas del ERP.
 * NO reescribir /_next/* — esos assets pertenecen al landing.
 */
const erpRewrites = [
  { source: '/logoasli.png', destination: `${erpBaseUrl}/logoasli.png` },
  { source: '/api/:path*', destination: `${erpBaseUrl}/api/:path*` },
  { source: '/auth', destination: `${erpBaseUrl}/auth` },
  { source: '/auth/:path*', destination: `${erpBaseUrl}/auth/:path*` },
  { source: '/indicadores', destination: `${erpBaseUrl}/indicadores` },
  { source: '/indicadores/:path*', destination: `${erpBaseUrl}/indicadores/:path*` },
  { source: '/contacto', destination: `${erpBaseUrl}/contacto` },
  { source: '/dashboard', destination: `${erpBaseUrl}/dashboard` },
  { source: '/dashboard/:path*', destination: `${erpBaseUrl}/dashboard/:path*` },
  { source: '/documentos', destination: `${erpBaseUrl}/documentos` },
  { source: '/documentos/:path*', destination: `${erpBaseUrl}/documentos/:path*` },
  { source: '/facturas', destination: `${erpBaseUrl}/facturas` },
  { source: '/facturas/:path*', destination: `${erpBaseUrl}/facturas/:path*` },
  { source: '/facturar-preview', destination: `${erpBaseUrl}/facturar-preview` },
  { source: '/facturar-preview/:path*', destination: `${erpBaseUrl}/facturar-preview/:path*` },
  { source: '/itinerario', destination: `${erpBaseUrl}/itinerario` },
  { source: '/itinerario/:path*', destination: `${erpBaseUrl}/itinerario/:path*` },
  { source: '/itinerario-asli', destination: `${erpBaseUrl}/itinerario-asli` },
  { source: '/mantenimiento', destination: `${erpBaseUrl}/mantenimiento` },
  { source: '/mantenimiento/:path*', destination: `${erpBaseUrl}/mantenimiento/:path*` },
  { source: '/profile', destination: `${erpBaseUrl}/profile` },
  { source: '/profile/:path*', destination: `${erpBaseUrl}/profile/:path*` },
  { source: '/registros', destination: `${erpBaseUrl}/registros` },
  { source: '/registros/:path*', destination: `${erpBaseUrl}/registros/:path*` },
  { source: '/reportes', destination: `${erpBaseUrl}/reportes` },
  { source: '/reportes/:path*', destination: `${erpBaseUrl}/reportes/:path*` },
  { source: '/finanzas', destination: `${erpBaseUrl}/finanzas` },
  { source: '/finanzas/:path*', destination: `${erpBaseUrl}/finanzas/:path*` },
  {
    source: '/tablas-personalizadas',
    destination: `${erpBaseUrl}/tablas-personalizadas`,
  },
  {
    source: '/tablas-personalizadas/:path*',
    destination: `${erpBaseUrl}/tablas-personalizadas/:path*`,
  },
  { source: '/transportes', destination: `${erpBaseUrl}/transportes` },
  { source: '/transportes/:path*', destination: `${erpBaseUrl}/transportes/:path*` },
  { source: '/vessel-diagnose', destination: `${erpBaseUrl}/vessel-diagnose` },
  {
    source: '/vessel-diagnose/:path*',
    destination: `${erpBaseUrl}/vessel-diagnose/:path*`,
  },
  {
    source: '/generar-documentos',
    destination: `${erpBaseUrl}/generar-documentos`,
  },
  {
    source: '/generar-documentos/:path*',
    destination: `${erpBaseUrl}/generar-documentos/:path*`,
  },
]

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'asli.cl' }],
  },
  async rewrites() {
    // En desarrollo local el landing sirve solo sus páginas;
    // el CTA "Acceder a la app" va a localhost:3001 (ERP).
    if (process.env.NODE_ENV === 'development') {
      return []
    }
    return erpRewrites
  },
}

module.exports = nextConfig
