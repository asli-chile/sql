'use client';
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { useUser } from '@/hooks/useUser';
import { Registro } from '@/types/registros';
import { Factura } from '@/types/factura';
import { Trash2, Download } from 'lucide-react';
import { FacturaCreator } from '@/components/facturas/FacturaCreator';
import { FacturaViewer } from '@/components/facturas/FacturaViewer';
import { useToast } from '@/hooks/useToast';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { AppFooter } from '@/components/layout/AppFooter';
import { DocumentFilters } from '@/components/documentos/DocumentFilters';
import { DocumentList } from '@/components/documentos/DocumentList';
import { DOCUMENT_TYPES } from '@/components/documentos/constants';
import { StoredDocument } from '@/types/documents';
import {
  allowedExtensions,
  sanitizeFileName,
  formatFileDisplayName,
  normalizeBooking,
  normalizeTemporada,
  parseStoredDocumentName,
} from '@/utils/documentUtils';

const STORAGE_BUCKET = 'documentos';

const createEmptyDocumentsMap = () =>
  DOCUMENT_TYPES.reduce<Record<string, StoredDocument[]>>((acc, type) => {
    acc[type.id] = [];
    return acc;
  }, {});

export default function DocumentosPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser, setCurrentUser } = useUser();
  const { success, error: showError } = useToast();
  const supabase = useMemo(() => createClient(), []);

  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [facturaSeleccionada, setFacturaSeleccionada] = useState<Factura | null>(null);
  const [registroSeleccionado, setRegistroSeleccionado] = useState<Registro | null>(null);
  const [documentsByType, setDocumentsByType] = useState<Record<string, StoredDocument[]>>(createEmptyDocumentsMap);
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [uploadingBooking, setUploadingBooking] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [downloadUrlLoading, setDownloadUrlLoading] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState('');
  const [searchBookingInput, setSearchBookingInput] = useState('');
  const [inspectedBooking, setInspectedBooking] = useState('');
  const [selectedTemporada, setSelectedTemporada] = useState<string | null>(null);
  const [clientesAsignados, setClientesAsignados] = useState<string[]>([]);
  const [isEjecutivo, setIsEjecutivo] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ doc: StoredDocument; x: number; y: number } | null>(null);
  const [deletedDocuments, setDeletedDocuments] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const temporadaParam = searchParams?.get('temporada');
  const isAdminOrEjecutivo = (currentUser?.rol === 'admin') || Boolean(currentUser?.email?.endsWith('@asli.cl'));
  const isAdmin = currentUser?.rol === 'admin';

  // Inicializar temporada desde URL params o establecer "25-26" por defecto
  useEffect(() => {
    if (temporadaParam) {
      const normalized = normalizeTemporada(temporadaParam);
      if (normalized) {
        setSelectedTemporada(normalized);
      }
    } else {
      // Establecer "2025-2026" por defecto si no hay temporada en la URL
      const defaultTemporada = '2025-2026';
      setSelectedTemporada(defaultTemporada);
      // Actualizar URL sin recargar
      const params = new URLSearchParams(window.location.search);
      params.set('temporada', defaultTemporada);
      router.push(`/documentos?${params.toString()}`, { scroll: false });
    }
  }, [temporadaParam, router]);

  useEffect(() => {
    void checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      if (!user) {
        router.push('/auth');
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('auth_user_id', user.id)
        .single();

      if (userError || !userData) {
        const basicUser = {
          id: user.id,
          nombre: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario',
          email: user.email || '',
          rol: 'usuario',
          activo: true,
        };
        setCurrentUser(basicUser);
        return;
      }

      setCurrentUser({
        id: userData.id,
        nombre: userData.nombre,
        email: userData.email,
        rol: userData.rol,
        activo: userData.activo,
      });

      // Verificar si es ejecutivo y cargar clientes asignados
      const emailEsEjecutivo = userData.email?.endsWith('@asli.cl') || false;
      setIsEjecutivo(emailEsEjecutivo);
      await loadClientesAsignados(userData.id, userData.nombre);
    } catch (err) {
      console.error('Error checking user:', err);
      router.push('/auth');
    }
  };

  // Función para cargar clientes asignados (similar a registros)
  const loadClientesAsignados = async (userId: string, nombreUsuario?: string) => {
    try {
      const clientesAsignadosSet = new Set<string>();

      // 1. Cargar clientes asignados desde ejecutivo_clientes (si es ejecutivo)
      const { data, error } = await supabase
        .from('ejecutivo_clientes')
        .select('cliente_nombre')
        .eq('ejecutivo_id', userId)
        .eq('activo', true);

      if (!error && data) {
        data.forEach(item => clientesAsignadosSet.add(item.cliente_nombre));
      }

      // 2. Si el nombre de usuario coincide con un cliente, agregarlo también
      if (nombreUsuario) {
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

          const nombreUsuarioUpper = nombreUsuario.toUpperCase().trim();
          const clienteCoincidente = valores.find((cliente: string) =>
            cliente.toUpperCase().trim() === nombreUsuarioUpper
          );

          if (clienteCoincidente) {
            clientesAsignadosSet.add(clienteCoincidente);
          }
        }
      }

      setClientesAsignados(Array.from(clientesAsignadosSet));
    } catch (error) {
      console.error('Error loading clientes asignados:', error);
      setClientesAsignados([]);
    }
  };

  const loadRegistros = useCallback(async () => {
    try {
      let query = supabase
        .from('registros')
        .select('*')
        .is('deleted_at', null);

      // Filtrar por clientes asignados si hay alguno (aplica para ejecutivos y usuarios cuyo nombre coincide con un cliente)
      const esAdmin = currentUser?.rol === 'admin';
      if (!esAdmin && clientesAsignados.length > 0) {
        query = query.in('shipper', clientesAsignados);
      }

      const { data, error } = await query.order('ingresado', { ascending: false });

      if (error) throw error;

      const registrosData = (data || []).map((r: any) => {
        let naveInicial = r.nave_inicial || '';
        let viaje = r.viaje || null;
        const matchNave = naveInicial.match(/^(.+?)\s*\[(.+?)\]$/);
        if (matchNave && matchNave.length >= 3) {
          naveInicial = matchNave[1].trim();
          viaje = matchNave[2].trim();
        }

        return {
          ...r,
          refAsli: r.ref_asli || '',
          naveInicial,
          viaje,
          ingresado: r.ingresado ? new Date(r.ingresado) : null,
          etd: r.etd ? new Date(r.etd) : null,
          eta: r.eta ? new Date(r.eta) : null,
          ingresoStacking: r.ingreso_stacking ? new Date(r.ingreso_stacking) : null,
          createdAt: r.created_at ? new Date(r.created_at) : undefined,
          updatedAt: r.updated_at ? new Date(r.updated_at) : undefined,
        };
      }) as Registro[];

      setRegistros(registrosData);
    } catch (err) {
      console.error('Error cargando registros:', err);
      showError('Error al cargar registros');
    }
  }, [showError, supabase, currentUser, clientesAsignados]);

  const loadFacturas = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('facturas')
        .select('*')
        .order('created_at', { ascending: false });

      if (currentUser && currentUser.rol === 'usuario' && !currentUser.email?.endsWith('@asli.cl')) {
        query = query.eq('created_by', currentUser.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      const facturasData = (data || []).map((f: any) => ({
        id: f.id,
        registroId: f.registro_id,
        refAsli: f.ref_asli,
        exportador: f.exportador || {},
        consignatario: f.consignatario || {},
        embarque: f.embarque || {},
        productos: f.productos || [],
        totales: f.totales || { cantidadTotal: 0, valorTotal: 0, valorTotalTexto: '' },
        clientePlantilla: f.cliente_plantilla || 'ALMAFRUIT',
        created_at: f.created_at,
        updated_at: f.updated_at,
        created_by: f.created_by,
      })) as Factura[];

      setFacturas(facturasData);
    } catch (err) {
      console.error('Error cargando facturas:', err);
      showError('Error al cargar facturas');
    } finally {
      setLoading(false);
    }
  }, [currentUser, showError, supabase]);

  const loadDeletedDocuments = useCallback(async () => {
    if (!isAdmin) {
      setDeletedDocuments(new Set());
      return;
    }

    try {
      const { data, error } = await supabase
        .from('documentos_eliminados')
        .select('file_path')
        .gt('expires_at', new Date().toISOString()); // Solo documentos que no han expirado

      if (error) {
        console.warn('Error cargando documentos eliminados:', error);
        return;
      }

      const deletedPaths = new Set(data?.map((d) => d.file_path) || []);
      setDeletedDocuments(deletedPaths);
    } catch (err) {
      console.error('Error cargando documentos eliminados:', err);
    }
  }, [isAdmin, supabase]);

  const fetchDocuments = useCallback(async () => {
    try {
      const results = createEmptyDocumentsMap();

      await Promise.all(
        DOCUMENT_TYPES.map(async (type) => {
          const { data, error } = await supabase.storage
            .from(STORAGE_BUCKET)
            .list(type.id, {
              limit: 50,
              offset: 0,
              sortBy: { column: 'updated_at', order: 'desc' },
            });

          if (error) {
            console.warn(`No se pudo listar ${type.name}:`, error.message);
            results[type.id] = [];
            return;
          }

          results[type.id] =
            data?.map((file) => ({
              typeId: type.id,
              ...(() => {
                const { booking, originalName, instructivoIndex } = parseStoredDocumentName(file.name);
                return {
                  booking,
                  name: formatFileDisplayName(originalName),
                  instructivoIndex,
                };
              })(),
              path: `${type.id}/${file.name}`,
              updatedAt: file.updated_at ?? file.created_at ?? null,
            })) ?? [];
        }),
      );

      setDocumentsByType(results);
    } catch (err) {
      console.error('Error cargando documentos:', err);
      showError('No pudimos cargar los documentos.');
    }
  }, [showError, supabase]);

  useEffect(() => {
    if (currentUser !== undefined) {
      void loadRegistros();
      void loadFacturas();
      // Cargar documentos eliminados primero, luego los documentos
      void loadDeletedDocuments().then(() => {
        void fetchDocuments();
      });
    }
  }, [currentUser, clientesAsignados, loadRegistros, loadFacturas, fetchDocuments, loadDeletedDocuments]);

  // Cerrar menú contextual al hacer click fuera
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(null);
    };
    if (contextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu]);

  const handleCrearFactura = (registro: Registro) => {
    setRegistroSeleccionado(registro);
    setIsCreatorOpen(true);
  };

  const handleVerFactura = (factura: Factura) => {
    setFacturaSeleccionada(factura);
    setIsViewerOpen(true);
  };

  const handleFacturaGuardada = () => {
    void loadFacturas();
    setIsCreatorOpen(false);
    setRegistroSeleccionado(null);
    success('Factura creada exitosamente');
  };

  const handleUpload = async (typeId: string, files: FileList | null, bookingOverride?: string) => {
    const bookingToUse = bookingOverride || selectedBooking;
    const normalizedBooking = normalizeBooking(bookingToUse);
    if (!normalizedBooking) {
      showError('Ingresa un booking válido antes de subir un documento.');
      return;
    }

    // Validar que el booking pertenezca a los registros permitidos (filtrados por clientes asignados)
    const esAdmin = currentUser?.rol === 'admin';
    if (!esAdmin && clientesAsignados.length > 0) {
      const bookingExiste = registros.some(
        (r) => normalizeBooking(r.booking) === normalizedBooking &&
          (clientesAsignados.includes(r.shipper) || clientesAsignados.length === 0)
      );
      if (!bookingExiste) {
        showError('No tienes permisos para subir documentos de este booking.');
        return;
      }
    }

    if (!files || files.length === 0) {
      return;
    }

    const fileArray = Array.from(files);
    const hasInvalidFormat = fileArray.some((file) => {
      const extension = file.name.split('.').pop()?.toLowerCase();
      return !extension || !allowedExtensions.includes(extension);
    });

    if (hasInvalidFormat) {
      showError('Solo se admiten archivos PDF o Excel (.xls, .xlsx).');
      return;
    }

    try {
      setUploadingType(typeId);
      setUploadingBooking(normalizedBooking);
      setUploadProgress(10);

      const bookingSegment = encodeURIComponent(normalizedBooking);

      // Obtener el registro para saber cuántos contenedores tiene
      const registro = registros.find(r => normalizeBooking(r.booking) === normalizedBooking);
      const contenedores = registro?.contenedor
        ? (Array.isArray(registro.contenedor) ? registro.contenedor : [registro.contenedor])
        : [];
      const numContenedores = contenedores.length || 1;

      // Para instructivos, mantener el índice para identificarlos, pero no crear filas separadas
      // Para otros documentos, no necesitamos asociarlos a instructivos específicos
      let currentInstructivoIndex: number | null = null;

      if (typeId === 'instructivo-embarque') {
        // Si es un instructivo, contar cuántos ya existen para asignar el siguiente índice
        const existingInstructivos = filteredDocumentsByType['instructivo-embarque']?.filter(
          (doc) => doc.booking && normalizeBooking(doc.booking) === normalizedBooking
        ) || [];
        const maxIndex = existingInstructivos.reduce((max, doc) => {
          const idx = doc.instructivoIndex ?? 0;
          return Math.max(max, idx);
        }, -1);
        currentInstructivoIndex = maxIndex + 1;
      }
      // Para otros documentos, no asociarlos a instructivos específicos (instructivoIndex = null)

      // Subir cada archivo
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        const safeName = sanitizeFileName(file.name);
        let filePath: string;

        // Si es instructivo y hay múltiples archivos, incrementar el índice para cada uno
        if (typeId === 'instructivo-embarque' && currentInstructivoIndex !== null) {
          const fileInstructivoIndex = currentInstructivoIndex + i;
          filePath = `${typeId}/${bookingSegment}__instructivo-${fileInstructivoIndex}__${Date.now()}-${i}-${safeName}`;
        } else {
          // Para otros documentos, no incluir instructivoIndex en el nombre
          filePath = `${typeId}/${bookingSegment}__${Date.now()}-${i}-${safeName}`;
        }

        const { error } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (error) {
          throw error;
        }

        setUploadProgress((prev) => Math.min(prev + Math.round(70 / fileArray.length), 95));
      }

      await fetchDocuments();
      setUploadProgress(100);
      success('Documento cargado correctamente.');
    } catch (err) {
      console.error('Error subiendo documento:', err);
      showError('No pudimos subir el documento. Intenta nuevamente.');
    } finally {
      setTimeout(() => {
        setUploadingType(null);
        setUploadingBooking(null);
        setUploadProgress(0);
      }, 800);
    }
  };

  const handleDownload = async (doc: StoredDocument) => {
    try {
      setDownloadUrlLoading(doc.path);
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(doc.path, 60);

      if (error || !data?.signedUrl) {
        throw error;
      }

      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('Error descargando documento:', err);
      showError('No pudimos descargar el archivo.');
    } finally {
      setDownloadUrlLoading(null);
    }
  };

  const handleDeleteDocument = async (doc: StoredDocument) => {
    if (!isAdmin) {
      showError('Solo los administradores pueden eliminar documentos.');
      return;
    }

    if (!confirm(`¿Estás seguro de que deseas eliminar "${doc.name}"?\n\nEl documento se moverá a la papelera y se eliminará permanentemente después de 7 días.`)) {
      return;
    }

    try {
      setIsDeleting(doc.path);

      // Mover archivo a carpeta "papelera" en storage
      const papeleraPath = `papelera/${doc.path}`;

      // Copiar archivo a papelera
      const { data: fileData, error: readError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .download(doc.path);

      if (readError || !fileData) {
        throw readError || new Error('No se pudo leer el archivo');
      }

      // Subir a papelera
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(papeleraPath, fileData, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Registrar eliminación en la tabla
      const { error: insertError } = await supabase
        .from('documentos_eliminados')
        .insert({
          file_path: doc.path,
          type_id: doc.typeId,
          booking: doc.booking,
          original_name: doc.name,
          deleted_by: currentUser?.id || null,
        });

      if (insertError) {
        console.error('Error registrando eliminación:', insertError);
        // Continuar aunque falle el registro, el archivo ya está en papelera
      }

      // Eliminar archivo original
      const { error: deleteError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([doc.path]);

      if (deleteError) {
        console.warn('Error eliminando archivo original:', deleteError);
        // Continuar aunque falle, el archivo ya está en papelera
      }

      // Actualizar estado local
      setDeletedDocuments((prev) => new Set([...prev, doc.path]));

      // Recargar documentos
      await fetchDocuments();
      await loadDeletedDocuments();

      success('Documento movido a la papelera. Se eliminará permanentemente después de 7 días.');
    } catch (err) {
      console.error('Error eliminando documento:', err);
      showError('No pudimos eliminar el documento. Intenta nuevamente.');
    } finally {
      setIsDeleting(null);
      setContextMenu(null);
    }
  };

  const handleInspectBooking = () => {
    const normalized = normalizeBooking(searchBookingInput);
    if (!normalized) {
      showError('Ingresa un booking válido para buscar.');
      return;
    }
    setSearchBookingInput(normalized);
    setSelectedBooking(normalized);
    setInspectedBooking(normalized);
  };

  const registrosFiltrados = useMemo(() => {
    let filtered = registros;

    // Filtrar por temporada si está seleccionada
    if (selectedTemporada) {
      filtered = filtered.filter((registro) => normalizeTemporada(registro.temporada) === selectedTemporada);
    }

    // Filtrar por permisos de usuario si no es admin/ejecutivo
    // Si tiene clientes asignados, ya está filtrado por clientes en loadRegistros
    // Si no tiene clientes asignados, filtrar solo por registros que creó
    const esAdmin = currentUser?.rol === 'admin';
    if (!esAdmin && !isAdminOrEjecutivo && currentUser?.id && clientesAsignados.length === 0) {
      const allowedRefAsli = new Set(
        registros
          .filter((r) => r.createdBy === currentUser.id || r.usuario === currentUser.nombre)
          .map((r) => r.refAsli),
      );
      filtered = filtered.filter((r) => allowedRefAsli.has(r.refAsli));
    }

    return filtered;
  }, [registros, selectedTemporada, isAdminOrEjecutivo, currentUser, clientesAsignados]);

  const facturasFiltradas = useMemo(() => {
    if (!selectedTemporada && isAdminOrEjecutivo) {
      return facturas;
    }
    const refsPermitidos = new Set(registrosFiltrados.map((registro) => registro.refAsli));
    return facturas.filter((factura) => refsPermitidos.has(factura.refAsli));
  }, [facturas, registrosFiltrados, selectedTemporada, isAdminOrEjecutivo]);

  const registrosSinFactura = useMemo(() => {
    const facturasPorRegistro = new Set(facturasFiltradas.map((f) => f.registroId));
    return registrosFiltrados.filter((r) => r.id && !facturasPorRegistro.has(r.id));
  }, [registrosFiltrados, facturasFiltradas]);

  const bookingOptions = useMemo(() => {
    const set = new Set(
      registrosFiltrados
        .map((r) => r.booking?.trim())
        .filter((booking): booking is string => Boolean(booking && booking.length > 0)),
    );
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
  }, [registrosFiltrados]);

  const temporadasDisponibles = useMemo(() => {
    const set = new Set(
      registros
        .map((r) => normalizeTemporada(r.temporada))
        .filter((t): t is string => Boolean(t && t.length > 0)),
    );
    return Array.from(set).sort((a, b) => {
      // Ordenar numéricamente si son números, sino alfabéticamente
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numB - numA; // Más reciente primero
      }
      return b.localeCompare(a, 'es', { sensitivity: 'base' });
    });
  }, [registros]);

  useEffect(() => {
    if (bookingOptions.length === 0) {
      setSelectedBooking('');
      setSearchBookingInput('');
      setInspectedBooking('');
      return;
    }
    if (!selectedBooking && !searchBookingInput) {
      const first = normalizeBooking(bookingOptions[0]);
      setSelectedBooking(first);
      setSearchBookingInput(first);
      setInspectedBooking(first);
    }
  }, [bookingOptions, selectedBooking, searchBookingInput]);

  const bookingMap = useMemo(() => {
    const map = new Map<string, Registro>();
    registrosFiltrados.forEach((registro) => {
      const key = normalizeBooking(registro.booking);
      if (key) {
        map.set(key, registro);
      }
    });
    return map;
  }, [registrosFiltrados]);

  const allowedBookingsSet = useMemo(() => {
    const set = new Set(
      registrosFiltrados
        .map((r) => normalizeBooking(r.booking))
        .filter((booking): booking is string => Boolean(booking && booking.length > 0)),
    );
    return set;
  }, [registrosFiltrados]);

  const filteredDocumentsByType = useMemo(() => {
    const next = createEmptyDocumentsMap();
    const esAdmin = currentUser?.rol === 'admin';

    Object.entries(documentsByType).forEach(([typeId, docs]) => {
      next[typeId] = docs.filter((doc) => {
        if (deletedDocuments.has(doc.path)) {
          return false;
        }

        const bookingKey = doc.booking ? normalizeBooking(doc.booking) : '';

        // Si hay temporada seleccionada, filtrar por bookings de esa temporada
        if (selectedTemporada) {
          return bookingKey ? allowedBookingsSet.has(bookingKey) : false;
        }

        // Si es admin, mostrar todos los documentos
        if (esAdmin) {
          return true;
        }

        // Para ejecutivos y usuarios con clientes asignados, filtrar por bookings permitidos
        if (clientesAsignados.length > 0) {
          return bookingKey ? allowedBookingsSet.has(bookingKey) : false;
        }

        // Para usuarios normales sin clientes asignados, filtrar por bookings de sus registros
        if (!isAdminOrEjecutivo) {
          return bookingKey ? allowedBookingsSet.has(bookingKey) : false;
        }

        // Para ejecutivos sin clientes asignados, mostrar todos
        return true;
      });
    });
    return next;
  }, [documentsByType, allowedBookingsSet, isAdminOrEjecutivo, selectedTemporada, clientesAsignados, currentUser, deletedDocuments]);

  const documentsByBookingMap = useMemo(() => {
    const map = new Map<string, Record<string, StoredDocument[]>>();
    Object.entries(filteredDocumentsByType).forEach(([typeId, docs]) => {
      docs.forEach((doc) => {
        if (!doc.booking) return;
        const bookingKey = normalizeBooking(doc.booking);
        if (!bookingKey) return;
        if (!map.has(bookingKey)) {
          map.set(bookingKey, {});
        }
        const entry = map.get(bookingKey)!;
        if (!entry[typeId]) {
          entry[typeId] = [];
        }
        entry[typeId]!.push(doc);
      });
    });
    return map;
  }, [filteredDocumentsByType]);

  const bookingsWithDocs = useMemo(() => {
    const rows: {
      booking: string;
      bookingKey: string;
      cliente: string;
      registro: Registro;
      docsByType: Record<string, StoredDocument[]>;
      hasPending: boolean;
      instructivoIndex: number | null;
    }[] = [];

    bookingMap.forEach((registro, bookingKey) => {
      const docsForBooking = documentsByBookingMap.get(bookingKey) || {};

      // Crear UNA SOLA fila por booking, mostrando TODOS los documentos
      // No crear filas separadas por instructivo
      const missing = DOCUMENT_TYPES.filter((type) => !(docsForBooking[type.id]?.length));

      rows.push({
        booking: registro.booking || bookingKey,
        bookingKey,
        cliente: registro.shipper || '-',
        registro,
        docsByType: docsForBooking, // Todos los documentos del booking, sin filtrar por instructivo
        hasPending: missing.length > 0,
        instructivoIndex: null, // Ya no usamos instructivoIndex para separar filas
      });
    });

    return rows.sort((a, b) => {
      // Ordenar solo por booking
      return a.booking.localeCompare(b.booking, 'es', { sensitivity: 'base', numeric: true });
    });
  }, [bookingMap, documentsByBookingMap]);

  const pendingBookings = useMemo(() => {
    return bookingsWithDocs.filter((row) => {
      const missing = DOCUMENT_TYPES.filter((type) => !(row.docsByType[type.id]?.length));
      return missing.length > 0;
    });
  }, [bookingsWithDocs]);

  const totalUploadedDocs = useMemo(
    () => Object.values(filteredDocumentsByType).reduce((sum, docs) => sum + docs.length, 0),
    [filteredDocumentsByType],
  );

  const inspectedBookingKey = normalizeBooking(inspectedBooking);
  const inspectedRegistro = inspectedBookingKey ? bookingMap.get(inspectedBookingKey) : null;
  const inspectedDocsByType = useMemo(() => {
    if (!inspectedBookingKey) {
      return {};
    }
    const result: Record<string, StoredDocument[]> = {};
    DOCUMENT_TYPES.forEach((type) => {
      result[type.id] = filteredDocumentsByType[type.id]?.filter(
        (doc) => doc.booking && normalizeBooking(doc.booking) === inspectedBookingKey,
      );
    });
    return result;
  }, [filteredDocumentsByType, inspectedBookingKey]);

  if (loading) {
    return <LoadingScreen message="Cargando documentos..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-8 sm:px-6 lg:px-0">

        <DocumentFilters
          searchBookingInput={searchBookingInput}
          setSearchBookingInput={setSearchBookingInput}
          handleInspectBooking={handleInspectBooking}
          inspectedBooking={inspectedBooking}
          inspectedRegistro={inspectedRegistro}
          inspectedDocsByType={inspectedDocsByType}
          selectedTemporada={selectedTemporada}
          setSelectedTemporada={setSelectedTemporada}
          temporadasDisponibles={temporadasDisponibles}
          totalUploadedDocs={totalUploadedDocs}
          facturasCount={facturasFiltradas.length}
          registrosSinFacturaCount={registrosSinFactura.length}
        />

        <DocumentList
          bookingsWithDocs={bookingsWithDocs}
          pendingBookingsCount={pendingBookings.length}
          uploadingBooking={uploadingBooking}
          uploadingType={uploadingType}
          downloadUrlLoading={downloadUrlLoading}
          isDeleting={isDeleting}
          isAdmin={isAdmin}
          isAdminOrEjecutivo={isAdminOrEjecutivo}
          handleDownload={handleDownload}
          handleDeleteDocument={handleDeleteDocument}
          handleUpload={handleUpload}
          setContextMenu={setContextMenu}
        />

      </div>

      <AppFooter className="mx-auto mb-10 mt-4 w-full max-w-6xl" />

      {isCreatorOpen && registroSeleccionado && (
        <FacturaCreator
          registro={registroSeleccionado}
          isOpen={isCreatorOpen}
          onClose={() => {
            setIsCreatorOpen(false);
            setRegistroSeleccionado(null);
          }}
          onSave={handleFacturaGuardada}
        />
      )}

      {isViewerOpen && facturaSeleccionada && (
        <FacturaViewer
          factura={facturaSeleccionada}
          isOpen={isViewerOpen}
          onClose={() => {
            setIsViewerOpen(false);
            setFacturaSeleccionada(null);
          }}
          onUpdate={() => {
            loadFacturas();
          }}
        />
      )}

      {/* Menú contextual para administrar documentos */}
      {contextMenu && isAdmin && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setContextMenu(null)}
          />
          <div
            className="fixed z-50 min-w-[200px] rounded-lg border border-slate-700 bg-slate-900 shadow-xl"
            style={{
              left: `${contextMenu.x}px`,
              top: `${contextMenu.y}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-1">
              <div className="mb-1 border-b border-slate-700 px-2 py-1.5">
                <p className="text-xs font-semibold text-slate-300">{contextMenu.doc.name}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  handleDownload(contextMenu.doc);
                  setContextMenu(null);
                }}
                disabled={downloadUrlLoading === contextMenu.doc.path}
                className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-sky-400 hover:bg-slate-800 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                <span>{downloadUrlLoading === contextMenu.doc.path ? 'Descargando…' : 'Descargar'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleDeleteDocument(contextMenu.doc);
                  setContextMenu(null);
                }}
                disabled={isDeleting === contextMenu.doc.path}
                className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-red-400 hover:bg-slate-800 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                <span>{isDeleting === contextMenu.doc.path ? 'Eliminando…' : 'Eliminar'}</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
