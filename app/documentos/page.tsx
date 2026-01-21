'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, ChevronRight, ChevronLeft, X, User as UserIcon, LayoutDashboard, Ship, Truck, Settings, Download, Upload, Trash2, File, Calendar, HardDrive } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { UserProfileModal } from '@/components/users/UserProfileModal';
import { useUser } from '@/hooks/useUser';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { createClient } from '@/lib/supabase-browser';
import { Registro } from '@/types/registros';
import { normalizeBooking, sanitizeFileName, parseStoredDocumentName } from '@/utils/documentUtils';
import { useToast } from '@/hooks/useToast';
import { FinanzasSection } from '@/components/finanzas/FinanzasSection';

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

// Mapeo de columnas a tipos de documentos en storage
const DOCUMENT_TYPE_MAP: Record<string, string> = {
  reservaPdf: 'booking',
  instructivo: 'instructivo-embarque',
  guiaDespacho: 'guia-despacho',
  packingList: 'packing-list',
  proformaInvoice: 'factura-proforma',
  blSwbTelex: 'bl',
  facturaSii: 'factura-comercial',
  dusLegalizado: 'dus',
  fullset: 'fullset',
};

interface DocumentInfo {
  path: string;
  name: string;
}

type DocumentMap = Map<string, Map<string, DocumentInfo>>; // Map<booking, Map<documentType, DocumentInfo>>

