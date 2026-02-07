'use client';

import { useEffect } from 'react';

export function ConsoleBanner() {
  useEffect(() => {
    // Banner ASCII art para ASLI en consola
    const banner = `
%c █████╗  ███████╗ ██╗      ██╗
%c██╔══██╗ ██╔════╝ ██║      ██║
%c███████║ ███████╗ ██║      ██║
%c██╔══██║ ╚════██║ ██║      ██║
%c██║  ██║ ███████║ ███████╗ ██║
%c╚═╝  ╚═╝ ╚══════╝ ╚══════╝ ╚═╝

%c   LOGISTICA  Y  COMERCIO  EXTERIOR


%c                by

%c████████╗  █████╗  ███████╗
%c╚══██╔══╝ ██╔══██╗ ╚══███╔╝
%c   ██║    ███████║   ███╔╝ 
%c   ██║    ██╔══██║  ███╔╝  
%c   ██║    ██║  ██║ ███████╗
%c   ╚═╝    ╚═╝  ╚═╝ ╚══════╝
`;

    // Estilos para cada línea del banner
    const styles = [
      'color: #3b82f6; font-weight: bold; font-size: 14px;',
      'color: #3b82f6; font-weight: bold; font-size: 14px;',
      'color: #3b82f6; font-weight: bold; font-size: 14px;',
      'color: #3b82f6; font-weight: bold; font-size: 14px;',
      'color: #3b82f6; font-weight: bold; font-size: 14px;',
      'color: #3b82f6; font-weight: bold; font-size: 14px;',
      'color: #10b981; font-weight: bold; font-size: 12px; letter-spacing: 2px;',
      'color: #6b7280; font-weight: normal; font-size: 11px;',
      'color: #f59e0b; font-weight: bold; font-size: 11px;',
      'color: #f59e0b; font-weight: bold; font-size: 11px;',
      'color: #f59e0b; font-weight: bold; font-size: 11px;',
      'color: #f59e0b; font-weight: bold; font-size: 11px;',
      'color: #f59e0b; font-weight: bold; font-size: 11px;',
      'color: #f59e0b; font-weight: bold; font-size: 11px;',
    ];

    // Mostrar el banner en la consola
    console.log(banner, ...styles);

    // Insertar el banner después del body y antes del cierre de HTML
    const bannerHTML = `<!-- ASLI Banner -->
<pre id="asli-console-banner" style="display:block;width:auto;min-width:fit-content;max-width:none;padding:0;margin:0;background-color:transparent;color:#3b82f6;font-family:monospace;font-size:10px;line-height:1.4;white-space:pre;visibility:visible;pointer-events:none;opacity:1;position:relative;z-index:0;overflow:visible;word-wrap:normal;text-overflow:clip;" aria-hidden="true"> █████╗  ███████╗ ██╗      ██╗
██╔══██╗ ██╔════╝ ██║      ██║
███████║ ███████╗ ██║      ██║
██╔══██║ ╚════██║ ██║      ██║
██║  ██║ ███████║ ███████╗ ██║
╚═╝  ╚═╝ ╚══════╝ ╚══════╝ ╚═╝

   LOGISTICA  Y  COMERCIO  EXTERIOR


                by

████████╗  █████╗  ███████╗
╚══██╔══╝ ██╔══██╗ ╚══███╔╝
   ██║    ███████║   ███╔╝ 
   ██║    ██╔══██║  ███╔╝  
   ██║    ██║  ██║ ███████╗
   ╚═╝    ╚═╝  ╚═╝ ╚══════╝</pre>`;

    // Insertar después del body y antes del cierre de HTML
    // Usar setTimeout para asegurar que el DOM esté completamente cargado
    setTimeout(() => {
      const body = document.body;
      if (body && body.parentNode && body.parentNode.parentNode) {
        // Insertar después del body pero dentro del html
        const htmlElement = body.parentNode as HTMLElement;
        htmlElement.insertAdjacentHTML('beforeend', bannerHTML);
      }
    }, 0);
  }, []);

  // Este componente no renderiza nada en el DOM (se inserta vía script)
  return null;
}
