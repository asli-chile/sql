import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  // Usar SOLO variables de entorno (sin fallbacks hardcodeados para seguridad)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('❌ ERROR: Variables de entorno NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY deben estar definidas en .env.local')
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
