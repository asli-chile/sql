/**
 * Tipos para el sistema de gestión de consignatarios
 */

export interface Consignatario {
  id: string;
  nombre: string;
  cliente: string;
  destino: string;
  
  // Datos del Consignee
  consignee_company: string;
  consignee_address?: string;
  consignee_attn?: string;
  consignee_uscc?: string;
  consignee_mobile?: string;
  consignee_email?: string;
  consignee_zip?: string;
  
  // Datos del Notify
  notify_company: string;
  notify_address?: string;
  notify_attn?: string;
  notify_uscc?: string;
  notify_mobile?: string;
  notify_email?: string;
  notify_zip?: string;
  
  // Metadatos
  activo: boolean;
  notas?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

export interface ConsignatarioFormData {
  nombre: string;
  cliente: string;
  destino: string;
  consignee_company: string;
  consignee_address: string;
  consignee_attn: string;
  consignee_uscc: string;
  consignee_mobile: string;
  consignee_email: string;
  consignee_zip: string;
  notify_company: string;
  notify_address: string;
  notify_attn: string;
  notify_uscc: string;
  notify_mobile: string;
  notify_email: string;
  notify_zip: string;
  notas: string;
}
