import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/lib/supabase';
import type { Registro } from '@/types/registros';

type DbClient = SupabaseClient<Database>;
type RegistroField = keyof Registro;

const CUSTOM_FIELD_MAP: Partial<Record<RegistroField, string>> = {
  refAsli: 'ref_asli',
  refCliente: 'ref_cliente',
  naviera: 'naviera',
  naveInicial: 'nave_inicial',
  tipoIngreso: 'tipo_ingreso',
  roleadaDesde: 'roleada_desde',
  ingresoStacking: 'ingreso_stacking',
  numeroBl: 'numero_bl',
  estadoBl: 'estado_bl',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  createdBy: 'created_by',
  updatedBy: 'updated_by',
  deletedAt: 'deleted_at',
  deletedBy: 'deleted_by',
};

const NULL_TOKEN = 'NULL';

const toSnakeCase = (value: string) =>
  value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();

export const mapRegistroFieldToDb = (field: RegistroField | string): string => {
  if (!field) {
    return '';
  }

  if (typeof field !== 'string') {
    return '';
  }

  const customMapping = CUSTOM_FIELD_MAP[field as RegistroField];
  if (customMapping) {
    return customMapping;
  }

  if (field.includes('_')) {
    return field;
  }

  return toSnakeCase(field);
};

export const normalizeHistoryValue = (value: unknown): string => {
  if (value === undefined || value === null) {
    return NULL_TOKEN;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeHistoryValue(item))
      .filter((entry) => entry !== NULL_TOKEN)
      .join(' ');
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  if (typeof value === 'number' && Number.isNaN(value)) {
    return NULL_TOKEN;
  }

  const stringValue = String(value).trim();
  if (stringValue.length === 0) {
    return NULL_TOKEN;
  }

  return stringValue;
};

export const valuesAreDifferent = (previousValue: unknown, nextValue: unknown): boolean => {
  return normalizeHistoryValue(previousValue) !== normalizeHistoryValue(nextValue);
};

type LogHistoryEntryParams = {
  registroId?: string | null;
  field: RegistroField | string;
  previousValue: unknown;
  newValue: unknown;
};

export const logHistoryEntry = async (
  supabase: DbClient,
  { registroId, field, previousValue, newValue }: LogHistoryEntryParams,
) => {
  if (!registroId) {
    return;
  }

  const previous = normalizeHistoryValue(previousValue);
  const next = normalizeHistoryValue(newValue);

  if (previous === next) {
    return;
  }

  const campo = mapRegistroFieldToDb(field);

  const { error } = await supabase.rpc(
    'crear_historial_manual',
    {
      registro_uuid: registroId,
      campo,
      valor_anterior: previous,
      valor_nuevo: next,
    } as never,
  );

  if (error) {
    console.warn(`⚠️ Error registrando historial (${campo}) para registro ${registroId}:`, error);
  }
};


