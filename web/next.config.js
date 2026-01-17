/** @type {import('next').NextConfig} */
const erpBaseUrl =
  process.env.NEXT_PUBLIC_ERP_URL ||
  "https://registo-de-embarques-asli-toox.vercel.app";

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ["asli.cl"],
  },
  async rewrites() {
    return [
      // Rutas principales de la ERP
      { source: "/auth", destination: `${erpBaseUrl}/auth` },
      { source: "/contacto", destination: `${erpBaseUrl}/contacto` },
      { source: "/dashboard/:path*", destination: `${erpBaseUrl}/dashboard/:path*` },
      { source: "/documentos/:path*", destination: `${erpBaseUrl}/documentos/:path*` },
      { source: "/facturas/:path*", destination: `${erpBaseUrl}/facturas/:path*` },
      { source: "/itinerario/:path*", destination: `${erpBaseUrl}/itinerario/:path*` },
      { source: "/mantenimiento/:path*", destination: `${erpBaseUrl}/mantenimiento/:path*` },
      { source: "/profile/:path*", destination: `${erpBaseUrl}/profile/:path*` },
      { source: "/registros/:path*", destination: `${erpBaseUrl}/registros/:path*` },
      {
        source: "/tablas-personalizadas/:path*",
        destination: `${erpBaseUrl}/tablas-personalizadas/:path*`,
      },
      { source: "/transportes/:path*", destination: `${erpBaseUrl}/transportes/:path*` },
      { source: "/vessel-diagnose/:path*", destination: `${erpBaseUrl}/vessel-diagnose/:path*` },
      // Rutas API completas
      { source: "/api/:path*", destination: `${erpBaseUrl}/api/:path*` },
      // Assets estáticos de la ERP (logos, imágenes, etc.)
      { source: "/logoasli.png", destination: `${erpBaseUrl}/logoasli.png` },
      { source: "/_next/:path*", destination: `${erpBaseUrl}/_next/:path*` },
    ];
  },
};

module.exports = nextConfig;
