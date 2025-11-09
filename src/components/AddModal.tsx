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
  refExternasUnicas: string[];
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
  contratosUnicos: string[];
  co2sUnicos: string[];
  o2sUnicos: string[];
  clienteFijadoPorCoincidencia?: string; // Cliente que debe estar preseleccionado y bloqueado
}

export function AddModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  ejecutivosUnicos,
  clientesUnicos,
  refExternasUnicas,
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
  contratosUnicos,
  co2sUnicos,
  o2sUnicos,
  clienteFijadoPorCoincidencia,
}: AddModalProps) {
  
  const { theme } = useTheme();
  
  // Helper para obtener estilos de select según el tema
  const getSelectStyles = () => {
    return theme === 'dark'
      ? 'w-full rounded-xl border border-slate-800/60 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30'
      : 'w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400/30';
  };

  const getLabelStyles = () => {
    return theme === 'dark' ? 'text-slate-200' : 'text-gray-900';
  };

  const getInputStyles = () => {
    return theme === 'dark'
      ? 'w-full rounded-xl border border-slate-800/60 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30'
      : 'w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400/30';
  };

  
  const viajeInputRef = React.useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    refAsli: '',
    refCliente: '',
    ejecutivo: '',
    shipper: '',
    ingresado: '',
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
    etd: '',
    eta: '',
    consignatario: '',
    contrato: '',
    co2: '',
    o2: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatingRef, setGeneratingRef] = useState(true);
  const [numberOfCopies, setNumberOfCopies] = useState(1);

  const upsertRefClienteCatalog = async (supabaseClient: ReturnType<typeof createClient>, valor: string | null | undefined) => {
    const trimmed = (valor || '').trim();
    if (!trimmed) return;

    try {
      const { data, error } = await supabaseClient
        .from('catalogos')
        .select('id, valores')
        .eq('categoria', 'refCliente')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error leyendo catálogo refCliente:', error);
        return;
      }

      let valores: string[] = [];
      let recordId: string | undefined;

      if (data) {
        recordId = (data as any).id;
        valores = Array.isArray(data.valores) ? data.valores : [];
      }

      if (!valores.includes(trimmed)) {
        const nuevosValores = [...valores, trimmed];
        const payload = {
          categoria: 'refCliente',
          valores: nuevosValores,
          updated_at: new Date().toISOString(),
        };

        if (recordId) {
          await supabaseClient
            .from('catalogos')
            .update(payload)
            .eq('id', recordId);
        } else {
          await supabaseClient
            .from('catalogos')
            .insert({ ...payload, created_at: new Date().toISOString() });
        }
      }
    } catch (catalogError) {
      console.error('Error actualizando catálogo refCliente:', catalogError);
    }
  };

  // Generar REF ASLI automáticamente al abrir el modal y pre-seleccionar cliente si hay coincidencia
  useEffect(() => {
    const initializeModal = async () => {
      if (!isOpen) return;
      
      setGeneratingRef(true);
      try {
        const newRefAsli = await generateUniqueRefAsli();
        setFormData(prev => ({ 
          ...prev, 
          refAsli: newRefAsli,
          // Pre-seleccionar cliente si hay coincidencia con nombre de usuario
          shipper: clienteFijadoPorCoincidencia || prev.shipper
        }));
        setGeneratingRef(false);
      } catch (error) {
        console.error('Error generando REF ASLI:', error);
        setFormData(prev => ({ 
          ...prev, 
          refAsli: 'A0001',
          shipper: clienteFijadoPorCoincidencia || prev.shipper
        }));
        setGeneratingRef(false);
      }
    };

    initializeModal();
  }, [isOpen, clienteFijadoPorCoincidencia]);

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
        ingresado: formData.ingresado ? new Date(formData.ingresado).toISOString() : new Date().toISOString(),
        ref_cliente: formData.refCliente || null,
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
        contenedor: '',
        ct: '',
        co2: formData.co2 ? parseFloat(formData.co2) : null,
        o2: formData.o2 ? parseFloat(formData.o2) : null,
        tt: null,
        roleada_desde: '',
        numero_bl: '',
        estado_bl: '',
        contrato: formData.contrato || '',
        facturacion: '',
        booking_pdf: '',
        observacion: '',
        semana_ingreso: null,
        mes_ingreso: null,
        semana_zarpe: null,
        mes_zarpe: null,
        semana_arribo: null,
        mes_arribo: null,
        etd: formData.etd ? new Date(formData.etd).toISOString() : null,
        eta: formData.eta ? new Date(formData.eta).toISOString() : null,
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
      
      // Intentar insertar directamente (el trigger manejará created_by)
      // Si hay error de transacción de solo lectura, puede ser por RLS o trigger
      const { data: insertData, error: insertError } = await supabase
        .from('registros')
        .insert(recordsToInsert)
        .select();

      if (insertError) {
        console.error('❌ Error insertando registros:', insertError);
        console.error('📋 Detalles del error:', JSON.stringify(insertError, null, 2));
        console.error('📋 Datos que causaron el error:', JSON.stringify(recordsToInsert, null, 2));
        
        // Mensaje de error más específico para el error de transacción de solo lectura
        let errorMessage = insertError.message || insertError.details || 'Error desconocido';
        
        if (insertError.message?.includes('read-only transaction') || insertError.message?.includes('UPDATE')) {
          errorMessage = `Error de base de datos: El trigger está intentando hacer una operación no permitida.\n\n` +
            `Esto puede ser causado por:\n` +
            `- Un trigger que intenta hacer UPDATE en otra tabla\n` +
            `- Políticas RLS que bloquean la operación\n` +
            `- Problemas de permisos en la base de datos\n\n` +
            `Por favor, contacta al administrador de la base de datos.\n\n` +
            `Error técnico: ${insertError.message}`;
        }
        
        setError(`Error al crear los registros: ${errorMessage}`);
        return;
      }

      await upsertRefClienteCatalog(supabase, formData.refCliente);

      onSuccess();
      onClose();
      setNumberOfCopies(1);
      
      // Limpiar formulario
      setFormData({
        refAsli: '',
        refCliente: '',
        ejecutivo: '',
        shipper: '',
        ingresado: '',
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
        etd: '',
        eta: '',
        consignatario: '',
        contrato: '',
        co2: '',
        o2: '',
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
    
    console.log('🔍 getAvailableNaves - Naviera seleccionada:', formData.naviera);
    console.log('📋 navierasNavesMapping keys:', Object.keys(navierasNavesMapping));
    console.log('📋 consorciosNavesMapping keys:', Object.keys(consorciosNavesMapping));
    
    // Si es un consorcio, buscar en consorciosNavesMapping
    if (formData.naviera.includes('/')) {
      const navesConsorcio = consorciosNavesMapping[formData.naviera] || [];
      console.log(`🛳️ Consorcio "${formData.naviera}": ${navesConsorcio.length} naves encontradas`);
      
      if (navesConsorcio.length === 0) {
        console.error('❌ Keys disponibles en consorciosNavesMapping:', Object.keys(consorciosNavesMapping));
        console.warn('⚠️ NO se usará fallback. Por favor configura el mapping para este consorcio.');
        return [];
      }
      
      return navesConsorcio.sort();
    }
    
    // Si es naviera individual, buscar en navierasNavesMapping
    const navesNaviera = navierasNavesMapping[formData.naviera] || [];
    console.log(`🛳️ Naviera "${formData.naviera}": ${navesNaviera.length} naves encontradas`);
    
    if (navesNaviera.length === 0) {
      console.error('❌ Keys disponibles en navierasNavesMapping:', Object.keys(navierasNavesMapping));
      console.error('❌ Comparación de keys:');
      Object.keys(navierasNavesMapping).forEach(key => {
        console.error(`  - "${key}" === "${formData.naviera}": ${key === formData.naviera}`);
      });
      console.warn('⚠️ NO se usará fallback. Por favor configura el mapping para esta naviera.');
      return [];
    }
    
    return navesNaviera.sort();
  };

  return isOpen ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xl px-3 sm:px-6 py-6 sm:py-10">
      <div className="relative flex max-h-[92vh] w-full max-w-[95vw] 2xl:max-w-[1100px] flex-col overflow-hidden rounded-3xl border border-slate-800/60 bg-slate-950/90 shadow-2xl shadow-slate-950/40">
        <div className="flex items-center justify-between border-b border-slate-800/60 bg-slate-950/80 px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-100">Agregar nuevo registro</h2>
            <p className="text-sm text-slate-400">Completa la información del embarque</p>
          </div>
          <button
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-800/70 text-slate-300 hover:border-sky-500/60 hover:text-sky-200"
            title="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
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
                  className={`w-full cursor-not-allowed rounded-xl border border-slate-800/60 bg-slate-900/50 px-3 py-2 text-sm text-slate-400`}
                  placeholder={generatingRef ? "Generando..." : "A0001"}
                />
                {generatingRef && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-400">
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
                className="inline-flex items-center gap-2 rounded-full border border-slate-800/70 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-sky-500/60 hover:text-sky-200 disabled:opacity-50"
              >
                {generatingRef ? 'Generando…' : 'Regenerar REF ASLI'}
              </button>
            </div>

            <div className="space-y-2">
              <label className={`block text-sm font-medium ${getLabelStyles()}`}>
                Ref. Externa
              </label>
              <input
                type="text"
                name="refCliente"
                value={formData.refCliente}
                onChange={handleChange}
                list="catalogo-ref-externa"
                className={getInputStyles()}
                placeholder="Ref. externa del cliente"
              />
              <datalist id="catalogo-ref-externa">
                {refExternasUnicas.map((ref) => (
                  <option key={ref} value={ref} />
                ))}
              </datalist>
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
                className={clienteFijadoPorCoincidencia 
                  ? theme === 'dark'
                    ? 'w-full rounded-xl border border-slate-800/60 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 cursor-not-allowed'
                    : 'w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 cursor-not-allowed'
                  : getSelectStyles()
                }
                required
                disabled={!!clienteFijadoPorCoincidencia}
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
                className={`w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400/30`}
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
              <p className="text-xs text-gray-700 dark:text-gray-400">
                Se generarán {numberOfCopies} REF ASLI únicos automáticamente (máximo 10)
              </p>
            </div>

            {/* ETD */}
            <div className="space-y-2">
              <label className={`block text-sm font-medium ${getLabelStyles()}`}>
                ETD
              </label>
              <input
                type="date"
                name="etd"
                value={formData.etd}
                onChange={handleChange}
                className={getInputStyles()}
              />
            </div>

            {/* ETA */}
            <div className="space-y-2">
              <label className={`block text-sm font-medium ${getLabelStyles()}`}>
                ETA
              </label>
              <input
                type="date"
                name="eta"
                value={formData.eta}
                onChange={handleChange}
                className={getInputStyles()}
              />
            </div>

            {/* Consignatario */}
            <div className="space-y-2">
              <label className={`block text-sm font-medium ${getLabelStyles()}`}>
                Consignatario
              </label>
              <input
                type="text"
                name="consignatario"
                value={formData.consignatario}
                onChange={handleChange}
                className={getInputStyles()}
                placeholder="Nombre del consignatario"
              />
            </div>

            {/* Contrato */}
            <div className="space-y-2">
              <label className={`block text-sm font-medium ${getLabelStyles()}`}>
                Contrato
              </label>
              <select
                name="contrato"
                value={formData.contrato}
                onChange={handleChange}
                className={getSelectStyles()}
              >
                <option value="">Seleccionar contrato</option>
                {contratosUnicos.map(contrato => (
                  <option key={contrato} value={contrato}>{contrato}</option>
                ))}
              </select>
            </div>

            {/* CO2 */}
            <div className="space-y-2">
              <label className={`block text-sm font-medium ${getLabelStyles()}`}>
                CO2
              </label>
              <select
                name="co2"
                value={formData.co2}
                onChange={handleChange}
                className={getSelectStyles()}
              >
                <option value="">Seleccionar CO2</option>
                {co2sUnicos.map(co2 => (
                  <option key={co2} value={co2}>{co2}</option>
                ))}
              </select>
            </div>

            {/* O2 */}
            <div className="space-y-2">
              <label className={`block text-sm font-medium ${getLabelStyles()}`}>
                O2
              </label>
              <select
                name="o2"
                value={formData.o2}
                onChange={handleChange}
                className={getSelectStyles()}
              >
                <option value="">Seleccionar O2</option>
                {o2sUnicos.map(o2 => (
                  <option key={o2} value={o2}>{o2}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Comentario - Al final, fuera del grid */}
          <div className="mt-4 space-y-2">
            <label className={`block text-sm font-medium ${getLabelStyles()}`}>
              Comentario
            </label>
            <textarea
              name="comentario"
              value={formData.comentario}
              onChange={handleChange}
              rows={3}
              className={getInputStyles()}
              placeholder="Comentarios adicionales"
            />
          </div>
        </form>

        <div className="flex flex-col gap-4 rounded-2xl border border-slate-800/60 bg-slate-900/40 px-4 py-3 text-xs text-slate-400">
            <div className="flex flex-wrap items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-400" />
              <span>Todos los campos marcados con (*) son obligatorios.</span>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-800/70 px-4 py-2 text-sm font-medium text-slate-300 hover:border-slate-500/70 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition-transform hover:scale-[1.02] disabled:opacity-50"
              >
                {loading ? 'Guardando…' : 'Guardar registro'}
              </button>
            </div>
          </div>
      </div>
    </div>
  ) : null;
}