'use client';
/* eslint-disable @next/next/no-img-element */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Verificar si hay sesión activa
    const checkSession = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        router.push('/dashboard');
      } else {
        router.push('/auth');
      }
    };

    checkSession();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0a1628' }}>
      <div className="text-center w-full max-w-4xl px-8">
        <div className="w-64 h-64 mx-auto mb-8 flex items-center justify-center">
          <img
            src="https://asli.cl/img/logo.png?v=1761679285274&t=1761679285274"
            alt="ASLI Logo"
            className="max-w-full max-h-full object-contain"
            style={{
              animation: 'zoomInOut 2s ease-in-out infinite'
            }}
            onError={(e) => {
              console.log('Error cargando logo:', e);
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold mb-4 px-4" style={{ color: '#ffffff' }}>
          Asesorías y Servicios Logísticos Integrales Ltda.
        </h2>
        <p className="text-lg" style={{ color: '#ffffff' }}>
          Redirigiendo...
        </p>
      </div>
    </div>
  );
}