'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { User } from '@supabase/supabase-js';
import { ThemeToggle } from '@/components/ThemeToggle';
import { UserProfileModal } from '@/components/UserProfileModal';
import { 
  Ship, 
  Package, 
  Truck, 
  CreditCard, 
  LogOut, 
  User as UserIcon, 
  Settings,
  ArrowRight,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

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

  const loadStats = async () => {
    try {
      const supabase = createClient();
      
      // Consulta optimizada para obtener estadísticas en una sola query
      const { data: registros, error } = await supabase
        .from('registros')
        .select('ref_asli, estado, updated_at, contenedor')
        .is('deleted_at', null) // Solo registros no eliminados
        .not('ref_asli', 'is', null); // Solo registros con REF ASLI

      if (error) throw error;

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
      id: 'transporte',
      title: 'Registros de Transporte',
      description: 'Control de flota y rutas de transporte',
      icon: Truck,
      color: 'bg-green-500',
      hoverColor: 'hover:bg-green-600',
      available: false,
      comingSoon: true
    },
    {
      id: 'facturacion',
      title: 'Facturación',
      description: 'Gestión de facturas y pagos',
      icon: CreditCard,
      color: 'bg-purple-500',
      hoverColor: 'hover:bg-purple-600',
      available: false,
      comingSoon: true
    }
  ];

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
          <p className="text-lg" style={{ color: '#ffffff' }}>Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
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
                <h1 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Sistema ASLI</h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Dashboard Principal</p>
              </div>
            </div>

            {/* User menu */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <ThemeToggle />
              <div className="flex items-center space-x-2">
                <UserIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 dark:text-gray-500" />
                <button
                  onClick={() => setShowProfileModal(true)}
                  className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  {userInfo?.nombre || user.email}
                </button>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="text-xs sm:text-sm">Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            ¡Bienvenido, {userInfo?.nombre?.split(' ')[0] || user.user_metadata?.full_name?.split(' ')[0] || 'Usuario'}!
          </h2>
          <p className="text-gray-600">
            Selecciona el módulo al que deseas acceder
          </p>
        </div>

        {/* Modules grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {modules.map((module) => {
            const IconComponent = module.icon;
            
            return (
              <div
                key={module.id}
                className={`bg-white rounded-xl shadow-sm border-2 transition-all duration-200 ${
                  module.available
                    ? 'border-gray-200 hover:border-blue-300 hover:shadow-md cursor-pointer'
                    : 'border-gray-100 opacity-60 cursor-not-allowed'
                }`}
                onClick={() => {
                  if (module.available) {
                    router.push(`/${module.id}`);
                  }
                }}
              >
                <div className="p-6">
                  {/* Icon and status */}
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 ${module.color} rounded-lg flex items-center justify-center`}>
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    
                    {module.available ? (
                      <div className="flex items-center space-x-1 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-xs font-medium">Disponible</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1 text-orange-600">
                        <Clock className="w-4 h-4" />
                        <span className="text-xs font-medium">Próximamente</span>
                      </div>
                    )}
                  </div>

                  {/* Title and description */}
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {module.title}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4">
                    {module.description}
                  </p>

                  {/* Stats (only for available modules) */}
                  {module.available && module.stats && (
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="text-center p-2 bg-gray-50 rounded-lg">
                        <div className="text-lg font-bold text-gray-900">
                          {module.stats.total.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-600">Total</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded-lg">
                        <div className="text-lg font-bold text-blue-600">
                          {module.stats.pendientes}
                        </div>
                        <div className="text-xs text-gray-600">Pendientes</div>
                      </div>
                    </div>
                  )}

                  {/* Action button */}
                  <div className="flex items-center justify-between">
                    {module.available ? (
                      <div className="flex items-center text-blue-600 text-sm font-medium">
                        <span>Acceder</span>
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </div>
                    ) : (
                      <div className="flex items-center text-gray-400 text-sm">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        <span>En desarrollo</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick stats */}
        <div className="mt-12 bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen General</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Package className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-600">{stats.totalContenedores.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Total Contenedores</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <Clock className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-yellow-600">{stats.pendientes}</div>
              <div className="text-sm text-gray-600">Pendientes</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-600">{stats.confirmados}</div>
              <div className="text-sm text-gray-600">Confirmados</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-red-600">{stats.cancelados}</div>
              <div className="text-sm text-gray-600">Cancelados</div>
            </div>
          </div>
        </div>
      </main>

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        userInfo={userInfo}
        onUserUpdate={(updatedUser) => {
          setUserInfo(updatedUser);
          setShowProfileModal(false);
        }}
      />
    </div>
  );
}
