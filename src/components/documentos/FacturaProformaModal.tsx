'use client';

import { useState, useEffect } from 'react';
import { Registro } from '@/types/registros';
import { useTheme } from '@/contexts/ThemeContext';
import { FacturaCreator } from '@/components/facturas/FacturaCreator';
import { Factura } from '@/types/factura';
import { createClient } from '@/lib/supabase-browser';
import { generarFacturaPDF } from '@/lib/factura-pdf';
import { generarFacturaExcel } from '@/lib/factura-excel';
import { useToast } from '@/hooks/useToast';
import { normalizeBooking } from '@/utils/documentUtils';

interface FacturaProformaModalProps {
  isOpen: boolean;
  onClose: () => void;
  contenedor: string;
  registro: Registro;
}

export function FacturaProformaModal({
  isOpen,
  onClose,
  contenedor,
  registro,
}: FacturaProformaModalProps) {
  const { theme } = useTheme();
  const { success, error: showError, warning } = useToast();
  const supabase = createClient();
  const [bookingsConProforma, setBookingsConProforma] = useState<Map<string, { nombre: string; fecha: string }>>(new Map());
  const [documentosRequeridos, setDocumentosRequeridos] = useState<{
    guiaDespacho: boolean;
    packingList: boolean;
  }>({ guiaDespacho: false, packingList: false });
  const [verificandoDocumentos, setVerificandoDocumentos] = useState(false);

  // Verificar documentos requeridos (Guía de Despacho y Packing List)
  useEffect(() => {
    const verificarDocumentosRequeridos = async () => {
      if (!isOpen || !registro.booking) return;

      setVerificandoDocumentos(true);
      try {
        const booking = normalizeBooking(registro.booking);
        const bookingKey = booking.replace(/\s+/g, '');
        const bookingSegment = encodeURIComponent(booking);

        // Verificar Guía de Despacho
        const { data: guiaFiles } = await supabase.storage
          .from('documentos')
          .list('guia-despacho', {
            limit: 100,
            search: bookingSegment,
          });

        const tieneGuiaDespacho = (guiaFiles || []).some(file => {
          const separatorIndex = file.name.indexOf('__');
          if (separatorIndex === -1) return false;
          const fileBooking = normalizeBooking(decodeURIComponent(file.name.slice(0, separatorIndex))).replace(/\s+/g, '');
          return fileBooking === bookingKey;
        });

        // Verificar Packing List
        const { data: packingFiles } = await supabase.storage
          .from('documentos')
          .list('packing-list', {
            limit: 100,
            search: bookingSegment,
          });

        const tienePackingList = (packingFiles || []).some(file => {
          const separatorIndex = file.name.indexOf('__');
          if (separatorIndex === -1) return false;
          const fileBooking = normalizeBooking(decodeURIComponent(file.name.slice(0, separatorIndex))).replace(/\s+/g, '');
          return fileBooking === bookingKey;
        });

        setDocumentosRequeridos({
          guiaDespacho: tieneGuiaDespacho,
          packingList: tienePackingList,
        });
      } catch (err) {
        console.error('Error verificando documentos requeridos:', err);
      } finally {
        setVerificandoDocumentos(false);
      }
    };

    verificarDocumentosRequeridos();
  }, [isOpen, registro.booking, supabase]);

  // Cargar documentos proforma existentes
  useEffect(() => {
    const loadProformaDocuments = async () => {
      try {
        const { data: files, error } = await supabase.storage
          .from('documentos')
          .list('factura-proforma', {
            limit: 1000,
            sortBy: { column: 'created_at', order: 'desc' },
          });

        if (error) {
          console.warn('No se pudieron cargar documentos proforma:', error.message);
          return;
        }

        const bookingsMap = new Map<string, { nombre: string; fecha: string }>();
        (files || []).forEach((file) => {
          const match = file.name.match(/^([^_]+)__/);
          if (match) {
            const booking = decodeURIComponent(match[1]);
            if (!bookingsMap.has(booking)) {
              bookingsMap.set(booking, {
                nombre: file.name,
                fecha: file.created_at || '',
              });
            }
          }
        });

        setBookingsConProforma(bookingsMap);
      } catch (err) {
        console.error('Error cargando documentos proforma:', err);
      }
    };

    if (isOpen) {
      loadProformaDocuments();
    }
  }, [isOpen, supabase]);

  const handleGenerateProforma = async (factura: Factura) => {
    try {
      // Verificar que existan los documentos requeridos
      if (!documentosRequeridos.guiaDespacho || !documentosRequeridos.packingList) {
        const documentosFaltantes = [];
        if (!documentosRequeridos.guiaDespacho) documentosFaltantes.push('Guía de Despacho');
        if (!documentosRequeridos.packingList) documentosFaltantes.push('Packing List');
        throw new Error(`Para generar la Factura Proforma, primero debes subir los siguientes documentos: ${documentosFaltantes.join(' y ')}. Por favor, súbelos en la sección de Documentos.`);
      }

      const refExterna = registro.refCliente?.trim() || registro.refAsli?.trim();
      if (!refExterna) {
        throw new Error('La referencia externa es obligatoria para generar la proforma.');
      }

      const booking = registro.booking?.trim().toUpperCase().replace(/\s+/g, '');
      if (!booking) {
        throw new Error('El booking es obligatorio para generar la proforma.');
      }

      if (bookingsConProforma.has(booking)) {
        throw new Error('Ya existe una proforma para este booking.');
      }

      const safeBaseName = refExterna.replace(/[\\/]/g, '-').trim();
      const fileBaseName = `${safeBaseName} PROFORMA ${contenedor}`;
      const bookingSegment = encodeURIComponent(booking);

      // Generar PDF
      const pdfResult = await generarFacturaPDF(factura, {
        returnBlob: true,
        fileNameBase: fileBaseName,
      });
      if (!pdfResult || !('blob' in pdfResult)) {
        throw new Error('No se pudo generar el PDF de la proforma.');
      }

      // Generar Excel
      const excelResult = await generarFacturaExcel(factura, {
        returnBlob: true,
        fileNameBase: fileBaseName,
      });
      if (!excelResult || !('blob' in excelResult)) {
        throw new Error('No se pudo generar el Excel de la proforma.');
      }

      // Subir PDF a storage
      const pdfPath = `factura-proforma/${bookingSegment}__${contenedor}__${pdfResult.fileName}`;
      const { error: pdfError } = await supabase.storage
        .from('documentos')
        .upload(pdfPath, pdfResult.blob, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (pdfError) {
        throw new Error(`Error subiendo PDF: ${pdfError.message}`);
      }

      // Subir Excel a storage
      const excelPath = `factura-proforma/${bookingSegment}__${contenedor}__${excelResult.fileName}`;
      const { error: excelError } = await supabase.storage
        .from('documentos')
        .upload(excelPath, excelResult.blob, {
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          upsert: true,
        });

      if (excelError) {
        throw new Error(`Error subiendo Excel: ${excelError.message}`);
      }

      success('Proforma generada y subida correctamente (PDF + Excel).');
      onClose();
    } catch (error: any) {
      console.error('Error generando proforma:', error);
      showError(error.message || 'Error al generar la proforma. Por favor, intenta de nuevo.');
    }
  };

  if (!isOpen) return null;

  // Determinar si se pueden generar documentos
  const puedeGenerar = documentosRequeridos.guiaDespacho && documentosRequeridos.packingList;

  return (
    <FacturaCreator
      registro={registro}
      isOpen={isOpen}
      onClose={onClose}
      onSave={onClose}
      mode="proforma"
      onGenerateProforma={handleGenerateProforma}
      documentosRequeridos={documentosRequeridos}
      verificandoDocumentos={verificandoDocumentos}
      puedeGenerar={puedeGenerar}
    />
  );
}
