'use client';

import React, { useState } from 'react';
import { FileText, X, Loader2, Send } from 'lucide-react';
import { Registro } from '@/types/registros';
import { generarReporte, descargarExcel, tiposReportes, TipoReporte } from '@/lib/reportes';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/hooks/useUser';

interface ReportGeneratorProps {
  registros: Registro[];
  isOpen: boolean;
  onClose: () => void;
}

export function ReportGenerator({ registros, isOpen, onClose }: ReportGeneratorProps) {
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoReporte | null>(null);
  const [generando, setGenerando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const { theme } = useTheme();
  const { currentUser } = useUser();
  const generatedBy =
    (currentUser?.nombre && currentUser.nombre.trim().length > 0 && currentUser.nombre) ||
    currentUser?.email ||
    'Usuario desconocido';

  const resetState = () => {
    setTipoSeleccionado(null);
    setFeedback(null);
  };

  const handleClose = () => {
    if (generando || enviando) {
      return;
    }
    resetState();
    onClose();
  };

  const handleGenerar = async () => {
    if (!tipoSeleccionado || registros.length === 0) return;

    setGenerando(true);
    try {
      const buffer = await generarReporte(tipoSeleccionado, registros);
      const nombreReporte = tiposReportes.find(r => r.id === tipoSeleccionado)?.nombre || 'reporte';
      
      // Descargar Excel
      descargarExcel(buffer, nombreReporte);
      
      setTimeout(() => {
        setGenerando(false);
        resetState();
        onClose();
      }, 500);
    } catch (error) {
      console.error('Error al generar reporte:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      alert(`Error al generar el reporte: ${errorMessage}\n\nPor favor, intenta nuevamente.`);
      setGenerando(false);
    }
  };

  const handleEnviarGoogleSheets = async () => {
    if (!tipoSeleccionado) {
      setFeedback({
        type: 'error',
        message: 'Selecciona un tipo de reporte antes de enviar a Google Sheets.'
      });
      return;
    }

    if (registros.length === 0) {
      setFeedback({
        type: 'error',
        message: 'No hay registros disponibles para enviar.'
      });
      return;
    }

    setEnviando(true);
    setFeedback(null);

    try {
      const response = await fetch('/api/google-sheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tipoReporte: tipoSeleccionado,
          registros,
          usuario: generatedBy
        })
      });

      const data = await response.json();

      if (!response.ok || !data?.ok) {
        const message =
          (data && typeof data.message === 'string')
            ? data.message
            : 'Error al enviar datos a Google Sheets.';
        throw new Error(message);
      }

      const registrosInsertados = data?.inserted ?? registros.length;
      const nombreHoja = data?.sheetName ?? 'hoja';

      setFeedback({
        type: 'success',
        message: `Se enviaron ${registrosInsertados} registro(s) correctamente a "${nombreHoja}".`
      });

      setTimeout(() => {
        resetState();
        onClose();
      }, 1200);
    } catch (error) {
      console.error('Error al enviar a Google Sheets:', error);
      const mensaje =
        error instanceof Error ? error.message : 'Error inesperado al conectar con Google Sheets.';
      setFeedback({
        type: 'error',
        message: mensaje
      });
    } finally {
      setEnviando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div
        className={`relative w-full max-w-2xl rounded-lg shadow-xl max-h-[90vh] overflow-hidden flex flex-col ${
          theme === 'dark' ? 'bg-gray-800' : 'bg-white'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between p-4 border-b ${
            theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center space-x-3">
            <FileText className={`w-6 h-6 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
            <h2
              className={`text-xl font-semibold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}
            >
              Generar Reporte
            </h2>
          </div>
          <button
            onClick={handleClose}
            className={`p-1 rounded hover:bg-opacity-20 transition-colors ${
              theme === 'dark'
                ? 'text-gray-400 hover:bg-white'
                : 'text-gray-600 hover:bg-gray-200'
            } ${generando || enviando ? 'opacity-60 cursor-not-allowed' : ''}`}
            disabled={generando || enviando}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6">
          <div
            className={`mb-4 p-3 rounded-lg ${
              theme === 'dark' ? 'bg-blue-900/30 border border-blue-700' : 'bg-blue-50 border border-blue-200'
            }`}
          >
            <p className={`text-sm ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>
              <strong>{registros.length}</strong> registro(s) seleccionado(s) para el reporte
            </p>
          </div>

          <div className="space-y-3">
            <label
              className={`block text-sm font-medium mb-3 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}
            >
              Selecciona el tipo de reporte:
            </label>

            {tiposReportes.map((tipo) => (
              <button
                key={tipo.id}
                onClick={() => setTipoSeleccionado(tipo.id)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  tipoSeleccionado === tipo.id
                    ? theme === 'dark'
                      ? 'border-blue-500 bg-blue-900/30'
                      : 'border-blue-500 bg-blue-50'
                    : theme === 'dark'
                    ? 'border-gray-700 hover:border-gray-600 hover:bg-gray-700/50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <span className="text-2xl">{tipo.icono}</span>
                  <div className="flex-1">
                    <h3
                      className={`font-semibold mb-1 ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}
                    >
                      {tipo.nombre}
                    </h3>
                    <p
                      className={`text-sm ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}
                    >
                      {tipo.descripcion}
                    </p>
                  </div>
                  {tipoSeleccionado === tipo.id && (
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center ${
                        theme === 'dark' ? 'bg-blue-500' : 'bg-blue-600'
                      }`}
                    >
                      <div className="w-2 h-2 rounded-full bg-white"></div>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {feedback && (
          <div
            role="status"
            aria-live="polite"
            className={`mx-6 mb-4 rounded-lg border px-4 py-3 text-sm ${
              feedback.type === 'success'
                ? theme === 'dark'
                  ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : theme === 'dark'
                ? 'border-rose-500/50 bg-rose-500/10 text-rose-200'
                : 'border-rose-200 bg-rose-50 text-rose-700'
            }`}
          >
            {feedback.message}
          </div>
        )}

        {/* Footer */}
        <div
          className={`flex flex-wrap items-center justify-end gap-3 p-4 border-t ${
            theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
          }`}
        >
          <button
            onClick={handleClose}
            className={`px-4 py-2 rounded-lg transition-colors ${
              theme === 'dark'
                ? 'text-gray-300 hover:bg-gray-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
            disabled={generando || enviando}
          >
            Cancelar
          </button>
          <button
            onClick={handleEnviarGoogleSheets}
            disabled={!tipoSeleccionado || enviando || generando}
            className={`inline-flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold transition-colors ${
              tipoSeleccionado && !enviando && !generando
                ? theme === 'dark'
                  ? 'bg-gradient-to-r from-sky-500 to-indigo-500 text-white hover:from-sky-400 hover:to-indigo-400'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-400 text-gray-200 cursor-not-allowed'
            }`}
          >
            {enviando ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Enviando...</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span>Enviar a Google Sheets</span>
              </>
            )}
          </button>
          <button
            onClick={handleGenerar}
            disabled={!tipoSeleccionado || generando || enviando}
            className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
              tipoSeleccionado && !generando && !enviando
                ? theme === 'dark'
                  ? 'border border-blue-400 text-blue-200 hover:bg-blue-500/10'
                  : 'border border-blue-500 text-blue-600 hover:bg-blue-50'
                : 'border border-gray-300 text-gray-400 cursor-not-allowed'
            }`}
          >
            {generando ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generando...</span>
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                <span>Generar Reporte</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

