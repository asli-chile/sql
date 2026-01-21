import { Registro } from '@/types/registros';

// Tipos para KPIs
export interface KPIMetrics {
  // Flujo de embarques
  totalReservas: number;
  totalConfirmadas: number;
  porcentajeConfirmacion: number;
  ratioCancelacion: number;
  
  // Tiempo y puntualidad
  tiempoPromedioReservaConfirmacion: number; // en días
  tiempoTransitoReal: number; // promedio en días
  tiempoTransitoPlanificado: number; // promedio en días
  diferenciaTT: number; // diferencia entre real y planificado
  porcentajeArribosATiempo: number;
  retrasosPromedio: number; // en días
  
  // Capacidad
  totalContenedores: number;
  
  // Distribuciones
  distribucionPorEspecie: Record<string, number>;
  distribucionPorTemperatura: Record<string, number>;
  distribucionPorTemporada: Record<string, number>;
  distribucionPorCliente: Record<string, number>;
  distribucionPorEjecutivo: Record<string, number>;
  
  // Embarques por periodo
  embarquesPorSemana: Record<string, number>;
  embarquesPorMes: Record<string, number>;
  
  // Top rankings
  topClientes: Array<{ cliente: string; contenedores: number; embarques: number }>;
  topClientesCancelados: Array<{ cliente: string; cancelaciones: number; contenedores: number }>;
  topEjecutivos: Array<{ ejecutivo: string; embarques: number; tasaConfirmacion: number }>;
  topEjecutivosCancelados: Array<{ ejecutivo: string; cancelaciones: number; contenedores: number }>;
}

