'use client';

import { useState, useEffect, useMemo } from 'react';
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
  const [navesDisponibles, setNavesDisponibles] = useState<string[]>([]);
  const [esNaveNueva, setEsNaveNueva] = useState(false);
  const [navieraParaNaveNueva, setNavieraParaNaveNueva] = useState<string>('');
  
  // Estado para crear/editar servicio
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingServicio, setEditingServicio] = useState<Servicio | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    navierasSeleccionadas: [] as string[], // Array de navieras seleccionadas (legacy, para compatibilidad)
    consorcioNavierasServicios: [] as Array<{ naviera: string; servicio_nombre: string }>, // Nueva estructura: naviera + servicio
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
  // Estado para el formulario de consorcio
  const [consorcioForm, setConsorcioForm] = useState({
    naviera: '',
    servicio_nombre: '',
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

      // Mostrar todos los servicios (activos e inactivos) para que el usuario pueda verlos
      // Los inactivos se mostrarán con un indicador visual
      setServicios(result.servicios || []);
    } catch (err: any) {
      setError(err?.message || 'Error al cargar servicios');
    } finally {
      setLoading(false);
    }
  };

  // Cargar navieras, naves y PODs disponibles
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

      // Cargar naves desde catalogos_naves
      const { data: navesData, error: navesError } = await supabase
        .from('catalogos_naves')
        .select('nombre')
        .eq('activo', true)
        .order('nombre');

      if (!navesError && navesData) {
        const navesList = [...new Set(navesData.map((n: any) => n.nombre).filter(Boolean))].sort();
        setNavesDisponibles(navesList);
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
      console.error('Error cargando navieras/naves/PODs:', err);
    }
  };

  useEffect(() => {
    void cargarServicios();
    void cargarNavieras();
  }, []);

  // Actualizar automáticamente el nombre del servicio cuando cambian los servicios del consorcio
  useEffect(() => {
    if (formData.consorcioNavierasServicios.length > 0) {
      const nombreGenerado = formData.consorcioNavierasServicios
        .map(item => item.servicio_nombre.trim())
        .filter(n => n.length > 0)
        .join('/');
      
      // Solo actualizar si el nombre actual no coincide con el generado
      if (nombreGenerado && nombreGenerado !== formData.nombre) {
        setFormData(prev => ({
          ...prev,
          nombre: nombreGenerado,
        }));
      }
    } else if (formData.consorcioNavierasServicios.length === 0 && formData.nombre.includes('/')) {
      // Si se eliminan todos los servicios del consorcio, limpiar el nombre si tiene formato de consorcio
      setFormData(prev => ({
        ...prev,
        nombre: '',
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(formData.consorcioNavierasServicios.map(c => c.servicio_nombre))]); // Depender del contenido serializado

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
      consorcioNavierasServicios: [],
      descripcion: '',
      naves: [],
      escalas: [],
    });
    setNaveInput('');
    setEscalaForm({ puerto: '', puerto_nombre: '', area: 'ASIA', esNuevoPod: false });
    setIsModalOpen(true);
  };

  // Abrir modal para editar servicio
  const abrirModalEditar = async (servicio: Servicio) => {
    setEditingServicio(servicio);
    const navierasDelConsorcio = parsearConsorcio(servicio.consorcio);
    
    // Intentar cargar consorcio estructurado si existe
    let consorcioNavierasServicios: Array<{ naviera: string; servicio_nombre: string }> = [];
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const consorcioResponse = await fetch(`${apiUrl}/api/admin/consorcios`);
      if (consorcioResponse.ok) {
        const consorciosData = await consorcioResponse.json();
        console.log('🔍 Buscando consorcio para servicio:', {
          servicioNombre: servicio.nombre,
          consorciosDisponibles: consorciosData.consorcios?.map((c: any) => c.nombre)
        });
        
        // Buscar consorcio que coincida con el nombre del servicio
        // El nombre del servicio es "INCA/AX1/AN1" y el consorcio también debería tener ese nombre
        const consorcioEncontrado = consorciosData.consorcios?.find((c: any) => {
          // Normalizar nombres para comparación (sin espacios, en mayúsculas)
          const nombreServicioNormalizado = servicio.nombre?.replace(/\s+/g, '').toUpperCase();
          const nombreConsorcioNormalizado = c.nombre?.replace(/\s+/g, '').toUpperCase();
          
          // Buscar por nombre exacto (normalizado)
          const coincideExacto = nombreServicioNormalizado === nombreConsorcioNormalizado;
          
          // Buscar si el nombre del servicio contiene partes del consorcio o viceversa
          const servicioContieneConsorcio = nombreServicioNormalizado?.includes(nombreConsorcioNormalizado || '');
          const consorcioContieneServicio = nombreConsorcioNormalizado?.includes(nombreServicioNormalizado || '');
          
          return coincideExacto || servicioContieneConsorcio || consorcioContieneServicio;
        });
        
        console.log('🔍 Consorcio encontrado:', consorcioEncontrado);
        
        if (consorcioEncontrado?.navierasServicios && Array.isArray(consorcioEncontrado.navierasServicios)) {
          consorcioNavierasServicios = consorcioEncontrado.navierasServicios
            .filter((rel: any) => rel.activo !== false)
            .map((rel: any) => ({
              naviera: rel.naviera,
              servicio_nombre: rel.servicio_nombre,
            }));
          console.log('✅ ConsorcioNavierasServicios cargado:', consorcioNavierasServicios);
        } else {
          console.warn('⚠️ Consorcio encontrado pero sin navierasServicios válidas');
        }
      }
    } catch (err) {
      console.warn('Error cargando consorcio estructurado:', err);
    }
    
    // Preparar escalas - incluir todas, no solo activas, para que el usuario pueda verlas
    const escalasFormateadas = (servicio.escalas || [])
      .filter(e => e.activo !== false) // Incluir activas y null (asumir activas si no tienen flag)
      .sort((a, b) => (a.orden || 0) - (b.orden || 0))
      .map(e => ({
        puerto: e.puerto,
        puerto_nombre: e.puerto_nombre || e.puerto,
        area: e.area || 'ASIA',
        orden: e.orden || 0,
      }));
    
    console.log('📋 Datos del servicio al editar:', {
      id: servicio.id,
      nombre: servicio.nombre,
      escalasRaw: servicio.escalas,
      cantidadEscalasRaw: servicio.escalas?.length || 0,
      escalasFormateadas: escalasFormateadas.length,
      naves: servicio.naves?.length || 0,
      consorcioNavierasServicios: consorcioNavierasServicios.length
    });
    
    setFormData({
      nombre: servicio.nombre,
      navierasSeleccionadas: navierasDelConsorcio,
      consorcioNavierasServicios,
      descripcion: servicio.descripcion || '',
      naves: servicio.naves.map(n => n.nave_nombre),
      escalas: escalasFormateadas,
    });
    setNaveInput('');
    setEsNaveNueva(false);
    setConsorcioForm({ naviera: '', servicio_nombre: '' });
    setEscalaForm({ puerto: '', puerto_nombre: '', area: 'ASIA', esNuevoPod: false });
    setIsModalOpen(true);
  };

  // Calcular naves disponibles según los servicios del consorcio
  const navesDisponiblesFiltradas = useMemo(() => {
    if (formData.consorcioNavierasServicios.length === 0) {
      return navesDisponibles;
    }
    
    // Obtener todas las naves de los servicios del consorcio
    const serviciosIds = servicios
      .filter(s => formData.consorcioNavierasServicios.some(
        cons => cons.servicio_nombre && s.nombre.includes(cons.servicio_nombre)
      ))
      .map(s => s.id);
    
    const navesDelConsorcio = new Set<string>();
    servicios.forEach(servicio => {
      if (serviciosIds.includes(servicio.id)) {
        servicio.naves?.forEach(nave => {
          if (nave.activo) {
            navesDelConsorcio.add(nave.nave_nombre);
          }
        });
      }
    });
    
    // Si hay naves del consorcio, usarlas; si no, usar todas las disponibles
    return navesDelConsorcio.size > 0 
      ? Array.from(navesDelConsorcio).sort()
      : navesDisponibles;
  }, [formData.consorcioNavierasServicios, servicios, navesDisponibles]);

  // Agregar nave al formulario
  const agregarNave = async (naveNombre?: string) => {
    const nave = naveNombre || naveInput.trim();
    if (!nave) return;
    
    // Si es una nave nueva, verificar que se haya seleccionado una naviera
    if (!naveNombre && !navesDisponibles.includes(nave)) {
      if (!navieraParaNaveNueva) {
        setError('Por favor selecciona la naviera del servicio a la que pertenece esta nave');
        return;
      }
    }
    
    if (nave && !formData.naves.includes(nave)) {
      setFormData({
        ...formData,
        naves: [...formData.naves, nave],
      });
      setNaveInput('');
      setEsNaveNueva(false);
      setNavieraParaNaveNueva('');
      
      // Si es una nave nueva que no está en el catálogo, agregarla al catálogo
      if (!navesDisponibles.includes(nave)) {
        // Agregar a catalogos_naves con la naviera asociada
        const supabase = createClient();
        supabase
          .from('catalogos_naves')
          .insert({
            nombre: nave,
            naviera: navieraParaNaveNueva || null,
            activo: true,
          })
          .then(({ error }) => {
            if (!error) {
              // Recargar naves disponibles
              cargarNavieras();
            }
          })
          .catch((err) => {
            console.warn('Error agregando nave al catálogo:', err);
          });
      }
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
      
      // Si hay servicios del consorcio, generar el nombre del servicio automáticamente
      let nombreServicio = formData.nombre.trim();
      let consorcioTexto: string | null = null;
      
      if (formData.consorcioNavierasServicios.length > 0) {
        // Generar nombre del servicio desde los servicios individuales separados por "/"
        nombreServicio = formData.consorcioNavierasServicios
          .map(item => item.servicio_nombre.trim())
          .filter(n => n.length > 0)
          .join('/');
        
        // Formatear consorcio para el campo legacy (opcional, para compatibilidad)
        consorcioTexto = formData.consorcioNavierasServicios
          .map(item => `${item.naviera} ${item.servicio_nombre}`)
          .join(' / ');
        
        // Guardar consorcio estructurado en la tabla de consorcios
        try {
          const consorcioNombre = nombreServicio; // Usar el mismo nombre que el servicio
          
          // Buscar si el consorcio ya existe
          const consorciosResponse = await fetch(`${apiUrl}/api/admin/consorcios`);
          let consorcioExistente = null;
          if (consorciosResponse.ok) {
            const consorciosData = await consorciosResponse.json();
            consorcioExistente = consorciosData.consorcios?.find((c: any) => 
              c.nombre === consorcioNombre || c.nombre === formData.nombre
            );
          }
          
          // Guardar o actualizar consorcio estructurado
          let consorcioResponse;
          if (consorcioExistente) {
            // Actualizar consorcio existente
            consorcioResponse = await fetch(`${apiUrl}/api/admin/consorcios`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: consorcioExistente.id,
                nombre: consorcioNombre,
                descripcion: formData.descripcion.trim() || `Consorcio: ${consorcioTexto}`,
                navierasServicios: formData.consorcioNavierasServicios,
              }),
            });
          } else {
            // Crear nuevo consorcio
            consorcioResponse = await fetch(`${apiUrl}/api/admin/consorcios`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                nombre: consorcioNombre,
                descripcion: formData.descripcion.trim() || `Consorcio: ${consorcioTexto}`,
                navierasServicios: formData.consorcioNavierasServicios,
              }),
            });
          }
          
          if (!consorcioResponse.ok) {
            const consorcioError = await consorcioResponse.json();
            console.warn('Error guardando consorcio estructurado:', consorcioError.error);
            // No fallar el guardado del servicio si falla el consorcio
          } else {
            console.log('✅ Consorcio guardado correctamente:', await consorcioResponse.json());
          }
        } catch (consorcioErr) {
          console.warn('Error guardando consorcio estructurado:', consorcioErr);
          // Continuar con el guardado del servicio aunque falle el consorcio
        }
      } else if (formData.navierasSeleccionadas.length > 0) {
        // Fallback a formato legacy
        consorcioTexto = formData.navierasSeleccionadas.join(' + ');
      }

      const method = editingServicio ? 'PUT' : 'POST';
      const body = editingServicio
        ? {
            id: editingServicio.id,
            nombre: nombreServicio,
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
            nombre: nombreServicio,
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
          };

      console.log('📤 Enviando servicio:', { method, body });
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      let result;
      try {
        result = await response.json();
      } catch (parseError) {
        // Si no se puede parsear el JSON, obtener el texto de la respuesta
        const text = await response.text();
        console.error('❌ Error parseando respuesta del servidor:', { status: response.status, text });
        throw new Error(`Error del servidor (${response.status}): ${text || 'Error desconocido'}`);
      }

      if (!response.ok) {
        console.error('❌ Error al guardar servicio:', {
          status: response.status,
          statusText: response.statusText,
          result,
          body: JSON.stringify(body, null, 2)
        });
        const errorMessage = result?.error || result?.message || `Error ${response.status}: ${response.statusText}`;
        throw new Error(errorMessage);
      }
      
      console.log('✅ Servicio guardado correctamente:', result);

      const mensaje = editingServicio 
        ? 'Servicio actualizado exitosamente' 
        : result.reactivado 
        ? 'Servicio reactivado exitosamente' 
        : 'Servicio creado exitosamente';
      setSuccess(mensaje);
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

  // Eliminar servicio definitivamente
  const eliminarServicio = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar DEFINITIVAMENTE este servicio? Esta acción no se puede deshacer.')) {
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
                  Consorcio (Navieras + Servicios)
                  <p className={`text-[10px] mt-1 mb-3 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                    Selecciona naviera y servicio para cada miembro del consorcio (ej: MSC + INCA, ONE + AX1)
                  </p>
                  <div className="mt-2 space-y-3">
                    {/* Lista de navieras + servicios seleccionados */}
                    {formData.consorcioNavierasServicios.length > 0 && (
                      <div className="space-y-2">
                        {formData.consorcioNavierasServicios.map((item, index) => (
                          <div
                            key={index}
                            className={`group flex items-center gap-2 p-3 border rounded ${theme === 'dark' ? 'border-slate-700 bg-slate-900' : 'border-gray-300 bg-gray-50'}`}
                          >
                            <div className="flex-1 grid grid-cols-2 gap-2">
                              <div>
                                <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Naviera:</span>
                                <span className={`ml-2 text-sm font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-gray-700'}`}>
                                  {item.naviera}
                                </span>
                              </div>
                              <div>
                                <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Servicio:</span>
                                <span className={`ml-2 text-sm font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-gray-700'}`}>
                                  {item.servicio_nombre}
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                // Verificar si el botón está realmente visible usando getComputedStyle
                                const computedStyle = window.getComputedStyle(e.currentTarget);
                                if (computedStyle.opacity === '0' || computedStyle.pointerEvents === 'none') {
                                  return;
                                }
                                setFormData({
                                  ...formData,
                                  consorcioNavierasServicios: formData.consorcioNavierasServicios.filter((_, i) => i !== index),
                                });
                              }}
                              className={`p-1.5 border transition opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto ${theme === 'dark'
                                ? 'border-slate-700 text-slate-300 hover:border-red-500/60 hover:text-red-400'
                                : 'border-gray-300 text-gray-600 hover:border-red-400 hover:text-red-600'
                              }`}
                              title="Eliminar"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Formulario para agregar nueva naviera + servicio */}
                    <div className={`border p-3 ${theme === 'dark' ? 'border-slate-700 bg-slate-900' : 'border-gray-300 bg-gray-50'}`}>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                            Naviera
                          </label>
                          <select
                            value={consorcioForm.naviera}
                            onChange={(e) => setConsorcioForm({ ...consorcioForm, naviera: e.target.value })}
                            className={`w-full border px-2 py-1.5 text-sm outline-none focus:ring-2 ${inputTone}`}
                          >
                            <option value="">Seleccionar naviera</option>
                            {navieras.map((naviera) => (
                              <option key={naviera} value={naviera}>
                                {naviera}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                            Servicio
                          </label>
                          <input
                            type="text"
                            value={consorcioForm.servicio_nombre}
                            onChange={(e) => setConsorcioForm({ ...consorcioForm, servicio_nombre: e.target.value })}
                            placeholder="Ej: INCA, AX1, AN1"
                            className={`w-full border px-2 py-1.5 text-sm outline-none focus:ring-2 ${inputTone}`}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (consorcioForm.naviera && consorcioForm.servicio_nombre.trim()) {
                                  setFormData({
                                    ...formData,
                                    consorcioNavierasServicios: [
                                      ...formData.consorcioNavierasServicios,
                                      { naviera: consorcioForm.naviera, servicio_nombre: consorcioForm.servicio_nombre.trim() }
                                    ],
                                  });
                                  setConsorcioForm({ naviera: '', servicio_nombre: '' });
                                }
                              }
                            }}
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (consorcioForm.naviera && consorcioForm.servicio_nombre.trim()) {
                            setFormData({
                              ...formData,
                              consorcioNavierasServicios: [
                                ...formData.consorcioNavierasServicios,
                                { naviera: consorcioForm.naviera, servicio_nombre: consorcioForm.servicio_nombre.trim() }
                              ],
                            });
                            setConsorcioForm({ naviera: '', servicio_nombre: '' });
                          }
                        }}
                        disabled={!consorcioForm.naviera || !consorcioForm.servicio_nombre.trim()}
                        className={`mt-2 w-full border px-3 py-1.5 text-xs font-semibold transition flex items-center justify-center gap-1 ${
                          consorcioForm.naviera && consorcioForm.servicio_nombre.trim()
                            ? theme === 'dark'
                              ? 'border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700'
                              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                            : theme === 'dark'
                              ? 'border-slate-700 bg-slate-900 text-slate-500 cursor-not-allowed'
                              : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        <Plus className="h-3 w-3" />
                        Agregar al Consorcio
                      </button>
                    </div>
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
                  
                  {/* Select para agregar nave */}
                  <div className="space-y-2 mb-4">
                    {!esNaveNueva ? (
                      <div className="flex gap-2">
                        <select
                          value={naveInput}
                          onChange={(e) => {
                            if (e.target.value === '__nueva__') {
                              setEsNaveNueva(true);
                              setNaveInput('');
                            } else if (e.target.value) {
                              agregarNave(e.target.value);
                            }
                          }}
                          className={`flex-1 border px-3 py-2 text-sm outline-none focus:ring-2 ${inputTone}`}
                        >
                          <option value="">Seleccionar nave</option>
                          {navesDisponiblesFiltradas
                            .filter(nave => !formData.naves.includes(nave))
                            .map((nave) => (
                              <option key={nave} value={nave}>
                                {nave}
                              </option>
                            ))}
                          <option value="__nueva__">➕ Agregar nueva nave</option>
                        </select>
                        {naveInput && naveInput !== '__nueva__' && (
                          <button
                            type="button"
                            onClick={() => agregarNave(naveInput)}
                            className={`px-4 py-2 border transition ${theme === 'dark'
                              ? 'border-[#00AEEF]/60 bg-[#00AEEF]/20 text-[#00AEEF] hover:bg-[#00AEEF]/30'
                              : 'border-[#00AEEF] bg-[#00AEEF] text-white hover:bg-[#0099D6]'
                            }`}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <select
                            value={navieraParaNaveNueva}
                            onChange={(e) => setNavieraParaNaveNueva(e.target.value)}
                            className={`flex-1 border px-3 py-2 text-sm outline-none focus:ring-2 ${inputTone}`}
                            required
                          >
                            <option value="">Seleccionar naviera del servicio</option>
                            {formData.consorcioNavierasServicios.length > 0 ? (
                              formData.consorcioNavierasServicios
                                .map((cons, idx) => cons.naviera)
                                .filter((naviera, idx, arr) => arr.indexOf(naviera) === idx)
                                .map((naviera) => (
                                  <option key={naviera} value={naviera}>
                                    {naviera}
                                  </option>
                                ))
                            ) : (
                              navieras.map((naviera) => (
                                <option key={naviera} value={naviera}>
                                  {naviera}
                                </option>
                              ))
                            )}
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={naveInput}
                            onChange={(e) => setNaveInput(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (naveInput.trim()) {
                                  agregarNave();
                                }
                              }
                            }}
                            className={`flex-1 border px-3 py-2 text-sm outline-none focus:ring-2 ${inputTone}`}
                            placeholder="Nombre de la nueva nave"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (naveInput.trim()) {
                                agregarNave();
                              }
                            }}
                            disabled={!naveInput.trim() || !navieraParaNaveNueva}
                            className={`px-4 py-2 border transition ${
                              naveInput.trim() && navieraParaNaveNueva
                                ? theme === 'dark'
                                  ? 'border-[#00AEEF]/60 bg-[#00AEEF]/20 text-[#00AEEF] hover:bg-[#00AEEF]/30'
                                  : 'border-[#00AEEF] bg-[#00AEEF] text-white hover:bg-[#0099D6]'
                                : theme === 'dark'
                                  ? 'border-slate-700 bg-slate-900 text-slate-500 cursor-not-allowed'
                                  : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEsNaveNueva(false);
                              setNaveInput('');
                              setNavieraParaNaveNueva('');
                            }}
                            className={`px-4 py-2 border transition ${theme === 'dark'
                              ? 'border-slate-700 text-slate-300 hover:bg-slate-700'
                              : 'border-gray-300 text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Lista de naves */}
                  {formData.naves.length > 0 ? (
                    <div className="space-y-2">
                      {formData.naves.map((nave, index) => (
                        <div
                          key={index}
                          className={`group flex items-center justify-between p-3 border ${theme === 'dark' 
                            ? 'border-slate-700 bg-slate-900' 
                            : 'border-gray-300 bg-gray-50'
                          }`}
                        >
                          <span className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                            {index + 1}. {nave}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              // Verificar si el botón está realmente visible usando getComputedStyle
                              const computedStyle = window.getComputedStyle(e.currentTarget);
                              if (computedStyle.opacity === '0' || computedStyle.pointerEvents === 'none') {
                                return;
                              }
                              eliminarNave(index);
                            }}
                            className={`p-1.5 border transition opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto ${theme === 'dark'
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
                          className={`group flex items-center justify-between p-3 border ${theme === 'dark' 
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
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              // Verificar si el botón está realmente visible usando getComputedStyle
                              const computedStyle = window.getComputedStyle(e.currentTarget);
                              if (computedStyle.opacity === '0' || computedStyle.pointerEvents === 'none') {
                                return;
                              }
                              eliminarEscala(index);
                            }}
                            className={`p-1.5 border transition opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto ${theme === 'dark'
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
