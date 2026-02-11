'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Plus, Trash2, Save, Edit2, X, Check } from 'lucide-react';
import type { Consorcio, ServicioUnico, ConsorcioFormData } from '@/types/servicios';

interface ConsorciosManagerProps {
  onConsorcioCreated?: () => void;
}

export function ConsorciosManager({ onConsorcioCreated }: ConsorciosManagerProps) {
  const { theme } = useTheme();
  const [consorcios, setConsorcios] = useState<Consorcio[]>([]);
  const [serviciosUnicos, setServiciosUnicos] = useState<ServicioUnico[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Estado para crear/editar consorcio
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConsorcio, setEditingConsorcio] = useState<Consorcio | null>(null);
  const [formData, setFormData] = useState<ConsorcioFormData>({
    nombre: '',
    descripcion: '',
    servicios_unicos: [],
  });
  const [servicioSeleccionado, setServicioSeleccionado] = useState<string>('');

  // Cargar consorcios y servicios únicos
  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      
      // Cargar consorcios
      const consorciosResponse = await fetch(`${apiUrl}/api/admin/consorcios`);
      const consorciosResult = await consorciosResponse.json();
      if (!consorciosResponse.ok) {
        throw new Error(consorciosResult?.error || 'Error al cargar consorcios');
      }
      setConsorcios(consorciosResult.consorcios || []);

      // Cargar servicios únicos
      const serviciosResponse = await fetch(`${apiUrl}/api/admin/servicios-unicos`);
      const serviciosResult = await serviciosResponse.json();
      if (!serviciosResponse.ok) {
        throw new Error(serviciosResult?.error || 'Error al cargar servicios únicos');
      }
      setServiciosUnicos(serviciosResult.servicios || []);
    } catch (err: any) {
      setError(err?.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void cargarDatos();
  }, []);

  // Abrir modal para crear
  const abrirModalCrear = () => {
    setEditingConsorcio(null);
    setFormData({
      nombre: '',
      descripcion: '',
      servicios_unicos: [],
    });
    setServicioSeleccionado('');
    setIsModalOpen(true);
  };

  // Abrir modal para editar
  const abrirModalEditar = async (consorcio: Consorcio) => {
    setEditingConsorcio(consorcio);
    
    // Cargar servicios únicos completos con destinos
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const serviciosResponse = await fetch(`${apiUrl}/api/admin/servicios-unicos`);
    const serviciosResult = await serviciosResponse.json();
    
    if (serviciosResult.success) {
      setServiciosUnicos(serviciosResult.servicios || []);
    }
    
    // Convertir servicios del consorcio al formato del formulario
    const serviciosForm = (consorcio.servicios || []).map((cs) => ({
      servicio_unico_id: cs.servicio_unico_id,
      orden: cs.orden,
      destinos_activos: (consorcio.destinos_activos || [])
        .filter((da) => da.servicio_unico_id === cs.servicio_unico_id)
        .map((da) => ({
          destino_id: da.destino_id,
          orden: da.orden,
        })),
    }));

    setFormData({
      nombre: consorcio.nombre,
      descripcion: consorcio.descripcion || '',
      servicios_unicos: serviciosForm,
    });
    setServicioSeleccionado('');
    setIsModalOpen(true);
  };

  // Agregar servicio único al consorcio
  const agregarServicioUnico = () => {
    if (servicioSeleccionado && !formData.servicios_unicos.some(s => s.servicio_unico_id === servicioSeleccionado)) {
      const servicio = serviciosUnicos.find(s => s.id === servicioSeleccionado);
      if (servicio) {
        // Por defecto, usar todos los destinos del servicio único
        const destinosActivos = servicio.destinos?.map((d, index) => ({
          destino_id: d.id,
          orden: d.orden,
        })) || [];

        setFormData({
          ...formData,
          servicios_unicos: [
            ...formData.servicios_unicos,
            {
              servicio_unico_id: servicioSeleccionado,
              orden: formData.servicios_unicos.length,
              destinos_activos: destinosActivos,
            },
          ],
        });
        setServicioSeleccionado('');
      }
    }
  };

  // Eliminar servicio único del consorcio
  const eliminarServicioUnico = (servicioUnicoId: string) => {
    setFormData({
      ...formData,
      servicios_unicos: formData.servicios_unicos.filter(s => s.servicio_unico_id !== servicioUnicoId),
    });
  };

  // Toggle destino activo
  const toggleDestinoActivo = (servicioUnicoId: string, destinoId: string) => {
    setFormData({
      ...formData,
      servicios_unicos: formData.servicios_unicos.map(servicio => {
        if (servicio.servicio_unico_id === servicioUnicoId) {
          const destinoExiste = servicio.destinos_activos.some(d => d.destino_id === destinoId);
          if (destinoExiste) {
            // Eliminar destino
            return {
              ...servicio,
              destinos_activos: servicio.destinos_activos.filter(d => d.destino_id !== destinoId),
            };
          } else {
            // Agregar destino
            const servicioUnico = serviciosUnicos.find(s => s.id === servicioUnicoId);
            const destino = servicioUnico?.destinos?.find(d => d.id === destinoId);
            if (destino) {
              return {
                ...servicio,
                destinos_activos: [
                  ...servicio.destinos_activos,
                  { destino_id: destinoId, orden: destino.orden },
                ],
              };
            }
          }
        }
        return servicio;
      }),
    });
  };

  // Guardar consorcio
  const guardarConsorcio = async () => {
    try {
      setError(null);
      setSuccess(null);

      // Validaciones
      if (!formData.nombre.trim()) {
        setError('El nombre del consorcio es requerido');
        return;
      }

      if (formData.servicios_unicos.length === 0) {
        setError('Debe incluir al menos un servicio único');
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const url = `${apiUrl}/api/admin/consorcios`;
      const method = editingConsorcio ? 'PUT' : 'POST';

      const payload = editingConsorcio ? { id: editingConsorcio.id, ...formData } : formData;
      console.log('📤 Enviando payload al crear consorcio:', JSON.stringify(payload, null, 2));

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMessage = result?.error || 'Error al guardar el consorcio';
        const errorDetails = result?.details ? `\nDetalles: ${result.details}` : '';
        throw new Error(`${errorMessage}${errorDetails}`);
      }

      setSuccess(editingConsorcio ? 'Consorcio actualizado correctamente' : 'Consorcio creado correctamente');
      setIsModalOpen(false);
      void cargarDatos();
      if (onConsorcioCreated) {
        onConsorcioCreated();
      }
    } catch (err: any) {
      setError(err?.message || 'Error al guardar el consorcio');
    }
  };

  // Eliminar consorcio
  const eliminarConsorcio = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este consorcio?')) {
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const response = await fetch(`${apiUrl}/api/admin/consorcios?id=${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || 'Error al eliminar el consorcio');
      }

      setSuccess('Consorcio eliminado correctamente');
      void cargarDatos();
      if (onConsorcioCreated) {
        onConsorcioCreated();
      }
    } catch (err: any) {
      setError(err?.message || 'Error al eliminar el consorcio');
    }
  };

  const inputTone = theme === 'dark'
    ? 'bg-slate-800 border-slate-600 text-slate-100 focus:ring-sky-500'
    : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500';

  // Servicios únicos disponibles (no incluidos en el consorcio)
  const serviciosDisponibles = serviciosUnicos.filter(
    s => s.activo && !formData.servicios_unicos.some(su => su.servicio_unico_id === s.id)
  );

  if (loading) {
    return <div className="p-4 text-center">Cargando consorcios...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Mensajes */}
      {error && (
        <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 rounded">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-700 text-green-700 dark:text-green-400 rounded">
          {success}
        </div>
      )}

      {/* Botón crear */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold">Consorcios (Servicios Compartidos)</h2>
        <button
          onClick={abrirModalCrear}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition"
        >
          <Plus className="h-4 w-4" />
          Nuevo Consorcio
        </button>
      </div>

      {/* Lista de consorcios */}
      {consorcios.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          No hay consorcios creados. Crea servicios únicos primero.
        </div>
      ) : (
        <div className="space-y-2">
          {consorcios.map((consorcio) => (
            <div
              key={consorcio.id}
              className={`p-4 border rounded ${theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-gray-300 bg-white'}`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold">{consorcio.nombre}</h3>
                  <p className="text-sm text-gray-500">
                    Servicios: {consorcio.servicios?.length || 0}
                  </p>
                  {consorcio.requiere_revision && (
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                      ⚠️ Requiere revisión
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => abrirModalEditar(consorcio)}
                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => eliminarConsorcio(consorcio.id)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} rounded-lg shadow-xl`}>
            <div className="sticky top-0 flex justify-between items-center p-4 border-b bg-white dark:bg-slate-800">
              <div>
                <h3 className="text-lg font-bold">
                  {editingConsorcio ? 'Editar Consorcio' : 'Nuevo Consorcio'}
                </h3>
                <p className="text-sm text-gray-500">
                  {editingConsorcio ? 'Modifica el consorcio' : 'Selecciona servicios únicos existentes para crear el consorcio'}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Nombre */}
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide">Nombre del Consorcio *</span>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className={`mt-1 w-full border px-3 py-2 text-sm outline-none focus:ring-2 ${inputTone}`}
                  placeholder="Ej: ANDES EXPRESS, ASIA EXPRESS"
                  required
                />
              </label>

              {/* Descripción */}
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide">Descripción</span>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  className={`mt-1 w-full border px-3 py-2 text-sm outline-none focus:ring-2 ${inputTone}`}
                  rows={3}
                  placeholder="Descripción del consorcio"
                />
              </label>

              {/* Agregar servicio único */}
              <div className="space-y-2">
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wide">Agregar Servicio Único</span>
                  <div className="mt-1 flex gap-2">
                    <select
                      value={servicioSeleccionado}
                      onChange={(e) => setServicioSeleccionado(e.target.value)}
                      className={`flex-1 border px-3 py-2 text-sm outline-none focus:ring-2 ${inputTone}`}
                    >
                      <option value="">Seleccionar servicio único existente</option>
                      {serviciosDisponibles.map((servicio) => (
                        <option key={servicio.id} value={servicio.id}>
                          {servicio.nombre} ({servicio.naviera_nombre})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={agregarServicioUnico}
                      disabled={!servicioSeleccionado}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Solo puedes seleccionar servicios únicos que ya existen en el sistema
                  </p>
                </label>
              </div>

              {/* Servicios únicos incluidos */}
              {formData.servicios_unicos.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold">Servicios Únicos Incluidos</h4>
                  {formData.servicios_unicos.map((servicioForm) => {
                    const servicioUnico = serviciosUnicos.find(s => s.id === servicioForm.servicio_unico_id);
                    if (!servicioUnico) return null;

                    return (
                      <div
                        key={servicioForm.servicio_unico_id}
                        className={`p-4 border rounded ${theme === 'dark' ? 'border-slate-700 bg-slate-900' : 'border-gray-300 bg-gray-50'}`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h5 className="font-semibold">{servicioUnico.nombre}</h5>
                            <p className="text-sm text-gray-500">{servicioUnico.naviera_nombre}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => eliminarServicioUnico(servicioForm.servicio_unico_id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Destinos activos */}
                        {servicioUnico.destinos && servicioUnico.destinos.length > 0 && (
                          <div className="mt-3">
                            <label className="text-xs font-semibold uppercase tracking-wide mb-2 block">
                              Destinos Activos
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              {servicioUnico.destinos.map((destino) => {
                                const estaActivo = servicioForm.destinos_activos.some(d => d.destino_id === destino.id);
                                return (
                                  <label
                                    key={destino.id}
                                    className={`flex items-center gap-2 p-2 border rounded cursor-pointer ${
                                      estaActivo
                                        ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-400'
                                        : 'bg-gray-50 dark:bg-slate-800 border-gray-300'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={estaActivo}
                                      onChange={() => toggleDestinoActivo(servicioForm.servicio_unico_id, destino.id)}
                                      className="rounded"
                                    />
                                    <span className="text-sm">{destino.puerto} ({destino.area})</span>
                                  </label>
                                );
                              })}
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                              {servicioForm.destinos_activos.length} de {servicioUnico.destinos.length} destinos activos
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="sticky bottom-0 flex justify-end gap-3 p-4 border-t bg-white dark:bg-slate-800">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border rounded hover:bg-gray-50 dark:hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                onClick={guardarConsorcio}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
              >
                <Save className="h-4 w-4" />
                {editingConsorcio ? 'Guardar Cambios' : 'Crear Consorcio'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
