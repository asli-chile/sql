import { supabase } from './supabase';
import { Registro } from '@/types/registros';

// Función para convertir datos de Firebase a Supabase
export const convertFirebaseToSupabase = (firebaseData: any): any => {
  return {
    ref_asli: firebaseData.refAsli,
    ejecutivo: firebaseData.ejecutivo,
    shipper: firebaseData.shipper,
    booking: firebaseData.booking,
    contenedor: firebaseData.contenedor,
    naviera: firebaseData.naviera,
    nave_inicial: firebaseData.naveInicial,
    especie: firebaseData.especie,
    temperatura: firebaseData.temperatura,
    cbm: firebaseData.cbm,
    ct: firebaseData.ct,
    co2: firebaseData.co2,
    o2: firebaseData.o2,
    pol: firebaseData.pol,
    pod: firebaseData.pod,
    deposito: firebaseData.deposito,
    etd: firebaseData.etd?.toISOString() || null,
    eta: firebaseData.eta?.toISOString() || null,
    tt: firebaseData.tt,
    flete: firebaseData.flete,
    estado: firebaseData.estado,
    roleada_desde: firebaseData.roleadaDesde,
    ingreso_stacking: firebaseData.ingresoStacking?.toISOString() || null,
    tipo_ingreso: firebaseData.tipoIngreso,
    numero_bl: firebaseData.numeroBl,
    estado_bl: firebaseData.estadoBl,
    contrato: firebaseData.contrato,
    semana_ingreso: firebaseData.semanaIngreso,
    mes_ingreso: firebaseData.mesIngreso,
    semana_zarpe: firebaseData.semanaZarpe,
    mes_zarpe: firebaseData.mesZarpe,
    semana_arribo: firebaseData.semanaArribo,
    mes_arribo: firebaseData.mesArribo,
    facturacion: firebaseData.facturacion,
    booking_pdf: firebaseData.bookingPdf,
    comentario: firebaseData.comentario,
    observacion: firebaseData.observacion,
    row_original: firebaseData.rowOriginal,
    created_at: firebaseData.createdAt?.toISOString() || new Date().toISOString(),
    updated_at: firebaseData.updatedAt?.toISOString() || new Date().toISOString(),
    created_by: firebaseData.createdBy,
    updated_by: firebaseData.updatedBy,
    deleted_at: firebaseData.deletedAt?.toISOString() || null,
    deleted_by: firebaseData.deletedBy,
  };
};

// Función para convertir datos de Supabase a formato de la aplicación
export const convertSupabaseToApp = (supabaseData: any): Registro => {
  return {
    id: supabaseData.id,
    ingresado: supabaseData.ingresado ? new Date(supabaseData.ingresado) : null,
    refAsli: supabaseData.ref_asli,
    ejecutivo: supabaseData.ejecutivo,
    usuario: supabaseData.usuario || supabaseData.created_by || undefined,
    shipper: supabaseData.shipper,
    booking: supabaseData.booking,
    contenedor: supabaseData.contenedor,
    naviera: supabaseData.naviera,
    naveInicial: supabaseData.nave_inicial,
    especie: supabaseData.especie,
    temperatura: supabaseData.temperatura,
    cbm: supabaseData.cbm,
    ct: supabaseData.ct,
    co2: supabaseData.co2,
    o2: supabaseData.o2,
    pol: supabaseData.pol,
    pod: supabaseData.pod,
    deposito: supabaseData.deposito,
    etd: supabaseData.etd ? new Date(supabaseData.etd) : null,
    eta: supabaseData.eta ? new Date(supabaseData.eta) : null,
    tt: supabaseData.tt,
    flete: supabaseData.flete,
    estado: supabaseData.estado,
    roleadaDesde: supabaseData.roleada_desde,
    ingresoStacking: supabaseData.ingreso_stacking ? new Date(supabaseData.ingreso_stacking) : null,
    tipoIngreso: supabaseData.tipo_ingreso,
    numeroBl: supabaseData.numero_bl,
    estadoBl: supabaseData.estado_bl,
    contrato: supabaseData.contrato,
    semanaIngreso: supabaseData.semana_ingreso,
    mesIngreso: supabaseData.mes_ingreso,
    semanaZarpe: supabaseData.semana_zarpe,
    mesZarpe: supabaseData.mes_zarpe,
    semanaArribo: supabaseData.semana_arribo,
    mesArribo: supabaseData.mes_arribo,
    facturacion: supabaseData.facturacion,
    bookingPdf: supabaseData.booking_pdf,
    comentario: supabaseData.comentario,
    observacion: supabaseData.observacion,
    rowOriginal: supabaseData.row_original,
    createdAt: supabaseData.created_at ? new Date(supabaseData.created_at) : undefined,
    updatedAt: supabaseData.updated_at ? new Date(supabaseData.updated_at) : undefined,
    createdBy: supabaseData.created_by,
    updatedBy: supabaseData.updated_by,
    deletedAt: supabaseData.deleted_at ? new Date(supabaseData.deleted_at) : null,
    deletedBy: supabaseData.deleted_by,
  };
};

// Función para migrar registros desde Firebase a Supabase
export const migrateRegistros = async (firebaseData: any[]) => {
  try {
    console.log(`🔄 Iniciando migración de ${firebaseData.length} registros...`);
    
    const supabaseData = firebaseData.map(convertFirebaseToSupabase);
    
    const { data, error } = await supabase
      .from('registros')
      .insert(supabaseData);
    
    if (error) {
      console.error('Error migrando registros:', error);
      throw error;
    }
    
    console.log(`✅ ${firebaseData.length} registros migrados exitosamente`);
    return data;
  } catch (error) {
    console.error('Error en migración de registros:', error);
    throw error;
  }
};

// Función para migrar catálogos desde Firebase a Supabase
export const migrateCatalogos = async (catalogosData: any[]) => {
  try {
    console.log(`🔄 Iniciando migración de ${catalogosData.length} catálogos...`);
    
    const supabaseData = catalogosData.map(cat => ({
      categoria: cat.categoria,
      valores: cat.valores || [],
      mapping: cat.mapping || null,
    }));
    
    const { data, error } = await supabase
      .from('catalogos')
      .insert(supabaseData);
    
    if (error) {
      console.error('Error migrando catálogos:', error);
      throw error;
    }
    
    console.log(`✅ ${catalogosData.length} catálogos migrados exitosamente`);
    return data;
  } catch (error) {
    console.error('Error en migración de catálogos:', error);
    throw error;
  }
};
