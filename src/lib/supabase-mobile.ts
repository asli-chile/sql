// Configuración específica para app móvil (APK)
// Este archivo contiene las variables hardcodeadas para evitar problemas con variables de entorno

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://knbnwbrjzkknarnkyriv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuYm53YnJqemtrbmFybmt5cml2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0ODQzOTYsImV4cCI6MjA3NzA2MDM5Nn0.l7pwhkJSinVQLAsDVFvefP8V5gn_v8rN2U6FG03qVqs';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('❌ ERROR: Configuración de Supabase no encontrada para entorno móvil');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false // Importante para apps móviles
  }
});
