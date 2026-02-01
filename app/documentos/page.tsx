'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { FileText, FileCheck, ChevronRight, ChevronLeft, X, User as UserIcon, LayoutDashboard, Ship, Truck, Settings, Download, Upload, Trash2, File, Calendar, HardDrive, Filter, X as XIcon, Globe, BarChart3, DollarSign, Users, Activity } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { UserProfileModal } from '@/components/users/UserProfileModal';
import { PageWrapper } from '@/components/PageWrapper';
import { useUser } from '@/hooks/useUser';
import { createClient } from '@/lib/supabase-browser';
import { Registro } from '@/types/registros';
import { normalizeBooking, sanitizeFileName, parseStoredDocumentName } from '@/utils/documentUtils';
import { useToast } from '@/hooks/useToast';
import { Sidebar } from '@/components/layout/Sidebar';
import { SidebarSection } from '@/types/layout';
import { DocumentosFiltersPanel } from '@/components/ui/table/DocumentosFiltersPanel';

const normalizeSeasonLabel = (value?: string | null): string => {
  if (!value) {
    return '';
  }
  return value.toString().replace(/^Temporada\s+/i, '').trim();
};

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
  size?: number;
  type?: string;
  modified_at?: string;
}

type DocumentMap = Map<string, Map<string, DocumentInfo>>; // Map<booking, Map<documentType, DocumentInfo>>

function DocumentosPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { theme } = useTheme();
  const { currentUser, setCurrentUser, canEdit, canDelete } = useUser();
  const supabase = useMemo(() => createClient(), []);

  // Estados de ordenamiento
  const [sortField, setSortField] = useState<'refCliente' | 'fechaIngreso' | 'nave' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

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
  const [showFilters, setShowFilters] = useState(false);
  const [allRegistros, setAllRegistros] = useState<Registro[]>([]);
  // Estados de filtros
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);
  const [selectedClientes, setSelectedClientes] = useState<string[]>([]);
  const [selectedEjecutivo, setSelectedEjecutivo] = useState<string | null>(null);
  const [selectedEstado, setSelectedEstado] = useState<string | null>(null);
  const [selectedNaviera, setSelectedNaviera] = useState<string | null>(null);
  const [selectedNave, setSelectedNave] = useState<string | null>(null);
  const [selectedEspecie, setSelectedEspecie] = useState<string | null>(null);
  const [fechaDesde, setFechaDesde] = useState<string>('');
  const [fechaHasta, setFechaHasta] = useState<string>('');
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
        .select('*')
        .is('deleted_at', null)
        .not('ref_asli', 'is', null)
        .order('ref_asli', { ascending: false });

      if (error) {
        console.error('Error en consulta de registros:', error);
        throw error;
      }

      const { convertSupabaseToApp } = await import('@/lib/migration-utils');
      const registrosList = (data || []).map((registro: any) => convertSupabaseToApp(registro));

      // Filtrar localmente para excluir cancelados (más seguro)
      const registrosActivos = registrosList.filter(registro => registro.estado !== 'CANCELADO');

      setAllRegistros(registrosActivos);
      setRegistros(registrosActivos);
    } catch (err: any) {
      console.error('Error cargando registros:', err);
      showError('Error al cargar los registros. Por favor, recarga la página.');
      setRegistros([]);
      setAllRegistros([]);
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

  // Generar opciones para los filtros basadas en los filtros ya seleccionados (filtrado en cascada)
  // IMPORTANTE: Los hooks deben estar antes de cualquier return condicional
  const filterOptions = useMemo(() => {
    if (!allRegistros || allRegistros.length === 0) {
      return {
        clientes: [],
        ejecutivos: [],
        navieras: [],
        especies: [],
        temporadas: [],
        naves: [],
      };
    }

    let registrosFiltrados = [...allRegistros];

    // Aplicar filtros existentes para generar opciones relevantes
    if (selectedSeason) {
      registrosFiltrados = registrosFiltrados.filter((r) => {
        const season = normalizeSeasonLabel(r.temporada);
        return season === selectedSeason;
      });
    }

    if (selectedClientes.length > 0) {
      registrosFiltrados = registrosFiltrados.filter((r) => {
        const cliente = (r.shipper || '').trim().toUpperCase();
        return selectedClientes.some(selected => selected.toUpperCase() === cliente);
      });
    }

    if (selectedEjecutivo) {
      registrosFiltrados = registrosFiltrados.filter((r) => {
        const ejecutivo = (r.ejecutivo || '').trim().toUpperCase();
        return ejecutivo === selectedEjecutivo.toUpperCase();
      });
    }

    if (selectedEstado) {
      registrosFiltrados = registrosFiltrados.filter((r) => r.estado === selectedEstado);
    }

    if (selectedNaviera) {
      registrosFiltrados = registrosFiltrados.filter((r) => {
        const naviera = (r.naviera || '').trim().toUpperCase();
        return naviera === selectedNaviera.toUpperCase();
      });
    }

    if (selectedEspecie) {
      registrosFiltrados = registrosFiltrados.filter((r) => {
        const especie = (r.especie || '').trim().toUpperCase();
        return especie === selectedEspecie.toUpperCase();
      });
    }

    if (selectedNave) {
      registrosFiltrados = registrosFiltrados.filter((r) => {
        const nave = (r.naveInicial || '').trim().toUpperCase();
        return nave === selectedNave.toUpperCase();
      });
    }

    if (fechaDesde) {
      const desde = new Date(fechaDesde);
      registrosFiltrados = registrosFiltrados.filter((r) => {
        if (!r.etd) return false;
        const etd = r.etd instanceof Date ? r.etd : new Date(r.etd);
        return etd >= desde;
      });
    }

    if (fechaHasta) {
      const hasta = new Date(fechaHasta);
      hasta.setHours(23, 59, 59, 999);
      registrosFiltrados = registrosFiltrados.filter((r) => {
        if (!r.etd) return false;
        const etd = r.etd instanceof Date ? r.etd : new Date(r.etd);
        return etd <= hasta;
      });
    }

    // Generar opciones desde los registros filtrados
    const clientes = new Set<string>();
    const ejecutivos = new Set<string>();
    const navieras = new Set<string>();
    const especies = new Set<string>();
    const temporadas = new Set<string>();
    const naves = new Set<string>();

    registrosFiltrados.forEach((r) => {
      if (r.shipper) clientes.add(r.shipper.trim());
      if (r.ejecutivo) ejecutivos.add(r.ejecutivo.trim());
      if (r.naviera) navieras.add(r.naviera.trim());
      if (r.especie) especies.add(r.especie.trim());
      if (r.naveInicial) naves.add(r.naveInicial.trim());
      if (r.temporada) {
        const season = normalizeSeasonLabel(r.temporada);
        if (season) temporadas.add(season);
      }
    });

    return {
      clientes: Array.from(clientes).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' })),
      ejecutivos: Array.from(ejecutivos).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' })),
      navieras: Array.from(navieras).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' })),
      especies: Array.from(especies).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' })),
      temporadas: Array.from(temporadas).sort().reverse(),
      naves: Array.from(naves).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' })),
    };
  }, [allRegistros, selectedSeason, selectedClientes, selectedEjecutivo, selectedEstado, selectedNaviera, selectedEspecie, selectedNave, fechaDesde, fechaHasta]);

  // Aplicar filtros a los registros
  const filteredRegistros = useMemo(() => {
    if (!allRegistros || allRegistros.length === 0) {
      return [];
    }

    let filtered = [...allRegistros];

    if (selectedSeason) {
      filtered = filtered.filter((r) => {
        const season = normalizeSeasonLabel(r.temporada);
        return season === selectedSeason;
      });
    }

    if (selectedClientes.length > 0) {
      filtered = filtered.filter((r) => {
        const cliente = (r.shipper || '').trim().toUpperCase();
        return selectedClientes.some(selected => selected.toUpperCase() === cliente);
      });
    }

    if (selectedEjecutivo) {
      filtered = filtered.filter((r) => {
        const ejecutivo = (r.ejecutivo || '').trim().toUpperCase();
        return ejecutivo === selectedEjecutivo.toUpperCase();
      });
    }

    if (selectedEstado) {
      filtered = filtered.filter((r) => r.estado === selectedEstado);
    }

    if (selectedNaviera) {
      filtered = filtered.filter((r) => {
        const naviera = (r.naviera || '').trim().toUpperCase();
        return naviera === selectedNaviera.toUpperCase();
      });
    }

    if (selectedEspecie) {
      filtered = filtered.filter((r) => {
        const especie = (r.especie || '').trim().toUpperCase();
        return especie === selectedEspecie.toUpperCase();
      });
    }

    if (selectedNave) {
      filtered = filtered.filter((r) => {
        const nave = (r.naveInicial || '').trim().toUpperCase();
        return nave === selectedNave.toUpperCase();
      });
    }

    if (fechaDesde) {
      const desde = new Date(fechaDesde);
      filtered = filtered.filter((r) => {
        if (!r.etd) return false;
        const etd = r.etd instanceof Date ? r.etd : new Date(r.etd);
        return etd >= desde;
      });
    }

    if (fechaHasta) {
      const hasta = new Date(fechaHasta);
      hasta.setHours(23, 59, 59, 999);
      filtered = filtered.filter((r) => {
        if (!r.etd) return false;
        const etd = r.etd instanceof Date ? r.etd : new Date(r.etd);
        return etd <= hasta;
      });
    }

    return filtered;
  }, [allRegistros, selectedSeason, selectedClientes, selectedEjecutivo, selectedEstado, selectedNaviera, selectedEspecie, selectedNave, fechaDesde, fechaHasta]);

  // Obtener información de documentos para cada registro
  const getDocumentStatus = (booking: string, docType: string): boolean => {
    const bookingKey = normalizeBooking(booking).replace(/\s+/g, '');
    const bookingDocs = documents.get(bookingKey);
    const docTypeId = DOCUMENT_TYPE_MAP[docType];
    return !!bookingDocs?.get(docTypeId);
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

  // Aplicar ordenamiento a los documentosRows
  const sortedDocumentosRows = useMemo(() => {
    if (!sortField) return documentosRows;

    return [...documentosRows].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'refCliente':
          aValue = a.refCliente || '';
          bValue = b.refCliente || '';
          break;
        case 'fechaIngreso':
          // Obtener la fecha de ingreso del registro original
          const regA = registros.find(r => r.id === a.id);
          const regB = registros.find(r => r.id === b.id);
          aValue = regA?.ingresado ? new Date(regA.ingresado).getTime() : 0;
          bValue = regB?.ingresado ? new Date(regB.ingresado).getTime() : 0;
          break;
        case 'nave':
          aValue = a.nave || '';
          bValue = b.nave || '';
          break;
        default:
          return 0;
      }

      // Manejar ordenamiento para strings y números
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue, 'es', { sensitivity: 'base' })
          : bValue.localeCompare(aValue, 'es', { sensitivity: 'base' });
      } else {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
    });
  }, [documentosRows, sortField, sortDirection, registros]);

  // Función para manejar el ordenamiento
  const handleSort = (field: 'refCliente' | 'fechaIngreso' | 'nave') => {
    if (sortField === field) {
      // Si ya está ordenado por este campo, cambiar dirección
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Si es un nuevo campo, establecerlo y ordenar ascendente
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Actualizar registros cuando cambian los filtros
  useEffect(() => {
    setRegistros(filteredRegistros);
  }, [filteredRegistros]);

  const handleClearFilters = () => {
    setSelectedSeason(null);
    setSelectedClientes([]);
    setSelectedEjecutivo(null);
    setSelectedEstado(null);
    setSelectedNaviera(null);
    setSelectedEspecie(null);
    setSelectedNave(null);
    setFechaDesde('');
    setFechaHasta('');
  };

  const handleToggleCliente = (cliente: string) => {
    setSelectedClientes((prev) => {
      const clienteNormalizado = cliente.trim();
      const clienteUpper = clienteNormalizado.toUpperCase();
      const exists = prev.some(c => c.trim().toUpperCase() === clienteUpper);

      if (exists) {
        return prev.filter(c => c.trim().toUpperCase() !== clienteUpper);
      } else {
        return [...prev, clienteNormalizado];
      }
    });
  };

  const handleSelectAllClientes = () => {
    if (!filterOptions || !filterOptions.clientes || filterOptions.clientes.length === 0) {
      return;
    }
    if (selectedClientes.length === filterOptions.clientes.length) {
      setSelectedClientes([]);
    } else {
      setSelectedClientes([...filterOptions.clientes]);
    }
  };

  const hasActiveFilters = Boolean(selectedSeason || selectedClientes.length > 0 || selectedEjecutivo || selectedEstado || selectedNaviera || selectedEspecie || selectedNave || fechaDesde || fechaHasta);

  // IMPORTANTE: El return condicional debe estar DESPUÉS de todos los hooks
  if (!currentUser) {
    return null; // El PageWrapper manejará el loading
  }

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
            className={`px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${buttonClass}`}
            aria-label="Ver documento"
          >
            {isUploading ? 'Subiendo...' : isDeleting ? 'Eliminando...' : buttonText}
          </button>
        ) : canUpload ? (
          <button
            onClick={() => fileInputRefs.current.get(cellKey)?.click()}
            disabled={isUploading || isDeleting}
            className={`px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${buttonClass}`}
            aria-label="Subir documento"
          >
            {isUploading ? 'Subiendo...' : buttonText}
          </button>
        ) : (
          <span className={`px-3 py-1.5 text-xs font-medium ${buttonClass}`}>
            {buttonText}
          </span>
        )}
      </div>
    );
  };

  const isRodrigo = currentUser?.email?.toLowerCase() === 'rodrigo.caceres@asli.cl';

  const sidebarSections: SidebarSection[] = [
    {
      title: 'Inicio',
      items: [
        { label: 'Dashboard', id: '/dashboard', icon: LayoutDashboard },
      ],
    },
    {
      title: 'Módulos',
      items: [
        { label: 'Embarques', id: '/registros', isActive: pathname === '/registros', icon: Ship },
        { label: 'Transportes', id: '/transportes', isActive: pathname === '/transportes', icon: Truck },
        { label: 'Documentos', id: '/documentos', isActive: pathname === '/documentos', icon: FileText },
        ...(currentUser && currentUser.rol !== 'cliente'
          ? [{ label: 'Generar Documentos', id: '/generar-documentos', isActive: pathname === '/generar-documentos', icon: FileCheck }]
          : []),
        { label: 'Seguimiento Marítimo', id: '/dashboard/seguimiento', isActive: pathname === '/dashboard/seguimiento', icon: Globe },
        { label: 'Tracking Movs', id: '/dashboard/tracking', icon: Activity },
        ...(isRodrigo
          ? [
            { label: 'Finanzas', id: '/finanzas', isActive: pathname === '/finanzas', icon: DollarSign },
            { label: 'Reportes', id: '/reportes', isActive: pathname === '/reportes', icon: BarChart3 },
          ]
          : []),
      ],
    },
    ...(isRodrigo
      ? [
        {
          title: 'Mantenimiento',
          items: [
            { label: 'Usuarios', id: '/mantenimiento', isActive: pathname === '/mantenimiento', icon: Users },
          ],
        },
      ]
      : []),
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

      <Sidebar
        isSidebarCollapsed={isSidebarCollapsed}
        setIsSidebarCollapsed={setIsSidebarCollapsed}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        sections={sidebarSections}
        currentUser={currentUser}
        user={currentUser}
        setShowProfileModal={setShowProfileModal}
      />

      {/* Content */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden h-full">
        <header className={`sticky top-0 z-40 border-b overflow-hidden ${theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <div className="flex flex-wrap items-center gap-2 pl-2 pr-2 sm:px-3 sm:py-2 py-2">
            {/* Botón hamburguesa para móvil */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className={`lg:hidden flex h-9 w-9 items-center justify-center border transition-colors flex-shrink-0 ${theme === 'dark'
                ? 'text-slate-300 hover:bg-slate-700 border-slate-700/60'
                : 'text-gray-600 hover:bg-gray-100 border-gray-300'
                }`}
              aria-label="Abrir menú"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            {/* Botón para expandir sidebar colapsado en desktop */}
            {isSidebarCollapsed && (
              <button
                onClick={toggleSidebar}
                className={`hidden lg:flex h-9 w-9 items-center justify-center border transition-colors flex-shrink-0 ${theme === 'dark'
                  ? 'text-slate-300 hover:bg-slate-700 border-slate-700/60'
                  : 'text-gray-600 hover:bg-gray-100 border-gray-300'
                  }`}
                aria-label="Expandir menú lateral"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            )}

            <div className="flex items-center gap-3 sm:gap-4">
              <div className={`hidden sm:flex h-10 w-10 items-center justify-center border ${theme === 'dark' ? 'bg-sky-500/15 border-sky-500/20' : 'bg-blue-100 border-blue-200'}`}>
                <FileText className={`h-6 w-6 ${theme === 'dark' ? 'text-sky-300' : 'text-blue-600'}`} />
              </div>
              <div>
                <p className={`text-[10px] sm:text-[11px] uppercase tracking-[0.2em] sm:tracking-[0.3em] ${theme === 'dark' ? 'text-slate-500/80' : 'text-gray-500'}`}>Módulo Operativo</p>
                <h1 className={`text-lg sm:text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Documentos</h1>
                <p className={`text-[11px] sm:text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>Gestión de documentos y facturas</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-3 ml-auto">
              <button
                onClick={() => setShowFilters(prev => !prev)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-colors border ${showFilters
                  ? theme === 'dark'
                    ? 'bg-sky-600 text-white border-sky-500'
                    : 'bg-blue-600 text-white border-blue-500'
                  : hasActiveFilters
                    ? theme === 'dark'
                      ? 'bg-blue-600 text-white border-blue-500'
                      : 'bg-blue-600 text-white border-blue-500'
                    : theme === 'dark'
                      ? 'border-slate-700/60 text-slate-300 hover:border-sky-500 hover:text-sky-200 bg-slate-800/60'
                      : 'border-gray-300 text-gray-700 hover:border-blue-400 hover:text-blue-600 bg-white'
                  }`}
                type="button"
                aria-label="Mostrar/Ocultar filtros"
                aria-expanded={showFilters}
              >
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Filtros</span>
                {hasActiveFilters && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${theme === 'dark' ? 'bg-white/20' : 'bg-white/30'
                    }`}>
                    {[
                      selectedSeason,
                      selectedClientes.length > 0,
                      selectedEjecutivo,
                      selectedEstado,
                      selectedNaviera,
                      selectedEspecie,
                      selectedNave,
                      fechaDesde,
                      fechaHasta,
                    ].filter(Boolean).length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setShowProfileModal(true)}
                className={`hidden sm:flex items-center gap-2 border px-3 py-2 text-xs sm:text-sm ${theme === 'dark'
                  ? 'border-slate-700/60 text-slate-300 hover:border-sky-400/60 hover:text-sky-200 bg-slate-800/60'
                  : 'border-gray-300 text-gray-700 hover:border-blue-400 hover:text-blue-600 bg-white'
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
          <div className="mx-auto w-full max-w-full px-2 pt-2 sm:px-3 sm:pt-3 space-y-2">
            {/* Sidebar de Filtros */}
            <DocumentosFiltersPanel
              showFilters={showFilters}
              setShowFilters={setShowFilters}
              hasActiveFilters={hasActiveFilters}
              handleClearFilters={handleClearFilters}
              selectedSeason={selectedSeason}
              setSelectedSeason={setSelectedSeason}
              selectedClientes={selectedClientes}
              setSelectedClientes={setSelectedClientes}
              selectedEjecutivo={selectedEjecutivo}
              setSelectedEjecutivo={setSelectedEjecutivo}
              selectedEstado={selectedEstado}
              setSelectedEstado={setSelectedEstado}
              selectedNaviera={selectedNaviera}
              setSelectedNaviera={setSelectedNaviera}
              selectedEspecie={selectedEspecie}
              setSelectedEspecie={setSelectedEspecie}
              selectedNave={selectedNave}
              setSelectedNave={setSelectedNave}
              fechaDesde={fechaDesde}
              setFechaDesde={setFechaDesde}
              fechaHasta={fechaHasta}
              setFechaHasta={setFechaHasta}
              filterOptions={filterOptions}
              handleToggleCliente={handleToggleCliente}
              handleSelectAllClientes={handleSelectAllClientes}
            />

            {/* Tabla de Documentos */}
            <section className={`flex-1 flex flex-col border overflow-hidden min-h-0 ${theme === 'dark'
              ? 'border-slate-700/60 bg-slate-800/60'
              : 'border-gray-200 bg-white'
              }`}>
              <div className="flex-1 overflow-x-auto overflow-y-auto min-h-0">
                <table className={`min-w-full divide-y ${theme === 'dark' ? 'divide-slate-800/60' : 'divide-gray-200'
                  }`}>
                  <thead className={`sticky top-0 z-20 ${theme === 'dark'
                    ? 'bg-slate-900 border-b border-slate-800/60'
                    : 'bg-white border-b border-gray-200'
                    }`}>
                    <tr>
                      <th
                        className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-opacity-80 transition-colors ${theme === 'dark' ? 'text-slate-200 hover:bg-slate-800' : 'text-gray-800 hover:bg-gray-100'
                          }`}
                        onClick={() => handleSort('nave')}
                      >
                        <div className="flex items-center gap-2">
                          Nave | Booking | Contenedor
                          {sortField === 'nave' && (
                            <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                              {sortDirection === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th
                        className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-opacity-80 transition-colors ${theme === 'dark' ? 'text-slate-200 hover:bg-slate-800' : 'text-gray-800 hover:bg-gray-100'
                          }`}
                        onClick={() => handleSort('refCliente')}
                      >
                        <div className="flex items-center gap-2">
                          Ref Cliente
                          {sortField === 'refCliente' && (
                            <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                              {sortDirection === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th
                        className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-opacity-80 transition-colors ${theme === 'dark' ? 'text-slate-200 hover:bg-slate-800' : 'text-gray-800 hover:bg-gray-100'
                          }`}
                        onClick={() => handleSort('fechaIngreso')}
                      >
                        <div className="flex items-center gap-2">
                          Fecha Ingreso
                          {sortField === 'fechaIngreso' && (
                            <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                              {sortDirection === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th className={`px-4 py-3 text-center text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-200' : 'text-gray-800'
                        }`}>
                        Reserva PDF
                      </th>
                      <th className={`px-4 py-3 text-center text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-200' : 'text-gray-800'
                        }`}>
                        Instructivo
                      </th>
                      <th className={`px-4 py-3 text-center text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-200' : 'text-gray-800'
                        }`}>
                        Guía de Despacho
                      </th>
                      <th className={`px-4 py-3 text-center text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-200' : 'text-gray-800'
                        }`}>
                        Packing List
                      </th>
                      <th className={`px-4 py-3 text-center text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-200' : 'text-gray-800'
                        }`}>
                        Proforma Invoice
                      </th>
                      <th className={`px-4 py-3 text-center text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-200' : 'text-gray-800'
                        }`}>
                        BL-SWB-TELEX
                      </th>
                      <th className={`px-4 py-3 text-center text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-200' : 'text-gray-800'
                        }`}>
                        Factura SII
                      </th>
                      <th className={`px-4 py-3 text-center text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-200' : 'text-gray-800'
                        }`}>
                        DUS Legalizado
                      </th>
                      <th className={`px-4 py-3 text-center text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-200' : 'text-gray-800'
                        }`}>
                        Fullset
                      </th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${theme === 'dark' ? 'divide-slate-800/60 bg-slate-900/50' : 'divide-gray-200 bg-white'
                    }`}>
                    {isLoading ? (
                      <tr>
                        <td colSpan={12} className={`px-4 py-8 text-center text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
                          }`}>
                          Cargando documentos...
                        </td>
                      </tr>
                    ) : sortedDocumentosRows.length === 0 ? (
                      <tr>
                        <td colSpan={12} className={`px-4 py-8 text-center text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
                          }`}>
                          No hay documentos disponibles
                        </td>
                      </tr>
                    ) : (
                      sortedDocumentosRows.map((row) => (
                        <tr key={row.id} className={`hover:${theme === 'dark' ? 'bg-slate-800/50' : 'bg-gray-50'
                          } transition-colors`}>
                          <td className={`px-4 py-3 whitespace-nowrap ${theme === 'dark' ? 'text-slate-300' : 'text-gray-900'
                            }`}>
                            <div className="flex flex-col space-y-0.5">
                              <span className="font-medium">{row.nave}</span>
                              <span className="text-xs opacity-75">{row.booking}</span>
                              <span className="text-xs opacity-75">{row.contenedor}</span>
                            </div>
                          </td>
                          <td className={`px-4 py-3 whitespace-nowrap ${theme === 'dark' ? 'text-slate-300' : 'text-gray-900'
                            }`}>
                            {row.refCliente || '—'}
                          </td>
                          <td className={`px-4 py-3 whitespace-nowrap ${theme === 'dark' ? 'text-slate-300' : 'text-gray-900'
                            }`}>
                            {(() => {
                              const registro = registros.find(r => r.id === row.id);
                              return registro?.ingresado
                                ? new Date(registro.ingresado).toLocaleDateString('es-CL')
                                : '—';
                            })()}
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
              className="absolute inset-0 bg-black/50"
              onClick={() => setDocumentModal({ isOpen: false, booking: '', docType: '', hasDocument: false, mode: 'view', file: null })}
            />

            {/* Modal más grande */}
            <div className={`relative z-10 w-full max-w-6xl max-h-[90vh] border overflow-hidden ${theme === 'dark'
              ? 'border-slate-700 bg-slate-800'
              : 'border-gray-200 bg-white'
              }`}>
              {/* Header */}
              <div className={`flex items-center justify-between border-b px-6 py-4 ${theme === 'dark' ? 'border-slate-700' : 'border-gray-200'
                }`}>
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center border ${theme === 'dark' ? 'bg-sky-500/20 border-sky-500/20' : 'bg-blue-100 border-blue-200'
                    }`}>
                    <FileText className={`h-5 w-5 ${theme === 'dark' ? 'text-sky-400' : 'text-blue-600'
                      }`} />
                  </div>
                  <div>
                    <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                      {documentModal.hasDocument ? 'Vista previa del documento' : 'Subir documento'}
                    </h2>
                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
                      }`}>
                      {documentModal.hasDocument ? 'Visualización del archivo PDF' : 'Revisa la información antes de subir'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setDocumentModal({ isOpen: false, booking: '', docType: '', hasDocument: false, mode: 'view', file: null })}
                  className={`p-2 transition-colors border ${theme === 'dark'
                    ? 'text-slate-400 hover:bg-slate-700 hover:text-slate-200 border-slate-700/60'
                    : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600 border-gray-300'
                    }`}
                  aria-label="Cerrar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Contenido principal */}
              <div className="flex flex-col lg:flex-row h-[calc(90vh-8rem)]">
                {/* Panel lateral con información */}
                <div className={`w-full lg:w-80 border-b lg:border-b-0 lg:border-r ${theme === 'dark' ? 'border-slate-700' : 'border-gray-200'} p-6`}>
                  {/* Información del documento */}
                  <div className="space-y-4">
                    <div>
                      <p className={`text-xs font-medium uppercase tracking-wide ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
                        }`}>
                        Booking
                      </p>
                      <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>
                        {documentModal.booking}
                      </p>
                    </div>
                    <div>
                      <p className={`text-xs font-medium uppercase tracking-wide ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
                        }`}>
                        Tipo
                      </p>
                      <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>
                        {documentModal.docType.replace(/([A-Z])/g, ' $1').trim()}
                      </p>
                    </div>

                    {/* Información del archivo */}
                    {documentModal.hasDocument && docInfo ? (
                      <div className={`border p-4 ${theme === 'dark' ? 'border-slate-700 bg-slate-900/50' : 'border-gray-200 bg-gray-50'
                        }`}>
                        <div className="flex items-start gap-4">
                          <div className={`flex h-12 w-12 items-center justify-center border ${theme === 'dark' ? 'bg-sky-500/20 border-sky-500/20' : 'bg-blue-100 border-blue-200'
                            }`}>
                            <FileText className={`h-6 w-6 ${theme === 'dark' ? 'text-sky-400' : 'text-blue-600'
                              }`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                              }`}>
                              {docInfo.name}
                            </p>
                            <div className="grid grid-cols-2 gap-4 mt-2">
                              <div>
                                <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
                                  }`}>
                                  Tamaño
                                </p>
                                <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                                  }`}>
                                  {((docInfo.size || 0) / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                              <div>
                                <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
                                  }`}>
                                  Tipo
                                </p>
                                <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                                  }`}>
                                  {docInfo.type}
                                </p>
                              </div>
                            </div>
                            <div className="mt-2">
                              <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
                                }`}>
                                Modificado
                              </p>
                              <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                                }`}>
                                {new Date(docInfo.modified_at || Date.now()).toLocaleString('es-CL')}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : documentModal.file ? (
                      <div className={`border p-4 ${theme === 'dark' ? 'border-slate-700 bg-slate-900/50' : 'border-gray-200 bg-gray-50'
                        }`}>
                        <div className="flex items-start gap-4">
                          <div className={`flex h-12 w-12 items-center justify-center border ${theme === 'dark' ? 'bg-sky-500/20 border-sky-500/20' : 'bg-blue-100 border-blue-200'
                            }`}>
                            <FileText className={`h-6 w-6 ${theme === 'dark' ? 'text-sky-400' : 'text-blue-600'
                              }`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
                              }`}>
                              Archivo a subir
                            </p>
                            <p className={`font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                              }`}>
                              {documentModal.file.name}
                            </p>
                            <div className="grid grid-cols-2 gap-4 mt-2">
                              <div>
                                <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
                                  }`}>
                                  Tamaño
                                </p>
                                <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                                  }`}>
                                  {(documentModal.file.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                              <div>
                                <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
                                  }`}>
                                  Tipo
                                </p>
                                <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
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
                </div>

                {/* Área de vista previa del PDF */}
                <div className="flex-1 p-6 overflow-hidden">
                  {documentModal.hasDocument && docInfo ? (
                    <div className="w-full h-full flex flex-col">
                      <div className="mb-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-sm">
                        <p><strong>Debug:</strong> Cargando {docInfo.type || 'documento'} desde: {docInfo.path}</p>
                      </div>
                      <div className="flex-1 bg-gray-100 dark:bg-slate-900 overflow-hidden">
                        {(() => {
                          const isPDF = docInfo.name?.toLowerCase().endsWith('.pdf');
                          const isExcel = docInfo.name?.toLowerCase().match(/\.(xlsx|xls)$/);

                          if (isPDF) {
                            // Vista previa de PDF
                            return (
                              <iframe
                                src={`/api/bookings/signed-url?documentPath=${encodeURIComponent(docInfo.path)}`}
                                className="w-full h-full border-0"
                                title={`Vista previa de ${docInfo.name}`}
                                onLoad={() => console.log('✅ PDF cargado exitosamente')}
                                onError={(e) => {
                                  console.error('❌ Error al cargar PDF:', e);
                                  console.error('📄 Path del documento:', docInfo.path);
                                }}
                              />
                            );
                          } else if (isExcel) {
                            // Para Excel, mostrar vista previa con SheetJS (renderizado nativo en el navegador)
                            return (
                              <div className="w-full h-full flex flex-col">
                                <div className="mb-2 p-2 bg-green-50 dark:bg-green-900/20 rounded text-sm">
                                  <p><strong>Excel:</strong> Cargando vista previa...</p>
                                </div>
                                <div className="flex-1 bg-white overflow-hidden">
                                  <iframe
                                    src={`/api/bookings/excel-preview?documentPath=${encodeURIComponent(docInfo.path)}`}
                                    className="w-full h-full border-0"
                                    title={`Vista previa de ${docInfo.name}`}
                                    onLoad={() => console.log('✅ Excel preview con SheetJS cargado')}
                                    onError={(e) => {
                                      console.error('❌ Error al cargar Excel preview:', e);
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          } else {
                            // Para otros archivos, mostrar mensaje
                            return (
                              <div className="w-full h-full flex items-center justify-center">
                                <div className="text-center p-6">
                                  <div className={`flex h-16 w-16 items-center justify-center border mx-auto mb-4 ${theme === 'dark' ? 'bg-slate-700 border-slate-600' : 'bg-gray-100 border-gray-300'
                                    }`}>
                                    <FileText className={`h-8 w-8 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
                                      }`} />
                                  </div>
                                  <p className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                                    }`}>
                                    Vista previa no disponible
                                  </p>
                                  <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
                                    } mt-1`}>
                                    Tipo de archivo: {docInfo.type || 'Desconocido'}
                                  </p>
                                  <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
                                    } mt-2`}>
                                    Usa el botón "Descargar" para ver este archivo
                                  </p>
                                </div>
                              </div>
                            );
                          }
                        })()}
                      </div>
                    </div>
                  ) : documentModal.file ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center">
                        <div className={`flex h-16 w-16 items-center justify-center rounded-full mx-auto mb-4 ${theme === 'dark' ? 'bg-slate-700' : 'bg-gray-100'
                          }`}>
                          <FileText className={`h-8 w-8 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
                            }`} />
                        </div>
                        <p className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                          }`}>
                          Archivo listo para subir
                        </p>
                        <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
                          } mt-1`}>
                          {documentModal.file.name}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center">
                        <div className={`flex h-16 w-16 items-center justify-center rounded-full mx-auto mb-4 ${theme === 'dark' ? 'bg-slate-700' : 'bg-gray-100'
                          }`}>
                          <FileText className={`h-8 w-8 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
                            }`} />
                        </div>
                        <p className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                          }`}>
                          No hay documento
                        </p>
                        <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
                          } mt-1`}>
                          Sube un archivo para verlo aquí
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className={`flex items-center justify-between border-t px-8 py-0 ${theme === 'dark' ? 'border-slate-700' : 'border-gray-200'
                }`}>
                <div>
                  {documentModal.hasDocument && canDeleteDoc && (
                    <button
                      onClick={() => {
                        handleDeleteDocument(documentModal.booking, documentModal.docType);
                        setDocumentModal({ isOpen: false, booking: '', docType: '', hasDocument: false, mode: 'view', file: null });
                      }}
                      disabled={isDeleting || isUploading}
                      className={`px-4 py-2 text-sm font-medium transition-colors border ${theme === 'dark'
                        ? 'text-red-400 hover:bg-slate-700 hover:text-red-300 border-slate-700/60'
                        : 'text-red-600 hover:bg-red-50 hover:text-red-700 border-gray-300'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isDeleting ? 'Eliminando...' : 'Eliminar documento'}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {documentModal.mode === 'upload' && documentModal.file && (
                    <button
                      onClick={handleConfirmUpload}
                      disabled={isUploading || isDeleting}
                      className={`px-6 py-3 text-sm font-semibold transition-colors border ${theme === 'dark'
                        ? 'bg-green-600 text-white hover:bg-green-700 border-green-500/60'
                        : 'bg-blue-600 text-white hover:bg-blue-700 border-blue-500/60'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}>
                      <div className="flex items-center gap-2">
                        {isUploading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin"></div>
                            Subiendo...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4" />
                            Subir documento
                          </>
                        )}
                      </div>
                    </button>
                  )}
                  {documentModal.hasDocument && (
                    <button
                      onClick={() => handleDownloadDocument(documentModal.booking, documentModal.docType)}
                      disabled={isDeleting || isUploading}
                      className={`px-4 py-2 text-sm font-medium transition-colors border ${theme === 'dark'
                        ? 'text-slate-300 hover:bg-slate-700 border-slate-700/60'
                        : 'text-gray-700 hover:bg-gray-100 border-gray-300'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      Descargar
                    </button>
                  )}
                  <button
                    onClick={() => setDocumentModal({ isOpen: false, booking: '', docType: '', hasDocument: false, mode: 'view', file: null })}
                    className={`px-4 py-2 text-sm font-medium transition-colors border ${theme === 'dark'
                      ? 'text-slate-300 hover:bg-slate-700 border-slate-700/60'
                      : 'text-gray-700 hover:bg-gray-100 border-gray-300'
                      }`}
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Resto del contenido */}
    </div>
  );
}

export default DocumentosPage;
