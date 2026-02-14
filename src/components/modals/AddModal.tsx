'use client';

import React, { useState, useEffect } from 'react';
import { X, AlertCircle, ChevronRight, ChevronLeft, Check, Calendar, Mail, RefreshCw } from 'lucide-react';
import { Combobox } from '@/components/ui/Combobox';
import { generateUniqueRefAsli } from '@/lib/ref-asli-utils';
import { createClient } from '@/lib/supabase-browser';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  generateRefAsliMobile,
  generateRefExternaMobile,
  createRegistrosMobile,
  upsertCatalogValueMobile,
  upsertNaveMappingMobile,
  setSupabaseClient
} from '@/lib/mobile-api-utils';
import { parseDateString, formatDateForInput } from '@/lib/date-utils';
import { calculateTransitTime } from '@/lib/transit-time-utils';
import { useTheme } from '@/contexts/ThemeContext';
import { syncMultipleTransportesFromRegistros } from '@/lib/sync-transportes';
import { convertSupabaseToApp } from '@/lib/migration-utils';
import type { Registro } from '@/types/registros';

interface AddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (createdRecords: Registro[]) => void;
  createdByName: string;
  userEmail?: string | null;
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
  initialData?: Partial<Registro>; // Datos iniciales para pre-llenar el formulario (copiar reserva)
}

