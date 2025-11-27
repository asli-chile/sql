import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

// GET para cron jobs de Vercel, POST para llamadas manuales
export async function GET(request: Request) {
  return handleCleanup(request);
}

export async function POST(request: Request) {
  return handleCleanup(request);
}

async function handleCleanup(request: Request) {
  try {
    const supabase = createClient();

    // Verificar si es una llamada desde cron job (con secret) o desde usuario autenticado
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    const isCronCall = cronSecret && authHeader === `Bearer ${cronSecret}`;

    if (!isCronCall) {
      // Verificar que el usuario sea admin
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }

      const { data: userData, error: userDataError } = await supabase
        .from('usuarios')
        .select('rol')
        .eq('id', user.id)
        .single();

      if (userDataError || userData?.rol !== 'admin') {
        return NextResponse.json({ error: 'Solo administradores pueden ejecutar esta acción' }, { status: 403 });
      }
    }

    // Obtener documentos expirados (más de 7 días)
    const { data: expiredDocs, error: fetchError } = await supabase
      .from('documentos_eliminados')
      .select('file_path')
      .lt('expires_at', new Date().toISOString());

    if (fetchError) {
      console.error('Error obteniendo documentos expirados:', fetchError);
      return NextResponse.json({ error: 'Error obteniendo documentos expirados' }, { status: 500 });
    }

    if (!expiredDocs || expiredDocs.length === 0) {
      return NextResponse.json({ 
        message: 'No hay documentos expirados para eliminar',
        deleted: 0 
      });
    }

    // Eliminar archivos de storage (papelera)
    const papeleraPaths = expiredDocs.map((doc) => `papelera/${doc.file_path}`);
    const { error: deleteStorageError } = await supabase.storage
      .from('documentos')
      .remove(papeleraPaths);

    if (deleteStorageError) {
      console.error('Error eliminando archivos de storage:', deleteStorageError);
      // Continuar aunque falle, para eliminar los registros
    }

    // Eliminar registros de la tabla
    const { error: deleteRecordsError } = await supabase
      .from('documentos_eliminados')
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (deleteRecordsError) {
      console.error('Error eliminando registros:', deleteRecordsError);
      return NextResponse.json({ error: 'Error eliminando registros' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Documentos expirados eliminados correctamente',
      deleted: expiredDocs.length 
    });
  } catch (error) {
    console.error('Error en limpiar papelera:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

