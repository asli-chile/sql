'use client';

import React, { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, X, Download } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export function QRGenerator() {
  const [isOpen, setIsOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [qrValue, setQrValue] = useState('');
  const qrRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  const handleGenerate = () => {
    if (url.trim()) {
      setQrValue(url.trim());
    }
  };

  const handleDownload = () => {
    if (!qrRef.current || !qrValue) return;
    
    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;

    try {
      // Convertir SVG a canvas y luego descargar
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return;
      
      // Aumentar el tamaño del canvas para mejor calidad
      const size = 512;
      canvas.width = size;
      canvas.height = size;
      
      const img = new Image();
      
      img.onload = () => {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, size, size);
        
        canvas.toBlob((blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `qrcode-${Date.now()}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }, 'image/png');
      };
      
      img.onerror = () => {
        console.error('Error al cargar la imagen SVG');
      };
      
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      img.src = url;
      
      // Limpiar URL después de cargar
      img.onload = () => {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, size, size);
        URL.revokeObjectURL(url);
        
        canvas.toBlob((blob) => {
          if (!blob) return;
          const downloadUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = `qrcode-${Date.now()}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(downloadUrl);
        }, 'image/png');
      };
    } catch (error) {
      console.error('Error al descargar QR:', error);
    }
  };

  return (
    <>
      {/* Botón para abrir el modal */}
      <button
        onClick={() => setIsOpen(true)}
        className={`flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-2 rounded-lg transition-colors ${
          theme === 'dark'
            ? 'text-gray-300 hover:text-purple-400 hover:bg-purple-900/20'
            : 'text-gray-700 hover:text-purple-600 hover:bg-purple-50'
        }`}
        title="Generar código QR"
      >
        <QrCode className="w-4 h-4 sm:w-5 sm:h-5" />
        <span className="text-xs sm:text-sm hidden sm:inline">QR</span>
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div
            className={`relative w-full max-w-md rounded-lg shadow-xl ${
              theme === 'dark' ? 'bg-gray-800' : 'bg-white'
            }`}
          >
            {/* Header del modal */}
            <div
              className={`flex items-center justify-between p-4 border-b ${
                theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
              }`}
            >
              <h2
                className={`text-lg font-semibold ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}
              >
                Generador de Código QR
              </h2>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setUrl('');
                  setQrValue('');
                }}
                className={`p-1 rounded hover:bg-opacity-20 ${
                  theme === 'dark'
                    ? 'text-gray-400 hover:bg-white'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido del modal */}
            <div className="p-6 space-y-4">
              {/* Input de URL */}
              <div>
                <label
                  className={`block text-sm font-medium mb-2 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}
                >
                  Ingrese una URL o texto
                </label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleGenerate();
                    }
                  }}
                  placeholder="https://ejemplo.com o cualquier texto"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                />
              </div>

              {/* Botón generar */}
              <button
                onClick={handleGenerate}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
              >
                Generar Código QR
              </button>

              {/* Resultado QR */}
              {qrValue && (
                <div
                  className={`flex flex-col items-center space-y-4 p-4 rounded-lg ${
                    theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'
                  }`}
                  ref={qrRef}
                >
                  <div
                    className={`p-4 rounded-lg ${
                      theme === 'dark' ? 'bg-white' : 'bg-white'
                    }`}
                  >
                    <QRCodeSVG
                      value={qrValue}
                      size={200}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                  <p
                    className={`text-sm break-all text-center ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    <strong>URL:</strong> {qrValue}
                  </p>
                  <button
                    onClick={handleDownload}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Descargar QR como PNG</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

