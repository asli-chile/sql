import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export const runtime = 'nodejs';

const REQUIRED_ENV = ['GOOGLE_SERVICE_ACCOUNT_KEY', 'GOOGLE_SERVICE_ACCOUNT_EMAIL'] as const;

const getEnvOrThrow = (key: (typeof REQUIRED_ENV)[number]) => {
  const value = process.env[key];
  if (!value) {
    console.error('[email/send] Missing env var', key, 'available?', Object.prototype.hasOwnProperty.call(process.env, key));
    throw new Error(`Missing env var: ${key}`);
  }
  return value;
};

const getDelegatedGmailClient = (subjectEmail: string) => {
  const serviceAccountEmail = getEnvOrThrow('GOOGLE_SERVICE_ACCOUNT_EMAIL');
  const privateKeyRaw = getEnvOrThrow('GOOGLE_SERVICE_ACCOUNT_KEY');
  const privateKey = privateKeyRaw.includes('\\n') ? privateKeyRaw.replace(/\\n/g, '\n') : privateKeyRaw;

  const scopes = [
    'https://www.googleapis.com/auth/gmail.compose',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.drafts',
    'https://www.googleapis.com/auth/gmail.settings.basic',
  ];

  const auth = new google.auth.JWT({
    email: serviceAccountEmail,
    key: privateKey,
    scopes,
    subject: subjectEmail,
  });

  return google.gmail({ version: 'v1', auth });
};

const appendSignatureIfAny = async (gmail: ReturnType<typeof google.gmail>, fromEmail: string, htmlBody: string) => {
  try {
    const sendAs = await gmail.users.settings.sendAs.get({
      userId: 'me',
      sendAsEmail: fromEmail,
    });

    const signature = sendAs.data.signature;
    if (!signature) return htmlBody;

    // Evitar doble firma si ya viene incluida
    if (htmlBody.includes(signature)) return htmlBody;

    return `${htmlBody}<br/><br/>${signature}`;
  } catch {
    // Si no se puede leer la firma, igual creamos el borrador sin fallar.
    return htmlBody;
  }
};

export async function POST(request: NextRequest) {
  try {
    const { to, subject, body, action = 'send', fromEmail } = await request.json();

    if (!to || !subject || !body || !fromEmail) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: to, subject, body, fromEmail' },
        { status: 400 }
      );
    }

    const gmail = getDelegatedGmailClient(fromEmail);

    const finalBody = await appendSignatureIfAny(gmail, fromEmail, body);

    // Crear el contenido del correo
    const emailContent = [
      `From: ${fromEmail}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      '',
      finalBody,
    ].join('\n');

    // Codificar en base64
    const encodedMessage = Buffer.from(emailContent)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    if (action === 'draft') {
      const result = await gmail.users.drafts.create({
        userId: 'me',
        requestBody: {
          message: {
            raw: encodedMessage,
          },
        },
      });

      return NextResponse.json({
        success: true,
        action,
        draftId: result.data.id,
        messageId: result.data.message?.id ?? null,
        message: 'Borrador creado exitosamente',
      });
    }

    const result = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });

    return NextResponse.json({
      success: true,
      messageId: result.data.id,
      action,
      message: 'Correo enviado exitosamente',
    });

  } catch (error) {
    const err = error as any;
    const baseMessage = error instanceof Error ? error.message : 'Unknown error';
    const googleStatus = typeof err?.code === 'number' ? err.code : undefined;
    const googleApiError = err?.response?.data?.error;
    const googleErrorMessage =
      typeof googleApiError?.message === 'string' ? googleApiError.message : undefined;
    const googleReasons = Array.isArray(googleApiError?.errors)
      ? googleApiError.errors
          .map((e: any) => e?.reason)
          .filter((r: any) => typeof r === 'string')
          .join(', ')
      : undefined;

    const errorMessageParts = [
      baseMessage,
      googleErrorMessage ? `google: ${googleErrorMessage}` : null,
      googleReasons ? `reasons: ${googleReasons}` : null,
      googleStatus ? `code: ${googleStatus}` : null,
    ].filter(Boolean);

    const errorMessage = errorMessageParts.join(' | ');

    return NextResponse.json(
      { error: 'Error en operación de correo', details: errorMessage },
      { status: 500 }
    );
  }
 }
