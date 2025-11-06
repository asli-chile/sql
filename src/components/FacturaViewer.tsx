'use client';

import React, { useState } from 'react';
import { X, Download, Edit } from 'lucide-react';
import { Factura } from '@/types/factura';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/hooks/useToast';
import { PlantillaAlma } from '@/components/facturas/PlantillaAlma';
import { generarFacturaPDF } from '@/lib/factura-pdf';
import { generarFacturaExcel } from '@/lib/factura-excel';
import { generarFacturaExcelSheetJS } from '@/lib/factura-excel-sheetjs';
import { FacturaEditor } from '@/components/FacturaEditor';

interface FacturaViewerProps {
  factura: Factura;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export function FacturaViewer({ factura, isOpen, onClose, onUpdate }: FacturaViewerProps) {
  const { theme } = useTheme();
  const { success, error: showError } = useToast();
  const [descargandoPDF, setDescargandoPDF] = useState(false);
  const [descargandoExcel, setDescargandoExcel] = useState(false);
  const [descargandoExcelSheetJS, setDescargandoExcelSheetJS] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const handleFacturaActualizada = () => {
    setIsEditorOpen(false);
    if (onUpdate) {
      onUpdate();
    }
  };

  const handleDownloadPDF = async () => {
    setDescargandoPDF(true);
    try {
      await generarFacturaPDF(factura);
      success('PDF generado exitosamente');
    } catch (err: any) {
      console.error('Error generando PDF:', err);
      showError('Error al generar PDF: ' + err.message);
    } finally {
      setDescargandoPDF(false);
    }
  };

  const handleDownloadExcel = async () => {
    setDescargandoExcel(true);
    try {
      await generarFacturaExcel(factura);
      success('Excel generado exitosamente');
    } catch (err: any) {
      console.error('Error generando Excel:', err);
      showError('Error al generar Excel: ' + err.message);
    } finally {
      setDescargandoExcel(false);
    }
  };

  const handleDownloadExcelSheetJS = async () => {
    setDescargandoExcelSheetJS(true);
    try {
      await generarFacturaExcelSheetJS(factura);
      success('Excel (SheetJS) generado exitosamente');
    } catch (err: any) {
      console.error('Error generando Excel con SheetJS:', err);
      showError('Error al generar Excel con SheetJS: ' + err.message);
    } finally {
      setDescargandoExcelSheetJS(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div
        className={`relative w-full max-w-[95vw] h-[95vh] rounded-lg shadow-xl overflow-hidden flex flex-col ${
          theme === 'dark' ? 'bg-gray-800' : 'bg-white'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between p-4 border-b ${
            theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
          }`}
        >
          <div>
            <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Ver Factura
            </h2>
            {factura.refAsli && (
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                REF ASLI: <span className="font-semibold">{factura.refAsli}</span>
              </p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsEditorOpen(true)}
              className="px-3 py-2 rounded-lg transition-colors flex items-center space-x-2 bg-blue-600 text-white hover:bg-blue-700"
            >
              <Edit className="w-4 h-4" />
              <span>Editar</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={descargandoPDF}
              className={`px-3 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                descargandoPDF
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>PDF</span>
            </button>
            <button
              onClick={handleDownloadExcel}
              disabled={descargandoExcel}
              className={`px-3 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                descargandoExcel
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>Excel</span>
            </button>
            <button
              onClick={handleDownloadExcelSheetJS}
              disabled={descargandoExcelSheetJS}
              className={`px-3 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                descargandoExcelSheetJS
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
              title="Versión experimental con SheetJS"
            >
              <Download className="w-4 h-4" />
              <span className="text-xs">Excel (SheetJS)</span>
            </button>
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
        </div>

        {/* Content - Solo vista previa */}
        <div className="flex-1 overflow-y-auto p-4 bg-white">
          <PlantillaAlma factura={factura} />
        </div>
      </div>
      {/* Modal de edición */}
      {isEditorOpen && factura.id && (
        <FacturaEditor
          factura={factura}
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          onSave={handleFacturaActualizada}
        />
      )}
    </div>
  );
}

