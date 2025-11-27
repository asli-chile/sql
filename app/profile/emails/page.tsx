'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingScreen from '@/components/ui/LoadingScreen';

export default function ProfileEmailsRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirigir a la ruta correcta
    router.replace('/dashboard/profile/emails');
  }, [router]);

  return <LoadingScreen message="Redirigiendo a gestión de emails..." />;
}

