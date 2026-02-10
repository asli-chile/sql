import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import type { ItinerarioWithEscalas } from '@/types/itinerarios';

// Agrupar itinerarios por región
function groupByRegion(itinerarios: ItinerarioWithEscalas[]): Map<string, ItinerarioWithEscalas[]> {
  const grouped = new Map<string, ItinerarioWithEscalas[]>();
  
  itinerarios.forEach((it) => {
    // Obtener todas las regiones del itinerario
    const regiones = new Set<string>();
    it.escalas?.forEach((escala) => {
      if (escala.area) {
        regiones.add(escala.area);
      }
    });
    
    // Si no tiene regiones, usar "SIN REGIÓN"
    if (regiones.size === 0) {
      const key = 'SIN REGIÓN';
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(it);
    } else {
      // Agregar a cada región que tenga
      regiones.forEach((region) => {
        if (!grouped.has(region)) {
          grouped.set(region, []);
        }
        grouped.get(region)!.push(it);
      });
    }
  });
  
  return grouped;
}

// Generar PDF desde HTML (captura exacta de la tabla visible)
export async function generateItinerarioPDF(
  itinerarios: ItinerarioWithEscalas[],
  region?: string
): Promise<void> {
  if (itinerarios.length === 0) {
    alert('No hay itinerarios para generar el PDF');
    return;
  }

  // Buscar el elemento de la tabla en el DOM
  const tableElement = document.querySelector('[data-itinerario-table]') as HTMLElement;
  
  if (!tableElement) {
    alert('No se encontró la tabla en la página. Por favor, asegúrate de que la tabla esté visible.');
    return;
  }

  try {
    // Crear un contenedor temporal fuera de la vista para capturar
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '1200px'; // Ancho fijo para el PDF landscape
    container.style.backgroundColor = '#ffffff';
    container.style.zIndex = '9999';
    container.style.padding = '20px';
    document.body.appendChild(container);

    // Agregar título y logo en el header
    const header = document.createElement('div');
    header.style.padding = '20px';
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.backgroundColor = '#ffffff';
    header.style.marginBottom = '20px';
    header.style.borderBottom = '2px solid #e5e7eb';
    
    const titleDiv = document.createElement('div');
    const titulo = region 
      ? `Itinerario ASLI Tentativo - Región: ${region}`
      : 'Itinerario ASLI Tentativo';
    titleDiv.innerHTML = `
      <h1 style="margin: 0; font-size: 24px; font-weight: bold; color: #000;">${titulo}</h1>
    `;
    header.appendChild(titleDiv);

    // Agregar logo
    const logoDiv = document.createElement('div');
    const logoImg = document.createElement('img');
    logoImg.src = '/logoasli.png';
    logoImg.style.height = '50px';
    logoImg.style.maxWidth = '200px';
    logoImg.style.objectFit = 'contain';
    logoDiv.appendChild(logoImg);
    header.appendChild(logoDiv);
    
    container.appendChild(header);

    // Clonar la tabla con todos sus estilos
    const clonedTable = tableElement.cloneNode(true) as HTMLElement;
    clonedTable.style.width = '100%';
    clonedTable.style.backgroundColor = '#ffffff';
    clonedTable.style.transform = 'none';
    clonedTable.style.opacity = '1';
    container.appendChild(clonedTable);

    // Agregar footer
    const footer = document.createElement('div');
    footer.style.padding = '20px';
    footer.style.textAlign = 'left';
    footer.style.color = '#666666';
    footer.style.fontSize = '10px';
    footer.style.marginTop = '20px';
    footer.style.borderTop = '1px solid #e5e7eb';
    footer.textContent = 'Asesorías y Servicios Logísticos Integrales';
    container.appendChild(footer);

    // Esperar a que las imágenes se carguen
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Obtener posiciones de las filas antes de capturar
    const tabla = container.querySelector('table');
    const filas: { top: number; height: number; bottom: number }[] = [];
    
    if (tabla) {
      const tbody = tabla.querySelector('tbody');
      if (tbody) {
        const filasElementos = tbody.querySelectorAll('tr');
        filasElementos.forEach((fila) => {
          const rect = fila.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          filas.push({
            top: rect.top - containerRect.top,
            height: rect.height,
            bottom: rect.bottom - containerRect.top,
          });
        });
      }
    }

    // Capturar con html2canvas
    const canvas = await html2canvas(container, {
      backgroundColor: '#ffffff',
      scale: 2,
      logging: false,
      useCORS: true,
      allowTaint: true,
      width: container.offsetWidth,
      height: container.offsetHeight,
    });

    // Limpiar contenedor temporal
    document.body.removeChild(container);

    // Crear PDF
    const imgData = canvas.toDataURL('image/png', 1.0);
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = pdfWidth / imgWidth;
    const imgScaledWidth = pdfWidth;
    const imgScaledHeight = imgHeight * ratio;

    // Convertir posiciones de filas a mm
    const filasEnMm = filas.map((fila) => ({
      top: fila.top * ratio,
      height: fila.height * ratio,
      bottom: (fila.top + fila.height) * ratio,
    }));

    // Calcular altura disponible por página (restando márgenes)
    const marginTop = 0;
    const marginBottom = 0;
    const alturaDisponiblePorPagina = pdfHeight - marginTop - marginBottom;

    // Dividir en páginas sin cortar filas
    let currentY = 0;
    let pageNumber = 0;
    const totalHeight = imgScaledHeight;

    while (currentY < totalHeight) {
      if (pageNumber > 0) {
        pdf.addPage();
      }

      // Encontrar la última fila completa que cabe en esta página
      let ultimaFilaCompleta = -1;
      for (let i = 0; i < filasEnMm.length; i++) {
        const fila = filasEnMm[i];
        // Verificar si la fila completa cabe en la página
        if (fila.bottom <= currentY + alturaDisponiblePorPagina) {
          ultimaFilaCompleta = i;
        } else {
          break;
        }
      }

      // Calcular altura para esta página
      let alturaParaEstaPagina: number;
      
      if (ultimaFilaCompleta >= 0 && ultimaFilaCompleta < filasEnMm.length - 1) {
        // Hay filas completas que caben, usar hasta la última fila completa
        alturaParaEstaPagina = filasEnMm[ultimaFilaCompleta].bottom - currentY;
      } else if (ultimaFilaCompleta === filasEnMm.length - 1) {
        // Es la última fila, usar hasta el final
        alturaParaEstaPagina = totalHeight - currentY;
      } else {
        // No hay filas completas que quepan, usar toda la altura disponible
        // pero solo si es la primera página o si realmente no cabe nada
        if (pageNumber === 0 && filasEnMm.length > 0) {
          // En la primera página, al menos mostrar el header
          alturaParaEstaPagina = Math.min(alturaDisponiblePorPagina, totalHeight - currentY);
        } else {
          // Si no cabe ninguna fila completa, usar la altura disponible
          alturaParaEstaPagina = Math.min(alturaDisponiblePorPagina, totalHeight - currentY);
        }
      }

      // Asegurar que no exceda la altura total
      alturaParaEstaPagina = Math.min(alturaParaEstaPagina, totalHeight - currentY);

      // Agregar imagen a la página actual
      pdf.addImage(
        imgData,
        'PNG',
        0,
        -currentY / ratio, // Posición Y negativa para mostrar la parte correcta
        imgScaledWidth,
        imgScaledHeight
      );

      currentY += alturaParaEstaPagina;
      pageNumber++;
      
      // Evitar bucle infinito
      if (pageNumber > 100 || alturaParaEstaPagina <= 0) break;
    }

    // Descargar PDF
    const fileName = region 
      ? `Itinerario_ASLI_Tentativo_${region}_${new Date().toISOString().split('T')[0]}.pdf`
      : `Itinerario_ASLI_Tentativo_${new Date().toISOString().split('T')[0]}.pdf`;
    
    pdf.save(fileName);
  } catch (error) {
    console.error('Error generando PDF:', error);
    alert('Error al generar el PDF. Por favor, intenta nuevamente.');
  }
}

// Generar PDF separado por regiones
export async function generateItinerarioPDFByRegion(
  itinerarios: ItinerarioWithEscalas[]
): Promise<void> {
  if (itinerarios.length === 0) {
    alert('No hay itinerarios para generar el PDF');
    return;
  }

  const regionesMap = groupByRegion(itinerarios);
  const regiones = Array.from(regionesMap.keys()).sort();

  if (regiones.length === 0) {
    // Si no hay regiones, generar PDF completo
    await generateItinerarioPDF(itinerarios);
    return;
  }

  // Generar un PDF por cada región
  for (const region of regiones) {
    const itinerariosRegion = regionesMap.get(region) || [];
    if (itinerariosRegion.length > 0) {
      await generateItinerarioPDF(itinerariosRegion, region);
    }
  }
}
