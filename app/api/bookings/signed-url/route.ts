import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-browser';

export async function POST(request: NextRequest) {
  try {
    const { path } = await request.json();

    if (!path) {
      return NextResponse.json(
        { error: 'Path del documento es requerido' },
        { status: 400 }
      );
    }

    const supabase = createClient();
    
    // Crear URL firmada válida por 60 segundos
    const { data, error } = await supabase.storage
      .from('documentos')
      .createSignedUrl(path, 60);

    if (error || !data?.signedUrl) {
      console.error('Error creando URL firmada:', error);
      return NextResponse.json(
        { error: 'No se pudo generar la URL de descarga' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      signedUrl: data.signedUrl
    });

  } catch (error) {
    console.error('Error en /api/bookings/signed-url:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