export function AddModal({
  isOpen,
  onClose,
  onSuccess,
  createdByName,
  userEmail,
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
  tratamientosDeFrioOpciones,
  clienteFijadoPorCoincidencia,
  initialData
}: AddModalProps) {

  const { theme } = useTheme();
  const MAX_COPIES = 50;

  // Crear cliente Supabase para versión web
  const supabase = createClient();

  // Establecer el cliente para las funciones mobile-api-utils
  setSupabaseClient(supabase);

  // Verificar estado de autenticación al montar el modal
  const [authStatus, setAuthStatus] = useState<string>('');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) {
          console.error('Error de autenticación:', error);
          setAuthStatus(`Error: ${error.message}`);
        } else if (user) {
          setAuthStatus(`Autenticado como: ${user.email}`);
        } else {
          setAuthStatus('No autenticado');
        }
      } catch (err) {
        console.error('Error verificando autenticación:', err);
        setAuthStatus('Error verificando autenticación');
      }
    };

    if (isOpen) {
      checkAuth();
    }
  }, [isOpen, supabase]);

  // Helper para obtener estilos de select según el tema
  const getSelectStyles = () => {
    return theme === 'dark'
      ? 'w-full border border-slate-800/60 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 cursor-pointer pr-10'
      : 'w-full border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400/30 cursor-pointer pr-10';
  };

  const getLabelStyles = () => {
    return theme === 'dark' ? 'text-slate-200' : 'text-gray-900';
  };

  const getInputStyles = () => {
    return theme === 'dark'
      ? 'w-full border border-slate-800/60 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30'
      : 'w-full border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400/30';
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
    tipoIngreso: 'NORMAL', // Valor por defecto
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
  const isSavingRef = React.useRef(false);
  const [navesAgregadasLocalmente, setNavesAgregadasLocalmente] = useState<Record<string, string[]>>({});
  
  // Estado para guardar los registros creados temporalmente
  const [savedRecords, setSavedRecords] = useState<Registro[]>([]);
  
  // Estado para confirmación de depósito nuevo
  const [showDepositoConfirmation, setShowDepositoConfirmation] = useState(false);
  const [pendingDeposito, setPendingDeposito] = useState<string>('');
  const [depositoPendingResolve, setDepositoPendingResolve] = useState<((confirm: boolean) => void) | null>(null);

  // Estado para confirmación de nave nueva
  const [showNaveConfirmation, setShowNaveConfirmation] = useState(false);
  const [pendingNave, setPendingNave] = useState<string>('');
  const [pendingNaviera, setPendingNaviera] = useState<string>('');
  const [navePendingResolve, setNavePendingResolve] = useState<((confirm: boolean) => void) | null>(null);

  // Estado para confirmación de envío de correo
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);

  // Estado para cargar especies desde el catálogo
  const [especiesCatalogo, setEspeciesCatalogo] = useState<string[]>([]);
  const [loadingEspecies, setLoadingEspecies] = useState(false);

  const copiesPreview =
    numberOfCopies.trim() === ''
      ? 1
      : Math.max(parseInt(numberOfCopies, 10) || 1, 1);

  const requestRefAsliList = async (count: number): Promise<string[]> => {
    try {
      const result = await generateRefAsliMobile(count);
      const list = Array.isArray(result) ? result : [result];
      if (list.length !== count) {
        throw new Error('No se recibió la cantidad esperada de REF ASLI.');
      }
      return list;
    } catch (error) {
      console.error('Error generando REF ASLI móvil:', error);
      throw new Error('No se pudo generar el REF ASLI.');
    }
  };

  // upsertCatalogValue ahora usa la función móvil

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

  // Cargar especies desde el catálogo
  useEffect(() => {
    const cargarEspecies = async () => {
      if (!isOpen) return;
      
      setLoadingEspecies(true);
      try {
        const { data, error } = await supabase
          .from('catalogos')
          .select('valores')
          .eq('categoria', 'especies')
          .single();

        if (error) {
          console.error('Error cargando especies desde catálogo:', error);
          // Fallback: usar las especies de la prop si hay error
          setEspeciesCatalogo(especiesUnicas);
        } else if (data?.valores) {
          // Asegurar que sea un array de strings
          const especies = Array.isArray(data.valores) ? data.valores : [];
          setEspeciesCatalogo(especies.sort());
        } else {
          // Si no hay datos, usar las especies de la prop
          setEspeciesCatalogo(especiesUnicas);
        }
      } catch (err) {
        console.error('Error en cargarEspecies:', err);
        setEspeciesCatalogo(especiesUnicas);
      } finally {
        setLoadingEspecies(false);
      }
    };

    cargarEspecies();
  }, [isOpen, supabase, especiesUnicas]);

  // Inicializar modal sin generar REF ASLI (se genera automáticamente por trigger SQL)
  useEffect(() => {
    const initializeModal = async () => {
      if (!isOpen) return;

      setGeneratingRef(false);
      setError('');
      setNumberOfCopies('');
      setCurrentStep(1); // Resetear al paso 1 al abrir
      setAtmosferaControlada(false); // Resetear checkbox de atmósfera controlada
      setIsSaved(false); // Resetear estado de guardado
      isSavingRef.current = false; // Resetear flag de guardado
      
      // Si hay initialData (copiar reserva), pre-llenar el formulario
      if (initialData) {
        // Extraer nave y viaje si viene en formato "NAVE [VIAJE]"
        let naveInicial = initialData.naveInicial || '';
        let viaje = initialData.viaje || '';
        
        if (naveInicial && !viaje) {
          const match = naveInicial.match(/^(.+?)\s*\[(.+?)\]$/);
          if (match) {
            naveInicial = match[1].trim();
            viaje = match[2].trim();
          }
        }

        // Formatear fechas de DD-MM-YYYY si vienen en formato ISO o Date
        const formatDate = (dateValue: string | Date | null | undefined): string => {
          if (!dateValue) return '';
          try {
            // Si ya es un objeto Date, usarlo directamente
            const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
            if (isNaN(date.getTime())) return '';
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}-${month}-${year}`;
          } catch {
            // Si falla, intentar convertir a string
            return typeof dateValue === 'string' ? dateValue : '';
          }
        };

        // Verificar si tiene atmósfera controlada (CO2 u O2)
        const hasAtmosfera = !!(initialData.co2 || initialData.o2);
        
        setFormData({
          refAsli: 'Se asignará automáticamente',
          refCliente: 'Se asignará automáticamente',
          ejecutivo: initialData.ejecutivo || '',
          shipper: clienteFijadoPorCoincidencia || initialData.shipper || '',
          ingresado: formatDate(initialData.ingresado) || '',
          naviera: initialData.naviera || '',
          naveInicial: naveInicial,
          viaje: viaje,
          especie: initialData.especie || '',
          temperatura: initialData.temperatura?.toString() || '',
          cbm: hasAtmosfera ? '0' : (initialData.cbm?.toString() || ''),
          pol: initialData.pol || '',
          pod: initialData.pod || '',
          deposito: initialData.deposito || '',
          estado: 'PENDIENTE', // Las copias siempre se guardan como PENDIENTE
          tipoIngreso: initialData.tipoIngreso || 'NORMAL', // Valor por defecto si no se especifica
          flete: initialData.flete || '',
          comentario: initialData.comentario || '',
          etd: formatDate(initialData.etd) || '',
          eta: formatDate(initialData.eta) || '',
          consignatario: ('consignatario' in initialData ? (initialData as any).consignatario : '') || '',
          contrato: initialData.contrato || '',
          co2: initialData.co2?.toString() || '',
          o2: initialData.o2?.toString() || '',
          tratamientoFrio: ('tratamiento de frio' in initialData ? (initialData as any)['tratamiento de frio'] : '') || initialData.tratamientoFrio || '',
          temporada: initialData.temporada || '2025-2026',
        });

        // Si tiene atmósfera controlada, marcar el checkbox
        if (hasAtmosfera) {
          setAtmosferaControlada(true);
        }
      } else {
        // No generar REF ASLI aquí, el trigger SQL lo hará automáticamente
        setFormData(prev => ({
          ...prev,
          refAsli: 'Se asignará automáticamente',
          // Pre-seleccionar cliente si hay coincidencia con nombre de usuario
          shipper: clienteFijadoPorCoincidencia || prev.shipper
        }));
      }
    };

    initializeModal();
  }, [isOpen, clienteFijadoPorCoincidencia, initialData]);

  // Efecto para generar referencia externa automáticamente cuando cambian cliente o especie
  useEffect(() => {
    const generateRefExterna = async () => {
      if (formData.shipper && formData.especie) {
        try {
          // Ya no generamos vista previa, el trigger SQL lo hará automáticamente
          // con la lógica correcta de 4 letras para Copefrut
          setFormData(prev => ({ ...prev, refCliente: 'Se asignará automáticamente' }));
        } catch (error) {
          console.error('Error al generar referencia externa:', error);
          // No mostrar error al usuario, solo generar fallback
          const clienteLetras = formData.shipper.substring(0, 3).toUpperCase();
          const especieLetras = formData.especie.substring(0, 3).toUpperCase();
          const timestamp = Date.now().toString().slice(-4);
          const fallbackRef = `${clienteLetras}2526${especieLetras}${timestamp}`;
          setFormData(prev => ({ ...prev, refCliente: fallbackRef }));
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
        return !!(formData.naviera && formData.naveInicial && formData.pol && formData.pod && formData.flete);
      case 3:
        return !!(formData.cbm && formData.temperatura);
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

  const sendReservationEmail = async () => {
    console.log('🚀 sendReservationEmail llamada!');
    try {
      console.log('📧 Iniciando sendReservationEmail...');
      console.log('📧 userEmail:', userEmail);

      if (!userEmail) {
        alert('Error: No se encontró el email del usuario. Por favor, inicia sesión nuevamente.');
        return;
      }
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

      const emailSubject = `SOLICITUD DE RESERVA // ${resolvedCopies} // ${formData.pod || 'N/A'} // ${formData.pol || 'N/A'} // ${formData.deposito || 'N/A'} // ${formData.naviera || 'N/A'} // ${naveCompleta || 'N/A'} // ${formData.especie || 'N/A'} // ${condicionesTexto} // ${formData.flete || 'N/A'} // ${formData.shipper || 'N/A'} // ${formData.contrato || 'N/A'}`;

      const emailBody = `
        <div style="font-family: Arial, sans-serif; font-size: 11px; line-height: 1.2; color: #333;">
          <p>Estimado equipo,</p>
          <p>Favor su ayuda con la solicitud de reserva bajo el siguiente detalle:</p>
          
          <p><strong>DETALLE DE SOLICITUD DE RESERVA</strong></p>
          <ul style="margin: 5px 0; padding-left: 20px;">
            <li><strong>Cantidad:</strong> ${resolvedCopies} contenedor(es)</li>
            <li><strong>Shipper:</strong> ${formData.shipper || 'N/A'}</li>
            <li><strong>Naviera:</strong> ${formData.naviera || 'N/A'}</li>
            <li><strong>Nave:</strong> ${naveCompleta || 'N/A'}</li>
            <li><strong>Especie:</strong> ${formData.especie || 'N/A'}</li>
            <li><strong>POL:</strong> ${formData.pol || 'N/A'}</li>
            <li><strong>POD:</strong> ${formData.pod || 'N/A'}</li>
            <li><strong>Depósito:</strong> ${formData.deposito || 'N/A'}</li>
            <li><strong>Flete:</strong> ${formData.flete || 'N/A'}</li>
            <li><strong>Contrato:</strong> ${formData.contrato || 'N/A'}</li>
            <li><strong>Condiciones:</strong> ${condicionesTexto}</li>
            <li><strong>Ejecutivo:</strong> ${formData.ejecutivo || 'N/A'}</li>
            <li><strong>Fecha Ingreso:</strong> ${formData.ingresado || 'N/A'}</li>
            <li><strong>ETD:</strong> ${formData.etd || 'N/A'}</li>
            <li><strong>ETA:</strong> ${formData.eta || 'N/A'}</li>
            <li><strong>Comentario:</strong> ${formData.comentario || 'SIN COMENTARIO'}</li>
          </ul>
        </div>
      `;

      console.log('📧 Creando borrador con firma incluida...');
      console.log('📧 userEmail:', userEmail);
      console.log('📧 to:', ['rocio.villarroel@asli.cl', 'poliana.cisternas@asli.cl']);
      console.log('📧 subject:', emailSubject);

      // Enviar usando nuestra API de Gmail (crea borrador con firma)
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: ['rocio.villarroel@asli.cl', 'poliana.cisternas@asli.cl'],
          subject: emailSubject,
          body: emailBody,
          action: 'draft', // Crear borrador para que incluya la firma automáticamente
          fromEmail: userEmail, // Email del usuario que crea el registro
        }),
      });

      const result = await response.json();
      console.log('📧 Respuesta de API:', result);
      console.log('📧 Response status:', response.status);

      if (response.ok && result.draftId) {
        console.log('📧 Abriendo Gmail con draftId:', result.draftId);
        // Cerrar el diálogo de confirmación
        setShowEmailConfirmation(false);
        // Llamar a onSuccess para actualizar la UI principal
        onSuccess(savedRecords);
        // Abrir el borrador en Gmail (incluirá la firma configurada)
        const gmailWindow = window.open(`https://mail.google.com/mail/#drafts?compose=${result.draftId}`, '_blank');
        console.log('📧 Ventana abierta:', gmailWindow);

        if (!gmailWindow) {
          alert('El navegador bloqueó la ventana emergente. Por favor, permite las ventanas emergentes para este sitio.');
        } else {
          // Cerrar el modal después de abrir el correo
          setTimeout(() => {
            onClose();
          }, 500);
        }
      } else {
        console.error('❌ No se pudo crear el borrador del correo:', result);
        alert(`Error al crear el correo: ${result.error || 'Error desconocido'}`);
        setShowEmailConfirmation(false);
      }
    } catch (error) {
      console.error('Error enviando correo de solicitud de reserva:', error);
      alert('Error al enviar el correo. Por favor, intenta de nuevo.');
      setShowEmailConfirmation(false);
    }
  };

  const handleSave = async () => {
    // Solo se puede guardar desde el paso 5
    if (currentStep !== 5) {
      return;
    }

    // Prevenir ejecuciones múltiples
    if (isSavingRef.current || loading || isSaved) {
      console.warn('⚠️ handleSave ya está en ejecución o ya se guardó, ignorando llamada duplicada');
      return;
    }

    // Marcar como guardando
    isSavingRef.current = true;
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

      // Generar solo REF EXTERNA (REF ASLI se genera automáticamente por trigger SQL)
      const refExternaResult = await generateRefExternaMobile(
        formData.shipper, 
        formData.especie, 
        resolvedCopies
      );

      const refExternaList = Array.isArray(refExternaResult) ? refExternaResult : [refExternaResult];

      // Crear múltiples copias
      const baseRegistroData = {
        ingresado: formData.ingresado
          ? normalizeDateForStorage(formData.ingresado)
          : todayString,
        ejecutivo: formData.ejecutivo,
        created_by: createdByName,
        shipper: formData.shipper,
        naviera: formData.naviera,
        nave_inicial: naveCompleta,
        especie: formData.especie,
        temporada: formData.temporada, // ✅ Agregar temporada
        temperatura: formData.temperatura ? parseFloat(formData.temperatura) : null,
        cbm: formData.cbm ? parseFloat(formData.cbm) : null,
        pol: formData.pol,
        pod: formData.pod,
        deposito: formData.deposito,
        estado: formData.estado,
        tipo_ingreso: formData.tipoIngreso || 'NORMAL', // Valor por defecto si no se especifica
        flete: formData.flete,
        comentario: formData.comentario || 'SIN COMENTARIO',
        contenedor: 'POR ASIGNAR',
        co2: formData.co2 ? parseFloat(formData.co2) : null,
        o2: formData.o2 ? parseFloat(formData.o2) : null,
        tt: null,
        roleada_desde: 'POR DEFINIR',
        numero_bl: 'POR ASIGNAR',
        estado_bl: 'PENDIENTE',
        contrato: formData.contrato || 'SIN CONTRATO',
        facturacion: 'PENDIENTE',
        booking_pdf: 'SIN DOCUMENTO',
        observacion: 'SIN OBSERVACION',
        semana_ingreso: null,
        mes_ingreso: null,
        semana_zarpe: null,
        mes_zarpe: null,
        semana_arribo: null,
        mes_arribo: null,
        etd: formData.etd ? normalizeDateForStorage(formData.etd) : null,
        eta: formData.eta ? normalizeDateForStorage(formData.eta) : null,
        ingreso_stacking: null,
        booking: 'POR ASIGNAR',
        'tratamiento de frio': formData.tratamientoFrio || 'NO APLICA',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Crear múltiples registros SIN ref_asli ni ref_cliente (el trigger SQL los asignará automáticamente)
      const recordsToInsert = Array.from({ length: resolvedCopies }, (_, index) => ({
        ...baseRegistroData,
        ref_asli: null, // NULL para que el trigger lo genere automáticamente
        ref_cliente: null, // NULL para que el trigger lo genere automáticamente (con 4 letras para Copefrut)
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
        return upsertCatalogValueMobile(categoria, trimmed);
      };

      const upsertNaveMappingEntry = async (): Promise<void> => {
        const naviera = (formData.naviera || '').trim();
        const nave = (formData.naveInicial || '').trim();
        if (!naviera || !nave) return;

        const sanitizedNave = nave.replace(/\s*\[.*\]$/, '').trim();
        if (!sanitizedNave) return;

        await upsertNaveMappingMobile(naviera, sanitizedNave);
      };

      const createResult = await createRegistrosMobile(recordsToInsert);

      if (!createResult || !createResult.records) {
        console.error('❌ Error insertando registros:', createResult);
        console.error('📋 Datos que causaron el error:', JSON.stringify(recordsToInsert, null, 2));

        let errorMessage = 'Error desconocido al crear registros';

        if (createResult?.error) {
          errorMessage = createResult.error;
        }

        setError(`Error al crear los registros: ${errorMessage}`);
        setLoading(false);
        isSavingRef.current = false;
        return;
      }

      // Convertir los registros creados inmediatamente para mostrar feedback rápido
      const appRecords = createResult.records.map((record: any) => convertSupabaseToApp(record));
      
      // Guardar los registros temporalmente (NO llamar a onSuccess todavía)
      setSavedRecords(appRecords);
      
      // Marcar como guardado y mostrar feedback inmediatamente
      setIsSaved(true);
      setLoading(false);
      isSavingRef.current = false;
      
      // Mostrar diálogo de confirmación para enviar correo
      setShowEmailConfirmation(true);

      // Ejecutar actualizaciones de catálogos y sincronización en segundo plano (no bloquear)
      // Usar setTimeout para asegurar que no bloquee el hilo principal
      setTimeout(() => {
        Promise.all([
          // Actualizaciones de catálogos en paralelo
          Promise.all(
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
          ),
          // Actualización de nave mapping
          upsertNaveMappingEntry(),
        ]).catch((error) => {
          console.warn('⚠️ Error en actualizaciones de catálogos:', error);
        });

        // Sincronización con transportes en un proceso completamente separado y asíncrono
        // Esto no debe bloquear nada
        (async () => {
          if (createResult.records && createResult.records.length > 0) {
            try {
              await syncMultipleTransportesFromRegistros(appRecords);
            } catch (syncError) {
              console.warn('⚠️ Error al sincronizar transportes desde AddModal:', syncError);
            }
          }
        })().catch(() => {
          // Ignorar errores de sincronización, no deben afectar al usuario
        });
      }, 0);
    } catch (err: unknown) {
      console.error('Error al crear registro:', err);
      const message =
        err instanceof Error ? err.message : 'Error al crear el registro. Por favor, intenta de nuevo.';
      setError(message);
    } finally {
      setLoading(false);
      isSavingRef.current = false;
    }
  };

  // Obtener naves disponibles desde el mapping del catálogo
  const getAvailableNaves = () => {
    if (!formData.naviera) return [];

    const navieraKey = formData.naviera.trim();

    // Buscar primero en el mapping de navieras (incluye navieras individuales y consorcios desde catalogos_naves)
    const navesNavieraCatalogo = navierasNavesMapping[navieraKey] || [];
    const navesNavieraLocales = navesAgregadasLocalmente[navieraKey] || [];
    const navesNaviera = [...new Set([...navesNavieraCatalogo, ...navesNavieraLocales])];
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

  const registrarNaveEnEstadoLocal = (navieraNombre: string, naveNombre: string) => {
    setNavesAgregadasLocalmente((prev) => {
      const actuales = prev[navieraNombre] || [];
      const existe = actuales.some((n) => n.trim().toLowerCase() === naveNombre.trim().toLowerCase());
      if (existe) {
        return prev;
      }
      return {
        ...prev,
        [navieraNombre]: [...actuales, naveNombre].sort(),
      };
    });
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

  // Función para guardar una nueva nave en catalogos_naves
  const saveNewNaveToDatabase = async (naveNombre: string, navieraNombre: string) => {
    try {
      console.log(`📝 Guardando nave nueva: "${naveNombre}" para naviera: "${navieraNombre}"`);
      
      // OPCIÓN 1: Intentar usar la función RPC (más segura, bypass RLS)
      const { data: rpcData, error: rpcError } = await supabase.rpc('insert_nave_nueva', {
        p_nombre_nave: naveNombre,
        p_nombre_naviera: navieraNombre
      });

      if (!rpcError && rpcData?.success) {
        console.log(`✅ Nave guardada via RPC:`, rpcData);
        registrarNaveEnEstadoLocal(navieraNombre, naveNombre);
        console.log('✅ Estado local del modal actualizado');
        return;
      }

      // Si RPC no funciona, intentar método directo
      console.log('⚠️ RPC no disponible, intentando inserción directa...');
      
      // Buscar el ID de la naviera
      const { data: navieraData, error: navieraError } = await supabase
        .from('catalogos_navieras')
        .select('id')
        .eq('nombre', navieraNombre)
        .single();

      if (navieraError || !navieraData) {
        console.error('❌ Error al buscar naviera:', navieraError);
        console.error('❌ Naviera buscada:', navieraNombre);
        return;
      }

      console.log('✅ Naviera encontrada, ID:', navieraData.id);

      // Verificar si la nave ya existe en la base de datos
      const { data: existingNave } = await supabase
        .from('catalogos_naves')
        .select('id')
        .eq('nombre', naveNombre)
        .eq('naviera_id', navieraData.id)
        .maybeSingle(); // Usar maybeSingle en lugar de single para evitar error 406

      if (existingNave) {
        console.log('⚠️ La nave ya existe en la BD, no se duplicará');
        return;
      }

      console.log('💾 Insertando nueva nave en catalogos_naves...');

      // Insertar la nueva nave
      const { error: insertError } = await supabase
        .from('catalogos_naves')
        .insert({
          nombre: naveNombre,
          naviera_id: navieraData.id,
          naviera_nombre: navieraNombre,
          activo: true,
        });

      if (insertError) {
        console.error('❌ Error al insertar nueva nave:', insertError);
        console.error('❌ IMPORTANTE: Ejecuta el script "scripts/configurar-permisos-catalogos-naves.sql" o "scripts/crear-funcion-insert-nave-nueva.sql" en Supabase');
      } else {
        console.log(`✅ Nueva nave "${naveNombre}" agregada a "${navieraNombre}"`);
        registrarNaveEnEstadoLocal(navieraNombre, naveNombre);
        console.log('✅ Estado local del modal actualizado');
      }
    } catch (error) {
      console.error('❌ Error en saveNewNaveToDatabase:', error);
    }
  };

  // Función para confirmar y guardar un depósito nuevo
  const confirmAndSaveDeposito = async (depositoNombre: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setPendingDeposito(depositoNombre);
      setShowDepositoConfirmation(true);
      setDepositoPendingResolve(() => resolve);
    });
  };

  // Función para confirmar y guardar una nave nueva
  const confirmAndSaveNave = async (naveNombre: string, navieraNombre: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setPendingNave(naveNombre);
      setPendingNaviera(navieraNombre);
      setShowNaveConfirmation(true);
      setNavePendingResolve(() => resolve);
    });
  };

  const handleDepositoConfirmation = async (confirmed: boolean) => {
    setShowDepositoConfirmation(false);
    
    if (confirmed && pendingDeposito) {
      try {
        // Guardar el depósito en la tabla catalogos
        const { data: catalogoData } = await supabase
          .from('catalogos')
          .select('valores')
          .eq('categoria', 'depositos')
          .single();

        const valoresActuales = catalogoData?.valores || [];
        
        if (!valoresActuales.includes(pendingDeposito)) {
          const { error: updateError } = await supabase
            .from('catalogos')
            .update({
              valores: [...valoresActuales, pendingDeposito].sort(),
              updated_at: new Date().toISOString()
            })
            .eq('categoria', 'depositos');

          if (!updateError) {
            console.log(`✅ Depósito "${pendingDeposito}" agregado al catálogo`);
          } else {
            console.error('❌ Error al guardar depósito:', updateError);
          }
        }
      } catch (error) {
        console.error('❌ Error en confirmación de depósito:', error);
      }
    }
    
    if (depositoPendingResolve) {
      depositoPendingResolve(confirmed);
      setDepositoPendingResolve(null);
    }
    setPendingDeposito('');
  };

  const handleNaveConfirmation = async (confirmed: boolean) => {
    setShowNaveConfirmation(false);
    
    if (confirmed && pendingNave && pendingNaviera) {
      try {
        // Guardar la nave en catalogos_naves
        await saveNewNaveToDatabase(pendingNave.trim(), pendingNaviera.trim());
      } catch (error) {
        console.error('❌ Error en confirmación de nave:', error);
      }
    }
    
    if (navePendingResolve) {
      navePendingResolve(confirmed);
      setNavePendingResolve(null);
    }
    setPendingNave('');
    setPendingNaviera('');
  };

  const handleComboboxChange = async (name: string, value: string) => {
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
      // Si es una nave nueva (no existe en el catálogo), pedir confirmación antes de guardar
      if (value && formData.naviera) {
        const availableNaves = getAvailableNaves();
        const naveExists = availableNaves.some(
          (nave) => nave.trim().toLowerCase() === value.trim().toLowerCase()
        );

        if (!naveExists && value.trim()) {
          console.log(`🆕 Detectada nave nueva: "${value}" para naviera "${formData.naviera}"`);
          // Pedir confirmación antes de agregar
          const confirmed = await confirmAndSaveNave(value.trim(), formData.naviera);
          
          if (confirmed) {
            // Si se confirmó, actualizar el formData
            const naveChanged = value.trim() !== formData.naveInicial.trim();
            setFormData((prev) => ({
              ...prev,
              [name]: value,
              viaje: naveChanged ? '' : prev.viaje,
            }));
          } else {
            // Si se canceló, mantener el valor anterior
            return;
          }
          return;
        }
      }

      // Solo limpiar el viaje si la nave realmente cambió
      const naveChanged = value.trim() !== formData.naveInicial.trim();
      
      setFormData((prev) => ({
        ...prev,
        [name]: value,
        viaje: naveChanged ? '' : prev.viaje,
      }));
      return;
    }

    if (name === 'deposito') {
      // Verificar si el depósito es nuevo
      const depositoExists = depositosUnicos.some(
        (dep) => dep.trim().toLowerCase() === value.trim().toLowerCase()
      );

      if (!depositoExists && value.trim()) {
        // Pedir confirmación antes de agregar
        const confirmed = await confirmAndSaveDeposito(value.trim());
        
        if (confirmed) {
          // Si se confirmó, actualizar el formData
          setFormData((prev) => ({
            ...prev,
            [name]: value,
          }));
        } else {
          // Si se canceló, limpiar el valor
          setFormData((prev) => ({
            ...prev,
            [name]: '',
          }));
        }
        return;
      }
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return isOpen ? (
    <div className={`fixed inset-0 z-50 flex items-center justify-center backdrop-blur-xl px-2 sm:px-4 py-2 sm:py-4 overflow-y-auto ${theme === 'dark' ? 'bg-slate-950/80' : 'bg-black/50'}`}>
      <div className={`relative flex max-h-[96vh] my-auto w-full max-w-[95vw] lg:max-w-[1200px] xl:max-w-[1300px] flex-col border shadow-2xl ${theme === 'dark'
        ? 'border-slate-800/60 bg-slate-950/95'
        : 'border-gray-200 bg-white'
        }`}>
        <div className={`flex items-center justify-between border-b px-4 sm:px-6 py-3 sm:py-4 sticky top-0 z-10 ${theme === 'dark'
          ? 'border-slate-800/60 bg-slate-950/95 backdrop-blur-sm'
          : 'border-gray-200 bg-gray-50/95 backdrop-blur-sm'
          }`}>
          <div>
            <h2 className={`text-lg sm:text-xl font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-gray-900'}`}>Agregar nuevo registro</h2>
            <p className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>Completa la información del embarque</p>
          </div>
          <button
            onClick={onClose}
            className={`inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center border transition ${theme === 'dark'
              ? 'border-slate-800/70 text-slate-300 hover:border-sky-500/60 hover:text-sky-200'
              : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400 hover:text-gray-900'
              }`}
            title="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Indicadores de pasos */}
        <div className={`px-4 sm:px-6 py-3 border-b ${theme === 'dark' ? 'border-slate-800/60' : 'border-gray-200'}`}>
          <div className="flex items-center justify-center space-x-2 sm:space-x-4">
            {[1, 2, 3, 4, 5].map((step) => (
              <React.Fragment key={step}>
                <div className="flex items-center">
                  <div
                    className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 border-2 transition-all ${currentStep === step
                      ? 'bg-sky-500 border-sky-500 text-white'
                      : currentStep > step
                        ? 'bg-green-500 border-green-500 text-white'
                        : theme === 'dark'
                          ? 'bg-transparent border-slate-700 text-slate-400'
                          : 'bg-transparent border-gray-300 text-gray-500'
                      }`}
                  >
                    {currentStep > step ? (
                      <Check className="h-4 w-4 sm:h-5 sm:w-5" />
                    ) : (
                      <span className="text-xs sm:text-sm font-semibold">{step}</span>
                    )}
                  </div>
                </div>
                {step < 5 && (
                  <div
                    className={`h-0.5 w-6 sm:w-12 ${currentStep > step
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

        <div className="flex-1 px-4 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-6 overflow-y-auto max-h-[calc(96vh-220px)]">
          {/* Paso 1: Información básica */}
          {currentStep === 1 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              {/* REF ASLI */}
              <div className="space-y-1.5 sm:space-y-2">
                <label className={`block text-xs sm:text-sm font-medium ${getLabelStyles()}`}>
                  REF ASLI * (Generado automáticamente)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="refAsli"
                    value={formData.refAsli}
                    readOnly
                    disabled={generatingRef}
                    className={`w-full cursor-not-allowed border px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm ${theme === 'dark'
                      ? 'border-slate-800/60 bg-slate-900/50 text-slate-400'
                      : 'border-gray-300 bg-gray-100 text-gray-500'
                      }`}
                    placeholder={generatingRef ? "Generando..." : "A0001"}
                  />
                  {generatingRef && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin h-4 w-4 border-b-2 border-blue-600"></div>
                    </div>
                  )}
                </div>
                <p className="text-[10px] sm:text-xs text-slate-400">
                  El REF ASLI se asignará automáticamente al guardar el registro según la especie y temporada
                </p>
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <label className={`block text-xs sm:text-sm font-medium ${getLabelStyles()}`}>
                  Ref. Externa (Generada automáticamente)
                </label>
                <input
                  type="text"
                  name="refCliente"
                  value={formData.refCliente}
                  onChange={handleChange}
                  className={`${getInputStyles()} cursor-not-allowed opacity-70 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2`}
                  placeholder="Se genera automáticamente al seleccionar cliente y especie"
                  readOnly
                  title="La referencia externa se genera automáticamente basada en el cliente y la especie"
                />
                <p className={`text-[10px] sm:text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                  Formato: [3 letras cliente][2526][3 letras especie][001] (Copefrut usa 4 letras: COPE)
                </p>
              </div>

              {/* Ejecutivo */}
              <div className="space-y-1.5 sm:space-y-2">
                <label className={`block text-xs sm:text-sm font-medium ${getLabelStyles()}`}>
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
              <div className="space-y-1.5 sm:space-y-2">
                <label className={`block text-xs sm:text-sm font-medium ${getLabelStyles()}`}>
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
              <div className="space-y-1.5 sm:space-y-2">
                <label className={`block text-xs sm:text-sm font-medium ${getLabelStyles()}`}>
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
              <div className="space-y-1.5 sm:space-y-2">
                <label className={`block text-xs sm:text-sm font-medium ${getLabelStyles()}`}>
                  Especie *
                </label>
                <Combobox
                  options={especiesCatalogo}
                  value={formData.especie || ''}
                  onChange={(value) => handleComboboxChange('especie', value)}
                  placeholder={loadingEspecies ? "Cargando especies..." : "Seleccionar especie"}
                  theme={theme}
                  required
                  disabled={loadingEspecies}
                />
                {loadingEspecies && (
                  <p className={`text-[10px] sm:text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                    Cargando especies desde el catálogo...
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Paso 2: Ruta y transporte */}
          {currentStep === 2 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              {/* Naviera */}
              <div className="space-y-1.5 sm:space-y-2">
                <label className={`block text-xs sm:text-sm font-medium ${getLabelStyles()}`}>
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
                  <div className={`text-[10px] sm:text-xs ${theme === 'dark' ? 'text-sky-400' : 'text-blue-600'}`}>
                    <span className="font-medium">
                      Consorcio: {formData.naviera}
                    </span>
                  </div>
                )}
              </div>

              {/* Nave */}
              <div className="space-y-1.5 sm:space-y-2">
                <label className={`block text-xs sm:text-sm font-medium ${getLabelStyles()}`}>
                  Nave *
                  {formData.naviera && (
                    <span className={`text-[10px] sm:text-xs ml-2 ${theme === 'dark' ? 'text-sky-400' : 'text-blue-600'}`}>
                      ({naveOptions.length} disponibles)
                    </span>
                  )}
                </label>
                <Combobox
                  options={naveOptions}
                  value={formData.naveInicial || ''}
                  onChange={(value) => handleComboboxChange('naveInicial', value)}
                  placeholder={formData.naviera ? 'Seleccionar o escribir nave nueva' : 'Primero selecciona una naviera'}
                  theme={theme}
                  required
                  disabled={!formData.naviera}
                  allowCustomValue={true}
                />
                {formData.naviera && naveOptions.length === 0 && (
                  <p className={`text-[10px] sm:text-xs ${theme === 'dark' ? 'text-sky-400' : 'text-blue-600'}`}>
                    💡 No hay naves registradas. Escribe el nombre de la nave y se agregará automáticamente.
                  </p>
                )}
              </div>

              {/* Viaje */}
              <div className="space-y-1.5 sm:space-y-2">
                <label className={`block text-xs sm:text-sm font-medium ${formData.naveInicial && !formData.viaje && error.includes('Viaje')
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
                  className={`w-full border border-gray-300 bg-white px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400/30`}
                  placeholder={formData.naveInicial ? "Ej: 001E" : "Primero selecciona una nave"}
                />
                {formData.naveInicial && !formData.viaje && error.includes('Viaje') && (
                  <div className="flex items-center space-x-1 text-red-600">
                    <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                    <p className="text-[10px] sm:text-xs font-medium">
                      El número de viaje es obligatorio cuando hay una nave seleccionada
                    </p>
                  </div>
                )}
                {formData.naveInicial && formData.viaje && (
                  <p className="text-[10px] sm:text-xs text-gray-700">
                    El número de viaje se mostrará entre corchetes en la nave completa
                  </p>
                )}
              </div>

              {/* Depósito */}
              <div className="space-y-1.5 sm:space-y-2">
                <label className={`block text-xs sm:text-sm font-medium ${getLabelStyles()}`}>
                  Depósito
                </label>
                <Combobox
                  options={depositosUnicos}
                  value={formData.deposito || ''}
                  onChange={(value) => handleComboboxChange('deposito', value)}
                  placeholder="Seleccionar o escribir depósito nuevo (opcional)"
                  theme={theme}
                  allowCustomValue={true}
                />
              </div>

              {/* POL */}
              <div className="space-y-1.5 sm:space-y-2">
                <label className={`block text-xs sm:text-sm font-medium ${getLabelStyles()}`}>
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
              <div className="space-y-1.5 sm:space-y-2">
                <label className={`block text-xs sm:text-sm font-medium ${getLabelStyles()}`}>
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
              <div className="space-y-1.5 sm:space-y-2">
                <label className={`block text-xs sm:text-sm font-medium ${getLabelStyles()}`}>
                  Flete *
                </label>
                <select
                  name="flete"
                  value={formData.flete || ''}
                  onChange={handleChange}
                  className={getSelectStyles()}
                  required
                >
                  <option value="">Seleccionar flete</option>
                  {fletesUnicos.map((flete) => (
                    <option key={flete} value={flete}>
                      {flete}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tipo de Ingreso */}
              <div className="space-y-1.5 sm:space-y-2">
                <label className={`block text-xs sm:text-sm font-medium ${getLabelStyles()}`}>
                  Tipo de Ingreso
                </label>
                <select
                  name="tipoIngreso"
                  value={formData.tipoIngreso}
                  onChange={handleChange}
                  className={getSelectStyles()}
                >
                  <option value="NORMAL">NORMAL (por defecto)</option>
                  <option value="EARLY">EARLY</option>
                  <option value="LATE">LATE</option>
                  <option value="EXTRA LATE">EXTRA LATE</option>
                </select>
                <p className={`text-[10px] sm:text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                  Si no se especifica, se usará NORMAL por defecto
                </p>
              </div>

              {/* ETD */}
              <div className="space-y-1.5 sm:space-y-2">
                <label className={`block text-xs sm:text-sm font-medium ${getLabelStyles()}`}>
                  ETD
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    name="etd"
                    value={formData.etd}
                    onChange={handleChange}
                    className={`${getInputStyles()} pr-10 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2`}
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
                    <Calendar size={16} className="sm:w-[18px] sm:h-[18px]" />
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
                      } catch { }
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
                <p className={`text-[10px] sm:text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-700'}`}>
                  Formato: DD-MM-AAAA (día-mes-año)
                </p>
              </div>

              {/* ETA */}
              <div className="space-y-1.5 sm:space-y-2">
                <label className={`block text-xs sm:text-sm font-medium ${getLabelStyles()}`}>
                  ETA
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    name="eta"
                    value={formData.eta}
                    onChange={handleChange}
                    className={`${getInputStyles()} pr-10 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2`}
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
                    <Calendar size={16} className="sm:w-[18px] sm:h-[18px]" />
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
                      } catch { }
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
                <p className={`text-[10px] sm:text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-700'}`}>
                  Formato: DD-MM-AAAA (día-mes-año)
                </p>
              </div>
            </div>
          )}

          {/* Paso 3: Información de carga */}
          {currentStep === 3 && (
            <div className="space-y-3 sm:space-y-4">
              {/* Checkbox Atmósfera Controlada */}
              <div className={`flex items-center space-x-3 p-3 sm:p-4 border ${theme === 'dark'
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
                  className={`w-4 h-4 sm:w-5 sm:h-5 rounded text-sky-500 focus:ring-2 focus:ring-sky-500/50 cursor-pointer ${theme === 'dark'
                    ? 'border-slate-700 bg-slate-800'
                    : 'border-gray-300 bg-white'
                    }`}
                />
                <label
                  htmlFor="atmosferaControlada"
                  className={`text-xs sm:text-sm font-medium cursor-pointer ${getLabelStyles()}`}
                >
                  Atmósfera controlada
                </label>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                {/* Temperatura */}
                <div className="space-y-1.5 sm:space-y-2">
                  <label className={`block text-xs sm:text-sm font-medium ${getLabelStyles()}`}>
                    Temperatura (°C) *
                  </label>
                  <input
                    type="number"
                    name="temperatura"
                    value={formData.temperatura}
                    onChange={handleChange}
                    step="0.1"
                    placeholder="Ej: -0.5"
                    className={`w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border focus:outline-none focus:ring-2 ${
                      theme === 'dark'
                        ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500 focus:ring-sky-500'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-blue-500'
                    }`}
                    required
                  />
                  <p className={`text-[10px] sm:text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                    Temperatura de transporte (usar . para decimales)
                  </p>
                </div>

                {/* CBM */}
                <div className="space-y-1.5 sm:space-y-2">
                  <label className={`block text-xs sm:text-sm font-medium ${getLabelStyles()}`}>
                    CBM *
                  </label>
                  <input
                    type="number"
                    name="cbm"
                    value={atmosferaControlada ? '0' : formData.cbm}
                    onChange={handleChange}
                    step="1"
                    min="0"
                    max="100"
                    placeholder="Ej: 45"
                    className={`w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border focus:outline-none focus:ring-2 ${
                      theme === 'dark'
                        ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500 focus:ring-sky-500'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-blue-500'
                    } ${atmosferaControlada ? 'opacity-50 cursor-not-allowed' : ''}`}
                    required
                    disabled={atmosferaControlada}
                  />
                  {atmosferaControlada && (
                    <p className={`text-[10px] sm:text-xs ${theme === 'dark' ? 'text-sky-400' : 'text-blue-600'}`}>
                      CBM 0 cuando hay atmósfera controlada
                    </p>
                  )}
                  {!atmosferaControlada && (
                    <p className={`text-[10px] sm:text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                      Ventilación en CBM (metros cúbicos por hora)
                    </p>
                  )}
                </div>

                {/* Tratamiento de frío */}
                <div className="space-y-1.5 sm:space-y-2">
                  <label className={`block text-xs sm:text-sm font-medium ${getLabelStyles()}`}>
                    Tratamiento de frío
                  </label>
                  <select
                    name="tratamientoFrio"
                    value={formData.tratamientoFrio || ''}
                    onChange={handleChange}
                    className={getSelectStyles()}
                  >
                    <option value="">Seleccionar</option>
                    <option value="Aplica">Aplica</option>
                    <option value="No aplica">No aplica</option>
                  </select>
                </div>

                {/* CO2 - Solo si atmósfera controlada está activada */}
                {atmosferaControlada && (
                  <div className="space-y-1.5 sm:space-y-2">
                    <label className={`block text-xs sm:text-sm font-medium ${getLabelStyles()}`}>
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
                  <div className="space-y-1.5 sm:space-y-2">
                    <label className={`block text-xs sm:text-sm font-medium ${getLabelStyles()}`}>
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
            <div className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                {/* Consignatario */}
                <div className="space-y-1.5 sm:space-y-2">
                  <label className={`block text-xs sm:text-sm font-medium ${getLabelStyles()}`}>
                    Consignatario
                  </label>
                  <input
                    type="text"
                    name="consignatario"
                    value={formData.consignatario}
                    onChange={handleChange}
                    className={`${getInputStyles()} text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2`}
                    placeholder="Nombre del consignatario"
                  />
                </div>

                {/* Número de copias */}
                <div className="space-y-1.5 sm:space-y-2">
                  <label className={`block text-xs sm:text-sm font-medium ${getLabelStyles()}`}>
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
                    className={`${getInputStyles()} text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2`}
                  />
                  <p className={`text-[10px] sm:text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-700'}`}>
                    Se generarán {copiesPreview} REF ASLI únicos automáticamente (máximo {MAX_COPIES})
                  </p>
                </div>
              </div>

              {/* Comentario */}
              <div className="space-y-1.5 sm:space-y-2">
                <label className={`block text-xs sm:text-sm font-medium ${getLabelStyles()}`}>
                  Comentario
                </label>
                <textarea
                  name="comentario"
                  value={formData.comentario}
                  onChange={handleChange}
                  rows={3}
                  className={`${getInputStyles()} text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2`}
                  placeholder="Comentarios adicionales"
                />
              </div>
            </div>
          )}

          {/* Paso 5: Vista previa/revisión */}
          {currentStep === 5 && (
            <div className="space-y-4 sm:space-y-6">
              <div className={`border ${theme === 'dark' ? 'border-slate-700/50 bg-gradient-to-br from-slate-900/90 to-slate-800/50' : 'border-gray-200 bg-gradient-to-br from-gray-50 to-white'} p-4 sm:p-6`}>
                <div className={`mb-4 sm:mb-6 pb-3 sm:pb-4 border-b ${theme === 'dark' ? 'border-slate-700' : 'border-gray-200'}`}>
                  <h3 className={`text-lg sm:text-2xl font-bold ${getLabelStyles()}`}>Vista Previa del Registro</h3>
                  <p className={`text-xs sm:text-sm mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                    Revisa toda la información antes de guardar
                  </p>
                </div>

                {/* Sección: Información Básica */}
                <div className="mb-4 sm:mb-6">
                  <h4 className={`text-sm sm:text-lg font-semibold mb-3 sm:mb-4 ${theme === 'dark' ? 'text-sky-400' : 'text-sky-600'}`}>
                    Información Básica
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className={`p-3 sm:p-4 border ${theme === 'dark' ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-gray-200'}`}>
                      <span className={`text-[10px] sm:text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>REF ASLI</span>
                      <p className={`mt-1 text-sm sm:text-base font-bold ${getLabelStyles()}`}>{formData.refAsli}</p>
                    </div>
                    <div className={`p-3 sm:p-4 border ${theme === 'dark' ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-gray-200'}`}>
                      <span className={`text-[10px] sm:text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>REF Externa</span>
                      <p className={`mt-1 text-sm sm:text-base ${formData.refCliente ? getLabelStyles() : 'text-red-500 font-medium'}`}>{formData.refCliente || 'No especificado'}</p>
                    </div>
                    <div className={`p-3 sm:p-4 border ${theme === 'dark' ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-gray-200'}`}>
                      <span className={`text-[10px] sm:text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Ejecutivo</span>
                      <p className={`mt-1 text-sm sm:text-base ${getLabelStyles()}`}>{formData.ejecutivo}</p>
                    </div>
                    <div className={`p-3 sm:p-4 border ${theme === 'dark' ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-gray-200'}`}>
                      <span className={`text-[10px] sm:text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Cliente</span>
                      <p className={`mt-1 text-sm sm:text-base ${getLabelStyles()}`}>{formData.shipper}</p>
                    </div>
                    {formData.contrato && (
                      <div className={`p-3 sm:p-4 border ${theme === 'dark' ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-gray-200'}`}>
                        <span className={`text-[10px] sm:text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Contrato</span>
                        <p className={`mt-1 text-sm sm:text-base ${getLabelStyles()}`}>{formData.contrato}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sección: Ruta y Transporte */}
                <div className="mb-4 sm:mb-6">
                  <h4 className={`text-sm sm:text-lg font-semibold mb-3 sm:mb-4 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                    Ruta y Transporte
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className={`p-4 border ${theme === 'dark' ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-gray-200'}`}>
                      <span className={`text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Naviera</span>
                      <p className={`mt-1 text-base ${getLabelStyles()}`}>{formData.naviera}</p>
                    </div>
                    <div className={`p-4 border ${theme === 'dark' ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-gray-200'}`}>
                      <span className={`text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Nave</span>
                      <p className={`mt-1 text-base ${getLabelStyles()}`}>{formData.naveInicial} {formData.viaje ? `[${formData.viaje}]` : ''}</p>
                    </div>
                    <div className={`p-4 border ${theme === 'dark' ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-gray-200'}`}>
                      <span className={`text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>POL</span>
                      <p className={`mt-1 text-base ${getLabelStyles()}`}>{formData.pol}</p>
                    </div>
                    <div className={`p-4 border ${theme === 'dark' ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-gray-200'}`}>
                      <span className={`text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>ETD</span>
                      <p className={`mt-1 text-base font-medium ${formData.etd ? getLabelStyles() : 'text-red-500'}`}>{formData.etd || 'No especificado'}</p>
                    </div>
                    <div className={`p-4 border ${theme === 'dark' ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-gray-200'}`}>
                      <span className={`text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>POD</span>
                      <p className={`mt-1 text-base ${getLabelStyles()}`}>{formData.pod}</p>
                    </div>
                    <div className={`p-4 border ${theme === 'dark' ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-gray-200'}`}>
                      <span className={`text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>ETA</span>
                      <p className={`mt-1 text-base font-medium ${formData.eta ? getLabelStyles() : 'text-red-500'}`}>{formData.eta || 'No especificado'}</p>
                    </div>
                    <div className={`p-4 border ${theme === 'dark' ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-gray-200'}`}>
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
                        <div className={`p-4 border ${theme === 'dark' ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-gray-200'}`}>
                          <span className={`text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Tiempo de Tránsito</span>
                          <p className={`mt-1 text-base font-medium ${transitTimeStyle}`}>{transitTimeDisplay}</p>
                        </div>
                      );
                    })()}
                    <div className={`p-4 border ${theme === 'dark' ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-gray-200'}`}>
                      <span className={`text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Tipo de Ingreso</span>
                      <p className={`mt-1 text-base ${getLabelStyles()}`}>{formData.tipoIngreso}</p>
                    </div>
                    <div className={`p-4 border ${theme === 'dark' ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-gray-200'}`}>
                      <span className={`text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Flete</span>
                      <p className={`mt-1 text-base ${getLabelStyles()}`}>{formData.flete}</p>
                    </div>
                  </div>
                </div>

                {/* Sección: Carga */}
                <div className="mb-4 sm:mb-6">
                  <h4 className={`text-sm sm:text-lg font-semibold mb-3 sm:mb-4 ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`}>
                    Información de Carga
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className={`p-4 border ${theme === 'dark' ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-gray-200'}`}>
                      <span className={`text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Especie</span>
                      <p className={`mt-1 text-base ${getLabelStyles()}`}>{formData.especie}</p>
                    </div>
                    <div className={`p-4 border ${theme === 'dark' ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-gray-200'}`}>
                      <span className={`text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Tratamiento de frío</span>
                      <p className={`mt-1 text-base font-medium ${formData.tratamientoFrio ? getLabelStyles() : 'text-red-500'}`}>{formData.tratamientoFrio || 'No especificado'}</p>
                    </div>
                    <div className={`p-4 border ${theme === 'dark' ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-gray-200'}`}>
                      <span className={`text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Temperatura</span>
                      <p className={`mt-1 text-base font-medium ${formData.temperatura ? getLabelStyles() : 'text-red-500'}`}>{formData.temperatura ? `${formData.temperatura}°C` : 'No especificado'}</p>
                    </div>
                    <div className={`p-4 border ${theme === 'dark' ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-gray-200'}`}>
                      <span className={`text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>CBM (Ventilación)</span>
                      <p className={`mt-1 text-base ${getLabelStyles()}`}>{formData.cbm || 'No especificado'}</p>
                    </div>
                    {atmosferaControlada && (
                      <>
                        <div className={`p-4 border ${theme === 'dark' ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-gray-200'} md:col-span-2`}>
                          <span className={`text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Atmósfera Controlada</span>
                          <p className={`mt-1 text-base font-semibold ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>Sí</p>
                        </div>
                        <div className={`p-4 border ${theme === 'dark' ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-gray-200'}`}>
                          <span className={`text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>CO₂</span>
                          <p className={`mt-1 text-base font-medium ${formData.co2 ? getLabelStyles() : 'text-red-500'}`}>{formData.co2 ? `${formData.co2}%` : 'No especificado'}</p>
                        </div>
                        <div className={`p-4 border ${theme === 'dark' ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-gray-200'}`}>
                          <span className={`text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>O₂</span>
                          <p className={`mt-1 text-base font-medium ${formData.o2 ? getLabelStyles() : 'text-red-500'}`}>{formData.o2 ? `${formData.o2}%` : 'No especificado'}</p>
                        </div>
                        {(formData.naviera?.includes('CMA') || formData.naviera?.includes('MSC')) && (
                          <div className={`p-4 border ${theme === 'dark' ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-gray-200'}`}>
                            <span className={`text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Tipo de Atmósfera</span>
                            <p className={`mt-1 text-base ${getLabelStyles()}`}>{formData.naviera?.includes('CMA') ? 'DAIKIN' : formData.naviera?.includes('MSC') ? 'STARCOOL' : 'No especificado'}</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Sección: Información Adicional */}
                <div className="mb-4 sm:mb-6">
                  <h4 className={`text-sm sm:text-lg font-semibold mb-3 sm:mb-4 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`}>
                    Información Adicional
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className={`p-4 border ${theme === 'dark' ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-gray-200'}`}>
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
            <div className={`border px-3 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-xs ${theme === 'dark'
              ? 'border-red-500/40 bg-red-500/10 text-red-200'
              : 'border-red-300 bg-red-50 text-red-700'
              }`}>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            </div>
          )}
          <div className={`flex flex-col gap-3 sm:gap-4 border px-3 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-xs ${theme === 'dark'
            ? 'border-slate-800/60 bg-slate-900/40 text-slate-400'
            : 'border-gray-200 bg-gray-50 text-gray-600'
            }`}>

            {/* Indicador de estado de autenticación */}
            {currentStep === 5 && (
              <div className={`mb-3 sm:mb-4 p-2 sm:p-3 border ${authStatus.includes('Autenticado')
                ? theme === 'dark' ? 'bg-green-900/30 border border-green-500/50' : 'bg-green-50 border border-green-200'
                : theme === 'dark' ? 'bg-red-900/30 border border-red-500/50' : 'bg-red-50 border border-red-200'
                }`}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 flex-shrink-0 ${authStatus.includes('Autenticado') ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                  <span className={`text-xs sm:text-sm ${authStatus.includes('Autenticado')
                    ? theme === 'dark' ? 'text-green-300' : 'text-green-700'
                    : theme === 'dark' ? 'text-red-300' : 'text-red-700'
                    }`}>
                    {authStatus}
                  </span>
                </div>
                {!authStatus.includes('Autenticado') && (
                  <p className={`text-[10px] sm:text-xs mt-1 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                    Por favor cierra sesión y vuelve a iniciarla para poder guardar registros.
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-between items-center gap-2">
              <AlertCircle className={`h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0 ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`} />
              <span className="text-[10px] sm:text-xs">Todos los campos marcados con (*) son obligatorios.</span>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
              <div className="flex gap-2">
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className={`inline-flex items-center justify-center gap-1 sm:gap-2 border px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-colors ${theme === 'dark'
                      ? 'border-slate-800/70 text-slate-300 hover:border-slate-500/70 hover:text-white'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                      }`}
                  >
                    <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                    Anterior
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className={`inline-flex items-center justify-center gap-1 sm:gap-2 border px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-colors ${theme === 'dark'
                    ? 'border-slate-800/70 text-slate-300 hover:border-slate-500/70 hover:text-white'
                    : 'border-gray-300 text-gray-700 hover:border-gray-400 hover:text-gray-900'
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
                    className="inline-flex items-center justify-center gap-1 sm:gap-2 bg-sky-600 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white transition-colors hover:bg-sky-700"
                  >
                    Siguiente
                    <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                  </button>
                ) : (
                  <div className="space-y-2 sm:space-y-3 w-full">
                    {!isSaved ? (
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={loading || isSavingRef.current}
                        className="w-full inline-flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-lg font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? (
                          <>
                            <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                            Guardando…
                          </>
                        ) : (
                          <>
                            Guardar registro
                          </>
                        )}
                      </button>
                    ) : (
                      <div className={`p-3 sm:p-4 border ${theme === 'dark' ? 'bg-green-900/50 border border-green-700' : 'bg-green-50 border border-green-200'}`}>
                        <p className={`text-center font-semibold text-sm sm:text-base ${theme === 'dark' ? 'text-green-300' : 'text-green-700'}`}>
                          ✅ Registro guardado exitosamente
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Diálogo de confirmación para depósito nuevo */}
      {showDepositoConfirmation && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className={`relative w-full max-w-md mx-4 border shadow-2xl ${
            theme === 'dark'
              ? 'bg-slate-900 border-slate-700'
              : 'bg-white border-gray-300'
          }`}>
            <div className={`px-4 sm:px-6 py-3 sm:py-4 border-b ${
              theme === 'dark' ? 'border-slate-700' : 'border-gray-200'
            }`}>
              <h3 className={`text-sm sm:text-lg font-semibold ${
                theme === 'dark' ? 'text-slate-100' : 'text-gray-900'
              }`}>
                ¿Agregar nuevo depósito?
              </h3>
            </div>
            
            <div className="px-4 sm:px-6 py-3 sm:py-4">
              <p className={`text-xs sm:text-sm ${
                theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
              }`}>
                El depósito <span className="font-semibold text-sky-500">"{pendingDeposito}"</span> no existe en el catálogo.
              </p>
              <p className={`text-xs sm:text-sm mt-2 ${
                theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
              }`}>
                ¿Deseas agregarlo como nuevo depósito disponible?
              </p>
            </div>

            <div className={`px-4 sm:px-6 py-3 sm:py-4 border-t flex gap-2 sm:gap-3 justify-end ${
              theme === 'dark' ? 'border-slate-700' : 'border-gray-200'
            }`}>
              <button
                onClick={() => handleDepositoConfirmation(false)}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm border transition ${
                  theme === 'dark'
                    ? 'border-slate-600 text-slate-300 hover:bg-slate-800'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDepositoConfirmation(true)}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm border transition ${
                  theme === 'dark'
                    ? 'border-sky-500 bg-sky-600 text-white hover:bg-sky-700'
                    : 'border-blue-500 bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Sí, agregar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Diálogo de confirmación para nave nueva */}
      {showNaveConfirmation && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className={`relative w-full max-w-md mx-4 border shadow-2xl ${
            theme === 'dark'
              ? 'bg-slate-900 border-slate-700'
              : 'bg-white border-gray-300'
          }`}>
            <div className={`px-4 sm:px-6 py-3 sm:py-4 border-b ${
              theme === 'dark' ? 'border-slate-700' : 'border-gray-200'
            }`}>
              <h3 className={`text-sm sm:text-lg font-semibold ${
                theme === 'dark' ? 'text-slate-100' : 'text-gray-900'
              }`}>
                ¿Agregar nueva nave?
              </h3>
            </div>
            
            <div className="px-4 sm:px-6 py-3 sm:py-4">
              <p className={`text-xs sm:text-sm ${
                theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
              }`}>
                La nave <span className="font-semibold text-sky-500">"{pendingNave}"</span> no existe en el catálogo para la naviera <span className="font-semibold text-sky-500">"{pendingNaviera}"</span>.
              </p>
              <p className={`text-xs sm:text-sm mt-2 ${
                theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
              }`}>
                ¿Deseas agregarla como nueva nave disponible?
              </p>
            </div>

            <div className={`px-4 sm:px-6 py-3 sm:py-4 border-t flex gap-2 sm:gap-3 justify-end ${
              theme === 'dark' ? 'border-slate-700' : 'border-gray-200'
            }`}>
              <button
                onClick={() => handleNaveConfirmation(false)}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm border transition ${
                  theme === 'dark'
                    ? 'border-slate-600 text-slate-300 hover:bg-slate-800'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}
              >
                Cancelar
              </button>
              <button
                onClick={() => handleNaveConfirmation(true)}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm border transition ${
                  theme === 'dark'
                    ? 'border-sky-500 bg-sky-600 text-white hover:bg-sky-700'
                    : 'border-blue-500 bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Sí, agregar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Diálogo de confirmación para enviar correo */}
      {showEmailConfirmation && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className={`relative w-full max-w-lg mx-4 border shadow-2xl ${
            theme === 'dark'
              ? 'bg-slate-900 border-slate-700'
              : 'bg-white border-gray-300'
          }`}>
            <div className={`px-4 sm:px-6 py-3 sm:py-4 border-b ${
              theme === 'dark' ? 'border-slate-700 bg-gradient-to-r from-green-900/30 to-emerald-900/30' : 'border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${theme === 'dark' ? 'bg-green-500/20' : 'bg-green-100'}`}>
                  <Check className={`h-5 w-5 sm:h-6 sm:w-6 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                </div>
                <h3 className={`text-base sm:text-lg font-semibold ${
                  theme === 'dark' ? 'text-slate-100' : 'text-gray-900'
                }`}>
                  ¡Registro guardado exitosamente!
                </h3>
              </div>
            </div>
            
            <div className="px-4 sm:px-6 py-4 sm:py-5">
              <p className={`text-sm sm:text-base mb-3 ${
                theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
              }`}>
                El registro se ha guardado correctamente en la base de datos.
              </p>
              <div className={`p-3 rounded-lg border ${
                theme === 'dark' ? 'bg-sky-900/20 border-sky-700/50' : 'bg-sky-50 border-sky-200'
              }`}>
                <div className="flex items-start gap-2">
                  <Mail className={`h-5 w-5 flex-shrink-0 mt-0.5 ${theme === 'dark' ? 'text-sky-400' : 'text-sky-600'}`} />
                  <div>
                    <p className={`text-sm sm:text-base font-medium ${
                      theme === 'dark' ? 'text-sky-300' : 'text-sky-700'
                    }`}>
                      ¿Deseas enviar la solicitud de reserva por correo?
                    </p>
                    <p className={`text-xs sm:text-sm mt-1 ${
                      theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
                    }`}>
                      Se creará un borrador en Gmail con toda la información del registro para que puedas revisarlo antes de enviarlo.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className={`px-4 sm:px-6 py-3 sm:py-4 border-t flex flex-col sm:flex-row gap-2 sm:gap-3 ${
              theme === 'dark' ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-gray-50'
            }`}>
              <button
                onClick={() => {
                  setShowEmailConfirmation(false);
                  // Llamar a onSuccess para actualizar la UI principal
                  onSuccess(savedRecords);
                  // Cerrar el modal
                  onClose();
                }}
                className={`flex-1 px-4 py-2.5 text-sm sm:text-base font-medium border transition ${
                  theme === 'dark'
                    ? 'border-slate-600 text-slate-300 hover:bg-slate-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}
              >
                No, solo cerrar
              </button>
              <button
                onClick={sendReservationEmail}
                className={`flex-1 px-4 py-2.5 text-sm sm:text-base font-semibold flex items-center justify-center gap-2 transition shadow-lg ${
                  theme === 'dark'
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 border border-emerald-500'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700 border border-emerald-500'
                }`}
              >
                <Mail className="h-4 w-4 sm:h-5 sm:w-5" />
                Sí, enviar correo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  ) : null;
}