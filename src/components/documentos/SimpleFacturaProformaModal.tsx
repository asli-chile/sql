'use client';

import { useState, useEffect } from 'react';
import { Registro } from '@/types/registros';
import { useTheme } from '@/contexts/ThemeContext';
import { createClient } from '@/lib/supabase-browser';
import { useToast } from '@/hooks/useToast';
import { normalizeBooking } from '@/utils/documentUtils';
import { X, AlertCircle, FileText, CheckCircle2, Sparkles } from 'lucide-react';
import { PlantillaExcelProcessor, facturaADatosPlantilla } from '@/lib/plantilla-excel-processor';
import { generarFacturaPDF } from '@/lib/factura-pdf';
import { generarFacturaExcel } from '@/lib/factura-excel';
import { Factura } from '@/types/factura';
import { PlantillaProforma } from '@/types/plantillas-proforma';

interface SimpleFacturaProformaModalProps {
  isOpen: boolean;
  onClose: () => void;
  registro: Registro;
}

export function SimpleFacturaProformaModal({
  isOpen,
  onClose,
  registro,
}: SimpleFacturaProformaModalProps) {
  const { theme } = useTheme();
  const { success, error: showError } = useToast();
  const supabase = createClient();
  
  const [generando, setGenerando] = useState(false);
  const [verificandoDocumentos, setVerificandoDocumentos] = useState(false);
  const [documentosRequeridos, setDocumentosRequeridos] = useState<{
    guiaDespacho: boolean;
    packingList: boolean;
  }>({ guiaDespacho: false, packingList: false });
  const [yaExisteProforma, setYaExisteProforma] = useState(false);
  
  // Plantillas disponibles
  const [plantillasDisponibles, setPlantillasDisponibles] = useState<PlantillaProforma[]>([]);
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState<string>('tradicional');
  const [cargandoPlantillas, setCargandoPlantillas] = useState(false);

  // Cargar plantillas disponibles
  useEffect(() => {
    const cargarPlantillas = async () => {
      if (!isOpen) return;
      
      setCargandoPlantillas(true);
      try {
        const clienteNombre = registro.shipper;
        
        // Obtener plantillas del cliente y plantillas genéricas
        const { data, error } = await supabase
          .from('plantillas_proforma')
          .select('*')
          .eq('tipo_factura', 'proforma')
          .eq('activa', true)
          .or(`cliente.eq.${clienteNombre},cliente.is.null`)
          .order('es_default', { ascending: false })
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error cargando plantillas:', error);
          setPlantillasDisponibles([]);
        } else {
          setPlantillasDisponibles(data || []);
          
          // Auto-seleccionar la plantilla default del cliente
          const plantillaDefault = (data || []).find(p => 
            p.cliente === clienteNombre && p.es_default
          );
          if (plantillaDefault) {
            setPlantillaSeleccionada(plantillaDefault.id);
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
  }, [isOpen, registro.shipper, supabase]);


  // Verificar documentos requeridos
  useEffect(() => {
    const verificarDocumentos = async () => {
      if (!isOpen || !registro.booking) return;

      setVerificandoDocumentos(true);
      try {
        const booking = normalizeBooking(registro.booking);
        const bookingKey = booking.replace(/\s+/g, '');
        const bookingSegment = encodeURIComponent(booking);

        // Verificar Guía de Despacho
        const { data: guiaFiles } = await supabase.storage
          .from('documentos')
          .list('guia-despacho', { limit: 100, search: bookingSegment });

        const tieneGuia = (guiaFiles || []).some(file => {
          const separatorIndex = file.name.indexOf('__');
          if (separatorIndex === -1) return false;
          const fileBooking = normalizeBooking(decodeURIComponent(file.name.slice(0, separatorIndex))).replace(/\s+/g, '');
          return fileBooking === bookingKey;
        });

        // Verificar Packing List
        const { data: packingFiles } = await supabase.storage
          .from('documentos')
          .list('packing-list', { limit: 100, search: bookingSegment });

        const tienePacking = (packingFiles || []).some(file => {
          const separatorIndex = file.name.indexOf('__');
          if (separatorIndex === -1) return false;
          const fileBooking = normalizeBooking(decodeURIComponent(file.name.slice(0, separatorIndex))).replace(/\s+/g, '');
          return fileBooking === bookingKey;
        });

        // Verificar si ya existe proforma
        const { data: proformaFiles } = await supabase.storage
          .from('documentos')
          .list('factura-proforma', { limit: 100, search: bookingSegment });

        const existeProforma = (proformaFiles || []).some(file => {
          const separatorIndex = file.name.indexOf('__');
          if (separatorIndex === -1) return false;
          const fileBooking = normalizeBooking(decodeURIComponent(file.name.slice(0, separatorIndex))).replace(/\s+/g, '');
          return fileBooking === bookingKey;
        });

        setDocumentosRequeridos({
          guiaDespacho: tieneGuia,
          packingList: tienePacking,
        });
        setYaExisteProforma(existeProforma);
      } catch (err) {
        console.error('Error verificando documentos:', err);
      } finally {
        setVerificandoDocumentos(false);
      }
    };

    verificarDocumentos();
  }, [isOpen, registro.booking, supabase]);

  const convertirRegistroAFactura = (reg: Registro): Factura => {
    const now = new Date();
    
    return {
      registroId: reg.id || '',
      refAsli: reg.refAsli || '',
      clientePlantilla: reg.shipper || '',
      exportador: {
        nombre: reg.shipper || '',
        rut: '',
        giro: 'Exportación de Productos Agrícolas',
        direccion: '',
        email: '',
      },
      consignatario: {
        nombre: '', // Se llenará desde el selector de consignatarios
        direccion: '',
        pais: reg.pod || '', // puerto destino
      },
      notifyParty: {
        nombre: '',
        direccion: '',
      },
      embarque: {
        numeroInvoice: reg.refAsli || '',
        numeroEmbarque: reg.booking || '',
        fechaEmbarque: reg.etd ? reg.etd.toISOString().split('T')[0] : now.toISOString().split('T')[0],
        fechaFactura: now.toISOString().split('T')[0],
        motonave: reg.naveInicial || '',
        numeroViaje: reg.viaje || '',
        clausulaVenta: 'FOB',
        paisOrigen: 'CHILE',
        puertoEmbarque: reg.pol || 'VALPARAISO',
        puertoDestino: reg.pod || '',
        paisDestinoFinal: reg.pod || '',
        formaPago: 'T/T',
        contenedor: Array.isArray(reg.contenedor) ? reg.contenedor.join(', ') : reg.contenedor || '',
        pesoNetoTotal: 0,
        pesoBrutoTotal: 0,
      },
      productos: [
        {
          cantidad: 1,
          tipoEnvase: 'CASES',
          variedad: '', // No está en Registro
          categoria: '', // No está en Registro
          etiqueta: '', // No está en Registro
          calibre: '', // No está en Registro
          kgNetoUnidad: 0,
          kgBrutoUnidad: 0,
          precioPorCaja: 0,
          total: 0,
        },
      ],
      totales: {
        cantidadTotal: 0,
        valorTotal: 0,
        valorTotalTexto: 'ZERO',
      },
    };
  };

  const handleGenerar = async () => {
    if (!documentosRequeridos.guiaDespacho || !documentosRequeridos.packingList) {
      const faltantes = [];
      if (!documentosRequeridos.guiaDespacho) faltantes.push('Guía de Despacho');
      if (!documentosRequeridos.packingList) faltantes.push('Packing List');
      showError(`Faltan documentos: ${faltantes.join(', ')}`);
      return;
    }

    if (yaExisteProforma) {
      showError('Ya existe una proforma para este booking');
      return;
    }

    setGenerando(true);
    try {
      const factura = convertirRegistroAFactura(registro);
      const refExterna = registro.refCliente?.trim() || registro.refAsli?.trim();
      const booking = registro.booking?.trim().toUpperCase().replace(/\s+/g, '');
      const contenedor = registro.contenedor || '';

      if (!refExterna || !booking) {
        throw new Error('Faltan datos requeridos (ref/booking)');
      }

      const safeBaseName = refExterna.replace(/[\\/]/g, '-').trim();
      const fileBaseName = `${safeBaseName} PROFORMA ${contenedor}`;
      const bookingSegment = encodeURIComponent(booking);

      // Usar plantilla seleccionada
      let plantillaUsada: PlantillaProforma | null = null;
      let excelBlob = null;
      let excelFileName = '';

      if (plantillaSeleccionada && plantillaSeleccionada !== 'tradicional') {
        const plantilla = plantillasDisponibles.find(p => p.id === plantillaSeleccionada);
        
        if (plantilla) {
          try {
            console.log(`✅ Usando plantilla: ${plantilla.nombre}`);
            
            // Obtener URL firmada
            const { data: urlData } = await supabase.storage
              .from('documentos')
              .createSignedUrl(plantilla.archivo_url, 60);
            
            if (urlData?.signedUrl) {
              const datos = facturaADatosPlantilla(factura);
              const processor = new PlantillaExcelProcessor(datos);
              await processor.cargarPlantilla(urlData.signedUrl);
              await processor.procesar();
              
              excelBlob = await processor.generarBlob();
              excelFileName = `${fileBaseName}.xlsx`;
              plantillaUsada = plantilla;
            }
          } catch (err) {
            console.error('Error con plantilla:', err);
            showError(`Error procesando plantilla: ${err}`);
            setGenerando(false);
            return;
          }
        }
      }

      // Fallback a método tradicional si es "tradicional" o no hay plantilla
      if (!excelBlob) {
        console.log('📄 Usando generador tradicional de Excel');
        const excelResult = await generarFacturaExcel(factura, {
          returnBlob: true,
          fileNameBase: fileBaseName,
        });
        
        if (!excelResult || !('blob' in excelResult)) {
          throw new Error('Error generando Excel');
        }
        
        excelBlob = excelResult.blob;
        excelFileName = excelResult.fileName;
      }

      // Generar PDF
      const pdfResult = await generarFacturaPDF(factura, {
        returnBlob: true,
        fileNameBase: fileBaseName,
      });
      
      if (!pdfResult || !('blob' in pdfResult)) {
        throw new Error('Error generando PDF');
      }

      // Subir archivos
      const pdfPath = `factura-proforma/${bookingSegment}__${contenedor}__${pdfResult.fileName}`;
      const excelPath = `factura-proforma/${bookingSegment}__${contenedor}__${excelFileName}`;

      const { error: pdfError } = await supabase.storage
        .from('documentos')
        .upload(pdfPath, pdfResult.blob, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (pdfError) throw new Error(`Error subiendo PDF: ${pdfError.message}`);

      const { error: excelError } = await supabase.storage
        .from('documentos')
        .upload(excelPath, excelBlob, {
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          upsert: true,
        });

      if (excelError) throw new Error(`Error subiendo Excel: ${excelError.message}`);

      const mensaje = plantillaUsada 
        ? `✨ Proforma generada con plantilla "${plantillaUsada.nombre}"`
        : '📄 Proforma generada con formato tradicional';
      
      success(mensaje);
      onClose();
    } catch (error: any) {
      console.error('Error:', error);
      showError(error.message || 'Error al generar proforma');
    } finally {
      setGenerando(false);
    }
  };

  if (!isOpen) return null;

  const puedeGenerar = documentosRequeridos.guiaDespacho && documentosRequeridos.packingList && !yaExisteProforma;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className={`relative w-full max-w-2xl rounded-lg shadow-xl ${
        theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${
          theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <h2 className="text-2xl font-bold">Generar Factura Proforma</h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              theme === 'dark'
                ? 'hover:bg-gray-700 text-gray-400 hover:text-white'
                : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'
            }`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Información del registro */}
          <div className={`p-4 rounded-lg ${
            theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'
          }`}>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="font-semibold">Ref ASLI:</span> {registro.refAsli}
              </div>
              <div>
                <span className="font-semibold">Booking:</span> {registro.booking}
              </div>
              <div>
                <span className="font-semibold">Contenedor:</span> {registro.contenedor || 'N/A'}
              </div>
              <div>
                <span className="font-semibold">Cliente:</span> {registro.shipper}
              </div>
            </div>
          </div>

          {/* Selector de Plantilla */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              <Sparkles className="inline h-4 w-4 mr-1" />
              Plantilla a usar:
            </label>
            
            {cargandoPlantillas ? (
              <div className="flex items-center gap-2 text-sm">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
                <span>Cargando plantillas...</span>
              </div>
            ) : (
              <select
                value={plantillaSeleccionada}
                onChange={(e) => setPlantillaSeleccionada(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border text-sm ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="tradicional">📄 Formato Tradicional (sin plantilla)</option>
                
                {plantillasDisponibles.length > 0 && (
                  <>
                    {plantillasDisponibles
                      .filter(p => p.cliente === registro.shipper)
                      .map(plantilla => (
                        <option key={plantilla.id} value={plantilla.id}>
                          ✨ {plantilla.nombre}
                          {plantilla.es_default ? ' (Default)' : ''}
                          {' - ' + plantilla.cliente}
                        </option>
                      ))
                    }
                    
                    {plantillasDisponibles
                      .filter(p => !p.cliente)
                      .map(plantilla => (
                        <option key={plantilla.id} value={plantilla.id}>
                          🌐 {plantilla.nombre} (Genérica)
                        </option>
                      ))
                    }
                  </>
                )}
              </select>
            )}
            
            {plantillasDisponibles.length === 0 && !cargandoPlantillas && (
              <p className="text-xs text-gray-500 mt-1">
                No hay plantillas disponibles. Se usará el formato tradicional.
              </p>
            )}
          </div>

          {/* Estado de documentos */}
          {verificandoDocumentos ? (
            <div className="flex items-center gap-2 text-sm">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
              <span>Verificando documentos...</span>
            </div>
          ) : (
            <div className="space-y-2">
              <div className={`flex items-center gap-2 text-sm ${
                documentosRequeridos.guiaDespacho ? 'text-green-600' : 'text-red-600'
              }`}>
                {documentosRequeridos.guiaDespacho ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <span>Guía de Despacho</span>
              </div>
              <div className={`flex items-center gap-2 text-sm ${
                documentosRequeridos.packingList ? 'text-green-600' : 'text-red-600'
              }`}>
                {documentosRequeridos.packingList ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <span>Packing List</span>
              </div>
              {yaExisteProforma && (
                <div className="flex items-center gap-2 text-sm text-yellow-600">
                  <AlertCircle className="h-4 w-4" />
                  <span>Ya existe una proforma para este booking</span>
                </div>
              )}
            </div>
          )}

          {/* Mensaje de advertencia */}
          {!puedeGenerar && !verificandoDocumentos && (
            <div className={`flex items-start gap-2 p-4 rounded-lg ${
              theme === 'dark' ? 'bg-yellow-900/20 text-yellow-400' : 'bg-yellow-50 text-yellow-800'
            }`}>
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                {yaExisteProforma 
                  ? 'Ya existe una proforma para este booking.'
                  : 'Para generar la proforma, primero debes subir la Guía de Despacho y el Packing List en la sección de Documentos.'}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-end gap-3 p-6 border-t ${
          theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg transition-colors ${
              theme === 'dark'
                ? 'bg-gray-700 hover:bg-gray-600 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
            }`}
          >
            Cancelar
          </button>
          <button
            onClick={handleGenerar}
            disabled={!puedeGenerar || generando}
            className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              puedeGenerar && !generando
                ? theme === 'dark'
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
                : 'bg-gray-400 text-gray-200 cursor-not-allowed'
            }`}
          >
            {generando ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                <span>Generando...</span>
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" />
                <span>Generar Proforma</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
