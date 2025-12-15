# 🧪 Instrucciones para Tests

## 📦 Instalación

Primero, instala las dependencias de testing:

```bash
npm install
```

Esto instalará todas las nuevas dependencias de testing que agregamos.

## 🚀 Ejecutar Tests

### Ejecutar todos los tests
```bash
npm test
```

### Ejecutar tests en modo watch (automático al guardar)
```bash
npm run test:watch
```

### Ejecutar tests con cobertura
```bash
npm run test:coverage
```

## 📁 Estructura de Tests

Los tests deben estar en:
- `src/**/__tests__/**/*.test.tsx` o `*.test.ts`
- `src/**/*.test.tsx` o `*.test.ts`

## ✍️ Escribir Tests

### Ejemplo básico:
```typescript
import { renderHook } from '@testing-library/react';
import { useUser } from '@/hooks/useUser';

describe('useUser', () => {
  it('debe funcionar correctamente', () => {
    const { result } = renderHook(() => useUser());
    expect(result.current).toBeDefined();
  });
});
```

## 📊 Cobertura Actual

Actualmente tenemos:
- ✅ Tests para `useUser` hook
- ✅ Tests para `logger` utility

**Meta**: Aumentar cobertura gradualmente hasta al menos 70%

## 🎯 Próximos Tests a Crear

1. Tests para `ref-asli-utils.ts`
2. Tests para componentes críticos (DataTable, modales)
3. Tests E2E con Playwright (futuro)

## 🔍 Debugging Tests

Si un test falla:

1. Ejecuta solo ese test: `npm test -- nombre-del-test`
2. Usa `console.log` dentro del test para debuggear
3. Revisa el output de Jest para ver qué falló

## ⚠️ Notas Importantes

- Los tests se ejecutan en un entorno aislado
- `localStorage` y `window` están mockeados
- Next.js router está mockeado
- Variables de entorno de test están en `jest.setup.js`

