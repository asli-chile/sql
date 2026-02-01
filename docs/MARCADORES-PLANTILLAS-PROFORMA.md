# Marcadores para Plantillas de Factura Proforma

Este documento lista todos los marcadores disponibles para usar en plantillas Excel de facturas proforma.

## 🎯 **Formatos Soportados**

Puedes usar los marcadores en **DOS formatos diferentes**:
1. **Con llaves dobles**: `{{MARCADOR}}` ← Recomendado
2. **Con comillas**: `"MARCADOR"` ← Alternativo

**Ejemplos:**
- `{{EXPORTADOR_NOMBRE}}` o `"EXPORTADOR_NOMBRE"` ✅
- `{{CONSIGNEE_COMPANY}}` o `"CONSIGNEE_COMPANY"` ✅
- `{{PRODUCTO_CANTIDAD}}` o `"PRODUCTO_CANTIDAD"` ✅

**Ambos formatos funcionan exactamente igual**, elige el que prefieras para tu plantilla.

---

## 📋 Marcadores Básicos

### Información del Exportador/Shipper
- `{{EXPORTADOR_NOMBRE}}` - Nombre del exportador
- `{{EXPORTADOR_RUT}}` - RUT del exportador
- `{{EXPORTADOR_GIRO}}` - Giro comercial
- `{{EXPORTADOR_DIRECCION}}` - Dirección completa
- `{{EXPORTADOR_EMAIL}}` - Email de contacto

### Información del Consignatario (Consignee)
- `{{CONSIGNEE_COMPANY}}` - Nombre de la empresa
- `{{CONSIGNEE_ADDRESS}}` - Dirección completa
- `{{CONSIGNEE_ATTN}}` - A la atención de
- `{{CONSIGNEE_USCC}}` - USCC (para China)
- `{{CONSIGNEE_MOBILE}}` - Teléfono móvil
- `{{CONSIGNEE_EMAIL}}` - Email
- `{{CONSIGNEE_ZIP}}` - Código postal
- `{{CONSIGNEE_PAIS}}` - País

### Información del Notify Party
- `{{NOTIFY_COMPANY}}` - Nombre de la empresa
- `{{NOTIFY_ADDRESS}}` - Dirección completa
- `{{NOTIFY_ATTN}}` - A la atención de
- `{{NOTIFY_USCC}}` - USCC (para China)
- `{{NOTIFY_MOBILE}}` - Teléfono móvil
- `{{NOTIFY_EMAIL}}` - Email
- `{{NOTIFY_ZIP}}` - Código postal

### Información del Embarque
- `{{FECHA_FACTURA}}` - Fecha de emisión de la factura
- `{{INVOICE_NUMBER}}` - Número de invoice
- `{{EMBARQUE_NUMBER}}` - Número de embarque
- `{{CSP}}` - CSP
- `{{CSG}}` - CSG
- `{{FECHA_EMBARQUE}}` - Fecha de embarque
- `{{MOTONAVE}}` - Nombre de la nave
- `{{VIAJE}}` - Número de viaje
- `{{MODALIDAD_VENTA}}` - Modalidad de venta
- `{{CLAUSULA_VENTA}}` - FOB, CIF, etc.
- `{{PAIS_ORIGEN}}` - País de origen
- `{{PUERTO_EMBARQUE}}` - Puerto de embarque
- `{{PUERTO_DESTINO}}` - Puerto de destino
- `{{PAIS_DESTINO}}` - País de destino final
- `{{FORMA_PAGO}}` - Forma de pago
- `{{CONTENEDOR}}` - Número de contenedor

### Referencias
- `{{REF_ASLI}}` - Referencia ASLI
- `{{BOOKING}}` - Número de booking
- `{{REF_CLIENTE}}` - Referencia del cliente

## 🔢 Marcadores de Productos (Tabla)

Para tablas de productos, usar estos marcadores en **una sola fila**:

### Opción 1: Tabla Automática (Recomendada)
Coloca estos marcadores en una fila de Excel, el sistema generará automáticamente todas las filas necesarias:

