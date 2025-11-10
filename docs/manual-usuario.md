# Manual para Humanos (no técnicos)

Guía rápida para sobrevivir y trabajar con la plataforma **Registros de Embarques**. Diseñada para presentar en reuniones y compartir con el equipo.

---

## 1. Entrar y ubicarte

1. Abre la web del proyecto.
2. Inicia sesión con tu correo/clave.
3. Verás el panel principal con:
   - **Tarjetas** (arriba): muestran totales de registros, bookings y contenedores, más un resumen por estado.
   - **Barra de acciones**: botones `Nuevo`, `Buscar`, `Filtros`, `Exportar`, `Reset`, etc.
   - **Tabla de registros**: todas las filas que podemos filtrar y editar.

---

## 2. Buscar y filtrar

- **Buscar**: campo a la izquierda. Escribe parte de un booking, cliente o naviera.
- **Filtros**: botón con el embudo. Selecciona criterios (cliente, naviera, estado, fechas, etc.).
- **Reset**: botón de recarga para quitar filtros y volver al estado original.

> Tip: las tarjetas de totales se actualizan según los filtros que apliques.

---

## 3. Crear un registro

1. Pulsa `Nuevo`.
2. Completa el formulario. Los campos con * son obligatorios.
3. El `REF ASLI` se genera automáticamente. No hace falta inventarlo.
4. Guarda con `Guardar registro`. Si falta algo, aparece un aviso en rojo.

---

## 4. Seleccionar y exportar

- Marca las casillas junto a cada fila.
- El botón `Exportar` envía los datos seleccionados a la plantilla de Google Sheets (con formato listo).
- Si existe la URL configurada, `Ver Sheets` abre una vista previa embebida; el botón “Abrir en pestaña” te manda a la hoja editable.

> Importante: las variables `NEXT_PUBLIC_GOOGLE_SHEETS_PREVIEW_URL` y `NEXT_PUBLIC_GOOGLE_SHEETS_SPREADSHEET_ID` deben estar configuradas en `.env` o Vercel.

---

## 5. Editar o borrar

- Pulsa el icono del lápiz para editar un registro.
- Para eliminar, selecciona la fila y usa la opción de borrar. Pasa primero por la **Papelera** antes de desaparecerlo para siempre.
- Papelera → botón en la barra superior. Desde ahí puedes restaurar o eliminar definitivamente. El modal ahora es estilo dark y se cierra clickeando fuera.

---

## 6. Generador de QR

- Botón `QR` en el header.
- Pega una URL o texto.
- `Generar` y luego `Descargar` para guardar el código como PNG.
- Se cierra haciendo clic fuera o presionando `Esc`.

---

## 7. Problemas frecuentes y soluciones

| Problema | Solución |
| --- | --- |
| Totales raros | Presiona `Reset` y revisa filtros activos |
| Botón `Ver Sheets` no aparece | Falta la URL `NEXT_PUBLIC_GOOGLE_SHEETS_PREVIEW_URL` |
| Error “REF ASLI duplicado” | Se genera uno nuevo automáticamente; si persiste, contactar a TI |
| Papelera no borra | Para eliminar permanente se usa la función `delete_registros_permanente`; revisar permisos de admin |
| QR no se descarga | Asegúrate de generar el código antes de pulsar `Descargar` |

---

## 8. Buenas prácticas

- Revisa tus selecciones antes de exportar a Sheets.
- Comenta cambios significativos en el campo de observaciones.
- Si la interfaz se ve distinta a lo esperado, toma captura y avisa (puede haber faltado una variable o filtro mal guardado).
- Mantén la documentación en `docs/` organizada; el repositorio se limpia para evitar archivos obsoletos (`backup/`, `QR GENERATOR/`, etc.).

---

## 9. Para la presentación

- **Slide 1**: Objetivo del sistema (control y exportación de embarques).
- **Slide 2**: ¿Cómo se ve la pantalla principal? (tarjetas + tabla).
- **Slide 3**: Flujo básico (completar registro, filtrar, exportar).
- **Slide 4**: Integración con Google Sheets (botón `Exportar`, vista previa y abrir en pestaña).
- **Slide 5**: Módulos extra (Papelera, Generador QR, botón `Nuevo` responsivo).
- **Slide 6**: Seguridad y control (REF ASLI único, papelera con recuperación, variables de entorno).
- **Slide 7**: Próximos pasos (limpieza de repositorio, documentación en `docs/`).

