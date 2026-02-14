# Funcionalidad: Agregar Naves Nuevas

## 📋 Descripción

El sistema ahora permite agregar naves nuevas directamente desde el modal "Nuevo Registro" sin necesidad de editarlas manualmente en la base de datos.

## 🎯 Funcionamiento

### 1. Seleccionar Naviera
- Primero, selecciona una naviera del dropdown "Naviera"

### 2. Escribir Nave Nueva
- En el campo "Nave", puedes:
  - **Seleccionar** una nave existente del dropdown
  - **Escribir** el nombre de una nave nueva que no existe en el catálogo

### 3. Aceptar el Valor Personalizado
Cuando escribes una nave nueva:
- El dropdown mostrará: **✓ Presiona Enter o Tab para usar "NOMBRE_NAVE"**
- Presiona **Enter**, **Tab**, o **haz clic fuera del campo** para aceptar el valor
- La nave NO se borrará al hacer clic fuera (comportamiento corregido)

### 4. Guardado Automático
Cuando aceptas una nave nueva:
- ✅ Se guarda automáticamente en la tabla `catalogos_naves`
- ✅ Se asigna a la naviera seleccionada
- ✅ Se marca como activa (`activo: true`)
- ✅ Queda disponible inmediatamente para futuros registros

### 5. Mensaje Informativo
- Si no hay naves registradas para una naviera, aparece un mensaje:
  > 💡 No hay naves registradas. Escribe el nombre de la nave y se agregará automáticamente.

## 🔧 Implementación Técnica

### Componente Combobox
Se agregó una nueva prop `allowCustomValue` al componente `Combobox`:
- `allowCustomValue={true}`: Permite escribir valores personalizados
- `allowCustomValue={false}`: Solo permite seleccionar de las opciones (comportamiento por defecto)

### Base de Datos
La nave se inserta en `catalogos_naves` con los siguientes campos:
```sql
{
  nombre: 'NOMBRE_NAVE',
  naviera_id: 'uuid-de-la-naviera',
  naviera_nombre: 'NOMBRE_NAVIERA',
  activo: true
}
```

### Validaciones
- ✅ Verifica que no exista una nave con el mismo nombre para esa naviera
- ✅ Solo guarda si hay una naviera seleccionada
- ✅ Elimina espacios en blanco del nombre de la nave
- ✅ Convierte el nombre a mayúsculas automáticamente

### Estado Local
- La nave nueva se agrega al estado local inmediatamente
- No es necesario recargar la página
- Aparece ordenada alfabéticamente en el dropdown

## 📊 Beneficios

1. **Eficiencia**: No necesitas salir del modal para agregar naves nuevas
2. **Consistencia**: Las naves quedan correctamente asociadas a su naviera
3. **Disponibilidad inmediata**: La nave nueva está disponible al instante
4. **Base de datos actualizada**: El catálogo crece orgánicamente con el uso
5. **Experiencia de usuario mejorada**: El valor no se borra al hacer clic fuera

## 🔄 Flujo de Trabajo

```
Usuario selecciona Naviera
    ↓
Usuario escribe nombre de Nave nueva
    ↓
Sistema muestra: "✓ Presiona Enter o Tab para usar 'NOMBRE_NAVE'"
    ↓
Usuario presiona Enter/Tab o hace clic fuera
    ↓
Sistema detecta que no existe
    ↓
Sistema guarda en catalogos_naves
    ↓
Sistema actualiza estados locales
    ↓
Nave disponible inmediatamente
```

## 🚀 Ejemplo de Uso

1. Seleccionas "MAERSK" como naviera
2. Escribes "MAERSK LONDON" en el campo Nave
3. El sistema muestra: **✓ Presiona Enter o Tab para usar "MAERSK LONDON"**
4. Presionas **Enter** o **Tab**
5. Se guarda automáticamente en la BD
6. Ahora puedes continuar y completar el campo "Viaje"
7. La próxima vez que selecciones "MAERSK", "MAERSK LONDON" aparecerá en el dropdown

## 🐛 Correcciones Realizadas

### Problema Original
- El valor escrito se borraba al hacer clic fuera del campo
- No se podía continuar al campo "Viaje"
- No se guardaba la nave nueva

### Solución
- Componente `Combobox` modificado para aceptar valores personalizados
- Prop `allowCustomValue` agregada
- Lógica de "handleClickOutside" actualizada
- Soporte para teclas Enter y Tab

---

**Fecha de implementación**: Febrero 2026  
**Archivos modificados**: 
- `src/components/ui/Combobox.tsx`
- `src/components/modals/AddModal.tsx`  
**Función principal**: `saveNewNaveToDatabase()`
