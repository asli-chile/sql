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

  console.log('[email/send] DEBUG rawB64 exists?', !!rawB64, 'length:', rawB64?.length || 0);
  console.log('[email/send] DEBUG raw exists?', !!raw, 'length:', raw?.length || 0);

  if (raw && raw.trim()) return raw;

  if (rawB64 && rawB64.trim()) {
    try {
      const decoded = Buffer.from(rawB64.trim(), 'base64').toString('utf8');
      console.log('[email/send] DEBUG decoded length:', decoded.length);
      return decoded;
    } catch (e) {
      console.error('[email/send] Base64 decode error:', e);
      throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 is present but could not be decoded as base64');
    }
  }

  throw new Error('Missing env var: GOOGLE_SERVICE_ACCOUNT_KEY (or GOOGLE_SERVICE_ACCOUNT_KEY_BASE64)');
};

const normalizeServiceAccountPrivateKey = (raw: string) => {
  console.log('[email/send] DEBUG normalize input length:', raw.length);
  console.log('[email/send] DEBUG normalize input starts with BEGIN?', raw.includes('BEGIN PRIVATE KEY'));
  
  let value = raw.trim();

  // Strip wrapping quotes (common when copy/pasting into env vars)
  if (
    (value.startsWith('"') && value.endsWith('"'))
    || (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
    console.log('[email/send] DEBUG stripped quotes');
  }

  // Support passing full JSON as GOOGLE_SERVICE_ACCOUNT_KEY
  if (value.startsWith('{')) {
    console.log('[email/send] DEBUG detected JSON input');
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed?.private_key === 'string') {
        value = parsed.private_key;
        console.log('[email/send] DEBUG extracted private_key from JSON');
      }
    } catch {
      console.log('[email/send] DEBUG JSON parse failed');
      // ignore
    }
  }

  // Normalize escaped newlines
  value = value.replace(/\\n/g, '\n');
  // Normalize Windows newlines
  value = value.replace(/\r\n/g, '\n');

  console.log('[email/send] DEBUG after normalize length:', value.length);
  console.log('[email/send] DEBUG contains BEGIN PRIVATE KEY?', value.includes('BEGIN PRIVATE KEY'));

  if (!value.includes('BEGIN PRIVATE KEY')) {
    console.log('[email/send] DEBUG value preview:', value.substring(0, 200));
    throw new Error(
      'GOOGLE_SERVICE_ACCOUNT_KEY is present but does not look like a valid private key. '
        + 'Expected a PEM that contains "BEGIN PRIVATE KEY" (or a full service-account JSON with a "private_key" field).'
    );
  }

  return value;
};

const getDelegatedGmailClient = async (subjectEmail: string) => {
  const serviceAccountEmail = getEnvOrThrow('GOOGLE_SERVICE_ACCOUNT_EMAIL');
  const privateKeyRaw = getServiceAccountKeyOrThrow();
  const privateKey = normalizeServiceAccountPrivateKey(privateKeyRaw);

  const scopes = [
    'https://www.googleapis.com/auth/gmail.compose',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.drafts',
    'https://www.googleapis.com/auth/gmail.settings.basic',
  ];

  // IMPORTANT: Use classic constructor to avoid runtime incompatibilities
  // across google-auth-library versions (some builds mis-handle the options object).
  const JWTAny = (google.auth as any).JWT;
  const auth = new JWTAny(serviceAccountEmail, undefined, privateKey, scopes, subjectEmail);

  // Fail fast: if we cannot obtain an access token, do not proceed to Gmail API.
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
    const { to, subject, body, action = 'send', fromEmail } = await request.json();

    if (!to || !subject || !body || !fromEmail) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: to, subject, body, fromEmail' },
        { status: 400 }
      );
    }

    const gmail = await getDelegatedGmailClient(fromEmail);

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
