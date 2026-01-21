-- Script para actualizar la estructura de costos_embarques
-- Agrega campos para el nuevo desglose de costos

-- Detalle Reserva (SWB es el único nuevo aquí que se guarda en costos, los otros son de registros)
ALTER TABLE costos_embarques ADD COLUMN IF NOT EXISTS swb TEXT;

-- Transporte Terrestre
ALTER TABLE costos_embarques ADD COLUMN IF NOT EXISTS tt_flete NUMERIC(15, 2);
ALTER TABLE costos_embarques ADD COLUMN IF NOT EXISTS tt_sobre_estadia NUMERIC(15, 2);
ALTER TABLE costos_embarques ADD COLUMN IF NOT EXISTS tt_porteo NUMERIC(15, 2);
ALTER TABLE costos_embarques ADD COLUMN IF NOT EXISTS tt_almacenamiento NUMERIC(15, 2);

-- Coordinación
ALTER TABLE costos_embarques ADD COLUMN IF NOT EXISTS coord_adm_espacio NUMERIC(15, 2);
ALTER TABLE costos_embarques ADD COLUMN IF NOT EXISTS coord_comex NUMERIC(15, 2);
ALTER TABLE costos_embarques ADD COLUMN IF NOT EXISTS coord_aga NUMERIC(15, 2);

-- Costos Navieros
ALTER TABLE costos_embarques ADD COLUMN IF NOT EXISTS nav_gate_out NUMERIC(15, 2);
ALTER TABLE costos_embarques ADD COLUMN IF NOT EXISTS nav_seguridad_contenedor NUMERIC(15, 2);
ALTER TABLE costos_embarques ADD COLUMN IF NOT EXISTS nav_matriz_fuera_plazo NUMERIC(15, 2);
ALTER TABLE costos_embarques ADD COLUMN IF NOT EXISTS nav_correcciones NUMERIC(15, 2);
ALTER TABLE costos_embarques ADD COLUMN IF NOT EXISTS nav_extra_late NUMERIC(15, 2);
ALTER TABLE costos_embarques ADD COLUMN IF NOT EXISTS nav_telex_release NUMERIC(15, 2);
ALTER TABLE costos_embarques ADD COLUMN IF NOT EXISTS nav_courier NUMERIC(15, 2);
ALTER TABLE costos_embarques ADD COLUMN IF NOT EXISTS nav_pago_sag_cf_extra NUMERIC(15, 2);
ALTER TABLE costos_embarques ADD COLUMN IF NOT EXISTS nav_pago_ucco_co_extra NUMERIC(15, 2);

-- Otros
ALTER TABLE costos_embarques ADD COLUMN IF NOT EXISTS rebates NUMERIC(15, 2);
ALTER TABLE costos_embarques ADD COLUMN IF NOT EXISTS contrato_forwarder TEXT;

-- Comentarios
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
