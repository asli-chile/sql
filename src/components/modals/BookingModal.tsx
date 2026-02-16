'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle2, ExternalLink } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { createClient } from '@/lib/supabase-browser';
import { sanitizeFileName } from '@/utils/documentUtils';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (booking: string, file?: File, customFileName?: string) => Promise<void>;
  currentBooking?: string;
  registroId: string;
  existingDocument?: { nombre: string; fecha: string } | null;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentBooking = '',
  registroId,
  existingDocument = null,
}) => {
  const { theme } = useTheme();
  const [booking, setBooking] = useState(currentBooking);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customFileName, setCustomFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setBooking(currentBooking);
      setSelectedFile(null);
      setCustomFileName('');
      setError('');
      console.log('🎯 BookingModal - isOpen:', isOpen);
      console.log('🎯 BookingModal - currentBooking:', currentBooking);
      console.log('🎯 BookingModal - existingDocument:', existingDocument);
      
      // Asegurar que el input de archivo esté limpio
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [isOpen, currentBooking, existingDocument]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (extension !== 'pdf') {
        setError('Solo se admiten archivos PDF.');
        setSelectedFile(null);
        setCustomFileName('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
      setSelectedFile(file);
      // Establecer nombre por defecto sin la extensión
      const nameWithoutExt = file.name.replace(/\.pdf$/i, '');
      setCustomFileName(nameWithoutExt);
      setError('');
    }
  };

  const handleSave = async () => {
    if (!booking.trim()) {
      setError('El número de booking es requerido.');
      return;
    }

    if (selectedFile && !customFileName.trim()) {
      setError('Por favor, ingrese un nombre para el archivo PDF.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onSave(
        booking.trim().toUpperCase(), 
        selectedFile || undefined,
        selectedFile ? customFileName.trim() : undefined
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar el booking.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setCustomFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    console.log('🎯 BookingModal - isOpen cambió a:', isOpen);
    if (isOpen) {
      console.log('🎯 BookingModal - Se debería mostrar ahora');
    }
  }, [isOpen]);

  if (!isOpen) {
    console.log('🎯 BookingModal - No se renderiza porque isOpen es false');
    return null;
  }

  console.log('🎯 BookingModal - Renderizando modal');

  const getLabelStyles = () => {
    return theme === 'dark'
      ? 'text-slate-200'
      : 'text-gray-900';
  };

  const getInputStyles = () => {
    return theme === 'dark'
      ? 'w-full rounded-xl border border-slate-800/60 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30'
      : 'w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400/30';
  };

  const getButtonStyles = () => {
    return theme === 'dark'
      ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
      : 'bg-gray-100 hover:bg-gray-200 text-gray-900 border-gray-300';
  };

  const getPrimaryButtonStyles = () => {
    return theme === 'dark'
      ? 'bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 text-white'
      : 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white';
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`relative w-full max-w-md mx-4 rounded-2xl shadow-2xl ${
          theme === 'dark'
            ? 'bg-slate-900 border border-slate-800'
            : 'bg-white border border-gray-200'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            theme === 'dark' ? 'border-slate-800' : 'border-gray-200'
          }`}
        >
          <h2 className={`text-xl font-semibold ${getLabelStyles()}`}>
            {currentBooking ? 'Editar Booking' : 'Agregar Booking'}
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              theme === 'dark'
                ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
            }`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          {/* Vista previa si ya existe booking o documento */}
          {(currentBooking || existingDocument) && (
            <div className={`rounded-lg border p-4 ${
              theme === 'dark'
                ? 'bg-green-900/20 border-green-700/50'
                : 'bg-green-50 border-green-200'
            }`}>
              <div className="flex items-start gap-3">
                <CheckCircle2 className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                  theme === 'dark' ? 'text-green-400' : 'text-green-600'
                }`} />
                <div className="flex-1 space-y-3">
                  {currentBooking && (
                    <div>
                      <span className={`text-xs font-medium ${
                        theme === 'dark' ? 'text-green-400' : 'text-green-700'
                      }`}>Booking: </span>
                      <span className={`text-base font-semibold ${getLabelStyles()}`}>{currentBooking}</span>
                    </div>
                  )}
                  {existingDocument && (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className={`h-4 w-4 flex-shrink-0 ${
                        theme === 'dark' ? 'text-green-400' : 'text-green-600'
                      }`} />
                      <span className={`text-sm font-medium ${
                        theme === 'dark' ? 'text-green-300' : 'text-green-700'
                      }`}>
                        PDF subido a Documentos
                      </span>
                    </div>
                  )}
                  {existingDocument && (
                    <div className={`pt-2 border-t ${
                      theme === 'dark' ? 'border-green-700/30' : 'border-green-200'
                    }`}>
                      <div className="flex items-center gap-2">
                        <FileText className={`h-3.5 w-3.5 ${
                          theme === 'dark' ? 'text-green-400' : 'text-green-600'
                        }`} />
                        <span className={`text-xs ${getLabelStyles()}`}>
                          {existingDocument.nombre}
                        </span>
                      </div>
                      <span className={`text-xs mt-1 block ${
                        theme === 'dark' ? 'text-green-400/80' : 'text-green-600/80'
                      }`}>
                        Subido el: {existingDocument.fecha}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Booking Input */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${getLabelStyles()}`}>
              Número de Booking <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={booking}
              onChange={(e) => setBooking(e.target.value.toUpperCase())}
              className={getInputStyles()}
              placeholder="Ingrese el número de booking"
              autoFocus
            />
          </div>

          {/* File Upload */}
          <div className="space-y-3">
            <div>
              <label className={`block text-sm font-medium mb-2 ${getLabelStyles()}`}>
                PDF del Booking (Opcional)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              {!selectedFile ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full border-2 border-dashed rounded-xl px-4 py-6 flex flex-col items-center justify-center gap-2 transition-colors ${
                    theme === 'dark'
                      ? 'border-slate-700 hover:border-sky-500 bg-slate-800/50 text-slate-300'
                      : 'border-gray-300 hover:border-blue-500 bg-gray-50 text-gray-600'
                  }`}
                >
                  <Upload className="h-6 w-6" />
                  <span className="text-sm">Hacer clic para seleccionar PDF</span>
                </button>
              ) : (
                <div
                  className={`border rounded-xl px-4 py-3 flex items-center justify-between gap-3 ${
                    theme === 'dark'
                      ? 'border-slate-700 bg-slate-800/50'
                      : 'border-gray-300 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileText className={`h-5 w-5 flex-shrink-0 ${
                      theme === 'dark' ? 'text-sky-400' : 'text-blue-500'
                    }`} />
                    <span className={`text-sm truncate ${getLabelStyles()}`}>
                      {selectedFile.name}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                      theme === 'dark'
                        ? 'hover:bg-slate-700 text-slate-400 hover:text-slate-200'
                        : 'hover:bg-gray-200 text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Quitar
                  </button>
                </div>
              )}
            </div>

            {/* Campo para nombre personalizado del archivo */}
            {selectedFile && (
              <div>
                <label className={`block text-sm font-medium mb-2 ${getLabelStyles()}`}>
                  Nombre del archivo PDF <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={customFileName}
                  onChange={(e) => setCustomFileName(e.target.value)}
                  className={getInputStyles()}
                  placeholder="Ingrese el nombre para el archivo PDF"
                />
                <p className={`text-xs mt-1 ${
                  theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
                }`}>
                  El archivo se guardará con este nombre en Documentos
                </p>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className={`rounded-lg px-4 py-3 text-sm ${
              theme === 'dark'
                ? 'bg-red-900/30 border border-red-800 text-red-300'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`flex items-center justify-end gap-3 px-6 py-4 border-t ${
            theme === 'dark' ? 'border-slate-800' : 'border-gray-200'
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 rounded-lg border transition-colors ${getButtonStyles()}`}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading || !booking.trim()}
            className={`px-4 py-2 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed ${getPrimaryButtonStyles()}`}
          >
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
};
