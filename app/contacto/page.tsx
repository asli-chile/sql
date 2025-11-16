'use client';

import { useState } from 'react';
import {
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  Clock,
  ShieldCheck,
  CalendarDays,
  Send,
  AlertCircle,
} from 'lucide-react';

const CONTACT_PHONE = '+56 9 5202 9769';
const CONTACT_EMAIL = 'informaciones@asli.cl';
const CONTACT_ADDRESS = 'Longitudinal Sur kilómetro 186, Curicó, Chile';

type ContactChannel = {
  title: string;
  description: string;
  actionLabel: string;
  actionType: 'phone' | 'email' | 'link';
  value: string;
  icon: typeof Phone;
  helper?: string;
};

type SlaHighlight = {
  title: string;
  time: string;
  detail: string;
  icon: typeof Clock;
};

type FaqItem = {
  question: string;
  answer: string;
};

const contactChannels: ContactChannel[] = [
  {
    title: 'Urgencias Operativas 24/7',
    description: 'Para desviaciones en tránsito, cambios de itinerario o emergencias en ruta.',
    actionLabel: 'Llamar ahora',
    actionType: 'phone',
    value: CONTACT_PHONE,
    icon: Phone,
    helper: 'Atención inmediata',
  },
  {
    title: 'Centro de Operaciones',
    description: 'Coordinación de embarques, booking y cut-offs documentales.',
    actionLabel: 'Enviar correo',
    actionType: 'email',
    value: CONTACT_EMAIL,
    icon: Mail,
    helper: 'Respuesta < 2 horas',
  },
  {
    title: 'Oficina Central Curicó',
    description: CONTACT_ADDRESS,
    actionLabel: 'Ver mapa',
    actionType: 'link',
    value: '',
    icon: MapPin,
    helper: 'Horario 09:00 - 18:00',
  },
  {
    title: 'WhatsApp Ejecutivo',
    description: 'Canal directo para visación de documentos y confirmaciones finales.',
    actionLabel: 'Abrir chat',
    actionType: 'link',
    value: 'https://wa.me/56952029769',
    icon: MessageCircle,
    helper: 'Confirmaciones en minutos',
  },
];

const slaHighlights: SlaHighlight[] = [
  {
    title: 'Urgencias',
    time: '< 2 horas',
    detail: 'Actualización inicial y plan de mitigación para incidencias críticas.',
    icon: AlertCircle,
  },
  {
    title: 'Consultas generales',
    time: '< 24 horas',
    detail: 'Respuesta consolidada con respaldos y próximos pasos.',
    icon: Clock,
  },
  {
    title: 'Documentación',
    time: 'Mismo día hábil',
    detail: 'Validación y emisión de documentos operativos y comerciales.',
    icon: ShieldCheck,
  },
];

const requestTypes = [
  { value: 'embarque', label: 'Estado de embarque' },
  { value: 'transporte', label: 'Transporte terrestre' },
  { value: 'documentos', label: 'Documentación y facturación' },
  { value: 'incidencia', label: 'Incidencia o reclamo' },
  { value: 'otro', label: 'Otro requerimiento' },
] as const;

const faqs: FaqItem[] = [
  {
    question: '¿En cuánto tiempo puedo obtener visibilidad de un contenedor?',
    answer:
      'Nuestros reportes en línea se actualizan cada 15 minutos y puedes solicitar un resumen inmediato desde este formulario o vía WhatsApp Ejecutivo.',
  },
  {
    question: '¿Quién recibe los documentos originales y copias legalizadas?',
    answer:
      'El equipo de documentación de ASLI coordina el despacho físico a tu bodega u oficina y mantiene copias digitalizadas en Supabase con acceso controlado.',
  },
  {
    question: '¿Puedo coordinar transporte terrestre directamente desde esta página?',
    answer:
      'Sí, indica el tipo de carga, origen y destino en el formulario y un coordinador de flota te contactará para asignar camión o chasis disponible.',
  },
];

const INITIAL_FORM = {
  name: '',
  email: '',
  requestType: '',
  message: '',
};

type FormStatus =
  | { state: 'idle' }
  | { state: 'success'; message: string }
  | { state: 'error'; message: string };

const sanitizePhone = (value: string) => value.replace(/\s+/g, '');

