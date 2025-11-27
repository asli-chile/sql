-- Crear tabla de registros
CREATE TABLE IF NOT EXISTS registros (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ingresado TIMESTAMPTZ,
  ref_asli TEXT NOT NULL,
  ejecutivo TEXT NOT NULL,
  shipper TEXT NOT NULL,
  booking TEXT NOT NULL,
  cant_cont INTEGER,
  contenedor TEXT NOT NULL,
  naviera TEXT NOT NULL,
  nave_inicial TEXT NOT NULL,
  especie TEXT NOT NULL,
  temperatura INTEGER,
  cbm INTEGER,
  ct TEXT NOT NULL,
  co2 INTEGER,
  o2 INTEGER,
  pol TEXT NOT NULL,
  pod TEXT NOT NULL,
  deposito TEXT NOT NULL,
  etd TIMESTAMPTZ,
  eta TIMESTAMPTZ,
  tt INTEGER,
  flete TEXT NOT NULL,
  estado TEXT NOT NULL CHECK (estado IN ('PENDIENTE', 'CONFIRMADO', 'CANCELADO')),
  roleada_desde TEXT NOT NULL,
  ingreso_stacking TIMESTAMPTZ,
  tipo_ingreso TEXT NOT NULL CHECK (tipo_ingreso IN ('NORMAL', 'EARLY', 'LATE', 'EXTRA LATE')),
  numero_bl TEXT NOT NULL,
  estado_bl TEXT NOT NULL,
  contrato TEXT NOT NULL,
  semana_ingreso INTEGER,
  mes_ingreso INTEGER,
  semana_zarpe INTEGER,
  mes_zarpe INTEGER,
  semana_arribo INTEGER,
  mes_arribo INTEGER,
  facturacion TEXT NOT NULL,
  booking_pdf TEXT NOT NULL,
  comentario TEXT NOT NULL,
  observacion TEXT NOT NULL,
  row_original INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  updated_by TEXT,
  deleted_at TIMESTAMPTZ,
  deleted_by TEXT
);

-- Crear tabla de catálogos
CREATE TABLE IF NOT EXISTS catalogos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  categoria TEXT NOT NULL UNIQUE,
  valores TEXT[] NOT NULL DEFAULT '{}',
  mapping JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear tabla de control operacional
CREATE TABLE IF NOT EXISTS control_operacional (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ejecutivo TEXT NOT NULL,
  cliente TEXT NOT NULL,
  ref_asli TEXT NOT NULL,
  ref_cliente TEXT NOT NULL,
  tipo_transporte TEXT NOT NULL CHECK (tipo_transporte IN ('AÉREO', 'MARÍTIMO')),
  booking TEXT NOT NULL,
  nave TEXT NOT NULL,
  naviera TEXT NOT NULL,
  especie TEXT NOT NULL,
  puerto_embarque TEXT NOT NULL,
  destino TEXT NOT NULL,
  etd TIMESTAMPTZ,
  eta TIMESTAMPTZ,
  consignatario TEXT NOT NULL,
  prepaid_collect TEXT NOT NULL,
  planta TEXT NOT NULL,
  emision TEXT NOT NULL,
  deposito TEXT NOT NULL,
  transporte TEXT NOT NULL,
  contenedor TEXT NOT NULL,
  sello TEXT NOT NULL,
  tara INTEGER,
  porteo TEXT NOT NULL,
  sps TEXT NOT NULL,
  dus TEXT NOT NULL,
  numero_guia_despacho TEXT NOT NULL,
  fecha_guia TIMESTAMPTZ,
  tramo TEXT NOT NULL,
  valor_flete INTEGER,
  sobre_estadia BOOLEAN DEFAULT FALSE,
  normal BOOLEAN DEFAULT FALSE,
  late BOOLEAN DEFAULT FALSE,
  extra_late BOOLEAN DEFAULT FALSE,
  numero_proforma TEXT NOT NULL,
  valor5 INTEGER,
  valor25 INTEGER,
  kilos_netos INTEGER,
  numero_bl TEXT NOT NULL,
  estado_bl TEXT NOT NULL,
  aceptado BOOLEAN DEFAULT FALSE,
  legalizado BOOLEAN DEFAULT FALSE,
  row_original INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  updated_by TEXT
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_registros_ref_asli ON registros(ref_asli);
CREATE INDEX IF NOT EXISTS idx_registros_estado ON registros(estado);
CREATE INDEX IF NOT EXISTS idx_registros_naviera ON registros(naviera);
CREATE INDEX IF NOT EXISTS idx_registros_ejecutivo ON registros(ejecutivo);
CREATE INDEX IF NOT EXISTS idx_registros_especie ON registros(especie);
CREATE INDEX IF NOT EXISTS idx_registros_pol ON registros(pol);
CREATE INDEX IF NOT EXISTS idx_registros_pod ON registros(pod);
CREATE INDEX IF NOT EXISTS idx_registros_deposito ON registros(deposito);
CREATE INDEX IF NOT EXISTS idx_registros_ingresado ON registros(ingresado);
CREATE INDEX IF NOT EXISTS idx_registros_etd ON registros(etd);
CREATE INDEX IF NOT EXISTS idx_registros_eta ON registros(eta);
CREATE INDEX IF NOT EXISTS idx_registros_deleted_at ON registros(deleted_at);

-- Crear índices para control operacional
CREATE INDEX IF NOT EXISTS idx_control_operacional_ref_asli ON control_operacional(ref_asli);
CREATE INDEX IF NOT EXISTS idx_control_operacional_ejecutivo ON control_operacional(ejecutivo);
CREATE INDEX IF NOT EXISTS idx_control_operacional_cliente ON control_operacional(cliente);
CREATE INDEX IF NOT EXISTS idx_control_operacional_naviera ON control_operacional(naviera);
CREATE INDEX IF NOT EXISTS idx_control_operacional_especie ON control_operacional(especie);
CREATE INDEX IF NOT EXISTS idx_control_operacional_etd ON control_operacional(etd);
CREATE INDEX IF NOT EXISTS idx_control_operacional_eta ON control_operacional(eta);

-- Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Crear triggers para actualizar updated_at
DROP TRIGGER IF EXISTS update_registros_updated_at ON registros;
CREATE TRIGGER update_registros_updated_at 
  BEFORE UPDATE ON registros 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_catalogos_updated_at ON catalogos;
CREATE TRIGGER update_catalogos_updated_at 
  BEFORE UPDATE ON catalogos 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_control_operacional_updated_at ON control_operacional;
CREATE TRIGGER update_control_operacional_updated_at 
  BEFORE UPDATE ON control_operacional 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Habilitar Row Level Security (RLS)
ALTER TABLE registros ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalogos ENABLE ROW LEVEL SECURITY;
ALTER TABLE control_operacional ENABLE ROW LEVEL SECURITY;

-- Crear políticas de seguridad (ajustar según tus necesidades)
-- Permitir todas las operaciones solo para usuarios autenticados

-- Eliminar políticas anteriores para evitar conflictos
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON registros;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON catalogos;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON control_operacional;

CREATE POLICY "Enable all operations for authenticated users" ON registros
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all operations for authenticated users" ON catalogos
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all operations for authenticated users" ON control_operacional
  FOR ALL USING (auth.role() = 'authenticated');

-- Eliminar políticas públicas inseguras
-- Las políticas anteriores "Enable all operations for anonymous users" han sido eliminadas por seguridad
