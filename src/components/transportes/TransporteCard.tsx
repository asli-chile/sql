'use client';

import { TransporteRecord } from '@/lib/transportes-service';
import { InlineEditCell } from './InlineEditCell';
import { Download, RefreshCcw, Truck, Calendar, MapPin, User, Package, Thermometer, Wind, Ship, ChevronDown, Mail } from 'lucide-react';
import { useState, useEffect } from 'react';

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

  // Cargar catálogo de plantas
  useEffect(() => {
    const loadPlantas = async () => {
      setIsLoadingPlantas(true);
      try {
        console.log('🔄 Cargando catálogo de plantas...');
        const response = await fetch('/api/catalogos/plantas');
        console.log('📡 Response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('📋 Datos recibidos:', data);
          console.log('📋 Plantas array:', data.plantas);
          console.log('📋 Tipo de plantas:', typeof data.plantas);
          console.log('📋 Longitud de plantas:', data.plantas?.length);
          setPlantas(data.plantas || []);
        } else {
          console.error('❌ Error en respuesta:', response.statusText);
          const errorData = await response.text();
          console.error('❌ Error details:', errorData);
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
    if (!canEdit) {
      alert('No tienes permisos para enviar correos');
      return;
    }

    if (!userEmail) {
      alert('No se pudo determinar el email del usuario actual. Cierra sesión e inicia nuevamente.');
      return;
    }

    setSendingEmail(true);

    try {
      const emailSubject = `${transporte.ref_cliente || 'N/A'} // SOLICITUD DE RETIRO Y PRESENTACION EN PLANTA // ${transporte.booking || 'N/A'} // ${transporte.naviera || 'N/A'} // ${transporte.nave || 'N/A'} // ${transporte.planta || 'N/A'} // POL - POD // ${transporte.ref_cliente || 'N/A'} // ${transporte.ref_asli || 'N/A'}`;

      const emailBody = `
        <div style="font-family: Arial, sans-serif; font-size: 11px; line-height: 1.3; color: #333;">
          <strong style="color: #0066cc; font-size: 12px;">🚛 SOLICITUD RETIRO - PRESENTACIÓN</strong><br/><br/>
          
          <strong>📦 Contenedor:</strong> ${transporte.contenedor || 'N/A'}<br/>
          <strong>📋 Booking:</strong> ${transporte.booking || 'N/A'}<br/>
          <strong>👤 Ref Cliente:</strong> ${transporte.ref_cliente || 'N/A'}<br/>
          <strong>🏢 Ref ASLI:</strong> ${transporte.ref_asli || 'N/A'}<br/><br/>
          
          <strong>🚚 Transporte:</strong> ${transporte.transporte || 'N/A'}<br/>
          <strong>🏭 Planta:</strong> ${transporte.planta || 'N/A'}<br/>
          <strong>⚓ Naviera:</strong> ${transporte.naviera || 'N/A'}<br/>
          <strong>🚢 Nave:</strong> ${transporte.nave || 'N/A'}<br/><br/>
          
          <strong>📋 ACCIONES:</strong><br/>
          • Coordinar retiro<br/>
          • Presentar en planta<br/>
          • Verificar docs<br/><br/>
          
          ${transporte.atmosfera_controlada ? '<strong>🌡️ ATMÓSFERA CONTROLADA</strong><br/>' : ''}
          ${transporte.late ? '<strong>⏰ LATE</strong><br/>' : ''}
          ${transporte.extra_late ? '<strong>⏰ EXTRA LATE</strong><br/>' : ''}
          ${transporte.porteo ? '<strong>🚚 PORTEO</strong><br/>' : ''}
          ${transporte.ingreso_stacking ? '<strong>📦 INGRESADO STACKING</strong><br/>' : ''}
          
          <hr style="margin: 10px 0; border: none; border-top: 1px solid #ddd;"/>
          <small style="color: #666;">ASLI Sistema - ${new Date().toLocaleDateString('es-CL')}</small>
        </div>
      `;

      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: 'alex.cardenas@asli.cl',
          subject: emailSubject,
          body: emailBody,
          action: 'draft', // Volvemos a crear borrador
          fromEmail: userEmail,
          transportData: transporte,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        const details = typeof result?.details === 'string' ? result.details : '';
        const message = typeof result?.error === 'string' ? result.error : 'Error al preparar correo';
        const fullMessage = details ? `${message} (${response.status}): ${details}` : `${message} (${response.status})`;
        throw new Error(fullMessage);
      }

      // Abrir el borrador en modo de redacción usando el draftId
      if (result.draftId) {
        window.open(`https://mail.google.com/mail/#drafts?message=${result.draftId}`, '_blank');
        alert('✅ Correo ASLI abierto en redacción\n\n📧 Listo para revisar y enviar con firma corporativa');
      } else {
        // Fallback: abrir lista de borradores
        window.open('https://mail.google.com/mail/#drafts', '_blank');
        alert('📧 Borrador ASLI creado\n\nRevisa la sección Borradores en Gmail');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      alert(`❌ Error al preparar correo: ${errorMessage}`);
      console.error('Error preparando correo:', error);
    } finally {
      setSendingEmail(false);
    }
  };

  const bookingValue = transporte.booking;
  const bookingKey = bookingValue ? bookingValue.trim().toUpperCase().replace(/\s+/g, '') : '';
  const hasPdf = bookingKey && bookingDocuments.has(bookingKey);

  return (
    <div
      className={`relative rounded-xl border-2 transition-all duration-200 hover:shadow-lg ${
        isSelected
          ? theme === 'dark'
            ? 'border-sky-500 bg-slate-800/50'
            : 'border-blue-500 bg-blue-50'
          : theme === 'dark'
            ? 'border-slate-700 bg-slate-900/50 hover:border-slate-600'
            : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
      onContextMenu={onContextMenu}
    >
      {/* Header superior */}
      <div className={`p-4 border-b ${theme === 'dark' ? 'border-slate-700' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between">
          {/* Checkbox de selección */}
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onSelect}
            disabled={!canEdit}
            className={`h-4 w-4 rounded focus:ring-2 ${canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'} ${
              theme === 'dark'
                ? 'border-slate-600 bg-slate-800 text-sky-500 focus:ring-sky-500/50'
                : 'border-gray-300 bg-white text-blue-600 focus:ring-blue-500/50'
            }`}
          />
          
          {/* Número de contenedor (centro) */}
          <div className="flex-1 text-center">
            <span className={`font-black text-2xl ${theme === 'dark' ? 'text-slate-100' : 'text-gray-900'}`}>
              {transporte.contenedor || 'Sin contenedor'}
            </span>
          </div>
          
          {/* Badge AT CONTROLADA (derecha) */}
          {transporte.atmosfera_controlada && (
            <span className={`px-3 py-1 text-xs rounded-full font-bold ${
              theme === 'dark' ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'
            }`}>
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
                <InlineEditCell
                  value={transporte.ref_cliente || ''}
                  field="ref_cliente"
                  record={transporte}
                  onSave={onUpdate}
                  type="text"
                />
              ) : (
                <span className={`text-sm font-black ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>
                  {formatValue(transporte.ref_cliente)}
                </span>
              )}
            </div>
            <div className="space-y-1 text-center">
              <span className={`text-xs font-black uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                Ref ASLI
              </span>
              {canEdit ? (
                <InlineEditCell
                  value={transporte.ref_asli || ''}
                  field="ref_asli"
                  record={transporte}
                  onSave={onUpdate}
                  type="text"
                />
              ) : (
                <span className={`text-sm font-black ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>
                  {formatValue(transporte.ref_asli)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Booking, Nave, Naviera, Depósito */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1 text-center">
            <span className={`text-xs font-black uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
              Booking
            </span>
            <div className="flex items-center justify-center gap-2">
              {canEdit ? (
                <InlineEditCell
                  value={transporte.booking}
                  field="booking"
                  record={transporte}
                  onSave={onUpdate}
                  type="text"
                />
              ) : (
                <span className={`text-sm font-black ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>
                  {formatValue(transporte.booking)}
                </span>
              )}
              {hasPdf && canEdit && bookingValue && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownloadBooking(bookingValue);
                  }}
                  disabled={downloadingBooking === bookingKey}
                  className={`p-1 rounded transition-colors ${
                    downloadingBooking === bookingKey
                      ? 'opacity-50 cursor-not-allowed'
                      : theme === 'dark'
                        ? 'hover:bg-slate-700 text-slate-400 hover:text-sky-300'
                        : 'hover:bg-gray-100 text-gray-500 hover:text-blue-600'
                  }`}
                  title="Descargar PDF de booking"
                >
                  {downloadingBooking === bookingKey ? (
                    <RefreshCcw className="h-3 w-3 animate-spin" />
                  ) : (
                    <Download className="h-3 w-3" />
                  )}
                </button>
              )}
            </div>
          </div>
          <div className="space-y-1 text-center">
            <span className={`text-xs font-black uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
              Nave
            </span>
            {canEdit ? (
              <InlineEditCell
                value={transporte.nave}
                field="nave"
                record={transporte}
                onSave={onUpdate}
                type="text"
              />
            ) : (
              <span className={`text-sm font-black ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>
                {formatValue(transporte.nave)}
              </span>
            )}
          </div>
          <div className="space-y-1 text-center">
            <span className={`text-xs font-black uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
              Naviera
            </span>
            {canEdit ? (
              <InlineEditCell
                value={transporte.naviera}
                field="naviera"
                record={transporte}
                onSave={onUpdate}
                type="text"
              />
            ) : (
              <span className={`text-sm font-black ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>
                {formatValue(transporte.naviera)}
              </span>
            )}
          </div>
          <div className="space-y-1 text-center">
            <span className={`text-xs font-black uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
              Depósito
            </span>
            {canEdit ? (
              <InlineEditCell
                value={transporte.deposito}
                field="deposito"
                record={transporte}
                onSave={onUpdate}
                type="text"
              />
            ) : (
              <span className={`text-sm font-black ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>
                {formatValue(transporte.deposito)}
              </span>
            )}
          </div>
        </div>

        {/* POL y POD */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1 text-center">
            <span className={`text-xs font-black uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
              POL
            </span>
            {canEdit ? (
              <InlineEditCell
                value={transporte.pol}
                field="pol"
                record={transporte}
                onSave={onUpdate}
                type="text"
              />
            ) : (
              <span className={`text-sm font-black ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>
                {formatValue(transporte.pol)}
              </span>
            )}
          </div>
          <div className="space-y-1 text-center">
            <span className={`text-xs font-black uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
              POD
            </span>
            {canEdit ? (
              <InlineEditCell
                value={transporte.pod}
                field="pod"
                record={transporte}
                onSave={onUpdate}
                type="text"
              />
            ) : (
              <span className={`text-sm font-black ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>
                {formatValue(transporte.pod)}
              </span>
            )}
          </div>
        </div>

        {/* Stacking y Cut Off */}
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1 text-center">
              <span className={`text-xs font-black uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                Inicio Stacking
              </span>
              {canEdit ? (
                <InlineEditCell
                  value={transporte.stacking}
                  field="stacking"
                  record={transporte}
                  onSave={onUpdate}
                  type="datetime"
                />
              ) : (
                <span className={`text-sm font-black ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>
                  {formatValue(transporte.stacking)}
                </span>
              )}
            </div>
            <div className="space-y-1 text-center">
              <span className={`text-xs font-black uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                Fin Stacking
              </span>
              {canEdit ? (
                <InlineEditCell
                  value={transporte.fin_stacking}
                  field="fin_stacking"
                  record={transporte}
                  onSave={onUpdate}
                  type="datetime"
                />
              ) : (
                <span className={`text-sm font-black ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>
                  {formatValue(transporte.fin_stacking)}
                </span>
              )}
            </div>
          </div>
          <div className="text-center">
            <span className={`text-xs font-black uppercase tracking-wider block mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
              Cut Off
            </span>
            {canEdit ? (
              <InlineEditCell
                value={transporte.cut_off}
                field="cut_off"
                record={transporte}
                onSave={onUpdate}
                type="datetime"
              />
            ) : (
              <span className={`text-sm font-black ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>
                {formatValue(transporte.cut_off)}
              </span>
            )}
          </div>
        </div>

        {/* Presentación en planta */}
        <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-gray-50'}`}>
          <span className={`text-xs font-black uppercase tracking-wider block mb-2 text-center ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
            Presentación en Planta
          </span>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1 text-center">
              <span className={`text-xs font-black uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                Planta
              </span>
              {canEdit ? (
                <div className="relative">
                  <select
                    value={transporte.planta || ''}
                    onChange={(e) => onUpdate({ ...transporte, planta: e.target.value || null })}
                    disabled={isLoadingPlantas}
                    className={`w-full px-2 py-1 text-xs rounded border text-center transition-colors ${
                      theme === 'dark'
                        ? 'border-slate-600 bg-slate-800 text-slate-200 focus:ring-1 focus:ring-sky-500/50'
                        : 'border-gray-300 bg-white text-gray-900 focus:ring-1 focus:ring-blue-500/50'
                    }`}
                  >
                    <option value="">
                      {isLoadingPlantas ? 'Cargando...' : 'Seleccionar planta...'}
                    </option>
                    {plantas.map((planta) => (
                      <option key={planta} value={planta}>
                        {planta}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className={`absolute right-2 top-1/2 transform -translate-y-1/2 h-3 w-3 pointer-events-none ${
                    theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
                  }`} />
                  {/* Debug info */}
                  {process.env.NODE_ENV === 'development' && (
                    <div className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`}>
                      {plantas.length} plantas cargadas
                    </div>
                  )}
                </div>
              ) : (
                <span className={`text-sm font-black ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>
                  {formatValue(transporte.planta)}
                </span>
              )}
            </div>
            <div className="space-y-1 text-center">
              <span className={`text-xs font-black uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                Fecha y Hora
              </span>
              {canEdit ? (
                <InlineEditCell
                  value={transporte.dia_presentacion}
                  field="dia_presentacion"
                  record={transporte}
                  onSave={onUpdate}
                  type="text"
                />
              ) : (
                <span className={`text-sm font-black ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>
                  {formatValue(transporte.dia_presentacion)}
                </span>
              )}
            </div>
            <div className="space-y-1 text-center">
              <span className={`text-xs font-black uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                Sello
              </span>
              {canEdit ? (
                <InlineEditCell
                  value={transporte.sello}
                  field="sello"
                  record={transporte}
                  onSave={onUpdate}
                  type="text"
                />
              ) : (
                <span className={`text-sm font-black ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>
                  {formatValue(transporte.sello)}
                </span>
              )}
            </div>
            <div className="space-y-1 text-center">
              <span className={`text-xs font-black uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                Tara
              </span>
              {canEdit ? (
                <InlineEditCell
                  value={transporte.tara}
                  field="tara"
                  record={transporte}
                  onSave={onUpdate}
                  type="text"
                />
              ) : (
                <span className={`text-sm font-black ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>
                  {formatValue(transporte.tara)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Información de transportista */}
        <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-gray-50'}`}>
          <span className={`text-xs font-black uppercase tracking-wider block mb-2 text-center ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
            Información de Transportista
          </span>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1 text-center">
              <span className={`text-xs font-black uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                Conductor
              </span>
              {canEdit ? (
                <InlineEditCell
                  value={transporte.conductor}
                  field="conductor"
                  record={transporte}
                  onSave={onUpdate}
                  type="text"
                />
              ) : (
                <span className={`text-sm font-black ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>
                  {formatValue(transporte.conductor)}
                </span>
              )}
            </div>
            <div className="space-y-1 text-center">
              <span className={`text-xs font-black uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                RUT
              </span>
              {canEdit ? (
                <InlineEditCell
                  value={transporte.rut}
                  field="rut"
                  record={transporte}
                  onSave={onUpdate}
                  type="text"
                />
              ) : (
                <span className={`text-sm font-black ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>
                  {formatValue(transporte.rut)}
                </span>
              )}
            </div>
            <div className="space-y-1 text-center">
              <span className={`text-xs font-black uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                Celular
              </span>
              {canEdit ? (
                <InlineEditCell
                  value={transporte.telefono}
                  field="telefono"
                  record={transporte}
                  onSave={onUpdate}
                  type="text"
                />
              ) : (
                <span className={`text-sm font-black ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>
                  {formatValue(transporte.telefono)}
                </span>
              )}
            </div>
            <div className="space-y-1 text-center">
              <span className={`text-xs font-black uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                Patente
              </span>
              {canEdit ? (
                <InlineEditCell
                  value={transporte.patente}
                  field="patente"
                  record={transporte}
                  onSave={onUpdate}
                  type="text"
                />
              ) : (
                <span className={`text-sm font-black ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>
                  {formatValue(transporte.patente)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex justify-center gap-2 pt-2">
          <button
            onClick={() => {
              // Formatear el contenido de la tarjeta como texto
              const cardContent = `
📦 CONTENEDOR: ${transporte.contenedor || 'N/A'}

📋 INFORMACIÓN DE RESERVA
🔹 Ref Cliente: ${transporte.ref_cliente || 'N/A'}
🔹 Ref ASLI: ${transporte.ref_asli || 'N/A'}

🚢 INFORMACIÓN DE EMBARQUE
🔹 Booking: ${transporte.booking || 'N/A'}
🔹 Nave: ${transporte.nave || 'N/A'}
🔹 Naviera: ${transporte.naviera || 'N/A'}
🔹 Depósito: ${transporte.deposito || 'N/A'}
🔹 POL: ${transporte.pol || 'N/A'}
🔹 POD: ${transporte.pod || 'N/A'}

📅 INFORMACIÓN DE STACKING
🔹 Inicio Stacking: ${formatValue(transporte.stacking)}
🔹 Fin Stacking: ${formatValue(transporte.fin_stacking)}
🔹 Cut Off: ${formatValue(transporte.cut_off)}

🏭 PRESENTACIÓN EN PLANTA
🔹 Planta: ${transporte.planta || 'N/A'}
🔹 Fecha y Hora: ${transporte.dia_presentacion || 'N/A'}
🔹 Sello: ${transporte.sello || 'N/A'}
🔹 Tara: ${transporte.tara || 'N/A'}

🚛 INFORMACIÓN DE TRANSPORTISTA
🔹 Conductor: ${transporte.conductor || 'N/A'}
🔹 RUT: ${transporte.rut || 'N/A'}
🔹 Celular: ${transporte.telefono || 'N/A'}
🔹 Patente: ${transporte.patente || 'N/A'}

${transporte.atmosfera_controlada ? '🌡️ AT CONTROLADA' : ''}
${transporte.late ? '⏰ LATE' : ''}
${transporte.extra_late ? '⏰ EXTRA LATE' : ''}
${transporte.porteo ? '🚚 PORTEO' : ''}
${transporte.ingreso_stacking ? '📦 INGRESADO STACKING' : ''}
              `.trim();

              // Copiar al portapapeles
              navigator.clipboard.writeText(cardContent).then(() => {
                // Mostrar notificación de éxito
                alert('¡Tarjeta copiada al portapapeles!');
              }).catch(() => {
                alert('Error al copiar la tarjeta');
              });
            }}
            className={`px-4 py-2 rounded-lg font-black text-sm transition-colors ${
              theme === 'dark'
                ? 'bg-sky-600 hover:bg-sky-500 text-white'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            📋 Copiar Tarjeta
          </button>

          <button
            onClick={handleSendEmail}
            disabled={sendingEmail || !canEdit}
            className={`px-4 py-2 rounded-lg font-black text-sm transition-colors ${
              sendingEmail || !canEdit
                ? 'opacity-50 cursor-not-allowed bg-gray-400 text-gray-200'
                : theme === 'dark'
                  ? 'bg-green-600 hover:bg-green-500 text-white'
                  : 'bg-green-600 hover:bg-green-500 text-white'
            }`}
            title={canEdit ? 'Preparar borrador en tu Gmail (con firma)' : 'No tienes permisos para enviar correos'}
          >
            {sendingEmail ? (
              <>
                <RefreshCcw className="h-3 w-3 animate-spin inline mr-1" />
                Preparando...
              </>
            ) : (
              <>
                <Mail className="h-3 w-3 inline mr-1" />
                Gmail
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
