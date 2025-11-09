'use client';

import React, { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

export interface QrGeneratorModalProps {
  /**
   * Texto inicial para el campo de entrada.
   */
  defaultValue?: string;
  /**
   * Texto del botón que abre el modal.
   */
  triggerLabel?: string;
  /**
   * Permite personalizar clases CSS del contenedor principal del modal.
   */
  className?: string;
  /**
   * Controla si usa estilos oscuros o claros por defecto.
   */
  darkMode?: boolean;
  /**
   * Callback al generar un nuevo código QR.
   */
  onGenerate?(value: string): void;
}

/**
 * Modal autocontenido para crear y descargar códigos QR en proyectos React.
 */
export function QrGeneratorModal({
  defaultValue = '',
  triggerLabel = 'Generar QR',
  className = '',
  darkMode = false,
  onGenerate
}: QrGeneratorModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(defaultValue);
  const [qrValue, setQrValue] = useState(defaultValue);
  const qrRef = useRef<HTMLDivElement>(null);

  const palette = darkMode
    ? {
        surface: '#1f2933',
        surfaceAlt: '#27323f',
        text: '#f8fafc',
        textMuted: '#cbd5f5'
      }
    : {
        surface: '#ffffff',
        surfaceAlt: '#f1f5f9',
        text: '#0f172a',
        textMuted: '#475569'
      };

  const handleGenerate = () => {
    if (!inputValue.trim()) return;
    const value = inputValue.trim();
    setQrValue(value);
    onGenerate?.(value);
  };

  const handleDownload = () => {
    if (!qrRef.current || !qrValue) return;
    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 512;
    canvas.width = size;
    canvas.height = size;

    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(img.src);

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
    img.onerror = () => {
      console.error('No fue posible convertir el SVG a imagen.');
    };

    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    img.src = URL.createObjectURL(svgBlob);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        style={{
          padding: '0.6rem 1.2rem',
          borderRadius: '0.75rem',
          backgroundColor: '#4c1d95',
          color: '#ffffff',
          fontWeight: 600,
          border: 'none',
          cursor: 'pointer'
        }}
      >
        {triggerLabel}
      </button>

      {isOpen && (
        <div
          className={className}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(15, 23, 42, 0.55)',
            padding: '1rem'
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '420px',
              borderRadius: '1rem',
              padding: '1.5rem',
              background: palette.surface,
              color: palette.text,
              boxShadow: '0 25px 50px -12px rgba(30, 64, 175, 0.45)'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem'
              }}
            >
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                Generador de códigos QR
              </h2>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setInputValue(defaultValue);
                  setQrValue(defaultValue);
                }}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: palette.textMuted,
                  fontSize: '1.5rem',
                  cursor: 'pointer'
                }}
                aria-label="Cerrar modal"
              >
                ×
              </button>
            </div>

            <label
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 600,
                marginBottom: '0.5rem',
                color: palette.textMuted
              }}
            >
              Ingresa la URL o texto
            </label>
            <input
              type="text"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder="https://ejemplo.com"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '0.75rem',
                border: `1px solid ${darkMode ? '#475569' : '#cbd5f5'}`,
                background: darkMode ? palette.surfaceAlt : '#ffffff',
                color: palette.text,
                marginBottom: '1rem'
              }}
              onKeyUp={(event) => {
                if (event.key === 'Enter') {
                  handleGenerate();
                }
              }}
            />
            <button
              type="button"
              onClick={handleGenerate}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '0.75rem',
                border: 'none',
                background: '#7c3aed',
                color: '#ffffff',
                fontWeight: 600,
                cursor: 'pointer',
                marginBottom: '1.5rem'
              }}
            >
              Generar Código QR
            </button>

            {qrValue && (
              <div
                ref={qrRef}
                style={{
                  textAlign: 'center',
                  background: palette.surfaceAlt,
                  padding: '1rem',
                  borderRadius: '0.75rem'
                }}
              >
                <div
                  style={{
                    background: '#ffffff',
                    padding: '1rem',
                    borderRadius: '0.75rem',
                    display: 'inline-block',
                    marginBottom: '1rem'
                  }}
                >
                  <QRCodeSVG value={qrValue} size={196} level="H" includeMargin />
                </div>
                <p
                  style={{
                    fontSize: '0.75rem',
                    wordBreak: 'break-word',
                    marginBottom: '1rem',
                    color: palette.textMuted
                  }}
                >
                  {qrValue}
                </p>
                <button
                  type="button"
                  onClick={handleDownload}
                  style={{
                    padding: '0.6rem 1rem',
                    borderRadius: '0.75rem',
                    border: 'none',
                    background: '#16a34a',
                    color: '#ffffff',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Descargar como PNG
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default QrGeneratorModal;

