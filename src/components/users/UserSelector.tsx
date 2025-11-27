'use client';

import { useState, useEffect } from 'react';
import { User, LogIn, LogOut, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  activo: boolean;
}

interface UserSelectorProps {
  onUserChange: (usuario: Usuario | null) => void;
  currentUser?: Usuario | null;
}

export function UserSelector({ onUserChange, currentUser }: UserSelectorProps) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    loadUsuarios();
  }, []);

  const loadUsuarios = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('activo', true)
        .order('nombre');

      if (error) throw error;
      setUsuarios(data || []);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = (usuario: Usuario) => {
    onUserChange(usuario);
    setShowDropdown(false);
    
    // Guardar usuario en localStorage para persistencia
    localStorage.setItem('currentUser', JSON.stringify(usuario));
  };

  const handleLogout = () => {
    onUserChange(null);
    localStorage.removeItem('currentUser');
    setShowDropdown(false);
  };

  const getRoleColor = (rol: string) => {
    switch (rol) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'supervisor':
        return 'bg-blue-100 text-blue-800';
      case 'usuario':
        return 'bg-green-100 text-green-800';
      case 'lector':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleIcon = (rol: string) => {
    switch (rol) {
      case 'admin':
        return '👑';
      case 'supervisor':
        return '👨‍💼';
      case 'usuario':
        return '👤';
      case 'lector':
        return '👁️';
      default:
        return '👤';
    }
  };

  return (
    <div className="relative">
      {/* Botón de usuario actual */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        {currentUser ? (
          <>
            <User size={16} className="text-gray-600" />
            <span className="text-sm font-medium text-gray-900">
              {currentUser.nombre}
            </span>
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getRoleColor(currentUser.rol)}`}>
              {getRoleIcon(currentUser.rol)} {currentUser.rol.toUpperCase()}
            </span>
          </>
        ) : (
          <>
            <LogIn size={16} className="text-gray-600" />
            <span className="text-sm text-gray-600">Seleccionar Usuario</span>
          </>
        )}
      </button>

      {/* Dropdown de usuarios */}
      {showDropdown && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <Users size={16} className="text-gray-600" />
              <h3 className="font-semibold text-gray-900">Seleccionar Usuario</h3>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Elige tu usuario para registrar cambios en el historial
            </p>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-sm text-gray-600 mt-2">Cargando usuarios...</p>
              </div>
            ) : usuarios.length === 0 ? (
              <div className="p-4 text-center text-gray-600">
                <Users size={24} className="mx-auto mb-2 text-gray-400" />
                <p className="text-sm">No hay usuarios disponibles</p>
              </div>
            ) : (
              <div className="p-2">
                {usuarios.map((usuario) => (
                  <button
                    key={usuario.id}
                    onClick={() => handleUserSelect(usuario)}
                    className={`w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors ${
                      currentUser?.id === usuario.id ? 'bg-blue-50 border border-blue-200' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="text-lg">{getRoleIcon(usuario.rol)}</div>
                        <div>
                          <p className="font-medium text-gray-900">{usuario.nombre}</p>
                          <p className="text-sm text-gray-600">{usuario.email}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getRoleColor(usuario.rol)}`}>
                        {usuario.rol.toUpperCase()}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {currentUser && (
            <div className="p-3 border-t border-gray-200">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut size={16} />
                <span className="text-sm font-medium">Cerrar Sesión</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Overlay para cerrar dropdown */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
}
