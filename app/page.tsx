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
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          router.replace('/dashboard');
        } else {
          router.replace('/auth');
        }
      } catch (error) {
        console.error('Error checking session:', error);
        router.replace('/auth');
      }
    };

    checkSession();
  }, [router]);

  return <LoadingScreen message="Redirigiendo a tu experiencia personalizada..." />;
}