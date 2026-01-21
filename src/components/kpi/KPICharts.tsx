'use client';

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useTheme } from '@/contexts/ThemeContext';
import { ChartCard } from './ChartCard';
import { KPIMetrics } from '@/lib/kpi-calculations';

interface KPIChartsProps {
  metrics: KPIMetrics;
}

const COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#14b8a6', // teal
];

export function KPICharts({ metrics }: KPIChartsProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Preparar datos para gráfico de embarques por semana
  const embarquesPorSemanaData = Object.entries(metrics.embarquesPorSemana)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12) // Últimas 12 semanas
    .map(([semana, cantidad]) => ({
      semana: semana.replace('W', ' Sem '),
      cantidad,
    }));

  // Preparar datos para gráfico de embarques por mes
  const embarquesPorMesData = Object.entries(metrics.embarquesPorMes)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, cantidad]) => {
      const [year, month] = mes.split('-');
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      return {
        mes: `${monthNames[parseInt(month) - 1]} ${year}`,
        cantidad,
      };
    });

  // Preparar datos para distribución por especie (top 8)
  const distribucionEspecieData = Object.entries(metrics.distribucionPorEspecie)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([especie, cantidad]) => ({
      name: especie.length > 20 ? `${especie.substring(0, 20)}...` : especie,
      value: cantidad,
    }));

  // Preparar datos para distribución por temperatura
  const distribucionTemperaturaData = Object.entries(metrics.distribucionPorTemperatura)
    .map(([temp, cantidad]) => ({
      name: temp,
      value: cantidad,
    }));

  // Preparar datos para comparación TT real vs planificado
  const ttComparisonData = [
    {
      name: 'Tiempo de Tránsito',
      'Real': Math.round(metrics.tiempoTransitoReal),
      'Planificado': Math.round(metrics.tiempoTransitoPlanificado),
    },
  ];

  // Preparar datos para top clientes
  const topClientesData = metrics.topClientes
    .slice(0, 8)
    .map((cliente) => ({
      name: cliente.cliente.length > 25 ? `${cliente.cliente.substring(0, 25)}...` : cliente.cliente,
      contenedores: cliente.contenedores,
      embarques: cliente.embarques,
    }));

  // Preparar datos para top ejecutivos
  const topEjecutivosData = metrics.topEjecutivos
    .slice(0, 8)
    .map((ejecutivo) => ({
      name: ejecutivo.ejecutivo.length > 20 ? `${ejecutivo.ejecutivo.substring(0, 20)}...` : ejecutivo.ejecutivo,
      embarques: ejecutivo.embarques,
      tasaConfirmacion: Math.round(ejecutivo.tasaConfirmacion),
    }));

  const tooltipStyle = {
    backgroundColor: isDark ? '#1e293b' : '#ffffff',
    border: `1px solid ${isDark ? '#334155' : '#e5e7eb'}`,
    borderRadius: '8px',
    color: isDark ? '#f1f5f9' : '#1f2937',
  };

  return (
    <div className="space-y-6">
      {/* Gráfico de embarques por semana */}
      {embarquesPorSemanaData.length > 0 && (
        <ChartCard
          title="Embarques Confirmados por Semana"
          description="Tendencia de embarques confirmados en las últimas 12 semanas"
        >
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={embarquesPorSemanaData}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e5e7eb'} />
              <XAxis
                dataKey="semana"
                stroke={isDark ? '#94a3b8' : '#6b7280'}
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis stroke={isDark ? '#94a3b8' : '#6b7280'} fontSize={12} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ color: isDark ? '#f1f5f9' : '#1f2937' }} />
              <Line
                type="monotone"
                dataKey="cantidad"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', r: 4 }}
                name="Embarques"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Gráfico de embarques por mes */}
      {embarquesPorMesData.length > 0 && (
        <ChartCard
          title="Embarques por Mes"
          description="Distribución mensual de embarques confirmados"
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={embarquesPorMesData}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e5e7eb'} />
              <XAxis
                dataKey="mes"
                stroke={isDark ? '#94a3b8' : '#6b7280'}
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis stroke={isDark ? '#94a3b8' : '#6b7280'} fontSize={12} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ color: isDark ? '#f1f5f9' : '#1f2937' }} />
              <Bar dataKey="cantidad" fill="#3b82f6" name="Embarques" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Comparación TT Real vs Planificado */}
      <ChartCard
        title="Tiempo de Tránsito: Real vs Planificado"
        description="Comparación entre el tiempo de tránsito real y el planificado"
      >
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={ttComparisonData}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e5e7eb'} />
            <XAxis dataKey="name" stroke={isDark ? '#94a3b8' : '#6b7280'} fontSize={12} />
            <YAxis stroke={isDark ? '#94a3b8' : '#6b7280'} fontSize={12} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ color: isDark ? '#f1f5f9' : '#1f2937' }} />
            <Bar dataKey="Real" fill="#10b981" radius={[8, 8, 0, 0]} />
            <Bar dataKey="Planificado" fill="#3b82f6" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribución por especie */}
        {distribucionEspecieData.length > 0 && (
          <ChartCard
            title="Distribución por Especie"
            description="Top 8 especies más transportadas"
          >
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={distribucionEspecieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {distribucionEspecieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Distribución por temperatura */}
        {distribucionTemperaturaData.length > 0 && (
          <ChartCard
            title="Distribución por Temperatura"
            description="Distribución de embarques según temperatura de transporte"
          >
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={distribucionTemperaturaData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {distribucionTemperaturaData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>

      {/* Top clientes por contenedores */}
      {topClientesData.length > 0 && (
        <ChartCard
          title="Top Clientes por Contenedores"
          description="Los 8 clientes con mayor número de contenedores"
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topClientesData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e5e7eb'} />
              <XAxis type="number" stroke={isDark ? '#94a3b8' : '#6b7280'} fontSize={12} />
              <YAxis
                type="category"
                dataKey="name"
                stroke={isDark ? '#94a3b8' : '#6b7280'}
                fontSize={12}
                width={150}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ color: isDark ? '#f1f5f9' : '#1f2937' }} />
              <Bar dataKey="contenedores" fill="#3b82f6" name="Contenedores" radius={[0, 8, 8, 0]} />
              <Bar dataKey="embarques" fill="#10b981" name="Embarques" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Top ejecutivos */}
      {topEjecutivosData.length > 0 && (
        <ChartCard
          title="Top Ejecutivos"
          description="Ejecutivos con mayor número de embarques y tasa de confirmación"
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topEjecutivosData}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e5e7eb'} />
              <XAxis
                dataKey="name"
                stroke={isDark ? '#94a3b8' : '#6b7280'}
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis stroke={isDark ? '#94a3b8' : '#6b7280'} fontSize={12} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ color: isDark ? '#f1f5f9' : '#1f2937' }} />
              <Bar dataKey="embarques" fill="#3b82f6" name="Embarques" radius={[8, 8, 0, 0]} />
              <Bar dataKey="tasaConfirmacion" fill="#10b981" name="Tasa Confirmación (%)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </div>
  );
}
