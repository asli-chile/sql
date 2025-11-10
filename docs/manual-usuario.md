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


