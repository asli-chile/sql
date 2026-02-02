'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/hooks/useUser';
import { User } from '@supabase/supabase-js';
import { UserProfileModal } from '@/components/users/UserProfileModal';
import { Sidebar } from '@/components/layout/Sidebar';
import { SidebarSection } from '@/types/layout';
import ConsignatariosManager from '@/components/consignatarios/ConsignatariosManager';
import { PlantillasManager } from '@/components/plantillas/PlantillasManager';
import { EditorPlantillasExcel } from '@/components/plantillas/EditorPlantillasExcel';
import { EditorPlantillasGoogleSheets } from '@/components/plantillas/EditorPlantillasGoogleSheets';
import {
  LayoutDashboard,
  Ship,
  Truck,
  FileText,
  FileCheck,
  Globe,
  DollarSign,
  BarChart3,
  Users,
  User as UserIcon,
  ChevronRight,
  Anchor,
  Activity,
  Building2,
  FileSpreadsheet,
} from 'lucide-react';

type RolUsuario = 'admin' | 'ejecutivo' | 'cliente';

type CreateUserPayload = {
  email: string;
  password: string;
  nombre: string;
  rol: RolUsuario;
  clienteNombre?: string | null;
  clientesAsignados?: string[];
  bootstrapKey?: string;
};

type UsuarioRow = {
  id: string;
  auth_user_id: string;
  nombre: string | null;
  email: string;
  rol: RolUsuario;
  activo: boolean;
  cliente_nombre: string | null;
  clientes_asignados: string[];
};

