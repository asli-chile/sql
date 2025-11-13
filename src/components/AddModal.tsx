'use client';

import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import {
  generateUniqueRefAsli,
  generateMultipleUniqueRefAsli,
  validateUniqueRefAsli,
} from '@/lib/ref-asli-utils';
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
  tratamientosDeFrioOpciones: string[];
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
  tratamientosDeFrioOpciones = [],
  clienteFijadoPorCoincidencia,
}: AddModalProps) {
  
  const { theme } = useTheme();
  const MAX_COPIES = 50;
  
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
    tratamientoFrio: '',
    temporada: '2025-2026',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatingRef, setGeneratingRef] = useState(true);
  const [numberOfCopies, setNumberOfCopies] = useState<string>('');

  const copiesPreview =
    numberOfCopies.trim() === ''
      ? 1
      : Math.max(parseInt(numberOfCopies, 10) || 1, 1);

  const ensureUniqueRefAsliList = async (refs: string[]): Promise<string[]> => {
    const uniqueRefs: string[] = [];
    const seen = new Set<string>();

    for (const originalRef of refs) {
      let candidate = originalRef;
      let attempts = 0;
      let isUnique = false;

      while (attempts < 8) {
        const alreadyGenerated = seen.has(candidate);
        const uniqueInDb = await validateUniqueRefAsli(candidate);

        if (!alreadyGenerated && uniqueInDb) {
          isUnique = true;
          break;
        }

        candidate = await generateUniqueRefAsli();
        attempts += 1;
      }

      if (!isUnique) {
        throw new Error(
          'No se pudo generar un REF ASLI único. Intenta nuevamente o contacta a soporte.',
        );
      }

      seen.add(candidate);
      uniqueRefs.push(candidate);
    }

    return uniqueRefs;
  };

  const upsertCatalogValue = async (
    supabaseClient: ReturnType<typeof createClient>,
    categoria: string,
    valor: string | null | undefined
  ) => {
    const trimmed = (valor || '').trim();
    if (!trimmed) return;

    try {
      const { data, error } = await supabaseClient
        .from('catalogos')
        .select('id, valores')
        .eq('categoria', categoria)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error(`Error leyendo catálogo ${categoria}:`, error);
        return;
      }

      let valores: string[] = [];
      let recordId: string | undefined;

      if (data) {
        recordId = (data as any).id;
        valores = Array.isArray(data.valores) ? data.valores : [];
      }

      const exists = valores.some(
        (entry) => entry.trim().toLowerCase() === trimmed.toLowerCase()
      );

      if (!exists) {
        const nuevosValores = [...valores, trimmed];
        const payload = {
          categoria,
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
      console.error(`Error actualizando catálogo ${categoria}:`, catalogError);
    }
  };

  // Generar REF ASLI automáticamente al abrir el modal y pre-seleccionar cliente si hay coincidencia
  useEffect(() => {
    const initializeModal = async () => {
      if (!isOpen) return;
      
      setGeneratingRef(true);
      setError('');
      setNumberOfCopies('');
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

    const copiesInput = numberOfCopies.trim();
    let resolvedCopies = copiesInput === '' ? 1 : parseInt(copiesInput, 10);
    if (Number.isNaN(resolvedCopies) || resolvedCopies < 1) {
      resolvedCopies = 1;
    }
    resolvedCopies = Math.min(resolvedCopies, MAX_COPIES);

    if (!Number.isFinite(resolvedCopies) || resolvedCopies < 1) {
      setError('Debes ingresar una cantidad válida (1 o más)');
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
      const normalizeDateForStorage = (value: string) =>
        formatDateForInput(parseDateString(value));
      const todayString = formatDateForInput(new Date());

      // Construir el nombre completo de la nave
      const naveCompleta = formData.naveInicial && formData.viaje.trim() 
        ? `${formData.naveInicial} [${formData.viaje.trim()}]` 
        : formData.naveInicial || '';

      // Generar REF ASLI únicos para todas las copias
      const refAsliList = await generateMultipleUniqueRefAsli(resolvedCopies);
      const uniqueRefAsliList = await ensureUniqueRefAsliList(refAsliList);

      // Crear múltiples copias
      const baseRegistroData = {
        ingresado: formData.ingresado
          ? normalizeDateForStorage(formData.ingresado)
          : todayString,
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
        co2: formData.co2 ? parseFloat(formData.co2) : null,
        o2: formData.o2 ? parseFloat(formData.o2) : null,
        ['tratamiento de frio']: formData.tratamientoFrio ? formData.tratamientoFrio : null,
        tt: null,
        roleada_desde: '',
        numero_bl: '',
        estado_bl: '',
        contrato: formData.contrato || '',
        facturacion: '',
        booking_pdf: '',
        observacion: '',
        temporada: '2025-2026',
        semana_ingreso: null,
        mes_ingreso: null,
        semana_zarpe: null,
        mes_zarpe: null,
        semana_arribo: null,
        mes_arribo: null,
        etd: formData.etd ? normalizeDateForStorage(formData.etd) : null,
        eta: formData.eta ? normalizeDateForStorage(formData.eta) : null,
        ingreso_stacking: null,
        booking: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Agregar múltiples documentos con REF ASLI únicos
      const recordsToInsert = uniqueRefAsliList.map((refAsli) => ({
        ...baseRegistroData,
        ref_asli: refAsli,
      }));

      
      // Crear cliente Supabase
      const supabase = createClient();

      const ensureCatalogUpdate = (
        categoria: string,
        valor: string | null | undefined,
        existingValues: (string | number)[] = []
      ) => {
        const trimmed = (valor || '').trim();
        if (!trimmed) return null;
        const exists = existingValues.some(
          (entry) => entry.toString().trim().toLowerCase() === trimmed.toLowerCase()
        );
        if (exists) return null;
        return upsertCatalogValue(supabase, categoria, trimmed);
      };

      const upsertNaveMappingEntry = async (): Promise<void> => {
        const naviera = (formData.naviera || '').trim();
        const nave = (formData.naveInicial || '').trim();
        if (!naviera || !nave) return;

        const sanitizedNave = nave.replace(/\s*\[.*\]$/, '').trim();
        if (!sanitizedNave) return;

        const isConsorcio = naviera.includes('/');
        const categoria = isConsorcio ? 'consorciosNavesMapping' : 'navierasNavesMapping';
        const existingMapping = isConsorcio ? consorciosNavesMapping : navierasNavesMapping;

        const existingList = (existingMapping[naviera] || []).map(item => item.trim().toLowerCase());
        if (existingList.includes(sanitizedNave.toLowerCase())) {
          return;
        }

        try {
          const { data, error } = await supabase
            .from('catalogos')
            .select('id, mapping')
            .eq('categoria', categoria)
            .maybeSingle();

          if (error && error.code !== 'PGRST116') {
            console.error(`Error leyendo mapeo ${categoria}:`, error);
            return;
          }

          const currentMapping: Record<string, string[]> =
            data?.mapping && typeof data.mapping === 'object' ? data.mapping : {};

          const updatedList = Array.from(
            new Set([...(currentMapping[naviera] || []), sanitizedNave].map(item => item.trim()))
          );

          const updatedMapping = {
            ...currentMapping,
            [naviera]: updatedList,
          };

          const timestamp = new Date().toISOString();

          if (data?.id) {
            await supabase
              .from('catalogos')
              .update({
                mapping: updatedMapping,
                updated_at: timestamp,
              })
              .eq('id', data.id);
          } else {
            await supabase
              .from('catalogos')
              .insert({
                categoria,
                valores: [],
                mapping: updatedMapping,
                created_at: timestamp,
                updated_at: timestamp,
              });
          }
        } catch (mappingError) {
          console.error(`Error actualizando mapeo ${categoria}:`, mappingError);
        }
      };
      
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
        
        if (insertError.code === '23505') {
          setError(
            'No se pudo crear el registro porque el REF ASLI ya existe. Se regeneró la referencia, intenta nuevamente.',
          );
        } else {
          setError(`Error al crear los registros: ${errorMessage}`);
        }
        return;
      }

      await Promise.all(
        [
          ensureCatalogUpdate('refCliente', formData.refCliente, refExternasUnicas),
          ensureCatalogUpdate('ejecutivos', formData.ejecutivo, ejecutivosUnicos),
          ensureCatalogUpdate('clientes', formData.shipper, clientesUnicos),
          ensureCatalogUpdate('navieras', formData.naviera, navierasUnicas),
          ensureCatalogUpdate('naves', formData.naveInicial, navesUnicas),
          ensureCatalogUpdate('especies', formData.especie, especiesUnicas),
          ensureCatalogUpdate('pols', formData.pol, polsUnicos),
          ensureCatalogUpdate('destinos', formData.pod, destinosUnicos),
          ensureCatalogUpdate('depositos', formData.deposito, depositosUnicos),
          ensureCatalogUpdate('cbm', formData.cbm, cbmUnicos),
          ensureCatalogUpdate('fletes', formData.flete, fletesUnicos),
          ensureCatalogUpdate('contratos', formData.contrato, contratosUnicos),
          ensureCatalogUpdate('co2', formData.co2, co2sUnicos),
          ensureCatalogUpdate('o2', formData.o2, o2sUnicos),
          ensureCatalogUpdate('tratamiento de frio', formData.tratamientoFrio, tratamientosDeFrioOpciones),
        ]
          .filter((promise): promise is Promise<void> => promise !== null),
      );

      await upsertNaveMappingEntry();

      onSuccess();
      onClose();
      setNumberOfCopies('');
      
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
      tratamientoFrio: '',
      temporada: '2025-2026',
    });
    } catch (err: unknown) {
      console.error('Error al crear registro:', err);
      const message =
        err instanceof Error ? err.message : 'Error al crear el registro. Por favor, intenta de nuevo.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Obtener naves disponibles desde el mapping del catálogo
  const getAvailableNaves = () => {
    if (!formData.naviera) return navesUnicas;

    const navieraKey = formData.naviera;

    if (navieraKey.includes('/')) {
      const navesConsorcio = consorciosNavesMapping[navieraKey] || [];
      return navesConsorcio.length > 0 ? [...navesConsorcio].sort() : navesUnicas;
    }

    const navesNaviera = navierasNavesMapping[navieraKey] || [];
    return navesNaviera.length > 0 ? [...navesNaviera].sort() : navesUnicas;
  };

  const normalizeCatalogValue = (field: string, rawValue: string) => {
    const trimmedValue = rawValue.trim();
    if (trimmedValue === '') {
      return '';
    }

    let options: string[] = [];
    switch (field) {
      case 'ejecutivo':
        options = ejecutivosUnicos;
        break;
      case 'shipper':
        options = clientesUnicos;
        break;
      case 'naviera':
        options = navierasUnicas;
        break;
      case 'naveInicial':
        options = getAvailableNaves();
        break;
      case 'especie':
        options = especiesUnicas;
        break;
      case 'pol':
        options = polsUnicos;
        break;
      case 'pod':
        options = destinosUnicos;
        break;
      case 'deposito':
        options = depositosUnicos;
        break;
      case 'cbm':
        options = cbmUnicos.map(String);
        break;
      case 'flete':
        options = fletesUnicos;
        break;
      case 'contrato':
        options = contratosUnicos;
        break;
      case 'co2':
        options = co2sUnicos.map(String);
        break;
      case 'o2':
        options = o2sUnicos.map(String);
        break;
      case 'tratamientoFrio':
        options = tratamientosDeFrioOpciones;
        break;
      default:
        options = [];
    }

    const match = options.find(
      (option) => option.trim().toLowerCase() === trimmedValue.toLowerCase()
    );

    return match ?? trimmedValue;
  };

  let naveOptions = getAvailableNaves();
  const typedNave = (formData.naveInicial || '').trim();
  if (
    typedNave &&
    !naveOptions.some((item) => item.trim().toLowerCase() === typedNave.toLowerCase())
  ) {
    naveOptions = [...naveOptions, typedNave];
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    const normalizedValue = normalizeCatalogValue(name, value);

    if (name === 'naviera') {
      setFormData((prev) => ({
        ...prev,
        [name]: normalizedValue,
        naveInicial: '',
        viaje: '',
      }));
      return;
    }

    if (name === 'naveInicial') {
      setFormData((prev) => ({
        ...prev,
        [name]: normalizedValue,
        viaje: '',
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: normalizedValue,
    }));
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
              <input
                type="text"
                name="ejecutivo"
                value={formData.ejecutivo}
                onChange={handleChange}
                list="catalogo-ejecutivos"
                className={getInputStyles()}
                required
                placeholder="Selecciona o escribe un ejecutivo"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
              <datalist id="catalogo-ejecutivos">
                {ejecutivosUnicos.map((ejecutivo) => (
                  <option key={ejecutivo} value={ejecutivo} />
                ))}
              </datalist>
            </div>

            {/* Cliente */}
            <div className="space-y-2">
              <label className={`block text-sm font-medium ${getLabelStyles()}`}>
                Cliente *
              </label>
              <input
                type="text"
                name="shipper"
                value={formData.shipper}
                onChange={handleChange}
                list="catalogo-clientes"
                className={clienteFijadoPorCoincidencia
                  ? theme === 'dark'
                    ? 'w-full rounded-xl border border-slate-800/60 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 cursor-not-allowed'
                    : 'w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 cursor-not-allowed'
                  : getInputStyles()
                }
                required
                disabled={!!clienteFijadoPorCoincidencia}
                placeholder="Selecciona o escribe un cliente"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
              <datalist id="catalogo-clientes">
                {clientesUnicos.map((cliente) => (
                  <option key={cliente} value={cliente} />
                ))}
              </datalist>
            </div>

            {/* Naviera */}
            <div className="space-y-2">
              <label className={`block text-sm font-medium ${getLabelStyles()}`}>
                Naviera *
              </label>
              <input
                type="text"
                name="naviera"
                value={formData.naviera}
                onChange={handleChange}
                list="catalogo-navieras"
                className={getInputStyles()}
                required
                placeholder="Selecciona o escribe una naviera"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
              <datalist id="catalogo-navieras">
                {navierasUnicas.map((naviera) => (
                  <option key={naviera} value={naviera} />
                ))}
              </datalist>
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
                    ({naveOptions.length} disponibles)
                  </span>
                )}
              </label>
              <input
                type="text"
                name="naveInicial"
                value={formData.naveInicial}
                onChange={handleChange}
                list="catalogo-naves"
                className={getInputStyles()}
                required
                disabled={!formData.naviera}
                placeholder={formData.naviera ? 'Selecciona o escribe una nave' : 'Primero selecciona una naviera'}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
              <datalist id="catalogo-naves">
                {naveOptions.map((nave) => (
                  <option key={nave} value={nave} />
                ))}
              </datalist>
              {formData.naviera && naveOptions.length === 0 && (
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
              <input
                type="text"
                name="especie"
                value={formData.especie}
                onChange={handleChange}
                list="catalogo-especies"
                className={getInputStyles()}
                required
                placeholder="Selecciona o escribe una especie"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
              <datalist id="catalogo-especies">
                {especiesUnicas.map((especie) => (
                  <option key={especie} value={especie} />
                ))}
              </datalist>
            </div>

            {/* POL */}
            <div className="space-y-2">
              <label className={`block text-sm font-medium ${getLabelStyles()}`}>
                POL *
              </label>
              <input
                type="text"
                name="pol"
                value={formData.pol}
                onChange={handleChange}
                list="catalogo-pol"
                className={getInputStyles()}
                required
                placeholder="Selecciona o escribe un POL"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
              <datalist id="catalogo-pol">
                {polsUnicos.map((pol) => (
                  <option key={pol} value={pol} />
                ))}
              </datalist>
            </div>

            {/* POD */}
            <div className="space-y-2">
              <label className={`block text-sm font-medium ${getLabelStyles()}`}>
                POD *
              </label>
              <input
                type="text"
                name="pod"
                value={formData.pod}
                onChange={handleChange}
                list="catalogo-pod"
                className={getInputStyles()}
                required
                placeholder="Selecciona o escribe un POD"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
              <datalist id="catalogo-pod">
                {destinosUnicos.map((destino) => (
                  <option key={destino} value={destino} />
                ))}
              </datalist>
            </div>

            {/* Depósito */}
            <div className="space-y-2">
              <label className={`block text-sm font-medium ${getLabelStyles()}`}>
                Depósito *
              </label>
              <input
                type="text"
                name="deposito"
                value={formData.deposito}
                onChange={handleChange}
                list="catalogo-depositos"
                className={getInputStyles()}
                required
                placeholder="Selecciona o escribe un depósito"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
              <datalist id="catalogo-depositos">
                {depositosUnicos.map((deposito) => (
                  <option key={deposito} value={deposito} />
                ))}
              </datalist>
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
              <input
                type="number"
                name="cbm"
                value={formData.cbm}
                onChange={handleChange}
                list="catalogo-cbm"
                className={getInputStyles()}
                required
                placeholder="Selecciona o escribe un CBM"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
              <datalist id="catalogo-cbm">
                {cbmUnicos.map((cbm) => (
                  <option key={cbm} value={cbm} />
                ))}
              </datalist>
            </div>

            {/* Flete */}
            <div className="space-y-2">
              <label className={`block text-sm font-medium ${getLabelStyles()}`}>
                Flete *
              </label>
              <input
                type="text"
                name="flete"
                value={formData.flete}
                onChange={handleChange}
                list="catalogo-fletes"
                className={getInputStyles()}
                required
                placeholder="Selecciona o escribe un flete"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
              <datalist id="catalogo-fletes">
                {fletesUnicos.map((flete) => (
                  <option key={flete} value={flete} />
                ))}
              </datalist>
            </div>

            {/* Número de copias */}
            <div className="space-y-2">
              <label className={`block text-sm font-medium ${getLabelStyles()}`}>
                Número de copias
              </label>
              <input
                type="number"
                min="1"
                max={MAX_COPIES}
                value={numberOfCopies}
                placeholder={`Ingresa cantidad (1-${MAX_COPIES})`}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '') {
                    setNumberOfCopies('');
                    return;
                  }
                  const numericValue = parseInt(value, 10);
                  if (Number.isNaN(numericValue)) {
                    return;
                  }
                  if (numericValue > MAX_COPIES) {
                    setNumberOfCopies(String(MAX_COPIES));
                    return;
                  }
                  if (numericValue < 1) {
                    setNumberOfCopies('');
                    return;
                  }
                  setNumberOfCopies(String(numericValue));
                }}
                className={getInputStyles()}
              />
              <p className="text-xs text-gray-700 dark:text-gray-400">
                Se generarán {copiesPreview} REF ASLI únicos automáticamente (máximo {MAX_COPIES})
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
              <input
                type="text"
                name="contrato"
                value={formData.contrato}
                onChange={handleChange}
                list="catalogo-contratos"
                className={getInputStyles()}
                placeholder="Selecciona o escribe un contrato"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
              <datalist id="catalogo-contratos">
                {contratosUnicos.map((contrato) => (
                  <option key={contrato} value={contrato} />
                ))}
              </datalist>
            </div>

            {/* CO2 */}
            <div className="space-y-2">
              <label className={`block text-sm font-medium ${getLabelStyles()}`}>
                CO2
              </label>
              <input
                type="number"
                name="co2"
                value={formData.co2}
                onChange={handleChange}
                list="catalogo-co2"
                className={getInputStyles()}
                placeholder="Selecciona o escribe CO₂"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
              <datalist id="catalogo-co2">
                {co2sUnicos.map((co2) => (
                  <option key={co2} value={co2} />
                ))}
              </datalist>
            </div>

            {/* O2 */}
            <div className="space-y-2">
              <label className={`block text-sm font-medium ${getLabelStyles()}`}>
                O2
              </label>
              <input
                type="number"
                name="o2"
                value={formData.o2}
                onChange={handleChange}
                list="catalogo-o2"
                className={getInputStyles()}
                placeholder="Selecciona o escribe O₂"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
              <datalist id="catalogo-o2">
                {o2sUnicos.map((o2) => (
                  <option key={o2} value={o2} />
                ))}
              </datalist>
            </div>

            {/* Tratamiento de frío */}
            <div className="space-y-2">
              <label className={`block text-sm font-medium ${getLabelStyles()}`}>
                Tratamiento de frío
              </label>
              <input
                type="text"
                name="tratamientoFrio"
                value={formData.tratamientoFrio}
                onChange={handleChange}
                list="catalogo-tratamiento-frio"
                className={getInputStyles()}
                placeholder="Selecciona o escribe un tratamiento"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
              <datalist id="catalogo-tratamiento-frio">
                {tratamientosDeFrioOpciones.map((opcion) => (
                  <option key={opcion} value={opcion} />
                ))}
              </datalist>
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
          {error && (
            <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs text-red-200">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            </div>
          )}
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
        </form>
      </div>
    </div>
  ) : null;
}