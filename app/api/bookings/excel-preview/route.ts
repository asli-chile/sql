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
    
    // Obtener el archivo desde Supabase Storage
    const { data, error } = await supabase.storage
      .from('documentos')
      .download(documentPath);

    if (error) {
      console.error('Error descargando archivo:', error);
      return NextResponse.json(
        { error: 'Error al descargar el archivo' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Archivo no encontrado' },
        { status: 404 }
      );
    }

    // Convertir el blob a base64
    const arrayBuffer = await data.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    
    // Determinar el MIME type
    const mimeType = documentPath.toLowerCase().endsWith('.xlsx') 
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : documentPath.toLowerCase().endsWith('.xls')
      ? 'application/vnd.ms-excel'
      : 'application/octet-stream';

    // Crear una página HTML con SheetJS para renderizar el Excel
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Vista previa de Excel</title>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
        <style>
          body { 
            margin: 0; 
            padding: 20px; 
            font-family: Arial, sans-serif; 
            background: #f5f5f5;
            height: 100vh;
            overflow: auto;
          }
          .preview-container {
            max-width: 100%;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: auto;
          }
          .header {
            padding: 15px;
            background: #2c3e50;
            color: white;
            border-radius: 8px 8px 0 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: sticky;
            top: 0;
            z-index: 10;
          }
          .download-btn {
            background: #27ae60;
            color: white;
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            text-decoration: none;
            font-size: 14px;
          }
          .download-btn:hover {
            background: #229954;
          }
          .content {
            padding: 20px;
          }
          .excel-table {
            border-collapse: collapse;
            width: 100%;
            font-size: 12px;
            overflow: auto;
            display: block;
          }
          .excel-table th,
          .excel-table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 200px;
          }
          .excel-table th {
            background-color: #f2f2f2;
            font-weight: bold;
            position: sticky;
            top: 0;
          }
          .sheet-info {
            background: #ecf0f1;
            padding: 15px;
            border-radius: 4px;
            margin-bottom: 20px;
          }
          .loading {
            text-align: center;
            padding: 40px;
            color: #666;
          }
          .error {
            text-align: center;
            padding: 40px;
            color: #e74c3c;
          }
        </style>
      </head>
      <body>
        <div class="preview-container">
          <div class="header">
            <h2>📊 Vista previa de Excel</h2>
            <a href="data:${mimeType};base64,${base64}" 
               download="${documentPath.split('/').pop()}" 
               class="download-btn">
              📥 Descargar
            </a>
          </div>
          <div class="content">
            <div class="sheet-info">
              <h3>📄 Información del archivo</h3>
              <p><strong>Nombre:</strong> ${documentPath.split('/').pop()}</p>
              <p><strong>Tipo:</strong> Excel (${mimeType})</p>
              <p><strong>Tamaño:</strong> ${(arrayBuffer.byteLength / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <div id="excel-content">
              <div class="loading">📊 Cargando vista previa del Excel...</div>
            </div>
          </div>
        </div>

        <script>
          // Función para procesar el Excel con SheetJS
          function processExcel() {
            try {
              // Obtener el archivo base64
              const base64Data = '${base64}';
              
              // Convertir base64 a binary
              const binaryString = atob(base64Data);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              
              // Leer el archivo con SheetJS
              const workbook = XLSX.read(bytes, { type: 'array' });
              
              // Obtener la primera hoja
              const firstSheetName = workbook.SheetNames[0];
              const worksheet = workbook.Sheets[firstSheetName];
              
              // Convertir a HTML
              const htmlTable = XLSX.utils.sheet_to_html(worksheet);
              
              // Mostrar el contenido
              document.getElementById('excel-content').innerHTML = htmlTable;
              
              // Mejorar estilos de la tabla
              const table = document.querySelector('#excel-content table');
              if (table) {
                table.className = 'excel-table';
                
                // Ajustar anchos de columnas
                const rows = table.querySelectorAll('tr');
                if (rows.length > 0) {
                  const maxCols = Math.max(...Array.from(rows).map(row => row.children.length));
                  for (let i = 0; i < maxCols; i++) {
                    let maxWidth = 150;
                    rows.forEach(row => {
                      const cell = row.children[i];
                      if (cell) {
                        const width = cell.textContent.length * 8;
                        if (width > maxWidth) maxWidth = width;
                      }
                    });
                    
                    // Aplicar ancho máximo
                    rows.forEach(row => {
                      const cell = row.children[i];
                      if (cell) {
                        cell.style.maxWidth = Math.min(maxWidth, 300) + 'px';
                      }
                    });
                  }
                }
              }
              
              console.log('✅ Excel procesado exitosamente');
              
            } catch (error) {
              console.error('❌ Error procesando Excel:', error);
              document.getElementById('excel-content').innerHTML = \`
                <div class="error">
                  <h3>❌ Error al procesar el Excel</h3>
                  <p>No se pudo mostrar la vista previa del archivo.</p>
                  <p>Por favor, descarga el archivo para revisarlo.</p>
                  <br>
                  <a href="data:${mimeType};base64,${base64}" 
                     download="${documentPath.split('/').pop()}" 
                     class="download-btn" 
                     style="font-size: 16px; padding: 12px 24px;">
                    📥 Descargar Excel
                  </a>
                </div>
              \`;
            }
          }
          
          // Procesar cuando la página cargue
          window.addEventListener('load', processExcel);
        </script>
      </body>
      </html>
    `;

    return new NextResponse(htmlContent, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });

  } catch (error) {
    console.error('Error en excel-preview:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
