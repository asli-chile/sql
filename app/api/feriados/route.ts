import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await fetch('https://data.magnet.cl/api/v1/holidays/cl/?limit=250');
    if (!res.ok) {
      return NextResponse.json({ error: 'Error al obtener feriados' }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    console.error('Error fetching feriados:', e);
    return NextResponse.json({ error: 'Error al obtener feriados' }, { status: 500 });
  }
}
