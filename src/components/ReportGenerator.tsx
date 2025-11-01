'use client';

import React, { useState } from 'react';
import { FileText, X, Loader2, FileSpreadsheet, File } from 'lucide-react';
import { Registro } from '@/types/registros';
import { tiposReportes, TipoReporte, generarReporte, descargarExcel } from '@/lib/excel-templates';
import { generarReportePDF, descargarPDF } from '@/lib/pdf-templates';
import { useTheme } from '@/contexts/ThemeContext';

type FormatoReporte = 'excel' | 'pdf';

interface ReportGeneratorProps {
  registros: Registro[];
  isOpen: boolean;
  onClose: () => void;
}

export function ReportGenerator({ registros, isOpen, onClose }: ReportGeneratorProps) {
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoReporte | null>(null);
  const [formatoSeleccionado, setFormatoSeleccionado] = useState<FormatoReporte>('excel');
  const [generando, setGenerando] = useState(false);
  const { theme } = useTheme();

  const handleGenerar = async () => {
    if (!tipoSeleccionado || registros.length === 0) return;

    setGenerando(true);
    try {
      const nombreReporte = tiposReportes.find(r => r.id === tipoSeleccionado)?.nombre || 'reporte';
      
      if (formatoSeleccionado === 'excel') {
        const buffer = await generarReporte(tipoSeleccionado, registros);
        descargarExcel(buffer, nombreReporte);
      } else {
        const buffer = await generarReportePDF(tipoSeleccionado, registros);
        descargarPDF(buffer, nombreReporte);
      }
      
      // Cerrar modal después de descargar
      setTimeout(() => {
        onClose();
        setTipoSeleccionado(null);
        setGenerando(false);
      }, 500);
    } catch (error) {
      console.error('Error al generar reporte:', error);
      alert('Error al generar el reporte. Por favor, intenta nuevamente.');
      setGenerando(false);
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
              Generar Reporte Personalizado
            </h2>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded hover:bg-opacity-20 transition-colors ${
              theme === 'dark'
                ? 'text-gray-400 hover:bg-white'
                : 'text-gray-600 hover:bg-gray-200'
            }`}
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

          {/* Selector de formato */}
          <div className="mb-6">
            <label
              className={`block text-sm font-medium mb-3 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}
            >
              Formato del reporte:
            </label>
            <div className="flex space-x-3">
              <button
                onClick={() => setFormatoSeleccionado('excel')}
                className={`flex-1 p-3 rounded-lg border-2 transition-all flex items-center justify-center space-x-2 ${
                  formatoSeleccionado === 'excel'
                    ? theme === 'dark'
                      ? 'border-blue-500 bg-blue-900/30'
                      : 'border-blue-500 bg-blue-50'
                    : theme === 'dark'
                    ? 'border-gray-700 hover:border-gray-600 hover:bg-gray-700/50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <FileSpreadsheet className={`w-5 h-5 ${formatoSeleccionado === 'excel' ? 'text-blue-500' : ''}`} />
                <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Excel
                </span>
              </button>
              <button
                onClick={() => setFormatoSeleccionado('pdf')}
                className={`flex-1 p-3 rounded-lg border-2 transition-all flex items-center justify-center space-x-2 ${
                  formatoSeleccionado === 'pdf'
                    ? theme === 'dark'
                      ? 'border-blue-500 bg-blue-900/30'
                      : 'border-blue-500 bg-blue-50'
                    : theme === 'dark'
                    ? 'border-gray-700 hover:border-gray-600 hover:bg-gray-700/50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <File className={`w-5 h-5 ${formatoSeleccionado === 'pdf' ? 'text-blue-500' : ''}`} />
                <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  PDF
                </span>
              </button>
            </div>
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

        {/* Footer */}
        <div
          className={`flex items-center justify-end space-x-3 p-4 border-t ${
            theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
          }`}
        >
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg transition-colors ${
              theme === 'dark'
                ? 'text-gray-300 hover:bg-gray-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
            disabled={generando}
          >
            Cancelar
          </button>
          <button
            onClick={handleGenerar}
            disabled={!tipoSeleccionado || generando}
            className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
              tipoSeleccionado && !generando
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-400 text-gray-200 cursor-not-allowed'
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

