'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Plus, Trash2, Save, Edit2, X, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
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
  
  // Estado para modo "Convertir servicio en consorcio"
  const [modoConversion, setModoConversion] = useState(false);
  const [servicioBase, setServicioBase] = useState<string>('');
  const [navierasAdicionales, setNavierasAdicionales] = useState<string[]>([]);
  const [navieraSeleccionada, setNavieraSeleccionada] = useState<string>('');
  const [navierasDisponibles, setNavierasDisponibles] = useState<Array<{ id: string; nombre: string }>>([]);
  
  // Estado para modo "Agregar navieras a servicio existente"
  const [modoAgregarNavieras, setModoAgregarNavieras] = useState(false);
  const [serviciosAgrupados, setServiciosAgrupados] = useState<Record<string, ServicioUnico[]>>({});
  const [serviciosSeleccionadosAgrupados, setServiciosSeleccionadosAgrupados] = useState<string[]>([]);

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
      
      // Cargar navieras disponibles
      const supabase = createClient();
      const { data: navierasData } = await supabase
        .from('catalogos_navieras')
        .select('id, nombre')
        .eq('activo', true)
        .order('nombre');
      
      if (navierasData) {
        setNavierasDisponibles(navierasData);
      }
    } catch (err: any) {
      setError(err?.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void cargarDatos();
  }, []);

  // Agrupar servicios únicos por nombre cuando cambian los servicios
  useEffect(() => {
    if (serviciosUnicos.length > 0) {
      const agrupados: Record<string, ServicioUnico[]> = {};
      
      serviciosUnicos.forEach(servicio => {
        if (servicio.activo) {
          const nombreNormalizado = servicio.nombre.trim().toUpperCase();
          if (!agrupados[nombreNormalizado]) {
            agrupados[nombreNormalizado] = [];
          }
          agrupados[nombreNormalizado].push(servicio);
        }
      });
      
      // Filtrar solo los grupos que tienen más de un servicio (mismo nombre, diferentes navieras)
      const gruposConMultiples: Record<string, ServicioUnico[]> = {};
      Object.keys(agrupados).forEach(nombre => {
        if (agrupados[nombre].length > 1) {
          gruposConMultiples[nombre] = agrupados[nombre];
        }
      });
      
      setServiciosAgrupados(gruposConMultiples);
    }
  }, [serviciosUnicos]);

  // Abrir modal para crear
  const abrirModalCrear = () => {
    setEditingConsorcio(null);
    setFormData({
      nombre: '',
      descripcion: '',
      servicios_unicos: [],
    });
    setServicioSeleccionado('');
    setModoConversion(false);
    setModoAgregarNavieras(false);
    setServicioBase('');
    setNavierasAdicionales([]);
    setNavieraSeleccionada('');
    setServiciosSeleccionadosAgrupados([]);
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

  // Agregar naviera adicional
  const agregarNavieraAdicional = () => {
    if (navieraSeleccionada && !navierasAdicionales.includes(navieraSeleccionada)) {
      setNavierasAdicionales([...navierasAdicionales, navieraSeleccionada]);
      setNavieraSeleccionada('');
    }
  };

  // Eliminar naviera adicional
  const eliminarNavieraAdicional = (navieraId: string) => {
    setNavierasAdicionales(navierasAdicionales.filter(id => id !== navieraId));
  };

  // Toggle servicio agrupado (mismo nombre, diferentes navieras)
  const toggleServicioAgrupado = (servicioId: string) => {
    if (serviciosSeleccionadosAgrupados.includes(servicioId)) {
      setServiciosSeleccionadosAgrupados(
        serviciosSeleccionadosAgrupados.filter(id => id !== servicioId)
      );
    } else {
      setServiciosSeleccionadosAgrupados([...serviciosSeleccionadosAgrupados, servicioId]);
    }
  };

  // Aplicar servicios agrupados seleccionados al formulario
  const aplicarServiciosAgrupados = () => {
    if (serviciosSeleccionadosAgrupados.length === 0) {
      setError('Debes seleccionar al menos un servicio');
      return;
    }

    // Obtener los servicios seleccionados
    const serviciosParaConsorcio = serviciosSeleccionadosAgrupados
      .map(servicioId => serviciosUnicos.find(s => s.id === servicioId))
      .filter((s): s is ServicioUnico => s !== undefined);

    if (serviciosParaConsorcio.length === 0) {
      setError('No se encontraron los servicios seleccionados');
      return;
    }

    // Verificar que todos tengan el mismo nombre
    const nombreComun = serviciosParaConsorcio[0].nombre;
    const todosMismoNombre = serviciosParaConsorcio.every(s => s.nombre.trim().toUpperCase() === nombreComun.trim().toUpperCase());

    if (!todosMismoNombre) {
      setError('Todos los servicios seleccionados deben tener el mismo nombre');
      return;
    }

    // Convertir a formato del formulario
    const serviciosForm = serviciosParaConsorcio.map((servicio, index) => {
      const destinosActivos = servicio.destinos?.map((d, idx) => ({
        destino_id: d.id,
        orden: d.orden || idx,
      })) || [];

      return {
        servicio_unico_id: servicio.id,
        orden: formData.servicios_unicos.length + index, // Continuar el orden desde los servicios existentes
        destinos_activos: destinosActivos,
      };
    });

    // Actualizar formulario agregando los nuevos servicios a los existentes
    setFormData({
      ...formData,
      servicios_unicos: [
        ...formData.servicios_unicos,
        ...serviciosForm,
      ],
    });

    // Limpiar selección
    setServiciosSeleccionadosAgrupados([]);
    setSuccess(`${serviciosParaConsorcio.length} servicio(s) agregado(s) al consorcio`);
  };

  // Agregar servicio adicional al consorcio en edición
  const agregarServicioAdicional = (servicioId: string) => {
    const servicio = serviciosUnicos.find(s => s.id === servicioId);
    if (!servicio) return;

    // Verificar que no esté ya agregado
    if (formData.servicios_unicos.some(su => su.servicio_unico_id === servicioId)) {
      setError('Este servicio ya está en el consorcio');
      return;
    }

    // Por defecto, usar todos los destinos del servicio único
    const destinosActivos = servicio.destinos?.map((d, index) => ({
      destino_id: d.id,
      orden: d.orden || index,
    })) || [];

    // Agregar al formulario
    setFormData({
      ...formData,
      servicios_unicos: [
        ...formData.servicios_unicos,
        {
          servicio_unico_id: servicioId,
          orden: formData.servicios_unicos.length,
          destinos_activos: destinosActivos,
        },
      ],
    });

    setSuccess(`Servicio ${servicio.nombre} (${servicio.naviera_nombre}) agregado al consorcio`);
  };

  // Guardar consorcio
  const guardarConsorcio = async () => {
    try {
      setError(null);
      setSuccess(null);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

      // Si está en modo conversión, crear servicios únicos nuevos para navieras adicionales
      if (modoConversion && servicioBase && navierasAdicionales.length > 0) {
        const servicioBaseData = serviciosUnicos.find(s => s.id === servicioBase);
        if (!servicioBaseData) {
          setError('Servicio base no encontrado');
          return;
        }

        if (!formData.nombre.trim()) {
          setError('El nombre del consorcio es requerido. Debes ingresar un nombre personalizado para el consorcio.');
          return;
        }

        // Crear servicios únicos nuevos para cada naviera adicional
        const serviciosNuevosIds: string[] = [];
        
        for (const navieraId of navierasAdicionales) {
          const naviera = navierasDisponibles.find(n => n.id === navieraId);
          if (!naviera) continue;

          // Crear servicio único nuevo basado en el servicio base
          const nuevoServicioPayload = {
            nombre: servicioBaseData.nombre,
            naviera_id: navieraId,
            descripcion: servicioBaseData.descripcion || '',
            puerto_origen: servicioBaseData.puerto_origen || '',
            naves: servicioBaseData.naves?.map((n: any) => n.nave_nombre || n.nombre).filter(Boolean) || [],
            destinos: servicioBaseData.destinos?.map((d: any) => ({
              puerto: d.puerto || d.puerto_nombre,
              puerto_nombre: d.puerto_nombre || d.puerto,
              area: d.area || 'ASIA',
              orden: d.orden || 0,
            })) || [],
          };

          const servicioResponse = await fetch(`${apiUrl}/api/admin/servicios-unicos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nuevoServicioPayload),
          });

          if (servicioResponse.ok) {
            const servicioResult = await servicioResponse.json();
            if (servicioResult.servicio?.id) {
              serviciosNuevosIds.push(servicioResult.servicio.id);
            }
          } else {
            const errorResult = await servicioResponse.json();
            throw new Error(`Error al crear servicio para ${naviera.nombre}: ${errorResult?.error || 'Error desconocido'}`);
          }
        }

        // Crear consorcio con servicio base + servicios nuevos
        const serviciosParaConsorcio = [
          { servicio_unico_id: servicioBase, orden: 0 },
          ...serviciosNuevosIds.map((id, index) => ({
            servicio_unico_id: id,
            orden: index + 1,
          })),
        ];

        // Usar el nombre personalizado ingresado por el usuario
        const nombreConsorcio = formData.nombre.trim();
        const payload = {
          nombre: nombreConsorcio,
          descripcion: formData.descripcion || `Consorcio creado desde ${servicioBaseData.nombre}`,
          servicios_unicos: serviciosParaConsorcio.map(s => ({
            servicio_unico_id: s.servicio_unico_id,
            orden: s.orden,
            destinos_activos: [], // La API consolidará los destinos
          })),
        };

        const response = await fetch(`${apiUrl}/api/admin/consorcios`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result?.error || 'Error al crear el consorcio');
        }

        setSuccess(`Consorcio creado exitosamente con ${navierasAdicionales.length} naviera(s) adicional(es)`);
        setIsModalOpen(false);
        setModoConversion(false);
        setServicioBase('');
        setNavierasAdicionales([]);
        void cargarDatos();
        if (onConsorcioCreated) onConsorcioCreated();
        return;
      }

      // Validaciones para modo normal
      if (!formData.nombre.trim()) {
        setError('El nombre del consorcio es requerido');
        return;
      }

      if (formData.servicios_unicos.length === 0) {
        setError('Debe incluir al menos un servicio único');
        return;
      }

      const url = `${apiUrl}/api/admin/consorcios`;
      const method = editingConsorcio ? 'PUT' : 'POST';

      // La API consolidará automáticamente los destinos únicos
      const payload = editingConsorcio ? { id: editingConsorcio.id, ...formData } : formData;

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

  // Calcular servicios adicionales disponibles para agregar al consorcio en edición
  // Prioridad 1: Servicios con mismo nombre que los del consorcio pero diferentes navieras
  // Prioridad 2: Todos los demás servicios únicos disponibles
  const serviciosAdicionalesDisponibles = useMemo(() => {
    if (!editingConsorcio) {
      return { mismosNombres: {}, otros: [] };
    }

    // Obtener los IDs y nombres de servicios únicos que ya están en el consorcio
    const serviciosIdsEnConsorcio = new Set<string>();
    const nombresServiciosEnConsorcio = new Set<string>();
    const navierasEnConsorcio = new Set<string>();
    
    formData.servicios_unicos.forEach(su => {
      serviciosIdsEnConsorcio.add(su.servicio_unico_id);
      const servicio = serviciosUnicos.find(s => s.id === su.servicio_unico_id);
      if (servicio) {
        nombresServiciosEnConsorcio.add(servicio.nombre.trim().toUpperCase());
        if (servicio.naviera_id) {
          navierasEnConsorcio.add(servicio.naviera_id);
        }
      }
    });

    // Buscar servicios únicos que:
    // 1. Tengan el mismo nombre que algún servicio del consorcio
    // 2. Tengan una naviera diferente
    // 3. No estén ya en el consorcio
    const serviciosMismoNombre: ServicioUnico[] = [];
    const otrosServicios: ServicioUnico[] = [];
    
    serviciosUnicos.forEach(servicio => {
      if (!servicio.activo) return;
      if (serviciosIdsEnConsorcio.has(servicio.id)) return; // Ya está en el consorcio
      
      const nombreNormalizado = servicio.nombre.trim().toUpperCase();
      const tieneMismoNombre = nombresServiciosEnConsorcio.has(nombreNormalizado);
      const tieneNavieraDiferente = servicio.naviera_id && !navierasEnConsorcio.has(servicio.naviera_id);
      
      if (tieneMismoNombre && tieneNavieraDiferente) {
        serviciosMismoNombre.push(servicio);
      } else {
        otrosServicios.push(servicio);
      }
    });

    // Agrupar servicios con mismo nombre por nombre de servicio
    const agrupadosMismoNombre: Record<string, ServicioUnico[]> = {};
    serviciosMismoNombre.forEach(servicio => {
      const nombreNormalizado = servicio.nombre.trim().toUpperCase();
      if (!agrupadosMismoNombre[nombreNormalizado]) {
        agrupadosMismoNombre[nombreNormalizado] = [];
      }
      agrupadosMismoNombre[nombreNormalizado].push(servicio);
    });

    return { 
      mismosNombres: agrupadosMismoNombre, 
      otros: otrosServicios 
    };
  }, [editingConsorcio, formData.servicios_unicos, serviciosUnicos]);

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
          {consorcios.map((consorcio) => {
            // Calcular naves únicas del consorcio
            const navesUnicas = new Set<string>();
            if (consorcio.servicios && Array.isArray(consorcio.servicios)) {
              consorcio.servicios.forEach((cs: any) => {
                if (cs.servicio_unico?.naves && Array.isArray(cs.servicio_unico.naves)) {
                  cs.servicio_unico.naves
                    .filter((n: any) => n.activo !== false && n.nave_nombre)
                    .forEach((n: any) => {
                      navesUnicas.add(n.nave_nombre);
                    });
                }
              });
            }

            // Calcular destinos únicos del consorcio (por código de puerto, no por ID)
            // Los destinos únicos deben ser por puerto, ya que el mismo puerto puede estar en diferentes servicios
            const destinosUnicosPorPuerto = new Set<string>();
            const destinosUnicosPorId = new Set<string>();
            
            // Primero, contar desde destinos_activos del consorcio (ya consolidados por la API)
            if (consorcio.destinos_activos && Array.isArray(consorcio.destinos_activos)) {
              consorcio.destinos_activos.forEach((da: any) => {
                // Contar por ID del destino
                if (da.destino?.id) {
                  destinosUnicosPorId.add(da.destino.id);
                } else if (da.destino_id) {
                  destinosUnicosPorId.add(da.destino_id);
                }
                
                // También contar por código de puerto (más preciso para destinos únicos)
                if (da.destino?.puerto) {
                  destinosUnicosPorPuerto.add(da.destino.puerto);
                }
              });
            }
            
            // Si no hay destinos_activos, calcular desde los servicios únicos
            if (destinosUnicosPorId.size === 0 && consorcio.servicios && Array.isArray(consorcio.servicios)) {
              consorcio.servicios.forEach((cs: any) => {
                if (cs.servicio_unico?.destinos && Array.isArray(cs.servicio_unico.destinos)) {
                  cs.servicio_unico.destinos
                    .filter((d: any) => d.activo !== false && d.puerto)
                    .forEach((d: any) => {
                      destinosUnicosPorPuerto.add(d.puerto);
                    });
                }
              });
            }
            
            // Usar el conteo por puerto si está disponible, sino por ID
            const destinosUnicos = destinosUnicosPorPuerto.size > 0 ? destinosUnicosPorPuerto.size : destinosUnicosPorId.size;

            return (
              <div
                key={consorcio.id}
                className={`p-4 border rounded ${theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-gray-300 bg-white'}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold">{consorcio.nombre}</h3>
                    <div className="text-sm text-gray-500 space-y-1 mt-1">
                      <p>Servicios: {consorcio.servicios?.length || 0}</p>
                      <p>Naves únicas: {navesUnicas.size}</p>
                      <p>Destinos únicos: {destinosUnicos}</p>
                    </div>
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
            );
          })}
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
              {/* Toggle modos de creación */}
              {!editingConsorcio && (
                <div className="space-y-2">
                  {/* Modo: Agregar navieras a servicio existente */}
                  <div className="flex items-center gap-2 p-3 border rounded bg-green-50 dark:bg-green-900/20">
                    <input
                      type="checkbox"
                      id="modoAgregarNavieras"
                      checked={modoAgregarNavieras}
                      onChange={(e) => {
                        setModoAgregarNavieras(e.target.checked);
                        if (e.target.checked) {
                          // Limpiar otros modos
                          setModoConversion(false);
                          setFormData({ ...formData, servicios_unicos: [] });
                          setServicioSeleccionado('');
                          setServicioBase('');
                          setNavierasAdicionales([]);
                        } else {
                          // Limpiar selección cuando se desactiva
                          setServiciosSeleccionadosAgrupados([]);
                        }
                      }}
                      className="w-4 h-4"
                    />
                    <label htmlFor="modoAgregarNavieras" className="text-sm font-medium cursor-pointer flex-1">
                      Agregar navieras a servicio existente (servicios con mismo nombre)
                    </label>
                  </div>

                  {/* Modo: Convertir servicio en consorcio */}
                  <div className="flex items-center gap-2 p-3 border rounded bg-blue-50 dark:bg-blue-900/20">
                    <input
                      type="checkbox"
                      id="modoConversion"
                      checked={modoConversion}
                      onChange={(e) => {
                        setModoConversion(e.target.checked);
                        if (e.target.checked) {
                          // Limpiar otros modos
                          setModoAgregarNavieras(false);
                          setFormData({ ...formData, servicios_unicos: [] });
                          setServicioSeleccionado('');
                          setServiciosSeleccionadosAgrupados([]);
                        } else {
                          // Limpiar modo conversión cuando se desactiva
                          setServicioBase('');
                          setNavierasAdicionales([]);
                        }
                      }}
                      className="w-4 h-4"
                    />
                    <label htmlFor="modoConversion" className="text-sm font-medium cursor-pointer flex-1">
                      Convertir servicio único en consorcio (crear nuevos servicios para navieras adicionales)
                    </label>
                  </div>
                </div>
              )}

              {/* Modo agregar navieras: Seleccionar servicios con mismo nombre */}
              {modoAgregarNavieras && !editingConsorcio && (
                <div className="space-y-4 p-4 border rounded bg-green-50 dark:bg-green-900/20">
                  <h4 className="text-sm font-semibold">Servicios con Mismo Nombre (Diferentes Navieras)</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Selecciona los servicios únicos que comparten el mismo nombre pero pertenecen a diferentes navieras para crear un consorcio.
                  </p>
                  
                  {Object.keys(serviciosAgrupados).length === 0 ? (
                    <div className="p-4 text-center text-gray-500 bg-white dark:bg-slate-800 rounded border">
                      <p className="text-sm">No hay servicios únicos con el mismo nombre disponibles.</p>
                      <p className="text-xs mt-1">Crea servicios únicos con el mismo nombre pero diferentes navieras primero.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(serviciosAgrupados).map(([nombreServicio, servicios]) => (
                        <div
                          key={nombreServicio}
                          className="p-4 bg-white dark:bg-slate-800 border rounded"
                        >
                          <h5 className="font-semibold text-sm mb-3">
                            Servicio: <span className="text-blue-600 dark:text-blue-400">{nombreServicio}</span>
                            <span className="text-xs text-gray-500 ml-2">
                              ({servicios.length} naviera{servicios.length > 1 ? 's' : ''})
                            </span>
                          </h5>
                          <div className="space-y-2">
                            {servicios.map((servicio) => {
                              const estaSeleccionado = serviciosSeleccionadosAgrupados.includes(servicio.id);
                              const yaEnConsorcio = formData.servicios_unicos.some(
                                su => su.servicio_unico_id === servicio.id
                              );
                              
                              return (
                                <label
                                  key={servicio.id}
                                  className={`flex items-center gap-3 p-3 border rounded cursor-pointer transition ${
                                    estaSeleccionado
                                      ? 'bg-green-100 dark:bg-green-900/30 border-green-400'
                                      : yaEnConsorcio
                                      ? 'bg-gray-100 dark:bg-slate-700 border-gray-300 opacity-50 cursor-not-allowed'
                                      : 'bg-gray-50 dark:bg-slate-900 border-gray-300 hover:border-green-400'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={estaSeleccionado}
                                    onChange={() => toggleServicioAgrupado(servicio.id)}
                                    disabled={yaEnConsorcio}
                                    className="rounded"
                                  />
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-sm">{servicio.naviera_nombre || 'Naviera desconocida'}</span>
                                      {yaEnConsorcio && (
                                        <span className="text-xs text-gray-500">(Ya agregado)</span>
                                      )}
                                    </div>
                                    {servicio.descripcion && (
                                      <p className="text-xs text-gray-500 mt-1">{servicio.descripcion}</p>
                                    )}
                                    <div className="flex gap-4 mt-1 text-xs text-gray-500">
                                      <span>Naves: {servicio.naves?.length || 0}</span>
                                      <span>Destinos: {servicio.destinos?.length || 0}</span>
                                    </div>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                      
                      {serviciosSeleccionadosAgrupados.length > 0 && (
                        <div className="flex justify-end gap-2 pt-2 border-t">
                          <button
                            type="button"
                            onClick={() => setServiciosSeleccionadosAgrupados([])}
                            className="px-4 py-2 text-sm border rounded hover:bg-gray-50 dark:hover:bg-slate-700"
                          >
                            Limpiar Selección
                          </button>
                          <button
                            type="button"
                            onClick={aplicarServiciosAgrupados}
                            className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded"
                          >
                            Agregar {serviciosSeleccionadosAgrupados.length} Servicio(s) al Consorcio
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Modo conversión: Seleccionar servicio base y navieras adicionales */}
              {modoConversion && !editingConsorcio && (
                <div className="space-y-4 p-4 border rounded bg-gray-50 dark:bg-slate-900">
                  <h4 className="text-sm font-semibold">Convertir Servicio en Consorcio</h4>
                  
                  {/* Seleccionar servicio base */}
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-wide">Servicio Base *</span>
                    <select
                      value={servicioBase}
                      onChange={(e) => {
                        setServicioBase(e.target.value);
                        const servicio = serviciosUnicos.find(s => s.id === e.target.value);
                        // Solo sugerir el nombre si el campo está vacío, pero permitir personalización
                        if (servicio && !formData.nombre.trim()) {
                          setFormData({
                            ...formData,
                            nombre: servicio.nombre,
                          });
                        }
                      }}
                      className={`mt-1 w-full border px-3 py-2 text-sm outline-none focus:ring-2 ${inputTone}`}
                    >
                      <option value="">Seleccionar servicio único base</option>
                      {serviciosUnicos
                        .filter(s => s.activo)
                        .map((servicio) => (
                          <option key={servicio.id} value={servicio.id}>
                            {servicio.nombre} ({servicio.naviera_nombre})
                          </option>
                        ))}
                    </select>
                    {servicioBase && (
                      <p className="text-xs text-gray-500 mt-1">
                        Naviera actual: {serviciosUnicos.find(s => s.id === servicioBase)?.naviera_nombre}
                      </p>
                    )}
                  </label>

                  {/* Agregar navieras adicionales */}
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-wide">Agregar Navieras Adicionales</span>
                    <div className="mt-1 flex gap-2">
                      <select
                        value={navieraSeleccionada}
                        onChange={(e) => setNavieraSeleccionada(e.target.value)}
                        className={`flex-1 border px-3 py-2 text-sm outline-none focus:ring-2 ${inputTone}`}
                        disabled={!servicioBase}
                      >
                        <option value="">Seleccionar naviera adicional</option>
                        {navierasDisponibles
                          .filter(n => {
                            const servicioBaseData = serviciosUnicos.find(s => s.id === servicioBase);
                            if (!servicioBaseData) return true;
                            // Excluir la naviera del servicio base
                            return n.id !== servicioBaseData.naviera_id;
                          })
                          .filter(n => !navierasAdicionales.includes(n.id))
                          .map((naviera) => (
                            <option key={naviera.id} value={naviera.id}>
                              {naviera.nombre}
                            </option>
                          ))}
                      </select>
                      <button
                        type="button"
                        onClick={agregarNavieraAdicional}
                        disabled={!navieraSeleccionada || !servicioBase}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </label>

                  {/* Lista de navieras adicionales */}
                  {navierasAdicionales.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold">Navieras adicionales:</p>
                      {navierasAdicionales.map((navieraId) => {
                        const naviera = navierasDisponibles.find(n => n.id === navieraId);
                        return (
                          <div key={navieraId} className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 border rounded">
                            <span className="text-sm">{naviera?.nombre}</span>
                            <button
                              type="button"
                              onClick={() => eliminarNavieraAdicional(navieraId)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Nombre */}
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide">Nombre del Consorcio *</span>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className={`mt-1 w-full border px-3 py-2 text-sm outline-none focus:ring-2 ${inputTone}`}
                  placeholder={modoConversion && servicioBase ? `Ej: ${serviciosUnicos.find(s => s.id === servicioBase)?.nombre || 'Nombre del consorcio'}` : "Ej: ANDES EXPRESS, ASIA EXPRESS"}
                  required
                />
                {modoConversion && servicioBase && (
                  <p className="text-xs text-gray-500 mt-1">
                    Puedes personalizar el nombre del consorcio. El nombre del servicio base es solo una sugerencia.
                  </p>
                )}
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

              {/* Sección para agregar navieras adicionales al consorcio en edición */}
              {editingConsorcio && (
                <div className="space-y-4">
                  {/* Servicios con mismo nombre pero diferentes navieras */}
                  {Object.keys(serviciosAdicionalesDisponibles.mismosNombres).length > 0 && (
                    <div className="p-4 border rounded bg-blue-50 dark:bg-blue-900/20">
                      <h4 className="text-sm font-semibold mb-2">Navieras Adicionales (Mismo Servicio)</h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                        Servicios únicos con el mismo nombre que los del consorcio pero con diferentes navieras.
                      </p>
                      
                      <div className="space-y-3">
                        {Object.entries(serviciosAdicionalesDisponibles.mismosNombres).map(([nombreServicio, servicios]) => (
                          <div
                            key={nombreServicio}
                            className="p-3 bg-white dark:bg-slate-800 border rounded"
                          >
                            <h5 className="font-semibold text-sm mb-2">
                              Servicio: <span className="text-blue-600 dark:text-blue-400">{nombreServicio}</span>
                            </h5>
                            <div className="space-y-2">
                              {servicios.map((servicio) => (
                                <div
                                  key={servicio.id}
                                  className="flex items-center justify-between p-2 bg-gray-50 dark:bg-slate-900 border rounded"
                                >
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-sm">{servicio.naviera_nombre || 'Naviera desconocida'}</span>
                                    </div>
                                    <div className="flex gap-4 mt-1 text-xs text-gray-500">
                                      <span>Naves: {servicio.naves?.length || 0}</span>
                                      <span>Destinos: {servicio.destinos?.length || 0}</span>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => agregarServicioAdicional(servicio.id)}
                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded flex items-center gap-1"
                                  >
                                    <Plus className="h-3 w-3" />
                                    Agregar
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Otros servicios únicos disponibles */}
                  {serviciosAdicionalesDisponibles.otros.length > 0 && (
                    <div className="p-4 border rounded bg-green-50 dark:bg-green-900/20">
                      <h4 className="text-sm font-semibold mb-2">Otros Servicios Únicos Disponibles</h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                        Puedes agregar cualquier otro servicio único disponible al consorcio.
                      </p>
                      
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {serviciosAdicionalesDisponibles.otros.map((servicio) => (
                          <div
                            key={servicio.id}
                            className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 border rounded"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{servicio.nombre}</span>
                                <span className="text-xs text-gray-500">({servicio.naviera_nombre || 'Naviera desconocida'})</span>
                              </div>
                              <div className="flex gap-4 mt-1 text-xs text-gray-500">
                                <span>Naves: {servicio.naves?.length || 0}</span>
                                <span>Destinos: {servicio.destinos?.length || 0}</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => agregarServicioAdicional(servicio.id)}
                              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded flex items-center gap-1"
                            >
                              <Plus className="h-3 w-3" />
                              Agregar
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Mensaje cuando no hay servicios disponibles */}
                  {Object.keys(serviciosAdicionalesDisponibles.mismosNombres).length === 0 && 
                   serviciosAdicionalesDisponibles.otros.length === 0 && (
                    <div className="p-4 border rounded bg-gray-50 dark:bg-slate-900">
                      <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                        No hay servicios únicos adicionales disponibles para agregar al consorcio.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Agregar servicio único (solo si no está en modo conversión ni modo agregar navieras) */}
              {!modoConversion && !modoAgregarNavieras && (
              <div className="space-y-2 p-4 border rounded bg-purple-50 dark:bg-purple-900/20">
                <label className="block">
                  <div className="mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wide">Mezclar Servicios Únicos</span>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      Puedes agregar cualquier servicio único disponible para crear un consorcio personalizado. Mezcla servicios con diferentes nombres y navieras según necesites.
                    </p>
                  </div>
                  <div className="mt-1 flex gap-2">
                    <select
                      value={servicioSeleccionado}
                      onChange={(e) => setServicioSeleccionado(e.target.value)}
                      className={`flex-1 border px-3 py-2 text-sm outline-none focus:ring-2 ${inputTone}`}
                    >
                      <option value="">Seleccionar servicio único para agregar</option>
                      {serviciosDisponibles.length === 0 ? (
                        <option value="" disabled>No hay servicios únicos disponibles</option>
                      ) : (
                        serviciosDisponibles.map((servicio) => (
                          <option key={servicio.id} value={servicio.id}>
                            {servicio.nombre} - {servicio.naviera_nombre}
                          </option>
                        ))
                      )}
                    </select>
                    <button
                      type="button"
                      onClick={agregarServicioUnico}
                      disabled={!servicioSeleccionado}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Agregar
                    </button>
                  </div>
                  {serviciosDisponibles.length > 0 && (
                    <p className="text-xs text-gray-500 mt-2">
                      <strong>{serviciosDisponibles.length}</strong> servicio(s) único(s) disponible(s) para agregar al consorcio
                    </p>
                  )}
                </label>
              </div>
              )}

              {/* Servicios únicos incluidos */}
              {formData.servicios_unicos.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">Servicios Únicos Incluidos en el Consorcio</h4>
                    <span className="text-xs text-gray-500 bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded">
                      {formData.servicios_unicos.length} servicio(s)
                    </span>
                  </div>
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
                disabled={
                  (modoConversion && (!servicioBase || navierasAdicionales.length === 0)) ||
                  (!modoConversion && !modoAgregarNavieras && formData.servicios_unicos.length === 0) ||
                  (modoAgregarNavieras && formData.servicios_unicos.length === 0)
                }
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded"
              >
                <Save className="h-4 w-4" />
                {editingConsorcio
                  ? 'Guardar Cambios'
                  : modoConversion
                  ? 'Crear Consorcio con Navieras Adicionales'
                  : modoAgregarNavieras
                  ? 'Crear Consorcio con Servicios Seleccionados'
                  : 'Crear Consorcio'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
