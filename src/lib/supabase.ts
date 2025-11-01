import { createClient } from '@supabase/supabase-js'

// Usar SOLO variables de entorno (sin fallbacks hardcodeados para seguridad)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('❌ ERROR: Variables de entorno NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY deben estar definidas en .env.local')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Tipos para las tablas de Supabase
export interface Database {
  public: {
    Tables: {
      registros: {
        Row: {
          id: string
          ingresado: string | null
          ref_asli: string
          ejecutivo: string
          shipper: string
          booking: string
          contenedor: string | string[]
          naviera: string
          nave_inicial: string
          especie: string
          temperatura: number | null
          cbm: number | null
          ct: string
          co2: number | null
          o2: number | null
          pol: string
          pod: string
          deposito: string
          etd: string | null
          eta: string | null
          tt: number | null
          flete: string
          estado: 'PENDIENTE' | 'CONFIRMADO' | 'CANCELADO'
          roleada_desde: string
          ingreso_stacking: string | null
          tipo_ingreso: 'NORMAL' | 'EARLY' | 'LATE' | 'EXTRA LATE'
          numero_bl: string
          estado_bl: string
          contrato: string
          semana_ingreso: number | null
          mes_ingreso: number | null
          semana_zarpe: number | null
          mes_zarpe: number | null
          semana_arribo: number | null
          mes_arribo: number | null
          facturacion: string
          booking_pdf: string
          comentario: string
          observacion: string
          row_original: number | null
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
          deleted_at: string | null
          deleted_by: string | null
        }
        Insert: {
          id?: string
          ingresado?: string | null
          ref_asli: string
          ejecutivo: string
          shipper: string
          booking: string
          contenedor: string | string[]
          naviera: string
          nave_inicial: string
          especie: string
          temperatura?: number | null
          cbm?: number | null
          ct: string
          co2?: number | null
          o2?: number | null
          pol: string
          pod: string
          deposito: string
          etd?: string | null
          eta?: string | null
          tt?: number | null
          flete: string
          estado: 'PENDIENTE' | 'CONFIRMADO' | 'CANCELADO'
          roleada_desde: string
          ingreso_stacking?: string | null
          tipo_ingreso: 'NORMAL' | 'EARLY' | 'LATE' | 'EXTRA LATE'
          numero_bl: string
          estado_bl: string
          contrato: string
          semana_ingreso?: number | null
          mes_ingreso?: number | null
          semana_zarpe?: number | null
          mes_zarpe?: number | null
          semana_arribo?: number | null
          mes_arribo?: number | null
          facturacion: string
          booking_pdf: string
          comentario: string
          observacion: string
          row_original?: number | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
        }
        Update: {
          id?: string
          ingresado?: string | null
          ref_asli?: string
          ejecutivo?: string
          shipper?: string
          booking?: string
          contenedor?: string
          naviera?: string
          nave_inicial?: string
          especie?: string
          temperatura?: number | null
          cbm?: number | null
          ct?: string
          co2?: number | null
          o2?: number | null
          pol?: string
          pod?: string
          deposito?: string
          etd?: string | null
          eta?: string | null
          tt?: number | null
          flete?: string
          estado?: 'PENDIENTE' | 'CONFIRMADO' | 'CANCELADO'
          roleada_desde?: string
          ingreso_stacking?: string | null
          tipo_ingreso?: 'NORMAL' | 'EARLY' | 'LATE' | 'EXTRA LATE'
          numero_bl?: string
          estado_bl?: string
          contrato?: string
          semana_ingreso?: number | null
          mes_ingreso?: number | null
          semana_zarpe?: number | null
          mes_zarpe?: number | null
          semana_arribo?: number | null
          mes_arribo?: number | null
          facturacion?: string
          booking_pdf?: string
          comentario?: string
          observacion?: string
          row_original?: number | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
        }
      }
      catalogos: {
        Row: {
          id: string
          categoria: string
          valores: string[]
          mapping?: Record<string, string[]>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          categoria: string
          valores: string[]
          mapping?: Record<string, string[]>
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          categoria?: string
          valores?: string[]
          mapping?: Record<string, string[]>
          created_at?: string
          updated_at?: string
        }
      }
      control_operacional: {
        Row: {
          id: string
          ejecutivo: string
          cliente: string
          ref_asli: string
          ref_cliente: string
          tipo_transporte: 'AÉREO' | 'MARÍTIMO'
          booking: string
          nave: string
          naviera: string
          especie: string
          puerto_embarque: string
          destino: string
          etd: string | null
          eta: string | null
          consignatario: string
          prepaid_collect: string
          planta: string
          emision: string
          deposito: string
          transporte: string
          contenedor: string | string[]
          sello: string
          tara: number | null
          porteo: string
          sps: string
          dus: string
          numero_guia_despacho: string
          fecha_guia: string | null
          tramo: string
          valor_flete: number | null
          sobre_estadia: boolean
          normal: boolean
          late: boolean
          extra_late: boolean
          numero_proforma: string
          valor5: number | null
          valor25: number | null
          kilos_netos: number | null
          numero_bl: string
          estado_bl: string
          aceptado: boolean
          legalizado: boolean
          row_original: number | null
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          ejecutivo: string
          cliente: string
          ref_asli: string
          ref_cliente: string
          tipo_transporte: 'AÉREO' | 'MARÍTIMO'
          booking: string
          nave: string
          naviera: string
          especie: string
          puerto_embarque: string
          destino: string
          etd?: string | null
          eta?: string | null
          consignatario: string
          prepaid_collect: string
          planta: string
          emision: string
          deposito: string
          transporte: string
          contenedor: string | string[]
          sello: string
          tara?: number | null
          porteo: string
          sps: string
          dus: string
          numero_guia_despacho: string
          fecha_guia?: string | null
          tramo: string
          valor_flete?: number | null
          sobre_estadia?: boolean
          normal?: boolean
          late?: boolean
          extra_late?: boolean
          numero_proforma: string
          valor5?: number | null
          valor25?: number | null
          kilos_netos?: number | null
          numero_bl: string
          estado_bl: string
          aceptado?: boolean
          legalizado?: boolean
          row_original?: number | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          ejecutivo?: string
          cliente?: string
          ref_asli?: string
          ref_cliente?: string
          tipo_transporte?: 'AÉREO' | 'MARÍTIMO'
          booking?: string
          nave?: string
          naviera?: string
          especie?: string
          puerto_embarque?: string
          destino?: string
          etd?: string | null
          eta?: string | null
          consignatario?: string
          prepaid_collect?: string
          planta?: string
          emision?: string
          deposito?: string
          transporte?: string
          contenedor?: string
          sello?: string
          tara?: number | null
          porteo?: string
          sps?: string
          dus?: string
          numero_guia_despacho?: string
          fecha_guia?: string | null
          tramo?: string
          valor_flete?: number | null
          sobre_estadia?: boolean
          normal?: boolean
          late?: boolean
          extra_late?: boolean
          numero_proforma?: string
          valor5?: number | null
          valor25?: number | null
          kilos_netos?: number | null
          numero_bl?: string
          estado_bl?: string
          aceptado?: boolean
          legalizado?: boolean
          row_original?: number | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
      }
    }
  }
}
