'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, Download, RefreshCw, TestTube } from 'lucide-react';
import { Registro } from '@/types/registros';
import { Factura, ProductoFactura } from '@/types/factura';
import { Consignatario } from '@/types/consignatarios';
import { useTheme } from '@/contexts/ThemeContext';
import { createClient } from '@/lib/supabase-browser';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/layout/Toast';
import { PlantillaAlma } from '@/components/facturas/PlantillaAlma';
import { PlantillaFruitAndes } from '@/components/facturas/PlantillaFruitAndes';
import { generarFacturaPDF } from '@/lib/factura-pdf';
import { generarFacturaExcel } from '@/lib/factura-excel';
import { generarFacturaConPlantilla } from '@/lib/plantilla-helpers';

interface FacturaCreatorProps {
  registro: Registro;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  mode?: 'factura' | 'proforma';
  onGenerateProforma?: (factura: Factura, plantillaId?: string) => Promise<void>; // Agregado plantillaId
  documentosRequeridos?: {
    guiaDespacho: boolean;
    packingList: boolean;
  };
  verificandoDocumentos?: boolean;
  puedeGenerar?: boolean;
}

const TEMPLATE_OPTIONS = [
  { value: 'ALMAFRUIT', label: 'Almafruit' },
  { value: 'FRUIT ANDES SUR', label: 'Fruit Andes Sur' },
];

const resolveTemplateFromRegistro = (registro: Registro) => {
  const shipper = registro.shipper?.toUpperCase() || '';
  if (shipper.includes('FRUIT ANDES')) {
    return 'FRUIT ANDES SUR';
  }
  return 'ALMAFRUIT';
};

