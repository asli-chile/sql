'use client';
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/hooks/useUser';
import { Registro } from '@/types/registros';
import { Factura } from '@/types/factura';
import { FileText, Plus, Download, Eye, Edit, Trash2, ArrowLeft } from 'lucide-react';
import { FacturaCreator } from '@/components/facturas/FacturaCreator';
import { FacturaViewer } from '@/components/facturas/FacturaViewer';
import { useToast } from '@/hooks/useToast';
import LoadingScreen from '@/components/ui/LoadingScreen';

export default function FacturasPage() {
  const router = useRouter();
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

  const supabase = createClient();

  // Cargar registros (solo los que el usuario puede ver según RLS)
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

  // Filtrar registros que no tienen factura (DEBE estar antes de cualquier early return)
  const registrosSinFactura = useMemo(() => {
    if (loading) return [];
    const facturasPorRegistro = new Set(facturas.map(f => f.registroId));
    return registros.filter(r => r.id && !facturasPorRegistro.has(r.id));
  }, [registros, facturas, loading]);

  if (loading) {
    return <LoadingScreen message="Cargando facturas..." />;
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/registros')}
              className={`p-2 rounded-lg transition-colors ${theme === 'dark'
                ? 'text-gray-300 hover:bg-gray-800'
                : 'text-gray-600 hover:bg-gray-200'
                }`}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Facturas
              </h1>
              <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Gestiona las facturas de embarques
              </p>
            </div>
          </div>
        </div>

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

        {/* Lista de facturas */}
        <div
          className={`rounded-lg shadow overflow-hidden ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'
            }`}
        >
          <div
            className={`px-6 py-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
              } flex items-center justify-between`}
          >
            <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Facturas Generadas
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

        {/* Lista de registros sin factura */}
        {registrosSinFactura.length > 0 && (
          <div
            className={`mt-6 rounded-lg shadow overflow-hidden ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'
              }`}
          >
            <div
              className={`px-6 py-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
                }`}
            >
              <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Registros sin Factura ({registrosSinFactura.length})
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
                    <th className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  {registrosSinFactura.map((registro) => (
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
                            <span>Crear Factura</span>
                          </button>
                        )}
                        {!(currentUser?.rol === 'admin' || currentUser?.email?.endsWith('@asli.cl')) && (
                          <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            Solo admins y ejecutivos
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
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

