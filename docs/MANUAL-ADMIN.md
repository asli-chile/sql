## Manual de Administrador - ASLI Gestión Logística

Guía condensada para usuarios con perfil **administrador** o de **TI interna**.

---

### 1. Responsabilidades del administrador

- Gestionar usuarios y permisos.
- Mantener configuraciones críticas (variables de entorno, URLs de servicios externos).
- Supervisar la seguridad (RLS en Supabase, revocación de claves, limpieza de datos sensibles).
- Coordinar con TI el despliegue en Vercel y el versionado en GitHub.

---

### 2. Gestión de usuarios y accesos

- **Altas y bajas de usuarios**
  - La creación y administración de usuarios se realiza en Supabase y/o en las pantallas internas definidas para ello.
  - Revisar las guías:
    - `INSTRUCCIONES-FIX-INSERT-USUARIOS.md`
    - `INSTRUCCIONES-FIX-USUARIOS-NORMALES.md`
    - `INSTRUCCIONES-EJECUTIVOS-CLIENTES.md`
  - Buenas prácticas:
    - Asignar solo los roles necesarios (principio de mínimo privilegio).
    - Desactivar usuarios que ya no trabajan con el sistema antes de eliminar registros.

- **Revocación de claves y accesos**
  - Documentos de referencia:
    - `ALTERNATIVAS-REVOCAR-CLAVE.md`
    - `PASOS-REVOCAR-CLAVE.md`
  - Usar estos procedimientos cuando:
    - Un usuario deja la empresa.
    - Se sospecha de compromiso de credenciales.

---

### 3. Configuración del entorno y seguridad

- **Variables de entorno**
  - Se documentan en:
    - `COMO-USAR-VARIABLES-ENTORNO.md`
    - `CREAR-ENV-LOCAL.md`
    - `CONFIGURAR-VERCEL-VARIABLES.md`
  - Variables críticas (ejemplos):
    - Claves de Supabase (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
    - URLs de Google Sheets para exportación.
    - Configuración de APIs externas (por ejemplo, API AIS).

- **Seguridad y RLS**
  - Revisión de políticas y estado general:
    - `ESTADO-SEGURIDAD-ACTUAL.md`
    - `SEGURIDAD-ANALISIS.md`
    - `INSTRUCCIONES-RLS-ACTUALIZADAS.md`
  - Puntos clave:
    - Todas las tablas sensibles deben tener **Row Level Security** activado.
    - Las políticas deben permitir acceso solo a usuarios autenticados y, cuando aplique, solo a sus propios datos.

- **Limpieza de claves y datos sensibles**
  - Referencias:
    - `LIMPIAR-CLAVES.md`
    - `LIMPEZA-PROYECTO.md`
  - Objetivo:
    - Evitar que claves o datos sensibles queden en el repositorio o en logs públicos.

---

### 4. Deploy, versiones y entorno local

- **Trabajo local seguro**
  - Ver `GUIA-TRABAJO-LOCAL-SEGURO.md` y `RESUMEN-CONFIGURACION-LOCAL.md`.
  - Pasos típicos:
    - Clonar el repositorio.
    - Crear archivo `.env.local` siguiendo `CREAR-ENV-LOCAL.md`.
    - Ejecutar el script de inicio local (`INICIAR-LOCAL.bat` o guía correspondiente).

- **Deploy en Vercel**
  - Documentos clave:
    - `DEPLOY-V2-VERCEL.md`
    - `INSTRUCCIONES-DEPLOY-VERCEL.md`
    - `PASOS-RAPIDOS-DEPLOY.md`
    - `FIX-VERCEL-ERROR.md`
  - Resumen de flujo:
    1. Confirmar que el repositorio está actualizado en GitHub.
    2. Verificar variables de entorno en Vercel.
    3. Trigger de deploy (push a rama principal o deploy manual).
    4. Revisar logs en caso de error y apoyarse en las guías anteriores.

---

### 5. Mantenimiento funcional (datos y módulos)

- **Registros de embarques**
  - Uso normal está documentado en `MANUAL-USUARIO-FINAL.md`.
  - El administrador debe:
    - Supervisar integridad de datos (evitar duplicados, revisar REF ASLI).
    - Aplicar scripts de corrección cuando existan datos históricos incorrectos (ver carpeta `scripts/`).

- **Facturas**
  - Revisar `INSTRUCCIONES-FACTURAS.md` para flujos específicos de facturación.

- **Seguimiento de buques**
  - Documentación técnica en `seguimiento-buques.md` y script `scripts/create-vessel-positions-table.sql`.
  - El administrador debe:
    - Verificar que las tablas `vessel_positions` y `vessel_position_history` existan y tengan RLS.
    - Supervisar el consumo de la API AIS y la frecuencia de actualización.

---

### 6. Procedimientos de soporte y correcciones rápidas

- **Errores comunes**
  - Variables de entorno mal configuradas:
    - Ver `SOLUCION-ERROR-VARIABLES-VERCEL.md` y `SOLUCION-SIMPLE.md`.
  - Problemas con inserts o duplicados:
    - `SOLUCION-RAPIDA-INSERT.md`
    - `INSTRUCCIONES-FIX-CREATED-BY-REF-ASLI.md`
  - Borrado de admin o usuarios críticos:
    - `PASOS-SOLUCIONAR-BORRADO-ADMIN.md`

- **Asignación y configuración de ejecutivos**
  - `GUIA-RAPIDA-ASIGNACION.md`
  - `RESUMEN-CONFIGURACION-EJECUTIVOS.md`

---

### 7. Organización de la documentación

- Para el día a día:
  - Usuarios finales → `MANUAL-USUARIO-FINAL.md`.
  - Administradores → este `MANUAL-ADMIN.md`.

- Para detalles técnicos profundos:
  - Ver los archivos específicos en `docs/` y los scripts en la carpeta `scripts/`.

---

Este manual resume las tareas clave del rol administrador sin repetir todo el detalle técnico. Ante cambios importantes (nuevos módulos, nuevas integraciones) se recomienda actualizar este archivo y enlazar los documentos especializados que correspondan.


