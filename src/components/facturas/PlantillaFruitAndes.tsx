'use client';

import React from 'react';
import { Factura } from '@/types/factura';

interface PlantillaFruitAndesProps {
  factura: Factura;
}

export function PlantillaFruitAndes({ factura }: PlantillaFruitAndesProps) {
  // Funciones auxiliares
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="w-full max-w-[8.5in] mx-auto bg-white p-8 pb-16" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px' }}>
      {/* Logo y Company Name - Centrado */}
      <div className="flex items-center justify-center mb-4">
        <div className="text-center">
          <div className="text-lg font-bold mb-2" style={{ fontSize: '14pt', fontWeight: 'bold' }}>
            FRUIT ANDES SUR
          </div>
          <div className="text-base font-bold mb-1" style={{ fontSize: '12pt', fontWeight: 'bold' }}>
            {factura.exportador.nombre}
          </div>
        </div>
      </div>

      {/* Proforma de Exportacion Header */}
      <div className="mb-4">
        <div className="text-right">
          <div className="text-base font-bold" style={{ fontSize: '11pt', fontWeight: 'bold' }}>
            Proforma de Exportacion
          </div>
          <div className="text-sm" style={{ fontSize: '9pt' }}>
            NRO: {factura.embarque.numeroInvoice}
          </div>
        </div>
      </div>

      {/* Company Info */}
      <div className="mb-4" style={{ fontSize: '8pt' }}>
        {factura.exportador.direccion && (
          <div className="mb-1">{factura.exportador.direccion}</div>
        )}
        {factura.exportador.rut && (
          <div className="mb-1">RUT: {factura.exportador.rut}</div>
        )}
        <div>Email: {factura.exportador.email || 'patricioborlando@gmail.com'}</div>
      </div>

      {/* Consignee y Shipping Details - Dos columnas */}
      <div className="grid grid-cols-2 gap-8 mb-4" style={{ fontSize: '8pt' }}>
        {/* Consignee */}
        <div>
          <div className="font-bold mb-1" style={{ fontWeight: 'bold' }}>Consignee</div>
          <div className="mb-1" style={{ fontWeight: 'bold' }}>{factura.consignatario.nombre}</div>
          {factura.consignatario.direccion && (
            <>
              <div className="mb-1">Address</div>
              <div className="mb-1">{factura.consignatario.direccion}</div>
            </>
          )}
          {factura.consignatario.usci && (
            <div>USCI: {factura.consignatario.usci}</div>
          )}
        </div>

        {/* Shipping Details */}
        <div className="text-right">
          <div className="mb-2">
            <span className="font-bold" style={{ fontWeight: 'bold' }}>Fecha:</span> {formatDate(factura.embarque.fechaFactura)}
          </div>
          {factura.embarque.puertoEmbarque && (
            <div className="mb-2">
              <span className="font-bold" style={{ fontWeight: 'bold' }}>Puerto de Embarque:</span> {factura.embarque.puertoEmbarque}
            </div>
          )}
          {factura.embarque.contenedor && (
            <div className="mb-2">
              <span className="font-bold" style={{ fontWeight: 'bold' }}>Contenedor:</span> {factura.embarque.contenedor}
            </div>
          )}
          {factura.embarque.puertoDestino && (
            <div className="mb-2">
              <span className="font-bold" style={{ fontWeight: 'bold' }}>Puerto Destino:</span> {factura.embarque.puertoDestino}
            </div>
          )}
          {factura.embarque.motonave && (
            <div className="mb-2">
              <span className="font-bold" style={{ fontWeight: 'bold' }}>Nave:</span> {factura.embarque.motonave}
            </div>
          )}
          {factura.embarque.numeroViaje && (
            <div className="mb-2">
              <span className="font-bold" style={{ fontWeight: 'bold' }}>DUS:</span> {factura.embarque.numeroViaje}
            </div>
          )}
          <div className="mb-2">
            <span className="font-bold" style={{ fontWeight: 'bold' }}>Mod. Venta:</span> {factura.embarque.modalidadVenta || 'LIBRE CONSIGNACION'}
          </div>
          <div>
            <span className="font-bold" style={{ fontWeight: 'bold' }}>Clausula de venta:</span> {factura.embarque.clausulaVenta || 'CIF'}
          </div>
        </div>
      </div>

      {/* Productos Table */}
      <div className="mb-4">
        <table className="w-full border-collapse" style={{ border: '1px solid black', fontSize: '8pt' }}>
          <thead>
            <tr>
              <th className="border border-black px-2 py-1 font-bold text-center" style={{ borderWidth: '1px', fontWeight: 'bold', fontSize: '8pt' }}>
                VARIEDAD
              </th>
              <th className="border border-black px-2 py-1 font-bold text-center" colSpan={2} style={{ borderWidth: '1px', fontWeight: 'bold', fontSize: '8pt' }}>
                KG NETO / CAJA
              </th>
              <th className="border border-black px-2 py-1 font-bold text-center" style={{ borderWidth: '1px', fontWeight: 'bold', fontSize: '8pt' }}>
                MARK / LABEL
              </th>
              <th className="border border-black px-2 py-1 font-bold text-center" style={{ borderWidth: '1px', fontWeight: 'bold', fontSize: '8pt' }}>
                SIZE
              </th>
              <th className="border border-black px-2 py-1 font-bold text-center" style={{ borderWidth: '1px', fontWeight: 'bold', fontSize: '8pt' }}>
                N° CAJAS
              </th>
              <th className="border border-black px-2 py-1 font-bold text-center" style={{ borderWidth: '1px', fontWeight: 'bold', fontSize: '8pt' }}>
                KG NETO TOTAL
              </th>
              <th className="border border-black px-2 py-1 font-bold text-center" style={{ borderWidth: '1px', fontWeight: 'bold', fontSize: '8pt' }}>
                VALOR / CAJA
              </th>
              <th className="border border-black px-2 py-1 font-bold text-center" style={{ borderWidth: '1px', fontWeight: 'bold', fontSize: '8pt' }}>
                VALOR TOTAL
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-black px-2 py-1 text-center font-bold" colSpan={10} style={{ borderWidth: '1px', fontWeight: 'bold', fontSize: '9pt' }}>
                Fresh Cherries
              </td>
            </tr>
            {factura.productos.map((producto, index) => (
              <tr key={index}>
                <td className="border border-black px-2 py-1 text-center" style={{ borderWidth: '1px', fontSize: '8pt' }}>
                  {producto.variedad || '-'}
                </td>
                <td className="border border-black px-2 py-1 text-center" colSpan={2} style={{ borderWidth: '1px', fontSize: '8pt' }}>
                  {producto.kgNetoUnidad.toFixed(1).replace('.', ',')}
                </td>
                <td className="border border-black px-2 py-1 text-center" style={{ borderWidth: '1px', fontSize: '8pt' }}>
                  {producto.etiqueta || 'NO MARK'}
                </td>
                <td className="border border-black px-2 py-1 text-center" style={{ borderWidth: '1px', fontSize: '8pt' }}>
                  {producto.calibre || '-'}
                </td>
                <td className="border border-black px-2 py-1 text-right" style={{ borderWidth: '1px', fontSize: '8pt', textAlign: 'right' }}>
                  {producto.cantidad.toLocaleString('es-ES')}
                </td>
                <td className="border border-black px-2 py-1 text-right" style={{ borderWidth: '1px', fontSize: '8pt', textAlign: 'right' }}>
                  {(producto.cantidad * producto.kgNetoUnidad).toFixed(1).replace('.', ',')}
                </td>
                <td className="border border-black px-2 py-1 text-center" style={{ borderWidth: '1px', fontSize: '8pt' }}>
                  US$ {producto.precioPorCaja.toFixed(2).replace('.', ',')}
                </td>
                <td className="border border-black px-2 py-1 text-right" style={{ borderWidth: '1px', fontSize: '8pt', textAlign: 'right' }}>
                  US$ {producto.total.toFixed(2).replace('.', ',')}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="border border-black px-2 py-1 text-left font-bold" colSpan={2} style={{ borderWidth: '1px', fontWeight: 'bold', fontSize: '9pt' }}>
                NETO TOTAL (KG)
              </td>
              <td className="border border-black px-2 py-1" colSpan={4} style={{ borderWidth: '1px' }}></td>
              <td className="border border-black px-2 py-1 text-right font-bold" colSpan={2} style={{ borderWidth: '1px', fontWeight: 'bold', fontSize: '9pt', textAlign: 'right' }}>
                {factura.productos.reduce((sum, p) => sum + (p.cantidad * p.kgNetoUnidad), 0).toFixed(2).replace('.', ',')}
              </td>
              <td className="border border-black px-2 py-1" style={{ borderWidth: '1px' }}></td>
            </tr>
            <tr>
              <td className="border border-black px-2 py-1 text-left font-bold" style={{ borderWidth: '1px', fontWeight: 'bold', fontSize: '9pt' }}>
                CAJA TOTAL
              </td>
              <td className="border border-black px-2 py-1" colSpan={7} style={{ borderWidth: '1px' }}></td>
              <td className="border border-black px-2 py-1 text-right font-bold" style={{ borderWidth: '1px', fontWeight: 'bold', fontSize: '9pt', textAlign: 'right' }}>
                {factura.totales.cantidadTotal.toLocaleString('es-ES')}
              </td>
            </tr>
            <tr>
              <td className="border border-black px-2 py-1 text-left font-bold" style={{ borderWidth: '1px', fontWeight: 'bold', fontSize: '9pt' }}>
                CIF TOTAL (USD)
              </td>
              <td className="border border-black px-2 py-1" colSpan={7} style={{ borderWidth: '1px' }}></td>
              <td className="border border-black px-2 py-1 text-right font-bold" style={{ borderWidth: '1px', fontWeight: 'bold', fontSize: '9pt', textAlign: 'right' }}>
                {formatNumber(factura.totales.valorTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

