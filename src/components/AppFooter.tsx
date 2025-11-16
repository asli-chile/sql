'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Globe, Linkedin, Instagram, Mail, MapPin, Phone, Ship } from 'lucide-react';

interface AppFooterProps {
  className?: string;
}

interface QuickLink {
  label: string;
  href: string;
  isInternal?: boolean;
}

interface SocialLink {
  label: string;
  url: string;
  icon: typeof Linkedin;
}

interface FooterSectionProps {
  title: string;
  children: React.ReactNode;
}

const FooterSection = ({ title, children }: FooterSectionProps) => (
  <div className="space-y-3">
    <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500/80">{title}</p>
    <div className="space-y-2 text-sm text-slate-300">{children}</div>
  </div>
);

export const AppFooter = ({ className = '' }: AppFooterProps) => {
  const router = useRouter();

  const quickLinks: QuickLink[] = [
    { label: 'Dashboard', href: '/dashboard', isInternal: true },
    { label: 'Registros', href: '/registros', isInternal: true },
    { label: 'Documentos', href: '/documentos', isInternal: true },
    { label: 'Contacto', href: '/contacto', isInternal: true },
  ];

  const socialLinks: SocialLink[] = [
    {
      label: 'LinkedIn',
      url: 'https://cl.linkedin.com/company/aslichile',
      icon: Linkedin,
    },
    {
      label: 'Instagram',
      url: 'https://www.instagram.com/asli_chile/',
      icon: Instagram,
    },
    {
      label: 'Sitio web',
      url: 'https://asli.cl',
      icon: Globe,
    },
  ];

  const contactInfo = {
    email: 'informaciones@asli.cl',
    phone: '+56 9 5202 9769',
    website: 'https://asli.cl',
    location: 'Longitudinal Sur kilómetro 186, Curicó, Chile',
  };

  const sanitizedPhone = contactInfo.phone.replace(/\s+/g, '');

  const handleOpenLink = (url: string, isInternal?: boolean) => {
    if (!url) return;
    if (isInternal) {
      router.push(url);
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <footer
      className={`rounded-2xl border border-slate-800/60 bg-slate-950/70 p-8 shadow-xl shadow-slate-900/20 ${className}`}
    >
      <div className="grid gap-8 lg:grid-cols-4">
        <FooterSection title="ASLI GESTIÓN LOGÍSTICA">
          <p className="text-base text-slate-200 leading-relaxed">
            Coordinamos operaciones marítimas, terrestres y documentales para exportadores que necesitan visibilidad
            total y respuesta inmediata.
          </p>
          <div className="inline-flex items-center gap-2 rounded-full bg-sky-500/10 px-4 py-1 text-xs font-semibold text-sky-300">
            <Ship className="h-3.5 w-3.5" aria-hidden="true" />
            años de experiencia
          </div>
        </FooterSection>

        <FooterSection title="Navegación rápida">
          <div className="space-y-1">
            {quickLinks.map((link) => (
              <button
                key={link.label}
                type="button"
                tabIndex={0}
                onClick={() => handleOpenLink(link.href, link.isInternal)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    handleOpenLink(link.href, link.isInternal);
                  }
                }}
                aria-label={`Abrir ${link.label}`}
                className="flex w-full items-center justify-between rounded-lg border border-transparent px-3 py-2 text-left text-slate-300 transition hover:border-sky-500/40 hover:bg-slate-900/60 hover:text-sky-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
              >
                <span>{link.label}</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            ))}
          </div>
        </FooterSection>

        <FooterSection title="Redes sociales">
          <div className="flex flex-wrap gap-3">
            {socialLinks.map((link) => {
              const IconComponent = link.icon;
              return (
                <button
                  key={link.label}
                  type="button"
                  tabIndex={0}
                  onClick={() => handleOpenLink(link.url)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      handleOpenLink(link.url);
                    }
                  }}
                  aria-label={`Abrir ${link.label}`}
                  className="flex items-center gap-2 rounded-full border border-slate-800/60 bg-slate-900/60 px-4 py-2 text-sm text-slate-200 transition hover:border-sky-500/60 hover:text-sky-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
                >
                  <IconComponent className="h-4 w-4" aria-hidden="true" />
                  {link.label}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-slate-500">
            Comparte estado de cargas, itinerarios e hitos en tiempo real con nuestros equipos.
          </p>
        </FooterSection>

        <FooterSection title="Contacto directo">
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-3 text-slate-300">
              <Mail className="h-4 w-4 text-slate-500" aria-hidden="true" />
              <button
                type="button"
                onClick={() => handleOpenLink(`mailto:${contactInfo.email}`)}
                className="text-left text-slate-200 underline-offset-2 hover:underline"
              >
                {contactInfo.email}
              </button>
            </div>
            <div className="flex items-center gap-3 text-slate-300">
              <Phone className="h-4 w-4 text-slate-500" aria-hidden="true" />
              <button
                type="button"
                onClick={() => handleOpenLink(`tel:${sanitizedPhone}`)}
                className="text-left text-slate-200 underline-offset-2 hover:underline"
              >
                {contactInfo.phone}
              </button>
            </div>
            <div className="flex items-center gap-3 text-slate-300">
              <Globe className="h-4 w-4 text-slate-500" aria-hidden="true" />
              <button
                type="button"
                onClick={() => handleOpenLink(contactInfo.website)}
                className="text-left text-slate-200 underline-offset-2 hover:underline"
              >
                asli.cl
              </button>
            </div>
            <div className="flex items-start gap-3 text-slate-300">
              <MapPin className="mt-0.5 h-4 w-4 text-slate-500" aria-hidden="true" />
              <p>{contactInfo.location}</p>
            </div>
          </div>
        </FooterSection>
      </div>

      <div className="mt-8 flex flex-col gap-3 border-t border-slate-800/60 pt-6 text-xs text-slate-500 md:flex-row md:items-center md:justify-between">
        <p>© {new Date().getFullYear()} ASLI Gestión Logística. Todos los derechos reservados.</p>
        <div className="flex flex-wrap items-center gap-4 text-slate-400">
          <span>Operación 24/7</span>
          <span className="hidden h-1 w-1 rounded-full bg-slate-600 md:inline-block" aria-hidden="true" />
          <button
            type="button"
            onClick={() => handleOpenLink('https://asli.cl/aviso-legal')}
            className="text-slate-300 underline-offset-2 hover:underline"
          >
            Aviso legal
          </button>
        </div>
      </div>
    </footer>
  );
};

