'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { useTheme } from '@/contexts/ThemeContext';
import { Registro } from '@/types/registros';
import { ArrowLeft, Receipt, Ship, Calendar, Thermometer, Wind, Package, Download } from 'lucide-react';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { convertSupabaseToApp } from '@/lib/migration-utils';
import { generarFacturacionExcel } from '@/lib/facturacion-excel';

interface GrupoPorNave {
  nave: string;
  registros: Registro[];
  cantidad: number;
  etd: Date | null;
  especies: Set<string>;
  temperaturas: Set<number | null>;
  ventilaciones: Set<number | null>;
}

export default function FacturarPreviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [plantillas, setPlantillas] = useState<any[]>([]);
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState<string>('');
  const [generandoExcel, setGenerandoExcel] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const supabase = createClient();

  // Obtener IDs de los registros desde los parámetros de URL
  const registroIds = useMemo(() => {
    const idsParam = searchParams.get('ids');
    if (!idsParam) return [];
    return idsParam.split(',').filter(id => id.trim() !== '');
  }, [searchParams]);

  // Verificar permisos de admin
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        setCheckingAuth(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.push('/auth');
          return;
        }

        const { data: userData } = await supabase
          .from('usuarios')
          .select('rol')
          .eq('auth_user_id', user.id)
          .single();

        const userIsAdmin = userData?.rol === 'admin';
        setIsAdmin(userIsAdmin);

        if (!userIsAdmin) {
          // Si no es admin, redirigir después de un momento
          setTimeout(() => {
            router.push('/registros');
          }, 2000);
        }
      } catch (err: any) {
        console.error('Error verificando permisos:', err);
        router.push('/registros');
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAdmin();
  }, [router, supabase]);

  // Cargar registros
  useEffect(() => {
    if (registroIds.length === 0 || !isAdmin) {
      setLoading(false);
      return;
    }

    const loadRegistros = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('registros')
          .select('*')
          .in('id', registroIds)
          .is('deleted_at', null);

        if (error) throw error;

        const registrosData = (data || []).map((r: any) => convertSupabaseToApp(r)) as Registro[];
        setRegistros(registrosData);
      } catch (err: any) {
        console.error('Error cargando registros:', err);
      } finally {
        setLoading(false);
      }
    };

    loadRegistros();
    loadPlantillas();
  }, [registroIds, supabase, isAdmin]);

  // Cargar plantillas de booking_fee
  const loadPlantillas = async () => {
    try {
      const { data, error } = await supabase
        .from('plantillas_proforma')
        .select('*')
        .eq('tipo_factura', 'booking_fee')
        .eq('activa', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPlantillas(data || []);
    } catch (err: any) {
      console.error('Error cargando plantillas:', err);
    }
  };

  // Generar Excel
  const handleGenerarExcel = async () => {
    try {
      setGenerandoExcel(true);
      
      // Convertir grupos a formato esperado
      const gruposFormato = gruposPorNave.map(g => ({
        nave: g.nave,
        registros: g.registros,
        cantidad: g.cantidad,
        etd: g.etd,
        especies: Array.from(g.especies),
        temperaturas: Array.from(g.temperaturas),
        ventilaciones: Array.from(g.ventilaciones),
      }));

      const { blob, fileName } = await generarFacturacionExcel(
        gruposFormato,
        plantillaSeleccionada || undefined
      );

      // Descargar archivo
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Error generando Excel:', error);
      alert(`Error al generar Excel: ${error.message || 'Error desconocido'}`);
    } finally {
      setGenerandoExcel(false);
    }
  };

  // Agrupar registros por nave
  const gruposPorNave = useMemo(() => {
    const grupos = new Map<string, GrupoPorNave>();

    registros.forEach((registro) => {
      const nave = registro.naveInicial || 'SIN NAVE';
      
      if (!grupos.has(nave)) {
        grupos.set(nave, {
          nave,
          registros: [],
          cantidad: 0,
          etd: null,
          especies: new Set(),
          temperaturas: new Set(),
          ventilaciones: new Set(),
        });
      }

      const grupo = grupos.get(nave)!;
      grupo.registros.push(registro);
      grupo.cantidad += 1;
      
      if (registro.etd) {
        if (!grupo.etd || (registro.etd < grupo.etd)) {
          grupo.etd = registro.etd;
        }
      }
      
      if (registro.especie) {
        grupo.especies.add(registro.especie);
      }
      
      if (registro.temperatura !== null && registro.temperatura !== undefined) {
        grupo.temperaturas.add(registro.temperatura);
      }
      
      if (registro.cbm !== null && registro.cbm !== undefined) {
        grupo.ventilaciones.add(registro.cbm);
      }
    });

    return Array.from(grupos.values());
  }, [registros]);

  if (checkingAuth || loading) {
    return <LoadingScreen message="Cargando vista previa..." />;
  }

  // Si no es admin, mostrar mensaje de acceso denegado
  if (!isAdmin) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} shadow`}>
            <h2 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
              Acceso Denegado
            </h2>
            <p className={`mb-4 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
              Esta función está disponible solo para usuarios con nivel de administrador.
            </p>
            <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
              Redirigiendo a la página de registros...
            </p>
            <button
              onClick={() => router.push('/registros')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                theme === 'dark'
                  ? 'bg-sky-600 text-white hover:bg-sky-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              Volver a Registros
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (registroIds.length === 0) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} shadow`}>
            <p className={`text-center ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
              No se seleccionaron registros para facturar.
            </p>
            <button
              onClick={() => router.push('/registros')}
              className={`mt-4 mx-auto block px-4 py-2 rounded-lg transition-colors ${
                theme === 'dark'
                  ? 'bg-sky-600 text-white hover:bg-sky-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              Volver a Registros
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (registros.length === 0) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} shadow`}>
            <p className={`text-center ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
              No se encontraron los registros seleccionados.
            </p>
            <button
              onClick={() => router.push('/registros')}
              className={`mt-4 mx-auto block px-4 py-2 rounded-lg transition-colors ${
                theme === 'dark'
                  ? 'bg-sky-600 text-white hover:bg-sky-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              Volver a Registros
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/registros')}
              className={`p-2 rounded-lg transition-colors ${
                theme === 'dark'
                  ? 'text-slate-300 hover:bg-slate-800'
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Vista Previa de Facturación
              </h1>
              <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                {registros.length} registro(s) seleccionado(s) agrupado(s) por nave
              </p>
            </div>
          </div>
        </div>

        {/* Resumen */}
        <div className={`mb-6 p-4 rounded-lg ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} shadow`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Receipt className={`w-5 h-5 ${theme === 'dark' ? 'text-sky-400' : 'text-blue-600'}`} />
              <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Resumen
              </h2>
            </div>
            <div className="flex items-center gap-3">
              {plantillas.length > 0 && (
                <select
                  value={plantillaSeleccionada}
                  onChange={(e) => setPlantillaSeleccionada(e.target.value)}
                  className={`px-3 py-2 rounded-lg border text-sm ${
                    theme === 'dark'
                      ? 'bg-slate-700 border-slate-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="">Sin plantilla (Excel básico)</option>
                  {plantillas.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              )}
              <button
                onClick={handleGenerarExcel}
                disabled={generandoExcel}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  theme === 'dark'
                    ? 'bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-600'
                    : 'bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400'
                }`}
              >
                <Download className="w-4 h-4" />
                {generandoExcel ? 'Generando...' : 'Generar Excel'}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                Total de Registros
              </p>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {registros.length}
              </p>
            </div>
            <div>
              <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                Naves Diferentes
              </p>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {gruposPorNave.length}
              </p>
            </div>
            <div>
              <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                Especies Diferentes
              </p>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {new Set(registros.map(r => r.especie)).size}
              </p>
            </div>
          </div>
        </div>

        {/* Grupos por Nave */}
        <div className="space-y-4">
          {gruposPorNave.map((grupo, index) => (
            <div
              key={grupo.nave}
              className={`rounded-lg shadow overflow-hidden ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'}`}
            >
              <div
                className={`px-6 py-4 border-b ${
                  theme === 'dark' ? 'border-slate-700 bg-slate-900/50' : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        theme === 'dark' ? 'bg-sky-500/20 text-sky-400' : 'bg-blue-100 text-blue-600'
                      }`}
                    >
                      <Ship className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {grupo.nave}
                      </h3>
                      <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                        {grupo.cantidad} contenedor(es)
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* ETD */}
                  <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-slate-900/50' : 'bg-gray-50'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className={`w-4 h-4 ${theme === 'dark' ? 'text-sky-400' : 'text-blue-600'}`} />
                      <span className={`text-xs font-medium uppercase ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                        ETD
                      </span>
                    </div>
                    <p className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {grupo.etd
                        ? new Date(grupo.etd).toLocaleDateString('es-CL', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })
                        : 'No especificado'}
                    </p>
                  </div>

                  {/* Especies */}
                  <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-slate-900/50' : 'bg-gray-50'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Package className={`w-4 h-4 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`} />
                      <span className={`text-xs font-medium uppercase ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                        Especie(s)
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {Array.from(grupo.especies).map((especie, idx) => (
                        <span
                          key={idx}
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            theme === 'dark'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {especie}
                        </span>
                      ))}
                      {grupo.especies.size === 0 && (
                        <span className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>
                          No especificado
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Temperatura */}
                  <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-slate-900/50' : 'bg-gray-50'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Thermometer className={`w-4 h-4 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`} />
                      <span className={`text-xs font-medium uppercase ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                        Temperatura
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {Array.from(grupo.temperaturas)
                        .filter(t => t !== null)
                        .map((temp, idx) => (
                          <span
                            key={idx}
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              theme === 'dark'
                                ? 'bg-red-500/20 text-red-300'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {temp}°C
                          </span>
                        ))}
                      {grupo.temperaturas.size === 0 || Array.from(grupo.temperaturas).every(t => t === null) ? (
                        <span className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>
                          No especificado
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Ventilación (CBM) */}
                  <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-slate-900/50' : 'bg-gray-50'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Wind className={`w-4 h-4 ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`} />
                      <span className={`text-xs font-medium uppercase ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                        Ventilación (CBM)
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {Array.from(grupo.ventilaciones)
                        .filter(v => v !== null)
                        .map((vent, idx) => (
                          <span
                            key={idx}
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              theme === 'dark'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {vent}
                          </span>
                        ))}
                      {grupo.ventilaciones.size === 0 || Array.from(grupo.ventilaciones).every(v => v === null) ? (
                        <span className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>
                          No especificado
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
