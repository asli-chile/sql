'use client';
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { LogOut, User as UserIcon, ChevronLeft, ChevronRight, Filter, Settings, X, Menu, Users, LayoutDashboard, Ship, Truck, Globe, Trash2, FileText, BarChart3, DollarSign, Package, CheckCircle, Container, Receipt, AlertTriangle, Loader2, Download } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

// Importar todos los componentes existentes
import { DataTable } from '@/components/ui/table/DataTable';
import { FiltersPanel } from '@/components/ui/table/FiltersPanel';
import { ColumnToggleInline } from '@/components/ui/table/ColumnToggleInline';
import { createRegistrosColumns } from '@/components/columns/registros-columns';
import { EditModal } from '@/components/modals/EditModal';
import { AddModal } from '@/components/modals/AddModal';
import { TrashModal } from '@/components/modals/TrashModal';
import { HistorialModal } from '@/components/modals/HistorialModal';
import { EditNaveViajeModal } from '@/components/EditNaveViajeModal';
import { BookingModal } from '@/components/modals/BookingModal';
import { syncTransportesFromRegistro, syncMultipleTransportesFromRegistros } from '@/lib/sync-transportes';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/hooks/useUser';
import { useToast } from '@/hooks/useToast';
import { UserProfileModal } from '@/components/users/UserProfileModal';
import { ToastContainer } from '@/components/layout/Toast';
import { Sidebar } from '@/components/layout/Sidebar';
import { SidebarSection } from '@/types/layout';
import { EditingCellProvider } from '@/contexts/EditingCellContext';
import { Registro } from '@/types/registros';
import { convertSupabaseToApp } from '@/lib/migration-utils';
import { logHistoryEntry } from '@/lib/history';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Factura } from '@/types/factura';
import { FacturaViewer } from '@/components/facturas/FacturaViewer';
import { FacturaCreator } from '@/components/facturas/FacturaCreator';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { useRealtimeRegistros } from '@/hooks/useRealtimeRegistros';
import { parseStoredDocumentName, formatFileDisplayName, sanitizeFileName } from '@/utils/documentUtils';
import { generarFacturaPDF } from '@/lib/factura-pdf';
import { generarFacturaExcel } from '@/lib/factura-excel';


interface User {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string;
  };
}