export default function ContactoPage() {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [formStatus, setFormStatus] = useState<FormStatus>({ state: 'idle' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const handleChannelAction = (channel: ContactChannel) => {
    const { actionType, value } = channel;
    if (!value) {
      return;
    }
    if (actionType === 'phone') {
      window.open(`tel:${sanitizePhone(value)}`);
      return;
    }
    if (actionType === 'email') {
      window.open(`mailto:${value}`);
      return;
    }
    window.open(value, '_blank', 'noopener,noreferrer');
  };

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setFormStatus({ state: 'error', message: 'Ingresa tu nombre completo.' });
      return false;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setFormStatus({ state: 'error', message: 'Ingresa un correo válido.' });
      return false;
    }
    if (!formData.requestType) {
      setFormStatus({ state: 'error', message: 'Selecciona el tipo de requerimiento.' });
      return false;
    }
    if (formData.message.trim().length < 10) {
      setFormStatus({ state: 'error', message: 'Cuéntanos más detalles (mínimo 10 caracteres).' });
      return false;
    }
    return true;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormStatus({ state: 'idle' });

    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setFormStatus({
        state: 'success',
        message: 'Recibimos tu solicitud. Un ejecutivo te contactará a la brevedad.',
      });
      setFormData(INITIAL_FORM);
    } catch (error) {
      console.error(error);
      setFormStatus({
        state: 'error',
        message: 'Ocurrió un problema al enviar tu solicitud. Intenta nuevamente.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFaqToggle = (index: number) => {
    setOpenFaqIndex((prev) => (prev === index ? null : index));
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="mx-auto w-full max-w-6xl space-y-12 px-4 py-16 sm:px-6 lg:px-0">
        <section className="rounded-3xl border border-slate-800/70 bg-slate-950/70 p-8 shadow-2xl shadow-slate-900/40">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.5em] text-slate-500">Centro de contacto</p>
              <h1 className="text-3xl font-semibold text-white md:text-4xl">
                Coordinación integral y soporte <span className="text-sky-400">24/7</span>
              </h1>
              <p className="max-w-2xl text-base text-slate-300">
                El equipo operativo de ASLI responde en tiempo real a cualquier requerimiento logístico:
                estatus de contenedores, booking, documentación, transporte terrestre y contingencias.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => window.open(`tel:${sanitizePhone(CONTACT_PHONE)}`)}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 transition hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60"
                  aria-label="Llamar al centro de urgencias"
                >
                  <Phone className="h-4 w-4" />
                  Llamar urgencias
                </button>
                <button
                  type="button"
                  onClick={() => window.open(`mailto:${CONTACT_EMAIL}`)}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-700/70 px-5 py-2.5 text-sm font-semibold text-slate-200 hover:border-sky-500/60 hover:text-sky-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60"
                  aria-label="Enviar correo a operaciones"
                >
                  <Mail className="h-4 w-4" />
                  Escribir a operaciones
                </button>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-800/70 bg-slate-900/80 p-6 text-sm text-slate-300">
              <div className="flex items-center gap-3 text-sky-300">
                <Clock className="h-5 w-5" />
                <span>Operación continua 24/7</span>
              </div>
              <p className="mt-4 text-slate-400">
                Monitoreamos itinerarios marítimos, ventanas de depósito y conexión terrestre en vivo. Si
                necesitas escalar, contáctanos por los canales prioritarios.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {contactChannels.map((channel) => {
            const IconComponent = channel.icon;
            return (
              <div
                key={channel.title}
                className="flex flex-col justify-between rounded-2xl border border-slate-800/70 bg-slate-950/60 p-6 shadow-lg shadow-slate-950/30"
              >
                <div className="flex items-start gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500/15 text-sky-300">
                    <IconComponent className="h-6 w-6" />
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-[0.4em] text-slate-500">{channel.helper}</p>
                    <h2 className="mt-2 text-xl font-semibold text-white">{channel.title}</h2>
                    <p className="mt-2 text-sm text-slate-300">{channel.description}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleChannelAction(channel)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      handleChannelAction(channel);
                    }
                  }}
                  className="mt-6 inline-flex items-center justify-center gap-2 rounded-full border border-slate-700/60 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-sky-500/60 hover:bg-slate-900/60 hover:text-sky-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60"
                  aria-label={channel.actionLabel}
                >
                  {channel.actionLabel}
                  <Send className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-slate-800/70 bg-slate-950/70 p-6">
            <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Ubicación</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">Oficina central Curicó</h3>
            <p className="mt-2 text-sm text-slate-300">
              Longitudinal Sur kilómetro 186, Curicó, Chile
            </p>
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-800/70">
              <iframe
                title="Ubicación ASLI Curicó"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3269.2911929993757!2d-71.2034765!3d-34.974370199999996!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x966457bfbad3103d%3A0x1a06a30ef08571a5!2sASLI%20-%20Log%C3%ADstica%20y%20Comercio%20Exterior!5e0!3m2!1ses!2scl!4v1763173374668!5m2!1ses!2scl"
                className="h-72 w-full"
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
          <div className="space-y-4">
            {slaHighlights.map((sla) => {
              const IconComponent = sla.icon;
              return (
                <div
                  key={sla.title}
                  className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-5 shadow-md shadow-slate-950/20"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/15 text-indigo-300">
                      <IconComponent className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-xs uppercase tracking-[0.4em] text-slate-500">{sla.title}</p>
                      <p className="text-xl font-semibold text-white">{sla.time}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-slate-300">{sla.detail}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-2">
          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border border-slate-800/70 bg-slate-950/70 p-6 shadow-xl shadow-slate-950/30"
          >
            <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Formulario rápido</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">Cuéntanos tu requerimiento</h3>

            <div className="mt-6 space-y-5">
              <div>
                <label htmlFor="name" className="text-sm font-medium text-slate-300">
                  Nombre completo
                </label>
                <input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  placeholder="Ej. Camila Ríos"
                  autoComplete="name"
                />
              </div>
              <div>
                <label htmlFor="email" className="text-sm font-medium text-slate-300">
                  Correo electrónico
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  placeholder="operaciones@tuempresa.com"
                  autoComplete="email"
                />
              </div>
              <div>
                <label htmlFor="requestType" className="text-sm font-medium text-slate-300">
                  Tipo de solicitud
                </label>
                <select
                  id="requestType"
                  name="requestType"
                  value={formData.requestType}
                  onChange={handleInputChange}
                  className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-white focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                >
                  <option value="">Selecciona una opción</option>
                  {requestTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="message" className="text-sm font-medium text-slate-300">
                  Detalles del requerimiento
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  rows={5}
                  className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  placeholder="Incluye referencia, cut-off, puerto y cualquier dato relevante."
                />
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              {formStatus.state !== 'idle' && (
                <div
                  className={`rounded-2xl border px-4 py-3 text-sm ${
                    formStatus.state === 'success'
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                      : 'border-rose-500/40 bg-rose-500/10 text-rose-100'
                  }`}
                  role="status"
                  aria-live="polite"
                >
                  {formStatus.message}
                </div>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                {isSubmitting ? 'Enviando...' : 'Enviar solicitud'}
              </button>
              <p className="text-xs text-slate-500">
                Al enviar, autorizas a ASLI a contactarte por correo o teléfono conforme a nuestra política
                de privacidad.
              </p>
            </div>
          </form>

          <div className="space-y-5">
            <div className="rounded-3xl border border-slate-800/70 bg-slate-950/70 p-6">
              <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Preguntas frecuentes</p>
              <h3 className="mt-2 text-2xl font-semibold text-white">FAQ Operativo</h3>
              <div className="mt-4 space-y-4">
                {faqs.map((faq, index) => {
                  const isOpen = openFaqIndex === index;
                  return (
                    <div key={faq.question} className="rounded-2xl border border-slate-800/70">
                      <button
                        type="button"
                        onClick={() => handleFaqToggle(index)}
                        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-slate-200"
                        aria-expanded={isOpen}
                        aria-controls={`faq-panel-${index}`}
                      >
                        {faq.question}
                        <span className="text-sky-300">{isOpen ? '−' : '+'}</span>
                      </button>
                      {isOpen && (
                        <div
                          id={`faq-panel-${index}`}
                          className="border-t border-slate-800/70 px-4 py-3 text-sm text-slate-300"
                        >
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800/70 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-900 p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Agenda con nosotros</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">Coordinemos una reunión</h3>
                  <p className="text-sm text-slate-300">
                    Agenda una videollamada con un ejecutivo para revisar demandas o nuevas campañas de
                    exportación.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    window.open('https://calendly.com/asli-operaciones/30min', '_blank', 'noopener,noreferrer')
                  }
                  className="inline-flex items-center gap-2 rounded-full border border-slate-800 px-4 py-2 text-sm font-semibold text-slate-100 hover:border-sky-500/60 hover:text-sky-100"
                  aria-label="Agendar reunión con un ejecutivo"
                >
                  <CalendarDays className="h-4 w-4" />
                  Agendar reunión
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

