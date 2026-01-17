import type { NextConfig } from "next";

// NO usar assetPrefix cuando se accede desde asli.cl (vía rewrites)
// El assetPrefix solo se usa si se accede directamente al dominio de Vercel
const isProd = process.env.NODE_ENV === "production";
const assetPrefix = undefined; // Deshabilitado para permitir rewrites desde asli.cl

const nextConfig: NextConfig = {
  /* config options here */
  assetPrefix,
  // Configuración de Turbopack (vacía para usar webpack)
  turbopack: {},
  
  webpack: (config, { isServer }) => {
    // Excluir deck.gl y mapbox de SSR
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    // Ignorar módulos específicos durante el build del servidor
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        '@deck.gl/core': 'commonjs @deck.gl/core',
        '@deck.gl/layers': 'commonjs @deck.gl/layers',
        '@deck.gl/react': 'commonjs @deck.gl/react',
        'maplibre-gl': 'commonjs maplibre-gl',
        'react-map-gl': 'commonjs react-map-gl',
      });
    }
    
    return config;
  },
};

export default nextConfig;