export default function RegistrosPage() {
  const { theme } = useTheme();
  const { currentUser, setCurrentUser, transportesCount, registrosCount } = useUser();
  const { toasts, removeToast, success, error, warning } = useToast();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Estados para filtros y columnas del DataTable
  const [tableInstance, setTableInstance] = useState<any>(null);
  const [tableStates, setTableStates] = useState<{
    executiveFilter: string;
    setExecutiveFilter: (value: string) => void;
    columnToggleOptions: Array<{ id: string; header: string; visible: boolean }>;
    handleToggleColumn: (columnId: string) => void;
    handleToggleAllColumns: (visible: boolean) => void;
    alwaysVisibleColumns: string[];
    navesFiltrables: Array<[string, string]>;
  } | null>(null);

  // Callback para recibir la instancia de la tabla y sus estados
  const handleTableInstanceReady = useCallback((table: any, states: {
    executiveFilter: string;
    setExecutiveFilter: (value: string) => void;
    columnToggleOptions: Array<{ id: string; header: string; visible: boolean }>;
    handleToggleColumn: (columnId: string) => void;
    handleToggleAllColumns: (visible: boolean) => void;
    alwaysVisibleColumns: string[];
    navesFiltrables: Array<[string, string]>;
  }) => {
    setTableInstance(table);
    // Actualizar tableStates siempre para asegurar que tenga los valores más recientes
    setTableStates((prevStates) => {
      // Si la tabla cambió, usar los nuevos estados
      if (prevStates === null || prevStates.executiveFilter !== states.executiveFilter) {
        return states;
      }
      // Si solo cambió executiveFilter, actualizar solo ese campo
      return {
        ...prevStates,
        executiveFilter: states.executiveFilter,
        setExecutiveFilter: states.setExecutiveFilter,
      };
    });
  }, []);
  // Estados existentes del sistema de registros
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [navierasUnicas, setNavierasUnicas] = useState<string[]>([]);
  const [ejecutivosUnicos, setEjecutivosUnicos] = useState<string[]>([]);
  const [especiesUnicas, setEspeciesUnicas] = useState<string[]>([]);
  const [clientesUnicos, setClientesUnicos] = useState<string[]>([]);
  const [refExternasUnicas, setRefExternasUnicas] = useState<string[]>([]);
  const [polsUnicos, setPolsUnicos] = useState<string[]>([]);
  const [destinosUnicos, setDestinosUnicos] = useState<string[]>([]);
  const [depositosUnicos, setDepositosUnicos] = useState<string[]>([]);
  const [navesUnicas, setNavesUnicas] = useState<string[]>([]);
  const [fletesUnicos, setFletesUnicos] = useState<string[]>([]);
  const [cbmUnicos, setCbmUnicos] = useState<string[]>([]);
  const [contratosUnicos, setContratosUnicos] = useState<string[]>([]);
  const [tipoIngresoUnicos, setTipoIngresoUnicos] = useState<string[]>([]);
  const [estadosUnicos, setEstadosUnicos] = useState<string[]>([]);
  const [temperaturasUnicas, setTemperaturasUnicas] = useState<string[]>([]);
  const [co2sUnicos, setCo2sUnicos] = useState<string[]>([]);
  const [o2sUnicos, setO2sUnicos] = useState<string[]>([]);
  const [tratamientosFrioUnicos, setTratamientosFrioUnicos] = useState<string[]>([]);
  const [tiposAtmosferaUnicos, setTiposAtmosferaUnicos] = useState<string[]>([]);
  const [facturacionesUnicas, setFacturacionesUnicas] = useState<string[]>([]);

  const [navierasFiltro, setNavierasFiltro] = useState<string[]>([]);
  const [ejecutivosFiltro, setEjecutivosFiltro] = useState<string[]>([]);
  const [especiesFiltro, setEspeciesFiltro] = useState<string[]>([]);
  const [clientesFiltro, setClientesFiltro] = useState<string[]>([]);
  const [polsFiltro, setPolsFiltro] = useState<string[]>([]);
  const [destinosFiltro, setDestinosFiltro] = useState<string[]>([]);
  const [depositosFiltro, setDepositosFiltro] = useState<string[]>([]);
  const [navesFiltro, setNavesFiltro] = useState<string[]>([]);

  const [selectedRecord, setSelectedRecord] = useState<Registro | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isTrashModalOpen, setIsTrashModalOpen] = useState(false);
  const [trashCount, setTrashCount] = useState(0);
  const [isHistorialModalOpen, setIsHistorialModalOpen] = useState(false);
  const [selectedRegistroForHistorial, setSelectedRegistroForHistorial] = useState<Registro | null>(null);
  const [isEditNaveViajeModalOpen, setIsEditNaveViajeModalOpen] = useState(false);
  const [selectedRegistroForNaveViaje, setSelectedRegistroForNaveViaje] = useState<Registro | null>(null);
  const [selectedRecordsForNaveViaje, setSelectedRecordsForNaveViaje] = useState<Registro[]>([]);

  // Estados para modal de booking
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedRegistroForBooking, setSelectedRegistroForBooking] = useState<Registro | null>(null);

  // Estados para facturas
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [facturaSeleccionada, setFacturaSeleccionada] = useState<Factura | null>(null);
  const [isFacturaViewerOpen, setIsFacturaViewerOpen] = useState(false);
  const [registroSeleccionadoProforma, setRegistroSeleccionadoProforma] = useState<Registro | null>(null);
  const [isProformaCreatorOpen, setIsProformaCreatorOpen] = useState(false);

  // Estado para selección múltiple
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const lastSelectedRowIndex = useRef<number | null>(null);

  // Estado para clientes asignados al ejecutivo
  const [clientesAsignados, setClientesAsignados] = useState<string[]>([]);
  const [isEjecutivo, setIsEjecutivo] = useState(false);
  const isCliente = currentUser?.rol === 'cliente';
  const [showProfileModal, setShowProfileModal] = useState(false);

  type DeleteConfirmState = {
    registros: Registro[];
    mode: 'single' | 'bulk';
  };
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState | null>(null);
  const [deleteProcessing, setDeleteProcessing] = useState(false);

  const estadoParam = searchParams.get('estado');
  const idParam = searchParams.get('id');

  // Aplicar filtro de estado o ID desde query params cuando el DataTable esté listo
  useEffect(() => {
    if (tableInstance && tableStates) {
      if (idParam) {
        // Prioridad: Filtrar por ID si existe
        tableInstance.setColumnFilters((prev: any[]) => {
          const filtered = prev.filter((f: any) => f.id !== 'id' && f.id !== 'estado');
          return [...filtered, { id: 'id', value: idParam }];
        });
      } else if (estadoParam) {
        const estadoValue = estadoParam.toUpperCase();
        if (['PENDIENTE', 'CONFIRMADO', 'CANCELADO'].includes(estadoValue)) {
          // Aplicar el filtro de estado
          tableInstance.setColumnFilters((prev: any[]) => {
            const filtered = prev.filter((f: any) => f.id !== 'estado' && f.id !== 'id');
            return [...filtered, { id: 'estado', value: estadoValue }];
          });
        }
      } else {
        // Si no hay parámetros, limpiar filtros de estado e ID
        tableInstance.setColumnFilters((prev: any[]) =>
          prev.filter((f: any) => f.id !== 'estado' && f.id !== 'id')
        );
      }
    }
  }, [estadoParam, idParam, tableInstance, tableStates]);

  const registrosVisibles = useMemo(() => {
    return registros;
  }, [registros]);

  useEffect(() => {
    checkUser();
  }, []);


  useEffect(() => {
    if (!deleteConfirm) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !deleteProcessing) {
        event.preventDefault();
        setDeleteConfirm(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [deleteConfirm, deleteProcessing]);


  const checkUser = async () => {
    try {
      const supabase = createClient();
      const { data: { user }, error } = await supabase.auth.getUser();

      // Si hay error de refresh token, limpiar sesión y redirigir
      if (error) {
        // Si es un error de refresh token inválido, es esperado y no necesita log
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

      setUser(user);

      // SIEMPRE cargar datos frescos desde Supabase (fuente de verdad)
      // Limpiar localStorage para evitar datos obsoletos
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
        // Si no existe en la tabla usuarios, crear un usuario básico
        const basicUser = {
          id: user.id,
          nombre: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario',
          email: user.email || '',
          rol: 'usuario',
          activo: true
        };
        setCurrentUser(basicUser);
        setIsEjecutivo(false);
        setClientesAsignados([]);
      } else {
        // Establecer el usuario en el contexto con datos FRESCOS desde Supabase
        const usuarioActualizado = {
          id: userData.id,
          nombre: userData.nombre, // Nombre desde BD (fuente de verdad)
          email: userData.email,
          rol: userData.rol,
          activo: userData.activo,
          cliente_nombre: userData.cliente_nombre ?? null,
          clientes_asignados: userData.clientes_asignados ?? [],
        };
        setCurrentUser(usuarioActualizado);

        // Verificar si es ejecutivo por rol
        const esEjecutivo = userData.rol === 'ejecutivo';
        setIsEjecutivo(esEjecutivo);

        if (userData.rol === 'cliente') {
          const clienteNombre = userData.cliente_nombre?.trim();
          const clientesCliente = clienteNombre ? [clienteNombre] : [];
          setClientesAsignados(clientesCliente);
          // Actualizar currentUser con los clientes para clientes
          setCurrentUser({
            ...usuarioActualizado,
            clientes_asignados: clientesCliente,
          });
        } else {
          // Cargar clientes asignados (tanto para ejecutivos como para verificar coincidencias)
          // La función loadClientesAsignados ya actualiza currentUser automáticamente
          await loadClientesAsignados(userData.id, userData.nombre);
        }

      }

      // Cargar catálogos (después de establecer isEjecutivo y clientesAsignados)
      await loadCatalogos();

      // Cargar registros (depende de clientes asignados si es ejecutivo)
      await loadRegistros();
      await loadFacturas();
    } catch (error: any) {
      // Solo loguear errores que no sean de refresh token
      if (!error?.message?.includes('Refresh Token') && !error?.message?.includes('JWT')) {
        console.error('Error checking user:', error);
      }
      router.push('/auth');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      setCurrentUser(null); // Limpiar el contexto de usuario
      router.push('/auth');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  // Función para cargar clientes asignados a un ejecutivo
  // También verifica si el nombre de usuario coincide con un cliente
  const loadClientesAsignados = async (ejecutivoId: string, nombreUsuario?: string) => {
    try {
      const supabase = createClient();
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
  };

  // Funciones existentes del sistema de registros
  const loadRegistros = useCallback(async () => {
    try {
      const supabase = createClient();
      let query = supabase
        .from('registros')
        .select('*')
        .is('deleted_at', null);

      // Filtrar por clientes asignados si hay alguno
      // Esto aplica tanto para ejecutivos como para usuarios cuyo nombre coincide con un cliente
      // NOTA: Los usuarios normales sin coincidencia seguirán viendo solo sus registros por RLS
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

      const registrosConvertidos = data.map(convertSupabaseToApp);
      setRegistros(registrosConvertidos);

      const refClienteSet = new Set<string>();
      registrosConvertidos.forEach((registro) => {
        if (registro.refCliente && registro.refCliente.trim().length > 0) {
          refClienteSet.add(registro.refCliente.trim());
        }
      });
      if (refClienteSet.size > 0) {
        setRefExternasUnicas((prev) => {
          const merged = new Set([...prev, ...Array.from(refClienteSet)]);
          return Array.from(merged).sort();
        });
      }
    } catch (error) {
      console.error('Error loading registros:', error);
    }
  }, [isEjecutivo, clientesAsignados]);

  const loadTrashCount = useCallback(async () => {
    try {
      const supabase = createClient();
      const { count, error } = await supabase
        .from('registros')
        .select('id', { count: 'exact', head: true })
        .not('deleted_at', 'is', null);

      if (error) {
        throw error;
      }

      setTrashCount(count ?? 0);
    } catch (err) {
      console.warn('[Registros] Error cargando contador de papelera:', err);
      setTrashCount(0);
    }
  }, []);

  useEffect(() => {
    if (!currentUser?.id) {
      return;
    }
    void loadTrashCount();
  }, [currentUser?.id, loadTrashCount]);

  const loadFacturas = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('facturas')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Mapear datos de Supabase a tipo Factura
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
    } catch (error) {
      console.error('Error loading facturas:', error);
    }
  }, []);

  const loadCatalogos = async () => {
    try {
      const supabase = createClient();

      // Cargar catálogo de estados primero
      await loadEstadosFromCatalog();

      // ============================================================
      // CARGAR DESDE NUEVAS TABLAS SEPARADAS
      // ============================================================

      // 1. Navieras desde catalogos_navieras
      const { data: navierasData, error: navierasError } = await supabase
        .from('catalogos_navieras')
        .select('nombre')
        .eq('activo', true)
        .order('nombre');

      if (!navierasError && navierasData) {
        const navieras = navierasData.map((n: any) => n.nombre).filter(Boolean);
        setNavierasUnicas(navieras);
        setNavierasFiltro(navieras);
      }

      // 2. Ejecutivos desde catalogos_ejecutivos
      const { data: ejecutivosData, error: ejecutivosError } = await supabase
        .from('catalogos_ejecutivos')
        .select('nombre')
        .eq('activo', true)
        .order('nombre');

      if (!ejecutivosError && ejecutivosData) {
        const ejecutivos = ejecutivosData.map((e: any) => e.nombre).filter(Boolean);
        setEjecutivosUnicos(ejecutivos);
        setEjecutivosFiltro(ejecutivos);
      }

      // 3. Clientes desde catalogos_clientes
      const { data: clientesData, error: clientesError } = await supabase
        .from('catalogos_clientes')
        .select('nombre')
        .eq('activo', true)
        .order('nombre');

      if (!clientesError && clientesData) {
        const todosLosClientes = clientesData.map((c: any) => c.nombre).filter(Boolean);
        // Si es ejecutivo, filtrar solo sus clientes asignados
        const currentClientesAsignados = clientesAsignados;
        const currentIsEjecutivo = isEjecutivo;
        if (currentIsEjecutivo && currentClientesAsignados.length > 0) {
          const clientesFiltrados = todosLosClientes.filter((cliente: string) =>
            currentClientesAsignados.includes(cliente)
          );
          setClientesUnicos(clientesFiltrados);
          setClientesFiltro(clientesFiltrados);
        } else {
          setClientesUnicos(todosLosClientes);
          setClientesFiltro(todosLosClientes);
        }
      }

      // 4. Destinos desde catalogos_destinos
      const { data: destinosData, error: destinosError } = await supabase
        .from('catalogos_destinos')
        .select('nombre')
        .eq('activo', true)
        .order('nombre');

      if (!destinosError && destinosData) {
        const destinos = destinosData.map((d: any) => d.nombre).filter(Boolean);
        setDestinosUnicos(destinos);
        setDestinosFiltro(destinos);
      }

      // 5. Naves desde catalogos_naves (con relación a navieras)
      const { data: navesData, error: navesError } = await supabase
        .from('catalogos_naves')
        .select('nombre, naviera_nombre')
        .eq('activo', true)
        .order('nombre');

      if (!navesError && navesData) {
        // Filtrar solo las naves que tienen naviera_nombre (excluir las que no tienen naviera asignada)
        const navesConNaviera = navesData.filter((n: any) => n.naviera_nombre && n.naviera_nombre.trim() !== '' && n.nombre && n.nombre.trim() !== '');
        const todasLasNaves = navesConNaviera.map((n: any) => n.nombre.trim()).filter(Boolean);
        setNavesUnicas(todasLasNaves);

        // Crear mapping de naviera -> naves desde catalogos_naves
        const navesMapping: Record<string, string[]> = {};
        navesConNaviera.forEach((nave: any) => {
          const navieraNombre = nave.naviera_nombre.trim();
          const nombreNave = nave.nombre.trim();

          if (!navesMapping[navieraNombre]) {
            navesMapping[navieraNombre] = [];
          }
          if (!navesMapping[navieraNombre].includes(nombreNave)) {
            navesMapping[navieraNombre].push(nombreNave);
          }
        });

        // Ordenar naves dentro de cada naviera
        Object.keys(navesMapping).forEach(naviera => {
          navesMapping[naviera].sort();
        });

        setNavierasNavesMappingCatalog(navesMapping);
      }

      // 5. Condiciones desde catalogos_condiciones (temperatura, co2, o2, cbm, tratamiento_frio)
      const { data: condicionesData, error: condicionesError } = await supabase
        .from('catalogos_condiciones')
        .select('tipo, valor')
        .eq('activo', true)
        .order('valor');

      if (!condicionesError && condicionesData) {
        const condicionesPorTipo: Record<string, string[]> = {};
        condicionesData.forEach((cond: any) => {
          if (!condicionesPorTipo[cond.tipo]) {
            condicionesPorTipo[cond.tipo] = [];
          }
          condicionesPorTipo[cond.tipo].push(cond.valor);
        });

        if (condicionesPorTipo['temperatura']) {
          setTemperaturasUnicas(condicionesPorTipo['temperatura']);
        }
        if (condicionesPorTipo['co2']) {
          setCo2sUnicos(condicionesPorTipo['co2']);
        }
        if (condicionesPorTipo['o2']) {
          setO2sUnicos(condicionesPorTipo['o2']);
        }
        if (condicionesPorTipo['cbm']) {
          setCbmUnicos(condicionesPorTipo['cbm']);
        }
        if (condicionesPorTipo['tratamiento_frio']) {
          setTratamientosFrioUnicos(condicionesPorTipo['tratamiento_frio']);
        }
        if (condicionesPorTipo['tipo_atmosfera']) {
          setTiposAtmosferaUnicos(condicionesPorTipo['tipo_atmosfera']);
        }
      }

      // ============================================================
      // CARGAR DESDE TABLA CATALOGOS ORIGINAL (para el resto)
      // ============================================================
      const { data: catalogos, error } = await supabase
        .from('catalogos')
        .select('*');

      if (error) {
        console.error('Error loading catalogos:', error);
        return;
      }

      // Procesar catálogos restantes desde tabla original
      catalogos.forEach(catalogo => {
        const categoria = (catalogo.categoria || '').toLowerCase().trim();
        const rawValores = catalogo.valores ?? [];
        let valores: string[] = [];
        if (Array.isArray(rawValores)) {
          valores = rawValores as string[];
        } else if (typeof rawValores === 'string') {
          try {
            valores = JSON.parse(rawValores);
          } catch {
            valores = [];
          }
        }
        const mapping = catalogo.mapping;

        switch (categoria) {
          case 'especies':
            setEspeciesUnicas(valores);
            setEspeciesFiltro(valores);
            break;
          case 'refcliente':
            setRefExternasUnicas(valores);
            break;
          case 'pols':
            setPolsUnicos(valores);
            setPolsFiltro(valores);
            break;
          case 'depositos':
            setDepositosUnicos(valores);
            setDepositosFiltro(valores);
            break;
          // case 'naves': - Ahora se cargan desde catalogos_naves
          case 'fletes':
            setFletesUnicos(valores);
            break;
          case 'contratos':
            setContratosUnicos(valores);
            break;
          case 'tipoingreso':
            setTipoIngresoUnicos(valores);
            break;
          case 'facturacion':
            setFacturacionesUnicas(valores);
            break;

          // CARGAR MAPPINGS DESDE EL CATÁLOGO (SOLO para AddModal - sin números de viaje)
          case 'navierasnavesmapping':
            if (mapping && typeof mapping === 'object') {
              // Limpiar números de viaje si los hubiera en el catálogo
              const cleanMapping: Record<string, string[]> = {};
              Object.keys(mapping).forEach(key => {
                const naves = (mapping[key] || []) as string[];
                // Remover números de viaje del formato "NAVE123 [001E]" -> "NAVE123"
                cleanMapping[key] = naves.map((nave: string) => {
                  // Si tiene formato "NAVE [VIAJE]", extraer solo la nave
                  const match = nave.match(/^(.+?)\s*\[.+\]$/);
                  return match ? match[1].trim() : nave.trim();
                });
              });
              setNavierasNavesMappingCatalog(cleanMapping);
            }
            break;

          case 'consorciosnavesmapping':
            if (mapping && typeof mapping === 'object') {
              // Limpiar números de viaje si los hubiera en el catálogo
              const cleanMapping: Record<string, string[]> = {};
              Object.keys(mapping).forEach(key => {
                const naves = (mapping[key] || []) as string[];
                // Remover números de viaje del formato "NAVE123 [001E]" -> "NAVE123"
                cleanMapping[key] = naves.map((nave: string) => {
                  // Si tiene formato "NAVE [VIAJE]", extraer solo la nave
                  const match = nave.match(/^(.+?)\s*\[.+\]$/);
                  return match ? match[1].trim() : nave.trim();
                });
              });
              setConsorciosNavesMappingCatalog(cleanMapping);
            }
            break;
        }
      });

    } catch (error) {
      console.error('Error loading catalogos:', error);
    }
  };

  const loadEstadosFromCatalog = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('catalogos')
        .select('valores')
        .eq('categoria', 'estados')
        .single();

      if (error) {
        console.warn('No se pudo cargar catálogo de estados, usando valores por defecto:', error);
        setEstadosUnicos(['PENDIENTE', 'CONFIRMADO', 'CANCELADO']);
        return;
      }

      const estados = data?.valores || ['PENDIENTE', 'CONFIRMADO', 'CANCELADO'];
      setEstadosUnicos(estados);
    } catch (error) {
      console.error('Error cargando estados desde catálogo:', error);
      setEstadosUnicos(['PENDIENTE', 'CONFIRMADO', 'CANCELADO']);
    }
  };

  const loadStats = async () => {
    // Esta función se puede usar para recargar estadísticas si es necesario
    // Por ahora no hace nada específico ya que las estadísticas se calculan en tiempo real
  };

  const performSoftDelete = useCallback(
    async (targets: Registro[], mode: 'single' | 'bulk') => {
      if (targets.length === 0) {
        setDeleteConfirm(null);
        return;
      }

      setDeleteProcessing(true);

      try {
        const supabase = createClient();
        const ids = targets.map((registro) => registro.id).filter((id): id is string => Boolean(id));

        if (ids.length === 0) {
          error('No se encontraron registros válidos para eliminar.');
          return;
        }

        const { error: updateError } = await supabase
          .from('registros')
          .update({
            deleted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .in('id', ids);

        if (updateError) {
          console.error('Error al eliminar registros:', updateError);
          error('Error al enviar los registros a la papelera.');
          return;
        }

        setRegistros((prevRegistros) =>
          prevRegistros.filter((registro) => !ids.includes(registro.id ?? '')),
        );

        if (mode === 'bulk') {
          setSelectedRows(new Set());
          setSelectionMode(false);
        }

        await loadStats();
        await loadTrashCount();

        if (mode === 'single') {
          const ref = targets[0]?.refAsli ?? 'registro';
          success(`Registro ${ref} enviado a la papelera`);
        } else {
          success(`${ids.length} registro(s) enviados a la papelera`);
        }

        setDeleteConfirm(null);
      } catch (err: any) {
        console.error('Error inesperado al eliminar registros:', err);
        error(err?.message ?? 'Error inesperado al eliminar los registros.');
      } finally {
        setDeleteProcessing(false);
      }
    },
    [error, success, loadStats, loadTrashCount, setSelectedRows, setSelectionMode],
  );

  const handleConfirmDelete = useCallback(() => {
    if (!deleteConfirm) return;
    void performSoftDelete(deleteConfirm.registros, deleteConfirm.mode);
  }, [deleteConfirm, performSoftDelete]);

  const handleCancelDelete = useCallback(() => {
    if (deleteProcessing) return;
    setDeleteConfirm(null);
  }, [deleteProcessing]);

  const handleRealtimeEvent = useCallback(
    ({ event, registro }: { event: 'INSERT' | 'UPDATE' | 'DELETE'; registro: Registro }) => {
      setRegistros((prevRegistros) => {
        const isSoftDeleted = registro.deletedAt !== undefined && registro.deletedAt !== null;

        if (event === 'DELETE') {
          return prevRegistros.filter((item) => item.id !== registro.id);
        }

        if (event === 'UPDATE' && isSoftDeleted) {
          return prevRegistros.filter((item) => item.id !== registro.id);
        }

        if (event === 'INSERT') {
          const existe = prevRegistros.some((item) => item.id === registro.id);
          if (existe) {
            return prevRegistros;
          }
          return [registro, ...prevRegistros];
        }

        if (event === 'UPDATE') {
          const existe = prevRegistros.some((item) => item.id === registro.id);
          if (!existe) {
            return [registro, ...prevRegistros];
          }
          return prevRegistros.map((item) => (item.id === registro.id ? registro : item));
        }

        return prevRegistros;
      });

      const ref = registro.refAsli ?? 'registro';
      if (event === 'INSERT') {
        success(`Nuevo registro ${ref} disponible`);
      } else if (event === 'UPDATE') {
        success(`Registro ${ref} actualizado`);
      } else if (event === 'DELETE') {
        warning(`Registro ${ref} fue eliminado`);
      }

      setTimeout(() => {
        loadCatalogos();
        loadStats();
      }, 200);
    },
    [loadCatalogos, loadStats, success, warning],
  );

  useRealtimeRegistros({
    onChange: handleRealtimeEvent,
    enabled: !loading,
  });

  // Funciones de manejo de eventos
  const handleAdd = () => {
    if (isCliente) {
      error('No tienes permisos para agregar registros.');
      return;
    }
    setIsAddModalOpen(true);
  };

  const handleImportFromSheets = async () => {
    if (isCliente) {
      error('No tienes permisos para importar desde Google Sheets.');
      return;
    }

    if (!confirm('¿Deseas importar datos desde Google Sheets?\n\nHoja: CONTROL\nFilas: 2-646\n\nEsto puede tardar varios minutos.')) {
      return;
    }

    try {
      success('Iniciando importación desde Google Sheets...');

      const endpoint = '/api/google-sheets/import-json';

      const body = {
        webAppUrl: 'https://script.google.com/macros/s/AKfycbwOkX2_StMpQrWwF2EbOH5tYpP0HQglP1GgU5UX5oRb0Y3D3d6TVWkzr2B4VSNXDEic/exec',
        sheetName: 'CONTROL',
        startRow: 1,
        endRow: 646,
        verificarDuplicados: true,
        sobrescribirDuplicados: false
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const result = await response.json();

      if (!response.ok) {
        error(result.error || 'Error al importar desde Google Sheets');
        return;
      }

      if (result.ok) {
        const resumen = result.resumen;
        success(
          `✅ Importación completada: ${resumen.exitosos} insertados, ${resumen.fallidos} fallidos, ${resumen.duplicados} duplicados, ${resumen.transportes || 0} transportes`
        );

        // Recargar registros
        loadRegistros();

        // Mostrar detalles si hay errores
        if (resumen.invalidos > 0 || result.detalles?.errores?.length > 0) {
          console.warn('Detalles de errores:', result.detalles);
        }
      } else {
        error('Error al importar desde Google Sheets');
      }
    } catch (error: any) {
      console.error('Error en importación:', error);
      error(`Error al importar: ${error?.message || 'Error desconocido'}`);
    }
  };

  const handleEdit = (registro: Registro) => {
    if (isCliente) {
      error('No tienes permisos para editar registros.');
      return;
    }
    // Validar que el ejecutivo solo pueda editar registros de sus clientes
    if (isEjecutivo && clientesAsignados.length > 0) {
      if (!clientesAsignados.includes(registro.shipper || '')) {
        error('No tienes permiso para editar este registro');
        return;
      }
    }
    setSelectedRecord(registro);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (registro: Registro) => {
    const esAdmin = currentUser?.rol === 'admin';

    if (isCliente) {
      error('No tienes permisos para eliminar registros.');
      return;
    }

    if (!esAdmin) {
      if (isEjecutivo && clientesAsignados.length > 0) {
        if (!clientesAsignados.includes(registro.shipper || '')) {
          error('No tienes permiso para eliminar este registro');
          return;
        }
      }
    }

    setDeleteConfirm({ registros: [registro], mode: 'single' });
  };


  const handleShowHistorial = (registro: Registro) => {
    setSelectedRegistroForHistorial(registro);
    setIsHistorialModalOpen(true);
  };

  const handleCloseHistorial = () => {
    setIsHistorialModalOpen(false);
    setSelectedRegistroForHistorial(null);
  };

  const handleSendToTransportes = async (registroOrRegistros: Registro | Registro[]) => {
    if (isCliente) {
      error('No tienes permisos para enviar registros a Transportes.');
      return;
    }
    const registros = Array.isArray(registroOrRegistros) ? registroOrRegistros : [registroOrRegistros];
    const supabase = createClient();

    let exitosos = 0;
    let fallidos = 0;
    const errores: string[] = [];

    for (const registro of registros) {
      try {
        // Verificar campos requeridos
        if (!registro.booking || registro.booking.trim() === '') {
          errores.push(`${registro.refAsli || 'Registro sin ref'}: Sin booking`);
          fallidos++;
          continue;
        }

        // Verificar que tenga PDF de booking cargado
        if (!registro.bookingPdf || registro.bookingPdf.trim() === '') {
          errores.push(`${registro.refAsli || registro.booking}: No tiene PDF de booking cargado`);
          fallidos++;
          continue;
        }

        // Verificar si ya existe un transporte para esta ref externa
        // Solo verificar si el registro tiene refCliente
        if (registro.refCliente && registro.refCliente.trim() !== '') {
          const { data: existingTransporteByRef, error: checkErrorByRef } = await supabase
            .from('transportes')
            .select('*')
            .eq('ref_cliente', registro.refCliente.trim())
            .maybeSingle();

          if (checkErrorByRef) {
            console.error('Error al verificar transporte existente por ref externa:', checkErrorByRef);
            errores.push(`${registro.refAsli || registro.booking}: Error al verificar ref externa`);
            fallidos++;
            continue;
          }

          if (existingTransporteByRef) {
            errores.push(`${registro.refAsli || registro.booking}: Ya existe un transporte con la ref externa ${registro.refCliente}`);
            fallidos++;
            continue;
          }
        }

        // Extraer contenedor (puede ser array o string)
        const contenedorValue = Array.isArray(registro.contenedor)
          ? registro.contenedor[0] || ''
          : registro.contenedor || '';

        // Crear nuevo registro de transporte con los datos del registro de embarque
        const transporteData = {
          ref_cliente: registro.refCliente && registro.refCliente.trim() !== '' ? registro.refCliente.trim() : null,
          booking: registro.booking.trim(),
          contenedor: contenedorValue.trim() || null,
          nave: registro.naveInicial || null,
          naviera: registro.naviera || null,
          especie: registro.especie || null,
          temperatura: registro.temperatura ?? null,
          pol: registro.pol || null,
          pod: registro.pod || null,
          vent: registro.cbm ? String(registro.cbm) : null,
          deposito: registro.deposito || null,
          stacking: registro.ingresoStacking ? new Date(registro.ingresoStacking).toISOString().split('T')[0] : null,
          cut_off: registro.etd ? new Date(registro.etd).toISOString().split('T')[0] : null,
          semana: registro.semanaIngreso ?? registro.semanaZarpe ?? null,
          exportacion: registro.shipper || null,
          created_by: currentUser?.id || null,
          // Marcar que viene de registros para bloquear edición de campos con datos
          from_registros: true,
        };

        const { data, error: insertError } = await supabase
          .from('transportes')
          .insert([transporteData])
          .select();

        if (insertError) {
          console.error('Error de inserción:', insertError);
          const errorMessage = insertError.message || insertError.details || JSON.stringify(insertError);
          errores.push(`${registro.refAsli || registro.booking}: ${errorMessage}`);
          fallidos++;
          continue;
        }

        if (!data || data.length === 0) {
          errores.push(`${registro.refAsli || registro.booking}: No se recibió confirmación`);
          fallidos++;
          continue;
        }

        exitosos++;

      } catch (err) {
        console.error('Error al enviar a transportes:', err);
        errores.push(`${registro.refAsli || registro.booking}: ${err instanceof Error ? err.message : 'Error desconocido'}`);
        fallidos++;
      }
    }

    // Mostrar resultado
    if (exitosos > 0 && fallidos === 0) {
      success(`${exitosos} registro${exitosos > 1 ? 's' : ''} enviado${exitosos > 1 ? 's' : ''} a Transportes exitosamente`);
    } else if (exitosos > 0 && fallidos > 0) {
      warning(`${exitosos} enviados, ${fallidos} fallidos. Errores: ${errores.join('; ')}`);
    } else {
      error(`No se pudo enviar ningún registro. Errores: ${errores.join('; ')}`);
      return; // No abrir correo si no se envió ninguno
    }

    // Se eliminó el envío automático de correo al enviar a Transportes
  };

  const handleEditNaveViaje = (registro: Registro) => {
    if (isCliente) {
      error('No tienes permisos para editar registros.');
      return;
    }
    // Validar que el ejecutivo solo pueda editar registros de sus clientes
    if (isEjecutivo && clientesAsignados.length > 0) {
      if (!clientesAsignados.includes(registro.shipper || '')) {
        error('No tienes permiso para editar este registro');
        return;
      }
    }

    // Extraer nave y viaje si viene en formato "NAVE [VIAJE]"
    let naveActual = registro.naveInicial || '';
    let viajeActual = registro.viaje || '';

    // Si la nave contiene [ ], extraer el viaje
    const match = naveActual.match(/^(.+?)\s*\[(.+?)\]$/);
    if (match) {
      naveActual = match[1].trim();
      viajeActual = match[2].trim();
    }

    // Crear un registro temporal con nave y viaje separados para el modal
    const registroParaModal = {
      ...registro,
      naveInicial: naveActual,
      viaje: viajeActual
    };

    setSelectedRegistroForNaveViaje(registroParaModal);
    setIsEditNaveViajeModalOpen(true);
  };

  const handleCloseNaveViajeModal = () => {
    setIsEditNaveViajeModalOpen(false);
    setSelectedRegistroForNaveViaje(null);
    setSelectedRecordsForNaveViaje([]);
  };

  const handleSaveNaveViaje = async (nave: string, viaje: string) => {
    if (!selectedRegistroForNaveViaje?.id) return;

    if (isCliente) {
      error('No tienes permisos para editar registros.');
      return;
    }

    // Validar que el ejecutivo solo pueda editar registros de sus clientes
    if (isEjecutivo && clientesAsignados.length > 0) {
      if (!clientesAsignados.includes(selectedRegistroForNaveViaje.shipper || '')) {
        error('No tienes permiso para editar este registro');
        return;
      }
    }

    try {
      const supabase = createClient();

      // Construir el nombre completo de la nave con viaje (igual que en AddModal)
      const naveCompleta = nave && viaje.trim()
        ? `${nave} [${viaje.trim()}]`
        : nave || '';

      const { error } = await supabase
        .from('registros')
        .update({
          nave_inicial: naveCompleta,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedRegistroForNaveViaje.id);

      if (error) throw error;

      success('Nave y viaje actualizados correctamente');
      await loadRegistros();
      handleCloseNaveViajeModal();
    } catch (err: any) {
      error('Error al actualizar nave y viaje: ' + (err.message || 'Error desconocido'));
    }
  };

  const handleBulkEditNaveViaje = (records: Registro[]) => {
    if (isCliente) {
      error('No tienes permisos para editar registros.');
      return;
    }
    // Validar que todos los registros sean de clientes asignados al ejecutivo
    if (isEjecutivo && clientesAsignados.length > 0) {
      const registrosValidos = records.filter(r =>
        clientesAsignados.includes(r.shipper || '')
      );

      if (registrosValidos.length !== records.length) {
        error('No tienes permiso para editar algunos de los registros seleccionados');
        return;
      }

      setSelectedRegistroForNaveViaje(null);
      setSelectedRecordsForNaveViaje(registrosValidos);
    } else {
      setSelectedRegistroForNaveViaje(null);
      setSelectedRecordsForNaveViaje(records);
    }
    setIsEditNaveViajeModalOpen(true);
  };

  const handleBulkSaveNaveViaje = async (nave: string, viaje: string, records: Registro[]) => {
    if (isCliente) {
      error('No tienes permisos para editar registros.');
      return;
    }
    // Validar que todos los registros sean de clientes asignados al ejecutivo
    let registrosParaActualizar = records;
    if (isEjecutivo && clientesAsignados.length > 0) {
      registrosParaActualizar = records.filter(r =>
        clientesAsignados.includes(r.shipper || '')
      );

      if (registrosParaActualizar.length !== records.length) {
        error('No tienes permiso para actualizar algunos de los registros seleccionados');
        return;
      }
    }

    try {
      const supabase = createClient();

      // Construir el nombre completo de la nave con viaje
      const naveCompleta = nave && viaje.trim()
        ? `${nave} [${viaje.trim()}]`
        : nave || '';

      const recordIds = registrosParaActualizar.map(r => r.id).filter((id): id is string => Boolean(id));

      if (recordIds.length === 0) return;

      const { error } = await supabase
        .from('registros')
        .update({
          nave_inicial: naveCompleta,
          updated_at: new Date().toISOString()
        })
        .in('id', recordIds);

      if (error) throw error;

      success(`${registrosParaActualizar.length} registro(s) actualizado(s) correctamente`);
      await loadRegistros();
      handleCloseNaveViajeModal();
    } catch (err: any) {
      error('Error al actualizar nave y viaje: ' + (err.message || 'Error desconocido'));
    }
  };

  // Funciones para selección múltiple
  const handleToggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    if (selectionMode) {
      setSelectedRows(new Set());
    }
  };

  const handleToggleRowSelection = useCallback((recordId: string, rowIndex?: number, event?: React.MouseEvent<HTMLInputElement>) => {
    const visibleRegistros = registrosVisibles;
    const isShiftPressed = event?.shiftKey || false;
    const currentIndex = rowIndex ?? visibleRegistros.findIndex(r => r.id === recordId);

    // Early return si no se encuentra la fila
    if (currentIndex === -1) return;

    const newSelectedRows = new Set(selectedRows);

    // Si se presiona Shift y hay una última fila seleccionada, seleccionar rango
    if (isShiftPressed && lastSelectedRowIndex.current !== null) {
      const startIndex = Math.min(lastSelectedRowIndex.current, currentIndex);
      const endIndex = Math.max(lastSelectedRowIndex.current, currentIndex);

      // Determinar si debemos seleccionar o deseleccionar el rango
      // Si la última fila seleccionada está seleccionada, seleccionamos todo el rango
      // Si no, deseleccionamos todo el rango
      const lastSelectedId = visibleRegistros[lastSelectedRowIndex.current]?.id;
      const shouldSelect = lastSelectedId ? selectedRows.has(lastSelectedId) : true;

      // Optimizar: evitar verificaciones innecesarias en el bucle
      if (shouldSelect) {
        // Agregar todas las filas del rango
        for (let i = startIndex; i <= endIndex; i++) {
          const rowId = visibleRegistros[i]?.id;
          if (rowId) newSelectedRows.add(rowId);
        }
      } else {
        // Eliminar todas las filas del rango
        for (let i = startIndex; i <= endIndex; i++) {
          const rowId = visibleRegistros[i]?.id;
          if (rowId) newSelectedRows.delete(rowId);
        }
      }

      // Actualizar la referencia
      lastSelectedRowIndex.current = currentIndex;
    } else {
      // Comportamiento normal: toggle de la fila individual
      if (newSelectedRows.has(recordId)) {
        newSelectedRows.delete(recordId);
        lastSelectedRowIndex.current = null;
      } else {
        newSelectedRows.add(recordId);
        lastSelectedRowIndex.current = currentIndex;
      }
    }

    setSelectedRows(newSelectedRows);
  }, [selectedRows, registrosVisibles]);

  const handleSelectAll = (filteredRecords: Registro[]) => {
    // Obtener IDs de los registros filtrados/visibles
    const filteredIds = new Set(filteredRecords.map(r => r.id).filter((id): id is string => Boolean(id)));

    // Verificar si todos los registros visibles ya están seleccionados
    const allVisibleSelected = filteredIds.size > 0 && Array.from(filteredIds).every(id => selectedRows.has(id));

    if (allVisibleSelected) {
      // Deseleccionar solo los registros visibles
      const newSelectedRows = new Set(selectedRows);
      filteredIds.forEach(id => newSelectedRows.delete(id));
      setSelectedRows(newSelectedRows);
      lastSelectedRowIndex.current = null;
    } else {
      // Seleccionar todos los registros visibles (manteniendo los que ya estaban seleccionados)
      const newSelectedRows = new Set(selectedRows);
      filteredIds.forEach(id => newSelectedRows.add(id));
      setSelectedRows(newSelectedRows);
      // Guardar el índice de la última fila visible cuando se selecciona todo
      lastSelectedRowIndex.current = filteredRecords.length - 1;
    }
  };

  const handleClearSelection = () => {
    setSelectedRows(new Set());
    lastSelectedRowIndex.current = null;
  };

  const handleBulkDelete = async () => {
    if (selectedRows.size === 0) return;

    const esAdmin = currentUser?.rol === 'admin';

    if (isCliente) {
      error('No tienes permisos para eliminar registros.');
      return;
    }

    const registrosSeleccionados = registros.filter((r) => r.id && selectedRows.has(r.id));

    let registrosParaEliminar = registrosSeleccionados;
    if (!esAdmin) {
      if (isEjecutivo && clientesAsignados.length > 0) {
        registrosParaEliminar = registrosSeleccionados.filter((r) =>
          clientesAsignados.includes(r.shipper || ''),
        );

        if (registrosParaEliminar.length !== registrosSeleccionados.length) {
          error('No tienes permiso para eliminar algunos de los registros seleccionados');
          return;
        }
      }
    }

    if (registrosParaEliminar.length === 0) {
      warning('No hay registros válidos para eliminar.');
      return;
    }

    setDeleteConfirm({ registros: registrosParaEliminar, mode: 'bulk' });
  };

  const handleUpdateRecord = useCallback(async (updatedRecord: Registro, oldRecord?: Registro) => {
    // Actualizar el registro en el estado local primero
    setRegistros(prevRegistros =>
      prevRegistros.map(record =>
        record.id === updatedRecord.id ? updatedRecord : record
      )
    );

    // Sincronizar con transportes relacionados
    try {
      const oldBooking = oldRecord?.booking;
      const syncResult = await syncTransportesFromRegistro(updatedRecord, oldBooking);

      if (syncResult.success && (syncResult.updated || 0) > 0) {
        console.log(`✅ Se sincronizaron ${syncResult.updated} transportes con el registro actualizado`);
        // Opcional: Mostrar notificación al usuario
        // success(`Se actualizaron ${syncResult.updated} transportes relacionados`);
      } else if (!syncResult.success) {
        console.warn('⚠️ Error en sincronización de transportes:', syncResult.error);
        // Opcional: Mostrar advertencia al usuario
        // warning('No se pudieron sincronizar los transportes relacionados');
      }
    } catch (error) {
      console.error('❌ Error crítico en sincronización:', error);
    }
  }, []);

  const handleBulkUpdate = useCallback(async (field: keyof Registro, value: any, selectedRecords: Registro[]) => {
    if (selectedRecords.length === 0) return;

    if (isCliente) {
      error('No tienes permisos para editar registros.');
      return;
    }

    // Si es ejecutivo, validar que todos los registros sean de sus clientes
    let registrosParaActualizar = selectedRecords;
    if (isEjecutivo && clientesAsignados.length > 0) {
      registrosParaActualizar = selectedRecords.filter(r =>
        clientesAsignados.includes(r.shipper || '')
      );

      if (registrosParaActualizar.length !== selectedRecords.length) {
        error('No tienes permiso para actualizar algunos de los registros seleccionados');
        return;
      }
    }

    try {
      const supabase = createClient();

      // Mapear nombres de campos del tipo TypeScript a nombres de la base de datos
      const getDatabaseFieldName = (fieldName: keyof Registro): string => {
        const fieldMapping: Record<string, string> = {
          'naveInicial': 'nave_inicial',
          'tipoIngreso': 'tipo_ingreso',
          'roleadaDesde': 'roleada_desde',
          'ingresoStacking': 'ingreso_stacking',
          'refAsli': 'ref_asli',
          'numeroBl': 'numero_bl',
          'estadoBl': 'estado_bl'
        };

        return fieldMapping[fieldName] || fieldName;
      };

      const normalizeBulkValue = (fieldName: keyof Registro, rawValue: any) => {
        if (rawValue === '' || rawValue === undefined) return null;

        const numericFields = new Set<keyof Registro>(['temperatura', 'cbm', 'co2', 'o2']);
        if (numericFields.has(fieldName)) {
          if (rawValue === null) return null;
          const numericValue = Number(rawValue);
          if (Number.isNaN(numericValue)) {
            throw new Error(`Valor inválido para el campo ${String(fieldName)}`);
          }
          return numericValue;
        }

        return rawValue;
      };

      // Preparar datos para actualizar
      const dbFieldName = getDatabaseFieldName(field);
      const normalizedValue = normalizeBulkValue(field, value);
      const updateData: any = {
        [dbFieldName]: normalizedValue,
        updated_at: new Date().toISOString()
      };

      // Obtener IDs de los registros seleccionados (solo los permitidos)
      const recordIds = registrosParaActualizar.map(record => record.id).filter((id): id is string => Boolean(id));

      if (recordIds.length === 0) {
        return;
      }

      // Actualizar en Supabase
      const { data, error: updateError } = await supabase
        .from('registros')
        .update(updateData)
        .in('id', recordIds);

      if (updateError) {
        throw new Error(updateError.message || 'Error al actualizar registros en Supabase');
      }

      for (const record of registrosParaActualizar) {
        try {
          await logHistoryEntry(supabase, {
            registroId: record.id,
            field,
            previousValue: record[field],
            newValue: normalizedValue,
          });
        } catch (historialError) {
          console.warn(`⚠️ Error creando historial para registro ${record.id}:`, historialError);
        }
      }

      // Actualizar el estado local
      const updatedRecords = registrosParaActualizar.map(record => ({
        ...record,
        [field]: normalizedValue,
        updated_at: new Date().toISOString()
      }));

      setRegistros(prevRegistros =>
        prevRegistros.map(record => {
          const updated = updatedRecords.find(updated => updated.id === record.id);
          return updated || record;
        })
      );

      // Sincronizar con transportes relacionados (solo para campos relevantes)
      const syncFields = ['booking', 'naveInicial', 'naviera', 'refCliente', 'contenedor', 'shipper', 'especie', 'pol', 'pod', 'deposito', 'temperatura'];
      if (syncFields.includes(field)) {
        try {
          const syncResult = await syncMultipleTransportesFromRegistros(updatedRecords);

          if (syncResult.success && syncResult.totalUpdated > 0) {
            console.log(`✅ Se sincronizaron ${syncResult.totalUpdated} transportes con la actualización masiva`);
            // Opcional: Mostrar notificación al usuario
            // success(`Se actualizaron ${syncResult.totalUpdated} transportes relacionados`);
          } else if (!syncResult.success) {
            console.warn('⚠️ Error en sincronización masiva de transportes:', syncResult.results);
          }
        } catch (error) {
          console.error('❌ Error crítico en sincronización masiva:', error);
        }
      }

      // Mostrar confirmación visual mejorada
      const fieldNames: Record<string, string> = {
        'especie': 'Especie',
        'estado': 'Estado',
        'tipoIngreso': 'Tipo de Ingreso',
        'ejecutivo': 'Ejecutivo',
        'naviera': 'Naviera',
        'naveInicial': 'Nave',
        'pol': 'POL',
        'pod': 'POD',
        'deposito': 'Depósito',
        'flete': 'Flete',
        'temperatura': 'Temperatura',
        'cbm': 'CBM',
        'co2': 'CO2',
        'o2': 'O2',
        'comentario': 'Comentario'
      };

      const fieldDisplayName = fieldNames[field] || field;
      success(`✅ Se actualizaron ${registrosParaActualizar.length} registros en el campo "${fieldDisplayName}"`);

    } catch (err: any) {
      const errorMessage =
        err?.message ||
        err?.error?.message ||
        (typeof err === 'string' ? err : JSON.stringify(err));
      console.error('Error en edición masiva:', err);
      error(`Error al actualizar los registros: ${errorMessage || 'Error desconocido'}`);
    }
  }, [success, error, isEjecutivo, clientesAsignados]);

  // Estado para los mapeos de naves desde el CATÁLOGO (SOLO para AddModal - sin números de viaje)
  const [navierasNavesMappingCatalog, setNavierasNavesMappingCatalog] = useState<Record<string, string[]>>({});
  const [consorciosNavesMappingCatalog, setConsorciosNavesMappingCatalog] = useState<Record<string, string[]>>({});

  // Estado para los mapeos de naves desde REGISTROS (para filtros - puede incluir números de viaje)
  const [navierasNavesMapping, setNavierasNavesMapping] = useState<Record<string, string[]>>({});
  const [consorciosNavesMapping, setConsorciosNavesMapping] = useState<Record<string, string[]>>({});

  // Crear mapeos de navieras a naves (considerando naves compartidas) - memoizado
  const createNavierasNavesMapping = useCallback((registrosData: Registro[]) => {
    const mapping: Record<string, string[]> = {};

    // Primero, crear un mapeo de nave → navieras que la usan
    const naveToNavieras: Record<string, string[]> = {};

    registrosData.forEach(registro => {
      if (registro.naviera && registro.naveInicial) {
        if (!naveToNavieras[registro.naveInicial]) {
          naveToNavieras[registro.naveInicial] = [];
        }
        if (!naveToNavieras[registro.naveInicial].includes(registro.naviera)) {
          naveToNavieras[registro.naveInicial].push(registro.naviera);
        }
      }
    });

    // Ahora crear el mapeo naviera → naves (incluyendo naves compartidas)
    Object.keys(naveToNavieras).forEach(nave => {
      const navierasDeLaNave = naveToNavieras[nave];
      navierasDeLaNave.forEach(naviera => {
        if (!mapping[naviera]) {
          mapping[naviera] = [];
        }
        if (!mapping[naviera].includes(nave)) {
          mapping[naviera].push(nave);
        }
      });
    });

    return mapping;
  }, []);

  // Crear mapeos de consorcios a naves - memoizado
  const createConsorciosNavesMapping = useCallback((registrosData: Registro[]) => {
    const mapping: Record<string, string[]> = {};


    // Obtener todas las navieras únicas de los datos
    const navierasUnicas = [...new Set(registrosData.map(r => r.naviera).filter(Boolean))];

    // Crear mapeos de consorcios basados en patrones encontrados en los datos
    const consorciosEncontrados: Record<string, string[]> = {};

    // Buscar patrones de consorcios en los nombres de navieras
    navierasUnicas.forEach(naviera => {
      // Patrón 1: HAPAG-LLOYD / ONE / MSC
      if (naviera.includes('HAPAG') || naviera.includes('ONE') || naviera.includes('MSC')) {
        if (!consorciosEncontrados['HAPAG-LLOYD / ONE / MSC']) {
          consorciosEncontrados['HAPAG-LLOYD / ONE / MSC'] = [];
        }
        // Agregar todas las naves de esta naviera al consorcio
        registrosData
          .filter(r => r.naviera === naviera && r.naveInicial)
          .forEach(registro => {
            if (!consorciosEncontrados['HAPAG-LLOYD / ONE / MSC'].includes(registro.naveInicial)) {
              consorciosEncontrados['HAPAG-LLOYD / ONE / MSC'].push(registro.naveInicial);
            }
          });
      }

      // Patrón 2: PIL / YANG MING / WAN HAI
      if (naviera.includes('PIL') || naviera.includes('YANG MING') || naviera.includes('WAN HAI')) {
        if (!consorciosEncontrados['PIL / YANG MING / WAN HAI']) {
          consorciosEncontrados['PIL / YANG MING / WAN HAI'] = [];
        }
        registrosData
          .filter(r => r.naviera === naviera && r.naveInicial)
          .forEach(registro => {
            if (!consorciosEncontrados['PIL / YANG MING / WAN HAI'].includes(registro.naveInicial)) {
              consorciosEncontrados['PIL / YANG MING / WAN HAI'].push(registro.naveInicial);
            }
          });
      }

      // Patrón 3: CMA CGM / COSCO / OOCL
      if (naviera.includes('CMA CGM') || naviera.includes('COSCO') || naviera.includes('OOCL')) {
        if (!consorciosEncontrados['CMA CGM / COSCO / OOCL']) {
          consorciosEncontrados['CMA CGM / COSCO / OOCL'] = [];
        }
        registrosData
          .filter(r => r.naviera === naviera && r.naveInicial)
          .forEach(registro => {
            if (!consorciosEncontrados['CMA CGM / COSCO / OOCL'].includes(registro.naveInicial)) {
              consorciosEncontrados['CMA CGM / COSCO / OOCL'].push(registro.naveInicial);
            }
          });
      }
    });

    // Agregar también los consorcios que aparecen directamente en los datos
    navierasUnicas.forEach(naviera => {
      if (naviera.includes('/') && naviera.length > 10) {
        // Es probable que sea un consorcio directo
        if (!consorciosEncontrados[naviera]) {
          consorciosEncontrados[naviera] = [];
        }
        registrosData
          .filter(r => r.naviera === naviera && r.naveInicial)
          .forEach(registro => {
            if (!consorciosEncontrados[naviera].includes(registro.naveInicial)) {
              consorciosEncontrados[naviera].push(registro.naveInicial);
            }
          });
      }
    });

    return consorciosEncontrados;
  }, [navierasUnicas]);

  // Función para generar arrays de filtro basados en datos reales - memoizada
  const generateFilterArrays = useCallback((registrosData: Registro[]) => {
    const navierasFiltro = [...new Set(registrosData.map(r => r.naviera).filter(Boolean))].sort();
    const especiesFiltro = [...new Set(registrosData.map(r => r.especie).filter(Boolean))].sort();
    const clientesFiltro = [...new Set(registrosData.map(r => r.shipper).filter(Boolean))].sort();
    const polsFiltro = [...new Set(registrosData.map(r => r.pol).filter(Boolean))].sort();
    const destinosFiltro = [...new Set(registrosData.map(r => r.pod).filter(Boolean))].sort();
    const ejecutivosFiltro = [...new Set(registrosData.map(r => r.ejecutivo).filter(Boolean))].sort();
    const navesFiltro = [...new Set(registrosData.map(r => r.naveInicial).filter(Boolean))].sort();
    const depositosFiltro = [...new Set(registrosData.map(r => r.deposito).filter(Boolean))].sort();

    return {
      navierasFiltro,
      especiesFiltro,
      clientesFiltro,
      polsFiltro,
      destinosFiltro,
      ejecutivosFiltro,
      navesFiltro,
      depositosFiltro
    };
  }, []);

  // Función para validar formato de contenedor (debe tener al menos una letra y un número)
  const isValidContainer = (contenedor: string | number | null): boolean => {
    if (!contenedor || contenedor === '-' || contenedor === null || contenedor === '') {
      return false;
    }

    const contenedorStr = contenedor.toString().trim();

    // Excluir explícitamente los guiones
    if (contenedorStr === '-') {
      return false;
    }

    // Debe tener al menos una letra o número (puede tener símbolos)
    const hasLetterOrNumber = /[a-zA-Z0-9]/.test(contenedorStr);

    return hasLetterOrNumber;
  };

  // Memoizar mapeos y filtros para evitar recalcular en cada render
  // Filtrar registros por ejecutivo si hay uno seleccionado
  const registrosParaFiltros = useMemo(() => {
    if (!tableStates || !tableStates.executiveFilter || tableStates.executiveFilter === '') {
      return registrosVisibles;
    }
    return registrosVisibles.filter(r => r.ejecutivo === tableStates.executiveFilter);
  }, [registrosVisibles, tableStates?.executiveFilter]);

  // Limpiar filtros inválidos cuando cambia el ejecutivo
  useEffect(() => {
    if (!tableInstance || !tableStates) return;

    const currentExecutiveFilter = tableStates.executiveFilter || '';

    // Generar arrays de opciones válidas basadas en el ejecutivo actual
    const registrosFiltrados = currentExecutiveFilter
      ? registrosVisibles.filter(r => r.ejecutivo === currentExecutiveFilter)
      : registrosVisibles;

    const validNavieras = new Set(registrosFiltrados.map(r => r.naviera).filter(Boolean));
    const validClientes = new Set(registrosFiltrados.map(r => r.shipper).filter(Boolean));
    const validEspecies = new Set(registrosFiltrados.map(r => r.especie).filter(Boolean));
    const validPols = new Set(registrosFiltrados.map(r => r.pol).filter(Boolean));
    const validDestinos = new Set(registrosFiltrados.map(r => r.pod).filter(Boolean));
    const validDepositos = new Set(registrosFiltrados.map(r => r.deposito).filter(Boolean));
    const validNaves = new Set(registrosFiltrados.map(r => r.naveInicial).filter(Boolean));

    // Obtener los filtros actuales del estado de la tabla
    const currentFilters = tableInstance.getState().columnFilters;
    const filtersToClear: string[] = [];

    // Verificar cada filtro activo y determinar cuáles deben limpiarse
    currentFilters.forEach((filter: { id: string; value: any }) => {
      const filterValue = filter.value;
      if (!filterValue || filterValue === '' || filterValue === null || filterValue === undefined) {
        return;
      }

      const stringValue = typeof filterValue === 'string'
        ? filterValue.trim()
        : Array.isArray(filterValue) && filterValue.length > 0
          ? String(filterValue[0]).trim()
          : String(filterValue).trim();

      if (stringValue === '') return;

      let shouldClear = false;
      switch (filter.id) {
        case 'naviera':
          shouldClear = !validNavieras.has(stringValue);
          break;
        case 'shipper':
          shouldClear = !validClientes.has(stringValue);
          break;
        case 'especie':
          shouldClear = !validEspecies.has(stringValue);
          break;
        case 'pol':
          shouldClear = !validPols.has(stringValue);
          break;
        case 'pod':
          shouldClear = !validDestinos.has(stringValue);
          break;
        case 'deposito':
          shouldClear = !validDepositos.has(stringValue);
          break;
        case 'naveInicial':
          shouldClear = !validNaves.has(stringValue);
          break;
      }

      if (shouldClear) {
        filtersToClear.push(filter.id);
      }
    });

    // Limpiar los filtros inválidos usando setColumnFilters para actualizar el estado correctamente
    if (filtersToClear.length > 0) {
      tableInstance.setColumnFilters((prev: any[]) =>
        prev.filter((f: any) => !filtersToClear.includes(f.id))
      );

      // También limpiar individualmente cada columna para asegurar sincronización
      filtersToClear.forEach((columnId) => {
        const column = tableInstance.getColumn(columnId);
        if (column) {
          column.setFilterValue(undefined);
        }
      });
    }
  }, [tableInstance, tableStates?.executiveFilter, registrosVisibles]);

  const registrosLength = registrosVisibles.length;
  useEffect(() => {
    if (registrosLength > 0) {
      const navierasMapping = createNavierasNavesMapping(registrosVisibles);
      const consorciosMapping = createConsorciosNavesMapping(registrosVisibles);

      setNavierasNavesMapping(navierasMapping);
      setConsorciosNavesMapping(consorciosMapping);

      // Generar arrays de filtro basados en datos filtrados por ejecutivo (si hay uno seleccionado)
      const filterArrays = generateFilterArrays(registrosParaFiltros);
      setNavierasFiltro(filterArrays.navierasFiltro);
      setEspeciesFiltro(filterArrays.especiesFiltro);
      setClientesFiltro(filterArrays.clientesFiltro);
      setPolsFiltro(filterArrays.polsFiltro);
      setDestinosFiltro(filterArrays.destinosFiltro);
      setDepositosFiltro(filterArrays.depositosFiltro);
      // Ejecutivos siempre muestran todos los disponibles
      const allEjecutivos = [...new Set(registrosVisibles.map(r => r.ejecutivo).filter(Boolean))].sort();
      setEjecutivosFiltro(allEjecutivos);
      setNavesFiltro(filterArrays.navesFiltro);
    } else {
      setNavierasNavesMapping({});
      setConsorciosNavesMapping({});
      setNavierasFiltro([]);
      setEspeciesFiltro([]);
      setClientesFiltro([]);
      setPolsFiltro([]);
      setDestinosFiltro([]);
      setDepositosFiltro([]);
      setEjecutivosFiltro([]);
      setNavesFiltro([]);
    }
  }, [registrosLength, registrosVisibles, registrosParaFiltros, createNavierasNavesMapping, createConsorciosNavesMapping, generateFilterArrays]);

  // Crear mapeo de registroId a factura
  const facturasPorRegistro = useMemo(() => {
    const mapa = new Map<string, Factura>();
    facturas.forEach(factura => {
      if (factura.registroId) {
        mapa.set(factura.registroId, factura);
      }
    });
    return mapa;
  }, [facturas]);

  // Cargar documentos proforma desde storage y crear Map de bookings con información del documento
  const [bookingsConProforma, setBookingsConProforma] = useState<Map<string, { nombre: string; fecha: string }>>(new Map());

  const loadProformaDocuments = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from('documentos')
        .list('factura-proforma', {
          limit: 1000,
          offset: 0,
          sortBy: { column: 'updated_at', order: 'desc' },
        });

      if (error) {
        console.warn('No se pudieron cargar documentos proforma:', error.message);
        return;
      }

      // Extraer bookings de los nombres de archivo y guardar información del documento
      const bookingsMap = new Map<string, { nombre: string; fecha: string }>();

      data?.forEach((file) => {
        const separatorIndex = file.name.indexOf('__');
        if (separatorIndex !== -1) {
          const bookingSegment = file.name.slice(0, separatorIndex);
          try {
            const booking = decodeURIComponent(bookingSegment).trim().toUpperCase().replace(/\s+/g, '');
            if (booking) {
              // Parsear nombre del archivo
              const { originalName } = parseStoredDocumentName(file.name);
              const nombreFormateado = formatFileDisplayName(originalName);

              // Formatear fecha en formato DD-MM-YYYY
              const fechaArchivo = file.updated_at || file.created_at;
              let fechaFormateada = '-';
              if (fechaArchivo) {
                const fecha = new Date(fechaArchivo);
                const dia = String(fecha.getDate()).padStart(2, '0');
                const mes = String(fecha.getMonth() + 1).padStart(2, '0');
                const año = fecha.getFullYear();
                fechaFormateada = `${dia}-${mes}-${año}`;
              }

              // Si ya existe un documento para este booking, mantener el más reciente
              const existente = bookingsMap.get(booking);
              if (!existente) {
                bookingsMap.set(booking, { nombre: nombreFormateado, fecha: fechaFormateada });
              } else if (fechaArchivo && existente.fecha !== '-') {
                // Comparar fechas en formato DD-MM-YYYY
                const fechaExistente = existente.fecha.split('-').reverse().join('-'); // DD-MM-YYYY -> YYYY-MM-DD
                const fechaNueva = fechaArchivo.split('T')[0]; // ISO string -> YYYY-MM-DD
                if (fechaNueva > fechaExistente) {
                  bookingsMap.set(booking, { nombre: nombreFormateado, fecha: fechaFormateada });
                }
              }
            }
          } catch {
            // Si falla decodeURIComponent, usar el segmento directamente
            const booking = bookingSegment.trim().toUpperCase().replace(/\s+/g, '');
            if (booking) {
              const { originalName } = parseStoredDocumentName(file.name);
              const nombreFormateado = formatFileDisplayName(originalName);
              const fechaArchivo = file.updated_at || file.created_at;
              // Formatear fecha en formato DD-MM-YYYY
              let fechaFormateada = '-';
              if (fechaArchivo) {
                const fecha = new Date(fechaArchivo);
                const dia = String(fecha.getDate()).padStart(2, '0');
                const mes = String(fecha.getMonth() + 1).padStart(2, '0');
                const año = fecha.getFullYear();
                fechaFormateada = `${dia}-${mes}-${año}`;
              }
              const existente = bookingsMap.get(booking);
              if (!existente) {
                bookingsMap.set(booking, { nombre: nombreFormateado, fecha: fechaFormateada });
              } else if (fechaArchivo && existente.fecha !== '-') {
                // Comparar fechas en formato DD-MM-YYYY
                const fechaExistente = existente.fecha.split('-').reverse().join('-'); // DD-MM-YYYY -> YYYY-MM-DD
                const fechaNueva = fechaArchivo.split('T')[0]; // ISO string -> YYYY-MM-DD
                if (fechaNueva > fechaExistente) {
                  bookingsMap.set(booking, { nombre: nombreFormateado, fecha: fechaFormateada });
                }
              }
            }
          }
        }
      });

      setBookingsConProforma(bookingsMap);
    } catch (err) {
      console.error('Error cargando documentos proforma:', err);
    }
  }, []);

  useEffect(() => {
    void loadProformaDocuments();
  }, [loadProformaDocuments]);

  // Cargar documentos booking desde storage
  const [bookingDocuments, setBookingDocuments] = useState<Map<string, { nombre: string; fecha: string }>>(new Map());

  useEffect(() => {
    const loadBookingDocuments = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.storage
          .from('documentos')
          .list('booking', {
            limit: 1000,
            offset: 0,
            sortBy: { column: 'updated_at', order: 'desc' },
          });

        if (error) {
          console.warn('No se pudieron cargar documentos booking:', error.message);
          return;
        }

        const bookingsMap = new Map<string, { nombre: string; fecha: string }>();

        data?.forEach((file) => {
          const separatorIndex = file.name.indexOf('__');
          if (separatorIndex !== -1) {
            const bookingSegment = file.name.slice(0, separatorIndex);
            try {
              const booking = decodeURIComponent(bookingSegment).trim().toUpperCase().replace(/\s+/g, '');
              if (booking) {
                const { originalName } = parseStoredDocumentName(file.name);
                // Usar el nombre original sin formatear para mostrar el nombre que el usuario le dio
                const nombreOriginal = originalName;

                const fechaArchivo = file.updated_at || file.created_at;
                let fechaFormateada = '-';
                if (fechaArchivo) {
                  const fecha = new Date(fechaArchivo);
                  const dia = String(fecha.getDate()).padStart(2, '0');
                  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
                  const año = fecha.getFullYear();
                  fechaFormateada = `${dia}-${mes}-${año}`;
                }

                const existente = bookingsMap.get(booking);
                if (!existente) {
                  bookingsMap.set(booking, { nombre: nombreOriginal, fecha: fechaFormateada });
                } else if (fechaArchivo && existente.fecha !== '-') {
                  const fechaExistente = existente.fecha.split('-').reverse().join('-');
                  const fechaNueva = fechaArchivo.split('T')[0];
                  if (fechaNueva > fechaExistente) {
                    bookingsMap.set(booking, { nombre: nombreOriginal, fecha: fechaFormateada });
                  }
                }
              }
            } catch {
              const booking = bookingSegment.trim().toUpperCase().replace(/\s+/g, '');
              if (booking) {
                const { originalName } = parseStoredDocumentName(file.name);
                // Usar el nombre original sin formatear para mostrar el nombre que el usuario le dio
                const nombreOriginal = originalName;
                const fechaArchivo = file.updated_at || file.created_at;
                let fechaFormateada = '-';
                if (fechaArchivo) {
                  const fecha = new Date(fechaArchivo);
                  const dia = String(fecha.getDate()).padStart(2, '0');
                  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
                  const año = fecha.getFullYear();
                  fechaFormateada = `${dia}-${mes}-${año}`;
                }
                const existente = bookingsMap.get(booking);
                if (!existente) {
                  bookingsMap.set(booking, { nombre: nombreOriginal, fecha: fechaFormateada });
                } else if (fechaArchivo && existente.fecha !== '-') {
                  const fechaExistente = existente.fecha.split('-').reverse().join('-');
                  const fechaNueva = fechaArchivo.split('T')[0];
                  if (fechaNueva > fechaExistente) {
                    bookingsMap.set(booking, { nombre: nombreOriginal, fecha: fechaFormateada });
                  }
                }
              }
            }
          }
        });

        setBookingDocuments(bookingsMap);
        console.log('Documentos booking cargados:', Array.from(bookingsMap.entries()));
      } catch (err) {
        console.error('Error cargando documentos booking:', err);
      }
    };

    void loadBookingDocuments();
  }, []);

  // Handler para ver factura
  const handleViewFactura = useCallback((factura: Factura) => {
    setFacturaSeleccionada(factura);
    setIsFacturaViewerOpen(true);
  }, []);

  const handleOpenProformaCreator = useCallback((registro: Registro) => {
    if (currentUser?.rol === 'cliente') {
      error('No tienes permisos para generar proformas.');
      return;
    }
    setRegistroSeleccionadoProforma(registro);
    setIsProformaCreatorOpen(true);
  }, [currentUser?.rol, error]);

  const handleCloseProformaCreator = useCallback(() => {
    setIsProformaCreatorOpen(false);
    setRegistroSeleccionadoProforma(null);
  }, []);

  const handleGenerateProforma = useCallback(async (factura: Factura) => {
    if (!registroSeleccionadoProforma) {
      throw new Error('No se seleccionó un registro para proforma.');
    }

    const refExterna = registroSeleccionadoProforma.refCliente?.trim();
    if (!refExterna) {
      throw new Error('La referencia externa es obligatoria para generar la proforma.');
    }

    const booking = registroSeleccionadoProforma.booking?.trim().toUpperCase().replace(/\s+/g, '');
    if (!booking) {
      throw new Error('El booking es obligatorio para generar la proforma.');
    }
    if (bookingsConProforma.has(booking)) {
      throw new Error('Ya existe una proforma para este booking.');
    }

    const supabase = createClient();
    const safeBaseName = refExterna.replace(/[\\/]/g, '-').trim();
    const fileBaseName = `${safeBaseName} PROFORMA`;
    const bookingSegment = encodeURIComponent(booking);

    const pdfResult = await generarFacturaPDF(factura, {
      returnBlob: true,
      fileNameBase: fileBaseName,
    });
    if (!pdfResult) {
      throw new Error('No se pudo generar el PDF de la proforma.');
    }

    const excelResult = await generarFacturaExcel(factura, {
      returnBlob: true,
      fileNameBase: fileBaseName,
    });
    if (!excelResult) {
      throw new Error('No se pudo generar el Excel de la proforma.');
    }

    const pdfPath = `factura-proforma/${bookingSegment}__${pdfResult.fileName}`;
    const excelPath = `factura-proforma/${bookingSegment}__${excelResult.fileName}`;

    const { error: pdfError } = await supabase.storage
      .from('documentos')
      .upload(pdfPath, pdfResult.blob, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'application/pdf',
      });

    if (pdfError) {
      throw pdfError;
    }

    const { error: excelError } = await supabase.storage
      .from('documentos')
      .upload(excelPath, excelResult.blob, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

    if (excelError) {
      throw excelError;
    }

    await loadProformaDocuments();
    success('Proforma generada y subida (PDF + Excel).');
    handleCloseProformaCreator();
  }, [registroSeleccionadoProforma, bookingsConProforma, loadProformaDocuments, success, handleCloseProformaCreator]);

  // Handler para subir proforma desde la tabla
  const handleUploadProforma = useCallback(async (booking: string, file: File) => {
    if (!booking || !booking.trim()) {
      error('El booking es requerido para subir la proforma.');
      return;
    }
    if (currentUser?.rol === 'cliente') {
      error('No tienes permisos para subir proformas.');
      return;
    }

    try {
      const supabase = createClient();
      const normalizedBooking = booking.trim().toUpperCase().replace(/\s+/g, '');
      const bookingSegment = encodeURIComponent(normalizedBooking);

      // Validar extensión del archivo
      const extension = file.name.split('.').pop()?.toLowerCase();
      const allowedExtensions = ['pdf', 'xls', 'xlsx'];
      if (!extension || !allowedExtensions.includes(extension)) {
        error('Solo se admiten archivos PDF o Excel (.xls, .xlsx).');
        return;
      }

      // Sanitizar nombre del archivo
      const sanitizeFileName = (name: string) => {
        const cleanName = name.toLowerCase().replace(/[^a-z0-9.\-]/g, '-');
        const [base, ext] = cleanName.split(/\.(?=[^.\s]+$)/);
        const safeBase = base?.replace(/-+/g, '-').replace(/^-|-$/g, '') || `archivo-${Date.now()}`;
        return `${safeBase}.${ext || 'pdf'}`;
      };

      const safeName = sanitizeFileName(file.name);
      const filePath = `factura-proforma/${bookingSegment}__${Date.now()}-0-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      success('Proforma subida correctamente.');

      // Recargar documentos proforma
      const { data, error: listError } = await supabase.storage
        .from('documentos')
        .list('factura-proforma', {
          limit: 1000,
          offset: 0,
          sortBy: { column: 'updated_at', order: 'desc' },
        });

      if (!listError && data) {
        const bookingsMap = new Map<string, { nombre: string; fecha: string }>();

        data.forEach((file) => {
          const separatorIndex = file.name.indexOf('__');
          if (separatorIndex !== -1) {
            const bookingSegment = file.name.slice(0, separatorIndex);
            try {
              const bookingKey = decodeURIComponent(bookingSegment).trim().toUpperCase().replace(/\s+/g, '');
              if (bookingKey) {
                const { originalName } = parseStoredDocumentName(file.name);
                const nombreFormateado = formatFileDisplayName(originalName);

                const fechaArchivo = file.updated_at || file.created_at;
                let fechaFormateada = '-';
                if (fechaArchivo) {
                  const fecha = new Date(fechaArchivo);
                  const dia = String(fecha.getDate()).padStart(2, '0');
                  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
                  const año = fecha.getFullYear();
                  fechaFormateada = `${dia}-${mes}-${año}`;
                }

                const existente = bookingsMap.get(bookingKey);
                if (!existente) {
                  bookingsMap.set(bookingKey, { nombre: nombreFormateado, fecha: fechaFormateada });
                } else if (fechaArchivo && existente.fecha !== '-') {
                  const fechaExistente = existente.fecha.split('-').reverse().join('-');
                  const fechaNueva = fechaArchivo.split('T')[0];
                  if (fechaNueva > fechaExistente) {
                    bookingsMap.set(bookingKey, { nombre: nombreFormateado, fecha: fechaFormateada });
                  }
                }
              }
            } catch {
              const bookingKey = bookingSegment.trim().toUpperCase().replace(/\s+/g, '');
              if (bookingKey) {
                const { originalName } = parseStoredDocumentName(file.name);
                const nombreFormateado = formatFileDisplayName(originalName);
                const fechaArchivo = file.updated_at || file.created_at;
                let fechaFormateada = '-';
                if (fechaArchivo) {
                  const fecha = new Date(fechaArchivo);
                  const dia = String(fecha.getDate()).padStart(2, '0');
                  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
                  const año = fecha.getFullYear();
                  fechaFormateada = `${dia}-${mes}-${año}`;
                }
                const existente = bookingsMap.get(bookingKey);
                if (!existente) {
                  bookingsMap.set(bookingKey, { nombre: nombreFormateado, fecha: fechaFormateada });
                } else if (fechaArchivo && existente.fecha !== '-') {
                  const fechaExistente = existente.fecha.split('-').reverse().join('-');
                  const fechaNueva = fechaArchivo.split('T')[0];
                  if (fechaNueva > fechaExistente) {
                    bookingsMap.set(bookingKey, { nombre: nombreFormateado, fecha: fechaFormateada });
                  }
                }
              }
            }
          }
        });

        setBookingsConProforma(bookingsMap);
      }
    } catch (err: any) {
      console.error('Error subiendo proforma:', err);
      error('No se pudo subir la proforma. Intenta nuevamente.');
    }
  }, [currentUser?.rol, success, error]);

  // Handler para abrir modal de booking
  const handleOpenBookingModal = useCallback((registro: Registro) => {
    if (currentUser?.rol === 'cliente') {
      error('No tienes permisos para editar bookings.');
      return;
    }
    setSelectedRegistroForBooking(registro);
    setIsBookingModalOpen(true);
  }, [currentUser?.rol, error]);

  // Handler para guardar booking y subir PDF
  const handleSaveBooking = useCallback(async (booking: string, file?: File, customFileName?: string) => {
    if (!selectedRegistroForBooking) {
      error('No se seleccionó un registro.');
      return;
    }
    if (currentUser?.rol === 'cliente') {
      error('No tienes permisos para editar bookings.');
      return;
    }

    try {
      const supabase = createClient();
      const registroId = selectedRegistroForBooking.id;

      if (!registroId) {
        error('El registro no tiene un ID válido.');
        return;
      }

      // Actualizar el booking en el registro
      const { error: updateError } = await supabase
        .from('registros')
        .update({ booking: booking.trim().toUpperCase() })
        .eq('id', registroId);

      if (updateError) {
        throw new Error(updateError.message || 'No tienes permisos para actualizar el booking.');
      }

      // Si hay un archivo, subirlo a storage
      if (file) {
        const normalizedBooking = booking.trim().toUpperCase().replace(/\s+/g, '');

        // Validar extensión del archivo
        const extension = file.name.split('.').pop()?.toLowerCase();
        if (extension !== 'pdf') {
          error('Solo se admiten archivos PDF.');
          return;
        }

        // Usar el nombre personalizado que el usuario proporcionó
        const fileNameToUse = customFileName && customFileName.trim()
          ? `${customFileName.trim()}.pdf`
          : file.name.replace(/\.pdf$/i, '') + '.pdf';

        // Sanitizar nombre del archivo (mantener caracteres normales)
        const safeName = sanitizeFileName(fileNameToUse);

        // Formato simple: bookingSegment__nombrePersonalizado.pdf (sin timestamp)
        const filePath = `booking/${normalizedBooking}__${safeName}`;

        // Intentar eliminar archivos anteriores para este booking
        try {
          const { data: existingFiles, error: listError } = await supabase.storage
            .from('documentos')
            .list('booking', {
              limit: 1000,
            });

          if (listError) {
            console.warn('Error al listar archivos existentes:', listError);
          } else if (existingFiles && existingFiles.length > 0) {
            const filesToDelete = existingFiles
              .filter(f => {
                const fileBookingKey = f.name.split('__')[0];
                try {
                  const decodedKey = decodeURIComponent(fileBookingKey);
                  return decodedKey === normalizedBooking || fileBookingKey === normalizedBooking;
                } catch {
                  return fileBookingKey === normalizedBooking;
                }
              })
              .map(f => `booking/${f.name}`);

            if (filesToDelete.length > 0) {
              const { error: deleteError } = await supabase.storage
                .from('documentos')
                .remove(filesToDelete);

              if (deleteError) {
                console.warn('Error al eliminar archivos anteriores:', deleteError);
              }
            }
          }
        } catch (deleteError) {
          // Si hay error al eliminar, continuar de todas formas
          console.warn('Error al procesar archivos anteriores:', deleteError);
        }

        const { error: uploadError } = await supabase.storage
          .from('documentos')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true,
          });

        if (uploadError) {
          throw uploadError;
        }

        // Actualizar el campo booking_pdf en la tabla registros con la ruta del archivo
        const { error: updatePdfError } = await supabase
          .from('registros')
          .update({ booking_pdf: filePath })
          .eq('id', registroId);

        if (updatePdfError) {
          console.warn('Error al actualizar booking_pdf en el registro:', updatePdfError);
          // No lanzar error, solo advertir, ya que el archivo se subió correctamente
        }
      }

      // Actualizar el estado local
      setRegistros(prevRegistros =>
        prevRegistros.map(record => {
          if (record.id === registroId) {
            const updatedRecord = { ...record, booking: booking.trim().toUpperCase() };
            if (file) {
              const normalizedBooking = booking.trim().toUpperCase().replace(/\s+/g, '');
              const fileNameToUse = customFileName && customFileName.trim()
                ? `${customFileName.trim()}.pdf`
                : file.name.replace(/\.pdf$/i, '') + '.pdf';
              const safeName = sanitizeFileName(fileNameToUse);
              updatedRecord.bookingPdf = `booking/${normalizedBooking}__${safeName}`;
            }
            return updatedRecord;
          }
          return record;
        })
      );

      // Si se subió un archivo, recargar documentos booking
      if (file) {
        const supabase = createClient();
        const { data, error } = await supabase.storage
          .from('documentos')
          .list('booking', {
            limit: 1000,
            offset: 0,
            sortBy: { column: 'updated_at', order: 'desc' },
          });

        if (!error && data) {
          const bookingsMap = new Map<string, { nombre: string; fecha: string }>();

          data.forEach((file) => {
            const separatorIndex = file.name.indexOf('__');
            if (separatorIndex !== -1) {
              const bookingSegment = file.name.slice(0, separatorIndex);
              try {
                const booking = decodeURIComponent(bookingSegment).trim().toUpperCase().replace(/\s+/g, '');
                if (booking) {
                  const { originalName } = parseStoredDocumentName(file.name);
                  const nombreFormateado = formatFileDisplayName(originalName);

                  const fechaArchivo = file.updated_at || file.created_at;
                  let fechaFormateada = '-';
                  if (fechaArchivo) {
                    const fecha = new Date(fechaArchivo);
                    const dia = String(fecha.getDate()).padStart(2, '0');
                    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
                    const año = fecha.getFullYear();
                    fechaFormateada = `${dia}-${mes}-${año}`;
                  }

                  const existente = bookingsMap.get(booking);
                  if (!existente) {
                    bookingsMap.set(booking, { nombre: nombreFormateado, fecha: fechaFormateada });
                  } else if (fechaArchivo && existente.fecha !== '-') {
                    const fechaExistente = existente.fecha.split('-').reverse().join('-');
                    const fechaNueva = fechaArchivo.split('T')[0];
                    if (fechaNueva > fechaExistente) {
                      bookingsMap.set(booking, { nombre: nombreFormateado, fecha: fechaFormateada });
                    }
                  }
                }
              } catch {
                const booking = bookingSegment.trim().toUpperCase().replace(/\s+/g, '');
                if (booking) {
                  const { originalName } = parseStoredDocumentName(file.name);
                  const nombreFormateado = formatFileDisplayName(originalName);
                  const fechaArchivo = file.updated_at || file.created_at;
                  let fechaFormateada = '-';
                  if (fechaArchivo) {
                    const fecha = new Date(fechaArchivo);
                    const dia = String(fecha.getDate()).padStart(2, '0');
                    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
                    const año = fecha.getFullYear();
                    fechaFormateada = `${dia}-${mes}-${año}`;
                  }
                  const existente = bookingsMap.get(booking);
                  if (!existente) {
                    bookingsMap.set(booking, { nombre: nombreFormateado, fecha: fechaFormateada });
                  } else if (fechaArchivo && existente.fecha !== '-') {
                    const fechaExistente = existente.fecha.split('-').reverse().join('-');
                    const fechaNueva = fechaArchivo.split('T')[0];
                    if (fechaNueva > fechaExistente) {
                      bookingsMap.set(booking, { nombre: nombreFormateado, fecha: fechaFormateada });
                    }
                  }
                }
              }
            }
          });

          setBookingDocuments(bookingsMap);
        }
      }

      success(file ? 'Booking y PDF guardados correctamente.' : 'Booking guardado correctamente.');
      setIsBookingModalOpen(false);
      setSelectedRegistroForBooking(null);
    } catch (err: any) {
      const errorMessage =
        err?.message ||
        err?.error?.message ||
        (typeof err === 'string' ? err : JSON.stringify(err));
      console.error('Error guardando booking:', err);
      error(`No se pudo guardar el booking. ${errorMessage || 'Intenta nuevamente.'}`);
    }
  }, [selectedRegistroForBooking, currentUser?.rol, success, error]);

  // Memoizar las columnas para evitar recrearlas en cada render
  const columns = useMemo(() => createRegistrosColumns(
    registrosVisibles, // data
    selectedRows, // selectedRows
    handleToggleRowSelection, // toggleRowSelection
    handleUpdateRecord,
    handleBulkUpdate, // onBulkUpdate
    navierasUnicas,
    ejecutivosUnicos,
    especiesUnicas,
    clientesUnicos,
    polsUnicos,
    destinosUnicos,
    depositosUnicos,
    navesUnicas,
    fletesUnicos,
    contratosUnicos,
    tipoIngresoUnicos,
    estadosUnicos,
    temperaturasUnicas,
    cbmUnicos,
    co2sUnicos,
    o2sUnicos,
    tratamientosFrioUnicos,
    tiposAtmosferaUnicos,
    facturacionesUnicas,
    handleShowHistorial,
    facturasPorRegistro,
    handleViewFactura,
    bookingsConProforma, // bookings con documentos proforma en storage
    handleUploadProforma, // handler para subir proforma
    handleOpenProformaCreator, // handler para generar proforma
    handleOpenBookingModal, // handler para abrir modal de booking
    bookingDocuments, // documentos PDF de booking en storage
    currentUser?.rol !== 'cliente'
  ), [
    registrosVisibles,
    selectedRows,
    handleToggleRowSelection,
    handleUpdateRecord,
    handleBulkUpdate,
    navierasUnicas,
    ejecutivosUnicos,
    especiesUnicas,
    clientesUnicos,
    polsUnicos,
    destinosUnicos,
    depositosUnicos,
    navesUnicas,
    fletesUnicos,
    contratosUnicos,
    tipoIngresoUnicos,
    estadosUnicos,
    temperaturasUnicas,
    cbmUnicos,
    co2sUnicos,
    o2sUnicos,
    tratamientosFrioUnicos,
    tiposAtmosferaUnicos,
    facturacionesUnicas,
    handleShowHistorial,
    facturasPorRegistro,
    handleViewFactura,
    bookingsConProforma,
    handleUploadProforma,
    handleOpenProformaCreator,
    handleOpenBookingModal,
    bookingDocuments,
    currentUser?.rol
  ]);

  if (loading) {
    return <LoadingScreen message="Cargando registros..." />;
  }

  if (!user) {
    return null;
  }

  const totalRegistros = new Set(registrosVisibles.map(r => r.refAsli).filter(Boolean)).size;
  const isRodrigo = currentUser?.email?.toLowerCase() === 'rodrigo.caceres@asli.cl';

  const toneBadgeClasses = {
    sky: 'bg-sky-500/20 text-sky-300',
    violet: 'bg-violet-500/20 text-violet-300',
    emerald: 'bg-emerald-500/20 text-emerald-300',
  } as const;

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
        { label: 'Embarques', id: '/registros', isActive: true, counter: registrosCount, tone: 'violet', icon: Ship },
        { label: 'Transportes', id: '/transportes', icon: Truck, counter: transportesCount, tone: 'sky' },
        { label: 'Documentos', id: '/documentos', icon: FileText },
        { label: 'Seguimiento Marítimo', id: '/dashboard/seguimiento', icon: Globe },
        { label: 'Tracking Movs', id: '/dashboard/tracking', icon: Activity },
        ...(isRodrigo
          ? [
            { label: 'Finanzas', id: '/finanzas', icon: DollarSign },
            { label: 'Reportes', id: '/reportes', icon: BarChart3 },
          ]
          : []),
      ],
    },
    {
      title: 'Sistema',
      items: [
        { label: 'Papelera', onClick: () => setIsTrashModalOpen(true), counter: trashCount, tone: 'violet', icon: Trash2 },
      ],
    },
    ...(currentUser?.rol === 'admin'
      ? [
        {
          title: 'Mantenimiento',
          items: [
            { label: 'Usuarios', id: '/mantenimiento', icon: Users },
          ],
        },
      ]
      : []),
  ];

  const toggleSidebar = () => setIsSidebarCollapsed(prev => !prev);

  return (
    <EditingCellProvider>
      <div className={`flex h-screen overflow-hidden ${theme === 'dark' ? 'bg-slate-900 text-slate-100' : 'bg-gray-50 text-gray-900'}`}>
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
          user={user}
          setShowProfileModal={setShowProfileModal}
        />

        <div
          className="flex flex-1 flex-col min-w-0 overflow-hidden transition-all"
          style={{ width: '100%', maxWidth: '100%' }}
        >
          <header className={`sticky top-0 z-40 border-b ${theme === 'dark' ? 'border-slate-700/60 bg-slate-800/95 backdrop-blur' : 'border-gray-200 bg-white/95 backdrop-blur'}`}>
            <div className="flex w-full flex-col gap-2 sm:gap-3 py-2 sm:py-2.5 md:py-3" style={{ paddingLeft: '8px', paddingRight: '4px' }}>
              <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between w-full">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 overflow-hidden">
                  {/* Botón hamburguesa para móvil */}
                  <button
                    onClick={() => setIsMobileMenuOpen(true)}
                    className={`lg:hidden flex h-8 w-8 items-center justify-center transition-colors flex-shrink-0 ${theme === 'dark'
                      ? 'text-slate-300 hover:bg-slate-700/60'
                      : 'text-gray-600 hover:bg-gray-100/80'
                      }`}
                    aria-label="Abrir menú"
                  >
                    <Menu className="h-4 w-4" />
                  </button>
                  {isSidebarCollapsed && !isMobileMenuOpen && (
                    <button
                      onClick={toggleSidebar}
                      className={`hidden lg:flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center border flex-shrink-0 ${theme === 'dark' ? 'border-slate-700/60 bg-slate-700/60 text-slate-300 hover:border-sky-500/60 hover:text-sky-200' : 'border-gray-300/60 bg-gray-100 text-gray-600 hover:border-blue-500 hover:text-blue-700'} transition`}
                      aria-label="Expandir menú lateral"
                    >
                      <ChevronRight className="h-4 w-4 sm:h-4 sm:w-4" />
                    </button>
                  )}
                  <div className="space-y-0.5 flex-1 min-w-0 overflow-hidden">
                    <p className={`text-[10px] sm:text-xs uppercase tracking-[0.2em] sm:tracking-[0.25em] truncate ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>Módulo Operativo</p>
                    <h1 className={`text-sm sm:text-base md:text-lg lg:text-xl font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Registros de Embarques</h1>
                    <p className={`hidden text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'} md:block truncate`}>Gestión de contenedores y embarques</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2 flex-shrink-0">
                  <button
                    onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
                    className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center border transition flex-shrink-0 ${isRightSidebarOpen
                      ? `${theme === 'dark' ? 'border-sky-500/60 bg-sky-500/10 text-sky-200' : 'border-blue-500 bg-blue-50 text-blue-600'}`
                      : `${theme === 'dark' ? 'border-slate-700/60 bg-slate-700/60 text-slate-300 hover:border-sky-500/60 hover:text-sky-200' : 'border-gray-300 bg-white text-gray-600 hover:border-blue-500 hover:text-blue-700'}`
                      }`}
                    aria-label={isRightSidebarOpen ? "Cerrar panel de filtros" : "Abrir panel de filtros"}
                  >
                    <Filter className="h-4 w-4 sm:h-4 sm:w-4" />
                  </button>
                  <div className="relative hidden sm:flex flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowProfileModal(true)}
                      className={`flex items-center gap-1.5 sm:gap-2 border ${theme === 'dark' ? 'border-slate-700/60 bg-slate-700/60 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-slate-200 hover:border-sky-500/60 hover:text-sky-200' : 'border-gray-300 bg-white px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-700 hover:border-blue-500 hover:text-blue-700'} transition`}
                      aria-haspopup="dialog"
                      title={currentUser?.nombre || user?.user_metadata?.full_name || user?.email || 'Usuario'}
                    >
                      <UserIcon className="h-4 w-4 sm:h-4 sm:w-4 flex-shrink-0" />
                      <span className="max-w-[100px] md:max-w-[160px] truncate font-medium text-xs sm:text-sm">
                        {currentUser?.nombre || user?.user_metadata?.full_name || user?.email || 'Usuario'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 min-w-0 min-h-0 w-full flex flex-col overflow-hidden">
            <section className={`border-0 w-full h-full flex flex-col min-h-0 min-w-0 overflow-hidden ${theme === 'dark' ? 'bg-slate-800/60' : 'bg-white'}`}>
              <DataTable
                data={registrosVisibles}
                columns={columns}
                navierasUnicas={navierasFiltro}
                ejecutivosUnicos={ejecutivosFiltro}
                especiesUnicas={especiesFiltro}
                clientesUnicos={clientesFiltro}
                polsUnicos={polsFiltro}
                destinosUnicos={destinosFiltro}
                depositosUnicos={depositosFiltro}
                onAdd={handleAdd}
                onEdit={handleEdit}
                onEditNaveViaje={handleEditNaveViaje}
                onBulkEditNaveViaje={handleBulkEditNaveViaje}
                onDelete={handleDelete}
                selectedRows={selectedRows}
                onToggleRowSelection={handleToggleRowSelection}
                onSelectAll={handleSelectAll}
                onClearSelection={handleClearSelection}
                onBulkDelete={handleBulkDelete}
                preserveFilters={true}
                onTableInstanceReady={handleTableInstanceReady}
                onShowHistorial={handleShowHistorial}
                onSendToTransportes={handleSendToTransportes}
                bookingDocuments={bookingDocuments}
              />
            </section>
          </main>
        </div>

        {/* Overlay para sidebar de filtros en móvil */}
        {isRightSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIsRightSidebarOpen(false)}
          />
        )}

        {/* Sidebar derecho para filtros y configuración de columnas */}
        <aside
          className={`fixed lg:relative right-0 top-0 z-50 lg:z-auto flex h-full flex-col transition-all duration-300 ${theme === 'dark' ? 'border-l border-slate-800/60 bg-slate-950/60' : 'border-l border-gray-200 bg-white'} backdrop-blur-xl ${isRightSidebarOpen
            ? 'translate-x-0 lg:w-80 lg:opacity-100 lg:pointer-events-auto'
            : 'translate-x-full lg:translate-x-0 lg:w-0 lg:opacity-0 lg:overflow-hidden lg:pointer-events-none'
            } w-80`}
        >
          <div className={`flex items-center justify-between px-4 py-4 border-b ${theme === 'dark' ? 'border-slate-700/60' : 'border-gray-200'}`}>
            <h2 className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>Filtros y Configuración</h2>
            <button
              onClick={() => setIsRightSidebarOpen(false)}
              className={`flex h-8 w-8 items-center justify-center border transition ${theme === 'dark' ? 'border-slate-700/60 bg-slate-700/60 text-slate-300 hover:border-sky-500/60 hover:text-sky-200' : 'border-gray-300 bg-white text-gray-600 hover:border-blue-500 hover:text-blue-700'}`}
              aria-label="Cerrar panel de filtros"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div
            className="flex-1 overflow-y-auto px-4 py-6 space-y-6"
            onWheel={(e) => {
              const element = e.currentTarget;
              const { scrollTop, scrollHeight, clientHeight } = element;
              const isScrollingUp = e.deltaY < 0;
              const isScrollingDown = e.deltaY > 0;

              // Si está en el top y hace scroll hacia arriba, prevenir
              if (isScrollingUp && scrollTop === 0) {
                e.stopPropagation();
                e.preventDefault();
                return;
              }

              // Si está en el bottom y hace scroll hacia abajo, prevenir
              if (isScrollingDown && scrollTop + clientHeight >= scrollHeight - 1) {
                e.stopPropagation();
                e.preventDefault();
                return;
              }
            }}
          >
            {/* Sección de Filtros */}
            {tableInstance && tableStates && (
              <div className="space-y-4">
                <h3 className={`text-xs uppercase tracking-[0.3em] ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Filtros</h3>
                <FiltersPanel
                  key={`filters-${tableInstance.getState().columnFilters.length}-${JSON.stringify(tableInstance.getState().columnFilters)}-${tableStates.executiveFilter || ''}-${Date.now()}`}
                  table={tableInstance}
                  executiveFilter={tableStates.executiveFilter || ''}
                  setExecutiveFilter={tableStates.setExecutiveFilter}
                  navierasUnicas={navierasFiltro}
                  ejecutivosUnicos={ejecutivosFiltro}
                  especiesUnicas={especiesFiltro}
                  clientesUnicos={clientesFiltro}
                  polsUnicos={polsFiltro}
                  destinosUnicos={destinosFiltro}
                  depositosUnicos={depositosFiltro}
                  navesFiltrables={tableStates.navesFiltrables}
                  compact={true}
                />
              </div>
            )}

            {/* Sección de Configuración de Columnas */}
            {tableStates && (
              <div className="space-y-4">
                <h3 className={`text-xs uppercase tracking-[0.3em] ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Columnas</h3>
                <ColumnToggleInline
                  columns={tableStates.columnToggleOptions}
                  onToggleColumn={tableStates.handleToggleColumn}
                  onToggleAll={tableStates.handleToggleAllColumns}
                  alwaysVisibleColumns={tableStates.alwaysVisibleColumns}
                />
              </div>
            )}
          </div>
        </aside>

        {/* Modals */}
        <AddModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => {
            loadRegistros();
            loadCatalogos();
            // No cerrar el modal automáticamente para permitir enviar el correo
          }}
          createdByName={
            currentUser?.nombre || user?.user_metadata?.full_name || user?.email || 'Usuario'
          }
          userEmail={currentUser?.email || user?.email || null}
          navierasUnicas={navierasUnicas}
          ejecutivosUnicos={ejecutivosUnicos}
          especiesUnicas={especiesUnicas}
          clientesUnicos={clientesUnicos}
          refExternasUnicas={refExternasUnicas}
          polsUnicos={polsUnicos}
          destinosUnicos={destinosUnicos}
          depositosUnicos={depositosUnicos}
          navesUnicas={navesUnicas}
          navierasNavesMapping={navierasNavesMappingCatalog}
          consorciosNavesMapping={consorciosNavesMappingCatalog}
          cbmUnicos={cbmUnicos}
          fletesUnicos={fletesUnicos}
          contratosUnicos={contratosUnicos}
          co2sUnicos={co2sUnicos}
          o2sUnicos={o2sUnicos}
          tratamientosDeFrioOpciones={tratamientosFrioUnicos}
          clienteFijadoPorCoincidencia={
            !isEjecutivo && clientesAsignados.length === 1
              ? clientesAsignados[0]
              : undefined
          }
        />

        <EditModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={() => {
            loadRegistros();
            loadCatalogos();
            setIsEditModalOpen(false);
          }}
          record={selectedRecord}
          navierasUnicas={navierasUnicas}
          navesUnicas={navesUnicas}
          navierasNavesMapping={navierasNavesMappingCatalog}
          consorciosNavesMapping={consorciosNavesMappingCatalog}
          refExternasUnicas={refExternasUnicas}
          tratamientosDeFrioOpciones={tratamientosFrioUnicos}
        />

        <TrashModal
          isOpen={isTrashModalOpen}
          onClose={() => setIsTrashModalOpen(false)}
          onRestore={() => {
            loadRegistros();
            loadTrashCount();
            setIsTrashModalOpen(false);
          }}
          onSuccess={success}
          onError={error}
        />

        {selectedRegistroForHistorial && (
          <HistorialModal
            isOpen={isHistorialModalOpen}
            onClose={handleCloseHistorial}
            registroId={selectedRegistroForHistorial.id || ''}
            registroRefAsli={selectedRegistroForHistorial.refAsli}
          />
        )}

        <BookingModal
          isOpen={isBookingModalOpen}
          onClose={() => {
            setIsBookingModalOpen(false);
            setSelectedRegistroForBooking(null);
          }}
          onSave={handleSaveBooking}
          currentBooking={selectedRegistroForBooking?.booking || ''}
          registroId={selectedRegistroForBooking?.id || ''}
          existingDocument={
            (() => {
              if (!selectedRegistroForBooking?.booking) return null;
              const bookingKey = selectedRegistroForBooking.booking.trim().toUpperCase().replace(/\s+/g, '');
              const doc = bookingDocuments.get(bookingKey);
              console.log('🔍 Buscando documento para booking:', bookingKey);
              console.log('📊 Total documentos cargados:', bookingDocuments.size);
              console.log('📋 Claves disponibles:', Array.from(bookingDocuments.keys()).slice(0, 10));
              console.log('✅ Documento encontrado:', doc);
              return doc || null;
            })()
          }
        />

        {isProformaCreatorOpen && registroSeleccionadoProforma && (
          <FacturaCreator
            registro={registroSeleccionadoProforma}
            isOpen={isProformaCreatorOpen}
            onClose={handleCloseProformaCreator}
            onSave={handleCloseProformaCreator}
            mode="proforma"
            onGenerateProforma={handleGenerateProforma}
          />
        )}


        <UserProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          userInfo={currentUser}
          onUserUpdate={(updatedUser) => {
            setCurrentUser({ ...currentUser, ...updatedUser });
          }}
        />

        {facturaSeleccionada && (
          <FacturaViewer
            factura={facturaSeleccionada}
            isOpen={isFacturaViewerOpen}
            onClose={() => {
              setIsFacturaViewerOpen(false);
              setFacturaSeleccionada(null);
            }}
            onUpdate={loadFacturas}
          />
        )}

        {deleteConfirm && (
          <div
            className="fixed inset-0 z-[1300] flex items-center justify-center bg-slate-950/80 px-4 py-6 backdrop-blur-sm"
            onClick={handleCancelDelete}
            role="presentation"
          >
            <div
              className="w-full max-w-md border border-white/10 bg-slate-950/90 p-6"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-confirm-title"
            >
              <div className="flex items-start gap-4">
                <span className="inline-flex h-10 w-10 items-center justify-center border border-amber-400/40 bg-amber-500/10 text-amber-200">
                  <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h3 id="delete-confirm-title" className="text-lg font-medium text-white">
                    {deleteConfirm.mode === 'bulk' ? 'Eliminar registros' : 'Eliminar registro'}
                  </h3>
                  <p className="mt-2 text-sm text-slate-300">
                    {deleteConfirm.mode === 'bulk'
                      ? `¿Quieres enviar ${deleteConfirm.registros.length} registro(s) a la papelera?`
                      : `¿Quieres enviar el registro ${deleteConfirm.registros[0]?.refAsli ?? ''} a la papelera?`}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCancelDelete}
                  disabled={deleteProcessing}
                  className="inline-flex items-center justify-center gap-2 border border-slate-700/70 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={deleteProcessing}
                  className="inline-flex items-center justify-center gap-2 bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deleteProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      Procesando…
                    </>
                  ) : (
                    'Enviar a papelera'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {(selectedRegistroForNaveViaje || selectedRecordsForNaveViaje.length > 0) && (
          <EditNaveViajeModal
            isOpen={isEditNaveViajeModalOpen}
            onClose={handleCloseNaveViajeModal}
            record={selectedRegistroForNaveViaje}
            records={selectedRecordsForNaveViaje.length > 0 ? selectedRecordsForNaveViaje : undefined}
            navesUnicas={navesUnicas}
            navierasNavesMapping={navierasNavesMappingCatalog}
            consorciosNavesMapping={consorciosNavesMappingCatalog}
            onSave={handleSaveNaveViaje}
            onBulkSave={handleBulkSaveNaveViaje}
          />
        )}

        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </div>
    </EditingCellProvider>
  );
}

const Activity = (props: any) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24" height="24" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round"
  >
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
  </svg>
);
