'use client';

import React from 'react';
import { Factura } from '@/types/factura';

interface PlantillaAlmaProps {
  factura: Factura;
}

export function PlantillaAlma({ factura }: PlantillaAlmaProps) {
  // Función para transformar variedad según especie
  const transformVariety = (variedad: string): string => {
    const mapping: Record<string, string> = {
      'CEREZA': 'FRESH CHERRIES',
      'Cereza': 'FRESH CHERRIES',
      'cereza': 'FRESH CHERRIES',
    };
    return mapping[variedad] || variedad;
  };

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
          <div className="text-base font-bold uppercase mb-1" style={{ fontSize: '12pt', fontWeight: 'bold' }}>
            {factura.exportador.nombre}
          </div>
          {factura.exportador.giro && (
            <div className="text-xs mb-1" style={{ fontSize: '9pt' }}>
              {factura.exportador.giro}
            </div>
          )}
          {factura.exportador.direccion && (
            <div className="text-xs whitespace-pre-line" style={{ fontSize: '9pt', whiteSpace: 'pre-line' }}>
              {factura.exportador.direccion}
            </div>
          )}
        </div>

        {/* Invoice Info - Cajas a la derecha */}
        <div className="ml-4">
          <div className="border border-black px-3 py-2 mb-2" style={{ borderWidth: '1px', minWidth: '200px' }}>
            {factura.exportador.rut && (
              <div className="text-xs mb-1 text-left" style={{ fontSize: '8pt', textAlign: 'left' }}>R.U.T {factura.exportador.rut}</div>
            )}
            <div className="text-xs mb-1 text-left" style={{ fontSize: '8pt', textAlign: 'left' }}>INVOICE</div>
            <div className="text-sm font-bold text-left" style={{ fontSize: '10pt', fontWeight: 'bold', textAlign: 'left' }}>
              N° {factura.embarque.numeroInvoice}
            </div>
          </div>
        </div>
      </div>

      {/* FECHA y EMBARQUE N° - Alineados a la derecha */}
      <div className="mb-4">
        <div className="w-full">
          <div className="flex items-center justify-end gap-4 mb-3">
            <span className="text-xs" style={{ fontSize: '8pt' }}>FECHA:</span>
            <div className="border border-black px-3 py-1 inline-block" style={{ borderWidth: '1px' }}>
              <span className="text-xs" style={{ fontSize: '8pt' }}>
                {formatDate(factura.embarque.fechaFactura)}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-end gap-4">
            <span className="text-xs" style={{ fontSize: '8pt' }}>EMBARQUE N°</span>
            <div className="border border-black px-3 py-1 inline-block" style={{ borderWidth: '1px' }}>
              <span className="text-xs" style={{ fontSize: '8pt' }}>
                {factura.embarque.numeroEmbarque}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Consignatario */}
      <div className="mb-4">
        <div className="text-xs font-bold mb-2" style={{ fontSize: '9pt', fontWeight: 'bold' }}>CONSIGNEE:</div>
        <div className="text-xs" style={{ fontSize: '8pt' }}>
          <div className="font-bold mb-1" style={{ fontSize: '8pt', fontWeight: 'bold' }}>{factura.consignatario.nombre}</div>
          {factura.consignatario.direccion && (
            <div className="mb-1 whitespace-pre-line" style={{ fontSize: '8pt', whiteSpace: 'pre-line' }}>
              Address: {factura.consignatario.direccion}
            </div>
          )}
          {(factura.consignatario.email || factura.consignatario.telefono) && (
            <div className="mb-1" style={{ fontSize: '8pt' }}>
              {factura.consignatario.email && <>Email: {factura.consignatario.email}</>}
              {factura.consignatario.email && factura.consignatario.telefono && ' '}
              {factura.consignatario.telefono && <>TEL: {factura.consignatario.telefono}</>}
            </div>
          )}
          {factura.consignatario.usci && (
            <div className="mb-1" style={{ fontSize: '8pt' }}>USCI: {factura.consignatario.usci}</div>
          )}
          <div style={{ fontSize: '8pt' }}>{factura.consignatario.pais}</div>
        </div>
      </div>

      {/* CSP y CSG - Ahora están arriba de la tabla */}
      {(factura.embarque.csp || factura.embarque.csg) && (
        <div className="mb-2 flex gap-4">
          {factura.embarque.csp && (
            <span className="text-xs font-bold" style={{ fontSize: '9pt', fontWeight: 'bold' }}>CSP {factura.embarque.csp}</span>
          )}
          {factura.embarque.csg && (
            <span className="text-xs font-bold" style={{ fontSize: '9pt', fontWeight: 'bold' }}>CSG {factura.embarque.csg}</span>
          )}
        </div>
      )}

      {/* Shipping Details Table - Con headers en español e inglés */}
      <div className="mb-4">
        <table className="w-full border-collapse" style={{ border: '1px solid black', fontSize: '7pt' }}>
          <thead>
            <tr>
              <th className="border border-black px-1 py-1 font-bold text-center" style={{ borderWidth: '1px', fontWeight: 'bold', fontSize: '7pt', textAlign: 'center' }}>
                FECHA EMBARQUE
              </th>
              <th className="border border-black px-1 py-1 font-bold text-center" style={{ borderWidth: '1px', fontWeight: 'bold', fontSize: '7pt', textAlign: 'center' }}>
                MOTONAVE
              </th>
              <th className="border border-black px-1 py-1 font-bold text-center" style={{ borderWidth: '1px', fontWeight: 'bold', fontSize: '7pt', textAlign: 'center' }}>
                N° VIAJE
              </th>
              <th className="border border-black px-1 py-1 font-bold text-center" style={{ borderWidth: '1px', fontWeight: 'bold', fontSize: '7pt', textAlign: 'center' }}>
                MODALIDAD DE VENTA
              </th>
              <th className="border border-black px-1 py-1 font-bold text-center" style={{ borderWidth: '1px', fontWeight: 'bold', fontSize: '7pt', textAlign: 'center' }}>
                CLÁUSULA DE VENTA
              </th>
            </tr>
            <tr>
              <th className="border border-black px-1 py-1 font-normal text-center" style={{ borderWidth: '1px', fontWeight: 'normal', fontSize: '6pt', textAlign: 'center' }}>
                Departure Date
              </th>
              <th className="border border-black px-1 py-1 font-normal text-center" style={{ borderWidth: '1px', fontWeight: 'normal', fontSize: '6pt', textAlign: 'center' }}>
                Vessel
              </th>
              <th className="border border-black px-1 py-1 font-normal text-center" style={{ borderWidth: '1px', fontWeight: 'normal', fontSize: '6pt', textAlign: 'center' }}>
                Travel Number
              </th>
              <th className="border border-black px-1 py-1 font-normal text-center" style={{ borderWidth: '1px', fontWeight: 'normal', fontSize: '6pt', textAlign: 'center' }}>
                Terms of Sale
              </th>
              <th className="border border-black px-1 py-1 font-normal text-center" style={{ borderWidth: '1px', fontWeight: 'normal', fontSize: '6pt', textAlign: 'center' }}>
                Clause of Sale
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-black px-1 py-1 text-center" style={{ borderWidth: '1px', textAlign: 'center', fontSize: '7pt' }}>
                {formatDateShort(factura.embarque.fechaEmbarque)}
              </td>
              <td className="border border-black px-1 py-1 text-center" style={{ borderWidth: '1px', textAlign: 'center', fontSize: '7pt' }}>
                {factura.embarque.motonave || '-'}
              </td>
              <td className="border border-black px-1 py-1 text-center" style={{ borderWidth: '1px', textAlign: 'center', fontSize: '7pt' }}>
                {factura.embarque.numeroViaje || '-'}
              </td>
              <td className="border border-black px-1 py-1 text-center" style={{ borderWidth: '1px', textAlign: 'center', fontSize: '7pt' }}>
                {factura.embarque.modalidadVenta || 'BAJO CONDICION'}
              </td>
              <td className="border border-black px-1 py-1 text-center" style={{ borderWidth: '1px', textAlign: 'center', fontSize: '7pt' }}>
                {factura.embarque.clausulaVenta}
              </td>
            </tr>
            <tr>
              <th className="border border-black px-1 py-1 font-bold text-center" style={{ borderWidth: '1px', fontWeight: 'bold', fontSize: '7pt', textAlign: 'center' }}>
                PAIS ORIGEN
              </th>
              <th className="border border-black px-1 py-1 font-bold text-center" style={{ borderWidth: '1px', fontWeight: 'bold', fontSize: '7pt', textAlign: 'center' }}>
                PTO EMBARQUE
              </th>
              <th className="border border-black px-1 py-1 font-bold text-center" style={{ borderWidth: '1px', fontWeight: 'bold', fontSize: '7pt', textAlign: 'center' }}>
                PTO DESTINO
              </th>
              <th className="border border-black px-1 py-1 font-bold text-center" style={{ borderWidth: '1px', fontWeight: 'bold', fontSize: '7pt', textAlign: 'center' }}>
                PAIS DESTINO FINAL
              </th>
              <th className="border border-black px-1 py-1 font-bold text-center" style={{ borderWidth: '1px', fontWeight: 'bold', fontSize: '7pt', textAlign: 'center' }}>
                FORMA DE PAGO
              </th>
            </tr>
            <tr>
              <th className="border border-black px-1 py-1 font-normal text-center" style={{ borderWidth: '1px', fontWeight: 'normal', fontSize: '6pt', textAlign: 'center' }}>
                Country of Origin
              </th>
              <th className="border border-black px-1 py-1 font-normal text-center" style={{ borderWidth: '1px', fontWeight: 'normal', fontSize: '6pt', textAlign: 'center' }}>
                Loading Port
              </th>
              <th className="border border-black px-1 py-1 font-normal text-center" style={{ borderWidth: '1px', fontWeight: 'normal', fontSize: '6pt', textAlign: 'center' }}>
                Destination Port
              </th>
              <th className="border border-black px-1 py-1 font-normal text-center" style={{ borderWidth: '1px', fontWeight: 'normal', fontSize: '6pt', textAlign: 'center' }}>
                Country of Destination
              </th>
              <th className="border border-black px-1 py-1 font-normal text-center" style={{ borderWidth: '1px', fontWeight: 'normal', fontSize: '6pt', textAlign: 'center' }}>
                Payment Terms
              </th>
            </tr>
            <tr>
              <td className="border border-black px-1 py-1 text-center" style={{ borderWidth: '1px', textAlign: 'center', fontSize: '7pt' }}>
                {factura.embarque.paisOrigen}
              </td>
              <td className="border border-black px-1 py-1 text-center" style={{ borderWidth: '1px', textAlign: 'center', fontSize: '7pt' }}>
                {factura.embarque.puertoEmbarque}
              </td>
              <td className="border border-black px-1 py-1 text-center" style={{ borderWidth: '1px', textAlign: 'center', fontSize: '7pt' }}>
                {factura.embarque.puertoDestino}
              </td>
              <td className="border border-black px-1 py-1 text-center" style={{ borderWidth: '1px', textAlign: 'center', fontSize: '7pt' }}>
                {factura.embarque.paisDestinoFinal}
              </td>
              <td className="border border-black px-1 py-1 text-center" style={{ borderWidth: '1px', textAlign: 'center', fontSize: '7pt' }}>
                {factura.embarque.formaPago || ''}
              </td>
            </tr>
            <tr>
              <th className="border border-black px-1 py-1 font-bold text-center" style={{ borderWidth: '1px', fontWeight: 'bold', fontSize: '7pt', textAlign: 'center' }}>
                PESO NETO TOTAL
              </th>
              <th className="border border-black px-1 py-1 font-bold text-center" style={{ borderWidth: '1px', fontWeight: 'bold', fontSize: '7pt', textAlign: 'center' }}>
                PESO BRUTO TOTAL
              </th>
              <th className="border border-black px-1 py-1 font-bold text-center" colSpan={3} style={{ borderWidth: '1px', fontWeight: 'bold', fontSize: '7pt', textAlign: 'center' }}>
                CONTENEDOR / AWB
              </th>
            </tr>
            <tr>
              <th className="border border-black px-1 py-1 font-normal text-center" style={{ borderWidth: '1px', fontWeight: 'normal', fontSize: '6pt', textAlign: 'center' }}>
                Total Net Weight
              </th>
              <th className="border border-black px-1 py-1 font-normal text-center" style={{ borderWidth: '1px', fontWeight: 'normal', fontSize: '6pt', textAlign: 'center' }}>
                Total Gross Weight
              </th>
              <th className="border border-black px-1 py-1 font-normal text-center" colSpan={3} style={{ borderWidth: '1px', fontWeight: 'normal', fontSize: '6pt', textAlign: 'center' }}>
                Container / AWB
              </th>
            </tr>
            <tr>
              <td className="border border-black px-1 py-1 text-center" style={{ borderWidth: '1px', textAlign: 'center', fontSize: '7pt' }}>
                {factura.embarque.pesoNetoTotal ? `${formatNumber(factura.embarque.pesoNetoTotal)} Kgs.` : ''}
              </td>
              <td className="border border-black px-1 py-1 text-center" style={{ borderWidth: '1px', textAlign: 'center', fontSize: '7pt' }}>
                {factura.embarque.pesoBrutoTotal ? `${formatNumber(factura.embarque.pesoBrutoTotal)} Kgs.` : ''}
              </td>
              <td className="border border-black px-1 py-1 text-center" colSpan={3} style={{ borderWidth: '1px', textAlign: 'center', fontSize: '7pt' }}>
                {factura.embarque.contenedor || ''}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Productos Table */}
      <div className="mb-4">
        <table className="w-full border-collapse" style={{ border: '1px solid black', fontSize: '6pt' }}>
          <thead>
            <tr>
              <th className="border border-black px-1 py-1 font-bold text-center" style={{ borderWidth: '1px', fontWeight: 'bold', fontSize: '8pt' }}>
                ESPECIE
                <div className="text-xs font-normal" style={{ fontSize: '6pt', fontWeight: 'normal' }}>(Specie)</div>
              </th>
              <th className="border border-black px-1 py-1 font-bold text-center" colSpan={8} style={{ borderWidth: '1px', fontWeight: 'bold', fontSize: '8pt', textAlign: 'center' }}>
                {transformVariety(factura.productos[0]?.especie || '')}
              </th>
            </tr>
            <tr>
              <th className="border border-black px-1 py-1 font-bold text-center" style={{ borderWidth: '1px', fontWeight: 'bold', fontSize: '6pt', textAlign: 'center' }}>
                CANTIDAD
              </th>
              <th className="border border-black px-1 py-1 font-bold text-center" style={{ borderWidth: '1px', fontWeight: 'bold', fontSize: '6pt', textAlign: 'center' }}>
                TIPO ENVASE
              </th>
              <th className="border border-black px-1 py-1 font-bold text-center" style={{ borderWidth: '1px', fontWeight: 'bold', fontSize: '6pt', textAlign: 'center' }}>
                VARIEDAD
              </th>
              <th className="border border-black px-1 py-1 font-bold text-center" style={{ borderWidth: '1px', fontWeight: 'bold', fontSize: '6pt', textAlign: 'center' }}>
                CATEGORÍA
              </th>
              <th className="border border-black px-1 py-1 font-bold text-center break-words" style={{ borderWidth: '1px', fontWeight: 'bold', fontSize: '6pt', textAlign: 'center', wordBreak: 'break-word' }}>
                ETIQUETA
              </th>
              <th className="border border-black px-1 py-1 font-bold text-center" style={{ borderWidth: '1px', fontWeight: 'bold', fontSize: '6pt', textAlign: 'center' }}>
                CALIBRE
              </th>
              <th className="border border-black px-1 py-1 font-bold text-center" style={{ borderWidth: '1px', fontWeight: 'bold', fontSize: '6pt', textAlign: 'center' }}>
                KG NETO UNIDAD
              </th>
              <th className="border border-black px-1 py-1 font-bold text-center" style={{ borderWidth: '1px', fontWeight: 'bold', fontSize: '6pt', textAlign: 'center' }}>
                PRECIO POR CAJA
              </th>
              <th className="border border-black px-1 py-1 font-bold text-center" style={{ borderWidth: '1px', fontWeight: 'bold', fontSize: '6pt', textAlign: 'center' }}>
                TOTAL
              </th>
            </tr>
            <tr>
              <th className="border border-black px-1 py-1 font-normal text-center" style={{ borderWidth: '1px', fontWeight: 'normal', fontSize: '6pt', textAlign: 'center' }}>
                Quantity
              </th>
              <th className="border border-black px-1 py-1 font-normal text-center" style={{ borderWidth: '1px', fontWeight: 'normal', fontSize: '6pt', textAlign: 'center' }}>
                Type of Package
              </th>
              <th className="border border-black px-1 py-1 font-normal text-center" style={{ borderWidth: '1px', fontWeight: 'normal', fontSize: '6pt', textAlign: 'center' }}>
                Variety
              </th>
              <th className="border border-black px-1 py-1 font-normal text-center" style={{ borderWidth: '1px', fontWeight: 'normal', fontSize: '6pt', textAlign: 'center' }}>
                Category
              </th>
              <th className="border border-black px-1 py-1 font-normal text-center break-words" style={{ borderWidth: '1px', fontWeight: 'normal', fontSize: '6pt', textAlign: 'center', wordBreak: 'break-word' }}>
                Label
              </th>
              <th className="border border-black px-1 py-1 font-normal text-center" style={{ borderWidth: '1px', fontWeight: 'normal', fontSize: '6pt', textAlign: 'center' }}>
                Size
              </th>
              <th className="border border-black px-1 py-1 font-normal text-center" style={{ borderWidth: '1px', fontWeight: 'normal', fontSize: '6pt', textAlign: 'center' }}>
                Net Weight Per Unit
              </th>
              <th className="border border-black px-1 py-1 font-normal text-center" style={{ borderWidth: '1px', fontWeight: 'normal', fontSize: '6pt', textAlign: 'center' }}>
                Price per Box
              </th>
              <th className="border border-black px-1 py-1 font-normal text-center" style={{ borderWidth: '1px', fontWeight: 'normal', fontSize: '6pt', textAlign: 'center' }}>
                Total Value
              </th>
            </tr>
          </thead>
          <tbody>
            {factura.productos.map((producto, index) => (
              <tr key={index}>
                <td className="border border-black px-1 py-1 text-center" style={{ borderWidth: '1px', textAlign: 'center', fontSize: '6pt' }}>
                  {producto.cantidad.toLocaleString('es-ES')}
                </td>
                <td className="border border-black px-1 py-1 text-center" style={{ borderWidth: '1px', textAlign: 'center', fontSize: '6pt' }}>
                  {producto.tipoEnvase}
                </td>
                <td className="border border-black px-1 py-1 text-center" style={{ borderWidth: '1px', textAlign: 'center', fontSize: '6pt' }}>
                  {transformVariety(producto.variedad)}
                </td>
                <td className="border border-black px-1 py-1 text-center" style={{ borderWidth: '1px', textAlign: 'center', fontSize: '6pt' }}>
                  {producto.categoria}
                </td>
                <td className="border border-black px-1 py-1 text-center break-words" style={{ borderWidth: '1px', textAlign: 'center', wordBreak: 'break-word', fontSize: '6pt' }}>
                  {producto.etiqueta}
                </td>
                <td className="border border-black px-1 py-1 text-center" style={{ borderWidth: '1px', textAlign: 'center', fontSize: '6pt' }}>
                  {producto.calibre}
                </td>
                <td className="border border-black px-1 py-1 text-center" style={{ borderWidth: '1px', textAlign: 'center', fontSize: '6pt' }}>
                  {producto.kgNetoUnidad.toFixed(2).replace('.', ',')} Kgs.
                </td>
                <td className="border border-black px-1 py-1 text-center" style={{ borderWidth: '1px', textAlign: 'center', fontSize: '6pt' }}>
                  US${producto.precioPorCaja.toFixed(2).replace('.', ',')}/box
                </td>
                <td className="border border-black px-1 py-1 text-center font-bold whitespace-nowrap" style={{ borderWidth: '1px', fontWeight: 'bold', textAlign: 'center', fontSize: '6pt' }}>
                  <span>US${formatNumber(producto.total)}</span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="border border-black px-1 py-1 text-center" style={{ borderWidth: '1px', textAlign: 'center', fontSize: '6pt' }}>
                {factura.totales.cantidadTotal.toLocaleString('es-ES')}
              </td>
              <td className="border border-black px-1 py-1" colSpan={7} style={{ borderWidth: '1px' }}>
                <div className="text-center font-bold" style={{ fontWeight: 'bold', fontSize: '6pt', textAlign: 'center' }}>TOTALES</div>
              </td>
              <td className="border border-black px-1 py-1 text-center font-bold whitespace-nowrap" style={{ borderWidth: '1px', fontWeight: 'bold', textAlign: 'center', fontSize: '6pt' }}>
                <span>US${formatNumber(factura.totales.valorTotal)}</span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Payment Summary */}
      <div className="mb-4">
        <div className="text-xs" style={{ fontSize: '8pt' }}>
          <div className="mb-1">
            <span className="font-bold" style={{ fontSize: '8pt', fontWeight: 'bold' }}>VALOR TOTAL A PAGAR:</span> <span style={{ fontSize: '8pt' }}>(TOTAL VALUE:)</span>
          </div>
          <div className="flex justify-between">
            <div className="flex-1" style={{ fontSize: '8pt' }}>
              {factura.totales.valorTotalTexto}
            </div>
            <div className="font-bold" style={{ fontSize: '8pt', fontWeight: 'bold' }}>
              US${formatNumber(factura.totales.valorTotal)}
            </div>
          </div>
          {factura.embarque.formaPago && (
            <div className="mt-2" style={{ fontSize: '8pt' }}>
              <span className="font-bold" style={{ fontSize: '8pt', fontWeight: 'bold' }}>PLAZO DE PAGO:</span>{' '}
              <span style={{ fontSize: '8pt' }}>(PAYMENT TERMS:)</span>{' '}
              <span style={{ fontSize: '8pt' }}>{factura.embarque.formaPago}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs font-bold mt-6" style={{ fontSize: '9pt', fontWeight: 'bold', textAlign: 'center' }}>
        {factura.exportador.nombre}
      </div>
    </div>
  );
}
