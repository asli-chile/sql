'use client';

import { useState, useEffect } from 'react';
import { X, Save, Trash2, Plus, Ship, Calendar, MapPin, Navigation } from 'lucide-react';
import type { ItinerarioWithEscalas, ItinerarioEscala } from '@/types/itinerarios';
import { createClient } from '@/lib/supabase-browser';
import { useToast } from '@/hooks/useToast';
import { useTheme } from '@/contexts/ThemeContext';

const AREAS = [
  'ASIA',
  'EUROPA',
  'AMERICA',
  'INDIA-MEDIOORIENTE',
] as const;

interface VoyageDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  itinerario: ItinerarioWithEscalas | null;
  onSave?: () => void;
  onDelete?: () => void;
}

export function VoyageDrawer({
  isOpen,
  onClose,
  itinerario,
  onSave,
  onDelete,
}: VoyageDrawerProps) {
  const { theme } = useTheme();
  const { success, error } = useToast();
  const [escalas, setEscalas] = useState<ItinerarioEscala[]>([]);
  const [pol, setPol] = useState<string>('');
  const [pols, setPols] = useState<string[]>([]);
  const [etd, setEtd] = useState<string>('');
  const [viaje, setViaje] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Nuevos estados para edición
  const [servicioId, setServicioId] = useState<string>('');
  const [servicioNombre, setServicioNombre] = useState<string>('');
  const [nave, setNave] = useState<string>('');
  const [consorcio, setConsorcio] = useState<string | null>(null);
  const [serviciosDisponibles, setServiciosDisponibles] = useState<Array<{ id: string; nombre: string; consorcio: string | null; tipo: 'servicio_unico' | 'consorcio' }>>([]);
  const [navesDisponibles, setNavesDisponibles] = useState<string[]>([]);
  const [loadingCatalogos, setLoadingCatalogos] = useState(false);

  // Función para calcular el número de semana del año basado en el ETD
  const calcularSemana = (fecha: Date): number => {
    const d = new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  // Cargar catálogos (POLs, servicios, naves)
  useEffect(() => {
    const cargarCatalogos = async () => {
      if (!isOpen) return;
      
      try {
        setLoadingCatalogos(true);
        const supabase = createClient();
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

        // Cargar en paralelo
        const [
          { data: registrosData },
          serviciosUnicosResponse,
          consorciosResponse,
          { data: navesData }
        ] = await Promise.all([
          // POLs
          supabase
            .from('registros')
            .select('pol')
            .not('pol', 'is', null)
            .is('deleted_at', null),
          // Servicios únicos
          fetch(`${apiUrl}/api/admin/servicios-unicos`).then(r => r.json()).catch(() => ({ servicios: [] })),
          // Consorcios
          fetch(`${apiUrl}/api/admin/consorcios`).then(r => r.json()).catch(() => ({ consorcios: [] })),
          // Naves
          supabase
            .from('catalogos_naves')
            .select('nombre')
            .eq('activo', true)
            .order('nombre')
        ]);

        // Procesar POLs
        if (registrosData) {
          const polsUnicos = Array.from(
            new Set(registrosData.map((r: any) => r.pol).filter(Boolean))
          ).sort() as string[];
          setPols(polsUnicos);
        }

        // Procesar servicios únicos y consorcios
        const serviciosList: Array<{ id: string; nombre: string; consorcio: string | null; tipo: 'servicio_unico' | 'consorcio' }> = [];
        
        if (serviciosUnicosResponse?.servicios) {
          serviciosUnicosResponse.servicios
            .filter((s: any) => s.activo)
            .forEach((servicio: any) => {
              serviciosList.push({
                id: servicio.id,
                nombre: servicio.nombre,
                consorcio: servicio.naviera_nombre || null,
                tipo: 'servicio_unico',
              });
            });
        }

        if (consorciosResponse?.consorcios) {
          consorciosResponse.consorcios
            .filter((c: any) => c.activo)
            .forEach((consorcio: any) => {
              serviciosList.push({
                id: consorcio.id,
                nombre: consorcio.nombre,
                consorcio: 'Consorcio',
                tipo: 'consorcio',
              });
            });
        }

        serviciosList.sort((a, b) => a.nombre.localeCompare(b.nombre));
        setServiciosDisponibles(serviciosList);

        // Procesar naves
        if (navesData) {
          const navesList = [...new Set(navesData.map((n: any) => n.nombre).filter(Boolean))].sort();
          setNavesDisponibles(navesList);
        }
      } catch (err) {
        console.error('Error cargando catálogos:', err);
      } finally {
        setLoadingCatalogos(false);
      }
    };

    if (isOpen) {
      cargarCatalogos();
    }
  }, [isOpen]);

  useEffect(() => {
    if (itinerario) {
      setEscalas(
        [...(itinerario.escalas || [])].map(e => ({
          ...e,
          area: e.area || 'ASIA' // Asegurar que siempre tenga un área por defecto
        })).sort((a, b) => a.orden - b.orden)
      );
      setPol(itinerario.pol || '');
      setEtd(itinerario.etd ? itinerario.etd.split('T')[0] : '');
      setViaje(itinerario.viaje || '');
      setNave(itinerario.nave || '');
      setConsorcio(itinerario.consorcio || null);
      setServicioNombre(itinerario.servicio || '');
      
      // Buscar el servicio en la lista de disponibles para establecer el ID
      if (serviciosDisponibles.length > 0 && itinerario.servicio) {
        const servicioEncontrado = serviciosDisponibles.find(
          s => s.nombre === itinerario.servicio
        );
        if (servicioEncontrado) {
          setServicioId(servicioEncontrado.id);
        }
      }
    }
  }, [itinerario, serviciosDisponibles]);

  if (!isOpen || !itinerario) return null;

  const calcularDiasTransito = (etdValue: string, etaValue: string): number | null => {
    if (!etdValue || !etaValue) return null;
    
    try {
      // Parsear fechas en zona horaria local
      const [añoEtd, mesEtd, diaEtd] = etdValue.includes('T') ? etdValue.split('T')[0].split('-') : etdValue.split('-');
      const [añoEta, mesEta, diaEta] = etaValue.includes('T') ? etaValue.split('T')[0].split('-') : etaValue.split('-');
      
      const etdDate = new Date(parseInt(añoEtd), parseInt(mesEtd) - 1, parseInt(diaEtd), 12, 0, 0);
      const etaDate = new Date(parseInt(añoEta), parseInt(mesEta) - 1, parseInt(diaEta), 12, 0, 0);
      
      const diffTime = etaDate.getTime() - etdDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays >= 0 ? diffDays : null;
    } catch {
      return null;
    }
  };

  const handleEtaChange = (escalaId: string, eta: string) => {
    setEscalas((prev) =>
      prev.map((e) => {
        if (e.id === escalaId) {
          const newEta = eta || null;
          // Calcular días de tránsito si hay ETD y ETA
          let diasTransito = e.dias_transito;
          const etdValue = etd || itinerario.etd || '';
          if (etdValue && newEta) {
            const calculado = calcularDiasTransito(etdValue, newEta);
            diasTransito = calculado;
          }
          return { ...e, eta: newEta, dias_transito: diasTransito };
        }
        return e;
      })
    );
  };

  const handleEtdChange = (newEtd: string) => {
    setEtd(newEtd);
    // Recalcular días de tránsito para todas las escalas cuando cambia el ETD
    if (newEtd) {
      setEscalas((prev) =>
        prev.map((e) => {
          if (e.eta) {
            const calculado = calcularDiasTransito(newEtd, e.eta);
            return { ...e, dias_transito: calculado };
          }
          return e;
        })
      );
    }
  };

  const handleAddEscala = () => {
    const newEscala: Partial<ItinerarioEscala> = {
      id: `temp-${Date.now()}`,
      itinerario_id: itinerario.id,
      puerto: '',
      puerto_nombre: null,
      eta: null,
      dias_transito: null,
      orden: escalas.length + 1,
      area: 'ASIA',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setEscalas([...escalas, newEscala as ItinerarioEscala]);
  };

  const handleRemoveEscala = (escalaId: string) => {
    setEscalas((prev) => prev.filter((e) => e.id !== escalaId));
  };

  const isReadOnly = !onSave || !onDelete;

  const handleSave = async () => {
    if (!itinerario || !onSave) return;

    setIsSaving(true);
    try {
      const supabase = createClient();

      // Formatear ETD en zona horaria local para evitar pérdida de días
      let etdFormateada = null;
      let semanaCalculada = null;
      if (etd) {
        const [año, mes, dia] = etd.split('-');
        const fechaLocal = new Date(parseInt(año), parseInt(mes) - 1, parseInt(dia), 12, 0, 0);
        etdFormateada = fechaLocal.toISOString();
        // Calcular la semana basada en el ETD
        semanaCalculada = calcularSemana(fechaLocal);
      }

      // Determinar el servicio final y consorcio
      let servicioFinal = servicioNombre;
      let consorcioFinal = consorcio;
      
      if (servicioId) {
        const servicioSeleccionado = serviciosDisponibles.find(s => s.id === servicioId);
        if (servicioSeleccionado) {
          servicioFinal = servicioSeleccionado.nombre;
          // Si es consorcio, usar el nombre del consorcio; si es servicio único, usar su consorcio
          if (servicioSeleccionado.tipo === 'consorcio') {
            consorcioFinal = servicioSeleccionado.nombre;
          } else {
            consorcioFinal = servicioSeleccionado.consorcio || null;
          }
        }
      }

      // Actualizar el itinerario con todos los campos editables
      const updateData: any = {
        servicio: servicioFinal || itinerario.servicio,
        consorcio: consorcioFinal,
        nave: nave || itinerario.nave,
        pol: pol || null,
        etd: etdFormateada,
        semana: semanaCalculada,
        viaje: viaje || null,
        updated_at: new Date().toISOString(),
      };

      // Si se proporciona servicio_id, incluirlo
      if (servicioId) {
        updateData.servicio_id = servicioId;
      }

      const { error: updateError } = await supabase
        .from('itinerarios')
        .update(updateData)
        .eq('id', itinerario.id);

      if (updateError) throw updateError;

      // Eliminar escalas existentes y crear nuevas
      const { error: deleteError } = await supabase
        .from('itinerario_escalas')
        .delete()
        .eq('itinerario_id', itinerario.id);

      if (deleteError) throw deleteError;

      // Insertar escalas actualizadas
      const escalasToInsert = escalas
        .filter((e) => e.puerto) // Solo escalas con puerto
        .map((e, index) => {
          // Convertir fecha ETA a formato ISO con hora local (no UTC) para evitar pérdida de días
          let etaFormateada = e.eta;
          if (etaFormateada && !etaFormateada.includes('T')) {
            // Si es formato YYYY-MM-DD, crear fecha en zona horaria local
            const [año, mes, dia] = etaFormateada.split('-');
            const fechaLocal = new Date(parseInt(año), parseInt(mes) - 1, parseInt(dia), 12, 0, 0); // Usar mediodía para evitar problemas de zona horaria
            
            // Convertir a ISO string - al usar mediodía, la conversión a UTC no cambiará el día
            etaFormateada = fechaLocal.toISOString();
          }
          
          return {
            itinerario_id: itinerario.id,
            puerto: e.puerto,
            puerto_nombre: e.puerto_nombre,
            eta: etaFormateada,
            dias_transito: e.dias_transito,
            orden: index + 1,
            area: e.area || 'ASIA',
          };
        });

      if (escalasToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('itinerario_escalas')
          .insert(escalasToInsert);

        if (insertError) throw insertError;
      }

      success('Itinerario actualizado correctamente');
      onSave();
      onClose();
    } catch (err: any) {
      console.error('Error guardando itinerario:', err);
      error(err?.message || 'Error al guardar el itinerario');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!itinerario || !onDelete) return;
    if (!confirm('¿Estás seguro de eliminar este viaje? Esta acción no se puede deshacer.')) {
      return;
    }

    setIsDeleting(true);
    try {
      const supabase = createClient();
      const { error: deleteError } = await supabase
        .from('itinerarios')
        .delete()
        .eq('id', itinerario.id);

      if (deleteError) throw deleteError;

      success('Viaje eliminado correctamente');
      onDelete();
      onClose();
    } catch (err: any) {
      console.error('Error eliminando itinerario:', err);
      error(err?.message || 'Error al eliminar el viaje');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-300 ${
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`absolute right-0 top-0 h-full w-full max-w-2xl ${theme === 'dark' 
          ? 'bg-gradient-to-b from-[#1A1A1A] to-[#0F0F0F]' 
          : 'bg-gradient-to-b from-gray-50 to-white'
        } shadow-2xl transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className={`sticky top-0 z-10 border-b backdrop-blur-xl ${theme === 'dark' 
            ? 'border-[#3D3D3D]/50 bg-gradient-to-r from-[#0078D4]/20 via-[#00AEEF]/20 to-[#0078D4]/20' 
            : 'border-[#E1E1E1] bg-gradient-to-r from-[#00AEEF]/10 via-white to-[#00AEEF]/10'
          } px-4 sm:px-6 py-4 shadow-lg`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className={`p-2 rounded-xl flex-shrink-0 ${theme === 'dark' ? 'bg-[#00AEEF]/20' : 'bg-[#00AEEF]/10'}`}>
                  <Ship className={`h-5 w-5 sm:h-6 sm:w-6 ${theme === 'dark' ? 'text-[#4FC3F7]' : 'text-[#00AEEF]'}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className={`text-lg sm:text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-[#1F1F1F]'}`}>
                    Detalle de Viaje
                  </h2>
                  <p className={`text-xs sm:text-sm truncate ${theme === 'dark' ? 'text-[#A0A0A0]' : 'text-[#6B6B6B]'}`}>
                    {itinerario.servicio}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className={`p-2 sm:p-2.5 rounded-xl transition-all duration-200 flex-shrink-0 ${
                  theme === 'dark' 
                    ? 'hover:bg-[#3D3D3D]/80 text-[#C0C0C0] hover:text-white' 
                    : 'hover:bg-gray-100 text-[#323130] hover:text-[#1F1F1F]'
                } hover:scale-110 active:scale-95`}
              >
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6">
            {/* Información del viaje */}
            <div className="mb-6 space-y-4">
              <div className={`rounded-xl border ${theme === 'dark' 
                ? 'border-[#3D3D3D]/50 bg-gradient-to-br from-[#2D2D2D] to-[#1F1F1F]' 
                : 'border-[#E1E1E1] bg-white shadow-sm'
              } p-4 sm:p-5`}>
                <div className="flex items-center gap-2 sm:gap-3 mb-3">
                  <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-[#00AEEF]/20' : 'bg-[#00AEEF]/10'}`}>
                    <MapPin className={`h-4 w-4 ${theme === 'dark' ? 'text-[#4FC3F7]' : 'text-[#00AEEF]'}`} />
                  </div>
                  <label className={`text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-[#A0A0A0]' : 'text-[#6B6B6B]'}`}>
                    Servicio
                  </label>
                </div>
                <select
                  value={servicioId}
                  onChange={(e) => {
                    const nuevoServicioId = e.target.value;
                    setServicioId(nuevoServicioId);
                    const servicioSeleccionado = serviciosDisponibles.find(s => s.id === nuevoServicioId);
                    if (servicioSeleccionado) {
                      setServicioNombre(servicioSeleccionado.nombre);
                      if (servicioSeleccionado.tipo === 'consorcio') {
                        setConsorcio(servicioSeleccionado.nombre);
                      } else {
                        setConsorcio(servicioSeleccionado.consorcio || null);
                      }
                    }
                  }}
                  disabled={loadingCatalogos || isReadOnly}
                  className={`w-full rounded-lg border ${theme === 'dark' 
                    ? 'border-[#3D3D3D]/50 bg-[#1F1F1F] text-white' 
                    : 'border-gray-300 bg-white text-[#1F1F1F]'
                  } px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00AEEF] focus:border-transparent disabled:opacity-50 transition-all`}
                >
                  <option value="">Seleccionar servicio</option>
                  {serviciosDisponibles.map((servicio) => (
                    <option key={servicio.id} value={servicio.id}>
                      {servicio.tipo === 'servicio_unico' && servicio.consorcio 
                        ? `${servicio.nombre} (${servicio.consorcio})` 
                        : servicio.nombre}
                    </option>
                  ))}
                </select>
                {!servicioId && (
                  <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-[#A0A0A0]' : 'text-[#6B6B6B]'}`}>
                    Actual: {itinerario.servicio}
                  </p>
                )}
              </div>
              <div className={`rounded-xl border ${theme === 'dark' 
                ? 'border-[#3D3D3D]/50 bg-gradient-to-br from-[#2D2D2D] to-[#1F1F1F]' 
                : 'border-[#E1E1E1] bg-white shadow-sm'
              } p-4 sm:p-5`}>
                <div className="flex items-center gap-2 sm:gap-3 mb-3">
                  <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-[#00AEEF]/20' : 'bg-[#00AEEF]/10'}`}>
                    <Ship className={`h-4 w-4 ${theme === 'dark' ? 'text-[#4FC3F7]' : 'text-[#00AEEF]'}`} />
                  </div>
                  <label className={`text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-[#A0A0A0]' : 'text-[#6B6B6B]'}`}>
                    Nave
                  </label>
                </div>
                <select
                  value={nave}
                  onChange={(e) => setNave(e.target.value)}
                  disabled={loadingCatalogos || isReadOnly}
                  className={`w-full rounded-lg border ${theme === 'dark' 
                    ? 'border-[#3D3D3D]/50 bg-[#1F1F1F] text-white' 
                    : 'border-gray-300 bg-white text-[#1F1F1F]'
                  } px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00AEEF] focus:border-transparent disabled:opacity-50 transition-all`}
                >
                  <option value="">Seleccionar nave</option>
                  {navesDisponibles.map((naveOption) => (
                    <option key={naveOption} value={naveOption}>
                      {naveOption}
                    </option>
                  ))}
                </select>
              </div>
              {consorcio && (
                <div className={`rounded-xl border ${theme === 'dark' 
                  ? 'border-[#3D3D3D]/50 bg-gradient-to-br from-[#2D2D2D] to-[#1F1F1F]' 
                  : 'border-[#E1E1E1] bg-white shadow-sm'
                } p-4 sm:p-5`}>
                  <div className="flex items-center gap-2 sm:gap-3 mb-2">
                    <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-[#00AEEF]/20' : 'bg-[#00AEEF]/10'}`}>
                      <Ship className={`h-4 w-4 ${theme === 'dark' ? 'text-[#4FC3F7]' : 'text-[#00AEEF]'}`} />
                    </div>
                    <label className={`text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-[#A0A0A0]' : 'text-[#6B6B6B]'}`}>
                      Consorcio/Naviera
                    </label>
                  </div>
                  <p className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-[#1F1F1F]'}`}>
                    {consorcio}
                  </p>
                </div>
              )}
              <div className={`rounded-xl border ${theme === 'dark' 
                ? 'border-[#3D3D3D]/50 bg-gradient-to-br from-[#2D2D2D] to-[#1F1F1F]' 
                : 'border-[#E1E1E1] bg-white shadow-sm'
              } p-4 sm:p-5`}>
                <div className="flex items-center gap-2 sm:gap-3 mb-3">
                  <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-[#00AEEF]/20' : 'bg-[#00AEEF]/10'}`}>
                    <Navigation className={`h-4 w-4 ${theme === 'dark' ? 'text-[#4FC3F7]' : 'text-[#00AEEF]'}`} />
                  </div>
                  <label className={`text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-[#A0A0A0]' : 'text-[#6B6B6B]'}`}>
                    Viaje
                  </label>
                </div>
                <input
                  type="text"
                  value={viaje}
                  onChange={(e) => setViaje(e.target.value)}
                  placeholder="Número de viaje"
                  disabled={isReadOnly}
                  className={`w-full rounded-lg border ${theme === 'dark' 
                    ? 'border-[#3D3D3D]/50 bg-[#1F1F1F] text-white placeholder:text-[#6B6B6B]' 
                    : 'border-gray-300 bg-white text-[#1F1F1F] placeholder:text-gray-400'
                  } px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00AEEF] focus:border-transparent disabled:opacity-50 transition-all`}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className={`rounded-xl border ${theme === 'dark' 
                  ? 'border-[#3D3D3D]/50 bg-gradient-to-br from-[#2D2D2D] to-[#1F1F1F]' 
                  : 'border-[#E1E1E1] bg-white shadow-sm'
                } p-4 sm:p-5`}>
                  <div className="flex items-center gap-2 sm:gap-3 mb-2">
                    <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
                      <Calendar className={`h-4 w-4 ${theme === 'dark' ? 'text-[#A0A0A0]' : 'text-[#6B6B6B]'}`} />
                    </div>
                    <label className={`text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-[#A0A0A0]' : 'text-[#6B6B6B]'}`}>
                      Semana
                    </label>
                  </div>
                  <p className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-[#1F1F1F]'}`}>
                    {itinerario.semana || '—'}
                  </p>
                </div>
                <div className={`rounded-xl border ${theme === 'dark' 
                  ? 'border-emerald-500/30 bg-gradient-to-br from-emerald-900/20 to-[#1F1F1F]' 
                  : 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-white shadow-sm'
                } p-4 sm:p-5`}>
                  <div className="flex items-center gap-2 sm:gap-3 mb-3">
                    <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-emerald-500/20' : 'bg-emerald-100'}`}>
                      <MapPin className={`h-4 w-4 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`} />
                    </div>
                    <label className={`text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-emerald-300' : 'text-emerald-700'}`}>
                      POL
                    </label>
                  </div>
                  <select
                    value={pol}
                    onChange={(e) => setPol(e.target.value)}
                    disabled={isReadOnly}
                    className={`w-full rounded-lg border ${theme === 'dark' 
                      ? 'border-emerald-500/30 bg-[#1F1F1F] text-white' 
                      : 'border-emerald-300 bg-white text-emerald-900'
                    } px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50 transition-all`}
                  >
                    <option value="">Seleccionar POL</option>
                    {pols.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className={`rounded-xl border ${theme === 'dark' 
                ? 'border-emerald-500/30 bg-gradient-to-br from-emerald-900/20 to-[#1F1F1F]' 
                : 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-white shadow-sm'
              } p-4 sm:p-5`}>
                <div className="flex items-center gap-2 sm:gap-3 mb-3">
                  <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-emerald-500/20' : 'bg-emerald-100'}`}>
                    <Calendar className={`h-4 w-4 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`} />
                  </div>
                  <label className={`text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-emerald-300' : 'text-emerald-700'}`}>
                    ETD
                  </label>
                </div>
                <input
                  type="date"
                  value={etd}
                  onChange={(e) => handleEtdChange(e.target.value)}
                  disabled={isReadOnly}
                  className={`w-full rounded-lg border ${theme === 'dark' 
                    ? 'border-emerald-500/30 bg-[#1F1F1F] text-white' 
                    : 'border-emerald-300 bg-white text-emerald-900'
                  } px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50 transition-all`}
                />
              </div>
            </div>

            {/* Divider */}
            <div className={`border-t my-6 ${theme === 'dark' ? 'border-[#3D3D3D]' : 'border-[#E1E1E1]'}`} />

            {/* Escalas */}
            <div>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-[#00AEEF]/20' : 'bg-[#00AEEF]/10'}`}>
                    <Navigation className={`h-5 w-5 ${theme === 'dark' ? 'text-[#4FC3F7]' : 'text-[#00AEEF]'}`} />
                  </div>
                  <h3 className={`text-base sm:text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-[#1F1F1F]'}`}>
                    Escalas (PODs)
                  </h3>
                </div>
                {!isReadOnly && (
                  <button
                    onClick={handleAddEscala}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 shadow-sm hover:shadow-md hover:scale-105 active:scale-95 ${
                      theme === 'dark'
                        ? 'bg-gradient-to-r from-[#00AEEF]/20 to-[#0078D4]/20 text-[#4FC3F7] hover:from-[#00AEEF]/30 hover:to-[#0078D4]/30 border border-[#00AEEF]/30'
                        : 'bg-gradient-to-r from-[#00AEEF] to-[#0099CC] text-white hover:from-[#0099CC] hover:to-[#0078D4]'
                    }`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Agregar escala
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {escalas.map((escala, index) => (
                  <div
                    key={escala.id}
                    className={`rounded-xl border ${theme === 'dark' 
                      ? 'border-[#3D3D3D]/50 bg-gradient-to-br from-[#2D2D2D]/80 to-[#1F1F1F]' 
                      : 'border-[#E1E1E1] bg-gradient-to-br from-gray-50 to-white'
                    } p-4 sm:p-5 hover:shadow-lg transition-all duration-200`}
                  >
                    <div className="flex items-start gap-3 sm:gap-4 mb-3">
                      <div className={`flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center font-bold text-sm sm:text-base shadow-lg ${
                        theme === 'dark' 
                          ? 'bg-gradient-to-br from-[#00AEEF] to-[#0078D4] text-white' 
                          : 'bg-gradient-to-br from-[#00AEEF] to-[#0099CC] text-white'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        <div>
                          <label className={`block text-[10px] sm:text-xs font-semibold uppercase tracking-wide mb-1.5 ${theme === 'dark' ? 'text-[#A0A0A0]' : 'text-[#6B6B6B]'}`}>
                            Puerto
                          </label>
                          <input
                            type="text"
                            value={escala.puerto}
                            onChange={(e) => {
                              setEscalas((prev) =>
                                prev.map((esc) =>
                                  esc.id === escala.id
                                    ? { ...esc, puerto: e.target.value }
                                    : esc
                                )
                              );
                            }}
                            placeholder="Ej: YOKO"
                            disabled={isReadOnly}
                            className={`w-full rounded-lg border ${theme === 'dark' 
                              ? 'border-[#3D3D3D]/50 bg-[#1F1F1F] text-white placeholder:text-[#6B6B6B]' 
                              : 'border-gray-300 bg-white text-[#1F1F1F] placeholder:text-gray-400'
                            } px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00AEEF] focus:border-transparent disabled:opacity-50 transition-all`}
                          />
                        </div>
                        <div>
                          <label className={`block text-[10px] sm:text-xs font-semibold uppercase tracking-wide mb-1.5 ${theme === 'dark' ? 'text-[#A0A0A0]' : 'text-[#6B6B6B]'}`}>
                            Región
                          </label>
                          <select
                            value={escala.area || 'ASIA'}
                            onChange={(e) => {
                              setEscalas((prev) =>
                                prev.map((esc) =>
                                  esc.id === escala.id
                                    ? { ...esc, area: e.target.value }
                                    : esc
                                )
                              );
                            }}
                            disabled={isReadOnly}
                            className={`w-full rounded-lg border ${theme === 'dark' 
                              ? 'border-[#3D3D3D]/50 bg-[#1F1F1F] text-white' 
                              : 'border-gray-300 bg-white text-[#1F1F1F]'
                            } px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00AEEF] focus:border-transparent disabled:opacity-50 transition-all`}
                          >
                            {AREAS.map((area) => (
                              <option key={area} value={area}>
                                {area}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className={`block text-[10px] sm:text-xs font-semibold uppercase tracking-wide mb-1.5 ${theme === 'dark' ? 'text-emerald-300' : 'text-emerald-700'}`}>
                            ETA
                          </label>
                          <input
                            type="date"
                            value={escala.eta ? escala.eta.split('T')[0] : ''}
                            onChange={(e) => handleEtaChange(escala.id, e.target.value)}
                            disabled={isReadOnly}
                            className={`w-full rounded-lg border ${theme === 'dark' 
                              ? 'border-emerald-500/30 bg-[#1F1F1F] text-white' 
                              : 'border-emerald-300 bg-white text-emerald-900'
                            } px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50 transition-all`}
                          />
                        </div>
                        <div>
                          <label className={`block text-[10px] sm:text-xs font-semibold uppercase tracking-wide mb-1.5 ${theme === 'dark' ? 'text-[#4FC3F7]' : 'text-[#00AEEF]'}`}>
                            Días
                          </label>
                          <div className={`px-3 py-2 text-sm font-bold rounded-lg ${theme === 'dark' 
                            ? 'bg-[#00AEEF]/10 border border-[#00AEEF]/30 text-[#4FC3F7]' 
                            : 'bg-[#00AEEF]/5 border border-[#00AEEF]/20 text-[#00AEEF]'
                          }`}>
                            {escala.dias_transito || '—'}
                          </div>
                        </div>
                      </div>
                    </div>
                    {!isReadOnly && (
                      <button
                        onClick={() => handleRemoveEscala(escala.id)}
                        className={`mt-2 text-xs font-semibold text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors ${
                          theme === 'dark' ? 'hover:bg-red-900/20' : 'hover:bg-red-50'
                        } px-2 py-1 rounded-lg`}
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                ))}

                {escalas.length === 0 && (
                  <div className={`text-center py-8 rounded-xl border ${theme === 'dark' 
                    ? 'border-[#3D3D3D]/50 bg-[#2D2D2D]/50' 
                    : 'border-[#E1E1E1] bg-gray-50'
                  }`}>
                    <div className={`p-3 rounded-xl inline-block mb-3 ${theme === 'dark' ? 'bg-[#00AEEF]/20' : 'bg-[#00AEEF]/10'}`}>
                      <Navigation className={`h-6 w-6 ${theme === 'dark' ? 'text-[#4FC3F7]' : 'text-[#00AEEF]'}`} />
                    </div>
                    <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-[#1F1F1F]'}`}>
                      No hay escalas registradas
                    </p>
                    <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-[#A0A0A0]' : 'text-[#6B6B6B]'}`}>
                      Haz clic en &quot;Agregar escala&quot; para comenzar
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className={`border-t ${theme === 'dark' ? 'border-[#3D3D3D]' : 'border-[#E1E1E1]'} px-4 sm:px-6 py-4 flex items-center justify-between gap-3 flex-wrap`}>
            {isReadOnly ? (
              <div className="flex-1" />
            ) : (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-md hover:scale-105 active:scale-95 disabled:opacity-50 ${
                  theme === 'dark'
                    ? 'bg-red-900/30 border border-red-500/30 text-red-400 hover:bg-red-900/50'
                    : 'bg-red-50 border border-red-300 text-red-600 hover:bg-red-100'
                }`}
              >
                <Trash2 className="h-4 w-4" />
                {isDeleting ? 'Eliminando...' : 'Eliminar viaje'}
              </button>
            )}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  theme === 'dark'
                    ? 'text-slate-300 hover:text-white hover:bg-[#3D3D3D]'
                    : 'text-gray-600 hover:text-[#1F1F1F] hover:bg-gray-100'
                }`}
              >
                {isReadOnly ? 'Cerrar' : 'Cancelar'}
              </button>
              {!isReadOnly && (
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className={`relative inline-flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-semibold transition-all duration-200 overflow-hidden group shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 disabled:opacity-50 ${
                    theme === 'dark'
                      ? 'bg-gradient-to-r from-[#0078D4] to-[#00AEEF] hover:from-[#005A9E] hover:to-[#0099CC] text-white'
                      : 'bg-gradient-to-r from-[#00AEEF] to-[#0099CC] hover:from-[#0099CC] hover:to-[#0078D4] text-white'
                  }`}
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    {isSaving ? 'Guardando...' : 'Guardar cambios'}
                  </span>
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

