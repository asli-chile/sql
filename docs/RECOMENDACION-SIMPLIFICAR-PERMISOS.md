# 🎯 Simplificar Sistema de Permisos

## 📋 Objetivos a Mantener

✅ **Clientes**: Solo ven sus datos y pueden descargar documentos  
✅ **Ejecutivos**: Solo ven sus clientes específicos asignados (tabla `ejecutivo_clientes`)  
✅ **Admin**: Acceso total  
✅ **Emails secundarios**: Se mantiene sin cambios

---

## 🔄 Cambios Propuestos

### **Antes (4 roles)**
- admin
- ejecutivo (@asli.cl)
- usuario (puede crear, solo ve propios)
- lector (solo lectura)

### **Después (3 roles)**
- admin
- ejecutivo (@asli.cl)
- cliente (reemplaza "usuario" y "lector")

---

## 📊 Cambios Específicos

### 1. Unificar "usuario" y "lector" → "cliente"

```typescript
// ANTES
const canAdd = ['admin', 'usuario'].includes(rol) || isEjecutivo;

// DESPUÉS
const canAdd = rol === 'admin' || isEjecutivo; // Clientes NO pueden crear
```

### 2. Eliminar campo `puede_subir`

```typescript
// ANTES
const canUpload = isAdminOrEjecutivo && puede_subir === true;

// DESPUÉS
const canUpload = rol === 'admin' || email.endsWith('@asli.cl');
```

### 3. Políticas RLS Simplificadas

```sql
-- 1. Admin ve todo
CREATE POLICY "Admin ve todo" ON registros FOR SELECT
  USING (EXISTS (SELECT 1 FROM usuarios WHERE auth_user_id = auth.uid() AND rol = 'admin'));

-- 2. Ejecutivo SOLO ve sus clientes asignados
CREATE POLICY "Ejecutivo ve solo sus clientes" ON registros FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      JOIN ejecutivo_clientes ec ON ec.ejecutivo_id = u.id
      WHERE u.auth_user_id = auth.uid()
        AND u.email LIKE '%@asli.cl'
        AND ec.cliente_nombre = registros.shipper
        AND ec.activo = true
    )
  );

-- 3. Cliente ve solo sus registros
CREATE POLICY "Cliente ve sus registros" ON registros FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.auth_user_id = auth.uid()
        AND u.rol = 'cliente'
        AND (registros.cliente_email = u.email OR registros.shipper = u.nombre)
    )
  );
```

---

## ✅ Beneficios

- **Menos roles**: 3 en lugar de 4
- **Menos campos**: Eliminar `puede_subir`
- **Lógica más clara**: Menos condiciones
- **Mismo nivel de seguridad**: RLS sigue protegiendo

---

## 🚀 Plan de Migración

1. **Migrar roles**: `UPDATE usuarios SET rol = 'cliente' WHERE rol IN ('usuario', 'lector')`
2. **Verificar ejecutivos**: Asegurar que todos tienen clientes en `ejecutivo_clientes`
3. **Actualizar políticas RLS**: Ejecutar script simplificado
4. **Actualizar código**: `useUser.tsx` y componentes
5. **Eliminar `puede_subir`**: Remover del código (opcional: eliminar columna)

---

## ⚠️ Importante

- ✅ **Emails secundarios**: No se tocan, siguen funcionando igual
- ✅ **Ejecutivos**: Solo ven clientes en `ejecutivo_clientes` (si no tienen clientes, no ven nada)
- ✅ **Clientes**: Solo ven sus propios registros y pueden descargar documentos

---

## 📚 Archivos a Modificar

- `src/hooks/useUser.tsx` - Simplificar permisos
- `app/documentos/page.tsx` - Eliminar `puede_subir`
- `scripts/crear-politicas-rls-actualizadas.sql` - Políticas simplificadas
- `app/registros/page.tsx` - Simplificar filtrado

## 📚 Archivos que NO se Tocan

- ✅ `app/dashboard/profile/emails/page.tsx` - Emails secundarios
- ✅ `app/api/user/emails/route.ts` - API emails secundarios
- ✅ Sistema de `user_emails` completo