export default function MantenimientoPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { theme } = useTheme();
  const { currentUser, transportesCount, registrosCount, setCurrentUser } = useUser();
  const [user, setUser] = useState<User | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [clientes, setClientes] = useState<string[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(true);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [rol, setRol] = useState<RolUsuario>('cliente');
  const [clienteNombre, setClienteNombre] = useState('');
  const [clientesAsignados, setClientesAsignados] = useState<string[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [usuarios, setUsuarios] = useState<UsuarioRow[]>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [resetPasswordUserId, setResetPasswordUserId] = useState<string | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState<Record<string, string>>({});
  const [bootstrapKey, setBootstrapKey] = useState('');
  type TabType = 'usuarios' | 'consignatarios' | 'plantillas' | 'editor-plantillas' | 'editor-google-sheets';
  const [activeTab, setActiveTab] = useState<TabType>('usuarios');
  
  // Helper para evitar problemas de type narrowing
  const isEditorTab = activeTab === 'editor-plantillas';
  const isGoogleSheetsTab = activeTab === 'editor-google-sheets';

  const isRodrigo = currentUser?.email?.toLowerCase() === 'rodrigo.caceres@asli.cl';
  const isAdmin = currentUser?.rol === 'admin';
  const canAccess = isRodrigo;

  // Obtener usuario de auth
  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data: userData } = await supabase
          .from('usuarios')
          .select('*')
          .eq('auth_user_id', user.id)
          .single();
        setUserInfo(userData || {
          nombre: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario',
          email: user.email || ''
        });
      }
    };
    fetchUser();
  }, []);

  const toggleSidebar = () => setIsSidebarCollapsed(prev => !prev);

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
        { label: 'Embarques', id: '/registros', icon: Anchor, counter: registrosCount, tone: 'violet' },
        { label: 'Transportes', id: '/transportes', icon: Truck, counter: transportesCount, tone: 'sky' },
        { label: 'Documentos', id: '/documentos', icon: FileText },
        ...(currentUser && currentUser.rol !== 'cliente'
          ? [{ label: 'Generar Documentos', id: '/generar-documentos', icon: FileCheck }]
          : []),
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
    ...(isRodrigo
      ? [
        {
          title: 'Mantenimiento',
          items: [
            { label: 'Usuarios', id: '/mantenimiento', icon: Users, isActive: true },
          ],
        },
      ]
      : []),
  ];

  useEffect(() => {
    if (!currentUser) {
      return;
    }
    if (!canAccess) {
      router.push('/dashboard');
    }
  }, [currentUser, canAccess, router]);

  useEffect(() => {
    const loadClientes = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('catalogos_clientes')
          .select('nombre')
          .eq('activo', true)
          .order('nombre');

        if (error) {
          throw error;
        }

        const nombres = (data || [])
          .map((item: { nombre: string | null }) => item.nombre)
          .filter((value): value is string => Boolean(value));
        setClientes(nombres);
      } catch (error) {
        console.error('Error cargando clientes:', error);
        setClientes([]);
      } finally {
        setLoadingClientes(false);
      }
    };

    loadClientes();
  }, []);

  const loadUsuarios = useCallback(async () => {
    try {
      setLoadingUsuarios(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const response = await fetch(`${apiUrl}/api/admin/users`, { method: 'GET' });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || 'No se pudo cargar usuarios.');
      }
      setUsuarios(result.users || []);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      setUsuarios([]);
    } finally {
      setLoadingUsuarios(false);
    }
  }, []);

  useEffect(() => {
    if (!canAccess) return;
    loadUsuarios();
  }, [canAccess, loadUsuarios]);

  const handleToggleCliente = useCallback((value: string) => {
    setClientesAsignados((prev) => {
      if (prev.includes(value)) {
        return prev.filter((item) => item !== value);
      }
      return [...prev, value];
    });
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim() || !password.trim() || !nombre.trim()) {
      setErrorMessage('Completa email, contraseña y nombre.');
      return;
    }

    if (rol === 'cliente' && !clienteNombre.trim()) {
      setErrorMessage('Selecciona el cliente para este usuario.');
      return;
    }

    if (rol === 'ejecutivo' && clientesAsignados.length === 0) {
      setErrorMessage('Selecciona al menos un cliente para el ejecutivo.');
      return;
    }

    const payload: CreateUserPayload = {
      email: email.trim(),
      password: password.trim(),
      nombre: nombre.trim(),
      rol,
      clienteNombre: rol === 'cliente' ? clienteNombre.trim() : null,
      clientesAsignados: rol === 'ejecutivo' ? clientesAsignados : [],
      bootstrapKey: currentUser ? undefined : bootstrapKey.trim(),
    };

    setIsSubmitting(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const response = await fetch(`${apiUrl}/api/admin/create-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || result?.details || 'No se pudo crear el usuario.');
      }

      setSuccessMessage(`Usuario creado: ${payload.email}`);
      setEmail('');
      setPassword('');
      setNombre('');
      setClienteNombre('');
      setClientesAsignados([]);
      await loadUsuarios();
    } catch (error: any) {
      setErrorMessage(error?.message || 'Error inesperado al crear el usuario.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateUser = async (user: UsuarioRow) => {
    setSavingUserId(user.id);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const response = await fetch(`${apiUrl}/api/admin/users`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          rol: user.rol,
          clienteNombre: user.rol === 'cliente' ? user.cliente_nombre : null,
          activo: user.activo,
          clientesAsignados: user.rol === 'ejecutivo' ? user.clientes_asignados : [],
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || 'No se pudo actualizar el usuario.');
      }
      setSuccessMessage(`Usuario actualizado: ${user.email}`);
      await loadUsuarios();
    } catch (error: any) {
      setErrorMessage(error?.message || 'Error inesperado al actualizar.');
    } finally {
      setSavingUserId(null);
    }
  };

  const handleResetPassword = async (user: UsuarioRow) => {
    const newPassword = resetPasswordValue[user.id]?.trim();
    if (!newPassword) {
      setErrorMessage('Ingresa la nueva contraseña antes de resetear.');
      return;
    }

    setResetPasswordUserId(user.id);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const response = await fetch(`${apiUrl}/api/admin/users/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authUserId: user.auth_user_id, password: newPassword }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || 'No se pudo resetear la contraseña.');
      }
      setSuccessMessage(`Contraseña reseteada: ${user.email}`);
      setResetPasswordValue((prev) => ({ ...prev, [user.id]: '' }));
    } catch (error: any) {
      setErrorMessage(error?.message || 'Error al resetear contraseña.');
    } finally {
      setResetPasswordUserId(null);
    }
  };

  const formTone = theme === 'dark'
    ? 'bg-slate-950/70 border-slate-800/70 text-slate-100'
    : 'bg-white border-gray-200 text-gray-900';

  const inputTone = theme === 'dark'
    ? 'bg-slate-900/60 border-slate-700/70 text-slate-100 placeholder:text-slate-500 focus:border-sky-500/60 focus:ring-sky-500/30'
    : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-blue-500/60 focus:ring-blue-500/30';

  if (currentUser && !canAccess) {
    return (
      <div className={`flex h-screen items-center justify-center ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-gray-50 text-gray-900'}`}>
        <div className={`border px-6 py-4 text-center ${formTone}`}>
          <p className="text-sm font-semibold">Acceso restringido</p>
          <p className="text-xs opacity-70">Este módulo solo está disponible para administradores.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-screen overflow-hidden ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-gray-50 text-gray-900'}`}>
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
        currentUser={userInfo || currentUser}
        user={user}
        setShowProfileModal={setShowProfileModal}
      />

      {/* Content */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden h-full">
        {/* Header - oculto en editor-plantillas para máximo espacio */}
        {activeTab !== 'editor-plantillas' && activeTab !== 'editor-google-sheets' && (
        <header className={`sticky top-0 z-40 border-b overflow-hidden ${theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <div className="flex flex-wrap items-center gap-2 pl-2 pr-2 sm:px-3 py-2 sm:py-3">
            {/* Botón hamburguesa para móvil */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className={`lg:hidden flex h-8 w-8 items-center justify-center border transition-colors flex-shrink-0 ${theme === 'dark'
                ? 'border-slate-700/60 text-slate-300 hover:bg-slate-700'
                : 'border-gray-300 text-gray-600 hover:bg-gray-100'
                }`}
              aria-label="Abrir menú"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            {/* Botón para expandir sidebar colapsado en desktop */}
            {isSidebarCollapsed && (
              <button
                onClick={toggleSidebar}
                className={`hidden lg:flex h-8 w-8 items-center justify-center border transition-colors flex-shrink-0 ${theme === 'dark'
                  ? 'border-slate-700/60 text-slate-300 hover:bg-slate-700'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-100'
                  }`}
                aria-label="Expandir menú lateral"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            )}

            <div className="flex items-center gap-3 sm:gap-4">
              <div>
                <p className={`text-[10px] sm:text-[11px] uppercase tracking-[0.2em] sm:tracking-[0.3em] ${theme === 'dark' ? 'text-slate-500/80' : 'text-gray-500'}`}>Mantenimiento</p>
                <h1 className={`text-lg sm:text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {activeTab === 'usuarios' ? 'Usuarios' : activeTab === 'consignatarios' ? 'Consignatarios' : 'Plantillas Proforma'}
                </h1>
                <p className={`text-[11px] sm:text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                  {activeTab === 'usuarios' 
                    ? 'Gestiona usuarios, roles y permisos' 
                    : activeTab === 'consignatarios'
                      ? 'Gestiona información de consignatarios'
                      : 'Gestiona plantillas Excel personalizadas'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 ml-auto">
              <button
                onClick={() => setShowProfileModal(true)}
                className={`hidden sm:flex items-center gap-1.5 border px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm ${theme === 'dark'
                  ? 'border-slate-700/60 bg-slate-800/60 text-slate-200 hover:border-sky-500/60 hover:text-sky-200'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400 hover:text-blue-700'
                  }`}
              >
                <UserIcon className="h-4 w-4" />
                {userInfo?.nombre || currentUser?.nombre || user?.email}
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className={`border-b ${theme === 'dark' ? 'border-slate-700' : 'border-gray-200'}`}>
            <div className="flex gap-4 px-4 sm:px-6">
              <button
                onClick={() => setActiveTab('usuarios')}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'usuarios'
                    ? theme === 'dark'
                      ? 'border-sky-500 text-sky-400'
                      : 'border-blue-600 text-blue-600'
                    : theme === 'dark'
                      ? 'border-transparent text-slate-400 hover:text-slate-200'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Users className="h-4 w-4" />
                <span>Usuarios</span>
              </button>
              <button
                onClick={() => setActiveTab('consignatarios')}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'consignatarios'
                    ? theme === 'dark'
                      ? 'border-sky-500 text-sky-400'
                      : 'border-blue-600 text-blue-600'
                    : theme === 'dark'
                      ? 'border-transparent text-slate-400 hover:text-slate-200'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Building2 className="h-4 w-4" />
                <span>Consignatarios</span>
              </button>
              <button
                onClick={() => setActiveTab('plantillas')}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'plantillas'
                    ? theme === 'dark'
                      ? 'border-sky-500 text-sky-400'
                      : 'border-blue-600 text-blue-600'
                    : theme === 'dark'
                      ? 'border-transparent text-slate-400 hover:text-slate-200'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>Plantillas</span>
              </button>
              <button
                onClick={() => setActiveTab('editor-plantillas')}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  isEditorTab
                    ? theme === 'dark'
                      ? 'border-sky-500 text-sky-400'
                      : 'border-blue-600 text-blue-600'
                    : theme === 'dark'
                      ? 'border-transparent text-slate-400 hover:text-slate-200'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>✨ Editor Visual</span>
              </button>
              <button
                onClick={() => setActiveTab('editor-google-sheets')}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  isGoogleSheetsTab
                    ? theme === 'dark'
                      ? 'border-green-500 text-green-400'
                      : 'border-green-600 text-green-600'
                    : theme === 'dark'
                      ? 'border-transparent text-slate-400 hover:text-slate-200'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>📊 Editor Google Sheets</span>
              </button>
            </div>
          </div>
        </header>
        )}

        <main className={`flex-1 overflow-y-auto ${!isEditorTab && !isGoogleSheetsTab ? 'px-4 sm:px-6 pb-10 pt-6 sm:pt-8' : 'p-0'}`}>
          {activeTab === 'usuarios' ? (
          <div className="mx-auto max-w-5xl">
            <div className={`border p-6 sm:p-8 ${formTone}`}>
              <div className="flex flex-col gap-2 border-b pb-4 mb-6">
                <h2 className="text-lg sm:text-xl font-semibold">Crear nuevo usuario</h2>
                <p className="text-sm opacity-70">
                  Crea accesos con contraseña, define el rol y asigna clientes.
                </p>
              </div>

          <form onSubmit={handleSubmit} className="grid gap-4">
            {!currentUser && (
              <>
                <div className={`border px-4 py-3 text-xs ${theme === 'dark' ? 'border-amber-500/40 bg-amber-500/10 text-amber-200' : 'border-amber-300 bg-amber-50 text-amber-700'}`}>
                  <p className="font-semibold uppercase tracking-wide mb-1">Modo bootstrap</p>
                  <p>Si no existen usuarios, podrás crear a Rodrigo sin clave. Si configuraste `MAINTENANCE_BOOTSTRAP_KEY`, ingrésala aquí.</p>
                </div>
                <label className="text-xs font-semibold uppercase tracking-wide">
                  Clave bootstrap
                  <input
                    type="password"
                    value={bootstrapKey}
                    onChange={(event) => setBootstrapKey(event.target.value)}
                    className={`mt-2 w-full border px-3 py-2 text-sm outline-none focus:ring-2 ${inputTone}`}
                    placeholder="Clave de mantenimiento"
                  />
                </label>
              </>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-semibold uppercase tracking-wide">
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                    className={`mt-2 w-full border px-3 py-2 text-sm outline-none focus:ring-2 ${inputTone}`}
                  placeholder="cliente@empresa.com"
                  required
                />
              </label>
              <label className="text-xs font-semibold uppercase tracking-wide">
                Contraseña
                <input
                  type="text"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                    className={`mt-2 w-full border px-3 py-2 text-sm outline-none focus:ring-2 ${inputTone}`}
                  placeholder="Contraseña inicial"
                  required
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-semibold uppercase tracking-wide">
                Nombre visible
                <input
                  type="text"
                  value={nombre}
                  onChange={(event) => setNombre(event.target.value)}
                    className={`mt-2 w-full border px-3 py-2 text-sm outline-none focus:ring-2 ${inputTone}`}
                  placeholder="Nombre del usuario"
                  required
                />
              </label>
              <label className="text-xs font-semibold uppercase tracking-wide">
                Rol
                <select
                  value={rol}
                  onChange={(event) => setRol(event.target.value as RolUsuario)}
                    className={`mt-2 w-full border px-3 py-2 text-sm outline-none focus:ring-2 ${inputTone}`}
                >
                  <option value="cliente">Cliente</option>
                  <option value="ejecutivo">Ejecutivo</option>
                  <option value="admin">Administrador</option>
                </select>
              </label>
            </div>

            {rol === 'cliente' && (
              <label className="text-xs font-semibold uppercase tracking-wide">
                Cliente asociado
                <select
                  value={clienteNombre}
                  onChange={(event) => setClienteNombre(event.target.value)}
                    className={`mt-2 w-full border px-3 py-2 text-sm outline-none focus:ring-2 ${inputTone}`}
                >
                  <option value="">Selecciona un cliente</option>
                  {clientes.map((cliente) => (
                    <option key={cliente} value={cliente}>
                      {cliente}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {rol === 'ejecutivo' && (
              <div className="border p-4">
                <p className="text-xs font-semibold uppercase tracking-wide mb-3">Clientes asignados</p>
                {loadingClientes ? (
                  <p className="text-xs opacity-70">Cargando clientes...</p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 max-h-64 overflow-y-auto pr-2">
                    {clientes.map((cliente) => {
                      const checked = clientesAsignados.includes(cliente);
                      return (
                        <label
                          key={cliente}
                          className={`flex items-center gap-2 border px-3 py-2 text-xs cursor-pointer transition ${checked ? 'border-emerald-400/70 bg-emerald-500/10' : 'border-transparent hover:border-slate-500/40'}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleToggleCliente(cliente)}
                            className="h-4 w-4"
                          />
                          <span className="truncate">{cliente}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {errorMessage && (
              <div className="border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-500">
                {errorMessage}
              </div>
            )}
            {successMessage && (
              <div className="border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-500">
                {successMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className={`inline-flex items-center justify-center border px-5 py-2.5 text-sm font-semibold transition ${theme === 'dark'
                ? 'bg-sky-500 border-sky-500 text-slate-950 hover:bg-sky-400'
                : 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700'
                } ${isSubmitting ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {isSubmitting ? 'Creando usuario...' : 'Crear usuario'}
            </button>
          </form>
        </div>

            {currentUser && canAccess ? (
              <div className={`mt-8 border p-6 sm:p-8 ${formTone}`}>
                <div className="flex flex-col gap-2 border-b pb-4 mb-6">
                  <h2 className="text-lg sm:text-xl font-semibold">Usuarios existentes</h2>
                  <p className="text-sm opacity-70">Edita rol, asignaciones y resetea contraseña.</p>
                </div>

            {loadingUsuarios ? (
              <p className="text-sm opacity-70">Cargando usuarios...</p>
            ) : usuarios.length === 0 ? (
              <p className="text-sm opacity-70">No hay usuarios registrados.</p>
            ) : (
              <div className="grid gap-4">
                {usuarios.map((user) => {
                  const resetValue = resetPasswordValue[user.id] ?? '';
                  return (
                    <div key={user.id} className={`border p-4 ${theme === 'dark' ? 'border-slate-700/60 bg-slate-900' : 'border-gray-300 bg-white'}`}>
                      <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr_1fr_0.8fr]">
                        <div>
                          <p className="text-xs uppercase tracking-wide opacity-60">Usuario</p>
                          <p className="text-sm font-semibold">{user.nombre || 'Sin nombre'}</p>
                          <p className="text-xs opacity-70">{user.email}</p>
                        </div>
                        <label className="text-xs font-semibold uppercase tracking-wide">
                          Rol
                          <select
                            value={user.rol}
                            onChange={(event) => {
                              const nextRol = event.target.value as RolUsuario;
                              setUsuarios((prev) => prev.map((item) => (
                                item.id === user.id
                                  ? {
                                    ...item,
                                    rol: nextRol,
                                    cliente_nombre: nextRol === 'cliente' ? item.cliente_nombre : null,
                                    clientes_asignados: nextRol === 'ejecutivo' ? item.clientes_asignados : [],
                                  }
                                  : item
                              )));
                            }}
                            className={`mt-2 w-full border px-3 py-2 text-sm outline-none focus:ring-2 ${inputTone}`}
                          >
                            <option value="cliente">Cliente</option>
                            <option value="ejecutivo">Ejecutivo</option>
                            <option value="admin">Administrador</option>
                          </select>
                        </label>
                        <label className="text-xs font-semibold uppercase tracking-wide">
                          Cliente asociado
                          <select
                            value={user.cliente_nombre || ''}
                            disabled={user.rol !== 'cliente'}
                            onChange={(event) => {
                              const value = event.target.value;
                              setUsuarios((prev) => prev.map((item) => (
                                item.id === user.id ? { ...item, cliente_nombre: value || null } : item
                              )));
                            }}
                            className={`mt-2 w-full border px-3 py-2 text-sm outline-none focus:ring-2 ${inputTone} ${user.rol !== 'cliente' ? 'opacity-60 cursor-not-allowed' : ''}`}
                          >
                            <option value="">Selecciona cliente</option>
                            {clientes.map((cliente) => (
                              <option key={cliente} value={cliente}>
                                {cliente}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="text-xs font-semibold uppercase tracking-wide">
                          Activo
                          <select
                            value={user.activo ? 'true' : 'false'}
                            onChange={(event) => {
                              const nextActivo = event.target.value === 'true';
                              setUsuarios((prev) => prev.map((item) => (
                                item.id === user.id ? { ...item, activo: nextActivo } : item
                              )));
                            }}
                            className={`mt-2 w-full border px-3 py-2 text-sm outline-none focus:ring-2 ${inputTone}`}
                          >
                            <option value="true">Activo</option>
                            <option value="false">Inactivo</option>
                          </select>
                        </label>
                      </div>

                      {user.rol === 'ejecutivo' && (
                        <div className="mt-4 border p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide mb-3">Clientes asignados</p>
                          {loadingClientes ? (
                            <p className="text-xs opacity-70">Cargando clientes...</p>
                          ) : (
                            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 max-h-56 overflow-y-auto pr-2">
                              {clientes.map((cliente) => {
                                const checked = user.clientes_asignados.includes(cliente);
                                return (
                                  <label
                                    key={cliente}
                                    className={`flex items-center gap-2 border px-3 py-2 text-xs cursor-pointer transition ${checked ? 'border-emerald-400/70 bg-emerald-500/10' : 'border-transparent hover:border-slate-500/40'}`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => {
                                        setUsuarios((prev) => prev.map((item) => {
                                          if (item.id !== user.id) return item;
                                          const next = item.clientes_asignados.includes(cliente)
                                            ? item.clientes_asignados.filter((value) => value !== cliente)
                                            : [...item.clientes_asignados, cliente];
                                          return { ...item, clientes_asignados: next };
                                        }));
                                      }}
                                      className="h-4 w-4"
                                    />
                                    <span className="truncate">{cliente}</span>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_0.8fr] items-end">
                        <div className="grid gap-2">
                          <label className="text-xs font-semibold uppercase tracking-wide">
                            Resetear contraseña
                            <input
                              type="text"
                              value={resetValue}
                              onChange={(event) => {
                                const value = event.target.value;
                                setResetPasswordValue((prev) => ({ ...prev, [user.id]: value }));
                              }}
                              className={`mt-2 w-full border px-3 py-2 text-sm outline-none focus:ring-2 ${inputTone}`}
                              placeholder="Nueva contraseña"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => handleResetPassword(user)}
                            disabled={resetPasswordUserId === user.id}
                            className={`inline-flex items-center justify-center border px-4 py-2 text-xs font-semibold transition ${theme === 'dark'
                              ? 'bg-rose-500 border-rose-500 text-slate-950 hover:bg-rose-400'
                              : 'bg-red-500 border-red-500 text-white hover:bg-red-600'
                              } ${resetPasswordUserId === user.id ? 'opacity-60 cursor-not-allowed' : ''}`}
                          >
                            {resetPasswordUserId === user.id ? 'Reseteando...' : 'Resetear contraseña'}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleUpdateUser(user)}
                          disabled={savingUserId === user.id}
                          className={`inline-flex items-center justify-center border px-5 py-2.5 text-sm font-semibold transition ${theme === 'dark'
                            ? 'bg-emerald-500 border-emerald-500 text-slate-950 hover:bg-emerald-400'
                            : 'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700'
                            } ${savingUserId === user.id ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          {savingUserId === user.id ? 'Guardando...' : 'Guardar cambios'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
            ) : (
              <div className={`mt-8 border px-6 py-4 text-sm ${formTone}`}>
                <p className="opacity-70">El listado y la edición estarán disponibles después de iniciar sesión como administrador.</p>
              </div>
            )}
          </div>
          ) : activeTab === 'consignatarios' ? (
            <div className="mx-auto max-w-6xl">
              <ConsignatariosManager currentUser={currentUser} />
            </div>
          ) : activeTab === 'plantillas' ? (
            <div className="mx-auto max-w-7xl">
              <PlantillasManager currentUser={currentUser} />
            </div>
          ) : isEditorTab ? (
            <div className="h-[calc(100vh-4rem)]">
              <EditorPlantillasExcel />
            </div>
          ) : isGoogleSheetsTab ? (
            <div className="h-[calc(100vh-4rem)]">
              <EditorPlantillasGoogleSheets />
            </div>
          ) : null}
        </main>
      </div>

      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        userInfo={userInfo || currentUser}
        onUserUpdate={(updatedUser) => {
          setUserInfo(updatedUser);
          if (currentUser) {
            setCurrentUser({ ...currentUser, ...updatedUser });
          }
        }}
      />
    </div>
  );
}
