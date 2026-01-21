'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Registro } from '@/types/registros';
import { CostosEmbarque, ReporteFinanciero } from '@/types/finanzas';
import { generarReporteFinanciero, calcularCostoTotal, calcularMargen } from '@/lib/finanzas-calculations';
import { DollarSign, TrendingUp, TrendingDown, Package, Building2, Users, BarChart3, Edit2, Save, X } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/hooks/useToast';

interface FinanzasSectionProps {
  registros: Registro[];
  canEdit: boolean;
}

export function FinanzasSection({ registros, canEdit }: FinanzasSectionProps) {
  const { theme } = useTheme();
  const { success, error: showError } = useToast();
  const supabase = useMemo(() => createClient(), []);
  
  const [costosEmbarques, setCostosEmbarques] = useState<CostosEmbarque[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCosto, setEditingCosto] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<CostosEmbarque>>({});
  const [tableExists, setTableExists] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  
  // Verificar acceso
  useEffect(() => {
    const checkAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email.toLowerCase());
      }
    };
    checkAccess();
  }, [supabase]);
  
  // Verificar si es Rodrigo
  const isRodrigo = userEmail === 'rodrigo.caceres@asli.cl';
  
  // Si no es Rodrigo, no mostrar nada
  if (!isRodrigo) {
    return (
      <div className={`flex items-center justify-center py-12 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
        <div className="text-center">
          <p className="text-lg font-medium mb-2">Acceso Restringido</p>
          <p className="text-sm">Solo el administrador puede acceder a esta sección.</p>
        </div>
      </div>
    );
  }
  
  // Debug
  useEffect(() => {
    console.log('FinanzasSection renderizado con', registros.length, 'registros');
  }, [registros.length]);
  
  // Cargar costos desde la base de datos
  useEffect(() => {
    loadCostos();
  }, []);

  const loadCostos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('costos_embarques')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        // Si la tabla no existe, simplemente usar array vacío
        if (error.code === 'PGRST116' || error.message?.includes('does not exist') || error.message?.includes('relation') || error.code === '42P01') {
          console.warn('Tabla costos_embarques no existe aún. Ejecuta el script SQL para crearla.');
          setTableExists(false);
          setCostosEmbarques([]);
          return;
        }
        throw error;
      }
      setTableExists(true);
      setCostosEmbarques(data || []);
    } catch (err: any) {
      console.error('Error cargando costos:', err);
      // No mostrar error si la tabla no existe, solo usar array vacío
      if (err.code !== 'PGRST116' && !err.message?.includes('does not exist')) {
        showError('Error al cargar información financiera');
      }
      setCostosEmbarques([]);
    } finally {
      setLoading(false);
    }
  };

  // Generar reporte financiero
  const reporte = useMemo(() => {
    return generarReporteFinanciero(registros, costosEmbarques);
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
        flete: null,
        deposito: null,
        tarifasExtra: null,
        ingresos: null,
        moneda: 'USD',
      });
      setEditingCosto(booking);
    }
  };

  // Guardar cambios
  const handleSave = async () => {
    if (!editingCosto) return;

    try {
      const registro = registros.find(r => r.booking === editingCosto);
      if (!registro) {
        showError('Registro no encontrado');
        return;
      }

      const costoData: Partial<CostosEmbarque> = {
        ...editForm,
        registroId: registro.id || '',
        booking: editingCosto,
        updatedAt: new Date(),
      };

      const existing = costosEmbarques.find(c => c.booking === editingCosto);
      
      if (existing?.id) {
        // Actualizar
        const { error } = await supabase
          .from('costos_embarques')
          .update(costoData)
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Crear
        const { error } = await supabase
          .from('costos_embarques')
          .insert([costoData]);

        if (error) throw error;
      }

      await loadCostos();
      setEditingCosto(null);
      setEditForm({});
      success('Información financiera guardada correctamente');
    } catch (err: any) {
      console.error('Error guardando costo:', err);
      showError('Error al guardar información financiera');
    }
  };

  // Cancelar edición
  const handleCancel = () => {
    setEditingCosto(null);
    setEditForm({});
  };

  if (loading) {
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
  const registrosValidos = registros.filter(r => r.estado !== 'CANCELADO');
  
  if (registrosValidos.length === 0) {
    return (
      <div className={`flex items-center justify-center py-12 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
        <div className="text-center">
          <Package className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium mb-2">No hay embarques disponibles</p>
          <p className="text-sm">No se encontraron embarques confirmados para mostrar información financiera.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
                  Flete
                </th>
                <th className={`px-4 py-3 text-right text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-200' : 'text-gray-800'}`}>
                  Depósito
                </th>
                <th className={`px-4 py-3 text-right text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-200' : 'text-gray-800'}`}>
                  Tarifas Extra
                </th>
                <th className={`px-4 py-3 text-right text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-200' : 'text-gray-800'}`}>
                  Costo Total
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
                  const isEditing = editingCosto === registro.booking;
                  const costoTotal = costo ? calcularCostoTotal(costo) : 0;
                  const ingresos = costo?.ingresos || 0;
                  const { margen, porcentaje } = calcularMargen(ingresos, costoTotal);

                  return (
                    <tr key={registro.id} className={theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-gray-50'}>
                      <td className={`px-4 py-3 text-sm ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>
                        {registro.booking}
                      </td>
                      {isEditing ? (
                        <>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={editForm.flete || ''}
                              onChange={(e) => setEditForm({ ...editForm, flete: e.target.value ? parseFloat(e.target.value) : null })}
                              className={`w-full px-2 py-1 text-sm rounded border ${theme === 'dark' ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-gray-300'}`}
                              placeholder="0"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={editForm.deposito || ''}
                              onChange={(e) => setEditForm({ ...editForm, deposito: e.target.value ? parseFloat(e.target.value) : null })}
                              className={`w-full px-2 py-1 text-sm rounded border ${theme === 'dark' ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-gray-300'}`}
                              placeholder="0"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={editForm.tarifasExtra || ''}
                              onChange={(e) => setEditForm({ ...editForm, tarifasExtra: e.target.value ? parseFloat(e.target.value) : null })}
                              className={`w-full px-2 py-1 text-sm rounded border ${theme === 'dark' ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-gray-300'}`}
                              placeholder="0"
                            />
                          </td>
                          <td className={`px-4 py-3 text-sm text-right ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>
                            ${calcularCostoTotal(editForm as CostosEmbarque).toLocaleString('es-CL')}
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={editForm.ingresos || ''}
                              onChange={(e) => setEditForm({ ...editForm, ingresos: e.target.value ? parseFloat(e.target.value) : null })}
                              className={`w-full px-2 py-1 text-sm rounded border ${theme === 'dark' ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-gray-300'}`}
                              placeholder="0"
                            />
                          </td>
                          <td className={`px-4 py-3 text-sm text-right ${theme === 'dark' ? calcularMargen(editForm.ingresos || 0, calcularCostoTotal(editForm as CostosEmbarque)).margen >= 0 ? 'text-green-400' : 'text-red-400' : calcularMargen(editForm.ingresos || 0, calcularCostoTotal(editForm as CostosEmbarque)).margen >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ${calcularMargen(editForm.ingresos || 0, calcularCostoTotal(editForm as CostosEmbarque)).margen.toLocaleString('es-CL')}
                          </td>
                          {canEdit && (
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={handleSave}
                                  className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                                  title="Guardar"
                                >
                                  <Save className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={handleCancel}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="Cancelar"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          )}
                        </>
                      ) : (
                        <>
                          <td className={`px-4 py-3 text-sm text-right ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>
                            ${(costo?.flete || 0).toLocaleString('es-CL')}
                          </td>
                          <td className={`px-4 py-3 text-sm text-right ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>
                            ${(costo?.deposito || 0).toLocaleString('es-CL')}
                          </td>
                          <td className={`px-4 py-3 text-sm text-right ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>
                            ${(costo?.tarifasExtra || 0).toLocaleString('es-CL')}
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
                            <td className="px-4 py-3">
                              <button
                                onClick={() => handleStartEdit(registro.booking)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Editar"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                            </td>
                          )}
                        </>
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
    </div>
  );
}
