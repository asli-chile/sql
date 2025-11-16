## Mantenimiento Técnico - ASLI Gestión Logística

Documento para el equipo técnico que mantiene la aplicación (desarrolladores, DevOps, TI).

---

### 1. Código fuente, repositorio y ramas

- **Repositorio principal**
  - Proyecto Next.js con frontend en `app/` y lógica compartida en `src/`.
  - Carpeta `scripts/`: contiene scripts Node.js y SQL para tareas de mantenimiento y migraciones.

- **Buenas prácticas de ramas**
  - Usar una rama principal (`main` o `master`) protegida.
  - Crear ramas feature/bugfix/poc para cambios específicos.
  - Antes de mergear a producción, asegurarse de:
    - Pasar linters y pruebas básicas.
    - Actualizar documentación relevante en `docs/`.

---

### 2. Entornos: local, staging y producción

- **Entorno local**
  - Consultar:
    - `COMO-VER-LOCAL.md`
    - `CREAR-ENV-LOCAL.md`
    - `RESUMEN-CONFIGURACION-LOCAL.md`
    - `GUIA-TRABAJO-LOCAL-SEGURO.md`
  - Pasos estándar:
    1. Clonar el repo.
    2. Crear `.env.local` copiando las variables desde Vercel (o un gestor seguro) siguiendo las guías anteriores.
    3. Ejecutar `npm install` y luego `npm run dev` o el script `INICIAR-LOCAL.bat`.

- **Producción (Vercel)**
  - Documentación principal:
    - `DEPLOY-V2-VERCEL.md`
    - `INSTRUCCIONES-DEPLOY-VERCEL.md`
    - `PASOS-RAPIDOS-DEPLOY.md`
  - Flujo típico de deploy:
    1. Confirmar que la rama principal está estable y documentada.
    2. Verificar variables de entorno en Vercel (`CONFIGURAR-VERCEL-VARIABLES.md`).
    3. Lanzar deploy (por push o manual) y monitorear logs.
    4. Si hay errores, revisar `FIX-VERCEL-ERROR.md` y `SOLUCION-ERROR-VARIABLES-VERCEL.md`.

---

### 3. Base de datos Supabase y scripts SQL

- **Esquema principal**
  - `supabase-schema.sql` contiene la definición base de tablas y políticas.
  - Ajustes y migraciones adicionales se encuentran en la carpeta `scripts/`.

- **Posiciones de buques (módulo Seguimiento)**
  - Script: `scripts/create-vessel-positions-table.sql`.
  - Crea y mantiene:
    - Tabla `vessel_positions` (última posición por buque).
    - Tabla `vessel_position_history` (historial para dibujar rutas).
  - Incluye índices y políticas RLS para el rol `authenticated`.

- **Otros scripts frecuentes**
  - Correcciones de fechas, duplicados y campos nulos.
  - Limpieza de datos obsoletos en `registros` y tablas relacionadas.
  - Se recomienda:
    - Ejecutar estos scripts siempre en un entorno de pruebas antes de producción.
    - Registrar en un changelog interno qué scripts se aplicaron y cuándo.

---

### 4. Seguridad y manejo de secretos

- Referencias clave:
  - `ESTADO-SEGURIDAD-ACTUAL.md`
  - `SEGURIDAD-ANALISIS.md`
  - `LIMPIAR-CLAVES.md`
  - `LIMPEZA-PROYECTO.md`

- Buenas prácticas:
  - Nunca commitear claves o tokens en el repositorio.
  - Mantener todas las claves en Vercel, Supabase o un gestor de secretos.
  - Revisar periódicamente:
    - Políticas RLS en las tablas críticas (especialmente `registros`, `vessel_positions`, `vessel_position_history`).
    - Roles y permisos de usuarios de Supabase.
  - Aplicar guías de revocación de clave cuando sea necesario (`ALTERNATIVAS-REVOCAR-CLAVE.md`, `PASOS-REVOCAR-CLAVE.md`).

---

### 5. Tareas de mantenimiento recurrentes

- **Revisión de integridad de datos**
  - Ver scripts en `scripts/` que corrigen:
    - Fechas inconsistentes.
    - Valores nulos en campos clave.
    - Duplicados de `REF ASLI` o bookings.

- **Limpieza de registros y papelera**
  - Alinear la configuración de retención de registros borrados con las políticas internas.
  - Revisar `INSTRUCCIONES-PAPELERA.md` y `PASOS-SOLUCIONAR-BORRADO-ADMIN.md` cuando haya incidentes con borrados.

- **Monitoreo del módulo Seguimiento**
  - Confirmar que los cron jobs o procesos que alimentan `vessel_positions` y `vessel_position_history` siguen funcionando.
  - Supervisar consumo de la API AIS y ajustar la frecuencia de actualización si es necesario.

---

### 6. Gestión de incidencias

- Ante un problema en producción:
  1. Revisar logs en Vercel y en Supabase.
  2. Confirmar estado de variables de entorno.
  3. Verificar si hay cambios recientes en la rama de producción.
  4. Consultar las guías:
     - `SOLUCION-SIMPLE.md`
     - `SOLUCION-RAPIDA-INSERT.md`
     - `FIX-VERCEL-ERROR.md`
  5. Documentar la incidencia y la solución aplicada.

---

### 7. Relación con otros manuales

- **Usuarios finales** → `MANUAL-USUARIO-FINAL.md`.
- **Administradores funcionales** → `MANUAL-ADMIN.md`.
- **Equipo técnico** → este documento (`MANTENIMIENTO-TECNICO.md`) + scripts en `scripts/`.

---

Este documento sirve como mapa de alto nivel del mantenimiento técnico. Los detalles específicos están distribuidos en los archivos de `docs/` y los scripts de `scripts/`; al agregar nuevas funcionalidades se recomienda actualizar esta guía con enlaces a los nuevos recursos.


