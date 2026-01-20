# Actualizaciones Necesarias para Importación de Sheets

## ✅ Campo `emision` agregado a base de datos

El campo `emision` ya fue agregado a la tabla `registros` mediante el script SQL.

## 📝 Cambios Necesarios en `src/lib/googleSheets.ts`

### 1. Actualizar COLUMN_MAPPING (después de línea 566)

Agregar estos campos al mapeo:

```typescript
'ATMOSFERA': 'tipo_atmosfera', // AT CONTROLADA
'EMISIÓN': 'emision',
'EMISION': 'emision', // Variante sin tilde
// Campos para transportes (se procesan por separado)
'CONDUCTOR': 'transporte_conductor',
'RUT': 'transporte_rut',
'CONTACTO': 'transporte_contacto',
'PATENTES CAMION': 'transporte_patentes'
```

**COLUMN_MAPPING completo debería quedar así:**

```typescript
const COLUMN_MAPPING: Record<string, string> = {
  'INGRESADO': 'ingresado',
  'EJECUTIVO': 'ejecutivo',
  'SHIPPER': 'shipper',
  'REF ASLI': 'ref_asli',
  'REF CLIENTE': 'ref_externa',
  'BOOKING': 'booking',
  'NAVE [N°]': 'nave_inicial',
  'NAVIERA': 'naviera',
  'ESPECIE': 'especie',
  'T°': 'temperatura',
  'CBM': 'cbm',
  'CT': 'ct',
  'ATMOSFERA': 'tipo_atmosfera', // ✅ NUEVO
  'CO2': 'co2',
  'O2': 'o2',
  'PUERTO EMBARQUE': 'pol',
  'DESTINO': 'pod',
  'ETD': 'etd',
  'ETA': 'eta',
  'PREPAID O COLLECT': 'flete',
  'EMISIÓN': 'emision', // ✅ NUEVO
  'EMISION': 'emision', // ✅ NUEVO (variante sin tilde)
  'DEPOSITO': 'deposito',
  'CONTENEDOR': 'contenedor',
  'NORMAL': 'tipo_ingreso_normal',
  'LATE': 'tipo_ingreso_late',
  'X LATE': 'tipo_ingreso_extra_late',
  'N° BL': 'numero_bl',
  'ESTADO BL': 'estado_bl',
  // ✅ NUEVOS: Campos para transportes
  'CONDUCTOR': 'transporte_conductor',
  'RUT': 'transporte_rut',
  'CONTACTO': 'transporte_contacto',
  'PATENTES CAMION': 'transporte_patentes'
};
```

### 2. Actualizar la función `transformSheetRowToRegistro`

La función debe retornar tanto el registro como los datos de transporte. Cambiar la firma y lógica:

**Cambio de firma (línea 586-590):**
```typescript
export const transformSheetRowToRegistro = (
  headers: string[],
  row: string[],
  rowNumber: number
): { registro: Record<string, unknown> | null; transporte: Record<string, unknown> | null } => {
  const registro: Record<string, unknown> = {};
  const transporte: Record<string, unknown> = {}; // ✅ NUEVO
  
  // ... resto del código
```

**Agregar manejo de campos de transporte (después de línea 604):**
```typescript
  let hasTransporteData = false; // ✅ NUEVO

  // Procesar cada celda
  row.forEach((cell, index) => {
    const fieldName = columnMap[index];
    if (!fieldName) return;

    const value = cell || '';

    // ✅ NUEVO: Campos de transporte (se guardan por separado)
    if (fieldName.startsWith('transporte_')) {
      hasTransporteData = true;
      const transporteField = fieldName.replace('transporte_', '');
      // Mapear contacto a fono
      if (transporteField === 'contacto') {
        transporte['fono'] = value || null;
      } else {
        transporte[transporteField] = value || null;
      }
      return;
    }
```

**Agregar validación de emision (después del mapeo de números, línea 641):**
```typescript
    // ✅ NUEVO: Mapeo especial para emision (validar valores permitidos)
    if (fieldName === 'emision') {
      const emisionValue = value.toUpperCase().trim();
      const emisionesValidas = ['TELEX RELEASE', 'BILL OF LADING', 'SEA WAY BILL', 'EXPRESS RELEASE'];
      // Buscar coincidencia parcial o exacta
      const emisionMatch = emisionesValidas.find(e => 
        e === emisionValue || 
        e.replace(/\s+/g, ' ') === emisionValue.replace(/\s+/g, ' ') ||
        e.includes(emisionValue) ||
        emisionValue.includes(e.split(' ')[0])
      );
      registro[fieldName] = emisionMatch || (value ? value : null);
      return;
    }
```

**Cambiar el return final (línea 707):**
```typescript
  // ✅ NUEVO: Preparar objeto de transporte si hay datos
  let transporteResult: Record<string, unknown> | null = null;
  if (hasTransporteData && (transporte.conductor || transporte.rut || transporte.fono || transporte.patentes)) {
    transporteResult = {
      conductor: transporte.conductor || null,
      rut: transporte.rut || null,
      fono: transporte.fono || null,
      patentes: transporte.patentes || null
    };
  }

  return { 
    registro: registro, 
    transporte: transporteResult 
  };
};
```

### 3. Actualizar `app/api/google-sheets/import/route.ts`

**Cambiar línea 100 para manejar el nuevo retorno:**
```typescript
      const resultado = transformSheetRowToRegistro(headers, row, rowNumber);
      const registro = resultado.registro;
      const transporte = resultado.transporte;

      if (!registro) {
        registrosInvalidos.push({
          row: rowNumber,
          error: 'Faltan campos obligatorios o datos inválidos'
        });
        return;
      }

      registrosValidos.push(registro);
      
      // ✅ NUEVO: Guardar datos de transporte para procesar después
      if (transporte) {
        // Los datos de transporte se procesarán después de insertar los registros
        // basándose en el booking y contenedor
      }
```

## 🔄 Próximos Pasos

1. Guarda todos los archivos
2. Actualiza `src/lib/googleSheets.ts` con los cambios indicados
3. Actualiza `app/api/google-sheets/import/route.ts` para manejar transportes
4. Prueba la importación con un subconjunto pequeño de datos primero
