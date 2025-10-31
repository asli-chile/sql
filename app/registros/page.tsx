'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { LogOut, ArrowLeft, User as UserIcon } from 'lucide-react';

// Importar todos los componentes existentes
import { DataTable } from '@/components/DataTable';
import { createRegistrosColumns } from '@/components/columns/registros-columns';
import { EditModal } from '@/components/EditModal';
import { AddModal } from '@/components/AddModal';
import { TrashModal } from '@/components/TrashModal';
import { HistorialModal } from '@/components/HistorialModal';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ThemeTest } from '@/components/ThemeTest';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/hooks/useUser';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/Toast';
import { EditingCellProvider } from '@/contexts/EditingCellContext';
import { Registro } from '@/types/registros';
import { convertSupabaseToApp } from '@/lib/migration-utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Ship, Package, Clock, CheckCircle, Container, Trash2, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';

interface User {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string;
  };
}

export default function RegistrosPage() {
  const { theme } = useTheme();
  const { currentUser, setCurrentUser } = useUser();
  const { toasts, removeToast, success, error, warning } = useToast();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Estados existentes del sistema de registros
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [navierasUnicas, setNavierasUnicas] = useState<string[]>([]);
  const [ejecutivosUnicos, setEjecutivosUnicos] = useState<string[]>([]);
  const [especiesUnicas, setEspeciesUnicas] = useState<string[]>([]);
  const [clientesUnicos, setClientesUnicos] = useState<string[]>([]);
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
  const [facturacionesUnicas, setFacturacionesUnicas] = useState<string[]>([]);
  
  const [navierasFiltro, setNavierasFiltro] = useState<string[]>([]);
  const [ejecutivosFiltro, setEjecutivosFiltro] = useState<string[]>([]);
  const [especiesFiltro, setEspeciesFiltro] = useState<string[]>([]);
  const [clientesFiltro, setClientesFiltro] = useState<string[]>([]);
  const [polsFiltro, setPolsFiltro] = useState<string[]>([]);
  const [destinosFiltro, setDestinosFiltro] = useState<string[]>([]);
  const [depositosFiltro, setDepositosFiltro] = useState<string[]>([]);
  const [yearsFiltro, setYearsFiltro] = useState<string[]>([]);
  const [navesFiltro, setNavesFiltro] = useState<string[]>([]);
  
  const [selectedRecord, setSelectedRecord] = useState<Registro | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isTrashModalOpen, setIsTrashModalOpen] = useState(false);
  const [isHistorialModalOpen, setIsHistorialModalOpen] = useState(false);
  const [selectedRegistroForHistorial, setSelectedRegistroForHistorial] = useState<Registro | null>(null);
  
  // Estado para preservar filtros del DataTable
  const [preservedFilters, setPreservedFilters] = useState({
    globalFilter: '',
    columnFilters: [] as any[],
    dateFilters: {} as any,
    columnVisibility: {} as Record<string, boolean>
  });

  // Estado para selección múltiple
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const lastSelectedRowIndex = useRef<number | null>(null);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const supabase = createClient();
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) throw error;
      
      if (!user) {
        router.push('/auth');
        return;
      }

      setUser(user);
      
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
          nombre: user.email?.split('@')[0] || 'Usuario',
          email: user.email || '',
          rol: 'usuario',
          activo: true
        };
        setCurrentUser(basicUser);
      } else {
        // Establecer el usuario en el contexto
        console.log('🔍 Usuario cargado desde BD:', userData);
        setCurrentUser({
          id: userData.id,
          nombre: userData.nombre,
          email: userData.email,
          rol: userData.rol,
          activo: userData.activo
        });
        console.log('✅ Usuario establecido en contexto:', {
          id: userData.id,
          nombre: userData.nombre,
          email: userData.email,
          rol: userData.rol,
          activo: userData.activo
        });
      }
      
      // Cargar datos después de verificar usuario
      await loadRegistros();
      await loadCatalogos();
    } catch (error) {
      console.error('Error checking user:', error);
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

  // Funciones existentes del sistema de registros
  const loadRegistros = async () => {
    try {
      console.log('🔄 Cargando registros desde Supabase...');
      const supabase = createClient();
      const { data, error } = await supabase
        .from('registros')
        .select('*')
        .is('deleted_at', null)
        .order('ref_asli', { ascending: false });

      if (error) {
        console.error('Error en consulta de registros:', error);
        throw error;
      }

      console.log(`✅ Registros cargados: ${data?.length || 0} registros`);
      const registrosConvertidos = data.map(convertSupabaseToApp);
      setRegistros(registrosConvertidos);
      console.log('✅ Registros convertidos y establecidos en estado');
    } catch (error) {
      console.error('Error loading registros:', error);
    }
  };

  const loadCatalogos = async () => {
    try {
      console.log('🔄 Iniciando carga de catálogos desde Supabase...');
      
      const supabase = createClient();
      
      // Cargar catálogo de estados primero
      await loadEstadosFromCatalog();
      
      const { data: catalogos, error } = await supabase
        .from('catalogos')
        .select('*');

      if (error) {
        console.error('Error loading catalogos:', error);
        return;
      }

      console.log('📊 Catálogos cargados:', catalogos);

      // Procesar catálogos
      catalogos.forEach(catalogo => {
        const valores = catalogo.valores || [];
        const mapping = catalogo.mapping;
        console.log(`📋 Procesando catálogo ${catalogo.categoria}:`, valores);

        switch (catalogo.categoria) {
          case 'navieras':
            setNavierasUnicas(valores);
            setNavierasFiltro(valores);
            break;
          case 'ejecutivos':
            setEjecutivosUnicos(valores);
            setEjecutivosFiltro(valores);
            break;
          case 'especies':
            setEspeciesUnicas(valores);
            setEspeciesFiltro(valores);
            break;
          case 'clientes':
            setClientesUnicos(valores);
            setClientesFiltro(valores);
            break;
          case 'pols':
            setPolsUnicos(valores);
            setPolsFiltro(valores);
            break;
          case 'destinos':
            setDestinosUnicos(valores);
            setDestinosFiltro(valores);
            break;
          case 'depositos':
            setDepositosUnicos(valores);
            setDepositosFiltro(valores);
            break;
          case 'naves':
            setNavesUnicas(valores);
            break;
          case 'fletes':
            setFletesUnicos(valores);
            break;
          case 'cbm':
            setCbmUnicos(valores);
            break;
          case 'contratos':
            setContratosUnicos(valores);
            break;
          case 'tipoIngreso':
            setTipoIngresoUnicos(valores);
            break;
          case 'temperatura':
            setTemperaturasUnicas(valores);
            break;
          case 'co2':
            setCo2sUnicos(valores);
            break;
          case 'o2':
            setO2sUnicos(valores);
            break;
          case 'facturacion':
            setFacturacionesUnicas(valores);
            break;
          
          // CARGAR MAPPINGS DESDE EL CATÁLOGO
          case 'navierasNavesMapping':
            if (mapping && typeof mapping === 'object') {
              console.log('🗺️ ✅ Mapping de navieras cargado desde catálogo:', mapping);
              setNavierasNavesMapping(mapping as Record<string, string[]>);
            } else {
              console.warn('⚠️ navierasNavesMapping no tiene mapping válido');
            }
            break;
            
          case 'consorciosNavesMapping':
            if (mapping && typeof mapping === 'object') {
              console.log('🗺️ ✅ Mapping de consorcios cargado desde catálogo:', mapping);
              setConsorciosNavesMapping(mapping as Record<string, string[]>);
            } else {
              console.warn('⚠️ consorciosNavesMapping no tiene mapping válido');
            }
            break;
        }
      });

      console.log('✅ Catálogos procesados exitosamente');
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
      console.log('✅ Estados cargados desde catálogo:', estados);
    } catch (error) {
      console.error('Error cargando estados desde catálogo:', error);
      setEstadosUnicos(['PENDIENTE', 'CONFIRMADO', 'CANCELADO']);
    }
  };

  const loadStats = async () => {
    // Esta función se puede usar para recargar estadísticas si es necesario
    // Por ahora no hace nada específico ya que las estadísticas se calculan en tiempo real
    console.log('Stats reloaded');
  };

  // Funciones de manejo de eventos
  const handleAdd = () => {
    setIsAddModalOpen(true);
  };

  const handleEdit = (registro: Registro) => {
    setSelectedRecord(registro);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (registro: Registro) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar el registro ${registro.refAsli}?`)) {
      return;
    }

    try {
      const supabase = createClient();
      
      // Marcar como eliminado (soft delete)
      const { error } = await supabase
        .from('registros')
        .update({ 
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', registro.id);

      if (error) {
        console.error('Error al eliminar registro:', error);
        alert('Error al eliminar el registro: ' + error.message);
        return;
      }

      // Actualizar el estado local
      setRegistros(prevRegistros => 
        prevRegistros.filter(r => r.id !== registro.id)
      );

      // Actualizar estadísticas
      await loadStats();
      
      alert('Registro eliminado correctamente');
    } catch (error) {
      console.error('Error inesperado:', error);
      alert('Error inesperado al eliminar el registro');
    }
  };

  const handleExport = (filteredData?: Registro[]) => {
    const dataToExport = filteredData || registros;
    
    if (dataToExport.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    const ws = XLSX.utils.json_to_sheet(dataToExport.map(record => ({
      'REF ASLI': record.refAsli,
      'Cliente': record.shipper,
      'Booking': record.booking,
      'Contenedor': record.contenedor,
      'Naviera': record.naviera,
      'Nave': record.naveInicial,
      'Especie': record.especie,
      'Temperatura': record.temperatura,
      'CBM': record.cbm,
      'CO2': record.co2,
      'O2': record.o2,
      'POL': record.pol,
      'POD': record.pod,
      'Depósito': record.deposito,
      'ETD': record.etd ? new Date(record.etd).toLocaleDateString('es-CL') : '',
      'ETA': record.eta ? new Date(record.eta).toLocaleDateString('es-CL') : '',
      'TT': record.tt,
      'Flete': record.flete,
      'Ejecutivo': record.ejecutivo,
      'Estado': record.estado,
      'Tipo Ingreso': record.tipoIngreso,
      'Contrato': record.contrato,
      'Comentario': record.comentario
    })));

    // Aplicar estilos
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Registros');

    // Generar nombre de archivo con fecha
    const fecha = new Date().toISOString().split('T')[0];
    const filename = `registros_asli_${fecha}.xlsx`;

    XLSX.writeFile(wb, filename);
  };

  const handleShowHistorial = (registro: Registro) => {
    setSelectedRegistroForHistorial(registro);
    setIsHistorialModalOpen(true);
  };

  const handleCloseHistorial = () => {
    setIsHistorialModalOpen(false);
    setSelectedRegistroForHistorial(null);
  };

  // Funciones para selección múltiple
  const handleToggleSelectionMode = () => {
    console.log('🔄 Cambiando modo selección:', !selectionMode);
    setSelectionMode(!selectionMode);
    if (selectionMode) {
      setSelectedRows(new Set());
    }
  };

  const handleToggleRowSelection = useCallback((recordId: string, rowIndex?: number, event?: React.MouseEvent<HTMLInputElement>) => {
    const isShiftPressed = event?.shiftKey || false;
    const currentIndex = rowIndex ?? registros.findIndex(r => r.id === recordId);
    
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
      const lastSelectedId = registros[lastSelectedRowIndex.current]?.id;
      const shouldSelect = lastSelectedId ? selectedRows.has(lastSelectedId) : true;
      
      // Optimizar: evitar verificaciones innecesarias en el bucle
      if (shouldSelect) {
        // Agregar todas las filas del rango
        for (let i = startIndex; i <= endIndex; i++) {
          const rowId = registros[i]?.id;
          if (rowId) newSelectedRows.add(rowId);
        }
      } else {
        // Eliminar todas las filas del rango
        for (let i = startIndex; i <= endIndex; i++) {
          const rowId = registros[i]?.id;
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
  }, [selectedRows, registros]);

  const handleSelectAll = () => {
    if (selectedRows.size === registros.length) {
      setSelectedRows(new Set());
      lastSelectedRowIndex.current = null;
    } else {
      setSelectedRows(new Set(registros.map(r => r.id).filter((id): id is string => Boolean(id))));
      // Guardar el índice de la última fila cuando se selecciona todo
      lastSelectedRowIndex.current = registros.length - 1;
    }
  };

  const handleClearSelection = () => {
    setSelectedRows(new Set());
    lastSelectedRowIndex.current = null;
  };

  const handleBulkDelete = async () => {
    if (selectedRows.size === 0) return;
    
    const confirmMessage = `¿Estás seguro de que quieres eliminar ${selectedRows.size} registro(s)?`;
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const supabase = createClient();
      
      // Marcar múltiples registros como eliminados (soft delete)
      const { error } = await supabase
        .from('registros')
        .update({ 
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .in('id', Array.from(selectedRows));

      if (error) {
        console.error('Error al eliminar registros:', error);
        alert('Error al eliminar los registros: ' + error.message);
        return;
      }

      // Actualizar el estado local
      setRegistros(prevRegistros => 
        prevRegistros.filter(r => r.id && !selectedRows.has(r.id))
      );

      // Limpiar selección y salir del modo selección
      setSelectedRows(new Set());
      setSelectionMode(false);
      
      // Actualizar estadísticas
      await loadStats();
      
      alert(`${selectedRows.size} registro(s) eliminado(s) correctamente`);
    } catch (error) {
      console.error('Error inesperado:', error);
      alert('Error inesperado al eliminar los registros');
    }
  };

  const handleUpdateRecord = (updatedRecord: Registro) => {
    setRegistros(prevRegistros => 
      prevRegistros.map(record => 
        record.id === updatedRecord.id ? updatedRecord : record
      )
    );
  };

  const handleBulkUpdate = async (field: keyof Registro, value: any, selectedRecords: Registro[]) => {
    if (selectedRecords.length === 0) return;

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
      
      // Preparar datos para actualizar
      const dbFieldName = getDatabaseFieldName(field);
      const updateData: any = {
        [dbFieldName]: value,
        updated_at: new Date().toISOString()
      };

      // Si estamos editando ETD o ETA, recalcular TT para cada registro
      if (field === 'etd' || field === 'eta') {
        // Para edición masiva, mantenemos el TT original o lo calculamos si ambos campos están presentes
        console.log('Edición masiva de fecha - TT se mantendrá igual');
      }

      // Obtener IDs de los registros seleccionados
      const recordIds = selectedRecords.map(record => record.id).filter((id): id is string => Boolean(id));
      
      if (recordIds.length === 0) {
        console.warn('No hay IDs válidos para actualizar');
        return;
      }

      // Actualizar en Supabase
      const { data, error: updateError } = await supabase
        .from('registros')
        .update(updateData)
        .in('id', recordIds);

      if (updateError) {
        throw updateError;
      }

      // Crear historial para cada registro actualizado
      for (const record of selectedRecords) {
        try {
          await supabase.rpc('crear_historial_manual', {
            registro_uuid: record.id,
            campo: dbFieldName, // Usar el nombre de campo de la base de datos
            valor_anterior: record[field] || 'NULL',
            valor_nuevo: value || 'NULL'
          });
        } catch (historialError) {
          console.warn(`⚠️ Error creando historial para registro ${record.id}:`, historialError);
        }
      }

      // Actualizar el estado local
      setRegistros(prevRegistros => 
        prevRegistros.map(record => {
          if (selectedRecords.some(selected => selected.id === record.id)) {
            return {
              ...record,
              [field]: value,
              updated_at: new Date().toISOString()
            };
          }
          return record;
        })
      );

      console.log(`✅ Actualizados ${selectedRecords.length} registros en el campo ${field}`);
      
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
      success(`✅ Se actualizaron ${selectedRecords.length} registros en el campo "${fieldDisplayName}"`);

    } catch (err: any) {
      console.error('Error en edición masiva:', err);
      error(`Error al actualizar los registros: ${err.message}`);
    }
  };

  // Estado para los mapeos de naves
  const [navierasNavesMapping, setNavierasNavesMapping] = useState<Record<string, string[]>>({});
  const [consorciosNavesMapping, setConsorciosNavesMapping] = useState<Record<string, string[]>>({});

  // Crear mapeos de navieras a naves (considerando naves compartidas)
  const createNavierasNavesMapping = (registrosData: Registro[]) => {
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
  };

  // Crear mapeos de consorcios a naves
  const createConsorciosNavesMapping = (registrosData: Registro[]) => {
    const mapping: Record<string, string[]> = {};
    
    console.log('🔍 Debug consorcios - Registros disponibles:', registrosData.length);
    console.log('🔍 Debug consorcios - Navieras únicas:', [...new Set(registrosData.map(r => r.naviera).filter(Boolean))]);
    
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
    
    console.log('🔍 Consorcios encontrados en datos:', consorciosEncontrados);
    
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
    
    console.log('🔍 Mapping final de consorcios:', consorciosEncontrados);
    return consorciosEncontrados;
  };

  // Función para generar arrays de filtro basados en datos reales
  const generateFilterArrays = (registrosData: Registro[]) => {
    const navierasFiltro = [...new Set(registrosData.map(r => r.naviera).filter(Boolean))].sort();
    const especiesFiltro = [...new Set(registrosData.map(r => r.especie).filter(Boolean))].sort();
    const clientesFiltro = [...new Set(registrosData.map(r => r.shipper).filter(Boolean))].sort();
    const polsFiltro = [...new Set(registrosData.map(r => r.pol).filter(Boolean))].sort();
    const destinosFiltro = [...new Set(registrosData.map(r => r.pod).filter(Boolean))].sort();
    const ejecutivosFiltro = [...new Set(registrosData.map(r => r.ejecutivo).filter(Boolean))].sort();
    const navesFiltro = [...new Set(registrosData.map(r => r.naveInicial).filter(Boolean))].sort();
    const depositosFiltro = [...new Set(registrosData.map(r => r.deposito).filter(Boolean))].sort();
    
    // Generar años únicos de las fechas
    const yearsFiltro = [...new Set(
      registrosData
        .map(r => r.ingresado ? new Date(r.ingresado).getFullYear() : null)
        .filter((year): year is number => year !== null)
    )].map(year => year.toString()).sort();
    
    return {
      navierasFiltro,
      especiesFiltro,
      clientesFiltro,
      polsFiltro,
      destinosFiltro,
      ejecutivosFiltro,
      navesFiltro,
      depositosFiltro,
      yearsFiltro
    };
  };

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

  // Actualizar mapeos y filtros cuando cambien los registros
  useEffect(() => {
    if (registros.length > 0) {
      const navierasMapping = createNavierasNavesMapping(registros);
      const consorciosMapping = createConsorciosNavesMapping(registros);
      
      setNavierasNavesMapping(navierasMapping);
      setConsorciosNavesMapping(consorciosMapping);
      
      // Generar arrays de filtro basados en datos reales
      const filterArrays = generateFilterArrays(registros);
      setNavierasFiltro(filterArrays.navierasFiltro);
      setEspeciesFiltro(filterArrays.especiesFiltro);
      setClientesFiltro(filterArrays.clientesFiltro);
      setPolsFiltro(filterArrays.polsFiltro);
      setDestinosFiltro(filterArrays.destinosFiltro);
      setEjecutivosFiltro(filterArrays.ejecutivosFiltro);
      setNavesFiltro(filterArrays.navesFiltro);
      
      console.log('🔧 Mapeos y filtros actualizados:', {
        navierasNavesMapping: navierasMapping,
        consorciosNavesMapping: consorciosMapping,
        totalRegistros: registros.length,
        registrosConNaviera: registros.filter(r => r.naviera && r.naveInicial).length,
        filtrosGenerados: filterArrays
      });

      // Debug específico para HAPAG-LLOYD / ONE / MSC
      const hapagRegistros = registros.filter(r => r.naviera && r.naviera.includes('HAPAG'));
      console.log('🔍 Registros HAPAG-LLOYD:', hapagRegistros.map(r => ({ naviera: r.naviera, nave: r.naveInicial })));
    }
  }, [registros]);

  // Crear columnas con permisos basados en usuario autenticado
  const columns = createRegistrosColumns(
    registros, // data
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
    facturacionesUnicas,
    handleShowHistorial
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0a1628' }}>
        <div className="text-center w-full max-w-4xl px-8">
          <div className="w-64 h-64 mx-auto mb-8 flex items-center justify-center">
            <img
              src="https://asli.cl/img/logo.png?v=1761679285274&t=1761679285274"
              alt="ASLI Logo"
              className="max-w-full max-h-full object-contain"
              style={{
                animation: 'zoomInOut 2s ease-in-out infinite'
              }}
              onError={(e) => {
                console.log('Error cargando logo:', e);
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 px-4" style={{ color: '#ffffff' }}>
            Asesorías y Servicios Logísticos Integrales Ltda.
          </h2>
          <p className="text-lg" style={{ color: '#ffffff' }}>Cargando registros...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <EditingCellProvider>
      <div 
        className="min-h-screen transition-colors"
        style={{
          backgroundColor: theme === 'dark' ? '#0a0a0a' : '#f9fafb'
        }}
      >
      {/* Header */}
      <header 
        className="shadow-sm border-b transition-colors"
        style={{
          backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
          borderColor: theme === 'dark' ? '#374151' : '#e5e7eb'
        }}
      >
        <div className="max-w-[98%] mx-auto px-2 sm:px-4 lg:px-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center space-x-2 text-gray-800 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-sm sm:text-base">Volver al Dashboard</span>
              </button>
              <div className="hidden sm:block w-px h-6 bg-gray-300 dark:bg-gray-600"></div>
              <div className="flex items-center space-x-3">
                <div className="w-14 h-14 sm:w-20 sm:h-20 flex items-center justify-center">
                  <img
                    src="https://asli.cl/img/logo.png?v=1761679285274&t=1761679285274"
                    alt="ASLI Logo"
                    className="max-w-full max-h-full object-contain logo-glow"
                    onError={(e) => {
                      console.log('Error cargando logo:', e);
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
                <div>
                  <h1 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Registros de Embarques</h1>
                  <p className="text-xs sm:text-sm text-gray-800 dark:text-gray-300">Gestión de contenedores y embarques</p>
                </div>
              </div>
            </div>

            {/* User menu */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <ThemeToggle />
              <ThemeTest />
              <div className="flex items-center space-x-2">
                <UserIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-400" />
                <span className="text-xs sm:text-sm text-gray-800">
                  {user.user_metadata?.full_name || user.email}
                </span>
              </div>
              <button
                onClick={() => setIsTrashModalOpen(true)}
                className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-2 text-gray-800 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="text-xs sm:text-sm">Papelera</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-2 text-gray-800 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="text-xs sm:text-sm">Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-[98%] mx-auto px-2 sm:px-4 lg:px-6 py-8">
        {/* Estadísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card 
            className="transition-colors"
            style={{
              backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
              borderColor: theme === 'dark' ? '#374151' : '#e5e7eb'
            }}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle 
                className="text-sm font-medium"
                style={{ color: theme === 'dark' ? '#f9fafb' : '#111827' }}
              >
                Total Registros
              </CardTitle>
              <Package 
                className="h-4 w-4"
                style={{ color: theme === 'dark' ? '#9ca3af' : '#6b7280' }}
              />
            </CardHeader>
            <CardContent>
              <div 
                className="text-2xl font-bold"
                style={{ color: theme === 'dark' ? '#f9fafb' : '#111827' }}
              >
                {new Set(registros.map(r => r.refAsli).filter(Boolean)).size}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">Total Bookings</CardTitle>
              <FileText className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {registros.filter(r => r.booking && r.booking !== '-').length}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">Total Contenedores</CardTitle>
              <Container className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {registros
                  .filter(r => r.contenedor && r.contenedor !== '-' && r.contenedor !== null && r.contenedor !== '')
                  .flatMap(r => {
                    const contenedorStr = r.contenedor.toString().trim();
                    
                    // Detectar patrones como "MSDU 902964-3", "mnbu 1234567", etc.
                    // Patrón: 4 letras (mayúsculas o minúsculas) + espacio + 7 caracteres
                    const containerPattern = /[A-Za-z]{4}\s+.{7}/g;
                    const containerMatches = contenedorStr.match(containerPattern);
                    
                    if (containerMatches && containerMatches.length > 0) {
                      // Si hay patrones de contenedor, usarlos directamente
                      return containerMatches;
                    }
                    
                    // Para otros formatos, dividir por espacios
                    const contenedores = contenedorStr.split(/\s+/);
                    return contenedores.filter(contenedor => {
                      // Excluir si es solo símbolos (sin letras ni números)
                      const hasLetterOrNumber = /[a-zA-Z0-9]/.test(contenedor);
                      return hasLetterOrNumber;
                    });
                  })
                  .length}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Total contenedores (divididos por espacios)
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">Estados</CardTitle>
              <CheckCircle className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 rounded-lg" style={{
                  backgroundColor: theme === 'dark' ? '#065f46' : '#dcfce7',
                  color: theme === 'dark' ? '#10b981' : '#166534'
                }}>
                  <span className="text-sm font-medium">Confirmados:</span>
                  <span className="text-lg font-bold">
                    {registros.filter(r => r.estado === 'CONFIRMADO').length}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-lg" style={{
                  backgroundColor: theme === 'dark' ? '#92400e' : '#fef3c7',
                  color: theme === 'dark' ? '#f59e0b' : '#92400e'
                }}>
                  <span className="text-sm font-medium">Pendientes:</span>
                  <span className="text-lg font-bold">
                    {registros.filter(r => r.estado === 'PENDIENTE').length}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-lg" style={{
                  backgroundColor: theme === 'dark' ? '#991b1b' : '#fee2e2',
                  color: theme === 'dark' ? '#ffffff' : '#991b1b'
                }}>
                  <span className="text-sm font-medium">Cancelados:</span>
                  <span className="text-lg font-bold">
                    {registros.filter(r => r.estado === 'CANCELADO').length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-lg shadow">
          <DataTable
            data={registros}
            columns={columns}
            navierasUnicas={navierasFiltro}
            ejecutivosUnicos={ejecutivosFiltro}
            especiesUnicas={especiesFiltro}
            clientesUnicos={clientesFiltro}
            polsUnicos={polsFiltro}
            destinosUnicos={destinosFiltro}
            depositosUnicos={depositosFiltro}
            yearsUnicos={yearsFiltro}
            onAdd={handleAdd}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onExport={handleExport}
            selectedRows={selectedRows}
            onToggleRowSelection={handleToggleRowSelection}
            onSelectAll={handleSelectAll}
            onClearSelection={handleClearSelection}
            onBulkDelete={handleBulkDelete}
            preserveFilters={true}
          />
        </div>
      </main>

      {/* Modals */}
      <AddModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          loadRegistros();
          setIsAddModalOpen(false);
        }}
        navierasUnicas={navierasUnicas}
        ejecutivosUnicos={ejecutivosUnicos}
        especiesUnicas={especiesUnicas}
        clientesUnicos={clientesUnicos}
        polsUnicos={polsUnicos}
        destinosUnicos={destinosUnicos}
        depositosUnicos={depositosUnicos}
        navesUnicas={navesUnicas}
        navierasNavesMapping={navierasNavesMapping}
        consorciosNavesMapping={consorciosNavesMapping}
        cbmUnicos={cbmUnicos}
        fletesUnicos={fletesUnicos}
      />

      <EditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={() => {
          loadRegistros();
          setIsEditModalOpen(false);
        }}
        record={selectedRecord}
        navierasUnicas={navierasUnicas}
        navesUnicas={navesUnicas}
        navierasNavesMapping={navierasNavesMapping}
        consorciosNavesMapping={consorciosNavesMapping}
      />

      <TrashModal
        isOpen={isTrashModalOpen}
        onClose={() => setIsTrashModalOpen(false)}
        onRestore={() => {
          loadRegistros();
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

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
    </EditingCellProvider>
  );
}

