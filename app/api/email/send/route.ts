import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export const runtime = 'nodejs';

const REQUIRED_ENV = ['GOOGLE_SERVICE_ACCOUNT_EMAIL'] as const;

const getEnvOrThrow = (key: (typeof REQUIRED_ENV)[number]) => {
  const value = process.env[key];
  if (!value) {
    console.error('[email/send] Missing env var', key, 'available?', Object.prototype.hasOwnProperty.call(process.env, key));
    throw new Error(`Missing env var: ${key}`);
  }
  return value;
};

const getServiceAccountKeyOrThrow = () => {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const rawB64 = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64;

  if (raw && raw.trim()) return raw;

  if (rawB64 && rawB64.trim()) {
    try {
      return Buffer.from(rawB64.trim(), 'base64').toString('utf8');
    } catch (e) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 is present but could not be decoded as base64');
    }
  }

  throw new Error('Missing env var: GOOGLE_SERVICE_ACCOUNT_KEY (or GOOGLE_SERVICE_ACCOUNT_KEY_BASE64)');
};

const normalizeServiceAccountPrivateKey = (raw: string) => {
  // El raw ya es el JSON decodificado, extraer private_key directamente
  try {
    const parsed = JSON.parse(raw);
    const privateKey = parsed.private_key;
    if (!privateKey || typeof privateKey !== 'string') {
      throw new Error('private_key not found in JSON');
    }
    
    // Normalizar newlines
    const normalized = privateKey.replace(/\\n/g, '\n').replace(/\r\n/g, '\n');
    
    if (!normalized.includes('BEGIN PRIVATE KEY')) {
      throw new Error('Invalid private key format');
    }
    
    return normalized;
  } catch (e) {
    throw new Error('Failed to extract private key from JSON');
  }
};

const getDelegatedGmailClient = async (subjectEmail: string) => {
  const serviceAccountEmail = getEnvOrThrow('GOOGLE_SERVICE_ACCOUNT_EMAIL');
  const privateKeyRaw = getServiceAccountKeyOrThrow();
  const privateKey = normalizeServiceAccountPrivateKey(privateKeyRaw);

  const scopes = [
    'https://mail.google.com/',
  ];

  // Use JWT constructor with options object
  const JWTAny = (google.auth as any).JWT;
  const jwtConfig = {
    email: serviceAccountEmail,
    key: privateKey,
    scopes: scopes,
    subject: subjectEmail
  };
  
  const auth = new JWTAny(jwtConfig);

  // Authorize the client
  await auth.authorize();

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
    const { to, subject, body, action = 'send', fromEmail, attachmentData } = await request.json();

    if (!to || !subject || !body || !fromEmail) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: to, subject, body, fromEmail' },
        { status: 400 }
      );
    }

    const gmail = await getDelegatedGmailClient(fromEmail);

    // Si solo se pide la firma, retornarla sin crear borrador
    if (action === 'get-signature') {
      try {
        const sendAs = await gmail.users.settings.sendAs.get({
          userId: 'me',
          sendAsEmail: fromEmail,
        });
        return NextResponse.json({
          success: true,
          signature: sendAs.data.signature || null,
        });
      } catch {
        return NextResponse.json({
          success: true,
          signature: null,
        });
      }
    }

    const finalBody = await appendSignatureIfAny(gmail, fromEmail, body);

    // Crear el contenido del correo con posible adjunto
    let emailContent: string[];

    if (attachmentData) {
      // Correo con adjunto (multipart/mixed)
      const boundary = 'boundary_' + Math.random().toString(36).substring(2);
      
      emailContent = [
        `From: ${fromEmail}`,
        `To: ${to}`,
        `Subject: ${subject}`,
        'MIME-Version: 1.0',
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        'Content-Type: text/html; charset=utf-8',
        '',
        finalBody,
        '',
        `--${boundary}`,
        'Content-Type: application/pdf',
        'Content-Transfer-Encoding: base64',
        `Content-Disposition: attachment; filename="${attachmentData.filename}"`,
        '',
        attachmentData.content,
        '',
        `--${boundary}--`,
      ];
    } else {
      // Correo sin adjunto
      emailContent = [
        `From: ${fromEmail}`,
        `To: ${to}`,
        `Subject: ${subject}`,
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=utf-8',
        '',
        finalBody,
      ];
    }

    // Codificar en base64
    const encodedMessage = Buffer.from(emailContent.join('\n'))
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
        message: attachmentData ? 'Borrador creado con adjunto' : 'Borrador creado exitosamente',
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
      action,
      messageId: result.data.id,
      message: attachmentData ? 'Correo enviado con adjunto' : 'Correo enviado exitosamente',
    });
  } catch (error: any) {
    console.error('Error en /api/email/send:', error);
    
    let errorMessage = 'Error al procesar el correo';
    let errorDetails = '';
    
    if (error.code) {
      errorDetails = `Código: ${error.code}`;
    }
    
    if (error.message) {
      errorMessage = error.message;
    }
    
    if (error.errors && error.errors.length > 0) {
      errorDetails = error.errors.map((e: any) => e.message || e.reason).join(', ');
    }

    return NextResponse.json(
      { 
        error: errorMessage, 
        details: errorDetails,
        code: error.code || 'UNKNOWN_ERROR'
      },
      { status: 500 }
    );
  }
}
