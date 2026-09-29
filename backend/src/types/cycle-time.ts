// DBレコード型 (snake_case)
export interface CycleTimeResultRow {
  id: number;
  quote_id: number;
  cutting_time_sec: number;
  non_cutting_time_sec: number;
  total_cycle_time_sec: number;
  quantity: number;
  total_lot_time_sec: number;
  calculation_version: string;
  created_at: Date;
  updated_at: Date | null;
}

// 登録用入力型
export interface CreateCycleTimeResultInput {
  quoteId: number;
  cuttingTimeSec: number;
  nonCuttingTimeSec: number;
  totalCycleTimeSec: number;
  quantity: number;
  totalLotTimeSec: number;
  calculationVersion?: string;
}

// 切削条件マスタ型
export interface StandardCuttingConditionRow {
  id: number;
  material_group: string;
  material_name: string;
  operation_type: string;
  mode: string;
  tool_category: string;
  diameter_min: number | null;
  diameter_max: number | null;
  vc: number;
  feed_per_rev: number | null;
  feed_per_tooth: number | null;
  ap: number | null;
  ae: number | null;
  source_name: string | null;
  source_url: string | null;
  enabled: number;
  created_at: Date;
  updated_at: Date | null;
}

// 各工程の計算明細
export interface OperationCycleTimeDetailDto {
  operationId: number;
  sequenceNo: number;
  operationType: string;
  description: string;
  workDiameter: number;
  cuttingLength: number;
  vc: number;
  feedPerRev: number;
  rpm: number;
  feedRate: number;
  cuttingTimeSec: number;
  nonCuttingTimeSec: number;
  totalTimeSec: number;
  conditionSource: string;
}

// サイクルタイム計算結果DTO (camelCase)
export interface CycleTimeResultDto {
  id: number;
  quoteId: number;
  cuttingTimeSec: number;
  nonCuttingTimeSec: number;
  totalCycleTimeSec: number;
  quantity: number;
  totalLotTimeSec: number;
  calculationVersion: string;
  operations: OperationCycleTimeDetailDto[];
  createdAt: string;
  updatedAt: string | null;
}

export function toCycleTimeResultDto(
  row: CycleTimeResultRow,
  operations: OperationCycleTimeDetailDto[] = []
): CycleTimeResultDto {
  return {
    id: Number(row.id),
    quoteId: Number(row.quote_id),
    cuttingTimeSec: Number(row.cutting_time_sec),
    nonCuttingTimeSec: Number(row.non_cutting_time_sec),
    totalCycleTimeSec: Number(row.total_cycle_time_sec),
    quantity: Number(row.quantity),
    totalLotTimeSec: Number(row.total_lot_time_sec),
    calculationVersion: row.calculation_version,
    operations,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : (row.updated_at ? String(row.updated_at) : null),
  };
}
