'use client';

import React, { useState, useEffect } from 'react';
import { X, AlertCircle, ChevronRight, ChevronLeft, Check, Calendar } from 'lucide-react';
import { Combobox } from '@/components/ui/Combobox';
import { generateUniqueRefAsli } from '@/lib/ref-asli-utils';
import { createClient } from '@/lib/supabase-browser';
import { parseDateString, formatDateForInput } from '@/lib/date-utils';
import { calculateTransitTime } from '@/lib/transit-time-utils';
import { useTheme } from '@/contexts/ThemeContext';

interface AddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  createdByName: string;
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
  createdByName,
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
      ? 'w-full rounded-xl border border-slate-800/60 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 cursor-pointer pr-10'
      : 'w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400/30 cursor-pointer pr-10';
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
  const etdDateInputRef = React.useRef<HTMLInputElement>(null);
  const etaDateInputRef = React.useRef<HTMLInputElement>(null);
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
  const [currentStep, setCurrentStep] = useState(1);
  const [atmosferaControlada, setAtmosferaControlada] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const copiesPreview =
    numberOfCopies.trim() === ''
      ? 1
      : Math.max(parseInt(numberOfCopies, 10) || 1, 1);

  const requestRefAsliList = async (count: number): Promise<string[]> => {
    const response = await fetch('/api/ref-asli', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count }),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result?.error || 'No se pudo generar el REF ASLI.');
    }
    const list = (result?.refAsliList as string[] | undefined) ?? [];
    if (count === 1) {
      const single = (result?.refAsli as string | undefined) ?? list[0];
      if (!single) {
        throw new Error('No se recibió el REF ASLI.');
      }
      return [single];
    }
    if (list.length !== count) {
      throw new Error('No se recibió la cantidad esperada de REF ASLI.');
    }
    return list;
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

  // Bloquear scroll del body cuando el modal está abierto
  useEffect(() => {
    if (isOpen) {
      // Guardar el estilo original
      const originalStyle = window.getComputedStyle(document.body).overflow;
      // Bloquear scroll
      document.body.style.overflow = 'hidden';
      // Cleanup: restaurar el scroll cuando el modal se cierra
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);

  // Generar REF ASLI automáticamente al abrir el modal y pre-seleccionar cliente si hay coincidencia
  useEffect(() => {
    const initializeModal = async () => {
      if (!isOpen) return;
      
      setGeneratingRef(true);
      setError('');
      setNumberOfCopies('');
      setCurrentStep(1); // Resetear al paso 1 al abrir
      setAtmosferaControlada(false); // Resetear checkbox de atmósfera controlada
      setIsSaved(false); // Resetear estado de guardado
      try {
        const [newRefAsli] = await requestRefAsliList(1);
        setFormData(prev => ({ 
          ...prev, 
          refAsli: newRefAsli,
          // Pre-seleccionar cliente si hay coincidencia con nombre de usuario
          shipper: clienteFijadoPorCoincidencia || prev.shipper
        }));
        setGeneratingRef(false);
      } catch (error) {
        console.error('Error generando REF ASLI:', error);
        const fallbackRefAsli = await generateUniqueRefAsli();
        setFormData(prev => ({ 
          ...prev, 
          refAsli: fallbackRefAsli,
          shipper: clienteFijadoPorCoincidencia || prev.shipper
        }));
        setGeneratingRef(false);
      }
    };

    initializeModal();
  }, [isOpen, clienteFijadoPorCoincidencia]);

  // Efecto para generar referencia externa automáticamente cuando cambian cliente o especie
  useEffect(() => {
    const generateRefExterna = async () => {
      if (formData.shipper && formData.especie) {
        try {
          const response = await fetch('/api/ref-externa', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              cliente: formData.shipper,
              especie: formData.especie,
              count: 1,
            }),
          });
          const result = await response.json();
          if (!response.ok) {
            throw new Error(result?.error || 'No se pudo generar la referencia externa.');
          }
          const refExterna = result?.refExterna as string | undefined;
          if (!refExterna) {
            throw new Error('No se recibió la referencia externa.');
          }
          setFormData(prev => ({ ...prev, refCliente: refExterna }));
        } catch (error) {
          console.error('Error al generar referencia externa:', error);
        }
      } else {
        // Si no hay cliente o especie, limpiar la referencia
        setFormData(prev => ({ ...prev, refCliente: '' }));
      }
    };

    generateRefExterna();
  }, [formData.shipper, formData.especie]);

  // Validar campos del paso actual
  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(formData.ejecutivo && formData.shipper && formData.especie);
      case 2:
        return !!(formData.naviera && formData.naveInicial && formData.deposito && formData.pol && formData.pod && formData.flete && formData.tipoIngreso);
      case 3:
        return !!(formData.cbm);
      case 4:
        return true; // Paso 4 no tiene campos obligatorios
      case 5:
        return true; // Paso 5 es solo revisión
      default:
        return false;
    }
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setError('');
      if (currentStep < 5) {
        setCurrentStep(currentStep + 1);
      }
    } else {
      setError('Por favor, completa todos los campos obligatorios antes de continuar.');
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError('');
    }
  };

  // Función para generar el contenido del email con formato de texto plano estructurado
  const generateEmailContent = () => {
    const condiciones = [];
    if (formData.temperatura) condiciones.push(`Temperatura: ${formData.temperatura}°C`);
    if (formData.cbm) condiciones.push(`CBM: ${formData.cbm}`);
    if (formData.tratamientoFrio) condiciones.push(`Tratamiento de frío: ${formData.tratamientoFrio}`);
    if (atmosferaControlada) {
      condiciones.push('Atmósfera controlada: Sí');
      if (formData.co2) condiciones.push(`CO₂: ${formData.co2}%`);
      if (formData.o2) condiciones.push(`O₂: ${formData.o2}%`);
      const tipoAtmosfera = formData.naviera?.includes('CMA') ? 'DAIKIN' : formData.naviera?.includes('MSC') ? 'STARCOOL' : '';
      if (tipoAtmosfera) condiciones.push(`Tipo de atmósfera: ${tipoAtmosfera}`);
    }
    const condicionesTexto = condiciones.length > 0 ? condiciones.join(', ') : 'No especificado';

    // Calcular número de copias para el preview
    const copiesInput = numberOfCopies.trim();
    let resolvedCopies = copiesInput === '' ? 1 : parseInt(copiesInput, 10);
    if (Number.isNaN(resolvedCopies) || resolvedCopies < 1) {
      resolvedCopies = 1;
    }
    resolvedCopies = Math.min(resolvedCopies, MAX_COPIES);

    // Formato de texto plano simple y legible (usando guiones simples ASCII)
    const formattedText = `
DETALLE DE RESERVA
----------------------------------------------------------------------

REF ASLI:              ${formData.refAsli}
REF Externa:           ${formData.refCliente || 'No especificado'}
Ejecutivo:             ${formData.ejecutivo}
Cliente:               ${formData.shipper}
${formData.contrato ? `Contrato:             ${formData.contrato}\n` : ''}Naviera:               ${formData.naviera}
Nave:                  ${formData.naveInicial} ${formData.viaje ? `[${formData.viaje}]` : ''}
POL:                   ${formData.pol}
POD:                   ${formData.pod}
Depósito:              ${formData.deposito}
Flete:                 ${formData.flete}
Tipo de Ingreso:       ${formData.tipoIngreso}
ETD:                   ${formData.etd || 'No especificado'}
ETA:                   ${formData.eta || 'No especificado'}
Especie:               ${formData.especie}
Condiciones:           ${condicionesTexto}
Consignatario:         ${formData.consignatario || 'No especificado'}
${formData.comentario ? `Comentario:            ${formData.comentario}\n` : ''}----------------------------------------------------------------------
Cantidad de reservas (1 contenedor por reserva):      ${resolvedCopies}
`.trim();

    return formattedText;
  };

  const handleRequestEmail = () => {
    const copiesInput = numberOfCopies.trim();
    let resolvedCopies = copiesInput === '' ? 1 : parseInt(copiesInput, 10);
    if (Number.isNaN(resolvedCopies) || resolvedCopies < 1) {
      resolvedCopies = 1;
    }
    resolvedCopies = Math.min(resolvedCopies, MAX_COPIES);

    const naveCompleta = formData.naveInicial && formData.viaje.trim() 
      ? `${formData.naveInicial} [${formData.viaje.trim()}]` 
      : formData.naveInicial || '';

    const condiciones = [];
    if (formData.temperatura) condiciones.push(`${formData.temperatura}°C`);
    if (formData.cbm) condiciones.push(`CBM ${formData.cbm}`);
    if (formData.tratamientoFrio) condiciones.push(`Trat. Frío ${formData.tratamientoFrio}`);
    if (atmosferaControlada) {
      if (formData.co2) condiciones.push(`CO₂ ${formData.co2}%`);
      if (formData.o2) condiciones.push(`O₂ ${formData.o2}%`);
      const tipoAtmosfera = formData.naviera?.includes('CMA') ? 'DAIKIN' : formData.naviera?.includes('MSC') ? 'STARCOOL' : '';
      if (tipoAtmosfera) condiciones.push(tipoAtmosfera);
    }
    const condicionesTexto = condiciones.length > 0 ? condiciones.join(' // ') : 'No especificado';

    // Construir el asunto en el orden especificado
    const subject = `SOLICITUD DE RESERVA // ${resolvedCopies} // ${formData.pod || 'N/A'} // ${formData.pol || 'N/A'} // ${formData.deposito || 'N/A'} // ${formData.naviera || 'N/A'} // ${naveCompleta || 'N/A'} // ${formData.especie || 'N/A'} // ${condicionesTexto} // ${formData.flete || 'N/A'} // ${formData.shipper || 'N/A'} // ${formData.contrato || 'N/A'}`;

    // Construir el cuerpo del email
    const body = `Estimado equipo,

Favor su ayuda con la solicitud de reserva bajo el siguiente detalle:

${generateEmailContent()}

Saludos cordiales.`;

    // Emails: TO = Poliana y Rocío, CC = Mario, Hans, Alex
    const toEmails = 'poliana.cisternas@asli.cl,rocio.villarroel@asli.cl';
    const ccEmails = 'mario.basaez@asli.cl,hans.vasquez@asli.cl,alex.cardenas@asli.cl';

    // Construir URL de Gmail
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(toEmails)}&cc=${encodeURIComponent(ccEmails)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    // Abrir Gmail en una nueva pestaña
    window.open(gmailUrl, '_blank');
  };

  const handleSave = async () => {
    // Solo se puede guardar desde el paso 5
    if (currentStep !== 5) {
      return;
    }
    
    // Abrir una ventana en blanco ANTES de las operaciones async para evitar bloqueos
    // Esto debe hacerse en el contexto del evento de usuario
    const emailWindow = window.open('about:blank', '_blank');
    
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
      const refAsliList = await requestRefAsliList(resolvedCopies);

      // Crear cliente Supabase
      const supabase = createClient();

      // Generar REF EXTERNA correlativas únicas para todas las copias
      const refExternaResponse = await fetch('/api/ref-externa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente: formData.shipper,
          especie: formData.especie,
          count: resolvedCopies,
        }),
      });
      const refExternaResult = await refExternaResponse.json();
      if (!refExternaResponse.ok) {
        throw new Error(refExternaResult?.error || 'No se pudo generar la referencia externa.');
      }
      const refExternaList = (refExternaResult?.refExternas as string[] | undefined) ?? [];

      // Crear múltiples copias
      const baseRegistroData = {
        ingresado: formData.ingresado
          ? normalizeDateForStorage(formData.ingresado)
          : todayString,
        ejecutivo: formData.ejecutivo,
        usuario: createdByName,
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
        ['tratamiento de frio']: formData.tratamientoFrio || 'NO APLICA',
        // Calcular tipo de atmósfera automáticamente según la naviera
        tipo_atmosfera: formData.naviera?.includes('CMA') ? 'DAIKIN' : formData.naviera?.includes('MSC') ? 'STARCOOL' : '',
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

      // Agregar múltiples documentos con REF ASLI y REF EXTERNA únicos y correlativos
      const recordsToInsert = refAsliList.map((refAsli, index) => ({
        ...baseRegistroData,
        ref_asli: refAsli,
        ref_cliente: refExternaList[index] || null,
      }));

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
      
      const createResponse = await fetch('/api/registros/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: recordsToInsert }),
      });
      const createResult = await createResponse.json();

      if (!createResponse.ok) {
        console.error('❌ Error insertando registros:', createResult?.details || createResult?.error);
        console.error('📋 Detalles del error:', JSON.stringify(createResult?.details || createResult, null, 2));
        console.error('📋 Datos que causaron el error:', JSON.stringify(recordsToInsert, null, 2));

        let errorMessage = createResult?.error || 'Error desconocido';

        if (typeof errorMessage === 'string' && errorMessage.includes('read-only transaction')) {
          errorMessage = `Error de base de datos: El trigger está intentando hacer una operación no permitida.\n\n` +
            `Esto puede ser causado por:\n` +
            `- Un trigger que intenta hacer UPDATE en otra tabla\n` +
            `- Políticas RLS que bloquean la operación\n` +
            `- Problemas de permisos en la base de datos\n\n` +
            `Por favor, contacta al administrador de la base de datos.\n\n` +
            `Error técnico: ${errorMessage}`;
        }

        if (createResult?.details?.code === '23505') {
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

      // No cerrar el modal, solo marcar como guardado y abrir el correo automáticamente
      setIsSaved(true);
      setLoading(false);
      onSuccess();
      
      // Actualizar la ventana que abrimos al inicio con la URL del correo
      if (emailWindow && !emailWindow.closed) {
        const copiesInput = numberOfCopies.trim();
        let resolvedCopies = copiesInput === '' ? 1 : parseInt(copiesInput, 10);
        if (Number.isNaN(resolvedCopies) || resolvedCopies < 1) {
          resolvedCopies = 1;
        }
        resolvedCopies = Math.min(resolvedCopies, MAX_COPIES);

        const naveCompleta = formData.naveInicial && formData.viaje.trim() 
          ? `${formData.naveInicial} [${formData.viaje.trim()}]` 
          : formData.naveInicial || '';

        const condiciones = [];
        if (formData.temperatura) condiciones.push(`${formData.temperatura}°C`);
        if (formData.cbm) condiciones.push(`CBM ${formData.cbm}`);
        if (formData.tratamientoFrio) condiciones.push(`Trat. Frío ${formData.tratamientoFrio}`);
        if (atmosferaControlada) {
          if (formData.co2) condiciones.push(`CO₂ ${formData.co2}%`);
          if (formData.o2) condiciones.push(`O₂ ${formData.o2}%`);
          const tipoAtmosfera = formData.naviera?.includes('CMA') ? 'DAIKIN' : formData.naviera?.includes('MSC') ? 'STARCOOL' : '';
          if (tipoAtmosfera) condiciones.push(tipoAtmosfera);
        }
        const condicionesTexto = condiciones.length > 0 ? condiciones.join(' // ') : 'No especificado';

        const subject = `SOLICITUD DE RESERVA // ${resolvedCopies} // ${formData.pod || 'N/A'} // ${formData.pol || 'N/A'} // ${formData.deposito || 'N/A'} // ${formData.naviera || 'N/A'} // ${naveCompleta || 'N/A'} // ${formData.especie || 'N/A'} // ${condicionesTexto} // ${formData.flete || 'N/A'} // ${formData.shipper || 'N/A'} // ${formData.contrato || 'N/A'}`;

        const body = `Estimado equipo,

Favor su ayuda con la solicitud de reserva bajo el siguiente detalle:

${generateEmailContent()}

Saludos cordiales.`;

        const toEmails = 'poliana.cisternas@asli.cl,rocio.villarroel@asli.cl';
        const ccEmails = 'mario.basaez@asli.cl,hans.vasquez@asli.cl,alex.cardenas@asli.cl';

        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(toEmails)}&cc=${encodeURIComponent(ccEmails)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        emailWindow.location.href = gmailUrl;
      } else {
        // Si la ventana se cerró o fue bloqueada, intentar abrir normalmente
        handleRequestEmail();
      }
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
    if (!formData.naviera) return [];

    const navieraKey = formData.naviera.trim();

    // Buscar primero en el mapping de navieras (incluye navieras individuales y consorcios desde catalogos_naves)
    const navesNaviera = navierasNavesMapping[navieraKey] || [];
    if (navesNaviera.length > 0) {
      return [...navesNaviera].sort();
    }

    // Si no se encuentra y es un consorcio (contiene "/"), intentar con el mapping de consorcios (desde catalogos antiguo)
    if (navieraKey.includes('/')) {
      const navesConsorcio = consorciosNavesMapping[navieraKey] || [];
      return navesConsorcio.length > 0 ? [...navesConsorcio].sort() : [];
    }

    return [];
  };

  const normalizeCatalogValue = (field: string, rawValue: string) => {
    // Convertir a mayúsculas y normalizar
    if (!rawValue) {
      return '';
    }

    // Si el campo está vacío (solo espacios), devolver vacío
    if (rawValue.trim() === '') {
      return '';
    }

    // Convertir a mayúsculas
    const upperValue = rawValue.toUpperCase();

    // Para refCliente, buscar coincidencia en el catálogo pero preservar el valor en mayúsculas
    if (field === 'refCliente') {
      const match = refExternasUnicas.find(
        (option) => option.trim().toLowerCase() === upperValue.trim().toLowerCase()
      );
      // Si hay match exacto (ignorando espacios al inicio/fin), usar el valor del catálogo
      // Si no hay match, devolver el valor en mayúsculas con TODOS los espacios preservados
      return match ?? upperValue;
    }

    // Para otros campos, devolver en mayúsculas
    return upperValue;
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
    
    // Para selects, usar el valor directamente (ya están en mayúsculas desde el catálogo)
    // Para inputs de texto y textarea, convertir a mayúsculas
    let normalizedValue = value;
    
    // Format date inputs (ETD, ETA) to DD-MM-YYYY
    if (name === 'etd' || name === 'eta') {
      // Remove all non-numeric characters
      const numericValue = value.replace(/\D/g, '');
      
      // Format as DD-MM-YYYY
      if (numericValue.length <= 2) {
        normalizedValue = numericValue;
      } else if (numericValue.length <= 4) {
        normalizedValue = `${numericValue.slice(0, 2)}-${numericValue.slice(2)}`;
      } else if (numericValue.length <= 8) {
        normalizedValue = `${numericValue.slice(0, 2)}-${numericValue.slice(2, 4)}-${numericValue.slice(4)}`;
      } else {
        normalizedValue = `${numericValue.slice(0, 2)}-${numericValue.slice(2, 4)}-${numericValue.slice(4, 8)}`;
      }
    } else {
      // Campos de texto que deben convertirse a mayúsculas
      const textFields = ['refCliente', 'viaje', 'consignatario', 'comentario', 'contrato'];
      
      if (textFields.includes(name)) {
        normalizedValue = normalizeCatalogValue(name, value);
      }
    }

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

  const handleComboboxChange = (name: string, value: string) => {
    if (name === 'naviera') {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
        naveInicial: '',
        viaje: '',
      }));
      return;
    }

    if (name === 'naveInicial') {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
        viaje: '',
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return isOpen ? (
    <div className={`fixed inset-0 z-50 flex items-center justify-center backdrop-blur-xl px-4 sm:px-6 py-4 sm:py-6 overflow-y-auto ${theme === 'dark' ? 'bg-slate-950/80' : 'bg-black/50'}`}>
      <div className={`relative flex max-h-[95vh] my-auto w-full max-w-[98vw] 2xl:max-w-[1400px] flex-col rounded-3xl border shadow-2xl ${
        theme === 'dark' 
          ? 'border-slate-800/60 bg-slate-950/90 shadow-slate-950/40' 
          : 'border-gray-200 bg-white shadow-gray-900/20'
      }`}>
        <div className={`flex items-center justify-between border-b px-6 py-4 sticky top-0 z-10 rounded-t-3xl ${
          theme === 'dark' 
            ? 'border-slate-800/60 bg-slate-950/80' 
            : 'border-gray-200 bg-gray-50'
        }`}>
          <div>
            <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-gray-900'}`}>Agregar nuevo registro</h2>
            <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>Completa la información del embarque</p>
          </div>
          <button
            onClick={onClose}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition ${
              theme === 'dark' 
                ? 'border-slate-800/70 text-slate-300 hover:border-sky-500/60 hover:text-sky-200' 
                : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400 hover:text-gray-900'
            }`}
            title="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Indicadores de pasos */}
        <div className={`px-6 py-4 border-b ${theme === 'dark' ? 'border-slate-800/60' : 'border-gray-200'}`}>
          <div className="flex items-center justify-center space-x-4">
            {[1, 2, 3, 4, 5].map((step) => (
              <React.Fragment key={step}>
                <div className="flex items-center">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                      currentStep === step
                        ? 'bg-sky-500 border-sky-500 text-white'
                        : currentStep > step
                        ? 'bg-green-500 border-green-500 text-white'
                        : theme === 'dark'
                          ? 'bg-transparent border-slate-700 text-slate-400'
                          : 'bg-transparent border-gray-300 text-gray-500'
                    }`}
                  >
                    {currentStep > step ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <span className="text-sm font-semibold">{step}</span>
                    )}
                  </div>
                </div>
                {step < 5 && (
                  <div
                    className={`h-0.5 w-12 ${
                      currentStep > step 
                        ? 'bg-green-500' 
                        : theme === 'dark' 
                          ? 'bg-slate-700' 
                          : 'bg-gray-300'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="flex-1 px-6 py-5 space-y-6 overflow-y-auto max-h-[calc(95vh-200px)]">
          {/* Paso 1: Información básica */}
          {currentStep === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  className={`w-full cursor-not-allowed rounded-xl border px-3 py-2 text-sm ${
                    theme === 'dark' 
                      ? 'border-slate-800/60 bg-slate-900/50 text-slate-400' 
                      : 'border-gray-300 bg-gray-100 text-gray-500'
                  }`}
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
                    const [newRefAsli] = await requestRefAsliList(1);
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
                Ref. Externa (Generada automáticamente)
              </label>
                <input
                  type="text"
                  name="refCliente"
                  value={formData.refCliente}
                  onChange={handleChange}
                  className={`${getInputStyles()} cursor-not-allowed opacity-70`}
                  placeholder="Se genera automáticamente al seleccionar cliente y especie"
                  readOnly
                  title="La referencia externa se genera automáticamente basada en el cliente y la especie"
                />
                <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                  Formato: [3 letras cliente][2526][3 letras especie][001]
                </p>
            </div>

            {/* Ejecutivo */}
            <div className="space-y-2">
              <label className={`block text-sm font-medium ${getLabelStyles()}`}>
                Ejecutivo *
              </label>
              <Combobox
                options={ejecutivosUnicos}
                value={formData.ejecutivo || ''}
                onChange={(value) => handleComboboxChange('ejecutivo', value)}
                placeholder="Seleccionar ejecutivo"
                theme={theme}
                required
              />
            </div>

            {/* Cliente */}
            <div className="space-y-2">
              <label className={`block text-sm font-medium ${getLabelStyles()}`}>
                Cliente *
              </label>
              <Combobox
                options={clientesUnicos}
                value={formData.shipper || ''}
                onChange={(value) => handleComboboxChange('shipper', value)}
                placeholder="Seleccionar cliente"
                theme={theme}
                required
                disabled={!!clienteFijadoPorCoincidencia}
              />
            </div>

            {/* Contrato */}
            <div className="space-y-2">
              <label className={`block text-sm font-medium ${getLabelStyles()}`}>
                Contrato
              </label>
              <Combobox
                options={contratosUnicos}
                value={formData.contrato || ''}
                onChange={(value) => handleComboboxChange('contrato', value)}
                placeholder="Seleccionar contrato (opcional)"
                theme={theme}
              />
            </div>

            {/* Especie */}
            <div className="space-y-2">
              <label className={`block text-sm font-medium ${getLabelStyles()}`}>
                Especie *
              </label>
              <Combobox
                options={especiesUnicas}
                value={formData.especie || ''}
                onChange={(value) => handleComboboxChange('especie', value)}
                placeholder="Seleccionar especie"
                theme={theme}
                required
              />
            </div>
          </div>
          )}

          {/* Paso 2: Ruta y transporte */}
          {currentStep === 2 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Naviera */}
              <div className="space-y-2">
              <label className={`block text-sm font-medium ${getLabelStyles()}`}>
                Naviera *
              </label>
              <Combobox
                options={navierasUnicas}
                value={formData.naviera || ''}
                onChange={(value) => handleComboboxChange('naviera', value)}
                placeholder="Seleccionar naviera"
                theme={theme}
                required
              />
              {formData.naviera && formData.naviera.includes('/') && (
                <div className={`text-xs ${theme === 'dark' ? 'text-sky-400' : 'text-blue-600'}`}>
                  <span className="font-medium">
                    Consorcio: {formData.naviera}
                  </span>
                </div>
              )}
            </div>

            {/* Nave */}
            <div className="space-y-2">
              <label className={`block text-sm font-medium ${getLabelStyles()}`}>
                Nave *
                {formData.naviera && (
                  <span className={`text-xs ml-2 ${theme === 'dark' ? 'text-sky-400' : 'text-blue-600'}`}>
                    ({naveOptions.length} disponibles)
                  </span>
                )}
              </label>
              <Combobox
                options={naveOptions}
                value={formData.naveInicial || ''}
                onChange={(value) => handleComboboxChange('naveInicial', value)}
                placeholder={formData.naviera ? 'Seleccionar nave' : 'Primero selecciona una naviera'}
                theme={theme}
                required
                disabled={!formData.naviera}
              />
              {formData.naviera && naveOptions.length === 0 && (
                <p className={`text-xs ${theme === 'dark' ? 'text-orange-400' : 'text-orange-600'}`}>
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

            {/* Depósito */}
            <div className="space-y-2">
              <label className={`block text-sm font-medium ${getLabelStyles()}`}>
                Depósito *
              </label>
              <Combobox
                options={depositosUnicos}
                value={formData.deposito || ''}
                onChange={(value) => handleComboboxChange('deposito', value)}
                placeholder="Seleccionar depósito"
                theme={theme}
                required
              />
            </div>

            {/* POL */}
            <div className="space-y-2">
              <label className={`block text-sm font-medium ${getLabelStyles()}`}>
                POL *
              </label>
              <Combobox
                options={polsUnicos}
                value={formData.pol || ''}
                onChange={(value) => handleComboboxChange('pol', value)}
                placeholder="Seleccionar POL"
                theme={theme}
                required
              />
            </div>

            {/* POD */}
            <div className="space-y-2">
              <label className={`block text-sm font-medium ${getLabelStyles()}`}>
                POD *
              </label>
              <Combobox
                options={destinosUnicos}
                value={formData.pod || ''}
                onChange={(value) => handleComboboxChange('pod', value)}
                placeholder="Seleccionar POD"
                theme={theme}
                required
              />
            </div>

            {/* Flete */}
            <div className="space-y-2">
              <label className={`block text-sm font-medium ${getLabelStyles()}`}>
                Flete *
              </label>
              <select
                name="flete"
                value={formData.flete || ''}
                onChange={handleChange}
                className={getSelectStyles()}
                required
              >
                {fletesUnicos.map((flete) => (
                  <option key={flete} value={flete}>
                    {flete}
                  </option>
                ))}
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

            {/* ETD */}
            <div className="space-y-2">
              <label className={`block text-sm font-medium ${getLabelStyles()}`}>
                ETD
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  name="etd"
                  value={formData.etd}
                  onChange={handleChange}
                  className={`${getInputStyles()} pr-10`}
                  placeholder="DD-MM-AAAA"
                  pattern="\d{2}-\d{2}-\d{4}"
                  maxLength={10}
                />
                <button
                  type="button"
                  onClick={() => etdDateInputRef.current?.showPicker?.()}
                  className={`absolute right-2 p-1 ${theme === 'dark' ? 'text-slate-400 hover:text-sky-400' : 'text-gray-400 hover:text-blue-600'} transition-colors`}
                  title="Abrir calendario"
                >
                  <Calendar size={18} />
                </button>
                <input
                  ref={etdDateInputRef}
                  type="date"
                  className="absolute opacity-0 pointer-events-none"
                  value={formData.etd ? (() => {
                    try {
                      const [day, month, year] = formData.etd.split('-');
                      if (day && month && year && day.length === 2 && month.length === 2 && year.length === 4) {
                        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                      }
                    } catch {}
                    return '';
                  })() : ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      const [year, month, day] = e.target.value.split('-');
                      const formatted = `${day}-${month}-${year}`;
                      setFormData(prev => ({ ...prev, etd: formatted }));
                    } else {
                      setFormData(prev => ({ ...prev, etd: '' }));
                    }
                  }}
                />
              </div>
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-700'}`}>
                Formato: DD-MM-AAAA (día-mes-año)
              </p>
            </div>

            {/* ETA */}
            <div className="space-y-2">
              <label className={`block text-sm font-medium ${getLabelStyles()}`}>
                ETA
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  name="eta"
                  value={formData.eta}
                  onChange={handleChange}
                  className={`${getInputStyles()} pr-10`}
                  placeholder="DD-MM-AAAA"
                  pattern="\d{2}-\d{2}-\d{4}"
                  maxLength={10}
                />
                <button
                  type="button"
                  onClick={() => etaDateInputRef.current?.showPicker?.()}
                  className={`absolute right-2 p-1 ${theme === 'dark' ? 'text-slate-400 hover:text-sky-400' : 'text-gray-400 hover:text-blue-600'} transition-colors`}
                  title="Abrir calendario"
                >
                  <Calendar size={18} />
                </button>
                <input
                  ref={etaDateInputRef}
                  type="date"
                  className="absolute opacity-0 pointer-events-none"
                  value={formData.eta ? (() => {
                    try {
                      const [day, month, year] = formData.eta.split('-');
                      if (day && month && year && day.length === 2 && month.length === 2 && year.length === 4) {
                        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                      }
                    } catch {}
                    return '';
                  })() : ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      const [year, month, day] = e.target.value.split('-');
                      const formatted = `${day}-${month}-${year}`;
                      setFormData(prev => ({ ...prev, eta: formatted }));
                    } else {
                      setFormData(prev => ({ ...prev, eta: '' }));
                    }
                  }}
                />
              </div>
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-700'}`}>
                Formato: DD-MM-AAAA (día-mes-año)
              </p>
            </div>
          </div>
          )}

          {/* Paso 3: Información de carga */}
          {currentStep === 3 && (
            <div className="space-y-4">
              {/* Checkbox Atmósfera Controlada */}
              <div className={`flex items-center space-x-3 p-4 rounded-xl border ${
                theme === 'dark' 
                  ? 'border-slate-800/60 bg-slate-900/50' 
                  : 'border-gray-300 bg-gray-50'
              }`}>
                <input
                  type="checkbox"
                  id="atmosferaControlada"
                  checked={atmosferaControlada}
                  onChange={(e) => {
                    setAtmosferaControlada(e.target.checked);
                    // Si se marca, establecer CBM a "0" y limpiar campos si se desmarca
                    if (e.target.checked) {
                      setFormData(prev => ({
                        ...prev,
                        cbm: '0',
                      }));
                    } else {
                      setFormData(prev => ({
                        ...prev,
                        co2: '',
                        o2: '',
                      }));
                    }
                  }}
                  className={`w-5 h-5 rounded text-sky-500 focus:ring-2 focus:ring-sky-500/50 cursor-pointer ${
                    theme === 'dark' 
                      ? 'border-slate-700 bg-slate-800' 
                      : 'border-gray-300 bg-white'
                  }`}
                />
                <label
                  htmlFor="atmosferaControlada"
                  className={`text-sm font-medium cursor-pointer ${getLabelStyles()}`}
                >
                  Atmósfera controlada
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-700'}`}>
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
                    value={atmosferaControlada ? '0' : formData.cbm}
                    onChange={handleChange}
                    className={getSelectStyles()}
                    required
                    disabled={atmosferaControlada}
                  >
                    <option value="">Seleccionar CBM</option>
                    {cbmUnicos.map((cbm) => (
                      <option key={cbm} value={cbm}>
                        {cbm}
                      </option>
                    ))}
                  </select>
                  {atmosferaControlada && (
                    <p className={`text-xs ${theme === 'dark' ? 'text-sky-400' : 'text-blue-600'}`}>
                      CBM 0 cuando hay atmósfera controlada
                    </p>
                  )}
                </div>

                {/* Tratamiento de frío */}
                <div className="space-y-2">
                  <label className={`block text-sm font-medium ${getLabelStyles()}`}>
                    Tratamiento de frío
                  </label>
                  <Combobox
                    options={tratamientosDeFrioOpciones}
                    value={formData.tratamientoFrio || ''}
                    onChange={(value) => handleComboboxChange('tratamientoFrio', value)}
                    placeholder="Seleccionar tratamiento"
                    theme={theme}
                  />
                </div>

                {/* CO2 - Solo si atmósfera controlada está activada */}
                {atmosferaControlada && (
                  <div className="space-y-2">
                    <label className={`block text-sm font-medium ${getLabelStyles()}`}>
                      CO₂ (%)
                    </label>
                    <Combobox
                      options={co2sUnicos}
                      value={formData.co2 || ''}
                      onChange={(value) => handleComboboxChange('co2', value)}
                      placeholder="Seleccionar CO₂ (%)"
                      theme={theme}
                    />
                  </div>
                )}

                {/* O2 - Solo si atmósfera controlada está activada */}
                {atmosferaControlada && (
                  <div className="space-y-2">
                    <label className={`block text-sm font-medium ${getLabelStyles()}`}>
                      O₂ (%)
                    </label>
                    <Combobox
                      options={o2sUnicos}
                      value={formData.o2 || ''}
                      onChange={(value) => handleComboboxChange('o2', value)}
                      placeholder="Seleccionar O₂ (%)"
                      theme={theme}
                    />
                  </div>
                )}

              </div>
            </div>
          )}

          {/* Paso 4: Consignatario, comentario, número de copias */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-700'}`}>
                    Se generarán {copiesPreview} REF ASLI únicos automáticamente (máximo {MAX_COPIES})
                  </p>
                </div>
              </div>

              {/* Comentario */}
              <div className="space-y-2">
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
            </div>
          )}

          {/* Paso 5: Vista previa/revisión */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className={`rounded-2xl border ${theme === 'dark' ? 'border-slate-700/50 bg-gradient-to-br from-slate-900/90 to-slate-800/50' : 'border-gray-200 bg-gradient-to-br from-gray-50 to-white'} p-6 shadow-lg`}>
                <div className="mb-6 pb-4 border-b ${theme === 'dark' ? 'border-slate-700' : 'border-gray-200'}">
                  <h3 className={`text-2xl font-bold ${getLabelStyles()}`}>Vista Previa del Registro</h3>
                  <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                    Revisa toda la información antes de guardar
                  </p>
                </div>
                
                {/* Sección: Información Básica */}
                <div className="mb-6">
                  <h4 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-sky-400' : 'text-sky-600'}`}>
                    Información Básica
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-gray-200'}`}>
                      <span className={`text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>REF ASLI</span>
                      <p className={`mt-1 text-base font-bold ${getLabelStyles()}`}>{formData.refAsli}</p>
                    </div>
                    <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-gray-200'}`}>
                      <span className={`text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>REF Externa</span>
                      <p className={`mt-1 text-base ${formData.refCliente ? getLabelStyles() : 'text-red-500 font-medium'}`}>{formData.refCliente || 'No especificado'}</p>
                    </div>
                    <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-gray-200'}`}>
                      <span className={`text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Ejecutivo</span>
                      <p className={`mt-1 text-base ${getLabelStyles()}`}>{formData.ejecutivo}</p>
                    </div>
                    <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-gray-200'}`}>
                      <span className={`text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Cliente</span>
                      <p className={`mt-1 text-base ${getLabelStyles()}`}>{formData.shipper}</p>
                    </div>
                    {formData.contrato && (
                      <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-gray-200'}`}>
                        <span className={`text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Contrato</span>
                        <p className={`mt-1 text-base ${getLabelStyles()}`}>{formData.contrato}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sección: Ruta y Transporte */}
                <div className="mb-6">
                  <h4 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                    Ruta y Transporte
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-gray-200'}`}>
                      <span className={`text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Naviera</span>
                      <p className={`mt-1 text-base ${getLabelStyles()}`}>{formData.naviera}</p>
                    </div>
                    <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-gray-200'}`}>
                      <span className={`text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Nave</span>
                      <p className={`mt-1 text-base ${getLabelStyles()}`}>{formData.naveInicial} {formData.viaje ? `[${formData.viaje}]` : ''}</p>
                    </div>
                    <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-gray-200'}`}>
                      <span className={`text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>POL</span>
                      <p className={`mt-1 text-base ${getLabelStyles()}`}>{formData.pol}</p>
                    </div>
                    <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-gray-200'}`}>
                      <span className={`text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>ETD</span>
                      <p className={`mt-1 text-base font-medium ${formData.etd ? getLabelStyles() : 'text-red-500'}`}>{formData.etd || 'No especificado'}</p>
                    </div>
                    <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-gray-200'}`}>
                      <span className={`text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>POD</span>
                      <p className={`mt-1 text-base ${getLabelStyles()}`}>{formData.pod}</p>
                    </div>
                    <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-gray-200'}`}>
                      <span className={`text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>ETA</span>
                      <p className={`mt-1 text-base font-medium ${formData.eta ? getLabelStyles() : 'text-red-500'}`}>{formData.eta || 'No especificado'}</p>
                    </div>
                    <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-gray-200'}`}>
                      <span className={`text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Depósito</span>
                      <p className={`mt-1 text-base ${getLabelStyles()}`}>{formData.deposito}</p>
                    </div>
                    {(() => {
                      const transitTime = calculateTransitTime(
                        formData.etd ? parseDateString(formData.etd) : null,
                        formData.eta ? parseDateString(formData.eta) : null
                      );
                      const transitTimeDisplay = transitTime !== null ? `${transitTime} ${transitTime === 1 ? 'día' : 'días'}` : 'No especificado';
                      const transitTimeStyle = transitTime !== null ? getLabelStyles() : 'text-red-500';
                      return (
                        <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-gray-200'}`}>
                          <span className={`text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Tiempo de Tránsito</span>
                          <p className={`mt-1 text-base font-medium ${transitTimeStyle}`}>{transitTimeDisplay}</p>
                        </div>
                      );
                    })()}
                    <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-gray-200'}`}>
                      <span className={`text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Tipo de Ingreso</span>
                      <p className={`mt-1 text-base ${getLabelStyles()}`}>{formData.tipoIngreso}</p>
                    </div>
                    <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-gray-200'}`}>
                      <span className={`text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Flete</span>
                      <p className={`mt-1 text-base ${getLabelStyles()}`}>{formData.flete}</p>
                    </div>
                  </div>
                </div>

                {/* Sección: Carga */}
                <div className="mb-6">
                  <h4 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`}>
                    Información de Carga
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-gray-200'}`}>
                      <span className={`text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Especie</span>
                      <p className={`mt-1 text-base ${getLabelStyles()}`}>{formData.especie}</p>
                    </div>
                    <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-gray-200'}`}>
                      <span className={`text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Tratamiento de frío</span>
                      <p className={`mt-1 text-base font-medium ${formData.tratamientoFrio ? getLabelStyles() : 'text-red-500'}`}>{formData.tratamientoFrio || 'No especificado'}</p>
                    </div>
                    <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-gray-200'}`}>
                      <span className={`text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Temperatura</span>
                      <p className={`mt-1 text-base font-medium ${formData.temperatura ? getLabelStyles() : 'text-red-500'}`}>{formData.temperatura ? `${formData.temperatura}°C` : 'No especificado'}</p>
                    </div>
                    <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-gray-200'}`}>
                      <span className={`text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>CBM (Ventilación)</span>
                      <p className={`mt-1 text-base ${getLabelStyles()}`}>{formData.cbm || 'No especificado'}</p>
                    </div>
                    {atmosferaControlada && (
                      <>
                        <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-gray-200'} md:col-span-2`}>
                          <span className={`text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Atmósfera Controlada</span>
                          <p className={`mt-1 text-base font-semibold ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>Sí</p>
                        </div>
                        <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-gray-200'}`}>
                          <span className={`text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>CO₂</span>
                          <p className={`mt-1 text-base font-medium ${formData.co2 ? getLabelStyles() : 'text-red-500'}`}>{formData.co2 ? `${formData.co2}%` : 'No especificado'}</p>
                        </div>
                        <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-gray-200'}`}>
                          <span className={`text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>O₂</span>
                          <p className={`mt-1 text-base font-medium ${formData.o2 ? getLabelStyles() : 'text-red-500'}`}>{formData.o2 ? `${formData.o2}%` : 'No especificado'}</p>
                        </div>
                        {(formData.naviera?.includes('CMA') || formData.naviera?.includes('MSC')) && (
                          <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-gray-200'}`}>
                            <span className={`text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Tipo de Atmósfera</span>
                            <p className={`mt-1 text-base ${getLabelStyles()}`}>{formData.naviera?.includes('CMA') ? 'DAIKIN' : formData.naviera?.includes('MSC') ? 'STARCOOL' : 'No especificado'}</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Sección: Información Adicional */}
                <div className="mb-6">
                  <h4 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`}>
                    Información Adicional
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-gray-200'}`}>
                      <span className={`text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Consignatario</span>
                      <p className={`mt-1 text-base font-medium ${formData.consignatario ? getLabelStyles() : 'text-red-500'}`}>{formData.consignatario || 'No especificado'}</p>
                    </div>
                    <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-sky-800/30 border-2 border-sky-500/50' : 'bg-sky-50 border-2 border-sky-200'}`}>
                      <span className={`text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-sky-300' : 'text-sky-600'}`}>Número de Copias</span>
                      <p className={`mt-1 text-xl font-bold ${theme === 'dark' ? 'text-sky-300' : 'text-sky-700'}`}>{copiesPreview}</p>
                    </div>
                    {formData.comentario && (
                      <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-gray-200'} md:col-span-2`}>
                        <span className={`text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Comentario</span>
                        <p className={`mt-1 text-base ${getLabelStyles()} whitespace-pre-wrap`}>{formData.comentario}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className={`rounded-2xl border px-4 py-3 text-xs ${
              theme === 'dark' 
                ? 'border-red-500/40 bg-red-500/10 text-red-200' 
                : 'border-red-300 bg-red-50 text-red-700'
            }`}>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            </div>
          )}
          <div className={`flex flex-col gap-4 rounded-2xl border px-4 py-3 text-xs ${
            theme === 'dark' 
              ? 'border-slate-800/60 bg-slate-900/40 text-slate-400' 
              : 'border-gray-200 bg-gray-50 text-gray-600'
          }`}>
            <div className="flex flex-wrap items-center gap-2">
              <AlertCircle className={`h-4 w-4 ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`} />
              <span>Todos los campos marcados con (*) son obligatorios.</span>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
              <div className="flex gap-2">
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className={`inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                      theme === 'dark' 
                        ? 'border-slate-800/70 text-slate-300 hover:border-slate-500/70 hover:text-white' 
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className={`inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                    theme === 'dark' 
                      ? 'border-slate-800/70 text-slate-300 hover:border-slate-500/70 hover:text-white' 
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  Cancelar
                </button>
              </div>
              <div className="flex gap-2">
                {currentStep < 5 ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition-transform hover:scale-[1.02]"
                  >
                    Siguiente
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={isSaved ? handleRequestEmail : handleSave}
                    disabled={loading}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition-transform hover:scale-[1.02] disabled:opacity-50"
                  >
                    {loading ? 'Guardando…' : isSaved ? 'Solicitar vía correo' : 'Guardar registro'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  ) : null;
}