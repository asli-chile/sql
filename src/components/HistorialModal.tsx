'use client';

import { useState, useEffect } from 'react';
import { X, Clock, User, Edit3, RotateCcw } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';

interface HistorialEntry {
  id: string;
  campo_modificado: string;
  valor_anterior: string;
  valor_nuevo: string;
  tipo_cambio: string;
  usuario_nombre: string;
  usuario_email?: string;
  usuario_rol?: string;
  fecha_cambio: string;
  metadata: any;
}

interface HistorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  registroId: string;
  registroRefAsli: string;
}

export function HistorialModal({ isOpen, onClose, registroId, registroRefAsli }: HistorialModalProps) {
  const [historial, setHistorial] = useState<HistorialEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && registroId) {
      loadHistorial();
    }
  }, [isOpen, registroId]);

  const loadHistorial = async () => {
    setLoading(true);
    setError('');

    try {
      console.log('🔄 Cargando historial para registro:', registroId);
      const supabase = createClient();
      const { data, error } = await supabase
        .from('historial_cambios')
        .select(`
          *,
          usuarios:usuario_real_id (
            email,
            rol
          )
        `)
        .eq('registro_id', registroId)
        .order('fecha_cambio', { ascending: false });

      if (error) {
        console.error('Error cargando historial:', error);
        throw error;
      }

      console.log('✅ Historial cargado:', data?.length || 0, 'entradas');

      // Transformar datos para incluir información del usuario
      const transformedData = (data || []).map(entry => ({
        ...entry,
        usuario_email: entry.usuarios?.email,
        usuario_rol: entry.usuarios?.rol
      }));

      setHistorial(transformedData);
    } catch (err: any) {
      setError(err.message || 'Error al cargar historial');
    } finally {
      setLoading(false);
    }
  };

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleString('es-CL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getFieldDisplayName = (campo: string) => {
    const fieldNames: Record<string, string> = {
      'ref_asli': 'REF ASLI',
      'shipper': 'Cliente',
      'booking': 'Booking',
      'contenedor': 'Contenedor',
      'naviera': 'Naviera',
      'nave_inicial': 'Nave',
      'especie': 'Especie',
      'temperatura': 'Temperatura',
      'cbm': 'CBM',
      'co2': 'CO2',
      'o2': 'O2',
      'pol': 'POL',
      'pod': 'POD',
      'deposito': 'Depósito',
      'etd': 'ETD',
      'eta': 'ETA',
      'tt': 'TT',
      'flete': 'Flete',
      'ejecutivo': 'Ejecutivo',
      'estado': 'Estado',
      'tipo_ingreso': 'Tipo Ingreso',
      'contrato': 'Contrato',
      'comentario': 'Comentario'
    };
    
    return fieldNames[campo] || campo;
  };

  const formatValue = (value: string, campo: string) => {
    if (value === 'NULL' || value === null) return '-';
    
    // Formatear fechas
    if (campo === 'etd' || campo === 'eta' || campo === 'ingresado' || campo === 'ingreso_stacking') {
      try {
        return new Date(value).toLocaleDateString('es-CL');
      } catch {
        return value;
      }
    }
    
    // Formatear números con unidades
    if (campo === 'temperatura') return `${value}°C`;
    if (campo === 'co2' || campo === 'o2') return `${value}%`;
    if (campo === 'cbm') return `${value}`;
    if (campo === 'tt') return `${value} días`;
    
    return value;
  };

  const getChangeIcon = (tipo: string) => {
    switch (tipo) {
      case 'UPDATE':
        return <Edit3 size={16} className="text-blue-500" />;
      case 'CREATE':
        return <RotateCcw size={16} className="text-green-500" />;
      case 'DELETE':
        return <X size={16} className="text-red-500" />;
      default:
        return <Clock size={16} className="text-gray-500" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Historial de Cambios
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                REF ASLI: {registroRefAsli}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Cargando historial...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-600 mb-2">❌ Error</div>
              <p className="text-gray-600">{error}</p>
              <button
                onClick={loadHistorial}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Reintentar
              </button>
            </div>
          ) : historial.length === 0 ? (
            <div className="text-center py-8">
              <Clock size={48} className="text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No hay cambios registrados para este elemento</p>
            </div>
          ) : (
            <div className="space-y-4">
              {historial.map((entry) => (
                <div key={entry.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      {getChangeIcon(entry.tipo_cambio)}
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {getFieldDisplayName(entry.campo_modificado)}
                        </h3>
                        <div className="flex items-center space-x-4 mt-1">
                          <div className="flex items-center space-x-2 text-sm">
                            <User size={14} className="text-gray-400" />
                            <span className="text-gray-600">{entry.usuario_nombre}</span>
                            {entry.usuario_rol && (
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                entry.usuario_rol === 'admin' ? 'bg-red-100 text-red-800' :
                                entry.usuario_rol === 'supervisor' ? 'bg-blue-100 text-blue-800' :
                                entry.usuario_rol === 'usuario' ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {entry.usuario_rol.toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 text-sm">
                            <Clock size={14} className="text-gray-400" />
                            <span className="text-gray-600">{formatFecha(entry.fecha_cambio)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Valor Anterior
                      </label>
                      <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded text-sm">
                        <span className="text-red-800">
                          {formatValue(entry.valor_anterior, entry.campo_modificado)}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Valor Nuevo
                      </label>
                      <div className="mt-1 p-2 bg-green-50 border border-green-200 rounded text-sm">
                        <span className="text-green-800">
                          {formatValue(entry.valor_nuevo, entry.campo_modificado)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