// Helper para calcular días entre dos fechas
const calcularDiasEntre = (fechaInicio: Date | null, fechaFin: Date | null): number | null => {
  if (!fechaInicio || !fechaFin) return null;
  const diffTime = fechaFin.getTime() - fechaInicio.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Helper para obtener semana del año
const obtenerSemana = (fecha: Date | null): string | null => {
  if (!fecha) return null;
  const d = new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${week.toString().padStart(2, '0')}`;
};

// Helper para obtener mes del año
const obtenerMes = (fecha: Date | null): string | null => {
  if (!fecha) return null;
  const year = fecha.getFullYear();
  const month = fecha.getMonth() + 1;
  return `${year}-${month.toString().padStart(2, '0')}`;
};

// Helper para parsear contenedores
const parsearContenedores = (contenedor: string | string[]): string[] => {
  if (Array.isArray(contenedor)) {
    return contenedor;
  }
  if (typeof contenedor === 'string') {
    try {
      const parsed = JSON.parse(contenedor);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      return contenedor.trim().split(/\s+/).filter(Boolean);
    } catch {
      return contenedor.trim().split(/\s+/).filter(Boolean);
    }
  }
  return [];
};

// Función principal para calcular KPIs
export function calcularKPIs(registros: Registro[]): KPIMetrics {
  // Filtrar registros válidos (no cancelados para la mayoría de métricas)
  const registrosValidos = registros.filter(r => r.estado !== 'CANCELADO');
  const todosLosRegistros = registros;
  
  // 1. Flujo de embarques
  const totalReservas = todosLosRegistros.length;
  const totalConfirmadas = registrosValidos.filter(r => r.estado === 'CONFIRMADO').length;
  const totalCanceladas = todosLosRegistros.filter(r => r.estado === 'CANCELADO').length;
  const porcentajeConfirmacion = totalReservas > 0 ? (totalConfirmadas / totalReservas) * 100 : 0;
  const ratioCancelacion = totalReservas > 0 ? (totalCanceladas / totalReservas) * 100 : 0;
  
  // 2. Tiempo y puntualidad
  // Tiempo promedio desde reserva (ingresado) a confirmación
  const tiemposReservaConfirmacion: number[] = [];
  registrosValidos.forEach(registro => {
    if (registro.ingresado && registro.estado === 'CONFIRMADO') {
      // Usar updated_at como proxy de fecha de confirmación si está disponible
      // Por ahora, usamos una estimación basada en cuando cambió el estado
      const fechaConfirmacion = registro.updatedAt || new Date();
      const dias = calcularDiasEntre(registro.ingresado, fechaConfirmacion);
      if (dias !== null && dias >= 0) {
        tiemposReservaConfirmacion.push(dias);
      }
    }
  });
  const tiempoPromedioReservaConfirmacion = tiemposReservaConfirmacion.length > 0
    ? tiemposReservaConfirmacion.reduce((a, b) => a + b, 0) / tiemposReservaConfirmacion.length
    : 0;
  
  // Tiempo de tránsito real vs planificado
  const tiemposTransitoReal: number[] = [];
  const tiemposTransitoPlanificado: number[] = [];
  const arribosATiempo: number[] = [];
  const retrasos: number[] = [];
  
  registrosValidos.forEach(registro => {
    if (registro.etd && registro.eta) {
      const ttReal = calcularDiasEntre(registro.etd, registro.eta);
      if (ttReal !== null && ttReal >= 0) {
        tiemposTransitoReal.push(ttReal);
      }
      
      if (registro.tt !== null && registro.tt !== undefined) {
        tiemposTransitoPlanificado.push(registro.tt);
      }
      
      // Verificar si llegó a tiempo (ETA <= fecha actual o ETA <= ETA planificado)
      const ahora = new Date();
      if (registro.eta <= ahora) {
        // Ya llegó, verificar si fue a tiempo
        const retraso = calcularDiasEntre(registro.eta, ahora);
        if (retraso !== null) {
          if (retraso <= 0) {
            arribosATiempo.push(1);
          } else {
            retrasos.push(retraso);
          }
        }
      }
    }
  });
  
  const tiempoTransitoReal = tiemposTransitoReal.length > 0
    ? tiemposTransitoReal.reduce((a, b) => a + b, 0) / tiemposTransitoReal.length
    : 0;
  
  const tiempoTransitoPlanificado = tiemposTransitoPlanificado.length > 0
    ? tiemposTransitoPlanificado.reduce((a, b) => a + b, 0) / tiemposTransitoPlanificado.length
    : 0;
  
  const diferenciaTT = tiempoTransitoReal - tiempoTransitoPlanificado;
  
  const porcentajeArribosATiempo = arribosATiempo.length > 0
    ? (arribosATiempo.length / (arribosATiempo.length + retrasos.length)) * 100
    : 0;
  
  const retrasosPromedio = retrasos.length > 0
    ? retrasos.reduce((a, b) => a + b, 0) / retrasos.length
    : 0;
  
  // 3. Capacidad
  let totalContenedores = 0;
  
  registrosValidos.forEach(registro => {
    const contenedores = parsearContenedores(registro.contenedor);
    totalContenedores += contenedores.length;
  });
  
  // 4. Distribuciones
  const distribucionPorEspecie: Record<string, number> = {};
  const distribucionPorTemperatura: Record<string, number> = {};
  const distribucionPorTemporada: Record<string, number> = {};
  const distribucionPorCliente: Record<string, number> = {};
  const distribucionPorEjecutivo: Record<string, number> = {};
  
  registrosValidos.forEach(registro => {
    // Por especie
    const especie = registro.especie || 'Sin especificar';
    distribucionPorEspecie[especie] = (distribucionPorEspecie[especie] || 0) + 1;
    
    // Por temperatura
    const temp = registro.temperatura !== null && registro.temperatura !== undefined
      ? `${registro.temperatura}°C`
      : 'Sin temperatura';
    distribucionPorTemperatura[temp] = (distribucionPorTemperatura[temp] || 0) + 1;
    
    // Por temporada
    const temporada = registro.temporada || 'Sin temporada';
    distribucionPorTemporada[temporada] = (distribucionPorTemporada[temporada] || 0) + 1;
    
    // Por cliente
    const cliente = registro.shipper || 'Sin cliente';
    distribucionPorCliente[cliente] = (distribucionPorCliente[cliente] || 0) + 1;
    
    // Por ejecutivo
    const ejecutivo = registro.ejecutivo || 'Sin ejecutivo';
    distribucionPorEjecutivo[ejecutivo] = (distribucionPorEjecutivo[ejecutivo] || 0) + 1;
  });
  
  // 5. Embarques por periodo
  const embarquesPorSemana: Record<string, number> = {};
  const embarquesPorMes: Record<string, number> = {};
  
  registrosValidos.forEach(registro => {
    if (registro.etd) {
      const semana = obtenerSemana(registro.etd);
      if (semana) {
        embarquesPorSemana[semana] = (embarquesPorSemana[semana] || 0) + 1;
      }
      
      const mes = obtenerMes(registro.etd);
      if (mes) {
        embarquesPorMes[mes] = (embarquesPorMes[mes] || 0) + 1;
      }
    }
  });
  
  // 6. Top rankings
  // Top clientes por contenedores
  const clientesStats: Record<string, { contenedores: number; embarques: number }> = {};
  registrosValidos.forEach(registro => {
    // Normalizar nombre del cliente (trim y uppercase para evitar duplicados por mayúsculas/minúsculas)
    const cliente = (registro.shipper || 'Sin cliente').trim().toUpperCase();
    if (!clientesStats[cliente]) {
      clientesStats[cliente] = { contenedores: 0, embarques: 0 };
    }
    const contenedores = parsearContenedores(registro.contenedor);
    clientesStats[cliente].contenedores += contenedores.length;
    clientesStats[cliente].embarques += 1;
  });
  
  const topClientes = Object.entries(clientesStats)
    .map(([cliente, datos]) => ({ cliente, ...datos }))
    .sort((a, b) => {
      // Ordenar primero por contenedores (descendente)
      if (b.contenedores !== a.contenedores) {
        return b.contenedores - a.contenedores;
      }
      // Si hay empate, ordenar por embarques (descendente)
      return b.embarques - a.embarques;
    })
    .slice(0, 10);
  
  // Top ejecutivos por embarques y tasa de confirmación (solo registros no cancelados)
  const ejecutivosStats: Record<string, { total: number; confirmados: number }> = {};
  registrosValidos.forEach(registro => {
    const ejecutivo = (registro.ejecutivo || 'Sin ejecutivo').trim().toUpperCase();
    if (!ejecutivosStats[ejecutivo]) {
      ejecutivosStats[ejecutivo] = { total: 0, confirmados: 0 };
    }
    ejecutivosStats[ejecutivo].total++;
    if (registro.estado === 'CONFIRMADO') {
      ejecutivosStats[ejecutivo].confirmados++;
    }
  });
  
  const topEjecutivos = Object.entries(ejecutivosStats)
    .map(([ejecutivo, stats]) => ({
      ejecutivo,
      embarques: stats.total,
      tasaConfirmacion: stats.total > 0 ? (stats.confirmados / stats.total) * 100 : 0
    }))
    .sort((a, b) => b.embarques - a.embarques)
    .slice(0, 10);
  
  // Registros cancelados para calcular tops de cancelaciones
  const registrosCancelados = todosLosRegistros.filter(r => r.estado === 'CANCELADO');
  
  // Top ejecutivos con más cancelaciones
  const ejecutivosCanceladosStats: Record<string, { cancelaciones: number; contenedores: number }> = {};
  registrosCancelados.forEach(registro => {
    const ejecutivo = (registro.ejecutivo || 'Sin ejecutivo').trim().toUpperCase();
    if (!ejecutivosCanceladosStats[ejecutivo]) {
      ejecutivosCanceladosStats[ejecutivo] = { cancelaciones: 0, contenedores: 0 };
    }
    const contenedores = parsearContenedores(registro.contenedor);
    ejecutivosCanceladosStats[ejecutivo].cancelaciones += 1;
    ejecutivosCanceladosStats[ejecutivo].contenedores += contenedores.length;
  });
  
  const topEjecutivosCancelados = Object.entries(ejecutivosCanceladosStats)
    .map(([ejecutivo, datos]) => ({ ejecutivo, ...datos }))
    .sort((a, b) => {
      // Ordenar primero por número de cancelaciones (descendente)
      if (b.cancelaciones !== a.cancelaciones) {
        return b.cancelaciones - a.cancelaciones;
      }
      // Si hay empate, ordenar por contenedores (descendente)
      return b.contenedores - a.contenedores;
    })
    .slice(0, 10);
  
  // Top clientes con más cancelaciones
  const clientesCanceladosStats: Record<string, { cancelaciones: number; contenedores: number }> = {};
  registrosCancelados.forEach(registro => {
    const cliente = (registro.shipper || 'Sin cliente').trim().toUpperCase();
    if (!clientesCanceladosStats[cliente]) {
      clientesCanceladosStats[cliente] = { cancelaciones: 0, contenedores: 0 };
    }
    const contenedores = parsearContenedores(registro.contenedor);
    clientesCanceladosStats[cliente].cancelaciones += 1;
    clientesCanceladosStats[cliente].contenedores += contenedores.length;
  });
  
  const topClientesCancelados = Object.entries(clientesCanceladosStats)
    .map(([cliente, datos]) => ({ cliente, ...datos }))
    .sort((a, b) => {
      // Ordenar primero por número de cancelaciones (descendente)
      if (b.cancelaciones !== a.cancelaciones) {
        return b.cancelaciones - a.cancelaciones;
      }
      // Si hay empate, ordenar por contenedores (descendente)
      return b.contenedores - a.contenedores;
    })
    .slice(0, 10);
  
  return {
    totalReservas,
    totalConfirmadas,
    porcentajeConfirmacion,
    ratioCancelacion,
    tiempoPromedioReservaConfirmacion,
    tiempoTransitoReal,
    tiempoTransitoPlanificado,
    diferenciaTT,
    porcentajeArribosATiempo,
    retrasosPromedio,
    totalContenedores,
    distribucionPorEspecie,
    distribucionPorTemperatura,
    distribucionPorTemporada,
    distribucionPorCliente,
    distribucionPorEjecutivo,
    embarquesPorSemana,
    embarquesPorMes,
    topClientes,
    topClientesCancelados,
    topEjecutivos,
    topEjecutivosCancelados
  };
}