Con esta guía puedes presentar el proyecto sin tecnicismos, destacando que el sistema es fácil de usar, todos los procesos críticos tienen respaldo (Papelera, Google Sheets) y que la UI está optimizada para escritorio y móvil. ¡Que la demo fluya!
# Manual Express - Registros de Embarques

Guía pensada para presentar el proyecto al equipo, sin tecnicismos.

---

## 1. Entrar y orientarse

- Abrir la web del sistema e iniciar sesión.
- Verán el tablero con:
  - Tarjetas de totales (registros, bookings, contenedores, estados).
  - Barra de acciones (`Nuevo`, `Buscar`, `Filtros`, `Exportar`, etc.).
  - Tabla principal con todos los embarques.

> Si no ves la tabla completa, rueda hacia abajo; la interfaz es responsive.

---

## 2. Buscar y filtrar datos

- **Caja “Buscar…”**: escribir parte del booking, cliente u otra referencia.
- **Botón “Filtros”**: abre panel para acotar por naviera, especie, fechas, etc.
- **Botón “Reset”**: vuelve al estado inicial cuando las cifras no cuadran.

---

## 3. Crear un registro

1. Pulsar `Nuevo`.
2. Completar datos obligatorios (marcados con *). El `REF ASLI` se genera solo.
3. Clic en `Guardar registro`. Si falta algo, aparece aviso en rojo.

---

## 4. Seleccionar y exportar

- Marcar casillas de la tabla para seleccionar varios registros.
- `Exportar`: envía reporte a Google Sheets, conservando formato corporativo.
- `Ver Sheets`: abre una previsualización (aparece si está configurada la URL).
- El contador a la derecha indica cuántos registros están seleccionados.

---

## 5. Editar registros

- Icono de lápiz en cada fila.
- Se modifica la información y se guarda. El sistema mantiene referencias únicas.
- El historial queda accesible para auditoría rápida.

---

## 6. Papelera (control de errores)

- Botón con ícono de papelera en la parte superior.
- Desde ahí se puede **restaurar** registros o **eliminarlos definitivamente**.
- Existe opción para elegir cuántos días se conservan antes de la limpieza automática.
- El modal se cierra haciendo clic afuera o con la tecla `Esc`.

---

## 7. Generador de QR integrado

- Botón `QR` en la barra.
- Pegar URL o texto, pulsar `Generar`.
- Se puede descargar el QR en PNG.
- Se cierra con `Esc` o clic fuera de la ventana.

---

## 8. Problemas comunes y soluciones

| Situación                                   | Acción rápida                                  |
|---------------------------------------------|------------------------------------------------|
| Totales se ven raros                        | Pulsar `Reset` y revisar filtros activos       |
| No aparece “Ver Sheets”                     | Falta `NEXT_PUBLIC_GOOGLE_SHEETS_PREVIEW_URL`  |
| No guarda un registro                       | Revisar campos obligatorios                    |
| Mensaje “REF ASLI duplicado”                | Reintentar; el sistema genera uno nuevo        |
| No se ven cambios en Google Sheets          | Confirmar permisos o publicación de la hoja    |
| QR no descarga                              | Generarlo primero; luego pulsar `Descargar`    |

---

## 9. Buenas prácticas

- Verifica filtros antes de exportar.
- Describe cambios importantes en el campo de comentarios.
- Cuando exportes a Sheets, menciona quién lo hizo (se agrega automáticamente, pero se recomienda comentarlo al equipo).
- No borres directamente: primero a papelera, luego eliminación definitiva si corresponde.

---

## 10. En caso de dudas

- Captura de pantalla + mensaje en el canal de soporte si algo se ve diferente.
- Si la web no carga, refrescar y limpiar caché; si persiste, avisar a TI.
- Todo está centralizado en la página principal: el diseño es responsive y funciona tanto en escritorio como en móviles.

---

**Objetivo del proyecto:** simplificar el seguimiento de embarques, centralizando los reportes y evitando planillas sueltas.  
Este manual sirve para demostrar en la presentación que el flujo diario es claro, rápido y seguro para el equipo operativo.


