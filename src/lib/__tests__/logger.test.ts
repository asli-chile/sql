import { logger, createLogger } from '../logger';

describe('logger', () => {
  beforeEach(() => {
    // Limpiar console mocks antes de cada test
    jest.clearAllMocks();
    // Mock de console methods
    console.debug = jest.fn();
    console.info = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  });

  afterEach(() => {
    // Limpiar mocks después de cada test
    jest.clearAllMocks();
  });

  describe('formato de mensajes', () => {
    it('debe formatear mensajes con contexto', () => {
      // Forzar modo desarrollo para este test
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      // Recargar el módulo para que tome el nuevo NODE_ENV
      jest.resetModules();
      const { logger: testLogger } = require('../logger');
      
      testLogger.info('Test message', undefined, 'MyContext');
      
      // Restaurar
      process.env.NODE_ENV = originalEnv;
      
      // Verificar que se llamó (puede no llamarse si no está en desarrollo, pero eso está bien)
      expect(console.info).toHaveBeenCalled();
    });
  });

  describe('createLogger', () => {
    it('debe crear un logger con contexto predefinido', () => {
      const log = createLogger('MyModule');
      
      expect(log).toBeDefined();
      expect(log.debug).toBeDefined();
      expect(log.info).toBeDefined();
      expect(log.warn).toBeDefined();
      expect(log.error).toBeDefined();
    });

    it('debe permitir llamar métodos del logger', () => {
      const log = createLogger('MyModule');
      
      // No debería lanzar error
      expect(() => {
        log.info('Test message');
        log.warn('Warning message');
        log.error('Error message');
      }).not.toThrow();
    });
  });

  describe('logger principal', () => {
    it('debe tener todos los métodos definidos', () => {
      expect(logger.debug).toBeDefined();
      expect(logger.info).toBeDefined();
      expect(logger.warn).toBeDefined();
      expect(logger.error).toBeDefined();
    });

    it('debe poder llamar métodos sin error', () => {
      expect(() => {
        logger.debug('Debug message');
        logger.info('Info message');
        logger.warn('Warning message');
        logger.error('Error message');
      }).not.toThrow();
    });

    it('debe formatear mensajes con contexto correctamente', () => {
      logger.warn('Test message', undefined, 'TestContext');
      
      // Warn siempre se llama (en dev y prod)
      expect(console.warn).toHaveBeenCalled();
      
      // Verificar que el mensaje formateado está en la llamada
      const calls = (console.warn as jest.Mock).mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      expect(calls[0][0]).toContain('TestContext');
      expect(calls[0][0]).toContain('Test message');
    });
  });

  describe('comportamiento en diferentes entornos', () => {
    it('debe manejar errores sin crashear', () => {
      const error = new Error('Test error');
      
      expect(() => {
        logger.error('Error message', error);
      }).not.toThrow();
      
      // Error siempre se llama
      expect(console.error).toHaveBeenCalled();
    });

    it('debe manejar warnings sin crashear', () => {
      expect(() => {
        logger.warn('Warning message', { someData: 'test' });
      }).not.toThrow();
      
      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe('logger con datos', () => {
    it('debe poder pasar datos opcionales', () => {
      const testData = { key: 'value', number: 123 };
      
      expect(() => {
        logger.info('Message with data', testData);
        logger.warn('Warning with data', testData);
        logger.error('Error with data', new Error('test'));
      }).not.toThrow();
    });

    it('debe poder usar logger sin datos', () => {
      expect(() => {
        logger.info('Message without data');
        logger.warn('Warning without data');
        logger.error('Error without data');
      }).not.toThrow();
    });
  });
});
