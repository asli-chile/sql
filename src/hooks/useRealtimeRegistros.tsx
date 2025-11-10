'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { convertSupabaseToApp } from '@/lib/migration-utils';
import type { Registro } from '@/types/registros';

type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE';

type OnChangePayload = {
  event: RealtimeEvent;
  registro: Registro;
};

type UseRealtimeRegistrosOptions = {
  onChange: (payload: OnChangePayload) => void;
  enabled?: boolean;
};

export function useRealtimeRegistros({ onChange, enabled = true }: UseRealtimeRegistrosOptions) {
  useEffect(() => {
    if (!enabled) return;

    const supabase = createClient();
    const channel = supabase
      .channel('realtime-registros')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'registros',
        },
        (payload) => {
          try {
            const event = payload.eventType as RealtimeEvent;
            const rawRecord = payload.new ?? payload.old;
            if (!rawRecord) return;

            const registro = convertSupabaseToApp(rawRecord);
            onChange({ event, registro });
          } catch (err) {
            console.warn('Error procesando evento realtime de registros:', err);
          }
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.info('✅ Suscripción realtime activa para registros');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, onChange]);
}