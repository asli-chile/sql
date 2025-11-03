# 🌐 CÓMO VER TU APP EN LOCAL

## ✅ Servidor Iniciado

El servidor de desarrollo está corriendo en segundo plano.

## 🔗 Abre tu Navegador

El servidor debería estar disponible en:

### **http://localhost:3000**

Abre esa URL en tu navegador.

## 📋 Pasos

1. **Abre tu navegador**
2. **Ve a**: `http://localhost:3000`
3. **Verás tu app** en modo desarrollo

## 🛠️ Comandos Útiles

### Ver si el servidor está corriendo:
```bash
netstat -ano | findstr :3000
```

### Detener el servidor:
Pulsa `Ctrl+C` en la terminal donde está corriendo

### Reiniciar el servidor:
```bash
npm run dev
```

## ⚙️ Modo Desarrollo

- Los cambios se reflejan automáticamente (hot reload)
- Puedes ver errores en consola del navegador
- Puedes editar archivos y ver cambios al instante

## 🔍 Dónde Estás

- **Local**: http://localhost:3000
- **Producción**: Tu URL de Vercel

## 📝 Notas

- Si el puerto 3000 está ocupado, Next.js usará otro puerto
- Revisa la consola para ver en qué puerto está corriendo

