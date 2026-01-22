'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/hooks/useUser';

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
  const { theme } = useTheme();
  const { currentUser } = useUser();
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

  const isRodrigo = currentUser?.email?.toLowerCase() === 'rodrigo.caceres@asli.cl';
  const isAdmin = currentUser?.rol === 'admin';
  const canAccess = isRodrigo || isAdmin;

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

  if (currentUser && !isRodrigo) {
    return (
      <div className={`flex h-screen items-center justify-center ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-gray-50 text-gray-900'}`}>
        <div className={`rounded-2xl border px-6 py-4 text-center ${formTone}`}>
          <p className="text-sm font-semibold">Acceso restringido</p>
          <p className="text-xs opacity-70">Este módulo solo está disponible para Rodrigo.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-gray-50 text-gray-900'}`}>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
        <div className={`rounded-3xl border p-6 sm:p-8 shadow-xl ${formTone}`}>
          <div className="flex flex-col gap-2 border-b pb-4 mb-6">
            <h1 className="text-xl sm:text-2xl font-semibold">Mantenimiento de Usuarios</h1>
            <p className="text-sm opacity-70">
              Crea accesos con contraseña, define el rol y asigna clientes.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4">
            {!currentUser && (
              <>
                <div className={`rounded-2xl border px-4 py-3 text-xs ${theme === 'dark' ? 'border-amber-500/40 bg-amber-500/10 text-amber-200' : 'border-amber-300 bg-amber-50 text-amber-700'}`}>
                  <p className="font-semibold uppercase tracking-wide mb-1">Modo bootstrap</p>
                  <p>Si no existen usuarios, podrás crear a Rodrigo sin clave. Si configuraste `MAINTENANCE_BOOTSTRAP_KEY`, ingrésala aquí.</p>
                </div>
                <label className="text-xs font-semibold uppercase tracking-wide">
                  Clave bootstrap
                  <input
                    type="password"
                    value={bootstrapKey}
                    onChange={(event) => setBootstrapKey(event.target.value)}
                    className={`mt-2 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 ${inputTone}`}
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
                  className={`mt-2 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 ${inputTone}`}
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
                  className={`mt-2 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 ${inputTone}`}
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
                  className={`mt-2 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 ${inputTone}`}
                  placeholder="Nombre del usuario"
                  required
                />
              </label>
              <label className="text-xs font-semibold uppercase tracking-wide">
                Rol
                <select
                  value={rol}
                  onChange={(event) => setRol(event.target.value as RolUsuario)}
                  className={`mt-2 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 ${inputTone}`}
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
                  className={`mt-2 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 ${inputTone}`}
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
              <div className="rounded-2xl border p-4">
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
                          className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs cursor-pointer transition ${checked ? 'border-emerald-400/70 bg-emerald-500/10' : 'border-transparent hover:border-slate-500/40'}`}
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
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-500">
                {errorMessage}
              </div>
            )}
            {successMessage && (
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-500">
                {successMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className={`inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition ${theme === 'dark'
                ? 'bg-sky-500 text-slate-950 hover:bg-sky-400'
                : 'bg-blue-600 text-white hover:bg-blue-700'
                } ${isSubmitting ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {isSubmitting ? 'Creando usuario...' : 'Crear usuario'}
            </button>
          </form>
        </div>

        {currentUser && isRodrigo ? (
          <div className={`mt-8 rounded-3xl border p-6 sm:p-8 shadow-xl ${formTone}`}>
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
                    <div key={user.id} className={`rounded-2xl border p-4 ${theme === 'dark' ? 'border-slate-800/70 bg-slate-900/40' : 'border-gray-200 bg-white'}`}>
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
                            className={`mt-2 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 ${inputTone}`}
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
                            className={`mt-2 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 ${inputTone} ${user.rol !== 'cliente' ? 'opacity-60 cursor-not-allowed' : ''}`}
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
                            className={`mt-2 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 ${inputTone}`}
                          >
                            <option value="true">Activo</option>
                            <option value="false">Inactivo</option>
                          </select>
                        </label>
                      </div>

                      {user.rol === 'ejecutivo' && (
                        <div className="mt-4 rounded-2xl border p-4">
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
                                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs cursor-pointer transition ${checked ? 'border-emerald-400/70 bg-emerald-500/10' : 'border-transparent hover:border-slate-500/40'}`}
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
                              className={`mt-2 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 ${inputTone}`}
                              placeholder="Nueva contraseña"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => handleResetPassword(user)}
                            disabled={resetPasswordUserId === user.id}
                            className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-semibold transition ${theme === 'dark'
                              ? 'bg-rose-500 text-slate-950 hover:bg-rose-400'
                              : 'bg-red-500 text-white hover:bg-red-600'
                              } ${resetPasswordUserId === user.id ? 'opacity-60 cursor-not-allowed' : ''}`}
                          >
                            {resetPasswordUserId === user.id ? 'Reseteando...' : 'Resetear contraseña'}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleUpdateUser(user)}
                          disabled={savingUserId === user.id}
                          className={`inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition ${theme === 'dark'
                            ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
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
          <div className={`mt-8 rounded-3xl border px-6 py-4 text-sm ${formTone}`}>
            <p className="opacity-70">El listado y la edición estarán disponibles después de iniciar sesión como Rodrigo.</p>
          </div>
        )}
      </div>
    </div>
  );
}
