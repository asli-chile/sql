'use client';
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/hooks/useUser';
import { Registro } from '@/types/registros';
import { Factura } from '@/types/factura';
import { FileText, Plus, Download, Eye, Search, X, FileSpreadsheet, Settings, ChevronDown, Trash2 } from 'lucide-react';
import { FacturaCreator } from '@/components/facturas/FacturaCreator';
import { FacturaViewer } from '@/components/facturas/FacturaViewer';
import { PlantillasManager } from '@/components/plantillas/PlantillasManager';
import { generarFacturaPDF } from '@/lib/factura-pdf';
import { generarFacturaConPlantilla } from '@/lib/plantilla-helpers';
import { useToast } from '@/hooks/useToast';
import LoadingScreen from '@/components/ui/LoadingScreen';

// Componente dropdown para el botón "Con factura"
function DropdownFactura({
  factura,
  onDescargarPDF,
  onDescargarExcel,
  onVerFactura,
  onEliminarFactura,
  theme,
}: {
  factura: Factura;
  onDescargarPDF: (factura: Factura) => void;
  onDescargarExcel: (factura: Factura) => void;
  onVerFactura: (factura: Factura) => void;
  onEliminarFactura: (factura: Factura) => void;
  theme: 'light' | 'dark';
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleToggle}
        className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${theme === 'dark' ? 'bg-green-900 text-green-300 hover:bg-green-800' : 'bg-green-100 text-green-800 hover:bg-green-200'}`}
      >
        Con factura
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className={`absolute right-0 mt-1 w-48 rounded-md shadow-lg z-10 ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
          <div className="py-1">
            <button
              onClick={() => handleAction(() => onDescargarPDF(factura))}
              className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}
            >
              <FileText className="w-4 h-4" />
              Descargar PDF
            </button>
            <button
              onClick={() => handleAction(() => onDescargarExcel(factura))}
              className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              Descargar Excel
            </button>
            <button
              onClick={() => handleAction(() => onVerFactura(factura))}
              className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}
            >
              <Eye className="w-4 h-4" />
              Ver factura
            </button>
            <div className={`border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} my-1`} />
            <button
              onClick={() => handleAction(() => onEliminarFactura(factura))}
              className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${theme === 'dark' ? 'text-red-400 hover:bg-red-900/20' : 'text-red-600 hover:bg-red-50'}`}
            >
              <Trash2 className="w-4 h-4" />
              Eliminar factura
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GeneradorFacturasPage() {
  const { theme } = useTheme();
  const { currentUser } = useUser();
  const { success, error: showError } = useToast();

  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [facturaSeleccionada, setFacturaSeleccionada] = useState<Factura | null>(null);
  const [registroSeleccionado, setRegistroSeleccionado] = useState<Registro | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRegistrosSinFactura, setFilterRegistrosSinFactura] = useState(false);
  const [activeTab, setActiveTab] = useState<'facturas' | 'plantillas'>('facturas');

  const supabase = createClient();

  // Cargar registros y facturas
  useEffect(() => {
    loadRegistros();
    loadFacturas();
  }, [currentUser]);

  const loadRegistros = async () => {
    try {
      const { data, error } = await supabase
        .from('registros')
        .select('*')
        .is('deleted_at', null)
        .order('ingresado', { ascending: false });

      if (error) throw error;

      const registrosData = (data || []).map((r: any) => {
        // Extraer nave y viaje si vienen en formato "NAVE [VIAJE]"
        let naveInicial = r.nave_inicial || '';
        let viaje = r.viaje || null;

        // Si nave_inicial tiene formato "NAVE [VIAJE]", extraerlo
        const matchNave = naveInicial.match(/^(.+?)\s*\[(.+?)\]$/);
        if (matchNave && matchNave.length >= 3) {
          naveInicial = matchNave[1].trim();
          viaje = matchNave[2].trim();
        }

        return {
          ...r,
          refAsli: r.ref_asli || '',
          naveInicial: naveInicial,
          viaje: viaje,
          ingresado: r.ingresado ? new Date(r.ingresado) : null,
          etd: r.etd ? new Date(r.etd) : null,
          eta: r.eta ? new Date(r.eta) : null,
          ingresoStacking: r.ingreso_stacking ? new Date(r.ingreso_stacking) : null,
          createdAt: r.created_at ? new Date(r.created_at) : undefined,
          updatedAt: r.updated_at ? new Date(r.updated_at) : undefined,
        };
      }) as Registro[];

      setRegistros(registrosData);
    } catch (err: any) {
      console.error('Error cargando registros:', err);
      showError('Error al cargar registros');
    }
  };

  const loadFacturas = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('facturas')
        .select('*')
        .order('created_at', { ascending: false });

      // Si es usuario (no admin ni ejecutivo), filtrar solo sus facturas
      if (currentUser && currentUser.rol === 'usuario' && !currentUser.email?.endsWith('@asli.cl')) {
        query = query.eq('created_by', currentUser.id);
      }

      const { data, error } = await query;

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
        plantillaId: f.plantilla_id || undefined, // ID de la plantilla usada
        created_at: f.created_at,
        updated_at: f.updated_at,
        created_by: f.created_by,
      })) as Factura[];

      setFacturas(facturasData);
    } catch (err: any) {
      console.error('Error cargando facturas:', err);
      showError('Error al cargar facturas');
    } finally {
      setLoading(false);
    }
  };

  const handleCrearFactura = (registro: Registro) => {
    setRegistroSeleccionado(registro);
    setIsCreatorOpen(true);
  };

  const handleVerFactura = (factura: Factura) => {
    setFacturaSeleccionada(factura);
    setIsViewerOpen(true);
  };

  const handleFacturaGuardada = () => {
    loadFacturas();
    setIsCreatorOpen(false);
    setRegistroSeleccionado(null);
    success('Factura creada exitosamente');
  };

  const handleDescargarFacturaPDF = async (factura: Factura) => {
    try {
      await generarFacturaPDF(factura);
      success('PDF descargado exitosamente');
    } catch (err: any) {
      console.error('Error descargando PDF:', err);
      showError('Error al descargar PDF: ' + err.message);
    }
  };

  const handleDescargarFacturaExcel = async (factura: Factura) => {
    try {
      // SIEMPRE usar plantilla personalizada - NO hay formato genérico
      const resultado = await generarFacturaConPlantilla(factura);
      if (resultado && resultado.blob) {
        const url = URL.createObjectURL(resultado.blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = resultado.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        success('Excel descargado exitosamente con plantilla personalizada');
      }
    } catch (err: any) {
      console.error('Error descargando Excel:', err);
      showError('Error al descargar Excel: ' + err.message);
    }
  };

  const handleEliminarFactura = async (factura: Factura) => {
    // Confirmar antes de eliminar
    const confirmar = window.confirm(
      `¿Estás seguro de que deseas eliminar la factura ${factura.refAsli || factura.id}?\n\nEsta acción no se puede deshacer.`
    );

    if (!confirmar) {
      return;
    }

    try {
      if (!factura.id) {
        showError('No se puede eliminar: la factura no tiene ID');
        return;
      }

      console.log('Intentando eliminar factura con ID:', factura.id);
      
      const { data, error } = await supabase
        .from('facturas')
        .delete()
        .eq('id', factura.id)
        .select();

      console.log('Resultado de eliminación:', { data, error });

      if (error) {
        console.error('Error de Supabase al eliminar:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        // No se eliminó ninguna fila - probablemente por RLS
        showError('No se pudo eliminar la factura. Verifica que tengas permisos o que la factura exista.');
        return;
      }

      success('Factura eliminada exitosamente');
      // Recargar facturas y registros
      await loadFacturas();
      await loadRegistros();
    } catch (err: any) {
      console.error('Error eliminando factura:', err);
      const errorMessage = err.message || 'Error desconocido al eliminar la factura';
      showError(`Error al eliminar la factura: ${errorMessage}`);
      
      // Si es un error de permisos, dar más información
      if (errorMessage.includes('permission') || errorMessage.includes('policy') || errorMessage.includes('RLS')) {
        showError('Error de permisos: No tienes permisos para eliminar esta factura. Contacta a un administrador o ejecuta el script SQL para agregar la política DELETE.');
      }
    }
  };

  // Filtrar registros según búsqueda y filtro
  const registrosFiltrados = useMemo(() => {
    let filtered = registros;

    // Filtrar por búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r => 
        r.refAsli?.toLowerCase().includes(term) ||
        r.shipper?.toLowerCase().includes(term) ||
        r.especie?.toLowerCase().includes(term) ||
        r.booking?.toLowerCase().includes(term)
      );
    }

    // Filtrar solo registros sin factura
    if (filterRegistrosSinFactura) {
      const facturasPorRegistro = new Set(facturas.map(f => f.registroId));
      filtered = filtered.filter(r => r.id && !facturasPorRegistro.has(r.id));
    }

    return filtered;
  }, [registros, facturas, searchTerm, filterRegistrosSinFactura]);

  // Registros sin factura
  const registrosSinFactura = useMemo(() => {
    const facturasPorRegistro = new Set(facturas.map(f => f.registroId));
    return registros.filter(r => r.id && !facturasPorRegistro.has(r.id));
  }, [registros, facturas]);

  if (loading) {
    return <LoadingScreen message="Cargando generador de facturas..." />;
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Generador de Facturas
          </h1>
          <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Crea y gestiona facturas de embarques de forma independiente
          </p>
        </div>

        {/* Tabs */}
        <div className={`mb-6 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('facturas')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'facturas'
                  ? theme === 'dark'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-blue-600 text-blue-600'
                  : theme === 'dark'
                  ? 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4" />
                <span>Facturas</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('plantillas')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'plantillas'
                  ? theme === 'dark'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-blue-600 text-blue-600'
                  : theme === 'dark'
                  ? 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-4 h-4" />
                <span>Plantillas de Factura</span>
              </div>
            </button>
          </nav>
        </div>

        {/* Contenido según tab activo */}
        {activeTab === 'plantillas' ? (
          <div className="space-y-4">
            <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
              <h2 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Gestión de Plantillas de Factura
              </h2>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Carga y gestiona formatos Excel personalizados con etiquetas modificables. Las plantillas se almacenan en Supabase Storage y se pueden asociar a clientes específicos.
              </p>
            </div>
            <PlantillasManager currentUser={currentUser} />
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div
            className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'
              } shadow`}
          >
            <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Total Facturas
            </div>
            <div className={`text-2xl font-bold mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {facturas.length}
            </div>
          </div>
          <div
            className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'
              } shadow`}
          >
            <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Registros sin Factura
            </div>
            <div className={`text-2xl font-bold mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {registrosSinFactura.length}
            </div>
          </div>
          <div
            className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'
              } shadow`}
          >
            <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Total Registros
            </div>
            <div className={`text-2xl font-bold mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {registros.length}
            </div>
          </div>
        </div>

        {/* Búsqueda y Filtros */}
        <div className={`mb-6 p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
              <input
                type="text"
                placeholder="Buscar por REF ASLI, Cliente, Especie o Booking..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${theme === 'dark' ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            <label className={`flex items-center space-x-2 cursor-pointer ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              <input
                type="checkbox"
                checked={filterRegistrosSinFactura}
                onChange={(e) => setFilterRegistrosSinFactura(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Solo sin factura</span>
            </label>
          </div>
        </div>

        {/* Lista de facturas */}
        <div
          className={`rounded-lg shadow overflow-hidden mb-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'
            }`}
        >
          <div
            className={`px-6 py-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
              } flex items-center justify-between`}
          >
            <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Facturas Generadas ({facturas.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead
                className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
                  }`}
              >
                <tr>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                    REF ASLI
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                    Cliente
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                    Plantilla
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                    Valor Total
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                    Fecha
                  </th>
                  <th className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
                {facturas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className={`px-6 py-8 text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                      No hay facturas generadas. Crea una nueva factura desde un registro.
                    </td>
                  </tr>
                ) : (
                  facturas.map((factura) => (
                    <tr
                      key={factura.id}
                      className={`hover:${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}
                    >
                      <td className={`px-6 py-4 whitespace-nowrap ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>
                        {factura.refAsli}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                        {factura.exportador.nombre}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                        {factura.clientePlantilla}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                        } font-semibold`}>
                        US${factura.totales.valorTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                        {factura.created_at
                          ? new Date(factura.created_at).toLocaleDateString('es-CL')
                          : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleVerFactura(factura)}
                            className={`p-2 rounded transition-colors ${theme === 'dark'
                              ? 'text-blue-400 hover:bg-gray-700'
                              : 'text-blue-600 hover:bg-blue-50'
                              }`}
                            title="Ver factura"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Lista de registros */}
        <div
          className={`rounded-lg shadow overflow-hidden ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'
            }`}
        >
          <div
            className={`px-6 py-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
              }`}
          >
            <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Registros Disponibles ({registrosFiltrados.length})
            </h2>
          </div>

          <div className="overflow-x-auto max-h-96">
            <table className="w-full">
              <thead
                className={`sticky top-0 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
                  }`}
              >
                <tr>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                    REF ASLI
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                    Cliente
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                    Especie
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                    ETD
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                    Estado Factura
                  </th>
                  <th className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
                {registrosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={6} className={`px-6 py-8 text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                      {searchTerm || filterRegistrosSinFactura
                        ? 'No se encontraron registros con los filtros aplicados'
                        : 'No hay registros disponibles'}
                    </td>
                  </tr>
                ) : (
                  registrosFiltrados.map((registro) => {
                    const tieneFactura = facturas.some(f => f.registroId === registro.id);
                    return (
                      <tr
                        key={registro.id}
                        className={`hover:${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}
                      >
                        <td className={`px-6 py-4 whitespace-nowrap ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                          } font-semibold`}>
                          {registro.refAsli || '-'}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                          }`}>
                          {registro.shipper}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                          }`}>
                          {registro.especie}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                          }`}>
                          {registro.etd
                            ? new Date(registro.etd).toLocaleDateString('es-CL')
                            : '-'}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                          }`}>
                          {tieneFactura ? (
                            <DropdownFactura
                              factura={facturas.find(f => f.registroId === registro.id)!}
                              onDescargarPDF={handleDescargarFacturaPDF}
                              onDescargarExcel={handleDescargarFacturaExcel}
                              onVerFactura={handleVerFactura}
                              onEliminarFactura={handleEliminarFactura}
                              theme={theme}
                            />
                          ) : (
                            <span className={`px-2 py-1 rounded text-xs ${theme === 'dark' ? 'bg-yellow-900 text-yellow-300' : 'bg-yellow-100 text-yellow-800'}`}>
                              Sin factura
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {(currentUser?.rol === 'admin' || currentUser?.email?.endsWith('@asli.cl')) && (
                            <button
                              onClick={() => handleCrearFactura(registro)}
                              className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ml-auto ${theme === 'dark'
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                                }`}
                            >
                              <FileText className="w-4 h-4" />
                              <span>{tieneFactura ? 'Editar' : 'Crear'} Factura</span>
                            </button>
                          )}
                          {!(currentUser?.rol === 'admin' || currentUser?.email?.endsWith('@asli.cl')) && (
                            <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                              Solo admins y ejecutivos
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
          </>
        )}
      </div>

      {/* Modales */}
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
