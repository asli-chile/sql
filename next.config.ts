import type { NextConfig } from "next";

// Usar assetPrefix apuntando al dominio de Vercel de la ERP
// Esto hace que los assets se carguen directamente desde el dominio de Vercel
// incluso cuando se accede desde asli.cl (no necesita rewrites)
const isCapacitor = process.env.CAPACITOR_BUILD === "true";
const isProd = process.env.NODE_ENV === "production";
const assetPrefix = (isProd && !isCapacitor)
  ? process.env.NEXT_PUBLIC_ASSET_PREFIX || "https://registo-de-embarques-asli-toox.vercel.app"
  : undefined;

const nextConfig: NextConfig = {
  /* config options here */
  output: isCapacitor ? 'export' : undefined,
  typescript: {
    ignoreBuildErrors: isCapacitor,
  },
  // @ts-ignore
  eslint: {
    ignoreDuringBuilds: isCapacitor,
  },
  images: {
    unoptimized: true,
  },
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
