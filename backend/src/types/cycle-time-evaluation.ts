import { RowDataPacket } from 'mysql2';

/**
 * 差異分類 (PHASE13)
 */
export type DifferenceCategory =
  | 'CUTTING_CONDITION'
  | 'PROCESS_RULE'
  | 'NON_CUTTING_TIME'
  | 'SETUP_TIME'
  | 'OTHER';

/**
 * 評価ステータス
 */
export type EvaluationStatus = 'EVALUATED' | 'REVIEWED';

/**
 * cycle_time_evaluations テーブル行型
 */
export interface CycleTimeEvaluationRow extends RowDataPacket {
  id: number;
  quote_id: number;
  machine_id: number | null;
  machine_name?: string;
  calculated_cycle_time_sec: number;
  excel_cycle_time_sec: number | null;
  actual_cycle_time_sec: number | null;
  excel_difference_sec: number | null;
  excel_difference_rate: number | null;
  actual_difference_sec: number | null;
  actual_difference_rate: number | null;
  evaluation_status: EvaluationStatus;
  difference_category: DifferenceCategory;
  notes: string | null;
  created_at: Date;
}

/**
 * cycle_time_evaluations DTO (APIレスポンス)
 */
export interface CycleTimeEvaluationDto {
  id: number;
  quoteId: number;
  machineId: number | null;
  machineName: string;
  calculatedCycleTimeSec: number;
  excelCycleTimeSec: number | null;
  actualCycleTimeSec: number | null;
  excelDifferenceSec: number | null;
  excelDifferenceRate: number | null;
  actualDifferenceSec: number | null;
  actualDifferenceRate: number | null;
  evaluationStatus: EvaluationStatus;
  differenceCategory: DifferenceCategory;
  notes: string | null;
  createdAt: string;
}

/**
 * 評価登録リクエスト
 */
export interface CreateCycleTimeEvaluationRequest {
  machineId?: number | null;
  calculatedCycleTimeSec?: number | null;
  excelCycleTimeSec?: number | null;
  actualCycleTimeSec?: number | null;
  differenceCategory?: DifferenceCategory;
  notes?: string | null;
}

/**
 * lathe_correction_factors テーブル行型
 */
export interface LatheCorrectionFactorRow extends RowDataPacket {
  id: number;
  machine_id: number;
  machine_name?: string;
  material_name: string;
  process_type: string;
  factor: number;
  sample_count: number;
  created_at: Date;
  updated_at: Date | null;
}

/**
 * lathe_correction_factors DTO
 */
export interface LatheCorrectionFactorDto {
  id: number;
  machineId: number;
  machineName: string;
  materialName: string;
  processType: string;
  factor: number;
  sampleCount: number;
  createdAt: string;
  updatedAt: string | null;
}
