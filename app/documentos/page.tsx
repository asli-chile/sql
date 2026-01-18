'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, ChevronRight, ChevronLeft, X, User as UserIcon, LayoutDashboard, Ship, Truck, Settings } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { UserProfileModal } from '@/components/users/UserProfileModal';
import { useUser } from '@/hooks/useUser';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { createClient } from '@/lib/supabase-browser';
import { Registro } from '@/types/registros';

interface DocumentoRow {
  id: string;
  nave: string;
  booking: string;
  contenedor: string;
  refCliente: string;
  reservaPdf: boolean;
  instructivo: boolean;
  guiaDespacho: boolean;
  packingList: boolean;
  proformaInvoice: boolean;
  blSwbTelex: boolean;
  facturaSii: boolean;
  dusLegalizado: boolean;
  fullset: boolean;
}

export default function DocumentosPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const { currentUser } = useUser();
  const supabase = useMemo(() => createClient(), []);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const loadRegistros = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('registros')
        .select('id, nave_inicial, booking, contenedor, ref_cliente')
        .is('deleted_at', null)
        .order('ref_asli', { ascending: false });

      if (error) throw error;

      const registrosData = (data || []).map((r: any) => ({
        id: r.id,
        naveInicial: r.nave_inicial || '',
        booking: r.booking || '',
        contenedor: Array.isArray(r.contenedor) ? r.contenedor.join(', ') : (r.contenedor || ''),
        refCliente: r.ref_cliente || '',
      }));

      setRegistros(registrosData as any);
    } catch (err: any) {
      console.error('Error cargando registros:', err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (currentUser) {
      loadRegistros();
    }
  }, [currentUser, loadRegistros]);

  if (!currentUser) {
    return <LoadingScreen message="Cargando..." />;
  }

  const documentosRows: DocumentoRow[] = registros.map((reg: any) => ({
    id: reg.id,
    nave: reg.naveInicial || '',
    booking: reg.booking || '',
    contenedor: reg.contenedor || '',
    refCliente: reg.refCliente || '',
    reservaPdf: false,
    instructivo: false,
    guiaDespacho: false,
    packingList: false,
    proformaInvoice: false,
    blSwbTelex: false,
    facturaSii: false,
    dusLegalizado: false,
    fullset: false,
  }));

  const sidebarSections = [
    {
      title: 'Principal',
      items: [
        { label: 'Dashboard', id: '/dashboard', isActive: false, icon: LayoutDashboard },
        { label: 'Registros', id: '/registros', isActive: false, icon: Ship },
        { label: 'Transportes', id: '/transportes', isActive: false, icon: Truck },
        { label: 'Documentos', id: '/documentos', isActive: true, icon: FileText },
      ],
    },
    {
      title: 'Configuración',
      items: [
        { label: 'Ajustes', id: '/settings', isActive: false, icon: Settings },
      ],
    },
  ];

  return (
    <div className={`flex h-screen overflow-hidden ${theme === 'dark' ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100' : 'bg-gray-50 text-gray-900'}`}>
      {/* Overlay para móvil */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky left-0 top-0 z-50 lg:z-auto flex h-full flex-col transition-all duration-300 self-start ${theme === 'dark' ? 'border-r border-slate-700 bg-slate-800' : 'border-r border-gray-200 bg-white shadow-lg'} ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${
          isSidebarCollapsed && !isMobileMenuOpen ? 'lg:w-0 lg:opacity-0 lg:overflow-hidden lg:border-r-0' : 'w-64 lg:opacity-100'
        }`}
      >
        <div className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 sm:py-4 ${theme === 'dark' ? 'border-b border-slate-700 bg-slate-800' : 'border-b border-gray-200 bg-white'} sticky top-0 z-10 overflow-hidden`}>
          {/* Botón cerrar móvil */}
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className={`lg:hidden absolute right-3 flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${theme === 'dark' ? 'text-slate-300 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-100'}`}
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" />
          </button>

          {(!isSidebarCollapsed || isMobileMenuOpen) && (
            <>
              <div className={`h-9 w-9 sm:h-10 sm:w-10 overflow-hidden rounded-lg flex-shrink-0 ${theme === 'dark' ? 'bg-slate-700' : 'bg-gray-100'} flex items-center justify-center`}>
                <img
                  src="https://asli.cl/img/logo.png?v=1761679285274&t=1761679285274"
                  alt="ASLI Gestión Logística"
                  className="h-7 w-7 sm:h-8 sm:w-8 object-contain"
                  onError={(event) => {
                    event.currentTarget.style.display = 'none';
                  }}
                />
              </div>
              <div className="flex-1 min-w-0 overflow-hidden">
                <p className={`text-xs sm:text-sm font-semibold truncate ${theme === 'dark' ? 'text-slate-200' : 'text-gray-800'}`}>ASLI Gestión Logística</p>
                <p className={`text-[10px] sm:text-xs truncate ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>Plataforma Operativa</p>
              </div>
            </>
          )}
          {!isSidebarCollapsed && !isMobileMenuOpen && (
            <button
              onClick={toggleSidebar}
              className={`hidden lg:flex h-8 w-8 items-center justify-center rounded-lg border flex-shrink-0 ${theme === 'dark' ? 'border-slate-700/60 bg-slate-900/60 text-slate-300 hover:border-sky-500/60 hover:text-sky-200' : 'border-gray-300 bg-gray-100 text-gray-600 hover:border-blue-400 hover:text-blue-700'} transition`}
              aria-label="Contraer menú lateral"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          {isSidebarCollapsed && !isMobileMenuOpen && (
            <button
              onClick={toggleSidebar}
              className={`hidden lg:flex h-8 w-8 items-center justify-center rounded-lg border flex-shrink-0 ${theme === 'dark' ? 'border-slate-700/60 bg-slate-900/60 text-slate-300 hover:border-sky-500/60 hover:text-sky-200' : 'border-gray-300 bg-gray-100 text-gray-600 hover:border-blue-400 hover:text-blue-700'} transition`}
              aria-label="Expandir menú lateral"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>

        {(!isSidebarCollapsed || isMobileMenuOpen) && (
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-4 py-4 sm:py-6 space-y-6 sm:space-y-8">
            {sidebarSections.map((section) => (
              <div key={section.title} className="space-y-2 sm:space-y-3">
                <p className={`text-[10px] sm:text-xs uppercase tracking-[0.25em] sm:tracking-[0.3em] truncate ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>{section.title}</p>
                <div className="space-y-1 sm:space-y-1.5 overflow-y-visible">
                  {section.items.map((item) => {
                    const isActive = item.isActive || false;
                    return (
                      <button
                        key={item.label}
                        onClick={() => {
                          if ('onClick' in item && item.onClick) {
                            item.onClick();
                            setIsMobileMenuOpen(false);
                          } else if (item.id) {
                            router.push(item.id);
                            setIsMobileMenuOpen(false);
                          }
                        }}
                        className={`group w-full text-left flex items-center justify-between rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 transition-colors min-w-0 ${
                          isActive
                            ? 'bg-blue-600 text-white'
                            : theme === 'dark'
                              ? 'hover:bg-slate-700 text-slate-300'
                              : 'hover:bg-blue-50 text-blue-600 font-semibold'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {item.icon && (
                            <item.icon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                          )}
                          <span className={`text-xs sm:text-sm font-semibold truncate flex-1 min-w-0 ${
                            isActive
                              ? '!text-white'
                              : theme !== 'dark'
                                ? '!text-blue-600'
                                : ''
                          }`}>{item.label}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="space-y-2 sm:space-y-3">
              <p className={`text-[10px] sm:text-xs uppercase tracking-[0.25em] sm:tracking-[0.3em] truncate ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Preferencias</p>
              <ThemeToggle variant="switch" label="Tema" />
            </div>
          </div>
        )}
      </aside>

      {/* Content */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden h-full">
        <header className={`sticky top-0 z-40 border-b overflow-hidden ${theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white shadow-sm'}`}>
          <div className="flex flex-wrap items-center gap-4 px-4 sm:px-6 py-3 sm:py-4">
            {/* Botón hamburguesa para móvil */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className={`lg:hidden flex h-9 w-9 items-center justify-center rounded-lg transition-colors flex-shrink-0 ${
                theme === 'dark' 
                  ? 'text-slate-300 hover:bg-slate-700' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              aria-label="Abrir menú"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            {/* Botón para expandir sidebar colapsado en desktop */}
            {isSidebarCollapsed && (
              <button
                onClick={toggleSidebar}
                className={`hidden lg:flex h-9 w-9 items-center justify-center rounded-lg transition-colors flex-shrink-0 ${
                  theme === 'dark' 
                    ? 'text-slate-300 hover:bg-slate-700 border border-slate-700' 
                    : 'text-gray-600 hover:bg-gray-100 border border-gray-300'
                }`}
                aria-label="Expandir menú lateral"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            )}

            <div className="flex items-center gap-3 sm:gap-4">
              <div className={`hidden sm:flex h-12 w-12 items-center justify-center rounded-xl ${theme === 'dark' ? 'bg-sky-500/15' : 'bg-blue-100'}`}>
                <FileText className={`h-7 w-7 ${theme === 'dark' ? 'text-sky-300' : 'text-blue-600'}`} />
              </div>
              <div>
                <p className={`text-[10px] sm:text-[11px] uppercase tracking-[0.3em] sm:tracking-[0.4em] ${theme === 'dark' ? 'text-slate-500/80' : 'text-gray-500'}`}>Módulo Operativo</p>
                <h1 className={`text-xl sm:text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Documentos</h1>
                <p className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>Gestión de documentos y facturas de embarques</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 ml-auto">
              <button
                onClick={() => setShowProfileModal(true)}
                className={`hidden sm:flex items-center gap-2 rounded-full border px-3 py-2 text-xs sm:text-sm ${
                  theme === 'dark'
                    ? 'border-slate-800/70 text-slate-300 hover:border-sky-400/60 hover:text-sky-200'
                    : 'border-gray-300 text-gray-700 hover:border-blue-400 hover:text-blue-600 bg-white shadow-sm'
                }`}
              >
                <UserIcon className="h-4 w-4" />
                {currentUser?.nombre || currentUser?.email}
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 w-full">
          <div className="mx-auto w-full max-w-[1600px] px-4 pb-10 pt-4 space-y-4 sm:px-6 sm:pt-6 sm:space-y-6 lg:px-8 lg:space-y-6 xl:px-10 xl:space-y-8">
            {/* Tabla de Documentos */}
            <section className={`rounded-3xl border shadow-xl backdrop-blur-xl overflow-hidden ${
              theme === 'dark'
                ? 'border-slate-800/70 bg-slate-950/70 shadow-slate-950/30'
                : 'border-gray-200 bg-white shadow-md'
            }`}>
              <div className="overflow-x-auto">
                <table className={`min-w-full divide-y ${
                  theme === 'dark' ? 'divide-slate-800/60' : 'divide-gray-200'
                }`}>
                  <thead className={`sticky top-0 z-10 backdrop-blur-sm ${
                    theme === 'dark'
                      ? 'bg-slate-900/95 border-b border-slate-800/60'
                      : 'bg-white border-b border-gray-200'
                  }`}>
                    <tr>
                      <th className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider ${
                        theme === 'dark' ? 'text-slate-200' : 'text-gray-800'
                      }`}>
                        Nave | Booking | Contenedor
                      </th>
                      <th className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider ${
                        theme === 'dark' ? 'text-slate-200' : 'text-gray-800'
                      }`}>
                        Ref Cliente
                      </th>
                      <th className={`px-4 py-3 text-center text-xs font-bold uppercase tracking-wider ${
                        theme === 'dark' ? 'text-slate-200' : 'text-gray-800'
                      }`}>
                        Reserva PDF
                      </th>
                      <th className={`px-4 py-3 text-center text-xs font-bold uppercase tracking-wider ${
                        theme === 'dark' ? 'text-slate-200' : 'text-gray-800'
                      }`}>
                        Instructivo
                      </th>
                      <th className={`px-4 py-3 text-center text-xs font-bold uppercase tracking-wider ${
                        theme === 'dark' ? 'text-slate-200' : 'text-gray-800'
                      }`}>
                        Guía de Despacho
                      </th>
                      <th className={`px-4 py-3 text-center text-xs font-bold uppercase tracking-wider ${
                        theme === 'dark' ? 'text-slate-200' : 'text-gray-800'
                      }`}>
                        Packing List
                      </th>
                      <th className={`px-4 py-3 text-center text-xs font-bold uppercase tracking-wider ${
                        theme === 'dark' ? 'text-slate-200' : 'text-gray-800'
                      }`}>
                        Proforma Invoice
                      </th>
                      <th className={`px-4 py-3 text-center text-xs font-bold uppercase tracking-wider ${
                        theme === 'dark' ? 'text-slate-200' : 'text-gray-800'
                      }`}>
                        BL-SWB-TELEX
                      </th>
                      <th className={`px-4 py-3 text-center text-xs font-bold uppercase tracking-wider ${
                        theme === 'dark' ? 'text-slate-200' : 'text-gray-800'
                      }`}>
                        Factura SII
                      </th>
                      <th className={`px-4 py-3 text-center text-xs font-bold uppercase tracking-wider ${
                        theme === 'dark' ? 'text-slate-200' : 'text-gray-800'
                      }`}>
                        DUS Legalizado
                      </th>
                      <th className={`px-4 py-3 text-center text-xs font-bold uppercase tracking-wider ${
                        theme === 'dark' ? 'text-slate-200' : 'text-gray-800'
                      }`}>
                        Fullset
                      </th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${
                    theme === 'dark' ? 'divide-slate-800/60 bg-slate-900/50' : 'divide-gray-200 bg-white'
                  }`}>
                    {isLoading ? (
                      <tr>
                        <td colSpan={11} className={`px-4 py-8 text-center text-sm ${
                          theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
                        }`}>
                          Cargando documentos...
                        </td>
                      </tr>
                    ) : documentosRows.length === 0 ? (
                      <tr>
                        <td colSpan={11} className={`px-4 py-8 text-center text-sm ${
                          theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
                        }`}>
                          No hay documentos disponibles
                        </td>
                      </tr>
                    ) : (
                      documentosRows.map((row) => (
                        <tr key={row.id} className={`hover:${
                          theme === 'dark' ? 'bg-slate-800/50' : 'bg-gray-50'
                        } transition-colors`}>
                          <td className={`px-4 py-3 whitespace-nowrap ${
                            theme === 'dark' ? 'text-slate-300' : 'text-gray-900'
                          }`}>
                            <div className="flex flex-col space-y-0.5">
                              <span className="font-medium">{row.nave}</span>
                              <span className="text-xs opacity-75">{row.booking}</span>
                              <span className="text-xs opacity-75">{row.contenedor}</span>
                            </div>
                          </td>
                          <td className={`px-4 py-3 whitespace-nowrap ${
                            theme === 'dark' ? 'text-slate-300' : 'text-gray-900'
                          }`}>
                            {row.refCliente || '—'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <div className={`inline-flex items-center justify-center w-6 h-6 rounded ${
                              row.reservaPdf 
                                ? 'bg-green-500 text-white' 
                                : theme === 'dark' 
                                  ? 'bg-slate-700 text-slate-500' 
                                  : 'bg-gray-200 text-gray-400'
                            }`}>
                              {row.reservaPdf ? '✓' : '—'}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <div className={`inline-flex items-center justify-center w-6 h-6 rounded ${
                              row.instructivo 
                                ? 'bg-green-500 text-white' 
                                : theme === 'dark' 
                                  ? 'bg-slate-700 text-slate-500' 
                                  : 'bg-gray-200 text-gray-400'
                            }`}>
                              {row.instructivo ? '✓' : '—'}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <div className={`inline-flex items-center justify-center w-6 h-6 rounded ${
                              row.guiaDespacho 
                                ? 'bg-green-500 text-white' 
                                : theme === 'dark' 
                                  ? 'bg-slate-700 text-slate-500' 
                                  : 'bg-gray-200 text-gray-400'
                            }`}>
                              {row.guiaDespacho ? '✓' : '—'}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <div className={`inline-flex items-center justify-center w-6 h-6 rounded ${
                              row.packingList 
                                ? 'bg-green-500 text-white' 
                                : theme === 'dark' 
                                  ? 'bg-slate-700 text-slate-500' 
                                  : 'bg-gray-200 text-gray-400'
                            }`}>
                              {row.packingList ? '✓' : '—'}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <div className={`inline-flex items-center justify-center w-6 h-6 rounded ${
                              row.proformaInvoice 
                                ? 'bg-green-500 text-white' 
                                : theme === 'dark' 
                                  ? 'bg-slate-700 text-slate-500' 
                                  : 'bg-gray-200 text-gray-400'
                            }`}>
                              {row.proformaInvoice ? '✓' : '—'}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <div className={`inline-flex items-center justify-center w-6 h-6 rounded ${
                              row.blSwbTelex 
                                ? 'bg-green-500 text-white' 
                                : theme === 'dark' 
                                  ? 'bg-slate-700 text-slate-500' 
                                  : 'bg-gray-200 text-gray-400'
                            }`}>
                              {row.blSwbTelex ? '✓' : '—'}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <div className={`inline-flex items-center justify-center w-6 h-6 rounded ${
                              row.facturaSii 
                                ? 'bg-green-500 text-white' 
                                : theme === 'dark' 
                                  ? 'bg-slate-700 text-slate-500' 
                                  : 'bg-gray-200 text-gray-400'
                            }`}>
                              {row.facturaSii ? '✓' : '—'}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <div className={`inline-flex items-center justify-center w-6 h-6 rounded ${
                              row.dusLegalizado 
                                ? 'bg-green-500 text-white' 
                                : theme === 'dark' 
                                  ? 'bg-slate-700 text-slate-500' 
                                  : 'bg-gray-200 text-gray-400'
                            }`}>
                              {row.dusLegalizado ? '✓' : '—'}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <div className={`inline-flex items-center justify-center w-6 h-6 rounded ${
                              row.fullset 
                                ? 'bg-green-500 text-white' 
                                : theme === 'dark' 
                                  ? 'bg-slate-700 text-slate-500' 
                                  : 'bg-gray-200 text-gray-400'
                            }`}>
                              {row.fullset ? '✓' : '—'}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </main>
      </div>

      {/* Modal de perfil de usuario */}
      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        userInfo={currentUser}
      />
    </div>
  );
}
