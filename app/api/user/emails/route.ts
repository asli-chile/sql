import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * API para gestionar emails secundarios del usuario
 * 
 * GET /api/user/emails - Listar todos los emails del usuario
 * POST /api/user/emails - Agregar nuevo email secundario
 * DELETE /api/user/emails - Eliminar email secundario
 */

// GET: Listar todos los emails del usuario
export async function GET() {
    try {
        const supabase = await createClient();

        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        // Obtener todos los emails del usuario
        const { data: emails, error: emailsError } = await supabase
            .from('user_emails')
            .select('id, email, is_primary, created_at')
            .eq('user_id', user.id)
            .order('is_primary', { ascending: false })
            .order('created_at', { ascending: true });

        if (emailsError) {
            console.error('[UserEmails] Error obteniendo emails:', emailsError);
            return NextResponse.json(
                { error: 'Error obteniendo emails' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            emails: emails || [],
            primary_email: user.email,
        });
    } catch (error) {
        console.error('[UserEmails] Error inesperado:', error);
        return NextResponse.json(
            { error: 'Error interno' },
            { status: 500 }
        );
    }
}

// POST: Agregar nuevo email secundario
export async function POST(request: Request) {
    try {
        const supabase = await createClient();

        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const body = await request.json();
        const { email } = body;

        if (!email || typeof email !== 'string') {
            return NextResponse.json(
                { error: 'Email requerido' },
                { status: 400 }
            );
        }

        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { error: 'Formato de email inválido' },
                { status: 400 }
            );
        }

        // Verificar que el email no esté ya en uso
        const { data: existingEmail } = await supabase
            .from('user_emails')
            .select('id')
            .eq('email', email.toLowerCase())
            .single();

        if (existingEmail) {
            return NextResponse.json(
                { error: 'Este email ya está en uso' },
                { status: 409 }
            );
        }

        // Insertar nuevo email secundario
        const { data: newEmail, error: insertError } = await supabase
            .from('user_emails')
            .insert({
                user_id: user.id,
                email: email.toLowerCase(),
                is_primary: false,
            })
            .select('id, email, is_primary, created_at')
            .single();

        if (insertError) {
            console.error('[UserEmails] Error insertando email:', insertError);
            return NextResponse.json(
                { error: 'Error agregando email' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            message: 'Email agregado exitosamente',
            email: newEmail,
        });
    } catch (error) {
        console.error('[UserEmails] Error inesperado:', error);
        return NextResponse.json(
            { error: 'Error interno' },
            { status: 500 }
        );
    }
}

// DELETE: Eliminar email secundario
export async function DELETE(request: Request) {
    try {
        const supabase = await createClient();

        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const emailId = searchParams.get('id');

        if (!emailId) {
            return NextResponse.json(
                { error: 'ID de email requerido' },
                { status: 400 }
            );
        }

        // Verificar que el email pertenece al usuario y no es el principal
        const { data: emailToDelete, error: fetchError } = await supabase
            .from('user_emails')
            .select('id, email, is_primary')
            .eq('id', emailId)
            .eq('user_id', user.id)
            .single();

        if (fetchError || !emailToDelete) {
            return NextResponse.json(
                { error: 'Email no encontrado' },
                { status: 404 }
            );
        }

        if (emailToDelete.is_primary) {
            return NextResponse.json(
                { error: 'No se puede eliminar el email principal' },
                { status: 400 }
            );
        }

        // Eliminar el email
        const { error: deleteError } = await supabase
            .from('user_emails')
            .delete()
            .eq('id', emailId)
            .eq('user_id', user.id);

        if (deleteError) {
            console.error('[UserEmails] Error eliminando email:', deleteError);
            return NextResponse.json(
                { error: 'Error eliminando email' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            message: 'Email eliminado exitosamente',
        });
    } catch (error) {
        console.error('[UserEmails] Error inesperado:', error);
        return NextResponse.json(
            { error: 'Error interno' },
            { status: 500 }
        );
    }
}
