# 🎯 SISTEMA DE REF ASLI - SOLO FORMATO TEMPORADA

## 📋 Resumen

**TODAS las referencias ASLI** ahora usan el formato **TEMPORADA-####**  
**NO se usa más el formato A####**

---

## 🌟 TEMPORADAS DEFINIDAS

### **Temporada 1: CHERRY-25-26**
- **Especies:** Cereza, Cherry, Arándano, Blueberry
- **Período:** Septiembre a Enero (meses 9-12 y 1)
- **Formato:** `CHERRY-25-26-0001`, `CHERRY-25-26-0002`...
- **Ejemplo:**
  ```
  Especie: CEREZA
  Fecha: 15 de Septiembre 2025
  REF ASLI: CHERRY-25-26-0638
  ```

### **Temporada 2: POMACEA-CAROZO-2026**
- **Especies:** Ciruela, Manzana, Kiwi, Durazno, Nectarina, Plum, Apple, Peach
- **Período:** Todo el año 2026
- **Formato:** `POMACEA-CAROZO-2026-0001`, `POMACEA-CAROZO-2026-0002`...
- **Ejemplo:**
  ```
  Especie: MANZANA
  Fecha: 20 de Marzo 2026
  REF ASLI: POMACEA-CAROZO-2026-0007
  ```

### **Temporada 3: UVA-2026**
- **Especies:** Uva, Grape
- **Período:** Todo el año 2026
- **Formato:** `UVA-2026-0001`, `UVA-2026-0002`...
- **Ejemplo:**
  ```
  Especie: UVA
  Fecha: 10 de Febrero 2026
  REF ASLI: UVA-2026-0001
  ```

### **Temporada 4: PALTA-2026**
- **Especies:** Palta, Avocado, Aguacate
- **Período:** Todo el año 2026
- **Formato:** `PALTA-2026-0001`, `PALTA-2026-0002`...
- **Ejemplo:**
  ```
  Especie: PALTA
  Fecha: 5 de Mayo 2026
  REF ASLI: PALTA-2026-0001
  ```

### **Temporada 5: CITRICOS-2026**
- **Especies:** Limón, Naranja, Mandarina, Pomelo, Lemon, Orange, Tangerine, Grapefruit
- **Período:** Todo el año 2026
- **Formato:** `CITRICOS-2026-0001`, `CITRICOS-2026-0002`...
- **Ejemplo:**
  ```
  Especie: LIMON
  Fecha: 15 de Junio 2026
  REF ASLI: CITRICOS-2026-0001
  ```

### **Temporada 6: BERRIES-2026**
- **Especies:** Frutilla, Frambuesa, Mora, Strawberry, Raspberry, Blackberry
- **Período:** Todo el año 2026
- **Formato:** `BERRIES-2026-0001`, `BERRIES-2026-0002`...
- **Ejemplo:**
  ```
  Especie: FRUTILLA
  Fecha: 20 de Noviembre 2025
  REF ASLI: BERRIES-2026-0001
  ```

### **Temporada 7: TROPICAL-2026**
- **Especies:** Piña, Mango, Papaya, Maracuyá, Pineapple
- **Período:** Todo el año 2026
- **Formato:** `TROPICAL-2026-0001`, `TROPICAL-2026-0002`...
- **Ejemplo:**
  ```
  Especie: MANGO
  Fecha: 8 de Agosto 2026
  REF ASLI: TROPICAL-2026-0001
  ```

### **Temporada 8: GENERAL-2026**
- **Especies:** Cualquier otra especie no clasificada
- **Período:** Según el año de la fecha
- **Formato:** `GENERAL-2026-0001`, `GENERAL-2026-0002`...
- **Ejemplo:**
  ```
  Especie: ESPARRAGO
  Fecha: 12 de Abril 2026
  REF ASLI: GENERAL-2026-0001
  ```

---

## 📊 TABLA RESUMEN

| **Temporada** | **Especies** | **Formato** |
|---------------|--------------|-------------|
| CHERRY-25-26 | Cereza, Arándano | CHERRY-25-26-#### |
| POMACEA-CAROZO-2026 | Ciruela, Manzana, Kiwi, Durazno | POMACEA-CAROZO-2026-#### |
| UVA-2026 | Uva | UVA-2026-#### |
| PALTA-2026 | Palta, Avocado | PALTA-2026-#### |
| CITRICOS-2026 | Limón, Naranja, Mandarina | CITRICOS-2026-#### |
| BERRIES-2026 | Frutilla, Frambuesa, Mora | BERRIES-2026-#### |
| TROPICAL-2026 | Piña, Mango, Papaya | TROPICAL-2026-#### |
| GENERAL-2026 | Otras especies | GENERAL-2026-#### |

---

## 🚀 IMPLEMENTACIÓN

### **PASO 1: Ejecutar el Script SQL**

