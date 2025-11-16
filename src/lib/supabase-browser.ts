import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  // Usar SOLO variables de entorno (sin fallbacks hardcodeados para seguridad)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('❌ ERROR: Variables de entorno NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY deben estar definidas en .env.local')
  }

  const client = createBrowserClient(supabaseUrl, supabaseAnonKey);

  // Interceptar errores de refresh token para manejarlos silenciosamente
  const originalGetUser = client.auth.getUser.bind(client.auth);
  client.auth.getUser = async () => {
    try {
      return await originalGetUser();
    } catch (error: any) {
      // Si es un error de refresh token inválido, es un error esperado
      // (el token expiró o fue eliminado) - no necesitamos loguearlo
      if (error?.message?.includes('Refresh Token') || error?.message?.includes('JWT')) {
        // Limpiar sesión localmente
        try {
          await client.auth.signOut();
        } catch {
          // Ignorar errores al hacer signOut
        }
        // Re-lanzar el error para que el código que llama pueda manejarlo
        throw error;
      }
      throw error;
    }
  };

  return client;
}
