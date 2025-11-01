'use client';

import { useState, useEffect, createContext, useContext } from 'react';

interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  activo: boolean;
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
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // NO cargar desde localStorage - siempre cargar desde Supabase
    // Esto asegura que los datos siempre estén sincronizados con la base de datos
    loadUserFromSupabase();
  }, []);

  const loadUserFromSupabase = async () => {
    try {
      // Limpiar localStorage para evitar datos obsoletos
      localStorage.removeItem('currentUser');
      
      // Solo inicializar como null - cada página cargará sus propios datos frescos
      setCurrentUser(null);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading user from Supabase:', error);
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
  // admin: puede hacer todo
  // ejecutivo (@asli.cl): puede hacer todo PERO solo sobre sus clientes asignados
  // usuario: puede agregar registros y descargar, NO puede editar campos existentes
  // lector: solo puede ver y descargar, NO puede agregar ni editar
  const isEjecutivo = currentUser?.email?.endsWith('@asli.cl') || false;
  const canEdit = currentUser ? (currentUser.rol === 'admin' || isEjecutivo) : false;
  const canAdd = currentUser ? ['admin', 'usuario'].includes(currentUser.rol) || isEjecutivo : false;
  const canViewHistory = currentUser ? ['admin', 'usuario', 'lector'].includes(currentUser.rol) || isEjecutivo : false;
  const canDelete = currentUser ? (currentUser.rol === 'admin' || isEjecutivo) : false;
  const canExport = currentUser ? ['admin', 'usuario', 'lector'].includes(currentUser.rol) || isEjecutivo : false;

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
