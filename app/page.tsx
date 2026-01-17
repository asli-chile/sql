'use client';
/* eslint-disable @next/next/no-img-element */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import LoadingScreen from '@/components/ui/LoadingScreen';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Verificar si hay sesión activa
    const checkSession = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Usar window.location.replace para evitar bucles con rewrites
        window.location.replace('/dashboard');
      } else {
        // Usar window.location.replace para evitar bucles con rewrites
        window.location.replace('/auth');
      }
    };

    checkSession();
  }, []);

  return <LoadingScreen message="Redirigiendo a tu experiencia personalizada..." />;
}