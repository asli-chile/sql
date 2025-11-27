import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

/**
 * API para verificar si un email es secundario y obtener el email principal
 * 
 * GET /api/user/check-email?email=xxx@example.com
 * 
 * Retorna:
 * - Si es email secundario: { is_secondary: true, primary_email: "primary@example.com" }
 * - Si es email principal o no existe: { is_secondary: false }
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const email = searchParams.get('email');

        console.log('[CheckEmail] Verificando email:', email);

        if (!email) {
            return NextResponse.json(
                { error: 'Email requerido' },
                { status: 400 }
            );
        }

        // Usar cliente anon para acceso público
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // Intentar usar la función RPC si existe
        const { data: result, error: rpcError } = await supabase.rpc(
            'check_secondary_email',
            { search_email: email.toLowerCase() }
        );

        console.log('[CheckEmail] Resultado check_secondary_email:', { result, rpcError });

        // Si la función no existe (error PGRST202), asumir que no es secundario
        // Esto permite que el login funcione normalmente usando el email ingresado
        if (rpcError && rpcError.code === 'PGRST202') {
            console.log('[CheckEmail] Función RPC no existe en Supabase. Por favor, ejecuta el script SQL: scripts/create-check-secondary-email-function.sql');
            console.log('[CheckEmail] Por ahora, asumiendo que el email no es secundario...');
            // Retornar que no es secundario para permitir login normal
            return NextResponse.json({
                is_secondary: false,
            });
        }

        if (rpcError) {
            console.error('[CheckEmail] Error en check_secondary_email:', rpcError);
            // Si hay error diferente, asumir que no es secundario y permitir login normal
            return NextResponse.json({
                is_secondary: false,
            });
        }

        // La función retorna un JSON con is_secondary y opcionalmente primary_email
        if (result && result.is_secondary === true && result.primary_email) {
            console.log('[CheckEmail] Email es secundario, principal:', result.primary_email);
            return NextResponse.json({
                is_secondary: true,
                primary_email: result.primary_email,
            });
        }

        console.log('[CheckEmail] Email es principal o no existe');
        return NextResponse.json({
            is_secondary: false,
        });
    } catch (error) {
        console.error('[CheckEmail] Error inesperado:', error);
        return NextResponse.json(
            { error: 'Error interno' },
            { status: 500 }
        );
    }
}
