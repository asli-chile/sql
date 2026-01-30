'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { createLogger } from '@/lib/logger';
import { fetchTransportes } from '@/lib/transportes-service';
import { createClient } from '@/lib/supabase-browser';

const log = createLogger('useUser');

interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  activo: boolean;
  puede_subir?: boolean;
  cliente_nombre?: string | null;
  clientes_asignados?: string[];
}

interface UserContextType {
  currentUser: Usuario | null;
  setCurrentUser: (usuario: Usuario | null) => void;
  isLoggedIn: boolean;
  hasRole: (role: string) => boolean;
  canEdit: boolean;
  canAdd: boolean;
  canViewHistory: boolean;
  canDelete: boolean;
  canExport: boolean;
  transportesCount: number;
  registrosCount: number;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [transportesCount, setTransportesCount] = useState<number>(0);
  const [registrosCount, setRegistrosCount] = useState<number>(0);

  useEffect(() => {
    // NO cargar desde localStorage - siempre cargar desde Supabase
    // Esto asegura que los datos siempre estén sincronizados con la base de datos
    loadUserFromSupabase();
  }, []);

  useEffect(() => {
    const loadCounts = async () => {
      if (!currentUser) {
        setTransportesCount(0);
        setRegistrosCount(0);
        return;
      }

      try {
        const supabase = createClient();
        const isAdmin = currentUser.rol === 'admin';
        const clienteNombre = currentUser.cliente_nombre?.trim();
        const clientesAsignados = currentUser.clientes_asignados || [];

        // --- Contar transportes ---
        let transportesQuery = supabase
          .from('transportes')
          .select('*', { count: 'exact', head: true })
          .is('deleted_at', null);

        if (!isAdmin) {
          if (currentUser.rol === 'cliente' && clienteNombre) {
            transportesQuery = transportesQuery.eq('exportacion', clienteNombre);
          } else if (clientesAsignados.length > 0) {
            transportesQuery = transportesQuery.in('exportacion', clientesAsignados);
          } else if (currentUser.rol !== 'admin') {
            // Si no es admin y no tiene clientes, no debería ver nada
            transportesQuery = transportesQuery.eq('id', 'NONE');
          }
        }

        const { count: tCount, error: tError } = await transportesQuery;
        setTransportesCount(tError ? 0 : (tCount || 0));

        // --- Contar registros ---
        let registrosQuery = supabase
          .from('registros')
          .select('*', { count: 'exact', head: true })
          .is('deleted_at', null);

        if (!isAdmin) {
          if (currentUser.rol === 'cliente' && clienteNombre) {
            registrosQuery = registrosQuery.ilike('shipper', clienteNombre);
          } else if (clientesAsignados.length > 0) {
            registrosQuery = registrosQuery.in('shipper', clientesAsignados);
          } else {
            registrosQuery = registrosQuery.eq('id', 'NONE');
          }
        }

        const { count: rCount, error: rError } = await registrosQuery;
        setRegistrosCount(rError ? 0 : (rCount || 0));
      } catch (error) {
        console.error('Error loading counts:', error);
        setTransportesCount(0);
        setRegistrosCount(0);
      }
    };

    loadCounts();
  }, [currentUser]);

  const loadUserFromSupabase = async () => {
    try {
      setIsLoading(true);
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        setCurrentUser(null);
        setIsLoading(false);
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('auth_user_id', user.id)
        .single();

      if (!userError && userData) {
        handleSetCurrentUser(userData);
      } else {
        // Fallback si no hay registro en la tabla usuarios
        const fallbackUser: Usuario = {
          id: user.id,
          nombre: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario',
          email: user.email || '',
          rol: 'cliente',
          activo: true
        };
        handleSetCurrentUser(fallbackUser);
      }
      setIsLoading(false);
    } catch (error) {
      log.error('Error loading user from Supabase', error);
      setIsLoading(false);
    }
  };

  const handleSetCurrentUser = (usuario: Usuario | null) => {
    setCurrentUser(usuario);
    // Sincronizar con localStorage SOLO cuando se establece explícitamente desde Supabase
    if (usuario) {
      localStorage.setItem('currentUser', JSON.stringify(usuario));
      // Agregar timestamp para verificar si los datos están actualizados
      localStorage.setItem('currentUserTimestamp', Date.now().toString());
    } else {
      localStorage.removeItem('currentUser');
      localStorage.removeItem('currentUserTimestamp');
    }
  };

  const isLoggedIn = !!currentUser;

  const hasRole = (role: string): boolean => {
    if (!currentUser) return false;
    return currentUser.rol === role;
  };

  // Permisos según roles:
  // admin: acceso total
  // ejecutivo: acceso sobre sus clientes asignados
  // cliente: solo lectura
  const isAdmin = currentUser?.rol === 'admin';
  const isEjecutivo = currentUser?.rol === 'ejecutivo'
    || (currentUser?.email?.endsWith('@asli.cl') && currentUser?.rol !== 'cliente')
    || false;
  const canEdit = currentUser ? (isAdmin || isEjecutivo) : false;
  const canAdd = currentUser ? (isAdmin || isEjecutivo) : false;
  const canViewHistory = currentUser ? (isAdmin || isEjecutivo) : false;
  const canDelete = currentUser ? (isAdmin || isEjecutivo) : false;
  const canExport = currentUser ? (isAdmin || isEjecutivo) : false;

  const value: UserContextType = {
    currentUser,
    setCurrentUser: handleSetCurrentUser,
    isLoggedIn,
    hasRole,
    canEdit,
    canAdd,
    canViewHistory,
    canDelete,
    canExport,
    transportesCount,
    registrosCount,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
