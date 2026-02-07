-- Script para crear tabla de preferencias de usuario
-- Ejecutar en el SQL Editor de Supabase

-- Crear tabla de preferencias de usuario
CREATE TABLE IF NOT EXISTS preferencias_usuario (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID NOT NULL, -- auth_user_id de Supabase Auth
  pagina TEXT NOT NULL, -- Identificador de la página (ej: 'tablas-personalizadas')
  clave TEXT NOT NULL, -- Clave de la preferencia (ej: 'sort-order', 'column-widths')
  valor JSONB NOT NULL, -- Valor de la preferencia en formato JSON
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(usuario_id, pagina, clave) -- Una preferencia única por usuario, página y clave
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_preferencias_usuario_id ON preferencias_usuario(usuario_id);
CREATE INDEX IF NOT EXISTS idx_preferencias_pagina ON preferencias_usuario(pagina);
CREATE INDEX IF NOT EXISTS idx_preferencias_usuario_pagina ON preferencias_usuario(usuario_id, pagina);

-- Habilitar RLS (Row Level Security)
ALTER TABLE preferencias_usuario ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS para que cada usuario solo pueda ver/modificar sus propias preferencias
DROP POLICY IF EXISTS "Users can view their own preferences" ON preferencias_usuario;
CREATE POLICY "Users can view their own preferences"
  ON preferencias_usuario FOR SELECT
  USING (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Users can insert their own preferences" ON preferencias_usuario;
CREATE POLICY "Users can insert their own preferences"
  ON preferencias_usuario FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Users can update their own preferences" ON preferencias_usuario;
CREATE POLICY "Users can update their own preferences"
  ON preferencias_usuario FOR UPDATE
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Users can delete their own preferences" ON preferencias_usuario;
CREATE POLICY "Users can delete their own preferences"
  ON preferencias_usuario FOR DELETE
  USING (auth.uid() = usuario_id);

-- Comentarios
COMMENT ON TABLE preferencias_usuario IS 'Almacena preferencias personalizadas de cada usuario por página';
COMMENT ON COLUMN preferencias_usuario.usuario_id IS 'ID del usuario en Supabase Auth (auth.uid())';
COMMENT ON COLUMN preferencias_usuario.pagina IS 'Identificador de la página donde se aplica la preferencia';
COMMENT ON COLUMN preferencias_usuario.clave IS 'Clave única de la preferencia dentro de la página';
COMMENT ON COLUMN preferencias_usuario.valor IS 'Valor de la preferencia en formato JSON';
