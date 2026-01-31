import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * API para enviar solicitud de acceso por email
 * Envía un email a rodrigo.caceres@asli.cl con los datos de la solicitud
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nombreUsuario, empresa } = body;

    if (!nombreUsuario || typeof nombreUsuario !== 'string' || nombreUsuario.trim() === '') {
      return NextResponse.json(
        { error: 'El nombre de usuario es requerido' },
        { status: 400 }
      );
    }

    if (!empresa || typeof empresa !== 'string' || empresa.trim() === '') {
      return NextResponse.json(
        { error: 'La empresa es requerida' },
        { status: 400 }
      );
    }

    // Preparar el contenido del email
    const emailSubject = encodeURIComponent('Solicitud de acceso - Plataforma ASLI, Logística y Comercio Exterior');
    const emailBody = encodeURIComponent(
      `Hola Rodrigo,\n\n` +
      `Se ha recibido una nueva solicitud de acceso a la plataforma ASLI, Logística y Comercio Exterior:\n\n` +
      `Nombre de usuario: ${nombreUsuario.trim()}\n` +
      `Empresa: ${empresa.trim()}\n\n` +
      `Por favor, revisa la solicitud y procede con la creación de la cuenta.\n\n` +
      `Saludos,\n` +
      `Sistema ASLI`
    );

    // Crear el enlace mailto
    const recipientEmail = 'rodrigo.caceres@asli.cl';
    const mailtoLink = `mailto:${recipientEmail}?subject=${emailSubject}&body=${emailBody}`;

    // Retornar el enlace mailto para que el cliente lo ejecute
    // Esto es necesario porque no podemos enviar emails directamente desde el servidor
    // sin un servicio de email configurado (SendGrid, Resend, etc.)
    return NextResponse.json({
      success: true,
      mailtoLink,
      message: 'Solicitud preparada. Se abrirá tu cliente de correo.',
    });
  } catch (error) {
    console.error('[RequestAccess] Error inesperado:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
