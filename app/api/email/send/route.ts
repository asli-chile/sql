import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export const runtime = 'nodejs';

const REQUIRED_ENV = ['GOOGLE_SERVICE_ACCOUNT_EMAIL'] as const;

const getEnvOrThrow = (key: (typeof REQUIRED_ENV)[number]) => {
  // Intentar con variable original primero
  let value = process.env[key];

  // Si es GOOGLE_SERVICE_ACCOUNT_EMAIL, intentar con alternativa
  if (key === 'GOOGLE_SERVICE_ACCOUNT_EMAIL' && !value) {
    value = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL_NEW;
  }

  // Priorizar variables originales que ya funcionaban
  if (!value && key === 'GOOGLE_SERVICE_ACCOUNT_EMAIL') {
    value = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL_NEW;
  }

  if (!value) {
    console.error('[email/send] Missing env var', key, 'available?', Object.prototype.hasOwnProperty.call(process.env, key));
    throw new Error(`Missing env var: ${key} or ${key}_NEW`);
  }
  return value;
};

const getServiceAccountKeyOrThrow = () => {
  // Intentar con variables originales
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const rawB64 = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64;

  // Intentar con variables alternativas
  const rawNew = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_NEW;
  const rawB64New = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64_NEW;

  // Helper para procesar raw
  const processRaw = (rawValue: string | undefined) => {
    if (rawValue && rawValue.trim()) return rawValue;
    return null;
  };

  // Helper para procesar base64
  const processBase64 = (base64Value: string | undefined) => {
    if (base64Value && base64Value.trim()) {
      try {
        return Buffer.from(base64Value.trim(), 'base64').toString('utf8');
      } catch (e) {
        throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 is present but could not be decoded as base64');
      }
    }
    return null;
  };

  // Priorizar base64 que tiene el JSON completo
  let result = processBase64(rawB64) || processBase64(rawB64New) ||
    processRaw(raw) || processRaw(rawNew);

  if (!result) {
    throw new Error('Missing env var: GOOGLE_SERVICE_ACCOUNT_KEY (or GOOGLE_SERVICE_ACCOUNT_KEY_NEW or GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 or GOOGLE_SERVICE_ACCOUNT_KEY_BASE64_NEW)');
  }

  return result;
};

const normalizeServiceAccountPrivateKey = (raw: string) => {
  console.log('[email/send] Debug - Raw input length:', raw.length);
  console.log('[email/send] Debug - Raw input starts with:', raw.substring(0, 50));
  console.log('[email/send] Debug - Raw input ends with:', raw.substring(raw.length - 50));

  try {
    // Si es JSON completo, extraer private_key
    if (raw.trim().startsWith('{')) {
      console.log('[email/send] Debug - Detected JSON format');
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
    }

    // Si es solo la clave privada (empieza con -----BEGIN)
    if (raw.trim().startsWith('-----BEGIN PRIVATE KEY-----')) {
      console.log('[email/send] Debug - Detected private key format');
      // Normalizar newlines
      const normalized = raw.replace(/\\n/g, '\n').replace(/\r\n/g, '\n');

      if (!normalized.includes('BEGIN PRIVATE KEY')) {
        throw new Error('Invalid private key format');
      }

      return normalized;
    }

    // Si está entre comillas, removerlas
    if (raw.trim().startsWith('"') && raw.trim().endsWith('"')) {
      console.log('[email/send] Debug - Detected quoted format, removing quotes');
      const unquoted = raw.slice(1, -1);
      const normalized = unquoted.replace(/\\n/g, '\n').replace(/\r\n/g, '\n');

      if (!normalized.includes('BEGIN PRIVATE KEY')) {
        throw new Error('Invalid private key format after quote removal');
      }

      return normalized;
    }

    throw new Error('Invalid input format: expected JSON or private key');
  } catch (e) {
    console.log('[email/send] Debug - Error in normalizeServiceAccountPrivateKey:', e);
    throw new Error('Failed to extract private key: ' + (e instanceof Error ? e.message : 'Unknown error'));
  }
};

const getDelegatedGmailClient = async (subjectEmail: string) => {
  const serviceAccountEmail = getEnvOrThrow('GOOGLE_SERVICE_ACCOUNT_EMAIL');
  const privateKeyRaw = getServiceAccountKeyOrThrow();
  const privateKey = normalizeServiceAccountPrivateKey(privateKeyRaw);

  console.log('[email/send] Debug - Service Account Email:', serviceAccountEmail);
  console.log('[email/send] Debug - Subject Email:', subjectEmail);
  console.log('[email/send] Debug - Using delegation (user sends email)');

  const scopes = [
    'https://mail.google.com/',
    'https://www.googleapis.com/auth/gmail.send'
  ];

  // Use JWT constructor with options object
  const JWTAny = (google.auth as any).JWT;
  const jwtConfig = {
    email: serviceAccountEmail,
    key: privateKey,
    scopes: scopes,
    subject: subjectEmail // Importante: delegar al usuario
  };

  console.log('[email/send] JWT Config:', {
    email: serviceAccountEmail,
    subject: subjectEmail,
    scopes: scopes,
    keyPresent: !!privateKey
  });

  const auth = new JWTAny(jwtConfig);

  // Authorize the client
  console.log('[email/send] Debug - Authorizing JWT...');
  await auth.authorize();
  console.log('[email/send] Debug - JWT authorized successfully');

  console.log('[email/send] Debug - Creating Gmail client...');
  const gmailClient = google.gmail({ version: 'v1', auth });
  console.log('[email/send] Debug - Gmail client created');

  return gmailClient;
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

    const gmail = await getDelegatedGmailClient(fromEmail); // Restaurado: enviar como el usuario

    // Si solo se pide la firma, retornarla sin crear borrador
    if (action === 'get-signature') {
      try {
        console.log('[email/send] Debug - Getting sendAs settings for:', fromEmail);
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
      console.log('[email/send] Debug - Creating draft...');
      const result = await gmail.users.drafts.create({
        userId: 'me',
        requestBody: {
          message: {
            raw: encodedMessage,
          },
        },
      });
      console.log('[email/send] Debug - Draft created successfully');
      return NextResponse.json({
        success: true,
        message: 'Borrador creado exitosamente',
        draftId: result.data.id,
      });
    }

    console.log('[email/send] Debug - Sending message...');
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
