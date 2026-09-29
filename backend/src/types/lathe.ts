// 1. 設備マスタ
export interface MachineMasterRow {
  id: number;
  machine_type: string;
  calculation_engine_type: string;
  machine_name: string;
  maker: string | null;
  model: string | null;
  max_rpm: number;
  created_at: Date;
  updated_at: Date | null;
}

export interface MachineDto {
  id: number;
  machineType: string;
  calculationEngineType: string;
  machineName: string;
  maker: string | null;
  model: string | null;
  maxRpm: number;
}

export interface QuoteMachineSelectionRow {
  id: number;
  quote_id: number;
  machine_id: number;
  priority: number;
  selected: number;
  created_at: Date;
  updated_at: Date | null;
}

// 2. 自動旋盤工程マスタ
export interface LatheProcessMasterRow {
  id: number;
  process_category: string;
  process_name: string;
  calculation_type: string;
  default_time_sec: number;
  enabled: number;
  created_at: Date;
  updated_at: Date | null;
}

// 3. 自動旋盤切削条件マスタ
export interface LatheConditionMasterRow {
  id: number;
  material_name: string;
  process_id: number;
  tool_type: string;
  diameter_min: number | null;
  diameter_max: number | null;
  vc: number;
  feed: number;
  ap: number | null;
  enabled: number;
  created_at: Date;
  updated_at: Date | null;
}

// 4. 非切削時間マスタ
export interface MachineTimeMasterRow {
  id: number;
  machine_type: string;
  parameter_name: string;
  time_sec: number;
  created_at: Date;
  updated_at: Date | null;
}

// 5. NC自動旋盤工程レコード (automatic_lathe_operations)
export interface AutomaticLatheOperationRow {
  id: number;
  quote_id: number;
  feature_id: number | null;
  sequence_no: number;
  process_id: number;
  machining_length: number;
  diameter: number;
  depth: number;
  repeat_count: number;
  feed: number;
  vc: number;
  cutting_time_sec: number;
  non_cutting_time_sec: number;
  total_time_sec: number;
  status: string;
  created_at: Date;
  updated_at: Date | null;
}

// レコード作成用入力型
export interface CreateLatheOperationInput {
  quoteId: number;
  featureId: number | null;
  sequenceNo: number;
  processId: number;
  machiningLength: number;
  diameter: number;
  depth: number;
  repeatCount?: number;
  feed?: number;
  vc?: number;
  cuttingTimeSec?: number;
  nonCuttingTimeSec?: number;
  totalTimeSec?: number;
  status?: 'GENERATED' | 'CONFIRMED' | 'MANUAL';
}

// レコード更新用入力型
export interface UpdateLatheOperationInput {
  sequenceNo?: number;
  processId?: number;
  machiningLength?: number;
  diameter?: number;
  depth?: number;
  repeatCount?: number;
  feed?: number;
  vc?: number;
  status?: 'GENERATED' | 'CONFIRMED' | 'MANUAL';
}

// API用 DTO (camelCase)
export interface AutomaticLatheOperationDto {
  id: number;
  quoteId: number;
  featureId: number | null;
  sequenceNo: number;
  processId: number;
  processName: string;
  processCategory: string;
  machiningLength: number;
  diameter: number;
  depth: number;
  repeatCount: number;
  feed: number;
  vc: number;
  rpm: number;
  cuttingTimeSec: number;
  nonCuttingTimeSec: number;
  totalTimeSec: number;
  status: string;
  createdAt: string;
  updatedAt: string | null;
}

// サイクルタイム集計結果DTO
export interface LatheCycleTimeSummaryDto {
  quoteId: number;
  machineName: string;
  calculationEngineType?: string;
  materialName: string;
  quantity: number;
  cuttingTimeSec: number;
  nonCuttingTimeSec: number;
  totalCycleTimeSec: number;
  totalLotTimeSec: number;
  operations: AutomaticLatheOperationDto[];
}

export function toAutomaticLatheOperationDto(
  row: AutomaticLatheOperationRow,
  processName = '',
  processCategory = '',
  rpm = 0
): AutomaticLatheOperationDto {
  return {
    id: Number(row.id),
    quoteId: Number(row.quote_id),
    featureId: row.feature_id !== null ? Number(row.feature_id) : null,
    sequenceNo: Number(row.sequence_no),
    processId: Number(row.process_id),
    processName,
    processCategory,
    machiningLength: Number(row.machining_length),
    diameter: Number(row.diameter),
    depth: Number(row.depth),
    repeatCount: Number(row.repeat_count),
    feed: Number(row.feed),
    vc: Number(row.vc),
    rpm,
    cuttingTimeSec: Number(row.cutting_time_sec),
    nonCuttingTimeSec: Number(row.non_cutting_time_sec),
    totalTimeSec: Number(row.total_time_sec),
    status: row.status,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : (row.updated_at ? String(row.updated_at) : null),
  };
}
