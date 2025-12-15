import { renderHook, act } from '@testing-library/react';
import { ReactNode } from 'react';
import { UserProvider, useUser } from '../useUser';

// Mock del logger
jest.mock('@/lib/logger', () => ({
  createLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

// Helper para wrapper el hook con el provider
const createWrapper = () => {
  return ({ children }: { children: ReactNode }) => (
    <UserProvider>{children}</UserProvider>
  );
};

describe('useUser', () => {
  beforeEach(() => {
    // Limpiar localStorage antes de cada test
    if (typeof localStorage !== 'undefined' && localStorage.clear) {
      localStorage.clear();
    }
    jest.clearAllMocks();
  });

  describe('Context Provider', () => {
    it('debe proporcionar el contexto correctamente', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useUser(), { wrapper });

      expect(result.current).toBeDefined();
      expect(result.current.currentUser).toBeNull();
      expect(result.current.isLoggedIn).toBe(false);
    });

    it('debe lanzar error si se usa fuera del provider', () => {
      // Suprimir console.error para este test
      const consoleError = jest.spyOn(console, 'error').mockImplementation();

      expect(() => {
        renderHook(() => useUser());
      }).toThrow('useUser must be used within a UserProvider');

      consoleError.mockRestore();
    });
  });

  describe('Estado inicial', () => {
    it('debe tener usuario null inicialmente', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useUser(), { wrapper });

      expect(result.current.currentUser).toBeNull();
      expect(result.current.isLoggedIn).toBe(false);
    });

    it('debe tener permisos en false cuando no hay usuario', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useUser(), { wrapper });

      expect(result.current.canEdit).toBe(false);
      expect(result.current.canAdd).toBe(false);
      expect(result.current.canDelete).toBe(false);
      expect(result.current.canExport).toBe(false);
      expect(result.current.canViewHistory).toBe(false);
    });
  });

  describe('setCurrentUser', () => {
    it('debe actualizar el usuario correctamente', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useUser(), { wrapper });

      const mockUsuario = {
        id: '123',
        nombre: 'Usuario Test',
        email: 'test@example.com',
        rol: 'usuario',
        activo: true,
      };

      act(() => {
        result.current.setCurrentUser(mockUsuario);
      });

      expect(result.current.currentUser).toEqual(mockUsuario);
      expect(result.current.isLoggedIn).toBe(true);
    });

    it('debe limpiar localStorage cuando se establece usuario null', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useUser(), { wrapper });

      const mockUsuario = {
        id: '123',
        nombre: 'Usuario Test',
        email: 'test@example.com',
        rol: 'usuario',
        activo: true,
      };

      // Limpiar mocks antes del test
      jest.clearAllMocks();

      // Establecer usuario primero
      act(() => {
        result.current.setCurrentUser(mockUsuario);
      });

      // Verificar que se guardó en localStorage
      expect(localStorage.setItem).toHaveBeenCalled();

      // Luego limpiarlo
      act(() => {
        result.current.setCurrentUser(null);
      });

      // Verificar que se removió del localStorage
      expect(localStorage.removeItem).toHaveBeenCalledWith('currentUser');
      expect(localStorage.removeItem).toHaveBeenCalledWith('currentUserTimestamp');
      expect(result.current.currentUser).toBeNull();
    });
  });

  describe('hasRole', () => {
    it('debe retornar false cuando no hay usuario', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useUser(), { wrapper });

      expect(result.current.hasRole('admin')).toBe(false);
      expect(result.current.hasRole('usuario')).toBe(false);
    });

    it('debe retornar true cuando el rol coincide', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useUser(), { wrapper });

      const mockUsuario = {
        id: '123',
        nombre: 'Admin Test',
        email: 'admin@example.com',
        rol: 'admin',
        activo: true,
      };

      act(() => {
        result.current.setCurrentUser(mockUsuario);
      });

      expect(result.current.hasRole('admin')).toBe(true);
      expect(result.current.hasRole('usuario')).toBe(false);
    });
  });

  describe('Permisos - Rol Admin', () => {
    it('debe tener todos los permisos como admin', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useUser(), { wrapper });

      const mockAdmin = {
        id: '123',
        nombre: 'Admin',
        email: 'admin@example.com',
        rol: 'admin',
        activo: true,
      };

      act(() => {
        result.current.setCurrentUser(mockAdmin);
      });

      expect(result.current.canEdit).toBe(true);
      expect(result.current.canAdd).toBe(true);
      expect(result.current.canDelete).toBe(true);
      expect(result.current.canExport).toBe(true);
      expect(result.current.canViewHistory).toBe(true);
    });
  });

  describe('Permisos - Rol Ejecutivo', () => {
    it('debe tener todos los permisos como ejecutivo (@asli.cl)', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useUser(), { wrapper });

      const mockEjecutivo = {
        id: '123',
        nombre: 'Ejecutivo',
        email: 'ejecutivo@asli.cl',
        rol: 'ejecutivo',
        activo: true,
      };

      act(() => {
        result.current.setCurrentUser(mockEjecutivo);
      });

      expect(result.current.canEdit).toBe(true);
      expect(result.current.canAdd).toBe(true);
      expect(result.current.canDelete).toBe(true);
      expect(result.current.canExport).toBe(true);
      expect(result.current.canViewHistory).toBe(true);
    });
  });

  describe('Permisos - Rol Usuario', () => {
    it('debe tener permisos limitados como usuario', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useUser(), { wrapper });

      const mockUsuario = {
        id: '123',
        nombre: 'Usuario',
        email: 'usuario@example.com',
        rol: 'usuario',
        activo: true,
      };

      act(() => {
        result.current.setCurrentUser(mockUsuario);
      });

      expect(result.current.canEdit).toBe(false); // Usuarios NO pueden editar
      expect(result.current.canAdd).toBe(true); // Pueden agregar
      expect(result.current.canDelete).toBe(false); // NO pueden eliminar
      expect(result.current.canExport).toBe(true); // Pueden exportar
      expect(result.current.canViewHistory).toBe(true); // Pueden ver historial
    });
  });

  describe('Permisos - Rol Lector', () => {
    it('debe tener solo permisos de lectura como lector', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useUser(), { wrapper });

      const mockLector = {
        id: '123',
        nombre: 'Lector',
        email: 'lector@example.com',
        rol: 'lector',
        activo: true,
      };

      act(() => {
        result.current.setCurrentUser(mockLector);
      });

      expect(result.current.canEdit).toBe(false);
      expect(result.current.canAdd).toBe(false); // NO pueden agregar
      expect(result.current.canDelete).toBe(false);
      expect(result.current.canExport).toBe(true); // Pueden exportar
      expect(result.current.canViewHistory).toBe(true); // Pueden ver historial
    });
  });
});

