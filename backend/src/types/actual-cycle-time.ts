// DBレコード型 (snake_case)
export interface ActualCycleTimeRow {
  id: number;
  quote_id: number;
  machine_id: number | null;
  production_date: string | Date | null;
  quantity: number;
  cycle_time_result_id: number | null;
  actual_cycle_time_sec: number;
  setup_time_sec: number;
  operator_name: string | null;
  status: string;
  source: string;
  notes: string | null;
  created_at: Date;
  updated_at: Date | null;
  // JOIN用
  machine_name?: string | null;
}

// 実績登録用入力型
export interface CreateActualCycleTimeInput {
  quoteId: number;
  machineId?: number | null;
  productionDate?: string | null;
  quantity: number;
  cycleTimeResultId?: number | null;
  actualCycleTimeSec: number;
  setupTimeSec?: number;
  operatorName?: string | null;
  status?: string;
  notes?: string | null;
}

// 実績取得DTO (camelCase)
export interface ActualCycleTimeDto {
  id: number;
  quoteId: number;
  machineId: number | null;
  machineName: string | null;
  productionDate: string | null;
  quantity: number;
  cycleTimeResultId: number | null;
  actualCycleTimeSec: number;
  setupTimeSec: number;
  operatorName: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string | null;
}

// 差異比較DTO
export interface CycleTimeComparisonDto {
  quoteId: number;
  machineName: string;
  estimateSec: number;
  actualSec: number;
  differenceSec: number;
  differenceRate: number;
  actualCount: number;
  latestActualDate: string | null;
}

export function toActualCycleTimeDto(row: ActualCycleTimeRow): ActualCycleTimeDto {
  let prodDateStr: string | null = null;
  if (row.production_date) {
    if (row.production_date instanceof Date) {
      prodDateStr = row.production_date.toISOString().split('T')[0];
    } else {
      prodDateStr = String(row.production_date).split('T')[0];
    }
  }

  return {
    id: Number(row.id),
    quoteId: Number(row.quote_id),
    machineId: row.machine_id !== null ? Number(row.machine_id) : null,
    machineName: row.machine_name || null,
    productionDate: prodDateStr,
    quantity: Number(row.quantity),
    cycleTimeResultId: row.cycle_time_result_id !== null ? Number(row.cycle_time_result_id) : null,
    actualCycleTimeSec: Number(row.actual_cycle_time_sec),
    setupTimeSec: Number(row.setup_time_sec),
    operatorName: row.operator_name || null,
    status: row.status,
    notes: row.notes || null,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : (row.updated_at ? String(row.updated_at) : null),
  };
}