export default function DocumentosPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const { currentUser, setCurrentUser, canEdit, canDelete } = useUser();
  const supabase = useMemo(() => createClient(), []);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [documents, setDocuments] = useState<DocumentMap>(new Map());
  const [uploadingDoc, setUploadingDoc] = useState<{ booking: string; type: string } | null>(null);
  const [deletingDoc, setDeletingDoc] = useState<{ booking: string; type: string } | null>(null);
  const [documentModal, setDocumentModal] = useState<{
    isOpen: boolean;
    booking: string;
    docType: string;
    hasDocument: boolean;
    mode: 'view' | 'upload';
    file: File | null;
  }>({
    isOpen: false,
    booking: '',
    docType: '',
    hasDocument: false,
    mode: 'view',
    file: null,
  });
  const [activeTab, setActiveTab] = useState<'documentos' | 'finanzas'>('documentos');
  const fileInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const dataLoadedRef = useRef(false);
  const { success, error: showError } = useToast();

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  // Cargar documentos desde storage
  const loadDocuments = useCallback(async () => {
    try {
      const newDocuments: DocumentMap = new Map();
      const STORAGE_BUCKET = 'documentos';

      // Cargar todos los tipos de documentos
      const documentTypes = Object.values(DOCUMENT_TYPE_MAP);
      
      for (const docType of documentTypes) {
        try {
          const { data, error: listError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .list(docType, {
              limit: 1000,
              offset: 0,
              sortBy: { column: 'updated_at', order: 'desc' },
            });

          if (listError) {
            console.warn(`No se pudieron cargar documentos ${docType}:`, listError.message);
            continue;
          }

          data?.forEach((file) => {
            const separatorIndex = file.name.indexOf('__');
            if (separatorIndex === -1) return;

            const bookingSegment = file.name.slice(0, separatorIndex);
            let booking: string;
            
            try {
              booking = normalizeBooking(decodeURIComponent(bookingSegment));
            } catch {
              booking = normalizeBooking(bookingSegment);
            }

            if (!booking) return;

            // Obtener el booking sin espacios para la clave
            const bookingKey = booking.replace(/\s+/g, '');

            if (!newDocuments.has(bookingKey)) {
              newDocuments.set(bookingKey, new Map());
            }

            const bookingDocs = newDocuments.get(bookingKey)!;
            
            // Si ya existe un documento para este tipo, mantener el más reciente
            const existing = bookingDocs.get(docType);
            if (!existing || (file.updated_at && (!existing.path || file.updated_at > existing.path))) {
              const { originalName } = parseStoredDocumentName(file.name);
              bookingDocs.set(docType, {
                path: `${docType}/${file.name}`,
                name: originalName,
              });
            }
          });
        } catch (err) {
          console.error(`Error cargando documentos ${docType}:`, err);
        }
      }

      setDocuments(newDocuments);
    } catch (err) {
      console.error('Error cargando documentos:', err);
    }
  }, [supabase]);

  // Upload documento
  const handleUploadDocument = useCallback(async (booking: string, documentType: string, file: File) => {
    if (!booking || !booking.trim()) {
      showError('El booking es requerido para subir documentos');
      return;
    }

    const docTypeId = DOCUMENT_TYPE_MAP[documentType];
    if (!docTypeId) {
      showError('Tipo de documento no válido');
      return;
    }

    try {
      setUploadingDoc({ booking, type: documentType });

      const normalizedBooking = normalizeBooking(booking);
      const bookingSegment = encodeURIComponent(normalizedBooking);
      const safeName = sanitizeFileName(file.name);
      const filePath = `${docTypeId}/${bookingSegment}__${Date.now()}-0-${safeName}`;

      // Eliminar archivos anteriores para este booking y tipo si existe
      const bookingKey = normalizedBooking.replace(/\s+/g, '');
      const bookingDocs = documents.get(bookingKey);
      if (bookingDocs) {
        const existing = bookingDocs.get(docTypeId);
        if (existing?.path) {
          try {
            await supabase.storage.from('documentos').remove([existing.path]);
          } catch (deleteErr) {
            console.warn('Error al eliminar archivo anterior:', deleteErr);
          }
        }
      }

      // Subir nuevo archivo
      const { error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Recargar documentos
      await loadDocuments();
      success('Documento subido correctamente');
    } catch (err: any) {
      console.error('Error subiendo documento:', err);
      showError('No se pudo subir el documento. Intenta nuevamente.');
    } finally {
      setUploadingDoc(null);
    }
  }, [supabase, documents, loadDocuments, success, showError]);

  // Confirmar subida desde modal
  const handleConfirmUpload = useCallback(async () => {
    if (!documentModal.file) return;
    
    await handleUploadDocument(documentModal.booking, documentModal.docType, documentModal.file);
    setDocumentModal({ isOpen: false, booking: '', docType: '', hasDocument: false, mode: 'view', file: null });
  }, [documentModal, handleUploadDocument]);

  // Download documento
  const handleDownloadDocument = useCallback(async (booking: string, documentType: string) => {
    const docTypeId = DOCUMENT_TYPE_MAP[documentType];
    if (!docTypeId) {
      showError('Tipo de documento no válido');
      return;
    }

    const bookingKey = normalizeBooking(booking).replace(/\s+/g, '');
    const bookingDocs = documents.get(bookingKey);
    const docInfo = bookingDocs?.get(docTypeId);

    if (!docInfo) {
      showError('Documento no encontrado');
      return;
    }

    try {
      const { data, error: urlError } = await supabase.storage
        .from('documentos')
        .createSignedUrl(docInfo.path, 60);

      if (urlError || !data?.signedUrl) throw urlError;

      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('Error descargando documento:', err);
      showError('No se pudo descargar el archivo.');
    }
  }, [documents, supabase, showError]);

  // Delete documento
  const handleDeleteDocument = useCallback(async (booking: string, documentType: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este documento?')) {
      return;
    }

    const docTypeId = DOCUMENT_TYPE_MAP[documentType];
    if (!docTypeId) {
      showError('Tipo de documento no válido');
      return;
    }

    const bookingKey = normalizeBooking(booking).replace(/\s+/g, '');
    const bookingDocs = documents.get(bookingKey);
    const docInfo = bookingDocs?.get(docTypeId);

    if (!docInfo) {
      showError('Documento no encontrado');
      return;
    }

    try {
      setDeletingDoc({ booking, type: documentType });

      const { error: deleteError } = await supabase.storage
        .from('documentos')
        .remove([docInfo.path]);

      if (deleteError) throw deleteError;

      // Recargar documentos
      await loadDocuments();
      success('Documento eliminado correctamente');
    } catch (err) {
      console.error('Error eliminando documento:', err);
      showError('No se pudo eliminar el documento.');
    } finally {
      setDeletingDoc(null);
    }
  }, [documents, supabase, loadDocuments, success, showError]);

  const loadRegistros = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('registros')
        .select('id, nave_inicial, booking, contenedor, ref_cliente')
        .is('deleted_at', null)
        .order('ref_asli', { ascending: false });

      if (error) {
        console.error('Error en consulta de registros:', error);
        throw error;
      }

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
      showError('Error al cargar los registros. Por favor, recarga la página.');
      setRegistros([]);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, showError]);

  // Verificar y cargar usuario autenticado
  useEffect(() => {
    let isMounted = true;

    const checkUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();

        if (!isMounted) return;

        // Si hay error de refresh token, limpiar sesión y redirigir
        if (error) {
          if (
            error.message?.includes('Refresh Token') ||
            error.message?.includes('JWT') ||
            error.message?.includes('User from sub claim in JWT does not exist')
          ) {
            await supabase.auth.signOut();
            router.push('/auth');
            return;
          }
          throw error;
        }

        if (!user) {
          router.push('/auth');
          return;
        }

        // SIEMPRE cargar datos frescos desde Supabase (fuente de verdad)
        localStorage.removeItem('currentUser');
        localStorage.removeItem('currentUserTimestamp');

        // Cargar datos del usuario desde la tabla usuarios
        const { data: userData, error: userError } = await supabase
          .from('usuarios')
          .select('*')
          .eq('auth_user_id', user.id)
          .single();

        if (userError) {
          console.error('Error loading user data:', userError);
          router.push('/auth');
          return;
        }

        if (userData && isMounted) {
          const usuarioActualizado = {
            id: userData.id,
            nombre: userData.nombre,
            email: userData.email,
            rol: userData.rol,
            activo: userData.activo,
            puede_subir: userData.puede_subir ?? false,
            clientes_asignados: userData.clientes_asignados ?? [],
          };
          setCurrentUser(usuarioActualizado);
        }
      } catch (error: any) {
        if (!isMounted) return;
        if (!error?.message?.includes('Refresh Token') && !error?.message?.includes('JWT')) {
          console.error('[Documentos] Error comprobando usuario:', error);
        }
        router.push('/auth');
      }
    };

    void checkUser();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Solo ejecutar una vez al montar

  useEffect(() => {
    // Solo cargar datos una vez cuando currentUser esté disponible
    if (currentUser && !dataLoadedRef.current) {
      dataLoadedRef.current = true;
      const fetchData = async () => {
        try {
          await Promise.all([loadRegistros(), loadDocuments()]);
        } catch (err) {
          console.error('Error cargando datos:', err);
          dataLoadedRef.current = false; // Permitir reintentar en caso de error
        }
      };
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]); // Solo depende del ID del usuario, no del objeto completo

  if (!currentUser) {
    return <LoadingScreen message="Cargando..." />;
  }

  // Verificar si es Rodrigo
  const isRodrigo = currentUser?.email?.toLowerCase() === 'rodrigo.caceres@asli.cl';

  // Obtener información de documentos para cada registro
  const getDocumentStatus = (booking: string, docType: string): boolean => {
    const bookingKey = normalizeBooking(booking).replace(/\s+/g, '');
    const bookingDocs = documents.get(bookingKey);
    const docTypeId = DOCUMENT_TYPE_MAP[docType];
    return !!bookingDocs?.get(docTypeId);
  };

  // Obtener información del documento
  const getDocumentInfo = (booking: string, docType: string): DocumentInfo | null => {
    const bookingKey = normalizeBooking(booking).replace(/\s+/g, '');
    const bookingDocs = documents.get(bookingKey);
    const docTypeId = DOCUMENT_TYPE_MAP[docType];
    return bookingDocs?.get(docTypeId) || null;
  };

  // Abrir modal de documento
  const handleOpenDocumentModal = (booking: string, docType: string, hasDocument: boolean) => {
    setDocumentModal({
      isOpen: true,
      booking,
      docType,
      hasDocument,
      mode: hasDocument ? 'view' : 'upload',
      file: null,
    });
  };

  // Renderizar celda de documento interactiva
  const renderDocumentCell = (booking: string, docType: string, hasDocument: boolean) => {
    const cellKey = `${booking}-${docType}`;
    const isUploading = uploadingDoc?.booking === booking && uploadingDoc?.type === docType;
    const isDeleting = deletingDoc?.booking === booking && deletingDoc?.type === docType;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setDocumentModal({
          isOpen: true,
          booking,
          docType,
          hasDocument: false,
          mode: 'upload',
          file,
        });
      }
      // Reset input
      e.target.value = '';
    };

    // Verificar permisos
    const canUpload = canEdit;
    const canDeleteDoc = canDelete;

    // Determinar texto del botón
    let buttonText = 'Pendiente';
    let buttonClass = '';
    
    if (hasDocument) {
      buttonText = 'Ver docs';
      buttonClass = theme === 'dark'
        ? 'text-blue-400 hover:bg-slate-700 hover:text-blue-300'
        : 'text-blue-600 hover:bg-blue-50 hover:text-blue-700';
    } else if (canUpload) {
      buttonText = 'Subir';
      buttonClass = theme === 'dark'
        ? 'text-slate-300 hover:bg-slate-700 hover:text-slate-200'
        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900';
    } else {
      buttonClass = theme === 'dark'
        ? 'text-slate-500 cursor-not-allowed'
        : 'text-gray-400 cursor-not-allowed';
    }

    return (
      <div className="flex items-center justify-center">
        <input
          ref={(el) => {
            if (el) {
              fileInputRefs.current.set(cellKey, el);
            } else {
              fileInputRefs.current.delete(cellKey);
            }
          }}
          type="file"
          accept=".pdf,.xlsx,.xls"
          onChange={handleFileChange}
          className="hidden"
          disabled={isUploading || isDeleting || !canUpload}
        />
        {hasDocument ? (
          <button
            onClick={() => handleOpenDocumentModal(booking, docType, true)}
            disabled={isUploading || isDeleting}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${buttonClass}`}
            aria-label="Ver documento"
          >
            {isUploading ? 'Subiendo...' : isDeleting ? 'Eliminando...' : buttonText}
          </button>
        ) : canUpload ? (
          <button
            onClick={() => fileInputRefs.current.get(cellKey)?.click()}
            disabled={isUploading || isDeleting}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${buttonClass}`}
            aria-label="Subir documento"
          >
            {isUploading ? 'Subiendo...' : buttonText}
          </button>
        ) : (
          <span className={`px-3 py-1.5 text-xs font-medium rounded-lg ${buttonClass}`}>
            {buttonText}
          </span>
        )}
      </div>
    );
  };

  const documentosRows: DocumentoRow[] = registros.map((reg: any) => {
    const booking = reg.booking || '';
    return {
      id: reg.id,
      nave: reg.naveInicial || '',
      booking,
      contenedor: reg.contenedor || '',
      refCliente: reg.refCliente || '',
      reservaPdf: getDocumentStatus(booking, 'reservaPdf'),
      instructivo: getDocumentStatus(booking, 'instructivo'),
      guiaDespacho: getDocumentStatus(booking, 'guiaDespacho'),
      packingList: getDocumentStatus(booking, 'packingList'),
      proformaInvoice: getDocumentStatus(booking, 'proformaInvoice'),
      blSwbTelex: getDocumentStatus(booking, 'blSwbTelex'),
      facturaSii: getDocumentStatus(booking, 'facturaSii'),
      dusLegalizado: getDocumentStatus(booking, 'dusLegalizado'),
      fullset: getDocumentStatus(booking, 'fullset'),
    };
  });

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
                          if (item.id) {
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
            
            {/* Botón de usuario para móvil */}
            <div className={`lg:hidden space-y-2 sm:space-y-3 pt-2 ${theme === 'dark' ? 'border-t border-slate-700/60' : 'border-t border-gray-200'}`}>
              <button
                onClick={() => {
                  setShowProfileModal(true);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full text-left flex items-center gap-2 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 transition-colors ${
                  theme === 'dark'
                    ? 'hover:bg-slate-700 text-slate-300'
                    : 'hover:bg-blue-50 text-blue-600 font-semibold'
                }`}
              >
                <UserIcon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-semibold truncate flex-1 min-w-0">
                  {currentUser?.nombre || currentUser?.email}
                </span>
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Content */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden h-full">
        <header className={`sticky top-0 z-40 border-b overflow-hidden ${theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white shadow-sm'}`}>
          <div className="flex flex-wrap items-center gap-4 pl-4 pr-2 sm:px-6 py-3 sm:py-4">
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

            <div className="flex items-center gap-1.5 sm:gap-3 ml-auto">
              <button
                onClick={() => setShowProfileModal(true)}
                className={`hidden sm:flex items-center gap-2 rounded-full border px-3 py-2 text-xs sm:text-sm ${
                  theme === 'dark'
                    ? 'border-slate-800/70 text-slate-300 hover:border-sky-400/60 hover:text-sky-200'
                    : 'border-gray-300 text-gray-700 hover:border-blue-400 hover:text-blue-600 bg-white shadow-sm'
                }`}
                title={currentUser?.nombre || currentUser?.email}
              >
                <UserIcon className="h-4 w-4" />
                {currentUser?.nombre || currentUser?.email}
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 w-full">
          <div className="mx-auto w-full max-w-[1600px] px-4 pb-10 pt-4 space-y-4 sm:px-6 sm:pt-6 sm:space-y-6 lg:px-8 lg:space-y-6 xl:px-10 xl:space-y-8">
            {/* Pestañas */}
            <div className={`flex gap-2 border-b ${theme === 'dark' ? 'border-slate-700' : 'border-gray-200'}`}>
              <button
                onClick={() => setActiveTab('documentos')}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === 'documentos'
                    ? theme === 'dark'
                      ? 'border-blue-400 text-blue-400'
                      : 'border-blue-600 text-blue-600'
                    : theme === 'dark'
                      ? 'border-transparent text-slate-400 hover:text-slate-300'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Documentos
              </button>
              {isRodrigo && (
                <button
                  onClick={() => setActiveTab('finanzas')}
                  className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                    activeTab === 'finanzas'
                      ? theme === 'dark'
                        ? 'border-blue-400 text-blue-400'
                        : 'border-blue-600 text-blue-600'
                      : theme === 'dark'
                        ? 'border-transparent text-slate-400 hover:text-slate-300'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Finanzas
                </button>
              )}
            </div>

            {/* Contenido según pestaña activa */}
            {activeTab === 'documentos' ? (
              <>
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
                            {renderDocumentCell(row.booking, 'reservaPdf', row.reservaPdf)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            {renderDocumentCell(row.booking, 'instructivo', row.instructivo)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            {renderDocumentCell(row.booking, 'guiaDespacho', row.guiaDespacho)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            {renderDocumentCell(row.booking, 'packingList', row.packingList)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            {renderDocumentCell(row.booking, 'proformaInvoice', row.proformaInvoice)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            {renderDocumentCell(row.booking, 'blSwbTelex', row.blSwbTelex)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            {renderDocumentCell(row.booking, 'facturaSii', row.facturaSii)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            {renderDocumentCell(row.booking, 'dusLegalizado', row.dusLegalizado)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            {renderDocumentCell(row.booking, 'fullset', row.fullset)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
            </>
            ) : isRodrigo ? (
              <FinanzasSection registros={registros} canEdit={canEdit} />
            ) : (
              <div className={`flex items-center justify-center py-12 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                <div className="text-center">
                  <p className="text-lg font-medium mb-2">Acceso Restringido</p>
                  <p className="text-sm">No tienes permisos para acceder a esta sección.</p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modal de perfil de usuario */}
      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        userInfo={currentUser}
        onUserUpdate={(updatedUser) => setCurrentUser(updatedUser)}
      />

      {/* Modal de detalle de documento */}
      {documentModal.isOpen && (() => {
        const docInfo = documentModal.hasDocument ? getDocumentInfo(documentModal.booking, documentModal.docType) : null;
        const isUploading = uploadingDoc?.booking === documentModal.booking && uploadingDoc?.type === documentModal.docType;
        const isDeleting = deletingDoc?.booking === documentModal.booking && deletingDoc?.type === documentModal.docType;
        const canUpload = canEdit;
        const canDeleteDoc = canDelete;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Overlay */}
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setDocumentModal({ isOpen: false, booking: '', docType: '', hasDocument: false, mode: 'view', file: null })}
            />
            
            {/* Modal */}
            <div className={`relative z-10 w-full max-w-2xl rounded-2xl border shadow-2xl ${
              theme === 'dark'
                ? 'border-slate-700 bg-slate-800'
                : 'border-gray-200 bg-white'
            }`}>
              {/* Header */}
              <div className={`flex items-center justify-between border-b px-6 py-4 ${
                theme === 'dark' ? 'border-slate-700' : 'border-gray-200'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    theme === 'dark' ? 'bg-sky-500/20' : 'bg-blue-100'
                  }`}>
                    <FileText className={`h-5 w-5 ${
                      theme === 'dark' ? 'text-sky-400' : 'text-blue-600'
                    }`} />
                  </div>
                  <div>
                    <h2 className={`text-lg font-semibold ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      {documentModal.hasDocument ? 'Detalles del documento' : 'Subir documento'}
                    </h2>
                    <p className={`text-sm ${
                      theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
                    }`}>
                      {documentModal.hasDocument ? 'Información del archivo almacenado' : 'Revisa la información antes de subir'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setDocumentModal({ isOpen: false, booking: '', docType: '', hasDocument: false, mode: 'view', file: null })}
                  className={`rounded-lg p-2 transition-colors ${
                    theme === 'dark'
                      ? 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                      : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                  }`}
                  aria-label="Cerrar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Información del documento */}
                <div className={`rounded-xl border p-4 ${
                  theme === 'dark' ? 'border-slate-700 bg-slate-900/50' : 'border-gray-200 bg-gray-50'
                }`}>
                  <h3 className={`text-sm font-semibold mb-3 ${
                    theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                  }`}>
                    Información del documento
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className={`text-sm ${
                        theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
                      }`}>
                        Booking:
                      </span>
                      <span className={`text-sm font-medium ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        {documentModal.booking}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`text-sm ${
                        theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
                      }`}>
                        Tipo de documento:
                      </span>
                      <span className={`text-sm font-medium ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        {documentModal.docType.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Información del archivo - si existe o si se va a subir */}
                {documentModal.hasDocument && docInfo ? (
                  <div className={`rounded-xl border p-4 ${
                    theme === 'dark' ? 'border-slate-700 bg-slate-900/50' : 'border-gray-200 bg-gray-50'
                  }`}>
                    <div className="flex items-start gap-4">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-lg flex-shrink-0 ${
                        theme === 'dark' ? 'bg-slate-700' : 'bg-white'
                      }`}>
                        <File className={`h-6 w-6 ${
                          theme === 'dark' ? 'text-sky-400' : 'text-blue-600'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0 space-y-3">
                        <div>
                          <p className={`text-xs uppercase tracking-wider mb-1 ${
                            theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
                          }`}>
                            Nombre del archivo
                          </p>
                          <p className={`font-medium ${
                            theme === 'dark' ? 'text-white' : 'text-gray-900'
                          }`}>
                            {docInfo.name}
                          </p>
                        </div>
                        <div>
                          <p className={`text-xs uppercase tracking-wider mb-1 ${
                            theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
                          }`}>
                            Ruta
                          </p>
                          <p className={`text-sm font-mono ${
                            theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                          }`}>
                            {docInfo.path}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : documentModal.file ? (
                  <div className={`rounded-xl border p-4 ${
                    theme === 'dark' ? 'border-slate-700 bg-slate-900/50' : 'border-gray-200 bg-gray-50'
                  }`}>
                    <div className="flex items-start gap-4">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-lg flex-shrink-0 ${
                        theme === 'dark' ? 'bg-slate-700' : 'bg-white'
                      }`}>
                        <File className={`h-6 w-6 ${
                          theme === 'dark' ? 'text-sky-400' : 'text-blue-600'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0 space-y-3">
                        <div>
                          <p className={`text-xs uppercase tracking-wider mb-1 ${
                            theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
                          }`}>
                            Nombre del archivo
                          </p>
                          <p className={`font-medium truncate ${
                            theme === 'dark' ? 'text-white' : 'text-gray-900'
                          }`}>
                            {documentModal.file.name}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className={`text-xs uppercase tracking-wider mb-1 ${
                              theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
                            }`}>
                              Tamaño
                            </p>
                            <div className="flex items-center gap-2">
                              <HardDrive className={`h-4 w-4 ${
                                theme === 'dark' ? 'text-slate-400' : 'text-gray-400'
                              }`} />
                              <p className={`text-sm ${
                                theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                              }`}>
                                {(documentModal.file.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          </div>
                          <div>
                            <p className={`text-xs uppercase tracking-wider mb-1 ${
                              theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
                            }`}>
                              Tipo
                            </p>
                            <p className={`text-sm ${
                              theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                            }`}>
                              {documentModal.file.type || documentModal.file.name.split('.').pop()?.toUpperCase() || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Footer */}
              <div className={`flex items-center justify-between border-t px-6 py-4 ${
                theme === 'dark' ? 'border-slate-700' : 'border-gray-200'
              }`}>
                <div>
                  {documentModal.hasDocument && canDeleteDoc && (
                    <button
                      onClick={() => {
                        handleDeleteDocument(documentModal.booking, documentModal.docType);
                        setDocumentModal({ isOpen: false, booking: '', docType: '', hasDocument: false, mode: 'view', file: null });
                      }}
                      disabled={isDeleting || isUploading}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        theme === 'dark'
                          ? 'text-red-400 hover:bg-slate-700 hover:text-red-300'
                          : 'text-red-600 hover:bg-red-50 hover:text-red-700'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isDeleting ? 'Eliminando...' : 'Eliminar'}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setDocumentModal({ isOpen: false, booking: '', docType: '', hasDocument: false, mode: 'view', file: null })}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      theme === 'dark'
                        ? 'text-slate-300 hover:bg-slate-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {documentModal.hasDocument ? 'Cerrar' : 'Cancelar'}
                  </button>
                  {documentModal.hasDocument ? (
                    <button
                      onClick={() => handleDownloadDocument(documentModal.booking, documentModal.docType)}
                      disabled={isUploading || isDeleting}
                      className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Descargar
                    </button>
                  ) : canUpload && documentModal.file ? (
                    <button
                      onClick={handleConfirmUpload}
                      disabled={isUploading}
                      className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isUploading ? 'Subiendo...' : 'Confirmar y subir'}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
