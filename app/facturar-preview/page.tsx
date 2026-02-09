'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { useTheme } from '@/contexts/ThemeContext';
import { Registro } from '@/types/registros';
import { ArrowLeft, Receipt, Ship, Calendar, Thermometer, Wind, Package, Download, Menu, ChevronRight, User as UserIcon, LayoutDashboard, Truck, FileText, FileCheck, Globe, Activity, DollarSign, BarChart3, Users, Trash2 } from 'lucide-react';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { convertSupabaseToApp } from '@/lib/migration-utils';
import { generarFacturacionExcel } from '@/lib/facturacion-excel';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Sidebar } from '@/components/layout/Sidebar';
import { SidebarSection } from '@/types/layout';
import { useUser } from '@/hooks/useUser';
import { UserProfileModal } from '@/components/users/UserProfileModal';

interface GrupoPorNave {
  nave: string;
  registros: Registro[];
  cantidad: number;
  etd: Date | null;
  especies: Set<string>;
  temperaturas: Set<number | null>;
  ventilaciones: Set<number | null>;
  pols: Set<string>; // Origen (Port of Loading)
  pods: Set<string>; // Destino (Port of Discharge)
  depositos: Set<string>; // Depósito
}

export default function FacturarPreviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme } = useTheme();
  const { currentUser } = useUser();
  const [loading, setLoading] = useState(true);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [plantillas, setPlantillas] = useState<any[]>([]);
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState<string>('');
  const [generandoExcel, setGenerandoExcel] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
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
          pols: new Set(),
          pods: new Set(),
          depositos: new Set(),
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
      
      if (registro.pol) {
        grupo.pols.add(registro.pol);
      }
      
      if (registro.pod) {
        grupo.pods.add(registro.pod);
      }
      
      if (registro.deposito) {
        grupo.depositos.add(registro.deposito);
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
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-950' : 'bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className={`p-6 border ${theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-gray-200'} shadow-sm`}>
            <h2 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
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
              className={`px-4 py-2 rounded transition-colors ${
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
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-950' : 'bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className={`p-6 border ${theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-gray-200'} shadow-sm`}>
            <p className={`text-center ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
              No se seleccionaron registros para facturar.
            </p>
            <button
              onClick={() => router.push('/registros')}
              className={`mt-4 mx-auto block px-4 py-2 rounded transition-colors ${
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
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-950' : 'bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className={`p-6 border ${theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-gray-200'} shadow-sm`}>
            <p className={`text-center ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
              No se encontraron los registros seleccionados.
            </p>
            <button
              onClick={() => router.push('/registros')}
              className={`mt-4 mx-auto block px-4 py-2 rounded transition-colors ${
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

  // Configurar secciones del sidebar
  const isRodrigo = currentUser?.email?.toLowerCase() === 'rodrigo.caceres@asli.cl';
  
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
        { label: 'Embarques', id: '/registros', icon: Ship },
        { label: 'Transportes', id: '/transportes', icon: Truck },
        { label: 'Documentos', id: '/documentos', icon: FileText },
        ...(currentUser && currentUser.rol !== 'cliente'
          ? [{ label: 'Generar Documentos', id: '/generar-documentos', icon: FileCheck }]
          : []),
        ...(isRodrigo
          ? [{ label: 'Seguimiento Marítimo', id: '/dashboard/seguimiento', icon: Globe }]
          : []),
        { label: 'Tracking Movs', id: '/dashboard/tracking', icon: Activity },
        ...(isRodrigo
          ? [
            { label: 'Finanzas', id: '/finanzas', icon: DollarSign },
            { label: 'Reportes', id: '/reportes', icon: BarChart3 },
          ]
          : []),
        { label: 'Itinerario', id: '/itinerario', icon: Ship },
      ],
    },
    ...(isRodrigo
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
                  <h1 className={`text-sm sm:text-base md:text-lg lg:text-xl font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Vista Previa de Facturación</h1>
                  <p className={`hidden text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'} md:block truncate`}>
                    {registros.length} registro(s) seleccionado(s) agrupado(s) por nave
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2 flex-shrink-0">
                <button
                  onClick={() => router.push('/registros')}
                  className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center border transition flex-shrink-0 ${theme === 'dark'
                    ? 'border-slate-700/60 bg-slate-700/60 text-slate-300 hover:border-sky-500/60 hover:text-sky-200'
                    : 'border-gray-300 bg-white text-gray-600 hover:border-blue-500 hover:text-blue-700'
                    }`}
                  aria-label="Volver a registros"
                  title="Volver a registros"
                >
                  <ArrowLeft className="h-4 w-4 sm:h-4 sm:w-4" />
                </button>
                <ThemeToggle />
                <div className="relative hidden sm:flex flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowProfileModal(true)}
                    className={`flex items-center gap-1.5 sm:gap-2 border ${theme === 'dark' ? 'border-slate-700/60 bg-slate-700/60 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-slate-200 hover:border-sky-500/60 hover:text-sky-200' : 'border-gray-300 bg-white px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-700 hover:border-blue-500 hover:text-blue-700'} transition`}
                    aria-haspopup="dialog"
                    title={currentUser?.nombre || currentUser?.email || 'Usuario'}
                  >
                    <UserIcon className="h-4 w-4 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="max-w-[100px] md:max-w-[160px] truncate font-medium text-xs sm:text-sm">
                      {currentUser?.nombre || currentUser?.email || 'Usuario'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 min-w-0 min-h-0 w-full flex flex-col overflow-auto">
          <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
            {/* Resumen */}
            <div className={`mb-6 p-6 border ${theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-gray-200'} shadow-sm`}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 ${theme === 'dark' ? 'bg-sky-500/10' : 'bg-blue-50'}`}>
                <Receipt className={`w-5 h-5 ${theme === 'dark' ? 'text-sky-400' : 'text-blue-600'}`} />
              </div>
              <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Resumen
              </h2>
            </div>
            <div className="flex items-center gap-3">
              {plantillas.length > 0 && (
                <select
                  value={plantillaSeleccionada}
                  onChange={(e) => setPlantillaSeleccionada(e.target.value)}
                  className={`px-3 py-2 rounded border text-sm ${
                    theme === 'dark'
                      ? 'bg-slate-800 border-slate-700 text-white'
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
                className={`flex items-center gap-2 px-4 py-2 rounded transition-colors ${
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

            {/* Grupos por Nave - Vista de Tarjetas */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {gruposPorNave.map((grupo, index) => (
            <div
              key={grupo.nave}
              className={`border ${theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-gray-200'} shadow-sm hover:shadow-md transition-shadow`}
            >
              {/* Header de la tarjeta */}
              <div
                className={`px-5 py-4 border-b ${
                  theme === 'dark' ? 'border-slate-800 bg-slate-950/30' : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 ${theme === 'dark' ? 'bg-sky-500/10 text-sky-400' : 'bg-blue-50 text-blue-600'}`}
                  >
                    <Ship className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-base font-semibold truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {grupo.nave}
                    </h3>
                    <p className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                      {grupo.cantidad} reserva{grupo.cantidad !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>

              {/* Contenido de la tarjeta */}
              <div className="px-5 py-4 space-y-3">
                {/* ETD - Fecha destacada */}
                <div className={`p-3 border ${theme === 'dark' ? 'bg-sky-500/10 border-sky-500/20' : 'bg-blue-50 border-blue-200'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className={`w-4 h-4 ${theme === 'dark' ? 'text-sky-400' : 'text-blue-600'}`} />
                    <span className={`text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-sky-300' : 'text-blue-700'}`}>
                      ETD
                    </span>
                  </div>
                  <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {grupo.etd
                      ? new Date(grupo.etd).toLocaleDateString('es-CL', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })
                      : 'No especificado'}
                  </p>
                </div>

                {/* Origen, Destino y Depósito */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className={`text-xs font-semibold uppercase tracking-wide block mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                      Origen
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {Array.from(grupo.pols).slice(0, 1).map((pol, idx) => (
                        <span
                          key={idx}
                          className={`px-2 py-1 rounded border text-xs font-medium ${
                            theme === 'dark'
                              ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
                              : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          }`}
                        >
                          {pol}
                        </span>
                      ))}
                      {grupo.pols.size > 1 && (
                        <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                          +{grupo.pols.size - 1}
                        </span>
                      )}
                      {grupo.pols.size === 0 && (
                        <span className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>
                          -
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className={`text-xs font-semibold uppercase tracking-wide block mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                      Destino
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {Array.from(grupo.pods).slice(0, 1).map((pod, idx) => (
                        <span
                          key={idx}
                          className={`px-2 py-1 rounded border text-xs font-medium ${
                            theme === 'dark'
                              ? 'bg-purple-500/10 text-purple-300 border-purple-500/20'
                              : 'bg-purple-50 text-purple-700 border-purple-200'
                          }`}
                        >
                          {pod}
                        </span>
                      ))}
                      {grupo.pods.size > 1 && (
                        <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                          +{grupo.pods.size - 1}
                        </span>
                      )}
                      {grupo.pods.size === 0 && (
                        <span className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>
                          -
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className={`text-xs font-semibold uppercase tracking-wide block mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                      Depósito
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {Array.from(grupo.depositos).slice(0, 1).map((deposito, idx) => (
                        <span
                          key={idx}
                          className={`px-2 py-1 rounded border text-xs font-medium ${
                            theme === 'dark'
                              ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20'
                              : 'bg-cyan-50 text-cyan-700 border-cyan-200'
                          }`}
                        >
                          {deposito}
                        </span>
                      ))}
                      {grupo.depositos.size > 1 && (
                        <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                          +{grupo.depositos.size - 1}
                        </span>
                      )}
                      {grupo.depositos.size === 0 && (
                        <span className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>
                          -
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Especies */}
                <div>
                  <span className={`text-xs font-semibold uppercase tracking-wide block mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                    Especie(s)
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from(grupo.especies).slice(0, 3).map((especie, idx) => (
                      <span
                        key={idx}
                        className={`px-2 py-1 rounded border text-xs font-medium ${
                          theme === 'dark'
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {especie}
                      </span>
                    ))}
                    {grupo.especies.size > 3 && (
                      <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                        +{grupo.especies.size - 3} más
                      </span>
                    )}
                    {grupo.especies.size === 0 && (
                      <span className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>
                        No especificado
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
            </div>
          </div>
        </main>
      </div>

      {/* Modal de perfil de usuario */}
      {showProfileModal && currentUser && (
        <UserProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          userInfo={currentUser}
          onUserUpdate={(updatedUser) => {
            // Actualizar el usuario si es necesario
            // El hook useUser manejará la actualización
          }}
        />
      )}
    </div>
  );
}