export function FacturaCreator({
  registro,
  isOpen,
  onClose,
  onSave,
  mode = 'factura',
  onGenerateProforma,
  documentosRequeridos,
  verificandoDocumentos = false,
  puedeGenerar = true,
}: FacturaCreatorProps) {
  const { theme } = useTheme();
  const { success, error: showError, warning, toasts, removeToast } = useToast();
  const supabase = createClient();

  // Estado de la factura
  const [factura, setFactura] = useState<Factura>(() => {
    // Inicializar con datos del registro
    return initializeFacturaFromRegistro(registro);
  });

  const [guardando, setGuardando] = useState(false);
  const [descargandoPDF, setDescargandoPDF] = useState(false);
  const [descargandoExcel, setDescargandoExcel] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null); // HTML del Excel renderizado
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewMessage, setPreviewMessage] = useState<string | null>(null); // Mensaje informativo
  
  // Plantillas disponibles (nuevo)
  const [plantillasDisponibles, setPlantillasDisponibles] = useState<any[]>([]);
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState<string>('');
  const [cargandoPlantillas, setCargandoPlantillas] = useState(false);
  const [actualizarVistaPrevia, setActualizarVistaPrevia] = useState(false);
  const [vistaPreviaManual, setVistaPreviaManual] = useState(false);

  // Inicializar factura cuando cambia el registro
  useEffect(() => {
    if (isOpen && registro) {
      const baseFactura = initializeFacturaFromRegistro(registro);
      if (mode === 'proforma') {
        baseFactura.clientePlantilla = resolveTemplateFromRegistro(registro);
      }
      setFactura(baseFactura);
      // Generar vista previa automáticamente al abrir por primera vez
      if (mode === 'proforma') {
        setVistaPreviaManual(true);
        setActualizarVistaPrevia(true);
      }
    }
  }, [isOpen, registro, mode]);

  // Cargar plantillas disponibles (siempre, no solo en modo proforma)
  useEffect(() => {
    const cargarPlantillas = async () => {
      if (!isOpen) return;
      
      setCargandoPlantillas(true);
      try {
        const supabase = createClient();
        const clienteNombre = registro.shipper;
        
        const { data, error } = await supabase
          .from('plantillas_proforma')
          .select('*')
          .eq('activa', true)
          .or(`cliente.eq.${clienteNombre},cliente.is.null`)
          .order('es_default', { ascending: false })
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error cargando plantillas:', error);
          setPlantillasDisponibles([]);
          setPlantillaSeleccionada('');
        } else {
          // Filtrar solo plantillas activas
          const plantillasActivas = (data || []).filter(p => p.activa === true);
          setPlantillasDisponibles(plantillasActivas);
          
          // Seleccionar la primera plantilla disponible por defecto
          if (plantillasActivas.length > 0) {
            // Prioridad: 1) Default del cliente, 2) Primera del cliente, 3) Primera genérica, 4) Primera disponible
            const plantillaDefault = plantillasActivas.find(p => 
              p.cliente === clienteNombre && p.es_default
            ) || plantillasActivas.find(p => p.cliente === clienteNombre) ||
               plantillasActivas.find(p => !p.cliente && p.es_default) ||
               plantillasActivas[0];
            
            if (plantillaDefault) {
              const plantillaId = String(plantillaDefault.id);
              setPlantillaSeleccionada(plantillaId);
              console.log(`✅ Plantilla seleccionada por defecto: ${plantillaDefault.nombre} (${plantillaId})`);
            } else {
              // Si no hay plantilla default, seleccionar la primera disponible
              const primeraPlantilla = plantillasActivas[0];
              if (primeraPlantilla) {
                const plantillaId = String(primeraPlantilla.id);
                setPlantillaSeleccionada(plantillaId);
                console.log(`✅ Primera plantilla seleccionada: ${primeraPlantilla.nombre} (${plantillaId})`);
              } else {
                setPlantillaSeleccionada('');
              }
            }
          } else {
            setPlantillaSeleccionada('');
            console.warn('⚠️ No hay plantillas activas disponibles');
          }
        }
      } catch (err) {
        console.error('Error:', err);
        setPlantillasDisponibles([]);
      } finally {
        setCargandoPlantillas(false);
      }
    };

    cargarPlantillas();
  }, [isOpen, registro.shipper]);

  // Calcular totales cuando cambian los productos
  const totalesCalculados = useMemo(() => {
    let cantidadTotal = 0;
    let valorTotal = 0;

    factura.productos.forEach(producto => {
      cantidadTotal += producto.cantidad;
      // Total = cantidad × precio por caja
      const total = producto.cantidad * producto.precioPorCaja;
      valorTotal += total;
    });

    return {
      cantidadTotal,
      valorTotal,
      valorTotalTexto: numberToWords(valorTotal)
    };
  }, [factura.productos]);

  // Actualizar totales en la factura
  useEffect(() => {
    setFactura(prev => ({
      ...prev,
      totales: totalesCalculados
    }));
  }, [totalesCalculados]);

  // Función para actualizar la vista previa
  const handleActualizarVistaPrevia = () => {
    setActualizarVistaPrevia(true);
    setVistaPreviaManual(true);
  };

  // Función para llenar con datos de prueba
  const handleLlenarDatosPrueba = () => {
    const facturaPrueba: Factura = {
      ...factura,
      exportador: {
        nombre: 'EXPORTADORA ALMA FRUIT SPA',
        rut: '76.381.706-7',
        giro: 'EXPORTACION DE FRUTAS Y VERDURAS',
        direccion: 'ARTURO PEREZ CANTO 1011 CURICO',
        email: 'contacto@almafruit.cl',
      },
      consignatario: {
        nombre: 'SHENZHEN JIANRONG JIAYE TRADE CO. LTD',
        direccion: '402, KANGHE BUILDING, NO. 1 KANGHE ROAD, SHENZHEN, CHINA',
        email: 'wingkyip@woolee.com.hk',
        telefono: '852-25470088',
        contacto: 'Ms. Winsom Lau',
        telefonoContacto: '852-25470088',
        usci: '91440300MA5F5WJU0A',
        codigoPostal: '511400',
        pais: 'CHINA',
      },
      embarque: {
        fechaFactura: new Date().toISOString().split('T')[0],
        numeroInvoice: `INV-${Date.now().toString().slice(-6)}`,
        numeroEmbarque: registro.booking || '2024M4',
        fechaEmbarque: registro.etd ? new Date(registro.etd).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        motonave: registro.naveInicial || 'SKAGEN MAERSK',
        numeroViaje: registro.viaje || '447W',
        clausulaVenta: 'FOB',
        paisOrigen: 'CHILE',
        puertoEmbarque: 'SAN ANTONIO',
        puertoDestino: 'NANSHA',
        paisDestinoFinal: 'CHINA',
        formaPago: 'COB1',
        contenedor: Array.isArray(registro.contenedor) ? registro.contenedor[0] : registro.contenedor || 'MNBU407541-8',
        pesoNetoTotal: 12000,
        pesoBrutoTotal: 14400,
      },
      productos: [
        {
          cantidad: 4800,
          tipoEnvase: 'CASES',
          especie: 'CEREZA',
          variedad: 'RED CHERRIES',
          categoria: 'CAT 1',
          etiqueta: 'ALMAFRUIT',
          calibre: '2J',
          kgNetoUnidad: 2.5,
          kgBrutoUnidad: 3.0,
          precioPorKilo: 14.0,
          precioPorCaja: 35.0,
          total: 168000.0,
        },
        {
          cantidad: 3200,
          tipoEnvase: 'CASES',
          especie: 'CEREZA',
          variedad: 'RED CHERRIES',
          categoria: 'CAT 1',
          etiqueta: 'ALMAFRUIT',
          calibre: '3J',
          kgNetoUnidad: 2.5,
          kgBrutoUnidad: 3.0,
          precioPorKilo: 12.0,
          precioPorCaja: 30.0,
          total: 96000.0,
        },
      ],
    };
    
    setFactura(facturaPrueba);
    success('Datos de prueba cargados');
  };

  // Función para generar la vista previa (usando useCallback para evitar recrear la función)
  const generarVistaPrevia = React.useCallback(async () => {
    if (mode !== 'proforma') {
      return;
    }

    setIsPreviewLoading(true);
    setPreviewError(null);
    setPreviewMessage(null);
    
    try {
      const facturaCompleta = { ...factura, totales: totalesCalculados };
      const safeRef = facturaCompleta.refAsli?.replace(/\s+/g, '_') || 'PROFORMA';
      const safeInvoice = facturaCompleta.embarque.numeroInvoice?.replace(/\s+/g, '_') || 'SIN-INVOICE';
      
      // Si hay una plantilla seleccionada, generar vista previa HTML del Excel
      if (plantillaSeleccionada) {
        const supabase = createClient();
        
        // Obtener la plantilla seleccionada
        const { data: plantilla } = await supabase
          .from('plantillas_proforma')
          .select('*')
          .eq('id', plantillaSeleccionada)
          .eq('activa', true)
          .single();
        
        if (plantilla) {
          // Cargar y procesar la plantilla
          const { PlantillaExcelProcessor, facturaADatosPlantilla } = await import('@/lib/plantilla-excel-processor');
          const { data: urlData } = await supabase.storage
            .from('documentos')
            .createSignedUrl(plantilla.archivo_url, 60);
          
          if (urlData?.signedUrl) {
            const datos = await facturaADatosPlantilla(facturaCompleta);
            const processor = new PlantillaExcelProcessor(datos);
            await processor.cargarPlantilla(urlData.signedUrl);
            await processor.procesar();
            
            // Generar HTML preview del Excel procesado
            const htmlPreview = processor.generarHTMLPreview();
            
            setPreviewUrl(null); // Limpiar URL del PDF
            setPreviewHtml(htmlPreview);
            setPreviewMessage(`Vista previa con plantilla "${plantilla.nombre}". Así se verá el archivo Excel final.`);
            setIsPreviewLoading(false);
            return;
          }
        }
      }
      
      // Fallback: generar PDF tradicional
      const pdfResult = await generarFacturaPDF(facturaCompleta, {
        returnBlob: true,
        fileNameBase: `Proforma_${safeRef}_${safeInvoice}`,
      });
      if (!pdfResult || !('blob' in pdfResult)) {
        throw new Error('No se pudo generar el PDF de la proforma.');
      }
      
      const url = URL.createObjectURL(pdfResult.blob);
      setPreviewHtml(null); // Limpiar HTML
      setPreviewUrl(current => {
        if (current) {
          URL.revokeObjectURL(current);
        }
        return url;
      });
    } catch (err: any) {
      setPreviewError(err?.message || 'No se pudo generar la vista previa.');
    } finally {
      setIsPreviewLoading(false);
    }
  }, [factura, totalesCalculados, mode, plantillaSeleccionada, registro.shipper]);

  useEffect(() => {
    if (!isOpen) {
      setPreviewUrl(current => {
        if (current) {
          URL.revokeObjectURL(current);
        }
        return null;
      });
      setPreviewHtml(null);
      setPreviewMessage(null);
      setVistaPreviaManual(false);
      setActualizarVistaPrevia(false);
      return;
    }

    // Solo actualizar cuando se presiona el botón o cambia la plantilla
    if (!actualizarVistaPrevia) {
      return;
    }

    // Resetear el flag después de usarlo
    setActualizarVistaPrevia(false);

    generarVistaPrevia();
  }, [actualizarVistaPrevia, isOpen, generarVistaPrevia]);

  // Actualizar vista previa cuando cambia la plantilla
  useEffect(() => {
    if (isOpen && mode === 'proforma' && plantillaSeleccionada) {
      setActualizarVistaPrevia(true);
    }
  }, [plantillaSeleccionada, isOpen, mode]);

  const handleSave = async (e?: React.MouseEvent) => {
    // Prevenir comportamiento por defecto si hay evento
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Validaciones básicas
    const faltantes: string[] = [];

    if (!factura.exportador.nombre || !factura.exportador.nombre.trim()) {
      faltantes.push('Nombre del exportador');
    }

    if (!factura.consignatario.nombre || !factura.consignatario.nombre.trim()) {
      faltantes.push('Nombre del consignatario');
    }

    if (!factura.embarque.numeroInvoice || !factura.embarque.numeroInvoice.trim()) {
      faltantes.push('Número de invoice');
    }

    if (mode === 'proforma') {
      if (!registro.refCliente || !registro.refCliente.trim()) {
        faltantes.push('Referencia externa (REF CLIENTE)');
      }
      if (!registro.booking || !registro.booking.trim()) {
        faltantes.push('Booking');
      }
    }

    if (factura.productos.length === 0) {
      faltantes.push('Al menos un producto');
    }

    if (faltantes.length > 0) {
      showError(`Faltan datos obligatorios: ${faltantes.join(', ')}.`);
      return;
    }

    const productosConErrores = factura.productos
      .map((producto, index) => {
        const camposInvalidos: string[] = [];
        if (!producto.cantidad || producto.cantidad <= 0) {
          camposInvalidos.push('cantidad');
        }
        if (!producto.precioPorCaja || producto.precioPorCaja <= 0) {
          camposInvalidos.push('precio');
        }
        if (camposInvalidos.length === 0) {
          return null;
        }
        return `Producto ${index + 1}: ${camposInvalidos.join(' y ')}`;
      })
      .filter((item): item is string => Boolean(item));

    if (productosConErrores.length > 0) {
      showError(`Revisa los productos: ${productosConErrores.join('. ')}.`);
      return;
    }

    setGuardando(true);
    try {
      if (mode === 'proforma') {
        if (!onGenerateProforma) {
          throw new Error('No se configuró el generador de proformas.');
        }
        // Asegurar que el registroId esté presente en la factura
        const facturaCompleta = { 
          ...factura, 
          totales: totalesCalculados,
          registroId: factura.registroId || registro.id || '' // Asegurar que registroId esté presente
        };
        
        console.log('📋 Generando proforma con factura:', {
          registroId: facturaCompleta.registroId,
          tieneRegistroId: !!facturaCompleta.registroId,
          registroIdOriginal: factura.registroId,
          registroIdDelRegistro: registro.id
        });
        
        warning('Generando proforma, espera un momento...');
        const plantillaId = plantillaSeleccionada || undefined;
        
        await onGenerateProforma(facturaCompleta, plantillaId);
        setTimeout(() => {
          onSave();
        }, 300);
        return;
      }

      // Obtener usuario actual
      const { data: userData } = await supabase.auth.getUser();
      const userEmail = userData?.user?.email || 'unknown';

      // Obtener el ID de la plantilla que se está usando
      const plantillaIdGuardar: string | null = plantillaSeleccionada || null;

      // Guardar en Supabase
      const { data, error } = await supabase
        .from('facturas')
        .insert({
          registro_id: registro.id,
          ref_asli: factura.refAsli,
          exportador: factura.exportador,
          consignatario: factura.consignatario,
          embarque: factura.embarque,
          productos: factura.productos,
          totales: totalesCalculados,
          cliente_plantilla: factura.clientePlantilla,
          plantilla_id: plantillaIdGuardar, // Guardar el ID de la plantilla usada
          created_by: userEmail,
        })
        .select()
        .single();

      if (error) {
        console.error('Error de Supabase:', error);
        throw error;
      }
      success('Factura guardada exitosamente');
      
      // Cerrar modal después de un pequeño delay para que se vea el mensaje de éxito
      setTimeout(() => {
        onSave();
      }, 500);
    } catch (err: any) {
      console.error('Error guardando factura:', err);
      const errorMessage = err.message || 'Error desconocido al guardar la factura';
      if (mode === 'proforma') {
        showError(`Error al generar la proforma: ${errorMessage}`);
      } else {
        showError(`Error al guardar la factura: ${errorMessage}`);
      }
    } finally {
      setGuardando(false);
    }
  };

  const handleDownloadPDF = async () => {
    setDescargandoPDF(true);
    try {
      const facturaCompleta = { ...factura, totales: totalesCalculados };
      await generarFacturaPDF(facturaCompleta);
      success('PDF generado exitosamente');
    } catch (err: any) {
      console.error('Error generando PDF:', err);
      showError('Error al generar PDF: ' + err.message);
    } finally {
      setDescargandoPDF(false);
    }
  };

  const handleDownloadExcel = async () => {
    setDescargandoExcel(true);
    try {
      const facturaCompleta = { ...factura, totales: totalesCalculados };
      
      // SIEMPRE usar plantilla personalizada - NO hay formato genérico
      // Validar que haya una plantilla seleccionada
      const plantillaIdStr = plantillaSeleccionada ? String(plantillaSeleccionada) : '';
      const esValida = plantillaIdStr && plantillaIdStr.trim() !== '';
      
      console.log('🔍 Validando plantilla antes de descargar Excel:', {
        plantillaSeleccionada,
        plantillaIdStr,
        tipo: typeof plantillaSeleccionada,
        esValida,
        plantillasDisponibles: plantillasDisponibles.length,
        plantillasIds: plantillasDisponibles.map(p => String(p.id))
      });
      
      if (!esValida) {
        console.error('❌ No hay plantilla seleccionada');
        showError('Debes seleccionar una plantilla. Ve a la sección de Plantillas de Factura para subir una si no hay disponibles.');
        return;
      }
      
      // Verificar que la plantilla seleccionada existe en las disponibles
      const plantillaExiste = plantillasDisponibles.some(p => String(p.id) === plantillaIdStr);
      
      if (!plantillaExiste) {
        console.error('❌ La plantilla seleccionada no existe en las disponibles:', {
          plantillaSeleccionada: plantillaIdStr,
          plantillasDisponibles: plantillasDisponibles.map(p => ({ id: String(p.id), nombre: p.nombre }))
        });
        showError('La plantilla seleccionada no está disponible. Por favor, selecciona otra plantilla.');
        return;
      }
      
      console.log('✅ Plantilla validada correctamente:', plantillaIdStr);
      const plantillaId = plantillaIdStr;
      
      // Usar plantilla personalizada
      const resultado = await generarFacturaConPlantilla(facturaCompleta, plantillaId);
      if (resultado && resultado.blob) {
        const url = URL.createObjectURL(resultado.blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = resultado.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        success('Excel generado exitosamente con plantilla personalizada');
      }
    } catch (err: any) {
      console.error('Error generando Excel:', err);
      showError('Error al generar Excel: ' + err.message);
    } finally {
      setDescargandoExcel(false);
    }
  };

  const handleGenerarProforma = async () => {
    if (!onGenerateProforma) {
      showError('No se ha configurado el generador de proformas');
      return;
    }

    try {
      const facturaCompleta = { ...factura, totales: totalesCalculados };
      await onGenerateProforma(facturaCompleta, plantillaSeleccionada);
      success('Proforma generada exitosamente');
      onClose();
    } catch (err: any) {
      console.error('Error generando proforma:', err);
      showError('Error al generar proforma: ' + err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div
        className={`absolute inset-0 w-full h-full shadow-xl overflow-hidden flex flex-col ${
          theme === 'dark' ? 'bg-gray-900' : 'bg-white'
        }`}
      >
        {/* Header Compacto y Moderno */}
        <div
          className={`flex items-center justify-between px-4 py-2.5 border-b ${
            theme === 'dark' ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50/80'
          }`}
        >
          <div className="flex items-center gap-4">
            <h2 className={`text-base font-semibold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {mode === 'proforma' ? '📄 Proforma Invoice' : '🧾 Factura Comercial'}
            </h2>
            {factura.refAsli && (
              <span className={`text-xs px-2 py-1 rounded-full ${
                theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
              }`}>
                {factura.refAsli}
              </span>
            )}
            <div className="flex items-center gap-2">
              <label className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Plantilla:
              </label>
              {cargandoPlantillas ? (
                <div className="flex items-center gap-2 text-xs">
                  <div className="animate-spin rounded-full h-3 w-3 border-2 border-blue-500 border-t-transparent" />
                </div>
              ) : (
                <select
                  value={String(plantillaSeleccionada || '')}
                  onChange={(event) => {
                    const nuevoValor = event.target.value;
                    console.log('🔄 Cambiando plantilla seleccionada:', {
                      anterior: plantillaSeleccionada,
                      nuevo: nuevoValor,
                      tipo: typeof nuevoValor
                    });
                    setPlantillaSeleccionada(nuevoValor);
                    // Cuando cambia la plantilla, actualizar vista previa automáticamente
                    setVistaPreviaManual(false);
                    setActualizarVistaPrevia(true);
                  }}
                  className={`text-xs px-2 py-1 rounded border ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  {plantillasDisponibles.length > 0 ? (
                    <>
                      {plantillasDisponibles.filter(p => p.cliente === registro.shipper).length > 0 && (
                        <optgroup label="Plantillas del Cliente">
                          {plantillasDisponibles
                            .filter(p => p.cliente === registro.shipper)
                            .map((plantilla) => (
                              <option key={plantilla.id} value={String(plantilla.id)}>
                                ✨ {plantilla.nombre}
                              </option>
                            ))}
                        </optgroup>
                      )}
                      {plantillasDisponibles.filter(p => !p.cliente).length > 0 && (
                        <optgroup label="Plantillas Genéricas">
                          {plantillasDisponibles
                            .filter(p => !p.cliente)
                            .map((plantilla) => (
                              <option key={plantilla.id} value={String(plantilla.id)}>
                                🌐 {plantilla.nombre}
                              </option>
                            ))}
                        </optgroup>
                      )}
                    </>
                  ) : (
                    <option value="">No hay plantillas disponibles</option>
                  )}
                </select>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {mode === 'proforma' && (
              <button
                onClick={handleGenerarProforma}
                disabled={!puedeGenerar || verificandoDocumentos}
                className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                  !puedeGenerar || verificandoDocumentos
                    ? 'cursor-not-allowed bg-gray-300 text-gray-500'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <Download className="h-4 w-4" />
                Generar
              </button>
            )}
            {mode !== 'proforma' && (
              <>
                <button
                  onClick={handleDownloadPDF}
                  disabled={descargandoPDF}
                  className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                    descargandoPDF
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  <Download className="h-4 w-4" />
                  PDF
                </button>
                <button
                  onClick={handleDownloadExcel}
                  disabled={descargandoExcel}
                  className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                    descargandoExcel
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  <Download className="h-4 w-4" />
                  Excel
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className={`rounded p-1.5 transition-colors ${
                theme === 'dark'
                  ? 'hover:bg-gray-700 text-gray-400'
                  : 'hover:bg-gray-200 text-gray-600'
              }`}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Formulario lateral (30%) */}
          <div
            className={`w-[30%] border-r overflow-y-auto p-3 ${
              theme === 'dark' ? 'border-gray-700 bg-gray-900/50' : 'border-gray-200 bg-gray-50'
            }`}
          >
            <FormularioFactura factura={factura} setFactura={setFactura} />
          </div>

          {/* Vista previa (70%) */}
          <div className="flex-1 overflow-hidden bg-white">
            {mode === 'proforma' ? (
              <div className="relative h-full w-full bg-gray-100">
                {/* Botón Actualizar Vista Previa */}
                <div className="absolute top-2 right-2 z-20">
                  <button
                    onClick={handleActualizarVistaPrevia}
                    disabled={isPreviewLoading}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors shadow-md ${
                      isPreviewLoading
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : theme === 'dark'
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                    title="Actualizar vista previa"
                  >
                    <RefreshCw className={`h-4 w-4 ${isPreviewLoading ? 'animate-spin' : ''}`} />
                    <span>Actualizar Vista Previa</span>
                  </button>
                </div>
                
                {/* Nota informativa sobre plantilla */}
                {previewMessage && (
                  <div className="absolute top-2 left-2 right-24 z-10 bg-blue-50 border border-blue-200 rounded-md p-2 text-xs text-blue-700">
                    <div className="flex items-start gap-2">
                      <span className="text-base">📋</span>
                      <div>
                        <strong>{previewMessage}</strong>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Vista previa HTML del Excel (con plantilla) */}
                {previewHtml ? (
                  <div className="h-full w-full overflow-auto bg-white p-4">
                    <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
                  </div>
                ) : previewUrl ? (
                  <iframe
                    title="Vista previa PDF de la proforma"
                    src={previewUrl}
                    className="h-full w-full border-0"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm text-gray-500">
                    No hay vista previa disponible.
                  </div>
                )}
                {isPreviewLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-sm text-gray-600">
                    Generando vista previa...
                  </div>
                )}
                {!isPreviewLoading && previewError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/80 text-sm text-red-600">
                    {previewError}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full overflow-y-auto p-4">
                {factura.clientePlantilla === 'FRUIT ANDES SUR' ? (
                  <PlantillaFruitAndes factura={{ ...factura, totales: totalesCalculados }} />
                ) : (
                  <PlantillaAlma factura={{ ...factura, totales: totalesCalculados }} />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className={`flex flex-col space-y-3 p-4 border-t ${
            theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
          }`}
        >
          {/* Advertencia de documentos requeridos para proforma */}
          {mode === 'proforma' && documentosRequeridos && (
            <div className={`p-3 rounded-lg border ${
              puedeGenerar
                ? theme === 'dark'
                  ? 'bg-green-900/30 border-green-700 text-green-300'
                  : 'bg-green-50 border-green-200 text-green-800'
                : theme === 'dark'
                  ? 'bg-orange-900/30 border-orange-700 text-orange-300'
                  : 'bg-orange-50 border-orange-200 text-orange-800'
            }`}>
              {verificandoDocumentos ? (
                <p className="text-sm">Verificando documentos requeridos...</p>
              ) : puedeGenerar ? (
                <p className="text-sm">✓ Todos los documentos requeridos están disponibles. Puedes generar la proforma.</p>
              ) : (
                <div className="text-sm">
                  <p className="font-semibold mb-1">⚠ Documentos requeridos faltantes:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {!documentosRequeridos.guiaDespacho && <li>Guía de Despacho</li>}
                    {!documentosRequeridos.packingList && <li>Packing List</li>}
                  </ul>
                  <p className="mt-2 text-xs opacity-90">
                    Por favor, sube estos documentos en la sección de Documentos antes de generar la proforma.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between">
            <button
              onClick={handleLlenarDatosPrueba}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 text-sm ${
                theme === 'dark'
                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                  : 'bg-purple-500 text-white hover:bg-purple-600'
              }`}
              title="Llenar con datos de prueba"
            >
              <TestTube className="w-4 h-4" />
              <span>Datos de Prueba</span>
            </button>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  theme === 'dark'
                    ? 'text-gray-300 hover:bg-gray-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSave(e);
                }}
                disabled={guardando || (mode === 'proforma' && !puedeGenerar)}
                className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
                  guardando || (mode === 'proforma' && !puedeGenerar)
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <Save className="w-4 h-4" />
                <span>{guardando ? 'Guardando...' : mode === 'proforma' ? 'Generar Proforma' : 'Guardar Factura'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente del formulario
function FormularioFactura({
  factura,
  setFactura,
}: {
  factura: Factura;
  setFactura: React.Dispatch<React.SetStateAction<Factura>>;
}) {
  const { theme } = useTheme();
  const supabase = createClient();
  const [consignatarios, setConsignatarios] = useState<Consignatario[]>([]);
  const [selectedConsignatarioId, setSelectedConsignatarioId] = useState<string>('');
  const [loadingConsignatarios, setLoadingConsignatarios] = useState(true);

  // Cargar consignatarios activos
  useEffect(() => {
    const loadConsignatarios = async () => {
      try {
        const { data, error } = await supabase
          .from('consignatarios')
          .select('*')
          .eq('activo', true)
          .order('nombre', { ascending: true });

        if (error) throw error;
        setConsignatarios(data || []);
      } catch (error) {
        console.error('Error cargando consignatarios:', error);
      } finally {
        setLoadingConsignatarios(false);
      }
    };

    loadConsignatarios();
  }, [supabase]);

  // Aplicar datos del consignatario seleccionado
  const handleSelectConsignatario = (consignatarioId: string) => {
    setSelectedConsignatarioId(consignatarioId);
    
    if (!consignatarioId) return;

    const consignatario = consignatarios.find(c => c.id === consignatarioId);
    if (!consignatario) return;

    setFactura(prev => ({
      ...prev,
      consignatario: {
        ...prev.consignatario,
        nombre: consignatario.consignee_company,
        direccion: consignatario.consignee_address || '',
        email: consignatario.consignee_email || '',
        telefono: consignatario.consignee_mobile || '',
        telefonoContacto: consignatario.consignee_mobile || '',
        contacto: consignatario.consignee_attn || '',
        codigoPostal: consignatario.consignee_zip || '',
        usci: consignatario.consignee_uscc || '',
      },
      notifyParty: {
        nombre: consignatario.notify_company || '',
        direccion: consignatario.notify_address || '',
        email: consignatario.notify_email || '',
        telefono: consignatario.notify_mobile || '',
        contacto: consignatario.notify_attn || '',
        codigoPostal: consignatario.notify_zip || '',
        usci: consignatario.notify_uscc || '',
      },
    }));
  };

  const updateFactura = (path: string, value: any) => {
    setFactura(prev => {
      const newFactura = { ...prev };
      const keys = path.split('.');
      let current: any = newFactura;
      
      // Si estamos actualizando notifyParty y no existe, inicializarlo
      if (keys[0] === 'notifyParty' && !newFactura.notifyParty) {
        newFactura.notifyParty = {
          nombre: '',
          direccion: '',
          email: '',
          telefono: '',
          contacto: '',
          telefonoContacto: '',
          usci: '',
          codigoPostal: '',
        };
      }
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      
      // Si se actualiza el PAIS DESTINO FINAL, sincronizar con el país del consignatario
      if (path === 'embarque.paisDestinoFinal') {
        newFactura.consignatario.pais = value;
      }
      
      return newFactura;
    });
  };

  const addProducto = () => {
    setFactura(prev => ({
      ...prev,
      productos: [
        {
          cantidad: 0,
          tipoEnvase: 'CASES',
          especie: prev.productos[0]?.especie || '',
          variedad: '',
          categoria: 'CAT 1',
          etiqueta: prev.exportador.nombre,
          calibre: '',
          kgNetoUnidad: 0,
          kgBrutoUnidad: 0,
          precioPorKilo: 0,
          precioPorCaja: 0,
          total: 0,
        },
        ...prev.productos,
      ],
    }));
  };

  const removeProducto = (index: number) => {
    setFactura(prev => ({
      ...prev,
      productos: prev.productos.filter((_, i) => i !== index),
    }));
  };

  const updateProducto = (index: number, field: keyof ProductoFactura, value: any) => {
    setFactura(prev => {
      const newProductos = [...prev.productos];
      const producto = { ...newProductos[index] };
      
      // Actualizar el campo modificado
      (producto as any)[field] = value;
      
      // Si se cambia el tipo de caja, actualizar automáticamente kgNetoUnidad
      if (field === 'tipoEnvase') {
        if (value === '5KG') {
          producto.kgNetoUnidad = 5.0;
        } else if (value === '2.5KG') {
          producto.kgNetoUnidad = 2.5;
        }
      }
      
      // Conversión automática entre precio por kilo y precio por caja
      if (field === 'precioPorKilo') {
        // Si cambia precio por kilo, calcular precio por caja
        if (producto.kgNetoUnidad > 0) {
          producto.precioPorCaja = producto.precioPorKilo * producto.kgNetoUnidad;
        }
      } else if (field === 'precioPorCaja') {
        // Si cambia precio por caja, calcular precio por kilo
        if (producto.kgNetoUnidad > 0) {
          producto.precioPorKilo = producto.precioPorCaja / producto.kgNetoUnidad;
        }
      } else if (field === 'kgNetoUnidad') {
        // Si cambia kg neto, recalcular precio por caja basado en precio por kilo
        if (producto.precioPorKilo > 0) {
          producto.precioPorCaja = producto.precioPorKilo * producto.kgNetoUnidad;
        }
      }
      
      // Recalcular total: cantidad × precio por caja
      producto.total = producto.cantidad * producto.precioPorCaja;
      
      newProductos[index] = producto;
      return { ...prev, productos: newProductos };
    });
  };

  return (
    <div className="space-y-6">
      <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
        Información de la Factura
      </h3>

      {/* Exportador */}
      <section className="space-y-2">
        <h4 className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
          Exportador
        </h4>
        <input
          type="text"
          value={factura.exportador.nombre}
          onChange={e => updateFactura('exportador.nombre', e.target.value)}
          className={`w-full px-3 py-2 rounded border ${
            theme === 'dark'
              ? 'bg-gray-800 border-gray-700 text-white'
              : 'bg-white border-gray-300 text-gray-900'
          }`}
          placeholder="Nombre"
        />
        <input
          type="text"
          value={factura.exportador.rut}
          onChange={e => updateFactura('exportador.rut', e.target.value)}
          className={`w-full px-3 py-2 rounded border ${
            theme === 'dark'
              ? 'bg-gray-800 border-gray-700 text-white'
              : 'bg-white border-gray-300 text-gray-900'
          }`}
          placeholder="RUT"
        />
        <input
          type="text"
          value={factura.exportador.giro}
          onChange={e => updateFactura('exportador.giro', e.target.value)}
          className={`w-full px-3 py-2 rounded border ${
            theme === 'dark'
              ? 'bg-gray-800 border-gray-700 text-white'
              : 'bg-white border-gray-300 text-gray-900'
          }`}
          placeholder="Giro"
        />
        <textarea
          value={factura.exportador.direccion}
          onChange={e => updateFactura('exportador.direccion', e.target.value)}
          className={`w-full px-3 py-2 rounded border ${
            theme === 'dark'
              ? 'bg-gray-800 border-gray-700 text-white'
              : 'bg-white border-gray-300 text-gray-900'
          }`}
          placeholder="Dirección"
          rows={2}
        />
      </section>

      {/* Consignatario */}
      <section className="space-y-4">
        <h4 className={`font-semibold text-base ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
          Consignatario
        </h4>
        
        {/* Selector de consignatarios */}
        <div className={`p-4 rounded-lg border-2 ${
          theme === 'dark' ? 'bg-gray-800/50 border-gray-600' : 'bg-blue-50 border-blue-300'
        }`}>
          <label className={`block text-sm font-semibold mb-3 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
            📋 Seleccionar Consignatario Guardado
          </label>
          <select
            value={selectedConsignatarioId}
            onChange={(e) => handleSelectConsignatario(e.target.value)}
            disabled={loadingConsignatarios}
            className={`w-full px-4 py-3 rounded-lg border font-medium text-sm ${
              theme === 'dark'
                ? 'bg-gray-900 border-gray-600 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            <option value="">
              {loadingConsignatarios ? '⏳ Cargando...' : '✏️ Ingresar manualmente'}
            </option>
            {consignatarios.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} - {c.cliente} ({c.destino})
              </option>
            ))}
          </select>
          {consignatarios.length === 0 && !loadingConsignatarios && (
            <p className={`text-xs mt-3 p-3 rounded-lg ${theme === 'dark' ? 'bg-yellow-900/20 text-yellow-300 border border-yellow-700' : 'bg-yellow-50 text-yellow-800 border border-yellow-200'}`}>
              ℹ️ No hay consignatarios registrados. Puedes agregar uno en <strong>Mantenimiento → Consignatarios</strong>.
            </p>
          )}
          {selectedConsignatarioId && (
            <p className={`text-xs mt-3 p-3 rounded-lg ${theme === 'dark' ? 'bg-green-900/20 text-green-300 border border-green-700' : 'bg-green-50 text-green-700 border border-green-200'}`}>
              ✅ Datos cargados automáticamente
            </p>
          )}
        </div>

        {/* Separador visual */}
        <div className={`flex items-center gap-3 my-6 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
          <div className={`flex-1 h-px ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
          <span className="text-xs font-medium">DATOS DEL CONSIGNATARIO</span>
          <div className={`flex-1 h-px ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
        </div>

        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Company
            </label>
            <input
              type="text"
              value={factura.consignatario.nombre}
              onChange={e => updateFactura('consignatario.nombre', e.target.value)}
              className={`w-full px-4 py-3 rounded-lg border text-sm ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              }`}
              placeholder="Company"
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Address
            </label>
            <textarea
              value={factura.consignatario.direccion}
              onChange={e => updateFactura('consignatario.direccion', e.target.value)}
              className={`w-full px-4 py-3 rounded-lg border text-sm ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              }`}
              placeholder="Address"
              rows={3}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Attn
            </label>
            <input
              type="text"
              value={factura.consignatario.contacto || ''}
              onChange={e => updateFactura('consignatario.contacto', e.target.value)}
              className={`w-full px-4 py-3 rounded-lg border text-sm ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              }`}
              placeholder="Attn"
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              USCC
            </label>
            <input
              type="text"
              value={factura.consignatario.usci || ''}
              onChange={e => updateFactura('consignatario.usci', e.target.value)}
              className={`w-full px-4 py-3 rounded-lg border text-sm ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              }`}
              placeholder="USCC"
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Mobile
            </label>
            <input
              type="text"
              value={factura.consignatario.telefono || factura.consignatario.telefonoContacto || ''}
              onChange={e => {
                updateFactura('consignatario.telefono', e.target.value);
                updateFactura('consignatario.telefonoContacto', e.target.value);
              }}
              className={`w-full px-4 py-3 rounded-lg border text-sm ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              }`}
              placeholder="Mobile"
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              E-mail
            </label>
            <input
              type="text"
              value={factura.consignatario.email || ''}
              onChange={e => updateFactura('consignatario.email', e.target.value)}
              className={`w-full px-4 py-3 rounded-lg border text-sm ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              }`}
              placeholder="E-mail"
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              ZIP
            </label>
            <input
              type="text"
              value={factura.consignatario.codigoPostal || ''}
              onChange={e => updateFactura('consignatario.codigoPostal', e.target.value)}
              className={`w-full px-4 py-3 rounded-lg border text-sm ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              }`}
              placeholder="ZIP"
            />
          </div>
        </div>
      </section>

      {/* Notify Party */}
      <section className="space-y-4">
        <h4 className={`font-semibold text-base ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
          Notify Party
        </h4>

        {/* Separador visual */}
        <div className={`flex items-center gap-3 my-6 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
          <div className={`flex-1 h-px ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
          <span className="text-xs font-medium">DATOS DEL NOTIFY PARTY</span>
          <div className={`flex-1 h-px ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
        </div>

        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Company
            </label>
            <input
              type="text"
              value={factura.notifyParty?.nombre || ''}
              onChange={e => updateFactura('notifyParty.nombre', e.target.value)}
              className={`w-full px-4 py-3 rounded-lg border text-sm ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              }`}
              placeholder="Company"
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Address
            </label>
            <textarea
              value={factura.notifyParty?.direccion || ''}
              onChange={e => updateFactura('notifyParty.direccion', e.target.value)}
              className={`w-full px-4 py-3 rounded-lg border text-sm ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              }`}
              placeholder="Address"
              rows={3}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Attn
            </label>
            <input
              type="text"
              value={factura.notifyParty?.contacto || ''}
              onChange={e => updateFactura('notifyParty.contacto', e.target.value)}
              className={`w-full px-4 py-3 rounded-lg border text-sm ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              }`}
              placeholder="Attn"
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              USCC
            </label>
            <input
              type="text"
              value={factura.notifyParty?.usci || ''}
              onChange={e => updateFactura('notifyParty.usci', e.target.value)}
              className={`w-full px-4 py-3 rounded-lg border text-sm ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              }`}
              placeholder="USCC"
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Mobile
            </label>
            <input
              type="text"
              value={factura.notifyParty?.telefono || ''}
              onChange={e => updateFactura('notifyParty.telefono', e.target.value)}
              className={`w-full px-4 py-3 rounded-lg border text-sm ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              }`}
              placeholder="Mobile"
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              E-mail
            </label>
            <input
              type="text"
              value={factura.notifyParty?.email || ''}
              onChange={e => updateFactura('notifyParty.email', e.target.value)}
              className={`w-full px-4 py-3 rounded-lg border text-sm ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              }`}
              placeholder="E-mail"
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              ZIP
            </label>
            <input
              type="text"
              value={factura.notifyParty?.codigoPostal || ''}
              onChange={e => updateFactura('notifyParty.codigoPostal', e.target.value)}
              className={`w-full px-4 py-3 rounded-lg border text-sm ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              }`}
              placeholder="ZIP"
            />
          </div>
        </div>
      </section>

      {/* Embarque */}
      <section className="space-y-2">
        <h4 className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
          Embarque
        </h4>
        <div>
          <label className={`block text-xs mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Fecha Factura
          </label>
          <input
            type="date"
            value={factura.embarque.fechaFactura}
            onChange={e => updateFactura('embarque.fechaFactura', e.target.value)}
            className={`w-full px-3 py-2 rounded border ${
              theme === 'dark'
                ? 'bg-gray-800 border-gray-700 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          />
        </div>
        <div>
          <label className={`block text-xs mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            INVOICE N° *
          </label>
          <input
            type="text"
            value={factura.embarque.numeroInvoice}
            onChange={e => updateFactura('embarque.numeroInvoice', e.target.value)}
            className={`w-full px-3 py-2 rounded border ${
              theme === 'dark'
                ? 'bg-gray-800 border-gray-700 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
            placeholder="N° Invoice"
          />
        </div>
        <div>
          <label className={`block text-xs mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            EMBARQUE N°
          </label>
          <input
            type="text"
            value={factura.embarque.numeroEmbarque}
            onChange={e => updateFactura('embarque.numeroEmbarque', e.target.value)}
            className={`w-full px-3 py-2 rounded border ${
              theme === 'dark'
                ? 'bg-gray-800 border-gray-700 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
            placeholder="N° Embarque"
          />
        </div>
        <div>
          <label className={`block text-xs mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Fecha Embarque
          </label>
          <input
            type="date"
            value={factura.embarque.fechaEmbarque}
            onChange={e => updateFactura('embarque.fechaEmbarque', e.target.value)}
            className={`w-full px-3 py-2 rounded border ${
              theme === 'dark'
                ? 'bg-gray-800 border-gray-700 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={`block text-xs mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              CSP
            </label>
            <input
              type="text"
              value={factura.embarque.csp || ''}
              onChange={e => updateFactura('embarque.csp', e.target.value)}
              className={`w-full px-3 py-2 rounded border ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              placeholder="CSP"
            />
          </div>
          <div>
            <label className={`block text-xs mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              CSG
            </label>
            <input
              type="text"
              value={factura.embarque.csg || ''}
              onChange={e => updateFactura('embarque.csg', e.target.value)}
              className={`w-full px-3 py-2 rounded border ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              placeholder="CSG"
            />
          </div>
        </div>
        {/* Nave - Solo lectura (viene del registro) */}
        <div>
          <label className={`block text-xs mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Nave (automático)
          </label>
          <input
            type="text"
            value={factura.embarque.motonave}
            readOnly
            disabled
            className={`w-full px-3 py-2 rounded border ${
              theme === 'dark'
                ? 'bg-gray-700 border-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-gray-100 border-gray-300 text-gray-600 cursor-not-allowed'
            }`}
            placeholder="Nave"
          />
        </div>
        {/* Número de Viaje - Solo lectura (viene del registro) */}
        <div>
          <label className={`block text-xs mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            N° Viaje (automático)
          </label>
          <input
            type="text"
            value={factura.embarque.numeroViaje}
            readOnly
            disabled
            className={`w-full px-3 py-2 rounded border ${
              theme === 'dark'
                ? 'bg-gray-700 border-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-gray-100 border-gray-300 text-gray-600 cursor-not-allowed'
            }`}
            placeholder="N° Viaje"
          />
        </div>
        <div>
          <label className={`block text-xs mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Cláusula de Venta
          </label>
          <input
            type="text"
            value={factura.embarque.clausulaVenta}
            onChange={e => updateFactura('embarque.clausulaVenta', e.target.value)}
            className={`w-full px-3 py-2 rounded border ${
              theme === 'dark'
                ? 'bg-gray-800 border-gray-700 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
            placeholder="FOB, CIF, etc."
          />
        </div>
        <div>
          <label className={`block text-xs mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Modalidad de Venta
          </label>
          <input
            type="text"
            value={factura.embarque.modalidadVenta || ''}
            onChange={e => updateFactura('embarque.modalidadVenta', e.target.value)}
            className={`w-full px-3 py-2 rounded border ${
              theme === 'dark'
                ? 'bg-gray-800 border-gray-700 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
            placeholder="BAJO CONDICION"
          />
        </div>
        <div>
          <label className={`block text-xs mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            País Origen
          </label>
          <input
            type="text"
            value={factura.embarque.paisOrigen}
            onChange={e => updateFactura('embarque.paisOrigen', e.target.value)}
            className={`w-full px-3 py-2 rounded border ${
              theme === 'dark'
                ? 'bg-gray-800 border-gray-700 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
            placeholder="CHILE"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={`block text-xs mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Puerto Embarque
            </label>
            <input
              type="text"
              value={factura.embarque.puertoEmbarque}
              onChange={e => updateFactura('embarque.puertoEmbarque', e.target.value)}
              className={`w-full px-3 py-2 rounded border ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              placeholder="Puerto Embarque"
            />
          </div>
          <div>
            <label className={`block text-xs mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Puerto Destino
            </label>
            <input
              type="text"
              value={factura.embarque.puertoDestino}
              onChange={e => updateFactura('embarque.puertoDestino', e.target.value)}
              className={`w-full px-3 py-2 rounded border ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              placeholder="Puerto Destino"
            />
          </div>
        </div>
        <div>
          <label className={`block text-xs mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            País Destino Final
          </label>
          <input
            type="text"
            value={factura.embarque.paisDestinoFinal}
            onChange={e => updateFactura('embarque.paisDestinoFinal', e.target.value)}
            className={`w-full px-3 py-2 rounded border ${
              theme === 'dark'
                ? 'bg-gray-800 border-gray-700 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
            placeholder="País Destino Final"
          />
        </div>
        <div>
          <label className={`block text-xs mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Forma de Pago
          </label>
          <input
            type="text"
            value={factura.embarque.formaPago}
            onChange={e => updateFactura('embarque.formaPago', e.target.value)}
            className={`w-full px-3 py-2 rounded border ${
              theme === 'dark'
                ? 'bg-gray-800 border-gray-700 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
            placeholder="Forma de Pago"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={`block text-xs mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Peso Neto Total (Kgs)
            </label>
            <input
              type="number"
              step="any"
              value={factura.embarque.pesoNetoTotal || ''}
              onChange={e => updateFactura('embarque.pesoNetoTotal', e.target.value ? parseFloat(e.target.value) : undefined)}
              className={`w-full px-3 py-2 rounded border ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              placeholder="Peso Neto Total"
            />
          </div>
          <div>
            <label className={`block text-xs mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Peso Bruto Total (Kgs)
            </label>
            <input
              type="number"
              step="any"
              value={factura.embarque.pesoBrutoTotal || ''}
              onChange={e => updateFactura('embarque.pesoBrutoTotal', e.target.value ? parseFloat(e.target.value) : undefined)}
              className={`w-full px-3 py-2 rounded border ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              placeholder="Peso Bruto Total"
            />
          </div>
        </div>
        <div>
          <label className={`block text-xs mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Contenedor / AWB
          </label>
          <input
            type="text"
            value={factura.embarque.contenedor || ''}
            onChange={e => updateFactura('embarque.contenedor', e.target.value)}
            className={`w-full px-3 py-2 rounded border ${
              theme === 'dark'
                ? 'bg-gray-800 border-gray-700 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
            placeholder="Contenedor / AWB"
          />
        </div>
      </section>

      {/* Productos */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            Productos
          </h4>
          <button
            onClick={addProducto}
            className={`px-3 py-1 text-sm rounded ${
              theme === 'dark'
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            + Agregar
          </button>
        </div>
        {factura.productos.map((producto, index) => (
          <div
            key={index}
            className={`p-3 rounded border ${
              theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Producto {index + 1}
              </span>
              <button
                onClick={() => removeProducto(index)}
                className={`text-red-500 hover:text-red-700 text-sm ${
                  theme === 'dark' ? 'hover:text-red-400' : ''
                }`}
              >
                Eliminar
              </button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  value={producto.cantidad}
                  onChange={e => updateProducto(index, 'cantidad', parseInt(e.target.value) || 0)}
                  placeholder="Cantidad"
                  className={`px-2 py-1 rounded border ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-gray-50 border-gray-300 text-gray-900'
                  }`}
                />
                <select
                  value={producto.tipoEnvase}
                  onChange={e => updateProducto(index, 'tipoEnvase', e.target.value)}
                  className={`px-2 py-1 rounded border ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-gray-50 border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="CASES">CASES</option>
                  <option value="5KG">5KG</option>
                  <option value="2.5KG">2.5KG</option>
                </select>
              </div>
              <input
                type="text"
                value={producto.especie || ''}
                onChange={e => updateProducto(index, 'especie', e.target.value)}
                placeholder="Especie"
                className={`w-full px-2 py-1 rounded border ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-gray-50 border-gray-300 text-gray-900'
                }`}
              />
              <input
                type="text"
                value={producto.variedad}
                onChange={e => updateProducto(index, 'variedad', e.target.value)}
                placeholder="Variedad"
                className={`w-full px-2 py-1 rounded border ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-gray-50 border-gray-300 text-gray-900'
                }`}
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={producto.categoria}
                  onChange={e => updateProducto(index, 'categoria', e.target.value)}
                  placeholder="Categoría"
                  className={`px-2 py-1 rounded border ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-gray-50 border-gray-300 text-gray-900'
                  }`}
                />
                <input
                  type="text"
                  value={producto.calibre}
                  onChange={e => updateProducto(index, 'calibre', e.target.value)}
                  placeholder="Calibre"
                  className={`px-2 py-1 rounded border ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-gray-50 border-gray-300 text-gray-900'
                  }`}
                />
              </div>
              <input
                type="text"
                value={producto.etiqueta}
                onChange={e => updateProducto(index, 'etiqueta', e.target.value)}
                placeholder="Etiqueta"
                className={`w-full px-2 py-1 rounded border ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-gray-50 border-gray-300 text-gray-900'
                }`}
              />
              <div>
                <label className={`block text-xs mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  KG Neto/Unidad
                </label>
                <input
                  type="number"
                  step="any"
                  value={producto.kgNetoUnidad || ''}
                  onChange={e => updateProducto(index, 'kgNetoUnidad', parseFloat(e.target.value) || 0)}
                  placeholder="KG Neto"
                  className={`w-full px-2 py-1 rounded border ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-gray-50 border-gray-300 text-gray-900'
                  }`}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className={`block text-xs mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Precio/Kilo
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={producto.precioPorKilo || ''}
                    onChange={e => updateProducto(index, 'precioPorKilo', parseFloat(e.target.value) || 0)}
                    placeholder="US$/KG"
                    className={`w-full px-2 py-1 rounded border ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-gray-50 border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-xs mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Precio/Caja
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={producto.precioPorCaja || ''}
                    onChange={e => updateProducto(index, 'precioPorCaja', parseFloat(e.target.value) || 0)}
                    placeholder="US$/Caja"
                    className={`w-full px-2 py-1 rounded border ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-gray-50 border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-xs mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Total
                  </label>
                  <div className={`w-full px-2 py-1 rounded border flex items-center ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-gray-300'
                      : 'bg-gray-50 border-gray-300 text-gray-900'
                  }`}>
                    US${producto.total.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

// Función para extraer nombre de nave y viaje del formato "NAVE [VIAJE]"
function extraerNaveYViaje(naveInicial: string | undefined | null, viaje?: string | null): { nave: string; viaje: string } {
  // Validar que naveInicial exista
  if (!naveInicial) {
    return { nave: '', viaje: viaje || '' };
  }
  
  let nave = naveInicial;
  let viajeExtraido = viaje || '';
  
  // Si naveInicial contiene [VIAJE], extraerlo
  const matchNave = naveInicial.match(/^(.+?)\s*\[(.+?)\]$/);
  if (matchNave && matchNave.length >= 3) {
    nave = matchNave[1].trim();
    viajeExtraido = matchNave[2].trim();
  }
  
  // Si hay viaje separado pero no se extrajo de naveInicial, usarlo
  if (!viajeExtraido && viaje) {
    viajeExtraido = viaje;
  }
  
  const resultado = { nave: nave.trim(), viaje: viajeExtraido.trim() };
  return resultado;
}

// Función para inicializar factura desde registro
function initializeFacturaFromRegistro(registro: Registro): Factura {
  // Extraer nave y viaje del registro
  const { nave, viaje } = extraerNaveYViaje(registro.naveInicial, registro.viaje);
  
  return {
    registroId: registro.id || '',
    refAsli: registro.refAsli,
    exportador: {
      nombre: registro.shipper, // Por defecto usa el shipper
      rut: '',
      giro: '',
      direccion: '',
    },
    consignatario: {
      nombre: (registro as any).consignatario || '',
      direccion: '',
      email: '',
      telefono: '',
      contacto: '',
      telefonoContacto: '',
      codigoPostal: '',
      usci: '',
      pais: registro.pod || '', // Por ahora usa POD, pero el usuario puede cambiarlo
    },
    embarque: {
      fechaFactura: registro.etd ? new Date(registro.etd).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      numeroInvoice: '', // Número de invoice independiente
      numeroEmbarque: registro.booking || '',
      csp: '',
      csg: '',
      fechaEmbarque: registro.etd ? new Date(registro.etd).toISOString().split('T')[0] : '',
      motonave: nave, // Nave extraída sin el viaje
      numeroViaje: viaje, // Viaje extraído
      modalidadVenta: 'BAJO CONDICION',
      clausulaVenta: 'FOB',
      paisOrigen: 'CHILE',
      puertoEmbarque: registro.pol || '',
      puertoDestino: registro.pod || '',
      paisDestinoFinal: registro.pod || '', // Se sincronizará automáticamente con consignatario.pais
      formaPago: '',
      pesoNetoTotal: undefined,
      pesoBrutoTotal: undefined,
      contenedor: Array.isArray(registro.contenedor) ? registro.contenedor.join(' ') : registro.contenedor || '',
    },
    productos: [
      {
        cantidad: 0,
        tipoEnvase: 'CASES',
        especie: (registro as any).mercancia || registro.especie || '',
        variedad: '',
        categoria: 'CAT 1',
        etiqueta: registro.shipper,
        calibre: '',
        kgNetoUnidad: 0,
        kgBrutoUnidad: 0,
        precioPorKilo: 0,
        precioPorCaja: 0,
        total: 0,
      },
    ],
    totales: {
      cantidadTotal: 0,
      valorTotal: 0,
      valorTotalTexto: '',
    },
    clientePlantilla: 'ALMAFRUIT', // Siempre usar plantilla ALMA
  };
}

// Función para convertir número a palabras (en inglés, como en la factura)
function numberToWords(num: number): string {
  // Implementación simplificada - se puede mejorar
  const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];
  const teens = ['TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
  const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
  const scales = ['', 'THOUSAND', 'MILLION'];

  if (num === 0) return 'ZERO';

  // Asegurar que num es un número válido
  if (isNaN(num) || !isFinite(num)) {
    return 'ZERO US Dollar';
  }
  
  // Separar parte entera y decimal - usar Math.abs para evitar problemas de precisión
  const integerPart = Math.floor(Math.abs(num));
  const rawDecimal = Math.abs(num) - integerPart;
  // Redondear a 2 decimales y luego multiplicar por 100 para evitar problemas de precisión
  const decimalPart = Math.round(Math.round(rawDecimal * 10000) / 100);

  const parts = [];
  let workingNum = integerPart;

  // Simple implementation for up to millions
  if (workingNum >= 1000000) {
    const millions = Math.floor(workingNum / 1000000);
    parts.push(convertHundreds(millions) + ' MILLION');
    workingNum %= 1000000;
  }

  if (workingNum >= 1000) {
    const thousands = Math.floor(workingNum / 1000);
    parts.push(convertHundreds(thousands) + ' THOUSAND');
    workingNum %= 1000;
  }

  if (workingNum > 0) {
    parts.push(convertHundreds(workingNum));
  }

  // Filtrar partes vacías antes de unir
  const validParts = parts.filter(p => p && p.trim() !== '');
  let result = validParts.length > 0 ? validParts.join(' ') + ' US Dollar' : 'ZERO US Dollar';
  
  // Agregar centavos si hay decimales
  if (decimalPart > 0) {
    const cents = convertHundreds(decimalPart);
    if (cents && cents.trim() !== '') {
      result += ' AND ' + cents + ' Cent';
      if (decimalPart > 1) {
        result += 's';
      }
    }
  }

  return result;

  function convertHundreds(num: number): string {
    if (!num || num === 0 || isNaN(num)) return '';
    
    if (num < 10) {
      const result = ones[num];
      return (result && result.trim() !== '') ? result : '';
    }
    if (num < 20) {
      const index = num - 10;
      const result = teens[index];
      return (result && result.trim() !== '') ? result : '';
    }
    if (num < 100) {
      const tensDigit = Math.floor(num / 10);
      const onesDigit = num % 10;
      const tensStr = (tens[tensDigit] && tens[tensDigit].trim() !== '') ? tens[tensDigit] : '';
      const onesStr = (onesDigit > 0 && ones[onesDigit] && ones[onesDigit].trim() !== '') ? ones[onesDigit] : '';
      if (!tensStr && !onesStr) return '';
      return tensStr + (onesStr ? ' ' + onesStr : '').trim();
    }
    
    const hundreds = Math.floor(num / 100);
    const remainder = num % 100;
    const hundredsStr = (ones[hundreds] && ones[hundreds].trim() !== '') ? ones[hundreds] : '';
    if (!hundredsStr) return '';
    
    const remainderStr = remainder > 0 ? convertHundreds(remainder) : '';
    return hundredsStr + ' HUNDRED' + (remainderStr && remainderStr.trim() !== '' ? ' ' + remainderStr : '');
  }
}