- `{{PRODUCTO_CANTIDAD}}` - Cantidad de cajas/unidades
- `{{PRODUCTO_TIPO_ENVASE}}` - CASES, BOXES, etc.
- `{{PRODUCTO_ESPECIE}}` - CEREZA, UVA, etc.
- `{{PRODUCTO_VARIEDAD}}` - RED CHERRIES, REGINA, etc.
- `{{PRODUCTO_CATEGORIA}}` - CAT 1, PREMIUM, etc.
- `{{PRODUCTO_ETIQUETA}}` - Marca/etiqueta
- `{{PRODUCTO_CALIBRE}}` - 2J, 3J, J, XL, etc.
- `{{PRODUCTO_KG_NETO_UNIDAD}}` - Kg neto por caja (ej: 2.50)
- `{{PRODUCTO_KG_BRUTO_UNIDAD}}` - Kg bruto por caja (ej: 3.00)
- `{{PRODUCTO_PRECIO_CAJA}}` - Precio USD por caja
- `{{PRODUCTO_TOTAL}}` - Total de la línea (cantidad × precio)

**Ejemplo en Excel:**
```
| Qty | Type  | Variety | Category | Label | Caliber | Net Wt | Gross Wt | Price | Total |
|-----|-------|---------|----------|-------|---------|--------|----------|-------|-------|
| {{PRODUCTO_CANTIDAD}} | {{PRODUCTO_TIPO_ENVASE}} | {{PRODUCTO_VARIEDAD}} | {{PRODUCTO_CATEGORIA}} | {{PRODUCTO_ETIQUETA}} | {{PRODUCTO_CALIBRE}} | {{PRODUCTO_KG_NETO_UNIDAD}} | {{PRODUCTO_KG_BRUTO_UNIDAD}} | {{PRODUCTO_PRECIO_CAJA}} | {{PRODUCTO_TOTAL}} |
```

El sistema detectará esta fila y la duplicará automáticamente para cada producto.

### Opción 2: Productos Individuales (Hasta 20)
Si prefieres posiciones fijas:
- `{{PRODUCTO_1_CANTIDAD}}`, `{{PRODUCTO_2_CANTIDAD}}`, ..., `{{PRODUCTO_20_CANTIDAD}}`
- `{{PRODUCTO_1_VARIEDAD}}`, `{{PRODUCTO_2_VARIEDAD}}`, ..., `{{PRODUCTO_20_VARIEDAD}}`
- (Y así para cada campo)

## 💰 Marcadores de Totales

- `{{CANTIDAD_TOTAL}}` - Total de cajas/unidades
- `{{PESO_NETO_TOTAL}}` - Peso neto total en Kg
- `{{PESO_BRUTO_TOTAL}}` - Peso bruto total en Kg
- `{{VALOR_TOTAL}}` - Valor total USD (número)
- `{{VALOR_TOTAL_TEXTO}}` - Valor total en palabras (ej: "TWO HUNDRED SIXTY THOUSAND US Dollar")

## 📅 Marcadores de Fecha/Hora

- `{{FECHA_HOY}}` - Fecha actual (formato: DD/MM/YYYY)
- `{{FECHA_HOY_LARGO}}` - Fecha actual (formato: 1 de Febrero de 2026)
- `{{HORA_ACTUAL}}` - Hora actual (formato: HH:MM)

## 🎨 Marcadores Especiales

### Formato Condicional
- `{{SI_TIENE_CONTENEDOR}}...{{FIN_SI}}` - Mostrar solo si hay contenedor asignado
- `{{SI_FOB}}...{{FIN_SI}}` - Mostrar solo si es FOB
- `{{SI_CIF}}...{{FIN_SI}}` - Mostrar solo si es CIF

### Cálculos Personalizados
- `{{TOTAL_CAJAS_PALLET}}` - Si se almacena cajas por pallet
- `{{NUMERO_PALLETS}}` - Número de pallets calculado

## 🔧 Configuración de Plantilla

Además de los marcadores, puedes configurar en el sistema:

