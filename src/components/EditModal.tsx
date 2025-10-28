'use client';

import { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { Registro } from '@/types/registros';
import { supabase } from '@/lib/supabase';
import { parseDateString, formatDateForDisplay, formatDateForInput } from '@/lib/date-utils';
import { calculateTransitTime } from '@/lib/transit-time-utils';

interface EditModalProps {
  record: Registro | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  navierasUnicas?: string[];
  navesUnicas?: string[];
  fletesUnicos?: string[];
  temperaturasUnicas?: string[];
  navierasNavesMapping?: Record<string, string[]>;
  consorciosNavesMapping?: Record<string, string[]>;
}

interface EditFormData {
  refAsli?: string;
  ejecutivo?: string;
  shipper?: string;
  booking?: string;
  contenedor?: string;
  naviera?: string;
  naveInicial?: string;
  especie?: string;
  temperatura?: number | null;
  cbm?: number | null;
  ct?: string;
  co2?: number | null;
  o2?: number | null;
  pol?: string;
  pod?: string;
  deposito?: string;
  etd?: string; // String para input type="date"
  eta?: string; // String para input type="date"
  tt?: number | null;
  flete?: string;
  estado?: string;
  roleadaDesde?: string;
  tipoIngreso?: string;
  numeroBl?: string;
  estadoBl?: string;
  contrato?: string;
  semanaIngreso?: number | null;
  mesIngreso?: number | null;
  semanaZarpe?: number | null;
  mesZarpe?: number | null;
  semanaArribo?: number | null;
  mesArribo?: number | null;
  facturacion?: string;
  bookingPdf?: string;
  comentario?: string;
  observacion?: string;
  viaje?: string;
  ingresoStacking?: string; // String para input type="date"
}

export function EditModal({ record, isOpen, onClose, onSuccess, navierasUnicas = [], navesUnicas = [], fletesUnicos = [], temperaturasUnicas = [], navierasNavesMapping = {}, consorciosNavesMapping = {} }: EditModalProps) {
  
  // Función para procesar contenedores múltiples
  const processContainers = (containerValue: string): string | string[] => {
    if (!containerValue || containerValue.trim() === '') {
      return '';
    }
    
    // Si contiene espacios, es múltiple - convertir a lista
    if (containerValue.includes(' ')) {
      return containerValue.split(/\s+/).filter(container => container.trim() !== '');
    }
    
    // Si es uno solo, mantener como string
    return containerValue.trim();
  };
  const [formData, setFormData] = useState<EditFormData>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Inicializar el formulario cuando se abre el modal
  useEffect(() => {
    if (record) {
      setFormData({
        refAsli: record.refAsli || '',
        ejecutivo: record.ejecutivo || '',
        shipper: record.shipper || '',
        booking: record.booking || '',
        contenedor: record.contenedor || '',
        naviera: record.naviera || '',
        naveInicial: record.naveInicial || '',
        especie: record.especie || '',
        temperatura: record.temperatura || null,
        cbm: record.cbm || null,
        ct: record.ct || '',
        co2: record.co2 || null,
        o2: record.o2 || null,
        pol: record.pol || '',
        pod: record.pod || '',
        deposito: record.deposito || '',
        etd: record.etd ? formatDateForInput(record.etd) : '',
        eta: record.eta ? formatDateForInput(record.eta) : '',
        tt: record.tt || null,
        flete: record.flete || '',
        estado: record.estado || 'PENDIENTE',
        roleadaDesde: record.roleadaDesde || '',
        tipoIngreso: record.tipoIngreso || 'NORMAL',
        numeroBl: record.numeroBl || '',
        estadoBl: record.estadoBl || '',
        contrato: record.contrato || '',
        facturacion: record.facturacion || '',
        bookingPdf: record.bookingPdf || '',
        comentario: record.comentario || '',
        observacion: record.observacion || '',
      });
      setError('');
    }
  }, [record]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!record || !record.id) return;

    setLoading(true);
    setError('');

    try {
      // Convertir datos del formulario al formato de Supabase
      const updatedData: any = {
        ref_asli: formData.refAsli,
        ejecutivo: formData.ejecutivo,
        shipper: formData.shipper,
        booking: formData.booking,
        contenedor: formData.contenedor ? processContainers(formData.contenedor) : '',
        naviera: formData.naviera,
        nave_inicial: formData.naveInicial,
        especie: formData.especie,
        temperatura: formData.temperatura === null ? null : formData.temperatura,
        cbm: formData.cbm === null ? null : formData.cbm,
        ct: formData.ct,
        co2: formData.co2 === null ? null : formData.co2,
        o2: formData.o2 === null ? null : formData.o2,
        pol: formData.pol,
        pod: formData.pod,
        deposito: formData.deposito,
        etd: formData.etd ? parseDateString(formData.etd).toISOString() : null,
        eta: formData.eta ? parseDateString(formData.eta).toISOString() : null,
        tt: (() => {
          const etdDate = formData.etd ? parseDateString(formData.etd) : null;
          const etaDate = formData.eta ? parseDateString(formData.eta) : null;
          return calculateTransitTime(etdDate, etaDate);
        })(),
        flete: formData.flete,
        estado: formData.estado,
        roleada_desde: formData.roleadaDesde,
        ingreso_stacking: formData.ingresoStacking ? new Date(formData.ingresoStacking).toISOString() : null,
        tipo_ingreso: formData.tipoIngreso,
        numero_bl: formData.numeroBl,
        estado_bl: formData.estadoBl,
        contrato: formData.contrato,
        semana_ingreso: formData.semanaIngreso === null ? null : formData.semanaIngreso,
        mes_ingreso: formData.mesIngreso === null ? null : formData.mesIngreso,
        semana_zarpe: formData.semanaZarpe === null ? null : formData.semanaZarpe,
        mes_zarpe: formData.mesZarpe === null ? null : formData.mesZarpe,
        semana_arribo: formData.semanaArribo === null ? null : formData.semanaArribo,
        mes_arribo: formData.mesArribo === null ? null : formData.mesArribo,
        facturacion: formData.facturacion,
        booking_pdf: formData.bookingPdf,
        comentario: formData.comentario,
        observacion: formData.observacion,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('registros')
        .update(updatedData)
        .eq('id', record.id);

      if (error) {
        console.error('Error al actualizar registro:', error);
        setError('Error al actualizar el registro. Por favor, intenta de nuevo.');
        return;
      }
      
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error al actualizar registro:', err);
      setError('Error al actualizar el registro. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Si cambia la naviera, limpiar la nave seleccionada
    if (name === 'naviera') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        naveInicial: '', // Limpiar nave cuando cambia naviera
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  // Función para obtener naves de consorcios especiales
  const getConsorcioNaves = (naviera: string) => {
    // Casos especiales de consorcios
    const consorciosEspeciales: Record<string, string[]> = {
      'HAPAG-LLOYD': ['HAPAG-LLOYD / ONE / MSC'],
      'ONE': ['HAPAG-LLOYD / ONE / MSC'],
      'MSC': ['HAPAG-LLOYD / ONE / MSC'],
      'PIL': ['PIL / YANG MING / WAN HAI'],
      'YANG MING': ['PIL / YANG MING / WAN HAI'],
      'WAN HAI': ['PIL / YANG MING / WAN HAI'],
    };

    return consorciosEspeciales[naviera] || [];
  };

  // Obtener naves disponibles basadas en la naviera seleccionada
  const getAvailableNaves = () => {
    if (!formData.naviera) return navesUnicas;
    
    // Obtener naves directas de la naviera
    const navieraNaves = navierasNavesMapping[formData.naviera] || [];
    
    // Obtener naves de consorcios especiales
    const consorciosEspeciales = getConsorcioNaves(formData.naviera);
    const consorcioNaves: string[] = [];
    
    consorciosEspeciales.forEach(consorcio => {
      const navesDelConsorcio = consorciosNavesMapping[consorcio] || [];
      consorcioNaves.push(...navesDelConsorcio);
    });
    
    // Obtener naves de consorcios generales
    const consorcioGeneralNaves = consorciosNavesMapping[formData.naviera] || [];
    
    // Combinar todas las naves y eliminar duplicados
    const todasLasNaves = [...navieraNaves, ...consorcioNaves, ...consorcioGeneralNaves];
    return [...new Set(todasLasNaves)].sort();
  };

  if (!isOpen || !record) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">
            Editar Registro: {record.refAsli}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-red-700">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm">{error}</span>
          </div>
        )}

                 {/* Form */}
         <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-3">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                           {/* Sección de Información (Solo lectura) */}
              <div className="md:col-span-2 mb-3">
                <h3 className="text-xs font-bold text-gray-900 mb-1">Información del Registro (Solo lectura)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-2 bg-gray-50 rounded-lg">
                                     <div>
                     <label className="block text-xs font-medium text-gray-900 mb-0.5">REF ASLI</label>
                     <div
                                               className={`w-full px-2 py-1 text-xs border border-gray-300 rounded font-semibold ${
                          formData.tipoIngreso === 'EARLY' 
                            ? 'bg-cyan-500 text-white' 
                            : formData.tipoIngreso === 'LATE' 
                            ? 'bg-yellow-500 text-white' 
                            : formData.tipoIngreso === 'EXTRA LATE' 
                            ? 'bg-red-500 text-white' 
                                                         : 'bg-green-500 text-white'
                        }`}
                     >
                       {formData.refAsli || ''}
                     </div>
                   </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-0.5">Ejecutivo</label>
                    <input
                      type="text"
                      value={formData.ejecutivo || ''}
                      disabled
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-white text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-0.5">Cliente</label>
                    <input
                      type="text"
                      value={formData.shipper || ''}
                      disabled
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-white text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-0.5">Nave</label>
                    <input
                      type="text"
                      value={formData.naveInicial || ''}
                      disabled
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-white text-gray-900"
                    />
                  </div>
                </div>
              </div>

              {/* Sección Editable */}
              <div className="md:col-span-2">
                <h3 className="text-xs font-bold text-blue-800 mb-1">Campos Editables</h3>
              </div>

              {/* Booking */}
              <div>
                <label className="block text-xs font-medium text-gray-900 mb-0.5">
                  Booking
                </label>
                <input
                  type="text"
                  name="booking"
                  value={formData.booking || ''}
                  onChange={handleChange}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
              </div>

              {/* Contenedor */}
              <div>
                <label className="block text-xs font-medium text-gray-900 mb-0.5">
                  Contenedor
                </label>
                <input
                  type="text"
                  name="contenedor"
                  value={formData.contenedor || ''}
                  onChange={handleChange}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
              </div>

              {/* Naviera */}
              <div>
                <label className="block text-xs font-medium text-gray-900 mb-0.5">
                  Naviera
                </label>
                <select
                  name="naviera"
                  value={formData.naviera || ''}
                  onChange={handleChange}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                >
                  <option value="">Seleccionar...</option>
                  {navierasUnicas.map((nav) => (
                    <option key={nav} value={nav}>{nav}</option>
                  ))}
                </select>
              </div>

              {/* Nave */}
              <div>
                <label className="block text-xs font-medium text-gray-900 mb-0.5">
                  Nave
                </label>
                <select
                  name="naveInicial"
                  value={formData.naveInicial || ''}
                  onChange={handleChange}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                >
                  <option value="">Seleccionar...</option>
                  {getAvailableNaves().map((nave) => (
                    <option key={nave} value={nave}>{nave}</option>
                  ))}
                </select>
                {getAvailableNaves().length === 0 && formData.naviera && (
                  <p className="text-xs text-gray-700 mt-1">
                    No hay naves disponibles para esta naviera
                  </p>
                )}
              </div>

                           {/* Estado */}
              <div>
                <label className="block text-xs font-medium text-gray-900 mb-0.5">
                  Estado *
                </label>
                <select
                  name="estado"
                  value={formData.estado || 'PENDIENTE'}
                  onChange={handleChange}
                  required
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                >
                  <option value="PENDIENTE">PENDIENTE</option>
                  <option value="CONFIRMADO">CONFIRMADO</option>
                  <option value="CANCELADO">CANCELADO</option>
                </select>
              </div>

                             {/* Tipo Ingreso */}
               <div>
                 <label className="block text-xs font-medium text-gray-900 mb-0.5">
                   Tipo Ingreso
                 </label>
                 <select
                   name="tipoIngreso"
                   value={formData.tipoIngreso || 'NORMAL'}
                   onChange={handleChange}
                   className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-semibold"
                                       style={{
                      backgroundColor: formData.tipoIngreso === 'EARLY' ? '#06b6d4' : 
                                      formData.tipoIngreso === 'LATE' ? '#eab308' : 
                                      formData.tipoIngreso === 'EXTRA LATE' ? '#ef4444' : 
                                      formData.tipoIngreso === 'NORMAL' ? '#22c55e' : 'white',
                      color: 'white'
                    }}
                 >
                                       <option value="NORMAL" style={{ backgroundColor: '#22c55e', color: 'white' }}>NORMAL</option>
                    <option value="EARLY" style={{ backgroundColor: '#06b6d4', color: 'white' }}>EARLY</option>
                   <option value="LATE" style={{ backgroundColor: '#eab308', color: 'white' }}>LATE</option>
                   <option value="EXTRA LATE" style={{ backgroundColor: '#ef4444', color: 'white' }}>EXTRA LATE</option>
                 </select>
               </div>

                            {/* ETD */}
               <div>
                 <label className="block text-xs font-medium text-gray-900 mb-0.5">
                   ETD
                 </label>
                 <input
                   type="date"
                   name="etd"
                   value={formData.etd || ''}
                   onChange={(e) => {
                     setFormData(prev => ({ ...prev, etd: e.target.value }));
                   }}
                   className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                 />
               </div>

               {/* ETA */}
               <div>
                 <label className="block text-xs font-medium text-gray-900 mb-0.5">
                   ETA
                 </label>
                 <input
                   type="date"
                   name="eta"
                   value={formData.eta || ''}
                   onChange={(e) => {
                     setFormData(prev => ({ ...prev, eta: e.target.value }));
                   }}
                   className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                 />
               </div>

                                                           {/* Temperatura */}
                <div>
                  <label className="block text-xs font-medium text-gray-900 mb-0.5">
                    Temperatura (°C)
                  </label>
                  <select
                    name="temperatura"
                    value={formData.temperatura || ''}
                    onChange={handleChange}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  >
                    <option value="">Seleccionar temperatura</option>
                    {Array.from({ length: 21 }, (_, i) => {
                      const temp = -1 + (i * 0.1);
                      return (
                        <option key={temp} value={temp.toFixed(1)}>
                          {temp.toFixed(1)}°C
                        </option>
                      );
                    })}
                  </select>
                </div>

               {/* CBM */}
               <div>
                 <label className="block text-xs font-medium text-gray-900 mb-0.5">
                   CBM
                 </label>
                 <select
                   name="cbm"
                   value={formData.cbm || ''}
                   onChange={handleChange}
                   className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                 >
                   <option value="">Seleccionar...</option>
                   {[10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90].map((cbm) => (
                     <option key={cbm} value={cbm}>{cbm} CBM</option>
                   ))}
                 </select>
               </div>

               {/* Flete */}
               <div>
                 <label className="block text-xs font-medium text-gray-900 mb-0.5">
                   Flete
                 </label>
                 <select
                   name="flete"
                   value={formData.flete || ''}
                   onChange={handleChange}
                   className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                 >
                   <option value="">Seleccionar...</option>
                   {fletesUnicos.map((flete) => (
                     <option key={flete} value={flete}>{flete}</option>
                   ))}
                 </select>
               </div>

              {/* Comentario */}
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-900 mb-0.5">
                  Comentario
                </label>
                <textarea
                  name="comentario"
                  value={formData.comentario || ''}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
              </div>
           </div>
         </form>

                 {/* Footer */}
         <div className="flex items-center justify-end space-x-2 p-3 border-t border-gray-200">
           <button
             type="button"
             onClick={onClose}
             className="px-3 py-1.5 text-xs border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition-colors"
           >
             Cancelar
           </button>
           <button
             type="submit"
             onClick={handleSubmit}
             disabled={loading}
             className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-1"
           >
             {loading ? (
               <>
                 <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                 <span>Guardando...</span>
               </>
             ) : (
               <>
                 <Save className="h-3 w-3" />
                 <span>Guardar</span>
               </>
             )}
           </button>
         </div>
      </div>
    </div>
  );
}
