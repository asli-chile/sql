# Respaldo del sitio web anterior

Copia de `web/` **antes del rediseño** (commit `942861e`).

## Producción

| Versión | Carpeta | Dominio sugerido |
|---------|---------|------------------|
| Nueva (rediseño) | `web/` | `asli.cl` |
| Anterior (respaldo) | `web-legacy/` | `prev.asli.cl` |

## Activar el respaldo en Vercel (sin perder la actual)

**Antes** de apuntar `asli.cl` al sitio nuevo:

1. En el proyecto Vercel que hoy sirve `asli.cl`, agrega el dominio `prev.asli.cl` (o `vieja.asli.cl`).
2. Así la versión que está online ahora queda accesible aunque cambies `asli.cl`.

## Publicar el rediseño nuevo

1. Proyecto **asli-web** (repo `asli-chile/sql`)
2. Root Directory: `web`
3. Dominio: `asli.cl` (+ `www.asli.cl`)

## Volver a esta versión (`web-legacy`)

1. Crea/usa un proyecto Vercel con Root Directory: `web-legacy`
2. O cambia temporalmente el Root Directory del proyecto de `asli.cl` a `web-legacy` y redespliega
3. Alternativa por git: `git checkout web-legacy-pre-redesign` / tag `web-pre-redesign-2026-08`

## Tags / ramas en GitHub

- Rama: `web-legacy-pre-redesign`
- Tag anterior: `web-pre-redesign-2026-08`
- Tag nuevo: `web-redesign-2026-08-10`
