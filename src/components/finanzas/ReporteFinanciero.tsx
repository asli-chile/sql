'use client';

import React, { useRef, useState } from 'react';
import { ReporteFinanciero as ReporteType } from '@/types/finanzas';
import { useTheme } from '@/contexts/ThemeContext';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import { Download, FileText, TrendingUp, TrendingDown, DollarSign, PieChart as PieChartIcon } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useToast } from '@/hooks/useToast';

interface ReporteFinancieroProps {
    reporte: ReporteType;
}

export function ReporteFinanciero({ reporte }: ReporteFinancieroProps) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const reportRef = useRef<HTMLDivElement>(null);
    const { success, error: showError } = useToast();
    const [downloading, setDownloading] = useState(false);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);
    };

    const formatPercentage = (value: number) => {
        return `${value.toFixed(1)}%`;
    };

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

    const handleDownloadPDF = async () => {
        if (!reportRef.current) return;

        setDownloading(true);
        try {
            const element = reportRef.current;
            const canvas = await html2canvas(element, {
                scale: 1.5, // Reduced scale for better performance
                backgroundColor: isDark ? '#0f172a' : '#ffffff',
                logging: false,
                useCORS: true,
            });

            const imgData = canvas.toDataURL('image/jpeg', 0.8);
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
            });

            const imgWidth = 210;
            const pageHeight = 297;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            // Robust Blob download method
            const pdfBlob = pdf.output('blob');
            const url = URL.createObjectURL(pdfBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `reporte-financiero-${new Date().toISOString().split('T')[0]}.pdf`;
            document.body.appendChild(link);
            link.click();

            // Cleanup
            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }, 100);

            success('Reporte descargado correctamente');
        } catch (err) {
            console.error('Error generating PDF:', err);
            showError('Error al generar el PDF');
        } finally {
            setDownloading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    // Data for charts
    const costBreakdownData = [
        { name: 'Transp. Terrestre', value: reporte.costosPorTipo.transporteTerrestre },
        { name: 'Coordinación', value: reporte.costosPorTipo.coordinacion },
        { name: 'Costos Navieros', value: reporte.costosPorTipo.costosNavieros },
        { name: 'Otros', value: reporte.costosPorTipo.otros },
    ].filter(item => item.value > 0);

    const topClientsData = reporte.ingresosPorCliente.slice(0, 5).map(c => ({
        name: c.cliente.length > 15 ? c.cliente.substring(0, 15) + '...' : c.cliente,
        ingresos: c.ingresos,
        embarques: c.embarques
    }));

    const topNavierasData = reporte.costosPorNaviera.slice(0, 5).map(n => ({
        name: n.naviera.length > 15 ? n.naviera.substring(0, 15) + '...' : n.naviera,
        costos: n.costos
    }));

    return (
        <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex justify-end gap-3 print:hidden">
                <button
                    onClick={handlePrint}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors border ${isDark
                        ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                >
                    <FileText className="w-4 h-4" />
                    <span>Imprimir</span>
                </button>
                <button
                    onClick={handleDownloadPDF}
                    disabled={downloading}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${isDark
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    {downloading ? (
                        <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Generando PDF...</span>
                        </>
                    ) : (
                        <>
                            <Download className="w-4 h-4" />
                            <span>Descargar PDF</span>
                        </>
                    )}
                </button>
            </div>



            {/* Report Content to Capture */}
            <div
                ref={reportRef}
                className={`p-8 rounded-xl space-y-8 ${isDark ? 'bg-slate-900 text-slate-100' : 'bg-white text-gray-900'
                    }`}
            >
                {/* Report Header */}
                <div className="border-b pb-6 mb-6 border-gray-200 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold mb-2">Reporte Financiero</h1>
                            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                                Generado el {new Date().toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-medium">ASLI Gestión Logística</p>
                            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Departamento de Finanzas</p>
                        </div>
                    </div>
                </div>

                {/* KPIs Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className={`p-4 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-green-500/10 text-green-500">
                                <TrendingUp className="w-5 h-5" />
                            </div>
                            <span className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Ingresos Totales</span>
                        </div>
                        <p className="text-2xl font-bold">{formatCurrency(reporte.ingresosTotales)}</p>
                        <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                            {reporte.totalEmbarques} embarques
                        </p>
                    </div>

                    <div className={`p-4 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-red-500/10 text-red-500">
                                <TrendingDown className="w-5 h-5" />
                            </div>
                            <span className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Costos Totales</span>
                        </div>
                        <p className="text-2xl font-bold">{formatCurrency(reporte.costosTotales)}</p>
                        <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                            Promedio: {formatCurrency(reporte.promedioCostoPorEmbarque)}
                        </p>
                    </div>

                    <div className={`p-4 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                                <DollarSign className="w-5 h-5" />
                            </div>
                            <span className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Margen Total</span>
                        </div>
                        <p className={`text-2xl font-bold ${reporte.margenTotal >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {formatCurrency(reporte.margenTotal)}
                        </p>
                        <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                            Rentabilidad neta
                        </p>
                    </div>

                    <div className={`p-4 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
                                <PieChartIcon className="w-5 h-5" />
                            </div>
                            <span className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Margen %</span>
                        </div>
                        <p className="text-2xl font-bold">{formatPercentage(reporte.margenPorcentaje)}</p>
                        <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                            Sobre ingresos
                        </p>
                    </div>
                </div>

                {/* Charts Section 1: Income vs Costs & Breakdown */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Top Clients Chart */}
                    <div className={`p-6 rounded-xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                        <h3 className="text-lg font-semibold mb-6">Ingresos por Cliente (Top 5)</h3>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={topClientsData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e5e7eb'} />
                                    <XAxis type="number" stroke={isDark ? '#94a3b8' : '#64748b'} tickFormatter={(val) => `$${val / 1000000}M`} />
                                    <YAxis dataKey="name" type="category" width={100} stroke={isDark ? '#94a3b8' : '#64748b'} style={{ fontSize: '12px' }} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderColor: isDark ? '#334155' : '#e5e7eb' }}
                                        formatter={(value: number | undefined) => [formatCurrency(value || 0), 'Ingresos']}
                                    />
                                    <Bar dataKey="ingresos" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Cost Breakdown Chart */}
                    <div className={`p-6 rounded-xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                        <h3 className="text-lg font-semibold mb-6">Desglose de Costos</h3>
                        <div className="h-[300px] w-full flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={costBreakdownData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }: { name?: string; percent?: number }) => `${name || ''} ${((percent || 0) * 100).toFixed(0)}%`}
                                        outerRadius={100}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {costBreakdownData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: number | undefined) => [formatCurrency(value || 0), 'Costo']} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Detailed Tables */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Top Clients Table */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4">Detalle por Cliente</h3>
                        <div className={`overflow-hidden rounded-lg border ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                            <table className="w-full text-sm text-left">
                                <thead className={`text-xs uppercase ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-gray-50 text-gray-500'}`}>
                                    <tr>
                                        <th className="px-4 py-3">Cliente</th>
                                        <th className="px-4 py-3 text-right">Ingresos</th>
                                        <th className="px-4 py-3 text-right">Emb.</th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${isDark ? 'divide-slate-700' : 'divide-gray-200'}`}>
                                    {reporte.ingresosPorCliente.slice(0, 10).map((cliente, idx) => (
                                        <tr key={idx} className={isDark ? 'bg-slate-900' : 'bg-white'}>
                                            <td className="px-4 py-3 font-medium">{cliente.cliente}</td>
                                            <td className="px-4 py-3 text-right">{formatCurrency(cliente.ingresos)}</td>
                                            <td className="px-4 py-3 text-right">{cliente.embarques}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Top Navieras Table */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4">Costos por Naviera</h3>
                        <div className={`overflow-hidden rounded-lg border ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                            <table className="w-full text-sm text-left">
                                <thead className={`text-xs uppercase ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-gray-50 text-gray-500'}`}>
                                    <tr>
                                        <th className="px-4 py-3">Naviera</th>
                                        <th className="px-4 py-3 text-right">Costos</th>
                                        <th className="px-4 py-3 text-right">Emb.</th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${isDark ? 'divide-slate-700' : 'divide-gray-200'}`}>
                                    {reporte.costosPorNaviera.slice(0, 10).map((naviera, idx) => (
                                        <tr key={idx} className={isDark ? 'bg-slate-900' : 'bg-white'}>
                                            <td className="px-4 py-3 font-medium">{naviera.naviera}</td>
                                            <td className="px-4 py-3 text-right">{formatCurrency(naviera.costos)}</td>
                                            <td className="px-4 py-3 text-right">{naviera.embarques}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Footer Note */}
                <div className={`text-center text-xs pt-8 border-t ${isDark ? 'text-slate-500 border-slate-700' : 'text-gray-400 border-gray-200'}`}>
                    <p>Este documento es confidencial y para uso interno exclusivo de ASLI Gestión Logística.</p>
                </div>
            </div>
        </div>
    );
}
