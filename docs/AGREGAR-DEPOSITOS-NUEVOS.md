# Funcionalidad: Agregar Depósitos Nuevos con Confirmación

## 📋 Descripción

El sistema permite agregar depósitos nuevos desde el modal "Nuevo Registro", pero requiere confirmación del usuario antes de guardarlos en el catálogo.

## 🎯 Funcionamiento

### 1. Escribir Depósito Nuevo
En el campo "Depósito", puedes:
- **Seleccionar** un depósito existente del dropdown
- **Escribir** el nombre de un depósito nuevo que no existe

### 2. Confirmación Requerida
Cuando escribes un depósito nuevo y presionas Enter/Tab o haces clic fuera:
- ✅ Aparece un **diálogo de confirmación** preguntando:
  > El depósito **"NOMBRE_DEPOSITO"** no existe en el catálogo.  
  > ¿Deseas agregarlo como nuevo depósito disponible?

### 3. Opciones
- **"Sí, agregar"**: El depósito se guarda en el catálogo y se usa en el formulario
- **"Cancelar"**: El campo de depósito se limpia y no se guarda nada

### 4. Guardado en Base de Datos
Si confirmas:
- ✅ Se guarda en la tabla `catalogos` con `categoria='depositos'`
- ✅ Se agrega al array `valores` ordenado alfabéticamente
- ✅ Queda disponible inmediatamente para futuros registros

## 🔧 Diferencias con Naves

| Característica | Naves | Depósitos |
|---|---|---|
| **Confirmación** | ❌ No requiere (automático) | ✅ Sí requiere (diálogo) |
| **Guardado** | Inmediato al escribir | Solo si se confirma |
| **Tabla** | `catalogos_naves` | `catalogos` |
| **Campo limpiado si cancela** | No aplica | Sí, se limpia |

## 🎨 Diseño del Diálogo

### Tema Oscuro
- Fondo: `bg-slate-900`
- Borde: `border-slate-700`
- Texto: `text-slate-100` / `text-slate-300`

### Tema Claro
- Fondo: `bg-white`
- Borde: `border-gray-300`
- Texto: `text-gray-900` / `text-gray-700`

### Botones
- **Cancelar**: Gris, sin guardado
- **Sí, agregar**: Azul/Sky, guarda el depósito

## 🔄 Flujo de Trabajo

```
Usuario escribe depósito nuevo
    ↓
Usuario presiona Enter/Tab o hace clic fuera
    ↓
Sistema detecta que no existe
    ↓
Aparece diálogo de confirmación
    ↓
Usuario elige:
    ├─ "Sí, agregar" → Guarda en catalogos → Usa en formulario
    └─ "Cancelar" → Campo se limpia → No guarda nada
```

## 🚀 Ejemplo de Uso

1. En el campo "Depósito", escribes **"DEPOSITO NUEVO"**
2. Presionas **Enter** o haces clic en otro campo
3. Aparece el diálogo:
   > El depósito **"DEPOSITO NUEVO"** no existe en el catálogo.  
   > ¿Deseas agregarlo como nuevo depósito disponible?
4. Eliges **"Sí, agregar"**
5. El depósito se guarda en la BD
6. El formulario mantiene "DEPOSITO NUEVO" seleccionado
7. La próxima vez, aparecerá en el dropdown

## 🐛 Razón de la Confirmación

A diferencia de las naves (que siempre están asociadas a una naviera específica), los **depósitos son valores globales** que afectan a todos los usuarios y registros.

Por eso:
- ✅ Se pide confirmación para evitar errores tipográficos
- ✅ El usuario puede revisar el nombre antes de guardarlo
- ✅ Se evitan depósitos duplicados con variaciones de mayúsculas

## 📝 Implementación Técnica

### Estado Local
```typescript
const [showDepositoConfirmation, setShowDepositoConfirmation] = useState(false);
const [pendingDeposito, setPendingDeposito] = useState<string>('');
const [depositoPendingResolve, setDepositoPendingResolve] = useState<((confirm: boolean) => void) | null>(null);
```

### Función de Confirmación
```typescript
const confirmAndSaveDeposito = async (depositoNombre: string): Promise<boolean> => {
  return new Promise((resolve) => {
    setPendingDeposito(depositoNombre);
    setShowDepositoConfirmation(true);
    setDepositoPendingResolve(() => resolve);
  });
};
```

### Guardado en Catalogos
```typescript
const { data: catalogoData } = await supabase
  .from('catalogos')
  .select('valores')
  .eq('categoria', 'depositos')
  .single();

const valoresActuales = catalogoData?.valores || [];

await supabase
  .from('catalogos')
  .update({
    valores: [...valoresActuales, pendingDeposito].sort(),
    updated_at: new Date().toISOString()
  })
  .eq('categoria', 'depositos');
```

## ✅ Beneficios

1. **Control de calidad**: Evita errores tipográficos en valores globales
2. **Revisión visual**: El usuario ve claramente qué va a agregar
3. **Cancelación fácil**: Si fue un error, simplemente cancelas
4. **Experiencia clara**: El diálogo explica exactamente qué pasará

---

**Fecha de implementación**: Febrero 2026  
**Archivo modificado**: `src/components/modals/AddModal.tsx`  
**Funciones principales**: 
- `confirmAndSaveDeposito()`
- `handleDepositoConfirmation()`
