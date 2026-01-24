import { createClient } from '@/lib/supabase-browser';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = createClient();

    // Obtener el catálogo de plantas desde la tabla catalogos
    const { data, error } = await supabase
      .from('catalogos')
      .select('valores')
      .eq('categoria', 'plantas')
      .single();

    console.log('🔍 Query ejecutada:', { data, error });

    if (error) {
      console.error('❌ Error obteniendo catálogo de plantas:', error);
      return NextResponse.json(
        { error: 'Error obteniendo catálogo de plantas', details: error.message },
        { status: 500 }
      );
    }

    // Si no existe el catálogo, crearlo con valores por defecto
    if (!data) {
      console.log('📝 Catálogo no existe, creando uno nuevo...');
      const plantasDefault = [
        'Planta Central',
        'Planta Norte',
        'Planta Sur',
        'Planta Este',
        'Planta Oeste',
        'Terminal Puerto',
        'Terminal Aeropuerto',
        'Depósito Principal'
      ];

      const { data: newCatalog, error: insertError } = await supabase
        .from('catalogos')
        .insert({
          categoria: 'plantas',
          valores: plantasDefault,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('valores')
        .single();

      if (insertError) {
        console.error('❌ Error creando catálogo de plantas:', insertError);
        return NextResponse.json(
          { error: 'Error creando catálogo de plantas', details: insertError.message },
          { status: 500 }
        );
      }

      console.log('✅ Catálogo creado:', newCatalog);
      return NextResponse.json({ plantas: newCatalog.valores });
    }

    console.log('✅ Catálogo encontrado:', data);
    return NextResponse.json({ plantas: data.valores || [] });

  } catch (error) {
    console.error('💥 Error en API de plantas:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor', 
        details: error instanceof Error ? error.message : 'Error desconocido' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { planta } = await request.json();

    if (!planta || typeof planta !== 'string') {
      return NextResponse.json(
        { error: 'Planta inválida' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Obtener catálogo actual
    const { data: currentCatalog, error: fetchError } = await supabase
      .from('catalogos')
      .select('valores')
      .eq('categoria', 'plantas')
      .single();

    if (fetchError) {
      console.error('Error obteniendo catálogo actual:', fetchError);
      return NextResponse.json(
        { error: 'Error obteniendo catálogo actual' },
        { status: 500 }
      );
    }

    // Agregar nueva planta si no existe
    const plantasActuales = currentCatalog?.valores || [];
    if (!plantasActuales.includes(planta)) {
      const nuevasPlantas = [...plantasActuales, planta];

      const { error: updateError } = await supabase
        .from('catalogos')
        .update({
          valores: nuevasPlantas,
          updated_at: new Date().toISOString()
        })
        .eq('categoria', 'plantas');

      if (updateError) {
        console.error('Error actualizando catálogo de plantas:', updateError);
        return NextResponse.json(
          { error: 'Error actualizando catálogo de plantas' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error en POST de plantas:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
