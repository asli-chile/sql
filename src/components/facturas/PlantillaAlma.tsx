'use client';

import React from 'react';
import { Factura } from '@/types/factura';

interface PlantillaAlmaProps {
  factura: Factura;
}

export function PlantillaAlma({ factura }: PlantillaAlmaProps) {
  // Formatear fecha como "December/09/2024"
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const month = months[date.getMonth()];
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  // Formatear número con comas y punto decimal (ej: 98.603,20)
  const formatNumber = (num: number) => {
    return num.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Formatear fecha como "09-12-2024"
  const formatDateShort = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  return (
    <div className="w-full max-w-[8.5in] mx-auto bg-white p-8" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px' }}>
      {/* Header - Exportador a la izquierda, Invoice/RUT a la derecha */}
      <div className="flex justify-between items-start mb-6">
        {/* Exportador Info - Centrado */}
        <div className="flex-1 text-center">
          <div className="text-base font-bold uppercase mb-1" style={{ fontSize: '14px', fontWeight: 'bold' }}>
            {factura.exportador.nombre}
          </div>
          {factura.exportador.giro && (
            <div className="text-xs mb-1" style={{ fontSize: '11px' }}>
              {factura.exportador.giro}
            </div>
          )}
          {factura.exportador.direccion && (
            <div className="text-xs whitespace-pre-line" style={{ fontSize: '11px', whiteSpace: 'pre-line' }}>
              {factura.exportador.direccion}
            </div>
          )}
        </div>

        {/* Invoice Info - Cajas a la derecha */}
        <div className="text-right ml-4">
          <div className="border border-black px-3 py-2 mb-2 inline-block" style={{ borderWidth: '1px' }}>
            {factura.exportador.rut && (
              <div className="text-xs mb-1" style={{ fontSize: '10px' }}>R.U.T {factura.exportador.rut}</div>
            )}
            <div className="text-xs mb-1" style={{ fontSize: '10px' }}>INVOICE</div>
            <div className="text-sm font-bold" style={{ fontSize: '12px', fontWeight: 'bold' }}>
              N° {factura.embarque.numeroInvoice}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ fontSize: '10px' }}>FECHA:</span>
            <div className="border border-black px-3 py-1 inline-block" style={{ borderWidth: '1px' }}>
              <span className="text-xs" style={{ fontSize: '10px' }}>
                {formatDate(factura.embarque.fechaFactura)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs" style={{ fontSize: '10px' }}>EMBARQUE N°</span>
            <div className="border border-black px-3 py-1 inline-block" style={{ borderWidth: '1px' }}>
              <span className="text-xs" style={{ fontSize: '10px' }}>
                {factura.embarque.numeroEmbarque}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Consignatario */}
      <div className="mb-4">
        <div className="text-xs font-bold mb-2" style={{ fontSize: '11px', fontWeight: 'bold' }}>CONSIGNEE:</div>
        <div className="text-xs" style={{ fontSize: '11px' }}>
          <div className="font-bold mb-1" style={{ fontWeight: 'bold' }}>{factura.consignatario.nombre}</div>
          {factura.consignatario.direccion && (
            <div className="mb-1 whitespace-pre-line" style={{ whiteSpace: 'pre-line' }}>
              Address: {factura.consignatario.direccion}
            </div>
          )}
          {(factura.consignatario.email || factura.consignatario.telefono) && (
            <div className="mb-1">
              {factura.consignatario.email && <>Email: {factura.consignatario.email}</>}
              {factura.consignatario.email && factura.consignatario.telefono && ' '}
              {factura.consignatario.telefono && <>TEL: {factura.consignatario.telefono}</>}
            </div>
          )}
          {factura.consignatario.usci && (
            <div className="mb-1">USCI: {factura.consignatario.usci}</div>
          )}
          <div>{factura.consignatario.pais}</div>
        </div>
        {/* CSP y CSG */}
        <div className="mt-2 flex gap-4">
          {factura.embarque.csp && (
            <span className="text-xs font-bold" style={{ fontSize: '11px', fontWeight: 'bold' }}>CSP {factura.embarque.csp}</span>
          )}
          {factura.embarque.csg && (
            <span className="text-xs font-bold" style={{ fontSize: '11px', fontWeight: 'bold' }}>CSG {factura.embarque.csg}</span>
          )}
        </div>
      </div>

      {/* Shipping Details Table - Con headers en español e inglés */}
      <div className="mb-4">
        <table className="w-full border-collapse" style={{ border: '1px solid black', fontSize: '10px' }}>
          <thead>
            {/* Primera fila: Headers en español */}
            <tr>
              <th className="border border-black px-2 py-1 font-bold" style={{ borderWidth: '1px', fontWeight: 'bold' }}>
                FECHA EMBARQUE
              </th>
              <th className="border border-black px-2 py-1 font-bold" style={{ borderWidth: '1px', fontWeight: 'bold' }}>
                MOTONAVE
              </th>
              <th className="border border-black px-2 py-1 font-bold" style={{ borderWidth: '1px', fontWeight: 'bold' }}>
                N° VIAJE
              </th>
              <th className="border border-black px-2 py-1 font-bold" style={{ borderWidth: '1px', fontWeight: 'bold' }}>
                MODALIDAD DE VENTA
              </th>
              <th className="border border-black px-2 py-1 font-bold" style={{ borderWidth: '1px', fontWeight: 'bold' }}>
                CLÁUSULA DE VENTA
              </th>
            </tr>
            {/* Segunda fila: Headers en inglés (fuente más chica) */}
            <tr>
              <th className="border border-black px-2 py-1" style={{ borderWidth: '1px', fontSize: '8px' }}>
                (Departure Date)
              </th>
              <th className="border border-black px-2 py-1" style={{ borderWidth: '1px', fontSize: '8px' }}>
                (Vessel)
              </th>
              <th className="border border-black px-2 py-1" style={{ borderWidth: '1px', fontSize: '8px' }}>
                (Travel Number)
              </th>
              <th className="border border-black px-2 py-1" style={{ borderWidth: '1px', fontSize: '8px' }}>
                (Terms of Sale)
              </th>
              <th className="border border-black px-2 py-1" style={{ borderWidth: '1px', fontSize: '8px' }}>
                (Clause of Sale)
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Tercera fila: Valores */}
            <tr>
              <td className="border border-black px-2 py-1" style={{ borderWidth: '1px' }}>
                {formatDateShort(factura.embarque.fechaEmbarque)}
              </td>
              <td className="border border-black px-2 py-1" style={{ borderWidth: '1px' }}>
                {factura.embarque.motonave || '-'}
              </td>
              <td className="border border-black px-2 py-1" style={{ borderWidth: '1px' }}>
                {factura.embarque.numeroViaje || '-'}
              </td>
              <td className="border border-black px-2 py-1" style={{ borderWidth: '1px' }}>
                {factura.embarque.modalidadVenta || 'BAJO CONDICION'}
              </td>
              <td className="border border-black px-2 py-1" style={{ borderWidth: '1px' }}>
                {factura.embarque.clausulaVenta}
              </td>
            </tr>
            {/* Segunda fila de campos */}
            <tr>
              <th className="border border-black px-2 py-1 font-bold" style={{ borderWidth: '1px', fontWeight: 'bold' }}>
                PAIS ORIGEN
                <div className="text-xs font-normal" style={{ fontSize: '8px', fontWeight: 'normal' }}>(Country of Origin)</div>
              </th>
              <th className="border border-black px-2 py-1 font-bold" style={{ borderWidth: '1px', fontWeight: 'bold' }}>
                PTO EMBARQUE
                <div className="text-xs font-normal" style={{ fontSize: '8px', fontWeight: 'normal' }}>(Loading Port)</div>
              </th>
              <th className="border border-black px-2 py-1 font-bold" style={{ borderWidth: '1px', fontWeight: 'bold' }}>
                PTO DESTINO
                <div className="text-xs font-normal" style={{ fontSize: '8px', fontWeight: 'normal' }}>(Destination Port)</div>
              </th>
              <th className="border border-black px-2 py-1 font-bold" style={{ borderWidth: '1px', fontWeight: 'bold' }}>
                PAIS DESTINO FINAL
                <div className="text-xs font-normal" style={{ fontSize: '8px', fontWeight: 'normal' }}>(Country of Destination)</div>
              </th>
              <th className="border border-black px-2 py-1 font-bold" style={{ borderWidth: '1px', fontWeight: 'bold' }}>
                FORMA DE PAGO
                <div className="text-xs font-normal" style={{ fontSize: '8px', fontWeight: 'normal' }}>(Payment Terms)</div>
              </th>
            </tr>
            <tr>
              <td className="border border-black px-2 py-1" style={{ borderWidth: '1px' }}>
                {factura.embarque.paisOrigen}
              </td>
              <td className="border border-black px-2 py-1" style={{ borderWidth: '1px' }}>
                {factura.embarque.puertoEmbarque}
              </td>
              <td className="border border-black px-2 py-1" style={{ borderWidth: '1px' }}>
                {factura.embarque.puertoDestino}
              </td>
              <td className="border border-black px-2 py-1" style={{ borderWidth: '1px' }}>
                {factura.embarque.paisDestinoFinal}
              </td>
              <td className="border border-black px-2 py-1" style={{ borderWidth: '1px' }}>
                {factura.embarque.formaPago || ''}
              </td>
            </tr>
            {/* Tercera fila de campos */}
            <tr>
              <th className="border border-black px-2 py-1 font-bold" style={{ borderWidth: '1px', fontWeight: 'bold' }}>
                PESO NETO TOTAL
                <div className="text-xs font-normal" style={{ fontSize: '8px', fontWeight: 'normal' }}>(Total Net Weight)</div>
              </th>
              <th className="border border-black px-2 py-1 font-bold" style={{ borderWidth: '1px', fontWeight: 'bold' }}>
                PESO BRUTO TOTAL
                <div className="text-xs font-normal" style={{ fontSize: '8px', fontWeight: 'normal' }}>(Total Gross Weight)</div>
              </th>
              <th className="border border-black px-2 py-1 font-bold" colSpan={3} style={{ borderWidth: '1px', fontWeight: 'bold' }}>
                CONTENEDOR / AWB
                <div className="text-xs font-normal" style={{ fontSize: '8px', fontWeight: 'normal' }}>(Container / AWB)</div>
              </th>
            </tr>
            <tr>
              <td className="border border-black px-2 py-1" style={{ borderWidth: '1px' }}>
                {factura.embarque.pesoNetoTotal ? `${formatNumber(factura.embarque.pesoNetoTotal)} Kgs.` : ''}
              </td>
              <td className="border border-black px-2 py-1" style={{ borderWidth: '1px' }}>
                {factura.embarque.pesoBrutoTotal ? `${formatNumber(factura.embarque.pesoBrutoTotal)} Kgs.` : ''}
              </td>
              <td className="border border-black px-2 py-1" colSpan={3} style={{ borderWidth: '1px' }}>
                {factura.embarque.contenedor || ''}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Productos Table */}
      <div className="mb-4">
        <div className="text-center mb-2">
          <span className="text-xs font-bold" style={{ fontSize: '11px', fontWeight: 'bold' }}>ESPECIE</span>
          <div className="border border-black px-4 py-2 mt-1 inline-block" style={{ borderWidth: '1px' }}>
            <span className="text-xs font-bold" style={{ fontSize: '11px', fontWeight: 'bold' }}>
              {factura.productos[0]?.variedad || ''}
            </span>
          </div>
        </div>
        <table className="w-full border-collapse" style={{ border: '1px solid black', fontSize: '9px' }}>
          <thead>
            <tr>
              <th className="border border-black px-1 py-1 text-left font-bold" style={{ borderWidth: '1px', fontWeight: 'bold', fontSize: '9px' }}>
                CANTIDAD
                <div className="text-xs font-normal" style={{ fontSize: '8px', fontWeight: 'normal' }}>(Quantity)</div>
              </th>
              <th className="border border-black px-1 py-1 text-left font-bold" style={{ borderWidth: '1px', fontWeight: 'bold', fontSize: '9px' }}>
                TIPO ENVASE
                <div className="text-xs font-normal" style={{ fontSize: '8px', fontWeight: 'normal' }}>(Type of Package)</div>
              </th>
              <th className="border border-black px-1 py-1 text-left font-bold" style={{ borderWidth: '1px', fontWeight: 'bold', fontSize: '9px' }}>
                VARIEDAD
                <div className="text-xs font-normal" style={{ fontSize: '8px', fontWeight: 'normal' }}>(Variety)</div>
              </th>
              <th className="border border-black px-1 py-1 text-left font-bold" style={{ borderWidth: '1px', fontWeight: 'bold', fontSize: '9px' }}>
                CATEGORÍA
                <div className="text-xs font-normal" style={{ fontSize: '8px', fontWeight: 'normal' }}>(Category)</div>
              </th>
              <th className="border border-black px-1 py-1 text-left font-bold" style={{ borderWidth: '1px', fontWeight: 'bold', fontSize: '9px' }}>
                ETIQUETA
                <div className="text-xs font-normal" style={{ fontSize: '8px', fontWeight: 'normal' }}>(Label)</div>
              </th>
              <th className="border border-black px-1 py-1 text-left font-bold" style={{ borderWidth: '1px', fontWeight: 'bold', fontSize: '9px' }}>
                CALIBRE
                <div className="text-xs font-normal" style={{ fontSize: '8px', fontWeight: 'normal' }}>(Size)</div>
              </th>
              <th className="border border-black px-1 py-1 text-left font-bold" style={{ borderWidth: '1px', fontWeight: 'bold', fontSize: '9px' }}>
                KG NETO UNIDAD
                <div className="text-xs font-normal" style={{ fontSize: '8px', fontWeight: 'normal' }}>(Net Weight Per Unit)</div>
              </th>
              <th className="border border-black px-1 py-1 text-left font-bold" style={{ borderWidth: '1px', fontWeight: 'bold', fontSize: '9px' }}>
                PRECIO POR CAJA
                <div className="text-xs font-normal" style={{ fontSize: '8px', fontWeight: 'normal' }}>(Price per Box)</div>
              </th>
              <th className="border border-black px-1 py-1 text-left font-bold" style={{ borderWidth: '1px', fontWeight: 'bold', fontSize: '9px' }}>
                TOTAL
              </th>
            </tr>
          </thead>
          <tbody>
            {factura.productos.map((producto, index) => (
              <tr key={index}>
                <td className="border border-black px-1 py-1" style={{ borderWidth: '1px' }}>
                  {producto.cantidad.toLocaleString('es-ES')}
                </td>
                <td className="border border-black px-1 py-1" style={{ borderWidth: '1px' }}>
                  {producto.tipoEnvase}
                </td>
                <td className="border border-black px-1 py-1" style={{ borderWidth: '1px' }}>
                  {producto.variedad}
                </td>
                <td className="border border-black px-1 py-1" style={{ borderWidth: '1px' }}>
                  {producto.categoria}
                </td>
                <td className="border border-black px-1 py-1" style={{ borderWidth: '1px' }}>
                  {producto.etiqueta}
                </td>
                <td className="border border-black px-1 py-1" style={{ borderWidth: '1px' }}>
                  {producto.calibre}
                </td>
                <td className="border border-black px-1 py-1" style={{ borderWidth: '1px' }}>
                  {producto.kgNetoUnidad.toFixed(2).replace('.', ',')} Kgs.
                </td>
                <td className="border border-black px-1 py-1" style={{ borderWidth: '1px' }}>
                  US${producto.precioPorCaja.toFixed(2).replace('.', ',')}/box
                </td>
                <td className="border border-black px-1 py-1 text-right font-bold" style={{ borderWidth: '1px', fontWeight: 'bold' }}>
                  US${formatNumber(producto.total)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="border border-black px-1 py-1" style={{ borderWidth: '1px' }}>
                {factura.totales.cantidadTotal.toLocaleString('es-ES')}
              </td>
              <td className="border border-black px-1 py-1" colSpan={7} style={{ borderWidth: '1px' }}>
                <div className="text-center font-bold" style={{ fontWeight: 'bold' }}>TOTALES</div>
              </td>
              <td className="border border-black px-1 py-1 text-right font-bold" style={{ borderWidth: '1px', fontWeight: 'bold' }}>
                US${formatNumber(factura.totales.valorTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Payment Summary */}
      <div className="mb-4">
        <div className="text-xs" style={{ fontSize: '11px' }}>
          <div className="mb-1">
            <span className="font-bold" style={{ fontWeight: 'bold' }}>VALOR TOTAL A PAGAR:</span> (TOTAL VALUE:)
          </div>
          <div className="flex justify-between">
            <div className="flex-1">
              {factura.totales.valorTotalTexto}
            </div>
            <div className="font-bold" style={{ fontWeight: 'bold' }}>
              US${formatNumber(factura.totales.valorTotal)}
            </div>
          </div>
          {factura.embarque.formaPago && (
            <div className="mt-2">
              <span className="font-bold" style={{ fontWeight: 'bold' }}>PLAZO DE PAGO:</span> (PAYMENT TERMS:){' '}
              {factura.embarque.formaPago}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="text-right text-xs font-bold mt-6" style={{ fontSize: '11px', fontWeight: 'bold' }}>
        {factura.exportador.nombre}
      </div>
    </div>
  );
}