1. **Nombre de la plantilla**: Para identificarla
2. **Cliente asociado**: ALMAFRUIT, HAPPYFARM, etc.
3. **Tipo de factura**: Proforma, Commercial Invoice, etc.
4. **Notas especiales**: Texto adicional específico del cliente
5. **Idioma**: ES, EN, ZH (para algunos campos)

## 📖 Ejemplo Completo

```excel
                    PROFORMA INVOICE

SELLER/SHIPPER:
{{EXPORTADOR_NOMBRE}}
RUT: {{EXPORTADOR_RUT}}
{{EXPORTADOR_DIRECCION}}
Email: {{EXPORTADOR_EMAIL}}

CONSIGNEE:                          NOTIFY PARTY:
{{CONSIGNEE_COMPANY}}               {{NOTIFY_COMPANY}}
{{CONSIGNEE_ADDRESS}}               {{NOTIFY_ADDRESS}}
ATTN: {{CONSIGNEE_ATTN}}           ATTN: {{NOTIFY_ATTN}}
USCC: {{CONSIGNEE_USCC}}           USCC: {{NOTIFY_USCC}}
TEL: {{CONSIGNEE_MOBILE}}          TEL: {{NOTIFY_MOBILE}}
Email: {{CONSIGNEE_EMAIL}}         Email: {{NOTIFY_EMAIL}}

INVOICE NO: {{INVOICE_NUMBER}}      DATE: {{FECHA_FACTURA}}
BOOKING NO: {{BOOKING}}             REF: {{REF_ASLI}}

VESSEL: {{MOTONAVE}} V.{{VIAJE}}
PORT OF LOADING: {{PUERTO_EMBARQUE}}
PORT OF DISCHARGE: {{PUERTO_DESTINO}}
CONTAINER NO: {{CONTENEDOR}}
TERMS: {{CLAUSULA_VENTA}} {{PUERTO_DESTINO}}

PRODUCTS:
+--------+-------+------------------+----------+-----------+---------+---------+----------+---------+-----------+
| Qty    | Type  | Variety          | Category | Label     | Caliber | Net Wt  | Gross Wt | Price   | Total     |
+--------+-------+------------------+----------+-----------+---------+---------+----------+---------+-----------+
| {{PRODUCTO_CANTIDAD}} | {{PRODUCTO_TIPO_ENVASE}} | {{PRODUCTO_VARIEDAD}} | {{PRODUCTO_CATEGORIA}} | {{PRODUCTO_ETIQUETA}} | {{PRODUCTO_CALIBRE}} | {{PRODUCTO_KG_NETO_UNIDAD}} | {{PRODUCTO_KG_BRUTO_UNIDAD}} | {{PRODUCTO_PRECIO_CAJA}} | {{PRODUCTO_TOTAL}} |
+--------+-------+------------------+----------+-----------+---------+---------+----------+---------+-----------+

TOTAL CASES: {{CANTIDAD_TOTAL}}
TOTAL NET WEIGHT: {{PESO_NETO_TOTAL}} KGS
TOTAL GROSS WEIGHT: {{PESO_BRUTO_TOTAL}} KGS

TOTAL AMOUNT: USD {{VALOR_TOTAL}}
SAY: {{VALOR_TOTAL_TEXTO}}

PAYMENT TERMS: {{FORMA_PAGO}}
```

## 💡 Consejos de Uso

1. **Mantén el formato de Excel**: El sistema preservará colores, bordes, fuentes, etc.
2. **Usa celdas combinadas**: Para títulos y secciones grandes
3. **Tablas con estilo**: Aplica bordes y colores a las tablas de productos
4. **Logotipo**: Puedes insertar imágenes (logo) en el Excel, se mantendrán
5. **Fórmulas**: Puedes usar fórmulas de Excel además de los marcadores
6. **Múltiples hojas**: Si usas varias hojas, todas se procesarán

## 🚀 Próximos Pasos

1. Crea tu plantilla en Excel con estos marcadores
2. Sube la plantilla en **Mantenimiento → Plantillas Proforma**
3. Asocia la plantilla a un cliente
4. Al generar una proforma, selecciona la plantilla
5. ¡El sistema completará automáticamente todos los datos!
