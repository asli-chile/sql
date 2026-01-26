import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-browser';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentPath = searchParams.get('documentPath');

    if (!documentPath) {
      return NextResponse.json(
        { error: 'documentPath es requerido' },
        { status: 400 }
      );
    }

    const supabase = createClient();
    
    // Crear URL firmada válida por 60 segundos
    const { data, error } = await supabase.storage
      .from('documentos')
      .createSignedUrl(documentPath, 60);

    if (error) {
      console.error('Error creando URL firmada:', error);
      return NextResponse.json(
        { error: 'Error al crear URL firmada' },
        { status: 500 }
      );
    }

    if (!data?.signedUrl) {
      return NextResponse.json(
        { error: 'No se pudo generar la URL firmada' },
        { status: 500 }
      );
    }

    // Redirigir a la URL firmada
    return NextResponse.redirect(data.signedUrl);

  } catch (error) {
    console.error('Error en signed-url GET:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

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
