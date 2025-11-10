'use client';
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { User } from '@supabase/supabase-js';
import dynamic from 'next/dynamic';
import { UserProfileModal } from '@/components/UserProfileModal';
import { 
  Ship, 
  Truck, 
  LogOut, 
  User as UserIcon, 
  ArrowRight,
  Clock,
  FileText,
  Grid3x3,
  Search,
  Filter,
  Eye,
  Plus,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Registro } from '@/types/registros';
import { convertSupabaseToApp } from '@/lib/migration-utils';
import LoadingScreen from '@/components/ui/LoadingScreen';

// Importar el mapa dinámicamente para evitar problemas con SSR
const ShipmentsMap = dynamic(() => import('@/components/ShipmentsMap').then(mod => ({ default: mod.ShipmentsMap })), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[600px] bg-gray-100 dark:bg-gray-900 rounded-lg">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Cargando mapa...</p>
      </div>
    </div>
  )
});

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    totalContenedores: 0,
    pendientes: 0,
    confirmados: 0,
    cancelados: 0
  });
  const [registrosParaMapa, setRegistrosParaMapa] = useState<Registro[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user]);

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

      // Obtener información del usuario desde la tabla usuarios
      // SIEMPRE cargar datos frescos desde Supabase para evitar datos obsoletos
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('auth_user_id', user.id)
        .single();

      if (userError) {
        console.error('Error obteniendo información del usuario:', userError);
        // Si no se encuentra en la tabla usuarios, intentar usar datos de auth como fallback
        setUserInfo({
          nombre: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario',
          email: user.email || ''
        });
      } else {
        // Usar datos de la tabla usuarios (fuente de verdad)
        console.log('✅ Usuario cargado desde BD (dashboard):', userData);
        setUserInfo(userData);
      }
    } catch (error) {
      console.error('Error checking user:', error);
      router.push('/auth');
    } finally {
      setLoading(false);
    }
  };

  const handleUserUpdate = (updatedUser: any) => {
    setUserInfo(updatedUser);
  };

  const loadStats = async () => {
    try {
      const supabase = createClient();
      
      // Consulta optimizada para obtener estadísticas y datos para el mapa
      const { data: registros, error } = await supabase
        .from('registros')
        .select('ref_asli, estado, updated_at, contenedor, pol, pod, naviera, shipper, etd, eta, deposito')
        .is('deleted_at', null) // Solo registros no eliminados
        .not('ref_asli', 'is', null); // Solo registros con REF ASLI

      if (error) throw error;

      // Convertir registros para el mapa (todos los que tienen POD, incluso si no tienen POL)
      const registrosConRutas = (registros || [])
        .filter(r => r.pod) // Solo requiere POD (puerto de destino)
        .map(registro => convertSupabaseToApp(registro));
      
      setRegistrosParaMapa(registrosConRutas);

      console.log('═══════════════════════════════════════');
      console.log('🚀 INICIANDO CONTEO DE CONTENEDORES');
      console.log('═══════════════════════════════════════');
      console.log('Total de registros obtenidos:', registros?.length || 0);
      
      // Contar cuántos tienen contenedor
      const registrosConContenedor = registros?.filter(r => r.contenedor && r.contenedor.length > 0) || [];
      console.log('Registros con contenedor:', registrosConContenedor.length);

      // Agrupar por REF ASLI y obtener el estado más reciente de cada uno
      const refAsliMap = new Map();
      let totalContenedores = 0;
      let ejemplosMostrados = 0;
      const maxEjemplos = 3;
      
      // Primero, agrupar registros por REF ASLI y obtener el más reciente de cada uno
      registros?.forEach(registro => {
        const refAsli = registro.ref_asli;
        const existing = refAsliMap.get(refAsli);
        
        // Guardar el registro más reciente de cada REF ASLI
        if (!existing || new Date(registro.updated_at) > new Date(existing.updated_at)) {
          refAsliMap.set(refAsli, {
            estado: registro.estado,
            updated_at: registro.updated_at,
            contenedor: registro.contenedor // Guardar también el contenedor
          });
        }
      });

      // Ahora contar contenedores SOLO UNA VEZ por REF ASLI único
      refAsliMap.forEach((data, refAsli) => {
        if (data.contenedor) {
          let cantidadContenedores = 0;
          let contenedorTexto = '';
          
          // Si es array (datos antiguos), convertir a texto
          if (Array.isArray(data.contenedor)) {
            contenedorTexto = data.contenedor.join(' ');
          } 
          // Si es string, usarlo directamente
          else if (typeof data.contenedor === 'string') {
            // Intentar parsear por si viene como JSON string antiguo
            try {
              const parsed = JSON.parse(data.contenedor);
              if (Array.isArray(parsed)) {
                contenedorTexto = parsed.join(' ');
              } else {
                contenedorTexto = data.contenedor;
              }
            } catch {
              // No es JSON, usar como texto directo
              contenedorTexto = data.contenedor;
            }
          }
          
          // Contar contenedores: dividir por espacios y filtrar vacíos
          const contenedores = contenedorTexto.trim().split(/\s+/).filter(c => c.length > 0);
          cantidadContenedores = contenedores.length;
          
          // Mostrar solo los primeros ejemplos
          if (ejemplosMostrados < maxEjemplos) {
            console.log(`\n📦 Ejemplo ${ejemplosMostrados + 1}:`);
            console.log(`   REF ASLI: ${refAsli}`);
            console.log(`   Valor original:`, data.contenedor);
            console.log(`   Texto procesado: "${contenedorTexto}"`);
            console.log(`   Contenedores:`, contenedores);
            console.log(`   ✅ Cantidad: ${cantidadContenedores}`);
            ejemplosMostrados++;
          }
          
          totalContenedores += cantidadContenedores;
        }
      });
      
      console.log('\n═══════════════════════════════════════');
      console.log(`🎯 TOTAL REGISTROS: ${registros?.length || 0}`);
      console.log(`🎯 TOTAL CONTENEDORES: ${totalContenedores}`);
      console.log('═══════════════════════════════════════\n');

      // Contar por estado
      const estadoCounts = {
        pendientes: 0,
        confirmados: 0,
        cancelados: 0
      };

      refAsliMap.forEach(({ estado }) => {
        if (estado) {
          switch (estado.toLowerCase()) {
            case 'pendiente':
            case 'en proceso':
              estadoCounts.pendientes++;
              break;
            case 'confirmado':
            case 'completado':
              estadoCounts.confirmados++;
              break;
            case 'cancelado':
            case 'rechazado':
              estadoCounts.cancelados++;
              break;
          }
        }
      });

      setStats({
        total: refAsliMap.size,
        totalContenedores: totalContenedores,
        pendientes: estadoCounts.pendientes,
        confirmados: estadoCounts.confirmados,
        cancelados: estadoCounts.cancelados
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/auth');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const toggleSidebar = () => setIsSidebarCollapsed((prev) => !prev);

  const modules = [
    {
      id: 'registros',
      title: 'Registros de Embarques',
      description: 'Gestión completa de contenedores y embarques',
      icon: Ship,
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600',
      available: true,
      stats: stats
    },
    {
      id: 'transportes',
      title: 'Registros de Transporte',
      description: 'Control de flota y rutas de transporte',
      icon: Truck,
      color: 'bg-green-500',
      hoverColor: 'hover:bg-green-600',
      available: true,
      stats: null
    },
    {
      id: 'documentos',
      title: 'Documentos',
      description: 'Ver, editar y crear facturas para las REF ASLI',
      icon: FileText,
      color: 'bg-purple-500',
      hoverColor: 'hover:bg-purple-600',
      available: true,
      stats: null
    }
  ];

  if (loading) {
    return <LoadingScreen message="Cargando dashboard..." />;
  }

  if (!user) {
    return null;
  }

  const toneBadgeClasses = {
    sky: 'bg-sky-500/20 text-sky-300',
    rose: 'bg-rose-500/20 text-rose-300',
    violet: 'bg-violet-500/20 text-violet-300',
    lime: 'bg-lime-500/20 text-lime-300',
  } as const;

  type SidebarNavItem =
    | { label: string; id: string; isActive?: boolean }
    | { label: string; counter: number; tone: keyof typeof toneBadgeClasses };

  type SidebarSection = {
    title: string;
    items: SidebarNavItem[];
  };

  const sidebarNav: SidebarSection[] = [
    {
      title: 'Favoritos',
      items: [
        { label: 'Embarques', id: 'registros', isActive: true },
        { label: 'Transportes', id: 'transportes', isActive: false },
        { label: 'Documentos', id: 'documentos', isActive: false },
      ],
    },
    {
      title: 'Espacios de trabajo',
      items: [
        { label: 'Embarques 2025-2026', counter: stats.total, tone: 'sky' },
        { label: 'Embarques 2024', counter: 469, tone: 'rose' },
        { label: 'Embarques 2023', counter: 439, tone: 'violet' },
        { label: 'Embarques 2022', counter: 376, tone: 'lime' },
      ],
    },
  ];

  const headerActions = [
    { label: 'Buscar', icon: Search },
    { label: 'Persona', icon: UserIcon },
    { label: 'Filtrar', icon: Filter },
    { label: 'Ordenar', icon: ArrowUpDown },
    { label: 'Ocultar', icon: Eye, counter: 2 },
    { label: 'Agrupar', icon: Grid3x3 },
  ];

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      {/* Sidebar */}
      <aside
        className={`hidden lg:flex relative flex-col border-r border-slate-800/60 bg-slate-950/60 backdrop-blur-xl transition-all duration-300 ${
          isSidebarCollapsed ? 'w-20' : 'w-64'
        } sticky top-0 h-screen`}
      >
        <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-800/60">
          <div className="h-10 w-10 overflow-hidden rounded-lg bg-slate-900/70 flex items-center justify-center">
            <img
              src="https://asli.cl/img/logo.png?v=1761679285274&t=1761679285274"
              alt="ASLI Gestión Logística"
              className="h-8 w-8 object-contain"
              onError={(event) => {
                event.currentTarget.style.display = 'none';
              }}
            />
          </div>
          {!isSidebarCollapsed && (
            <div>
              <p className="text-sm font-semibold text-slate-200">ASLI Gestión Logística</p>
              <p className="text-xs text-slate-500">Plataforma Operativa</p>
            </div>
          )}
        </div>

        <button
          onClick={toggleSidebar}
          className="absolute top-16 -right-[18px] flex h-11 w-11 items-center justify-center rounded-full border border-slate-700/60 bg-slate-950 text-slate-300 shadow-lg shadow-slate-950/60 hover:border-sky-500/60 hover:text-sky-200 transition"
          aria-label={isSidebarCollapsed ? 'Expandir panel lateral' : 'Contraer panel lateral'}
        >
          {isSidebarCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
 
        {!isSidebarCollapsed && (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8">
              {sidebarNav.map((section) => (
                <div key={section.title} className="space-y-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500/60">{section.title}</p>
                  <div className="space-y-1.5">
                    {section.items.map((item) => (
                      <button
                        key={item.label}
                        onClick={() => {
                          if ('id' in item) {
                            router.push(`/${item.id}`);
                          }
                        }}
                        className={`group w-full text-left flex items-center justify-between rounded-lg px-3 py-2 transition-colors ${
                          'id' in item && item.isActive
                            ? 'bg-slate-800/80 text-white'
                            : 'hover:bg-slate-800/40 text-slate-300'
                        }`}
                      >
                        <span className="text-sm font-medium">{item.label}</span>
                        {'counter' in item && (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${toneBadgeClasses[item.tone]}`}>
                            {item.counter}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="px-4 py-6 border-t border-slate-800/60">
              <button className="w-full rounded-lg border border-slate-700/60 px-3 py-2 text-sm text-slate-300 hover:border-sky-500/60 hover:text-sky-200 transition-colors">
                + Agregar espacio de trabajo
              </button>
            </div>
          </>
        )}
      </aside>

      {/* Content */}
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-slate-800/60 bg-slate-950/70 backdrop-blur-xl">
          <div className="flex flex-wrap items-center gap-4 px-6 py-5">
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500/15">
                <img
                  src="https://asli.cl/img/logo.png?v=1761679285274&t=1761679285274"
                  alt="ASLI Logo"
                  className="h-10 w-10 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.4em] text-slate-500/80">Panel General</p>
                <h1 className="text-2xl font-semibold text-white">Embarques</h1>
                <p className="text-sm text-slate-400">Coordinación integral de embarques y transportes</p>
              </div>
            </div>

            <div className="flex-1 min-w-[240px] max-w-xl">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="search"
                  placeholder="Buscar registros, clientes o contenedores"
                  className="w-full rounded-full border border-slate-800 bg-slate-900/80 py-2.5 pl-9 pr-4 text-sm text-slate-200 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/registros')}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              >
                <Plus className="h-4 w-4" />
                Agregar registro
              </button>
              <button
                onClick={() => setShowProfileModal(true)}
                className="hidden sm:flex items-center gap-2 rounded-full border border-slate-800/70 px-3 py-2 text-sm text-slate-300 hover:border-sky-400/60 hover:text-sky-200"
              >
                <UserIcon className="h-4 w-4" />
                {userInfo?.nombre || user.email}
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-full border border-transparent px-3 py-2 text-sm text-slate-400 hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300"
              >
                <LogOut className="h-4 w-4" />
                Salir
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 px-6 pb-4">
            {headerActions.map((action) => {
              const ActionIcon = action.icon;
              return (
                <button
                  key={action.label}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-800/70 bg-slate-900/60 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-sky-500/60 hover:text-sky-200 transition-colors"
                >
                  <ActionIcon className="h-3.5 w-3.5" />
                  {action.label}
                  {action.counter && (
                    <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-semibold text-sky-300">
                      {action.counter}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-6 pb-10 pt-8 space-y-10">
          <section className="rounded-2xl border border-slate-800/60 bg-slate-950/60 p-6 shadow-xl shadow-sky-900/10">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm text-slate-400">Bienvenido de nuevo</p>
                <h2 className="text-2xl font-semibold text-white">
                  {userInfo?.nombre || user.user_metadata?.full_name || 'Usuario'}
                </h2>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="rounded-full bg-green-500/15 px-3 py-1 text-green-300">
                  {stats.confirmados} Confirmados
                </div>
                <div className="rounded-full bg-yellow-500/15 px-3 py-1 text-yellow-300">
                  {stats.pendientes} Pendientes
                </div>
                <div className="rounded-full bg-red-500/15 px-3 py-1 text-red-300">
                  {stats.cancelados} Cancelados
                </div>
                <div className="rounded-full border border-slate-700/80 px-3 py-1 text-slate-300">
                  {stats.totalContenedores} Contenedores
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">Módulos principales</h3>
              <button className="text-xs text-sky-300 hover:text-sky-200">Ver todo</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {modules.map((module) => {
                const IconComponent = module.icon;
                const isDisabled = !module.available;

                return (
                  <button
                    key={module.id}
                    onClick={() => {
                      if (!isDisabled) {
                        router.push(`/${module.id}`);
                      }
                    }}
                    disabled={isDisabled}
                    className={`group relative overflow-hidden rounded-xl border border-slate-800/70 bg-slate-950/60 p-5 text-left transition-all ${
                      isDisabled
                        ? 'opacity-60 cursor-not-allowed'
                        : 'hover:border-sky-500/60 hover:shadow-lg hover:shadow-sky-900/20 active:scale-[0.98]'
                    }`}
                  >
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-500 via-indigo-500 to-sky-600 opacity-40 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/15 text-sky-300">
                          <IconComponent className="h-5 w-5" />
                        </span>
                        <div>
                          <h4 className="text-lg font-semibold text-white">{module.title}</h4>
                          <p className="text-sm text-slate-400">{module.description}</p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-sky-300 transition" />
                    </div>
                    {module.stats && (
                      <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-300">
                        <div className="rounded-lg bg-slate-900/60 p-3">
                          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Total</p>
                          <p className="text-lg font-semibold text-white">{module.stats.total}</p>
                        </div>
                        <div className="rounded-lg bg-slate-900/60 p-3">
                          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Contenedores</p>
                          <p className="text-lg font-semibold text-white">{module.stats.totalContenedores}</p>
                        </div>
                        <div className="rounded-lg bg-green-500/10 p-3">
                          <p className="text-[11px] uppercase tracking-[0.2em] text-green-300">Confirmados</p>
                          <p className="text-lg font-semibold text-green-200">{module.stats.confirmados}</p>
                        </div>
                        <div className="rounded-lg bg-yellow-500/10 p-3">
                          <p className="text-[11px] uppercase tracking-[0.2em] text-yellow-300">Pendientes</p>
                          <p className="text-lg font-semibold text-yellow-200">{module.stats.pendientes}</p>
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">Mapa de embarques</h3>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Clock className="h-4 w-4" />
                Actualizado hace 15 min
              </div>
            </div>
            <div className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4">
              <ShipmentsMap registros={registrosParaMapa} />
            </div>
          </section>
        </main>
      </div>

      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        userInfo={userInfo}
        onUserUpdate={handleUserUpdate}
      />
    </div>
  );
}
