'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'next/navigation';
import { X, User, Mail, Save, AlertCircle, LogOut, Users } from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userInfo: any;
  onUserUpdate: (updatedUser: any) => void;
}

export function UserProfileModal({ isOpen, onClose, userInfo, onUserUpdate }: UserProfileModalProps) {
  const [nombre, setNombre] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();
  const { theme } = useTheme();
  const router = useRouter();
  const isDark = theme === 'dark';

  useEffect(() => {
    if (userInfo) {
      setNombre(userInfo.nombre || '');
    }
  }, [userInfo]);

  const handleSave = async () => {
    if (!nombre.trim()) {
      setError('El nombre es requerido');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Actualizar en la tabla usuarios
      const { data, error: updateError } = await supabase
        .from('usuarios')
        .update({ 
          nombre: nombre.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userInfo.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Actualizar en auth.users metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: nombre.trim() }
      });

      if (authError) {
        console.warn('Error actualizando auth metadata:', authError);
        // No es crítico, continuamos
      }

      // Actualizar el estado local
      onUserUpdate(data);
      onClose();
      
    } catch (err: any) {
      setError(err.message || 'Error actualizando perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/auth');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (!isOpen) return null;

  const clientesAsignados = userInfo?.clientes_asignados || [];
  const clienteNombre = userInfo?.cliente_nombre || null;
  const isEjecutivo = userInfo?.rol === 'ejecutivo';
  const isCliente = userInfo?.rol === 'cliente';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className={`border max-w-md w-full ${
          isDark ? 'bg-slate-800/95 border-slate-700/60' : 'bg-white/95 border-gray-200'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${
          isDark ? 'border-slate-700/60' : 'border-gray-200'
        }`}>
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 border flex items-center justify-center ${
              isDark ? 'bg-blue-600/20 border-blue-500/30' : 'bg-blue-50 border-blue-200'
            }`}>
              <User className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
            <div>
              <h2 className={`text-lg font-medium ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                Perfil de Usuario
              </h2>
              <p className={`text-sm ${
                isDark ? 'text-slate-400' : 'text-gray-600'
              }`}>
                Información de tu cuenta
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`transition-colors ${
              isDark 
                ? 'text-slate-400 hover:text-slate-300' 
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Error message */}
          {error && (
            <div className={`p-3 border flex items-center ${
              isDark
                ? 'bg-red-900/20 border-red-800/60'
                : 'bg-red-50 border-red-200'
            }`}>
              <AlertCircle className={`w-4 h-4 mr-2 ${
                isDark ? 'text-red-400' : 'text-red-500'
              }`} />
              <span className={`text-sm ${
                isDark ? 'text-red-300' : 'text-red-700'
              }`}>{error}</span>
            </div>
          )}

          {/* Nombre */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${
              isDark ? 'text-slate-200' : 'text-gray-700'
            }`}>
              Nombre Completo *
            </label>
            <div className="relative">
              <User className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
                isDark ? 'text-slate-500' : 'text-gray-400'
              }`} />
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 border focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  isDark
                    ? 'border-slate-600/60 bg-slate-700/60 text-white placeholder-slate-400'
                    : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400'
                }`}
                placeholder="Tu nombre completo"
                required
              />
            </div>
          </div>

          {/* Email (readonly) */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${
              isDark ? 'text-slate-200' : 'text-gray-700'
            }`}>
              Email
            </label>
            <div className="relative">
              <Mail className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
                isDark ? 'text-slate-500' : 'text-gray-400'
              }`} />
              <input
                type="email"
                value={userInfo?.email || ''}
                disabled
                className={`w-full pl-10 pr-4 py-2 border cursor-not-allowed ${
                  isDark
                    ? 'border-slate-600/60 bg-slate-700/30 text-slate-400'
                    : 'border-gray-300 bg-gray-50 text-gray-500'
                }`}
              />
            </div>
            <p className={`text-xs mt-1 ${
              isDark ? 'text-slate-500' : 'text-gray-500'
            }`}>
              El email no se puede cambiar
            </p>
          </div>

          {/* Rol (readonly) */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${
              isDark ? 'text-slate-200' : 'text-gray-700'
            }`}>
              Rol
            </label>
            <div className={`px-3 py-2 border ${
              isDark
                ? 'border-slate-600/60 bg-slate-700/60'
                : 'border-gray-300 bg-gray-50'
            }`}>
              <span className={`text-sm font-medium capitalize ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                {userInfo?.rol || 'usuario'}
              </span>
            </div>
            <p className={`text-xs mt-1 ${
              isDark ? 'text-slate-500' : 'text-gray-500'
            }`}>
              El rol solo puede ser cambiado por un administrador
            </p>
          </div>

          {/* Clientes Asignados (solo para ejecutivos) */}
          {isEjecutivo && clientesAsignados.length > 0 && (
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDark ? 'text-slate-200' : 'text-gray-700'
              }`}>
                <Users className="inline w-4 h-4 mr-1" />
                Clientes Asignados
              </label>
              <div className={`space-y-2 max-h-32 overflow-y-auto ${
                isDark ? 'bg-slate-700/30' : 'bg-gray-50'
              } border p-3`}>
                {clientesAsignados.map((cliente: string, index: number) => (
                  <div
                    key={index}
                    className={`text-sm px-2 py-1 ${
                      isDark
                        ? 'bg-slate-600/60 text-slate-200'
                        : 'bg-white text-gray-700 border border-gray-200'
                    }`}
                  >
                    {cliente}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cliente Nombre (solo para clientes) */}
          {isCliente && clienteNombre && (
            <div>
              <label className={`block text-sm font-medium mb-1 ${
                isDark ? 'text-slate-200' : 'text-gray-700'
              }`}>
                Cliente
              </label>
              <div className={`px-3 py-2 border ${
                isDark
                  ? 'border-slate-600/60 bg-slate-700/60'
                  : 'border-gray-300 bg-gray-50'
              }`}>
                <span className={`text-sm font-medium ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>
                  {clienteNombre}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-between p-6 border-t ${
          isDark ? 'border-slate-700/60' : 'border-gray-200'
        }`}>
          <button
            onClick={handleLogout}
            className={`flex items-center gap-2 px-4 py-2 transition-colors ${
              isDark
                ? 'text-red-300 hover:bg-red-500/10 hover:text-red-200'
                : 'text-red-600 hover:bg-red-50'
            }`}
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar sesión</span>
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className={`px-4 py-2 transition-colors ${
                isDark
                  ? 'text-slate-300 hover:text-slate-200 hover:bg-slate-700/60'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={loading || !nombre.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Guardar</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
