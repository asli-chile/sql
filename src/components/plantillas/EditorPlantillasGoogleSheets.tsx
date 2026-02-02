'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { ExternalLink, Download, RefreshCw, FileSpreadsheet } from 'lucide-react';

const SHEET_NAME = 'FORMATO PROFORMA';

export function EditorPlantillasGoogleSheets() {
  const { theme } = useTheme();
  const [spreadsheetId, setSpreadsheetId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Obtener el spreadsheet ID desde las variables de entorno públicas
    const id =
      process.env.NEXT_PUBLIC_GOOGLE_SHEETS_SPREADSHEET_ID ||
      process.env.NEXT_PUBLIC_GOOGLE_SHEETS_SPREADSHEET_ID_NEW ||
      '1w-qqXkBPNW2j0yvOiL4xp83cBtdbpYWU8YV77PaGBjg';
    setSpreadsheetId(id);
  }, []);

  // Obtener el gid de la hoja específica
  const [sheetGid, setSheetGid] = useState<string>('');

  useEffect(() => {
    const fetchSheetGid = async () => {
      if (!spreadsheetId) return;
      
      try {
        const response = await fetch(`/api/google-sheets/get-sheet-gid?sheetName=${encodeURIComponent(SHEET_NAME)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.gid) {
            setSheetGid(data.gid);
          }
        }
      } catch (err) {
        console.warn('No se pudo obtener el gid de la hoja, usando gid=0');
        setSheetGid('0');
      }
    };

    if (spreadsheetId) {
      fetchSheetGid();
    }
  }, [spreadsheetId]);

  const editUrl = spreadsheetId
    ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${sheetGid || '0'}`
    : '';
  const previewUrl = spreadsheetId
    ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/preview#gid=${sheetGid || '0'}`
    : '';

  const handleExportExcel = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/google-sheets/export-proforma-template');
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Error al exportar plantilla');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FORMATO_PROFORMA_${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('Error exportando:', err);
      setError(err.message || 'Error al exportar la plantilla');
    } finally {
      setLoading(false);
    }
  };

  const handleInitializeTemplate = async () => {
    if (!confirm('¿Deseas inicializar la hoja "FORMATO PROFORMA" con contenido de ejemplo? Esto sobrescribirá cualquier contenido existente.')) {
      return;
    }

    setInitializing(true);
    setError(null);

    try {
      const response = await fetch('/api/google-sheets/init-proforma-template', {
        method: 'POST',
      });
      
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        // Si no se puede parsear JSON, el error está en el texto
        const text = await response.text();
        throw new Error(text || `Error HTTP ${response.status}: ${response.statusText}`);
      }
      
      if (!response.ok) {
        throw new Error(data.message || `Error HTTP ${response.status}: ${response.statusText}`);
      }
      
      if (!data.ok) {
        throw new Error(data.message || 'Error al inicializar plantilla');
      }

      alert('✅ Plantilla inicializada correctamente. Recarga la página para ver los cambios.');
      // Recargar la página después de un breve delay
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      console.error('Error inicializando:', err);
      const errorMessage = err.message || 'Error al inicializar la plantilla. Verifica la consola para más detalles.';
      setError(errorMessage);
      // También mostrar en consola para debugging
      console.error('Detalles del error:', {
        message: err.message,
        stack: err.stack,
        name: err.name,
      });
    } finally {
      setInitializing(false);
    }
  };

  return (
    <div
      className={`h-full flex flex-col ${
        theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'
      }`}
    >
      {/* Header compacto */}
      <div
        className={`flex items-center justify-between p-2 border-b flex-shrink-0 ${
          theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
        }`}
      >
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-blue-500" />
          <h2 className="text-lg font-bold">
            Editor Google Sheets - {SHEET_NAME}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleInitializeTemplate}
            disabled={initializing || !spreadsheetId}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded transition-colors ${
              initializing || !spreadsheetId
                ? 'bg-gray-400 cursor-not-allowed'
                : theme === 'dark'
                ? 'bg-purple-600 hover:bg-purple-700'
                : 'bg-purple-500 hover:bg-purple-600'
            } text-white`}
            title="Inicializar plantilla con contenido de ejemplo"
          >
            {initializing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Inicializando...
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-4 h-4" />
                <span className="hidden sm:inline">Inicializar</span>
              </>
            )}
          </button>
          <button
            onClick={handleExportExcel}
            disabled={loading || !spreadsheetId}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded transition-colors ${
              loading || !spreadsheetId
                ? 'bg-gray-400 cursor-not-allowed'
                : theme === 'dark'
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-green-500 hover:bg-green-600'
            } text-white`}
            title="Exportar plantilla a Excel"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Exportar Excel</span>
              </>
            )}
          </button>
          {editUrl && (
            <a
              href={editUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded transition-colors ${
                theme === 'dark'
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-blue-500 hover:bg-blue-600'
              } text-white`}
              title="Abrir en nueva pestaña"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden sm:inline">Abrir</span>
            </a>
          )}
        </div>
      </div>

      {/* Error message compacto */}
      {error && (
        <div
          className={`mx-2 mt-2 p-2 rounded text-sm flex-shrink-0 ${
            theme === 'dark'
              ? 'bg-red-900/50 border border-red-700'
              : 'bg-red-50 border border-red-200'
          } text-red-600 dark:text-red-400`}
        >
          <p>{error}</p>
        </div>
      )}

      {/* Google Sheets - Ocupa todo el espacio disponible */}
      <div className="flex-1 overflow-hidden min-h-0">
        {previewUrl ? (
          <iframe
            src={previewUrl}
            className="w-full h-full border-0"
            title="Editor de Google Sheets"
          />
        ) : (
          <div
            className={`flex flex-col items-center justify-center h-full gap-4 ${
              theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
            }`}
          >
            <FileSpreadsheet className="w-12 h-12 opacity-50" />
            <div className="text-center">
              <p className="text-sm opacity-70 mb-2">
                No se pudo cargar la vista previa
              </p>
              {editUrl && (
                <a
                  href={editUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded transition-colors ${
                    theme === 'dark'
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-blue-500 hover:bg-blue-600'
                  } text-white text-sm`}
                >
                  <ExternalLink className="w-4 h-4" />
                  Abrir en Google Sheets
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
