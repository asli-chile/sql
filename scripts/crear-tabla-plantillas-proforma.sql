-- Tabla para almacenar plantillas de proforma personalizadas
CREATE TABLE IF NOT EXISTS public.plantillas_proforma (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    cliente TEXT, -- Cliente asociado (ej: ALMAFRUIT, HAPPYFARM) - NULL = plantilla genérica
    descripcion TEXT,
    tipo_factura TEXT DEFAULT 'proforma', -- 'proforma', 'commercial_invoice', etc.
    archivo_url TEXT NOT NULL, -- URL del archivo Excel en Supabase Storage
    archivo_nombre TEXT NOT NULL, -- Nombre original del archivo
    archivo_size INTEGER, -- Tamaño en bytes
    
    -- Configuración adicional de la plantilla
    configuracion JSONB DEFAULT '{}'::jsonb, -- Configuraciones extra (idioma, formato de fecha, etc.)
    
    -- Metadatos de los marcadores usados (para validación)
    marcadores_usados TEXT[], -- Array de marcadores detectados en el archivo
    
    -- Control de versiones
    version INTEGER DEFAULT 1,
    activa BOOLEAN DEFAULT TRUE, -- Solo una plantilla activa por cliente
    es_default BOOLEAN DEFAULT FALSE, -- Plantilla por defecto para el cliente
    
    -- Auditoría
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Restricciones
    CONSTRAINT unique_plantilla_cliente_nombre UNIQUE (cliente, nombre)
);

-- Índices para búsqueda rápida
CREATE INDEX idx_plantillas_proforma_cliente ON public.plantillas_proforma(cliente);
CREATE INDEX idx_plantillas_proforma_activa ON public.plantillas_proforma(activa);
CREATE INDEX idx_plantillas_proforma_default ON public.plantillas_proforma(cliente, es_default) WHERE es_default = TRUE;

-- Habilitar RLS
ALTER TABLE public.plantillas_proforma ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
-- Admins y Rodrigo pueden ver todas las plantillas
CREATE POLICY "Admins can view all plantillas"
ON public.plantillas_proforma
FOR SELECT
USING (
    auth.uid() IN (
        SELECT auth_user_id 
        FROM public.usuarios 
        WHERE rol = 'admin' OR email = 'rodrigo.caceres@asli.cl'
    )
);

-- Admins y Rodrigo pueden insertar plantillas
CREATE POLICY "Admins can insert plantillas"
ON public.plantillas_proforma
FOR INSERT
WITH CHECK (
    auth.uid() IN (
        SELECT auth_user_id 
        FROM public.usuarios 
        WHERE rol = 'admin' OR email = 'rodrigo.caceres@asli.cl'
    )
);

-- Admins y Rodrigo pueden actualizar plantillas
CREATE POLICY "Admins can update plantillas"
ON public.plantillas_proforma
FOR UPDATE
USING (
    auth.uid() IN (
        SELECT auth_user_id 
        FROM public.usuarios 
        WHERE rol = 'admin' OR email = 'rodrigo.caceres@asli.cl'
    )
);

-- Admins y Rodrigo pueden eliminar plantillas
CREATE POLICY "Admins can delete plantillas"
ON public.plantillas_proforma
FOR DELETE
USING (
    auth.uid() IN (
        SELECT auth_user_id 
        FROM public.usuarios 
        WHERE rol = 'admin' OR email = 'rodrigo.caceres@asli.cl'
    )
);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.update_plantillas_proforma_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
CREATE TRIGGER update_plantillas_proforma_updated_at
BEFORE UPDATE ON public.plantillas_proforma
FOR EACH ROW
EXECUTE FUNCTION public.update_plantillas_proforma_updated_at();

-- Función para asegurar solo una plantilla activa por cliente
CREATE OR REPLACE FUNCTION public.ensure_single_active_plantilla()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.activa = TRUE AND NEW.es_default = TRUE THEN
        -- Desactivar otras plantillas default del mismo cliente
        UPDATE public.plantillas_proforma
        SET es_default = FALSE
        WHERE cliente = NEW.cliente 
          AND id != NEW.id 
          AND es_default = TRUE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para mantener una sola plantilla default por cliente
CREATE TRIGGER ensure_single_default_plantilla
BEFORE INSERT OR UPDATE ON public.plantillas_proforma
FOR EACH ROW
EXECUTE FUNCTION public.ensure_single_active_plantilla();

-- Comentarios para documentación
COMMENT ON TABLE public.plantillas_proforma IS 'Plantillas Excel personalizadas para facturas proforma';
COMMENT ON COLUMN public.plantillas_proforma.cliente IS 'Cliente asociado o NULL para plantilla genérica';
COMMENT ON COLUMN public.plantillas_proforma.configuracion IS 'Configuración adicional como idioma, formato de fecha, etc.';
COMMENT ON COLUMN public.plantillas_proforma.marcadores_usados IS 'Lista de marcadores detectados en la plantilla para validación';
COMMENT ON COLUMN public.plantillas_proforma.es_default IS 'Plantilla por defecto para el cliente (solo una activa por cliente)';
