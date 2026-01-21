-- Script para arreglar la tabla costos_embarques
-- Este script elimina las políticas existentes y las vuelve a crear
-- TAMBIÉN ACTUALIZADO para incluir los nuevos campos de costos detallados

-- Primero, eliminar las políticas existentes si existen
DROP POLICY IF EXISTS "Users can read costos_embarques" ON costos_embarques;
DROP POLICY IF EXISTS "Users can insert costos_embarques" ON costos_embarques;
DROP POLICY IF EXISTS "Users can update costos_embarques" ON costos_embarques;
DROP POLICY IF EXISTS "Users can delete costos_embarques" ON costos_embarques;

-- Asegurarse de que la tabla existe
CREATE TABLE IF NOT EXISTS costos_embarques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registro_id UUID REFERENCES registros(id) ON DELETE CASCADE,
  booking TEXT NOT NULL,
  
  -- Detalle Reserva
  swb TEXT,

  -- Transporte Terrestre
  tt_flete NUMERIC(15, 2),
  tt_sobre_estadia NUMERIC(15, 2),
  tt_porteo NUMERIC(15, 2),
  tt_almacenamiento NUMERIC(15, 2),

  -- Coordinación
  coord_adm_espacio NUMERIC(15, 2),
  coord_comex NUMERIC(15, 2),
  coord_aga NUMERIC(15, 2),

  -- Costos Navieros
  nav_gate_out NUMERIC(15, 2),
  nav_seguridad_contenedor NUMERIC(15, 2),
  nav_matriz_fuera_plazo NUMERIC(15, 2),
  nav_correcciones NUMERIC(15, 2),
  nav_extra_late NUMERIC(15, 2),
  nav_telex_release NUMERIC(15, 2),
  nav_courier NUMERIC(15, 2),
  nav_pago_sag_cf_extra NUMERIC(15, 2),
  nav_pago_ucco_co_extra NUMERIC(15, 2),

  -- Otros
  rebates NUMERIC(15, 2),
  contrato_forwarder TEXT,
  
  -- Costos legacy (mantener por compatibilidad)
  flete NUMERIC(15, 2),
  deposito NUMERIC(15, 2),
  tarifas_extra NUMERIC(15, 2),
  demoras NUMERIC(15, 2),
  almacenaje NUMERIC(15, 2),
  otros NUMERIC(15, 2),
  
  -- Ingresos
  ingresos NUMERIC(15, 2),
  
  -- Metadatos
  moneda TEXT DEFAULT 'USD',
  fecha_actualizacion TIMESTAMP WITH TIME ZONE,
  notas TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_costos_embarques_registro_id ON costos_embarques(registro_id);
CREATE INDEX IF NOT EXISTS idx_costos_embarques_booking ON costos_embarques(booking);
CREATE INDEX IF NOT EXISTS idx_costos_embarques_created_at ON costos_embarques(created_at);

-- Habilitar RLS
ALTER TABLE costos_embarques ENABLE ROW LEVEL SECURITY;

-- Crear las políticas nuevamente
CREATE POLICY "Users can read costos_embarques"
  ON costos_embarques
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert costos_embarques"
  ON costos_embarques
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update costos_embarques"
  ON costos_embarques
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete costos_embarques"
  ON costos_embarques
  FOR DELETE
  TO authenticated
  USING (true);

-- Crear o reemplazar la función para el trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Eliminar el trigger si existe y crearlo nuevamente
DROP TRIGGER IF EXISTS update_costos_embarques_updated_at ON costos_embarques;

CREATE TRIGGER update_costos_embarques_updated_at
  BEFORE UPDATE ON costos_embarques
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comentarios para documentación
COMMENT ON TABLE costos_embarques IS 'Información financiera (costos e ingresos) por embarque';
COMMENT ON COLUMN costos_embarques.swb IS 'Sea Waybill';
COMMENT ON COLUMN costos_embarques.tt_flete IS 'Transporte Terrestre: Flete';
COMMENT ON COLUMN costos_embarques.tt_sobre_estadia IS 'Transporte Terrestre: Sobre estadía';
COMMENT ON COLUMN costos_embarques.tt_porteo IS 'Transporte Terrestre: Porteo';
COMMENT ON COLUMN costos_embarques.tt_almacenamiento IS 'Transporte Terrestre: Almacenamiento';
COMMENT ON COLUMN costos_embarques.coord_adm_espacio IS 'Coordinación: Adm. Espacio Naviero';
COMMENT ON COLUMN costos_embarques.coord_comex IS 'Coordinación: Comex';
COMMENT ON COLUMN costos_embarques.coord_aga IS 'Coordinación: AGA';
COMMENT ON COLUMN costos_embarques.nav_gate_out IS 'Costos Navieros: Gate Out';
COMMENT ON COLUMN costos_embarques.nav_seguridad_contenedor IS 'Costos Navieros: Seguridad Contenedor';
COMMENT ON COLUMN costos_embarques.nav_matriz_fuera_plazo IS 'Costos Navieros: Matriz Fuera de Plazo';
COMMENT ON COLUMN costos_embarques.nav_correcciones IS 'Costos Navieros: Correcciones';
COMMENT ON COLUMN costos_embarques.nav_extra_late IS 'Costos Navieros: Extra Late';
COMMENT ON COLUMN costos_embarques.nav_telex_release IS 'Costos Navieros: Telex Release';
COMMENT ON COLUMN costos_embarques.nav_courier IS 'Costos Navieros: Courier';
COMMENT ON COLUMN costos_embarques.nav_pago_sag_cf_extra IS 'Costos Navieros: Pago SAG - CF Extra';
COMMENT ON COLUMN costos_embarques.nav_pago_ucco_co_extra IS 'Costos Navieros: Pago UCCO - CO Extra';
