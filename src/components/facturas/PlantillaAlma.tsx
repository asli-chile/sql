'use client';

import React from 'react';
import { Factura } from '@/types/factura';

interface PlantillaAlmaProps {
  factura: Factura;
}

export function PlantillaAlma({ factura }: PlantillaAlmaProps) {
  return (
    <div className="w-full max-w-[8.5in] mx-auto bg-white p-8 shadow-lg" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Header - Invoice Number and RUT */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex-1">
          {/* Exportador Info */}
          <div className="mb-4">
            <div className="text-lg font-bold uppercase">{factura.exportador.nombre}</div>
            {factura.exportador.giro && (
              <div className="text-sm text-gray-700">Giro: {factura.exportador.giro}</div>
            )}
            {factura.exportador.direccion && (
              <div className="text-sm text-gray-700">{factura.exportador.direccion}</div>
            )}
            {factura.refAsli && (
              <div className="text-sm text-gray-700 mt-1">
                <span className="font-semibold">REF ASLI:</span> {factura.refAsli}
              </div>
            )}
          </div>
        </div>
        <div className="text-right">
          {factura.exportador.rut && (
            <div className="text-sm mb-2">
              <span className="font-semibold">R.U.T:</span> {factura.exportador.rut}
            </div>
          )}
          <div className="text-lg font-bold">
            <span className="font-semibold">INVOICE N°:</span> {factura.embarque.numeroEmbarque}
          </div>
        </div>
      </div>

      {/* Consignatario */}
      <div className="mb-6">
        <div className="text-sm font-semibold mb-2">CONSIGNEE:</div>
        <div className="text-sm">
          <div className="font-semibold">{factura.consignatario.nombre}</div>
          {factura.consignatario.direccion && (
            <div className="text-gray-700">{factura.consignatario.direccion}</div>
          )}
          {(factura.consignatario.email || factura.consignatario.telefono) && (
            <div className="text-gray-700">
              {factura.consignatario.email || ''}
              {factura.consignatario.email && factura.consignatario.telefono ? ' / ' : ''}
              {factura.consignatario.telefono || ''}
            </div>
          )}
          {factura.consignatario.contacto && (
            <div className="text-gray-700">
              Contact Person: {factura.consignatario.contacto}
              {factura.consignatario.telefonoContacto && `, Telephone: ${factura.consignatario.telefonoContacto}`}
            </div>
          )}
          {factura.consignatario.usci && (
            <div className="text-gray-700">
              <span className="font-semibold">USCI:</span> {factura.consignatario.usci}
            </div>
          )}
          {factura.consignatario.codigoPostal && (
            <div className="text-gray-700">
              <span className="font-semibold">Postal Code:</span> {factura.consignatario.codigoPostal}
            </div>
          )}
          <div className="text-gray-700">
            <span className="font-semibold">Country:</span> {factura.consignatario.pais}
          </div>
        </div>
      </div>

      {/* Fecha y Embarque */}
      <div className="mb-6 flex justify-between">
        <div>
          <div className="text-sm">
            <span className="font-semibold">FECHA (Date):</span>{' '}
            {factura.embarque.fechaFactura
              ? new Date(factura.embarque.fechaFactura).toLocaleDateString('en-US', {
                  month: 'long',
                  day: '2-digit',
                  year: 'numeric',
                })
              : ''}
          </div>
          <div className="text-sm mt-1">
            <span className="font-semibold">EMBARQUE N° (Shipment Number):</span> {factura.embarque.numeroEmbarque}
          </div>
        </div>
      </div>

      {/* Shipping Details Table */}
      <div className="mb-6">
        <table className="w-full text-sm border-collapse table-fixed">
          <tbody>
            <tr>
              <td className="border border-gray-300 px-2 py-1 font-semibold w-1/4 bg-gray-100 text-gray-900">CSP:</td>
              <td className="border border-gray-300 px-2 py-1 w-1/4">{factura.embarque.csp || ''}</td>
              <td className="border border-gray-300 px-2 py-1 font-semibold w-1/4 bg-gray-100 text-gray-900">CSG:</td>
              <td className="border border-gray-300 px-2 py-1 w-1/4">{factura.embarque.csg || ''}</td>
            </tr>
            <tr>
              <td className="border border-gray-300 px-2 py-1 font-semibold w-1/4 bg-gray-100 text-gray-900">FECHA EMBARQUE (Departure Date):</td>
              <td className="border border-gray-300 px-2 py-1 w-1/4">
                {factura.embarque.fechaEmbarque
                  ? new Date(factura.embarque.fechaEmbarque).toLocaleDateString('es-CL', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })
                  : ''}
              </td>
              <td className="border border-gray-300 px-2 py-1 font-semibold w-1/4 bg-gray-100 text-gray-900">MOTONAVE (Vessel):</td>
              <td className="border border-gray-300 px-2 py-1 w-1/4">{factura.embarque.motonave || '-'}</td>
            </tr>
            <tr>
              <td className="border border-gray-300 px-2 py-1 font-semibold w-1/4 bg-gray-100 text-gray-900">N° VIAJE (Travel Number):</td>
              <td className="border border-gray-300 px-2 py-1 w-1/4">{factura.embarque.numeroViaje || '-'}</td>
              <td className="border border-gray-300 px-2 py-1 font-semibold w-1/4 bg-gray-100 text-gray-900">MODALIDAD DE VENTA (Terms of Sale):</td>
              <td className="border border-gray-300 px-2 py-1 w-1/4">{factura.embarque.modalidadVenta || 'BAJO CONDICION'}</td>
            </tr>
            <tr>
              <td className="border border-gray-300 px-2 py-1 font-semibold w-1/4 bg-gray-100 text-gray-900">CLÁUSULA DE VENTA (Clause of Sale):</td>
              <td className="border border-gray-300 px-2 py-1 w-1/4">{factura.embarque.clausulaVenta}</td>
              <td className="border border-gray-300 px-2 py-1 font-semibold w-1/4 bg-gray-100 text-gray-900">PAIS ORIGEN (Country of Origin):</td>
              <td className="border border-gray-300 px-2 py-1 w-1/4">{factura.embarque.paisOrigen}</td>
            </tr>
            <tr>
              <td className="border border-gray-300 px-2 py-1 font-semibold w-1/4 bg-gray-100 text-gray-900">PTO EMBARQUE (Loading Port):</td>
              <td className="border border-gray-300 px-2 py-1 w-1/4">{factura.embarque.puertoEmbarque}</td>
              <td className="border border-gray-300 px-2 py-1 font-semibold w-1/4 bg-gray-100 text-gray-900">PTO DESTINO (Destination Port):</td>
              <td className="border border-gray-300 px-2 py-1 w-1/4">{factura.embarque.puertoDestino}</td>
            </tr>
            <tr>
              <td className="border border-gray-300 px-2 py-1 font-semibold w-1/4 bg-gray-100 text-gray-900">PAIS DESTINO FINAL (Country of Destination):</td>
              <td className="border border-gray-300 px-2 py-1 w-1/4">{factura.embarque.paisDestinoFinal}</td>
              <td className="border border-gray-300 px-2 py-1 font-semibold w-1/4 bg-gray-100 text-gray-900">FORMA DE PAGO (Payment Terms):</td>
              <td className="border border-gray-300 px-2 py-1 w-1/4">{factura.embarque.formaPago}</td>
            </tr>
            <tr>
              <td className="border border-gray-300 px-2 py-1 font-semibold w-1/4 bg-gray-100 text-gray-900">PESO NETO TOTAL (Total Net Weight):</td>
              <td className="border border-gray-300 px-2 py-1 w-1/4">
                {factura.embarque.pesoNetoTotal ? `${factura.embarque.pesoNetoTotal.toLocaleString()} Kgs.` : ''}
              </td>
              <td className="border border-gray-300 px-2 py-1 font-semibold w-1/4 bg-gray-100 text-gray-900">PESO BRUTO TOTAL (Total Gross Weight):</td>
              <td className="border border-gray-300 px-2 py-1 w-1/4">
                {factura.embarque.pesoBrutoTotal ? `${factura.embarque.pesoBrutoTotal.toLocaleString()} Kgs.` : ''}
              </td>
            </tr>
            <tr>
              <td className="border border-gray-300 px-2 py-1 font-semibold w-1/4 bg-gray-100 text-gray-900">CONTENEDOR / AWB (Container / AWB):</td>
              <td className="border border-gray-300 px-2 py-1 col-span-3">{factura.embarque.contenedor || ''}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Productos Table */}
      <div className="mb-6">
        <div className="text-sm font-semibold mb-2">ESPECIE (Specie): {factura.productos[0]?.variedad || ''}</div>
        <table className="w-full text-xs border-collapse border border-gray-300">
          <thead>
            <tr style={{ backgroundColor: '#374151' }}>
              <th className="border border-gray-300 px-2 py-2 text-left font-bold text-white" style={{ backgroundColor: '#374151', color: '#ffffff' }}>CANTIDAD (Quantity)</th>
              <th className="border border-gray-300 px-2 py-2 text-left font-bold text-white" style={{ backgroundColor: '#374151', color: '#ffffff' }}>TIPO ENVASE (Type of Package)</th>
              <th className="border border-gray-300 px-2 py-2 text-left font-bold text-white" style={{ backgroundColor: '#374151', color: '#ffffff' }}>VARIEDAD (Variety)</th>
              <th className="border border-gray-300 px-2 py-2 text-left font-bold text-white" style={{ backgroundColor: '#374151', color: '#ffffff' }}>CATEGORÍA (Category)</th>
              <th className="border border-gray-300 px-2 py-2 text-left font-bold text-white" style={{ backgroundColor: '#374151', color: '#ffffff' }}>ETIQUETA (Label)</th>
              <th className="border border-gray-300 px-2 py-2 text-left font-bold text-white" style={{ backgroundColor: '#374151', color: '#ffffff' }}>CALIBRE (Size)</th>
              <th className="border border-gray-300 px-2 py-2 text-left font-bold text-white" style={{ backgroundColor: '#374151', color: '#ffffff' }}>KG NETO UNIDAD (Net Weight Per Unit)</th>
              <th className="border border-gray-300 px-2 py-2 text-left font-bold text-white" style={{ backgroundColor: '#374151', color: '#ffffff' }}>BRUTO UNID (Gross Weight Per Unit)</th>
              <th className="border border-gray-300 px-2 py-2 text-left font-bold text-white" style={{ backgroundColor: '#374151', color: '#ffffff' }}>PRECIO POR CAJA (Price per Box)</th>
              <th className="border border-gray-300 px-2 py-2 text-left font-bold text-white" style={{ backgroundColor: '#374151', color: '#ffffff' }}>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {factura.productos.map((producto, index) => (
              <tr key={index}>
                <td className="border border-gray-300 px-2 py-1">{producto.cantidad.toLocaleString()}</td>
                <td className="border border-gray-300 px-2 py-1">{producto.tipoEnvase}</td>
                <td className="border border-gray-300 px-2 py-1">{producto.variedad}</td>
                <td className="border border-gray-300 px-2 py-1">{producto.categoria}</td>
                <td className="border border-gray-300 px-2 py-1">{producto.etiqueta}</td>
                <td className="border border-gray-300 px-2 py-1">{producto.calibre}</td>
                <td className="border border-gray-300 px-2 py-1">{producto.kgNetoUnidad.toFixed(2)} Kgs.</td>
                <td className="border border-gray-300 px-2 py-1">{producto.kgBrutoUnidad.toFixed(2)} Kgs.</td>
                <td className="border border-gray-300 px-2 py-1">US${producto.precioPorCaja.toFixed(2)}/box</td>
                <td className="border border-gray-300 px-2 py-1 font-semibold">
                  US${producto.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-800 font-semibold" style={{ backgroundColor: '#1f2937' }}>
              <td className="border border-gray-300 px-2 py-2 text-white" colSpan={9}>
                TOTALES (Totals):
              </td>
              <td className="border border-gray-300 px-2 py-2 text-white">
                US${factura.totales.valorTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
            </tr>
            <tr className="bg-gray-100">
              <td className="border border-gray-300 px-2 py-1 font-semibold" colSpan={9}>
                Total Quantity:
              </td>
              <td className="border border-gray-300 px-2 py-1">{factura.totales.cantidadTotal.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Payment Summary */}
      <div className="mb-6">
        <div className="text-sm">
          <div className="mb-2">
            <span className="font-semibold">VALOR TOTAL A PAGAR (Total Value to Pay):</span>{' '}
            {factura.totales.valorTotalTexto}
          </div>
          {factura.embarque.formaPago && (
            <div>
              <span className="font-semibold">PLAZO DE PAGO (Payment Terms):</span> {factura.embarque.formaPago}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-sm font-semibold mt-8">
        {factura.exportador.nombre}
      </div>
    </div>
  );
}

