'use client';
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { useUser } from '@/hooks/useUser';
import { Registro } from '@/types/registros';
import { Factura } from '@/types/factura';
import {
  FileText,
  Download,
  Eye,
  ArrowLeft,
  CloudUpload,
  FileSpreadsheet,
  ClipboardList,
  FileSignature,
  FileArchive,
  FileBox,
  NotebookPen,
  Search,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { FacturaCreator } from '@/components/FacturaCreator';
import { FacturaViewer } from '@/components/FacturaViewer';
import { useToast } from '@/hooks/useToast';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { AppFooter } from '@/components/AppFooter';

type DocumentType = {
  id: string;
  name: string;
  description: string;
  formats: string[];
  icon: typeof FileText;
  accent: string;
  gradient: string;
};

type StoredDocument = {
  typeId: string;
  name: string;
  path: string;
  booking: string | null;
  updatedAt: string | null;
};

const STORAGE_BUCKET = 'documentos';

const DOCUMENT_TYPES: DocumentType[] = [
  {
    id: 'booking',
    name: 'Booking PDF',
    description: 'Reservas confirmadas con la naviera.',
    formats: ['PDF'],
    icon: FileSpreadsheet,
    accent: 'text-cyan-300',
    gradient: 'from-cyan-500/15 to-slate-900/60',
  },
  {
    id: 'factura-proforma',
    name: 'Factura Proforma',
    description: 'Cotizaciones previas a la factura comercial.',
    formats: ['PDF', 'XLSX'],
    icon: FileSignature,
    accent: 'text-sky-300',
    gradient: 'from-sky-500/15 to-slate-900/60',
  },
  {
    id: 'instructivo-embarque',
    name: 'Instructivo de Embarque',
    description: 'Indicaciones para navieras y transporte.',
    formats: ['PDF'],
    icon: ClipboardList,
    accent: 'text-emerald-300',
    gradient: 'from-emerald-500/15 to-slate-900/60',
  },
  {
    id: 'packing-list',
    name: 'Packing List',
    description: 'Contenido detallado del embarque.',
    formats: ['PDF', 'XLSX'],
    icon: FileBox,
    accent: 'text-amber-300',
    gradient: 'from-amber-500/15 to-slate-900/60',
  },
  {
    id: 'guia-despacho',
    name: 'Guía de Despacho',
    description: 'Documentos de traslado nacional.',
    formats: ['PDF'],
    icon: NotebookPen,
    accent: 'text-indigo-300',
    gradient: 'from-indigo-500/15 to-slate-900/60',
  },
  {
    id: 'documentos-aga',
    name: 'Documentos AGA',
    description: 'Libera mercancía ante Aduanas y SAG.',
    formats: ['PDF'],
    icon: FileArchive,
    accent: 'text-fuchsia-300',
    gradient: 'from-fuchsia-500/15 to-slate-900/60',
  },
  {
    id: 'bl',
    name: 'BL / MBL / HBL',
    description: 'Conocimientos de embarque firmados.',
    formats: ['PDF'],
    icon: FileText,
    accent: 'text-rose-300',
    gradient: 'from-rose-500/15 to-slate-900/60',
  },
  {
    id: 'cert-origen',
    name: 'Cert. Origen',
    description: 'Certificado de origen de la mercancía.',
    formats: ['PDF'],
    icon: FileText,
    accent: 'text-violet-300',
    gradient: 'from-violet-500/15 to-slate-900/60',
  },
  {
    id: 'cert-fito',
    name: 'Cert Fito',
    description: 'Certificado fitosanitario.',
    formats: ['PDF'],
    icon: FileText,
    accent: 'text-teal-300',
    gradient: 'from-teal-500/15 to-slate-900/60',
  },
];

const createEmptyDocumentsMap = () =>
  DOCUMENT_TYPES.reduce<Record<string, StoredDocument[]>>((acc, type) => {
    acc[type.id] = [];
    return acc;
  }, {});

const allowedExtensions = ['pdf', 'xls', 'xlsx'];

const sanitizeFileName = (name: string) => {
  const cleanName = name.toLowerCase().replace(/[^a-z0-9.\-]/g, '-');
  const [base, ext] = cleanName.split(/\.(?=[^.\s]+$)/);
  const safeBase = base?.replace(/-+/g, '-').replace(/^-|-$/g, '') || `archivo-${Date.now()}`;
  return `${safeBase}.${ext || 'pdf'}`;
};

const formatFileDisplayName = (name: string) => name.replace(/^\d+-/, '').replace(/[_-]+/g, ' ');

const normalizeBooking = (value?: string | null) => (value ?? '').trim().toUpperCase();

const normalizeTemporada = (value?: string | null): string => {
  if (!value) {
    return '';
  }
  return value.toString().replace(/^Temporada\s+/i, '').trim();
};

const parseStoredDocumentName = (fileName: string) => {
  const separatorIndex = fileName.indexOf('__');
  if (separatorIndex === -1) {
    return { booking: null as string | null, originalName: fileName };
  }

  const bookingSegment = fileName.slice(0, separatorIndex);
  const originalName = fileName.slice(separatorIndex + 2);

  try {
    return { booking: decodeURIComponent(bookingSegment), originalName };
  } catch {
    return { booking: bookingSegment, originalName };
  }
};

export default function DocumentosPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser, setCurrentUser } = useUser();
  const { success, error: showError } = useToast();
  const supabase = createClient();
  
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
  
  const temporadaParam = searchParams?.get('temporada');
  const isAdminOrEjecutivo = (currentUser?.rol === 'admin') || Boolean(currentUser?.email?.endsWith('@asli.cl'));

  // Inicializar temporada desde URL params o establecer "25-26" por defecto
  useEffect(() => {
    if (temporadaParam) {
      const normalized = normalizeTemporada(temporadaParam);
      if (normalized) {
        setSelectedTemporada(normalized);
      }
    } else {
      // Establecer "25-26" por defecto si no hay temporada en la URL
      const defaultTemporada = '25-26';
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
    } catch (err) {
      console.error('Error checking user:', err);
      router.push('/auth');
    }
  };

  const loadRegistros = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('registros')
        .select('*')
        .is('deleted_at', null)
        .order('ingresado', { ascending: false });

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
  }, [showError, supabase]);

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
                const { booking, originalName } = parseStoredDocumentName(file.name);
                return {
                  booking,
                  name: formatFileDisplayName(originalName),
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
      void fetchDocuments();
    }
  }, [currentUser, loadRegistros, loadFacturas, fetchDocuments]);

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

      for (const file of fileArray) {
        const safeName = sanitizeFileName(file.name);
        const filePath = `${typeId}/${bookingSegment}__${Date.now()}-${safeName}`;
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

  const handleFileInputChange = (typeId: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    void handleUpload(typeId, event.target.files);
    event.target.value = '';
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
    if (!isAdminOrEjecutivo && currentUser?.id) {
      const allowedRefAsli = new Set(
        registros
          .filter((r) => r.createdBy === currentUser.id || r.usuario === currentUser.nombre)
          .map((r) => r.refAsli),
      );
      filtered = filtered.filter((r) => allowedRefAsli.has(r.refAsli));
    }

    return filtered;
  }, [registros, selectedTemporada, isAdminOrEjecutivo, currentUser]);

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
    Object.entries(documentsByType).forEach(([typeId, docs]) => {
      next[typeId] = docs.filter((doc) => {
        const bookingKey = doc.booking ? normalizeBooking(doc.booking) : '';
        if (selectedTemporada) {
          return bookingKey ? allowedBookingsSet.has(bookingKey) : false;
        }
        if (!isAdminOrEjecutivo) {
          return bookingKey ? allowedBookingsSet.has(bookingKey) : false;
        }
        return true;
      });
    });
    return next;
  }, [documentsByType, allowedBookingsSet, isAdminOrEjecutivo, selectedTemporada]);

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
    }[] = [];
    bookingMap.forEach((registro, bookingKey) => {
      const docsForBooking = documentsByBookingMap.get(bookingKey) || {};
      const missing = DOCUMENT_TYPES.filter((type) => !(docsForBooking[type.id]?.length));
      rows.push({
        booking: registro.booking || bookingKey,
        bookingKey,
        cliente: registro.shipper || '-',
        registro,
        docsByType: docsForBooking,
        hasPending: missing.length > 0,
      });
    });
    return rows.sort((a, b) => {
      // Ordenar por booking primero (alfabético/numerico)
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
        <section className="space-y-4 rounded-3xl border border-slate-800/70 bg-slate-950/70 p-5 shadow-xl shadow-slate-950/30">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Estado por booking</p>
              <h2 className="text-lg font-semibold text-white">Busca un booking y revisa sus documentos</h2>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <input
                value={searchBookingInput}
                onChange={(event) => setSearchBookingInput(event.target.value.toUpperCase())}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleInspectBooking();
                  }
                }}
                placeholder="Ej. BK123456"
                className="flex-1 rounded-2xl border border-slate-800/70 bg-slate-950 px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
              />
              <button
                type="button"
                onClick={handleInspectBooking}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-600/90 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-900/40 transition hover:bg-sky-500"
              >
                <Search className="h-4 w-4" aria-hidden="true" />
                Ver estado
              </button>
          </div>
        </div>

          {inspectedBooking && (
            <div className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4">
              {inspectedRegistro ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-800/60 bg-slate-900/50 p-4">
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Detalles del booking</p>
                      <div className="mt-2 space-y-1 text-sm text-slate-300">
                        <p><span className="text-slate-500">Booking:</span> {inspectedRegistro.booking || '-'}</p>
                        <p><span className="text-slate-500">REF ASLI:</span> {inspectedRegistro.refAsli || '-'}</p>
                        <p><span className="text-slate-500">Cliente:</span> {inspectedRegistro.shipper || '-'}</p>
                        <p><span className="text-slate-500">Naviera:</span> {inspectedRegistro.naviera || '-'}</p>
                        <p><span className="text-slate-500">Temporada:</span> {inspectedRegistro.temporada || '-'}</p>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-800/60 bg-slate-900/50 p-4">
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Documentos faltantes</p>
                      <ul className="mt-2 space-y-2 text-xs text-slate-300">
                        {DOCUMENT_TYPES.map((type) => {
                          const docsForType = inspectedDocsByType[type.id] ?? [];
                          const hasDoc = docsForType.length > 0;
                          return (
                            <li key={type.id} className="flex items-center gap-2">
                              {hasDoc ? (
                                <CheckCircle className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-amber-400" aria-hidden="true" />
                              )}
                              <span className="text-sm text-slate-200">{type.name}</span>
                              <span className="text-xs text-slate-500">{hasDoc ? 'Completado' : 'Pendiente'}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  No encontramos el booking “{inspectedBooking}” en los registros visibles.
            </div>
              )}
            </div>
          )}
        </section>
        <header className="space-y-6">
          <button
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center gap-2 rounded-full border border-slate-800/70 px-4 py-2 text-sm text-slate-300 transition hover:border-sky-500/60 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver al panel
          </button>
          <div className="rounded-3xl border border-slate-800/70 bg-slate-950/70 p-6 shadow-xl shadow-slate-900/40">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Centro documental</p>
                <h1 className="mt-2 text-3xl font-semibold text-white">Documentos de embarque</h1>
                <p className="mt-2 text-sm text-slate-400">
                  Sube archivos PDF o Excel para cada etapa: proforma, instructivo, packing, booking o BL. Nosotros los
                  guardamos con su etiqueta correspondiente.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:min-w-[200px]">
                <label htmlFor="temporada-select" className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Temporada
                </label>
                <select
                  id="temporada-select"
                  value={selectedTemporada || ''}
                  onChange={(event) => {
                    const value = event.target.value || null;
                    setSelectedTemporada(value);
                    // Actualizar URL sin recargar
                    const params = new URLSearchParams(window.location.search);
                    if (value) {
                      params.set('temporada', value);
                    } else {
                      params.delete('temporada');
                    }
                    router.push(`/documentos?${params.toString()}`, { scroll: false });
                  }}
                  className="rounded-2xl border border-slate-800/70 bg-slate-950 px-4 py-2 text-sm text-white focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                >
                  <option value="">Todas las temporadas</option>
                  {temporadasDisponibles.map((temporada) => (
                    <option key={temporada} value={temporada}>
                      Temporada {temporada}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-6 grid gap-3 text-xs text-slate-400 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Documentos cargados</p>
                <p className="mt-1 text-2xl font-semibold text-white">{totalUploadedDocs}</p>
              </div>
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Facturas generadas</p>
                <p className="mt-1 text-2xl font-semibold text-white">{facturasFiltradas.length}</p>
              </div>
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Registros sin factura</p>
                <p className="mt-1 text-2xl font-semibold text-white">{registrosSinFactura.length}</p>
              </div>
            </div>
          </div>
        </header>


        <section className="rounded-3xl border border-slate-800/70 bg-slate-950/70 p-5 shadow-xl shadow-slate-950/30">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Seguimiento</p>
              <h2 className="text-lg font-semibold text-white">Bookings con documentos pendientes</h2>
            </div>
            <span className="text-sm text-slate-400">
              {pendingBookings.length} booking{pendingBookings.length === 1 ? '' : 's'} por completar
            </span>
          </div>
          {bookingsWithDocs.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-slate-700/70 bg-slate-950/40 px-4 py-6 text-center text-sm text-slate-400">
              No encontramos bookings disponibles en esta temporada o con tus permisos.
            </div>
          ) : (
            <div className="mt-4 max-h-[560px] overflow-x-auto overflow-y-auto rounded-2xl border border-slate-800/60">
              <table className="w-full text-sm">
                <thead className="bg-slate-900/60 text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold sticky left-0 bg-slate-950 z-10">Booking</th>
                    <th className="px-4 py-3 text-left font-semibold">Cliente</th>
                    {DOCUMENT_TYPES.map((type) => {
                      const IconComponent = type.icon;
                      return (
                        <th key={type.id} className="px-3 py-3 text-center font-semibold min-w-[140px]">
                          <div className="flex flex-col items-center gap-1">
                            <IconComponent className="h-4 w-4" aria-hidden="true" />
                            <span className="text-[10px] leading-tight">{type.name}</span>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {bookingsWithDocs.map((row) => {
                    const isUploadingForThisBooking = uploadingBooking && row.bookingKey === normalizeBooking(uploadingBooking);
                    return (
                      <tr key={row.booking} className="hover:bg-slate-900/40">
                        <td className="px-4 py-3 font-semibold text-white sticky left-0 bg-slate-950 z-10">
                          {row.booking}
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {row.cliente}
                        </td>
                        {DOCUMENT_TYPES.map((type) => {
                          const docsForType = row.docsByType[type.id] ?? [];
                          const hasDoc = docsForType.length > 0;
                          const doc = docsForType[0];
                          const isUploading = isUploadingForThisBooking && uploadingType === type.id;
                          const uploadKey = `upload-${row.bookingKey}-${type.id}`;

                          return (
                            <td key={type.id} className="px-3 py-3 text-center">
                              {hasDoc ? (
                                <div className="flex flex-col items-center gap-1">
                                  <CheckCircle className="h-5 w-5 text-emerald-400" aria-hidden="true" />
                                  <button
                                    type="button"
                                    onClick={() => doc && handleDownload(doc)}
                                    disabled={downloadUrlLoading === doc.path}
                                    className="text-[10px] text-slate-400 hover:text-sky-300 transition disabled:opacity-60"
                                    title={doc.name}
                                  >
                                    {downloadUrlLoading === doc.path ? 'Generando…' : 'Ver'}
                                  </button>
                                </div>
                              ) : (
                                <label
                                  htmlFor={uploadKey}
                                  className="flex flex-col items-center gap-1 cursor-pointer group"
                                >
                                  <div className="relative">
                                    <AlertCircle className="h-5 w-5 text-amber-400 group-hover:text-amber-300 transition" aria-hidden="true" />
                                    {isUploading && (
                                      <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="h-3 w-3 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                                      </div>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-slate-400 group-hover:text-sky-300 transition">
                                    Subir
                                  </span>
                                  <input
                                    id={uploadKey}
                                    type="file"
                                    className="sr-only"
                                    accept=".pdf,.xls,.xlsx"
                                    onChange={(event) => {
                                      void handleUpload(type.id, event.target.files, row.booking);
                                      event.target.value = '';
                                    }}
                                  />
                                </label>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

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
    </div>
  );
}

