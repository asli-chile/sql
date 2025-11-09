-- =====================================================
-- CREACIÓN DE TABLA DE TRANSPORTES
-- =====================================================
-- Campos solicitados:
-- SEMANA, EXPORT., PLANTA, DEPOSITO, BOOKING, NAVE, NAVIERA,
-- STACKING, CUT OFF, LATE, CONTENEDOR, SELLO, TARA, ESPECIE,
-- Tº, VENT, POL, POD, FECHA PLANTA, GUIA DESPACHO, TRANSPORTES,
-- CONDUCTOR, RUT, FONO, PATENTES
-- =====================================================

-- Crear extensión gen_random_uuid si no existe
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Crear tabla transportes
CREATE TABLE IF NOT EXISTS transportes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  semana INTEGER,
  exportacion TEXT,
  planta TEXT,
  deposito TEXT,
  booking TEXT,
  nave TEXT,
  naviera TEXT,
  stacking DATE,
  cut_off DATE,
  late BOOLEAN DEFAULT FALSE,
  contenedor TEXT,
  sello TEXT,
  tara NUMERIC,
  especie TEXT,
  temperatura NUMERIC,
  vent TEXT,
  pol TEXT,
  pod TEXT,
  fecha_planta DATE,
  guia_despacho TEXT,
  transportes TEXT,
  conductor TEXT,
  rut TEXT,
  fono TEXT,
  patentes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  updated_by TEXT
);

-- Habilitar RLS
ALTER TABLE transportes ENABLE ROW LEVEL SECURITY;

-- Trigger para set_user_fields (usa función existente)
DROP TRIGGER IF EXISTS transportes_set_user_fields ON transportes;
CREATE TRIGGER transportes_set_user_fields
BEFORE INSERT OR UPDATE ON transportes
FOR EACH ROW
EXECUTE FUNCTION set_user_fields();

-- =====================================================
-- POLÍTICAS RLS (alineadas con registros)
-- =====================================================

-- Select: admins, ejecutivos (@asli.cl) y propietarios
CREATE POLICY transportes_select_policy
ON transportes
FOR SELECT
USING (
  is_admin() OR
  is_ejecutivo() OR
  created_by = get_current_user_id()::TEXT
);

-- Insert: admins, ejecutivos y usuarios normales
CREATE POLICY transportes_insert_policy
ON transportes
FOR INSERT
WITH CHECK (
  is_admin() OR
  is_ejecutivo() OR
  EXISTS (
    SELECT 1
    FROM usuarios u
    WHERE u.auth_user_id = auth.uid()
      AND u.rol = 'usuario'
  )
);

-- Update: solo admin o ejecutivo
CREATE POLICY transportes_update_policy
ON transportes
FOR UPDATE
USING (
  is_admin() OR is_ejecutivo()
)
WITH CHECK (
  is_admin() OR is_ejecutivo()
);

-- Delete: solo admin
CREATE POLICY transportes_delete_policy
ON transportes
FOR DELETE
USING (is_admin());

-- Índices sugeridos
CREATE INDEX IF NOT EXISTS idx_transportes_booking ON transportes(booking);
CREATE INDEX IF NOT EXISTS idx_transportes_semana ON transportes(semana);

