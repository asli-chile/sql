# Configuración de Catálogos POL y POD

## 📋 Resumen

Este documento explica la configuración correcta de los catálogos para puertos de origen (POL) y puertos de destino (POD).

## 🎯 Fuentes de Datos

### POL (Port of Loading - Puerto de Origen)
- **Tabla**: `catalogos` 
- **Categoría**: `categoria='pols'`
- **Campo usado**: `valores` (array de strings)
- **Ejemplos**: Valparaíso, San Antonio, Iquique, Puerto Montt

### POD (Port of Discharge - Puerto de Destino)
- **Tabla**: `catalogos_destinos`
- **Campo usado**: `nombre`
- **Filtro**: `activo = true`
- **Ejemplos**: Los Angeles, Rotterdam, Shanghai, Santos

## 🔧 Configuración Técnica

### En `AddModal.tsx`:
```typescript
// POL usa polsUnicos (de catalogos categoria='pols')
<Combobox
  options={polsUnicos}
  value={formData.pol || ''}
  onChange={(value) => handleComboboxChange('pol', value)}
  placeholder="Seleccionar POL"
/>

// POD usa destinosUnicos (de catalogos_destinos)
<Combobox
  options={destinosUnicos}
  value={formData.pod || ''}
  onChange={(value) => handleComboboxChange('pod', value)}
  placeholder="Seleccionar POD"
/>
```

### En `page.tsx` (tablas-personalizadas):
```typescript
// Dentro de loadCatalogos()

// Cargar POLs desde catalogos
const { data: catalogos } = await supabase
  .from('catalogos')
  .select('*');
  
catalogos?.forEach(catalogo => {
  if (catalogo.categoria === 'pols') {
    setPolsUnicos(catalogo.valores || []);
  }
});

// Cargar PODs desde catalogos_destinos
const { data: destinosData } = await supabase
  .from('catalogos_destinos')
  .select('nombre')
  .eq('activo', true)
  .order('nombre');
  
if (destinosData) {
  const destinos = destinosData.map(item => item.nombre).filter(Boolean);
  setDestinosUnicos([...new Set(destinos)]);
}
```

## 📝 Scripts SQL Necesarios

### 1. Crear catálogo de POLs
**Archivo**: `scripts/crear-catalogo-pols.sql`

Crea el catálogo de puertos de origen en la tabla `catalogos` con `categoria='pols'`.

```sql
INSERT INTO catalogos (categoria, valores)
VALUES ('pols', ARRAY[
  'Antofagasta',
  'Arica',
  'San Antonio',
  'Valparaíso',
  -- ... más puertos
]::TEXT[])
ON CONFLICT (categoria) DO UPDATE SET valores = EXCLUDED.valores;
```

### 2. Crear tabla catalogos_destinos
**Archivo**: `scripts/create-catalogos-destinos-table.sql`

Crea la tabla dedicada para PODs (puertos de destino).

```sql
CREATE TABLE IF NOT EXISTS public.catalogos_destinos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3. Poblar catalogos_destinos
**Archivo**: `scripts/poblar-catalogos-destinos.sql`

Inserta destinos internacionales comunes en la tabla.

```sql
INSERT INTO catalogos_destinos (nombre, activo) VALUES
  ('Los Angeles, CA', true),
  ('Rotterdam, Netherlands', true),
  ('Shanghai, China', true),
  -- ... más destinos
ON CONFLICT (nombre) DO NOTHING;
```

## 🚀 Orden de Ejecución

Ejecutar los scripts en este orden en Supabase SQL Editor:

1. ✅ `scripts/create-catalogos-destinos-table.sql` (crear tabla PODs)
2. ✅ `scripts/poblar-catalogos-destinos.sql` (llenar PODs)
3. ✅ `scripts/crear-catalogo-pols.sql` (crear/actualizar POLs)

## 🔄 Flujo de Carga

```
loadCatalogos() ejecutado al cargar la página
    ↓
Carga catalogos_navieras → setNavierasUnicas
    ↓
Carga catalogos_naves → setNavesUnicas
    ↓
Carga catalogos_destinos (activo=true) → setDestinosUnicos (PODs)
    ↓
Carga catalogos (categoria='pols') → setPolsUnicos (POLs)
    ↓
loadRegistros() NO sobrescribe estos valores
```

## ✅ Ventajas de Esta Estructura

### POL en `catalogos`:
- ✅ Simple y directo
- ✅ Fácil de actualizar (solo un array)
- ✅ Menos puertos (generalmente locales)
- ✅ Cambios poco frecuentes

### POD en `catalogos_destinos`:
- ✅ Tabla dedicada con más flexibilidad
- ✅ Campo `activo` para desactivar temporalmente
- ✅ Fácil agregar campos adicionales (país, región, código, etc.)
- ✅ Muchos destinos internacionales
- ✅ Mejor escalabilidad

## 🛠️ Mantenimiento

### Agregar un POL nuevo:
```sql
UPDATE catalogos
SET valores = array_append(valores, 'NUEVO_PUERTO'),
    updated_at = NOW()
WHERE categoria = 'pols';
```

### Agregar un POD nuevo:
```sql
INSERT INTO catalogos_destinos (nombre, activo) 
VALUES ('NUEVO_DESTINO', true);
```

### Desactivar un POD (sin eliminarlo):
```sql
UPDATE catalogos_destinos 
SET activo = false 
WHERE nombre = 'DESTINO_A_DESACTIVAR';
```

### Reactivar un POD:
```sql
UPDATE catalogos_destinos 
SET activo = true 
WHERE nombre = 'DESTINO_A_REACTIVAR';
```

## 📊 Diferencias Clave

| Aspecto | POL (Origen) | POD (Destino) |
|---------|--------------|---------------|
| **Tabla** | `catalogos` | `catalogos_destinos` |
| **Campo** | `categoria='pols'` | Campo dedicado |
| **Tipo** | Array `TEXT[]` | Tabla relacional |
| **Activo/Inactivo** | Eliminar del array | Campo `activo` |
| **Cantidad típica** | ~10-15 puertos | ~50+ destinos |
| **Alcance** | Nacional/Regional | Internacional |
| **Frecuencia de cambios** | Baja | Media |
| **Extensibilidad** | Limitada | Alta |

## 🎯 Resultado Final

- ✅ POL muestra solo puertos de origen chilenos desde `catalogos`
- ✅ POD muestra destinos internacionales desde `catalogos_destinos`
- ✅ Ambos se cargan desde catálogos (no desde registros existentes)
- ✅ Estructura escalable y mantenible

---

**Fecha de implementación**: Febrero 2026  
**Archivos modificados**:
- `src/components/modals/AddModal.tsx`
- `app/tablas-personalizadas/page.tsx`

**Scripts SQL creados**:
- `scripts/crear-catalogo-pols.sql`
- `scripts/create-catalogos-destinos-table.sql` (ya existía)
- `scripts/poblar-catalogos-destinos.sql`
