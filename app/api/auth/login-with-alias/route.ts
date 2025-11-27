import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * API para login con emails secundarios
 * 
 * POST /api/auth/login-with-alias
 * Body: { email: string, password: string }
 * 
 * Este endpoint permite iniciar sesión con un email secundario.
 * Busca el email en la tabla user_emails y usa el email principal para autenticar.
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email y contraseña requeridos' },
                { status: 400 }
            );
        }

        const supabase = await createClient();

        // 1. Buscar el email en user_emails para obtener el user_id
        const { data: emailData, error: emailError } = await supabase
            .from('user_emails')
            .select('user_id, is_primary')
            .eq('email', email.toLowerCase())
            .single();

        if (emailError || !emailData) {
            // El email no existe en user_emails, intentar login normal
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email.toLowerCase(),
                password,
            });

            if (error) {
                return NextResponse.json(
                    { error: 'Credenciales inválidas' },
                    { status: 401 }
                );
            }

            return NextResponse.json({
                message: 'Login exitoso',
                user: data.user,
                session: data.session,
            });
        }

        // 2. Si el email es secundario, obtener el email principal
        if (!emailData.is_primary) {
            // Buscar el email principal del usuario
            const { data: primaryEmailData, error: primaryError } = await supabase
                .from('user_emails')
                .select('email')
                .eq('user_id', emailData.user_id)
                .eq('is_primary', true)
                .single();

            if (primaryError || !primaryEmailData) {
                // Si no hay email principal en user_emails, buscar en auth.users
                const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
                    emailData.user_id
                );

                if (userError || !userData.user) {
                    return NextResponse.json(
                        { error: 'Error obteniendo usuario' },
                        { status: 500 }
                    );
                }

                // Intentar login con el email principal de auth.users
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: userData.user.email!,
                    password,
                });

                if (error) {
                    return NextResponse.json(
                        { error: 'Credenciales inválidas' },
                        { status: 401 }
                    );
                }

                return NextResponse.json({
                    message: 'Login exitoso con email secundario',
                    user: data.user,
                    session: data.session,
                    used_secondary_email: true,
                });
            }

            // Intentar login con el email principal
            const { data, error } = await supabase.auth.signInWithPassword({
                email: primaryEmailData.email,
                password,
            });

            if (error) {
                return NextResponse.json(
                    { error: 'Credenciales inválidas' },
                    { status: 401 }
                );
            }

            return NextResponse.json({
                message: 'Login exitoso con email secundario',
                user: data.user,
                session: data.session,
                used_secondary_email: true,
            });
        }

        // 3. Si el email es principal, hacer login normal
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email.toLowerCase(),
            password,
        });

        if (error) {
            return NextResponse.json(
                { error: 'Credenciales inválidas' },
                { status: 401 }
            );
        }

        return NextResponse.json({
            message: 'Login exitoso',
            user: data.user,
            session: data.session,
        });
    } catch (error) {
        console.error('[LoginWithAlias] Error inesperado:', error);
        return NextResponse.json(
            { error: 'Error interno' },
            { status: 500 }
        );
    }
}
