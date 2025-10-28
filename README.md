# Sistema ASLI - Gestión de Embarques

Sistema web para la gestión de embarques y contenedores desarrollado con Next.js, Supabase y Tailwind CSS.

## 🚀 Características

- **Gestión de Registros**: CRUD completo de embarques y contenedores
- **Autenticación**: Sistema de login con Supabase Auth
- **Filtros Avanzados**: Filtrado por múltiples criterios
- **Vista Responsive**: Tabla y vista de tarjetas para móviles
- **Tema Oscuro/Claro**: Interfaz adaptable
- **Exportación**: Exportar datos filtrados a Excel
- **Historial**: Seguimiento de cambios en registros
- **Edición Múltiple**: Editar varios registros simultáneamente

## 🛠️ Tecnologías

- **Frontend**: Next.js 16, React 19, TypeScript
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI, Lucide React
- **Data Table**: TanStack Table
- **Deployment**: Vercel

## 📦 Instalación

1. Clonar el repositorio:
```bash
git clone <repository-url>
cd asli-supabase
```

2. Instalar dependencias:
```bash
npm install
```

3. Configurar variables de entorno:
```bash
cp .env.example .env.local
```

4. Configurar las variables en `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key
```

5. Ejecutar en desarrollo:
```bash
npm run dev
```

## 🚀 Deploy en Vercel

1. Conectar repositorio con Vercel
2. Configurar variables de entorno en Vercel
3. Deploy automático en cada push

## 📱 Uso

- **Login**: Usar credenciales de Supabase
- **Dashboard**: Vista general de estadísticas
- **Registros**: Gestión completa de embarques
- **Filtros**: Buscar y filtrar registros
- **Exportar**: Descargar datos en Excel

## 🔧 Desarrollo

- **Linting**: `npm run lint`
- **Build**: `npm run build`
- **Start**: `npm start`

## 📄 Licencia

Privado - ASLI