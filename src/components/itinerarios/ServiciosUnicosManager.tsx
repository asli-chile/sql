'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { createClient } from '@/lib/supabase-browser';
import { Plus, Trash2, Save, Edit2, X } from 'lucide-react';
import type { ServicioUnico, ServicioUnicoFormData } from '@/types/servicios';

interface ServiciosUnicosManagerProps {
  onServicioCreated?: () => void;
}

export function ServiciosUnicosManager({ onServicioCreated }: ServiciosUnicosManagerProps) {
  const { theme } = useTheme();
  const [servicios, setServicios] = useState<ServicioUnico[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [navieras, setNavieras] = useState<Array<{ id: string; nombre: string }>>([]);
  const [navesDisponibles, setNavesDisponibles] = useState<string[]>([]);
  const [pods, setPods] = useState<string[]>([]);
  const [pols, setPols] = useState<string[]>([]); // POLs desde catalogos
  
  // Estado para crear/editar servicio único
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingServicio, setEditingServicio] = useState<ServicioUnico | null>(null);
  const [formData, setFormData] = useState<ServicioUnicoFormData>({
    nombre: '',
    naviera_id: '',
    descripcion: '',
    puerto_origen: '',
    naves: [],
    destinos: [],
  });
  const [naveInput, setNaveInput] = useState('');
  const [naveInputTexto, setNaveInputTexto] = useState(''); // Para agregar naves nuevas
  const [polInputTexto, setPolInputTexto] = useState(''); // Para agregar POLs nuevos
  const [escalaForm, setEscalaForm] = useState({
    puerto: '',
    puerto_nombre: '',
    area: 'ASIA',
    esNuevoPod: false,
  });
  const [puertoInputTexto, setPuertoInputTexto] = useState(''); // Para agregar destinos nuevos

  // Cargar servicios únicos
  const cargarServicios = async () => {
    try {
      setLoading(true);
      setError(null);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const response = await fetch(`${apiUrl}/api/admin/servicios-unicos`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || 'Error al cargar servicios únicos');
      }

      setServicios(result.servicios || []);
    } catch (err: any) {
      setError(err?.message || 'Error al cargar servicios únicos');
    } finally {
      setLoading(false);
    }
  };

  // Cargar navieras, naves y PODs
  const cargarCatalogos = async () => {
    try {
      const supabase = createClient();
      
      // Cargar navieras con ID
      const { data: navierasData } = await supabase
        .from('catalogos_navieras')
        .select('id, nombre')
        .eq('activo', true)
        .order('nombre');

      if (navierasData) {
        setNavieras(navierasData);
      }

      // Cargar naves
      const { data: navesData } = await supabase
        .from('catalogos_naves')
        .select('nombre')
        .eq('activo', true)
        .order('nombre');

      if (navesData) {
        setNavesDisponibles([...new Set(navesData.map((n: any) => n.nombre).filter(Boolean))].sort());
      }

      // Cargar PODs
      const { data: destinosData } = await supabase
        .from('catalogos_destinos')
        .select('nombre')
        .eq('activo', true)
        .order('nombre');

      if (destinosData) {
        setPods(destinosData.map((d: any) => d.nombre).filter(Boolean));
      }

      // Cargar POLs desde catalogos
      const { data: polsData } = await supabase
        .from('catalogos')
        .select('valores')
        .eq('categoria', 'pols')
        .single();

      if (polsData && polsData.valores) {
        const valoresPols = Array.isArray(polsData.valores) 
          ? polsData.valores 
          : typeof polsData.valores === 'string' 
            ? JSON.parse(polsData.valores) 
            : [];
        setPols(valoresPols.filter(Boolean).sort());
      }
    } catch (err) {
      console.error('Error cargando catálogos:', err);
    }
  };

  useEffect(() => {
    void cargarServicios();
    void cargarCatalogos();
  }, []);

  // Abrir modal para crear
  const abrirModalCrear = () => {
    setEditingServicio(null);
    setFormData({
      nombre: '',
      naviera_id: '',
      descripcion: '',
      puerto_origen: '',
      naves: [],
      destinos: [],
    });
    setNaveInput('');
    setNaveInputTexto('');
    setPolInputTexto('');
    setPuertoInputTexto('');
    setEscalaForm({ puerto: '', puerto_nombre: '', area: 'ASIA', esNuevoPod: false });
    setIsModalOpen(true);
  };

  // Abrir modal para editar
  const abrirModalEditar = (servicio: ServicioUnico) => {
    setEditingServicio(servicio);
    setFormData({
      nombre: servicio.nombre,
      naviera_id: servicio.naviera_id,
      descripcion: servicio.descripcion || '',
      puerto_origen: servicio.puerto_origen || '',
      naves: servicio.naves?.map(n => n.nave_nombre) || [],
      destinos: servicio.destinos?.map(d => ({
        puerto: d.puerto,
        puerto_nombre: d.puerto_nombre || '',
        area: d.area,
        orden: d.orden,
      })) || [],
    });
    setNaveInput('');
    setNaveInputTexto('');
    setPolInputTexto('');
    setPuertoInputTexto('');
    setEscalaForm({ puerto: '', puerto_nombre: '', area: 'ASIA', esNuevoPod: false });
    setIsModalOpen(true);
  };

  // Agregar nave
  const agregarNave = () => {
    const naveNombre = naveInput.trim() || naveInputTexto.trim();
    if (naveNombre && !formData.naves.includes(naveNombre)) {
      setFormData({
        ...formData,
        naves: [...formData.naves, naveNombre],
      });
      setNaveInput('');
      setNaveInputTexto('');
    }
  };

  // Eliminar nave
  const eliminarNave = (nave: string) => {
    setFormData({
      ...formData,
      naves: formData.naves.filter(n => n !== nave),
    });
  };

  // Agregar destino
  const agregarDestino = () => {
    const puertoNombre = escalaForm.puerto.trim() || puertoInputTexto.trim();
    if (puertoNombre) {
      const nuevoDestino = {
        puerto: puertoNombre,
        puerto_nombre: escalaForm.puerto_nombre.trim() || null,
        area: escalaForm.area,
        orden: formData.destinos.length,
      };
      setFormData({
        ...formData,
        destinos: [...formData.destinos, nuevoDestino],
      });
      setEscalaForm({ puerto: '', puerto_nombre: '', area: 'ASIA', esNuevoPod: false });
      setPuertoInputTexto('');
    }
  };

  // Eliminar destino
  const eliminarDestino = (index: number) => {
    const nuevosDestinos = formData.destinos.filter((_, i) => i !== index);
    // Reordenar
    const destinosReordenados = nuevosDestinos.map((d, i) => ({ ...d, orden: i }));
    setFormData({
      ...formData,
      destinos: destinosReordenados,
    });
  };

  // Agregar nuevo POL al catálogo
  const agregarNuevoPol = async (nuevoPol: string) => {
    try {
      const supabase = createClient();
      
      // Obtener el catálogo actual de POLs
      const { data: polsData } = await supabase
        .from('catalogos')
        .select('valores, id')
        .eq('categoria', 'pols')
        .single();

      let nuevosValores: string[] = [];
      
      if (polsData) {
        // Actualizar catálogo existente
        const valoresActuales = Array.isArray(polsData.valores) 
          ? polsData.valores 
          : typeof polsData.valores === 'string' 
            ? JSON.parse(polsData.valores) 
            : [];
        
        if (!valoresActuales.includes(nuevoPol)) {
          nuevosValores = [...valoresActuales, nuevoPol].sort();
          
          const { error: updateError } = await supabase
            .from('catalogos')
            .update({ valores: nuevosValores })
            .eq('id', polsData.id);

          if (updateError) {
            throw updateError;
          }
        } else {
          nuevosValores = valoresActuales;
        }
      } else {
        // Crear nuevo catálogo
        nuevosValores = [nuevoPol];
        
        const { error: insertError } = await supabase
          .from('catalogos')
          .insert({
            categoria: 'pols',
            valores: nuevosValores,
          });

        if (insertError) {
          throw insertError;
        }
      }

      // Actualizar estado local
      setPols(nuevosValores);
      setFormData({ ...formData, puerto_origen: nuevoPol });
      setPolInputTexto('');
      setSuccess(`POL "${nuevoPol}" agregado al catálogo`);
    } catch (err: any) {
      console.error('Error agregando POL:', err);
      setError(`Error al agregar POL: ${err?.message || 'Error desconocido'}`);
    }
  };

  // Guardar servicio único
  const guardarServicio = async () => {
    try {
      setError(null);
      setSuccess(null);

      // Validaciones
      if (!formData.nombre.trim()) {
        setError('El nombre del servicio es requerido');
        return;
      }

      if (!formData.naviera_id) {
        setError('Debe seleccionar una naviera');
        return;
      }

      if (formData.naves.length === 0) {
        setError('Debe asignar al menos una nave');
        return;
      }

      if (!formData.puerto_origen.trim()) {
        setError('El puerto de origen es requerido');
        return;
      }

      if (formData.destinos.length === 0) {
        setError('Debe asignar al menos un destino');
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const url = `${apiUrl}/api/admin/servicios-unicos`;
      const method = editingServicio ? 'PUT' : 'POST';

      const payload = editingServicio ? { id: editingServicio.id, ...formData } : formData;
      console.log('📤 Enviando payload al guardar servicio único:', JSON.stringify(payload, null, 2));

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMessage = result?.error || 'Error al guardar el servicio';
        const errorDetails = result?.details ? `\nDetalles: ${result.details}` : '';
        throw new Error(`${errorMessage}${errorDetails}`);
      }

      setSuccess(editingServicio ? 'Servicio actualizado correctamente' : 'Servicio creado correctamente');
      setIsModalOpen(false);
      void cargarServicios();
      if (onServicioCreated) {
        onServicioCreated();
      }
    } catch (err: any) {
      setError(err?.message || 'Error al guardar el servicio');
    }
  };

  // Eliminar servicio único
  const eliminarServicio = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este servicio único?')) {
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const response = await fetch(`${apiUrl}/api/admin/servicios-unicos?id=${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || 'Error al eliminar el servicio');
      }

      setSuccess('Servicio eliminado correctamente');
      void cargarServicios();
      if (onServicioCreated) {
        onServicioCreated();
      }
    } catch (err: any) {
      setError(err?.message || 'Error al eliminar el servicio');
    }
  };

  const inputTone = theme === 'dark'
    ? 'bg-slate-800 border-slate-600 text-slate-100 focus:ring-sky-500'
    : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500';

  if (loading) {
    return <div className="p-4 text-center">Cargando servicios únicos...</div>;
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
        <h2 className="text-lg font-bold">Servicios Únicos</h2>
        <button
          onClick={abrirModalCrear}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition"
        >
          <Plus className="h-4 w-4" />
          Nuevo Servicio Único
        </button>
      </div>

      {/* Lista de servicios */}
      {servicios.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          No hay servicios únicos creados
        </div>
      ) : (
        <div className="space-y-2">
          {servicios.map((servicio) => (
            <div
              key={servicio.id}
              className={`p-4 border rounded ${theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-gray-300 bg-white'}`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold">{servicio.nombre}</h3>
                  <p className="text-sm text-gray-500">
                    Naviera: {servicio.naviera_nombre || 'N/A'}
                  </p>
                  {servicio.puerto_origen && (
                    <p className="text-sm text-gray-500">
                      Puerto de Origen: {servicio.puerto_origen}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    Naves: {servicio.naves?.length || 0} | Destinos: {servicio.destinos?.length || 0}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => abrirModalEditar(servicio)}
                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => eliminarServicio(servicio.id)}
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
          <div className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} rounded-lg shadow-xl`}>
            <div className="sticky top-0 flex justify-between items-center p-4 border-b">
              <div>
                <h3 className="text-lg font-bold">
                  {editingServicio ? 'Editar Servicio Único' : 'Nuevo Servicio Único'}
                </h3>
                <p className="text-sm text-gray-500">
                  {editingServicio ? 'Modifica la información del servicio' : 'Completa la información del nuevo servicio único'}
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
                <span className="text-xs font-semibold uppercase tracking-wide">Nombre del Servicio *</span>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className={`mt-1 w-full border px-3 py-2 text-sm outline-none focus:ring-2 ${inputTone}`}
                  placeholder="Ej: INCA, AX1, AN1"
                  required
                />
              </label>

              {/* Naviera */}
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide">Naviera *</span>
                <select
                  value={formData.naviera_id}
                  onChange={(e) => setFormData({ ...formData, naviera_id: e.target.value })}
                  className={`mt-1 w-full border px-3 py-2 text-sm outline-none focus:ring-2 ${inputTone}`}
                  required
                >
                  <option value="">Seleccionar naviera</option>
                  {navieras.map((naviera) => (
                    <option key={naviera.id} value={naviera.id}>
                      {naviera.nombre}
                    </option>
                  ))}
                </select>
              </label>

              {/* Puerto de Origen */}
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide">Puerto de Origen *</span>
                <div className="mt-1 space-y-2">
                  <select
                    value={formData.puerto_origen}
                    onChange={(e) => setFormData({ ...formData, puerto_origen: e.target.value })}
                    className={`w-full border px-3 py-2 text-sm outline-none focus:ring-2 ${inputTone}`}
                    required
                  >
                    <option value="">Seleccionar puerto de origen</option>
                    {pols.map((pol) => (
                      <option key={pol} value={pol}>
                        {pol}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={polInputTexto}
                      onChange={(e) => setPolInputTexto(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (polInputTexto.trim() && !pols.includes(polInputTexto.trim())) {
                            // Agregar nuevo POL al catálogo y actualizar estado local
                            agregarNuevoPol(polInputTexto.trim());
                          } else if (polInputTexto.trim()) {
                            setFormData({ ...formData, puerto_origen: polInputTexto.trim() });
                            setPolInputTexto('');
                          }
                        }
                      }}
                      className={`flex-1 border px-3 py-2 text-sm outline-none focus:ring-2 ${inputTone}`}
                      placeholder="O escribir nuevo POL para agregar al catálogo"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (polInputTexto.trim() && !pols.includes(polInputTexto.trim())) {
                          agregarNuevoPol(polInputTexto.trim());
                        } else if (polInputTexto.trim()) {
                          setFormData({ ...formData, puerto_origen: polInputTexto.trim() });
                          setPolInputTexto('');
                        }
                      }}
                      disabled={!polInputTexto.trim()}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </label>

              {/* Descripción */}
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide">Descripción</span>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  className={`mt-1 w-full border px-3 py-2 text-sm outline-none focus:ring-2 ${inputTone}`}
                  rows={3}
                  placeholder="Descripción del servicio"
                />
              </label>

              {/* Naves */}
              <div className="space-y-2">
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wide">Naves Asignadas *</span>
                  <div className="mt-1 space-y-2">
                    <div className="flex gap-2">
                      <select
                        value={naveInput}
                        onChange={(e) => setNaveInput(e.target.value)}
                        className={`flex-1 border px-3 py-2 text-sm outline-none focus:ring-2 ${inputTone}`}
                      >
                        <option value="">Seleccionar nave existente</option>
                        {navesDisponibles.map((nave) => (
                          <option key={nave} value={nave}>
                            {nave}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={agregarNave}
                        disabled={!naveInput.trim()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={naveInputTexto}
                        onChange={(e) => setNaveInputTexto(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && agregarNave()}
                        className={`flex-1 border px-3 py-2 text-sm outline-none focus:ring-2 ${inputTone}`}
                        placeholder="O escribir nombre de nave nueva"
                      />
                      <button
                        type="button"
                        onClick={agregarNave}
                        disabled={!naveInputTexto.trim()}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </label>
                {formData.naves.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.naves.map((nave) => (
                      <span
                        key={nave}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded text-sm"
                      >
                        {nave}
                        <button
                          type="button"
                          onClick={() => eliminarNave(nave)}
                          className="hover:text-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Destinos */}
              <div className="space-y-2">
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wide">Destinos (PODs) *</span>
                  <div className="mt-1 space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <select
                        value={escalaForm.puerto}
                        onChange={(e) => setEscalaForm({ ...escalaForm, puerto: e.target.value })}
                        className={`border px-3 py-2 text-sm outline-none focus:ring-2 ${inputTone}`}
                      >
                        <option value="">Seleccionar puerto existente</option>
                        {pods.map((pod) => (
                          <option key={pod} value={pod}>
                            {pod}
                          </option>
                        ))}
                      </select>
                      <select
                        value={escalaForm.area}
                        onChange={(e) => setEscalaForm({ ...escalaForm, area: e.target.value })}
                        className={`border px-3 py-2 text-sm outline-none focus:ring-2 ${inputTone}`}
                      >
                        <option value="ASIA">ASIA</option>
                        <option value="EUROPA">EUROPA</option>
                        <option value="AMERICA">AMERICA</option>
                        <option value="INDIA-MEDIOORIENTE">INDIA-MEDIOORIENTE</option>
                      </select>
                      <button
                        type="button"
                        onClick={agregarDestino}
                        disabled={!escalaForm.puerto.trim()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={puertoInputTexto}
                        onChange={(e) => setPuertoInputTexto(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && agregarDestino()}
                        className={`border px-3 py-2 text-sm outline-none focus:ring-2 ${inputTone}`}
                        placeholder="O escribir código de puerto nuevo"
                      />
                      <input
                        type="text"
                        value={escalaForm.puerto_nombre}
                        onChange={(e) => setEscalaForm({ ...escalaForm, puerto_nombre: e.target.value })}
                        className={`border px-3 py-2 text-sm outline-none focus:ring-2 ${inputTone}`}
                        placeholder="Nombre completo del puerto (opcional)"
                      />
                      <button
                        type="button"
                        onClick={agregarDestino}
                        disabled={!puertoInputTexto.trim()}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </label>
                {formData.destinos.length > 0 && (
                  <div className="space-y-1">
                    {formData.destinos.map((destino, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-gray-50 dark:bg-slate-700 rounded"
                      >
                        <span className="text-sm">
                          {destino.puerto} ({destino.area}) - Orden: {destino.orden + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => eliminarDestino(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 flex justify-end gap-3 p-4 border-t bg-white dark:bg-slate-800">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border rounded hover:bg-gray-50 dark:hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                onClick={guardarServicio}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
              >
                <Save className="h-4 w-4" />
                {editingServicio ? 'Guardar Cambios' : 'Crear Servicio'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
