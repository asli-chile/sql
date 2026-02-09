'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { createClient } from '@/lib/supabase-browser';
import { Plus, Trash2, Save, Edit2, X, Check } from 'lucide-react';

type ServicioNave = {
  id?: string;
  nave_nombre: string;
  activo: boolean;
  orden: number;
};

type ServicioEscala = {
  id?: string;
  puerto: string;
  puerto_nombre: string | null;
  area: string;
  orden: number;
  activo: boolean;
};

type Servicio = {
  id: string;
  nombre: string;
  consorcio: string | null;
  descripcion: string | null;
  activo: boolean;
  naves: ServicioNave[];
  escalas?: ServicioEscala[];
  created_at?: string;
  updated_at?: string;
};

interface ServiciosManagerProps {
  onServicioChange?: (servicioId: string | null) => void;
  selectedServicioId?: string | null;
  onServicioCreated?: () => void; // Callback cuando se crea/actualiza un servicio
}

export function ServiciosManager({ onServicioChange, selectedServicioId, onServicioCreated }: ServiciosManagerProps) {
  const { theme } = useTheme();
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [navieras, setNavieras] = useState<string[]>([]);
  
  // Estado para crear/editar servicio
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingServicio, setEditingServicio] = useState<Servicio | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    navierasSeleccionadas: [] as string[], // Array de navieras seleccionadas
    descripcion: '',
    naves: [] as string[],
    escalas: [] as Array<{ puerto: string; puerto_nombre: string; area: string; orden: number }>,
  });
  const [naveInput, setNaveInput] = useState('');
  const [pods, setPods] = useState<string[]>([]);
  const [escalaForm, setEscalaForm] = useState({
    puerto: '',
    puerto_nombre: '',
    area: 'ASIA',
    esNuevoPod: false, // Flag para saber si estamos creando un POD nuevo
  });

  // Cargar servicios
  const cargarServicios = async () => {
    try {
      setLoading(true);
      setError(null);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const response = await fetch(`${apiUrl}/api/admin/servicios`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || 'Error al cargar servicios');
      }

      // Filtrar solo servicios activos para mostrar (los eliminados aparecen como inactivos)
      const serviciosActivos = (result.servicios || []).filter((s: Servicio) => s.activo === true);
      setServicios(serviciosActivos);
    } catch (err: any) {
      setError(err?.message || 'Error al cargar servicios');
    } finally {
      setLoading(false);
    }
  };

  // Cargar navieras y PODs disponibles
  const cargarNavieras = async () => {
    try {
      const supabase = createClient();
      const { data: navierasData, error: navierasError } = await supabase
        .from('catalogos_navieras')
        .select('nombre')
        .eq('activo', true)
        .order('nombre');

      if (!navierasError && navierasData) {
        const navierasList = navierasData.map((n: any) => n.nombre).filter(Boolean);
        setNavieras(navierasList);
      }

      // Cargar PODs desde catalogos_destinos
      const { data: destinosData, error: destinosError } = await supabase
        .from('catalogos_destinos')
        .select('nombre')
        .eq('activo', true)
        .order('nombre');

      if (!destinosError && destinosData) {
        const podsList = destinosData.map((d: any) => d.nombre).filter(Boolean);
        setPods(podsList);
      }
    } catch (err) {
      console.error('Error cargando navieras/PODs:', err);
    }
  };

  useEffect(() => {
    void cargarServicios();
    void cargarNavieras();
  }, []);

  // Función para parsear consorcio y obtener navieras seleccionadas
  const parsearConsorcio = (consorcio: string | null): string[] => {
    if (!consorcio) return [];
    // Formato esperado: "MSC + Hapag + ONE" o "MSC+Hapag+ONE"
    return consorcio
      .split('+')
      .map(n => n.trim())
      .filter(n => n.length > 0);
  };

  // Abrir modal para crear nuevo servicio
  const abrirModalCrear = () => {
    setEditingServicio(null);
    setFormData({
      nombre: '',
      navierasSeleccionadas: [],
      descripcion: '',
      naves: [],
      escalas: [],
    });
    setNaveInput('');
    setEscalaForm({ puerto: '', puerto_nombre: '', area: 'ASIA', esNuevoPod: false });
    setIsModalOpen(true);
  };

  // Abrir modal para editar servicio
  const abrirModalEditar = (servicio: Servicio) => {
    setEditingServicio(servicio);
    const navierasDelConsorcio = parsearConsorcio(servicio.consorcio);
    setFormData({
      nombre: servicio.nombre,
      navierasSeleccionadas: navierasDelConsorcio,
      descripcion: servicio.descripcion || '',
      naves: servicio.naves.map(n => n.nave_nombre),
      escalas: (servicio.escalas || [])
        .filter(e => e.activo)
        .sort((a, b) => a.orden - b.orden)
        .map(e => ({
          puerto: e.puerto,
          puerto_nombre: e.puerto_nombre || e.puerto,
          area: e.area,
          orden: e.orden,
        })),
    });
    setNaveInput('');
    setEscalaForm({ puerto: '', puerto_nombre: '', area: 'ASIA', esNuevoPod: false });
    setIsModalOpen(true);
  };

  // Agregar nave al formulario
  const agregarNave = () => {
    if (naveInput.trim() && !formData.naves.includes(naveInput.trim())) {
      setFormData({
        ...formData,
        naves: [...formData.naves, naveInput.trim()],
      });
      setNaveInput('');
    }
  };

  // Eliminar nave del formulario
  const eliminarNave = (index: number) => {
    setFormData({
      ...formData,
      naves: formData.naves.filter((_, i) => i !== index),
    });
  };

  // Agregar escala al formulario y POD a la base de datos si es nuevo
  const agregarEscala = async () => {
    if (escalaForm.puerto.trim()) {
      const puertoNombre = escalaForm.puerto_nombre.trim() || escalaForm.puerto.trim();
      const puertoCodigo = escalaForm.puerto.trim();

      // Si es un POD nuevo (no está en la lista), agregarlo a catalogos_destinos
      const esPodNuevo = !pods.includes(puertoCodigo);
      
      if (esPodNuevo) {
        try {
          const supabase = createClient();
          
          // Verificar si el POD ya existe en la base de datos
          const { data: existingPod, error: checkError } = await supabase
            .from('catalogos_destinos')
            .select('id')
            .eq('nombre', puertoCodigo)
            .maybeSingle();

          if (checkError) {
            console.error('Error verificando POD existente:', checkError);
            // Continuar intentando insertar
          }

          if (!existingPod) {
            // Insertar el nuevo POD en catalogos_destinos
            const { error: insertError } = await supabase
              .from('catalogos_destinos')
              .insert({
                nombre: puertoCodigo,
                activo: true,
              });

            if (insertError) {
              console.error('Error insertando nuevo POD:', insertError);
              setError(`Error al agregar el POD "${puertoCodigo}" a la base de datos: ${insertError.message}`);
              return;
            }

            // Recargar la lista de PODs después de agregar uno nuevo
            await cargarNavieras();
            setSuccess(`POD "${puertoCodigo}" agregado exitosamente a la base de datos.`);
          }
        } catch (err: any) {
          console.error('Error agregando POD:', err);
          setError(`Error al agregar el POD: ${err?.message || 'Error desconocido'}`);
          return;
        }
      }

      // Agregar la escala al formulario
      const nuevaEscala = {
        puerto: puertoCodigo,
        puerto_nombre: puertoNombre,
        area: escalaForm.area,
        orden: formData.escalas.length + 1,
      };
      setFormData({
        ...formData,
        escalas: [...formData.escalas, nuevaEscala],
      });
      setEscalaForm({ puerto: '', puerto_nombre: '', area: 'ASIA', esNuevoPod: false });
    }
  };

  // Eliminar escala del formulario
  const eliminarEscala = (index: number) => {
    setFormData({
      ...formData,
      escalas: formData.escalas.filter((_, i) => i !== index).map((e, i) => ({ ...e, orden: i + 1 })),
    });
  };

  // Actualizar escala en el formulario
  const actualizarEscala = (index: number, campo: string, valor: string) => {
    const nuevasEscalas = [...formData.escalas];
    nuevasEscalas[index] = { ...nuevasEscalas[index], [campo]: valor };
    setFormData({ ...formData, escalas: nuevasEscalas });
  };

  // Guardar servicio (crear o actualizar)
  const guardarServicio = async () => {
    try {
      setError(null);
      setSuccess(null);

      if (!formData.nombre.trim()) {
        setError('El nombre del servicio es requerido');
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const url = editingServicio
        ? `${apiUrl}/api/admin/servicios`
        : `${apiUrl}/api/admin/servicios`;
      
      // Formatear consorcio desde navieras seleccionadas
      const consorcioTexto = formData.navierasSeleccionadas.length > 0
        ? formData.navierasSeleccionadas.join(' + ')
        : null;

      const method = editingServicio ? 'PUT' : 'POST';
      const body = editingServicio
        ? {
            id: editingServicio.id,
            nombre: formData.nombre.trim(),
            consorcio: consorcioTexto,
            descripcion: formData.descripcion.trim() || null,
            naves: formData.naves.map((nave, index) => ({
              nave_nombre: nave,
              activo: true,
              orden: index + 1,
            })),
            escalas: formData.escalas.map((escala, index) => ({
              puerto: escala.puerto,
              puerto_nombre: escala.puerto_nombre,
              area: escala.area,
              orden: escala.orden || index + 1,
            })),
          }
        : {
            nombre: formData.nombre.trim(),
            consorcio: consorcioTexto,
            descripcion: formData.descripcion.trim() || null,
            naves: formData.naves,
            escalas: formData.escalas.map((escala, index) => ({
              puerto: escala.puerto,
              puerto_nombre: escala.puerto_nombre,
              area: escala.area,
              orden: escala.orden || index + 1,
            })),
          };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || 'Error al guardar servicio');
      }

      setSuccess(editingServicio ? 'Servicio actualizado exitosamente' : 'Servicio creado exitosamente');
      setIsModalOpen(false);
      
      // Recargar servicios primero
      await cargarServicios();
      
      // Notificar al componente padre que se creó/actualizó un servicio
      if (onServicioCreated) {
        onServicioCreated();
      }
      
      // Si hay callback, notificar el cambio de selección
      if (onServicioChange && result.servicio) {
        onServicioChange(result.servicio.id);
      }
    } catch (err: any) {
      setError(err?.message || 'Error al guardar servicio');
    }
  };

  // Eliminar servicio (marcar como inactivo)
  const eliminarServicio = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este servicio?')) {
      return;
    }

    try {
      setError(null);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const response = await fetch(`${apiUrl}/api/admin/servicios?id=${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || 'Error al eliminar servicio');
      }

      setSuccess('Servicio eliminado exitosamente');
      await cargarServicios();
      
      // Notificar al componente padre que se eliminó un servicio
      if (onServicioCreated) {
        onServicioCreated();
      }
    } catch (err: any) {
      setError(err?.message || 'Error al eliminar servicio');
    }
  };

  const inputTone = theme === 'dark'
    ? 'bg-slate-900/60 border-slate-700/70 text-slate-100 placeholder:text-slate-500 focus:border-sky-500/60 focus:ring-sky-500/30'
    : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-blue-500/60 focus:ring-blue-500/30';

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-12 border ${theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
        <div className="flex items-center gap-2">
          <div className={`h-5 w-5 animate-spin rounded-full border-2 ${theme === 'dark' ? 'border-sky-500 border-t-transparent' : 'border-blue-500 border-t-transparent'}`} />
          <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>Cargando servicios...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mensajes de error/éxito */}
      {error && (
        <div className={`border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-500 ${theme === 'dark' ? 'bg-red-500/10 border-red-500/40' : 'bg-red-50 border-red-200'}`}>
          {error}
        </div>
      )}
      {success && (
        <div className={`border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-500 ${theme === 'dark' ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-emerald-50 border-emerald-200'}`}>
          {success}
        </div>
      )}

      {/* Botón para crear nuevo servicio */}
      <div className="flex justify-between items-center">
        <h3 className={`text-sm font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
          Servicios
        </h3>
        <button
          onClick={abrirModalCrear}
          className={`flex items-center gap-2 border px-3 py-1.5 text-xs font-semibold transition ${theme === 'dark'
            ? 'border-[#00AEEF]/60 bg-[#00AEEF]/20 text-[#00AEEF] hover:bg-[#00AEEF]/30 hover:border-[#00AEEF]'
            : 'border-[#00AEEF] bg-[#00AEEF] text-white hover:bg-[#0099D6]'
          }`}
        >
          <Plus className="h-3 w-3" />
          Nuevo Servicio
        </button>
      </div>

      {/* Lista de servicios */}
      <div className="space-y-3">
        {servicios.length === 0 ? (
          <div className={`flex items-center justify-center py-12 border ${theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
            <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
              No hay servicios creados. Crea uno nuevo para comenzar.
            </p>
          </div>
        ) : (
          servicios.map((servicio) => (
            <div
              key={servicio.id}
              className={`border p-4 transition ${theme === 'dark' 
                ? 'border-slate-700 bg-slate-800 hover:border-slate-600' 
                : 'border-gray-200 bg-white hover:border-gray-300'
              } ${selectedServicioId === servicio.id ? 'ring-2 ring-[#00AEEF] border-[#00AEEF]' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {servicio.nombre}
                    </h4>
                    {!servicio.activo && (
                      <span className={`text-xs px-2 py-0.5 border ${theme === 'dark'
                        ? 'bg-red-500/20 text-red-400 border-red-500/40'
                        : 'bg-red-50 text-red-600 border-red-200'
                      }`}>
                        Inactivo
                      </span>
                    )}
                  </div>
                  {servicio.consorcio && (
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'} mt-1`}>
                      Consorcio: {servicio.consorcio}
                    </p>
                  )}
                  {servicio.descripcion && (
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'} mt-1`}>
                      {servicio.descripcion}
                    </p>
                  )}
                  <div className="mt-3 space-y-3">
                    <div>
                      <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                        Naves ({servicio.naves.filter(n => n.activo).length}):
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {servicio.naves
                          .filter(n => n.activo)
                          .sort((a, b) => a.orden - b.orden)
                          .map((nave, index) => (
                            <span
                              key={index}
                              className={`text-xs px-2 py-1 border ${theme === 'dark'
                                ? 'bg-slate-900 border-slate-700 text-slate-300'
                                : 'bg-gray-50 border-gray-300 text-gray-700'
                              }`}
                            >
                              {nave.nave_nombre}
                            </span>
                          ))}
                      </div>
                    </div>
                    {servicio.escalas && servicio.escalas.filter(e => e.activo).length > 0 && (
                      <div>
                        <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                          Escalas ({servicio.escalas.filter(e => e.activo).length}):
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {servicio.escalas
                            .filter(e => e.activo)
                            .sort((a, b) => a.orden - b.orden)
                            .map((escala, index) => (
                              <span
                                key={index}
                                className={`text-xs px-2 py-1 border ${theme === 'dark'
                                  ? 'bg-slate-900 border-slate-700 text-slate-300'
                                  : 'bg-gray-50 border-gray-300 text-gray-700'
                                }`}
                                title={`${escala.puerto_nombre || escala.puerto} - ${escala.area}`}
                              >
                                {escala.puerto_nombre || escala.puerto}
                              </span>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => abrirModalEditar(servicio)}
                    className={`p-2 border transition ${theme === 'dark'
                      ? 'border-slate-700 text-slate-300 hover:border-sky-500/60 hover:text-sky-200 hover:bg-slate-700'
                      : 'border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-700 hover:bg-gray-50'
                    }`}
                    title="Editar servicio"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => eliminarServicio(servicio.id)}
                    className={`p-2 border transition ${theme === 'dark'
                      ? 'border-slate-700 text-slate-300 hover:border-red-500/60 hover:text-red-400 hover:bg-slate-700'
                      : 'border-gray-300 text-gray-600 hover:border-red-400 hover:text-red-600 hover:bg-gray-50'
                    }`}
                    title="Eliminar servicio"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal para crear/editar servicio */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div 
            className={`relative w-full max-w-3xl max-h-[90vh] overflow-hidden border shadow-2xl ${theme === 'dark'
              ? 'bg-slate-800 border-slate-700'
              : 'bg-white border-gray-200'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`flex items-center justify-between px-6 py-4 border-b ${theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-gray-50'}`}>
              <div>
                <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {editingServicio ? 'Editar Servicio' : 'Nuevo Servicio'}
                </h2>
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                  {editingServicio ? 'Modifica la información del servicio' : 'Completa la información del nuevo servicio'}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className={`inline-flex h-9 w-9 items-center justify-center border transition ${theme === 'dark'
                  ? 'border-slate-700 text-slate-300 hover:border-sky-500/60 hover:text-sky-200 hover:bg-slate-700'
                  : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400 hover:text-gray-900 hover:bg-gray-100'
                }`}
                title="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Contenido */}
            <div className="overflow-y-auto max-h-[calc(90vh-10rem)] p-6">
              <div className="space-y-6">
                <label className={`block text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                  Nombre del Servicio *
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className={`mt-2 w-full border px-3 py-2 text-sm outline-none focus:ring-2 ${inputTone}`}
                    placeholder="Ej: AX2/AN2, ANDES EXPRESS"
                    required
                  />
                </label>

                <label className={`block text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                  Consorcio (Navieras)
                  <div className="mt-2 space-y-2">
                    <div className={`border p-3 min-h-[100px] max-h-[200px] overflow-y-auto ${theme === 'dark' ? 'border-slate-700 bg-slate-900' : 'border-gray-300 bg-gray-50'}`}>
                      {navieras.length === 0 ? (
                        <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                          Cargando navieras...
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {navieras.map((naviera) => (
                            <label
                              key={naviera}
                              className={`flex items-center gap-2 p-2 cursor-pointer rounded transition ${theme === 'dark'
                                ? 'hover:bg-slate-800'
                                : 'hover:bg-gray-100'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={formData.navierasSeleccionadas.includes(naviera)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFormData({
                                      ...formData,
                                      navierasSeleccionadas: [...formData.navierasSeleccionadas, naviera],
                                    });
                                  } else {
                                    setFormData({
                                      ...formData,
                                      navierasSeleccionadas: formData.navierasSeleccionadas.filter(n => n !== naviera),
                                    });
                                  }
                                }}
                                className={`w-4 h-4 ${theme === 'dark'
                                  ? 'accent-sky-500'
                                  : 'accent-blue-500'
                                }`}
                              />
                              <span className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                                {naviera}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                    {formData.navierasSeleccionadas.length > 0 && (
                      <div className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                        Seleccionadas: {formData.navierasSeleccionadas.join(' + ')}
                      </div>
                    )}
                  </div>
                </label>

                <label className={`block text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                  Descripción
                  <textarea
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    className={`mt-2 w-full border px-3 py-2 text-sm outline-none focus:ring-2 ${inputTone}`}
                    placeholder="Descripción del servicio"
                    rows={3}
                  />
                </label>

                <div className={`border-t pt-6 ${theme === 'dark' ? 'border-slate-700' : 'border-gray-200'}`}>
                  <label className={`block text-xs font-semibold uppercase tracking-wide mb-3 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                    Naves Asignadas
                  </label>
                  
                  {/* Input para agregar nave */}
                  <div className="flex gap-2 mb-4">
                    <input
                      type="text"
                      value={naveInput}
                      onChange={(e) => setNaveInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          agregarNave();
                        }
                      }}
                      className={`flex-1 border px-3 py-2 text-sm outline-none focus:ring-2 ${inputTone}`}
                      placeholder="Nombre de la nave"
                    />
                    <button
                      type="button"
                      onClick={agregarNave}
                      className={`px-4 py-2 border transition ${theme === 'dark'
                        ? 'border-[#00AEEF]/60 bg-[#00AEEF]/20 text-[#00AEEF] hover:bg-[#00AEEF]/30'
                        : 'border-[#00AEEF] bg-[#00AEEF] text-white hover:bg-[#0099D6]'
                      }`}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Lista de naves */}
                  {formData.naves.length > 0 ? (
                    <div className="space-y-2">
                      {formData.naves.map((nave, index) => (
                        <div
                          key={index}
                          className={`flex items-center justify-between p-3 border ${theme === 'dark' 
                            ? 'border-slate-700 bg-slate-900' 
                            : 'border-gray-300 bg-gray-50'
                          }`}
                        >
                          <span className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                            {index + 1}. {nave}
                          </span>
                          <button
                            type="button"
                            onClick={() => eliminarNave(index)}
                            className={`p-1.5 border transition ${theme === 'dark'
                              ? 'border-slate-700 text-slate-300 hover:border-red-500/60 hover:text-red-400 hover:bg-slate-700'
                              : 'border-gray-300 text-gray-600 hover:border-red-400 hover:text-red-600 hover:bg-gray-100'
                            }`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={`flex items-center justify-center py-8 border ${theme === 'dark' 
                      ? 'border-slate-700 bg-slate-900' 
                      : 'border-gray-200 bg-gray-50'
                    }`}>
                      <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                        No hay naves asignadas. Agrega naves usando el campo de arriba.
                      </p>
                    </div>
                  )}
                </div>

                {/* Sección de Escalas */}
                <div className={`border-t pt-6 ${theme === 'dark' ? 'border-slate-700' : 'border-gray-200'}`}>
                  <label className={`block text-xs font-semibold uppercase tracking-wide mb-3 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                    Puertos de Escalada (PODs)
                  </label>
                  
                  {/* Formulario para agregar escala */}
                  <div className="grid gap-2 mb-4 sm:grid-cols-3">
                    <select
                      value={escalaForm.esNuevoPod ? '__nuevo__' : (escalaForm.puerto || '')}
                      onChange={(e) => {
                        const podSeleccionado = e.target.value;
                        if (podSeleccionado === '__nuevo__') {
                          setEscalaForm({ ...escalaForm, puerto: '', puerto_nombre: '', esNuevoPod: true });
                        } else if (podSeleccionado === '') {
                          setEscalaForm({ ...escalaForm, puerto: '', puerto_nombre: '', esNuevoPod: false });
                        } else {
                          setEscalaForm({ 
                            ...escalaForm, 
                            puerto: podSeleccionado,
                            puerto_nombre: podSeleccionado,
                            esNuevoPod: false
                          });
                        }
                      }}
                      className={`border px-3 py-2 text-sm outline-none focus:ring-2 ${inputTone}`}
                    >
                      <option value="">Selecciona POD</option>
                      {pods.map(pod => (
                        <option key={pod} value={pod}>{pod}</option>
                      ))}
                      <option value="__nuevo__">+ Nuevo POD</option>
                    </select>
                    
                    {escalaForm.esNuevoPod ? (
                      <input
                        type="text"
                        value={escalaForm.puerto_nombre || ''}
                        onChange={(e) => setEscalaForm({ ...escalaForm, puerto: e.target.value, puerto_nombre: e.target.value })}
                        className={`border px-3 py-2 text-sm outline-none focus:ring-2 ${inputTone}`}
                        placeholder="Escribe el nuevo POD"
                        autoFocus
                      />
                    ) : escalaForm.puerto ? (
                      <input
                        type="text"
                        value={escalaForm.puerto_nombre || ''}
                        onChange={(e) => setEscalaForm({ ...escalaForm, puerto_nombre: e.target.value })}
                        className={`border px-3 py-2 text-sm outline-none focus:ring-2 ${inputTone}`}
                        placeholder="Nombre del puerto (opcional)"
                      />
                    ) : (
                      <input
                        type="text"
                        value=""
                        disabled
                        className={`border px-3 py-2 text-sm outline-none ${inputTone} opacity-50`}
                        placeholder="Selecciona POD primero"
                      />
                    )}
                    
                    <div className="flex gap-2">
                      <select
                        value={escalaForm.area}
                        onChange={(e) => setEscalaForm({ ...escalaForm, area: e.target.value })}
                        className={`flex-1 border px-3 py-2 text-sm outline-none focus:ring-2 ${inputTone}`}
                      >
                        <option value="ASIA">ASIA</option>
                        <option value="EUROPA">EUROPA</option>
                        <option value="AMERICA">AMERICA</option>
                        <option value="INDIA-MEDIOORIENTE">INDIA-MEDIOORIENTE</option>
                      </select>
                      <button
                        type="button"
                        onClick={agregarEscala}
                        disabled={!escalaForm.puerto.trim()}
                        className={`px-4 py-2 border transition ${theme === 'dark'
                          ? 'border-[#00AEEF]/60 bg-[#00AEEF]/20 text-[#00AEEF] hover:bg-[#00AEEF]/30 disabled:opacity-50'
                          : 'border-[#00AEEF] bg-[#00AEEF] text-white hover:bg-[#0099D6] disabled:opacity-50'
                        }`}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Lista de escalas */}
                  {formData.escalas.length > 0 ? (
                    <div className="space-y-2">
                      {formData.escalas.map((escala, index) => (
                        <div
                          key={index}
                          className={`flex items-center justify-between p-3 border ${theme === 'dark' 
                            ? 'border-slate-700 bg-slate-900' 
                            : 'border-gray-300 bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <span className={`text-xs font-semibold ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                              {index + 1}.
                            </span>
                            <div className="flex-1">
                              <span className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                                {escala.puerto_nombre || escala.puerto}
                              </span>
                              <span className={`text-xs ml-2 px-2 py-0.5 border ${theme === 'dark'
                                ? 'bg-slate-800 border-slate-600 text-slate-400'
                                : 'bg-gray-100 border-gray-300 text-gray-600'
                              }`}>
                                {escala.area}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => eliminarEscala(index)}
                            className={`p-1.5 border transition ${theme === 'dark'
                              ? 'border-slate-700 text-slate-300 hover:border-red-500/60 hover:text-red-400 hover:bg-slate-700'
                              : 'border-gray-300 text-gray-600 hover:border-red-400 hover:text-red-600 hover:bg-gray-100'
                            }`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={`flex items-center justify-center py-8 border ${theme === 'dark' 
                      ? 'border-slate-700 bg-slate-900' 
                      : 'border-gray-200 bg-gray-50'
                    }`}>
                      <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                        No hay puertos de escalada definidos. Agrega puertos usando el formulario de arriba.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className={`flex items-center justify-end gap-3 px-6 py-4 border-t ${theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-gray-50'}`}>
              <button
                onClick={() => setIsModalOpen(false)}
                className={`px-4 py-2 border transition ${theme === 'dark'
                  ? 'border-slate-700 text-slate-300 hover:bg-slate-700 hover:border-slate-600'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-100 hover:border-gray-400'
                }`}
              >
                Cancelar
              </button>
              <button
                onClick={guardarServicio}
                className={`flex items-center gap-2 px-4 py-2 border transition ${theme === 'dark'
                  ? 'bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 text-white'
                  : 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white'
                }`}
              >
                <Save className="h-4 w-4" />
                {editingServicio ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
