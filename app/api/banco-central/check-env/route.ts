import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Endpoint de diagnóstico para verificar que las variables de entorno estén disponibles
 */
export async function GET() {
  const user = process.env.BANCO_CENTRAL_USER;
  const pass = process.env.BANCO_CENTRAL_PASS;

  return NextResponse.json({
    variables: {
      BANCO_CENTRAL_USER: {
        definida: !!user,
        longitud: user?.length || 0,
        valor: user ? `${user.substring(0, 5)}...` : 'NO DEFINIDA',
      },
      BANCO_CENTRAL_PASS: {
        definida: !!pass,
        longitud: pass?.length || 0,
        valor: pass ? `${pass.substring(0, 3)}...` : 'NO DEFINIDA',
      },
    },
    todasDefinidas: !!(user && pass),
    nodeEnv: process.env.NODE_ENV,
    todasLasVariables: Object.keys(process.env)
      .filter(k => k.includes('BANCO'))
      .join(', ') || 'NINGUNA',
  });
}
