/**
 * Sistema de logging para la aplicación
 * Solo muestra logs en desarrollo, nunca en producción
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: unknown;
  timestamp: string;
  context?: string;
}

// Funciones para leer dinámicamente el entorno (importante para tests)
const isDevelopment = (): boolean => process.env.NODE_ENV === 'development';
const isProduction = (): boolean => process.env.NODE_ENV === 'production';

/**
 * Formatea el mensaje de log con contexto
 */
function formatMessage(message: string, context?: string): string {
  if (context) {
    return `[${context}] ${message}`;
  }
  return message;
}

/**
 * Crea una entrada de log
 */
function createLogEntry(
  level: LogLevel,
  message: string,
  data?: unknown,
  context?: string
): LogEntry {
  return {
    level,
    message,
    data,
    timestamp: new Date().toISOString(),
    context,
  };
}

/**
 * Logger principal
 */
export const logger = {
  /**
   * Log de debug - Solo en desarrollo
   */
  debug: (message: string, data?: unknown, context?: string) => {
    if (isDevelopment()) {
      const entry = createLogEntry('debug', message, data, context);
      const formattedMessage = formatMessage(message, context);
      if (data !== undefined) {
        console.debug(formattedMessage, data);
      } else {
        console.debug(formattedMessage);
      }
      return entry;
    }
  },

  /**
   * Log de información - Solo en desarrollo
   */
  info: (message: string, data?: unknown, context?: string) => {
    if (isDevelopment()) {
      const entry = createLogEntry('info', message, data, context);
      const formattedMessage = formatMessage(message, context);
      if (data !== undefined) {
        console.info(formattedMessage, data);
      } else {
        console.info(formattedMessage);
      }
      return entry;
    }
  },

  /**
   * Log de advertencia - Siempre visible (pero menos verboso en producción)
   */
  warn: (message: string, data?: unknown, context?: string) => {
    const entry = createLogEntry('warn', message, data, context);
    const formattedMessage = formatMessage(message, context);
    
    if (isDevelopment()) {
      if (data !== undefined) {
        console.warn(formattedMessage, data);
      } else {
        console.warn(formattedMessage);
      }
    } else {
      // En producción, solo mostrar mensaje sin datos sensibles
      console.warn(formattedMessage);
    }
    
    // TODO: En el futuro, enviar warnings a servicio de monitoreo
    return entry;
  },

  /**
   * Log de error - Siempre visible (pero menos verboso en producción)
   */
  error: (message: string, error?: unknown, context?: string) => {
    const entry = createLogEntry('error', message, error, context);
    const formattedMessage = formatMessage(message, context);
    
    if (isDevelopment()) {
      if (error !== undefined) {
        console.error(formattedMessage, error);
      } else {
        console.error(formattedMessage);
      }
    } else {
      // En producción, solo mostrar mensaje genérico
      console.error(formattedMessage);
      
      // TODO: Enviar errores a servicio de monitoreo (Sentry, etc.)
      // if (error instanceof Error) {
      //   reportErrorToService(error, { context, message });
      // }
    }
    
    return entry;
  },
};

/**
 * Logger específico por módulo (para mejor organización)
 */
export function createLogger(context: string) {
  return {
    debug: (message: string, data?: unknown) => logger.debug(message, data, context),
    info: (message: string, data?: unknown) => logger.info(message, data, context),
    warn: (message: string, data?: unknown) => logger.warn(message, data, context),
    error: (message: string, error?: unknown) => logger.error(message, error, context),
  };
}

/**
 * Utilidad para deprecar funciones/métodos
 */
export function deprecate(oldName: string, newName: string, context?: string) {
  const message = `${oldName} está deprecado. Usa ${newName} en su lugar.`;
  
  if (isDevelopment()) {
    logger.warn(message, undefined, context);
  }
}

/**
 * Verifica si estamos en desarrollo
 */
export function isDev(): boolean {
  return isDevelopment();
}

/**
 * Verifica si estamos en producción
 */
export function isProd(): boolean {
  return isProduction();
}

