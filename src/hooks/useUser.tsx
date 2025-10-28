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
  canViewHistory: boolean;
  canDelete: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null);

  useEffect(() => {
    // Cargar usuario desde localStorage al inicializar
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('currentUser');
      }
    }
  }, []);

  const handleSetCurrentUser = (usuario: Usuario | null) => {
    setCurrentUser(usuario);
    if (usuario) {
      localStorage.setItem('currentUser', JSON.stringify(usuario));
    } else {
      localStorage.removeItem('currentUser');
    }
  };

  const isLoggedIn = !!currentUser;

  const hasRole = (role: string): boolean => {
    if (!currentUser) return false;
    return currentUser.rol === role;
  };

  const canEdit = currentUser ? ['admin', 'supervisor', 'usuario'].includes(currentUser.rol) : false;
  const canViewHistory = currentUser ? ['admin', 'supervisor', 'usuario', 'lector'].includes(currentUser.rol) : false;
  const canDelete = currentUser ? ['admin', 'supervisor'].includes(currentUser.rol) : false;

  const value: UserContextType = {
    currentUser,
    setCurrentUser: handleSetCurrentUser,
    isLoggedIn,
    hasRole,
    canEdit,
    canViewHistory,
    canDelete,
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
