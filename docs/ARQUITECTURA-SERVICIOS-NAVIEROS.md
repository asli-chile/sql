# 🏗️ Arquitectura del Sistema de Servicios Navieros

## 📋 Índice

1. [Visión General](#visión-general)
2. [Modelo Conceptual de Entidades](#modelo-conceptual-de-entidades)
3. [Estructura de Datos](#estructura-de-datos)
4. [Lógica de Creación](#lógica-de-creación)
5. [Reglas de Validación](#reglas-de-validación)
6. [Ejemplo Práctico](#ejemplo-práctico)
7. [Flujos de Trabajo](#flujos-de-trabajo)
8. [Consideraciones Técnicas](#consideraciones-técnicas)

---

## Visión General

### Principios Fundamentales

1. **Separación Clara de Responsabilidades**
   - Servicios únicos: Independientes, propiedad de una naviera
   - Servicios compartidos: Agregaciones que referencian servicios únicos

2. **Sin Duplicación de Datos**
   - Los servicios compartidos referencian, no duplican
   - Cambios en servicios únicos pueden reflejarse en servicios compartidos (según configuración)

3. **Escalabilidad**
   - Fácil agregar nuevas navieras
   - Fácil crear nuevos consorcios
   - Fácil modificar servicios sin romper referencias

---

## Modelo Conceptual de Entidades

### 1. Servicio Único (`servicios_unicos`)

**Definición:** Un servicio marítimo propiedad de una única naviera.

**Características:**
- Pertenece a UNA naviera
- Tiene un nombre único dentro de la naviera
- Contiene naves asignadas
- Contiene destinos (PODs) definidos
- Es independiente y puede existir sin consorcios

**Atributos:**
```
- id (UUID)
- nombre (TEXT) - Ej: "INCA", "AX1", "AN1"
- naviera_id (UUID) - Referencia a naviera
- descripcion (TEXT, opcional)
- activo (BOOLEAN)
- created_at, updated_at
- created_by, updated_by
```

**Relaciones:**
- `1:N` con `servicios_unicos_naves` (naves asignadas)
- `1:N` con `servicios_unicos_destinos` (destinos/PODs)
- `1:N` con `consorcios_servicios` (puede ser parte de múltiples consorcios)

### 2. Servicio Compartido / Consorcio (`consorcios`)

**Definición:** Un servicio que agrupa uno o más servicios únicos de diferentes navieras.

**Características:**
- Agrupa servicios únicos existentes
- Puede tener nombre propio (ej: "ANDES EXPRESS")
- Define qué destinos de cada servicio único están activos
- Puede compartir naves entre navieras
- Es una vista/agregación, no duplica datos

**Atributos:**
```
- id (UUID)
- nombre (TEXT) - Ej: "ANDES EXPRESS", "ASIA EXPRESS"
- descripcion (TEXT, opcional)
- activo (BOOLEAN)
- created_at, updated_at
- created_by, updated_by
```

**Relaciones:**
- `N:M` con `servicios_unicos` a través de `consorcios_servicios`
- `1:N` con `consorcios_destinos_activos` (configuración de destinos por servicio)

### 3. Relación Consorcio-Servicio (`consorcios_servicios`)

**Definición:** Tabla de unión que relaciona consorcios con servicios únicos.

**Características:**
- Define qué servicios únicos participan en un consorcio
- Define el orden de visualización
- Permite activar/desactivar servicios dentro del consorcio

**Atributos:**
```
- id (UUID)
- consorcio_id (UUID) - Referencia a consorcio
- servicio_unico_id (UUID) - Referencia a servicio único
- orden (INTEGER) - Orden de visualización
- activo (BOOLEAN) - Si este servicio está activo en el consorcio
- created_at, updated_at
```

**Constraints:**
- `UNIQUE(consorcio_id, servicio_unico_id)` - Un servicio único no puede estar duplicado en el mismo consorcio

### 4. Destinos Activos por Consorcio (`consorcios_destinos_activos`)

**Definición:** Define qué destinos de cada servicio único están activos en el consorcio.

**Características:**
- Permite seleccionar destinos específicos de cada servicio único
- Si no se especifica, todos los destinos del servicio único están activos
- Permite personalizar el orden de destinos en el consorcio

**Atributos:**
```
- id (UUID)
- consorcio_id (UUID)
- servicio_unico_id (UUID)
- destino_id (UUID) - Referencia al destino del servicio único
- activo (BOOLEAN) - Si este destino está activo en el consorcio
- orden (INTEGER) - Orden de visualización en el consorcio
- created_at, updated_at
```

**Constraints:**
- `UNIQUE(consorcio_id, servicio_unico_id, destino_id)`

### 5. Naves de Servicio Único (`servicios_unicos_naves`)

**Definición:** Naves asignadas a un servicio único.

**Atributos:**
```
- id (UUID)
- servicio_unico_id (UUID)
- nave_nombre (TEXT) - Nombre de la nave
- activo (BOOLEAN)
- orden (INTEGER)
- created_at, updated_at
```

### 6. Destinos de Servicio Único (`servicios_unicos_destinos`)

**Definición:** Destinos (PODs) definidos para un servicio único.

**Atributos:**
```
- id (UUID)
- servicio_unico_id (UUID)
- puerto (TEXT) - Código del puerto (ej: "YOKO", "SHAN")
- puerto_nombre (TEXT) - Nombre completo
- area (TEXT) - ASIA, EUROPA, AMERICA, etc.
- orden (INTEGER) - Orden de escala
- activo (BOOLEAN)
- created_at, updated_at
```

---

## Estructura de Datos

### Diagrama de Relaciones

```
┌─────────────────────┐
│   servicios_unicos  │
│  (Servicio Único)   │
└──────────┬──────────┘
           │
           ├─── 1:N ───┐
           │            │
           │            ▼
           │    ┌──────────────────────┐
           │    │ servicios_unicos_   │
           │    │      _naves          │
           │    └──────────────────────┘
           │
           ├─── 1:N ───┐
           │            │
           │            ▼
           │    ┌──────────────────────┐
           │    │ servicios_unicos_   │
           │    │    _destinos         │
           │    └──────────────────────┘
           │
           └─── N:M ───┐
                       │
                       ▼
              ┌──────────────────────┐
              │ consorcios_servicios │
              │  (Tabla de Unión)    │
              └──────────┬───────────┘
                         │
                         │
                         ▼
              ┌──────────────────────┐
              │     consorcios       │
              │ (Servicio Compartido)│
              └──────────┬───────────┘
                         │
                         └─── 1:N ───┐
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │ consorcios_destinos_  │
                         │      _activos         │
                         └──────────────────────┘
```

### Tablas de Soporte

```
┌─────────────────────┐
│ catalogos_navieras  │ (Catálogo de navieras)
└─────────────────────┘

┌─────────────────────┐
│ catalogos_naves     │ (Catálogo de naves)
└─────────────────────┘

┌─────────────────────┐
│ catalogos_destinos  │ (Catálogo de puertos/destinos)
└─────────────────────┘
```

---

## Lógica de Creación

### Flujo 1: Crear Servicio Único

**Paso 1: Validaciones Iniciales**
- Verificar que la naviera existe
- Verificar que el nombre del servicio no existe para esa naviera
- Validar que hay al menos una nave
- Validar que hay al menos un destino

**Paso 2: Crear Servicio Único**
```
1. Insertar en `servicios_unicos`:
   - nombre: "INCA"
   - naviera_id: UUID de MSC
   - activo: true

2. Insertar naves en `servicios_unicos_naves`:
   - Para cada nave seleccionada
   - Asociar con servicio_unico_id

3. Insertar destinos en `servicios_unicos_destinos`:
   - Para cada destino seleccionado
   - Asociar con servicio_unico_id
   - Definir orden de escala
```

**Paso 3: Resultado**
- Servicio único creado e independiente
- Listo para ser usado en consorcios

### Flujo 2: Crear Servicio Compartido / Consorcio

**Paso 1: Selección de Servicios Únicos**
- Mostrar lista de servicios únicos disponibles
- Permitir seleccionar múltiples servicios únicos
- Validar que se seleccione al menos un servicio único
- Validar que los servicios únicos seleccionados estén activos

**Paso 2: Configuración de Destinos**
- Para cada servicio único seleccionado:
  - Mostrar sus destinos disponibles
  - Permitir seleccionar qué destinos están activos en el consorcio
  - Permitir definir orden de destinos en el consorcio
  - Opción: "Usar todos los destinos" (por defecto)

**Paso 3: Configuración de Naves (Opcional)**
- Mostrar todas las naves de los servicios únicos seleccionados
- Permitir seleccionar naves específicas para el consorcio
- Opción: "Usar todas las naves" (por defecto)

**Paso 4: Crear Consorcio**
```
1. Insertar en `consorcios`:
   - nombre: "ANDES EXPRESS"
   - activo: true

2. Insertar en `consorcios_servicios`:
   - Para cada servicio único seleccionado
   - Asociar con consorcio_id
   - Definir orden

3. Insertar en `consorcios_destinos_activos`:
   - Para cada destino activo de cada servicio único
   - Asociar con consorcio_id y servicio_unico_id
   - Definir orden en el consorcio
```

**Paso 5: Generar Nombre del Consorcio (Opcional)**
- Si no se proporciona nombre, generar automáticamente:
  - Formato: "SERVICIO1 / SERVICIO2 / SERVICIO3"
  - Ejemplo: "INCA / AX1 / AN1"

**Paso 6: Resultado**
- Consorcio creado
- Referencias a servicios únicos establecidas
- Destinos activos configurados
- Listo para usar en itinerarios

---

## Reglas de Validación

### Reglas para Servicios Únicos

1. **Nombre Único por Naviera**
   - No puede existir otro servicio único con el mismo nombre para la misma naviera
   - Ejemplo: MSC puede tener "INCA", pero no puede tener dos servicios "INCA"

2. **Naves Requeridas**
   - Debe tener al menos una nave asignada
   - Las naves deben existir en `catalogos_naves`
   - Las naves deben estar activas

3. **Destinos Requeridos**
   - Debe tener al menos un destino
   - Los destinos deben existir en `catalogos_destinos`
   - Los destinos deben estar activos

4. **Naviera Requerida**
   - Debe pertenecer a una naviera válida
   - La naviera debe existir en `catalogos_navieras`
   - La naviera debe estar activa

### Reglas para Consorcios

1. **Servicios Únicos Requeridos**
   - Debe incluir al menos un servicio único
   - Los servicios únicos deben estar activos
   - No puede incluir el mismo servicio único dos veces

2. **Nombre Único**
   - El nombre del consorcio debe ser único
   - No puede duplicar nombres de otros consorcios

3. **Destinos Activos**
   - Si no se especifican destinos activos, se usan todos los destinos de los servicios únicos
   - Los destinos activos deben pertenecer a los servicios únicos incluidos

4. **Consistencia de Datos**
   - Si un servicio único se desactiva, los consorcios que lo incluyen deben marcarse como "requiere revisión"
   - Si un destino se elimina de un servicio único, debe eliminarse de los consorcios que lo usan

### Reglas de Integridad

1. **Cascada de Eliminación**
   - Si se elimina un servicio único, se eliminan sus relaciones con consorcios
   - Los consorcios afectados deben ser notificados o marcados como inactivos

2. **Modificación de Servicios Únicos**
   - Modificar un servicio único NO afecta automáticamente los consorcios
   - Los consorcios mantienen su configuración de destinos activos
   - Se puede agregar una opción de "sincronización" si se desea

3. **Activos/Inactivos**
   - Un servicio único inactivo no puede ser agregado a nuevos consorcios
   - Un consorcio inactivo no aparece en listas de selección

---

## Ejemplo Práctico

### Escenario: Crear Consorcio "ANDES EXPRESS"

#### Servicios Únicos Existentes:

**1. MSC INCA**
```
- id: uuid-msc-inca
- nombre: "INCA"
- naviera: MSC
- naves: ["MSC LELLA", "MSC CHIYO", "MSC VIRGO"]
- destinos: ["YOKOHAMA", "BUSAN", "SHANGHAI", "SHEKOU", "HONG KONG", "NINGBO"]
```

**2. ONE AX1**
```
- id: uuid-one-ax1
- nombre: "AX1"
- naviera: ONE
- naves: ["ONE SPLENDOUR", "ONE COMMITMENT"]
- destinos: ["YOKOHAMA", "BUSAN", "XIAMEN", "SHANGHAI", "SHEKOU", "HONG KONG", "NINGBO"]
```

**3. HAPAG AN1**
```
- id: uuid-hapag-an1
- nombre: "AN1"
- naviera: HAPAG
- naves: ["HAPAG LLOYD BERLIN", "HAPAG LLOYD MUNICH"]
- destinos: ["YOKOHAMA", "BUSAN", "XIAMEN", "SHANGHAI", "SHEKOU", "HONG KONG", "NINGBO"]
```

#### Proceso de Creación del Consorcio:

**Paso 1: Seleccionar Servicios Únicos**
```
✅ MSC INCA
✅ ONE AX1
✅ HAPAG AN1
```

**Paso 2: Configurar Destinos Activos**

Para **MSC INCA**:
```
✅ YOKOHAMA (orden: 1)
✅ BUSAN (orden: 2)
✅ SHANGHAI (orden: 3)
✅ SHEKOU (orden: 4)
✅ HONG KONG (orden: 5)
✅ NINGBO (orden: 6)
```

Para **ONE AX1**:
```
✅ YOKOHAMA (orden: 1) - Ya existe, mantener orden
✅ BUSAN (orden: 2) - Ya existe, mantener orden
✅ XIAMEN (orden: 3) - Nuevo destino
✅ SHANGHAI (orden: 4) - Ya existe, mantener orden
✅ SHEKOU (orden: 5) - Ya existe, mantener orden
✅ HONG KONG (orden: 6) - Ya existe, mantener orden
✅ NINGBO (orden: 7) - Ya existe, mantener orden
```

Para **HAPAG AN1**:
```
✅ YOKOHAMA (orden: 1) - Ya existe, mantener orden
✅ BUSAN (orden: 2) - Ya existe, mantener orden
✅ XIAMEN (orden: 3) - Ya existe, mantener orden
✅ SHANGHAI (orden: 4) - Ya existe, mantener orden
✅ SHEKOU (orden: 5) - Ya existe, mantener orden
✅ HONG KONG (orden: 6) - Ya existe, mantener orden
✅ NINGBO (orden: 7) - Ya existe, mantener orden
```

**Paso 3: Orden Final de Destinos en el Consorcio**
```
1. YOKOHAMA (presente en los 3 servicios)
2. BUSAN (presente en los 3 servicios)
3. XIAMEN (presente en AX1 y AN1)
4. SHANGHAI (presente en los 3 servicios)
5. SHEKOU (presente en los 3 servicios)
6. HONG KONG (presente en los 3 servicios)
7. NINGBO (presente en los 3 servicios)
```

**Paso 4: Crear Consorcio**

**Tabla `consorcios`:**
```sql
INSERT INTO consorcios (nombre, activo) VALUES
('ANDES EXPRESS', true);
-- id: uuid-andes-express
```

**Tabla `consorcios_servicios`:**
```sql
INSERT INTO consorcios_servicios (consorcio_id, servicio_unico_id, orden, activo) VALUES
(uuid-andes-express, uuid-msc-inca, 1, true),
(uuid-andes-express, uuid-one-ax1, 2, true),
(uuid-andes-express, uuid-hapag-an1, 3, true);
```

**Tabla `consorcios_destinos_activos`:**
```sql
-- Destinos de MSC INCA
INSERT INTO consorcios_destinos_activos (consorcio_id, servicio_unico_id, destino_id, orden, activo) VALUES
(uuid-andes-express, uuid-msc-inca, uuid-yokohama, 1, true),
(uuid-andes-express, uuid-msc-inca, uuid-busan, 2, true),
(uuid-andes-express, uuid-msc-inca, uuid-shanghai, 4, true),
(uuid-andes-express, uuid-msc-inca, uuid-shekou, 5, true),
(uuid-andes-express, uuid-msc-inca, uuid-hong-kong, 6, true),
(uuid-andes-express, uuid-msc-inca, uuid-ningbo, 7, true);

-- Destinos de ONE AX1
INSERT INTO consorcios_destinos_activos (consorcio_id, servicio_unico_id, destino_id, orden, activo) VALUES
(uuid-andes-express, uuid-one-ax1, uuid-yokohama, 1, true),
(uuid-andes-express, uuid-one-ax1, uuid-busan, 2, true),
(uuid-andes-express, uuid-one-ax1, uuid-xiamen, 3, true),
(uuid-andes-express, uuid-one-ax1, uuid-shanghai, 4, true),
(uuid-andes-express, uuid-one-ax1, uuid-shekou, 5, true),
(uuid-andes-express, uuid-one-ax1, uuid-hong-kong, 6, true),
(uuid-andes-express, uuid-one-ax1, uuid-ningbo, 7, true);

-- Destinos de HAPAG AN1
INSERT INTO consorcios_destinos_activos (consorcio_id, servicio_unico_id, destino_id, orden, activo) VALUES
(uuid-andes-express, uuid-hapag-an1, uuid-yokohama, 1, true),
(uuid-andes-express, uuid-hapag-an1, uuid-busan, 2, true),
(uuid-andes-express, uuid-hapag-an1, uuid-xiamen, 3, true),
(uuid-andes-express, uuid-hapag-an1, uuid-shanghai, 4, true),
(uuid-andes-express, uuid-hapag-an1, uuid-shekou, 5, true),
(uuid-andes-express, uuid-hapag-an1, uuid-hong-kong, 6, true),
(uuid-andes-express, uuid-hapag-an1, uuid-ningbo, 7, true);
```

**Resultado:**
- Consorcio "ANDES EXPRESS" creado
- Incluye 3 servicios únicos
- 7 destinos activos configurados
- Orden de destinos definido
- Listo para usar en itinerarios

---

## Flujos de Trabajo

### Workflow 1: Crear Servicio Único desde Cero

```
1. Usuario selecciona "Crear Servicio Único"
2. Sistema muestra formulario:
   - Campo: Nombre del servicio
   - Selector: Naviera
   - Lista: Naves disponibles (filtradas por naviera)
   - Lista: Destinos disponibles
3. Usuario completa formulario
4. Sistema valida:
   - Nombre único para la naviera
   - Al menos una nave seleccionada
   - Al menos un destino seleccionado
5. Sistema crea servicio único
6. Sistema muestra confirmación
```

### Workflow 2: Crear Consorcio desde Servicios Únicos Existentes

```
1. Usuario selecciona "Crear Consorcio"
2. Sistema muestra lista de servicios únicos disponibles
3. Usuario selecciona servicios únicos (múltiple selección)
4. Sistema muestra para cada servicio seleccionado:
   - Sus naves
   - Sus destinos (con checkboxes)
5. Usuario configura:
   - Qué destinos están activos
   - Orden de destinos en el consorcio
6. Usuario ingresa nombre del consorcio (o se genera automáticamente)
7. Sistema valida:
   - Al menos un servicio único seleccionado
   - Al menos un destino activo en total
   - Nombre único del consorcio
8. Sistema crea consorcio
9. Sistema muestra confirmación
```

### Workflow 3: Modificar Servicio Único

```
1. Usuario selecciona servicio único a modificar
2. Sistema muestra formulario con datos actuales
3. Usuario modifica:
   - Nombre (si cambia, validar unicidad)
   - Naves (agregar/eliminar)
   - Destinos (agregar/eliminar)
4. Sistema valida cambios
5. Sistema actualiza servicio único
6. Sistema muestra advertencia si hay consorcios que usan este servicio
7. Sistema actualiza consorcios afectados (si es necesario)
```

### Workflow 4: Modificar Consorcio

```
1. Usuario selecciona consorcio a modificar
2. Sistema muestra formulario con:
   - Servicios únicos incluidos
   - Destinos activos por servicio
3. Usuario puede:
   - Agregar/eliminar servicios únicos
   - Modificar destinos activos
   - Cambiar orden de destinos
4. Sistema valida cambios
5. Sistema actualiza consorcio
6. Sistema muestra confirmación
```

---

## Consideraciones Técnicas

### Rendimiento

1. **Índices Recomendados**
   - `servicios_unicos(naviera_id, nombre)` - Búsqueda rápida por naviera y nombre
   - `consorcios_servicios(consorcio_id, servicio_unico_id)` - Búsqueda rápida de relaciones
   - `consorcios_destinos_activos(consorcio_id, servicio_unico_id)` - Búsqueda rápida de destinos

2. **Caché**
   - Cachear lista de servicios únicos por naviera
   - Cachear destinos activos por consorcio
   - Invalidar caché al modificar servicios

### Seguridad

1. **Validación de Permisos**
   - Solo usuarios autorizados pueden crear/modificar servicios
   - Validar que las navieras, naves y destinos existen antes de crear relaciones

2. **Integridad Referencial**
   - Foreign keys con CASCADE donde sea apropiado
   - Validar que los servicios únicos estén activos antes de incluirlos en consorcios

### Escalabilidad

1. **Futuras Extensiones**
   - Agregar campos de metadatos (frecuencia, duración, etc.)
   - Agregar historial de cambios
   - Agregar versionado de servicios

2. **Optimizaciones Futuras**
   - Materializar vistas de consorcios para consultas rápidas
   - Agregar índices full-text para búsquedas por nombre

### Migración desde Sistema Actual

1. **Estrategia de Migración**
   - Identificar servicios únicos existentes
   - Crear servicios únicos desde datos actuales
   - Identificar consorcios existentes
   - Crear consorcios referenciando servicios únicos
   - Mantener compatibilidad con sistema anterior durante transición

2. **Datos Legacy**
   - Mantener campo `consorcio` en tabla `itinerarios` por compatibilidad
   - Crear función de migración automática
   - Validar integridad después de migración

---

## Resumen de Decisiones Arquitectónicas

### ✅ Decisiones Clave

1. **Separación Clara**: Servicios únicos y consorcios son entidades distintas
2. **Referencias, no Duplicación**: Los consorcios referencian servicios únicos
3. **Flexibilidad**: Los consorcios pueden personalizar qué destinos están activos
4. **Escalabilidad**: Estructura permite agregar nuevas navieras y consorcios fácilmente
5. **Integridad**: Validaciones robustas aseguran consistencia de datos

### 🎯 Beneficios

- **Mantenibilidad**: Cambios en servicios únicos no afectan consorcios directamente
- **Reutilización**: Un servicio único puede ser parte de múltiples consorcios
- **Claridad**: Separación clara entre servicios únicos y compartidos
- **Flexibilidad**: Fácil crear nuevos consorcios combinando servicios existentes

---

**Documento creado por:** Arquitecto de Software Senior  
**Fecha:** Diciembre 2024  
**Versión:** 1.0
