'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { FileText, FileCheck, ChevronRight, ChevronLeft, X, User as UserIcon, LayoutDashboard, Ship, Truck, Settings, Download, Upload, Trash2, File, Calendar, HardDrive, Filter, X as XIcon, Globe, BarChart3, DollarSign, Users, Activity, CheckCircle2, Clock, AlertCircle, Eye, FileUp } from 'lucide-react';
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
  const searchParams = useSearchParams();
  const { theme } = useTheme();
  const { currentUser, setCurrentUser, canEdit, canDelete, documentosCount } = useUser();
  const supabase = useMemo(() => createClient(), []);
  const rowRefs = useRef<Map<string, HTMLTableRowElement>>(new Map());

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
  const [clientesAsignados, setClientesAsignados] = useState<string[]>([]);
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

          // Agrupar archivos por booking para identificar duplicados
          const filesByBooking = new Map<string, Array<{ file: any; booking: string; bookingKey: string }>>();
          
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

            const bookingKey = booking.replace(/\s+/g, '');
            const key = `${bookingKey}__${docType}`;
            
            if (!filesByBooking.has(key)) {
              filesByBooking.set(key, []);
            }
            
            filesByBooking.get(key)!.push({ file, booking, bookingKey });
          });

          // Procesar cada grupo de archivos y mantener solo el más reciente
          for (const [key, fileGroup] of filesByBooking.entries()) {
            if (fileGroup.length === 0) continue;
            
            // Ordenar por fecha de actualización (más reciente primero)
            fileGroup.sort((a, b) => {
              const dateA = a.file.updated_at ? new Date(a.file.updated_at).getTime() : 0;
              const dateB = b.file.updated_at ? new Date(b.file.updated_at).getTime() : 0;
              return dateB - dateA; // Más reciente primero
            });

            const mostRecent = fileGroup[0];
            const { bookingKey } = mostRecent;
            
            // Agregar el más reciente al Map
            if (!newDocuments.has(bookingKey)) {
              newDocuments.set(bookingKey, new Map());
            }
            
            const bookingDocs = newDocuments.get(bookingKey)!;
            const { originalName } = parseStoredDocumentName(mostRecent.file.name);
            bookingDocs.set(docType, {
              path: `${docType}/${mostRecent.file.name}`,
              name: originalName,
            });

            // Eliminar los archivos duplicados (todos excepto el más reciente)
            if (fileGroup.length > 1) {
              const filesToDelete = fileGroup.slice(1).map(f => `${docType}/${f.file.name}`);
              try {
                const { error: deleteError } = await supabase.storage
                  .from('documentos')
                  .remove(filesToDelete);
                
                if (deleteError) {
                  console.warn(`Error eliminando duplicados para ${mostRecent.booking}:`, deleteError);
                } else {
                  console.log(`Eliminados ${filesToDelete.length} archivo(s) duplicado(s) para ${mostRecent.booking} (${docType})`);
                }
              } catch (err) {
                console.warn(`Error procesando duplicados para ${mostRecent.booking}:`, err);
              }
            }
          }
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

      // Eliminar TODOS los archivos anteriores para este booking y tipo
      try {
        const { data: existingFiles, error: listError } = await supabase.storage
          .from('documentos')
          .list(docTypeId, {
            limit: 1000,
          });

        if (!listError && existingFiles && existingFiles.length > 0) {
          const filesToDelete = existingFiles
            .filter(f => {
              // Verificar si el archivo pertenece a este booking
              const separatorIndex = f.name.indexOf('__');
              if (separatorIndex === -1) return false;
              
              const fileBookingSegment = f.name.slice(0, separatorIndex);
              try {
                const decodedBooking = normalizeBooking(decodeURIComponent(fileBookingSegment));
                return decodedBooking === normalizedBooking || fileBookingSegment === bookingSegment;
              } catch {
                return fileBookingSegment === bookingSegment;
              }
            })
            .map(f => `${docTypeId}/${f.name}`);

          if (filesToDelete.length > 0) {
            const { error: deleteError } = await supabase.storage
              .from('documentos')
              .remove(filesToDelete);

            if (deleteError) {
              console.warn('Error al eliminar archivos anteriores:', deleteError);
            } else {
              console.log(`Eliminados ${filesToDelete.length} archivo(s) anterior(es) para ${booking}`);
            }
          }
        }
      } catch (deleteErr) {
        console.warn('Error al procesar archivos anteriores:', deleteErr);
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
      return false; // Retornar false si se cancela
    }

    const docTypeId = DOCUMENT_TYPE_MAP[documentType];
    if (!docTypeId) {
      showError('Tipo de documento no válido');
      return false;
    }

    const bookingKey = normalizeBooking(booking).replace(/\s+/g, '');
    const bookingDocs = documents.get(bookingKey);
    const docInfo = bookingDocs?.get(docTypeId);

    if (!docInfo) {
      showError('Documento no encontrado');
      return false;
    }

    try {
      setDeletingDoc({ booking, type: documentType });

      // Eliminar el archivo
      const { error: deleteError, data: deleteData } = await supabase.storage
        .from('documentos')
        .remove([docInfo.path]);

      if (deleteError) {
        console.error('Error eliminando archivo:', deleteError);
        throw deleteError;
      }

      console.log('✅ Archivo eliminado del storage:', deleteData);

      // Actualizar el estado local INMEDIATAMENTE para feedback visual
      setDocuments(prev => {
        const newDocs = new Map();
        prev.forEach((bookingDocs, key) => {
          newDocs.set(key, new Map(bookingDocs));
        });
        const bookingDocs = newDocs.get(bookingKey);
        if (bookingDocs) {
          const newBookingDocs = new Map(bookingDocs);
          newBookingDocs.delete(docTypeId);
          if (newBookingDocs.size === 0) {
            newDocs.delete(bookingKey);
          } else {
            newDocs.set(bookingKey, newBookingDocs);
          }
        }
        return new Map(newDocs);
      });

      // Esperar y verificar que el archivo realmente se eliminó
      await new Promise(resolve => setTimeout(resolve, 800));

      // Verificar múltiples veces que el archivo se eliminó
      let attempts = 0;
      const maxAttempts = 3;
      let fileStillExists = true;

      while (attempts < maxAttempts && fileStillExists) {
        const { data: verifyData } = await supabase.storage
          .from('documentos')
          .list(docTypeId, { limit: 1000 });

        if (verifyData && verifyData.length > 0) {
          const fileName = docInfo.path.split('/').pop() || '';
          const exists = verifyData.some(f => {
            const filePath = `${docTypeId}/${f.name}`;
            return filePath === docInfo.path || f.name === fileName;
          });

          if (exists) {
            attempts++;
            console.warn(`⚠️ Intento ${attempts}/${maxAttempts}: El archivo todavía existe, reintentando eliminación...`);
            // Reintentar eliminación
            const { error: retryError } = await supabase.storage
              .from('documentos')
              .remove([docInfo.path]);
            
            if (retryError) {
              console.error('Error en reintento de eliminación:', retryError);
            }
            
            // Esperar antes del siguiente intento
            await new Promise(resolve => setTimeout(resolve, 1000));
          } else {
            fileStillExists = false;
          }
        } else {
          fileStillExists = false;
        }
      }

      if (fileStillExists) {
        console.warn('⚠️ El archivo todavía existe después de múltiples intentos, pero el estado local se actualizó');
      }

      // Actualizar el estado local DESPUÉS de verificar la eliminación
      // Usar una función de actualización que garantice la inmutabilidad
      setDocuments(prev => {
        const newDocs = new Map();
        // Copiar todos los documentos existentes
        prev.forEach((bookingDocs, key) => {
          newDocs.set(key, new Map(bookingDocs));
        });
        
        // Eliminar el documento específico
        const bookingDocs = newDocs.get(bookingKey);
        if (bookingDocs) {
          const newBookingDocs = new Map(bookingDocs);
          newBookingDocs.delete(docTypeId);
          // Si no quedan documentos para este booking, eliminar la entrada
          if (newBookingDocs.size === 0) {
            newDocs.delete(bookingKey);
          } else {
            newDocs.set(bookingKey, newBookingDocs);
          }
        }
        
        // Forzar un nuevo objeto Map para que React detecte el cambio
        return new Map(newDocs);
      });

      // NO recargar automáticamente - el estado local ya está actualizado
      // Si hay algún useEffect que recarga, esperará más tiempo antes de hacerlo
      // Esto evita que el documento vuelva a aparecer por caché de Supabase
      
      success('Documento eliminado correctamente');
      return true; // Retornar true si se eliminó correctamente
    } catch (err) {
      console.error('Error eliminando documento:', err);
      showError('No se pudo eliminar el documento.');
      return false;
    } finally {
      setDeletingDoc(null);
    }
  }, [documents, supabase, success, showError]);

  const loadClientesAsignados = useCallback(async (ejecutivoId: string, nombreUsuario?: string) => {
    try {
      const clientesAsignadosSet = new Set<string>();

      // 1. Cargar clientes asignados desde ejecutivo_clientes (si es ejecutivo)
      const { data, error } = await supabase
        .from('ejecutivo_clientes')
        .select('cliente_nombre')
        .eq('ejecutivo_id', ejecutivoId)
        .eq('activo', true);

      if (!error && data) {
        data.forEach(item => clientesAsignadosSet.add(item.cliente_nombre));
      }

      // 2. Si el nombre de usuario coincide con un cliente, agregarlo también
      if (nombreUsuario) {
        // Buscar en catalogos si existe un cliente con ese nombre
        const { data: catalogoClientes, error: catalogoError } = await supabase
          .from('catalogos')
          .select('valores')
          .eq('categoria', 'clientes')
          .single();

        if (!catalogoError && catalogoClientes?.valores) {
          const valores = Array.isArray(catalogoClientes.valores)
            ? catalogoClientes.valores
            : typeof catalogoClientes.valores === 'string'
              ? JSON.parse(catalogoClientes.valores)
              : [];

          // Verificar si el nombre de usuario coincide con algún cliente (comparación case-insensitive)
          const nombreUsuarioUpper = nombreUsuario.toUpperCase().trim();
          const clienteCoincidente = valores.find((cliente: string) =>
            cliente.toUpperCase().trim() === nombreUsuarioUpper
          );

          if (clienteCoincidente) {
            clientesAsignadosSet.add(clienteCoincidente); // Usar el nombre exacto del catálogo
          }
        }
      }

      const clientesFinales = Array.from(clientesAsignadosSet);
      setClientesAsignados(clientesFinales);
      // Actualizar currentUser con los clientes asignados
      if (currentUser) {
        setCurrentUser({
          ...currentUser,
          clientes_asignados: clientesFinales,
        });
      }
    } catch (error) {
      console.error('Error loading clientes asignados:', error);
      setClientesAsignados([]);
      // Actualizar currentUser con array vacío en caso de error
      if (currentUser) {
        setCurrentUser({
          ...currentUser,
          clientes_asignados: [],
        });
      }
    }
  }, [supabase, currentUser, setCurrentUser]);

  const loadRegistros = useCallback(async () => {
    try {
      setIsLoading(true);
      let query = supabase
        .from('registros')
        .select('*')
        .is('deleted_at', null)
        .not('ref_asli', 'is', null);

      // Filtrar por clientes asignados si hay alguno
      // Esto aplica tanto para ejecutivos como para usuarios cuyo nombre coincide con un cliente
      const esAdmin = currentUser?.rol === 'admin';
      const clienteNombre = currentUser?.rol === 'cliente' ? currentUser?.cliente_nombre?.trim() : '';
      if (!esAdmin && clienteNombre) {
        // Cliente: filtrar directo por su cliente_nombre (case-insensitive)
        query = query.ilike('shipper', clienteNombre);
      } else if (!esAdmin && clientesAsignados.length > 0) {
        // Ejecutivo u otros: filtrar por lista de clientes asignados
        query = query.in('shipper', clientesAsignados);
      }

      const { data, error } = await query.order('ref_asli', { ascending: false });

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
  }, [supabase, showError, currentUser, clientesAsignados]);

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
            cliente_nombre: userData.cliente_nombre ?? null,
            clientes_asignados: userData.clientes_asignados ?? [],
          };
          setCurrentUser(usuarioActualizado);
          
          // Cargar clientes asignados si es ejecutivo
          if (userData.rol === 'ejecutivo' || (userData.rol !== 'admin' && userData.rol !== 'cliente')) {
            loadClientesAsignados(userData.id, userData.nombre);
          }
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
    // Cargar datos cuando currentUser esté disponible
    if (currentUser) {
      const fetchData = async () => {
        try {
          await Promise.all([loadRegistros(), loadDocuments()]);
        } catch (err) {
          console.error('Error cargando datos:', err);
        }
      };
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, clientesAsignados.length]); // Recargar cuando cambien los clientes asignados

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

  // Scroll automático a la fila cuando hay un parámetro booking en la URL
  useEffect(() => {
    const bookingParam = searchParams?.get('booking');
    if (bookingParam && sortedDocumentosRows.length > 0) {
      // Normalizar el booking del parámetro
      const normalizedParamBooking = normalizeBooking(decodeURIComponent(bookingParam)).replace(/\s+/g, '');
      
      // Buscar la fila correspondiente
      const targetRow = sortedDocumentosRows.find(row => {
        const rowBooking = normalizeBooking(row.booking).replace(/\s+/g, '');
        return rowBooking === normalizedParamBooking;
      });

      if (targetRow) {
        // Esperar a que la tabla se renderice completamente
        setTimeout(() => {
          const rowElement = rowRefs.current.get(targetRow.id);
          if (rowElement) {
            rowElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Resaltar la fila temporalmente
            const isDark = document.documentElement.classList.contains('dark') || 
                          window.matchMedia('(prefers-color-scheme: dark)').matches;
            rowElement.style.backgroundColor = isDark ? 'rgba(234, 179, 8, 0.3)' : 'rgba(254, 240, 138, 0.8)';
            setTimeout(() => {
              rowElement.style.backgroundColor = '';
            }, 2000);
            
            // Limpiar el parámetro de la URL después de hacer scroll
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.delete('booking');
            window.history.replaceState({}, '', newUrl.toString());
          }
        }, 500);
      }
    }
  }, [searchParams, sortedDocumentosRows]);

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

  // Calcular estadísticas de documentos
  const documentStats = useMemo(() => {
    const total = documentosRows.length;
    const withDocuments = documentosRows.filter(row => 
      row.reservaPdf || row.instructivo || row.guiaDespacho || row.packingList || 
      row.proformaInvoice || row.blSwbTelex || row.facturaSii || row.dusLegalizado || row.fullset
    ).length;
    const withoutDocuments = total - withDocuments;
    const completionRate = total > 0 ? Math.round((withDocuments / total) * 100) : 0;
    
    return {
      total,
      withDocuments,
      withoutDocuments,
      completionRate,
    };
  }, [documentosRows]);

  // Verificar si es superadmin (Hans o Rodrigo) - DEBE ESTAR ANTES DEL RETURN CONDICIONAL
  const isSuperAdmin = useMemo(() => {
    const email = (currentUser?.email || '').toLowerCase();
    if (!email) {
      console.log('⚠️ No se encontró email del usuario en documentos:', { currentUser: currentUser?.email });
      return false;
    }
    const isSuperAdmin = email === 'rodrigo.caceres@asli.cl' || email === 'hans.vasquez@asli.cl';
    console.log('🔍 Verificando superadmin en documentos:', { email, isSuperAdmin });
    return isSuperAdmin;
  }, [currentUser]);
  
  const isRodrigo = currentUser?.email?.toLowerCase() === 'rodrigo.caceres@asli.cl';

  const sidebarSections: SidebarSection[] = useMemo(() => [
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
        { label: 'Documentos', id: '/documentos', isActive: pathname === '/documentos', icon: FileText, counter: documentosCount, tone: 'sky' },
        ...(currentUser && currentUser.rol !== 'cliente'
          ? [{ label: 'Generar Documentos', id: '/generar-documentos', isActive: pathname === '/generar-documentos', icon: FileCheck }]
          : []),
        ...(isSuperAdmin
          ? [{ label: 'Seguimiento Marítimo', id: '/dashboard/seguimiento', isActive: pathname === '/dashboard/seguimiento', icon: Globe }]
          : []),
        { label: 'Tracking Movs', id: '/dashboard/tracking', icon: Activity },
        ...(isSuperAdmin
          ? [
            { label: 'Finanzas', id: '/finanzas', isActive: pathname === '/finanzas', icon: DollarSign },
            { label: 'Reportes', id: '/reportes', isActive: pathname === '/reportes', icon: BarChart3 },
          ]
          : []),
        { label: 'Itinerario', id: '/itinerario', isActive: pathname === '/itinerario', icon: Ship },
      ],
    },
    ...(isSuperAdmin
      ? [
        {
          title: 'Mantenimiento',
          items: [
            { label: 'Usuarios', id: '/mantenimiento', isActive: pathname === '/mantenimiento', icon: Users },
          ],
        },
      ]
      : []),
  ], [currentUser, isSuperAdmin, pathname, documentosCount]);

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
            className={`inline-flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 md:px-2.5 py-1 sm:py-1.5 text-[10px] xs:text-xs font-semibold rounded-md sm:rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
              theme === 'dark'
                ? 'bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:from-emerald-500/30 hover:to-emerald-600/30 hover:border-emerald-400/50 hover:shadow-lg hover:shadow-emerald-500/20 active:scale-95 sm:hover:scale-105'
                : 'bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 border border-emerald-200 hover:from-emerald-100 hover:to-emerald-200 hover:border-emerald-300 hover:shadow-md active:scale-95 sm:hover:scale-105'
            }`}
            aria-label="Ver documento"
          >
            {isUploading ? (
              <>
                <div className={`h-2.5 w-2.5 sm:h-3 sm:w-3 animate-spin rounded-full border-2 ${theme === 'dark' ? 'border-emerald-300 border-t-transparent' : 'border-emerald-600 border-t-transparent'}`} />
                <span className="hidden xs:inline">Subiendo...</span>
              </>
            ) : isDeleting ? (
              <>
                <Trash2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                <span className="hidden xs:inline">Eliminando...</span>
              </>
            ) : (
              <>
                <Eye className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span className="hidden sm:inline">Ver</span>
              </>
            )}
          </button>
        ) : canUpload ? (
          <button
            onClick={() => fileInputRefs.current.get(cellKey)?.click()}
            disabled={isUploading || isDeleting}
            className={`inline-flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 md:px-2.5 py-1 sm:py-1.5 text-[10px] xs:text-xs font-semibold rounded-md sm:rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
              theme === 'dark'
                ? 'bg-gradient-to-r from-slate-700/50 to-slate-800/50 text-slate-300 border border-slate-600/50 hover:from-slate-600/60 hover:to-slate-700/60 hover:border-sky-500/50 hover:text-sky-200 hover:shadow-lg hover:shadow-sky-500/10 active:scale-95 sm:hover:scale-105'
                : 'bg-gradient-to-r from-gray-100 to-gray-50 text-gray-700 border border-gray-300 hover:from-gray-200 hover:to-gray-100 hover:border-blue-400 hover:text-blue-600 hover:shadow-md active:scale-95 sm:hover:scale-105'
            }`}
            aria-label="Subir documento"
          >
            {isUploading ? (
              <>
                <div className={`h-2.5 w-2.5 sm:h-3 sm:w-3 animate-spin rounded-full border-2 ${theme === 'dark' ? 'border-slate-300 border-t-transparent' : 'border-gray-600 border-t-transparent'}`} />
                <span className="hidden xs:inline">Subiendo...</span>
              </>
            ) : (
              <>
                <FileUp className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span className="hidden sm:inline">Subir</span>
              </>
            )}
          </button>
        ) : (
          <span className={`inline-flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 md:px-2.5 py-1 sm:py-1.5 text-[10px] xs:text-xs font-medium rounded-md sm:rounded-lg ${
            theme === 'dark'
              ? 'text-slate-500 bg-slate-800/30 border border-slate-700/30'
              : 'text-gray-400 bg-gray-50 border border-gray-200'
          }`}>
            <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span className="hidden sm:inline">Pendiente</span>
          </span>
        )}
      </div>
    );
  };

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
        <header className={`sticky top-0 z-40 border-b overflow-hidden backdrop-blur-xl ${theme === 'dark' 
          ? 'border-slate-700/50 bg-gradient-to-r from-slate-900/95 via-slate-800/95 to-slate-900/95 shadow-lg' 
          : 'border-gray-200/50 bg-gradient-to-r from-white/95 via-gray-50/95 to-white/95 shadow-sm'
        }`}>
          <div className="flex flex-wrap items-center gap-2 pl-2 pr-2 sm:px-4 sm:py-3 py-2.5">
            {/* Botón hamburguesa para móvil */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className={`lg:hidden flex h-9 w-9 items-center justify-center rounded-lg border transition-all duration-200 flex-shrink-0 ${theme === 'dark'
                ? 'text-slate-300 hover:bg-slate-700/80 border-slate-700/60 hover:border-sky-500/60 hover:scale-105'
                : 'text-gray-600 hover:bg-gray-100 border-gray-300 hover:border-blue-400 hover:scale-105'
                }`}
              aria-label="Abrir menú"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            {/* Botón para expandir sidebar colapsado en desktop */}
            {isSidebarCollapsed && (
              <button
                onClick={toggleSidebar}
                className={`hidden lg:flex h-9 w-9 items-center justify-center rounded-lg border transition-all duration-200 flex-shrink-0 ${theme === 'dark'
                  ? 'text-slate-300 hover:bg-slate-700/80 border-slate-700/60 hover:border-sky-500/60 hover:scale-105'
                  : 'text-gray-600 hover:bg-gray-100 border-gray-300 hover:border-blue-400 hover:scale-105'
                  }`}
                aria-label="Expandir menú lateral"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            )}

            <div className="flex items-center gap-3 sm:gap-4">
              <div className={`hidden sm:flex h-11 w-11 items-center justify-center rounded-xl border transition-all duration-200 ${theme === 'dark' 
                ? 'bg-gradient-to-br from-sky-500/20 to-indigo-500/20 border-sky-500/30 shadow-lg shadow-sky-500/10' 
                : 'bg-gradient-to-br from-blue-100 to-indigo-100 border-blue-200 shadow-sm'
              }`}>
                <FileText className={`h-6 w-6 ${theme === 'dark' ? 'text-sky-300' : 'text-blue-600'}`} />
              </div>
              <div>
                <p className={`text-[10px] sm:text-[11px] uppercase tracking-[0.2em] sm:tracking-[0.3em] font-semibold ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                  Módulo Operativo
                </p>
                <h1 className={`text-lg sm:text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Documentos
                </h1>
                <p className={`text-[11px] sm:text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                  Gestión de documentos y facturas
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-3 ml-auto">
              <button
                onClick={() => setShowFilters(prev => !prev)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-all duration-200 rounded-lg border ${showFilters
                  ? theme === 'dark'
                    ? 'bg-gradient-to-r from-sky-500 to-indigo-500 text-white border-sky-400 shadow-lg shadow-sky-500/20'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-500 shadow-md'
                  : hasActiveFilters
                    ? theme === 'dark'
                      ? 'bg-blue-600/90 text-white border-blue-500/60 shadow-md'
                      : 'bg-blue-600 text-white border-blue-500 shadow-md'
                    : theme === 'dark'
                      ? 'border-slate-700/60 text-slate-300 hover:border-sky-500/60 hover:text-sky-200 bg-slate-800/60 hover:bg-slate-700/60 hover:scale-105'
                      : 'border-gray-300 text-gray-700 hover:border-blue-400 hover:text-blue-600 bg-white hover:bg-gray-50 hover:scale-105'
                  }`}
                type="button"
                aria-label="Mostrar/Ocultar filtros"
                aria-expanded={showFilters}
              >
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Filtros</span>
                {hasActiveFilters && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${theme === 'dark' 
                    ? 'bg-white/20 text-white' 
                    : 'bg-white/30 text-blue-600'
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
                className={`hidden sm:flex items-center gap-2 border px-3 py-2 text-xs sm:text-sm rounded-lg transition-all duration-200 ${theme === 'dark'
                  ? 'border-slate-700/60 text-slate-300 hover:border-sky-400/60 hover:text-sky-200 bg-slate-800/60 hover:bg-slate-700/60 hover:scale-105'
                  : 'border-gray-300 text-gray-700 hover:border-blue-400 hover:text-blue-600 bg-white hover:bg-gray-50 hover:scale-105'
                  }`}
                title={currentUser?.nombre || currentUser?.email}
              >
                <UserIcon className="h-4 w-4" />
                <span className="hidden md:inline">{currentUser?.nombre || currentUser?.email}</span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 flex flex-col overflow-hidden min-w-0 w-full">
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex-shrink-0 px-2 pt-2 sm:px-3 sm:pt-3 md:px-4 md:pt-4">
              {/* Cards de Estadísticas */}
              {!isLoading && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-3">
                  <div className={`rounded-xl border p-2.5 sm:p-3 md:p-4 transition-all duration-200 ${theme === 'dark'
                    ? 'border-slate-700/60 bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm hover:border-sky-500/40 hover:shadow-lg hover:shadow-sky-500/10'
                    : 'border-gray-200 bg-white shadow-sm hover:border-blue-300 hover:shadow-md'
                  }`}>
                    <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                      <FileText className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${theme === 'dark' ? 'text-sky-400' : 'text-blue-600'}`} />
                      <p className={`text-[9px] xs:text-[10px] sm:text-xs font-medium truncate ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                        Total
                      </p>
                    </div>
                    <p className={`text-base sm:text-lg md:text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {documentStats.total}
                    </p>
                  </div>
                  <div className={`rounded-xl border p-2.5 sm:p-3 md:p-4 transition-all duration-200 ${theme === 'dark'
                    ? 'border-slate-700/60 bg-gradient-to-br from-emerald-900/20 to-slate-900/80 backdrop-blur-sm hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/10'
                    : 'border-emerald-200 bg-emerald-50/50 shadow-sm hover:border-emerald-300 hover:shadow-md'
                  }`}>
                    <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                      <CheckCircle2 className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`} />
                      <p className={`text-[9px] xs:text-[10px] sm:text-xs font-medium truncate ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                        Con Docs
                      </p>
                    </div>
                    <p className={`text-base sm:text-lg md:text-xl font-bold ${theme === 'dark' ? 'text-emerald-300' : 'text-emerald-700'}`}>
                      {documentStats.withDocuments}
                    </p>
                  </div>
                  <div className={`rounded-xl border p-2.5 sm:p-3 md:p-4 transition-all duration-200 ${theme === 'dark'
                    ? 'border-slate-700/60 bg-gradient-to-br from-amber-900/20 to-slate-900/80 backdrop-blur-sm hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/10'
                    : 'border-amber-200 bg-amber-50/50 shadow-sm hover:border-amber-300 hover:shadow-md'
                  }`}>
                    <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                      <AlertCircle className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`} />
                      <p className={`text-[9px] xs:text-[10px] sm:text-xs font-medium truncate ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                        Sin Docs
                      </p>
                    </div>
                    <p className={`text-base sm:text-lg md:text-xl font-bold ${theme === 'dark' ? 'text-amber-300' : 'text-amber-700'}`}>
                      {documentStats.withoutDocuments}
                    </p>
                  </div>
                  <div className={`rounded-xl border p-2.5 sm:p-3 md:p-4 transition-all duration-200 ${theme === 'dark'
                    ? 'border-slate-700/60 bg-gradient-to-br from-sky-900/20 to-slate-900/80 backdrop-blur-sm hover:border-sky-500/40 hover:shadow-lg hover:shadow-sky-500/10'
                    : 'border-sky-200 bg-sky-50/50 shadow-sm hover:border-sky-300 hover:shadow-md'
                  }`}>
                    <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                      <BarChart3 className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${theme === 'dark' ? 'text-sky-400' : 'text-sky-600'}`} />
                      <p className={`text-[9px] xs:text-[10px] sm:text-xs font-medium truncate ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                        Completitud
                      </p>
                    </div>
                    <p className={`text-base sm:text-lg md:text-xl font-bold ${theme === 'dark' ? 'text-sky-300' : 'text-sky-700'}`}>
                      {documentStats.completionRate}%
                    </p>
                  </div>
                </div>
              )}

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
            </div>

            {/* Tabla de Documentos */}
            <section className={`flex-1 flex flex-col border overflow-hidden min-h-0 mx-2 mb-2 sm:mx-3 sm:mb-3 md:mx-4 md:mb-4 rounded-xl ${theme === 'dark'
              ? 'border-slate-700/60 bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm shadow-xl'
              : 'border-gray-200 bg-white shadow-lg'
              }`}>
              <div className="flex-1 overflow-x-auto overflow-y-auto min-h-0 -webkit-overflow-scrolling-touch">
                <div className="min-w-full inline-block align-middle">
                  <table className={`min-w-full divide-y ${theme === 'dark' ? 'divide-slate-800/40' : 'divide-gray-200'
                    }`}>
                    <thead className={`sticky top-0 z-[250] backdrop-blur-sm ${theme === 'dark'
                      ? 'bg-gradient-to-b from-slate-900/95 to-slate-800/95 border-b border-slate-700/60 shadow-lg'
                      : 'bg-gradient-to-b from-white/95 to-gray-50/95 border-b border-gray-200 shadow-md'
                      }`}>
                    <tr>
                      <th
                        className={`px-2 sm:px-3 md:px-4 py-2.5 sm:py-3 text-left text-[10px] xs:text-xs font-bold uppercase tracking-wider cursor-pointer transition-all duration-200 ${theme === 'dark' 
                          ? 'text-slate-200 hover:bg-slate-800/80 hover:text-sky-200' 
                          : 'text-gray-800 hover:bg-gray-100 hover:text-blue-600'
                          }`}
                        onClick={() => handleSort('nave')}
                      >
                        <div className="flex items-center gap-1 sm:gap-2">
                          <Ship className="h-3 w-3 sm:h-3.5 sm:w-3.5 opacity-70 flex-shrink-0" />
                          <span className="hidden xs:inline">Nave | Booking | Contenedor</span>
                          <span className="xs:hidden">Nave</span>
                          {sortField === 'nave' && (
                            <span className={`text-[10px] xs:text-xs font-bold flex-shrink-0 ${theme === 'dark' ? 'text-sky-400' : 'text-blue-600'}`}>
                              {sortDirection === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th
                        className={`px-2 sm:px-3 md:px-4 py-2.5 sm:py-3 text-left text-[10px] xs:text-xs font-bold uppercase tracking-wider cursor-pointer transition-all duration-200 ${theme === 'dark' 
                          ? 'text-slate-200 hover:bg-slate-800/80 hover:text-sky-200' 
                          : 'text-gray-800 hover:bg-gray-100 hover:text-blue-600'
                          }`}
                        onClick={() => handleSort('refCliente')}
                      >
                        <div className="flex items-center gap-1 sm:gap-2">
                          <FileText className="h-3 w-3 sm:h-3.5 sm:w-3.5 opacity-70 flex-shrink-0" />
                          <span className="hidden sm:inline">Ref Cliente</span>
                          <span className="sm:hidden">Ref</span>
                          {sortField === 'refCliente' && (
                            <span className={`text-[10px] xs:text-xs font-bold flex-shrink-0 ${theme === 'dark' ? 'text-sky-400' : 'text-blue-600'}`}>
                              {sortDirection === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th
                        className={`px-2 sm:px-3 md:px-4 py-2.5 sm:py-3 text-left text-[10px] xs:text-xs font-bold uppercase tracking-wider cursor-pointer transition-all duration-200 ${theme === 'dark' 
                          ? 'text-slate-200 hover:bg-slate-800/80 hover:text-sky-200' 
                          : 'text-gray-800 hover:bg-gray-100 hover:text-blue-600'
                          }`}
                        onClick={() => handleSort('fechaIngreso')}
                      >
                        <div className="flex items-center gap-1 sm:gap-2">
                          <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 opacity-70 flex-shrink-0" />
                          <span className="hidden sm:inline">Fecha Ingreso</span>
                          <span className="sm:hidden">Fecha</span>
                          {sortField === 'fechaIngreso' && (
                            <span className={`text-[10px] xs:text-xs font-bold flex-shrink-0 ${theme === 'dark' ? 'text-sky-400' : 'text-blue-600'}`}>
                              {sortDirection === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th className={`px-2 sm:px-3 md:px-4 py-2.5 sm:py-3 text-center text-[10px] xs:text-xs font-bold uppercase tracking-wider ${theme === 'dark' 
                        ? 'text-slate-200' 
                        : 'text-gray-800'
                        }`}>
                        <div className="flex items-center justify-center gap-1 sm:gap-1.5">
                          <FileText className="h-3 w-3 sm:h-3.5 sm:w-3.5 opacity-70 flex-shrink-0" />
                          <span className="hidden sm:inline">Reserva PDF</span>
                          <span className="sm:hidden">PDF</span>
                        </div>
                      </th>
                      <th className={`px-1 sm:px-2 md:px-4 py-2.5 sm:py-3 text-center text-[10px] xs:text-xs font-bold uppercase tracking-wider ${theme === 'dark' 
                        ? 'text-slate-200' 
                        : 'text-gray-800'
                        }`}>
                        <span className="hidden sm:inline">Instructivo</span>
                        <span className="sm:hidden">Inst.</span>
                      </th>
                      <th className={`px-1 sm:px-2 md:px-4 py-2.5 sm:py-3 text-center text-[10px] xs:text-xs font-bold uppercase tracking-wider ${theme === 'dark' 
                        ? 'text-slate-200' 
                        : 'text-gray-800'
                        }`}>
                        <span className="hidden sm:inline">Guía de Despacho</span>
                        <span className="sm:hidden">Guía</span>
                      </th>
                      <th className={`px-1 sm:px-2 md:px-4 py-2.5 sm:py-3 text-center text-[10px] xs:text-xs font-bold uppercase tracking-wider ${theme === 'dark' 
                        ? 'text-slate-200' 
                        : 'text-gray-800'
                        }`}>
                        <span className="hidden sm:inline">Packing List</span>
                        <span className="sm:hidden">Packing</span>
                      </th>
                      <th className={`px-1 sm:px-2 md:px-4 py-2.5 sm:py-3 text-center text-[10px] xs:text-xs font-bold uppercase tracking-wider ${theme === 'dark' 
                        ? 'text-slate-200' 
                        : 'text-gray-800'
                        }`}>
                        <span className="hidden sm:inline">Proforma Invoice</span>
                        <span className="sm:hidden">Proforma</span>
                      </th>
                      <th className={`px-1 sm:px-2 md:px-4 py-2.5 sm:py-3 text-center text-[10px] xs:text-xs font-bold uppercase tracking-wider ${theme === 'dark' 
                        ? 'text-slate-200' 
                        : 'text-gray-800'
                        }`}>
                        <span className="hidden sm:inline">BL-SWB-TELEX</span>
                        <span className="sm:hidden">BL</span>
                      </th>
                      <th className={`px-1 sm:px-2 md:px-4 py-2.5 sm:py-3 text-center text-[10px] xs:text-xs font-bold uppercase tracking-wider ${theme === 'dark' 
                        ? 'text-slate-200' 
                        : 'text-gray-800'
                        }`}>
                        <span className="hidden sm:inline">Factura SII</span>
                        <span className="sm:hidden">Factura</span>
                      </th>
                      <th className={`px-1 sm:px-2 md:px-4 py-2.5 sm:py-3 text-center text-[10px] xs:text-xs font-bold uppercase tracking-wider ${theme === 'dark' 
                        ? 'text-slate-200' 
                        : 'text-gray-800'
                        }`}>
                        <span className="hidden sm:inline">DUS Legalizado</span>
                        <span className="sm:hidden">DUS</span>
                      </th>
                      <th className={`px-1 sm:px-2 md:px-4 py-2.5 sm:py-3 text-center text-[10px] xs:text-xs font-bold uppercase tracking-wider ${theme === 'dark' 
                        ? 'text-slate-200' 
                        : 'text-gray-800'
                        }`}>
                        <span className="hidden sm:inline">Fullset</span>
                        <span className="sm:hidden">Full</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${theme === 'dark' ? 'divide-slate-800/40 bg-slate-900/30' : 'divide-gray-200 bg-white'
                    }`}>
                    {isLoading ? (
                      <tr>
                        <td colSpan={12} className={`px-4 py-12 text-center ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
                          }`}>
                          <div className="flex flex-col items-center gap-3">
                            <div className={`h-8 w-8 animate-spin rounded-full border-2 ${theme === 'dark' ? 'border-sky-500 border-t-transparent' : 'border-blue-500 border-t-transparent'}`} />
                            <p className="text-sm font-medium">Cargando documentos...</p>
                          </div>
                        </td>
                      </tr>
                    ) : sortedDocumentosRows.length === 0 ? (
                      <tr>
                        <td colSpan={12} className={`px-4 py-12 text-center ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
                          }`}>
                          <div className="flex flex-col items-center gap-3">
                            <FileText className={`h-10 w-10 ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`} />
                            <p className="text-sm font-medium">No hay documentos disponibles</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      sortedDocumentosRows.map((row) => (
                        <tr 
                          key={row.id} 
                          ref={(el) => {
                            if (el) {
                              rowRefs.current.set(row.id, el);
                            } else {
                              rowRefs.current.delete(row.id);
                            }
                          }}
                          className={`transition-all duration-200 ${theme === 'dark' 
                            ? 'hover:bg-slate-800/60 hover:shadow-lg hover:shadow-sky-500/5' 
                            : 'hover:bg-gray-50 hover:shadow-sm'
                          }`}
                        >
                          <td className={`px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-900'
                            }`}>
                            <div className="flex flex-col space-y-0.5 min-w-[120px] sm:min-w-0">
                              <span className="font-medium text-xs sm:text-sm truncate">{row.nave}</span>
                              <span className="text-[10px] xs:text-xs opacity-75 truncate">{row.booking}</span>
                              <span className="text-[10px] xs:text-xs opacity-75 truncate">{row.contenedor}</span>
                            </div>
                          </td>
                          <td className={`px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-900'
                            }`}>
                            <span className="text-xs sm:text-sm truncate block max-w-[100px] sm:max-w-none">{row.refCliente || '—'}</span>
                          </td>
                          <td className={`px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 whitespace-nowrap ${theme === 'dark' ? 'text-slate-300' : 'text-gray-900'
                            }`}>
                            <span className="text-xs sm:text-sm">
                              {(() => {
                                const registro = registros.find(r => r.id === row.id);
                                return registro?.ingresado
                                  ? new Date(registro.ingresado).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
                                  : '—';
                              })()}
                            </span>
                          </td>
                          <td className="px-1 sm:px-2 md:px-4 py-2 sm:py-2.5 md:py-3 text-center">
                            {renderDocumentCell(row.booking, 'reservaPdf', row.reservaPdf)}
                          </td>
                          <td className="px-1 sm:px-2 md:px-4 py-2 sm:py-2.5 md:py-3 text-center">
                            {renderDocumentCell(row.booking, 'instructivo', row.instructivo)}
                          </td>
                          <td className="px-1 sm:px-2 md:px-4 py-2 sm:py-2.5 md:py-3 text-center">
                            {renderDocumentCell(row.booking, 'guiaDespacho', row.guiaDespacho)}
                          </td>
                          <td className="px-1 sm:px-2 md:px-4 py-2 sm:py-2.5 md:py-3 text-center">
                            {renderDocumentCell(row.booking, 'packingList', row.packingList)}
                          </td>
                          <td className="px-1 sm:px-2 md:px-4 py-2 sm:py-2.5 md:py-3 text-center">
                            {renderDocumentCell(row.booking, 'proformaInvoice', row.proformaInvoice)}
                          </td>
                          <td className="px-1 sm:px-2 md:px-4 py-2 sm:py-2.5 md:py-3 text-center">
                            {renderDocumentCell(row.booking, 'blSwbTelex', row.blSwbTelex)}
                          </td>
                          <td className="px-1 sm:px-2 md:px-4 py-2 sm:py-2.5 md:py-3 text-center">
                            {renderDocumentCell(row.booking, 'facturaSii', row.facturaSii)}
                          </td>
                          <td className="px-1 sm:px-2 md:px-4 py-2 sm:py-2.5 md:py-3 text-center">
                            {renderDocumentCell(row.booking, 'dusLegalizado', row.dusLegalizado)}
                          </td>
                          <td className="px-1 sm:px-2 md:px-4 py-2 sm:py-2.5 md:py-3 text-center">
                            {renderDocumentCell(row.booking, 'fullset', row.fullset)}
                          </td>
                        </tr>
                      ))
                    )}
                    </tbody>
                  </table>
                </div>
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
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            {/* Overlay */}
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setDocumentModal({ isOpen: false, booking: '', docType: '', hasDocument: false, mode: 'view', file: null })}
            />

            {/* Modal más grande */}
            <div className={`relative z-[310] w-full max-w-6xl max-h-[90vh] border overflow-hidden rounded-xl shadow-2xl ${theme === 'dark'
              ? 'border-slate-700/60 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 backdrop-blur-xl'
              : 'border-gray-200 bg-white shadow-xl'
              }`}>
              {/* Header */}
              <div className={`flex items-center justify-between border-b px-6 py-4 backdrop-blur-sm ${theme === 'dark' 
                ? 'border-slate-700/60 bg-gradient-to-r from-slate-800/80 to-slate-900/80' 
                : 'border-gray-200 bg-gradient-to-r from-gray-50 to-white'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl border transition-all duration-200 ${theme === 'dark' 
                    ? 'bg-gradient-to-br from-sky-500/20 to-indigo-500/20 border-sky-500/30 shadow-lg shadow-sky-500/10' 
                    : 'bg-gradient-to-br from-blue-100 to-indigo-100 border-blue-200 shadow-sm'
                  }`}>
                    <FileText className={`h-6 w-6 ${theme === 'dark' ? 'text-sky-300' : 'text-blue-600'}`} />
                  </div>
                  <div>
                    <h2 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {documentModal.hasDocument ? 'Vista previa del documento' : 'Subir documento'}
                    </h2>
                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                      {documentModal.hasDocument ? 'Visualización del archivo PDF' : 'Revisa la información antes de subir'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setDocumentModal({ isOpen: false, booking: '', docType: '', hasDocument: false, mode: 'view', file: null })}
                  className={`p-2.5 rounded-lg transition-all duration-200 border ${theme === 'dark'
                    ? 'text-slate-400 hover:bg-slate-700/80 hover:text-slate-200 border-slate-700/60 hover:border-slate-600 hover:scale-110'
                    : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600 border-gray-300 hover:border-gray-400 hover:scale-110'
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
                            // Para Excel, mostrar vista previa
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
                                    onLoad={() => console.log('✅ Excel preview cargado')}
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
              <div className={`flex items-center justify-between border-t px-6 py-4 backdrop-blur-sm ${theme === 'dark' 
                ? 'border-slate-700/60 bg-gradient-to-r from-slate-800/80 to-slate-900/80' 
                : 'border-gray-200 bg-gradient-to-r from-gray-50 to-white'
              }`}>
                <div>
                  {documentModal.hasDocument && canDeleteDoc && (
                    <button
                      onClick={async () => {
                        const deleted = await handleDeleteDocument(documentModal.booking, documentModal.docType);
                        // Cerrar el modal solo si la eliminación fue exitosa
                        if (deleted) {
                          setDocumentModal({ isOpen: false, booking: '', docType: '', hasDocument: false, mode: 'view', file: null });
                        }
                      }}
                      disabled={isDeleting || isUploading}
                      className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 border disabled:opacity-50 disabled:cursor-not-allowed ${
                        theme === 'dark'
                          ? 'text-red-400 hover:bg-red-500/20 hover:text-red-300 border-red-500/30 hover:border-red-400/50 hover:shadow-lg hover:shadow-red-500/20 hover:scale-105'
                          : 'text-red-600 hover:bg-red-50 hover:text-red-700 border-red-300 hover:border-red-400 hover:shadow-md hover:scale-105'
                      }`}
                    >
                      {isDeleting ? (
                        <>
                          <div className={`h-4 w-4 animate-spin rounded-full border-2 ${theme === 'dark' ? 'border-red-400 border-t-transparent' : 'border-red-600 border-t-transparent'}`} />
                          <span>Eliminando...</span>
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4" />
                          <span>Eliminar</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {documentModal.mode === 'upload' && documentModal.file && (
                    <button
                      onClick={handleConfirmUpload}
                      disabled={isUploading || isDeleting}
                      className={`inline-flex items-center gap-2 px-6 py-3 text-sm font-bold rounded-lg transition-all duration-200 border disabled:opacity-50 disabled:cursor-not-allowed ${
                        theme === 'dark'
                          ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 border-emerald-400/60 shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/30 hover:scale-105'
                          : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 border-blue-500 shadow-md hover:shadow-lg hover:scale-105'
                      }`}
                    >
                      {isUploading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full" />
                          <span>Subiendo...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          <span>Subir documento</span>
                        </>
                      )}
                    </button>
                  )}
                  {documentModal.hasDocument && (
                    <button
                      onClick={() => handleDownloadDocument(documentModal.booking, documentModal.docType)}
                      disabled={isDeleting || isUploading}
                      className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 border disabled:opacity-50 disabled:cursor-not-allowed ${
                        theme === 'dark'
                          ? 'text-sky-300 hover:bg-sky-500/20 hover:text-sky-200 border-sky-500/30 hover:border-sky-400/50 hover:shadow-lg hover:shadow-sky-500/20 hover:scale-105'
                          : 'text-blue-600 hover:bg-blue-50 hover:text-blue-700 border-blue-300 hover:border-blue-400 hover:shadow-md hover:scale-105'
                      }`}
                    >
                      <Download className="h-4 w-4" />
                      <span>Descargar</span>
                    </button>
                  )}
                  <button
                    onClick={() => setDocumentModal({ isOpen: false, booking: '', docType: '', hasDocument: false, mode: 'view', file: null })}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 border ${
                      theme === 'dark'
                        ? 'text-slate-300 hover:bg-slate-700/80 hover:text-slate-200 border-slate-700/60 hover:border-slate-600 hover:scale-105'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 border-gray-300 hover:border-gray-400 hover:scale-105'
                    }`}
                  >
                    <X className="h-4 w-4" />
                    <span>Cerrar</span>
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
