'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Registro } from '@/types/registros';
import { CostosEmbarque, ReporteFinanciero } from '@/types/finanzas';
import { generarReporteFinanciero, calcularCostoTotal, calcularMargen } from '@/lib/finanzas-calculations';
import { DollarSign, TrendingUp, TrendingDown, Package, Building2, Users, BarChart3, Edit2, Save, X } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/hooks/useToast';
import { CostosModal } from './CostosModal';
import { ReporteFinanciero as ReporteFinancieroComponent } from './ReporteFinanciero';
import { FileText } from 'lucide-react';

interface FinanzasSectionProps {
  registros: Registro[];
  canEdit: boolean;
}

export function FinanzasSection({ registros, canEdit }: FinanzasSectionProps) {
  console.log('[FinanzasSection] Componente montado con', registros?.length || 0, 'registros');

  const { theme } = useTheme();
  const { success, error: showError } = useToast();
  const supabase = useMemo(() => createClient(), []);

  const [costosEmbarques, setCostosEmbarques] = useState<CostosEmbarque[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCosto, setEditingCosto] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<CostosEmbarque>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'resumen' | 'detalle' | 'reporte'>('resumen');
  const [tableExists, setTableExists] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debug
  useEffect(() => {
    console.log('[FinanzasSection] Renderizado con', registros.length, 'registros');
    console.log('[FinanzasSection] Estado loading:', loading);
  }, [registros.length, loading]);

  const loadCostos = async () => {
    try {
      console.log('[FinanzasSection] loadCostos: Iniciando...');
      setLoading(true);
      const { data, error } = await supabase
        .from('costos_embarques')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.log('[FinanzasSection] loadCostos: Error encontrado:', error.code, error.message);
        // Si la tabla no existe, simplemente usar array vacío
        if (error.code === 'PGRST116' || error.message?.includes('does not exist') || error.message?.includes('relation') || error.code === '42P01') {
          console.warn('[FinanzasSection] Tabla costos_embarques no existe aún. Ejecuta el script SQL para crearla.');
          setTableExists(false);
          setCostosEmbarques([]);
          setLoading(false);
          console.log('[FinanzasSection] loadCostos: Loading establecido en false (tabla no existe)');
          return;
        }
        throw error;
      }
      console.log('[FinanzasSection] loadCostos: Costos cargados:', data?.length || 0);
      setTableExists(true);

      // Map snake_case from DB to camelCase for app
      const mappedData = (data || []).map((item: any) => ({
        ...item,
        registroId: item.registro_id,
        createdAt: item.created_at ? new Date(item.created_at) : undefined,
        updatedAt: item.updated_at ? new Date(item.updated_at) : undefined,
        createdBy: item.created_by,
        updatedBy: item.updated_by,
        fechaActualizacion: item.fecha_actualizacion ? new Date(item.fecha_actualizacion) : undefined,
      }));

      setCostosEmbarques(mappedData);
    } catch (err: any) {
      console.error('[FinanzasSection] loadCostos: Error en catch:', err);
      // No mostrar error si la tabla no existe, solo usar array vacío
      if (err.code !== 'PGRST116' && !err.message?.includes('does not exist')) {
        showError('Error al cargar información financiera');
      }
      setCostosEmbarques([]);
    } finally {
      console.log('[FinanzasSection] loadCostos: Finally - estableciendo loading en false');
      setLoading(false);
    }
  };

  // useEffect para cargar costos al montar el componente
  useEffect(() => {
    console.log('[FinanzasSection] Iniciando carga de costos...');
    loadCostos();

    // Timeout de seguridad: si después de 5 segundos sigue en loading, forzar a false
    const timeoutId = setTimeout(() => {
      console.warn('[FinanzasSection] Timeout: forzando loading a false después de 5 segundos');
      setLoading(false);
    }, 5000);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Generar reporte financiero
  const reporte = useMemo(() => {
    try {
      console.log('[FinanzasSection] Generando reporte con', registros.length, 'registros y', costosEmbarques.length, 'costos');
      return generarReporteFinanciero(registros, costosEmbarques);
    } catch (error) {
      console.error('[FinanzasSection] Error generando reporte:', error);
      // Retornar reporte vacío en caso de error
      return {
        ingresosTotales: 0,
        ingresosPorCliente: [],
        costosTotales: 0,
        costosPorNaviera: [],
        costosPorTipo: { transporteTerrestre: 0, coordinacion: 0, costosNavieros: 0, otros: 0 },
        margenTotal: 0,
        margenPorcentaje: 0,
        margenPorCliente: [],
        totalEmbarques: 0,
        promedioIngresoPorEmbarque: 0,
        promedioCostoPorEmbarque: 0,
        promedioMargenPorEmbarque: 0,
      };
    }
  }, [registros, costosEmbarques]);

  // Iniciar edición
  const handleStartEdit = (booking: string) => {
    const costo = costosEmbarques.find(c => c.booking === booking);
    if (costo) {
      setEditForm(costo);
      setEditingCosto(booking);
    } else {
      // Crear nuevo
      const registro = registros.find(r => r.booking === booking);
      setEditForm({
        booking,
        registroId: registro?.id || '',
        moneda: 'USD',
      });
      setEditingCosto(booking);
    }
    setIsModalOpen(true);
  };

  // Guardar cambios desde el modal
  const handleSave = async (formData: Partial<CostosEmbarque>) => {
    if (!editingCosto) return;

    try {
      const registro = registros.find(r => r.booking === editingCosto);
      if (!registro) {
        showError('Registro no encontrado');
        return;
      }

      // Prepare data for DB (snake_case)
      const dbData: any = {
        ...formData,
        registro_id: registro.id || '',
        booking: editingCosto,
        updated_at: new Date().toISOString(),
      };

      // Remove camelCase fields that shouldn't be sent to DB
      delete dbData.registroId;
      delete dbData.createdAt;
      delete dbData.updatedAt;
      delete dbData.createdBy;
      delete dbData.updatedBy;
      delete dbData.fechaActualizacion;

      const existing = costosEmbarques.find(c => c.booking === editingCosto);

      if (existing?.id) {
        // Actualizar
        const { error } = await supabase
          .from('costos_embarques')
          .update(dbData)
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Crear
        const { error } = await supabase
          .from('costos_embarques')
          .insert([dbData]);

        if (error) throw error;
      }

      await loadCostos();
      success('Información financiera guardada correctamente');
    } catch (err: any) {
      console.error('Error guardando costo:', err);
      showError('Error al guardar información financiera');
      throw err; // Re-lanzar para que el modal sepa que hubo error
    }
  };

  // Si hay un error, mostrarlo
  if (error) {
    console.log('[FinanzasSection] Renderizando error:', error);
    return (
      <div className={`flex items-center justify-center py-12 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
        <div className="text-center">
          <p className="text-lg font-medium mb-2">Error al cargar información financiera</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    console.log('[FinanzasSection] Renderizando estado de loading...');
    return (
      <div className={`flex items-center justify-center py-12 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Cargando información financiera...</p>
        </div>
      </div>
    );
  }

  // Verificar si hay registros
  if (!registros || registros.length === 0) {
    console.log('[FinanzasSection] No hay registros');
    return (
      <div className={`flex items-center justify-center py-12 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
        <div className="text-center">
          <Package className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium mb-2">No hay registros disponibles</p>
          <p className="text-sm">No se encontraron embarques para mostrar información financiera.</p>
        </div>
      </div>
    );
  }

  const registrosValidos = registros.filter(r => r.estado !== 'CANCELADO');

  if (registrosValidos.length === 0) {
    console.log('[FinanzasSection] No hay registros válidos (todos cancelados)');
    return (
      <div className={`flex items-center justify-center py-12 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
        <div className="text-center">
          <Package className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium mb-2">No hay embarques disponibles</p>
          <p className="text-sm">No se encontraron embarques confirmados para mostrar información financiera.</p>
          <p className="text-xs mt-2 opacity-75">Total de registros: {registros.length} (todos cancelados)</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs de Navegación */}
      <div className="flex justify-end mb-4">
        <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-lg p-1 border border-gray-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('resumen')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'resumen'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
          >
            Resumen
          </button>
          <button
            onClick={() => setActiveTab('detalle')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'detalle'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
          >
            Detalle
          </button>
          <button
            onClick={() => setActiveTab('reporte')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'reporte'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
          >
            <FileText className="w-4 h-4" />
            Reporte PDF
          </button>
        </div>
      </div>

      {activeTab === 'reporte' ? (
        <ReporteFinancieroComponent reporte={reporte} />
      ) : (
        <>
          {/* Resumen de KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`rounded-xl border p-4 ${theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
              <div className="flex items-center justify-between mb-2">
                <p className={`text-xs uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                  Ingresos Totales
                </p>
                <DollarSign className={`h-5 w-5 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
              </div>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                ${reporte.ingresosTotales.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
            </div>

            <div className={`rounded-xl border p-4 ${theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
              <div className="flex items-center justify-between mb-2">
                <p className={`text-xs uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                  Costos Totales
                </p>
                <TrendingDown className={`h-5 w-5 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`} />
              </div>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                ${reporte.costosTotales.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
            </div>

            <div className={`rounded-xl border p-4 ${theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
              <div className="flex items-center justify-between mb-2">
                <p className={`text-xs uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                  Margen Total
                </p>
                <TrendingUp className={`h-5 w-5 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
              </div>
              <p className={`text-2xl font-bold ${theme === 'dark' ? reporte.margenTotal >= 0 ? 'text-green-400' : 'text-red-400' : reporte.margenTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${reporte.margenTotal.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
              <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                {reporte.margenPorcentaje.toFixed(1)}% de margen
              </p>
            </div>

            <div className={`rounded-xl border p-4 ${theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
              <div className="flex items-center justify-between mb-2">
                <p className={`text-xs uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                  Total Embarques
                </p>
                <Package className={`h-5 w-5 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`} />
              </div>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {reporte.totalEmbarques}
              </p>
            </div>
          </div>

          {/* Tabla de costos por embarque */}
          <div className={`rounded-xl border overflow-hidden ${theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
            <div className={`px-6 py-4 border-b ${theme === 'dark' ? 'border-slate-700' : 'border-gray-200'}`}>
              <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Costos e Ingresos por Embarque
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                <thead className={`${theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50'}`}>
                  <tr>
                    <th className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-200' : 'text-gray-800'}`}>
                      Booking
                    </th>
                    <th className={`px-4 py-3 text-right text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-200' : 'text-gray-800'}`}>
                      Transp. Terrestre
                    </th>
                    <th className={`px-4 py-3 text-right text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-200' : 'text-gray-800'}`}>
                      Coordinación
                    </th>
                    <th className={`px-4 py-3 text-right text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-200' : 'text-gray-800'}`}>
                      Costos Navieros
                    </th>
                    <th className={`px-4 py-3 text-right text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-200' : 'text-gray-800'}`}>
                      Total Costos
                    </th>
                    <th className={`px-4 py-3 text-right text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-200' : 'text-gray-800'}`}>
                      Ingresos
                    </th>
                    <th className={`px-4 py-3 text-right text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-200' : 'text-gray-800'}`}>
                      Margen
                    </th>
                    {canEdit && (
                      <th className={`px-4 py-3 text-center text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-200' : 'text-gray-800'}`}>
                        Acciones
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className={`divide-y ${theme === 'dark' ? 'divide-slate-700 bg-slate-900/50' : 'divide-gray-200 bg-white'}`}>
                  {registros
                    .filter(r => r.estado !== 'CANCELADO')
                    .map((registro) => {
                      const costo = costosEmbarques.find(c => c.booking === registro.booking);
                      const costoTotal = costo ? calcularCostoTotal(costo) : 0;
                      const ingresos = costo?.ingresos || 0;
                      const { margen, porcentaje } = calcularMargen(ingresos, costoTotal);

                      // Calcular subtotales para mostrar en tabla
                      const tt = (costo?.tt_flete || 0) + (costo?.tt_sobre_estadia || 0) + (costo?.tt_porteo || 0) + (costo?.tt_almacenamiento || 0);
                      const coord = (costo?.coord_adm_espacio || 0) + (costo?.coord_comex || 0) + (costo?.coord_aga || 0);
                      const nav = (costo?.nav_gate_out || 0) + (costo?.nav_seguridad_contenedor || 0) + (costo?.nav_matriz_fuera_plazo || 0) +
                        (costo?.nav_correcciones || 0) + (costo?.nav_extra_late || 0) + (costo?.nav_telex_release || 0) +
                        (costo?.nav_courier || 0) + (costo?.nav_pago_sag_cf_extra || 0) + (costo?.nav_pago_ucco_co_extra || 0);

                      return (
                        <tr key={registro.id} className={theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-gray-50'}>
                          <td className={`px-4 py-3 text-sm ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>
                            {registro.booking}
                          </td>
                          <td className={`px-4 py-3 text-sm text-right ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>
                            ${tt.toLocaleString('es-CL')}
                          </td>
                          <td className={`px-4 py-3 text-sm text-right ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>
                            ${coord.toLocaleString('es-CL')}
                          </td>
                          <td className={`px-4 py-3 text-sm text-right ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>
                            ${nav.toLocaleString('es-CL')}
                          </td>
                          <td className={`px-4 py-3 text-sm text-right font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-gray-700'}`}>
                            ${costoTotal.toLocaleString('es-CL')}
                          </td>
                          <td className={`px-4 py-3 text-sm text-right font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-gray-700'}`}>
                            ${ingresos.toLocaleString('es-CL')}
                          </td>
                          <td className={`px-4 py-3 text-sm text-right font-medium ${margen >= 0 ? theme === 'dark' ? 'text-green-400' : 'text-green-600' : theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                            ${margen.toLocaleString('es-CL')} ({porcentaje.toFixed(1)}%)
                          </td>
                          {canEdit && (
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => handleStartEdit(registro.booking)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Editar"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Reportes por cliente y naviera */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Ingresos por cliente */}
            <div className={`rounded-xl border overflow-hidden ${theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
              <div className={`px-6 py-4 border-b ${theme === 'dark' ? 'border-slate-700' : 'border-gray-200'}`}>
                <h2 className={`text-lg font-semibold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  <Users className="h-5 w-5" />
                  Ingresos por Cliente
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                  <thead className={`${theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50'}`}>
                    <tr>
                      <th className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-200' : 'text-gray-800'}`}>
                        Cliente
                      </th>
                      <th className={`px-4 py-3 text-right text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-200' : 'text-gray-800'}`}>
                        Ingresos
                      </th>
                      <th className={`px-4 py-3 text-right text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-200' : 'text-gray-800'}`}>
                        Embarques
                      </th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${theme === 'dark' ? 'divide-slate-700 bg-slate-900/50' : 'divide-gray-200 bg-white'}`}>
                    {reporte.ingresosPorCliente.slice(0, 10).map((item, idx) => (
                      <tr key={idx} className={theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-gray-50'}>
                        <td className={`px-4 py-3 text-sm ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>
                          {item.cliente}
                        </td>
                        <td className={`px-4 py-3 text-sm text-right font-medium ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                          ${item.ingresos.toLocaleString('es-CL')}
                        </td>
                        <td className={`px-4 py-3 text-sm text-right ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>
                          {item.embarques}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Costos por naviera */}
            <div className={`rounded-xl border overflow-hidden ${theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
              <div className={`px-6 py-4 border-b ${theme === 'dark' ? 'border-slate-700' : 'border-gray-200'}`}>
                <h2 className={`text-lg font-semibold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  <Building2 className="h-5 w-5" />
                  Costos por Naviera
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                  <thead className={`${theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50'}`}>
                    <tr>
                      <th className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-200' : 'text-gray-800'}`}>
                        Naviera
                      </th>
                      <th className={`px-4 py-3 text-right text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-200' : 'text-gray-800'}`}>
                        Costos
                      </th>
                      <th className={`px-4 py-3 text-right text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-200' : 'text-gray-800'}`}>
                        Embarques
                      </th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${theme === 'dark' ? 'divide-slate-700 bg-slate-900/50' : 'divide-gray-200 bg-white'}`}>
                    {reporte.costosPorNaviera.slice(0, 10).map((item, idx) => (
                      <tr key={idx} className={theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-gray-50'}>
                        <td className={`px-4 py-3 text-sm ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>
                          {item.naviera}
                        </td>
                        <td className={`px-4 py-3 text-sm text-right font-medium ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                          ${item.costos.toLocaleString('es-CL')}
                        </td>
                        <td className={`px-4 py-3 text-sm text-right ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>
                          {item.embarques}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal de edición */}
      {isModalOpen && editingCosto && (
        <CostosModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingCosto(null);
          }}
          costo={editForm}
          registro={registros.find(r => r.booking === editingCosto)!}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
