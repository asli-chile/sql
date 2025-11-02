'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, Download, Eye } from 'lucide-react';
import { Registro } from '@/types/registros';
import { Factura, ProductoFactura } from '@/types/factura';
import { useTheme } from '@/contexts/ThemeContext';
import { createClient } from '@/lib/supabase-browser';
import { useToast } from '@/hooks/useToast';
import { PlantillaAlma } from '@/components/facturas/PlantillaAlma';
import { generarFacturaPDF } from '@/lib/factura-pdf';
import { generarFacturaExcel } from '@/lib/factura-excel';

interface FacturaCreatorProps {
  registro: Registro;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export function FacturaCreator({ registro, isOpen, onClose, onSave }: FacturaCreatorProps) {
  const { theme } = useTheme();
  const { success, error: showError } = useToast();
  const supabase = createClient();

  // Estado de la factura
  const [factura, setFactura] = useState<Factura>(() => {
    // Inicializar con datos del registro
    return initializeFacturaFromRegistro(registro);
  });

  const [guardando, setGuardando] = useState(false);
  const [descargandoPDF, setDescargandoPDF] = useState(false);
  const [descargandoExcel, setDescargandoExcel] = useState(false);

  // Inicializar factura cuando cambia el registro
  useEffect(() => {
    if (isOpen && registro) {
      setFactura(initializeFacturaFromRegistro(registro));
    }
  }, [isOpen, registro]);

  // Calcular totales cuando cambian los productos
  const totalesCalculados = useMemo(() => {
    let cantidadTotal = 0;
    let valorTotal = 0;

    factura.productos.forEach(producto => {
      cantidadTotal += producto.cantidad;
      const total = producto.cantidad * producto.precioPorCaja;
      valorTotal += total;
    });

    return {
      cantidadTotal,
      valorTotal,
      valorTotalTexto: numberToWords(valorTotal)
    };
  }, [factura.productos]);

  // Actualizar totales en la factura
  useEffect(() => {
    setFactura(prev => ({
      ...prev,
      totales: totalesCalculados
    }));
  }, [totalesCalculados]);

  const handleSave = async (e?: React.MouseEvent) => {
    // Prevenir comportamiento por defecto si hay evento
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    console.log('🔵 Iniciando guardado de factura...');
    console.log('Datos de factura:', factura);

    // Validaciones básicas
    if (!factura.exportador.nombre || !factura.exportador.nombre.trim()) {
      console.error('❌ Error: Nombre del exportador faltante');
      showError('El nombre del exportador es obligatorio');
      return;
    }

    if (!factura.consignatario.nombre || !factura.consignatario.nombre.trim()) {
      console.error('❌ Error: Nombre del consignatario faltante');
      showError('El nombre del consignatario es obligatorio');
      return;
    }

    if (!factura.embarque.numeroInvoice || !factura.embarque.numeroInvoice.trim()) {
      console.error('❌ Error: Número de invoice faltante');
      showError('El número de invoice es obligatorio');
      return;
    }

    if (factura.productos.length === 0) {
      console.error('❌ Error: No hay productos');
      showError('Debe agregar al menos un producto');
      return;
    }

    // Validar que todos los productos tengan datos válidos
    const productosInvalidos = factura.productos.some(
      (p) => !p.cantidad || p.cantidad <= 0 || !p.precioPorCaja || p.precioPorCaja <= 0
    );

    if (productosInvalidos) {
      console.error('❌ Error: Productos con datos inválidos');
      showError('Todos los productos deben tener cantidad y precio válidos');
      return;
    }

    console.log('✅ Validaciones pasadas, guardando...');

    setGuardando(true);
    try {
      // Obtener usuario actual
      const { data: userData } = await supabase.auth.getUser();
      const userEmail = userData?.user?.email || 'unknown';

      // Guardar en Supabase
      const { data, error } = await supabase
        .from('facturas')
        .insert({
          registro_id: registro.id,
          ref_asli: factura.refAsli,
          exportador: factura.exportador,
          consignatario: factura.consignatario,
          embarque: factura.embarque,
          productos: factura.productos,
          totales: totalesCalculados,
          cliente_plantilla: factura.clientePlantilla,
          created_by: userEmail,
        })
        .select()
        .single();

      if (error) {
        console.error('Error de Supabase:', error);
        throw error;
      }

      console.log('✅ Factura guardada exitosamente:', data);
      success('Factura guardada exitosamente');
      
      // Cerrar modal después de un pequeño delay para que se vea el mensaje de éxito
      setTimeout(() => {
        onSave();
      }, 500);
    } catch (err: any) {
      console.error('Error guardando factura:', err);
      const errorMessage = err.message || 'Error desconocido al guardar la factura';
      showError(`Error al guardar la factura: ${errorMessage}`);
    } finally {
      setGuardando(false);
    }
  };

  const handleDownloadPDF = async () => {
    setDescargandoPDF(true);
    try {
      const facturaCompleta = { ...factura, totales: totalesCalculados };
      await generarFacturaPDF(facturaCompleta);
      success('PDF generado exitosamente');
    } catch (err: any) {
      console.error('Error generando PDF:', err);
      showError('Error al generar PDF: ' + err.message);
    } finally {
      setDescargandoPDF(false);
    }
  };

  const handleDownloadExcel = async () => {
    setDescargandoExcel(true);
    try {
      const facturaCompleta = { ...factura, totales: totalesCalculados };
      await generarFacturaExcel(facturaCompleta);
      success('Excel generado exitosamente');
    } catch (err: any) {
      console.error('Error generando Excel:', err);
      showError('Error al generar Excel: ' + err.message);
    } finally {
      setDescargandoExcel(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div
        className={`relative w-full max-w-[95vw] h-[95vh] rounded-lg shadow-xl overflow-hidden flex flex-col ${
          theme === 'dark' ? 'bg-gray-800' : 'bg-white'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between p-4 border-b ${
            theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
          }`}
        >
          <div>
            <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Crear Factura
            </h2>
            {factura.refAsli && (
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                REF ASLI: <span className="font-semibold">{factura.refAsli}</span>
              </p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownloadPDF}
              disabled={descargandoPDF}
              className={`px-3 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                descargandoPDF
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>PDF</span>
            </button>
            <button
              onClick={handleDownloadExcel}
              disabled={descargandoExcel}
              className={`px-3 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                descargandoExcel
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>Excel</span>
            </button>
            <button
              onClick={onClose}
              className={`p-1 rounded hover:bg-opacity-20 transition-colors ${
                theme === 'dark'
                  ? 'text-gray-400 hover:bg-white'
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Formulario lateral (30%) */}
          <div
            className={`w-[30%] border-r overflow-y-auto p-4 ${
              theme === 'dark' ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'
            }`}
          >
            <FormularioFactura factura={factura} setFactura={setFactura} />
          </div>

          {/* Vista previa (70%) */}
          <div className="flex-1 overflow-y-auto p-4 bg-white">
            <PlantillaAlma factura={{ ...factura, totales: totalesCalculados }} />
          </div>
        </div>

        {/* Footer */}
        <div
          className={`flex items-center justify-end space-x-3 p-4 border-t ${
            theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
          }`}
        >
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg transition-colors ${
              theme === 'dark'
                ? 'text-gray-300 hover:bg-gray-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={(e) => handleSave(e)}
            disabled={guardando}
            className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
              guardando
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>{guardando ? 'Guardando...' : 'Guardar Factura'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Componente del formulario
function FormularioFactura({
  factura,
  setFactura,
}: {
  factura: Factura;
  setFactura: React.Dispatch<React.SetStateAction<Factura>>;
}) {
  const { theme } = useTheme();

  const updateFactura = (path: string, value: any) => {
    setFactura(prev => {
      const newFactura = { ...prev };
      const keys = path.split('.');
      let current: any = newFactura;
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      
      // Si se actualiza el país del consignatario, sincronizar con paisDestinoFinal
      if (path === 'consignatario.pais') {
        newFactura.embarque.paisDestinoFinal = value;
      }
      
      return newFactura;
    });
  };

  const addProducto = () => {
    setFactura(prev => ({
      ...prev,
      productos: [
        ...prev.productos,
        {
          cantidad: 0,
          tipoEnvase: 'CASES',
          especie: prev.productos[0]?.especie || '',
          variedad: '',
          categoria: 'CAT 1',
          etiqueta: prev.exportador.nombre,
          calibre: '',
          kgNetoUnidad: 0,
          kgBrutoUnidad: 0,
          precioPorCaja: 0,
          total: 0,
        },
      ],
    }));
  };

  const removeProducto = (index: number) => {
    setFactura(prev => ({
      ...prev,
      productos: prev.productos.filter((_, i) => i !== index),
    }));
  };

  const updateProducto = (index: number, field: keyof ProductoFactura, value: any) => {
    setFactura(prev => {
      const newProductos = [...prev.productos];
      newProductos[index] = { ...newProductos[index], [field]: value };
      
      // Si se cambia el tipo de caja, actualizar automáticamente kgNetoUnidad
      if (field === 'tipoEnvase') {
        if (value === '5KG') {
          newProductos[index].kgNetoUnidad = 5.0;
        } else if (value === '2.5KG') {
          newProductos[index].kgNetoUnidad = 2.5;
        }
      }
      
      // Recalcular total
      newProductos[index].total = newProductos[index].cantidad * newProductos[index].precioPorCaja;
      return { ...prev, productos: newProductos };
    });
  };

  return (
    <div className="space-y-6">
      <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
        Información de la Factura
      </h3>

      {/* Exportador */}
      <section className="space-y-2">
        <h4 className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
          Exportador
        </h4>
        <input
          type="text"
          value={factura.exportador.nombre}
          onChange={e => updateFactura('exportador.nombre', e.target.value)}
          className={`w-full px-3 py-2 rounded border ${
            theme === 'dark'
              ? 'bg-gray-800 border-gray-700 text-white'
              : 'bg-white border-gray-300 text-gray-900'
          }`}
          placeholder="Nombre"
        />
        <input
          type="text"
          value={factura.exportador.rut}
          onChange={e => updateFactura('exportador.rut', e.target.value)}
          className={`w-full px-3 py-2 rounded border ${
            theme === 'dark'
              ? 'bg-gray-800 border-gray-700 text-white'
              : 'bg-white border-gray-300 text-gray-900'
          }`}
          placeholder="RUT"
        />
        <input
          type="text"
          value={factura.exportador.giro}
          onChange={e => updateFactura('exportador.giro', e.target.value)}
          className={`w-full px-3 py-2 rounded border ${
            theme === 'dark'
              ? 'bg-gray-800 border-gray-700 text-white'
              : 'bg-white border-gray-300 text-gray-900'
          }`}
          placeholder="Giro"
        />
        <textarea
          value={factura.exportador.direccion}
          onChange={e => updateFactura('exportador.direccion', e.target.value)}
          className={`w-full px-3 py-2 rounded border ${
            theme === 'dark'
              ? 'bg-gray-800 border-gray-700 text-white'
              : 'bg-white border-gray-300 text-gray-900'
          }`}
          placeholder="Dirección"
          rows={2}
        />
      </section>

      {/* Consignatario */}
      <section className="space-y-2">
        <h4 className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
          Consignatario
        </h4>
        <input
          type="text"
          value={factura.consignatario.nombre}
          onChange={e => updateFactura('consignatario.nombre', e.target.value)}
          className={`w-full px-3 py-2 rounded border ${
            theme === 'dark'
              ? 'bg-gray-800 border-gray-700 text-white'
              : 'bg-white border-gray-300 text-gray-900'
          }`}
          placeholder="Nombre"
        />
        <textarea
          value={factura.consignatario.direccion}
          onChange={e => updateFactura('consignatario.direccion', e.target.value)}
          className={`w-full px-3 py-2 rounded border ${
            theme === 'dark'
              ? 'bg-gray-800 border-gray-700 text-white'
              : 'bg-white border-gray-300 text-gray-900'
          }`}
          placeholder="Dirección"
          rows={3}
        />
        <input
          type="text"
          value={factura.consignatario.email || ''}
          onChange={e => updateFactura('consignatario.email', e.target.value)}
          className={`w-full px-3 py-2 rounded border ${
            theme === 'dark'
              ? 'bg-gray-800 border-gray-700 text-white'
              : 'bg-white border-gray-300 text-gray-900'
          }`}
          placeholder="Email/Tel"
        />
        <input
          type="text"
          value={factura.consignatario.contacto || ''}
          onChange={e => updateFactura('consignatario.contacto', e.target.value)}
          className={`w-full px-3 py-2 rounded border ${
            theme === 'dark'
              ? 'bg-gray-800 border-gray-700 text-white'
              : 'bg-white border-gray-300 text-gray-900'
          }`}
          placeholder="Contacto"
        />
        <input
          type="text"
          value={factura.consignatario.usci || ''}
          onChange={e => updateFactura('consignatario.usci', e.target.value)}
          className={`w-full px-3 py-2 rounded border ${
            theme === 'dark'
              ? 'bg-gray-800 border-gray-700 text-white'
              : 'bg-white border-gray-300 text-gray-900'
          }`}
          placeholder="USCI"
        />
      </section>

      {/* Embarque */}
      <section className="space-y-2">
        <h4 className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
          Embarque
        </h4>
        <div>
          <label className={`block text-xs mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Fecha Factura
          </label>
          <input
            type="date"
            value={factura.embarque.fechaFactura}
            onChange={e => updateFactura('embarque.fechaFactura', e.target.value)}
            className={`w-full px-3 py-2 rounded border ${
              theme === 'dark'
                ? 'bg-gray-800 border-gray-700 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          />
        </div>
        <div>
          <label className={`block text-xs mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            INVOICE N° *
          </label>
          <input
            type="text"
            value={factura.embarque.numeroInvoice}
            onChange={e => updateFactura('embarque.numeroInvoice', e.target.value)}
            className={`w-full px-3 py-2 rounded border ${
              theme === 'dark'
                ? 'bg-gray-800 border-gray-700 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
            placeholder="N° Invoice"
          />
        </div>
        <div>
          <label className={`block text-xs mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            EMBARQUE N°
          </label>
          <input
            type="text"
            value={factura.embarque.numeroEmbarque}
            onChange={e => updateFactura('embarque.numeroEmbarque', e.target.value)}
            className={`w-full px-3 py-2 rounded border ${
              theme === 'dark'
                ? 'bg-gray-800 border-gray-700 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
            placeholder="N° Embarque"
          />
        </div>
        <div>
          <label className={`block text-xs mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Fecha Embarque
          </label>
          <input
            type="date"
            value={factura.embarque.fechaEmbarque}
            onChange={e => updateFactura('embarque.fechaEmbarque', e.target.value)}
            className={`w-full px-3 py-2 rounded border ${
              theme === 'dark'
                ? 'bg-gray-800 border-gray-700 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={`block text-xs mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              CSP
            </label>
            <input
              type="text"
              value={factura.embarque.csp || ''}
              onChange={e => updateFactura('embarque.csp', e.target.value)}
              className={`w-full px-3 py-2 rounded border ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              placeholder="CSP"
            />
          </div>
          <div>
            <label className={`block text-xs mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              CSG
            </label>
            <input
              type="text"
              value={factura.embarque.csg || ''}
              onChange={e => updateFactura('embarque.csg', e.target.value)}
              className={`w-full px-3 py-2 rounded border ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              placeholder="CSG"
            />
          </div>
        </div>
        {/* Nave - Solo lectura (viene del registro) */}
        <div>
          <label className={`block text-xs mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Nave (automático)
          </label>
          <input
            type="text"
            value={factura.embarque.motonave}
            readOnly
            disabled
            className={`w-full px-3 py-2 rounded border ${
              theme === 'dark'
                ? 'bg-gray-700 border-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-gray-100 border-gray-300 text-gray-600 cursor-not-allowed'
            }`}
            placeholder="Nave"
          />
        </div>
        {/* Número de Viaje - Solo lectura (viene del registro) */}
        <div>
          <label className={`block text-xs mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            N° Viaje (automático)
          </label>
          <input
            type="text"
            value={factura.embarque.numeroViaje}
            readOnly
            disabled
            className={`w-full px-3 py-2 rounded border ${
              theme === 'dark'
                ? 'bg-gray-700 border-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-gray-100 border-gray-300 text-gray-600 cursor-not-allowed'
            }`}
            placeholder="N° Viaje"
          />
        </div>
        <div>
          <label className={`block text-xs mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Cláusula de Venta
          </label>
          <input
            type="text"
            value={factura.embarque.clausulaVenta}
            onChange={e => updateFactura('embarque.clausulaVenta', e.target.value)}
            className={`w-full px-3 py-2 rounded border ${
              theme === 'dark'
                ? 'bg-gray-800 border-gray-700 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
            placeholder="FOB, CIF, etc."
          />
        </div>
        <div>
          <label className={`block text-xs mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Modalidad de Venta
          </label>
          <input
            type="text"
            value={factura.embarque.modalidadVenta || ''}
            onChange={e => updateFactura('embarque.modalidadVenta', e.target.value)}
            className={`w-full px-3 py-2 rounded border ${
              theme === 'dark'
                ? 'bg-gray-800 border-gray-700 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
            placeholder="BAJO CONDICION"
          />
        </div>
        <div>
          <label className={`block text-xs mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            País Origen
          </label>
          <input
            type="text"
            value={factura.embarque.paisOrigen}
            onChange={e => updateFactura('embarque.paisOrigen', e.target.value)}
            className={`w-full px-3 py-2 rounded border ${
              theme === 'dark'
                ? 'bg-gray-800 border-gray-700 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
            placeholder="CHILE"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={`block text-xs mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Puerto Embarque
            </label>
            <input
              type="text"
              value={factura.embarque.puertoEmbarque}
              onChange={e => updateFactura('embarque.puertoEmbarque', e.target.value)}
              className={`w-full px-3 py-2 rounded border ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              placeholder="Puerto Embarque"
            />
          </div>
          <div>
            <label className={`block text-xs mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Puerto Destino
            </label>
            <input
              type="text"
              value={factura.embarque.puertoDestino}
              onChange={e => updateFactura('embarque.puertoDestino', e.target.value)}
              className={`w-full px-3 py-2 rounded border ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              placeholder="Puerto Destino"
            />
          </div>
        </div>
        <div>
          <label className={`block text-xs mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            País Destino Final
          </label>
          <input
            type="text"
            value={factura.embarque.paisDestinoFinal}
            onChange={e => updateFactura('embarque.paisDestinoFinal', e.target.value)}
            className={`w-full px-3 py-2 rounded border ${
              theme === 'dark'
                ? 'bg-gray-800 border-gray-700 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
            placeholder="País Destino Final"
          />
        </div>
        <div>
          <label className={`block text-xs mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Forma de Pago
          </label>
          <input
            type="text"
            value={factura.embarque.formaPago}
            onChange={e => updateFactura('embarque.formaPago', e.target.value)}
            className={`w-full px-3 py-2 rounded border ${
              theme === 'dark'
                ? 'bg-gray-800 border-gray-700 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
            placeholder="Forma de Pago"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={`block text-xs mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Peso Neto Total (Kgs)
            </label>
            <input
              type="number"
              step="0.01"
              value={factura.embarque.pesoNetoTotal || ''}
              onChange={e => updateFactura('embarque.pesoNetoTotal', e.target.value ? parseFloat(e.target.value) : undefined)}
              className={`w-full px-3 py-2 rounded border ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              placeholder="Peso Neto Total"
            />
          </div>
          <div>
            <label className={`block text-xs mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Peso Bruto Total (Kgs)
            </label>
            <input
              type="number"
              step="0.01"
              value={factura.embarque.pesoBrutoTotal || ''}
              onChange={e => updateFactura('embarque.pesoBrutoTotal', e.target.value ? parseFloat(e.target.value) : undefined)}
              className={`w-full px-3 py-2 rounded border ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              placeholder="Peso Bruto Total"
            />
          </div>
        </div>
        <div>
          <label className={`block text-xs mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Contenedor / AWB
          </label>
          <input
            type="text"
            value={factura.embarque.contenedor || ''}
            onChange={e => updateFactura('embarque.contenedor', e.target.value)}
            className={`w-full px-3 py-2 rounded border ${
              theme === 'dark'
                ? 'bg-gray-800 border-gray-700 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
            placeholder="Contenedor / AWB"
          />
        </div>
      </section>

      {/* Productos */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            Productos
          </h4>
          <button
            onClick={addProducto}
            className={`px-3 py-1 text-sm rounded ${
              theme === 'dark'
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            + Agregar
          </button>
        </div>
        {factura.productos.map((producto, index) => (
          <div
            key={index}
            className={`p-3 rounded border ${
              theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Producto {index + 1}
              </span>
              <button
                onClick={() => removeProducto(index)}
                className={`text-red-500 hover:text-red-700 text-sm ${
                  theme === 'dark' ? 'hover:text-red-400' : ''
                }`}
              >
                Eliminar
              </button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  value={producto.cantidad}
                  onChange={e => updateProducto(index, 'cantidad', parseInt(e.target.value) || 0)}
                  placeholder="Cantidad"
                  className={`px-2 py-1 rounded border ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-gray-50 border-gray-300 text-gray-900'
                  }`}
                />
                <select
                  value={producto.tipoEnvase}
                  onChange={e => updateProducto(index, 'tipoEnvase', e.target.value)}
                  className={`px-2 py-1 rounded border ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-gray-50 border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="CASES">CASES</option>
                  <option value="5KG">5KG</option>
                  <option value="2.5KG">2.5KG</option>
                </select>
              </div>
              <input
                type="text"
                value={producto.especie || ''}
                onChange={e => updateProducto(index, 'especie', e.target.value)}
                placeholder="Especie"
                className={`w-full px-2 py-1 rounded border ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-gray-50 border-gray-300 text-gray-900'
                }`}
              />
              <input
                type="text"
                value={producto.variedad}
                onChange={e => updateProducto(index, 'variedad', e.target.value)}
                placeholder="Variedad"
                className={`w-full px-2 py-1 rounded border ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-gray-50 border-gray-300 text-gray-900'
                }`}
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={producto.categoria}
                  onChange={e => updateProducto(index, 'categoria', e.target.value)}
                  placeholder="Categoría"
                  className={`px-2 py-1 rounded border ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-gray-50 border-gray-300 text-gray-900'
                  }`}
                />
                <input
                  type="text"
                  value={producto.calibre}
                  onChange={e => updateProducto(index, 'calibre', e.target.value)}
                  placeholder="Calibre"
                  className={`px-2 py-1 rounded border ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-gray-50 border-gray-300 text-gray-900'
                  }`}
                />
              </div>
              <input
                type="text"
                value={producto.etiqueta}
                onChange={e => updateProducto(index, 'etiqueta', e.target.value)}
                placeholder="Etiqueta"
                className={`w-full px-2 py-1 rounded border ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-gray-50 border-gray-300 text-gray-900'
                }`}
              />
              <div>
                <label className={`block text-xs mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  KG Neto/Unidad
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={producto.kgNetoUnidad}
                  onChange={e => updateProducto(index, 'kgNetoUnidad', parseFloat(e.target.value) || 0)}
                  placeholder="KG Neto"
                  className={`w-full px-2 py-1 rounded border ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-gray-50 border-gray-300 text-gray-900'
                  }`}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={producto.precioPorCaja}
                  onChange={e => updateProducto(index, 'precioPorCaja', parseFloat(e.target.value) || 0)}
                  placeholder="Precio/Caja"
                  className={`px-2 py-1 rounded border ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-gray-50 border-gray-300 text-gray-900'
                  }`}
                />
                <div className={`px-2 py-1 rounded border flex items-center ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-gray-300'
                    : 'bg-gray-50 border-gray-300 text-gray-900'
                }`}>
                  Total: US${producto.total.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

// Función para extraer nombre de nave y viaje del formato "NAVE [VIAJE]"
function extraerNaveYViaje(naveInicial: string | undefined | null, viaje?: string | null): { nave: string; viaje: string } {
  console.log('🔍 Extrayendo nave y viaje:', { naveInicial, viaje });
  
  // Validar que naveInicial exista
  if (!naveInicial) {
    console.log('⚠️ naveInicial está vacío, usando viaje:', viaje);
    return { nave: '', viaje: viaje || '' };
  }
  
  let nave = naveInicial;
  let viajeExtraido = viaje || '';
  
  // Si naveInicial contiene [VIAJE], extraerlo
  const matchNave = naveInicial.match(/^(.+?)\s*\[(.+?)\]$/);
  if (matchNave && matchNave.length >= 3) {
    nave = matchNave[1].trim();
    viajeExtraido = matchNave[2].trim();
    console.log('✅ Nave y viaje extraídos del formato [VIAJE]:', { nave, viaje: viajeExtraido });
  } else {
    console.log('ℹ️ No se encontró formato [VIAJE] en naveInicial');
  }
  
  // Si hay viaje separado pero no se extrajo de naveInicial, usarlo
  if (!viajeExtraido && viaje) {
    viajeExtraido = viaje;
    console.log('✅ Usando viaje del campo separado:', viajeExtraido);
  }
  
  const resultado = { nave: nave.trim(), viaje: viajeExtraido.trim() };
  console.log('✅ Resultado final:', resultado);
  return resultado;
}

// Función para inicializar factura desde registro
function initializeFacturaFromRegistro(registro: Registro): Factura {
  console.log('📋 Inicializando factura desde registro:', registro);
  console.log('📋 Registro naveInicial:', registro.naveInicial);
  console.log('📋 Registro viaje:', registro.viaje);
  
  // Extraer nave y viaje del registro
  const { nave, viaje } = extraerNaveYViaje(registro.naveInicial, registro.viaje);
  
  console.log('✅ Nave extraída:', nave);
  console.log('✅ Viaje extraído:', viaje);
  
  return {
    registroId: registro.id || '',
    refAsli: registro.refAsli,
    exportador: {
      nombre: registro.shipper, // Por defecto usa el shipper
      rut: '',
      giro: '',
      direccion: '',
    },
    consignatario: {
      nombre: (registro as any).consignatario || '',
      direccion: '',
      pais: registro.pod || '', // Por ahora usa POD, pero el usuario puede cambiarlo
    },
    embarque: {
      fechaFactura: registro.etd ? new Date(registro.etd).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      numeroInvoice: '', // Número de invoice independiente
      numeroEmbarque: registro.booking || '',
      csp: '',
      csg: '',
      fechaEmbarque: registro.etd ? new Date(registro.etd).toISOString().split('T')[0] : '',
      motonave: nave, // Nave extraída sin el viaje
      numeroViaje: viaje, // Viaje extraído
      modalidadVenta: 'BAJO CONDICION',
      clausulaVenta: 'FOB',
      paisOrigen: 'CHILE',
      puertoEmbarque: registro.pol || '',
      puertoDestino: registro.pod || '',
      paisDestinoFinal: registro.pod || '', // Se sincronizará automáticamente con consignatario.pais
      formaPago: '',
      pesoNetoTotal: undefined,
      pesoBrutoTotal: undefined,
      contenedor: Array.isArray(registro.contenedor) ? registro.contenedor.join(' ') : registro.contenedor || '',
    },
    productos: [
      {
        cantidad: 0,
        tipoEnvase: 'CASES',
        especie: registro.especie || '',
        variedad: '',
        categoria: 'CAT 1',
        etiqueta: registro.shipper,
        calibre: '',
        kgNetoUnidad: 0,
        kgBrutoUnidad: 0,
        precioPorCaja: 0,
        total: 0,
      },
    ],
    totales: {
      cantidadTotal: 0,
      valorTotal: 0,
      valorTotalTexto: '',
    },
    clientePlantilla: registro.shipper === 'ALMAFRUIT' ? 'ALMAFRUIT' : 'ALMAFRUIT', // Por ahora solo ALMA
  };
}

// Función para convertir número a palabras (en inglés, como en la factura)
function numberToWords(num: number): string {
  // Implementación simplificada - se puede mejorar
  const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];
  const teens = ['TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
  const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
  const scales = ['', 'THOUSAND', 'MILLION'];

  if (num === 0) return 'ZERO';

  // Asegurar que num es un número válido
  if (isNaN(num) || !isFinite(num)) {
    return 'ZERO US Dollar';
  }
  
  // Separar parte entera y decimal - usar Math.abs para evitar problemas de precisión
  const integerPart = Math.floor(Math.abs(num));
  const rawDecimal = Math.abs(num) - integerPart;
  // Redondear a 2 decimales y luego multiplicar por 100 para evitar problemas de precisión
  const decimalPart = Math.round(Math.round(rawDecimal * 10000) / 100);

  const parts = [];
  let workingNum = integerPart;

  // Simple implementation for up to millions
  if (workingNum >= 1000000) {
    const millions = Math.floor(workingNum / 1000000);
    parts.push(convertHundreds(millions) + ' MILLION');
    workingNum %= 1000000;
  }

  if (workingNum >= 1000) {
    const thousands = Math.floor(workingNum / 1000);
    parts.push(convertHundreds(thousands) + ' THOUSAND');
    workingNum %= 1000;
  }

  if (workingNum > 0) {
    parts.push(convertHundreds(workingNum));
  }

  // Filtrar partes vacías antes de unir
  const validParts = parts.filter(p => p && p.trim() !== '');
  let result = validParts.length > 0 ? validParts.join(' ') + ' US Dollar' : 'ZERO US Dollar';
  
  // Agregar centavos si hay decimales
  if (decimalPart > 0) {
    const cents = convertHundreds(decimalPart);
    if (cents && cents.trim() !== '') {
      result += ' AND ' + cents + ' Cent';
      if (decimalPart > 1) {
        result += 's';
      }
    }
  }

  return result;

  function convertHundreds(num: number): string {
    if (!num || num === 0 || isNaN(num)) return '';
    
    if (num < 10) {
      const result = ones[num];
      return (result && result.trim() !== '') ? result : '';
    }
    if (num < 20) {
      const index = num - 10;
      const result = teens[index];
      return (result && result.trim() !== '') ? result : '';
    }
    if (num < 100) {
      const tensDigit = Math.floor(num / 10);
      const onesDigit = num % 10;
      const tensStr = (tens[tensDigit] && tens[tensDigit].trim() !== '') ? tens[tensDigit] : '';
      const onesStr = (onesDigit > 0 && ones[onesDigit] && ones[onesDigit].trim() !== '') ? ones[onesDigit] : '';
      if (!tensStr && !onesStr) return '';
      return tensStr + (onesStr ? ' ' + onesStr : '').trim();
    }
    
    const hundreds = Math.floor(num / 100);
    const remainder = num % 100;
    const hundredsStr = (ones[hundreds] && ones[hundreds].trim() !== '') ? ones[hundreds] : '';
    if (!hundredsStr) return '';
    
    const remainderStr = remainder > 0 ? convertHundreds(remainder) : '';
    return hundredsStr + ' HUNDRED' + (remainderStr && remainderStr.trim() !== '' ? ' ' + remainderStr : '');
  }
}

