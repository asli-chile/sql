'use client';

import { TransporteRecord } from '@/lib/transportes-service';
import { InlineEditCell } from './InlineEditCell';
import { Truck, Ship, Calendar, MapPin, User, Phone, Info, Clock, AlertTriangle, CheckCircle2, FileText, Send, Download, ExternalLink, RefreshCcw, Mail, ChevronDown, Package, Thermometer, Wind } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface TransporteCardProps {
  transporte: TransporteRecord;
  theme: 'dark' | 'light';
  canEdit: boolean;
  userEmail?: string | null;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updatedRecord: TransporteRecord) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  bookingDocuments: Map<string, { nombre: string; fecha: string; path: string }>;
  downloadingBooking: string | null;
  onDownloadBooking: (booking: string) => void;
}

const dateKeys = new Set<keyof TransporteRecord>([
  'stacking',
  'fin_stacking',
  'cut_off',
  'created_at',
  'updated_at',
]);

export function TransporteCard({
  transporte,
  theme,
  canEdit,
  userEmail,
  isSelected,
  onSelect,
  onUpdate,
  onContextMenu,
  bookingDocuments,
  downloadingBooking,
  onDownloadBooking,
}: TransporteCardProps) {
  const [plantas, setPlantas] = useState<string[]>([]);
  const [isLoadingPlantas, setIsLoadingPlantas] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const router = useRouter();

  // Cargar catálogo de plantas
  useEffect(() => {
    const loadPlantas = async () => {
      setIsLoadingPlantas(true);
      try {
        console.log('🔄 Cargando catálogo de plantas...');
        const response = await fetch('/api/catalogos/plantas');
        if (response.ok) {
          const data = await response.json();
          setPlantas(data.plantas || []);
        }
      } catch (error) {
        console.error('💥 Error cargando plantas:', error);
      } finally {
        setIsLoadingPlantas(false);
      }
    };
    loadPlantas();
  }, []);

  const formatValue = (value: any) => {
    if (value === null || value === undefined || value === '') {
      return '—';
    }

    if (dateKeys.has(value) && typeof value === 'string') {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleDateString('es-CL');
      }
    }

    if (typeof value === 'boolean') {
      return value ? 'Sí' : 'No';
    }

    return String(value);
  };

  const handleSendEmail = async () => {
    if (!transporte) {
      alert('No hay información del transporte disponible.');
      return;
    }

    if (!userEmail) {
      alert('No se pudo determinar el email del usuario actual. Cierra sesión e inicia nuevamente.');
      return;
    }

    setSendingEmail(true);

    try {
      const emailSubject = `${transporte.ref_cliente || 'N/A'} // SOLICITUD DE RETIRO Y PRESENTACION EN PLANTA // ${transporte.booking || 'N/A'} // ${transporte.naviera || 'N/A'} // ${transporte.nave || 'N/A'} // ${transporte.planta || 'N/A'} // ${transporte.pol || 'N/A'} - ${transporte.pod || 'N/A'} // ${transporte.shipper || 'N/A'}`;

      const emailBody = `
        <div style="font-family: Calibri, Arial, sans-serif; font-size: 12pt; line-height: 1.2; color: #333;">
          <p>Estimado Alex, gusto en saludarte, espero te encuentres bien</p>
          <p>Favor tu ayuda con la coordinación de retiro de unidad desde "${transporte.deposito || 'N/A'}" para presentar en "${transporte.planta || 'N/A'}" el dia "${transporte.dia_presentacion || 'N/A'}" a las "${transporte.hora_presentacion || 'N/A'}"</p>
          
          <p><strong>SOLICITUD RETIRO - PRESENTACIÓN</strong></p>
          <ul style="margin: 5px 0; padding-left: 20px;">
            <li><strong>Booking:</strong> ${transporte.booking || 'N/A'}</li>
            <li><strong>${transporte.shipper || 'N/A'}</strong></li>
            <li><strong>Ref Cliente:</strong> ${transporte.ref_cliente || 'N/A'}</li>
            <li><strong>Naviera:</strong> ${transporte.naviera || 'N/A'}</li>
            <li><strong>Nave:</strong> ${transporte.nave || 'N/A'}</li>
            <li><strong>Depósito:</strong> ${transporte.deposito || 'N/A'}</li>
            <li><strong>POL:</strong> ${transporte.pol || 'N/A'}</li>
            <li><strong>POD:</strong> ${transporte.pod || 'N/A'}</li>
            <li><strong>Fecha Hora Planta:</strong> ${transporte.dia_presentacion || 'N/A'} ${transporte.hora_presentacion || 'N/A'} - ${transporte.planta || 'N/A'}</li>
          </ul>
          
          <p><strong>DATOS DE TRANSPORTE</strong></p>
          <ul style="margin: 5px 0; padding-left: 20px;">
            <li><strong>Transporte:</strong> ${transporte.transporte || 'N/A'}</li>
            <li><strong>CONTENEDOR:</strong> ${transporte.contenedor || 'N/A'}</li>
            <li><strong>SELLO:</strong> ${transporte.sello || 'N/A'}</li>
            <li><strong>TARA:</strong> ${transporte.tara || 'N/A'}</li>
            <li><strong>CONDUCTOR:</strong> ${transporte.conductor || 'N/A'}</li>
            <li><strong>RUT:</strong> ${transporte.rut || 'N/A'}</li>
            <li><strong>TELEFONO:</strong> ${transporte.telefono || 'N/A'}</li>
            <li><strong>PATENTE:</strong> ${transporte.patente || 'N/A'}</li>
            <li><strong>PATENTE REM.:</strong> ${transporte.patente_remolque || 'N/A'}</li>
          </ul>
        </div>
      `;

      let attachmentData = null;
      const bookingValue = transporte.booking;
      const bookingKey = bookingValue ? bookingValue.trim().toUpperCase().replace(/\s+/g, '') : '';

      if (bookingKey && bookingDocuments.has(bookingKey)) {
        try {
          const document = bookingDocuments.get(bookingKey);
          if (document) {
            const response = await fetch('/api/bookings/signed-url', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ path: document.path }),
            });

            if (response.ok) {
              const { signedUrl } = await response.json();
              const pdfResponse = await fetch(signedUrl);
              if (pdfResponse.ok) {
                const pdfBlob = await pdfResponse.blob();
                const pdfBase64 = await new Promise((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = () => resolve((reader.result as string).split(',')[1]);
                  reader.onerror = reject;
                  reader.readAsDataURL(pdfBlob);
                });

                attachmentData = {
                  filename: `Booking_${bookingKey}.pdf`,
                  content: pdfBase64
                };
              }
            }
          }
        } catch (error) {
          console.warn('No se pudo obtener el PDF del booking:', error);
        }
      }

      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: 'alex.cardenas@asli.cl',
          subject: emailSubject,
          body: emailBody,
          action: 'draft',
          fromEmail: userEmail,
          transportData: transporte,
          attachmentData,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Error al enviar email');

      if (result.draftId) {
        window.open(`https://mail.google.com/mail/#drafts?message=${result.draftId}`, '_blank');
      } else {
        window.open('https://mail.google.com/mail/#drafts', '_blank');
      }
      alert('Borrador creado en Gmail');

    } catch (error) {
      alert(`Error al preparar correo: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setSendingEmail(false);
    }
  };

  const bookingValue = transporte.booking;
  const bookingKey = bookingValue ? bookingValue.trim().toUpperCase().replace(/\s+/g, '') : '';
  const hasPdf = bookingKey && bookingDocuments.has(bookingKey);

  return (
    <div className={`relative rounded-xl border-2 transition-all duration-200 hover:shadow-lg ${isSelected
      ? theme === 'dark' ? 'border-sky-500 bg-slate-800/50' : 'border-blue-500 bg-blue-50'
      : theme === 'dark' ? 'border-slate-700 bg-slate-900/50 hover:border-slate-600' : 'border-gray-200 bg-white hover:border-gray-300'
      }`} onContextMenu={onContextMenu}>

      {/* Header superior */}
      <div className={`p-4 border-b ${theme === 'dark' ? 'border-slate-700' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onSelect}
            disabled={!canEdit}
            className={`h-4 w-4 rounded focus:ring-2 ${canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'} ${theme === 'dark'
              ? 'border-slate-600 bg-slate-800 text-sky-500 focus:ring-sky-500/50'
              : 'border-gray-300 bg-white text-blue-600 focus:ring-blue-500/50'
              }`}
          />
          <div className="flex-1 text-center">
            <span className={`font-black text-2xl ${theme === 'dark' ? 'text-slate-100' : 'text-gray-900'}`}>
              {transporte.contenedor || 'Sin contenedor'}
            </span>
          </div>
          {transporte.atmosfera_controlada && (
            <span className={`px-3 py-1 text-xs rounded-full font-bold ${theme === 'dark' ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>
              AT CONTROLADA
            </span>
          )}
        </div>
      </div>

      {/* Contenido principal */}
      <div className="p-3 space-y-3">
        {/* Información de reserva */}
        <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-gray-50'}`}>
          <span className={`text-xs font-black uppercase tracking-wider block mb-2 text-center ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
            Información de Reserva
          </span>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1 text-center">
              <span className={`text-xs font-black uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                Ref Cliente
              </span>
              {canEdit ? (
                <InlineEditCell value={transporte.ref_cliente || ''} field="ref_cliente" record={transporte} onSave={onUpdate} type="text" />
              ) : (
                <span className={`text-sm font-black ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>{formatValue(transporte.ref_cliente)}</span>
              )}
            </div>
            <div className="space-y-1 text-center">
              <span className={`text-xs font-black uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                Ref ASLI
              </span>
              {canEdit ? (
                <InlineEditCell value={transporte.ref_asli || ''} field="ref_asli" record={transporte} onSave={onUpdate} type="text" />
              ) : (
                <span className={`text-sm font-black ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>{formatValue(transporte.ref_asli)}</span>
              )}
            </div>
          </div>
        </div>

        {/* Grupo Embarque */}
        <div className="grid grid-cols-2 gap-2">
          {/* Booking */}
          <div className="space-y-1 text-center">
            <span className={`text-xs font-black uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
              Booking
            </span>
            <div className="flex items-center justify-center gap-2">
              {canEdit ? (
                <InlineEditCell value={transporte.booking} field="booking" record={transporte} onSave={onUpdate} type="text" />
              ) : (
                <span className={`text-sm font-black ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>{formatValue(transporte.booking)}</span>
              )}
              {(transporte.registro_id || transporte.booking) && (
                <button onClick={() => router.push(transporte.registro_id ? `/registros?id=${transporte.registro_id}` : `/registros?booking=${transporte.booking}`)}
                  className={`p-1 rounded-md ${theme === 'dark' ? 'hover:bg-slate-700 text-sky-400' : 'hover:bg-gray-100 text-blue-600'}`}>
                  <ExternalLink className="h-3 w-3" />
                </button>
              )}
              {hasPdf && (
                <button onClick={() => onDownloadBooking(transporte.booking!)} disabled={downloadingBooking === transporte.booking}
                  className={`p-1 rounded-sm ${theme === 'dark' ? 'hover:bg-slate-700 text-sky-400' : 'hover:bg-gray-100 text-blue-600'}`}>
                  {downloadingBooking === transporte.booking ? <RefreshCcw className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                </button>
              )}
            </div>
          </div>
          {/* Nave */}
          <div className="space-y-1 text-center">
            <span className={`text-xs font-black uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
              Nave
            </span>
            {canEdit ? (
              <InlineEditCell value={transporte.nave} field="nave" record={transporte} onSave={onUpdate} type="text" />
            ) : (
              <span className={`text-sm font-black ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>{formatValue(transporte.nave)}</span>
            )}
          </div>
          {/* Naviera */}
          <div className="space-y-1 text-center">
            <span className={`text-xs font-black uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
              Naviera
            </span>
            {canEdit ? (
              <InlineEditCell value={transporte.naviera} field="naviera" record={transporte} onSave={onUpdate} type="text" />
            ) : (
              <span className={`text-sm font-black ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>{formatValue(transporte.naviera)}</span>
            )}
          </div>
          {/* Deposito */}
          <div className="space-y-1 text-center">
            <span className={`text-xs font-black uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
              Depósito
            </span>
            {canEdit ? (
              <InlineEditCell value={transporte.deposito} field="deposito" record={transporte} onSave={onUpdate} type="text" />
            ) : (
              <span className={`text-sm font-black ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>{formatValue(transporte.deposito)}</span>
            )}
          </div>
        </div>

        {/* POL y POD */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1 text-center">
            <span className={`text-xs font-black uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>POL</span>
            {canEdit ? (
              <InlineEditCell value={transporte.pol} field="pol" record={transporte} onSave={onUpdate} type="text" />
            ) : (
              <span className={`text-sm font-black ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>{formatValue(transporte.pol)}</span>
            )}
          </div>
          <div className="space-y-1 text-center">
            <span className={`text-xs font-black uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>POD</span>
            {canEdit ? (
              <InlineEditCell value={transporte.pod} field="pod" record={transporte} onSave={onUpdate} type="text" />
            ) : (
              <span className={`text-sm font-black ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>{formatValue(transporte.pod)}</span>
            )}
          </div>
        </div>

        {/* Stacking */}
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1 text-center">
              <span className={`text-xs font-black uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>Inicio Stacking</span>
              {canEdit ? (
                <InlineEditCell value={transporte.stacking} field="stacking" record={transporte} onSave={onUpdate} type="datetime" />
              ) : (
                <span className={`text-sm font-black ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>{formatValue(transporte.stacking)}</span>
              )}
            </div>
            <div className="space-y-1 text-center">
              <span className={`text-xs font-black uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>Fin Stacking</span>
              {canEdit ? (
                <InlineEditCell value={transporte.fin_stacking} field="fin_stacking" record={transporte} onSave={onUpdate} type="datetime" />
              ) : (
                <span className={`text-sm font-black ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>{formatValue(transporte.fin_stacking)}</span>
              )}
            </div>
          </div>
          <div className="text-center">
            <span className={`text-xs font-black uppercase tracking-wider block mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>Cut Off</span>
            {canEdit ? (
              <InlineEditCell value={transporte.cut_off} field="cut_off" record={transporte} onSave={onUpdate} type="datetime" />
            ) : (
              <span className={`text-sm font-black ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>{formatValue(transporte.cut_off)}</span>
            )}
          </div>
        </div>

        {/* Planta */}
        <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-gray-50'}`}>
          <span className={`text-xs font-black uppercase tracking-wider block mb-2 text-center ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>Presentación en Planta</span>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1 text-center">
              <span className={`text-xs font-black uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>Planta</span>
              {canEdit ? (
                <select value={transporte.planta || ''} onChange={(e) => onUpdate({ ...transporte, planta: e.target.value || null })}
                  className={`w-full px-2 py-1 text-xs rounded border text-center ${theme === 'dark' ? 'border-slate-600 bg-slate-800 text-slate-200' : 'border-gray-300 bg-white text-gray-900'}`}>
                  <option value="">{isLoadingPlantas ? 'Cargando...' : 'Seleccionar planta...'}</option>
                  {plantas.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              ) : (
                <span className={`text-sm font-black ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>{formatValue(transporte.planta)}</span>
              )}
            </div>
            <div className="space-y-1 text-center">
              <span className={`text-xs font-black uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>Fecha/Hora</span>
              {canEdit ? (
                <InlineEditCell value={transporte.dia_presentacion} field="dia_presentacion" record={transporte} onSave={onUpdate} type="text" />
              ) : (
                <span className={`text-sm font-black ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>{formatValue(transporte.dia_presentacion)}</span>
              )}
            </div>
          </div>
        </div>

        {/* Transportista */}
        <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-gray-50'}`}>
          <span className={`text-xs font-black uppercase tracking-wider block mb-2 text-center ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>Información Transportista</span>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1 text-center">
              <span className={`text-xs font-black uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>Conductor</span>
              {canEdit ? (
                <InlineEditCell value={transporte.conductor} field="conductor" record={transporte} onSave={onUpdate} type="text" />
              ) : (
                <span className={`text-sm font-black ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>{formatValue(transporte.conductor)}</span>
              )}
            </div>
            <div className="space-y-1 text-center">
              <span className={`text-xs font-black uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>Patente</span>
              {canEdit ? (
                <InlineEditCell value={transporte.patente} field="patente" record={transporte} onSave={onUpdate} type="text" />
              ) : (
                <span className={`text-sm font-black ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>{formatValue(transporte.patente)}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex justify-center gap-2 p-3 pt-0">
        <button onClick={() => {
          const content = `📦 CONTENEDOR: ${transporte.contenedor || 'N/A'}\n🚢 Booking: ${transporte.booking || 'N/A'}`;
          navigator.clipboard.writeText(content).then(() => alert('Copiado!'));
        }} className={`px-4 py-2 rounded-lg font-black text-sm ${theme === 'dark' ? 'bg-sky-600 text-white' : 'bg-blue-600 text-white'}`}>
          📋 Copiar
        </button>
        <button onClick={handleSendEmail} disabled={sendingEmail || !canEdit}
          className={`px-4 py-2 rounded-lg font-black text-sm ${theme === 'dark' ? 'bg-green-600 text-white' : 'bg-green-600 text-white'}`}>
          {sendingEmail ? 'Enviando...' : 'Gmail'}
        </button>
      </div>
    </div>
  );
}
