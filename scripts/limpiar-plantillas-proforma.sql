-- Script para limpiar y recrear la tabla plantillas_proforma
-- Ejecuta esto PRIMERO si ya existe la tabla

-- Eliminar tabla y todo lo relacionado
DROP TABLE IF EXISTS public.plantillas_proforma CASCADE;

-- Eliminar funciones si existen
DROP FUNCTION IF EXISTS public.update_plantillas_proforma_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.ensure_single_active_plantilla() CASCADE;

-- Ahora ejecuta el script crear-tabla-plantillas-proforma.sql completo
