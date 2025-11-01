import { NextRequest, NextResponse } from 'next/server';
import { generarReportePDF } from '@/lib/pdf-templates';
import { TipoReporte } from '@/lib/excel-templates';
import { Registro } from '@/types/registros';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tipo, registros }: { tipo: TipoReporte; registros: Registro[] } = body;

    if (!tipo || !registros || !Array.isArray(registros)) {
      return NextResponse.json(
        { error: 'Tipo y registros son requeridos' },
        { status: 400 }
      );
    }

    const pdfBuffer = await generarReportePDF(tipo, registros);

    // Convertir Uint8Array a Buffer para la respuesta
    const buffer = Buffer.from(pdfBuffer);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="reporte-${tipo}-${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generando PDF:', error);
    return NextResponse.json(
      { error: 'Error al generar el PDF' },
      { status: 500 }
    );
  }
}

