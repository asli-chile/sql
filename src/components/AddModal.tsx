'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { generateUniqueRefAsli, generateMultipleUniqueRefAsli } from '@/lib/ref-asli-utils';
import { createClient } from '@/lib/supabase-browser';
import { parseDateString, formatDateForInput } from '@/lib/date-utils';
import { calculateTransitTime } from '@/lib/transit-time-utils';
import { useTheme } from '@/contexts/ThemeContext';

interface AddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  ejecutivosUnicos: string[];
  clientesUnicos: string[];
  navierasUnicas: string[];
  especiesUnicas: string[];
  polsUnicos: string[];
  destinosUnicos: string[];
  depositosUnicos: string[];
  navesUnicas: string[];
  navierasNavesMapping: Record<string, string[]>;
  consorciosNavesMapping: Record<string, string[]>;
  cbmUnicos: string[];
  fletesUnicos: string[];
}

export function AddModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  ejecutivosUnicos,
  clientesUnicos,
  navierasUnicas,
  especiesUnicas,
  polsUnicos,
  destinosUnicos,
  depositosUnicos,
  navesUnicas,
  navierasNavesMapping,
  consorciosNavesMapping,
  cbmUnicos,
  fletesUnicos,
}: AddModalProps) {
  
  // Función para procesar contenedores múltiples
  const processContainers = (containerValue: string): string => {
    if (!containerValue || containerValue.trim() === '') {
      return '';
    }
    
    // Siempre devolver como texto plano con espacios
    // Limpiar espacios múltiples y mantener formato: "cont1 cont2 cont3"
    return containerValue.trim().split(/\s+/).join(' ');
  };
  const { theme } = useTheme();
  
  // Helper para obtener estilos de select según el tema
  const getSelectStyles = () => {
    return theme === 'dark'
      ? 'w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white bg-gray-700'
      : 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white';
  };

  const getLabelStyles = () => {
    return theme === 'dark' ? 'text-gray-200' : 'text-gray-900';
  };

  const getInputStyles = () => {
    return theme === 'dark'
      ? 'w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white bg-gray-700 placeholder:text-gray-400'
      : 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white placeholder:text-gray-500';
  };

  
  const viajeInputRef = React.useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    refAsli: '',
    ejecutivo: '',
    shipper: '',
    naviera: '',
    naveInicial: '',
    viaje: '',
    especie: '',
    temperatura: '',
    cbm: '',
    pol: '',
    pod: '',
    deposito: '',
    estado: 'PENDIENTE',
    tipoIngreso: 'NORMAL',
    flete: '',
    comentario: '',
    contenedor: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatingRef, setGeneratingRef] = useState(true);
  const [numberOfCopies, setNumberOfCopies] = useState(1);

  // Generar REF ASLI automáticamente al abrir el modal
  useEffect(() => {
    const generateRefAsli = async () => {
      if (!isOpen) return;
      
      setGeneratingRef(true);
      try {
        const newRefAsli = await generateUniqueRefAsli();
        setFormData(prev => ({ ...prev, refAsli: newRefAsli }));
        setGeneratingRef(false);
      } catch (error) {
        console.error('Error generando REF ASLI:', error);
        setFormData(prev => ({ ...prev, refAsli: 'A0001' }));
        setGeneratingRef(false);
      }
    };

    generateRefAsli();
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validar número de copias
    if (numberOfCopies < 1 || numberOfCopies > 10) {
      setError('El número de copias debe estar entre 1 y 10');
      setLoading(false);
      return;
    }

    // Validar campos obligatorios
    if (formData.naveInicial && !formData.viaje.trim()) {
      setError('El campo Viaje es obligatorio cuando hay una nave seleccionada');
      setLoading(false);
      // Hacer scroll hacia el campo con error
      setTimeout(() => {
        viajeInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        viajeInputRef.current?.focus();
      }, 100);
      return;
    }

    try {
      // Construir el nombre completo de la nave
      const naveCompleta = formData.naveInicial && formData.viaje.trim() 
        ? `${formData.naveInicial} [${formData.viaje.trim()}]` 
        : formData.naveInicial || '';

      // Generar REF ASLI únicos para todas las copias
      const refAsliList = await generateMultipleUniqueRefAsli(numberOfCopies);

      // Crear múltiples copias
      const baseRegistroData = {
        ejecutivo: formData.ejecutivo,
        shipper: formData.shipper,
        naviera: formData.naviera,
        nave_inicial: naveCompleta,
        especie: formData.especie,
        temperatura: formData.temperatura ? parseFloat(formData.temperatura) : null,
        cbm: formData.cbm ? parseFloat(formData.cbm) : null,
        pol: formData.pol,
        pod: formData.pod,
        deposito: formData.deposito,
        estado: formData.estado,
        tipo_ingreso: formData.tipoIngreso,
        flete: formData.flete,
        comentario: formData.comentario,
        contenedor: formData.contenedor ? processContainers(formData.contenedor) : '',
        ct: '',
        co2: null,
        o2: null,
        tt: null,
        roleada_desde: '',
        numero_bl: '',
        estado_bl: '',
        contrato: '',
        facturacion: '',
        booking_pdf: '',
        observacion: '',
        semana_ingreso: null,
        mes_ingreso: null,
        semana_zarpe: null,
        mes_zarpe: null,
        semana_arribo: null,
        mes_arribo: null,
        ingresado: new Date().toISOString(),
        etd: null,
        eta: null,
        ingreso_stacking: null,
        booking: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Agregar múltiples documentos con REF ASLI únicos
      const recordsToInsert = refAsliList.map(refAsli => ({
        ...baseRegistroData,
        ref_asli: refAsli,
      }));

      
      // Crear cliente Supabase
      const supabase = createClient();
      
      // Verificar conectividad con Supabase primero
      const { data: testData, error: testError } = await supabase
        .from('registros')
        .select('id')
        .limit(1);

      if (testError) {
        console.error('❌ Error de conectividad con Supabase:', testError);
        setError(`Error de conexión: ${testError.message || 'No se puede conectar con la base de datos'}`);
        return;
      }
      
      const { data: insertData, error: insertError } = await supabase
        .from('registros')
        .insert(recordsToInsert)
        .select();

      if (insertError) {
        console.error('❌ Error insertando registros:', insertError);
        console.error('📋 Detalles del error:', JSON.stringify(insertError, null, 2));
        console.error('📋 Datos que causaron el error:', JSON.stringify(recordsToInsert, null, 2));
        setError(`Error al crear los registros: ${insertError.message || insertError.details || 'Error desconocido'}`);
        return;
      }

      
      onSuccess();
      onClose();
      setNumberOfCopies(1);
      
      // Limpiar formulario
      setFormData({
        refAsli: '',
        ejecutivo: '',
        shipper: '',
        naviera: '',
        naveInicial: '',
        viaje: '',
        especie: '',
        temperatura: '',
        cbm: '',
        pol: '',
        pod: '',
        deposito: '',
        estado: 'PENDIENTE',
        tipoIngreso: 'NORMAL',
        flete: '',
        comentario: '',
        contenedor: '',
      });
    } catch (err) {
      console.error('Error al crear registro:', err);
      setError('Error al crear el registro. Por favor, intenta de nuevo.');
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
        viaje: '', // Limpiar viaje cuando cambia nave
      }));
    } else if (name === 'naveInicial') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        viaje: '', // Limpiar viaje cuando cambia nave
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  // Obtener naves disponibles desde el mapping del catálogo
  const getAvailableNaves = () => {
    if (!formData.naviera) return [];
    
    // Si es un consorcio, buscar en consorciosNavesMapping
    if (formData.naviera.includes('/')) {
      const navesConsorcio = consorciosNavesMapping[formData.naviera] || [];
      
      if (navesConsorcio.length === 0) {
        console.error('❌ Keys disponibles:', Object.keys(consorciosNavesMapping));
        console.warn('⚠️ NO se usará fallback. Por favor configura el mapping para este consorcio.');
        return [];
      }
      
      return navesConsorcio.sort();
    }
    
    // Si es naviera individual, buscar en navierasNavesMapping
    const navesNaviera = navierasNavesMapping[formData.naviera] || [];
    
    if (navesNaviera.length === 0) {
      console.error('❌ Keys disponibles:', Object.keys(navierasNavesMapping));
      console.error('❌ Comparación de keys:');
      Object.keys(navierasNavesMapping).forEach(key => {
        console.error(`  - "${key}" === "${formData.naviera}": ${key === formData.naviera}`);
      });
      console.warn('⚠️ NO se usará fallback. Por favor configura el mapping para esta naviera.');
      return [];
    }
    
    return navesNaviera.sort();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 lg:p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Save className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Agregar Nuevo Registro</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-700" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {/* REF ASLI */}
            <div className="space-y-2">
              <label className={`block text-sm font-medium ${getLabelStyles()}`}>
                REF ASLI * (Generado automáticamente)
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="refAsli"
                  value={formData.refAsli}
                  readOnly
                  disabled={generatingRef}
                  className={`w-full px-3 py-2 border rounded-md cursor-not-allowed ${
                    theme === 'dark'
                      ? 'border-gray-600 bg-gray-700 text-gray-300'
                      : 'border-gray-300 bg-gray-50 text-gray-700'
                  }`}
                  placeholder={generatingRef ? "Generando..." : "A0001"}
                />
                {generatingRef && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-700">
                El REF ASLI se genera automáticamente para evitar duplicados
              </p>
              <button
                type="button"
                onClick={async () => {
                  setGeneratingRef(true);
                  try {
                    const newRefAsli = await generateUniqueRefAsli();
                    setFormData(prev => ({ ...prev, refAsli: newRefAsli }));
                  } catch (error) {
                    console.error('Error regenerando REF ASLI:', error);
                  } finally {
                    setGeneratingRef(false);
                  }
                }}
                disabled={generatingRef}
                className="mt-2 px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
              >
                {generatingRef ? 'Generando...' : '🔄 Regenerar REF ASLI'}
              </button>
            </div>

            {/* Ejecutivo */}
            <div className="space-y-2">
              <label className={`block text-sm font-medium ${getLabelStyles()}`}>
                Ejecutivo *
              </label>
              <select
                name="ejecutivo"
                value={formData.ejecutivo}
                onChange={handleChange}
                className={getSelectStyles()}
                required
              >
                <option value="">Seleccionar ejecutivo</option>
                {ejecutivosUnicos.map(ejecutivo => (
                  <option key={ejecutivo} value={ejecutivo}>{ejecutivo}</option>
                ))}
              </select>
            </div>

            {/* Cliente */}
            <div className="space-y-2">
              <label className={`block text-sm font-medium ${getLabelStyles()}`}>
                Cliente *
              </label>
              <select
                name="shipper"
                value={formData.shipper}
                onChange={handleChange}
                className={getSelectStyles()}
                required
              >
                <option value="">Seleccionar cliente</option>
                {clientesUnicos.map(cliente => (
                  <option key={cliente} value={cliente}>{cliente}</option>
                ))}
              </select>
            </div>

            {/* Naviera */}
            <div className="space-y-2">
              <label className={`block text-sm font-medium ${getLabelStyles()}`}>
                Naviera *
              </label>
              <select
                name="naviera"
                value={formData.naviera}
                onChange={handleChange}
                className={getSelectStyles()}
                required
              >
                <option value="">Seleccionar naviera</option>
                {navierasUnicas.map(naviera => (
                  <option key={naviera} value={naviera}>{naviera}</option>
                ))}
              </select>
              {formData.naviera && formData.naviera.includes('/') && (
                <div className="text-xs text-gray-600">
                  <span className="text-blue-600">
                    Consorcio: {formData.naviera}
                  </span>
                </div>
              )}
            </div>

            {/* Nave */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-900">
                Nave * 
                {formData.naviera && (
                  <span className="text-xs text-blue-600 ml-2">
                    ({getAvailableNaves().length} disponibles)
                  </span>
                )}
              </label>
              <select
                name="naveInicial"
                value={formData.naveInicial}
                onChange={handleChange}
                className={getSelectStyles()}
                required
                disabled={!formData.naviera}
              >
                <option value="">
                  {formData.naviera ? "Seleccionar nave" : "Primero selecciona una naviera"}
                </option>
                {getAvailableNaves().map(nave => (
                  <option key={nave} value={nave}>{nave}</option>
                ))}
              </select>
              {formData.naviera && getAvailableNaves().length === 0 && (
                <p className="text-xs text-orange-600">
                  No hay naves disponibles para esta naviera
                </p>
              )}
            </div>

            {/* Viaje */}
            <div className="space-y-2">
              <label className={`block text-sm font-medium ${
                formData.naveInicial && !formData.viaje && error.includes('Viaje')
                  ? 'text-red-600'
                  : getLabelStyles()
              }`}>
                Viaje {formData.naveInicial ? '*' : ''}
              </label>
              <input
                ref={viajeInputRef}
                type="text"
                name="viaje"
                value={formData.viaje}
                onChange={handleChange}
                required={!!formData.naveInicial}
                disabled={!formData.naveInicial}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                  formData.naveInicial && !formData.viaje && error.includes('Viaje')
                    ? 'border-red-500 focus:ring-red-500 bg-red-50'
                    : !formData.naveInicial 
                    ? theme === 'dark'
                      ? 'bg-gray-700 cursor-not-allowed text-gray-400 border-gray-600'
                      : 'bg-gray-100 cursor-not-allowed text-gray-500 border-gray-300'
                    : theme === 'dark'
                        ? 'bg-gray-700 text-white border-gray-600 focus:ring-blue-500'
                        : 'bg-white text-gray-900 border-gray-300 focus:ring-blue-500'
                }`}
                placeholder={formData.naveInicial ? "Ej: 001E" : "Primero selecciona una nave"}
              />
              {formData.naveInicial && !formData.viaje && error.includes('Viaje') && (
                <div className="flex items-center space-x-1 text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  <p className="text-xs font-medium">
                    El número de viaje es obligatorio cuando hay una nave seleccionada
                  </p>
                </div>
              )}
              {formData.naveInicial && formData.viaje && (
                <p className="text-xs text-gray-700">
                  El número de viaje se mostrará entre corchetes en la nave completa
                </p>
              )}
            </div>

            {/* Especie */}
            <div className="space-y-2">
              <label className={`block text-sm font-medium ${getLabelStyles()}`}>
                Especie *
              </label>
              <select
                name="especie"
                value={formData.especie}
                onChange={handleChange}
                className={getSelectStyles()}
                required
              >
                <option value="">Seleccionar especie</option>
                {especiesUnicas.map(especie => (
                  <option key={especie} value={especie}>{especie}</option>
                ))}
              </select>
            </div>

            {/* POL */}
            <div className="space-y-2">
              <label className={`block text-sm font-medium ${getLabelStyles()}`}>
                POL *
              </label>
              <select
                name="pol"
                value={formData.pol}
                onChange={handleChange}
                className={getSelectStyles()}
                required
              >
                <option value="">Seleccionar POL</option>
                {polsUnicos.map(pol => (
                  <option key={pol} value={pol}>{pol}</option>
                ))}
              </select>
            </div>

            {/* POD */}
            <div className="space-y-2">
              <label className={`block text-sm font-medium ${getLabelStyles()}`}>
                POD *
              </label>
              <select
                name="pod"
                value={formData.pod}
                onChange={handleChange}
                className={getSelectStyles()}
                required
              >
                <option value="">Seleccionar POD</option>
                {destinosUnicos.map(destino => (
                  <option key={destino} value={destino}>{destino}</option>
                ))}
              </select>
            </div>

            {/* Depósito */}
            <div className="space-y-2">
              <label className={`block text-sm font-medium ${getLabelStyles()}`}>
                Depósito *
              </label>
              <select
                name="deposito"
                value={formData.deposito}
                onChange={handleChange}
                className={getSelectStyles()}
                required
              >
                <option value="">Seleccionar depósito</option>
                {depositosUnicos.map(deposito => (
                  <option key={deposito} value={deposito}>{deposito}</option>
                ))}
              </select>
            </div>

            {/* Estado */}
            <div className="space-y-2">
              <label className={`block text-sm font-medium ${getLabelStyles()}`}>
                Estado *
              </label>
              <select
                name="estado"
                value={formData.estado}
                onChange={handleChange}
                className={getSelectStyles()}
                required
              >
                <option value="PENDIENTE">PENDIENTE</option>
                <option value="CONFIRMADO">CONFIRMADO</option>
                <option value="CANCELADO">CANCELADO</option>
              </select>
            </div>

            {/* Tipo de Ingreso */}
            <div className="space-y-2">
              <label className={`block text-sm font-medium ${getLabelStyles()}`}>
                Tipo de Ingreso *
              </label>
              <select
                name="tipoIngreso"
                value={formData.tipoIngreso}
                onChange={handleChange}
                className={getSelectStyles()}
                required
              >
                <option value="NORMAL">NORMAL</option>
                <option value="EARLY">EARLY</option>
                <option value="LATE">LATE</option>
                <option value="EXTRA LATE">EXTRA LATE</option>
              </select>
            </div>

            {/* Temperatura */}
            <div className="space-y-2">
              <label className={`block text-sm font-medium ${getLabelStyles()}`}>
                Temperatura (°C)
              </label>
              <select
                name="temperatura"
                value={formData.temperatura}
                onChange={handleChange}
                className={getSelectStyles()}
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
              <p className="text-xs text-gray-700">
                Rango: -1.0°C a 1.0°C (intervalos de 0.1°C)
              </p>
            </div>

            {/* CBM */}
            <div className="space-y-2">
              <label className={`block text-sm font-medium ${getLabelStyles()}`}>
                CBM *
              </label>
              <select
                name="cbm"
                value={formData.cbm}
                onChange={handleChange}
                className={getSelectStyles()}
                required
              >
                <option value="">Seleccionar CBM</option>
                {cbmUnicos.map(cbm => (
                  <option key={cbm} value={cbm}>{cbm}</option>
                ))}
              </select>
            </div>

            {/* Flete */}
            <div className="space-y-2">
              <label className={`block text-sm font-medium ${getLabelStyles()}`}>
                Flete *
              </label>
              <select
                name="flete"
                value={formData.flete}
                onChange={handleChange}
                className={getSelectStyles()}
                required
              >
                <option value="">Seleccionar Flete</option>
                {fletesUnicos.map(flete => (
                  <option key={flete} value={flete}>{flete}</option>
                ))}
              </select>
            </div>

            {/* Número de copias */}
            <div className="space-y-2">
              <label className={`block text-sm font-medium ${getLabelStyles()}`}>
                Número de copias
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={numberOfCopies}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 1;
                  // Limitar a máximo 10 copias
                  const limitedValue = Math.min(Math.max(value, 1), 10);
                  setNumberOfCopies(limitedValue);
                }}
                className={getInputStyles()}
              />
              <p className="text-xs text-gray-700">
                Se generarán {numberOfCopies} REF ASLI únicos automáticamente (máximo 10)
              </p>
            </div>
          </div>

          {/* Comentario */}
          <div className="mt-4 space-y-2">
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100">
              Comentario
            </label>
            <textarea
              name="comentario"
              value={formData.comentario}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
              placeholder="Comentarios adicionales..."
            />
          </div>

          {/* Contenedor */}
          <div className="mt-4 space-y-2">
            <label className="block text-sm font-medium text-gray-900">
              Contenedor
            </label>
            <input
              type="text"
              name="contenedor"
              value={formData.contenedor}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
              placeholder="Ej: MNBU3612662 MNBU4269429 MNBU3121648"
            />
            <p className="text-xs text-gray-500">
              Múltiples contenedores separados por espacios
            </p>
          </div>
        </form>

        {/* Footer */}
        <div className="p-3 sm:p-4 lg:p-6 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-900 bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-sm sm:text-base"
          >
            Cancelar
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading || generatingRef}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-sm sm:text-base"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Guardar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}