// DBレコード型 (snake_case)
export interface OperationRow {
  id: number;
  quote_id: number;
  feature_id: number | null;
  standard_condition_id: number | null;
  sequence_no: number;
  operation_type: string;
  mode: string;
  tool_category: string;
  work_diameter: number;
  cutting_length: number;
  passes: number;
  vc: number;
  feed_per_rev: number | null;
  feed_per_tooth: number | null;
  ap: number | null;
  ae: number | null;
  rpm: number;
  feed_rate: number;
  cutting_time_sec: number;
  non_cutting_time_sec: number;
  total_time_sec: number;
  condition_source: string;
  is_manual_override: number; // TINYINT(1)
  created_at: Date;
  updated_at: Date | null;
}

// レコード作成用入力型
export interface CreateOperationInput {
  quoteId: number;
  featureId: number | null;
  sequenceNo: number;
  operationType: string;
  description: string;
  machineType: string;
  status: 'GENERATED' | 'CONFIRMED' | 'MANUAL';
  workDiameter: number;
  cuttingLength: number;
}

// レコード更新用入力型
export interface UpdateOperationInput {
  sequenceNo?: number;
  description?: string;
  machineType?: string;
  status?: 'GENERATED' | 'CONFIRMED' | 'MANUAL';
}

// APIレスポンスDTO (camelCase)
export interface OperationDto {
  id: number;
  quoteId: number;
  featureId: number | null;
  sequenceNo: number;
  operationType: string;
  description: string;
  machineType: string;
  status: string;
  workDiameter: number;
  cuttingLength: number;
  createdAt: string;
  updatedAt: string | null;
}

// 工程一覧レスポンスDTO
export interface OperationListResponseDto {
  items: OperationDto[];
}

// 工程生成レスポンスDTO
export interface GenerateOperationsResponseDto {
  quoteId: number;
  operationCount: number;
}

export function toOperationDto(row: OperationRow): OperationDto {
  return {
    id: Number(row.id),
    quoteId: Number(row.quote_id),
    featureId: row.feature_id !== null ? Number(row.feature_id) : null,
    sequenceNo: Number(row.sequence_no),
    operationType: row.operation_type,
    description: row.mode || row.operation_type,
    machineType: row.tool_category,
    status: row.condition_source,
    workDiameter: Number(row.work_diameter),
    cuttingLength: Number(row.cutting_length),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : (row.updated_at ? String(row.updated_at) : null),
  };
}
