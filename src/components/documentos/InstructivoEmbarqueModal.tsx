'use client';

import { useState, useEffect } from 'react';
import { Registro } from '@/types/registros';
import { useTheme } from '@/contexts/ThemeContext';
import { X, Download, FileText } from 'lucide-react';
import { generarInstructivoPDF } from '@/lib/instructivo-pdf';

interface InstructivoEmbarqueModalProps {
  isOpen: boolean;
  onClose: () => void;
  contenedor?: string; // Opcional: puede no tener contenedor aún
  registro: Registro;
}

export function InstructivoEmbarqueModal({
  isOpen,
  onClose,
  contenedor,
  registro,
}: InstructivoEmbarqueModalProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [formData, setFormData] = useState({
    fechaEmision: new Date().toISOString().split('T')[0],
    consignatario: registro.shipper || '',
    exportador: registro.shipper || '',
    naviera: registro.naviera || '',
    booking: registro.booking || '',
    contenedor: contenedor || '', // Puede estar vacío si aún no hay contenedor
    tipoContenedor: '40HC', // Valor por defecto
    temperatura: registro.temperatura?.toString() || '',
    pol: registro.pol || '',
    pod: registro.pod || '',
    etd: registro.etd ? new Date(registro.etd).toISOString().split('T')[0] : '',
    eta: registro.eta ? new Date(registro.eta).toISOString().split('T')[0] : '',
    especie: registro.especie || '',
    observaciones: registro.observacion || '',
  });
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Resetear formulario cuando se abre el modal
      setFormData({
        fechaEmision: new Date().toISOString().split('T')[0],
        consignatario: registro.shipper || '',
        exportador: registro.shipper || '',
        naviera: registro.naviera || '',
        booking: registro.booking || '',
        contenedor: contenedor || '', // Puede estar vacío si aún no hay contenedor
        tipoContenedor: '40HC',
        temperatura: registro.temperatura?.toString() || '',
        pol: registro.pol || '',
        pod: registro.pod || '',
        etd: registro.etd ? new Date(registro.etd).toISOString().split('T')[0] : '',
        eta: registro.eta ? new Date(registro.eta).toISOString().split('T')[0] : '',
        especie: registro.especie || '',
        observaciones: registro.observacion || '',
      });
    }
  }, [isOpen, registro, contenedor]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await generarInstructivoPDF({
        ...formData,
        registro,
      });
    } catch (error) {
      console.error('Error generando instructivo:', error);
      alert('Error al generar el instructivo. Por favor, intenta de nuevo.');
    } finally {
      setGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className={`border max-w-3xl w-full max-h-[90vh] flex flex-col ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 border flex items-center justify-center ${isDark ? 'bg-blue-600 border-blue-500' : 'bg-blue-50 border-blue-200'}`}>
              <FileText className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
            <div>
              <h2 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Instructivo de Embarque
              </h2>
              <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                {contenedor ? `Contenedor: ${contenedor}` : 'Contenedor: Pendiente asignación'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 border transition-colors ${isDark
              ? 'border-slate-700 text-slate-300 hover:bg-slate-700'
              : 'border-gray-300 text-gray-600 hover:bg-gray-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                Fecha de Emisión *
              </label>
              <input
                type="date"
                name="fechaEmision"
                value={formData.fechaEmision}
                onChange={handleChange}
                className={`w-full border px-3 py-2 text-sm ${isDark
                  ? 'border-slate-700 bg-slate-900 text-white'
                  : 'border-gray-300 bg-white text-gray-900'
                }`}
                required
              />
            </div>

            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                Tipo de Contenedor *
              </label>
              <select
                name="tipoContenedor"
                value={formData.tipoContenedor}
                onChange={handleChange}
                className={`w-full border px-3 py-2 text-sm ${isDark
                  ? 'border-slate-700 bg-slate-900 text-white'
                  : 'border-gray-300 bg-white text-gray-900'
                }`}
                required
              >
                <option value="20ST">20ST</option>
                <option value="40ST">40ST</option>
                <option value="40HC">40HC</option>
                <option value="45HC">45HC</option>
              </select>
            </div>

            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                Consignatario *
              </label>
              <input
                type="text"
                name="consignatario"
                value={formData.consignatario}
                onChange={handleChange}
                className={`w-full border px-3 py-2 text-sm ${isDark
                  ? 'border-slate-700 bg-slate-900 text-white'
                  : 'border-gray-300 bg-white text-gray-900'
                }`}
                required
              />
            </div>

            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                Exportador *
              </label>
              <input
                type="text"
                name="exportador"
                value={formData.exportador}
                onChange={handleChange}
                className={`w-full border px-3 py-2 text-sm ${isDark
                  ? 'border-slate-700 bg-slate-900 text-white'
                  : 'border-gray-300 bg-white text-gray-900'
                }`}
                required
              />
            </div>

            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                Naviera *
              </label>
              <input
                type="text"
                name="naviera"
                value={formData.naviera}
                onChange={handleChange}
                className={`w-full border px-3 py-2 text-sm ${isDark
                  ? 'border-slate-700 bg-slate-900 text-white'
                  : 'border-gray-300 bg-white text-gray-900'
                }`}
                required
              />
            </div>

            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                Booking *
              </label>
              <input
                type="text"
                name="booking"
                value={formData.booking}
                onChange={handleChange}
                className={`w-full border px-3 py-2 text-sm ${isDark
                  ? 'border-slate-700 bg-slate-900 text-white'
                  : 'border-gray-300 bg-white text-gray-900'
                }`}
                required
              />
            </div>

            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                Contenedor {!contenedor && <span className="text-xs text-orange-500">(Opcional - Pendiente)</span>}
              </label>
              <input
                type="text"
                name="contenedor"
                value={formData.contenedor}
                onChange={handleChange}
                placeholder={!contenedor ? "Pendiente asignación" : ""}
                className={`w-full border px-3 py-2 text-sm ${isDark
                  ? 'border-slate-700 bg-slate-900 text-white'
                  : 'border-gray-300 bg-white text-gray-900'
                }`}
              />
            </div>

            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                Temperatura (°C)
              </label>
              <input
                type="text"
                name="temperatura"
                value={formData.temperatura}
                onChange={handleChange}
                className={`w-full border px-3 py-2 text-sm ${isDark
                  ? 'border-slate-700 bg-slate-900 text-white'
                  : 'border-gray-300 bg-white text-gray-900'
                }`}
                placeholder="Ej: +2"
              />
            </div>

            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                Puerto de Origen (POL) *
              </label>
              <input
                type="text"
                name="pol"
                value={formData.pol}
                onChange={handleChange}
                className={`w-full border px-3 py-2 text-sm ${isDark
                  ? 'border-slate-700 bg-slate-900 text-white'
                  : 'border-gray-300 bg-white text-gray-900'
                }`}
                required
              />
            </div>

            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                Puerto de Destino (POD) *
              </label>
              <input
                type="text"
                name="pod"
                value={formData.pod}
                onChange={handleChange}
                className={`w-full border px-3 py-2 text-sm ${isDark
                  ? 'border-slate-700 bg-slate-900 text-white'
                  : 'border-gray-300 bg-white text-gray-900'
                }`}
                required
              />
            </div>

            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                ETD (Fecha de Zarpe)
              </label>
              <input
                type="date"
                name="etd"
                value={formData.etd}
                onChange={handleChange}
                className={`w-full border px-3 py-2 text-sm ${isDark
                  ? 'border-slate-700 bg-slate-900 text-white'
                  : 'border-gray-300 bg-white text-gray-900'
                }`}
              />
            </div>

            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                ETA (Fecha de Arribo)
              </label>
              <input
                type="date"
                name="eta"
                value={formData.eta}
                onChange={handleChange}
                className={`w-full border px-3 py-2 text-sm ${isDark
                  ? 'border-slate-700 bg-slate-900 text-white'
                  : 'border-gray-300 bg-white text-gray-900'
                }`}
              />
            </div>

            <div className="md:col-span-2">
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                Especie
              </label>
              <input
                type="text"
                name="especie"
                value={formData.especie}
                onChange={handleChange}
                className={`w-full border px-3 py-2 text-sm ${isDark
                  ? 'border-slate-700 bg-slate-900 text-white'
                  : 'border-gray-300 bg-white text-gray-900'
                }`}
              />
            </div>

            <div className="md:col-span-2">
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                Observaciones
              </label>
              <textarea
                name="observaciones"
                value={formData.observaciones}
                onChange={handleChange}
                rows={4}
                className={`w-full border px-3 py-2 text-sm ${isDark
                  ? 'border-slate-700 bg-slate-900 text-white'
                  : 'border-gray-300 bg-white text-gray-900'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-end gap-3 p-6 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 border transition-colors ${isDark
              ? 'border-slate-700 text-slate-300 hover:bg-slate-700'
              : 'border-gray-300 text-gray-700 hover:bg-gray-100'
            }`}
          >
            Cancelar
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating || !formData.fechaEmision || !formData.consignatario || !formData.exportador}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {generating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Generando...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Generar PDF</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
