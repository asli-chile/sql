# 📋 LISTA COMPLETA DE RUTAS PARA SUPABASE - ASLI.CL

## ✅ OPCIÓN RECOMENDADA: Wildcard (YA LO TIENES)

Ya tienes configurado el wildcard que cubre **TODAS** las rutas:
```
https://asli.cl/*
```

Esto debería ser suficiente para que todas las rutas funcionen. **NO necesitas agregar rutas individuales** si ya tienes el wildcard.

---

## 📝 LISTA COMPLETA DE RUTAS (Por si quieres agregarlas específicamente)

Si prefieres agregar rutas específicas en lugar del wildcard, aquí está la lista completa:

### 🔐 Autenticación
```
https://asli.cl/auth
```

### 📄 Páginas Principales
```
https://asli.cl/
https://asli.cl/contacto
```

### 📊 Dashboard y Subrutas
```
https://asli.cl/dashboard
https://asli.cl/dashboard/seguimiento
https://asli.cl/dashboard/servicios
https://asli.cl/dashboard/profile/emails
```

### 📁 Módulos de la ERP
```
https://asli.cl/registros
https://asli.cl/documentos
https://asli.cl/facturas
https://asli.cl/itinerario
https://asli.cl/transportes
https://asli.cl/tablas-personalizadas
https://asli.cl/mantenimiento
https://asli.cl/vessel-diagnose
```

### 👤 Perfil
```
https://asli.cl/profile
https://asli.cl/profile/emails
```

### 🔧 API (Opcional - generalmente no necesarias)
```
https://asli.cl/api/*
```

---

## 🎯 CONFIGURACIÓN ACTUAL RECOMENDADA

**Site URL:**
```
https://asli.cl
```

**Redirect URLs (Mínimo necesario):**
```
https://asli.cl/*
```

O si prefieres ser más específico:
```
https://asli.cl/auth
https://asli.cl/dashboard
https://asli.cl/dashboard/*
https://asli.cl/registros
https://asli.cl/documentos
https://asli.cl/facturas
https://asli.cl/itinerario
https://asli.cl/transportes
https://asli.cl/tablas-personalizadas
https://asli.cl/mantenimiento
https://asli.cl/vessel-diagnose
https://asli.cl/profile
https://asli.cl/profile/*
https://asli.cl/contacto
https://asli.cl/
```

---

## ✅ VERIFICACIÓN

Con el wildcard `https://asli.cl/*` configurado, **TODAS** estas rutas deberían funcionar automáticamente sin necesidad de agregarlas individualmente.

Si alguna ruta específica no funciona, puedes agregarla individualmente a la lista de Redirect URLs.