1. Ve a **Supabase Dashboard** → **SQL Editor**
2. Copia y pega el contenido de:
   ```
   scripts/trigger-ref-asli-solo-temporadas.sql
   ```
3. Haz clic en **Run**
4. Verifica que aparezca: ✅ "Funciones creadas exitosamente"

### **PASO 2: Verificar los Triggers**

```sql
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'registros'
    AND trigger_schema = 'public'
ORDER BY trigger_name;
```

**Resultado esperado:**
- ✅ `trigger_asignar_ref_asli_automatico` (BEFORE INSERT)
- ✅ `trigger_actualizar_ref_asli_si_cambia` (BEFORE UPDATE)

### **PASO 3: Probar la Generación**

```sql
-- Prueba 1: Cereza
INSERT INTO registros (especie, ingresado, shipper, ref_asli)
VALUES ('CEREZA', '2025-09-15', 'FRUTAS DEL SUR', NULL);

-- Prueba 2: Uva
INSERT INTO registros (especie, ingresado, shipper, ref_asli)
VALUES ('UVA', '2026-02-10', 'VIÑEDOS SA', NULL);

-- Prueba 3: Palta
INSERT INTO registros (especie, ingresado, shipper, ref_asli)
VALUES ('PALTA', '2026-05-05', 'AGUACATES LTDA', NULL);

-- Verificar resultados
SELECT ref_asli, temporada, especie, shipper
FROM registros
WHERE especie IN ('CEREZA', 'UVA', 'PALTA')
ORDER BY created_at DESC
LIMIT 3;
```

**Resultados esperados:**
```
ref_asli                    | temporada              | especie | shipper
----------------------------|------------------------|---------|------------------
CHERRY-25-26-0638          | CHERRY-25-26           | CEREZA  | FRUTAS DEL SUR
UVA-2026-0001              | UVA-2026               | UVA     | VIÑEDOS SA
PALTA-2026-0001            | PALTA-2026             | PALTA   | AGUACATES LTDA
```

---

## 🔄 FLUJO DE GENERACIÓN

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Usuario crea registro con especie "UVA"                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Frontend envía INSERT con ref_asli: NULL                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Trigger ejecuta determinar_temporada("UVA", fecha)      │
│    → Retorna: "UVA-2026"                                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Función obtener_siguiente_ref_asli_temporada()          │
│    → Busca último número para UVA-2026                      │
│    → Genera: "UVA-2026-0001"                                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Registro insertado con:                                  │
│    - ref_asli: "UVA-2026-0001"                              │
│    - temporada: "UVA-2026"                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ VENTAJAS DEL NUEVO SISTEMA

1. **Formato consistente** - Todas las referencias usan TEMPORADA-####
2. **Fácil identificación** - Sabes la especie/categoría solo viendo el REF ASLI
3. **Organización por temporada** - Agrupación automática por tipo de fruta
4. **Escalable** - Fácil agregar nuevas temporadas
5. **Sin duplicados** - El trigger usa SECURITY DEFINER

---

## 🛠️ AGREGAR NUEVAS TEMPORADAS

Si quieres agregar más especies o temporadas, edita la función `determinar_temporada()`:

```sql
-- Ejemplo: Agregar NUECES
IF v_especie_lower LIKE '%nuez%' 
   OR v_especie_lower LIKE '%almendra%'
   OR v_especie_lower LIKE '%avellana%' THEN
    RETURN 'FRUTOS-SECOS-2026';
END IF;
```

Luego ejecuta el script nuevamente.

---

## 📝 EJEMPLOS DE REFERENCIAS

```
CHERRY-25-26-0001
CHERRY-25-26-0002
CHERRY-25-26-0638
POMACEA-CAROZO-2026-0001
POMACEA-CAROZO-2026-0007
UVA-2026-0001
UVA-2026-0002
PALTA-2026-0001
PALTA-2026-0002
CITRICOS-2026-0001
BERRIES-2026-0001
TROPICAL-2026-0001
GENERAL-2026-0001
```

---

## ⚠️ IMPORTANTE

1. **Ya NO se usa el formato A####**
2. **TODAS las especies tienen temporada**
3. **El frontend NO genera REF ASLI** (lo hace el trigger SQL)
4. **Los registros existentes NO se modifican** (solo los nuevos)

---

## 🎉 RESULTADO FINAL

Ahora cuando crees cualquier registro:

```
Especie: CEREZA     → CHERRY-25-26-0638
Especie: MANZANA    → POMACEA-CAROZO-2026-0007
Especie: UVA        → UVA-2026-0001
Especie: PALTA      → PALTA-2026-0001
Especie: LIMON      → CITRICOS-2026-0001
Especie: FRUTILLA   → BERRIES-2026-0001
Especie: MANGO      → TROPICAL-2026-0001
Especie: ESPARRAGO  → GENERAL-2026-0001
```

**¡Todo automático, sin intervención del frontend!** 🚀
