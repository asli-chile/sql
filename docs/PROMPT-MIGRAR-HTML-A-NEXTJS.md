# 🎨 PROMPT: Migrar Página HTML Estática a Next.js con Diseño Coherente

## 📋 Instrucciones para el Asistente AI

Necesito convertir mi página web HTML estática a Next.js manteniendo el mismo formato y diseño visual que el proyecto actual. Aquí están las especificaciones del sistema de diseño:

### 🎨 **Sistema de Diseño del Proyecto**

#### **Colores y Temas:**

**Modo Oscuro (predeterminado):**
- Fondo principal: `bg-slate-950` o `bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950`
- Fondo de cards/paneles: `bg-slate-900/50` o `bg-slate-950/60`
- Bordes: `border-slate-800/60` o `border-slate-800/70`
- Texto principal: `text-slate-100` o `text-slate-200`
- Texto secundario: `text-slate-400` o `text-slate-500`
- Acentos: `text-sky-200`, `text-sky-400`, `border-sky-500/60`
- Botones primarios: `bg-gradient-to-r from-sky-500 to-indigo-500`

**Modo Claro:**
- Fondo principal: `bg-gray-50` o `bg-white`
- Fondo de cards: `bg-white`
- Bordes: `border-gray-200`
- Texto principal: `text-gray-900`
- Texto secundario: `text-gray-600`
- Acentos: `text-blue-600`, `border-blue-500`
- Botones primarios: `bg-blue-600`

#### **Tipografía:**
- Fuente: **Fira Sans Bold Italic** (ya configurada en el proyecto)
- Títulos: `text-sm font-semibold uppercase tracking-[0.3em] text-slate-400`
- Subtítulos: `text-xs font-semibold text-slate-100`
- Texto pequeño: `text-[10px]` o `text-xs`
- Peso: 700 (bold) por defecto

#### **Componentes Comunes:**

**Botones:**
```tsx
// Botón primario (modo oscuro)
className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-sky-500/20 transition-transform hover:scale-[1.02]"

// Botón secundario
className="inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/80 px-4 py-2 text-xs font-semibold text-slate-200 transition-colors hover:border-sky-500/60 hover:bg-slate-800/80 hover:text-sky-200"
```

**Cards/Paneles:**
```tsx
className="rounded-lg border border-slate-800/60 bg-slate-900/50 p-4"
// o con backdrop blur
className="rounded-xl border border-slate-800/70 bg-slate-950/60 backdrop-blur-xl shadow-lg"
```

**Inputs:**
```tsx
className="w-full rounded-lg border border-slate-800 bg-slate-900/80 py-2 px-3 text-xs text-slate-200 placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
```

**Headers flotantes:**
```tsx
className="absolute top-0 left-0 right-0 z-50 border-b border-slate-800/40 bg-slate-950/90 backdrop-blur-xl shadow-lg"
```

#### **Estructura de Archivos Next.js:**

```
app/
  tu-pagina/
    page.tsx          # Componente principal de la página
    layout.tsx        # Layout específico (opcional)
```

#### **Patrones de Código:**

1. **Usar 'use client'** si necesitas interactividad:
```tsx
'use client';
import { useState } from 'react';
```

2. **Layout base con gradiente:**
```tsx
<div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
  {/* Contenido */}
</div>
```

3. **Secciones con espaciado:**
```tsx
<section className="space-y-4 p-6">
  <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">
    Título de Sección
  </h2>
  {/* Contenido */}
</section>
```

4. **Grid responsivo:**
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
  {/* Items */}
</div>
```

### 📝 **Tareas Específicas:**

1. **Convertir HTML a JSX:**
   - Cambiar atributos HTML a camelCase (ej: `class` → `className`)
   - Convertir estilos inline a clases de Tailwind
   - Separar en componentes reutilizables si es necesario

2. **Aplicar sistema de colores:**
   - Reemplazar colores hardcodeados con las clases del sistema
   - Asegurar que funcione en modo oscuro y claro
   - Usar opacidades y gradientes según el patrón del proyecto

3. **Adaptar tipografía:**
   - Usar tamaños de texto del sistema (text-xs, text-sm, etc.)
   - Aplicar tracking y font-weight según el patrón
   - Mantener jerarquía visual

4. **Componentes interactivos:**
   - Convertir formularios HTML a componentes React controlados
   - Agregar estados con useState si es necesario
   - Implementar validación si aplica

5. **Responsive design:**
   - Usar breakpoints de Tailwind (sm:, md:, lg:, xl:)
   - Asegurar que se vea bien en móvil y desktop
   - Usar `flex`, `grid`, y utilidades responsive

6. **Iconos:**
   - Usar `lucide-react` para iconos (ya está en el proyecto)
   - Importar: `import { IconName } from 'lucide-react'`

7. **Animaciones y transiciones:**
   - Usar `transition-colors`, `transition-transform`
   - Efectos hover sutiles
   - Backdrop blur donde sea apropiado

### 🎯 **Resultado Esperado:**

- Página funcional en Next.js 15 con App Router
- Mismo diseño visual que el resto del proyecto
- Responsive y accesible
- Código limpio y mantenible
- Componentes reutilizables si aplica
- TypeScript tipado correctamente

### 📌 **Ejemplo de Conversión:**

**HTML Original:**
```html
<div class="card">
  <h2>Título</h2>
  <p>Contenido</p>
  <button>Click</button>
</div>
```

**Next.js Convertido:**
```tsx
'use client';

export default function MiPagina() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="rounded-lg border border-slate-800/60 bg-slate-900/50 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">
          Título
        </h2>
        <p className="mt-2 text-xs text-slate-200">
          Contenido
        </p>
        <button className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-2 text-xs font-semibold text-white transition-transform hover:scale-[1.02]">
          Click
        </button>
      </div>
    </div>
  );
}
```

---

## 🚀 **Cómo Usar Este Prompt:**

1. Comparte tu HTML estático completo
2. Indica qué funcionalidades interactivas necesitas (si las hay)
3. Especifica si necesitas formularios, modales, o componentes especiales
4. El asistente convertirá todo manteniendo la coherencia visual con el proyecto


