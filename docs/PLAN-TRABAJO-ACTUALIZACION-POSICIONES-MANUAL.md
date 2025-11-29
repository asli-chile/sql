# 📋 Plan de Trabajo: Actualización Manual de Posiciones de Buques

## 🎯 Objetivo

Eliminar el cron job automático y crear una página de servicios donde se pueda ejecutar manualmente la actualización de posiciones. Cuando se ejecute, los datos actuales deben pasar al historial antes de actualizar con los nuevos datos de la API.

---

## 📊 Análisis del Estado Actual

### Archivos Involucrados

1. **`vercel.json`**: Configuración del cron job (línea 5-9)
   - Cron job: `/api/vessels/update-positions-cron`
   - Horario: `0 7 * * *` (7:00 AM UTC diario)

2. **`app/api/vessels/update-positions-cron/route.ts`**: Endpoint del cron job
   - Actualmente: Actualiza directamente `vessel_positions` y agrega a `vessel_position_history`
   - **Problema**: No mueve los datos actuales al historial antes de actualizar

3. **`app/api/vessels/update-positions/route.ts`**: Endpoint manual (POST)
   - Similar al cron pero requiere autenticación
   - **Problema**: Tampoco mueve datos actuales al historial

### Flujo Actual

```
Cron Job (7 AM) → update-positions-cron → API AIS → Actualiza vessel_positions + Inserta en vessel_position_history
```

### Flujo Deseado

```
Usuario → Página de Servicios → Botón "Actualizar Posiciones" → 
  → 1. Mover datos actuales de vessel_positions a vessel_position_history
  → 2. Llamar API AIS
  → 3. Actualizar vessel_positions con nuevos datos
  → 4. Mostrar resultado en la página
```

---

## ✅ Tareas a Realizar

### FASE 1: Modificar Lógica de Actualización

#### Tarea 1.1: Modificar `update-positions-cron/route.ts`
- [ ] **Antes de actualizar `vessel_positions`**:
  - Leer todos los datos actuales de `vessel_positions` para los buques activos
  - Insertar esos datos en `vessel_position_history` (si tienen coordenadas válidas)
  - Esto preserva el historial completo antes de sobrescribir
  
- [ ] **Luego actualizar**:
  - Llamar a la API AIS
  - Actualizar `vessel_positions` con los nuevos datos
  - Insertar también en `vessel_position_history` (como ya hace)

- [ ] **Cambiar método de GET a POST** (para llamadas manuales desde la página)

#### Tarea 1.2: Modificar `update-positions/route.ts`
- [ ] Aplicar la misma lógica: mover datos actuales al historial antes de actualizar

### FASE 2: Eliminar Cron Job

#### Tarea 2.1: Eliminar de `vercel.json`
- [ ] Remover la entrada del cron job de actualización de posiciones
- [ ] Mantener el cron job de limpieza de papelera (si es necesario)

### FASE 3: Crear Página de Servicios

#### Tarea 3.1: Crear `app/dashboard/servicios/page.tsx`
- [ ] Página protegida (solo admin/ejecutivo)
- [ ] Sección: "Actualización de Posiciones de Buques"
- [ ] Mostrar:
  - Lista de buques activos (con última actualización)
  - Botón "Actualizar Posiciones"
  - Estado de carga durante la ejecución
  - Resultado después de ejecutar:
    - Total de buques procesados
    - Actualizados exitosamente
    - Omitidos (sin IMO/MMSI, etc.)
    - Fallidos (con razón)
    - Tiempo de ejecución

#### Tarea 3.2: Crear componente de UI
- [ ] Componente para mostrar el estado de la actualización
- [ ] Tabla con resultados detallados
- [ ] Indicadores visuales (éxito/error/omitido)

### FASE 4: Integración y Pruebas

#### Tarea 4.1: Integrar con navegación
- [ ] Agregar enlace en el dashboard o sidebar (solo para admins)
- [ ] Verificar permisos de acceso

#### Tarea 4.2: Pruebas
- [ ] Probar que los datos actuales se mueven al historial correctamente
- [ ] Probar que los nuevos datos se actualizan en `vessel_positions`
- [ ] Probar que el historial contiene ambos registros (anterior y nuevo)
- [ ] Probar con buques sin coordenadas previas
- [ ] Probar con buques sin IMO/MMSI
- [ ] Verificar que la página muestra resultados correctamente

---

## 🔍 Detalles Técnicos

### Lógica de Movimiento al Historial

```typescript
// Para cada buque activo:
1. Leer datos actuales de vessel_positions
2. Si tiene coordenadas válidas (last_lat, last_lon):
   - Insertar en vessel_position_history con:
     - Todos los campos de vessel_positions
     - position_at = last_position_at (o last_api_call_at si no hay)
     - source = 'AIS' (o 'MANUAL' si aplica)
3. Luego proceder con la actualización normal
```

### Estructura de la Página de Servicios

```
/dashboard/servicios
├── Header: "Servicios del Sistema"
├── Sección: "Actualización de Posiciones AIS"
│   ├── Información: "Última actualización: [fecha]"
│   ├── Lista de buques activos (tabla)
│   │   ├── Nombre del buque
│   │   ├── Última posición (lat, lon)
│   │   ├── Última actualización
│   │   └── Estado (con coordenadas / sin coordenadas)
│   ├── Botón: "Actualizar Posiciones"
│   └── Resultado (después de ejecutar):
│       ├── Resumen (actualizados, omitidos, fallidos)
│       └── Detalles por buque
```

### Permisos

- Solo usuarios con rol `admin` o email `@asli.cl` pueden acceder
- Verificar en el componente y en el endpoint

---

## ⚠️ Consideraciones Importantes

1. **Preservar Historial**: Es crítico que los datos actuales se guarden en el historial ANTES de actualizar, para no perder información.

2. **Evitar Duplicados**: Verificar que no se creen duplicados en el historial si se ejecuta múltiples veces seguidas.

3. **Manejo de Errores**: Si falla la inserción en el historial, ¿continuar con la actualización o abortar? (Recomendación: continuar pero loguear el error)

4. **Performance**: Si hay muchos buques activos, la operación puede tardar. Mostrar progreso o ejecutar en background.

5. **Límite de API**: La API AIS puede tener límites de rate. Considerar delays entre llamadas si es necesario.

---

## 📝 Orden de Ejecución Recomendado

1. ✅ **FASE 1**: Modificar lógica de actualización (mover al historial primero)
2. ✅ **FASE 2**: Eliminar cron job de vercel.json
3. ✅ **FASE 3**: Crear página de servicios
4. ✅ **FASE 4**: Pruebas y ajustes

---

## 🔄 Reversión

Si algo sale mal, se puede:
- Restaurar el cron job en `vercel.json`
- Revertir los cambios en los endpoints
- La página de servicios es solo lectura, no afecta el sistema si hay errores

---

## 📌 Notas Finales

- El endpoint `update-positions-cron` puede mantenerse pero cambiar a POST y requerir autenticación
- O crear un nuevo endpoint específico para la página de servicios
- Considerar agregar un log de ejecuciones manuales en una tabla separada (opcional)

